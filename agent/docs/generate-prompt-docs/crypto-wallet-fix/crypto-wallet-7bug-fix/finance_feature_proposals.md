# 🏦 Finance Dashboard Enhancement Proposals
## Direct Analysis & Feature Specifications

---

## Executive Summary

The top 3 features to implement are: **(1) Liquidity Waterfall** — instantly answers "can I afford this emergency?" by showing accessible cash vs locked assets; **(2) Subscription Burden Radar** — reveals how much income is trapped in recurring payments with upcoming renewal alerts; and **(3) Crypto-Fiat Unified Portfolio** — fixes the critical gap where crypto exchange fiat balances are invisible, showing combined fiat + crypto value. These three alone transform the dashboard from a history viewer into a financial decision-making tool.

---

## Feature 1: Liquidity Waterfall Chart
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. WHAT IT SHOWS**
How much of net worth is immediately accessible (cash/ewallet), semi-liquid (bank/debit), or locked (crypto/credit/physical). Answers: "If I need Rp 10M right now, can I get it?"

**2. DATA SOURCES**
- `finance_wallets`: `type`, `balance`, `currency`
- `finance_transactions`: `type='transfer'`, `from_wallet_id`, `to_wallet_id`, `date` (for transfer speed estimation)

**3. COMPUTATION**
```
LIQUIDITY TIERS:
  Tier 1 (Immediate): cash + physical + ewallet
  Tier 2 (Same-day): bank + debit_card  
  Tier 3 (1-3 days): credit_card (available credit) + other
  Tier 4 (Locked): crypto (portfolio value only, not fiat)

  For each tier: sum(balance) where wallet.type in tier_types

  Liquidity Score = (Tier1 + Tier2) / TotalNetWorth * 100

  Transfer Speed Matrix: 
    For each wallet pair, estimate transfer time based on historical 
    transfer data (avg time between from_wallet transfer out and 
    to_wallet transfer in with same transfer_id)
```

**4. VISUAL TYPE**
- **Stacked horizontal bar chart** (waterfall style) showing tiers from left (immediate) to right (locked)
- **Gauge chart** for Liquidity Score (0-100%)
- **Color coding**: Tier 1 = emerald, Tier 2 = blue, Tier 3 = amber, Tier 4 = purple

**5. WHY IT'S USEFUL**
Most people think "I have Rp 50M" but can't access it. This reveals the true emergency fund capacity. Critical for users with heavy crypto allocations.

**6. EMPTY STATE**
Show placeholder tiers with "Add wallets to see liquidity breakdown" and a CTA to add a cash/ewallet for emergency funds.

**7. NEW IPC ENDPOINT**
```typescript
ipcMain.handle('finance:get-liquidity-breakdown', async () => {
  // Returns: { tiers: [{name, amount, percentage, wallets}], 
  //           liquidityScore: number, 
  //           transferSpeedMatrix: [{from, to, avgMinutes}] }
})
```

---

## Feature 2: Subscription Burden Radar + Renewal Timeline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. WHAT IT SHOWS**
How much monthly income is consumed by subscriptions, which subscriptions are up for renewal soon, and whether the subscription stack is growing.

**2. DATA SOURCES**
- `finance_subscriptions`: `price`, `currency`, `billing_cycle`, `billing_interval`, `next_renewal_date`, `status`
- `finance_transactions`: `type='income'` (monthly average)
- `finance_wallets`: `currency` (for conversion)

**3. COMPUTATION**
```
MONTHLY_SUBSCRIPTION_COST:
  For each subscription:
    monthly_equivalent = price * (30.44 / billing_interval_days)
    where billing_interval_days = 
      'daily' → 1, 'weekly' → 7, 'monthly' → 30.44, 
      'quarterly' → 91.31, 'yearly' → 365.25, 'custom' → interval

  TotalMonthlySubCost = sum(monthly_equivalent for active subs)

SUBSCRIPTION_BURDEN:
  MonthlyIncome = avg(income transactions last 3 months)
  BurdenPercentage = (TotalMonthlySubCost / MonthlyIncome) * 100

RENEWAL_URGENCY:
  For each sub with next_renewal_date within 30 days:
    urgency_score = 1 - (days_until_renewal / 30)
    cost_at_risk = price * (urgency_score > 0.7 ? 1 : 0)

SUBSCRIPTION_GROWTH:
  Compare current month sub cost vs 3 months ago
  Trend = (current - previous) / previous * 100
```

