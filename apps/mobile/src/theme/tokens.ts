// Shared theme token definitions for apps/mobile.
// Source of truth: spec/ui.md → "Theming — Light Mode" (light) and
// "Design System — Mobile Redesign" (dark). Pure data, no React.

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
  textTertiary: '#6A6E74',
  accent: '#00ADB5',
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
  positive: '#3F7D4A',
  negative: '#B3413A',
  warning: '#BD722A',
};
