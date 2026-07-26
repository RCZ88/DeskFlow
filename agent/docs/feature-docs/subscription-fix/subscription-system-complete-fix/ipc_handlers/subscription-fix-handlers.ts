// ============================================================================
// SUBSCRIPTION SYSTEM FIX — Complete Backend IPC Handlers
// src/main.ts — Replace existing subscription handlers with these
// ============================================================================

import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

// ============================================================================
// HELPER: Compute next renewal date from start_date + billing_cycle
// ============================================================================
function computeNextRenewal(startDate: string, billingCycle: string, interval: number = 1): string {
  const d = new Date(startDate);
  const day = d.getDate();

  switch (billingCycle) {
    case 'daily':
      d.setDate(d.getDate() + interval);
      break;
    case 'weekly':
      d.setDate(d.getDate() + (7 * interval));
      break;
    case 'monthly': {
      const nextMonth = d.getMonth() + interval;
      const nextYear = d.getFullYear() + Math.floor(nextMonth / 12);
      const monthMod = nextMonth % 12;
      const maxDay = new Date(nextYear, monthMod + 1, 0).getDate();
      d.setFullYear(nextYear, monthMod, Math.min(day, maxDay));
      break;
    }
    case 'quarterly': {
      const nextMonth = d.getMonth() + (3 * interval);
      const nextYear = d.getFullYear() + Math.floor(nextMonth / 12);
      const monthMod = nextMonth % 12;
      const maxDay = new Date(nextYear, monthMod + 1, 0).getDate();
      d.setFullYear(nextYear, monthMod, Math.min(day, maxDay));
      break;
    }
    case 'yearly': {
      d.setFullYear(d.getFullYear() + interval);
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, maxDay));
      break;
    }
    default:
      // Default to monthly
      const nextMonth = d.getMonth() + interval;
      const nextYear = d.getFullYear() + Math.floor(nextMonth / 12);
      const monthMod = nextMonth % 12;
      const maxDay = new Date(nextYear, monthMod + 1, 0).getDate();
      d.setFullYear(nextYear, monthMod, Math.min(day, maxDay));
  }

  return d.toISOString().slice(0, 10);
}

// ============================================================================
// HELPER: Get all billing dates from start_date to today
// ============================================================================
function getBillingDates(startDate: string, billingCycle: string, interval: number = 1): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Include today

  let current = new Date(start);
  const startDay = start.getDate();

  while (current <= today) {
    dates.push(current.toISOString().slice(0, 10));

    // Advance by interval
    switch (billingCycle) {
      case 'daily':
        current.setDate(current.getDate() + interval);
        break;
      case 'weekly':
        current.setDate(current.getDate() + (7 * interval));
        break;
      case 'monthly':
      case 'quarterly': {
        const monthsToAdd = billingCycle === 'quarterly' ? 3 * interval : interval;
        const nextMonth = current.getMonth() + monthsToAdd;
        const nextYear = current.getFullYear() + Math.floor(nextMonth / 12);
        const monthMod = nextMonth % 12;
        const maxDay = new Date(nextYear, monthMod + 1, 0).getDate();
        current = new Date(nextYear, monthMod, Math.min(startDay, maxDay));
        break;
      }
      case 'yearly': {
        current.setFullYear(current.getFullYear() + interval);
        const maxDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        current.setDate(Math.min(startDay, maxDay));
        break;
      }
      default: {
        const nextMonth = current.getMonth() + interval;
        const nextYear = current.getFullYear() + Math.floor(nextMonth / 12);
        const monthMod = nextMonth % 12;
        const maxDay = new Date(nextYear, monthMod + 1, 0).getDate();
        current = new Date(nextYear, monthMod, Math.min(startDay, maxDay));
      }
    }
  }

  return dates;
}

