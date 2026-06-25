/**
 * Affiliate Success CRM Apps Script entry points.
 * All web requests pass through the shared request router.
 */

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}
