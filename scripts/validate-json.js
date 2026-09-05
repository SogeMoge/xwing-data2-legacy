const fs = require("fs");
const path = require("path");

function getJsonFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }
  return results;
}

const args = process.argv.slice(2);
let files;

if (args.length > 0 && !args[0].includes("*")) {
  files = args.map(f => path.resolve(process.cwd(), f));
} else {
  const dataDir = path.resolve(__dirname, "../data");
  files = getJsonFiles(dataDir);
}

let errorCount = 0;

for (const file of files) {
  const relativePath = path.relative(path.resolve(__dirname, ".."), file);
  try {
    const content = fs.readFileSync(file, "utf8");
    JSON.parse(content);
  } catch (err) {
    console.error(`Error parsing JSON in ${relativePath}:\n  ${err.message}`);
    errorCount++;
  }
}

if (errorCount > 0) {
  console.error(`\nValidation failed: ${errorCount} file(s) with syntax errors.`);
  process.exit(1);
} else {
  console.log(`Successfully validated ${files.length} JSON file(s).`);
}

