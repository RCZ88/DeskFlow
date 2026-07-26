# CONTEXT_BUNDLE.md — Asset Wallet Expansion (Stocks, Gold, Commodities, ETFs)

> Self-contained reference for the target AI. All code structure, data shapes, and architecture notes below.

---

## 1. Current Database Schema

### `finance_wallets` — Core wallet table (src/main.ts:2544-2557)

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
  metadata TEXT,                    -- JSON: coin assets, denominations, etc.
  transfer_fee_type TEXT DEFAULT 'none',
  transfer_fee_value REAL DEFAULT 0,
  initial_balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (account_id) REFERENCES finance_accounts(id)
)
```

### `finance_crypto_prices` — Current price cache (src/main.ts:2657-2669)

```sql
CREATE TABLE IF NOT EXISTS finance_crypto_prices (
  coin_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  current_price REAL NOT NULL,
  market_cap REAL,
  total_volume REAL,
  price_change_24h REAL,
  price_change_percentage_24h REAL,
  last_updated TEXT NOT NULL
)
```

### `finance_crypto_history` — Historical price cache (src/main.ts:2670-2679)

```sql
CREATE TABLE IF NOT EXISTS finance_crypto_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coin_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  price REAL NOT NULL,
  UNIQUE(coin_id, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_finance_crypto_history_coin ON finance_crypto_history(coin_id);
```

### `finance_accounts` — Parent account table (src/main.ts:2527-2541)

```sql
CREATE TABLE IF NOT EXISTS finance_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('personal','joint','custodial','business')),
  description TEXT,
  icon TEXT DEFAULT 'Wallet',
  color TEXT DEFAULT '#10b981',
  currency TEXT DEFAULT 'USD',
  balance REAL DEFAULT 0.0,
  is_archived INTEGER DEFAULT 0,
  parent_account_id INTEGER,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  updated_at DATETIME DEFAULT (datetime('now','localtime'))
)
```

---

## 2. TypeScript Types (src/components/finance/finance-types.ts)

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
  metadata?: string;          // JSON string
  transfer_fee_type?: string;
  transfer_fee_value?: number;
  created_at: string;
  updated_at: string;
}

export type WalletMetadata =
  | { type: 'bank'; bank_name?: string; branch?: string; ... }
  | { type: 'debit_card'; card_network?: 'visa'|'mastercard'|'amex'|...; ... }
  | { type: 'credit_card'; card_network?: ...; credit_limit?: number; ... }
  | { type: 'crypto'; coin_id?: string; symbol?: string; blockchain?: string;
        wallet_address?: string; acquisition_price?: number;
        assets?: { coin_id: string; symbol: string; amount: number; avg_buy_price: number }[];
        notes?: string }
  | { type: 'cash'; denominations?: CashDenomination[]; notes?: string }
  | { type: 'ewallet'; platform?: string; ... }
  | { type: 'other'; notes?: string };

export interface CryptoPrice {
  coin_id: string; name: string; symbol: string;
  current_price: number; market_cap: number; total_volume: number;
  price_change_24h: number; price_change_percentage_24h: number;
  last_updated: string;
}

export interface CryptoHistoryPoint {
  timestamp: number;
  price: number;
}
```

Key: The `crypto` wallet metadata contains an `assets` array with `{ coin_id, symbol, amount, avg_buy_price }` — this is the portfolio data structure that needs generalization.

---

## 3. Existing IPC Handlers (src/main.ts)

| Channel | Lines | Purpose | Current API |
|---------|-------|---------|-------------|
| `finance:fetch-crypto-prices` | 21021-21068 | Fetch live prices for coin IDs | CoinGecko `/simple/price` → `finance_crypto_prices` |
| `finance:get-crypto-history` | 21070-21088 | Fetch historical chart data | CoinGecko `/coins/{id}/market_chart` → `finance_crypto_history` |
| `finance:update-wallet-metadata` | 21001-21019 | Merge metadata JSON on wallet | Reads/parses/merges/writes metadata |
| `finance:get-wallet` | 20989-20999 | Single wallet by ID | Returns wallet with parsed metadata |
| `finance:get-wallets` | 20879-20895 | All non-archived wallets | Returns wallets array with parsed metadata |
| `finance:create-wallet` | 20897-20923 | Create wallet | Accepts type/name/balance/metadata etc. |
| `finance:update-wallet` | 20925-20951 | Update wallet fields | Updates balance, name, type, provider, etc. |
| `finance:get-summary` | 21375-21389 | Net worth | Sums account balances (non-custodial) |

