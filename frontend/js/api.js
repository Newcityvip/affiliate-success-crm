(function (window) {
  'use strict';

  var config = window.AffiliateSuccessConfig || {};
  var SESSION_KEY = 'affiliateSuccessSession';

  function getSessionToken() {
    try {
      var raw = window.localStorage.getItem(SESSION_KEY);
      var session = raw ? JSON.parse(raw) : null;
      return session && session.sessionToken ? session.sessionToken : '';
    } catch (error) {
      return '';
    }
  }

  function buildUrl(action) {
    if (!config.API_BASE_URL) {
      return '';
    }

    var url = new URL(config.API_BASE_URL);
    url.searchParams.set('action', action);
    if (action !== 'health' && action !== 'meta' && action !== 'login') {
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

    if (ok === undefined) {
      ok = normalized.success;
    }

    normalized.ok = ok === true;
    normalized.success = normalized.ok;
    normalized.code = normalized.code || (normalized.error && normalized.error.code) || '';
    normalized.message = normalized.message || (typeof normalized.error === 'string' ? normalized.error : 'API response received.');

    return normalized;
  }

  async function request(action, options) {
    var url = buildUrl(action);

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

      if (!response.ok) {
        return {
          ok: false,
          success: false,
          message: payload && payload.message ? payload.message : 'API request failed.',
          data: {},
          error: {
            code: 'HTTP_ERROR',
            details: {
              status: response.status
            }
          }
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

  window.AffiliateSuccessApi = Object.freeze({
    request: request,
    health: function () {
      return request('health');
    },
    meta: function () {
      return request('meta');
    },
    login: function (data) {
      return post('login', data);
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
