# CONTEXT_BUNDLE.md — Crypto Wallet Display Fixes

> This bundle contains ALL relevant source code for fixing the crypto wallet display.
> The target AI must read this FIRST, then design a comprehensive fix.

---

## 1. CryptoDetail Component — Asset Derivation

**File:** `src/components/finance/WalletDetailView.tsx` lines 544-597

```typescript
const assets: { coin_id: string; symbol: string; amount: number; avg_buy_price: number }[] = useMemo(() => {
    // Derive assets from THIS wallet's transactions only
    const walletTxns = walletTransactions || [];
    const sorted = [...walletTxns].sort((a, b) => {
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
}, [walletTransactions]);
```

**Issue:** `total_cost` is the cost basis, but there's no `total_fiat_spent` tracking. The "Spent" display uses `totalCost` which is `sum(amount × avg_buy_price)` — this is the cost basis, not the actual fiat spent.

---

## 2. CryptoDetail — Display Values

**File:** `src/components/finance/WalletDetailView.tsx` lines 607-613

```typescript
const totalCost = useMemo(() => assets.reduce((s, a) => s + a.amount * a.avg_buy_price, 0), [assets]);
// For crypto wallets: available fiat is just the actual wallet balance
const availableFiat = fiatBalance;
const totalValue = availableFiat + cryptoPortfolioValue;

const totalPnl = cryptoPortfolioValue - totalCost;
const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
```

---

## 3. CryptoDetail — "Fiat" / "Spent" / "Available" Display

**File:** `src/components/finance/WalletDetailView.tsx` lines 1182-1196

```tsx
{/* Fiat balance breakdown */}
<div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 text-[11px]">
  <span className="text-zinc-500">Fiat</span>
  <span className="text-zinc-300 font-medium tabular-nums">{fmtCurrency(availableFiat, displayCurrency)}</span>
  {totalCost > 0 && (
    <>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-500">Spent</span>
      <span className="text-zinc-400 tabular-nums">{fmtCurrency(totalCost, displayCurrency)}</span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-500">Available</span>
      <span className={`font-medium tabular-nums ${availableFiat > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtCurrency(availableFiat, displayCurrency)}</span>
    </>
  )}
