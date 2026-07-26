# Implementation Plan — AiPage Chatbot Revamp (Stage 1)

> Generated from RESULT.md analysis + codebase trace.
> Stage 1: Chat coexists with existing cards behind a feature flag.

---

## Unit 1: Foundation Modules

### 1a. `src/services/parseBlocks.ts` — NEW

Typed-block DSL parser. Zero dependencies, pure TypeScript.

```
[type: goal-list]
[title: Today's Goals]
[items:
  - [x] Complete project proposal (work)
  - [ ] Review pull request (work)
]
[summary: 1/3 completed]
```

**Interface:**
```ts
type BlockType = 'goal-list' | 'goal-create' | 'goal-delete' | 'news-item' | 'data-summary' | 'error' | 'navigation' | 'text'
type Item = { checked: boolean; label: string; category?: string }
type Block = { type: BlockType; fields: Record<string, string | Item[]> }
export function parseBlocks(raw: string): Block[]
```

**Rules:**
- Tokenize on `[type: X]` headers
- Accumulate `[key: value]` fields; parse nested `[items: ...]` into `Item[]`
- Prose with no enclosing block → `{ type: 'text', fields: { body } }`
- On any parse error → single `{ type: 'text' }` fallback (never throw)

**Verification:** `console.log(parseBlocks(MOCK_INPUT))` — check output matches expected Block[]. No build deps.

### 1b. `src/services/chatIntent.ts` — NEW

Natural language → goal intent parser. Pure TypeScript.

**Interface:**
```ts
type Intent = 'create' | 'toggle' | 'edit' | 'delete' | 'list' | 'unknown'
type ParsedIntent = {
  intent: Intent
  title?: string
  category?: 'work' | 'personal' | 'health' | 'learning'
  date?: string
  confidence: number // 0-1
}
export function parseIntent(text: string): ParsedIntent
```

**Pattern matching:**
- `create goal 'TITLE'` or `add goal TITLE` → `create`
- `delete goal 'TITLE'` or `remove TITLE` → `delete`
- `mark TITLE done` or `complete TITLE` → `toggle`
- `show goals` or `what are my goals` → `list`
- Category detection: `(work|personal|health|learning)` in parens
- Date detection: `today`, `tomorrow`, ISO date strings
- Unknown → `{ intent: 'unknown', confidence: 0 }`

**Verification:** Run `parseIntent("create goal 'Review PR' for today")` → `{ intent: 'create', title: 'Review PR', date: '2026-06-15', confidence: 0.9 }`.

### 1c. `src/services/chatSafety.ts` — NEW

Permission gate + injection hardening.

**Interface:**
```ts
type SafetyAction = 'read' | 'create' | 'edit' | 'delete' | 'shell' | 'config'
type SafetyResult = { allowed: boolean; reason?: string; confirmRequired: boolean }

export function checkAction(action: SafetyAction): SafetyResult
export function sanitizeInput(text: string): string
export const MAX_INPUT_LENGTH = 2000
```

**Permission matrix:**
| Action | Allowed | Confirm |
|--------|---------|---------|
| `read` | ✅ | No |
| `create` | ✅ | Single confirm |
| `edit` | ✅ | Single confirm |
| `delete` | ✅ | Two-step confirm |
| `shell` | ❌ | N/A (Phase 1) |
| `config` | ❌ | N/A (Phase 2) |

**Injection hardening:**
- Strip control sequences (regex: `/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g`)
- Never interpolate raw input into IPC strings
- Cap input at `MAX_INPUT_LENGTH`
- Whitelist intents only

**Verification:** `sanitizeInput("hello\x00world")` → `"helloworld"`. `checkAction('shell')` → `{ allowed: false }`.

---

## Unit 2: Chat UI Shell

All components use existing TerminalPage patterns for consistency.

### 2a. `src/components/AiChat/ChatHeader.tsx` — NEW

**Props:**
```ts
type Props = {
  mode: 'morning' | 'in-progress' | 'review'
  dateLabel: string
  status: 'ready' | 'thinking' | 'error'
}
```

**Classes (from RESULT.md):**
- Container: `flex items-center justify-between px-4 h-12 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur`
- Mode pill: `rounded-full px-2.5 py-0.5 text-xs font-medium` with color variants:
  - morning: `bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20`
  - in-progress: `bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20`
  - review: `bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20`
- Date: `text-zinc-400 text-sm`
- Status dot: `size-2 rounded-full`, thinking=`bg-amber-400 animate-pulse`, ready=`bg-emerald-400`, error=`bg-red-400`

**Pattern source:** Steal mode-pill classes from `AiPage.tsx:301-312`.

