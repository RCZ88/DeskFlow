import type { FinanceTransaction } from "../components/finance/finance-types";
import { getRepaymentStatus, getFtPerson } from "./receivables";

/** Outstanding money others owe us (currency conversion handled by caller). Accounts for partial repayments. */
export function followThroughReceivable(txns: FinanceTransaction[]): number {
  let owed = 0;
  for (const tx of txns) {
    if (tx.on_behalf_of !== 1 || tx.type !== 'expense') continue;
    const status = getRepaymentStatus(tx, txns);
    if (status.repaid) continue;
    owed += Math.abs(tx.amount) - status.totalRepaid;
  }
  return owed;
}

/** Get unpaid FT expenses grouped by person (accounts for partial repayments). */
export function getUnpaidByPerson(txns: FinanceTransaction[]): Map<string, { total: number; count: number; txIds: number[] }> {
  const map = new Map<string, { total: number; count: number; txIds: number[] }>();
  for (const tx of txns) {
    if (tx.on_behalf_of !== 1 || tx.type !== 'expense') continue;
    const status = getRepaymentStatus(tx, txns);
    if (status.repaid) continue;
    const stillOwed = Math.abs(tx.amount) - status.totalRepaid;
    if (stillOwed <= 0) continue;
    const person = tx.on_behalf_of_label || getFtPerson(tx) || 'Unknown';
    const entry = map.get(person) ?? { total: 0, count: 0, txIds: [] };
    entry.total += stillOwed;
    entry.count++;
    entry.txIds.push(tx.id);
    map.set(person, entry);
  }
  return map;
}



/** Canonical net worth = rawWalletSum (denomination/currency-adjusted) + FT receivable. */
export function netWorthWithReceivable(
  rawWalletSum: number,
  receivable: number,
): number {
  return rawWalletSum + receivable;
}
