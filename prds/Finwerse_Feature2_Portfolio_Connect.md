# FINWERSE — FEATURE 2: PORTFOLIO CONNECT
PRD + Technical Requirements (Enriched)

---

## 1. PURPOSE

Let a user record their equity holdings in Finwerse so every other portfolio-dependent feature (Portfolio Health, Impulse Analyzer, Alerts portfolio-mode, Chatbot portfolio queries, Sentiment Feed default view) has real data to work against.

## 2. FULL RESEARCH BACKGROUND — WHY MANUAL ENTRY

Every automated option was researched in depth before landing on manual entry. Full findings, not just the conclusion:

### 2.1 Account Aggregator (AA) framework
The only regulated rail that can deliver both holdings AND full dated transaction history across all brokers, via CDSL/NSDL as the underlying Financial Information Provider. CDSL enabled Equities and Mutual Fund FI types in April 2023. Data available to an FIU: Profile (name, PAN, demat number), Summary (ISIN-wise current holdings), Transactions (dated transaction history for the requested period).

**Why Finwerse can't use it directly:** only entities regulated by RBI, SEBI, IRDAI, or PFRDA can become an FIU. A TSP (Setu, Finarkein, Perfios, Finvu) can front the technical integration but does not remove the licensing requirement — Finwerse still needs to either obtain SEBI RIA registration itself or partner with an already-regulated FIU.

**Cost/timeline (industry-reported, not official tariff):** ₹5-25 lakh+ setup, 5-10 months for a regulated entity to go live, IS audits every 2 years. Per-fetch pricing: single-digit to tens of rupees per consent fulfilled, or subscription models in the lakhs/month at volume.

**Known limitation even once licensed:** demat transaction history via AA is reportedly capped at roughly 2 years, and joint accounts are excluded.

**Confirmed real-world precedent:** Groww's own "Stocks Track" feature — which lets Groww users link external demat accounts from OTHER brokers — is explicitly built on the AA framework. This proves AA is the production-grade sanctioned method, but Groww can use it because Groww is itself a regulated broker.

### 2.2 Broker official APIs
- **Zerodha Kite Connect:** Free tier gives holdings/positions (`holdings()`, `positions()`) since March 2025. Paid tier (₹500/month, reduced from ₹2000) adds market/historical data. `trades()` endpoint exists but **only returns the current day's trades** — a multi-year tradebook requires separate Console CSV exports, not one API call. **Critical restriction:** Kite is single-user by default; multi-user access for a platform serving many end-users requires explicit Zerodha compliance approval (granted historically only to exchange-approved platforms like smallcase, Streak, Sensibull). Redistribution is explicitly restricted per Kite's own FAQ: "Displaying or redistributing Kite Connect API data on external platforms violates exchange data vending policies."
- **Angel One SmartAPI:** Free. Holdings, positions, orderbook, and a `getTrades()` tradebook endpoint. No redistribution restriction flagged in research to the same degree as Zerodha.
- **Groww API ("915 by Groww"):** ₹499/month flat fee, paid by the END USER (not Finwerse), covers all trading APIs including portfolio/positions. This is currently the only official first-party programmatic route into Groww, the #1 broker by market share (28.7% as of mid-2026 data). But user-paid pricing at algo-trader levels is heavy friction for a mainstream retail product.
- **Upstox, Dhan, 5Paisa:** broadly free/low-cost, hold + order/trade endpoints available.

**Structural problem across all broker APIs:** N separate integrations to build and maintain, inconsistent redistribution terms, and several require the end user to pay a subscription just to enable API access — friction that undermines the "manual entry is simpler for the user" goal this feature is meant to solve.

### 2.3 CAS (Consolidated Account Statement) parsing
Every investor gets a monthly CAS emailed by CDSL or NSDL — and critically, **one CDSL/NSDL CAS is cross-depository**, meaning it covers the user's ENTIRE demat portfolio across every broker under one PAN, sidestepping the need for per-broker integration entirely. Open-source `casparser` Python library parses these PDFs for free. Commercial `CASParser.in` (₹999/month entry tier) adds Gmail OAuth import, CDSL OTP live-holdings fetch (bypasses the monthly-only cadence), and a white-label upload SDK.

