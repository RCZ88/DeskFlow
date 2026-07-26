# Backend Implementation Gaps — Context Bundle

> Self-contained reference for the target AI. All code structure, IPC endpoints, DB schemas, and design tokens needed to implement the backend fixes.

## Project Architecture

- **Runtime:** Electron with `better-sqlite3` for SQLite, JSON files for agent context
- **IPC:** `ipcRenderer.invoke()` in preload → `ipcMain.handle()` in `src/main.ts` (compiled JS)
- **Services:** `src/services/*.ts` — TypeScript classes, instantiated in main handlers
- **Settings:** Two systems: `deskflow-prefs.json` (userPreferences object) and `external_settings` SQLite table
- **DB:** Single `deskflow.db` file at `app.getPath('userData')`, plus per-project `rag-index.sqlite`

## File Index

| File | Path | Role |
|------|------|------|
| main.ts | `src/main.ts` | All IPC handlers (compiled JS, ~10979 lines) |
| preload.ts | `src/preload.ts` | IPC bridge exposed as `window.deskflowAPI` |
| IDEProjectsPage.tsx | `src/pages/IDEProjectsPage.tsx` | Frontend showing DORA metrics |
| CompactionService.ts | `src/services/CompactionService.ts` | Session summarization with DefaultLLMProvider placeholder |
| RAGService.ts | `src/services/RAGService.ts` | Semantic search with placeholder vector comparison |
| rag-schema.sql | `src/db/rag-schema.sql` | RAG DB schema (messages, embeddings, FTS5) |
| context.ts (types) | `src/types/context.ts` | RAGSearchResult, RAGMessage, QueryOptions types |

---

## Gap 1: DORA Metrics

### IPC: `get-dora-metrics`

**preload.ts:193:**
```ts
getDORAMetrics: (projectId: string, period?: 'week' | 'month') =>
  ipcRenderer.invoke('get-dora-metrics', projectId, period),
```

**main.ts:7392-7482 — Full handler:**
```ts
electron_1.ipcMain.handle('get-dora-metrics', (event, projectId, period = 'month') => {
    if (useJson) return null;
    try {
        const days = period === 'week' ? 7 : 30;
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const commitStats = db!.prepare(`
            SELECT COUNT(*) as total_commits, SUM(additions) as total_additions,
                   SUM(deletions) as total_deletions, COUNT(DISTINCT DATE(date)) as active_days,
                   MIN(date) as first_commit, MAX(date) as last_commit
            FROM commits WHERE project_id = ? AND date >= ?
        `).get(projectId, cutoffDate) as any;

        if (!commitStats || commitStats.total_commits === 0) {
            return { projectId, period, deploymentFrequency: 0, leadTimeHours: 0,
                     changeFailureRate: 0, meanTimeToRecoveryHours: 0, level: 'low',
                     commitCount: 0, totalLines: 0, activeDays: 0,
                     message: 'No commits found in this period' };
        }

        const deployments = db!.prepare(`
            SELECT COUNT(*) as count FROM commits
            WHERE project_id = ? AND date >= ?
            AND (message LIKE '%deploy%' OR message LIKE '%release%' OR message LIKE '%publish%')
        `).get(projectId, cutoffDate) as any;
        const deploymentFrequency = (deployments?.count || 0) / days;
        const totalLines = (commitStats.total_additions || 0) + (commitStats.total_deletions || 0);
        // ... level determination, leadTimeHours ...

        // HARDCODED TO 0:
        const changeFailureRate = 0; // Would need integration with incident tracking
        const meanTimeToRecoveryHours = 0; // Would need integration with incident tracking

        return { projectId, period, deploymentFrequency, leadTimeHours,
                 changeFailureRate, meanTimeToRecoveryHours, level, ... };
    } catch (err) { return null; }
});
```

