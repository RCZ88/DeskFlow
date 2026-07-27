# PROMPT.md — Monthly Expenditure System & Budget Feature

## Raw Request

> I think following up to the subscription future, we also need to have like a monthly expenditure system. It includes like the monthly cost, for example, a fixed cost every month, and I for example have a parking cost on my university and stuff like that. For example, the package that you buy on my phone is that I'm able to access the data to quota. Those are fixed expenses, for example food, but food isn't like the mind. I think the ability to be able to set those and make sure that it's still on budget, the expenses, the fixed expenses, and how we can design a system where we're able to make the fixed expenses, and having the transaction related to these fixed expenses. For example, detecting a fixed expense based on the data that we've fully had and how a transaction can be a form of the fixed expense, so it's like a short cut for every month. I mean, how can we make a feature where it's useful to be able to try these fixed expenses, but whether it's like it's just a one time thing feature where you can compile all of those transactions into trying to find some like the fixed cost for every month, and like, for example, similar features like the subscription, and where you're able to pay up on the monthly fees and the quick transaction for those transactions, for those months in this expenditure, I would like you to use the generic proper skill to find out how we can expand this idea and make it actually a useful feature that we're able to utilize this monthly expenditure to use it for something, and how is it supposed to automatically transact or something like that in manual input. So we can set the date. If we were to do a monthly thing, we can select which monthly expenses it is and click it and it'll mark it as complete for this month. We can also have a feature where we can compare the fixed cost with the budgeting feature and stuff like that. So I think a budgeting feature which means that the maximum amount of expenses and the very good above the maximum amount of expenses you'll be having some warnings and stuff like that to manage. So basically it's money management and having full control or what you expect on your expenses are in your monthly fixed cost and everything like that.

---

## Context Bundle

Read `CONTEXT_BUNDLE.md` in this directory as the source of truth for all code structure, data shapes, IPC endpoints, design tokens, and architecture. The target AI must read this first before designing.

---

## Problem Statement

The user needs a **Fixed Expenses** system and a **Budget Manager** inside the existing DeskFlow Finance page. Currently, the finance page has subscriptions (recurring services with renewal dates), wallets, transactions, and charts — but no concept of **predictable monthly costs** (parking, phone data plan, food budgets) or **spending limits** (budgets). The user wants to:

1. Define fixed expenses that repeat monthly (like subscriptions but for non-service costs)
2. Quickly mark each fixed expense as "paid this month" with one click (creating a real transaction)
3. Auto-detect recurring patterns from existing transactions
4. Set monthly budget limits per category or total, with warnings when exceeded
5. Compare fixed costs vs actual spending to see where money goes

---

## The Mandate

Design a **complete Fixed Expenses + Budget system** for the DeskFlow Finance page. You are the **Lead Designer and Engineer**. Deliver a single, comprehensive specification covering: data model, IPC endpoints, database schema, UI components, interaction flows, and all edge cases. No options — just the best solution.

---

## Requirement Checklist

### A. Fixed Expenses System

**A1. DB Schema — `finance_fixed_expenses` table:**
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `wallet_id` INTEGER NOT NULL (FK → finance_wallets.id)
- `name` TEXT NOT NULL (e.g., "University Parking", "Phone Data Plan", "Food Budget")
- `description` TEXT DEFAULT ''
- `amount` REAL NOT NULL DEFAULT 0 (expected monthly cost)
- `currency` TEXT DEFAULT 'USD'
- `category_id` INTEGER (FK → finance_categories.id) — links to existing expense categories
- `billing_day` INTEGER DEFAULT 1 (day of month when due, 1-31)
- `is_active` INTEGER DEFAULT 1
- `auto_create_transaction` INTEGER DEFAULT 0 (if 1, auto-create expense txn on billing_day)
- `wallet_id` INTEGER NOT NULL (which wallet to deduct from)
- `metadata` TEXT (JSON: notes, tags, etc.)
- `created_at` TEXT DEFAULT CURRENT_TIMESTAMP
- `updated_at` TEXT DEFAULT CURRENT_TIMESTAMP

**A2. Monthly Payment Tracking — `finance_fixed_expense_payments` table:**
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `fixed_expense_id` INTEGER NOT NULL (FK → finance_fixed_expenses.id)
- `month` TEXT NOT NULL (YYYY-MM format, e.g., "2026-07")
- `status` TEXT DEFAULT 'pending' ('pending' | 'paid' | 'skipped')
- `amount_paid` REAL (actual amount paid, may differ from expected)
- `transaction_id` INTEGER (FK → finance_transactions.id — the real transaction created)
- `paid_date` TEXT (YYYY-MM-DD when marked paid)
- `paid_by` TEXT DEFAULT 'manual' ('manual' | 'auto' | 'quick')
- `note` TEXT
- `created_at` TEXT DEFAULT CURRENT_TIMESTAMP
- UNIQUE(fixed_expense_id, month) — one record per expense per month

