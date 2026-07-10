# Design Prompt: Asset Wallet Expansion — Stocks, Gold, Commodities, ETFs

## Raw Request

> the current crypto wallet feature, its not dynamic, it is not updt o date to the all of the like other cyprto stuff, and there needs to support for the gold and stocks and not just crypto, but also stocks and like gold and commodity etf and everythign that is available in the trading view should all be available for exampel pax gold and stuff. make sure to research on hwo to do thta
>
> and inthe add coin, the numbers, basically everything that is related to amounto f money in the finance page NEEDS TO HAVE THE CURRENCY SHOWING AND THE COMMAS SHOWING PROPERLY. AUTOMATIC COMMA SYSTEM

---

## Context

Read `agent/docs/asset-wallet-expansion/CONTEXT_BUNDLE.md` first — it contains all relevant source code, data structures, IPC endpoints, and architecture notes.

The DeskFlow finance system currently supports **crypto wallets only** (via CoinGecko API, 30 hardcoded coins, crypto-only price tables). The user needs it expanded to cover **everything available on TradingView** — stocks, gold, commodity ETFs, and any tradeable asset.

Additionally, currency formatting is broken in the crypto-specific components: `CryptoDetail` and `CryptoMarketTab` use custom `formatAssetValue`/`formatPrice` functions that call raw `toLocaleString` **without** currency symbols or the project's `formatCurrency()` utility.

---

## The Mandate

Design a comprehensive solution for expanding the DeskFlow finance system from crypto-only to universal asset tracking, plus fix currency formatting across all finance components.

You are the **Lead Designer and Engineer** — own the solution from backend to pixels. Do not offer options. Deliver a single, complete, well-reasoned specification.

---

## Engineering Tasks

### Task A: Generalized Price Data Infrastructure

Replace the crypto-only price architecture with a universal asset price system:

- **New DB table `asset_prices`** — generalize `finance_crypto_prices` with an `asset_type` discriminator column (`'crypto' | 'stock' | 'etf' | 'commodity' | 'index' | 'currency'`), a `symbol` field that works across providers, and a `provider` field indicating the data source (e.g., `'yahoo'`, `'coingecko'`, `'alphavantage'`)
- **New DB table `asset_history`** — generalize `finance_crypto_history` with the same `asset_type` + `symbol` columns
- **TTL-based caching** — implement a 90-second cache TTL (check `last_updated` before deciding to fetch from API)
- **Multi-provider strategy** — primary: Yahoo Finance (v8 chart + v7 quote endpoints, npm `yahoo-finance2`). Fallback: CoinGecko for crypto only. Design a provider abstraction layer so new providers can be added.
- **Backend refresh scheduler** — main-process interval that refreshes tracked asset prices every 60-90 seconds, even if no wallet view is open

### Task B: New IPC Handlers

- **`finance:fetch-asset-prices`** — accepts `(symbols: string[], assetType?: string)` — routes to the correct provider based on asset type. Returns `{ symbol, name, current_price, price_change_24h, price_change_percentage_24h, last_updated }[]`
- **`finance:get-asset-history`** — accepts `(symbol: string, assetType: string, days: number)` — returns OHLCV or price-point history
- **`finance:search-assets`** — accepts `(query: string, assetTypes?: string[])` — searches across stocks, ETFs, commodities, and crypto by name or symbol. Returns top matches with type, symbol, name, exchange.
- **`finance:get-tracked-assets`** — returns all unique assets across all wallets (for the refresh scheduler to know what to refresh)
- **Modify `finance:update-wallet-metadata`** — no changes needed, it already handles generic JSON metadata

### Task C: Wallet Generalization

- **`WalletMetadata` type expansion** — generalize the `crypto` type's `assets` array to work with any asset type. New shape:
  ```typescript
  assets?: {
    symbol: string;        // AAPL, BTC-USD, GLD, GC=F
    asset_type: 'stock' | 'etf' | 'commodity' | 'crypto' | 'index';
    name: string;          // Apple Inc., Bitcoin
    amount: number;
    avg_buy_price: number;
    current_price?: number; // populated by live fetch
  }[];
  ```
- **Wallet type** — decide: add a new `'investment'` wallet type vs. generalize existing `'crypto'` type. Consider backward compatibility with existing crypto wallets.
- **Coin selector → Universal asset search** — replace the hardcoded 30-coin dropdown (WalletDetailView.tsx:270-301) with a searchable asset picker that queries `finance:search-assets` across all markets

### Task D: Currency Formatting Fix (IMMEDIATE)

Audit and fix every monetary display in the finance page to use the project's `formatCurrency()` utility (from `currency-data.ts`):

1. **`CryptoDetail`** (WalletDetailView.tsx:330-342) — replace `formatAssetValue` with `formatCurrency()`, adjusting decimal rules for small crypto values while keeping the currency symbol
2. **`CryptoMarketTab`** (CryptoMarketTab.tsx:35-43) — replace `formatPrice` with `formatCurrency()`
3. **All other finance components** — verify `formatCurrency()` is used everywhere. Look for raw `toLocaleString` calls on monetary values.
4. **`formatCurrency()` enhancements** — the utility already handles commas and locale-aware formatting. Make sure the crypto-small-number case (< $0.01) adapts decimal places automatically while keeping the `$` prefix.