**DB Schema (main.ts:1636-1649):**
```sql
CREATE TABLE IF NOT EXISTS dora_metrics (
  id TEXT PRIMARY KEY, project_id TEXT, period TEXT, start_date DATE, end_date DATE,
  deployment_frequency REAL, lead_time_hours REAL, change_failure_rate REAL,
  mean_time_to_recovery_hours REAL, level TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**commits table** — queried for deployment frequency, also available for failure rate calculation:
- Columns: `id, project_id, message, author, date, additions, deletions, branch`
- Already queried for deploy-like commits via message pattern matching

**Return shape:**
```ts
{
  projectId: string, period: string, deploymentFrequency: number,
  leadTimeHours: number, changeFailureRate: number,
  meanTimeToRecoveryHours: number, level: 'elite' | 'high' | 'medium' | 'low',
  commitCount: number, totalLines: number, activeDays: number
}
```

---

## Gap 2: LLM Summarization

### Interface (CompactionService.ts:459-465)
```ts
export interface LLMProvider {
  summarize(prompt: string): Promise<{
    success: boolean;
    summary?: string;
    error?: string;
  }>;
}
```

### Placeholder (CompactionService.ts:471-512)
```ts
class DefaultLLMProvider implements LLMProvider {
  async summarize(prompt: string) {
    console.log('[LLM] Summarization placeholder - returning mock summary');
    const mockSummary = `# Summary\nThis is a placeholder...`;
    return { success: true, summary: mockSummary };
  }
}
```

### How it's called (CompactionService.ts:271-293)
```ts
private async summarizeMessages(messages: RAGMessage[]) {
    const messageText = messages.map(msg =>
      `[${msg.timestamp.toISOString()}] ${msg.role.toUpperCase()}:\n${msg.content}`
    ).join('\n\n---\n\n');
    const prompt = this.createSummarizationPrompt(messageText, messages.length);
    const response = await this.llmProvider.summarize(prompt);
}
```

### API Key Storage

**OpenRouter key** (main.ts:7555-7572):
```ts
function getOpenRouterApiKey(): string {
    let prefsKey = userPreferences?.openrouterApiKey || '';
    prefsKey = prefsKey.trim().replace(/^["']|["']$/g, '');
    if (prefsKey) return prefsKey;
    let envKey = process.env.OPENROUTER_API_KEY || '';
    envKey = envKey.trim().replace(/^["']|["']$/g, '');
    if (envKey) return envKey;
    return '';
}
```

**Preferences storage** (main.ts:2986-3026) — `deskflow-prefs.json`:
```ts
interface UserPreferences { [key: string]: any; }
let userPreferences: UserPreferences = {};
// Loaded from: userDataPath/deskflow-prefs.json
// Set via: ipcMain.handle('set-preference', (event, key, value) => {
//     userPreferences[key] = value; savePreferences(); return true;
// });
```

### OpenRouter API Config (main.ts:7594-7601)
```ts
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS = [
    'liquid/lfm-2.5-1.2b-instruct:free',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-sonnet',
    'openai/gpt-4o-mini',
];
```

### Existing test-openrouter-key handler (main.ts:7687-7755)
Shows the exact fetch pattern for calling OpenRouter:
```ts
const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://deskflow.app',
        'X-Title': 'DeskFlow',
    },
    body: JSON.stringify({
        model: OPENROUTER_MODELS[0],
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
    }),
});
const data = await response.json();
// data.choices[0].message.content
```

**Key insight:** The OpenRouter fetch pattern already exists in main.ts. The `DefaultLLMProvider` in CompactionService.ts (renderer-side) needs to either call an IPC channel that invokes OpenRouter, or be moved to main process.

---

## Gap 3: RAG Semantic Search

### DB Schema (rag-schema.sql)

**messages table:**
```sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, timestamp INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL, tokens INTEGER NOT NULL,
  embedding BLOB,           -- Float32Array serialized
  metadata TEXT,             -- JSON
  created_at INTEGER NOT NULL, content_length INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

**embeddings table:**
```sql
CREATE TABLE IF NOT EXISTS embeddings (
  message_id TEXT PRIMARY KEY, embedding BLOB NOT NULL,
  model TEXT NOT NULL, created_at INTEGER NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

**FTS5 virtual table (keyword search works):**
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  id UNINDEXED, content, metadata, content=messages, content_rowid=rowid, tokenize='porter'
);
```

### Types (src/types/context.ts)

```ts
export interface RAGSearchResult {
  message: RAGMessage;
  score: number;      // Relevance score (0-1)
  type: 'semantic' | 'fulltext';
  matchedText?: string;
}

export interface RAGMessage {
  id: string; sessionId: string; timestamp: Date; role: MessageRole;
  content: string; tokens: number; metadata?: MessageMetadata;
  embedding?: Float32Array | null; createdAt: Date;
}
```

### semanticSearch placeholder (RAGService.ts:347-399)

```ts
public async semanticSearch(
  queryEmbedding: Float32Array, options: QueryOptions = {}
): Promise<ServiceResponse<RAGSearchResult[]>> {
    // ...
    // SIMPLE COSINE SIMILARITY PLACEHOLDER:
    let query = `SELECT m.*, CAST(SUM(CAST(SUBSTR(HEX(m.embedding), i*2-1, 2) AS INTEGER)) AS REAL) as similarity
                 FROM messages m WHERE m.embedding IS NOT NULL ...`;
    const rows = stmt.all(...params);
    const results = rows.map(row => ({
        message: this.rowToMessage(row),
        score: row.similarity ? Math.min(1.0, row.similarity / 1000) : 0,
        type: 'semantic',
    }));
    return { success: true, data: results, timestamp: new Date() };
}
```

### Embedding storage pattern (RAGService.ts:118-145)

```ts
// Store: Buffer.from(embedding.buffer)
stmt.run(..., embedding ? Buffer.from(embedding.buffer) : null, ...);

// Retrieve: new Float32Array(Buffer.from(row.embedding))
embedding: row.embedding ? new Float32Array(Buffer.from(row.embedding)) : null,
```

### Full-text search (for reference, RAGService.ts:284-336)

FTS5 keyword search IS fully implemented and works. Only semantic search is a placeholder.

---

## Gap 4: Dead IPC Handlers

All 10 channels exist ONLY in preload.ts. NO handlers in main.ts. NONE are called from any frontend component (confirmed by grep).

### preload.ts definitions

```ts
// Workspace TODOs (lines 302-306):
getWorkspaceTodos: (projectId?: string) => ipcRenderer.invoke('get-workspace-todos', projectId),
addWorkspaceTodo: (data: { projectId?: string; text: string; priority?: string }) => ipcRenderer.invoke('add-workspace-todo', data),
toggleWorkspaceTodo: (todoId: string) => ipcRenderer.invoke('toggle-workspace-todo', todoId),
deleteWorkspaceTodo: (todoId: string) => ipcRenderer.invoke('delete-workspace-todo', todoId),

// Prompt Templates (lines 308-312):
getPromptTemplates: (projectId?: string) => ipcRenderer.invoke('get-prompt-templates', projectId),
savePromptTemplate: (data: { id?: string; projectId?: string; name: string; content: string; category?: string; isFormattingTemplate?: boolean }) =>
  ipcRenderer.invoke('save-prompt-template', data),
deletePromptTemplate: (templateId: string) => ipcRenderer.invoke('delete-prompt-template', templateId),

// External Tracker (lines 349, 352, 364):
addExternalTime: (activityId: string, durationMinutes: number) => ipcRenderer.invoke('add-external-time', { activityId, durationMinutes }),
updateActivityChartPreference: (activityId: string, chartType: string) => ipcRenderer.invoke('update-activity-chart-preference', activityId, chartType),
getHourDetail: (date: string, hour: number) => ipcRenderer.invoke('get-hour-detail', date, hour),
```

---

## Design Tokens

- **IPC return pattern:** `{ success: boolean, data?: any, error?: string }` or raw value
- **Error handling:** Try/catch in handler, return `{ success: false, error: msg }` or `null`
- **DB pattern:** `better-sqlite3` with `db.prepare(sql).get(...)` / `.all(...)` / `.run(...)`
- **Settings pattern:** Two-tier — `userPreferences` (JSON file, fast) and `external_settings` (SQLite, persistent)
- **Frontend IPC call:** `const result = await window.deskflowAPI!.methodName(args)`
- **TypeScript types for deskflowAPI:** Defined in `src/App.tsx:160-200` as interface properties
- **RAGService lifecycle:** Constructed with `projectPath`, then `await initialize()`, uses per-project SQLite at `.apptracker/context/rag-index.sqlite`
