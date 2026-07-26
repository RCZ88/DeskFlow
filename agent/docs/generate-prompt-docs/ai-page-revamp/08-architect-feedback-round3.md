# Round 3: Architect Review — 6 Blockers Addressed

> Source: Architect Phase 0 plan review
> Date: Jul 18, 2026
> Status: All 6 addressed — ready to execute Phase 0

---

## 1. Complete IPC Allowlist (All 35+ Endpoints)

### READ Endpoints (always allowed, no confirmation)

| Endpoint | Source Module | Purpose |
|----------|--------------|---------|
| `getGoals` | Goals | Load daily goals |
| `getGoalsBatch` | Goals | Load multi-day goal history |
| `getGoalContext` | Goals | 7-day goal trend stats |
| `getLongtermGoals` | Long-term | Load all long-term goals |
| `getReminders` | Reminders | Fetch all reminders |
| `getDashboardAggregates` | Dashboard | App usage aggregates |
| `getAIUsageSummary` | AI | AI usage stats |
| `getProjects` | Projects | Active projects |
| `readPlanningMd` | Planning | Read planning.md |
| `getTopicDigest` | Digest | Fetch/generate digest |
| `isDigestGenerating` | Digest | Check digest status |
| `connectors.list` | Connectors | List all connectors |
| `connectors.items` | Connectors | Fetch connector items |
| `connectors.test` | Connectors | Test connectivity |
| `getAiProviders` | AI | Get provider config |
| `aiChatLoad` | Chat | Load chat thread |
| `aiChatListThreads` | Chat | List all threads |
| `aiChatGetMemories` | Chat | Load memories |
| `financeGetSummary` | Finance | Finance summary |
| `financeGetWallets` | Finance | Wallet balances |
| `financeGetSubscriptionIntelligence` | Finance | Subscription data |
| `financeGetTransactions` | Finance | Transaction list |
| `financeGetCategories` | Finance | Category list |
| `getSleepTrends` | Sleep | Sleep data |

### WRITE Endpoints (allowlist + confirmation when autoApprove OFF)

| Endpoint | Requires Confirm | Payload Validator |
|----------|-----------------|-------------------|
| `saveGoal` | No | `hasFields('date', 'goal')` |
| `saveGoalsBatch` | No | `hasFields('goals')` |
| `deleteGoal` | **Yes** | `hasFields('id')` |
| `saveGoalReview` | No | `hasFields('date', 'message')` |
| `createReminder` | No | `hasFields('text')` |
| `toggleReminder` | No | `hasFields('id', 'done')` |
| `deleteReminder` | **Yes** | `hasFields('id')` |
| `connectors.sync` | No | `hasFields('id')` |
| `connectors.markRead` | No | `hasFields('itemId', 'read')` |
| `saveAiProviders` | No | `hasFields('providers')` |
| `aiChatSave` | No | `hasFields('threadDate', 'messages')` |
| `aiChatReset` | **Yes** | `hasFields('threadDate')` |
| `aiChatRenameThread` | No | `hasFields('threadDate', 'title')` |
| `writePlanningMd` | No | `hasFields('content')` |
| `suggestGoals` | No | `hasFields('date')` |
| `parseGoalDump` | No | `hasFields('text')` |

### BLOCKED Endpoints (never allowed from AI)

| Endpoint | Reason |
|----------|--------|
| `connectors.sendEmail` | Requires manual send intent |
| `connectors.remove` | Destructive, requires manual action |
| `deleteAllGoals` | Doesn't exist in API, but blocked by not being in allowlist |
| Any `finance*` write | Financial operations require manual UI |
| `providerChatCall` | Should not be called from AI cards |

### Complete Allowlist Module

