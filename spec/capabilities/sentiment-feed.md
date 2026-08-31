# Capability: Sentiment Feed

## What It Does
A browsable news feed with sentiment scores — not just a chatbot input. Defaults to articles for the user's held portfolio stocks, falls back to a market-wide feed so the screen is never blank, and supports free-text search across stock symbol/company name/keyword.

## Inputs
| Input | Type | Source | Required |
|---|---|---|---|
| (portfolio view) Authorization header | JWT, optional | Supabase session | no — anonymous falls back to market feed |
| (search view) q | string | user typing | yes |

## Outputs
| Output | Type | Destination |
|---|---|---|
| Article list (up to 50) | list of `{stock_symbol, article_date, polarity, source_url, headline}` | Sentiment Feed screen |

## External Calls
| System | Operation | On Failure |
|---|---|---|
| `stock_news` table | read | — |
| `resolve_symbol` (fuzzy/alias resolution) | search-term → canonical symbol | search still matches on raw ILIKE against symbol/URL even if resolution misses |

## Business Rules
- No new data pipeline — reuses the same daily article database that powers the Sentiment Score calculation and the chatbot's `tool_news_sentiment`; this is purely a display/query layer over shared data. Articles come from IndianAPI's per-stock `recentNews` (EODHD was dropped entirely 2026-08-31 — zero India/NSE coverage, was silently returning wrong-company news for most stocks). Per-article `polarity` is scored by FinVADER (free, in-process) first, escalating to a Groq call (direction + estimated impact magnitude) when FinVADER's own two component lexicons disagree or its combined score is too close to zero to trust — escalation is more common than originally assumed (roughly half of realistic headlines in early testing, not rare), see `spec/architecture.md` External Dependencies for the known cost-assumption caveat.
- Default (portfolio) view: articles for the user's Held-status stocks; if the user is anonymous or has no held stocks, falls back to the market-wide feed rather than showing an empty screen
- Search view: matches on canonical resolved symbol OR partial symbol match OR partial source_url match (`OR` across all three)

## Success Criteria
- [x] `GET /sentiment-feed/market` returns the latest 50 articles regardless of auth state
- [x] `GET /sentiment-feed/portfolio` falls back to market feed for anonymous users or users with no held stocks — never returns an empty list when market data exists
- [x] `GET /sentiment-feed/search` resolves aliased/fuzzy stock names via `resolve_symbol` before falling back to raw ILIKE matching

## Known Gaps / Future Work (mobile Market News redesign, 2026-08-25)

`apps/mobile`'s Market News screen (`spec/ui.md` → "Screen: Market News") was redesigned presentation-only against the three endpoints above. Two design elements had no backing data and were removed rather than fabricated or stubbed:

- **Market-context strip** (NIFTY 50 / SENSEX / BANK NIFTY live index values) — no market-index entity or endpoint exists anywhere in `spec/data.md`/`spec/api.md`. Would need a new index-price data source (a market data provider) plus a batch or on-demand ingestion decision before this could be real. Not scoped as part of this redesign pass.
- **News Detail expanded view** ("Why this matters" / "Market impact" / "Related stocks" / "Explain this news" AI action) — `StockNews` (`spec/data.md`) stores only `stock_symbol, article_date, polarity, source_url, headline`; none of those four sub-sections has a backing data source (a Groq-escalated article's one-sentence `reasoning` field is logged but not persisted — could become the backing data for "Why this matters" if this is revisited). Removed entirely; tapping an article keeps the existing direct-open-URL behavior (`Linking.openURL`) instead, which the redesign kept as the correct, honest behavior given the data actually available.
