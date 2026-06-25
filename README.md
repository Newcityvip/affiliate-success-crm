# Affiliate Success CRM

Affiliate Success CRM is a professional operating system for affiliate success teams. The project will connect a lightweight GitHub Pages frontend with a Google Apps Script backend and a finalized Google Sheets database so teams can manage affiliate relationships, weekly contacts, performance tracking, issues, follow-ups, and KPI visibility from one focused workspace.

This repository currently contains the Sprint 0 foundation and Sprint 1 frontend UI shell. It intentionally does not include CRM business features, production credentials, or destructive sheet operations.

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
+-- docs/              Project, API, database, and development documentation
+-- scripts/           Future local helper scripts
+-- config/            Future non-secret configuration examples
+-- README.md
```

## Sprint Roadmap

- Sprint 0A: Repository structure, documentation, and non-secret configuration placeholders.
- Sprint 0B: Premium frontend shell and Apps Script foundation routes.
- Sprint 1: Polished SaaS-style UI shell, responsive navigation, placeholder CRM sections, and demo-labeled dashboard cards.
- Sprint 2: Authentication wiring, session handling, and staff access flow.
- Sprint 3: Read-only CRM views connected to the finalized Google Sheet tabs.
- Sprint 4: Controlled CRM actions, task/follow-up workflows, KPI dashboard, reporting views, and deployment hardening.

## Sprint 1 Notes

- The frontend app shell supports sidebar navigation without page reloads.
- Dashboard metric cards use clearly labeled demo UI data only.
- Placeholder sections exist for Dashboard, Affiliates, Follow-ups, Interactions, Tasks, Issues, Performance, Leaderboard, Reports, Staff, Brands, and Settings.
- No authentication, Google Sheets integration, backend changes, or CRM business logic are included in Sprint 1.

## Deployment Plan

1. Deploy the Apps Script backend as a web app.
2. Store the deployed Apps Script URL in `frontend/js/config.js` as `API_BASE_URL`.
3. Enable GitHub Pages for this repository and set the published source to the frontend deployment strategy selected later.
4. Keep all sensitive values, spreadsheet IDs, bot tokens, and passwords outside the repository.

GitHub Pages is prepared but not deployed manually in Sprint 0.

## Current Backend Endpoints

- `?action=health`
- `?action=meta`

See [docs/API.md](docs/API.md) for the response shape and foundation endpoint details.
