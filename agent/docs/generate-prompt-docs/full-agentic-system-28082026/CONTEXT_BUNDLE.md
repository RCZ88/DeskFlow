# CONTEXT_BUNDLE.md — Full Agentic System

> Embedded source code. External AI has NO file access.

## What Exists Today

### ConductorService (src/services/conductor/ConductorService.ts — 682 lines)
Multi-agent orchestrator with:
- 6 roles: director, planner, worker, qa, auditor, resolver
- Git worktree isolation per agent
- File-based communication: agents write .conductor/REPORT.json, PLAN.json, ESCALATE.json, NEW_GOALS.json
- Merge queue with conflict resolver
- Autonomy levels: L2 (human-in-loop), L3 (semi-auto), L4 (auto-approve)
- Tick loop every 3s polls nodes for file changes

### Key types:
```typescript
type ConductorRole = 'director' | 'planner' | 'worker' | 'qa' | 'auditor' | 'resolver';
type ConductorStatus = 'pending' | 'spawning' | 'running' | 'blocked' | 'awaiting-review' | 'done' | 'failed' | 'killed';
type AutonomyLevel = 'L2' | 'L3' | 'L4';

interface ConductorNode {
  id: string; missionId: string; parentId: string | null;
  role: ConductorRole; agentType: string; terminalId: string;
  worktreePath: string; branch: string; objective: string;
  status: ConductorStatus; depth: number; retries: number;
  boundaries: string[]; createdAt: number; lastActivityAt: number;
}

interface ConductorMessage {
  id: string; missionId: string; ts: number;
  from: string; to: string;
  type: 'TASK' | 'REPORT' | 'ESCALATE' | 'DIRECTIVE' | 'MERGE_OK' | 'MERGE_CONFLICT' | 'INFO';
  summary: string; payload?: any;
}
```

### Communication pattern (pollNode):
```typescript
// Agents write JSON files. Conductor polls every 3s.
const reportPath = path.join(dir, 'REPORT.json');
const escalatePath = path.join(dir, 'ESCALATE.json');
const planPath = path.join(dir, 'PLAN.json');
const goalsPath = path.join(dir, 'NEW_GOALS.json');
// If file exists → read, process, rename to .handled
```

### Agent state machine (main.ts):
```typescript
type AgentPhase = 'launching' | 'ready' | 'busy' | 'attention' | 'error';
// Detection: prompt regex + TUI settle heuristic (150B + 500ms silence)
// Events: agent:status, agent:ready, agent:idle, agent:timeout, agent:write-verified
```

### File locking (main.ts):
```typescript
// In-memory Map + DB persistence
acquireLock(filePath, terminalId, sessionId, action) → { acquired, heldBy }
releaseLock(filePath, terminalId)
// Pre-edit locking IPC exists but NO callers enforce it
// Build mutex: acquireBuildLock() / releaseBuildLock() — NEW, prevents simultaneous builds
```

### actions.json bridge (main.ts):
```typescript
// Agent writes actions → file watcher triggers execution → clears file
// NOW uses atomic write (write to .tmp then rename)
executeActionsFromFile(projectPath, terminalId)
// Action types: create_problem, update_problem, add_check, complete_check, update_request
```

### Context injection (main.ts assemble-context):
```typescript
// Builds parts[] from: problems, requests, sessions, backup protocol,
// user context profile, context brain retrieval, user dictionary, vocabulary
const context = parts.join('\n\n---\n\n');
return { success: true, context, tokensUsed };
```

### What's MISSING:
1. No persistence — missions lost on restart (in-memory Map only)
2. No build mutex enforcement between concurrent missions
3. No renderer UI for agent communication status
4. No "done communicating" detection beyond file polling
5. No context-aware file conflict prevention (boundaries are heuristic)
6. No session grouping (user can't organize sessions into collections)
7. No brain→agent learning loop (reflections don't feed back)
8. No vocabulary injection into agent prompts

## Project Structure
```
src/
├── main.ts (35000+ lines) — ALL IPC handlers, DB, state machine
├── preload.ts (1773 lines) — IPC bridge
├── pages/TerminalPage.tsx (5044 lines) — workspace with 5 groups
├── services/conductor/ConductorService.ts (682 lines) — orchestrator
├── services/AgentHostService.ts (390 lines) — parallel agent state
├── features/selection-engine/ — screen element capture
├── components/UserDictionaryPanel.tsx — vocabulary UI
└── main/archMap/scanner.ts — codebase scanner
```

## What to Design

A COMPLETE agentic system that:

1. **Agent Communication** — file-based, with completion detection
2. **Session Grouping** — organize sessions, auto-assign
3. **Context Management** — brain→AI, token efficiency, vocabulary
4. **Reflection Loop** — brain improves from lessons
5. **ConductorService Upgrade** — add missing features, don't replace
6. **UI** — proper interfaces for all of the above
