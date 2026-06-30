(function (window) {
  'use strict';

  var config = window.AffiliateSuccessConfig || {};
  var SESSION_KEY = 'affiliateSuccessSession';
  var PUBLIC_ACTIONS = ['health', 'meta', 'login', 'authlogin', 'authdebug', 'debugsheets'];
  var lastDebug = {
    action: '',
    method: '',
    responseCode: '',
    responseMessage: '',
    payloadKeys: []
  };

  function getSessionToken() {
    try {
      var raw = window.localStorage.getItem(SESSION_KEY);
      var session = raw ? JSON.parse(raw) : null;
      return session && session.sessionToken ? session.sessionToken : '';
    } catch (error) {
      return '';
    }
  }

  function buildUrl(action, params) {
    if (!config.API_BASE_URL) {
      return '';
    }

    var url = new URL(config.API_BASE_URL);
    url.searchParams.set('action', action);
    Object.keys(params || {}).forEach(function (key) {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.set(key, params[key]);
      }
    });
    if (PUBLIC_ACTIONS.indexOf(String(action).toLowerCase()) === -1) {
      var token = getSessionToken();
      if (token) {
        url.searchParams.set('sessionToken', token);
      }
    }
    return url.toString();
  }

  function normalizePayload(payload) {
    var normalized = payload || {};
    var ok = normalized.ok;
    var code = normalized.code || (normalized.error && normalized.error.code) || '';
    var detailMessage = normalized.details && normalized.details.message ? normalized.details.message : '';

    if (ok === undefined) {
      ok = normalized.success;
    }

    normalized.ok = ok === true;
    normalized.success = normalized.ok;
    normalized.code = code;
    normalized.message = normalized.message || detailMessage || (typeof normalized.error === 'string' ? normalized.error : 'API response received.');

    return normalized;
  }

  function getActionFromUrl(url, fallback) {
    try {
      return new URL(url, window.location.href).searchParams.get('action') || fallback || '';
    } catch (error) {
      return fallback || '';
    }
  }

  function getPayloadKeysFromUrl(url) {
    try {
      var payload = new URL(url, window.location.href).searchParams.get('payload');
      return payload ? Object.keys(JSON.parse(payload)) : [];
    } catch (error) {
      return [];
    }
  }

  function setLastDebug(details) {
    lastDebug = {
      action: details.action || '',
      method: details.method || '',
      responseCode: details.responseCode || '',
      responseMessage: details.responseMessage || '',
      payloadKeys: details.payloadKeys || []
    };

    try {
      window.dispatchEvent(new CustomEvent('affiliate-success-api-debug', {
        detail: lastDebug
      }));
    } catch (error) {
      // Debug dispatch is optional.
    }
  }

  function handleUnauthorized(payload) {
    if (!payload || payload.code !== 'UNAUTHORIZED') {
      return;
    }

    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      // Ignore storage cleanup failures.
    }

    if (!/login\.html$/i.test(window.location.pathname)) {
      window.location.href = 'login.html';
    }
  }

  async function request(action, options) {
    var url = action.indexOf('http') === 0 ? action : buildUrl(action);
    var requestAction = getActionFromUrl(url, action);
    var requestMethod = options && options.method ? options.method : 'GET';
    var payloadKeys = getPayloadKeysFromUrl(url);

    if (!url) {
      setLastDebug({
        action: action,
        method: requestMethod,
        responseCode: 'API_NOT_CONFIGURED',
        responseMessage: 'API base URL is not configured.',
        payloadKeys: payloadKeys
      });
      return {
        ok: false,
        success: false,
        message: 'API base URL is not configured.',
        data: {},
        error: {
          code: 'API_NOT_CONFIGURED',
          details: {}
        }
      };
    }

    try {
      var response = await fetch(url, options || {});
      var payload = normalizePayload(await response.json());
      handleUnauthorized(payload);
      setLastDebug({
        action: requestAction,
        method: requestMethod,
        responseCode: payload.code || response.status,
        responseMessage: payload.message || '',
        payloadKeys: payloadKeys
      });

      if (!response.ok) {
        return {
          ok: false,
          success: false,
          message: payload && payload.message ? payload.message : 'API request failed.',
          data: {},
          error: {
            code: payload.code || 'HTTP_ERROR',
            details: {
              status: response.status
            }
          },
          code: payload.code || 'HTTP_ERROR'
        };
      }

      return payload;
    } catch (error) {
      setLastDebug({
        action: requestAction,
        method: requestMethod,
        responseCode: 'NETWORK_ERROR',
        responseMessage: error && error.message ? error.message : String(error),
        payloadKeys: payloadKeys
      });
      return {
        ok: false,
        success: false,
        message: 'Unable to reach the API.',
        data: {},
        error: {
          code: 'NETWORK_ERROR',
          details: {
            message: error && error.message ? error.message : String(error)
          }
        }
      };
    }
  }

  function write(action, data) {
    var payload = data || {};
    var token = getSessionToken();
    if (token && !payload.sessionToken) {
      payload.sessionToken = token;
    }

    return get(action, {
      payload: JSON.stringify(payload)
    });
  }

  function post(action, data) {
    var payload = data || {};
    var token = getSessionToken();
    if (token && !payload.sessionToken) {
      payload.sessionToken = token;
    }

    return request(action, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
  }

  function get(action, data) {
    return request(buildUrl(action, data || {}));
  }

  window.AffiliateSuccessApi = Object.freeze({
    request: request,
    getLastDebug: function () {
      return lastDebug;
    },
    health: function () {
      return request('health');
    },
    meta: function () {
      return request('meta');
    },
    login: function (data) {
      return get('login', data);
    },
    authLogin: function (data) {
      return get('authLogin', data);
    },
    getSession: function () {
      return request('getSession');
    },
    logout: function () {
      return post('logout', {});
    },
    dashboard: function () {
      return request('dashboard');
    },
    affiliates: function () {
      return request('affiliates');
    },
    followups: function () {
      return request('getFollowups');
    },
    tasks: function () {
      return request('tasks');
    },
    issues: function () {
      return request('issues');
    },
    interactions: function () {
      return request('interactions');
    },
    performance: function () {
      return request('performance');
    },
    getPerformance: function () {
      return request('getPerformance');
    },
    staff: function () {
      return request('staff');
    },
    brands: function () {
      return request('brands');
    },
    reports: function () {
      return request('reports');
    },
    leaderboard: function () {
      return request('leaderboard');
    },
    settings: function () {
      return request('settings');
    },
    createFollowup: function (data) {
      return write('createFollowup', data);
    },
    updateFollowup: function (data) {
      return write('updateFollowup', data);
    },
    completeFollowup: function (data) {
      return write('completeFollowup', data);
    },
    rescheduleFollowup: function (data) {
      return write('rescheduleFollowup', data);
    },
    createAffiliate: function (data) {
      return write('createAffiliate', data);
    },
    updateAffiliate: function (data) {
      return write('updateAffiliate', data);
    },
    createTask: function (data) {
      return write('createTask', data);
    },
    updateTask: function (data) {
      return write('updateTask', data);
    },
    completeTask: function (data) {
      return write('completeTask', data);
    },
    reopenTask: function (data) {
      return write('reopenTask', data);
    },
    createIssue: function (data) {
      return write('createIssue', data);
    },
    updateIssue: function (data) {
      return write('updateIssue', data);
    },
    resolveIssue: function (data) {
      return write('resolveIssue', data);
    },
    closeIssue: function (data) {
      return write('closeIssue', data);
    },
    reopenIssue: function (data) {
      return write('reopenIssue', data);
    },
    createInteraction: function (data) {
      return write('createInteraction', data);
    },
    addInteraction: function (data) {
      return write('addInteraction', data);
    },
    createBrand: function (data) {
      return write('createBrand', data);
    },
    updateBrand: function (data) {
      return write('updateBrand', data);
    },
    createStaff: function (data) {
      return write('createStaff', data);
    },
    updateStaff: function (data) {
      return write('updateStaff', data);
    },
    importCsvPreview: function (data) {
      return write('importCsvPreview', data);
    },
    importCsvCommit: function (data) {
      return write('importCsvCommit', data);
    },
    createPerformance: function (data) {
      return write('createPerformance', data);
    },
    updatePerformance: function (data) {
      return write('updatePerformance', data);
    },
    importPerformanceCsvPreview: function (data) {
      return write('importPerformanceCsvPreview', data);
    },
    importPerformanceCsvCommit: function (data) {
      return write('importPerformanceCsvCommit', data);
    }
  });
})(window);
