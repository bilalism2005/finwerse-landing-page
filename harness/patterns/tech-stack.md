# Tech-Stack Rules

Rules that hold for finwerse's actual stack. Rewritten from `smallTechOrg/zero-shot-claude-boilerplate`'s `harness/patterns/tech-stack.md` — that file's rules (port 8001, Next.js static-export-at-`/app`, Tailwind v4 `@source` directive) describe the boilerplate's own single-service skeleton and don't apply here; finwerse's web app is a separately-deployed Vite SPA, not mounted by the API. finwerse's chosen stack lives in `spec/architecture.md`'s `## Stack` section — this file is the permanent doctrine, not edited per feature.

---

## LLM Model Name Rule

**Always use a current, verified model name — never a deprecated or guessed one.**

- Model names change. Before hardcoding any model identifier, verify it exists against the provider's current docs.
- `chatbot.py`'s existing failover-list pattern (`NODE_1_MODEL`/`NODE_2_CANDIDATES` — try model A, fall back to B, then C) is the right shape to extend if a Groq model gets deprecated — update the list, don't hardcode a single name with no fallback.
- A `404`/model-not-found error from Groq almost always means the model name is wrong — check the name first before debugging anything else.

## DB Driver Rule

The Postgres driver (`psycopg2` or equivalent) must be declared in `apps/api/requirements.txt`'s main dependency list, never a dev-only extra — `apps/api` has no dev/prod dependency split today, so this is currently satisfied by default; keep it that way if a split is ever introduced.

## Test Environment Rule

**Tests must use the same database as production: Supabase Postgres with `pgvector`.** No SQLite substitute (see `harness/rules/ai-agents.md` rule 5) — several finwerse queries (raw `pgvector` similarity search, the UUID column type, `analyzer.py`'s raw Postgres `EXTRACT(EPOCH FROM ...)` SQL) don't have SQLite equivalents, so a SQLite-backed test would silently skip real bugs rather than catch them.

- A dedicated test database (not the dev or production DB) is required once a real test suite exists for `apps/api` — not currently the case, see `harness/rules/ai-agents.md`'s Test Commands table.
- Table creation is currently via `Base.metadata.create_all()` at API startup (`main.py` lifespan), not a migration tool — there is no Alembic in this repo. If a real migration tool is ever introduced for `apps/api`, this rule should be revisited to require it in the test setup path too.

## Frontend Rules (`apps/web`)

- Vite dev server runs on port 8080 (`README.md`) — do not default to a different port without updating the README and any CORS allowlist that might eventually replace `main.py`'s current `allow_origins=["*"]`.
- Tailwind config and build tooling: verify against `apps/web/package.json`/`vite.config.ts` before assuming a specific Tailwind version's quirks apply — not confirmed during this harness port.

## Mobile Rules (`apps/mobile`)

- Expo SDK 57 — per `README.md` and `apps/mobile/AGENTS.md`, this SDK differs meaningfully from older Expo versions; read `apps/mobile/AGENTS.md` before making mobile changes.
- Mobile is explicitly the least mature app in the repo (`README.md`) — do not assume mobile parity with web features without verifying the mobile screen actually implements the same behavior.

## API Rules (`apps/api`)

- Deployed via Render (`render.yaml`) — `uvicorn main:app --host 0.0.0.0 --port $PORT`, not a fixed port; local dev typically runs on 8000 per `README.md`.
- CORS is currently `allow_origins=["*"]` in `main.py`, explicitly flagged in a code comment as needing restriction in production — a known, called-out gap, not silently accepted.
- No Alembic — schema changes happen via `apps/api/models.py` edits, applied by `Base.metadata.create_all()` at startup (additive only; it does not handle column drops/renames/type changes). A destructive schema change needs a manual migration step that isn't currently automated — flag this explicitly to the user before making one.
- **Render cron job env var rule:** `finwerse-batch-cron` / `finwerse-batch-cron-staging` (the daily batch, `cron_job` service type) run their *scheduled* trigger against whatever environment was baked into the service's last deploy — not whatever currently sits in the Render dashboard. A "Trigger Run" (manual one-off) reads the live current config directly and will succeed even when the scheduled run is failing on a stale/missing var, which is a confusing but real split, not a fluke. Confirmed 2026-08-26: `DATABASE_URL` was present in the dashboard and every manual trigger worked, but the scheduled run failed daily for a week because no deploy had happened since before the var was added. **After changing any env var on either cron service, always follow up with an explicit deploy** (the Render dashboard's Manual Deploy button, or the `mcp__render__trigger_deploy` tool) — don't assume save-and-forget reaches the schedule.

## LLM / Real-Provider Test Rule

Tests exercising the chatbot, bottleneck report, or Twitter tool run against the real Groq / twitterapi.io APIs with real keys, matching the existing pattern in this codebase (no offline stub currently exists for these paths) — see `harness/rules/ai-agents.md` rule 7.
