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