// ============================================================================
// HELPER: Check wallet balance (handles encryption)
// ============================================================================
function checkWalletBalance(db: Database.Database, walletId: number, requiredAmount: number): {
  sufficient: boolean;
  currentBalance: number;
  encrypted: boolean;
} {
  const wRow = db.prepare('SELECT balance FROM finance_wallets WHERE id = ?').get(walletId) as any;
  if (!wRow) return { sufficient: false, currentBalance: 0, encrypted: false };

  let balance: number;
  let encrypted = false;

  if (financeDataKey && isEncrypted(wRow.balance)) {
    balance = Number(decryptField(String(wRow.balance), financeDataKey)) || 0;
    encrypted = true;
  } else {
    balance = Number(wRow.balance) || 0;
  }

  return {
    sufficient: balance >= requiredAmount,
    currentBalance: balance,
    encrypted,
  };
}

// ============================================================================
// HELPER: Deduct from wallet (handles encryption)
// ============================================================================
function deductFromWallet(db: Database.Database, walletId: number, amount: number): boolean {
  const check = checkWalletBalance(db, walletId, amount);
  if (!check.sufficient) return false;

  const newBalance = check.currentBalance - amount;

  if (financeDataKey && check.encrypted) {
    db.prepare('UPDATE finance_wallets SET balance = ? WHERE id = ?')
      .run(encryptField(enc(newBalance), financeDataKey), walletId);
  } else {
    db.prepare('UPDATE finance_wallets SET balance = balance - ? WHERE id = ?')
      .run(amount, walletId);
  }

  return true;
}

// ============================================================================
// HELPER: Add to wallet (handles encryption) — for reversals
// ============================================================================
function addToWallet(db: Database.Database, walletId: number, amount: number): boolean {
  const wRow = db.prepare('SELECT balance FROM finance_wallets WHERE id = ?').get(walletId) as any;
  if (!wRow) return false;

  let balance: number;
  let encrypted = false;

  if (financeDataKey && isEncrypted(wRow.balance)) {
    balance = Number(decryptField(String(wRow.balance), financeDataKey)) || 0;
    encrypted = true;
  } else {
    balance = Number(wRow.balance) || 0;
  }

  const newBalance = balance + amount;

  if (financeDataKey && encrypted) {
    db.prepare('UPDATE finance_wallets SET balance = ? WHERE id = ?')
      .run(encryptField(enc(newBalance), financeDataKey), walletId);
  } else {
    db.prepare('UPDATE finance_wallets SET balance = balance + ? WHERE id = ?')
      .run(amount, walletId);
  }

  return true;
}

// ============================================================================
// HELPER: Resolve account_id from wallet or default
// ============================================================================
function resolveAccountId(db: Database.Database, walletId?: number): number | null {
  if (walletId) {
    const w = db.prepare('SELECT account_id FROM finance_wallets WHERE id = ?').get(walletId) as any;
    if (w?.account_id) return w.account_id;
  }
  const acct = db.prepare("SELECT id FROM finance_accounts WHERE type = 'personal' LIMIT 1").get() as any;
  return acct?.id || null;
}

// ============================================================================
// HELPER: Get or create subscription category
// ============================================================================
function getSubscriptionCategoryId(db: Database.Database): number {
  let cat = db.prepare("SELECT id FROM finance_categories WHERE name = 'Subscriptions' LIMIT 1").get() as any;
  if (cat) return cat.id;

  const result = db.prepare(`
    INSERT INTO finance_categories (name, type, color, icon)
    VALUES ('Subscriptions', 'expense', '#8b5cf6', 'repeat')
  `).run();
  return Number(result.lastInsertRowid);
}

