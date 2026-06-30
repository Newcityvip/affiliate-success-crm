const PERFORMANCE_REQUIRED_HEADERS = Object.freeze(['Brand', 'Affiliate_ID', 'FTD', 'Active_Players', 'Deposit_Amount']);
const PERFORMANCE_OPTIONAL_HEADERS = Object.freeze(['Performance_ID', 'Date', 'Month', 'Affiliate_Name', 'Assigned_Staff', 'Registrations', 'Deposits', 'Turnover', 'Revenue_NGR', 'NGR', 'Commission', 'Conversion_Rate', 'Growth_Percent', 'Status', 'Notes', 'Remarks', 'Updated_By', 'Updated_At']);

function getPerformance(user) {
  const items = normalizePerformanceRows(filterPerformanceForUser(safeReadSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE), user));
  return {
    count: items.length,
    items: items,
    summary: buildPerformanceSummary(items),
    headerStatus: getPerformanceHeaderStatus()
  };
}

function createPerformance(payload, user) {
  requirePerformanceWrite(payload, user);
  return {
    item: savePerformanceRow(payload, user, true)
  };
}

function updatePerformance(payload, user) {
  const id = getPerformanceUpdateKey(payload);
  const existing = getExistingPerformanceForUpdate(payload);

  if (!id) {
    throwCodedError('VALIDATION_ERROR', 'Performance row key is required.');
  }

  requirePerformanceWrite(existing, user);
  return {
    item: savePerformanceRow(payload, user, false)
  };
}

function importPerformanceCsvPreview(payload, user) {
  return importCsvPreview(mergePayload(payload, { entity: 'performance' }), user);
}

function importPerformanceCsvCommit(payload, user) {
  return importCsvCommit(mergePayload(payload, { entity: 'performance' }), user);
}

function savePerformanceRow(payload, user, isCreate) {
  const headers = getSheetHeadersSafe(SHEET_NAMES.MONTHLY_PERFORMANCE);
  const source = payload || {};
  const data = {};
  var saved;

  if (!headers.length) {
    throwCodedError('MISSING_SHEET', 'Monthly_Performance is missing or has no headers.');
  }

  headers.forEach(function (header) {
    const value = getPerformanceSourceValue(source, header);
    if (value !== undefined) {
      data[header] = value;
    }
  });

  autofillPerformanceFromAffiliate(data, source, user, headers);
  if (headers.indexOf('Performance_ID') !== -1 && isCreate) {
    setIfHeaderExists(data, headers, ['Performance_ID'], safeString(source.Performance_ID) || nextSheetId(SHEET_NAMES.MONTHLY_PERFORMANCE, 'Performance_ID', 'PERF', 4), true);
  }
  setIfHeaderExists(data, headers, ['Month'], derivePerformanceMonth(data.Date || source.Date || source.Month), true);
  setIfHeaderExists(data, headers, ['Conversion_Rate', 'Growth_Percent'], calculateConversionRate(data.FTD || source.FTD, data.Active_Players || source.Active_Players), false);
  setIfHeaderExists(data, headers, ['Updated_By'], getUserDisplayName(user), true);
  setIfHeaderExists(data, headers, ['Updated_At'], getTimestamp(), true);

  validatePerformancePayload(data, headers);

  if (isCreate) {
    appendSheetObject(SHEET_NAMES.MONTHLY_PERFORMANCE, data);
    saved = data;
  } else {
    saved = updatePerformanceSheetRow(source, data, headers);
  }

  logActivity(user, isCreate ? 'create' : 'update', 'Performance', safeString(saved.Performance_ID), buildActivitySummary('Performance', saved, isCreate ? 'created' : 'updated'));
  return saved;
}

