/**
 * API router.
 */

function handleRequest(e, method) {
  const params = (e && e.parameter) || {};
  const requestMethod = method || getRequestMethod(e);
  const action = getRequestAction(e);
  const supportedActions = [
    'health',
    'meta',
    'login',
    'authlogin',
    'authdebug',
    'debugactions',
    'debugsheets',
    'debugdashboard',
    'debugperformancewrite',
    'getsession',
    'logout',
    'validatesheets',
    'dashboard',
    'affiliates',
    'staff',
    'brands',
    'followups',
    'tasks',
    'issues',
    'interactions',
    'performance',
    'getperformance',
    'reports',
    'leaderboard',
    'settings',
    'getfollowups',
    'createfollowup',
    'updatefollowup',
    'completefollowup',
    'reschedulefollowup',
    'createaffiliate',
    'updateaffiliate',
    'createtask',
    'updatetask',
    'completetask',
    'reopentask',
    'createissue',
    'updateissue',
    'resolveissue',
    'closeissue',
    'reopenissue',
    'addinteraction',
    'createinteraction',
    'createbrand',
    'updatebrand',
    'createstaff',
    'updatestaff',
    'importcsvpreview',
    'importcsvcommit',
    'createperformance',
    'updateperformance',
    'importperformancecsvpreview',
    'importperformancecsvcommit'
  ];
  const writeActions = [
    'createfollowup',
    'updatefollowup',
    'completefollowup',
    'reschedulefollowup',
    'createaffiliate',
    'updateaffiliate',
    'createtask',
    'updatetask',
    'completetask',
    'reopentask',
    'createissue',
    'updateissue',
    'resolveissue',
    'closeissue',
    'reopenissue',
    'addinteraction',
    'createinteraction',
    'createbrand',
    'updatebrand',
    'createstaff',
    'updatestaff',
    'importcsvpreview',
    'importcsvcommit',
    'createperformance',
    'updateperformance',
    'importperformancecsvpreview',
    'importperformancecsvcommit'
  ];
  var user = null;

  try {
    if (action === 'health') {
      return successResponse({
        status: 'ok',
        method: requestMethod,
        apiVersion: API_VERSION
      }, 'Service is healthy.');
    }

    if (action === 'meta') {
      return successResponse({
        app: APP_NAME,
        version: APP_VERSION,
        apiVersion: API_VERSION,
        sheetNames: Object.keys(SHEET_NAMES).map(function (key) {
          return SHEET_NAMES[key];
        })
      }, 'Application metadata loaded.');
    }

    if (action === 'login' || action === 'authlogin') {
      return successResponse(loginStaff(getRequestLoginId(e), e), 'Login successful.');
    }

    if (action === 'authdebug') {
      const authDebugData = getAuthDebug(getRequestLoginId(e), e) || {};
      authDebugData.routeVersion = 'router-v2-auth-debug';
      return successResponse(authDebugData, 'Auth debug loaded from router-v2.');
    }

    if (action === 'debugactions') {
      return successResponse(getDebugActions(e, requestMethod, action, supportedActions, writeActions), 'Action debug loaded.');
    }

    if (action === 'debugsheets') {
      return successResponse(getDebugSheets(), 'Sheet debug loaded.');
    }

    if (action === 'getsession') {
      return successResponse(getSession(getSessionTokenFromRequest(e), e), 'Session loaded.');
    }

    if (action === 'logout') {
      if (requestMethod !== 'POST') {
        return errorResponse('Logout requires POST.', 'METHOD_NOT_ALLOWED', {
          method: requestMethod
        });
      }

      return successResponse(logout(getSessionTokenFromRequest(e)), 'Logged out.');
    }

    user = requireAuth(e);

    if (writeActions.indexOf(action) === -1 && requestMethod !== 'GET') {
      return errorResponse('Only GET requests are supported for this endpoint.', 'METHOD_NOT_ALLOWED', {
        method: requestMethod
      });
    }

    if (action === 'validatesheets') {
      requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
      return successResponse(validateRequiredSheets(), 'Required sheets validated.');
    }

    if (action === 'debugdashboard') {
      requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
      return successResponse(getDebugDashboard(user), 'Dashboard debug loaded.');
    }

    if (action === 'debugperformancewrite') {
      requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
      return successResponse(getDebugPerformanceWrite(getRequestPayload(e), action, user), 'Performance write debug loaded.');
    }

    if (action === 'dashboard') {
      return successResponse(getDashboardSummary(user), 'Dashboard summary loaded.');
    }

    if (action === 'affiliates') {
      return successResponse(getAffiliates(user), 'Affiliates loaded.');
    }

    if (action === 'staff') {
      requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
      return successResponse(getStaff(user), 'Staff loaded.');
    }

    if (action === 'brands') {
      return successResponse(getBrands(user), 'Brands loaded.');
    }

    if (action === 'followups' || action === 'getfollowups') {
      return successResponse(getFollowups(user), 'Follow-ups loaded.');
    }

    if (action === 'createfollowup') {
      return successResponse(createFollowup(getRequestPayload(e), user), 'Follow-up created.');
    }

    if (action === 'updatefollowup') {
      return successResponse(updateFollowup(getRequestPayload(e), user), 'Follow-up updated.');
    }

    if (action === 'completefollowup') {
      return successResponse(completeFollowup(getRequestPayload(e), user), 'Follow-up completed.');
    }

    if (action === 'reschedulefollowup') {
      return successResponse(rescheduleFollowup(getRequestPayload(e), user), 'Follow-up rescheduled.');
    }

    if (action === 'createaffiliate') {
      return successResponse(createAffiliate(getRequestPayload(e), user), 'Affiliate created.');
    }

    if (action === 'updateaffiliate') {
      return successResponse(updateAffiliate(getRequestPayload(e), user), 'Affiliate updated.');
    }

    if (action === 'createtask') {
      return successResponse(createTask(getRequestPayload(e), user), 'Task created.');
    }

    if (action === 'updatetask') {
      return successResponse(updateTask(getRequestPayload(e), user), 'Task updated.');
    }

    if (action === 'completetask') {
      return successResponse(completeTask(getRequestPayload(e), user), 'Task completed.');
    }

    if (action === 'reopentask') {
      return successResponse(reopenTask(getRequestPayload(e), user), 'Task reopened.');
    }

    if (action === 'createissue') {
      return successResponse(createIssue(getRequestPayload(e), user), 'Issue created.');
    }

    if (action === 'updateissue') {
      return successResponse(updateIssue(getRequestPayload(e), user), 'Issue updated.');
    }

    if (action === 'resolveissue') {
      return successResponse(resolveIssue(getRequestPayload(e), user), 'Issue resolved.');
    }

    if (action === 'closeissue') {
      return successResponse(closeIssue(getRequestPayload(e), user), 'Issue closed.');
    }

    if (action === 'reopenissue') {
      return successResponse(reopenIssue(getRequestPayload(e), user), 'Issue reopened.');
    }

    if (action === 'addinteraction' || action === 'createinteraction') {
      return successResponse(createInteraction(getRequestPayload(e), user), 'Interaction created.');
    }

    if (action === 'createbrand') {
      return successResponse(createBrand(getRequestPayload(e), user), 'Brand created.');
    }

    if (action === 'updatebrand') {
      return successResponse(updateBrand(getRequestPayload(e), user), 'Brand updated.');
    }

    if (action === 'createstaff') {
      return successResponse(createStaff(getRequestPayload(e), user), 'Staff created.');
    }

    if (action === 'updatestaff') {
      return successResponse(updateStaff(getRequestPayload(e), user), 'Staff updated.');
    }

    if (action === 'importcsvpreview') {
      return successResponse(importCsvPreview(getRequestPayload(e), user), 'CSV preview generated.');
    }

    if (action === 'importcsvcommit') {
      return successResponse(importCsvCommit(getRequestPayload(e), user), 'CSV import committed.');
    }

    if (action === 'createperformance') {
      return successResponse(createPerformance(getRequestPayload(e), user), 'Performance row saved.');
    }

    if (action === 'updateperformance') {
      return successResponse(updatePerformance(getRequestPayload(e), user), 'Performance row updated.');
    }

    if (action === 'importperformancecsvpreview') {
      return successResponse(importPerformanceCsvPreview(getRequestPayload(e), user), 'Performance CSV preview generated.');
    }

    if (action === 'importperformancecsvcommit') {
      return successResponse(importPerformanceCsvCommit(getRequestPayload(e), user), 'Performance CSV import committed.');
    }

    if (action === 'tasks') {
      return successResponse(getTasks(user), 'Tasks loaded.');
    }

    if (action === 'issues') {
      return successResponse(getIssues(user), 'Issues loaded.');
    }

    if (action === 'interactions') {
      return successResponse(getInteractions(user), 'Interactions loaded.');
    }

    if (action === 'performance' || action === 'getperformance') {
      return successResponse(getPerformance(user), 'Performance loaded.');
    }

    if (action === 'reports') {
      requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
      return successResponse(getReports(user), 'Report previews loaded.');
    }

    if (action === 'leaderboard') {
      requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
      return successResponse(getLeaderboard(user), 'Leaderboard loaded.');
    }

    if (action === 'settings') {
      return successResponse(getSettingsSummary(user), 'Settings summary loaded.');
    }

    return errorResponse('Unknown action.', 'UNKNOWN_ACTION', {
      action: action,
      supportedActions: supportedActions
    });
  } catch (error) {
    return errorResponse(getRequestErrorMessage(error), getRequestErrorCode(error), {
      message: error && error.message ? error.message : String(error)
    });
  }
}

