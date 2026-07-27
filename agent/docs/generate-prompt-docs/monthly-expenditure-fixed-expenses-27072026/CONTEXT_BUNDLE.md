# CONTEXT_BUNDLE.md — Monthly Expenditure & Fixed Expenses Feature

## Project Overview
DeskFlow is an Electron + React + better-sqlite3 desktop app. The Finance page (`/finance`) is a full money management system with wallets, transactions, categories, subscriptions, crypto, people (Follow Through), audit log, and charts. The feature request is to add **Fixed Expenses** (recurring monthly costs like parking, phone plans, food budgets) and a **Budget System** (spending limits with warnings).

---

## 1. Current Finance Page Architecture

### Tabs (src/pages/FinancePage.tsx, line 58-67)
```tsx
const tabs = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard /> },
  { key: 'wallets', label: 'Wallets', icon: <Wallet /> },
  { key: 'transactions', label: 'Transactions', icon: <ArrowUpRight /> },
  { key: 'people', label: 'People', icon: <Users /> },
  { key: 'categories', label: 'Categories', icon: <Tag /> },
  { key: 'subscriptions', label: 'Subscriptions', icon: <Bell /> },
  { key: 'audit', label: 'Audit Log', icon: <Shield /> },
  { key: 'charts', label: 'Charts', icon: <BarChart3 /> },
];
```
Two new tabs will be added: `fixed-expenses` and `budget`.

### Finance Types (src/components/finance/finance-types.ts)
```tsx
export interface FinanceTransaction {
  id: number;
  account_id: number;
  wallet_id: number | null;
  category_id: number;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  fee: number;
  merchant: string | null;
  description: string | null;
  note: string | null;
  date: string;
  time: string | null;
  is_recurring: number;
  recurring_interval: string | null;
  tags: string | null;
  transfer_id: string | null;
  from_wallet_id: number | null;
  to_wallet_id: number | null;
  on_behalf_of: number;
  on_behalf_of_label: string | null;
  ft_person_id: number | null;
  is_adjustment: number;
  metadata: string | null;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  periodComparison?: { incomeChange: number; expenseChange: number };
}

export type FinanceTabKey = 'overview' | 'wallets' | 'transactions' | 'categories' | 'people' | 'charts';
```

---

## 2. Existing Subscription System (the model to follow)

### DB Schema (src/main.ts, line 3047)
```sql
CREATE TABLE IF NOT EXISTS finance_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT DEFAULT 'monthly',
  billing_interval INTEGER DEFAULT 1,
  start_date TEXT,
  next_renewal_date TEXT,
  cancel_url TEXT DEFAULT '',
  cancel_reminder_days INTEGER DEFAULT 7,
  reminder_note TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  category_id INTEGER,
  payment_status TEXT DEFAULT 'pending',
  last_payment_date TEXT,
  last_payment_txn_id INTEGER,
  autodebet INTEGER DEFAULT 1,
  subscription_type TEXT DEFAULT 'recurring_autodebet',
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Subscription IPC Endpoints (preload.ts, lines 1017-1029)
```tsx
subscriptionsList: (walletId?) => ipcRenderer.invoke('subscriptions:list', walletId),
subscriptionsCreate: (data) => ipcRenderer.invoke('subscriptions:create', data),
subscriptionsUpdate: (data) => ipcRenderer.invoke('subscriptions:update', data),
subscriptionsDelete: (id) => ipcRenderer.invoke('subscriptions:delete', id),
subscriptionsGetUpcomingRenewals: (days?) => ipcRenderer.invoke('subscriptions:get-upcoming-renewals', days),
subscriptionsGenerateDueTransactions: () => ipcRenderer.invoke('subscriptions:generate-due-transactions'),
subscriptionsSkipRenewal: (id) => ipcRenderer.invoke('subscriptions:skip-renewal', id),
subscriptionsMoveTransaction: (data) => ipcRenderer.invoke('subscriptions:move-transaction', data),
subscriptionsRetryPayment: (data) => ipcRenderer.invoke('subscriptions:retry-payment', data),
subscriptionsToggleAutodebet: (id) => ipcRenderer.invoke('subscriptions:toggle-autodebet', id),
subscriptionsRecordPayment: (data) => ipcRenderer.invoke('subscriptions:record-payment', data),
subscriptionsGetPaymentHistory: (id) => ipcRenderer.invoke('subscriptions:get-payment-history', id),
subscriptionsCancelPayment: (data) => ipcRenderer.invoke('subscriptions:cancel-payment', data),
```

### Subscription IPC Handlers Pattern (src/main.ts, line 26135-26200)
```tsx
// Helper: Get or create subscription category
function getSubCategoryId() {
  if (!db) return null;
  let cat = db.prepare("SELECT id FROM finance_categories WHERE name = 'Subscriptions' LIMIT 1").get();
  if (cat) return cat.id;
  const result = db.prepare("INSERT INTO finance_categories (name, type, icon, color, sort_order) VALUES ('Subscriptions', 'expense', 'Bell', '#8b5cf6', 16)").run();
  return Number(result.lastInsertRowid);
}

