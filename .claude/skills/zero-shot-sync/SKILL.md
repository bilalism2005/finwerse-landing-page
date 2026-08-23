---
name: zero-shot-sync
description: Reconcile finwerse's spec/ and code so they match — spec wins, except where a divergence reveals the spec itself is wrong (surfaced, never silently auto-corrected). Audits the whole tree for drift, routes fixes to the responsible surface's code-generator (or spec-writer), verifies, repeats to a CLEAN audit.
argument-hint: [optional path, capability name, or surface to scope to]
allowed-tools: Bash(git*)
---

**Auto-invocation policy:** invoke this skill on your own analysis whenever the user asks for an audit, a drift check, "does spec match code," or before something ships to `main` — they do not need to type `/zero-shot-sync` explicitly. Also reasonable to invoke proactively after a change you're not fully confident stayed spec-aligned, without waiting to be asked.

You orchestrate a spec↔code sync for finwerse by calling worker agents directly. **Spec is the source of truth — when spec and code disagree, fix the code** (`harness/patterns/spec-driven.md`), unless the divergence reveals the *spec* is wrong, in which case surface it for a human decision rather than silently rewriting the spec to match code. Optional scope in `$ARGUMENTS` (a capability name, a surface like `apps/api`, or a path); otherwise the whole project. Run autonomously to a CLEAN audit; pause only on a hard blocker or a spec-is-wrong finding.

**`qa-auditor` runs FIRST** — read-only, it finds and classifies every divergence, its direction (code-wrong vs. spec-wrong), and which surface(s) it touches. You own the commit + push to `staging`.

## Step 1 — Audit (`qa-auditor`, drift mode)

Invoke `qa-auditor` in drift mode, scoped per `$ARGUMENTS` if given, else whole-tree. For each divergence it returns: severity, direction, and surface(s) + file(s). CLEAN → report and stop.

**Before treating anything as new:** several divergences are already deliberately tracked as "Known Gap" items in `spec/roadmap.md` and specific `spec/capabilities/*.md` files, left open on purpose pending a human decision (e.g. the missing chatbot backtest tool, the unauthenticated `/analyzer/custom-impulse` endpoint). `qa-auditor` checks these against current status rather than re-reporting them as fresh findings — read its output carefully for which is which.

## Step 2 — Triage by direction

Per divergence, act on `qa-auditor`'s direction:
- **Code wrong, spec right** (default) → fix the code, routed to the surface(s) named.
- **Spec wrong, code right** → do **not** auto-edit the spec. Surface to the user with the specific mismatch and a proposed spec change; wait for their decision.
- **Undocumented behavior** → either remove from code, or (if it's actually a good addition) surface as a spec addition for confirmation — this is exactly how `/analyzer/custom-impulse` was found; the pattern repeats, don't silently resolve it the same way twice without asking.

Handle High severity first, then Medium; Low only if in scope. Newly-discovered items (not already a tracked Known Gap) get the same triage.

## Step 3 — Reconcile code (routed by surface, parallel where independent)

Group "code wrong" divergences by surface (`apps/web` / `apps/api` / `apps/mobile`), then invoke the responsible **code-generator** instance per surface — independent surfaces run **concurrently**, one Agent message. Give each generator the spec section + the offending file(s); it edits code to match spec and adds/updates a test where a real test runner exists for that surface (see `harness/rules/ai-agents.md`'s Test Commands table).

## Step 4 — Verify (`qa-auditor`, gate mode)

Invoke `qa-auditor` in gate mode, scoped to the affected surface(s), to confirm the reconciliation didn't break anything. BLOCKED → re-invoke the responsible generator with the detail; loop.

## Step 5 — Re-audit

Invoke `qa-auditor` (drift mode) again, same scope. Repeat 2–4 until CLEAN (modulo spec-is-wrong items surfaced for the user, and any Known Gap deliberately left open pending a decision you don't have authority to make unilaterally).

## Step 6 — Ship + report

Commit + push to `staging` yourself (atomic `git commit ... && git push origin staging`, staging only the changed files, per `harness/rules/git.md` — never `git add -A`, never push to `main`). Summarize: divergences by severity and surface, which were fixed in code (files + regression tests where applicable), which were surfaced as possible spec bugs awaiting the user's decision, and the final audit status. If any fix is significant enough to warrant shipping to production, note that a `staging`→`main` PR should be opened for Sai Krishna's review — but don't open it yourself unless asked; a sync's job is to reconcile `staging`, not to decide when to ship to `main`.
