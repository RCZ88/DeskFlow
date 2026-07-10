import type { FinanceTransaction } from '../components/finance/finance-types';
import { getRepaymentStatus } from './receivables';

export interface AllocationItem {
  txId: number;
  description: string | null;
  date: string;
  originalAmount: number;
  remainingOwed: number;
  allocatedAmount: number;
  status: 'full' | 'partial' | 'none';
  newRemaining: number;
}

export interface AllocationResult {
  items: AllocationItem[];
  totalAllocated: number;
  overpaymentAmount: number;
  coveredTxIds: number[];
  partialTxIds: number[];
  repaymentTags: string[];
}

/**
 * Compute bulk repayment allocation across multiple transactions.
 * Oldest-first auto-allocation when no specific txIds selected.
 */
export function computeAllocation(
  paymentAmount: number,
  personTxns: FinanceTransaction[],
  allTxns: FinanceTransaction[],
  selectedTxIds?: number[],
): AllocationResult {
  // 1. Get unpaid FT expenses for this person, oldest first
  let unpaidTxs = personTxns
    .filter(tx => tx.on_behalf_of === 1 && tx.type === 'expense')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 2. Calculate remaining owed for each
  const txWithRemaining = unpaidTxs.map(tx => {
    const status = getRepaymentStatus(tx, allTxns);
    const remaining = Math.abs(tx.amount) - status.totalRepaid;
    return { tx, remaining: Math.max(0, remaining) };
  }).filter(({ remaining }) => remaining > 0);

  // 3. If specific txIds selected, filter to those (maintaining oldest-first order)
  let targetTxs = txWithRemaining;
  if (selectedTxIds && selectedTxIds.length > 0) {
    const idSet = new Set(selectedTxIds);
    targetTxs = txWithRemaining.filter(({ tx }) => idSet.has(tx.id));
  }

  // 4. Allocate payment amount
  let remainingPayment = Math.abs(paymentAmount);
  const items: AllocationItem[] = [];
  const coveredTxIds: number[] = [];
  const partialTxIds: number[] = [];
  const repaymentTags: string[] = [];

  for (const { tx, remaining } of targetTxs) {
    if (remainingPayment <= 0) {
      items.push({
        txId: tx.id,
        description: tx.description,
        date: tx.date,
        originalAmount: Math.abs(tx.amount),
        remainingOwed: remaining,
        allocatedAmount: 0,
        status: 'none',
        newRemaining: remaining,
      });
      continue;
    }

    const allocate = Math.min(remainingPayment, remaining);
    remainingPayment -= allocate;
    const newRemaining = remaining - allocate;
    const status: AllocationItem['status'] = newRemaining <= 0 ? 'full' : 'partial';

    items.push({
      txId: tx.id,
      description: tx.description,
      date: tx.date,
      originalAmount: Math.abs(tx.amount),
      remainingOwed: remaining,
      allocatedAmount: allocate,
      status,
      newRemaining,
    });

    if (status === 'full') {
      coveredTxIds.push(tx.id);
      repaymentTags.push(`ft_repaid:${tx.id}`);
    } else {
      partialTxIds.push(tx.id);
      repaymentTags.push(`ft_repaid:${tx.id}`);
    }
  }

  // 5. Handle overpayment
  const overpaymentAmount = remainingPayment;
  if (overpaymentAmount > 0 && targetTxs.length > 0) {
    const lastTx = targetTxs[targetTxs.length - 1].tx;
    repaymentTags.push(`ft_overpayment:${lastTx.id}`);
  }

  return {
    items,
    totalAllocated: paymentAmount - remainingPayment,
    overpaymentAmount,
    coveredTxIds,
    partialTxIds,
    repaymentTags,
  };
}

/**
 * Auto-select transaction IDs for a given payment amount (oldest-first).
 */
export function autoSelectTxIds(
  paymentAmount: number,
  personTxns: FinanceTransaction[],
  allTxns: FinanceTransaction[],
): number[] {
  const result = computeAllocation(paymentAmount, personTxns, allTxns);
  return result.items
    .filter(item => item.status === 'full' || item.status === 'partial')
    .map(item => item.txId);
}

/**
 * Build repayment description from allocation result.
 */
export function buildRepaymentDescription(
  personName: string,
  allocation: AllocationResult,
): string {
  const parts: string[] = [];
  if (allocation.coveredTxIds.length > 0) {
    parts.push(`Fully repaid ${allocation.coveredTxIds.length} transaction(s)`);
  }
  if (allocation.partialTxIds.length > 0) {
    parts.push(`Partially repaid ${allocation.partialTxIds.length} transaction(s)`);
  }
  if (allocation.overpaymentAmount > 0) {
    parts.push(`Overpayment: $${allocation.overpaymentAmount.toFixed(2)} credit`);
  }
  return parts.length > 0
    ? `Payment from ${personName}: ${parts.join(' • ')}`
    : `Payment from ${personName}`;
}
