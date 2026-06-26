/**
 * Dashboard read model built from finalized sheet tabs.
 * This file only reads sheet data and returns empty-safe dashboard sections.
 */

function getDashboardSummary() {
  const affiliates = safeReadSheetObjects(SHEET_NAMES.AFFILIATES);
  const followups = enrichDashboardFollowups(safeReadSheetObjects(SHEET_NAMES.FOLLOWUP_QUEUE), affiliates);
  const tasks = safeReadSheetObjects(SHEET_NAMES.TASK_LOG);
  const issues = safeReadSheetObjects(SHEET_NAMES.ISSUE_LOG);
  const brands = safeReadSheetObjects(SHEET_NAMES.BRAND_LIST);
  const staff = safeReadSheetObjects(SHEET_NAMES.STAFF_LIST);
  const activity = safeReadSheetObjects(SHEET_NAMES.ACTIVITY_LOG);
  const interactions = safeReadSheetObjects(SHEET_NAMES.INTERACTION_LOG);
  const performance = safeReadSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE);

  const followupGroups = groupFollowups(followups);
  const healthDistribution = buildHealthDistribution(affiliates);
  const priorityDistribution = buildPriorityDistribution(affiliates, followups);
  const openTasks = filterOpenRows(tasks);
  const openIssues = filterOpenRows(issues);
  const recentActivity = buildRecentActivity(activity, interactions);
  const summary = {
    totalAffiliates: affiliates.length,
    activeAffiliates: countByStatus(affiliates, ['active', 'yes', 'true']),
    healthyAffiliates: getDistributionCount(healthDistribution, 'Healthy'),
    attentionAffiliates: getDistributionCount(healthDistribution, 'Watchlist'),
    warningAffiliates: getDistributionCount(healthDistribution, 'Watchlist'),
    criticalAffiliates: getDistributionCount(healthDistribution, 'At Risk'),
    todayFollowups: followupGroups.today.length,
    overdueFollowups: followupGroups.overdue.length,
    openTasks: openTasks.length,
    openIssues: openIssues.length,
    totalBrands: brands.length || getUniqueValues(affiliates, ['Brand', 'Brand_Name', 'Brand Name']).length,
    activeStaff: countActiveStaff(staff, followups, tasks, issues),
    completedFollowups: followupGroups.completed.length,
    upcomingFollowups: followupGroups.upcoming.length,
    activeBrands: countActiveBrands(brands, affiliates),
    staffMembers: countActiveStaff(staff, followups, tasks, issues),
    recentInteractions: recentActivity.length
  };

  summary.todayWorkspace = {
    dueToday: summary.todayFollowups,
    overdue: summary.overdueFollowups,
    upcomingThisWeek: countUpcomingThisWeek(followups),
    completedToday: countCompletedToday(followups),
    openTasks: summary.openTasks,
    openIssues: summary.openIssues,
    recentInteractions: summary.recentInteractions,
    warnings: buildWorkspaceWarnings(summary)
  };
  summary.followupSnapshot = {
    today: topRows(followupGroups.today, 3, followupSort),
    overdue: topRows(followupGroups.overdue, 3, followupSort),
    upcoming: topRows(followupGroups.upcoming, 3, followupSort),
    completed: topRows(followupGroups.completed, 3, newestFirst)
  };
  summary.affiliateHealth = healthDistribution;
  summary.priorityDistribution = priorityDistribution;
  summary.brandSummary = buildBrandSummary(brands, affiliates, followups);
  summary.staffWorkload = buildStaffWorkload(staff, followups, tasks, issues);
  summary.recentActivity = recentActivity.slice(0, 8);
  summary.upcomingFollowupsList = topRows(followupGroups.upcoming, 8, followupSort);
  summary.openIssuesList = topRows(openIssues.map(normalizeIssueRow), 8, newestFirst);
  summary.openTasksList = topRows(openTasks.map(normalizeTaskRow), 8, followupSort);
  summary.monthlyPerformance = buildMonthlyPerformance(performance);

  return summary;
}

function safeReadSheetObjects(sheetName) {
  try {
    return readSheetObjects(sheetName);
  } catch (error) {
    return [];
  }
}

