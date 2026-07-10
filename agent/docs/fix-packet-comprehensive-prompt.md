# Comprehensive Fix Packet Prompt

## Priority Order (work sequentially)

---

## P0 — Nested Button Bug (GlassSurface + Trash2)

**File:** `src/components/finance/_fx/GlassSurface.tsx`, `src/components/finance/TransactionsTab.tsx`

**Root Cause:** `GlassSurface.tsx:33` renders as `<motion.button>` when `interactive={true}` (line 33: `const Tag = interactive ? motion.button : motion.div`). The Trash2 delete button inside `TransactionsTab.tsx:601` is ALSO a `<motion.button>`. Nesting `<button>` inside `<button>` is invalid HTML. When the user clicks the Trash2 icon:
- Some browsers ignore the inner button entirely
- Most browsers fire the outer `<button>`'s `onClick` (which opens TransactionDetailModal)
- `e.stopPropagation()` on the inner button does NOT work reliably because the browser's "button in button" recovery behaves differently than normal event propagation

**Fix Requirements:**
1. Change `GlassSurface` to ALWAYS render as `<motion.div>` (never `<motion.button>`)
2. When `interactive={true}`, add `role="button"`, `tabIndex={0}`, and `onKeyDown={(e) => e.key === 'Enter' && onClick?.()}`
3. Keep `onClick`, cursor styles, and hover effects on the div
4. Verify: clicking Trash2 no longer opens TransactionDetailModal

---

## P0 — AiPage: handleToggleGoal lacks snapshot+rollback

**File:** `src/pages/AiPage.tsx:278-288`

**Current code:** No optimistic update. On error, it shows a toast but the goal state may have already been updated by other effects.

**Fix:**
1. Before calling `saveGoal`, snapshot the current goals list: `const snapshot = [...goals]`
2. Optimistically update the goal's status locally
3. Call `saveGoal`
4. If it fails, restore from snapshot AND show error
5. Remove `loadGoals()` call (optimistic state already updated), or keep it as a background refresh

---

## P0 — AiPage: handleAcceptSuggestion lacks snapshot+rollback

**File:** `src/pages/AiPage.tsx:301-313`

**Current code:** Saves goal then filters suggestion from local state. On error, suggestion is already removed.

**Fix:**
1. Snapshot suggestions list before: `const snapshot = [...suggestions]`
2. Call `saveGoal`
3. Only on success, remove from suggestions
4. On failure, restore suggestions from snapshot AND show error

---

## P1 — AiPage: notesSaveState is hardcoded false

**File:** `src/pages/AiPage.tsx:526`

**Problem:** `AiPageDeck` gets `savingNotes={false}` hardcoded. `PlanBoard` likely renders a saving indicator. It will never show "saving..." feedback.

**Fix:**
1. Add `const [savingNotes, setSavingNotes] = useState(false)` state variable
2. In `handleSaveNotes`, wrap in `setSavingNotes(true/false)` block
3. Pass `savingNotes` to `AiPageDeck`

---

## P1 — AiPage: bootLoading/bootError states

**File:** `src/pages/AiPage.tsx`

**Problem:** No initial "boot loading" state. All 3 loaders (`loadGoals`, `loadPlanGoals`, `loadLongTermGoals`, `loadReflect`) fire simultaneously in mount effect (line 192). There's no "initializing" splash.

**Fix:**
1. Add `bootState: 'loading' | 'ready' | 'error'` state, default `'loading'`
2. Create a coordinated mount sequence:
   - `loadBoot()` that wraps all initial loads
   - On all complete → `setBootState('ready')`
   - On first error → `setBootState('error')` with message
3. In the render, if `bootState === 'loading'` show an `<InitialLoadingShell>` (centered spinner + "Loading DeskFlow AI...")
4. If `bootState === 'error'` show `<BootErrorBanner>` with retry button that calls `loadBoot()`
5. Only render the main UI when `bootState === 'ready'`

---

## P1 — AiPage: messagesRef not wired

**File:** `src/pages/AiPage.tsx`, `src/hooks/useAiChat.ts`

**Problem:** The `useAiChat` hook likely exposes a `messagesRef` but AiPage doesn't use it. This causes stale closures in callbacks that reference `chat.messages`.

