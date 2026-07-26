# CONTEXT_BUNDLE.md — Finance Data Visualization & Features

## Raw Request
"i think we can make good visualization from like the data of the wallet types. like a part chart that shows how much is liquid and how much is not. and like a pie chart that shows the different wallets or other types of chart like the bar chart or something that is interesting. and like idk, based on the features that we have, what are the interesting data processing (i prefer something more complicated) that we can add to improve the user experience, something that is cool, but also maybe add something that is actually like really useful. i want you to generate prompt to ask another ai what are the stuff to add on the finance page in terms of the data, or maybe other features to improve the page"

ADDITIONAL REQUIREMENT: "i dont think we have handled the normal rupiah on the wallet. of course crypto wallet (some brokers) have still like the rupiah or like any other currency. that currency is used to buy the coins right? can we make sure that the crypto wallet can display the cash (normal currency, not crypto) things too? so when the bank or anything transfers to that, it should show it up as it is."

---

## 1. DATABASE SCHEMA (from src/main.ts)

### finance_wallets
```sql
CREATE TABLE IF NOT EXISTS finance_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bank','debit_card','credit_card','crypto','cash','physical','ewallet','other')),
  provider TEXT,
  last_four TEXT,
  balance REAL DEFAULT 0.0,
  currency TEXT DEFAULT 'USD',
  is_archived INTEGER DEFAULT 0,
  metadata TEXT,
  transfer_fee_type TEXT DEFAULT 'none',
  transfer_fee_value REAL DEFAULT 0,
  initial_balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime'))
);
```

### finance_transactions
```sql
CREATE TABLE IF NOT EXISTS finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  wallet_id INTEGER,
  category_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
  amount REAL NOT NULL,
  description TEXT,
  note TEXT,
  date TEXT NOT NULL,
  time TEXT,
  is_recurring INTEGER DEFAULT 0,
  recurring_interval TEXT,
  tags TEXT,
  on_behalf_of INTEGER DEFAULT 0,
  on_behalf_of_label TEXT,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime'))
);
-- Migrations added:
ALTER TABLE finance_transactions ADD COLUMN transfer_id TEXT;
ALTER TABLE finance_transactions ADD COLUMN from_wallet_id INTEGER;
ALTER TABLE finance_transactions ADD COLUMN to_wallet_id INTEGER;
ALTER TABLE finance_transactions ADD COLUMN ft_person_id INTEGER;
ALTER TABLE finance_transactions ADD COLUMN fee REAL DEFAULT 0;
```

### finance_subscriptions
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
  created_at TEXT,
  updated_at TEXT
);
```

---

## 2. TYPESCRIPT INTERFACES (from src/components/finance/finance-types.ts)

```typescript
export interface FinanceAccount {
  id: number; name: string; type: 'personal' | 'joint' | 'custodial' | 'business';
  description: string | null; icon: string; color: string; currency: string;
  balance: number; is_archived: number; parent_account_id: number | null;
  created_at: string; updated_at: string;
}

export interface FinanceWallet {
  id: number; account_id: number; name: string;
  type: 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'physical' | 'other';
  provider: string | null; last_four: string | null; balance: number;
  currency: string; is_archived: number; metadata?: string;
  created_at: string; updated_at: string;
}

export interface FinanceTransaction {
  id: number; account_id: number; wallet_id: number | null;
  category_id: number; type: 'income' | 'expense' | 'transfer';
  amount: number; fee: number; description: string | null; note: string | null;
  date: string; time: string | null; is_recurring: number;
  recurring_interval: string | null; tags: string | null;
  transfer_id: string | null; from_wallet_id: number | null; to_wallet_id: number | null;
  on_behalf_of: number; on_behalf_of_label: string | null; ft_person_id: number | null;
  metadata: string | null; created_at: string; updated_at: string;
}

export interface FinanceSubscription {
  id: number; wallet_id: number; name: string; description: string;
  price: number; currency: string; billing_cycle: string; billing_interval: number;
  start_date: string | null; next_renewal_date: string | null;
  cancel_url: string; cancel_reminder_days: number; reminder_note: string;
  status: string; category_id: number | null;
  created_at: string; updated_at: string;
}

export type WalletMetadata =
  | { type: 'crypto'; coin_id?: string; symbol?: string; blockchain?: string; wallet_address?: string; assets?: WalletAsset[] }
  | { type: 'cash'; denominations?: CashDenomination[] }
  | { type: 'physical'; denominations?: CashDenomination[]; description?: string }
  // ... other types

export interface WalletAsset {
  coin_id: string; symbol: string; name: string; asset_type: string;
  amount: number; avg_buy_price: number; current_price?: number;
}

