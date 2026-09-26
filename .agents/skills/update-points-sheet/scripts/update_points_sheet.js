const fs = require("fs");
const path = require("path");
const { getSheets, defaultSpreadsheetId } = require("./sheets_client");
const { verifyPointsSheet } = require("./verify_points_sheet");

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

function formatNewCost(item) {
  const c = item.newCost;
  if (typeof c === "number") return String(c);
  if (c && typeof c.value === "number") return String(c.value);
  if (item.xws === "engineupgrade") {
    return "Base Size\nSmall=2 /\nMed=4 /\nLarge=7";
  }
  if (item.xws === "plasmatorpedoes") {
    return "Initiative\n0=5 / 1=5 /\n2=5 / 3=7 /\n4=7 / 5=7 / 6=7";
  }
  if (item.xws === "ensnare") {
    return "Initiative:\n0=12 / 1=12 /\n2=12 / 3=15 /\n4=15 / 5=15 / \n6=15";
  }
  if (c && c.variable === "size" && c.values) {
    return `Base Size\nSmall=${c.values.Small} /\nMed=${c.values.Medium} /\nLarge=${c.values.Large}`;
  }
  if (c && c.variable === "initiative" && c.values) {
    const keys = Object.keys(c.values).sort();
    return "Initiative\n" + keys.map(k => `${k}=${c.values[k]}`).join(" / ");
  }
  throw new Error("Unknown cost format for " + item.xws);
}

const FACTION_TABS = [
  "Generic upgrades",
  "Rebel Alliance",
  "Galactic Empire",
  "Scum and Villiany",
  "Resistance",
  "First Order",
  "Galactic Republic",
  "Separatist Alliance"
];