function enrichDashboardFollowups(followups, affiliates) {
  const affiliateMap = {};

  affiliates.forEach(function (affiliate) {
    const affiliateId = safeString(affiliate.Affiliate_ID);
    if (affiliateId) {
      affiliateMap[affiliateId] = affiliate;
    }
  });

  return followups.map(function (row) {
    const item = copyRow(row);
    const affiliate = affiliateMap[safeString(item.Affiliate_ID)] || {};
    item.Affiliate_Name = item.Affiliate_Name || getFirstValue(affiliate, ['Affiliate_Name', 'Name']);
    item.Brand = item.Brand || getFirstValue(affiliate, ['Brand', 'Brand_Name', 'Brand Name']);
    return item;
  });
}

function groupFollowups(rows) {
  const groups = {
    today: [],
    overdue: [],
    upcoming: [],
    completed: []
  };

  rows.forEach(function (row) {
    const item = normalizeFollowupRow(row);
    if (isCompletedRow(item)) {
      groups.completed.push(item);
    } else if (isToday(getRowDate(item))) {
      groups.today.push(item);
    } else if (isBeforeToday(getRowDate(item))) {
      groups.overdue.push(item);
    } else {
      groups.upcoming.push(item);
    }
  });

  return groups;
}

function normalizeFollowupRow(row) {
  return {
    Queue_ID: safeString(getFirstValue(row, ['Queue_ID', 'ID'])),
    Affiliate_ID: safeString(getFirstValue(row, ['Affiliate_ID', 'Affiliate ID'])),
    Affiliate_Name: safeString(getFirstValue(row, ['Affiliate_Name', 'Affiliate Name', 'Name'])),
    Brand: safeString(getFirstValue(row, ['Brand', 'Brand_Name', 'Brand Name'])),
    Assigned_Staff: safeString(getFirstValue(row, ['Assigned_Staff', 'Assigned Staff', 'Staff'])),
    Followup_Date: normalizeDateValue(getFirstValue(row, ['Followup_Date', 'Followup Date', 'Due_Date', 'Due Date', 'Date'])),
    Priority: safeString(getFirstValue(row, ['Priority'])),
    Status: safeString(getFirstValue(row, ['Status'])),
    Generated_From: safeString(getFirstValue(row, ['Generated_From', 'Generated From', 'Source']))
  };
}

function buildHealthDistribution(affiliates) {
  const distribution = {
    Healthy: { label: 'Healthy', count: 0, tone: 'green' },
    Watchlist: { label: 'Watchlist', count: 0, tone: 'amber' },
    'At Risk': { label: 'At Risk', count: 0, tone: 'red' },
    Inactive: { label: 'Inactive', count: 0, tone: 'gray' }
  };

  affiliates.forEach(function (row) {
    const health = getNormalizedValue(row, ['Health_Status', 'Health Status', 'Health', 'CRM_Status']);
    const status = getNormalizedValue(row, ['Status', 'Active']);
    if (status === 'inactive' || status === 'no' || status === 'false') {
      distribution.Inactive.count += 1;
    } else if (health.indexOf('critical') !== -1 || health.indexOf('risk') !== -1) {
      distribution['At Risk'].count += 1;
    } else if (health.indexOf('attention') !== -1 || health.indexOf('warning') !== -1 || health.indexOf('watch') !== -1) {
      distribution.Watchlist.count += 1;
    } else if (health.indexOf('healthy') !== -1 || health.indexOf('good') !== -1) {
      distribution.Healthy.count += 1;
    } else {
      distribution.Watchlist.count += 1;
    }
  });

  return objectValues(distribution);
}

function buildPriorityDistribution(affiliates, followups) {
  const counts = {
    Low: { label: 'Low', count: 0, tone: 'gray' },
    Medium: { label: 'Medium', count: 0, tone: 'amber' },
    High: { label: 'High', count: 0, tone: 'red' },
    Critical: { label: 'Critical', count: 0, tone: 'red' }
  };

  affiliates.concat(followups).forEach(function (row) {
    const priority = getNormalizedValue(row, ['Priority']);
    if (priority.indexOf('critical') !== -1) {
      counts.Critical.count += 1;
    } else if (priority.indexOf('high') !== -1) {
      counts.High.count += 1;
    } else if (priority.indexOf('medium') !== -1) {
      counts.Medium.count += 1;
    } else if (priority.indexOf('low') !== -1) {
      counts.Low.count += 1;
    }
  });

  return objectValues(counts);
}

