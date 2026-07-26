# Context Bundle: Crypto Wallet Fix + Charts/Overview Cleanup

## 1. The Three Core Problems

### Problem 1: Fiat not deducted when buying crypto
When a user buys crypto, the fiat balance should decrease. Currently it doesn't.
- `WalletDetailView.tsx` calculates `fiatBalance` from transactions (transfers IN), NOT from `wallet.balance`
- When buying crypto via `CryptoTransactionModal`, the transaction type is 'income' which INCREASES `wallet.balance` instead of decreasing it
- Result: Fiat is never deducted, leading to negative "available" balances

### Problem 2: No transaction when adding a coin
- `handleAddAsset` in `WalletDetailView.tsx` (line 608-646) only updates `metadata.assets` via `onChange`
- No `finance_transactions` record is created
- No audit trail, no balance change

### Problem 3: Wrong display numbers
- `fiatBalance` = sum of transfers IN (ignores initial_balance and other transactions)
- `availableFiat` = `fiatBalance - totalCost` (produces negative numbers)
- `totalValue` = `availableFiat + cryptoOnlyValue` (wrong)
- Fiat not displayed as "Rp" like other coins

## 2. Duplicate Charts Tab Blocks Navigation (CRITICAL)

`FinancePage.tsx` has TWO `{activeTab === 'charts' && ...}` blocks that both mount simultaneously:

### First block (Lines 1147-1167) — CORRECT, keep this:
```tsx
{activeTab === 'charts' && (
  <motion.div key="charts" ...>
    <FinanceChartsTab
      spendingByCategory={spendingByCategory}
      monthlyTrends={monthlyTrends}
      allTransactions={transactions}
      displayCurrency={displayCurrency}
      baseCurrency={baseCurrency}
      loading={loading}
      error={fetchError}
      onRetry={fetchData}
    />
  </motion.div>
)}
```

### Second block (Lines 1184-1234) — WRONG, must be REMOVED:
```tsx
{activeTab === 'charts' && (
  <motion.div key="charts" ...>
    <div className="p-5 space-y-6">
      <h2 className="text-xl font-semibold text-zinc-200">Finance Charts</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-5">
          <h3 className="text-lg font-semibold text-zinc-200 mb-4">Net Worth Over Time</h3>
          ...
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="text-lg font-semibold text-zinc-200 mb-4">Income vs Expenses</h3>
          ...
        </GlassCard>
        <GlassCard className="p-5 lg:col-span-2">
          <h3 className="text-lg font-semibold text-zinc-200 mb-4">Spending by Category</h3>
          ...
        </GlassCard>
      </div>
    </div>
  </motion.div>
)}
```

Both use `key="charts"` which causes React key conflicts. The second block must be deleted entirely.

## 3. Charts vs Overview Duplication (same section as above, just for reference)

### FinanceChartsTab.tsx (Lines 196-211) — "Advanced Analytics" section:
```tsx
{/* Advanced Analytics */}
<motion.div variants={riseItem}>
  <LiquidityWaterfall />
</motion.div>
<motion.div variants={riseItem}>
  <CashFlowRunway />
</motion.div>
<motion.div variants={riseItem}>
  <SubscriptionBurdenRadar />
</motion.div>
<motion.div variants={riseItem}>
  <WalletHealthScorecards />
</motion.div>
<motion.div variants={riseItem} className="lg:col-span-2">
  <TransferCostMatrix />
</motion.div>
```

### OverviewTab.tsx (Lines 462-478) — DUPLICATE "Advanced Analytics" section:
```tsx
{/* ═══ SECTION 7: Advanced Analytics ═══ */}
<div>
  <div className="flex items-center gap-2 mb-3">
    <div className="h-px flex-1 bg-gradient-to-r from-violet-500/40 via-violet-500/10 to-transparent" />
    <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-violet-500/70">Advanced Analytics</span>
    <div className="h-px flex-1 bg-gradient-to-l from-violet-500/40 via-violet-500/10 to-transparent" />
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <LiquidityWaterfall />
    <CashFlowRunway />
    <SubscriptionBurdenRadar />
    <WalletHealthScorecards />
    <div className="lg:col-span-2">
      <TransferCostMatrix />
    </div>
  </div>
</div>
```

## 3. Current Crypto Detail Logic (WalletDetailView.tsx)

### The broken fiatBalance calculation (Lines 392-398):
```typescript
const fiatBalance = (transactions || [])
    .filter(t => t.type === 'transfer' && (t as any).to_wallet_id === wallet.id)
    .reduce((sum, t) => {
      const absAmount = Math.abs(Number(t.amount) || 0);
      return sum + (t.amount > 0 ? absAmount : -absAmount);
    }, 0);
```

### The broken availableFiat calculation (Line 408):
```typescript
const availableFiat = fiatBalance - totalCost;
```

