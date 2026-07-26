# BACKEND_PROMPT.md — AI Assistant Backend: Context Assembly + Structured Output Pipeline

---

## RAW REQUEST (verbatim)

> "we need a full system on this that works and that actually has like the proper parsing of the ui and has the user be able to input stuff. and like make sure its the most interactible for the user and the best user experience. meaning it should provide the best experience by having the multiple different parsing and ui for each of the different features and the list of the pages and like the contents of the parsed should be different for each like feature of addition of something or like adjusting of the other. also, for all backend for like the connectors, the planning, the daily digest. all of them should also work brilliantly."

> "check if the backend still exist for the ai assistant main thing where it should have access to like all of the components of the app and like theres the ui that comes from the parsing of the ai output"

---

## CONTEXT BUNDLE REFERENCE

Read `agent/docs/ai-page-revamp/CONTEXT_BUNDLE.md` FIRST. It contains:
- 28-file inventory of the AiPage component tree
- All 14 IPC endpoints used by AiPage (ALL REAL)
- Full TypeScript types (Goal, LongTermGoal, ChatMessage, TopicDigestItem, ChatPanelProps)

The existing PROMPT.md (v2) at the same path contains the frontend spec (10 UI renderers, interactive UX, context bundling for chat). This BACKEND_PROMPT.md is the **backend implementation counterpart** — the IPC handlers and server-side logic the frontend needs.

---

## THE PROBLEM — Backend Has Everything BUT No Pipeline Connects It

The backend for the AI Assistant is **100% real**. Every IPC handler exists. But the **pipeline that connects them** does not:

1. **`provider-chat-call`** (main.ts:13534) — REAL streaming AI call. Takes messages, streams chunks via `provider-chunk` events, returns full response. Works perfectly in isolation.

2. **`ai-chat:load/save/reset/list-threads`** (main.ts:13574-13609) — REAL persistence to `ai_chat_messages` table. `parsed_json` column exists. Works perfectly.

3. **Goal/digest/planning/connector systems** — ALL REAL (see Backend Audit below).

4. **BUT: No pipeline ties them together.** The AiPage frontend (`handleChatSend` is `console.log`) calls zero IPC channels for chat. The `provider-chat-call` is never invoked during chat. The `parsed_json` column is never written by any chat interaction. The AI system prompt has zero app context.

**What's missing is ONE central IPC handler** that orchestrates the full pipeline:
```
user sends message
  → AiPage calls handler with message content
    → handler gathers context from ALL app data sources (goals, stats, projects, etc.)
    → handler builds system prompt with bundled context
    → handler loads chat history
    → handler calls AI with system + history + user message
    → handler receives streaming response
    → handler parses response for structured JSON output
    → handler saves all messages to DB with parsed_json
    → handler returns completed response
  → AiPage renders parsed UI cards
```

Additionally, `save-goal-review` has a bug — it writes `reviewSummary` to the `goals` table but that column doesn't exist there. It should write to the `goal_reviews` table.

---

## BACKEND AUDIT — ALL IPC HANDLERS (30+ verified real)

