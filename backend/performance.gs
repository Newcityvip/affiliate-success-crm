const PERFORMANCE_REQUIRED_HEADERS = Object.freeze(['Brand', 'Affiliate_ID', 'FTD', 'Active_Players', 'Deposit_Amount']);
const PERFORMANCE_OPTIONAL_HEADERS = Object.freeze(['Performance_ID', 'Date', 'Month', 'Week_Start', 'Week_End', 'Period_Type', 'Affiliate_Name', 'Assigned_Staff', 'Registrations', 'Deposits', 'Turnover', 'Revenue_NGR', 'NGR', 'Commission', 'Conversion_Rate', 'Growth_Percent', 'Status', 'Notes', 'Remarks', 'Updated_By', 'Updated_At']);

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

function getDebugDashboard(user) {
  const sheet = getSheetByNameSafe(SHEET_NAMES.MONTHLY_PERFORMANCE);
  const headers = sheet ? getSheetHeadersSafe(SHEET_NAMES.MONTHLY_PERFORMANCE) : [];
  const rows = normalizePerformanceRows(safeReadSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE));
  const scopedRows = filterPerformanceForUser(rows, user);
  const performanceSummary = buildPerformanceSummary(scopedRows);
  const dashboard = getDashboardSummary(user);

  return {
    monthlyPerformanceSheetFound: Boolean(sheet),
    headersFound: headers,
    rowCount: rows.length,
    scopedRowCount: scopedRows.length,
    parsedFirst3Rows: scopedRows.slice(0, 3),
    computedPerformanceSummary: performanceSummary,
    dashboardKeysReturned: Object.keys(dashboard || {}),
    dashboardPerformanceKeys: {
      thisMonthFtd: dashboard.thisMonthFtd,
      activePlayers: dashboard.activePlayers,
      revenueNgr: dashboard.revenueNgr,
      commission: dashboard.commission,
      depositAmount: dashboard.depositAmount,
      turnover: dashboard.turnover,
      growth: dashboard.growth,
      performanceSummary: dashboard.performanceSummary
    }
  };
}

function getDebugPerformanceWrite(payload, parsedAction, user) {
  const source = payload || {};
  const target = findPerformanceWriteTarget(source);
  const missing = getMissingPerformancePayloadFields(source, getSheetHeadersSafe(SHEET_NAMES.MONTHLY_PERFORMANCE));
  const periodType = getPerformancePeriodType(source);
  const normalizedMonth = derivePerformanceMonth(getFirstValue(source, ['Month', 'Date', 'Performance_Month', 'Period']));

  return {
    parsedAction: parsedAction,
    targetRowMatchMethod: target.method,
    matchedRowNumber: target.rowNumber,
    payloadKeys: Object.keys(source),
    missingRequiredFields: missing,
    normalized: {
      Period_Type: periodType,
      Month: normalizedMonth,
      Week_Start: normalizeDateValue(source.Week_Start),
      Week_End: normalizeDateValue(source.Week_End),
      Date: normalizeDateValue(getFirstValue(source, ['Date', 'Month'])),
      Affiliate_ID: safeString(source.Affiliate_ID),
      Brand: safeString(source.Brand)
    },
    canWriteForUser: canDebugPerformanceWrite(source, user)
  };
}

