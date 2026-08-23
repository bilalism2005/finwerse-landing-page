# Data Model

## Storage Technology

**Supabase Postgres** (with the `pgvector` extension for embeddings). Auth (`auth.users`) is Supabase's; app tables below live in the same Postgres database, defined via SQLAlchemy models in `apps/api/models.py` and created via `Base.metadata.create_all()` at API startup (`apps/api/main.py` lifespan) — there is no Alembic; `apps/api/init_db.py` / `seed_and_run.py` are the local bootstrap scripts.

## Entities

### Entity: SymbolMapping
Maps a canonical stock symbol to the identifiers each external data provider uses for it.

| Field | Type | Required | Description |
|---|---|---|---|
| stock_symbol | String | yes | Primary key — canonical NSE symbol |
| angel_token | String | no | Angel One broker API token |
| indianapi_id | String | no | IndianAPI identifier |
| eodhd_symbol | String | no | EODHD identifier |
| created_at | DateTime | yes | |

### Entity: StockScore
Current computed scores per stock — the primary read path for `/stocks/*`.

| Field | Type | Required | Description |
|---|---|---|---|
| stock_symbol | String | yes | Primary key |
| computed_at | DateTime | yes | Last batch run that updated this row |
| data_status | String | no | `SUCCESS` \| `RATE_LIMITED` \| `FAILED` |
| technical_score_{short,medium,long} | Float | no | -100..100, `CheckConstraint` enforced |
| safety_score_{short,medium,long} | Float | no | -100..100 |
| sentiment_score_{short,medium,long} | String | no | Stored as string — value or `"Not Available"` |
| overall_score_{short,medium,long} | Float | no | -100..100, indexed — the four-score/three-timeframe matrix the whole product is built on |
| sector | String | no | |
| market_cap_category | String | no | |

### Entity: StockCandle
OHLCV price history, one row per symbol/timeframe/date.

| Field | Type | Required | Description |
|---|---|---|---|
| id | Integer | yes | Autoincrement PK |
| stock_symbol | String | yes | |
| timeframe | String | yes | `D` \| `W` \| `M` |
| date | DateTime | yes | |
| open, high, low, close, volume | Float | yes | `CheckConstraint`: all ≥ 0, high ≥ low |

### Entity: StockFundamental
Latest fundamental ratios per stock.

| Field | Type | Required | Description |
|---|---|---|---|
| stock_symbol | String | yes | Primary key |
| period | String | no | e.g. "Q1 2026", "FY2025" |
| sales, eps, opm, roce, roe, debt_to_equity, pe_ratio, market_cap, fii_holding_pct | Float | no | |
| updated_at | DateTime | yes | |

### Entity: StockNews
News articles used for sentiment scoring and the Sentiment Feed.

| Field | Type | Required | Description |
|---|---|---|---|
| id | Integer | yes | Autoincrement PK |
| stock_symbol | String | yes | |
| article_date | DateTime | yes | |
| polarity | Float | yes | Sentiment polarity score |
| source_url | String | yes | Unique — used for dedup |

### Entity: StockHistoricalScore
Time series of technical scores — backs the Impulse Analyzer's counterfactual lookups.

| Field | Type | Required | Description |
|---|---|---|---|
| id | Integer | yes | Autoincrement PK |
| stock_symbol | String | yes | |
| date | DateTime | yes | Unique with stock_symbol |
| technical_score_{short,medium,long} | Float | no | -100..100 |

### Entity: StockIndicatorValue
Raw indicator values per stock/date/timeframe — backs `tool_indicator_values` in the chatbot.

| Field | Type | Required | Description |
|---|---|---|---|
| id | Integer | yes | Autoincrement PK |
| stock_symbol, date, timeframe | — | yes | Unique together (`D`/`W`/`M`) |
| cci_value, cci_sma, cci_crossover | Float | no | |
| rsi_value, rsi_sma, rsi_crossover | Float | no | |
| macd_line, macd_signal, macd_crossover | Float | no | |

