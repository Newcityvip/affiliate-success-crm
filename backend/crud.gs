/**
 * Sprint 4B/4C write foundation.
 * All writes are header-aware, role-checked, and avoid schema changes.
 */

const ENTITY_CONFIG = Object.freeze({
  affiliate: {
    sheet: SHEET_NAMES.AFFILIATES,
    idKey: 'Affiliate_ID',
    prefix: 'AFF',
    width: 4,
    type: 'Affiliate',
    required: ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Language', 'Assigned_Staff', 'Status', 'Health_Status', 'Priority', 'Active']
  },
  task: {
    sheet: SHEET_NAMES.TASK_LOG,
    idKey: 'Task_ID',
    prefix: 'TSK',
    width: 4,
    type: 'Task',
    required: ['Affiliate_ID', 'Title', 'Task', 'Assigned_Staff', 'Due_Date', 'Priority', 'Status']
  },
  issue: {
    sheet: SHEET_NAMES.ISSUE_LOG,
    idKey: 'Issue_ID',
    prefix: 'ISS',
    width: 4,
    type: 'Issue',
    required: ['Affiliate_ID', 'Issue', 'Brand', 'Assigned_Staff', 'Priority', 'Status']
  },
  interaction: {
    sheet: SHEET_NAMES.INTERACTION_LOG,
    idKey: 'Interaction_ID',
    prefix: 'INT',
    width: 4,
    type: 'Interaction',
    required: ['Affiliate_ID', 'Affiliate_Name', 'Brand', 'Assigned_Staff', 'Interaction_Type', 'Notes', 'Status']
  },
  performance: {
    sheet: SHEET_NAMES.MONTHLY_PERFORMANCE,
    idKey: 'Performance_ID',
    prefix: 'PERF',
    width: 4,
    type: 'Performance',
    required: ['Date', 'Brand', 'Affiliate_ID', 'FTD', 'Active_Players', 'Deposit_Amount', 'Revenue_NGR']
  },
  brand: {
    sheet: SHEET_NAMES.BRAND_LIST,
    idKey: 'Brand_ID',
    prefix: 'BRD',
    width: 4,
    type: 'Brand',
    required: ['Brand_Name', 'Market', 'Active']
  },
  staff: {
    sheet: SHEET_NAMES.STAFF_LIST,
    idKey: 'Staff_ID',
    prefix: 'ST',
    width: 3,
    type: 'Staff',
    required: ['Login_ID', 'Staff_Name', 'Role', 'Team', 'Email', 'Active', 'Permission_Level']
  }
});

function createAffiliate(payload, user) {
  requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
  return createEntity('affiliate', payload, user);
}

function updateAffiliate(payload, user) {
  requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
  return updateEntity('affiliate', payload, user);
}

function createTask(payload, user) {
  requireScopedWrite(payload, user);
  return createEntity('task', payload, user);
}

function updateTask(payload, user) {
  return updateEntity('task', payload, user);
}

function completeTask(payload, user) {
  return updateTask(setStatusPayload(payload, 'Completed'), user);
}

function reopenTask(payload, user) {
  return updateTask(setStatusPayload(payload, 'Open'), user);
}

function createIssue(payload, user) {
  requireScopedWrite(payload, user);
  return createEntity('issue', payload, user);
}

function updateIssue(payload, user) {
  return updateEntity('issue', payload, user);
}

function resolveIssue(payload, user) {
  return updateIssue(setStatusPayload(payload, 'Resolved'), user);
}

function closeIssue(payload, user) {
  return updateIssue(setStatusPayload(payload, 'Closed'), user);
}

function reopenIssue(payload, user) {
  return updateIssue(setStatusPayload(payload, 'Open'), user);
}

function createInteraction(payload, user) {
  requireScopedWrite(payload, user);
  return createEntity('interaction', payload, user);
}

function createBrand(payload, user) {
  requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
  return createEntity('brand', payload, user);
}

function updateBrand(payload, user) {
  requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
  return updateEntity('brand', payload, user);
}

function createStaff(payload, user) {
  requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
  return createEntity('staff', payload, user);
}

function updateStaff(payload, user) {
  requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
  return updateEntity('staff', payload, user);
}

function createEntity(entityKey, payload, user) {
  const config = ENTITY_CONFIG[entityKey];
  const headers = getSheetHeadersSafe(config.sheet);
  const data = buildEntityData(config, payload, headers, user, true);

  if (!headers.length) {
    throwCodedError('MISSING_SHEET', config.sheet + ' is missing or has no headers.');
  }

  validateEntityPayload(config, data, headers, true);

  appendSheetObject(config.sheet, data);
  logActivity(user, 'create', config.type, data[config.idKey], buildActivitySummary(config.type, data, 'created'));

  return {
    item: data
  };
}