```ts
// src/services/ipcAllowlist.ts

type IPCValidator = (payload: any) => boolean

interface IPCEntry {
  handler: (payload: any) => Promise<any>
  validate?: IPCValidator
  requiresConfirm?: boolean
}

function hasFields(...fields: string[]): IPCValidator {
  return (payload: any) => {
    if (!payload || typeof payload !== 'object') return false
    return fields.every(f => payload[f] !== undefined)
  }
}

function getAPI(): any {
  return (window as any).deskflowAPI
}

// ── READ endpoints (always allowed) ──
export const READ_IPC: Record<string, (payload: any) => Promise<any>> = {
  getGoals:                (p) => getAPI().getGoals(p.date),
  getGoalsBatch:           (p) => getAPI().getGoalsBatch(p.start, p.end),
  getGoalContext:          ()  => getAPI().getGoalContext(),
  getLongtermGoals:        ()  => getAPI().getLongtermGoals(),
  getReminders:            ()  => getAPI().getReminders(),
  getDashboardAggregates:  (p) => getAPI().getDashboardAggregates(p),
  getAIUsageSummary:       (p) => getAPI().getAIUsageSummary(p.period),
  getProjects:             ()  => getAPI().getProjects(),
  readPlanningMd:          ()  => getAPI().readPlanningMd(),
  getTopicDigest:          (p) => getAPI().getTopicDigest(p?.force),
  isDigestGenerating:      ()  => getAPI().isDigestGenerating(),
  'connectors.list':       ()  => getAPI().connectors.list(),
  'connectors.items':      (p) => getAPI().connectors.items(p.id, p.opts),
  'connectors.test':       (p) => getAPI().connectors.test(p.id),
  getAiProviders:          ()  => getAPI().getAiProviders(),
  aiChatLoad:              (p) => getAPI().aiChatLoad(p.threadDate),
  aiChatListThreads:       ()  => getAPI().aiChatListThreads(),
  aiChatGetMemories:       (p) => getAPI().aiChatGetMemories(p.threadDate),
  financeGetSummary:       ()  => getAPI().financeGetSummary(),
  financeGetWallets:       ()  => getAPI().financeGetWallets(),
  financeGetSubscriptionIntelligence: () => getAPI().financeGetSubscriptionIntelligence(),
  financeGetTransactions:  (p) => getAPI().financeGetTransactions(p),
  financeGetCategories:    ()  => getAPI().financeGetCategories(),
  getSleepTrends:          (p) => getAPI().getSleepTrends(p),
}

// ── WRITE endpoints (allowlist + optional confirmation) ──
export const WRITE_IPC: Record<string, IPCEntry> = {
  saveGoal: {
    handler: (p) => getAPI().saveGoal(p.date, p.goal),
    validate: hasFields('date', 'goal'),
  },
  saveGoalsBatch: {
    handler: (p) => getAPI().saveGoalsBatch(p.goals),
    validate: hasFields('goals'),
  },
  deleteGoal: {
    handler: (p) => getAPI().deleteGoal(p.id),
    validate: hasFields('id'),
    requiresConfirm: true,
  },
  saveGoalReview: {
    handler: (p) => getAPI().saveGoalReview(p.date, p.message),
    validate: hasFields('date', 'message'),
  },
  createReminder: {
    handler: (p) => getAPI().createReminder(p),
    validate: hasFields('text'),
  },
  toggleReminder: {
    handler: (p) => getAPI().toggleReminder(p.id, p.done),
    validate: hasFields('id', 'done'),
  },
  deleteReminder: {
    handler: (p) => getAPI().deleteReminder(p.id),
    validate: hasFields('id'),
    requiresConfirm: true,
  },
  'connectors.sync': {
    handler: (p) => getAPI().connectors.sync(p.id),
    validate: hasFields('id'),
  },
  'connectors.markRead': {
    handler: (p) => getAPI().connectors.markRead(p.itemId, p.read),
    validate: hasFields('itemId', 'read'),
  },
  saveAiProviders: {
    handler: (p) => getAPI().saveAiProviders(p),
    validate: hasFields('providers'),
  },
  aiChatSave: {
    handler: (p) => getAPI().aiChatSave(p),
    validate: hasFields('threadDate', 'messages'),
  },
  aiChatReset: {
    handler: (p) => getAPI().aiChatReset(p.threadDate),
    validate: hasFields('threadDate'),
    requiresConfirm: true,
  },
  aiChatRenameThread: {
    handler: (p) => getAPI().aiChatRenameThread(p.threadDate, p.title),
    validate: hasFields('threadDate', 'title'),
  },
  writePlanningMd: {
    handler: (p) => getAPI().writePlanningMd(p),
    validate: hasFields('content'),
  },
  suggestGoals: {
    handler: (p) => getAPI().suggestGoals(p.date, p.context),
    validate: hasFields('date'),
  },
  parseGoalDump: {
    handler: (p) => getAPI().parseGoalDump(p.text),
    validate: hasFields('text'),
  },
}

/**
 * Dispatch an IPC call through the allowlist.
 * READ endpoints always pass. WRITE endpoints check validation + confirmation.
 */
export function dispatchIPC(
  ipcName: string,
  payload: any,
  autoApprove: boolean = false
): Promise<any> {
  // Check READ first (always allowed)
  if (READ_IPC[ipcName]) {
    return READ_IPC[ipcName](payload)
  }

  // Check WRITE (validation + confirmation)
  const entry = WRITE_IPC[ipcName]
  if (!entry) {
    console.warn(`[IPC Block] "${ipcName}" not in allowlist`)
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

export function isIPCAllowed(ipcName: string): boolean {
  return ipcName in READ_IPC || ipcName in WRITE_IPC
}
```

