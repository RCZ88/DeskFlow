import type { FinanceSubscription } from "../components/finance/finance-types";

const PER_YEAR: Record<string, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
  custom: 12,
};

/** Normalize any billing cycle to a monthly figure. */
export function monthlyAmount(s: FinanceSubscription): number {
  const perYear =
    s.billing_cycle === "custom"
      ? 12 / Math.max(1, s.billing_interval || 1)
      : PER_YEAR[s.billing_cycle] ?? 12;
  return (s.price * perYear) / 12;
}

/** Whole days from today (local) until an ISO date string. Negative = overdue. */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** Advance a renewal date by one billing period. Returns ISO yyyy-mm-dd. */
export function advanceRenewal(s: FinanceSubscription, from?: string): string {
  const base = new Date(from ?? s.next_renewal_date ?? new Date().toISOString());
  const n = Math.max(1, s.billing_interval || 1);
  switch (s.billing_cycle) {
    case "weekly":
      base.setDate(base.getDate() + 7 * n);
      break;
    case "monthly":
      base.setMonth(base.getMonth() + n);
      break;
    case "quarterly":
      base.setMonth(base.getMonth() + 3 * n);
      break;
    case "yearly":
      base.setFullYear(base.getFullYear() + n);
      break;
    case "custom":
      base.setMonth(base.getMonth() + n);
      break;
  }
  return base.toISOString().slice(0, 10);
}

/** Tag stored in finance_transactions.tags to link a payment to its subscription. */
export function subscriptionTag(id: number): string {
  return `sub:${id}`;
}

export function isDue(s: FinanceSubscription): boolean {
  const d = daysUntil(s.next_renewal_date);
  return s.status === "active" && d !== null && d <= 0;
}
