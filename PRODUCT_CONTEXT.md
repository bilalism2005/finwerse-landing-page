# FINWERSE — MASTER PRODUCT CONTEXT
All features, basic level. Feature-by-feature PRD + technical requirement docs to follow separately.

---

## PRODUCT OVERVIEW

Finwerse is an AI-powered trading intelligence platform for retail Indian equity cash-market traders. Never F&O, derivatives, futures, or options. Read-only intelligence layer — never places orders, never says buy/sell/avoid/invest as a direct recommendation (except where explicitly permitted, noted per feature below).

All scores across the entire product: **-100 to +100**. Color bands: Red below 40, Amber 41-65, Green 66-100 (applies consistently across Technical, Safety, Sentiment, Overall, and Diversification scores).

Three holding periods used everywhere: **Short term (7-30 days), Medium term (1-4 months), Long term (4-12 months).**

## TECH STACK

Mobile: React Native + Expo (primary). Web: React + Vite (later). Backend: FastAPI (Python). Database: Supabase (Postgres + Auth + Storage + Realtime). State: Zustand. Auth: Supabase Auth + Google OAuth (already live, built on top of, not rebuilt).

## BUILD STATUS

1. Auth — done (pre-existing, reused)
2. Stock Analytics Dashboard — built, APK ready
3. Portfolio Connect — spec locked, not yet built
4. Portfolio Health — spec locked, not yet built
5. Ask AI Chatbot — spec locked, not yet built
6. Alerts — spec locked, not yet built
7. Impulse Analyzer — spec locked, not yet built
8. Sentiment Feed — spec locked, not yet built
9. Chart Analyzer — not yet discussed in this session

---

## FEATURE 1: STOCK ANALYTICS DASHBOARD (BUILT)

Search + browse any NSE stock. Dashboard shows Top 10 stocks per Overall/Technical/Safety/Sentiment score, per market cap category, switchable by holding period toggle. Individual stock screen shows all 4 scores plus an AI Summary icon opening the chatbot with pre-loaded context. No live price/day-change on dashboard or search dropdown for V1. Full scoring engine (Technical, Safety, Sentiment, Overall formulas) already locked in separate CONTEXT.md — see Sections 5.1-5.4 of that document for exact formulas, weightages, and data sources per timeframe.

---

## FEATURE 2: PORTFOLIO CONNECT

**Approach:** Broker API/CDSL-NSDL auto-sync explored deeply, ruled out as infeasible for now (cost, regulatory complexity — needs SEBI RIA registration or a regulated FIU partner for Account Aggregator route). **Manual entry only for V1.**

**What the user enters per position:** Stock (typed, resolves via existing symbol-search dropdown reused from Dashboard), quantity, average price, purchase date, intended holding period (Short/Medium/Long — same 3 buckets used everywhere).

**Held/Sold status:** Each position has a status field. Selling the full original quantity marks the position Sold. Partial sell splits the position into two fully independent new rows (no parent-child linkage) — one Sold with the sold quantity, one Held with the remainder — both carrying the original average price forward unchanged.

**Editing:** Positions are editable/deletable. Edits affect Portfolio Health calculations only going forward from the edit point, not retroactively. A split row is edited independently — editing one does not affect the other, since they are unlinked after the split.

**Data model:** `portfolio_holdings` table — id, user_id, stock_symbol, quantity, avg_price, purchase_date, intended_holding_period, status (held/sold), sold_quantity, sold_date, sold_price, created_at, updated_at.

**Edge cases:** Delisted/suspended stock in a user's portfolio → shows "Not Available," same handling as Dashboard's unscored-stock case, no special logic needed.

---

## FEATURE 3: PORTFOLIO HEALTH

**Purpose:** Answers "which stock should I hold vs sell" and "am I diversified" for a user with an existing manually-entered portfolio.

