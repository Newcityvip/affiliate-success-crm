(function (window) {
  'use strict';

  var utils = window.AffiliateSuccessUtils;
  var api = window.AffiliateSuccessApi;
  var router = window.AffiliateSuccessRouter;

  function updateHealthCard(result) {
    var card = utils.qs('[data-health-status]');
    if (!card) {
      return;
    }

    var message = result && result.message ? result.message : 'Foundation shell initialized.';
    var text = card.querySelector('.muted');
    utils.setText(text, message);
  }

  async function initDashboard() {
    var result = await api.health();
    updateHealthCard(result);
  }

  function preventDisabledLoginSubmit() {
    var form = utils.qs('[data-login-form]');
    if (!form) {
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
    });
  }

  async function init() {
    var route = router.init();

    if (route.page === 'dashboard') {
      await initDashboard();
    }

    if (route.page === 'login') {
      preventDisabledLoginSubmit();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
