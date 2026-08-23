# Engineering Best Practices

Rules that apply to every implementation task in this repo, regardless of surface (`apps/web`, `apps/api`, `apps/mobile`). Ported as-is from `smallTechOrg/zero-shot-claude-boilerplate` — stack-agnostic doctrine, no rewrite needed.

---

## Design

**Single responsibility.** Every function, class, and module does one thing. If you need "and" to describe it, split it.

**Dependency inversion.** Code depends on abstractions (interfaces, protocols), not on concrete implementations. This makes stubs, testing, and future swaps cheap.

**No premature abstraction.** Three similar lines is better than a premature helper. Extract only when you have three real uses — not hypothetical ones.

**Immutable data by default.** Prefer returning new values over mutating in place. Makes behaviour easier to reason about and test.

---

## Testing

**Tests are part of the change — not an afterthought.** Write the test alongside the code, not after.

**Testing pyramid.** Unit tests form the base (fast, many, isolated). Integration tests sit above them (slower, fewer, test the real DB and the real LLM/API boundary). End-to-end / smoke tests at the top (fewest, run on a real process against the real provider).

**Test behaviour, not implementation.** Tests assert what the function returns or what side-effects occur — not which internal calls were made. Tests that mirror the implementation break on refactors that don't change behaviour.

**Never mock what you can stub.** Prefer thin stub implementations over framework mocks. Stubs compose, mocks create test-coupling. The LLM/external provider is **not** stubbed in integration and e2e tests — those hit the real provider (Groq, twitterapi.io, market-data providers) with real keys.

**One assertion per concept.** When a test fails you want to know exactly what broke.

**Unit tests must be deterministic.** No random data, no wall-clock-dependent assertions. Integration and e2e tests *do* make real API calls — keep them stable by asserting on structural properties (status, shape, key fields), not exact prose, so real calls don't make them flaky.

---

## Code quality

**Name things from the caller's perspective.** A function named `process_items` tells you nothing. `validate_inventory_thresholds` tells you exactly what to expect.

**Short functions.** If a function doesn't fit on one screen, it has too many responsibilities.

**No magic numbers or strings.** Every hard-coded literal that has domain meaning must be a named constant — e.g. finwerse's ≥80/≤-80 impulse-trade thresholds, the -100..100 score range, the 5-day alert visibility window.

**Fail fast.** Validate inputs at the boundary (API request, CLI arg, batch job input). Never let invalid data propagate deep into the system.

**Return early.** Prefer guard clauses at the top over deeply nested conditionals.

---

## Error handling

**Handle errors at the level that has context to recover.** A low-level DB function should not catch and swallow errors — it should let them propagate to the layer that knows whether to retry, degrade, or abort.

**Distinguish recoverable from unrecoverable.** Retryable errors (network timeout, transient lock) must be retried with back-off. Unrecoverable errors (bad config, missing required env var) must fail hard at startup with a clear message.

**Log at the right level.** DEBUG for internal state. INFO for normal operation milestones. WARNING for recoverable anomalies. ERROR for failures that require attention. Never log sensitive data (tokens, passwords, PII).

**Errors must include context.** `"Database error"` is useless. `"Failed to insert holding user_id=... symbol=...: constraint violation"` is actionable.

---

## Security

**Never trust input.** Validate everything that crosses a trust boundary: HTTP requests, CLI arguments, file uploads, database values, environment variables.

**Principle of least privilege.** Each component, service account, and API token should have only the permissions it needs — nothing more.

**Secrets are never in code.** See `harness/rules/secret-hygiene.md`.

**Parameterised queries only.** Never construct SQL from user-supplied strings. Use the ORM or parameterised query interface without exception — note `apps/api/routers/analyzer.py`'s raw `text()` query already parameterizes via bind params (`:symbol`, `:actual_date`); keep that pattern, never string-format a value into raw SQL.

**Dependency hygiene.** Pin dependency versions. Review new dependencies before adding them.

---

## Observability

**Structured logging.** Emit JSON logs where the logging pipeline can parse them. Include `timestamp`, `level`, and `message` at minimum.

**Every external call is instrumented where it matters.** Latency and error rate for LLM calls (Groq), market-data provider calls, and the daily batch job should be observable — you will debug production issues from these numbers. Note: `spec/agent.md` flags that the chatbot currently has no structured request/response logging or trace ID — a real gap, not aspirational doctrine.

---

## Git and code review

See `harness/rules/git.md` for the full git rules (staging-only workflow). The quality principles that belong here:

**Commits are logical units.** Each commit should be a self-contained, reviewable change.

**Commit messages explain the why.** The diff shows the what.

**No commented-out code in commits.** If code is not needed, delete it. Git history preserves it.

**PR description is not optional** (for the `staging` → `main` PR). Every PR needs: what changed, why, and how to verify.

**Review the diff before committing.** `git diff --staged` before every commit.
