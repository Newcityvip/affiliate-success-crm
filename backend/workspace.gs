/**
 * Sprint 3E read-only workspace endpoints.
 */

function getReports(user) {
  requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
  const dashboard = getDashboardSummary(user);
  return {
    count: 5,
    items: [
      {
        title: 'Affiliate Health Report',
        summary: dashboard.totalAffiliates + ' affiliates tracked',
        count: dashboard.healthyAffiliates,
        status: 'Full export coming later'
      },
      {
        title: 'Follow-up Aging Report',
        summary: dashboard.overdueFollowups + ' overdue follow-ups',
        count: dashboard.todayFollowups + dashboard.overdueFollowups + dashboard.upcomingFollowups,
        status: 'Full export coming later'
      },
      {
        title: 'Staff Workload Report',
        summary: dashboard.staffMembers + ' staff members represented',
        count: dashboard.openTasks + dashboard.openIssues,
        status: 'Full export coming later'
      },
      {
        title: 'Brand Summary Report',
        summary: dashboard.activeBrands + ' active brands',
        count: dashboard.activeBrands,
        status: 'Full export coming later'
      },
      {
        title: 'Monthly Performance Report',
        summary: dashboard.monthlyPerformance.length + ' performance rows available',
        count: dashboard.monthlyPerformance.length,
        status: 'Full export coming later'
      }
    ]
  };
}

function getLeaderboard(user) {
  requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
  const dashboard = getDashboardSummary(user);
  return {
    count: dashboard.staffWorkload.length + dashboard.brandSummary.length + dashboard.priorityDistribution.length,
    staff: dashboard.staffWorkload,
    brands: dashboard.brandSummary,
    affiliates: dashboard.priorityDistribution,
    items: []
  };
}

function getSettingsSummary(user) {
  if (!isAdminUser(user)) {
    return buildLimitedSettingsSummary(user);
  }

  const validation = safeValidateRequiredSheets();
  const performanceHeaders = getPerformanceHeaderStatus();
  return {
    profile: sanitizeUser(user || {}),
    apiStatus: 'Connected',
    appVersion: APP_VERSION,
    apiVersion: API_VERSION,
    configuredApi: 'Apps Script web app',
    secretsVisible: false,
    editableSettings: false,
    sheetHealth: validation,
    performanceHeaderStatus: performanceHeaders,
    items: [
      {
        label: 'API status',
        value: 'Connected'
      },
      {
        label: 'Frontend version',
        value: APP_VERSION
      },
      {
        label: 'Deployment config',
        value: 'Configured without exposing secrets'
      },
      {
        label: 'Sheet health',
        value: validation.valid ? 'All required sheets found' : 'Missing sheets: ' + validation.missing.join(', ')
      },
      {
        label: 'Performance headers',
        value: performanceHeaders.missingRequiredHeaders.length ? 'Missing required headers: ' + performanceHeaders.missingRequiredHeaders.join(', ') : 'Required performance headers ready'
      },
      {
        label: 'Editable settings',
        value: 'Coming after authentication'
      }
    ]
  };
}
