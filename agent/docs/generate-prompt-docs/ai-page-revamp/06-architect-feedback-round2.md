# Round 2: Architect Feedback + Engineering Responses

> Source: Architect AI review of audit + architecture proposal
> Date: Jul 18, 2026
> Status: Awaiting 3 clarifying questions from Architect

---

## Architect Blockers (6 points)

### 1. Security: Dynamic IPC is Phase 0, not debt

**Architect says:** The `api[action.ipc](action.payload)` pattern is an active vulnerability. Before any canvas code, implement an IPC allowlist.

**Response:** Agreed. This is now Phase 0, not a debt item.

**Allowlist Design:**

```ts
// src/services/ipcAllowlist.ts

const ALLOWED_IPC: Record<string, { 
  handler: (payload: any) => Promise<any>
  validate?: (payload: any) => boolean 
}> = {
  // Goals
  'saveGoal':            { handler: api.saveGoal, validate: hasRequiredFields(['date', 'goal']) },
  'saveGoalsBatch':      { handler: api.saveGoalsBatch, validate: hasRequiredFields(['goals']) },
  'deleteGoal':          { handler: api.deleteGoal, validate: hasRequiredFields(['id']) },
  'saveGoalReview':      { handler: api.saveGoalReview, validate: hasRequiredFields(['date', 'message']) },
  
  // Reminders
  'createReminder':      { handler: api.createReminder, validate: hasRequiredFields(['text']) },
  'toggleReminder':      { handler: api.toggleReminder, validate: hasRequiredFields(['id', 'done']) },
  'deleteReminder':      { handler: api.deleteReminder, validate: hasRequiredFields(['id']) },
  
  // Connectors
  'connectors.sync':     { handler: api.connectors.sync, validate: hasRequiredFields(['id']) },
  'connectors.markRead': { handler: api.connectors.markRead, validate: hasRequiredFields(['itemId', 'read']) },
  
  // Navigation
  'openUrl':             { handler: api.openUrl, validate: hasRequiredFields(['url']) },
}

function dispatchIPC(ipcName: string, payload: any): Promise<any> {
  const entry = ALLOWED_IPC[ipcName]
  if (!entry) {
    console.warn(`[IPC Block] ${ipcName} not in allowlist`)
    return Promise.reject(new Error(`Action "${ipcName}" is not permitted`))
  }
  if (entry.validate && !entry.validate(payload)) {
    return Promise.reject(new Error(`Invalid payload for "${ipcName}"`))
  }
  return entry.handler(payload)
}
```

**Rules:**
- No destructive actions (`deleteGoal`) when `autoApprove` is OFF
- `connectors.sync` is allowed (read-only)
- `connectors.sendEmail` is BLOCKED (requires manual send)
- Navigation actions (`openUrl`) are always allowed
- Unknown IPC names are silently dropped with a console warning
- The allowlist is a flat module, importable by both canvas and old AiPage

**Migration:** Replace all `api[action.ipc](action.payload)` calls with `dispatchIPC(action.ipc, action.payload)`. This is a single-line change per call site.

---

### 2. State: Record<string, CanvasCard> (not Map)

**Architect says:** React doesn't handle Map mutations in useState. Use Record or Zustand.

**Response:** `Record<string, CanvasCard>` with `useReducer`.

**Why not Zustand:**
- Zustand adds 2.3KB gzipped + a new mental model
- We're already decomposing into hooks — a `useCanvasState()` hook using `useReducer` is simpler
- Zustand is great for shared cross-page state, but canvas state is page-local
- We can always migrate to Zustand later if cross-page state emerges

**Why not Map:**
- React's `useState` uses `Object.is` comparison. `Map.set()` mutates in place, so `Object.is(oldMap, newMap)` returns `true` — React won't re-render.

**Implementation pattern:**

```ts
interface CanvasState {
  cards: Record<string, CanvasCard>  // keyed by card ID
  layout: CanvasLayout
  viewport: CanvasViewport
}

type CanvasAction =
  | { type: 'ADD_CARD'; card: CanvasCard }
  | { type: 'UPDATE_CARD'; id: string; patch: Partial<CanvasCard> }
  | { type: 'REMOVE_CARD'; id: string }
  | { type: 'MOVE_CARD'; id: string; position: { x: number; y: number } }
  | { type: 'RESIZE_CARD'; id: string; size: { w: number; h: number } }
  | { type: 'PIN_CARD'; id: string }
  | { type: 'DISMISS_CARD'; id: string }
  | { type: 'SET_STATUS'; id: string; status: CanvasCard['status'] }
  | { type: 'RESET_LAYOUT' }

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'ADD_CARD':
      return { ...state, cards: { ...state.cards, [action.card.id]: action.card } }
    case 'UPDATE_CARD':
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], ...action.patch } } }
    case 'REMOVE_CARD':
      const { [action.id]: _, ...rest } = state.cards
      return { ...state, cards: rest }
    case 'MOVE_CARD':
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], position: action.position } } }
    case 'RESIZE_CARD':
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], size: action.size } } }
    case 'PIN_CARD':
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], pinned: true } } }
    case 'DISMISS_CARD':
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], dismissedAt: Date.now() } } }
    case 'SET_STATUS':
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], status: action.status } } }
    case 'RESET_LAYOUT':
      return { ...state, layout: DEFAULT_LAYOUT, viewport: DEFAULT_VIEWPORT }
  }
}
```

