# Finance & Subscriptions — Comprehensive Fix Prompt

## Raw Request

> "I SAID FOR ALL THE NEW STUFF THAT YOU IMPLEMENTED LIKE TEH SUBSRIBTION MONTHLY, THE TRANSFER FREE AND ALL OF THE PAGES RELATED TO THAT. AND THE SEPERATTION BETWEEN OWN TRANSACTION AND OTHERPEOPLE TELLING US TO 'BORROW OUR AACCOUNT' FOr transactino and how tha tchanges destroys the dashboard ui and a lot of the dshboardi s not working properly."
>
> "i think something else to include is like monthly subsription, and this one also needs like a seperate page for it, and each of the wallet should have having a component that shows what monthly subsription is tied ot that wallet. and the seperate page HSould show like all of the subsriptions, and like the date details on like when does it renew, when ddi we start, a cancel subsription reminder feature, and like saving the link or access to cancel the subsription. and then like the price of the subsription, basically the details."
>
> "i think a good feature is the like whether the spending is our spending or someone else's spending, but using our account. because most of the transactions are not even my decisions. some other family member might be using our account to help them pay for something, and they pay us back. so that should be differentiated from like how the dashboard data of spending and stuff, it should be separated from the main calculation of like the amount of money wasted and shit. it should have like a different category of like helping (or like word it with something else like follow through or something)"

## Prior Prompt References (must be merged in)

This prompt supersedes and includes all requirements from these prior prompts. Read them for full context on what's already been specified:

| # | Prompt location | What it covers |
|---|---|---|
| 1 | `agent/docs/finance-page-redesign-2026-06-18/prompt.md` | Visual design brief — Design DNA (colors, typography, elevation, motion), Overview Tab polish, Accounts Tab, Transactions Tab, Categories Tab, shared chrome (header, modal, lock screen, FAB), state coverage matrix, motion spec |
| 2 | `agent/docs/finance-redesign/prompt.md` | Complete visual overhaul mandate — radical departure from current flat design, 21st.dev inspiration references, exact design tokens, component-by-component interaction specs (StickyHeader, Tab Bar, stat cards, charts, account cards, transaction rows, QuickAdd, lock screen) |
| 3 | `agent/docs/finance-transaction-modals-redesign/prompt.md` | Per-wallet-type transaction modal redesign — 7 wallet-specific context bands, field layouts, progressive disclosure, denomination picker, crypto auto-calc, submit lifecycle, human-centric UX state coverage |
| 4 | `agent/docs/finance-multi-select-qol/prompt.md` | Multi-select transactions + aggregate data panel — auto/manual selection, aggregate metrics, batch actions (delete/recategorize/export CSV), keyboard shortcuts, + 3-5 QoL feature proposals |
| 5 | `agent/docs/finance-physical-wallet-revamp/prompt.md` | Physical wallet type + per-wallet transaction UI — sticky header bug fix, denomination counter, wallet-specific detail views, routing logic for 7 wallet-type modals |

All requirements from these 5 prompts are still in scope. This prompt adds additional features and fixes on top of them.

## How to use this document

This is a **build prompt for the implementing AI**. Read `CONTEXT_BUNDLE.md` first — it is your sole source of truth for existing file names, IPC endpoints, type definitions, DB schema, and design tokens. Everything below is the target state. Where this prompt and the bundle disagree on visuals, this prompt wins; where they disagree on data shapes/IPC, the bundle wins.

**Design skills to load and follow (every UI component):**
- `agent/skills/humancentred-UIUX/SKILL.md` — 6 pillars, anti-patterns, 4 states per component
- `agent/skills/frontend-external-infra/SKILL.md` — source routing to shadcn/Magic UI/Lucide/21st.dev/React Bits, anti-slop checklist, DeskFlow re-skin rules
- All available MCP servers: shadcn, Magic UI, Lucide, 21st.dev, React Bits, Iconify, Motion community MCP

## Problem Statement

Five major areas need work. Several are **incomplete, inconsistent, and actively break the dashboard/overview UI**:

