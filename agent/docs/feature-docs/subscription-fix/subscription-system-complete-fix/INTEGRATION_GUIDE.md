# ============================================================================
# INTEGRATION GUIDE: Finance Dashboard Enhancements
# ============================================================================
# How to wire everything into your existing app
# ============================================================================

## 1. FILE STRUCTURE

```
src/
├── main.ts                              ← ADD: IPC handlers (import from finance-enhancement-handlers.ts)
├── components/finance/
│   ├── OverviewTab.tsx                  ← MODIFY: Add new cards to dashboard grid
│   ├── CryptoUnifiedPortfolio.tsx       ← NEW: Feature 1 (CRITICAL bug fix)
│   ├── LiquidityWaterfall.tsx           ← NEW: Feature 2
│   ├── SubscriptionBurdenRadar.tsx      ← NEW: Feature 3
│   ├── CashFlowRunway.tsx               ← NEW: Feature 4
│   ├── WalletHealthScorecards.tsx       ← NEW: Feature 5
│   ├── TransferCostMatrix.tsx           ← NEW: Feature 6
│   └── finance-types.ts                 ← MODIFY: Add new type definitions
├── database/
│   └── migrations/
│       └── finance-enhancements.sql     ← NEW: Run on app startup
└── preload.ts                           ← MODIFY: Add new IPC channels
```

## 2. PRELOAD.TS — Add IPC Channels

```typescript
// src/preload.ts
// Add these to the existing contextBridge.exposeInMainWorld() call:

contextBridge.exposeInMainWorld('electron', {
  // ... existing methods ...

  invoke: (channel: string, ...args: any[]) => {
    const validChannels = [
      // ... existing channels ...
      'finance:get-crypto-unified-portfolio',
      'finance:get-liquidity-breakdown',
      'finance:get-subscription-intelligence',
      'finance:get-cashflow-runway',
      'finance:get-wallet-health',
      'finance:get-transfer-cost-matrix',
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid channel: ${channel}`);
  },
});
```

## 3. FINANCE-TYPES.TS — Add Type Definitions

```typescript
// src/components/finance/finance-types.ts
// Add these interfaces:

export interface CryptoAsset {
  coin_id: string;
  symbol: string;
  name: string;
  amount: number;
  avg_buy_price: number;
  current_price: number;
  value: number;
  cost_basis: number;
  pnl: number;
  pnl_percentage: number;
}

export interface CryptoPortfolioData {
  walletId: number;
  walletName: string;
  currency: string;
  fiatBalance: number;
  cryptoPortfolioValue: number;
  totalValue: number;
  costBasis: number;
  unrealizedPnL: number;
  pnlPercentage: number;
  fiatAllocation: number;
  cryptoAllocation: number;
  assets: CryptoAsset[];
}

export interface LiquidityTier {
  name: string;
  amount: number;
  color: string;
  icon: string;
  wallets: Array<{ id: number; name: string; balance: number; currency: string }>;
  percentage: number;
}

export interface LiquidityData {
  tiers: LiquidityTier[];
  totalNetWorth: number;
  liquidityScore: number;
  liquidAmount: number;
  lockedAmount: number;
  transferSpeeds: Array<{ from: string; to: string; avgMinutes: number }>;
}

export interface SubscriptionIntelligence {
  totalMonthlyCost: number;
  burdenPercentage: number;
  monthlyIncome: number;
  subscriptionCount: number;
  growthTrend: number;
  upcomingRenewals: number;
  urgentRenewals: number;
  radarData: { axes: string[]; values: number[]; colors: string[] };
  subscriptions: Array<{
    id: number; name: string; price: number; currency: string;
    billingCycle: string; monthlyEquivalent: number;
    nextRenewalDate: string; daysUntilRenewal: number;
    isUrgent: boolean; isWarning: boolean;
  }>;
}

export interface RunwayData {
  runwayMonths: number;
  dailyBurnRate: number;
  monthlyBurnRate: number;
  committedMonthly: number;
  totalMonthlyBurn: number;
  liquidNetWorth: number;
  breakEvenMonth: number | null;
  trendDirection: number;
  projectedBalances: Array<{ month: number; projectedBalance: number; isNegative: boolean }>;
  dailyExpenseHistory: Array<{ date: string; amount: number }>;
}

