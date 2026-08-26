# Capability: Stock Analytics Dashboard

## What It Does
Lets a user search or browse any tracked NSE stock and see its four precomputed scores (Overall/Technical/Safety/Sentiment) across three holding-period timeframes, with a top-10 ranked view per score type/timeframe/market-cap category.

## Inputs
| Input | Type | Source | Required |
|---|---|---|---|
| score_type | enum (`overall`\|`technical`\|`safety`\|`sentiment`) | user selection | yes (top list) |
| timeframe | enum (`short`\|`medium`\|`long`) | user selection (global toggle) | yes |
| search query | string | user typing | yes (search) |
| symbol | string | user selection / stock detail navigation | yes (detail view) |

## Outputs
| Output | Type | Destination |
|---|---|---|
| Ranked stock list (symbol, score, sector) | list | Discover screen |
| Full score breakdown for one stock | object | StockDetail screen |
| AI Summary handoff | chat pre-load | opens Ask AI Chatbot with the stock's context pre-loaded |

## External Calls
| System | Operation | On Failure |
|---|---|---|
| `stock_scores` table | read | 400/404 per `spec/api.md` `/stocks/*` |

## Business Rules
- No live price / day-change shown on dashboard or search dropdown (V1 scope decision, deliberate)
- Scores are read-only, never computed live — precomputed daily batch is the only writer
- Same -100..+100 scale and Red<40/Amber41-65/Green66-100 color bands apply everywhere this data is shown

## Success Criteria
- [x] `GET /stocks/top` returns a valid ranked list for every score_type × timeframe combination
- [x] `GET /stocks/search` returns matches for partial symbol queries (min 2 chars)
- [x] `GET /stocks/{symbol}/score` returns all 4 scores for the requested timeframe or 404s cleanly
- [ ] AI Summary icon on StockDetail correctly pre-loads chatbot context (not verified during this migration — confirm against `apps/web`/`apps/mobile` UI code)

## Known Gaps / Future Work (mobile Stock Detail redesign, 2026-08-25; stub sections removed 2026-08-26)

`apps/mobile`'s Stock Detail screen (`spec/ui.md` → "Screen: Stock Detail") was redesigned presentation-only against the existing `GET /stocks/{symbol}/score` response. Three sections were spec'd 2026-08-25 as honest "coming soon" visual stubs; the user rejected that treatment and, as of 2026-08-26, the spec removes all three sections entirely instead — no placeholder copy or disabled controls render anywhere on the screen today. The three ideas below remain real, tracked future work — each would need real data/wiring before it could be added back as an actual (not stubbed) feature:

- **Price + interactive chart** — no OHLCV/price-history endpoint exists anywhere in `spec/api.md`; would need a new data source (market data provider) and endpoint, plus a batch or on-demand ingestion decision, before this can render real data. Not scoped as part of this redesign pass.
- **Signal drivers** (Momentum / Trend strength / Volume confirmation / Financial safety, per-driver evidence) — no per-driver breakdown is currently computed or stored anywhere in `spec/data.md`'s score tables; would need new batch-computed fields, not a live computation (per Standing Platform Rule 5), before this can show real values.
- **"More on this stock" disclosure rows** (Fundamentals, Earnings & financials, News & sentiment, Peer comparison, Score history) — News & sentiment could plausibly reuse the existing Sentiment Feed data (`spec/api.md` `/sentiment-feed/search`); Score history could plausibly reuse `StockHistoricalScore` (`spec/data.md`); Fundamentals, Earnings & financials, and Peer comparison have no backing data source today. Each row needs its own scoping pass before being un-stubbed — do not assume they're all the same size of work.
- **Favorite/watch toggle** — currently session-local component state only; no `Watchlist` table or endpoint exists in `spec/data.md`/`spec/api.md`. A persisted, cross-device watchlist would be a new capability (new table + endpoints), not a small addition to this one.
