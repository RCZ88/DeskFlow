# PROMPT.md — Fix Subscription System: Dates, Balance Checks, Payment History

## Raw Request

"the subscription doesnt EVEN ADD THE TRANSACTION TO THE LIST OF TRANSACTIONS?? THERES NO OPTION TO SET IT AUTODEBET AND STUFF LIKE THAT AND WE CANT ADD THE TRANSACTIONS MANUALLY FOR A SUBSCRIPTION. i want those things that are not there to be fixed or added"

"when autodebet is on, there should be a button to sync the previous months because it doesnt add the transaction of the previous months at all. it should add from the month that we started subscribing until the latest month if it already passed the date. and like adding a manual payment needs to have like a system where it checks for like months that has yet to be paid, and makes like an assumption that it is this is the latest month, and every subscription needs to show every transaction made for that subscription. also, currently, everything is still paid on the today date, so the date is still not proper"

"HANDLING A CASE WHERE THE BALANCE IS NOT ENOUGH, IT SHOULD NOTIFY THE USER AND NOT CUT AND ADD THE TRANSACTION. STUFF LIKE THAT SHOULD BE ADDED"

"ALL THE TRANSACTION IS STILL MARKED AS TODAY. THE DATE IS ALL SET TO TODAY"

## Context

Read `agent/docs/subscription-fix/CONTEXT_BUNDLE.md` for the full codebase context including:
- DB schema for `finance_subscriptions` and `finance_transactions`
- All IPC handlers (subscriptions:create, generate-due, record-payment, etc.)
- Frontend components (SubscriptionsTab, SubscriptionModal)
- Current bugs and their root causes

## Problem

The subscription system is fundamentally broken:

1. **Transactions show today's date** instead of actual billing dates (e.g., should show Jan 15, Feb 15, Mar 15 but shows Jul 15 for all)
2. **Sync doesn't backfill** missed months — only creates 1 transaction instead of all months from start_date to today
3. **No balance check** — charges wallet even when insufficient funds
4. **No payment history** — can't see which months are paid/failed
5. **Manual payment has no date picker** — always uses today's date
6. **Duplicate transactions** — both create and sync create transactions for the same date

## Mandate

Design a comprehensive fix for the subscription system that:

### Engineering Requirements

1. **Fix date calculation**: Every transaction must use the actual billing date (e.g., 15th of each month), NOT today's date. The date should be calculated from `start_date + N * billing_interval`.

2. **Fix backfill logic**: When Sync Payments is clicked, create transactions for EVERY month from `start_date` to today that doesn't already have a transaction. Use the description field to match existing transactions: `Subscription: ${name} (${billing_cycle})`.

3. **Add balance check**: Before creating ANY transaction, query `finance_wallets.balance` for the linked wallet. If balance < subscription price, set `payment_status = 'failed'`, do NOT create transaction, and return an error message to the frontend.

4. **Fix duplicate detection**: The current duplicate check fails because `account_id` can be NULL. Fix the SQL to handle NULL: `AND (account_id = ? OR (account_id IS NULL AND ? IS NULL))`. Also clean up existing duplicates when sync runs.

5. **Show payment history**: For each subscription card, show a list of all transactions linked to it (matched by description). Show date + amount + status (paid/failed/pending).

6. **Add date picker to manual payment**: When Record Payment is clicked, show a modal with a date picker so user can choose which month they're paying for.

7. **Notify on insufficient balance**: When balance is insufficient, show a notification to the user and mark the subscription as `payment_status = 'failed'`. Do NOT create the transaction.

### UX Requirements

1. Each subscription card shows:
   - Name, price, billing cycle
   - Wallet it's linked to
   - Next renewal date with urgency badge
   - Payment status (Paid/Failed/Pending)
   - Autodebet toggle (⚡ Auto / ⏸ Manual)
   - Payment history (last 4 payments with dates)
   - Actions: Edit, Delete, Record Payment, Retry (if failed)

2. Sync Payments button:
   - Shows "Syncing..." while running
   - Shows "Synced X payments — backfilled from start dates" on success
   - Shows "All subscriptions up to date" if nothing to sync

3. Record Payment modal:
   - Shows subscription name + price
   - Date picker to choose payment date
   - Record button creates transaction with chosen date

4. Notifications for all actions:
   - "Subscription created" / "Subscription updated" / "Subscription deleted"
   - "Payment recorded" / "Payment retried"
   - "Synced X payments" / "All up to date"
   - "Insufficient balance — need X, have Y" (error)

### Constraints

- Must work with existing DB schema (no new columns needed beyond what's already been added)
- Must use existing IPC handlers (subscriptions:create, generate-due, record-payment, etc.)
- Must handle encrypted balances (financeDataKey)
- Must preserve existing subscription data
- Must not break existing wallet/account balance calculations

## Output Format

Provide a step-by-step implementation plan with:
1. Exact file paths and line numbers for each change
2. The specific code changes needed (before/after)
3. Verification steps for each change
4. How to test the complete flow end-to-end