**Limitation:** demat CAS transaction detail is weaker than a broker tradebook — reflects depository debits/credits rather than clean buy-price/sell-price trade legs, so average buy price / realized gains reconstruction from CAS alone is imperfect.

**Status:** flagged as the strongest available near-term automation path, not built in this pass, but the clear next step once resourced.

### 2.4 Tradebook / contract note CSV upload
Zerodha Console tradebook exports contain per-trade rows with exact buy/sell dates and prices — the cleanest possible source for exactly the fields Finwerse wants. High friction (manual download + upload) but zero legal risk, zero ongoing cost. Best positioned as a power-user supplement once built, not the primary flow.

### 2.5 smallcase Gateway — confirmed via actual vendor contact
Direct reply from smallcase's Gateway team (real email, not third-party research) confirmed: the **Broker Holdings Import module** gives current holdings including **average buy price**, across **11 of India's top brokers** — better than public docs suggested (which implied snapshot-only with no average price). But it is explicitly, in the vendor's own words, still a **snapshot** — no trade dates, no sell prices, no closed-position history.

Which 11 brokers, whether Groww is one of them, and exact pricing were all asked directly in a follow-up email — **answer still pending as of last check.**

**Verdict even if Groww is confirmed:** still fails the core trade-history requirement. At best becomes a future "holdings display polish" layer sitting alongside CAS/tradebook for actual trade history — not a replacement for either.

### 2.6 MCP-based approaches — ruled out
Both the official Zerodha Kite MCP server (`mcp.kite.trade`) and unofficial community MCP servers (Groww, INDmoney scrapers) were evaluated. Official Zerodha MCP is legitimate but architecturally wrong — built for a single person's own AI assistant (Claude Desktop, Cursor) in one local session, not a multi-tenant backend serving thousands of Finwerse users simultaneously. Unofficial community MCP servers use Playwright browser automation requiring the user's live login/OTP — explicitly stated by their own maintainers to violate broker ToS ("intended for personal use only"), and fragile (breaks when broker UIs change).

**How INDmoney actually does it (researched as the closest comparable competitor):** INDmoney is ITSELF a regulated broker, which is what qualifies it to be an AA FIU directly — this is INDmoney's real moat, not a clever technical workaround Finwerse is missing. Even so, INDmoney's own external-broker holdings display shows known gaps — average buy price frequently shows "unknown" for externally-linked accounts, confirming that even AA-based demat data is often holdings-only or partial-transaction, not a clean tradebook. This directly validates why full automated trade-history import is a genuinely hard problem industry-wide, not something Finwerse is failing to find a shortcut for.

## 3. DECISION

**Manual entry for V1.** CAS parsing (Section 2.3) is the clearest scale-path option once resourced. Account Aggregator (Section 2.1) remains the long-term target once RIA registration or an FIU partnership exists.

## 4. USER FLOW

1. User opens Portfolio Connect (empty state if no holdings yet).
2. Taps "Add Stock."
3. Types stock name or symbol — same fuzzy-search dropdown already built for Dashboard search, resolves to a canonical NSE symbol.
4. Enters: quantity, average price, purchase date, intended holding period (Short/Medium/Long).
5. Position saved, appears in the portfolio list with status = Held.
6. User can edit or delete any position at any time.
7. User can record a sell against a Held position — full quantity sold marks it Sold; partial quantity sold splits it into two new independent rows (Section 6).

## 5. DATA MODEL

**Table: `portfolio_holdings`**

| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| user_id | uuid | foreign key to users |
| stock_symbol | text | canonical NSE symbol, resolved via existing symbol_mapping table |
| quantity | integer | |
| avg_price | decimal | |
| purchase_date | date | |
| intended_holding_period | text | short / medium / long |
| status | text | held / sold |
| sold_quantity | integer | nullable, only populated for sold rows |
| sold_date | date | nullable |
| sold_price | decimal | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