---

## 2. ToastContext Provider

Domain hooks should call `showToast()` via context, not return error states to the parent.

### Toast Context Implementation

**File:** NEW `src/contexts/ToastContext.tsx`

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 4000)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
```

### Wrap in App Root

**File:** `src/App.tsx` (or wherever the root provider tree is)

```tsx
import { ToastProvider } from './contexts/ToastContext'

// Wrap the router/provider tree:
<ToastProvider>
  <RouterProvider ... />
</ToastProvider>
```

### Domain Hooks Use Context

In `useGoals.ts`, `useDigest.ts`, etc.:

```ts
import { useToast } from '../contexts/ToastContext'

export function useGoals(today: string) {
  const { showToast } = useToast()
  
  const handleToggleGoal = useCallback(async (goal) => {
    try {
      await api.saveGoal(today, { ...goal, status: goal.status === 'done' ? 'active' : 'done' })
      showToast('Goal updated', 'success')
    } catch (e: any) {
      showToast(e.message || 'Failed to update goal', 'error')
    }
  }, [today, showToast])
  
  // ... rest of hook
}
```

### Toast Container Rendering

**File:** `src/pages/AiPage.tsx` (or wherever toasts render)

The toast container already exists in AiPage. Move it to the ToastProvider or keep it in AiPage but read from context:

```tsx
// In AiPage or a global layout component:
import { useToast } from '../contexts/ToastContext'

