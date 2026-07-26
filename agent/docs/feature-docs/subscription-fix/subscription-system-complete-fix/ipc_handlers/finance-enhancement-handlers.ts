// ============================================================================
// FINANCE DASHBOARD ENHANCEMENT — IPC Handlers
// src/main.ts additions
// ============================================================================
// Add these handlers alongside existing finance IPC handlers.
// All handlers follow the pattern: { success: true, data: ... } | { success: false, error: ... }
// ============================================================================

import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

// ============================================================================
// HELPER: Compute derived expense per wallet (for corrupted expense amounts)
// ============================================================================
function computeDerivedExpenseByWallet(db: Database.Database): Map<number, number> {
  const wallets = db.prepare(`
    SELECT id, initial_balance, balance 
    FROM finance_wallets 
    WHERE is_archived = 0
  `).all() as Array<{ id: number; initial_balance: number; balance: number }>;

  const result = new Map<number, number>();
  for (const w of wallets) {
    const spending = Math.max(0, w.initial_balance - w.balance);
    result.set(w.id, spending);
  }
  return result;
}

// ============================================================================
// HELPER: Get monthly income average
// ============================================================================
function getMonthlyIncomeAverage(db: Database.Database): number {
  const row = db.prepare(`
    SELECT COALESCE(AVG(monthly_total), 0) as avg_income
    FROM (
      SELECT strftime('%Y-%m', date) as month, SUM(amount) as monthly_total
      FROM finance_transactions
      WHERE type = 'transfer' AND amount > 0
      GROUP BY month
      ORDER BY month DESC
      LIMIT 3
    )
  `).get() as { avg_income: number };
  return Number(row.avg_income);
}

// ============================================================================
// FEATURE 1: Crypto-Fiat Unified Portfolio
// ============================================================================
// CRITICAL BUG FIX: Crypto wallets now properly track fiat balance separately
// from crypto assets. wallet.balance = fiat (IDR/USD), metadata.assets = coins.
// ============================================================================

