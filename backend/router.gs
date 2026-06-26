/**
 * API router.
 */

function handleRequest(e, method) {
  const params = (e && e.parameter) || {};
  const action = safeString(params.action || 'health').toLowerCase();
  const supportedActions = [
    'health',
    'meta',
    'login',
    'authlogin',
    'authdebug',
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
    'reports',
    'leaderboard',
    'settings',
    'getfollowups',
    'createfollowup',
    'updatefollowup',
    'completefollowup'
  ];
  var user = null;

  try {
    if (action === 'health') {
      return successResponse({
        status: 'ok',
        method: method,
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
      return successResponse(loginStaff(getRequestLoginId(e)), 'Login successful.');
    }

    if (action === 'authdebug') {
      return successResponse(getAuthDebug(getRequestLoginId(e)), 'Auth debug loaded.');
    }

    if (action === 'getsession') {
      return successResponse(getSession(getSessionTokenFromRequest(e)), 'Session loaded.');
    }

    if (action === 'logout') {
      if (method !== 'POST') {
        return errorResponse('Logout requires POST.', 'METHOD_NOT_ALLOWED', {
          method: method
        });
      }

      return successResponse(logout(getSessionTokenFromRequest(e)), 'Logged out.');
    }

    user = requireAuth(e);

    if (['createfollowup', 'updatefollowup', 'completefollowup'].indexOf(action) !== -1 && method !== 'POST') {
      return errorResponse('This follow-up action requires POST.', 'METHOD_NOT_ALLOWED', {
        method: method
      });
    }

    if (['createfollowup', 'updatefollowup', 'completefollowup'].indexOf(action) === -1 && method !== 'GET') {
      return errorResponse('Only GET requests are supported for this endpoint.', 'METHOD_NOT_ALLOWED', {
        method: method
      });
    }

    if (action === 'validatesheets') {
      requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
      return successResponse(validateRequiredSheets(), 'Required sheets validated.');
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

    if (action === 'tasks') {
      return successResponse(getTasks(user), 'Tasks loaded.');
    }

    if (action === 'issues') {
      return successResponse(getIssues(user), 'Issues loaded.');
    }

    if (action === 'interactions') {
      return successResponse(getInteractions(user), 'Interactions loaded.');
    }

    if (action === 'performance') {
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
