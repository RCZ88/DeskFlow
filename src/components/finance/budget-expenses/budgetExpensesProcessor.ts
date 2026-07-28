export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time';

const FREQUENCY_TO_MONTHLY: Record<Frequency, number> = {
  daily: 30.437, weekly: 4.345, biweekly: 2.172, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12, one_time: 0,
};

export interface FixedItem {
  id: number; name: string; amount: number; frequency: Frequency | string;
  type: 'income' | 'expense'; next_due_date?: string | null;
  category_id?: number | null; wallet_id?: number | null;
  is_active: number | boolean; metadata?: string | null;
}

export interface Budget {
  id: number; name: string; amount: number; type?: string;
  category_id?: number | null; period?: string;
  alert_threshold?: number | null; is_active: number | boolean;
}

export interface BudgetStatus extends Budget {
  spent: number; remaining: number; utilization: number;
  status: 'safe' | 'warning' | 'danger' | 'over';
}

export interface CashFlowSummary {
  monthlyIncome: number; monthlyExpenses: number; netCashFlow: number;
  annualIncome: number; annualExpenses: number; savingsRate: number; isSurplus: boolean;
}

export interface UpcomingPayment {
  id: number; name: string; amount: number; type: 'income' | 'expense';
  dueDate: Date; daysUntilDue: number; isOverdue: boolean; isImminent: boolean;
}

export interface LiquidityTier {
  name: string; amount: number; color: string; percentage: number;
}

export interface LiquidityBreakdown {
  tiers: LiquidityTier[]; totalNetWorth: number; liquidityScore: number;
}

export function normalizeToMonthly(amount: number, frequency: Frequency | string): number {
  const mult = FREQUENCY_TO_MONTHLY[frequency as Frequency] ?? 1;
  return amount * mult;
}

export function computeCashFlow(items: FixedItem[]): CashFlowSummary {
  let monthlyIncome = 0; let monthlyExpenses = 0;
  for (const item of items) {
    if (!item.is_active) continue;
    const monthly = normalizeToMonthly(item.amount, item.frequency);
    if (item.type === 'income') monthlyIncome += monthly;
    else if (item.type === 'expense') monthlyExpenses += monthly;
  }
  const netCashFlow = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (netCashFlow / monthlyIncome) * 100 : 0;
  return { monthlyIncome, monthlyExpenses, netCashFlow, annualIncome: monthlyIncome * 12, annualExpenses: monthlyExpenses * 12, savingsRate, isSurplus: netCashFlow >= 0 };
}

export function computeBudgetStatuses(budgets: Budget[], spentMap: Map<number, number>): BudgetStatus[] {
  return budgets.filter((b) => b.is_active).map((budget) => {
    const spent = spentMap.get(budget.id) ?? 0;
    const utilization = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const remaining = budget.amount - spent;
    const threshold = budget.alert_threshold ?? 80;
    let status: BudgetStatus['status'] = 'safe';
    if (utilization >= 100) status = 'over';
    else if (utilization >= threshold) status = 'danger';
    else if (utilization >= threshold * 0.75) status = 'warning';
    return { ...budget, spent, remaining, utilization, status };
  }).sort((a, b) => b.utilization - a.utilization);
}

export function getUpcomingPayments(items: FixedItem[], limit = 5): UpcomingPayment[] {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return items.filter((i) => i.is_active && i.next_due_date).map((item) => {
    const dueDate = new Date(item.next_due_date as string);
    const diffMs = dueDate.getTime() - now.getTime();
    const daysUntilDue = Math.ceil(diffMs / 86_400_000);
    return { id: item.id, name: item.name, amount: item.amount, type: item.type, dueDate, daysUntilDue, isOverdue: daysUntilDue < 0, isImminent: daysUntilDue >= 0 && daysUntilDue <= 3 };
  }).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, limit);
}

export function computeLiquidityScore(tiers: LiquidityTier[]): number {
  const weights: Record<string, number> = { Immediate: 1.0, 'Same Day': 0.75, '1-3 Days': 0.5, Locked: 0.0 };
  const total = tiers.reduce((s, t) => s + t.amount, 0);
  if (total <= 0) return 0;
  const score = tiers.reduce((s, t) => s + t.amount * (weights[t.name] ?? 0), 0);
  return (score / total) * 100;
}
