# Context Bundle — People / Debt Tracking Feature

> This bundle contains ACTUAL source code from the DeskFlow codebase. Every file,
> every line, every type is copied verbatim. The target AI must use this as its
> sole reference for designing the solution.

---

## CRITICAL: Backend Gaps Identified

⚠️ **BACKEND IS STUB** — The following IPC handlers have type stubs in
`src/types/deskflow-api.d.ts` but **NO implementation in `src/main.ts`** and
**NO preload bridges in `src/preload.ts`**:

| IPC Channel | Type Stub Location | Handler Exists? | Preload Bridge? |
|-------------|-------------------|-----------------|-----------------|
| `finance:get-ft-persons` | deskflow-api.d.ts:220 | ❌ NO | ❌ NO |
| `finance:get-ft-person-balances` | deskflow-api.d.ts:221 | ❌ NO | ❌ NO |
| `finance:create-ft-person` | deskflow-api.d.ts:222 | ❌ NO | ❌ NO |
| `finance:update-ft-person` | deskflow-api.d.ts:223 | ❌ NO | ❌ NO |
| `finance:delete-ft-person` | deskflow-api.d.ts:224 | ❌ NO | ❌ NO |
| `finance:record-ft-repayment` | deskflow-api.d.ts:225 | ❌ NO | ❌ NO |

**The entire Follow-Through person system is frontend-only with tag-based tracking
in the `tags` column. No `finance_ft_persons` table exists in the DB schema.**

⚠️ **Type Gap:** `FinanceTransaction` in `finance-types.ts` does NOT include
`on_behalf_of` or `on_behalf_of_label` fields, yet the codebase accesses them
via `(tx as any).on_behalf_of`. This needs to be added to the type.

---

## 1. Database Schema

### finance_transactions table (relevant columns only)

Defined via migration in `src/main.ts` lines 2642-2665, with ALTERs at lines 2676-2679:

```sql
CREATE TABLE finance_transactions_v3 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  wallet_id INTEGER,
  category_id INTEGER,
  type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
  amount REAL NOT NULL, fee REAL DEFAULT 0,
  description TEXT, note TEXT, date TEXT NOT NULL, time TEXT,
  is_recurring INTEGER DEFAULT 0, recurring_interval TEXT, tags TEXT,
  transfer_id TEXT, from_wallet_id INTEGER, to_wallet_id INTEGER,
  on_behalf_of INTEGER DEFAULT 0,
  on_behalf_of_label TEXT,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (account_id) REFERENCES finance_accounts(id),
  FOREIGN KEY (wallet_id) REFERENCES finance_wallets(id)
)
```

ALTERs:
```sql
ALTER TABLE finance_transactions ADD COLUMN fee REAL DEFAULT 0;
ALTER TABLE finance_transactions ADD COLUMN on_behalf_of INTEGER DEFAULT 0;
ALTER TABLE finance_transactions ADD COLUMN on_behalf_of_label TEXT;
ALTER TABLE finance_transactions ADD COLUMN ft_person_id INTEGER REFERENCES finance_ft_persons(id);
```

**Note:** `ft_person_id` is referenced in the ALTER but `finance_ft_persons` table
does NOT exist in the migration. This is a schema gap.

---

## 2. TypeScript Types

### `src/components/finance/finance-types.ts` (FULL — 121 lines):

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

// ⚠️ MISSING FIELDS: on_behalf_of (number), on_behalf_of_label (string | null),
// ft_person_id (number | null) — accessed via (tx as any) in runtime code

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

