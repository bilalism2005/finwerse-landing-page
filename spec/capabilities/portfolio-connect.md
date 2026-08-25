# Capability: Portfolio Connect

## What It Does
Lets a user manually track their equity portfolio — add, edit, sell (fully or partially), and delete positions. No broker/CDSL-NSDL auto-sync (ruled out: requires SEBI RIA registration or a regulated FIU/Account Aggregator partner) — manual entry only for V1.

## Inputs
| Input | Type | Source | Required |
|---|---|---|---|
| stock_symbol | string | typed, resolved via the same symbol-search used on Dashboard | yes |
| quantity, avg_price, purchase_date | number/number/date | user entry | yes |
| intended_holding_period | enum (`short`\|`medium`\|`long`) | user entry | yes |
| sold_quantity, sold_price, sold_date | number/number/date | user entry (on sell) | yes (sell only) |

## Outputs
| Output | Type | Destination |
|---|---|---|
| Holding record | object | `portfolio_holdings` row, echoed to client |
| Sell result | 1 or 2 holding records | full sell → 1 row updated; partial sell → original row closed + 2 new rows (sold + remaining held) |

## External Calls
| System | Operation | On Failure |
|---|---|---|
| `symbol_mapping` table | validate stock_symbol exists | `400` "Invalid stock symbol" |
| `portfolio_holdings` table | CRUD | `404` if holding not found or not owned by caller |

## Business Rules
- Selling the full original quantity marks the position `sold`; a partial sell splits into two fully independent rows (no parent-child linkage) — both carry the original `avg_price` forward unchanged
- A split row is edited independently afterward — editing one never affects the other
- Edits affect Portfolio Health calculations only going forward from the edit point, not retroactively
- A delisted/suspended stock in a user's portfolio shows "Not Available" — same handling as Dashboard's unscored-stock case, no special logic
- Every holding is scoped to its owning `user_id` — no cross-user read/write path

## Success Criteria
- [x] `POST /portfolio/holdings` rejects an unmapped stock_symbol with `400`
- [x] `POST /portfolio/holdings/{id}/sell` correctly splits into 2 rows on a partial sell, both carrying the original avg_price
- [x] `POST /portfolio/holdings/{id}/sell` rejects `sold_quantity` greater than the held quantity with `400`
- [x] All holding endpoints scope to the authenticated `user_id` (verified: every query filters on `user_id`)

## Known Gaps / Future Work (mobile Portfolio redesign, 2026-08-25)

`apps/mobile`'s Portfolio screen (`spec/ui.md` → "Screen: Portfolio") was redesigned presentation-only against the existing CRUD endpoints above. Two design elements had no backing data and were removed rather than fabricated or stubbed:

- **Portfolio-value sparkline/trend chart** — no portfolio-value-history data exists anywhere; no table or endpoint tracks a portfolio's total value over time (`StockHistoricalScore`, `spec/data.md`, is per-stock technical score history, not a portfolio value series). Would need a new dated, append-only "portfolio value snapshot" table plus daily-batch computation before this could be real — not scoped as part of this redesign pass.
- **Per-holding score badge** — no per-holding score data is fetched on this screen today; showing one would require a new per-symbol `GET /stocks/{symbol}/score` call per row (N+1), which is new data-plumbing, not a restyle. Simplified out entirely rather than added mid-redesign; if this becomes a real requirement, it should be scoped as its own capability change (e.g. a batch-computed portfolio-holdings-with-scores endpoint).

A third design element (a mini health-gauge borrowed from the Health screen) was simplified to a single navigation link-out to the Health tab rather than duplicating that screen's `GET /portfolio/health` fetch here — a judgment call to avoid two screens independently fetching the same data, not a missing-data gap.
