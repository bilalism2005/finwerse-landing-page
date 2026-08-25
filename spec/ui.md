# UI

## UI Type

Two clients, both built to consume the same `apps/api` REST surface via `packages/shared` (Supabase client + `AuthContext`): a web dashboard (`apps/web`, React + Vite + Tailwind, React Router) and a mobile app (`apps/mobile`, Expo SDK 57 + `expo-router`).

**Confirmed 2026-08-23 (drift audit) — only `apps/mobile` actually calls `apps/api` today.** `apps/web` is a deliberate static-data prototype: every page renders from `lib/dummyData.ts`, with zero `fetch`/`axios` calls anywhere in `apps/web/src` and no backend URL configured in `.env.example`. This is intentional (confirmed with the user) — `apps/web` is UX/visual design work, not yet wired up, and wiring it is **not currently a priority**; do not "fix" this without being explicitly asked. `README.md`'s "mobile is the least mature app" line refers to UI polish, not backend integration — mobile's integration is the more complete of the two. See `spec/roadmap.md` → Build Status for the full per-feature, per-surface table.

## Tech Stack

- **Web:** React + Vite + Tailwind, `react-router-dom`. No state library — confirmed no Zustand usage anywhere in `apps/web` (2026-08-23); each page holds its own local `useState` over the imported dummy data.
- **Mobile:** Expo SDK 57, `expo-router` (file-based routing, `(auth)`/`(tabs)` groups), Zustand for state — one store per feature (`chatStore`, `healthStore`, `portfolioStore`, `alertsStore`, `analyzerStore`, `sentimentStore`, `appStore`), each backed by the real `apps/api` via `src/api/client.ts` (`axios`).

## Design System — Mobile Redesign (in progress, started 2026-08-25)

`apps/mobile` is adopting a full visual redesign, screen by screen, from an approved Claude Design prototype ("Finwerse Interactive Prototype," governing doc `00_MASTER_DESIGN_PROMPT.md`). This section is the **authoritative token reference** for that redesign — every screen spec touched by this initiative points back here instead of restating values. Screens not yet reached by the redesign keep their existing implementation and are **not** expected to match these tokens yet (see per-screen status in "Views / Screens (mobile)" below).

### Palette source — replaced 2026-08-25 (Color Hunt `222831-393e46-00adb5-eeeeee`)

