# PROMPT: Design the Conductor — Autonomous Multi-Agent Orchestration System

## Raw Request

> the conductor features really bad. First of all, it is like how is it that it is a new mission thing and you are selecting your repository path when you are already in the project? What are you still selecting your repository path? And why is it a git path if it's a git then it should be a git link to the repository then. And what is this an objective and like autonomy and like it's just not human centric enough. There needs to be some more visualizations and like it's so out of touch. The start mission doesn't even work and if we don't even have the visualizations to see the agents and how is it going to manage the agent in which AI is going to be the manager because the open code is just the ones that will be executing a program right there's no configuration whatsoever. Does the manager be from open code as well or are we using external API sources like overroader or copware or whatever is in a setting we should be able to select from them. The page is very empty and there's no proper way of doing things and the UI doesn't exist. Create the mission the logic for the missions the conductor. I don't think you haven't built the logic for the conductor at all. How does it even work? It needs to be that there's the roles. How do you assign the role of what are the problems that you used to make the workflow and how is it parsed that you know what are the roles and everything. And then how does the first AI manage the system problem for those managers and how does it make it fully autonomous like you need to configure the system. I don't think you barely built the form and you didn't even build the backend. There's a lot of things. If there's no details there, I would like you to use the generate-prompt skill to fully design the backend and how the logic works. How can we improve how can we restore that under the stuff and like how can we integrate the security thing and how can we integrate the system where it's going to use probe mcp. So how can we make sure that the application that their testing is shown we can see from the workspace applications that are opening by the agents and like what are the lists of agents and the visualization of like just a mapping of my map for example, sort of my map, but more specialized for these agents exist and like a decision tree sort of style where there's like a hierarchy to represent the roles and stuff like that. There's so much to add and there's so much to work on. How can we be able to set the list of types of workers? What are the most effective types of workers the managers how to work or what are the roles that we can assign to we're like as the default of like the system and like the AI is going to engineer the workflow and the hierarchy and the roles and stuff like that. How many do we need and how does it control the sessions? How does it create a new session? I don't think you understand how how much you have to consider to be able to do all this because like there's there's a lot of things right you need to incorporate the features. And the features of the application the workspace needs to also be capacitating show that it's being used for this conductor system right there needs to be a total full on review on like the files and everything every page should show that if it's being used like something and like prompting send and so on and so forth.

## Context Bundle

Read `agent/docs/conductor-design/CONTEXT_BUNDLE.md` for the full source code of the existing Conductor system. This file contains the actual TypeScript/React code with file paths and line numbers. Do NOT guess at the code structure — the context bundle IS the codebase reference.

---

## Mandate

Design a **comprehensive, fully autonomous multi-agent orchestration system** that integrates deeply with the DeskFlow workspace. You are the **Lead Designer and Engineer**. Do NOT provide options. Design THE solution.

The existing Conductor backend has basic mission lifecycle and git worktree isolation. The frontend has a bare-bones UI. Both need to be completely redesigned.

---

## What Needs to Be Designed

### 1. Backend Service Redesign (ConductorService.ts)
The existing `ConductorService.ts` (676 lines) has basic mission lifecycle but is missing critical backend logic:
- **Budget tracking:** No token counting, no cost estimation, no budget limits per agent or per mission
- **Agent type registry:** No way to register/configure different AI providers (opencode, claude, gemini, codex, custom API)
- **Workflow template engine:** No template system — missions are created from raw objectives with no structure
- **Role assignment logic:** Roles are hardcoded — no dynamic role assignment based on task complexity
- **File boundary enforcement:** Boundaries are checked for overlap but not enforced during agent execution
- **Progress tracking:** No way to track mission progress (% complete, tasks done vs total)
- **Agent session management:** No integration with DeskFlow's terminal session system
- **Audit/metrics:** No logging of agent actions, token usage, costs, or performance metrics
- **Recovery logic:** No way to recover from agent crashes, timeout, or stuck states
- **Configuration persistence:** Agent type configs, workflow templates, budget limits not saved to DB
- **Agent prompt generation:** Prompts are hardcoded strings — no dynamic prompt assembly from context
- **Merge conflict resolution:** Basic resolver spawning but no intelligent conflict analysis
- **Concurrency control:** File boundary overlap checking is basic — no proper locking or queuing

Design the complete backend logic for:
1. **Agent Provider Registry** — register/configure AI providers with API keys, rate limits, capabilities
2. **Workflow Template Engine** — parse workflow templates, assign roles, set boundaries, estimate budgets
3. **Budget Manager** — track tokens per agent, per mission, enforce limits, generate cost reports
4. **Progress Tracker** — track mission progress, task completion, agent performance
5. **Session Integrator** — link conductor agents to DeskFlow terminal sessions, track agent activity
6. **Metrics Collector** — log agent actions, token usage, costs, performance, errors
7. **Recovery Manager** — detect stuck agents, retry failed tasks, handle timeouts
8. **Config Persistence** — save/load agent configs, workflow templates, budget limits to DB
9. **Prompt Assembler** — dynamically build agent prompts from mission context, role, boundaries, budget
10. **Concurrency Manager** — proper file locking, task queuing, deadlock detection

