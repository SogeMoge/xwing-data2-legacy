#!/usr/bin/env node

/**
 * Validation & Report Generator for X-Wing Data 2 (Legacy) Points Updates.
 *
 * Compares:
 * 1. Current value in database (before update)
 * 2. Input value from balance spreadsheet
 * 3. Final updated value in database
 *
 * Generates a markdown report and verifies all values match expected state.
 */

const fs = require("fs");
const path = require("path");

function formatCost(cost) {
  if (typeof cost === "number") {
    return String(cost);
  }
  if (!cost) {
    return "undefined";
  }
  if (typeof cost === "object") {
    if (typeof cost.value === "number") {
      return String(cost.value);
    }
    if (cost.variable === "size" && cost.values) {
      return `size(S:${cost.values.Small},M:${cost.values.Medium},L:${
        cost.values.Large
      }${cost.values.Huge !== undefined ? ",H:" + cost.values.Huge : ""})`;
    }
    if (cost.variable === "initiative" && cost.values) {
      const keys = Object.keys(cost.values).sort(
        (a, b) => Number(a) - Number(b)
      );
      return `init(${keys.map(k => cost.values[k]).join("/")})`;
    }
    if (cost.variable === "agility" && cost.values) {
      const keys = Object.keys(cost.values).sort(
        (a, b) => Number(a) - Number(b)
      );
      return `agility(${keys.map(k => `${k}:${cost.values[k]}`).join(",")})`;
    }
    return JSON.stringify(cost);
  }
  return String(cost);
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validateAndReport({
  manifestPath,
  reportOutputPath,
  repoRoot = path.resolve(__dirname, "../../../../")
}) {
  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest file not found: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const rows = [];
  let passCount = 0;
  let failCount = 0;

  for (const item of manifest) {
    const fullPath = path.join(repoRoot, item.file);
    if (!fs.existsSync(fullPath)) {
      rows.push({
        name: item.sheetName || item.canonicalName,
        xws: item.xws,
        file: item.file,
        type: item.kind,
        sheet: item.sheet,
        beforeValue: formatCost(item.oldFileCost),
        spreadsheetInput: String(item.sheetCollated),
        finalValue: "FILE NOT FOUND",
        status: "FAIL"
      });
      failCount++;
      continue;
    }

    const fileContent = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    let foundCost = null;

    if (item.kind === "pilot") {
      const pilot = (fileContent.pilots || []).find(p => p.xws === item.xws);
      if (pilot) {
        foundCost = pilot.cost;
      }
    } else if (item.kind === "upgrade") {
      const up = (Array.isArray(fileContent) ? fileContent : []).find(
        u => u.xws === item.xws
      );
      if (up) {
        foundCost = up.cost;
      }
    }

    const expectedCost = item.newCost;
    const isPass = foundCost !== null && deepEqual(foundCost, expectedCost);

    if (isPass) {
      passCount++;
    } else {
      failCount++;
    }

    rows.push({
      name: item.canonicalName || item.sheetName,
      xws: item.xws,
      file: item.file,
      type: item.kind,
      sheet: item.sheet,
      beforeValue: formatCost(item.oldFileCost),
      spreadsheetInput: String(item.sheetCollated),
      finalValue: formatCost(foundCost),
      status: isPass ? "PASS" : "FAIL"
    });
  }

  let md = `# Points Update Validation & Verification Report\n\n`;
  md += `**Date**: ${new Date().toISOString()}\n\n`;
  md += `**Total Cards Updated**: ${manifest.length}\n\n`;
  md += `**Passed Validation**: ${passCount}\n\n`;
  md += `**Failed Validation**: ${failCount}\n\n`;
  md += `## Points Comparison Table\n\n`;
  md += `| Sheet | Card Name | XWS | Kind | Value in DB (Before) | Spreadsheet Input | Final Value in DB | Status |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;

  for (const r of rows) {
    const statusIcon = r.status === "PASS" ? "✅ PASS" : "❌ FAIL";
    md += `| ${r.sheet || "-"} | **${r.name}** | \`${r.xws}\` | ${r.type} | \`${
      r.beforeValue
    }\` | \`${r.spreadsheetInput}\` | \`${r.finalValue}\` | ${statusIcon} |\n`;
  }

  if (reportOutputPath) {
    fs.mkdirSync(path.dirname(reportOutputPath), { recursive: true });
    fs.writeFileSync(reportOutputPath, md, "utf8");
    console.log(`Report written to: ${reportOutputPath}`);
  }

  console.log(
    `\nValidation Summary: ${passCount} PASSED, ${failCount} FAILED out of ${manifest.length} cards.`
  );
  if (failCount > 0) {
    console.error("Validation failed for one or more cards.");
    return false;
  }
  return true;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const manifestPath =
    args[0] || path.resolve(__dirname, "points_manifest.json");
  const defaultReportName = `${new Date()
    .toISOString()
    .slice(0, 7)}-points-update.md`;
  const reportOutputPath =
    args[1] || path.resolve(process.cwd(), "changelog", defaultReportName);
  const success = validateAndReport({ manifestPath, reportOutputPath });
  process.exit(success ? 0 : 1);
}

module.exports = { validateAndReport, formatCost };
