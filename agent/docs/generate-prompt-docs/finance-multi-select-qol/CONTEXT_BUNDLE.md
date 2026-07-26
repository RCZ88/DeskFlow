# CONTEXT_BUNDLE.md — Finance Multi-Select Transactions + Aggregate Data Panel + QoL Features

> Generated: 2026-06-28
> Purpose: Complete code context for Architect AI to design multi-transaction selection, aggregate analytics, and additional QoL features for the finance section.

## Raw Request

> "make multiple select on transactions not complicated i think? like maybe auto select from filter? and then see aggregate data? like total spending, expenses, p/l? and some other interesting useful things you can think of for finance qol. use generate-prompt skill to think/research. design using design skills"

## Current Implementation State

### Files Affected

#### Page entry point
- `src/pages/FinancePage.tsx` (904 lines) — Main finance page with lock screen, tab routing, all state management, all handler functions for CRUD

#### Tabbed views
- `src/components/finance/OverviewTab.tsx` (370 lines) — Dashboard: summary cards, net worth trend, spending by category, cashflow bar chart, recent transactions card, accounts grid
- `src/components/finance/WalletsTab.tsx` — Combined account grid + wallet cards grouped by account, inline wallet creation
- `src/components/finance/TransactionsTab.tsx` (434 lines) — All-transactions viewer with search, type filter, date range, grouped by date, detail modal on click, delete with password confirm
- `src/components/finance/CategoriesTab.tsx` — Category CRUD

#### Components
- `src/components/finance/TransactionDetailModal.tsx` — Full read-only detail modal for any transaction
- `src/components/finance/RecentTxnsCard.tsx` — Recent transactions list used in OverviewTab
- `src/components/finance/FinanceStickyHeader.tsx` — Collapsible sticky header with net worth, trend, lock, actions
- `src/components/finance/FinanceInsightsCard.tsx` — Insights/analytics summary card
- `src/components/finance/SpendingCategoryChart.tsx` — Doughnut chart of spending by category
- `src/components/finance/IncomeExpenseBarChart.tsx` — Monthly income vs expense bar chart
- `src/components/finance/NetWorthLineChart.tsx` — Cumulative net worth over time
- `src/components/finance/NetWorthCard.tsx`
- `src/components/finance/IncomeExpenseCard.tsx`
- `src/components/finance/WalletDetailView.tsx` — Per-wallet detail with crypto prices, metadata editing, denomination counting
- `src/components/finance/FinanceLockScreen.tsx` — Lock screen with biometric, password, cooldown
- `src/components/finance/EmptyState.tsx` — Reusable empty state component
- `src/components/finance/PasswordConfirmDialog.tsx`
- `src/components/finance/ArchivedItemsModal.tsx`
- `src/components/finance/currency-data.ts` — Currency formatting, convertAmount, getCurrencyInfo, COMMON_CURRENCIES

#### Visual primitives (_fx/)
- `src/components/finance/_fx/GlassSurface.tsx` — Glass morphism surface wrapper
- `src/components/finance/_fx/TabHeader.tsx` — Section title header
- `src/components/finance/_fx/Sparkline.tsx` — Mini sparkline chart
- `src/components/finance/_fx/ChartTheme.tsx` — Chart.js dark theme
- `src/components/finance/_fx/financeMotion.ts` — Framer-motion variants (pageContainer, riseItem, tabPanel, fab, DUR)
- `src/components/finance/_fx/AnimatedAmount.tsx` — Animated counting-up amount
- `src/components/finance/_fx/AuroraBackground.tsx` — Aurora gradient background
- `src/components/finance/_fx/categoryVisual.ts` — Category icon/color mapping
- `src/components/finance/_fx/useCountUp.ts` — Count-up animation hook