### 2. Database Schema
Design new DB tables for:
- `conductor_missions` — mission state, config, budget, progress
- `conductor_nodes` — agent nodes with role, status, token usage, performance metrics
- `conductor_messages` — message log with type, from, to, summary, payload
- `conductor_escalations` — escalation items with reason, status, resolution
- `conductor_configs` — agent provider configs, workflow templates, budget limits
- `conductor_metrics` — per-agent metrics (tokens, cost, time, success rate)
- `conductor_templates` — workflow templates with roles, boundaries, budget estimates

### 3. IPC Endpoints
Design new IPC endpoints for:
- `conductor:get-config` — get agent provider configs, workflow templates, budget limits
- `conductor:save-config` — save agent provider configs, workflow templates, budget limits
- `conductor:get-metrics` — get mission/agent metrics (tokens, cost, time, success rate)
- `conductor:get-templates` — list available workflow templates
- `conductor:save-template` — save a new workflow template
- `conductor:get-progress` — get mission progress (% complete, tasks done vs total)
- `conductor:get-budget` — get budget status (used, remaining, per-agent breakdown)
- `conductor:recover-agent` — recover a stuck or failed agent
- `conductor:enforce-boundary` — check if agent is within its file boundaries

### 4. Mission Creation System
Design a multi-step mission creation wizard that:
- Auto-detects the current project (no manual repo path selection)
- Offers workflow templates (code review, bug fix, feature build, refactoring, research)
- Lets the user describe the objective in natural language
- Has the AI engineer the workflow (roles, hierarchy, boundaries) from the objective
- Shows a preview of the planned agent tree before starting
- Allows customization of agent types per role

### 2. Agent Type System
Design a configuration system where:
- Each role (director, planner, worker, qa, auditor, resolver) can be assigned a different AI provider
- Available providers include: opencode, claude, gemini, codex, and custom API endpoints
- The "manager" AI (director/planner) can be different from "worker" AI
- Budget limits can be set per agent type
- Agent capabilities are declared (file access, terminal access, git access)

### 3. Role Configuration
Design a role management system:
- Default roles with sensible defaults
- Custom role creation with configurable permissions
- Role-to-agent-type mapping
- File boundary assignment per role
- Recursion depth limits per role

### 4. Workflow Templates
Design pre-built workflow templates:
- **Code Review:** Director → Worker (read code) → QA (verify) → Auditor (confirm)
- **Bug Fix:** Director → Planner (analyze) → Worker (fix) → QA (test) → Resolver (if conflicts)
- **Feature Build:** Director → Planner (design) → Workers (implement in parallel) → QA (integration test)
- **Refactoring:** Director → Worker (refactor) → QA (verify no regressions)
- Each template defines: roles needed, agent types, boundaries, budget, expected duration

### 5. Visualization System
Design comprehensive visualizations:
- **Agent Tree:** Interactive org chart showing hierarchy, status, role colors, animated message pulses
- **File Map:** Which files each agent owns, overlap detection, boundary visualization
- **Progress Dashboard:** Mission progress bar, agent status cards, merge history, token usage
- **Decision Tree:** Flow of control from director → planner → worker → qa → auditor
- **Session Integration:** Show agent terminals in workspace, link to sessions tab

### 6. Budget & Token Tracking
Design a budget system:
- Per-mission total token budget
- Per-agent token usage tracking
- Cost estimation based on provider pricing
- Budget alerts when approaching limits
- Auto-pause when budget exceeded (configurable)

### 7. Workspace Integration
Design how the Conductor integrates with existing workspace features:
- **Sessions Tab:** Show conductor agent sessions alongside regular sessions
- **Terminal Map:** Show conductor agent terminals in the map view
- **Files Tab:** Show which files are being modified by which agents
- **Performance Tab:** Show resource usage per agent
- **Insights:** Show conductor metrics (missions completed, agents used, tokens spent)

### 8. Configuration Panel
Design a global configuration panel:
- Default agent types per role
- Default budget limits
- Default autonomy level
- Agent provider API keys/endpoints
- Conductor behavior (auto-audit interval, merge strategy, conflict resolution)

---

## Constraints

1. Must work with existing IPC infrastructure (conductor:* handlers already wired)
2. Must preserve git worktree isolation (existing feature)
3. Must follow the existing design system (zinc dark palette, glass cards, Geist font)
4. Files affected: `src/pages/ConductorPage.tsx`, `src/components/workspace/ConductorWorkspaceTab.tsx`, `src/components/conductor/*`, `src/services/conductor/ConductorService.ts`, `src/main.ts`
5. No comments in code output
6. CRLF line endings preserved
7. Must integrate with existing workspace sidebar (Conductor group with Missions/Approvals/Trace tabs)

## Output Format

Return a RESULT.md with:
1. **System Architecture** — how the pieces connect (frontend, backend, DB, IPC, agents)
2. **Backend Service Redesign** — complete ConductorService.ts rewrite with all new logic
3. **Database Schema** — all new tables with CREATE TABLE statements
4. **IPC Endpoints** — all new handlers with payload shapes
5. **Mission Creation Wizard** — multi-step flow with screenshots
6. **Agent Type System** — configuration schema and UI
7. **Role Configuration** — defaults and customization
8. **Workflow Templates** — pre-built templates with customization
9. **Visualization System** — all visual components
10. **Budget & Token Tracking** — schema and UI
11. **Workspace Integration** — how each tab shows conductor data
12. **Configuration Panel** — global settings
13. **Frontend Changes** — components, pages, state management
14. **Build & Test** — commands to verify
