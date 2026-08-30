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
- Pipeline as actually implemented: **Fetch** (daily scrape, all 5 filing types) → **Parse** (PDF to text, OCR fallback for scanned/older filings) → **Chunk** (top 5 chunks per filing, ~1000 chars each, 200 char overlap) → **Store** (Supabase pgvector table, `embedding_vector` column present but left `NULL`) → **Retrieve** (recency only — most recent 2 filings for the symbol by `filing_date`, `query` parameter currently unused).
- **Embed and semantic Retrieve are NOT implemented** (corrected 2026-08-30; the original migration mistakenly marked this done — see Success Criteria). `services/nse_scraper.py` briefly loaded a `sentence-transformers/all-MiniLM-L6-v2` model but never called `.encode()` on it, so `embedding_vector` was always `NULL`; that dead-weight model load (pulling in `torch`, ~300MB) was also the direct cause of an OOM kill on the batch cron once a run finally ran long enough to reach this step. The unused model has been removed. `services/tools.py`'s `tool_nse_filings_rag` was already doing recency-based retrieval only (`order_by(filing_date desc).limit(2)`), so it needed no change once the spec was corrected to match it.
- Refresh cadence: daily, same cadence as the rest of the scoring pipeline (3:45 PM IST / 10:15 UTC cron)
- If real semantic search is wanted later: embed each chunk at ingest time (`nse_scraper.py`) and the query string at request time (`tools.py`), then order by vector distance instead of `filing_date` — treat as a new, separate `/zero-shot-build`, not a small patch (needs a memory-budget plan for the batch cron too, since the model load that caused the OOM would then be genuinely necessary).

## Success Criteria
- [ ] `corporate_filings.embedding_vector` is populated (384-dim) for filings ingested by the batch job — **not implemented**; column exists and stays `NULL`
- [x] `tool_nse_filings_rag` returns the 2 most recent filings for a symbol, or a clear "none recorded" message
- [ ] Semantic retrieval (similarity search against the `query` parameter) — **not implemented**; retrieval today is recency-only and ignores `query` entirely
- [ ] Retrieval quality (semantic relevance of returned chunks to the query) not evaluated — moot until semantic retrieval above is actually built
