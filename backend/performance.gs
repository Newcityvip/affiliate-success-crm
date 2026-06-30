const PERFORMANCE_REQUIRED_HEADERS = Object.freeze(['Date', 'Brand', 'Affiliate_ID', 'FTD', 'Active_Players', 'Deposit_Amount', 'Revenue_NGR']);
const PERFORMANCE_OPTIONAL_HEADERS = Object.freeze(['Performance_ID', 'Month', 'Affiliate_Name', 'Assigned_Staff', 'Commission', 'Conversion_Rate', 'Status', 'Notes', 'Updated_By', 'Updated_At']);

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
  const id = safeString(payload && payload.Performance_ID);
  if (!id) {
    throwCodedError('VALIDATION_ERROR', 'Performance ID is required.');
  }

  requireExistingPerformanceWrite(id, user);
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
    if (source[header] !== undefined) {
      data[header] = source[header];
    }
  });

  autofillPerformanceFromAffiliate(data, source, user, headers);
  setIfHeaderExists(data, headers, ['Performance_ID'], safeString(source.Performance_ID) || nextSheetId(SHEET_NAMES.MONTHLY_PERFORMANCE, 'Performance_ID', 'PERF', 4), isCreate);
  setIfHeaderExists(data, headers, ['Month'], derivePerformanceMonth(data.Date || source.Date || source.Month), true);
  setIfHeaderExists(data, headers, ['Conversion_Rate'], calculateConversionRate(data.FTD || source.FTD, data.Active_Players || source.Active_Players), true);
  setIfHeaderExists(data, headers, ['Updated_By'], getUserDisplayName(user), true);
  setIfHeaderExists(data, headers, ['Updated_At'], getTimestamp(), true);

  validatePerformancePayload(data, headers);

  if (isCreate) {
    appendSheetObject(SHEET_NAMES.MONTHLY_PERFORMANCE, data);
    saved = data;
  } else {
    saved = updateSheetObjectByKey(SHEET_NAMES.MONTHLY_PERFORMANCE, 'Performance_ID', safeString(source.Performance_ID), data);
  }

  logActivity(user, isCreate ? 'create' : 'update', 'Performance', safeString(saved.Performance_ID), buildActivitySummary('Performance', saved, isCreate ? 'created' : 'updated'));
  return saved;
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

function requireExistingPerformanceWrite(performanceId, user) {
  const row = safeReadSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE).filter(function (item) {
    return safeString(item.Performance_ID) === safeString(performanceId);
  })[0];

  if (!row) {
    throwCodedError('NOT_FOUND', 'Performance row was not found.');
  }

  requirePerformanceWrite(row, user);
}

function getAffiliateForPerformance(affiliateId) {
  return safeReadSheetObjects(SHEET_NAMES.AFFILIATES).filter(function (affiliate) {
    return safeString(affiliate.Affiliate_ID) === safeString(affiliateId);
  })[0] || {};
}

function validatePerformancePayload(data, headers) {
  const missing = [];
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
    requiredHeaders: PERFORMANCE_REQUIRED_HEADERS,
    optionalHeaders: PERFORMANCE_OPTIONAL_HEADERS,
    missingRequiredHeaders: PERFORMANCE_REQUIRED_HEADERS.filter(function (header) { return headers.indexOf(header) === -1; }),
    missingOptionalHeaders: PERFORMANCE_OPTIONAL_HEADERS.filter(function (header) { return headers.indexOf(header) === -1; }),
    supportedHeaders: expected.filter(function (header) { return headers.indexOf(header) !== -1; })
  };
}

function normalizePerformanceRows(rows) {
  return (rows || []).map(function (row) {
    const item = copyRow(row);
    if (!safeString(item.Month)) {
      item.Month = derivePerformanceMonth(item.Date || item.Performance_Month || item.Period);
    }
    if (!safeString(item.Conversion_Rate)) {
      item.Conversion_Rate = calculateConversionRate(item.FTD, item.Active_Players);
    }
    return item;
  });
}

function buildPerformanceSummary(rows) {
  const monthKey = currentMonthKey();
  const thisMonth = (rows || []).filter(function (row) {
    return safeString(row.Month || derivePerformanceMonth(row.Date)) === monthKey;
  });
  const source = thisMonth.length ? thisMonth : (rows || []);
  const activePlayers = sumPerformanceNumber(source, ['Active_Players', 'Active Players']);
  const ftd = sumPerformanceNumber(source, ['FTD', 'FTDs']);
  return {
    month: monthKey,
    totalFtd: ftd,
    activePlayers: activePlayers,
    depositAmount: sumPerformanceNumber(source, ['Deposit_Amount', 'Deposit Amount']),
    revenueNgr: sumPerformanceNumber(source, ['Revenue_NGR', 'Revenue', 'NGR', 'Net_Gaming_Revenue']),
    averageConversion: activePlayers ? roundNumber(ftd / activePlayers, 4) : ''
  };
}

function sumPerformanceNumber(rows, keys) {
  return (rows || []).reduce(function (sum, row) {
    const value = Number(getFirstValue(row, keys) || 0);
    return sum + (isNaN(value) ? 0 : value);
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
