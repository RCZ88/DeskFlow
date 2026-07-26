# Engineering Specification: Crypto Wallet Logic Fix + Charts/Overview Cleanup

## 1. The Logic Specification

### Fiat Balance (Source of Truth)
```
fiatBalance = wallet.balance
```
The `wallet.balance` column IS the fiat balance. Do NOT compute it from transactions. When a user transfers IDR into a crypto wallet, `wallet.balance` increases. When they buy crypto, `wallet.balance` decreases.

### Total Crypto Portfolio Value
```
cryptoPortfolioValue = SUM(asset.amount * current_price) for all assets
```

### Total Wallet Value
```
totalValue = fiatBalance + cryptoPortfolioValue
```

### Cost Basis
```
totalCost = SUM(asset.amount * asset.avg_buy_price) for all assets
```

### Unrealized P&L
```
unrealizedPnL = cryptoPortfolioValue - totalCost
pnlPercentage = (unrealizedPnL / totalCost) * 100  [if totalCost > 0]
```

### Available Fiat for Buying
```
availableFiat = wallet.balance  [NOT wallet.balance - totalCost]
```
The cost basis is already reflected in `wallet.balance` because each buy transaction decreased it.

### Net Worth (FinancePage.tsx)
```
netWorth = SUM(wallet.balance for all non-archived wallets)
```
For crypto wallets, `wallet.balance` = fiat only. The crypto portfolio value is NOT included in net worth at the wallet level because it's stored in metadata. The net worth calculation in FinancePage.tsx should optionally include crypto portfolio values.
```
netWorth = SUM(wallet.balance) + SUM(crypto portfolio values from metadata)
```

---

## 2. Code Changes

### Fix 1: CryptoTransactionModal.tsx — Correct Buy/Sell Transaction Types

**File**: `src/components/finance/CryptoTransactionModal.tsx`

**Change the type toggle** (keep user-facing labels, fix underlying types):

```tsx
// BEFORE (WRONG):
<TypeToggle accent={ACCENT} value={f.type} onChange={f.setType}
    options={[{ id: 'income', label: 'Buy' }, { id: 'expense', label: 'Sell' }, { id: 'transfer', label: 'Send' }]} />

// AFTER (CORRECT):
<TypeToggle accent={ACCENT} value={f.type} onChange={f.setType}
    options={[{ id: 'expense', label: 'Buy' }, { id: 'income', label: 'Sell' }, { id: 'transfer', label: 'Send' }]} />
```

**Update the submit payload** (the amount sign logic stays the same because the type is now correct):

```tsx
// BEFORE (line ~99):
amount: f.type === 'income' ? -net : net,
description: f.description.trim() || `${f.type === 'income' ? 'Buy' : 'Sell'} ${qn} ${asset.symbol}`,

// AFTER:
amount: f.type === 'expense' ? -net : net,
description: f.description.trim() || `${f.type === 'expense' ? 'Buy' : 'Sell'} ${qn} ${asset.symbol}`,
```

**Rationale**: 
- `type='expense'` → `safeAmount = -Math.abs(amount)` → `wallet.balance` DECREASES (fiat leaves)
- `type='income'` → `safeAmount = +Math.abs(amount)` → `wallet.balance` INCREASES (fiat enters)
- This matches the real-world flow: buying crypto = spending fiat, selling crypto = receiving fiat.

---

### Fix 2: WalletDetailView.tsx — Create Transaction When Adding a Coin

**File**: `src/components/finance/WalletDetailView.tsx`

**Modify `handleAddAsset`** (around line 608-646):