**4. VISUAL TYPE**
- **Radar/Spider chart** with 5 axes: Burden %, Growth Trend, Upcoming Renewals, Cancellation Opportunity, Price per Use (if usage data available)
- **Timeline strip** below: horizontal bar with subscription renewal dates as dots, color-coded by cost (red = expensive, green = cheap)
- **Alert badges** for renewals in next 7 days

**5. WHY IT'S USEFUL**
Subscription creep is real. Users often don't realize they're spending 30%+ of income on subscriptions. The renewal timeline prevents surprise charges.

**6. EMPTY STATE**
Show "No active subscriptions" with a CTA to add subscriptions. Show sample radar chart with demo data and "Add your first subscription to see your burden."

**7. NEW IPC ENDPOINT**
```typescript
ipcMain.handle('finance:get-subscription-intelligence', async () => {
  // Returns: { totalMonthlyCost, burdenPercentage, upcomingRenewals: [],
  //            growthTrend, radarData: {axes, values}, timelineData: [] }
})
```

---

## Feature 3: Crypto-Fiat Unified Portfolio (CRITICAL BUG FIX)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. WHAT IT SHOWS**
The complete value of a crypto wallet: fiat balance (IDR/USD sitting in the exchange) PLUS crypto portfolio value (coins * current price).

**2. DATA SOURCES**
- `finance_wallets`: `balance`, `currency`, `type='crypto'`, `metadata`
- `metadata.assets[]`: `amount`, `avg_buy_price`, `current_price` (fetched from CoinGecko)

**3. COMPUTATION**
```
CRYPTO_WALLET_TOTAL_VALUE:
  FiatBalance = wallet.balance  // IDR/USD in the exchange
  CryptoPortfolioValue = sum(asset.amount * asset.current_price for asset in metadata.assets)
  TotalValue = FiatBalance + CryptoPortfolioValue

  CostBasis = sum(asset.amount * asset.avg_buy_price)
  UnrealizedPnL = CryptoPortfolioValue - CostBasis
  PnLPercentage = (UnrealizedPnL / CostBasis) * 100

  FiatAllocation = FiatBalance / TotalValue * 100
  CryptoAllocation = CryptoPortfolioValue / TotalValue * 100

  // For the overall crypto allocation doughnut:
  PerCoinValue = asset.amount * asset.current_price
  PerCoinPercentage = PerCoinValue / CryptoPortfolioValue * 100
```

**4. VISUAL TYPE**
- **Dual-balance card**: Large number for Total Value, with smaller sub-lines for "Fiat: Rp X" and "Crypto: Rp Y"
- **Nested doughnut**: Outer ring = Fiat vs Crypto allocation. Inner ring = Per-coin breakdown (only if crypto > 0)
- **PnL indicator**: Green/red badge next to portfolio value
- **Fiat deposit history**: Mini line chart showing fiat balance over time (from transfer transactions)

**5. WHY IT'S USEFUL**
Currently, a user with Rp 5M fiat + Rp 20M crypto in Binance sees only the crypto. They think they have Rp 20M but actually have Rp 25M. This is a fundamental data integrity issue.

**6. EMPTY STATE**
Show "No crypto assets yet" with fiat balance prominently displayed. CTA to "Buy your first crypto" or "Deposit fiat."

**7. SCHEMA CHANGES**
```sql
-- Migration: Add fiat_balance tracking to crypto wallets
-- Option A: Use existing balance column for fiat (RECOMMENDED)
-- Option B: Add to metadata: { fiat_balance: number, fiat_currency: string }
-- 
-- Update create-transfer handler:
--   IF to_wallet.type == 'crypto':
--     to_wallet.balance += transfer_amount  // fiat deposit
--   IF from_wallet.type == 'crypto':
--     from_wallet.balance -= transfer_amount  // fiat withdrawal
--
-- Update create-transaction for crypto buys:
--   IF wallet.type == 'crypto' AND transaction is 'buy_crypto':
--     wallet.balance -= fiat_spent
--     metadata.assets.push({coin_id, amount, avg_buy_price})
```