function getRequestMethod(e) {
  return e && e.postData ? 'POST' : 'GET';
}

function getRequestAction(e) {
  const params = (e && e.parameter) || {};
  const payload = getRequestPayload(e);
  return safeString(params.action || payload.action || payload.Action || 'health').toLowerCase();
}

function getDebugActions(e, method, action, supportedActions, writeActions) {
  const params = (e && e.parameter) || {};
  const payload = getRequestPayload(e);
  const postData = e && e.postData ? e.postData : {};
  const contentType = safeString(postData.type);
  const hasBody = Boolean(postData.contents);

  return {
    supportedActions: supportedActions,
    writeActions: writeActions,
    requestMethodSeen: method,
    queryAction: safeString(params.action),
    payloadAction: safeString(payload.action || payload.Action),
    parsedAction: action,
    actionIsSupported: supportedActions.indexOf(action) !== -1,
    actionIsWrite: writeActions.indexOf(action) !== -1,
    parser: {
      readsQueryAction: Boolean(params.action),
      readsPayloadAction: Boolean(payload.action || payload.Action),
      bodyPresent: hasBody,
      contentType: contentType
    },
    app: APP_NAME,
    version: APP_VERSION,
    apiVersion: API_VERSION,
    commitMarker: 'debug-actions-2026-06-29'
  };
}