**A3. IPC Endpoints to Create:**
```
fixed-expenses:list        → List all fixed expenses (with current month payment status)
fixed-expenses:create      → Create a new fixed expense
fixed-expenses:update      → Update a fixed expense
fixed-expenses:delete      → Delete a fixed expense (cascade delete payments)
fixed-expenses:mark-paid   → Mark expense as paid for a specific month (creates transaction)
fixed-expenses:skip-month  → Skip a month (no transaction, status='skipped')
fixed-expenses:unmark-paid → Undo a paid month (reverses transaction)
fixed-expenses:payment-history → Get payment history for an expense
fixed-expenses:detect-recurring → Scan existing transactions for recurring patterns
fixed-expenses:summary     → Get monthly summary (total fixed, paid, remaining, by category)
```

**A4. mark-paid Flow (critical — creates a REAL transaction):**
1. User clicks "Mark as Paid" on a fixed expense for current month
2. Backend creates a finance_transactions row: `{ account_id, wallet_id, category_id, type: 'expense', amount, description: "Fixed: <name> (<month>)", date: today }`
3. Backend creates/updates finance_fixed_expense_payments row: `{ fixed_expense_id, month: 'YYYY-MM', status: 'paid', transaction_id, paid_date: today }`
4. Backend deducts amount from wallet balance
5. Backend logs audit event
6. Frontend refreshes data

**A5. Detect Recurring Patterns:**
- Scan `finance_transactions` for expenses with same description/merchant appearing 3+ times in last 6 months
- Group by normalized description (lowercase, trim, remove dates/numbers)
- Suggest: "This looks like a fixed expense: 'Parking Lot' appears every month (~$45). Create fixed expense?"
- Return suggestions array: `[{ suggestedName, avgAmount, frequency, lastSeen, category }]`

**A6. UI — Fixed Expenses Tab:**
- New tab in FinancePage between "Subscriptions" and "Audit Log"
- Icon: `Receipt` from lucide-react
- Layout:
  - **Summary bar**: Total monthly fixed | Paid this month | Remaining | % of budget
  - **Month selector**: < Jul 2026 > with "Today" button
  - **Fixed expense cards**: Each shows name, amount, category badge, billing day, payment status
    - Green checkmark + "Paid" if status='paid' for selected month
    - Yellow clock + "Pending" if status='pending' and month is current/past
    - Gray skip + "Skipped" if status='skipped'
    - Red alert if overdue (past month, still pending)
  - **Quick pay button**: One-click "Mark Paid" on each card (with confirmation)
  - **Add fixed expense FAB**: Opens modal
  - **Empty state**: "No fixed expenses yet. Add your first one to track monthly costs."
  - **Detect patterns button**: Scans transactions and shows suggestions

**A7. FixedExpenseModal (similar to SubscriptionModal):**
- Fields: name, amount, currency, category (dropdown from existing categories), billing_day (1-28 selector), wallet (dropdown), description, auto_create_transaction toggle
- Reuses: GlassSurface, CurrencyInput, formatCurrency from existing finance components

---

### B. Budget System

**B1. DB Schema — `finance_budgets` table:**
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL (e.g., "Monthly Budget", "Food Budget", "Entertainment Limit")
- `type` TEXT NOT NULL ('total' | 'category') — total = overall limit, category = per-category limit
- `category_id` INTEGER (FK → finance_categories.id, NULL for type='total')
- `amount` REAL NOT NULL (budget limit amount)
- `currency` TEXT DEFAULT 'USD'
- `period` TEXT DEFAULT 'monthly' ('monthly' | 'weekly' | 'yearly')
- `alert_threshold` REAL DEFAULT 80 (percentage at which to warn, e.g., 80 = warn at 80%)
- `is_active` INTEGER DEFAULT 1
- `metadata` TEXT (JSON)
- `created_at` TEXT DEFAULT CURRENT_TIMESTAMP
- `updated_at` TEXT DEFAULT CURRENT_TIMESTAMP

**B2. IPC Endpoints to Create:**
```
budgets:list         → List all budgets with current period spending
budgets:create       → Create a new budget
budgets:update       → Update a budget
budgets:delete       → Delete a budget
budgets:get-status   → Get spending vs budget for current period (with warnings)
```

**B3. budgets:get-status Response Shape:**
```typescript
interface BudgetStatus {
  budgets: Array<{
    id: number;
    name: string;
    type: 'total' | 'category';
    limit: number;
    spent: number;
    remaining: number;
    percentage: number; // spent/limit * 100
    status: 'ok' | 'warning' | 'over'; // based on alert_threshold
    category?: { id: number; name: string; color: string };
  }>;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  overBudgetCount: number;
  warningCount: number;
}
```

**B4. Budget Spending Calculation:**
- For `type='total'`: Sum ALL expense transactions in the period (same as finance:get-summary totalExpense)
- For `type='category'`: Sum expense transactions WHERE category_id matches
- Period boundaries: monthly = 1st to last day of current month
- Exclude adjustments (is_adjustment=0) and follow-through (on_behalf_of=0) from spending