ipcMain.handle('finance:get-crypto-unified-portfolio', async (_event, walletId: number) => {
  try {
    const db = getDb();

    // Get wallet with metadata
    const wallet = db.prepare(`
      SELECT id, name, balance, currency, metadata, type
      FROM finance_wallets
      WHERE id = ? AND type = 'crypto' AND is_archived = 0
    `).get(walletId) as {
      id: number; name: string; balance: number; currency: string;
      metadata: string | null; type: string;
    } | undefined;

    if (!wallet) {
      return { success: false, error: 'Crypto wallet not found' };
    }

    // Parse metadata for assets
    let assets: Array<{
      coin_id: string; symbol: string; name: string;
      amount: number; avg_buy_price: number; current_price?: number;
    }> = [];

    if (wallet.metadata) {
      try {
        const meta = JSON.parse(wallet.metadata);
        assets = meta.assets || [];
      } catch {
        assets = [];
      }
    }

    // Fetch live prices for all assets
    const coinIds = assets.map(a => a.coin_id).filter(Boolean);
    let prices: Record<string, number> = {};

    if (coinIds.length > 0) {
      try {
        const priceData = await fetchCryptoPrices(coinIds); // Uses existing CoinGecko integration
        prices = priceData;
      } catch (e) {
        console.error('Failed to fetch crypto prices:', e);
        // Fallback to stored current_price in metadata
        prices = {};
      }
    }

    // Calculate portfolio values
    let cryptoPortfolioValue = 0;
    let costBasis = 0;
    const enrichedAssets = [];

    for (const asset of assets) {
      const currentPrice = prices[asset.coin_id] || asset.current_price || asset.avg_buy_price;
      const assetValue = asset.amount * currentPrice;
      const assetCost = asset.amount * asset.avg_buy_price;

      cryptoPortfolioValue += assetValue;
      costBasis += assetCost;

      enrichedAssets.push({
        ...asset,
        current_price: currentPrice,
        value: assetValue,
        cost_basis: assetCost,
        pnl: assetValue - assetCost,
        pnl_percentage: assetCost > 0 ? ((assetValue - assetCost) / assetCost) * 100 : 0,
      });
    }

    const fiatBalance = wallet.balance;
    const totalValue = fiatBalance + cryptoPortfolioValue;
    const unrealizedPnL = cryptoPortfolioValue - costBasis;
    const pnlPercentage = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

    const fiatAllocation = totalValue > 0 ? (fiatBalance / totalValue) * 100 : 0;
    const cryptoAllocation = totalValue > 0 ? (cryptoPortfolioValue / totalValue) * 100 : 0;

    return {
      success: true,
      data: {
        walletId: wallet.id,
        walletName: wallet.name,
        currency: wallet.currency,
        fiatBalance: Math.round(fiatBalance * 100) / 100,
        cryptoPortfolioValue: Math.round(cryptoPortfolioValue * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        costBasis: Math.round(costBasis * 100) / 100,
        unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
        pnlPercentage: Math.round(pnlPercentage * 100) / 100,
        fiatAllocation: Math.round(fiatAllocation * 100) / 100,
        cryptoAllocation: Math.round(cryptoAllocation * 100) / 100,
        assets: enrichedAssets,
      }
    };
  } catch (error) {
    console.error('Error in finance:get-crypto-unified-portfolio:', error);
    return { success: false, error: String(error) };
  }
});

// ============================================================================
// FEATURE 2: Liquidity Waterfall Breakdown
// ============================================================================
ipcMain.handle('finance:get-liquidity-breakdown', async () => {
  try {
    const db = getDb();

    // Define liquidity tiers
    const tiers = [
      { name: 'Immediate', types: ['cash', 'physical', 'ewallet'], color: '#10b981', icon: '💵' },
      { name: 'Same Day', types: ['bank', 'debit_card'], color: '#3b82f6', icon: '🏦' },
      { name: '1-3 Days', types: ['credit_card', 'other'], color: '#f59e0b', icon: '💳' },
      { name: 'Locked', types: ['crypto'], color: '#8b5cf6', icon: '⛓️' },
    ];

    const wallets = db.prepare(`
      SELECT id, name, type, balance, currency, metadata
      FROM finance_wallets
      WHERE is_archived = 0
      ORDER BY balance DESC
    `).all() as Array<{
      id: number; name: string; type: string; balance: number;
      currency: string; metadata: string | null;
    }>;

    const tierData = [];
    let totalNetWorth = 0;

    for (const tier of tiers) {
      const tierWallets = wallets.filter(w => tier.types.includes(w.type));
      let tierAmount = 0;
      const walletDetails = [];

      for (const w of tierWallets) {
        let amount = w.balance;

        // For crypto wallets, include fiat balance only (not portfolio)
        // Portfolio is "locked" but fiat in exchange is semi-liquid
        if (w.type === 'crypto') {
          // Crypto fiat balance is in the balance column
          // Portfolio value is separate and stays in tier 4
          amount = w.balance; // This is the fiat portion
        }

        tierAmount += amount;
        walletDetails.push({
          id: w.id,
          name: w.name,
          balance: amount,
          currency: w.currency,
        });
      }

      totalNetWorth += tierAmount;

      tierData.push({
        name: tier.name,
        amount: Math.round(tierAmount * 100) / 100,
        color: tier.color,
        icon: tier.icon,
        wallets: walletDetails,
        percentage: 0, // Calculated after total
      });
    }

    // Calculate percentages
    for (const tier of tierData) {
      tier.percentage = totalNetWorth > 0 ? Math.round((tier.amount / totalNetWorth) * 10000) / 100 : 0;
    }

    // Liquidity score: (Immediate + Same Day) / Total
    const liquidAmount = (tierData[0]?.amount || 0) + (tierData[1]?.amount || 0);
    const liquidityScore = totalNetWorth > 0 ? Math.round((liquidAmount / totalNetWorth) * 10000) / 100 : 0;

    // Transfer speed estimates (from historical data)
    const transferSpeeds = db.prepare(`
      SELECT 
        fw1.name as from_wallet,
        fw2.name as to_wallet,
        AVG(
          (julianday(t2.date) - julianday(t1.date)) * 24 * 60
        ) as avg_minutes
      FROM finance_transactions t1
      JOIN finance_transactions t2 ON t1.transfer_id = t2.transfer_id
      JOIN finance_wallets fw1 ON t1.from_wallet_id = fw1.id
      JOIN finance_wallets fw2 ON t2.to_wallet_id = fw2.id
      WHERE t1.type = 'transfer' AND t1.amount < 0
        AND t2.type = 'transfer' AND t2.amount > 0
        AND t1.transfer_id IS NOT NULL
      GROUP BY fw1.name, fw2.name
      HAVING avg_minutes IS NOT NULL
      ORDER BY avg_minutes ASC
      LIMIT 20
    `).all() as Array<{ from_wallet: string; to_wallet: string; avg_minutes: number }>;

    return {
      success: true,
      data: {
        tiers: tierData,
        totalNetWorth: Math.round(totalNetWorth * 100) / 100,
        liquidityScore,
        liquidAmount: Math.round(liquidAmount * 100) / 100,
        lockedAmount: Math.round((totalNetWorth - liquidAmount) * 100) / 100,
        transferSpeeds: transferSpeeds.map(s => ({
          from: s.from_wallet,
          to: s.to_wallet,
          avgMinutes: Math.round(s.avg_minutes * 100) / 100,
        })),
      }
    };
  } catch (error) {
    console.error('Error in finance:get-liquidity-breakdown:', error);
    return { success: false, error: String(error) };
  }
});

// ============================================================================
// FEATURE 3: Subscription Intelligence
// ============================================================================
ipcMain.handle('finance:get-subscription-intelligence', async () => {
  try {
    const db = getDb();

    const subscriptions = db.prepare(`
      SELECT id, name, price, currency, billing_cycle, billing_interval,
             next_renewal_date, status, cancel_reminder_days
      FROM finance_subscriptions
      WHERE status = 'active'
      ORDER BY next_renewal_date ASC
    `).all() as Array<{
      id: number; name: string; price: number; currency: string;
      billing_cycle: string; billing_interval: number;
      next_renewal_date: string; status: string; cancel_reminder_days: number;
    }>;

    // Calculate monthly equivalent for each subscription
    const BILLING_DAYS: Record<string, number> = {
      daily: 1, weekly: 7, monthly: 30.44, quarterly: 91.31, yearly: 365.25,
    };

    let totalMonthlyCost = 0;
    const subDetails = [];

    for (const sub of subscriptions) {
      const days = BILLING_DAYS[sub.billing_cycle] || (sub.billing_interval * 30.44);
      const monthlyEquivalent = (sub.price / days) * 30.44;
      totalMonthlyCost += monthlyEquivalent;

      const nextRenewal = new Date(sub.next_renewal_date);
      const today = new Date();
      const daysUntil = Math.ceil((nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      subDetails.push({
        id: sub.id,
        name: sub.name,
        price: sub.price,
        currency: sub.currency,
        billingCycle: sub.billing_cycle,
        monthlyEquivalent: Math.round(monthlyEquivalent * 100) / 100,
        nextRenewalDate: sub.next_renewal_date,
        daysUntilRenewal: daysUntil,
        isUrgent: daysUntil <= 7,
        isWarning: daysUntil <= sub.cancel_reminder_days && daysUntil > 7,
      });
    }

    // Calculate burden percentage
    const monthlyIncome = getMonthlyIncomeAverage(db);
    const burdenPercentage = monthlyIncome > 0 ? (totalMonthlyCost / monthlyIncome) * 100 : 0;

    // Growth trend: compare current month vs 3 months ago
    const currentMonthSubs = db.prepare(`
      SELECT COALESCE(SUM(price), 0) as total
      FROM finance_subscriptions
      WHERE status = 'active'
        AND created_at >= datetime('now', '-1 month')
    `).get() as { total: number };

    const threeMonthSubs = db.prepare(`
      SELECT COALESCE(SUM(price), 0) as total
      FROM finance_subscriptions
      WHERE status = 'active'
        AND created_at >= datetime('now', '-3 months')
    `).get() as { total: number };

    const growthTrend = threeMonthSubs.total > 0 
      ? ((currentMonthSubs.total - threeMonthSubs.total) / threeMonthSubs.total) * 100 
      : 0;

    // Upcoming renewals in next 30 days
    const upcomingRenewals = subDetails.filter(s => s.daysUntilRenewal <= 30);
    const urgentRenewals = upcomingRenewals.filter(s => s.isUrgent);

    // Radar chart data (5 axes)
    const radarData = {
      axes: ['Burden %', 'Growth Trend', 'Upcoming', 'Cancellation Opp', 'Price/Value'],
      values: [
        Math.min(100, burdenPercentage), // 0-100
        Math.min(100, Math.abs(growthTrend)), // 0-100
        Math.min(100, upcomingRenewals.length * 10), // 0-100 scale
        Math.min(100, subscriptions.length * 5), // cancellation opportunity
        50, // placeholder for price/value (would need usage data)
      ],
      colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'],
    };

    return {
      success: true,
      data: {
        totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
        burdenPercentage: Math.round(burdenPercentage * 100) / 100,
        monthlyIncome: Math.round(monthlyIncome * 100) / 100,
        subscriptionCount: subscriptions.length,
        growthTrend: Math.round(growthTrend * 100) / 100,
        upcomingRenewals: upcomingRenewals.length,
        urgentRenewals: urgentRenewals.length,
        radarData,
        subscriptions: subDetails,
      }
    };
  } catch (error) {
    console.error('Error in finance:get-subscription-intelligence:', error);
    return { success: false, error: String(error) };
  }
});

// ============================================================================
// FEATURE 4: Cash Flow Runway
// ============================================================================
ipcMain.handle('finance:get-cashflow-runway', async () => {
  try {
    const db = getDb();

    // Get daily expenses for last 90 days
    const dailyExpenses = db.prepare(`
      SELECT date, SUM(CASE WHEN amount != 0 THEN ABS(amount) ELSE 0 END) as daily_total
      FROM finance_transactions
      WHERE type = 'expense'
        AND date >= date('now', '-90 days')
      GROUP BY date
      ORDER BY date ASC
    `).all() as Array<{ date: string; daily_total: number }>;

    // Calculate statistics
    const expenseValues = dailyExpenses.map(d => d.daily_total);
    const meanExpense = expenseValues.length > 0 
      ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length 
      : 0;
    const stdDev = expenseValues.length > 0
      ? Math.sqrt(expenseValues.reduce((sq, n) => sq + Math.pow(n - meanExpense, 2), 0) / expenseValues.length)
      : 0;

    // Filter outliers (> 2 std dev)
    const filteredExpenses = expenseValues.filter(v => v <= meanExpense + 2 * stdDev);
    const dailyBurnRate = filteredExpenses.length > 0
      ? filteredExpenses.reduce((a, b) => a + b, 0) / filteredExpenses.length
      : 0;

    const monthlyBurnRate = dailyBurnRate * 30.44;

    // Get liquid net worth (exclude crypto and credit cards)
    const liquidWallets = db.prepare(`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM finance_wallets
      WHERE is_archived = 0
        AND type NOT IN ('crypto', 'credit_card')
    `).get() as { total: number };
    const liquidNetWorth = Number(liquidWallets.total);

    // Get committed monthly expenses (subscriptions)
    const subs = db.prepare(`
      SELECT price, billing_cycle, billing_interval
      FROM finance_subscriptions
      WHERE status = 'active'
    `).all() as Array<{ price: number; billing_cycle: string; billing_interval: number }>;

    const BILLING_DAYS: Record<string, number> = {
      daily: 1, weekly: 7, monthly: 30.44, quarterly: 91.31, yearly: 365.25,
    };

    let committedMonthly = 0;
    for (const sub of subs) {
      const days = BILLING_DAYS[sub.billing_cycle] || (sub.billing_interval * 30.44);
      committedMonthly += (sub.price / days) * 30.44;
    }

    const totalMonthlyBurn = monthlyBurnRate + committedMonthly;
    const runwayMonths = totalMonthlyBurn > 0 ? liquidNetWorth / totalMonthlyBurn : 999;

    // Projected balances for next 12 months
    const projectedBalances = [];
    for (let month = 1; month <= 12; month++) {
      const projectedBalance = liquidNetWorth - (totalMonthlyBurn * month);
      projectedBalances.push({
        month,
        projectedBalance: Math.round(projectedBalance * 100) / 100,
        isNegative: projectedBalance < 0,
      });
    }

    // Break-even month (when balance hits 0)
    const breakEvenMonth = projectedBalances.find(b => b.isNegative)?.month || null;

    // Trend direction (compare last 30 days vs previous 30 days)
    const last30Days = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN amount != 0 THEN ABS(amount) ELSE 0 END), 0) as total
      FROM finance_transactions
      WHERE type = 'expense' AND date >= date('now', '-30 days')
    `).get() as { total: number };

    const prev30Days = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN amount != 0 THEN ABS(amount) ELSE 0 END), 0) as total
      FROM finance_transactions
      WHERE type = 'expense' 
        AND date >= date('now', '-60 days')
        AND date < date('now', '-30 days')
    `).get() as { total: number };

    const trendDirection = prev30Days.total > 0
      ? ((last30Days.total - prev30Days.total) / prev30Days.total) * 100
      : 0;

    return {
      success: true,
      data: {
        runwayMonths: Math.round(runwayMonths * 100) / 100,
        dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
        monthlyBurnRate: Math.round(monthlyBurnRate * 100) / 100,
        committedMonthly: Math.round(committedMonthly * 100) / 100,
        totalMonthlyBurn: Math.round(totalMonthlyBurn * 100) / 100,
        liquidNetWorth: Math.round(liquidNetWorth * 100) / 100,
        breakEvenMonth,
        trendDirection: Math.round(trendDirection * 100) / 100,
        projectedBalances,
        dailyExpenseHistory: dailyExpenses.map(d => ({
          date: d.date,
          amount: Math.round(d.daily_total * 100) / 100,
        })),
      }
    };
  } catch (error) {
    console.error('Error in finance:get-cashflow-runway:', error);
    return { success: false, error: String(error) };
  }
});