function getRequestErrorMessage(error) {
  if (error && error.code) {
    return error.message || error.code;
  }

  return 'Request failed.';
}

function getRequestErrorCode(error) {
  const message = error && error.message ? error.message : String(error);

  if (error && error.code) {
    return error.code;
  }

  if (message.indexOf('Spreadsheet ID is not configured') !== -1) {
    return 'MISSING_SPREADSHEET_ID';
  }

  if (message.indexOf('Missing required sheet') !== -1) {
    return 'MISSING_SHEET';
  }

  return 'REQUEST_FAILED';
}

function getRequestPayload(e) {
  const params = (e && e.parameter) || {};
  const contents = e && e.postData && e.postData.contents ? e.postData.contents : '';
  const contentType = safeString(e && e.postData && e.postData.type).toLowerCase();

  if (params.payload) {
    try {
      return JSON.parse(params.payload);
    } catch (error) {
      return params;
    }
  }

  if (contents) {
    if (contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
      return parseFormEncodedPayload(contents, params);
    }

    try {
      return JSON.parse(contents);
    } catch (error) {
      return parseFormEncodedPayload(contents, params);
    }
  }

  return params;
}

function getRequestLoginId(e) {
  const payload = getRequestPayload(e);
  return safeString(payload.loginId || payload.loginID || payload.Login_ID || payload.login_id || payload.staffId || payload.Staff_ID);
}

function parseFormEncodedPayload(contents, fallbackParams) {
  const payload = {};

  safeString(contents).split('&').forEach(function (pair) {
    const parts = pair.split('=');
    const key = decodeFormComponent(parts.shift() || '');
    const value = decodeFormComponent(parts.join('=') || '');

    if (key) {
      payload[key] = value;
    }
  });

  Object.keys(fallbackParams || {}).forEach(function (key) {
    if (payload[key] === undefined) {
      payload[key] = fallbackParams[key];
    }
  });

  return payload;
}

function decodeFormComponent(value) {
  try {
    return decodeURIComponent(safeString(value).replace(/\+/g, ' '));
  } catch (error) {
    return safeString(value);
  }
}
