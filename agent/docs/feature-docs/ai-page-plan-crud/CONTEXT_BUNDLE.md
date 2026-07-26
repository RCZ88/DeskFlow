# CONTEXT_BUNDLE.md — AiPage Plan CRUD + Goals & Reminders

> Self-contained context for the Architect AI to design a solution.
> Every source snippet includes exact file path + line number range.

---

## 1. Current AiPage Layout (AiPageDeck)

**File:** `src/components/ai/deck/AiPageDeck.tsx` (lines 175-371)

The deck renders slots in this order:
1. Metrics bar (connector stats + glance metrics)
2. `historySlot` (ChatHistory drawer — positioned above the chat panel)
3. Chat panel (full width)
4. Grid of expandable cards: Digest, Connectors, Focus, Plan, Reflect

**Key:** The `historySlot` is currently a `ChatHistory` drawer that sits above the chat. The user wants this replaced with a Goals & Reminders section.

```tsx
// AiPageDeck.tsx lines 210-262 — card definitions
const cardDefs = [
  { id: "digest", icon: <Newspaper size={18} />, title: "Daily Digest", slot: props.digestSlot, accent: "cyan" },
  { id: "connectors", icon: <Plug size={18} />, title: "Connectors", slot: props.connectorsSlot, accent: "cyan" },
  { id: "focus", icon: <Target size={18} />, title: "Focus", slot: props.focusSlot, accent: "emerald" },
  { id: "plan", icon: <Calendar size={18} />, title: "Plan", slot: props.planSlot, accent: "violet" },
  { id: "reflect", icon: <RefreshCw size={18} />, title: "Reflect", slot: props.reflectSlot, accent: "amber" },
]
```

```tsx
// AiPageDeck.tsx lines 295-296 — historySlot renders ABOVE the chat
{props.historySlot}

<div className="relative bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/60 rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
```

---

## 2. PlanBoard — Current Component (NO CRUD)

**File:** `src/components/ai/plan/PlanBoard.tsx` (full file, 236 lines)

The only actions on a plan: toggle done/active, and "Add" (bulk import dialog). NO delete, NO edit, NO detail view.

```tsx
// PlanBoard.tsx lines 16-27 — props interface
export interface PlanBoardProps {
  state: DataState
  goals: LongTermGoal[]
  notes: string
  savingNotes?: boolean
  onSaveNotes?: (content: string) => void
  onAnalyzeDump: (text: string) => Promise<Partial<LongTermGoal>[]>
  onSaveGoals: (goals: Partial<LongTermGoal>[]) => void
  onToggleGoal?: (goal: LongTermGoal) => void
  errorMessage?: string
  onRetry?: () => void
}
```

```tsx
// PlanBoard.tsx lines 202-236 — LongTermRow (the only rendering per goal)
function LongTermRow({ goal, onToggle }: { goal: LongTermGoal; onToggle?: (g: LongTermGoal) => void }) {
  const done = goal.status === "done"
  const accentKey = (CATEGORY_ACCENT[goal.category] ?? "violet") as keyof typeof ACCENT
  return (
    <div className="rounded-lg bg-zinc-950/40 p-3 ring-1 ring-zinc-800/50 transition-[box-shadow] duration-150 hover:ring-zinc-700">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", ACCENT[accentKey].dot)} />
        <button
          type="button"
          onClick={() => onToggle?.(goal)}
          className={cn("min-w-0 flex-1 truncate text-left text-[13px] font-medium",
            done ? cn(TEXT.muted, "line-through") : TEXT.primary)}
        >
          {goal.title}
        </button>
        {typeof goal.priority === "number" ? (
          <span className="shrink-0 rounded-md bg-zinc-800/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
            P{goal.priority}
          </span>
        ) : null}
      </div>
      {goal.description ? (
        <p className={cn("mt-1.5 pl-4.5 text-[12px] leading-5", TEXT.muted)}>{goal.description}</p>
      ) : null}
    </div>
  )
}
```