function buildBrandSummary(brands, affiliates, followups) {
  const brandMap = {};

  brands.forEach(function (brand) {
    const name = safeString(getFirstValue(brand, ['Brand', 'Brand_Name', 'Brand Name', 'Name']));
    if (name) {
      brandMap[name] = {
        brand: name,
        totalAffiliates: 0,
        healthy: 0,
        atRisk: 0,
        pendingFollowups: 0
      };
    }
  });

  affiliates.forEach(function (affiliate) {
    const name = safeString(getFirstValue(affiliate, ['Brand', 'Brand_Name', 'Brand Name'])) || 'Unassigned';
    if (!brandMap[name]) {
      brandMap[name] = {
        brand: name,
        totalAffiliates: 0,
        healthy: 0,
        atRisk: 0,
        pendingFollowups: 0
      };
    }

    brandMap[name].totalAffiliates += 1;
    if (isHealthyAffiliate(affiliate)) {
      brandMap[name].healthy += 1;
    }
    if (isRiskAffiliate(affiliate)) {
      brandMap[name].atRisk += 1;
    }
  });

  followups.forEach(function (followup) {
    const brand = safeString(getFirstValue(followup, ['Brand', 'Brand_Name', 'Brand Name'])) || 'Unassigned';
    if (!brandMap[brand]) {
      brandMap[brand] = {
        brand: brand,
        totalAffiliates: 0,
        healthy: 0,
        atRisk: 0,
        pendingFollowups: 0
      };
    }

    if (isOpenRow(followup)) {
      brandMap[brand].pendingFollowups += 1;
    }
  });

  return objectValues(brandMap).sort(function (a, b) {
    return b.totalAffiliates - a.totalAffiliates;
  }).slice(0, 8);
}

function buildStaffWorkload(staff, followups, tasks, issues) {
  const staffMap = {};

  staff.forEach(function (row) {
    const name = safeString(getFirstValue(row, ['Staff_Name', 'Staff Name', 'Name', 'Assigned_Staff', 'Staff_ID', 'Staff ID']));
    if (name) {
      staffMap[name] = {
        staff: name,
        assignedFollowups: 0,
        openTasks: 0,
        openIssues: 0,
        overdueFollowups: 0
      };
    }
  });

  function ensureStaff(name) {
    const staffName = safeString(name) || 'Unassigned';
    if (!staffMap[staffName]) {
      staffMap[staffName] = {
        staff: staffName,
        assignedFollowups: 0,
        openTasks: 0,
        openIssues: 0,
        overdueFollowups: 0
      };
    }
    return staffMap[staffName];
  }

  followups.forEach(function (row) {
    if (isOpenRow(row)) {
      const item = ensureStaff(getFirstValue(row, ['Assigned_Staff', 'Assigned Staff', 'Staff']));
      item.assignedFollowups += 1;
      if (isBeforeToday(getRowDate(row))) {
        item.overdueFollowups += 1;
      }
    }
  });

  tasks.forEach(function (row) {
    if (isOpenRow(row)) {
      ensureStaff(getAssignedStaff(row)).openTasks += 1;
    }
  });

  issues.forEach(function (row) {
    if (isOpenRow(row)) {
      ensureStaff(getAssignedStaff(row)).openIssues += 1;
    }
  });

  return objectValues(staffMap).sort(function (a, b) {
    const aTotal = a.assignedFollowups + a.openTasks + a.openIssues + a.overdueFollowups;
    const bTotal = b.assignedFollowups + b.openTasks + b.openIssues + b.overdueFollowups;
    return bTotal - aTotal;
  }).slice(0, 8);
}

function buildRecentActivity(activity, interactions) {
  const items = [];

  activity.forEach(function (row) {
    items.push(normalizeActivityRow(row, 'Activity'));
  });

  interactions.forEach(function (row) {
    items.push(normalizeActivityRow(row, 'Interaction'));
  });

  return items.sort(newestFirst).slice(0, 8);
}