// ============================================================================
// FEATURE 5: Wallet Health Scorecards
// ============================================================================
ipcMain.handle('finance:get-wallet-health', async () => {
  try {
    const db = getDb();

    const wallets = db.prepare(`
      SELECT id, name, type, balance, initial_balance, currency,
             transfer_fee_type, transfer_fee_value, metadata
      FROM finance_wallets
      WHERE is_archived = 0
      ORDER BY balance DESC
    `).all() as Array<{
      id: number; name: string; type: string; balance: number;
      initial_balance: number; currency: string;
      transfer_fee_type: string; transfer_fee_value: number; metadata: string | null;
    }>;

    const healthData = [];

    for (const wallet of wallets) {
      // Get last 30 days of transactions for this wallet
      const txns = db.prepare(`
        SELECT amount, fee, date, type
        FROM finance_transactions
        WHERE wallet_id = ? AND date >= date('now', '-30 days')
        ORDER BY date DESC
      `).all(wallet.id) as Array<{ amount: number; fee: number; date: string; type: string }>;

      const txnCount = txns.length;
      const totalVolume = txns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalFees = txns.reduce((sum, t) => sum + (t.fee || 0), 0);
      const feeBurden = totalVolume > 0 ? (totalFees / totalVolume) * 100 : 0;

      // Balance drift
      const balanceDrift = wallet.initial_balance !== 0
        ? ((wallet.balance - wallet.initial_balance) / Math.abs(wallet.initial_balance)) * 100
        : 0;

      // For credit cards, negative drift is GOOD (paying off debt)
      // For crypto, use PnL instead of drift
      let driftScore = 0;
      if (wallet.type === 'credit_card') {
        // Negative balance = debt, so moving toward 0 is good
        driftScore = wallet.balance <= 0 
          ? Math.min(100, Math.abs(balanceDrift)) 
          : Math.max(0, 100 - balanceDrift);
      } else if (wallet.type === 'crypto') {
        // Would need to calculate PnL from metadata
        driftScore = 50; // Neutral without full crypto analysis
      } else {
        // For normal wallets, less drift is better
        driftScore = Math.max(0, 100 - Math.abs(balanceDrift));
      }

      // Transaction frequency score (some activity is good, too much is suspicious)
      const frequencyScore = Math.min(100, txnCount * 10);

      // Fee burden score (less fees = better)
      const feeScore = Math.max(0, 100 - feeBurden * 5);

      // Overall health score (weighted)
      const healthScore = Math.round(
        (driftScore * 0.4) + (frequencyScore * 0.3) + (feeScore * 0.3)
      );

      // Get 30-day balance history for sparkline
      const balanceHistory = db.prepare(`
        SELECT date, SUM(CASE WHEN type = 'income' OR (type = 'transfer' AND amount > 0) THEN amount 
                              WHEN type = 'expense' OR (type = 'transfer' AND amount < 0) THEN -ABS(amount) 
                              ELSE 0 END) as net_change
        FROM finance_transactions
        WHERE wallet_id = ? AND date >= date('now', '-30 days')
        GROUP BY date
        ORDER BY date ASC
      `).all(wallet.id) as Array<{ date: string; net_change: number }>;

      // Calculate running balance from history
      let runningBalance = wallet.balance;
      const sparklineData = [];
      for (let i = balanceHistory.length - 1; i >= 0; i--) {
        sparklineData.unshift({
          date: balanceHistory[i].date,
          balance: Math.round(runningBalance * 100) / 100,
        });
        runningBalance -= balanceHistory[i].net_change;
      }

      // Alerts
      const alerts = [];
      if (wallet.type === 'physical' || wallet.type === 'cash') {
        // Check denomination reconciliation
        try {
          const meta = wallet.metadata ? JSON.parse(wallet.metadata) : {};
          const denominations = meta.denomination || meta.denominations || [];
          const calculatedTotal = denominations.reduce(
            (sum: number, d: { value: number; count: number }) => sum + (d.value * d.count), 0
          );
          if (Math.abs(calculatedTotal - wallet.balance) > 0.01) {
            alerts.push({
              type: 'mismatch',
              message: `Denomination count (Rp ${calculatedTotal.toLocaleString()}) doesn't match balance (Rp ${wallet.balance.toLocaleString()})`,
              severity: 'warning',
            });
          }
        } catch {
          // Invalid metadata, skip
        }
      }

      if (feeBurden > 5) {
        alerts.push({
          type: 'high_fees',
          message: `Fee burden is ${feeBurden.toFixed(1)}% of transaction volume`,
          severity: 'warning',
        });
      }

      if (wallet.balance < 0 && wallet.type !== 'credit_card') {
        alerts.push({
          type: 'negative_balance',
          message: `Wallet balance is negative`,
          severity: 'critical',
        });
      }

      healthData.push({
        walletId: wallet.id,
        name: wallet.name,
        type: wallet.type,
        balance: Math.round(wallet.balance * 100) / 100,
        currency: wallet.currency,
        healthScore,
        balanceDrift: Math.round(balanceDrift * 100) / 100,
        transactionFrequency: txnCount,
        feeBurden: Math.round(feeBurden * 100) / 100,
        sparklineData,
        alerts,
      });
    }

    return {
      success: true,
      data: { wallets: healthData }
    };
  } catch (error) {
    console.error('Error in finance:get-wallet-health:', error);
    return { success: false, error: String(error) };
  }
});

