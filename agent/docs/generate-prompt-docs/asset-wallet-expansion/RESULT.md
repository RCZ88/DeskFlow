# RESULT.md — Asset Wallet Expansion (Stocks, Gold, Commodities, ETFs) + Currency Formatting

> Lead Designer/Engineer spec, grounded in the real `src.zip`. Line numbers reference the extracted tree. **Files are CRLF — keep `\r\n`, no mass reformat.** New backend deps: only `yahoo-finance2` (main-process). Existing `formatCurrency()` in `currency-data.ts` stays; a new `formatMoney()` becomes the canonical superset it delegates to.

## Decisions locked (no options)
1. **Wallet type: add `'investment'` as the new canonical type; keep `'crypto'` as a permanent backward-compatible alias.** Both render the same generalized `AssetDetail`. Existing crypto wallets are NOT force-migrated. Requires a `CHECK`-constraint rebuild migration on `finance_wallets` (SQLite can't alter CHECK in place) — provided in Phase 2, guarded + inside a transaction with `foreign_keys` toggled.
2. **Provider routing:** Yahoo (`yahoo-finance2`) is primary for `stock | etf | commodity | index` and for common crypto pairs (`BTC-USD`, `PAXG-USD`); CoinGecko stays as crypto fallback for long-tail altcoins. Never remove CoinGecko.
3. **Asset identity:** every holding carries `{ symbol, asset_type, provider, provider_symbol, name, amount, avg_buy_price }`. `provider_symbol` is the provider's key (Yahoo ticker like `AAPL`/`PAXG-USD`, or CoinGecko `coin_id` like `bitcoin`). Legacy `{ coin_id, symbol, amount, avg_buy_price }` is read via a shim (Phase 3).
4. **Cache tables keyed by `(asset_type, symbol)`** with `provider` + `last_updated`; 90s TTL checked before any network call.
5. **PAXG** is tracked as `asset_type='crypto'`, Yahoo `PAXG-USD` (CoinGecko `pax-gold` fallback). It is “digital gold,” colored amber in allocation but typed crypto for routing.

---

# Phase 1 — Currency Formatting Fix (IMMEDIATE, isolated)

### 1.1 Add the canonical `formatMoney()` and make `formatCurrency()` delegate
**File:** `src/components/finance/currency-data.ts` (append after line 71; refactor lines 61-71).

```ts
// NEW canonical money formatter. Always symbol + locale thousands separators.
// Auto decimals: >=1 -> 2 (or 0 for zero-decimal currencies); <1 -> 4-6; <0.0001 -> 8.
export function formatMoney(
  value: number,
  currencyCode: string = 'USD',
  opts: { maxDecimals?: number; compact?: boolean } = {},
): string {
  const info = getCurrencyInfo(currencyCode);
  const n = Number.isFinite(value) ? value : 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const zeroDec = currencyCode === 'IDR' || currencyCode === 'VND' || currencyCode === 'KRW' || currencyCode === 'JPY';

  let min = 2, max = 2;
  if (zeroDec) { min = 0; max = 0; }
  else if (abs > 0 && abs < 0.0001) { min = 8; max = 8; }
  else if (abs > 0 && abs < 1) { min = 4; max = 6; }

  if (opts.compact && abs >= 1_000_000) {
    const body = (abs / (abs >= 1e9 ? 1e9 : 1e6)).toLocaleString(info.locale, { maximumFractionDigits: 2 });
    return `${sign}${info.symbol}${body}${abs >= 1e9 ? 'B' : 'M'}`;
  }
  if (opts.maxDecimals != null) { max = opts.maxDecimals; min = Math.min(min, opts.maxDecimals); }

  return `${sign}${info.symbol}${abs.toLocaleString(info.locale, { minimumFractionDigits: min, maximumFractionDigits: max })}`;
}

// Backward-compatible: existing call sites keep working, now single source of truth.
export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  return formatMoney(amount, currencyCode, { maxDecimals: 2 });
}
```
> Delete the old body of `formatCurrency` (lines 63-70) and replace with the one-line delegate above. Behavior is identical for the 2-decimal path.

### 1.2 `CryptoMarketTab.tsx` — remove symbol-less formatters
**File:** `src/components/finance/CryptoMarketTab.tsx`.
- Line 6 import: add `formatMoney`.
  ```ts
  import { getCurrencyInfo, formatCurrency as fmtCurrency, formatMoney } from './currency-data';
  ```
- Lines 34-44 (`fmt`, `fmtCrypto`): DELETE both. They emit numbers with **no currency symbol**.
- Replace usages:
  - Percentages (24h %, return %) are NOT money — keep a tiny local `pct(v)=v.toLocaleString(loc,{minimumFractionDigits:1,maximumFractionDigits:2})`. Lines 184, 235, 254, 287 use `fmt(...)` for `%` — swap to `pct(...)`.
  - Line 184 `+{fmt(totalPnl)}` → `+{formatMoney(totalPnl, displayCurrency)}`.
  - Line 250 `{fmtCrypto(a.amount)} {coinSym}` (a quantity, not money) → keep a `qty()` helper (see 1.4). 
  - Lines 268 `{fmtCrypto(a.amount)}` → `qty(a.amount)`.
  - All value/price/PnL/cost already call `fmtCurrency(...)` — leave those (now symbol-correct via delegate).

### 1.3 `WalletDetailView.tsx` / `CryptoDetail` — same fix
**File:** `src/components/finance/WalletDetailView.tsx`.
- Add `formatMoney` (and keep `formatCurrency`) to the `currency-data` import.
- Lines ~333-347 (`fmt`, `fmtCrypto` inside `CryptoDetail`): replace money uses with `formatMoney(v, displayCurrency)`; keep a `qty()` for coin amounts and `pct()` for percentages. Any place currently rendering a value/price/PnL with `fmt(...)` and no symbol must become `formatMoney(...)`.
- Save path (lines 1418-1420) already writes `newBalance = cryptoTotalRef.current` — unchanged; but see Phase 5 for live write-back.

### 1.4 Shared quantity/percent helpers (not money)
Add to `currency-data.ts` so components stop hand-rolling:
```ts
export function formatQuantity(v: number, locale = 'en-US'): string {
  if (v === 0) return '0';
  if (Math.abs(v) < 0.0001) return v.toLocaleString(locale, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
  if (Math.abs(v) < 1) return v.toLocaleString(locale, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  return v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}
export function formatPercent(v: number, dp = 2, locale = 'en-US'): string {
  return v.toLocaleString(locale, { minimumFractionDigits: dp <= 1 ? 1 : 2, maximumFractionDigits: dp });
}
```

### 1.5 Audit of remaining raw `toLocaleString` (21 hits)
| File | Verdict |
|---|---|
| `currency-data.ts` | Source of truth — OK |
| `CryptoMarketTab.tsx`, `WalletDetailView.tsx` | **FIX** (1.2 / 1.3) |
| `AccountsTab.tsx` | **FIX** any monetary render → `formatMoney`; keep counts as-is |
| `TransactionDetailModal.tsx` | **FIX** monetary lines → `formatMoney` |
| `AuditLogTab.tsx` | Mostly dates/ids — verify; only money → `formatMoney` |
| `modals/modalUtils.ts`, `modals/useFormattedAmount.ts` | Input-field formatting (raw digits with grouping) — **leave**, but ensure display previews use `formatMoney` |
| `_fx/useCountUp.ts` | Animation tween of a number — **leave**; the display wrapper should format with `formatMoney` |

**Verification (Phase 1):** open a crypto wallet + market tab in USD and IDR; every price/value/PnL shows a leading symbol (`$`, `Rp`) and correct thousands separators; IDR/JPY show 0 decimals; a sub-cent coin shows `$0.00001234`; coin quantities show no currency symbol.

---

# Phase 2 — Backend: Universal Asset Infrastructure

### 2.1 New tables (add near existing crypto tables, `src/main.ts` ~2657-2679)
```sql
CREATE TABLE IF NOT EXISTS asset_prices (
  asset_type TEXT NOT NULL,            -- crypto|stock|etf|commodity|index|currency
  symbol TEXT NOT NULL,                -- canonical display symbol (AAPL, BTC-USD, GC=F, PAXG-USD)
  provider TEXT NOT NULL,              -- yahoo|coingecko|alphavantage
  provider_symbol TEXT,               -- provider key (coingecko coin_id, else = symbol)
  name TEXT,
  current_price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  market_cap REAL,
  total_volume REAL,
  price_change_24h REAL,
  price_change_percentage_24h REAL,
  last_updated TEXT NOT NULL,
  PRIMARY KEY (asset_type, symbol)
);
CREATE TABLE IF NOT EXISTS asset_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timestamp INTEGER NOT NULL,          -- unix seconds
  open REAL, high REAL, low REAL, close REAL, volume REAL,
  price REAL NOT NULL,                 -- = close; keeps existing line chart working
  UNIQUE(asset_type, symbol, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_asset_history_sym ON asset_history(asset_type, symbol);
```
Keep `finance_crypto_prices` / `finance_crypto_history` (legacy shims read/write nothing new).

### 2.2 Wallet type migration (`'investment'` + keep `'crypto'`)
SQLite can't alter a CHECK constraint; rebuild once, guarded so it runs only if `'investment'` isn't allowed yet.
```ts
function migrateWalletTypesForInvestment(db: Database) {
  const ddl = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='finance_wallets'"
  ).get() as { sql?: string } | undefined;
  if (!ddl?.sql || ddl.sql.includes("'investment'")) return; // already migrated
  const tx = db.transaction(() => {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      CREATE TABLE finance_wallets_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('bank','debit_card','credit_card','crypto','investment','cash','physical','ewallet','other')),
        provider TEXT, last_four TEXT, balance REAL DEFAULT 0.0, currency TEXT DEFAULT 'USD',
        is_archived INTEGER DEFAULT 0, metadata TEXT,
        transfer_fee_type TEXT DEFAULT 'none', transfer_fee_value REAL DEFAULT 0,
        initial_balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now','localtime')),
        updated_at DATETIME DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (account_id) REFERENCES finance_accounts(id)
      );
    `);
    db.exec('INSERT INTO finance_wallets_new SELECT * FROM finance_wallets;');
    db.exec('DROP TABLE finance_wallets;');
    db.exec('ALTER TABLE finance_wallets_new RENAME TO finance_wallets;');
    db.pragma('foreign_keys = ON');
  });
  tx();
}
```
Call it once during finance DB init (the app already has a backup system under `src/main/backup` — run after backup). No `.tsx`/CRLF concerns (main.ts is CRLF; keep it).

### 2.3 Provider abstraction (new file `src/services/providers/assetProviders.ts`)
Delivered in full as a file in this bundle. Interface:
```ts
export interface AssetQuote { symbol: string; name: string; current_price: number;
  price_change_24h: number; price_change_percentage_24h: number; currency: string; last_updated: string; }
