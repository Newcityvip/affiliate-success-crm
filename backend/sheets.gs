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

function getSheetByName(name) {
  const sheetName = safeString(name);
  if (!sheetName) {
    throw new Error('Sheet name is required.');
  }

  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + sheetName);
  }

  return sheet;
}

function readSheetObjects(sheetName) {
  const sheet = getSheetByName(sheetName);
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
    if (!spreadsheet.getSheetByName(name)) {
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

function normalizeSheetValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return value;
}
