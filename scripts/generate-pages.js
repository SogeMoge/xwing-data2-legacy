const fs = require('fs');
const path = require('path');
const { buildData } = require('./generate-data');

const repoRoot = path.resolve(__dirname, '..');
const docsDir = path.join(repoRoot, 'docs');
const fontsSrcDir = path.join(repoRoot, 'data', 'fonts');
const fontsDestDir = path.join(docsDir, 'fonts');

function copyFonts() {
  if (!fs.existsSync(fontsDestDir)) {
    fs.mkdirSync(fontsDestDir, { recursive: true });
  }

  if (fs.existsSync(fontsSrcDir)) {
    const files = fs.readdirSync(fontsSrcDir);
    files.forEach(f => {
      const src = path.join(fontsSrcDir, f);
      const dest = path.join(fontsDestDir, f);
      fs.copyFileSync(src, dest);
    });
    console.log(`Copied ${files.length} font asset(s) to docs/fonts/`);
  }
}

async function main() {
  console.log('=== Generating X-Wing 2.0 Legacy GitHub Pages Website ===');
  const startTime = Date.now();

  // 1. Copy font assets
  copyFonts();

  // 2. Build data.json
  const dataset = buildData();

  // 3. Validate output files
  const requiredFiles = ['index.html', 'style.css', 'app.js', 'data.json', 'data.js'];
  for (const f of requiredFiles) {
    const p = path.join(docsDir, f);
    if (!fs.existsSync(p)) {
      throw new Error(`Required file ${f} is missing from docs directory!`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ GitHub Pages site generated successfully in ${duration}s!`);
  console.log(`- Version: ${dataset.meta.version}`);
  console.log(`- Output Directory: ${docsDir}`);
  console.log(`- Total Pilots: ${dataset.pilots.length}`);
  console.log(`- Total Upgrades: ${dataset.upgrades.length}`);
  console.log(`- Total Ships: ${Object.keys(dataset.ships).length}`);
  console.log(`- Changed Cards in Release: ${dataset.summaryChanges.length}`);
  console.log(`\nTo test locally, open docs/index.html in your browser or run: npx serve docs`);
}

main().catch(err => {
  console.error('Error generating GitHub Pages:', err);
  process.exit(1);
});