**7. NEW IPC ENDPOINT**
```typescript
ipcMain.handle('finance:get-crypto-unified-portfolio', async (walletId: number) => {
  // Returns: { fiatBalance, cryptoPortfolioValue, totalValue, 
  //            costBasis, unrealizedPnL, pnlPercentage,
  //            fiatAllocation, cryptoAllocation, assets: [] }
})
```

---

## Feature 4: Transfer Cost Matrix (Heatmap)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. WHAT IT SHOWS**
The cost (fee + time) of transferring between every pair of wallets. Answers: "What's the cheapest/fastest way to move money from Bank A to E-Wallet B?"

**2. DATA SOURCES**
- `finance_wallets`: `transfer_fee_type`, `transfer_fee_value`, `name`, `type`
- `finance_transactions`: `type='transfer'`, `fee`, `from_wallet_id`, `to_wallet_id`, `amount`, `date`, `time`

**3. COMPUTATION**
```
FEE_CALCULATION_PER_ROUTE:
  For each wallet pair (from, to):
    fee_type = from.transfer_fee_type  // 'none', 'fixed', 'percentage', 'tiered'
    fee_value = from.transfer_fee_value

    estimated_fee = 
      'none' → 0
      'fixed' → fee_value
      'percentage' → amount * fee_value
      'tiered' → lookup tier based on amount

    historical_avg_fee = avg(fee) from past transfers on this route
    historical_avg_time = avg(time difference between paired transfer legs)

    cost_efficiency_score = 1 - (estimated_fee / amount)  // 1 = perfect, 0 = 100% fee

MATRIX_CELL_VALUE:
  cell_value = estimated_fee
  cell_color = heatmap gradient based on cost_efficiency_score

OPTIMAL_ROUTE:
  For a given target amount, find the route with minimum total fee
  (including intermediate hops if direct route is expensive)
```

**4. VISUAL TYPE**
- **Heatmap matrix**: Rows = source wallets, Columns = destination wallets. Color intensity = fee amount. Hover shows exact fee + estimated time.
- **Optimal route highlight**: When user selects a source and destination, highlight the cheapest path (may include 1 intermediate wallet).
- **Fee breakdown tooltip**: "Fixed fee: Rp 5,000 | Historical avg time: 2 minutes"

**5. WHY IT'S USEFUL**
Users waste money on unnecessary transfer fees. A user might transfer Bank→E-Wallet (Rp 5,000 fee) when Bank→Bank (free) → E-Wallet (free) is cheaper. This pays for itself.

**6. EMPTY STATE**
Show empty matrix with "No transfer history yet. Make your first transfer to see fee analysis." Show sample heatmap with demo data.

**7. NEW IPC ENDPOINT**
```typescript
ipcMain.handle('finance:get-transfer-cost-matrix', async () => {
  // Returns: { matrix: [{fromWalletId, toWalletId, fee, efficiencyScore, avgTime}], 
  //            optimalRoutes: [{from, to, path, totalFee}] }
})
```

---

## Feature 5: Cash Flow Runway + Burn Rate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. WHAT IT SHOWS**
How many months the user can survive at current spending rate. Like a "financial fuel gauge."

**2. DATA SOURCES**
- `finance_transactions`: `type='expense'`, `amount`, `date` (last 90 days)
- `finance_wallets`: `balance` (total liquid net worth)
- `finance_subscriptions`: `price`, `billing_cycle` (committed future expenses)

**3. COMPUTATION**
```
BURN_RATE:
  DailyExpense = avg(daily expense total over last 90 days)
  MonthlyExpense = DailyExpense * 30.44

  // Exclude one-time large expenses (outliers > 2 std dev)
  ExpenseStdDev = std_dev(daily expenses)
  FilteredDaily = avg(daily expenses where expense < mean + 2*std_dev)

RUNWAY:
  LiquidNetWorth = sum(balance for non-crypto, non-credit wallets)
  RunwayMonths = LiquidNetWorth / MonthlyExpense

  // With subscription commitment adjustment:
  CommittedMonthly = sum(subscription monthly equivalents)
  AdjustedRunway = LiquidNetWorth / (MonthlyExpense + CommittedMonthly)

  // Projection line:
  For month in 1..12:
    projected_balance = LiquidNetWorth - (MonthlyExpense * month) - (CommittedMonthly * month)
    if projected_balance < 0: break_at_month = month
```

