# Finance Dashboard Fix — Implementation Guide

## Problem Summary

The finance dashboard shows **Income=0, Expense=0, Net Flow=0** and all charts are empty. 

**Root Cause:** Expense transaction amounts in the database are permanently `0` (corrupted during a previous encryption migration). Wallet balances **ARE correct** and serve as the source of truth.

**Constraints:**
- ❌ NO database changes allowed
- ❌ NO modifying existing transaction amounts
- ✅ Wallet balances are correct — use them as source of truth
- ✅ Transfer amounts are correct — use them for income calculation
- ✅ All IPC endpoint signatures must remain the same
- ✅ Frontend should not need changes

---

## Current Database State

### Wallets
| Wallet | ID | Initial Balance | Current Balance | Spending (derived) |
|--------|----|-----------------|-----------------|-------------------|
| BANK BCA | 3 | 4,570,663 | 3,314,403 | **1,256,260** |
| PINTU WALLET | 4 | 5,428,586.76 | 5,428,586.76 | 0 |
| TRUST WALLET | 5 | 0 | 0 | 0 |
| MAIN WALLET | 6 | 2,880,000 | -2,880,000 | **5,760,000** |
| OVO | 7 | 205,671 | 210,576 | 0 |

### Transactions (Expense amounts all = 0)
| # | Type | Amount | Wallet | Description |
|---|------|--------|--------|-------------|
| 1 | expense | 0 | BANK BCA | Pulsa XL |
| 2 | expense | 0 | BANK BCA | Taxi to Whoosh Station |
| 3 | transfer | -2,000,000 | BANK BCA | → PINTU |
| 4 | transfer | +2,000,000 | PINTU | ← BANK BCA |
| 11 | transfer | -2,050,000 | MAIN WALLET | → BANK BCA |
| 12 | transfer | +2,050,000 | BANK BCA | ← MAIN WALLET |
| 13 | expense | 0 | BANK BCA | Buat Kartu Debit |
| 14 | transfer | -100,000 | BANK BCA | → OVO |
| 15 | transfer | +100,000 | OVO | ← BANK BCA |
| 16 | expense | 0 | OVO | Wuwa Monthly |
| 17 | expense | 0 | OVO | Google Storage |
| 18 | expense | 0 | BANK BCA | Passport |

---

## Expected Results After Fix

| Metric | Value |
|--------|-------|
| **Income** | Rp 4,150,000 (from positive transfers) |
| **Expense** | Rp 7,016,260 (from wallet balance deltas) |
| **Net Flow** | Rp -2,866,260 |
| **Net Worth** | Rp 6,073,565.76 (sum of wallet balances) |
| **Receivables** | Rp 0 |

---

## Implementation Steps

### Step 1: Add Helper Function

Add this helper function **before** the IPC handlers in `src/main.ts`:

```typescript
function computeDerivedExpenseByWallet(db: DatabaseType): Map<number, number> {
  const wallets = db.prepare(`
    SELECT id, initial_balance, balance 
    FROM finance_wallets 
    WHERE is_archived = 0
  `).all() as Array<{ id: number; initial_balance: number; balance: number }>;

  const result = new Map<number, number>();
  for (const w of wallets) {
    const spending = Math.max(0, w.initial_balance - w.balance);
    result.set(w.id, spending);
  }
  return result;
}
```

### Step 2: Fix `finance:get-summary` (around line 22337)

Replace the handler with:

```typescript
ipcMain.handle('finance:get-summary', async () => {
  try {
    const db = getDb();

    // INCOME: Sum positive transfer amounts (these are correct)
    const incomeRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM finance_transactions 
      WHERE type = 'transfer' AND amount > 0
    `).get() as { total: number };
    const income = Number(incomeRow.total);

    // EXPENSE: Derive from wallet balance deltas
    const walletSpending = computeDerivedExpenseByWallet(db);
    const expense = Array.from(walletSpending.values()).reduce((sum, val) => sum + val, 0);

    // NET WORTH: Sum of all wallet balances
    const netWorthRow = db.prepare(`
      SELECT COALESCE(SUM(balance), 0) as total 
      FROM finance_wallets 
      WHERE is_archived = 0
    `).get() as { total: number };
    const netWorth = Number(netWorthRow.total);

    // NET FLOW
    const netFlow = income - expense;

    // RECEIVABLES
    const receivablesRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM finance_transactions 
      WHERE type = 'income' AND amount > 0
    `).get() as { total: number };
    const receivables = Number(receivablesRow.total);

    // PERSONAL vs FOLLOW-THROUGH
    const expenseTxns = db.prepare(`
      SELECT id, wallet_id, on_behalf_of 
      FROM finance_transactions 
      WHERE type = 'expense'
    `).all() as Array<{ id: number; wallet_id: number; on_behalf_of: number }>;

    let personalExpense = 0;
    let ftExpense = 0;

    for (const txn of expenseTxns) {
      const walletTotal = walletSpending.get(txn.wallet_id) || 0;
      const walletTxnCount = expenseTxns.filter(t => t.wallet_id === txn.wallet_id).length;
      const derivedAmount = walletTxnCount > 0 ? walletTotal / walletTxnCount : 0;

      if (txn.on_behalf_of === 1) {
        ftExpense += derivedAmount;
      } else {
        personalExpense += derivedAmount;
      }
    }

    return {
      success: true,
      data: {
        income,
        expense: Math.round(expense * 100) / 100,
        netFlow: Math.round(netFlow * 100) / 100,
        netWorth: Math.round(netWorth * 100) / 100,
        receivables: Math.round(receivables * 100) / 100,
        personalExpense: Math.round(personalExpense * 100) / 100,
        ftExpense: Math.round(ftExpense * 100) / 100,
      }
    };
  } catch (error) {
    console.error('Error in finance:get-summary:', error);
    return { success: false, error: String(error) };
  }
});
```

### Step 3: Fix `finance:get-spending-by-category`

Replace the handler with:

```typescript
ipcMain.handle('finance:get-spending-by-category', async () => {
  try {
    const db = getDb();
    const walletSpending = computeDerivedExpenseByWallet(db);

    const categoryRows = db.prepare(`
      SELECT 
        t.category_id,
        c.name as category_name,
        c.color as category_color,
        COUNT(t.id) as txn_count,
        SUM(CASE WHEN t.amount != 0 THEN ABS(t.amount) ELSE 0 END) as known_amount
      FROM finance_transactions t
      LEFT JOIN finance_categories c ON t.category_id = c.id
      WHERE t.type = 'expense'
      GROUP BY t.category_id
    `).all() as Array<{
      category_id: number; category_name: string; category_color: string;
      txn_count: number; known_amount: number;
    }>;

    const result = [];
    for (const row of categoryRows) {
      let amount = Number(row.known_amount);

      if (amount === 0) {
        const walletRows = db.prepare(`
          SELECT DISTINCT wallet_id 
          FROM finance_transactions 
          WHERE type = 'expense' AND category_id = ?
        `).all(row.category_id) as Array<{ wallet_id: number }>;

        for (const wr of walletRows) {
          const walletTotal = walletSpending.get(wr.wallet_id) || 0;
          const totalWalletExpenses = db.prepare(`
            SELECT COUNT(*) as count FROM finance_transactions WHERE type = 'expense' AND wallet_id = ?
          `).get(wr.wallet_id) as { count: number };

          const categoryInWallet = db.prepare(`
            SELECT COUNT(*) as count FROM finance_transactions WHERE type = 'expense' AND wallet_id = ? AND category_id = ?
          `).get(wr.wallet_id, row.category_id) as { count: number };

          const count = totalWalletExpenses.count || 1;
          amount += (walletTotal / count) * categoryInWallet.count;
        }
      }

      result.push({
        category_id: row.category_id,
        category_name: row.category_name || 'Uncategorized',
        category_color: row.category_color || '#888888',
        amount: Math.round(amount * 100) / 100,
        count: row.txn_count,
      });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error in finance:get-spending-by-category:', error);
    return { success: false, error: String(error) };
  }
});
```

### Step 4: Fix `finance:get-monthly-trends`

Replace the handler with:

