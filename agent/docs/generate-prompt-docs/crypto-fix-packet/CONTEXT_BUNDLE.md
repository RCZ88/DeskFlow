# CONTEXT_BUNDLE.md — Crypto Finance System Bug Fix

> This bundle contains ALL relevant source code for fixing the crypto finance system.
> The target AI must read this FIRST, then design a comprehensive fix.

---

## 1. DB Schema

### finance_wallets (final effective schema)
```sql
CREATE TABLE finance_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bank','debit_card','credit_card','crypto','cash','physical','ewallet','other')),
  provider TEXT,
  last_four TEXT,
  balance REAL DEFAULT 0.0,
  currency TEXT DEFAULT 'USD',
  is_archived INTEGER DEFAULT 0,
  metadata TEXT,
  transfer_fee_type TEXT DEFAULT 'none',
  transfer_fee_value REAL DEFAULT 0,
  initial_balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (account_id) REFERENCES finance_accounts(id)
)
```

### finance_transactions (final effective schema)
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
  from_wallet_id INTEGER REFERENCES finance_wallets(id),
  to_wallet_id INTEGER REFERENCES finance_wallets(id),
  on_behalf_of INTEGER DEFAULT 0,
  on_behalf_of_label TEXT,
  is_adjustment INTEGER DEFAULT 0,
  metadata TEXT,
  sort_order INTEGER DEFAULT 0,
  ft_person_id INTEGER,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (account_id) REFERENCES finance_accounts(id),
  FOREIGN KEY (wallet_id) REFERENCES finance_wallets(id),
  FOREIGN KEY (category_id) REFERENCES finance_categories(id)
)
```

---

## 2. BUG #1: Wallet Deletion Doesn't Clean Up All Transactions

**File:** `src/main.ts` lines 24906-24917

```typescript
electron_1.ipcMain.handle('finance:delete-wallet', async (_event, id: number) => {
  if (!db) return { success: false };
  try {
    const wallet = db.prepare('SELECT name, type FROM finance_wallets WHERE id = ?').get(id) as any;
    db.prepare('DELETE FROM finance_transactions WHERE wallet_id = ?').run(id);  // <-- ONLY deletes primary wallet_id
    db.prepare('DELETE FROM finance_wallets WHERE id = ?').run(id);
    logAuditEvent('wallet_deleted', 'wallet', id, `Deleted wallet "${wallet?.name || id}" (type: ${wallet?.type || 'unknown'})`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
```

**Problem:** When a transfer goes from Wallet A to Wallet B:
- Source leg: `wallet_id = A`, `from_wallet_id = A`, `to_wallet_id = B`
- Dest leg: `wallet_id = B`, `from_wallet_id = A`, `to_wallet_id = B`

When you delete Wallet A:
- Source leg IS deleted (matches `wallet_id = A`)
- Dest leg is NOT deleted (its `wallet_id = B`)
- Dest leg now has `from_wallet_id = A` pointing to a deleted wallet — orphaned reference

**Impact:** Orphaned transfer legs persist in the DB and appear as phantom transactions. When you create a NEW wallet, these orphaned legs can appear in the new wallet's transaction list if the frontend filters by `to_wallet_id`.

---

## 3. BUG #2: No wallet_id Server-Side Filter on get-transactions

**File:** `src/main.ts` lines 23830-23868

```typescript
electron_1.ipcMain.handle('finance:get-transactions', async (_event, filters?: any) => {
  if (!db) return [];
  try {
    let query = `
      SELECT t.*, a.name as account_name, c.name as category_name, c.color as category_color, c.icon as category_icon, w.name as wallet_name
      FROM finance_transactions t
      LEFT JOIN finance_accounts a ON t.account_id = a.id
      LEFT JOIN finance_categories c ON t.category_id = c.id
      LEFT JOIN finance_wallets w ON t.wallet_id = w.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];
    if (filters?.type) { conditions.push('t.type = ?'); params.push(filters.type); }
    if (filters?.account_id) { conditions.push('t.account_id = ?'); params.push(filters.account_id); }
    if (filters?.category_id) { conditions.push('t.category_id = ?'); params.push(filters.category_id); }
    if (filters?.date_from) { conditions.push('t.date >= ?'); params.push(filters.date_from); }
    if (filters?.date_to) { conditions.push('t.date <= ?'); params.push(filters.date_to); }
    if (filters?.search) {
      conditions.push('(t.description LIKE ? OR t.note LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    // NO wallet_id filter!
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY t.date DESC, t.id DESC';
    if (filters?.limit) { query += ' LIMIT ?'; params.push(filters.limit); }
    const rows = db.prepare(query).all(...params) as any[];
    return rows;
  } catch (error: any) {
    console.error('[finance] get transactions error:', error);
    return [];
  }
});
```

**Problem:** ALL transactions across ALL wallets are returned. No `wallet_id` filter exists. The frontend does client-side filtering, but orphaned transfer legs from deleted wallets still appear.

---

## 4. BUG #3: Crypto-to-Fiat Sell Transfer MISSING metadata

**File:** `src/components/finance/modals/CryptoTransactionModal.tsx` lines 113-125

When a user selects "Send" mode, picks a fiat destination, and the crypto wallet has no fiat balance:

```tsx
// Lines 113-125 — THE SELL PATH
if (isDestFiat && !hasFiat) {
    // No fiat → sell crypto for fiat
    return !!(await props.onSubmit(f.buildPayload({
        to_wallet_id: destWalletId,
        fromWalletName: props.wallet.name,
        toWalletName: destWallet?.name || 'another wallet',
        description: f.description.trim() || `Sell ${qn} ${asset.symbol} → ${format(qn * pn)} ${destWallet?.currency || props.displayCurrency}`,
        amount: qn,
        fee: 0,
        dest_amount: qn * pn,
        dest_metadata: destMetadata,
        // *** metadata field is MISSING here! ***
    })))
}
```

Compare to the crypto-to-crypto path (lines 127-137) which DOES include metadata:

```tsx
// Lines 127-137 — CRYPTO TO CRYPTO
return !!(await props.onSubmit(f.buildPayload({
    to_wallet_id: destWalletId,
    fromWalletName: props.wallet.name,
    toWalletName: destWallet?.name || 'another wallet',
    description: f.description.trim() || `Transfer ${qn} ${asset.symbol}`,
    amount: qn * pn,
    fee: fn,
    metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn, fee: fn, cryptoReceived },
    dest_metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: cryptoReceived, price: pn },
})))
```

**Backend detection (main.ts line 24122):**
```typescript
const isCryptoTransfer = !!(data.metadata && data.metadata.coinId && data.metadata.qty);
```

Since `data.metadata` is undefined in the sell path, `isCryptoTransfer = false`. The handler falls into the **fiat-to-fiat** path:
```typescript
if (!isCryptoTransfer) {
    // Standard fiat→fiat transfer: update both wallets
    const srcDeduction = srcAmt - feeAmount;
    updateSrcWallet.run(srcDeduction, now, srcWalletId);
    updateDstWallet.run(dstAmt, now, dstWalletId);
}
```

**Consequences:**
- `srcAmt = -Math.abs(qn)` — the crypto wallet's fiat balance is reduced by the CRYPTO QUANTITY (e.g., -0.5 BTC treated as -0.5 fiat units)
- Crypto holdings are NOT reduced (metadata-based asset tracking never runs)
- The coin stays in the source wallet's portfolio after the "sell"

---

## 5. BUG #4: assets.push() Never Merges Same-Coin Entries

**File:** `src/main.ts` lines 23929-23966 (inside `finance:create-transaction`)

```typescript
// === CRYPTO BUY: Update wallet metadata + balance atomically ===
let parsedMeta: any = null;
if (data.metadata) {
    try { parsedMeta = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata; } catch {}
}
if (parsedMeta && (parsedMeta.coinId || parsedMeta.coin_id) && data.wallet_id && data.type === 'expense') {
    const wallet = db.prepare('SELECT * FROM finance_wallets WHERE id = ?').get(data.wallet_id) as any;
    if (wallet) {
        let meta: any = {};
        if (wallet.metadata) {
            const rawMeta = safeDecrypt(wallet.metadata);
            try { meta = JSON.parse(rawMeta); } catch { meta = {}; }
        }
        const assets: any[] = Array.isArray(meta.assets) ? meta.assets : [];
        const newAsset = {
            coin_id: parsedMeta.coinId || parsedMeta.coin_id,
            symbol: parsedMeta.symbol || '',
            name: parsedMeta.name || '',
            amount: Number(parsedMeta.qty) || 0,
            avg_buy_price: Number(parsedMeta.price) || 0,
            asset_type: 'crypto',
            txn_id: newId,
        };
        assets.push(newAsset);        // <-- ALWAYS PUSHES, NEVER MERGES
        meta.assets = assets;
        // ... writes back to DB
    }
}
```

**Problem:** If you buy Bitcoin twice, the wallet metadata will contain TWO separate `{ coin_id: 'bitcoin', ... }` entries instead of one merged entry with updated amount and avg_buy_price. This causes duplicate asset entries in the UI and incorrect portfolio calculations.

---

## 6. BUG #5: Account Balance NOT Updated for Crypto Buys

**File:** `src/main.ts` lines 23979-23997

```typescript
} else if (!parsedMeta || !(parsedMeta.coinId || parsedMeta.coin_id)) {
    // Normal path (non-crypto): update account + wallet balances
    // ... updates account balance ...
}
```

The `else if` means that for crypto transactions (where `parsedMeta.coinId` exists), the **account balance is never updated**. Only the wallet balance is modified. If the parent bank account is supposed to reflect the fiat spent on crypto, it will be out of sync.

---

## 7. BUG #6: Double Metadata Update for Add Asset

**File:** `src/components/finance/WalletDetailView.tsx` lines 809-888

```tsx
const handleAddAsset = async () => {
    // ...
    const result = await (window as any).deskflowAPI?.financeCreateTransaction({
        // ... creates transaction with metadata
    });
    // ...
    // THEN immediately overwrites wallet metadata from frontend:
    onChange('assets', JSON.stringify(finalAssets));
    // ...
};
```

The backend `finance:create-transaction` handler pushes a new asset to `wallet.metadata.assets`. Then `handleAddAsset` calls `onChange('assets', JSON.stringify(finalAssets))` which triggers `handleMetadataChange`, setting `localMetadata.assets`. The auto-save effect then calls `onSaveMetadata` after 500ms.

**Problem:** Wallet metadata is written TWICE: once by the backend during transaction creation, once by the frontend auto-save. The frontend version overwrites the backend version. This is wasteful and fragile.

---

## 8. BUG #7: srcWalletId Used Before Declaration in Transfer Handler

**File:** `src/main.ts` lines 24073 vs 24083

```typescript
// Line 24073 — uses srcWalletId BEFORE it's declared
const sortOrder = isAdjustment ? ((db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max FROM finance_transactions WHERE wallet_id = ?').get(srcWalletId) as any)?.max || 0) + 1 : 0;

// Line 24083 — srcWalletId declared HERE
const srcWalletId = data.wallet_id;
```

This is a temporal dead zone violation. It only crashes when `isAdjustment` is truthy (historical adjustments), so normal transfers work. But it's a latent bug.

---

## 9. How the Frontend Filters Transactions Per Wallet

**File:** `src/components/finance/WalletDetailView.tsx` lines 1864-1865

```typescript
const walletTransactions = useMemo(() =>
    transactions.filter(t => t.wallet_id === wallet.id || (t as any).to_wallet_id === wallet.id),
    [transactions, wallet.id]
);
```

This includes transactions where `to_wallet_id` matches — which means orphaned transfer legs from deleted wallets CAN appear if they have `to_wallet_id` pointing to the current wallet.

---

## 10. How the Portfolio Derives Assets from Transactions

**File:** `src/components/finance/WalletDetailView.tsx` lines 544-591

```typescript
const assets: { coin_id: string; symbol: string; amount: number; avg_buy_price: number }[] = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      const soA = (a as any).sort_order || 0;
      const soB = (b as any).sort_order || 0;
      if (soA !== soB) return soA - soB;
      return (a.id || 0) - (b.id || 0);
    });

    const assetsMap = new Map<string, { coin_id: string; symbol: string; amount: number; total_cost: number }>();

    for (const t of sorted) {
      if (!t.metadata) continue;
      let m: any;
      try { m = typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata; } catch { continue; }
      const coinId = m.coinId || m.coin_id;
      if (!coinId || m.qty == null) continue;

      let delta = Number(m.qty) || 0;
      if (t.type === 'income' || (t.type === 'transfer' && t.amount < 0)) {
        delta = -Math.abs(delta);
      } else {
        delta = Math.abs(delta);
      }

      if (!assetsMap.has(coinId)) {
        assetsMap.set(coinId, { coin_id: coinId, symbol: (m.symbol || '').toUpperCase(), amount: 0, total_cost: 0 });
      }
      const asset = assetsMap.get(coinId)!;
      // Only add cost for actual purchases (expense type), NOT transfers
      if (delta > 0 && t.type === 'expense') {
        const cost = delta * (Number(m.price) || 0);
        asset.total_cost += cost;
      }
      // When removing assets, reduce total_cost proportionally
      if (delta < 0 && asset.amount > 0) {
        const removalRatio = Math.abs(delta) / asset.amount;
        asset.total_cost = Math.max(0, asset.total_cost * (1 - removalRatio));
      }
      asset.amount += delta;
    }

    return Array.from(assetsMap.values())
      .filter(a => a.amount > 0.00000001)
      .map(a => ({
        coin_id: a.coin_id,
        symbol: a.symbol,
        amount: a.amount,
        avg_buy_price: a.amount > 0 ? a.total_cost / a.amount : 0,
      }));
}, [transactions]);
```

This is the **authoritative** source for the portfolio display. It derives everything from transaction metadata. If the transactions are wrong (orphaned legs, missing metadata, duplicate pushes), the portfolio will be wrong.

---

## 11. How Recalculate Works (Single Wallet)

**File:** `src/main.ts` lines 25884-26064

```typescript
electron_1.ipcMain.handle('finance:recalculate-balances', async (_event, walletId?: number, preview?: boolean) => {
  if (!db) return { success: false };
  try {
    if (walletId) {
      const wallet = db.prepare('SELECT * FROM finance_wallets WHERE id = ?').get(walletId) as any;
      if (!wallet) return { error: 'Wallet not found' };

      const rawInitBal = wallet.initial_balance || 0;
      const initialBalance = /* decrypt */ Number(rawInitBal) || 0;
      const txns = db.prepare('SELECT * FROM finance_transactions WHERE wallet_id = ? ORDER BY date ASC, sort_order ASC, created_at ASC, id ASC').all(walletId) as any[];

      const isCryptoWallet = wallet.type === 'crypto' || wallet.type === 'investment';

      let balance = initialBalance;
      const assetsMap = new Map<string, any>();

      for (const t of txns) {
        // ... parses metadata, determines isCryptoTxn, isCryptoToCrypto
        // For crypto wallets: accumulates qty and avg_buy_price in assetsMap
        // For non-crypto: applies income/expense/transfer to running balance
      }

      // Reconstructs metadata.assets from assetsMap
      // Writes back wallet.balance and wallet.metadata
      // Recalculates account balance
    }
  }
});
```

The recalculate handler correctly reconstructs `metadata.assets` from transactions. But it only processes transactions WHERE `wallet_id = ?` — it does NOT process orphaned transfer legs where `from_wallet_id` or `to_wallet_id` references this wallet.

---

## 12. The Transfer Handler — Full Crypto Path

**File:** `src/main.ts` lines 24121-24275

```typescript
// Detect crypto transfer (metadata with coinId present)
const isCryptoTransfer = !!(data.metadata && data.metadata.coinId && data.metadata.qty);
const srcIsCrypto = isCryptoTransfer;
const isCryptoToCrypto = isCryptoTransfer && dstIsCrypto;
const isCryptoToFiat = isCryptoTransfer && !dstIsCrypto;

// ... creates two transaction legs ...

if (isCryptoTransfer) {
    // Source wallet: reduce/remove the coin
    const srcMeta = readMeta(srcWalletId);
    const srcAssets = srcMeta.assets || [];
    const srcIdx = srcAssets.findIndex(a => a.coin_id === coinId);
    if (srcIdx >= 0) {
        srcAssets[srcIdx].amount -= sendQty;
        if (srcAssets[srcIdx].amount <= 0) srcAssets.splice(srcIdx, 1);
    }
    writeMeta(srcWalletId, srcMeta);

    // Destination wallet: add/merge the coin
    const dstMeta = readMeta(dstWalletId);
    const dstAssets = dstMeta.assets || [];
    const dstIdx = dstAssets.findIndex(a => a.coin_id === coinId);
    if (dstIdx >= 0) {
        // Merge: increase amount, recalc avg_buy_price weighted
        const existing = dstAssets[dstIdx];
        const newAmt = existing.amount + recvQty;
        existing.amount = newAmt;
        existing.avg_buy_price = newAmt > 0 ? ((existing.amount * existing.avg_buy_price) + (recvQty * price)) / newAmt : price;
    } else {
        dstAssets.push({ coin_id: coinId, symbol: symbol.toUpperCase(), amount: recvQty, avg_buy_price: price });
    }
    writeMeta(dstWalletId, dstMeta);
}

// Fiat balance updates
if (!isCryptoTransfer) {
    // Standard fiat→fiat: update both wallets
} else if (isCryptoToFiat) {
    // Crypto→fiat: only update destination wallet fiat
} else {
    // Crypto→crypto: NO fiat changes
}
```

---

## 13. Wallet Type Detection for Crypto

**File:** `src/main.ts` line 24094

```typescript
const dstIsCrypto = dstWallet.type === 'crypto' || dstWallet.type === 'investment';
```

Note: The wallet type CHECK constraint only allows: `'bank','debit_card','credit_card','crypto','cash','physical','ewallet','other'`. There is NO `'investment'` type in the DB constraint. This means `investment` type wallets cannot be created via the DB constraint — they must be created via a migration or the constraint is not enforced.

---

## 14. The Frontend Transfer Wallet Select

**File:** `src/components/finance/modals/TransferWalletSelect.tsx` lines 32-53

```tsx
const available = useMemo(() => {
    let list = wallets.filter(w => w.id !== excludeWalletId && !w.is_archived);
    if (accounts && accounts.length > 0) {
        const accountIds = new Set(accounts.map(a => a.id));
        list = list.filter(w => accountIds.has(w.account_id));
    }
    return list;
}, [wallets, excludeWalletId, accounts]);
```

This correctly excludes the source wallet. So "transfers to itself" is NOT caused by the wallet selector — it's caused by the missing metadata in the sell path (BUG #3).

---

## 15. The CryptoTransactionModal — Full Buy/Sell/Transfer Logic

**File:** `src/components/finance/modals/CryptoTransactionModal.tsx` lines 100-143

```tsx
const handleSubmit = async () => {
    const asset = assets.find(a => a.coinId === selectedCoinId);
    if (!asset) return;
    const destWalletId = transferDestWalletId;
    const destWallet = wallets.find(w => w.id === destWalletId);
    const qn = Number(qty) || 0, pn = Number(price) || 0, fn = Number(fee) || 0;
    const total = qn * pn;
    const net = f.type === 'income' ? total + fn : total - fn;

    // Transfer modes
    if (f.type === 'transfer') {
        const hasFiat = (wallet.balance || 0) > 0;
        const isDestFiat = destWallet && !['crypto', 'investment'].includes(destWallet.type);
        const destMetadata = { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn };

        // Crypto → Crypto
        if (!isDestFiat) {
            const cryptoReceived = qn - fn;
            return !!(await props.onSubmit(f.buildPayload({
                to_wallet_id: destWalletId,
                fromWalletName: props.wallet.name,
                toWalletName: destWallet?.name || 'another wallet',
                description: f.description.trim() || `Transfer ${qn} ${asset.symbol}`,
                amount: qn * pn,
                fee: fn,
                metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn, fee: fn, cryptoReceived },
                dest_metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: cryptoReceived, price: pn },
            })))
        }

        // Crypto → Fiat (sell) — when wallet has fiat balance
        if (isDestFiat && hasFiat) {
            return !!(await props.onSubmit(f.buildPayload({
                to_wallet_id: destWalletId,
                fromWalletName: props.wallet.name,
                toWalletName: destWallet?.name || 'another wallet',
                description: f.description.trim() || `Sell ${qn} ${asset.symbol}`,
                amount: net,
                fee: fn,
                metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn, fee: fn, total },
            })))
        }

        // Crypto → Fiat (sell) — when wallet has NO fiat balance
        if (isDestFiat && !hasFiat) {
            return !!(await props.onSubmit(f.buildPayload({
                to_wallet_id: destWalletId,
                fromWalletName: props.wallet.name,
                toWalletName: destWallet?.name || 'another wallet',
                description: f.description.trim() || `Sell ${qn} ${asset.symbol} → ${format(qn * pn)} ${destWallet?.currency || props.displayCurrency}`,
                amount: qn,
                fee: 0,
                dest_amount: qn * pn,
                dest_metadata: destMetadata,
                // *** metadata field is MISSING! ***
            })))
        }
    }

    // Buy or Sell (non-transfer)
    return !!(await props.onSubmit(f.buildPayload({
        amount: f.type === 'expense' ? -net : net,
        description: f.description.trim() || `${f.type === 'expense' ? 'Buy' : 'Sell'} ${qn} ${asset.symbol}`,
        metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn, fee: fn, total },
    })))
};
```