**B5. UI — Budget Tab:**
- New tab in FinancePage after "Charts"
- Icon: `Target` from lucide-react
- Layout:
  - **Overall budget card**: Large progress ring showing total spent vs total budget
    - Green < 60%, Yellow 60-80%, Orange 80-95%, Red > 95%
    - Shows: "Spent $X of $Y remaining $Z"
  - **Budget cards grid**: Each budget shows as a card with progress bar
    - Category color accent on left border
    - Progress bar: green → yellow → orange → red gradient
    - Status badge: OK / WARNING / OVER
    - Shows: category icon, name, spent/limit, days remaining in period
  - **Warnings panel**: If any budget is in warning or over, show alert banner at top
    - "⚠️ You've exceeded your Entertainment budget by $23.50"
    - "⚠️ Food budget is at 87% — $12.30 remaining"
  - **Add budget FAB**: Opens modal
  - **Period selector**: Synced with finance page period (Today/Week/Month/All)
  - **Empty state**: "No budgets set. Create your first budget to track spending limits."

**B6. BudgetModal:**
- Fields: name, type (total/category), category (if type=category, dropdown), amount, currency, period, alert_threshold (slider 50-100%)
- Shows preview: "You'll be warned when spending exceeds $X (80%)"

**B7. Warning System:**
- On every `finance:get-transactions` load, check budget status
- If any budget is at/above alert_threshold, store warning in state
- Show warning banner on both Budget tab AND Finance Overview tab
- Warning banner: glass surface, amber/red gradient, dismissible
- Include: budget name, percentage, amount over

---

### C. Integration with Existing Systems

**C1. OverviewTab Integration:**
- Add "Fixed Expenses" card to OverviewTab showing: total monthly fixed, paid, remaining
- Add "Budget Status" card showing: overall budget progress, warnings count
- Both cards link to their respective tabs

**C2. Dashboard Integration:**
- FinanceOverviewSection shows fixed expenses count alongside subscription count

**C3. Cash Flow Runway Integration:**
- `finance:get-cashflow-runway` (line 27349) already computes `committedMonthly` from subscriptions
- Extend to also include fixed expenses in committedMonthly calculation
- This makes runway more accurate: `totalMonthlyBurn = monthlyBurnRate + committedSubscriptions + committedFixedExpenses`

**C4. Subscription Intelligence Integration:**
- `finance:get-subscription-intelligence` computes burdenPercentage
- Extend to include fixed expenses in the burden calculation for a complete picture

---

### D. Anti-Slop Design Rules

Every component MUST follow:
1. **Glass pattern**: `bg-[rgba(24,24,27,0.80)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)]` with top-edge highlight
2. **Max rounded-xl, p-5 padding**
3. **Dark mode only** — no light mode variants
4. **Geist + JetBrains Mono fonts** — tabular-nums for all numbers
5. **Framer Motion** — all list items use `riseItem` stagger, tab switches use `tabPanel`
6. **Lucide icons only** — Receipt, Target, CheckCircle, AlertTriangle, Clock, Plus, ChevronLeft/Right
7. **Number masking** — respect `useNumberMask()` hook for privacy mode
8. **Currency formatting** — always use `formatCurrency()` from currency-data.ts

---

## Constraints

1. **Must work with existing finance encryption** — all new IPC handlers must check `financeDataKey` and encrypt/decrypt appropriately
2. **Must follow existing IPC pattern** — `ipcMain.handle` in main.ts, `ipcRenderer.invoke` in preload.ts
3. **Must follow existing DB migration pattern** — `PRAGMA user_version` increment, `ALTER TABLE ADD COLUMN` with try/catch
4. **Must preserve existing finance data** — no breaking changes to finance_transactions, finance_wallets, finance_categories
5. **Fixed expenses are NOT subscriptions** — subscriptions are services with renewal dates; fixed expenses are predictable costs with monthly payment tracking
6. **Transactions created by mark-paid must be real** — same as subscription payment transactions, with proper wallet deduction
7. **Budget warnings must be non-intrusive** — banners and badges, not blocking modals
8. **All new components go in `src/components/finance/` directory**
9. **Tab key type `FinanceTabKey` must be extended** to include 'fixed-expenses' and 'budget'
10. **Seed categories for fixed expenses**: add 'Fixed Expenses' category if not exists (similar to getSubCategoryId pattern)

---

## Output Format

Provide the specification as a structured document with:

1. **Database Schema** — exact CREATE TABLE + ALTER TABLE statements
2. **IPC Endpoint Specifications** — channel name, request payload, response shape, handler location
3. **Component Hierarchy** — which components to create/modify, props interfaces
4. **Interaction Flow** — step-by-step for: create expense, mark paid, detect pattern, create budget, check warning
5. **Data Processing Pipeline** — the math for: monthly summary, budget spending, burden calculation, runway extension
6. **High-Fidelity Visual Specs** — exact colors, spacing, typography, animation curves for each component
7. **Edge Cases** — what happens when: wallet deleted, category deleted, month boundary, encrypted data, concurrent edits