export interface HistoryPoint { timestamp: number; price: number; open?: number; high?: number; low?: number; close?: number; volume?: number; }
export interface AssetSearchResult { symbol: string; name: string; asset_type: AssetType; exchange?: string; provider: string; provider_symbol: string; }
export interface PriceProvider {
  name: string;
  supports(type: AssetType, symbol: string): boolean;
  quotes(items: { symbol: string; provider_symbol: string }[], currency: string): Promise<AssetQuote[]>;
  history(providerSymbol: string, days: number, currency: string): Promise<HistoryPoint[]>;
  search?(query: string, types: AssetType[]): Promise<AssetSearchResult[]>;
}
```
- **YahooProvider** uses `yahoo-finance2`: `search()` for the asset picker, `quote()` for prices, `chart({period1, interval})` for history. Handles crumb/cookie internally; wrap every call in try/catch and fall back to cache.
- **CoinGeckoProvider** wraps the EXISTING endpoints (`/simple/price`, `/coins/{id}/market_chart`) already in main.ts.
- **`routeProvider(type, symbol)`**: `crypto` + Yahoo-mappable (`*-USD` present) → Yahoo, else CoinGecko; everything else → Yahoo.

### 2.4 New IPC handlers (`src/main.ts`, beside line 21021)
```ts
const PRICE_TTL_MS = 90_000;