---

## 3. LongTermGoal — Type Definition

**File:** `src/components/ai/types.ts` (lines 50-58)

```tsx
export interface LongTermGoal {
  id: string
  title: string
  description?: string
  category: GoalCategory
  status: "active" | "done" | "missed"
  target_seconds?: number
  priority: number
}
```

**Goal type** (for daily goals, lines 28-42):
```tsx
export interface Goal {
  id: string
  title: string
  description?: string
  category: GoalCategory
  target: GoalTarget
  period: string
  status: "active" | "done" | "missed"
  date: string
  source: string
  links: GoalLink[]
  progressSeconds?: number
  createdAt: string
  completedAt?: string
}
```

**GoalCategory** (lines 6-13):
```tsx
export type GoalCategory = "work" | "personal" | "health" | "learning" | "finance" | "relationships"
```

---

## 4. ChatHistory — Current Component (TO BE REPLACED)

**File:** `src/components/ai/chat/ChatHistory.tsx` (full file, 119 lines)

```tsx
export interface ChatThread {
  threadDate: string
  title?: string
  messageCount: number
  lastMessageAt?: number
  preview?: string
}

interface ChatHistoryProps {
  open: boolean
  onClose: () => void
  threads: ChatThread[]
  currentThreadDate: string
  onLoadThread: (threadDate: string) => void
  onDeleteThread: (threadDate: string) => void
  onNewThread: () => void
  loading?: boolean
}
```

The drawer renders: a header with "Chat History" title + New/Close buttons, and a list of threads with delete confirmation. Styled with inline styles using CSS vars (`--tm`, `--line`, `--surface`, etc.).

---

## 5. AiPage Controller — State & Handlers

**File:** `src/pages/AiPage.tsx` (lines 56-897)

Key state:
```tsx
const [goals, setGoals] = useState<Goal[]>([]);           // daily goals
const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]); // plans
const [planningNotes, setPlanningNotes] = useState('');   // notes
const [connectors, setConnectors] = useState<Array<...>>([]); // connectors
const [reflectDays, setReflectDays] = useState<GoalDay[]>([]);
const [historyOpen, setHistoryOpen] = useState(false);    // drawer toggle
```

**History slot wiring (lines 796-806):**
```tsx
historySlot={
  <ChatHistory
    open={historyOpen}
    onClose={() => setHistoryOpen(false)}
    threads={chat.threads}
    currentThreadDate={chat.currentThreadDate}
    onLoadThread={handleLoadThread}
    onDeleteThread={handleDeleteThread}
    onNewThread={chat.startNewThread}
  />
}
```

**Plan slot wiring (lines 772-785):**
```tsx
planSlot={
  <PlanBoard
    state={goalsDataState}
    goals={longTermGoals}
    notes={planningNotes}
    savingNotes={savingNotes}
    onSaveNotes={handleSaveNotes}
    onAnalyzeDump={handleAnalyzeDump}
    onSaveGoals={handleSaveGoals}
    onToggleGoal={handleToggleLongTermGoal}
    errorMessage={goalsError || undefined}
    onRetry={loadGoals}
  />
}
```

**History toggle button (lines 846-869):** Fixed bottom-left floating button with `History` icon. When clicked, it opens the ChatHistory drawer.

---

## 6. IPC Endpoints Available

**File:** `src/preload.ts` (lines 847-876)

### Goals/LongTerm Goals IPC:
```tsx
getLongtermGoals: () => ipcRenderer.invoke('get-longterm-goals'),
saveGoal: (date: string, goal: any) => ipcRenderer.invoke('save-goal', date, goal),
deleteGoal: (goalId: string) => ipcRenderer.invoke('delete-goal', goalId),   // ← EXISTS but PlanBoard doesn't use it
saveGoalReview: (date: string, reviewSummary: string) => ipcRenderer.invoke('save-goal-review', date, reviewSummary),
getGoalContext: () => ipcRenderer.invoke('get-goal-context'),
parseGoalDump: (text: string) => ipcRenderer.invoke('parse-goal-dump', text),
suggestGoals: (date: string, ctx?: any) => ipcRenderer.invoke('suggest-goals', date, ctx),
saveGoalsBatch: (goals: any[]) => ipcRenderer.invoke('save-goals-batch', goals),
readPlanningMd: () => ipcRenderer.invoke('read-planning-md'),
writePlanningMd: (content: string) => ipcRenderer.invoke('write-planning-md', content),
```

