# CONTEXT_BUNDLE.md — Topic-Based Memory Restoration for Agent Sessions

> Generated: 2026-08-17 · Companion to `PROMPT.md`
> Target package: `agent/docs/generate-prompt-docs/context-retrieval-memory-restore-17082026/`
> Purpose: give the receiving AI the EXACT existing infrastructure (real source, real line
> numbers, real IPC) so it can design the missing wiring — NOT re-invent the brain.

---

## 1. The Problem (verbatim user demand)

> "so if i say tracking system iT SHOULD KNOW WHERE AND WHICH CONTEXT TO RETRIEVE"
> "IF I SAY SOMETHING ELSE, iTSHOULD BE ABLE TO RESTORE THE MEMORY LKE THINGS SAVED AND DONE ONThAT"
> "WHY IS IT NOT IMPLEMENTED WHY IS IT NOT WORKING AND APPLIED IN THIS PROJECT????"
> "WHICH PART OF HTE PROEJCT IT IS AND WHERE aRE THE FILES SO IT DOESNT NEE OT UCKING SEARCH AGIAN"

The Context Brain (knowledge graph + keyword + vector retrieval), the MCP server, the user
profile/signals, the memory store, backfill, schedulers — ALL of it is already implemented
and wired in the main process. What is NOT done: **the retrieval is never called when an
agent session is assembled**. An agent asked to work on "the tracking system" receives only
problems/requests/sessions text — it does NOT receive the brain's episodes, entities, facts,
or memories about "tracking system". Topic-based memory restoration does not exist yet.

---

## 2. Existing Infrastructure — exact locations (do not rebuild, just wire)

### 2.1 The Brain engine — `src/main/ai/contextBrain.ts` (576 lines, complete)

Bitemporal knowledge graph. Key exports (all already implemented):

| Export | Line | Signature |
|---|---|---|
| `retrieve` | 283 | `retrieve(query: string, strategies: string[] = ['keyword','graph']): RetrievalResult` |
| `keywordSearch` | 208 | `keywordSearch(query: string, limit?: number)` |
| `traverseFromEntity` | 241 | `traverseFromEntity(entityId: string, depth?: number): { entities, facts }` |
| `logEpisode` | 25 | `logEpisode(source, content, sourceRef?, metadata?)` |
| `upsertEntity` | 68 | `upsertEntity(type, name, aliases?)` |
| `addFact` | 120 | `addFact(subjectId, predicate, objectLiteral, sourceEpisodeId, objectId?, confidence?)` |
| `getAllCurrentFacts` | 156 | `getAllCurrentFacts(): Fact[]` |
| `storeEmbedding` | 174 | `storeEmbedding(refId, refType, embedding: number[])` |
| `getEmbedding` | 182 | `getEmbedding(refId): number[] \| undefined` |
| `getAllEmbeddings` | 189 | `getAllEmbeddings()` |
| `exportContextBundle` | 331 | `exportContextBundle(): string` (JSON) |
| `getBrainStats` | 370 | `{ episodes, entities, facts, currentFacts }` |
| `getRelatedEpisodes` | 469 | `getRelatedEpisodes(entityId, limit?)` |
| `createExtractionJob` | 499 | job queue for entity extraction |
| `getPendingJobs` | 511 | `getPendingJobs(limit?)` |
| `retryJob` | 552 | `retryJob(jobId)` |

The retrieval router (`retrieve`, lines 283–327) — REAL SOURCE:

```ts
export function retrieve(query: string, strategies: string[] = ['keyword', 'graph']): RetrievalResult {
  const result: RetrievalResult = { facts: [], episodes: [], entities: [], strategy: strategies.join('+') }

  // Keyword search
  if (strategies.includes('keyword')) {
    const keywordResults = keywordSearch(query, 10)
    for (const r of keywordResults) {
      if (r.type === 'fact' && r.id) {
        const fact = dbRef?.prepare('SELECT * FROM context_facts WHERE id = ?').get(r.id)
        if (fact) result.facts.push(rowToFact(fact))
      }
      if (r.type === 'entity' && r.id) {
        const entity = getEntity(r.id)
        if (entity) result.entities.push(entity)
      }
      if (r.type === 'episode' && r.id) {
        const ep = dbRef?.prepare('SELECT * FROM context_episodes WHERE id = ?').get(r.id)
        if (ep) result.episodes.push({ id: ep.id, source: ep.source, content: ep.content, occurredAt: ep.occurred_at, ingestedAt: ep.ingested_at })
      }
    }
  }

  // Graph traversal from found entities
  if (strategies.includes('graph') && result.entities.length > 0) {
    for (const entity of result.entities.slice(0, 3)) {
      const { entities: related, facts: relFacts } = traverseFromEntity(entity.id, 1)
      for (const e of related) {
        if (!result.entities.find(re => re.id === e.id)) result.entities.push(e)
      }
      for (const f of relFacts) {
        if (!result.facts.find(rf => rf.id === f.id)) result.facts.push(f)
      }
    }
  }

  // Recency weighting
  result.facts.sort((a, b) => {
    const aRecent = a.validTo ? 0 : 1
    const bRecent = b.validTo ? 0 : 1
    if (aRecent !== bRecent) return bRecent - aRecent
    return b.confidence - a.confidence
  })

  return result
}
```