// ============================================================================
// FIX 1: subscriptions:create — Handle old subscriptions with smart backfill
// ============================================================================
ipcMain.handle('subscriptions:create', async (_event, data: any) => {
  if (!db) return null;
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Ensure start_date is set
    const startDate = data.start_date || today;

    // Compute next_renewal_date if not provided
    const nextRenewal = data.next_renewal_date || computeNextRenewal(
      startDate, 
      data.billing_cycle || 'monthly', 
      data.billing_interval || 1
    );

    const result = db.prepare(`
      INSERT INTO finance_subscriptions 
      (wallet_id, name, description, price, currency, billing_cycle, billing_interval, 
       start_date, next_renewal_date, cancel_url, cancel_reminder_days, reminder_note, 
       status, category_id, payment_status, autodebet)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.wallet_id, data.name, data.description || '', data.price, data.currency || 'USD',
      data.billing_cycle || 'monthly', data.billing_interval || 1,
      startDate, nextRenewal,
      data.cancel_url || '', data.cancel_reminder_days ?? 7, data.reminder_note || '',
      data.status || 'active', data.category_id || null,
      'pending', data.autodebet ?? 1
    );

    const subId = Number(result.lastInsertRowid);

    // Resolve account_id
    const accountId = resolveAccountId(db, data.wallet_id);
    if (!accountId) {
      return { id: subId, ...data, start_date: startDate, next_renewal_date: nextRenewal };
    }

    const subCatId = getSubscriptionCategoryId(db);

    // Check if this is an OLD subscription (start_date is in the past)
    const isOldSubscription = new Date(startDate) < new Date(today);

    if (isOldSubscription) {
      // For old subscriptions, we DON'T auto-create transactions on creation
      // The user will use "Sync" to backfill, choosing between:
      // a) Individual transactions per month
      // b) One adjustment transaction for the total
      // We just mark it as ready for sync
      return { 
        id: subId, 
        ...data, 
        start_date: startDate, 
        next_renewal_date: nextRenewal,
        isOldSubscription: true,
        message: 'Subscription created. Use "Sync Payments" to backfill past months.',
      };
    }

    // For NEW subscriptions (start_date = today):
    // Check balance and create transaction for today
    let hasBalance = true;
    if (data.wallet_id && data.price > 0) {
      const check = checkWalletBalance(db, data.wallet_id, data.price);
      if (!check.sufficient) {
        hasBalance = false;
        db.prepare(`UPDATE finance_subscriptions SET payment_status = 'failed' WHERE id = ?`).run(subId);
      }
    }

    let txnId = null;
    if (hasBalance && data.wallet_id && data.price > 0) {
      // Create transaction for today
      const txnResult = db.prepare(`
        INSERT INTO finance_transactions 
        (account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, "date", "time", on_behalf_of, on_behalf_of_label)
        VALUES (?, ?, ?, 'expense', ?, 0, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        accountId, data.wallet_id || null, subCatId,
        data.price, data.name, data.name, 
        `Subscription: ${data.name} (${data.billing_cycle || 'monthly'})`,
        startDate, null, data.on_behalf_of ? 1 : 0, data.on_behalf_of_label || null
      );
      txnId = Number(txnResult.lastInsertRowid);

      // Deduct from wallet
      deductFromWallet(db, data.wallet_id, data.price);

      // Update subscription
      db.prepare(`
        UPDATE finance_subscriptions 
        SET payment_status = 'paid', last_payment_date = ?, last_payment_txn_id = ?
        WHERE id = ?
      `).run(startDate, txnId, subId);
    }

    return { 
      id: subId, 
      ...data, 
      start_date: startDate, 
      next_renewal_date: nextRenewal,
      hasBalance,
      txnId,
    };
  } catch (err) {
    console.error('[finance] create subscription error:', err);
    return null;
  }
});