```tsx
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
      if (!newAssetAmount) return;
      amount = parseFloat(newAssetAmount);
      // For manual entry, we don't know the fiat cost — use avg_buy_price * amount
      spentFiat = amount * (parseFloat(newAssetAvgPrice) || 0);
    }

    const asset_type = selectedAssetType || 'crypto';
    const symbol = selectedCoinId.split('-').pop()?.toUpperCase() || selectedCoinId.slice(0, 6).toUpperCase();
    const name = searchCoin.split(' (')[0] || selectedCoinId;

    const newAssets = [...assets, {
      coin_id: selectedCoinId,
      symbol,
      asset_type,
      name,
      amount,
      avg_buy_price: parseFloat(newAssetAvgPrice) || 0,
    }];

    // Update metadata
    onChange('assets', JSON.stringify(newAssets));

    // ─── CREATE TRANSACTION RECORD ───
    // This decreases wallet.balance via the existing create-transaction handler
    if (spentFiat > 0) {
      try {
        await window.electron.invoke('finance:create-transaction', {
          account_id: wallet.account_id,
          wallet_id: wallet.id,
          category_id: 1, // Default category — adjust as needed
          type: 'expense',
          amount: spentFiat,
          description: `Buy ${amount.toFixed(6)} ${symbol} @ ${fmtCurrency(parseFloat(newAssetAvgPrice) || 0, displayCurrency)}`,
          note: `Crypto purchase: ${name} (${selectedCoinId})`,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          metadata: JSON.stringify({
            coinId: selectedCoinId,
            symbol,
            qty: amount,
            price: parseFloat(newAssetAvgPrice) || 0,
            assetType: asset_type,
          }),
        });
      } catch (err) {
        console.error('Failed to create buy transaction:', err);
        // Don't block the UI — the asset is already added to metadata
      }
    }

    // Reset form
    setNewAssetAmount('');
    setNewTotalSpent('');
    setNewAssetAvgPrice('');
    setSearchCoin('');
    setSelectedCoinId('');
    setSelectedAssetType('');
    setFiatError('');
    setIsAddAssetOpen(false);
  };
```

**Also update the available balance check**:

```tsx
// BEFORE (line ~620):
if (spent > availableFiat) {

// AFTER:
if (spent > (wallet.balance || 0)) {
```

---

### Fix 3: WalletDetailView.tsx — Fix Balance Display Logic

**File**: `src/components/finance/WalletDetailView.tsx`

**Replace the broken fiatBalance calculation** (lines 392-398):

```tsx
// BEFORE (WRONG):
const fiatBalance = (transactions || [])
    .filter(t => t.type === 'transfer' && (t as any).to_wallet_id === wallet.id)
    .reduce((sum, t) => {
      const absAmount = Math.abs(Number(t.amount) || 0);
      return sum + (t.amount > 0 ? absAmount : -absAmount);
    }, 0);

// AFTER (CORRECT):
const fiatBalance = wallet.balance || 0;
```

**Replace the broken availableFiat calculation** (line 408):

```tsx
// BEFORE (WRONG):
const availableFiat = fiatBalance - totalCost;

// AFTER (CORRECT):
// availableFiat IS fiatBalance — the cost is already reflected in wallet.balance
// via the buy transactions. No need to subtract again.
const availableFiat = fiatBalance;
```

**Replace the broken totalValue calculation** (lines 410-417):

```tsx
// BEFORE (WRONG):
const totalValue = useMemo(() => {
    const crypto = assets.reduce((sum, a) => {
      const p = prices.find(pr => pr.coin_id === a.coin_id);
      return sum + (a.amount * (p?.current_price || 0));
    }, 0);
    return availableFiat + crypto;
  }, [assets, prices, availableFiat]);

// AFTER (CORRECT):
const cryptoPortfolioValue = useMemo(() => {
    return assets.reduce((sum, a) => {
      const p = prices.find(pr => pr.coin_id === a.coin_id);
      return sum + (a.amount * (p?.current_price || 0));
    }, 0);
  }, [assets, prices]);

const totalValue = fiatBalance + cryptoPortfolioValue;
```

**Fix the fiat display to use fmtCurrency** (find the fiat balance display and replace):

```tsx
// BEFORE (around line ~350):
// Fiat balance displayed as raw number or wrong format

// AFTER:
// Display fiat balance with proper currency formatting
<div className="text-2xl font-bold text-zinc-100">
  {fmtCurrency(fiatBalance, displayCurrency)}
</div>
```

**Update the asset list to show fiat as "Rp" (or appropriate symbol)**:

