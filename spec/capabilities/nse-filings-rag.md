# Capability: NSE Filings RAG

## What It Does
Sub-component of the Ask AI Chatbot (`tool_nse_filings_rag`): a fetch → parse → chunk → embed → store → retrieve pipeline over official NSE/BSE corporate filings, giving the chatbot grounded access to quarterly results, annual reports, board meeting outcomes, corporate announcements, and shareholding pattern disclosures.

## Inputs
| Input | Type | Source | Required |
|---|---|---|---|
| stock_symbol | string | chatbot tool call | yes |
| query | string | chatbot tool call — what to search for within filings | no (defaults to "corporate announcements") |

## Outputs
| Output | Type | Destination |
|---|---|---|
| Filing excerpts (type, date, summary, url) | list, top 2 by recency | fed to chatbot's Node 2 synthesis |

## External Calls
| System | Operation | On Failure |
|---|---|---|
| NSE (nseindia.com/corporate-filings), BSE (bseindia.com/corporates) | daily scrape, all 5 filing types | batch-job concern, not request-time |
| `corporate_filings` table (pgvector) | similarity search filtered by stock symbol | "no filings recorded" message when empty, not an error |

## Business Rules
- Pipeline: **Fetch** (daily scrape, all 5 filing types) → **Parse** (PDF to text, OCR fallback for scanned/older filings) → **Chunk** (800 tokens, 100 token overlap) → **Embed** (`sentence-transformers/all-MiniLM-L6-v2`, 384-dim — resolved during this migration; the original PRD listed this as an open decision) → **Store** (Supabase pgvector, one table with vectors + metadata) → **Retrieve** (query embedded the same way, similarity search filtered by symbol, top-N chunks returned)
- Refresh cadence: daily, same cadence as the rest of the scoring pipeline (3:45 PM IST / 10:15 UTC cron)
- The retrieval step at request time is read-only against pre-embedded data — no live embedding of the user's query against a cold index; embedding happens only during the daily batch's store step (verify this against `services/nse_scraper.py` and `services/tools.py`'s actual retrieval implementation if the query-embedding step turns out to run at request time instead)

## Success Criteria
- [x] `corporate_filings.embedding_vector` is populated (384-dim) for filings ingested by the batch job
- [x] `tool_nse_filings_rag` returns the 2 most recent filings for a symbol, or a clear "none recorded" message
- [ ] Retrieval quality (semantic relevance of returned chunks to the query) not evaluated during this migration — recommend a real relevance-eval pass, not just an existence check
