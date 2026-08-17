# Collaboration Request: DeskFlow Context Brain System

## Your Role

You are the Specialist AI. I am the Project Owner AI. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this idea into an implementable specification.

## The Idea

Build a **Context Brain** for DeskFlow — a bitemporal knowledge graph that:
1. Captures everything happening across DeskFlow (finance, goals, deadlines, terminal usage, AI chat) into a queryable memory
2. Exposes that memory to any AI client through MCP (Model Context Protocol)
3. Visualizes the knowledge graph as a 3D force-directed node graph

The core insight: every fact is bitemporal — it has a `valid_from`/`valid_to` window. When new information contradicts an old fact, close the old fact's window rather than deleting it. History stays queryable; current state stays consistent.

## Current Context (What I Have)

### What's Already Built:
- **SQLite schema** — 4 tables: `context_episodes`, `context_entities`, `context_facts`, `context_embeddings`
- **Core engine** (`src/main/ai/contextBrain.ts`, 360 lines) — episode logging, entity upsert, bitemporal facts, graph traversal, keyword search, retrieval router
- **Episode writers** (`src/main/ai/episodeWriters.ts`) — capture from goals, finance, deadlines, terminal, AI chat, life phases, connectors
- **MCP server** (`src/main/ai/contextBrainMCP.ts`) — HTTP server on port 54322 with tools and resources
- **IPC handlers** — 6 endpoints in main.ts
- **Preload methods** — brainSearch, brainGetEntity, brainGetEntityHistory, brainLogEpisode, brainStats, brainExport
- **3D visualization** — React Three Fiber + d3-force-3d + Bloom postprocessing, with GraphNode, GraphEdge, EntityDetailPanel, GraphControls
- **Profile visualization** — RadarChart, ActivityHeatmap, InterestCloud at `/life?tab=profile`

### Stack:
- Electron + React + TypeScript + Vite
- SQLite (better-sqlite3) — same DB as all other features
- Three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- d3-force-3d for physics
- Framer Motion for animations

### Key Files:
- `src/main/ai/contextBrain.ts` — core engine
- `src/main/ai/episodeWriters.ts` — feature capture
- `src/main/ai/contextBrainMCP.ts` — MCP server
- `src/features/warmth/context-graph/` — 3D visualization
- `src/features/warmth/ContextGraphView.tsx` — graph tab orchestrator

## Context Gaps (What I Don't Have Yet)

- **Entity extraction pipeline** — no LLM-based extraction from episode text to entities/facts. Currently episodes are stored raw but entities are only created by the episode writers (which know the structure). Need a general extraction step for free-form text.
- **Embedding generation** — the `context_embeddings` table exists but no code generates embeddings. Need either sqlite-vec (native SQLite extension) or a simple embedding approach.
- **Episode writer integration** — the writers exist but aren't called from the actual feature IPC handlers. Goals, finance, deadlines etc. don't write episodes yet.
- **MCP server startup** — the `initContextBrain()` function exists but needs to be verified it's called on app launch and the server actually starts.
- **Frontend brain management UI** — no way to view/search/manage the brain from the UI (only the 3D graph exists). Need a list view, search interface, and manual episode creation.

## Conversation Protocol

**How we communicate:**

1. **You ask specific questions.** Format: `REQUEST: [specific file, schema, or clarification]`
2. **I fetch and respond.** Format: `CONTEXT: [file path]
[actual source code]`
3. **You refine your understanding.** Ask follow-ups or propose a design.
4. **When ready, you produce RESULT.md.** Format follows our standard specification.

**Rules:**
- Do NOT assume context you don't have. Ask for it.
- Do NOT design for features whose backend doesn't exist. Flag them.
- Do NOT produce a monolithic answer. Iterate with me.
- When you need to see code, ask for the EXACT file path.

## Scope

**IN:**
- Entity extraction pipeline (LLM-based, from episode text)
- Embedding generation (sqlite-vec or simple approach)
- Episode writer integration into existing features
- MCP server verification and startup
- Frontend brain management UI (list, search, manual episode creation)
- 3D graph improvements (based on what's already built)

**OUT:**
- Browser extension scraper (fragile, low value)
- Real-time websocket sync (overkill at this scale)
- VR/AR variants
- Migration from existing memory systems (agent_memories, ai_chat_memories)

## Expected Output

After our conversation converges, produce:
1. **RESULT.md** — The complete design specification
2. **Implementation Plan** — File-by-file changes
3. **Backend Audit** — Any missing IPC/services/DB schemas flagged

## First Question

What's your assessment of the entity extraction approach? The current episode writers create entities from structured data (goals, finance, etc.), but free-form text (AI chat messages, terminal output) needs a different approach. Should we use:
- A small LLM call per episode (cheaper, simpler, but adds latency)
- A batch extraction process (runs periodically, processes unprocessed episodes)
- A hybrid where structured sources extract immediately and free-text gets batch-processed?

And for embeddings — sqlite-vec requires compiling a C extension. Is there a simpler approach that works within Electron's constraints?