function updateEntity(entityKey, payload, user) {
  const config = ENTITY_CONFIG[entityKey];
  const headers = getSheetHeadersSafe(config.sheet);
  const source = payload || {};
  const entityId = safeString(source[config.idKey]);
  var data;
  var updated;

  if (!headers.length) {
    throwCodedError('MISSING_SHEET', config.sheet + ' is missing or has no headers.');
  }

  if (!entityId) {
    throwCodedError('VALIDATION_ERROR', config.idKey + ' is required.');
  }

  requireExistingEntityWrite(config, entityId, user);

  data = buildEntityData(config, payload, headers, user, false);
  data[config.idKey] = entityId;
  validateEntityPayload(config, data, headers, false);
  updated = updateSheetObjectByKey(config.sheet, config.idKey, entityId, data);
  logActivity(user, 'update', config.type, entityId, buildActivitySummary(config.type, updated, 'updated'));

  return {
    item: updated
  };
}

function requireExistingEntityWrite(config, entityId, user) {
  const existing = getEntityById(config, entityId);

  if (isAdminUser(user) || userCanViewAll(user)) {
    return true;
  }

  if (isAssignedToUser(existing, user) || isAffiliateAssignedToUser(safeString(existing.Affiliate_ID), user)) {
    return true;
  }

  throwCodedError('FORBIDDEN', 'You can only update records assigned to your workspace.');
}

function getEntityById(config, entityId) {
  const matches = safeReadSheetObjects(config.sheet).filter(function (row) {
    return safeString(row[config.idKey]) === safeString(entityId);
  });

  if (!matches.length) {
    throwCodedError('NOT_FOUND', config.type + ' was not found.');
  }

  return matches[0];
}

function buildEntityData(config, payload, headers, user, isCreate) {
  const source = payload || {};
  const data = {};

  headers.forEach(function (header) {
    if (!header) {
      return;
    }

    if (source[header] !== undefined) {
      data[header] = source[header];
    }
  });

  if (isCreate && headers.indexOf(config.idKey) !== -1 && !safeString(data[config.idKey])) {
    data[config.idKey] = nextSheetId(config.sheet, config.idKey, config.prefix, config.width);
  }

  setIfHeaderExists(data, headers, ['Created_At', 'Created At', 'Created_Date', 'Created Date', 'Timestamp'], getTimestamp(), isCreate);
  setIfHeaderExists(data, headers, ['Updated_At', 'Updated At', 'Updated_Date', 'Updated Date', 'Last_Updated'], getTimestamp(), true);

  if (!isAdminUser(user)) {
    setStaffOwnership(data, headers, user);
  }

  return data;
}

function setStaffOwnership(data, headers, user) {
  const staffValue = getUserDisplayName(user);
  const staffId = safeString(user && user.staffId);
  const loginId = safeString(user && user.loginId);

  setIfHeaderExists(data, headers, ['Assigned_Staff', 'Assigned Staff', 'Staff', 'Owner'], staffValue, true);
  setIfHeaderExists(data, headers, ['Staff_ID', 'Staff ID'], staffId, false);
  setIfHeaderExists(data, headers, ['Login_ID', 'Login ID'], loginId, false);
}

function setIfHeaderExists(data, headers, candidates, value, overwrite) {
  candidates.some(function (header) {
    if (headers.indexOf(header) === -1) {
      return false;
    }

    if (overwrite || !safeString(data[header])) {
      data[header] = value;
    }

    return true;
  });
}

function setStatusPayload(payload, status) {
  const data = copyRow(payload || {});
  data.Status = status;
  data.Task_Status = status;
  data.Issue_Status = status;
  return data;
}

function requireScopedWrite(payload, user) {
  if (isAdminUser(user) || userCanViewAll(user)) {
    return true;
  }

  if (isPayloadAssignedToUser(payload, user)) {
    return true;
  }

  if (isAffiliateAssignedToUser(safeString(payload && payload.Affiliate_ID), user)) {
    return true;
  }

  throwCodedError('FORBIDDEN', 'You can only write records assigned to your workspace.');
}

function isPayloadAssignedToUser(payload, user) {
  return isAssignedToUser(payload || {}, user);
}

function isAffiliateAssignedToUser(affiliateId, user) {
  if (!affiliateId) {
    return false;
  }

  return safeReadSheetObjects(SHEET_NAMES.AFFILIATES).some(function (affiliate) {
    return safeString(affiliate.Affiliate_ID) === affiliateId && isAssignedToUser(affiliate, user);
  });
}