export interface WalletHealth {
  walletId: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  healthScore: number;
  balanceDrift: number;
  transactionFrequency: number;
  feeBurden: number;
  sparklineData: Array<{ date: string; balance: number }>;
  alerts: Array<{ type: string; message: string; severity: 'warning' | 'critical' | 'info' }>;
}

export interface TransferMatrixCell {
  fromWalletId: number;
  fromWalletName: string;
  toWalletId: number;
  toWalletName: string;
  estimatedFee: number;
  historicalAvgFee: number;
  historicalAvgAmount: number;
  transferCount: number;
  efficiencyScore: number;
  feeType: string;
  feeValue: number;
}

export interface TransferMatrixData {
  matrix: TransferMatrixCell[];
  optimalRoutes: Array<{
    from: string; to: string; path: string[];
    totalFee: number; efficiencyScore: number;
  }>;
  walletCount: number;
}
```

## 4. OVERVIEWTAB.TSX — Add New Cards

```tsx
// src/components/finance/OverviewTab.tsx
// Import new components at the top:

import CryptoUnifiedPortfolio from './CryptoUnifiedPortfolio';
import LiquidityWaterfall from './LiquidityWaterfall';
import SubscriptionBurdenRadar from './SubscriptionBurdenRadar';
import CashFlowRunway from './CashFlowRunway';
import WalletHealthScorecards from './WalletHealthScorecards';
import TransferCostMatrix from './TransferCostMatrix';

// In the JSX, add a new section after the existing charts:
// (Find the grid layout and add these cards)

{/* NEW: Advanced Analytics Section */}
<div className="mt-6">
  <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
    <Sparkles size={16} className="text-violet-400" />
    Advanced Analytics
  </h2>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {/* Row 1: Critical + Liquidity */}
    <LiquidityWaterfall />
    <CashFlowRunway />

    {/* Row 2: Subscriptions + Wallet Health */}
    <SubscriptionBurdenRadar />
    <WalletHealthScorecards />

    {/* Row 3: Transfer Matrix (full width) */}
    <div className="lg:col-span-2">
      <TransferCostMatrix />
    </div>
  </div>
</div>

{/* NEW: Crypto Wallet Detail Enhancement */}
{/* In the wallet detail view, replace the existing crypto display with: */}
{selectedWallet?.type === 'crypto' && (
  <CryptoUnifiedPortfolio 
    walletId={selectedWallet.id} 
    displayCurrency={selectedWallet.currency} 
  />
)}
```

## 5. MAIN.TS — Wire Up Handlers

```typescript
// src/main.ts
// At the bottom of the file, after existing finance handlers:

// Import the helper and handlers (or paste them directly)
// The handlers are in: ipc_handlers/finance-enhancement-handlers.ts

// Paste the computeDerivedExpenseByWallet helper function
// Paste all 6 IPC handlers:
//   - finance:get-crypto-unified-portfolio
//   - finance:get-liquidity-breakdown
//   - finance:get-subscription-intelligence
//   - finance:get-cashflow-runway
//   - finance:get-wallet-health
//   - finance:get-transfer-cost-matrix
```

## 6. DATABASE INITIALIZATION — Run Migrations

```typescript
// In your database initialization code (where you create tables):

function runMigrations(db: Database.Database) {
  // Read and execute the migration SQL file
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, '../database/migrations/finance-enhancements.sql'),
    'utf-8'
  );

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  for (const stmt of statements) {
    try {
      db.exec(stmt + ';');
    } catch (e) {
      console.log('Migration statement skipped (may already exist):', e.message);
    }
  }

  console.log('Finance enhancement migrations applied');
}
```

## 7. CRYPTO WALLET FIX — Update Create-Transfer Handler

```typescript
// In src/main.ts, modify the create-transfer handler:
// When a transfer goes TO a crypto wallet, update the balance (fiat):

