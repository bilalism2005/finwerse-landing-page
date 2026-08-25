# UI

## UI Type

Two clients, both built to consume the same `apps/api` REST surface via `packages/shared` (Supabase client + `AuthContext`): a web dashboard (`apps/web`, React + Vite + Tailwind, React Router) and a mobile app (`apps/mobile`, Expo SDK 57 + `expo-router`).

**Confirmed 2026-08-23 (drift audit) — only `apps/mobile` actually calls `apps/api` today.** `apps/web` is a deliberate static-data prototype: every page renders from `lib/dummyData.ts`, with zero `fetch`/`axios` calls anywhere in `apps/web/src` and no backend URL configured in `.env.example`. This is intentional (confirmed with the user) — `apps/web` is UX/visual design work, not yet wired up, and wiring it is **not currently a priority**; do not "fix" this without being explicitly asked. `README.md`'s "mobile is the least mature app" line refers to UI polish, not backend integration — mobile's integration is the more complete of the two. See `spec/roadmap.md` → Build Status for the full per-feature, per-surface table.

## Tech Stack

- **Web:** React + Vite + Tailwind, `react-router-dom`. No state library — confirmed no Zustand usage anywhere in `apps/web` (2026-08-23); each page holds its own local `useState` over the imported dummy data.
- **Mobile:** Expo SDK 57, `expo-router` (file-based routing, `(auth)`/`(tabs)` groups), Zustand for state — one store per feature (`chatStore`, `healthStore`, `portfolioStore`, `alertsStore`, `analyzerStore`, `sentimentStore`, `appStore`), each backed by the real `apps/api` via `src/api/client.ts` (`axios`).

## Design System — Mobile Redesign (in progress, started 2026-08-25)

`apps/mobile` is adopting a full visual redesign, screen by screen, from an approved Claude Design prototype ("Finwerse Interactive Prototype," governing doc `00_MASTER_DESIGN_PROMPT.md`). This section is the **authoritative token reference** for that redesign — every screen spec touched by this initiative points back here instead of restating values. Screens not yet reached by the redesign keep their existing implementation and are **not** expected to match these tokens yet (see per-screen status in "Views / Screens (mobile)" below).

**Color**
| Token | Value | Use |
|---|---|---|
| Canvas background | `#090B0A` | Screen background |
| Elevated surface | `#131613` | Cards, inputs, segmented-control track |
| Secondary surface | `#191D19` | Nested/secondary surfaces |
| Divider (subtle) | `#1A1E1A` | Row dividers, subtle borders |
| Divider (stronger) | `#2A2E2A` | Stronger separators |
| Text primary | `#F5F7F2` | Headlines, primary values |
| Text secondary | `#A4AAA3` | Body/secondary copy |
| Text tertiary | `#6F766F` | Metadata, placeholders, muted labels |
| Accent (lime) | `#C7FF3D` | **Selected / actionable / primary-interaction / positive-momentum only — never decorative** |
| Positive | `#B8F35A` | Positive momentum indicators |
| Negative | `#FF6B67` | Negative momentum indicators |
| Warning | `#FFB84D` | Warning/caution indicators |

The score color bands are **unchanged by this redesign** and still apply everywhere a score renders (Red <40, Amber 41-65, Green 66-100 — see Cross-Cutting UI Rules below and `spec/roadmap.md` Key Constraints). The semantic colors above (positive/negative/warning) are for momentum/status language on top of the redesign's own visual system, not a replacement for the score bands.

**Type** (SF Pro / system font)
| Role | Size/weight |
|---|---|
| Screen title | 28-34pt semibold (this redesign uses ~30px/650 weight) |
| Major score | 44-56pt |
| Section title | 18-20pt semibold |
| Body | 15-17px |
| Metadata | 12-13px |
| Micro-labels | 10-11px, used sparingly — not the default for anything load-bearing |

**Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40

**Corner radius:** small controls 10-12, standard surfaces 14-18, hero surfaces 20-24

**Motion:** micro-interactions 120-250ms; meaningful transitions 250-450ms; spring-based for interactive movement. Respects reduce-motion per `harness/patterns/ui-ux.md`'s accessibility bar.