**Global holding-period toggle:** One dropdown (Short/Medium/Long) at the top of the screen. Every stock in the portfolio is re-scored as if held at whichever period is selected — this **overrides** each position's own individually-saved intended holding period. Not per-stock, global for the whole screen.

**Portfolio-level scores:** Overall/Technical/Safety/Sentiment, each a weighted average of the held stocks' own scores, weighted by `invested_value_i / total_invested_value`. Only Held-status rows count. If a stock has no Sentiment data (Not Available), it is excluded from the Sentiment portion of the weighted average only, with no penalty — the remaining stocks' weights are not artificially dragged down by its absence.

**Green/Red split scores:** Alongside the single blended Overall Score, also show two separate weighted averages — Green = weighted avg of only the positive-scoring holdings, Red = weighted avg of only the negative-scoring holdings.

**Diversification Score:** Sector-grouped HHI (Herfindahl-Hirschman Index). Holdings are grouped by sector (using the existing sector tag on each stock from the Dashboard's stock master data) — two stocks in the same sector count as one combined sector weight, not two separate stocks. Formula:

```
sector_weight_i = sector_total_invested_value / portfolio_total_invested_value
HHI = Σ(sector_weight_i²)
Diversification Score = 100 × (1 - (HHI - HHI_ideal) / (HHI_worst - HHI_ideal))
  where HHI_ideal = 0.10 (10 equal-weighted sectors), HHI_worst = 1.0 (100% one sector)
  clipped to 0-100 range
```

Displayed as two pie charts side by side (user's actual sector split vs the ideal reference split) plus one plain-language sentence generated from the same weight array (e.g. "60% of your portfolio is in Banking"). No raw HHI number or score shown to the user directly — visual + sentence only.

**Bottleneck:** Not a passive flagged stock. A tappable AI-call trigger. User taps it, backend sends full portfolio context (every held stock, its score, its status) to the LLM, returns a stock-by-stock plain-language report — explicitly allowed to use hold/sell framing in this specific report (exception to the platform-wide never-say-buy/sell rule, decided deliberately for this feature).

**Architecture:** Pure read/aggregation layer, no new external data pipeline. Joins `portfolio_holdings` (Held rows) against `stock_scores` at request time. `GET /portfolio/health?timeframe={short|medium|long}` returns portfolio-level scores, diversification data, per-stock list, bottleneck trigger availability.

---

## FEATURE 4: ASK AI CHATBOT

**Architecture: tool-calling agent, not fixed conversation modes.**

**Node 1 — Tool selection.** Given the user's query, decides which of the following tools are relevant. Any combination, not mutually exclusive:

1. **Database access** — current + historical stock scores, prices, indicators (Supabase queries)
2. **NSE filings access** — RAG pipeline over NSE/BSE filings (see Feature 4a below)
3. **Sentiment feed access** — the same daily EODHD-scraped article database used by the Sentiment Score and Sentiment Feed feature
4. **Twitter/social access** — TwitterAPI.io `search_tweets` (Advanced Search) REST endpoint, called directly from FastAPI backend, not via the MCP wrapper (MCP is built for single-user personal-assistant use, not multi-tenant backend load). No Reddit coverage currently available through this API despite general "social sentiment" framing — Twitter/X only for now.
5. **Portfolio access** — user's `portfolio_holdings` table, for portfolio-scoped queries

**Execution:** selected tools run in parallel, not sequentially.

**Node 2 — synthesis.** All tool outputs combine into one LLM call that produces a single plain-language answer. Standing rule: raw data (numbers, indicator names, filing excerpts, tweet text) is reasoning material only, never shown to the user verbatim unless they explicitly ask for the underlying detail. Default output is always the conclusion — what it means for the stock — not the data behind it.

**Historical/backtest queries:** "What happened last time this stock was at this score" — finds the single **most recent** matching historical instance (not an average across all instances). Requires `stock_scores` to be stored as dated history rows, not overwritten daily — this is a standing requirement on the scoring engine's storage layer, separate from the live daily score used elsewhere in the app. Two-sided version ("bought at 80, sold at 90") supported the same way. **This backtest capability is chatbot-only** — not surfaced on the Dashboard or individual stock page.

**Score explanation grounding — the Indicator Meaning Reference document.** A separate authored reference document (`Finwerse_Indicator_Meaning_Reference.md`) maps every value range, slope direction, and crossover freshness state (in exact candle counts, matching the locked crossover-decay scoring: 1-2 candles = very fresh, 3-4 = fresh, 5-7 = cooling, 8-10 = aging, 11+ = old) for RSI(14), CCI(30,9) daily, CCI(60,9) weekly/monthly, and MACD(12,26,9) — including zone meaning, slope, crossover freshness, multi-timeframe alignment, and trending-vs-ranging regime context — into plain hedged sentences ("often," "tends to," never "will"). This is reasoning material for Node 2's synthesis step whenever Database access returns indicator/crossover data, never shown to the user as raw sentences.

**Empty portfolio case:** if a user has no `portfolio_holdings` entries and asks a portfolio-scoped question, the chatbot asks "which stock are you referring to?" rather than assuming context.

**No advice line, deferred:** whether buy-timing-style answers can lean directional is explicitly deferred until the RA/RI licensing question is resolved separately — not decided in this session.

### Feature 4a: NSE Filings RAG (sub-component)

Fetch → Parse → Chunk → Embed → Store → Retrieve pipeline.

- **Fetch:** daily scrape of NSE (nseindia.com/corporate-filings) and BSE (bseindia.com/corporates), all 5 filing types prioritized for V1: quarterly results, annual reports, board meeting outcomes, corporate announcements, shareholding pattern disclosures.
- **Parse:** PDF to text, OCR fallback for scanned/image-based older filings.
- **Chunk:** 800 tokens per chunk, 100 token overlap (default).
- **Embed:** embedding model choice **explicitly deferred**, open decision.
- **Store:** Supabase pgvector, one table with vectors + metadata (stock symbol, filing type, filing date, source URL).
- **Retrieve:** query embedded the same way, similarity search filtered by stock symbol (optionally filing type/date range), top N chunks returned as LLM context.
- **Refresh cadence:** daily, same cadence as the rest of the scoring pipeline.

---

## FEATURE 5: ALERTS

**Three use cases, all supported:**
1. Universe-wide — any stock, any score type, any timeframe, crossing above/below a threshold
2. Specific stock — same, pinned to one named stock
3. Portfolio-only — any currently Held stock crossing above/below a chosen score type/timeframe

Multiple alerts allowed on the same stock simultaneously.

**Trigger logic:** fires exactly once when the threshold condition is first met. Not re-evaluated or re-fired after that — once triggered, that specific alert is done permanently. If the user wants to watch the same condition again, they create a new alert.

**Display logic:** triggered alert shows on the Alerts page for 5 days from the trigger date (date is stored and shown), then hidden from the active view. Not deleted from the database — hidden from view only.

**Architecture:** runs as a batch step immediately after the daily 3:45 PM scoring cron completes (since it depends on that day's freshly written scores). For universe-wide alerts, scans all active alerts of that type against all ~1800 stocks' scores. For portfolio-only, joins against `portfolio_holdings` (Held status) first, same join pattern as Portfolio Health.

**Data model:** `alerts` table — id, user_id, alert_type, stock_symbol (nullable), score_type, timeframe, threshold_value, direction, status, triggered_date, created_at.

**Delivery:** Expo push notification, plus an in-app Alerts page showing triggered history within the 5-day visible window.

---

## FEATURE 6: IMPULSE ANALYZER

**Purpose:** Quantify the cost of a user's emotionally-driven (impulse) trades in rupee terms.

**Scope:** only losing trades are analyzed. Profitable trades are automatically classified Not Impulse with no further processing.

**Right/wrong score thresholds (locked, not percentile-relative — fixed absolute bands):**
- Good buy = Overall Score 80 to 100 at time of buy (matched to the trade's actual holding-period bucket)
- Good sell = Overall Score -80 to -100 at time of sell
- Anything outside these ranges on either side = wrong

**Classification — 4 combinations:**
1. Buy right + Sell right → always Not Impulse, no further analysis
2. Buy wrong + Sell wrong
3. Buy right + Sell wrong
4. Buy wrong + Sell right

**For the 3 "wrong" combinations:** find the nearest date (before or after the actual trade date, no maximum lookback or lookforward window — however far away the nearest matching date is) where the wrong side's score would have been "right." Recompute what the trade outcome would have been using the corrected date(s). Compare to the actual outcome:
- If the corrected version is more profitable, or the loss is smaller than the actual loss → flag as **Impulse Trade**, show the "would have been" counterfactual to the user
- If the corrected version is equal or worse → flag as **Not Impulse**, treated as an ordinary trade with no further flagging

**Data dependency:** requires the same historical stored `stock_scores` (dated rows, not overwritten) as the Chatbot's backtest tool — both features share this storage requirement.

---

## FEATURE 7: SENTIMENT FEED

**Purpose:** Browsable news feed with sentiment scores, not just a chatbot input.

**Default view:** articles for the user's portfolio stocks (Held positions).
**Search:** user can search any stock/keyword to see articles for that instead of the portfolio default.

**Architecture:** no new pipeline. Reuses the existing daily EODHD-scraped article database that already powers the Sentiment Score calculation. This feature is purely a display/query layer — pull articles by stock symbol or keyword, show article plus its stored polarity/sentiment score. Same underlying table also feeds the Chatbot's "sentiment feed access" tool.

---

## FEATURE 8: CHART ANALYZER

Not yet discussed in this session. Placeholder — pattern detection, plain-language explanation, reliability score. To be spec'd in a future session.

---

## CROSS-FEATURE DEPENDENCIES

- Portfolio Health, Impulse Analyzer, Alerts (portfolio-only), Chatbot (portfolio-scoped queries), and Sentiment Feed (default view) all depend on `portfolio_holdings` existing — i.e., Feature 2 (Portfolio Connect manual entry) is a prerequisite for all of them to be meaningful, even though each can be built independently against an empty-state fallback.
- Impulse Analyzer and the Chatbot's backtest tool both require `stock_scores` to store dated history, not overwrite daily — this is a shared infrastructure requirement, not duplicated logic.
- Sentiment Feed and the Chatbot's sentiment tool both read the same EODHD article database — one pipeline, two consumers.
- Alerts and Portfolio Health both use the same "join portfolio_holdings (Held only) against stock_scores" pattern — same join logic, reusable.

## STANDING PLATFORM RULES

1. Never use buy/sell/avoid/invest as a direct recommendation anywhere — except the Portfolio Health Bottleneck AI report, which is explicitly permitted to use hold/sell framing (deliberate, single exception).
2. All scores -100 to +100, same color bands everywhere (Red <40, Amber 41-65, Green 66-100).
3. Three holding period buckets used everywhere: Short (7-30 days), Medium (1-4 months), Long (4-12 months) — no custom/arbitrary periods in V1.
4. Raw data (scores, indicator states, filing text, tweets, articles) is backend reasoning material only — user-facing output is always the plain-language conclusion, not the underlying numbers, unless explicitly asked.
5. All heavy computation is pre-computed on a daily batch schedule (3:45 PM IST cron chain) — no live computation at user request time anywhere in the product.

## OPEN / DEFERRED DECISIONS (not resolved in this session)

- Embedding model for NSE Filings RAG
- Buy-timing chatbot responses: descriptive-only vs directional lean (deferred to RA/RI licensing discussion)
- Chart Analyzer — not yet spec'd at all
