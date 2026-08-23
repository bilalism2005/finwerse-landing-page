# Test-Driven Development

How tests are written in this repo. Ported from `smallTechOrg/zero-shot-claude-boilerplate` — stack-agnostic discipline, no rewrite needed. Applies to every change on every surface, adjusted only by the fact that `apps/api` currently has no confirmed real test runner (see `harness/rules/ai-agents.md` → Test Commands) — treat getting that runner properly wired as a prerequisite for full TDD on that surface, not a reason to skip red-green-refactor conceptually.

---

## The Loop

**Red → Green → Refactor.** For every behaviour:

1. **Red** — write a failing test that describes the behaviour you want. Run it; watch it fail for the *right reason* (assertion failure, not import error).
2. **Green** — write the minimum code to make it pass. No more.
3. **Refactor** — clean up code *and* test, with the green bar as your safety net. Re-run.

If you wrote code before its test, you skipped Red. Delete the test you wrote afterward, or treat it as a characterization test and label it as such — don't pretend it was TDD.

## Test-First Is Not Negotiable for New Behaviour

- A new capability starts with a test that fails because the capability doesn't exist yet.
- A bug fix starts with a **regression test that reproduces the bug** — it must fail on the current code, then pass after the fix. A fix with no failing-first test is unverified; you cannot prove it fixed anything.

## What a Good Test Asserts

- **Behaviour, not implementation.** Assert what the function returns or what side-effect occurred — never which internal helpers were called.
- **One concept per test, named as a sentence** stating precondition and outcome: `test_impulse_trade_excluded_when_buy_and_sell_both_right`, not `test_impulse`.
- **Arrange / Act / Assert**, visibly separated.

## Determinism Is a Hard Requirement

A flaky test is worse than no test — it trains everyone to ignore red.

- **No wall clock.** Inject time, or freeze it in the fixture.
- **No randomness.** Seed it, or pass the value in.
- **Determinism at the unit level.** Pure unit tests inject time/seeds and may stub the provider boundary. Integration and E2E tests DO call the real provider (Groq, twitterapi.io, market-data APIs); for those, assert on response shape/invariants, not exact prose.
- **No shared mutable state between tests.** Each test sets up and tears down its own world.

## If a Stub Is Used, Don't Mock

For pure-unit isolation, prefer a thin real implementation (in-memory fake, stub provider) over a framework mock. Integration and E2E tests use the **real provider**, not a stub.

- Use the production DB driver (Postgres + `pgvector`) in integration tests — never SQLite as a substitute (`harness/rules/ai-agents.md` rule 5).

## Stateful Capabilities Need a Second Interaction

A capability that carries state — the chatbot's client-supplied `history`, a user's portfolio across multiple requests, an alert's `triggered` status persisting — has a bug class the first call can never expose: stale reads, scoping errors, state that should persist but doesn't. These fire on the **second** interaction, not the first.

For finwerse specifically: the Ask AI Chatbot's `history` windowing (`spec/agent.md`) should be tested with a multi-turn conversation, not a single query — a single-turn test cannot catch a history-windowing bug. Similarly, Alerts' "fires exactly once" rule (`spec/capabilities/alerts.md`) is only provable by running the alert processor twice against the same triggered condition and asserting the second run does nothing.

## Data-Processing Capabilities Need Full-Data Gates

A capability that analyses or aggregates over a dataset has a silent failure mode: **sampling**. finwerse's `services/batch_processor.py` runs over the full ~1800-stock tracked universe — a test fixture with 5 stocks cannot catch a bug that only manifests at real scale (rate limiting, pagination, partial-batch failure handling). For any test of batch/aggregation logic, use a fixture large enough that a partial-data bug would be observably different from the full-data correct answer.

## The Pyramid

| Level | Count | Speed | Scope |
|---|---|---|---|
| Unit | many | ms | one function/class, deps stubbed |
| Integration | fewer | 100s of ms | real DB and real LLM/API boundary |
| E2E / smoke | fewest | seconds | a real process, golden-path user journey |

Push assertions **down** the pyramid: if a unit test can catch it, don't wait for the smoke test.

## Coverage Is a Floor, Not a Goal

- Cover every branch of business logic and every documented error path.
- Don't chase 100% by testing trivial getters or framework glue.
- A line covered by a test with no meaningful assertion is **not** covered.

## Before You Claim Done

- Run the **full** suite for the surface you touched, not just the test you touched. Show the output.
- "It should pass" is not a passing test.
- For analytical capabilities (Impulse Analyzer, Portfolio Health's weighted scores): assert the correct computed value against a fixture with a known result — a non-empty response is not a passing gate.
- For stateful capabilities (chatbot history, alert trigger-once): drive at least two interactions and assert the second sees/respects the first.
