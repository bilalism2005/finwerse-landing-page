# FINWERSE — FEATURE 3: PORTFOLIO HEALTH
PRD + Technical Requirements (Enriched)

---

## 1. PURPOSE

Answer the two questions a 35+, low-time, low-trust investor actually has about their existing holdings: "which stock should I hold vs sell" and "am I safe with respect to diversification." Built directly on top of Feature 2's manually-entered `portfolio_holdings` data.

## 2. TARGET USER CONTEXT

Age 35+. Aim: build long-term wealth. Constraints: lack of knowledge, time scarcity, trust. JTBD: build wealth without learning too much, with minimal time invested, in a data-validated way. This is the design filter for every decision in this feature — say less, mean more.

**Comparable-app research that shaped this design:** Tickertape's Diversification Score benchmarks the user against a community average (e.g. "your score is 58, community average is 67") and drives it off sector + market-cap spread with a visual flow chart. Institutional risk tools typically formalize concentration via HHI directly. A key research finding: "false diversification" — holding many stocks that are actually correlated (same sector/theme) feels diversified but crashes together; a raw stock count doesn't catch this, sector-weighted HHI does.

**Deliberately excluded even though comparable apps have them:** community benchmarking (adds comparison anxiety without adding a decision), raw HHI/correlation-matrix displays (too much homework for this user), rebalancing simulator (edges toward advice/RA licensing territory).

## 3. SCREEN LAYOUT

1. Global holding-period toggle (Short/Medium/Long) at the top — drives every score on this screen.
2. Portfolio Overall Score — single blended number, color banded.
3. Green/Red split scores — shown alongside the blended Overall Score, not replacing it.
4. Technical / Safety / Sentiment aggregates — same weighted-average pattern as Overall.
5. Diversification section — two pie charts (actual vs ideal) plus one plain-language sentence. No raw score/HHI number surfaced.
6. Bottleneck — tappable AI-report trigger.
7. Holdings list — every Held position with its own current score at the globally selected holding period.

## 4. GLOBAL TIMEFRAME BEHAVIOR

The holding-period toggle **overrides** each position's own individually-saved `intended_holding_period` from Feature 2. Every stock is re-scored as if held at whichever period is currently selected — it does NOT respect each position's own stated intent on this screen. Confirmed as a deliberate consistency choice, even though each position's own intended period is still stored and used elsewhere (e.g. as the default when opening the individual stock screen from a portfolio row).

## 5. WEIGHTED SCORE CALCULATIONS

**Weight per holding:**
```
weight_i = invested_value_i / total_invested_value_of_held_positions
invested_value_i = quantity_i × avg_price_i
```
Only Held-status rows participate. Sold rows are entirely excluded.

**Portfolio-level scores:**
```
Portfolio Overall Score    = Σ (Stock_i Overall Score at selected timeframe × weight_i)
Portfolio Technical Score  = Σ (Stock_i Technical Score at selected timeframe × weight_i)
Portfolio Safety Score     = Σ (Stock_i Safety Score at selected timeframe × weight_i)
Portfolio Sentiment Score  = Σ (Stock_i Sentiment Score at selected timeframe × weight_i)
```

**Sentiment "Not Available" handling:** excluded from the Sentiment weighted-average only, no penalty applied, remaining weights not artificially rescaled to compensate. Confirmed explicitly.

**Green/Red split scores:**
```
Green Score = Σ (Stock_i Overall Score × weight_i) — over positive-Overall-Score stocks only, weights re-normalized within that subset
Red Score   = Σ (Stock_i Overall Score × weight_i) — over negative-Overall-Score stocks only, weights re-normalized within that subset
```
Shown alongside, not instead of, the single blended Overall Score.

## 6. DIVERSIFICATION SCORE — FULL DERIVATION

**Sector aggregation (not per-stock):** two or more holdings in the same sector are summed together before computing weights — e.g. ₹10,000 Stock A (Banking) + ₹10,000 Stock B (Banking) + ₹10,000 Stock C (IT) becomes Banking ₹20,000 / IT ₹10,000, not three separate 33% weights. Sector tag reused directly from the existing stock master data (same field already shown on Dashboard stock cards).

**Formula:**
```
sector_weight_i = sector_total_invested_value_i / portfolio_total_invested_value
HHI = Σ (sector_weight_i²)

Diversification Score = 100 × (1 - (HHI - HHI_ideal) / (HHI_worst - HHI_ideal))
  HHI_ideal = 0.10   (10 equally-weighted sectors, the reference "ideal")
  HHI_worst = 1.0    (100% concentration in one sector)
  clipped to [0, 100]
```

**Research basis for the thresholds:** HHI is the same formula the US DOJ uses for antitrust market-concentration review, repurposed for portfolios. Practitioner rules-of-thumb converged on roughly 10-15% per-sector as conservative, 20-25% as a common "reasonable" ceiling, 30%+ as concentrated — informed the choice of HHI_ideal (10 sectors ≈ 10% each) as the reference "ideal" rather than an arbitrarily looser standard.

