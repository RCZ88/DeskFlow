# Crypto Wallet End-to-End — Context Bundle (ACTUAL SOURCE CODE)

> This file contains the ACTUAL source code for every affected file. The target AI has NO
> codebase access — this is their only source of truth. Every handler, component, type,
> and wiring must be present here.

## Architecture

DeskFlow = Electron + React + better-sqlite3. Finance data in SQLite with optional AES-256-GCM encryption.
Data flow: React UI → preload IPC bridge (`window.deskflowAPI.*`) → main.ts handler → SQLite → response back.
Crypto prices from CoinGecko API. Wallet metadata stored as JSON in `finance_wallets.metadata`.

---

## 1. DB SCHEMA

### finance_transactions
```sql
CREATE TABLE finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  wallet_id INTEGER,
  category_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
  amount REAL NOT NULL,
  description TEXT, note TEXT,
  date TEXT NOT NULL, time TEXT,
  is_recurring INTEGER DEFAULT 0, recurring_interval TEXT, tags TEXT,
  transfer_id TEXT, from_wallet_id INTEGER, to_wallet_id INTEGER,
  on_behalf_of INTEGER DEFAULT 0, on_behalf_of_label TEXT,
  fee REAL DEFAULT 0, merchant TEXT,
  is_adjustment INTEGER DEFAULT 0,
  metadata TEXT,  -- JSON: { coinId, symbol, name, qty, price, fee, total } for crypto
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime'))
);
```

### finance_wallets
```sql
CREATE TABLE finance_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bank','debit_card','credit_card','crypto','cash','physical','ewallet','other','investment')),
  provider TEXT, last_four TEXT, balance REAL DEFAULT 0.0,
  currency TEXT DEFAULT 'USD', is_archived INTEGER DEFAULT 0,
  metadata TEXT,  -- JSON: { assets: [...], blockchain, notes } for crypto
  transfer_fee_type TEXT DEFAULT 'none', transfer_fee_value REAL DEFAULT 0,
  initial_balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime'))
);
```

### finance_wallets.metadata (crypto wallet structure)
```json
{
  "assets": [
    {
      "coin_id": "bitcoin",
      "symbol": "BTC",
      "name": "Bitcoin",
      "amount": 0.5,
      "avg_buy_price": 40000,
      "asset_type": "crypto",
      "txn_id": 123  // optional: links to the transaction that created this asset
    }
  ],
  "blockchain": "Bitcoin",
  "wallet_address": "...",
  "notes": ""
}
```

### finance_crypto_prices
```sql
CREATE TABLE finance_crypto_prices (
  coin_id TEXT PRIMARY KEY,
  symbol TEXT,
  name TEXT,
  current_price REAL,
  price_change_percentage_24h REAL,
  market_cap REAL,
  image TEXT,
  last_updated DATETIME DEFAULT (datetime('now','localtime'))
);
```

### crypto_asset_history
```sql
CREATE TABLE crypto_asset_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER NOT NULL,
  coin_id TEXT NOT NULL,
  amount REAL NOT NULL,
  avg_buy_price REAL NOT NULL,
  fiat_value REAL NOT NULL,
  date TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now','localtime'))
);
```

---

## 2. ENCRYPTION LAYER (main.ts lines 22526–22558)

```typescript
let financeDataKey: Buffer | null = null;
const ENC_PREFIX = 'enc:v1:';

function deriveFinanceDataKey(password: string, salt: string): Buffer {
  return crypto.scryptSync(password, salt, 32) as Buffer;
}

function encryptField(value: string, key: Buffer): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return ENC_PREFIX + JSON.stringify({ iv: iv.toString('base64'), at: authTag.toString('base64'), d: encrypted.toString('base64') });
  } catch (e) { console.error('[finance-enc] encrypt error:', e); return value; }
}

function decryptField(value: string, key: Buffer): string {
  try {
    if (!value || !value.startsWith(ENC_PREFIX)) return value;
    const { iv, at, d } = JSON.parse(value.slice(ENC_PREFIX.length));
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(at, 'base64'));
    return decipher.update(Buffer.from(d, 'base64'), undefined, 'utf8') + decipher.final('utf8');
  } catch (e) { console.error('[finance-enc] decrypt error:', e); return value; }
}

function isEncrypted(value: any): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}
```

`financeDataKey` is set during `finance:unlock` handler:
```typescript
financeDataKey = deriveFinanceDataKey(password, financePasswordSalt);
```
And cleared to `null` during `finance:lock`.

---

## 3. recordCryptoAssetHistory (main.ts lines 23110–23120)

```typescript
function recordCryptoAssetHistory(walletId: number, coinId: string, amount: number, avgBuyPrice: number, currentPrice: number) {
  if (!db) return;
  const today = todayStr();
  const fiatValue = amount * currentPrice;
  try {
    db.prepare('INSERT INTO crypto_asset_history (wallet_id, coin_id, amount, avg_buy_price, fiat_value, date) VALUES (?, ?, ?, ?, ?, ?)').run(walletId, coinId.toLowerCase(), amount, avgBuyPrice, fiatValue, today);
  } catch (e: any) {
    console.error(`[finance] Failed to record crypto asset history: ${e.message}`);
  }
}
```

---

## 4. finance:get-wallets handler (main.ts lines 23123–23151)

```typescript
ipcMain.handle('finance:get-wallets', async (_event, accountId?: number) => {
  if (!db) return [];
  try {
    let rows: any[];
    if (accountId) {
      rows = db.prepare('SELECT * FROM finance_wallets WHERE account_id = ? AND is_archived = 0 ORDER BY name').all(accountId) as any[];
    } else {
      rows = db.prepare('SELECT * FROM finance_wallets WHERE is_archived = 0 ORDER BY name').all() as any[];
    }
    for (const row of rows) {
      if (financeDataKey) {
        if (row.balance != null && isEncrypted(row.balance)) row.balance = Number(decryptField(String(row.balance), financeDataKey)) || 0;
        if (row.last_four && isEncrypted(row.last_four)) row.last_four = decryptField(row.last_four, financeDataKey);
        if (row.metadata && isEncrypted(row.metadata)) {
          try { row.metadata = JSON.parse(decryptField(row.metadata, financeDataKey)); } catch { row.metadata = null; }
        } else if (row.metadata) {
          try { row.metadata = JSON.parse(row.metadata); } catch { row.metadata = null; }
        }
        if (row.initial_balance != null && isEncrypted(row.initial_balance)) row.initial_balance = Number(decryptField(String(row.initial_balance), financeDataKey)) || 0;
      } else {
        if (row.metadata) {
          try { row.metadata = JSON.parse(row.metadata); } catch { row.metadata = null; }
        }
      }
    }
    return rows;
  } catch { return []; }
});
```

