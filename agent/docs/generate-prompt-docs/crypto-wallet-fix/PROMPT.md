# PROMPT.md — Historical Transaction Reordering UI

## Raw Request

The user needs a UI to drag-and-reorder historical transactions within a crypto wallet. Currently, ALL historical transactions have `date: '1900-01-01'` and `time: '00:00'`, making recalculate unable to determine the correct chronological order. The user wants to drag transactions into the right order, and the system should translate that order into dates so recalculate works correctly.

---

## The Problems

### Problem 1: All historical transactions share the same date

Every historical transaction (wallet creation baseline, manual asset adds, historical transfers) gets forced to `date: '1900-01-01'`. The recalculate handler sorts by `date ASC, created_at ASC, id ASC`. Since all dates are identical, the order depends on `created_at` — which is when the transaction was CREATED IN THE DB, not when it happened chronologically.

**Example failure scenario:**
1. User creates a crypto wallet with 12M balance → baseline created (id=1, created_at=now)
2. User manually adds 0.0049 BTC → historical adjustment (id=2, created_at=now+1s)
3. User transfers 0.0039 BTC → historical transfer (id=3, created_at=now+2s)

If the user creates the transfer BEFORE adding the asset (or reorders in any way), `created_at` is wrong. The recalculate processes them in the wrong order, producing incorrect crypto quantities.

### Problem 2: No `sort_order` column on transactions

The `finance_transactions` table has no explicit sort column. Sorting relies entirely on `date` + `created_at` + `id`. There's no way to override the order.

### Problem 3: No UI to reorder historical transactions

The `WalletDetailView.tsx` renders historical transactions in a collapsible section (lines 225-243) with no reorder capability. The list is just `historical.slice(0, 15).map(renderTxnRow)` — flat, no drag handles, no reordering.

### Problem 4: Server overrides the user's date for historical transactions

When `is_adjustment = 1`, the server forces `date = '1900-01-01'` regardless of what the UI sends:
- `finance:create-transaction` (line 23842): `const txnDate = isAdjustment ? '1900-01-01' : (data.date || todayStr());`
- `finance:create-transfer` (line 24056): `const txnDate = data.is_adjustment ? '1900-01-01' : (data.date || todayStr());`
- `finance:create-adjustment` (line 23985): `const txnDate = '1900-01-01';`
- `finance:create-wallet` baseline (line 23220): hardcoded `'1900-01-01'`

### Problem 5: apply-recalculated-balance handler uses different ORDER BY

The `apply-recalculated-balance` handler (line 26163) uses `ORDER BY date ASC, id ASC` — missing `created_at`. This produces a different order than the `recalculate-balances` handler which uses `ORDER BY date ASC, created_at ASC, id ASC`.

### Problem 6: Wallet creation baseline doubles up with manual add

When a user creates a crypto wallet with balance 12M AND then adds an asset manually, BOTH create historical adjustments. The wallet creation creates an expense of 12M (which the recalculate processes as a fiat deduction), and the manual add creates a crypto qty entry. These interact incorrectly because the wallet creation expense shouldn't be treated as a fiat deduction for crypto wallets.

---

## Proposed Solution: Sort Order Column + Drag-Reorder UI

### Architecture

1. **Add `sort_order` column** to `finance_transactions` — an integer that controls the chronological order of historical transactions within the same date.
2. **Drag-reorder UI** in WalletDetailView's historical section — users can drag transactions up/down to set the order.
3. **Auto-assign sort_order** when creating historical transactions — use `created_at` as initial sort_order, or let the user reorder.
4. **Use sort_order in recalculate** — change ORDER BY to `date ASC, sort_order ASC, id ASC`.
5. **Stop overriding dates** — let historical transactions keep their user-chosen dates (or a computed date based on sort_order).

### DB Migration

```sql
ALTER TABLE finance_transactions ADD COLUMN sort_order INTEGER DEFAULT 0;
```

### Backend Changes

**`finance:recalculate-balances` and `finance:apply-recalculated-balance`:**
Change ORDER BY from `date ASC, created_at ASC, id ASC` to `date ASC, sort_order ASC, id ASC`.

**New IPC handler: `finance:update-transaction-sort-order`:**
Accepts an array of `{ id: number, sort_order: number }` and batch-updates the sort_order column.

**`finance:create-transaction`, `finance:create-transfer`, `finance:create-adjustment`:**
When `is_adjustment = 1`, auto-set `sort_order` based on the current max sort_order for that wallet + date, or use the user-chosen date directly.

### Frontend Changes

**WalletDetailView.tsx — Historical section:**
- Add drag handles (using `@dnd-kit` which is already in the project)
- Make the historical list draggable
- On reorder, call `financeUpdateTransactionSortOrder` with the new order
- Each row shows a grip handle on the left

**RecalculateBalanceModal.tsx — Breakdown list:**
- Already shows transactions in order — just needs the updated ORDER BY from the backend

### Key Design Decisions

1. **sort_order is per-wallet, per-date** — Within the same date, transactions are ordered by sort_order. Across dates, date takes precedence.
2. **Auto-assignment uses created_at** — When a new historical transaction is created, its sort_order is set to the current max sort_order for that wallet + date + 1.
3. **Dragging reorders within the same date** — Historical transactions all share `1900-01-01`, so sort_order determines their relative order.
4. **Regular transactions use date descending** — sort_order only affects historical transactions.

---

## Test Plan

1. Create a crypto wallet with balance 10M → baseline transaction appears
2. Add 0.005 BTC manually → second historical transaction appears
3. Transfer 0.003 BTC → third historical transaction appears
4. Open historical section → see all three with drag handles
5. Drag the transfer ABOVE the add → order changes
6. Click Sync → recalculate processes in the new order
7. Verify crypto quantities are correct after reorder

---

## Constraints

1. Must not break existing finance features
2. Files are CRLF — preserve line endings
3. Database migrations only via safe ALTER TABLE with try/catch
4. All changes must be visually verified in the running Electron app
5. The project uses `@dnd-kit` for drag-and-drop (check if it's installed)
