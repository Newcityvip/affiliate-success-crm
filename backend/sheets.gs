/**
 * Google Sheets access helpers.
 * These functions avoid destructive operations and do not create data.
 */

function getSpreadsheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('PASTE_') === 0) {
    throw new Error('Spreadsheet ID is not configured.');
  }

  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheetByName(name) {
  const sheetName = safeString(name);
  if (!sheetName) {
    throw new Error('Sheet name is required.');
  }

  return getSpreadsheet().getSheetByName(sheetName);
}

function validateRequiredSheets() {
  const spreadsheet = getSpreadsheet();
  const missing = [];

  Object.keys(SHEET_NAMES).forEach(function (key) {
    const name = SHEET_NAMES[key];
    if (!spreadsheet.getSheetByName(name)) {
      missing.push(name);
    }
  });

  return {
    valid: missing.length === 0,
    missing: missing
  };
}