### 2b. `src/components/AiChat/MessageList.tsx` — NEW

**Props:**
```ts
type Props = {
  children: React.ReactNode
  onScrollChange?: (isPinned: boolean) => void
}
```

**Behavior:**
- Container: `flex-1 overflow-y-auto px-4 py-4 space-y-3`
- Auto-scroll to bottom via `bottomRef` + `useEffect` on children change
- Track `isPinnedToBottom` from scroll handler — suppress auto-scroll when unpinned
- Show "Jump to latest" floating chip when unpinned: `fixed bottom-24 right-6 rounded-full bg-zinc-800 ring-1 ring-zinc-700 px-3 py-1.5 text-xs text-zinc-300`

**Pattern source:** Copy scroll behavior from `TerminalPage.tsx:4100` (overflow-y-auto, flex-1).

### 2c. `src/components/AiChat/MessageBubble.tsx` — NEW

**Props:**
```ts
type Props = {
  role: 'user' | 'assistant'
  children: React.ReactNode
}
```

**Classes (from RESULT.md):**
- AI bubble: `max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-900/70 ring-1 ring-zinc-800 px-4 py-3 text-zinc-100`
- User bubble: `ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-pink-500/15 ring-1 ring-pink-500/25 px-4 py-3 text-zinc-100`

**Pattern source:** Role-based coloring from `TerminalPage.tsx:4111-4125` but with our own classes.

### 2d. `src/components/AiChat/ChatInput.tsx` — NEW

**Props:**
```ts
type Props = {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}
```

**Behavior:**
- Wrapper: `border-t border-zinc-800 bg-zinc-950/80 p-3`
- Multi-line textarea: `w-full resize-none bg-zinc-900 ring-1 ring-zinc-800 focus:ring-pink-500/40 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500`, auto-grow to 6 lines
- **Enter** sends, **Shift+Enter** = newline (exact same as `TerminalPage.tsx:2324-2327`)
- Send button: `bg-pink-500/90 hover:bg-pink-400 disabled:bg-zinc-700 rounded-lg px-3 py-2 text-sm font-medium text-white`
- Character counter: `text-[10px] text-zinc-600` at `MAX_INPUT_LENGTH`
- Quick-action chips row: `flex gap-2 mt-2` — chips: `rounded-full bg-zinc-800 hover:bg-zinc-700 ring-1 ring-zinc-700 px-3 py-1 text-xs text-zinc-300`
- Default quick actions: *"How was my day?"*, *"Show today's goals"*, *"What's news?"*

**Pattern source:** Copy textarea pattern from `TerminalPage.tsx:2324-2332`, button from `TerminalPage.tsx:2363`.

---

## Unit 3: Block Renderer

### 3a. `src/components/AiChat/BlockRenderer.tsx` — NEW

**Props:**
```ts
type Props = {
  blocks: Block[]  (from parseBlocks)
}
```

**Behavior:**
- Maps each `Block` → corresponding renderer component
- Unknown type → `<TextBlock body={...} />`
- Failed parse → `<TextBlock body={raw} />`

### 3b–i. `src/components/AiChat/blocks/` — 8 renderers

| File | BlockType | Visual | Key classes |
|------|-----------|--------|-------------|
| `GoalListBlock.tsx` | `goal-list` | Checkbox list + progress bar | track `bg-zinc-800 h-1.5 rounded-full`, fill `bg-emerald-500` |
| `GoalCreateBlock.tsx` | `goal-create` | Emerald success badge | `bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20` |
| `GoalDeleteBlock.tsx` | `goal-delete` | Red warning badge + struck name | `bg-red-500/10 text-red-300` · label `line-through text-zinc-500` |
| `NewsItemBlock.tsx` | `news-item` | Left accent border card, clickable → DetailPanel | `border-l-2 border-pink-500/60 bg-zinc-900/60 rounded-r-lg px-3 py-2 hover:bg-zinc-900 cursor-pointer` |
| `DataSummaryBlock.tsx` | `data-summary` | Metric rows w/ ▲▼ trend | up `text-emerald-400`, down `text-pink-400` |
| `ErrorBlock.tsx` | `error` | Red card + Retry button | `bg-red-500/10 ring-1 ring-red-500/40` · button `bg-red-500/80 hover:bg-red-400` |
| `NavigationBlock.tsx` | `navigation` | Clickable page-link chip | `inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-sm text-zinc-200` |
| `TextBlock.tsx` | `text` | Plain markdown prose | standard `text-zinc-300` paragraph |

---

## Unit 4: Data Pipeline

