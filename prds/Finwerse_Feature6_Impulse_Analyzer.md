# FINWERSE — FEATURE 6: IMPULSE ANALYZER
PRD + Technical Requirements (Enriched)

---

## 1. PURPOSE

Show the user, in rupee terms, the cost of emotionally-driven trading decisions — trades made against what the score data was saying at the time. This directly traces back to the founder's own motivation for building Finwerse: talking to 20+ retail traders and finding the recurring pattern of unverified, emotional decision-making with no way to measure its actual cost — including one specific conversation with a trader who had lost ₹40,000 in a month from revenge trading and only discovered it by manually calculating at month's end. This feature exists to make that calculation automatic.

## 2. SCOPE

Only **losing trades** are analyzed. A trade is a matched buy + sell pair on the same stock (from `portfolio_holdings`, using Sold-status rows and their `sold_date`/`sold_price` against the original `purchase_date`/`avg_price`). Profitable trades auto-classified **Not Impulse**, no further processing.

## 3. RIGHT / WRONG SCORE THRESHOLDS (fixed absolute bands, not percentile-relative)

Using the **Overall Score**, at the timeframe bucket matching the trade's actual holding duration:

- **Good buy** = Overall Score **80 to 100** on the buy date. Below 80 = wrong.
- **Good sell** = Overall Score **-80 to -100** on the sell date. Above -80 = wrong.

Only two thresholds in the system. No gradient — a buy/sell is either right or wrong.

## 4. CLASSIFICATION — 4 COMBINATIONS

1. **Buy right + Sell right** → always **Not Impulse**, no further analysis. A well-timed trade that lost for other reasons (market-wide moves, black swan events), not a behavioral issue.
2. **Buy wrong + Sell wrong**
3. **Buy right + Sell wrong**
4. **Buy wrong + Sell right**

Combinations 2-4 proceed to the counterfactual comparison.

## 5. COUNTERFACTUAL LOGIC

For whichever side was wrong:

1. Search for the **nearest date** — before or after the actual trade date, either direction — where that side's score would have met the "right" threshold.
2. **No maximum lookback or lookforward window** — confirmed explicitly. However far away, that's the date used.
3. Recompute the trade outcome using the corrected date(s) — actual price on the corrected date for the wrong side, actual date/price kept for whichever side was already right.
4. Compare corrected outcome to actual outcome:
   - Corrected version more profitable, or smaller loss → **Impulse Trade**. Show the counterfactual and the rupee difference.
   - Corrected version equal or worse → **Not Impulse**. No flag, no counterfactual shown.

## 6. WORKED EXAMPLE (illustrative)

Trade: bought at score 45 (wrong, below 80), sold at score -95 (right, within -80 to -100), resulted in a loss.
- Classification: Buy wrong + Sell right.
- System searches (no distance limit) for the nearest date this stock's score was 80+.
- Say it's 12 days before the actual buy — compute what the trade looks like buying at that date's price, keeping the actual sell date/price since sell was already right.
- If that counterfactual is profitable or less lossy than what actually happened → Impulse Trade, show the comparison.
- If not → Not Impulse.

## 7. INFRASTRUCTURE DEPENDENCY

Requires `stock_scores` stored as **dated history rows**, not overwritten daily — same requirement as the Chatbot's backtest tool (Feature 4). Shared infrastructure; whichever feature is built first establishes this storage pattern for both.

## 8. DATA MODEL

No new core table required beyond `portfolio_holdings` (Sold rows) and the historical `stock_scores` table. A derived/computed cache table (`impulse_analysis_results`) is reasonable for performance, avoiding recomputing the counterfactual search on every screen load — implementation detail, not a hard requirement.

## 9. UI SURFACE

At minimum: a list of Sold trades classified as Impulse, each showing actual outcome vs. counterfactual and the rupee difference. A monthly aggregate ("total impulse cost this month") was part of the original feature concept — carry forward as the intended direction, not re-confirmed in exact form during this technical pass.

## 10. UX / PSYCHOLOGY APPLICATION

**Impulse Trade flagging — Loss Aversion:** the core emotional mechanism this whole feature exploits productively. Showing "you lost ₹X more than you needed to" leverages loss aversion (losses are felt roughly twice as strongly as equivalent gains) far more effectively than showing a percentage or an abstract score — the rupee framing is deliberate and should stay literal, never abstracted into a percentage-only view.

**Counterfactual comparison display — Anchoring:** presenting the actual outcome and the "would-have-been" outcome side by side sets the corrected outcome as an anchor the user compares their real decision against — order matters; showing "what the data would have suggested" before or alongside "what you actually did" frames the actual outcome as the deviation, reinforcing the lesson more effectively than framing it the other way around.

**Monthly aggregate cost — Von Restorff Effect:** the single total-cost figure for the month should be the visually dominant number on this feature's summary view, distinct from the individual per-trade breakdowns below it, since this is the number designed to actually change future behavior.

**Not Impulse trades — deliberately de-emphasized:** trades that come back Not Impulse (buy+sell both right, or the counterfactual wasn't actually better) should not be presented with the same visual weight as Impulse-flagged trades — this feature's entire value is in isolating the signal (genuinely impulsive, avoidable losses) from the noise (ordinary bad luck), and the UI should reflect that asymmetry, consistent with Pareto-style prioritization of the few decisions that actually matter.

**Tone — avoiding shame while using loss framing:** loss aversion is being used to inform, not to punish. Language should stay descriptive and factual ("this trade cost you ₹X more than it needed to") rather than judgmental, to avoid triggering defensive disengagement from a feature meant to build better habits over time.

## 11. DEPENDENCIES

Depends on Feature 2 for trade data (Sold-status rows). Depends on `stock_scores` historical storage, shared with Feature 4's backtest tool.
