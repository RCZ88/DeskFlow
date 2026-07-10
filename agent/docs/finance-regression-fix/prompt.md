# Prompt — Restore ALL Missing Code from Backup

## Raw Request

"what are you doing? ITS NOT JUST THE SUBSCRIPTIONS BUT EVERYTHING ELSE LIKE THE FULL PAGE HANDLERS AND STUFF. THE ABILITY TO EDIT TRANSACTIONS. EVERYTHING IS GONE BECAUSE OF YOUR STUPIDITY. WHERE'S THE RECALCULATE FEATURES, WHERE'S THE FOLLOW THROUGH SEEING THE TRANSACTION AND MARKING THEM AS FOLLOW THROUGH"

## What Happened

The opencode agent ran `git checkout -- src/main.ts src/preload.ts src/components/finance/finance-types.ts src/pages/FinancePage.tsx` which reverted these 4 files to the last committed state. ALL uncommitted work was destroyed. Some code was re-applied but many handlers were lost.

## Backup Location

`C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\agent\backups\2026-07-08-2345-pre-fix-all\`

This backup contains the COMPLETE working codebase from before the revert.

## Missing IPC Handlers (25 total)

These handlers exist in the backup's `main.ts` but are MISSING from the current `src/main.ts`:

### Subscription Handlers (9 missing):
1. `subscriptions:list` (backup line 21678)
2. `subscriptions:create` (backup line 21688)
3. `subscriptions:update` (backup line 21705)
4. `subscriptions:delete` (backup line 21724)
5. `subscriptions:get-upcoming-renewals` (backup line 21732)
6. `subscriptions:generate-due-transactions` (backup line 21749)
7. `subscriptions:check-renewals` (backup line 21829)
8. `subscriptions:generate-transaction` (backup line 21850)
9. `subscriptions:skip-renewal` (backup line 21878)

### Helper Function (1 missing):
10. `computeNextRenewalDate` function (backup line 21814)

### Finance Handlers (2 missing):
11. `finance:get-dashboard-overview` (backup line ~21104)
12. `finance:get-on-behalf-of-summary` (backup line ~21081)

### Home Summary (1 missing):
13. `get-home-summary` (backup line ~unknown)

### Audit Handlers (2 missing):
14. `audit:get` (backup line ~unknown)
15. `audit:list` (backup line ~unknown)

### Conductor Handlers (10 missing):
16. `conductor:get-snapshot`
17. `conductor:kill`
18. `conductor:list`
19. `conductor:pause`
20. `conductor:promote-integration`
21. `conductor:resolve-escalation`
22. `conductor:resume`
23. `conductor:send-directive`
24. `conductor:set-autonomy`
25. `conductor:start`

## Missing Preload Bridges

Check backup's `preload.ts` for ALL bridges that exist there but not in current `src/preload.ts`. Key missing ones:
- `subscriptionsCheckRenewals`
- `subscriptionsGenerateTransaction`
- `subscriptionsList`
- `subscriptionsCreate`
- `subscriptionsUpdate`
- `subscriptionsDelete`
- `subscriptionsGetUpcomingRenewals`
- `subscriptionsSkipRenewal`
- `subscriptionsGenerateDueTransactions`
- `auditList`
- `auditGet`
- `getHomeSummary`
- Conductor bridges

## Missing FinancePage Integration

The backup's `FinancePage.tsx` likely has:
- `SubscriptionRenewalBanner` import and rendering
- `upcomingRenewals` state and data fetching
- `handleGenerateSubscriptions` and `handleSkipRenewal` callbacks

## What to Do

1. Read the backup `main.ts` (lines 21678-21897 for subscription handlers, search for each missing handler)
2. Read the backup `preload.ts` for all missing bridges
3. Read the backup `FinancePage.tsx` for SubscriptionRenewalBanner integration
4. Provide EXACT code blocks with line-by-line diffs for what needs to be inserted into the current files
5. Mark each insertion point clearly (file, line number, before/after which existing code)

## Constraints

- Only ADD missing code — do NOT modify existing working code
- Do NOT use `git checkout` or revert commands
- The backup at `agent/backups/2026-07-08-2345-pre-fix-all/` is the source of truth
- Insertion points must be in `src/main.ts`, `src/preload.ts`, `src/pages/FinancePage.tsx`
