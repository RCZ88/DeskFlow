# PROMPT: Fix All 18 Workspace Problems

## Raw Request

> THE PERFORMANCE PAGE IS SUPPOSED TO SHOW THE CPU GPU AND LIKE RAM USAGE. ITS SUPPOSED TO SHOW HOW MUCH THE WORKSPACE IS USING THE RAM AND STUFF, AND MAYBE IT SHOULD BE FOR THE PROJECT THAT IS RUNNING OR SOMETHING. BUT SHOULD MAINLY BE FOR THE APP. ALSO WHY DOES THE INITIALIZATION OF THE WORKSPACE NOT WORKING? I'VE TRIED TO CREATE A NEW SESSION AND IT JUST HAS THE SAME PROBLEM OF PUSHING THE CLI DOWN, PUSHING THE THING DOWN. THE SAVING OF THE WORKSPACE ALSO DOESN'T SAVE THE WORKSPACE AND DOESN'T EVEN OPEN UP THE TERMINALS THAT ARE OPEN. THERE'S NO VIEWING OF THE DETAIL FOR THE THINGS THAT ARE SAVED ON THAT. WHEN LOADING THE WORKSPACE, IT DOESN'T LOAD ANYTHING, IT JUST LOADS THE GOOD. IT DOESN'T EVEN LOAD THE TERMINAL YET. LET ALONE LOADING THE OPEN CODE SESSION OR ANY AI SESSIONS THAT ARE SUPPOSED TO BE SAVED. WHEN I CREATE A NEW TERMINAL, WHY DOES IT INSTANTLY INITIALIZE THE SYSTEM? IT SHOWS THE ERROR OF INITIALIZATION EVEN THOUGH IT'S NOT EVEN A SESSION YET. IF YOU'RE CREATING A NEW TERMINAL, YOU'RE NOT SUPPOSED TO INITIALIZE ANYTHING. THE SKILL CONFIGURATION DOESN'T WORK. IT ONLY SHOWS ONE SKILL. I CAN'T DRAG A TERMINAL INTO A DIFFERENT GROUP IN THE MAPPINGS. THE VISUALIZATION OF THE TERMINALS AND THE SESSIONS. THERE'S NO VISUALIZATION IMPLEMENTED YET. THE AUTONOMOUS AUTOMATION OF THE FULLY AUTONOMOUS SYSTEM IS NOT HERE. ITS MISSING. IM UNABLE TO SCROLL ON ANY OF THE SIDEBAR WORKSPACE PAGES THAT HAS MULTIPLE ITEMS AND EVERY SINGLE PAGE. THE PROMPTS PAGE IS ALSO NOT WORKING BECAUSE THE TOP STATS ON THE PROMPT ALWAYS GLITCHES OUT AND BACK AND FORTH.

## Context Bundle

Read `agent/docs/workspace-fixes/CONTEXT_BUNDLE.md` for the full source code of every broken component. This file contains the actual TypeScript/React code with file paths and line numbers. Do NOT guess at the code structure — the context bundle IS the codebase reference.

## Problem Register

Read `agent/ALL_PROBLEMS.md` for the complete list of 18 problems (P01–P18) with area, expected behavior, actual behavior, and status.

---

## Mandate

Design a **single, comprehensive fix** for all 18 workspace problems. You are the **Lead Engineer**. Do NOT provide options. Design THE solution.

For each problem, provide:
1. **Root cause** — why it's broken (trace to the actual code)
2. **Exact fix** — what code changes are needed (file, function, line range)
3. **Verification** — how to test it works

---

## Problem-by-Problem Requirements

### P01: Performance Page Shows Wrong Content
The PerformanceMetricsPanel was rewritten to use `getSystemStats()` and `onResourceStats()` IPC. Verify the component correctly:
- Fetches system stats (CPU count, total/used/free memory, uptime, platform)
- Subscribes to `terminal:resource-stats` events for per-terminal CPU/mem/lag
- Displays system overview cards, aggregate stats, and per-terminal breakdown
- No analytics data (focus scores, AI spend) — only real system resources

### P02: Compose Panel Pushes Terminal UI Down
The InstructionPanel was changed to absolute overlay (`absolute inset-x-0 top-0 z-40`). Verify:
- Panel renders over terminal content, not inline
- Terminal content does NOT shift when panel opens/closes
- Panel has max-h-[70vh] and overflow-y-auto for scrolling
- Close button works, send button works