### Current price fetch logic (src/main.ts:21021-21068):
```typescript
ipcMain.handle('finance:fetch-crypto-prices', async (_event, coinIds: string[], currency = 'usd') => {
  // 1. Always try CoinGecko first - no TTL check
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=${currency}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
  // 2. INSERT OR REPLACE into finance_crypto_prices on success
  // 3. On error, return cached rows from DB
});
```

Key issues:
- **CoinGecko only** — no stock/ETF/commodity support
- **No TTL** — always hits network first, no `last_updated` check
- **No auto-refresh** — prices only fetch when UI component mounts
- **Name/symbol are placeholder** — CoinGecko `/simple/price` doesn't return name/symbol, so they're derived from coinId

### Net worth calculation (src/pages/FinancePage.tsx:675-691):
```typescript
// For each non-archived account:
//   For each wallet in account:
//     if (physical/cash) → use denomination calculation
//     else → use wallet.balance directly (including crypto)
// Net worth is NOT live-updated — it refreshes when user saves wallet detail
```

---

## 4. Preload Bindings (src/preload.ts)

| Preload Function | Line | IPC Channel |
|-----------------|------|-------------|
| `financeFetchCryptoPrices(coinIds, currency?)` | 835 | `finance:fetch-crypto-prices` |
| `financeGetCryptoHistory(coinId, days?, currency?)` | 836 | `finance:get-crypto-history` |
| `financeUpdateWalletMetadata({ id, metadata })` | 834 | `finance:update-wallet-metadata` |
| `financeGetWallet(id)` | 833 | `finance:get-wallet` |
| `financeGetWallets(accountId?)` | 829 | `finance:get-wallets` |
| `financeCreateWallet(data)` | 830 | `finance:create-wallet` |
| `financeUpdateWallet(data)` | 831 | `finance:update-wallet` |

---

## 5. Renderer Components

### `WalletDetailView.tsx` — CryptoDetail component (lines 303-864)
- Crypto portfolio view with: hero card (total value + 24h change), Chart.js line chart (1D/1W/1M/3M/1Y/ALL), doughnut allocation chart, editable coin list, "Add Coin" form
- `POPULAR_COINS` hardcoded list (lines 270-301) — 30 CoinGecko coin IDs
- **Formatting bug:** Custom `formatAssetValue` (lines 330-342) uses raw `toLocaleString` WITHOUT currency symbol:
  ```typescript
  const formatAssetValue = (val: number) => {
    const loc = 'en-US';
    // crypto-small-number formats (4-8 decimals for tiny coins)
    // but NO currency symbol, NO formatCurrency() call!
    if (val < 0.0001) return val.toLocaleString(loc, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
    if (val < 1) return val.toLocaleString(loc, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    return val.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };
  ```
- **Price fetch** on mount via `deskflowAPI.financeFetchCryptoPrices(coinIds)` (line 391)
- **History fetch** on mount via `deskflowAPI.financeGetCryptoHistory(coinId, days)` (line 405)
- **Save updates balance** with live total: `wallet.type === 'crypto' && cryptoTotalRef.current > 0` → sets `newBalance = cryptoTotalRef.current` (lines 1425-1426)

### `CryptoMarketTab.tsx` — Full portfolio market tab
- Aggregates all crypto wallets → one combined view
- Custom formatting (lines 35-43) also uses raw `toLocaleString` without currency symbol:
  ```typescript
  const formatPrice = (val: number) => {
    // Same pattern as WalletDetailView - no currency symbol!
  }
  ```

