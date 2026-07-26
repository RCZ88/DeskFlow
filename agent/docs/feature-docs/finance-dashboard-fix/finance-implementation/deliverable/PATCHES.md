# PATCHES — exact edits to existing files

> Anchored to `CONTEXT_BUNDLE.md` line numbers/symbols. I don't have the raw source, so each patch gives the anchor + the change intent + the code to insert. The coding agent applies against the real file.

## Router (App.tsx / router config)
Add a lazy route next to `/finance`:
```tsx
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
// ...
<Route path="/subscriptions" element={<SubscriptionsPage />} />
```

## Sidebar (nav config)
Add after the Finance item:
```tsx
{ to: "/subscriptions", label: "Subscriptions", icon: CalendarClock }
```

## FinancePage.tsx

**(a) Net worth — apply C6 receivable model (around L672–688).** After the existing `netWorth` useMemo, add receivable and expose the combined value:
```tsx
import { followThroughReceivable, netWorthWithReceivable } from "../lib/netWorth";

const ftReceivable = useMemo(
  () => followThroughReceivable(transactions), // convert per-txn currency if needed
  [transactions]
);
const netWorthTotal = useMemo(
  () => netWorthWithReceivable(netWorth, ftReceivable),
  [netWorth, ftReceivable]
);
```
Pass `netWorthTotal` (not `summary.netBalance`) into the net-worth grid, and show `ftReceivable` as its own “Follow Through receivable” line. Keep `summary.netBalance` only as a dev cross-check.

**(b) Demote SubscriptionsTab.** Remove `subscriptions` from the tab list; render the compact overview card in the Overview instead (total monthly + upcoming renewals + “View all →” `navigate('/subscriptions')`). Verify nothing else keys off the `subscriptions` tab id before removing.

**(c) Due-now prompt.** On load, compute `subs.filter(isDue)` and surface a one-click “Record payment” (reuse the `recordPayment` logic from SubscriptionsPage; factor it into a shared hook `useRecordSubscriptionPayment`).

## OverviewTab.tsx (bundle §8 layout)
- **Rename** “Own Spending” → **“Personal Spending”**; add subline `Personal: {X} · Follow Through: {Y}`.
- **Replace** the conditional OnBehalfOf card with `<FollowThroughCard .../>` (always rendered; it has its own zero-state). Feed it from `finance:get-on-behalf-of-summary` + client-computed trend/receivable.
- **Net worth grid**: consume `netWorthTotal` + show receivable line.
- **Dev assertion** (guard with `import.meta.env.DEV`):
```ts
console.assert(
  Math.abs((personalExpense + followThroughExpense) - absAllExpense) < 0.01,
  "Plane split drift: personal+FT must equal all expense"
);
```

## RecentTxnsCard.tsx (bundle Known Issue #2)
Add a plane toggle `Personal | Follow Through | All`, default **Personal**:
```tsx
const [plane, setPlane] = useState<"personal"|"ft"|"all">("personal");
const shown = txns.filter(t =>
  plane === "all" ? true : plane === "ft" ? t.on_behalf_of === 1 : t.on_behalf_of === 0
);
```
For `on_behalf_of === 1` rows: amber-400 accent + `Handshake` icon + “Follow Through” badge.

## SpendingCategoryChart.tsx
Add a client “Include Follow Through” toggle. Default off (backend already returns `on_behalf_of=0`). When on, fetch/add an amber FT series (second dataset) — do not merge into the personal series.

## modals/modalParts.tsx (OnBehalfOfSection / AdvancedToggle)
Promote the Follow Through control out of Advanced to a first-class question:
```tsx
// "Is this for someone else?"  [ No ] [ Yes — they’ll pay me back ]
// Yes => on_behalf_of = 1 and reveal the label field (on_behalf_of_label)
```
Rename all visible “On-behalf-of” strings to “Follow Through”.

## Wallet edit modal / detail (Task B UI)
Add fields bound to `transfer_fee_type` (segmented none/fixed/percentage) + `transfer_fee_value`; persist via `finance:update-wallet-fees` (L20522). Read the full handler first.

## Transfer flow (fee preview)
Before confirm, when source wallet has a fee, show:
```ts
const fee = feeType === "percentage" ? amount * value / 100 : value;
// "Fee: {fee} · Total deducted: {amount + fee}"
```
Display-only; backend (L20790–20850) remains the source of truth.

## Wallet detail (Task A2)
Add a “Subscriptions” section: `subscriptions.filter(s => s.wallet_id === wallet.id)`; add a `Repeat` count chip on the wallet card.

## agent/dictionary.md
Add: **Follow Through** — a transaction where `on_behalf_of=1`: money moved through our wallets on behalf of someone who will repay us. Excluded from all personal spending metrics; offsets net worth as a receivable (C6 model).
