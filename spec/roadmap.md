# Roadmap

## What This Product Does

Finwerse is an AI-powered trading-intelligence platform for retail Indian equity cash-market traders. It computes four scores (Overall, Technical, Safety, Sentiment) across three holding-period timeframes (Short/Medium/Long) for the tracked NSE universe on a daily batch schedule, and serves those scores — plus manual portfolio tracking, portfolio health analysis, score-threshold alerts, an AI chatbot, and trade-behavior analysis — through a web app, a mobile app, and the FastAPI backend both call.

## Who Uses It

Retail Indian equity cash-market traders — explicitly **never** F&O/derivatives/options traders. Users range from those who just want a quick score check on a stock (Discover/StockDetail) to those tracking a real portfolio (Portfolio Connect/Health/Alerts/Impulse Analyzer) to those who prefer asking questions in plain English (Ask AI Chatbot).

## Core Problem Being Solved

Retail traders lack a single, consistent, jargon-free signal to evaluate stocks and their own trading behavior — they're left interpreting raw technical indicators, scattered news, and their own gut feel. Finwerse condenses that into one consistent -100..+100 scoring system, read-only and (with one deliberate exception) never issuing direct buy/sell advice, so the product stays an intelligence layer rather than an advisory service requiring SEBI RIA/RA registration.

## Success Criteria

- [ ] All four scores (Overall/Technical/Safety/Sentiment) compute daily for the full tracked universe with the color-band convention applied consistently (Red <40, Amber 41-65, Green 66-100)
- [ ] A user can manually track a portfolio (add/edit/sell/delete holdings) and see it reflected in Portfolio Health's weighted scores and diversification metric
- [ ] The Ask AI Chatbot answers any general stock question with a decisive, jargon-free, multi-timeframe synthesis, routing correctly across its 7 tools
- [ ] Alerts fire exactly once per threshold crossing and deliver via Expo push
- [ ] The Impulse Analyzer correctly classifies losing trades against the locked ≥80/≤-80 score thresholds and reports an accurate rupee cost
- [ ] No endpoint ever computes a score live at request time — all scoring is precomputed by the daily batch

## What This Product Does NOT Do (Out of Scope)

- F&O, derivatives, futures, or options — cash-market equities only
- Placing or facilitating actual trade orders — read-only intelligence layer
- Direct buy/sell/avoid/invest recommendations, **except** the Portfolio Health Bottleneck Report (deliberate, single exception — see Standing Platform Rules)
- Broker/CDSL-NSDL auto-sync of holdings — ruled out for now (SEBI RIA registration / regulated FIU partner required); manual entry only
- Reddit or any social source beyond Twitter/X in the chatbot's social tool, despite general "social sentiment" framing
- Custom/arbitrary holding periods — only the three fixed buckets (Short/Medium/Long) everywhere

## Key Constraints

- All scores on a fixed -100 to +100 scale with consistent color bands across every feature
- Three fixed holding-period buckets used everywhere: Short (7-30 days), Medium (1-4 months), Long (4-12 months)
- All heavy computation happens on the daily batch schedule (Render cron, 3:45 PM IST / 10:15 UTC weekdays) — nothing computed live at request time
- Raw data (scores, indicator states, filing text, tweets, articles) is backend reasoning material only; user-facing chatbot/report output is the plain-language conclusion, not the underlying numbers, unless explicitly asked
- `StockHistoricalScore` must be append-only dated history, never overwritten — both the Impulse Analyzer and any chatbot backtest capability depend on this

## Build Status

> Corrected twice now: first from `PRODUCT_CONTEXT.md`'s stale list (2026-08-23 migration — it marked Features 2–7 "spec locked, not yet built" when the `apps/api` routers already existed), then from a whole-tree drift audit run the same day that found `apps/api`-only status was misleading — it says nothing about whether either client actually calls that backend. Status is now tracked **per surface**.

