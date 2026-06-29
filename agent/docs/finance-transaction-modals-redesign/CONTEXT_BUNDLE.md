# CONTEXT_BUNDLE.md — Per-Wallet Transaction Modals Redesign

> Generated: 2026-06-26
> Purpose: Complete code context for Architect AI to redesign all 7 wallet-type transaction modals

## Raw Request

> "the transaction popup thing is like not complete right, thats what i mentioned. so include it in the prompt. follow my exact prompt request."
> 
> User wants all 7 wallet-type transaction modals to be fully implemented, each with wallet-specific UI flows, context bands, proper field layouts, auto-calc, denomination pickers, and human-centered UX. Current modals are generic and incomplete.

## Current Implementation State

### Files Affected
- `src/components/finance/modals/TransactionModalShell.tsx` — Shared shell (127 lines)
- `src/components/finance/modals/BankTransactionModal.tsx` — Bank modal (155 lines)
- `src/components/finance/modals/DebitTransactionModal.tsx` — Debit modal
- `src/components/finance/modals/CreditTransactionModal.tsx` — Credit modal
- `src/components/finance/modals/CryptoTransactionModal.tsx` — Crypto modal (168 lines)
- `src/components/finance/modals/CashTransactionModal.tsx` — Cash modal
- `src/components/finance/modals/PhysicalTransactionModal.tsx` — Physical modal
- `src/components/finance/modals/EwalletTransactionModal.tsx` — Ewallet modal
- `src/components/finance/modals/CategoryChipGrid.tsx` — Category selection
- `src/components/finance/modals/DenominationPicker.tsx` — Denomination picker
- `src/components/finance/modals/useFormattedAmount.ts` — Number formatting hook
- `src/components/finance/modals/txPrefs.ts` — Last-used prefs persistence
- `src/pages/FinancePage.tsx` — Routing logic for FAB press
- `src/components/finance/WalletDetailView.tsx` — Wallet detail views
- `src/components/finance/finance-types.ts` — Type definitions
- `src/components/finance/currency-data.ts` — Currency formatting + exchange rates

### Existing RESULT.md Spec
- Location: `agent/docs/finance-physical-wallet-revamp/RESULT.md`
- Contains comprehensive spec for all 7 modal types (Section 3)
- Implementation is PARTIAL — some modals missing context bands, specialized flows

## Type Definitions

### FinanceWallet (finance-types.ts)
```typescript
export interface FinanceWallet {
  id: number;
  account_id: number;
  name: string;
  type: WalletType;
  provider?: string;
  last_four?: string;
  balance: number;
  currency: string;
  metadata?: string | Record<string, any>;
  is_archived?: number;
  created_at?: string;
  updated_at?: string;
}

export type WalletType = 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'physical' | 'other';
```

### Wallet Meta Map
```typescript
const walletMeta: Record<string, { icon: any; label: string; color: string }> = {
  bank: { icon: Landmark, label: 'Bank', color: '#3B82F6' },
  debit_card: { icon: CreditCard, label: 'Debit Card', color: '#10B981' },
  credit_card: { icon: CreditCard, label: 'Credit Card', color: '#F59E0B' },
  crypto: { icon: Wallet, label: 'Crypto', color: '#8B5CF6' },
  cash: { icon: PiggyBank, label: 'Cash', color: '#EC4899' },
  physical: { icon: WalletCards, label: 'Physical', color: '#F97316' },
  ewallet: { icon: Banknote, label: 'E-Wallet', color: '#06B6D4' },
  other: { icon: Wallet, label: 'Other', color: '#6B7280' },
};
```

## IPC Endpoints

### Transaction IPC (existing)
```typescript
// preload.ts
financeAddTransaction: (data: any) => ipcRenderer.invoke('finance:add-transaction', data)

// main.ts handler
electron_1.ipcMain.handle('finance:add-transaction', async (_event, data) => {
  // data: { account_id, wallet_id, category_id, type, amount, description, date, note?, metadata? }
  // Returns: { id, ... } or null on failure
});
```

### Crypto Price IPC (existing)
```typescript
financeFetchCryptoPrices: (coinIds: string[], currency?: string) => ipcRenderer.invoke('finance:fetch-crypto-prices', coinIds, currency)
```

