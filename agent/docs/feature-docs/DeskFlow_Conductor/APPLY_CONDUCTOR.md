# Conductor — autonomous multi-agent orchestration

This bundle adds the **Conductor** system: a tree of autonomous coding agents (Director → Planner/Worker/QA/Auditor/Resolver) that plan, execute, self-audit, and merge their own work with git-branch isolation, visualized live in a new sidebar page.

## Files in this bundle (all under `src/`, paths relative to your project root)

- `main.ts` — wires `ConductorService` into the Electron main process; adds 10 new `conductor:*` IPC handlers; extracts the old `terminal:create` handler into a reusable `createAgentTerminal()` function that Conductor also uses to spawn agent terminals.
- `preload.ts` — exposes the Conductor API on `window.deskflowAPI` (`conductorStart`, `conductorPause`, `conductorResume`, `conductorKill`, `conductorSetAutonomy`, `conductorSendDirective`, `conductorResolveEscalation`, `conductorPromoteIntegration`, `conductorGetSnapshot`, `conductorListMissions`, `onConductorSnapshot`, `onConductorMessage`).
- `services/ConductorService.ts` — the orchestration engine (new file). Runs a 3s tick loop that polls each agent's worktree for `.conductor/*.json` files, spawns/retries/escalates, queues and performs git merges, and dispatches a never-idle Auditor when the tree goes quiet.
- `components/conductor/OrgTreeGraph.tsx` — SVG org-chart visualization of the live agent tree with animated message pulses (new file).
- `components/conductor/ApprovalInbox.tsx` — pending/resolved escalation list with Approve/Reject actions (new file).
- `components/conductor/SwarmTrace.tsx` — scrolling chronological message feed, click a name to focus that node (new file).
- `pages/ConductorPage.tsx` — the new sidebar page: mission launcher (repo folder picker, objective, agent type, autonomy level) plus the tree/inbox/trace views (new file).
- `App.tsx` — adds a **Conductor** sidebar item (git-branch icon) and the `/conductor` route.

## Apply instructions

1. Copy every file in this zip's `src/` folder over the matching path in your project, overwriting `main.ts`, `preload.ts`, and `App.tsx`, and adding the four new files under `services/` and `components/conductor/` and `pages/`.
2. No new npm dependencies are required — everything uses packages already in your project (`react`, `lucide-react`, `electron`, Node's built-in `fs`/`path`/`child_process`).
3. Rebuild/restart the app as usual.

## How it works

### Git isolation (no agent ever touches your working branch directly)
- Starting a mission captures your current branch (`userBranch`) and creates `conductor/<missionId>/integration` off `HEAD`.
- Each agent node gets its own `git worktree` at `.conductor-worktrees/<missionId>/<nodeId>` on branch `conductor/<missionId>/<nodeId>`, checked out from the integration branch.
- `.conductor-worktrees/` is auto-added to `.gitignore`.
- When a worker finishes, its branch is queued and merged (`--no-ff`) into the integration worktree one at a time (serialized merge queue — no concurrent-merge races).
- **Real conflict detection**: if a merge fails, Conductor aborts it and spawns a dedicated **Resolver** agent whose only job is to resolve that specific conflict, preserving both sides' intent.
- Nothing ever touches your real branch until you click **Promote**, which does a single `--no-ff` merge of the integration branch into your branch.

### File-based agent contract
Each agent's worktree has a `.conductor/` folder:
- `SESSION.json` — machine-readable brief (objective, file boundaries, budget, whether it can spawn children).
- `PLAN.json` — written by Director/Planner agents to hand off subtasks (`{ subtasks: [{ role, objective, boundaries }] }`).
- `REPORT.json` — written when an agent finishes (`{ success, summary }`).
- `ESCALATE.json` — written when an agent needs human input (`{ reason, detail }`).
- `NEW_GOALS.json` — written to propose follow-up work (`{ goals: [...] }`).
Each is renamed to `*.handled` once Conductor processes it, so nothing is double-counted.

### Solving "single goal exhaustion"
When every node in a mission's tree goes idle (done/failed/killed) and the merge/spawn queues are empty, Conductor automatically dispatches an **Auditor** agent against the integration branch. Its job is to run tests/build, read the diff, and either confirm the objective is fully met or write concrete next goals — which become a new Director run. The mission only truly stops when you kill it or the Auditor confirms completion and no new goals are proposed.

### File-boundary conflict avoidance
Before spawning a child, Conductor checks its declared file-glob boundaries against every currently-active node's boundaries. Overlapping work is queued (not spawned) until the conflicting node finishes, so two agents are never editing overlapping paths in parallel.

### Autonomy ladder
- **L2** — every escalation (policy, budget, low confidence, blast-radius, merge conflicts, new-goal proposals) waits for your Approve/Reject in the inbox.
- **L3** (default) — same as L2 today; reserved for tuning which reasons require approval as you use it.
- **L4** — confidence and new-goal-proposal escalations auto-approve; policy/budget/blast-radius/merge-conflict escalations still wait for you.

### Visualization
- **Org tree** (`OrgTreeGraph.tsx`): boss + conductor anchors, role-colored nodes (Director/Planner/Worker/QA/Auditor/Resolver) with status pill, retry badge, and animated pulses that travel along the edges when a message is sent — all in the existing dark/accent design language.
- **Approval inbox**: reason-badged escalation cards with an optional note field and Approve/Reject.
- **Swarm trace**: chronological message log, color-coded by type (TASK/REPORT/ESCALATE/DIRECTIVE/MERGE_OK/MERGE_CONFLICT/INFO), click a name to select that node in the tree.

## Manual test steps
1. Open **Conductor** in the sidebar.
2. Pick a folder that is a git repository, type an objective (e.g. "add a health-check endpoint"), pick an agent type and autonomy level, click **Start mission**.
3. Watch the tree: a Director node should appear and go `running`, then either report done or spawn Planner/Worker children (visible as new nodes with animated pulses connecting them).
4. When a Worker finishes, watch the Swarm trace show a `MERGE_OK` (or `MERGE_CONFLICT` followed by a Resolver node spawning).
5. If autonomy is L2/L3, confirm escalations appear in the Approval inbox and that Approve/Reject unblocks or fails the corresponding node.
6. Let the tree go idle and confirm an Auditor node is dispatched automatically after ~20s.
7. Click **Promote** and confirm (via `git log`) that the integration branch merged cleanly into your original branch.
8. Click **Pause/Resume/Kill** and confirm the mission list status updates accordingly.