### Task E: Live Net Worth

- **Balances service** — maintain a reactive map of wallet_id → live_total_value in the renderer
- **Auto-refresh** — when any asset wallet view is open, poll `finance:fetch-asset-prices` every 30 seconds and recompute portfolio totals
- **Write-back** — debounce-save the updated `wallet.balance` to the main process so net worth reflects live values without manual Save clicks

### Task F: Yahoo Finance Integration Details

For the backend implementation, Yahoo Finance v8 chart endpoint:
```
GET https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1mo&interval=1d
```
Returns OHLCV data. For current quotes:
```
GET https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,MSFT,GLD
```
Returns current price, change, volume, market cap. Consider using the npm package `yahoo-finance2` which wraps these endpoints with retry logic.

Commodity futures symbols on Yahoo: `GC=F` (Gold), `SI=F` (Silver), `CL=F` (Crude Oil), `PA=F` (Palladium), `PL=F` (Platinum), `HG=F` (Copper), `NG=F` (Natural Gas)

Gold ETFs: `GLD`, `IAU`, `SGOL`, `PAXG` (PAX Gold — digital gold token)

---

## Design Tasks

### Wireframe the following views:

**A) Universal Asset Wallet Detail** (renamed/replaced CryptoDetail)
- Hero card: total portfolio value with currency symbol, 24h change %, allocation by asset type (doughnut chart colored by type: stocks=blue, crypto=purple, gold=amber, etc.)
- Performance chart: same Chart.js line chart but now asset-type-aware, timeframe selector
- Asset list: grouped by asset type, each row showing symbol + name, amount, avg buy, current price, total value, P&L (abs + %). Type badge on each row.
- "Add Asset" button → universal search modal with type filter tabs (All / Stocks / ETFs / Crypto / Commodities)
- Empty state: "Track stocks, gold, crypto, and more — add your first holding"
- Loading state: skeleton shimmer on price fetch

**B) Universal Market Tab** (replaces CryptoMarketTab)
- Portfolio summary across all asset wallets, grouped by type
- Per-type breakdown section with expandable asset lists
- Market summary row for each asset: symbol, name, price, 24h change %, your holdings value, P&L
- Search bar to find and add assets across all markets

**C) Asset Search Modal**
- Search input with 300ms debounce
- Results grouped by asset type with colored type pills
- Show symbol, name, exchange, current price
- Click to add with amount + buy price form
- Empty state: "Search for stocks, ETFs, gold, crypto..."
- Loading state: spinner with "Searching across markets..."

**D) Wallet Creation** — add stock/ETF/commodity wallet guidance
- New wallet form: when user selects type, show appropriate guidance
- "Investment" wallet type with explanation: "Track a portfolio of stocks, ETFs, gold, and more"

**E) Formatting System**
- A single `formatMoney(value, currency, opts?)` function used everywhere
- Auto-adapts decimal places: values >= 1 get 2 decimals, values < 1 get 4-8 decimals based on magnitude
- Always shows currency symbol
- Always shows locale-aware thousands separators (commas)
- Zero-decimal currencies (JPY, KRW, IDR, VND) round to integers

---

## Constraints

1. **Backward compatibility** — existing crypto wallets must continue working. The `crypto` wallet type should either be absorbed into the new system or kept as a backward-compatible alias.
2. **No new runtime dependencies** — use existing packages (Chart.js, already bundled). For Yahoo Finance, use `yahoo-finance2` npm package (add to `package.json`). Do NOT add TradingView charting library (requires license).
3. **Files are CRLF** — preserve line endings. Do not mass-reformat.
4. **Dark mode only** — all new UI follows the existing dark theme (`bg-zinc-900/80 backdrop-blur-xl` glass layer pattern)
5. **Existing `formatCurrency()`** in `currency-data.ts` is the canonical formatter — do not replace it, just ensure every component uses it
6. **CoinGecko stays as crypto fallback** — do not remove existing CoinGecko support. Route crypto requests through both providers (Yahoo for common pairs, CoinGecko for long-tail altcoins)

---

## Output Format

Provide a single RESULT.md with:

1. **Phase 1: Currency Formatting Fix** — Immediate, isolated fix. Files changed, exact edits.
2. **Phase 2: Backend — Universal Asset Infrastructure** — DB migrations, new IPC handlers, provider abstraction, scheduler
3. **Phase 3: Frontend — Universal Asset Wallet** — WalletDetailView changes, CryptoMarketTab generalization, search modal
4. **Phase 4: Wallet Creation & Settings** — New wallet type, account creation guidance
5. **Phase 5: Live Net Worth & Polish** — Auto-refresh, reactive balance updates, loading/empty/error states
6. **Appendix: API Reference** — Yahoo Finance endpoints used, symbol mapping table

Each phase should include:
- Exact files and line numbers to modify
- Code snippets for new/modified functions
- Visual specs for new UI components (layout, spacing, colors)
- Data flow diagrams for IPC interactions
- Test/verification steps
