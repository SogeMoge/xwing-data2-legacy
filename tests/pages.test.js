const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const docsDir = path.join(repoRoot, 'docs');
const dataJsonPath = path.join(docsDir, 'data.json');

describe('GitHub Pages & Data Generator Validation', () => {
  test('Docs directory contains required static files', () => {
    const requiredFiles = [
      'index.html',
      'style.css',
      'app.js',
      'data.json',
      'data.js',
      'colors.json',
      'fonts/xwing-miniatures.ttf',
      'fonts/xwing-miniatures-ships.ttf',
      'fonts/icons-map.json',
      'fonts/ships-map.json'
    ];

    for (const file of requiredFiles) {
      const fullPath = path.join(docsDir, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  test('Font assets are valid and non-empty', () => {
    const shipFont = path.join(docsDir, 'fonts', 'xwing-miniatures-ships.ttf');
    const iconFont = path.join(docsDir, 'fonts', 'xwing-miniatures.ttf');
    expect(fs.statSync(shipFont).size).toBeGreaterThan(50000);
    expect(fs.statSync(iconFont).size).toBeGreaterThan(50000);
  });

  test('data.json contains valid structure and non-empty collections', () => {
    expect(fs.existsSync(dataJsonPath)).toBe(true);
    const raw = fs.readFileSync(dataJsonPath, 'utf8');
    const data = JSON.parse(raw);

    // Meta check
    expect(data.meta).toBeDefined();
    expect(data.meta.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(data.meta.generatedAt).toBeDefined();
    expect(data.meta.repoUrl).toBe('https://github.com/SogeMoge/xwing-data2-legacy');

    // Pilots check
    expect(Array.isArray(data.pilots)).toBe(true);
    expect(data.pilots.length).toBeGreaterThan(600);
    const pilotSample = data.pilots[0];
    expect(pilotSample.name).toBeDefined();
    expect(pilotSample.xws).toBeDefined();
    expect(pilotSample.faction).toBeDefined();
    expect(pilotSample.shipXws).toBeDefined();
    expect(pilotSample.cost).toBeDefined();
    expect(pilotSample.history).toBeDefined();

    // Upgrades check
    expect(Array.isArray(data.upgrades)).toBe(true);
    expect(data.upgrades.length).toBeGreaterThan(400);
    const upgradeSample = data.upgrades[0];
    expect(upgradeSample.name).toBeDefined();
    expect(upgradeSample.xws).toBeDefined();
    expect(upgradeSample.type).toBeDefined();
    expect(upgradeSample.history).toBeDefined();

    // Ships map check
    expect(typeof data.ships).toBe('object');
    const shipCount = Object.keys(data.ships).length;
    expect(shipCount).toBeGreaterThan(50);
    for (const [shipXws, shipObj] of Object.entries(data.ships)) {
      expect(shipObj.name).toBeDefined();
      expect(shipObj.xws).toBe(shipXws);
      expect(shipObj.fontGlyph).toBeDefined();
    }

    // Retrospective history columns
    expect(Array.isArray(data.historyCycles)).toBe(true);
    expect(data.historyCycles.length).toBeGreaterThanOrEqual(16);

    // Summary changes
    expect(Array.isArray(data.summaryChanges)).toBe(true);
    for (const change of data.summaryChanges) {
      expect(change.xws).toBeDefined();
      expect(change.name).toBeDefined();
      expect(change.type).toBeDefined();
      expect(Array.isArray(change.changes)).toBe(true);
      for (const c of change.changes) {
        expect(c.type).toBeDefined();
        expect(c.summary).toBeDefined();
        if (c.commit && c.commit.sha) {
          expect(c.commit.url).toContain('https://github.com/SogeMoge/xwing-data2-legacy/commit/');
        }
      }
    }
  });

  test('Ship font glyphs coverage is complete or mapped', () => {
    const raw = fs.readFileSync(dataJsonPath, 'utf8');
    const data = JSON.parse(raw);
    const missingGlyphs = [];
    for (const [xws, ship] of Object.entries(data.ships)) {
      if (!ship.fontGlyph) {
        missingGlyphs.push(xws);
      }
    }
    expect(missingGlyphs).toEqual([]);
  });

  test('All retrospective points cycles are chronological and unique', () => {
    const raw = fs.readFileSync(dataJsonPath, 'utf8');
    const data = JSON.parse(raw);
    const cols = data.historyCycles;
    const uniqueCols = new Set(cols);
    expect(uniqueCols.size).toBe(cols.length);
    expect(cols[cols.length - 1]).toBe('Sep 21');
  });

  test('Canonical X-Wing colors and component mapping are valid and complete', () => {
    const colorsDataPath = path.join(repoRoot, 'data', 'colors.json');
    const colorsDocsPath = path.join(docsDir, 'colors.json');
    expect(fs.existsSync(colorsDataPath)).toBe(true);
    expect(fs.existsSync(colorsDocsPath)).toBe(true);

    const colors = JSON.parse(fs.readFileSync(colorsDataPath, 'utf8'));
    expect(colors.source).toBe('https://xhud.sirjorj.com/xwing.cgi/colors2');
    expect(colors.attributes.initiative).toBe('#e77e29');
    expect(colors.attributes.cost).toBe('#41bef0');
    expect(colors.attributes.attack).toBe('#ed3638');
    expect(colors.attributes.agility).toBe('#6abe46');
    expect(colors.attributes.hull).toBe('#f0e531');
    expect(colors.attributes.shield).toBe('#82d1e1');
    expect(colors.attributes.charge).toBe('#fdbf10');
    expect(colors.attributes.force).toBe('#c4a0ca');
    expect(colors.attributes.energy).toBe('#e71583');

    expect(colors.actions.white).toBe('#ffffff');
    expect(colors.actions.red).toBe('#ec1f21');
    expect(colors.actions.purple).toBe('#c4a0ca');

    expect(colors.arcs.attack).toBe('#ed3638');
    expect(colors.componentMapping).toBeDefined();
    expect(colors.componentMapping.actionWhite).toBe('#ffffff');
    expect(colors.componentMapping.actionRed).toBe('#ec1f21');
    expect(colors.componentMapping.actionPurple).toBe('#c4a0ca');
    expect(colors.componentMapping.attackArc).toBe('#ed3638');

    // Also check embedded colors in data.json
    const raw = fs.readFileSync(dataJsonPath, 'utf8');
    const data = JSON.parse(raw);
    expect(data.colors).toBeDefined();
    expect(data.colors.attributes.attack).toBe('#ed3638');
  });

  test('Game text elements, slots, and template maneuvers are properly mapped to font glyphs', () => {
    const appJsContent = fs.readFileSync(path.join(docsDir, 'app.js'), 'utf8');
    expect(appJsContent).toContain("'configuration':");
    expect(appJsContent).toContain("'turn left':");
    expect(appJsContent).toContain("'turn right':");
    expect(appJsContent).toContain("'torpedo':");
    expect(appJsContent).toContain("'astromech':");
    expect(appJsContent).toContain('maneuver-template-chip');
  });
});
