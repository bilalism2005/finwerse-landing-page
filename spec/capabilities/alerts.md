# Capability: Alerts

## What It Does
Lets a user set score-threshold alerts (universe-wide, specific-stock, or portfolio-only), fires each one exactly once when its threshold condition is first met, and delivers via Expo push notification plus an in-app history view.

## Inputs
| Input | Type | Source | Required |
|---|---|---|---|
| alert_type | enum (`universe_wide`\|`specific_stock`\|`portfolio_only`) | user entry | yes |
| stock_symbol | string | user entry | required only for `specific_stock` |
| score_type | enum (`overall`\|`technical`\|`safety`\|`sentiment`) | user entry | yes |
| timeframe | enum (`short`\|`medium`\|`long`) | user entry | yes |
| threshold_value | number | user entry | yes |
| direction | enum (`above`\|`below`) | user entry | yes |
| expo_push_token | string | device registration (mobile) | yes (for delivery) |

## Outputs
| Output | Type | Destination |
|---|---|---|
| Alert record | object | `alerts` table |
| Triggered alert history | list | Alerts page (visible for 5 days from trigger date, then hidden — not deleted) |
| Expo push notification | HTTP POST | `exp.host/--/api/v2/push/send` |

## External Calls
| System | Operation | On Failure |
|---|---|---|
| `alerts`, `stock_scores`, `portfolio_holdings`, `user_devices` tables | batch read/write | — |
| Expo Push API | notification delivery | Logged and swallowed — **the alert is still marked `triggered` in the DB even if the push notification itself fails to send**, so a delivery failure is currently silent to the user (no retry, no user-visible indicator) |

## Business Rules
- Multiple alerts allowed on the same stock simultaneously
- Fires exactly once when the threshold condition is first met — never re-evaluated or re-fired after that; watching the same condition again requires creating a new alert
- Triggered alerts remain on the Alerts page for exactly 5 days from the trigger date, then hidden from the active view (not deleted from the DB — hidden only)
- Runs as a batch step immediately after the daily scoring cron completes, since it depends on that day's freshly written scores. Universe-wide alerts scan all active alerts against the full tracked universe (~1800 stocks); portfolio-only alerts join against `portfolio_holdings` (Held status) first
- `triggered_symbol` stores at most the first 3 matching symbols (comma-joined, `"..."` suffix if more) for a universe-wide alert that matches multiple stocks

## Success Criteria
- [x] Each alert type's matching logic correctly scopes to universe / one stock / the user's held portfolio (verified against `alerts_processor.py`)
- [x] A triggered alert is never re-evaluated on subsequent runs (`status == 'active'` filter excludes it)
- [x] `GET /alerts` returns active + last-5-days-triggered alerts, ordered active-first
- [ ] Push delivery failure surfaces to the user in some way — **currently does not**; flag as a candidate fix, not verified as intentional
