# Backend

This folder contains the Google Apps Script backend for Affiliate Success CRM.

The backend exposes APIs connected to the finalized Google Sheets CRM tabs. Sprint 3B adds write actions for `Followup_Queue` only. Sprint 4A adds temporary Login_ID auth, server-side sessions, role-based filtering, and safe role restrictions. Passwords, private tokens, spreadsheet IDs, and secrets are not included.

## Files

- `code.gs`: Apps Script web app entry points.
- `config.gs`: non-secret app constants and `SPREADSHEET_ID` placeholder.
- `router.gs`: read-only action router.
- `response.gs`: consistent JSON response envelope.
- `auth.gs`: temporary Login_ID auth, server-side sessions, role helpers, Staff_List matching, and future IP allowlist placeholders.
- `sheets.gs`: spreadsheet access, sheet validation, and row mapping.
- `dashboard.gs`: complete dashboard read model for KPI overview, follow-up queue, health, priority, brand, staff, activity, issues, tasks, and performance widgets.
- `affiliates.gs`, `staff.gs`, `brands.gs`, `tasks.gs`, `issues.gs`, `interactions.gs`, `performance.gs`: read-only module endpoints.
- `workspace.gs`: read-only report preview, leaderboard, and safe settings summary endpoints.
- `followups.gs`: read and write actions for `Followup_Queue`.

## Apps Script Setup

1. Create or open the Apps Script project connected to the CRM backend deployment.
2. Copy every `.gs` file from this `backend/` folder into the Apps Script project.
3. In `config.gs`, replace:

```js
const SPREADSHEET_ID = "PASTE_SPREADSHEET_ID_HERE";
```

with the real Google Spreadsheet ID in the Apps Script editor or secure deployment workflow.

Do not commit the real spreadsheet ID, API secrets, bot tokens, passwords, or session secrets to this repository.

## Sprint 4A Auth Setup

Temporary login uses `Staff_List` if available. Recommended columns are:

```text
Staff_ID
Login_ID
Name
Staff_Name
Role
Team
Status
Active
Email
Allowed_IPs
Permission_Level
```

Supported roles are `SUPER_ADMIN`, `ADMIN`, and `STAFF`. If `Role` is missing, `ADMIN01` falls back to `SUPER_ADMIN`; all other users default to `STAFF`. If `Staff_List` is missing or empty, `ADMIN01` can sign in as a temporary development `SUPER_ADMIN`.

Sessions are generated server-side and stored in Apps Script CacheService/PropertiesService with an 8-hour application expiry. Session tokens are never stored in Google Sheets.

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

The dashboard response keeps the original summary fields and adds optional Sprint 3D sections:

```text
todayWorkspace
followupSnapshot
affiliateHealth
priorityDistribution
brandSummary
staffWorkload
recentActivity
openIssuesList
openTasksList
monthlyPerformance
```

These sections read from finalized tabs only and return empty arrays or zero counts when source rows or optional columns are unavailable.

The API also supports:

```text
?action=meta
?action=login
?action=getSession
?action=logout
?action=affiliates
?action=staff
?action=brands
?action=followups
?action=tasks
?action=issues
?action=interactions
?action=performance
?action=reports
?action=leaderboard
?action=settings
?action=getFollowups
?action=createFollowup
?action=updateFollowup
?action=completeFollowup
```

All protected endpoints require `sessionToken` after Sprint 4A. All responses use the standard `ok`, `success`, `message`, `data`, `error`, `code`, `details`, and `meta` envelope.

Follow-up write actions require `POST` and only use these finalized `Followup_Queue` headers:

```text
Queue_ID
Affiliate_ID
Assigned_Staff
Followup_Date
Priority
Status
Generated_From
```

## Future IP Allowlist Plan

Sprint 4A prepares `Allowed_IPs` as a Staff_List column and includes a `getClientIp(e)` helper, but it does not enforce IP blocking. Apps Script often cannot reliably see the true client IP behind browser/API layers. For production IP enforcement, place a Cloudflare Worker or equivalent session/IP gate in front of the Apps Script API.
