# PROMPT — Crypto Transfer Wallet Asset Synchronization Fix

## Raw Request

> "it sends the transfer and shows the logs of the transfer properly, BUT, the wallet doesnt update its assets amount properly. it adds the asset to the new wallet (adds the coin with the amount), but it doesnt subtract the ones from us (doesnt update). also, when i delete the transaction theres no change in the wallet amount too, and like when i delete the transaction, the coin on the other wallet is still there. which means the coins are yet to be connected to the transaction. make sure that IT ACTUALLY REDUCES THE CRYPTO OWNED ON THE WALLET FROM THE ONES SENDING TOO."

## Context Bundle Reference

Read `agent/docs/crypto-transfer-fix/CONTEXT_BUNDLE.md` as the source of truth for all code structure, data shapes, IPC endpoints, and architecture. Do NOT attempt to read the codebase directly — the context bundle is self-contained.

---

## Problem Statement

The crypto transfer system in DeskFlow (Electron + React + SQLite) has three critical bugs that break the fundamental accounting model:

1. **Source wallet doesn't lose crypto on transfer** — Backend correctly subtracts via `writeMeta`, but the frontend `WalletDetailView` has a stale-state race condition that overwrites the backend's changes within 500ms.

2. **Delete transaction doesn't reliably revert crypto assets** — Backend delete handler has crypto reversal logic, but edge cases exist (missing `avg_buy_price` restoration, no `txn_id` linking, `finance:get-wallet` doesn't decrypt metadata).

3. **Coins aren't linked to transactions** — Wallet assets don't store `txn_id`, making reversal fragile and dependent on metadata parsing.

---

## Engineering Task

Design a comprehensive fix for all three bugs. The solution must be **atomic and idempotent** — transfers and deletions must be safe to retry.

### Task A: Fix the WalletDetailView Race Condition

The root cause is `useState` in `WalletDetailView` (line 1609):
```typescript
const [localMetadata, setLocalMetadata] = useState<Record<string, any>>(wallet.metadata || {});
```

After a transfer, `fetchData()` updates the `wallet` prop but `localMetadata` stays stale. The debounced auto-save (line 1685-1694) then writes stale data back to DB.

**Design a solution that ensures WalletDetailView always reflects the backend's current state after a transfer, without losing in-progress user edits.** Consider:
- Syncing `localMetadata` when `wallet.metadata` changes (but not during active editing)
- Using a `key` prop to force remount after transfers
- Adding a "suppress auto-save" flag during/after transfers
- Making `financeUpdateWalletMetadata` do a conditional merge (only write if metadata hasn't changed since read)

### Task B: Harden Delete Transaction Crypto Reversal

The delete handler (line 23823-23952) has edge cases:
1. When adding back to source wallet, `avg_buy_price` is set to 0 — loses cost basis
2. `recvQty` fallback calculation may be wrong if `cryptoReceived` isn't in metadata
3. Individual leg deletion (not via transfer_id) won't trigger crypto reversal

**Design a robust reversal that:**
- Restores `avg_buy_price` on the source wallet (reverse the weighted average calculation)
- Handles missing `cryptoReceived` gracefully
- Works when either leg of a transfer is deleted
- Logs the reversal for audit trail

### Task C: Link Wallet Assets to Transactions

Add `txn_id` to wallet assets when they're created/modified by transfers. This enables:
- Direct reversal via `txn_id` lookup instead of metadata parsing
- Audit trail showing which transaction added/removed each coin
- Preventing double-reversal

**Design the schema change and migration, plus the update logic in create-transfer and delete-transaction handlers.**

### Task D: Fix `finance:get-wallet` Decryption

Line 23074 does `JSON.parse(wallet.metadata)` without decrypting first. When `financeDataKey` is set, this returns corrupted data.

**Design the fix to decrypt before parsing, matching the pattern used in `finance:get-wallets`.**

---

## Design Task

### Data Integrity Invariants

Define the invariants that must hold after every operation:

1. **Transfer invariant:** `source_wallet.assets[coin].amount -= sendQty` AND `dest_wallet.assets[coin].amount += recvQty` — ATOMICALLY in one DB transaction
2. **Delete invariant:** Exact reversal of the transfer — source gets back `sendQty`, dest loses `recvQty`
3. **Balance invariant:** For crypto wallets, `balance` (fiat) is NOT modified by crypto transfers. Only `metadata.assets` changes.
4. **Consistency invariant:** After `fetchData()`, the frontend state MUST match the DB state. No stale overwrites.

### Race Condition Prevention

Design a mechanism to prevent the auto-save from overwriting backend changes. Options to evaluate:
1. **Optimistic locking:** Store a `metadata_version` counter. Auto-save only writes if version matches.
2. **Timestamp-based:** Store `metadata_updated_at`. Auto-save only writes if timestamp matches.
3. **Flag-based:** Set a `suppressAutoSave` flag during transfers, clear after fetchData completes.
4. **Architecture change:** Remove auto-save entirely, require explicit save button.

Recommend the best approach with trade-off analysis.

---

## UX Task

### Transfer Flow

1. User opens source wallet → sees crypto assets
2. User clicks "Transfer" → CryptoTransactionModal opens
3. User selects coin, amount, destination wallet → submits
4. Backend atomically: creates 2 transaction rows + moves crypto assets between wallet metadata
5. Frontend: `fetchData()` refreshes all wallets
6. Source wallet now shows reduced amount, destination shows increased amount
7. **No stale overwrite** — WalletDetailView reflects correct state

### Delete Flow

1. User views transaction list → clicks delete on a crypto transfer
2. Backend atomically: reverses crypto assets + reverses fiat balances (if any) + deletes both transaction legs
3. Frontend: `fetchData()` refreshes — wallets show pre-transfer amounts
4. **Cost basis preserved** — source wallet's `avg_buy_price` restored to pre-transfer value

### Error States

- Transfer fails → no partial writes (atomic transaction rolls back)
- Delete fails → no partial reversals
- Metadata corrupted → graceful fallback, log error, don't crash

---

## Constraints

1. **Must work with existing DB schema** — adding columns via ALTER TABLE is OK, no migrations framework
2. **Must work with and without encryption** — `financeDataKey` may be null
3. **Must not break fiat transfers** — crypto fixes must not affect non-crypto transfer paths
4. **Must preserve all existing functionality** — Buy/Sell/Send modes in CryptoTransactionModal, physical/cash denomination transfers, cross-type transfers
5. **All changes in `src/main.ts` (backend) and `src/components/finance/` (frontend)** — no new files
6. **Backend must be source of truth** — frontend state is always derived from DB, never the other way around

---

## Output Format

Provide a **single, comprehensive solution** structured as:

1. **Root Cause Analysis** — for each bug, the exact lines and mechanism causing it
2. **Fix Specification** — exact code changes needed (file, line range, what changes)
3. **Data Flow Diagram** — after fix, how data moves from user action to DB to UI
4. **Invariant Checklist** — pass/fail for each invariant after the fix
5. **Test Plan** — manual test steps to verify each fix
6. **Risk Assessment** — what could break, mitigation strategies

Do NOT provide multiple options. Design THE solution.