function ToastContainer() {
  const { toasts, removeToast } = useToast()
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
```

---

## 3. Break Down useGoals Further

### 3a. `useDailyGoals`

**File:** NEW `src/hooks/useDailyGoals.ts`
**~75 lines**

```ts
export function useDailyGoals(today: string) {
  // State
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalsState, setGoalsState] = useState<DataState>('loading')
  const [goalsError, setGoalsError] = useState<string | null>(null)
  const [toggleErrors, setToggleErrors] = useState<Record<number, string>>({})

  // Callbacks
  const loadGoals = useCallback(async () => { ... }, [today])
  const handleToggleGoal = useCallback(async (goal: Goal) => { ... }, [today])
  const handleAcceptSuggestion = useCallback(async (suggestion: Goal) => { ... }, [today])
  const handleDismissSuggestion = useCallback((id: string) => { ... }, [])

  // Effects
  useEffect(() => { loadGoals() }, [loadGoals])

  return {
    goals, goalsState, goalsError, toggleErrors,
    loadGoals, handleToggleGoal, handleAcceptSuggestion, handleDismissSuggestion,
  }
}
```

### 3b. `useLongTermGoals`

**File:** NEW `src/hooks/useLongTermGoals.ts`
**~75 lines**

```ts
export function useLongTermGoals() {
  // State
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([])

  // Callbacks
  const loadLongTermGoals = useCallback(async () => { ... }, [])
  const handleToggleLongTermGoal = useCallback(async (goal: LongTermGoal) => { ... }, [])
  const handleDeleteLongTermGoal = useCallback(async (id: string) => { ... }, [])
  const handleUpdateLongTermGoal = useCallback(async (goal: LongTermGoal) => { ... }, [])
  const handleSaveGoals = useCallback(async (goals: Partial<LongTermGoal>[]) => { ... }, [])

  // Effects
  useEffect(() => { loadLongTermGoals() }, [loadLongTermGoals])

  return {
    longTermGoals, loadLongTermGoals,
    handleToggleLongTermGoal, handleDeleteLongTermGoal,
    handleUpdateLongTermGoal, handleSaveGoals,
  }
}
```

### 3c. `usePlanningNotes`

**File:** NEW `src/hooks/usePlanningNotes.ts`
**~50 lines**

```ts
export function usePlanningNotes() {
  // State
  const [planningNotes, setPlanningNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [review, setReview] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Callbacks
  const loadPlanGoals = useCallback(async () => { ... }, [])
  const handleSaveNotes = useCallback(async (content: string) => { ... }, [])
  const handleSaveReview = useCallback(async (message: string) => { ... }, [])
  const handleAnalyzeDump = useCallback(async (text: string) => { ... }, [])

  // Effects
  useEffect(() => { loadPlanGoals() }, [loadPlanGoals])

  return {
    planningNotes, savingNotes, review, reviewError,
    loadPlanGoals, handleSaveNotes, handleSaveReview, handleAnalyzeDump,
  }
}
```

### 3d. `useGoalSuggestions`

**File:** NEW `src/hooks/useGoalSuggestions.ts`
**~60 lines**

```ts
export function useGoalSuggestions(today: string) {
  // State
  const [suggestions, setSuggestions] = useState<Goal[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [acceptErrors, setAcceptErrors] = useState<Record<string, string>>({})

  // Callbacks
  const handleSuggest = useCallback(async () => {
    setSuggesting(true)
    try {
      const result = await api.suggestGoals(today, await api.getGoalContext())
      setSuggestions(result)
    } catch (e: any) {
      showToast(e.message || 'Failed to generate suggestions', 'error')
    } finally {
      setSuggesting(false)
    }
  }, [today])

  return {
    suggestions, suggesting, acceptErrors,
    handleSuggest, setAcceptErrors,
  }
}
```

### Parent Hook: `useGoals` (composition)

**File:** `src/hooks/useGoals.ts`

```ts
import { useDailyGoals } from './useDailyGoals'
import { useLongTermGoals } from './useLongTermGoals'
import { usePlanningNotes } from './usePlanningNotes'
import { useGoalSuggestions } from './useGoalSuggestions'

export function useGoals(today: string) {
  const daily = useDailyGoals(today)
  const longTerm = useLongTermGoals()
  const planning = usePlanningNotes()
  const suggestions = useGoalSuggestions(today)

  return {
    // Daily
    goals: daily.goals, goalsState: daily.goalsState, goalsError: daily.goalsError,
    toggleErrors: daily.toggleErrors,
    loadGoals: daily.loadGoals,
    handleToggleGoal: daily.handleToggleGoal,
    handleAcceptSuggestion: daily.handleAcceptSuggestion,
    handleDismissSuggestion: daily.handleDismissSuggestion,
    // Long-term
    longTermGoals: longTerm.longTermGoals,
    loadLongTermGoals: longTerm.loadLongTermGoals,
    handleToggleLongTermGoal: longTerm.handleToggleLongTermGoal,
    handleDeleteLongTermGoal: longTerm.handleDeleteLongTermGoal,
    handleUpdateLongTermGoal: longTerm.handleUpdateLongTermGoal,
    handleSaveGoals: longTerm.handleSaveGoals,
    // Planning
    planningNotes: planning.planningNotes,
    savingNotes: planning.savingNotes,
    review: planning.review,
    reviewError: planning.reviewError,
    handleSaveNotes: planning.handleSaveNotes,
    handleSaveReview: planning.handleSaveReview,
    handleAnalyzeDump: planning.handleAnalyzeDump,
    // Suggestions
    suggestions: suggestions.suggestions,
    suggesting: suggestions.suggesting,
    acceptErrors: suggestions.acceptErrors,
    handleSuggest: suggestions.handleSuggest,
  }
}
```

---

## 4. Real DB Migration

### Migration SQL

**File:** NEW `src/main/migrations/001_relax_role_check.sql`

```sql
-- Phase 0: Relax ai_chat_messages role CHECK constraint
-- SQLite doesn't support ALTER CHECK, so we recreate the table

-- 1. Create new table without CHECK
CREATE TABLE IF NOT EXISTS ai_chat_messages_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_date TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  parsed_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Copy existing data
INSERT INTO ai_chat_messages_new (id, thread_date, role, content, parsed_json, created_at)
SELECT id, thread_date, role, content, parsed_json, created_at
FROM ai_chat_messages;

-- 3. Drop old table
DROP TABLE ai_chat_messages;

-- 4. Rename new table
ALTER TABLE ai_chat_messages_new RENAME TO ai_chat_messages;

-- 5. Recreate index
CREATE INDEX IF NOT EXISTS idx_ai_chat_thread_date ON ai_chat_messages(thread_date);
```

### Migration Runner

**File:** NEW `src/main/migrations/runMigrations.ts`

```ts
import type Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'

interface MigrationRow {
  version: number
  applied_at: string
}

function ensureMigrationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

function getAppliedVersions(db: Database.Database): Set<number> {
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as MigrationRow[]
  return new Set(rows.map(r => r.version))
}

export function runMigrations(db: Database.Database) {
  ensureMigrationsTable(db)
  const applied = getAppliedVersions(db)

  const migrations = [
    { version: 1, file: '001_relax_role_check.sql' },
    // Future migrations go here
  ]

  for (const m of migrations) {
    if (applied.has(m.version)) continue

    const sql = readFileSync(join(__dirname, m.file), 'utf8')
    const tx = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(m.version)
    })
    tx()

    console.log(`[Migration] Applied v${m.version}: ${m.file}`)
  }
}
```

### When Does It Execute?

**File:** `src/main.ts` — inside the DB initialization block, AFTER the `CREATE TABLE IF NOT EXISTS` statements.

Find the line where `ai_chat_messages` is created (line ~2268) and add the migration call right after all table creation:

```ts
// After all CREATE TABLE IF NOT EXISTS statements:
import { runMigrations } from './main/migrations/runMigrations'
runMigrations(db)
```

This runs on every app startup. The `schema_migrations` table tracks which migrations have been applied. Migrations are idempotent (only run once). The `CREATE TABLE IF NOT EXISTS` statements still run first (harmless if table exists), then migrations handle schema changes.

---

## 5. Fix dispatchIPC Handler Signatures

All handlers must accept a single payload object, not positional args.

### Updated Allowlist

```ts
export const READ_IPC: Record<string, (payload: any) => Promise<any>> = {
  getGoals:                (p) => getAPI().getGoals(p.date),
  getGoalsBatch:           (p) => getAPI().getGoalsBatch(p.start, p.end),
  getGoalContext:          ()  => getAPI().getGoalContext(),
  getLongtermGoals:        ()  => getAPI().getLongtermGoals(),
  getReminders:            ()  => getAPI().getReminders(),
  getDashboardAggregates:  (p) => getAPI().getDashboardAggregates(p),
  getAIUsageSummary:       (p) => getAPI().getAIUsageSummary(p.period),
  getProjects:             ()  => getAPI().getProjects(),
  readPlanningMd:          ()  => getAPI().readPlanningMd(),
  getTopicDigest:          (p) => getAPI().getTopicDigest(p?.force),
  isDigestGenerating:      ()  => getAPI().isDigestGenerating(),
  'connectors.list':       ()  => getAPI().connectors.list(),
  'connectors.items':      (p) => getAPI().connectors.items(p.id, p.opts),
  'connectors.test':       (p) => getAPI().connectors.test(p.id),
  getAiProviders:          ()  => getAPI().getAiProviders(),
  aiChatLoad:              (p) => getAPI().aiChatLoad(p.threadDate),
  aiChatListThreads:       ()  => getAPI().aiChatListThreads(),
  aiChatGetMemories:       (p) => getAPI().aiChatGetMemories(p.threadDate),
  financeGetSummary:       ()  => getAPI().financeGetSummary(),
  financeGetWallets:       ()  => getAPI().financeGetWallets(),
  financeGetSubscriptionIntelligence: () => getAPI().financeGetSubscriptionIntelligence(),
  financeGetTransactions:  (p) => getAPI().financeGetTransactions(p),
  financeGetCategories:    ()  => getAPI().financeGetCategories(),
  getSleepTrends:          (p) => getAPI().getSleepTrends(p),
}