export interface CryptoPrice {
  coin_id: string; name: string; symbol: string; current_price: number;
  market_cap: number; total_volume: number; price_change_24h: number;
  price_change_percentage_24h: number; last_updated: string;
}
```

---

## 3. EXISTING CHART COMPONENTS

### OverviewTab (src/components/finance/OverviewTab.tsx)
- **Quick Stats**: Income card, Expense card, Net Flow card, SpendingSplitCard
- **Deep Dive**: Receivables card, Net Flow Hero with Sparkline
- **Insights**: FinanceInsightsCard (Savings Rate, Top Spend, Daily Avg)
- **Analytics**: NetWorthLineChart (line), SpendingCategoryChart (doughnut)
- **Cashflow**: IncomeExpenseBarChart (stacked bar), RecentTransactions
- **Accounts**: Account grid with wallet balances

### NetWorthLineChart (src/components/finance/NetWorthLineChart.tsx)
- Chart.js Line chart with gradient fill
- Day/Month/Auto granularity toggle
- Built from individual transactions grouped by date

### SpendingCategoryChart (src/components/finance/SpendingCategoryChart.tsx)
- Chart.js Doughnut (68% cutout)
- Category spectrum colors (10 colors)
- Optional "Include Follow Through" toggle

### IncomeExpenseBarChart (src/components/finance/IncomeExpenseBarChart.tsx)
- Chart.js Stacked Bar (20px bars)
- Last 6 months, green=income, red=expense

### WalletDetailView CryptoDetail (internal component)
- Line chart for crypto price history (1D/1W/1M/3M/1Y/ALL)
- Doughnut for multi-asset allocation
- Coin list with live prices, P&L, 24h change

---

## 4. WALLET TYPES & METADATA

| Type | Metadata Fields | Icon | Color |
|------|-----------------|------|-------|
| bank | bank_name, branch, account_number, swift, iban | Landmark | #3b82f6 |
| debit_card | card_network, issuer, daily_limit | CreditCard | #10b981 |
| credit_card | card_network, issuer, credit_limit, billing_day, due_day, apr | CreditCard | #f59e0b |
| crypto | coin_id, symbol, blockchain, wallet_address, assets[] | Coins | #8b5cf6 |
| cash | denominations: [{value, label, count}] | Wallet | #22d3ee |
| physical | denominations: [{value, label, count}], description | WalletCards | #f97316 |
| ewallet | platform, phone_or_email, daily_limit | Smartphone | #ec4899 |
| other | notes | Building2 | #71717a |

### Denomination Tracking (physical/cash)
- denominations stored as JSON array in metadata
- Each denomination: { value: number, label: string, count: number }
- Total = sum(value * count) for each denomination
- Out-of-sync warning when denomination total ≠ wallet.balance

---

## 5. EXPENSE MODEL (CRITICAL)

```typescript
// computeDerivedExpenseByWallet in src/main.ts
// Expense is derived from wallet balance deltas, NOT transaction amounts
function computeDerivedExpenseByWallet(wallets, transactions) {
  // For each wallet: expense = max(0, initial_balance - current_balance)
  // Transaction amounts in DB may be corrupted (all 0s from encryption migration)
  // Dashboard totals use wallet balance model, not transaction sums
}
```

---

## 6. IPC ENDPOINTS FOR DATA

| Endpoint | Returns |
|----------|---------|
| `finance:get-summary` | { totalIncome, totalExpense, netBalance } |
| `finance:get-spending-by-category` | [{ categoryId, categoryName, amount, count }] |
| `finance:get-monthly-trends` | [{ month, income, expense, net }] |
| `finance:get-on-behalf-of-summary` | { totalExpense, breakdown[] } |
| `finance:recalculate-balances` | Per-wallet breakdown with initial_balance |
| `subscriptions:list` | All subscriptions with next_renewal_date |
| `finance:fetch-crypto-prices` | Live CoinGecko prices |
| `finance:get-crypto-history` | Historical price data for charts |
| `finance:search-assets` | Multi-asset search (crypto/commodity/stock) |

---

## 7. CRYPTO WALLET CURRENT BEHAVIOR

### What exists:
- Crypto wallet stores assets[] in metadata with coin_id, amount, avg_buy_price
- Live prices fetched from CoinGecko API
- Portfolio value = sum(amount * current_price)
- P&L = total_value - total_cost_basis
- Line chart for price history, doughnut for allocation

### What's MISSING (user's request):
- **Fiat currency balance not tracked**: When user transfers IDR/USD to crypto wallet (e.g., Binance), the fiat balance is not stored separately from crypto assets
- **No combined view**: Should show both fiat balance (IDR 500,000) AND crypto portfolio (BTC 0.001 = IDR 1,200,000)
- **Transfer in doesn't show fiat**: Bank → Crypto transfer should show the fiat amount in the crypto wallet

### Proposed fix:
- Add `fiat_balance` field to crypto wallet metadata OR use the wallet's `balance` column for fiat
- When displaying crypto wallet, show: Fiat Balance + Crypto Portfolio Value = Total
- Transfers to crypto wallet update `balance` (fiat) while crypto buys/sells update `assets[]`

---

## 8. DESIGN TOKENS (from src/index.css)

```css
/* Dark mode only */
--bg-primary: #09090b;
--bg-secondary: #18181b;
--accent-primary: #10b981;
--accent-secondary: #8b5cf6;

/* Glass morphism */
.bg-zinc-900/80 backdrop-blur-xl;

/* Typography */
font-family: 'Geist', 'Inter', sans-serif;
font-family: 'JetBrains Mono', monospace;

/* Spacing */
rounded-xl (12px max), p-5 (20px padding)

/* Chart colors */
CATEGORY_SPECTRUM: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#6366f1']
```

---

## 9. EXISTING ANTI-SLOP CHECKLIST

After any MCP-sourced component, re-skin to DeskFlow tokens:
1. Colors → --bg-primary, --accent-primary, etc.
2. Max rounded-xl, p-5 padding
3. Dark mode only
4. Geist + JetBrains Mono fonts
5. Glass layer (bg-zinc-900/80 backdrop-blur-xl)
