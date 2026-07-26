# CONTEXT_BUNDLE.md — Finance Page: Sticky Header Glitch + Physical Wallet + Improved Transaction UI

> Self-contained code context for the target AI. You should be able to design the complete solution using only this file.

---

## 1. BUG: Sticky Header Glitch

### Current Implementation: `FinanceStickyHeader.tsx` (115 lines)

```tsx
// src/components/finance/FinanceStickyHeader.tsx
export function FinanceStickyHeader({ isLocked, netWorth, displayCurrency, onToggleLock, trend, sparklineData, monthlyTrends, hasPassword }: FinanceStickyHeaderProps) {
  const { showNumbers, setShowNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // ...
  return (
    <>
      {/* SENTINEL: positioned absolute, top-24 — this is what triggers the glitch */}
      <div ref={sentinelRef} className="absolute top-24 left-0 right-0 h-px pointer-events-none" />

      <GlassSurface tier={3} className={`sticky top-0 z-[15] ${
        scrolled ? 'h-16' : 'h-28'
      } flex items-center px-6 transition-[height_650ms] ease-[0.22,1,0.36,1]`}>
        {/* net worth display */}
      </GlassSurface>
    </>
  );
}
```

**Root Cause:** The sentinel `<div>` is at `top-24`. When user opens a WalletDetailView (especially CryptoDetail with charts), the page content changes dynamically (chart renders, portfolio value updates, price loads asynchronously). These content changes cause scroll position shifts that make the sentinel repeatedly cross the viewport threshold, triggering rapid `scrolled` state toggles → the header transitions between `h-28` and `h-16` repeatedly, creating visible glitch.

The issue reproduces most severely on CryptoDetail because:
1. Charts auto-load after a delay (loading → populated state changes layout height)
2. Price data arrives asynchronously causing re-renders
3. The wallet detail view replaces the tab content entirely (vertical content shift)

**Also violates frontend-design anti-pattern:** `transition-[height_650ms]` — animating height is a layout-triggering property that causes jank in Electron. Frontend-design skill explicitly says: "NEVER animate width, height, top, left — these trigger layout recalculation and jank."

---

## 2. Wallet System Architecture

### Wallet Types (current — `finance-types.ts` line 21)
```ts
export interface FinanceWallet {
  id: number;
  account_id: number;
  name: string;
  type: 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'other';
  provider: string | null;
  last_four: string | null;
  balance: number;
  currency: string;
  is_archived: number;
  metadata?: string; // JSON string of WalletMetadata
}
```

### Wallet Metadata (discriminated union — `finance-types.ts` lines 37-44)
```ts
export type WalletMetadata =
  | { type: 'bank'; bank_name?: string; account_number?: string; swift?: string; iban?: string; notes?: string }
  | { type: 'debit_card'; card_network?: string; issuer?: string; daily_limit?: number; notes?: string }
  | { type: 'credit_card'; card_network?: string; issuer?: string; credit_limit?: number; apr?: number; notes?: string }
  | { type: 'crypto'; coin_id?: string; symbol?: string; blockchain?: string; wallet_address?: string; acquisition_price?: number; notes?: string }
  | { type: 'cash'; denominations?: CashDenomination[]; notes?: string }
  | { type: 'ewallet'; platform?: string; phone_or_email?: string; daily_limit?: number; notes?: string }
  | { type: 'other'; notes?: string };
```

### CashDenomination type
```ts
export interface CashDenomination {
  value: number;
  label: string;
  count: number;
}
```

### Wallet Meta (icon/color mapping — used in both `WalletDetailView.tsx` and `AccountsTab.tsx`)
```ts
const walletMeta: Record<string, { icon: any; label: string; color: string }> = {
  bank: { icon: Landmark, label: 'Bank', color: '#3B82F6' },
  debit_card: { icon: CreditCard, label: 'Debit Card', color: '#10B981' },
  credit_card: { icon: CreditCard, label: 'Credit Card', color: '#F59E0B' },
  crypto: { icon: Wallet, label: 'Crypto', color: '#8B5CF6' },
  cash: { icon: PiggyBank, label: 'Cash', color: '#EC4899' },
  ewallet: { icon: Banknote, label: 'E-Wallet', color: '#06B6D4' },
  other: { icon: Wallet, label: 'Other', color: '#6B7280' },
};
```

### Currency denominations (used by CashDetail — `WalletDetailView.tsx` lines 39-67)
```ts
const CURRENCY_DENOMINATIONS: Record<string, { value: number; label: string }[]> = {
  USD: [{ value: 100, label: '$100' }, { value: 50, label: '$50' }, /* ... */],
  EUR: [/* ... */], GBP: [/* ... */], IDR: [/* ... */], JPY: [/* ... */],
};
```

### Wallet Detail View Body (renderDetailBody — `WalletDetailView.tsx` line 889)
```tsx
const renderDetailBody = () => {
  switch (wallet.type) {
    case 'bank': return <BankDetail ... />;
    case 'debit_card': return <DebitCardDetail ... />;
    case 'credit_card': return <CreditCardDetail ... />;
    case 'crypto': return <CryptoDetail ... />;
    case 'cash': return <CashDetail ... />;
    case 'ewallet': return <EwalletDetail ... />;
    default: return <OtherDetail ... />;
  }
};
```