**4. VISUAL TYPE**
- **Fuel gauge chart**: Semi-circle gauge showing RunwayMonths (0-12 months scale). Color: green (>6mo), amber (3-6mo), red (<3mo)
- **Projection line chart**: X-axis = months, Y-axis = projected balance. Line starts at current net worth, slopes down. Red zone shading when balance < 0.
- **Burn rate badge**: "Burning Rp X per day" with trend arrow (up/down vs last month)

**5. WHY IT'S USEFUL**
The most important financial metric for anyone: "How long can I survive?" This is especially critical for freelancers or people with irregular income.

**6. EMPTY STATE**
Show "Need more data" with a 3-month progress bar. "Track expenses for 30 more days to calculate your runway."

**7. NEW IPC ENDPOINT**
```typescript
ipcMain.handle('finance:get-cashflow-runway', async () => {
  // Returns: { runwayMonths, dailyBurnRate, monthlyBurnRate, 
  //            committedMonthly, projectedBalances: [{month, balance}], 
  //            breakEvenMonth, trendDirection }
})
```

---

## Feature 6: Spending Velocity & Momentum
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. WHAT IT SHOWS**
Whether the user is spending faster or slower than their historical average, with category-level momentum.

**2. DATA SOURCES**
- `finance_transactions`: `type='expense'`, `amount`, `date`, `category_id`, `wallet_id`
- `finance_categories`: `name`, `color`

**3. COMPUTATION**
```
VELOCITY_METRICS:
  // 7-day rolling average spend
  Rolling7Day = sum(expenses in last 7 days) / 7

  // 30-day rolling average spend  
  Rolling30Day = sum(expenses in last 30 days) / 30

  // Acceleration: change in velocity
  VelocityLastWeek = sum(expenses day-14 to day-7) / 7
  VelocityThisWeek = sum(expenses day-7 to day-0) / 7
  Acceleration = (VelocityThisWeek - VelocityLastWeek) / VelocityLastWeek * 100

  // Momentum by category (month-over-month)
  For each category:
    ThisMonth = sum(expenses this month in category)
    LastMonth = sum(expenses last month in category)
    Momentum = (ThisMonth - LastMonth) / LastMonth * 100

  // Anomaly detection (spending days > 2 std dev above mean)
  MeanDaily = avg(daily expense)
  StdDev = std_dev(daily expense)
  AnomalyDays = count(days where daily_expense > MeanDaily + 2*StdDev)
```

**4. VISUAL TYPE**
- **Sparkline + big number**: Current 7-day avg with sparkline showing last 30 days
- **Momentum bars**: Horizontal bar chart showing category momentum. Green = slowing down, Red = speeding up. Sorted by absolute momentum.
- **Anomaly calendar**: Calendar grid where each day is colored by spend intensity. Dark red = anomaly day. Hover shows what was bought.

**5. WHY IT'S USEFUL**
People don't realize their spending is accelerating until it's too late. This catches the trend early. The anomaly calendar helps identify emotional spending days.

**6. EMPTY STATE**
Show "Not enough data" with a 30-day countdown. "Track expenses for 15 more days to see velocity trends."

**7. NEW IPC ENDPOINT**
```typescript
ipcMain.handle('finance:get-spending-velocity', async () => {
  // Returns: { rolling7Day, rolling30Day, acceleration, 
  //            categoryMomentum: [{categoryId, name, momentum, color}],
  //            anomalyDays: [{date, amount, transactions}], 
  //            sparklineData: [{date, amount}] }
})
```

---

## Feature 7: Obligation Stack (Follow-Through Waterfall)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. WHAT IT SHOWS**
All debts owed to others (follow-through expenses) ranked by urgency, with repayment progress and person-level summaries.