1. **Subscriptions / Monthly tracking** — exists as a standalone feature (SubscriptionsTab list + modal) but does NOT integrate with the transaction ledger or summary. Has NO dedicated page or wallet-level subscription display. Creating a subscription has zero impact on income/expense/spending charts.

2. **Transfer Fee** — backend logic exists in `main.ts` (dedicated `transfer_fee_type`/`transfer_fee_value` columns on wallets, fee calculation during transfer creation). But there is **no UI** to view or configure transfer fees on a wallet, and the fee's impact on dashboard figures is unclear.

3. **"Borrow our account" (OnBehalfOf / "Follow Through")** — `on_behalf_of` column added to `finance_transactions`, summary queries filter `on_behalf_of=0`, an `onBehalfOfSummary` card exists. BUT the user wants onBehalfOf transactions treated as a completely separate category — "Follow Through" or "Helping" — that is excluded from all personal spending calculations. The dashboard doesn't clearly communicate what's own vs other people's money.

4. **Dashboard / Overview is broken** — The combination of these features has created inconsistent data display. Net worth calculation, spending trends, cashflow charts, and recent activity all show potentially wrong or confusing values because the separation logic is applied unevenly across different components.

5. **All prior prompt requirements** — 5 prior prompts covered visual redesign, per-wallet transaction modals, multi-select QoL, and physical wallet revamp. These must all be audited and verified as properly implemented.

## Mandate

Design and implement a comprehensive solution that:

1. **Transforms Subscriptions into a full feature** — dedicated route/page + wallet-level subscription display + auto-transaction generation + cancel reminders with saved cancel links
2. **Makes transfer fees visible and configurable** — add UI to view/edit fee config per wallet, show fee amounts in transfer flow
3. **Separates "Follow Through" (onBehalfOf) transactions from personal finances** — treat as a distinct category excluded from all personal spending calculations, with its own dedicated dashboard section
4. **Fixes the dashboard inconsistency** — ensure EVERY widget consistently handles the own-vs-other separation
5. **Audits and verifies all 5 prior prompts** — ensure visual design, per-wallet modals, multi-select, QoL features, and physical wallet are fully implemented per spec
6. **Applies all frontend design skills + MCP tools** to every new or modified UI component

## Task Breakdown

### Task A — Subscription Page & Wallet Integration (NEW)

**Goal:** Subscriptions get a dedicated page/route AND per-wallet visibility. Subscriptions create ledger transactions.

#### A1 — New Subscriptions Route & Page

Create a dedicated route `/subscriptions` (accessible from the app sidebar navigation) with a full-page layout:

- **Route registration:** Add `/subscriptions` to the app router (App.tsx or router config) as a top-level page, using the same PageShell wrapper as other pages
- **Sidebar entry:** Add a "Subscriptions" link in the app sidebar with a `Repeat` or `CalendarClock` icon from Lucide
- **Page structure:**
  - Sticky header with page title "Subscriptions", total monthly spend, active subscription count, and a "+ New Subscription" button
  - Main content area with the subscription list

**Subscription list cards** (each subscription renders as a full-featured GlassCard with):**

- Subscription name + logo/icon (editable)
- Service/provider name
- **Price** — prominently displayed with currency, monthly/annual indicator
- **Renewal date** — "Next payment: June 15, 2026 (14 days away)" with countdown
- **Start date** — "Started: March 1, 2024"
- **Cancel subscription reminder** — Toggle to enable/disable a reminder N days before renewal. When enabled, show a visual indicator (bell icon, badge)
- **Cancel link/access** — A field to save the URL or instructions for canceling (e.g. "Log in at example.com/account → Billing → Cancel"). Show as a clickable link or copyable text
- **Tied wallet** — Which wallet this subscription is paid from (dropdown selector)
- **Category** — Category chip for the subscription
- **Status badge** — Active / Paused / Canceled / Past due
- **Payment history** — Expandable section showing past transactions created by this subscription
- **Actions:** Edit, Pause/Resume, Cancel, Record Payment (manual trigger)

**Empty state:** Warm illustration + "No subscriptions yet" + "Add your first subscription" CTA

**Filters/Search:**
- Search by name
- Filter by status (Active / Paused / Canceled)
- Filter by wallet
- Sort by renewal date, price, name

