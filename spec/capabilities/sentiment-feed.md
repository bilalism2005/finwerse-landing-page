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
| Article list (up to 50) | list of `{id, stock_symbol, article_date, polarity, source_url, headline}` — deliberately excludes `full_text`/`summary` (see In-App Article Reading below) | Sentiment Feed screen (list) |
| Article detail (single) | `{id, stock_symbol, article_date, polarity, source_url, headline, full_text, summary}` — `full_text`/`summary` nullable | Sentiment Feed screen (in-app reader), fetched on tap |

## External Calls
| System | Operation | On Failure |
|---|---|---|
| `stock_news` table | read | — |
| `resolve_symbol` (fuzzy/alias resolution) | search-term → canonical symbol | search still matches on raw ILIKE against symbol/URL even if resolution misses |

## Business Rules
- No new data pipeline — reuses the same daily article database that powers the Sentiment Score calculation and the chatbot's `tool_news_sentiment`; this is purely a display/query layer over shared data. Articles come from IndianAPI's per-stock `recentNews` (EODHD was dropped entirely 2026-08-31 — zero India/NSE coverage, was silently returning wrong-company news for most stocks). Per-article `polarity` is scored by FinVADER (free, in-process) first, escalating to a Groq call (direction + estimated impact magnitude) when FinVADER's own two component lexicons disagree or its combined score is too close to zero to trust — escalation is more common than originally assumed (roughly half of realistic headlines in early testing, not rare), see `spec/architecture.md` External Dependencies for the known cost-assumption caveat.
- Default (portfolio) view: articles for the user's Held-status stocks; if the user is anonymous or has no held stocks, falls back to the market-wide feed rather than showing an empty screen
- Search view: matches on canonical resolved symbol OR partial symbol match OR partial source_url match (`OR` across all three)
- **List endpoints (`/market`, `/portfolio`, `/search`) must never include `full_text` or `summary`** — a deliberate, reasoned choice so list payloads don't grow by the full text of every article shown, only the ones a user actually opens (`GET /sentiment-feed/article/{id}`, fetch-on-tap). Since these three handlers return ORM rows without an explicit field projection today, this must be enforced explicitly in the handler (project only the lightweight fields), not left to "the model just doesn't have those columns" — adding `full_text`/`summary` as real columns on `StockNews` would otherwise leak them into every list response by default.

## Success Criteria
- [x] `GET /sentiment-feed/market` returns the latest 50 articles regardless of auth state
- [x] `GET /sentiment-feed/portfolio` falls back to market feed for anonymous users or users with no held stocks — never returns an empty list when market data exists
- [x] `GET /sentiment-feed/search` resolves aliased/fuzzy stock names via `resolve_symbol` before falling back to raw ILIKE matching
- [ ] `/market`, `/portfolio`, `/search` responses never contain a `full_text` or `summary` key, even though `StockNews` now has those columns
- [ ] `GET /sentiment-feed/article/{id}` returns the full single-article row including `full_text`/`summary` (nullable), `404` for an unknown id
- [ ] `StockNews.full_text` is populated by the batch job only when `trafilatura.extract()` genuinely succeeded (mirrors the existing in-memory `len(extracted.strip()) > 50` condition in `batch_processor.py`) — never populated with the short IndianAPI summary as a substitute
- [ ] `StockNews.summary` is populated from IndianAPI's `recentNews[].summary` whenever non-empty, independent of whether `full_text` extraction succeeded that same run
- [ ] Existing rows (scored before this column existed) read back with `full_text`/`summary` both NULL, and the mobile reader renders a complete, non-blank screen for such a row (headline + whichever of {summary, nothing} is available + a labeled external-open link)

## Known Gaps / Future Work (mobile Market News redesign, 2026-08-25)

`apps/mobile`'s Market News screen (`spec/ui.md` → "Screen: Market News") was redesigned presentation-only against the three list endpoints above. Two design elements had no backing data and were removed rather than fabricated or stubbed:

