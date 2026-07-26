# CONTEXT_BUNDLE.md — State.md Redesign for Multi-Agent Support

## Raw Request (verbatim)
"THE SYSTEM OF THE STATE.md IS REALLY BAD AND IT SHOULD NOT ONLY STORE THE LATEST, it should store at least the altest 3 states, and how it should have an id that represent a session and the ai agent being ablt to know which ot read from and which nadh ow to write."

## Problem Statement
The state.md system has critical flaws:
1. **Overwrites everything** — Each cycle replaces the entire file, losing history
2. **No multi-agent support** — Multiple AI coding agents work in parallel but share one state file
3. **No session IDs** — Can't identify which agent/session a state belongs to
4. **No history** — Should store at least the latest 3 states, not just the latest
5. **No read/write protocol** — Agents don't know which state to read or how to write
6. **Fragile** — Has been corrupted before (backup files exist: state.md.bak, state.md.bak7)

---

## FILE 1: agent/state.md — Current State (what gets overwritten)
```markdown
# DeskFlow — Current State   (OVERWRITE every cycle; max 40 lines)
CYCLE: 212
ROLE: Created comprehensive TERMINAL_CONTEXT_BUNDLE.md with full source code
FIX PACKET: Session prompt delivery fix
LAST VERIFIED: build OK, terminal height fixed, toggle/config fixed
IN FLIGHT: TERMINAL_CONTEXT_BUNDLE.md (full source) + PROMPT.md for Architect
NEXT ACTION: User sends PROMPT.md + TERMINAL_CONTEXT_BUNDLE.md to Architect
```
**Problem:** This is the ONLY state. When overwritten, all previous cycle info is lost.

---

## FILE 2: opencode.json — How state.md is loaded
```json
{
  "instructions": [
    "AGENTS.md",
    "agent/DEFAULT_SYSTEM_PROMPT.md",
    "agent/GENERAL_ADDITIONS.md",
    "agent/dictionary.md",
    "agent/state.md"
  ]
}
```
**Problem:** Only ONE state.md is loaded. All agents see the same state.

---

## FILE 3: agent/DEFAULT_SYSTEM_PROMPT.md — How state.md is referenced
```markdown
## 1. Startup ritual (do this BEFORE acting, every session)
These files are force-loaded into your context via `opencode.json` "instructions": `AGENTS.md`, `MEMORY.md`, `agent/state.md`, `agent/dictionary.md`, `agent/FEATURE_TRACKER.md`, `agent/context.md`, `agent/PROBLEMS.md`.
1. Read `MEMORY.md` and `agent/state.md` FIRST. Recover the current cycle number, your role, and in-flight work. NEVER ask CZ for status you can read there.

## 4. Memory discipline (anti-amnesia)
- Update `agent/state.md` (cycle number, current focus, changelog) at cycle end.
```
**Problem:** All agents read the same file. All agents write to the same file. No isolation.

---

## FILE 4: Existing Backup Files (proof of fragility)
```
agent/state.md          — current (7 lines)
agent/state.md.bak      — backup
agent/state.md.bak7     — another backup
agent/state.archive.md  — archive
agent/state-archive.md  — another archive (different name!)
```
**Problem:** Two different archive file names (state.archive.md vs state-archive.md). Manual backups are the only history mechanism.

---

## FILE 5: How State is Currently Written (TerminalPage.tsx)
The agent writes state.md at cycle end by overwriting the entire file:
```typescript
// At cycle end, the agent overwrites state.md completely:
const stateContent = `# DeskFlow — Current State   (OVERWRITE every cycle; max 40 lines)
CYCLE: ${cycleNumber}
ROLE: ${role}
FIX PACKET: ${fixPacket}
LAST VERIFIED: ${lastVerified}
IN FLIGHT: ${inFlight}
NEXT ACTION: ${nextAction}`;
// Writes to agent/state.md — overwrites everything
```
**Problem:** No append mechanism. No multi-agent awareness. No session tracking.

---

## EXISTING MULTI-AGENT CONTEXT

### How agents are spawned (TerminalPage.tsx)
```typescript
// Each terminal session gets:
- terminalId: string (unique per session)
- agentType: string (opencode, claude, codex, gemini)
- projectPath: string (working directory)
- sessionId: string (database session ID)
```

### Agent state machine (main.ts)
```typescript
interface AgentState {
  agentType: string;
  phase: AgentPhase; // 'launching' | 'ready' | 'busy' | 'idle' | 'error'
  dataBuffer: string;
  idleSeq: number;
  launchStartedAt: number;
  pendingWrites?: string[];
}
const agentStates = new Map<string, AgentState>(); // keyed by terminalId
```
**Key insight:** The main process already tracks per-agent state in memory. But this state is NOT persisted to disk and NOT visible to other agents.

---

## THE GAP
1. **No persistent multi-agent state** — Each agent's state is lost when the session ends
2. **No cross-agent awareness** — Agent A doesn't know what Agent B is working on
3. **No history** — Only the latest state is stored
4. **No session protocol** — No standardized way to read/write state
5. **No conflict resolution** — Multiple agents writing to the same file = corruption

## CONSTRAINTS
- opencode.json `instructions` array is the injection mechanism
- Files must be markdown (agent reads them as text)
- Must work for ALL agent types: opencode, claude, codex, gemini
- Must not break existing functionality
- Must be backward compatible (old state.md format should still work)
- Token budgets are limited (state should be compact)
