# Affiliate Success CRM

Affiliate Success CRM is a professional operating system for affiliate success teams. The project will connect a lightweight GitHub Pages frontend with a Google Apps Script backend and a finalized Google Sheets database so teams can manage affiliate relationships, weekly contacts, performance tracking, issues, follow-ups, and KPI visibility from one focused workspace.

This repository currently contains the Sprint 0 foundation, Sprint 1 frontend UI shell, Sprint 2 live dashboard connection, Sprint 3A live read-only Affiliates page, Sprint 3B Follow-up Queue module, Sprint 3C CRM polish pass, Sprint 3D complete dashboard workspace, Sprint 3E full CRM workspace page completion, and Sprint 4A secure auth foundation. It intentionally does not include production credentials, passwords, private tokens, spreadsheet IDs, or destructive sheet operations beyond the scoped Followup_Queue actions.

## Tech Stack

- Frontend: HTML, CSS, and vanilla JavaScript prepared for GitHub Pages.
- Backend: Google Apps Script web app scaffold.
- Database: Google Sheets using the finalized tab schema.
- Hosting plan: GitHub Pages for the frontend and Apps Script web app deployment for API requests.

## Folder Structure

```text
/
+-- frontend/          Static GitHub Pages-ready frontend shell
+-- backend/           Google Apps Script backend scaffold
+-- docs/              GitHub Pages publish folder plus project documentation
+-- scripts/           Future local helper scripts
+-- config/            Future non-secret configuration examples
+-- README.md
```

## Sprint Roadmap

- Sprint 0A: Repository structure, documentation, and non-secret configuration placeholders.
- Sprint 0B: Premium frontend shell and Apps Script foundation routes.
- Sprint 1: Polished SaaS-style UI shell, responsive navigation, placeholder CRM sections, and demo-labeled dashboard cards.
- Sprint 2: Authentication wiring, session handling, and staff access flow.
- Sprint 3: CRM views connected to finalized Google Sheet tabs, including Affiliates and Follow-up Queue workflows.
- Sprint 4: Controlled CRM actions, task/follow-up workflows, KPI dashboard, reporting views, and deployment hardening.

## Sprint 1 Notes

- The frontend app shell supports sidebar navigation without page reloads.
- Dashboard metric cards use clearly labeled demo UI data only.
- Placeholder sections exist for Dashboard, Affiliates, Follow-ups, Interactions, Tasks, Issues, Performance, Leaderboard, Reports, Staff, Brands, and Settings.
- No authentication, Google Sheets integration, backend changes, or CRM business logic are included in Sprint 1.

## Sprint 3A Notes

- The Affiliates menu item loads live read-only data from the Apps Script `?action=affiliates` endpoint.
- The page includes search, filters, affiliate count, loading/error/empty states, and a read-only profile drawer.
- Create, edit, delete, and write actions remain out of scope.

## Sprint 3B Notes

- The Follow-ups menu item loads live queue data from the Apps Script `?action=getFollowups` endpoint.
- Follow-up queue write actions are limited to create, update/reschedule, and complete.
- The only writable sheet for this sprint is `Followup_Queue`.
- Authentication is still out of scope.

## Sprint 3C Notes

- The large page intro area is now a compact CRM command center with greeting, module context, live summary pills, and safe quick actions.
- Dashboard, Affiliates, and Follow-ups keep their existing data logic while gaining tighter spacing, stronger table polish, queue summary cards, and sidebar count badges where live data is available.
- Placeholder modules now use professional preview cards and non-destructive toast messages instead of empty-looking panels.
- GitHub Pages continues to publish from `docs/`, which is synced from the modular `frontend/` source.

## Sprint 3D Notes

- The Dashboard is now a real daily CRM operating workspace with KPI cards, today's workspace, follow-up snapshot, affiliate health, priority distribution, brand summary, staff workload, recent activity, open issues, open tasks, and monthly performance widgets.
- The `?action=dashboard` API keeps all existing fields and adds optional nested dashboard sections with empty-safe fallbacks.
- Backend reads remain modular and non-destructive. No Google Sheet headers or schema were changed.

## Sprint 3E Notes

- The app header is now a compact CRM command area with greeting, module context, API status, profile placeholder, notifications placeholder, and safe quick actions.
- Interactions, Tasks, Issues, Performance, Leaderboard, Reports, Staff, Brands, and Settings now render professional live workspace pages instead of empty placeholders.
- New backend read-only endpoints support the completed workspace pages: `reports`, `leaderboard`, and `settings`. Existing read-only module endpoints remain unchanged.
- Unsupported create workflows outside Follow-ups use safe toast messages and do not write to Google Sheets.
- GitHub Pages still publishes from `docs/`, synced from the modular `frontend/` source.

## Sprint 4A Notes

- Adds temporary Login_ID-based staff authentication backed by `Staff_List` where available.
- Sessions are generated server-side, stored in Apps Script Cache/Properties, and expire after 8 hours.
- Roles are normalized to `SUPER_ADMIN`, `ADMIN`, and `STAFF`.
- `ADMIN01` can sign in as `SUPER_ADMIN` only when `Staff_List` is unavailable or empty, so development is not blocked.
- Admin users keep the global workspace. Staff users see a limited “My Workspace” UI and staff-scoped API data.
- Protected API actions require `sessionToken`; public actions are limited to `health`, `meta`, `login`, `getSession`, and `logout`.
- IP allowlisting is prepared only as a future architecture note. It is not enforced in Sprint 4A.

## Deployment Plan

1. Deploy the Apps Script backend as a web app.
2. Store the deployed Apps Script URL in `frontend/js/config.js` as `API_BASE_URL`.
3. Copy the current static frontend into `docs/` for GitHub Pages publishing.
4. In GitHub, open repository settings and enable Pages.
5. Set the Pages source to `main` branch and `/docs` folder.
6. Keep `frontend/` as the modular source for UI work and keep `docs/` as the deployable Pages copy.
7. Keep all sensitive values, spreadsheet IDs, bot tokens, and passwords outside the repository.

Recommended production security path for later:

```text
GitHub Pages or custom domain
-> Cloudflare Worker/IP allowlist/session gate
-> Apps Script API
-> Google Sheets
```

GitHub Pages should serve `docs/index.html`. The copied frontend uses relative paths such as `css/base.css` and `js/app.js`, so assets resolve correctly from the `/docs` publish root.

## Current Backend Endpoints

- `?action=health`
- `?action=meta`
- `?action=login`
- `?action=getSession`
- `?action=logout`
- `?action=dashboard`
- `?action=affiliates`
- `?action=getFollowups`
- `?action=tasks`
- `?action=issues`
- `?action=interactions`
- `?action=performance`
- `?action=staff`
- `?action=brands`
- `?action=reports`
- `?action=leaderboard`
- `?action=settings`

See [docs/API.md](docs/API.md) for the response shape and foundation endpoint details.
