# Capability: Ask AI Chatbot

## What It Does
Answers free-text questions about any stock, the user's own portfolio, technical indicators, fundamentals, news, Twitter sentiment, or NSE filings — routing to the right combination of 7 tools per query, running them in parallel, and synthesizing a decisive, jargon-free, multi-timeframe plain-English answer. Full agent design in `spec/agent.md` — this file covers the product-level capability only.

## Inputs
| Input | Type | Source | Required |
|---|---|---|---|
| query | string | user free text | yes |
| history | list of `{role, content}` | client-maintained conversation history | no (defaults empty) |
| Authorization header | JWT | Supabase session, optional | no — anonymous allowed |

## Outputs
| Output | Type | Destination |
|---|---|---|
| Streamed plain-English answer | `text/plain` stream | chat UI |
| Disambiguation question | string | when a queried symbol matches multiple stocks |
| Not-found message | string | when a queried symbol matches no stock |

## External Calls
| System | Operation | On Failure |
|---|---|---|
| Groq (Node 1: routing) | tool-call decision | 3-model failover; final failure → "busy" message |
| Groq (Node 2: synthesis) | streamed answer | 3-model failover; final failure → "encountered an error" message |
| `stock_scores`, `stock_indicator_values`, `stock_fundamentals`, `portfolio_holdings` tables | tool reads | per-tool try/except, degrades to placeholder text |
| `stock_news`, `corporate_filings` tables | tool reads | "no articles/filings found" message, not an error |
| twitterapi.io | live tweet search | `{"error": ...}` fed to synthesis as data |

## Business Rules
- Raw data (scores, indicator states, filing text, tweets) is reasoning material only — the user-facing answer is always the plain-language conclusion, never raw numbers, unless explicitly asked
- Never uses buy/sell/avoid/invest framing — the one platform rule this endpoint does NOT waive (contrast with Portfolio Health's Bottleneck Report)
- An empty-portfolio user asking a portfolio-scoped question gets "which stock are you referring to?" rather than an assumed answer
- Symbol disambiguation runs BEFORE tool execution — ambiguous or unresolvable symbols short-circuit the whole request with a clarifying question, no tool calls made
- Content inside `<RAW_DATA>` tags passed to Node 2 is explicitly untrusted string data — a prompt-injection guard against adversarial news/tweet/filing text

## Known Gap (found during this spec migration)
The original PRD describes a **historical/backtest capability** ("what happened last time this stock was at this score," single most-recent match, two-sided buy/sell version) as chatbot-only. It is **not present** in the chatbot's actual 7-tool list (`groq_tools` in `routers/chatbot.py`) — the equivalent counterfactual logic exists only inside the separate Impulse Analyzer capability. Confirm with the team whether this was deferred or dropped before treating it as either "not yet built" or "spec error, remove."

## Success Criteria
- [x] A general stock question ("Tell me about Reliance") routes to `tool_comprehensive_stock_analysis`
- [x] An ambiguous symbol halts before any tool executes and asks the user to disambiguate
- [x] A failed individual tool (e.g. Twitter API down) never blocks the other tools' results from reaching synthesis
- [x] Synthesis output never contains raw indicator numbers per its system prompt's explicit rule
- [ ] Historical/backtest queries are answerable by the chatbot — **currently fails**; see Known Gap above
