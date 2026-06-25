/**
 * Dashboard read model built from finalized sheet tabs.
 */

function getDashboardSummary() {
  const affiliates = readSheetObjects(SHEET_NAMES.AFFILIATES);
  const followups = readSheetObjects(SHEET_NAMES.FOLLOWUP_QUEUE);
  const tasks = readSheetObjects(SHEET_NAMES.TASK_LOG);
  const issues = readSheetObjects(SHEET_NAMES.ISSUE_LOG);
  const brands = readSheetObjects(SHEET_NAMES.BRAND_LIST);
  const staff = readSheetObjects(SHEET_NAMES.STAFF_LIST);

  return {
    totalAffiliates: affiliates.length,
    activeAffiliates: countByStatus(affiliates, ['active']),
    healthyAffiliates: countByHealth(affiliates, ['healthy', 'health']),
    attentionAffiliates: countByHealth(affiliates, ['attention', 'needs attention']),
    warningAffiliates: countByHealth(affiliates, ['warning', 'warn']),
    criticalAffiliates: countByHealth(affiliates, ['critical', 'risk', 'at risk']),
    todayFollowups: countTodayFollowups(followups),
    overdueFollowups: countOverdueFollowups(followups),
    openTasks: countOpenItems(tasks),
    openIssues: countOpenItems(issues),
    totalBrands: brands.length,
    activeStaff: countByStatus(staff, ['active'])
  };
}

function countByStatus(rows, expectedValues) {
  return rows.filter(function (row) {
    const status = getNormalizedValue(row, ['Status', 'status', 'State', 'state']);
    return expectedValues.indexOf(status) !== -1;
  }).length;
}

function countByHealth(rows, expectedValues) {
  return rows.filter(function (row) {
    const health = getNormalizedValue(row, [
      'Health',
      'health',
      'Health_Status',
      'Health Status',
      'CRM_Status',
      'CRM Status',
      'Status',
      'status'
    ]);
    return expectedValues.indexOf(health) !== -1;
  }).length;
}

function countTodayFollowups(rows) {
  return rows.filter(function (row) {
    return isOpenRow(row) && isToday(getRowDate(row));
  }).length;
}

function countOverdueFollowups(rows) {
  return rows.filter(function (row) {
    const date = getRowDate(row);
    return isOpenRow(row) && date && isBeforeToday(date);
  }).length;
}

function countOpenItems(rows) {
  return rows.filter(function (row) {
    return isOpenRow(row);
  }).length;
}

function isOpenRow(row) {
  const status = getNormalizedValue(row, [
    'Status',
    'status',
    'Task_Status',
    'Task Status',
    'Issue_Status',
    'Issue Status',
    'Followup_Status',
    'Followup Status'
  ]);

  if (!status) {
    return true;
  }

  return ['done', 'complete', 'completed', 'closed', 'resolved', 'cancelled', 'canceled'].indexOf(status) === -1;
}

function getRowDate(row) {
  const rawValue = getFirstValue(row, [
    'Followup_Date',
    'Followup Date',
    'Follow_Up_Date',
    'Follow Up Date',
    'Due_Date',
    'Due Date',
    'Next_Followup',
    'Next Followup',
    'Next Follow-up',
    'Date',
    'date'
  ]);

  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getFirstValue(row, keys) {
  for (var index = 0; index < keys.length; index += 1) {
    if (row[keys[index]] !== null && row[keys[index]] !== undefined && safeString(row[keys[index]]) !== '') {
      return row[keys[index]];
    }
  }

  return '';
}

function getNormalizedValue(row, keys) {
  return safeString(getFirstValue(row, keys)).toLowerCase();
}

function isToday(date) {
  const today = startOfDay(new Date());
  return startOfDay(date).getTime() === today.getTime();
}

function isBeforeToday(date) {
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
