# Prompt — People / Debt Tracking Feature

## Raw Request

"i want that feature where we can select the 'account' or like the person that borrows, so that it automatically cancels out the remaining stuff that has not yet been paid. and it should also need a feature where its manually select which transaction of borrowing money does it cover. and it should subtract the remaining balance to see the amount of balance that person has on our account. and i do think this requires another separate subpage for this feature. just like people borrowing stuff and like the way that we can add people as accounts and have their individual balance tracked."

## Problem Statement

The DeskFlow finance app has a partially-implemented "Follow-Through" system for tracking money lent to others. Currently:

1. **Backend is completely stubbed** — 6 IPC handlers have type stubs but NO implementation. No `finance_ft_persons` table exists.
2. **Type gaps** — `FinanceTransaction` type is missing `on_behalf_of`, `on_behalf_of_label`, `ft_person_id` fields that the runtime code accesses via `(tx as any)`.
3. **Frontend shell exists** — Components reference non-existent IPC endpoints (FTPersonCombobox, SpendingSplitCard, RepaymentModal).
4. **No bulk payment** — Current RepaymentModal handles one transaction at a time. No way to apply a single payment across multiple debts.
5. **No person management** — No UI to create/edit/delete persons, view their balance, or see all their transactions.

## Context Bundle

Read `agent/docs/finance-people-tracking/CONTEXT_BUNDLE.md` for complete code context. It includes:
- Full DB schema (CREATE TABLE, ALTERs)
- All TypeScript types with gap annotations
- Full source of receivables.ts, netWorth.ts, FTPersonCombobox.tsx, SpendingSplitCard.tsx
- Current IPC handlers and preload bridges (showing what's missing)
- Design tokens and architecture notes

## Engineering Task

Design the complete solution including:

### Backend Implementation
1. **DB Migration** — `finance_ft_persons` table schema with proper columns
2. **6 IPC Handlers** — Full implementation with SQL queries, error handling, audit logging:
   - `finance:get-ft-persons` — list all persons with transaction counts and balances
   - `finance:get-ft-person-balances` — per-person balance calculation
   - `finance:create-ft-person` — create person with duplicate check
   - `finance:update-ft-person` — partial update
   - `finance:delete-ft-person` — soft delete (null out ft_person_id on transactions)
   - `finance:record-ft-repayment` — single repayment
3. **New handler: `finance:bulk-repay`** — Apply payment to multiple selected transactions
4. **New handler: `finance:get-ft-person-detail`** — All transactions for a person with repayment status
5. **Update `finance:create-transaction`** — Persist `on_behalf_of`, `on_behalf_of_label`, `ft_person_id`, `tags` fields
6. **Preload bridges** — All new IPC channels

### Frontend Implementation
1. **People subpage** — New tab in FinancePage with person list, balance cards, search
2. **PersonDetailModal** — Full transaction list per person, running balance, payment button
3. **PaymentAllocationModal** — Multi-transaction payment with checkbox selection, auto-allocate, manual select
4. **Update `FinanceTransaction` type** — Add missing fields
5. **Integration** — Wire into FinancePage tab system

### Data Processing Pipeline
1. **Balance calculation** — Per-person: total_owed = sum of FT expenses, total_repaid = sum of repayment incomes, current_balance = total_owed - total_repaid
2. **Payment allocation algorithm** — Given amount + selected tx_ids: allocate oldest-first, track partial repayments, handle overpayments
3. **Repayment status** — Per-expense: check tags for `ft_repaid:{txId}`, compute remaining amount

## Design Task

Design high-fidelity visual specs following DeskFlow's design system:

### Component Specs
1. **People list** — 2-column grid of person cards with avatar, name, balance badge, transaction count, "View" button
2. **Person detail modal** — 3-section layout: Balance KPI row, Payment button, Transaction list (unpaid/repaid/payments)
3. **Payment allocation modal** — Amount input, auto-allocate toggle, checkbox list of unpaid transactions, allocation summary, submit
4. **Empty states** — No people yet, no transactions for person, all settled
5. **Loading/skeleton states** — Pulse placeholders matching content shape
6. **Error states** — Failed to load, failed to save

### Visual Style
- Cards: `rounded-xl p-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60`
- Person avatar: `w-10 h-10 rounded-full bg-amber-500/15` with initial letter
- Balance badge: `text-sm font-semibold tabular-nums` with amber (owed) or emerald (settled)
- Buttons: `rounded-xl py-2.5 text-sm font-medium` with emerald for primary actions
- Checkbox: custom amber checkbox with `rounded border-2` styling
- Progress bars: `h-1.5 rounded-full bg-zinc-800` with emerald/amber fill

## UX Task

Design the complete interaction flow:

1. **Navigation** — Finance → People tab → Person list
2. **Add Person** — "Add Person" button → name/email/phone form → create
3. **View Person** — Click person card → modal with transactions + balance
4. **Record Payment** — Click "Record Payment" → allocation modal
5. **Auto-allocate** — Enter amount → system selects oldest unpaid transactions
6. **Manual select** — Toggle off auto-allocate → check/uncheck individual transactions
7. **Confirm** → income transaction created, balances updated, modal closes
8. **Edge cases** — Overpayment (credit for future), partial payment (progress bar), all settled

## Constraints

- Must work with existing `finance_transactions` table (add columns via ALTER, don't recreate)
- Must follow DeskFlow IPC pattern: `ipcMain.handle()` in main.ts, bridge in preload.ts
- Must use L1 (Composed) motion — calm, professional, no ambient effects
- Must have empty/loading/error states per Human-Centric UX skill
- Must follow DeskFlow design tokens (zinc-900 glass, rounded-xl, emerald/amber accents)
- New components go in `src/components/finance/`
- New tab key `'people'` added to `FinanceTabKey` type

## Frontend Design Skills (MANDATORY — all must be applied)

1. **Frontend Design** — DeskFlow component patterns, tokens, spacing, typography, glass cards
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback
3. **Impeccable** — 7 design dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns
4. **Motion — Bring the UI Alive** — L1 Composed level for finance, motion taxonomy, recipes
5. **UI UX Pro Max** — financial app design rules
6. **Design Taste System** — anti-repetition rules
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist

## MCP Inventory (query before designing)

| Component | Source | Use for |
|-----------|--------|---------|
| card | shadcn | Person cards, balance cards |
| dialog | shadcn | Person detail modal, payment modal |
| checkbox | shadcn | Transaction selection checkboxes |
| input | shadcn | Amount, search, name inputs |
| select | shadcn | Wallet/account selectors |
| badge | shadcn | Balance badges, status indicators |
| Animated Beam | Magic UI | Connecting lines between person and transactions |
| Number Ticker | Magic UI | Animated balance count-up |
| Handshake | Lucide | FT/person icon |
| Users | Lucide | People list icon |
| CircleCheck | Lucide | Repaid status |
| Clock | Lucide | Unpaid status |
| Wallet | Lucide | Wallet selector |
| ArrowUpRight | Lucide | Expense indicator |
| ArrowDownLeft | Lucide | Payment/receipt indicator |

## Anti-Slop Checklist

After designing, verify:
1. NOT default Inter/Geist-only — check font pairing
2. NOT purple/indigo gradient-on-everything — use emerald/amber accents
3. radius + padding from DeskFlow scale (rounded-xl, p-5)
4. No hero clichés
5. Real micro-interactions on key actions
6. Empty/loading/error states exist
7. All icons from lucide-react
8. Focus rings use emerald accent
9. Touch targets >= 44px
10. Dark mode only
