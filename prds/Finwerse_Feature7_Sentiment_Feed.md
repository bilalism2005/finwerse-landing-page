# FINWERSE — FEATURE 7: SENTIMENT FEED
PRD + Technical Requirements (Enriched)

---

## 1. PURPOSE

Let the user browse news articles with sentiment scores attached, for stocks they hold or for any stock/keyword they search — a readable feed, not just chatbot-embedded data.

## 2. SCREEN BEHAVIOR

**Default view:** articles for the user's portfolio stocks — Held-status rows from `portfolio_holdings` (Feature 2).

**Search:** user can search any stock or keyword, replacing the default portfolio view with matching articles.

Each article shown with headline, source, date, and its sentiment score/polarity.

## 3. ARCHITECTURE — NO NEW PIPELINE

Deliberate simplification: no new data source or scraping job. Reuses the **exact same daily EODHD-scraped article database** already powering the Sentiment Score calculation in the core scoring engine — daily EODHD fetch → article stored with `polarity`, `date`, `symbols` tagging → used both to compute the Sentiment sub-score per stock per timeframe AND to populate this feed. Sentiment Feed is purely a **display/query layer** on top of that existing table.

Same table also feeds the Chatbot's "sentiment feed access" tool (Feature 4) — one pipeline, three consumers: Sentiment Score calculation, Sentiment Feed display, Chatbot tool access.

## 4. DATA MODEL

Reuses the existing EODHD-sourced article table already established for the Sentiment Score (stock_symbol, article_date, polarity, source_url, etc. — see the Dashboard scoring spec for the authoritative schema). No new table required for this feature specifically.

## 5. API ENDPOINTS (proposed)

- `GET /sentiment-feed/portfolio` — default view, articles for the user's Held holdings
- `GET /sentiment-feed/search?q={stock_or_keyword}` — search view

## 6. UX / PSYCHOLOGY APPLICATION

**Article list ordering — Serial Position Effect:** default to most-recent-first, since recency is the primary decision-relevant dimension for a news feed and the top of the list is both the first thing read and best remembered — matches how the user actually wants to scan for "what's new."

**Sentiment score badge per article — Gestalt Figure/Ground + color consistency:** reuse the exact same Red/Amber/Green color banding used everywhere else in the app (Dashboard scores, Portfolio Health) rather than inventing a separate sentiment-specific color scheme — consistency here means the user doesn't have to relearn what a color means in a new context (also a Jakob's Law application, extended from the rest of the product to this screen).

**Search vs. default toggle — Hick's Law:** keep the switch between "my portfolio" and "search" to a single, obvious control (e.g. a search bar that simply overrides the default when used, rather than a separate mode-selector) — minimizes the decision the user has to make just to start reading.

**Empty portfolio default view — Occam's Razor for empty states:** if the user has no Held holdings yet, the simplest correct behavior is to prompt toward Portfolio Connect or default straight to a general/trending search view, rather than showing a blank feed with no path forward.

## 7. DEPENDENCIES

Depends on the existing EODHD daily scrape pipeline (already built for Sentiment Score). Default view depends on Feature 2 for the Held holdings list.

## 8. OUT OF SCOPE

No new sentiment sources for this feature specifically (Twitter/social access exists as a separate Chatbot tool per Feature 4, not merged into this feed in this pass). No article embedding/storage architecture changes needed — resolved: the existing pipeline is sufficient, no new infrastructure required.
