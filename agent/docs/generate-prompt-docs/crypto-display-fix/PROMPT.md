# PROMPT.md — Crypto Wallet Display Fixes & New Features

## Raw Request

> "the fiat and the available needs to be the same thing because those both are the same thing. The fiat is the amount of money you have available after the purchase. Spent should be categorized into spending your money spending your fiat for the crypto so buying spending and transactional spending. And transferring to our own different wallet shouldn't add to any of the spending. There's two types of spending again. There's the buying which is from fiat to crypto and there's also transferring. Transfer to someone else so we were to buy something it's transactional. So we want to pay right paying means it is a spent. The paying feature. We haven't added those yet. We need paying and receiving. The spent value needs to be calculated from all the buy transactions. The profit and loss needs to count from the initial buy average price times the amount of coin you have which should decrease when you sell or transfer. The percentage increase on the 24-hour thing doesn't work. The initial value after recalculating turns to negative value."

---

## Problem Statement

The crypto wallet display has multiple issues:
1. "Fiat" and "Available" show the same value — should be combined into one
2. "Spent" counts transfers as spending — should only count fiat→crypto buys
3. No "Paying" feature (transfer crypto to another person as payment)
4. No "Receiving" feature (receive crypto as payment, not buying)
5. 24h percentage doesn't display
6. P&L calculation is wrong — should be (current price - avg buy price) × quantity
7. Initial wallet value turns negative after recalculate

---

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in the same directory. It contains ALL relevant source code with exact file paths and line numbers.

---

## Engineering Task: Design Comprehensive Fixes

### Task 1: Combine "Fiat" and "Available" Display

**Current code (WalletDetailView.tsx lines 1184-1196):**
```tsx
<span className="text-zinc-500">Fiat</span>
<span className="text-zinc-300 font-medium tabular-nums">{fmtCurrency(availableFiat, displayCurrency)}</span>
{totalCost > 0 && (
  <>
    <span className="text-zinc-600">·</span>
    <span className="text-zinc-500">Spent</span>
    <span className="text-zinc-400 tabular-nums">{fmtCurrency(totalCost, displayCurrency)}</span>
    <span className="text-zinc-600">·</span>
    <span className="text-zinc-500">Available</span>
    <span className={`font-medium tabular-nums ${availableFiat > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtCurrency(availableFiat, displayCurrency)}</span>
  </>
)}
```

**Required fix:** Remove the duplicate "Fiat" label. Show only:
- "Available" = `availableFiat` (the actual fiat balance after all transactions)
- "Spent" = sum of fiat spent on BUYING crypto only (not transfers)

### Task 2: Fix "Spent" Calculation

**Current code (WalletDetailView.tsx lines 575-578):**
```tsx
if (delta > 0 && t.type === 'expense') {
  const cost = delta * (Number(m.price) || 0);
  asset.total_cost += cost;
}
```

This is mostly correct but needs verification. "Spent" should be:
- Sum of `(qty × price)` for ALL `expense` type transactions with crypto metadata
- Should NOT include transfers (even if they have crypto metadata)
- Should NOT include income transactions (sells)

The `totalCost` variable (line 607) computes this:
```tsx
const totalCost = useMemo(() => assets.reduce((s, a) => s + a.amount * a.avg_buy_price, 0), [assets]);
```

**Issue:** `totalCost` is computed from `assets` which has the averaged `avg_buy_price`. This means if you buy 0.5 BTC at $50k and 0.5 BTC at $60k, the avg is $55k, and totalCost = 1.0 × $55k = $55k. But the actual fiat spent was $50k + $60k = $110k.

**Required fix:** Track `total_fiat_spent` separately in the assets derivation:
```tsx
const assetsMap = new Map<string, { 
  coin_id: string; symbol: string; amount: number; 
  total_cost: number; total_fiat_spent: number 
}>();

// In the loop:
if (delta > 0 && t.type === 'expense') {
  const cost = delta * (Number(m.price) || 0);
  asset.total_cost += cost;
  asset.total_fiat_spent += (Number(m.total) || cost); // Use m.total if available
}