```typescript
ipcMain.handle('finance:get-monthly-trends', async () => {
  try {
    const db = getDb();

    const monthlyIncomeRows = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        COALESCE(SUM(amount), 0) as total
      FROM finance_transactions
      WHERE type = 'transfer' AND amount > 0
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).all() as Array<{ month: string; total: number }>;

    const expenseMonths = db.prepare(`
      SELECT DISTINCT strftime('%Y-%m', date) as month
      FROM finance_transactions
      WHERE type = 'expense'
      ORDER BY month DESC
      LIMIT 12
    `).all() as Array<{ month: string }>;

    const walletSpending = computeDerivedExpenseByWallet(db);
    const totalDerivedExpense = Array.from(walletSpending.values()).reduce((a, b) => a + b, 0);

    const totalExpenseCount = db.prepare(`
      SELECT COUNT(*) as count FROM finance_transactions WHERE type = 'expense'
    `).get() as { count: number };
    const expenseCount = totalExpenseCount.count || 1;

    const monthlyExpenseMap = new Map<string, number>();
    for (const em of expenseMonths) {
      const monthCountRow = db.prepare(`
        SELECT COUNT(*) as count FROM finance_transactions 
        WHERE type = 'expense' AND strftime('%Y-%m', date) = ?
      `).get(em.month) as { count: number };

      const monthExpense = totalDerivedExpense * (monthCountRow.count / expenseCount);
      monthlyExpenseMap.set(em.month, monthExpense);
    }

    const allMonths = new Set<string>();
    monthlyIncomeRows.forEach(r => allMonths.add(r.month));
    expenseMonths.forEach(r => allMonths.add(r.month));

    const sortedMonths = Array.from(allMonths).sort().reverse();
    const result = [];

    for (const month of sortedMonths) {
      const incomeVal = monthlyIncomeRows.find(r => r.month === month)?.total || 0;
      const expenseVal = monthlyExpenseMap.get(month) || 0;
      result.push({
        month,
        income: Number(incomeVal),
        expense: Math.round(expenseVal * 100) / 100,
        net: Number(incomeVal) - expenseVal,
      });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error in finance:get-monthly-trends:', error);
    return { success: false, error: String(error) };
  }
});
```

### Step 5: Fix `finance:get-on-behalf-of-summary`

Replace the handler with:

```typescript
ipcMain.handle('finance:get-on-behalf-of-summary', async () => {
  try {
    const db = getDb();
    const walletSpending = computeDerivedExpenseByWallet(db);

    const oboTxns = db.prepare(`
      SELECT 
        t.id, t.wallet_id, t.on_behalf_of_label,
        (SELECT COUNT(*) FROM finance_transactions t2 WHERE t2.type = 'expense' AND t2.wallet_id = t.wallet_id) as wallet_txn_count
      FROM finance_transactions t
      WHERE t.type = 'expense' AND t.on_behalf_of = 1
    `).all() as Array<{
      id: number; wallet_id: number; on_behalf_of_label: string | null;
      wallet_txn_count: number;
    }>;

    const labelMap = new Map<string, number>();

    for (const txn of oboTxns) {
      const walletTotal = walletSpending.get(txn.wallet_id) || 0;
      const derivedAmount = txn.wallet_txn_count > 0 ? walletTotal / txn.wallet_txn_count : 0;
      const label = txn.on_behalf_of_label || 'Unknown';
      labelMap.set(label, (labelMap.get(label) || 0) + derivedAmount);
    }

    const result = [];
    for (const [label, amount] of labelMap) {
      result.push({ label, amount: Math.round(amount * 100) / 100 });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error in finance:get-on-behalf-of-summary:', error);
    return { success: false, error: String(error) };
  }
});
```

---

## Verification Checklist

After applying the fixes, verify:

- [ ] Dashboard shows **Income = Rp 4,150,000**
- [ ] Dashboard shows **Expense = Rp 7,016,260**
- [ ] Dashboard shows **Net Flow = Rp -2,866,260**
- [ ] Dashboard shows **Net Worth = Rp 6,073,565.76**
- [ ] Spending by category chart shows data (distributed proportionally)
- [ ] Monthly trends chart shows bars (distributed by transaction count per month)
- [ ] Recent transactions list shows all transactions
- [ ] No database modifications were made
- [ ] Frontend code unchanged

---

## How It Works

### Expense Derivation Logic

Since expense transaction amounts are all `0`, we derive spending from wallet balance changes:

```
wallet_spending = MAX(0, initial_balance - current_balance)
```

This works because:
- **BANK BCA**: Started with 4,570,663, now has 3,314,403 → spent 1,256,260
- **MAIN WALLET**: Started with 2,880,000, now has -2,880,000 → spent 5,760,000
- **OVO**: Started with 205,671, now has 210,576 → gained 4,905 (no spending)

### Income Logic

Transfer amounts are **not corrupted**, so we sum positive transfer legs directly:

```
Income = SUM(transfer.amount WHERE amount > 0)
       = 2,000,000 + 2,050,000 + 100,000
       = 4,150,000
```

### Distribution Logic

For per-transaction/per-category/per-month breakdowns, we distribute each wallet's total spending equally across its expense transactions:

```
per_transaction_amount = wallet_total_spending / expense_transaction_count
```

This is the best possible estimation given the corrupted data.
