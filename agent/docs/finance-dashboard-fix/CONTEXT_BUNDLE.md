# CONTEXT_BUNDLE.md — Finance Page Context

> Self-contained reference for the target AI. Contains all relevant file paths, type definitions, IPC endpoints, current code structure, and design tokens.

---

## 1. File Map

| File | Purpose |
|------|---------|
| `src/pages/FinancePage.tsx` | Main Finance page — tabs (overview, wallets, transactions, categories, subscriptions, audit), state management, net worth calc |
| `src/components/finance/OverviewTab.tsx` | Dashboard/overview — income/expense cards, spending by category, net worth line chart, recent transactions, accounts list |
| `src/components/finance/SubscriptionsTab.tsx` | Subscription management — list with CRUD, filter by status, monthly/yearly totals |
| `src/components/finance/SubscriptionModal.tsx` | Subscription create/edit form — name, price, wallet, billing cycle, dates, cancel URL, reminder |
| `src/components/finance/RecentTxnsCard.tsx` | Recent 5 transactions widget — shows ALL transactions including onBehalfOf |
| `src/components/finance/SpendingCategoryChart.tsx` | Doughnut chart — spending breakdown by category (data already filtered by backend) |
| `src/components/finance/modals/modalParts.tsx` | Shared modal parts — OnBehalfOfSection, AmountInput, TypeToggle, AdvancedToggle |
| `src/components/finance/finance-types.ts` | TypeScript interfaces for all finance entities |
| `src/main.ts` | Electron main — all finance IPC handlers, DB schema, transfer logic with fee calculation |

---

## 2. TypeScript Interfaces

### FinanceTransaction (`finance-types.ts:77-95`)
```ts
interface FinanceTransaction {
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
  on_behalf_of: number;        // 0 = own, 1 = on behalf of someone else
  on_behalf_of_label: string | null;  // "John's dinner", "Mom's rent", etc.
  created_at: string;
  updated_at: string;
}
```

### FinanceSummary (`finance-types.ts:97-102`)
```ts
interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  periodComparison?: { incomeChange: number; expenseChange: number };
}
```

### FinanceSubscription (`finance-types.ts:125-143`)
```ts
interface FinanceSubscription {
  id: number;
  wallet_id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  billing_interval: number;
  start_date: string | null;
  next_renewal_date: string | null;
  cancel_url: string;
  cancel_reminder_days: number;
  reminder_note: string;
  status: 'active' | 'cancelled' | 'paused' | 'expired';
  category_id: number | null;
}
```

### FinanceAccount & FinanceWallet (`finance-types.ts:1-31`)
```ts
interface FinanceAccount {
  id: number;
  name: string;
  type: 'personal' | 'joint' | 'custodial' | 'business';
  // ...
}

interface FinanceWallet {
  id: number;
  account_id: number;
  type: 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'physical' | 'other';
  transfer_fee_type?: string;   // 'none' | 'fixed' | 'percentage'
  transfer_fee_value?: number;
  // ...
}
```

---

## 3. IPC Endpoints

### Summary `/ Overview
| Channel | Handler (main.ts) | Purpose |
|---------|-------------------|---------|
| `finance:get-summary` | L20938 | Returns `{ totalIncome, totalExpense, netBalance }` — income/expense filter `on_behalf_of=0`, netBalance excludes `type='custodial'` accounts |
| `finance:get-spending-by-category` | L20954 | Spending grouped by category — filters `on_behalf_of=0` |
| `finance:get-monthly-trends` | L20967 | Monthly income/expense/net — filters `on_behalf_of=0` |
| `finance:get-on-behalf-of-summary` | L20982 | Total expense + breakdown for `on_behalf_of=1` transactions |

### Subscriptions
| Channel | Handler (main.ts) | Purpose |
|---------|-------------------|---------|
| `subscriptions:list` | L21159 | List all or by wallet_id |
| `subscriptions:create` | L21169 | Create subscription |
| `subscriptions:update` | L21186 | Update subscription |
| `subscriptions:delete` | L21205 | Delete subscription |
| `subscriptions:get-upcoming-renewals` | L21213 | Subscriptions renewing within N days |

