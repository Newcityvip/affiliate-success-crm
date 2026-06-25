/**
 * Non-secret application configuration.
 * Replace placeholder values only in secure deployment settings.
 */

const APP_NAME = 'Affiliate Success CRM';
const APP_VERSION = '0.1.0';
const API_VERSION = 'v1';

const SHEET_NAMES = Object.freeze({
  AFFILIATES: 'Affiliates',
  STAFF_LIST: 'Staff_List',
  BRAND_LIST: 'Brand_List',
  WEEKLY_CONTACTS: 'Weekly_Contacts',
  MONTHLY_PERFORMANCE: 'Monthly_Performance',
  TASK_LOG: 'Task_Log',
  ISSUE_LOG: 'Issue_Log',
  DASHBOARD_CONFIG: 'Dashboard_Config',
  INTERACTION_LOG: 'Interaction_Log',
  KPI_CONFIG: 'KPI_Config',
  ACTIVITY_LOG: 'Activity_Log',
  FOLLOWUP_QUEUE: 'Followup_Queue'
});

const SPREADSHEET_ID = 'PASTE_SPREADSHEET_ID_IN_SECURE_DEPLOYMENT_CONFIG';

const SESSION_CONFIG = Object.freeze({
  cookieName: 'affiliate_success_session',
  ttlMinutes: 480,
  secretPlaceholder: 'SET_SESSION_SECRET_OUTSIDE_SOURCE_CONTROL'
});
