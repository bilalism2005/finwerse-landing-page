# Finwerse Mobile

Expo / React Native app (SDK 57) that reuses `@finwerse/shared` for Supabase auth and data access. It is the least mature app in the repo — treat it as early-stage; read `apps/mobile/AGENTS.md` and `CLAUDE.md` before making changes.

## Stack
- **Expo SDK 57** (`expo` ~57.0.8) + **expo-router** (file-based routing)
- **React Native 0.86** / **React 19**
- **@finwerse/shared** — Supabase client (`initSupabase`/`getSupabase`) + `AuthProvider`/`useAuth`
- **zustand** for local state, **axios** for API calls
- **Expo Go** or a development build for iOS / Android / Web

## Setup

Requires **Node 18+** and **bun** (the repo's primary JS package manager).

```bash
cd apps/mobile
bun install
```

### Environment

The app reads Supabase credentials from `EXPO_PUBLIC_*` env vars (inlined by the Expo bundler). Copy and fill in `apps/mobile/.env`:

```bash
cp .env.example .env
```

```bash
# Supabase project credentials (https://app.supabase.com → Project Settings → API)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

`apps/mobile/app/_layout.tsx` calls `initSupabase(...)` at module load so the credentials are available to `getSupabase()` / `useAuth()` throughout the app. `.env` is git-ignored — never commit secrets.

## Run

```bash
bun run start        # expo start
```

Then press `i` (iOS simulator), `a` (Android), or `w` (web). You'll need the corresponding Expo tooling (`expo-cli`, Xcode / Android Studio) installed.

## Notes
- Mobile shares auth with the web app via `@finwerse/shared`, so both apps use the same Supabase project credentials.
- `app.json` configures the Expo/EAS build (bundle id `com.finwerse.mobile`, EAS project id in `extra.eas`).
- This app currently exposes only core navigation + auth scaffolding — see `app/(tabs)` and `app/stock/[symbol].tsx` for the in-progress screens.