ipcMain.handle('finance:create-transfer', async (_event, data) => {
  const db = getDb();

  // ... existing validation ...

  const fromWallet = db.prepare('SELECT * FROM finance_wallets WHERE id = ?').get(data.from_wallet_id);
  const toWallet = db.prepare('SELECT * FROM finance_wallets WHERE id = ?').get(data.to_wallet_id);

  // ... existing balance checks ...

  // Create transfer legs
  const transferId = generateTransferId();

  // Source leg (debit)
  db.prepare(`
    INSERT INTO finance_transactions 
    (account_id, wallet_id, category_id, type, amount, description, date, transfer_id, from_wallet_id, to_wallet_id, fee)
    VALUES (?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.account_id, data.from_wallet_id, data.category_id || 1,
    -data.amount, data.description, data.date, transferId,
    data.from_wallet_id, data.to_wallet_id, data.fee || 0
  );

  // Destination leg (credit)
  db.prepare(`
    INSERT INTO finance_transactions 
    (account_id, wallet_id, category_id, type, amount, description, date, transfer_id, from_wallet_id, to_wallet_id, fee)
    VALUES (?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?, 0)
  `).run(
    data.account_id, data.to_wallet_id, data.category_id || 1,
    data.amount, data.description, data.date, transferId,
    data.from_wallet_id, data.to_wallet_id
  );

  // Update wallet balances
  // For crypto wallet: balance = fiat balance
  db.prepare('UPDATE finance_wallets SET balance = balance - ? WHERE id = ?')
    .run(data.amount + (data.fee || 0), data.from_wallet_id);

  db.prepare('UPDATE finance_wallets SET balance = balance + ? WHERE id = ?')
    .run(data.amount, data.to_wallet_id);

  // Update transfer route statistics
  updateTransferRouteStats(db, data.from_wallet_id, data.to_wallet_id, data.amount, data.fee || 0);

  return { success: true, transferId };
});

function updateTransferRouteStats(db: Database.Database, fromId: number, toId: number, amount: number, fee: number) {
  const existing = db.prepare(`
    SELECT * FROM finance_transfer_routes WHERE from_wallet_id = ? AND to_wallet_id = ?
  `).get(fromId, toId);

  if (existing) {
    const newCount = existing.transfer_count + 1;
    const newAvgFee = ((existing.avg_fee * existing.transfer_count) + fee) / newCount;
    db.prepare(`
      UPDATE finance_transfer_routes 
      SET avg_fee = ?, transfer_count = ?, last_transfer_date = datetime('now','localtime'), updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(newAvgFee, newCount, existing.id);
  } else {
    db.prepare(`
      INSERT INTO finance_transfer_routes (from_wallet_id, to_wallet_id, avg_fee, transfer_count, last_transfer_date)
      VALUES (?, ?, ?, 1, datetime('now','localtime'))
    `).run(fromId, toId, fee);
  }
}
```

## 8. STYLING NOTES

All components use the existing design system:
- Background: `bg-zinc-900/80 backdrop-blur-xl`
- Border: `border border-zinc-800`
- Border radius: `rounded-xl`
- Padding: `p-5`
- Font: Geist (implicit via Tailwind)
- Monospace: JetBrains Mono (use `font-mono`)
- Accent colors: emerald (`#10b981`) + violet (`#8b5cf6`)
- Text hierarchy: `text-zinc-100` (headings) → `text-zinc-300` (subheadings) → `text-zinc-500` (metadata)

No new CSS needed — everything uses Tailwind utility classes.

## 9. TESTING CHECKLIST

After integration, verify:

- [ ] `finance:get-crypto-unified-portfolio` returns correct fiat + crypto total
- [ ] `finance:get-liquidity-breakdown` shows 4 tiers with correct percentages
- [ ] `finance:get-subscription-intelligence` calculates monthly equivalents correctly
- [ ] `finance:get-cashflow-runway` shows non-zero runway with test data
- [ ] `finance:get-wallet-health` returns scores 0-100 for each wallet
- [ ] `finance:get-transfer-cost-matrix` shows heatmap with color coding
- [ ] All components render correctly in dark mode
- [ ] Empty states show helpful messages (not blank)
- [ ] No console errors from Chart.js
- [ ] IPC channels are properly exposed in preload

## 10. PERFORMANCE NOTES

- All heavy calculations happen in the main process (IPC handlers)
- Daily summaries table auto-updates via trigger → fast runway queries
- Wallet snapshots should be taken daily (add a cron job or app startup check)
- Crypto prices are fetched on-demand, not polled continuously
- Transfer route stats are incrementally updated, not recalculated
