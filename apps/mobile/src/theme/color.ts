// Two withAlpha conventions were independently duplicated across screens
// (health.tsx, stock/[symbol].tsx, impulse.tsx, components/portfolio/shared.ts
// used a pre-computed 2-digit hex suffix like '22'/'4D'; login.tsx and
// news.tsx used a 0-1 fractional alpha instead). Both are legitimate -- the
// hex-suffix form is what most screens already use, the fractional form is
// more self-documenting at the call site -- so both are kept, consolidated
// into this single source instead of being redeclared per file.

export function withAlphaHex(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

export function withAlphaFraction(hex: string, alpha: number): string {
  const clamped = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return `${hex}${clamped.toString(16).padStart(2, '0')}`;
}