| # | Feature | `apps/api` | `apps/web` | `apps/mobile` |
|---|---|---|---|---|
| 1 | Stock Analytics Dashboard | Built — `routers/stocks.py` | **Static prototype** — `Discover.tsx`/`StockDetail.tsx` render `lib/dummyData.ts`, no API call | Built — `stockService.ts` via `apiClient`, wired to `useAppStore` |
| 2 | Portfolio Connect | Built — `routers/portfolio.py` | **Static prototype** — `Portfolio.tsx` renders dummy data | Built — `usePortfolioStore` |
| 3 | Portfolio Health | Built — `routers/health.py` (incl. Bottleneck Report) | Not implemented on web at all (no corresponding page) | Built — `useHealthStore`, incl. Bottleneck Report handoff into the chat tab |
| 4 | Ask AI Chatbot | Built — `routers/chatbot.py` + `services/tools.py`. **Known Gap:** the PRD's "historical/backtest" tool is not in the chatbot's 7-tool list — that logic only exists inside Impulse Analyzer, not as a chatbot-callable tool | **Static prototype** — `AskAI.tsx` has hardcoded canned responses, does not call `/chatbot/ask` at all | Built — `useChatStore`, real streaming. **Gap:** renders response as plain text, no markdown parser — Groq's `• [Read Article](url)`-style links will show as literal bracket/paren text, not tappable links |
| 4a | NSE Filings RAG | Built — `services/nse_scraper.py`, `CorporateFiling` table. Embedding model (listed "deferred" in the original PRD) was actually resolved: `all-MiniLM-L6-v2`, 384-dim | consumed only via the chatbot (see row 4) | consumed only via the chatbot (see row 4) |
| 5 | Alerts | Built — `routers/alerts.py`, `services/alerts_processor.py` | **Static prototype** — `Alerts.tsx` renders dummy data | Built — `useAlertsStore` |
| 6 | Impulse Analyzer | Built — `routers/analyzer.py`, plus `/analyzer/custom-impulse` (unauthenticated, arbitrary hypothetical trades) not described in the original PRD at all — worth confirming this addition was intentional | **Static prototype** — `ImpulseAnalyzer.tsx` renders dummy data | Built — `useAnalyzerStore` |
| 7 | Sentiment Feed | Built — `routers/sentiment.py` | **Static prototype** — `Feed.tsx` renders dummy data | Built — `useSentimentStore` |
| 8 | Chart Analyzer | Not built — no router exists | Not built | Not built |

**`apps/web` status is intentional, not a gap:** confirmed 2026-08-23 — the whole web app is a deliberate static-data prototype (visual/UX design work, not yet wired to `apps/api`) and wiring it up is **not currently a priority**. Treat every "static prototype" row above as expected, not something to silently "fix" — it's not open for `/zero-shot-fix`/`/zero-shot-sync` to touch without being explicitly asked. `apps/mobile` is the surface actually running against the real backend today, the inverse of what `README.md`'s "mobile is the least mature app" framing would suggest — the mobile *screens/polish* may be less mature, but its backend integration is more complete than web's (which has none).

**Other findings from the 2026-08-23 drift audit, not yet actioned:**
- `apps/mobile/app/(tabs)/two.tsx` is unmodified Expo template scaffold ("Tab Two") — dead code.
- `BrokerConnect.tsx` (web) simulates a fake "Connected! Loading your portfolio…" toast with no real backend call — minor honesty concern per `harness/patterns/ui-ux.md`, low priority given the whole surface is an acknowledged prototype.

## Phases of Development

> This roadmap describes an existing, largely-built product, not a from-scratch build — so "phases" here means **next increments**, not the boilerplate's greenfield Phase-1/Phase-2 model. Use `/zero-shot-build` to spec and build any of these as an actual phase when picked up.

### In Progress — Mobile Visual Redesign (started 2026-08-25)
`apps/mobile` is adopting a full visual redesign from an approved Claude Design prototype ("Finwerse Interactive Prototype"), delivered **screen by screen**, spec-first. Full token reference: `spec/ui.md` → "Design System — Mobile Redesign."

