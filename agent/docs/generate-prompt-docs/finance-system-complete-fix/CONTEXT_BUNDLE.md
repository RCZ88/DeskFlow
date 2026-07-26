# Context Bundle — Finance System Complete Fix

## What This Fix Covers

COMPLETE fix for the finance system — calculations, display logic, UI issues, AND auto-save visual indicator.

## Key Files

| File | Purpose |
|------|---------|
| `src/main.ts` | All IPC handlers, database queries, encryption |
| `src/pages/FinancePage.tsx` | Main finance page, state management |
| `src/components/finance/FinanceChartsTab.tsx` | Charts tab |
| `src/components/finance/FinanceStickyHeader.tsx` | Header with net worth, sync button |
| `src/components/finance/SubscriptionBurdenRadar.tsx` | Radar chart for subscriptions |
| `src/components/finance/WalletHealthScorecards.tsx` | Per-wallet health metrics |
| `src/components/finance/SpendingCategoryChart.tsx` | Doughnut chart |
| `src/components/finance/IncomeExpenseBarChart.tsx` | Bar chart for cash flow |
| `src/components/finance/LiquidityWaterfall.tsx` | Waterfall chart |
| `src/components/finance/PeopleTab.tsx` | People & Debt tab |
| `src/components/finance/PersonDetailModal.tsx` | Person detail with edit/delete |
| `src/components/finance/CategoriesTab.tsx` | Categories management |
| `src/components/finance/modals/PhysicalTransactionModal.tsx` | Physical wallet transaction modal |
| `src/preload.ts` | IPC bridges |

## What Was Already Fixed

1. Net worth % — uses net, capped ±1000%
2. Cash flow chart — reversed oldest→newest
3. Pie chart hover — shows amount + percentage
4. Categories page — backend computes sums
5. Category edit — inline name/icon editing
6. People top-up — creates expense transaction
7. People record repayment — IPC handler added
8. Physical modal — scrollable body
9. Physical denomination metadata — updated on transaction
10. Net worth chart — seeds with wallet balances
11. Recalculate — same function for preview and apply
12. People sync — backfills missing initial transactions
13. Subscription/Wallet Health — self-contained, fetch own data
14. Investment category — auto-assign for crypto buys