// ============================================================================
// FIX 2: subscriptions:generate-due-transactions — Smart backfill with balance checks
// ============================================================================
ipcMain.handle('subscriptions:generate-due-transactions', async (_event, options?: { 
  subscriptionId?: number; 
  backfillMode?: 'individual' | 'adjustment';
}) => {
  if (!db) return { created: 0, failed: 0, subscriptions: [], errors: [] };

  try {
    const today = new Date().toISOString().slice(0, 10);
    const todayDate = new Date(today);
    todayDate.setHours(23, 59, 59, 999);

    const subCatId = getSubscriptionCategoryId(db);
    const created: any[] = [];
    const failed: any[] = [];
    const errors: string[] = [];

    // Build query
    let query = `
      SELECT * FROM finance_subscriptions
      WHERE status = 'active' AND (autodebet IS NULL OR autodebet = 1)
    `;
    const params: any[] = [];

    if (options?.subscriptionId) {
      query += ' AND id = ?';
      params.push(options.subscriptionId);
    }

    query += ' ORDER BY next_renewal_date ASC';

    const due = db.prepare(query).all(...params) as any[];

    for (const sub of due) {
      const accountId = resolveAccountId(db, sub.wallet_id);
      if (!accountId) {
        errors.push(`Subscription "${sub.name}": Could not resolve account_id`);
        continue;
      }

      const subDesc = `Subscription: ${sub.name} (${sub.billing_cycle || 'monthly'})`;

      // Get existing transactions for this subscription
      const existingTxns = db.prepare(`
        SELECT id, date, amount FROM finance_transactions
        WHERE description = ? AND type = 'expense'
        AND (account_id = ? OR (account_id IS NULL AND ? IS NULL))
        ORDER BY date ASC
      `).all(subDesc, accountId, accountId) as any[];

      const existingDates = new Set(existingTxns.map(t => t.date));
      const lastPaidDate = existingTxns.length > 0 
        ? existingTxns[existingTxns.length - 1].date 
        : null;

      // Get all billing dates from start_date to today
      const startDate = sub.start_date || sub.created_at?.slice(0, 10) || today;
      const allDates = getBillingDates(startDate, sub.billing_cycle || 'monthly', sub.billing_interval || 1);

      // Filter to only missing dates
      const missingDates = allDates.filter(d => !existingDates.has(d));

      if (missingDates.length === 0) {
        // All up to date — update next_renewal_date to next future date
        const nextRenewal = computeNextRenewal(startDate, sub.billing_cycle || 'monthly', sub.billing_interval || 1);
        // Actually, compute from the last date
        const lastDate = allDates[allDates.length - 1];
        const nextFromLast = computeNextRenewal(lastDate, sub.billing_cycle || 'monthly', sub.billing_interval || 1);
        db.prepare('UPDATE finance_subscriptions SET next_renewal_date = ?, payment_status = ? WHERE id = ?')
          .run(nextFromLast, 'paid', sub.id);
        continue;
      }

      // Determine backfill mode
      const isOldBackfill = missingDates.length > 1 && options?.backfillMode;

      if (isOldBackfill && options?.backfillMode === 'adjustment') {
        // ONE adjustment transaction for all missed months
        const totalAmount = sub.price * missingDates.length;
        const check = checkWalletBalance(db, sub.wallet_id, totalAmount);

        if (!check.sufficient) {
          db.prepare(`UPDATE finance_subscriptions SET payment_status = 'failed' WHERE id = ?`).run(sub.id);
          failed.push({
            subId: sub.id,
            name: sub.name,
            reason: 'insufficient_balance',
            needed: totalAmount,
            have: check.currentBalance,
          });
          errors.push(`"${sub.name}": Insufficient balance — need ${totalAmount}, have ${check.currentBalance}`);
          continue;
        }

        // Create ONE adjustment transaction
        const txnResult = db.prepare(`
          INSERT INTO finance_transactions 
          (account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, "date", "time", on_behalf_of, on_behalf_of_label)
          VALUES (?, ?, ?, 'expense', ?, 0, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          accountId, sub.wallet_id || null, subCatId,
          totalAmount, sub.name, sub.name,
          `Subscription: ${sub.name} (${sub.billing_cycle || 'monthly'})`,
          `Subscription adjustment: ${sub.name} (${missingDates.length} months: ${missingDates[0]} to ${missingDates[missingDates.length - 1]})`,
          missingDates[missingDates.length - 1], null, 0, null
        );

        const txnId = Number(txnResult.lastInsertRowid);
        deductFromWallet(db, sub.wallet_id, totalAmount);

        // Update subscription
        const nextRenewal = computeNextRenewal(
          missingDates[missingDates.length - 1],
          sub.billing_cycle || 'monthly',
          sub.billing_interval || 1
        );
        db.prepare(`
          UPDATE finance_subscriptions 
          SET next_renewal_date = ?, payment_status = 'paid', last_payment_date = ?, last_payment_txn_id = ?
          WHERE id = ?
        `).run(nextRenewal, missingDates[missingDates.length - 1], txnId, sub.id);

        created.push({
          subId: sub.id,
          txnId,
          name: sub.name,
          amount: totalAmount,
          date: missingDates[missingDates.length - 1],
          mode: 'adjustment',
          months: missingDates.length,
        });

      } else {
        // INDIVIDUAL transactions per month
        let failedDueToBalance = false;
        let lastTxnId = null;
        let lastTxnDate = null;

        for (const txnDate of missingDates) {
          if (failedDueToBalance) break;

          const check = checkWalletBalance(db, sub.wallet_id, sub.price);

          if (!check.sufficient) {
            failedDueToBalance = true;
            db.prepare(`UPDATE finance_subscriptions SET payment_status = 'failed' WHERE id = ?`).run(sub.id);
            failed.push({
              subId: sub.id,
              name: sub.name,
              date: txnDate,
              reason: 'insufficient_balance',
              needed: sub.price,
              have: check.currentBalance,
            });
            errors.push(`"${sub.name}" (${txnDate}): Insufficient balance — need ${sub.price}, have ${check.currentBalance}`);
            break;
          }

          // Create transaction
          const txnResult = db.prepare(`
            INSERT INTO finance_transactions 
            (account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, "date", "time", on_behalf_of, on_behalf_of_label)
            VALUES (?, ?, ?, 'expense', ?, 0, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            accountId, sub.wallet_id || null, subCatId,
            sub.price, sub.name, sub.name,
            subDesc,
            `Subscription: ${sub.name} (${sub.billing_cycle || 'monthly'})`,
            txnDate, null, 0, null
          );

          const txnId = Number(txnResult.lastInsertRowid);
          deductFromWallet(db, sub.wallet_id, sub.price);

          lastTxnId = txnId;
          lastTxnDate = txnDate;

          created.push({
            subId: sub.id,
            txnId,
            name: sub.name,
            amount: sub.price,
            date: txnDate,
            mode: 'individual',
          });
        }

        // Update subscription status
        if (lastTxnId && lastTxnDate) {
          const nextRenewal = computeNextRenewal(
            lastTxnDate,
            sub.billing_cycle || 'monthly',
            sub.billing_interval || 1
          );
          db.prepare(`
            UPDATE finance_subscriptions 
            SET next_renewal_date = ?, payment_status = ?, last_payment_date = ?, last_payment_txn_id = ?
            WHERE id = ?
          `).run(nextRenewal, failedDueToBalance ? 'failed' : 'paid', lastTxnDate, lastTxnId, sub.id);
        }
      }
    }

    return { 
      created: created.length, 
      failed: failed.length,
      subscriptions: created,
      failures: failed,
      errors,
      allUpToDate: created.length === 0 && failed.length === 0 && errors.length === 0,
    };
  } catch (err) {
    console.error('[finance] generate subscription transactions error:', err);
    return { created: 0, failed: 0, subscriptions: [], errors: [String(err)] };
  }
});

