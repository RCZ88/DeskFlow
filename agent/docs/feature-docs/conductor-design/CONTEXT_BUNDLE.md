# Context Bundle — Conductor System Design

> This bundle contains the ACTUAL source code for the Conductor system.
> The target AI must read this FIRST, then design a comprehensive autonomous multi-agent orchestration system.

---

## Current State

The Conductor system EXISTS as code but is poorly designed:
- **Backend:** `ConductorService.ts` (676 lines) — has basic mission lifecycle (start/pause/resume/kill), git worktree isolation, agent spawning, escalation system, merge queue, auditor dispatch
- **Frontend:** `ConductorPage.tsx` (480 lines) — has project picker, mission list, snapshot viewer, new mission form
- **Components:** `OrgTreeGraph.tsx` (SVG org chart), `ApprovalInbox.tsx`, `SwarmTrace.tsx`
- **Workspace:** `ConductorWorkspaceTab.tsx` — simplified version for workspace sidebar

**What's WRONG:**
1. No proper workflow design — user types an objective and hopes for the best
2. No agent type configuration — only "opencode" and "claude" as options
3. No role assignment UI — roles are hardcoded in the service
4. No visualization of agent progress — just a basic org tree
5. No integration with workspace features (sessions, files, terminal map)
6. No way to configure the manager AI vs worker AI
7. No template system for common workflows
8. No budget/token tracking
9. No file boundary visualization
10. The "New Mission" form is bare-bones — just objective + agent + autonomy

**What's MISSING from the backend:**
1. **Budget tracking:** No token counting, no cost estimation, no budget limits per agent or per mission
2. **Agent type registry:** No way to register/configure different AI providers
3. **Workflow template engine:** No template system — missions are created from raw objectives
4. **Role assignment logic:** Roles are hardcoded — no dynamic role assignment
5. **File boundary enforcement:** Boundaries are checked for overlap but not enforced during execution
6. **Progress tracking:** No way to track mission progress (% complete, tasks done vs total)
7. **Agent session management:** No integration with DeskFlow's terminal session system
8. **Audit/metrics:** No logging of agent actions, token usage, costs, or performance
9. **Recovery logic:** No way to recover from agent crashes, timeout, or stuck states
10. **Configuration persistence:** Agent configs, workflow templates, budget limits not saved to DB
11. **Agent prompt generation:** Prompts are hardcoded strings — no dynamic prompt assembly
12. **Merge conflict resolution:** Basic resolver spawning but no intelligent conflict analysis
13. **Concurrency control:** File boundary overlap checking is basic — no proper locking
14. **DB schema:** No tables for missions, nodes, messages, escalations, configs, metrics, templates

---

## Source Code

### ConductorService.ts (key sections)

```typescript
// src/services/conductor/ConductorService.ts (676 lines)
// FULL SOURCE CODE — see context bundle for complete file
// Key architecture:
// - Mission lifecycle: start → spawn director → director writes PLAN.json → spawn workers → workers write REPORT.json → merge → audit
// - Git worktree isolation: each agent gets its own worktree + branch
// - File-based agent contract: .conductor/SESSION.json, REPORT.json, ESCALATE.json, PLAN.json, NEW_GOALS.json
// - 3s tick loop: polls agent worktrees for JSON files, processes them
// - Escalation system: agents can request help via ESCALATE.json
// - Merge queue: worker branches merged one at a time into integration branch
// - Auto-audit: when tree goes idle, spawns auditor to check completion
// - Hardcoded agent prompts (need to be made dynamic)
// - No budget tracking
// - No progress tracking
// - No metrics collection
// - No configuration persistence
// - No recovery logic for stuck agents
```

**Full ConductorService.ts source code is in `src/services/conductor/ConductorService.ts` (676 lines).** The target AI must read this file to understand the existing logic before redesigning it.

export interface ConductorNode {
  id: string;
  missionId: string;
  parentId: string | null;
  role: ConductorRole;
  agentType: string;
  terminalId: string;
  worktreePath: string;
  branch: string;
  objective: string;
  status: ConductorStatus;
  depth: number;
  retries: number;
  boundaries: string[];
  createdAt: number;
  lastActivityAt: number;
}

