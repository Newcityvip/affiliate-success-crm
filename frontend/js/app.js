(function (window) {
  'use strict';

  var utils = window.AffiliateSuccessUtils;
  var api = window.AffiliateSuccessApi;
  var router = window.AffiliateSuccessRouter;
  var auth = window.AffiliateSuccessAuth;
  var currentUser = null;
  var staffAllowedRoutes = ['dashboard', 'affiliates', 'followups', 'interactions', 'tasks', 'issues', 'performance', 'brands', 'settings'];

  var dashboardMetricLabels = {
    totalAffiliates: 'Live API data',
    healthyAffiliates: 'Live API data',
    todayFollowups: 'Live API data',
    overdueFollowups: 'Live API data',
    openTasks: 'Live API data',
    openIssues: 'Live API data',
    completedFollowups: 'Live API data',
    upcomingFollowups: 'Live API data',
    activeBrands: 'Live API data',
    staffMembers: 'Live API data'
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
  var affiliateBadgeFields = ['Health_Status', 'Status', 'Priority', 'Active'];
  var affiliateKeyFields = ['Affiliate_Name', 'Brand', 'Affiliate_ID', 'Assigned_Staff', 'Health_Status', 'Status'];
  var followupColumns = [
    'Queue_ID',
    'Affiliate_ID',
    'Affiliate_Name',
    'Brand',
    'Assigned_Staff',
    'Followup_Date',
    'Priority',
    'Status',
    'Generated_From',
    'Actions'
  ];
  var followupFilterFields = ['Assigned_Staff', 'Priority', 'Status'];
  var followupSearchFields = ['Affiliate_ID', 'Affiliate_Name', 'Brand'];
  var followupBadgeFields = ['Priority', 'Status'];
  var affiliateState = {
    loaded: false,
    loading: false,
    all: [],
    filtered: []
  };
  var dashboardState = {
    data: null,
    loaded: false
  };
  var followupState = {
    loaded: false,
    loading: false,
    all: [],
    filtered: [],
    mode: 'create',
    groups: {
      today: [],
      overdue: [],
      upcoming: [],
      completed: []
    }
  };
  var recordState = {
    type: '',
    context: {}
  };
  var importState = {
    type: '',
    preview: null
  };
  var recordForms = {
    affiliate: {
      title: 'New Affiliate',
      api: 'createAffiliate',
      updateApi: 'updateAffiliate',
      idKey: 'Affiliate_ID',
      adminOnly: true,
      required: ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Language', 'Assigned_Staff', 'Status', 'Health_Status', 'Priority', 'Active'],
      sections: {
        'Basic Info': ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Language'],
        Assignment: ['Assigned_Staff'],
        'Status & Priority': ['Status', 'Health_Status', 'Priority', 'Segment', 'Affiliate_Type', 'Market_Channel', 'Active'],
        'Follow-up Plan': ['Next_Followup_Date']
      },
      fields: ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Language', 'Assigned_Staff', 'Status', 'Health_Status', 'Priority', 'Segment', 'Affiliate_Type', 'Market_Channel', 'Next_Followup_Date', 'Active']
    },
    task: {
      title: 'Create Task',
      api: 'createTask',
      updateApi: 'updateTask',
      idKey: 'Task_ID',
      required: ['Affiliate_ID', 'Title', 'Task', 'Assigned_Staff', 'Due_Date', 'Priority', 'Status'],
      sections: {
        'Basic Info': ['Affiliate_ID', 'Title', 'Task'],
        Assignment: ['Assigned_Staff'],
        'Status & Priority': ['Due_Date', 'Priority', 'Status']
      },
      fields: ['Affiliate_ID', 'Title', 'Task', 'Assigned_Staff', 'Due_Date', 'Priority', 'Status']
    },
    issue: {
      title: 'Create Issue',
      api: 'createIssue',
      updateApi: 'updateIssue',
      idKey: 'Issue_ID',
      required: ['Affiliate_ID', 'Issue', 'Brand', 'Assigned_Staff', 'Priority', 'Status'],
      sections: {
        'Basic Info': ['Affiliate_ID', 'Issue', 'Brand'],
        Assignment: ['Assigned_Staff'],
        'Status & Priority': ['Priority', 'Status']
      },
      fields: ['Affiliate_ID', 'Issue', 'Brand', 'Assigned_Staff', 'Priority', 'Status']
    },
    interaction: {
      title: 'Add Interaction',
      api: 'createInteraction',
      idKey: 'Interaction_ID',
      required: ['Affiliate_ID', 'Affiliate_Name', 'Brand', 'Assigned_Staff', 'Interaction_Type', 'Notes', 'Status'],
      sections: {
        'Basic Info': ['Affiliate_ID', 'Affiliate_Name', 'Brand'],
        Assignment: ['Assigned_Staff'],
        Notes: ['Interaction_Type', 'Notes', 'Status']
      },
      fields: ['Affiliate_ID', 'Affiliate_Name', 'Brand', 'Assigned_Staff', 'Interaction_Type', 'Notes', 'Status']
    },
    brand: {
      title: 'New Brand',
      api: 'createBrand',
      updateApi: 'updateBrand',
      idKey: 'Brand_ID',
      adminOnly: true,
      required: ['Brand_Name', 'Market', 'Active'],
      sections: {
        'Basic Info': ['Brand_Name', 'Brand', 'Market'],
        Assignment: ['Owner'],
        'Status & Priority': ['Status', 'Active']
      },
      fields: ['Brand', 'Brand_Name', 'Market', 'Owner', 'Status', 'Active']
    },
    staff: {
      title: 'New Staff',
      api: 'createStaff',
      updateApi: 'updateStaff',
      idKey: 'Staff_ID',
      adminOnly: true,
      required: ['Login_ID', 'Staff_Name', 'Role', 'Team', 'Email', 'Active', 'Permission_Level'],
      sections: {
        'Basic Info': ['Login_ID', 'Staff_Name', 'Email', 'Telegram'],
        Assignment: ['Role', 'Team', 'Permission_Level'],
        'Status & Priority': ['Active', 'Allowed_IPs', 'Max_Affiliates', 'Can_View_All']
      },
      fields: ['Login_ID', 'Staff_Name', 'Role', 'Team', 'Email', 'Telegram', 'Active', 'Allowed_IPs', 'Permission_Level', 'Max_Affiliates', 'Can_View_All']
    }
  };
  var fieldLabels = {
    Affiliate_ID: 'Affiliate ID',
    Affiliate_Name: 'Affiliate name',
    Affiliate_Username: 'Username',
    Assigned_Staff: 'Assigned staff',
    Health_Status: 'Health status',
    Next_Followup_Date: 'Next follow-up date',
    Last_Contact_Date: 'Last contact date',
    Affiliate_Type: 'Affiliate type',
    Market_Channel: 'Market channel',
    Followup_Date: 'Follow-up date',
    Generated_From: 'Generated from',
    Due_Date: 'Due date',
    Login_ID: 'Login ID',
    Staff_Name: 'Staff name',
    Permission_Level: 'Permission level',
    Can_View_All: 'Can view all',
    Brand_Name: 'Brand name',
    Interaction_Type: 'Interaction type'
  };
  var csvConfigs = {
    affiliate: {
      title: 'Import Affiliates',
      required: ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Language', 'Telegram', 'WhatsApp', 'Email', 'Assigned_Staff', 'Status', 'Health_Status', 'Priority', 'Segment', 'Affiliate_Type', 'Market_Channel', 'Next_Followup_Date', 'Active']
    },
    followup: {
      title: 'Import Follow-ups',
      required: ['Affiliate_ID', 'Assigned_Staff', 'Followup_Date', 'Priority', 'Status', 'Notes']
    },
    task: {
      title: 'Import Tasks',
      required: ['Affiliate_ID', 'Title', 'Task', 'Assigned_Staff', 'Due_Date', 'Priority', 'Status']
    },
    issue: {
      title: 'Import Issues',
      required: ['Affiliate_ID', 'Issue', 'Brand', 'Assigned_Staff', 'Priority', 'Status']
    },
    interaction: {
      title: 'Import Interactions',
      required: ['Affiliate_ID', 'Affiliate_Name', 'Brand', 'Assigned_Staff', 'Interaction_Type', 'Notes', 'Status']
    },
    staff: {
      title: 'Import Staff',
      required: ['Staff_ID', 'Login_ID', 'Staff_Name', 'Role', 'Team', 'Email', 'Active', 'Permission_Level']
    },
    brand: {
      title: 'Import Brands',
      required: ['Brand_ID', 'Brand_Name', 'Market', 'Active']
    }
  };
  var moduleRoutes = ['interactions', 'tasks', 'issues', 'performance', 'leaderboard', 'reports', 'staff', 'brands', 'settings'];
  var moduleState = {};
  var moduleConfigs = {
    interactions: {
      api: 'interactions',
      itemName: 'interactions',
      mode: 'timeline',
      search: ['Affiliate_Name', 'Affiliate', 'Affiliate_ID', 'Brand', 'Assigned_Staff', 'Staff', 'Type', 'Interaction_Type', 'Notes', 'Summary', 'Status'],
      filters: [
        { label: 'Affiliate', key: 'Affiliate_Name', fallback: ['Affiliate', 'Affiliate_ID'] },
        { label: 'Brand', key: 'Brand' },
        { label: 'Staff', key: 'Assigned_Staff', fallback: ['Staff'] },
        { label: 'Type', key: 'Interaction_Type', fallback: ['Type'] },
        { label: 'Date', key: 'Date', type: 'date', fallback: ['Interaction_Date', 'Timestamp'] }
      ],
      stats: [
        { label: 'Total interactions', type: 'total' },
        { label: 'This week', type: 'thisWeek', dateKeys: ['Date', 'Interaction_Date', 'Timestamp'] },
        { label: 'Staff touched', type: 'unique', keys: ['Assigned_Staff', 'Staff'] }
      ],
      columns: [
        { label: 'Date', keys: ['Date', 'Interaction_Date', 'Timestamp'], format: 'date' },
        { label: 'Affiliate', keys: ['Affiliate_Name', 'Affiliate', 'Affiliate_ID'] },
        { label: 'Brand', keys: ['Brand'] },
        { label: 'Staff', keys: ['Assigned_Staff', 'Staff'] },
        { label: 'Type', keys: ['Interaction_Type', 'Type'] },
        { label: 'Notes', keys: ['Notes', 'Summary', 'Description'] }
      ]
    },
    tasks: {
      api: 'tasks',
      itemName: 'tasks',
      search: ['Task_ID', 'Title', 'Task', 'Affiliate_Name', 'Affiliate_ID', 'Assigned_Staff', 'Status', 'Priority'],
      filters: [
        { label: 'Status', key: 'Status', fallback: ['Task_Status'] },
        { label: 'Priority', key: 'Priority' },
        { label: 'Assigned Staff', key: 'Assigned_Staff', fallback: ['Assigned Staff', 'Staff'] },
        { label: 'Due Date', key: 'Due_Date', type: 'date', fallback: ['Due Date', 'Date'] }
      ],
      stats: [
        { label: 'Open', type: 'open' },
        { label: 'Due today', type: 'today', dateKeys: ['Due_Date', 'Due Date', 'Date'] },
        { label: 'Overdue', type: 'overdue', dateKeys: ['Due_Date', 'Due Date', 'Date'] },
        { label: 'Completed', type: 'completed' }
      ],
      columns: [
        { label: 'Task', keys: ['Title', 'Task', 'Task_Title', 'Task_ID'] },
        { label: 'Affiliate', keys: ['Affiliate_Name', 'Affiliate_ID'] },
        { label: 'Priority', keys: ['Priority'], badge: 'Priority' },
        { label: 'Status', keys: ['Status', 'Task_Status'], badge: 'Status' },
        { label: 'Assigned Staff', keys: ['Assigned_Staff', 'Assigned Staff', 'Staff'] },
        { label: 'Due Date', keys: ['Due_Date', 'Due Date', 'Date'], format: 'date' }
      ],
      actions: [
        { label: 'Start', status: 'In Progress', api: 'updateTask', when: 'open' },
        { label: 'Complete', api: 'completeTask', tone: 'primary', when: 'open' },
        { label: 'Reopen', api: 'reopenTask', when: 'closed' },
        { label: 'Reschedule', form: 'task', when: 'open' }
      ]
    },
    issues: {
      api: 'issues',
      itemName: 'issues',
      search: ['Issue_ID', 'Issue', 'Affiliate_Name', 'Affiliate_ID', 'Brand', 'Assigned_Staff', 'Status', 'Priority'],
      filters: [
        { label: 'Status', key: 'Status', fallback: ['Issue_Status'] },
        { label: 'Priority', key: 'Priority' },
        { label: 'Assigned Staff', key: 'Assigned_Staff', fallback: ['Assigned Staff', 'Staff'] },
        { label: 'Brand', key: 'Brand' }
      ],
      stats: [
        { label: 'Open', type: 'open' },
        { label: 'Urgent', type: 'priority', values: ['high', 'critical'] },
        { label: 'Overdue', type: 'overdue', dateKeys: ['Due_Date', 'Created_Date', 'Date'] },
        { label: 'Resolved', type: 'completed' }
      ],
      columns: [
        { label: 'Issue', keys: ['Issue_ID', 'Issue', 'Title'] },
        { label: 'Affiliate', keys: ['Affiliate_Name', 'Affiliate_ID'] },
        { label: 'Brand', keys: ['Brand'] },
        { label: 'Priority', keys: ['Priority'], badge: 'Priority' },
        { label: 'Status', keys: ['Status', 'Issue_Status'], badge: 'Status' },
        { label: 'Assigned Staff', keys: ['Assigned_Staff', 'Assigned Staff', 'Staff'] },
        { label: 'Created', keys: ['Created_Date', 'Date'], format: 'date' }
      ],
      actions: [
        { label: 'Add update', form: 'issue' },
        { label: 'Escalate', status: 'Escalated', api: 'updateIssue', when: 'open' },
        { label: 'Resolve', api: 'closeIssue', tone: 'primary', when: 'open' },
        { label: 'Reopen', api: 'reopenIssue', when: 'closed' }
      ]
    },
    performance: {
      api: 'performance',
      itemName: 'performance rows',
      search: ['Month', 'Brand', 'Affiliate_Name', 'Affiliate_ID', 'Assigned_Staff', 'Revenue', 'NGR', 'Commission'],
      filters: [
        { label: 'Month', key: 'Month', fallback: ['Performance_Month', 'Period'] },
        { label: 'Brand', key: 'Brand' },
        { label: 'Staff', key: 'Assigned_Staff', fallback: ['Staff'] }
      ],
      stats: [
        { label: 'Rows', type: 'total' },
        { label: 'Brands', type: 'unique', keys: ['Brand'] },
        { label: 'Affiliates', type: 'unique', keys: ['Affiliate_Name', 'Affiliate_ID'] }
      ],
      columns: [
        { label: 'Month', keys: ['Month', 'Performance_Month', 'Period'] },
        { label: 'Brand', keys: ['Brand'] },
        { label: 'Affiliate', keys: ['Affiliate_Name', 'Affiliate_ID'] },
        { label: 'FTD', keys: ['FTD', 'FTDs'] },
        { label: 'Revenue/NGR', keys: ['Revenue', 'NGR', 'Commission'] },
        { label: 'Growth', keys: ['Growth', 'Growth_Rate'] }
      ]
    },
    staff: {
      api: 'staff',
      itemName: 'staff members',
      search: ['Staff_Name', 'Name', 'Staff_ID', 'Role', 'Team', 'Status'],
      filters: [
        { label: 'Role', key: 'Role' },
        { label: 'Team', key: 'Team' },
        { label: 'Status', key: 'Status' }
      ],
      stats: [
        { label: 'Staff', type: 'total' },
        { label: 'Active', type: 'status', values: ['active', 'yes', 'true'] },
        { label: 'Teams', type: 'unique', keys: ['Team'] }
      ],
      columns: [
        { label: 'Staff', keys: ['Staff_Name', 'Name', 'Staff_ID'] },
        { label: 'Role', keys: ['Role'] },
        { label: 'Team', keys: ['Team'] },
        { label: 'Status', keys: ['Status'], badge: 'Status' },
        { label: 'Email', keys: ['Email'] }
      ]
    },
    brands: {
      api: 'brands',
      itemName: 'brands',
      search: ['Brand', 'Brand_Name', 'Name', 'Market', 'Owner', 'Status'],
      filters: [
        { label: 'Market', key: 'Market' },
        { label: 'Owner', key: 'Owner' },
        { label: 'Status', key: 'Status' }
      ],
      stats: [
        { label: 'Brands', type: 'total' },
        { label: 'Active', type: 'status', values: ['active', 'yes', 'true'] }
      ],
      columns: [
        { label: 'Brand', keys: ['Brand', 'Brand_Name', 'Name'] },
        { label: 'Market', keys: ['Market'] },
        { label: 'Owner', keys: ['Owner'] },
        { label: 'Status', keys: ['Status'], badge: 'Status' },
        { label: 'Notes', keys: ['Notes', 'Description'] }
      ]
    },
    reports: {
      api: 'reports',
      itemName: 'report previews',
      mode: 'cards',
      stats: [{ label: 'Report previews', type: 'total' }],
      columns: [
        { label: 'Report', keys: ['title'] },
        { label: 'Summary', keys: ['summary'] },
        { label: 'Count', keys: ['count'] },
        { label: 'Status', keys: ['status'] }
      ]
    },
    leaderboard: {
      api: 'leaderboard',
      itemName: 'leaderboard rows',
      mode: 'leaderboard',
      stats: [{ label: 'Ranking groups', type: 'total' }]
    },
    settings: {
      api: 'settings',
      itemName: 'settings checks',
      mode: 'cards',
      stats: [{ label: 'Safe settings checks', type: 'total' }],
      columns: [
        { label: 'Setting', keys: ['label'] },
        { label: 'Value', keys: ['value'] }
      ]
    }
  };

  moduleRoutes.forEach(function (route) {
    moduleState[route] = {
      loaded: false,
      loading: false,
      all: [],
      filtered: [],
      raw: {}
    };
  });

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
    var canAccess = canAccessRoute(route.key);

    utils.setText(utils.qs('[data-page-title]'), route.meta.title);
    utils.setText(utils.qs('[data-page-kicker]'), route.meta.kicker);
    utils.setText(utils.qs('[data-page-heading]'), route.meta.heading);
    utils.setText(utils.qs('[data-page-description]'), route.meta.description);
    updateCommandCenter(route.key);

    document.querySelectorAll('[data-route]').forEach(function (item) {
      item.classList.toggle('is-active', canAccess && item.dataset.route === route.key);
    });

    document.querySelectorAll('[data-section]').forEach(function (section) {
      section.classList.toggle('is-active', canAccess ? section.dataset.section === route.key : section.dataset.section === 'restricted');
    });

    if (!canAccess) {
      utils.setText(utils.qs('[data-page-title]'), 'Restricted');
      renderCommandSummary([
        { label: 'role', value: getRoleLabel(), tone: 'amber' },
        { label: 'access', value: 'Restricted', tone: 'red' }
      ]);
      return;
    }

    if (route.key === 'affiliates') {
      loadAffiliates();
    }

    if (route.key === 'followups') {
      loadFollowups();
    }

    if (moduleRoutes.indexOf(route.key) !== -1) {
      loadModule(route.key);
    }
  }

  function getCurrentRouteKey() {
    return router.routeFromHash();
  }

  function setGreeting() {
    var hour = new Date().getHours();
    var part = 'Morning';
    if (hour >= 12 && hour < 17) {
      part = 'Afternoon';
    } else if (hour >= 17) {
      part = 'Evening';
    }

    utils.setText(utils.qs('[data-command-greeting]'), 'Good ' + part + ', ' + getUserName());
  }

  function getUserName() {
    return currentUser && currentUser.name ? currentUser.name : 'Staff User';
  }

  function getRoleLabel() {
    return currentUser && currentUser.role ? currentUser.role.replace(/_/g, ' ') : 'STAFF';
  }

  function isAdminUser() {
    return auth && auth.isAdmin ? auth.isAdmin(currentUser) : false;
  }

  function canAccessRoute(routeKey) {
    if (isAdminUser()) {
      return true;
    }

    return staffAllowedRoutes.indexOf(routeKey) !== -1;
  }

  function setGlobalStatus(label, tone) {
    var status = utils.qs('[data-global-status]');
    if (!status) {
      return;
    }

    status.classList.toggle('is-live', tone === 'live');
    status.classList.toggle('is-error', tone === 'error');
    status.textContent = label;
  }

  function renderCommandSummary(items) {
    var summary = utils.qs('[data-command-summary]');
    if (!summary) {
      return;
    }

    summary.innerHTML = '';
    items.forEach(function (item) {
      var pill = document.createElement('span');
      var value = document.createElement('strong');

      pill.className = 'summary-pill is-' + (item.tone || 'neutral');
      value.textContent = displayPlainValue(item.value);
      pill.appendChild(value);
      pill.appendChild(document.createTextNode(' ' + item.label));
      summary.appendChild(pill);
    });
  }

  function updateCommandCenter(routeKey) {
    setGreeting();

    if (routeKey === 'dashboard') {
      renderDashboardCommandSummary();
      return;
    }

    if (routeKey === 'affiliates') {
      if (!affiliateState.loaded) {
        renderCommandSummary([
          { label: 'affiliate directory', value: 'Loading', tone: 'neutral' },
          { label: 'data changes', value: 'None', tone: 'green' }
        ]);
        return;
      }

      renderCommandSummary([
        { label: 'loaded affiliates', value: affiliateState.all.length, tone: 'cyan' },
        { label: 'showing now', value: affiliateState.filtered.length || 0, tone: 'blue' }
      ]);
      return;
    }

    if (routeKey === 'followups') {
      renderFollowupCommandSummary();
      return;
    }

    if (moduleRoutes.indexOf(routeKey) !== -1) {
      renderModuleCommandSummary(routeKey);
      return;
    }

    renderCommandSummary([
      { label: 'module preview', value: 'Later sprint', tone: 'neutral' },
      { label: 'data changes', value: 'None', tone: 'green' }
    ]);
  }

  function renderDashboardCommandSummary() {
    if (!dashboardState.loaded) {
      renderCommandSummary([
        { label: 'workspace context', value: 'Loading', tone: 'neutral' },
        { label: 'data changes', value: 'None', tone: 'green' }
      ]);
      return;
    }

    var data = dashboardState.data || {};
    renderCommandSummary([
      { label: 'affiliates', value: metricValue(data, 'totalAffiliates'), tone: 'cyan' },
      { label: 'due today', value: metricValue(data, 'todayFollowups'), tone: 'blue' },
      { label: 'overdue', value: metricValue(data, 'overdueFollowups'), tone: 'red' },
      { label: 'open issues', value: metricValue(data, 'openIssues'), tone: 'amber' }
    ]);
  }

  function renderFollowupCommandSummary() {
    if (!followupState.loaded && followupState.loading) {
      renderCommandSummary([
        { label: 'queue', value: 'Loading', tone: 'neutral' },
        { label: 'data changes', value: 'None', tone: 'green' }
      ]);
      return;
    }

    renderCommandSummary([
      { label: 'today', value: followupState.groups.today.length, tone: 'blue' },
      { label: 'overdue', value: followupState.groups.overdue.length, tone: 'red' },
      { label: 'upcoming', value: followupState.groups.upcoming.length, tone: 'amber' },
      { label: 'completed', value: followupState.groups.completed.length, tone: 'green' }
    ]);
  }

  function renderModuleCommandSummary(routeKey) {
    var state = moduleState[routeKey];
    var config = moduleConfigs[routeKey] || {};
    if (!state || !state.loaded) {
      renderCommandSummary([
        { label: config.itemName || 'records', value: state && state.loading ? 'Loading' : 'Ready', tone: 'neutral' },
        { label: 'data changes', value: 'None', tone: 'green' }
      ]);
      return;
    }

    renderCommandSummary([
      { label: config.itemName || 'records', value: state.all.length, tone: 'cyan' },
      { label: 'showing now', value: state.filtered.length, tone: 'blue' }
    ]);
  }

  function displayPlainValue(value) {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    return String(value);
  }

  function isSuccessfulResult(result) {
    if (result && (result.ok || result.success)) {
      return true;
    }

    if (result && result.code === 'UNAUTHORIZED') {
      if (auth && auth.clearSession) {
        auth.clearSession();
      }
      window.location.href = 'login.html?expired=1';
    }

    return false;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function firstDefined() {
    for (var index = 0; index < arguments.length; index += 1) {
      if (arguments[index] !== null && arguments[index] !== undefined && arguments[index] !== '') {
        return arguments[index];
      }
    }

    return '';
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

  function bindLoginForm() {
    var form = utils.qs('[data-login-form]');
    var message = utils.qs('[data-login-message]');
    var submit = utils.qs('[data-login-submit]');
    var params = new URLSearchParams(window.location.search);

    if (!form) {
      return;
    }

    if (auth.getCurrentSession() && params.get('expired') !== '1') {
      window.location.href = 'index.html#dashboard';
      return;
    }

    if (params.get('expired') === '1') {
      utils.setText(message, 'Your session expired. Sign in again to continue.');
    }

    form.addEventListener('submit', function (event) {
      var loginId = form.loginId ? form.loginId.value.trim() : '';
      event.preventDefault();

      if (!loginId) {
        utils.setText(message, 'Enter your Login ID.');
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Signing in...';
      }
      utils.setText(message, 'Checking staff access...');

      auth.login(loginId).then(function (result) {
        if (!isSuccessfulResult(result)) {
          utils.setText(message, result && result.message ? result.message : 'Unable to sign in.');
          return;
        }

        window.location.href = 'index.html#dashboard';
      }).catch(function () {
        utils.setText(message, 'Unable to sign in. Check the Apps Script deployment.');
      }).finally(function () {
        if (submit) {
          submit.disabled = false;
          submit.textContent = 'Sign in';
        }
      });
    });
  }

  function ensureSession() {
    var session = auth && auth.getCurrentSession ? auth.getCurrentSession() : null;

    if (!session || !session.sessionToken) {
      window.location.href = 'login.html';
      return false;
    }

    currentUser = session.user || {};
    return true;
  }

  function applyUserToShell() {
    var initials = getUserName().split(/\s+/).map(function (part) {
      return part.charAt(0);
    }).join('').slice(0, 2).toUpperCase() || 'ST';

    utils.setText(utils.qs('[data-profile-name]'), getUserName());
    utils.setText(utils.qs('[data-profile-role]'), getRoleLabel());
    utils.setText(utils.qs('[data-profile-initials]'), initials);

    document.querySelectorAll('[data-role-scope="admin"]').forEach(function (item) {
      item.hidden = !isAdminUser();
    });

    document.querySelectorAll('[data-quick-action]').forEach(function (button) {
      var action = button.dataset.quickAction;
      if (!isAdminUser() && action === 'affiliate') {
        button.hidden = true;
      }
    });

    document.querySelectorAll('[data-admin-action]').forEach(function (button) {
      var action = button.dataset.adminAction;
      if (!isAdminUser() && (action === 'affiliate' || action === 'staff' || (recordForms[action] && recordForms[action].adminOnly))) {
        button.hidden = true;
      }
    });

    if (!isAdminUser()) {
      setNavLabel('dashboard', 'My Dashboard');
      setNavLabel('affiliates', 'My Affiliates');
      setNavLabel('followups', 'My Follow-ups');
      setNavLabel('interactions', 'My Interactions');
      setNavLabel('tasks', 'My Tasks');
      setNavLabel('issues', 'My Issues');
      setNavLabel('performance', 'My Performance');
    }
  }

  function setNavLabel(routeKey, label) {
    var item = utils.qs('.sidebar-nav [data-route="' + routeKey + '"]');
    var textNode = null;

    if (!item) {
      return;
    }

    item.childNodes.forEach(function (node) {
      if (!textNode && node.nodeType === 3 && node.nodeValue.trim()) {
        textNode = node;
      }
    });

    if (textNode) {
      textNode.nodeValue = label + ' ';
    } else {
      item.insertBefore(document.createTextNode(label + ' '), item.firstChild);
    }
  }

  function bindLogout() {
    var button = utils.qs('[data-logout]');
    if (!button) {
      return;
    }

    button.addEventListener('click', function () {
      button.disabled = true;
      auth.logout().finally(function () {
        window.location.href = 'login.html';
      });
    });
  }

  function setDashboardLoading() {
    dashboardState.loaded = false;
    dashboardState.data = null;
    setGlobalStatus('API: Loading', 'loading');
    utils.setText(utils.qs('[data-dashboard-status]'), 'Loading dashboard statistics from the live Apps Script API.');
    utils.setText(utils.qs('[data-dashboard-badge]'), 'Loading');

    document.querySelectorAll('[data-metric]').forEach(function (metric) {
      utils.setText(metric, '...');
    });

    document.querySelectorAll('[data-metric-status]').forEach(function (status) {
      utils.setText(status, 'Loading live data');
    });

    document.querySelectorAll('[data-workspace-metric]').forEach(function (metric) {
      utils.setText(metric, '...');
    });

    setDashboardDate();
    setDashboardWidgetsLoading();
    updateCommandCenter(getCurrentRouteKey());
  }

  function setDashboardError(message) {
    dashboardState.loaded = false;
    dashboardState.data = null;
    setGlobalStatus('API: Error', 'error');
    utils.setText(utils.qs('[data-dashboard-status]'), message || 'Unable to load dashboard statistics.');
    utils.setText(utils.qs('[data-dashboard-badge]'), 'API error');

    document.querySelectorAll('[data-metric]').forEach(function (metric) {
      utils.setText(metric, '--');
    });

    document.querySelectorAll('[data-metric-status]').forEach(function (status) {
      utils.setText(status, 'API error');
    });

    document.querySelectorAll('[data-workspace-metric]').forEach(function (metric) {
      utils.setText(metric, '--');
    });

    setDashboardWidgetsError(message || 'Unable to load dashboard data.');
    setNavCount('tasks', null);
    setNavCount('issues', null);
    updateCommandCenter(getCurrentRouteKey());
  }

  function metricValue(data, key) {
    if (data && data[key] !== null && data[key] !== undefined && data[key] !== '') {
      return data[key];
    }

    return 'N/A';
  }

  function renderDashboard(data) {
    dashboardState.data = data || {};
    dashboardState.loaded = true;
    setGlobalStatus('API: Live', 'live');
    applyDashboardMode(data || {});

    document.querySelectorAll('[data-metric]').forEach(function (metric) {
      var key = metric.dataset.metric;
      utils.setText(metric, metricValue(data, key));
    });

    document.querySelectorAll('[data-metric-status]').forEach(function (status) {
      var metric = status.parentElement ? status.parentElement.querySelector('[data-metric]') : null;
      var key = metric ? metric.dataset.metric : '';
      utils.setText(status, dashboardMetricLabels[key] || 'Live API data');
    });

    utils.setText(utils.qs('[data-dashboard-badge]'), 'Live API data');
    renderDashboardWorkspace(data || {});
    renderDashboardWidgets(data || {});
    updateDashboardNavCounts(data || {});
    updateCommandCenter(getCurrentRouteKey());
  }

  function applyDashboardMode(data) {
    var isStaffMode = data.workspaceMode === 'staff' || !isAdminUser();
    var hero = utils.qs('#dashboard-title');

    utils.setText(hero, isStaffMode ? 'My Affiliate Workspace' : 'Affiliate manager command center');
    utils.setText(utils.qs('[data-dashboard-status]'), isStaffMode ? 'Your assigned workspace loaded from the live Apps Script API.' : 'Dashboard statistics loaded from the live Apps Script API.');

    setMetricLabel('totalAffiliates', isStaffMode ? 'My Affiliates' : 'Total Affiliates');
    setMetricLabel('todayFollowups', isStaffMode ? 'My Due Follow-ups' : "Today's Follow-ups");
    setMetricLabel('overdueFollowups', isStaffMode ? 'My Overdue Follow-ups' : 'Overdue Follow-ups');
    setMetricLabel('openTasks', isStaffMode ? 'My Open Tasks' : 'Open Tasks');
    setMetricLabel('openIssues', isStaffMode ? 'My Open Issues' : 'Open Issues');
    setMetricLabel('completedFollowups', isStaffMode ? 'My Completed Follow-ups' : 'Completed Follow-ups');
  }

  function setMetricLabel(metricKey, label) {
    var value = utils.qs('[data-metric="' + metricKey + '"]');
    var parent = value ? value.parentElement : null;
    var span = parent ? parent.querySelector('span') : null;
    utils.setText(span, label);
  }

  function setDashboardDate() {
    var date = new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    utils.setText(utils.qs('[data-dashboard-date]'), date);
  }

  function renderDashboardWorkspace(data) {
    var workspace = data.todayWorkspace || {
      dueToday: data.todayFollowups,
      overdue: data.overdueFollowups,
      upcomingThisWeek: data.upcomingFollowups,
      completedToday: data.completedFollowups,
      openTasks: data.openTasks,
      openIssues: data.openIssues,
      recentInteractions: data.recentInteractions,
      warnings: []
    };
    document.querySelectorAll('[data-workspace-metric]').forEach(function (metric) {
      utils.setText(metric, metricValue(workspace, metric.dataset.workspaceMetric));
    });
    renderWarnings(asArray(workspace.warnings));
  }

  function updateDashboardNavCounts(data) {
    setNavCount('tasks', data.openTasks);
    setNavCount('issues', data.openIssues);
  }

  function setDashboardWidgetsLoading() {
    renderWarnings([]);
    setPanelLoading('[data-dashboard-followups]', 'Loading follow-up queue...');
    setPanelLoading('[data-dashboard-health]', 'Loading health distribution...');
    setPanelLoading('[data-dashboard-priority]', 'Loading priority distribution...');
    setTableLoading('[data-dashboard-brands]', 5);
    setTableLoading('[data-dashboard-staff]', 5);
    setPanelLoading('[data-dashboard-activity]', 'Loading recent activity...');
    setPanelLoading('[data-dashboard-issues]', 'Loading open issues...');
    setPanelLoading('[data-dashboard-tasks]', 'Loading open tasks...');
    setPanelLoading('[data-dashboard-performance]', 'Loading monthly performance...');
  }

  function setDashboardWidgetsError(message) {
    renderWarnings([]);
    setPanelEmpty('[data-dashboard-followups]', message);
    setPanelEmpty('[data-dashboard-health]', message);
    setPanelEmpty('[data-dashboard-priority]', message);
    setTableEmpty('[data-dashboard-brands]', 5, message);
    setTableEmpty('[data-dashboard-staff]', 5, message);
    setPanelEmpty('[data-dashboard-activity]', message);
    setPanelEmpty('[data-dashboard-issues]', message);
    setPanelEmpty('[data-dashboard-tasks]', message);
    setPanelEmpty('[data-dashboard-performance]', message);
  }

  function renderDashboardWidgets(data) {
    renderFollowupSnapshot(data.followupSnapshot || {});
    renderDistribution('[data-dashboard-health]', asArray(data.affiliateHealth), 'No affiliate health data yet.');
    renderDistribution('[data-dashboard-priority]', asArray(data.priorityDistribution), 'No priority data yet.');
    renderBrandSummary(asArray(data.brandSummary));
    renderStaffWorkload(asArray(data.staffWorkload));
    renderActivity(asArray(data.recentActivity));
    renderIssues(asArray(data.openIssuesList));
    renderTasks(asArray(data.openTasksList));
    renderPerformance(asArray(data.monthlyPerformance));
  }

  function renderWarnings(warnings) {
    var container = utils.qs('[data-dashboard-warnings]');
    if (!container) {
      return;
    }

    container.innerHTML = '';
    if (!warnings.length) {
      var ok = document.createElement('span');
      ok.className = 'status-badge is-green';
      ok.textContent = 'No urgent warnings';
      container.appendChild(ok);
      return;
    }

    warnings.forEach(function (warning) {
      var badge = document.createElement('span');
      badge.className = 'status-badge is-' + (warning.tone || 'amber');
      badge.textContent = displayPlainValue(warning.count) + ' ' + displayPlainValue(warning.label);
      container.appendChild(badge);
    });
  }

  function renderFollowupSnapshot(snapshot) {
    var container = utils.qs('[data-dashboard-followups]');
    var groups = [
      { key: 'today', label: "Today's follow-ups", tone: 'blue' },
      { key: 'overdue', label: 'Overdue follow-ups', tone: 'red' },
      { key: 'upcoming', label: 'Upcoming follow-ups', tone: 'amber' },
      { key: 'completed', label: 'Completed follow-ups', tone: 'green' }
    ];

    if (!container) {
      return;
    }

    container.innerHTML = '';
    groups.forEach(function (group) {
      var rows = asArray(snapshot[group.key]);
      var section = document.createElement('section');
      var heading = document.createElement('div');
      var title = document.createElement('h3');
      var count = document.createElement('span');

      section.className = 'queue-card is-' + group.tone;
      heading.className = 'queue-card-heading';
      title.textContent = group.label;
      count.className = 'status-badge is-' + group.tone;
      count.textContent = rows.length;
      heading.appendChild(title);
      heading.appendChild(count);
      section.appendChild(heading);

      if (!rows.length) {
        section.appendChild(createEmptyPanel('No records in this queue.'));
      } else {
        rows.forEach(function (row) {
          section.appendChild(createFollowupMiniRow(row));
        });
      }

      container.appendChild(section);
    });
  }

  function createFollowupMiniRow(row) {
    var item = document.createElement('div');
    var meta = document.createElement('div');
    var title = document.createElement('strong');
    var details = document.createElement('small');
    var badges = document.createElement('div');

    item.className = 'mini-row';
    title.textContent = firstDefined(row.Affiliate_Name, row.Affiliate_ID, 'Unassigned affiliate');
    details.textContent = [
      firstDefined(row.Brand, 'No brand'),
      firstDefined(row.Assigned_Staff, 'Unassigned'),
      formatDate(firstDefined(row.Followup_Date, ''))
    ].join(' | ');
    meta.appendChild(title);
    meta.appendChild(details);
    badges.className = 'mini-badges';
    badges.appendChild(createBadge('Priority', firstDefined(row.Priority, 'N/A')));
    badges.appendChild(createBadge('Status', firstDefined(row.Status, 'N/A')));
    item.appendChild(meta);
    item.appendChild(badges);
    return item;
  }

  function renderDistribution(selector, items, emptyMessage) {
    var container = utils.qs(selector);
    var total = items.reduce(function (sum, item) {
      return sum + Number(item.count || 0);
    }, 0);

    if (!container) {
      return;
    }

    container.innerHTML = '';
    if (!items.length || total === 0) {
      container.appendChild(createEmptyPanel(emptyMessage));
      return;
    }

    items.forEach(function (item) {
      var row = document.createElement('div');
      var top = document.createElement('div');
      var label = document.createElement('span');
      var count = document.createElement('strong');
      var track = document.createElement('div');
      var bar = document.createElement('span');
      var percent = total ? Math.round((Number(item.count || 0) / total) * 100) : 0;

      row.className = 'distribution-row';
      top.className = 'distribution-top';
      label.textContent = displayPlainValue(item.label);
      count.textContent = displayPlainValue(item.count);
      track.className = 'distribution-track';
      bar.className = 'is-' + (item.tone || 'blue');
      bar.style.width = percent + '%';
      top.appendChild(label);
      top.appendChild(count);
      track.appendChild(bar);
      row.appendChild(top);
      row.appendChild(track);
      container.appendChild(row);
    });
  }

  function renderBrandSummary(items) {
    var body = utils.qs('[data-dashboard-brands]');
    if (!body) {
      return;
    }

    body.innerHTML = '';
    if (!items.length) {
      setTableEmpty('[data-dashboard-brands]', 5, 'No brand data available.');
      return;
    }

    items.forEach(function (item) {
      appendCompactRow(body, [
        item.brand,
        item.totalAffiliates,
        item.healthy,
        item.atRisk,
        item.pendingFollowups
      ]);
    });
  }

  function renderStaffWorkload(items) {
    var body = utils.qs('[data-dashboard-staff]');
    if (!body) {
      return;
    }

    body.innerHTML = '';
    if (!items.length) {
      setTableEmpty('[data-dashboard-staff]', 5, 'No staff workload data available.');
      return;
    }

    items.forEach(function (item) {
      appendCompactRow(body, [
        item.staff,
        item.assignedFollowups,
        item.openTasks,
        item.openIssues,
        item.overdueFollowups
      ]);
    });
  }

  function renderActivity(items) {
    var container = utils.qs('[data-dashboard-activity]');
    if (!container) {
      return;
    }

    container.innerHTML = '';
    if (!items.length) {
      container.appendChild(createEmptyPanel('No recent activity yet.'));
      return;
    }

    items.forEach(function (item) {
      var row = document.createElement('div');
      var date = document.createElement('span');
      var title = document.createElement('strong');
      var details = document.createElement('small');

      row.className = 'timeline-item';
      date.textContent = formatDate(firstDefined(item.date, ''));
      title.textContent = firstDefined(item.type, 'Activity') + ' - ' + firstDefined(item.affiliate, 'Affiliate');
      details.textContent = firstDefined(item.summary, item.staff, 'No summary available');
      row.appendChild(date);
      row.appendChild(title);
      row.appendChild(details);
      container.appendChild(row);
    });
  }

  function renderIssues(items) {
    renderRecordList('[data-dashboard-issues]', items, 'No open issues.', function (item) {
      return {
        title: firstDefined(item.issueId, item.affiliate, 'Issue'),
        meta: [item.affiliate, item.brand, item.assignedStaff, formatDate(item.createdDate)].filter(Boolean).join(' | '),
        badges: [
          { key: 'Priority', value: item.priority },
          { key: 'Status', value: item.status }
        ]
      };
    });
  }

  function renderTasks(items) {
    renderRecordList('[data-dashboard-tasks]', items, 'No open tasks.', function (item) {
      return {
        title: firstDefined(item.title, item.taskId, 'Task'),
        meta: [item.affiliate, item.assignedStaff, formatDate(item.dueDate)].filter(Boolean).join(' | '),
        badges: [
          { key: 'Priority', value: item.priority },
          { key: 'Status', value: item.status }
        ]
      };
    });
  }

  function renderPerformance(items) {
    renderRecordList('[data-dashboard-performance]', items, 'No monthly performance rows available.', function (item) {
      var metrics = [];
      if (item.ftd !== '') {
        metrics.push('FTD ' + item.ftd);
      }
      if (item.revenue !== '') {
        metrics.push('Revenue ' + item.revenue);
      }
      if (item.growth) {
        metrics.push('Growth ' + item.growth);
      }
      return {
        title: [item.month, item.brand].filter(Boolean).join(' | ') || 'Performance row',
        meta: firstDefined(item.affiliate, 'No affiliate') + (metrics.length ? ' | ' + metrics.join(' | ') : ''),
        badges: []
      };
    });
  }

  function renderRecordList(selector, items, emptyMessage, mapper) {
    var container = utils.qs(selector);
    if (!container) {
      return;
    }

    container.innerHTML = '';
    if (!items.length) {
      container.appendChild(createEmptyPanel(emptyMessage));
      return;
    }

    items.forEach(function (item) {
      var config = mapper(item);
      var row = document.createElement('div');
      var meta = document.createElement('div');
      var title = document.createElement('strong');
      var details = document.createElement('small');
      var badges = document.createElement('div');

      row.className = 'record-item';
      title.textContent = displayPlainValue(config.title);
      details.textContent = displayPlainValue(config.meta);
      badges.className = 'mini-badges';
      asArray(config.badges).forEach(function (badge) {
        badges.appendChild(createBadge(badge.key, firstDefined(badge.value, 'N/A')));
      });
      meta.appendChild(title);
      meta.appendChild(details);
      row.appendChild(meta);
      row.appendChild(badges);
      container.appendChild(row);
    });
  }

  function appendCompactRow(body, values) {
    var row = document.createElement('tr');
    values.forEach(function (value) {
      var cell = document.createElement('td');
      cell.textContent = displayPlainValue(value);
      row.appendChild(cell);
    });
    body.appendChild(row);
  }

  function setPanelLoading(selector, message) {
    var container = utils.qs(selector);
    if (!container) {
      return;
    }
    container.innerHTML = '';
    container.appendChild(createEmptyPanel(message));
  }

  function setPanelEmpty(selector, message) {
    var container = utils.qs(selector);
    if (!container) {
      return;
    }
    container.innerHTML = '';
    container.appendChild(createEmptyPanel(message));
  }

  function setTableLoading(selector, colSpan) {
    setTableEmpty(selector, colSpan, 'Loading live data...');
  }

  function setTableEmpty(selector, colSpan, message) {
    var body = utils.qs(selector);
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    if (!body) {
      return;
    }
    body.innerHTML = '';
    cell.colSpan = colSpan;
    cell.textContent = message;
    row.appendChild(cell);
    body.appendChild(row);
  }

  function createEmptyPanel(message) {
    var empty = document.createElement('p');
    empty.className = 'panel-empty';
    empty.textContent = message;
    return empty;
  }

  async function loadDashboard() {
    setDashboardLoading();

    var result = await api.dashboard();
    if (!isSuccessfulResult(result)) {
      setDashboardError(result && result.message ? result.message : 'Unable to load dashboard statistics.');
      return;
    }

    renderDashboard(result.data || {});
  }

  async function loadModule(routeKey, force) {
    var config = moduleConfigs[routeKey];
    var state = moduleState[routeKey];
    var result;

    if (!config || !state || (!force && (state.loaded || state.loading))) {
      return;
    }

    state.loading = true;
    setGlobalStatus('API: Loading', 'loading');
    setModuleVisibility(routeKey, 'loading');
    setModuleCount(routeKey, 'Loading ' + config.itemName + '...');
    updateCommandCenter(routeKey);

    result = await api[config.api]();
    state.loading = false;

    if (!isSuccessfulResult(result)) {
      setGlobalStatus('API: Error', 'error');
      setModuleError(routeKey, result && result.message ? result.message : 'Unable to load ' + config.itemName + '.');
      return;
    }

    setGlobalStatus('API: Live', 'live');
    state.raw = result.data || {};
    state.all = normalizeModuleItems(routeKey, state.raw);
    state.loaded = true;
    buildModuleFilters(routeKey);
    filterModule(routeKey);
  }

  function normalizeModuleItems(routeKey, data) {
    var items = asArray(data.items);

    if (routeKey === 'leaderboard') {
      return buildLeaderboardItems(data);
    }

    return items;
  }

  function buildLeaderboardItems(data) {
    var items = [];
    asArray(data.staff).forEach(function (row) {
      items.push({
        group: 'Staff activity',
        name: firstDefined(row.staff, 'Unassigned'),
        score: Number(row.assignedFollowups || 0) + Number(row.openTasks || 0) + Number(row.openIssues || 0),
        detail: 'Follow-ups ' + displayPlainValue(row.assignedFollowups) + ' | Tasks ' + displayPlainValue(row.openTasks) + ' | Issues ' + displayPlainValue(row.openIssues)
      });
    });
    asArray(data.brands).forEach(function (row) {
      items.push({
        group: 'Brand activity',
        name: firstDefined(row.brand, 'Unassigned'),
        score: Number(row.totalAffiliates || 0) + Number(row.pendingFollowups || 0),
        detail: 'Affiliates ' + displayPlainValue(row.totalAffiliates) + ' | Pending follow-ups ' + displayPlainValue(row.pendingFollowups)
      });
    });
    asArray(data.affiliates).forEach(function (row) {
      items.push({
        group: 'Affiliate priority',
        name: firstDefined(row.label, 'Priority'),
        score: Number(row.count || 0),
        detail: 'Priority records ' + displayPlainValue(row.count)
      });
    });
    return items.sort(function (a, b) {
      return Number(b.score || 0) - Number(a.score || 0);
    });
  }

  function setModuleVisibility(routeKey, visibleState) {
    var root = getModuleRoot(routeKey);
    if (!root) {
      return;
    }

    ['loading', 'error', 'empty', 'content'].forEach(function (state) {
      var target = root.querySelector('[data-module-' + state + ']');
      if (target) {
        target.hidden = state !== visibleState;
      }
    });
  }

  function setModuleCount(routeKey, message) {
    var root = getModuleRoot(routeKey);
    if (root) {
      utils.setText(root.querySelector('[data-module-count]'), message);
    }
  }

  function setModuleError(routeKey, message) {
    var root = getModuleRoot(routeKey);
    setModuleVisibility(routeKey, 'error');
    setModuleCount(routeKey, 'Unable to load records');
    if (root) {
      utils.setText(root.querySelector('[data-module-error-message]'), message);
    }
    updateCommandCenter(routeKey);
  }

  function getModuleRoot(routeKey) {
    return utils.qs('[data-module-workspace="' + routeKey + '"]');
  }

  function buildModuleFilters(routeKey) {
    var config = moduleConfigs[routeKey];
    var state = moduleState[routeKey];
    var root = getModuleRoot(routeKey);
    var filters = root ? root.querySelector('[data-module-filters]') : null;

    if (!filters || !config.filters) {
      return;
    }

    filters.innerHTML = '';
    config.filters.forEach(function (filter) {
      var label = document.createElement('label');
      var span = document.createElement('span');
      var control = document.createElement(filter.type === 'date' ? 'input' : 'select');

      label.className = 'field';
      span.textContent = filter.label;
      control.dataset.moduleFilter = filter.key;
      if (filter.type === 'date') {
        control.type = 'date';
      } else {
        var all = document.createElement('option');
        all.value = '';
        all.textContent = 'All ' + filter.label.toLowerCase();
        control.appendChild(all);
        uniqueModuleValues(state.all, filter).forEach(function (value) {
          var option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          control.appendChild(option);
        });
      }
      control.addEventListener('change', function () {
        filterModule(routeKey);
      });
      label.appendChild(span);
      label.appendChild(control);
      filters.appendChild(label);
    });
  }

  function uniqueModuleValues(items, filter) {
    var values = [];
    items.forEach(function (item) {
      var value = getModuleValue(item, [filter.key].concat(filter.fallback || []));
      if (value && values.indexOf(value) === -1) {
        values.push(value);
      }
    });
    return values.sort();
  }

  function filterModule(routeKey) {
    var state = moduleState[routeKey];
    var config = moduleConfigs[routeKey];
    var root = getModuleRoot(routeKey);
    var search = root ? root.querySelector('[data-module-search]') : null;
    var query = search ? search.value.trim().toLowerCase() : '';

    state.filtered = state.all.filter(function (item) {
      return moduleMatchesSearch(item, config, query) && moduleMatchesFilters(item, config, root);
    });

    renderModule(routeKey);
  }

  function moduleMatchesSearch(item, config, query) {
    if (!query) {
      return true;
    }

    return (config.search || []).some(function (key) {
      return safeLower(getModuleValue(item, [key])).indexOf(query) !== -1;
    });
  }

  function moduleMatchesFilters(item, config, root) {
    if (!root || !config.filters) {
      return true;
    }

    return config.filters.every(function (filter) {
      var control = root.querySelector('[data-module-filter="' + filter.key + '"]');
      var value = getModuleValue(item, [filter.key].concat(filter.fallback || []));
      if (!control || !control.value) {
        return true;
      }
      if (filter.type === 'date') {
        return getDateOnly(value) === control.value;
      }
      return value === control.value;
    });
  }

  function renderModule(routeKey) {
    var state = moduleState[routeKey];
    var config = moduleConfigs[routeKey];
    var root = getModuleRoot(routeKey);
    var content = root ? root.querySelector('[data-module-content]') : null;
    var stats = root ? root.querySelector('[data-module-stats]') : null;

    if (!root || !content || !stats) {
      return;
    }

    renderModuleStats(routeKey, stats);
    setModuleCount(routeKey, 'Showing ' + state.filtered.length + ' of ' + state.all.length + ' ' + config.itemName);
    content.innerHTML = '';

    if (!state.filtered.length) {
      setModuleVisibility(routeKey, 'empty');
      updateCommandCenter(routeKey);
      return;
    }

    if (config.mode === 'timeline') {
      content.appendChild(renderModuleTimeline(config, state.filtered));
    } else if (config.mode === 'cards' || config.mode === 'leaderboard') {
      content.appendChild(renderModuleCards(config, state.filtered));
    } else {
      content.appendChild(renderModuleTable(config, state.filtered));
    }

    setModuleVisibility(routeKey, 'content');
    if (routeKey === 'tasks') {
      setNavCount('tasks', getModuleStatValue(state.all, { type: 'open' }));
    }
    if (routeKey === 'issues') {
      setNavCount('issues', getModuleStatValue(state.all, { type: 'open' }));
    }
    updateCommandCenter(routeKey);
  }

  function renderModuleStats(routeKey, container) {
    var state = moduleState[routeKey];
    var config = moduleConfigs[routeKey];
    container.innerHTML = '';
    (config.stats || [{ label: 'Records', type: 'total' }]).forEach(function (stat) {
      var card = document.createElement('article');
      var label = document.createElement('span');
      var value = document.createElement('strong');
      card.className = 'module-stat';
      label.textContent = stat.label;
      value.textContent = getModuleStatValue(state.all, stat);
      card.appendChild(label);
      card.appendChild(value);
      container.appendChild(card);
    });
  }

  function getModuleStatValue(items, stat) {
    if (stat.type === 'total') {
      return items.length;
    }
    if (stat.type === 'open') {
      return items.filter(isModuleOpen).length;
    }
    if (stat.type === 'completed') {
      return items.filter(isModuleCompleted).length;
    }
    if (stat.type === 'today') {
      return items.filter(function (item) {
        return isTodayValue(getModuleValue(item, stat.dateKeys || ['Date']));
      }).length;
    }
    if (stat.type === 'thisWeek') {
      return items.filter(function (item) {
        return isThisWeekValue(getModuleValue(item, stat.dateKeys || ['Date']));
      }).length;
    }
    if (stat.type === 'overdue') {
      return items.filter(function (item) {
        return isModuleOpen(item) && isBeforeTodayValue(getModuleValue(item, stat.dateKeys || ['Date']));
      }).length;
    }
    if (stat.type === 'priority') {
      return items.filter(function (item) {
        return (stat.values || []).indexOf(safeLower(getModuleValue(item, ['Priority']))) !== -1;
      }).length;
    }
    if (stat.type === 'status') {
      return items.filter(function (item) {
        return (stat.values || []).indexOf(safeLower(getModuleValue(item, ['Status', 'Active']))) !== -1;
      }).length;
    }
    if (stat.type === 'unique') {
      return uniqueByKeys(items, stat.keys || []).length;
    }
    return 'N/A';
  }

  function renderModuleTable(config, items) {
    var wrap = document.createElement('div');
    var table = document.createElement('table');
    var head = document.createElement('thead');
    var body = document.createElement('tbody');
    var tr = document.createElement('tr');
    wrap.className = 'table-wrap module-table-wrap';
    table.className = 'data-table module-table';
    (config.columns || []).forEach(function (column) {
      var th = document.createElement('th');
      th.textContent = column.label;
      tr.appendChild(th);
    });
    if (config.actionText || config.actions) {
      var actionHead = document.createElement('th');
      actionHead.textContent = 'Actions';
      tr.appendChild(actionHead);
    }
    head.appendChild(tr);
    items.forEach(function (item) {
      body.appendChild(renderModuleTableRow(config, item));
    });
    table.appendChild(head);
    table.appendChild(body);
    wrap.appendChild(table);
    return wrap;
  }

  function renderModuleTableRow(config, item) {
    var tr = document.createElement('tr');
    (config.columns || []).forEach(function (column) {
      var td = document.createElement('td');
      appendModuleCell(td, item, column);
      tr.appendChild(td);
    });
    if (config.actionText || config.actions) {
      var action = document.createElement('td');
      action.className = 'table-actions';
      if (config.actions) {
        appendModuleRowActions(action, config, item);
      } else {
        var button = document.createElement('button');
        button.className = 'button button-secondary button-small';
        button.type = 'button';
        button.disabled = true;
        button.textContent = config.actionText;
        action.appendChild(button);
      }
      tr.appendChild(action);
    }
    return tr;
  }

  function appendModuleRowActions(parent, config, item) {
    (config.actions || []).forEach(function (actionConfig) {
      var button = document.createElement('button');
      if (!shouldShowModuleAction(actionConfig, item)) {
        return;
      }
      button.className = 'button ' + (actionConfig.tone === 'primary' ? 'button-primary' : 'button-secondary') + ' button-small';
      button.type = 'button';
      button.textContent = actionConfig.label;
      button.addEventListener('click', function () {
        handleModuleRowAction(actionConfig, item);
      });
      parent.appendChild(button);
    });
  }

  function shouldShowModuleAction(actionConfig, item) {
    if (actionConfig.when === 'open') {
      return isModuleOpen(item);
    }
    if (actionConfig.when === 'closed') {
      return !isModuleOpen(item);
    }
    return true;
  }

  async function handleModuleRowAction(actionConfig, item) {
    var payload = copyRecord(item);
    var result;

    if (actionConfig.form) {
      openRecordModal(actionConfig.form, payload);
      return;
    }

    if (actionConfig.status) {
      payload.Status = actionConfig.status;
    }

    if (!actionConfig.api || !api[actionConfig.api]) {
      showToast('This action is not available yet.');
      return;
    }

    result = await api[actionConfig.api](payload);
    if (!isSuccessfulResult(result)) {
      showToast(friendlyErrorMessage(result, 'Unable to update record.'));
      return;
    }

    showToast(actionConfig.label + ' saved.');
    refreshAfterRecordSave(actionConfig.api.indexOf('Task') !== -1 ? 'task' : 'issue');
  }

  function copyRecord(item) {
    var copy = {};
    Object.keys(item || {}).forEach(function (key) {
      copy[key] = item[key];
    });
    return copy;
  }

  function appendModuleCell(parent, item, column) {
    var value = getModuleValue(item, column.keys || []);
    if (column.badge) {
      parent.appendChild(createBadge(column.badge, value || 'N/A'));
      return;
    }
    parent.textContent = column.format === 'date' ? formatDate(value) : displayPlainValue(value);
  }

  function renderModuleCards(config, items) {
    var grid = document.createElement('div');
    grid.className = 'module-card-grid';
    items.forEach(function (item) {
      var card = document.createElement('article');
      var title = document.createElement('h3');
      var meta = document.createElement('p');
      var cta = document.createElement('button');
      card.className = 'module-card';
      title.textContent = firstDefined(item.title, item.name, item.label, item.group, 'Record');
      meta.textContent = firstDefined(item.summary, item.detail, item.value, item.status, 'Live record');
      cta.className = 'button button-secondary button-small';
      cta.type = 'button';
      cta.textContent = firstDefined(item.status, 'Full export coming later');
      cta.addEventListener('click', function () {
        showToast('Full export coming later.');
      });
      card.appendChild(title);
      card.appendChild(meta);
      if (item.count !== undefined || item.score !== undefined) {
        var score = document.createElement('strong');
        score.textContent = displayPlainValue(firstDefined(item.count, item.score));
        card.appendChild(score);
      }
      card.appendChild(cta);
      grid.appendChild(card);
    });
    return grid;
  }

  function renderModuleTimeline(config, items) {
    var list = document.createElement('div');
    list.className = 'timeline-list';
    items.forEach(function (item) {
      var row = document.createElement('div');
      var date = document.createElement('span');
      var title = document.createElement('strong');
      var details = document.createElement('small');
      row.className = 'timeline-item';
      date.textContent = formatDate(getModuleValue(item, ['Date', 'Interaction_Date', 'Timestamp']));
      title.textContent = firstDefined(getModuleValue(item, ['Interaction_Type', 'Type']), 'Interaction') + ' - ' + firstDefined(getModuleValue(item, ['Affiliate_Name', 'Affiliate', 'Affiliate_ID']), 'Affiliate');
      details.textContent = firstDefined(getModuleValue(item, ['Notes', 'Summary', 'Description']), getModuleValue(item, ['Assigned_Staff', 'Staff']), 'No summary available');
      row.appendChild(date);
      row.appendChild(title);
      row.appendChild(details);
      list.appendChild(row);
    });
    return list;
  }

  function getModuleValue(item, keys) {
    for (var index = 0; index < keys.length; index += 1) {
      if (item && item[keys[index]] !== null && item[keys[index]] !== undefined && String(item[keys[index]]).trim() !== '') {
        return String(item[keys[index]]).trim();
      }
    }
    return '';
  }

  function safeLower(value) {
    return String(value || '').toLowerCase();
  }

  function isModuleOpen(item) {
    var status = safeLower(getModuleValue(item, ['Status', 'Task_Status', 'Issue_Status']));
    return !status || ['done', 'complete', 'completed', 'closed', 'resolved', 'cancelled', 'canceled'].indexOf(status) === -1;
  }

  function isModuleCompleted(item) {
    var status = safeLower(getModuleValue(item, ['Status', 'Task_Status', 'Issue_Status']));
    return ['done', 'complete', 'completed', 'closed', 'resolved'].indexOf(status) !== -1;
  }

  function isTodayValue(value) {
    return getDateOnly(value) === getDateOnly(new Date().toISOString());
  }

  function isThisWeekValue(value) {
    var date = new Date(value);
    var today = new Date();
    var end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    return !isNaN(date.getTime()) && date >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && date <= end;
  }

  function isBeforeTodayValue(value) {
    var date = new Date(value);
    var today = new Date();
    return !isNaN(date.getTime()) && date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  function uniqueByKeys(items, keys) {
    var values = [];
    items.forEach(function (item) {
      var value = getModuleValue(item, keys);
      if (value && values.indexOf(value) === -1) {
        values.push(value);
      }
    });
    return values;
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

  function badgeTone(key, value) {
    var normalized = String(value || '').toLowerCase();

    if (key === 'Health_Status') {
      if (normalized.indexOf('healthy') !== -1) {
        return 'green';
      }
      if (normalized.indexOf('critical') !== -1 || normalized.indexOf('risk') !== -1) {
        return 'red';
      }
      if (normalized.indexOf('attention') !== -1 || normalized.indexOf('warning') !== -1) {
        return 'amber';
      }
    }

    if (key === 'Status') {
      if (normalized.indexOf('inactive') !== -1 || normalized.indexOf('closed') !== -1) {
        return 'gray';
      }
      if (normalized.indexOf('overdue') !== -1 || normalized.indexOf('critical') !== -1) {
        return 'red';
      }
      if (normalized.indexOf('rescheduled') !== -1) {
        return 'blue';
      }
      if (normalized.indexOf('pending') !== -1) {
        return 'amber';
      }
      if (normalized.indexOf('completed') !== -1 || normalized.indexOf('active') !== -1 || normalized.indexOf('open') !== -1) {
        return 'green';
      }
    }

    if (key === 'Priority') {
      if (normalized.indexOf('critical') !== -1 || normalized.indexOf('high') !== -1) {
        return 'red';
      }
      if (normalized.indexOf('medium') !== -1) {
        return 'amber';
      }
      if (normalized.indexOf('low') !== -1) {
        return 'gray';
      }
    }

    if (key === 'Active') {
      if (normalized === 'yes' || normalized === 'true' || normalized === 'active') {
        return 'green';
      }
      if (normalized === 'no' || normalized === 'false' || normalized === 'inactive') {
        return 'gray';
      }
    }

    return 'amber';
  }

  function setNavCount(key, value) {
    var badge = utils.qs('[data-nav-count="' + key + '"]');
    var numeric = Number(value);
    if (!badge) {
      return;
    }

    if (value === null || value === undefined || value === '' || isNaN(numeric)) {
      badge.hidden = true;
      badge.textContent = '';
      return;
    }

    badge.hidden = false;
    badge.textContent = numeric > 99 ? '99+' : String(numeric);
  }

  function createBadge(key, value) {
    var badge = document.createElement('span');
    badge.className = 'status-badge is-' + badgeTone(key, value);
    badge.textContent = value || 'N/A';
    return badge;
  }

  function appendFieldValue(parent, row, key) {
    var value = displayValue(row, key);

    if (affiliateBadgeFields.indexOf(key) !== -1 || followupBadgeFields.indexOf(key) !== -1) {
      parent.appendChild(createBadge(key, value));
      return;
    }

    var strong = document.createElement('strong');
    strong.textContent = value;
    parent.appendChild(strong);
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
        appendFieldValue(td, row, column);
        tr.appendChild(td);
      });

      tr.appendChild(createAffiliateActionsCell(row));

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
    updateCommandCenter(getCurrentRouteKey());
  }

  function createAffiliateActionsCell(row) {
    var td = document.createElement('td');
    var actions = document.createElement('div');
    var view = document.createElement('button');
    var edit = document.createElement('button');

    actions.className = 'table-actions';
    view.className = 'button button-secondary button-small';
    view.type = 'button';
    view.textContent = 'View';
    view.addEventListener('click', function (event) {
      event.stopPropagation();
      openAffiliateDrawer(row);
    });
    actions.appendChild(view);

    if (isAdminUser()) {
      edit.className = 'button button-secondary button-small';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', function (event) {
        event.stopPropagation();
        openRecordModal('affiliate', row);
      });
      actions.appendChild(edit);
    }

    td.appendChild(actions);
    return td;
  }

  function openAffiliateDrawer(row) {
    var drawer = utils.qs('[data-affiliate-drawer]');
    var fields = utils.qs('[data-affiliate-drawer-fields]');
    if (!drawer || !fields) {
      return;
    }

    utils.setText(utils.qs('[data-affiliate-drawer-name]'), valueFor(row, 'Affiliate_Name') || valueFor(row, 'Affiliate_ID') || 'Affiliate profile');
    fields.innerHTML = '';

    var keyGrid = document.createElement('div');
    keyGrid.className = 'drawer-key-grid';
    affiliateKeyFields.forEach(function (key) {
      if (row[key] === undefined) {
        return;
      }

      keyGrid.appendChild(createDrawerField(row, key, true));
    });

    fields.appendChild(keyGrid);
    fields.appendChild(createAffiliateActionBar(row));
    fields.appendChild(createAffiliateRelatedSections(row));

    var remainingTitle = document.createElement('p');
    remainingTitle.className = 'drawer-section-title';
    remainingTitle.textContent = 'All affiliate fields';
    fields.appendChild(remainingTitle);

    Object.keys(row).forEach(function (key) {
      if (affiliateKeyFields.indexOf(key) !== -1) {
        return;
      }

      fields.appendChild(createDrawerField(row, key, false));
    });

    drawer.hidden = false;
  }

  function createDrawerField(row, key, isKey) {
      var item = document.createElement('div');
      var label = document.createElement('span');

      item.className = isKey ? 'drawer-field is-key' : 'drawer-field';
      label.textContent = key;
      item.appendChild(label);
      appendFieldValue(item, row, key);

      return item;
  }

  function createAffiliateActionBar(row) {
    var bar = document.createElement('div');
    var actions = [
      { label: 'Add interaction', type: 'interaction' },
      { label: 'Add follow-up', type: 'followup' },
      { label: 'Create task', type: 'task' },
      { label: 'Create issue', type: 'issue' }
    ];

    bar.className = 'quick-actions drawer-actions';
    actions.forEach(function (action) {
      var button = document.createElement('button');
      button.className = 'button button-secondary button-small';
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', function () {
        var context = affiliateContext(row);
        if (action.type === 'followup') {
          openFollowupModal('create', context);
          return;
        }
        openRecordModal(action.type, context);
      });
      bar.appendChild(button);
    });

    return bar;
  }

  function affiliateContext(row) {
    return {
      Affiliate_ID: valueFor(row, 'Affiliate_ID'),
      Affiliate_Name: valueFor(row, 'Affiliate_Name'),
      Brand: valueFor(row, 'Brand'),
      Assigned_Staff: valueFor(row, 'Assigned_Staff') || getUserName()
    };
  }

  function createAffiliateRelatedSections(row) {
    var wrap = document.createElement('div');
    var affiliateId = valueFor(row, 'Affiliate_ID');
    var sections = [
      { title: 'Overview', rows: [row], empty: 'Profile fields are listed below.' },
      { title: 'Follow-ups', rows: relatedRows(followupState.all, affiliateId), empty: 'No follow-ups loaded for this affiliate.' },
      { title: 'Interactions', rows: relatedRows(getModuleRows('interactions'), affiliateId), empty: 'No interactions loaded for this affiliate.' },
      { title: 'Tasks', rows: relatedRows(getModuleRows('tasks'), affiliateId), empty: 'No tasks loaded for this affiliate.' },
      { title: 'Issues', rows: relatedRows(getModuleRows('issues'), affiliateId), empty: 'No issues loaded for this affiliate.' },
      { title: 'Performance', rows: relatedRows(getModuleRows('performance'), affiliateId), empty: 'No performance rows loaded for this affiliate.' },
      { title: 'Notes', rows: [], empty: 'Notes will use interaction records in a later sprint.' }
    ];

    wrap.className = 'drawer-related';
    sections.forEach(function (section) {
      var panel = document.createElement('section');
      var title = document.createElement('p');
      var body = document.createElement('p');

      panel.className = 'drawer-field';
      title.className = 'drawer-section-title';
      title.textContent = section.title;
      body.className = 'muted';
      body.textContent = section.rows.length ? section.rows.slice(0, 3).map(summaryForRelatedRow).join(' | ') : section.empty;
      panel.appendChild(title);
      panel.appendChild(body);
      wrap.appendChild(panel);
    });

    return wrap;
  }

  function getModuleRows(routeKey) {
    return moduleState[routeKey] && moduleState[routeKey].all ? moduleState[routeKey].all : [];
  }

  function relatedRows(rows, affiliateId) {
    if (!affiliateId) {
      return [];
    }

    return asArray(rows).filter(function (item) {
      return valueFor(item, 'Affiliate_ID') === affiliateId;
    });
  }

  function summaryForRelatedRow(row) {
    return firstDefined(
      valueFor(row, 'Queue_ID'),
      valueFor(row, 'Interaction_ID'),
      valueFor(row, 'Task_ID'),
      valueFor(row, 'Issue_ID'),
      valueFor(row, 'Month'),
      valueFor(row, 'Status'),
      'Related record'
    );
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

    if (!isSuccessfulResult(result)) {
      setAffiliatesError(result && result.message ? result.message : 'Unable to load affiliates.');
      return;
    }

    affiliateState.all = result.data && Array.isArray(result.data.items) ? result.data.items : [];
    affiliateState.loaded = true;
    populateAffiliateFilters(affiliateState.all);
    filterAffiliates();
  }

  function setFollowupsVisibility(state) {
    var states = {
      loading: utils.qs('[data-followups-loading]'),
      error: utils.qs('[data-followups-error]'),
      empty: utils.qs('[data-followups-empty]'),
      groups: utils.qs('[data-followups-groups]')
    };

    Object.keys(states).forEach(function (key) {
      if (states[key]) {
        states[key].hidden = key !== state;
      }
    });
  }

  function setFollowupsCount(showing, total) {
    utils.setText(utils.qs('[data-followups-count]'), 'Showing ' + showing + ' of ' + total + ' follow-ups');
  }

  function setFollowupsError(message) {
    setFollowupsVisibility('error');
    utils.setText(utils.qs('[data-followups-error-message]'), message || 'Unable to load follow-ups.');
    setFollowupsCount(0, followupState.all.length);
    setNavCount('followups', null);
    updateFollowupSummaryCards();
    updateCommandCenter(getCurrentRouteKey());
  }

  function populateFollowupFilters(items) {
    followupFilterFields.forEach(function (field) {
      var select = utils.qs('[data-followup-filter="' + field + '"]');
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

  function followupMatchesSearch(row, query) {
    if (!query) {
      return true;
    }

    return followupSearchFields.some(function (field) {
      return valueFor(row, field).toLowerCase().indexOf(query) !== -1;
    });
  }

  function followupMatchesFilters(row) {
    var start = utils.qs('[data-followup-date-start]');
    var end = utils.qs('[data-followup-date-end]');
    var date = getDateOnly(valueFor(row, 'Followup_Date'));

    if (start && start.value && (!date || date < start.value)) {
      return false;
    }

    if (end && end.value && (!date || date > end.value)) {
      return false;
    }

    return followupFilterFields.every(function (field) {
      var select = utils.qs('[data-followup-filter="' + field + '"]');
      return !select || !select.value || valueFor(row, field) === select.value;
    });
  }

  function filterFollowups() {
    var search = utils.qs('[data-followup-search]');
    var query = search ? search.value.trim().toLowerCase() : '';

    followupState.filtered = followupState.all.filter(function (row) {
      return followupMatchesSearch(row, query) && followupMatchesFilters(row);
    });

    renderFollowups();
  }

  function renderFollowupHeaders() {
    document.querySelectorAll('[data-followup-head]').forEach(function (head) {
      if (head.dataset.ready === 'true') {
        return;
      }

      var tr = document.createElement('tr');
      followupColumns.forEach(function (column) {
        var th = document.createElement('th');
        th.textContent = friendlyFieldLabel(column);
        tr.appendChild(th);
      });
      head.appendChild(tr);
      head.dataset.ready = 'true';
    });
  }

  function renderFollowups() {
    renderFollowupHeaders();
    updateFollowupWorkspaceLabels();

    var groups = {
      today: [],
      overdue: [],
      upcoming: [],
      completed: []
    };

    followupState.filtered.forEach(function (row) {
      groups[getFollowupGroup(row)].push(row);
    });

    followupState.groups = groups;

    Object.keys(groups).forEach(function (group) {
      renderFollowupGroup(group, groups[group]);
      utils.setText(utils.qs('[data-followup-group-count="' + group + '"]'), groups[group].length);
    });

    setFollowupsCount(followupState.filtered.length, followupState.all.length);
    setNavCount('followups', followupState.all.length);
    updateFollowupSummaryCards();
    updateCommandCenter(getCurrentRouteKey());
    setFollowupsVisibility(followupState.filtered.length ? 'groups' : 'empty');
  }

  function updateFollowupSummaryCards() {
    Object.keys(followupState.groups).forEach(function (group) {
      utils.setText(utils.qs('[data-followup-summary="' + group + '"]'), followupState.groups[group].length);
    });
  }

  function renderFollowupGroup(group, rows) {
    var body = utils.qs('[data-followup-body="' + group + '"]');
    if (!body) {
      return;
    }

    body.innerHTML = '';

    if (!rows.length) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = followupColumns.length;
      emptyCell.textContent = 'No follow-ups in this section.';
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement('tr');

      followupColumns.forEach(function (column) {
        var td = document.createElement('td');

        if (column === 'Actions') {
          appendFollowupActions(td, row);
        } else {
          appendFieldValue(td, row, column);
        }

        tr.appendChild(td);
      });

      body.appendChild(tr);
    });
  }

  function appendFollowupActions(parent, row) {
    var actions = document.createElement('div');
    actions.className = 'table-actions';

    var complete = document.createElement('button');
    complete.className = 'button button-secondary button-small';
    complete.type = 'button';
    complete.textContent = 'Mark Complete';
    complete.disabled = isCompletedFollowup(row);
    complete.addEventListener('click', function () {
      markFollowupComplete(row);
    });

    var reschedule = document.createElement('button');
    reschedule.className = 'button button-secondary button-small';
    reschedule.type = 'button';
    reschedule.textContent = 'Reschedule';
    reschedule.addEventListener('click', function () {
      openFollowupModal('reschedule', row);
    });

    actions.appendChild(complete);
    actions.appendChild(reschedule);
    parent.appendChild(actions);
  }

  function getFollowupGroup(row) {
    if (isCompletedFollowup(row)) {
      return 'completed';
    }

    var date = getDateOnly(valueFor(row, 'Followup_Date'));
    var today = getDateOnly(new Date().toISOString());

    if (!date || date === today) {
      return 'today';
    }

    if (date < today) {
      return 'overdue';
    }

    return 'upcoming';
  }

  function isCompletedFollowup(row) {
    return valueFor(row, 'Status').toLowerCase() === 'completed';
  }

  function getDateOnly(value) {
    if (!value) {
      return '';
    }

    var date = new Date(value);
    if (isNaN(date.getTime())) {
      return value.slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
  }

  async function loadFollowups(force) {
    if (!force && (followupState.loaded || followupState.loading)) {
      return;
    }

    followupState.loading = true;
    followupState.groups = {
      today: [],
      overdue: [],
      upcoming: [],
      completed: []
    };
    setFollowupsVisibility('loading');
    utils.setText(utils.qs('[data-followups-count]'), 'Loading follow-ups...');
    updateFollowupSummaryCards();
    updateCommandCenter(getCurrentRouteKey());

    var result = await api.followups();
    followupState.loading = false;

    if (!isSuccessfulResult(result)) {
      setFollowupsError(result && result.message ? result.message : 'Unable to load follow-ups.');
      return;
    }

    followupState.all = result.data && Array.isArray(result.data.items) ? result.data.items : [];
    followupState.loaded = true;
    populateFollowupFilters(followupState.all);
    filterFollowups();
  }

  async function openFollowupModal(mode, row) {
    var modal = utils.qs('[data-followup-modal]');
    var form = utils.qs('[data-followup-form]');
    if (!modal || !form) {
      return;
    }

    followupState.mode = mode || 'create';
    form.reset();
    utils.setText(utils.qs('[data-followup-form-message]'), '');
    utils.setText(utils.qs('[data-followup-modal-title]'), followupState.mode === 'reschedule' ? 'Reschedule Follow-up' : 'Add New Follow-up');

    await preloadRecordReferences('task');
    populateFollowupModalReferences();

    if (row) {
      form.Queue_ID.value = valueFor(row, 'Queue_ID');
      setFormValue(form, 'Affiliate_ID', valueFor(row, 'Affiliate_ID'));
      setFormValue(form, 'Assigned_Staff', valueFor(row, 'Assigned_Staff'));
      form.Followup_Date.value = getDateOnly(valueFor(row, 'Followup_Date'));
      form.Priority.value = valueFor(row, 'Priority') || 'Medium';
      form.Status.value = valueFor(row, 'Status') || 'Open';
      form.Generated_From.value = valueFor(row, 'Generated_From');
      if (form.Notes) {
        form.Notes.value = valueFor(row, 'Notes');
      }
    } else {
      form.Priority.value = 'Medium';
      form.Status.value = 'Open';
      form.Generated_From.value = 'Manual';
    }

    modal.hidden = false;
  }

  function updateFollowupWorkspaceLabels() {
    if (!isAdminUser()) {
      utils.setText(utils.qs('#followups-title'), 'My Pending Follow-ups');
      utils.setText(utils.qs('[data-followup-group-title="today"]'), 'My follow-ups due today');
      utils.setText(utils.qs('[data-followup-group-title="overdue"]'), 'My overdue follow-ups');
      utils.setText(utils.qs('[data-followup-group-title="upcoming"]'), 'My upcoming follow-ups');
      utils.setText(utils.qs('[data-followup-group-title="completed"]'), 'My completed follow-ups');
      return;
    }

    utils.setText(utils.qs('#followups-title'), 'Follow-ups');
    utils.setText(utils.qs('[data-followup-group-title="today"]'), "Today's follow-ups");
    utils.setText(utils.qs('[data-followup-group-title="overdue"]'), 'Overdue follow-ups');
    utils.setText(utils.qs('[data-followup-group-title="upcoming"]'), 'Upcoming follow-ups');
    utils.setText(utils.qs('[data-followup-group-title="completed"]'), 'Completed follow-ups');
  }

  function populateFollowupModalReferences() {
    var form = utils.qs('[data-followup-form]');

    if (!form) {
      return;
    }

    populateSelectOptions(form.Affiliate_ID, getKnownAffiliates(), 'Select affiliate');
    populateSelectOptions(form.Assigned_Staff, getKnownStaff(), 'Select staff');

    if (form.Affiliate_ID) {
      form.Affiliate_ID.onchange = function () {
        applyFollowupAffiliateSelection(form.Affiliate_ID.value);
      };
    }
  }

  function populateSelectOptions(select, options, placeholder) {
    var current = select ? select.value : '';

    if (!select) {
      return;
    }

    select.innerHTML = '';
    appendSelectOption(select, '', placeholder || 'Select');
    asArray(options).forEach(function (optionValue) {
      if (typeof optionValue === 'object') {
        appendSelectOption(select, optionValue.value, optionValue.label);
      } else {
        appendSelectOption(select, optionValue, optionValue);
      }
    });

    if (current) {
      ensureSelectOption(select, current, current);
      select.value = current;
    }
  }

  function appendSelectOption(select, value, label) {
    var option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function ensureSelectOption(select, value, label) {
    var exists = Array.prototype.slice.call(select.options).some(function (option) {
      return option.value === value;
    });

    if (!exists && value) {
      appendSelectOption(select, value, label || value);
    }
  }

  function applyFollowupAffiliateSelection(affiliateId) {
    var form = utils.qs('[data-followup-form]');
    var row = (affiliateState.all || []).filter(function (affiliate) {
      return valueFor(affiliate, 'Affiliate_ID') === affiliateId;
    })[0];

    if (!form || !row) {
      return;
    }

    setFormValue(form, 'Assigned_Staff', valueFor(row, 'Assigned_Staff'));
  }

  function closeFollowupModal() {
    var modal = utils.qs('[data-followup-modal]');
    if (modal) {
      modal.hidden = true;
    }
  }

  function followupFormData() {
    var form = utils.qs('[data-followup-form]');
    return {
      Queue_ID: form.Queue_ID.value,
      Affiliate_ID: form.Affiliate_ID.value,
      Assigned_Staff: form.Assigned_Staff.value,
      Followup_Date: form.Followup_Date.value,
      Priority: form.Priority.value,
      Status: form.Status.value,
      Generated_From: form.Generated_From.value,
      Notes: form.Notes ? form.Notes.value : ''
    };
  }

  async function submitFollowupForm(event) {
    event.preventDefault();
    var button = utils.qs('[data-followup-submit]');
    var message = utils.qs('[data-followup-form-message]');
    var payload = followupFormData();
    var result;

    if (button) {
      button.disabled = true;
    }
    utils.setText(message, 'Saving follow-up...');

    if (followupState.mode === 'reschedule') {
      result = await api.rescheduleFollowup(payload);
    } else {
      result = await api.createFollowup(payload);
    }

    if (button) {
      button.disabled = false;
    }

    if (!isSuccessfulResult(result)) {
      utils.setText(message, friendlyErrorMessage(result, 'Unable to save follow-up.'));
      return;
    }

    closeFollowupModal();
    followupState.loaded = false;
    await loadFollowups(true);
    loadDashboard();
    showToast(followupState.mode === 'reschedule' ? 'Follow-up rescheduled.' : 'Follow-up added to the queue.');
  }

  async function markFollowupComplete(row) {
    var result = await api.completeFollowup({
      Queue_ID: valueFor(row, 'Queue_ID')
    });

    if (!isSuccessfulResult(result)) {
      setFollowupsError(friendlyErrorMessage(result, 'Unable to complete follow-up.'));
      return;
    }

    followupState.loaded = false;
    await loadFollowups(true);
    loadDashboard();
    showToast('Follow-up marked complete.');
  }

  async function openRecordModal(type, context) {
    var config = recordForms[type];
    var modal = utils.qs('[data-record-modal]');
    var fields = utils.qs('[data-record-fields]');
    var form = utils.qs('[data-record-form]');

    if (!config || !modal || !fields || !form) {
      showToast('This workflow is not available yet.');
      return;
    }

    if (config.adminOnly && !isAdminUser()) {
      showToast('Restricted to administrators.');
      return;
    }

    recordState.type = type;
    recordState.context = context || {};
    fields.innerHTML = '';
    form.reset();
    fields.appendChild(createEmptyPanel('Loading form options...'));
    utils.setText(utils.qs('[data-record-modal-title]'), isRecordEdit(config, recordState.context) ? 'Edit ' + config.title.replace(/^New |^Create |^Add /, '') : config.title);
    utils.setText(utils.qs('[data-record-modal-eyebrow]'), isAdminUser() ? 'Admin action' : 'My Workspace');
    utils.setText(utils.qs('[data-record-form-message]'), '');
    modal.hidden = false;

    await preloadRecordReferences(type);
    fields.innerHTML = '';
    appendRecordSections(fields, config);
  }

  async function preloadRecordReferences(type) {
    var requests = [];

    if (!affiliateState.loaded && ['affiliate', 'task', 'issue', 'interaction'].indexOf(type) !== -1) {
      requests.push(api.affiliates().then(function (result) {
        if (isSuccessfulResult(result)) {
          affiliateState.all = asArray(result.data && result.data.items);
          affiliateState.filtered = affiliateState.all.slice();
          affiliateState.loaded = true;
        }
      }));
    }

    if (isAdminUser() && moduleState.brands && !moduleState.brands.loaded && ['affiliate', 'issue', 'interaction', 'brand'].indexOf(type) !== -1) {
      requests.push(api.brands().then(function (result) {
        if (isSuccessfulResult(result)) {
          moduleState.brands.all = normalizeModuleItems('brands', result.data || {});
          moduleState.brands.filtered = moduleState.brands.all.slice();
          moduleState.brands.loaded = true;
        }
      }));
    }

    if (isAdminUser() && moduleState.staff && !moduleState.staff.loaded && ['affiliate', 'task', 'issue', 'interaction', 'staff'].indexOf(type) !== -1) {
      requests.push(api.staff().then(function (result) {
        if (isSuccessfulResult(result)) {
          moduleState.staff.all = normalizeModuleItems('staff', result.data || {});
          moduleState.staff.filtered = moduleState.staff.all.slice();
          moduleState.staff.loaded = true;
        }
      }));
    }

    await Promise.all(requests.map(function (request) {
      return request.catch(function () {});
    }));
  }

  function closeRecordModal() {
    var modal = utils.qs('[data-record-modal]');
    if (modal) {
      modal.hidden = true;
    }
  }

  function appendRecordSections(container, config) {
    var used = [];

    Object.keys(config.sections || {}).forEach(function (sectionName) {
      var sectionFields = (config.sections[sectionName] || []).filter(function (field) {
        return config.fields.indexOf(field) !== -1;
      });
      var section;
      var title;
      var grid;

      if (!sectionFields.length) {
        return;
      }

      section = document.createElement('section');
      title = document.createElement('h3');
      grid = document.createElement('div');
      section.className = 'form-section';
      title.textContent = sectionName;
      grid.className = 'form-section-grid';
      sectionFields.forEach(function (field) {
        used.push(field);
        grid.appendChild(createRecordField(field, recordState.context[field], config));
      });
      section.appendChild(title);
      section.appendChild(grid);
      container.appendChild(section);
    });

    (config.fields || []).forEach(function (field) {
      if (used.indexOf(field) === -1) {
        container.appendChild(createRecordField(field, recordState.context[field], config));
      }
    });
  }

  function createRecordField(field, value, config) {
    var label = document.createElement('label');
    var caption = document.createElement('span');
    var error = document.createElement('small');
    var input;
    var required = config && asArray(config.required).indexOf(field) !== -1;

    label.className = 'field';
    label.dataset.fieldName = field;
    caption.textContent = friendlyFieldLabel(field) + (required ? ' *' : '');
    label.appendChild(caption);

    if (field === 'Notes' || field === 'Issue' || field === 'Task') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else if (field.indexOf('Date') !== -1) {
      input = document.createElement('input');
      input.type = 'date';
    } else if (shouldUseSelect(field)) {
      input = document.createElement('select');
      getRecordOptions(field, config).forEach(function (optionValue) {
        var option = document.createElement('option');
        if (typeof optionValue === 'object') {
          option.value = optionValue.value;
          option.textContent = optionValue.label;
        } else {
          option.value = optionValue;
          option.textContent = optionValue;
        }
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = field === 'Email' ? 'email' : 'text';
    }

    input.name = field;
    input.required = required;
    input.value = input.type === 'date' ? getDateOnly(value || getDefaultRecordValue(field)) : value || getDefaultRecordValue(field);
    if (field === 'Affiliate_ID') {
      input.addEventListener('change', function () {
        applyAffiliateSelection(input.value);
      });
    }
    error.className = 'field-error';
    error.dataset.fieldError = field;
    label.appendChild(input);
    label.appendChild(error);
    return label;
  }

  function friendlyFieldLabel(field) {
    return fieldLabels[field] || String(field || '').replace(/_/g, ' ');
  }

  function shouldUseSelect(field) {
    return ['Affiliate_ID', 'Brand', 'Assigned_Staff', 'Priority', 'Status', 'Health_Status', 'Active', 'Role', 'Permission_Level', 'Can_View_All', 'Affiliate_Type', 'Market_Channel', 'Interaction_Type'].indexOf(field) !== -1;
  }

  function getRecordOptions(field, config) {
    var dynamic;

    if (field === 'Brand') {
      dynamic = getKnownBrands();
      return dynamic.length ? dynamic : [''];
    }
    if (field === 'Assigned_Staff') {
      dynamic = getKnownStaff();
      return dynamic.length ? dynamic : [getUserName()];
    }
    if (field === 'Affiliate_ID') {
      dynamic = getKnownAffiliates();
      return dynamic.length ? dynamic : [''];
    }
    if (field === 'Priority') {
      return ['Low', 'Medium', 'High', 'Critical'];
    }
    if (field === 'Health_Status') {
      return ['Healthy', 'Attention', 'Warning', 'Critical'];
    }
    if (field === 'Active' || field === 'Can_View_All') {
      return ['Yes', 'No'];
    }
    if (field === 'Role') {
      return ['Staff', 'Admin', 'Super Admin'];
    }
    if (field === 'Permission_Level') {
      return ['STAFF', 'ADMIN', 'SUPER_ADMIN'];
    }
    if (field === 'Affiliate_Type') {
      return ['Social Media', 'Streamer', 'SEO', 'Community', 'Agent', 'Other'];
    }
    if (field === 'Market_Channel') {
      return ['Facebook', 'TikTok', 'YouTube', 'Telegram', 'WhatsApp', 'Website', 'Other'];
    }
    if (field === 'Interaction_Type') {
      return ['Daily follow-up', 'Call', 'Message', 'Email', 'Telegram', 'Meeting', 'Other'];
    }
    if (field === 'Status') {
      return getStatusOptionsForRecord(config);
    }
    return ['Open', 'Active', 'Pending', 'Paused', 'Closed', 'Completed', 'Resolved', 'Rescheduled'];
  }

  function getStatusOptionsForRecord(config) {
    var title = safeLower(config && config.title);

    if (title.indexOf('affiliate') !== -1 || title.indexOf('brand') !== -1) {
      return ['Open', 'Active', 'Paused', 'Closed'];
    }
    if (title.indexOf('task') !== -1) {
      return ['Open', 'Pending', 'In Progress', 'Completed', 'Rescheduled'];
    }
    if (title.indexOf('issue') !== -1) {
      return ['Open', 'Pending', 'Escalated', 'Resolved', 'Closed'];
    }
    if (title.indexOf('interaction') !== -1) {
      return ['Open', 'Contacted', 'Interested', 'Not Responding', 'Completed'];
    }

    return ['Open', 'Active', 'Pending', 'Paused', 'Closed', 'Completed', 'Resolved', 'Rescheduled'];
  }

  function getDefaultRecordValue(field) {
    if (field === 'Assigned_Staff') {
      return getUserName();
    }
    if (field === 'Status') {
      return 'Open';
    }
    if (field === 'Active') {
      return 'Yes';
    }
    if (field === 'Priority') {
      return 'Medium';
    }
    if (field === 'Generated_From') {
      return 'Manual';
    }
    return '';
  }

  function getKnownBrands() {
    var values = [];
    var brandRows = moduleState.brands && moduleState.brands.all ? moduleState.brands.all : [];

    brandRows.concat(affiliateState.all || []).forEach(function (row) {
      if (brandRows.indexOf(row) !== -1 && !isActiveReference(row)) {
        return;
      }
      [valueFor(row, 'Brand_Name'), valueFor(row, 'Brand'), valueFor(row, 'Name')].forEach(function (value) {
        if (value && values.indexOf(value) === -1) {
          values.push(value);
        }
      });
    });

    return values.sort();
  }

  function getKnownStaff() {
    var values = [];
    var staffRows = moduleState.staff && moduleState.staff.all ? moduleState.staff.all : [];

    staffRows.concat(affiliateState.all || []).forEach(function (row) {
      if (staffRows.indexOf(row) !== -1 && !isActiveReference(row)) {
        return;
      }
      [valueFor(row, 'Staff_Name'), valueFor(row, 'Assigned_Staff'), valueFor(row, 'Name')].forEach(function (value) {
        if (value && values.indexOf(value) === -1) {
          values.push(value);
        }
      });
    });

    if (!values.length && getUserName()) {
      values.push(getUserName());
    }

    return values.sort();
  }

  function isActiveReference(row) {
    var value = safeLower(firstDefined(valueFor(row, 'Active'), valueFor(row, 'Status')));
    return !value || ['yes', 'true', 'active', 'open'].indexOf(value) !== -1;
  }

  function getKnownAffiliates() {
    return (affiliateState.all || []).map(function (row) {
      var affiliateId = valueFor(row, 'Affiliate_ID');
      var label = [affiliateId, valueFor(row, 'Affiliate_Name'), valueFor(row, 'Brand')].filter(Boolean).join(' - ');
      return affiliateId ? { value: affiliateId, label: label } : null;
    }).filter(Boolean);
  }

  function applyAffiliateSelection(affiliateId) {
    var form = utils.qs('[data-record-form]');
    var row = (affiliateState.all || []).filter(function (affiliate) {
      return valueFor(affiliate, 'Affiliate_ID') === affiliateId;
    })[0];

    if (!form || !row) {
      return;
    }

    setFormValue(form, 'Affiliate_Name', valueFor(row, 'Affiliate_Name'));
    setFormValue(form, 'Brand', valueFor(row, 'Brand'));
    setFormValue(form, 'Assigned_Staff', valueFor(row, 'Assigned_Staff'));
  }

  function setFormValue(form, name, value) {
    if (form.elements[name] && value) {
      form.elements[name].value = value;
    }
  }

  function getRecordFormData() {
    var form = utils.qs('[data-record-form]');
    var data = {};

    if (!form) {
      return data;
    }

    Array.prototype.slice.call(form.elements).forEach(function (element) {
      if (element.name) {
        data[element.name] = element.value;
      }
    });

    return data;
  }

  function isRecordEdit(config, context) {
    return !!(config && config.updateApi && config.idKey && context && context[config.idKey]);
  }

  function validateRecordForm(config) {
    var form = utils.qs('[data-record-form]');
    var data = getRecordFormData();
    var missing = [];

    if (!form) {
      return missing;
    }

    form.querySelectorAll('[data-field-error]').forEach(function (error) {
      error.textContent = '';
    });

    asArray(config.required).forEach(function (field) {
      var input = form.elements[field];
      var error = form.querySelector('[data-field-error="' + field + '"]');
      if (!String(data[field] || '').trim()) {
        missing.push(friendlyFieldLabel(field));
        if (error) {
          error.textContent = friendlyFieldLabel(field) + ' is required.';
        }
        if (input) {
          input.setAttribute('aria-invalid', 'true');
        }
      } else if (input) {
        input.removeAttribute('aria-invalid');
      }
    });

    return missing;
  }

  function friendlyErrorMessage(result, fallback) {
    var message = result && result.message ? result.message : fallback;

    if (!message) {
      return 'Unable to save right now.';
    }

    if (/Only GET requests are supported|requires POST/i.test(message)) {
      return 'This save request used an outdated connection. Refresh the page and try again.';
    }

    return message.replace(/_/g, ' ');
  }

  async function submitRecordForm(event) {
    var config = recordForms[recordState.type];
    var message = utils.qs('[data-record-form-message]');
    var button = utils.qs('[data-record-submit]');
    var payload = getRecordFormData();
    var isEdit;
    var result;

    event.preventDefault();

    if (!config || !api[config.api] || (isRecordEdit(config, recordState.context) && !api[config.updateApi])) {
      utils.setText(message, 'This action is not available.');
      return;
    }

    if (validateRecordForm(config).length) {
      utils.setText(message, 'Please complete the required fields before saving.');
      return;
    }

    if (button) {
      button.disabled = true;
    }
    utils.setText(message, 'Saving...');

    if (config.idKey && recordState.context[config.idKey]) {
      payload[config.idKey] = recordState.context[config.idKey];
    }

    isEdit = isRecordEdit(config, recordState.context);
    if (recordState.type === 'affiliate' && !isEdit) {
      result = await api.createAffiliate(payload);
    } else {
      result = await api[isEdit ? config.updateApi : config.api](payload);
    }

    if (button) {
      button.disabled = false;
    }

    if (!isSuccessfulResult(result)) {
      utils.setText(message, friendlyErrorMessage(result, 'Unable to save record.'));
      return;
    }

    closeRecordModal();
    showToast((isEdit ? 'Update' : config.title) + ' saved.');
    refreshAfterRecordSave(recordState.type);
  }

  function refreshAfterRecordSave(type) {
    dashboardState.loaded = false;
    loadDashboard();

    if (type === 'affiliate') {
      affiliateState.loaded = false;
      loadAffiliates(true);
    }

    if (type === 'followup') {
      followupState.loaded = false;
      loadFollowups(true);
    }

    if (type === 'task' || type === 'issue' || type === 'interaction' || type === 'brand' || type === 'staff') {
      if (moduleState[type + 's']) {
        moduleState[type + 's'].loaded = false;
        loadModule(type + 's', true);
      }
      if (type === 'brand' && moduleState.brands) {
        moduleState.brands.loaded = false;
        loadModule('brands', true);
      }
      if (type === 'staff' && moduleState.staff) {
        moduleState.staff.loaded = false;
        loadModule('staff', true);
      }
    }
  }

  function showToast(message) {
    var region = utils.qs('[data-toast-region]');
    if (!region) {
      return;
    }

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    region.appendChild(toast);

    window.setTimeout(function () {
      toast.classList.add('is-hiding');
      window.setTimeout(function () {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 180);
    }, 3200);
  }

  function bindQuickActions() {
    document.querySelectorAll('[data-quick-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = button.dataset.quickAction;

        if (action === 'followup') {
          openFollowupModal('create');
          return;
        }

        openRecordModal(action);
      });
    });

    document.querySelectorAll('[data-admin-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        openRecordModal(button.dataset.adminAction);
      });
    });

    document.querySelectorAll('[data-placeholder-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        showToast(button.dataset.placeholderAction + ' is planned for a later sprint.');
      });
    });
  }

  function openImportModal(type) {
    var config = csvConfigs[type];
    var modal = utils.qs('[data-import-modal]');
    var textarea = utils.qs('[data-import-csv]');
    var preview = utils.qs('[data-import-preview]');
    var commit = utils.qs('[data-import-commit]');

    if (!config || !modal) {
      showToast('CSV import is not available for this module.');
      return;
    }

    if (!isAdminUser()) {
      showToast('CSV import is restricted to administrators.');
      return;
    }

    importState.type = type;
    importState.preview = null;
    utils.setText(utils.qs('[data-import-modal-title]'), config.title);
    utils.setText(utils.qs('[data-import-guide]'), formatCsvHeaderGuide(config));
    utils.setText(utils.qs('[data-import-message]'), 'Download the sample or choose a CSV file. Preview validates every row before commit.');
    if (textarea) {
      textarea.value = buildSampleCsv(type);
    }
    if (preview) {
      preview.hidden = true;
      preview.innerHTML = '';
    }
    if (commit) {
      commit.disabled = true;
    }
    modal.hidden = false;
  }

  function closeImportModal() {
    var modal = utils.qs('[data-import-modal]');
    if (modal) {
      modal.hidden = true;
    }
  }

  function buildSampleCsv(type) {
    var config = csvConfigs[type];
    var sample = {};

    asArray(config && config.required).forEach(function (field) {
      sample[field] = getDefaultRecordValue(field) || friendlyFieldLabel(field);
    });

    return config.required.join(',') + '\n' + config.required.map(function (field) {
      return csvEscape(sample[field]);
    }).join(',');
  }

  function formatCsvHeaderGuide(config) {
    var headers = asArray(config && config.required);
    return 'Required CSV headers, in any order: ' + headers.join(', ') + '. Use these names exactly; preview will show row errors before import.';
  }

  function csvEscape(value) {
    var text = String(value || '');
    if (/[",\n\r]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  async function previewImportCsv() {
    var textarea = utils.qs('[data-import-csv]');
    var message = utils.qs('[data-import-message]');
    var button = utils.qs('[data-import-preview-button]');
    var commit = utils.qs('[data-import-commit]');
    var result;

    if (!textarea || !textarea.value.trim()) {
      utils.setText(message, 'Paste CSV content before previewing.');
      return;
    }

    if (button) {
      button.disabled = true;
    }
    utils.setText(message, 'Checking CSV rows...');
    result = await api.importCsvPreview({
      entity: importState.type,
      csv: textarea.value
    });
    if (button) {
      button.disabled = false;
    }

    if (!isSuccessfulResult(result)) {
      utils.setText(message, friendlyErrorMessage(result, 'Unable to preview CSV.'));
      if (commit) {
        commit.disabled = true;
      }
      return;
    }

    importState.preview = result.data || {};
    renderImportPreview(importState.preview);
    utils.setText(message, 'Preview ready: ' + displayPlainValue(importState.preview.validRows) + ' valid rows, ' + displayPlainValue(importState.preview.invalidRows) + ' rows with issues.');
    if (commit) {
      commit.disabled = Number(importState.preview.validRows || 0) === 0;
    }
  }

  function renderImportPreview(previewData) {
    var container = utils.qs('[data-import-preview]');
    var rows = asArray(previewData && previewData.rows).slice(0, 8);
    var table;
    var head;
    var body;

    if (!container) {
      return;
    }

    container.hidden = false;
    container.innerHTML = '';
    table = document.createElement('table');
    head = document.createElement('thead');
    body = document.createElement('tbody');
    table.className = 'compact-table';
    head.innerHTML = '<tr><th>Row</th><th>Status</th><th>Preview / Errors</th></tr>';
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var rowCell = document.createElement('td');
      var statusCell = document.createElement('td');
      var detailCell = document.createElement('td');
      rowCell.textContent = row.rowNumber;
      statusCell.appendChild(createBadge('Status', row.valid ? 'Ready' : 'Needs fixes'));
      detailCell.textContent = row.valid ? summarizeImportRow(row.item) : asArray(row.errors).join(', ');
      tr.className = row.valid ? 'is-valid' : 'is-invalid';
      tr.appendChild(rowCell);
      tr.appendChild(statusCell);
      tr.appendChild(detailCell);
      body.appendChild(tr);
    });
    table.appendChild(head);
    table.appendChild(body);
    container.appendChild(table);

    if (asArray(previewData && previewData.rows).length > rows.length) {
      container.appendChild(createEmptyPanel('Showing first ' + rows.length + ' preview rows.'));
    }
  }

  function summarizeImportRow(row) {
    return [row.Affiliate_Name, row.Brand_Name, row.Staff_Name, row.Title, row.Issue, row.Affiliate_ID, row.Brand].filter(Boolean).slice(0, 3).join(' | ') || 'Valid row';
  }

  async function commitImportCsv() {
    var textarea = utils.qs('[data-import-csv]');
    var message = utils.qs('[data-import-message]');
    var button = utils.qs('[data-import-commit]');
    var result;

    if (!importState.preview || Number(importState.preview.validRows || 0) === 0) {
      utils.setText(message, 'Preview a CSV with valid rows before committing.');
      return;
    }

    if (!window.confirm('Commit ' + importState.preview.validRows + ' valid CSV rows?')) {
      return;
    }

    if (button) {
      button.disabled = true;
    }
    utils.setText(message, 'Committing valid rows...');
    result = await api.importCsvCommit({
      entity: importState.type,
      csv: textarea ? textarea.value : ''
    });

    if (button) {
      button.disabled = false;
    }

    if (!isSuccessfulResult(result)) {
      utils.setText(message, friendlyErrorMessage(result, 'Unable to commit CSV.'));
      return;
    }

    closeImportModal();
    showToast('CSV import committed: ' + displayPlainValue(result.data && result.data.committed) + ' rows.');
    refreshAfterRecordSave(importState.type);
  }

  function downloadImportSample() {
    var config = csvConfigs[importState.type];
    var blob;
    var link;

    if (!config) {
      return;
    }

    blob = new Blob([buildSampleCsv(importState.type)], { type: 'text/csv;charset=utf-8' });
    link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = importState.type + '-sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () {
      URL.revokeObjectURL(link.href);
    }, 500);
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

  function bindFollowupControls() {
    var search = utils.qs('[data-followup-search]');
    if (search) {
      search.addEventListener('input', filterFollowups);
    }

    document.querySelectorAll('[data-followup-filter]').forEach(function (filter) {
      filter.addEventListener('change', filterFollowups);
    });

    var start = utils.qs('[data-followup-date-start]');
    var end = utils.qs('[data-followup-date-end]');
    if (start) {
      start.addEventListener('change', filterFollowups);
    }
    if (end) {
      end.addEventListener('change', filterFollowups);
    }

    var add = utils.qs('[data-followup-add]');
    if (add) {
      add.addEventListener('click', function () {
        openFollowupModal('create');
      });
    }

    var close = utils.qs('[data-followup-modal-close]');
    if (close) {
      close.addEventListener('click', closeFollowupModal);
    }

    var cancel = utils.qs('[data-followup-modal-cancel]');
    if (cancel) {
      cancel.addEventListener('click', closeFollowupModal);
    }

    var modal = utils.qs('[data-followup-modal]');
    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) {
          closeFollowupModal();
        }
      });
    }

    var form = utils.qs('[data-followup-form]');
    if (form) {
      form.addEventListener('submit', submitFollowupForm);
    }

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeFollowupModal();
      }
    });
  }

  function bindModuleControls() {
    moduleRoutes.forEach(function (routeKey) {
      var root = getModuleRoot(routeKey);
      var search = root ? root.querySelector('[data-module-search]') : null;

      if (search) {
        search.addEventListener('input', function () {
          filterModule(routeKey);
        });
      }
    });

    document.querySelectorAll('[data-module-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = button.dataset.moduleAction || 'action';
        openRecordModal(action);
      });
    });
  }

  function bindRecordModal() {
    var close = utils.qs('[data-record-modal-close]');
    var cancel = utils.qs('[data-record-modal-cancel]');
    var modal = utils.qs('[data-record-modal]');
    var form = utils.qs('[data-record-form]');

    if (close) {
      close.addEventListener('click', closeRecordModal);
    }

    if (cancel) {
      cancel.addEventListener('click', closeRecordModal);
    }

    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) {
          closeRecordModal();
        }
      });
    }

    if (form) {
      form.addEventListener('submit', submitRecordForm);
    }

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeRecordModal();
      }
    });
  }

  function bindImportModal() {
    var modal = utils.qs('[data-import-modal]');
    var close = utils.qs('[data-import-modal-close]');
    var preview = utils.qs('[data-import-preview-button]');
    var commit = utils.qs('[data-import-commit]');
    var sample = utils.qs('[data-import-sample]');
    var file = utils.qs('[data-import-file]');

    document.querySelectorAll('[data-import-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        openImportModal(button.dataset.importAction);
      });
    });

    if (close) {
      close.addEventListener('click', closeImportModal);
    }
    if (preview) {
      preview.addEventListener('click', previewImportCsv);
    }
    if (commit) {
      commit.addEventListener('click', commitImportCsv);
    }
    if (sample) {
      sample.addEventListener('click', downloadImportSample);
    }
    if (file) {
      file.addEventListener('change', function () {
        var selected = file.files && file.files[0];
        var reader;
        if (!selected) {
          return;
        }
        reader = new FileReader();
        reader.onload = function () {
          var textarea = utils.qs('[data-import-csv]');
          if (textarea) {
            textarea.value = String(reader.result || '');
          }
        };
        reader.readAsText(selected);
      });
    }
    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) {
          closeImportModal();
        }
      });
    }
    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeImportModal();
      }
    });
  }

  function initAppShell() {
    if (!ensureSession()) {
      return;
    }

    applyUserToShell();
    bindSidebar();
    bindNavigation();
    bindAffiliateControls();
    bindFollowupControls();
    bindModuleControls();
    bindQuickActions();
    bindRecordModal();
    bindImportModal();
    bindLogout();
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
      bindLoginForm();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
