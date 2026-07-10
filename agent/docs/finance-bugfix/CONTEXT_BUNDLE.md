# Context Bundle — Finance Page Bugfix & Feature Completion

## Problem Summary

The user reports multiple critical bugs and missing features on the Finance Page:

1. **Balance calculation broken** — expenses appear to ADD to balance instead of subtracting
2. **Net worth line chart** — doesn't sync to all transactions, only shows the latest one
3. **Net worth persistent header percentage** — calculation incorrect
4. **Transaction fee not displayed** — nowhere visible in list or detail views
5. **Follow Through feature incomplete** — no visible badge, no mark-repaid, no person database, no dashboard split
6. **Subscription popup** — doesn't use currency from settings page
7. **AuditLogTab crash** — `logs.map is not a function`
8. **No subscription auto-transaction generation** — when subscription is due, no auto-transaction is created

---

## 1. Data Structures (Interfaces)

### src/components/finance/finance-types.ts (full file, 196 lines)

```typescript
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
  type: 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'physical' | 'investment' | 'other';
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
  fee: number;
  description: string | null;
  note: string | null;
  date: string;
  time: string | null;
  is_recurring: number;
  recurring_interval: string | null;
  tags: string | null;
  on_behalf_of: number;
  on_behalf_of_label: string | null;
  transfer_id: string | null;
  from_wallet_id: number | null;
  to_wallet_id: number | null;
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
  entity_type: string | null;
  entity_id: number | null;
  description: string;
  details: any;
  created_at: string;
  decrypted_data?: Record<string, any> | null;
}
```

---

## 2. Backend — IPC Handlers (src/main.ts)

### Balance Calculation: finance:get-summary (line 21038)

```typescript
ipcMain.handle('finance:get-summary', async () => {
  if (!db) return { totalIncome: 0, totalExpense: 0, netBalance: 0 };
  try {
    const income = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM finance_transactions WHERE type='income'").get() as any;
    const expense = db.prepare("SELECT COALESCE(-SUM(amount),0) as total FROM finance_transactions WHERE type='expense'").get() as any;
    const netBalance = db.prepare("SELECT COALESCE(SUM(balance),0) as total FROM finance_accounts WHERE is_archived=0 AND type!='custodial'").get() as any;
    return {
      totalIncome: income.total,
      totalExpense: expense.total,
      netBalance: netBalance.total,
    };
  } catch {
    return { totalIncome: 0, totalExpense: 0, netBalance: 0 };
  }
});
```

### Transaction Creation: finance:create-transaction (line 20870)

