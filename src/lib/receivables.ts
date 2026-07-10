import type { FinanceTransaction } from '../components/finance/finance-types';

/** Tag stored in tags field: ft_person:Name */
export function ftPersonTag(name: string): string {
  return `ft_person:${name}`;
}

/** Tag stored in tags field: ft_repaid:{txId} */
export function ftRepaidTag(txId: number): string {
  return `ft_repaid:${txId}`;
}

/** Check if a transaction has a given tag */
export function hasTag(tx: FinanceTransaction, tag: string): boolean {
  return (tx.tags ?? '').split(',').map(t => t.trim()).includes(tag);
}

/** Get the FT person name from on_behalf_of_label or tags */
export function getFtPerson(tx: FinanceTransaction): string | null {
  if (tx.on_behalf_of_label) return tx.on_behalf_of_label;
  if (tx.on_behalf_of && tx.tags) {
    for (const t of tx.tags.split(',').map(s => s.trim())) {
      if (t.startsWith('ft_person:')) return t.slice('ft_person:'.length);
    }
  }
  return null;
}

/** Get repayment status for an FT expense — supports partial repayments */
export function getRepaymentStatus(
  tx: FinanceTransaction,
  allTxns: FinanceTransaction[],
): { repaid: boolean; totalRepaid: number; repaymentTxs: FinanceTransaction[] } {
  if (tx.on_behalf_of !== 1 || tx.type !== 'expense') return { repaid: false, totalRepaid: 0, repaymentTxs: [] };
  const repaidTag = ftRepaidTag(tx.id);
  const overpaymentTag = `ft_overpayment:${tx.id}`;
  const repaymentTxs: FinanceTransaction[] = [];
  for (const t of allTxns) {
    if (t.type !== 'income') continue;
    const tags = (t.tags ?? '').split(',').map(s => s.trim());
    if (tags.includes(repaidTag) || tags.includes(overpaymentTag)) {
      repaymentTxs.push(t);
    }
  }
  const totalRepaid = repaymentTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
  return { repaid: totalRepaid >= Math.abs(tx.amount), totalRepaid, repaymentTxs };
}

export interface ReceivablePerson {
  name: string;
  totalOwed: number;
  txCount: number;
  oldestDate: string;
  txIds: number[];
}

/** Check if a specific FT expense has been fully repaid. */
export function isExpenseRepaid(txId: number, allTxns: FinanceTransaction[]): boolean {
  const tx = allTxns.find(t => t.id === txId);
  if (!tx) return false;
  return getRepaymentStatus(tx, allTxns).repaid;
}

/** Group unpaid FT expenses by person, accounting for partial repayments */
export function groupByPerson(
  txns: FinanceTransaction[],
): ReceivablePerson[] {
  const map = new Map<string, ReceivablePerson>();
  for (const tx of txns) {
    if (tx.on_behalf_of !== 1 || tx.type !== 'expense') continue;
    const status = getRepaymentStatus(tx, txns);
    if (status.repaid) continue;
    const stillOwed = Math.abs(tx.amount) - status.totalRepaid;
    if (stillOwed <= 0) continue;
    const person = getFtPerson(tx) ?? 'Unknown';
    const existing = map.get(person) ?? {
      name: person,
      totalOwed: 0,
      txCount: 0,
      oldestDate: tx.date,
      txIds: [],
    };
    existing.totalOwed += stillOwed;
    existing.txCount++;
    existing.txIds.push(tx.id);
    if (tx.date < existing.oldestDate) existing.oldestDate = tx.date;
    map.set(person, existing);
  }
  return [...map.values()].sort((a, b) => b.totalOwed - a.totalOwed);
}

/** Check if a transaction is a repayment (has ft_repaid tag) */
export function isRepayment(tx: FinanceTransaction): boolean {
  return (tx.tags ?? '').split(',').some(t => t.trim().startsWith('ft_repaid:'));
}
