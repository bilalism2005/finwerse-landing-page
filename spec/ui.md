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

**Nav shell restructuring, in progress (started 2026-08-25):** the tab bar is moving from 7 direct tabs to a **5-tab structure** — Home, Portfolio, Health, Ask AI, More — as part of the visual redesign above. This is a navigation-shell change, not a redesign of every screen behind it: **Home and Stock Detail are the only screens redesigned in this pass so far.** Portfolio, Health, Alerts, Impulse Analyzer, and Sentiment Feed keep their EXISTING implementation unchanged for now (they get their own screen-by-screen design passes later) even though three of them (Alerts, Impulse Analyzer, Sentiment Feed) move from being direct tabs to being reached via the new More screen.

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

Auth group (`(auth)/login`). Standalone: `stock/[symbol]` (Stock Detail — **redesigned this pass**, full spec below; Home's ranked-row tap target navigates here), `modal`, `auth-callback`.

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

### Screen: Stock Detail (`stock/[symbol].tsx`) — REDESIGNED 2026-08-25

**Purpose:** Give the user the full picture on one specific stock — its score, why it scored that way, and (once built) its price action and supporting evidence — reached from Home's ranked-row tap target or a search result. Same underlying feature (Feature 1, Stock Analytics Dashboard, `spec/roadmap.md` Build Status row 1) as Home; this is the detail view Home links to. See also `spec/capabilities/stock-analytics-dashboard.md`.

**Data source — real data, presentation-only redesign for the score sections:** `GET /stocks/{symbol}/score` (`timeframe` param — `spec/api.md`), already wired via `getStockDetailScore` (`src/api/stockService.ts`). Response: `{symbol, timeframe, overall, technical, safety, sentiment, last_updated}`. No new endpoint, no new wiring for the score hero or pillar breakdown. The price/chart, signal-drivers, and disclosure sections below have **no backing endpoint today** — spec'd here as honest visual stubs per `harness/patterns/ui-ux.md`'s honesty rule, not as newly-wired features.

**Structure (top to bottom):**

1. **Header row.** Back button — chevron-left, same 38x38 `#131613` rounded-icon pattern as Home's header icon, navigates back. Ticker, 28px/700 weight (RN `fontWeight` string, matching Home's established workaround), left-aligned; directly below it, company descriptor "· NSE" at 13.5px, `#A4AAA3`. Right-aligned: favorite/watch toggle button, same 38x38 rounded-icon pattern, star icon — outline `#A4AAA3` when unfavorited, filled lime `#C7FF3D` when favorited. **Functional, but session-local only:** tapping toggles local component state; there is no `Watchlist` table or endpoint in `spec/data.md`/`spec/api.md` today, so the favorited state does not persist across app restarts or sync across devices. This is a known, deliberate limitation for this pass, not a bug — flagged in `spec/capabilities/stock-analytics-dashboard.md` as future work.

2. **Timeframe control.** Carried over from the existing screen (the short/medium/long pill switcher), restyled to Home's segmented-control token (track `#131613`; selected: lime `#C7FF3D` background, `#090B0A` text; unselected: transparent background, `#A4AAA3` text) instead of its current ad hoc emoji-pill styling. Still the same 3-way selector driving the `timeframe` query param on `GET /stocks/{symbol}/score` — no behavior change, presentation-only. **Assumed:** the source design brief for this screen doesn't explicitly re-spec this control (it starts from the score hero downward), but the screen cannot drop it — timeframe scoping is a Standing Platform Rule (three fixed buckets) and the score hero/pillar breakdown are timeframe-scoped data that has to come from somewhere. Confirm this restyle-in-place treatment is what's intended.

