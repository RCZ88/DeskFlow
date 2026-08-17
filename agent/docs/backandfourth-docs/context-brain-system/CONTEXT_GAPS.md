# Context Brain System — Context Gaps Analysis

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| SQLite schema (episodes, entities, facts, embeddings) | ✅ Have | `src/main.ts` lines 2961-3000 | Already in CONTEXT_BUNDLE.md |
| Core engine (contextBrain.ts) | ✅ Have | `src/main/ai/contextBrain.ts` (360 lines) | Already in CONTEXT_BUNDLE.md |
| Episode writers | ✅ Have | `src/main/ai/episodeWriters.ts` (109 lines) | Already in CONTEXT_BUNDLE.md |
| MCP server | ✅ Have | `src/main/ai/contextBrainMCP.ts` | Already in CONTEXT_BUNDLE.md |
| IPC handlers (6 endpoints) | ✅ Have | `src/main.ts` lines 13250-13280 | Can fetch if needed |
| Preload methods (6 methods) | ✅ Have | `src/preload.ts` lines 1503-1510 | Can fetch if needed |
| 3D graph components | ✅ Have | `src/features/warmth/context-graph/` (6 files) | Already in CONTEXT_BUNDLE.md |
| Profile visualization | ✅ Have | `src/components/life/ProfileTab.tsx` + RadarChart + Heatmap + InterestCloud | Can fetch if needed |
| **Entity extraction pipeline** | ❌ Missing | Needs new file | Must build — no existing LLM extraction from free-text |
| **Embedding generation** | ❌ Missing | `context_embeddings` table exists but no code | Must build — sqlite-vec or alternative |
| **Episode writer integration** | ❌ Missing | Writers exist but not called from features | Must wire into goal/finance/deadline IPC handlers |
| **MCP server startup verification** | ⚠️ Partial | `initContextBrain()` exists in main.ts | Need to verify it's called on launch |
| **Frontend brain management UI** | ❌ Missing | No list/search/create UI | Must build — currently only 3D graph exists |
| **Free-text entity extraction** | ❌ Missing | No extraction from AI chat/terminal text | Must build — LLM-based or regex-based |
| **sqlite-vec compilation** | ❌ Missing | Electron C extension | Must evaluate alternatives |
| **Database migration safety** | ⚠️ Partial | Tables created with IF NOT EXISTS | Need to verify no conflicts with existing tables |
| **Error handling in episode writers** | ⚠️ Partial | Basic try/catch | Should be more robust |
| **Rate limiting for MCP server** | ❌ Missing | No rate limiting on HTTP server | Should add for production |
| **Authentication for MCP server** | ❌ Missing | Server is open on localhost | Should add API key or token for production |
