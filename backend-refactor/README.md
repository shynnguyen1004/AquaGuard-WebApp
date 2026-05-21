# backend-refactor

Layered re-architecture of [`../backend`](../backend) (controllers → services → models). Same API contract (`/api/*` paths, request/response shapes), same DB schema, same env vars. Runs in parallel — the legacy `backend/` still works and is still the production target on Render until explicitly switched.

## Quick start (local, no docker)

```bash
cd backend-refactor
cp ../backend/.env .env       # or create from .env.example
npm install
npm run dev                   # node --watch server.js
```

Default port `5001` (matches legacy backend, so frontend `VITE_API_BASE_URL=http://localhost:5001/api` works unchanged).

## Quick start (docker)

```bash
# From repo root
cd infrastructure
make r-dev                    # dev stack: postgres + backend + frontend
make r-down                   # stop
```

See `infrastructure/Makefile` (`r-*` targets) for the full list. Don't run alongside the legacy `make dev` stack — both bind ports 5001/5173/5433.

## Layout

```
server.js                     # http + ws bootstrap
src/
├── app/
│   ├── app.js                # Express factory (no listen)
│   └── v1/
│       ├── routes/           # router + middleware mounting
│       ├── controllers/      # req/res handling, asyncHandler-wrapped
│       ├── services/         # business logic, transactions, throws HttpError
│       └── models/           # raw SQL via pg pool
├── configs/                  # env, db, cloudinary, twilio
├── constants/                # roles, errorCodes
├── cors/                     # cors options factory
├── helpers/                  # apiResponse, jwt, buildRescueGroupPayload, …
├── inits/                    # websocket attach, rateLimiters
├── middleware/               # auth, requireRoles, rateLimit, asyncHandler, errorHandler
├── templates/                # sms / email (reserved)
└── utils/                    # validators, upload, logger
```

## Production deploy

To switch Render from `backend/` to `backend-refactor/`:

| Field | Value |
|---|---|
| Root Directory | `backend-refactor` |
| Build Command | `npm ci` |
| Start Command | `node server.js` |

Env vars are identical to the legacy backend (`DATABASE_URL`, `JWT_SECRET`, `ROLE_PASSWORD`, `TWILIO_*`, `CLOUDINARY_URL`, `FRONTEND_URL`). Render injects `PORT` automatically.

## Known issues preserved from legacy

The refactor migrates structure only — it does not fix logic bugs. Items from `CLAUDE.md §6` (JWT_SECRET fallback, ROLE_PASSWORD weak compare, IDOR on `/sos/:id/complete`, phone regex divergence, etc) are kept as-is with `TODO[security/#N]` or `TODO[CLAUDE.md #N]` comments where they live.
