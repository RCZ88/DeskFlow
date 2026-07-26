# Context Bundle — Crypto Transfer Wallet Fix

## Problem Summary

The crypto transfer system in DeskFlow has three interconnected bugs:

1. **Source wallet doesn't lose crypto on transfer** — The backend code correctly subtracts from source wallet metadata, but a frontend race condition with `WalletDetailView` auto-save overwrites the backend's changes.
2. **Delete transaction doesn't revert wallet assets** — The backend delete handler now has crypto reversal logic (recently added), but may have edge cases.
3. **Coins not connected to transactions** — Transfer metadata doesn't store `txn_id` linking, making reversal fragile.

---

## Architecture Overview

```
CryptoTransactionModal (frontend)
  → useTransactionForm.buildPayload({ metadata: {...} })
  → FinancePage.handleAddTransaction → financeCreateTransfer IPC
  → main.ts finance:create-transfer handler:
      1. Creates two transaction rows (source + dest) with metadata JSON
      2. If isCryptoTransfer: readMeta/writeMeta to move assets between finance_wallets.metadata
      3. Fiat balance updates skipped for crypto-to-crypto
  → FinancePage.fetchData() refreshes wallet state
  → WalletDetailView:
      localMetadata state → handleMetadataChange → auto-save debounce (500ms) → onSaveMetadata
      → financeUpdateWalletMetadata IPC → main.ts: Object.assign merge → UPDATE finance_wallets SET metadata=?
```

---

## Bug #1: Race Condition — WalletDetailView Auto-Save Overwrites Backend Changes

### Root Cause

`WalletDetailView` (line 1609) initializes `localMetadata` from `wallet.metadata` on mount:
```typescript
const [localMetadata, setLocalMetadata] = useState<Record<string, any>>(wallet.metadata || {});
```

A debounced `useEffect` (line 1685-1694) auto-saves `localMetadata` to DB whenever `localMetadata.assets` changes:
```typescript
useEffect(() => {
  assetsDirtyRef.current = true;
  const timer = setTimeout(() => {
    if (assetsDirtyRef.current) {
      assetsDirtyRef.current = false;
      onSaveMetadata(wallet.id, localMetadata).catch(() => {});
    }
  }, 500);
  return () => clearTimeout(timer);
}, [localMetadata.assets]);
```

**The problem:** `useState` only captures the INITIAL value. When `fetchData()` runs after a transfer and updates the `wallet` prop, `localMetadata` stays STALE (it still has the old assets). If the user then interacts with the wallet detail view (or if any state update triggers a re-render that causes `localMetadata.assets` reference to change), the 500ms debounce fires and writes the STALE `localMetadata` back to DB via `financeUpdateWalletMetadata`, overwriting the backend's correct crypto transfer.

### The Race Sequence

```
1. User opens WalletDetailView for Wallet A (has 1 BTC)
2. localMetadata = { assets: [{ coin_id: "bitcoin", amount: 1 }] }
3. User opens CryptoTransferModal, transfers 0.5 BTC to Wallet B
4. Backend: Wallet A assets → 0.5 BTC, Wallet B assets → +0.5 BTC ✅
5. fetchData() runs → wallet prop updates → Wallet A now has 0.5 BTC in DB
6. BUT localMetadata still says 1 BTC (useState doesn't re-init)
7. User clicks something in WalletDetailView → triggers re-render
8. 500ms debounce fires → writes { assets: [{ amount: 1 }] } back to DB
9. Wallet A is back to 1 BTC — backend change was OVERWRITTEN ❌
```

### Affected Files

- `src/components/finance/WalletDetailView.tsx` lines 1609, 1683-1694
- `src/main.ts` lines 23081-23145 (`finance:update-wallet-metadata` handler)
- `src/pages/FinancePage.tsx` lines 455-477 (transfer handler + fetchData)

### Fix Required

WalletDetailView must sync `localMetadata` when the `wallet` prop changes (after fetchData). Options:
1. Add `useEffect` that resets `localMetadata` when `wallet.metadata` changes (but must not conflict with user edits)
2. Use a `key` prop on WalletDetailView based on `wallet.updated_at` to force remount
3. Remove auto-save for crypto wallets after transfers (let backend be source of truth)
4. Add a "transfer in progress" flag that suppresses auto-save during/after transfers

---

## Bug #2: Delete Transaction — Crypto Asset Reversal Edge Cases

### Current Delete Handler (lines 23823-23952)

The delete handler checks transaction metadata for `coinId`/`coin_id` and reverses assets:

```typescript
// Source wallet: add back the sent qty
const srcMeta = readMeta(cryptoInfo.srcWalletId);
const srcIdx = srcAssets.findIndex((a: any) => (a.coin_id || a.coinId || a.asset) === cryptoInfo.coinId);
if (srcIdx >= 0) {
  srcAssets[srcIdx].amount = (Number(srcAssets[srcIdx].amount) || 0) + cryptoInfo.sendQty;
} else {
  srcAssets.push({ coin_id: cryptoInfo.coinId, symbol: cryptoInfo.symbol, amount: cryptoInfo.sendQty, avg_buy_price: 0 });
}
```

