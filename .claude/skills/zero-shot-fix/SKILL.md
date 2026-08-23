---
name: zero-shot-fix
description: Diagnose and fix a problem in finwerse — a bug description, a runtime error/stack trace, failing tests, or spec/code drift — then verify the fix. Calls qa-auditor first to classify and route, then the responsible code-generator (by surface) or spec-writer, then re-verifies. Runs autonomously to a verified result.
argument-hint: [bug description / error / "tests" / "drift" / capability or surface name]
allowed-tools: Bash(git*)
---

**Auto-invocation policy:** invoke this skill on your own analysis whenever the user reports a bug, pastes an error/stack trace, mentions a failing test, or the situation otherwise calls for a real diagnose-then-fix pass — they do not need to type `/zero-shot-fix` explicitly. When auto-invoking, `$ARGUMENTS` is the user's own description of the problem, not your guess at what's wrong.

You orchestrate a targeted fix by calling worker agents directly — no `agent-builder` needed for a single fix. The target is in `$ARGUMENTS`. **If `$ARGUMENTS` is empty (invoked with no context at all), ask the user in plain text to describe what's broken — the bug, error, failing test, or drift — and WAIT for their free-text reply before doing anything else.** Do NOT use `AskUserQuestion` to guess the problem, and never invent a problem the user hasn't actually reported — it must come from the user, whether typed as `/zero-shot-fix <target>` or stated in a normal message you recognized as calling for this skill. Run autonomously: diagnose+classify → fix → verify, looping until the failure signal is gone. Pause only on a hard blocker or explicit request.

**`qa-auditor` runs FIRST** — it diagnoses, captures the failing signal, and classifies the root cause (SPEC vs. CODE) and surface(s). Its verdict routes the fix; you own the commit + push to `staging`.

## Step 1 — Diagnose + classify (`qa-auditor` first)

**Skip if already diagnosed:** if the caller has passed a `qa-auditor` verdict with exact `file:line` and SPEC/CODE classification, use that as the baseline and go straight to Step 2.

Otherwise, invoke `qa-auditor` with the target. It captures the current red state (failing test output, reproduced error, or the specific drift divergence + file) as your before/after baseline, classifies the root cause, and names the surface(s). State the classification in one line. If `qa-auditor` can't reproduce the reported problem, say so and ask for repro steps rather than guessing.

Done-when, by signal:

| Signal in `$ARGUMENTS` | Done when |
|---|---|
| **Failing tests** | the gate test is green (where a real test runner exists for the surface — see `harness/rules/ai-agents.md`'s Test Commands table; if none exists, "done" means a manual smoke confirmation instead) |
| **Bug description** | the wrong behavior no longer occurs, plus a regression test where a real runner exists |
| **Runtime error / stack trace** | the error no longer reproduces when the app runs |
| **Spec/code drift** | `qa-auditor` (drift mode) reports the item resolved (see also `/zero-shot-sync` for a whole-tree pass) |

## Step 2 — Fix (routed by the verdict)

- **SPEC root cause** → invoke `spec-writer` to correct the affected `spec/*.md` file(s), then invoke the responsible `code-generator`(s) to bring code in line with the corrected spec.
- **CODE root cause** → invoke `code-generator`, named by the surface(s) that must change (`apps/web` / `apps/api` / `apps/mobile`).

If the fix genuinely spans multiple independent surfaces, invoke multiple `code-generator` instances in one Agent message (parallel, disjoint paths).

## Step 3 — Verify

Invoke `qa-auditor` (gate mode, scoped to the affected surface(s)) to confirm the fix and that nothing else broke. Re-loop Step 2 if still BLOCKED, with the new specifics.

## Step 4 — Ship + report

Commit + push to `staging` yourself (atomic, explicit files staged, never `git add -A`, never `main` — per `harness/rules/git.md`). Report: the diagnosis, the classification (SPEC or CODE), what changed and where, and the verification result. If the fix is significant, note that it's on `staging` and a `staging`→`main` PR for Sai Krishna's review would be the next step — don't open one yourself unless asked.