function getPerformanceSourceValue(source, header) {
  const aliases = {
    Date: ['Date'],
    Month: ['Month', 'Date'],
    Revenue_NGR: ['Revenue_NGR', 'NGR', 'Revenue'],
    NGR: ['NGR', 'Revenue_NGR', 'Revenue'],
    Notes: ['Notes', 'Remarks'],
    Remarks: ['Remarks', 'Notes'],
    Conversion_Rate: ['Conversion_Rate', 'Growth_Percent'],
    Growth_Percent: ['Growth_Percent', 'Conversion_Rate'],
    Deposit_Amount: ['Deposit_Amount', 'Deposits'],
    Deposits: ['Deposits', 'Deposit_Amount']
  };
  const keys = aliases[header] || [header];
  var index;

  for (index = 0; index < keys.length; index += 1) {
    if (source[keys[index]] !== undefined) {
      return source[keys[index]];
    }
  }

  return undefined;
}

function autofillPerformanceFromAffiliate(data, source, user, headers) {
  const affiliateId = safeString(source && source.Affiliate_ID);
  const affiliate = affiliateId ? getAffiliateForPerformance(affiliateId) : {};

  if (!isAdminUser(user)) {
    setStaffOwnership(data, headers, user);
  }

  setIfHeaderExists(data, headers, ['Affiliate_Name'], safeString(source.Affiliate_Name) || safeString(affiliate.Affiliate_Name), false);
  setIfHeaderExists(data, headers, ['Brand'], safeString(source.Brand) || safeString(affiliate.Brand), false);
  setIfHeaderExists(data, headers, ['Assigned_Staff'], safeString(source.Assigned_Staff) || safeString(affiliate.Assigned_Staff) || getUserDisplayName(user), false);
}

function requirePerformanceWrite(payload, user) {
  if (isAdminUser(user) || userCanViewAll(user)) {
    return true;
  }

  if (isAffiliateAssignedToUser(safeString(payload && payload.Affiliate_ID), user) || isPayloadAssignedToUser(payload, user)) {
    return true;
  }

  throwCodedError('FORBIDDEN', 'You can only update performance for assigned affiliates.');
}

function getPerformanceUpdateKey(payload) {
  return safeString(payload && payload.Performance_ID) || [
    safeString(payload && (payload.Month || derivePerformanceMonth(payload.Date))),
    safeString(payload && payload.Affiliate_ID),
    safeString(payload && payload.Brand)
  ].join('|');
}

function getExistingPerformanceForUpdate(payload) {
  const id = safeString(payload && payload.Performance_ID);
  const month = safeString(payload && (payload.Month || derivePerformanceMonth(payload.Date)));
  const affiliateId = safeString(payload && payload.Affiliate_ID);
  const brand = safeString(payload && payload.Brand);
  const row = safeReadSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE).filter(function (item) {
    if (id && safeString(item.Performance_ID) === id) {
      return true;
    }
    return month && affiliateId && safeString(item.Affiliate_ID) === affiliateId && safeString(item.Month || derivePerformanceMonth(item.Date)) === month && (!brand || safeString(item.Brand) === brand);
  })[0];

  if (!row) {
    throwCodedError('NOT_FOUND', 'Performance row was not found.');
  }

  return row;
}

function updatePerformanceSheetRow(source, data, headers) {
  if (headers.indexOf('Performance_ID') !== -1 && safeString(source.Performance_ID)) {
    return updateSheetObjectByKey(SHEET_NAMES.MONTHLY_PERFORMANCE, 'Performance_ID', safeString(source.Performance_ID), data);
  }

  return updatePerformanceSheetRowByComposite(source, data, headers);
}