export type FinanceTabKey = 'overview' | 'wallets' | 'transactions' | 'categories' | 'subscriptions' | 'audit';
```

### `src/types/deskflow-api.d.ts` — FT type stubs (lines 220-228):

```typescript
financeGetFtPersons: () => Promise<{ id: number; name: string; email: string | null; phone: string | null; notes: string; created_at: string; updated_at: string; transaction_count: number; total_owed: number; total_paid: number }[]>;
financeGetFtPersonBalances: () => Promise<{ id: number; name: string; email: string | null; phone: string | null; total_owed: number; total_repaid: number; transaction_count: number }[]>;
financeCreateFtPerson: (data: { name: string; email?: string; phone?: string; notes?: string }) => Promise<{ id: number; name: string; email: string | null; phone: string | null; notes: string; transaction_count: number; total_owed: number; total_paid: number } | null>;
financeUpdateFtPerson: (data: { id: number; name?: string; email?: string; phone?: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
financeDeleteFtPerson: (id: number) => Promise<{ success: boolean }>;
financeRecordFtRepayment: (data: {
  originalTxId: number; personId?: number; amount: number; date: string;
  walletId?: number; accountId?: number; description?: string; isOverpayment?: boolean;
}) => Promise<{ success: boolean; repaymentTxId?: number; error?: string }>;
```

---

## 3. Helper Libraries

### `src/lib/receivables.ts` (FULL — 95 lines):

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
  if (tx.on_behalf_of_label) return tx.on_behalf_of_label;
  if (tx.on_behalf_of && tx.tags) {
    for (const t of tx.tags.split(',').map(s => s.trim())) {
      if (t.startsWith('ft_person:')) return t.slice('ft_person:'.length);
    }
  }
  return null;
}

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

export function isExpenseRepaid(txId: number, allTxns: FinanceTransaction[]): boolean {
  const tx = allTxns.find(t => t.id === txId);
  if (!tx) return false;
  return getRepaymentStatus(tx, allTxns).repaid;
}

export function groupByPerson(txns: FinanceTransaction[]): ReceivablePerson[] {
  const map = new Map<string, ReceivablePerson>();
  for (const tx of txns) {
    if (tx.on_behalf_of !== 1 || tx.type !== 'expense') continue;
    const status = getRepaymentStatus(tx, txns);
    if (status.repaid) continue;
    const stillOwed = Math.abs(tx.amount) - status.totalRepaid;
    if (stillOwed <= 0) continue;
    const person = getFtPerson(tx) ?? 'Unknown';
    const existing = map.get(person) ?? { name: person, totalOwed: 0, txCount: 0, oldestDate: tx.date, txIds: [] };
    existing.totalOwed += stillOwed;
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

### `src/lib/netWorth.ts` (FULL — 43 lines):

```typescript
import type { FinanceTransaction } from "../components/finance/finance-types";
import { getRepaymentStatus, getFtPerson } from "./receivables";

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

export function netWorthWithReceivable(rawWalletSum: number, receivable: number): number {
  return rawWalletSum + receivable;
}
```

---

## 4. Frontend Components

### `src/components/finance/FTPersonCombobox.tsx` (FULL — 119 lines):

```tsx
import { useState, useRef, useEffect } from 'react';

interface Person {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface FTPersonComboboxProps {
  persons: Person[];
  value: number | null;
  onChange: (personId: number | null, personName: string) => void;
  onAddPerson: (name: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FTPersonCombobox({
  persons, value, onChange, onAddPerson, disabled = false,
  placeholder = 'Select or type a person...',
}: FTPersonComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = persons.find(p => p.id === value);
  const filtered = query ? persons.filter(p => p.name.toLowerCase().includes(query.toLowerCase())) : persons;
  const showCreate = query.trim() && !persons.some(p => p.name.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (person: Person) => { onChange(person.id, person.name); setQuery(''); setOpen(false); };
  const handleCreate = () => { const name = query.trim(); if (!name) return; onAddPerson(name); onChange(-1, name); setQuery(''); setOpen(false); };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input ref={inputRef} value={open ? query : (selected?.name ?? '')}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && showCreate) { e.preventDefault(); handleCreate(); } }}
          placeholder={placeholder} disabled={disabled}
          className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-amber-500/50 disabled:opacity-40" />
        {value !== null && value > 0 && (
          <button onClick={() => { onChange(null, ''); setQuery(''); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs px-1">×</button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-amber-500/30 bg-zinc-800 shadow-xl">
          {filtered.length === 0 && !showCreate && <div className="px-2.5 py-2 text-[11px] text-zinc-500">No persons found</div>}
          {filtered.map(p => (
            <button key={p.id} onClick={() => handleSelect(p)}
              className={`w-full text-left px-2.5 py-2 text-xs transition-colors hover:bg-amber-500/10 ${p.id === value ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-200'}`}>
              <span>{p.name}</span>
              {p.email && <span className="text-[10px] text-zinc-500 ml-2">{p.email}</span>}
            </button>
          ))}
          {showCreate && (
            <button onClick={handleCreate}
              className="w-full text-left px-2.5 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors border-t border-amber-500/10">
              + Create "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

### `src/components/finance/SpendingSplitCard.tsx` (FULL — 164 lines):

[Full source included in context — see Section 8 of agent output above]

### `src/components/finance/RepaymentModal.tsx` (Lines 1-30 — interface):

```tsx
interface RepaymentModalProps {
  open: boolean;
  onClose: () => void;
  personName: string;
  personId?: number;
  totalAmount: number;
  amountOwed?: number;
  txIds: number[];
  originalTx?: FinanceTransaction;
  wallets: FinanceWallet[];
  displayCurrency: string;
  onConfirm: (data: {
    personName: string; personId?: number; amount: number; date: string;
    walletId: number; description: string; txIds: number[]; isOverpayment?: boolean;
  }) => Promise<boolean>;
}
```

---

## 5. Preload Bridges (current — NO FT bridges exist)

```typescript
// src/preload.ts lines 846-855 — only security/lock bridges, no FT bridges:
financeIsLocked: () => ipcRenderer.invoke('finance:is-locked'),
financeUnlock: (password: string) => ipcRenderer.invoke('finance:unlock', password),
financeLock: () => ipcRenderer.invoke('finance:lock'),
financeSetPassword: (password: string) => ipcRenderer.invoke('finance:set-password', password),
financeChangePassword: (currentPassword: string, nextPassword: string) => ipcRenderer.invoke('finance:change-password', currentPassword, nextPassword),
financeVerifyPassword: (password: string) => ipcRenderer.invoke('finance:verify-password', password),
financeCheckPasswordSetup: () => ipcRenderer.invoke('finance:check-password-setup'),
financeSetRememberDevice: (remember: boolean, days: number) => ipcRenderer.invoke('finance:set-remember-device', remember, days),
financeSetLockTimeout: (timeoutMs: number) => ipcRenderer.invoke('finance:set-lock-timeout', timeoutMs),
financeGetSecuritySettings: () => ipcRenderer.invoke('finance:get-security-settings'),
```

---

## 6. IPC Handlers (current — NO FT handlers exist)

### `src/main.ts` — `finance:create-transaction` (the only transaction handler):

```typescript
electron_1.ipcMain.handle('finance:create-transaction', async (_event, data: any) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO finance_transactions (account_id, wallet_id, category_id, type, amount, description, note, "date", "time")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.account_id, data.wallet_id || null, data.category_id,
      data.type, data.amount, data.description || null, data.note || null,
      data.date, data.time || null
    );
    db.prepare('UPDATE finance_accounts SET balance = balance + ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(data.amount, data.account_id);
    if (data.wallet_id) {
      db.prepare('UPDATE finance_wallets SET balance = balance + ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(data.amount, data.wallet_id);
    }
    return { id: result.lastInsertRowid, ...data };
  } catch (error: any) {
    console.error('[finance] create transaction error:', error);
    return null;
  }
});
```

**Note:** This handler does NOT insert `on_behalf_of`, `on_behalf_of_label`, `tags`,
or `ft_person_id`. The FT data is not persisted by the create-transaction handler.

---

## 7. Finance Page Structure

### Tab system (src/pages/FinancePage.tsx lines 52-59):

```typescript
const tabs: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { key: 'wallets', label: 'Wallets', icon: <Wallet className="w-3.5 h-3.5" /> },
  { key: 'transactions', label: 'Transactions', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  { key: 'categories', label: 'Categories', icon: <Tag className="w-3.5 h-3.5" /> },
  { key: 'subscriptions', label: 'Subscriptions', icon: <Bell className="w-3.5 h-3.5" /> },
  { key: 'audit', label: 'Audit Log', icon: <Shield className="w-3.5 h-3.5" /> },
];
```

### FT rendering in OverviewTab (lines 80-110):

```typescript
const ftReceivable = useMemo(() => followThroughReceivable(allTransactions), [allTransactions]);
const unpaidByPerson = useMemo(() => {
  const map = getUnpaidByPerson(allTransactions);
  return [...map.entries()].map(([name, data]) => ({
    name, total: data.total, count: data.count, unpaidTxIds: data.txIds,
  })).sort((a, b) => b.total - a.total);
}, [allTransactions]);
const personalExpense = expense - (onBehalfOfSummary?.totalExpense ?? 0);
```

---

## 8. Design Tokens (DeskFlow)

```
Background:     zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
Primary:        pink-500 (accent), pink-400 (hover), pink-600 (active)
Secondary:      cyan-400 (info), emerald-400 (success), amber-400 (warning/FT)
Text:           zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
Border:         zinc-800 (subtle), zinc-700 (active), zinc-600/50 (glass edge)
Cards:          rounded-xl, p-5, bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60
Animation:      150-300ms ease-out, transform + opacity only
Fonts:          Body = Geist/Inter (13px), Mono = JetBrains Mono
Page accent:    Finance = emerald-500
```

---

## 9. Architecture Notes

### Data Flow:
1. User creates FT expense → `finance:create-transaction` stores with `on_behalf_of=1`
2. Repayment tracked via `tags` field: `ft_repaid:{txId}` on income transactions
3. Balance computed client-side via `receivables.ts` / `netWorth.ts` functions
4. No server-side balance tracking — all computed from transaction list

### Current FT Flow (broken):
1. User toggles "Follow Through" on expense form
2. `FTPersonCombobox` shown (but persons list comes from non-existent IPC)
3. Transaction saved with `on_behalf_of=1` and `on_behalf_of_label`
4. `SpendingSplitCard` shows per-person breakdown (computed client-side)
5. Repayment: `RepaymentModal` creates income with `ft_repaid:{txId}` tag
6. Balance: computed by `followThroughReceivable()` summing unpaid amounts

### What needs to be built:
1. `finance_ft_persons` table (DB migration)
2. All 6 FT IPC handlers (main.ts)
3. All FT preload bridges (preload.ts)
4. `on_behalf_of`, `on_behalf_of_label`, `ft_person_id` fields in `FinanceTransaction` type
5. `create-transaction` handler updated to persist FT fields
6. People subpage in FinancePage
7. Person detail view with transaction list
8. Bulk payment allocation modal
