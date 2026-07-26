-- ============================================================================
-- MIGRATION: Finance Enhancement Schema Updates
-- Run these migrations to support the new features
-- ============================================================================

-- ============================================================================
-- Migration 1: Transfer Route Statistics Table
-- Stores aggregated transfer fee/speed data for the cost matrix heatmap
-- ============================================================================
CREATE TABLE IF NOT EXISTS finance_transfer_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_wallet_id INTEGER NOT NULL,
  to_wallet_id INTEGER NOT NULL,
  avg_fee REAL DEFAULT 0,
  avg_time_minutes REAL DEFAULT 0,
  transfer_count INTEGER DEFAULT 0,
  last_transfer_date TEXT,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime')),
  UNIQUE(from_wallet_id, to_wallet_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_transfer_routes_from_to 
  ON finance_transfer_routes(from_wallet_id, to_wallet_id);

-- ============================================================================
-- Migration 2: Follow-Through Persons Table
-- Dedicated table for tracking people you owe money to / who owe you
-- ============================================================================
CREATE TABLE IF NOT EXISTS finance_ft_persons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10b981',
  contact_info TEXT DEFAULT '',
  total_owed REAL DEFAULT 0,
  total_repaid REAL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime'))
);

-- ============================================================================
-- Migration 3: Add fiat_balance tracking to crypto wallet metadata
-- No schema change needed — we repurpose the existing balance column
-- for fiat and use metadata.assets for crypto holdings.
-- 
-- However, add a migration note for clarity:
-- ============================================================================
-- NOTE: For crypto wallets:
--   - wallet.balance = fiat balance (IDR/USD in the exchange)
--   - metadata.assets = crypto holdings with coin_id, amount, avg_buy_price
--   - Total value = balance + sum(assets.amount * current_price)

-- ============================================================================
-- Migration 4: Add transaction tags index for faster filtering
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date 
  ON finance_transactions(wallet_id, date);

CREATE INDEX IF NOT EXISTS idx_transactions_type_date 
  ON finance_transactions(type, date);

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id 
  ON finance_transactions(transfer_id) WHERE transfer_id IS NOT NULL;

-- ============================================================================
-- Migration 5: Add subscription status index
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_renewal 
  ON finance_subscriptions(status, next_renewal_date);

-- ============================================================================
-- Migration 6: Pre-computed daily expense summary table
-- For faster runway/velocity calculations on large transaction histories
-- ============================================================================
CREATE TABLE IF NOT EXISTS finance_daily_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  total_income REAL DEFAULT 0,
  total_expense REAL DEFAULT 0,
  total_transfers_in REAL DEFAULT 0,
  total_transfers_out REAL DEFAULT 0,
  net_flow REAL DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date 
  ON finance_daily_summaries(date);

-- Trigger to auto-update daily summary on transaction insert
CREATE TRIGGER IF NOT EXISTS trg_update_daily_summary_insert
AFTER INSERT ON finance_transactions
BEGIN
  INSERT INTO finance_daily_summaries (date, total_income, total_expense, total_transfers_in, total_transfers_out, net_flow, transaction_count, updated_at)
  VALUES (
    NEW.date,
    CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.type = 'expense' THEN ABS(NEW.amount) ELSE 0 END,
    CASE WHEN NEW.type = 'transfer' AND NEW.amount > 0 THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.type = 'transfer' AND NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
    CASE 
      WHEN NEW.type = 'income' THEN NEW.amount
      WHEN NEW.type = 'expense' THEN -ABS(NEW.amount)
      WHEN NEW.type = 'transfer' THEN NEW.amount
      ELSE 0
    END,
    1,
    datetime('now','localtime')
  )
  ON CONFLICT(date) DO UPDATE SET
    total_income = total_income + excluded.total_income,
    total_expense = total_expense + excluded.total_expense,
    total_transfers_in = total_transfers_in + excluded.total_transfers_in,
    total_transfers_out = total_transfers_out + excluded.total_transfers_out,
    net_flow = net_flow + excluded.net_flow,
    transaction_count = transaction_count + 1,
    updated_at = datetime('now','localtime');
END;

-- ============================================================================
-- Migration 7: Add wallet balance history snapshot table
-- For sparklines and trend analysis without re-querying all transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS finance_wallet_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  balance REAL NOT NULL,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  UNIQUE(wallet_id, date)
);

CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_wallet_date 
  ON finance_wallet_snapshots(wallet_id, date);