electron_1.ipcMain.handle('finance:fetch-asset-prices', async (_e, items: {symbol:string; asset_type:AssetType; provider_symbol?:string}[], currency='USD') => {
  if (!db || !items?.length) return [];
  const out: any[] = [];
  const stale: typeof items = [];
  const now = Date.now();
  const sel = db.prepare('SELECT * FROM asset_prices WHERE asset_type=? AND symbol=?');
  for (const it of items) {
    const row = sel.get(it.asset_type, it.symbol) as any;
    if (row && (now - new Date(row.last_updated).getTime()) < PRICE_TTL_MS) out.push(row); // TTL hit
    else stale.push(it);
  }
  if (stale.length) {
    const fetched = await fetchQuotesRouted(stale, currency); // provider abstraction
    const up = db.prepare(`INSERT OR REPLACE INTO asset_prices
      (asset_type,symbol,provider,provider_symbol,name,current_price,currency,market_cap,total_volume,price_change_24h,price_change_percentage_24h,last_updated)
      VALUES (@asset_type,@symbol,@provider,@provider_symbol,@name,@current_price,@currency,@market_cap,@total_volume,@price_change_24h,@price_change_percentage_24h, datetime('now'))`);
    for (const q of fetched) { up.run(q); out.push(q); }
  }
  return out;
});

