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

    var response = await fetch(url, options || {});
    return response.json();
  }

  window.AffiliateSuccessApi = Object.freeze({
    request: request,
    health: function () {
      return request('health');
    },
    meta: function () {
      return request('meta');
    }
  });
})(window);
