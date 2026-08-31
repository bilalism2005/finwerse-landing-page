// Shared URL helpers — previously duplicated inside news.tsx. Moved out
// 2026-08-31 so both the Market News card footer and the Article Detail
// screen's "Read full article on {domain}" fallback link use the same
// domain-parsing logic (spec/ui.md "Screen: Market News" -> Shared helper).
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'News Source';
  }
}
