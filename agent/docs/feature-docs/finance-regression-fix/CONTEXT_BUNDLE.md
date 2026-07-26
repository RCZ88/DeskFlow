# Context Bundle — Restore Missing Code from Backup

## Backup Location

```
C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\agent\backups\2026-07-08-2345-pre-fix-all\
```

Files in backup:
- `main.ts` (997,327 bytes) — COMPLETE working main process
- `preload.ts` (72,640 bytes) — COMPLETE working preload
- `FinancePage.tsx` — COMPLETE working finance page

## Current Files (need restoration)

- `src/main.ts` (977,237 bytes) — Missing 25 IPC handlers + 1 helper function
- `src/preload.ts` — Missing subscription/audit/conductor bridges
- `src/pages/FinancePage.tsx` — Missing SubscriptionRenewalBanner integration

## Missing Handlers — Backup Line References

### Subscription Handlers (backup main.ts):
- Line 21678: `subscriptions:list`
- Line 21688: `subscriptions:create`
- Line 21705: `subscriptions:update`
- Line 21724: `subscriptions:delete`
- Line 21732: `subscriptions:get-upcoming-renewals`
- Line 21749: `subscriptions:generate-due-transactions`
- Line 21814: `computeNextRenewalDate` helper function
- Line 21829: `subscriptions:check-renewals`
- Line 21850: `subscriptions:generate-transaction`
- Line 21878: `subscriptions:skip-renewal`

### Other Missing Handlers:
Search backup `main.ts` for: `finance:get-dashboard-overview`, `finance:get-on-behalf-of-summary`, `get-home-summary`, `audit:get`, `audit:list`, and all `conductor:` handlers.

### Insertion Point in Current main.ts:
Find the line with `// ========== Smart Gap Fill` or `// ========== Password Requirements` — insert subscription handlers BEFORE that section.

## Missing Preload Bridges — Backup preload.ts References

Search backup `preload.ts` for ALL `subscriptions*`, `audit*`, `getHomeSummary`, and `conductor*` bridges.

### Insertion Point in Current preload.ts:
Find the line with `// ========== Vision / Critique` — insert subscription/audit bridges BEFORE that section.

## Missing FinancePage Integration

Search backup `FinancePage.tsx` for `SubscriptionRenewalBanner`, `upcomingRenewals`, `handleGenerateSubscriptions`, `handleSkipRenewal`.

### Insertion Point:
- Import: Add `SubscriptionRenewalBanner` import near other component imports
- State: Add `upcomingRenewals` state near other state declarations
- Callbacks: Add `handleGenerateSubscriptions` and `handleSkipRenewal` near other callbacks
- Rendering: Add `<SubscriptionRenewalBanner ... />` in the render section