#### Transaction modals (7 wallet types)
- `src/components/finance/modals/BankTransactionModal.tsx`
- `src/components/finance/modals/DebitTransactionModal.tsx`
- `src/components/finance/modals/CreditTransactionModal.tsx`
- `src/components/finance/modals/CryptoTransactionModal.tsx`
- `src/components/finance/modals/CashTransactionModal.tsx`
- `src/components/finance/modals/PhysicalTransactionModal.tsx`
- `src/components/finance/modals/EwalletTransactionModal.tsx`
- `src/components/finance/modals/TransactionModalShell.tsx`
- `src/components/finance/modals/DenominationPicker.tsx`
- `src/components/finance/modals/modalUtils.ts` — tint, thresholdColor, parseMeta, DENOMINATIONS, greedyFill, sumDenoms, useCurrencyFormat
- `src/components/finance/modals/modalParts.tsx` — ContextBand, TypeToggle, AmountInput, AdvancedToggle, ProgressBar
- `src/components/finance/modals/useTransactionForm.ts` — Shared form state + last-used prefs
- `src/components/finance/modals/CategoryChipGrid.tsx`
- `src/components/finance/modals/TransferWalletSelect.tsx`
- `src/components/finance/modals/TransferDestinationPanel.tsx`
- `src/components/finance/modals/txPrefs.ts`
- `src/components/finance/modals/useFormattedAmount.ts`
- `src/components/finance/modals/autoFill.ts`
- `src/components/finance/modals/index.ts` — Re-exports all 7 modals + TransactionModalShell

## Type Definitions

### FinanceAccount (finance-types.ts)
```typescript
interface FinanceAccount {
  id: number; name: string;
  type: 'personal' | 'joint' | 'custodial' | 'business';
  description: string | null; icon: string; color: string;
  currency: string; balance: number;
  is_archived: number; parent_account_id: number | null;
  created_at: string; updated_at: string;
}
```

### FinanceWallet (finance-types.ts)
```typescript
interface FinanceWallet {
  id: number; account_id: number; name: string;
  type: 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'physical' | 'other';
  provider: string | null; last_four: string | null; balance: number;
  currency: string; is_archived: number;
  metadata?: string; created_at: string; updated_at: string;
}
```

### CashDenomination (finance-types.ts)
```typescript
interface CashDenomination { value: number; label: string; count: number; }
```

### WalletMetadata (discriminated union)
```typescript
type WalletMetadata =
  | { type: 'bank'; bank_name?: string; branch?: string; account_number?: string; swift?: string; iban?: string; notes?: string }
  | { type: 'debit_card'; card_network?: 'visa'|'mastercard'|'amex'|'discover'|'other'; issuer?: string; daily_limit?: number; notes?: string }
  | { type: 'credit_card'; card_network?: ...; issuer?: string; credit_limit?: number; billing_day?: number; due_day?: number; apr?: number; notes?: string }
  | { type: 'crypto'; coin_id?: string; symbol?: string; blockchain?: string; wallet_address?: string; acquisition_price?: number; notes?: string }
  | { type: 'cash'; denominations?: CashDenomination[]; notes?: string }
  | { type: 'physical'; denominations?: CashDenomination[]; description?: string; notes?: string }
  | { type: 'ewallet'; platform?: string; phone_or_email?: string; daily_limit?: number; notes?: string }
  | { type: 'other'; notes?: string };
```

### CryptoPrice (finance-types.ts)
```typescript
interface CryptoPrice {
  coin_id: string; name: string; symbol: string;
  current_price: number; market_cap: number; total_volume: number;
  price_change_24h: number; price_change_percentage_24h: number; last_updated: string;
}
```

### FinanceCategory (finance-types.ts)
```typescript
interface FinanceCategory {
  id: number; name: string;
  type: 'income' | 'expense' | 'transfer';
  icon: string; color: string;
  sort_order: number; is_archived: number;
  created_at: string;
}
```

### FinanceTransaction (finance-types.ts)
```typescript
interface FinanceTransaction {
  id: number; account_id: number; wallet_id: number | null;
  category_id: number; type: 'income' | 'expense' | 'transfer';
  amount: number; description: string | null; note: string | null;
  date: string; time: string | null;
  is_recurring: number; recurring_interval: string | null;
  tags: string | null;
  created_at: string; updated_at: string;
}
```