function nextSheetId(sheetName, idKey, prefix, width) {
  const rows = safeReadSheetObjects(sheetName);
  var max = 0;

  rows.forEach(function (row) {
    const value = safeString(row[idKey]);
    const match = value.match(/(\d+)$/);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  });

  return prefix + padNumber(max + 1, width || 4);
}

function padNumber(value, width) {
  var output = String(value);
  while (output.length < width) {
    output = '0' + output;
  }
  return output;
}

function logActivity(user, action, entityType, entityId, summary) {
  const headers = getSheetHeadersSafe(SHEET_NAMES.ACTIVITY_LOG);
  const data = {};

  if (!headers.length) {
    return;
  }

  setIfHeaderExists(data, headers, ['Activity_ID'], nextSheetId(SHEET_NAMES.ACTIVITY_LOG, 'Activity_ID', 'ACT', 4), true);
  setIfHeaderExists(data, headers, ['Timestamp', 'Activity_Date', 'Created_Date'], getTimestamp(), true);
  setIfHeaderExists(data, headers, ['Actor'], getUserDisplayName(user), true);
  setIfHeaderExists(data, headers, ['Actor_ID', 'Staff_ID'], safeString(user && user.staffId), true);
  setIfHeaderExists(data, headers, ['Role'], normalizeRole(user && user.role), true);
  setIfHeaderExists(data, headers, ['Action'], action, true);
  setIfHeaderExists(data, headers, ['Entity_Type'], entityType, true);
  setIfHeaderExists(data, headers, ['Entity_ID'], entityId, true);
  setIfHeaderExists(data, headers, ['Summary'], summary, true);

  try {
    appendSheetObject(SHEET_NAMES.ACTIVITY_LOG, data);
  } catch (error) {
    // Activity logging must never block the primary write.
  }
}

function buildActivitySummary(entityType, data, verb) {
  const name = safeString(getFirstValue(data, [
    'Affiliate_Name',
    'Staff_Name',
    'Brand',
    'Brand_Name',
    'Title',
    'Task',
    'Issue',
    'Summary',
    'Notes'
  ]));

  return entityType + ' ' + verb + (name ? ': ' + name : '.');
}

function validateEntityPayload(config, data, headers, isCreate) {
  const missing = [];

  if (!isCreate) {
    return true;
  }

  (config.required || []).forEach(function (field) {
    if (headers.indexOf(field) !== -1 && !safeString(data[field])) {
      missing.push(field);
    }
  });

  if (missing.length) {
    throwCodedError('VALIDATION_ERROR', 'Missing required fields: ' + missing.join(', '));
  }

  return true;
}

function importCsvPreview(payload, user) {
  const entityKey = normalizeImportEntity(payload && (payload.entity || payload.type || payload.module));
  const config = getImportConfig(entityKey);
  const parsed = parseCsvText(safeString(payload && payload.csv));
  const headers = getSheetHeadersSafe(config.sheet);
  const required = config.required || [];
  const previewRows = [];
  const errors = [];
  const missingHeaders = required.filter(function (field) {
    return parsed.headers.indexOf(field) === -1;
  });

  requireImportPermission(entityKey, user);

  parsed.rows.forEach(function (row, index) {
    const item = {};
    const rowErrors = [];

    parsed.headers.forEach(function (header, columnIndex) {
      if (headers.indexOf(header) !== -1 || required.indexOf(header) !== -1) {
        item[header] = row[columnIndex] || '';
      }
    });

    missingHeaders.forEach(function (field) {
      rowErrors.push('Missing required header: ' + field);
    });

    required.forEach(function (field) {
      if (!safeString(item[field])) {
        rowErrors.push(field + ' is required');
      }
    });

    previewRows.push({
      rowNumber: index + 2,
      valid: rowErrors.length === 0,
      errors: rowErrors,
      item: item
    });

    if (rowErrors.length) {
      errors.push({
        rowNumber: index + 2,
        errors: rowErrors
      });
    }
  });

  return {
    entity: entityKey,
    headers: parsed.headers,
    requiredHeaders: required,
    missingHeaders: missingHeaders,
    rows: previewRows,
    validRows: previewRows.filter(function (row) { return row.valid; }).length,
    invalidRows: errors.length,
    errors: errors
  };
}

