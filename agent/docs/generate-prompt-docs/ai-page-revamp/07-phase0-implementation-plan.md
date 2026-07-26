# Phase 0 Implementation Plan

> Status: APPROVED — ready to execute
> Scope: IPC allowlist + decompose AiPage + role extension + bug fixes
> DO NOT write Phase 1-5 code yet.

---

## Overview

Phase 0 has 4 workstreams, executed in order:

1. **Bug Fixes** (30 min) — Fix known crashes and dead code
2. **Role Extension** (1 hr) — Extend ChatMsg.role to support system/tool
3. **IPC Allowlist** (2 hrs) — Security: replace dynamic IPC dispatch
4. **Decompose AiPage** (3 hrs) — Extract domain hooks from god component

---

## 1. Bug Fixes

### 1a. `setExpandedCardId` typo → `setExpandedCardIds`

**File:** `src/pages/AiPage.tsx`
**Line:** 1045

```diff
-          setExpandedCardId("focus");
+          setExpandedCardIds(new Set(["focus"]));
```

### 1b. Remove dead `SummaryGrid` import

**File:** `src/pages/AiPage.tsx`
**Line:** 8

```diff
- import { SummaryGrid } from '../components/ai/summary/SummaryGrid';
```

### 1c. Fix `ChatMsg.id` collision risk

**File:** `src/hooks/useAiChat.ts`
**Lines:** 32-34

```diff
  function uid(): string {
-   return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
+   return crypto.randomUUID()
  }
```

### 1d. Relax DB role constraint

**File:** `src/main.ts`
**Line:** 2271

The DB schema has `CHECK(role IN ('user', 'assistant'))`. We need to allow `system` and `tool`.

```diff
-   role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
+   role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
```

**Migration:** Existing rows are unaffected. The CHECK constraint only applies to new inserts. Add a migration line after the CREATE TABLE:

```sql
-- Phase 0 migration: relax role CHECK for system/tool messages
-- No ALTER needed on SQLite CHECK constraints — new values just work after schema update
```

Actually, SQLite doesn't support ALTER CHECK. The cleanest approach: the CHECK constraint is on CREATE TABLE. Since we use `IF NOT EXISTS`, the table won't be recreated. We need to drop and recreate the table, or just remove the CHECK constraint entirely. Since role validation should happen in application code, not DB:

```diff
  CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_date TEXT NOT NULL,
-   role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
+   role TEXT NOT NULL,
    content TEXT NOT NULL,
    parsed_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
```

This requires the table to not exist yet, or we skip the CHECK. Since the table already exists, we can't ALTER it. **Decision:** Application-layer validation only. The existing CHECK won't block new roles because the table already exists with the old schema. New installs get the relaxed CHECK.

---

## 2. Role Extension

### 2a. Define shared role type

**File:** NEW `src/components/ai/types.ts` (add to existing file)

Add at line 97 (after existing types):

```ts
/** Extended message role for transcript rail. */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'
```

### 2b. Update `ChatMsg` in useAiChat

**File:** `src/hooks/useAiChat.ts`
**Line:** 11

```diff
- role: "user" | "assistant"
+ role: import("../components/ai/types").MessageRole
```

Or simpler, inline the union:

```diff
- role: "user" | "assistant"
+ role: "user" | "assistant" | "system" | "tool"
```

### 2c. Update `ChatMessage` in chatPersistence

**File:** `src/services/chatPersistence.ts`
**Line:** 5

```diff
- role: 'user' | 'assistant';
+ role: 'user' | 'assistant' | 'system' | 'tool';
```

### 2d. Update `MessageBubbleProps` in MessageBubble

**File:** `src/components/ai/chat/MessageBubble.tsx`
**Line:** 10

```diff
- role: "user" | "assistant"
+ role: "user" | "assistant" | "system" | "tool"
```

### 2e. Add rendering branches for new roles

**File:** `src/components/ai/chat/MessageBubble.tsx`
**Lines:** 22-68 (the render function)

Add after line 23 (`const isUser = role === "user"`):

```ts
const isSystem = role === "system"
const isTool = role === "tool"
```

Add system/tool rendering in the return JSX. Currently the component returns:

```tsx
<div className={`dk-msg ${isUser ? "dk-user" : "dk-ai"}`}>
```

Change to:

```tsx
{isSystem ? (
  <div className="dk-msg-system">
    <div className="dk-system-text">{cleanContent}</div>
  </div>
) : isTool ? (
  <div className="dk-msg-tool">
    <div className="dk-tool-header">Tool Output</div>
    <pre className="dk-tool-content">{cleanContent}</pre>
  </div>
) : (
<div className={`dk-msg ${isUser ? "dk-user" : "dk-ai"}`}>
  {/* ... existing rendering ... */}
</div>
)}
```

