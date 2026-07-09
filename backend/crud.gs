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
    required: ['Affiliate_ID', 'Issue_Details', 'Priority', 'Status']
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
    required: ['Period_Type', 'Brand', 'Affiliate_ID', 'FTD', 'Active_Players', 'Deposit_Amount', 'Turnover', 'NGR']
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
  if (!isAdminUser(user)) {
    return updateStaffAffiliateDetails(payload, user);
  }

  return updateEntity('affiliate', payload, user);
}

function updateStaffAffiliateDetails(payload, user) {
  const config = ENTITY_CONFIG.affiliate;
  const headers = getSheetHeadersSafe(config.sheet);
  const source = payload || {};
  const affiliateId = safeString(source[config.idKey]);
  const allowedFields = ['Telegram', 'WhatsApp', 'Email', 'Country', 'Language', 'Notes', 'Next_Followup_Date', 'Next_Action'];
  const data = {};
  var updated;

  if (!headers.length) {
    throwCodedError('MISSING_SHEET', config.sheet + ' is missing or has no headers.');
  }

  if (!affiliateId) {
    throwCodedError('VALIDATION_ERROR', config.idKey + ' is required.');
  }

  if (!isAffiliateAssignedToUser(affiliateId, user)) {
    throwCodedError('FORBIDDEN', 'You can only update affiliates assigned to you.');
  }

  allowedFields.forEach(function (field) {
    if (headers.indexOf(field) !== -1 && source[field] !== undefined) {
      data[field] = source[field];
    }
  });

  setIfHeaderExists(data, headers, ['Updated_At', 'Updated At', 'Updated_Date', 'Updated Date', 'Last_Updated'], getTimestamp(), true);

  if (Object.keys(data).length === 0) {
    throwCodedError('VALIDATION_ERROR', 'No editable affiliate details were provided.');
  }

  updated = updateSheetObjectByKey(config.sheet, config.idKey, affiliateId, data);
  logActivity(user, 'update', config.type, affiliateId, 'Affiliate contact details updated.');

  return {
    item: updated
  };
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
  return createIssueRecord(payload, user);
}

function updateIssue(payload, user) {
  return updateIssueRecord(payload, user);
}

function resolveIssue(payload, user) {
  return updateIssue(setStatusPayload(payload, 'Resolved'), user);
}