### 4a. `src/hooks/useAppContext.ts` — NEW (composes useAiPageData)

Wraps the existing `useAiPageData` hook to batch-fetch all context on page focus.

**Data shape:**
```ts
type AppContext = {
  goals: Goal[]
  aggregates: DashboardAggregates | null
  aiUsage: AIUsageSummary | null
  projects: Project[]
  sleep: SleepRecord | null
  external: ExternalSession[]
  loading: boolean
  refresh: () => void
}
```

**Implementation:**
```ts
// Uses existing useAiPageData for each endpoint, same 60s TTL
const { data: goals, loading: goalsLoading, refresh: refreshGoals } = useAiPageData('goals', () =>
  window.deskflowAPI!.getGoals(today)
)
const { data: aggregates, loading: aggLoading } = useAiPageData('dashboardAggregates', () =>
  window.deskflowAPI!.getDashboardAggregates({ period: 'today' })
)
const { data: aiUsage } = useAiPageData('aiUsage', () =>
  window.deskflowAPI!.getAIUsageSummary('day')
)
// ... sleep, external, projects
```

**Cache invalidation:** Expose `refresh()` that calls `clearAiPageCache()` then re-fetches all.

### 4b. `src/services/newsDetection.ts` — NEW

Frontend heuristic for notable-event detection.

**Interface:**
```ts
type NewsItem = {
  metric: string
  summary: string
  detail: string
  deviation: number // absolute deviation from baseline
}

export function detectNews(context: AppContext): NewsItem[]
```

**Algorithm:**
1. For each numeric metric (focus time, sleep hours, top app usage), compute rolling 7-day baseline from existing data
2. Flag when `|today − mean| ≥ max(1.5 × mean, 2σ)`
3. Rank by deviation, return top 3
4. Suppress already-acknowledged (stored in `localStorage` per `{date}:dismissed-news`)

---

## Unit 5: Container & Integration

### 5a. `src/components/AiChat/index.tsx` — NEW

Container component that owns the chat thread state (Stage 1).

**State:**
```ts
const [messages, setMessages] = useState<ChatMessage[]>([])       // loaded from localStorage
const [isThinking, setIsThinking] = useState(false)
const [appContext, setAppContext] = useState<AppContext | null>(null)
```

**On mount:**
1. Load messages from `localStorage` key `aichat:thread:{today}`
2. Fetch context via `useAppContext`
3. If no messages exist → insert AI greeting bubble

**On send:**
1. Sanitize input via `chatSafety.sanitizeInput`
2. Save user message to state + localStorage
3. Parse intent via `chatIntent.parseIntent`
4. If intent is goal CRUD:
   - Check permission via `chatSafety.checkAction`
   - If confirm required → insert confirm block, wait for user "yes"
   - Execute IPC call, insert result block
5. If intent is list goals → read from context, format via typed-block DSL
6. If intent is general question → compose data-summary from context
7. Detect news each time context refreshes
8. Save assistant response to state + localStorage

**Composition:**
```tsx
<div className="flex flex-col h-full">
  <ChatHeader mode={mode} dateLabel={dayLabel} status={isThinking ? 'thinking' : 'ready'} />
  <MessageList>
    {messages.map(msg => (
      <MessageBubble key={msg.id} role={msg.role}>
        <BlockRenderer blocks={parseBlocks(msg.content)} />
      </MessageBubble>
    ))}
  </MessageList>
  <ChatInput onSend={handleSend} disabled={isThinking} placeholder="Ask about your day, manage goals…" />
</div>
```

### 5b. `src/components/AiChat/DetailPanel.tsx` — NEW

Right-side slide-out panel for expanded news-item detail.

**Behavior:**
- Slides in from right: `fixed right-0 top-0 h-full w-80 bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50`
- Shows when a `news-item` block is clicked
- Close button, backdrop click to dismiss
- Animate with `<AnimatePresence>` (already used in project)

### 5c. `src/pages/AiPage.tsx` — MODIFY

**Change #1 (after line 13):** Import AiChat and feature flag:
```ts
import { AiChat } from '../components/AiChat'
const AI_CHAT_ENABLED = true  // Stage 1 flag — flip to false to rollback
```

**Change #2 (after line 314, before section 01 div at line 316):** Insert chat above cards:
```tsx
{AI_CHAT_ENABLED && (
  <div className="mb-12 border border-zinc-800/50 rounded-xl overflow-hidden bg-zinc-950/50 max-h-[600px] flex flex-col">
    <AiChat />
  </div>
)}
```

**Change #3 (lines 15-36):** Remove duplicate Goal type definitions — import from GoalStore instead:
```ts
import { Goal, GoalDay, GoalCategory } from '../services/GoalStore'
```

