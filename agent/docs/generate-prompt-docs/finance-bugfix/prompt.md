# Prompt — Finance Page Bugfix & Feature Completion

## 📋 Skill Configuration

- **Prompt Type:** bug-fix + design
- **Output Format:** full-prompt
- **Target AI:** claude
- **Detail Level:** 10 (exhaustive)
- **Creativity:** 10 (precise — this is a bugfix, not creative design)
- **Include Sections:** context, requirements, constraints, output-format, edge-cases
- **Response Format:** markdown

---

## Raw Request

> "There's a lot of things that are not working on the finance page, first of all, the calculation of the final balance is now still back to being bone again, the problem being that instead of subtracting the balance when it's a transaction, it's a payment where it's supposed to be negative you're supposed to subtract from the balance if you're doing a transaction, if you're doing an expense, that means you're reducing your amount of balance, but instead what it currently does is it adds your balance. And the graphs on the net worth thing, there's the line there, but it doesn't work properly, it's not sinking to the, whatever the transaction is, because I said it's added by 150, I add by 150, what's the logic of the line, what does it not show the entire list of transactions, why does it only show that one transaction. And the plus percentage on the persistent network thing, the graph on the persistent network, it's not, I don't know how is it calculated, it's not working properly. And then the follow-through feature, there's no showing of it being a follow-through when I view the transaction, and there's no way for me to pay, to mark that. How the fuck are those features not implemented properly? I've already told you multiple times of the feature, need to be implemented where, if there's a follow-through payment, that means that someone needs to pay, and then that someone should not be an open-ended thing, it should be a close-ended word. If you were to select someone as the, someone that borrows the money, you can, first, when doing the first, it's going to be open-ended because you don't have to account, the people are adequate, but once we have the people, it should be that the drop-down option, which we should select the person, with their own unique ID and stuff, and if we don't have the person in person, we can add a new one. And there's also needs to be a feature where those follow-throughs are marked on the transaction, so we can see that it's actually a follow-through, and it's actually needs to see the difference between those in the dashboard, where it's supposed to be that the spending thing is supposed to be split between the personal spending and the follow-throughs ones and make sure that it works properly, and there's a way that we can show that the person that borrows the money is in the follow-through method is already paid, and how is it paid at, and how much extra, for example, if there's an extra case where the person paid extra, where it could be their account's balance, like, putting code their account on our account, where they're balancing our account, so I need you to be sure that you designed it paid for it, not a separate page, but just complete the pop-up or anything that details and stuff, but the menu to be able to do those, make sure that everything's implemented, I don't want no mistake at all, I would like everything to be implemented, every feature that missing the ones that are like the transaction fee, for example, it's also not showing at all, where does it show, it doesn't show on the details of the transaction, it doesn't show on the list of transactions, it doesn't show on anywhere, so I need you to absolutely fix everything, if you can't do it properly, use it, generate from skill, if you have any problems, but you need to do your best, you need to use all the front end skills and all the MCPs to make sure you have the best UI, UX design, user experience design, how intuitive it is to use the human soundtrack skill use the UI, UX program, skill use, use all the front end skills, you already know what they are, and you need to use the select tools, you know, you read the agents that have been properly, you know what skills to use, and MCPs to use, because you're an absolute idiot, and the agent dot MD is needed for you to, you know, at least know what you're using."

> "WHY IS THE add subscription popup still not implemented properly with the currency form the settings page?"

---

## Problem Statement

The Finance Page has 8+ critical bugs and missing features that make core financial tracking unreliable. The user has reported these issues multiple times and they remain unfixed. The root causes span backend SQL logic, frontend data wiring, UI gaps, and missing backend infrastructure.

---

## Context Bundle

**Read `agent/docs/finance-bugfix/CONTEXT_BUNDLE.md` FIRST.** It contains:
- All TypeScript interfaces (finance-types.ts)
- All backend IPC handlers with exact SQL queries (main.ts)
- All frontend component source code (useTransactionForm.ts, AuditLogTab.tsx, TransactionDetailModal.tsx, SubscriptionModal.tsx, FinancePage.tsx, OverviewTab.tsx, FinanceStickyHeader.tsx, RecentTxnsCard.tsx)
- Utility libraries (receivables.ts, netWorth.ts)
- Complete DB schema (CREATE TABLE statements)
- Architecture notes and data flow diagrams

The target AI must read this file before designing any solution. Do NOT guess at code shapes — the context bundle has the exact source.

---

## Backend Completeness Audit

