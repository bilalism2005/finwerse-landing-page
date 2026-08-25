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
  canvas: '#090B0A',
  elevatedSurface: '#131613',
  secondarySurface: '#191D19',
  dividerSubtle: '#1A1E1A',
  dividerStrong: '#2A2E2A',
  textPrimary: '#F5F7F2',
  textSecondary: '#A4AAA3',
  textTertiary: '#6F766F',
  accent: '#C7FF3D',
  onAccent: '#090B0A',
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