### Connectors IPC (calendar + email):
```tsx
connectors: {
  list: () => ipcRenderer.invoke('connectors:list'),
  test: (id: string) => ipcRenderer.invoke('connectors:test', id),
  sync: (id: string) => ipcRenderer.invoke('connectors:sync', id),
  remove: (id: string) => ipcRenderer.invoke('connectors:remove', id),
  items: (id: string, opts?: any) => ipcRenderer.invoke('connectors:items', id, opts),
  markRead: (itemId: string, read: boolean) => ipcRenderer.invoke('connectors:mark-read', itemId, read),
  sendEmail: (...args) => ipcRenderer.invoke('connectors:send-email', ...args),
}
```

**`connectors:items` supports `type: 'event'` filter** — calendar events are already stored in `connector_items` table.

### Goal Detail IPC:
```tsx
getGoal: (goalId: string) => ipcRenderer.invoke('get-goal', goalId),         // lines 14858-14876
getChildGoals: (parentId: string) => ipcRenderer.invoke('get-child-goals', parentId), // lines 14878-14895
```

---

## 7. Main.ts Handlers for Goals

**File:** `src/main.ts`

```ts
// lines 14772-14806 — save-goal (INSERT OR REPLACE into goals table)
ipcMain.handle('save-goal', async (_event, date, goal) => {
  const insert = db!.prepare(`INSERT OR REPLACE INTO goals
    (id, date, title, description, category, target_type, target_seconds, match_category, status, period, source, links, progress_seconds, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  insert.run(
    goal.id, date, goal.title, goal.description || null,
    goal.target?.type || 'completion', goal.target?.targetSeconds || null, goal.target?.matchCategory || null,
    goal.status || 'pending', goal.period || 'daily', goal.source || 'manual',
    JSON.stringify(goal.links || []), goal.progressSeconds || 0, goal.completedAt || null,
  );
  return { success: true };
});

// lines 14808-14815 — get-longterm-goals
ipcMain.handle('get-longterm-goals', async () => {
  const rows = db!.prepare('SELECT * FROM goals WHERE period = ? ORDER BY priority ASC, created_at ASC').all('longterm');
  return { success: true, goals: rows };
});

// lines 14817-14824 — delete-goal (EXISTS but unused in PlanBoard)
ipcMain.handle('delete-goal', async (_event, goalId: string) => {
  db!.prepare('DELETE FROM goals WHERE id = ?').run(goalId);
  return { success: true };
});

// lines 14858-14876 — get-goal (single goal detail)
ipcMain.handle('get-goal', async (_event, goalId: string) => {
  const row = db!.prepare('SELECT * FROM goals WHERE id = ?').get(goalId);
  if (!row) return { success: false, error: 'Goal not found' };
  return { success: true, goal: { ... } };
});

