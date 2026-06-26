# Development Guide

## Branch Strategy

- `main` should remain stable and deployable.
- Use short-lived feature branches for sprint work.
- Open pull requests for review before merging when collaboration begins.

## Commit Style

Use clear, conventional commit messages:

- `chore:` repository setup, tooling, and structure
- `docs:` documentation updates
- `feat:` user-visible features
- `fix:` bug fixes
- `refactor:` behavior-preserving code improvements

## Working With Apps Script Files

- Keep backend files in `backend/`.
- Do not commit spreadsheet IDs, session secrets, bot tokens, passwords, or API keys.
- Keep Apps Script functions modular by purpose: routing, responses, auth, sheets, and utilities.
- Avoid destructive sheet operations unless a future sprint explicitly defines and reviews them.
- Keep the finalized Google Sheet tabs unchanged unless a formal schema update is requested.

## Frontend Development

- The frontend is static HTML, CSS, and JavaScript.
- Keep backend calls isolated in `frontend/js/api.js`.
- Keep authentication behavior isolated in `frontend/js/auth.js`.
- Do not add external CSS frameworks unless a future sprint explicitly approves them.
- Sprint 1 navigation is client-side only and must not call the backend.
- Demo UI numbers are allowed only when clearly marked as demo interface data.
- Placeholder pages should communicate upcoming functionality without inventing CRM records.
- Keep page behavior in `frontend/js/app.js` and route metadata in `frontend/js/router.js`.
- Sprint 3A adds the live read-only Affiliates page; do not add create, edit, delete, or sheet write behavior there until a write sprint is explicitly scoped.
- Sprint 3C keeps the CRM command center, toast messages, summary badges, and placeholder previews in vanilla frontend code. Keep `docs/` synced from `frontend/` before every GitHub Pages push.

## Sprint 1 UI Shell

- The app shell includes a responsive sidebar, sticky topbar, page title area, user profile placeholder, notification placeholder, and mobile menu controls.
- The sidebar sections are Dashboard, Affiliates, Follow-ups, Interactions, Tasks, Issues, Performance, Leaderboard, Reports, Staff, Brands, and Settings.
- Authentication, Google Sheets reads/writes, API URLs, and CRM business logic remain out of scope.

## Sprint 3A Affiliates Page

- Affiliates data loads from the Apps Script `?action=affiliates` endpoint.
- Keep the required display columns aligned to the finalized Google Sheet headers.
- Search should cover name, username, brand, country, and assigned staff.
- Filters should remain read-only client-side controls for Brand, Assigned_Staff, Health_Status, Status, Priority, and Active.
- The profile drawer is read-only and should show existing fields from the API response.

## GitHub Pages Deployment Later

1. Confirm the frontend works locally from the `frontend/` folder.
2. Add the deployed Apps Script web app URL to `frontend/js/config.js`.
3. In GitHub, open repository settings and enable Pages.
4. Select the `main` branch and `/docs` folder as the Pages source.
5. Verify `index.html` and `login.html` load without exposing sensitive data.
