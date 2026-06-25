/**
 * Read-only API router.
 */

function handleRequest(e, method) {
  const params = (e && e.parameter) || {};
  const action = safeString(params.action || 'health').toLowerCase();
  const supportedActions = [
    'health',
    'meta',
    'validatesheets',
    'dashboard',
    'affiliates',
    'staff',
    'brands',
    'followups',
    'tasks',
    'issues',
    'interactions',
    'performance'
  ];

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

    if (method !== 'GET') {
      return errorResponse('Only GET requests are supported for this read-only API.', 'METHOD_NOT_ALLOWED', {
        method: method
      });
    }

    if (action === 'validatesheets') {
      return successResponse(validateRequiredSheets(), 'Required sheets validated.');
    }

    if (action === 'dashboard') {
      return successResponse(getDashboardSummary(), 'Dashboard summary loaded.');
    }

    if (action === 'affiliates') {
      return successResponse(getAffiliates(), 'Affiliates loaded.');
    }

    if (action === 'staff') {
      return successResponse(getStaff(), 'Staff loaded.');
    }

    if (action === 'brands') {
      return successResponse(getBrands(), 'Brands loaded.');
    }

    if (action === 'followups') {
      return successResponse(getFollowups(), 'Follow-ups loaded.');
    }

    if (action === 'tasks') {
      return successResponse(getTasks(), 'Tasks loaded.');
    }

    if (action === 'issues') {
      return successResponse(getIssues(), 'Issues loaded.');
    }

    if (action === 'interactions') {
      return successResponse(getInteractions(), 'Interactions loaded.');
    }

    if (action === 'performance') {
      return successResponse(getPerformance(), 'Performance loaded.');
    }

    return errorResponse('Unknown action.', 'UNKNOWN_ACTION', {
      action: action,
      supportedActions: supportedActions
    });
  } catch (error) {
    return errorResponse('Request failed.', getRequestErrorCode(error), {
      message: error && error.message ? error.message : String(error)
    });
  }
}

function getRequestErrorCode(error) {
  const message = error && error.message ? error.message : String(error);

  if (message.indexOf('Spreadsheet ID is not configured') !== -1) {
    return 'MISSING_SPREADSHEET_ID';
  }

  if (message.indexOf('Missing required sheet') !== -1) {
    return 'MISSING_SHEET';
  }

  return 'REQUEST_FAILED';
}