**Philosophy:** calm, premium, precise — not a generic fintech dashboard. Avoid excessive cards, glassmorphism, neon-everywhere, dashboard grids, decorative gradients, fake urgency. Score/ranking language stays descriptive, never a raw judgment ("Needs attention," not "Bad") and never buy/sell framing (Standing Platform Rule 1) — ranking creates curiosity, it never says "BUY THIS."

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

**Nav shell restructuring, in progress (started 2026-08-25):** the tab bar is moving from 7 direct tabs to a **5-tab structure** — Home, Portfolio, Health, Ask AI, More — as part of the visual redesign above. This is a navigation-shell change, not a redesign of every screen behind it: **only Home's own screen content is redesigned in this pass.** Portfolio, Health, Alerts, Impulse Analyzer, and Sentiment Feed keep their EXISTING implementation unchanged for now (they get their own screen-by-screen design passes later) even though three of them (Alerts, Impulse Analyzer, Sentiment Feed) move from being direct tabs to being reached via the new More screen.

| Tab (file) | Screen | Status | Store / notes |
|---|---|---|---|
| Home (`index.tsx`) | Home (formerly "Discover") | **Redesigned this pass** — full spec below | `useAppStore`; data unchanged — still `GET /stocks/top` + `GET /stocks/search` (`spec/api.md`) |
| Portfolio (`portfolio.tsx`) | Portfolio | Unchanged implementation; reachable via new tab bar | `usePortfolioStore` |
| Health (`health.tsx`) | Portfolio Health | Unchanged implementation; reachable via new tab bar | `useHealthStore`, incl. Bottleneck Report handoff that navigates to the Ask AI tab and auto-sends the report as a chat prompt |
| Ask AI (`chat.tsx`) | Ask AI Chatbot | Content unchanged; tab position/icon updated to match the new design system | `useChatStore`, real streaming — see `spec/agent.md` |
| More (`more.tsx`, new) | More menu | **New screen, this pass** — full spec below | No store; static navigation menu |

Reached via More (not tabs) — same screen, same store, same content as before, only the entry point moves out of the tab bar, using the same `href: null`-from-tab-bar pattern already used for `two.tsx`:
- Alerts (`alerts.tsx`, `useAlertsStore`)
- Impulse Analyzer (`impulse.tsx`, `useAnalyzerStore`)
- Market News / Sentiment Feed (`news.tsx`, `useSentimentStore`)

