(function (window) {
  'use strict';

  var utils = window.AffiliateSuccessUtils;
  var api = window.AffiliateSuccessApi;
  var router = window.AffiliateSuccessRouter;

  var dashboardMetricLabels = {
    totalAffiliates: 'Live API data',
    healthyAffiliates: 'Live API data',
    todayFollowups: 'Live API data',
    overdueFollowups: 'Live API data',
    openIssues: 'Live API data',
    openTasks: 'Live API data',
    monthlyGrowth: 'Not provided by API',
    replyRate: 'Not provided by API'
  };

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

  function setDashboardLoading() {
    utils.setText(utils.qs('[data-dashboard-status]'), 'Loading dashboard statistics from the live Apps Script API.');
    utils.setText(utils.qs('[data-dashboard-badge]'), 'Loading');

    document.querySelectorAll('[data-metric]').forEach(function (metric) {
      utils.setText(metric, '...');
    });

    document.querySelectorAll('[data-metric-status]').forEach(function (status) {
      utils.setText(status, 'Loading live data');
    });
  }

  function setDashboardError(message) {
    utils.setText(utils.qs('[data-dashboard-status]'), message || 'Unable to load dashboard statistics.');
    utils.setText(utils.qs('[data-dashboard-badge]'), 'API error');

    document.querySelectorAll('[data-metric]').forEach(function (metric) {
      utils.setText(metric, '--');
    });

    document.querySelectorAll('[data-metric-status]').forEach(function (status) {
      utils.setText(status, 'API error');
    });
  }

  function metricValue(data, key) {
    if (data && data[key] !== null && data[key] !== undefined && data[key] !== '') {
      return data[key];
    }

    return 'N/A';
  }

  function renderDashboard(data) {
    document.querySelectorAll('[data-metric]').forEach(function (metric) {
      var key = metric.dataset.metric;
      utils.setText(metric, metricValue(data, key));
    });

    document.querySelectorAll('[data-metric-status]').forEach(function (status) {
      var metric = status.parentElement ? status.parentElement.querySelector('[data-metric]') : null;
      var key = metric ? metric.dataset.metric : '';
      utils.setText(status, dashboardMetricLabels[key] || 'Live API data');
    });

    utils.setText(utils.qs('[data-dashboard-status]'), 'Dashboard statistics loaded from the live Apps Script API.');
    utils.setText(utils.qs('[data-dashboard-badge]'), 'Live API data');
  }

  async function loadDashboard() {
    setDashboardLoading();

    var result = await api.dashboard();
    if (!result || !result.success) {
      setDashboardError(result && result.message ? result.message : 'Unable to load dashboard statistics.');
      return;
    }

    renderDashboard(result.data || {});
  }

  function initAppShell() {
    bindSidebar();
    bindNavigation();
    updatePage(router.routeFromHash());
    loadDashboard();
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