---

### 3. ParsedMessage → CanvasCard Mapping

| Old ParsedMessage Type | New Card Type | Spawns/Updates | Existing Renderer | Wrapping Strategy |
|---|---|---|---|---|
| `goal_suggestion` | `approval` | Spawn new | `GoalSuggestionCard` | ApprovalCard wraps GoalSuggestionCard content + Approve/Reject buttons |
| `plan_update` | `plan` | Update existing | `PlanUpdateCard` | PlanCard receives patch data, merges into existing plan card |
| `stats_summary` | `transient` | Spawn new | `StatsSummaryCard` | TransientCard wraps StatsSummaryCard, auto-dismiss 30s |
| `action_list` | `approval` | Spawn new | `ActionListCard` | ApprovalCard wraps ActionListCard, each item has approve/reject |
| `digest_item` | `digest` | Spawn new | `DigestTopicCard` | DigestCard wraps DigestTopicCard, pinned by default |
| `connector_status` | `transient` | Spawn new | `ConnectorStatusCard` | TransientCard wraps ConnectorStatusCard, auto-dismiss 15s |
| `form_fill` | `approval` | Spawn new | `FormFillCard` | ApprovalCard wraps FormFillCard, submit = approve |
| `chart_data` | `transient` | Spawn new | `ChartDataCard` | TransientCard wraps ChartDataCard, user can pin |
| `error` | `transient` | Spawn new | `ErrorCard` | TransientCard wraps ErrorCard, auto-dismiss 10s |
| `reminder_create` | `approval` | Spawn new | (inline) | ApprovalCard with "Create reminder: X?" + Approve/Reject |

**Migration rule:** Existing `ParsedMessageRouter` stays as-is during Phase 1. The `CardGeneration` contract is additive — AI can return either format. The router detects which format and routes accordingly. No existing AI response paths break.

---

### 4. Extended ChatMsg.role

**Architect says:** The rail needs system messages and tool calls. Extend `role` to include `system` and `tool`.

**Response:** Agreed. The DB schema already stores `role` as TEXT (no migration needed).

**Extended model:**
```ts
role: 'user' | 'assistant' | 'system' | 'tool'
```

**Role semantics:**

| Role | Source | Rendering | Persistence |
|------|--------|-----------|-------------|
| `user` | Human input | Right-aligned pink bubble | Yes |
| `assistant` | AI response | Left-aligned with markdown | Yes |
| `system` | Context injection, workflow state | Dim italic, no bubble, full-width | Yes |
| `tool` | IPC call results, function outputs | Code-style monospace block, collapsible | Yes |

**Changes required:**

1. **`src/hooks/useAiChat.ts`** — Extend `ChatMsg.role` type
2. **`src/components/ai/chat/parsed.ts`** — Add `system` and `tool` to role union
3. **`src/components/ai/chat/MessageBubble.tsx`** — Add rendering branches for `system` and `tool` roles
4. **`src/services/chatPersistence.ts`** — Already role-agnostic (stores `role` as string), no change needed
5. **DB schema** — `ai_chat_messages.role` is TEXT, accepts any string. No migration needed.
6. **Streaming parser** — Tool calls from AI already come as JSON in fenced blocks. The parser extracts them and creates `tool` role messages.

**System message example:**
```ts
{ role: 'system', content: 'Context: 3 goals active, 2 unread emails, next event in 2 hours', timestamp: Date.now() }
```

**Tool message example:**
```ts
{ role: 'tool', content: 'saveGoal → { success: true, goalId: "abc123" }', timestamp: Date.now() }
```

---

### 5. Testing Strategy

