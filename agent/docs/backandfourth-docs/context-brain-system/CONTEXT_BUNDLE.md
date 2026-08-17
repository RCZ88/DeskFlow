# Context Brain System — Context Bundle

## Project Overview

DeskFlow is an Electron + React + better-sqlite3 desktop productivity tracker. The user wants a **Context Brain** — a bitemporal knowledge graph that captures everything happening across DeskFlow into a queryable memory, exposes it via MCP to any AI client, and visualizes it as a 3D force-directed graph.

## Current Implementation Status

### What EXISTS (built this session):
1. **SQLite schema** — 4 tables: `context_episodes`, `context_entities`, `context_facts`, `context_embeddings`
2. **Core engine** — `src/main/ai/contextBrain.ts` (360 lines): episode logging, entity upsert, bitemporal facts, graph traversal, keyword search, retrieval router, context bundle export
3. **Episode writers** — `src/main/ai/episodeWriters.ts` (109 lines): captures from goals, finance, deadlines, terminal, AI chat, life phases, connectors
4. **MCP server** — `src/main/ai/contextBrainMCP.ts`: HTTP server on port 54322 with tools (search_context, get_entity, get_entity_history, log_episode, get_stats) and resources
5. **IPC handlers** — 6 new endpoints in main.ts: brain:search, brain:get-entity, brain:get-entity-history, brain:log-episode, brain:stats, brain:export
6. **Preload methods** — brainSearch, brainGetEntity, brainGetEntityHistory, brainLogEpisode, brainStats, brainExport
7. **3D visualization** — `src/features/warmth/context-graph/`: GraphScene (R3F + d3-force-3d + Bloom), GraphNode, GraphEdge, EntityDetailPanel, GraphControls
8. **ContextGraphView** — tab at `/life?tab=graph` that fetches data from brain + workspace lessons
9. **Profile visualization** — `/life?tab=profile` with RadarChart, ActivityHeatmap, InterestCloud

### What's PARTIALLY built:
- Episode writers exist but aren't wired into feature IPC handlers (goals, finance, etc. don't call them yet)
- Embeddings table exists but no embedding generation (sqlite-vec not installed)
- Vector search not implemented (keyword + graph only)

### What's MISSING:
- **Entity extraction pipeline** — no LLM-based extraction from episode content to entities/facts
- **Embedding generation** — no way to create vector embeddings for semantic search
- **Episode writer integration** — writers exist but aren't called from feature code
- **MCP server not started on app launch** — initContextBrain() exists but may not be called
- **Frontend context brain UI** — no way to view/search/manage the brain from the UI (only the 3D graph)

## Key Source Files

### src/main/ai/contextBrain.ts (core engine)
```typescript
// Episode management
logEpisode(source, content, sourceRef?, metadata?) → episodeId
getEpisodes(source?, limit?, since?) → Episode[]

// Entity management
upsertEntity(type, name, aliases?) → entityId
getEntity(id) → Entity
findEntities(name, type?) → Entity[]

// Bitemporal facts
addFact(subjectId, predicate, objectLiteral, sourceEpisodeId, objectId?, confidence?) → factId
getCurrentFacts(subjectId) → Fact[]
getFactHistory(subjectId) → Fact[]
getAllCurrentFacts() → Fact[]

// Graph traversal
traverseFromEntity(entityId, depth?) → { entities, facts }

// Retrieval
retrieve(query, strategies?) → RetrievalResult
keywordSearch(query, limit?) → results[]

// Export
exportContextBundle() → JSON string
getBrainStats() → { episodes, entities, facts, currentFacts }
```

### src/main/ai/contextBrainMCP.ts (MCP server)
```typescript
// HTTP server on port 54322
// Tools: search_context, get_entity, get_entity_history, log_episode, get_stats
// Resources: context://recent-episodes, context://active-facts, context://stats
startMcpServer() → http.Server
```

### src/main/ai/episodeWriters.ts
```typescript
writeGoalEpisode(goal, action)
writeFinanceEpisode(type, data, action)
writeDeadlineEpisode(deadline, action)
writeTerminalEpisode(session, message, role)
writeAiChatEpisode(messages, threadDate)
writeLifePhaseEpisode(phase, action)
writeConnectorEpisode(connector, items, action)
```

### SQLite Schema (in main.ts)
```sql
CREATE TABLE context_episodes (
  id TEXT PRIMARY KEY, source TEXT NOT NULL, source_ref TEXT,
  content TEXT NOT NULL, occurred_at TEXT NOT NULL, ingested_at TEXT NOT NULL,
  metadata TEXT
);

CREATE TABLE context_entities (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL,
  aliases TEXT DEFAULT '[]', first_seen TEXT NOT NULL, last_seen TEXT NOT NULL
);

CREATE TABLE context_facts (
  id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, predicate TEXT NOT NULL,
  object_id TEXT, object_literal TEXT, valid_from TEXT NOT NULL,
  valid_to TEXT, source_episode_id TEXT NOT NULL, confidence REAL DEFAULT 1.0
);

CREATE TABLE context_embeddings (
  ref_id TEXT PRIMARY KEY, ref_type TEXT NOT NULL, embedding BLOB
);
```

## Design Tokens
```css
--dk-bg-deep: #000000;
--dk-bg-base: #09090b;
--dk-bg-surface: rgba(9, 9, 11, 0.80);
--dk-text-primary: #fafafa;
--dk-text-secondary: #a1a1aa;
--dk-accent: #fafafa;
--dk-success: #22c55e;
--dk-danger: #ef4444;
--dk-font-display: 'Space Grotesk'
--dk-font-sans: 'Inter'
--dk-font-mono: 'JetBrains Mono'
```

## Architecture Notes
- Main process: contextBrain.ts + episodeWriters.ts + contextBrainMCP.ts
- Renderer: ContextGraphView.tsx + context-graph/ components
- IPC bridge: 6 endpoints in main.ts + preload.ts
- MCP: HTTP server on port 54322 (stateless, MCP 2026-07-28 spec)
- DB: SQLite at %APPDATA%/RHEO/deskflow-data.db (same DB as all other features)