```typescript
ipcMain.handle('finance:create-transaction', async (_event, data: any) => {
  if (!db) return null;
  try {
    const fee = Math.abs(data.fee || 0);
    const stmt = db.prepare(`
      INSERT INTO finance_transactions (account_id, wallet_id, category_id, type, amount, fee, description, note, "date", "time")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.account_id, data.wallet_id || null, data.category_id,
      data.type, data.amount, fee, data.description || null, data.note || null,
      data.date, data.time || null
    );
    // Update account balance
    db.prepare('UPDATE finance_accounts SET balance = balance + ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(data.amount, data.account_id);
    // Update wallet balance if wallet specified
    if (data.wallet_id) {
      db.prepare('UPDATE finance_wallets SET balance = balance + ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(data.amount, data.wallet_id);
    }
    const id = Number(result.lastInsertRowid);
    writeAuditLog('transaction_created', 'transaction', id, `Transaction "${data.description || ''}" created`, { type: data.type, amount: data.amount, fee, category_id: data.category_id });
    return { id, ...data };
  } catch (error: any) {
    console.error('[finance] create transaction error:', error);
    return null;
  }
});
```

### Balance Recalculation: finance:recalculate-balances (line 20672)

```typescript
ipcMain.handle('finance:recalculate-balances', async (_event, walletId: number) => {
  if (!db) return { success: false, error: 'no db' };
  try {
    const wallet = db.prepare('SELECT name, initial_balance, balance, account_id FROM finance_wallets WHERE id = ?').get(walletId) as any;
    if (!wallet) return { success: false, error: 'wallet not found' };
    const result = db.prepare('SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(fee), 0) as total_fee FROM finance_transactions WHERE wallet_id = ?').get(walletId) as any;
    const computedBalance = (wallet.initial_balance || 0) + (result?.total || 0) - (result?.total_fee || 0);
    db.prepare("UPDATE finance_wallets SET balance=?, updated_at=datetime('now','localtime') WHERE id=?").run(computedBalance, walletId);
    writeAuditLog('balance_recalculated', 'wallet', walletId, `Wallet "${wallet.name}" balance recalculated`, {
      initialBalance: wallet.initial_balance || 0,
      txnTotal: result?.total || 0,
      txnFee: result?.total_fee || 0,
      oldBalance: wallet.balance,
      newBalance: computedBalance
    });
    return { success: true, newBalance: computedBalance, oldBalance: wallet.balance };
  } catch (e: any) {
    console.error('[finance] recalculate balances error:', e?.message);
    return { success: false, error: e?.message };
  }
});
```

### Monthly Trends: finance:get-monthly-trends (line 21067)

```typescript
ipcMain.handle('finance:get-monthly-trends', async () => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT strftime('%Y-%m', date) as month,
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
        COALESCE(-SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense,
        COALESCE(SUM(amount),0) as net
      FROM finance_transactions
      GROUP BY month ORDER BY month DESC LIMIT 12
    `).all();
  } catch { return []; }
});
```

### Follow-Through Summary: finance:get-on-behalf-of-summary (line 21081)

```typescript
ipcMain.handle('finance:get-on-behalf-of-summary', async () => {
  if (!db) return { totalExpense: 0, breakdown: [] };
  try {
    const rows = db.prepare(`
      SELECT COALESCE(on_behalf_of_label, 'Unknown') as label,
        SUM(amount) as total, COUNT(*) as count
      FROM finance_transactions
      WHERE on_behalf_of = 1 AND type = 'expense'
      GROUP BY on_behalf_of_label
      ORDER BY total DESC
    `).all() as { label: string; total: number; count: number }[];
    const totalExpense = rows.reduce((s, r) => s + Math.abs(r.total), 0);
    return {
      totalExpense,
      breakdown: rows.map(r => ({ label: r.label, total: Math.abs(r.total), count: r.count })),
    };
  } catch {
    return { totalExpense: 0, breakdown: [] };
  }
});
```

### Audit List: audit:list (line 20526)

```typescript
ipcMain.handle('audit:list', async (_event, params: { entityType?: string; entityId?: number; limit?: number; offset?: number }) => {
  if (!db) return { rows: [], total: 0 };
  try {
    const conditions: string[] = [];
    const values: any[] = [];
    if (params?.entityType) { conditions.push('entity_type = ?'); values.push(params.entityType); }
    if (params?.entityId != null) { conditions.push('entity_id = ?'); values.push(params.entityId); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const total = (db.prepare(`SELECT COUNT(*) as c FROM finance_audit_log ${where}`).get(...values) as any)?.c || 0;
    const rows = db.prepare(`SELECT * FROM finance_audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...values, params?.limit || 50, params?.offset || 0) as any[];
    for (const r of rows) {
      if (r.details) { try { r.details = JSON.parse(r.details); } catch { r.details = null; } }
    }
    return { rows, total };
  } catch (e: any) {
    console.error('[audit] list error:', e?.message);
    return { rows: [], total: 0 };
  }
});
```

### Subscriptions: subscriptions:create (line 21305)

```typescript
ipcMain.handle('subscriptions:create', async (_event, data: any) => {
  if (!db) return null;
  try {
    const result = db.prepare(`
      INSERT INTO finance_subscriptions (wallet_id, name, description, price, currency, billing_cycle, billing_interval, start_date, next_renewal_date, cancel_url, cancel_reminder_days, reminder_note, status, category_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.wallet_id, data.name, data.description || '', data.price, data.currency || 'USD',
      data.billing_cycle || 'monthly', data.billing_interval || 1,
      data.start_date || null, data.next_renewal_date || null,
      data.cancel_url || '', data.cancel_reminder_days ?? 7, data.reminder_note || '',
      data.status || 'active', data.category_id || null
    );
    return { id: result.lastInsertRowid, ...data };
  } catch { return null; }
});
```

### Dashboard Overview: finance:get-dashboard-overview (line 21104)

```typescript
ipcMain.handle('finance:get-dashboard-overview', async () => {
  if (!db) return { summary: { totalIncome: 0, totalExpense: 0, netBalance: 0 }, recentTransactions: [], monthlyTrends: [], spendingByCategory: [], subscriptionCount: 0 };
  try {
    const income = (db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM finance_transactions WHERE type='income'").get() as any).total;
    const expense = (db.prepare("SELECT COALESCE(-SUM(amount),0) as total FROM finance_transactions WHERE type='expense'").get() as any).total;
    const netBalance = (db.prepare("SELECT COALESCE(SUM(balance),0) as total FROM finance_accounts WHERE is_archived=0 AND type!='custodial'").get() as any).total;
    const recentTransactions = db.prepare("SELECT * FROM finance_transactions ORDER BY date DESC, id DESC LIMIT 5").all();
    const monthlyTrends = db.prepare(`
      SELECT strftime('%Y-%m', date) as month,
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
        COALESCE(-SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense,
        COALESCE(SUM(amount),0) as net
      FROM finance_transactions
      GROUP BY month ORDER BY month DESC LIMIT 6
    `).all();
    const spendingByCategory = db.prepare(`
      SELECT c.id as categoryId, c.name as categoryName, c.color as categoryColor, c.icon as categoryIcon,
        COALESCE(-SUM(t.amount),0) as amount, COUNT(t.id) as count
      FROM finance_categories c
      LEFT JOIN finance_transactions t ON t.category_id = c.id AND t.type = 'expense'
      WHERE c.type = 'expense' AND c.is_archived = 0
      GROUP BY c.id ORDER BY amount DESC LIMIT 8
    `).all();
    const subCount = (db.prepare("SELECT COUNT(*) as c FROM finance_subscriptions WHERE status='active'").get() as any).c;
    return { summary: { totalIncome: income, totalExpense: expense, netBalance }, recentTransactions, monthlyTrends, spendingByCategory, subscriptionCount: subCount };
  } catch {
    return { summary: { totalIncome: 0, totalExpense: 0, netBalance: 0 }, recentTransactions: [], monthlyTrends: [], spendingByCategory: [], subscriptionCount: 0 };
  }
});
```

### DB Schema — finance_transactions table (from migrations)

```sql
CREATE TABLE IF NOT EXISTS finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  wallet_id INTEGER,
  category_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
  amount REAL NOT NULL,
  fee REAL DEFAULT 0,
  description TEXT,
  note TEXT,
  date TEXT NOT NULL,
  time TEXT,
  is_recurring INTEGER DEFAULT 0,
  recurring_interval TEXT,
  tags TEXT,
  on_behalf_of INTEGER DEFAULT 0,
  on_behalf_of_label TEXT,
  transfer_id TEXT,
  from_wallet_id INTEGER,
  to_wallet_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (account_id) REFERENCES finance_accounts(id),
  FOREIGN KEY (wallet_id) REFERENCES finance_wallets(id),
  FOREIGN KEY (category_id) REFERENCES finance_categories(id)
);

CREATE TABLE IF NOT EXISTS finance_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL,
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
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (wallet_id) REFERENCES finance_wallets(id)
);

CREATE TABLE IF NOT EXISTS finance_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  description TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS finance_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'personal',
  description TEXT,
  icon TEXT DEFAULT 'Wallet',
  color TEXT DEFAULT '#10b981',
  currency TEXT DEFAULT 'USD',
  balance REAL DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  parent_account_id INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS finance_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT,
  last_four TEXT,
  balance REAL DEFAULT 0,
  initial_balance REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_archived INTEGER DEFAULT 0,
  metadata TEXT,
  transfer_fee_type TEXT,
  transfer_fee_value REAL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (account_id) REFERENCES finance_accounts(id)
);
```

---

## 3. Frontend — Component Source Code

### Transaction Form: useTransactionForm.ts (full file, 70 lines)

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getLastType, getLastCategoryId, getLastDate, saveLastTxPrefs } from './txPrefs'
import type { TxModalProps, TxType } from './modalUtils'

export function useTransactionForm(props: TxModalProps, allowedTypes: TxType[]) {
  const walletType = props.wallet.type.replace('_card', '').replace('ewallet', 'ewallet')
  const prefsType = walletType === 'physical' ? 'cash' : walletType === 'other' ? 'bank' : walletType

  const lastType = getLastType(prefsType)
  const lastCat = getLastCategoryId(prefsType)
  const lastDate = getLastDate(prefsType)

  const [type, setType] = useState<TxType>(
    allowedTypes.includes(lastType as TxType) ? (lastType as TxType) : allowedTypes[0],
  )
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(lastCat)
  const [date, setDate] = useState(lastDate)
  const [note, setNote] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [onBehalfOf, setOnBehalfOf] = useState(false)
  const [onBehalfOfLabel, setOnBehalfOfLabel] = useState('')
  const [fee, setFee] = useState('')

  const numericAmount = Number(amount.replace(/[^0-9.]/g, '')) || 0
  const numericFee = Number(fee.replace(/[^0-9.]/g, '')) || 0
  const categoriesForType = useMemo(
    () => props.categories.filter((c) => c.type === type),
    [props.categories, type],
  )

  useEffect(() => {
    if (categoryId && !categoriesForType.some((c) => c.id === categoryId)) setCategoryId(null)
  }, [categoriesForType, categoryId])

  const reset = useCallback(() => {
    setAmount(''); setDescription(''); setNote(''); setShowAdvanced(false); setFee('')
  }, [])

  const persistPrefs = useCallback(() => {
    saveLastTxPrefs(prefsType, type, categoryId, date || undefined)
  }, [prefsType, type, categoryId, date])

  /** Base payload; modals merge their specialty fields + metadata in. */
  const buildPayload = useCallback((extra: Record<string, any> = {}) => ({
    account_id: props.wallet.account_id,
    wallet_id: props.wallet.id,
    category_id: categoryId,
    type,
    amount: type === 'expense' ? -numericAmount : numericAmount,  // ← KEY: expenses stored as NEGATIVE
    description: description.trim(),
    date,
    note: note.trim() || undefined,
    on_behalf_of: onBehalfOf ? 1 : 0,
    on_behalf_of_label: onBehalfOf && onBehalfOfLabel.trim() ? onBehalfOfLabel.trim() : null,
    fee: type === 'transfer' ? numericFee : 0,  // ← KEY: fee only sent for transfers
    ...extra,
  }), [props.wallet, categoryId, type, numericAmount, description, date, note, onBehalfOf, onBehalfOfLabel, numericFee])

  return {
    type, setType, amount, setAmount, numericAmount,
    description, setDescription, categoryId, setCategoryId,
    date, setDate, note, setNote, showAdvanced, setShowAdvanced,
    onBehalfOf, setOnBehalfOf, onBehalfOfLabel, setOnBehalfOfLabel,
    fee, setFee, numericFee,
    categoriesForType, reset, persistPrefs, buildPayload,
  }
}
```

**CRITICAL FINDING:** `buildPayload` sends `amount: type === 'expense' ? -numericAmount : numericAmount`. This means expenses are stored as **negative** amounts in the DB. Then `finance:create-transaction` does `balance = balance + data.amount`, which correctly subtracts for expenses. The balance calculation logic appears correct on the code level — the bug may be in a different layer (data corruption, stale balances, or the `recalculate-balances` handler).

---

### AuditLogTab.tsx — THE BUG (lines 28-39)

```typescript
const fetchLogs = useCallback(async () => {
  setLoading(true)
  try {
    const opts: any = { limit: PAGE_SIZE, offset: page * PAGE_SIZE }
    if (entityFilter) {
      opts.entity_type = entityFilter
    }
    const result = await (window as any).deskflowAPI?.auditList(opts) ?? []
    setLogs(result)  // ← BUG: `result` is `{ rows: [], total: 0 }`, not an array!
  } catch { setLogs([]) }
  finally { setLoading(false) }
}, [page, entityFilter])
```

**THE BUG:** `auditList()` returns `{ rows: [], total: 0 }` but the code sets `logs` to the entire object instead of `result.rows`. Then `logs.map(...)` fails because it's an object, not an array.

**FIX:** Change line 35 to: `setLogs(result?.rows ?? [])`

---

### TransactionDetailModal.tsx — Follow Through Display (lines 419-479)

The modal already HAS follow-through display:
- Shows repayment status (lines 419-479)
- Has "Mark as Repaid" button (line 469)
- Shows ftPerson name and amount owed

The follow-through badge IS visible in the TransactionsTab (lines 440, 457-459, 494-508) with amber left-border, Handshake icon, and "Follow Through" badge.

**STATUS:** Follow-through badges, repayment status, and mark-repaid ARE implemented in the transaction list and detail modal. The issue may be that:
1. The person database is just a free-text label (no dedicated table)
2. No way to see follow-through in the dashboard spending split properly
3. The `onBehalfOfSummary` only shows on the OverviewTab, not on the main dashboard

---

### SubscriptionModal.tsx — Currency Hardcoded (lines 31-45, 140-144)

```typescript
const INITIAL = {
  wallet_id: 0,
  name: '',
  description: '',
  price: '',
  currency: 'USD',          // ← HARDCODED to USD
  billing_cycle: 'monthly',
  // ...
};
```

And in the form (lines 140-144):
```tsx
<input type="number" min="0" step="any" value={form.price} onChange={e => handleChange('price', e.target.value)}
  placeholder="0.00" className="w-full bg-zinc-800/60 text-sm text-white rounded-lg border border-zinc-700/50 pl-7 pr-3 py-2.5 outline-none placeholder:text-zinc-600 focus:border-zinc-500 tabular-nums transition-colors" />
<DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
```

**THE BUG:** No currency dropdown exists. The currency is hardcoded to 'USD'. The `displayCurrency` prop is received but only used in the Preview section, not for the form.

---

### FinancePage.tsx — Net Worth Calculation (lines 675-701)

```typescript
const netWorth = useMemo(() =>
  accounts.reduce((s, a) => {
    if (a.type === 'custodial') return s;
    const walletSum = wallets
      .filter(w => w.account_id === a.id && !w.is_archived)
      .reduce((ws, w) => {
        const wb = (w.type === 'physical' || w.type === 'cash') && w.metadata?.denominations
          ? (Array.isArray(w.metadata.denominations)
              ? w.metadata.denominations.reduce((sx: number, d: any) => sx + (d.value || 0) * (d.count || 0), 0)
              : (w.balance ?? 0))
          : (w.balance ?? 0);
        return ws + convertAmount(wb, w.currency, displayCurrency);
      }, 0);
    return s + walletSum;
  }, 0),
  [accounts, wallets, displayCurrency]
);

const ftReceivable = useMemo(
  () => followThroughReceivable(transactions),
  [transactions],
);

const netWorthTotal = useMemo(
  () => netWorthWithReceivable(netWorth, ftReceivable),
  [netWorth, ftReceivable],
);
```

### OverviewTab.tsx — Net Worth Line Chart Data (lines 131-163)

```typescript
const openingNW = useMemo(() => {
  const totalNetFlow = monthlyTrends.reduce((s, m) => s + convertAmount(m.net, baseCurrency, displayCurrency), 0);
  return totalNetWorth - totalNetFlow;
}, [totalNetWorth, monthlyTrends, baseCurrency, displayCurrency]);

const netWorthSeries = useMemo(() => {
  if (effectivePeriod === 'day') {
    const dayMap = new Map<string, number>();
    for (const t of allTransactions) {
      const signed = t.type === 'income' ? Math.abs(t.amount)
        : t.type === 'expense' ? -Math.abs(t.amount) : 0;
      dayMap.set(t.date, (dayMap.get(t.date) ?? 0) + signed);
    }
    const sorted = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let run = openingNW;
    return sorted.map(([date, net]) => {
      run += convertAmount(net, baseCurrency, displayCurrency);
      return { month: date, value: run };
    });
  }
  let run = openingNW;
  return monthlyTrends.map(m => {
    run += convertAmount(m.net, baseCurrency, displayCurrency);
    return { month: m.month, value: run };
  });
}, [effectivePeriod, allTransactions, monthlyTrends, baseCurrency, displayCurrency, openingNW]);
```

### FinanceStickyHeader.tsx — Trend Percentage (lines 142-148)

```tsx
{trend && (
  <div className="hidden sm:flex items-center gap-1.5 mb-1.5">
    {trend.value >= 0 ? (
      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
    ) : (
      <TrendingDown className="w-3.5 h-3.5 text-red-400" />
    )}
    <span className={`text-xs font-semibold tabular-nums ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {trend.value >= 0 ? '+' : ''}{fmtCurrency(trend.value, displayCurrency)}
    </span>
    <span className={`text-[11px] ${trend.value >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
      ({trend.percent >= 0 ? '+' : ''}{trend.percent.toFixed(1)}%)
    </span>
  </div>
)}
```

### RecentTxnsCard.tsx — FT Filter and Display (lines 42-46, 93-136)

```typescript
const filteredTxns = useMemo(() => {
  if (txFilter === 'personal') return transactions.filter(tx => !tx.on_behalf_of);
  if (txFilter === 'follow-through') return transactions.filter(tx => tx.on_behalf_of);
  return transactions;
}, [transactions, txFilter]);
```

### receivables.ts — Full File (76 lines)

```typescript
import type { FinanceTransaction } from '../components/finance/finance-types';

export function ftPersonTag(name: string): string {
  return `ft_person:${name}`;
}

export function ftRepaidTag(txId: number): string {
  return `ft_repaid:${txId}`;
}

export function hasTag(tx: FinanceTransaction, tag: string): boolean {
  return (tx.tags ?? '').split(',').map(t => t.trim()).includes(tag);
}

export function getFtPerson(tx: FinanceTransaction): string | null {
  if (!tx.on_behalf_of || !tx.tags) return null;
  for (const t of tx.tags.split(',').map(s => s.trim())) {
    if (t.startsWith('ft_person:')) return t.slice('ft_person:'.length);
  }
  return tx.on_behalf_of_label ?? null;
}

export function getRepaymentStatus(
  tx: FinanceTransaction,
  allTxns: FinanceTransaction[],
): { repaid: boolean; repaymentTx?: FinanceTransaction } {
  if (tx.on_behalf_of !== 1 || tx.type !== 'expense') return { repaid: false };
  for (const t of allTxns) {
    if (hasTag(t, ftRepaidTag(tx.id)) && t.type === 'income') {
      return { repaid: true, repaymentTx: t };
    }
  }
  return { repaid: false };
}

export interface ReceivablePerson {
  name: string;
  totalOwed: number;
  txCount: number;
  oldestDate: string;
  txIds: number[];
}

export function groupByPerson(txns: FinanceTransaction[]): ReceivablePerson[] {
  const map = new Map<string, ReceivablePerson>();
  for (const tx of txns) {
    if (tx.on_behalf_of !== 1 || tx.type !== 'expense') continue;
    const person = getFtPerson(tx) ?? 'Unknown';
    const existing = map.get(person) ?? {
      name: person, totalOwed: 0, txCount: 0, oldestDate: tx.date, txIds: [],
    };
    existing.totalOwed += Math.abs(tx.amount);
    existing.txCount++;
    existing.txIds.push(tx.id);
    if (tx.date < existing.oldestDate) existing.oldestDate = tx.date;
    map.set(person, existing);
  }
  return [...map.values()].sort((a, b) => b.totalOwed - a.totalOwed);
}

export function isRepayment(tx: FinanceTransaction): boolean {
  return (tx.tags ?? '').split(',').some(t => t.trim().startsWith('ft_repaid:'));
}
```

### netWorth.ts — Full File (16 lines)

```typescript
import type { FinanceTransaction } from "../components/finance/finance-types";

export function followThroughReceivable(txns: FinanceTransaction[]): number {
  return txns
    .filter((t) => t.on_behalf_of === 1 && t.type === "expense")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
}

export function netWorthWithReceivable(rawWalletSum: number, receivable: number): number {
  return rawWalletSum + receivable;
}
```

---

## 4. Architecture Notes

### Data Flow for Balance Calculation

1. Transaction created via `useTransactionForm.buildPayload()` → amount is **negative for expenses**
2. `finance:create-transaction` handler → `balance = balance + amount` (correctly subtracts for negative expenses)
3. `finance:get-summary` → reads `SUM(balance)` from `finance_accounts` → this is the displayed net worth
4. `finance:recalculate-balances` → `initial_balance + SUM(amount) - SUM(fee)` → rewrites wallet balance

### Data Flow for Net Worth Chart

1. `FinancePage` computes `netWorthTotal` = sum of wallet balances + FT receivable
2. Passed to `OverviewTab` as `currentNetWorth`
3. `OverviewTab` computes `openingNW = totalNetWorth - totalNetFlow` (back-calculates opening balance)
4. `netWorthSeries` = cumulative daily/monthly net flow added to `openingNW`
5. Rendered by `NetWorthLineChart` as a line chart

### Data Flow for Follow-Through

1. `on_behalf_of=1` flag on expense transactions marks them as FT
2. `finance:get-on-behalf-of-summary` aggregates FT expenses by label
3. `OverviewTab` shows a Receivables section with per-person breakdown
4. `RecentTxnsCard` has a Personal/Follow-Through/All filter
5. `TransactionDetailModal` shows repayment status and "Mark as Repaid" button
6. Repayment tracked via `ft_repaid:{txId}` tags on income transactions

### Data Flow for Subscriptions

1. `subscriptions:list` fetches all subscriptions
2. `SubscriptionModal` creates/edits subscriptions
3. No auto-transaction generation exists
4. Currency is hardcoded to 'USD' in the modal

---

## 5. Design Tokens

- **Dark mode only** — bg-zinc-900/95 backgrounds
- **Glass cards** — `bg-zinc-900/80 backdrop-blur-xl` with `border border-white/5`
- **Accent colors** — emerald (#22c55e) for income/positive, red (#ef4444) for expense/negative, amber (#f59e0b) for follow-through, indigo (#6366f1) for subscriptions
- **Typography** — Geist body (13px), JetBrains Mono for numbers (`tabular-nums`)
- **Border radius** — max `rounded-xl` (12px)
- **Card padding** — `p-5` (20px)
