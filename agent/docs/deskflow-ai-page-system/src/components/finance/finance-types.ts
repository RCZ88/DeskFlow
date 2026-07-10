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
  type: 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'physical' | 'other';
  provider: string | null;
  last_four: string | null;
  balance: number;
  currency: string;
  is_archived: number;
  metadata?: string;
  transfer_fee_type?: string;
  transfer_fee_value?: number;
  created_at: string;
  updated_at: string;
}

export interface CashDenomination {
  value: number;
  label: string;
  count: number;
}

export type WalletMetadata =
  | { type: 'bank'; bank_name?: string; branch?: string; account_number?: string; swift?: string; iban?: string; notes?: string }
  | { type: 'debit_card'; card_network?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other'; issuer?: string; daily_limit?: number; notes?: string }
  | { type: 'credit_card'; card_network?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other'; issuer?: string; credit_limit?: number; billing_day?: number; due_day?: number; apr?: number; notes?: string }
  | { type: 'crypto'; coin_id?: string; symbol?: string; blockchain?: string; wallet_address?: string; acquisition_price?: number; notes?: string }
  | { type: 'cash'; denominations?: CashDenomination[]; notes?: string }
  | { type: 'physical'; denominations?: CashDenomination[]; description?: string; notes?: string }
  | { type: 'ewallet'; platform?: string; phone_or_email?: string; daily_limit?: number; notes?: string }
  | { type: 'other'; notes?: string };

export interface CryptoPrice {
  coin_id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  last_updated: string;
}

export interface CryptoHistoryPoint {
  timestamp: number;
  price: number;
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
  on_behalf_of: number;
  on_behalf_of_label: string | null;
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

export interface FinanceSubscription {
  id: number;
  wallet_id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: string;
  billing_interval: number;
  start_date: string | null;
  next_renewal_date: string | null;
  cancel_url: string;
  cancel_reminder_days: number;
  reminder_note: string;
  status: 'active' | 'cancelled' | 'paused' | 'expired';
  category_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: number | null;
  description: string;
  created_at: string;
  decrypted_data?: Record<string, any> | null;
}

export type FinanceTabKey = 'overview' | 'wallets' | 'transactions' | 'categories' | 'subscriptions' | 'audit';
