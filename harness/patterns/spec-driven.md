# Spec-Driven Development

finwerse follows a strict spec-first discipline. This file explains what that means in practice. Adapted from `smallTechOrg/zero-shot-claude-boilerplate` — same philosophy, repointed at finwerse's actual `spec/` (migrated 2026-08-23 from `PRODUCT_CONTEXT.md` + `prds/*.md`, not built from templates).

## The Rule

**The spec is always written before the code.**

No exceptions going forward. If you find yourself writing code for something that isn't in `spec/`, stop and spec it first.

> **Exception acknowledged, not repeated:** the migration that created this `spec/` worked backwards from existing code (finwerse already had a working product before this harness existed) — `data.md` and `api.md` were derived by reading `apps/api/models.py` and `apps/api/routers/*.py` directly. That was a one-time bootstrap. From this point forward, spec precedes code, same as the boilerplate's own rule.

## Why

When code is written without a spec:
- Different parts of the system make inconsistent assumptions about behavior
- Testing becomes guesswork
- Different sessions produce inconsistent results because each re-derives requirements
- Scope creep happens silently — this already happened once: `/analyzer/custom-impulse` exists in code with no corresponding PRD entry (documented in `spec/capabilities/impulse-analyzer.md` as a Known Gap)

When spec comes first:
- Every session reads the same requirements
- Tests can be derived mechanically from the spec
- "Does this match the spec?" is a concrete, answerable question
- Drift audits (once `qa-auditor` is ported, driven by `/zero-shot-sync`) can catch divergence automatically — several such divergences were already found by hand during the 2026-08-23 migration; see `spec/roadmap.md` → Build Status

## What Goes in the Spec

**Product spec (`spec/`):**
- What finwerse does (behavior, not implementation) — `roadmap.md`, `capabilities/*.md`
- Who uses it and why
- What data it handles — `data.md`
- What APIs it exposes — `api.md`
- What the UI looks like — `ui.md`
- The Ask AI Chatbot's agentic design — `agent.md`

**Chosen stack (in `spec/architecture.md`):**
- finwerse's actual language/framework/LLM/database choices live in the `## Stack` section.

**Engineering harness (`harness/`):**
- `harness/patterns/engineering-practices.md`, `test-driven.md`, `ui-ux.md`, `code.md`, `tech-stack.md` — generic and finwerse-specific engineering rules
- `harness/patterns/agentic-ai.md` — the pattern catalogue (finwerse's actual usage noted inline)
- `harness/rules/git.md`, `secret-hygiene.md`, `ai-agents.md` — mandatory session rules

**Does NOT go in the spec:**
- Line-by-line implementation (that's the code)
- Temporary workarounds
- Debug notes or session-specific context (those belong in commit messages / PR descriptions)

## What to Do When Requirements Change

1. Update the relevant `spec/` file first
2. Then update the code
3. Once `/zero-shot-sync` is ported, run it to confirm code matches the updated spec

Never update the code first and "update the spec later" — later never comes. (`PRODUCT_CONTEXT.md`'s stale Build Status section, corrected in `spec/roadmap.md` during this migration, is the concrete proof of what "later never comes" actually looks like.)

## Spec vs. Implementation Conflicts

If the spec says X and the code does Y: the code is wrong, fix the code to match the spec — **unless** the spec is wrong, in which case update the spec and get it reviewed first, then fix the code. Several open items in `spec/roadmap.md` → Build Status are exactly this ambiguity, deliberately left unresolved for a human decision rather than silently picked one way.

## Adding a New Capability

Once `/zero-shot-build` is ported, run it on the existing spec — it drives a `spec-writer` sub-agent to add the capability, then plans, builds, and verifies it. Do not add capabilities by writing code and describing what you built afterward.