### 2f. Add CSS for system/tool messages

**File:** `src/components/ai/deck/deck.css`

Add after the `.dk-msg-time` block (around line 303):

```css
/* System messages — full-width, dim, italic */
.dk-msg-system {
  padding: 6px 16px;
  font-size: 12px;
  font-style: italic;
  color: var(--tm);
  text-align: center;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  margin: 4px 0;
}

/* Tool messages — monospace, collapsible */
.dk-msg-tool {
  margin: 4px 0;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  overflow: hidden;
}
.dk-tool-header {
  font-size: 10px;
  font-family: var(--mono);
  color: var(--tm);
  padding: 4px 10px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.dk-tool-content {
  font-size: 12px;
  font-family: var(--mono);
  color: var(--tp);
  padding: 8px 10px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}
```

### 2g. Update DB schema for new installs

**File:** `src/main.ts`
**Line:** 2271

```diff
- role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
+ role TEXT NOT NULL,
```

---

## 3. IPC Allowlist

### 3a. Create allowlist module

**File:** NEW `src/services/ipcAllowlist.ts`

```ts
/**
 * IPC Allowlist — Security layer for AI-triggered IPC calls.
 * Only pre-approved functions can be invoked from AI-generated cards.
 * 
 * Usage: dispatchIPC('saveGoal', { date: '2026-07-18', goal: {...} })
 */

type IPCValidator = (payload: any) => boolean

interface IPCEntry {
  handler: (...args: any[]) => Promise<any>
  validate?: IPCValidator
  requiresConfirm?: boolean  // blocked when autoApprove is OFF
}

function hasFields(...fields: string[]): IPCValidator {
  return (payload: any) => {
    if (!payload || typeof payload !== 'object') return false
    return fields.every(f => payload[f] !== undefined)
  }
}

// Lazy-load the API bridge (avoids circular deps)
function getAPI(): any {
  return (window as any).deskflowAPI
}

export const ALLOWED_IPC: Record<string, IPCEntry> = {
  // ── Goals ──
  saveGoal: {
    handler: (date: string, goal: any) => getAPI().saveGoal(date, goal),
    validate: hasFields('date', 'goal'),
  },
  saveGoalsBatch: {
    handler: (goals: any[]) => getAPI().saveGoalsBatch(goals),
    validate: hasFields('goals'),
  },
  deleteGoal: {
    handler: (id: string) => getAPI().deleteGoal(id),
    validate: hasFields('id'),
    requiresConfirm: true,
  },
  saveGoalReview: {
    handler: (date: string, message: string) => getAPI().saveGoalReview(date, message),
    validate: hasFields('date', 'message'),
  },

  // ── Reminders ──
  createReminder: {
    handler: (data: any) => getAPI().createReminder(data),
    validate: hasFields('text'),
  },
  toggleReminder: {
    handler: (id: string, done: boolean) => getAPI().toggleReminder(id, done),
    validate: hasFields('id', 'done'),
  },
  deleteReminder: {
    handler: (id: string) => getAPI().deleteReminder(id),
    validate: hasFields('id'),
    requiresConfirm: true,
  },

  // ── Connectors ──
  'connectors.sync': {
    handler: (id: string) => getAPI().connectors.sync(id),
    validate: hasFields('id'),
  },
  'connectors.markRead': {
    handler: (itemId: string, read: boolean) => getAPI().connectors.markRead(itemId, read),
    validate: hasFields('itemId', 'read'),
  },

  // ── Navigation ──
  openUrl: {
    handler: (url: string) => getAPI().openUrl(url),
    validate: (p) => typeof p === 'string' && (p.startsWith('http://') || p.startsWith('https://')),
  },

  // ── AI Chat ──
  aiChatSave: {
    handler: (data: any) => getAPI().aiChatSave(data),
    validate: hasFields('threadDate', 'messages'),
  },
}

/**
 * Dispatch an IPC call through the allowlist.
 * Returns the result or throws if blocked/invalid.
 */
export function dispatchIPC(
  ipcName: string,
  payload: any,
  autoApprove: boolean = false
): Promise<any> {
  const entry = ALLOWED_IPC[ipcName]

  if (!entry) {
    console.warn(`[IPC Block] "${ipcName}" is not in the allowlist`)
    return Promise.reject(new Error(`Action "${ipcName}" is not permitted`))
  }

  if (entry.validate && !entry.validate(payload)) {
    console.warn(`[IPC Block] "${ipcName}" failed validation`)
    return Promise.reject(new Error(`Invalid payload for "${ipcName}"`))
  }

  if (entry.requiresConfirm && !autoApprove) {
    return Promise.reject(new Error(`"${ipcName}" requires user confirmation`))
  }

  return entry.handler(payload)
}

/**
 * Check if an IPC name is in the allowlist.
 */
export function isIPCAllowed(ipcName: string): boolean {
  return ipcName in ALLOWED_IPC
}
```

