---
name: zero-shot-build
description: Turn an idea for a new finwerse capability (or a substantial change to an existing one) into a spec'd, implemented, tested addition. One intake round to pin down the design, then spec-writer updates spec/, then the build runs across whichever surfaces (apps/web / apps/api / apps/mobile) the capability touches, gated by qa-auditor. For a single-surface, well-scoped change, skip straight to spec-writer + code-generator directly instead of this skill.
argument-hint: [your idea, or the capability/change to make]
disable-model-invocation: true
allowed-tools: Bash(git*)
---

You run intake for a new (or substantially changed) finwerse capability, then hand off to `spec-writer` and the build. The idea is in `$ARGUMENTS`. **If `$ARGUMENTS` is empty, ask the user in plain text to describe the idea, and WAIT for their free-text reply before doing anything else.** Do NOT use `AskUserQuestion` to solicit or suggest the idea itself — it must come from the user. Once you have it, move to intake.

Unlike the greenfield boilerplate this skill is adapted from (`smallTechOrg/zero-shot-claude-boilerplate` — one-line idea → a brand-new agent skeleton), finwerse already exists: intake here is about pinning down *this specific addition* against an established product, established platform rules, and an established data model — not choosing a tech stack from scratch.

## Stage 1 — Intake

Use `AskUserQuestion` to resolve anything that would force `spec-writer` to guess:
- What exactly does this capability do, for whom, and why (if not already clear from the idea)?
- Which surface(s) does it touch — `apps/web`, `apps/api`, `apps/mobile`, or some combination?
- Does it need new data (`spec/data.md`)? New endpoint(s) (`spec/api.md`)? New screen(s) (`spec/ui.md`)? Is it itself agentic (`spec/agent.md`, only if it genuinely needs an LLM tool-use loop — most finwerse features don't)?
- **Platform rules check:** does this capability show scores (must use the -100..100 scale + standard color bands)? Is it timeframe-scoped (must use the three fixed Short/Medium/Long buckets)? Could it be read as offering buy/sell/advice framing (forbidden everywhere except the one existing deliberate exception — Portfolio Health's Bottleneck Report; a new exception is a real product/compliance decision, not something to decide implicitly)?
- Does it need live computation, or should it read from (possibly newly added) precomputed batch data? (Live computation at request time is a hard rule violation — `harness/rules/ai-agents.md` rule 9 — surface this early if the idea seems to need it.)

Keep asking until you'd otherwise be handing `spec-writer` an ambiguous brief on something load-bearing. Don't over-ask on things that don't affect the design (implementation details are `code-generator`'s job, not intake's).

## Stage 2 — Design

Invoke **`spec-writer`** with the intake brief. It creates/updates the relevant `spec/capabilities/*.md` file plus whichever of `data.md`/`api.md`/`ui.md`/`agent.md`/`architecture.md`/`roadmap.md` the capability actually affects, and self-reviews before returning. Read what it wrote — confirm it matches what you intended before proceeding to build.

## Stage 3 — Build

- **If the capability touches only one surface:** invoke `code-generator` directly for that surface, then `qa-auditor` to gate it.
- **If the capability spans multiple surfaces** (e.g. a new `apps/api` endpoint plus its `apps/web` and `apps/mobile` UI): invoke **`agent-builder`** to orchestrate — it fans out one `code-generator` per surface in parallel, gates each with `qa-auditor`, and reports back.

For anything large enough that a single all-at-once delivery would be hard to review, prefer staged delivery (e.g. backend first, UI second) with a check-in between stages — `agent-builder`'s lifecycle already supports this; ask for it explicitly if you're driving the build directly instead.

## Stage 4 — Verify + report

Once all touched surfaces are VERIFIED, report to the user: what was built, on which surfaces, how to test it (the actual run command per surface, from `harness/rules/ai-agents.md`), and what — if anything — is a known limitation or deferred piece. If the capability is ready to ship, note that it's on `staging` and a `staging`→`main` PR would be the next step for Sai Krishna's review — don't open the PR yourself unless asked, and never merge it.

## Failure modes to avoid

- Skipping intake on a genuinely ambiguous idea and letting `spec-writer` guess at something load-bearing (especially the platform-rules checks above).
- Treating this as a from-scratch build and re-choosing finwerse's stack, data model conventions, or platform rules instead of building within them.
- Building on a surface `spec-writer` didn't actually design for.
- Silently introducing a live-computation code path.
- Silently introducing a new buy/sell-advice exception without flagging it as the deliberate, rare thing it is.