function normalizeActivityRow(row, defaultType) {
  return {
    date: normalizeDateValue(getFirstValue(row, ['Timestamp', 'Date', 'Activity_Date', 'Interaction_Date', 'Created_Date'])),
    type: safeString(getFirstValue(row, ['Type', 'Activity_Type', 'Interaction_Type'])) || defaultType,
    affiliate: safeString(getFirstValue(row, ['Affiliate_Name', 'Affiliate', 'Affiliate_ID'])),
    staff: safeString(getAssignedStaff(row)),
    summary: safeString(getFirstValue(row, ['Summary', 'Note', 'Notes', 'Activity', 'Description', 'Message']))
  };
}

function normalizeIssueRow(row) {
  return {
    issueId: safeString(getFirstValue(row, ['Issue_ID', 'Issue ID', 'ID'])),
    affiliate: safeString(getFirstValue(row, ['Affiliate_Name', 'Affiliate', 'Affiliate_ID'])),
    brand: safeString(getFirstValue(row, ['Brand', 'Brand_Name', 'Brand Name'])),
    priority: safeString(getFirstValue(row, ['Priority'])),
    status: safeString(getFirstValue(row, ['Status', 'Issue_Status', 'Issue Status'])),
    assignedStaff: safeString(getAssignedStaff(row)),
    createdDate: normalizeDateValue(getFirstValue(row, ['Created_Date', 'Created Date', 'Date', 'Issue_Date']))
  };
}

function normalizeTaskRow(row) {
  return {
    taskId: safeString(getFirstValue(row, ['Task_ID', 'Task ID', 'ID'])),
    title: safeString(getFirstValue(row, ['Title', 'Task', 'Task_Title', 'Description'])),
    affiliate: safeString(getFirstValue(row, ['Affiliate_Name', 'Affiliate', 'Affiliate_ID'])),
    priority: safeString(getFirstValue(row, ['Priority'])),
    status: safeString(getFirstValue(row, ['Status', 'Task_Status', 'Task Status'])),
    assignedStaff: safeString(getAssignedStaff(row)),
    dueDate: normalizeDateValue(getFirstValue(row, ['Due_Date', 'Due Date', 'Date', 'Task_Date']))
  };
}

function buildMonthlyPerformance(rows) {
  return rows.slice(0).sort(newestFirst).slice(0, 8).map(function (row) {
    return {
      month: safeString(getFirstValue(row, ['Month', 'Performance_Month', 'Period'])),
      brand: safeString(getFirstValue(row, ['Brand', 'Brand_Name', 'Brand Name'])),
      affiliate: safeString(getFirstValue(row, ['Affiliate_Name', 'Affiliate', 'Affiliate_ID'])),
      ftd: getOptionalNumber(row, ['FTD', 'FTDs', 'First_Time_Depositors']),
      revenue: getOptionalNumber(row, ['Revenue', 'NGR', 'Net_Gaming_Revenue', 'Commission']),
      growth: safeString(getFirstValue(row, ['Growth', 'Growth_Rate', 'MoM_Growth']))
    };
  });
}

function buildWorkspaceWarnings(summary) {
  const warnings = [];
  if (summary.overdueFollowups > 0) {
    warnings.push({
      label: 'Overdue follow-ups',
      count: summary.overdueFollowups,
      tone: 'red'
    });
  }
  if (summary.openIssues > 0) {
    warnings.push({
      label: 'Open issues',
      count: summary.openIssues,
      tone: 'amber'
    });
  }
  if (summary.criticalAffiliates > 0) {
    warnings.push({
      label: 'At-risk affiliates',
      count: summary.criticalAffiliates,
      tone: 'red'
    });
  }
  return warnings;
}

function countByStatus(rows, expectedValues) {
  return rows.filter(function (row) {
    const status = getNormalizedValue(row, ['Status', 'status', 'State', 'state', 'Active']);
    return expectedValues.indexOf(status) !== -1;
  }).length;
}

