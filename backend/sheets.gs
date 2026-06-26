/**
 * Google Sheets read helpers.
 * These functions avoid destructive operations and never create CRM data.
 */

function getSpreadsheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'PASTE_SPREADSHEET_ID_HERE') {
    throw new Error('Spreadsheet ID is not configured.');
  }

  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheetByNameSafe(sheetName) {
  const name = safeString(sheetName);
  var spreadsheet;
  var sheet;

  if (!name) {
    return null;
  }

  try {
    spreadsheet = getSpreadsheet();
    sheet = spreadsheet.getSheetByName(name);
    return sheet || findSheetByNormalizedName(spreadsheet, name);
  } catch (error) {
    return null;
  }
}

function getSheetByName(name) {
  const sheetName = safeString(name);
  const sheet = getSheetByNameSafe(sheetName);

  if (!sheetName) {
    throw new Error('Sheet name is required.');
  }

  if (!sheet) {
    throw new Error('Missing required sheet: ' + sheetName);
  }

  return sheet;
}

function findSheetByNormalizedName(spreadsheet, sheetName) {
  const expected = normalizeSheetName(sheetName);
  const sheets = spreadsheet.getSheets();

  for (var index = 0; index < sheets.length; index += 1) {
    if (normalizeSheetName(sheets[index].getName()) === expected) {
      return sheets[index];
    }
  }

  return null;
}

function normalizeSheetName(name) {
  return safeString(name).toLowerCase().replace(/[\s_]+/g, '');
}

function readSheetObjectsFromSheet(sheet) {
  const values = sheet.getDataRange().getValues();

  if (!values || values.length === 0) {
    return [];
  }

  const headers = values[0].map(function (header) {
    return safeString(header);
  });

  if (!headers.some(function (header) { return header !== ''; })) {
    return [];
  }

  return values.slice(1)
    .filter(function (row) {
      return row.some(function (cell) {
        return safeString(cell) !== '';
      });
    })
    .map(function (row) {
      const item = {};

      headers.forEach(function (header, index) {
        if (header) {
          item[header] = normalizeSheetValue(row[index]);
        }
      });

      return item;
    });
}

function readSheetObjectsRequired(sheetName) {
  const sheet = getSheetByName(sheetName);
  return readSheetObjectsFromSheet(sheet);
}

function readSheetObjectsSafe(sheetName) {
  const sheet = getSheetByNameSafe(sheetName);
  if (!sheet) {
    return [];
  }

  try {
    return readSheetObjectsFromSheet(sheet);
  } catch (error) {
    return [];
  }
}

function readSheetObjects(sheetName) {
  return readSheetObjectsRequired(sheetName);
}

function safeReadSheetObjects(sheetName) {
  return readSheetObjectsSafe(sheetName);
}

function getSheetHeadersSafe(sheetName) {
  const sheet = getSheetByNameSafe(sheetName);
  const lastColumn = sheet ? sheet.getLastColumn() : 0;

  if (!sheet || lastColumn < 1) {
    return [];
  }

  try {
    return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (header) {
      return safeString(header);
    });
  } catch (error) {
    return [];
  }
}

function safeGetSheetHeaders(sheetName) {
  return getSheetHeadersSafe(sheetName);
}

function getSheetHeaders(sheetName) {
  const sheet = getSheetByName(sheetName);
  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    return [];
  }

  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (header) {
    return safeString(header);
  });
}

function appendSheetObject(sheetName, data) {
  const sheet = getSheetByName(sheetName);
  const headers = getSheetHeaders(sheetName);

  if (!headers.length) {
    throw new Error('Missing headers for sheet: ' + sheetName);
  }

  const row = headers.map(function (header) {
    return data[header] !== undefined ? data[header] : '';
  });

  sheet.appendRow(row);
  return data;
}

function updateSheetObjectByKey(sheetName, keyName, keyValue, data) {
  const sheet = getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();

  if (!values || values.length < 2) {
    throw new Error('No rows available in sheet: ' + sheetName);
  }

  const headers = values[0].map(function (header) {
    return safeString(header);
  });
  const keyIndex = headers.indexOf(keyName);

  if (keyIndex === -1) {
    throw new Error('Missing key header: ' + keyName);
  }

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (safeString(values[rowIndex][keyIndex]) === safeString(keyValue)) {
      headers.forEach(function (header, columnIndex) {
        if (header && data[header] !== undefined) {
          sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(data[header]);
        }
      });

      return readSheetObjects(sheetName).filter(function (row) {
        return safeString(row[keyName]) === safeString(keyValue);
      })[0] || {};
    }
  }

  throw new Error('Row not found for ' + keyName + ': ' + keyValue);
}

function validateRequiredSheets() {
  const spreadsheet = getSpreadsheet();
  const missing = [];

  Object.keys(SHEET_NAMES).forEach(function (key) {
    const name = SHEET_NAMES[key];
    if (!spreadsheet.getSheetByName(name) && !findSheetByNormalizedName(spreadsheet, name)) {
      missing.push(name);
    }
  });

  return {
    valid: missing.length === 0,
    missing: missing,
    required: Object.keys(SHEET_NAMES).map(function (key) {
      return SHEET_NAMES[key];
    })
  };
}

function getDebugSheets() {
  const keySheets = [
    SHEET_NAMES.AFFILIATES,
    SHEET_NAMES.STAFF_LIST,
    SHEET_NAMES.BRAND_LIST,
    SHEET_NAMES.FOLLOWUP_QUEUE
  ];
  const status = {};
  var spreadsheet = null;
  var spreadsheetOpened = false;
  var sheetsFound = [];
  var errorMessage = '';

  try {
    spreadsheet = getSpreadsheet();
    spreadsheetOpened = true;
    sheetsFound = spreadsheet.getSheets().map(function (sheet) {
      return sheet.getName();
    });
  } catch (error) {
    errorMessage = error && error.message ? error.message : String(error);
  }

  keySheets.forEach(function (sheetName) {
    const sheet = spreadsheet ? (spreadsheet.getSheetByName(sheetName) || findSheetByNormalizedName(spreadsheet, sheetName)) : null;
    const headers = sheet ? getHeadersFromSheet(sheet) : [];
    const rowCount = sheet ? Math.max(0, sheet.getDataRange().getValues().length - 1) : 0;

    status[sheetName] = {
      found: !!sheet,
      rowCount: rowCount,
      headers: headers
    };
  });

  return {
    spreadsheetOpened: spreadsheetOpened,
    sheetsFound: sheetsFound,
    requiredSheetStatus: status,
    errorMessage: errorMessage
  };
}

function getHeadersFromSheet(sheet) {
  const lastColumn = sheet ? sheet.getLastColumn() : 0;

  if (!sheet || lastColumn < 1) {
    return [];
  }

  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (header) {
    return safeString(header);
  });
}

function safeValidateRequiredSheets() {
  try {
    return validateRequiredSheets();
  } catch (error) {
    return {
      valid: false,
      missing: [],
      required: Object.keys(SHEET_NAMES).map(function (key) {
        return SHEET_NAMES[key];
      }),
      error: error && error.message ? error.message : String(error)
    };
  }
}

function normalizeSheetValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return value;
}