**2. DATA SOURCES**
- `finance_transactions`: `type='expense'`, `on_behalf_of=1`, `on_behalf_of_label`, `ft_person_id`, `amount`, `date`, `wallet_id`
- `finance_wallets`: `balance`, `initial_balance` (for derived amounts since expense amounts are 0)

**3. COMPUTATION**
```
OBLIGATION_CALCULATION:
  // Since expense amounts are 0, derive from wallet deltas
  WalletSpending = max(0, wallet.initial_balance - wallet.balance)

  For each ft_person_id / on_behalf_of_label:
    // Get all follow-through transactions for this person
    PersonTxns = transactions where on_behalf_of=1 AND ft_person_id=?

    // Distribute wallet spending proportionally
    PersonTotal = sum( WalletSpending[txn.wallet_id] / count(expenses in that wallet) )

    // Repayment tracking (if any income transactions tagged with this person)
    Repayments = sum(income transactions where note contains person name or ft_person_id)
    Remaining = PersonTotal - Repayments

    // Urgency score (0-100)
    DaysSinceLastActivity = today - max(txn.date)
    Urgency = min(100, (DaysSinceLastActivity / 30) * 100 + (Remaining / MonthlyIncome) * 100)

  // Sort by Urgency descending
```

**4. VISUAL TYPE**
- **Waterfall bars**: Each person is a horizontal bar. Left side = total owed, right side = repaid. Remaining = colored segment. Sorted by urgency.
- **Urgency badges**: "Overdue" (red), "Due Soon" (amber), "On Track" (green)
- **Person cards**: Click to see transaction history with that person

**5. WHY IT'S USEFUL**
Follow-through expenses are often forgotten. This creates accountability and prevents social debt from accumulating.

**6. EMPTY STATE**
Show "No follow-through expenses" with a celebratory message. "You're debt-free to others! 🎉"

**7. NEW IPC ENDPOINT**
```typescript
ipcMain.handle('finance:get-obligation-stack', async () => {
  // Returns: { obligations: [{personId, label, totalOwed, repaid, remaining, 
  //                         urgencyScore, daysSinceActivity, transactions}] }
})
```

---

## Feature 8: Wallet Health Scorecards
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. WHAT IT SHOWS**
Per-wallet health metrics: balance drift, transaction frequency, fee burden, and whether the wallet is "bleeding" money.

**2. DATA SOURCES**
- `finance_wallets`: `balance`, `initial_balance`, `type`, `name`, `transfer_fee_type`, `transfer_fee_value`
- `finance_transactions`: `wallet_id`, `type`, `amount`, `fee`, `date`

**3. COMPUTATION**
```
WALLET_HEALTH_SCORE (0-100):
  BalanceDrift = (balance - initial_balance) / initial_balance * 100
  // Negative drift = losing money (for bank/cash wallets)
  // Positive drift = gaining money (for income wallets)

  TransactionFrequency = count(transactions in last 30 days)
  AvgTransactionSize = avg(abs(amount) for transactions in this wallet)

  FeeBurden = sum(fees in last 30 days) / sum(abs(amounts) in last 30 days) * 100

  HealthScore = 
    40 * (1 - abs(BalanceDrift) / 100) +  // Less drift = better
    30 * min(1, TransactionFrequency / 10) +  // Some activity is good
    30 * (1 - FeeBurden / 100)  // Less fees = better

  // Special rules:
  // Credit card: negative drift is GOOD (paying off debt)
  // Crypto: high volatility is expected, score based on PnL instead
  // Physical/Cash: drift should match denomination count
```

**4. VISUAL TYPE**
- **Card grid**: Each wallet is a card with:
  - Wallet name + icon
  - Circular progress indicator for Health Score (color-coded)
  - Mini sparkline of balance over last 30 days
  - "Drift: -12%" badge
  - Alert icon if denominations don't match balance (for physical/cash)

**5. WHY IT'S USEFUL**
Users have multiple wallets and lose track of which ones are draining. This surfaces problems like "your e-wallet has 15% fee burden" or "your physical wallet is Rp 50k short."

**6. EMPTY STATE**
Show wallet cards with "No transactions yet" and a "Add your first transaction" CTA per wallet.

