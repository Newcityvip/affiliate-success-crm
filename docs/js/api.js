(function (window) {
  'use strict';

  var config = window.AffiliateSuccessConfig || {};

  function buildUrl(action) {
    if (!config.API_BASE_URL) {
      return '';
    }

    var url = new URL(config.API_BASE_URL);
    url.searchParams.set('action', action);
    return url.toString();
  }

  async function request(action, options) {
    var url = buildUrl(action);

    if (!url) {
      return {
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
      var payload = await response.json();

      if (!response.ok) {
        return {
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

  window.AffiliateSuccessApi = Object.freeze({
    request: request,
    health: function () {
      return request('health');
    },
    meta: function () {
      return request('meta');
    },
    dashboard: function () {
      return request('dashboard');
    }
  });
})(window);
