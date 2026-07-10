import type { CashDenomination } from '../finance-types';

/** Greedy largest-first bill selection to cover `amount`.
 *  Returns a map of denomination value → count. Total is >= amount (smallest available bill used to cover remainder). */
export function autoFill(amount: number, available: CashDenomination[]): Record<number, number> {
  const picks: Record<number, number> = {};
  let remaining = amount;
  const sorted = [...available].sort((a, b) => b.value - a.value);
  for (const d of sorted) {
    if (remaining <= 0) break;
    const need = Math.min(Math.ceil(remaining / d.value), d.count);
    if (need > 0) { picks[d.value] = need; remaining -= need * d.value; }
  }
  if (remaining > 0) {
    const smallest = [...sorted].reverse().find(d => (d.count - (picks[d.value] ?? 0)) > 0);
    if (smallest) picks[smallest.value] = (picks[smallest.value] ?? 0) + 1;
  }
  return picks;
}

/** Compute total value of a denomination array with given counts. */
export function denomTotal(denoms: CashDenomination[]): number {
  return denoms.reduce((s, d) => s + d.value * d.count, 0);
}
