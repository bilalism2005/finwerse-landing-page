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

### Next — Chart Analyzer (Feature 8)
Not yet spec'd. Needs its own PRD before any build phase starts (`spec-writer`'s job) — pattern detection, plain-language explanation, reliability score, per the one-line placeholder in the original PRD.

### Next — Resolve the remaining Build Status gaps
Confirm intent on: (a) the missing chatbot backtest tool, (b) the unauthenticated `/analyzer/custom-impulse` endpoint, (c) mobile chat's missing markdown rendering. Either update this spec to match code (if intentional) or file as a code fix (if not). This is exactly the kind of drift `/zero-shot-sync` should catch automatically going forward.

### Explicitly NOT next (confirmed 2026-08-23)
Wiring `apps/web` to the real `apps/api` backend — the web app's dummy-data state is intentional and not a current priority. Do not treat this as a backlog item unless the user explicitly asks for it.

### Deferred (from original PRD, still open)
- Buy-timing chatbot responses: descriptive-only vs. directional lean — deferred pending RA/RI licensing resolution, not decided in this migration