---

## 3. Transaction Add Flow

### QuickAddModal (`QuickAddModal.tsx` — 309 lines)
- Generic one-size-fits-all modal opened via FAB (+ button, bottom-right)
- Fields: type (income/expense/transfer), amount, description, account, wallet, date, category
- Always the same layout regardless of wallet type
- Opened from FinancePage.tsx line 711:
```tsx
{showQuickAdd && (
  <QuickAddModal open={showQuickAdd} onClose={() => setShowQuickAdd(false)}
    accounts={accounts} categories={categories} wallets={wallets}
    displayCurrency={displayCurrency} baseCurrency={baseCurrency}
    onSave={handleAddTransaction} />
)}
```

### Current IPC handler: `finance:create-wallet` (main.ts line ~18812)
Accepts `type` parameter which is one of the 7 wallet types. Metadata is stored as a JSON string in the `metadata` column.

---

## 4. CashDetail vs Physical Wallet Distinction

**Cash** (`cash`): Currently implemented as a denomination counter — counts bills and coins. This represents "cash on hand" — money sitting in a drawer, safe, or envelope.

**Physical Wallet** (`physical` — NEW): Represents the actual wallet in your pocket. Key differences from `cash`:
- A physical wallet has a **capacity** (how many bills can fit)
- You can **pull money out** (spend) and **put money in** (deposit)
- Each denomination entry tracks how many bills exist in the wallet
- When you spend $47, the UI should help you calculate which bills to use
- The wallet has a physical location/description (e.g. "Brown leather bifold")

The user's request specifically mentions `100k there is 6 of them` — meaning they want to specify: "I have 6 bills of 100,000 IDR" with good UI controls (+/- buttons, quick add, visual representation).

---

## 5. Relevant IPC Endpoints

| Channel | Handler Location | Purpose |
|---------|-----------------|---------|
| `finance:create-wallet` | main.ts ~18812 | Creates a new wallet with type, metadata |
| `finance:update-wallet-metadata` | main.ts | Updates wallet metadata JSON |
| `finance:update-wallet` | main.ts | Updates wallet name, type, balance, etc. |
| `finance:get-wallet` | main.ts | Fetches single wallet by ID (parses metadata JSON) |
| `finance:get-wallets` | main.ts | Fetches all wallets for an account |
| `finance:add-transaction` | main.ts | Creates a new transaction |

All exposed via `src/preload.ts` as `window.deskflowAPI.finance*`.

---

## 6. Design Tokens Used

```
Background: zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
Primary Page Accent: emerald-500 (--page-accent: #10b981)
Text: white (primary), zinc-300/400 (secondary), zinc-500/600 (tertiary)
Border: zinc-700/50, zinc-800/50
Rounded: rounded-xl (12px), rounded-lg (8px) — max is rounded-xl per frontend-design skill

Per-wallet-type accent colors:
  bank: #3B82F6 (blue)
  debit_card: #10B981 (emerald)
  credit_card: #F59E0B (amber)
  crypto: #8B5CF6 (violet)
  cash: #EC4899 (pink)
  ewallet: #06B6D4 (cyan)
  other: #6B7280 (zinc)
```

---

## 7. CashDetail Component Reference (`WalletDetailView.tsx` lines 674-748)

The existing `CashDetail` provides the denomination counter pattern (with +/- buttons, totals, quick add) that the new `PhysicalDetail` should extend/reuse:

```tsx
function CashDetail({ metadata, onChange, onDenominationsChange, displayCurrency }) {
  // Maps denominations from metadata or generates defaults from CURRENCY_DENOMINATIONS
  // Per-denomination row: label | [-] count [+] | subtotal
  // Quick Add section: clickable denomination pills
  // Total section at bottom
  
  const denoms: CashDenomination[] = useMemo(() => {
    if (Array.isArray(metadata.denominations) && metadata.denominations.length > 0)
      return metadata.denominations;
    return getDenominations(displayCurrency).map(d => ({ value: d.value, label: d.label, count: 0 }));
  }, [metadata.denominations, displayCurrency]);
  
  // UI: denomination rows with -/+ buttons, total display, quick-add pill buttons
}
```

---

## 8. Files That Need Changes

| File | What Changes |
|------|-------------|
| `src/components/finance/FinanceStickyHeader.tsx` | Fix sticky header glitch (sentinel position or observer debounce) |
| `src/components/finance/finance-types.ts` | Add `'physical'` to wallet type union, add PhysicalMetadata type |
| `src/components/finance/WalletDetailView.tsx` | Add `PhysicalDetail` component, add `walletMeta` entry, wire in renderDetailBody |
| `src/components/finance/AccountsTab.tsx` | Add `physical` to walletMeta, add to CreateWalletModal type grid |
| `src/pages/FinancePage.tsx` | Wire per-wallet-type transaction add UI; pass wallet context to QuickAddModal or replace |
| `src/components/finance/QuickAddModal.tsx` | Optionally extend for per-wallet-type tailored UI |
| `src/main.ts` (optional) | If new metadata fields need DB schema changes |