- **Market-context strip** (NIFTY 50 / SENSEX / BANK NIFTY live index values) — no market-index entity or endpoint exists anywhere in `spec/data.md`/`spec/api.md`. Would need a new index-price data source (a market data provider) plus a batch or on-demand ingestion decision before this could be real. Not scoped as part of this redesign pass. **Still open** — unrelated to the In-App Article Reading addition below.
- ~~**News Detail expanded view** ("Why this matters" / "Market impact" / "Related stocks" / "Explain this news" AI action) — `StockNews` (`spec/data.md`) stores only `stock_symbol, article_date, polarity, source_url, headline`; none of those four sub-sections has a backing data source... Removed entirely; tapping an article keeps the existing direct-open-URL behavior (`Linking.openURL`) instead.~~ **Superseded 2026-08-31 by In-App Article Reading below** — the specific blocker (`StockNews` had no article-body data) is now resolved for the article's own text, but the four AI-enrichment sub-sections ("Why this matters" / "Market impact" / "Related stocks" / "Explain this news") described in the original brief still have **no** backing data and are **not** part of this addition — this is a plain reader for the article's own real text plus its already-existing sentiment score, not a reintroduction of that AI-driven detail view. A Groq-escalated article's one-sentence `reasoning` field is still logged but not persisted — could become real backing data for "Why this matters" if that's revisited as its own, separate future increment.

## In-App Article Reading (mobile, added 2026-08-31)

**What it adds:** tapping an article in the mobile Sentiment Feed (`news.tsx`) opens a native in-app reader screen instead of leaving the app via `Linking.openURL`. Resolves the "News Detail expanded view" blocker above for the article's own text specifically (not the four AI-enrichment sub-sections, which remain unaddressed and out of scope for this addition).

**What changed to make this possible (already shipped, not redesigned here):**
- `StockNews.headline` (added earlier, 2026-08-31) — the list no longer has to guess a headline from the URL slug.
- `StockNews.full_text` / `StockNews.summary` (added by this pass, `spec/data.md`) — the batch job (`apps/api/services/batch_processor.py`) already ran `trafilatura.extract()` on every article's page to get better-informed sentiment scoring (`text_for_scoring`), but discarded the extracted text immediately after scoring. This pass persists it instead of discarding it — no new external call, no new computation, purely "stop throwing away a value already computed this run."

**Data-model decision (full_text vs. summary — the one open design question left to spec-writer's judgment):** two separate nullable columns, not one column with a discriminator flag. `full_text` is defined narrowly as *only* genuine `trafilatura`-extracted body text — its own nullability already tells the reader "we have the real article" (non-null) vs. "we don't" (null), so no separate boolean flag is needed to distinguish the two cases. `summary` is a second, independently-populated column for IndianAPI's short blurb (`recentNews[].summary`), needed because that text was never persisted anywhere before this pass (only ever held in memory as part of the scoring fallback) and the mobile reader needs *something* better than a bare headline to show when `full_text` is null. The two columns are populated independently each batch run — an article can have `summary` only, `full_text` only (summary was empty in the source payload), both, or neither.

**Endpoint:** `GET /sentiment-feed/article/{id}` (`spec/api.md`) — fetch-on-tap, not bundled into the list responses (see Business Rules above for why, and the concrete implementation risk of the columns leaking into the list endpoints if not explicitly excluded).

**Sentiment score display:** the reader shows a numeric score, not just the list's existing Bullish/Bearish/Neutral badge. Computed client-side as `round(polarity * 100)` (a display-only unit conversion of an already-batch-computed value, not new computation — same category as the app's existing `(score + 100) / 2` bar-width transforms), banded via the **existing** `getBand()`/`getBandColor()` (`apps/mobile/src/theme/score-band.ts`) — standing color bands (Red <40, Amber 41-65, Green 66-100), no bespoke scheme for this screen. The list's own Bullish/Bearish/Neutral badge (a separate, pre-existing, unrelated scheme using raw -1..1 thresholds) is unchanged.

**Missing-data handling (never a broken/blank screen):**
| `full_text` | `summary` | Reader shows |
|---|---|---|
| present | — | Full article body, scrollable; a small, non-prominent "Source: {domain}" attribution line (not a prompt) |
| null | present | Headline + the summary text + a prominent, clearly-labeled "Read full article on {domain}" external-open button (`Linking.openURL(source_url)` — the correct fallback, not a regression) |
| null | null | Headline + a short "Full article text isn't available for this story." note + the same prominent "Read full article on {domain}" button |

## Success Criteria (In-App Article Reading)
- [ ] Tapping any article row in `news.tsx` navigates to the in-app reader (`router.push`), never calls `Linking.openURL` directly from the list anymore
- [ ] The reader renders a complete, non-blank screen for all three rows of the missing-data table above, verified against real rows in each state
- [ ] The reader's numeric sentiment score equals `round(polarity * 100)` and its color band matches `getBand()`'s standard thresholds
- [ ] The external-open button, when shown, opens `source_url` in the system browser (unchanged `Linking.openURL` behavior) and is labeled with the actual domain, not a generic "Read more"
- [ ] `news.tsx` no longer contains `extractHeadline` — the list renders `item.headline` directly