electron_1.ipcMain.handle('finance:get-asset-history', async (_e, symbol:string, asset_type:AssetType, days=30, currency='USD') => {
  if (!db) return [];
  const cutoff = Math.floor(Date.now()/1000) - days*86400;
  const cached = db.prepare('SELECT timestamp, price FROM asset_history WHERE asset_type=? AND symbol=? AND timestamp>=? ORDER BY timestamp ASC').all(asset_type, symbol, cutoff) as any[];
  if (cached.length > 1) return cached;
  const pts = await historyRouted(asset_type, symbol, days, currency);
  const ins = db.prepare('INSERT OR IGNORE INTO asset_history (asset_type,symbol,timestamp,open,high,low,close,volume,price) VALUES (?,?,?,?,?,?,?,?,?)');
  db.transaction((rows:any[]) => rows.forEach(p => ins.run(asset_type, symbol, p.timestamp, p.open??null,p.high??null,p.low??null,p.close??null,p.volume??null, p.price ?? p.close))) (pts);
  return pts.map(p => ({ timestamp: p.timestamp, price: p.price ?? p.close }));
});

electron_1.ipcMain.handle('finance:search-assets', async (_e, query:string, assetTypes?:AssetType[]) => {
  if (!query?.trim()) return [];
  return await searchRouted(query.trim(), assetTypes && assetTypes.length ? assetTypes : ['stock','etf','commodity','index','crypto']);
});