### 3b. Replace dynamic dispatch in AiPage

**File:** `src/pages/AiPage.tsx`
**Lines:** 587-600 (the `run-ipc` case in `onCardAction`)

Current code:

```ts
case 'run-ipc': {
  const label = action.label || action.ipc;
  setActionResults(prev => ({ ...prev, [label]: 'running' }));
  try {
    const fn = (api as any)[action.ipc];
    if (typeof fn === 'function') await fn(action.payload);
    setActionResults(prev => ({ ...prev, [label]: 'done' }));
  } catch (e: any) {
    setActionResults(prev => ({ ...prev, [label]: 'error' }));
    showToast(e.message || 'Action failed', 'error');
  }
  break;
}
```

Replace with:

```ts
case 'run-ipc': {
  const label = action.label || action.ipc;
  setActionResults(prev => ({ ...prev, [label]: 'running' }));
  try {
    await dispatchIPC(action.ipc, action.payload, autoApprove);
    setActionResults(prev => ({ ...prev, [label]: 'done' }));
  } catch (e: any) {
    setActionResults(prev => ({ ...prev, [label]: 'error' }));
    showToast(e.message || 'Action failed', 'error');
  }
  break;
}
```

Add import at top of file:

```ts
import { dispatchIPC } from '../services/ipcAllowlist';
```

---

## 4. Decompose AiPage

Extract 5 domain hooks from the 1081-line god component.

### 4a. `useGoals` hook

**File:** NEW `src/hooks/useGoals.ts`

**Extract from AiPage.tsx:**
- State: `goals`, `goalsState`, `goalsError`, `suggestions`, `planGoals`, `longTermGoals`, `planningNotes`, `review`, `reviewError`, `toggleErrors`, `acceptErrors`, `savingNotes`
- Callbacks: `loadGoals`, `handleToggleGoal`, `handleAcceptSuggestion`, `handleDismissSuggestion`, `handleSuggest`, `handleSaveReview`, `loadPlanGoals`, `handleSaveNotes`, `handleAnalyzeDump`, `handleSaveGoals`, `handleToggleLongTermGoal`, `handleDeleteLongTermGoal`, `handleUpdateLongTermGoal`
- Lines to extract: approximately lines 150-480 of AiPage.tsx

**Hook signature:**

```ts
export function useGoals(today: string) {
  // ... all goal-related state and callbacks
  return {
    goals, goalsState, goalsError,
    suggestions, planGoals, longTermGoals,
    planningNotes, review, reviewError,
    savingNotes, toggleErrors, acceptErrors,
    loadGoals, handleToggleGoal, handleAcceptSuggestion,
    handleDismissSuggestion, handleSuggest, handleSaveReview,
    handleSaveNotes, handleAnalyzeDump, handleSaveGoals,
    handleToggleLongTermGoal, handleDeleteLongTermGoal,
    handleUpdateLongTermGoal,
  }
}
```

### 4b. `useDigest` hook

**File:** NEW `src/hooks/useDigest.ts`

**Extract from AiPage.tsx:**
- State: `digestTopics`, `digestState`, `digestReason`, `digestPollRef`
- Callbacks: `loadDigest`, `initDigest`
- Lines: approximately lines 480-530

**Hook signature:**

```ts
export function useDigest() {
  return {
    digestTopics, digestState, digestReason,
    loadDigest, initDigest,
  }
}
```

### 4c. `useConnectors` hook

**File:** NEW `src/hooks/useConnectors.ts`

**Extract from AiPage.tsx:**
- State: `connectors`, `connectorsState`, `connectorSyncing`, `connectorStatus`, `showConnectorSetup`
- Callbacks: `loadConnectors`, `updateConnectorStatus`
- Lines: approximately lines 530-600

**Hook signature:**

```ts
export function useConnectors() {
  return {
    connectors, connectorsState, connectorSyncing,
    connectorStatus, showConnectorSetup, setShowConnectorSetup,
    loadConnectors, updateConnectorStatus,
  }
}
```

### 4d. `useReminders` hook

**File:** NEW `src/hooks/useReminders.ts`

**Extract from AiPage.tsx:**
- State: `reminders`, `remindersLoading`, `remindersError`, `calendarEvents`
- Callbacks: `loadReminders`, `handleCreateReminder`, `handleToggleReminder`, `handleDeleteReminder`
- Lines: approximately lines 600-700

**Hook signature:**

```ts
export function useReminders() {
  return {
    reminders, remindersLoading, remindersError,
    calendarEvents, loadReminders,
    handleCreateReminder, handleToggleReminder,
    handleDeleteReminder,
  }
}
```

### 4e. `useToasts` hook

