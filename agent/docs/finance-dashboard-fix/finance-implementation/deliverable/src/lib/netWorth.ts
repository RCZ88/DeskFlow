// src/lib/netWorth.ts
// C6 "Receivable model": net worth = raw wallet sum + outstanding Follow Through.
// Follow Through receivable = sum of on_behalf_of=1 EXPENSE amounts not yet repaid.
// No repaid column exists, so all FT expense is treated as outstanding (documented limitation).
import type { FinanceTransaction } from "../components/finance/finance-types";

/** Outstanding money others owe us (currency conversion handled by caller). */
export function followThroughReceivable(txns: FinanceTransaction[]): number {
  return txns
    .filter((t) => t.on_behalf_of === 1 && t.type === "expense")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
}

/** Canonical net worth = rawWalletSum (denomination/currency-adjusted) + FT receivable. */
export function netWorthWithReceivable(
  rawWalletSum: number,
  receivable: number,
): number {
  return rawWalletSum + receivable;
}
