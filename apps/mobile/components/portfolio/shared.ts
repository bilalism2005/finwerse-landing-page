export { withAlphaHex as withAlpha } from '@/src/theme/color';

export function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