**Visual design (use all frontend skills + MCPs):**
- Load `humancentred-UIUX` skill for 4-state coverage (empty/loading/error/populated)
- Load `frontend-external-infra` skill for source routing — use Magic UI for animated card entrance, shadcn/ui for card layout patterns, Lucide for icons, 21st.dev for any unique UI patterns
- Design tokens: Subscription accent = indigo-500 or violet-500 (`#6366f1` or `#8b5cf6`). Cards use glassmorphism (`bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl`). Price in `tabular-nums` with `text-2xl font-bold`. Renewal countdown in amber-400 when <7 days
- Animations: Framer Motion stagger entrance for cards, AnimatePresence for filter transitions, animated counter for totals
- Responsive: grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` for cards. On mobile, single column with full-width cards

#### A2 — Wallet-Level Subscription Display

Each wallet's detail view (in AccountsTab or WalletDetailView) must show what subscriptions are tied to it:

- **Subscriptions section in wallet detail:** A compact list or card strip showing all subscriptions that use this wallet
- Each item shows: name, price, next renewal date, status
- Clicking a subscription navigates to the subscription page or opens a quick preview modal
- **Empty state:** "No subscriptions tied to this wallet" with "+ Add Subscription" link
- **Visual:** A `Repeat` icon chip with subscription count badge on the wallet card itself (e.g. "3 subs")
- Use Magic UI or shadcn patterns for the compact list rendering

#### A3 — Subscription → Transaction Integration

- **Auto-transaction generation:** When a subscription's `next_renewal_date` passes (or a manual "Record payment" action), create a `finance_transactions` record with type=`expense`, amount=`price`, category_id from the subscription's category (or a generic "Subscriptions" category), wallet_id set to the tied wallet
- **Payment history:** Each subscription shows a list of past payments (linked transactions from `finance_transactions`), with date, amount, and link to the full transaction. Use an expandable accordion pattern
- **Renewal reminders:** In addition to the per-subscription reminder toggle, surface upcoming renewals in the Finance overview as a widget: "Upcoming renewals — 3 subscriptions renewing this month ($45.99 total)"
- **Dashboard impact:** Subscription expenses must appear in the spending category chart, monthly trends, and cashflow chart
- **Cancel reminder system:** When enabled, show a notification/badge N days before the renewal date. The cancel link/access is shown with a button "Ready to cancel →" that opens the saved URL (using Electron's `shell.openExternal`)

#### A4 — SubscriptionsTab Upgrade

The existing SubscriptionsTab inside the Finance page should be upgraded to show a compact overview card:
- Total monthly subscription spend
- Upcoming renewals this month (count + total)
- "View all subscriptions →" link that navigates to `/subscriptions`

### Task B — Transfer Fee UI + Dashboard Impact

**Goal:** Users can see and configure transfer fees, and fees are clearly reflected in the dashboard.

Requirements:
- **Wallet fee configuration UI:** In the wallet detail view or wallet edit modal, add fields to view/set `transfer_fee_type` (none/fixed/percentage) and `transfer_fee_value`. Currently these fields exist on the DB row but have no UI access.
- **Fee display during transfer:** When creating a transfer, show the fee amount before confirmation. If the source wallet has a fee configured, display it clearly with the total deduction (amount + fee).
- **Fee in transaction list:** Transfer fee expense transactions should be marked/grouped with their parent transfer for clarity.
- **Dashboard impact:** Transfer fee expenses should appear in spending categories under "Transfer Fee" category. The monthly trends should reflect fee amounts.
- **Consistency:** Ensure the fee transaction's impact on balance is computed correctly (source wallet debited amount+fee, destination wallet credited amount).

### Task C — "Follow Through" / "Helping" — OnBehalfOf as a Separate Category (REVISED)

**Goal:** OnBehalfOf transactions are NOT personal spending. They are "Follow Through" — money you spent on behalf of someone else who pays you back. This should be visually and mathematically separated from personal finances.

**Concept naming:** Use "Follow Through" as the user-facing label (replacing all technical "on-behalf-of" labels). This term implies "I'm facilitating a payment for someone else, and they'll follow through with repayment."

Requirements:

- **Renaming:** Replace all UI labels of "On-behalf-of" with "Follow Through" everywhere visible to the user. Update the `agent/dictionary.md` entry for this concept.
- **Dashboard exclusion:** "Follow Through" transactions are EXCLUDED from:
  - Personal spending (the main "Spending" card, chart, and trend)
  - "Money wasted" / personal expense analysis
  - Net worth calculation (already done for custodial)
  - Personal cashflow
  - Budget tracking against personal limits
- **Dedicated "Follow Through" section in Overview:** A separate card or section showing:
  - Total Follow Through spending this month
  - MoM change
  - "You'll be repaid: $X" (optimistic — assumes all is repaid. Use a `Handshake` icon)
  - Breakdown if identifiable (e.g. by person/relationship)
  - Mini trend chart of Follow Through over time
- **RecentTxnsCard:** Add a "Follow Through" filter toggle. By default show only personal transactions. Toggle to also see Follow Through transactions (with a `Handshake` icon + "Follow Through" badge in amber)
- **Transaction modal:** When creating a transaction, the "Follow Through" toggle is prominent — not hidden behind Advanced. It's a first-class option: "Is this for someone else? [No / Yes — they'll pay me back]"
- **Transaction list:** Follow Through transactions get a distinctive visual treatment — amber-400 accent, `Handshake` icon, "Follow Through" badge
- **Spending by category:** Main chart shows personal spending only. Add a toggle "Include Follow Through" that shows it as a separate amber series
- **Categories tab:** Add a "Follow Through" category or category group. At minimum the existing `on_behalf_of` categorization gets a friendly name

### Task D — Dashboard Repair

**Goal:** Every chart and stat card shows accurate, consistent data with clearer naming.

Requirements - audit and fix EVERY data display in OverviewTab (`src/components/finance/OverviewTab.tsx`):

| Component | Current behavior | Fix required |
|-----------|-----------------|--------------|
| `IncomeExpenseCard` | Uses summary data (already filters onBehalfOf) | ✅ OK — verify against raw data |
| "Own Spending" card | Shows expense from summary | ➡️ Rename to "Personal Spending", add Follow Through comparison: "Personal: $X · Follow Through: $Y" |
| Follow Through summary card | Shows only if non-zero | ➡️ Rename to "Follow Through", add mini-trend, "You'll be repaid: $X" |
| Net flow this month | Uses monthly trends (already filters onBehalfOf) | ✅ OK — verify floor |
| `FinanceInsightsCard` | Unknown internals | Audit & ensure Follow Through excluded |
| Net worth across currencies | Uses `summary.netBalance` (excludes custodial accounts) | ✅ OK — verify wallet balance calc |
| `NetWorthLineChart` | Computed from monthly trends | ⚠️ Verify running sum is correct |
| `SpendingCategoryChart` | Backend data already filtered | ✅ OK — add Follow Through toggle |
| Cashflow bar chart | Uses monthly trends | ✅ OK |
| `RecentTxnsCard` | Shows ALL transactions | ❌ FIX — show Follow Through badge + `Handshake` icon, add filter toggle (Personal / Follow Through / All) |
| Accounts list | Shows personal + custodial | ✅ OK — add wallet counts to custodial |

### Task E — Prior Prompt Audit & Verification

Audit ALL requirements from the 5 prior prompts. Verify each is properly implemented:

| Prompt area | Key requirements to verify |
|---|---|
| Visual design (prompts 1 & 2) | 3D glassmorphism cards, animated net worth counter, sparklines, Chart.js styling, tab bar with icons, transaction rows with semantic hairline, delete-with-confirm, modal entrance animations, lock screen de-blur, state coverage (empty/loading/error) for EVERY component |
| Per-wallet transaction modals (prompt 3) | 7 unique wallet-specific context bands, progressive disclosure, denomination picker with auto-fill (physical/cash), crypto auto-calc (qty×price), submit lifecycle (spinner→check→close), empty/loading/error states per modal |
| Multi-select + aggregate panel (prompt 4) | Checkbox selection, auto-select-from-filter, shift+click range, aggregate stats panel (count, inflow, outflow, net, by category, by wallet), batch delete/recategorize/export, keyboard shortcuts |
| Physical wallet + per-wallet UI (prompt 5) | Physical wallet type + `WalletCards` icon + orange accent, denomination counter with +/- steppers, auto-fill greedy algorithm, sticky header bug fix, routing logic for 7 wallet-type modals |
| All | No box-shadow, no spring physics, max rounded-xl, touch targets ≥44px, focus rings on every element, color+icon+text for meaning (never color alone) |

## Constraints

1. **No backend schema changes** — the `finance_transactions` table, `finance_subscriptions`, and `finance_wallets` already have all needed columns. Do NOT add new columns or tables. Only add new IPC channels if absolutely necessary.
2. **No new tables** — use existing schema.
3. **Prefer renderer-side fixes** — read the FULL IPC handler before editing `main.ts`. When possible, fix data display in the renderer rather than changing backend queries.
4. **Subscriptions create transactions** — the new "Record payment" action should call both `subscriptions:update` (to bump `next_renewal_date`) and `finance:create-transaction` (to create the expense record). This is a new feature but uses EXISTING IPC channels.
5. **Subscription page is a new route** — register `/subscriptions` in the app router. The existing SubscriptionsTab inside Finance can be replaced with a compact overview + link.
6. **Transfer fee UI** — the wallet update flow already has `transfer_fee_type`/`transfer_fee_value` fields in the `handleUpdateWallet` handler. You only need to add form fields.
7. **Design tokens** — use `--page-accent: #10b981` (emerald-500). Follow Through = amber-400. Income = emerald-400, Expense = red-400, Transfer = amber-400. Subscription page accent = indigo-500 or violet-500. Glass cards = `zinc-900/80 backdrop-blur-xl`.
8. **Every UI component must** — use all frontend design skills (humancentred-UIUX, frontend-design, impeccable, ui-ux-pro-max, frontend-external-infra) + MCP tools (shadcn, Magic UI, Lucide, 21st.dev, React Bits, Iconify, Motion community MCP). Source real components, never invent from zero.
9. **New pages must follow PageShell patterns** — same wrapper, consistent header, responsive layout.

