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

> Corrected from `PRODUCT_CONTEXT.md`'s original list, which was stale — it marked Features 2–7 "spec locked, not yet built" when the routers for all of them already exist in `apps/api`. This section reflects what's actually running, verified by reading `apps/api/routers/*.py` directly during this migration (2026-08-23).

| # | Feature | Status |
|---|---|---|
| 1 | Stock Analytics Dashboard | **Built** — `routers/stocks.py` |
| 2 | Portfolio Connect | **Built** — `routers/portfolio.py` (holdings CRUD + sell) |
| 3 | Portfolio Health | **Built** — `routers/health.py` (incl. Bottleneck Report) |
| 4 | Ask AI Chatbot | **Built** — `routers/chatbot.py` + `services/tools.py`. **Gap:** the PRD's "historical/backtest" chatbot tool ("what happened last time this stock was at this score") is not present in the chatbot's 7-tool list — that capability currently only exists inside the Impulse Analyzer's counterfactual logic, not as a chatbot-callable tool. Confirm with the team whether this is deferred or was dropped. |
| 4a | NSE Filings RAG | **Built** — `services/nse_scraper.py`, `CorporateFiling` table. Embedding model decision (listed "deferred" in the original PRD) was actually resolved: `sentence-transformers/all-MiniLM-L6-v2`, 384-dim, per `models.py`'s column comment. |
| 5 | Alerts | **Built** — `routers/alerts.py`, `services/alerts_processor.py` |
| 6 | Impulse Analyzer | **Built** — `routers/analyzer.py`, plus a `/analyzer/custom-impulse` endpoint (unauthenticated, arbitrary hypothetical trades) not described in the original PRD at all — worth confirming this addition was intentional |
| 7 | Sentiment Feed | **Built** — `routers/sentiment.py` |
| 8 | Chart Analyzer | **Not built** — no router exists. Still just a placeholder per the original PRD. |

## Phases of Development

> This roadmap describes an existing, largely-built product, not a from-scratch build — so "phases" here means **next increments**, not the boilerplate's greenfield Phase-1/Phase-2 model. Use `/zero-shot-build` (once ported) to spec and build any of these as an actual phase when picked up.

### Next — Chart Analyzer (Feature 8)
Not yet spec'd. Needs its own PRD before any build phase starts (`spec-writer`'s job, once the ported agent exists) — pattern detection, plain-language explanation, reliability score, per the one-line placeholder in the original PRD.

### Next — Resolve the two Build Status gaps above
Confirm intent on (a) the missing chatbot backtest tool and (b) the unauthenticated `/analyzer/custom-impulse` endpoint — either update this spec to match code (if intentional) or file it as a code fix (if not). This is exactly the kind of drift `/zero-shot-sync` (once ported) should catch automatically going forward.

### Deferred (from original PRD, still open)
- Buy-timing chatbot responses: descriptive-only vs. directional lean — deferred pending RA/RI licensing resolution, not decided in this migration
