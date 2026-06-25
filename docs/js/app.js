(function (window) {
  'use strict';

  var utils = window.AffiliateSuccessUtils;
  var router = window.AffiliateSuccessRouter;

  function setSidebar(open) {
    var body = document.body;
    var openButton = utils.qs('[data-sidebar-open]');
    var backdrop = utils.qs('[data-sidebar-backdrop]');

    body.classList.toggle('is-sidebar-open', open);

    if (openButton) {
      openButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    if (backdrop) {
      backdrop.hidden = !open;
    }
  }

  function updatePage(routeKey) {
    var route = router.getRoute(routeKey);

    utils.setText(utils.qs('[data-page-title]'), route.meta.title);
    utils.setText(utils.qs('[data-page-kicker]'), route.meta.kicker);
    utils.setText(utils.qs('[data-page-heading]'), route.meta.heading);
    utils.setText(utils.qs('[data-page-description]'), route.meta.description);

    document.querySelectorAll('[data-route]').forEach(function (item) {
      item.classList.toggle('is-active', item.dataset.route === route.key);
    });

    document.querySelectorAll('[data-section]').forEach(function (section) {
      section.classList.toggle('is-active', section.dataset.section === route.key);
    });
  }

  function bindNavigation() {
    document.querySelectorAll('[data-route]').forEach(function (item) {
      item.addEventListener('click', function (event) {
        var route = item.dataset.route;

        if (!route) {
          return;
        }

        event.preventDefault();
        window.location.hash = route;
        updatePage(route);
        setSidebar(false);
      });
    });

    window.addEventListener('hashchange', function () {
      updatePage(router.routeFromHash());
    });
  }

  function bindSidebar() {
    var openButton = utils.qs('[data-sidebar-open]');
    var closeButton = utils.qs('[data-sidebar-close]');
    var backdrop = utils.qs('[data-sidebar-backdrop]');

    if (openButton) {
      openButton.addEventListener('click', function () {
        setSidebar(true);
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', function () {
        setSidebar(false);
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', function () {
        setSidebar(false);
      });
    }

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setSidebar(false);
      }
    });
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

  function initAppShell() {
    bindSidebar();
    bindNavigation();
    updatePage(router.routeFromHash());
  }

  function init() {
    if (!document.body) {
      return;
    }

    if (document.body.dataset.page === 'app') {
      initAppShell();
    }

    if (document.body.dataset.page === 'login') {
      preventDisabledLoginSubmit();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
