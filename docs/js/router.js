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
      heading: 'Interaction activity log',
      description: 'Review live relationship touchpoints and contact notes from the CRM activity history.'
    },
    tasks: {
      title: 'Tasks',
      kicker: 'Team execution',
      heading: 'Task execution workspace',
      description: 'Track live task records in read-only mode while create and completion workflows remain planned.'
    },
    issues: {
      title: 'Issues',
      kicker: 'Resolution tracking',
      heading: 'Issue resolution workspace',
      description: 'Monitor live issue records, ownership, priority, and status without changing source data.'
    },
    performance: {
      title: 'Performance',
      kicker: 'Monthly view',
      heading: 'Monthly performance view',
      description: 'Scan live monthly performance rows and spot affiliate, brand, and growth signals.'
    },
    leaderboard: {
      title: 'Leaderboard',
      kicker: 'Ranking view',
      heading: 'CRM leaderboard preview',
      description: 'Rank staff, brand, and affiliate priority signals from current read-only CRM data.'
    },
    reports: {
      title: 'Reports',
      kicker: 'Management output',
      heading: 'Management report center',
      description: 'Preview operational report groups and live counts before export workflows are added.'
    },
    staff: {
      title: 'Staff',
      kicker: 'Team directory',
      heading: 'Staff directory workspace',
      description: 'Review live staff reference data while permissions and authentication remain out of scope.'
    },
    brands: {
      title: 'Brands',
      kicker: 'Brand reference',
      heading: 'Brand reference workspace',
      description: 'Search and review live brand reference rows from the finalized Brand_List tab.'
    },
    settings: {
      title: 'Settings',
      kicker: 'Workspace setup',
      heading: 'Workspace settings summary',
      description: 'Inspect safe configuration checks only; sensitive settings stay outside the frontend.'
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
