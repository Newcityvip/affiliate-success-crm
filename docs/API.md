# API

The backend is a Google Apps Script web app scaffold. Sprint 0 supports only foundation endpoints and returns a consistent JSON shape.

## Response Format

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

## `?action=health`

Checks whether the Apps Script web app is reachable.

Example success data:

```json
{
  "status": "ok",
  "method": "GET",
  "apiVersion": "v1"
}
```

## `?action=meta`

Returns non-sensitive application metadata and the finalized sheet tab names.

Example success data:

```json
{
  "app": "Affiliate Success CRM",
  "version": "0.1.0",
  "apiVersion": "v1",
  "sheetNames": [
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

Unknown actions return `success: false` with the error code `UNKNOWN_ACTION`.
