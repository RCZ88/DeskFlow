# PROMPT.md — Finance Page: Sticky Header Glitch + Physical Wallet + Per-Wallet Improved Transaction & Display UI

**Target AI:** claude / gpt-4
**Prompt Type:** design (with engineering)
**Detail Level:** 9/10

---

## Raw Request (VERBATIM from user)

> "theres an error bug where when im on hthe crypto page and i try ot scroll down to the bottom, the persistent net worth thing on the top keep glitching back and fourth between the large version and hte small version. fix that. also, i would like you to add a new type of wallet which is physical wallet. and just make sure, for that page, the speciallity or like the desing specification (the ones where its specific for each type of wallet), is that the user must be able to input the like physical numeration physical money. for example 100k there is 6 of them. there should be a good ui that can control this and hsow this properly, and adding a new crypto asset, adding a new transaction should be different for all of the wallets. so make sure that like, the ui for adding a new transaction is improved."

> "can we make sure the prompt hting focus on the how we would implement how different wallets should have different like transaction input, and like each wallet can have a proper display and stuff. and like it needs to be clear, the ui design, and like ux design that should be clear and stuff."

---

## Context

Read `CONTEXT_BUNDLE.md` first — it contains all code context, current implementations, and architecture you need. This prompt assumes you've absorbed it.

**Application:** DeskFlow — an Electron desktop app for personal productivity, tracking, and finance. Dark glassmorphic theme, Tailwind CSS, React + TypeScript, framer-motion for animations.

**Current flow:**
- User clicks a wallet in Accounts tab → `WalletDetailView` renders with type-specific body
- User clicks FAB (+) → `QuickAddModal` opens (same generic form for ALL wallet types)
- `FinanceStickyHeader` sits at top showing net worth, with sentinel-driven scroll shrink

**Current wallet types:** bank, debit_card, credit_card, crypto, cash, ewallet, other — each has a unique detail view body but shares the same generic add-transaction modal.

---

## The Mandate

Design a comprehensive solution for three interconnected changes. You are the **Lead Designer and Engineer** — provide a single, well-reasoned solution with pixel-level UI specifications and step-by-step UX flows for every wallet type.

---

## Task 1 — Bug Fix: Sticky Header Scroll Glitch

**Problem:** The `FinanceStickyHeader` glitches between `h-28` and `h-16` when scrolling in wallet detail views — especially CryptoDetail where charts load asynchronously. The IntersectionObserver sentinel at `top-24` fires repeatedly as dynamic content shifts scroll position.

**Your job:**
1. Diagnose trigger chain (sentinel at `top-24` + chart loading layouts + `transition-[height_650ms]`).
2. Pick the BEST fix approach from: sentinel repositioning, debounce/hysteresis, replace height animation with `transform: scaleY`, or any superior approach.
3. Provide exact code changes with line-level instructions.

**Constraints:** Must NOT break net worth display. No animating height/width. Smooth transitions per Human-Centric UX.

---

## Task 2 — New Wallet Type: Physical Wallet

**Problem:** Users need a `physical` wallet type for tracking cash in their pocket/wallet. Distinct from `cash` (cash on hand / in drawer).

### 2A — Physical Wallet Detail View (the display when viewing this wallet)

Design the in-page detail view that appears when the user clicks on a physical wallet. Must include:

**Header Section:**
- Wallet icon + accent color badge ("Physical")
- Editable wallet name
- Currency display
- Save / Delete buttons

**Denomination Counter (core — the "100k there is 6 of them" feature):**
- A list of bill/coin denominations for the wallet's currency
- Each row: **[denomination label]** | **[-] [count] [+]** | **subtotal**
- Example: `Rp 100,000` | `- [6] +` | `Rp 600,000`
- Running **Total** at the bottom of the counter section
- Empty state: "No cash counted yet. Add bills using the controls below."

**Quick Add Pills:**
- Row of clickable denomination pills for one-tap entry
- Each pill shows the denomination label (e.g. "+Rp 100K", "+Rp 50K")
- Tapping a pill increments that denomination's count by 1

**Wallet Description:**
- Editable text field: "Where is this wallet?" (e.g. "Brown leather bifold", "Back pocket")
- Notes field for any extra info

**Transaction History:**
- Shows recent transactions for this wallet (spend/deposit entries)
- Each row: date | description | type (spent/deposited) | amount | running balance
- Empty state: "No transactions yet. Tap + to add one."