**Superseded:** the dark theme originally shipped with an internally-designed near-black/lime palette (`#090B0A` canvas, `#C7FF3D` lime accent, etc. — see git history for the exact prior values). That palette is now **replaced in full** by a 4-color Color Hunt source palette the user supplied: [colorhunt.co/palette/222831393e4600adb5eeeeee](https://colorhunt.co/palette/222831393e4600adb5eeeeee) — `#222831` (rich navy-black, darkest, dominant), `#393E46` (deep charcoal), `#00ADB5` (vibrant teal), `#EEEEEE` (soft light gray). This is a values-only replacement — the 12-role structure, the token mechanism (`ThemeTokens` interface, `darkTheme`/`lightTheme` objects — see "Theme mechanism" below), and every screen's presentation logic are unchanged; only the dark theme's own color values move. `apps/mobile/src/theme/tokens.ts`'s `darkTheme` object is the code file this maps onto (not touched by this spec pass — a follow-up implementation edit, per the same "spec first, code second" split every other capability in this repo follows).

**Direct mappings (2 of 4 colors are obvious 1:1 fits):**
- **Canvas background ← `#222831`** — the darkest, dominant color in the source palette; natural fit for the background role, replacing `#090B0A`.
- **Elevated surface ← `#393E46`** — the second color, visibly lighter than Canvas; natural fit for the surface role, replacing `#131613`.

**Derived (no direct source color; computed to preserve the existing theme's internal relationships, WCAG contrast ratios recomputed against the new Canvas/Elevated, not eyeballed):**

- **Secondary surface `#474B53`** — no 3rd neutral was supplied. Derived as a step lighter than Elevated, sized proportionally to the old theme's own Elevated→Secondary step (old theme: Elevated `#131613`→Secondary `#191D19` is a modest per-channel lightening, ≈1.07:1 contrast against Elevated). Applying the same proportional step to the new Canvas→Elevated delta gives `#474B53` — contrast ≈1.23:1 against Elevated (`#393E46`), ≈1.70:1 against Canvas (`#222831`): same "barely-there nested surface" character as the original, in the same cool navy-gray family (B>G>R channel ordering, matching Canvas/Elevated's own hue lean).
- **Divider (subtle) `#3E434B`** — derived by matching the old theme's subtle-divider-vs-Elevated contrast ratio almost exactly (old: ≈1.08:1 against Elevated `#131613`; new: ≈1.08:1 against Elevated `#393E46`, verified by direct computation, not just visual proximity). Against Canvas, new is ≈1.49:1 (old was ≈1.17:1) — a touch more visible against the raw background than the original, acceptable since dividers in this UI mostly sit on card/Elevated surfaces, not bare Canvas.
- **Divider (stronger) `#4D5258`** — derived the same way, targeting the old theme's stronger-divider-vs-Elevated ratio (old ≈1.32:1; new ≈1.36:1, close match) while staying visibly more separated from Canvas than the subtle divider (≈1.88:1 vs Canvas, vs the subtle divider's ≈1.49:1) — preserves the subtle/stronger step relationship the old theme had.
- **Text secondary `#9EA2A8`** — derived from the same step-down ratio the old theme's own Text primary→Text secondary contrast used (old: Text secondary's contrast-vs-Canvas was ≈45.5% of Text primary's contrast-vs-Canvas, a ratio that held consistently against both Canvas and Elevated). Applied to the new Text primary's contrast against the new Canvas (≈12.8:1), the target is ≈5.8:1 — `#9EA2A8` computes to ≈5.79:1 against Canvas and ≈4.20:1 against Elevated, with a slight cool tint (B>G>R) matching the palette family rather than a flat neutral gray.
- **Text tertiary `#6A6E74`** — same method, one more step down (old theme's Text secondary→Text tertiary ratio was ≈50.7-50.8%, consistent against both Canvas and Elevated). Target ≈2.9-3.0:1 against Canvas — `#6A6E74` computes to ≈2.89:1 against Canvas, ≈2.10:1 against Elevated. Both fall below AA's 4.5:1, matching the old theme's own tertiary token (`#6F766F`, ≈4.2:1 against its Canvas, ≈3.9:1 against its Elevated — also sub-AA), consistent with this role's stated use ("metadata, placeholders, muted labels" — never load-bearing body text).

**Kept as supplied, verified:**
- **Text primary `#EEEEEE`** — the obvious light-neutral candidate for readability against the dark Canvas/Elevated. Contrast: ≈12.8:1 against Canvas (`#222831`), ≈9.3:1 against Elevated (`#393E46`) — both clear WCAG AAA (7:1) for normal text, comfortably exceeding the old theme's own primary token (`#F5F7F2`, ≈18.3:1/16.9:1 — new is slightly lower since `#EEEEEE` is a hair less bright than `#F5F7F2`, but still far past the AAA floor).
- **Accent (teal) `#00ADB5`** — the obvious brand-accent candidate (the one vivid, saturated color in the source palette), same accent role the old lime `#C7FF3D` played and the light theme's olive `#5C6B2E` plays. Checked as a **UI-component fill** (the relevant ≥3:1 non-text threshold): ≈5.40:1 against Canvas, ≈3.92:1 against Elevated — both clear 3:1. Checked as **text**: ≈5.40:1 against Canvas clears AA normal text (4.5:1); ≈3.92:1 against Elevated does **not** clear AA normal text, only the 3:1 large-text/UI-component floor — teal-on-Elevated should be reserved for large/bold text or non-text UI (segmented-control fills, buttons, icons), not small body copy, a nuance the old lime accent didn't need to carry (lime cleared AA as text against both surfaces).

**On-accent text/icon color — worked out, not assumed:** unlike lime (`#C7FF3D`, very light — pairs with dark on-accent text) or olive (`#5C6B2E`, dark — pairs with light on-accent text), teal `#00ADB5` is a **mid-brightness** color, so both directions were checked rather than assumed from its hue alone. Light text (`#EEEEEE`) on teal: ≈2.37:1 — fails even the 3:1 large-text floor. Dark text, reusing the Canvas token (`#222831`) on teal: ≈5.40:1 — clears AA normal text (4.5:1) with room to spare. **Decision: on-accent text/icon color reuses the Canvas token `#222831`** (dark), following the same "reuse an existing token, don't invent a new on-accent role" principle the light theme's own olive-accent derivation established (there, on-accent reused the Elevated-surface token `#EEEEEE`). This tracks the general rule: WCAG's black/white contrast crossover for the sRGB relative-luminance formula sits at L≈0.179; teal's L≈0.332 is above that crossover, so dark text mathematically wins here, matching what the direct check found.

**Positive / Negative / Warning — kept unchanged (`#B8F35A` / `#FF6B67` / `#FFB84D`), not derived from the new palette.** The 4-color Color Hunt source has no red/green/amber-family colors to map these onto, and — same precedent the light theme itself already set — semantic status colors in this design system are a deliberately **separate system from the brand/accent palette**, not derived from it: the light theme's own Positive (`#3F7D4A`) was chosen specifically as "a distinct green hue... rather than a closer olive-green, specifically so momentum-positive status text/badges don't visually read as 'the accent color.'" Keeping the existing semantic trio unchanged here follows that same separation, and avoids a second unforced-approximation problem (there's no source hex to derive red/green/amber values from at all, unlike Accent/Text primary/Canvas/Elevated which had real source hexes to work from).

**Color table (12 roles — dark theme, current)**
| Token | Value | Use |
|---|---|---|
| Canvas background | `#222831` | Screen background |
| Elevated surface | `#393E46` | Cards, inputs, segmented-control track |
| Secondary surface | `#474B53` | Nested/secondary surfaces |
| Divider (subtle) | `#3E434B` | Row dividers, subtle borders |
| Divider (stronger) | `#4D5258` | Stronger separators |
| Text primary | `#EEEEEE` | Headlines, primary values |
| Text secondary | `#9EA2A8` | Body/secondary copy |
| Text tertiary | `#6A6E74` | Metadata, placeholders, muted labels |
| Accent (teal) | `#00ADB5` | **Selected / actionable / primary-interaction / positive-momentum only — never decorative.** On-accent text/icon color: reuses the Canvas token `#222831` (dark-on-teal — see derivation above). Reserve teal-as-text for large/bold text or Canvas-backed surfaces; on Elevated surfaces, prefer teal as a fill/icon, not small body text (see contrast note above). |
| Positive | `#B8F35A` | Positive momentum indicators (unchanged — see reasoning above) |
| Negative | `#FF6B67` | Negative momentum indicators (unchanged — see reasoning above) |
| Warning | `#FFB84D` | Warning/caution indicators (unchanged — see reasoning above) |

The score color bands are **unchanged by this redesign** and still apply everywhere a score renders (Red <40, Amber 41-65, Green 66-100 — see Cross-Cutting UI Rules below and `spec/roadmap.md` Key Constraints). The semantic colors above (positive/negative/warning) are for momentum/status language on top of the redesign's own visual system, not a replacement for the score bands.

**Known drift, flagged, not fixed in this pass:** the per-screen sections below ("Views / Screens (mobile)") were written against the *old* dark-theme literal hex values (`#090B0A`, `#131613`, `#191D19`, `#1A1E1A`, `#2A2E2A`, `#F5F7F2`, `#A4AAA3`, `#6F766F`, `#C7FF3D`) quoted directly in prose rather than referencing this table's token roles by name — a pre-existing "one fact restated in multiple places" issue this palette swap makes newly visible, not one it introduces. Every one of those hex mentions should be read as referring to the **token role** it names (e.g. "`#131613`" = the Elevated-surface role, now `#393E46`), not as a literal value to preserve. This pass deliberately does not rewrite every per-screen prose mention — that's a larger documentation cleanup (replace literal hex with token-role names throughout "Views / Screens (mobile)") tracked as its own follow-up, not bundled into this color-value change.

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

## Theming — Light Mode (spec'd 2026-08-25, not yet built)

**What this is:** a second, fully-designed color theme for `apps/mobile`, user-selectable **alongside** the dark theme above — additive, not a replacement. Every one of the 10 redesigned screens keeps its current dark-theme look by default; light mode is an opt-in the user switches to and can switch back from at any time. Only the **color** tokens differ between themes — Type, Spacing scale, Corner radius, and Motion tokens above are shared, unchanged, and apply identically under both themes.

### Source palette and background decision

The user supplied a 4-band swatch: olive green (largest/top band, the dominant color), orange (middle band), tan/beige `#D8C9A7`, light gray `#EEEEEE`. Only the tan and light-gray bands came with exact hex; olive green and orange were named/visual only, no hex given.

**Background: `#D8C9A7` (tan/beige), not `#EEEEEE`.** Reasoning:
- Both work from a pure contrast standpoint — `#D8C9A7` gives ≈9.5:1 contrast against a near-black text color (comfortably exceeds WCAG AA's 4.5:1, close to AAA), so accessibility does not force the choice either way.
- `#D8C9A7` is the more distinctive, on-brand choice: it's warm and earthy, cohering naturally with olive and orange as one palette family. `#EEEEEE` is a flat, generic light gray — indistinguishable from any default "light mode," which directly conflicts with the Design System's own stated philosophy above ("calm, premium, precise — not a generic fintech dashboard").
- Choosing tan over light-gray also gives `#EEEEEE` a real job to do rather than going unused: it becomes the **Elevated surface** token (see table below), preserving all 4 supplied colors as recognizable anchors instead of discarding two of them.

### Light theme token table

Mirrors the dark theme's 12 color roles exactly — same role set, no roles added or dropped. Olive green and orange had no supplied hex, so their values below are **derived/approximated from the described swatch bands, not picked from an exact source hex** — flagged for confirmation against the actual source image before build.

| Token | Value | Use |
|---|---|---|
| Canvas background | `#D8C9A7` | Screen background (supplied) |
| Elevated surface | `#EEEEEE` | Cards, inputs, segmented-control track (supplied — reused here, see background decision above) |
| Secondary surface | `#F7F4EC` | Nested/secondary surfaces — derived: a warm off-white, lighter than Elevated, mirroring the dark theme's own ordering where Secondary surface (`#474B53` as of the 2026-08-25 palette replacement, née `#191D19`) is lighter than Elevated (`#393E46`, née `#131613`) |
| Divider (subtle) | `#E2D9C2` | Row dividers, subtle borders — derived: a desaturated tan sitting between Canvas and Elevated, deliberately low-contrast against Elevated/Secondary surfaces (≈1.2:1), matching the dark theme's own near-invisible subtle divider |
| Divider (stronger) | `#C7B891` | Stronger separators — derived: a deeper tan-gray, modestly more visible (≈1.7:1 against Elevated) than the subtle divider, same relative jump the dark theme's two divider tokens make |
| Text primary | `#211F17` | Headlines, primary values — derived: a warm near-black (not flat `#000000`) that keeps the same undertone family as the tan/olive palette; ≈9-13:1 contrast against Canvas/Elevated |
| Text secondary | `#524C39` | Body/secondary copy — derived: a muted warm olive-gray; ≈5.2:1 against Canvas, ≈7.4:1 against Elevated (AA-safe on both) |
| Text tertiary | `#655D46` | Metadata, placeholders, muted labels — derived: lighter/more muted than Text secondary; ≈3.5:1 against Canvas, ≈4.9:1 against Elevated — same intentionally-lower tier of contrast the dark theme's own tertiary token (`#6A6E74` as of the 2026-08-25 palette replacement, née `#6F766F`, ≈2.9:1 against its current canvas) uses for this role |
| Accent (olive) | `#5C6B2E` | **Selected / actionable / primary-interaction / positive-momentum only — never decorative** (same restriction as the dark theme's lime) |
| Positive | `#3F7D4A` | Positive momentum indicators |
| Negative | `#B3413A` | Negative momentum indicators |
| Warning | `#BD722A` | Warning/caution indicators |

**Accent — olive green, confirmed against contrast, documented:** olive is the obvious accent candidate since it's the dominant supplied color, and it holds up under a WCAG check on the chosen `#D8C9A7` background: as a **fill** (selected segment, filled CTA), `#5C6B2E` reads clearly distinct against both Canvas and Elevated surfaces (≥3:1 non-text contrast, the relevant threshold for a UI-component boundary); as **text** on a surface, it clears AA (≈5-5.8:1 against Elevated/Secondary). One documented difference from the dark theme: at the time this light theme was spec'd, the dark theme's accent was lime (`#C7FF3D`), a *light* color pairing with dark **on-accent text** (reused the Canvas token, then `#090B0A`); as of the 2026-08-25 palette replacement the dark theme's accent is teal (`#00ADB5`, mid-brightness) which — worked out independently, not assumed — *also* pairs with dark on-accent text (now reusing Canvas `#222831`), since teal's luminance still sits above the WCAG light/dark contrast crossover point. Olive is a comparatively *dark* accent regardless of which dark-theme accent it's being contrasted against, so it needs the inverse pairing — **on-accent text/icon color reuses the Elevated-surface token `#EEEEEE`** (a light neutral), not a newly invented "on-accent" role, keeping the "reuse an existing token" principle the dark theme itself follows (both before and after its own palette replacement). Positive was deliberately chosen as a distinct green hue (`#3F7D4A`, blue-leaning) rather than a closer olive-green, specifically so momentum-positive status text/badges don't visually read as "the accent color" — the same separation the dark theme maintains between its accent (lime, then teal) and its unchanged, separately-sourced positive green.

**Orange → mapped to the Warning role, not a new "secondary highlight":** the dark theme's own Warning token (`#FFB84D`) is already an orange-amber, so the supplied orange band maps directly onto the existing Warning role rather than inventing a role the mirrored token table doesn't have. The exact value (`#BD722A`) is deepened from a brighter/more literal orange specifically to clear a 3:1 contrast floor against the light Elevated surface (a brighter orange, checked, fell to ≈2.9:1 — insufficient even for large/bold text) — same warm hue family as the source swatch, adjusted only for legibility.

**Assumed, flagged for confirmation:** the exact olive-green and orange hex values above (`#5C6B2E`, `#BD722A`) are this pass's best-judgment approximation of the swatch's described bands, since no hex was supplied for either. If the actual source image's olive/orange values differ meaningfully, update this table before `code-generator` builds against it — everything else in this table (background choice, accent-role assignment, warning-role mapping, derived neutrals) does not depend on getting that exact shade right.

### Theme mechanism (architecture)

**The problem this solves:** every one of the 10 redesigned screens currently defines its own local, hardcoded hex constants (e.g. `const COLOR_CANVAS = '#090B0A'`, copy-pasted per file — confirmed in `apps/mobile/app/(tabs)/more.tsx`, `index.tsx`, `chat.tsx`, and every other redesigned screen). There is no shared source for color today. Introducing a second theme requires a real shared mechanism — this is not just a spec addition, it's a genuine, sizeable follow-up **implementation** task across every screen (see "Follow-up build scope" below).

**Design, following `apps/mobile`'s existing conventions** (`harness/patterns/code.md`: `apps/mobile` state lives in `src/store/`, one Zustand store per concern — `chatStore`, `healthStore`, `portfolioStore`, etc., plus the existing app-wide `useAppStore` for cross-screen UI state like the selected timeframe). Theme selection is exactly this kind of app-wide UI state, so it follows the same pattern rather than introducing a React Context (the Context pattern in this codebase, `packages/shared`'s `AuthProvider`/`useAuth`, is reserved for state shared across `apps/web` **and** `apps/mobile`; theme is mobile-only, so it belongs in mobile's own `store/` convention, not in `packages/shared`):

- **`apps/mobile/src/theme/tokens.ts`** (new) — exports a `ThemeTokens` TypeScript interface with the 12 roles in the table above, plus two concrete objects, `darkTheme` (the existing Design System table, unchanged, moved here from being re-declared per screen) and `lightTheme` (the table above). Pure data, no React.
- **`apps/mobile/src/store/themeStore.ts`** (new) — a Zustand store, `useThemeStore`, holding `{ mode: 'dark' | 'light', setMode: (mode) => void }`, wrapped in Zustand's `persist` middleware (`zustand/middleware`, bundled with the `zustand` dependency already in `apps/mobile/package.json` — no new package) backed by `AsyncStorage` (`@react-native-async-storage/async-storage`, already a dependency, already used for Supabase session persistence in `apps/mobile/app/_layout.tsx` — same storage mechanism, new key) via `createJSONStorage`. A companion selector hook, `useThemeTokens()`, returns `mode === 'light' ? lightTheme : darkTheme` — this is the call every screen migrates to.
- **Default: `dark`.** Matches the just-completed Claude Design fidelity work — all 10 screens were visually tuned against the dark palette specifically; light is opt-in, not a forced switch for existing users.

**Follow-up build scope, explicitly not part of this spec pass:** every one of the 10 redesigned screens must migrate from its local hardcoded `COLOR_*` consts to `useThemeTokens()`. This is a real, per-screen code change (replace each local constant with a destructure off the hook's return value) across all 10 files, not a side effect of adding the store — `code-generator` should treat it as its own tracked unit of work per screen (or a single batch pass across all 10, mirroring how the original redesign itself was delivered screen-by-screen then batched), not something assumed to fall out "for free" from creating `themeStore.ts`.

### Toggle placement

**More screen (`apps/mobile/app/(tabs)/more.tsx`)** — the existing menu screen. Add an "Appearance" row below the 3 existing navigation rows (Alerts / Impulse Analyzer / Market News): a label ("Appearance") plus an inline 2-way segmented control (Dark / Light), same segmented-control visual language used everywhere else in the redesign (Home's timeframe control, Portfolio/Alerts/Impulse/News mode switchers). Not a navigation row — no chevron, no nested settings screen; selecting a segment calls `useThemeStore`'s `setMode` directly and the whole app re-renders under the new theme immediately. No confirmation step needed — this is a reversible, low-stakes preference toggle, not a destructive action.

### Success Criteria
- [ ] `apps/mobile/src/theme/tokens.ts` exports `darkTheme`, `lightTheme`, and a `ThemeTokens` type covering all 12 roles for both themes.
- [ ] `useThemeStore`'s `mode` persists across an app restart (survives a cold start after being changed) via `AsyncStorage`, defaulting to `'dark'` on first launch.
- [ ] The More screen's Appearance toggle switches `mode` and the change is visible without restarting the app.
- [ ] No screen renders a mix of light- and dark-theme tokens at once — switching modes updates every visible token-driven color on screen, not a partial subset.
- [ ] All 12 light-theme token roles are used somewhere reachable in the UI (no orphaned token defined but never applied) once the follow-up migration (above) is complete.

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

**Nav shell restructuring, started 2026-08-25, complete and shipped for all 9 screens:** the tab bar moved from 7 direct tabs to a **5-tab structure** — Home, Portfolio, Health, Ask AI, More — as part of the visual redesign above. Home, Stock Detail, and More shipped first (built and running); a second batch built the remaining 6 screens (Portfolio, Health, Ask AI, Alerts, Impulse Analyzer, Market News) against the same Design System tokens — **all built, qa-auditor-verified, and shipped as of 2026-08-25.** All 9 screens share one rule for this whole redesign: **presentation-only** — no screen in this initiative rewires its data layer; where the approved design calls for something with no real backing data (a chart, a metric, a detail view), that specific element is removed or simplified to what the app actually has, never stubbed as fabricated data or built as a "coming soon" placeholder (the one deliberate exception being Stock Detail's three sections, spec'd as honest stubs before this rule was made explicit for the rest of the redesign — see that screen's own entry for why).

**Login added to the initiative 2026-08-25 (10th screen, spec'd here — not yet built):** `(auth)/login.tsx` was outside the original Claude Design import scope (the governing prototype never covered it) and had no spec entry until a drift audit flagged the gap; the user decided to bring it into the redesign rather than mark it deliberately out of scope. Same presentation-only rule as the 9 screens above — see its own entry below.

| Tab (file) | Screen | Status | Store / notes |
|---|---|---|---|
| Home (`index.tsx`) | Home (formerly "Discover") | **Redesigned, shipped** — full spec below | `useAppStore`; data unchanged — still `GET /stocks/top` + `GET /stocks/search` (`spec/api.md`) |
| Portfolio (`portfolio.tsx`) | Portfolio | **Redesigned, shipped** — full spec below | `usePortfolioStore` |
| Health (`health.tsx`) | Portfolio Health | **Redesigned, shipped** — full spec below | `useHealthStore`, incl. Bottleneck Report handoff that navigates to the Ask AI tab and auto-sends the report as a chat prompt |
| Ask AI (`chat.tsx`) | Ask AI Chatbot | **Redesigned, shipped** — full spec below | `useChatStore`, real streaming — see `spec/agent.md` |
| More (`more.tsx`, new) | More menu | **New screen, shipped with Home/Stock Detail's batch** — full spec below | No store; static navigation menu |

Reached via More (not tabs) — same store, same underlying data as before, only the entry point moved out of the tab bar (using the same `href: null`-from-tab-bar pattern originally used for the now-deleted `two.tsx`); visual content **redesigned, shipped**, full spec below for each:
- Alerts (`alerts.tsx`, `useAlertsStore`)
- Impulse Analyzer (`impulse.tsx`, `useAnalyzerStore`)
- Market News / Sentiment Feed (`news.tsx`, `useSentimentStore`)

Auth group (`(auth)/login` — **added to the redesign 2026-08-25**, full spec below). Standalone: `stock/[symbol]` (Stock Detail — **redesigned this pass**, full spec below; Home's ranked-row tap target navigates here), `modal`, `auth-callback`.

**`two.tsx` (unmodified Expo template scaffold, "Tab Two" placeholder) has been deleted** — it was confirmed dead code (hidden from the tab bar via `href: null`, unreachable by any user action) and removed as part of the nav restructuring above.

**Known gap — no markdown rendering in `chat.tsx`:** the chatbot's response renders through a plain `<Text>` node (`item.content`), not a markdown parser. Groq's synthesis prompt uses `• [Read Article](url)`-style links for news citations (`spec/agent.md`) — these will show as literal bracket/paren text on-device rather than a tappable link. Violates `harness/patterns/ui-ux.md`'s markdown-rendering rule for chat surfaces. Not resolved by the Ask AI screen's 2026-08-25 redesign spec below (presentation-only — see that screen's own "Response layout" note for why no parsing was added this pass) — still an open gap once that redesign is built.

### Screen: Login (`(auth)/login.tsx`) — ADDED TO REDESIGN 2026-08-25 (spec'd, not yet built)

**Purpose:** Email/password and Google-native sign-in/sign-up — the app's pre-auth entry point, reached before any tab or nav shell exists. Omitted from the original Claude Design import scope (the redesign's governing prototype, `00_MASTER_DESIGN_PROMPT.md`, never covered it) and never got a spec entry until a 2026-08-23 drift audit flagged the gap; the user explicitly decided to bring it into the redesign rather than mark it deliberately out of scope. Because there is no design-brief section to work from for this screen (unlike the other 9), this entry restyles the existing, working implementation directly against the Design System tokens above — same rule as the rest of the initiative: presentation-only, no new functionality.

**Data source — unchanged, no new wiring:** `useAuth()` (`packages/shared`) — `signIn(email, password)`, `signUp(email, password)`, `signInWithGoogleNative(idToken)`, all Supabase-backed. Google native sign-in via `@react-native-google-signin/google-signin` (`GoogleSignin.signIn()`), unchanged. On success, `AuthGate` (`_layout.tsx`) redirects to `/(tabs)/` — unchanged. Presentation-only redesign; the tab toggle (Sign In/Sign Up), field validation, and both submit paths are untouched.

**Structure (top to bottom):**
1. **Wordmark.** "Finwerse", reusing the Design System's Screen-title type token (28-34pt semibold; this treatment uses the top of that range, 34px/650) rather than inventing a new size — but centered and standalone rather than left-aligned like Home's inline header, since this screen has no adjacent header chrome (no back button, no notification icon, no tab bar) for it to sit inline with. Text primary `#F5F7F2`, letter-spacing kept from the existing implementation. **Decision, documented:** the wordmark differs from Home's header treatment by layout/alignment only, not by introducing a new type size — Home's version is a left-aligned nav-bar element; this one is a centered pre-auth branding moment.
2. **Card.** Elevated surface `#131613`, hero-surface corner radius (20-24; this treatment uses 22), no border — dropping the existing `#1a1a1a` border entirely, consistent with the Design System's general preference for surface-color contrast over borders (same reasoning as Home's search field, which also has no border and relies on the elevated-surface background alone for definition). Contains the tab toggle, both inputs, the inline error slot, the submit button, the divider, and the Google button.
3. **Tab toggle** (Sign In / Sign Up), restyled to the same segmented-control visual language used everywhere else in the redesign (Home's timeframe control, Portfolio/Alerts/Impulse/News mode switchers) — with one adaptation, documented: since this control sits nested inside the card (itself already Elevated surface `#131613`), the track uses Secondary surface `#191D19` instead of Elevated surface `#131613`, per the Design System token table's own definition of Secondary surface as "nested/secondary surfaces" — reusing the Elevated-surface token here would give the track zero contrast against its parent card. Selected segment: lime `#C7FF3D` background + `#090B0A` text. Unselected: transparent background + `#A4AAA3` text. Switching tabs clears the inline error (existing `setError(null)` behavior, unchanged).
4. **Email and password inputs**, restyled to Home's search-field token treatment, with the same nested-surface adaptation as the tab toggle above: Secondary surface `#191D19` background (not Elevated surface `#131613`, for the same contrast-against-the-card reason), 12px radius, no heavy border, Text primary `#F5F7F2` input text, Text tertiary `#6F766F` placeholder — replacing the current bordered-box-on-canvas look (`#0D0D0D` background + `#2a2a2a` border).
5. **Inline error slot** (only rendered when `error` is set). **Decision, documented:** kept inline, directly below the password field and above the submit button — same placement as today — rather than converted into a top-level banner/toast, since this is a form-submission/validation error tied to the current field values, not a fetch failure; there's no "retry" concept here the way `harness/patterns/ui-ux.md`'s error/retry states describe on data-fetching screens (Home, Portfolio, Alerts, etc.) — the user's fix is to correct the fields and press the same submit button again, not a separate retry action. Restyled from bare `#f87171` text to a contained callout: a subtle Negative-tinted fill (low-opacity tint of Negative `#FF6B67`) holding the message in Negative `#FF6B67` text — the same "tokenized callout, never a bare colored string" principle Ask AI's in-thread error applies (a Negative-tinted border on its bubble), adapted here as a fill since this screen has no bubble metaphor to attach a border to.
6. **Submit button** ("Sign In" / "Create Account" depending on tab), restyled to the app's standard primary-CTA treatment (lime `#C7FF3D` filled, `#090B0A` text, 12px radius) — same treatment as Alerts' Save button, Impulse's "Scan & Analyze Impulse" button, and Portfolio's "+ Add Stock" FAB. Loading state: `ActivityIndicator` color `#090B0A` (unchanged disabled/opacity-dim behavior while `loading` is true).
7. **Divider** ("or"), restyled: divider line color Divider (subtle) `#1A1E1A`, "or" label Text tertiary `#6F766F`.
8. **"Continue with Google" button**, restyled to a neutral secondary-action treatment — same nested-surface adaptation as items 3-4 above (Secondary surface `#191D19` background, no heavy border), Text primary `#F5F7F2` label — the same "neutral secondary-surface" language used for Portfolio's Edit action, replacing the current bordered-box-on-canvas look. The Google "G" glyph keeps its real-world brand blue (`#4285F4`) — exempt from the single-accent-color rule for the same reason Portfolio Health's Diversification section's sector-identity colors are: it's a third-party brand mark, not a status or selection indicator. Loading state: `ActivityIndicator` color `#F5F7F2` (unchanged disabled/opacity-dim behavior while `googleLoading` is true).

**Removed from design:** none — there is no external design brief for this screen to diverge from (see Purpose above); nothing here required fabricating data or omitting a design-called-for element.

**States** (per `harness/patterns/ui-ux.md`'s bar — this is a form screen, not a data-fetching one, so "loading/error/populated" map differently than elsewhere):
- **Sign In (default tab):** email + password fields, "Sign In" submit label.
- **Sign Up (alt tab):** same fields, "Create Account" submit label — switching tabs clears any inline error.
- **Submitting (email/password):** submit button shows a spinner in place of its label; both submit paths disabled (unchanged existing `loading` flag behavior).
- **Submitting (Google):** Google button shows a spinner in place of its label/icon (unchanged existing `googleLoading` flag behavior).
- **Inline error:** the callout (item 5 above) renders below the password field when `signIn`/`signUp`/`signInWithGoogleNative` returns an error, or when the client-side required-fields check fails — never a raw error body or stack trace.

**Success Criteria**
- [ ] Wordmark, card, tab toggle, inputs, submit button, divider, and Google button all render using only Design System tokens — no remaining ad hoc colors (`#0D0D0D`, `#B7FF00`, `#111111`, `#f87171`, `#2a2a2a`, etc.) anywhere on the screen.
- [ ] The tab toggle uses the same segmented-control visual language (selected/unselected treatment) as every other segmented control in the app, adapted to the nested-surface track color documented above.
- [ ] The submit button and the Google button are visually distinguishable as primary vs. secondary actions (lime-filled vs. neutral secondary-surface), matching the primary/secondary button language established elsewhere in the redesign.
- [ ] The inline error renders as a contained, tokenized callout (never bare colored text), appears only when `error` is set, and disappears on tab switch — with no retry button present (confirms the documented no-retry decision).
- [ ] Switching tabs, submitting email/password (sign in and sign up), and Google native sign-in all function exactly as today (same `signIn`/`signUp`/`signInWithGoogleNative` calls, same required-field validation, same `AuthGate` redirect on success) — only visual presentation changes.
- [ ] All 5 states above (Sign In, Sign Up, submitting×2, inline error) render distinctly and are reachable via a real interaction.

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

### Screen: Portfolio (`portfolio.tsx`) — REDESIGNED 2026-08-25 (spec'd, not yet built)

**Purpose:** Let a user see and manage their manually-tracked equity portfolio — add, edit, sell (fully or partially), and delete positions, and understand invested capital and realized standing at a glance. Same underlying feature (Feature 2, Portfolio Connect, `spec/roadmap.md` Build Status row 2) as the existing screen; see `spec/capabilities/portfolio-connect.md`. Full CRUD already works today — this is a presentation-only redesign, not a data-plumbing rebuild.

**Data source — unchanged, no new wiring:** `GET/POST/PATCH/DELETE /portfolio/holdings`, `POST /portfolio/holdings/{id}/sell` (`spec/api.md`), all already wired via `usePortfolioStore`. Symbol autocomplete unchanged (`searchStocks`, same as Home's search).

**Structure (top to bottom):**
1. **Header row.** "Portfolio" title, screen-title token (30px/650, Text primary `#F5F7F2`); directly below, "{N} position(s)" subtitle, 13px, Text secondary `#A4AAA3` — same copy pattern as today, restyled.
2. **Portfolio summary, via typography, not cards.** Total invested amount across Held holdings (`Σ quantity × avg_price`) as a large numeral — Major-numeral size (44-56pt, same size class as a Major score, but Text primary color, never score-colored, since this is a rupee amount not a score). Directly below: total realized P&L across Sold holdings (`Σ (sold_price − avg_price) × sold_quantity`, existing per-card math, newly aggregated here) in a calm semantic color — Positive `#B8F35A` if ≥0, Negative `#FF6B67` if <0 — never rendering the whole screen in an alarming color, per the Design System's calm philosophy.
3. **"View portfolio health →" link row** (judgment call, documented — see Simplified section below): a single text row, Body token, Text secondary `#A4AAA3` + trailing chevron, tapping it navigates to the Health tab. No new fetch — purely a navigation affordance.
4. **Filter row** (All / Held / Sold), restyled to the segmented-control token language: track `#131613`; selected segment lime `#C7FF3D` background + `#090B0A` text; unselected transparent + `#A4AAA3` text. Same counts in each label as today ("All (N)", "Held (N)", "Sold (N)").
5. **Holdings list**, each row restyled to a premium list-item card (elevated surface `#131613`, 14-18px corner radius):
   - Ticker (16px/600, Text primary) + status pill — HELD (lime-tinted) / SOLD (secondary-surface `#191D19`, Text tertiary).
   - Held rows: quantity · avg buy price · total invested, inline (Text secondary labels, Text primary values) — tightened from today's 2-column grid into a single inline row per the design's list-item language.
   - Sold rows: sold qty · sold price · realized P&L (with %, colored Positive/Negative), inline.
   - Holding-period tag (SHORT/MEDIUM/LONG), small secondary-surface pill, Text tertiary.
   - Purchase/sold date line, 12px, Text tertiary — unchanged content, restyled.
   - Row divider `#1A1E1A`.
6. **Row actions** — existing tap-based Edit / Mark as Sold / Delete buttons, kept exactly as-is functionally (see Simplified section below re: swipe gesture), restyled to token colors: Sell → Positive `#B8F35A`-tinted, Delete → Negative `#FF6B67`-tinted, Edit → neutral secondary-surface.
7. **"+ Add Stock" FAB**, restyled to the accent token (lime `#C7FF3D` background, `#090B0A` text), same position/behavior. The existing Add/Sell/Edit modals are unchanged functionally — their surfaces/inputs restyle to the token system (elevated-surface `#131613` inputs, `#1A1E1A` borders) without rearchitecting the modal flows or fields.

**Removed from design (no fabricated data):**
- **Portfolio-value sparkline/trend chart** — no portfolio-value-history data exists anywhere (no table or endpoint in `spec/data.md`/`spec/api.md` tracks a portfolio's total value over time; `StockHistoricalScore` is per-stock technical score history, not a portfolio value series). Removed entirely, not stubbed.
- **"Today's change" stat** — no live/daily price-change data exists anywhere in the API (no price-feed endpoint at all — consistent with Stock Detail's own price/chart stub finding, `spec/capabilities/stock-analytics-dashboard.md`). Removed; the summary shows only real aggregates computed from actual holdings data (invested amount, realized P&L).

**Simplified from design (documented, not silent):**
- **Mini health-gauge / technical-safety-diversification bars borrowed from Health** — simplified to the single "View portfolio health →" link-out row (item 3 above) rather than wiring a second `GET /portfolio/health` fetch into this screen. Judgment call: a second fetch of the same data Health's own tab already owns would be new data-plumbing, not a restyle, and would risk the two screens drifting out of sync with each other.
- **Per-holding score badge** — simplified out entirely (not shown). Showing a real score per holding would require a new per-symbol `GET /stocks/{symbol}/score` fetch per row (N+1 calls) — new wiring beyond this pass's presentation-only scope, not a restyle. If a per-holding score becomes a real requirement, it should be scoped as its own small capability change (e.g. a portfolio-holdings-with-scores endpoint), not bolted on here.
- **Swipe-to-reveal Edit/Sell gesture** — simplified to the existing tap-based action buttons. Confirmed: no gesture-handling library (`react-native-gesture-handler`, `Swipeable`, `reanimated` gesture APIs) exists in `apps/mobile/package.json` today, and this pass does not add one.

**States** (per `harness/patterns/ui-ux.md`'s bar):
- **Loading (initial):** header, summary, and filter row render immediately once holdings begin fetching; the list area shows a skeleton (matching the row shape) while `GET /portfolio/holdings` resolves — same treatment as Home's skeleton rows.
- **Populated:** real holdings render per the structure above.
- **Filtered-empty:** the selected filter (Held/Sold) has zero matching holdings while others don't — existing copy kept, restyled ("No sold positions yet." / "No portfolio positions yet.").
- **Empty (no holdings at all):** existing copy kept, restyled ("Add your stocks to unlock real-time Portfolio Health analysis.").
- **Error/retry:** `usePortfolioStore`'s `error` is set — human copy ("Couldn't load your positions. Please try again.") plus tap-to-retry, scoped to the list area only (header, summary, filter row, and FAB still render). **New this pass** — the existing screen does not render an error state today; adding one is required to meet the states bar, not a data or scope change.

**Success Criteria**
- [ ] Header, summary, filter row, and holdings list all render using only Design System tokens — no ad hoc colors/sizes.
- [ ] The summary's invested amount and realized P&L are computed from real holdings data only — no fabricated "today's change" or chart anywhere on the screen.
- [ ] Tapping "View portfolio health →" navigates to the Health tab with no new network call fired from this screen.
- [ ] Add / Edit / Sell / Delete all function exactly as today (same modals, same validation, same store calls) — only their visual presentation changes.
- [ ] No per-holding score badge, sparkline, or "today's change" value renders anywhere — confirms the two Removed items above are actually absent, not silently present in a different form.
- [ ] All 5 states (loading, populated, filtered-empty, empty, error/retry) render distinctly and are reachable via a real interaction.

### Screen: Portfolio Health (`health.tsx`) — REDESIGNED 2026-08-25 (spec'd, not yet built)

**Purpose:** Give a portfolio-health snapshot — an overall weighted score, technical/safety/sentiment evidence, sector diversification vs. an ideal reference, and (on demand) an AI-generated narrative naming the worst holdings. Same underlying feature (Feature 3, Portfolio Health, `spec/roadmap.md` Build Status row 3); see `spec/capabilities/portfolio-health.md`.

**Data source — unchanged, no new wiring:** `GET /portfolio/health?timeframe=...` (`spec/api.md`) via `useHealthStore.fetchHealth`. Presentation-only redesign.

**Structure (top to bottom):**
1. **Header row** (new this pass — the existing screen has no title at all): "Portfolio Health" title, screen-title token, Text primary. Added for consistency with every other redesigned screen in this initiative, not a data change.
2. **Timeframe control** — 3-way segmented control (Short/Medium/Long), restyled to Home's segmented-control token, replacing the current ad hoc `#333`-bordered toggle. Drives the `timeframe` query param, unchanged behavior.
3. **Score hero.** Overall score rendered as a semi-circle gauge, arc fill proportional to `(score + 100) / 2` (same -100..100-to-0-100% normalization as Home's signal-strength bar and Stock Detail's pillar bars), arc color per the standing score bands (Red <40, Amber 41-65, Green 66-100). Score numeral centered at Major-score size (44-56pt), tabular-nums, colored per band, with "/ 100" decorative suffix (real -100..100 value displayed un-rescaled, same pattern as Stock Detail's hero). Below the gauge: Green Score / Red Score (existing `healthData.green_score`/`red_score`, real data), Green in Positive `#B8F35A`, Red in Negative `#FF6B67`.
4. **Evidence rows** (not repeated identical cards) — Technical, Safety, Sentiment, in that order: label (left) + numeric value or "Not Available" (right, colored per band; `sentiment_score` is the only nullable field per `healthData`'s shape, matching Stock Detail's pillar "Not Available" handling) + thin progress bar below (same `(score+100)/2` normalization), present only when numeric.
5. **Diversification section.** Section header + diversification score numeral inline, colored per band. Sector allocation — actual vs. ideal — via the existing two horizontal stacked bars ("Your Allocation" from real `healthData.sectors`; "Ideal Reference" from the existing 10-equal-sectors reference), restyled: bar track `#1A1E1A`, segment colors keep the existing categorical palette (sector-identity colors are exempt from the single-accent-color rule — they encode category, not status/selection state).
6. **Sector summary sentence** — the one real `sector_summary_sentence` string (Body token, Text secondary), directly below the bars. See Simplified section below re: the design's ranked "Diagnostics" list.
7. **AI Bottleneck Report button** — restyled to a lime `#C7FF3D` filled button with a sparkle icon and `#090B0A` text, functionally unchanged: navigates to the Ask AI tab and auto-sends the existing prompt template via `sendMessage` (same 300ms transition delay). **This button's downstream output is the platform's one deliberate buy/sell-language exception** (Standing Platform Rule 1, `spec/capabilities/portfolio-health.md`) — carried unchanged by this restyle, not modified or extended.
8. **Holdings Impact list** — per-holding rows (ticker, weight %, overall/technical/safety scores), restyled to the same list-item language as Portfolio's holdings cards (elevated surface, row dividers) for visual consistency between the two screens. Content and server-side worst-to-best sort unchanged.

**Removed from design (no fabricated data):**
- **"Health over time" trend line chart** — no historical portfolio-health-score time series exists anywhere (`StockHistoricalScore` is per-stock technical score history, not a portfolio-level health score, and nothing computes or stores a dated portfolio health score). Removed entirely — not stubbed, per this batch's explicit remove-over-stub instruction.

**Simplified from design:**
- **Ranked "Diagnostics" list** (numbered issues with severity + action links) — simplified to displaying the one real `sector_summary_sentence` string prominently (item 6 above), existing behavior restyled only. No per-issue severity or action links — none of that is backend-computed or stored anywhere.

**States** (per `harness/patterns/ui-ux.md`'s bar):
- **Loading:** existing `loading && !healthData` check — restyle to a skeleton matching the gauge + evidence-row shape, replacing the current spinner-only treatment.
- **Error:** `useHealthStore`'s `error` is set — **fixed this pass:** the current implementation renders the raw `error` string directly in red text, which violates `harness/patterns/ui-ux.md`'s "never a raw error body" rule; replace with human copy ("Couldn't load your portfolio health. Please try again.") plus tap-to-retry.
- **Empty portfolio:** per `spec/capabilities/portfolio-health.md`, `GET /portfolio/health` returns an all-zero response for an empty portfolio, not an error — **new this pass:** add a distinct "You haven't added any holdings yet" explanatory state instead of rendering a confusing all-zero gauge (0/100, empty evidence rows), since the existing implementation doesn't special-case this today.
- **Populated:** real data renders per the structure above.

**Success Criteria**
- [ ] Header, timeframe control, score hero, evidence rows, and diversification section all render using only Design System tokens — no ad hoc colors/sizes.
- [ ] Switching the timeframe control re-fetches `GET /portfolio/health` and updates every section; behavior unchanged from today, only presentation changes.
- [ ] No "Health over time" chart or per-issue ranked diagnostics list renders anywhere — confirms the Removed/Simplified items above.
- [ ] The Bottleneck Report button's chat-tab handoff behavior (navigation + auto-sent prompt) is unchanged and still the only place in the redesigned screens where buy/sell-adjacent language can appear (via the resulting chat response).
- [ ] The error state shows human copy and a retry action, never the raw error string (fixes the identified gap).
- [ ] An empty portfolio shows the new explanatory empty state, not a confusing all-zero gauge.
- [ ] All 4 states (loading, error/retry, empty-portfolio, populated) render distinctly and are reachable via a real interaction.

### Screen: Ask AI (`chat.tsx`) — REDESIGNED 2026-08-25 (spec'd, not yet built)

**Purpose:** Let the user ask free-text questions about a stock, their portfolio, technical indicators, fundamentals, news/Twitter sentiment, or NSE filings, and get a streamed plain-English answer — also the landing point for Portfolio Health's Bottleneck Report handoff. Same underlying feature (Feature 4, Ask AI Chatbot; full agent design in `spec/agent.md`); see `spec/capabilities/ask-ai-chatbot.md`.

**Data source — unchanged, no new wiring:** `POST /chatbot/ask` (`spec/api.md`) via `useChatStore.sendMessage`. Presentation-only redesign — does not touch the request/response contract and does not resolve the already-tracked "no markdown rendering" known gap (`spec/ui.md`'s mobile screens table, above) — that gap is unaffected by this restyle.

**Structure (top to bottom):**
1. **Header row**, restyled to tokens: "Ask AI" title at the Design System's section-title size (18-20px/650, Text primary) rather than the current larger ad hoc 22px/800 — deliberately more modest than Home/Portfolio's screen-title size, since this is a tab-level header, not a full landing-screen moment. Subtitle unchanged copy ("Finwerse Intelligence & Analysis", 12px, Text tertiary). Clear-history button — small secondary-surface `#191D19` pill, only rendered when `messages.length > 0` (unchanged behavior).
2. **Empty state.** Existing copy kept as-is ("What would you like to analyze?" headline + subtitle) — **decision:** the design brief's own example wording ("What would you like to understand?") is not substituted in; the shipped app's copy is already on-brand and this pass restyles, it doesn't rewrite product copy without being asked. Sparkle icon circle restyled to tokens. The existing 4 suggestion chips keep their exact copy, restyled to the list-row language (elevated surface `#131613`, trailing arrow icon) replacing the current bordered-pill look.
3. **Message list.** User and assistant bubbles both restyled to neutral token surfaces — user: elevated surface `#131613`, Text primary; assistant: secondary surface `#191D19`, Text primary/secondary — **decision:** lime accent is deliberately NOT used for the user bubble, since the Design System's token table reserves lime for "selected / actionable / primary-interaction / positive-momentum," not decorative bubble backgrounds. Bot avatar (small circular icon, secondary-surface background, lime sparkle icon) kept, restyled to tokens.
4. **Typing/loading indicator**, restyled: a three-dot pulse animation (replacing the current spinner + "Analyzing data..." text) using the Design System's micro-interaction motion token (120-250ms per-dot stagger), dots in Text tertiary pulsing toward Text secondary. This is a fresh application of the redesign's existing motion tokens for this screen, not a reused pre-built component from Home/Stock Detail (neither of those screens has a dot-pulse pattern in the shipped code today — both use static skeleton blocks for their loading states).
5. **Composer**, restyled to a premium floating-input treatment: input field on elevated surface `#131613`, no heavy border, 12px radius; send button as a circular lime `#C7FF3D` accent button — **not** the current WhatsApp-style rounded-pill/green-circle look. Same disabled-while-streaming behavior, same 500-char limit, unchanged.
6. **Response layout.** **Decision, documented:** no structural title/score-line parsing is added to the streamed response. The backend returns a single plain-text string (`spec/agent.md`) with no structural markers (no JSON, no delimiter convention); building client-side ticker-detection/regex parsing to fake structure risks misrepresenting the AI's actual answer for a benefit that doesn't exist today. The response renders as restyled plain-text (Body token, 15-17px) inside the assistant bubble — same rendering approach as today, tokens only.
7. **In-thread error handling** — unchanged: a failed request still renders as a normal assistant-bubble message ("Sorry, I encountered an error. Please try again.") rather than a separate screen-level error state; restyled with a subtle Negative `#FF6B67`-tinted bubble border to visually distinguish it as an error response, without inventing new error-state machinery.

**Removed from design:** none — this screen's design brief maps cleanly onto real, already-wired data (the chat request/response itself); nothing here required fabricating data.

**States** (per `harness/patterns/ui-ux.md`'s bar):
- **Empty:** `messages.length === 0` — empty-state headline + 4 suggestion chips.
- **Populated:** message thread renders, auto-scrolls to the latest message (unchanged).
- **Streaming:** the pending assistant message renders the dot-pulse typing indicator in place of content.
- **In-thread error:** the apology message renders in an assistant bubble with the Negative-tinted border (item 7 above) — not a separate screen state.

**Success Criteria**
- [ ] Header, empty state, message bubbles, and composer all render using only Design System tokens — no ad hoc colors/sizes.
- [ ] Sending a message (typed or via a suggestion chip) still calls `POST /chatbot/ask` unchanged and streams into the same assistant-message bubble.
- [ ] The typing indicator is a dot-pulse animation, not the previous spinner+text treatment.
- [ ] No structural parsing of the response is added — the response renders as plain restyled text, confirming the documented decision above.
- [ ] The Bottleneck Report handoff from the Health tab (auto-sent prompt via `sendMessage`) still lands correctly in this screen's message thread.
- [ ] All 4 states (empty, populated, streaming, in-thread error) render distinctly and are reachable via a real interaction.

### Screen: Alerts (`alerts.tsx`) — REDESIGNED 2026-08-25 (spec'd, not yet built)

**Purpose:** Let a user create, view, and delete score-threshold alerts (universe-wide, specific-stock, or portfolio-only) and see recently-triggered alert history. Same underlying feature (Feature 5, Alerts, `spec/roadmap.md` Build Status row 5); see `spec/capabilities/alerts.md`.

**Data source — unchanged, no new wiring:** `GET/POST/DELETE /alerts` (`spec/api.md`) via `useAlertsStore`. Presentation-only redesign — the entire current implementation is styled in an unrelated light/iOS theme (`#F2F2F7` background, white cards, iOS blue `#007AFF`) that predates the Design System; this pass is a full token migration, not a partial touch-up.

**Structure (top to bottom):**
1. **Header row.** "Alerts" title (screen-title token, Text primary). "+" action restyled to the 38x38 `#131613` rounded-icon-button pattern established by Home/Stock Detail's header icons, replacing the current bare iOS-blue plus glyph.
2. **Empty state** (no alerts at all — neither triggered nor active): see Removed section below — a simple `IconSymbol` icon (e.g. a bell) in Text tertiary, with the design's exact copy: "Nothing needs your attention." (section-title-adjacent size, Text primary) / "Create an alert and Finwerse will watch it for you." (Body token, Text secondary), centered.
3. **New-alert form** (existing single-screen form kept — see Simplified section below), restyled to token surfaces (elevated surface `#131613` card, `#1A1E1A` dividers), reorganized into two labeled sections matching the design's information hierarchy:
   - **"What are you watching?"** — scope chips (Portfolio / Specific stock / Universe-wide) + conditional stock-symbol input, restyled choice-chip treatment (selected: lime `#C7FF3D` background + `#090B0A` text; unselected: secondary-surface `#191D19` + Text secondary) replacing the current light-blue `#E5F1FF` selection style.
   - **"What should trigger it?"** — score-type chips (overall/technical/safety — same set as today, unchanged) + timeframe chips (short/medium/long) + direction chips (Drops above/below) + threshold numeric input, same restyled chip treatment.
   - Save/Cancel actions restyled (Save = lime filled button; Cancel = plain-text Negative-tinted action).
4. **Triggered alerts section**, shown first (existing behavior kept). Each card restyled to an elevated-surface card with a Warning `#FFB84D` accent, replacing the current light-yellow `#FFF9E6` card — **decision:** the 🚨 emoji is dropped in favor of a Warning-colored status dot (same dot+label pattern used for Stock Detail's momentum pill), since an emoji siren reads as decorative "fake urgency," which the Design System's philosophy explicitly avoids. Copy otherwise unchanged ("Fired on {date}" / "{symbol} crossed {direction} {threshold} on {timeframe} {score_type}.").
5. **Active alerts**, grouped by target (existing grouping logic kept — by stock symbol / "My Portfolio" / "Universe-wide"). Group headers restyled to the 12px letter-spaced section-label token (matches Stock Detail's "MORE ON THIS STOCK" label). Each alert row restyled to the list-item language (elevated surface, `#1A1E1A` row divider, trailing delete icon in Negative `#FF6B67`) replacing the current white iOS-card look.

**Removed from design:**
- **Custom "thin line crossing a threshold" SVG empty-state graphic** — simplified to a simple `IconSymbol` icon (item 2 above) rather than hand-building bespoke SVG/animation, per the user's explicit instruction for this batch. The copy and calm tone carry the empty state, not a bespoke graphic.

**Simplified from design:**
- **3-step progressive bottom-sheet new-alert flow** — kept as the existing single-screen form (no new bottom-sheet infrastructure this pass), reorganized into 2 section-header groups ("What are you watching?" / "What should trigger it?", item 3 above) to approximate the design's information hierarchy without new UI infrastructure.

**States** (per `harness/patterns/ui-ux.md`'s bar):
- **Loading:** skeleton list matching the alert-card shape while `GET /alerts` resolves — new this pass, replacing the lack of any loading treatment today.
- **Empty (no alerts at all):** the empty-state graphic + copy (item 2 above).
- **Active-only:** alerts exist but none triggered — Triggered section omitted entirely (existing behavior, unchanged).
- **Triggered-and-active:** both sections render, Triggered first (existing behavior, unchanged).
- **Error/retry:** `useAlertsStore`'s `error` is set — human copy ("Couldn't load your alerts. Please try again.") plus tap-to-retry — **new this pass**, the existing screen has an `error` field in the store but never renders it.

**Success Criteria**
- [ ] Every element on this screen renders using only Design System tokens — no remaining light/iOS-theme colors anywhere (full token migration, not partial).
- [ ] The empty state uses a simple `IconSymbol` icon, not a custom SVG graphic, with the exact specified copy.
- [ ] The new-alert form's fields, validation, and submission behavior are unchanged from today (same `createAlert` call, same required-field checks) — only its visual organization into two labeled sections changes.
- [ ] Triggered alerts render before Active alerts whenever both exist (unchanged ordering).
- [ ] All 5 states (loading, empty, active-only, triggered-and-active, error/retry) render distinctly and are reachable via a real interaction.

### Screen: Impulse Analyzer (`impulse.tsx`) — REDESIGNED 2026-08-25 (spec'd, not yet built)

**Purpose:** Quantify the avoidable rupee cost of a user's impulse-timed trades by comparing actual buy/sell timing against data-backed counterfactual timing, for either the user's own sold portfolio trades or arbitrary hypothetical trades. Same underlying feature (Feature 6, Impulse Analyzer, `spec/roadmap.md` Build Status row 6); see `spec/capabilities/impulse-analyzer.md`.

**Data source — unchanged, no new wiring:** `GET /analyzer/impulse`, `POST /analyzer/custom-impulse` (`spec/api.md`) via `useAnalyzerStore`. Presentation-only redesign.

**Structure (top to bottom):**
1. **Header row**, restyled: "Impulse Analyzer" title + subtitle "Identify avoidable losses from trading against market data" (unchanged copy).
2. **Mode switcher** (Custom / Portfolio Sold Trades), restyled to the segmented-control token, replacing the current ad hoc pill-tab styling.
3. **Trade entry form** (custom mode only), restyled to the design's cleaner large-input look: each trade-input card on elevated surface `#131613`, labeled inputs restyled (Text tertiary micro-labels, `#1A1E1A` borders replacing the current ad hoc `#202020`/`#303030` grays), Add/Remove-row controls restyled to lime/Negative tokens respectively, "Scan & Analyze Impulse" primary action restyled to a lime filled button.
4. **Results summary card.** "Total Avoidable Impulse Cost" plus a real, computable trade count — "{N} trade(s) analyzed" (`impulseTrades.length`, existing real data, no new fetch) shown alongside it. **Fixed this pass:** the current implementation renders this card in an alarming Negative-tinted red treatment (`#220D0D` background) unconditionally, even when the total cost is ₹0 — this violates the Design System's calm philosophy ("never make the whole screen red"). Redesign: the Negative-tinted treatment only applies when `totalCost > 0`; a ₹0 result renders the same card on a neutral elevated surface with Text primary numerals.
5. **Per-trade results list** — side-by-side "Your Execution" vs. "Data-Backed Timing" (actual vs. counterfactual) comparison, restyled to tokens; structure and content unchanged (dates, prices, and profit/loss figures are all real fields already returned by `evaluate_single_trade`, `apps/api/routers/analyzer.py`).

**Removed from design (no fabricated data):**
- **"What happened?" per-trade factors list** (e.g. "Timing — Early exit," "Technical signal — Neutral") — the API returns only actual/counterfactual dates, prices, and profit numbers per trade (`ImpulseTrade` type, `apps/mobile/src/store/analyzerStore.ts`); no discrete named factor/reason field exists anywhere in `spec/data.md` or the `/analyzer/*` response shape. Removed entirely rather than inventing factor labels.
- **Aggregate "Behavioral insight" cross-trade sentence** (e.g. "3 trades, 2 early exits, 1 profitable exit") — **judgment call, documented:** not built. Two reasons: (1) every trade returned by `/analyzer/impulse` is, by construction, already an impulse trade (the endpoint filters to `is_impulse: true` before returning), so an "N early exits out of M trades" count would be uninformative there (always M of M); (2) the underlying `is_impulse` field has an inconsistent response shape for one case (see Known Gap below) that makes building a reliable cross-trade classification risky without also fixing that gap first, which is out of scope for a visual-only pass. The only aggregate added is the real, trivially-computable "{N} trade(s) analyzed" count (item 4 above) — a count, not an invented behavioral-psychology sentence.

**Known Gap found during this pass (flagged in `spec/capabilities/impulse-analyzer.md`):** `evaluate_single_trade` (`apps/api/routers/analyzer.py`) returns an `is_impulse` boolean per trade; for the "already well-timed but still a losing trade" case (`is_buy_right and is_sell_right`, still possible since the function only screens for `actual_profit < 0` up front), it returns a dict with `id`/`stock_symbol`/`quantity`/`is_impulse: false`/`rupee_cost: 0.0` but **no `actual`/`counterfactual` keys**, while every other returned shape includes both. The current mobile UI (`impulse.tsx`) unconditionally accesses `trade.actual.buy_date` when rendering — a real trade submission that hits this case via `/analyzer/custom-impulse` would crash the results list. Not fixed in this visual-only pass; flagged as a known gap, not silently worked around.

**States** (per `harness/patterns/ui-ux.md`'s bar):
- **Loading (custom scan):** existing `isLoading` spinner on the "Scan & Analyze Impulse" button, restyled.
- **Loading (portfolio fetch):** existing full-area loading treatment when switching to Portfolio mode, restyled to match the redesign's loading language.
- **Empty results:** "No Impulse Losses Flagged" — existing copy kept, restyled with a calm Positive-tinted icon (not alarming), tab-specific subtext unchanged.
- **Populated:** trade list renders per the structure above.
- **Error/retry:** `useAnalyzerStore`'s `error` is set — human copy plus tap-to-retry — **new this pass**, the existing screen has an `error` field in the store but never renders it.

**Success Criteria**
- [ ] Header, mode switcher, trade entry form, and results all render using only Design System tokens — no ad hoc colors/sizes.
- [ ] The summary card only uses the Negative-tinted treatment when `totalCost > 0`; a ₹0 result renders neutrally (fixes the identified calm-philosophy violation).
- [ ] No per-trade "What happened?" factors list or aggregate behavioral-insight sentence renders anywhere — confirms the Removed items above; only the real `{N} trade(s) analyzed` count is shown.
- [ ] Submitting custom trades and switching to Portfolio mode both function exactly as today (same store calls, same validation) — only visual presentation changes.
- [ ] All 4 states (loading×2, empty, populated) plus the new error/retry state render distinctly and are reachable via a real interaction.

### Screen: Market News (`news.tsx`) — REDESIGNED 2026-08-25 (spec'd, not yet built)

**Purpose:** Let a user browse a sentiment-scored news feed — market-wide or scoped to their portfolio's held stocks — and search across it. A browsable feed in its own right, not just chatbot input. Same underlying feature (Feature 7, Sentiment Feed, `spec/roadmap.md` Build Status row 7); see `spec/capabilities/sentiment-feed.md`.

**Data source — unchanged, no new wiring:** `GET /sentiment-feed/market`, `/portfolio`, `/search` (`spec/api.md`) via `useSentimentStore`. Presentation-only redesign.

**Structure (top to bottom):**
1. **Header row**, restyled: "Market News" title + subtitle (unchanged copy).
2. **Mode switcher** (All Market News / My Portfolio News), restyled to the segmented-control token, replacing the current ad hoc pill-tab styling.
3. **Search field**, restyled to Home's search-field token treatment (elevated surface `#131613`, 12px radius, leading search icon, Text tertiary placeholder). Same real search behavior (`searchSentiment`), unchanged.
4. **Article feed**, each card restyled: symbol badge (elevated-surface pill, Text primary), sentiment badge (Bullish/Bearish/Neutral, restyled to Positive `#B8F35A` / Negative `#FF6B67` / Warning `#FFB84D` tokens respectively, replacing the current ad hoc RGBA greens/reds/oranges), extracted headline (Body token — `extractHeadline`'s URL-derived heuristic kept exactly as-is; it remains the pragmatic real solution since `StockNews` has no headline field, `spec/data.md`), source domain + date footer (Metadata token, Text tertiary), `#1A1E1A` row divider between cards. Tapping a card still opens the source URL directly via `Linking.openURL` — unchanged, honest behavior.
5. **Loading treatment**, restyled from a full-screen spinner to skeleton article cards matching the populated card shape, consistent with Home/Stock Detail's preference for skeletons over spinners for list-shaped content.

**Removed from design (no fabricated data):**
- **Market-context strip** (NIFTY 50 / SENSEX / BANK NIFTY live index values) — no market index data exists anywhere (no index-price entity in `spec/data.md`, no index endpoint in `spec/api.md`). Removed entirely — no placeholder row, no "coming soon" stub.
- **News Detail expanded view** ("Why this matters" / "Market impact" / "Related stocks" / "Explain this news" AI action) — no per-article enrichment data exists anywhere in the schema (`StockNews` has only `stock_symbol, article_date, polarity, source_url`, `spec/data.md`); each of those four sub-sections would require fabricated analysis. Removed entirely; tapping an article keeps the existing direct-open-URL behavior instead of opening any detail view.

**States** (per `harness/patterns/ui-ux.md`'s bar):
- **Loading:** skeleton article cards (item 5 above) while a fetch is in flight and not a pull-to-refresh.
- **Populated:** real article feed renders per the structure above.
- **Empty (no results):** existing copy kept, restyled — branches on whether a search query is active ("No news recorded matching '{query}'." vs. "Pull down to refresh latest market news.").
- **Error/retry:** `useSentimentStore`'s `error` is set — human copy plus tap-to-retry — **new this pass**, the existing screen has an `error` field in the store but never renders it.

**Success Criteria**
- [ ] Header, mode switcher, search field, and article feed all render using only Design System tokens — no ad hoc colors/sizes.
- [ ] No market-index strip or News Detail expanded view renders anywhere — confirms the Removed items above; tapping an article opens its source URL directly, exactly as today.
- [ ] Switching between All Market News / My Portfolio News and searching both still call the same real endpoints (`fetchMarketNews`/`fetchPortfolioSentiment`/`searchSentiment`) unchanged.
- [ ] `extractHeadline`'s URL-derived heuristic is unchanged — still the real, working solution for the missing headline field, not replaced or removed.
- [ ] All 4 states (loading, populated, empty, error/retry) render distinctly and are reachable via a real interaction.

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
