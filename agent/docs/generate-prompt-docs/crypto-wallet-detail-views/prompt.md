# Prompt: Per-Wallet-Type Detail Views (Crypto, Cash, Bank, Debit, Credit, E-Wallet)

## Raw Request

> crypto wallets — should be able to put btc, eth etc into a crypto wallet and the prices auto-update from an api
>
> wallet detail view — each wallet type should have its own detailed view (crypto, cash, bank, etc.)
>
> cash wallet — should have a cash counter feature (like how many $100 bills, $20 bills, etc)
>
> it should not only ask for the design of the crypto wallet, but also other forms of wallet like the bank debit  cash adn stuff.
>
> and like the viewing fot he like charts and or the graph or something or how the stocks or crypto stuff is goign up and down the profit loss stuff, etc.

---

## Context

Read `agent/docs/crypto-wallet-detail-views/CONTEXT_BUNDLE.md` first — it is your ground truth for data structures, IPC endpoints, design tokens, and existing code patterns. This document is the source of truth for what currently exists.

### The Problem: All Wallet Types Share One Generic Model

The enum defines 6 wallet types + `other`:
- `bank`, `debit_card`, `credit_card`, `crypto`, `cash`, `ewallet`

But they all use the **exact same data model**: `{ name, balance: number, provider, last_four }`. Every wallet is just a name plus a single fiat number. There is no detail view — wallets are rendered as flat inline rows inside an expanded account card, all looking identical.

This means:

| Type | What's Missing |
|------|---------------|
| **bank** | Account number, routing number, institution, transaction history scoped to this account |
| **debit_card** | ATM limit, daily spending cap, linked account, pending transactions |
| **credit_card** | Credit limit (used/available bar), APR, statement date, payment due date, pending vs. cleared |
| **crypto** | No asset tracking at all — can't hold BTC/ETH/SOL. No prices. No portfolio view. Just a useless fiat number. |
| **cash** | No bill/coin breakdown — can't track how many $100s, $20s, $10s, $5s, $1s you have. Just a total. |
| **ewallet** | Linked cards/accounts, transaction history, no way to see what's inside |

Every type needs:
1. **Type-specific fields** stored alongside the wallet
2. **A dedicated detail view** that shows those fields in a useful layout
3. **Type-specific interactions** (add assets, count bills, set credit limit, etc.)

---

## The Mandate

Design a **complete per-wallet-type detail view system** for all 6 wallet types. This is not just a crypto feature — every wallet type gets its own data model, fields, and detail view.

### Part 1: Data Architecture — Type-Specific Metadata for All 6 Types

Design how each wallet type stores its type-specific data. Every type keeps the shared `FinanceWallet` fields (`id`, `account_id`, `name`, `balance`, `currency`, etc.) plus a metadata payload unique to its type.

| Type | Required Metadata Fields |
|------|------------------------|
| **bank** | `accountNumber`, `routingNumber`, `institution`, `notes` |
| **debit_card** | `atmWithdrawalLimit`, `dailySpendingLimit`, `linkedAccountId` |
| **credit_card** | `creditLimit`, `apr`, `statementDate`, `paymentDueDate`, `lastStatementBalance` |
| **crypto** | `assets: [{ asset: 'BTC', amount: 0.5 }, { asset: 'ETH', amount: 2.0 }]` — each with symbol, amount, optional purchase price |
| **cash** | `denominations: { '100': 3, '50': 1, '20': 5, '10': 2, '5': 4, '1': 10, '0.25': 8 }` — bill/coin face value → count |
| **ewallet** | `linkedAccounts: [{ provider, lastFour, label }]` |

Key design decisions to make:
1. **Storage strategy** — Add a `metadata` JSON/TEXT column to `finance_wallets` table? Or separate per-type tables? Weigh: query complexity, migration cost, forward compatibility.
2. **Balance computation** — For crypto, fiat balance = Σ(asset amount × current price). For cash, balance = Σ(denomination × count). For others, balance is manually entered (sum of metadata fields optional).
3. **Crypto price fetching** — Which API? CoinGecko free tier? Where does the fetch run (main process `setInterval`? IPC on detail view open?) Caching strategy (`finance_settings` or new table). Fallback on failure (stale prices + stale indicator).
4. **Update mechanism** — How does the frontend push metadata changes? New IPC channel `finance:update-wallet-metadata`? Or a generic `finance:update-wallet` that accepts the full `metadata` blob?