### Aggregate types (finance-types.ts)
```typescript
interface FinanceSummary {
  totalIncome: number; totalExpense: number; netBalance: number;
  periodComparison?: { incomeChange: number; expenseChange: number };
}
interface FinanceSpendingByCategory {
  categoryId: number; categoryName: string; categoryColor: string;
  categoryIcon: string; amount: number; percentage: number;
}
interface FinanceMonthlyTrend {
  month: string; income: number; expense: number; net: number;
}
interface FinanceBalanceHistory { date: string; balance: number; }
```

### Route types
```typescript
type FinanceTabKey = 'overview' | 'wallets' | 'transactions' | 'categories';
```

## IPC Endpoints (Finance)

### Transactions CRUD — `finance:get-transactions`
```typescript
// preload.ts
financeGetTransactions: (filters?: any) => ipcRenderer.invoke('finance:get-transactions', filters)
// main.ts handler — supports filters: { type, account_id, category_id, date_from, date_to, search, limit }
// SQL joins: finance_transactions t LEFT JOIN finance_accounts a LEFT JOIN finance_categories c LEFT JOIN finance_wallets w
// Returns full rows with account_name, category_name, category_color, category_icon, wallet_name
```

### `finance:create-transaction`
```typescript
// data: { account_id, wallet_id, category_id, type, amount, description, note, date, time }
// Updates balance on finance_accounts (+amount) and finance_wallets (+amount)
// Returns { id, ...data }
```

### `finance:create-transfer`
```typescript
// data: { account_id, wallet_id, to_wallet_id, category_id, type:'transfer', amount, description, note, date, time, fromWalletName, toWalletName, dest_metadata? }
// Two-legged atomic transaction: debit leg (src, -abs(amount), 'Transfer to X') + credit leg (dst, +abs(amount), 'Transfer from X')
// Updates both account balances and both wallet balances
// Generates transfer_id: `txfer-${Date.now()}-${random8}`
// Returns { transferId, success }
```

### `finance:update-transaction`
```typescript
// data: { id, account_id, wallet_id, category_id, type, amount, description, note, date, time }
// Returns { success: true }
```

### `finance:delete-transaction`
```typescript
// id: number
// Reverses balance (negates amount), cascades to paired transfer transactions via transfer_id
// Returns { success } or { success: false, error }
```

### Analytics — `finance:get-summary`
```typescript
// SQL: SUM(amount) WHERE type='income', SUM(amount) WHERE type='expense', SUM(balance) FROM finance_accounts WHERE is_archived=0 AND type!='custodial'
// Returns { totalIncome, totalExpense, netBalance }
```

### `finance:get-spending-by-category`
```typescript
// SQL: LEFT JOIN finance_transactions t ON t.category_id = c.id AND t.type = 'expense'
// Returns [{ categoryId, categoryName, categoryColor, categoryIcon, amount, count }]
```

### `finance:get-monthly-trends`
```typescript
// SQL: strftime('%Y-%m', date) GROUP BY month ORDER BY month DESC LIMIT 12
// Columns: month, income, expense, net
```

### Account/Wallet CRUD
- `finance:get-accounts` — All accounts
- `finance:create-account` — data: name, type, description, icon, color, currency, balance
- `finance:update-account` / `finance:archive-account` / `finance:delete-account`
- `finance:get-wallets` — Optional accountId filter
- `finance:create-wallet` — Creates wallet THEN optionally updates metadata
- `finance:update-wallet` / `finance:archive-wallet` / `finance:adjust-balance` / `finance:delete-wallet`
- `finance:get-wallet` (single, parses metadata) / `finance:update-wallet-metadata`
- `finance:get-archived-accounts` / `finance:get-archived-wallets` / `finance:unarchive-*`

