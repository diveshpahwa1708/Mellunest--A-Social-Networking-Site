# Mellunest

A standalone full-stack social web app, organized for VS Code development.

## Run with one command

Install **Node.js 24** first (minimum supported by this project: 22.13). Extract this folder, open **mellunest** in VS Code, and run:

```sh
npm start
```

The command installs the pinned dependencies automatically, applies pending **local** SQL migrations, and starts the app at **http://localhost:5173**. It requests that your default browser open the page. If it does not, open the URL manually. Internet is needed for the first installation. You do not need a global pnpm install, a Cloudflare login, MySQL, XAMPP, or a separate backend terminal.

Keep the terminal open. Stop with Ctrl+C. Use the same command on subsequent runs; unchanged dependencies are reused. Local accounts and uploads persist in `.wrangler/state`. Do not delete that folder unless you intend to reset local data.

On Windows, if PowerShell blocks `npm.ps1`, use the VS Code **Command Prompt** terminal and run the same command. Port 5173 must be free.

## Source layout

| Directory | Responsibility |
| --- | --- |
| `app/` | Framework page/layout and HTTP route entrypoints |
| `frontend/features/` | Social app, account forms, posts, composer and profile editor |
| `frontend/components/` | Reusable visual components |
| `frontend/lib/` | API client, media helpers and upload transport |
| `frontend/styles.css` | Global responsive styling and themes |
| `backend/api/` | Server validation, authorization and API operations |
| `backend/runtime/` | Cloudflare Worker entrypoint |
| `db/` | Drizzle database schema and connection helper |
| `drizzle/` | Immutable SQL migration history and metadata |
| `public/` | Logos, favicon and public assets |
| `scripts/` | Cross-platform one-command launcher |
| `tests/` | Isolated API tests against the built Worker |
| `docs/` | Architecture, maintenance and verification notes |
| `.vscode/` | Workspace settings and recommended extension |

## Accounts

Create an account with display name, username and password. Email is not required. Passwords require at least 8 characters including a letter and a number; special characters are optional. Email-free accounts do not support email password recovery. ChatGPT sign-in is not included in this standalone edition.

## Other commands

Run these after the initial `npm start` has installed dependencies:

```sh
npm run typecheck
npm run build
npm test
```

Use `npm run preview` to run a previously built app locally. Do not run it at the same time as `npm start` because both use port 5173. `npm start` is the normal development command with live updates.

## Data and configuration

D1 and R2 are simulated locally by the Cloudflare development tools. The starter database ID is a local placeholder. The launcher never applies remote migrations or publishes a website. Production data and secrets are not included.

`.dev.vars.example` documents the optional cleanup secret. Copy it to `.dev.vars` and replace the placeholder only if you want to call the cleanup endpoint yourself. Ordinary signup, posting and local use do not require it. Physical story/upload cleanup needs a separate scheduler; story access expires after 24 hours regardless.

Read `docs/ARCHITECTURE.md` and `docs/VERIFICATION.md` before deploying publicly. This is an organized project implementation, not a claim of production certification.
