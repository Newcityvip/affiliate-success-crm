/**
 * Foundation API router.
 * Sprint 0 supports only health and meta actions.
 */

function handleRequest(e, method) {
  const params = (e && e.parameter) || {};
  const action = safeString(params.action || 'health').toLowerCase();

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

    return errorResponse('Unknown action.', 'UNKNOWN_ACTION', {
      action: action,
      supportedActions: ['health', 'meta']
    });
  } catch (error) {
    return errorResponse('Request failed.', 'REQUEST_FAILED', {
      message: error && error.message ? error.message : String(error)
    });
  }
}