// ============================================================================
// FIX 3: subscriptions:record-payment — With date picker and duplicate check
// ============================================================================
ipcMain.handle('subscriptions:record-payment', async (_event, data: { 
  subscriptionId: number; 
  walletId?: number; 
  amount?: number; 
  date?: string;
  note?: string;
}) => {
  if (!db) return { success: false, error: 'Database not available' };

  try {
    const sub = db.prepare(`
      SELECT id, wallet_id, name, price, billing_cycle, billing_interval, start_date
      FROM finance_subscriptions WHERE id = ?
    `).get(data.subscriptionId) as any;

    if (!sub) return { success: false, error: 'Subscription not found' };

    const walletId = data.walletId || sub.wallet_id;
    const amount = data.amount || sub.price;
    const txnDate = data.date || new Date().toISOString().slice(0, 10);

    // Resolve account_id
    const accountId = resolveAccountId(db, walletId);
    if (!accountId) return { success: false, error: 'Could not resolve account' };

    const subCatId = getSubscriptionCategoryId(db);
    const subDesc = `Subscription: ${sub.name} (${sub.billing_cycle || 'monthly'})`;

    // Check if this month is already paid
    const existing = db.prepare(`
      SELECT id FROM finance_transactions
      WHERE description = ? AND type = 'expense' AND "date" = ?
      AND (account_id = ? OR (account_id IS NULL AND ? IS NULL))
    `).get(subDesc, txnDate, accountId, accountId) as any;

    if (existing) {
      return { 
        success: false, 
        error: `Payment for ${txnDate} already recorded`,
        alreadyPaid: true,
        txnId: existing.id,
      };
    }

    // Check balance
    const check = checkWalletBalance(db, walletId, amount);
    if (!check.sufficient) {
      db.prepare(`UPDATE finance_subscriptions SET payment_status = 'failed' WHERE id = ?`).run(sub.id);
      return { 
        success: false, 
        error: `Insufficient balance — need ${amount}, have ${check.currentBalance}`,
        insufficientBalance: true,
        needed: amount,
        have: check.currentBalance,
      };
    }

    // Create transaction
    const txnResult = db.prepare(`
      INSERT INTO finance_transactions 
      (account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, "date", "time", on_behalf_of, on_behalf_of_label)
      VALUES (?, ?, ?, 'expense', ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      accountId, walletId || null, subCatId,
      amount, sub.name, sub.name,
      subDesc,
      data.note || `Manual payment for ${sub.name}`,
      txnDate, null, 0, null
    );

    const txnId = Number(txnResult.lastInsertRowid);
    deductFromWallet(db, walletId, amount);

    // Update subscription
    const nextRenewal = computeNextRenewal(txnDate, sub.billing_cycle || 'monthly', sub.billing_interval || 1);
    db.prepare(`
      UPDATE finance_subscriptions 
      SET next_renewal_date = ?, payment_status = 'paid', last_payment_date = ?, last_payment_txn_id = ?
      WHERE id = ?
    `).run(nextRenewal, txnDate, txnId, sub.id);

    return { 
      success: true, 
      txnId,
      date: txnDate,
      amount,
      nextRenewal,
    };
  } catch (err) {
    console.error('[finance] record subscription payment error:', err);
    return { success: false, error: String(err) };
  }
});

// ============================================================================
// FIX 4: subscriptions:cancel-payment — NEW: Reverse a payment
// ============================================================================
ipcMain.handle('subscriptions:cancel-payment', async (_event, data: {
  subscriptionId: number;
  transactionId: number;
  reason?: string;
}) => {
  if (!db) return { success: false, error: 'Database not available' };

  try {
    const sub = db.prepare('SELECT * FROM finance_subscriptions WHERE id = ?').get(data.subscriptionId) as any;
    if (!sub) return { success: false, error: 'Subscription not found' };

    const txn = db.prepare('SELECT * FROM finance_transactions WHERE id = ?').get(data.transactionId) as any;
    if (!txn) return { success: false, error: 'Transaction not found' };

    // Verify this transaction belongs to this subscription
    const expectedDesc = `Subscription: ${sub.name} (${sub.billing_cycle || 'monthly'})`;
    if (txn.description !== expectedDesc && !txn.note?.includes(sub.name)) {
      return { success: false, error: 'Transaction does not match subscription' };
    }

    // Create reversal transaction (income to add back to wallet)
    const accountId = resolveAccountId(db, sub.wallet_id);
    const reversalAmount = Math.abs(Number(txn.amount));

    const reversalResult = db.prepare(`
      INSERT INTO finance_transactions 
      (account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, "date", "time", on_behalf_of, on_behalf_of_label)
      VALUES (?, ?, ?, 'income', ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      accountId, txn.wallet_id, txn.category_id,
      reversalAmount, sub.name, sub.name,
      `Reversal: ${txn.description}`,
      `Cancelled payment for ${sub.name} — ${data.reason || 'User cancelled'}`,
      new Date().toISOString().slice(0, 10), null, 0, null
    );

    const reversalId = Number(reversalResult.lastInsertRowid);

    // Add back to wallet
    addToWallet(db, txn.wallet_id, reversalAmount);

    // Update subscription status
    db.prepare(`
      UPDATE finance_subscriptions 
      SET payment_status = 'cancelled', last_payment_date = NULL, last_payment_txn_id = NULL
      WHERE id = ?
    `).run(sub.id);

    return { 
      success: true, 
      reversalId,
      originalTxnId: txn.id,
      amount: reversalAmount,
    };
  } catch (err) {
    console.error('[finance] cancel subscription payment error:', err);
    return { success: false, error: String(err) };
  }
});

// ============================================================================
// FIX 5: subscriptions:get-payment-history — NEW: Get all payments for a subscription
// ============================================================================
ipcMain.handle('subscriptions:get-payment-history', async (_event, subscriptionId: number) => {
  if (!db) return { success: false, error: 'Database not available' };

  try {
    const sub = db.prepare('SELECT * FROM finance_subscriptions WHERE id = ?').get(subscriptionId) as any;
    if (!sub) return { success: false, error: 'Subscription not found' };

    const subDesc = `Subscription: ${sub.name} (${sub.billing_cycle || 'monthly'})`;

    // Get all transactions for this subscription
    const transactions = db.prepare(`
      SELECT t.id, t.amount, t.date, t.type, t.note, t.created_at,
             w.name as wallet_name
      FROM finance_transactions t
      LEFT JOIN finance_wallets w ON t.wallet_id = w.id
      WHERE t.description = ? OR t.note LIKE ?
      ORDER BY t.date DESC, t.created_at DESC
    `).all(subDesc, `%${sub.name}%`) as any[];

    // Get all expected billing dates from start_date to 12 months ahead
    const startDate = sub.start_date || sub.created_at?.slice(0, 10);
    const allDates = getBillingDates(startDate, sub.billing_cycle || 'monthly', sub.billing_interval || 1);

    // Extend to 12 months ahead for future view
    const futureDates: string[] = [];
    let lastDate = new Date(allDates[allDates.length - 1] || startDate);
    for (let i = 0; i < 12; i++) {
      const nextDate = computeNextRenewal(
        lastDate.toISOString().slice(0, 10),
        sub.billing_cycle || 'monthly',
        sub.billing_interval || 1
      );
      futureDates.push(nextDate);
      lastDate = new Date(nextDate);
    }

    const allExpectedDates = [...allDates, ...futureDates];

    // Map each expected date to its status
    const paymentHistory = allExpectedDates.map(date => {
      const txn = transactions.find(t => t.date === date && t.type === 'expense');
      const reversal = transactions.find(t => t.date === date && t.type === 'income');

      if (reversal && !txn) {
        return { date, status: 'cancelled', amount: Math.abs(reversal.amount), txnId: reversal.id };
      }
      if (txn && reversal) {
        return { date, status: 'cancelled', amount: Math.abs(txn.amount), txnId: txn.id, reversalId: reversal.id };
      }
      if (txn) {
        return { date, status: 'paid', amount: Math.abs(txn.amount), txnId: txn.id };
      }
      if (new Date(date) > new Date()) {
        return { date, status: 'upcoming', amount: sub.price };
      }
      return { date, status: 'unpaid', amount: sub.price };
    });

    return {
      success: true,
      subscription: { id: sub.id, name: sub.name, price: sub.price },
      paymentHistory,
      transactions: transactions.map(t => ({
        id: t.id,
        date: t.date,
        amount: Math.abs(t.amount),
        type: t.type,
        wallet: t.wallet_name,
        note: t.note,
      })),
    };
  } catch (err) {
    console.error('[finance] get subscription payment history error:', err);
    return { success: false, error: String(err) };
  }
});

// ============================================================================
// FIX 6: subscriptions:retry-payment — With proper balance check and date
// ============================================================================
ipcMain.handle('subscriptions:retry-payment', async (_event, data: { 
  subscriptionId: number; 
  walletId?: number;
  date?: string;
}) => {
  if (!db) return { success: false, error: 'Database not available' };

  try {
    const sub = db.prepare(`
      SELECT id, wallet_id, name, price, billing_cycle, billing_interval, last_payment_date
      FROM finance_subscriptions WHERE id = ?
    `).get(data.subscriptionId) as any;

    if (!sub) return { success: false, error: 'Subscription not found' };
    if (sub.payment_status === 'paid' && !data.date) {
      return { success: false, error: 'Already paid for current period' };
    }

    const walletId = data.walletId || sub.wallet_id;
    const accountId = resolveAccountId(db, walletId);
    if (!accountId) return { success: false, error: 'Could not resolve account' };

    const subCatId = getSubscriptionCategoryId(db);

    // Determine which date to retry
    const retryDate = data.date || sub.last_payment_date || sub.start_date || new Date().toISOString().slice(0, 10);

    // Check balance
    const check = checkWalletBalance(db, walletId, sub.price);
    if (!check.sufficient) {
      return { 
        success: false, 
        error: `Insufficient balance — need ${sub.price}, have ${check.currentBalance}`,
        insufficientBalance: true,
        needed: sub.price,
        have: check.currentBalance,
      };
    }

    // Create transaction
    const subDesc = `Subscription: ${sub.name} (${sub.billing_cycle || 'monthly'})`;
    const txnResult = db.prepare(`
      INSERT INTO finance_transactions 
      (account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, "date", "time", on_behalf_of, on_behalf_of_label)
      VALUES (?, ?, ?, 'expense', ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      accountId, walletId || null, subCatId,
      sub.price, sub.name, sub.name,
      subDesc,
      `Retry payment for ${sub.name}`,
      retryDate, null, 0, null
    );

    const txnId = Number(txnResult.lastInsertRowid);
    deductFromWallet(db, walletId, sub.price);

    // Update subscription
    const nextRenewal = computeNextRenewal(retryDate, sub.billing_cycle || 'monthly', sub.billing_interval || 1);
    db.prepare(`
      UPDATE finance_subscriptions 
      SET next_renewal_date = ?, payment_status = 'paid', last_payment_date = ?, last_payment_txn_id = ?
      WHERE id = ?
    `).run(nextRenewal, retryDate, txnId, sub.id);

    return { 
      success: true, 
      txnId,
      date: retryDate,
      nextRenewal,
    };
  } catch (err) {
    console.error('[finance] retry subscription payment error:', err);
    return { success: false, error: String(err) };
  }
});

// ============================================================================
// FIX 7: subscriptions:update — Handle wallet change properly
// ============================================================================
ipcMain.handle('subscriptions:update', async (_event, data: any) => {
  if (!db) return null;
  try {
    const sub = db.prepare('SELECT * FROM finance_subscriptions WHERE id = ?').get(data.id) as any;
    if (!sub) return null;

    const oldWalletId = sub.wallet_id;
    const newWalletId = data.wallet_id;

    // If wallet changed and "moveLastPayment" is true, move the most recent transaction
    if (newWalletId && oldWalletId !== newWalletId && data.moveLastPayment) {
      const lastTxn = db.prepare(`
        SELECT id, wallet_id, amount FROM finance_transactions
        WHERE description LIKE ? AND type = 'expense'
        ORDER BY date DESC, created_at DESC
        LIMIT 1
      `).get(`Subscription: ${sub.name}%`) as any;

      if (lastTxn) {
        // Update transaction wallet
        db.prepare('UPDATE finance_transactions SET wallet_id = ? WHERE id = ?')
          .run(newWalletId, lastTxn.id);

        // Reverse from old wallet
        addToWallet(db, oldWalletId, Math.abs(lastTxn.amount));
        // Deduct from new wallet
        deductFromWallet(db, newWalletId, Math.abs(lastTxn.amount));
      }
    }

    // Update subscription
    db.prepare(`
      UPDATE finance_subscriptions 
      SET wallet_id = ?, name = ?, description = ?, price = ?, currency = ?,
          billing_cycle = ?, billing_interval = ?, start_date = ?, next_renewal_date = ?,
          cancel_url = ?, cancel_reminder_days = ?, reminder_note = ?, status = ?,
          category_id = ?, autodebet = ?, updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      data.wallet_id, data.name, data.description || '', data.price, data.currency || 'USD',
      data.billing_cycle || 'monthly', data.billing_interval || 1,
      data.start_date || sub.start_date, data.next_renewal_date || sub.next_renewal_date,
      data.cancel_url || '', data.cancel_reminder_days ?? 7, data.reminder_note || '',
      data.status || 'active', data.category_id || null, data.autodebet ?? sub.autodebet,
      data.id
    );

    return { id: data.id, ...data };
  } catch (err) {
    console.error('[finance] update subscription error:', err);
    return null;
  }
});
