# Code Style

Generic code conventions that apply across all three finwerse surfaces, plus surface-specific notes. Adapted from `smallTechOrg/zero-shot-claude-boilerplate` — the universal top section is kept as-is; the framework-gotcha section below is rewritten for finwerse's actual stack (FastAPI without the boilerplate's Starlette-version-specific `TemplateResponse` concern, since finwerse's API is pure JSON, not server-rendered templates).

---

## Universal Rules

1. **Types at boundaries** — every function that crosses a module boundary uses typed inputs and outputs (Pydantic on `apps/api`, TypeScript interfaces on `apps/web`/`apps/mobile`) — never raw dicts or `any`
2. **One responsibility per file** — a file does one thing; if it's doing two things, split it
3. **No comments explaining WHAT** — code should be self-documenting via names; only comment WHY something non-obvious is done
4. **No dead code** — remove unused imports, functions, and variables immediately; don't comment them out
5. **Fail loudly at startup** — validate all required config/env vars at startup (e.g. `database.py`'s `DATABASE_URL` check); don't fail silently at runtime
6. **No hardcoding** — values that could change (URLs, limits, credentials) go in config or environment variables. See `harness/rules/secret-hygiene.md`'s live counter-example (`tools.py`'s hardcoded Twitter key fallback) for what NOT to do.

## Naming Conventions

- Python (`apps/api`): `snake_case` for functions/variables, `PascalCase` for SQLAlchemy models and Pydantic schemas — matches the existing codebase (`StockScore`, `PortfolioHoldingCreate`, `resolve_symbol`)
- TypeScript (`apps/web`, `apps/mobile`): `camelCase` for functions/variables, `PascalCase` for components — matches existing screens (`StockDetail.tsx`, `AskAI.tsx`)

## File Organization

`apps/api` is organized by layer-then-domain: `routers/<domain>.py` (HTTP), `services/<domain>.py` (business logic), `models.py` (all entities in one file — not split per-domain currently), `auth.py`/`database.py` (cross-cutting). Follow this pattern for new domains rather than introducing a different organization scheme.

`apps/web` is organized by type: `pages/` (one file per route), `components/` (shared UI, `components/ui/` for primitives), `contexts/`, `hooks/`, `lib/`. `apps/mobile` mixes file-based routing (`app/`) with `components/`, `store/` (Zustand), `api/`.

## Error Handling Pattern

`apps/api`: raise `HTTPException` with a `status_code` and a `detail` message for request-level errors (see existing routers for the pattern — `404` "not found", `400` "invalid input"); catch and degrade for external-call failures rather than propagating (the chatbot tools' per-tool try/except is the reference pattern — a failed pillar returns a placeholder, not a crashed request).

## Logging Pattern

Python `logging` module, `logger = logging.getLogger(__name__)` per module — matches the existing pattern in `chatbot.py`, `main.py`, `alerts_processor.py`. No structured/JSON logging currently wired up — a real gap flagged in `harness/patterns/engineering-practices.md`'s Observability section, not something to silently work around by inventing a different logging approach in new code; raise it if it becomes a blocker.

## Testing Conventions

Not yet established for `apps/api` — see `harness/rules/ai-agents.md`'s Test Commands table; the `test_*.py` files at the `apps/api` root are developer probes per the main README, not a real suite. `apps/web` uses `vitest` (`apps/web/src/test/`). Establishing a real `apps/api` test convention is a prerequisite for full TDD there — treat as a candidate near-term improvement, not an assumption to build on silently.

## What NOT to Do

- Don't compute a score live at request time — see `harness/rules/ai-agents.md` rule 9.
- Don't add a second LLM provider abstraction layer for the chatbot — the existing model-failover-list pattern (`NODE_1_MODEL`/`NODE_2_CANDIDATES`) is the established way to handle provider resilience; extend it, don't replace it with something else.
- Don't hardcode a secret fallback (see `harness/rules/secret-hygiene.md`).
- Don't introduce Alembic or any migration tool without raising it explicitly first — `apps/api`'s current `Base.metadata.create_all()` approach is a real constraint (see `harness/patterns/tech-stack.md`), not an oversight to silently fix.

---

## Framework Notes (keep up to date)

### FastAPI / Pydantic

finwerse's API is pure JSON (no server-rendered templates), so the boilerplate's `TemplateResponse` gotcha doesn't apply. The relevant FastAPI/Pydantic pattern already in use: request/response models are separate Pydantic classes per operation (`PortfolioHoldingCreate` vs. `PortfolioHoldingUpdate` vs. `PortfolioHoldingResponse` in `portfolio.py`) rather than one shared model with optional fields — follow this split for new endpoints rather than collapsing them into one flexible schema.

### Async/sync mixing in `apps/api`

Some routers are `async def` (chatbot, using `httpx.AsyncClient` and `asyncio.gather`), others are sync `def` (stocks, portfolio, alerts, analyzer — using the sync SQLAlchemy `Session`). This is an intentional existing split, not an inconsistency to "fix" — sync routers use the sync DB session pattern (`Depends(get_db)`), async routers use it too but interleave with async external calls. Don't convert a sync router to async without a concrete reason (e.g. adding a genuinely async external call to it) — it's not free, and FastAPI runs sync `def` routes in a threadpool already.

### SQLAlchemy model style

`apps/api/models.py` mixes legacy `Column()` declarations (the majority of the file) with nothing in the newer `Mapped`/`mapped_column()` 2.0 style. Match the existing `Column()` style for new fields on existing models; if starting a genuinely new model, either style is acceptable but stay consistent within that model.

### Integration test patterns (once a real `apps/api` test suite exists)

Integration tests should call the real Groq/twitterapi.io/market-data providers — not stubbed — per `harness/rules/ai-agents.md` rule 7. Use a real Postgres test database (see `harness/patterns/tech-stack.md`'s Test Environment Rule), never SQLite. Because responses from Groq are non-deterministic, assert on stable structural properties (response shape, key fields present, expected `role`s in a streamed response) rather than exact prose.