### P03: Workspace Save Does Nothing Visible
The `handleSaveWorkspace` function calls `window.deskflowAPI.saveWorkspace()`. Verify:
- Save button triggers the function
- Toast notification appears on success
- Data is actually persisted (check workspace_state table)
- Error handling shows error toast on failure

### P04: Workspace Load Doesn't Restore Terminals
The `handleLoadWorkspace` function dispatches `create-terminal` events with `restoring: true`. Verify:
- Terminals are spawned from saved data
- Layout is restored
- Active terminal is set
- Terminals do NOT get initialized (restoring flag skips init)

### P05: No UI to View Saved Workspace Details
Need a workspace detail view showing:
- List of saved workspaces with name, timestamp, terminal count
- Preview of what's in each workspace (terminals, layout, active tab)
- Load/Delete buttons per workspace

### P06: New Terminal Triggers Initialization
The `create-terminal` handler should:
- Spawn the PTY
- NOT initialize agent unless explicitly requested
- Only `handleCreateNewSession` should call `initializeTerminal`

### P07: Cannot Scroll on Any Workspace Page
The WorkspaceShell uses `overflow-y-auto min-h-0` on the content div. The parent uses `min-h-0 overflow-hidden`. Verify:
- Scroll works on all pages with overflow content
- The accent strip stretches full height
- No content is clipped

### P08: Can't Drag Terminals Between Groups
Need drag-and-drop implementation in the Map subtab:
- Visual representation of terminal groups
- Drag a terminal from one group to another
- Update layout on drop

### P09: Terminal Visualization Not Implemented
Need a visual map of the terminal layout:
- Tree/graph view of split panes
- Terminal nodes with status indicators
- Group boundaries visible

### P10: Session Creation Pushes CLI Down
When creating a new session via `handleCreateNewSession`:
- The initialization banner and agent launch push terminal content down
- This is expected for NEW sessions (not bare terminals)
- The issue is that the compose panel ALSO pushes — that's P02

### P11: Prompt Enters Terminal Output Instead of Textbox
The `handleInstructionPanelSend` calls `agentSend()` which writes to the PTY. The prompt text appears in the terminal output. This is by design — the agent reads from terminal output. The issue is that the UI shifts when the panel opens (P02).

### P12: Conductor Not in Workspace Sidebar
The Conductor exists at `/conductor` in the app sidebar. Need to add it to the workspace sidebar (5-group nav). Options:
- Add a 6th group "Conductor" to the workspace sidebar
- Or add it as a subtab under an existing group

### P13: GitHub Backup System Missing
Unclear what this feature is. Need clarification from user.

### P14: Skill Config Shows Only One Skill
The SkillsTab loads skills via `window.deskflowAPI.getSkills()`. Verify:
- The IPC call returns all skills
- The UI renders all of them
- Search/filter works

### P15: Default Save Button Does Nothing
Need to identify which "default save" button the user means. Check all save buttons in the workspace.

### P16: Prompts Page Stats Glitch
The Prompts tab (History) shows stats that flicker. Likely a re-render issue — data is being fetched and state is updating rapidly. Check for:
- Unnecessary re-renders
- Missing memoization
- Race conditions in data fetching

### P17: Workspace Load Doesn't Restore Subtabs
The `handleLoadWorkspace` sets `activeGroup` but not the subtab within that group. Need to also restore the subtab state via `usePersistentSubTab` or localStorage.

### P18: Too Much Text in Workspace
UI is text-heavy. Need to:
- Reduce verbose labels
- Use icons more
- Collapse secondary info
- Use tooltips for details

---

## Constraints

1. Must work with existing IPC infrastructure (no new npm packages)
2. Must preserve all existing functionality
3. Must follow the existing design system (zinc dark palette, glass cards, Geist font)
4. Files affected: `src/pages/TerminalPage.tsx`, `src/components/workspace/WorkspaceShell.tsx`, `src/components/workspace/PerformanceMetricsPanel.tsx`, `src/components/WorkspaceShell.tsx`
5. No comments in code output
6. CRLF line endings preserved
7. All changes must be in the workspace area (`/terminal` route)

## Output Format

Return a RESULT.md with:
- One section per problem (P01–P18)
- Each section: Root Cause → Exact Fix (file + code) → Verification
- Group fixes by file to minimize merge conflicts
- Include a final "Build & Test" section with commands to verify