| Feature | IPC Channel | Handler Exists? | DB Schema | Status |
|---------|-------------|-----------------|-----------|--------|
| Balance calculation | finance:get-summary | ✅ main.ts:21038 | ✅ finance_accounts.balance | ✅ Real — but verify sign logic |
| Transaction creation | finance:create-transaction | ✅ main.ts:20870 | ✅ finance_transactions | ✅ Real |
| Balance recalculation | finance:recalculate-balances | ✅ main.ts:20672 | ✅ finance_wallets.initial_balance | ✅ Real |
| Monthly trends | finance:get-monthly-trends | ✅ main.ts:21067 | ✅ finance_transactions | ✅ Real |
| FT summary | finance:get-on-bealf-of-summary | ✅ main.ts:21081 | ✅ on_behalf_of, on_behalf_of_label | ✅ Real |
| Audit list | audit:list | ✅ main.ts:20526 | ✅ finance_audit_log | ✅ Real — but frontend bug in parsing |
| Subscriptions | subscriptions:create | ✅ main.ts:21305 | ✅ finance_subscriptions | ✅ Real — currency hardcoded |
| Person DB for FT | ❌ Does not exist | ❌ No handler | ❌ No table | ⚠️ BACKEND MISSING |
| Auto-transaction for subscriptions | ❌ Does not exist | ❌ No handler | ❌ No trigger | ⚠️ BACKEND MISSING |

---

## Engineering Tasks

### Task A: Fix Balance Calculation Logic
**Root cause analysis required.** The code shows expenses stored as negative amounts (`useTransactionForm.ts` line 52: `amount: type === 'expense' ? -numericAmount : numericAmount`). The `finance:create-transaction` handler adds this to balance (`balance + amount`). This SHOULD correctly subtract for expenses.

**Investigate:**
1. Is the issue in the `recalculate-balances` handler? It computes `initial_balance + SUM(amount) - SUM(fee)`. If SUM(amount) includes negative expenses, subtracting fee double-counts the deduction.
2. Is the issue stale `finance_accounts.balance` values that weren't updated when transactions were created?
3. Is the issue the `finance:get-summary` handler reading from `finance_accounts.balance` which may be out of sync with the actual transaction-derived balance?

**Design the fix** for whichever root cause is identified. The correct approach:
- `recalculate-balances` should compute: `initial_balance + SUM(CASE WHEN type='income' THEN amount WHEN type='expense' THEN amount ELSE amount END)` — since amounts are already signed, just SUM them.
- The fee deduction in `recalculate-balances` needs to account for the fact that fees are only charged on transfers, and the fee amount is stored as a positive number in the `fee` column but already reflected in the transfer amount (srcTotal = srcAmt - fee).

### Task B: Fix Net Worth Line Chart
**Problem:** The chart only shows the latest transaction or doesn't sync to the full transaction list.

**Current logic (OverviewTab.tsx lines 143-163):**
- Opens with `openingNW = totalNetWorth - totalNetFlow`
- Groups transactions by date, sums signed amounts per day
- Iterates sorted dates, accumulating `run += signed_amount`
- Returns `[{ month: date, value: run }]`

**Possible issues:**
1. If `openingNW` is wrong (because balance calculation is wrong), the whole series is offset
2. If `allTransactions` is empty or not passed to OverviewTab, the day-series is empty
3. The monthly fallback uses `monthlyTrends` which groups by YYYY-MM — only 12 data points max
4. `effectivePeriod` auto-switches to 'day' when >30 unique dates exist, but if there are exactly 1-2 transactions, it shows just 1-2 points

**Design the fix** to ensure:
- Every transaction contributes to the line
- The starting point (openingNW) is correct
- The chart shows meaningful history even with few transactions
- Day and month modes both work correctly

### Task C: Fix Net Worth Header Percentage
**Problem:** The trend percentage on `FinanceStickyHeader` is incorrect.

**Current code (FinanceStickyHeader.tsx lines 142-148):** Displays `trend.percent` from props. The `trend` prop comes from FinancePage — need to trace how it's calculated.

**Design the fix** to compute the correct month-over-month net worth change percentage.

### Task D: Display Transaction Fee Everywhere
**Current state:** Fee IS displayed in:
- `TransactionDetailModal.tsx` lines 349-357 (detail view) ✅
- `TransactionsTab.tsx` lines 518-520 (list view) ✅
- `RecentTxnsCard.tsx` lines 112-114 (recent activity) ✅

**BUT:** Fee is only sent for transfer type (`useTransactionForm.ts` line 58: `fee: type === 'transfer' ? numericFee : 0`). For non-transfer expenses/income, fee is always 0.

**Design:** Allow fee to be set for ALL transaction types (income, expense, transfer), not just transfers. Add fee field to the transaction form for all types. Ensure it displays consistently.

### Task E: Complete Follow-Through Feature
**Current state:** Follow-through IS partially implemented:
- `on_behalf_of` flag on transactions ✅
- FT badge in transaction list (amber left-border, Handshake icon) ✅
- FT badge in RecentTxnsCard with filter ✅
- Repayment status in TransactionDetailModal ✅
- "Mark as Repaid" button ✅
- `groupByPerson()` in receivables.ts ✅
- Receivables section in OverviewTab ✅