Result shape:

```ts
export interface RetrievalResult {
  facts: Fact[]      // { id, subjectId, predicate, objectId?, objectLiteral?, validFrom, validTo?, sourceEpisodeId, confidence }
  episodes: Episode[]// { id, source, sourceRef?, content, occurredAt, ingestedAt, metadata? }
  entities: Entity[] // { id, type, name, aliases[], firstSeen, lastSeen }
  strategy: string
}
```

### 2.2 Wiring in the main process — `src/main.ts` (REAL, already present)

```ts
// main.ts:13490
const contextBrain = require('./main/ai/contextBrain');

// main.ts:13534-13539 (inside whenReady)
const { startSchedulers } = require('./main/ai/contextScheduler');
...
const { setContextDb, runContextBackfill } = require('./main/ai/contextBackfill');

// main.ts:13554
contextBrain.setBrainDb(db);

// main.ts:13556
const { startMcpServer } = require('./main/ai/contextBrainMCP');
```

IPC handlers already registered — **main.ts:13619-13694**:

| Channel | Handler line | Call |
|---|---|---|
| `brain:search` | 13619 | `contextBrain.retrieve(query, strategies)` |
| `brain:get-entity` | 13623 | `findEntities` + `getCurrentFacts` |
| `brain:get-entity-history` | 13631 | `getFactHistory` |
| `brain:log-episode` | 13637 | `logEpisode` |
| `brain:stats` | 13641 | `getBrainStats` |
| `brain:export` | 13645 | `exportContextBundle` |
| `brain:get-episodes` | 13650 | `getEpisodesList` |
| `brain:get-entities` | 13654 | `getEntitiesList` |
| `brain:get-facts` | 13658 | `getFactsList` |
| `brain:get-entity-related` | 13662 | `getRelatedEpisodes` |
| `brain:get-jobs` | 13666 | `getJobs` + `getJobStats` |
| `brain:retry-job` | 13670 | `retryJob` |
| `brain:create-episode` | 13675 | `logEpisode` + `createExtractionJob` if content ≥ 40 chars |
| `brain:mcp-status` | 13690 | MCP server status |
| `brain:reindex-embeddings` | 13694 | re-embed all episodes |

Preload bridges — **preload.ts:1542-1556**: `brainSearch`, `brainGetEntity`,
`brainGetEntityHistory`, `brainLogEpisode`, `brainStats`, `brainExport`, `brainGetEpisodes`,
`brainGetEntities`, `brainGetFacts`, `brainGetEntityRelated`, `brainGetJobs`, `brainRetryJob`,
`brainCreateEpisode`, `brainMcpStatus`, `brainReindexEmbeddings`.

### 2.3 The MCP server — `src/main/ai/contextBrainMCP.ts`

- HTTP MCP server, **port 54322**, optional token `DESKFLOW_MCP_TOKEN`, rate limit 60 req/min,
  MCP protocol 2026-07-28. Started via `startMcpServer()` (main.ts:13556).
- Tools: `search_context`, `get_entity`, `get_entity_history`, `log_episode`, `get_stats`,
  `get_user_profile_summary`, `get_active_facts`, `get_recent_signals`.

### 2.4 User profile & signals — `src/main/ai/userContextService.ts`

- Tables: `user_context_profile` (1 row), `user_context_signals` (15 rows) in
  %APPDATA%\RHEO\deskflow-data.db.
- `assemble-context` already injects `userContextService.getProfile()` — main.ts:15130-15132:

```ts
// main.ts:15130-15132 (already present)
try {
    const profile = userContextService.getProfile();
```

### 2.5 Memory store — `src/main/ai/memoryStore.ts` (+ memoryCapture/Compaction/Extractor/Retrieval)

- Tables: `agent_memories` (0 rows — NEVER populated), `ai_chat_memories` (17 rows).
- This is a candidate data source for memory restoration (episodes about the topic from
  agent chats).