function savePerformanceRow(payload, user, isCreate) {
  const headers = ensurePerformanceWriteHeaders(payload);
  const source = payload || {};
  const data = {};
  const periodType = getPerformancePeriodType(source);
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
  setIfHeaderExists(data, headers, ['Period_Type'], periodType, true);
  if (periodType === 'Weekly') {
    setIfHeaderExists(data, headers, ['Week_Start'], normalizeDateValue(source.Week_Start), true);
    setIfHeaderExists(data, headers, ['Week_End'], normalizeDateValue(source.Week_End), true);
    setIfHeaderExists(data, headers, ['Month'], derivePerformanceMonth(source.Week_Start || source.Week_End || source.Month || source.Date), true);
  } else {
    setIfHeaderExists(data, headers, ['Month'], derivePerformanceMonth(data.Date || source.Date || source.Month), true);
  }
  setIfHeaderExists(data, headers, ['Growth_Percent', 'Conversion_Rate'], calculatePerformanceGrowth(data, source), true);
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

function ensurePerformanceWriteHeaders(payload) {
  const existingHeaders = getSheetHeadersSafe(SHEET_NAMES.MONTHLY_PERFORMANCE);
  const periodType = getPerformancePeriodType(payload || {});
  var requiredHeaders;

  if (!existingHeaders.length) {
    return existingHeaders;
  }

  requiredHeaders = ['Period_Type'];
  if (periodType === 'Weekly') {
    requiredHeaders = requiredHeaders.concat(['Week_Start', 'Week_End']);
  }

  return ensureSheetHeaders(SHEET_NAMES.MONTHLY_PERFORMANCE, requiredHeaders).headers;
}

function getPerformanceSourceValue(source, header) {
  const aliases = {
    Date: ['Date'],
    Month: ['Month', 'Date'],
    Week_Start: ['Week_Start', 'Week Start'],
    Week_End: ['Week_End', 'Week End'],
    Period_Type: ['Period_Type', 'Period Type'],
    Revenue_NGR: ['Revenue_NGR', 'NGR', 'Revenue'],
    NGR: ['NGR', 'Revenue_NGR', 'Revenue'],
    Notes: ['Notes', 'Remarks'],
    Remarks: ['Remarks', 'Notes'],
    Conversion_Rate: ['Conversion_Rate', 'Growth_Percent'],
    Growth_Percent: ['Growth_Percent', 'Conversion_Rate'],
    Deposit_Amount: ['Deposit_Amount', 'Deposits'],
    Deposits: ['Deposits', 'Deposit_Amount'],
    Turnover: ['Turnover']
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
  return safeString(payload && payload.Performance_ID) || getPerformanceCompositeKey(payload);
}

function getPerformancePeriodType(source) {
  const raw = safeString(getFirstValue(source || {}, ['Period_Type', 'Period Type', 'Period']));
  if (/^weekly$/i.test(raw) || /week/i.test(raw)) {
    return 'Weekly';
  }
  if (/^monthly$/i.test(raw) || /month/i.test(raw)) {
    return 'Monthly';
  }
  if (safeString(source && source.Week_Start) || safeString(source && source.Week_End)) {
    return 'Weekly';
  }
  return 'Monthly';
}

function getPerformanceCompositeKey(source) {
  const row = source || {};
  const periodType = getPerformancePeriodType(row);
  const affiliateId = safeString(row.Affiliate_ID);
  const brand = safeString(row.Brand).toLowerCase();
  var month;
  var weekStart;
  var weekEnd;

  if (!affiliateId || !brand) {
    return '';
  }

  if (periodType === 'Weekly') {
    weekStart = normalizeDateValue(row.Week_Start);
    weekEnd = normalizeDateValue(row.Week_End);
    return weekStart && weekEnd ? ['Weekly', weekStart, weekEnd, affiliateId, brand].join('|') : '';
  }

  month = getPerformanceMonthForKey(row);
  return month ? ['Monthly', month, affiliateId, brand].join('|') : '';
}

function getPerformanceMonthForKey(source) {
  const raw = getFirstValue(source || {}, ['Month', 'Date', 'Performance_Month', 'Period']);
  return safeString(raw) ? derivePerformanceMonth(raw) : '';
}

function performanceRowsMatch(source, row) {
  const sourceRow = source || {};
  const targetRow = row || {};
  const sourceType = getPerformancePeriodType(sourceRow);
  const targetType = getPerformancePeriodType(targetRow);
  const sourceAffiliate = safeString(sourceRow.Affiliate_ID);
  const targetAffiliate = safeString(targetRow.Affiliate_ID);
  const sourceBrand = safeString(sourceRow.Brand).toLowerCase();
  const targetBrand = safeString(targetRow.Brand).toLowerCase();

  if (!sourceAffiliate || !targetAffiliate || sourceAffiliate !== targetAffiliate) {
    return false;
  }

  if (sourceBrand && targetBrand && sourceBrand !== targetBrand) {
    return false;
  }

  if (sourceType !== targetType) {
    return false;
  }

  if (sourceType === 'Weekly') {
    return normalizeDateValue(sourceRow.Week_Start) === normalizeDateValue(targetRow.Week_Start) &&
      normalizeDateValue(sourceRow.Week_End) === normalizeDateValue(targetRow.Week_End);
  }

  return getPerformanceMonthForKey(sourceRow) === getPerformanceMonthForKey(targetRow);
}

function buildPerformanceObjectFromSheetRow(row, headers) {
  const item = {};
  (headers || []).forEach(function (header, index) {
    if (header) {
      item[header] = normalizeSheetValue(row[index]);
    }
  });
  return item;
}

function getExistingPerformanceForUpdate(payload) {
  const id = safeString(payload && payload.Performance_ID);
  const row = safeReadSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE).filter(function (item) {
    if (id && safeString(item.Performance_ID) === id) {
      return true;
    }
    return performanceRowsMatch(payload, item);
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
  const periodType = getPerformancePeriodType(source);
  const month = getPerformanceMonthForKey(source);
  const weekStart = normalizeDateValue(source.Week_Start);
  const weekEnd = normalizeDateValue(source.Week_End);
  const affiliateId = safeString(source.Affiliate_ID);
  const brand = safeString(source.Brand);
  var rowIndex;

  headers.forEach(function (header, index) {
    headerMap[header] = index;
  });

  if (!affiliateId || (periodType === 'Weekly' ? (!weekStart || !weekEnd) : !month)) {
    throwCodedError('VALIDATION_ERROR', 'A performance period and Affiliate ID are required for performance update.');
  }

  for (rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const rowObject = buildPerformanceObjectFromSheetRow(row, headers);
    const rowMonth = getPerformanceMonthForKey(rowObject);
    const rowAffiliate = normalizeSheetValue(row[headerMap.Affiliate_ID]);
    const rowBrand = normalizeSheetValue(row[headerMap.Brand]);
    const rowWeekStart = normalizeDateValue(rowObject.Week_Start);
    const rowWeekEnd = normalizeDateValue(rowObject.Week_End);
    const rowPeriodType = getPerformancePeriodType(rowObject);

    if (
      rowPeriodType === periodType &&
      safeString(rowAffiliate) === affiliateId &&
      (!brand || safeString(rowBrand) === brand) &&
      (
        (periodType === 'Weekly' && rowWeekStart === weekStart && rowWeekEnd === weekEnd) ||
        (periodType !== 'Weekly' && safeString(rowMonth) === month)
      )
    ) {
      headers.forEach(function (header, columnIndex) {
        if (header && data[header] !== undefined) {
          sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(data[header]);
        }
      });

      return readSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE).filter(function (item) {
        return performanceRowsMatch(source, item);
      })[0] || data;
    }
  }

  throwCodedError('NOT_FOUND', 'Performance row was not found.');
}

function findPerformanceWriteTarget(source) {
  const id = safeString(source && source.Performance_ID);
  const sheet = getSheetByNameSafe(SHEET_NAMES.MONTHLY_PERFORMANCE);
  const rows = safeReadSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE);
  var rowIndex;
  var row;

  if (!sheet) {
    return {
      method: 'sheet-missing',
      rowNumber: ''
    };
  }

  if (id) {
    for (rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      row = rows[rowIndex];
      if (safeString(row.Performance_ID) === id) {
        return {
          method: 'Performance_ID',
          rowNumber: rowIndex + 2
        };
      }
    }
  }

  if (getPerformanceCompositeKey(source)) {
    for (rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      row = rows[rowIndex];
      if (performanceRowsMatch(source, row)) {
        return {
          method: getPerformancePeriodType(source) === 'Weekly' ? 'Period_Type+Week_Start+Week_End+Affiliate_ID+Brand' : 'Period_Type+Month+Affiliate_ID+Brand',
          rowNumber: rowIndex + 2
        };
      }
    }
  }

  return {
    method: 'none',
    rowNumber: ''
  };
}

function canDebugPerformanceWrite(payload, user) {
  try {
    requirePerformanceWrite(payload, user);
    return true;
  } catch (error) {
    return false;
  }
}

function getAffiliateForPerformance(affiliateId) {
  return safeReadSheetObjects(SHEET_NAMES.AFFILIATES).filter(function (affiliate) {
    return safeString(affiliate.Affiliate_ID) === safeString(affiliateId);
  })[0] || {};
}

function validatePerformancePayload(data, headers) {
  const missing = [];
  const periodType = getPerformancePeriodType(data);
  const hasMonthOrDate = headers.indexOf('Month') === -1 && headers.indexOf('Date') === -1 ? true : Boolean(safeString(data.Month) || safeString(data.Date));
  const hasWeekRange = headers.indexOf('Week_Start') === -1 && headers.indexOf('Week_End') === -1 ? true : Boolean(safeString(data.Week_Start) && safeString(data.Week_End));
  const hasRevenue = headers.indexOf('Revenue_NGR') === -1 && headers.indexOf('NGR') === -1 ? true : Boolean(safeString(data.Revenue_NGR) || safeString(data.NGR));

  if (periodType === 'Weekly' && !hasWeekRange) {
    missing.push('Week_Start and Week_End');
  }

  if (periodType === 'Weekly' && hasWeekRange && normalizeDateValue(data.Week_End) < normalizeDateValue(data.Week_Start)) {
    missing.push('Week_End must be on or after Week_Start');
  }

  if (periodType !== 'Weekly' && !hasMonthOrDate) {
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
    requiredHeaders: ['Month/Date or Week_Start/Week_End'].concat(PERFORMANCE_REQUIRED_HEADERS).concat(['Revenue_NGR or NGR']),
    optionalHeaders: PERFORMANCE_OPTIONAL_HEADERS,
    missingRequiredHeaders: getMissingPerformanceRequiredHeaders(headers),
    missingOptionalHeaders: PERFORMANCE_OPTIONAL_HEADERS.filter(function (header) { return headers.indexOf(header) === -1; }),
    supportedHeaders: expected.filter(function (header) { return headers.indexOf(header) !== -1; })
  };
}

function getMissingPerformanceRequiredHeaders(headers) {
  const missing = PERFORMANCE_REQUIRED_HEADERS.filter(function (header) { return headers.indexOf(header) === -1; });
  if (headers.indexOf('Month') === -1 && headers.indexOf('Date') === -1 && (headers.indexOf('Week_Start') === -1 || headers.indexOf('Week_End') === -1)) {
    missing.push('Month/Date or Week_Start/Week_End');
  }
  if (headers.indexOf('Revenue_NGR') === -1 && headers.indexOf('NGR') === -1) {
    missing.push('Revenue_NGR or NGR');
  }
  return missing;
}

function getMissingPerformancePayloadFields(data, headers) {
  const source = data || {};
  const missing = [];
  const sheetHeaders = headers || [];
  const periodType = getPerformancePeriodType(source);
  const hasMonthOrDate = sheetHeaders.indexOf('Month') === -1 && sheetHeaders.indexOf('Date') === -1 ? true : Boolean(safeString(source.Month) || safeString(source.Date));
  const hasWeekRange = sheetHeaders.indexOf('Week_Start') === -1 && sheetHeaders.indexOf('Week_End') === -1 ? true : Boolean(safeString(source.Week_Start) && safeString(source.Week_End));
  const hasRevenue = sheetHeaders.indexOf('Revenue_NGR') === -1 && sheetHeaders.indexOf('NGR') === -1 ? true : Boolean(safeString(source.Revenue_NGR) || safeString(source.NGR));

  if (periodType === 'Weekly' && !hasWeekRange) {
    missing.push('Week_Start and Week_End');
  }

  if (periodType !== 'Weekly' && !hasMonthOrDate) {
    missing.push(sheetHeaders.indexOf('Month') !== -1 ? 'Month' : 'Date');
  }

  PERFORMANCE_REQUIRED_HEADERS.forEach(function (field) {
    if (sheetHeaders.indexOf(field) !== -1 && !safeString(source[field])) {
      missing.push(field);
    }
  });

  if (!hasRevenue) {
    missing.push(sheetHeaders.indexOf('NGR') !== -1 ? 'NGR' : 'Revenue_NGR');
  }

  return missing;
}

function normalizePerformanceRows(rows) {
  return (rows || []).map(function (row) {
    const item = copyRow(row);
    item.Period_Type = getPerformancePeriodType(item);
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
    item.NGR = firstDefinedPerformance(item.NGR, item.Revenue_NGR, item.Revenue);
    item.Remarks = firstDefinedPerformance(item.Remarks, item.Notes);
    item.Week_Start = normalizeDateValue(item.Week_Start) || safeString(item.Week_Start);
    item.Week_End = normalizeDateValue(item.Week_End) || safeString(item.Week_End);
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
    turnover: sumPerformanceNumber(source, ['Turnover']),
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

function calculatePerformanceGrowth(data, source) {
  const current = copyRow(data || {});
  const currentNgr = parsePerformanceNumber(getFirstValue(current, ['NGR', 'Revenue_NGR', 'Revenue']));
  const currentTime = getPerformancePeriodTime(current);
  const affiliateId = safeString(current.Affiliate_ID);
  const brand = safeString(current.Brand).toLowerCase();
  var previous = null;
  var previousTime = 0;
  var previousNgr;

  if (isNaN(currentNgr) || !affiliateId || !brand || !currentTime) {
    return 0;
  }

  normalizePerformanceRows(safeReadSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE)).forEach(function (row) {
    const rowTime = getPerformancePeriodTime(row);
    const sameAffiliate = safeString(row.Affiliate_ID) === affiliateId;
    const sameBrand = safeString(row.Brand).toLowerCase() === brand;

    if (!sameAffiliate || !sameBrand || !rowTime || rowTime >= currentTime) {
      return;
    }

    if (source && performanceRowsMatch(source, row)) {
      return;
    }

    if (!previous || rowTime > previousTime) {
      previous = row;
      previousTime = rowTime;
    }
  });

  previousNgr = previous ? parsePerformanceNumber(getFirstValue(previous, ['NGR', 'Revenue_NGR', 'Revenue'])) : NaN;
  if (isNaN(previousNgr) || previousNgr === 0) {
    return 0;
  }

  return roundNumber(((currentNgr - previousNgr) / previousNgr) * 100, 2);
}

function getPerformancePeriodTime(row) {
  const periodType = getPerformancePeriodType(row || {});
  const value = periodType === 'Weekly' ? getFirstValue(row, ['Week_Start', 'Week Start']) : getFirstValue(row, ['Month', 'Date', 'Performance_Month', 'Period']);
  const normalized = safeString(value) ? (periodType === 'Weekly' ? normalizeDateValue(value) : derivePerformanceMonth(value)) : '';
  var date;

  if (!safeString(normalized)) {
    return 0;
  }

  date = new Date(periodType === 'Weekly' ? normalized : normalized + '-01');
  return isNaN(date.getTime()) ? 0 : date.getTime();
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