electron_1.ipcMain.handle('subscriptions:list', async (_event, walletId?: number) => {
  if (!db) return [];
  try {
    if (walletId) {
      return db.prepare('SELECT * FROM finance_subscriptions WHERE wallet_id = ? ORDER BY next_renewal_date ASC').all(walletId);
    }
    return db.prepare('SELECT * FROM finance_subscriptions ORDER BY next_renewal_date ASC').all();
  } catch { return []; }
});
```

### Subscription Intelligence (src/main.ts, line 27322)
```tsx
electron_1.ipcMain.handle('finance:get-subscription-intelligence', async () => {
  // Computes: totalMonthlyCost, burdenPercentage, monthlyIncome, subscriptionCount,
  // growthTrend, upcomingRenewals, urgentRenewals, radarData, subscriptions[]
  // Uses BILLING_DAYS map: { daily: 1, weekly: 7, monthly: 30.44, quarterly: 91.31, yearly: 365.25 }
  // monthlyEquivalent = (price / days) * 30.44
});
```

### computeNextRenewal helper (used everywhere)
```tsx
function computeNextRenewal(dateStr: string, cycle: string, interval: number): string {
  const d = new Date(dateStr);
  switch (cycle) {
    case 'weekly': d.setDate(d.getDate() + 7 * interval); break;
    case 'monthly': d.setMonth(d.getMonth() + interval); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3 * interval); break;
    case 'yearly': d.setFullYear(d.getFullYear() + interval); break;
  }
  return toLocalDateStr(d);
}
```

---

## 3. Transaction Creation Pattern

### IPC: finance:create-transaction (src/main.ts, line 24564)
```tsx
electron_1.ipcMain.handle('finance:create-transaction', async (_event, data: any) => {
  // Accepts: { account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, date, time, tags, on_behalf_of, on_behalf_of_label, ft_person_id, is_recurring, recurring_interval }
  // Creates transaction, deducts/adds to wallet balance, updates account balance
  // Handles encryption if financeDataKey is set
});
```

### IPC: finance:get-transactions (src/main.ts, line 24517)
```tsx
electron_1.ipcMain.handle('finance:get-transactions', async (_event, filters?: any) => {
  // Accepts filters: { wallet_id?, category_id?, type?, date_from?, date_to?, limit?, offset? }
  // Returns array of FinanceTransaction objects (decrypted)
});
```

---

## 4. Finance Summary & Monthly Trends

### finance:get-summary (src/main.ts, line 25371)
```tsx
// Returns: { totalIncome, totalExpense, netBalance }
// Income = SUM(amount) FROM finance_transactions WHERE type='transfer' AND amount > 0
// Expense = SUM(ABS(amount)) FROM finance_transactions WHERE type='expense'
// NetWorth = SUM(balance) FROM finance_wallets WHERE is_archived=0
```

### finance:get-monthly-trends (src/main.ts, line 25422)
```tsx
// Returns: Array<{ month: string, income: number, expense: number, net: number }>
// Groups by strftime('%Y-%m', date), last 12 months
```

### finance:get-spending-by-category (src/main.ts, line 25392)
```tsx
// Returns: Array<{ categoryId, categoryName, categoryColor, categoryIcon, amount, count }>
```

---

## 5. OverviewTab Components (what the dashboard shows)

### src/components/finance/OverviewTab.tsx (imports, lines 1-28)
```tsx
import { IncomeExpenseCard } from './IncomeExpenseCard';
import { FinanceInsightsCard } from './FinanceInsightsCard';
import { RecentTxnsCard } from './RecentTxnsCard';
import { FollowThroughCard } from './FollowThroughCard';
import { SpendingSplitCard } from './SpendingSplitCard';
import LiquidityWaterfall from './LiquidityWaterfall';
import SubscriptionBurdenRadar from './SubscriptionBurdenRadar';
import CashFlowRunway from './CashFlowRunway';
import WalletHealthScorecards from './WalletHealthScorecards';
import TransferCostMatrix from './TransferCostMatrix';
import CryptoUnifiedPortfolio from './CryptoUnifiedPortfolio';
```

### OverviewTab Props (lines 32-60)
```tsx
interface OverviewTabProps {
  summary: FinanceSummary | null;
  spendingByCategory: FinanceSpendingByCategory[];
  monthlyTrends: FinanceMonthlyTrend[];
  accounts: FinanceAccount[];
  recentTransactions: FinanceTransaction[];
  allTransactions?: FinanceTransaction[];
  categories: FinanceCategory[];
  wallets: FinanceWallet[];
  subscriptions?: any[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  displayCurrency: string;
  baseCurrency: string;
  currentNetWorth?: number;
  // ... more callbacks
}
```

---

## 6. Design System & Glass Pattern

### Glass Card Pattern (used throughout finance)
```tsx
// GlassSurface component (src/components/finance/_fx/GlassSurface.tsx)
// Pattern: bg-[rgba(24,24,27,0.80)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)]
// With top-edge highlight lines and hover states
```

### Finance Motion (src/components/finance/_fx/financeMotion.ts)
```tsx
export const pageContainer = { /* framer-motion stagger container */ };
export const riseItem = { /* framer-motion rise animation */ };
export const tabPanel = { /* tab panel transitions */ };
export const fab = { /* floating action button animation */ };
export const DUR = { /* duration constants */ };
```

### Currency Formatting (src/components/finance/currency-data.ts)
```tsx
export function formatCurrency(amount: number, currency?: string): string;
export function convertAmount(amount: number, from: string, to: string): number;
export function getCurrencyInfo(code: string): { symbol: string; name: string; ... };
export const COMMON_CURRENCIES = [ ... ];
```

### Number Masking (src/context/NumberMaskContext.tsx)
```tsx
// useNumberMask() hook — masks finance numbers for privacy
// maskNumber(value, mode, fixedValue) utility
```

### Color Tokens
```css
--bg-primary: zinc-950 (#09090b)
--bg-secondary: zinc-900 (#18181b)
--bg-tertiary: zinc-800 (#27272a)
--accent-primary: amber-500 (#f59e0b)
--accent-secondary: emerald-500 (#10b981)
--danger: red-500 (#ef4444)
--text-primary: zinc-50 (#fafafa)
--text-secondary: zinc-400 (#a1a1aa)
--text-muted: zinc-500 (#71717a)
--border: zinc-700/30
```

### Finance Page Tab Styling
```tsx
// Tabs use glass surface with active state:
// Active: bg-zinc-800/80 border-b-2 border-amber-500
// Inactive: bg-transparent hover:bg-zinc-800/40
// Tab content: motion.div with AnimatePresence for tab switching
```

---

## 7. Existing IPC Endpoint Inventory (Finance)

### Full preload.ts finance bridge (lines 947-1058)
```
financeGetAccounts, financeCreateAccount, financeUpdateAccount
financeGetWallets, financeCreateWallet, financeUpdateWallet
financeGetWallet, financeUpdateWalletMetadata
financeFetchCryptoPrices, financeGetCryptoHistory, financeGetCryptoAssetHistory
financeGetCategories, financeCreateCategory, financeUpdateCategory
financeGetTransactions, financeCreateTransaction, financeCreateAdjustment
financeCreateTransfer, financeUpdateTransaction, financeDeleteTransaction
financeGetSummary, financeGetSpendingByCategory, financeGetMonthlyTrends
financeGetOnBehalfOfSummary
financeGetFtPersons, financeCreateFtPerson, financeFtPersonTopup, financeFtPersonDeduct
financeRecalculateBalances, financeApplyRecalculatedBalance
financeGetCryptoUnifiedPortfolio, financeGetLiquidityBreakdown
financeGetSubscriptionIntelligence, financeGetCashflowRunway
financeGetWalletHealth, financeGetTransferCostMatrix
subscriptionsList, subscriptionsCreate, subscriptionsUpdate, subscriptionsDelete
subscriptionsGetUpcomingRenewals, subscriptionsGenerateDueTransactions
subscriptionsSkipRenewal, subscriptionsMoveTransaction, subscriptionsRetryPayment
subscriptionsToggleAutodebet, subscriptionsRecordPayment
subscriptionsGetPaymentHistory, subscriptionsCancelPayment
```

---

## 8. SubscriptionRenewalBanner (finance overview)

### src/components/finance/SubscriptionRenewalBanner.tsx
```tsx
// Shows upcoming subscription renewals in the Overview tab
// Warns when renewals are due within X days
// Links to Subscriptions tab for details
```

---

## 9. Backend Audit — What Exists vs What Needs Building

| Feature | IPC Channel | Handler Exists? | DB Schema | Status |
|---------|-------------|-----------------|-----------|--------|
| Fixed Expenses CRUD | ❌ | ❌ | ❌ | ⚠️ MUST BUILD |
| Fixed Expense → Transaction | ❌ | ❌ | ❌ | ⚠️ MUST BUILD |
| Mark Fixed Expense Paid | ❌ | ❌ | ❌ | ⚠️ MUST BUILD |
| Detect Recurring from Txns | ❌ | ❌ | ❌ | ⚠️ MUST BUILD |
| Budget Set/Get | ❌ | ❌ | ❌ | ⚠️ MUST BUILD |
| Budget vs Actual Comparison | ❌ | ❌ | ❌ | ⚠️ MUST BUILD |
| Budget Warnings | ❌ | ❌ | ❌ | ⚠️ MUST BUILD |
| Monthly Expenditure Summary | ❌ | ❌ | ❌ | ⚠️ MUST BUILD |
| Subscription System | subscriptions:* | ✅ main.ts:26135+ | ✅ finance_subscriptions | ✅ EXISTS |
| Transaction System | finance:create-transaction | ✅ main.ts:24564 | ✅ finance_transactions | ✅ EXISTS |
| Summary/Analytics | finance:get-summary | ✅ main.ts:25371 | ✅ finance_transactions | ✅ EXISTS |

---

## 10. FinancePage State Management (src/pages/FinancePage.tsx)

### Key State Variables
```tsx
const [isLocked, setIsLocked] = useState(true);
const [isFirstTime, setIsFirstTime] = useState(false);
const [activeTab, setActiveTab] = useState<FinanceTabKey>('overview');
const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
const [wallets, setWallets] = useState<FinanceWallet[]>([]);
const [categories, setCategories] = useState<FinanceCategory[]>([]);
const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
const [subscriptions, setSubscriptions] = useState<any[]>([]);
const [summary, setSummary] = useState<FinanceSummary | null>(null);
const [spendingByCategory, setSpendingByCategory] = useState<FinanceSpendingByCategory[]>([]);
const [monthlyTrends, setMonthlyTrends] = useState<FinanceMonthlyTrend[]>([]);
const [displayCurrency, setDisplayCurrency] = useState('USD');
const [baseCurrency, setBaseCurrency] = useState('USD');
```

### Data Loading Pattern
```tsx
const loadData = useCallback(async () => {
  // Parallel fetch all finance data
  const [acctRes, walRes, catRes, txnRes, sumRes, spcRes, mtRes, subRes] = await Promise.allSettled([
    window.deskflowAPI.financeGetAccounts(),
    window.deskflowAPI.financeGetWallets(),
    window.deskflowAPI.financeGetCategories(),
    window.deskflowAPI.financeGetTransactions({ limit: 500 }),
    window.deskflowAPI.financeGetSummary(),
    window.deskflowAPI.financeGetSpendingByCategory(),
    window.deskflowAPI.financeGetMonthlyTrends(),
    window.deskflowAPI.subscriptionsList(),
  ]);
  // ... set state from results
}, []);
```

---

## 11. SubscriptionModal (src/components/finance/SubscriptionModal.tsx)

### Form Fields (lines 34-50)
```tsx
const INITIAL = {
  wallet_id: 0,
  name: '',
  description: '',
  price: '',
  currency: 'USD',
  billing_cycle: 'monthly',
  billing_interval: 1,
  start_date: '',
  next_renewal_date: '',
  cancel_url: '',
  cancel_reminder_days: 7,
  reminder_note: '',
  status: 'active',
  subscription_type: 'recurring_autodebet',
  category_id: null as number | null,
};
```

### BILLING_CYCLES constant
```tsx
const BILLING_CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom interval' },
];
```

---

## 12. Existing Seed Categories (FinancePage.tsx, lines 40-56)
```tsx
const SEED_CATEGORIES = [
  { name: 'Salary', type: 'income', icon: 'CircleDollarSign', color: '#10b981', sort_order: 1 },
  { name: 'Freelance', type: 'income', icon: 'CircleDollarSign', color: '#34d399', sort_order: 2 },
  { name: 'Gift', type: 'income', icon: 'CircleDollarSign', color: '#6ee7b7', sort_order: 3 },
  { name: 'Interest', type: 'income', icon: 'CircleDollarSign', color: '#a7f3d0', sort_order: 4 },
  { name: 'Refund', type: 'income', icon: 'CircleDollarSign', color: '#6ee7b7', sort_order: 5 },
  { name: 'Food & Groceries', type: 'expense', icon: 'TrendingDown', color: '#ef4444', sort_order: 6 },
  { name: 'Transport', type: 'expense', icon: 'TrendingDown', color: '#f97316', sort_order: 7 },
  { name: 'Housing', type: 'expense', icon: 'TrendingDown', color: '#f59e0b', sort_order: 8 },
  { name: 'Utilities', type: 'expense', icon: 'TrendingDown', color: '#eab308', sort_order: 9 },
  { name: 'Entertainment', type: 'expense', icon: 'TrendingDown', color: '#ec4899', sort_order: 10 },
  { name: 'Shopping', type: 'expense', icon: 'TrendingDown', color: '#d946ef', sort_order: 11 },
  { name: 'Health', type: 'expense', icon: 'TrendingDown', color: '#8b5cf6', sort_order: 12 },
  { name: 'Education', type: 'expense', icon: 'TrendingDown', color: '#6366f1', sort_order: 13 },
  { name: 'Other', type: 'expense', icon: 'TrendingDown', color: '#52525b', sort_order: 14 },
  { name: 'Transfer', type: 'transfer', icon: 'ArrowLeftRight', color: '#f59e0b', sort_order: 15 },
];
```

---

## 13. DB Migration Pattern (src/main.ts)

```tsx
// Version check pattern:
const currentVersion = db.pragma('user_version', { simple: true }) as number;
if (currentVersion < N) {
  db.exec('ALTER TABLE ... ADD COLUMN ...');
  db.pragma(`user_version = N`);
}

// All tables use: created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
// Finance tables prefix: finance_*
// Subscription table: finance_subscriptions
```

---

## 14. Encryption Layer

```tsx
// Finance data encrypted when financeDataKey is set (from password)
function encryptField(value: string, key: Buffer): string;
function decryptField(value: string, key: Buffer): string;
function isEncrypted(value: any): boolean;
// All IPC handlers check financeDataKey before encrypt/decrypt
// Metadata JSON is encrypted as a whole string
```

---

## 15. Dashboard FinanceOverviewSection (src/components/dashboard/FinanceOverviewSection.tsx)

```tsx
// Shows on main Dashboard — finance summary card
// Links to /finance page
// Shows: total net worth, income, expenses, subscription count
// Uses financeGetDashboardOverview IPC
```

---

## 16. Audit Log Pattern

```tsx
function logAuditEvent(eventType: string, entityType: string | null, entityId: number | null, description: string, details?: any) {
  // Inserts into finance_audit_log table
  // Called after every CRUD operation on finance entities
}
```
