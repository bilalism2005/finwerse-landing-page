# Capabilities Index

## What Is a Capability?

A capability is a single, discrete action or behavior finwerse performs. Examples: "compute the four scores for a stock," "let a user answer a free-text question about a stock via the AI chatbot," "quantify the rupee cost of a user's impulse trades."

## Capabilities in This Project

| Capability | File | Status |
|---|---|---|
| Stock Analytics Dashboard | [stock-analytics-dashboard.md](stock-analytics-dashboard.md) | Built |
| Portfolio Connect | [portfolio-connect.md](portfolio-connect.md) | Built |
| Portfolio Health | [portfolio-health.md](portfolio-health.md) | Built |
| Ask AI Chatbot | [ask-ai-chatbot.md](ask-ai-chatbot.md) | Built (1 known gap — see file) |
| NSE Filings RAG (sub-component of Ask AI Chatbot) | [nse-filings-rag.md](nse-filings-rag.md) | Built |
| Alerts | [alerts.md](alerts.md) | Built (1 known gap — see file) |
| Impulse Analyzer | [impulse-analyzer.md](impulse-analyzer.md) | Built (1 known gap — see file) |
| Sentiment Feed | [sentiment-feed.md](sentiment-feed.md) | Built |
| Chart Analyzer | [chart-analyzer.md](chart-analyzer.md) | Not built — placeholder only |

See `spec/roadmap.md` → Build Status for the full picture including drift found during this migration (2026-08-23).

## How to Add a New Capability

Once `/zero-shot-build` is ported (see `CLAUDE.md`), run it with the capability description. The `spec-writer` sub-agent will:
1. Create a new file in this directory (`<name>.md`, no number prefix)
2. Update this index
3. Flag any dependencies on existing capabilities (see `spec/roadmap.md` → Cross-Feature Dependencies pattern: several capabilities share `portfolio_holdings` and `stock_historical_scores` as prerequisites)
4. Self-review that it fits `spec/architecture.md` and `spec/data.md` before returning

## Capability File Template

Each capability file answers:
- **What it does** (one sentence)
- **Inputs** (what data it receives)
- **Outputs** (what it produces)
- **External calls** (APIs, LLMs, databases it touches)
- **Business rules** (the locked decisions from the original PRDs — thresholds, formulas, edge cases)
- **Success criteria** (checked `[x]` where verified against running code during the 2026-08-23 migration, unchecked `[ ]` where unverified or a known gap)
