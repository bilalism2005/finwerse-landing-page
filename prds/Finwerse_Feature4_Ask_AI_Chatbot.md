# FINWERSE — FEATURE 4: ASK AI CHATBOT
PRD + Technical Requirements (Enriched)
(Includes Feature 4a: NSE Filings RAG sub-component)

---

## 1. PURPOSE

Give the user one interface to ask anything about a stock, their portfolio, or how to interpret a score — with answers grounded in real data but always delivered as a plain conclusion, never a data dump.

## 2. ARCHITECTURE — TOOL-CALLING AGENT

Not a fixed set of conversation "modes." A two-node agent architecture:

**Node 1 — Tool Selection.** Given the incoming query, decide which tools are relevant. Zero, one, or all five can be selected for a single query.

**Tools available:**

| Tool | What it accesses | Notes |
|---|---|---|
| Database access | Current + **historical** stock scores, prices, indicator states | Requires `stock_scores` stored as dated history, not overwritten daily |
| NSE filings access | RAG pipeline over NSE/BSE filings | See Feature 4a |
| Sentiment feed access | Same daily EODHD-scraped article database used by Sentiment Score and Sentiment Feed | Shared table, not a separate pipeline |
| Twitter/social access | TwitterAPI.io, called directly via REST from FastAPI | See Section 3 for full detail |
| Portfolio access | User's `portfolio_holdings` table | For portfolio-scoped queries |

**Execution:** all tools selected by Node 1 run **in parallel**.

**Node 2 — Synthesis.** All tool outputs combine into one LLM call producing a single plain-language answer.

**Standing rule:** raw data — numbers, indicator names, filing excerpts, tweet text, sentiment scores — is reasoning material only, never shown verbatim unless the user explicitly asks for the underlying detail. Default output is always the conclusion, never the data behind it.

## 3. TWITTER/SOCIAL TOOL — FULL DETAIL

**Provider:** TwitterAPI.io — a third-party (unofficial, not affiliated with X Corp) service. Auth via a single `x-api-key` header, no OAuth. Claims 700ms average response time, up to 200 QPS per client, "1000B+ API calls" proven stability.

**Key endpoint for Finwerse: Tweet Advanced Search** (`search_tweets`) — supports the full Twitter operator set (`from:`, `since:`, `lang:`, keyword matching). This maps directly to "search for a stock/keyword within a date range," the exact use case needed.

**Other endpoints available but not core to this use case:** user profile lookup, followers/following, tweet-by-ID batch fetch, tweet replies/quotes/retweeters, trending topics.

**Pricing (pay-per-use, credit-based, 100,000 credits = $1):**
- $0.15 per 1,000 tweets fetched
- $0.18 per 1,000 user profiles
- $0.0045 per 1,000 follower IDs (bulk)
- Minimum charge $0.00015 per request even if empty
- Cheap at Finwerse's likely scale — a few thousand keyword-search calls per month costs single-digit dollars.

**MCP server exists but is NOT used:** an official open-source MCP wrapper (`@kaitoinfra/twitterapi-io-mcp-server`, MIT licensed, 12 read-only tools) exists, installable via `npx` for Claude Desktop/Cursor. It is a thin translation layer over the same REST endpoints underneath — `search_tweets` on MCP is the identical `Tweet Advanced Search` REST call. **Decision: call the REST API directly from the FastAPI backend, not through the MCP wrapper.** The MCP pattern is built for a single AI client talking to Twitter on behalf of one person in one local session (spinning up a Node process via npx) — architecturally wrong for a backend serving many Finwerse users concurrently as part of the parallel tool-execution step. Calling REST directly is simpler and avoids the per-request Node process overhead entirely.

**Confirmed gap:** no Reddit coverage anywhere in TwitterAPI.io — Twitter/X only, despite the original framing of this tool as covering "Twitter or Reddit." If Reddit sentiment matters, a separate integration is needed; not sourced in this pass.

**Security note:** the live API key was shared once in this conversation during setup — flagged and not repeated or stored in any document. Standard practice going forward: keys live in environment variables / secrets management, never in chat or in this documentation.

## 4. SCORE EXPLANATION — GROUNDING SOURCE

When Database access returns indicator/crossover data, Node 2's synthesis is grounded against a separate authored reference document: **`Finwerse_Indicator_Meaning_Reference.md`**.

Maps, in exact candle-count terms matching the locked crossover-decay scoring (1-2 candles = very fresh, 3-4 = fresh, 5-7 = cooling, 8-10 = aging, 11+ = old — each translated into real time spans per timeframe: days for Daily, weeks for Weekly, months for Monthly):

- RSI(14): zone meaning, slope, crossover freshness
- CCI(30,9) on Daily: zone meaning, slope, crossover freshness
- CCI(60,9) on Weekly/Monthly: zone meaning, slope, crossover freshness
- MACD(12,26,9): line-vs-signal crossover freshness, zero-line meaning, MACD line slope, histogram acceleration/deceleration and their sequencing (histogram turns first, then line slope, then the crossover itself)
- Multi-timeframe alignment (all agree / higher-vs-lower conflict / no pattern)
- Trending-vs-ranging regime context

All sentences hedged ("often," "tends to," "historically") — never certain. Reasoning material for Node 2 only, never shown to the user as raw sentences.