### Crypto
- `finance:fetch-crypto-prices` — CoinGecko `/simple/price` with currency param, falls back to `finance_crypto_prices` cache
- `finance:get-crypto-history` — CoinGecko `/coins/{id}/market_chart`, caches in `finance_crypto_history`

### Categories
- `finance:get-categories` / `finance:create-category` / `finance:update-category`

### Security
- `finance:check-password-setup`, `finance:set-password`, `finance:change-password`, `finance:verify-password`
- `finance:lock`, `finance:unlock`, `finance:is-locked`, `finance:biometric-unlock`
- `finance:set-remember-device`, `finance:set-lock-timeout`, `finance:get-webauthn-credential`, `finance:store-webauthn-credential`
- `finance:get-security-settings`, `finance:check-page-access`
- `finance:get-display-currency`, `finance:set-display-currency`
- `finance:get-password-requirements`, `finance:set-password-requirement`

## DB Schema (finance tables)

### finance_accounts
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'personal',
description TEXT, icon TEXT DEFAULT 'Wallet', color TEXT DEFAULT '#10b981',
currency TEXT DEFAULT 'USD', balance REAL DEFAULT 0,
is_archived INTEGER DEFAULT 0, parent_account_id INTEGER,
created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
```

### finance_wallets
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
account_id INTEGER NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
name TEXT NOT NULL, type TEXT NOT NULL, provider TEXT, last_four TEXT,
balance REAL DEFAULT 0, currency TEXT DEFAULT 'USD', is_archived INTEGER DEFAULT 0,
metadata TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
```

### finance_categories
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
icon TEXT, color TEXT, sort_order INTEGER, is_archived INTEGER DEFAULT 0,
created_at TEXT DEFAULT CURRENT_TIMESTAMP
```

### finance_transactions
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
account_id INTEGER NOT NULL REFERENCES finance_accounts(id),
wallet_id INTEGER REFERENCES finance_wallets(id) ON DELETE SET NULL,
category_id INTEGER REFERENCES finance_categories(id),
type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
amount REAL NOT NULL, description TEXT, note TEXT,
date TEXT NOT NULL, time TEXT,
is_recurring INTEGER DEFAULT 0, recurring_interval TEXT,
tags TEXT, transfer_id TEXT, from_wallet_id INTEGER, to_wallet_id INTEGER,
created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
```

### finance_crypto_prices / finance_crypto_history
```sql
-- finance_crypto_prices: coin_id TEXT PK, name, symbol, current_price, market_cap, total_volume, price_change_24h, price_change_percentage_24h, last_updated
-- finance_crypto_history: id INTEGER PK, coin_id TEXT, timestamp INTEGER, price REAL — UNIQUE(coin_id, timestamp)
```

## Design Tokens (DeskFlow Finance)