**Visual spec:**
- Accent color: `#F97316` (orange-500) — warm, suggests physical currency, distinct from all existing colors
- Icon: `WalletCards` from lucide-react (literally a physical wallet with cards)
- Layout: vertical stack of GlassSurfaces (tier 2), 12px gaps between sections
- Touch targets: all +/- buttons ≥ 44px, denomination pills ≥ 44px
- Typography: amounts in `tabular-nums`, totals in `text-xl font-bold`

### 2B — Type System Changes (exact)

Add to `finance-types.ts`:
- `FinanceWallet.type` union: add `'physical'`
- New `PhysicalMetadata` type: `{ type: 'physical'; denominations?: CashDenomination[]; description?: string; notes?: string }`
- Add `physical` to the `WalletMetadata` discriminated union

Add to `walletMeta` in BOTH `WalletDetailView.tsx` AND `AccountsTab.tsx`:
```ts
physical: { icon: WalletCards, label: 'Physical', color: '#F97316' }
```

---

## Task 3 — Per-Wallet-Type Tailored Transaction Input UI

**THIS IS THE MAIN FOCUS.** The current `QuickAddModal` is a generic one-size-fits-all form. Every wallet type must get its own tailored add-transaction experience. When the user is viewing a specific wallet, the + button should open a modal designed specifically for THAT wallet type.

**For EACH wallet type below, design:**
1. The **modal layout** — exact sections, field order, Tailwind classes
2. The **unique fields** — what makes this wallet type's transaction form different
3. The **context display** — what wallet-specific data to show alongside the form
4. The **interaction flow** — step-by-step UX from tapping + to confirmation
5. The **visual spec** — accent color usage, type badge, icon

---

### 3.1 — Bank Account Transaction Modal

**Context to show above the form:**
- Current balance (e.g. "Balance: $4,320.50")
- Institution name
- Last 4 digits of account number

**Transaction types:** Income | Expense | Transfer

**Form fields (in order):**
1. Transaction type toggle (Income / Expense / Transfer) — styled pill buttons with icon
2. Amount input — large, prominent, currency symbol prefix, auto-focused
3. Description — text input
4. Category selector — chip grid of categories filtered by selected type
5. Date picker — defaults to today
6. Notes — collapsible textarea behind "+ Add notes" toggle

