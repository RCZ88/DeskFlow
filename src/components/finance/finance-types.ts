export interface FinanceAccount {
  id: number;
  name: string;
  type: 'personal' | 'joint' | 'custodial' | 'business';
  description: string | null;
  icon: string;
  color: string;
  currency: string;
  balance: number;
  is_archived: number;
  parent_account_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceWallet {
  id: number;
  account_id: number;
  name: string;
  type: 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'other';
  provider: string | null;
  last_four: string | null;
  balance: number;
  currency: string;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceCategory {
  id: number;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  icon: string;
  color: string;
  sort_order: number;
  is_archived: number;
  created_at: string;
}

export interface FinanceTransaction {
  id: number;
  account_id: number;
  wallet_id: number | null;
  category_id: number;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string | null;
  note: string | null;
  date: string;
  time: string | null;
  is_recurring: number;
  recurring_interval: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  periodComparison?: { incomeChange: number; expenseChange: number };
}

export interface FinanceSpendingByCategory {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
}

export interface FinanceMonthlyTrend {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface FinanceBalanceHistory {
  date: string;
  balance: number;
}

export type FinanceTabKey = 'overview' | 'accounts' | 'transactions' | 'categories';
