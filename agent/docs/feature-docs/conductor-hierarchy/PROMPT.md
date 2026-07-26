# PROMPT: Dynamic Conductor Hierarchy — AI-Driven Role Assignment

## Raw Request

> "how does the initialization of the conductor system work on deciding the hierarchy? is it HARDCODED??? theres no AI thinking system to decide the hierarchy yet. we need to design that system with the system prompt and everything and the parsing"

## Context

The Conductor system at `src/services/conductor/ConductorService.ts` currently has:

### What's Hardcoded (Lines 5, 573-591, 558)
```typescript
// Line 5 — Fixed role enum
export type ConductorRole = 'director' | 'planner' | 'worker' | 'qa' | 'auditor' | 'resolver';

// Lines 573-591 — Hardcoded system prompts per role
const contracts: Record<ConductorRole, string> = {
  director: 'You are the DIRECTOR agent...',
  planner: 'You are a PLANNER agent...',
  worker: 'You are a WORKER agent...',
  qa: 'You are a QA agent...',
  auditor: 'You are the AUDITOR agent...',
  resolver: 'You are a RESOLVER agent...',
};

// Line 558 — Hardcoded recursion rules
recursion: { can_spawn_children: opts.role === 'director' || opts.role === 'planner', max_depth: 4 },
```

### What's Dynamic (Lines 317-329)
The director writes `.conductor/PLAN.json` at runtime:
```json
{ "subtasks": [
  { "role": "worker", "objective": "...", "boundaries": ["src/foo/**"] },
  { "role": "qa", "objective": "...", "boundaries": ["src/foo/**"] }
]}
```

### What's Hardcoded in main.ts (Lines 16987-17038)
Default role hierarchy and 4 templates:
```typescript
const defaultRoles = [
  { role: 'director', canSpawnChildren: true, maxDepth: 2, ... },
  { role: 'planner', canSpawnChildren: false, ... },
  { role: 'worker', ... },
  { role: 'worker', ... },
  { role: 'qa', ... },
];
```

---

## What's Missing: The AI Thinking System

There is NO system that:
1. Analyzes the mission objective and determines what roles are needed
2. Decides the optimal hierarchy depth and branching factor
3. Assigns capabilities (file access, terminal access, budget) based on mission complexity
4. Generates role-specific system prompts tailored to the mission
5. Parses mission requirements into agent specifications

Currently the user must manually pick from 4 hardcoded templates or the system defaults to a fixed Director→2 Workers→QA structure regardless of mission complexity.

---

## Design Requirements

### 1. Mission Analyzer (The "Brain")

A new service that takes the mission objective and produces an `AgentHierarchySpec`:

**Input:** `{ objective: string, repoRoot: string, projectType?: string }`

**Analysis steps:**
1. **Parse the objective** — extract: what kind of work (bug fix, feature, refactor, review), what files/areas are affected, how complex it is
2. **Scan the repo** — read package.json, directory structure, existing tests, to understand project shape
3. **Determine mission type** — classify as: `bug-fix`, `feature`, `refactor`, `review`, `migration`, `audit`, `custom`
4. **Decide roles needed** — based on mission type and complexity:
   - Simple bug fix → Director + Worker + QA (3 agents)
   - Complex feature → Director + Planner + 2 Workers + QA + Auditor (6 agents)
   - Refactor → Director + Worker + QA + Auditor (4 agents)
5. **Assign capabilities per role** — file access scope, terminal access, git access, budget
6. **Generate system prompts** — role-specific instructions tailored to the mission

**Output:** `AgentHierarchySpec`
```typescript
interface AgentHierarchySpec {
  missionType: string;
  complexity: 'simple' | 'moderate' | 'complex';
  roles: RoleSpec[];
  reasoning: string;  // Why this hierarchy was chosen
}

interface RoleSpec {
  role: string;           // Can be extended beyond the 6 base roles
  label: string;          // Human-readable name
  canSpawnChildren: boolean;
  maxDepth: number;
  maxChildren: number;
  fileAccess: 'read' | 'write' | 'none';
  terminalAccess: boolean;
  gitAccess: boolean;
  autoAudit: boolean;
  budgetTokens: number;
  systemPrompt: string;   // Generated, not hardcoded
  suggestedBoundaries: string[];  // File glob patterns
}
```

### 2. Dynamic System Prompt Generator

Instead of hardcoded `contracts[role]`, generate prompts that include:

**For Director:**
```
You are the DIRECTOR for mission: "{objective}"

Mission Type: {missionType}
Complexity: {complexity}
Project: {repoRoot} ({projectType})

Your team:
{roles.map(r => `- ${r.label} (${r.role}): ${r.description}`).join('\n')}

Break the objective into subtasks. Write .conductor/PLAN.json:
{ "subtasks": [{ "role": "...", "objective": "...", "boundaries": ["..."] }] }

Constraints:
- Only assign roles that exist in your team
- Respect file boundaries — don't give a worker access to files outside its scope
- If the task is small enough for you to handle alone, do it and write REPORT.json
- Budget: {totalBudget} tokens across all agents
```

**For Worker:**
```
You are a WORKER agent: "{label}"
Mission: "{objective}"
Your scope: {boundaries}
Your budget: {budgetTokens} tokens

Complete the objective within your declared file boundaries only.
When done, write .conductor/REPORT.json with { "success": true, "summary": "..." }.
If you need help, write .conductor/ESCALATE.json.
```

### 3. Hierarchy Templates (Dynamic, Not Hardcoded)

Instead of 4 fixed templates, store templates as data that can be composed:

```typescript
const HIERARCHY_PATTERNS: Record<string, Partial<AgentHierarchySpec>[]> = {
  'bug-fix': [
    { complexity: 'simple', roles: [
      { role: 'director', ... },
      { role: 'worker', label: 'Fixer', ... },
      { role: 'qa', label: 'Verifier', ... },
    ]},
    { complexity: 'complex', roles: [
      { role: 'director', ... },
      { role: 'planner', ... },
      { role: 'worker', label: 'Investigator', ... },
      { role: 'worker', label: 'Fixer', ... },
      { role: 'qa', ... },
      { role: 'auditor', ... },
    ]},
  ],
  'feature': [ ... ],
  'refactor': [ ... ],
  'review': [ ... ],
};
```

### 4. Hierarchy Parser (Runtime)

When the director writes PLAN.json, the system should:
1. **Validate** that referenced roles exist in the hierarchy spec
2. **Auto-assign capabilities** based on the role's spec (not hardcoded)
3. **Enforce budget** — subtract from parent's budget when spawning children
4. **Log the decision** — why this role was assigned this objective

### 5. Integration Points

The `startMission()` flow should become:
```
1. User provides objective
2. MissionAnalyzer scans repo + parses objective
3. Generates AgentHierarchySpec
4. Shows spec to user for confirmation (optional)
5. Writes spec to .conductor/HIERARCHY.json
6. Spawns director with generated system prompt
7. Director writes PLAN.json → validated against HIERARCHY.json
8. Children spawned with role-specific generated prompts
```

---

## Output Format

Return:
1. **MissionAnalyzer service** — full TypeScript implementation
2. **System prompt generator** — function that builds prompts from spec
3. **Hierarchy spec type** — complete TypeScript interfaces
4. **Template data structure** — dynamic pattern library
5. **Integration changes** — what changes in ConductorService.ts and main.ts
6. **New IPC endpoints** — if needed for the analyzer
7. **UI changes** — MissionWizard should show the generated spec before launch