function countActiveStaff(staff, followups, tasks, issues) {
  const active = countByStatus(staff, ['active', 'yes', 'true']);
  if (active > 0) {
    return active;
  }
  return getUniqueValues(followups.concat(tasks).concat(issues), ['Assigned_Staff', 'Assigned Staff', 'Staff']).length;
}

function countActiveBrands(brands, affiliates) {
  const active = countByStatus(brands, ['active', 'yes', 'true']);
  if (active > 0) {
    return active;
  }
  return getUniqueValues(affiliates, ['Brand', 'Brand_Name', 'Brand Name']).length;
}

function countUpcomingThisWeek(rows) {
  const today = startOfDay(new Date());
  const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  return rows.filter(function (row) {
    const date = getRowDate(row);
    return isOpenRow(row) && date && startOfDay(date).getTime() > today.getTime() && startOfDay(date).getTime() <= weekEnd.getTime();
  }).length;
}

function countCompletedToday(rows) {
  return rows.filter(function (row) {
    return isCompletedRow(row) && isToday(getRowDate(row));
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

function filterOpenRows(rows) {
  return rows.filter(function (row) {
    return isOpenRow(row);
  });
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

function isCompletedRow(row) {
  const status = getNormalizedValue(row, ['Status', 'Task_Status', 'Issue_Status', 'Followup_Status']);
  return ['done', 'complete', 'completed', 'closed', 'resolved'].indexOf(status) !== -1;
}

function isHealthyAffiliate(row) {
  const health = getNormalizedValue(row, ['Health_Status', 'Health Status', 'Health']);
  return health.indexOf('healthy') !== -1 || health.indexOf('good') !== -1;
}

function isRiskAffiliate(row) {
  const health = getNormalizedValue(row, ['Health_Status', 'Health Status', 'Health']);
  return health.indexOf('critical') !== -1 || health.indexOf('risk') !== -1;
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
    'Created_Date',
    'Created Date',
    'Timestamp',
    'Date',
    'date',
    'dueDate',
    'createdDate'
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
    if (row && row[keys[index]] !== null && row[keys[index]] !== undefined && safeString(row[keys[index]]) !== '') {
      return row[keys[index]];
    }
  }

  return '';
}

function getNormalizedValue(row, keys) {
  return safeString(getFirstValue(row, keys)).toLowerCase();
}

function getAssignedStaff(row) {
  return getFirstValue(row, ['Assigned_Staff', 'Assigned Staff', 'Staff', 'Owner', 'Assigned_To', 'Assigned To']);
}

function getUniqueValues(rows, keys) {
  const values = {};
  rows.forEach(function (row) {
    const value = safeString(getFirstValue(row, keys));
    if (value) {
      values[value] = true;
    }
  });
  return Object.keys(values);
}

function getDistributionCount(items, label) {
  const match = items.filter(function (item) {
    return item.label === label;
  })[0];
  return match ? match.count : 0;
}

function getOptionalNumber(row, keys) {
  const value = getFirstValue(row, keys);
  if (value === '') {
    return '';
  }
  return value;
}

function topRows(rows, limit, sorter) {
  return rows.slice(0).sort(sorter).slice(0, limit);
}

function followupSort(a, b) {
  const aDate = getRowDate(a);
  const bDate = getRowDate(b);
  const aTime = aDate ? aDate.getTime() : 9999999999999;
  const bTime = bDate ? bDate.getTime() : 9999999999999;
  return aTime - bTime;
}

function newestFirst(a, b) {
  const aDate = getRowDate(a);
  const bDate = getRowDate(b);
  const aTime = aDate ? aDate.getTime() : 0;
  const bTime = bDate ? bDate.getTime() : 0;
  return bTime - aTime;
}

function normalizeDateValue(value) {
  if (!value) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return safeString(value);
}

function objectValues(source) {
  return Object.keys(source).map(function (key) {
    return source[key];
  });
}

function copyRow(row) {
  const copy = {};
  Object.keys(row || {}).forEach(function (key) {
    copy[key] = row[key];
  });
  return copy;
}

function isToday(date) {
  if (!date) {
    return false;
  }
  const today = startOfDay(new Date());
  return startOfDay(date).getTime() === today.getTime();
}

function isBeforeToday(date) {
  if (!date) {
    return false;
  }
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
