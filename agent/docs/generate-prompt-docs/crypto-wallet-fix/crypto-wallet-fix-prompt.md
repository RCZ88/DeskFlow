# Engineering Specification: Crypto Wallet Logic Fix + Charts/Overview Cleanup

## Raw Request
"the logic was that if you want to buy a crypto currency it should have a fiat currency on the wallet first. but the problem is, is that instead of cutting the fiat currency, the fiat currency is still counted as the value on the wallet as if it sums all the things up, when in reality, its supposed to be cut of by the transactions of the coins. another problem is that, when adding a coin, theres nothing added on the transaction. the third problem is that, the numbers and like the display of those net worth and like deposited are all wrong. the fiat also is not displayed like other coins which should be fixed. it should be displayed as just like RP or something. fix it properly"

"also, the charts page is just a copy of the dashboard. it should be that it only displays the financial analysis, and nothing else. also the financial analysis downwards in the dashboard (overview) should be removed, since it is already moved to the charts tab."

## Problem Statement

There are 7 interconnected bugs that must be fixed together:

### Bug 1: Fiat not deducted when buying crypto
When a user buys crypto, the fiat should be cut from the wallet balance. Currently it stays as if you still have it. The `fiatBalance` is calculated from transfers IN (ignoring `wallet.balance`), and the crypto buy transaction is typed as 'income' which INCREASES the balance instead of decreasing it.

### Bug 2: No transaction when adding a coin
`handleAddAsset` only updates `metadata.assets` via `onChange`. No `finance_transactions` record is created. This means no audit trail, no balance change, and no way to track the cost basis.

### Bug 3: Wrong display numbers
- `fiatBalance` = sum of transfers IN (ignores initial_balance and other transactions)
- `availableFiat` = `fiatBalance - totalCost` (produces negative numbers like -Rp11,299,986)
- `totalValue` = `availableFiat + cryptoOnlyValue` (wrong)
- Fiat not displayed as "Rp" like other coins

### Bug 4: Charts page is a copy of the dashboard
`FinanceChartsTab.tsx` contains the same "Advanced Analytics" section (LiquidityWaterfall, CashFlowRunway, SubscriptionBurdenRadar, WalletHealthScorecards, TransferCostMatrix) that also exists in `OverviewTab.tsx`. The charts tab should ONLY show financial analysis.

### Bug 5: Dashboard Overview has duplicate analytics
`OverviewTab.tsx` has an "Advanced Analytics" section (lines 462-478) that duplicates what's in the Charts tab. This should be removed from the Overview.

### Bug 6: DUPLICATE charts tab blocks navigation (CRITICAL)
`FinancePage.tsx` has TWO `{activeTab === 'charts' && ...}` blocks:
- Lines 1147-1167: Renders `<FinanceChartsTab>` (correct)
- Lines 1184-1234: Renders a DIFFERENT charts view with `<GlassCard>` components (WRONG)

Both mount simultaneously when on the Charts tab. This causes React rendering conflicts that prevent tab switching. The second block (lines 1184-1234) must be REMOVED entirely.

## Context Reference
Refer to `agent/docs/crypto-wallet-fix/crypto-wallet-fix-context.md` for the complete source code, DB schemas, and IPC wiring.

## The Mandate

Fix all 7 bugs as a single coordinated change. The fixes must be mathematically correct and consistent across the entire finance module.

### Fix 1: Correct the crypto buy/sell transaction logic
The `CryptoTransactionModal` currently maps "Buy" to 'income' type. This is WRONG because buying crypto means fiat LEAVES the wallet.

**Required change**: When buying crypto, the transaction must DECREASE `wallet.balance`. The simplest correct approach:
- Keep the user-facing labels as "Buy" and "Sell" (don't confuse the user)
- But the underlying transaction type for "Buy" must result in `wallet.balance` DECREASING
- Either change the type to 'expense' OR fix the amount sign so `safeAmount` is negative for buys

### Fix 2: Create a transaction when adding a coin
When `handleAddAsset` is called in `WalletDetailView.tsx`, it must also create a `finance_transactions` record via the IPC bridge.

**The transaction must record**:
- `type`: 'expense' (fiat goes out to buy crypto)
- `amount`: the fiat cost (amount × avg_buy_price)
- `description`: "Initial setup: {amount} {symbol} at {price}"
- `wallet_id`: the current wallet
- `account_id`: the current account

This transaction will automatically decrease `wallet.balance` via the existing `finance:create-transaction` handler.

### Fix 3: Fix the balance display logic
Replace the broken transaction-based `fiatBalance` calculation with the actual `wallet.balance`.

**Current (WRONG)**:
```typescript
const fiatBalance = (transactions || [])
    .filter(t => t.type === 'transfer' && (t as any).to_wallet_id === wallet.id)
    .reduce((sum, t) => { ... }, 0);
const availableFiat = fiatBalance - totalCost;
const totalValue = availableFiat + cryptoOnlyValue;
```

**Correct**:
```typescript
const fiatBalance = wallet.balance || 0;  // The actual fiat in the wallet
const totalValue = fiatBalance + cryptoOnlyValue;  // Fiat + crypto = total value
```

**Do NOT subtract `totalCost` from `fiatBalance`**. The cost of crypto is already reflected in `wallet.balance` (because the buy transaction decreased it).

### Fix 4: Display fiat as "Rp" (or appropriate currency symbol)
The fiat balance should be displayed using the same `fmtCurrency` function as crypto values, showing the currency symbol (e.g., "Rp5,428,587").

### Fix 5: Remove duplicate analytics from OverviewTab
Remove the "Advanced Analytics" section (Section 7, lines 462-478) from `OverviewTab.tsx`. This section already exists in `FinanceChartsTab.tsx`.

### Fix 6: Remove the duplicate charts tab block (CRITICAL)
In `FinancePage.tsx`, DELETE the second `{activeTab === 'charts' && ...}` block (lines 1184-1234). Keep only the first one (lines 1147-1167) which renders `<FinanceChartsTab>`. Both use `key="charts"` which causes React key conflicts and blocks tab switching.

### Fix 7: Keep FinanceChartsTab as the financial analysis home
Ensure `FinanceChartsTab.tsx` contains ALL financial analysis components (LiquidityWaterfall, CashFlowRunway, SubscriptionBurdenRadar, WalletHealthScorecards, TransferCostMatrix) and nothing else is duplicated.

## Constraints
- Must work with existing `finance_wallets` and `finance_transactions` tables
- All monetary values must use comma formatting
- The `wallet.balance` field must be the source of truth for fiat balance
- When a crypto buy transaction is created, `wallet.balance` must decrease by the fiat cost
- When a crypto sell transaction is created, `wallet.balance` must increase by the fiat received

## Output Format
Provide a `RESULT.md` containing:
1. **The Logic Specification**: Exact formulas for fiat balance, total value, P&L, and net worth
2. **Code Changes**: Exact file paths, line numbers, and code diffs for each fix
3. **Verification**: How to test each fix works correctly
