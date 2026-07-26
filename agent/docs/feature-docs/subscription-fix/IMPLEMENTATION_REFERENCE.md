# Subscription System — Complete Implementation Reference

## 1. CURRENT IPC HANDLERS

### A. `subscriptions:create` (main.ts:23570)

**next_renewal_date**: Set by frontend modal via `computeNextRenewal(start_date, billing_cycle, interval)`. Backend just stores `data.next_renewal_date`.

**Creates transaction**: YES, if `hasBalance` is true. Uses `data.start_date || today` as date.

**Description format**: `Subscription: ${data.name} (${data.billing_cycle || 'monthly'})`

**Balance check**: Queries `finance_wallets.balance`, decrypts if needed, compares with `data.price`. If insufficient, sets `payment_status = 'failed'` and skips transaction.

```typescript
electron_1.ipcMain.handle('subscriptions:create', async (_event, data: any) => {
  if (!db) return null;
  try {
    const result = db.prepare(`
      INSERT INTO finance_subscriptions (wallet_id, name, description, price, currency, billing_cycle, billing_interval, start_date, next_renewal_date, cancel_url, cancel_reminder_days, reminder_note, status, category_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.wallet_id, data.name, data.description || '', data.price, data.currency || 'USD',
      data.billing_cycle || 'monthly', data.billing_interval || 1,
      data.start_date || null, data.next_renewal_date || null,
      data.cancel_url || '', data.cancel_reminder_days ?? 7, data.reminder_note || '',
      data.status || 'active', data.category_id || null
    );
    const subId = Number(result.lastInsertRowid);
    const today = new Date().toISOString().slice(0, 10);

    // Resolve account_id from wallet
    let accountId = null;
    if (data.wallet_id) {
      const w = db.prepare('SELECT account_id FROM finance_wallets WHERE id = ?').get(data.wallet_id) as any;
      accountId = w?.account_id || null;
    }
    if (!accountId) {
      const acct = db.prepare("SELECT id FROM finance_accounts WHERE type = 'personal' LIMIT 1").get() as any;
      accountId = acct?.id;
    }
    if (!accountId) {
      return { id: subId, ...data };
    }

    // Check wallet balance
    let hasBalance = true;
    if (data.wallet_id && data.price > 0) {
      const wRow = db.prepare('SELECT balance FROM finance_wallets WHERE id = ?').get(data.wallet_id) as any;
      const walletBal = wRow && financeDataKey && isEncrypted(wRow.balance)
        ? Number(decryptField(String(wRow.balance), financeDataKey)) || 0
        : Number(wRow?.balance) || 0;
      if (walletBal < data.price) {
        hasBalance = false;
        db.prepare(`UPDATE finance_subscriptions SET payment_status = 'failed' WHERE id = ?`).run(subId);
      }
    }

    // Create transaction if balance sufficient
    let txnId = null;
    if (hasBalance) {
      const txnResult = db.prepare(`
        INSERT INTO finance_transactions (account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, "date", "time", on_behalf_of, on_behalf_of_label)
        VALUES (?, ?, ?, 'expense', ?, 0, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        accountId, data.wallet_id || null, subCatId,
        data.price, data.name, data.name, `Subscription: ${data.name} (${data.billing_cycle || 'monthly'})`,
        data.start_date || today, null, data.on_behalf_of ? 1 : 0, data.on_behalf_of_label || null
      );
      txnId = Number(txnResult.lastInsertRowid);
      // Deduct from wallet...
    }
    return { id: subId, ...data, hasBalance };
  } catch (err) {
    console.error('[finance] create subscription error:', err);
    return null;
  }
});
```

### B. `subscriptions:generate-due-transactions` (main.ts:23713)

**Date calculation**: `startDay = startDate.getDate()`, then `checkDate = new Date(year, month, startDay)` — preserves day-of-month. Advances by `interval` months each iteration.

**While loop**: `while (checkDate <= todayDate)` — creates one transaction per missed month.

**Duplicate check**: Queries `finance_transactions WHERE description = ? AND type = 'expense' AND (account_id = ? OR (account_id IS NULL AND ? IS NULL))`. Uses `Set` of existing dates.

**Description format**: `Subscription: ${sub.name} (${sub.billing_cycle || 'monthly'})` — matches create handler.

```typescript
electron_1.ipcMain.handle('subscriptions:generate-due-transactions', async () => {
  if (!db) return { created: 0, subscriptions: [] };
  try {
    const today = new Date().toISOString().slice(0, 10);
    const due = db.prepare(`
      SELECT * FROM finance_subscriptions
      WHERE status = 'active' AND (autodebet IS NULL OR autodebet = 1)
      ORDER BY next_renewal_date ASC
    `).all(today) as any[];
    const created: { subId: number; txnId: number; name: string; amount: number; date: string }[] = [];

    for (const sub of due) {
      // Resolve account_id...
      // Resolve category...

      const startDate = sub.start_date ? new Date(sub.start_date) : new Date();
      const todayDate = new Date(today);
      const interval = sub.billing_interval || 1;

      // Duplicate check with NULL-safe query
      const subDesc = `Subscription: ${sub.name} (${sub.billing_cycle || 'monthly'})`;
      const existingTxns = db.prepare(`
        SELECT id, date FROM finance_transactions
        WHERE description = ? AND type = 'expense'
        AND (account_id = ? OR (account_id IS NULL AND ? IS NULL))
      `).all(subDesc, accountId, accountId) as any[];
      const existingDates = new Set(existingTxns.map(t => t.date));

      // Clean up duplicates...

      // Generate dates from start_date to today
      const startDay = startDate.getDate();
      let checkDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDay);
      let failedDueToBalance = false;

      while (checkDate <= todayDate) {
        const txnDate = checkDate.toISOString().slice(0, 10);
        if (!existingDates.has(txnDate) && !failedDueToBalance) {
          // Check balance...
          // Create transaction with txnDate...
          // Deduct from wallet...
        }
        // Advance to next cycle preserving day-of-month
        const nextMonth = checkDate.getMonth() + interval;
        const nextYear = checkDate.getFullYear() + Math.floor(nextMonth / 12);
        const nextMonthMod = nextMonth % 12;
        const maxDay = new Date(nextYear, nextMonthMod + 1, 0).getDate();
        checkDate = new Date(nextYear, nextMonthMod, Math.min(startDay, maxDay));
      }

      // Update next_renewal_date to first future date...
    }
    return { created: created.length, subscriptions: created };
  } catch (err) {
    console.error('[finance] generate subscription transactions error:', err);
    return { created: 0, subscriptions: [] };
  }
});
```

### C. `subscriptions:record-payment` (main.ts:24026)

**Date**: Uses `data.date || today` — has a date parameter.

**Does NOT update next_renewal_date** — only sets `payment_status = 'paid'` and `last_payment_date`.

```typescript
electron_1.ipcMain.handle('subscriptions:record-payment', async (_event, data: { subscriptionId: number; walletId?: number; amount?: number; date?: string }) => {
  if (!db) return { success: false };
  try {
    const sub = db.prepare('SELECT id, wallet_id, name, price, billing_cycle FROM finance_subscriptions WHERE id = ?').get(data.subscriptionId) as any;
    if (!sub) return { success: false, error: 'Subscription not found' };

    const walletId = data.walletId || sub.wallet_id;
    const amount = data.amount || sub.price;
    const txnDate = data.date || new Date().toISOString().slice(0, 10);

    // Resolve account_id...
    // Resolve category...
    // Check balance...

    const txnResult = db.prepare(`
      INSERT INTO finance_transactions (account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, "date", "time", on_behalf_of, on_behalf_of_label)
      VALUES (?, ?, ?, 'expense', ?, 0, ?, ?, ?, ?, ?, 0, NULL)
    `).run(accountId, walletId || null, subCatId, amount, sub.name, sub.name,
      `Subscription: ${sub.name} (${sub.billing_cycle})`, txnDate, null);
    const txnId = Number(txnResult.lastInsertRowid);

    // Deduct from wallet...
    // Update subscription: payment_status = 'paid', last_payment_date = txnDate
    return { success: true, txnId };
  } catch (err) {
    console.error('[finance] record subscription payment error:', err);
    return { success: false, error: String(err) };
  }
});
```

### D. `subscriptions:toggle-autodebet` (main.ts:24014)

**Toggles**: `autodebet` column (0 or 1). Does NOT trigger any payment processing.

```typescript
electron_1.ipcMain.handle('subscriptions:toggle-autodebet', async (_event, id: number) => {
  if (!db) return { success: false };
  try {
    const sub = db.prepare('SELECT id, autodebet FROM finance_subscriptions WHERE id = ?').get(id) as any;
    if (!sub) return { success: false };
    const newVal = sub.autodebet ? 0 : 1;
    db.prepare('UPDATE finance_subscriptions SET autodebet = ? WHERE id = ?').run(newVal, id);
    return { success: true, autodebet: newVal };
  } catch { return { success: false }; }
});
```

### E. `subscriptions:retry-payment` (main.ts:24939)

**Retries**: Creates a new transaction from a (potentially different) wallet. Checks balance first. Uses `today` as date.

```typescript
electron_1.ipcMain.handle('subscriptions:retry-payment', async (_event, data: { subscriptionId: number; walletId?: number }) => {
  if (!db) return { success: false };
  try {
    const sub = db.prepare('SELECT id, wallet_id, name, price, billing_cycle, payment_status FROM finance_subscriptions WHERE id = ?').get(data.subscriptionId) as any;
    if (!sub) return { success: false, error: 'Subscription not found' };
    if (sub.payment_status === 'paid') return { success: false, error: 'Already paid for this period' };

    const walletId = data.walletId || sub.wallet_id;
    // Resolve account_id...
    // Check balance...
    // Create transaction with today's date...
    // Deduct from wallet...
    // Update subscription: payment_status = 'paid'
    return { success: true, txnId };
  } catch (err) {
    console.error('[finance] retry subscription payment error:', err);
    return { success: false, error: String(err) };
  }
});
```

### F. `finance:create-transaction` (main.ts:22940)

**Balance update**: `balance += balanceDelta` where:
- Expense: `balanceDelta = safeAmount - fee` (negative - fee = more negative)
- Income: `balanceDelta = safeAmount - fee` (positive - fee)
- Transfer: `balanceDelta = safeAmount`

**Sign convention**: Expenses are negative, income is positive.

**Encryption**: Yes, uses `encryptField`/`decryptField` with AES-256-GCM when `financeDataKey` is set.

```typescript
electron_1.ipcMain.handle('finance:create-transaction', async (_event, data: any) => {
  if (!db) return null;
  try {
    const fee = Math.abs(Number(data.fee) || 0);
    const merchant = data.merchant || null;

    const safeAmount = data.type === 'expense'
      ? -Math.abs(data.amount)
      : data.type === 'income'
        ? Math.abs(data.amount)
        : data.amount;

    const balanceDelta = data.type === 'expense'
      ? safeAmount - fee
      : data.type === 'income'
        ? safeAmount - fee
        : safeAmount;

    const stmt = db.prepare(`
      INSERT INTO finance_transactions (account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, "date", "time", on_behalf_of, on_behalf_of_label)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const encAmount = financeDataKey ? encryptField(enc(safeAmount), financeDataKey) : String(safeAmount);
    const encDesc = financeDataKey && data.description ? encryptField(data.description, financeDataKey) : (data.description || null);
    const encNote = financeDataKey && data.note ? encryptField(data.note, financeDataKey) : (data.note || null);
    const result = stmt.run(
      data.account_id, data.wallet_id || null, data.category_id,
      data.type, encAmount, fee, merchant, encDesc, encNote,
      data.date, data.time || null, data.on_behalf_of ? 1 : 0, data.on_behalf_of_label || null
    );
    const newId = Number(result.lastInsertRowid);

    if (financeDataKey) {
      const acctRow = db.prepare('SELECT balance FROM finance_accounts WHERE id = ?').get(data.account_id) as any;
      const curBal = acctRow && isEncrypted(acctRow.balance) ? Number(decryptField(String(acctRow.balance), financeDataKey)) || 0 : Number(acctRow?.balance) || 0;
      const newBal = curBal + balanceDelta;
      db.prepare('UPDATE finance_accounts SET balance = ? WHERE id = ?').run(encryptField(enc(newBal), financeDataKey), data.account_id);
      if (data.wallet_id) {
        const wRow = db.prepare('SELECT balance FROM finance_wallets WHERE id = ?').get(data.wallet_id) as any;
        const wBal = wRow && isEncrypted(wRow.balance) ? Number(decryptField(String(wRow.balance), financeDataKey)) || 0 : Number(wRow?.balance) || 0;
        db.prepare('UPDATE finance_wallets SET balance = ? WHERE id = ?').run(encryptField(enc(wBal + balanceDelta), financeDataKey), data.wallet_id);
      }
    } else {
      db.prepare('UPDATE finance_accounts SET balance = balance + ? WHERE id = ?').run(balanceDelta, data.account_id);
      if (data.wallet_id) {
        db.prepare('UPDATE finance_wallets SET balance = balance + ? WHERE id = ?').run(balanceDelta, data.wallet_id);
      }
    }
    return { id: newId, ...data };
  } catch (error: any) {
    console.error('[finance] create transaction error:', error);
    return null;
  }
});
```

---

## 2. DATABASE SCHEMA

### `finance_subscriptions` (with migrations)

```sql
CREATE TABLE IF NOT EXISTS finance_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER NOT NULL REFERENCES finance_wallets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  billing_interval INTEGER DEFAULT 1,
  start_date TEXT,
  next_renewal_date TEXT,
  cancel_url TEXT DEFAULT '',
  cancel_reminder_days INTEGER DEFAULT 7,
  reminder_note TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  category_id INTEGER,
  payment_status TEXT DEFAULT 'pending',  -- added via ALTER
  last_payment_date TEXT,                 -- added via ALTER
  last_payment_txn_id INTEGER,            -- added via ALTER
  autodebet INTEGER DEFAULT 1,            -- added via ALTER
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);
```

### `finance_transactions` (with migrations)

```sql
CREATE TABLE IF NOT EXISTS finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  wallet_id INTEGER,
  category_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
  amount REAL NOT NULL,
  fee REAL DEFAULT 0,           -- added via ALTER
  merchant TEXT,                -- added via ALTER
  description TEXT,
  note TEXT,
  date TEXT NOT NULL,
  time TEXT,
  is_recurring INTEGER DEFAULT 0,
  recurring_interval TEXT,
  tags TEXT,
  transfer_id TEXT,
  from_wallet_id INTEGER,
  to_wallet_id INTEGER,
  on_behalf_of INTEGER DEFAULT 0,
  on_behalf_of_label TEXT,
  ft_person_id INTEGER,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (account_id) REFERENCES finance_accounts(id),
  FOREIGN KEY (wallet_id) REFERENCES finance_wallets(id),
  FOREIGN KEY (category_id) REFERENCES finance_categories(id)
);
```

### Indexes

```sql
-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_finance_sub_wallet ON finance_subscriptions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_finance_sub_status ON finance_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_finance_sub_renewal ON finance_subscriptions(next_renewal_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_renewal ON finance_subscriptions(status, next_renewal_date);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_finance_txn_transfer_id ON finance_transactions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_finance_txn_account ON finance_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_txn_date ON finance_transactions(date);
CREATE INDEX IF NOT EXISTS idx_finance_txn_category ON finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_finance_txn_type ON finance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date ON finance_transactions(wallet_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON finance_transactions(type, date);
```

**No triggers on these tables.**

---

## 3. ENCRYPTION

- `financeDataKey` is a `Buffer` derived from user password via `crypto.scryptSync(password, salt, 32)`
- Set on unlock: `financeDataKey = deriveFinanceDataKey(password, financePasswordSalt)`
- Cleared on lock: `financeDataKey = null`
- `encryptField(value, key)`: AES-256-GCM, returns `enc:v1:${JSON.stringify({iv, at, d})}`
- `decryptField(value, key)`: Reverses encryption
- `isEncrypted(value)`: Checks if string starts with `enc:v1:`

---

## 4. DATA FLOW

### A. Creating subscription:
1. Frontend calls `subscriptionsCreate(data)` with `start_date`, `next_renewal_date`, `wallet_id`, `price`
2. Backend inserts into `finance_subscriptions`
3. Backend checks wallet balance
4. If balance sufficient: creates expense transaction with `date = data.start_date || today`, deducts from wallet
5. If balance insufficient: sets `payment_status = 'failed'`, no transaction created

### B. Sync Payments:
1. Frontend calls `subscriptionsGenerateDueTransactions()`
2. Backend queries ALL active subscriptions with `autodebet = 1` (no date filter!)
3. For each subscription:
   - Finds existing transactions by description match
   - Cleans up duplicates (same date, same subscription)
   - Generates dates from `start_date` to today, preserving day-of-month
   - For each missing date: checks balance, creates transaction, deducts from wallet
   - Updates `next_renewal_date` to first future date

### C. Record Payment:
1. Frontend calls `subscriptionsRecordPayment({subscriptionId, walletId, amount, date})`
2. Backend creates transaction with `date = data.date || today`
3. Deducts from wallet
4. Sets `payment_status = 'paid'`

### D. Autodebet:
- `autodebet` is just a flag (0/1)
- `generate-due-transactions` only processes subscriptions where `autodebet = 1`
- No cron job or scheduler — triggered manually by "Sync Payments" button or on finance page load

---

## 5. KNOWN BUGS

1. **Dates show today**: When `start_date` is null, both create and generate-due use `new Date()` (today)
2. **Duplicate transactions**: Create handler and generate-due both create for same date when start_date = today
3. **No balance check in generate-due**: Was missing, now added but may have edge cases
4. **Payment history not shown**: SubscriptionsTab shows "X payments" count but not the actual dates
5. **Manual payment no date picker**: Uses today's date, no way to select past month
6. **`finance:get-wallet` doesn't decrypt balance**: Potential bug if encryption is enabled
7. **`finance:get-wallet` doesn't decrypt**: Returns raw encrypted balance

---

## 6. DESIRED WORKFLOW

### A. Adding new subscription (starting today):
- Create subscription with start_date = today
- Create ONE transaction for today
- Set next_renewal_date = today + 1 billing cycle
- Deduct from wallet immediately

### B. Adding old subscription (started 6 months ago):
- Create subscription with start_date = 6 months ago
- Sync should backfill 6 transactions (one per month)
- Each transaction has its actual billing date (not today)
- Deduct from wallet for each

### C. Monthly auto-debit:
- "Sync Payments" button triggers `generate-due-transactions`
- Creates transactions for all missed months
- Checks balance before each deduction
- If insufficient: marks as 'failed', stops creating more

### D. Manual payment:
- User picks a specific date (which month they're paying for)
- Creates transaction with that date
- If month already paid: show error
- If wallet changed: use new wallet

### E. Changing wallet:
- Future payments use new wallet
- Past transactions stay on old wallet (unless "Move last payment" is checked)

### F. Canceling/reversing:
- Delete subscription (doesn't delete transactions)
- To reverse: manually delete the transaction from transaction list

---

## 7. FRONTEND COMPONENTS

### SubscriptionsTab.tsx
- Displays subscriptions grouped by status (active/paused/cancelled/expired)
- Each card shows: name, price, wallet, next renewal date, payment status, autodebet toggle
- Actions: Edit, Delete, Record Payment, Retry (if failed)
- Sync Payments button calls `onGenerateTransactions()`
- Shows payment history count ("X payments") but not individual dates

### SubscriptionModal.tsx
- Fields: Name, Price, Currency, Wallet, Billing Cycle, Start Date, Next Renewal, Cancel URL, Reminder Days, Reminder Note, Status, Follow Through
- Auto-calculates next_renewal_date from start_date + billing_cycle
- Has "Move last payment" checkbox when editing wallet
- Submit calls `onSave(data)` then optionally `onMoveTransaction()`

### FinancePage.tsx
- Passes all handlers to SubscriptionsTab
- Calls `subscriptionsGenerateDueTransactions()` on page load (auto-sync)
- Has `handleCreateSubscription`, `handleUpdateSubscription`, `handleDeleteSubscription`, etc.
