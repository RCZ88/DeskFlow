## Raw Request

> adding a goal crashed the app — "The model returned an error (this operation was aborted)"
> creating a goal now gives this error: Uncaught (in promise) TypeError: Failed to fetch

---

## Context Bundle

Read `agent/docs/ai-page-fix/CONTEXT_BUNDLE.md` — it contains the FULL source code of every AiPage component with file paths, line numbers, and architecture notes for all 30+ components and subsystems. This prompt covers the entire AiPage, not just the goal crash that triggered the report.

---

## Problem

The AiPage (`/ai`) has systemic issues across ALL its subsystems, not just the goal-creation crash that triggered this report. The crash is a symptom of a broader pattern: **pervasive missing/broken error handling, no loading states, no user feedback on failure, stubs in place of real implementations, and silent failures across the entire page.**

The original crash (provider timeout → aborted fetch → no user-facing error) revealed that the page was built feature-by-feature without adding error/loading/empty states for each new component. Every subsystem exhibits the same pattern:

### Bug 1 — Goal System: Error handling is incomplete

- **`handleSuggest`** in AiPage.tsx now has `suggestionError` state, but the error is NEVER rendered in the JSX (FocusBoard does render it, but only when `suggestionError` is non-null — verify the prop is actually passed)
- **`handleReview`** has a bare `catch` with only `console.error` — no `reviewError` state, no user-facing error banner, no retry
- **`handleToggleGoal`** optimistically updates local state before the IPC call completes — if the IPC fails, the UI is in an incorrect state (goal appears toggled when it wasn't)
- **`handleAcceptSuggestion`** removes the suggestion from the list before the IPC call — if IPC fails, the suggestion is gone with no way to recover
- **`loadGoals`**, **`loadLongtermGoals`** silently swallow IPC failures with no user feedback

### Bug 2 — Digest System: No error handling at all

- **`handleGenerateDigest`** has a bare `catch` with only `console.error`
- `DailyDigestBoard` has loading/empty/populated states but **no error state** — if generation fails, the button simply stops spinning with no explanation
- No retry button in error state

### Bug 3 — Connectors System: Stub actions and silent failures

- **`handleTest`** in ConnectorsPanel calls the IPC but ignores the result — no visual feedback (toast/notification) on test result
- **`handleDisconnect`** has no error handling — if the disconnect IPC fails, the connector is removed from the local list but still exists in the DB
- **`ConnectorSetupModal.onComplete`** has a "// Refresh connectors list" TODO comment — the setup completion doesn't actually refresh
- **`BulkImportDialog.onImport`** in PlanBoard doesn't actually save goals to the backend — the import is a no-op that just closes the dialog

### Bug 4 — Provider System: Token-tier retry still broken

- **`router.ts` line 76** (`if (err.status !== 402) throw err;`) still treats AbortError (timeout) as non-retryable. The 120s timeout means this is rare but still possible
- No `timeoutMs` field on `ProviderConfig` — timeout is still hardcoded in `callProvider.ts`
- No signal propagation from renderer abort through IPC to the provider call

### Bug 5 — Chat System: Streaming and error gaps

- **`streamingMessage`** in `useAiChat` is never updated — there's no stream reader/writer, so the streaming UI is purely decorative
- **ChatPanel error banner** has a "Dismiss" button that calls `onReset` (clears ALL messages), rather than just dismissing the error
- **Model selector** in ChatInput has a "// Update provider config model" TODO comment — changing the model doesn't actually update the provider config
- **`handleCardAction`** in `parsed.ts` is a stub — card action buttons (accept goal, view detail, dismiss, retry) are wired to no-ops

### Bug 6 — Initial Load: No loading/error states

- **`loadProviderConfigs`** has no error handling at all — if the IPC fails, `providerConfigs` stays as its initial `{ default: null, goalAssistant: null, researchDigest: null }` with no indication to the user
- **`loadConnectors`** silently swallows failures
- The `useEffect` in AiPage.tsx calls all four load functions (provider configs, goals, longterm goals, connectors) in parallel with no coordination — if one fails, the others still proceed, but the user gets no feedback about the failure

### Bug 7 — Context Bundle: Silent degradation

- **`buildContextBundle`** in `aiContextBundle.ts` silently catches ALL errors and returns "Unable to load context" — the UI has no way to know the context is empty
- Context bundle includes goals but not connectors, recent activity, or current focus data — incomplete context leads to poor AI responses

### Bug 8 — Reflect Feed: No dedicated backend

- **ReflectFeed** relies on `getGoalContext` and transforms its data client-side into reflection items. There's no dedicated "reflections" IPC channel, DB table, or storage — reflections are ephemeral and regenerated every time the component mounts
- No pagination — always loads 7 days even if there's no data for most days

### Bug 9 — PlanBoard: No debounce on notes saving

- **`handleSaveNotes`** in PlanBoard fires on every keystroke (via `onChange` → `onSaveNotes`) — there's no debounce, so rapid typing triggers an IPC call for every character

### Bug 10 — AI Provider Select Modal: No create flow

- **`AiProviderSelectModal`** has no way to create a new provider config — users must go to Settings to add a provider, then return to the modal to select it
- `loadProviders` error is only `console.error` — no error state in the modal

---

## Task — Engineer a Comprehensive Fix

Design a precise, minimal fix for ALL the bugs listed above across every subsystem of the AiPage. The solution must cover data processing, error handling, user feedback, and interaction design for every component.

### Requirement Checklist

#### Layer 1 — Data Processing & Error Handling (every component)

For EVERY subsystem (goals, digest, connectors, chat, providers, planning, reflections, context):
- Add proper error/loading/empty states where missing
- Replace bare `catch { console.error }` with user-facing error feedback
- Remove optimistic state updates that can leave the UI in an incorrect state (or add rollback)
- Add retry mechanisms for failed operations
- Implement debounce for IPCs that fire on every keystroke

#### Layer 2 — High-Fidelity Visual Specs

For each error/loading/empty state, specify:
- Exact component design (error banner, inline message, toast, modal)
- Colors from the design tokens: `--accent-error: #ef4444`, `--bg-card: #1e1e2a`, etc.
- Tailwind classes consistent with the existing dark theme (zinc background, indigo accent)
- Animation behavior (loading pulse, fade-in for errors, slide-out for dismissals)

#### Layer 3 — UX Flow (every interaction)

For every user-facing action, specify:
- What the user sees when the action succeeds
- What the user sees when the action fails
- What the user sees while the action is in progress
- What the user sees when there's no data yet
- How to recover from failures (retry, dismiss, navigate to settings)

#### Layer 4 — Chat System Hardening

- Wire streaming through the IPC bridge so `streamingMessage` actually receives content
- Fix the error dismiss button to dismiss the error, not reset the entire chat
- Implement the model selector to actually update the provider config
- Wire `handleCardAction` in `parsed.ts` to real handlers (acceptGoal, viewDetail, dismiss, retry)
- Fix stale closure in `useAiChat`'s `sendMessage` (use ref for messages dependency)

#### Layer 5 — Provider System

- Add `timeoutMs` to `ProviderConfig` type (used in Settings UI)
- Propagate `timeoutMs` through `callProvider.ts` (fallback to 120s default with `??`)
- Fix `router.ts` to treat `AbortError` as retryable (like 402)
- Fix `runWithFallback` error messages to distinguish "timed out" vs "failed"
- Support abort signal propagation from renderer through IPC

#### Layer 6 — Backend Completeness

- Add a dedicated "reflections" IPC channel + DB table OR document that reflect is frontend-only and add error states accordingly
- Add connector setup completion to actually refresh the connectors list
- `BulkImportDialog` must actually save goals to the DB
- `AiProviderSelectModal` should offer an inline "Add Provider" flow or a clear link to Settings

#### Layer 7 — Context Bundle Quality

- Expand `buildContextBundle` to include connectors data, recent activity, and current focus
- Add awareness of context size (truncate if too large for token budget)
- Surface context loading failures to the UI so the user knows what's missing

---

## Constraints

- **Files are CRLF** — do not mass-reformat
- **No new dependencies** — use only what's already in the project (React, Tailwind, better-sqlite3, Electron IPC)
- **No changes to `src/preload.ts`** — the IPC bridge is stable; only add new channels if a new backend endpoint is required
- **Prefer renderer-side fixes** — read the full IPC handler in `main.ts` before modifying it
- **TypeScript strict** — no `as any` unless absolutely necessary
- **Backward compatibility** — existing user data (goals, provider configs, connectors) must survive the changes
- **`localStorage` access must be wrapped in try/catch** if any is added
- **The timeout must remain bounded** — no infinite waits
- **Minimal diffs** — change only what's needed to fix each bug; don't refactor unrelated code

---

## Verify

After applying all fixes, these scenarios must pass:

1. **Goal creation success:** Suggest goals → provider responds → suggestions appear → accept → goal saved → appears in active list → no errors
2. **Goal creation failure (timeout):** Suggest goals → provider times out → error banner appears with Retry → Retry works
3. **Goal creation failure (other):** Suggest goals → provider returns HTTP 500 → error banner with descriptive message → Retry works
4. **Goal toggle failure:** Toggle a goal → IPC fails → goal stays in its original state → error banner appears → user can retry
5. **Goal suggestion accept failure:** Accept a suggestion → IPC fails → suggestion reappears → error banner → Retry works
6. **Review failure:** Review goals → provider fails → error banner with Retry → no stale spinner
7. **Digest generation success:** Generate digest → provider responds → topics appear → click topic → navigates to tab
8. **Digest generation failure:** Generate digest → provider fails → error message appears → Retry works
9. **Connector test:** Test a connector → result shown (success/failure toast)
10. **Connector disconnect failure:** Disconnect → IPC fails → connector stays in list → error banner
11. **Bulk import:** Import multiple goals → all saved to DB → appear in long-term list → no silent failures
12. **Initial load failure:** All IPC calls fail on mount → each section shows appropriate error state → manual refresh/retry works
13. **Chat send:** Type message → send → streaming content appears → message parsed correctly → card actions work
14. **Chat error:** Provider fails → error banner appears → dismiss dismisses only error (not messages)
15. **Model change:** Select different model → provider config is updated → next chat uses new model
16. **Context bundle:** Verify connector data and recent activity are included in the context sent to the provider
17. **Reflect feed:** Shows 7-day view → expand days → items displayed correctly → empty state when no goals exist
18. **Planning notes debounce:** Rapid typing → only one IPC call after typing stops (not per-keystroke)
19. **Provider select modal:** Loading state → populated state → search filters items → select works → selection reflected in ChatInput
20. **AiPage tab switch:** Switch between Command Deck and Digest → both tabs render correctly → state preserved across tabs
21. **Full app restart:** All goals, configs, connectors persisted → load correctly on restart