// Then totalSpent = sum of all assets' total_fiat_spent
const totalSpent = useMemo(() => assets.reduce((s, a) => s + (a as any).total_fiat_spent || 0, 0), [assets]);
```

### Task 3: Add "Paying" Feature (Transfer to Person)

This is a new transaction type/mode. When you send crypto to someone else (not to your own wallet), it's a "payment" — a spend.

**Backend:** The existing `finance:create-transfer` handler already supports transfers between wallets. For paying a person, we need:
1. A new field `payee_name` or `person_name` on the transaction metadata
2. The transfer should still reduce crypto holdings (already works)
3. The "Spent" calculation should optionally include payments

**Frontend:** In CryptoTransactionModal, add a "Pay" mode alongside "Buy", "Sell", "Transfer":
- "Pay" = send crypto to a person (not a wallet)
- Shows a text input for payee name
- Creates a transfer transaction with `metadata.payee` field

### Task 4: Add "Receiving" Feature (Receive as Payment)

When you receive crypto from someone (not from buying), it's "receiving" — not a buy, not a transfer-in.

**Backend:** Create a transaction with:
- `type: 'income'` (receiving money)
- `metadata` with crypto fields (coinId, qty, price)
- No fiat amount (or 0)

**Frontend:** In CryptoTransactionModal, add a "Receive" mode:
- "Receive" = get crypto from someone
- Shows a text input for sender name
- Creates an income transaction with crypto metadata
- Does NOT add to "Spent" (it's income, not spending)

### Task 5: Fix P&L Calculation

**Current code (WalletDetailView.tsx lines 612-613):**
```tsx
const totalPnl = cryptoPortfolioValue - totalCost;
const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
```

**Issue:** `totalCost` is the averaged cost basis, not the actual fiat spent. The P&L should be:
```
P&L = (current_price × quantity) - (avg_buy_price × quantity)
    = quantity × (current_price - avg_buy_price)
```

This is what the code already does (line 1200-1204):
```tsx
{fmtCurrency(totalPnl, displayCurrency)}
({fmtPct(totalPnlPct, 1)}%)
```

**But the issue is that `totalCost` uses averaged prices, which may not reflect actual fiat spent.** The P&L formula is mathematically correct — it shows unrealized gain/loss based on average entry price vs current price.

**Required fix:** Ensure `totalCost` correctly reflects the cost basis (quantity × avg_buy_price), which it already does. The P&L display should be correct once the assets derivation is fixed.

### Task 6: Fix 24h Percentage Display

**Current code (WalletDetailView.tsx lines 1175-1179):**
```tsx
{pc24h !== null && (
  <div className={`text-right ${pc24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
    <div className="text-sm font-semibold tabular-nums">{fmtPct(pc24h)}%</div>
    <div className="text-[10px] opacity-70">24h</div>
  </div>
)}
```

**Issue:** `pc24h` comes from `primaryPrice?.price_change_percentage_24h` (line 621). If `primaryPrice` is null or the field is missing, `pc24h` is null and nothing displays.

**Required fix:** Ensure the price fetch returns `price_change_percentage_24h`. Check the CoinGecko API response structure. If the field is named differently (e.g., `price_change_24h`), map it correctly.

### Task 7: Fix Initial Value After Recalculate

**Issue:** The initial wallet value turns negative after recalculate.

**Root cause:** When a crypto wallet is created, the `initial_balance` is set and an `is_adjustment` income transaction is created. The recalculate handler starts from `initial_balance` and applies all transactions. If the initial balance is 0 (which it is for crypto wallets — see line 23257 in main.ts where it's set to 0 after creating the adjustment), then the recalculate starts from 0.

**But the issue is that the recalculate handler might be subtracting the crypto buy amounts from the fiat balance.** For crypto wallets, fiat buys should reduce `wallet.balance`. The recalculate handler does this correctly for `expense` type transactions (line 25964: `balance -= Math.abs(txnAmt)`).

**The negative balance could happen if:**
1. The initial `wallet.balance` is set to a value (e.g., 10000)
2. A buy transaction subtracts from it (e.g., -5000)
3. But the initial_balance is also 0, so recalculate starts from 0
4. After applying the buy: 0 - 5000 = -5000

**Required fix:** For crypto wallets, the initial balance should be set correctly when the wallet is created. The recalculate handler should use `wallet.balance` as the starting point, not `wallet.initial_balance`.

Actually, looking at the code more carefully:
- Line 25893: `const initialBalance = ... Number(rawInitBal) || 0;` — uses `wallet.initial_balance`
- Line 25898: `let balance = initialBalance;` — starts from initial_balance

For crypto wallets created with `initial_balance = 0` (line 23257), the recalculate starts from 0. But `wallet.balance` might have been set to 10000 (the initial deposit). This mismatch causes the negative balance.

**The fix is to ensure `wallet.initial_balance` matches `wallet.balance` at creation time, OR to use `wallet.balance` as the starting point for recalculate instead of `wallet.initial_balance`.**

---

## Constraint Checklist

1. **Must not break existing non-crypto wallet functionality**
2. **Must preserve transaction history** — no data loss
3. **Must handle the `is_adjustment` flag correctly** — historical transactions use date `1900-01-01`
4. **Must work with encryption** — all balance/metadata fields may be encrypted
5. **Must recalculate balances after any change**
6. **New features (Pay/Receive) must have both frontend UI and backend IPC**

---

## Output Format

Provide the fix as a series of EXACT code changes, each with:
1. File path and line range
2. Current code (what to replace)
3. New code (what to replace it with)
4. Explanation of why this change fixes the bug

Group changes by file. Order by dependency (backend first, then frontend).
