const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { analyzeRelease } = require('./analyze-release');

const repoRoot = path.resolve(__dirname, '..');
const docsDir = path.join(repoRoot, 'docs');

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

function getLatestTwoTags() {
  try {
    const tags = execSync('git tag -l --sort=creatordate', { cwd: repoRoot })
      .toString('utf8')
      .trim()
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);

    if (tags.length === 0) return { currTag: 'HEAD', prevTag: 'HEAD' };
    if (tags.length === 1) return { currTag: tags[0], prevTag: tags[0] };
    return {
      currTag: tags[tags.length - 1],
      prevTag: tags[tags.length - 2],
      allTags: tags
    };
  } catch (e) {
    return { currTag: 'HEAD', prevTag: 'HEAD', allTags: [] };
  }
}

function getCurrentCommitInfo() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: repoRoot }).toString('utf8').trim();
    const fullSha = execSync('git rev-parse HEAD', { cwd: repoRoot }).toString('utf8').trim();
    const date = execSync('git log -1 --format=%cd --date=short', { cwd: repoRoot }).toString('utf8').trim();
    return { sha, fullSha, date };
  } catch (e) {
    return { sha: 'unknown', fullSha: '', date: new Date().toISOString().slice(0, 10) };
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

const SHIP_FONT_ALIASES = {
  'cr90corelliancorvette': 'cr90corvette',
  'yt2400lightfreighter2023': 'yt2400lightfreighter',
  'tieininterceptor': 'tieinterceptor'
};

const SLOT_TO_ICON_KEY = {
  'astromech': 'astromech',
  'cannon': 'cannon',
  'cargo': 'cargo',
  'command': 'command',
  'configuration': 'config',
  'crew': 'crew',
  'device': 'device',
  'force power': 'forcepower',
  'force-power': 'forcepower',
  'forcepower': 'forcepower',
  'gunner': 'gunner',
  'hardpoint': 'hardpoint',
  'hyperdrive': 'cargo',
  'illicit': 'illicit',
  'missile': 'missile',
  'modification': 'modification',
  'payload': 'device',
  'sensor': 'sensor',
  'tactical relay': 'tacticalrelay',
  'tactical-relay': 'tacticalrelay',
  'tacticalrelay': 'tacticalrelay',
  'talent': 'talent',
  'team': 'team',
  'tech': 'tech',
  'title': 'title',
  'torpedo': 'torpedo',
  'turret': 'turret'
};

function buildData() {
  console.log('Building dataset for GitHub Pages...');

  const manifestPath = path.join(repoRoot, 'data', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  const { currTag, prevTag } = getLatestTwoTags();
  const commitInfo = getCurrentCommitInfo();

  console.log(`Current version: ${pkg.version}, Latest tag: ${currTag}, Previous tag: ${prevTag}`);

  // Load font mappings
  const shipsMapPath = path.join(repoRoot, 'data', 'fonts', 'ships-map.json');
  const iconsMapPath = path.join(repoRoot, 'data', 'fonts', 'icons-map.json');
  let shipsMap = {};
  let iconsMap = {};
  if (fs.existsSync(shipsMapPath)) {
    shipsMap = JSON.parse(fs.readFileSync(shipsMapPath, 'utf8')).ships || {};
  }
  if (fs.existsSync(iconsMapPath)) {
    iconsMap = JSON.parse(fs.readFileSync(iconsMapPath, 'utf8')).icons || {};
  }

  // Analyze changes between previous release and current release
  const recentChanges = analyzeRelease(prevTag, currTag);

  let pointsCycleTag = currTag;
  let pointsCyclePrevTag = prevTag;
  if (currTag === '3.12.0') {
    pointsCycleTag = '3.11.0';
    pointsCyclePrevTag = '3.10.0';
  }
  const pointsCycleChanges = pointsCycleTag === currTag ? recentChanges : analyzeRelease(pointsCyclePrevTag, pointsCycleTag);

  // Load Retrospective points history baseline
  const historyPath = path.join(repoRoot, 'data', 'retrospective', 'points_history.json');
  let pointsHistory = {};
  if (fs.existsSync(historyPath)) {
    pointsHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  }

  // Load Ships
  const ships = {};
  const pilots = [];

  manifest.pilots.forEach(f => {
    const faction = f.faction;
    f.ships.forEach(shipFile => {
      const shipData = JSON.parse(fs.readFileSync(path.join(repoRoot, shipFile), 'utf8'));
      const fontKey = SHIP_FONT_ALIASES[shipData.xws] || shipData.xws.replace(/[^a-z0-9]/g, '');
      const shipGlyph = shipsMap[fontKey] || shipsMap[shipData.xws] || '';

      if (!ships[shipData.xws]) {
        ships[shipData.xws] = {
          name: shipData.name,
          xws: shipData.xws,
          size: shipData.size,
          dial: shipData.dial || [],
          stats: shipData.stats || [],
          actions: shipData.actions || [],
          icon: shipData.icon || '',
          fontGlyph: shipGlyph,
          faction
        };
      }

      shipData.pilots.forEach(p => {
        const key = `pilot:${p.xws}`;
        const hist = pointsHistory[key] || {};
        const cardChanges = recentChanges[key] || pointsCycleChanges[key] || null;

        const currentPointsStr = formatCostVal(p.cost);

        let prevPointsStr = '';
        let diff = null;
        if (hist.pointsHistory) {
          prevPointsStr = hist.pointsHistory['Mar 26'] || hist.pointsHistory['Dec 25'] || '';
        }

        if (cardChanges) {
          const costChange = cardChanges.changes.find(c => c.type === 'cost');
          if (costChange) {
            prevPointsStr = costChange.oldFormatted;
            diff = costChange.diff;
          }
        }

        pilots.push({
          key,
          xws: p.xws,
          name: p.name,
          caption: p.caption || '',
          initiative: p.initiative,
          limited: p.limited,
          cost: p.cost,
          pointsFormatted: currentPointsStr,
          prevPoints: prevPointsStr,
          diff,
          slots: p.slots || [],
          standardLoadout: p.standardLoadout || null,
          standard: Boolean(p.standard),
          wildspace: Boolean(p.wildspace),
          epic: Boolean(p.epic),
          keywords: p.keywords || [],
          ability: p.ability || p.text || '',
          shipAbility: p.shipAbility || null,
          image: p.image || '',
          artwork: p.artwork || '',
          shipName: shipData.name,
          shipXws: shipData.xws,
          shipSize: shipData.size,
          shipIcon: shipData.icon || '',
          shipFontGlyph: shipGlyph,
          faction,
          history: hist.pointsHistory || {},
          recentChanges: cardChanges ? cardChanges.changes : []
        });
      });
    });
  });

  // Load Upgrades
  const upgrades = [];
  manifest.upgrades.forEach(upFile => {
    const upList = JSON.parse(fs.readFileSync(path.join(repoRoot, upFile), 'utf8'));
    const defaultType = path.basename(upFile, '.json');

    upList.forEach(u => {
      const key = `upgrade:${u.xws}`;
      const hist = pointsHistory[key] || {};
      const cardChanges = recentChanges[key] || pointsCycleChanges[key] || null;

      const currentPointsStr = formatCostVal(u.cost);

      let prevPointsStr = '';
      let diff = null;
      if (hist.pointsHistory) {
        prevPointsStr = hist.pointsHistory['Mar 26'] || hist.pointsHistory['Dec 25'] || '';
      }

      if (cardChanges) {
        const costChange = cardChanges.changes.find(c => c.type === 'cost');
        if (costChange) {
          prevPointsStr = costChange.oldFormatted;
          diff = costChange.diff;
        }
      }

      const side = (u.sides && u.sides[0]) || {};
      const slotType = side.type || defaultType;
      const normalizedSlotType = slotType.toLowerCase().replace(/[^a-z]/g, '');
      const iconKey = SLOT_TO_ICON_KEY[normalizedSlotType] || normalizedSlotType;
      const slotGlyph = iconsMap[iconKey] || '';

      upgrades.push({
        key,
        xws: u.xws,
        name: u.name,
        limited: u.limited,
        cost: u.cost,
        pointsFormatted: currentPointsStr,
        prevPoints: prevPointsStr,
        diff,
        type: slotType,
        slotFontGlyph: slotGlyph,
        slots: side.slots || [slotType],
        restrictions: u.restrictions || [],
        keywords: u.keywords || [],
        standard: Boolean(u.standard),
        wildspace: Boolean(u.wildspace),
        epic: Boolean(u.epic),
        standardLoadoutOnly: Boolean(u.standardLoadoutOnly),
        ability: side.ability || side.text || '',
        image: side.image || '',
        artwork: side.artwork || '',
        history: hist.pointsHistory || {},
        recentChanges: cardChanges ? cardChanges.changes : []
      });
    });
  });

  const standardCycleOrder = [
    'Sep 26',
    'Mar 26',
    'Dec 25',
    'Mar 25',
    'Sep 24',
    'Mar 24',
    'Sept 23',
    'Sep 23',
    'Mar 23',
    'Dec 22',
    'Oct 22',
    'Sept 22',
    'Sep 22',
    'May 22',
    'Apr 22',
    'Sep 21'
  ];

  // Collect changed cards
  const allChangedCards = [];
  const mergedChangesMap = { ...pointsCycleChanges, ...recentChanges };

  Object.values(mergedChangesMap).forEach(item => {
    let cardDetail = pilots.find(p => p.key === item.key) || upgrades.find(u => u.key === item.key);
    if (!cardDetail) {
      cardDetail = {
        name: item.name,
        type: item.type,
        kind: item.kind,
        faction: item.faction || '',
        pointsFormatted: '-',
        prevPoints: '-',
        diff: null,
        format: 'Standard',
        shipFontGlyph: '',
        slotFontGlyph: ''
      };
    }

    allChangedCards.push({
      key: item.key,
      name: item.name,
      xws: item.xws,
      kind: item.kind,
      type: item.type,
      shipFontGlyph: cardDetail.shipFontGlyph || '',
      slotFontGlyph: cardDetail.slotFontGlyph || '',
      faction: item.faction || (cardDetail ? cardDetail.faction : ''),
      image: item.image || (cardDetail ? cardDetail.image : ''),
      pointsFormatted: cardDetail.pointsFormatted,
      prevPoints: cardDetail.prevPoints,
      diff: cardDetail.diff,
      changes: item.changes
    });
  });

  const dataset = {
    meta: {
      title: `X-Wing 2.0 Legacy Points Reference`,
      version: pkg.version,
      generatedAt: new Date().toISOString(),
      commit: commitInfo,
      repoUrl: 'https://github.com/SogeMoge/xwing-data2-legacy',
      latestTag: currTag,
      previousTag: prevTag,
      pointsCycleTag
    },
    factions: [
      { id: 'all', name: 'All Factions', color: '#888888' },
      { id: 'rebelalliance', name: 'Rebel Alliance', color: '#d9534f', fontGlyph: iconsMap['rebel'] || '!' },
      { id: 'galacticempire', name: 'Galactic Empire', color: '#999999', fontGlyph: iconsMap['empire'] || '@' },
      { id: 'scumandvillainy', name: 'Scum & Villainy', color: '#5cb85c', fontGlyph: iconsMap['scum'] || '#' },
      { id: 'resistance', name: 'Resistance', color: '#f0ad4e', fontGlyph: iconsMap['rebel'] || '!' },
      { id: 'firstorder', name: 'First Order', color: '#d9534f', fontGlyph: iconsMap['firstorder'] || '+' },
      { id: 'galacticrepublic', name: 'Galactic Republic', color: '#8a6d3b', fontGlyph: iconsMap['republic'] || '/' },
      { id: 'separatistalliance', name: 'Separatist Alliance', color: '#337ab7', fontGlyph: iconsMap['separatists'] || '.' },
      { id: 'upgrades', name: 'Generic Upgrades', color: '#f39c12', fontGlyph: iconsMap['modification'] || 'm' }
    ],
    fonts: {
      icons: iconsMap,
      ships: shipsMap
    },
    historyCycles: standardCycleOrder,
    summaryChanges: allChangedCards,
    pilots,
    upgrades,
    ships
  };

  const dataJsonPath = path.join(docsDir, 'data.json');
  fs.writeFileSync(dataJsonPath, JSON.stringify(dataset, null, 2), 'utf8');
  console.log(`Generated ${dataJsonPath} (${(fs.statSync(dataJsonPath).size / 1024).toFixed(1)} KB)`);

  const dataJsPath = path.join(docsDir, 'data.js');
  fs.writeFileSync(dataJsPath, `window.XWING_DATA = ${JSON.stringify(dataset)};\n`, 'utf8');
  console.log(`Generated ${dataJsPath} (${(fs.statSync(dataJsPath).size / 1024).toFixed(1)} KB)`);

  return dataset;
}

module.exports = {
  buildData
};

if (require.main === module) {
  buildData();
}
