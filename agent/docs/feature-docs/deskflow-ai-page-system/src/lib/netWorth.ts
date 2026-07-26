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