**Visual:** Bank blue (#3B82F6) accent on type badge. Standard glass modal.

**Interaction flow:**
1. Tap + → modal slides up
2. Type is pre-selected based on last used (or defaults to Expense)
3. Type amount → description → pick category → confirm
4. Submit shows spinner → success checkmark → auto-close after 800ms

---

### 3.2 — Debit Card Transaction Modal

**Context to show:**
- Card network + last 4 (e.g. "Visa • • • • 4247")
- Daily spending limit (if set)
- Today's spending so far vs limit (progress bar)

**Transaction types:** Expense (default, pre-selected) | Income (refund)

**Form fields:**
1. Type toggle — Expense / Income
2. Amount — large input with currency prefix
3. Description — text input
4. Category — chip grid
5. Date

**Visual:** Debit emerald (#10B981) accent. Spending tracker bar at top.

**Interaction flow:**
1. Tap + → pre-set to Expense, amount field auto-focused
2. Spending progress bar shows how much of daily limit is used
3. Fill amount, description, category → submit

---

### 3.3 — Credit Card Transaction Modal

**Context to show (above form, prominent):**
- Credit utilization bar (used / limit with percentage)
- Available credit: "$X,XXX.XX remaining"
- Statement balance + due date (if close)

**Transaction types:** Expense (default) | Payment (credit card payment) | Refund

**Form fields:**
1. Type toggle — Expense / Payment / Refund
2. Amount — large input
3. Description
4. Category — chip grid
5. Installments — optional number input ("Pay in X months")
6. Date

**Visual:** Credit amber (#F59E0B) accent. Utilization bar at top with color coding (green <50%, amber 50-80%, red >80%).

**Interaction flow:**
1. Tap + → see credit context (how much available, utilization)
2. Pre-set to Expense. Enter amount.
3. Optionally set installment count
4. Submit → card balance updates

---

### 3.4 — Crypto Wallet Transaction Modal

**Context to show:**
- Which asset (coin selector dropdown)
- Current live price (e.g. "1 BTC = $67,420.00")
- Quantity held (e.g. "You hold: 0.5 BTC")

**Transaction types:** Buy | Sell | Transfer

**Form fields:**
1. Asset selector — dropdown of tracked assets for this wallet
2. Transaction type — Buy / Sell / Transfer
3. Quantity input — "How many coins?"
4. Price per coin — auto-populated from live price, but editable
5. **Auto-calculated total: Quantity × Price = Total** (shown as read-only, updates live)
6. Fee (optional) — gas/network fee
7. Date

**Smart calculation:**
```
[Quantity] [BTC]  ×  [Price] [$67,420.00]  =  Total: $33,710.00
   0.5                                          Fee: +$2.50
                                                Net: $33,712.50
```

**Visual:** Crypto violet (#8B5CF6) accent. Price shown in monospace with green/red 24h change indicator. Auto-calc section has a distinct background tint.

**Empty state (no assets):** "Add an asset first" with button to go to asset setup.

**Interaction flow:**
1. Tap + → asset selector pre-filled with first tracked asset
2. Choose Buy/Sell/Transfer
3. Enter quantity → total auto-calculates live
4. Adjust price if needed, add fee
5. Submit → wallet balance updates

---

### 3.5 — Physical Wallet Transaction Modal (NEW)

**Context to show:**
- Current wallet total (e.g. "Wallet total: Rp 2,450,000")
- Denomination breakdown summary (compact, 2-line)
- Quick description of wallet (e.g. "Brown leather bifold")

**Transaction types:** Spend (money out) | Deposit (money in)

**SPEND flow (the key innovation):**

When user selects "Spend", show a **denomination picker** instead of a plain amount field:

```
┌─────────────────────────────────────────┐
│  SPEND FROM WALLET                      │
│                                         │
│  How much did you spend?                │
│  ┌─────────────────────────────────┐    │
│  │ Rp [270,000]                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Which bills did you use?               │
│  ┌─────────────────────────────────┐    │
│  │ Rp 100K  [-] [2] [+]  Rp 200K  │    │
│  │ Rp 50K   [-] [1] [+]  Rp 50K   │    │
│  │ Rp 20K   [-] [1] [+]  Rp 20K   │    │
│  │ Rp 10K   [-] [0] [+]  Rp 0     │    │
│  │ Total selected: Rp 270,000     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Auto-fill]  [Reset]                   │
└─────────────────────────────────────────┘
```

- User types the total amount spent (Rp 270,000)
- "Auto-fill" button: system calculates optimal bill combination (2×100K + 1×50K + 1×20K) using a greedy algorithm from largest to smallest denomination
- User can manually adjust each denomination count
- Total selected must ≥ amount spent (change is kept in wallet)
- "Reset" clears the denomination selections

**DEPOSIT flow (simpler):**

When user selects "Deposit", show the same denomination counter but in reverse — user adds bills they put back in:

```
┌─────────────────────────────────────────┐
│  DEPOSIT TO WALLET                      │
│                                         │
│  Add bills to your wallet:              │
│  ┌─────────────────────────────────┐    │
│  │ Rp 100K  [-] [3] [+]  Rp 300K  │    │
│  │ Rp 50K   [-] [0] [+]  Rp 0     │    │
│  │ Total to add: Rp 300,000       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Description: [ATM withdrawal]          │
└─────────────────────────────────────────┘
```

**Common fields (both spend and deposit):**
- Description — what was this transaction for?
- Date — defaults to today
- Category — optional (chip grid filtered to expense/income)

**Visual:** Physical orange (#F97316) accent. Denomination counter in a bordered section with subtle background tint. Auto-fill button highlighted.

**Interaction flow (Spend):**
1. Tap + → pre-set to "Spend"
2. Type total amount spent or use denomination picker directly
3. Tap "Auto-fill" to let system calculate optimal bills
4. Adjust denominations if needed
5. Enter description
6. Submit → denominations are subtracted from wallet state

---

### 3.6 — Cash Detail Transaction Modal

**Same pattern as Physical** but:
- Context shows "Cash on hand" instead of "Wallet"
- Types: Withdraw | Deposit
- No "wallet description" display
- Pink (#EC4899) accent

---

### 3.7 — E-Wallet Transaction Modal

**Context to show:**
- Platform name (e.g. "GoPay", "OVO")
- Linked payment methods list
- Daily limit (if set)

**Transaction types:** Expense | Top-up | Transfer

**Form fields:**
1. Type toggle — Expense / Top-up / Transfer
2. Amount
3. Description
4. Category
5. Date

**Visual:** Cyan (#06B6D4) accent. Linked cards shown as small badges.

---

### 3.8 — Routing Logic

How `FinancePage.tsx` decides which modal to show:

```
When user taps + (FAB):
  if selectedWalletId (user is viewing a wallet detail):
    → open wallet-type-specific modal based on wallet.type:
        'bank'       → BankTransactionModal
        'debit_card' → DebitTransactionModal
        'credit_card' → CreditTransactionModal
        'crypto'     → CryptoTransactionModal
        'physical'   → PhysicalTransactionModal
        'cash'       → CashTransactionModal
        'ewallet'    → EwalletTransactionModal
        'other'      → QuickAddModal (generic)
  else (user is on overview/accounts/categories tab):
    → open QuickAddModal (existing generic form)
```

---

## Design Rules (Apply to ALL wallet type modals)

These rules come from the project's design skills. Violating them = automatic rejection.

### From Frontend Design Skill:
- NO `box-shadow` — use border brightness and glass layers for depth
- NO animating `width`, `height`, `top`, `left` — use `transform` and `opacity` only
- NO `rounded-2xl` or `rounded-3xl` — max is `rounded-xl` (12px)
- NO spring physics (`type: 'spring'`) — use cubic-bezier easing (`[0.16, 1, 0.3, 1]`)
- NO more than 2 font families per view
- Backgrounds: `zinc-950` (base), `zinc-900` (elevated), `zinc-900/50` (glass)
- Text: `white` (primary), `zinc-400` (secondary), `zinc-600` (disabled)

### From Human-Centric UX Skill:
- Every data element MUST have Empty / Loading / Error states
- Primary action must be obvious within 1 second
- Touch targets ≥ 44px on all interactive elements
- State changes animate 150-300ms (no snapping)
- Destructive actions need confirmation or undo
- No raw system tokens or enum values visible to user
- Progressive disclosure: hide advanced fields behind toggles

### From UI-UX-Pro-Max Skill:
- Use the accent color consistently per wallet type
- Focus rings: `focus-visible:ring-2 ring-{accent}/50 ring-offset-2 ring-offset-zinc-950`
- Modal overlay: `bg-black/70 backdrop-blur-sm`
- Modal container: `bg-zinc-900/95 backdrop-blur-xl border-zinc-700/50 rounded-xl`

---

## Requirement Checklist

### Engineering
- [ ] Root cause + fix for sticky header glitch
- [ ] New types/interfaces for `physical` wallet (TypeScript)
- [ ] Where `physical` must be added to existing maps/unions (exact files + lines)
- [ ] Per-wallet-type modal routing logic in FinancePage.tsx

### Design — Physical Wallet Detail View
- [ ] Full component layout (header, denomination counter, quick add, description, transactions)
- [ ] Exact Tailwind classes for every element
- [ ] Denomination counter row specification (label | - | count | + | subtotal)
- [ ] Auto-calculate total display
- [ ] Empty / Loading / Error states for every data section

### Design — Per-Wallet Transaction Modals (7 types)
For EACH of the 7 wallet types, provide:
- [ ] Modal header: accent color icon + type badge + title
- [ ] Context display: what wallet-specific info is shown above the form
- [ ] Field layout: exact order, exact Tailwind classes, exact input types
- [ ] Smart features: auto-calc (crypto), auto-fill (physical), utilization bar (credit)
- [ ] Loading state: button spinner
- [ ] Success state: checkmark animation
- [ ] Error state: inline error message with retry
- [ ] Empty state: for crypto with no assets

### UX
- [ ] Step-by-step interaction flow for each of the 7 wallet types
- [ ] Spend-from-physical-wallet flow (total → auto-fill → adjust → confirm)
- [ ] Crypto buy/sell flow (asset → quantity → price → total auto-calc)
- [ ] Confirmation/undo for destructive actions
- [ ] Keyboard accessibility (Tab order for every form)
- [ ] Auto-fill algorithm for physical wallet (greedy largest-first bill selection)
- [ ] Quantity × Price auto-calculation for crypto

### Constraints
- [ ] Frontend-only — no new IPC endpoints needed
- [ ] Must NOT break any existing wallet type
- [ ] No box-shadow, no height animations, no spring physics
- [ ] Use existing GlassSurface, framer-motion, Tailwind patterns
- [ ] Page accent `#10b981` for generic actions, wallet accent for wallet-specific actions

---

## Output Format

Structure as `RESULT.md`:

1. **Fix 1 — Sticky Header Glitch:** Root cause + exact code fix
2. **Feature 2 — Physical Wallet Type:** Types, walletMeta changes, detail view component spec (full visual + UX)
3. **Feature 3 — Per-Wallet Transaction Modals:** For each of the 7 wallet types:
   - Modal spec (layout, fields, context, visual)
   - UX flow (step-by-step)
   - Smart feature logic (auto-calc, auto-fill algorithms)
4. **Routing Logic:** How FinancePage selects which modal to show
5. **Implementation Order:** Dependency graph — what to build first
6. **Visual Appendix:** Accent colors, icons, animation tokens per wallet type