## Output Format

Provide the solution as:

1. **Route map** — All app routes including the new `/subscriptions` route, showing sidebar entry, page component, and data dependencies.
2. **Data flow audit table** — Trace how each data item (income, expense, net worth, spending by category, subscription payments, Follow Through) flows from DB → IPC handler → renderer state → UI component.
3. **Changes per file** — For each file modified: exact lines changed, what was removed, what was added.
4. **New components** — File path, props interface, render logic, state coverage (empty/loading/error/populated), and which frontend skill + MCP was used.
5. **Design spec** — For every new component: exact Tailwind classes, colors, spacing, animation specs, state transitions.
6. **Verification steps** — How to test each feature in the running app.

## Verification

After implementation, test by:
1. Create a personal expense (not Follow Through) → appears in all personal dashboard cards
2. Create a Follow Through (onBehalfOf) expense → appears ONLY in "Follow Through" section, NOT in personal spending cards/charts
3. Navigate to `/subscriptions` → see full subscription page with all cards (name, price, renewal, start, cancel reminder, cancel link, tied wallet)
4. Open a wallet detail → see tied subscriptions listed in a "Subscriptions" section
5. Create a subscription with cancel link + reminder enabled → verify cancel link is saved, reminder shows before renewal date
6. "Record payment" on a subscription → creates an expense transaction visible in the ledger and spending chart
7. Create a transfer with a fee → fee shows in "Transfer Fee" category, source wallet deducted amount+fee
8. Toggle "Follow Through" filter in RecentTxnsCard → personal only, Follow Through only, all
9. Verify net worth excludes custodial accounts and Follow Through transactions
10. Check every widget for empty/loading/error states (per humancentred-UIUX requirement)
11. Verify multi-select: select transactions, see aggregate panel metrics, batch delete works
12. Verify per-wallet modals: open add-transaction for bank, crypto, physical, credit — each has unique context band and fields
