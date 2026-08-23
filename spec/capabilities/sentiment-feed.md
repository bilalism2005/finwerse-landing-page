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
| Article list (up to 50) | list of `{stock_symbol, article_date, polarity, source_url}` | Sentiment Feed screen |

## External Calls
| System | Operation | On Failure |
|---|---|---|
| `stock_news` table | read | — |
| `resolve_symbol` (fuzzy/alias resolution) | search-term → canonical symbol | search still matches on raw ILIKE against symbol/URL even if resolution misses |

## Business Rules
- No new data pipeline — reuses the same daily EODHD-scraped article database that powers the Sentiment Score calculation and the chatbot's `tool_news_sentiment`; this is purely a display/query layer over shared data
- Default (portfolio) view: articles for the user's Held-status stocks; if the user is anonymous or has no held stocks, falls back to the market-wide feed rather than showing an empty screen
- Search view: matches on canonical resolved symbol OR partial symbol match OR partial source_url match (`OR` across all three)

## Success Criteria
- [x] `GET /sentiment-feed/market` returns the latest 50 articles regardless of auth state
- [x] `GET /sentiment-feed/portfolio` falls back to market feed for anonymous users or users with no held stocks — never returns an empty list when market data exists
- [x] `GET /sentiment-feed/search` resolves aliased/fuzzy stock names via `resolve_symbol` before falling back to raw ILIKE matching