electron_1.ipcMain.handle('finance:get-tracked-assets', async () => {
  if (!db) return [];
  const rows = db.prepare('SELECT metadata FROM finance_wallets WHERE is_archived=0').all() as any[];
  const seen = new Map<string, any>();
  for (const r of rows) {
    let m:any = {}; try { m = JSON.parse(r.metadata||'{}'); } catch {}
    const assets = Array.isArray(m.assets) ? m.assets : (m.coin_id ? [m] : []);
    for (const a of assets) {
      const asset_type = a.asset_type || 'crypto';
      const symbol = a.symbol || a.coin_id; if (!symbol) continue;
      const key = `${asset_type}:${symbol}`;
      if (!seen.has(key)) seen.set(key, { asset_type, symbol, provider_symbol: a.provider_symbol || a.coin_id || symbol });
    }
  }
  return [...seen.values()];
});
```

### 2.5 Legacy shims (keep old renderer paths alive)
Rewrite the bodies of `finance:fetch-crypto-prices` and `finance:get-crypto-history` (main.ts 21021 / 21070) to delegate:
```ts
// fetch-crypto-prices(coinIds, ccy) -> map to asset items with asset_type 'crypto', provider_symbol=coinId, symbol=coinId (legacy)
// then call the same routed fetch and return rows shaped like CryptoPrice (coin_id = provider_symbol)
```
This keeps `CryptoMarketTab`/`CryptoDetail` working during rollout with zero renderer change.

### 2.6 Refresh scheduler (main process)
```ts
let assetRefreshTimer: NodeJS.Timeout | null = null;
function startAssetRefresh() {
  if (assetRefreshTimer) return;
  const tick = async () => {
    try {
      const tracked = /* run get-tracked-assets logic */ getTrackedAssets();
      if (tracked.length) { const q = await fetchQuotesRouted(tracked, 'USD'); upsertPrices(q); }
    } catch (e) { /* swallow; cache remains */ }
  };
  assetRefreshTimer = setInterval(tick, 75_000); // 60-90s window
  tick();
}
app.on('will-quit', () => { if (assetRefreshTimer) clearInterval(assetRefreshTimer); });
```
Start it after finance DB init. Prices refresh even with no wallet view open.

**Data flow (Phase 2):**
```
renderer -> financeFetchAssetPrices(items,ccy)
  main: for each item -> asset_prices TTL check (<90s? cache : stale)
    stale -> routeProvider -> Yahoo/CoinGecko quote -> INSERT OR REPLACE asset_prices -> return