function updatePerformanceSheetRowByComposite(source, data, headers) {
  const sheet = getSheetByName(SHEET_NAMES.MONTHLY_PERFORMANCE);
  const values = sheet.getDataRange().getValues();
  const headerMap = {};
  const month = safeString(source.Month || derivePerformanceMonth(source.Date));
  const affiliateId = safeString(source.Affiliate_ID);
  const brand = safeString(source.Brand);
  var rowIndex;

  headers.forEach(function (header, index) {
    headerMap[header] = index;
  });

  if (!month || !affiliateId) {
    throwCodedError('VALIDATION_ERROR', 'Month and Affiliate ID are required for performance update.');
  }

  for (rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const rowMonth = normalizeSheetValue(row[headerMap.Month]) || derivePerformanceMonth(normalizeSheetValue(row[headerMap.Date]));
    const rowAffiliate = normalizeSheetValue(row[headerMap.Affiliate_ID]);
    const rowBrand = normalizeSheetValue(row[headerMap.Brand]);

    if (safeString(rowMonth) === month && safeString(rowAffiliate) === affiliateId && (!brand || safeString(rowBrand) === brand)) {
      headers.forEach(function (header, columnIndex) {
        if (header && data[header] !== undefined) {
          sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(data[header]);
        }
      });

      return readSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE).filter(function (item) {
        return safeString(item.Affiliate_ID) === affiliateId && safeString(item.Month || derivePerformanceMonth(item.Date)) === month && (!brand || safeString(item.Brand) === brand);
      })[0] || data;
    }
  }

  throwCodedError('NOT_FOUND', 'Performance row was not found.');
}

function getAffiliateForPerformance(affiliateId) {
  return safeReadSheetObjects(SHEET_NAMES.AFFILIATES).filter(function (affiliate) {
    return safeString(affiliate.Affiliate_ID) === safeString(affiliateId);
  })[0] || {};
}

function validatePerformancePayload(data, headers) {
  const missing = [];
  const hasMonthOrDate = headers.indexOf('Month') === -1 && headers.indexOf('Date') === -1 ? true : Boolean(safeString(data.Month) || safeString(data.Date));
  const hasRevenue = headers.indexOf('Revenue_NGR') === -1 && headers.indexOf('NGR') === -1 ? true : Boolean(safeString(data.Revenue_NGR) || safeString(data.NGR));

  if (!hasMonthOrDate) {
    missing.push(headers.indexOf('Month') !== -1 ? 'Month' : 'Date');
  }

  if (!hasRevenue) {
    missing.push(headers.indexOf('NGR') !== -1 ? 'NGR' : 'Revenue_NGR');
  }

  PERFORMANCE_REQUIRED_HEADERS.forEach(function (field) {
    if (headers.indexOf(field) !== -1 && !safeString(data[field])) {
      missing.push(field);
    }
  });

  if (missing.length) {
    throwCodedError('VALIDATION_ERROR', 'Missing required fields: ' + missing.join(', '));
  }
}

function getPerformanceHeaderStatus() {
  const headers = getSheetHeadersSafe(SHEET_NAMES.MONTHLY_PERFORMANCE);
  const expected = PERFORMANCE_REQUIRED_HEADERS.concat(PERFORMANCE_OPTIONAL_HEADERS);
  return {
    found: headers.length > 0,
    headers: headers,
    requiredHeaders: ['Month or Date'].concat(PERFORMANCE_REQUIRED_HEADERS).concat(['Revenue_NGR or NGR']),
    optionalHeaders: PERFORMANCE_OPTIONAL_HEADERS,
    missingRequiredHeaders: getMissingPerformanceRequiredHeaders(headers),
    missingOptionalHeaders: PERFORMANCE_OPTIONAL_HEADERS.filter(function (header) { return headers.indexOf(header) === -1; }),
    supportedHeaders: expected.filter(function (header) { return headers.indexOf(header) !== -1; })
  };
}

function getMissingPerformanceRequiredHeaders(headers) {
  const missing = PERFORMANCE_REQUIRED_HEADERS.filter(function (header) { return headers.indexOf(header) === -1; });
  if (headers.indexOf('Month') === -1 && headers.indexOf('Date') === -1) {
    missing.push('Month or Date');
  }
  if (headers.indexOf('Revenue_NGR') === -1 && headers.indexOf('NGR') === -1) {
    missing.push('Revenue_NGR or NGR');
  }
  return missing;
}

