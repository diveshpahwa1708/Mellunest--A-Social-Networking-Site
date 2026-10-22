# Architecture

The React UI calls same-origin `/api` endpoints. The route adapter forwards requests to `backend/api/handler.ts`. That module validates input, authenticates hashed cookie sessions, checks ownership and executes parameterized D1 queries. Media metadata is kept in D1; binary files are kept in R2.

Frontend modules are grouped by feature rather than by file extension. Shared UI primitives are in `frontend/components/shared.tsx`. `frontend/lib/api.ts` owns HTTP and display helpers; `upload.ts` owns multipart upload progress. Routes stay in `app/` because the framework discovers them there.

The backend API remains one cohesive handler to preserve the existing authorization and transaction behavior. Future expansion can split it into authenticated services by domain, with regression tests at each boundary. Splitting every query into another file is not required to run or understand this project.

Standalone mode does not trust ChatGPT identity headers. Username/password sessions are the authentication boundary. Existing social features include posts, drafts, follows, comments, saves, notifications, expiring stories, private conversations and account deletion.

## Database changes

Edit `db/schema.ts`, then run `npm run db:generate`. Inspect the generated migration before starting again. `npm start` applies pending migrations locally. Never modify an already-applied migration. Back up local state before destructive schema changes.

## Startup sequence

1. Check the Node version.
2. Fingerprint package.json, pnpm-lock.yaml and pnpm-workspace.yaml.
3. Install with pinned pnpm through npm only if dependencies are absent or inputs changed.
4. Apply D1 migrations with the explicit `--local` flag.
5. Start the Vite/Vinext dev server on localhost:5173 and request browser opening.

Runtime data and startup stamps are ignored by Git and omitted from the ZIP. Ctrl+C stops the running development process.

## Limitations

Email-free password recovery is unavailable. Messages are not end-to-end encrypted. SSE uses database polling. Video duration is checked in the client; server-side transcoding and scanning are not implemented. Before a public launch, add monitoring, backups, moderation and independent security/browser testing. No production resources are created by the default command.
