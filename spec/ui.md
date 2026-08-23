# UI

## UI Type

Two clients, both built to consume the same `apps/api` REST surface via `packages/shared` (Supabase client + `AuthContext`): a web dashboard (`apps/web`, React + Vite + Tailwind, React Router) and a mobile app (`apps/mobile`, Expo SDK 57 + `expo-router`).

**Confirmed 2026-08-23 (drift audit) — only `apps/mobile` actually calls `apps/api` today.** `apps/web` is a deliberate static-data prototype: every page renders from `lib/dummyData.ts`, with zero `fetch`/`axios` calls anywhere in `apps/web/src` and no backend URL configured in `.env.example`. This is intentional (confirmed with the user) — `apps/web` is UX/visual design work, not yet wired up, and wiring it is **not currently a priority**; do not "fix" this without being explicitly asked. `README.md`'s "mobile is the least mature app" line refers to UI polish, not backend integration — mobile's integration is the more complete of the two. See `spec/roadmap.md` → Build Status for the full per-feature, per-surface table.

## Tech Stack

- **Web:** React + Vite + Tailwind, `react-router-dom`. No state library — confirmed no Zustand usage anywhere in `apps/web` (2026-08-23); each page holds its own local `useState` over the imported dummy data.
- **Mobile:** Expo SDK 57, `expo-router` (file-based routing, `(auth)`/`(tabs)` groups), Zustand for state — one store per feature (`chatStore`, `healthStore`, `portfolioStore`, `alertsStore`, `analyzerStore`, `sentimentStore`, `appStore`), each backed by the real `apps/api` via `src/api/client.ts` (`axios`).

## Views / Screens (web — `apps/web/src/pages`, routes per `App.tsx`)

### Screen: Index (`/`)
**Purpose:** Public landing page.

### Screen: Auth (`/auth`)
**Purpose:** Supabase Auth sign-in/sign-up (built on existing auth, not rebuilt).

### Screen: BrokerConnect (`/broker-connect`, protected)
**Purpose:** Confirmed 2026-08-23 — a cosmetic, one-time onboarding gate, not the ruled-out broker auto-sync feature its name suggests. "Connect to Zerodha/Groww/etc" buttons don't call any real API; each one (and "Skip for now") just sets `onboarded: true` in Supabase `user_metadata` after a simulated `setTimeout` "Connected! Loading your portfolio…" toast, then redirects to Discover. Minor honesty concern (fake progress) per `harness/patterns/ui-ux.md` — low priority given the whole `apps/web` surface is an acknowledged prototype (see UI Type above).

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
**Key elements:** chat thread with hardcoded prompt chips.
**Confirmed 2026-08-23:** does not call `/chatbot/ask` — `handleSend`/`handlePrompt` append canned strings to local state, including one that literally reads "This is a prototype — real AI responses would appear here...". Consistent with `apps/web`'s overall dummy-data status (see UI Type above), not a bug to fix without being asked.

### Screen: Feed (`/app/feed`, protected)
**Purpose:** Sentiment Feed — portfolio-default news feed with search.

### Screen: Alerts (`/app/alerts`, protected)
**Purpose:** Create/view/delete score-threshold alerts; view triggered history (5-day visible window).

### Screen: ImpulseAnalyzer (`/app/impulse-analyzer`, protected)
**Purpose:** Impulse trade cost analysis — both against the user's real sold trades and (per `routers/analyzer.py`) a custom hypothetical-trade input.

### Screen: NotFound (`*`)
**Purpose:** 404 fallback.

## Views / Screens (mobile — `apps/mobile/app`)

Tab group (`(tabs)/`), each backed by its own store and the real API (confirmed 2026-08-23): `index` (Discover, `useAppStore`), `portfolio` (`usePortfolioStore`), `health` (Portfolio Health, `useHealthStore` — includes a Bottleneck Report handoff that navigates to the `chat` tab and auto-sends the report as a chat prompt), `impulse` (`useAnalyzerStore`), `alerts` (`useAlertsStore`), `chat` (Ask AI, `useChatStore`, real streaming), `news` (Sentiment Feed, `useSentimentStore`). Auth group (`(auth)/login`). Standalone: `stock/[symbol]`, `modal`, `auth-callback`.

**`two.tsx` is confirmed dead code** — unmodified Expo template scaffold ("Tab Two" placeholder, `EditScreenInfo`), explicitly hidden from the tab bar in `_layout.tsx` (`href: null`) and unreachable by any user action. Candidate for removal.

**Known gap — no markdown rendering in `chat.tsx`:** the chatbot's response renders through a plain `<Text>` node (`item.content`), not a markdown parser. Groq's synthesis prompt uses `• [Read Article](url)`-style links for news citations (`spec/agent.md`) — these will show as literal bracket/paren text on-device rather than a tappable link. Violates `harness/patterns/ui-ux.md`'s markdown-rendering rule for chat surfaces.

## Error States

Not verified screen-by-screen during this migration. `harness/patterns/ui-ux.md` (once ported) sets the bar every screen should be checked against: empty / loading / error / populated states all designed, errors in plain language (never a raw stack trace), destructive actions (delete holding, delete alert) confirm before executing.

## Cross-Cutting UI Rules (from `PRODUCT_CONTEXT.md`, apply on every screen showing scores)

- Score color bands: Red <40, Amber 41-65, Green 66-100 — must be visually consistent across Discover, StockDetail, Portfolio Health, and anywhere else a score renders
- Three holding-period labels (Short/Medium/Long) must read identically everywhere they appear — no per-screen wording drift
