# API

## API Style

REST (FastAPI). All routers mounted in `apps/api/main.py`. CORS currently open (`allow_origins=["*"]`) — flagged in code as needing restriction to real app domains in production.

## Authentication

Supabase JWT via `Authorization: Bearer <token>` header (`apps/api/auth.py`):
- `get_current_user` — **required**. Verifies against `SUPABASE_JWT_SECRET` (HS256, `verify_aud=False`); falls back to decoding claims unverified if secret verification fails or the secret isn't set; raises `401` if no `sub` claim can be extracted either way. Used by `portfolio.py`, `alerts.py`, `analyzer.py` (impulse), `health.py` (portfolio health).
- `get_current_user_optional` — same verification path, but returns `"anonymous"` instead of raising when no/invalid token is present. Used by `chatbot.py` (`/ask`) and `sentiment.py` (`/portfolio`) so those endpoints degrade gracefully for anonymous users.

> **Note:** the unverified-JWT fallback path (`jwt.decode(token, options={"verify_signature": False})`) means a malformed or unset `SUPABASE_JWT_SECRET` degrades auth to "trust the `sub` claim in whatever token is presented" rather than failing closed. This is existing behavior, called out here as a spec fact — not a change made by this migration.

## Endpoints

### `GET /` (main.py, no prefix)
**Purpose:** Render health check.
**Response:** `{"status": "healthy"}`

### `GET /stocks/top`
**Purpose:** Ranked list of stocks by a given score/timeframe — backs the Discover screen.
**Query params:** `score_type` (`overall`\|`technical`\|`safety`\|`sentiment`, required), `timeframe` (`short`\|`medium`\|`long`, required), `limit` (default 10)
**Response:** `[{"symbol": str, "score": float, "sector": str}]`
**Error cases:** `400` invalid score_type/timeframe combination.
**Notes:** excludes `"Not Available"` rows when `score_type=sentiment`.

### `GET /stocks/search`
**Purpose:** Symbol search-as-you-type.
**Query params:** `q` (min length 2, required), `timeframe` (required)
**Response:** `[{"symbol": str, "overall_score": float}]` (top 10, `ILIKE` match)

### `GET /stocks/{symbol}/score`
**Purpose:** Full score breakdown for one stock — backs StockDetail.
**Query params:** `timeframe` (required)
**Response:** `{"symbol", "timeframe", "overall", "technical", "safety", "sentiment", "last_updated"}`
**Error cases:** `404` if symbol not found.

### `POST /portfolio/holdings` (auth required)
**Purpose:** Add a holding.
**Request:** `{stock_symbol, quantity, avg_price, purchase_date, intended_holding_period}`
**Response:** `201` + the created holding (id, user_id, status="held", ...)
**Error cases:** `400` if `stock_symbol` isn't in `SymbolMapping`.

### `GET /portfolio/holdings` (auth required)
**Purpose:** List the user's holdings.
**Query params:** `status_filter` (optional — `held`\|`sold`)
**Response:** list of holdings, newest first.

### `PATCH /portfolio/holdings/{holding_id}` (auth required)
**Purpose:** Partial update to a holding (quantity/avg_price/purchase_date/intended_holding_period).
**Error cases:** `404` if not found or not owned by the caller.

### `DELETE /portfolio/holdings/{holding_id}` (auth required)
**Purpose:** Remove a holding.
**Response:** `204`
**Error cases:** `404` if not found or not owned.

### `POST /portfolio/holdings/{holding_id}/sell` (auth required)
**Purpose:** Record a full or partial sell.
**Request:** `{sold_quantity, sold_price, sold_date}`
**Response:** list of 1 (full sell) or 2 (partial — original row closed, remainder split into a new `held` row) holdings.
**Error cases:** `400` if `sold_quantity` exceeds held quantity; `404` if no matching held position.

### `GET /portfolio/health` (auth required)
**Purpose:** Weighted portfolio health — backs Portfolio Health screen (Feature 3).
**Query params:** `timeframe` (required)
**Response:** `PortfolioHealthResponse` — overall/technical/safety/sentiment scores (weighted by position size), green/red split scores, HHI-based diversification score, sector breakdown, per-holding detail sorted worst-to-best.
**Error cases:** `400` invalid timeframe. Empty portfolio returns all-zero response, not an error.

