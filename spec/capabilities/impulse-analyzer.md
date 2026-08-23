# Capability: Impulse Analyzer

## What It Does
Quantifies the rupee cost of a user's emotionally-driven ("impulse") trades by comparing the actual buy/sell timing of losing trades against the nearest date where the technical score would have been "right," and reporting the avoidable cost. Available both against the user's real sold portfolio history (`/analyzer/impulse`) and against arbitrary hypothetical trades a visitor submits (`/analyzer/custom-impulse`).

## Inputs
| Input | Type | Source | Required |
|---|---|---|---|
| (impulse) authenticated user's sold holdings | — | `portfolio_holdings` where `status='sold'` | — |
| (custom-impulse) trades: stock_symbol, buy_price, buy_date, sell_price, sell_date, quantity, intended_holding_period? | list of objects | user submission | yes |

## Outputs
| Output | Type | Destination |
|---|---|---|
| total_cost | number | sum of rupee cost across all flagged impulse trades |
| monthly_costs | map (YYYY-MM → cost) | aggregated by sell month |
| trades | list, sorted by rupee_cost descending | per-trade actual vs. counterfactual breakdown |

## External Calls
| System | Operation | On Failure |
|---|---|---|
| `stock_historical_scores` table | dated score lookup at buy/sell date and nearest qualifying date | trade skipped (returned as `None`) if historical data is missing for either date |
| `stock_candles` table | price lookup on the nearest qualifying date, for counterfactual profit calculation | counterfactual falls back to using the actual date's price if no candle found |

## Business Rules
- Only losing trades are analyzed — profitable trades are automatically Not Impulse with no further processing
- Timeframe bucket is derived from actual days held, not the user's stated `intended_holding_period`: <30 days = short, <180 days = medium, else long
- Good buy = technical score ≥80 (for the trade's bucket) at time of buy; good sell = technical score ≤-80 at time of sell — fixed absolute bands, not percentile-relative
- Buy-right + sell-right → always Not Impulse, no further analysis
- For the 3 "wrong" combinations: find the nearest date (before OR after the actual trade date, no lookback/lookforward window limit) where the wrong side's score would have been right; recompute the trade outcome using the corrected date(s) and price(s), holding capital deployed constant
- Impulse Trade flag = counterfactual profit is greater than actual profit (`rupee_diff > 0`); otherwise Not Impulse
- Requires `stock_historical_scores` to be dated, append-only history — shared infrastructure requirement with the chatbot's (currently unbuilt) backtest tool, see `spec/capabilities/ask-ai-chatbot.md`

## Known Gap (found during this spec migration)
`/analyzer/custom-impulse` is **unauthenticated** — unlike every other portfolio-adjacent endpoint in the product, it accepts arbitrary trade data from any caller with no `auth.get_current_user` dependency. This endpoint does not appear in the original PRD at all. Confirm whether public/anonymous access is intentional (e.g. a "try it without an account" demo path) before treating this as correct.

## Success Criteria
- [x] A losing trade with buy-right+sell-right is classified Not Impulse with no counterfactual computed
- [x] Counterfactual profit is computed at the same capital deployed as the actual trade, not the same share quantity
- [x] A trade missing historical score data at either date is excluded from analysis, not defaulted to a guess
- [ ] Whether `/analyzer/custom-impulse`'s lack of auth is intentional — unresolved, see Known Gap