**Fix:**
1. If `useAiChat` returns `messagesRef`, pass it to handlers that need the latest messages
2. If not, ensure all handlers use the ref pattern for messages

---

## P1 — AiPage: ChatPanel missing error banner + AiPageDeck missing error/retry props

**File:** `src/components/ai/chat/ChatPanel.tsx`, `src/components/ai/deck/AiPageDeck.tsx`, `src/pages/AiPage.tsx`

**Problem:** AiPageDeck doesn't pass error/retry props to ChatPanel. When the backend fails, there's no visible error in the chat area.

**Fix:**
1. Add `errorMessage?: string`, `onRetry?: () => void`, `offline?: boolean` props to `AiPageDeck` interface
2. Wire these through to `ChatPanel`
3. In `AiPage`, compute `chatError` from useAiChat state
4. Pass to AiPageDeck

---

## P1 — main.ts: missing `provider-chat-call` IPC handler

**File:** `src/main.ts`

**Problem:** The `useAiChat` hook or `ChatPanel` likely sends IPC `provider-chat-call` messages, but there's no `ipcMain.handle('provider-chat-call', ...)` handler.

**Fix:**
1. Check what format the renderer expects for chat completion
2. Add the missing handler that routes through the provider chain
3. Implement `runWithFallback` or direct provider call similar to `suggest-goals`

---

## P1 — get-reflections IPC missing

**File:** `src/main.ts`, `src/preload.ts`

**Problem:** `ReflectFeed` likely calls `window.deskflowAPI!.getReflections()` but this IPC may not exist in preload or main.

**Fix:**
1. Check if `get-reflections` IPC handler exists in main.ts (around line 13900-14100)
2. If missing, add it (query from DB, return structured reflection data)
3. Add to preload if missing

---

## P2 — Finance: D — useTransactionForm FT integration

**File:** `src/components/finance/useTransactionForm.tsx`

**Problem:** Follow Through (`on_behalf_of`) field not wired correctly. The form doesn't set `on_behalf_of` when creating transactions, so FT data is never persisted.

**Fix:**
1. Add `on_behalf_of`, `ft_person_name`, `ft_paid_back` to the form state
2. Pass these to the IPC call when creating/editing transactions
3. Ensure the field shows in the create/edit modal

---

## P2 — Finance: E — FTPersonCombobox + updateFTPerson IPC

**File:** `src/components/finance/FTPersonCombobox.tsx` (may need creation), `src/main.ts`, `src/preload.ts`

**Problem:** No combobox to select/edit the Follow-Through person on a transaction. No IPC handler to update the FT person.

**Fix:**
1. Create `FTPersonCombobox` component (combobox with common names + custom entry)
2. Add `updateFTPerson` to preload (wraps `ipcRenderer.invoke('update-ft-person', id, personName)`)
3. Add `ipcMain.handle('update-ft-person', ...)` in main.ts that updates `ft_person_name` on the transaction
4. Wire combobox into TransactionDetailModal when `on_behalf_of === 1`

---

## P2 — Finance: E — RepaymentModal wiring

**File:** `src/components/finance/RepaymentModal.tsx`

**Problem:** RepaymentModal exists but isn't properly wired to the Select All / Mark Repaid flow.

**Fix:**
1. Verify `SelectionAggregatePanel` `onMarkRepaid` prop triggers the modal
2. Modal should update `ft_paid_back` flag on selected transactions
3. Add IPC `handle('mark-repaid', ids => db query to set ft_paid_back=1)`

---

## P2 — Finance: H — check-renewals + skip-renewal IPC + SubscriptionRenewalBanner

**File:** `src/main.ts`, `src/preload.ts`, `src/components/finance/subscriptions/SubscriptionRenewalBanner.tsx`

**Problem:** Subscription renewal checking/skipping IPCs may be missing. The renewal banner may not exist.

**Fix:**
1. Add `check-renewals` IPC: query upcoming subscription renewals from DB
2. Add `skip-renewal` IPC: skip/acknowledge a specific renewal
3. Add `SubscriptionRenewalBanner` component that shows upcoming renewals (if missing)
4. Wire into SubscriptionsPage or the main finance tab
