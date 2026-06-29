# Finance Multi-Select Transactions + Aggregate Data Panel + QoL Features

## Raw Request

> i need a feature wherer the user is able to select multiple different transaction whether its atuomatic (for example per walley or per like category or like per every other variable of the transaction, and also manualy sleect them, and it hsould show like the datas like the total amount of spending expenses and like other datas ike the profit or something along the lines of those regarding those transaction. design with the best design using frontend design. i would also like more features on whatever is interesting and like useful features that can erich and add QoL for the finance features. and for those, i would like you to use the @agent/skills/generate-prompt\ skill for researching and like stuff thinking and ideas and stuff. context needs to be all the fearures that we have currently

---

## Context

Read `agent/docs/finance-multi-select-qol/CONTEXT_BUNDLE.md` first — it contains every type definition, IPC endpoint with SQL, DB schema, existing component inventory (50+ files), design tokens, data flow architecture, and an "Existing Features Inventory" section that lists what's already built. You MUST reference this file for all codebase decisions. The target codebase is an Electron + React + TypeScript + Tailwind + framer-motion desktop app. All frontend MCP servers are available (shadcn/ui, Magic UI, 21st.dev, Lucide, React Bits, Iconify).

---

## The Mandate

Design a comprehensive solution for two things in one delivery:

### Primary Feature — Multi-Select Transactions + Aggregate Data Panel

A system that lets users select multiple transactions both **automatically** (via filter-driven selection) and **manually** (via checkboxes), then see real-time aggregate analytics for the selection.

**Selection modes:**
1. **Auto-select from active filters** — When the user has an active filter (type, wallet, category, date range, search), show a "Select all N matching" action that selects every transaction in the current filtered set. Show "N selected" chip.
2. **Manual checkbox per row** — Each transaction row gets a leading checkbox (visible on hover or always). Click toggles single selection. Shift+click selects a contiguous range. Ctrl/Cmd+click toggles without clearing existing selection.
3. **Select-all / deselect-all header checkbox** — In the transaction group header row (per date), a checkbox selects/deselects all transactions in that group.
4. **Mixed selection indicator** — When auto-select from filter is active but user manually deselects some, the parent indicator shows "N of M selected" (intermediate state: not all, not none).

**Aggregate Data Panel:**
Slide-in or sticky-bottom panel that appears when any selection is active, showing:

| Metric | Derivation |
|---|---|
| Count | `filteredTxns.length` |
| Total Inflow | `SUM(amount) WHERE type='income'` |
| Total Outflow | `SUM(ABS(amount)) WHERE type='expense'` |
| Net (P/L) | `TotalInflow - TotalOutflow` |
| By Category | Per-category breakdown of selected txns (bar or horizontal list) |
| By Wallet | Per-wallet breakdown of selected txns |
| Average per txn | `TotalOutflow / expenseCount` |
| Date range | `MIN(date) → MAX(date)` |

The panel should have a **mini chart** (sparkline or micro bar chart) showing the selected transactions' daily distribution. Use animated counters (`AnimatedAmount`, `useCountUp` from `_fx/useCountUp.ts`) for all numeric values.

**Keyboard shortcuts:**
- `Ctrl+A` / `Cmd+A` — Select all visible (filtered)
- `Shift+click` — Range select
- `Escape` — Clear selection
- `Delete` / `Backspace` — Confirm batch delete (with password gate if enabled)

**Batch actions** (appear in the panel toolbar):
- Batch delete (with password confirm like existing single-delete flow)
- Batch category reassign (dropdown → applies to all selected)
- Export selected as CSV

### Secondary — Finance QoL Feature Proposals

Research and propose **3-5 additional high-impact QoL features** beyond multi-select. For each, specify:
- What it does (1-2 sentence description)
- Why it matters to a finance-tracking user
- Feasibility check against CONTEXT_BUNDLE.md (e.g. "tags column already exists in schema — UI only")
- Implementation effort estimate (small/medium/large)
- Where it fits in the app (which tab, which component, new component)

**Suggested areas to explore** (not limited to these):
- Recurring transaction detection + management (DB has `is_recurring` and `recurring_interval` but NO UI)
- Tags for transactions (`tags TEXT` column exists in DB, no UI anywhere)
- Budget/limit tracking per-category with progress bars
- Transaction templates (quick-fill common patterns)
- Transaction reconciliation / "cleared" status
- Spending alerts (category threshold exceeded)
- Balance forecast (project future balance based on recurring txns)

For each QoL feature, answer: "Is the backend ready, or does new IPC/schema work needed?"

---

## Engineering Task

1. **Component architecture** — Propose the component tree. Where does the selection state live? In `TransactionsTab` as new state, or a new wrapper like `TransactionList` + `SelectionController`? How does it communicate with the aggregate panel?

2. **Aggregation math** — The selected transactions are in-memory (already fetched). Compute aggregates in a `useMemo` derived from `selectedTxns`. No new IPC needed for the aggregation itself. However, if batch delete must cascade to transfer pairs, reuse `finance:delete-transaction` which already handles transfer cascading.

3. **Export CSV** — New IPC endpoint `finance:export-csv` that writes to a user-chosen path via Electron `dialog.showSaveDialog`. Or pure client-side via `Blob + URL.createObjectURL + <a download>`.

4. **Selection state model** — Use a `Set<number>` for selected IDs. Support both "explicitly selected" (checkbox) and "selected via filter" (derived from filtered list with possible deselections). Use a `deselectedIds: Set<number>` optimized approach to avoid copying the entire filtered list.

5. **Performance** — FinancePage loads all transactions into memory. For 10K+ transactions, the `Set<number>` and aggregate computations should memoize. For CSV export, streaming approach.

---

## Design Task

Design the multi-select + aggregate panel at high fidelity. Provide:

1. **Widget hierarchy:**
   - `TransactionsTab` + new `SelectionBar` floating chip ("23 selected → aggregate panel")
   - `AggregatePanel` — bottom-attached or sidebar, with: count pill, income/expense/net cards (3-column), category breakdown (horizontal bar list), daily mini chart (Sparkline from `_fx/Sparkline.tsx`)
   - Checkbox column in transaction rows (checkboxes styled with DeskFlow tokens — rounded, emerald accent, 44px touch target)
   - `BatchActions` toolbar (delete, recategorize, export) inside the aggregate panel

2. **States (all 4 per humancentred-UIUX skill):**
   - **Empty:** No selection → panel hidden. Transaction list shows normal (no checkboxes unless forced by user preference)
   - **Loading:** N/A (data is in-memory)
   - **Error:** If batch delete fails, toast with error + retry
   - **Populated:** Aggregate panel shows with live-updating values as selection changes

3. **Visual spec:**
   - Checkbox: rounded, `w-5 h-5`, emerald-500 fill when checked, `border-zinc-600` when unchecked, `ring-2 ring-emerald-500/30` on focus
   - Selection bar: floating chip-like bar below filter area, glass surface, with translucent background, showing "N selected · `Ctrl+A` to select all · `Esc` to clear"
   - Aggregate panel: `GlassSurface` at bottom of transactions area, sticky or fixed, with scroll-aware auto-show/hide. Two-row layout: top row = stat cards, bottom row = breakdown
   - Animations: `AnimatePresence` for panel show/hide, staggered count-up for metrics, spring transitions
   - All numbers use `useCountUp` / `AnimatedAmount` pattern from existing `_fx/`

4. **Design system compliance:**
   - Use existing DeskFlow tokens (see CONTEXT_BUNDLE.md §Design Tokens)
   - Max border radius `rounded-xl`
   - Easing `cubic-bezier(0.16, 1, 0.3, 1)`
   - Touch targets ≥44px
   - No box-shadow (use glass borders + backdrop-blur)
   - Backgrounds in `zinc-800`-`900` family
   - Reuse `GlassSurface`, `Sparkline`, `AnimatedAmount`, `TabHeader` components

5. **Anti-slop checklist (check all 10):**
   - Distinct type color (emerald/red/amber for income/expense/transfer)
   - Proper spacing hierarchy
   - No animations without motion preferences considered
   - Icons from Lucide (consistent library)
   - Empty/loading/error states for every component

---

## UX Task

1. **Interaction flow for multi-select:**
   - User applies filters (wallet dropdown, category dropdown, type pills, date range) → sees filtered list
   - Each row shows a checkbox on hover (or always visible in "select mode")
   - Header checkbox selects/deselects all visible
   - Clicking a transaction row (not the checkbox) still opens the detail modal — the checkbox is a separate click target
   - After selecting ≥1 transaction, the aggregate panel slides in from the bottom or right
   - Panel stays visible during scroll (sticky or fixed)
   - Escape key clears all selections AND auto-hides the panel
   - Animated counter shows each metric counting up from 0 to its final value on selection change

2. **Batch delete flow:**
   - Click "Delete N selected" in batch actions → confirm dialog appears
   - If password requirements are enabled → show PasswordConfirmDialog (existing component)
   - After confirm → fire `financeDeleteTransaction()` in sequence (or parallel) → show success toast
   - On any failure → show error toast with retry for the failed items
   - Animate deleted rows out with `AnimatePresence`

3. **Batch recategorize flow:**
   - Click "Recategorize" → dropdown/modal with category picker (reuse CategoryChipGrid from modals)
   - Create new IPC endpoint `finance:batch-update-transactions` with SQL `UPDATE finance_transactions SET category_id=? WHERE id IN (...)` wrapped in `db.transaction()`
   - No balance impact — category change is metadata only
   - Show brief success state

4. **Export CSV flow:**
   - Click "Export N selected" → either client-side CSV generation via `Blob` or new IPC handler
   - Client-side preferred: format headers, map each txn to row (wallet name, category name, account name resolved from existing lookup maps)
   - Download file: `finance-export-YYYY-MM-DD.csv`

5. **Filters integrate with selection** — When user changes a filter while selection is active:
   - Show a prompt: "Change filters? Selection will be updated to match the new filter. [Update] [Cancel]"
   - Or auto-update: selection recalculates against new filtered set

---

## Constraints

- No new npm dependencies. Use existing Chart.js/React-Chartjs-2 for any charts in the aggregate panel (reuse ChartTheme).
- All new components must follow DeskFlow conventions: `_fx/` for primitives, `finance/` for feature components, `modals/` for modals.
- Must work with the existing lock/password system — batch delete respects password gates.
- File structure: if components are new, place in `src/components/finance/`. The aggregate panel can be `src/components/finance/SelectionAggregatePanel.tsx`. The checkbox/wrapper logic can be integrated into `TransactionsTab.tsx` or created as `SelectableTransactionList.tsx`.
- The FAB + wallet selector must remain functional — don't break the quick-add flow.
- IPC changes: only batch-update-transactions (if batch recategorize is included) and export CSV (if client-side is not viable) need new handlers. All aggregation is client-side from existing data.

---

## Output Format

Provide:

1. **Component tree** — ASCII diagram or bullet list showing new/wrapped components and their relationship to existing ones
2. **State model** — TypeScript interfaces for `SelectionState`, `AggregateData`
3. **Implementation plan** — Which files to create, which to modify, ordered by dependency
4. **Visual spec** — For each new visual widget: exact class names, sizes, colors, animations, states
5. **QoL proposals** — 3-5 feature proposals as described above
6. **Backend gaps** — List of any new IPC endpoints or schema changes needed, with complete spec (channel name, payload, SQL if needed)
7. **Keyboard shortcut spec** — One-line per shortcut

Write the solution as if you are the lead designer and engineer. Do not offer multiple approaches — design the *best* version.
