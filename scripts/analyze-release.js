const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function getGitFileAtRef(ref, filePath) {
  try {
    const gitPath = filePath.replace(/\\/g, '/');
    const content = execSync(`git show "${ref}:${gitPath}"`, {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'ignore'],
      maxBuffer: 10 * 1024 * 1024
    }).toString('utf8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

function getChangedDataFiles(fromRef, toRef) {
  try {
    const output = execSync(`git diff --name-only "${fromRef}" "${toRef}" -- data/`, {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'ignore']
    }).toString('utf8').trim();
    if (!output) return new Set();
    const set = new Set(output.split('\n').map(l => l.trim().replace(/\\/g, '/')).filter(Boolean));
    return set;
  } catch (e) {
    return new Set();
  }
}

function getCommitsForFileBetween(fromRef, toRef, filePath) {
  try {
    const gitPath = filePath.replace(/\\/g, '/');
    const output = execSync(`git log "${fromRef}..${toRef}" --format="%h|%H|%s|%an|%ad" --date=short -- "${gitPath}"`, {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'ignore']
    }).toString('utf8').trim();

    if (!output) return [];
    return output.split('\n').map(line => {
      const [sha, fullSha, message, author, date] = line.split('|');
      let pr = null;
      const prMatch = message.match(/#(\d+)/);
      if (prMatch) pr = prMatch[1];
      return {
        sha,
        fullSha,
        message,
        author,
        date,
        pr,
        url: `https://github.com/SogeMoge/xwing-data2-legacy/commit/${fullSha}`,
        prUrl: pr ? `https://github.com/SogeMoge/xwing-data2-legacy/pull/${pr}` : null
      };
    });
  } catch (e) {
    return [];
  }
}

function formatCostVal(cost) {
  if (typeof cost === 'number') return String(cost);
  if (!cost) return '-';
  if (typeof cost.value === 'number') return String(cost.value);
  if (cost.variable === 'size' && cost.values) {
    return `Base Size (S:${cost.values.Small}, M:${cost.values.Medium}, L:${cost.values.Large})`;
  }
  if (cost.variable === 'initiative' && cost.values) {
    return `Initiative (${Object.entries(cost.values).map(([k, v]) => `${k}:${v}`).join(', ')})`;
  }
  if (cost.variable === 'agility' && cost.values) {
    return `Agility (${Object.entries(cost.values).map(([k, v]) => `${k}:${v}`).join(', ')})`;
  }
  return JSON.stringify(cost);
}

function analyzeRelease(fromRef, toRef) {
  console.log(`Analyzing changes between ${fromRef} and ${toRef}...`);

  const changedFiles = getChangedDataFiles(fromRef, toRef);
  console.log(`Found ${changedFiles.size} changed data files.`);

  // Load manifest at toRef (or current directory if toRef is HEAD)
  let manifest = null;
  if (toRef === 'HEAD' || !toRef) {
    manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'manifest.json'), 'utf8'));
  } else {
    manifest = getGitFileAtRef(toRef, 'data/manifest.json');
  }

  if (!manifest) {
    throw new Error(`Could not load manifest at ref ${toRef}`);
  }

  const changesByCard = {};

  // 1. Analyze Pilots
  manifest.pilots.forEach(f => {
    const faction = f.faction;
    f.ships.forEach(shipFile => {
      const normShipFile = shipFile.replace(/\\/g, '/');
      if (!changedFiles.has(normShipFile)) return; // Skip files with no diff!

      const oldShip = getGitFileAtRef(fromRef, shipFile);
      let currShip = null;
      if (toRef === 'HEAD' || !toRef) {
        currShip = JSON.parse(fs.readFileSync(path.join(repoRoot, shipFile), 'utf8'));
      } else {
        currShip = getGitFileAtRef(toRef, shipFile);
      }

      if (!currShip) return;

      const fileCommits = getCommitsForFileBetween(fromRef, toRef, shipFile);
      const defaultCommit = fileCommits[0] || null;

      const oldPilotsMap = {};
      if (oldShip && oldShip.pilots) {
        oldShip.pilots.forEach(p => {
          oldPilotsMap[p.xws] = p;
        });
      }

      currShip.pilots.forEach(currP => {
        const oldP = oldPilotsMap[currP.xws];
        const cardKey = `pilot:${currP.xws}`;
        const cardChanges = [];

        if (!oldP) {
          cardChanges.push({
            type: 'added',
            field: 'card',
            oldValue: null,
            newValue: currP.name,
            summary: `New pilot added: ${currP.name} (${currShip.name})`,
            commit: defaultCommit
          });
        } else {
          // Compare points
          const oldCostStr = formatCostVal(oldP.cost);
          const newCostStr = formatCostVal(currP.cost);
          if (oldCostStr !== newCostStr) {
            let diff = null;
            if (typeof oldP.cost === 'number' && typeof currP.cost === 'number') {
              diff = currP.cost - oldP.cost;
            }
            cardChanges.push({
              type: 'cost',
              field: 'cost',
              oldValue: oldP.cost,
              newValue: currP.cost,
              oldFormatted: oldCostStr,
              newFormatted: newCostStr,
              diff,
              summary: diff !== null ? `Points ${diff > 0 ? '+' + diff : diff} (${oldCostStr} → ${newCostStr})` : `Points changed (${oldCostStr} → ${newCostStr})`,
              commit: defaultCommit
            });
          }

          // Compare Format (standard, wildspace, epic)
          ['standard', 'wildspace', 'epic'].forEach(fmt => {
            if (Boolean(oldP[fmt]) !== Boolean(currP[fmt])) {
              const gained = Boolean(currP[fmt]);
              cardChanges.push({
                type: 'format',
                field: fmt,
                oldValue: oldP[fmt],
                newValue: currP[fmt],
                summary: gained ? `Moved to ${fmt === 'standard' ? 'Standard' : fmt} format` : `Removed from ${fmt} format`,
                commit: defaultCommit
              });
            }
          });

          // Compare Keywords
          const oldKw = (oldP.keywords || []).slice().sort();
          const newKw = (currP.keywords || []).slice().sort();
          if (JSON.stringify(oldKw) !== JSON.stringify(newKw)) {
            const added = newKw.filter(k => !oldKw.includes(k));
            const removed = oldKw.filter(k => !newKw.includes(k));
            const parts = [];
            if (added.length) parts.push(`Added "${added.join(', ')}" keyword`);
            if (removed.length) parts.push(`Removed "${removed.join(', ')}" keyword`);
            cardChanges.push({
              type: 'keywords',
              field: 'keywords',
              oldValue: oldP.keywords,
              newValue: currP.keywords,
              added,
              removed,
              summary: parts.join('; '),
              commit: defaultCommit
            });
          }

          // Compare Slots
          const oldSlots = (oldP.slots || []).slice();
          const newSlots = (currP.slots || []).slice();
          if (JSON.stringify(oldSlots) !== JSON.stringify(newSlots)) {
            cardChanges.push({
              type: 'slots',
              field: 'slots',
              oldValue: oldSlots,
              newValue: newSlots,
              summary: `Upgrade slots updated: [${newSlots.join(', ')}] (was [${oldSlots.join(', ')}])`,
              commit: defaultCommit
            });
          }

          // Compare Initiative
          if (oldP.initiative !== currP.initiative) {
            cardChanges.push({
              type: 'initiative',
              field: 'initiative',
              oldValue: oldP.initiative,
              newValue: currP.initiative,
              summary: `Initiative changed from ${oldP.initiative} to ${currP.initiative}`,
              commit: defaultCommit
            });
          }

          // Compare Ability text
          if ((oldP.ability || '') !== (currP.ability || '')) {
            cardChanges.push({
              type: 'ability',
              field: 'ability',
              oldValue: oldP.ability,
              newValue: currP.ability,
              summary: `Ability wording updated (errata)`,
              commit: defaultCommit
            });
          }
        }

        if (cardChanges.length > 0) {
          changesByCard[cardKey] = {
            key: cardKey,
            xws: currP.xws,
            name: currP.name,
            kind: 'pilot',
            faction,
            type: currShip.name,
            shipXws: currShip.xws,
            image: currP.image,
            changes: cardChanges
          };
        }
      });
    });
  });

  // 2. Analyze Upgrades
  manifest.upgrades.forEach(upFile => {
    const normUpFile = upFile.replace(/\\/g, '/');
    if (!changedFiles.has(normUpFile)) return; // Skip files with no diff!

    const oldUpgrades = getGitFileAtRef(fromRef, upFile);
    let currUpgrades = null;
    if (toRef === 'HEAD' || !toRef) {
      currUpgrades = JSON.parse(fs.readFileSync(path.join(repoRoot, upFile), 'utf8'));
    } else {
      currUpgrades = getGitFileAtRef(toRef, upFile);
    }

    if (!currUpgrades) return;

    const fileCommits = getCommitsForFileBetween(fromRef, toRef, upFile);
    const defaultCommit = fileCommits[0] || null;

    const oldUpMap = {};
    if (oldUpgrades && Array.isArray(oldUpgrades)) {
      oldUpgrades.forEach(u => {
        oldUpMap[u.xws] = u;
      });
    }

    currUpgrades.forEach(currU => {
      const oldU = oldUpMap[currU.xws];
      const cardKey = `upgrade:${currU.xws}`;
      const cardChanges = [];

      if (!oldU) {
        cardChanges.push({
          type: 'added',
          field: 'card',
          oldValue: null,
          newValue: currU.name,
          summary: `New upgrade added: ${currU.name}`,
          commit: defaultCommit
        });
      } else {
        // Compare points
        const oldCostStr = formatCostVal(oldU.cost);
        const newCostStr = formatCostVal(currU.cost);
        if (oldCostStr !== newCostStr) {
          let diff = null;
          if (typeof oldU.cost === 'number' && typeof currU.cost === 'number') {
            diff = currU.cost - oldU.cost;
          }
          cardChanges.push({
            type: 'cost',
            field: 'cost',
            oldValue: oldU.cost,
            newValue: currU.cost,
            oldFormatted: oldCostStr,
            newFormatted: newCostStr,
            diff,
            summary: diff !== null ? `Points ${diff > 0 ? '+' + diff : diff} (${oldCostStr} → ${newCostStr})` : `Points changed (${oldCostStr} → ${newCostStr})`,
            commit: defaultCommit
          });
        }

        // Compare Format
        ['standard', 'wildspace', 'epic'].forEach(fmt => {
          if (Boolean(oldU[fmt]) !== Boolean(currU[fmt])) {
            const gained = Boolean(currU[fmt]);
            cardChanges.push({
              type: 'format',
              field: fmt,
              oldValue: oldU[fmt],
              newValue: currU[fmt],
              summary: gained ? `Moved to ${fmt === 'standard' ? 'Standard' : fmt} format` : `Removed from ${fmt} format`,
              commit: defaultCommit
            });
          }
        });

        // Compare Restrictions
        const oldRestStr = JSON.stringify(oldU.restrictions || []);
        const newRestStr = JSON.stringify(currU.restrictions || []);
        if (oldRestStr !== newRestStr) {
          cardChanges.push({
            type: 'restrictions',
            field: 'restrictions',
            oldValue: oldU.restrictions,
            newValue: currU.restrictions,
            summary: `Restrictions updated`,
            commit: defaultCommit
          });
        }

        // Compare Ability
        const oldSide = (oldU.sides && oldU.sides[0]) || {};
        const newSide = (currU.sides && currU.sides[0]) || {};
        if ((oldSide.ability || '') !== (newSide.ability || '')) {
          cardChanges.push({
            type: 'ability',
            field: 'ability',
            oldValue: oldSide.ability,
            newValue: newSide.ability,
            summary: `Ability wording updated (errata)`,
            commit: defaultCommit
          });
        }
      }

      if (cardChanges.length > 0) {
        const slotType = (currU.sides && currU.sides[0] && currU.sides[0].type) || path.basename(upFile, '.json');
        changesByCard[cardKey] = {
          key: cardKey,
          xws: currU.xws,
          name: currU.name,
          kind: 'upgrade',
          type: slotType,
          image: currU.sides && currU.sides[0] ? currU.sides[0].image : null,
          changes: cardChanges
        };
      }
    });
  });

  console.log(`Detected changes for ${Object.keys(changesByCard).length} cards.`);
  return changesByCard;
}

module.exports = {
  analyzeRelease,
  getCommitsForFileBetween
};

if (require.main === module) {
  const fromTag = process.argv[2] || '3.10.0';
  const toTag = process.argv[3] || '3.11.0';
  const results = analyzeRelease(fromTag, toTag);
  console.log(JSON.stringify(Object.values(results).slice(0, 3), null, 2));
}
