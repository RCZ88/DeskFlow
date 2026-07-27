# Context Bundle — Budget & Expenses Data Visualization

## What This Feature Covers

Replace the Subscription Intelligence card with a comprehensive Budget & Expenses visualization that includes:
1. Fixed Income tracking (salary, freelance, recurring income)
2. Fixed Expenses tracking (rent, subscriptions, bills)
3. Budget tracking with progress bars
4. Data visualization: cash flow, spending breakdown, net worth trends
5. Professional dark-theme UI with proper colors

## Current State

### Database Tables
```sql
-- finance_fixed_expenses (EMPTY - 0 rows)
CREATE TABLE finance_fixed_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT DEFAULT 'monthly',
  category_id INTEGER,
  wallet_id INTEGER,
  next_due_date TEXT,
  is_active INTEGER DEFAULT 1,
  type TEXT CHECK(type IN ('expense', 'income')),
  metadata TEXT
);

-- finance_budgets (EMPTY - 0 rows)
CREATE TABLE finance_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'total',
  category_id INTEGER,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  period TEXT DEFAULT 'monthly',
  alert_threshold REAL DEFAULT 80,
  is_active INTEGER DEFAULT 1,
  metadata TEXT
);

-- finance_transactions (has data)
-- 11 expenses, 5 transfers, 0 income
```

### IPC Endpoints
| Endpoint | Purpose | Returns |
|----------|---------|---------|
| `fixed-expenses:list` | List fixed expenses | Array of expenses |
| `fixed-expenses:create` | Create fixed expense | Created expense |
| `fixed-expenses:update` | Update fixed expense | Updated expense |
| `fixed-expenses:delete` | Delete fixed expense | Success |
| `budgets:list` | List budgets | Array of budgets |
| `budgets:create` | Create budget | Created budget |
| `budgets:update` | Update budget | Updated budget |
| `budgets:delete` | Delete budget | Success |
| `budgets:get-status` | Get budget status with spending | Budget statuses |
| `finance:get-liquidity-breakdown` | Get wallet liquidity tiers | Liquidity data |

### Current UI Components
- `BudgetFixedExpensesTab.tsx` — Combined tab with Fixed Income, Fixed Expenses, Budgets sections
- `SpendingCategoryChart.tsx` — Doughnut chart for spending by category
- `LiquidityWaterfall.tsx` — Horizontal bar chart for wallet liquidity
- `SubscriptionBurdenRadar.tsx` — Radar chart for subscriptions (to be replaced)

### Design Tokens
- Background: `bg-zinc-900/50`, `bg-zinc-900/80`
- Borders: `border-zinc-700/30`, `border-zinc-800/60`
- Text: `text-zinc-500` (labels), `text-white` (values)
- Income: `#10b981` (emerald)
- Expense: `#ef4444` (red)
- Budget: `#f59e0b` (amber)
- Chart: JetBrains Mono 10px, grid `rgba(113,113,122,0.08)`

## What Needs to Be Designed

### 1. Budget & Expenses Dashboard Card
A comprehensive card that shows:
- Monthly income vs expenses bar chart
- Net cash flow indicator
- Budget progress bars
- Upcoming due dates
- Spending by category breakdown

### 2. Spending Category Chart Fix
Current issues:
- Rainbow colors look unprofessional
- Legend text doesn't show category names properly
- Need professional dark-theme colors

### 3. Liquidity Waterfall Fix
Current issues:
- Not showing data (IPC returns different format than expected)
- Need to visualize wallet liquidity tiers (Immediate, Same Day, 1-3 Days, Locked)

### 4. Data Processing
- Aggregate fixed income/expenses by frequency (monthly, weekly, yearly)
- Calculate net cash flow
- Compute budget utilization percentages
- Project upcoming payments
