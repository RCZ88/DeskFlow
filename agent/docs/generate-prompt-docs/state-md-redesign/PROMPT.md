# PROMPT — State.md Redesign for Multi-Agent Support

## Raw Request
"THE SYSTEM OF THE STATE.md IS REALLY BAD AND IT SHOULD NOT ONLY STORE THE LATEST, it should store at least the altest 3 states, and how it should have an id that represent a session and the ai agent being ablt to know which ot read from and which nadh ow to write."

## Problem Statement
The state.md system has critical flaws: it overwrites everything each cycle, has no multi-agent support (multiple agents work in parallel but share one state file), has no session IDs, stores no history (should keep at least 3 states), and has no read/write protocol.

## Context
Read `CONTEXT_BUNDLE.md` first. It contains the full source code for: current state.md format, opencode.json injection mechanism, DEFAULT_SYSTEM_PROMPT.md references, existing backup files (proof of fragility), how state is written in TerminalPage.tsx, the existing multi-agent context (terminalId, agentType, AgentState interface), and the gap analysis.

## Engineering Task
Design a complete **Multi-Agent State System** that replaces the single-file overwrite approach. The system must:

1. **Store multiple states** — Keep at least the latest 3 states per agent, with history
2. **Session-scoped state** — Each agent session gets its own state, identified by a session ID
3. **Cross-agent awareness** — Agent A should be able to see what Agent B is working on
4. **Read/write protocol** — Standardized format for reading current state and writing updates
5. **Backward compatibility** — Old state.md format should still work (graceful migration)
6. **Conflict resolution** — Multiple agents writing simultaneously must not corrupt state

Design the storage format (single file with sections vs multiple files vs JSON), the session ID scheme, the read/write protocol, the history mechanism, and the cross-agent visibility approach.

## Design Task
Design the **data model** for multi-agent state: what fields each state entry has (session ID, agent type, cycle number, role, status, in-flight items, timestamps), how states are stored and retrieved, and how the history window (latest 3) is maintained.

## UX Task
Design the **agent experience**: what the agent sees when it reads state (its own state + other agents' states), how it writes state at cycle end (append vs overwrite), and how the context sidebar displays multi-agent status.

## Constraints
- opencode.json `instructions` array is the injection mechanism (can add more files)
- Files must be markdown (agents read them as text)
- Must work for ALL agent types: opencode, claude, codex, gemini
- Must not break existing functionality
- Must be backward compatible (old state.md format should still work)
- Token budgets are limited (state should be compact, not fill the context window)
- No new database tables — use existing file system or preferences
