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

## GitHub Pages Deployment Later

1. Confirm the frontend works locally from the `frontend/` folder.
2. Add the deployed Apps Script web app URL to `frontend/js/config.js`.
3. In GitHub, open repository settings and enable Pages.
4. Select the branch and frontend publishing strategy chosen for the project.
5. Verify `index.html` and `login.html` load without exposing sensitive data.
