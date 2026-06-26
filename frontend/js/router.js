(function (window) {
  'use strict';

  var routes = {
    dashboard: {
      title: 'Dashboard',
      kicker: 'Command center',
      heading: 'Daily CRM workspace',
      description: 'Live dashboard context, queues, and daily operating signals in one compact view.'
    },
    affiliates: {
      title: 'Affiliates',
      kicker: 'Affiliate workspace',
      heading: 'Read-only affiliate directory',
      description: 'Search, filter, and inspect live affiliate profiles without changing sheet data.'
    },
    followups: {
      title: 'Follow-ups',
      kicker: 'Queue planning',
      heading: 'Follow-up command queue',
      description: 'Today, overdue, upcoming, and completed follow-ups organized from the live queue.'
    },
    interactions: {
      title: 'Interactions',
      kicker: 'Relationship history',
      heading: 'Interaction log placeholder',
      description: 'Contact notes and timeline views will appear once the CRM data layer is connected.'
    },
    tasks: {
      title: 'Tasks',
      kicker: 'Team execution',
      heading: 'Task board placeholder',
      description: 'Task assignment and completion workflows are planned for a future sprint.'
    },
    issues: {
      title: 'Issues',
      kicker: 'Resolution tracking',
      heading: 'Issue management placeholder',
      description: 'Open issues, escalation status, and outcomes will be added after the foundation is connected.'
    },
    performance: {
      title: 'Performance',
      kicker: 'Monthly view',
      heading: 'Performance analytics placeholder',
      description: 'Monthly growth and partner performance views will connect to the finalized sheet tabs later.'
    },
    leaderboard: {
      title: 'Leaderboard',
      kicker: 'Ranking view',
      heading: 'Leaderboard placeholder',
      description: 'Affiliate and team rankings will be designed after KPI rules are implemented.'
    },
    reports: {
      title: 'Reports',
      kicker: 'Management output',
      heading: 'Reports placeholder',
      description: 'Exportable summaries and management reports are reserved for later CRM workflows.'
    },
    staff: {
      title: 'Staff',
      kicker: 'Team directory',
      heading: 'Staff workspace placeholder',
      description: 'Staff roles, ownership, and permissions will be handled after authentication is implemented.'
    },
    brands: {
      title: 'Brands',
      kicker: 'Brand reference',
      heading: 'Brand workspace placeholder',
      description: 'Brand reference views will use the finalized Brand_List tab once read-only access is connected.'
    },
    settings: {
      title: 'Settings',
      kicker: 'Workspace setup',
      heading: 'Settings placeholder',
      description: 'Configuration controls will be introduced only after secure backend settings are defined.'
    }
  };

  function normalizeRoute(route) {
    return routes[route] ? route : 'dashboard';
  }

  function routeFromHash() {
    return normalizeRoute((window.location.hash || '#dashboard').replace('#', ''));
  }

  function getRoute(route) {
    var key = normalizeRoute(route);
    return {
      key: key,
      meta: routes[key]
    };
  }

  window.AffiliateSuccessRouter = Object.freeze({
    getRoute: getRoute,
    routeFromHash: routeFromHash,
    routes: routes
  });
})(window);