### Colors
- Page accent: `#10b981` (emerald)
- Backgrounds: `zinc-950` (#0a0a0a), `zinc-900`, `zinc-900/50`, `zinc-800/80`, `zinc-800/60`, `zinc-800/50`, `zinc-800/40`, `zinc-800/30`, `zinc-800/20`
- Text: `white`, `zinc-100`, `zinc-200`, `zinc-300`, `zinc-400`, `zinc-500`, `zinc-600`
- Borders: `zinc-700/50`, `zinc-700/40`, `zinc-700/30`, `white/5`
- Success: `emerald-400` (#34d399)
- Danger: `red-400` (#f87171), `#fb7185`
- Warning: `amber-400` (#fbbf24)

### Wallet type accents
```typescript
bank: '#3B82F6', debit_card: '#10B981', credit_card: '#F59E0B',
crypto: '#8B5CF6', physical: '#F97316', cash: '#EC4899',
ewallet: '#06B6D4', other: '#6B7280'
```

### Typography
- Body: `text-[13px]`, `text-sm` (14px), `text-xs` (12px), `text-[11px]`, `text-[10px]`
- Headings: `text-[15px] font-semibold`, `text-[11px] font-semibold tracking-[0.08em] uppercase`
- Amounts: `text-money font-semibold tabular-nums`, `font-bold text-[28px] leading-[32px]`
- Monospace: `font-mono`

### Sizing
- Max border radius: `rounded-xl` (12px)
- Some cards: `rounded-[20px]`
- GlassSurface padding: `p-5` (20px) or `p-4`
- Card grid: `grid grid-cols-1 lg:grid-cols-4 gap-4`
- Touch targets: `min-h-[44px] min-w-[44px]`
- Sticky header expanded: 112px, compact: 48px

### Effects
- No box-shadow (replaced by border/glass effects)
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (custom easeOutExpo)
- Motion variants: `pageContainer`, `riseItem`, `tabPanel`, `fab (fixed bottom-6 right-6 w-14 h-14)`
- Duration constants (`DUR`) in `financeMotion.ts`

### GlassSurface pattern
```tsx
<GlassSurface className="p-5" interactive onClick={fn}>
  // children
</GlassSurface>
// Interactive variant has hover:bg-zinc-800/80, cursor-pointer, focus-visible ring
```

## Data Flow Architecture

### On unlock → fetchData()
```typescript
// Concurrently fetches:
const [accts, wals, cats, txns, sum, spend, trends] = await Promise.all([
  financeGetAccounts(), financeGetWallets(), financeGetCategories(),
  financeGetTransactions(), financeGetSummary(),
  financeGetSpendingByCategory(), financeGetMonthlyTrends(),
]);
sets all 7 state vars → tabs re-render
```

### Transaction list filtering (client-side in TransactionsTab)
```typescript
// Filters: type ('all'|'income'|'expense'|'transfer'), search (description), date range (start/end)
// Groups by date, computes netTotal per group
// Renders GlassSurface rows with type icon, wallet+description+category meta, amount, delete button
// onClick → TransactionDetailModal
```

### Wallet selector (FAB → dropdown)
- FAB opens wallet selector when no wallet selected, or wallet-specific modal when wallet is selected
- Wallet selector shows all non-archived wallets grouped by account with type emoji, name, balance
- Click → sets selectedWalletId + walletTxModal type → renders wallet-specific TransactionModal

### Password flow
- `checkPasswordRequirement('delete_account')` / `checkPasswordRequirement('delete_wallet')` shows PasswordConfirmDialog
- Transaction delete uses inline password input in TransactionsTab

## Existing Features Inventory (things already built)
- Full account/wallet/category CRUD with archive/unarchive
- 7 wallet type-specific transaction modals with context bands, denomination pickers, auto-calc
- Transfer with two-legged atomic transactions + wallet metadata merge
- Transaction detail modal (read-only)
- Password lock/unlock with biometric, cooldown, remember-device
- Currency selector with 10 currencies
- Net worth computation (accounts - custodial, with wallet balance conversion)
- Overview dashboard with income/expense cards, net flow sparkline, insights card
- Net worth trend line chart (Chart.js)
- Spending by category doughnut chart
- Monthly cashflow bar chart (income vs expense)
- Recent transactions card (top 5)
- Wallet detail view with crypto live prices, metadata editing, denomination counter
- Transaction search, type filter, date range filter
- Transaction delete with password gate for protected operations
- FAB quick transaction wallet selector dropdown
- Number mask mode for privacy
- Sticky collapsible header with net worth + trend

## QoL Gaps / Opportunities (not yet implemented — the design space)
- Multi-select transactions (no checkbox, no batch selection)
- Aggregate data panel (no selected-txns analytics)
- Export to CSV/JSON
- Budget/limit tracking per category or wallet
- Recurring transaction management/reminders
- Transaction templates
- Split transactions (one txn across categories)
- Tags for transactions (tags column exists in DB but no UI)
- Transaction reconciliation (mark as reconciled)
- Duplicate transaction detection
- Balance forecast/projection
- Transaction notes editing (post-creation)
- Spending alerts (category threshold exceeded)
- Batch category re-assignment
- Transaction pinning
- Date range custom periods beyond fixed month