export interface ConductorMessage {
  id: string;
  missionId: string;
  ts: number;
  from: string;
  to: string;
  type: 'TASK' | 'REPORT' | 'ESCALATE' | 'DIRECTIVE' | 'MERGE_OK' | 'MERGE_CONFLICT' | 'INFO';
  summary: string;
  payload?: any;
}

export interface EscalationItem {
  id: string;
  missionId: string;
  nodeId: string | null;
  reason: EscalationReason;
  detail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  decidedAt?: number;
  note?: string;
}

// The service spawns agents via host.spawnAgentTerminal()
// Each agent gets a git worktree, a .conductor/ folder with SESSION.json
// Agents communicate by writing JSON files: REPORT.json, ESCALATE.json, PLAN.json, NEW_GOALS.json
// The service polls these files every 3s and processes them

// Mission lifecycle:
// 1. startMission() — creates integration branch, spawns director agent
// 2. Director writes PLAN.json with subtasks
// 3. Service spawns workers for each subtask (with file boundary checking)
// 4. Workers write REPORT.json when done
// 5. Service merges worker branches into integration branch
// 6. If merge conflict → spawns resolver agent
// 7. When all nodes idle → spawns auditor to check completion
// 8. promoteIntegration() merges into user's branch

// Agent prompt template (hardcoded):
const contracts: Record<ConductorRole, string> = {
  director: 'You are the DIRECTOR agent...',
  planner: 'You are a PLANNER agent...',
  worker: 'You are a WORKER agent...',
  qa: 'You are a QA agent...',
  auditor: 'You are the AUDITOR agent...',
  resolver: 'You are a RESOLVER agent...',
};
```

### OrgTreeGraph.tsx (visualization)

```tsx
// src/components/conductor/OrgTreeGraph.tsx
// SVG-based org chart with:
// - Boss node (top-left) and Conductor node (top-right)
// - Role-colored nodes: director (purple), planner (blue), worker (cyan), qa (teal), auditor (amber), resolver (rose)
// - Status pills: pending, spawning, running, blocked, awaiting-review, done, failed, killed
// - Animated message pulses traveling between nodes
// - Node selection via click
// - Responsive width via ResizeObserver

const ROLE_META: Record<ConductorRoleVM, { icon: any; color: string; label: string }> = {
  director: { icon: Crown, color: '#8b5cf6', label: 'Director' },
  planner: { icon: Cog, color: '#3b82f6', label: 'Planner' },
  worker: { icon: Hammer, color: '#22d3ee', label: 'Worker' },
  qa: { icon: FlaskConical, color: '#14b8a6', label: 'QA' },
  auditor: { icon: Search, color: '#f59e0b', label: 'Auditor' },
  resolver: { icon: GitMerge, color: '#f43f5e', label: 'Resolver' },
};
```

### ConductorWorkspaceTab.tsx (workspace sidebar)

```tsx
// src/components/workspace/ConductorWorkspaceTab.tsx
// Simplified version for workspace sidebar with:
// - Missions tab: creation form + expandable mission cards + OrgTreeGraph
// - Approvals tab: approve/reject escalation buttons
// - Trace tab: color-coded message log

// Creation form has: repo path (folder picker), objective textarea, agent selector, autonomy selector
// Mission cards expand to show: status, nodes, OrgTreeGraph visualization, controls (Pause/Resume/Kill/Promote)
```

### IPC Endpoints (already wired)

```typescript
// main.ts — all 10 handlers registered
conductor:start → ConductorService.startMission()
conductor:pause → ConductorService.pauseMission()
conductor:resume → ConductorService.resumeMission()
conductor:kill → ConductorService.killMission()
conductor:set-autonomy → ConductorService.setAutonomy()
conductor:send-directive → ConductorService.sendDirective()
conductor:resolve-escalation → ConductorService.resolveEscalation()
conductor:promote → ConductorService.promoteIntegration()
conductor:get-snapshot → ConductorService.getSnapshot()
conductor:list-missions → ConductorService.listMissions()
```

### Preload Bridges (already wired)

```typescript
// preload.ts — all 13 bridges registered
conductorStart, conductorPause, conductorResume, conductorKill,
conductorSetAutonomy, conductorSendDirective, conductorResolveEscalation,
conductorPromoteIntegration, conductorGetSnapshot, conductorListMissions,
onConductorSnapshot, onConductorMessage
```

---

## Design Tokens

```css
/* Conductor accent */
rose: bg-rose-500/15, text-rose-300, ring-rose-500/30