No `parent_holding_id` or any linkage field — confirmed deliberately, see Section 6.

## 6. HELD / SOLD SPLIT LOGIC

- User bought quantity Q at avg_price P.
- User records a sell:
  - If sell quantity = full original Q → the existing row's status flips to Sold, sold_quantity/sold_date/sold_price populated on that same row. No new row created.
  - If sell quantity < Q (partial) → the original row is closed out and **replaced by two brand new independent rows**, each with a fresh id:
    - Row A: quantity = sold amount, status = Sold, sold_date/sold_price populated, avg_price = original avg_price (unchanged)
    - Row B: quantity = remaining amount, status = Held, avg_price = original avg_price (unchanged)
  - Rows A and B carry **no reference to each other or to the original row**. Fully independent from the moment of creation. Editing one has zero effect on the other.

## 7. EDITING RULES

- Any position (Held or Sold) can be edited or deleted independently.
- Editing a position affects Portfolio Health and all downstream calculations **only from that point forward** — no retroactive recomputation of historical Portfolio Health snapshots.

## 8. EDGE CASES

| Scenario | Handling |
|---|---|
| Stock becomes delisted/suspended after being added | Show "Not Available" for its score, same pattern as Dashboard's unscored-stock case. Assessed as a very rare event — no special-case logic beyond this. |
| User tries to sell more than currently held quantity | Reject with an error. |
| User deletes a Held row that resulted from an earlier split | No cascading effect on its sibling Sold row — they are independent. |

## 9. API ENDPOINTS (proposed)

- `POST /portfolio/holdings` — add a new position
- `GET /portfolio/holdings` — list all positions for the user (filterable by status)
- `PATCH /portfolio/holdings/{id}` — edit a position
- `DELETE /portfolio/holdings/{id}` — delete a position
- `POST /portfolio/holdings/{id}/sell` — record a sell; backend handles full-vs-partial split server-side per Section 6

## 10. UX / PSYCHOLOGY APPLICATION

**Add Stock flow — Hick's Law + Miller's Law:** the flow has exactly 4 required inputs (symbol, quantity, avg price, date) plus 1 optional-feeling but required field (holding period). Keep this as one continuous short form, not a multi-step wizard — 4-5 fields is well within working memory, splitting it into steps adds unnecessary decision points per Hick's Law.

**Symbol search dropdown — Jakob's Law:** users already know how stock-symbol autocomplete behaves from every other finance app (Dashboard search, broker apps, Google Finance). Do not reinvent this interaction — match the existing pattern exactly, including the Dashboard's own search dropdown component, for zero relearning cost.

**Held/Sold toggle and edit/delete controls — Fitts's Law:** these are frequent, high-consequence actions (deleting a position, recording a sell) on a list screen. Tap targets need to be large enough to hit reliably on mobile, and destructive actions (delete) should require a confirmation step to guard against Fitts's-Law-driven mis-taps on a dense list.

**Partial-sell split behavior — Postel's Law (be liberal in what you accept):** the user should be able to enter a sell quantity in whatever way is natural to them (typing the number, or eventually a slider/stepper) without the system being rigid about exact match against the held quantity — validate and guide, but don't block on minor input friction. The system's internal handling (splitting into two clean rows) should be invisible complexity — the user experiences "I sold some shares," not "the system created two independent database rows."

**Empty state — Goal-Gradient Effect:** an empty Portfolio Connect screen should visibly signal how close the user is to a working Portfolio Health view (e.g., "Add your first stock to unlock Portfolio Health") rather than a blank list — motivation increases as perceived distance to a goal shrinks.

## 11. DEPENDENCIES

Reuses the existing stock symbol search/dropdown component and `symbol_mapping` table from the Dashboard feature. Is itself a prerequisite for: Portfolio Health, Impulse Analyzer, Alerts (portfolio-only type), Chatbot (portfolio-scoped queries), Sentiment Feed (default portfolio view).

## 12. OUT OF SCOPE FOR THIS BUILD

Broker auto-sync of any kind (API, AA, CAS parsing, tradebook upload) — none built in this pass. Manual entry only.
