(function (window) {
  'use strict';

  var utils = window.AffiliateSuccessUtils;
  var api = window.AffiliateSuccessApi;
  var router = window.AffiliateSuccessRouter;
  var auth = window.AffiliateSuccessAuth;
  var appConfig = window.AffiliateSuccessConfig || {};
  var DEBUG_CACHE_MARKER = 'live-trial-stabilization';
  var currentUser = null;
  var latestApiDebug = null;
  var debugPanelVisible = false;
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
    staffMembers: 'Live API data',
    thisMonthFtd: 'Live performance data',
    activePlayers: 'Live performance data',
    turnover: 'Live performance data',
    revenueNgr: 'Live performance data'
  };

  var affiliateColumns = [
    'Affiliate_ID',
    'Brand',
    'Affiliate_Name',
    'Affiliate_Username',
    'Telegram',
    'WhatsApp',
    'Email',
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
  var affiliateKeyFields = ['Affiliate_Name', 'Brand', 'Affiliate_ID', 'Affiliate_Username', 'Telegram', 'WhatsApp', 'Email', 'Assigned_Staff', 'Status', 'Health_Status', 'Priority', 'Last_Contact_Date', 'Next_Followup_Date', 'Next_Action', 'Notes'];
  var copyableAffiliateFields = ['Affiliate_ID', 'Affiliate_Username', 'Telegram', 'WhatsApp', 'Email'];
  var followupAffiliateLinkFields = ['Affiliate_ID', 'Affiliate_Username', 'Affiliate_Name'];
  var followupColumns = [
    'Queue_ID',
    'Affiliate_ID',
    'Affiliate_Username',
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
  var followupSearchFields = ['Affiliate_ID', 'Affiliate_Username', 'Affiliate_Name', 'Brand'];
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
      required: ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Language', 'Telegram', 'WhatsApp', 'Email', 'Assigned_Staff', 'Status', 'Health_Status', 'Priority', 'Segment', 'Affiliate_Type', 'Market_Channel', 'Next_Followup_Date', 'Active'],
      sections: {
        'Basic Info': ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Language'],
        'Contact Details': ['Telegram', 'WhatsApp', 'Email'],
        Assignment: ['Assigned_Staff'],
        'Status & Priority': ['Status', 'Health_Status', 'Priority', 'Segment', 'Affiliate_Type', 'Market_Channel', 'Active'],
        'Follow-up Plan': ['Next_Followup_Date']
      },
      fields: ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Language', 'Telegram', 'WhatsApp', 'Email', 'Assigned_Staff', 'Status', 'Health_Status', 'Priority', 'Segment', 'Affiliate_Type', 'Market_Channel', 'Next_Followup_Date', 'Active']
    },
    affiliateDetails: {
      title: 'Update Affiliate Details',
      api: 'updateAffiliate',
      updateApi: 'updateAffiliate',
      idKey: 'Affiliate_ID',
      sections: {
        'Contact Details': ['Telegram', 'WhatsApp', 'Email'],
        'Basic Details': ['Country', 'Language'],
        'Priority': ['Priority'],
        'Follow-up Notes': ['Next_Followup_Date', 'Next_Action', 'Notes']
      },
      fields: ['Telegram', 'WhatsApp', 'Email', 'Country', 'Language', 'Priority', 'Notes', 'Next_Followup_Date', 'Next_Action']
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
      required: ['Affiliate_ID', 'Issue_Details', 'Priority', 'Status'],
      sections: {
        'Basic Info': ['Affiliate_ID', 'Category', 'Issue_Details', 'Brand'],
        Assignment: ['Assigned_To'],
        'Status & Priority': ['Priority', 'Status']
      },
      fields: ['Affiliate_ID', 'Category', 'Issue_Details', 'Brand', 'Assigned_To', 'Priority', 'Status']
    },
    interaction: {
      title: 'Add Interaction',
      api: 'createInteraction',
      idKey: 'Interaction_ID',
      required: ['Affiliate_ID', 'Affiliate_Name', 'Brand', 'Assigned_Staff', 'Market_Channel', 'Interaction_Type', 'Notes', 'Status'],
      sections: {
        'Basic Info': ['Affiliate_ID', 'Affiliate_Name', 'Brand'],
        Assignment: ['Assigned_Staff'],
        Notes: ['Market_Channel', 'Interaction_Type', 'Notes', 'Status', 'Next_Followup_Date']
      },
      fields: ['Affiliate_ID', 'Affiliate_Name', 'Brand', 'Assigned_Staff', 'Market_Channel', 'Interaction_Type', 'Notes', 'Status', 'Next_Followup_Date']
    },
    performance: {
      title: 'Update Performance',
      api: 'createPerformance',
      updateApi: 'updatePerformance',
      idKey: 'Performance_ID',
      required: ['Period_Type', 'Brand', 'Affiliate_ID', 'FTD', 'Active_Players', 'Deposit_Amount', 'NGR'],
      sections: {
        'Affiliate': ['Affiliate_ID', 'Affiliate_Name', 'Brand', 'Assigned_Staff'],
        'Performance period': ['Period_Type', 'Month', 'Week_Start', 'Week_End'],
        'Performance metrics': ['Registrations', 'FTD', 'Active_Players', 'Deposits', 'Deposit_Amount', 'Turnover', 'NGR', 'Commission'],
        'Status & Notes': ['Status', 'Remarks']
      },
      fields: ['Affiliate_ID', 'Affiliate_Name', 'Brand', 'Assigned_Staff', 'Period_Type', 'Month', 'Week_Start', 'Week_End', 'Registrations', 'FTD', 'Active_Players', 'Deposits', 'Deposit_Amount', 'Turnover', 'NGR', 'Commission', 'Status', 'Remarks']
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
    Interaction_Type: 'Interaction type',
    Performance_ID: 'Performance ID',
    Period_Type: 'Period type',
    Week_Start: 'Week start',
    Week_End: 'Week end',
    Registrations: 'Registrations',
    Active_Players: 'Active players',
    Deposits: 'Deposits',
    Deposit_Amount: 'Deposit amount',
    Turnover: 'Turnover',
    NGR: 'Revenue/NGR',
    Revenue_NGR: 'Revenue/NGR',
    Conversion_Rate: 'Conversion rate',
    Growth_Percent: 'Growth percent',
    Remarks: 'Remarks',
    Updated_By: 'Updated by',
    Updated_At: 'Updated at',
    Issue_Details: 'Issue details',
    Assigned_To: 'Assigned to',
    Reported_By: 'Reported by',
    Days_Open: 'Days open',
    Resolved_Date: 'Resolved date'
  };
  var csvConfigs = {
    affiliate: {
      title: 'Import Affiliates',
      required: ['Affiliate_Name', 'Affiliate_Username', 'Brand', 'Country', 'Language', 'Telegram', 'WhatsApp', 'Email', 'Assigned_Staff', 'Status', 'Health_Status', 'Priority', 'Segment', 'Affiliate_Type', 'Market_Channel', 'Next_Followup_Date', 'Active'],
      optional: ['Affiliate_ID', 'Joined_Date', 'Last_Contact_Date', 'Next_Action', 'Last_Performance_Update', 'Notes']
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
    performance: {
      title: 'Import Performance',
      required: ['Period_Type', 'Brand', 'Affiliate_ID', 'FTD', 'Active_Players', 'Deposit_Amount', 'Turnover', 'NGR'],
      optional: ['Month', 'Week_Start', 'Week_End', 'Affiliate_Name', 'Assigned_Staff', 'Registrations', 'Deposits', 'Revenue_NGR', 'Commission', 'Growth_Percent', 'Conversion_Rate', 'Status', 'Notes', 'Remarks']
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
        { label: 'Mark In Progress', status: 'In Progress', api: 'updateTask', when: 'open' },
        { label: 'Complete', api: 'completeTask', tone: 'primary', when: 'open', confirm: 'Mark this task complete?' },
        { label: 'Add note', form: 'interaction', when: 'open' },
        { label: 'Reopen', api: 'reopenTask', when: 'closed', confirm: 'Reopen this task?' },
        { label: 'Reschedule', form: 'task', when: 'open' }
      ]
    },
    issues: {
      api: 'issues',
      itemName: 'issues',
      search: ['Issue_ID', 'Issue_Details', 'Issue', 'Affiliate_Name', 'Affiliate_ID', 'Brand', 'Assigned_To', 'Assigned_Staff', 'Reported_By', 'Status', 'Priority'],
      filters: [
        { label: 'Status', key: 'Status', fallback: ['Issue_Status'] },
        { label: 'Priority', key: 'Priority' },
        { label: 'Assigned Staff', key: 'Assigned_To', fallback: ['Assigned To', 'Assigned_Staff', 'Assigned Staff', 'Staff'] },
        { label: 'Brand', key: 'Brand' }
      ],
      stats: [
        { label: 'Open', type: 'open' },
        { label: 'Urgent', type: 'priority', values: ['high', 'critical'] },
        { label: 'Overdue', type: 'overdue', dateKeys: ['Due_Date', 'Created_Date', 'Date'] },
        { label: 'Resolved', type: 'completed' }
      ],
      columns: [
        { label: 'Issue', keys: ['Issue_Details', 'Issue', 'Issue_ID', 'Title'] },
        { label: 'Affiliate', keys: ['Affiliate_Name', 'Affiliate_ID'] },
        { label: 'Brand', keys: ['Brand'] },
        { label: 'Priority', keys: ['Priority'], badge: 'Priority' },
        { label: 'Status', keys: ['Status', 'Issue_Status'], badge: 'Status' },
        { label: 'Assigned Staff', keys: ['Assigned_To', 'Assigned To', 'Assigned_Staff', 'Assigned Staff', 'Staff'] },
        { label: 'Reported By', keys: ['Reported_By', 'Reported By'] },
        { label: 'Created', keys: ['Created_Date', 'Date'], format: 'date' }
      ],
      actions: [
        { label: 'Add update', form: 'issue' },
        { label: 'Escalate', status: 'Escalated', api: 'updateIssue', when: 'open' },
        { label: 'Resolve', api: 'closeIssue', tone: 'primary', when: 'open', confirm: 'Close this issue?' },
        { label: 'Reopen', api: 'reopenIssue', when: 'closed', confirm: 'Reopen this issue?' }
      ]
    },
    performance: {
      api: 'performance',
      itemName: 'performance rows',
      search: ['Period_Type', 'Date', 'Month', 'Week_Start', 'Week_End', 'Brand', 'Affiliate_Name', 'Affiliate_ID', 'Assigned_Staff', 'Revenue_NGR', 'Revenue', 'NGR', 'Turnover', 'Commission', 'Status', 'Remarks'],
      filters: [
        { label: 'Period Type', key: 'Period_Type' },
        { label: 'Month', key: 'Month', fallback: ['Performance_Month', 'Period'] },
        { label: 'Week Start', key: 'Week_Start' },
        { label: 'Brand', key: 'Brand' },
        { label: 'Staff', key: 'Assigned_Staff', fallback: ['Staff'] },
        { label: 'Affiliate', key: 'Affiliate_ID', fallback: ['Affiliate_Name'] },
        { label: 'Status', key: 'Status' }
      ],
      stats: [
        { label: 'Total FTD', type: 'sum', keys: ['FTD', 'FTDs'] },
        { label: 'Active Players', type: 'sum', keys: ['Active_Players', 'Active Players'] },
        { label: 'Deposit Amount', type: 'sum', keys: ['Deposit_Amount', 'Deposit Amount'] },
        { label: 'Turnover', type: 'sum', keys: ['Turnover'] },
        { label: 'Revenue/NGR', type: 'sum', keys: ['Revenue_NGR', 'Revenue', 'NGR'] },
        { label: 'Avg Conversion', type: 'avgConversion' }
      ],
      columns: [
        { label: 'Period Type', keys: ['Period_Type'] },
        { label: 'Month', keys: ['Month', 'Performance_Month', 'Period'], format: 'month' },
        { label: 'Week Start', keys: ['Week_Start'], format: 'date' },
        { label: 'Week End', keys: ['Week_End'], format: 'date' },
        { label: 'Brand', keys: ['Brand'] },
        { label: 'Affiliate ID', keys: ['Affiliate_ID'] },
        { label: 'Affiliate Username', keys: ['Affiliate_Username'], lookup: 'affiliateUsername', emptyText: '-' },
        { label: 'FTD', keys: ['FTD', 'FTDs'] },
        { label: 'Active Players', keys: ['Active_Players', 'Active Players'] },
        { label: 'Deposits', keys: ['Deposit_Amount', 'Deposit Amount'] },
        { label: 'Turnover', keys: ['Turnover'] },
        { label: 'Revenue/NGR', keys: ['Revenue_NGR', 'NGR', 'Revenue'] },
        { label: 'Conversion/Growth', keys: ['Conversion_Rate', 'Growth_Percent'] },
        { label: 'Status', keys: ['Status'], badge: 'Status' },
        { label: 'Updated', keys: ['Updated_At'], format: 'date' }
      ],
      actions: [
        { label: 'Update', form: 'performance' }
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

  function isSuperAdminUser() {
    return String(currentUser && currentUser.role || '').toUpperCase() === 'SUPER_ADMIN';
  }

  function getScriptCacheVersion(fileName) {
    var script = Array.prototype.slice.call(document.scripts || []).filter(function (item) {
      return item.src && item.src.indexOf(fileName) !== -1;
    })[0];

    if (!script) {
      return '';
    }

    try {
      return new URL(script.src).searchParams.get('v') || '';
    } catch (error) {
      return '';
    }
  }

  function ensureDebugPanel() {
    var panel = utils.qs('[data-debug-panel]');

    if (!isSuperAdminUser()) {
      if (panel) {
        panel.remove();
      }
      return null;
    }

    if (panel) {
      return panel;
    }

    panel = document.createElement('aside');
    panel.className = 'debug-panel';
    panel.setAttribute('data-debug-panel', '');
    panel.hidden = !debugPanelVisible;
    panel.innerHTML = '<h2>Admin Debug</h2><dl data-debug-panel-list></dl>';
    document.body.appendChild(panel);
    return panel;
  }

  function renderDebugPanel(extra) {
    var panel;
    var list;
    var debug = extra || latestApiDebug || (api && api.getLastDebug ? api.getLastDebug() : {}) || {};
    var rows;

    if (!debugPanelVisible) {
      return;
    }

    panel = ensureDebugPanel();
    if (!panel) {
      return;
    }

    panel.hidden = false;
    list = panel.querySelector('[data-debug-panel-list]');
    if (!list) {
      return;
    }

    rows = [
      ['API_BASE_URL', appConfig.API_BASE_URL || ''],
      ['cache config.js', getScriptCacheVersion('config.js')],
      ['cache app.js', getScriptCacheVersion('app.js') || DEBUG_CACHE_MARKER],
      ['session user', getUserName()],
      ['session role', getRoleLabel()],
      ['last action', debug.action || ''],
      ['last method', debug.method || ''],
      ['last response', [debug.responseCode || '', debug.responseMessage || ''].join(' ').trim()],
      ['last payload keys', (debug.payloadKeys || []).join(', ')]
    ];

    list.innerHTML = rows.map(function (row) {
      return '<dt>' + escapeHtml(row[0]) + '</dt><dd>' + escapeHtml(row[1]) + '</dd>';
    }).join('');
  }

  function updateDebugBeforeRequest(action, method, payload) {
    var debug = {
      action: action,
      method: method,
      responseCode: 'pending',
      responseMessage: 'Request queued',
      payloadKeys: Object.keys(payload || {})
    };

    latestApiDebug = debug;
    renderDebugPanel(debug);
    if (window.console && console.log) {
      console.log('[Affiliate Success Debug]', debug, payload || {});
    }
  }

  function bindApiDebugPanel() {
    window.addEventListener('affiliate-success-api-debug', function (event) {
      latestApiDebug = event.detail || {};
      renderDebugPanel(latestApiDebug);
    });
  }

  function bindDebugToggle() {
    var button = utils.qs('[data-debug-toggle]');
    if (!button) {
      return;
    }

    button.addEventListener('click', function () {
      var panel;
      debugPanelVisible = !debugPanelVisible;
      panel = ensureDebugPanel();
      if (panel) {
        panel.hidden = !debugPanelVisible;
      }
      if (debugPanelVisible) {
        renderDebugPanel();
      }
    });
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

  function escapeHtml(value) {
    return displayPlainValue(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
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
        renderLoginMessage(message, {
          message: 'Enter your Login ID.'
        });
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Signing in...';
      }
      renderLoginMessage(message, {
        message: 'Checking staff access.'
      });

      auth.login(loginId).then(function (result) {
        if (!isSuccessfulResult(result)) {
          renderLoginMessage(message, result || {
            message: 'Unable to sign in.'
          });
          return;
        }

        window.location.href = 'index.html#dashboard';
      }).catch(function () {
        renderLoginMessage(message, {
          message: 'Unable to sign in. Check the Apps Script deployment.'
        });
      }).finally(function () {
        if (submit) {
          submit.disabled = false;
          submit.textContent = 'Sign in';
        }
      });
    });
  }

  function renderLoginMessage(container, result) {
    var code = getLoginErrorCode(result);
    var ip;

    if (!container) {
      return;
    }

    container.classList.remove('login-denied');
    container.innerHTML = '';

    if (code !== 'AUTH_IP_NOT_ALLOWED') {
      container.textContent = result && result.message ? result.message : '';
      return;
    }

    ip = getLoginDeniedIp(result);
    container.classList.add('login-denied');
    container.appendChild(createLoginDeniedMessage(ip));
  }

  function getLoginErrorCode(result) {
    var errorText = typeof (result && result.error) === 'string' ? result.error : '';
    var message = result && result.message ? result.message : '';

    if (result && result.code) {
      return result.code;
    }
    if (result && result.error && result.error.code) {
      return result.error.code;
    }
    if (/AUTH_IP_NOT_ALLOWED|not authorized for this account|not allowed from your current IP/i.test(errorText || message)) {
      return 'AUTH_IP_NOT_ALLOWED';
    }

    return '';
  }

  function getLoginDeniedIp(result) {
    var details = result && result.details ? result.details : {};
    var errorDetails = result && result.error && result.error.details ? result.error.details : {};
    var data = result && result.data ? result.data : {};
    var ip = data.detectedIp || data.ip || details.detectedIp || details.ip || errorDetails.detectedIp || errorDetails.ip || result.clientIp;
    return ip ? String(ip).trim() : 'Unable to detect IP';
  }

  function createLoginDeniedMessage(ip) {
    var wrap = document.createElement('span');
    var title = document.createElement('strong');
    var body = document.createElement('span');
    var ipRow = document.createElement('span');
    var ipLabel = document.createElement('span');
    var ipValue = document.createElement('strong');
    var copyButton = document.createElement('button');
    var help = document.createElement('span');

    wrap.className = 'login-denied-content';
    title.textContent = 'Access Denied';
    body.textContent = 'Your current IP address is not authorized for this account.';
    ipRow.className = 'login-denied-ip';
    ipLabel.textContent = 'Current IP:';
    ipValue.textContent = ip;
    copyButton.className = 'copy-button';
    copyButton.type = 'button';
    copyButton.textContent = 'Copy IP';
    copyButton.disabled = ip === 'Unable to detect IP';
    copyButton.addEventListener('click', function () {
      copyTextToClipboard(ip, 'Current IP', copyButton);
    });
    help.textContent = 'If you believe this is incorrect, please contact your administrator to whitelist this IP address.';

    ipRow.appendChild(ipLabel);
    ipRow.appendChild(ipValue);
    ipRow.appendChild(copyButton);
    wrap.appendChild(title);
    wrap.appendChild(body);
    wrap.appendChild(ipRow);
    wrap.appendChild(help);
    return wrap;
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

    document.querySelectorAll('[data-debug-toggle]').forEach(function (button) {
      button.hidden = !isSuperAdminUser();
    });

    document.querySelectorAll('[data-staff-email-action]').forEach(function (button) {
      button.hidden = isAdminUser();
    });

    document.querySelectorAll('[data-quick-action]').forEach(function (button) {
      var action = button.dataset.quickAction;
      if (!isAdminUser() && ['affiliate', 'task'].indexOf(action) !== -1) {
        button.hidden = true;
        return;
      }
      if (!isAdminUser() && action === 'followup') {
        button.textContent = 'Log Follow-up';
      }
      if (!isAdminUser() && action === 'interaction') {
        button.textContent = 'Log Interaction';
      }
      if (!isAdminUser() && action === 'performance') {
        button.textContent = 'Update Performance';
      }
      if (!isAdminUser() && action === 'issue') {
        button.textContent = 'Report Issue';
      }
    });

    document.querySelectorAll('[data-admin-action]').forEach(function (button) {
      var action = button.dataset.adminAction;
      if (!isAdminUser() && (['affiliate', 'task', 'issue', 'brand', 'staff'].indexOf(action) !== -1 || (recordForms[action] && recordForms[action].adminOnly))) {
        button.hidden = true;
      }
    });

    document.querySelectorAll('[data-module-action]').forEach(function (button) {
      var action = button.dataset.moduleAction;
      if (!isAdminUser() && action === 'interaction') {
        button.textContent = 'Log Interaction';
      }
      if (!isAdminUser() && action === 'performance') {
        button.textContent = 'Update Performance';
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
      hideStaffAdminRoutes();
      var footer = utils.qs('.sidebar-footer .muted');
      if (footer) {
        footer.textContent = 'My assigned affiliate work, follow-ups, tasks, and issues.';
      }
      setStaffEmptyCopy();
      renderStaffSopPanel();
    }

    renderDebugPanel();
  }

  function hideStaffAdminRoutes() {
    ['leaderboard', 'reports', 'staff'].forEach(function (routeKey) {
      var item = utils.qs('.sidebar-nav [data-route="' + routeKey + '"]');
      if (item) {
        item.hidden = true;
      }
    });
  }

  function setStaffEmptyCopy() {
    var followupEmpty = utils.qs('[data-followups-empty] .muted');
    var taskEmpty = utils.qs('[data-module-workspace="tasks"] [data-module-empty] .muted');
    var issueEmpty = utils.qs('[data-module-workspace="issues"] [data-module-empty] .muted');

    utils.setText(followupEmpty, 'No assigned follow-ups. Check My Affiliates or wait for admin assignment.');
    utils.setText(taskEmpty, 'No assigned tasks.');
    utils.setText(issueEmpty, 'No assigned issues.');
  }

  function renderStaffSopPanel() {
    var workspace = utils.qs('[data-section="dashboard"] .dashboard-grid');
    var existing = utils.qs('[data-staff-sop-panel]');
    var panel;
    var heading;
    var text;

    if (!workspace || existing) {
      return;
    }

    panel = document.createElement('article');
    heading = document.createElement('h2');
    text = document.createElement('p');
    panel.className = 'dashboard-panel glass-panel is-wide';
    panel.dataset.staffSopPanel = 'true';
    heading.textContent = 'Staff SOP';
    text.className = 'muted';
    text.textContent = 'Contact affiliate -> log interaction -> update follow-up/task -> update performance -> report issue if needed.';
    panel.appendChild(heading);
    panel.appendChild(text);
    workspace.insertBefore(panel, workspace.firstChild);
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
    var summaryFallbacks = {
      thisMonthFtd: ['totalFtd', 'ftd'],
      activePlayers: ['activePlayers'],
      turnover: ['turnover'],
      revenueNgr: ['revenueNgr', 'revenue', 'ngr'],
      depositAmount: ['depositAmount'],
      commission: ['commission'],
      growth: ['growth', 'averageConversion']
    };
    var fallbackKeys;
    var index;

    if (data && data[key] !== null && data[key] !== undefined && data[key] !== '') {
      return data[key];
    }

    fallbackKeys = summaryFallbacks[key] || [];
    for (index = 0; index < fallbackKeys.length; index += 1) {
      if (data && data.performanceSummary && data.performanceSummary[fallbackKeys[index]] !== null && data.performanceSummary[fallbackKeys[index]] !== undefined && data.performanceSummary[fallbackKeys[index]] !== '') {
        return data.performanceSummary[fallbackKeys[index]];
      }
    }

    return 0;
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
    utils.setText(utils.qs('[data-dashboard-status]'), isStaffMode ? 'Daily process: review assigned follow-ups/tasks -> contact affiliate -> log interaction -> update follow-up/task -> update weekly/monthly performance.' : 'Admin process: assign affiliates/tasks -> review overdue items -> check weekly/monthly performance -> coach staff/affiliate.');

    setMetricLabel('totalAffiliates', isStaffMode ? 'My Affiliates' : 'Total Affiliates');
    setMetricLabel('todayFollowups', isStaffMode ? 'My Due Follow-ups' : "Today's Follow-ups");
    setMetricLabel('overdueFollowups', isStaffMode ? 'My Overdue Follow-ups' : 'Overdue Follow-ups');
    setMetricLabel('openTasks', isStaffMode ? 'My Open Tasks' : 'Open Tasks');
    setMetricLabel('openIssues', isStaffMode ? 'My Open Issues' : 'Open Issues');
    setMetricLabel('completedFollowups', isStaffMode ? 'My Completed Follow-ups' : 'Completed Follow-ups');
    setMetricLabel('thisMonthFtd', isStaffMode ? 'My Month FTD' : 'This Month FTD');
    setMetricLabel('activePlayers', isStaffMode ? 'My Active Players' : 'Active Players');
    setMetricLabel('turnover', isStaffMode ? 'My Turnover' : 'Turnover');
    setMetricLabel('revenueNgr', isStaffMode ? 'My Revenue/NGR' : 'Revenue/NGR');
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
    enableWorkspaceMetricNavigation();
    renderWarnings(asArray(workspace.warnings));
  }

  function enableWorkspaceMetricNavigation() {
    document.querySelectorAll('[data-workspace-metric="recentInteractions"]').forEach(function (metric) {
      var target = metric.parentElement;
      if (!target || target.dataset.interactionsNavReady === 'true') {
        return;
      }
      target.dataset.interactionsNavReady = 'true';
      target.setAttribute('role', 'link');
      target.setAttribute('tabindex', '0');
      target.title = 'Open My Interactions';
      target.addEventListener('click', function () {
        window.location.hash = '#interactions';
      });
      target.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          window.location.hash = '#interactions';
        }
      });
    });
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
    setPanelLoading('[data-dashboard-status]', 'Loading status distribution...');
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
    setPanelEmpty('[data-dashboard-status]', message);
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
    renderAffiliateStatusSummary(data);
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
    renderRecordList('[data-dashboard-performance]', items, 'No weekly or monthly performance rows available.', function (item) {
      var metrics = [];
      if (item.ftd !== '') {
        metrics.push('FTD ' + item.ftd);
      }
      if (item.turnover !== '') {
        metrics.push('Turnover ' + item.turnover);
      }
      if (item.revenue !== '') {
        metrics.push('Revenue ' + item.revenue);
      }
      if (item.growth) {
        metrics.push('Growth ' + item.growth);
      }
      return {
        title: [item.periodType, item.month || item.weekStart, item.brand].filter(Boolean).join(' | ') || 'Performance row',
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
    if (stat.type === 'sum') {
      return formatNumber(sumModuleValues(items, stat.keys || []));
    }
    if (stat.type === 'avgConversion') {
      return formatPercent(averagePerformanceConversion(items));
    }
    return 'N/A';
  }

  function sumModuleValues(items, keys) {
    return items.reduce(function (sum, item) {
      var value = Number(getModuleValue(item, keys) || 0);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  }

  function averagePerformanceConversion(items) {
    var explicit = items.map(function (item) {
      return Number(getModuleValue(item, ['Conversion_Rate', 'Growth_Percent']) || '');
    }).filter(function (value) {
      return !isNaN(value) && value > 0;
    });
    if (explicit.length) {
      return explicit.reduce(function (sum, value) { return sum + value; }, 0) / explicit.length;
    }
    var active = sumModuleValues(items, ['Active_Players', 'Active Players']);
    var ftd = sumModuleValues(items, ['FTD', 'FTDs']);
    return active ? ftd / active : '';
  }

  function formatNumber(value) {
    var number = Number(value || 0);
    if (isNaN(number)) {
      return '0';
    }
    return number.toLocaleString();
  }

  function formatPercent(value) {
    if (value === '' || value === null || value === undefined || isNaN(Number(value))) {
      return 'N/A';
    }
    return Math.round(Number(value) * 1000) / 10 + '%';
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

    if (actionConfig.confirm && !window.confirm(actionConfig.confirm)) {
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
    var value = column.lookup === 'affiliateUsername'
      ? getAffiliateUsernameForRecord(item)
      : getModuleValue(item, column.keys || []);

    if (column.badge) {
      parent.appendChild(createBadge(column.badge, value || 'N/A'));
      return;
    }
    if (column.format === 'date') {
      parent.textContent = formatDate(value);
    } else if (column.format === 'month') {
      parent.textContent = formatMonthValue(value);
    } else {
      parent.textContent = column.emptyText && !value ? column.emptyText : displayPlainValue(value);
    }
  }

  function getAffiliateUsernameForRecord(item) {
    var directUsername = getModuleValue(item, ['Affiliate_Username']);
    var affiliateId;
    var affiliate;

    if (directUsername) {
      return directUsername;
    }

    affiliateId = getModuleValue(item, ['Affiliate_ID']);
    if (!affiliateId) {
      return '';
    }

    affiliate = asArray(affiliateState.all).filter(function (row) {
      return safeLower(valueFor(row, 'Affiliate_ID').trim()) === safeLower(affiliateId.trim());
    })[0];

    return affiliate ? valueFor(affiliate, 'Affiliate_Username').trim() : '';
  }

  function formatMonthValue(value) {
    var raw = String(value || '');
    if (/^\d{4}-\d{2}/.test(raw)) {
      return raw.slice(0, 7);
    }
    return displayPlainValue(raw);
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
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', 'View interaction details');
      date.textContent = formatDate(getModuleValue(item, ['Date', 'Interaction_Date', 'Timestamp']));
      title.textContent = firstDefined(getModuleValue(item, ['Interaction_Type', 'Type']), 'Interaction') + ' - ' + firstDefined(getModuleValue(item, ['Affiliate_Name', 'Affiliate', 'Affiliate_ID']), 'Affiliate');
      details.textContent = firstDefined(getModuleValue(item, ['Notes', 'Summary', 'Description']), getModuleValue(item, ['Assigned_Staff', 'Staff']), 'No summary available');
      row.addEventListener('click', function () {
        openInteractionDetail(item);
      });
      row.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openInteractionDetail(item);
        }
      });
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

    if (copyableAffiliateFields.indexOf(key) !== -1) {
      appendCopyableValue(parent, key, value);
      return;
    }

    var strong = document.createElement('strong');
    strong.textContent = value;
    parent.appendChild(strong);
  }

  function appendCopyableValue(parent, key, value) {
    var wrap = document.createElement('div');
    var strong = document.createElement('strong');
    var button = document.createElement('button');
    var canCopy = value && value !== 'N/A';

    wrap.className = 'copy-value';
    strong.textContent = value;
    button.className = 'copy-button';
    button.type = 'button';
    button.textContent = 'Copy';
    button.disabled = !canCopy;
    button.setAttribute('aria-label', 'Copy ' + friendlyFieldLabel(key));
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      copyTextToClipboard(value, friendlyFieldLabel(key), button);
    });

    wrap.appendChild(strong);
    wrap.appendChild(button);
    parent.appendChild(wrap);
  }

  function copyTextToClipboard(value, label, button) {
    var text = value === 'N/A' ? '' : String(value || '');
    if (!text) {
      showToast('Nothing to copy.');
      return;
    }

    copyText(text).then(function () {
      if (button) {
        button.textContent = 'Copied';
        window.setTimeout(function () {
          button.textContent = 'Copy';
        }, 1400);
      }
      showToast(label + ' copied.');
    }).catch(function () {
      showToast('Unable to copy ' + label + '.');
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        if (document.execCommand('copy')) {
          resolve();
        } else {
          reject(new Error('Copy command failed.'));
        }
      } catch (error) {
        reject(error);
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  function formatDate(value) {
    var date;
    var dateOnlyMatch = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      date = new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]));
    } else {
      date = new Date(value);
    }

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

  function clearAffiliateFilters() {
    var search = utils.qs('[data-affiliate-search]');

    if (search) {
      search.value = '';
    }

    document.querySelectorAll('[data-affiliate-filter]').forEach(function (filter) {
      filter.value = '';
    });

    filterAffiliates();
    showToast('Affiliate filters cleared.');
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
      { label: 'Log Interaction', type: 'interaction' },
      { label: 'Log Follow-up', type: 'followup' },
      { label: 'Update Performance', type: 'performance' },
      { label: 'Report Issue', type: 'issue' }
    ];

    bar.className = 'quick-actions drawer-actions';
    if (!isAdminUser()) {
      var updateDetails = document.createElement('button');
      updateDetails.className = 'button button-secondary button-small';
      updateDetails.type = 'button';
      updateDetails.textContent = 'Update Details';
      updateDetails.addEventListener('click', function () {
        openRecordModal('affiliateDetails', row);
      });
      bar.appendChild(updateDetails);
    }

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
      Affiliate_Username: valueFor(row, 'Affiliate_Username'),
      Brand: valueFor(row, 'Brand'),
      Assigned_Staff: valueFor(row, 'Assigned_Staff') || getUserName(),
      Market_Channel: valueFor(row, 'Market_Channel'),
      Next_Followup_Date: valueFor(row, 'Next_Followup_Date')
    };
  }

  function createAffiliateRelatedSections(row) {
    var wrap = document.createElement('div');
    var affiliateId = valueFor(row, 'Affiliate_ID');
    var sections = [
      { title: 'Overview', rows: [row], empty: 'Profile fields are listed below.' },
      { title: 'Follow-ups', rows: relatedRows(followupState.all, affiliateId), empty: 'No follow-ups loaded for this affiliate.' },
      { title: 'Previous notes / interaction history', rows: sortRowsNewestFirst(relatedRows(getModuleRows('interactions'), affiliateId)), empty: 'No previous notes found.' },
      { title: 'Tasks', rows: relatedRows(getModuleRows('tasks'), affiliateId), empty: 'No tasks loaded for this affiliate.' },
      { title: 'Issues', rows: relatedRows(getModuleRows('issues'), affiliateId), empty: 'No issues loaded for this affiliate.' },
      { title: 'Performance', rows: relatedRows(getModuleRows('performance'), affiliateId), empty: 'No performance rows loaded for this affiliate.' }
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

  function sortRowsNewestFirst(rows) {
    return asArray(rows).slice().sort(function (a, b) {
      return dateSortValue(b) - dateSortValue(a);
    });
  }

  function dateSortValue(row) {
    var value = firstDefined(valueFor(row, 'Date_Time'), valueFor(row, 'Created_At'), valueFor(row, 'Updated_At'), valueFor(row, 'Timestamp'), valueFor(row, 'Date'), valueFor(row, 'Interaction_Date'), valueFor(row, 'Followup_Date'));
    var time = value ? new Date(value).getTime() : 0;
    return isNaN(time) ? 0 : time;
  }

  function summaryForRelatedRow(row) {
    if (valueFor(row, 'Interaction_ID')) {
      return [
        firstDefined(formatDate(valueFor(row, 'Date_Time')), formatDate(valueFor(row, 'Date')), valueFor(row, 'Interaction_ID')),
        firstDefined(valueFor(row, 'Interaction_Type'), valueFor(row, 'Type'), 'Interaction'),
        firstDefined(valueFor(row, 'Notes'), valueFor(row, 'Outcome'), valueFor(row, 'Status'))
      ].filter(Boolean).join(' - ');
    }

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

  async function ensureModuleLoaded(routeKey) {
    if (moduleState[routeKey] && !moduleState[routeKey].loaded && !moduleState[routeKey].loading) {
      await loadModule(routeKey, true);
    }
  }

  async function openFollowupAffiliateDetail(row) {
    var affiliateId = valueFor(row, 'Affiliate_ID');
    var affiliate;

    if (!affiliateState.loaded && !affiliateState.loading) {
      await loadAffiliates();
    }

    affiliate = asArray(affiliateState.all).filter(function (item) {
      return valueFor(item, 'Affiliate_ID') === affiliateId;
    })[0];

    if (!affiliate) {
      showToast('Affiliate profile is not available.');
      return;
    }

    openAffiliateDrawer(affiliate);
  }

  async function openInteractionDetail(item) {
    if (!affiliateState.loaded && !affiliateState.loading) {
      await loadAffiliates();
    }

    var row = enrichInteractionDetailRow(item);
    openReadonlyDetailPanel('Interaction details', 'Relationship touchpoint', row, [
      'Interaction_ID',
      'Affiliate_ID',
      'Affiliate_Username',
      'Affiliate_Name',
      'Brand',
      'Assigned_Staff',
      'Date_Time',
      'Date',
      'Timestamp',
      'Market_Channel',
      'Interaction_Type',
      'Status',
      'Outcome',
      'Notes',
      'Next_Followup_Date',
      'Created_By',
      'Staff',
      'Created_At'
    ]);
  }

  function enrichInteractionDetailRow(item) {
    var affiliateId = valueFor(item, 'Affiliate_ID');
    var affiliate = asArray(affiliateState.all).filter(function (row) {
      return valueFor(row, 'Affiliate_ID') === affiliateId;
    })[0] || {};

    return Object.assign({}, affiliate, item, {
      Affiliate_Username: firstDefined(valueFor(item, 'Affiliate_Username'), valueFor(affiliate, 'Affiliate_Username')),
      Affiliate_Name: firstDefined(valueFor(item, 'Affiliate_Name'), valueFor(item, 'Affiliate'), valueFor(affiliate, 'Affiliate_Name')),
      Brand: firstDefined(valueFor(item, 'Brand'), valueFor(affiliate, 'Brand')),
      Assigned_Staff: firstDefined(valueFor(item, 'Assigned_Staff'), valueFor(item, 'Staff'), valueFor(affiliate, 'Assigned_Staff')),
      Market_Channel: firstDefined(valueFor(item, 'Market_Channel'), valueFor(item, 'Channel'), valueFor(affiliate, 'Market_Channel')),
      Date_Time: firstDefined(valueFor(item, 'Date_Time'), valueFor(item, 'Date'), valueFor(item, 'Interaction_Date'), valueFor(item, 'Timestamp'))
    });
  }

  function openReadonlyDetailPanel(title, eyebrow, row, fields) {
    var panel = ensureReadonlyDetailPanel();
    var titleNode = panel.querySelector('[data-readonly-detail-title]');
    var eyebrowNode = panel.querySelector('[data-readonly-detail-eyebrow]');
    var body = panel.querySelector('[data-readonly-detail-fields]');

    if (!body) {
      return;
    }

    utils.setText(titleNode, title);
    utils.setText(eyebrowNode, eyebrow);
    body.innerHTML = '';
    fields.forEach(function (field) {
      if (row[field] !== undefined && row[field] !== null && String(row[field]).trim() !== '') {
        body.appendChild(createDrawerField(row, field, ['Interaction_ID', 'Affiliate_ID', 'Affiliate_Username', 'Affiliate_Name', 'Brand', 'Assigned_Staff'].indexOf(field) !== -1));
      }
    });

    if (!body.children.length) {
      body.appendChild(createEmptyPanel('No detail fields available.'));
    }

    panel.hidden = false;
  }

  function ensureReadonlyDetailPanel() {
    var panel = utils.qs('[data-readonly-detail-panel]');

    if (panel) {
      return panel;
    }

    panel = document.createElement('aside');
    panel.className = 'profile-drawer glass-panel';
    panel.hidden = true;
    panel.dataset.readonlyDetailPanel = 'true';
    panel.innerHTML = '<div class="drawer-header"><div><p class="eyebrow" data-readonly-detail-eyebrow>Details</p><h2 data-readonly-detail-title>Details</h2></div><button class="icon-button" type="button" data-readonly-detail-close aria-label="Close details">x</button></div><div class="drawer-grid" data-readonly-detail-fields></div>';
    panel.querySelector('[data-readonly-detail-close]').addEventListener('click', function () {
      panel.hidden = true;
    });
    document.body.appendChild(panel);
    return panel;
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
    if (dashboardState.loaded && dashboardState.data) {
      renderAffiliateStatusSummary(dashboardState.data);
    }
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
        } else if ((group === 'today' || group === 'overdue') && followupAffiliateLinkFields.indexOf(column) !== -1) {
          appendFollowupAffiliateLink(td, row, column);
        } else {
          appendFieldValue(td, row, column);
        }

        tr.appendChild(td);
      });

      body.appendChild(tr);
    });
  }

  function appendFollowupAffiliateLink(parent, row, column) {
    var value = displayValue(row, column);
    var canOpen = valueFor(row, 'Affiliate_ID');
    var canCopy = value && value !== 'N/A' && value !== '-' && value !== '\u2014';
    var wrap = document.createElement('div');
    var text = document.createElement('strong');

    wrap.className = 'copy-value';
    text.textContent = value;

    if (canOpen) {
      text.tabIndex = 0;
      text.setAttribute('role', 'button');
      text.setAttribute('aria-label', 'View affiliate details for ' + value);
      text.addEventListener('click', function (event) {
        event.stopPropagation();
        openFollowupAffiliateDetail(row);
      });
      text.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          openFollowupAffiliateDetail(row);
        }
      });
    }

    wrap.appendChild(text);

    if (column === 'Affiliate_ID' || column === 'Affiliate_Username') {
      var copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.type = 'button';
      copyButton.textContent = 'Copy';
      copyButton.disabled = !canCopy;
      copyButton.setAttribute('aria-label', 'Copy ' + friendlyFieldLabel(column));
      copyButton.addEventListener('click', function (event) {
        event.stopPropagation();
        copyTextToClipboard(value, friendlyFieldLabel(column), copyButton);
      });
      wrap.appendChild(copyButton);
    }

    parent.appendChild(wrap);
  }

  function appendFollowupActions(parent, row) {
    var actions = document.createElement('div');
    actions.className = 'table-actions';
    var isAffiliateReminder = valueFor(row, 'isAffiliateNextFollowup') === 'true' || valueFor(row, 'Source') === 'Affiliate Next Follow-up' || !valueFor(row, 'Queue_ID');
    var group = getFollowupGroup(row);

    var complete = document.createElement('button');
    complete.className = 'button button-secondary button-small';
    complete.type = 'button';
    complete.textContent = isAdminUser() ? 'Mark Complete' : 'Complete';
    complete.disabled = isCompletedFollowup(row) || isAffiliateReminder;
    complete.addEventListener('click', function () {
      markFollowupComplete(row);
    });

    var reschedule = document.createElement('button');
    reschedule.className = 'button button-secondary button-small';
    reschedule.type = 'button';
    reschedule.textContent = isAdminUser() ? 'Reschedule' : 'Update / Reschedule';
    reschedule.disabled = isAffiliateReminder;
    reschedule.addEventListener('click', function () {
      openFollowupModal('reschedule', row);
    });

    if (!isCompletedFollowup(row) && (group === 'today' || group === 'overdue')) {
      var interaction = document.createElement('button');
      interaction.className = 'button button-secondary button-small';
      interaction.type = 'button';
      interaction.textContent = 'Log Interaction';
      interaction.addEventListener('click', function () {
        openRecordModal('interaction', buildInteractionContextFromFollowup(row, group));
      });
      actions.appendChild(interaction);
    }

    if (isAffiliateReminder) {
      var log = document.createElement('button');
      log.className = 'button button-secondary button-small';
      log.type = 'button';
      log.textContent = 'Log Follow-up';
      log.addEventListener('click', function () {
        openFollowupModal('create', row);
      });
      actions.appendChild(log);
    }

    actions.appendChild(complete);
    actions.appendChild(reschedule);
    parent.appendChild(actions);
  }

  function buildInteractionContextFromFollowup(row, group) {
    var context = {
      Affiliate_ID: valueFor(row, 'Affiliate_ID'),
      Affiliate_Name: valueFor(row, 'Affiliate_Name'),
      Affiliate_Username: valueFor(row, 'Affiliate_Username'),
      Brand: valueFor(row, 'Brand'),
      Assigned_Staff: valueFor(row, 'Assigned_Staff') || getUserName(),
      Market_Channel: valueFor(row, 'Market_Channel'),
      Status: 'Contacted',
      Generated_From: valueFor(row, 'Generated_From') || 'Follow-up'
    };

    if (group === 'upcoming') {
      context.Next_Followup_Date = valueFor(row, 'Next_Followup_Date') || valueFor(row, 'Followup_Date');
    }

    return context;
  }

  function getFollowupGroup(row) {
    var bucket = valueFor(row, 'bucket').toLowerCase();

    if (['today', 'overdue', 'upcoming', 'completed'].indexOf(bucket) !== -1) {
      return bucket;
    }

    return isCompletedFollowup(row) ? 'completed' : 'today';
  }

  function isCompletedFollowup(row) {
    return valueFor(row, 'Status').toLowerCase() === 'completed';
  }

  function getDateOnly(value) {
    var match;
    var parsed;
    var date;

    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return formatLocalDateOnly(value);
    }

    value = String(value).trim();
    match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      return match[3] + '-' + String(match[1]).padStart(2, '0') + '-' + String(match[2]).padStart(2, '0');
    }

    match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      return match[1] + '-' + String(match[2]).padStart(2, '0') + '-' + String(match[3]).padStart(2, '0');
    }

    parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      return value.slice(0, 10);
    }

    date = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    return formatLocalDateOnly(date);
  }

  function formatLocalDateOnly(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
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
    var originalButtonText = button ? button.textContent : '';
    var result;

    payload.submissionId = createSubmissionId();

    if (button) {
      button.disabled = true;
      button.textContent = 'Saving...';
    }
    utils.setText(message, 'Saving follow-up...');

    if (followupState.mode === 'reschedule') {
      result = await api.rescheduleFollowup(payload);
    } else {
      result = await api.createFollowup(payload);
    }

    if (!isSuccessfulResult(result)) {
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText;
      }
      utils.setText(message, friendlyErrorMessage(result, 'Unable to save follow-up.'));
      showToast(friendlyErrorMessage(result, 'Unable to save follow-up.'));
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
    resetRecordSubmitState();
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
    if (recordState.context && recordState.context.Affiliate_ID) {
      applyAffiliateSelection(recordState.context.Affiliate_ID);
    }
    if (type === 'performance') {
      updatePerformancePeriodFields();
    }
  }

  function renderAffiliateStatusSummary(data) {
    var items = asArray(data.affiliateStatus || data.statusDistribution || data.affiliateStatusDistribution);

    if (!items.length && affiliateState.loaded) {
      items = buildDistributionFromRows(affiliateState.all, 'Status');
    }

    renderDistribution('[data-dashboard-status]', items, 'Open Affiliates to load status distribution.');
  }

  function buildDistributionFromRows(rows, key) {
    var counts = {};

    asArray(rows).forEach(function (row) {
      var label = valueFor(row, key) || 'N/A';
      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.keys(counts).sort().map(function (label) {
      return {
        label: label,
        count: counts[label],
        tone: badgeTone(key, label)
      };
    });
  }

  async function preloadRecordReferences(type) {
    var requests = [];

    if (!affiliateState.loaded && ['affiliate', 'task', 'issue', 'interaction', 'performance'].indexOf(type) !== -1) {
      requests.push(api.affiliates().then(function (result) {
        if (isSuccessfulResult(result)) {
          affiliateState.all = asArray(result.data && result.data.items);
          affiliateState.filtered = affiliateState.all.slice();
          affiliateState.loaded = true;
        }
      }));
    }

    if (isAdminUser() && moduleState.brands && !moduleState.brands.loaded && ['affiliate', 'issue', 'interaction', 'performance', 'brand'].indexOf(type) !== -1) {
      requests.push(api.brands().then(function (result) {
        if (isSuccessfulResult(result)) {
          moduleState.brands.all = normalizeModuleItems('brands', result.data || {});
          moduleState.brands.filtered = moduleState.brands.all.slice();
          moduleState.brands.loaded = true;
        }
      }));
    }

    if (isAdminUser() && moduleState.staff && !moduleState.staff.loaded && ['affiliate', 'task', 'issue', 'interaction', 'performance', 'staff'].indexOf(type) !== -1) {
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
    resetRecordSubmitState();
  }

  function resetRecordSubmitState(options) {
    var button = utils.qs('[data-record-submit]');
    var message = utils.qs('[data-record-form-message]');
    var preserveMessage = options && options.preserveMessage;

    if (button) {
      button.disabled = false;
      button.textContent = 'Save';
      delete button.dataset.submitting;
    }

    if (message && !preserveMessage) {
      utils.setText(message, '');
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
        if (shouldHideRecordField(field)) {
          return;
        }
        used.push(field);
        grid.appendChild(createRecordField(field, recordState.context[field], config));
      });
      section.appendChild(title);
      section.appendChild(grid);
      container.appendChild(section);
    });

    (config.fields || []).forEach(function (field) {
      if (used.indexOf(field) === -1 && !shouldHideRecordField(field)) {
        container.appendChild(createRecordField(field, recordState.context[field], config));
      }
    });
  }

  function shouldHideRecordField(field) {
    return recordState.type === 'issue' && !isAdminUser() && field === 'Assigned_To';
  }

  function createRecordField(field, value, config) {
    var label = document.createElement('label');
    var caption = document.createElement('span');
    var error = document.createElement('small');
    var input;
    var required = config && asArray(config.required).indexOf(field) !== -1;

    value = getRecordFieldValue(field, value);

    label.className = 'field';
    label.dataset.fieldName = field;
    caption.textContent = friendlyFieldLabel(field) + (required ? ' *' : '');
    label.appendChild(caption);

    if (field === 'Notes' || field === 'Issue' || field === 'Issue_Details' || field === 'Task') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else if (field === 'Month') {
      input = document.createElement('input');
      input.type = 'month';
    } else if (field.indexOf('Date') !== -1 || field === 'Date' || field === 'Week_Start' || field === 'Week_End') {
      input = document.createElement('input');
      input.type = 'date';
    } else if (['Registrations', 'FTD', 'Active_Players', 'Deposits', 'Deposit_Amount', 'Turnover', 'Revenue_NGR', 'NGR', 'Commission'].indexOf(field) !== -1) {
      input = document.createElement('input');
      input.type = 'number';
      if (['Revenue_NGR', 'NGR'].indexOf(field) === -1) {
        input.min = '0';
      }
      input.step = 'any';
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
    if (input.type === 'date') {
      input.value = getDateOnly(value || getDefaultRecordValue(field));
    } else if (input.type === 'month') {
      input.value = String(value || getDefaultRecordValue(field)).slice(0, 7);
    } else {
      input.value = value || getDefaultRecordValue(field);
    }
    if (field === 'Affiliate_ID') {
      input.addEventListener('change', function () {
        applyAffiliateSelection(input.value);
      });
    }
    if (field === 'Period_Type') {
      input.addEventListener('change', updatePerformancePeriodFields);
    }
    error.className = 'field-error';
    error.dataset.fieldError = field;
    label.appendChild(input);
    label.appendChild(error);
    return label;
  }

  function getRecordFieldValue(field, value) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
    if (recordState.type !== 'performance') {
      return value;
    }
    if (field === 'NGR') {
      return firstDefined(recordState.context.NGR, recordState.context.Revenue_NGR, recordState.context.Revenue);
    }
    if (field === 'Remarks') {
      return firstDefined(recordState.context.Remarks, recordState.context.Notes);
    }
    if (field === 'Period_Type') {
      return firstDefined(recordState.context.Period_Type, recordState.context.Week_Start || recordState.context.Week_End ? 'Weekly' : 'Monthly');
    }
    return value;
  }

  function updatePerformancePeriodFields() {
    var form = utils.qs('[data-record-form]');
    var period = form && form.elements.Period_Type ? form.elements.Period_Type.value : 'Monthly';
    var isWeekly = safeLower(period) === 'weekly';

    setFieldVisibility('Month', !isWeekly);
    setFieldVisibility('Week_Start', isWeekly);
    setFieldVisibility('Week_End', isWeekly);
  }

  function setFieldVisibility(field, isVisible) {
    var form = utils.qs('[data-record-form]');
    var fieldNode = form ? form.querySelector('[data-field-name="' + field + '"]') : null;
    var input = form && form.elements[field] ? form.elements[field] : null;

    if (fieldNode) {
      fieldNode.hidden = !isVisible;
    }
    if (input) {
      input.required = isVisible && recordForms.performance.required.indexOf(field) !== -1;
    }
  }

  function friendlyFieldLabel(field) {
    return fieldLabels[field] || String(field || '').replace(/_/g, ' ');
  }

  function shouldUseSelect(field) {
    return ['Affiliate_ID', 'Brand', 'Assigned_Staff', 'Assigned_To', 'Priority', 'Status', 'Health_Status', 'Active', 'Role', 'Permission_Level', 'Can_View_All', 'Affiliate_Type', 'Market_Channel', 'Interaction_Type', 'Period_Type'].indexOf(field) !== -1;
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
    if (field === 'Assigned_To') {
      dynamic = getKnownStaff();
      return dynamic.length ? dynamic : [getUserName()];
    }
    if (field === 'Affiliate_ID') {
      dynamic = getKnownAffiliates(recordState.type === 'performance');
      return dynamic.length ? dynamic : [''];
    }
    if (field === 'Priority') {
      if (recordState.type === 'affiliateDetails') {
        return ['High', 'Medium', 'Low'];
      }
      return ['Low', 'Medium', 'High', 'Critical'];
    }
    if (field === 'Period_Type') {
      return ['Monthly', 'Weekly'];
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
      return ['Open', 'Contacted', 'Interested', 'Not Responding', 'No Response', 'Needs Help', 'Completed'];
    }
    if (title.indexOf('performance') !== -1) {
      return ['Draft', 'Submitted', 'Reviewed', 'Needs Review', 'Approved'];
    }

    return ['Open', 'Active', 'Pending', 'Paused', 'Closed', 'Completed', 'Resolved', 'Rescheduled'];
  }

  function getDefaultRecordValue(field) {
    if (field === 'Assigned_Staff') {
      return getUserName();
    }
    if (field === 'Assigned_To') {
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
    if (field === 'Health_Status') {
      return 'Healthy';
    }
    if (field === 'Generated_From') {
      return 'Manual';
    }
    if (field === 'Period_Type') {
      return 'Monthly';
    }
    if (field === 'Date' || field === 'Week_Start' || field === 'Week_End') {
      return getDateOnly(new Date().toISOString());
    }
    if (field === 'Month') {
      return getDateOnly(new Date().toISOString()).slice(0, 7);
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

  function getKnownAffiliates(includeUsername) {
    return (affiliateState.all || []).filter(isActiveReference).map(function (row) {
      var affiliateId = valueFor(row, 'Affiliate_ID');
      var labelParts = [affiliateId];

      if (includeUsername) {
        labelParts.push(valueFor(row, 'Affiliate_Username'));
      }

      labelParts.push(valueFor(row, 'Affiliate_Name'), valueFor(row, 'Brand'));
      var label = labelParts.filter(Boolean).join(' - ');
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
    setFormValue(form, 'Assigned_To', valueFor(row, 'Assigned_Staff'));
    setFormValue(form, 'Market_Channel', valueFor(row, 'Market_Channel'));
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

  function normalizeRecordPayload(type, data) {
    var payload = Object.assign({}, data || {});
    var isWeekly;

    if (type === 'performance') {
      isWeekly = safeLower(payload.Period_Type) === 'weekly';
      payload.Period_Type = isWeekly ? 'Weekly' : 'Monthly';
      if (isWeekly) {
        delete payload.Month;
      } else {
        delete payload.Week_Start;
        delete payload.Week_End;
      }
    }

    return payload;
  }

  function addOriginalPerformanceLocator(payload, context) {
    var source = context || {};

    if (!payload || !source) {
      return payload;
    }

    payload.Original_Performance_ID = valueFor(source, 'Performance_ID');
    payload.Original_Period_Type = getRecordFieldValue('Period_Type', source.Period_Type);
    payload.Original_Month = valueFor(source, 'Month') || valueFor(source, 'Date');
    payload.Original_Week_Start = getDateOnly(valueFor(source, 'Week_Start')) || valueFor(source, 'Week_Start');
    payload.Original_Week_End = getDateOnly(valueFor(source, 'Week_End')) || valueFor(source, 'Week_End');
    payload.Original_Affiliate_ID = valueFor(source, 'Affiliate_ID');
    payload.Original_Brand = valueFor(source, 'Brand');

    return payload;
  }

  function isRecordEdit(config, context) {
    if (recordState.type === 'performance') {
      return !!(context && (context.Performance_ID || (context.Affiliate_ID && context.Brand && (context.Month || (context.Week_Start && context.Week_End)))));
    }
    return !!(config && config.updateApi && config.idKey && context && context[config.idKey]);
  }

  function validateRecordForm(config) {
    var form = utils.qs('[data-record-form]');
    var data = getRecordFormData();
    var missing = [];
    var email;
    var emailError;

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

    email = form.elements.Email ? String(data.Email || '').trim() : '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailError = form.querySelector('[data-field-error="Email"]');
      missing.push('Email');
      if (emailError) {
        emailError.textContent = 'Enter a valid email address or leave it blank.';
      }
      form.elements.Email.setAttribute('aria-invalid', 'true');
    }

    validateRecordSpecificFields(config, form, data, missing);

    return missing;
  }

  function validateRecordSpecificFields(config, form, data, missing) {
    var priority;
    var period;
    var weekStart;
    var weekEnd;

    if (recordState.type === 'affiliateDetails') {
      priority = String(data.Priority || '').trim();
      if (priority && ['High', 'Medium', 'Low'].indexOf(priority) === -1) {
        pushFieldError(form, missing, 'Priority', 'Priority must be High, Medium, or Low.');
      }
    }

    if (recordState.type !== 'performance') {
      return;
    }

    period = safeLower(data.Period_Type || 'Monthly');
    if (period === 'weekly') {
      if (!String(data.Week_Start || '').trim()) {
        pushFieldError(form, missing, 'Week_Start', 'Week start is required.');
      }
      if (!String(data.Week_End || '').trim()) {
        pushFieldError(form, missing, 'Week_End', 'Week end is required.');
      }
      weekStart = Date.parse(data.Week_Start || '');
      weekEnd = Date.parse(data.Week_End || '');
      if (!Number.isNaN(weekStart) && !Number.isNaN(weekEnd) && weekEnd < weekStart) {
        pushFieldError(form, missing, 'Week_End', 'Week end cannot be earlier than week start.');
      }
    } else if (!String(data.Month || '').trim()) {
      pushFieldError(form, missing, 'Month', 'Month is required.');
    }
  }

  function pushFieldError(form, missing, field, message) {
    var input = form && form.elements[field] ? form.elements[field] : null;
    var error = form ? form.querySelector('[data-field-error="' + field + '"]') : null;

    missing.push(friendlyFieldLabel(field));
    if (error) {
      error.textContent = message || friendlyFieldLabel(field) + ' is required.';
    }
    if (input) {
      input.setAttribute('aria-invalid', 'true');
    }
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

  function csvImportErrorMessage(result, fallback) {
    var message = friendlyErrorMessage(result, fallback);
    var details = result && result.error && result.error.details && result.error.details.message;
    var code = result && result.error && result.error.code;

    if (/Unable to reach the API/i.test(message)) {
      return fallback + (details ? ' Network detail: ' + details : ' The request could not reach Apps Script.');
    }

    if (code && message.indexOf(code) === -1) {
      return message + ' (' + code + ')';
    }

    return message;
  }

  function createSubmissionId() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }

    return 'submit_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function interactionSavedMessage(result) {
    var sync = result && result.data && result.data.followupSync ? result.data.followupSync : {};

    if (sync.nextFollowupDate) {
      return 'Interaction saved. Current follow-up completed and next follow-up scheduled for ' + formatDate(sync.nextFollowupDate) + '.';
    }

    return 'Interaction saved. Current follow-up completed.';
  }

  async function submitRecordForm(event) {
    var config = recordForms[recordState.type];
    var message = utils.qs('[data-record-form-message]');
    var button = utils.qs('[data-record-submit]');
    var payload = getRecordFormData();
    var isEdit;
    var result;

    event.preventDefault();
    utils.setText(message, '');

    if (!config || !api[config.api] || (isRecordEdit(config, recordState.context) && !api[config.updateApi])) {
      utils.setText(message, 'This action is not available.');
      return;
    }

    if (validateRecordForm(config).length) {
      utils.setText(message, 'Please complete the required fields before saving.');
      showToast('Please complete the required fields before saving.');
      return;
    }

    if (button && button.dataset.submitting === 'true') {
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Saving...';
      button.dataset.submitting = 'true';
    }
    utils.setText(message, 'Saving...');

    try {
      payload = normalizeRecordPayload(recordState.type, payload);
      if (config.idKey && recordState.context[config.idKey]) {
        payload[config.idKey] = recordState.context[config.idKey];
      }
      if (['interaction', 'affiliateDetails'].indexOf(recordState.type) !== -1) {
        payload.submissionId = createSubmissionId();
      }

      isEdit = isRecordEdit(config, recordState.context);
      if (recordState.type === 'performance' && isEdit) {
        payload = addOriginalPerformanceLocator(payload, recordState.context);
      }
      if (recordState.type === 'affiliate' && !isEdit) {
        result = await api.createAffiliate(payload);
      } else if (recordState.type === 'affiliateDetails') {
        result = await api.updateAffiliate(payload);
      } else if (recordState.type === 'performance') {
        updateDebugBeforeRequest(isEdit ? 'updatePerformance' : 'createPerformance', 'GET', payload);
        result = await (isEdit ? api.updatePerformance(payload) : api.createPerformance(payload));
      } else {
        result = await api[isEdit ? config.updateApi : config.api](payload);
      }

      if (!isSuccessfulResult(result)) {
        utils.setText(message, friendlyErrorMessage(result, 'Unable to save record.'));
        showToast(friendlyErrorMessage(result, 'Unable to save record.'));
        return;
      }

      closeRecordModal();
      if (recordState.type === 'affiliateDetails') {
        openAffiliateDrawer(Object.assign({}, recordState.context || {}, payload));
      }
      showToast(recordState.type === 'interaction' ? interactionSavedMessage(result) : (recordState.type === 'affiliateDetails' ? 'Affiliate details updated.' : (isEdit ? 'Update' : config.title) + ' saved.'));
      refreshAfterRecordSave(recordState.type);
    } catch (error) {
      utils.setText(message, 'Unable to save record. Please try again.');
      showToast('Unable to save record. Please try again.');
    } finally {
      resetRecordSubmitState({ preserveMessage: true });
    }
  }

  function refreshAfterRecordSave(type) {
    dashboardState.loaded = false;
    loadDashboard();

    if (type === 'affiliate' || type === 'affiliateDetails') {
      affiliateState.loaded = false;
      loadAffiliates(true);
    }

    if (type === 'followup') {
      followupState.loaded = false;
      loadFollowups(true);
    }

    if (type === 'interaction') {
      followupState.loaded = false;
      loadFollowups(true);
      affiliateState.loaded = false;
      loadAffiliates(true);
    }

    if (type === 'task' || type === 'issue' || type === 'interaction' || type === 'brand' || type === 'staff' || type === 'performance') {
      if (moduleState[type + 's']) {
        moduleState[type + 's'].loaded = false;
        loadModule(type + 's', true);
      }
      if (type === 'performance' && moduleState.performance) {
        moduleState.performance.loaded = false;
        loadModule('performance', true);
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
    document.querySelectorAll('[data-staff-email-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        window.open(
          'https://run.247cs.live/run/6a4b5de24c9b030606b281bf',
          '_blank',
          'noopener,noreferrer'
        );
      });
    });

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
    utils.setText(
      utils.qs('[data-import-message]'),
      'Download the sample or choose a CSV file. Preview validates every row before commit.' +
        (type === 'affiliate' ? ' Affiliate_ID/export columns are accepted, but this importer creates new rows and does not update existing Affiliate_ID matches.' : '')
    );
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
    var headers = asArray(config && config.required).concat(asArray(config && config.optional));
    var sample = {};

    headers.forEach(function (field) {
      sample[field] = getDefaultRecordValue(field) || friendlyFieldLabel(field);
    });

    return headers.join(',') + '\n' + headers.map(function (field) {
      return csvEscape(sample[field]);
    }).join(',');
  }

  function formatCsvHeaderGuide(config) {
    var headers = asArray(config && config.required);
    var optional = asArray(config && config.optional);
    return 'Required CSV headers, in any order: ' + headers.join(', ') + '. ' + (optional.length ? 'Optional: ' + optional.join(', ') + '. ' : '') + 'Use these names exactly; preview will show row errors before import.';
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
    result = await (importState.type === 'performance' ? api.importPerformanceCsvPreview : api.importCsvPreview)({
      entity: importState.type,
      csv: textarea.value
    });
    if (button) {
      button.disabled = false;
    }

    if (!isSuccessfulResult(result)) {
      utils.setText(message, csvImportErrorMessage(result, 'Unable to preview CSV.'));
      showToast(csvImportErrorMessage(result, 'Unable to preview CSV.'));
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
    result = await (importState.type === 'performance' ? api.importPerformanceCsvCommit : api.importCsvCommit)({
      entity: importState.type,
      csv: textarea ? textarea.value : ''
    });

    if (button) {
      button.disabled = false;
    }

    if (!isSuccessfulResult(result)) {
      utils.setText(message, csvImportErrorMessage(result, 'Unable to commit CSV.'));
      showToast(csvImportErrorMessage(result, 'Unable to commit CSV.'));
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

    var clear = utils.qs('[data-affiliate-clear-filters]');
    if (clear) {
      clear.addEventListener('click', clearAffiliateFilters);
    }

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
    bindApiDebugPanel();
    bindDebugToggle();
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
