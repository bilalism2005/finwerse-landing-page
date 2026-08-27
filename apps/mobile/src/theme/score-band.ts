// Shared score-band classification, previously duplicated (with a color
// inconsistency between copies) across stock/[symbol].tsx, (tabs)/health.tsx,
// and (tabs)/portfolio.tsx.
import type { ThemeTokens } from './tokens';
import { withAlphaHex } from './color';

export type Band = 'green' | 'amber' | 'red';

// Standing Platform Rule 2 (CLAUDE.md / spec/ui.md Cross-Cutting UI Rules): Red <40, Amber 41-65, Green 66-100
export function getBand(score: number): Band {
  if (score < 40) return 'red';
  if (score <= 65) return 'amber';
  return 'green';
}

export function getBandColor(tokens: ThemeTokens, band: Band): string {
  return { green: tokens.positive, amber: tokens.warning, red: tokens.negative }[band];
}

// Design audit (2026-08-27): Health's holding badges and Stock Detail's momentum
// pill put full-opacity band-color text on a light alpha-tint of that same color
// as the background. That works for green/amber in both themes, but dark theme's
// red/negative text (a bright coral, #FF6B67) doesn't have enough contrast against
// ANY achievable tint of itself -- even a fully opaque elevatedSurface background
// only reaches 3.87:1, short of the 4.5:1 minimum this text's size/weight (12px
// bold) needs (too small to qualify for WCAG's large-text 3:1 exception). Verified
// via actual WCAG contrast math, not eyeballed. Dark theme's red badge/pill
// background uses a solid, darker-red literal instead of the alpha tint; every
// other band/theme combination keeps the standard tint.
const DARK_RED_BADGE_BG = '#6E0300';

export function getBadgeBackground(tokens: ThemeTokens, band: Band, mode: 'dark' | 'light'): string {
  if (band === 'red' && mode === 'dark') {
    return DARK_RED_BADGE_BG;
  }
  return withAlphaHex(getBandColor(tokens, band), '26');
}
