# API

The backend is a Google Apps Script web app. Sprint 2A exposes a read-only API for the finalized Google Sheets CRM tabs. No write actions are implemented.

## Response Format

All endpoints return the same response envelope:

```json
{
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

Failed requests return `success: false`, an empty `data` object, and an `error` object with a code and details.

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

Returns a summary object:

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
  "activeStaff": 0
}
```

### `?action=affiliates`

Reads rows from `Affiliates`.

### `?action=staff`

Reads rows from `Staff_List`.

### `?action=brands`

Reads rows from `Brand_List`.

### `?action=followups`

Reads rows from `Followup_Queue`.

### `?action=tasks`

Reads rows from `Task_Log`.

### `?action=issues`

Reads rows from `Issue_Log`.

### `?action=interactions`

Reads rows from `Interaction_Log`.

### `?action=performance`

Reads rows from `Monthly_Performance`.

List endpoints return:

```json
{
  "count": 0,
  "items": []
}
```

Rows are mapped by the sheet header names. Empty rows are ignored.

## Errors

- `UNKNOWN_ACTION`: the requested action is not supported.
- `METHOD_NOT_ALLOWED`: a non-GET method was used for a read-only endpoint.
- `MISSING_SPREADSHEET_ID`: the spreadsheet ID placeholder has not been replaced in Apps Script.
- `MISSING_SHEET`: one of the finalized Google Sheet tabs is missing.
- `REQUEST_FAILED`: another read error occurred.

The spreadsheet ID must be configured in Apps Script by replacing the placeholder `PASTE_SPREADSHEET_ID_HERE` before deployment.
