# AI Agent Rules

**These rules apply to every Claude Code session in this repo.**

Read this file completely before doing anything else. Adapted from `smallTechOrg/zero-shot-claude-boilerplate`'s `harness/rules/ai-agents.md` — the universal rules are kept, the `uv run`/Alembic/single-service assumptions are replaced with finwerse's real 3-surface stack (`apps/web` bun/npm, `apps/api` pip/venv, `apps/mobile` bun/npm+Expo).

---

## ⚠ Non-Negotiable Rules

These rules are never optional, never skipped, and must survive context compression.

1. **README must always be accurate.** Every command in `README.md` (root) and `apps/api/README.md` must work exactly as written, from the directory stated. Before ending any session or marking any work complete: run the README commands yourself if you touched anything they document — if any fail, fix the README first.

2. **Never claim a test passed if you didn't run it.** "It should work" is not a passing test. Run the actual test command for the surface you touched (see `## Test Commands` below). Show the output. If you can't run it, say so — do not fabricate results.

3. **Commands use the right package-manager prefix per surface.** `apps/web` and `apps/mobile`: `bun run <script>` (npm/yarn lockfiles also present — match whichever the user is actually using if unclear, but default to `bun` per the root README). `apps/api`: activate the venv or prefix with the venv's Python (`apps/api/.venv/Scripts/python` on Windows, `apps/api/.venv/bin/python` on Unix) — there is no `uv`, no `pyproject.toml` in `apps/api`; it's plain `pip install -r requirements.txt` into a `venv`.

4. **Working directory must be explicit.** Any doc section with shell commands must state the exact working directory (`apps/web`, `apps/api`, or `apps/mobile`) at the top of the code block — finwerse is a monorepo, "run from project root" is ambiguous.

5. **No SQLite substitute for Postgres.** finwerse's production DB is Supabase Postgres (with `pgvector`). Tests and local dev must run against Postgres — never SQLite as a stand-in, since `pgvector`/`UUID` column types and Postgres-specific SQL (e.g. `analyzer.py`'s raw `EXTRACT(EPOCH FROM ...)` query) don't behave identically on SQLite.

6. **Golden-path smoke coverage before calling a change done.** If the change touches an HTTP surface, exercise the primary path end-to-end (not just unit-test the function in isolation) and confirm the actual response content, not just a status code.

7. **Real-key testing is the default for anything hitting Groq, twitterapi.io, or the market-data providers.** There is no offline-passing requirement for these paths — a stub is acceptable only for CI runs that genuinely lack keys, guarded with a skip, never presented as a passing gate.

8. **Every commit must be pushed immediately, to `staging`, never `main`.** See `harness/rules/git.md` — this is the most load-bearing rule in this repo given the standing branch policy.

9. **Never introduce a live/synchronous scoring computation at request time.** Per `spec/roadmap.md`'s Key Constraints — all scoring happens in the daily batch (`services/batch_processor.py`, `services/scoring.py`), never inline in a router. If a feature seems to need a live score, that's a sign the batch job's output is missing a field, not a reason to compute it live.

10. **Never hardcode a secret or a secret fallback in source.** See the live finding already documented in `harness/rules/secret-hygiene.md` — do not repeat that pattern elsewhere.

---

## Test Commands

| Surface | Command | Working dir |
|---|---|---|
| `apps/web` | `bun run test` (vitest) | `apps/web` |
| `apps/mobile` | **No test script exists** (`apps/mobile/package.json` scripts: `start`, `android`, `ios`, `web` only, confirmed 2026-08-23). Verification here means manual smoke-testing via `expo start`, not an automated test run. | `apps/mobile` |
| `apps/api` | no test runner confirmed as wired up during this migration — `apps/api/test_*.py` / `verify_*.py` files exist at the root but per the main `README.md`'s own note, these are "developer probes, not part of the running service." **Before claiming a passing test for `apps/api`, confirm what (if anything) is the real test command — do not assume `pytest` just runs cleanly.** | `apps/api` |

## Session Start Checklist

- [ ] Read `spec/roadmap.md` — know what's built, what's a known gap, what's next
- [ ] If working on a specific capability, read its file in `spec/capabilities/`, plus `spec/api.md`/`spec/data.md`/`spec/agent.md`/`spec/ui.md` as relevant
- [ ] Run `git status` — working tree must be clean before starting, and you must be on (or branching cleanly from) `staging`, never `main`
- [ ] Confirm which surface(s) you're touching (`apps/web`, `apps/api`, `apps/mobile`) and use that surface's package manager / working directory per the table above

## Spec-First Rule

**No code change without a spec backing it.** If asked to implement something not in `spec/`, stop, tell the user what's missing, propose adding it to the relevant `spec/capabilities/*.md` (or a new file) first, and wait for confirmation before writing code. See `harness/patterns/spec-driven.md`.

## Test Before Claiming Done

A change is not done until its surface's real test path (or a manual smoke run, if no test runner is confirmed) has actually been executed and shown passing output. "It looks right" is not verification.

## Error Resilience

Every external call (API, database, LLM) must have:
- Error handling that doesn't crash the request/batch job
- Logged failures
- Graceful degradation matching the existing pattern in this codebase — e.g. `tool_comprehensive_stock_analysis`'s per-tool try/except, or the batch job's per-stock `data_status` degradation, rather than failing the whole operation

## No Gold-Plating

Build what the spec says, nothing more. No extra features "while you're in there," no refactoring outside the current task's scope, no premature abstractions.

## When Stuck

If requirements are unclear or the spec is ambiguous: stop, state the specific question or ambiguity, propose an interpretation if you have one, and wait for confirmation rather than guessing.

## Closing a Session

Before ending a session:
- [ ] Working tree is clean, committed and pushed to `staging`
- [ ] Whatever surface(s) you touched have been smoke-tested per the table above
- [ ] `spec/` updated if you changed behavior that a capability file, `api.md`, `data.md`, or `agent.md` describes
