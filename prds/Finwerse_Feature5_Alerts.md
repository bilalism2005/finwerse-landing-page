# FINWERSE — FEATURE 5: ALERTS
PRD + Technical Requirements (Enriched)

---

## 1. PURPOSE

Let a user set a condition on a score and get notified once it's met, without needing to check the Dashboard manually.

## 2. USE CASES (all three supported)

1. **Universe-wide** — any stock, any score type (Overall/Technical/Safety/Sentiment), any timeframe, crossing above or below a threshold. Not pinned to a stock — scans the full ~1800-stock universe.
2. **Specific stock** — identical mechanics, pinned to one named stock.
3. **Portfolio-only** — any currently Held stock crossing above/below a chosen score type/timeframe.

Multiple simultaneous alerts on the same stock allowed (e.g. "above 80" and "below -60" active at once on the same stock).

## 3. TRIGGER AND LIFECYCLE LOGIC

- Fires **exactly once**, the first time its condition is met.
- Once triggered, permanently done — never re-evaluated or re-fired, even if the score later crosses back and re-crosses. User must create a new alert to watch the same condition again.
- Triggered alert shows on the Alerts page, with the date it fired, for **5 days**.
- After 5 days: hidden from the active/visible Alerts page view. Not deleted from the database — history retained, just not surfaced in the default view.

## 4. DATA MODEL

**Table: `alerts`**

| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| user_id | uuid | |
| alert_type | text | universe_wide / specific_stock / portfolio_only |
| stock_symbol | text | nullable — only for specific_stock type |
| score_type | text | overall / technical / safety / sentiment |
| timeframe | text | short / medium / long |
| threshold_value | numeric | |
| direction | text | above / below |
| status | text | active / triggered |
| triggered_date | date | nullable until fired |
| created_at | timestamp | |

No separate history table needed — since each alert fires at most once ever, `triggered_date` on the row itself is sufficient.

## 5. EXECUTION LOGIC

Runs as a batch step **immediately after** the daily 3:45 PM scoring cron completes.

**Universe-wide:** for each active alert of this type, check all ~1800 stocks' scores against the threshold + direction. Any match → mark triggered with today's date, capture which stock(s) matched for display.

**Specific-stock:** direct lookup against that one stock's score.

**Portfolio-only:** join active alerts against `portfolio_holdings` (Held status only) — same join pattern as Portfolio Health — then check each held stock's score.

**Expiry sweep:** part of the same daily batch — exclude any triggered alert where `today - triggered_date > 5 days` from the active Alerts page query. View-filtering, not a delete.

## 6. DELIVERY

Expo push notification at the moment of trigger (within the daily batch window). In-app Alerts page shows currently-visible triggered alerts.

## 7. API ENDPOINTS (proposed)

- `POST /alerts` — create
- `GET /alerts` — list active + still-visible-triggered alerts
- `DELETE /alerts/{id}` — cancel before triggering

## 8. UX / PSYCHOLOGY APPLICATION

**Alert creation form — Hick's Law:** four decisions (score type, timeframe, threshold, direction) plus optionally a stock — present as a compact single form, not a sequential wizard, to keep the number of decision-stages low.

**Multiple alerts on one stock — Miller's Law:** if a user has several active alerts on the same stock, group them visually together under that stock rather than as a flat interleaved list, so the working-memory load of tracking "what am I watching on this stock" stays low.

**Triggered alert notification — Peak-End Rule:** the push notification and the in-app alert card should both end on the clearest, most useful piece of information (the actual score value and what threshold it crossed) as the last thing read, since that's what the user will remember about the alert firing correctly.

**5-day visibility window disappearing — Zeigarnik Effect used deliberately in reverse:** unlike features that want to keep an open loop alive, a fired alert is a CLOSED loop — letting it fade from view after 5 days (rather than sitting indefinitely) avoids artificially prolonging attention on a decision that's already been made, which fits a low-time user's need to not accumulate mental clutter.

**One-time-only trigger and permanent closure — Doherty Threshold / trust:** because the system will never silently re-fire or behave inconsistently, the user can trust that once dismissed/expired, an alert is truly done — this predictability itself is a trust-building design choice consistent with this user's stated trust constraint from the Portfolio Health persona work.

## 9. DEPENDENCIES

Depends on the daily `stock_scores` batch write completing first. Portfolio-only alert type depends on Feature 2 for the `portfolio_holdings` join.

## 10. OUT OF SCOPE

Re-triggering of any kind. Custom holding periods outside the three standard buckets. Price-based alerts (score-based only, not discussed/requested).