</div>
```

**Issue:** "Fiat" and "Available" show the same value (`availableFiat`). Should be combined.

---

## 4. CryptoDetail — P&L Display

**File:** `src/components/finance/WalletDetailView.tsx` lines 1197-1207

```tsx
{totalCost > 0 && (
  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 text-[11px]">
    <span className="text-zinc-500">P&amp;L</span>
    <span className={`font-medium tabular-nums ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {fmtCurrency(totalPnl, displayCurrency)}
    </span>
    <span className={`tabular-nums ${totalPnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
      ({fmtPct(totalPnlPct, 1)}%)
    </span>
  </div>
)}
```

---

## 5. CryptoDetail — 24h Percentage

**File:** `src/components/finance/WalletDetailView.tsx` lines 620-621, 1175-1179

```typescript
const primaryPrice = prices.find(p => p.coin_id === primaryCoinId);
const pc24h = primaryPrice?.price_change_percentage_24h ?? null;
```

```tsx
{pc24h !== null && (
  <div className={`text-right ${pc24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
    <div className="text-sm font-semibold tabular-nums">{fmtPct(pc24h)}%</div>
    <div className="text-[10px] opacity-70">24h</div>
  </div>
)}
```

---

## 6. CryptoTransactionModal — Current Transaction Types

**File:** `src/components/finance/modals/CryptoTransactionModal.tsx` lines 100-144

```tsx
// Transfer modes
if (f.type === 'transfer') {
    const hasFiat = (wallet.balance || 0) > 0;
    const isDestFiat = destWallet && !['crypto', 'investment'].includes(destWallet.type);

    // Crypto → Fiat (sell) — when wallet has fiat balance
    if (isDestFiat && hasFiat) {
        return !!(await props.onSubmit(f.buildPayload({
            to_wallet_id: destWalletId,
            amount: net,
            fee: fn,
            metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn, fee: fn, total },
        })))
    }

    // Crypto → Fiat (sell) — when wallet has NO fiat balance
    if (isDestFiat && !hasFiat) {
        return !!(await props.onSubmit(f.buildPayload({
            to_wallet_id: destWalletId,
            amount: qn,
            fee: 0,
            dest_amount: qn * pn,
            metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn, fee: 0, total: qn * pn },
            dest_metadata: destMetadata,
        })))
    }

    // Crypto → Crypto
    const cryptoReceived = qn - fn
    return !!(await props.onSubmit(f.buildPayload({
        to_wallet_id: destWalletId,
        amount: qn * pn,
        fee: fn,
        metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn, fee: fn, cryptoReceived },
        dest_metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: cryptoReceived, price: pn },
    })))
}

// Buy or Sell (non-transfer)
return !!(await props.onSubmit(f.buildPayload({
    amount: f.type === 'expense' ? -net : net,
    description: f.description.trim() || `${f.type === 'expense' ? 'Buy' : 'Sell'} ${qn} ${asset.symbol}`,
    metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn, fee: fn, total },
})))
```

**Current modes:** Buy, Sell, Transfer (crypto→crypto, crypto→fiat)
**Missing modes:** Pay (send to person), Receive (get from person)

---

## 7. Wallet Creation — Initial Balance

**File:** `src/main.ts` lines 23243-23257

```typescript
// For crypto wallets: create an income transaction to establish the baseline from 0
if (isCrypto && initBal > 0) {
  try {
    const catId = getSubCategoryId();
    const encAmt = financeDataKey ? encryptField(enc(initBal), financeDataKey) : String(initBal);
    const encDesc = financeDataKey ? encryptField(`Initial ${data.name}`, financeDataKey) : `Initial ${data.name}`;
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max FROM finance_transactions WHERE wallet_id = ?').get(newId) as any;
    db.prepare(`
      INSERT INTO finance_transactions (account_id, wallet_id, category_id, type, amount, description, note, "date", "time", is_adjustment, on_behalf_of, on_behalf_of_label, sort_order)
      VALUES (?, ?, ?, 'income', ?, ?, ?, '1900-01-01', '00:00', 1, 0, NULL, ?)
    `).run(data.account_id, newId, catId, encAmt, encDesc, `Initial crypto balance for ${data.name}`, (maxSort?.max || 0) + 1);
    // Set initial_balance to 0 so recalculate doesn't double-count
    const encZeroBal = financeDataKey ? encryptField(enc(0), financeDataKey) : '0';
    db.prepare('UPDATE finance_wallets SET initial_balance = ? WHERE id = ?').run(encZeroBal, newId);
  } catch (e: any) {
    console.error('[finance:create-wallet] failed to create historical baseline:', e?.message);
  }
}
```

**Issue:** `initial_balance` is set to 0, but `wallet.balance` is set to `initBal` (line 23231). This mismatch causes recalculate to produce negative balances.

---

## 8. Recalculate Handler — Starting Balance

**File:** `src/main.ts` lines 25892-25898

```typescript
const rawInitBal = wallet.initial_balance || 0;
const initialBalance = financeDataKey && isEncrypted(rawInitBal) ? Number(decryptField(String(rawInitBal), financeDataKey)) || 0 : Number(rawInitBal) || 0;
const txns = db.prepare('SELECT * FROM finance_transactions WHERE wallet_id = ? ORDER BY date ASC, sort_order ASC, created_at ASC, id ASC').all(walletId) as any[];

const isCryptoWallet = wallet.type === 'crypto' || wallet.type === 'investment';

let balance = initialBalance;
```

**Issue:** For crypto wallets, `initial_balance` is 0 but `wallet.balance` is the actual fiat balance. The recalculate starts from 0, then subtracts buy amounts, producing negative balances.

---

## 9. Wallet Balance Update in Recalculate

**File:** `src/main.ts` lines 26034-26042

```typescript
if (!preview) {
  const balToWrite = financeDataKey ? encryptField(String(newWalBal), financeDataKey) : String(newWalBal);
  if (metaToWrite) {
    db.prepare("UPDATE finance_wallets SET balance = ?, metadata = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(balToWrite, metaToWrite, walletId);
  } else {
    db.prepare("UPDATE finance_wallets SET balance = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(balToWrite, walletId);
  }
}
```

---

## 10. Crypto Buy Handler — Balance Update

**File:** `src/main.ts` lines 23962-23969

```typescript
// Decrypt current balance if encrypted
let curBalance = safeDecrypt(wallet.balance);
const newBalance = Number(curBalance) || 0;
const balToWrite = financeDataKey ? encryptField(String(newBalance - Math.abs(data.amount)), financeDataKey) : String(newBalance - Math.abs(data.amount));

db.prepare(
  `UPDATE finance_wallets SET metadata = ?, balance = ?, updated_at = datetime('now','localtime') WHERE id = ?`
).run(metaToWrite, balToWrite, data.wallet_id);
```

**This correctly reduces `wallet.balance` by the fiat amount spent on crypto.**

---

## 11. Price Fetch — CoinGecko Response

**File:** `src/components/finance/WalletDetailView.tsx` lines 623-640

```typescript
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
```

**The `prices` array contains objects with `coin_id`, `current_price`, `price_change_percentage_24h`, etc.**
