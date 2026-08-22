# PROMPT.md — Topic-Based Memory Restoration for Agent Sessions

> Generated with the generate-prompt skill v2.0.0 · 2026-08-17
> Target: Architect AI (Notion) · Read `CONTEXT_BUNDLE.md` FIRST — it is the source of
> truth for existing infrastructure. Everything in it is REAL and already wired.

---

## Raw Request (verbatim — do not rephrase)

> "so fi i say tracking system iT SHOULD KNOW WHERE AND WHICH CONTEXT TO RETRIEVE"
>
> "IF I SAY SOMETHING ELSE, iTSHOULD BE ABLE TO RESTORE THE MEMORY LKE THINGS SAVED AND DONE ONThAT ASHITI DIOT"
>
> "WHY IS IT NOT IMPLEMENTED WHY IS IT NOT WORKING AND APPLIED IN THIS PROJECT????"
>
> "WHICH PART OF HTE PROEJCT IT IS AND WHERE aRE THE FILES SO IT DOESNT NEE OT UCKING SEARCH AGIAN"

## Problem Statement

The project already contains a complete Context Brain: bitemporal knowledge graph with
episodes/entities/facts, Float32Array embeddings, keyword search, graph traversal, a
multi-strategy retrieval router (`contextBrain.retrieve(query, ['keyword','graph'])`),
a user profile + signals service, a memory store, backfill, schedulers, 15 `brain:*` IPC
handlers, preload bridges, and an HTTP MCP server on port 54322. The brain even has live
data (~23 episodes, 16 entities, 25 facts, 23 embeddings).

**BUT it is not applied where it matters:** when a terminal agent session is assembled via
the `assemble-context` IPC handler (main.ts:15073), the handler injects only
workspace problems, workspace requests, recent sessions, the backup protocol, and a compact
user profile. It NEVER calls `contextBrain.retrieve()`. So when the user says "tracking
system" or "resume builder" or any topic, the agent receives zero memory about that topic
from the brain — it has to re-discover everything from scratch, and the user is furious that
"it's not working and applied".

The mandate: **make the brain's memory actually restore when a topic is mentioned**, so the
AI "knows where and which context to retrieve" without the user having to search.

## Engineering Task — Data & Retrieval Pipeline

Design and specify (in RESULT.md, full code):

1. **Topic extraction at session assembly:** the `assemble-context` handler receives
   `{ projectId, problemIds?, requestIds?, tokenBudget? }` and already queries
   `terminal_sessions.topic` (main.ts:15082). Use the session topic (and optionally the
   problem/request titles passed in) as the retrieval query. ALSO accept an optional `topic`
   field on the IPC payload (preload.ts:876 + renderer ContextService.ts:149 pass-through) so
   callers can supply an explicit topic.

2. **Retrieval injection:** inside `assemble-context`, after the existing sections and the
   user-profile injection (main.ts:15130), call `contextBrain.retrieve(topic, ['keyword','graph'])`
   (fallback: `['keyword']` if topic is empty/generic). Format the result as a markdown
   section — e.g.:

   ```
   ## Memory — <topic> (from Context Brain)
   ### Facts
   - <subject> <predicate> <objectLiteral> (confidence X)
   ### Related entities
   - <type>: <name> (aliases)
   ### Relevant episodes
   - [<source>] <content first ~200 chars> (<occurredAt>)
   ```

   Respect the token budget (`maxChars = budget * 4`): truncate episodes longest-first to
   what fits after the existing sections; always include facts (they are small) and entity
   names. Wrap the whole thing in try/catch — a missing brain table must never break
   session assembly (the existing code already tolerates missing tables — mirror that).

3. **Memory store integration:** also query `agent_memories` / `ai_chat_memories` for the
   topic (memoryRetrieval.ts exists) and append a short `## Memory — saved notes` section
   when matches exist. If `agent_memories` is never populated, specify the minimal
   population step (capture on session completion via memoryCapture.ts, or backfill via
   contextBackfill.ts) so the restoration loop is closed — but do NOT block the retrieval
   feature on it.

4. **Provider-chain consideration:** if any new IPC channel is needed for renderer-triggered
   memory restoration (e.g. a "restore memory for topic" button in the terminal workspace),
   extend the provider feature union in `src/services/providers/router.ts` and add the
   channel with the same conventions as `brain:*` (preload bridge + main handler + Result
   wrapper). Prefer reusing `brain:search` where possible.

## Design Task — no visual UI is requested

This is a context-injection feature; the only "UI" is the text the agent receives.
Specify the exact markdown section headers and truncation rules so agent-facing output is
clean, token-efficient, and does not collide with the reserved `## Session Metadata` /
`## Actions` sections. If you add an optional renderer control (e.g. a toggle in the
terminal workspace "Inject memory about this session's topic"), keep it minimal and
consistent with existing glass-card/shadcn patterns — but it is NOT required.

## Constraints (hard limits)

- Do NOT rewrite `contextBrain.ts` — it is complete. Do NOT duplicate the 15 `brain:*`
  handlers or the MCP server.
- Primary change surface: the `assemble-context` handler (main.ts:15073), optional `topic`
  pass-through (preload.ts:876, ContextService.ts:149), and any memory-population hooks
  (memoryCapture.ts / contextBackfill.ts). List the EXACT line numbers of every edit.
- All brain/memory reads wrapped in try/catch; empty DB must degrade gracefully.
- Keep the change main-process only (renderer changes only for the optional `topic`
  pass-through).
- Token budget discipline: retrieval output must never blow the session budget.

## Output Requirements

Return a single comprehensive **RESULT.md**:
1. Exact diffs/patches per file (before/after, with line numbers from CONTEXT_BUNDLE.md).
2. The final markdown template injected into agent context.
3. Truncation/budget algorithm (exact pseudocode).
4. Optional: memory-store population steps (session-completion capture or backfill) with
   exact hook points.
5. Verification checklist: how the Hands & Eyes agent proves it works (run the app,
   create a session with topic "tracking system", confirm `[BRAIN]`-stamped retrieved
   facts/episodes appear in the assembled context; check main console).