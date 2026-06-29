# Backend

This folder contains the Google Apps Script backend for Affiliate Success CRM.

The backend exposes APIs connected to the finalized Google Sheets CRM tabs. Sprint 3B adds write actions for `Followup_Queue` only. Sprint 4A adds temporary Login_ID auth, server-side sessions, role-based filtering, and safe role restrictions. Passwords, private tokens, spreadsheet IDs, and secrets are not included.

## Files

- `code.gs`: Apps Script web app entry points.
- `config.gs`: non-secret app constants and `SPREADSHEET_ID` placeholder.
- `router.gs`: read-only action router.
- `response.gs`: consistent JSON response envelope.
- `auth.gs`: temporary Login_ID auth, server-side sessions, role helpers, Staff_List matching, and future IP allowlist placeholders.
- `sheets.gs`: safe/required spreadsheet access, normalized sheet lookup, sheet validation, and row mapping.
- `dashboard.gs`: complete dashboard read model for KPI overview, follow-up queue, health, priority, brand, staff, activity, issues, tasks, and performance widgets.
- `affiliates.gs`, `staff.gs`, `brands.gs`, `tasks.gs`, `issues.gs`, `interactions.gs`, `performance.gs`: read-only module endpoints.
- `workspace.gs`: read-only report preview, leaderboard, and safe settings summary endpoints.
- `followups.gs`: read and write actions for `Followup_Queue`.
- `crud.gs`: Sprint 4B/4C header-aware create/update foundations for admin and staff-scoped workspace writes.

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

Supported roles are `SUPER_ADMIN`, `ADMIN`, and `STAFF`. If `Role` is missing, `ADMIN01` falls back to `SUPER_ADMIN`; all other users default to `STAFF`. If `Staff_List` is missing or empty, `ADMIN01` can sign in as a temporary development `SUPER_ADMIN`. Other staff logins require a readable `Staff_List` row with a matching `Login_ID`.

The auth reader checks exact `Staff_List` first and then a normalized sheet-name match. `Role` is preferred over `Permission_Level`; permission is only a fallback.

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
?action=debugSheets
?action=authDebug&loginId=STAFF01
```

`debugSheets` and `authDebug` return non-sensitive diagnostics only. Use them after copying backend files into Apps Script to confirm that the deployed script can open the spreadsheet, find `Staff_List`, and normalize `STAFF01` as `STAFF`.

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
?action=authDebug
?action=debugSheets
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
?action=createAffiliate
?action=updateAffiliate
?action=createTask
?action=updateTask
?action=completeTask
?action=createIssue
?action=updateIssue
?action=resolveIssue
?action=closeIssue
?action=createInteraction
?action=createBrand
?action=updateBrand
?action=createStaff
?action=updateStaff
?action=importCsvPreview
?action=importCsvCommit
```

All protected endpoints require `sessionToken` after Sprint 4A. All responses use the standard `ok`, `success`, `message`, `data`, `error`, `code`, `details`, and `meta` envelope.

Write actions accept POST JSON and also accept a GET query parameter named `payload` containing JSON for the current GitHub Pages + Apps Script web app path.

Follow-up write actions only use these finalized `Followup_Queue` headers:

```text
Queue_ID
Affiliate_ID
Assigned_Staff
Followup_Date
Priority
Status
Generated_From
```

## Sprint 4B/4C Write Permissions

- `SUPER_ADMIN` and `ADMIN` can create/update global records.
- `STAFF` can create interactions, tasks, issues, and follow-ups only when the record is assigned to their workspace or linked to an assigned affiliate.
- `STAFF` cannot create staff, brands, or global affiliates.
- Delete actions are intentionally not implemented.
- Writes are header-aware: fields without matching sheet headers are skipped, and no schema changes are made.
- Generated IDs use existing ID columns when present: `AFF0002`, `TSK0002`, `ISS0002`, `INT0002`, `BRD0002`, `Q0002`, and `ST003`.
- `Activity_Log` is appended after successful writes when its headers exist. Missing activity logging headers never block the primary write.
- CSV import uses `importCsvPreview` before `importCsvCommit`; preview never writes to Google Sheets.

## Future IP Allowlist Plan

Sprint 4A prepares `Allowed_IPs` as a Staff_List column and includes a `getClientIp(e)` helper, but it does not enforce IP blocking. Apps Script often cannot reliably see the true client IP behind browser/API layers. For production IP enforcement, place a Cloudflare Worker or equivalent session/IP gate in front of the Apps Script API.