function closeIssue(payload, user) {
  return updateIssue(setStatusPayload(payload, 'Resolved'), user);
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

function createIssueRecord(payload, user) {
  const config = ENTITY_CONFIG.issue;
  const source = payload || {};
  const headers = ensureIssueLogHeaders();
  const issueId = headers.indexOf(config.idKey) !== -1 ? nextSheetId(config.sheet, config.idKey, config.prefix, config.width) : '';
  const affiliateId = safeString(source.Affiliate_ID);
  const affiliate = findAffiliateById(affiliateId);
  const staffValue = getUserDisplayName(user);
  const assignedTo = isAdminUser(user) || userCanViewAll(user)
    ? safeString(getFirstValue(source, ['Assigned_To', 'Assigned To', 'Assigned_Staff', 'Assigned Staff'])) || staffValue
    : staffValue;
  const issueDetails = safeString(getFirstValue(source, ['Issue_Details', 'Issue Details', 'Issue', 'Notes', 'Resolution']));
  const data = {};
  var telegramAlert;

  if (!affiliateId) {
    throwCodedError('VALIDATION_ERROR', 'Affiliate_ID is required.');
  }

  if (!issueDetails) {
    throwCodedError('VALIDATION_ERROR', 'Issue details are required.');
  }

  setIfHeaderExists(data, headers, ['Issue_ID'], issueId, true);
  setIfHeaderExists(data, headers, ['Date'], getIssueTimestamp(), true);
  setIfHeaderExists(data, headers, ['Affiliate_ID'], affiliateId, true);
  setIfHeaderExists(data, headers, ['Category'], safeString(source.Category) || 'General', true);
  setIfHeaderExists(data, headers, ['Issue_Details'], issueDetails, true);
  setIfHeaderExists(data, headers, ['Priority'], safeString(source.Priority) || 'Medium', true);
  setIfHeaderExists(data, headers, ['Assigned_To'], assignedTo, true);
  setIfHeaderExists(data, headers, ['Status'], 'Open', true);
  setIfHeaderExists(data, headers, ['Resolved_Date'], '', true);
  setIfHeaderExists(data, headers, ['Resolution'], '', true);
  setIfHeaderExists(data, headers, ['Days_Open'], '0', true);
  setIfHeaderExists(data, headers, ['Reported_By'], staffValue, true);

  appendSheetObject(config.sheet, data);
  logActivity(user, 'create', config.type, issueId, 'Issue created: ' + issueDetails);
  telegramAlert = sendIssueTelegramAlert(data, affiliate);

  return {
    item: data,
    telegramAlert: summarizeTelegramAlert(telegramAlert)
  };
}

function updateIssueRecord(payload, user) {
  const config = ENTITY_CONFIG.issue;
  const source = payload || {};
  const headers = ensureIssueLogHeaders();
  const issueId = safeString(source.Issue_ID);
  const existing = issueId ? getEntityById(config, issueId) : {};
  const data = {};
  const status = safeString(source.Status || source.Issue_Status);

  if (!issueId) {
    throwCodedError('VALIDATION_ERROR', 'Issue_ID is required.');
  }

  requireExistingEntityWrite(config, issueId, user);

  setIfHeaderExists(data, headers, ['Category'], source.Category, false);
  setIfHeaderExists(data, headers, ['Issue_Details'], getFirstValue(source, ['Issue_Details', 'Issue Details', 'Issue']), false);
  setIfHeaderExists(data, headers, ['Priority'], source.Priority, false);
  setIfHeaderExists(data, headers, ['Assigned_To'], isAdminUser(user) || userCanViewAll(user) ? getFirstValue(source, ['Assigned_To', 'Assigned To', 'Assigned_Staff', 'Assigned Staff']) : getAssignedStaff(existing), false);
  setIfHeaderExists(data, headers, ['Status'], status, false);
  setIfHeaderExists(data, headers, ['Resolution'], getFirstValue(source, ['Resolution', 'Notes']), false);

  if (isResolvedIssueStatus(status)) {
    setIfHeaderExists(data, headers, ['Resolved_Date'], getIssueTimestamp(), true);
    setIfHeaderExists(data, headers, ['Days_Open'], calculateIssueDaysOpen(existing), true);
  } else if (status) {
    setIfHeaderExists(data, headers, ['Resolved_Date'], '', true);
  }

  data[config.idKey] = issueId;

  const updated = updateSheetObjectByKey(config.sheet, config.idKey, issueId, data);
  logActivity(user, 'update', config.type, issueId, 'Issue updated.');

  return {
    item: updated
  };
}

function ensureIssueLogHeaders() {
  return ensureSheetHeaders(SHEET_NAMES.ISSUE_LOG, ['Issue_Details', 'Reported_By']).headers;
}

function findAffiliateById(affiliateId) {
  const id = safeString(affiliateId);
  if (!id) {
    return {};
  }

  return safeReadSheetObjects(SHEET_NAMES.AFFILIATES).filter(function (affiliate) {
    return safeString(affiliate.Affiliate_ID) === id;
  })[0] || {};
}

function getIssueTimestamp() {
  const date = new Date();
  const tz = typeof Session !== 'undefined' && Session.getScriptTimeZone
    ? Session.getScriptTimeZone() || 'Asia/Dhaka'
    : 'Asia/Dhaka';

  if (typeof Utilities !== 'undefined') {
    return Utilities.formatDate(date, tz, 'yyyy-MM-dd HH:mm:ss');
  }

  return date.getFullYear() + '-' + padNumber(date.getMonth() + 1, 2) + '-' + padNumber(date.getDate(), 2) + ' ' + padNumber(date.getHours(), 2) + ':' + padNumber(date.getMinutes(), 2) + ':' + padNumber(date.getSeconds(), 2);
}

function calculateIssueDaysOpen(issue) {
  const opened = parseIssueDateValue(getFirstValue(issue || {}, ['Date', 'Created_Date', 'Issue_Date']));
  const today = new Date();

  if (!opened) {
    return 0;
  }

  return Math.max(0, Math.floor((today.getTime() - opened.getTime()) / 86400000));
}

function parseIssueDateValue(value) {
  const text = safeString(value);
  var match;
  var parsed;

  if (!text) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    return new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  }

  parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function isResolvedIssueStatus(status) {
  return ['resolved', 'closed', 'complete', 'completed'].indexOf(safeString(status).toLowerCase()) !== -1;
}

function sendIssueTelegramAlert(issue, affiliate) {
  const token = getDashboardConfigValue('CRM_Issue_TG_Bot_Token');
  const chatId = getDashboardConfigValue('CRM_Issue_TG_Chat_ID');
  const text = [
    '🚨 New CRM Issue Reported',
    '',
    'Issue ID: ' + safeString(issue.Issue_ID),
    'Affiliate: ' + safeString(issue.Affiliate_ID),
    'Brand: ' + (safeString(getFirstValue(affiliate || {}, ['Brand', 'Brand_Name'])) || 'N/A'),
    'Reported by: ' + safeString(issue.Reported_By),
    'Assigned to: ' + safeString(issue.Assigned_To),
    'Priority: ' + safeString(issue.Priority),
    'Status: ' + safeString(issue.Status),
    '',
    'Issue:',
    safeString(issue.Issue_Details)
  ].join('\n');

  if (!token || !chatId || typeof UrlFetchApp === 'undefined') {
    return false;
  }

  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      muteHttpExceptions: true,
      payload: {
        chat_id: chatId,
        text: text
      }
    });
    return true;
  } catch (error) {
    return false;
  }
}