```tsx
// In the coin list table, add a "Fiat" row at the top:
<tr className="border-b border-zinc-800/50">
  <td className="py-3 px-4">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
        <span className="text-blue-400 text-xs font-bold">{displayCurrency}</span>
      </div>
      <div>
        <div className="text-sm font-medium text-zinc-200">Fiat Balance</div>
        <div className="text-[10px] text-zinc-500">Cash in exchange</div>
      </div>
    </div>
  </td>
  <td className="py-3 px-4 text-right text-sm text-zinc-300">—</td>
  <td className="py-3 px-4 text-right text-sm text-zinc-300">—</td>
  <td className="py-3 px-4 text-right">
    <div className="text-sm font-bold text-zinc-100">{fmtCurrency(fiatBalance, displayCurrency)}</div>
  </td>
  <td className="py-3 px-4 text-right">
    <div className={`text-xs font-medium ${fiatBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {((fiatBalance / totalValue) * 100).toFixed(1)}%
    </div>
  </td>
</tr>
```

---

### Fix 4: FinanceChartsTab.tsx — Keep Only Financial Analysis

**File**: `src/components/finance/FinanceChartsTab.tsx`

**Ensure the file contains ONLY financial analysis components**:

```tsx
// FinanceChartsTab.tsx should contain:
// 1. Net Worth Line Chart
// 2. Income vs Expenses Bar Chart
// 3. Spending by Category Doughnut
// 4. Liquidity Waterfall
// 5. Cash Flow Runway
// 6. Subscription Burden Radar
// 7. Wallet Health Scorecards
// 8. Transfer Cost Matrix
// 
// REMOVE any duplicate "Advanced Analytics" sections that also exist in OverviewTab.
```

**Verify the structure** (should look like):

```tsx
export default function FinanceChartsTab({ ...props }) {
  return (
    <div className="p-5 space-y-6">
      <h2 className="text-xl font-semibold text-zinc-200">Financial Analysis</h2>

      {/* Row 1: Net Worth + Income/Expense */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetWorthLineChart ... />
        <IncomeExpenseBarChart ... />
      </div>

      {/* Row 2: Spending by Category */}
      <SpendingCategoryChart ... />

      {/* Row 3: Advanced Analytics */}
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
  );
}
```

---

### Fix 5: OverviewTab.tsx — Remove Duplicate Analytics

**File**: `src/components/finance/OverviewTab.tsx`

**DELETE Section 7** (lines 462-478):

```tsx
// DELETE THIS ENTIRE BLOCK:
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

**The OverviewTab should only contain**:
1. Quick Stats (Income, Expense, Net Flow)
2. Spending Split (Personal vs Follow-Through)
3. Deep Dive (Receivables, Net Flow Hero)
4. Insights (Savings Rate, Top Spend, Daily Avg)
5. Analytics (Net Worth Line Chart, Spending Category Chart)
6. Cashflow (Income/Expense Bar Chart)
7. Recent Transactions
8. Accounts

---

### Fix 6: FinancePage.tsx — Remove Duplicate Charts Tab (CRITICAL)

**File**: `src/components/finance/FinancePage.tsx`

**DELETE the second charts tab block** (lines 1184-1234):

```tsx
// DELETE THIS ENTIRE BLOCK:
{activeTab === 'charts' && (
  <motion.div
    key="charts"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
  >
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

**Keep ONLY the first charts tab block** (lines 1147-1167):

```tsx
{activeTab === 'charts' && (
  <motion.div
    key="charts"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
  >
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

**Why this fixes navigation**: Both blocks used `key="charts"`. React uses keys to identify elements. When two elements have the same key in the same parent, React gets confused about which one to mount/unmount. Deleting the second block eliminates the conflict.

---

### Fix 7: FinanceChartsTab.tsx — Verify It's the Single Source of Truth

**File**: `src/components/finance/FinanceChartsTab.tsx`

**Ensure the file contains ALL financial analysis and NOTHING is duplicated in OverviewTab**:

```tsx
// Verify these imports exist:
import LiquidityWaterfall from './LiquidityWaterfall';
import CashFlowRunway from './CashFlowRunway';
import SubscriptionBurdenRadar from './SubscriptionBurdenRadar';
import WalletHealthScorecards from './WalletHealthScorecards';
import TransferCostMatrix from './TransferCostMatrix';

// Verify the component renders all of them:
export default function FinanceChartsTab({ ... }) {
  return (
    <div className="p-5 space-y-6">
      <h2 className="text-xl font-semibold text-zinc-200">Financial Analysis</h2>

      {/* Core Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetWorthLineChart ... />
        <IncomeExpenseBarChart ... />
      </div>

      <SpendingCategoryChart ... />

      {/* Advanced Analytics — ONLY HERE, NOT IN OVERVIEW */}
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
  );
}
```

---

## 3. Verification

### Test 1: Buy Crypto Decreases Fiat
1. Open a crypto wallet with Rp 1,000,000 balance
2. Click "Buy" and purchase 0.001 BTC at Rp 500,000,000/BTC (cost = Rp 500,000)
3. Submit the transaction
4. **Expected**: Wallet balance shows Rp 500,000 (1,000,000 - 500,000)
5. **Expected**: A new transaction appears: "Buy 0.001 BTC" with amount -500,000
6. **Expected**: The BTC appears in the asset list

### Test 2: Sell Crypto Increases Fiat
1. Open the same crypto wallet (now Rp 500,000 + 0.001 BTC)
2. Click "Sell" and sell 0.0005 BTC at Rp 500,000,000/BTC (proceeds = Rp 250,000)
3. Submit the transaction
4. **Expected**: Wallet balance shows Rp 750,000 (500,000 + 250,000)
5. **Expected**: A new transaction appears: "Sell 0.0005 BTC" with amount +250,000
6. **Expected**: The BTC amount in asset list decreases to 0.0005

### Test 3: Add Coin Creates Transaction
1. Open a crypto wallet with Rp 2,000,000 balance
2. Click "Add Asset"
3. Search for "ETH" and select it
4. Enter amount: 0.5, avg buy price: 1,000,000 (total cost = Rp 500,000)
5. Click "Add"
6. **Expected**: Wallet balance shows Rp 1,500,000 (2,000,000 - 500,000)
7. **Expected**: A new transaction appears: "Buy 0.5 ETH @ Rp1,000,000"
8. **Expected**: ETH appears in the asset list with amount 0.5 and avg_buy_price 1,000,000

### Test 4: Fiat Display Is Correct
1. Open any crypto wallet
2. **Expected**: Fiat balance is displayed as "RpX,XXX,XXX" (formatted with commas)
3. **Expected**: Fiat row appears in the asset list as the first item
4. **Expected**: Total value = fiat + crypto portfolio value (not double-counting)

### Test 5: Tab Switching Works
1. Click "Overview" tab → Overview renders correctly
2. Click "Charts" tab → Charts renders correctly (only FinanceChartsTab)
3. Click "Wallets" tab → Wallets renders correctly
4. Click back to "Overview" → Overview renders correctly
5. **Expected**: No React key warnings in console
6. **Expected**: No duplicate "Finance Charts" headings

### Test 6: No Duplicate Analytics
1. Open Overview tab
2. **Expected**: NO "Advanced Analytics" section (LiquidityWaterfall, CashFlowRunway, etc.)
3. Open Charts tab
4. **Expected**: "Advanced Analytics" section IS present
5. **Expected**: Only ONE charts tab content renders (no duplicate headings)

### Test 7: Net Worth Calculation
1. Have a crypto wallet with: fiat Rp 1,000,000 + 0.1 ETH worth Rp 5,000,000
2. **Expected**: Net worth shows Rp 6,000,000 (1,000,000 + 5,000,000)
3. **Expected**: The crypto portfolio value is included in net worth calculation

---

## 4. Summary of All Changes

| # | File | Action | Lines |
|---|------|--------|-------|
| 1 | `CryptoTransactionModal.tsx` | Change Buy type from 'income' to 'expense' | TypeToggle options + submit payload |
| 2 | `WalletDetailView.tsx` | Add transaction creation in handleAddAsset | After onChange('assets', ...) |
| 3 | `WalletDetailView.tsx` | Fix fiatBalance = wallet.balance | Replace transaction-based calc |
| 3 | `WalletDetailView.tsx` | Fix availableFiat = fiatBalance | Remove -totalCost |
| 3 | `WalletDetailView.tsx` | Fix totalValue = fiat + crypto | Use cryptoPortfolioValue |
| 3 | `WalletDetailView.tsx` | Display fiat with fmtCurrency | Add "Fiat Balance" row |
| 4 | `FinanceChartsTab.tsx` | Verify single source of truth | Ensure all analytics present |
| 5 | `OverviewTab.tsx` | Remove Advanced Analytics section | Delete lines 462-478 |
| 6 | `FinancePage.tsx` | Remove duplicate charts block | Delete lines 1184-1234 |
| 7 | `FinanceChartsTab.tsx` | Keep as analysis home | Verify component list |
