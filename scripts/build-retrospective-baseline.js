const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const repoRoot = path.resolve(__dirname, '..');

/**
 * Retrospective Baseline Builder for X-Wing 2.0 Legacy
 *
 * NOTE: The Google Sheet is used ONLY for visual reference and MUST NOT be used
 * as a data source. All points data and card definitions MUST be derived
 * exclusively from xwing-data2-legacy repository files and git release tags.
 */

// Balance update release tags in xwing-data2-legacy
const cycleRefs = [
  { cycle: 'Sep 26', ref: 'HEAD' },     // Release 3.11.0 / 3.12.0
  { cycle: 'Mar 26', ref: '3.10.0' },   // March 2026 points update
  { cycle: 'Dec 25', ref: '3.9.0' },    // December 2025 points update
  { cycle: 'Mar 25', ref: '3.6.0' },    // March 2025 points update
  { cycle: 'Sep 24', ref: '3.5.0' },    // September 2024 points update
  { cycle: 'Mar 24', ref: '3.2.0' },    // March 2024 points update
  { cycle: 'Sep 23', ref: '3.0.0' },    // September 2023 points update
  { cycle: 'Dec 22', ref: '2.5.3' },    // Final 2.0 baseline
  { cycle: 'Sep 21', ref: '2.4.0' }     // Wave 10 / Sep 2021
];

function formatCost(cost) {
  if (cost === undefined || cost === null) return null;
  if (typeof cost === 'number' || typeof cost === 'string') return String(cost);
  if (typeof cost === 'object') {
    if (cost.value !== undefined) return String(cost.value);
    if (cost.variable) {
      if (cost.values && typeof cost.values === 'object') {
        const pairs = Object.entries(cost.values).map(([k, v]) => `${k}=${v}`).join(' / ');
        return `${cost.variable} ${pairs}`;
      }
      return String(cost.variable);
    }
  }
  return null;
}

// Temporary cache directory for tag extraction
const tmpDir = path.join(os.tmpdir(), 'xwing-legacy-tag-cache');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Extract tags from git
console.log('Extracting release points from xwing-data2-legacy git history...');
cycleRefs.forEach(({ ref }) => {
  if (ref === 'HEAD') return;
  const tagDir = path.join(tmpDir, ref);
  if (!fs.existsSync(tagDir)) {
    fs.mkdirSync(tagDir, { recursive: true });
    try {
      execSync(`git archive ${ref} data/ | tar -x -C "${tagDir}"`, {
        cwd: repoRoot,
        maxBuffer: 50 * 1024 * 1024
      });
    } catch (e) {
      console.warn(`Warning: Could not extract git archive for ${ref}: ${e.message}`);
    }
  }
});

// Build card cost map across cycles
const tagCardCosts = {}; // cycle -> { key: costStr }

cycleRefs.forEach(({ cycle, ref }) => {
  const cardMap = {};
  tagCardCosts[cycle] = cardMap;

  const baseDir = ref === 'HEAD' ? repoRoot : path.join(tmpDir, ref);
  const mPath = path.join(baseDir, 'data', 'manifest.json');
  if (!fs.existsSync(mPath)) return;

  const manifest = JSON.parse(fs.readFileSync(mPath, 'utf8'));

  if (manifest.pilots) {
    manifest.pilots.forEach(f => {
      if (f.ships) {
        f.ships.forEach(sRel => {
          const sPath = path.join(baseDir, sRel);
          if (fs.existsSync(sPath)) {
            try {
              const ship = JSON.parse(fs.readFileSync(sPath, 'utf8'));
              if (ship.pilots) {
                ship.pilots.forEach(p => {
                  const val = formatCost(p.cost);
                  if (val !== null) {
                    cardMap[`pilot:${p.xws}`] = val;
                  }
                });
              }
            } catch (e) {}
          }
        });
      }
    });
  }

  if (manifest.upgrades) {
    manifest.upgrades.forEach(uRel => {
      const uPath = path.join(baseDir, uRel);
      if (fs.existsSync(uPath)) {
        try {
          const upList = JSON.parse(fs.readFileSync(uPath, 'utf8'));
          if (Array.isArray(upList)) {
            upList.forEach(u => {
              const val = formatCost(u.cost);
              if (val !== null) {
                cardMap[`upgrade:${u.xws}`] = val;
              }
            });
          }
        } catch (e) {}
      }
    });
  }
});

