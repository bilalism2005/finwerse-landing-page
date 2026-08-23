# Agent

> This file documents finwerse's one genuinely agentic surface: the Ask AI Chatbot (`POST /chatbot/ask`, `apps/api/routers/chatbot.py` + `apps/api/services/tools.py`). No other finwerse feature uses an LLM agent loop — batch scoring (`services/scoring.py`, `batch_processor.py`) is deterministic computation, and the Bottleneck Report (`routers/health.py`) is a single-shot LLM call with no tool use, documented in `spec/api.md` instead.

---

## Agent Architecture Pattern

**Chosen: Routing + parallel tool use + synthesis (two-node prompt chain).** Not a graph framework (no LangGraph/CrewAI) — a plain two-call sequence in `chatbot.py`. Maps to `harness/patterns/agentic-ai.md` patterns #2 (Routing), #3 (Parallelization — tools run concurrently via `asyncio.gather`), #5 (Tool Use), and #1 (Prompt Chaining — Node 1's output feeds Node 2).

Rationale (as built, not re-justified here): a single routing call decides which data-fetch tools apply to a query, those tools run in parallel against finwerse's own DB + external APIs, and a second call synthesizes the combined results into a plain-English answer. No planning/reflection/multi-agent — the two-step shape covers the query space without added latency.

## LLM Provider & Model

| Node | Provider | Model ID(s) | Rationale |
|---|---|---|---|
| Node 1 — routing/tool-call | Groq | `openai/gpt-oss-120b`, fallback `openai/gpt-oss-20b`, fallback `qwen/qwen3.6-27b` | `max_tokens=300` — tool-call JSON is short; failover chain tried in order on any exception |
| Node 2 — synthesis | Groq | same 3-model failover list, tried in order until one streams successfully | `max_tokens=1500`, `temperature=0.3`, `stream=True` |

**Fallback behaviour:** each node tries its model list in order; Node 1 additionally retries once with `tool_choice="required"` if the first pass returns no tool call and no usable content (empty/length-truncated). If every model in a list fails, the endpoint streams a plain-English "service is busy, try again" message rather than erroring — this is production resilience, not a test/offline path (integration tests hit the real Groq API).

**Prompt strategy:** system/user split; Node 1's system prompt is a routing-rules list (see `## Nodes`); Node 2's system prompt (`NODE_2_SYSTEM_PROMPT`) is a long jargon-free-synthesis style guide, `.format()`-injected with `INDICATOR_REFERENCE` (a condensed RSI/CCI/MACD cheat-sheet inlined in code to avoid a file read / token-limit risk). Tool results are passed to Node 2 wrapped in `<RAW_DATA>` tags with an explicit instruction to treat that content as untrusted string data, not instructions — a prompt-injection guard against news/tweet/filing text.

## Tools & Tool Calling

| Tool name | Description | Inputs | External calls | On Failure |
|---|---|---|---|---|
| `tool_comprehensive_stock_analysis` | Primary "tell me about X" tool — the 4-in-1 engine | `stock_symbol` | Fans out to 4 tools below in parallel via `asyncio.gather` | Each sub-call wrapped in try/except; a failed pillar returns a placeholder ("No news available" etc.) rather than failing the whole response |
| `tool_indicator_values` | Raw RSI/CCI/MACD + crossover freshness | `stock_symbol`, `timeframe?` (D/W/M) | `StockIndicatorValue` table | — |
| `tool_stock_fundamentals` | PE/EPS/ROCE/ROE/D-E/market cap/FII holding | `stock_symbol` | `StockFundamental` table | — |
| `tool_user_portfolio` | Caller's holdings, prices, P&L | none (uses authenticated user) | `PortfolioHolding` + `StockScore` tables | — |
| `tool_twitter_sentiment` | Real-time tweets about a stock | `stock_symbol` | `twitterapi.io` REST API (`TWITTER_API_KEY`) | Returns `{"error": ...}` on non-200 or exception — surfaced to Node 2, not raised |
| `tool_news_sentiment` | Recent headlines + polarity + URLs | `stock_symbol` | `StockNews` table | Returns "no articles found" message, not an error, when empty |
| `tool_nse_filings_rag` | Semantic search over NSE filings | `stock_symbol`, `query` | `CorporateFiling` table (pgvector) | Returns "no filings recorded" message when empty |

**Tool selection strategy:** LLM choice — Node 1 is given all 7 tool schemas (`groq_tools`) plus explicit routing rules in its system prompt (e.g. "any general stock question → `tool_comprehensive_stock_analysis`"); `tool_choice="auto"`, escalated to `"required"` on retry.

**Tool failure handling:** per-tool try/except inside `tool_comprehensive_stock_analysis`; at the top level, `asyncio.gather(*tasks, return_exceptions=True)` — an exception in any single tool call becomes `{"error": str(exc)}` fed to Node 2 rather than crashing the request. Duplicate tool calls (same function name from the LLM) are deduplicated before execution.

## Agent State

No persisted/typed state object — the "state" is the request/response cycle plus the client-supplied `history` list. Effectively:

```python
class ChatRequest(BaseModel):
    query: str
    history: list[ChatMessage] = []   # [{role, content}, ...] — client-side history, not server-persisted

class ChatMessage(BaseModel):
    role: str
    content: str
```

Node 1 uses the last 4 history turns; Node 2 uses the last 2 (token-budget tradeoff, not a correctness constraint).

## Nodes / Steps

