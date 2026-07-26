# Context Bundle: Crypto Wallet + Per-Wallet-Type Detail Views

> Ground truth for code structure, data shapes, architecture. The target AI should use this to design the complete solution.

---

## 1. Architecture Overview

**DeskFlow** is an Electron + React + TypeScript app. The finance section lives at `/finance` (single route, no sub-routing). Tab navigation via React state (`activeTab`), not URL routes.

**Finance page structure:**
- `src/pages/FinancePage.tsx` — shell, net worth header, tab bar, tab rendering, lock screen, modals
- `src/components/finance/OverviewTab.tsx` — KPIs, charts, account summaries
- `src/components/finance/AccountsTab.tsx` — accounts grid, inline wallet expand, CRUD modals (CreateAccountModal, CreateWalletModal, EditWalletModal, ArchivedItemsModal)
- `src/components/finance/TransactionsTab.tsx` — transaction ledger
- `src/components/finance/CategoriesTab.tsx` — category management
- `src/components/finance/FinanceLockScreen.tsx` — lock screen

**No existing detail pages.** Accounts expand inline (accordion) to show wallets. No wallet detail view exists. No crypto asset tracking. No cash counter.

---

## 2. Data Structures

### FinanceWallet (src/components/finance/finance-types.ts:16-28)
```typescript
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
```

### FinanceAccount (finance-types.ts:1-14)
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
```

### Note on account.balance
`account.balance` exists in the DB for backward compat but is **no longer used** on the frontend. Account balance = sum of its wallet balances (converted to displayCurrency).

---

## 3. Wallet Type Registry (walletMeta)

Defined in `src/components/finance/AccountsTab.tsx:49-57`:

```typescript
const walletMeta: Record<string, { icon: any; label: string; color: string }> = {
  bank:         { icon: Landmark,    label: 'Bank',       color: '#3B82F6' },
  debit_card:   { icon: CreditCard, label: 'Debit Card', color: '#10B981' },
  credit_card:  { icon: CreditCard, label: 'Credit Card', color: '#F59E0B' },
  crypto:       { icon: Wallet,     label: 'Crypto',     color: '#8B5CF6' },
  cash:         { icon: PiggyBank,  label: 'Cash',       color: '#EC4899' },
  ewallet:      { icon: Banknote,   label: 'E-Wallet',   color: '#06B6D4' },
  other:        { icon: Wallet,     label: 'Other',      color: '#6B7280' },
};
```

---

## 4. IPC Endpoints (Finance)

All 42 endpoints in `src/preload.ts:743-791` and `src/main.ts:18431-19008`. All backed by REAL SQLite via `better-sqlite3` — no mocks.

### Wallet-related (7 endpoints):
| IPC Channel | Input | Returns | Real |
|-------------|-------|---------|------|
| `finance:get-wallets` | `accountId?: number` | `FinanceWallet[]` | Yes |
| `finance:create-wallet` | `{ account_id, name, type, provider?, last_four?, balance?, currency? }` | `{ id, ...data }` | Yes |
| `finance:update-wallet` | Full wallet fields + `id` | `{ success: true }` | Yes |
| `finance:archive-wallet` | `id: number` | `{ success: true }` | Yes |
| `finance:get-archived-wallets` | none | `FinanceWallet[]` (is_archived=1) | Yes |
| `finance:unarchive-wallet` | `id: number` | `{ success: true }` | Yes |
| `finance:delete-wallet` | `id: number` | `{ success: true }` (cascades to transactions) | Yes |

### Account-related (7 endpoints):
| IPC Channel | Input | Returns | Real |
|-------------|-------|---------|------|
| `finance:get-accounts` | none | `FinanceAccount[]` | Yes |
| `finance:create-account` | `{ name, type, description?, icon?, color? }` | `{ id, ...data }` | Yes |
| `finance:update-account` | Full account fields + `id` | `{ success: true }` | Yes |
| `finance:archive-account` | `id: number` | `{ success: true }` | Yes |
| `finance:delete-account` | `id: number` | `{ success: true }` (cascades) | Yes |

### Currency:
| IPC Channel | Input | Returns | Real |
|-------------|-------|---------|------|
| `finance:get-display-currency` | none | `string` (e.g. 'USD') | Yes |
| `finance:set-display-currency` | `currency: string` | `{ success: true }` | Yes |

### Security (relevant):
| IPC Channel | Input | Returns | Real |
|-------------|-------|---------|------|
| `finance:verify-password` | `password: string` | `{ success: boolean }` | Yes |
| `finance:get-security-settings` | none | `{ hasPassword, locked, rememberDevice, ... }` | Yes |

**Note:** No service layer — handlers are inline in main.ts using `better-sqlite3`. All are real (no stubs).

## 5. Current Wallet Rendering (AccountsTab.tsx)

Wallets render as **inline rows inside an expanded account card** (not a separate page):

```typescript
// AccountsTab.tsx:150-295
// Account card with expandable wallet list
// Each wallet row shows: icon + name + type badge + balance + edit/archive/delete buttons
// No click-to-detail navigation exists
```

**CreateWalletModal** (line 432-549): Form with wallet type picker (4-col grid of type buttons), provider, last 4, balance (with currency symbol prefix). The balance is a single number input — no asset tracking for crypto, no bill breakdown for cash.

---

## 6. Routing & Navigation

**No sub-routing.** Single route: `/finance` → `<FinancePage />`. Tab switching via `useState<FinanceTabKey>('overview')`. No React Router hooks used in finance section.

**Current navigation pattern:** Inline expand/collapse, modals for creation/editing. No detail pages.

---

## 7. Design Tokens & Patterns

### Colors
- Background: `bg-zinc-950` (page), `bg-zinc-900/55` (GlassSurface tier 1)
- Cards: `bg-zinc-900/55 backdrop-blur-2xl border border-white/10 rounded-xl`
- Input backgrounds: `bg-zinc-800/80 border border-zinc-700/50 rounded-lg`
- Accent (primary): emerald (`#10B981` / `text-emerald-400` / `bg-emerald-500`)
- Danger: red (`text-red-400` / `bg-red-500/10`)
- Text: `text-zinc-200` (primary), `text-zinc-400` (secondary), `text-zinc-500` (tertiary)
- Positive balance: `text-emerald-400`, Negative: `text-red-400`
- Empty/neutral: `text-zinc-600`

