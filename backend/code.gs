/**
 * Affiliate Success CRM Apps Script entry points.
 * All web requests pass through the shared request router.
 */

function doGet(e) {
  return handleEntrypointRequest(e);
}

function doPost(e) {
  return handleEntrypointRequest(e);
}

function handleEntrypointRequest(e) {
  const action = safeString(e && e.parameter && e.parameter.action).toLowerCase();

  if (action === 'authdebug') {
    const authDebugData = getAuthDebug(getRequestLoginId(e), e) || {};
    authDebugData.entrypointVersion = 'code-entry-auth-v1';
    return successResponse(authDebugData, 'Auth debug loaded from code-entry-v1.');
  }

  if (action === 'login' || action === 'authlogin') {
    const loginData = loginStaff(getRequestLoginId(e), e) || {};
    loginData.entrypointVersion = 'code-entry-auth-v1';
    return successResponse(loginData, 'Login successful.');
  }

  return handleRequest(e);
}
