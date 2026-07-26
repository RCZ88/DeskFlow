# PROMPT — Agent Memory System Design

## Raw Request
"There's an existing problem with my AI system where it's sort of like, I don't know if it's evolving to this feature in the workspace or not. But the problem is that it constantly forgets the stuff. It's constantly not improved based on the mistakes. So, for example, previously it's so weird, it was a user-generated prompt skill. And it's supposed to know that gerat prompt skill is generating a prompt to a different AI. To an AI that has a context of the project whatsoever. So it needs to build a context bundle. And if I need to tell them to use the skills in MCP, it should be using the light stuff and then including it in the context bundle on the actual output of the skill in MCP. Instead of telling the AI the prompt to make the MCP and stuff. So, I've already mentioned this multiple times, but there's no mechanism where it can save it into memory. And actually learn from it, right? But the problem is with this system that is like a growing library of things to make sure that it has a memory of and needs to constantly think of those memories before anything. So it needs to be included in the prompt somewhere or something. You compile everything and it will be so long. If you talk about a V1 to 2 comps in a short term, it won't be that long, but in the long term it's a long something that it needs to be. Somehow we design so that it's not just really just simply being text of list of instructions that will be included in the system prompt or in the things that the agent will read."

## Problem Statement
The AI agent operates amnesiac between sessions. It repeatedly makes the same mistakes, doesn't learn from corrections, and has no mechanism to persist lessons. The architecture has extensive scaffolding for memory/context/reflection, but almost none is populated or auto-loaded.

## Context
Read `CONTEXT_BUNDLE.md` first. It contains the full source code for all 10 key files: opencode.json (the injection mechanism), MEMORY.md, DEFAULT_SYSTEM_PROMPT.md, COMMON_ERRORS_FIXED.md, problem.md, reflection logs, ContextConfig.ts (with existing deep_memory config), ContextService.ts (layered context assembly), memoryExtractor.ts (reusable extraction logic), and all empty scaffolding. The context bundle is self-contained — you should be able to design the complete solution using only this file.

## Engineering Task
Design a complete **Agent Memory System** that solves the cross-session amnesia problem. The system must:

1. **Auto-load critical lessons into every prompt** — the agent must see its past mistakes and corrections without manually reading files, within token budgets (4000-10000 tokens depending on model tier)
2. **Auto-write lessons when mistakes happen** — when the user corrects the agent ("you idiot, I told you X") or the agent fixes its own mistake, the lesson must be captured automatically without the agent having to "remember" to write
3. **Deduplicate and score memories** — same lesson must not appear twice, more important/repeated lessons prioritized, stale lessons decayed or archived
4. **Provide a compact summary mechanism** — tiered storage (hot/warm/cold) or compressed format that prevents unbounded growth in the prompt
5. **Integrate with existing systems** — must work with opencode.json instructions array (add files), ContextConfig.ts deep_memory config (already exists), ContextService.ts layered assembly (add a layer), memoryExtractor.ts extraction logic (reuse categories and scoring), and the reflection system (agent-reflect)

Design the complete system: storage format, injection mechanism, writing mechanism, scoring/ranking algorithm, compaction strategy, and all integration points. Include specific files to create or modify, IPC endpoints needed, and the data flow from mistake → capture → injection → agent reads it.

## Design Task
Design the **data model** for memories: what fields each memory entry has (content, category, importance score, timestamps, source, deduplication key, decay rate, access count), how memories are stored (extend existing SQLite or use preferences system), and how they're retrieved (query logic for ranking and compaction within token budgets).

## UX Task
Design the **agent experience**: what happens when a correction is made (automatic capture flow), how the agent sees memories in its prompt (format, placement within the layered context assembly), and how the context sidebar displays memory status (extend existing ContextMaintenanceTab).

## Constraints
- opencode.json `instructions` array is the injection mechanism (can add more files)
- Token budgets are limited (4000-10000 depending on model tier)
- The agent runs in opencode (Go-based CLI with BubbleTea/Elm TUI)
- No direct database access from renderer — must go through IPC
- Tailwind v4, no git commands, IPC-only communication
- Must work for ALL agent types: opencode, claude, codex, gemini
- Must not break existing functionality
- Must use existing SQLite database (not create a new one)
- Must work within the existing layered context assembly architecture (ContextService.ts)
