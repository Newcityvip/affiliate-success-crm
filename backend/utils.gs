/**
 * Shared utility helpers.
 */

function getTimestamp() {
  return new Date().toISOString();
}

function safeString(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function createSimpleId(prefix) {
  const safePrefix = safeString(prefix) || 'id';
  const randomPart = Math.random().toString(36).slice(2, 10);
  return safePrefix + '_' + Date.now().toString(36) + '_' + randomPart;
}

function throwCodedError(code, message) {
  const error = new Error(message || code || 'Request failed.');
  error.code = code || 'REQUEST_FAILED';
  throw error;
}