async function updatePointsSheet(options = {}) {
  const spreadsheetId = options.spreadsheetId || defaultSpreadsheetId;
  const manifestPath = options.manifestPath;
  const newCycle = options.newCycle || "Mar 26";
  const prevCycle = options.prevCycle || "Dec 25";

  if (!manifestPath || !fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found at: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  console.log(`Loaded ${manifest.length} card updates from manifest.`);

  const sheets = await getSheets();
  const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
  const meta = metaRes.data;

  const sheetsByTitle = {};
  meta.sheets.forEach(s => {
    sheetsByTitle[s.properties.title] = s.properties;
  });

  // Step 1: Update Document Title
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
  const newCycleLong = newCycle.replace(
    /^([A-Za-z]+)\s*(\d+)/,
    (m, mon, yr) => (monthMap[mon] || mon) + " " + yr
  );
  const newTitle = `X-Wing 2.0 Legacy Points document (${newCycleLong})`;
  console.log(`Setting document title to: "${newTitle}"...`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSpreadsheetProperties: {
            properties: { title: newTitle },
            fields: "title"
          }
        }
      ]
    }
  });

  // Step 2: Freeze Previous Changes Tab (if dynamic)
  const prevChangesTabName = `${prevCycle.replace(" ", "")} changes`;
  if (sheetsByTitle[prevChangesTabName]) {
    console.log(`Ensuring ${prevChangesTabName} is frozen as static values...`);
    const prevRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${prevChangesTabName}'!A1:E200`
    });
    const prevVals = prevRes.data.values || [];
    if (prevVals.length > 0) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${prevChangesTabName}'!A1:E200`
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${prevChangesTabName}'!A1:E${prevVals.length}`,
        valueInputOption: "RAW",
        requestBody: { values: prevVals }
      });
    }
  }

  // Step 3: Shift Historical Columns & Archive Previous Cycle for each faction tab
  for (const tabName of FACTION_TABS) {
    const sheetProps = sheetsByTitle[tabName];
    if (!sheetProps) continue;

    console.log(`\nShifting columns in [${tabName}]...`);
    const rowCount = sheetProps.gridProperties.rowCount;

    // Read current Col G values
    const colGRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tabName}'!G1:G${rowCount}`
    });
    const colGValues = colGRes.data.values || [];

    // Check if column G was already renamed to newCycle
    const currentG3 = colGValues[2] && colGValues[2][0] ? colGValues[2][0] : "";
    if (currentG3 === newCycle) {
      console.log(
        `  Tab ${tabName} already has Column G header "${newCycle}". Skipping column insert.`
      );
    } else {
      // Insert new column at index 8 (Column I)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: sheetProps.sheetId,
                  dimension: "COLUMNS",
                  startIndex: 8,
                  endIndex: 9
                },
                inheritFromBefore: false
              }
            }
          ]
        }
      });

      // Write Column I (archive previous cycle)
      const colI = [];
      for (let r = 0; r < rowCount; r++) {
        if (r === 0) colI.push([""]);
        else if (r === 1) colI.push(["X2PO"]);
        else if (r === 2) colI.push([prevCycle]);
        else {
          const val =
            colGValues[r] && colGValues[r][0] !== undefined
              ? colGValues[r][0]
              : "";
          colI.push([val]);
        }
      }
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tabName}'!I1:I${rowCount}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: colI }
      });

      // Update G3 header to new cycle
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tabName}'!G3`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[newCycle]] }
      });

      // Update Column H formulas
      const colH = [];
      for (let r = 4; r <= rowCount; r++) {
        colH.push([
          `=IF(ISNUMBER(INDEX(I${r}:${r}; MATCH(FALSE; ISBLANK(I${r}:${r}); 0))); G${r}-INDEX(I${r}:${r}; MATCH(FALSE; ISBLANK(I${r}:${r}); 0)); "")`
        ]);
      }
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tabName}'!H4:H${rowCount}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: colH }
      });
    }
  }

  // Step 4: Batch Update Column G with New Points
  console.log(
    "\nMatching manifest cards and applying updated points to Column G..."
  );
  const batchData = [];
  for (const tabName of FACTION_TABS) {
    const sheetProps = sheetsByTitle[tabName];
    const rowCount = sheetProps.gridProperties.rowCount;
    const tabDataRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tabName}'!A1:C${rowCount}`
    });
    const rows = tabDataRes.data.values || [];

    for (const m of manifest) {
      const normTarget = norm(m.canonicalName);
      let matchedRowIdx = -1;

      // Special alias/LSL checks
      for (let i = 3; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[2]) continue;
        if (norm(r[2]) === normTarget) {
          const isPilot = !r[1].includes("(");
          if (m.kind === "pilot" && isPilot) {
            // Check LSL / SoC / BoY matching
            if (
              m.xws.includes("-lsl") &&
              !r[2].includes("LSL") &&
              !r[2].includes("SoC") &&
              !r[2].includes("BoY") &&
              !r[2].includes("PnP")
            ) {
              continue;
            }
            if (
              !m.xws.includes("-lsl") &&
              (r[2].includes("LSL") ||
                r[2].includes("SoC") ||
                r[2].includes("PnP"))
            ) {
              continue;
            }
            matchedRowIdx = i + 1;
            break;
          } else if (m.kind === "upgrade" && !isPilot) {
            matchedRowIdx = i + 1;
            break;
          }
        }
      }

      if (matchedRowIdx > 0) {
        batchData.push({
          range: `'${tabName}'!G${matchedRowIdx}`,
          values: [[formatNewCost(m)]]
        });
      }
    }
  }

  console.log(`Writing ${batchData.length} point updates to Column G...`);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: batchData
    }
  });

  // Step 5: Read Calculate Summary & Publish New Changes Tab
  console.log("\nReading evaluated rows from Calculate Summary...");
  const calcRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Calculate Summary'!A1:E250"
  });
  const summaryRows = calcRes.data.values || [];
  console.log(`Calculate Summary evaluated rows: ${summaryRows.length}`);

  const newChangesTabName = `${newCycle.replace(" ", "")} changes`;
  let newChangesSheetId;

  if (sheetsByTitle[newChangesTabName]) {
    newChangesSheetId = sheetsByTitle[newChangesTabName].sheetId;
  } else {
    console.log(`Duplicating template to create tab "${newChangesTabName}"...`);
    const templateSheetId = sheetsByTitle[prevChangesTabName]
      ? sheetsByTitle[prevChangesTabName].sheetId
      : sheetsByTitle["Calculate Summary"].sheetId;
    const dupRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            duplicateSheet: {
              sourceSheetId: templateSheetId,
              insertSheetIndex: 2,
              newSheetName: newChangesTabName
            }
          }
        ]
      }
    });
    newChangesSheetId =
      dupRes.data.replies[0].duplicateSheet.properties.sheetId;
  }

  // Clear and write static data to new changes tab
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${newChangesTabName}'!A1:E250`
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${newChangesTabName}'!A1:E${summaryRows.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: summaryRows }
  });

  // Step 6: Configure Visibility & Introduction Tab
  console.log("Configuring sheet visibility...");
  const visibilityRequests = [
    {
      updateSheetProperties: {
        properties: { sheetId: newChangesSheetId, hidden: false },
        fields: "hidden"
      }
    },
    {
      updateSheetProperties: {
        properties: {
          sheetId: sheetsByTitle["Calculate Summary"].sheetId,
          hidden: true
        },
        fields: "hidden"
      }
    }
  ];
  if (sheetsByTitle[prevChangesTabName]) {
    visibilityRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sheetsByTitle[prevChangesTabName].sheetId,
          hidden: true
        },
        fields: "hidden"
      }
    });
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: visibilityRequests }
  });

  // Update Introduction Tab example header
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Introduction!G5",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[newCycle]] }
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Introduction!I5",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[prevCycle]] }
  });

  // Step 7: Run Final Verification
  console.log("\nRunning validation on updated document...");
  const verifyRes = await verifyPointsSheet({
    spreadsheetId,
    manifestPath,
    cycleName: newCycle,
    prevCycleName: prevCycle
  });

  return verifyRes;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const manifestPath =
    args[0] ||
    path.join(
      __dirname,
      "../../update-xwing-data2-legacy/scripts/march_2026_points_manifest.json"
    );
  updatePointsSheet({
    manifestPath,
    newCycle: args[1] || "Mar 26",
    prevCycle: args[2] || "Dec 25"
  }).catch(console.error);
}

module.exports = { updatePointsSheet };
