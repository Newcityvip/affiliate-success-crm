# API

The backend is a Google Apps Script web app. It exposes read APIs for finalized Google Sheets CRM tabs and Sprint 3B write actions for `Followup_Queue` only.

## Response Format

All endpoints return the same response envelope. Sprint 4A adds `ok`, `code`, and `details` for safer frontend handling while preserving `success` compatibility:

```json
{
  "ok": true,
  "success": true,
  "message": "OK",
  "data": {},
  "error": null,
  "meta": {
    "app": "Affiliate Success CRM",
    "version": "0.1.0",
    "timestamp": "2026-06-25T00:00:00.000Z"
  }
}
```

Failed requests return `success: false`, an empty `data` object, an `error` string, a top-level `code`, and optional `details`.

Sprint 4A failed requests use:

```json
{
  "ok": false,
  "success": false,
  "message": "Unauthorized",
  "data": {},
  "error": "Unauthorized",
  "code": "UNAUTHORIZED",
  "details": {},
  "meta": {}
}
```

## Authentication Endpoints

### `?action=login`

Requires `POST`. Temporary Sprint 4A login uses `Login_ID` only:

```json
{
  "loginId": "ADMIN01"
}
```

Success returns `sessionToken`, `expiresAt`, and a sanitized `user` object. Password/PIN validation is intentionally reserved for a later security sprint.

### `?action=getSession`

Returns the current session when `sessionToken` is supplied.

### `?action=logout`

Requires `POST`. Destroys the server-side session for the supplied `sessionToken`.

## Protected API Calls

These actions require `sessionToken` as a query parameter or request body field:

```text
dashboard
affiliates
followups
getFollowups
interactions
tasks
issues
performance
leaderboard
reports
staff
brands
settings
createFollowup
updateFollowup
completeFollowup
validateSheets
```

`STAFF` users receive assigned rows only where sheet columns allow matching. `ADMIN` and `SUPER_ADMIN` receive global data.

## Foundation Endpoints

### `?action=health`

Checks whether the Apps Script web app is reachable.

Example success data:

```json
{
  "status": "ok",
  "method": "GET",
  "apiVersion": "v1"
}
```

### `?action=meta`

Returns non-sensitive application metadata and finalized sheet tab names.

### `?action=validateSheets`

Validates that every finalized sheet tab exists in the configured spreadsheet.

Example success data:

```json
{
  "valid": true,
  "missing": [],
  "required": [
    "Affiliates",
    "Staff_List",
    "Brand_List",
    "Weekly_Contacts",
    "Monthly_Performance",
    "Task_Log",
    "Issue_Log",
    "Dashboard_Config",
    "Interaction_Log",
    "KPI_Config",
    "Activity_Log",
    "Followup_Queue"
  ]
}
```

## Read-Only CRM Endpoints

### `?action=dashboard`

Returns a dashboard object. Existing summary fields remain stable, and Sprint 3D adds optional nested sections for the full dashboard workspace.

```json
{
  "totalAffiliates": 0,
  "activeAffiliates": 0,
  "healthyAffiliates": 0,
  "attentionAffiliates": 0,
  "warningAffiliates": 0,
  "criticalAffiliates": 0,
  "todayFollowups": 0,
  "overdueFollowups": 0,
  "openTasks": 0,
  "openIssues": 0,
  "totalBrands": 0,
  "activeStaff": 0,
  "completedFollowups": 0,
  "upcomingFollowups": 0,
  "activeBrands": 0,
  "staffMembers": 0,
  "recentInteractions": 0,
  "todayWorkspace": {
    "dueToday": 0,
    "overdue": 0,
    "upcomingThisWeek": 0,
    "completedToday": 0,
    "openTasks": 0,
    "openIssues": 0,
    "recentInteractions": 0,
    "warnings": []
  },
  "followupSnapshot": {
    "today": [],
    "overdue": [],
    "upcoming": [],
    "completed": []
  },
  "affiliateHealth": [],
  "priorityDistribution": [],
  "brandSummary": [],
  "staffWorkload": [],
  "recentActivity": [],
  "upcomingFollowupsList": [],
  "openIssuesList": [],
  "openTasksList": [],
  "monthlyPerformance": []
}
```

Dashboard arrays are derived from existing sheets only. Empty or missing optional columns return empty strings, zero counts, or empty arrays instead of fake CRM data.

### `?action=affiliates`

Reads rows from `Affiliates`.

### `?action=staff`

Reads rows from `Staff_List`.

Requires `ADMIN` or `SUPER_ADMIN`.

### `?action=brands`

Reads rows from `Brand_List`.

### `?action=followups`

Reads rows from `Followup_Queue`.

### `?action=getFollowups`

Reads rows from `Followup_Queue` and includes affiliate name and brand when matching affiliate data is available.

### `?action=tasks`

Reads rows from `Task_Log`.

### `?action=issues`

Reads rows from `Issue_Log`.

### `?action=interactions`

Reads rows from `Interaction_Log`.

### `?action=performance`

Reads rows from `Monthly_Performance`.

### `?action=reports`

Returns read-only report preview cards derived from existing dashboard data. No exports or generated CRM records are created.

Requires `ADMIN` or `SUPER_ADMIN`.

### `?action=leaderboard`

Returns read-only ranking groups derived from staff workload, brand summary, and affiliate priority counts.

Requires `ADMIN` or `SUPER_ADMIN`.

### `?action=settings`

Returns safe configuration and sheet-health summary data. It does not expose secrets, spreadsheet IDs, passwords, tokens, or editable settings.

`STAFF` receives profile/session settings only. Admin roles receive the broader safe system summary.

List endpoints return:

```json
{
  "count": 0,
  "items": []
}
```

Rows are mapped by the sheet header names. Empty rows are ignored.

## Follow-up Queue Write Endpoints

Follow-up write endpoints require `POST` and only write to `Followup_Queue`.

### `?action=createFollowup`

Creates a new follow-up row.

Request body:

```json
{
  "Affiliate_ID": "AFF0001",
  "Assigned_Staff": "Robiul",
  "Followup_Date": "2026-06-30",
  "Priority": "High",
  "Status": "Open",
  "Generated_From": "Manual"
}
```

### `?action=updateFollowup`

Updates an existing follow-up row by `Queue_ID`.

Request body:

```json
{
  "Queue_ID": "FU_123",
  "Affiliate_ID": "AFF0001",
  "Assigned_Staff": "Robiul",
  "Followup_Date": "2026-07-01",
  "Priority": "Medium",
  "Status": "Open",
  "Generated_From": "Manual"
}
```

### `?action=completeFollowup`

Marks a follow-up as completed.

Request body:

```json
{
  "Queue_ID": "FU_123"
}
```

Completion sets `Status` to `Completed`. Dashboard follow-up counts update after the frontend refreshes data.

## Errors

- `UNKNOWN_ACTION`: the requested action is not supported.
- `METHOD_NOT_ALLOWED`: the request method is not valid for the endpoint.
- `MISSING_SPREADSHEET_ID`: the spreadsheet ID placeholder has not been replaced in Apps Script.
- `MISSING_SHEET`: one of the finalized Google Sheet tabs is missing.
- `REQUEST_FAILED`: another read error occurred.

The spreadsheet ID must be configured in Apps Script by replacing the placeholder `PASTE_SPREADSHEET_ID_HERE` before deployment.
