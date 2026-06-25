/**
 * API response helpers.
 */

function successResponse(data, message) {
  return jsonOutput({
    success: true,
    message: message || 'OK',
    data: data || {},
    error: null,
    meta: responseMeta()
  });
}

function errorResponse(message, code, details) {
  return jsonOutput({
    success: false,
    message: message || 'Error',
    data: {},
    error: {
      code: code || 'ERROR',
      details: details || {}
    },
    meta: responseMeta()
  });
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function responseMeta() {
  return {
    app: APP_NAME,
    version: APP_VERSION,
    timestamp: getTimestamp()
  };
}
