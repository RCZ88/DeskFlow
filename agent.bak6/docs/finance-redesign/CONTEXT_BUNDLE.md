# Finance Page Context Bundle — Complete Codebase Reference

> This is the **sole source of truth** for the target AI. All paths, props, and data shapes below are exact.

---

## Project Stack
- **Electron** app shell
- **React 19** + **TypeScript** + **Vite** (bundled via `electron-vite`)
- **Tailwind CSS v4** (`@import "tailwindcss"` in `index.css` — NOT v3)
- **Framer Motion** for animations
- **Recharts** for charts (doughnut, bar, line)
- **Lucide React** for icons
- **Electron IPC** (`contextBridge` via `preload.ts`) — backend is SQLite

## Design Tokens (current)
```
--page-accent: #10b981 (emerald green)
Background: zinc-950 (#09090b)
Cards:      zinc-900/70 backdrop-blur-xl border zinc-700/30
Inputs:     zinc-800
Text:       zinc-100 primary, zinc-400 secondary, zinc-500 muted
Radius:     rounded-xl for cards, rounded-lg for inputs/buttons
Font:       Inter (system font stack)
Glow:       subtle green glow on accent elements
```

## CURRENT LAYOUT — What to AVOID (it's plain and generic)

### Finance Page (`src/pages/FinancePage.tsx`)
The page is a tabbed interface inside a `PageShell` wrapper:
```
┌────────────────────────────────────────────────────────────┐
│  FinanceStickyHeader (fixed top bar)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  👁️  Net Worth: $XX,XXX       [mask toggle]         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Tabs: [Overview] [Accounts] [Transactions]                 │
│  ── underline style, no animation                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TAB CONTENT AREA                                     │  │
│  │                                                       │  │
│  │  OverviewTab:                                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐  │  │
│  │  │Income    │ │Net Worth │ │Recent Transactions   │  │  │
│  │  │$X,XXX    │ │$XX,XXX  │ │(mini list)           │  │  │
│  │  └──────────┘ └──────────┘ └──────────────────────┘  │  │
│  │                                                       │  │
│  │  Spending by Category (doughnut chart)                │  │
│  │  Monthly Trends (bar chart)                           │  │
│  │  Net Worth Over Time (line chart)                     │  │
│  │  ── charts stacked vertically, default Recharts style │  │
│  │                                                       │  │
│  │  AccountsTab:                                         │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │ ▼ Account Name        [edit] [hide]          │    │  │
│  │  │  ┌ Wallet 1     $X,XXX  [edit] [archive]    │    │  │
│  │  │  └ Wallet 2     $X,XXX  [edit] [archive]    │    │  │
│  │  │  [+ Add Wallet button]                      │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │                                                       │  │
│  │  TransactionsTab:                                     │  │
│  │  ┌──[🔍 Search]───[All|Income|Expense]──────────┐   │  │
│  │  │  [Date From] [Date To] [Clear]                │   │  │
│  │  ├───────────────────────────────────────────────┤   │  │
│  │  │  Today                                        │   │  │
│  │  │  Description          Amount  [delete]        │   │  │
│  │  │  Description          Amount  [delete]        │   │  │
│  │  └───────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [➕ FAB — opens QuickAddModal]                             │
└────────────────────────────────────────────────────────────┘
```

### Tab Implementation Details

#### Tab Bar (in FinancePage.tsx)
```tsx
// Plain styled buttons, no animation, no icon per tab
<button onClick={() => setActiveTab('overview')}>Overview</button>
<button onClick={() => setActiveTab('accounts')}>Accounts</button>
<button onClick={() => setActiveTab('transactions')}>Transactions</button>
// Active tab: bg-accent/10 text-accent
// Inactive tab: text-muted-foreground hover:text-foreground
```