3. **Score hero.** Large score, 50px/600 weight, tabular-nums, colored per the standing score bands (Red <40, Amber 41-65, Green 66-100), immediately followed by "/ 100" in `#6F766F` (fixed literal suffix text for this element — displays the real -100..100 `overall` value un-rescaled; the "/ 100" is decorative copy for this element only, not a claim the scale is 0-100. This intentionally differs from Home's own score-domain label wording — different UI elements with different appropriate phrasing, not a fact to reconcile between them). Below it, a status pill: dot + "{status} momentum" text.

   **Status pill mapping (3-way, tied to the standing color bands — decided here since the design brief only gave one positive-band example):**

   | Band | Score range | Status word | Pill text | Color (dot + text) |
   |---|---|---|---|---|
   | Green | 66-100 | Strong | "Strong momentum" | lime `#C7FF3D` — matches the design brief's own literal example and the Design System token table's "positive-momentum" allowed use of the accent color |
   | Amber | 41-65 | Steady | "Steady momentum" | Warning `#FFB84D` |
   | Red | <40 | Weak | "Weak momentum" | Negative `#FF6B67` |

   "Steady" and "Weak" are chosen to fit the brief's own "{status} momentum" grammatical pattern while staying descriptive rather than a raw judgment (Design System philosophy: "Needs attention," not "Bad"); none of the three imply buy/sell/avoid/invest (Standing Platform Rule 1).

4. **Price + chart section — STUB.** Occupies the same layout position the design calls for (current price, daily change, % change near the score; a line chart below with 1D/1W/1M/3M/1Y segments, minimal gridlines, scrub-to-see-tooltip) but renders a labelled placeholder instead: the price/change area shows "Price data coming soon" (or equivalent honest copy) where the numbers would sit; the chart area shows a static placeholder (e.g. a flat/faded line-chart glyph) plus the same "coming soon" copy where the interactive chart would render. If the 1D/1W/1M/3M/1Y segment control renders at all in this stub, it renders visibly disabled/non-interactive — never a live-looking control with no real behavior behind it. No invented price, daily change, percentage change, or chart series anywhere. No price-fetching code or endpoint exists anywhere in `apps/mobile` or `spec/api.md` today — this section adds zero new wiring.

5. **"Why this score?" section.** Heading "Why this score?", 19px/650 weight. Three pillar rows — Technical, Safety, Sentiment, in that order — each: label (left) + numeric value (right-aligned, colored per the standing score bands) or "Not Available" text (existing behavior, restyled, not changed — per `spec/data.md`, `sentiment_score_*` is the only pillar field that can hold `"Not Available"`; `technical_score_*`/`safety_score_*` are always numeric) + a one-line explanatory note below the label + an optional thin progress bar (track `#1A1E1A`, filled lime `#C7FF3D`, present only when the pillar has a numeric value; absent — not zero-width — when "Not Available"). Progress bar width uses the same -100..100-to-0-100% normalization as Home's signal-strength bar: `(score + 100) / 2`.

   **Explanatory note mapping (deterministic, band-derived — decided here since the backend returns no free-text explanation for any pillar):**

   | Pillar | Green (66-100) | Amber (41-65) | Red (<40) | Not Available |
   |---|---|---|---|---|
   | Technical | "Strong price structure and momentum" | "Mixed price signals, no clear direction" | "Weak price structure, momentum under pressure" | n/a — always numeric |
   | Safety | "Strong financial stability" | "Average financial stability" | "Financial stability concerns" | n/a — always numeric |
   | Sentiment | "Strong positive sentiment" | "Mixed sentiment signals" | "Weak sentiment signals" | "No recent signal" |

   The Technical-Green and Safety-Amber notes match the design brief's own given copy exactly ("Strong price structure and momentum," "Average financial stability"); the Not Available copy uses "No recent signal" per the brief's own explicit rule (not "N/A," not "Insufficient recent signal" — avoids false precision, matches the existing screen's already-correct N/A handling, which this redesign keeps and only restyles). None of these notes use buy/sell/avoid/invest framing (Standing Platform Rule 1) — they describe the stock's signal state, never an instruction to the user.

6. **Signal drivers section — STUB.** Same tappable-evidence-row visual shape the design calls for: label (Momentum / Trend strength / Volume confirmation / Financial safety) + right-aligned status text + trailing chevron, `#1A1E1A` row dividers. Right-aligned status text reads "Coming soon" in `#6F766F` for every row instead of a real status value; rows render (so the section doesn't look broken or missing) but are not tappable — no destination exists yet — and the trailing chevron renders in a dimmed/disabled visual state rather than a live-looking dead control. No invented driver values or status words (e.g. never fabricate "Bullish"/"Confirmed" text for a row with no real data behind it).

7. **"More on this stock" section — STUB.** Heading "MORE ON THIS STOCK", 12px, letter-spaced, `#6F766F`. Five expandable disclosure rows, in this order: Fundamentals, Earnings & financials, News & sentiment, Peer comparison, Score history. Each row: label + trailing chevron that rotates on expand (same interaction pattern as any other disclosure row in the app). Expanding any row reveals a "Coming soon — this section isn't available yet" (or equivalent honest copy) stub body instead of real content — no invented fundamentals, earnings, news, peer-comparison, or score-history data anywhere in the expanded body.

**States** (per `harness/patterns/ui-ux.md`'s bar):
- **Loading:** header (back button, ticker, favorite toggle) and the timeframe control render immediately; the score hero and "Why this score?" section show a skeleton (matching their final shape) while `GET /stocks/{symbol}/score` resolves. The stub sections (price/chart, signal drivers, more-on-this-stock) render their stub treatment immediately — they have no network call to wait on.
- **Error/retry:** `GET /stocks/{symbol}/score` fails (including `404` — symbol not found) — human copy naming what failed ("Couldn't load {symbol}'s score. Please try again." or, for a 404 specifically, "We don't have data for {symbol}.") plus a tap-to-retry action, scoped to the score-hero/pillar area only (header, timeframe control, and stub sections still render — an error on the score fetch doesn't blank the whole screen). Never a raw error body or stack trace.
- **Populated:** score hero + pillar breakdown render real data; stub sections render their stub treatment (the stub treatment is the designed-for state for those sections this pass, not an in-between state waiting to resolve into something else).

**Success Criteria**
- [ ] Header, timeframe control, score hero, and "Why this score?" section render using only Design System tokens — no ad hoc colors/sizes.
- [ ] Switching the timeframe control re-fetches `GET /stocks/{symbol}/score` for the newly selected timeframe and updates the score hero + pillar breakdown; behavior is unchanged from the existing implementation, only presentation changes.
- [ ] The status pill's text/color follows the 3-way mapping above exactly, matching the standing score-band thresholds (Red <40, Amber 41-65, Green 66-100) — no new threshold invented.
- [ ] Each pillar row's explanatory note and progress-bar presence/absence follow the deterministic mapping above; "Not Available" never renders as `0` or with a filled progress bar.
- [ ] The favorite toggle changes visual state on tap (star outline ↔ filled lime), does not error or crash, and does not persist across an app restart (no backend call, by design this pass).
- [ ] The price/chart, signal drivers, and more-on-this-stock sections all render in their stub treatment with no invented numbers, prices, chart data, driver statuses, or disclosure content anywhere — a user cannot mistake any stub for real data or for a broken screen (per `harness/patterns/ui-ux.md`'s honesty rule).
- [ ] All 3 states (loading, error/retry, populated) render distinctly and are reachable via a real interaction (a failed/slow request, a valid symbol).

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