**Dark theme palette replaced (2026-08-25):** the dark theme's color values (only — role structure and mechanism unchanged) were replaced in full, moving from an internally-designed near-black/lime palette to a 4-color Color Hunt source palette the user supplied: [colorhunt.co/palette/222831393e4600adb5eeeeee](https://colorhunt.co/palette/222831393e4600adb5eeeeee) (`#222831` navy-black canvas, `#393E46` charcoal elevated surface, `#00ADB5` teal accent, `#EEEEEE` light-gray text). Full derivation (direct mappings, derived neutrals/dividers with recomputed WCAG contrast ratios, the teal on-accent-text decision, and the decision to keep Positive/Negative/Warning unchanged) is in `spec/ui.md` → "Design System — Mobile Redesign" → "Palette source — replaced 2026-08-25." Spec-only this pass — `apps/mobile/src/theme/tokens.ts`'s `darkTheme` object still holds the prior values and needs a follow-up code edit to match. Alongside the visual work, the tab bar restructures from 7 direct tabs to 5 (Home, Portfolio, Health, Ask AI, More) — Alerts, Impulse Analyzer, and Sentiment Feed move from direct tabs to rows on a new More screen. All 8 screens are now spec'd against the same token system (2026-08-25) — this is a **presentation-only** initiative end to end: no screen in this redesign rewires its data layer, and every design element with no real backing data is removed or simplified to what the app actually has rather than stubbed as fabricated data (Stock Detail's three honest "coming soon" stubs are the one deliberate exception, spec'd before this remove-over-stub rule was made explicit for the rest of the initiative).
- **Built (shipped):** Home screen (`spec/ui.md` → "Screen: Home"), Stock Detail screen (`spec/ui.md` → "Screen: Stock Detail"), the new More screen (`spec/ui.md` → "Screen: More"), the 5-tab nav shell restructuring, and — as of 2026-08-25 — the remaining 6 screens: Portfolio, Portfolio Health, Ask AI, Alerts, Impulse Analyzer, and Market News (Sentiment Feed). All 8 redesigned screens are now built and `qa-auditor`-verified (batch gate, 2026-08-25): zero TypeScript regressions, no cross-file scope bleed, no live backend wiring regressed. The Impulse Analyzer screen also picked up a defensive client-side guard (`hasTimingComparison`) against a suspected `evaluate_single_trade` return-shape gap — re-checked against the actually-committed `analyzer.py` and confirmed not present in shipped code (see `spec/capabilities/impulse-analyzer.md`); the guard is harmless and stays in place, just not currently load-bearing.
- **Open questions flagged in `spec/ui.md`'s Home entry, not yet resolved with the user:** (a) the design brief's ranked-list score display/bar-width math was written against a 0-100 mock but real scores are -100..100 (Standing Platform Rule 2) — spec currently resolves this in favor of the platform rule, flagged for confirmation; (b) the "Strong"/"Building" status-label threshold is assumed to be the existing Green-band cutoff (≥66), not explicitly specified in the design brief.
- **Open questions flagged in `spec/ui.md`'s Stock Detail entry, not yet resolved with the user:** (a) the timeframe (short/medium/long) pill switcher is assumed to carry over restyled-in-place, since the design brief for this screen didn't explicitly re-spec it; (b) the 3-way status-pill word/color mapping (Strong/Steady/Weak momentum) is invented against the standing color bands, since the brief only gave one positive-band copy example; (c) all pillar explanatory notes beyond the two the brief gave verbatim are invented, band-derived, deterministic text — see the full mapping table in `spec/ui.md`. Stock Detail's price/chart, signal-drivers, and more-on-this-stock sections remain explicit "coming soon" stubs — no new endpoint or data wiring in this pass; the favorite/watch toggle is session-local UI state only (no `Watchlist` table/endpoint exists).
- **Removed-not-stubbed elements decided in the 2026-08-25 batch pass (Portfolio, Health, Ask AI, Alerts, Impulse Analyzer, Market News), full reasoning in each screen's own `spec/ui.md` entry:** Portfolio's value sparkline chart and "today's change" stat, per-holding score badge (simplified out, not new N+1 wiring); Health's "over time" trend chart and ranked Diagnostics list (simplified to the existing `sector_summary_sentence`); Impulse Analyzer's per-trade "What happened?" factors list and the aggregate cross-trade "Behavioral insight" sentence (a real `{N} trade(s) analyzed` count is kept — a computed count, not an invented psychology sentence); Market News's live index strip (NIFTY/SENSEX/BANK NIFTY) and its News Detail expanded view. A suspected `evaluate_single_trade` (`apps/api/routers/analyzer.py`) return-shape gap raised during this pass was re-checked against committed code and found not to exist in what's shipped on `staging` — see `spec/capabilities/impulse-analyzer.md` for the full correction; the mobile UI's defensive guard against it stays in place regardless. Alerts' custom SVG empty-state graphic is simplified to a plain `IconSymbol` icon; its 3-step bottom-sheet flow stays a single restyled form (no new UI infrastructure this pass).

### Next — Mobile Light Theme (spec'd 2026-08-25, not yet built)
A second, user-selectable color theme for `apps/mobile`, additive alongside the existing dark theme (both coexist, switchable) — not part of the in-progress visual redesign above, a new increment on top of it. Full token table, background/accent/warning color decisions, and the theme-store architecture are spec'd in `spec/ui.md` → "Theming — Light Mode." Two real build tasks once picked up: (1) the new `apps/mobile/src/theme/tokens.ts` + `apps/mobile/src/store/themeStore.ts` (Zustand + `persist` + `AsyncStorage`) plus the More screen's Appearance toggle, and (2) migrating all 10 already-redesigned screens off their local hardcoded `COLOR_*` constants onto the new `useThemeTokens()` hook — a sizeable follow-up in its own right, not a side effect of (1). Default stays dark. **Flagged for confirmation:** the light theme's olive-green and orange token values are this pass's best-judgment approximation of the user's supplied swatch (no exact hex was given for those two bands) — confirm against the actual source image before build.

### Next — Chart Analyzer (Feature 8)
Not yet spec'd. Needs its own PRD before any build phase starts (`spec-writer`'s job) — pattern detection, plain-language explanation, reliability score, per the one-line placeholder in the original PRD.

### Next — Resolve the remaining Build Status gaps
Confirm intent on: (a) the missing chatbot backtest tool, (b) the unauthenticated `/analyzer/custom-impulse` endpoint, (c) mobile chat's missing markdown rendering. Either update this spec to match code (if intentional) or file as a code fix (if not). This is exactly the kind of drift `/zero-shot-sync` should catch automatically going forward.

### Explicitly NOT next (confirmed 2026-08-23)
Wiring `apps/web` to the real `apps/api` backend — the web app's dummy-data state is intentional and not a current priority. Do not treat this as a backlog item unless the user explicitly asks for it.

### Deferred (from original PRD, still open)
- Buy-timing chatbot responses: descriptive-only vs. directional lean — deferred pending RA/RI licensing resolution, not decided in this migration