**7. NEW IPC ENDPOINT**
```typescript
ipcMain.handle('finance:get-wallet-health', async () => {
  // Returns: { wallets: [{walletId, name, healthScore, balanceDrift, 
  //                       transactionFrequency, feeBurden, sparklineData, 
  //                       alerts: []}] }
})
```

---

## Feature 9: Predictive Cash Flow (3-Month Projection)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. WHAT IT SHOWS**
A forward-looking view of expected cash flow for the next 3 months, including guaranteed expenses (subscriptions) and predicted discretionary spending.

**2. DATA SOURCES**
- `finance_subscriptions`: `price`, `billing_cycle`, `next_renewal_date`, `billing_interval`
- `finance_transactions`: `type='expense'`, `amount`, `date`, `category_id`, `is_recurring`
- `finance_wallets`: `balance`

**3. COMPUTATION**
```
PREDICTED_CASH_FLOW:
  // Guaranteed outflows (subscriptions)
  For each month in next 3 months:
    SubscriptionsDue = sum(sub.price where next_renewal_date falls in this month)

  // Predicted discretionary spending
  AvgDiscretionary = avg(monthly non-subscription expenses last 3 months)
  DiscretionaryTrend = linear regression slope of last 3 months

  For month in 1..3:
    PredictedExpense = SubscriptionsDue[month] + (AvgDiscretionary + DiscretionaryTrend * month)

  // Predicted income (if recurring income exists)
  RecurringIncome = sum(income transactions where is_recurring=1)
  AvgIncome = avg(monthly income last 3 months)

  For month in 1..3:
    PredictedIncome = RecurringIncome + AvgIncome
    NetFlow = PredictedIncome - PredictedExpense
    ProjectedBalance = CurrentBalance + sum(NetFlow for months 1..month)

  // Confidence intervals
  // Lower bound: AvgIncome - std_dev, Expense + std_dev
  // Upper bound: AvgIncome + std_dev, Expense - std_dev
```

**4. VISUAL TYPE**
- **Area chart**: X-axis = months. Three layers:
  - Bottom (certain): Subscription expenses (solid color)
  - Middle (predicted): Discretionary spending (hatched pattern)
  - Top (projected): Income (green area)
  - Net line: Projected balance (bold line)
- **Confidence band**: Shaded area around projected balance showing best/worst case
- **Alert markers**: Red dots on months where projected balance < 0

**5. WHY IT'S USEFUL**
This is the only forward-looking feature. It answers "can I afford to buy X next month?" and prevents overdrafts.

**6. EMPTY STATE**
Show "Need 3 months of data for predictions" with a progress bar. Show sample projection with demo data.

**7. NEW IPC ENDPOINT**
```typescript
ipcMain.handle('finance:get-cashflow-projection', async () => {
  // Returns: { months: [{month, subscriptionExpense, discretionaryExpense, 
  //                      predictedIncome, netFlow, projectedBalance, 
  //                      lowerBound, upperBound}], 
  //            alerts: [{month, reason}] }
})
```

---

## Feature 10: Physical Wallet Denomination Breakdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. WHAT IT SHOWS**
For physical/cash wallets, a visual breakdown of exactly which bills and coins are in the wallet, with auto-reconciliation against the total balance.

**2. DATA SOURCES**
- `finance_wallets`: `type='physical'|'cash'`, `balance`, `metadata.denomination`
- `metadata`: `{ denominations: [{value, label, count}] }`

**3. COMPUTATION**
```
DENOMINATION_TOTAL:
  CalculatedTotal = sum(denomination.value * denomination.count)

  RECONCILIATION:
    if abs(CalculatedTotal - wallet.balance) > 0.01:
      status = 'MISMATCH'
      difference = CalculatedTotal - wallet.balance
    else:
      status = 'RECONCILED'

  // Denomination efficiency (how many pieces of money)
  TotalPieces = sum(denomination.count)
  AvgDenominationSize = CalculatedTotal / TotalPieces

  // "Optimal" denomination mix for the balance
  // (Greedy algorithm: use largest denominations first)
  OptimalMix = greedy_denomination_make_change(wallet.balance, available_denominations)
  EfficiencyScore = TotalPieces / sum(OptimalMix.count)  // 1.0 = optimal, >1 = carrying extra small bills
```