### `node_1_routing`
**Reads:** `query`, last 4 `history` turns.
**Writes:** none persisted — produces either direct text (greeting/casual) or a list of tool calls.
**LLM call:** yes — Groq, `tools=groq_tools`, `tool_choice="auto"` then `"required"` on retry.
**Behaviour:** Before executing any tool call, runs a **symbol disambiguation gate** (`tools.resolve_symbol_with_candidates`) against every extracted `stock_symbol` argument — if the query term matches multiple canonical symbols, the endpoint short-circuits and asks the user to disambiguate instead of guessing; if it matches none, it short-circuits with a "couldn't find" message. Only tool calls that pass this gate proceed to execution.

### `node_execute_tools`
**Reads:** the deduplicated tool-call list from Node 1.
**Writes:** `tool_results_str` — each tool's JSON result, compactly formatted per tool.
**LLM call:** no — pure Python, `asyncio.gather` over the 7 tool implementations in `services/tools.py`.
**External calls:** see the Tools table above.

### `node_2_synthesis`
**Reads:** `query`, last 2 `history` turns, `tool_results_str` (wrapped `<RAW_DATA>`).
**Writes:** streamed plain-text response to the client.
**LLM call:** yes — Groq, `stream=True`, no tool use, the jargon-free style-guide system prompt.
**Behaviour:** Synthesizes all fetched pillars into a decisive, plain-English multi-timeframe briefing; explicitly forbidden from recommending buy/sell (the one platform-wide rule this endpoint does NOT waive — contrast with the Bottleneck Report, which does).

## Graph / Flow Topology

```
START
  │
  ▼
node_1_routing ──(no tool call, has content)──► stream content directly ──► END
  │
  │ (tool call present)
  ▼
symbol disambiguation gate ──(MULTIPLE match)──► ask user to disambiguate ──► END
  │                        ──(NOT_FOUND)──► ask user to check spelling ──► END
  │ (all symbols resolved)
  ▼
node_execute_tools (parallel, deduplicated, per-tool try/except)
  │
  ▼
node_2_synthesis (streamed) ──► END
```

**Conditional edges:**

| Source | Condition | Target |
|---|---|---|
| `node_1_routing` | no `tool_calls` AND has content AND `finish_reason != "length"` | stream content directly |
| `node_1_routing` | no `tool_calls` AND (empty OR `finish_reason == "length"`) | retry once with `tool_choice="required"` |
| retry | still no `tool_calls` after retry | stream "having trouble routing" fallback message |
| disambiguation gate | any resolved symbol has `status == "MULTIPLE"` | stream disambiguation question, stop |
| disambiguation gate | any resolved symbol has `status == "NOT_FOUND"` | stream not-found message, stop |
| all Node-1/Node-2 model attempts | every model in the failover list raised | stream a generic "service busy" / "encountered an error" message |

## Memory & Context

| Scope | Mechanism | What is stored |
|---|---|---|
| Within a request | Python locals | tool results, messages list |
| Across requests | **None** | The API does not persist conversation history server-side — `history` is round-tripped by the client on every request |
| Conversation | Client-supplied `history: list[ChatMessage]` | Full turn history is the client's responsibility; server only windows it (last 4 for routing, last 2 for synthesis) |

**Context window management:** sliding window by turn count (4 / 2), not token-counted or summarized.

## Human-in-the-Loop Checkpoints

None. Symbol disambiguation asks a clarifying question but the flow does not resume with the user's answer as a distinct step — the disambiguation reply is just the next `/ask` request with the clarified symbol as free text, re-entering `node_1_routing` from scratch.

## Error Handling & Recovery

**Node-level:** every external call (Groq per-model, each tool, Twitter API) is wrapped in try/except; failures degrade to a placeholder/error string rather than propagating an exception to the client.

**Graph-level:** there is no `handle_error` node / DB error record — this differs from a typical LangGraph agent because there is no persisted run to mark failed. All failure states resolve to a streamed text message.

**Resume/retry:** none — a failed request is simply re-sent by the client (a new `/ask` call).

**Partial failure:** the design goal throughout is graceful degradation — a single failed pillar (e.g. Twitter API down) never blocks the other 3 pillars of `tool_comprehensive_stock_analysis`, and a failed synthesis model triggers the next one in the failover list before giving up.

## Observability

| Signal | What | Where |
|---|---|---|
| Model failover | `logger.warning` on each failed model attempt (Node 1 and Node 2) | Python `logging` → stdout |
| No structured tracing | No LangSmith / OpenTelemetry / per-request trace ID currently wired | — |

> Gap vs. `harness/patterns/agentic-ai.md` / `test-driven.md` expectations: this agent has no structured request/response logging (timestamp, input summary, output summary, latency) and no trace ID propagation. Worth raising as a candidate improvement — not fixed as part of this documentation migration; see `spec/roadmap.md` → Open Decisions.

## Concurrency Model

- **Run isolation:** none needed — stateless per-request, no shared run record. Concurrent requests from the same or different users don't interact.
- **Parallel work within a request:** the tool-execution step (`asyncio.gather`) — all deduplicated tool calls from Node 1 run concurrently.
- **Checkpointing:** none — no framework, nothing to checkpoint.

## Graph Assembly

There is no `graph.py` / framework wiring to show — the "graph" is the linear function body of `ask_chatbot()` in `apps/api/routers/chatbot.py`, structured as: build messages → Node 1 call (with retry) → disambiguation gate → parallel tool execution → Node 2 call (streamed). Read that function directly as the source of truth for control flow; this file documents its behavior, not a separate assembly to keep in sync.
