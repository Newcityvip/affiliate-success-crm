/**
 * Affiliate Success CRM Apps Script entry points.
 * All web requests pass through the shared request router.
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}