### `POST /portfolio/health/bottleneck-report` (auth required)
**Purpose:** LLM-generated narrative report naming the worst-performing holdings — the one place the platform's no-buy/sell-advice rule is explicitly waived ("one-time exception").
**Request:** `{timeframe}`
**Response:** `{"report": str}`
**External call:** Groq (`openai/gpt-oss-120b`, falls back to `openai/gpt-oss-20b` on failure).
**Error cases:** `500` if `GROQ_API_KEY` unset or the LLM call fails after fallback.

### `GET /analyzer/impulse` (auth required)
**Purpose:** Impulse-trading cost analysis over the user's own historical sold trades (Feature 6).
**Response:** `{"total_cost", "monthly_costs": {YYYY-MM: cost}, "trades": [...]}`
**Logic:** for each losing sold trade, compares actual buy/sell timing against the nearest date where the historical technical score was ≥80 (good buy) / ≤-80 (good sell), computes a counterfactual profit at equal capital deployed, and reports the rupee cost of the gap. Only losing trades are evaluated; trades missing historical score data are skipped.

### `POST /analyzer/custom-impulse` (no auth)
**Purpose:** Same impulse analysis for arbitrary user-submitted trades — the "Custom Trade Analyzer" (not limited to the user's real portfolio).
**Request:** `{trades: [{stock_symbol, buy_price, buy_date, sell_price, sell_date, quantity, intended_holding_period?}]}`
**Response:** same shape as `/analyzer/impulse`, but includes non-losing trades too (`is_impulse: false, rupee_cost: 0.0` when buy+sell timing was already good).
**Note:** unauthenticated by design — lets a visitor test hypothetical trades. If this is intentional, keep; if not, it's a spec-vs-code gap worth flagging (`spec/roadmap.md` → Open Decisions).

### `POST /alerts` (auth required)
**Purpose:** Create a threshold alert.
**Request:** `{alert_type, stock_symbol?, score_type, timeframe, threshold_value, direction}`
**Error cases:** `400` if `alert_type=specific_stock` and no `stock_symbol` given.

### `GET /alerts` (auth required)
**Purpose:** List the user's active alerts plus alerts triggered in the last 5 days.

### `DELETE /alerts/{alert_id}` (auth required)
**Error cases:** `404` if not found or not owned.

### `POST /users/push-token` (auth required)
**Purpose:** Register an Expo push token for alert notifications.
**Request:** `{expo_push_token}`
**Note:** idempotent — returns "already registered" if the token exists for that user.

### `GET /sentiment-feed/market`
**Purpose:** Latest 50 news articles across all tracked stocks — anonymous-friendly.
**Response:** list of `{id, stock_symbol, article_date, polarity, source_url, headline}` — deliberately lightweight. **Must NOT include `full_text` or `summary`** (added 2026-08-31, see `spec/data.md`'s `StockNews.full_text`/`summary`); a caller wanting an article's full body calls `GET /sentiment-feed/article/{id}` below instead. Implementation note: since this endpoint returns ORM rows without an explicit field projection, adding `full_text`/`summary` as model columns would otherwise leak them into this response by default — the handler must explicitly project only the lightweight field set (e.g. an explicit dict/schema), not `return` the raw query result as-is.

### `GET /sentiment-feed/portfolio` (optional auth)
**Purpose:** News for the caller's held stocks; falls back to the market feed if anonymous or no holdings (screen is never blank).
**Response:** same lightweight shape and the same `full_text`/`summary` exclusion as `/market` above.

### `GET /sentiment-feed/search`
**Purpose:** Search news by stock symbol/company name/keyword, with fuzzy symbol resolution (`resolve_symbol`).
**Query params:** `q` (required)
**Response:** same lightweight shape and the same `full_text`/`summary` exclusion as `/market` above.

### `GET /sentiment-feed/article/{id}` (no auth — added 2026-08-31)
**Purpose:** Fetch-on-tap full detail for a single article — backs the mobile in-app article reader (`spec/capabilities/sentiment-feed.md` → In-App Article Reading). Deliberately a separate endpoint rather than bundled into the list endpoints above, so list payloads stay lightweight.
**Response:** `{id, stock_symbol, article_date, polarity, source_url, headline, full_text, summary}` — `full_text`/`summary` may both be null (older row, or extraction failed at scoring time and IndianAPI supplied no summary either).
**Error cases:** `404` if no `StockNews` row exists with that `id`.

### `POST /chatbot/ask` (optional auth, streaming)
**Purpose:** The Ask AI Chatbot — see `spec/agent.md` for the full tool-calling design.
**Request:** `{query: str, history: [{role, content}]}`
**Response:** `text/plain` streamed response.
**External call:** Groq, two-node pattern (routing → tool execution → synthesis).