scheduler(75s): get-tracked-assets -> routed quotes -> upsert asset_prices (independent of UI)
```

---

# Phase 3 — Frontend: Universal Asset Wallet

### 3.1 Preload bindings (`src/preload.ts`, after line 836)
```ts
financeFetchAssetPrices: (items: {symbol:string; asset_type:string; provider_symbol?:string}[], currency?: string) => ipcRenderer.invoke('finance:fetch-asset-prices', items, currency || 'USD'),
financeGetAssetHistory: (symbol: string, assetType: string, days?: number, currency?: string) => ipcRenderer.invoke('finance:get-asset-history', symbol, assetType, days, currency || 'USD'),
financeSearchAssets: (query: string, assetTypes?: string[]) => ipcRenderer.invoke('finance:search-assets', query, assetTypes),
financeGetTrackedAssets: () => ipcRenderer.invoke('finance:get-tracked-assets'),
```
Keep `financeFetchCryptoPrices`/`financeGetCryptoHistory` (now shims).

### 3.2 Types (`src/components/finance/finance-types.ts`)
```ts
export type AssetType = 'crypto' | 'stock' | 'etf' | 'commodity' | 'index' | 'currency';
export interface PortfolioAsset {
  symbol: string; asset_type: AssetType; name: string;
  provider?: string; provider_symbol?: string;
  amount: number; avg_buy_price: number; current_price?: number;
}
export interface AssetPrice {
  asset_type: AssetType; symbol: string; provider: string; provider_symbol?: string;
  name: string; current_price: number; currency: string;
  price_change_24h: number; price_change_percentage_24h: number; last_updated: string;
}
```
Expand `WalletMetadata` crypto variant to allow `type: 'crypto' | 'investment'` and `assets?: PortfolioAsset[]` (keep legacy fields optional for back-compat).

### 3.3 Legacy asset adapter (single normalizer used by both views)
```ts
export function normalizeAssets(meta: Record<string, any>): PortfolioAsset[] {
  const raw = Array.isArray(meta.assets) ? meta.assets : (meta.coin_id ? [meta] : []);
  return raw.map((a: any) => ({
    symbol: (a.symbol || a.coin_id || a.asset || '').toUpperCase(),
    asset_type: a.asset_type || 'crypto',
    name: a.name || a.symbol || a.coin_id || '',
    provider: a.provider,
    provider_symbol: a.provider_symbol || a.coin_id || a.symbol,
    amount: Number(a.amount) || 0,
    avg_buy_price: Number(a.avg_buy_price || a.avgBuyPrice) || 0,
  })).filter(a => a.symbol);
}
```
Replace the bespoke `assets` memo in `CryptoDetail` (WalletDetailView ~348-372) and the `allAssets` builder in `CryptoMarketTab` (35-79) with this normalizer.

### 3.4 `CryptoDetail` → `AssetDetail` (WalletDetailView.tsx 302-864)
- Fetch via `financeFetchAssetPrices(assets.map(a => ({symbol:a.symbol, asset_type:a.asset_type, provider_symbol:a.provider_symbol})), displayCurrency)`; history via `financeGetAssetHistory(primary.symbol, primary.asset_type, days, ccy)`.
- **Hero card:** total value (`formatMoney`), 24h change %, allocation **doughnut by asset_type** using `TYPE_COLORS` (below). Reuse existing Chart.js doughnut already imported.
- **Asset list grouped by type**, each row: type badge, symbol + name, amount (`formatQuantity`), avg buy (`formatMoney`), current price (`formatMoney`), value (`formatMoney`), P&L abs+% (`formatMoney`/`formatPercent`).
- **“Add Asset”** opens the universal `AssetSearchModal` (delivered file) with tabs All/Stocks/ETFs/Crypto/Commodities — replaces the hardcoded `POPULAR_COINS` dropdown (269-299) and the manual `selectedCoinId` search state.
- **Empty state:** “Track stocks, gold, crypto, and more — add your first holding.” **Loading:** skeleton shimmer rows.

### 3.5 `CryptoMarketTab` → `AssetMarketTab`
- Title “Your Portfolio”; aggregate across all `crypto`+`investment` wallets.
- **Grouped by asset_type** with per-type subtotal + expandable rows; each row: symbol, name, price, 24h %, holdings value, P&L. Search bar (opens `AssetSearchModal`).
- `walletMeta` (line 16) gains `investment: { icon: LineChart, label: 'Investment', color: '#3B82F6' }`.

### 3.6 Type colors + labels (single source, put in `_fx/` or types)
```ts
export const TYPE_COLORS: Record<AssetType,string> = {
  stock:'#3B82F6', crypto:'#8B5CF6', etf:'#06B6D4', commodity:'#F59E0B', index:'#10B981', currency:'#6B7280' };
export const TYPE_LABELS: Record<AssetType,string> = {
  stock:'Stock', crypto:'Crypto', etf:'ETF', commodity:'Commodity', index:'Index', currency:'Currency' };
