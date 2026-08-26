// Shared score-band classification, previously duplicated (with a color
// inconsistency between copies) across stock/[symbol].tsx, (tabs)/health.tsx,
// and (tabs)/portfolio.tsx.
import type { ThemeTokens } from './tokens';

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