function normalizePerformanceRows(rows) {
  return (rows || []).map(function (row) {
    const item = copyRow(row);
    if (!safeString(item.Month)) {
      item.Month = derivePerformanceMonth(item.Date || item.Performance_Month || item.Period);
    } else {
      item.Month = derivePerformanceMonth(item.Month);
    }
    if (!safeString(item.Conversion_Rate)) {
      item.Conversion_Rate = item.Growth_Percent || calculateConversionRate(item.FTD, item.Active_Players);
    }
    item.Revenue_NGR = firstDefinedPerformance(item.Revenue_NGR, item.NGR, item.Revenue);
    item.Notes = firstDefinedPerformance(item.Notes, item.Remarks);
    return item;
  });
}

function buildPerformanceSummary(rows) {
  const monthKey = currentMonthKey();
  const thisMonth = (rows || []).filter(function (row) {
    return derivePerformanceMonth(getFirstValue(row, ['Month', 'Date', 'Performance_Month', 'Period'])) === monthKey;
  });
  const source = thisMonth.length ? thisMonth : (rows || []);
  const activePlayers = sumPerformanceNumber(source, ['Active_Players', 'Active Players']);
  const ftd = sumPerformanceNumber(source, ['FTD', 'FTDs']);
  const growthValues = getPerformanceNumberValues(source, ['Growth_Percent', 'Conversion_Rate', 'Growth', 'Growth_Rate', 'MoM_Growth']);
  return {
    month: monthKey,
    totalFtd: ftd,
    activePlayers: activePlayers,
    depositAmount: sumPerformanceNumber(source, ['Deposit_Amount', 'Deposit Amount']),
    revenueNgr: sumPerformanceNumber(source, ['Revenue_NGR', 'NGR', 'Revenue', 'Net_Gaming_Revenue']),
    commission: sumPerformanceNumber(source, ['Commission']),
    growth: growthValues.length ? roundNumber(sumArray(growthValues) / growthValues.length, 4) : '',
    averageConversion: activePlayers ? roundNumber(ftd / activePlayers, 4) : ''
  };
}

function firstDefinedPerformance() {
  var index;
  for (index = 0; index < arguments.length; index += 1) {
    if (safeString(arguments[index])) {
      return arguments[index];
    }
  }
  return '';
}

function sumPerformanceNumber(rows, keys) {
  return (rows || []).reduce(function (sum, row) {
    const value = parsePerformanceNumber(getFirstValue(row, keys));
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
}

function getPerformanceNumberValues(rows, keys) {
  return (rows || []).map(function (row) {
    return parsePerformanceNumber(getFirstValue(row, keys));
  }).filter(function (value) {
    return !isNaN(value);
  });
}

function parsePerformanceNumber(value) {
  const raw = safeString(value);
  const cleaned = raw.replace(/[$,%\s,]/g, '');
  if (!cleaned) {
    return NaN;
  }
  return Number(cleaned);
}

function sumArray(values) {
  return (values || []).reduce(function (sum, value) {
    return sum + value;
  }, 0);
}

function calculateConversionRate(ftdValue, activeValue) {
  const ftd = Number(ftdValue || 0);
  const active = Number(activeValue || 0);
  if (!active || isNaN(ftd) || isNaN(active)) {
    return '';
  }
  return roundNumber(ftd / active, 4);
}

function derivePerformanceMonth(value) {
  const raw = safeString(value);
  if (/^\d{4}-\d{2}/.test(raw)) {
    return raw.slice(0, 7);
  }
  const date = raw ? new Date(raw) : new Date();
  if (!isNaN(date.getTime())) {
    return date.getFullYear() + '-' + padNumber(date.getMonth() + 1, 2);
  }
  return raw.length >= 7 ? raw.slice(0, 7) : currentMonthKey();
}

function currentMonthKey() {
  const date = new Date();
  return date.getFullYear() + '-' + padNumber(date.getMonth() + 1, 2);
}

function roundNumber(value, places) {
  const multiplier = Math.pow(10, places || 2);
  return Math.round(Number(value || 0) * multiplier) / multiplier;
}

function mergePayload(payload, extra) {
  const merged = {};
  Object.keys(payload || {}).forEach(function (key) {
    merged[key] = payload[key];
  });
  Object.keys(extra || {}).forEach(function (key) {
    merged[key] = extra[key];
  });
  return merged;
}