// lines 14897-14919 — save-goals-batch
ipcMain.handle('save-goals-batch', async (_event, goals: any[]) => {
  const insert = db!.prepare(`INSERT OR REPLACE INTO goals
    (id, date, title, description, category, target_type, target_seconds, match_category, status, period, source, links, progress_seconds, completed_at, parent_id, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const txn = db!.transaction((items) => { for (const g of items) { insert.run(...); } });
  txn(goals);
  return { success: true, count: goals.length };
});
```

---

## 8. Connector Items (Calendar Events)

**File:** `src/main.ts` (lines near connector handlers)

Connector items are stored in `connector_items` table with columns:
- `id TEXT PRIMARY KEY`
- `connector_id TEXT NOT NULL`
- `item_type TEXT` — `'email'` or `'event'`
- `subject TEXT`, `from_field TEXT`, `body TEXT`, `date TEXT`, `is_read INTEGER`

The `connectors:items` handler filters by `item_type` when `type` is passed in options. Calendar events are `item_type = 'event'` and have `date` as their event time.

---

## 9. Design Tokens

**File:** `src/components/ai/tokens.ts` (lines 1-109)

```tsx
// Colors: dark mode only, zinc palette
// Max rounded-xl, p-5 padding
// Glass: bg-zinc-900/80 backdrop-blur-xl with border-zinc-800/60

export const SURFACE = {
  base: "bg-zinc-950",
  card: "bg-zinc-900/40",
  cardHi: "bg-zinc-900/60",
  inset: "bg-zinc-950/60",
}

export const TEXT = {
  primary: "text-zinc-100",
  secondary: "text-zinc-400",
  muted: "text-zinc-500",
  disabled: "text-zinc-600",
}

export type AccentKey = "pink" | "emerald" | "amber" | "violet" | "red" | "cyan"

export const ACCENT: Record<AccentKey, AccentDef> = {
  pink: { dot: "bg-pink-400", bar: "bg-pink-500", pill: "bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20", text: "text-pink-300", hex: "#f472b6" },
  emerald: { dot: "bg-emerald-400", bar: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20", text: "text-emerald-300", hex: "#10b981" },
  amber: { dot: "bg-amber-400", bar: "bg-amber-500", pill: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20", text: "text-amber-300", hex: "#f59e0b" },
  violet: { dot: "bg-violet-400", bar: "bg-violet-500", pill: "bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20", text: "text-violet-300", hex: "#a78bfa" },
  red: { dot: "bg-red-400", bar: "bg-red-500", pill: "bg-red-500/10 text-red-300 ring-1 ring-red-500/20", text: "text-red-300", hex: "#f87171" },
  cyan: { dot: "bg-cyan-400", bar: "bg-cyan-500", pill: "bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/20", text: "text-cyan-300", hex: "#22d3ee" },
}

export const MOTION = {
  fast: 0.15, normal: 0.25, slow: 0.4,
  ease: [0.16, 1, 0.3, 1] as const,
  stagger: 0.05,
}
```

---

## 10. Component Patterns Used

**GlassCard** (`src/components/ai/GlassCard.tsx`): Default card wrapper with bg-zinc-900/40 backdrop-blur-xl border-zinc-800/60 rounded-xl.

**SectionHead** (`src/components/ai/SectionHead.tsx`): Header with icon, title, description, optional right slot.

**StateShell** (`src/components/ai/StateShell.tsx`): Handles loading/empty/error/ready states.

**Segmented** (`src/components/ai/primitives/Segmented.tsx`): Segmented control tabs with optional count badges.

---

## 11. Existing LongTermPlanCard (Legacy — for reference)

**File:** `src/components/LongTermPlanCard.tsx`

This old component already has more CRUD than PlanBoard: it uses drag-to-reorder, add inline, bulk import, toggle done/active. But it is NOT part of the current AiPage deck system. PlanBoard replaced it with LESS functionality. The user wants PlanBoard to match or exceed LongTermPlanCard's functionality.

---

## 12. DB Schema — goals table

From `src/main.ts` migration:
```sql
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT 'Untitled',
  description TEXT,
  category TEXT DEFAULT 'work',
  target_type TEXT DEFAULT 'completion',
  target_seconds REAL,
  match_category TEXT,
  status TEXT DEFAULT 'pending',
  period TEXT DEFAULT 'daily',
  source TEXT DEFAULT 'manual',
  links TEXT DEFAULT '[]',
  progress_seconds REAL DEFAULT 0,
  completed_at TEXT,
  parent_id TEXT,
  priority INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```
