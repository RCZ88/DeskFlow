# CONTEXT_BUNDLE.md — AI Assistant Backend Pipeline

---

## Architecture

```
Renderer (AiPage)                    Main Process (main.ts)
       │                                     │
       │── ai-chat:send ──────────────────►  │  Orchestrates full pipeline:
       │                                     │    1. Gather context (goals, stats, projects...)
       │◄── provider-chunk (streaming) ────  │    2. Build system prompt with context
       │                                     │    3. Load chat history from ai_chat_messages
       │                                     │    4. Call AI provider via callProvider.cjs
       │                                     │    5. Stream chunks back to renderer
       │                                     │    6. Parse response for structured JSON
       │                                     │    7. Save all messages with parsed_json
       │◄── return result ─────────────────  │    8. Return completed message
```

## Key IPC Handlers (ALL EXISTING)

### `provider-chat-call` (main.ts:13534)
```typescript
ipcMain.handle('provider-chat-call', async (event, data: {
  provider: any;
  messages: Array<{ role: string; content: string }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}) => {
  // Uses callProvider.cjs for streaming AI call
  // Sends provider-chunk events for each delta
  // On done: sends { delta: null, done: true, full: content }
  // Returns { success: true, content, diagId, durationMs }
});
```

### `ai-chat:load` (main.ts:13574)
```typescript
// SELECT id, role, content, parsed_json, created_at FROM ai_chat_messages WHERE thread_date = ?
// Returns { success: true, messages: rows[] }
```

### `ai-chat:save` (main.ts:13583)
```typescript
// Accepts { threadDate, messages: [{ role, content, parsed_json?, timestamp? }] }
// INSERT INTO ai_chat_messages (thread_date, role, content, parsed_json, created_at)
// Returns { success: true }
```

### `ai-chat:reset` (main.ts:13600)
```typescript
// DELETE FROM ai_chat_messages WHERE thread_date = ?
```

### `ai-chat:list-threads` (main.ts:13609)
```typescript
// SELECT DISTINCT thread_date FROM ai_chat_messages ORDER BY thread_date DESC
```

### `save-goal-review` (main.ts:13726) ⚠️ BUG
```typescript
ipcMain.handle('save-goal-review', async (_event, date: string, reviewSummary: string) => {
  try {
    db!.prepare('UPDATE goals SET reviewSummary = ? WHERE date = ? AND reviewSummary IS NULL')
      .run(reviewSummary, date);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
// BUG: goals table has NO reviewSummary column. Should write to goal_reviews table.
```

### `get-goals-batch` (main.ts:13659) ✅ ALREADY EXISTS
```typescript
// SELECT * FROM goals WHERE date BETWEEN ? AND ?
// Also reads goal_reviews for review summaries
// Returns { success: true, days: GoalDay[] }
```

### `read-planning-md` (main.ts:14052)
```typescript
// Reads PLANNING.md from project path
// Returns { success: true, content: string }
```

### `get-longterm-goals` (main.ts:13708)
```typescript
// SELECT * FROM goals WHERE period = 'longterm' ORDER BY priority ASC
// Returns { success: true, goals: rows[] }
```

### `get-goal-context` (main.ts:14087)
```typescript
// Returns 7-day goal context data for AI suggestions
```

### `get-topic-digest` (main.ts:12880)
```typescript
// Generates or returns cached topic digest from ai_briefs table
// Returns { success: true, topics: TopicDigestItem[] }
```

### `is-digest-generating` (main.ts:12878)
```typescript
// Returns boolean _digestGenerationInProgress
```

## Preload Bindings (src/preload.ts)

All relevant preload bindings:

| Binding | Line | Channel |
|---|---|---|
| `providerChatCall(data)` | 761 | `provider-chat-call` |
| `onProviderChunk(cb)` | 765 | `provider-chunk` event |
| `aiChatLoad(threadDate)` | 755 | `ai-chat:load` |
| `aiChatSave(data)` | 756 | `ai-chat:save` |
| `aiChatReset(threadDate)` | 757 | `ai-chat:reset` |
| `aiChatListThreads()` | 758 | `ai-chat:list-threads` |
| `getGoals(date)` | 773 | `get-goals` |
| `getGoalsBatch(start, end)` | 774 | `get-goals-batch` ✅ EXISTS |
| `saveGoal(date, goal)` | — | `save-goal` |
| `saveGoalReview(date, msg)` | 778 | `save-goal-review` |
| `getGoalContext()` | 779 | `get-goal-context` |
| `suggestGoals(date, ctx)` | 782 | `suggest-goals` |
| `getLongtermGoals()` | 775 | `get-longterm-goals` |
| `parseGoalDump(text)` | 781 | `parse-goal-dump` |
| `readPlanningMd()` | 800 | `read-planning-md` |
| `writePlanningMd(content)` | 801 | `write-planning-md` |
| `getTopicDigest(opts)` | 188 | `get-topic-digest` |
| `isDigestGenerating()` | 189 | `is-digest-generating` |
| `connectors.list/add/remove/test/sync/items/status` | 804 | `connectors:*` |

## DB Schema

### ai_chat_messages
```sql
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_date TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  parsed_json TEXT,  -- ← STRUCTURED OUTPUT PARSING COLUMN
  created_at TEXT DEFAULT (datetime('now'))
);
```

### goal_reviews
```sql
CREATE TABLE IF NOT EXISTS goal_reviews (
  date TEXT PRIMARY KEY,
  review_summary TEXT,
  suggestions TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);
```

### goals
```sql
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  period TEXT,
  date TEXT,
  status TEXT,
  source TEXT,
  ...
);
```

## Types

```typescript
interface Goal {
  id: string;
  title: string;
  status: 'active' | 'done' | 'missed';
  category: string;
  period: string;
  date: string;
  source: 'user' | 'ai' | 'planning';
  links: string[];
}

interface GoalDay {
  date: string;
  goals: Goal[];
  reviewSummary?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parsed_json?: string;   // ← structured output
  timestamp?: string;
}
```

## Key Files

| File | Purpose |
|---|---|
| `src/main.ts` (21696 lines) | ALL IPC handlers, DB init, provider calls |
| `src/preload.ts` (971 lines) | IPC bridge between renderer and main |
| `src/services/providers/callProvider.cjs` | HTTP client for AI providers |
| `src/pages/AiPage.tsx` (517 lines) | Frontend page that calls these IPC endpoints |
