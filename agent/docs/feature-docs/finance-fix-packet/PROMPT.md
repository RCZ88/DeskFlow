# Finance Dashboard — Critical Fix Packet

## Raw Request

"the dashboard of the finance page shows everything as 0. nothing is loading properly. fix the dashboard so all data shows correctly."

## Context Bundle

Read `agent/docs/finance-fix-packet/CONTEXT_BUNDLE.md` for all source code, DB state, and data structures.

## Problem Statement

The finance dashboard shows Income=0, Expense=0, Net Flow=0, and all charts show empty data. The root cause is that expense transaction amounts in the database are permanently 0 (corrupted during a previous encryption migration). Wallet balances ARE correct.

## Current DB State (NO DB CHANGES ALLOWED)

```
Wallets:
  BANK BCA       balance=3314403    initial=4570663
  PINTU WALLET   balance=5428586.76 initial=5428586.76
  MAIN WALLET    balance=-2880000   initial=2880000
  OVO            balance=210576     initial=205671

Transactions:
  #1  expense amt=0    desc="Pulsa XL"
  #2  expense amt=0    desc="Taxi to Whoosh Station"
  #3  transfer amt=-2000000  (BANK BCA → PINTU)
  #4  transfer amt=2000000   (BANK BCA → PINTU)
  #11 transfer amt=-2050000  (MAIN WALLET → BANK BCA)
  #12 transfer amt=2050000   (MAIN WALLET → BANK BCA)
  #13 expense amt=0    desc="Buat Kartu Debit"
  #14 transfer amt=-100000   (BANK BCA → OVO)
  #15 transfer amt=100000    (BANK BCA → OVO)
  #16 expense amt=0    desc="Wuwa Monthly"
  #17 expense amt=0    desc="Google Storage"
  #18 expense amt=0    desc="Passport"

Account: CZ balance=2594979
```

## Bugs to Fix

### Bug 1: Dashboard summary shows 0

**File:** `src/main.ts` — `finance:get-summary` handler

The handler does `SUM(amount)` on transactions. Since expense amounts are 0, totalExpense=0.

**Fix:** Compute expense totals from wallet balance changes:
- For each non-custodial account: `netWorth = SUM(wallet.balance)` across its wallets
- For expense: use `wallet.initial_balance - wallet.balance` per wallet to derive actual spending (only when the difference is positive, meaning spending occurred)
- For income: sum positive transfer amounts (which ARE correct)
- For netFlow: use the monthly trends data (which comes from `get-monthly-trends`)

### Bug 2: Spending by category shows 0

**File:** `src/main.ts` — `finance:get-spending-by-category` handler

The handler does `SUM(ABS(amount))` grouped by category. Since amounts are 0, all categories show 0.

**Fix:** For expenses with amount=0, distribute the wallet's spending across categories proportionally based on the number of transactions per category. Or compute from `wallet.initial_balance - wallet.balance` and attribute to the wallet's primary expense category.

### Bug 3: Monthly trends shows 0

**File:** `src/main.ts` — `finance:get-monthly-trends` handler

The handler does `SUM(amount)` grouped by month. Since amounts are 0, monthly income/expense/net are 0.

**Fix:** For months with only expense transactions (amount=0), estimate the expense from wallet balance changes during that month. Use the wallet's balance history (if available) or distribute the total wallet spending evenly across months with transactions.

### Bug 4: On-behalf-of summary shows 0

**File:** `src/main.ts` — `finance:get-on-behalf-of-summary` handler

Same issue — sums corrupted amounts.

**Fix:** If on_behalf_of expenses have amount=0, return 0 (we can't reconstruct per-person breakdowns without amounts). But the main dashboard summary should still work.

## Engineering Tasks

### Task A: Fix `finance:get-summary`

Replace the SQL SUM approach with wallet-balance-based computation:

```typescript
// Instead of:
const income = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM finance_transactions WHERE type='income'").get();
const expense = db.prepare("SELECT COALESCE(ABS(SUM(amount)),0) as total FROM finance_transactions WHERE type='expense'").get();

// Do:
// 1. Sum all wallet balances for net worth
// 2. Compute total spending = SUM(wallet.initial_balance - wallet.balance) for wallets where initial > balance
// 3. Compute income from transfer amounts (which are correct)
```

### Task B: Fix `finance:get-spending-by-category`

For categories where transaction amounts are 0, distribute the wallet's total spending across its transactions proportionally by count.

### Task C: Fix `finance:get-monthly-trends`

For months with corrupted amounts, estimate from wallet balance deltas.

## Constraints

- **NO database changes**
- **NO modifying existing transaction amounts**
- Wallet balances are CORRECT — use them as source of truth
- Transfer amounts are CORRECT — use them for income calculation
- All IPC endpoint signatures must remain the same
- The frontend should not need changes — just the backend handlers

## Verification

After fixes:
1. Dashboard shows non-zero Income, Expense, Net Flow
2. Spending by category chart shows data
3. Monthly trends chart shows bars
4. Net worth displays correctly from wallet balances
5. Recent transactions list shows all transactions (even with amount=0)