### Part 2: Navigation — How Users Reach a Wallet Detail View

Currently users see wallets as inline rows inside expanded account cards. There is no click-to-detail flow.

Design the navigation:
1. What triggers the detail view? (Clicking a wallet row? A "Details" button on hover?)
2. How does the detail view appear? Options:
   - **Full-page new tab** (e.g., `overview` / `accounts` / `transactions` / `categories` / `wallets` as a 5th tab in the tab bar)
   - **Modal overlay** (AnimatePresence slide-up or centered card)
   - **Side panel** sliding in from the right
   - **Inline expand** below the wallet row (like account accordion)
3. How does the user go back? (Tab switch, close button, back button)
4. What stays visible while in the detail view? (Header, net worth? Tab bar?)

### Part 3: Wallet Detail View — Per-Type Specifications

Design the layout for the **common header** across all types, then the type-specific body for each.

#### Common Header (all types)
- Wallet name, type badge (color-coded per `walletMeta`)
- Provider (e.g., "Chase", "Coinbase") + last_four
- Balance display: converted to display currency + original balance
- Edit / Delete action buttons

#### Bank Detail
- Account number (masked: `****1234`)
- Routing number
- Institution name
- Recent transactions filtered to this wallet
- What actions: edit, delete

#### Debit Card Detail
- ATM withdrawal limit (with edit)
- Daily spending limit (with edit)
- Last four digits
- Linked bank account reference
- Recent transactions (spending)

#### Credit Card Detail
- **Credit limit bar**: visual bar showing used vs. available credit (`text-red-400` when nearing limit)
- Statement balance + date
- Payment due date
- APR display
- Last four digits
- Transactions split into **Pending** and **Cleared** sections
- What actions: edit, delete

#### Crypto Detail — Full Portfolio Dashboard with Charts

This is the most feature-rich detail view. Think stock portfolio app (like Coinbase, Robinhood, or Yahoo Finance portfolio view):

- **Portfolio header**: total value in display currency, 24h change (absolute $ and %), all-time P&L (profit/loss in green/red), last updated timestamp
- **Performance chart** — Interactive price chart showing portfolio value over time:
  - Timeframe selector: 1D, 1W, 1M, 3M, 1Y, ALL
  - Line/area chart with gradient fill (green when positive, red when negative)
  - Crosshair tooltip showing value at hover point
  - Uses Chart.js (already in the project) or lightweight-charts (trading-style candlestick if preferred)
- **Asset allocation donut** — Pie/donut chart showing % breakdown by asset (BTC: 45%, ETH: 30%, SOL: 25%)
- **Asset table**: each row = icon + name (BTC) + amount (0.5000) + avg buy price + price ($68,420) + value ($34,210) + 24h change (green/red %) + P&L since purchase (green/red $)
  - Sortable by any column
  - Each row clickable to show a mini price chart for that asset
  - "Add Asset" button opens a picker/prompt
  - Each row has a delete/remove action
- **Price source indicator**: "Prices from CoinGecko • Updated 2m ago" with refresh button
- **Profit/loss summary row** — Total P&L (realized + unrealized) at the bottom
- **Empty state**: "No assets yet. Add your first cryptocurrency." with illustrated icon
- **Error state**: "Could not update prices" banner with last-known prices shown as stale (dimmed, with ⚠️ indicator)
- **Loading state**: Skeleton rows while prices load (show amounts + "—" for prices)

#### Cash Detail
- **Denomination grid**: rows of bill/coin denominations with +/- steppers and computed value
  ```
  | Denomination | Count | Value |
  |--------------|-------|-------|
  | $100         | [-] 3 [+] | $300  |
  | $50          | [-] 1 [+] | $50   |
  | $20          | [-] 5 [+] | $100  |
  | ...          |          |       |
  | **Total**    |          | **$485** |
  ```