### The broken totalValue calculation (Lines 410-417):
```typescript
const totalValue = useMemo(() => {
    const crypto = assets.reduce((sum, a) => {
      const p = prices.find(pr => pr.coin_id === a.coin_id);
      return sum + (a.amount * (p?.current_price || 0));
    }, 0);
    return availableFiat + crypto;
  }, [assets, prices, availableFiat]);
```

### The handleAddAsset function (Lines 608-646):
```typescript
const handleAddAsset = () => {
    if (!selectedCoinId) return;
    let amount: number;
    if (addMode === 'from-spend') {
      if (!newTotalSpent || !newAssetAvgPrice) return;
      const spent = parseFloat(newTotalSpent);
      const avgPrice = parseFloat(newAssetAvgPrice);
      if (!spent || !avgPrice) return;
      if (spent > availableFiat) {
        setFiatError(`Insufficient balance — you have ${fmtCurrency(availableFiat, displayCurrency)} available`);
        return;
      }
      amount = spent / avgPrice;
    } else {
      if (!newAssetAmount) return;
      amount = parseFloat(newAssetAmount);
    }
    const asset_type = selectedAssetType || 'crypto';
    const newAssets = [...assets, {
      coin_id: selectedCoinId,
      symbol: selectedCoinId.split('-').pop()?.toUpperCase() || selectedCoinId.slice(0, 6).toUpperCase(),
      asset_type,
      name: searchCoin.split(' (')[0] || selectedCoinId,
      amount,
      avg_buy_price: parseFloat(newAssetAvgPrice) || 0,
    }];
    onChange('assets', JSON.stringify(newAssets));
    // ... resets
  };
```

## 4. Crypto Transaction Modal (CryptoTransactionModal.tsx)

### Buy = 'income' type (WRONG — should decrease fiat):
```typescript
<TypeToggle accent={ACCENT} value={f.type} onChange={f.setType}
    options={[{ id: 'income', label: 'Buy' }, { id: 'expense', label: 'Sell' }, { id: 'transfer', label: 'Send' }]} />
```

### Amount sent for buy (Line 99-103):
```typescript
return !!(await props.onSubmit(f.buildPayload({
    amount: f.type === 'income' ? -net : net,
    description: f.description.trim() || `${f.type === 'income' ? 'Buy' : 'Sell'} ${qn} ${asset.symbol}`,
    metadata: { coinId: asset.coinId, symbol: asset.symbol, qty: qn, price: pn, fee: fn, total },
})))
```

## 5. main.ts Balance Update Logic (Lines 22920-22958)

### Sign convention (Lines 22920-22925):
```typescript
const safeAmount = data.type === 'expense'
    ? -Math.abs(data.amount)
    : data.type === 'income'
        ? Math.abs(data.amount)
        : data.amount;
```

### Wallet balance update (Lines 22949-22958):
```typescript
if (data.wallet_id) {
    const wRow = db.prepare('SELECT balance FROM finance_wallets WHERE id = ?').get(data.wallet_id) as any;
    const wBal = wRow && isEncrypted(wRow.balance) ? Number(decryptField(String(wRow.balance), financeDataKey)) || 0 : Number(wRow?.balance) || 0;
    db.prepare('UPDATE finance_wallets SET balance = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(encryptField(enc(wBal + safeAmount), financeDataKey), data.wallet_id);
}
```

### Net Worth calculation (Lines 23226-23228):
```typescript
const netWorthRow = db.prepare("SELECT COALESCE(SUM(balance), 0) as total FROM finance_wallets WHERE is_archived = 0").get() as any;
const netBalance = Number(netWorthRow.total);
```

## 6. FinancePage.tsx Net Worth (Lines 745-761)

```typescript
const netWorth = useMemo(() =>
    accounts.reduce((s, a) => {
      if (a.type === 'custodial') return s;
      const walletSum = wallets
        .filter(w => w.account_id === a.id && !w.is_archived)
        .reduce((ws, w) => {
          const wb = (w.type === 'physical' || w.type === 'cash') && w.metadata?.denominations
            ? (Array.isArray(w.metadata.denominations)
                ? w.metadata.denominations.reduce((sx: number, d: any) => sx + (d.value || 0) * (d.count || 0), 0)
                : (w.balance ?? 0))
            : (w.balance ?? 0);
          return ws + convertAmount(wb, w.currency, displayCurrency);
        }, 0);
      return s + walletSum;
    }, 0),
    [accounts, wallets, displayCurrency]
  );
```

## 7. Wallet Type Definitions (finance-types.ts)

```typescript
export interface FinanceWallet {
  id: number;
  account_id: number;
  name: string;
  type: 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'physical' | 'other';
  provider: string | null;
  last_four: string | null;
  balance: number;
  currency: string;
  is_archived: number;
  metadata?: string;
  created_at: string;
  updated_at: string;
}
```

## 8. DB Schema (main.ts)

```sql
CREATE TABLE IF NOT EXISTS finance_wallets (
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
  initial_balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (account_id) REFERENCES finance_accounts(id)
);
```