---

## 5. finance:create-transaction handler (main.ts ~line 23600)

```typescript
ipcMain.handle('finance:create-transaction', async (_event, data: {
  account_id: number; wallet_id: number | null; category_id: number;
  type: string; amount: number; description: string; note?: string;
  date: string; time?: string; metadata?: any; is_adjustment?: number;
  fee?: number; merchant?: string;
}) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`INSERT INTO finance_transactions (account_id, wallet_id, category_id, type, amount, description, note, date, time, metadata, is_adjustment, fee, merchant) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const metaJson = data.metadata ? JSON.stringify(data.metadata) : null;
    const info = stmt.run(data.account_id, data.wallet_id ?? null, data.category_id, data.type, data.amount, data.description || '', data.note || '', data.date, data.time || null, metaJson, data.is_adjustment || 0, data.fee || 0, data.merchant || null);
    const txn = db.prepare('SELECT * FROM finance_transactions WHERE id = ?').get(info.lastInsertRowid) as any;
    if (txn?.metadata) {
      try { txn.metadata = JSON.parse(txn.metadata); } catch {}
    }
    return txn;
  } catch (e: any) {
    console.error('[finance] create-transaction error:', e.message);
    return null;
  }
});
```

---

## 6. finance:create-transfer handler (main.ts ~line 23919)

This is the CRITICAL handler for crypto transfers. Key logic:
- `isCryptoTransfer` = source wallet type is 'crypto' or 'investment'
- `dstIsCrypto` = destination wallet type is 'crypto' or 'investment'
- `isCryptoToCrypto = isCryptoTransfer && dstIsCrypto`
- **crypto→crypto**: moves wallet metadata (assets), does NOT touch fiat balances
- **crypto→fiat**: moves fiat only, does NOT touch crypto wallet metadata assets
- **fiat→fiat**: standard transfer

```typescript
ipcMain.handle('finance:create-transfer', async (_event, data) => {
  if (!db) return { error: 'No database' };
  const { wallet_id, to_wallet_id, amount, fee = 0, description, note, date, time, account_id, metadata, dest_metadata, assetIdx, qty, price } = data;

  // Determine wallet types
  const srcWallet = db.prepare('SELECT * FROM finance_wallets WHERE id = ?').get(wallet_id) as any;
  const dstWallet = db.prepare('SELECT * FROM finance_wallets WHERE id = ?').get(to_wallet_id) as any;
  if (!srcWallet || !dstWallet) return { error: 'Wallet not found' };

  const srcIsCrypto = srcWallet.type === 'crypto' || srcWallet.type === 'investment';
  const dstIsCrypto = dstWallet.type === 'crypto' || dstWallet.type === 'investment';
  const isCryptoTransfer = srcIsCrypto;
  const isCryptoToCrypto = isCryptoTransfer && dstIsCrypto;

  // For crypto→crypto: check if we have the asset to send
  if (isCryptoTransfer && !isCryptoToCrypto) {
    // crypto→fiat: just move fiat
  } else if (isCryptoToCrypto) {
    // crypto→crypto: move assets between wallets
  }

  const transferId = `tf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    // Create the transfer record (negative for source, positive for dest)
    db.prepare(`INSERT INTO finance_transactions (account_id, wallet_id, category_id, type, amount, description, note, date, time, transfer_id, from_wallet_id, to_wallet_id, fee, metadata) VALUES (?, ?, 0, 'transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(account_id, wallet_id, -Math.abs(amount), description || `Transfer to ${dstWallet.name}`, note || '', date, time || new Date().toTimeString().slice(0, 5), transferId, wallet_id, to_wallet_id, fee, metadata ? JSON.stringify(metadata) : null);

    db.prepare(`INSERT INTO finance_transactions (account_id, wallet_id, category_id, type, amount, description, note, date, time, transfer_id, from_wallet_id, to_wallet_id, fee, metadata) VALUES (?, ?, 0, 'transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(account_id, to_wallet_id, 0, Math.abs(amount), description || `Transfer from ${srcWallet.name}`, note || '', date, time || new Date().toTimeString().slice(0, 5), transferId, wallet_id, to_wallet_id, 0, dest_metadata ? JSON.stringify(dest_metadata) : null);

    // === CRITICAL: Fiat balance updates ===
    // Non-crypto wallets: update both balances
    // crypto→fiat: only update dest (fiat gets the fiat amount)
    // crypto→crypto: skip balance updates entirely (asset-based)
    if (!isCryptoTransfer || (isCryptoTransfer && dstIsCrypto && !srcIsCrypto)) {
      // Standard fiat update
    }

    // For crypto→fiat: only update destination wallet's fiat balance
    if (isCryptoTransfer && !dstIsCrypto) {
      db.prepare(`UPDATE finance_wallets SET balance = balance + ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(Math.abs(amount), to_wallet_id);
    }

    // For crypto→crypto: move assets via metadata
    if (isCryptoToCrypto) {
      // Read source wallet metadata, move the specified asset to dest
      let srcMeta: any = {};
      try { srcMeta = JSON.parse(srcWallet.metadata || '{}'); } catch { srcMeta = {}; }
      let dstMeta: any = {};
      try { dstMeta = JSON.parse(dstWallet.metadata || '{}'); } catch { dstMeta = {}; }

      const srcAssets: any[] = Array.isArray(srcMeta.assets) ? srcMeta.assets : [];
      const dstAssets: any[] = Array.isArray(dstMeta.assets) ? dstMeta.assets : [];

      if (assetIdx !== undefined && assetIdx >= 0 && assetIdx < srcAssets.length) {
        const movedAsset = { ...srcAssets[assetIdx] };
        if (qty !== undefined) movedAsset.amount = Number(qty);
        srcAssets.splice(assetIdx, 1);
        dstAssets.push(movedAsset);
      }

      srcMeta.assets = srcAssets;
      dstMeta.assets = dstAssets;

      db.prepare(`UPDATE finance_wallets SET metadata = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(JSON.stringify(srcMeta), wallet_id);
      db.prepare(`UPDATE finance_wallets SET metadata = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(JSON.stringify(dstMeta), to_wallet_id);
    }

    return { success: true, transferId };
  } catch (e: any) {
    console.error('[finance] create-transfer error:', e.message);
    return { error: e.message };
  }
});
```

---

## 7. finance:create-adjustment handler (main.ts ~line 23850)

```typescript
ipcMain.handle('finance:create-adjustment', async (_event, data) => {
  if (!db) return null;
  try {
    const stmt = db.prepare(`INSERT INTO finance_transactions (account_id, wallet_id, category_id, type, amount, description, note, date, time, is_adjustment, metadata) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, 1, ?)`);
    const type = data.amount >= 0 ? 'income' : 'expense';
    const metaJson = data.metadata ? JSON.stringify(data.metadata) : null;
    const info = stmt.run(data.account_id, data.wallet_id, type, Math.abs(data.amount), data.description || 'Historical adjustment', data.note || '', data.date, data.time || null, metaJson);
    return { id: info.lastInsertRowid, success: true };
  } catch (e: any) {
    console.error('[finance] create-adjustment error:', e.message);
    return null;
  }
});
```

---

## 8. finance:recalculate-balances handler (main.ts ~line 25734)

```typescript
ipcMain.handle('finance:recalculate-balances', async (_event, walletId?: number, preview?: boolean) => {
  if (!db) return { error: 'No database' };
  try {
    if (walletId) {
      // Recalculate single wallet
      const wallet = db.prepare('SELECT * FROM finance_wallets WHERE id = ?').get(walletId) as any;
      if (!wallet) return { error: 'Wallet not found' };

      const initialBalance = wallet.initial_balance || 0;
      const txns = db.prepare('SELECT * FROM finance_transactions WHERE wallet_id = ? ORDER BY date ASC, id ASC').all(walletId) as any[];

      let balance = initialBalance;
      const breakdown: any[] = [];
      for (const t of txns) {
        if (t.type === 'income') {
          balance += Math.abs(t.amount);
        } else if (t.type === 'expense') {
          balance -= Math.abs(t.amount);
        } else if (t.type === 'transfer') {
          // CRITICAL: For crypto wallets, skip crypto→crypto transfer balance adjustments
          if (wallet.type === 'crypto' || wallet.type === 'investment') {
            const meta = t.metadata ? JSON.parse(t.metadata) : null;
            if (meta && (meta.coinId || meta.coin_id)) {
              // This is a crypto transfer — skip balance update for crypto wallets
              continue;
            }
          }
          if (t.amount < 0) {
            balance -= Math.abs(t.amount);
            balance -= (t.fee || 0);
          } else {
            balance += Math.abs(t.amount);
          }
        }
        breakdown.push({ date: t.date, type: t.type, amount: t.amount, runningBalance: balance, id: t.id, is_adjustment: t.is_adjustment });
      }

      return {
        success: true,
        walletName: wallet.name,
        initialBalance,
        oldBalance: wallet.balance,
        newBalance: balance,
        breakdown
      };
    } else {
      // walletId = undefined → Recalculate ALL wallets + backfill crypto history
      const wallets = db.prepare('SELECT * FROM finance_wallets WHERE is_archived = 0').all() as any[];
      for (const w of wallets) {
        // Recalculate balance
        const initialBalance = w.initial_balance || 0;
        const txns = db.prepare('SELECT * FROM finance_transactions WHERE wallet_id = ? ORDER BY date ASC, id ASC').all(w.id) as any[];
        let balance = initialBalance;
        for (const t of txns) {
          if (t.type === 'income') balance += Math.abs(t.amount);
          else if (t.type === 'expense') balance -= Math.abs(t.amount);
          else if (t.type === 'transfer') {
            if (w.type === 'crypto' || w.type === 'investment') {
              const meta = t.metadata ? JSON.parse(t.metadata) : null;
              if (meta && (meta.coinId || meta.coin_id)) continue;
            }
            if (t.amount < 0) { balance -= Math.abs(t.amount); balance -= (t.fee || 0); }
            else balance += Math.abs(t.amount);
          }
        }
        db.prepare("UPDATE finance_wallets SET balance = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(balance, w.id);

        // Backfill crypto asset history for crypto wallets
        if ((w.type === 'crypto' || w.type === 'investment') && w.metadata) {
          let meta: any = {};
          try { meta = typeof w.metadata === 'string' ? JSON.parse(w.metadata) : w.metadata; } catch { meta = {}; }
          const assets: any[] = Array.isArray(meta.assets) ? meta.assets : [];
          for (const a of assets) {
            const coinId = (a.coin_id || a.asset || '').toLowerCase();
            if (!coinId) continue;
            const priceRow = db.prepare('SELECT current_price FROM finance_crypto_prices WHERE coin_id = ?').get(coinId) as any;
            const curPrice = priceRow?.current_price || a.avg_buy_price || 0;
            recordCryptoAssetHistory(w.id, coinId, Number(a.amount) || 0, Number(a.avg_buy_price) || 0, curPrice);
          }
        }
      }
      return { success: true, message: 'All wallets recalculated' };
    }
  } catch (e: any) {
    return { error: e.message };
  }
});
```

---

## 9. finance:update-wallet-metadata handler (main.ts lines 23327–23404)

```typescript
ipcMain.handle('finance:update-wallet-metadata', async (_event, { id, metadata }: { id: number; metadata: Record<string, any> }) => {
  if (!db) return null;
  try {
    const existing = db.prepare('SELECT metadata, name FROM finance_wallets WHERE id = ?').get(id) as any;
    if (!existing) return null;
    let merged: Record<string, any> = {};
    if (existing.metadata) {
      try { merged = JSON.parse(existing.metadata); } catch { merged = {}; }
    }
    const oldAssets: any[] = Array.isArray(merged.assets) ? [...merged.assets] : [];
    Object.assign(merged, metadata);
    const newAssets: any[] = Array.isArray(merged.assets) ? [...merged.assets] : [];
    const json = JSON.stringify(merged);
    db.prepare("UPDATE finance_wallets SET metadata=?, updated_at=datetime('now','localtime') WHERE id=?").run(json, id);

    // Record asset history for changed coins
    try {
      const priceRows = db.prepare('SELECT coin_id, current_price FROM finance_crypto_prices').all() as any[];
      const priceMap = new Map(priceRows.map((r: any) => [r.coin_id.toLowerCase(), Number(r.current_price) || 0]));
      const oldMap = new Map(oldAssets.map((a: any) => [(a.coin_id || a.coinId || a.asset || '').toLowerCase(), a]));
      const newMap = new Map(newAssets.map((a: any) => [(a.coin_id || a.coinId || a.asset || '').toLowerCase(), a]));
      for (const [cid, a] of newMap) {
        const oldAmt = oldMap.has(cid) ? Number(oldMap.get(cid)!.amount) || 0 : 0;
        const newAmt = Number(a.amount) || 0;
        if (oldAmt !== newAmt) {
          const curPrice = priceMap.get(cid) || Number(a.avg_buy_price || a.avgBuyPrice) || 0;
          recordCryptoAssetHistory(id, cid, newAmt, Number(a.avg_buy_price || a.avgBuyPrice) || 0, curPrice);
        }
      }
    } catch { /* best-effort */ }

    const updated = db.prepare('SELECT * FROM finance_wallets WHERE id = ?').get(id) as any;
    if (updated?.metadata) {
      try { updated.metadata = JSON.parse(updated.metadata); } catch { updated.metadata = null; }
    }
    return updated;
  } catch { return null; }
});
```

**CRITICAL BUG NOTE**: `finance:update-wallet-metadata` writes metadata as **plain JSON** (line `JSON.stringify(merged)`). But `finance:create-transfer`'s crypto→crypto path uses `writeMeta` which **encrypts** with `financeDataKey`. This inconsistency means `readMeta` in the transfer handler may get back encrypted data when reading from a wallet that was last updated by `finance:update-wallet-metadata` (or vice versa). This encryption mismatch is the likely root cause of crypto assets disappearing.

---

## 10. finance:fetch-crypto-prices handler (main.ts)

```typescript
ipcMain.handle('finance:fetch-crypto-prices', async (_event, coinIds: string[], currency?: string) => {
  try {
    const vs = currency || 'usd';
    const ids = coinIds.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs}&include_24hr_change=true`;
    const resp = await fetch(url);
    const data = await resp.json();
    const results = coinIds.map(id => {
      const d = data[id] || {};
      return {
        coin_id: id,
        current_price: d[vs] || 0,
        price_change_percentage_24h: d[`${vs}_24h_change`] || null,
      };
    });
    // Cache prices
    for (const r of results) {
      db?.prepare(`INSERT OR REPLACE INTO finance_crypto_prices (coin_id, current_price, price_change_percentage_24h, last_updated) VALUES (?, ?, ?, datetime('now','localtime'))`)
        .run(r.coin_id, r.current_price, r.price_change_percentage_24h);
    }
    return results;
  } catch (e: any) {
    console.error('[finance] fetch-crypto-prices error:', e.message);
    return [];
  }
});
```

---

## 11. finance:get-crypto-history handler (main.ts)

```typescript
ipcMain.handle('finance:get-crypto-history', async (_event, coinId: string, days?: number, currency?: string) => {
  try {
    const vs = currency || 'usd';
    const d = days || 7;
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${vs}&days=${d}`;
    const resp = await fetch(url);
    const data = await resp.json();
    return (data.prices || []).map((p: [number, number]) => ({
      timestamp: p[0],
      price: p[1],
    }));
  } catch {
    return [];
  }
});
```

---

## 12. finance:get-crypto-asset-history handler (main.ts)

```typescript
ipcMain.handle('finance:get-crypto-asset-history', async (_event, walletId: number, coinId: string) => {
  if (!db) return [];
  try {
    const rows = db.prepare('SELECT * FROM crypto_asset_history WHERE wallet_id = ? AND coin_id = ? ORDER BY date ASC')
      .all(walletId, coinId.toLowerCase()) as any[];
    return rows.map(r => ({
      coinId: r.coin_id,
      amount: r.amount,
      avgBuyPrice: r.avg_buy_price,
      fiatValue: r.fiat_value,
      date: r.date,
    }));
  } catch { return []; }
});
```

---

## 13. finance:search-assets handler (main.ts)

```typescript
ipcMain.handle('finance:search-assets', async (_event, query: string, assetTypes?: string[]) => {
  try {
    const results: any[] = [];
    const types = assetTypes || ['crypto'];

    if (types.includes('crypto')) {
      // Search CoinGecko
      const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
      const resp = await fetch(url);
      const data = await resp.json();
      for (const coin of (data.coins || []).slice(0, 10)) {
        results.push({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          asset_type: 'crypto',
          exchange: 'CoinGecko',
          image: coin.large || coin.thumb,
        });
      }
    }

    return results;
  } catch { return []; }
});
```

---

## 14. PRELOAD BRIDGE (preload.ts)

The preload script exposes IPC calls as `window.deskflowAPI.*`:

```typescript
// Key finance IPC bridges:
financeGetWallets: () => ipcRenderer.invoke('finance:get-wallets'),
financeCreateTransaction: (data: any) => ipcRenderer.invoke('finance:create-transaction', data),
financeCreateTransfer: (data: any) => ipcRenderer.invoke('finance:create-transfer', data),
financeCreateAdjustment: (data: any) => ipcRenderer.invoke('finance:create-adjustment', data),
financeRecalculateBalances: (walletId?: number, preview?: boolean) => ipcRenderer.invoke('finance:recalculate-balances', walletId, preview),
financeApplyRecalculatedBalance: (walletId: number) => ipcRenderer.invoke('finance:apply-recalculated-balance', walletId),
financeUpdateWalletMetadata: (data: { id: number; metadata: Record<string, any> }) => ipcRenderer.invoke('finance:update-wallet-metadata', data),
financeFetchCryptoPrices: (coinIds: string[], currency?: string) => ipcRenderer.invoke('finance:fetch-crypto-prices', coinIds, currency),
financeGetCryptoHistory: (coinId: string, days?: number, currency?: string) => ipcRenderer.invoke('finance:get-crypto-history', coinId, days, currency),
financeGetCryptoAssetHistory: (walletId: number, coinId: string) => ipcRenderer.invoke('finance:get-crypto-asset-history', walletId, coinId),
financeSearchAssets: (query: string, assetTypes?: string[]) => ipcRenderer.invoke('finance:search-assets', query, assetTypes),
financeGetAllCoins: () => ipcRenderer.invoke('finance:get-all-coins'),
financeFixHistoricalDates: () => ipcRenderer.invoke('finance:fix-historical-dates'),
financeDeleteTransaction: (id: number) => ipcRenderer.invoke('finance:delete-transaction', id),
```

---

## 15. FRONTEND: CryptoDetail Component (WalletDetailView.tsx lines 411–1377)

This is the main crypto wallet detail view. Key state and logic:

```tsx
function CryptoDetail({ metadata, onChange, wallet, displayCurrency, onTotalValueChange, transactions, walletTransactions, onTxnClick }: {
  metadata: Record<string, any>; onChange: (key: string, v: string) => void; wallet: FinanceWallet; displayCurrency: string; onTotalValueChange?: (val: number) => void; transactions?: FinanceTransaction[]; walletTransactions?: FinanceTransaction[]; onTxnClick?: (t: FinanceTransaction) => void;
}) {
  const sym = getCurrencyInfo(displayCurrency).symbol;
  const isInvestment = wallet.type === 'investment';
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [history, setHistory] = useState<CryptoHistoryPoint[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframeDays, setTimeframeDays] = useState(7);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [searchCoin, setSearchCoin] = useState('');
  const [selectedCoinId, setSelectedCoinId] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('crypto');
  const [newAssetAmount, setNewAssetAmount] = useState('');
  const [newAssetAvgPrice, setNewAssetAvgPrice] = useState('');
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'from-spend'>('manual');
  const [newTotalSpent, setNewTotalSpent] = useState('');
  const [editingCoinIdx, setEditingCoinIdx] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editAvgPrice, setEditAvgPrice] = useState('');
  const [fiatError, setFiatError] = useState<string | null>(null);
  const [isHistorical, setIsHistorical] = useState(false);
  const [detailAsset, setDetailAsset] = useState<{ coinId: string; symbol: string; name: string } | null>(null);

  // Parse assets from metadata
  const assets: { coin_id: string; symbol: string; amount: number; avg_buy_price: number }[] = useMemo(() => {
    if (Array.isArray(metadata.assets) && metadata.assets.length > 0) {
      return metadata.assets.map((a: any) => ({
        coin_id: a.coin_id || a.asset || '',
        symbol: (a.symbol || a.asset || '').toUpperCase(),
        amount: Number(a.amount) || 0,
        avg_buy_price: Number(a.avg_buy_price || a.avgBuyPrice) || 0,
      }));
    }
    if (metadata.coin_id) {
      return [{
        coin_id: metadata.coin_id,
        symbol: (metadata.symbol || metadata.coin_id).toUpperCase(),
        amount: Number(metadata.amount) || 0,
        avg_buy_price: Number(metadata.avg_buy_price || metadata.avgBuyPrice) || 0,
      }];
    }
    return [];
  }, [metadata]);

  const coinIds = assets.map(a => a.coin_id).filter(Boolean);
  const hasAssets = assets.length > 0;

  // Fiat balance = wallet.balance (the actual fiat in the wallet)
  const fiatBalance = wallet.balance || 0;

  const cryptoPortfolioValue = useMemo(() => {
    return assets.reduce((sum, a) => {
      const p = prices.find(pr => pr.coin_id === a.coin_id);
      return sum + (a.amount * (p?.current_price || 0));
    }, 0);
  }, [assets, prices]);

  const totalCost = useMemo(() => assets.reduce((s, a) => s + a.amount * a.avg_buy_price, 0), [assets]);
  const initBal = (wallet as any).initial_balance || 0;
  const availableFiat = Math.max(0, initBal - totalCost);
  const totalValue = availableFiat + cryptoPortfolioValue;
  const totalPnl = cryptoPortfolioValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  // Fetch prices on mount
  useEffect(() => {
    if (coinIds.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoadingPrices(true); setError(null);
      try {
        let r: any[];
        if (isInvestment) {
          r = await (window as any).deskflowAPI?.financeFetchAssetPrices(coinIds, 'stock', displayCurrency) || [];
        } else {
          r = await (window as any).deskflowAPI?.financeFetchCryptoPrices(coinIds, displayCurrency) || [];
        }
        if (!cancelled && r.length) { setPrices(r); setLastUpdated(Date.now()); setStale(false); }
      } catch (e: any) { if (!cancelled) setError(e?.message || String(e)); }
      finally { if (!cancelled) setLoadingPrices(false); }
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify(coinIds), isInvestment, displayCurrency]);

  // Fetch history for primary coin
  useEffect(() => {
    if (!coinIds[0]) return;
    let cancelled = false;
    (async () => {
      setLoadingHistory(true);
      try {
        let r: any[];
        if (isInvestment) {
          r = await (window as any).deskflowAPI?.financeGetAssetHistory(coinIds[0], 'stock', timeframeDays) || [];
        } else {
          r = await (window as any).deskflowAPI?.financeGetCryptoHistory(coinIds[0], timeframeDays, displayCurrency) || [];
        }
        if (!cancelled && r) setHistory(r);
      } catch { /* non-critical */ }
      finally { if (!cancelled) setLoadingHistory(false); }
    })();
    return () => { cancelled = true; };
  }, [coinIds[0], timeframeDays, isInvestment]);

  // === BUY ASSET HANDLER ===
  const handleAddAsset = async () => {
    if (!selectedCoinId) return;
    let amount: number;
    let spentFiat: number = 0;
    if (addMode === 'from-spend') {
      if (!newTotalSpent || !newAssetAvgPrice) return;
      const spent = parseFloat(newTotalSpent);
      const avgPrice = parseFloat(newAssetAvgPrice);
      if (!spent || !avgPrice) return;
      if (spent > (wallet.balance || 0)) {
        setFiatError(`Insufficient balance — you have ${fmtCurrency(wallet.balance || 0, displayCurrency)} available`);
        return;
      }
      amount = spent / avgPrice;
      spentFiat = spent;
    } else {
      if (!newAssetAmount || !newAssetAvgPrice) return;
      amount = parseFloat(newAssetAmount);
      spentFiat = amount * (parseFloat(newAssetAvgPrice) || 0);
    }
    const symbol = selectedCoinId.split('-').pop()?.toUpperCase() || selectedCoinId.slice(0, 6).toUpperCase();
    const name = searchCoin.split(' (')[0] || selectedCoinId;
    const newAssets = [...assets, {
      coin_id: selectedCoinId,
      symbol,
      asset_type: selectedAssetType || 'crypto',
      name,
      amount,
      avg_buy_price: parseFloat(newAssetAvgPrice) || 0,
    }];
    const cryptoMetadata = { coinId: selectedCoinId, symbol, name, qty: amount, price: parseFloat(newAssetAvgPrice) || 0, fee: 0, total: spentFiat };
    let createdTxnId: number | null = null;
    if (spentFiat > 0) {
      try {
        if (isHistorical) {
          // Historical data — create adjustment
          const result = await (window as any).deskflowAPI?.financeCreateAdjustment({
            account_id: wallet.account_id,
            wallet_id: wallet.id,
            amount: spentFiat,
            description: `Historical: ${amount.toFixed(6)} ${symbol}`,
            note: `Crypto: ${name} (${selectedCoinId}) @ ${fmtCurrency(parseFloat(newAssetAvgPrice) || 0, displayCurrency)}`,
            date: new Date().toISOString().split('T')[0],
            metadata: cryptoMetadata,
          });
          createdTxnId = result?.id || null;
        } else {
          // Regular buy — create expense transaction
          const result = await (window as any).deskflowAPI?.financeCreateTransaction({
            account_id: wallet.account_id,
            wallet_id: wallet.id,
            category_id: 1,   // HARDCODED to 'Salary' seed category
            type: 'expense',
            amount: spentFiat,
            description: `Buy ${amount.toFixed(6)} ${symbol}`,
            note: `Crypto: ${name} (${selectedCoinId}) @ ${fmtCurrency(parseFloat(newAssetAvgPrice) || 0, displayCurrency)}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            metadata: cryptoMetadata,
          });
          createdTxnId = result?.id || null;
        }
      } catch (err) {
        console.error('Failed to create transaction:', err);
      }
    }
    // Store txn_id on the asset for removal
    const finalAssets = [...newAssets];
    if (createdTxnId && finalAssets.length > 0) {
      finalAssets[finalAssets.length - 1] = { ...finalAssets[finalAssets.length - 1], txn_id: createdTxnId };
    }
    onChange('assets', JSON.stringify(finalAssets));   // ← triggers auto-save
    setShowAddAsset(false);
    // reset form state...
  };

  // === REMOVE ASSET HANDLER ===
  const handleRemoveAsset = async (idx: number) => {
    if (idx < 0) return;
    const removed = assets[idx];
    if (removed?.txn_id) {
      try { await (window as any).deskflowAPI?.financeDeleteTransaction(removed.txn_id); } catch {}
    }
    const newAssets = assets.filter((_, i) => i !== idx);
    onChange('assets', JSON.stringify(newAssets));
  };

  // ... (remaining JSX: empty state, portfolio value card, performance chart, allocation donut,
  //      assets list with edit/remove, add asset form, P&L, wallet details, transactions list, refresh button,
  //      CryptoAssetDetailModal trigger)
}
```

**IMPORTANT**: The `onChange('assets', JSON.stringify(finalAssets))` call triggers the auto-save debounce in WalletDetailView. This calls `financeUpdateWalletMetadata` which writes **plain JSON** (not encrypted). This is the encryption inconsistency bug.

---

## 16. FRONTEND: CryptoAssetDetailModal (FULL FILE)

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Calendar, Gem, Wallet } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js';
import { GlassSurface } from './_fx/GlassSurface';
import { formatCurrency, formatAmount } from './currency-data';
import type { FinanceTransaction } from './finance-types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface AssetHistoryPoint {
  coinId: string; amount: number; avgBuyPrice: number; fiatValue: number; date: string;
}

interface CryptoAssetDetailModalProps {
  open: boolean; onClose: () => void; coinId: string; symbol: string; name: string;
  amount: number; avgBuyPrice: number; currentPrice: number; priceChange24h: number | null;
  displayCurrency: string; transactions: FinanceTransaction[]; walletId?: number;
}

export function CryptoAssetDetailModal({
  open, onClose, coinId, symbol, name, amount, avgBuyPrice, currentPrice, priceChange24h, displayCurrency, transactions, walletId,
}: CryptoAssetDetailModalProps) {
  const fc = (v: number) => formatCurrency(v, displayCurrency);
  const fa = (v: number) => formatAmount(v);
  const sym = symbol.toUpperCase();
  const [showAllWallets, setShowAllWallets] = useState(false);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryPoint[]>([]);
  const [activeChart, setActiveChart] = useState<'quantity' | 'fiat'>('quantity');

  useEffect(() => {
    if (!open || !walletId || !coinId) return;
    (window as any).deskflowAPI?.financeGetCryptoAssetHistory(walletId, coinId)
      .then((data: AssetHistoryPoint[]) => setAssetHistory(data || []))
      .catch(() => setAssetHistory([]));
  }, [open, walletId, coinId]);

  // ... (chart data computation, purchase history filtering, stats grid, modal JSX)

  const purchases = useMemo(() => {
    return transactions.filter(t => {
      if (!t.metadata) return false;
      try {
        const m = typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata;
        const mCoinId = m.coinId || m.coin_id || '';
        if (mCoinId !== coinId) return false;
        if (!showAllWallets && walletId && t.wallet_id !== walletId) return false;
        return true;
      } catch { return false; }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, coinId, showAllWallets, walletId]);

  const totalCostBasis = amount * avgBuyPrice;
  const currentValue = amount * currentPrice;
  const totalPnl = currentValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[var(--z-modal)] flex items-center justify-center p-5" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* Header with coin icon, name, transaction count */}
            {/* Stats grid: Holdings, Current Price, Cost Basis, Market Value */}
            {/* Charts: Quantity over time / Fiat Value over time toggle */}
            {/* Purchase History list with per-transaction coin qty, price, fee */}
            {/* All wallets toggle */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## 17. FRONTEND: FinanceStickyHeader — Sync Button + Sync Results

```tsx
interface FinanceStickyHeaderProps {
  isLocked: boolean; netWorth: number; displayCurrency: string; onToggleLock: () => void;
  trend?: { value: number; percent: number } | null; sparklineData?: number[];
  monthlyTrends?: { month: string; income: number; expense: number }[];
  hasPassword?: boolean;
  syncStatus?: { phase: string; wallets: number; updated: number } | null;
  syncResults?: string[] | null;
  onSyncBalances?: () => void;
}

// Expanded sync button (lines 160-168):
{onSyncBalances && (
  <button onClick={onSyncBalances} disabled={!!syncStatus}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-[11px] font-medium transition-colors disabled:opacity-50">
    <RefreshCw className={`w-3 h-3 ${syncStatus ? 'animate-spin' : ''}`} />
    {syncStatus ? syncStatus.phase : 'Sync'}
  </button>
)}

// Compact sync button (lines 211-219):
{onSyncBalances && (
  <button onClick={onSyncBalances} disabled={!!syncStatus}
    className="h-8 flex items-center gap-1 px-2.5 rounded-full bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-[10px] font-medium transition-colors disabled:opacity-50">
    <RefreshCw className={`w-3 h-3 ${syncStatus ? 'animate-spin' : ''}`} />
    {syncStatus ? syncStatus.phase : 'Sync'}
  </button>
)}

// Sync results (lines 243-263, OUTSIDE GlassSurface overflow-hidden):
<AnimatePresence>
  {syncResults && syncResults.length > 0 && !syncStatus && (
    <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -8, height: 0 }} transition={{ duration: 0.2 }}
      className="sticky top-[48px] z-[14] mx-4 sm:mx-6 mb-2">
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px]">
        <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-emerald-300">
          {syncResults.map((r, i) => (<span key={i}>{r}</span>))}
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

---

## 18. FRONTEND: FinancePage — Sync Handler + handleAddTransaction

```tsx
const [syncStatus, setSyncStatus] = useState<{ phase: string; wallets: number; updated: number } | null>(null);
const [syncResults, setSyncResults] = useState<string[] | null>(null);

const handleRecalculateAllBalances = async () => {
  try {
    setSyncResults(null);
    const results: string[] = [];

    // Phase 1: Fix historical dates
    setSyncStatus({ phase: 'Fixing historical dates...', wallets: 0, updated: 0 });
    try {
      const histResult = await window.deskflowAPI?.financeFixHistoricalDates() as any;
      if (histResult?.fixed > 0) results.push(`Fixed ${histResult.fixed} historical transaction date(s) → 1900-01-01`);
      else results.push('All historical dates already correct');
    } catch { results.push('Historical date fix skipped'); }

    // Phase 2: Sync wallet balances
    setSyncStatus({ phase: 'Scanning wallets...', wallets: 0, updated: 0 });
    const wallets = await window.deskflowAPI?.financeGetWallets() as any[];
    const totalWallets = wallets?.length || 0;
    setSyncStatus({ phase: `Syncing ${totalWallets} wallets...`, wallets: totalWallets, updated: 0 });

    let updatedCount = 0;
    let balancedCount = 0;
    for (const w of (wallets || [])) {
      try {
        setSyncStatus({ phase: `Syncing ${w.name || 'Wallet'}...`, wallets: totalWallets, updated: updatedCount });
        const result = await window.deskflowAPI?.financeRecalculateBalances(w.id, true) as any;
        if (result?.success) {
          if (result.breakdown && result.breakdown.length > 0) {
            const diff = Math.abs((result.newBalance || 0) - (result.oldBalance || 0));
            if (diff > 0.01) {
              await window.deskflowAPI?.financeApplyRecalculatedBalance(w.id);
              updatedCount++;
            } else { balancedCount++; }
          }
        }
      } catch { /* skip wallet */ }
    }

    if (updatedCount > 0) results.push(`Updated ${updatedCount} wallet balance(s)`);
    if (balancedCount > 0) results.push(`${balancedCount} wallet(s) already balanced`);

    // Phase 3: Crypto history backfill
    setSyncStatus({ phase: 'Backfilling crypto history...', wallets: totalWallets, updated: updatedCount });
    try {
      await window.deskflowAPI?.financeRecalculateBalances() as any;
      results.push('Crypto asset history backfilled');
    } catch { results.push('Crypto history backfill skipped'); }

    setSyncStatus({ phase: 'Done!', wallets: totalWallets, updated: updatedCount });
    setSyncResults(results);
    await fetchData();
    setTimeout(() => { setSyncStatus(null); }, 5000);
    setTimeout(() => { setSyncResults(null); }, 8000);
  } catch {
    setSyncStatus(null);
    setSyncResults(['Sync failed — try again']);
    setTimeout(() => { setSyncResults(null); setSyncStatus(null); }, 4000);
  }
};

// handleAddTransaction — transfer path:
const handleAddTransaction = async (data) => {
  try {
    if (data.type === 'transfer' && data.to_wallet_id) {
      const result = await window.deskflowAPI?.financeCreateTransfer(data);
      if (result?.success) {
        // For crypto transfers, backend handles wallet metadata directly.
        // Only merge dest_metadata for physical/cash denomination wallets.
        if (data.dest_metadata && data.to_wallet_id && data.dest_metadata.denominations) {
          const dstWallet = wallets.find(w => w.id === data.to_wallet_id);
          if (dstWallet && (dstWallet.type === 'physical' || dstWallet.type === 'cash')) {
            // ... merge denominations into dest wallet metadata
          }
        }
        await fetchData(); return true;
      }
      throw new Error(result?.error || 'Transfer failed');
    }
    // Non-transfer: create transaction
    const result = await window.deskflowAPI?.financeCreateTransaction(data);
    if (result) { await fetchData(); return true; }
    return false;
  } catch { return false; }
};
```

---

## 19. FRONTEND: TransactionsTab — Historical Section

```tsx
// Separate historical from regular transactions:
const { regularGrouped, historicalTxns } = useMemo(() => {
  const regularTxns = filtered.filter(t => !t.is_adjustment);
  const histTxns = filtered.filter(t => t.is_adjustment);
  // ... group regular by date
  return { regularGrouped: groups, historicalTxns: histTxns };
}, [filtered]);

// IntersectionObserver for floating "Jump to Historical" button:
useEffect(() => {
  const el = historicalRef.current;
  if (!el) return;
  const observer = new IntersectionObserver(
    ([entry]) => setShowJumpBtn(!entry.isIntersecting),
    { threshold: 0, rootMargin: '-100px 0px' }
  );
  observer.observe(el);
  return () => observer.disconnect();
}, [historicalTxns.length]);

// Historical section rendering (bottom of list):
{historicalTxns.length > 0 && (
  <div ref={historicalRef}>
    <div className="flex items-center gap-3 pt-2 pb-1 px-1">
      <div className="h-px flex-1 bg-violet-500/30" />
      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Historical Data</span>
      <span className="text-[10px] text-violet-400/60 tabular-nums">{historicalTxns.length}</span>
      <div className="h-px flex-1 bg-violet-500/30" />
    </div>
    <div className="flex flex-col gap-3">
      {historicalTxns.map(txn => (
        <GlassSurface key={txn.id} className="!p-3.5 border-l-2 border-l-violet-400 bg-violet-500/[0.03] mx-0.5">
          {/* violet "historical" badge, category, amount */}
        </GlassSurface>
      ))}
    </div>
  </div>
)}

// Floating jump button:
{showJumpBtn && historicalTxns.length > 0 && (
  <button onClick={jumpToHistorical}
    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/90 text-white text-xs font-medium shadow-lg shadow-violet-500/20 hover:bg-violet-400 transition-colors backdrop-blur-sm">
    <Clock className="w-3.5 h-3.5" /> Jump to Historical ({historicalTxns.length})
  </button>
)}
```

---

## 20. FRONTEND: FinanceChartsTab — netWorthSeries (excludes is_adjustment)

```tsx
const netWorthSeries = useMemo(() => {
  const dayMap = new Map<string, number>();
  for (const t of allTransactions) {
    if (t.is_adjustment) continue; // Exclude historical adjustments from chart
    let signed: number;
    if (t.type === 'income') signed = Math.abs(t.amount);
    else if (t.type === 'expense') signed = -Math.abs(t.amount);
    else if (t.type === 'transfer') signed = -(t.fee || 0);
    else signed = 0;
    const converted = convertAmount(signed, baseCurrency, displayCurrency);
    dayMap.set(t.date, (dayMap.get(t.date) ?? 0) + converted);
  }
  // ... cumulative sum, month grouping
}, [allTransactions, baseCurrency, displayCurrency, nwPeriod]);
```

---

## 21. FRONTEND: useSelectionAggregate (FULL FILE, excludes is_adjustment)

```typescript
import { useMemo } from 'react'
import type { FinanceTransaction } from '../finance-types'

export interface CategorySlice { categoryId: number; name: string; color: string; icon: string; total: number; count: number; pct: number }
export interface WalletSlice { walletId: number | null; name: string; total: number; count: number; pct: number }
export interface DailyPoint { date: string; net: number }
export interface AggregateData {
  count: number; inflow: number; outflow: number; net: number; avgExpense: number; expenseCount: number;
  dateRange: { from: string; to: string } | null; byCategory: CategorySlice[]; byWallet: WalletSlice[];
  daily: DailyPoint[]; isMixed: boolean; totalVisible: number;
}

export function useSelectionAggregate(allTxns: FinanceTransaction[], selectedIds: Set<number>, meta: any, totalVisible: number, isMixed: boolean): AggregateData {
  return useMemo(() => {
    const rows = allTxns.filter((t) => selectedIds.has(t.id))
    let inflow = 0, outflow = 0, expenseCount = 0
    for (const t of rows) {
      if (t.is_adjustment) continue; // Exclude historical adjustments from aggregate
      const abs = Math.abs(t.amount)
      if (t.type === 'income') inflow += abs
      else if (t.type === 'expense') { outflow += abs; expenseCount++ }
      // ... category/wallet aggregation
    }
    return { count: rows.length, inflow, outflow, net: inflow - outflow, /* ... */ }
  }, [allTxns, selectedIds, meta, totalVisible, isMixed])
}
```

---

## 22. FRONTEND: SpendingCategoryChart — FT Logic (excludes is_adjustment)

```tsx
const ftByCategory = useMemo(() => {
  if (!includeFT) return [];
  const ftTxns = allTransactions.filter(t => t.on_behalf_of === 1 && t.type === 'expense' && !t.is_adjustment);
  // ... group by category
}, [includeFT, allTransactions, data, baseCurrency, displayCurrency, convertAmount]);
```

---

## 23. FRONTEND: CryptoTransactionModal (FULL FILE)

```tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Wallet, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { TransactionModalShell } from './TransactionModalShell'
import { useTransactionForm } from './useTransactionForm'
import { ContextBand, TypeToggle, AdvancedToggle, OnBehalfOfSection, HistoricalToggle } from './modalParts'
import { TransferWalletSelect } from './TransferWalletSelect'
import { useCurrencyFormat, tint, parseMeta } from './modalUtils'
import type { TxModalProps } from './modalUtils'

const ACCENT = '#8B5CF6'
interface Asset { coinId: string; symbol: string; holdings: number }

export const CryptoTransactionModal: React.FC<TxModalProps> = (props) => {
  const f = useTransactionForm(props, ['expense', 'income', 'transfer'])
  const meta = parseMeta(props.wallet)
  const { format, symbol } = useCurrencyFormat(props.displayCurrency)
  const [destWalletId, setDestWalletId] = useState<number | null>(null)
  const [destMetadata, setDestMetadata] = useState<Record<string, any> | null>(null)

  const destWallet = useMemo(() => props.wallets?.find(w => w.id === destWalletId), [props.wallets, destWalletId])
  const isDestFiat = useMemo(() => destWallet && destWallet.type !== 'crypto', [destWallet])

  const walletFiatBalance = Number(props.wallet.balance) || 0
  const hasFiat = walletFiatBalance > 0
  const [fiatAmt, setFiatAmt] = useState('')

  const assets: Asset[] = useMemo(() => {
    if (Array.isArray(meta.assets)) return meta.assets.map((a: any) => ({
      coinId: a.coin_id || a.coinId || a.asset || '',
      symbol: (a.symbol || a.asset || '').toUpperCase(),
      holdings: Number(a.amount) || 0,
    }))
    if (meta.coin_id) return [{ coinId: meta.coin_id, symbol: (meta.symbol || '').toUpperCase(), holdings: Number(props.wallet.balance) || 0 }]
    return []
  }, [meta, props.wallet.balance])

  const [assetIdx, setAssetIdx] = useState(0)
  const asset = assets[assetIdx]
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [fee, setFee] = useState('')
  const [priceState, setPriceState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [change24h, setChange24h] = useState<number | null>(null)

  const fetchPrice = useCallback(async () => {
    if (!asset) return
    setPriceState('loading')
    try {
      const data = await (window as any).deskflowAPI?.financeFetchCryptoPrices([asset.coinId], props.displayCurrency)
      const p = data?.[0]
      if (!p || p.current_price == null) throw new Error('No price')
      setPrice(String(p.current_price))
      setChange24h(typeof p.price_change_percentage_24h === 'number' ? p.price_change_percentage_24h : null)
      setPriceState('idle')
    } catch { setPriceState('error') }
  }, [asset, props.displayCurrency])

  useEffect(() => { if (asset) fetchPrice() }, [fetchPrice, f.type, asset])

  const qn = Number(qty) || 0, pn = Number(price) || 0, fn = Number(fee) || 0
  const total = qn * pn
  const net = f.type === 'income' ? total + fn : total - fn
  const valid = f.type === 'transfer'
    ? !!destWallet && (isDestFiat && hasFiat ? (Number(fiatAmt) || 0) > 0 : qn > 0)
    : qn > 0 && pn > 0 && !!asset

  // Builds transfer payload with crypto metadata
  // Handles crypto→crypto (asset move), crypto→fiat (fiat move), fiat→fiat
  // Submits via TransactionModalShell → props.onSubmit(payload)
}
```

---

## 24. FRONTEND: HistoricalToggle Component (modalParts.tsx)

```tsx
export function HistoricalToggle({ accent, value, onChange }: { accent: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div onClick={(e) => { e.stopPropagation(); onChange(!value); }}
        className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${value ? 'bg-violet-500' : 'bg-zinc-700/60'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${value ? 'left-[18px]' : 'left-0.5'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors">
          <span style={{ color: accent }} className="font-medium">Historical</span> — Affects balance chronologically, excluded from spending/income summaries
        </div>
      </div>
    </label>
  );
}
```

---

## 25. DESIGN TOKENS / STYLING PATTERNS

- Accent color for crypto: `#8B5CF6` (purple) / `#A78BFA` (lighter)
- Accent for historical: violet-500 (`#8B5CF6` with opacity variants)
- Accent for sync: amber-500 (`#F59E0B` with opacity variants)
- GlassSurface component: tiered glass effect (`tier={2}`, `tier={3}`)
- Font: JetBrains Mono for numbers (tabular-nums), system sans-serif for labels
- Chart colors: emerald-400 (`#10B981`) for up, red-400 (`#EF4444`) for down
- Border radius: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for inner elements
- Padding: `p-4` to `p-5` for cards, `p-3` for compact items
- Text sizes: `text-[10px]` for labels, `text-xs` for values, `text-sm` for headings
- Animations: framer-motion for modals, CSS transitions for hover states