- Quick-add preset buttons: "+$100 bill", "+$20 bill", etc.
- Support for coin denominations (quarters, dimes, nickels, pennies)
- **Multi-currency consideration**: if wallet currency is EUR, show euro bills (€100, €50, €20, etc.)
- When all counts are zero, show empty state: "Enter your physical cash by adding bills below."
- Auto-computed total updates live as counts change
- Save button persists the denomination map; Cancel reverts

#### E-Wallet Detail
- Linked payment methods list (card provider + last four)
- Balance (may differ from actual e-wallet due to pending transactions)
- Recent transaction history
- What actions: edit, delete, link new card

### Part 4: Ripple Effects on Existing Views

When adding type-specific metadata, consider:

1. **AccountsTab wallet rows** — Currently shows `w.balance`. For crypto, should it show the computed fiat total? For cash, the denomination sum?
2. **OverviewTab account balance** — Account balance = sum of wallet balances (converted). This computation must work correctly for crypto (asset×price) and cash (denom sum).
3. **Net worth calculation** — Same: crypto/cash wallet balances must feed into the net worth number correctly.
4. **CreateWalletModal / EditWalletModal** — Should these change based on selected type? E.g., crypto wallet creation could show an "Add initial assets" step.
5. **Currency conversion** — `convertAmount()` currently converts fiat currencies only. Crypto needs a separate conversion path (crypto → fiat via price API).

### Constraints

1. **No external services beyond price API** — Only CoinGecko (free tier) for crypto prices. No auth tokens, no SaaS dependencies.
2. **IPC must be real** — If new IPC channels are needed, specify the channel name, payload, and handler location in `src/main.ts`. All finance handlers are inline (no service layer).
3. **Existing features must not break** — Lock screen, auto-lock timer, password protection, currency conversion, net worth, custodial exclusion, delete protection — all continue working.
4. **Stay within finance files** — `src/pages/FinancePage.tsx`, `src/components/finance/`, `src/main.ts`, `src/preload.ts`. Do not touch other routes.
5. **No React Router** — Finance has no sub-routing. Detail navigation uses React state + tab/modal/panel, not route changes.
6. **Tailwind v4** — `@import "tailwindcss"` syntax. No v3 directives.
7. **Design system** — Dark theme, GlassSurface cards, emerald accent, `tabular-nums` for money, `text-[10px]`/`text-[11px]` for labels. Per-type accent colors from `walletMeta` (Bank=#3B82F6, Debit=#10B981, Credit=#F59E0B, Crypto=#8B5CF6, Cash=#EC4899, Ewallet=#06B6D4).
8. **No LLM API costs** — Crypto prices from a free REST API (CoinGecko public), not from an LLM.

---

## Output Format

Provide a comprehensive solution with these sections:

### 1. Data Architecture
- Per-type metadata schemas
- Storage strategy (recommended: `metadata` JSON column vs. separate tables)
- Migration plan for existing wallets

### 2. Backend Changes
- New/updated IPC channels (`finance:update-wallet-metadata`, `finance:fetch-crypto-prices`, etc.)
- Crypto price fetching: API choice, fetch timing, caching, error handling code sketch
- SQL migrations needed

### 3. Navigation Design
- How users enter a wallet detail view
- What component renders it (tab, modal, panel)
- Back/close flow
- State management in FinancePage.tsx

### 4. Wallet Detail View — Per-Type Specifications
For each type (bank, debit_card, credit_card, crypto, cash, ewallet):
- Layout wireframe (component tree, order of sections)
- Exact data fields displayed
- Interactive controls (edit fields, add assets, count bills, etc.)
- Empty / loading / error states
- Visual spec (colors, spacing, font sizes)

### 5. Implementation Plan
Ordered implementation steps:
1. Phase 1 — Backend: metadata column, IPC updates
2. Phase 2 — Navigation: detail view container + routing
3. Phase 3 — Common header + shared components
4. Phase 4 — Per-type views (in what order)
5. Phase 5 — Crypto price integration
6. Phase 6 — Ripple fixes (creation modals, balance computation, net worth)

Use `CONTEXT_BUNDLE.md` for exact file paths, component names, IPC channel names, and design tokens.
