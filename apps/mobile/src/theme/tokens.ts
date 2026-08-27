// Shared theme token definitions for apps/mobile.
// Source of truth: spec/ui.md → "Theming — Light Mode" (light) and
// "Design System — Mobile Redesign" (dark). Pure data, no React.
//
// darkTheme.textTertiary/accent and lightTheme.positive/negative/warning were
// retuned (2026-08-27, design audit) via actual WCAG relative-luminance
// contrast math against every surface each token sits on as text -- not
// picked by eye. Before changing any of these five values, recompute contrast
// against canvas/elevatedSurface/secondarySurface in both themes; several of
// these previously passed the one surface an audit happened to sample while
// failing a different one it didn't (e.g. warning against canvas was 2.29:1,
// worse than the 3.23:1 that was actually flagged).

export interface ThemeTokens {
  canvas: string;
  elevatedSurface: string;
  secondarySurface: string;
  dividerSubtle: string;
  dividerStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  onAccent: string;
  positive: string;
  negative: string;
  warning: string;
}

export const darkTheme: ThemeTokens = {
  canvas: '#222831',
  elevatedSurface: '#393E46',
  secondarySurface: '#474B53',
  dividerSubtle: '#3E434B',
  dividerStrong: '#4D5258',
  textPrimary: '#EEEEEE',
  textSecondary: '#9EA2A8',
  textTertiary: '#94989D',
  accent: '#00CED7',
  onAccent: '#222831',
  positive: '#B8F35A',
  negative: '#FF6B67',
  warning: '#FFB84D',
};

export const lightTheme: ThemeTokens = {
  canvas: '#D8C9A7',
  elevatedSurface: '#EEEEEE',
  secondarySurface: '#F7F4EC',
  dividerSubtle: '#E2D9C2',
  dividerStrong: '#C7B891',
  textPrimary: '#211F17',
  textSecondary: '#524C39',
  textTertiary: '#655D46',
  accent: '#5C6B2E',
  onAccent: '#EEEEEE',
  positive: '#305F39',
  negative: '#953630',
  warning: '#7B4A1B',
};