### Currency formatting utility (src/components/finance/currency-data.ts)
```typescript
export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  const info = getCurrencyInfo(currencyCode);
  const sign = amount >= 0 ? '' : '-';
  const abs = Math.abs(amount);
  // Zero-decimal currencies (JPY, KRW, IDR, VND)
  if (['IDR','VND','KRW','JPY'].includes(currencyCode)) {
    return `${sign}${info.symbol}${Math.round(abs).toLocaleString(info.locale)}`;
  }
  return `${sign}${info.symbol}${abs.toLocaleString(info.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
```

**This function already works correctly** (proper commas + symbol). The problem is that CryptoDetail and CryptoMarketTab bypass it with their own `formatAssetValue`/`formatPrice` functions that don't include the currency symbol.

---

## 6. Architecture Notes

### Data flow:
```
Renderer component mount
  → IPC fetch-crypto-prices (CoinGecko API)
    → DB cache (finance_crypto_prices)
    → Return to renderer
  → IPC get-crypto-history (CoinGecko API)
    → DB cache (finance_crypto_history)
    → Return to renderer
User edits coin amounts/buy prices
  → IPC update-wallet-metadata (saves to finance_wallets.metadata JSON)
User clicks Save in wallet detail
  → Computes totalValue from assets[] * live prices
  → Updates wallet.balance = totalValue (so net worth reflects it)
```

### Key gaps:
1. **CoinGecko is the only provider** — no stocks, ETFs, commodities, indices
2. **Hardcoded 30-coin dropdown** — no search/autocomplete for 10,000+ assets
3. **No auto-refresh** — prices only fetch on mount. If you leave the page open, prices won't update
4. **No TTL on cache** — always hits API even if cache is 1 second old
5. **Net worth not live** — only updates when user saves wallet detail view
6. **Formatting inconsistency** — Crypto components have their own formatters that omit currency symbols
7. **Tables are crypto-specific** — `finance_crypto_prices` and `finance_crypto_history` can't store stocks/gold/ETFs

---

## 7. API Research Summary

| Provider | Coverage | Pricing | Notes |
|----------|----------|---------|-------|
| **Yahoo Finance (v8 chart)** | Stocks, ETFs, crypto, commodities, indices, mutual funds | Free (unofficial) | `query1.finance.yahoo.com/v8/finance/chart/{symbol}`. npm: `yahoo-finance2`. Reliable but unofficial. |
| **Yahoo Finance (v7 quote)** | Same coverage | Free (unofficial) | `query1.finance.yahoo.com/v7/finance/quote?symbols={syms}`. Current prices + change. |
| **TradingView** | Everything (100+ exchanges) | No official data API | Third-party APIs on RapidAPI ($10-30/mo) or charting widgets |
| **Alpha Vantage** | Stocks, ETFs, crypto, forex, commodities | Free (25 calls/day) or $49.99/mo | Official API with API key |
| **Polygon.io** | Stocks, options, forex, crypto | $29-199/mo | Production-grade, real-time WebSocket |
| **CoinGecko** | Cryptocurrencies only | Free (no key) | Current system — stays as crypto fallback |

### Recommended symbol mapping:
- **Stocks:** `AAPL`, `MSFT`, `GOOGL` (Yahoo Finance)
- **Gold ETFs:** `GLD`, `IAU`, `PAXG` (PAX Gold — commodity-backed crypto)
- **Commodities:** `GC=F` (Gold Futures), `SI=F` (Silver), `CL=F` (Crude Oil)
- **Indices:** `^GSPC` (S&P 500), `^DJI` (Dow)
- **Crypto:** `bitcoin`, `ethereum` (CoinGecko) OR `BTC-USD`, `ETH-USD` (Yahoo Finance)

---

## 8. Wallet Type Labels & Colors (TransactionsTab.tsx:63-70)

```typescript
const WALLET_TYPE_LABEL = {
  bank: 'Bank', debit_card: 'Debit', credit_card: 'Credit',
  crypto: 'Crypto', cash: 'Cash', physical: 'Physical',
  ewallet: 'E-Wallet', other: 'Other'
};
const WALLET_TYPE_COLOR = {
  bank: '#3B82F6', debit_card: '#10B981', credit_card: '#F59E0B',
  crypto: '#8B5CF6', cash: '#EC4899', physical: '#F97316',
  ewallet: '#06B6D4', other: '#6B7280'
};
```

---

## 9. Files to Modify

| File | Purpose |
|------|---------|
| `src/main.ts` | IPC handlers (fetch prices, history, search), DB schema (generalized price tables) |
| `src/preload.ts` | New IPC bindings |
| `src/components/finance/finance-types.ts` | Types (AssetPrice, AssetHistory, generalized metadata) |
| `src/components/finance/WalletDetailView.tsx` | CryptoDetail → AssetDetail (generalized) |
| `src/components/finance/CryptoMarketTab.tsx` | Market tab (generalized) |
| `src/components/finance/currency-data.ts` | Already good — but need to fix components that bypass it |
| `src/pages/FinancePage.tsx` | Net worth (live updates), wallet creation (add types) |
| `src/components/finance/AccountsTab.tsx` | Wallet creation form (add stock/ETF/commodity guidance) |