| IPC Channel | File | Line | Status | Notes |
|---|---|---|---|---|
| `provider-chat-call` | main.ts | 13534 | ✅ REAL | Streaming AI via callProvider.cjs, sends provider-chunk events |
| `provider-chat-basic` | main.ts | 13555 | ✅ REAL | Non-streaming version for fallback |
| `ai-chat:load` | main.ts | 13574 | ✅ REAL | Reads ai_chat_messages by thread_date |
| `ai-chat:save` | main.ts | 13583 | ✅ REAL | Writes messages with parsed_json |
| `ai-chat:reset` | main.ts | 13600 | ✅ REAL | Deletes thread history |
| `ai-chat:list-threads` | main.ts | 13609 | ✅ REAL | Lists all threads |
| `get-goals` | main.ts | — | ✅ REAL | Queries goals by date |
| `save-goal` | main.ts | — | ✅ REAL | Upserts goal |
| `save-goal-review` | main.ts | 13726 | ⚠️ BUG | UPDATEs goals.reviewSummary — column doesn't exist on goals table |
| `get-longterm-goals` | main.ts | 13708 | ✅ REAL | Queries goals WHERE period='longterm' |
| `delete-goal` | main.ts | 13717 | ✅ REAL | Deletes goal by id |
| `read-planning-md` | main.ts | 14052 | ✅ REAL | Reads PLANNING.md file |
| `write-planning-md` | main.ts | 14062 | ✅ REAL | Writes PLANNING.md file |
| `get-goal-context` | main.ts | 14087 | ✅ REAL | Returns context data for goal suggestions |
| `suggest-goals` | main.ts | 14098 | ✅ REAL | AI-suggests goals using provider |
| `parse-goal-dump` | main.ts | 14212 | ✅ REAL | AI-parses text into structured goals |
| `get-topic-digest` | main.ts | 12880 | ✅ REAL | Generates/returns cached topic digest |
| `is-digest-generating` | main.ts | 12878 | ✅ REAL | Returns _digestGenerationInProgress flag |
| `connectors:list` | main.ts | 13827 | ✅ REAL | Lists all connectors |
| `connectors:add` | main.ts | 13844 | ✅ REAL | Creates connector |
| `connectors:remove` | main.ts | 13861 | ✅ REAL | Deletes connector |
| `connectors:test` | main.ts | 13871 | ✅ REAL | Tests connector connection |
| `connectors:sync` | main.ts | 13919 | ✅ REAL | Syncs connector items |
| `connectors:items` | main.ts | 14004 | ✅ REAL | Lists connector items with filters |
| `connectors:status` | main.ts | 14029 | ✅ REAL | Returns connector status |
| `get-goals-batch` | preload.ts | — | ❌ MISSING | NOT in preload or main.ts — needed for history |
| `save-goal-suggestion` | — | — | ❌ MISSING | NOT in preload or main.ts — needed for goal accept |

All non-streaming handlers return `{ success: true/false, ...data }` or `{ success: true/false, error: string }`.

---

## THE MANDATE — Backend Implementation

### Task A: Create `ai-chat:send` — The Central Chat Pipeline Handler

**Location:** `src/main.ts` (new IPC handler, ~80-120 lines)

This is the single most important backend piece. It orchestrates the entire AI chat flow.

**Signature:**
```typescript
ipcMain.handle('ai-chat:send', async (event, data: {
  threadDate: string;    // date string for grouping conversations (YYYY-MM-DD)
  message: string;        // the user's raw text message
  providerId?: string;    // optional provider override
}) => {
```

**Pipeline (in order):**
1. **Load chat history** — `SELECT * FROM ai_chat_messages WHERE thread_date = ? ORDER BY created_at ASC`. Limit to last N messages (e.g., 50) to manage context window.
2. **Gather app context** — Call internal functions (NOT IPC, just direct DB/service calls) to build a context bundle:
   - `getGoals(today)` — today's goals with status
   - `getDashboardAggregates('today')` — today's tracked time (productive/neutral/distracting)
   - `getGoalContext(today)` — 7-day goal context
   - `getLongtermGoals()` — long-term goals
   - `readPlanningMd()` — PLANNING.md content
   - `getAIUsageSummary()` — AI token usage
   - `getProjects()` — active projects