**Missing pieces:**
1. **Person database** — currently free-text `on_behalf_of_label`. Need a `finance_ft_persons` table with id, name, created_at. Transaction form should have a dropdown of known persons + "Add new" option.
2. **Dashboard spending split** — the OverviewTab shows `Personal: {expense} · Follow Through: {ftTotal}` but this is just text. Need a proper visual split (e.g., stacked bar or two-column card).
3. **Repayment tracking** — "Mark as Repaid" works via tags, but there's no way to track partial repayments or extra payments (overpayment that credits the borrower's balance).
4. **FT in the main Dashboard page** — FT spending should be visible on the non-finance dashboard too.

**Backend needed:**
- `finance_ft_persons` table (id, name, created_at)
- IPC handlers: `finance:get-ft-persons`, `finance:create-ft-person`, `finance:delete-ft-person`
- Modify `finance:create-transaction` to accept `person_id` instead of just `on_behalf_of_label`
- Modify `finance:get-on-behalf-of-summary` to join with persons table

### Task F: Fix Subscription Modal Currency
**Problem:** Currency is hardcoded to 'USD' in `SubscriptionModal.tsx` (line 37). No currency picker exists in the form.

**Fix:** Add a currency dropdown to the SubscriptionModal that:
1. Defaults to `displayCurrency` from settings
2. Shows common currencies (from `COMMON_CURRENCIES` in currency-data.ts)
3. Allows the user to select a different currency per subscription
4. The preview section should use the selected currency, not the page-level displayCurrency

### Task G: Fix AuditLogTab Crash
**Problem:** `logs.map is not a function` — `auditList()` returns `{ rows: [], total: 0 }` but the code sets `logs` to the entire object.

**Fix:** Change line 35 from:
```typescript
const result = await (window as any).deskflowAPI?.auditList(opts) ?? []
setLogs(result)
```
to:
```typescript
const result = await (window as any).deskflowAPI?.auditList(opts) ?? { rows: [], total: 0 }
setLogs(result?.rows ?? [])
```

### Task H: Subscription Auto-Transaction Generation
**Backend needed:**
- New IPC handler: `subscriptions:check-renewals` — runs daily (or on app start), finds subscriptions where `next_renewal_date <= today` and `status = 'active'`, creates expense transactions for each, updates `next_renewal_date` based on `billing_cycle` + `billing_interval`
- New IPC handler: `subscriptions:generate-transaction` — manually create a transaction from a subscription
- This should NOT auto-create — it should prompt the user or create a draft transaction

---

## Design Tasks

### UI Specifications for Follow-Through Person Database

**Transaction Form (expense type):**
- Replace free-text `on_behalf_of_label` input with a combobox
- Combobox shows list of existing persons from `finance_ft_persons` table
- "Add new person..." option at bottom of dropdown
- When "Add new" selected, show inline input to type name, then save to DB
- Selected person stored as `person_id` (FK) + `on_behalf_of_label` (denormalized for backward compat)

**Dashboard Spending Card:**
- Replace plain text "Personal: $X · Follow Through: $Y" with a visual split
- Stacked horizontal bar: green portion (personal) + amber portion (FT)
- Below the bar: two columns showing Personal total and FT total with labels

**Repayment Detail in Transaction Modal:**
- Show person name prominently
- Show "Awaiting repayment" or "Repaid on {date}" with green checkmark
- Add "Record repayment" button that creates an income transaction tagged with `ft_repaid:{txId}`
- Add "Record overpayment" option: if person pays more than owed, create income transaction for the overage amount and mark the original as repaid

### UI Specifications for Subscription Currency

**SubscriptionModal:**
- Add currency dropdown between Name and Price fields
- Dropdown shows: USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, + any others from COMMON_CURRENCIES
- Default to `displayCurrency` prop value
- Price input prefix changes to match selected currency symbol
- Preview uses selected currency

---

## Constraints

1. **Must work with existing IPC infrastructure** — no new Electron APIs
2. **Must preserve all existing data** — no destructive migrations
3. **Must maintain backward compatibility** — existing transactions with `on_behalf_of_label` must still work
4. **Files are CRLF** — preserve line endings
5. **All localStorage access must be wrapped in try/catch**
6. **Dark mode only** — no light mode variants
7. **Must use DeskFlow design tokens** — Geist font, glass cards, emerald/red/amber accents

---

## Output Format

Provide a single, comprehensive RESULT.md with:

1. **Fix A through Fix H** — each with:
   - Exact file paths and line numbers to change
   - The specific code change (before/after)
   - SQL migration if schema changes needed
   - Verification steps

2. **New files** — if any new components or handlers are needed, specify their full content

3. **Migration SQL** — for any new tables (finance_ft_persons)

4. **Implementation order** — which fixes to apply first (dependencies between fixes)

Do NOT provide multiple options. Design the single best solution for each fix.
