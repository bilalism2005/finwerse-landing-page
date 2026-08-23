# UI

## UI Type

Two clients, both consuming the same `apps/api` REST surface via `packages/shared` (Supabase client + `AuthContext`): a web dashboard (`apps/web`, React + Vite + Tailwind, React Router) and a mobile app (`apps/mobile`, Expo SDK 57 + `expo-router`). Per `README.md`, **mobile is the least mature app in the repo — treat as early-stage.**

## Tech Stack

- **Web:** React + Vite + Tailwind, `react-router-dom`, Zustand not used here (mobile-only per `PRODUCT_CONTEXT.md`'s original tech-stack line — verify if web also uses Zustand before assuming otherwise)
- **Mobile:** Expo SDK 57, `expo-router` (file-based routing, `(auth)`/`(tabs)` groups), Zustand for state

## Views / Screens (web — `apps/web/src/pages`, routes per `App.tsx`)

### Screen: Index (`/`)
**Purpose:** Public landing page.

### Screen: Auth (`/auth`)
**Purpose:** Supabase Auth sign-in/sign-up (built on existing auth, not rebuilt).

### Screen: BrokerConnect (`/broker-connect`, protected)
**Purpose:** Named after the ruled-out broker auto-sync approach (`spec/capabilities/portfolio-connect.md`) — confirm during any future work on this screen whether it now serves manual entry onboarding instead, since auto-sync was explicitly ruled out.

### Screen: Discover (`/app/discover`, protected)
**Purpose:** Stock Analytics Dashboard — top-10 ranked lists by score type/timeframe, search.
**Key elements:** score_type + timeframe toggles, ranked list, search box.
**Actions:** navigate to StockDetail; switch score/timeframe.

### Screen: StockDetail (`/app/stock/:symbol`, protected)
**Purpose:** Full 4-score breakdown for one stock.
**Key elements:** all 4 scores, AI Summary icon (opens Ask AI Chatbot pre-loaded with this stock's context).
**Actions:** open chatbot with context; (mobile equivalent: `app/stock/[symbol].tsx`).

### Screen: Portfolio (`/app/portfolio`, protected)
**Purpose:** Portfolio Connect — manual holdings CRUD.
**Key elements:** holdings list (held/sold), add/edit/sell/delete actions.

### Screen: AskAI (`/app/ask-ai`, protected)
**Purpose:** Ask AI Chatbot interface — see `spec/agent.md` for the backend design.
**Key elements:** chat thread, streamed response rendering.
**Notes:** per `harness/patterns/ui-ux.md` (once ported), streamed LLM text must render through a markdown renderer, not as a raw text node — verify this against the actual chat component before assuming it's already correct.

### Screen: Feed (`/app/feed`, protected)
**Purpose:** Sentiment Feed — portfolio-default news feed with search.

### Screen: Alerts (`/app/alerts`, protected)
**Purpose:** Create/view/delete score-threshold alerts; view triggered history (5-day visible window).

### Screen: ImpulseAnalyzer (`/app/impulse-analyzer`, protected)
**Purpose:** Impulse trade cost analysis — both against the user's real sold trades and (per `routers/analyzer.py`) a custom hypothetical-trade input.

### Screen: NotFound (`*`)
**Purpose:** 404 fallback.

## Views / Screens (mobile — `apps/mobile/app`)

Tab group (`(tabs)/`): `index` (Discover-equivalent), `portfolio`, `health` (Portfolio Health), `impulse`, `alerts`, `chat` (Ask AI), `news` (Sentiment Feed), plus a `two.tsx` whose purpose isn't confirmed in this migration — check before treating it as dead code. Auth group (`(auth)/login`). Standalone: `stock/[symbol]`, `modal`, `auth-callback`.

> Given mobile's "least mature" status per the README, this section should be re-verified against the actual screen contents (not just filenames) before being treated as authoritative — this migration mapped structure, not screen-by-screen behavior, for mobile.

## Error States

Not verified screen-by-screen during this migration. `harness/patterns/ui-ux.md` (once ported) sets the bar every screen should be checked against: empty / loading / error / populated states all designed, errors in plain language (never a raw stack trace), destructive actions (delete holding, delete alert) confirm before executing.

## Cross-Cutting UI Rules (from `PRODUCT_CONTEXT.md`, apply on every screen showing scores)

- Score color bands: Red <40, Amber 41-65, Green 66-100 — must be visually consistent across Discover, StockDetail, Portfolio Health, and anywhere else a score renders
- Three holding-period labels (Short/Medium/Long) must read identically everywhere they appear — no per-screen wording drift