### Entity: PortfolioHolding
A user's position — held or sold, with partial-sell support (split into two rows).

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | yes | PK |
| user_id | String | yes | Supabase auth user UUID as string |
| stock_symbol | String | yes | |
| quantity | Integer | yes | |
| avg_price | Float | yes | |
| purchase_date | Date | yes | |
| intended_holding_period | String | yes | `short` \| `medium` \| `long` |
| status | String | yes | `held` \| `sold`, indexed |
| sold_quantity, sold_price | — | no | Set on sell |
| sold_date | Date | no | |
| created_at, updated_at | DateTime | yes | |

### Entity: CorporateFiling
NSE filing chunks with embeddings — backs the NSE Filings RAG tool (Feature 4a).

| Field | Type | Required | Description |
|---|---|---|---|
| id | Integer | yes | Autoincrement PK |
| stock_symbol, filing_type, filing_date | — | yes | |
| source_url | String | no | |
| chunk_text | Text | yes | |
| embedding_vector | Vector(384) | no | `sentence-transformers/all-MiniLM-L6-v2` embeddings |
| created_at | DateTime | yes | |

### Entity: Alert
User-configured score-threshold alerts.

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | yes | PK |
| user_id | String | yes | |
| alert_type | String | yes | `universe_wide` \| `specific_stock` \| `portfolio_only` |
| stock_symbol | String | no | Required only for `specific_stock` |
| score_type | String | yes | `overall` \| `technical` \| `safety` \| `sentiment` |
| timeframe | String | yes | `short` \| `medium` \| `long` |
| threshold_value | Float | yes | |
| direction | String | yes | `above` \| `below` |
| status | String | yes | `active` \| `triggered` |
| triggered_date, triggered_symbol | — | no | Set when triggered |
| created_at | DateTime | yes | |

### Entity: UserDevice
Push-notification device registration for Alerts.

| Field | Type | Required | Description |
|---|---|---|---|
| id | Integer | yes | Autoincrement PK |
| user_id | String | yes | |
| expo_push_token | String | yes | Unique |
| created_at, updated_at | DateTime | yes | |

### Relationships
All entities relate to a stock via `stock_symbol` (no FK constraint — string join, not enforced at the DB level). `PortfolioHolding`, `Alert`, and `UserDevice` relate to a user via `user_id` (Supabase auth UUID, stored as string, also no FK — Supabase auth is a separate system). No entity has a SQLAlchemy `relationship()` — all joins are done at query time in the routers/services.

## Data Lifecycle

- `StockScore`, `StockCandle`, `StockFundamental`, `StockIndicatorValue`, `StockHistoricalScore` are written by the daily `BatchProcessor` batch job (`apps/api/services/batch_processor.py`), scheduled via the Render cron service `finwerse-batch-cron` (`15 10 * * 1-5` UTC = weekdays) — never written by request-serving code.
- `StockNews` and `CorporateFiling` are written by `nse_scraper.py` and the news-fetching path within the batch job.
- `PortfolioHolding`, `Alert`, `UserDevice` are written directly by user-facing API requests (`portfolio.py`, `alerts.py`).
- Nothing in this schema is currently archived or time-boxed — historical tables (`StockHistoricalScore`) grow unbounded.

## Sensitive Data

- `PortfolioHolding`, `Alert`, `UserDevice` all key off `user_id` (a Supabase auth UUID) — access is scoped to the authenticated user via `auth.get_current_user` in every read/write path; there is no admin/cross-user read path in the API.
- No PII beyond `user_id` is stored in these tables (email/name live in Supabase `auth.users`, not queried by this API).
- `SUPABASE_JWT_SECRET`, provider API keys (`INDIANAPI_KEY`, `EODHD_API_KEY`, `ANGEL_ONE_*`, `GROQ_API_KEY`, `TWITTER_API_KEY`) are Render environment variables (`render.yaml`, `sync: false`) — never in the DB or source.