export const WRITE_IPC: Record<string, IPCEntry> = {
  saveGoal: {
    handler: (p) => getAPI().saveGoal(p.date, p.goal),  // payload: { date, goal }
    validate: hasFields('date', 'goal'),
  },
  saveGoalsBatch: {
    handler: (p) => getAPI().saveGoalsBatch(p.goals),   // payload: { goals }
    validate: hasFields('goals'),
  },
  deleteGoal: {
    handler: (p) => getAPI().deleteGoal(p.id),           // payload: { id }
    validate: hasFields('id'),
    requiresConfirm: true,
  },
  saveGoalReview: {
    handler: (p) => getAPI().saveGoalReview(p.date, p.message),  // payload: { date, message }
    validate: hasFields('date', 'message'),
  },
  createReminder: {
    handler: (p) => getAPI().createReminder(p),          // payload: full reminder object
    validate: hasFields('text'),
  },
  toggleReminder: {
    handler: (p) => getAPI().toggleReminder(p.id, p.done),  // payload: { id, done }
    validate: hasFields('id', 'done'),
  },
  deleteReminder: {
    handler: (p) => getAPI().deleteReminder(p.id),       // payload: { id }
    validate: hasFields('id'),
    requiresConfirm: true,
  },
  'connectors.sync': {
    handler: (p) => getAPI().connectors.sync(p.id),      // payload: { id }
    validate: hasFields('id'),
  },
  'connectors.markRead': {
    handler: (p) => getAPI().connectors.markRead(p.itemId, p.read),  // payload: { itemId, read }
    validate: hasFields('itemId', 'read'),
  },
  saveAiProviders: {
    handler: (p) => getAPI().saveAiProviders(p),         // payload: full config object
    validate: hasFields('providers'),
  },
  aiChatSave: {
    handler: (p) => getAPI().aiChatSave(p),              // payload: { threadDate, messages }
    validate: hasFields('threadDate', 'messages'),
  },
  aiChatReset: {
    handler: (p) => getAPI().aiChatReset(p.threadDate),  // payload: { threadDate }
    validate: hasFields('threadDate'),
    requiresConfirm: true,
  },
  aiChatRenameThread: {
    handler: (p) => getAPI().aiChatRenameThread(p.threadDate, p.title),  // payload: { threadDate, title }
    validate: hasFields('threadDate', 'title'),
  },
  writePlanningMd: {
    handler: (p) => getAPI().writePlanningMd(p),         // payload: { content }
    validate: hasFields('content'),
  },
  suggestGoals: {
    handler: (p) => getAPI().suggestGoals(p.date, p.context),  // payload: { date, context }
    validate: hasFields('date'),
  },
  parseGoalDump: {
    handler: (p) => getAPI().parseGoalDump(p.text),      // payload: { text }
    validate: hasFields('text'),
  },
}
```

**Key change:** Every handler receives a single `payload` object. The handler destructures it and passes positional args to the underlying API. This means AI-generated cards send `{ ipc: 'saveGoal', payload: { date: '2026-07-18', goal: {...} } }` — consistent, validated, safe.

---

## 6. crypto.randomUUID Fallback

### Fallback Implementation

**File:** NEW `src/lib/uuid.ts`

```ts
/**
 * Generates a UUID v4. Uses crypto.randomUUID() when available,
 * falls back to Math.random() for sandboxed/older environments.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback: Math.random()-based UUID v4
  // NOT cryptographically secure, but sufficient for message IDs
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
```

### Usage

**File:** `src/hooks/useAiChat.ts`

```diff
+ import { generateUUID } from '../lib/uuid'

  function uid(): string {
-   return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
+   return generateUUID()
  }
```

**File:** `src/hooks/useSlashCommands.ts`

```diff
+ import { generateUUID } from '../lib/uuid'

  function makeAssistantMsg(content: string): ChatMsg {
    return {
-     id: crypto.randomUUID(),
+     id: generateUUID(),
      role: "assistant",
      content,
      timestamp: Date.now(),
    }
  }
```

Search for all other `crypto.randomUUID()` calls and replace with `generateUUID()` for consistency. Key locations:
- `src/services/chatPersistence.ts` (line 163, 177)
- `src/hooks/useSlashCommands.ts` (line 241)
- `src/components/ai/chat/SlashCommandManager.tsx`
- `src/services/customSlashCommands.ts`

---

## Updated Phase 0 Checklist

After all 6 points are addressed, the Phase 0 checklist becomes:

### Pre-Implementation
- [ ] Create `src/lib/uuid.ts` with `generateUUID()`
- [ ] Create `src/contexts/ToastContext.tsx` with provider
- [ ] Create `src/services/ipcAllowlist.ts` with full allowlist (24 READ + 16 WRITE)
- [ ] Create `src/main/migrations/001_relax_role_check.sql`
- [ ] Create `src/main/migrations/runMigrations.ts`

### Bug Fixes
- [ ] Fix `setExpandedCardId` → `setExpandedCardIds` (AiPage.tsx:1045)
- [ ] Remove `SummaryGrid` import (AiPage.tsx:8)
- [ ] Replace all `crypto.randomUUID()` with `generateUUID()`

### Role Extension
- [ ] Add `MessageRole` type to `types.ts`
- [ ] Update `ChatMsg.role` in `useAiChat.ts:11`
- [ ] Update `ChatMessage.role` in `chatPersistence.ts:5`
- [ ] Update `MessageBubbleProps.role` in `MessageBubble.tsx:10`
- [ ] Add system/tool rendering branches in `MessageBubble.tsx`
- [ ] Add system/tool CSS in `deck.css`
- [ ] Run DB migration on startup

### IPC Allowlist
- [ ] Replace dynamic dispatch in `AiPage.tsx:591` with `dispatchIPC()`
- [ ] Add `import { dispatchIPC } from '../services/ipcAllowlist'`

### Decomposition
- [ ] Create `src/hooks/useDailyGoals.ts` (~75 lines)
- [ ] Create `src/hooks/useLongTermGoals.ts` (~75 lines)
- [ ] Create `src/hooks/usePlanningNotes.ts` (~50 lines)
- [ ] Create `src/hooks/useGoalSuggestions.ts` (~60 lines)
- [ ] Create `src/hooks/useGoals.ts` (composition hook)
- [ ] Create `src/hooks/useDigest.ts` (~100 lines)
- [ ] Create `src/hooks/useConnectors.ts` (~150 lines)
- [ ] Create `src/hooks/useReminders.ts` (~100 lines)
- [ ] Create `src/hooks/useToasts.ts` (~50 lines)
- [ ] Refactor `AiPage.tsx` to use all hooks (~350 lines remaining)

### Build & Test
- [ ] `npx vite build` exits 0
- [ ] Preload rebuilds (> 60KB)
- [ ] Main rebuilds
- [ ] App launches without black screen
- [ ] All manual test items pass
