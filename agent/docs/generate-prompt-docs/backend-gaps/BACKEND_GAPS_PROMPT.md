# Backend Implementation Gaps — Prompt

> Generated 2026-05-28 by maintain-context audit.
> Target: Implement real backend logic for features currently using mocks/placeholders.

## Raw Request

"Fix the features that have fake backend implementations. DORA metrics return hardcoded 0, LLM summarization returns a hardcoded mock summary, RAG semantic search is a placeholder. Implement real logic for all of them."

## Context

The codebase uses a hybrid storage model:
- **SQLite** (via `better-sqlite3`) for structured data: activity_log, terminal_sessions, projects, settings
- **JSON files** in `agent/` directory for ProblemsService, RequestsService, ChecklistService
- **IPC** via `ipcMain.handle` / `ipcRenderer.invoke` with channels bridged through `src/preload.ts`

All IPC handlers are registered in `src/main.ts`. Service classes live in `src/services/`.

---

## Gap 1: DORA Metrics — Change Failure Rate & MTTR Hardcoded to 0

**Location:** `src/main.ts:7459-7463`

```ts
// Change failure rate (placeholder - would need incident data)
const changeFailureRate = 0; // Would need integration with incident tracking

// MTTR (placeholder)
const meanTimeToRecoveryHours = 0; // Would need integration with incident tracking
```

**What it should do:** These are two of the four DORA metrics shown on the IDE dashboard. `changeFailureRate` should calculate the percentage of deployments that caused failures. `meanTimeToRecoveryHours` should calculate average time to recover from failures.

**Backend pattern to follow:** The other two DORA metrics (deploymentFrequency, leadTimeForChanges) already have real implementations at `src/main.ts:7442-7457`. They query the `terminal_sessions` table:

```ts
// Deployment frequency from terminal sessions
const deploymentFrequency = ...
// Lead time for changes
const leadTimeForChanges = ... // Simplified calculation
```

**IPC channel:** `get-dora-metrics` — invoked via `window.deskflowAPI.getDORAMetrics()`

**Proposed approach:** Query existing tables (`terminal_sessions`, `activity_log`, or add a `deployments` table) to derive these metrics. The data sources for incident tracking could be:
- Terminal sessions with error exit codes
- A new `incidents` table
- Activity logs showing error patterns

---

## Gap 2: LLM Summarization — Returns Hardcoded Mock Summary

**Location:** `src/services/CompactionService.ts:471-512`

```ts
class DefaultLLMProvider implements LLMProvider {
  async summarize(prompt: string) {
    console.log('[LLM] Summarization placeholder - returning mock summary');
    const mockSummary = `# Summary\n...`;
    return { success: true, summary: mockSummary };
  }
}
```

**What it should do:** Actually call an LLM API (OpenAI/Anthropic/etc.) to generate real session summaries for the context maintenance/compaction system.

**Architecture:**
- `CompactionService` uses `LLMProvider` interface
- Currently `DefaultLLMProvider` returns mock data
- The system prompts for summarization are already designed
- Session data is available via `terminal_sessions` table and messages

**Proposed approach:**
1. Check if an API key is configured in settings (`getSettings` IPC, key like `llmApiKey`)
2. If configured, call the LLM API with the session context
3. If not configured, return a clear "API key not configured" message instead of fake data
4. The provider selection (OpenAI vs Anthropic) should be configurable via settings

---

## Gap 3: RAG Semantic Search — Placeholder

**Location:** `src/services/RAGService.ts:339-394`

```ts
public async semanticSearch(queryEmbedding: Float32Array, options: QueryOptions = {}) {
  // Simple cosine similarity placeholder
  const results: RAGSearchResult[] = rows.map(row => ({
    score: row.similarity ? Math.min(1.0, row.similarity / 1000) : 0,
    ...
  }));
}
```

**What it should do:** Perform real vector similarity search using proper embeddings.

**Architecture:**
- `RAGService` stores chunks with embeddings in SQLite
- The `semanticSearch` method should use proper vector comparison
- Embeddings are assumed to be computed externally

**Proposed approach:**
1. Implement proper cosine similarity computation between input embedding and stored embeddings
2. Use SQLite's FTS5 for keyword search as fallback
3. Ensure embeddings are stored as BLOBs and properly retrieved

---

## Gap 4: 10 Dead IPC Handlers in Preload

**Locations:** `src/preload.ts` — IPC channels declared but no handlers in `main.ts`:

| Channel | Preload method |
|---------|---------------|
| `add-external-time` | `addExternalTime` |
| `get-hour-detail` | `getHourDetail` |
| `update-activity-chart-preference` | `updateActivityChartPreference` |
| `get-workspace-todos` | `getWorkspaceTodos` |
| `add-workspace-todo` | `addWorkspaceTodo` |
| `toggle-workspace-todo` | `toggleWorkspaceTodo` |
| `delete-workspace-todo` | `deleteWorkspaceTodo` |
| `get-prompt-templates` | `getPromptTemplates` |
| `save-prompt-template` | `savePromptTemplate` |
| `delete-prompt-template` | `deletePromptTemplate` |

**Status:** These are pre-planned hooks never wired to any UI component. No crash risk since nothing calls them. Options:
1. **Implement real handlers** for the ones needed by planned UI features
2. **Remove from preload** if the features are cancelled
3. **Add stub handlers** that log warnings with clear error messages

---

## Design Tokens

- IPC pattern: `ipcRenderer.invoke('channel-name', args)` in preload, `ipcMain.handle('channel-name', handler)` in main.ts
- Service pattern: Class in `src/services/`, instantiated in main.ts handler
- DB pattern: `better-sqlite3` with prepared statements, file at `app.getPath('userData')/deskflow.db`
- Error pattern: Return `{ success: boolean, data?: any, error?: string }` from handlers
- Settings pattern: `load-settings` / `save-settings` IPC to a SQLite `settings` table

## Constraints

- Must work with existing SQLite schema — do not break existing queries
- Must use existing IPC pattern (invoke/handle)
- Must not introduce new dependencies without justification
- DORA metrics should gracefully handle missing data (return 0 or "N/A" instead of crashing)
- LLM summarization must not block the main thread — use async
- LLM API key must come from settings (never hardcoded)