**Research basis:** informed by an empirical pass covering Brock/Lakonishok/LeBaron (1992), Park & Irwin (2007, the definitive survey — 56 of 95 modern studies positive, 20 negative, 19 mixed), Chong & Ng (2008), Chio (2022), Mahajan (2015, NSE-specific — found the standard MACD+RSI combo actually LOST to buy-and-hold on Indian data, only parameter-optimized versions won), and a correlation study (Grzegorz Link, 2023, S&P 500 1957-2023) finding RSI/CCI/MACD are ~0.89-0.94 correlated — i.e. largely the same underlying momentum signal read three ways, not three independent confirmations. This is why the reference document treats multi-timeframe alignment (same indicator, different timeframes) as a stronger confirmation concept than multi-indicator confluence (different indicators, same timeframe), and why the strongest available evidence for combining MACD+RSI (Chio 2022) showed win-rate lifting to 78-86% but trade count collapsing ~95% and total profit landing in the bottom third — i.e. confluence mostly reduces trade FREQUENCY, not necessarily the false-signal rate.

## 5. HISTORICAL / BACKTEST CAPABILITY

**Query pattern:** "What happened last time this stock was at this score" or two-sided "bought at 80, sold at 90, what would that have looked like."

**Resolution method:** finds the single **most recent** matching historical instance, not an average across all occurrences.

**Infrastructure requirement:** `stock_scores` must be stored as dated history rows, not overwritten in place daily. Shared requirement with Feature 6 (Impulse Analyzer).

**Scope:** chatbot-only. Not surfaced on the Dashboard or individual stock page — explicit reversal of an earlier assumption during design.

## 6. PORTFOLIO-SCOPED QUERIES

**Empty portfolio case:** if the user has no `portfolio_holdings` entries and asks something portfolio-scoped, the chatbot asks "which stock are you referring to?" instead of assuming context or silently failing to a generic fallback.

## 7. DEFERRED / OPEN

- Buy-timing directional language: strictly descriptive vs. allowed to lean directional — deferred until RA/RI licensing is resolved.
- Embedding model for filings RAG — see Feature 4a.

---

## FEATURE 4a: NSE FILINGS RAG (sub-component)

### Purpose
Ground filing-based queries in official NSE/BSE content, never surfacing raw filing text — Node 2 always translates into a plain conclusion.

### What gets filed (context for what's ingested)
Financial Results (P&L, balance sheet, cash flow, EPS — quarterly/annual), Board Meeting Outcomes, Shareholding Pattern (sourced structurally via IndianAPI.in instead, not parsed from these filings), Corporate Announcements (credit ratings, bulk/block deals, insider trading, litigation, contracts, management changes), Annual Reports (MD&A section — identified as the most beginner-readable source available, chairman's letter, governance), Investor Presentations/Concall Transcripts (management narrating results in plain language — the best "explain it simply" source that exists), Credit Rating Updates, Postal Ballot/AGM Notices.

**V1 scope:** all 5 core filing types — quarterly results, annual reports, board meeting outcomes, corporate announcements, shareholding pattern disclosures.

### Pipeline
**Fetch:** daily scrape of NSE (nseindia.com/corporate-filings) and BSE (bseindia.com/corporates). No official bulk API exists for either exchange.
**Parse:** PDF to text; OCR fallback for scanned/older filings.
**Chunk:** 800 tokens per chunk, 100 token overlap (default).
**Embed:** model choice explicitly deferred — open decision between paid API (e.g. OpenAI) vs. free self-hosted model, determines per-document cost.
**Store:** Supabase pgvector — vector + metadata (stock_symbol, filing_type, filing_date, source_url).
**Retrieve:** query embedded the same way, similarity search filtered by stock_symbol (optionally filing_type/date range), top N chunks returned as Node 2 context.
**Refresh cadence:** daily, same cadence as the rest of the scoring pipeline.

### Data model
`corporate_filings`: id, stock_symbol, filing_type, filing_date, source_url, chunk_text, embedding_vector, created_at.

## 8. UX / PSYCHOLOGY APPLICATION

**Conversation entry point — Jakob's Law:** the chat interface should follow the same conventions as every other chat UI the user already knows (message bubbles, input at bottom, loading indicator) — a novel interaction pattern here adds pure friction with no benefit.

**Response latency — Doherty Threshold:** parallel tool execution exists specifically to keep response time as close to the sub-400ms feel as possible even though real LLM+retrieval latency will exceed it; where it can't be hit (filings RAG, multi-tool queries), a visible "thinking"/streaming state is required so the wait doesn't feel broken — perceived responsiveness matters as much as actual latency here.

**Empty-state prompt suggestions — Hick's Law + Goal-Gradient Effect:** offering a small number (3-4, not a long list) of pre-built example prompts on first open reduces the decision paralysis of a blank input box, and seeing a concrete example nudges the user toward starting the interaction (Goal-Gradient — the presence of an easy first step increases the likelihood of taking it).

**Score explanation output — Aesthetic-Usability Effect + Occam's Razor:** the plain-language conclusion should read as one clean paragraph, not a bulleted data dump — even when the underlying reasoning pulled from 3-4 tools, the output should feel like one confident, well-formed answer, since a cleaner-feeling answer is trusted more (Aesthetic-Usability) and the simplest sufficient explanation is the right one to surface (Occam's Razor), consistent with the standing "conclusion not data" rule.

**"Which stock are you referring to?" fallback — Postel's Law:** be liberal in accepting how the user re-phrases their answer to this clarifying question — don't force a rigid stock-symbol-only reply when a name, a partial name, or "the one I just added" should all resolve correctly.

## 9. DEPENDENCIES
None external beyond Supabase pgvector (already in the confirmed stack) for 4a. The core chatbot depends on `stock_scores` historical storage (shared with Feature 6), the EODHD article table (shared with Feature 7), and `portfolio_holdings` (Feature 2) for portfolio-scoped queries.
