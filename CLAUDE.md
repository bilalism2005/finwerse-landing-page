# Claude Code — Entry Point

Finwerse is a spec-driven product. Read this file first, then follow the instructions below.

## What This Repo Is

An AI-powered trading-intelligence platform for retail Indian equity cash-market traders — web (`apps/web`), API (`apps/api`), and mobile (`apps/mobile`), sharing auth/DB access via `packages/shared` + Supabase. The product is already built and running in production; `spec/` is its single source of truth, migrated 2026-08-23 from `PRODUCT_CONTEXT.md` + `prds/*.md` (kept in the repo as historical design narrative, no longer authoritative) using the structure demonstrated by `smallTechOrg/zero-shot-claude-boilerplate`, adapted for finwerse's real 3-surface stack.

## Your First Action Every Session

1. Read `harness/rules/ai-agents.md` — mandatory rules for all sessions in this repo.
2. Read `harness/rules/git.md` — this repo's git workflow is a **standing, non-negotiable rule**: all commits/pushes go to `staging`, never `main`; shipping to `main` happens only via a PR that **Sai Krishna (Small Tech)** reviews and merges — never you.
3. Run `git status` — confirm you're on (or branching cleanly from) `staging`, not `main`, and the tree is clean before starting.

## Spec Manifest (read what's relevant to your task)

```
spec/roadmap.md          ← what's built, known gaps, next increments — read this first
spec/architecture.md     ← system design, data flow, ## Stack
spec/capabilities/       ← one file per capability — read the one(s) you're touching
spec/data.md             ← the 10-table schema
spec/api.md              ← the REST surface
spec/ui.md               ← web + mobile screens
spec/agent.md            ← the Ask AI Chatbot's tool-calling design (finwerse's only agentic surface)

harness/rules/ai-agents.md          ← session rules, per-surface test commands
harness/rules/git.md                ← staging-only workflow (see above)
harness/rules/secret-hygiene.md     ← secrets discipline (has a live finding — read it)
harness/patterns/spec-driven.md     ← spec-first discipline
harness/patterns/tech-stack.md      ← finwerse's real stack rules (no Alembic, Postgres-only testing, per-surface deploy notes)
harness/patterns/code.md            ← naming, structure, framework notes per surface
harness/patterns/engineering-practices.md
harness/patterns/test-driven.md
harness/patterns/ui-ux.md
harness/patterns/agentic-ai.md      ← pattern catalogue, with finwerse's actual usage noted inline
```

## Standing Platform Rules (from `spec/roadmap.md` — repeated here because they're easy to violate by accident)

1. Never use buy/sell/avoid/invest as a direct recommendation anywhere — except Portfolio Health's Bottleneck Report, a deliberate single exception.
2. All scores -100 to +100, same color bands everywhere (Red <40, Amber 41-65, Green 66-100).
3. Three fixed holding-period buckets everywhere: Short (7-30 days), Medium (1-4 months), Long (4-12 months).
4. Raw data (scores, indicator states, filing text, tweets, articles) is backend reasoning material only — user-facing output is the plain-language conclusion, not the numbers, unless explicitly asked.
5. **No live computation at request time, anywhere.** All heavy computation happens on the daily batch (Render cron, 3:45 PM IST / 10:15 UTC weekdays). If a feature seems to need a live score, the batch job's output is missing a field — that's the fix, not an inline computation.

## Known Gaps (tracked deliberately — don't silently "fix" these without surfacing the decision first)

See `spec/roadmap.md` → Build Status for the full list, including: the Ask AI Chatbot's missing historical/backtest tool, the unauthenticated `/analyzer/custom-impulse` endpoint, and a hardcoded secret fallback in `apps/api/services/tools.py:354` that should be rotated and removed (`harness/rules/secret-hygiene.md`).

## Skills (entry points)

| Skill / command | Purpose |
|---|---|
| `/zero-shot-build [idea]` | New capability, or a substantial change to an existing one — intake → `spec-writer` → build across whichever surface(s) it touches. |
| `/zero-shot-fix [target]` | Diagnose + fix a bug, error, failing test, or spec/code drift, then verify. |
| `/zero-shot-sync [scope]` | Reconcile `spec/` ↔ code so they match (spec wins, except where spec itself is wrong — surfaced, never silently rewritten). |

All three are manual (`disable-model-invocation: true`) and work both as a skill and as the matching `/slash-command`.

## Sub-agents (the team)

| Agent | Role |
|---|---|
| `spec-writer` | Single design authority — writes/updates `spec/` for a capability, self-reviews. |
| `code-generator` | Implements ONE surface (`apps/web` \| `apps/api` \| `apps/mobile`) per invocation, plus its tests. Spawned once per touched surface for a multi-surface change. |
| `qa-auditor` | Independent, read-only: reviews + runs tests/smoke for a change (Mode A), and audits whole-tree spec↔code drift (Mode B). Classifies SPEC-vs-CODE root cause and routes fixes by surface in `/zero-shot-fix` and `/zero-shot-sync`. |
| `agent-builder` | Orchestrator for a change spanning multiple surfaces or needing staged delivery — fans out `code-generator` per surface in parallel, gates each with `qa-auditor`, owns git/PR. Skip for a single-surface, well-scoped change — call `spec-writer`/`code-generator`/`qa-auditor` directly instead. |

Pattern: `spec-writer` designs → `agent-builder` (or you, directly, for small changes) fans out `code-generator` per surface → `qa-auditor` gates each independently and audits drift. Nobody but the orchestrating skill/agent (or you) touches git — always to `staging`, always with an immediate push, never to `main`.

## For a task that doesn't fit any of the above

Not every change needs this machinery. A small, well-scoped, single-surface fix can just be done directly — read the relevant `spec/` file(s) and `harness/rules/ai-agents.md` first, make the change, run the real test/smoke command for that surface, commit and push to `staging`. Reach for `/zero-shot-fix`/`/zero-shot-build`/`agent-builder` when the task is big enough, ambiguous enough, or multi-surface enough that the structure earns its overhead.
