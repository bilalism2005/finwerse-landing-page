# Spec — Single Source of Truth

This directory is the authoritative specification for finwerse. All code must match this spec. When spec and code disagree, **spec wins — fix the code**, per `harness/patterns/spec-driven.md`.

## Origin

This `spec/` was migrated on 2026-08-23 from `PRODUCT_CONTEXT.md` and `prds/Finwerse_Feature*.md` (adopting the structure demonstrated by `smallTechOrg/zero-shot-claude-boilerplate`, adapted for finwerse's real 3-surface stack). Unlike a from-scratch spec-driven build, finwerse's product already existed — so `data.md` and `api.md` were derived by reading the running code (`apps/api/models.py`, `apps/api/routers/*.py`) directly, then made authoritative going forward. `PRODUCT_CONTEXT.md` and `prds/*.md` remain in the repo as historical design-narrative documents (they carry "why" reasoning this terser format drops) but are no longer the thing code is checked against.

Several real spec-vs-code divergences were found and recorded during the migration rather than silently resolved — see `spec/roadmap.md` → Build Status and the "Known Gap" sections in the affected capability files. These are exactly what `/zero-shot-sync` (once ported) should catch automatically going forward.

## Structure

```
spec/                 ← The product (you read & edit this)
  roadmap.md       ← Purpose, goals, success criteria, build status, next increments
  architecture.md  ← System design, layers, data flow, and the chosen ## Stack
  agent.md         ← The Ask AI Chatbot's tool-calling design (finwerse's only agentic surface)
  data.md          ← Data schema (10 tables, derived from apps/api/models.py)
  api.md           ← REST surface (derived from apps/api/routers/*.py)
  ui.md            ← Web + mobile screens
  capabilities/    ← One file per discrete capability (9 files)

harness/              ← How to build it (generic engineering doctrine)
  rules/           ← Mandatory rules (ai-agents, git, secret-hygiene)
  patterns/        ← engineering-practices, test-driven, ui-ux, agentic-ai (ported as-is);
                     spec-driven, tech-stack, code (rewritten for finwerse's stack)
```

## Governance Rules

1. **Spec first** — no code change without a spec backing it
2. **One fact, one place** — never duplicate facts across spec files; cross-reference with links
3. **Capabilities are atomic** — each file in `capabilities/` describes exactly one discrete thing the product does
4. **No implementation details in product spec** — `spec/` describes WHAT, `harness/` describes HOW
5. **Update spec before code** — if requirements change, update the spec first, then update the code

## Who Updates the Spec

- **New capability:** once ported, run `/zero-shot-build` — it adds the capability via the `spec-writer` sub-agent
- **Drift between spec and code:** once ported, run `/zero-shot-sync` to reconcile (spec wins, except where a divergence reveals the spec itself is wrong — those are surfaced for a human decision, never silently auto-corrected)
