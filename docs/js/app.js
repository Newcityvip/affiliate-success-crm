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

  var affiliateColumns = [
    'Affiliate_ID',
    'Brand',
    'Affiliate_Name',
    'Affiliate_Username',
    'Country',
    'Language',
    'Assigned_Staff',
    'Status',
    'Health_Status',
    'Priority',
    'Segment',
    'Affiliate_Type',
    'Market_Channel',
    'Last_Contact_Date',
    'Next_Followup_Date',
    'Active'
  ];
  var affiliateFilterFields = ['Brand', 'Assigned_Staff', 'Health_Status', 'Status', 'Priority', 'Active'];
  var affiliateSearchFields = ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Assigned_Staff'];
  var affiliateState = {
    loaded: false,
    loading: false,
    all: [],
    filtered: []
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

    if (route.key === 'affiliates') {
      loadAffiliates();
    }
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

  function valueFor(row, key) {
    if (!row || row[key] === null || row[key] === undefined || row[key] === '') {
      return '';
    }

    return String(row[key]);
  }

  function displayValue(row, key) {
    var value = valueFor(row, key);
    if (!value) {
      return 'N/A';
    }

    if (key.indexOf('Date') !== -1) {
      return formatDate(value);
    }

    return value;
  }

  function formatDate(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function setAffiliatesVisibility(state) {
    var states = {
      loading: utils.qs('[data-affiliates-loading]'),
      error: utils.qs('[data-affiliates-error]'),
      empty: utils.qs('[data-affiliates-empty]'),
      table: utils.qs('[data-affiliates-table-wrap]')
    };

    Object.keys(states).forEach(function (key) {
      if (states[key]) {
        states[key].hidden = key !== state;
      }
    });
  }

  function setAffiliatesCount(showing, total) {
    utils.setText(utils.qs('[data-affiliates-count]'), 'Showing ' + showing + ' of ' + total + ' affiliates');
  }

  function setAffiliatesError(message) {
    setAffiliatesVisibility('error');
    utils.setText(utils.qs('[data-affiliates-error-message]'), message || 'Unable to load affiliates.');
    setAffiliatesCount(0, affiliateState.all.length);
  }

  function populateAffiliateFilters(items) {
    affiliateFilterFields.forEach(function (field) {
      var select = utils.qs('[data-affiliate-filter="' + field + '"]');
      if (!select) {
        return;
      }

      var current = select.value;
      while (select.options.length > 1) {
        select.remove(1);
      }

      var values = [];
      items.forEach(function (item) {
        var value = valueFor(item, field);
        if (value && values.indexOf(value) === -1) {
          values.push(value);
        }
      });

      values.sort().forEach(function (value) {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      select.value = values.indexOf(current) !== -1 ? current : '';
    });
  }

  function affiliateMatchesSearch(row, query) {
    if (!query) {
      return true;
    }

    return affiliateSearchFields.some(function (field) {
      return valueFor(row, field).toLowerCase().indexOf(query) !== -1;
    });
  }

  function affiliateMatchesFilters(row) {
    return affiliateFilterFields.every(function (field) {
      var select = utils.qs('[data-affiliate-filter="' + field + '"]');
      return !select || !select.value || valueFor(row, field) === select.value;
    });
  }

  function filterAffiliates() {
    var search = utils.qs('[data-affiliate-search]');
    var query = search ? search.value.trim().toLowerCase() : '';

    affiliateState.filtered = affiliateState.all.filter(function (row) {
      return affiliateMatchesSearch(row, query) && affiliateMatchesFilters(row);
    });

    renderAffiliates();
  }

  function renderAffiliates() {
    var body = utils.qs('[data-affiliates-body]');
    if (!body) {
      return;
    }

    body.innerHTML = '';

    affiliateState.filtered.forEach(function (row, index) {
      var tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.dataset.affiliateIndex = String(index);
      tr.setAttribute('role', 'button');
      tr.setAttribute('aria-label', 'Open affiliate profile for ' + (valueFor(row, 'Affiliate_Name') || valueFor(row, 'Affiliate_ID') || 'affiliate'));

      affiliateColumns.forEach(function (column) {
        var td = document.createElement('td');
        td.textContent = displayValue(row, column);
        tr.appendChild(td);
      });

      tr.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openAffiliateDrawer(row);
        }
      });

      body.appendChild(tr);
    });

    setAffiliatesCount(affiliateState.filtered.length, affiliateState.all.length);
    setAffiliatesVisibility(affiliateState.filtered.length ? 'table' : 'empty');
  }

  function openAffiliateDrawer(row) {
    var drawer = utils.qs('[data-affiliate-drawer]');
    var fields = utils.qs('[data-affiliate-drawer-fields]');
    if (!drawer || !fields) {
      return;
    }

    utils.setText(utils.qs('[data-affiliate-drawer-name]'), valueFor(row, 'Affiliate_Name') || valueFor(row, 'Affiliate_ID') || 'Affiliate profile');
    fields.innerHTML = '';

    Object.keys(row).forEach(function (key) {
      var item = document.createElement('div');
      var label = document.createElement('span');
      var value = document.createElement('strong');

      item.className = 'drawer-field';
      label.textContent = key;
      value.textContent = displayValue(row, key);
      item.appendChild(label);
      item.appendChild(value);
      fields.appendChild(item);
    });

    drawer.hidden = false;
  }

  function closeAffiliateDrawer() {
    var drawer = utils.qs('[data-affiliate-drawer]');
    if (drawer) {
      drawer.hidden = true;
    }
  }

  async function loadAffiliates() {
    if (affiliateState.loaded || affiliateState.loading) {
      return;
    }

    affiliateState.loading = true;
    setAffiliatesVisibility('loading');
    utils.setText(utils.qs('[data-affiliates-count]'), 'Loading affiliates...');

    var result = await api.affiliates();
    affiliateState.loading = false;

    if (!result || !result.success) {
      setAffiliatesError(result && result.message ? result.message : 'Unable to load affiliates.');
      return;
    }

    affiliateState.all = result.data && Array.isArray(result.data.items) ? result.data.items : [];
    affiliateState.loaded = true;
    populateAffiliateFilters(affiliateState.all);
    filterAffiliates();
  }

  function bindAffiliateControls() {
    var search = utils.qs('[data-affiliate-search]');
    if (search) {
      search.addEventListener('input', filterAffiliates);
    }

    document.querySelectorAll('[data-affiliate-filter]').forEach(function (filter) {
      filter.addEventListener('change', filterAffiliates);
    });

    var closeButton = utils.qs('[data-affiliate-drawer-close]');
    if (closeButton) {
      closeButton.addEventListener('click', function (event) {
        event.stopPropagation();
        closeAffiliateDrawer();
      });
    }

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeAffiliateDrawer();
      }
    });

    document.addEventListener('click', function (event) {
      var drawer = utils.qs('[data-affiliate-drawer]');
      if (!drawer || drawer.hidden) {
        return;
      }

      if (drawer.contains(event.target)) {
        return;
      }

      if (event.target.closest('[data-affiliates-body] tr')) {
        return;
      }

      closeAffiliateDrawer();
    });

    var body = utils.qs('[data-affiliates-body]');
    if (body) {
      body.addEventListener('click', function (event) {
        var row = event.target.closest('tr[data-affiliate-index]');
        if (!row) {
          return;
        }

        var index = Number(row.dataset.affiliateIndex);
        if (!isNaN(index) && affiliateState.filtered[index]) {
          openAffiliateDrawer(affiliateState.filtered[index]);
        }
      });
    }
  }

  function initAppShell() {
    bindSidebar();
    bindNavigation();
    bindAffiliateControls();
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
