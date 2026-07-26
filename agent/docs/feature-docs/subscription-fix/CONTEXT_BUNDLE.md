# CONTEXT_BUNDLE.md — Subscription System + Crypto Wallet Fixes

## Raw Request (verbatim from user)

"the subscription doesnt EVEN ADD THE TRANSACTION TO THE LIST OF TRANSACTIONS?? THERES NO OPTION TO SET IT AUTODEBET AND STUFF LIKE THAT AND WE CANT ADD THE TRANSACTIONS MANUALLY FOR A SUBSCRIPTION. i want those things that are not there to be fixed or added"

"when autodebet is on, there should be a button to sync the previous months because it doesnt add the transaction of the previous months at all. it should add from the month that we started subscribing until the latest month if it already passed the date. and like adding a manual payment needs to have like a system where it checks for like months that has yet to be paid, and makes like an assumption that it is this is the latest month, and every subscription needs to show every transaction made for that subscription. also, currently, everything is still paid on the today date, so the date is still not proper"

"HANDLING A CASE WHERE THE BALANCE IS NOT ENOUGH, IT SHOULD NOTIFY THE USER AND NOT CUT AND ADD THE TRANSACTION. STUFF LIKE THAT SHOULD BE ADDED"

"the subscription date updates, but it doesnt add the transactions properly"

"the sync button doesnt do anything, it does update the renewal dates with the new months, and like it doesnt add to the list of transactions"

"ALL THE TRANSACTION IS STILL MARKED AS TODAY. THE DATE IS ALL SET TO TODAY"

## Problem Statement

The subscription system has multiple critical bugs:

1. **Transactions not created**: When a subscription is created or synced, transactions either aren't created at all or are created with wrong dates (all showing today's date instead of actual billing dates).

2. **No backfill**: When autodebet is ON and a subscription has been active for months, Sync should create transactions for ALL missed months from start_date to today. Currently it only creates one transaction.

3. **Balance not checked**: The system charges the wallet even when there's insufficient balance, causing negative balances.

4. **No payment history view**: Users can't see which months are paid/failed/unpaid for each subscription.

5. **Manual payment has no date picker**: When recording a manual payment, users can't choose which month they're paying for.

6. **Duplicate transactions**: Both `subscriptions:create` and `subscriptions:generate-due` create transactions for the same date, causing duplicates.

## Current Architecture

### DB Schema — `finance_subscriptions`
```sql
CREATE TABLE finance_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT DEFAULT 'monthly',
  billing_interval INTEGER DEFAULT 1,
  start_date TEXT,
  next_renewal_date TEXT,
  cancel_url TEXT,
  cancel_reminder_days INTEGER DEFAULT 7,
  reminder_note TEXT,
  status TEXT DEFAULT 'active',
  category_id INTEGER,
  payment_status TEXT DEFAULT 'pending',
  last_payment_date TEXT,
  last_payment_txn_id INTEGER,
  autodebet INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime'))
);
```

### DB Schema — `finance_transactions`
```sql
CREATE TABLE finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  wallet_id INTEGER,
  category_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
  amount REAL NOT NULL,
  fee REAL DEFAULT 0,
  merchant TEXT,
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
  updated_at DATETIME DEFAULT (datetime('now','localtime'))
);
```

### IPC Endpoints (all exist in preload.ts + main.ts)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `subscriptions:create` | Create subscription + optional transaction | ✅ Exists but has bugs |
| `subscriptions:update` | Update subscription details | ✅ Exists |
| `subscriptions:delete` | Delete subscription | ✅ Exists |
| `subscriptions:generate-due-transactions` | Backfill missed payments | ✅ Exists but dates wrong |
| `subscriptions:toggle-autodebet` | Toggle autodebet on/off | ✅ Exists |
| `subscriptions:record-payment` | Manual payment with date | ✅ Exists |
| `subscriptions:retry-payment` | Retry failed payment | ✅ Exists |
| `subscriptions:move-transaction` | Move payment between wallets | ✅ Exists |

### Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| SubscriptionsTab | `src/components/finance/SubscriptionsTab.tsx` | Main subscription list view |
| SubscriptionModal | `src/components/finance/SubscriptionModal.tsx` | Create/edit subscription form |
| FinancePage | `src/pages/FinancePage.tsx` | Parent page, passes handlers |

### Key Bugs to Fix

#### Bug 1: Duplicate transactions
`subscriptions:create` creates a transaction for start_date. Then `subscriptions:generate-due-transactions` also tries to create one for start_date. The duplicate check uses `account_id = ?` which fails when account_id is NULL.

**Fix**: Use `OR (account_id IS NULL AND ? IS NULL)` in the duplicate check query. Also use consistent description format: `Subscription: ${name} (${billing_cycle || 'monthly'})`.

#### Bug 2: Dates all show today
The `subscriptions:create` handler uses `data.start_date || today` for the transaction date. If start_date is null, it defaults to today. The generate-due handler calculates dates from start_date but if start_date is null, it uses `new Date()` which is today.

**Fix**: Ensure start_date is always saved. In the modal, auto-calculate start_date from the first billing date. In generate-due, fall back to subscription created_at if start_date is null.

#### Bug 3: No balance check
`subscriptions:create` and `subscriptions:generate-due` create transactions without checking if the wallet has enough balance.

**Fix**: Before creating any transaction, query `finance_wallets.balance` and compare with `sub.price`. If insufficient, set `payment_status = 'failed'` and skip transaction creation. Return error to frontend.

#### Bug 4: No payment history per subscription
Users can't see which months are paid/failed.

**Fix**: In SubscriptionsTab, for each subscription, query `finance_transactions` where `description LIKE 'Subscription: ${sub.name}%'` and show a list of dates with paid/failed status.

#### Bug 5: Manual payment has no date picker
The Record Payment button creates a transaction for today without letting users choose the date.

**Fix**: Add a date picker modal that appears when Record Payment is clicked. Let users select which month they're paying for.

#### Bug 6: Sync doesn't backfill all months
The generate-due handler should create transactions for EVERY month from start_date to today, not just the next renewal date.

**Fix**: The current implementation already does this with a while loop from start_date to today. The issue is that it's not working because of Bug 1 (duplicate check failing) and Bug 3 (balance check missing).

## Required Changes

### 1. Fix duplicate check in generate-due
```sql
-- Before (broken):
WHERE description = ? AND type = 'expense' AND account_id = ?

-- After (fixed):
WHERE description = ? AND type = 'expense'
AND (account_id = ? OR (account_id IS NULL AND ? IS NULL))
```

### 2. Add balance check to all transaction creation
Before INSERT into finance_transactions:
```js
const wRow = db.prepare('SELECT balance FROM finance_wallets WHERE id = ?').get(walletId);
const walletBal = /* decrypt if needed */;
if (walletBal < sub.price) {
  // Set payment_status = 'failed'
  // Skip transaction creation
  // Return error
}
```

### 3. Ensure start_date is always set
In SubscriptionModal, when creating a new subscription:
- If user doesn't set start_date, default to today
- Auto-calculate next_renewal_date from start_date + billing_cycle

### 4. Show payment history per subscription
In SubscriptionsTab, for each subscription card:
```js
const subTxns = transactions.filter(t => 
  t.description?.startsWith(`Subscription: ${sub.name}`) && 
  t.type === 'expense'
);
// Show list of dates with paid/failed status
```

### 5. Add date picker to Record Payment
When user clicks Record Payment:
- Show modal with date picker
- Let user choose which month they're paying for
- Create transaction with selected date

### 6. Fix description consistency
Use same description format everywhere:
```js
const subDesc = `Subscription: ${sub.name} (${sub.billing_cycle || 'monthly'})`;
```

## Verification Steps

1. Create a subscription with start_date = 3 months ago, autodebet ON
2. Click Sync Payments
3. Verify: 3 transactions created, each with correct monthly dates (not today)
4. Verify: wallet balance deducted for each transaction
5. Verify: if wallet has insufficient balance, transaction NOT created, status = 'failed'
6. Click Record Payment on a subscription
7. Verify: date picker appears, can select a specific month
8. Verify: transaction created with selected date
9. Check subscription card shows payment history (list of paid months)