function importCsvCommit(payload, user) {
  const preview = importCsvPreview(payload, user);
  const committed = [];
  const entityKey = preview.entity;

  preview.rows.filter(function (row) {
    return row.valid;
  }).forEach(function (row) {
    if (entityKey === 'followup') {
      committed.push(createFollowup(row.item, user).item);
    } else if (entityKey === 'performance') {
      committed.push(createPerformance(row.item, user).item);
    } else {
      committed.push(createEntity(entityKey, row.item, user).item);
    }
  });

  return {
    entity: entityKey,
    committed: committed.length,
    skipped: preview.invalidRows,
    items: committed
  };
}

function normalizeImportEntity(value) {
  const key = safeString(value).toLowerCase().replace(/[-_\s]/g, '');
  const map = {
    affiliates: 'affiliate',
    affiliate: 'affiliate',
    followups: 'followup',
    followup: 'followup',
    tasks: 'task',
    task: 'task',
    issues: 'issue',
    issue: 'issue',
    interactions: 'interaction',
    interaction: 'interaction',
    performance: 'performance',
    performances: 'performance',
    monthlyperformance: 'performance',
    staff: 'staff',
    brands: 'brand',
    brand: 'brand'
  };
  const normalized = map[key];

  if (normalized === 'followup') {
    return 'followup';
  }

  if (!normalized || !ENTITY_CONFIG[normalized]) {
    throwCodedError('VALIDATION_ERROR', 'Unsupported CSV import module.');
  }

  return normalized;
}

function getImportConfig(entityKey) {
  if (entityKey === 'followup') {
    return {
      sheet: SHEET_NAMES.FOLLOWUP_QUEUE,
      idKey: 'Queue_ID',
      prefix: 'Q',
      width: 4,
      type: 'Follow-up',
      required: ['Affiliate_ID', 'Assigned_Staff', 'Followup_Date', 'Priority', 'Status', 'Notes']
    };
  }

  if (entityKey === 'affiliate') {
    return {
      sheet: ENTITY_CONFIG.affiliate.sheet,
      idKey: ENTITY_CONFIG.affiliate.idKey,
      prefix: ENTITY_CONFIG.affiliate.prefix,
      width: ENTITY_CONFIG.affiliate.width,
      type: ENTITY_CONFIG.affiliate.type,
      required: ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Language', 'Telegram', 'WhatsApp', 'Email', 'Assigned_Staff', 'Status', 'Health_Status', 'Priority', 'Segment', 'Affiliate_Type', 'Market_Channel', 'Next_Followup_Date', 'Active']
    };
  }

  if (entityKey === 'performance') {
    return {
      sheet: ENTITY_CONFIG.performance.sheet,
      idKey: ENTITY_CONFIG.performance.idKey,
      prefix: ENTITY_CONFIG.performance.prefix,
      width: ENTITY_CONFIG.performance.width,
      type: ENTITY_CONFIG.performance.type,
      required: PERFORMANCE_REQUIRED_HEADERS
    };
  }

  if (entityKey === 'brand') {
    return {
      sheet: ENTITY_CONFIG.brand.sheet,
      idKey: ENTITY_CONFIG.brand.idKey,
      prefix: ENTITY_CONFIG.brand.prefix,
      width: ENTITY_CONFIG.brand.width,
      type: ENTITY_CONFIG.brand.type,
      required: ['Brand_ID', 'Brand_Name', 'Market', 'Active']
    };
  }

  if (entityKey === 'staff') {
    return {
      sheet: ENTITY_CONFIG.staff.sheet,
      idKey: ENTITY_CONFIG.staff.idKey,
      prefix: ENTITY_CONFIG.staff.prefix,
      width: ENTITY_CONFIG.staff.width,
      type: ENTITY_CONFIG.staff.type,
      required: ['Staff_ID', 'Login_ID', 'Staff_Name', 'Role', 'Team', 'Email', 'Active', 'Permission_Level']
    };
  }

  return ENTITY_CONFIG[entityKey];
}

function requireImportPermission(entityKey, user) {
  if (['affiliate', 'followup', 'interaction', 'task', 'issue', 'brand', 'staff', 'performance'].indexOf(entityKey) !== -1) {
    requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
  }

  return true;
}

function parseCsvText(csv) {
  const rows = [];
  var row = [];
  var cell = '';
  var inQuotes = false;
  var index;
  var char;
  var next;

  for (index = 0; index < csv.length; index += 1) {
    char = csv.charAt(index);
    next = csv.charAt(index + 1);

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell);
      if (row.some(function (value) { return safeString(value) !== ''; })) {
        rows.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some(function (value) { return safeString(value) !== ''; })) {
    rows.push(row);
  }

  if (!rows.length) {
    throwCodedError('VALIDATION_ERROR', 'CSV content is empty.');
  }

  return {
    headers: rows[0].map(function (header) { return safeString(header); }),
    rows: rows.slice(1)
  };
}