3. **Build system prompt** — Construct a system message that contains:
   ```
   You are DeskFlow AI, an assistant integrated into the user's productivity tracker.
   
   ## Current App State
   Goals today: {formatted from getGoals}
   Long-term goals: {formatted from getLongtermGoals}
   Today's tracked time: {formatted from getDashboardAggregates}
   Current projects: {formatted from getProjects}
   AI usage today: {formatted from getAIUsageSummary}
   Planning notes: {formatted from readPlanningMd}
   Goal context (7-day): {formatted from getGoalContext}
   
   ## App Pages You Can Discuss
   (List from PROMPT.md §C — all pages with their data categories)
   
   ## Your Output Format
   You MUST respond in the following JSON structure:
   {
     "type": "general_chat" | "goal_suggestion" | "plan_update" | "stats_summary" | "action_list" | "digest_item" | "chart_data" | "error",
     "content": "Your natural language response text",
     "data": { ... type-specific structured data ... }
   }
   
   For type "general_chat": content is your plain text response, data is empty.
   For type "goal_suggestion":
     data: { goals: [{ title, category, reason }], source: "ai" }
   For type "plan_update":
     data: { changes: [{ action: "add"|"modify"|"complete", goal: { title, priority, category } }] }
   For type "stats_summary":
     data: { metrics: [{ label, value, change, icon }], period: "today"|"week"|"month" }
   For type "action_list":
     data: { actions: [{ label, description, priority }] }
   For type "chart_data":
     data: { chartType: "bar"|"line"|"pie", labels: string[], datasets: [{ label, data, color }] }
   ```
4. **Call AI** — Call the provider directly (reuse the `callProvider` import from `provider-chat-call`):
   - Messages array: system prompt (with context), then chat history, then user message
   - Stream chunks via `event.sender.send('provider-chunk', { delta, ... })`
   - Forward the `done` event with the full response
5. **Parse response** — Try `JSON.parse` on the response content:
   - If valid JSON matching the schema → store as `parsed_json`
   - If not valid JSON → fall through with `parsed_json: null`
   - If the type is `goal_suggestion`, ALSO save suggestions to `goal_suggestions` table
   - If the type is `plan_update`, ALSO update the goals/planning accordingly
6. **Save to DB** — Save ALL messages in the exchange (user message + assistant response) to `ai_chat_messages` via the existing insert logic. User message: `parsed_json = null`. Assistant response: `parsed_json = JSON.stringify(parsedData)`.
7. **Return** — Return the final message object:
   ```json
   {
     "success": true,
     "message": {
       "id": newMessageId,
       "role": "assistant",
       "content": "response text",
       "parsed_json": { "type": "...", "content": "...", "data": {...} },
       "created_at": timestamp
     }
   }
   ```

**Edge cases to handle:**
- **No AI provider configured** → return `{ success: false, error: 'No AI provider configured' }`
- **Stream error mid-response** → send error chunk, save partial response to DB with error flag
- **Empty message** → return early, don't call AI
- **Context bundle too large** → truncate/summarize before sending to AI
- **Thread doesn't exist** → create it (first message in a new thread)
- **parsed_json validation** → wrap in try/catch, keep raw text if parse fails

### Task B: Fix `save-goal-review` Bug

**Current code (main.ts:13726):**
```typescript
ipcMain.handle('save-goal-review', async (_event, date: string, reviewSummary: string) => {
  try {
    db!.prepare('UPDATE goals SET reviewSummary = ? WHERE date = ? AND reviewSummary IS NULL').run(reviewSummary, date);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
```