### 2.6 Backfill & scheduler (already wired)

- `src/main/ai/contextBackfill.ts` — `runContextBackfill()` (main.ts:13539), backfills
  historical data into the brain.
- `src/main/ai/contextScheduler.ts` — `startSchedulers()` (main.ts:13534), periodic jobs.
- `runNow` (main.ts:13714).

### 2.7 AI Context Capture pipeline (feeds the brain)

- Extension content scripts (`ai-context-content.js`, MAIN world, fetch interception) on
  ChatGPT/Claude/Perplexity/You/Gemini → relay → background → `POST http://localhost:54321/ai-context`
  → `ai_context_captures` (CREATE at main.ts:2428, insert ~19956) → IPC
  `ai-context:list/stats/delete/clear/get-brain-links/topics` (main.ts:7626-7646) →
  `writeAiContextEpisode` (src/main/ai/episodeWriters.ts) → brain.

---

## 3. THE GAP — assemble-context does NOT retrieve

`src/main.ts:15073` — the `assemble-context` handler (the context given to every terminal
agent session). Real source of what it injects TODAY:

```ts
// main.ts:15073
electron_1.ipcMain.handle('assemble-context', async (_event, data: { projectId: string; problemIds?: string[]; requestIds?: string[]; tokenBudget?: number }) => {
  try {
    const parts = [];
    let totalChars = 0;
    const budget = data.tokenBudget || 2000;
    const maxChars = budget * 4;

    // 1. workspace_problems for project
    // 2. workspace_requests for project
    // 3. terminal_sessions (last 10, status != cancelled)
    // 4. Backup & Safety Protocol (static text)
    // 5. [CONTEXT-BRAIN] userContextService.getProfile()  (main.ts:15130)

    // ← NO contextBrain.retrieve() call anywhere.
    // ← NO topic/keyword from the session topic or init content.
    // ← NO agent_memories / ai_chat_memories lookup.
  }
```

Renderer callers: `src/services/ContextService.ts:149` (`assembleContext`),
`src/services/ContextAssemblyService.ts:68`. Preload: `preload.ts:876-877`, `preload2.ts:691-692`.

---

## 4. DB reality (read-only snapshot, 2026-08-17)

| Table | Rows | Notes |
|---|---|---|
| context_episodes | 23 | episodes ingested (some from AI Context Capture) |
| context_entities | 16 | extracted entities |
| context_facts | 25 | bitemporal facts |
| context_embeddings | 23 | Float32Array BLOBs |
| context_extraction_jobs | 16 | extraction queue |
| user_context_profile | 1 | single row |
| user_context_signals | 15 | recent signals |
| agent_memories | 0 | memory store never populated |
| ai_chat_memories | 17 | chat memories |
| ai_context_captures | MISSING in live DB | CREATE exists at main.ts:2428; table only appears after app restart runs the migration |

---

## 5. Design constraints for the receiving AI

1. The brain engine MUST NOT be rewritten — it is complete (retrieve/keyword/graph/embeddings).
2. The wiring (main.ts:13490-13556, IPC 13619-13694, preload 1542-1556, MCP 54322) MUST NOT be duplicated.
3. The change is: **make retrieval happen at the right moment** and **shape its output into
   agent-readable context** (markdown sections, token budget aware).
4. `assemble-context` receives `{ projectId, problemIds?, requestIds?, tokenBudget? }` — there
   is NO topic field today. The session topic lives in `terminal_sessions.topic` (queried at
   main.ts:15082) — use that as the retrieval query, and/or accept an optional `topic` field
   added by the caller (preload + renderer ContextService pass it through).
5. Token budget: `budget = data.tokenBudget || 2000`, `maxChars = budget * 4` — retrieval
   output must be truncated to fit the remaining budget after the existing sections.
6. Also consider the MCP path: agents connected via MCP can call `search_context` themselves —
   verify the MCP server is started and document it; but the assemble-context injection is
   the primary fix (it works for ALL sessions without agent-side changes).
7. Wrap ALL brain calls in try/catch — the brain tables may be absent on a fresh DB
   (extraction jobs code already tolerates missing tables: `catch { /* table missing */ }`).
8. Renderer-side preference: keep the change in the main process (`assemble-context` handler)
   — do NOT add new renderer dependencies.
9. Session Metadata convention: `## Session Metadata` + `## Actions` blocks used by this
   workspace (see agent/DEFAULT_SYSTEM_PROMPT.md §8) — retrieval output must not collide with
   those reserved section names.