## Design Tokens (DeskFlow)
- Backgrounds: `zinc-950`, `zinc-900`, `zinc-900/50`, `zinc-800/80`, `zinc-800/50`, `zinc-800/30`, `zinc-800/20`
- Text: `white`, `zinc-400`, `zinc-500`, `zinc-600`
- Borders: `zinc-700/50`, `zinc-700/30`, `white/5`
- Accents per wallet type (see walletMeta above)
- Max border radius: `rounded-xl`
- No box-shadow, no spring physics
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Touch targets: ≥44px (`min-h-[44px] min-w-[44px]`)

## Animation Tokens
- Overlay fade: `opacity` 180ms
- Container enter: `translateY(12px)→0` + `opacity` 240ms
- State changes: 150-300ms, `transform`/`opacity`/`background-color` only
- Success check: `scale 0.8→1` + `opacity` 200ms, auto-close at 800ms

## Current Modal Issues (from user feedback)

1. **Generic appearance** — All modals look similar despite different wallet purposes
2. **Missing context bands** — Bank has partial, others lack wallet-specific context
3. **Incomplete UX flows** — Crypto missing proper auto-calc display, Physical/Cash missing denomination pickers in modal
4. **No wallet-specific field layouts** — Same fields shown regardless of wallet type
5. **Missing progressive disclosure** — All fields visible at once, no advanced toggles
6. **No empty/loading/error states** — Modals assume happy path only
7. **Submit feedback incomplete** — Missing spinner→success→auto-close lifecycle per spec
8. **No auto-fill for denominations** — Physical/Cash should have greedy largest-first algorithm
9. **Credit missing utilization bar** — Should show credit utilization with color coding
10. **Debit missing daily limit progress** — Should show today's spending vs limit

## Routing Logic (FinancePage.tsx)

The FAB opens wallet-specific modal when a wallet detail is open:
```typescript
const MODALS: Record<WalletType, React.FC<TxModalProps>> = {
  bank: BankTransactionModal,
  debit_card: DebitTransactionModal,
  credit_card: CreditTransactionModal,
  crypto: CryptoTransactionModal,
  physical: PhysicalTransactionModal,
  cash: CashTransactionModal,
  ewallet: EwalletTransactionModal,
  other: QuickAddModal,
}
```

## Human-Centric UX Requirements (from humancentred-UIUX skill)

### 6 Pillars
1. **Clarity Over Cleverness** — Labels in plain language, primary action obvious
2. **Progressive Disclosure** — Show what matters now, hide complexity
3. **Visual Hierarchy** — Guide the eye, one focal point per view
4. **Complete State Coverage** — Empty/Loading/Error/Populated/Partial states
5. **Feedback & QoL** — Hover/focus/active/disabled states, transitions, submit feedback
6. **Forgiveness & Affordance** — Obvious clickables, ≥44px targets, inline validation

### Anti-Patterns (NEVER)
- Raw system tokens visible to user
- No Empty/Loading/Error states
- Flat wall of equally-weighted elements
- All fields on one screen (no progressive disclosure)
- Silent actions with no feedback
- Destroy user input on error
- Color alone to convey meaning
- Icon-only buttons for non-obvious actions

## Backend Verification

| Feature | IPC Channel | Handler Exists? | Service Class | DB Schema | Status |
|---------|-------------|-----------------|---------------|-----------|--------|
| Add Transaction | finance:add-transaction | ✅ main.ts | ✅ better-sqlite3 | ✅ finance_transactions | ✅ Real |
| Fetch Crypto Prices | finance:fetch-crypto-prices | ✅ main.ts | ✅ CoinGecko API | ✅ finance_crypto_prices | ✅ Real |
| Category CRUD | finance:get-categories, finance:create-category | ✅ main.ts | ✅ better-sqlite3 | ✅ finance_categories | ✅ Real |
| Wallet Metadata | finance:update-wallet-metadata | ✅ main.ts | ✅ better-sqlite3 | ✅ finance_wallets | ✅ Real |

All backend infrastructure exists. This is a frontend-only redesign.

## Implementation Notes

- All modals use `TransactionModalShell` as base
- Each modal receives: `wallet`, `categories`, `displayCurrency`, `baseCurrency`, `onSubmit`
- `onSubmit` calls `financeAddTransaction` IPC
- Category filtering by type (income/expense/transfer)
- Last-used type/category preferences via `txPrefs.ts` (localStorage)
- Number formatting via `useFormattedAmount` hook (comma separation, locale-aware)
- Currency symbols via `getCurrencyInfo(displayCurrency).symbol`
