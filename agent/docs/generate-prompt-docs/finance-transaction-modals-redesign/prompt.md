# PROMPT.md — Per-Wallet Transaction Modals Comprehensive Redesign

## Raw Request

> "can you fix the physical wallet too? make sure the logic for all wallets work properly and adds up perfectly to the total balance, and has its own page customized properly with tverything"
> 
> "how is it that the ADD TRANSACTION POPUP IS STILL SO BAD LOOKING AND LIKE UNCOMPLET??? ITS NOT DIFFERENT FOR EVERY DIFFERNET WALLET???? HOW IS IT HTAT THE DESIGN THAT IS NOT IMPLEMENTED??? WE NEED TO USE THE GENRATE PROMPT TO MAKE THE DESING ON HOW WE CAN MAKE EACH WALLET HAVE DIFFERNET UI KNOWING THAT THEY HAVE DIFFERENT TPURPOSE ANDL IKE DIFFERENT SPECIALITIES BETWEEN ONE ANOTHER. check the @agent/docs/finance-physical-wallet-revamp/RESULT.md i think its mentioendthere, but some are yet ot be implemneted. maek sure tha tthe crypto, we can add a trasnaction properly. makesrurewe balance completeness of features and accurateness on how to add a transaction and actualyl htesimplicity and understanding of how to use the ui as part of the UX. @agent/skills/humancentred-UIUX/SKILL.md"

## Problem Statement

The 7 wallet-type transaction modals are incomplete, generic, and lack wallet-specific UX flows. Each wallet type has a different purpose and should have a specialized UI that reflects its unique characteristics:

- **Bank** — Income/Expense/Transfer with institution context
- **Debit Card** — Expense-focused with daily limit tracking
- **Credit Card** — Utilization-aware with installments support
- **Crypto** — Asset-aware with live price auto-calc
- **Physical** — Denomination picker with auto-fill algorithm
- **Cash** — Simple denomination counter
- **E-Wallet** — Platform-specific with linked payment methods

