# Project Structure

```text
/
+-- frontend/
|   +-- index.html
|   +-- login.html
|   +-- css/
|   +-- js/
|   +-- components/
|   +-- assets/
+-- backend/
+-- docs/
+-- scripts/
+-- config/
+-- README.md
```

## `frontend/`

Contains the static user interface prepared for GitHub Pages. Sprint 0 includes a dashboard shell, a disabled login scaffold, responsive dark theme CSS, and modular JavaScript placeholders.

## `backend/`

Contains Google Apps Script files. Requests enter through `doGet(e)` and `doPost(e)`, then route through `handleRequest(e, method)`.

## `docs/`

Contains durable project documentation for the database contract, API foundation, structure, and development process.

## `scripts/`

Reserved for future local helper scripts. No build tooling is required in Sprint 0.

## `config/`

Reserved for future non-secret configuration examples. Real credentials, spreadsheet IDs, bot tokens, passwords, and API secrets must not be committed.
