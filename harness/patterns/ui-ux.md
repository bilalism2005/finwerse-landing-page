# UI/UX Standards

The bar every user-facing surface must clear — web (`apps/web`) and mobile (`apps/mobile`). `spec/ui.md` says *what* the UI is for finwerse; this file says *how good it has to be*. Ported from `smallTechOrg/zero-shot-claude-boilerplate` with finwerse-specific examples added — the doctrine itself is stack-agnostic.

---

## First Principles

**Every state is designed, not just the happy one.** For each view, the four states all exist and are intentional:

1. **Empty** — nothing yet (e.g. a user with no holdings on the Portfolio screen). Explain what this is and the one action to populate it. Never a blank panel. `PortfolioHealthResponse`'s all-zero response for an empty portfolio is the API-level version of this — the UI consuming it must render an explanatory empty state, not zeros with no context.
2. **Loading** — work in progress. Show a skeleton or spinner *with context* ("Fetching your portfolio health…"), never a frozen screen. The Ask AI Chatbot streams — the UI must render partial tokens as they arrive, not wait for the full response.
3. **Error** — something failed. Say what failed, why if known, and what the user can do. Never a raw stack trace or a silent no-op. Note: several finwerse tools (`tool_twitter_sentiment`, `tool_news_sentiment`) already degrade to a plain-English placeholder rather than an error at the API level — the UI should trust and render that placeholder, not add a second layer of generic error handling on top.
4. **Ideal / populated** — the designed-for case.

A view that only handles state 4 is half-built.

**The user is never guessing.** At any moment they can answer: Where am I? What can I do here? What just happened? Did it work?

**Feedback is immediate.** Every action acknowledges within ~100ms. An action that triggers slow work (Bottleneck Report generation, chatbot response) shows progress, not a dead UI.

---

## Honesty

- **Never fake progress.** A progress bar reflects real work or it doesn't exist.
- **Destructive actions confirm.** Deleting a holding, deleting an alert — ask first and name what will be lost.
- **Never blur the line between "computed" and "not yet available."** A score of `null`/"Not Available" (delisted stock, missing sentiment data) must render distinctly from a score of `0` — these mean different things in finwerse's data model (`spec/data.md`).

---

## Visual & Interaction Quality

- **Hierarchy.** One clear primary action per view; secondary actions are visibly secondary.
- **Consistency.** One spacing scale, one type scale, one colour system. The score color bands (Red <40, Amber 41-65, Green 66-100 — `spec/roadmap.md` Key Constraints) must render identically wherever a score appears, across both `apps/web` and `apps/mobile`.
- **Whitespace is structure**, not waste.
- **Legibility.** Body text ≥16px (web), real contrast (WCAG AA: 4.5:1 for text). Never grey-on-grey.
- **Responsive / fluid.** Web survives a narrow window and a wide one; nothing clipped, no horizontal scroll on the primary flow.

---

## Accessibility (table stakes, not a phase)

- Every interactive element is **keyboard reachable** (web) and shows a visible focus ring. Tab order follows reading order.
- Semantic markup: real `<button>`, `<nav>`, `<main>`, `<label>`-linked inputs.
- Images and icon-buttons have text alternatives. Form errors are announced, not just colour-coded (colour is never the *only* signal for score bands — pair with a label, not just red/amber/green).
- Respects `prefers-reduced-motion`.

---

## Copy

- **Plain, specific, human.** "Couldn't reach the market data provider — retrying" beats "Error 500."
- **Labels are verbs for actions** ("Add holding," "Set alert"), **nouns for things**.
- Empty states teach the feature in one line.

---

## Chat Surface (Ask AI Chatbot — the one place this applies directly in finwerse today)

- The agent states what it's doing before a long action and confirms after; it never goes silent mid-task; it surfaces tool failures in plain language (already true at the API layer — degraded placeholders, not raw errors — the UI must not re-introduce raw errors on top).
- **Chat responses are markdown.** The chatbot's synthesis output is prose the LLM writes, streamed as `text/plain` — the client must render it through a markdown renderer (e.g. `react-markdown` + `remark-gfm`), never as a raw text node, or formatting artifacts will leak through as visible syntax. Verify this is actually wired up in `apps/web`'s AskAI screen and `apps/mobile`'s chat tab — not confirmed during this harness port.
- **No dual-representation** — no value, sentence, or result appears twice across the API response and the rendered UI.

---

## Verification

Before calling a UI change done: walk the primary path live (not just unit tests), confirm all 4 states render correctly for at least one view you touched, and confirm an error path renders human copy — not a stack trace, not a raw JSON error body.