// ============================================================================
// FEATURE 6: Transfer Cost Matrix
// ============================================================================
ipcMain.handle('finance:get-transfer-cost-matrix', async () => {
  try {
    const db = getDb();

    const wallets = db.prepare(`
      SELECT id, name, type, transfer_fee_type, transfer_fee_value
      FROM finance_wallets
      WHERE is_archived = 0
      ORDER BY name
    `).all() as Array<{
      id: number; name: string; type: string;
      transfer_fee_type: string; transfer_fee_value: number;
    }>;

    // Get historical transfer data
    const historicalTransfers = db.prepare(`
      SELECT 
        t1.from_wallet_id,
        t2.to_wallet_id,
        t1.amount as outgoing_amount,
        ABS(t1.amount) as transfer_amount,
        t1.fee as fee_paid,
        t1.date
      FROM finance_transactions t1
      JOIN finance_transactions t2 ON t1.transfer_id = t2.transfer_id
      WHERE t1.type = 'transfer' AND t1.amount < 0
        AND t1.transfer_id IS NOT NULL
      ORDER BY t1.date DESC
    `).all() as Array<{
      from_wallet_id: number; to_wallet_id: number;
      outgoing_amount: number; transfer_amount: number;
      fee_paid: number; date: string;
    }>;

    // Build matrix
    const matrix = [];
    const optimalRoutes = [];

    for (const fromWallet of wallets) {
      for (const toWallet of wallets) {
        if (fromWallet.id === toWallet.id) continue;

        // Calculate estimated fee based on wallet fee settings
        let estimatedFee = 0;
        const feeType = fromWallet.transfer_fee_type || 'none';
        const feeValue = fromWallet.transfer_fee_value || 0;

        // Use a sample transfer amount of 1,000,000 for estimation
        const sampleAmount = 1000000;

        switch (feeType) {
          case 'fixed':
            estimatedFee = feeValue;
            break;
          case 'percentage':
            estimatedFee = sampleAmount * feeValue;
            break;
          case 'tiered':
            estimatedFee = feeValue; // Simplified
            break;
          default:
            estimatedFee = 0;
        }

        // Get historical average for this route
        const routeHistory = historicalTransfers.filter(
          t => t.from_wallet_id === fromWallet.id && t.to_wallet_id === toWallet.id
        );

        const historicalAvgFee = routeHistory.length > 0
          ? routeHistory.reduce((sum, t) => sum + (t.fee_paid || 0), 0) / routeHistory.length
          : 0;

        const historicalAvgAmount = routeHistory.length > 0
          ? routeHistory.reduce((sum, t) => sum + t.transfer_amount, 0) / routeHistory.length
          : 0;

        const efficiencyScore = historicalAvgAmount > 0
          ? Math.max(0, 1 - (historicalAvgFee / historicalAvgAmount))
          : (estimatedFee > 0 ? Math.max(0, 1 - (estimatedFee / sampleAmount)) : 1);

        matrix.push({
          fromWalletId: fromWallet.id,
          fromWalletName: fromWallet.name,
          toWalletId: toWallet.id,
          toWalletName: toWallet.name,
          estimatedFee: Math.round(estimatedFee * 100) / 100,
          historicalAvgFee: Math.round(historicalAvgFee * 100) / 100,
          historicalAvgAmount: Math.round(historicalAvgAmount * 100) / 100,
          transferCount: routeHistory.length,
          efficiencyScore: Math.round(efficiencyScore * 10000) / 100,
          feeType,
          feeValue,
        });
      }
    }

    // Find optimal routes (direct routes with lowest fee)
    for (const fromWallet of wallets) {
      for (const toWallet of wallets) {
        if (fromWallet.id === toWallet.id) continue;

        const directRoutes = matrix.filter(
          m => m.fromWalletId === fromWallet.id && m.toWalletId === toWallet.id
        );

        if (directRoutes.length > 0) {
          const best = directRoutes.reduce((a, b) => 
            a.efficiencyScore > b.efficiencyScore ? a : b
          );
          optimalRoutes.push({
            from: fromWallet.name,
            to: toWallet.name,
            path: [fromWallet.name, toWallet.name],
            totalFee: best.estimatedFee,
            efficiencyScore: best.efficiencyScore,
          });
        }
      }
    }

    return {
      success: true,
      data: {
        matrix,
        optimalRoutes: optimalRoutes.sort((a, b) => b.efficiencyScore - a.efficiencyScore).slice(0, 10),
        walletCount: wallets.length,
      }
    };
  } catch (error) {
    console.error('Error in finance:get-transfer-cost-matrix:', error);
    return { success: false, error: String(error) };
  }
});