Current state: All modals share the same generic layout, missing context bands, incomplete field layouts, no progressive disclosure, and lack the specialized UX flows defined in the RESULT.md spec.

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` first — it contains:
- All current modal implementations (file paths + line counts)
- Type definitions (FinanceWallet, WalletType, walletMeta)
- IPC endpoints (finance:add-transaction, finance:fetch-crypto-prices)
- Design tokens (DeskFlow colors, spacing, animation curves)
- Backend verification table (all IPC handlers exist)
- Human-Centric UX requirements (6 pillars + anti-patterns)
- Current modal issues (10 specific gaps identified)

## The Mandate

**Design and implement comprehensive redesigns of all 7 wallet-type transaction modals.** Each modal must be a complete, polished, wallet-specific UX flow that leverages the unique characteristics of its wallet type. This is NOT a cosmetic update — it is a complete rethinking of how each wallet type should handle transactions.

## Engineering Tasks

### 1. Data Processing Pipeline
- **Balance computation** — Each modal must compute and display the correct wallet balance in the context band
- **Auto-calculation** — Crypto: qty × price = total, total ± fee = net (live recomputation on every keystroke)
- **Denomination math** — Physical/Cash: sum(value × count) for all denominations, auto-fill algorithm (greedy largest-first)
- **Utilization calculation** — Credit: (current balance / credit limit) × 100, color-coded thresholds
- **Daily limit tracking** — Debit: today's spending vs daily limit, progress bar with color transitions

### 2. Context Band Design
Each modal must have a wallet-specific context band at the top showing:
- **Bank:** Balance · Institution name · Last 4 digits
- **Debit:** Card network · Last 4 · Daily limit progress bar
- **Credit:** Utilization bar (color-coded) · Available credit · Statement balance + due date
- **Crypto:** Asset selector · Live price (monospace, 24h change indicator) · "You hold: X BTC"
- **Physical:** "Wallet total: Rp X" · Compact denomination summary · Wallet description
- **Cash:** "Cash on hand: Rp X" · Quick denomination summary
- **E-Wallet:** Platform name · Linked payment method badges · Daily limit if set

### 3. Field Layout & Progressive Disclosure
Each modal must hide secondary complexity behind progressive disclosure:
- Primary fields always visible (amount, description, category, date)
- Secondary fields behind "+ Advanced" toggle (notes, reference numbers, installments, etc.)
- Type-specific fields shown based on selected transaction type
- Auto-focus on amount field when modal opens

### 4. Submit Lifecycle
All modals must follow the same submit feedback pattern:
1. Primary button shows accent color → on click shows spinner
2. Spinner → success checkmark (scale/opacity pop)
3. Auto-close after 800ms with "Transaction added" confirmation
4. Error: inline message above button with Retry, fields stay filled
5. Form clears after successful submit for rapid entry

## Design Tasks

### High-Fidelity Visual Specs

**Shared Modal Shell:**
- Overlay: `fixed inset-0 bg-black/70 backdrop-blur-sm` + fade 180ms
- Container: `bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl` slide-up 240ms
- Header: accent icon chip + type badge + title + close X
- Footer: Cancel + Submit buttons with proper disabled states
- Max width: `max-w-md`, padding: `p-5`

**Context Band:**
- `px-3 py-2 mb-2 rounded-lg` with accent-tinted background (`bg-{accent}/5`) and border (`border-{accent}/10`)
- Text: `text-[11px]` for labels, `text-xs` for values
- Progress bars: `h-1.5 rounded-full bg-zinc-800` with accent fill
- Color thresholds: green (<50%), amber (50-80%), red (>80%)

**Type Toggles:**
- Pill buttons: `flex-1 py-2 rounded-lg text-xs font-medium`
- Selected: `bg-{accent}/15 text-{accent} border border-{accent}/30`
- Idle: `bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200`

**Amount Input:**
- `text-xl font-semibold tabular-nums` with currency symbol prefix
- Auto-focused, `inputMode="decimal"`
- Focus ring: `focus-within:ring-2 ring-{accent}/50`

**Category Selection:**
- Chip grid with accent-colored selected state
- "+ Create new" option for adding categories inline
- Filtered by transaction type (income/expense/transfer)

**Denomination Picker (Physical/Cash):**
- Each row: label + stepper [-]/[+] + subtotal
- Steppers: `h-11 w-11 rounded-lg` (≥44px touch targets)
- Quick-add pills: `rounded-full bg-{accent}/10 text-{accent} border border-{accent}/20`
- Auto-fill button: greedy largest-first algorithm
- Total row: `text-xl font-bold` with border-t separator

**Auto-Calc Panel (Crypto):**
- Tinted background: `bg-{accent}/8 rounded-lg p-3`
- Live computation: Qty × Price = Total, Fee ±, Net
- Monospace numbers for alignment
- Updates on every keystroke

### Interaction Flow

**Standard Flow (all modals):**
1. Tap + → modal opens with type pre-set to last-used (default: Expense)
2. Amount field auto-focused → user enters amount
3. Description → Category → Date (progressive, tab-order friendly)
4. Advanced toggle (if needed) → Notes/reference/installments
5. Submit → Spinner → Check → Auto-close → Form cleared for next entry

**Crypto-Specific Flow:**
1. Asset pre-filled with first tracked → Buy/Sell/Transfer toggle
2. Quantity entered → Price auto-filled from live API → Total auto-calcs
3. Adjust price/fee if needed → Net updates live
4. Submit → Holdings + balance update

**Physical-Specific Flow:**
1. Spend/Deposit toggle → Amount OR use denomination picker directly
2. Auto-fill computes bill counts from available denominations
3. Adjust counts manually if needed → Total selected must ≥ amount spent
4. Change kept displayed as "Change kept: Rp X"
5. Submit → Denominations subtracted, change re-added

## UX Tasks

### Human-Centric Requirements (from humancentred-UIUX skill)

**State Coverage (every modal):**
- Empty: Friendly message + CTA (e.g., "No assets tracked — add an asset first")
- Loading: Skeleton placeholders for async data (crypto prices, categories)
- Error: Plain-language cause + Retry action
- Populated: Normal state with all fields functional
- Partial: Truncated text, paginated lists, large number formatting

**Feedback States:**
- Every interactive element: hover, focus, active, disabled
- State changes: 150-300ms transitions (opacity/transform only)
- Submit: Button → Loading spinner → Success check → Auto-close
- Error: Inline message + Retry, fields preserved
- Destructive actions: Confirmation before delete

**Accessibility:**
- Focus rings: `focus-visible:ring-2 ring-{accent}/50 ring-offset-2 ring-offset-zinc-950`
- Keyboard navigation: Tab order matches visual flow
- Touch targets: ≥44px for all interactive elements
- Color + icon/shape for meaning (never color alone)
- Plain-language labels, placeholders, errors

**Progressive Disclosure:**
- Primary action obvious within 1 second
- Secondary fields hidden behind "+ Advanced" toggle
- Default to common case, make rare case reachable
- One primary question per screen

## Constraints

1. **Must work with existing IPC** — `finance:add-transaction`, `finance:fetch-crypto-prices`
2. **No new backend required** — all handlers exist and return real data
3. **Must use TransactionModalShell** — shared overlay/container/header/footer
4. **Must follow DeskFlow design tokens** — colors, spacing, animation curves
5. **Must be TypeScript React** — no JavaScript, proper typing
6. **Must preserve existing patterns** — `useFormattedAmount`, `txPrefs`, `CategoryChipGrid`
7. **No box-shadow, no spring physics, max rounded-xl**
8. **Must pass Human-Centric UX checklist** — all 12 items from SKILL.md

## Output Format

Provide complete, production-ready React TypeScript code for:

1. **TransactionModalShell.tsx** — Updated shell with proper submit lifecycle
2. **BankTransactionModal.tsx** — Full redesign with context band, transfer flow
3. **DebitTransactionModal.tsx** — Daily limit progress bar, expense focus
4. **CreditTransactionModal.tsx** — Utilization bar, installments, payment flow
5. **CryptoTransactionModal.tsx** — Asset selector, live price auto-calc, fee handling
6. **PhysicalTransactionModal.tsx** — Denomination picker, auto-fill, change calculation
7. **CashTransactionModal.tsx** — Simple denomination counter, quick-add
8. **EwalletTransactionModal.tsx** — Platform context, linked methods, top-up flow
9. **DenominationPicker.tsx** — Reusable component with auto-fill algorithm
10. **FinancePage.tsx** — Updated routing logic if needed

Each file should be complete and self-contained. Include all imports, types, and helper functions. Do not use placeholder comments like `// ... rest of code` — provide full implementations.

## Definition of Done

- All 7 modals have wallet-specific context bands with correct data
- All modals follow the submit lifecycle (spinner → check → auto-close)
- Crypto modal has live auto-calculation (qty × price = total ± fee = net)
- Physical/Cash modals have denomination pickers with auto-fill algorithm
- Credit modal has utilization bar with color-coded thresholds
- Debit modal has daily limit progress bar
- All modals have Empty/Loading/Error states
- All interactive elements have hover/focus/active/disabled states
- Touch targets ≥44px, focus rings visible, keyboard navigation works
- No raw system tokens visible to user
- Progressive disclosure hides secondary complexity
- Build passes without errors
- No existing functionality regresses
