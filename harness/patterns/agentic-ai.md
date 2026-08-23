# Agentic-AI Patterns

The reusable catalogue of agentic design patterns — generic engineering doctrine, not a project's design. Ported as-is from `smallTechOrg/zero-shot-claude-boilerplate` (pure reference catalogue, stack-agnostic). `spec/agent.md` records finwerse's actual composition — the Ask AI Chatbot uses patterns #1, #2, #3, and #5 below (Prompt Chaining, Routing, Parallelization, Tool Use); no other finwerse feature is agentic. Prefer the simplest pattern that works: do not reach for multi-agent when a single tool-use loop suffices.

---

### 1. Prompt Chaining
**What** — Decompose a task into a fixed sequence of LLM steps, each consuming the prior step's output.
**When** — Choose when the task has clear, ordered sub-steps; avoid when steps are independent (parallelize) or branch by input (route).
**In finwerse:** the chatbot's Node 1 (routing) → Node 2 (synthesis) sequence.

### 2. Routing
**What** — A classifier or router directs each input to the right specialized handler or prompt.
**When** — Choose when inputs fall into distinct categories needing different handling; avoid when one prompt handles all cases well.
**In finwerse:** the chatbot's Node 1 decides which of 7 tools apply to a query via tool-call selection.

### 3. Parallelization
**What** — Run independent subtasks concurrently (sectioning), or sample the same task multiple times and aggregate (voting).
**When** — Choose to cut latency on independent work or raise reliability via consensus; avoid when steps depend on each other.
**In finwerse:** the chatbot executes all selected tools concurrently via `asyncio.gather`; `tool_comprehensive_stock_analysis` internally fans out to 4 sub-tools the same way.

### 4. Reflection
**What** — The agent critiques and revises its own output before finalizing (self-review / critic loop).
**When** — Choose for quality-sensitive output where a second pass measurably helps; avoid on simple tasks.
**In finwerse:** not currently used anywhere.

### 5. Tool Use (Function Calling)
**What** — The LLM calls external tools, APIs, or functions to act in the world and fetch live data.
**When** — Choose whenever the task needs real data, side effects, or computation the model can't do reliably.
**In finwerse:** the chatbot's 7 tools (`groq_tools` in `routers/chatbot.py`).

### 6. Planning
**What** — The agent generates an explicit multi-step plan before acting, then executes the steps.
**When** — Choose for complex, multi-step goals where order and dependencies matter.
**In finwerse:** not currently used anywhere.

### 7. Multi-Agent Collaboration
**What** — Multiple specialized agents with distinct roles coordinate to complete a task.
**When** — Choose when roles genuinely differ and separation improves quality or isolation.
**In finwerse:** not currently used anywhere — the chatbot's two-node design is a prompt chain, not multiple agents. (Note: this term also refers to the `.claude/agents/*` Claude Code sub-agents that build and maintain finwerse itself — those are a development-tooling use of the term, distinct from a runtime agentic pattern in the product.)

### 8. Memory Management
**What** — Maintain short-term (context window) and long-term (vector store / database) memory across turns and sessions.
**When** — Choose when the agent must recall prior context or personalize; avoid persistent memory for stateless, single-shot tasks.
**In finwerse:** short-term only, and client-managed — the chatbot has no server-side conversation persistence; `history` is round-tripped by the client each request (`spec/agent.md`). The NSE Filings RAG (`corporate_filings` + `pgvector`) is long-term memory in the retrieval sense, but it's shared reference data, not per-user/per-conversation memory.

### 9. Learning and Adaptation
**What** — The agent improves over time from feedback, examples, or observed outcomes.
**When** — Choose when behaviour should evolve with usage and you can capture a feedback signal.
**In finwerse:** not currently used anywhere.

### 10. Model Context Protocol (MCP)
**What** — A standardized protocol for exposing tools, data, and context to models and agents.
**When** — Choose to integrate external tools/data through a common interface and reuse servers across agents.
**In finwerse:** explicitly NOT used for the Twitter tool — the original PRD notes MCP "is built for single-user personal-assistant use, not multi-tenant backend load," so `tool_twitter_sentiment` calls `twitterapi.io` directly via `httpx` instead.

### 11. Goal Setting and Monitoring
**What** — Define explicit goals and success metrics, then track progress against them during execution.
**When** — Choose for long-running or autonomous tasks needing a stopping condition.
**In finwerse:** not currently used anywhere — every finwerse operation (chatbot request, batch run) has a natural, bounded completion point, no open-ended goal-tracking needed.