### Transfer with Fees
| Channel | Handler (main.ts) | Purpose |
|---------|-------------------|---------|
| `finance:create-transfer` | L20759+ | Full transfer logic with fee deduction |
| `finance:update-wallet-fees` | L20522 | Update wallet `transfer_fee_type`/`transfer_fee_value` |

---

## 4. DB Schema (relevant tables, main.ts)

### finance_transactions (L2677+)
```sql
CREATE TABLE finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  wallet_id INTEGER,
  category_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
  amount REAL NOT NULL DEFAULT 0,
  description TEXT,
  note TEXT,
  date TEXT NOT NULL,
  time TEXT,
  is_recurring INTEGER DEFAULT 0,
  recurring_interval TEXT,
  tags TEXT,
  transfer_id TEXT,          -- UUID linking transfer legs
  from_wallet_id INTEGER,
  to_wallet_id INTEGER,
  on_behalf_of INTEGER DEFAULT 0,   -- ← ADDED LATER
  on_behalf_of_label TEXT,           -- ← ADDED LATER
  created_at TEXT,
  updated_at TEXT
);
```

### finance_subscriptions (L2672+)
```sql
CREATE TABLE finance_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT NOT NULL,
  billing_interval INTEGER DEFAULT 1,
  start_date TEXT,
  next_renewal_date TEXT,
  cancel_url TEXT,
  cancel_reminder_days INTEGER DEFAULT 7,
  reminder_note TEXT,
  status TEXT DEFAULT 'active',
  category_id INTEGER
);
```

### finance_wallets (transfer_fee columns added later)
```sql
-- Added to finance_wallets:
ALTER TABLE finance_wallets ADD COLUMN transfer_fee_type TEXT DEFAULT 'none';
ALTER TABLE finance_wallets ADD COLUMN transfer_fee_value REAL DEFAULT 0;
```

---

## 5. Net Worth Calculation (FinancePage.tsx:672-688)

```tsx
const netWorth = useMemo(() =>
  accounts.reduce((s, a) => {
    if (a.type === 'custodial') return s;      // ← excludes custodial
    const walletSum = wallets
      .filter(w => w.account_id === a.id && !w.is_archived)
      .reduce((ws, w) => {
        const wb = (w.type === 'physical' || w.type === 'cash') && w.metadata?.denominations
          ? (Array.isArray(w.metadata.denominations)
              ? w.metadata.denominations.reduce((sx, d) => sx + (d.value || 0) * (d.count || 0), 0)
              : (w.balance ?? 0))
          : (w.balance ?? 0);
        return ws + convertAmount(wb, w.currency, displayCurrency);
      }, 0);
    return s + walletSum;
  }, 0),
  [accounts, wallets, displayCurrency]
);
```

---

## 6. Summary Query Logic (main.ts:20937-20995)

### `finance:get-summary`
```sql
-- Income: on_behalf_of=0 only
SELECT COALESCE(SUM(amount),0) as total FROM finance_transactions WHERE type='income' AND on_behalf_of = 0
-- Expense: on_behalf_of=0 only  
SELECT COALESCE(ABS(SUM(amount)),0) as total FROM finance_transactions WHERE type='expense' AND on_behalf_of = 0
-- NetBalance: excludes custodial accounts
SELECT COALESCE(SUM(balance),0) as total FROM finance_accounts WHERE is_archived=0 AND type!='custodial'
```

### `finance:get-monthly-trends`
```sql
SELECT strftime('%Y-%m', date) as month,
  COALESCE(SUM(CASE WHEN type='income' AND on_behalf_of = 0 THEN amount ELSE 0 END),0) as income,
  COALESCE(ABS(SUM(CASE WHEN type='expense' AND on_behalf_of = 0 THEN amount ELSE 0 END)),0) as expense,
  COALESCE(SUM(CASE WHEN on_behalf_of = 0 THEN amount ELSE 0 END),0) as net
FROM finance_transactions
GROUP BY month ORDER BY month DESC LIMIT 12
```

### `finance:get-on-behalf-of-summary`
```sql
-- Total on_behalf_of expense
SELECT COALESCE(ABS(SUM(amount)),0) as total FROM finance_transactions WHERE type='expense' AND on_behalf_of = 1
-- Breakdown by label
SELECT COALESCE(on_behalf_of_label, 'Someone') as label, COALESCE(ABS(SUM(amount)),0) as total, COUNT(*) as count
FROM finance_transactions WHERE type='expense' AND on_behalf_of = 1
GROUP BY on_behalf_of_label ORDER BY total DESC
```

