export function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

export function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