**File:** NEW `src/hooks/useToasts.ts`

**Extract from AiPage.tsx:**
- State: `toasts`
- Callbacks: `showToast`, auto-dismiss logic
- Lines: approximately lines 26-30 + toast rendering logic

**Hook signature:**

```ts
export function useToasts() {
  return {
    toasts, showToast, removeToast,
  }
}
```

### 4f. Updated AiPage after decomposition

**File:** `src/pages/AiPage.tsx`

After extraction, AiPage shrinks from ~1081 lines to ~350 lines. It becomes:

```ts
export default function AiPage() {
  const today = getToday()
  const goals = useGoals(today)
  const digest = useDigest()
  const connectors = useConnectors()
  const reminders = useReminders()
  const toasts = useToasts()
  const chat = useAiChat()
  const slash = useSlashCommands()
  const voice = useVoiceInput({ onTranscript: ... })

  // Remaining state: bootState, configuringFeature, chatHistoryOpen,
  // commandsOpen, historyOpen, expandedCardIds, autoApprove, dayWindow

  // ... layout + component rendering
}
```

---

## 5. Files Changed Summary

| File | Change | Lines Affected |
|------|--------|----------------|
| `src/pages/AiPage.tsx` | Bug fix + decompose + allowlist | Lines 8, 137, 587-600, 1045, + remove ~700 lines |
| `src/hooks/useAiChat.ts` | Role extension + uid fix | Lines 11, 32-34 |
| `src/services/chatPersistence.ts` | Role extension | Line 5 |
| `src/components/ai/chat/MessageBubble.tsx` | Role extension + rendering | Lines 10, 22-68 |
| `src/components/ai/deck/deck.css` | System/tool message styles | Add ~30 lines after line 303 |
| `src/main.ts` | DB schema relaxation | Line 2271 |
| **NEW** `src/services/ipcAllowlist.ts` | IPC allowlist module | ~100 lines |
| **NEW** `src/hooks/useGoals.ts` | Domain hook extraction | ~300 lines |
| **NEW** `src/hooks/useDigest.ts` | Domain hook extraction | ~100 lines |
| **NEW** `src/hooks/useConnectors.ts` | Domain hook extraction | ~150 lines |
| **NEW** `src/hooks/useReminders.ts` | Domain hook extraction | ~100 lines |
| **NEW** `src/hooks/useToasts.ts` | Domain hook extraction | ~50 lines |

---

## 6. Manual Testing Checklist

Run these AFTER all Phase 0 changes are complete. Every item must pass before moving to Phase 1.

### Bug Fixes
- [ ] Click "Open Goal" from GoalsRemindersDrawer → no ReferenceError
- [ ] Check AiPage.tsx has no `SummaryGrid` import
- [ ] Send 10 rapid messages → no ID collisions in thread list

### Role Extension
- [ ] Send a message → appears as user bubble (pink)
- [ ] AI responds → appears as assistant bubble (markdown)
- [ ] Open browser console → no errors about role validation
- [ ] Check DB: `SELECT DISTINCT role FROM ai_chat_messages` → only 'user' and 'assistant' exist (no system/tool yet, but schema allows them)

### IPC Allowlist
- [ ] AI returns a card with `run-ipc` targeting `saveGoal` → dispatches successfully
- [ ] AI returns a card with `run-ipc` targeting `deleteAllGoals` → blocked with console warning
- [ ] AI returns a card with `run-ipc` targeting empty string → blocked
- [ ] Toggle autoApprove OFF → AI card with `deleteGoal` → blocked with "requires confirmation"
- [ ] Toggle autoApprove ON → AI card with `deleteGoal` → dispatches

### Decomposition
- [ ] AiPage loads without errors
- [ ] Goals: toggle a goal → status updates
- [ ] Goals: accept a suggestion → goal created
- [ ] Goals: save notes → notes persist
- [ ] Digest: loads and shows topics
- [ ] Connectors: list loads, sync works
- [ ] Reminders: create, toggle, delete all work
- [ ] Toasts: appear and auto-dismiss
- [ ] Chat: send message, receive response
- [ ] Slash commands: `/unread`, `/inbox`, `/today` all work
- [ ] Voice input: start/stop recording
- [ ] Card expansion: click card header → toggles
- [ ] Chat history: open modal, load thread, rename thread
- [ ] Slash command manager: open modal, add/edit/delete commands

### Build Verification
- [ ] `npx vite build` exits 0 with no errors
- [ ] `dist/index.js` exists and is > 10KB
- [ ] `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs` succeeds
- [ ] `dist-electron/preload.cjs` exists and is > 60KB
- [ ] `node scripts/rebuild-main.mjs` succeeds
- [ ] `dist-electron/main.cjs` exists
- [ ] App launches without black screen
- [ ] AI page renders with all cards visible
