# Finance & Subscriptions — Implementation Result

> Produced by the Architect against `CONTEXT_BUNDLE.md`. New components are delivered as ready-to-drop files under `deliverable/src/`. Edits to existing files (whose full source I can't see) are given as exact, symbol/line-anchored patches in `PATCHES.md`. Open decisions the prompt left ambiguous are **resolved here** — nothing handed back as a question.

---

## Decisions locked

1. **Net-worth model = Receivable model (C6).** Net worth = raw wallet sum + outstanding Follow Through receivable. A Follow-Through expense really leaves the wallet, so the raw sum drops; the offsetting receivable keeps net worth honest to “they’ll pay me back.” No schema change.
2. **Canonical net worth = wallet-sum in `FinancePage.tsx:672–688`** (handles denominations + currency). Summary card shows *that*; `get-summary.netBalance` is a cross-check only.
3. **Subscription→ledger linkage = convention, not FK** (schema frozen): payment rows carry `description = subscription.name` + tag `sub:{id}` in `tags`.
4. **No scheduler this pass** (Known Issue #6). Renewals due surface as an explicit “Due now” prompt with one-click Record Payment.
5. **Follow Through repayments** modeled as ordinary personal income for now; dedicated settlement flow explicitly out of scope.
6. **Subscription accent = `violet-500 #8b5cf6`.**

---

## 1. Route Map (final)

| Route | Sidebar | Component | Shell | Data deps |
|---|---|---|---|---|
| `/finance` | Finance | `FinancePage.tsx` | PageShell | `finance:get-summary`, `:get-spending-by-category`, `:get-monthly-trends`, `:get-on-behalf-of-summary`, `subscriptions:get-upcoming-renewals` |
| `/subscriptions` **NEW** | Subscriptions (`CalendarClock`) | `src/pages/SubscriptionsPage.tsx` | PageShell | `subscriptions:list`, `:create/:update/:delete`, `:get-upcoming-renewals`, `finance:create-transaction`, wallet+category lists |

In-Finance `SubscriptionsTab` → demoted to a compact card (see PATCHES).

---

## 2. Data-Flow Audit (resolved)

| Data item | IPC (line) | Plane | After fix | UI |
|---|---|---|---|---|
| Income / Expense | `finance:get-summary` (20938) | Personal | `on_behalf_of=0` ✅ | IncomeExpenseCard, Personal Spending |
| Net balance (cross-check) | `finance:get-summary` | Personal | excludes custodial ✅ | cross-check only |
| **Net worth (canonical)** | client `FinancePage:672–688` | Personal | wallet-sum **+ FT receivable** | Net worth grid |
| Spending by category | `:get-spending-by-category` (20954) | Personal | `on_behalf_of=0` ✅ + client FT toggle | SpendingCategoryChart |
| Monthly trends | `:get-monthly-trends` (20967) | Personal | `on_behalf_of=0` ✅ | Cashflow, NetWorthLineChart |
| Follow Through | `:get-on-behalf-of-summary` (20982) | FollowThrough | expense-only (income OOS) | FollowThroughCard |
| Recent txns | list channel | mixed → client filter | Personal default | RecentTxnsCard |
| Subscription payments | `finance:create-transaction` | Personal | real ledger rows | all charts |
| Transfer fee | `:create-transfer` (20790–20850) | Personal | “Transfer Fee” category ✅ | spending chart |

**Invariant:** `PersonalSpending + FollowThrough == ABS(Σ expense)` for the period (dev assertion in OverviewTab).

---

## 3. New components (delivered files)

| File | Purpose |
|---|---|
| `src/lib/subscriptions.ts` | `monthlyAmount`, `daysUntil`, `advanceRenewal`, `subscriptionTag`, `isDue` |
| `src/lib/netWorth.ts` | `followThroughReceivable`, `netWorthWithReceivable` (C6) |
| `src/pages/SubscriptionsPage.tsx` | `/subscriptions` route — header, filters, grid, 4 states, due-now, record-payment |
| `src/components/subscriptions/SubscriptionCard.tsx` | full card + record payment + history accordion |
| `src/components/finance/FollowThroughCard.tsx` | Overview Follow Through section (receivable, MoM, breakdown, mini-trend) |

---

## 4. Changes per existing file
See `PATCHES.md`: Router, Sidebar, `FinancePage.tsx` (C6 net worth, tab demotion, due-now), `OverviewTab.tsx` (rename cards, mount FollowThroughCard, assertion), `RecentTxnsCard.tsx` (plane toggle), `SpendingCategoryChart.tsx` (FT toggle), `modalParts.tsx` (promote FT toggle + rename), wallet edit modal (transfer-fee fields), transfer flow (fee preview), wallet detail (tied subs), `agent/dictionary.md`.

---

## 5. Design tokens

| Purpose | Token |
|---|---|
| Page accent | emerald-500 `#10b981` |
| Income / Expense | emerald-400 / red-400 |
| Transfer / FollowThrough / Custodial | amber-400 `#fbbf24` |
| Subscription | violet-500 `#8b5cf6` |
| Glass | `bg-zinc-900/80 backdrop-blur-xl` (sub cards `/60`), `border border-zinc-800/50 rounded-xl` |
| Numerals | `tabular-nums` |
| Motion | Framer stagger + `AnimatePresence`; no spring, no box-shadow, max `rounded-xl`, ≥44px targets, focus rings |

---

## 6. Verification
1. Personal expense → all personal cards/charts. 2. FT expense → only FollowThroughCard. 3. `/subscriptions` full cards + 4 states. 4. Wallet detail tied subs + chip. 5. Cancel link + reminder saved. 6. Record Payment → ledger row + renewal advance. 7. Transfer fee → source −(amount+fee), dest +amount. 8. RecentTxns toggle. 9. Net worth = wallet-sum + receivable, consistent. 10. 4 states everywhere. 11. Multi-select aggregate + batch delete. 12. Per-wallet modals unique bands. 13. Assertion holds.
