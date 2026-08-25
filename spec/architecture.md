# Architecture

## System Overview

Finwerse is an AI-powered trading-intelligence platform for retail Indian equity cash-market traders (never F&O/derivatives/options). It is a **read-only intelligence layer** — it never places orders and never gives direct buy/sell/avoid/invest recommendations, with one explicit exception (Portfolio Health's Bottleneck Report). A daily batch job computes four scores (Overall, Technical, Safety, Sentiment) across three holding-period timeframes (Short 7-30 days, Medium 1-4 months, Long 4-12 months) for ~1800 NSE-listed stocks; a web app, a mobile app, and the FastAPI backend they both call serve those precomputed scores plus portfolio tracking, alerts, an AI chatbot, and trade-behavior analysis. Nothing in the request-serving path does live computation — all heavy work happens in the daily cron.

## Component Map

```
apps/web (React+Vite SPA)  ──┐
                              ├──►  apps/api (FastAPI)  ──►  Supabase Postgres (+ pgvector)
apps/mobile (Expo/RN)      ──┘            │
                                            ├──►  Angel One / IndianAPI / EODHD (market data, batch job)
                                            ├──►  NSE/BSE filings scrape (batch job)
                                            ├──►  Groq (chatbot + bottleneck report)
                                            └──►  twitterapi.io (chatbot tool)

packages/shared  ──► used by both apps/web and apps/mobile (Supabase client + AuthContext)

Supabase Auth  ──► used by apps/web, apps/mobile, and apps/api (JWT verification) directly — not proxied through apps/api
```

## Layers

| Layer | Responsibility |
|---|---|
| `apps/web`, `apps/mobile` | UI, Supabase Auth session, calls `apps/api` for all scoring/portfolio/chatbot data |
| `apps/api` routers (`routers/*.py`) | HTTP surface — request validation, auth, response shaping |
| `apps/api` services (`services/*.py`) | Business logic: batch scoring, alerts evaluation, chatbot tools, data fetching |
| Supabase Postgres | System of record for scores, candles, fundamentals, news, filings, portfolios, alerts (schema in `spec/data.md`) |
| Supabase Auth | User identity — issues the JWT that `apps/api/auth.py` verifies; finwerse does not run its own auth |

## Data Flow

1. **Trigger:** Render cron `finwerse-batch-cron`, `15 10 * * 1-5` UTC (3:45 PM IST, weekdays) → `python -m scripts.run_daily_batch`.
2. `services/data_fetcher.py` (Angel One / IndianAPI / EODHD clients) pulls fresh prices, fundamentals, and news for the tracked universe.
3. `services/nse_scraper.py` scrapes NSE/BSE filings, chunks and embeds them (`sentence-transformers/all-MiniLM-L6-v2`, 384-dim), stores in `corporate_filings` (pgvector).
4. `services/scoring.py` (`BatchProcessor` in `batch_processor.py`) computes Technical/Safety/Sentiment/Overall scores per stock per timeframe from the fetched data, writes `StockScore` (current) and `StockHistoricalScore` (dated, append-only — required by the Impulse Analyzer and any future chatbot backtest tool).
5. `services/alerts_processor.py` runs immediately after scoring completes, evaluates all active `Alert` rows against the freshly written scores, marks matches `triggered`, sends Expo push notifications to registered `UserDevice` tokens.
6. **Output:** `apps/web`/`apps/mobile` read precomputed scores/portfolio/alerts via `apps/api` REST endpoints (`spec/api.md`); the Ask AI Chatbot (`spec/agent.md`) additionally calls Groq + twitterapi.io live, at request time, since its output is synthesized per-query rather than precomputed.

## External Dependencies

| Dependency | Purpose | Failure Mode |
|---|---|---|
| Supabase Postgres | System of record, all app tables + pgvector | API raises `ValueError` at startup if `DATABASE_URL` unset; a runtime DB outage surfaces as 500s |
| Supabase Auth | JWT issuance for web/mobile/API | Falls back to unverified-claims decode if `SUPABASE_JWT_SECRET` is unset/invalid — see `spec/api.md` Authentication note |
| Angel One API | Broker-sourced market data (batch only) | Batch job degrades per-stock (`data_status = RATE_LIMITED/FAILED`), does not block the whole run |
| IndianAPI, EODHD | Fundamentals, prices, news (batch only) | Same per-stock degradation pattern |
| Groq | Chatbot (Node 1 routing + Node 2 synthesis) + Bottleneck Report | 3-model failover chain per call site; final failure streams a plain-English "busy" message (chatbot) or `500` (bottleneck report) |
| twitterapi.io | Chatbot's Twitter/social tool | Returns `{"error": ...}` fed to Node 2 as data, not a request failure |
| Expo Push | Alert delivery to mobile | Synchronous POST to `exp.host/--/api/v2/push/send` from the batch job; a non-200 or exception is logged (`logger.error`) and swallowed — the alert is still marked `triggered` in the DB even if the push notification itself failed to send |

## Stack

- **Language:** Python 3.12.2 (`apps/api`, pinned in `render.yaml` and `apps/api/.python-version`); TypeScript (`apps/web`, `apps/mobile`, `packages/shared`)
- **Agent framework:** none — the chatbot's routing+tool-use+synthesis flow (`spec/agent.md`) is hand-written, not LangGraph/CrewAI
- **LLM provider + model:** Groq (`openai/gpt-oss-120b`/`20b`, `qwen/qwen3.6-27b` failover) for chatbot + bottleneck report
- **Backend:** FastAPI + SQLAlchemy (Core/ORM, no Alembic — `Base.metadata.create_all()` at startup) + APScheduler-adjacent Render cron (not in-process APScheduler despite `PRODUCT_CONTEXT.md`'s original tech-stack line — batch runs as its own Render cron service, see `render.yaml`)
- **Database + ORM:** Supabase Postgres (+ `pgvector`) + SQLAlchemy 2.0-style `Mapped`/`mapped_column` models mixed with legacy `Column()` style in `apps/api/models.py`
- **Frontend (web):** React + Vite + Tailwind, `bun` as primary package manager (npm lockfile also present)
- **Frontend (mobile):** Expo SDK 57 / React Native, Zustand for state, `expo-router`
- **Dependency management:** `bun`/`npm`/`yarn` (root workspaces, all three lockfiles present) for JS; `pip` + `requirements.txt` + `venv` for `apps/api` (no `uv`, no `pyproject.toml` in `apps/api`)
- **Deployment:** Render — 2 web services (`finwerse-api`, `finwerse-api-staging`) + 2 cron services (`finwerse-batch-cron` + `-staging`), split by branch (`main` / `staging`)

| Key library | Purpose |
|---|---|
| FastAPI | HTTP framework |
| SQLAlchemy | ORM |
| `groq` | LLM client (chatbot, bottleneck report) |
| `httpx` | Async HTTP (Twitter tool, external data fetchers) |
| `pyjwt` | Supabase JWT verification |
| `pgvector` | Postgres vector column type for filings RAG |
| React + Vite (web), Expo + React Native (mobile) | UI |
| Zustand | Mobile state |
| Supabase JS client (`packages/shared`) | Auth + DB client shared by web & mobile |

**Avoid:** live/synchronous computation of scores at request time — the whole architecture assumes precomputed reads; a request-time scoring path would break the "no live computation" platform rule (`PRODUCT_CONTEXT.md` → Standing Platform Rules #5, preserved in `spec/roadmap.md`).

## Deployment Model

Long-running services on Render (free tier for the API, starter for cron). `staging` branch auto-deploys to `finwerse-api-staging` / `finwerse-batch-cron-staging`; `main` deploys to the production pair. Per this repo's git workflow rule, all work happens on `staging` and reaches `main` only via a reviewed PR — see `harness/rules/git.md`.

**Mobile (`apps/mobile`):** built via EAS Build (Android/iOS), distributed to testers as internal-distribution builds against the `preview` update channel (`eas.json`'s `preview` build profile). App binaries are OTA-update-capable — `app.json`'s `expo.updates.url` + `runtimeVersion.policy: "appVersion"` are already configured, `expo-updates` is installed — but until 2026-08-25 nothing ever triggered a publish: no `update` block in `eas.json`, no `.eas/workflows/`, zero EAS Workflow runs recorded. Pushing to git `staging` was a no-op on the Expo side.

**As of 2026-08-25:** `apps/mobile/.eas/workflows/publish-staging-update.yml` publishes an OTA update to the **`preview`** channel automatically on every push to `staging` that touches `apps/mobile/**`. Deliberately targets `preview`, not a new `staging` channel — the real installed test builds were all built against `preview` (confirmed via EAS build history, 10/10 recent builds), so a new channel would reach zero devices until someone built and installed a fresh binary against it. This is a build-time channel assignment, not something a later OTA update can change — if a `staging`-channel test track is ever wanted, it requires a new build profile plus fresh installs, not just a workflow change.

**Known gap, not yet closed:** an EAS Workflow's `push` trigger requires the Expo project to have a linked GitHub repository (Project Settings → GitHub, on the EAS dashboard) — this is a one-time manual connection with no CLI/API/MCP equivalent available to set it up programmatically. Whether that connection already exists for this project was not confirmed as part of this change. The workflow file is valid and ready (confirmed via `eas workflow:validate`); the first real push to `staging` touching `apps/mobile/**` is the actual test of whether it fires.

**Fixed 2026-08-25 — critical OTA gotcha:** `eas.json`'s `build.<profile>.env` block (which sets `APP_ENV`/`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` for native builds) has **no effect on `eas update` publishes** — those pull environment variables from a completely separate store: the EAS dashboard's per-environment "Environment Variables" (`eas env:create`/`eas env:list --environment <name>`). That store was empty for both `preview` and `production` until this date, so every OTA update ever published exported its JS bundle with `process.env.EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` inlined as `undefined` (Metro inlines `process.env.EXPO_PUBLIC_*` at export time, not read at runtime). `_layout.tsx` calls `initSupabase(process.env.EXPO_PUBLIC_SUPABASE_URL!, ...)` with a non-null assertion, so the OTA-fetched bundle crashed immediately on startup, before the root component rendered — which is exactly the condition under which `expo-updates`' built-in error-recovery silently rolls back to the last-working (often the build's own embedded) bundle. This produced a very convincing false signal that OTA delivery itself was broken (`checkForUpdateAsync()` reporting "no update available" indefinitely, even with genuinely newer, compatible updates sitting on the branch) when the real fault was a missing dashboard config, invisible from `app.json`/`eas.json`/the CLI publish success output alone (the only tell is a one-line CLI warning: `"No environment variables with visibility ... found for the '<env>' environment on EAS"`, easy to miss). Fixed by running `eas env:create` for `APP_ENV`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` against both the `preview` and `production` EAS Update environments, mirroring `eas.json`'s existing build-profile values. Any future `EXPO_PUBLIC_*` variable added to `eas.json`'s build env must be mirrored into the matching EAS Update environment via `eas env:create`, or the same silent-rollback failure mode recurs.

**Also relevant — two separate installed apps:** `apps/mobile/app.config.js` branches on `APP_ENV=production` to produce two distinct apps: package `com.finwerse.mobile` / name "Finwerse" (production), vs. package `com.finwerse.mobile.staging` / name "Finwerse (Staging)" (every other profile, including `preview`). All mobile redesign work and OTA publishes target only the `preview` channel, which only "Finwerse (Staging)" is built against — opening the plain "Finwerse" app icon shows an entirely different, unrelated install with no relationship to `staging` branch work.
