const fs = require("fs");
const path = require("path");
const { getSheets, defaultSpreadsheetId } = require("./sheets_client");

function norm(s) {
  if (!s) return "";
  return s
    .toString()
    .replace(/[•●]/g, "")
    .replace(/[“”"']/g, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

async function verifyPointsSheet(options = {}) {
  const spreadsheetId = options.spreadsheetId || defaultSpreadsheetId;
  const manifestPath = options.manifestPath;
  const cycleName = options.cycleName || "Mar 26";
  const prevCycleName = options.prevCycleName || "Dec 25";

  console.log(
    `=== Verifying Retrospective Points Document (${spreadsheetId}) ===`
  );
  const sheets = await getSheets();

  const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
  const meta = metaRes.data;
  console.log(`Document Title: "${meta.properties.title}"`);

  const sheetsByTitle = {};
  meta.sheets.forEach(s => {
    sheetsByTitle[s.properties.title] = s.properties;
  });

  const errors = [];
  const warnings = [];

  // 1. Verify Title
  const cycleShort = cycleName.replace(/\s+/g, "");
  const monthMap = {
    Jan: "January",
    Feb: "February",
    Mar: "March",
    Apr: "April",
    May: "May",
    Jun: "June",
    Jul: "July",
    Aug: "August",
    Sep: "September",
    Oct: "October",
    Nov: "November",
    Dec: "December"
  };
  const cycleLong = cycleName.replace(
    /^([A-Za-z]+)\s*(\d+)/,
    (m, mon, yr) => (monthMap[mon] || mon) + " " + yr
  );

  if (
    !meta.properties.title.includes(cycleShort) &&
    !meta.properties.title.includes(cycleLong)
  ) {
    warnings.push(
      `Document title does not explicitly contain cycle "${cycleName}" or "${cycleLong}": "${meta.properties.title}"`
    );
  }

  // 2. Verify Tab Visibility
  const currentChangesTitle = `${cycleName.replace(" ", "")} changes`;
  const prevChangesTitle = `${prevCycleName.replace(" ", "")} changes`;

  if (!sheetsByTitle["Calculate Summary"]) {
    errors.push('Missing "Calculate Summary" tab!');
  } else if (!sheetsByTitle["Calculate Summary"].hidden) {
    warnings.push(
      '"Calculate Summary" is currently visible. It should typically be hidden as a technical tab.'
    );
  }

  if (!sheetsByTitle[currentChangesTitle]) {
    errors.push(`Missing current changes tab "${currentChangesTitle}"!`);
  } else if (sheetsByTitle[currentChangesTitle].hidden) {
    errors.push(
      `Current changes tab "${currentChangesTitle}" is hidden, but should be visible to users!`
    );
  }

  if (
    sheetsByTitle[prevChangesTitle] &&
    !sheetsByTitle[prevChangesTitle].hidden
  ) {
    warnings.push(
      `Previous changes tab "${prevChangesTitle}" is visible. It should typically be hidden.`
    );
  }

  // 3. Verify Points Tabs Column Headers
  const factionTabs = [
    "Generic upgrades",
    "Rebel Alliance",
    "Galactic Empire",
    "Scum and Villiany",
    "Resistance",
    "First Order",
    "Galactic Republic",
    "Separatist Alliance"
  ];

  for (const tab of factionTabs) {
    if (!sheetsByTitle[tab]) {
      errors.push(`Missing faction tab "${tab}"!`);
      continue;
    }

    const headersRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tab}'!G2:I3`
    });
    const headers = headersRes.data.values || [];
    const row2 = headers[0] || [];
    const row3 = headers[1] || [];

    const colGHeader = row3[0] || "";
    const colIHeader = row3[2] || "";

    if (colGHeader !== cycleName) {
      errors.push(
        `Tab "${tab}" Column G header is "${colGHeader}", expected "${cycleName}"`
      );
    }
    if (colIHeader !== prevCycleName) {
      errors.push(
        `Tab "${tab}" Column I header is "${colIHeader}", expected "${prevCycleName}"`
      );
    }
  }

  // 4. Verify Manifest match against Calculate Summary if manifest provided
  if (manifestPath && fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    console.log(
      `Checking agreement with manifest (${manifest.length} cards)...`
    );

    const summaryRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Calculate Summary'!A1:E250"
    });
    const summaryRows = (summaryRes.data.values || []).slice(1);

    const missingFromSummary = [];
    for (const m of manifest) {
      const normName = norm(m.canonicalName);
      const found = summaryRows.find(r => norm(r[1]) === normName);
      if (!found) {
        missingFromSummary.push(m.canonicalName);
      }
    }

    if (missingFromSummary.length > 0) {
      errors.push(
        `Manifest cards missing from Calculate Summary: ${missingFromSummary.join(
          ", "
        )}`
      );
    } else {
      console.log(
        `  All ${manifest.length} manifest cards are present in Calculate Summary!`
      );
    }
  }

  console.log("\n=== Verification Summary ===");
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  if (errors.length > 0) {
    console.error("Errors found:");
    errors.forEach(e => console.error(`  - ❌ ${e}`));
  }
  if (warnings.length > 0) {
    console.warn("Warnings:");
    warnings.forEach(w => console.warn(`  - ⚠️  ${w}`));
  }

  if (errors.length === 0) {
    console.log("✅ Spreadsheet validation PASSED!");
  }

  return { success: errors.length === 0, errors, warnings };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const manifestPath =
    args[0] ||
    path.join(
      __dirname,
      "../../update-xwing-data2-legacy/scripts/march_2026_points_manifest.json"
    );
  verifyPointsSheet({
    manifestPath: fs.existsSync(manifestPath) ? manifestPath : null,
    cycleName: "Mar 26",
    prevCycleName: "Dec 25"
  }).catch(console.error);
}

module.exports = { verifyPointsSheet };