### GlassSurface component
```typescript
// Three tiers: 1 (translucent), 2 (solid), 3 (bottom border only)
// Props: tier, accent, interactive, className, onClick, style
<GlassSurface className="!p-4" onClick={...}>
  // children
</GlassSurface>
```

### Modal pattern
```typescript
// Overlay + centered card with AnimatePresence
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[var(--z-modal)] flex items-center justify-center p-5"
  onClick={onClose}>
  <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    className="w-full max-w-sm bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5"
    onClick={(e) => e.stopPropagation()}>
```

### EmptyState component
```typescript
<GlassSurface className="p-8 text-center">
  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
    {icon}
  </div>
  <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
  <p className="text-xs text-zinc-500 max-w-[220px]">{description}</p>
  <button className="mt-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium">
    {action.label}
  </button>
</GlassSurface>
```

### Currency utilities (currency-data.ts)
```typescript
getCurrencyInfo(code: string): CurrencyInfo { code, symbol, name, locale }
convertAmount(amount, fromCurrency, toCurrency): number  // via EXCHANGE_RATES map
formatCurrency(amount, currencyCode): string
```

### Typography
- Tab labels: 11px uppercase tracking-wider
- Card titles: 15px / 600 / text-white
- Balances: text-base font-semibold tabular-nums
- Small labels: text-[10px] / text-[11px]
- Body: text-sm (13-14px)
- Modal title: text-sm font-semibold text-white

---

## 8. Existing `crypto` Wallet Type

The `crypto` wallet type exists as an enum value and icon but has **no special implementation**:
- Wallet icon = generic `Wallet` icon (shared with `other`)
- Balance = a single number (fiat amount, not asset quantity)
- No asset tracking (BTC, ETH, etc.)
- No price API integration
- No portfolio breakdown
- No detail view

---

## 9. Existing Chart Components (Chart.js)

Chart.js v4.5.1 + react-chartjs-2 v5.3.1 are already in the project. Finance uses three chart components:

### NetWorthLineChart (`src/components/finance/NetWorthLineChart.tsx`)
```typescript
// Line chart for net worth over time
// Props: data: { date: string; value: number }[], currency: string
// Uses: Line from react-chartjs-2
// Pattern: gradient fill, dark theme grid, custom tooltip
```

### SpendingCategoryChart (`src/components/finance/SpendingCategoryChart.tsx`)
```typescript
// Doughnut chart for spending breakdown
// Props: data categories, displayCurrency, baseCurrency, convertAmount
// Uses: Doughnut from react-chartjs-2
// Pattern: center label, category color slices, truncation to top-N + "Other"
```

### IncomeExpenseBarChart (`src/components/finance/IncomeExpenseBarChart.tsx`)
```typescript
// Grouped bar chart for income vs expense
// Props: data: { month: string; income: number; expense: number }[], currency: string
// Uses: Bar from react-chartjs-2
// Pattern: green income bars, red expense bars, dark grid
```

**Chart styling pattern:** All charts use chart.js `registerables` or specific components (ArcElement, Tooltip, Legend). Charts are wrapped in GlassSurface cards. Grid lines use `rgba(255,255,255,0.05)`, text uses `rgba(255,255,255,0.4)`. Tooltips are dark with white text.

---

## 10. Files in Scope

```
src/pages/FinancePage.tsx                — shell, state, tab rendering
src/components/finance/AccountsTab.tsx    — wallet CRUD modals, walletMeta, wallet row rendering
src/components/finance/finance-types.ts   — FinanceWallet interface
src/components/finance/currency-data.ts   — currency conversion, formatting
src/components/finance/_fx/GlassSurface.tsx  — card component
src/components/finance/EmptyState.tsx     — empty state component
src/components/finance/OverviewTab.tsx    — account summaries
src/main.ts                              — IPC handlers (all finance CRUD)
src/preload.ts                           — IPC bridge
```