### Potential Issues

1. **Fiat balance reversal for crypto wallets:** Lines 23900-23920 skip fiat reversal for crypto wallets (`isLegCrypto` check), which is correct. But the check uses `leg.wallet_id === cryptoInfo.srcWalletId` — if either ID is 0 or null, the check fails and fiat gets incorrectly reversed.

2. **`recvQty` calculation:** Uses `Number(m.cryptoReceived) || (sendQty - (Number(m.fee) || 0))`. If `cryptoReceived` isn't stored in metadata, it falls back to `sendQty - fee`. But the fee in metadata is in crypto units, not fiat — need to verify this is consistent.

3. **No `avg_buy_price` restoration:** When adding back to source wallet, `avg_buy_price` is set to 0. This loses the cost basis information.

4. **Delete of individual leg vs full transfer:** If user deletes only one leg of the transfer (not via transfer_id), the crypto reversal won't trigger because the code checks `txn.transfer_id` first.

---

## Bug #3: Transaction ↔ Wallet Asset Linking

### Current State

Transfer metadata stored in `finance_transactions.metadata`:
```json
{
  "coinId": "bitcoin",
  "symbol": "BTC",
  "qty": 0.5,
  "price": 42000,
  "fee": 0.0001,
  "total": 21000,
  "cryptoReceived": 0.4999
}
```

Wallet assets stored in `finance_wallets.metadata`:
```json
{
  "assets": [
    {
      "coin_id": "bitcoin",
      "symbol": "BTC",
      "amount": 0.5,
      "avg_buy_price": 42000,
      "txn_id": null
    }
  ]
}
```

### Missing Link

Wallet assets don't store `txn_id` referencing the transaction that created them. This means:
- Can't trace which transaction added/removed a coin
- Delete reversal relies on metadata parsing rather than direct linkage
- If metadata is malformed, reversal fails silently

---

## IPC Endpoints Involved

| Endpoint | File | Line | Purpose |
|----------|------|------|---------|
| `finance:create-transfer` | main.ts | 23526 | Creates two-legged transfer, moves crypto assets |
| `finance:delete-transaction` | main.ts | 23823 | Deletes transaction, reverses balances + crypto |
| `finance:update-wallet-metadata` | main.ts | 23081 | Merges metadata into wallet (Object.assign) |
| `finance:get-wallets` | main.ts | 22889 | Returns wallets with decrypted metadata |
| `finance:get-wallet` | main.ts | 23069 | Returns single wallet (does NOT decrypt metadata!) |

### Critical Bug in `finance:get-wallet`

Line 23074: `wallet.metadata = JSON.parse(wallet.metadata)` — this does NOT decrypt encrypted metadata. If `financeDataKey` is set, this will throw or return garbage. This means `finance:get-wallet` returns corrupted metadata when encryption is enabled.

---

## DB Schema

### finance_wallets.metadata (TEXT)
```json
{
  "assets": [
    {
      "coin_id": "bitcoin",
      "coinId": "bitcoin",
      "asset": "bitcoin",
      "symbol": "BTC",
      "name": "Bitcoin",
      "amount": 0.5,
      "avg_buy_price": 42000,
      "avgBuyPrice": 42000,
      "asset_type": "crypto",
      "txn_id": 123
    }
  ]
}
```

### finance_transactions.metadata (TEXT)
```json
{
  "coinId": "bitcoin",
  "symbol": "BTC",
  "qty": 0.5,
  "price": 42000,
  "fee": 0.0001,
  "total": 21000,
  "cryptoReceived": 0.4999
}
```

---

## Encryption

- `encryptField(value, key)` → `enc:v1:` prefix + encrypted JSON
- `decryptField(value, key)` → strips prefix, decrypts
- `isEncrypted(value)` → checks for `enc:v1:` prefix
- `financeDataKey` → derived from password, null when unencrypted

---

## Frontend Components

### CryptoTransactionModal
- File: `src/components/finance/modals/CryptoTransactionModal.tsx`
- Supports Buy/Sell/Send modes
- Transfer mode sends metadata with coinId, symbol, qty, price, fee, cryptoReceived
- Calls `props.onSubmit(f.buildPayload({...}))`

### WalletDetailView
- File: `src/components/finance/WalletDetailView.tsx`
- `CryptoDetail` sub-component (line 343+) handles asset display/edit
- `localMetadata` state (line 1609) — STALE after transfers
- Auto-save debounce (line 1685-1694) — causes race condition
- `handleMetadataChange` (line 1677) — updates localMetadata
- `onSaveMetadata` calls `financeUpdateWalletMetadata` IPC

### WalletsTab
- File: `src/components/finance/WalletsTab.tsx`
- Shows wallet list with combined fiat + crypto market value
- Uses `convertAmount` for currency conversion