#### A. IntentParser Routing

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Exact slash command | `/focus` | `{ type: 'open_card', cardType: 'focus' }` |
| Slash with args | `/sync gmail` | `{ type: 'run_command', command: 'sync', args: 'gmail' }` |
| Keyword match | `show my goals` | `{ type: 'open_card', cardType: 'focus' }` |
| Keyword match | `what's in my inbox` | `{ type: 'open_card', cardType: 'digest' }` |
| Ambiguous input | `help me plan` | `{ type: 'clarify', options: ['focus', 'plan'] }` |
| Conversational | `what should I do today?` | `{ type: 'transcript', sendToAI: true }` |
| Custom command | `/standup meeting notes` | `{ type: 'custom_command', name: 'standup', args: 'meeting notes' }` |
| Unknown command | `/blahblah` | `{ type: 'error', message: 'Unknown command' }` |
| Empty input | `` | `{ type: 'noop' }` |
| Injection attempt | `/focus; deleteAllGoals()` | `{ type: 'error', message: 'Invalid command' }` |

#### B. CardGeneration Validation

| Test Case | Input | Expected |
|-----------|-------|----------|
| Valid create | `{ cardType: 'focus', action: 'create', data: {...} }` | Card added to state |
| Valid update | `{ cardType: 'focus', action: 'update', cardId: 'abc', data: {...} }` | Existing card patched |
| Invalid cardType | `{ cardType: 'nonexistent', ... }` | Rejected with error |
| Missing required fields | `{ cardType: 'approval', action: 'create' }` (no data) | Rejected |
| XSS in data | `{ cardType: 'transient', data: { content: '<script>alert(1)</script>' }` | Sanitized, rendered as text |
| Oversized data | `{ cardType: 'digest', data: { items: Array(10000) } }` | Truncated to 100 items |
| Confidence below threshold | `{ cardType: 'focus', confidence: 0.2 }` | Spawns clarification card instead |

#### C. Approval Flow E2E

| Step | Action | Expected |
|------|--------|----------|
| 1 | AI returns `{ cardType: 'approval', data: { goal: {...} } }` | ApprovalCard appears on canvas |
| 2 | User clicks Approve | Card status → 'running', IPC dispatched |
| 3 | IPC succeeds | Card transforms to success state, fades after 3s |
| 4 | IPC fails | Card shows error overlay with retry |
| 5 | User clicks Reject | Card shows "Cancelled", fades after 2s |
| 6 | Duplicate approval for same action | Second card rejected (dedup by action hash) |

#### D. Error Boundary Fallback

| Test Case | Trigger | Expected |
|-----------|---------|----------|
| Card render crash | Component throws in render | Card shows fallback UI, canvas stays alive |
| Canvas crash | Multiple cards crash simultaneously | Full-page error boundary catches, shows reset button |
| Recovery after fix | Click retry on crashed card | Card re-attempts render |
| State corruption | Malformed localStorage | Reset to default layout, show toast |

#### E. IPC Allowlist Enforcement

| Test Case | Input | Expected |
|-----------|-------|----------|
| Allowed IPC | `{ ipc: 'saveGoal', payload: {...} }` | Dispatched successfully |
| Blocked IPC | `{ ipc: 'deleteAllGoals', payload: {} }` | Blocked, console warning |
| Missing IPC name | `{ ipc: '', payload: {} }` | Blocked |
| Null payload | `{ ipc: 'saveGoal', payload: null }` | Validation fails |
| Prototype pollution | `{ ipc: '__proto__', payload: {} }` | Blocked (not in allowlist) |
| autoApprove OFF + destructive | `{ ipc: 'deleteGoal', payload: {...} }` | Blocked (requires confirmation) |

---

### 6. Clarifying Questions for Architect

**Q1: What's our target browser support?**
This affects the drag-and-drop library choice. If we need IE11 or very old Edge, we'd need a fallback. If modern evergreen only (Chrome, Firefox, Safari, Edge Chromium), we can use pointer events + CSS transforms directly without a library.

**Q2: Do we need offline support for the canvas?**
If yes, we need a service worker + IndexedDB for card state. If no, localStorage + DB is sufficient and much simpler.

**Q3: What's the budget for bundle size increase?**
Current `index.js` is 11.9MB uncompressed (2.3MB gzip). Adding Zustand (+2.3KB gz) is trivial. Adding `@dnd-kit` (+8KB gz) or `react-dnd` (+20KB gz) is significant. What's the ceiling?

---

## Updated Phase Plan (incorporating feedback)

| Phase | Scope | Depends On |
|-------|-------|------------|
| **Phase 0** | IPC allowlist + decompose AiPage + extend ChatMsg.role + fix critical bugs | Nothing |
| **Phase 1** | Canvas foundation: CanvasGrid, CanvasCard, useCanvasState (useReducer + Record) | Phase 0 |
| **Phase 2** | Command Palette + IntentParser + transient card spawning | Phase 1 |
| **Phase 3** | Transcript Rail (right slide-out) | Phase 1 + Role extension |
| **Phase 4** | Card types: FocusCard, PlanCard, FinanceCard, DigestCard, ApprovalCard | Phase 1 |
| **Phase 5** | Testing: all test cases from §5 | Phase 1-4 |
