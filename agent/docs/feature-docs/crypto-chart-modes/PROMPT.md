# PROMPT.md — Crypto Wallet: Recalculate Fix, Per-Coin P&L, Chart Modes

## Raw Request

> "the reclaculate is still not showing the right calculation even when the original without the recalculation is already correct. what are the things that i requested again? i think there was along the line of like the trend loss and gain and stuff like that. i mean its there, but how would you handle the multiple coins ones. also, i need you to make sure the chart for like the each coin popup thing, it should have two modes (different category than the fiat crypto toggle). it is the crypto difference toggle (meaning if the crypto amount change, then the chart would add), and also the other mode is the fiat change (which would mean it should update every day or every hour for example)."

---

## Problem Statement

1. **Recalculate produces wrong results** — even when the original wallet data is correct, running recalculate changes values incorrectly
2. **No per-coin P&L** — the portfolio shows total P&L but not individual coin P&L
3. **Chart needs two modes** — crypto quantity view (shows BTC amount changes over time) and fiat value view (shows USD value changes over time)

---

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in the same directory for all relevant source code.

---

## Task 1: Fix Recalculate Handler

The recalculate handler starts from `wallet.initial_balance` and processes transactions. For crypto wallets, the issue is likely:

1. The `initial_balance` doesn't match the actual starting fiat
2. Transaction amounts aren't being decrypted properly
3. The crypto asset accumulation logic has issues

**Required fix:** Ensure the recalculate handler:
- Uses `wallet.balance` as the starting point for crypto wallets (not `initial_balance`)
- Properly decrypts all transaction amounts
- Correctly accumulates crypto assets from transaction metadata
- Produces the same result as the original wallet data

---

## Task 2: Add Per-Coin P&L Display

**File:** `src/components/finance/WalletDetailView.tsx`

Currently, the portfolio shows total P&L:
```tsx
<div className="text-zinc-500">P&amp;L</div>
<span>{fmtCurrency(totalPnl, displayCurrency)}</span>
<span>({fmtPct(totalPnlPct, 1)}%)</span>
```

**Required:** Add a per-coin breakdown below the total P&L:
```tsx
{assets.map(a => {
  const price = prices.find(p => p.coin_id === a.coin_id);
  const currentValue = a.amount * (price?.current_price || 0);
  const costBasis = a.amount * a.avg_buy_price;
  const pnl = currentValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return (
    <div key={a.coin_id} className="flex items-center gap-2 text-[10px]">
      <span className="text-zinc-400">{a.symbol}</span>
      <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
        {fmtCurrency(pnl, displayCurrency)} ({fmtPct(pnlPct, 1)}%)
      </span>
    </div>
  );
})}
```

---

## Task 3: Add Chart Modes (Crypto Quantity vs Fiat Value)

**File:** `src/components/finance/WalletDetailView.tsx`

The crypto chart currently shows portfolio value over time. Add a toggle between two modes:

### Mode 1: Crypto Quantity
- Shows the total crypto quantity over time
- X-axis: dates
- Y-axis: total BTC (or other coin) quantity
- Line goes UP when crypto is bought/received
- Line goes DOWN when crypto is sold/sent

### Mode 2: Fiat Value
- Shows the total fiat value of crypto holdings over time
- X-axis: dates
- Y-axis: total USD value
- Line changes based on both quantity changes AND price changes
- Updates with current prices

**Implementation:**

1. Add a `chartMode` state: `'quantity' | 'value'`
2. Add toggle buttons above the chart
3. Compute chart data based on mode:

```tsx
const chartData = useMemo(() => {
  if (chartMode === 'quantity') {
    // Compute cumulative quantity at each transaction point
    let cumQty = 0;
    const points = sortedTxns.map(t => {
      const m = parseMetadata(t);
      if (m?.qty) {
        const delta = t.type === 'income' ? -Math.abs(m.qty) : Math.abs(m.qty);
        cumQty += delta;
      }
      return { date: t.date, qty: cumQty };
    });
    return points;
  } else {
    // Compute fiat value at each transaction point using historical prices
    // For now, use current price × quantity at each point
    let cumQty = 0;
    const points = sortedTxns.map(t => {
      const m = parseMetadata(t);
      if (m?.qty) {
        const delta = t.type === 'income' ? -Math.abs(m.qty) : Math.abs(m.qty);
        cumQty += delta;
      }
      const price = prices.find(p => p.coin_id === m?.coinId)?.current_price || 0;
      return { date: t.date, value: cumQty * price };
    });
    return points;
  }
}, [sortedTxns, chartMode, prices]);
```

4. Update the Line chart component to use the correct data:

```tsx
<Line data={{
  labels: chartData.map(p => p.date),
  datasets: [{
    label: chartMode === 'quantity' ? 'Quantity' : 'Value',
    data: chartData.map(p => chartMode === 'quantity' ? p.qty : p.value),
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    fill: true,
    tension: 0.4,
  }]
}} />
```

---

## Constraint Checklist

1. **Must not break existing non-crypto wallet functionality**
2. **Must preserve transaction history**
3. **Chart toggle must be visually distinct from the existing fiat/crypto toggle**
4. **Per-coin P&L must update with live prices**
5. **Recalculate must produce identical results to original data**

---

## Output Format

Provide the fix as exact code changes with file paths, line numbers, current code, and new code.
