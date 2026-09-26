const path = require("path");
const fs = require("fs");

// Locate googleapis from global npx cache or local node_modules
let googleapisPath = "googleapis";
const npxPath =
  "C:/Users/valte/AppData/Local/npm-cache/_npx/bf8ea422524e34d4/node_modules/googleapis";
if (fs.existsSync(npxPath)) {
  googleapisPath = npxPath;
}
const { google } = require(googleapisPath);

const defaultCredsPath =
  "C:/Users/valte/.gemini/google-sheets-credentials.json";
const defaultSpreadsheetId = "1kgEwq-1UtA7w8Q5sXAr_bt0AZHfaaZDnVRC9lnyAoBY";

function getAuth(credsPath = defaultCredsPath) {
  return new google.auth.GoogleAuth({
    keyFile: credsPath,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive"
    ]
  });
}

let sheetsInstance = null;

async function getSheets(credsPath = defaultCredsPath) {
  if (!sheetsInstance) {
    const auth = getAuth(credsPath);
    const authClient = await auth.getClient();
    sheetsInstance = google.sheets({ version: "v4", auth: authClient });
  }
  return sheetsInstance;
}

module.exports = {
  getSheets,
  getAuth,
  defaultSpreadsheetId,
  defaultCredsPath
};
