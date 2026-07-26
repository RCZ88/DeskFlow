# PROMPT.md — Crypto Finance System: Complete Fix Packet

## Raw Request

> "the transfer just transferred to itself. i tried deleting a wallet, and when i put it back, it uses a transaction that is supposed to be deleted alongside those, and just like added the balance into the wallet. the id problems of the wallet and transaction is just wrong. THE WALLET SHOULD HAVE AN ID. NEW WALLET SHOULD HAVE NEW ID. THE TID STORED ON THE TRANSACTION SHOULD NOT BE THE SAME IF ITS A NEW WALLET. THE BUYING DOESNT WORK. THE TRANSFER DOESNT WORK."

---

## Problem Statement

The crypto finance system has **7 critical bugs** that make buying, selling, transferring, and wallet management completely broken. The user cannot:
1. Buy crypto (metadata duplicates, balance not updated correctly)
2. Sell crypto via transfer (metadata missing, backend treats it as fiat-to-fiat)
3. Transfer crypto between wallets (transfers appear to "transfer to itself")
4. Delete a wallet cleanly (orphaned transactions persist and appear in new wallets)
5. Recreate a wallet (old transactions reappear because they weren't fully deleted)

---

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in the same directory. It contains ALL relevant source code with exact file paths and line numbers. The target AI must read this first.

---

## Engineering Task: Design a Comprehensive Fix

Design a single, comprehensive fix that addresses ALL 7 bugs. Do NOT provide options — design THE solution.

### Fix 1: Wallet Deletion — Complete Transaction Cleanup

**Current code (main.ts:24906-24917):**
```typescript
db.prepare('DELETE FROM finance_transactions WHERE wallet_id = ?').run(id);
```

**Required fix:** When deleting wallet ID=X, also delete:
- All transactions WHERE `wallet_id = X`
- All transactions WHERE `from_wallet_id = X` (transfer legs where X was the source)
- All transactions WHERE `to_wallet_id = X` (transfer legs where X was the destination)

Additionally, for any remaining transactions in OTHER wallets that reference X via `from_wallet_id` or `to_wallet_id`, NULL out those references:
```sql
UPDATE finance_transactions SET from_wallet_id = NULL WHERE from_wallet_id = ?
UPDATE finance_transactions SET to_wallet_id = NULL WHERE to_wallet_id = ?
```

After deletion, recalculate balances for ALL remaining wallets (not just the deleted one).

### Fix 2: Server-Side wallet_id Filter on get-transactions

**Current code (main.ts:23830-23868):** No `wallet_id` filter exists.

**Required fix:** Add `wallet_id` filter support:
```typescript
if (filters?.wallet_id) {
    conditions.push('(t.wallet_id = ? OR t.from_wallet_id = ? OR t.to_wallet_id = ?)');
    params.push(filters.wallet_id, filters.wallet_id, filters.wallet_id);
}
```

This ensures only relevant transactions are fetched, improving performance and preventing orphaned legs from appearing.

### Fix 3: Crypto-to-Fiat Sell Transfer — Add Missing metadata

**Current code (CryptoTransactionModal.tsx:113-125):** The sell path when `isDestFiat && !hasFiat` does NOT include `metadata`.

**Required fix:** Add `metadata` field to the sell path:
```typescript
if (isDestFiat && !hasFiat) {
    return !!(await props.onSubmit(f.buildPayload({
        to_wallet_id: destWalletId,
        fromWalletName: props.wallet.name,
        toWalletName: destWallet?.name || 'another wallet',
        description: f.description.trim() || `Sell ${qn} ${asset.symbol} → ${format(qn * pn)} ${destWallet?.currency || props.displayCurrency}`,
        amount: qn,
        fee: 0,
        dest_amount: qn * pn,
        metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn, fee: 0, total: qn * pn },  // <-- ADD THIS
        dest_metadata: destMetadata,
    })))
}
```

### Fix 4: Merge Same-Coin Entries in metadata.assets

**Current code (main.ts:23952):** `assets.push(newAsset)` always appends.

**Required fix:** Before pushing, check if a coin with the same `coin_id` already exists. If it does, merge:
```typescript
const existingIdx = assets.findIndex(a => (a.coin_id || a.coinId) === newAsset.coin_id);
if (existingIdx >= 0) {
    // Merge: weighted average for avg_buy_price
    const existing = assets[existingIdx];
    const oldAmt = Number(existing.amount) || 0;
    const newAmt = oldAmt + newAsset.amount;
    const oldAvg = Number(existing.avg_buy_price || existing.avgBuyPrice) || 0;
    existing.amount = newAmt;
    existing.avg_buy_price = newAmt > 0 ? ((oldAmt * oldAvg) + (newAsset.amount * newAsset.avg_buy_price)) / newAmt : newAsset.avg_buy_price;
} else {
    assets.push(newAsset);
}
```

### Fix 5: Update Account Balance for Crypto Buys

**Current code (main.ts:23979-23997):** Account balance is NOT updated for crypto transactions.

**Required fix:** After updating wallet balance for crypto buys, also update the account balance:
```typescript
// After crypto wallet balance update
if (data.wallet_id && data.account_id) {
    const acctRow = db.prepare('SELECT balance FROM finance_accounts WHERE id = ?').get(data.account_id) as any;
    const curAcctBal = financeDataKey && isEncrypted(acctRow?.balance) ? Number(decryptField(String(acctRow.balance), financeDataKey)) || 0 : Number(acctRow?.balance) || 0;
    const newAcctBal = curAcctBal + balanceDelta;
    const encAcctBal = financeDataKey ? encryptField(enc(newAcctBal), financeDataKey) : String(newAcctBal);
    db.prepare("UPDATE finance_accounts SET balance = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(encAcctBal, data.account_id);
}
```

### Fix 6: Remove Double Metadata Update for Add Asset

**Current code (WalletDetailView.tsx:809-888):** Backend pushes to metadata, then frontend overwrites.

**Required fix:** The `handleAddAsset` function should NOT call `onChange('assets', ...)` after the transaction is created. The backend already handles the metadata update. Remove lines 868-872:
```typescript
// REMOVE THIS:
const finalAssets = [...newAssets];
if (createdTxnId && finalAssets.length > 0) {
    finalAssets[finalAssets.length - 1] = { ...finalAssets[finalAssets.length - 1], txn_id: createdTxnId };
}
onChange('assets', JSON.stringify(finalAssets));
```

Instead, after the transaction is created, trigger a re-fetch of the wallet data to get the updated metadata from the backend.

### Fix 7: Fix srcWalletId Temporal Dead Zone

**Current code (main.ts:24073 vs 24083):** `srcWalletId` used before declaration.

**Required fix:** Move the `sortOrder` calculation AFTER `srcWalletId` is declared:
```typescript
const srcWalletId = data.wallet_id;        // Line ~24073
const dstWalletId = data.to_wallet_id;
// ... existing validation ...
const sortOrder = isAdjustment ? ((db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max FROM finance_transactions WHERE wallet_id = ?').get(srcWalletId) as any)?.max || 0) + 1 : 0;
```

---

## Constraint Checklist

1. **Must work with existing DB schema** — no new columns or tables
2. **Must not break existing non-crypto wallet functionality** — bank, credit card, cash wallets
3. **Must be backward compatible** — existing transaction metadata format must still work
4. **Must handle encryption** — all balance/metadata fields may be encrypted with `financeDataKey`
5. **Must recalculate balances after any change** — wallet balance, account balance, crypto portfolio
6. **Must preserve sort_order for historical transactions** — don't reset it
7. **Must handle the `is_adjustment` flag correctly** — historical transactions use date `1900-01-01`

---

## Output Format

Provide the fix as a series of EXACT code changes, each with:
1. File path and line range
2. Current code (what to replace)
3. New code (what to replace it with)
4. Explanation of why this change fixes the bug

Group changes by file. Order by dependency (backend first, then frontend).