**Change #4 (line 301-312):** Mode pill already exists with exact classes from the design — no change needed.

**Rollback:** Set `AI_CHAT_ENABLED = false` → cards remain default.

---

## Unit Dependency Graph

```
1a. parseBlocks       ← no deps
1b. chatIntent        ← no deps
1c. chatSafety        ← no deps
2a. ChatHeader        ← no deps
2b. MessageList       ← no deps
2c. MessageBubble     ← no deps
2d. ChatInput         ← chatSafety (sanitizeInput)
3a. BlockRenderer     ← 1a (parseBlocks) + 3b-i (renderers)
3b-i. blocks/*        ← no deps
4a. useAppContext     ← existing useAiPageData
4b. newsDetection     ← 4a (AppContext)
5a. AiChat/index      ← ALL of the above
5b. DetailPanel       ← no deps
5c. AiPage.tsx        ← 5a (AiChat)
```

**Build order:** 1a→1b→1c, 2a→2b→2c→2d, 3b-i (parallel with 2), 4a→4b, 3a, 5a→5b→5c

---

---

## Phase 4 — Backend Logic Audit

Every endpoint the chatbot needs already exists and returns real data. No mocks, no stubs, no missing handlers.

| Feature | IPC Channel | preload.ts | main.ts handler | Returns real data? | Status |
|---------|-------------|-----------|-----------------|-------------------|--------|
| Goal list | `get-goals` | Line 696 | ✅ Line 11314 | ✅ SQLite query | ✅ Real |
| Goal save | `save-goal` | Line 698 | ✅ Line 11342 | ✅ SQLite write | ✅ Real |
| Goal delete | `delete-goal` | Line 699 | ✅ Line 11368 | ✅ SQLite write | ✅ Real |
| Goal context | `get-goal-context` | Line 701 | ✅ Line 11421 | ✅ SQLite query | ✅ Real |
| Goal review | `save-goal-review` | Line 700 | ✅ Line 11377 | ✅ SQLite write | ✅ Real |
| Longterm goals | `get-longterm-goals` | Line 697 | ✅ Line 11359 | ✅ SQLite query | ✅ Real |
| Planning.md read | `read-planning-md` | Line 707 | ✅ Line 11399 | ✅ File read | ✅ Real |
| Dashboard aggregates | `get-dashboard-aggregates` | Line 45 | ✅ Line 4516 | ✅ SQLite query | ✅ Real |
| AI usage summary | `get-ai-usage-summary` | Line 245 | ✅ Line 7181 | ✅ SQLite query | ✅ Real |
| Projects | `get-projects` | preload | ✅ found | ✅ SQLite query | ✅ Real |
| Sleep for date | `get-sleep-for-date` | Line 446 | ✅ Line 12628 | ✅ SQLite query | ✅ Real |
| External sessions | `get-external-sessions` | Line 440 | ✅ Line 12841 | ✅ SQLite query | ✅ Real |
| Topic digest | `get-topic-digest` | Line 181 | ✅ found | ✅ SQLite query | ✅ Real |
| Navigation | No IPC needed | N/A | N/A | React Router | ✅ Client-side |

**Backend Gaps: 0.** Every IPC channel is wired, returns real SQLite data, and has no dependencies on external services. The chatbot is purely frontend — no backend changes needed.

### What exists but won't be used in Phase 1
- `suggest-goals` (line 225 in AiPage.tsx) — AI-powered goal suggestions via LLM. Phase 1 chatbot will eventually replace this with conversational goal creation.
- `get-goal-context` (line 214 in AiPage.tsx) — currently feeds the Suggest flow. Phase 1 chatbot may use this for context-aware responses.

---

## Key Codebase Patterns to Follow

1. **No .d.ts for deskflowAPI** — all calls are untyped `window.deskflowAPI!.xxx(args)`. Match this pattern.
2. **GoalStore types exist at `src/services/GoalStore.ts:1-44`** — import instead of duplicate.
3. **Enter-to-send** pattern at `TerminalPage.tsx:2324-2327` — exact same `(e.key === 'Enter' && !e.shiftKey)`.
4. **Spinner** pattern at `TerminalPage.tsx:2364-2366` — `animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full`.
5. **Message role coloring** at `TerminalPage.tsx:4111-4125` — role→color map with bg/border/dot/text.
6. **useAiPageData** at `src/hooks/useAiPageData.ts:16` — use existing hook, don't create a new caching layer.
7. **No feature flag system exists** — use a simple `const AI_CHAT_ENABLED = true` at top of AiPage.tsx.
