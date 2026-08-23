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