---

## 7. Transfer Fee Logic (main.ts:20790-20850)

```ts
// Read fee config from SOURCE wallet's dedicated DB columns
const srcWalletRow = db.prepare('SELECT transfer_fee_type, transfer_fee_value FROM finance_wallets WHERE id = ?').get(srcWalletId);
const feeType = srcWalletRow?.transfer_fee_type || 'none';
const feeValue = Number(srcWalletRow?.transfer_fee_value) || 0;
let feeAmount = 0;
if (feeType !== 'none' && feeValue > 0) {
  feeAmount = feeType === 'percentage' ? (baseAmt * feeValue / 100) : feeValue;
}

// Fee creates an expense transaction with category 'Transfer Fee'
// The source wallet is debited: amount + fee
// The destination wallet is credited: amount only (no fee)
```

---

## 8. Current Layout Structure (OverviewTab.tsx)

The overview tab renders in a 4-column grid:
1. **Cols 1-2:** IncomeExpenseCard (income vs expense bar)
2. **Col 3:** Own Spending card (expense with `on_behalf_of=0`)
3. **Col 4:** OnBehalfOfSummary card (conditional — only shown if `totalExpense > 0`)
4. **Cols 1-2:** Net flow this month (sparkline + MoM delta)
5. **All 4 cols:** FinanceInsightsCard
6. **All 4 cols:** Net worth across currencies grid
7. **Cols 1-2:** NetWorthLineChart
8. **Cols 3-4:** SpendingCategoryChart (doughnut)
9. **Cols 1-2:** Cashflow bar chart (last 6 months)
10. **Cols 3-4:** RecentTxnsCard (shows 5 most recent, ANY on_behalf_of value)

---

## 9. Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Page accent | `#10b981` (emerald-500) | Primary actions, focus rings |
| Income | `emerald-400` (`#34d399`) | Money direction |
| Expense | `red-400` (`#f87171`) | Money direction |
| Transfer | `amber-400` (`#fbbf24`) | Money direction |
| OnBehalfOf | `amber-400` | Separate tracking indication |
| Custodial | `amber-400` | Warning highlight |
| Glass surface | `zinc-900/80` + `backdrop-blur-xl` | Cards |
| Canvas | `zinc-950` | Page background |

---

## 10. Known Issues / Gaps

1. **Subscriptions have NO transaction integration** — creating a subscription does NOT create a `finance_transactions` record for the subscription expense. Subscriptions are purely a tracker with renewal dates but no ledger impact.
2. **RecentTxnsCard shows ALL transactions** — includes `on_behalf_of=1` transactions alongside own transactions, making the "recent activity" section confusing.
3. **SpendingCategoryChart data comes from backend which already filters** — but the overview doesn't clearly communicate that onBehalfOf expenses are excluded from charts.
4. **Net worth uses wallet.balance directly** — may include custodial wallet balances through the account→wallet join if custodial accounts have wallets with non-zero balance. The `a.type === 'custodial'` guard skips the account-level iteration but the account's wallets may still show zero in net worth.
5. **Transfer fee creates an expense transaction** — but there's no UI anywhere to view/edit the transfer fee configuration on a wallet.
6. **No recurring transaction generation** — `is_recurring` and `recurring_interval` exist on the transactions table but there's no scheduler/cron to auto-generate recurring transactions.
7. **OnBehalfOf only captures expense** — the summary only has `totalExpense` for onBehalfOf, but income can also be on-behalf-of.

---

## 11. Transaction Create Flow (FinancePage.tsx:371-463)

The `handleAddTransaction` function:
1. If type is `transfer` + has `to_wallet_id` → calls `financeCreateTransfer` IPC
2. For transfers: handles destination wallet metadata (denominations) sync, source wallet metadata (denominations) deduction
3. For all other types → calls `financeCreateTransaction` IPC
4. For physical/cash wallets: syncs wallet metadata (`denominations`) after transaction
5. All flows call `fetchData()` at the end