```
Gold-class assets (GLD/IAU/SGOL/PAXG) render amber via a small override set.

---

# Phase 4 — Wallet Creation & Settings

**File:** `src/components/finance/AccountsTab.tsx` (walletMeta line 56; guidance block 558-567) and `WalletsTab.tsx` (walletMeta line 17).
- Add to both `walletMeta`: `investment: { icon: LineChart, label: 'Investment', color: '#3B82F6' }`. `walletTypes = Object.keys(walletMeta)` (WalletsTab:24) then includes it automatically.
- Creation guidance: when `type === 'investment'`, show: **“Track a portfolio of stocks, ETFs, gold, and more. After creating, open the wallet and search any market (AAPL, GLD, PAXG, GC=F) to add holdings — live prices update automatically.”** Keep the existing `type === 'crypto'` block (558-567) but soften copy to “crypto coins (legacy — use Investment for mixed portfolios).”
- `finance:create-wallet` (main.ts 20880) needs no change (generic `type`), but the migration in 2.2 must run first so `'investment'` passes the CHECK.

---

# Phase 5 — Live Net Worth & Polish

### 5.1 Reactive balances hook (new file `src/hooks/useLiveBalances.ts`, delivered)
- Maintains `Map<wallet_id, liveTotal>`; when an asset wallet view is open, polls `financeFetchAssetPrices` every **30s**, recomputes each asset wallet total from `assets[] * current_price` (currency-converted), updates the map.
- **Debounced write-back (5s):** calls existing `financeAdjustBalance(id, newBalance)` (preload:832 / main `finance:adjust-balance`) so net worth reflects live values with no manual Save. Debounce avoids audit-log spam.

### 5.2 Net worth wiring (`src/pages/FinancePage.tsx` 675-700)
The `netWorth` memo already reads `w.balance` per wallet and converts currency. With 5.1 writing back live balances, net worth becomes live automatically. Optionally overlay the live map before persist:
```ts
const wb = liveBalances.get(w.id) ?? ((w.type==='physical'||w.type==='cash') ? denomSum : (w.balance ?? 0));
```
(Keep the existing Follow-Through receivable addition already present at lines ~693-700.)

### 5.3 State coverage (every new component)
empty / loading (skeleton) / error (inline + retry, mirror CryptoMarketTab lines 165-171) / populated. No box-shadow, `rounded-xl` max, focus rings, ≥44px targets, dark glass `bg-zinc-900/80 backdrop-blur-xl`.

---

# Appendix — API Reference & Symbol Map

**yahoo-finance2** (add to `package.json` dependencies; main-process only):
```ts
import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();
await yf.search('apple');                         // -> quotes[] {symbol,shortname,quoteType,exchange}
await yf.quote(['AAPL','GLD','PAXG-USD']);         // -> {regularMarketPrice, regularMarketChange, regularMarketChangePercent, currency, shortName}
await yf.chart('AAPL', { period1: since, interval: '1d' }); // -> {quotes:[{date,open,high,low,close,volume}]}
```
> Note: Yahoo is unofficial; `quote`/crumb can intermittently fail (known lib issue). Always try/catch and fall back to `asset_prices` cache (and CoinGecko for crypto). Raw endpoints if not using the lib: `https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=1mo&interval=1d` and `.../v7/finance/quote?symbols=A,B,C`.

**quoteType → asset_type map:** EQUITY→stock, ETF→etf, FUTURE→commodity, INDEX→index, CRYPTOCURRENCY→crypto, CURRENCY→currency.

| Class | Symbols (Yahoo) |
|---|---|
| Stocks | `AAPL`, `MSFT`, `GOOGL`, `NVDA` |
| Gold ETFs | `GLD`, `IAU`, `SGOL` |
| Digital gold | `PAXG-USD` (crypto; CoinGecko `pax-gold`), `XAUT-USD` |
| Commodity futures | `GC=F` gold, `SI=F` silver, `CL=F` crude, `PA=F` palladium, `PL=F` platinum, `HG=F` copper, `NG=F` nat gas |
| Indices | `^GSPC` S&P 500, `^DJI` Dow, `^IXIC` Nasdaq |
| Crypto (common) | `BTC-USD`, `ETH-USD` (Yahoo) or `bitcoin`,`ethereum` (CoinGecko) |

**End-to-end verification**
1. Create an **Investment** wallet → open → search “Apple” → add AAPL w/ amount+buy price → row shows live price, value, P&L with `$` + commas.
2. Add `PAXG-USD` and `GC=F` → both resolve (crypto vs commodity), amber in allocation doughnut.
3. Leave the page 2 min → scheduler refreshed cache (check `asset_prices.last_updated`).
4. Two quick refreshes within 90s → second served from cache (no network).
5. Existing crypto wallet still opens and prices load (shim path).
6. Switch display currency to IDR → all values reformat (symbol `Rp`, 0 decimals, commas).
7. Net worth updates within ~35s of a price move without clicking Save (live write-back).
8. Every new view shows empty/loading/error states.
