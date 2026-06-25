(function (window) {
  'use strict';

  function currentPage() {
    return document.body ? document.body.dataset.page || 'dashboard' : 'dashboard';
  }

  function initRouter() {
    return {
      page: currentPage()
    };
  }

  window.AffiliateSuccessRouter = Object.freeze({
    init: initRouter,
    currentPage: currentPage
  });
})(window);
