# CONTEXT_BUNDLE.md — Crypto Chart Modes & Per-Coin P&L

---

## 1. Current Chart Implementation

**File:** `src/components/finance/WalletDetailView.tsx` lines 680-710

```typescript
const chartData = useMemo(() => {
    if (history.length === 0) return null;
    return {
      labels: history.map((h: CryptoHistoryPoint) => fmtLabel(h.date)),
      datasets: [{
        label: 'Price',
        data: history.map((h: CryptoHistoryPoint) => h.price),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4, pointHoverBackgroundColor: isUp ? '#10B981' : '#EF4444',
        pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
      }]
    };
}, [history, fmtLabel]);
```

This shows price history from CoinGecko. Need to add quantity and value modes.

---

## 2. Current P&L Display

**File:** `src/components/finance/WalletDetailView.tsx` lines 615-621

```typescript
const totalCost = useMemo(() => assets.reduce((s, a) => s + a.amount * a.avg_buy_price, 0), [assets]);
const totalSpent = useMemo(() => assets.reduce((s, a) => s + ((a as any).total_fiat_spent || 0), 0), [assets]);
const availableFiat = fiatBalance;
const totalValue = availableFiat + cryptoPortfolioValue;

const totalPnl = cryptoPortfolioValue - totalCost;
const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
```

**Display (lines 1201-1211):**
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

Need to add per-coin breakdown.

---

## 3. Assets Array Structure

**File:** `src/components/finance/WalletDetailView.tsx` lines 544-598

```typescript
const assets: { coin_id: string; symbol: string; amount: number; avg_buy_price: number; total_fiat_spent: number }[] = useMemo(() => {
    // ... derives from walletTransactions
    return Array.from(assetsMap.values())
      .filter(a => a.amount > 0.00000001)
      .map(a => ({
        coin_id: a.coin_id,
        symbol: a.symbol,
        amount: a.amount,
        avg_buy_price: a.amount > 0 ? a.total_cost / a.amount : 0,
        total_fiat_spent: (a as any).total_fiat_spent || 0,
      }));
}, [walletTransactions]);
```

---

## 4. Prices Array Structure

**File:** `src/components/finance/WalletDetailView.tsx` line 607

```typescript
const cryptoPortfolioValue = useMemo(() => {
    return assets.reduce((sum, a) => {
      const p = prices.find(pr => pr.coin_id === a.coin_id);
      return sum + (a.amount * (p?.current_price || 0));
    }, 0);
}, [assets, prices]);
```

`prices` contains objects with `coin_id`, `current_price`, `price_change_percentage_24h`.

---

## 5. Transactions Array Structure

**File:** `src/components/finance/WalletDetailView.tsx` lines 546-553

```typescript
const sorted = [...walletTxns].sort((a, b) => {
    const dateCmp = (a.date || '').localeCompare(b.date || '');
    if (dateCmp !== 0) return dateCmp;
    const soA = (a as any).sort_order || 0;
    const soB = (b as any).sort_order || 0;
    if (soA !== soB) return soA - soB;
    return (a.id || 0) - (b.id || 0);
});
```

Each transaction has: `id`, `type` (income/expense/transfer), `amount`, `date`, `metadata` (JSON string with coinId, qty, price, etc.)

---

## 6. Recalculate Handler

**File:** `src/main.ts` lines 25884-26064

The handler starts from `wallet.initial_balance` and processes transactions in order. For crypto wallets, it accumulates `qty` and `total_cost` in `assetsMap`, then writes back to `wallet.metadata.assets`.

Key issue: for crypto wallets, `initial_balance` might be 0 but `wallet.balance` has the actual fiat. This mismatch causes wrong calculations.
