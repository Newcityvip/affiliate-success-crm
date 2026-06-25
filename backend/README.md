# Backend

This folder contains the Google Apps Script backend for Affiliate Success CRM.

Sprint 2A exposes a read-only API connected to the finalized Google Sheets CRM tabs. No write actions, authentication, schema changes, or secrets are included.

## Files

- `code.gs`: Apps Script web app entry points.
- `config.gs`: non-secret app constants and `SPREADSHEET_ID` placeholder.
- `router.gs`: read-only action router.
- `response.gs`: consistent JSON response envelope.
- `sheets.gs`: spreadsheet access, sheet validation, and row mapping.
- `dashboard.gs`: dashboard summary read model.
- `affiliates.gs`, `staff.gs`, `brands.gs`, `followups.gs`, `tasks.gs`, `issues.gs`, `interactions.gs`, `performance.gs`: read-only module endpoints.

## Apps Script Setup

1. Create or open the Apps Script project connected to the CRM backend deployment.
2. Copy every `.gs` file from this `backend/` folder into the Apps Script project.
3. In `config.gs`, replace:

```js
const SPREADSHEET_ID = "PASTE_SPREADSHEET_ID_HERE";
```

with the real Google Spreadsheet ID in the Apps Script editor or secure deployment workflow.

Do not commit the real spreadsheet ID, API secrets, bot tokens, passwords, or session secrets to this repository.

## Deploy As Web App

1. In Apps Script, select **Deploy**.
2. Choose **New deployment**.
3. Select **Web app**.
4. Configure access for the intended team environment.
5. Deploy and copy the Web App URL.

## Test URLs

After deployment, test these read-only endpoints:

```text
?action=health
?action=validateSheets
?action=dashboard
```

The API also supports:

```text
?action=meta
?action=affiliates
?action=staff
?action=brands
?action=followups
?action=tasks
?action=issues
?action=interactions
?action=performance
```

All responses use the standard `success`, `message`, `data`, `error`, and `meta` envelope.
