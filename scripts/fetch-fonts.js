const https = require('https');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const fontsDir = path.join(repoRoot, 'docs', 'fonts');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status code ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  const files = [
    {
      url: 'https://raw.githubusercontent.com/SogeMoge/xwing-miniatures-font/master/src/fonts/xwing-miniatures-ships.ttf',
      dest: path.join(fontsDir, 'xwing-miniatures-ships.ttf')
    },
    {
      url: 'https://raw.githubusercontent.com/SogeMoge/xwing-miniatures-font/master/src/fonts/xwing-miniatures.ttf',
      dest: path.join(fontsDir, 'xwing-miniatures.ttf')
    },
    {
      url: 'https://raw.githubusercontent.com/SogeMoge/xwing-miniatures-font/master/src/json/icons-map.json',
      dest: path.join(fontsDir, 'icons-map.json')
    },
    {
      url: 'https://raw.githubusercontent.com/SogeMoge/xwing-miniatures-font/master/src/json/ships-map.json',
      dest: path.join(fontsDir, 'ships-map.json')
    },
    {
      url: 'https://raw.githubusercontent.com/SogeMoge/xwing-miniatures-font/master/dist/xwing-miniatures.css',
      dest: path.join(fontsDir, 'xwing-miniatures.css')
    }
  ];

  for (const item of files) {
    console.log(`Downloading ${item.url} -> ${item.dest}...`);
    await download(item.url, item.dest);
    console.log(`Saved ${path.basename(item.dest)} (${fs.statSync(item.dest).size} bytes)`);
  }

  console.log('All font assets downloaded successfully!');
}

run().catch(console.error);