#### OverviewTab
```tsx
// Three stat cards in a row via grid-cols-3
// IncomeExpenseCard: shows income/expense total with mini bar
// NetWorthCard: shows net worth with trend arrow
// RecentTxnsCard: mini transaction list (last 5)
// Then 3 charts stacked vertically
```

#### AccountsTab
```tsx
// Each account is a collapsible card
// Inside: list of wallets, each with edit/archive icon buttons
// "Add Wallet" button at bottom of each expanded account
```

#### TransactionsTab
```tsx
// Filter bar: search input + type filter buttons + date range inputs
// Transaction list: grouped by date headers ("Today", "Yesterday", "Jun 15")
// Each row: description, optional category badge, amount (green/red), delete button
// Delete triggers inline password input replacing the delete button
```

#### QuickAddModal
```tsx
// Standard modal with:
// - Description input
// - Amount input (shows account currency symbol)
// - Category select (grouped by type)
// - Type toggle (income/expense)
// - Account/wallet selector
// - Date input
// - Notes textarea
```

#### FinanceStickyHeader
```tsx
// Fixed at top, shows net worth with mask toggle eye icon
// Plain text display, no animation, no sparkline
```

#### FinanceLockScreen
```tsx
// Full-screen overlay when lock is active
// Password input + "Unlock" button
// WebAuthn/Windows Hello button below
// Minimal dark background, no atmosphere
```

---

## File Inventory (all paths relative to `src/`)

### Finance Components
| File | Props | Description |
|------|-------|-------------|
| `pages/FinancePage.tsx` | none | Page shell, state: activeTab, financeData, spendingByCategory, lock state. Contains all IPC calls and passes data/handlers down |
| `components/finance/FinanceStickyHeader.tsx` | `netWorth, currency, maskMode, maskFixedValue, onToggleMask` | Fixed top bar |
| `components/finance/FinanceLockScreen.tsx` | `onUnlock` | Full-screen lock overlay |
| `components/finance/OverviewTab.tsx` | `financeData, spendingByCategory, currency, maskMode, ...` | Overview with 3 stat cards + 3 charts |
| `components/finance/AccountsTab.tsx` | `accounts, wallets, onArchiveWallet, onCreateWallet, onUpdateWallet` | Account/wallet management |
| `components/finance/TransactionsTab.tsx` | `transactions, onDeleteTransaction, onVerifyPassword` | Transaction ledger |
| `components/finance/QuickAddModal.tsx` | `isOpen, onClose, categories, accountCurrency, ...` | Quick-add transaction |
| `components/finance/IncomeExpenseCard.tsx` | `income, expense, currency, maskMode, maskFixedValue` | Stat card |
| `components/finance/NetWorthCard.tsx` | `netWorth, currency, maskMode, maskFixedValue` | Stat card |
| `components/finance/RecentTxnsCard.tsx` | `transactions, currency, maskMode, maskFixedValue` | Mini list card |
| `components/finance/IncomeExpenseBarChart.tsx` | `data, currency` | Monthly bar chart |
| `components/finance/NetWorthLineChart.tsx` | `data, currency` | Line chart |
| `components/finance/SpendingCategoryChart.tsx` | `data` | Doughnut chart |
| `components/finance/CreateWalletModal.tsx` | `isOpen, onClose, onSubmit` | Wallet creation form |
| `components/finance/EditWalletModal.tsx` | `isOpen, wallet, onClose, onSubmit` | Wallet edit form |

### Shared Context/Utils
| File | Role |
|------|------|
| `context/NumberMaskContext.tsx` | MaskMode type: `'all' | 'same' | 'fixed'`, provides `maskMode, setMaskMode, maskFixedValue, setMaskFixedValue` |
| `utils/maskNumber.ts` | `maskNumber(value: number, mode: MaskMode, fixedValue?: number): string` |