// Load existing retrospective history to preserve older intermediate cycles (e.g. Mar 23)
const currentHistoryPath = path.join(repoRoot, 'data', 'retrospective', 'points_history.json');
let currentHistory = {};
if (fs.existsSync(currentHistoryPath)) {
  try {
    currentHistory = JSON.parse(fs.readFileSync(currentHistoryPath, 'utf8'));
  } catch (e) {
    currentHistory = {};
  }
}

// Load active database manifest
const activeManifestPath = path.join(repoRoot, 'data', 'manifest.json');
const activeManifest = JSON.parse(fs.readFileSync(activeManifestPath, 'utf8'));

const finalHistory = {};

// 1. Process Pilots strictly from data/pilots
activeManifest.pilots.forEach(f => {
  f.ships.forEach(sRel => {
    const ship = JSON.parse(fs.readFileSync(path.join(repoRoot, sRel), 'utf8'));
    ship.pilots.forEach(p => {
      const key = `pilot:${p.xws}`;
      const existing = currentHistory[key] || {};
      const isCorrupted = existing.restrictions && !existing.upgradeBar;

      const pts = {};
      if (!isCorrupted && existing.pointsHistory) {
        Object.assign(pts, existing.pointsHistory);
      }

      // Authoritative points from git releases
      cycleRefs.forEach(({ cycle }) => {
        if (tagCardCosts[cycle] && tagCardCosts[cycle][key] !== undefined) {
          pts[cycle] = tagCardCosts[cycle][key];
        }
      });

      // If this pilot was corrupted by an upgrade in the legacy dump, restore intermediate cycles
      if (isCorrupted) {
        const fallback = pts['Dec 22'] || pts['Sep 23'] || pts['Sep 26'];
        if (fallback && !pts['Mar 23']) {
          pts['Mar 23'] = fallback;
        }
      }

      finalHistory[key] = {
        key,
        xws: p.xws,
        cardType: 'pilot',
        tab: f.faction,
        name: p.name,
        sheetName: p.name,
        type: ship.name,
        format: p.standard ? 'Standard' : (p.wildspace ? 'Wild Space' : (p.epic ? 'Epic' : '')),
        upgradeBar: (p.slots || []).join(', '),
        restrictions: '',
        keywords: (p.keywords || []).join(', '),
        pointsHistory: pts
      };
    });
  });
});

// 2. Process Upgrades strictly from data/upgrades
activeManifest.upgrades.forEach(uRel => {
  const upList = JSON.parse(fs.readFileSync(path.join(repoRoot, uRel), 'utf8'));
  const defaultSlot = path.basename(uRel, '.json');
  upList.forEach(u => {
    const key = `upgrade:${u.xws}`;
    const side = (u.sides && u.sides[0]) || {};
    const existing = currentHistory[key] || {};

    const pts = {};
    if (existing.pointsHistory) {
      Object.assign(pts, existing.pointsHistory);
    }

    // Recover upgrade points if previously misplaced under pilot:
    const pilotMistake = currentHistory[`pilot:${u.xws}`];
    if (pilotMistake && pilotMistake.restrictions && !pilotMistake.upgradeBar && pilotMistake.pointsHistory) {
      Object.assign(pts, pilotMistake.pointsHistory);
    }

    // Authoritative points from git releases
    cycleRefs.forEach(({ cycle }) => {
      if (tagCardCosts[cycle] && tagCardCosts[cycle][key] !== undefined) {
        pts[cycle] = tagCardCosts[cycle][key];
      }
    });

    finalHistory[key] = {
      key,
      xws: u.xws,
      cardType: 'upgrade',
      tab: 'Generic upgrades',
      name: u.name,
      sheetName: u.name,
      type: side.type || defaultSlot,
      format: u.standard ? 'Standard' : (u.wildspace ? 'Wild Space' : (u.epic ? 'Epic' : '')),
      upgradeBar: '',
      restrictions: (u.restrictions || []).map(r => JSON.stringify(r)).join('; '),
      keywords: (u.keywords || []).join(', '),
      pointsHistory: pts
    };
  });
});

const outDir = path.join(repoRoot, 'data', 'retrospective');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(currentHistoryPath, JSON.stringify(finalHistory, null, 2), 'utf8');
console.log(`Saved retrospective history for ${Object.keys(finalHistory).length} cards to ${currentHistoryPath}`);
