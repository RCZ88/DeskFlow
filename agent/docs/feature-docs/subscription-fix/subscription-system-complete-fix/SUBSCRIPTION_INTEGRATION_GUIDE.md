# Subscription System Fix — Integration Guide

## What This Fix Does

The subscription system was broken in 7 ways. This fix makes it work like a human would handle subscriptions:

### Core Philosophy
- **For new subscriptions**: Auto-deduct on the correct date
- **For old subscriptions**: One "adjustment" payment instead of forcing 6 individual entries
- **Insufficient balance?** Notify the user, DON'T go negative
- **Wrong wallet?** Change it, past stays, future uses new one
- **Mistaken charge?** Cancel it, money goes back

---

## Files to Add/Replace

### 1. Backend IPC Handlers (src/main.ts)

**Replace these handlers** with the code from `ipc_handlers/subscription-fix-handlers.ts`:
- `subscriptions:create`
- `subscriptions:generate-due-transactions`
- `subscriptions:record-payment`
- `subscriptions:retry-payment`
- `subscriptions:update`

**Add these NEW handlers**:
- `subscriptions:cancel-payment`
- `subscriptions:get-payment-history`

### 2. Frontend Components (src/components/finance/)

**Add these new files**:
- `PaymentHistoryModal.tsx` — Shows paid/failed/cancelled months
- `RecordPaymentModal.tsx` — Date picker for manual payments
- `SyncBackfillModal.tsx` — Choose individual vs adjustment for old subs
- `SubscriptionCard.tsx` — Enhanced card with status, actions, history

### 3. Preload.ts

**Add these IPC channels**:
```typescript
'subscriptions:cancel-payment',
'subscriptions:get-payment-history',
```

### 4. SubscriptionsTab.tsx

**Replace the subscription list rendering** with SubscriptionCard components.
**Add state** for modals:
```typescript
const [historySub, setHistorySub] = useState(null);
const [recordSub, setRecordSub] = useState(null);
const [syncSub, setSyncSub] = useState(null);
const [syncResult, setSyncResult] = useState(null);
```

**Add handlers**:
```typescript
const handleSync = async (sub) => {
  // Check if old subscription
  const startDate = new Date(sub.start_date);
  const today = new Date();
  const monthsDiff = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());

  if (monthsDiff > 1) {
    // Show SyncBackfillModal
    setSyncSub(sub);
  } else {
    // Just sync normally
    const result = await window.electron.invoke('subscriptions:generate-due-transactions', {
      subscriptionId: sub.id,
    });
    setSyncResult(result);
    fetchSubscriptions();
  }
};

const handleSyncConfirm = async (mode) => {
  const result = await window.electron.invoke('subscriptions:generate-due-transactions', {
    subscriptionId: syncSub.id,
    backfillMode: mode,
  });
  setSyncResult(result);
  setSyncSub(null);
  fetchSubscriptions();
};

const handleRecordPayment = async (data) => {
  const result = await window.electron.invoke('subscriptions:record-payment', data);
  if (result.success) {
    showNotification('Payment recorded', 'success');
  } else {
    showNotification(result.error, 'error');
  }
  fetchSubscriptions();
};

const handleRetryPayment = async (sub) => {
  const result = await window.electron.invoke('subscriptions:retry-payment', {
    subscriptionId: sub.id,
  });
  if (result.success) {
    showNotification('Payment retried successfully', 'success');
  } else {
    showNotification(result.error, 'error');
  }
  fetchSubscriptions();
};

const handleCancelPayment = async (txnId) => {
  const result = await window.electron.invoke('subscriptions:cancel-payment', {
    subscriptionId: historySub.id,
    transactionId: txnId,
    reason: 'User cancelled',
  });
  if (result.success) {
    showNotification('Payment cancelled — money refunded', 'success');
  } else {
    showNotification(result.error, 'error');
  }
  fetchSubscriptions();
};
```

### 5. FinancePage.tsx

**Add notification state**:
```typescript
const [notification, setNotification] = useState(null);

const showNotification = (message, type = 'info') => {
  setNotification({ message, type });
  setTimeout(() => setNotification(null), 5000);
};
```

**Pass notification handler to SubscriptionsTab**.

---

## How Each Scenario Works

### Scenario 1: New Subscription (starts today)
1. User creates subscription with start_date = today
2. System checks wallet balance
3. If sufficient: creates ONE transaction for today, deducts from wallet
4. next_renewal_date = today + 1 billing cycle
5. Future months auto-deduct on billing date

### Scenario 2: Old Subscription (started 6 months ago)
1. User creates subscription with start_date = 6 months ago
2. System detects it's old (start_date < today)
3. Does NOT create transaction on creation
4. User clicks "Sync"
5. Modal asks: "Backfill individually or one adjustment?"
6. User picks "One Adjustment"
7. System creates ONE transaction for total amount, deducts from wallet
8. next_renewal_date updated to next future date

### Scenario 3: Monthly Auto-Debit (autodebet ON)
1. User clicks "Sync Payments" (or app auto-syncs on load)
2. For each subscription:
   - Calculate all billing dates from start_date to today
   - Check which dates are missing transactions
   - For each missing date:
     - Check wallet balance
     - If sufficient: create transaction, deduct from wallet
     - If insufficient: mark as 'failed', STOP, notify user
3. Update next_renewal_date to next future date

### Scenario 4: Insufficient Balance
1. System checks wallet balance before creating transaction
2. Balance < price → skip transaction
3. Set subscription.payment_status = 'failed'
4. Return error: "Need RpX, have RpY"
5. Frontend shows notification + red badge on subscription card
6. User can: Retry (with same wallet), Change Wallet, or Skip

### Scenario 5: Manual Payment
1. User clicks "Pay" on subscription card
2. Modal opens with date picker
3. User selects which month to pay for
4. System checks if already paid for that date
5. If not paid: creates transaction with selected date
6. If already paid: shows error

### Scenario 6: Cancel/Reversal
1. User opens History modal
2. Clicks "Cancel" on a paid month
3. System creates reversal transaction (income, +amount)
4. Adds money back to wallet
5. Marks that month as 'cancelled'

### Scenario 7: Change Wallet
1. User edits subscription, changes wallet_id
2. Past transactions stay on old wallet
3. Future payments use new wallet
4. "Move last payment" checkbox: if checked, moves most recent transaction

---

## Testing Checklist

- [ ] Create new subscription → transaction created with correct date
- [ ] Create old subscription → no auto-transaction, sync shows backfill modal
- [ ] Sync old subscription with "One Adjustment" → one transaction for total
- [ ] Sync old subscription with "Individual" → multiple transactions per month
- [ ] Sync with insufficient balance → no transaction, status = failed, notification shown
- [ ] Manual payment with date picker → transaction has selected date
- [ ] Manual payment for already-paid month → error shown
- [ ] Retry failed payment → transaction created, status = paid
- [ ] Cancel payment → reversal transaction, money back
- [ ] Change wallet → future uses new wallet, past stays
- [ ] Payment history modal → shows all months with correct status
- [ ] Autodebet toggle → ON = auto-sync, OFF = manual only

---

## Key Design Decisions

1. **wallet.balance IS the fiat balance** — no separate tracking needed
2. **Old subscriptions get ONE adjustment** — not forcing 6 manual entries
3. **Balance check BEFORE every transaction** — never go negative
4. **Dates calculated from start_date + billing_cycle** — never use today
5. **Payment history shows all months** — paid, failed, cancelled, upcoming, unpaid
6. **Reversal creates income transaction** — money actually goes back to wallet
