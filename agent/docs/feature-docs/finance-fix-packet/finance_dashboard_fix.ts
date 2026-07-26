// ============================================================================
// FINANCE DASHBOARD FIX — src/main.ts
// ============================================================================
// Problem: Expense transaction amounts are permanently 0 (corrupted during 
// encryption migration). Wallet balances ARE correct.
// Solution: Derive expense totals from wallet balance changes instead of 
// corrupted transaction amounts.
// CONSTRAINTS: No DB changes, no modifying existing transaction amounts.
// ============================================================================

// ============================================================================
// HELPER: Compute derived expense per wallet from balance deltas
// ============================================================================
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

// ============================================================================
// FIX 1: finance:get-summary handler (around line 22337)
// ============================================================================
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

    // EXPENSE: Derive from wallet balance deltas (source of truth)
    const walletSpending = computeDerivedExpenseByWallet(db);
    const expense = Array.from(walletSpending.values()).reduce((sum, val) => sum + val, 0);

    // NET WORTH: Sum of all wallet balances
    const netWorthRow = db.prepare(`
      SELECT COALESCE(SUM(balance), 0) as total 
      FROM finance_wallets 
      WHERE is_archived = 0
    `).get() as { total: number };
    const netWorth = Number(netWorthRow.total);

    // NET FLOW: income - expense
    const netFlow = income - expense;

    // RECEIVABLES: Sum of positive income-type amounts
    const receivablesRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM finance_transactions 
      WHERE type = 'income' AND amount > 0
    `).get() as { total: number };
    const receivables = Number(receivablesRow.total);

    // PERSONAL vs FOLLOW-THROUGH expense breakdown
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

// ============================================================================
// FIX 2: finance:get-spending-by-category handler
// ============================================================================
ipcMain.handle('finance:get-spending-by-category', async () => {
  try {
    const db = getDb();
    const walletSpending = computeDerivedExpenseByWallet(db);

    // Get categories with expense transactions
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
        // Distribute derived wallet spending across categories proportionally
        const walletRows = db.prepare(`
          SELECT DISTINCT wallet_id 
          FROM finance_transactions 
          WHERE type = 'expense' AND category_id = ?
        `).all(row.category_id) as Array<{ wallet_id: number }>;

        for (const wr of walletRows) {
          const walletTotal = walletSpending.get(wr.wallet_id) || 0;
          const totalWalletExpenses = db.prepare(`
            SELECT COUNT(*) as count 
            FROM finance_transactions 
            WHERE type = 'expense' AND wallet_id = ?
          `).get(wr.wallet_id) as { count: number };

          const categoryInWallet = db.prepare(`
            SELECT COUNT(*) as count 
            FROM finance_transactions 
            WHERE type = 'expense' AND wallet_id = ? AND category_id = ?
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

// ============================================================================
// FIX 3: finance:get-monthly-trends handler
// ============================================================================
ipcMain.handle('finance:get-monthly-trends', async () => {
  try {
    const db = getDb();

    // Monthly income from transfers (correct data)
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

    // Months with expense transactions
    const expenseMonths = db.prepare(`
      SELECT DISTINCT strftime('%Y-%m', date) as month
      FROM finance_transactions
      WHERE type = 'expense'
      ORDER BY month DESC
      LIMIT 12
    `).all() as Array<{ month: string }>;

    // Derived total expense from wallet balances
    const walletSpending = computeDerivedExpenseByWallet(db);
    const totalDerivedExpense = Array.from(walletSpending.values()).reduce((a, b) => a + b, 0);

    const totalExpenseCount = db.prepare(`
      SELECT COUNT(*) as count FROM finance_transactions WHERE type = 'expense'
    `).get() as { count: number };
    const expenseCount = totalExpenseCount.count || 1;

    // Build monthly expense map
    const monthlyExpenseMap = new Map<string, number>();
    for (const em of expenseMonths) {
      const monthCountRow = db.prepare(`
        SELECT COUNT(*) as count 
        FROM finance_transactions 
        WHERE type = 'expense' AND strftime('%Y-%m', date) = ?
      `).get(em.month) as { count: number };

      const monthExpense = totalDerivedExpense * (monthCountRow.count / expenseCount);
      monthlyExpenseMap.set(em.month, monthExpense);
    }

    // Merge and sort
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

// ============================================================================
// FIX 4: finance:get-on-behalf-of-summary handler
// ============================================================================
ipcMain.handle('finance:get-on-behalf-of-summary', async () => {
  try {
    const db = getDb();
    const walletSpending = computeDerivedExpenseByWallet(db);

    // Get on-behalf-of transactions with wallet-level counts
    const oboTxns = db.prepare(`
      SELECT 
        t.id, 
        t.wallet_id, 
        t.on_behalf_of_label,
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