Auth group (`(auth)/login`). Standalone: `stock/[symbol]` (Stock Detail — unchanged, not part of this redesign pass; Home's ranked-row tap target navigates here), `modal`, `auth-callback`.

**`two.tsx` is confirmed dead code** — unmodified Expo template scaffold ("Tab Two" placeholder, `EditScreenInfo`), explicitly hidden from the tab bar in `_layout.tsx` (`href: null`) and unreachable by any user action. Candidate for removal, unaffected by the nav restructuring above.

**Known gap — no markdown rendering in `chat.tsx`:** the chatbot's response renders through a plain `<Text>` node (`item.content`), not a markdown parser. Groq's synthesis prompt uses `• [Read Article](url)`-style links for news citations (`spec/agent.md`) — these will show as literal bracket/paren text on-device rather than a tappable link. Violates `harness/patterns/ui-ux.md`'s markdown-rendering rule for chat surfaces. Unaffected by the redesign — still applies to the unchanged `chat.tsx` screen.

### Screen: Home (`index.tsx`) — REDESIGNED 2026-08-25

**Purpose:** Help the user discover the most interesting stocks quickly — within 2-3 seconds, understand what market view they're seeing, which timeframe is active, which stocks are strongest, and each stock's relative strength. Replaces the old card-grid "Discover" list entirely; same underlying feature (Feature 1, Stock Analytics Dashboard, `spec/roadmap.md` Build Status row 1).

**Data source — unchanged, no new wiring:** ranked list from `GET /stocks/top` (`score_type=overall` fixed, `timeframe` = the selected horizon, `limit=10` — `spec/api.md`); search from `GET /stocks/search` (`q`, `timeframe`). Both already wired via `stockService.ts` / `useAppStore`. This is a presentation-only redesign — the data layer does not change.

**Structure (top to bottom):**
1. **Header row.** "Finwerse" wordmark, 30px/650 weight, left-aligned. Right-aligned: a 38x38px rounded-icon notification/status control. Confirmed inert-for-now (`noop` in the source prototype) but must render as a real, tappable element with visible press feedback — not a dead-looking decoration. No destination/behavior defined yet; do not wire it to anything.
2. **Search field.** Background `#131613`, 12px radius, no heavy border, leading search icon, placeholder "Search stocks, e.g. RELIANCE" in `#6F766F`.
3. **Time horizon control.** 3-way segmented control (Short / Medium / Long), track background `#131613`. Selected segment: lime `#C7FF3D` background, `#090B0A` text. Unselected: transparent background, `#A4AAA3` text.
4. **Context sentence**, 13px, `#A4AAA3`, directly below the segmented control, changes with the selected horizon. Exact copy, no paraphrasing:
   - Short: "Short-term reads use daily signals. Momentum names lead this view."
   - Medium: "Medium-term signals are strongest this week. Higher score means a stronger setup."
   - Long: "Long-term reads weight financial safety and durable trends more heavily."
5. **Section header row.** "Strongest signals" left (19px/650). Right: 12px, `#6F766F` — exact text per the "Flagged — score scale conflict" note below.
6. **Ranked list** (replaces the old card grid entirely). Each row:
   - 2-digit rank (`01`, `02`, …), 12px, `#6F766F`, tabular figures
   - Ticker, 16px/600
   - One-line descriptor, 12.5px, `#6F766F` — populated from the existing `sector` field already returned by `GET /stocks/top` (`spec/api.md`); no new field, no new wiring
   - Thin 3px signal-strength bar: track `#1A1E1A`, filled portion lime `#C7FF3D` at 85% opacity — width formula per the "Flagged — score scale conflict" note below
   - Right-aligned score, 22px/650, tabular figures — displayed as the raw score value (per the same note below), with a one-word status label directly below it: **"Strong"** in lime `#C7FF3D` if the score is in the Green band (≥66, same threshold as the standing color bands), **"Building"** in `#A4AAA3` otherwise (Amber/Red) — see the "Strong/Building threshold" note below
   - Row divider: 1px `#1A1E1A`; vertical padding 16px; press feedback: scale to ~0.985
7. Tapping a row navigates to Stock Detail (`stock/[symbol]`) — **unchanged, not part of this pass**; only the navigation call site moves into the new row component.

> **Flagged — score scale conflict (needs user confirmation, not silently resolved):** the source design brief's copy ("Score 0–100" section-header label, and "width = the stock's score as a percentage") was written against a 0-100 mock. finwerse's real `overall_score` is **-100..100** (`spec/data.md`, and Standing Platform Rule 2: "all scores -100 to +100, same color bands everywhere"). Per that platform rule, this spec keeps the raw -100..100 value as the displayed score (not rescaled to 0-100, matching StockDetail and every other score display in the app) and normalizes the signal-strength bar's width as `(score + 100) / 2` (mapping the -100..100 domain to a 0-100% bar width) rather than treating the raw score as a literal percentage. The section-header label should read **"Score -100 to 100"** (or an equivalently accurate short label — exact wording is `code-generator`'s call within this constraint) instead of the brief's literal "Score 0–100," which would misstate the actual score domain to users. **Assumed: this resolution (raw score displayed, band-based bar normalization, corrected header label) — confirm before or during build**, since it deviates from the literal design-brief copy given, in favor of Standing Platform Rule 2.
>
> **Assumed — "Strong"/"Building" threshold:** the design brief specifies the two status words but not the cutoff between them. This spec ties it to the existing Green color-band threshold (≥66) rather than inventing a new cutoff, since that threshold is already the app's standing definition of "good" (`spec/roadmap.md` Key Constraints). Confirm this mapping is what's intended, or provide a different threshold.

**States** (per `harness/patterns/ui-ux.md`'s bar — all required, not just the populated case):
- **Loading (initial):** header, search field, and segmented control render immediately (never blocked); the ranked-list area shows a skeleton (5-6 placeholder rows matching the row layout's shape) while `GET /stocks/top` resolves. Existing implementation already renders from local cache first when present (0ms) before the fresh fetch — preserve that pattern; only its visual treatment changes.
- **Search-active:** search field is focused/non-empty. The segmented control and context sentence stay visible and interactive (search stays scoped to the selected timeframe, per `searchStocks(query, timeframe)`); the section header + ranked list swap for a "Search results" section header and search-result rows.
- **Search-results (populated):** search rows reuse the same row visual language (ticker, right-aligned score) but omit the rank digit and signal-strength bar, since `GET /stocks/search`'s response shape (`{"symbol", "overall_score"}`, `spec/api.md`) doesn't carry the sector/descriptor or ranking data the strength bar needs.
- **No-results:** query is 2+ characters and `GET /stocks/search` returns an empty array — explanatory copy in the list area (e.g. "No stocks match '{query}'. Try a different ticker or company name."), never a blank panel.
- **Empty-market-state:** `GET /stocks/top` returns an empty list for the selected timeframe (e.g. batch hasn't populated that bucket yet) — explanatory empty state (e.g. "No ranked signals yet for this timeframe. Check back after today's market update."), not a blank list.
- **Error/retry:** `GET /stocks/top` fails — human copy naming what failed plus a tap-to-retry action (existing implementation already does this: "Failed to load stocks. Please pull down to retry." / tap-to-retry box) — redesign restyles this to the new tokens, behavior unchanged. Never a raw error body or stack trace.

**Success Criteria**
- [ ] All 6 structural elements (header, search, segmented control, context sentence, section header, ranked list) render using only the Design System tokens above — no ad hoc colors/sizes.
- [ ] Switching the segmented control changes the context sentence copy to the exact text specified and re-fetches `GET /stocks/top` for the newly selected timeframe.
- [ ] Each ranked row's signal-strength bar width and score display are consistent with the -100..100 scale resolution above (no negative-width bars, no rescaled-looking score number).
- [ ] All 6 states (loading, search-active, search-results, no-results, empty-market-state, error/retry) render distinctly and are reachable via a real interaction (typing a query, an empty API response, a failed request).
- [ ] Tapping a ranked row or a search result navigates to `stock/[symbol]` for that ticker.
- [ ] The header's right-side icon-button is tappable with visible press feedback and does nothing else (no dead-looking static icon, no wired destination).

### Screen: More (`more.tsx`, new) — NEW 2026-08-25

**Purpose:** Menu screen replacing the 3 tabs (Alerts, Impulse Analyzer, Sentiment Feed) that no longer fit in the 5-tab bar — lets the user reach them without shrinking the tab bar below 5 items.

**Structure:** Screen title ("More"), using the Design System's screen-title type token, followed by a simple vertical list of navigable rows — one per moved screen: Alerts, Impulse Analyzer, Market News. Each row: icon + label (body text token) + trailing chevron, `#1A1E1A` row dividers, surfaces per the Design System's elevated-surface token. Tapping a row navigates to that screen's existing route (`alerts.tsx`, `impulse.tsx`, `news.tsx` respectively) — those screens' content is unchanged.

**States:** static menu, no network call — only the populated state applies (no loading/error/empty needed).

**Success Criteria**
- [ ] All 3 rows (Alerts, Impulse Analyzer, Market News) are present and each navigates to its corresponding existing, unmodified screen.
- [ ] Row visuals use only Design System tokens (no ad hoc colors/sizes).

## Error States

Not verified screen-by-screen during this migration. `harness/patterns/ui-ux.md` (once ported) sets the bar every screen should be checked against: empty / loading / error / populated states all designed, errors in plain language (never a raw stack trace), destructive actions (delete holding, delete alert) confirm before executing.

## Cross-Cutting UI Rules (from `PRODUCT_CONTEXT.md`, apply on every screen showing scores)

- Score color bands: Red <40, Amber 41-65, Green 66-100 — must be visually consistent across Discover/Home, StockDetail, Portfolio Health, and anywhere else a score renders
- Three holding-period labels (Short/Medium/Long) must read identically everywhere they appear — no per-screen wording drift
- For screens under the mobile visual redesign (see "Design System — Mobile Redesign" above), color bands render using the redesign's palette (positive/negative/warning tokens) but the band **thresholds** never change — Red/Amber/Green cutoffs stay exactly as above regardless of which color tokens paint them