function getDashboardConfigValue(key) {
  const target = safeString(key);
  const rows = safeReadSheetObjects(SHEET_NAMES.DASHBOARD_CONFIG);
  var value = '';

  rows.some(function (row) {
    const rowKey = safeString(getFirstValue(row, ['Key', 'Config_Key', 'Setting', 'Name']));
    if (rowKey === target) {
      value = safeString(getFirstValue(row, ['Value', 'Config_Value', 'Setting_Value']));
      return true;
    }
    if (row[target] !== undefined) {
      value = safeString(row[target]);
      return true;
    }
    return false;
  });

  return value;
}

function sendIssueTelegramAlert(issue, affiliate) {
  const token = getDashboardConfigValue('CRM_Issue_TG_Bot_Token');
  const chatId = getDashboardConfigValue('CRM_Issue_TG_Chat_ID');
  const text = buildIssueTelegramMessage(issue, affiliate);
  var response;
  var statusCode = 0;
  var body = '';
  var parsed;

  if (!token || !chatId) {
    return {
      attempted: false,
      ok: false,
      statusCode: 0,
      error: 'Telegram bot token or chat ID is missing.'
    };
  }

  if (typeof UrlFetchApp === 'undefined') {
    return {
      attempted: false,
      ok: false,
      statusCode: 0,
      error: 'UrlFetchApp is unavailable in this environment.'
    };
  }

  try {
    response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      muteHttpExceptions: true,
      payload: {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: 'true'
      }
    });
    statusCode = response.getResponseCode();
    body = response.getContentText();
    parsed = parseTelegramResponseBody(body);

    return {
      attempted: true,
      ok: statusCode >= 200 && statusCode < 300 && (!parsed || parsed.ok !== false),
      statusCode: statusCode,
      error: getTelegramError(parsed, body),
      responseBody: body
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      statusCode: statusCode,
      error: error && error.message ? error.message : String(error)
    };
  }
}

function buildIssueTelegramMessage(issue, affiliate) {
  return [
    '\uD83D\uDEA8 <b>New CRM Issue Reported</b>',
    '',
    '<b>Issue ID:</b> ' + escapeTelegramHtml(issue.Issue_ID),
    '<b>Affiliate:</b> ' + escapeTelegramHtml(issue.Affiliate_ID),
    '<b>Brand:</b> ' + escapeTelegramHtml(safeString(getFirstValue(affiliate || {}, ['Brand', 'Brand_Name'])) || 'N/A'),
    '<b>Reported by:</b> ' + escapeTelegramHtml(issue.Reported_By),
    '<b>Assigned to:</b> ' + escapeTelegramHtml(issue.Assigned_To),
    '<b>Priority:</b> ' + escapeTelegramHtml(issue.Priority),
    '<b>Status:</b> ' + escapeTelegramHtml(issue.Status),
    '',
    '<b>Issue:</b>',
    escapeTelegramHtml(issue.Issue_Details)
  ].join('\n');
}

function escapeTelegramHtml(value) {
  return safeString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseTelegramResponseBody(body) {
  try {
    return JSON.parse(safeString(body));
  } catch (error) {
    return null;
  }
}

function getTelegramError(parsed, body) {
  if (parsed && parsed.ok === false) {
    return safeString(parsed.description) || 'Telegram API returned ok=false.';
  }

  if (safeString(body) && parsed === null) {
    return 'Telegram response was not JSON.';
  }

  return '';
}

function summarizeTelegramAlert(result) {
  return {
    attempted: !!(result && result.attempted),
    ok: !!(result && result.ok),
    statusCode: result && result.statusCode ? result.statusCode : 0,
    error: safeString(result && result.error).slice(0, 220)
  };
}

function testIssueTelegram(payload, user) {
  const staffValue = getUserDisplayName(user);
  const issue = {
    Issue_ID: safeString(payload && payload.Issue_ID) || 'TEST',
    Affiliate_ID: safeString(payload && payload.Affiliate_ID) || 'TEST',
    Priority: safeString(payload && payload.Priority) || 'Medium',
    Status: 'Open',
    Reported_By: staffValue,
    Assigned_To: staffValue,
    Issue_Details: safeString(payload && payload.Issue_Details) || 'Telegram test message from Affiliate Success CRM.'
  };
  const affiliate = {
    Brand: safeString(payload && payload.Brand) || 'Test Brand'
  };

  return sendIssueTelegramAlert(issue, affiliate);
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
    } else if (entityKey === 'issue') {
      committed.push(createIssue(row.item, user).item);
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
      required: ['Period_Type', 'Brand', 'Affiliate_ID', 'FTD', 'Active_Players', 'Deposit_Amount', 'Turnover', 'NGR']
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
