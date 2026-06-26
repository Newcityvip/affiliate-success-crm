(function (window) {
  'use strict';

  var config = window.AffiliateSuccessConfig || {};
  var SESSION_KEY = 'affiliateSuccessSession';
  var PUBLIC_ACTIONS = ['health', 'meta', 'login', 'authlogin', 'authdebug', 'debugsheets'];

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

    if (!url) {
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
      return post('createFollowup', data);
    },
    updateFollowup: function (data) {
      return post('updateFollowup', data);
    },
    completeFollowup: function (data) {
      return post('completeFollowup', data);
    }
  });
})(window);
