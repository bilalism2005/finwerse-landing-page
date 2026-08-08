# Finwerse

AI-powered scores for every stock. Finwerse computes four scores — **overall, technical, safety, sentiment** — across three timeframes (**short, medium, long**) for Indian equities, and serves them through a web app, a mobile app, and a Python API.

## Monorepo layout

This is an npm/yarn/bun **workspaces** monorepo. The web and mobile apps share auth and database access through a common package.

```
finwerse/
├── apps/
│   ├── web/      # React + Vite + Tailwind SPA (main product UI)
│   ├── api/      # FastAPI + SQLAlchemy + APScheduler (Python scoring service)
│   └── mobile/   # Expo / React Native app (SDK 57)
├── packages/
│   └── shared/   # @finwerse/shared: Supabase client + AuthContext (used by web & mobile)
├── render.yaml   # Deploy config for the API on Render
└── package.json  # Root workspaces manifest
```

- **Auth & data store:** Supabase (Postgres + Auth).
- **Scoring:** the API fetches market/fundamental data and computes scores on a daily batch job; clients read the precomputed scores.

## Prerequisites

- **Node.js 18+** and **bun** (or npm — both lockfiles are present) for the JS apps.
- **Python 3.12.2** for the API (see `apps/api/.python-version`).
- A **Supabase** project (URL + anon key) for web/mobile auth.
- External market-data API keys for the API (see `apps/api/README.md`).

---

## 1. Install (root)

```bash
# bun (primary) or npm
bun install
# npm install
```

This installs dependencies for the root and all JS workspaces (`apps/web`, `apps/mobile`, `packages/shared`).

---

## 2. Web app (`apps/web`)

```bash
cd apps/web

# Create env file
cp .env.example .env        # then fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
```

`.env` (apps/web):
```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

```bash
bun run dev      # Vite dev server on http://localhost:8080
```

Other scripts:
```bash
bun run build    # production build
bun run preview  # preview the build
bun run test     # vitest (unit tests)
bun run lint     # eslint
```

Routes: public landing (`/`, `/auth`) and protected `/app/*` (Discover, StockDetail, Portfolio, AskAI, Feed, Alerts, ImpulseAnalyzer, BrokerConnect).

---

## 3. API (`apps/api`)

The API is a standalone Python service (separate dependency tree). See **`apps/api/README.md`** for the full walkthrough. Quick start:

```bash
cd apps/api
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# set DATABASE_URL + market-data keys in apps/api/.env
cp .env.example .env

python init_db.py        # create tables
python seed_and_run.py   # seed + run one batch so scores exist

uvicorn main:app --host 0.0.0.0 --port 8000
# health check: GET http://localhost:8000/  → {"status":"healthy"}
```

Endpoints: `GET /stocks/top`, `GET /stocks/search`, `GET /stocks/{symbol}/score`.

> The API only returns useful data after `BatchProcessor.run()` has populated the `StockScore` table. Locally, trigger it with `seed_and_run.py` instead of waiting for the daily 10:15 UTC cron.

---

## 4. Mobile app (`apps/mobile`)

Expo app (SDK 57) that reuses `@finwerse/shared` and Supabase.

```bash
cd apps/mobile
bun install
bun run start            # expo start
```

Then press `i` (iOS simulator), `a` (Android), or `w` (web). You'll need the corresponding Expo tooling (`expo-cli`, Xcode/Android Studio) installed.

> Mobile is the least mature app in the repo — treat it as early-stage. See `apps/mobile/AGENTS.md` before making changes (Expo SDK 57 differs from older versions).

---

## Notes

- `.env` files are git-ignored — never commit secrets.
- For production deploys, the API is configured via `render.yaml` (Render free tier).
- `apps/api/scratch/*` and the `test_*.py` / `verify_*.py` scripts at the API root are developer probes, not part of the running service.