### State Management (in FinancePage.tsx)
All state is local `useState` — no global store:
```typescript
// Data state
const [financeData, setFinanceData] = useState<any>(null)
const [accounts, setAccounts] = useState<any[]>([])
const [wallets, setWallets] = useState<any[]>([])
const [transactions, setTransactions] = useState<any[]>([])
const [categories, setCategories] = useState<any[]>([])
const [spendingByCategory, setSpendingByCategory] = useState<any[]>([])

// UI state
const [activeTab, setActiveTab] = useState('overview')
const [isLocked, setIsLocked] = useState(true)
const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

// Derived
const netWorth = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
const currency = accounts[0]?.currency || 'USD'
```

### IPC Endpoints (preload.ts)
```typescript
// Finance
financeGetFinanceData: () => ipcRenderer.invoke('finance:get-data')
financeGetTransactions: (filters) => ipcRenderer.invoke('finance:get-transactions', filters)
financeCreateTransaction: (data) => ipcRenderer.invoke('finance:create-transaction', data)
financeDeleteTransaction: (id) => ipcRenderer.invoke('finance:delete-transaction', id)
financeVerifyPassword: (password) => ipcRenderer.invoke('finance:verify-password', password)
financeCreateWallet: (data) => ipcRenderer.invoke('finance:create-wallet', data)
financeArchiveWallet: (id) => ipcRenderer.invoke('finance:archive-wallet', id)
financeUpdateWallet: (id, data) => ipcRenderer.invoke('finance:update-wallet', id, data)
// Settings
financeGetSettings: () => ipcRenderer.invoke('finance:get-settings')
financeSaveSettings: (settings) => ipcRenderer.invoke('finance:save-settings', settings)
financeChangePassword: (current, newPass) => ipcRenderer.invoke('finance:change-password', current, newPass)
```

### Data Shapes (from DB → IPC)
```typescript
// Account (finance_accounts table)
{ id: number, name: string, type: string, currency: string, balance: number,
  icon: string, color: string, is_archived: number, created_at: string }

// Wallet (finance_wallets table)
{ id: number, account_id: number, name: string, type: string,
  provider: string, last_four: string, balance: number,
  is_archived: number, created_at: string }
// wallet.type: 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'other'

// Transaction (finance_transactions table)
{ id: number, wallet_id: number, category_id: number, type: 'income'|'expense',
  amount: number, currency: string, description: string, date: string,
  notes: string, created_at: string }

// Category (finance_categories table)
{ id: number, name: string, type: 'income'|'expense'|'both', icon: string, color: string }

// Finance Settings
{ lock_timeout_minutes: number, remember_device: boolean, masking_mode: string,
  masking_fixed_value: number }
```

---

## 21st.dev Component Inspiration (available UI assets)

These were found on 21st.dev and can be adapted/used for inspiration:

1. **Financial Score Cards** — liquid glass cards with animated score displays, badge overlays, strength indicators. Good for Net Worth / Income stat cards.
2. **Liquid Glass** — SVG filter-based glass distortion with `feTurbulence`, `feDisplacementMap`, layered glass effect with inner shadows and highlights. Advanced glassmorphism technique.
3. **Liquid Weather Glass** — configurable glass card with blur/shadow/glow intensity props. Drag, expand, and hover animations.
4. **Glass Card** — structured glass card with header/title/content/footer sections, companion button component.
5. **Financial Dashboard** — full dashboard pattern: search bar, quick action grid, recent activity list with colored amounts, staggered Framer Motion animations.
6. **Transaction List** — animated expandable transaction rows with Framer Motion `layoutId` shared transitions, credit card brand logos.
7. **Dialog** — animated dialog with spring physics, backdrop overlay, clean close button.

---

## What MUST Be Preserved
- All IPC calls and their signatures (preload.ts API)
- All data shapes from backend (no backend changes)
- PageShell wrapper
- `--page-accent` CSS variable approach
- Tailwind v4 (never v3)
- Framer Motion as animation library
- Recharts as chart library
- Lucide React for icons
- Number masking via NumberMaskContext
- Password lock + WebAuthn flow