/* Node status colors */
running: #22d3ee (cyan)
blocked: #f59e0b (amber)
done: #10b981 (emerald)
failed: #ef4444 (red)
pending: #71717a (zinc)
spawning: #a1a1aa (zinc)
awaiting-review: #8b5cf6 (purple)
killed: #52525b (zinc)

/* Card style */
bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 rounded-xl p-3

/* Glass layer */
bg-zinc-900/95 backdrop-blur-xl ring-1 ring-inset ring-zinc-700/50 shadow-2xl shadow-black/60
```

---

## What the Target AI Must Design

### Frontend
1. **Mission Creation Wizard** — multi-step form with workflow templates, agent configuration, role assignment
2. **Agent Type System** — configurable AI providers (opencode, claude, gemini, codex, custom API), manager vs worker distinction
3. **Role Configuration UI** — define custom roles, assign agents to roles, set boundaries
4. **Workflow Templates** — pre-built workflows (code review, bug fix, feature implementation, refactoring)
5. **Budget/Token Tracking** — per-agent token usage, cost tracking, budget limits
6. **File Boundary Visualization** — show which files each agent owns, overlap detection
7. **Agent Session Integration** — show agent terminals in workspace, link to sessions
8. **Decision Tree Visualization** — hierarchy of roles, flow of control
9. **Progress Dashboard** — mission progress, agent status, merge history
10. **Configuration Panel** — global conductor settings, default agents, budget limits

### Backend Logic (MISSING — must be designed)
11. **Agent Provider Registry** — register/configure AI providers with API keys, rate limits, capabilities
12. **Workflow Template Engine** — parse workflow templates, assign roles, set boundaries, estimate budgets
13. **Budget Manager** — track tokens per agent, per mission, enforce limits, generate cost reports
14. **Progress Tracker** — track mission progress (% complete, tasks done vs total)
15. **Session Integrator** — link conductor agents to DeskFlow terminal sessions, track agent activity
16. **Metrics Collector** — log agent actions, token usage, costs, performance, errors
17. **Recovery Manager** — detect stuck agents, retry failed tasks, handle timeouts
18. **Config Persistence** — save/load agent configs, workflow templates, budget limits to DB
19. **Prompt Assembler** — dynamically build agent prompts from mission context, role, boundaries, budget
20. **Concurrency Manager** — proper file locking, task queuing, deadlock detection

### Database Schema (MISSING — must be designed)
21. **conductor_missions** — mission state, config, budget, progress
22. **conductor_nodes** — agent nodes with role, status, token usage, performance metrics
23. **conductor_messages** — message log with type, from, to, summary, payload
24. **conductor_escalations** — escalation items with reason, status, resolution
25. **conductor_configs** — agent provider configs, workflow templates, budget limits
26. **conductor_metrics** — per-agent metrics (tokens, cost, time, success rate)
27. **conductor_templates** — workflow templates with roles, boundaries, budget estimates

### IPC Endpoints (MISSING — must be designed)
28. **conductor:get-config** — get agent provider configs, workflow templates, budget limits
29. **conductor:save-config** — save agent provider configs, workflow templates, budget limits
30. **conductor:get-metrics** — get mission/agent metrics (tokens, cost, time, success rate)
31. **conductor:get-templates** — list available workflow templates
32. **conductor:save-template** — save a new workflow template
33. **conductor:get-progress** — get mission progress (% complete, tasks done vs total)
34. **conductor:get-budget** — get budget status (used, remaining, per-agent breakdown)
35. **conductor:recover-agent** — recover a stuck or failed agent
36. **conductor:enforce-boundary** — check if agent is within its file boundaries
