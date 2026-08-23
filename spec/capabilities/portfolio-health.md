# Capability: Portfolio Health

## What It Does
Answers "which stock should I hold vs. sell" and "am I diversified" for a user's existing manually-entered portfolio — weighted score aggregation plus a sector-concentration diversification metric, with an optional LLM-generated narrative report naming the worst-performing holdings.

## Inputs
| Input | Type | Source | Required |
|---|---|---|---|
| timeframe | enum (`short`\|`medium`\|`long`) | global page toggle — **overrides** each position's own saved `intended_holding_period** | yes |

## Outputs
| Output | Type | Destination |
|---|---|---|
| Portfolio-level Overall/Technical/Safety/Sentiment scores | numbers | weighted by `invested_value_i / total_invested_value` across Held rows only |
| Green/Red split scores | numbers | weighted avg of only positive-scoring / only negative-scoring holdings |
| Diversification score | number (0-100) | sector-grouped HHI, see formula below |
| Sector breakdown + summary sentence | list + string | two pie charts (actual vs. ideal split) + one plain-language sentence; no raw HHI number shown to the user |
| Bottleneck Report | string | LLM narrative, user-triggered (tappable), not automatic |

## External Calls
| System | Operation | On Failure |
|---|---|---|
| `portfolio_holdings` (Held only) joined against `stock_scores` | read, request-time aggregation — no new pipeline | Empty portfolio → all-zero response, not an error |
| Groq (Bottleneck Report only) | LLM call, `openai/gpt-oss-120b` → `openai/gpt-oss-20b` fallback | `500` if both fail or `GROQ_API_KEY` unset |

## Business Rules
- Diversification formula (Herfindahl-Hirschman Index over sector-grouped invested value):
  ```
  sector_weight_i = sector_total_invested_value / portfolio_total_invested_value
  HHI = Σ(sector_weight_i²)
  Diversification Score = 100 × (1 - (HHI - 0.10) / (1.0 - 0.10)), clipped to 0-100
  ```
- A stock with no Sentiment data ("Not Available") is excluded from the Sentiment portion of the weighted average only — its absence does not penalize or drag down the other weights
- **Bottleneck Report is the one deliberate, single exception to the platform-wide never-say-buy/sell rule** — it is explicitly permitted to use hold/sell framing
- Holdings are sorted worst-to-best by overall score in the response (Serial Position Effect — worst issues seen first)

## Success Criteria
- [x] `GET /portfolio/health?timeframe=...` returns correct weighted scores excluding Sentiment-absent stocks from that one average only
- [x] Diversification score matches the documented HHI formula (verified against `compute_portfolio_health` in `routers/health.py`)
- [x] Empty portfolio returns an all-zero response, not a 4xx/5xx
- [x] Bottleneck Report is the only endpoint in the product whose system prompt explicitly permits hold/sell language
