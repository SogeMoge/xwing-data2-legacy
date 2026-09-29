const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'data', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Load all pilots from the repo
const pilots = [];
manifest.pilots.forEach(f => {
  f.ships.forEach(s => {
    const ship = JSON.parse(fs.readFileSync(path.join(repoRoot, s), 'utf8'));
    ship.pilots.forEach(p => {
      pilots.push({
        ...p,
        shipName: ship.name,
        shipSize: ship.size,
        faction: f.faction,
        shipXws: ship.xws
      });
    });
  });
});

// Load all upgrades from the repo
const upgrades = [];
manifest.upgrades.forEach(u => {
  const upList = JSON.parse(fs.readFileSync(path.join(repoRoot, u), 'utf8'));
  upList.forEach(up => {
    upgrades.push(up);
  });
});

console.log(`Loaded ${pilots.length} pilots and ${upgrades.length} upgrades from database.`);

// Load step 93 raw spreadsheet dump
const step93Path = 'C:/Users/valte/.gemini/antigravity/brain/adb86fc0-52a7-4cfd-ab03-34931c546efe/.system_generated/steps/93/output.txt';
if (!fs.existsSync(step93Path)) {
  console.log('Baseline step 93 raw dump not found, skipping rebuild.');
  process.exit(0);
}
const sheetRaw = JSON.parse(fs.readFileSync(step93Path, 'utf8'));

function norm(s) {
  if (!s) return '';
  return s.toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[•●]/g, '')
    .replace(/[“”"']/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

const FACTION_MAP = {
  'Rebel Alliance': 'rebelalliance',
  'Galactic Empire': 'galacticempire',
  'Scum and Villiany': 'scumandvillainy',
  'Resistance': 'resistance',
  'First Order': 'firstorder',
  'Galactic Republic': 'galacticrepublic',
  'Separatist Alliance': 'separatistalliance'
};

const ALIASES = {
  'protoncannon': 'protoncannons',
  'vectoredcanonsrz1': 'vectoredcannons',
  'vectoredcanons': 'vectoredcannons',
  'kuil': 'kuiil',
  'pellimotto': 'pelimotto',
  'holokland': 'holokand',
  'depabilloba': 'depabillaba',
  'essararill': 'essaratill',
  'rhysdallow': 'rhysdallows',
  'oomuplinkprototype': '00muplinkprototype',
  'g4rg0rvm': 'g4rgorvm',
  'firstordercollaborator': 'firstordercollaborators',
  'reapersquadronpilot': 'reapersquadronscout',
  'previsla': 'previzsla',
  'landingstrutsopen': 'landingstruts'
};

// Historical record keyed by xws or unique ID
const cardHistory = {};

sheetRaw.valueRanges.forEach((vr) => {
  const tabName = vr.range.split('!')[0].replace(/'/g, '');
  const rows = vr.values;
  const isUpgrades = tabName === 'Generic upgrades';
  const factionSlug = FACTION_MAP[tabName];

  // Header row is index 2 (row 3)
  const headerRow = rows[2] || [];
  const cycleCols = [];
  for (let c = 6; c < headerRow.length; c++) {
    const cycle = (headerRow[c] || '').trim();
    if (cycle && cycle !== 'Change vs previous') {
      cycleCols.push({ colIndex: c, cycleName: cycle });
    }
  }

  for (let r = 3; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[2]) continue;
    const format = (row[0] || '').trim();
    const type = (row[1] || '').trim();
    const originalName = (row[2] || '').trim();

    let rawName = originalName;
    if (rawName.includes('/')) {
      rawName = rawName.split('/')[0].trim();
    }
    let nName = norm(rawName);
    if (ALIASES[nName]) nName = ALIASES[nName];

    const isSLInSheet = originalName.includes('SL') && !originalName.includes('LSL');
    const isLSLInSheet = originalName.includes('LSL') || (!originalName.includes('SL') && (originalName.includes('(BoY)') || originalName.includes('(BoE)') || originalName.includes('(SoC)') || originalName.includes('(PnP)')));

    let matchedCard = null;
    let cardType = isUpgrades ? 'upgrade' : 'pilot';

    if (isUpgrades) {
      matchedCard = upgrades.find(u => {
        const nu = norm(u.name);
        return nu === nName || ALIASES[nu] === nName;
      });
    } else {
      let candidates = pilots.filter(p => p.faction === factionSlug && (norm(p.name) === nName || ALIASES[norm(p.name)] === nName));
      if (type) {
        const shipFiltered = candidates.filter(p => norm(p.shipName) === norm(type));
        if (shipFiltered.length > 0) candidates = shipFiltered;
      }

      if (candidates.length === 1) {
        matchedCard = candidates[0];
      } else if (candidates.length > 1) {
        if (isSLInSheet) {
          matchedCard = candidates.find(p => p.standardLoadout && !p.xws.endsWith('-lsl')) || candidates[0];
        } else if (isLSLInSheet) {
          matchedCard = candidates.find(p => p.xws.endsWith('-lsl')) || candidates[0];
        } else {
          matchedCard = candidates[0];
        }
      } else {
        matchedCard = pilots.find(p => norm(p.name) === nName || ALIASES[norm(p.name)] === nName);
        if (!matchedCard) {
          matchedCard = upgrades.find(u => norm(u.name) === nName || ALIASES[norm(u.name)] === nName);
          if (matchedCard) cardType = 'upgrade';
        }
      }
    }

    const xws = matchedCard ? matchedCard.xws : (isUpgrades ? `upgrade:${nName}` : `pilot:${factionSlug}:${nName}`);
    const key = `${cardType}:${xws}`;

    const points = {};
    cycleCols.forEach(({ colIndex, cycleName }) => {
      const val = (row[colIndex] || '').trim();
      if (val) {
        points[cycleName] = val;
      }
    });

    cardHistory[key] = {
      key,
      xws: matchedCard ? matchedCard.xws : null,
      cardType,
      tab: tabName,
      name: matchedCard ? matchedCard.name : originalName,
      sheetName: originalName,
      type: matchedCard ? (cardType === 'pilot' ? matchedCard.shipName : type) : type,
      format,
      upgradeBar: row[3] || '',
      restrictions: row[4] || '',
      keywords: row[5] || '',
      pointsHistory: points
    };
  }
});

const outDir = path.join(repoRoot, 'data', 'retrospective');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'points_history.json');
fs.writeFileSync(outPath, JSON.stringify(cardHistory, null, 2), 'utf8');
console.log(`Saved baseline retrospective data for ${Object.keys(cardHistory).length} cards to ${outPath}`);