**Problem:** `goals` table does NOT have a `reviewSummary` column. This UPDATE silently succeeds (SQLite ignores unknown columns... actually SQLite would throw an error since the column doesn't exist).

**Fix:** Write to the `goal_reviews` table instead:
```typescript
ipcMain.handle('save-goal-review', async (_event, date: string, reviewSummary: string) => {
  try {
    db!.prepare('INSERT INTO goal_reviews (date, review, created_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(date) DO UPDATE SET review = ?, updated_at = datetime(\'now\')').run(date, reviewSummary, reviewSummary);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
```

Also add a `get-goal-review` handler to retrieve previous reviews:
```typescript
ipcMain.handle('get-goal-review', async (_event, date: string) => {
  try {
    const row = db!.prepare('SELECT review, created_at, updated_at FROM goal_reviews WHERE date = ?').get(date);
    return { success: true, review: row || null };
  } catch (err: any) {
    return { success: false, error: err.message, review: null };
  }
});
```

### Task C: Create `get-goals-batch` IPC Handler

**Why:** ReflectFeed needs multiple days of goal history (currently only gets 1 day).

**Signature:**
```typescript
ipcMain.handle('get-goals-batch', async (_event, startDate: string, endDate: string) => {
  // Returns goals grouped by date within the range
  // Also returns reviews for each date
});
```

**Implementation:**
```sql
SELECT g.*, gr.review as reviewSummary
FROM goals g
LEFT JOIN goal_reviews gr ON gr.date = g.date
WHERE g.date >= ? AND g.date <= ?
ORDER BY g.date ASC, g.created_at ASC
```

Group by date in JS and return `{ success: true, days: GoalDay[] }` where `GoalDay = { date, goals: Goal[], reviewSummary?: string }`.

### Task D: Create `save-goal-suggestion` IPC Handler

**Why:** When AI suggests goals and user clicks "Accept" in the UI, the goal needs to be saved to the goals table.

**Signature:**
```typescript
ipcMain.handle('save-goal-suggestion', async (_event, data: {
  title: string;
  category: string;
  date: string;
  source: 'ai';
  reason?: string;
}) => {
  // Insert into goals table with source='ai'
  // Return the created goal
});
```

**Implementation:**
```typescript
const id = generateId();
db!.prepare('INSERT INTO goals (id, title, category, date, status, source, period, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))')
  .run(id, data.title, data.category, data.date, 'active', 'ai', 'daily');
return { success: true, goal: { id, ...data, status: 'active', period: 'daily' } };
```

### Task E: Add Preload Bindings for ALL New IPC Channels

**File:** `src/preload.ts` (add to the `deskflowAPI` object)

```typescript
aiChatSend: (data: { threadDate: string; message: string; providerId?: string }) =>
  ipcRenderer.invoke('ai-chat:send', data),

getGoalsBatch: (startDate: string, endDate: string) =>
  ipcRenderer.invoke('get-goals-batch', startDate, endDate),

saveGoalSuggestion: (data: { title: string; category: string; date: string; source: 'ai'; reason?: string }) =>
  ipcRenderer.invoke('save-goal-suggestion', data),

getGoalReview: (date: string) =>
  ipcRenderer.invoke('get-goal-review', date),
```

### Task F: Provider-Chunk Event Forwarding for `ai-chat:send`

The `provider-chat-call` handler (main.ts:13534) sends `provider-chunk` events. The new `ai-chat:send` handler needs to do the same. Use the same pattern:

```typescript
const { callProvider: call } = require('./services/providers/callProvider.cjs');
const result = await call(
  cfg,
  { model, messages, maxTokens, temperature },
  {
    onChunk: (delta: string) => {
      event.sender.send('provider-chunk', { delta, providerId: cfg.id, threadDate: data.threadDate });
    },
    pathTag: 'B-chat',
  },
);
event.sender.send('provider-chunk', {
  delta: null, done: true, providerId: cfg.id,
  full: result.content, diagId: result.diagId, durationMs: result.durationMs,
  threadDate: data.threadDate,  // ← unique to ai-chat:send, helps renderer identify which thread
});
```

### Task G: DB Schema — Verify `goal_reviews` Table Exists

Check the schema initialization in `initializeStorage()` for:
```sql
CREATE TABLE IF NOT EXISTS goal_reviews (
  date TEXT PRIMARY KEY,
  review TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);
```

If it doesn't exist, add the CREATE TABLE statement to the schema initialization section.

---

## Preload API — Complete List of Endpoints the Frontend Needs

The AiPage frontend calls these via `window.deskflowAPI!`:

| Method | IPC Channel | Status |
|---|---|---|
| `getGoals(date)` | `get-goals` | ✅ Exists |
| `saveGoal(date, goal)` | `save-goal` | ✅ Exists |
| `saveGoalReview(date, msg)` | `save-goal-review` | ⚠️ Fix bug |
| `getGoalContext()` | `get-goal-context` | ✅ Exists |
| `suggestGoals(date, ctx)` | `suggest-goals` | ✅ Exists |
| `readPlanningMd()` | `read-planning-md` | ✅ Exists |
| `writePlanningMd(content)` | `write-planning-md` | ✅ Exists |
| `getLongtermGoals()` | `get-longterm-goals` | ✅ Exists |
| `parseGoalDump(text)` | `parse-goal-dump` | ✅ Exists |
| `getTopicDigest(opts)` | `get-topic-digest` | ✅ Exists |
| `isDigestGenerating()` | `is-digest-generating` | ✅ Exists |
| `aiChatLoad(threadDate)` | `ai-chat:load` | ✅ Exists |
| `aiChatSave(data)` | `ai-chat:save` | ✅ Exists |
| `aiChatReset(threadDate)` | `ai-chat:reset` | ✅ Exists |
| `aiChatListThreads()` | `ai-chat:list-threads` | ✅ Exists |
| `providerChatCall(data)` | `provider-chat-call` | ✅ Exists |
| `connectors.list()` | `connectors:list` | ✅ Exists |
| `connectors.add(c)` | `connectors:add` | ✅ Exists |
| `connectors.remove(id)` | `connectors:remove` | ✅ Exists |
| `connectors.test(id)` | `connectors:test` | ✅ Exists |
| `connectors.sync(id)` | `connectors:sync` | ✅ Exists |
| `connectors.items(id)` | `connectors:items` | ✅ Exists |
| `connectors.status(id)` | `connectors:status` | ✅ Exists |
| **`aiChatSend(data)`** | **`ai-chat:send`** | ❌ NEED TO ADD |
| **`getGoalsBatch(start, end)`** | **`get-goals-batch`** | ❌ NEED TO ADD |
| **`saveGoalSuggestion(data)`** | **`save-goal-suggestion`** | ❌ NEED TO ADD |
| **`getGoalReview(date)`** | **`get-goal-review`** | ❌ NEED TO ADD |

---

## CONSTRAINTS

1. **Don't modify existing working IPC handlers** — *except* `save-goal-review` which needs the bug fix.
2. **Don't move or rename existing files** — all changes happen inline in `main.ts` and `preload.ts`.
3. **All new IPC handlers must follow the existing error pattern**: `{ success: true/false, ...data }` or `{ success: false, error: string }`.
4. **The `provider-chunk` event** is the streaming contract — must include `{ delta: string }` for each chunk and `{ delta: null, done: true, full: string }` for completion.
5. **DB access** uses the existing `db!` better-sqlite3 instance. New queries use `db!.prepare(sql).run()` / `.get()` / `.all()`.
6. **Goal ID generation** uses the existing pattern — either `crypto.randomUUID()` or a timestamp-based ID.
7. **Thread date** format is `YYYY-MM-DD` (used by existing `ai-chat:load/save` handlers).
8. **Files are CRLF** — preserve line endings.
9. **All new code must go in `main.ts`** — no new service files for this backend work.

---

## VERIFICATION

After implementation, these must all work:

1. `ai-chat:send` with a simple "hello" → returns `{ type: "general_chat", content: "..." }` with parsed_json in DB
2. `ai-chat:send` with "suggest goals for today" → returns `{ type: "goal_suggestion", data: { goals: [...] } }`
3. `ai-chat:send` context bundle contains real data (goals, stats, projects) from the DB
4. Streaming chunks arrive in real-time via `provider-chunk` events
5. Full conversation is saved to `ai_chat_messages` with correct `parsed_json`
6. `save-goal-review` writes to `goal_reviews` table instead of `goals.reviewSummary`
7. `get-goals-batch` returns multiple days of goals with reviews
8. `save-goal-suggestion` creates a goal with `source='ai'` in the `goals` table
9. All preload bindings compile and are callable from renderer
10. Build passes: `node scripts/build.mjs`