**Worked examples (validated during design):**
- 2 stocks, 60%/40% → HHI = 0.36+0.16 = 0.52 → Score ≈ 53
- 10 stocks, 10% each, different sectors → HHI = 0.10 = HHI_ideal → Score = 100
- 100% one sector → HHI = 1.0 = HHI_worst → Score = 0
- 3 stocks, ₹10k each, 2 in Banking + 1 in IT → sector weights 0.667/0.333 → HHI = 0.556 → Score ≈ 49 (correctly flags "false diversification" — looks spread across 3 names but is 2/3 concentrated in one sector)

**Display:** two pie charts — left = actual sector weight breakdown, right = ideal reference (evenly split across ~8-10 sectors at ~10-12% each). Below both: one auto-generated sentence reading off the same `sector_weight_i` array, e.g. "A well-diversified portfolio keeps each sector around 10-12%. Your largest sector concentration is 60% in Banking, well above that." No raw HHI number or 0-100 digit shown — visual + sentence carries the information deliberately.

## 7. BOTTLENECK — AI REPORT

Not a passive flagged stock. A tappable AI-call trigger. User taps it, backend assembles full portfolio context (every held stock: symbol, current scores at the selected timeframe, invested value, weight), sends to the LLM, returns a stock-by-stock plain-language report identifying dead-weight holdings and a condition read per stock.

**Explicitly permitted here, as a deliberate single exception to the platform-wide never-say-buy/sell rule:** this report can use hold/sell framing directly. Applies only to this specific report, nowhere else in the app.

Reuses the same "structured data → LLM synthesis → plain conclusion" architecture pattern as the Chatbot's score-explanation tool and the Dashboard's individual-stock AI Summary icon.

## 8. DATA FLOW / ARCHITECTURE

No new external data pipeline. Pure read/aggregation layer on top of `portfolio_holdings` (Feature 2) and `stock_scores` (Dashboard scoring engine). Computation happens server-side on each screen load — no live external API calls.

## 9. API ENDPOINTS (proposed)

- `GET /portfolio/health?timeframe={short|medium|long}` — portfolio-level scores, Green/Red split, diversification data + sentence, per-stock list
- `POST /portfolio/bottleneck-report` — triggers the AI-generated bottleneck report on demand (generated at request time, not part of the daily batch, since it's user-initiated)

## 10. UX / PSYCHOLOGY APPLICATION

**Overall Score placement — Von Restorff Effect + Aesthetic-Usability Effect:** the single blended Overall Score should be the most visually distinct element on the screen (size, color weight) so it stands apart from the surrounding sub-scores — the one number this low-time user needs to register in a glance. A clean, well-designed presentation of it also increases perceived trustworthiness of the underlying data (Aesthetic-Usability Effect), which matters directly for this user's stated "trust" constraint.

**Diversification pie charts — Gestalt Similarity + Proximity:** color-code matching sectors identically between the "yours" and "ideal" pies so the user's eye groups them automatically without needing a legend lookup; place both pies close together (Proximity) so the comparison reads as one visual unit, not two separate charts to mentally reconcile.

**Sector concentration sentence over raw HHI — Occam's Razor / Pareto principle applied to information design:** deliberately show the single sentence that carries 80% of the decision-relevant meaning ("60% is in Banking") rather than the full HHI computation — this is the simplest explanation sufficient for the user's actual decision, per the same logic Occam's Razor applies to explanations generally.

**Bottleneck AI report trigger — Zeigarnik Effect + Peak-End Rule:** framing the trigger as "see what's holding your portfolio back" creates an open loop (Zeigarnik) that motivates the tap; the report itself should end on a clear, actionable closing line per stock (Peak-End) rather than trailing off, since the end of the report disproportionately shapes how the user remembers the whole interaction.

**Holdings list ordering — Serial Position Effect:** if the list can be sorted, defaulting to worst-score-first (rather than alphabetical or by value) puts the most actionable information in the primary position a user reads and best remembers, aligning with the "which stock needs attention" JTBD directly.

**Global timeframe toggle behavior — Postel's Law:** be liberal in switching — recalculating instantly and consistently across every element on screen (scores, pies, list) with no partial-refresh states, so the toggle never leaves the screen in a visually inconsistent in-between state.

## 11. EDGE CASES

| Scenario | Handling |
|---|---|
| Zero Held positions | Empty state directing user to Portfolio Connect |
| A held stock is delisted/unscored | Shows "Not Available," excluded from weighted calculations, no-penalty principle |
| All holdings in one sector | Diversification Score = 0, single-color left pie, sentence flags concentration directly |

## 12. DEPENDENCIES

Depends entirely on Feature 2 for its data. Feeds the Chatbot's portfolio-access tool and Alerts' portfolio-only alert type via the same `portfolio_holdings` table and Held-status join pattern.