**4. VISUAL TYPE**
- **Denomination bars**: Vertical bar chart where each bar is a denomination (Rp 100k, Rp 50k, etc.). Height = total value of that denomination. Number on top = count of bills.
- **Reconciliation badge**: Green checkmark if matched, red warning with difference amount if not.
- **Efficiency gauge**: "You're carrying 23 pieces. Optimal: 8 pieces." with a "suggest exchange" button.

**5. WHY IT'S USEFUL**
Physical wallets are the only place where users actually know exactly what bills they have. The app should reflect that granularity. The reconciliation catches data entry errors.

**6. EMPTY STATE**
Show "Add denominations to track your physical cash" with a form to add bill/coin counts.

**7. NEW IPC ENDPOINT**
```typescript
ipcMain.handle('finance:get-denomination-breakdown', async (walletId: number) => {
  // Returns: { denominations: [{value, label, count, total}], 
  //            calculatedTotal, walletBalance, difference, status,
  //            totalPieces, efficiencyScore, optimalMix: [] }
})
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 days each)
1. **Feature 3: Crypto-Fiat Unified Portfolio** — Critical bug fix, high impact
2. **Feature 10: Denomination Breakdown** — Data already exists, just needs visualization
3. **Feature 2: Subscription Burden** — Subscriptions table already exists

### Phase 2: Medium Effort (3-5 days each)
4. **Feature 1: Liquidity Waterfall** — Requires new IPC handler + categorization logic
5. **Feature 7: Obligation Stack** — Complex derived amount calculation
6. **Feature 8: Wallet Health Scorecards** — Per-wallet analysis + sparklines

### Phase 3: Complex (5-7 days each)
7. **Feature 4: Transfer Cost Matrix** — Pairwise computation + heatmap
8. **Feature 5: Cash Flow Runway** — Statistical analysis + projection
9. **Feature 6: Spending Velocity** — Time-series analysis + anomaly detection
10. **Feature 9: Predictive Cash Flow** — Most complex, requires confidence intervals

---

## Schema Migrations Required

```sql
-- Migration 1: Add fiat_balance tracking to crypto wallet metadata
-- (Already using balance column, but ensure metadata has fiat_currency)
-- No schema change needed if we repurpose balance column

-- Migration 2: Add transfer_speed_estimate to wallet pairs (optional, for heatmap)
CREATE TABLE IF NOT EXISTS finance_transfer_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_wallet_id INTEGER NOT NULL,
  to_wallet_id INTEGER NOT NULL,
  avg_fee REAL DEFAULT 0,
  avg_time_minutes REAL DEFAULT 0,
  transfer_count INTEGER DEFAULT 0,
  last_transfer_date TEXT,
  UNIQUE(from_wallet_id, to_wallet_id)
);

-- Migration 3: Add ft_person table for follow-through tracking
CREATE TABLE IF NOT EXISTS finance_ft_persons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10b981',
  total_owed REAL DEFAULT 0,
  total_repaid REAL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now','localtime'))
);

-- Migration 4: Add is_recurring flag consistency (already exists in transactions)
-- No change needed
```

---

## New IPC Endpoints Summary

| Endpoint | Returns | Complexity |
|----------|---------|------------|
| `finance:get-liquidity-breakdown` | Tiers, score, transfer speeds | Medium |
| `finance:get-subscription-intelligence` | Burden %, radar, timeline | Low |
| `finance:get-crypto-unified-portfolio` | Fiat + crypto combined | Low |
| `finance:get-transfer-cost-matrix` | Fee matrix, optimal routes | Medium |
| `finance:get-cashflow-runway` | Runway months, burn rate, projection | High |
| `finance:get-spending-velocity` | Velocity, momentum, anomalies | High |
| `finance:get-obligation-stack` | Person debts, urgency, repayment | Medium |
| `finance:get-wallet-health` | Per-wallet scores, drift, alerts | Medium |
| `finance:get-cashflow-projection` | 3-month forecast with confidence | High |
| `finance:get-denomination-breakdown` | Bill counts, reconciliation | Low |
