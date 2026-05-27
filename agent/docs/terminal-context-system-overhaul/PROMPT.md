# Terminal + Context Management System — Complete Overhaul

## Raw Request

> "OKAY DOES THE FUCKING SESSION WORK? DOES THE SENDING THE PROMPT WITH TEH SYSTEM PROMPT WORK? DOES THE CONTEXT MANAGEMENT WITH ALL THE TOOLS WORK? NAME ME THE LIST OF TOOLS THAT WORK WITH THE CONTEXT SYSTEM. HOW DOES THE CONTEXT SYSTEM WORK? HOW DOES THE AI BE ABLE TO UPDATE THE STATUS OF THE PROBLEMS REQUEST AND CHECKLIST OF THINGS TO CHECK? HOW DOES THE USER IS ABLE TO SEND SOMETHIGN AND THEN THE OGIC OF THE AI JUST INSERTI G THAT PROBLE MIN TO THE LIST OF PROBLEMS? HOW IS THE LOGIC ON AUTO ASSIGNING WHICH SESSION DOES A PROMPT GO TO?"

## Problem Statement

The terminal session system, context management system, problem/request/checklist integration, and workspace knowledge graph (graphify) are all partially implemented with critical broken connections. The 6-system context toggle cards in the Setup dialog are decorative UI — they don't control what's sent to the agent. The InstructionPanel's "Send to Agent" button ignores all its data. The `create-terminal` event was dead code with no listener. The context assembly function was not imported. The graphify pipeline has no IPC bridge. QMD template paths are wrong. Multiple IPC handlers are missing entirely.

## Architecture Overview

### File Map

| System | Files | Status |
|--------|-------|--------|
| Terminal Session | `src/pages/TerminalPage.tsx`, `src/main.ts` (terminal:* handlers) | Multiple broken connections |
| Context Assembly | `src/services/ContextService.ts`, `src/services/ContextConfig.ts` | `assembleContext()` now imported but toggle cards decorative |
| Setup Dialog | `src/components/NewSessionDialog.tsx` | 6 toggle cards don't control buildInitContent |
| InstructionPanel | `src/components/InstructionPanel.tsx` | onSend stub at TerminalPage.tsx:1384 |
| Problem/Request/Checklist | `src/services/ProblemsService.ts`, `RequestsService.ts`, `ChecklistService.ts` + IPC handlers | Services work but flow has gaps |
| Actions File Watcher | `src/main.ts` (~line 6595) | actions.json bridge exists but not tested end-to-end |
| Metadata Parsing | `src/main.ts` (~line 5663) parseTerminalOutput | Parsing exists but not wired to update UI |
| Graphify | `agent/skills/maintain-context/graphify_maintain.py` + `graphify-out/` | Python script works, but `electron:execute-command` IPC handler MISSING |
| Bridge (preload) | `src/preload.ts` | Methods defined, need audit against main.ts handlers |
| IPC Handlers | `src/main.ts` | Some handlers missing (execute-command, listDirectory now added) |

### The 6 Context Systems (all partially implemented)

| # | System | Source | Status |
|---|--------|--------|--------|
| 1 | **LLM Wiki** | `agent/*.md` files (state.md, context.md, patterns.md, etc.) | `buildLLMWikiContext()` in ContextService.ts reads these. Tokens budgeted but content quality unknown. |
| 2 | **Obsidian Skills** | `agent/skills/*/SKILL.md` files (loaded from vault or local) | `buildSkillIndex()` in ContextService.ts reads SKILL.md frontmatter. Vault sync path unclear. |
| 3 | **Graphify** | `graphify-out/GRAPH_REPORT.md` + `graph.json` | Path fixed but no IPC bridge to trigger rebuild. `electron:execute-command` handler MISSING. |
| 4 | **PARA** | `CZVault/00_Projects/`, `01_Areas/`, `02_Resources/`, `03_Archives/` | `buildParaContext()` in ContextService.ts lists directories via `listDirectory`. PARA vault path hardcoded? |
| 5 | **QMD Templates** | `agent/templates/*.qmd` | Path was double-nested (fixed). Templates listed but content not loaded. |
| 6 | **Automations** | `agent/automations/` | `buildAutomationsContext()` in ContextService.ts. Status unknown — may not exist yet. |

### Known Bugs (from deep audit, all files in src/):

1. **🔴 InstructionPanel onSend STUB** — `TerminalPage.tsx:1384`: `onSend={(config) => { setPendingSkill(undefined); setShowInstructionPanel(false); }}` — IGNORES config. `handleInstructionPanelSend` (line 385) is defined but NEVER wired. User selects problems, requests, skills, writes instruction → clicks Send → panel closes, NOTHING happens.

2. **🔴 Context toggle cards are decorative** — `NewSessionDialog.tsx`: The 6 toggle cards (ctxLLMWiki, ctxSkills, ctxGraphify, ctxPara, ctxQMD, ctxAutomations) only feed into `assembleContext()` via `contextConfig`. `buildInitContent()` uses SEPARATE flags (includeAgentsMd, includeGraphify, includeQMD, includeSkills). These are TWO SEPARATE code paths producing duplicate/conflicting content. User toggles "Graphify" ON in context cards → might get graphify content from BOTH paths. User toggles "Graphify" OFF but "includeGraphify" ON → get graphify content anyway.

3. **🔴 `create-terminal` events (now fixed but untested)** — 4 dispatch sites (lines 1070, 1240, 1574, 2457). Listener added at line 1130 calling `spawnTerminal()`. Header "Open Terminal" button and "+" tab button now should spawn PTYs. Untested.

4. **🔴 `assembleContext` not imported (now fixed but untested)** — `TerminalPage.tsx:2418` called `assembleContext()` without importing it. Import added. Untested.

5. **🟡 No `electron:execute-command` IPC handler** — `main.ts`: No handler for `execute-command` to run graphify scripts. The renderer cannot trigger graphify rebuilds via IPC.

6. **🟡 QMD path (now fixed but untested)** — `buildInitContent()` path was double-nested (`{project}/agent/templates/agent`). Fixed to pass `projectPath` directly. Untested.

7. **🟡 Graphify path (now fixed but untested)** — `buildInitContent()` read from `agent/GRAPH_REPORT.md` instead of `graphify-out/GRAPH_REPORT.md`. Fixed. Untested.

8. **🟡 `assignProblemToTerminal` IPC handler flow** — `main.ts:9442`: Returns `{ terminalId, isNewTerminal, prompt }`. The renderer at `TerminalPage.tsx:3185` dispatches `create-terminal-for-problem` event. `handleCreateTerminalForProblem` (line 1059) creates tab, dispatches `create-terminal`, saves session. BUT: the `create-terminal` event listener (now added) calls `spawnTerminal` which might conflict with `initializeTerminal` being called separately. The problem prompt from `assignProblemToTerminal` is only saved to session, not written to the terminal. Need to verify the prompt actually reaches the agent.

9. **🟡 `sendInstructionsToTerminal` IPC handler** — `preload.ts:421-422`: Bridge method exists. Need to verify handler exists in main.ts and works.

10. **🟠 Auto-assign logic — which session gets the prompt?** — `TerminalPage.tsx`: `queueOrSend()` (line 228) writes to `activeTerminalId` if agent is ready, else queues. `handleInstructionPanelSend` (line 390-396) resolves target from `activeTerminalId` then `sendTargetSession`. But `sendTargetSession` state's relationship to the routing (`@term` syntax) is unclear. Need to verify the `@term` routing in the quick-input bar (line 1482) actually parses and redirects.

11. **🟠 `parseTerminalOutput` — actions not updating UI** — `main.ts:5663`: Parses `## Session Metadata` and `## Actions` blocks from agent output. Updates DB. But does NOT send events to renderer to refresh problems/requests/checklists. The `context-changed` event exists but may not be wired to trigger a refresh in the UI panels.

12. **🟠 Actions file watcher not initialized on setup** — `main.ts:6595`: `setupActionsFileWatcher()` called only in `initializeSession()` (line 946-948). If terminal is created via header "Open Terminal" button (which dispatches `create-terminal` → `spawnTerminal`), the watcher is NOT set up because `initializeSession` is never called. Actions.json changes won't be detected.

13. **🟡 Obsidian vault integration — unclear if wired** — `ContextService.ts`: `buildSkillIndex()` reads `SKILL.md` files from `agent/skills/`. But the user's Obsidian vault at `C:\Users\cleme\Documents\CZVault\` has a canonical copy of skills, graphify graphs, and PARA content. The sync between Obsidian vault and `agent/` directory is unclear. Need to verify: does the vault sync actually happen? Is it one-way or two-way? Is there a watcher?

14. **🟡 Initialization vs Setup split — never completed** — The user asked for "Setup" (dialog where user configures context toggles) vs "Initialize" (one-click default setup) to be separate modes. `NewSessionDialog.tsx` has `mode='initialize' | 'setup'` but:
    - The `mode` prop controls which toggle states are hidden (`setup` hides includeDefaultInit)
    - But both modes call the SAME `buildInitContent()` function
    - There is NO distinction between "create from defaults" vs "configure everything"
    - The header "Setup" button opens the dialog in `'initialize'` mode — naming is confusing
    - There's no separate "Quick Init" one-button flow

15. **🟡 `tracker-mind-setup` command — not wired to Setup dialog** — `main.ts` (~line 9895): The `tracker-mind-setup init-all` IPC handler creates AGENTS.md, INITIALIZE.md, PROBLEMS.md, etc. BUT the Setup dialog (NewSessionDialog → onCreate) does NOT call `tracker-mind-setup`. It only READS existing files. So:
    - User opens Setup dialog → configures context → clicks Create
    - `buildInitContent()` reads whatever files exist (could be empty if never initialized)
    - No INITIALIZE.md or AGENTS.md is CREATED by this flow
    - The user must have run `tracker-mind-setup` separately first (via a different button in FilesTab)
    - **Fix**: Setup dialog should call `tracker-mind-setup init-all` BEFORE building init content, so files are guaranteed to exist

16. **🟡 `tracker-mind-generate` command — what does it do?** — There's a `tracker-mind-generate` or `trackerMindGenerate` method somewhere. Need to:
    - Find the IPC handler
    - Verify it works
    - Decide if it should be part of the setup flow
    - Wire to a UI element if applicable

17. **🟠 Workspace save/load — session context persistence** — `preload.ts:351-366`: `saveWorkspace` and `loadWorkspace` bridge methods exist. Need to verify:
    - IPC handlers exist in main.ts
    - Workspaces actually persist terminal layouts, open files, active terminal
    - Session scope projects can be saved/restored
    - Whether context from `assembleContext()` gets saved into workspace state

18. **🟠 FlowView — problem creation UI** — `src/components/FlowView.tsx` or similar: The flow-based problem creation interface. Need to verify:
    - Does FlowView actually create problems via the ProblemsService?
    - Does it assign them to terminals?
    - Is it wired to the session management system?

19. **🟠 Skills integration in context pipeline** — `ContextService.ts`: `buildSkillIndex()` reads skills. The `getSkills` IPC handler exists. But:
    - Are skills actually included in the context sent to the agent during setup?
    - Can the user select specific skills to include (beyond the toggle)?
    - The `InstructionPanel` has a skill selector — does it work? (blocked by Bug 1 - stub onSend)

20. **🟠 `getAiContext` / activity log — agent awareness** — `preload.ts:391-392`: `getAiContext` bridge method. Need to verify:
    - IPC handler exists in main.ts
    - It returns meaningful context about recent changes (session history, problems updated, etc.)
    - It's included in the session context sent to the agent via `buildSessionContext()`

## Engineering Task

Design the **complete end-to-end fix** for the terminal + context + workspace system:

### A. InstructionPanel → Terminal flow

1. Wire `handleInstructionPanelSend` (TerminalPage.tsx:385) to `InstructionPanel.onSend` (line 1384). Replace the stub with `onSend={handleInstructionPanelSend}`.
2. Verify `handleInstructionPanelSend` correctly:
   - Resolves target terminal (activeTerminalId → sendTargetSession → fallback)
   - Calls `queueOrSend()` with assembled prompt
   - Saves session with problem/request/skill bindings
   - Updates terminal binding context
   - Shows error if no terminal available

### B. Context Management — Merge toggle paths

1. Merge the 6 context toggle cards with `buildInitContent()` flags so there's ONE source of truth:
   - Option A: Remove the decorative toggle cards and only use `buildInitContent()` flags
   - Option B: Make the toggle cards control `buildInitContent()` directly (recommended)
   - Option C: Keep both but deduplicate: `buildInitContent()` skips systems that `assembleContext()` will handle, and vice versa
2. Remove the duplicate inline `ContextConfig` type in NewSessionDialog.tsx — import the shared type from `ContextConfig.ts`

### C. Graphify IPC bridge

1. Add IPC handler `electron:execute-command` in main.ts that runs `python agent/skills/maintain-context/graphify_maintain.py {command}` via child_process.execFile
2. Add bridge method in preload.ts
3. Wire to a UI button (or auto-trigger after setup)

### D. Problem → Terminal assignment flow

1. Trace the full flow from ProblemDetailModal "Assign to Terminal" button:
   - IPC: `assignProblemToTerminal` → returns `{ terminalId, isNewTerminal, prompt }`
   - Event: `create-terminal-for-problem` dispatched with terminalId + prompt
   - Handler: `handleCreateTerminalForProblem` (TerminalPage.tsx:1059) creates tab, dispatches `create-terminal`, saves session
   - But: the problem prompt is saved to session but NOT sent to the terminal agent
   - Fix: After terminal is ready, write the problem prompt to the terminal
2. Ensure `create-terminal` event listener (calling `spawnTerminal`) doesn't conflict with `initializeTerminal` when both are called

### E. Metadata Parsing → UI Refresh

1. After `parseTerminalOutput` updates DB, dispatch events to refresh:
   - Problem list (if `create_problem` or `update_problem` action)
   - Request list (if `update_request` action)
   - Checklist items (if `complete_checklist` action)
2. Ensure the `context-changed` IPC event from main.ts reaches renderer and triggers re-fetch

### F. Actions File Watcher

1. Ensure `setupActionsFileWatcher` is called for ALL terminal creation paths (not just `initializeSession`)
2. Add it in the `create-terminal` event listener after `spawnTerminal` succeeds

### G. Auto-Assign Logic

1. Document and verify: when user types `@term-xxx` in quick-input bar, the routing parses correctly and redirects to the specified terminal
2. Ensure `sendTargetSession` state properly maps to terminal IDs
3. The `queueOrSend` function should route to the correct terminal based on `@term` prefix

### H. Init vs Setup Split

1. Clean up the `mode` distinction in NewSessionDialog.tsx:
   - `mode='initialize'`: One-click default setup — uses DEFAULT_CONTEXT_CONFIG, hides advanced toggles, calls `tracker-mind-setup init-all`, immediately creates session
   - `mode='setup'`: Full configuration — shows all 6 toggle cards, file selectors, system prompt editor, context config
   - Ensure header "Setup" button opens in `'setup'` mode (currently opens in `'initialize'`)
   - Add a "Quick Init" button that opens in `'initialize'` mode for power users

2. Wire `tracker-mind-setup init-all` into the dialog flow:
   - Before `buildInitContent()` runs, ensure `tracker-mind-setup init-all` has been called
   - This guarantees AGENTS.md, INITIALIZE.md, PROBLEMS.md exist
   - Do NOT overwrite if files already exist (idempotent)

### I. Obsidian Vault Sync

1. Document the current vault sync mechanism:
   - Is there a file watcher on `CZVault/00_Projects/AppTracker/Graph/`?
   - Does it rsync/copy to `graphify-out/` and `agent/skills/`?
   - Is it one-way (vault → project) or two-way?

2. Ensure the context system reads from the canonical source:
   - If vault has latest SKILL.md files → read from vault path
   - If vault has latest GRAPH_REPORT.md → read from vault path
   - Fall back to local `agent/` and `graphify-out/` copies

### J. Workspace Save/Load

1. Verify `workspace:save` and `workspace:load` IPC handlers exist in main.ts
2. Ensure session context (from `assembleContext()`) is saved into workspace state
3. On workspace load, restore terminal layouts, active terminal, and context
4. Wire auto-save on terminal close / project switch

### K. FlowView Problem Creation

1. Verify FlowView component creates problems via ProblemsService
2. Ensure created problems appear in the problem list immediately (UI refresh)
3. Wire FlowView to the terminal assignment system

### L. Skills Context Pipeline

1. Verify `getSkills` IPC handler returns all skills from `agent/skills/`
2. Ensure `buildSkillIndex()` in ContextService.ts correctly reads SKILL.md frontmatter
3. Wire skills into `buildInitContent()` so selected skills appear in agent context
4. Verify InstructionPanel skill selector actually passes selected skill to `onSend`

### M. Agent Context Awareness (`getAiContext`)

1. Verify `get-ai-context` IPC handler exists and returns meaningful data
2. Ensure `buildSessionContext()` includes activity log / recent changes
3. The agent should know about: recent problem changes, recent sessions, recent terminal output

## Data Flow Requirements

### Session Creation (Setup Agent)
```
Setup button → NewSessionDialog → onCreate callback
  → buildInitContent() reads: AGENTS.md, INITIALIZE.md, graphify-out/GRAPH_REPORT.md, QMD templates, skills
  → assembleContext() reads: PARA, LLM Wiki, GRAPH_REPORT.md, skills, QMD based on toggle cards
  → Merge/concatenate → initContent string
  → spawnTerminal() → creates PTY
  → initializeTerminal() → writes launch command → waits for agent:ready → writes merged prompt + initContent
  → initializeSession() → sets up actions file watcher
```

### Problem Assignment
```
ProblemDetailModal "Assign to Terminal" → IPC assignProblemToTerminal
  → Returns { terminalId, prompt }
  → Dispatches create-terminal-for-problem event
  → handleCreateTerminalForProblem:
    1. Creates tab + layout
    2. Dispatches create-terminal (→ spawnTerminal)
    3. Saves session with problem details
    4. ⚠️ MISSING: Writes problem prompt to terminal after spawn
```

### Instruction Send
```
InstructionPanel → user selects problems/requests/skill → clicks Send
  → ⚠️ STUB: onSend just closes panel (line 1384)
  → SHOULD: handleInstructionPanelSend (line 385)
    1. Resolve target terminal
    2. queueOrSend(config.prompt)
    3. Save session bindings
    4. Update terminal binding
```

### AI Output Processing
```
Agent writes to terminal → onData callback
  → detectAgentPrompt() checks for prompt character
  → parseTerminalOutput() extracts ## Session Metadata and ## Actions
  → Updates DB (terminal_sessions, problems, requests, checklists)
  → ⚠️ MISSING: Sends refresh events to renderer UI
```

### Actions File Bridge
```
AI writes actions.json → fs.watch triggers
  → executeActionsFromFile() reads JSON
  → Performs create_problem / update_problem / complete_checklist / update_request
  → Clears actions.json
  → ⚠️ MISSING: Sends UI refresh events
```

### Session Resume
```
Session list → click "Resume" → IPC getTerminalSessionResumeId
  → handleResumeSession (TerminalPage.tsx:988)
  → setupTerminal(resolvedTerminalId, cwd)
  → initializeSession(terminalId, agent, resumeId, savedInitContent, savedSystemPrompt)
  → Agent launches with --resume flag → restores previous context
  → ⚠️ NEEDS VERIFICATION: Does --resume actually restore agent state?
```

### tracker-mind-setup
```
FilesTab "handleSetup" / IPC invoke → `tracker-mind-setup init-all`
  → Creates: AGENTS.md, INITIALIZE.md, PROBLEMS.md in agent/
  → If step=agent: creates AGENTS.md with AI agent workspace instructions
  → If step=init: creates INITIALIZE.md from template
  → If step=problems: creates PROBLEMS.md from existing issues
  → ⚠️ NOT WIRED: Setup dialog should call this before reading files
```

### Workspace Persistence
```
User configures terminal layout → IPC saveWorkspace({ scope, layout, activeTerminalId, ... })
  → Saves to JSON file (session/project/global scope)
  → On app restart → IPC loadWorkspace({ scope, projectId })
  → Restores layout, tabs, active terminal
  → ⚠️ NEEDS AUDIT: Does workspace include context configuration? Active sessions?
```

### FlowView Problem Creation
```
User interacts with FlowView → creates problem node
  → IPC createProblem({ title, priority, category, ... })
  → ProblemsService.createProblem() → writes to PROBLEMS.md + DB
  → New problem appears in list
  → ⚠️ NEEDS VERIFICATION: Is FlowView actually wired to ProblemsService?
```

## Constraints

- All changes must be in existing files (no new files unless absolutely necessary)
- Must maintain backward compatibility with existing sessions/data
- Build must pass after all changes
- Platform: Windows (Electron), React + Tailwind v4
- DB: SQLite via better-sqlite3 (electron-only, not in renderer)
- Services (ProblemsService, RequestsService, SkillsService, ChecklistService) run in main process only
- Renderer communicates ONLY via IPC bridge (deskflowAPI in preload.ts)
- The `useJson` flag in main.ts disables real DB operations during dev — handle gracefully

---

## ADDITIONAL ISSUES (from user's latest feedback)

### Terminal UX — Core Interaction

21. **🔴 Terminal cannot accept manual input** — `src/pages/TerminalPage.tsx` + `src/components/TerminalWindow.tsx` — The user cannot type anything directly into the terminal. The xterm instance may not have focus bound correctly, or `onKey`/`onData` handlers may not route keystrokes to the PTY via `terminalManager.write()`. The terminal should behave like a normal terminal — click to focus, type to send input.

22. **🔴 Wrong terminal launch command still used** — `src/pages/TerminalPage.tsx:883` — `initializeSession()` writes `${agent}${NL}` as the launch command. The user says this is still wrong. Need to verify the correct command format (e.g., `opencode` vs `claude` vs the configured agent). The `agent` variable comes from `config.agentType` or `localStorage.getItem('terminal-defaultAgent')`. If the wrong agent name is hardcoded, fix it.

23. **🟡 Closing a session causes blinking** — `src/pages/TerminalPage.tsx` — When user closes a terminal tab/session, the UI blinks/flickers for no reason. Likely a React re-render issue where `closeTerminal()` triggers state updates that cause the remaining tabs to re-render with a flash.

24. **🟡 Agent selection dropdown empty** — Settings/configuration page — The dropdown to select which AI agent (claude, opencode, etc.) shows no options or defaults incorrectly. Need to verify the agent list source.

25. **🟡 Product area / category irrelevant in session metadata** — `src/main.ts parseSessionMetadata` — The session metadata parsing extracts product_area and category, but these values don't map to meaningful UI filters or display. The values are stored but not actionable.

### Session Creation & Management

26. **🔴 Past sessions show same random ID (hardcoded?)** — `src/pages/TerminalPage.tsx` — The session ID shown in the session list appears to be the same random string for all sessions. Check `generateTerminalId()` (line 18): `return \`term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}\`` — This should be unique. But if the session display renders the ID from a different source (e.g., `session.id` from DB), verify the DB ID is unique and correctly displayed.

27. **🟡 Cannot specify existing session ID when creating a new session** — `NewSessionDialog.tsx` — The "Create Session" flow should allow the user to input an existing session ID to resume/attach to. Currently there's no field for this.

28. **🟡 New session does not send initial message / system prompt properly** — `TerminalPage.tsx onCreate` (line 2402) — The initial message sent to the agent after spawn may be malformed or missing parts of the system prompt. Need to verify:
    - The system prompt is included as a separate block
    - The init content is appended correctly
    - The agent receives both as distinct inputs

29. **🟡 Initial message should be distinct from system prompt** — The agent needs a clear separation between "this is your system configuration" vs "this is your first task." Currently they may be concatenated into one blob. Design a clear structure:
    ```
    [SYSTEM PROMPT]
    [AGENTS.md / INITIALIZE.md context]
    ---
    [FIRST MESSAGE / TASK]
    ```

30. **🟠 Session list doesn't properly show all past sessions** — Some sessions are created but never appear in the session list. Need to audit `loadSessions()` and the DB query for `terminal_sessions` to ensure all sessions are returned.

### AI Learning & Context Sharpening

31. **🟡 AI should get smarter over time — context sharpening** — Each session should improve the AI's understanding of the project. Design a mechanism:
    - After each session ends, extract key insights (decisions made, patterns found, code changed)
    - Store in a persistent "session memory" (e.g., `agent/context/session-summaries.json`)
    - Include relevant past session summaries in the next session's context
    - The agent should be able to reference past sessions' learnings

32. **🟡 Natural language task assignment** — User types a description of what they want, the system uses AI to parse intent and route to the correct session/terminal. Design:
    - Quick-input bar parses the text
    - AI classifies: is this a bug fix? feature request? research?
    - Routes to existing session with matching focus, or creates new session
    - Updates the session context with the new task

33. **🟡 Always-updating context** — The context sent to the agent should be dynamically updated during a session:
    - When problems/requests/checklists change mid-session → notify agent via `[System: ...]` message (partially exists via `context-changed` event)
    - When agent completes a task → context is updated to reflect new state
    - The agent should know what changed since its last response

### File Display & Parsing

34. **🔴 File list view is useless — shows raw markdown** — `src/components/` file viewer components — AI project files (AGENTS.md, PROBLEMS.md, INITIALIZE.md, GRAPH_REPORT.md, SKILL.md) are displayed as raw markdown text. This is the same as viewing them in any text editor. Design:
    - Parse markdown into beautiful rendered HTML with:
      - Section headers with navigation anchors
      - Status badges rendered as colored tags (e.g., "🔴 In Progress" as a badge)
      - Problems/checklists rendered as interactive cards, not bullet points
      - Code blocks with syntax highlighting
      - Tables rendered properly
    - Each file type should have a custom viewer:
      - `PROBLEMS.md` → shows problem cards with status, priority, category badges
      - `AGENTS.md` → shows formatted workspace context with file links
      - `GRAPH_REPORT.md` → shows knowledge graph nodes/communities visually
      - `SKILL.md` → shows skill with activation button

35. **🟡 File viewer should be different for AI project files vs regular files** — Regular project files (source code) should show syntax-highlighted code. AI infrastructure files (in `agent/`) should show the rich rendered view described above. The file list should visually distinguish between the two.

### UI & Prompt Preview Issues

36. **🔴 Agent review (prompt preview) is ugly — shows random text** — The prompt preview/modal shows garbled or irrelevant text instead of the actual assembled prompt. Need to audit the prompt assembly and preview rendering.

37. **🔴 Prompt preview does not include system prompt** — The preview only shows init content but omits the `DEFAULT_SYSTEM_PROMPT` and any custom system prompt. The user needs to see the FULL prompt that will be sent.

38. **🟡 Agent selection defaults to claude in some places, empty in others** — Inconsistent default agent. Header "Open Terminal" uses `localStorage.getItem('terminal-defaultAgent') || 'claude'` (line 1233). Setup dialog uses `config.agentType`. Need consistent fallback.

39. **🟡 Instruction column / compose area too small** — The InstructionPanel's compose textarea and the quick-input bar are cramped. Need proper sizing (larger default height, resizable).

### Save & Load

40. **🔴 Save button does not save** — The "Save" button in the workspace/session toolbar appears to do nothing. Need to trace `saveWorkspace` IPC call and verify:
    - Handler exists in main.ts
    - Data is persisted to disk
    - UI shows confirmation

41. **🟡 What exactly does save persist?** — Current save logic is unclear. Define what workspace save should include:
    - List of open terminals and their sessions
    - Terminal layouts (split pane configuration)
    - Active terminal ID
    - Current skill selection
    - Current problems/requests being worked on
    - Context configuration (which systems are enabled)
    - Screen/view state (which tab is open)

42. **🟡 Load should restore terminals** — On workspace load, terminals that were saved as "open" should actually spawn and initialize. Currently load may restore the layout visually but not spawn the PTYs.

43. **🟠 Project prompt not at top of merged prompt list** — The project-specific prompt additions should appear BEFORE general additions in the merged prompt hierarchy. Current order may be: General → Project → Session → System. Should be: Project → General → Session → System.

44. **🟠 Merge prompt results should be visible** — The final merged prompt (after combining DEFAULT_SYSTEM_PROMPT + project additions + general additions + session context + custom system prompt + init content) should be visible in the prompt preview so the user can verify what the agent receives.

### Terminal Splitting & Layout

45. **🔴 Cannot split terminals into different groups** — `TerminalWindow.tsx` — The drag-and-drop visual shows proper highlighting/hover effects when dragging a terminal tab between groups, but the actual move operation does NOT execute. The `onDrop` or `onDragEnd` handler may not call the layout mutation function.

46. **🔴 Drag splitting is cut in half — height too big** — The terminal layout area is too tall for the available space, causing split panes to be cut off or rendered at half-height. Need to audit the flex/grid layout and ensure `min-h-0` and `flex-1` propagate correctly at all nesting levels. Add resize handles/dividers between panes.

47. **🟡 No resize handles between split panes** — When terminals are split into groups, there are no draggable dividers to resize each pane. The user needs to be able to adjust pane sizes.

### Problem & Request UI

48. **🔴 Problem list design is bad** — Problems are displayed as a plain list without proper visual hierarchy. Need:
    - Status badges (Open, In Progress, Resolved, Closed) with distinct colors
    - Priority indicators (🔴 High, 🟡 Medium, 🟢 Low)
    - Category tags
    - Click to expand/collapse details
    - Inline edit for title/status
    - Drag to reorder

49. **🟡 Changing problem status causes error messages on terminal** — `TerminalPage.tsx context-changed handler` (line 1149): When a problem status is updated, `[System: Problem updated: ...]` is written to the active terminal. But this may cause formatting issues or error messages in the terminal output. The system message format may be malformed.

50. **🟠 Link between problems and requests is unclear** — The `linkProblemToRequest` IPC handler exists but the UI for linking is confusing. User doesn't understand how problems and requests relate or how to view the link.

### Quick Prompt / Active Terminal

51. **🟡 Quick prompt terminal selector dropdown unclear** — The quick-input bar has an `@term` routing feature but the dropdown to select which terminal receives the input is unclear. The user doesn't know which terminal is active or how to route to a different one.

52. **🟡 "Send instruction to which terminal?"** — Need a clear visual indicator of which terminal is the current target for input. Active terminal should be highlighted in the tab bar. The quick-input bar should show the target terminal name.

### Additional UI Polish

53. **🟠 Problems/Requests popup UI bad design** — The popup modals for problem/request detail views are poorly styled. Need consistent design with the rest of the app (zinc theme, proper shadows, animations).

54. **🟠 Cannot drag items between groups in sidebar** — The sidebar's group/tab list doesn't support dragging items from one group to another, even though the visual feedback suggests it should work.

## Additional Engineering Tasks

### N. Terminal Manual Input Fix

1. Audit `TerminalWindow.tsx` — ensure xterm instance has `onKey` handler that sends keystrokes via `terminalManager.write(terminalId, key)`
2. Ensure terminal pane is focusable (click to focus, focus ring visible)
3. Verify `terminal:write` IPC handler in main.ts correctly routes to node-pty's `write()`

### O. Session ID & List Fix

1. Fix session ID display — ensure unique, human-readable session IDs
2. Allow inputting existing session ID during session creation
3. Ensure all sessions appear in the session list (audit DB query)
4. Session list should show: ID, name/description, agent type, status, last activity time

### P. AI Context Sharpening System

Design a persistent context system:
1. After session ends, extract key insights via `parseTerminalOutput`
2. Store in `agent/context/session-summaries.json` (append-only log)
3. On new session creation, include relevant past summaries in context
4. Allow agent to query its own past sessions
5. Implement a "memory score" — how relevant is each past session to the current task?

### Q. Smart Task Routing

1. Quick-input bar collects user's natural language description
2. Use AI to classify: bug fix, feature, question, research
3. Route to matching existing session or create new one
4. Auto-assign problem/request based on classification
5. Update session context with new task

### R. Rich File Display

1. Create `<MarkdownRenderer>` component that parses markdown to styled HTML
2. Create specialized viewers per file type:
   - `<ProblemListViewer>` for PROBLEMS.md
   - `<AgentContextViewer>` for AGENTS.md
   - `<GraphReportViewer>` for GRAPH_REPORT.md
   - `<SkillViewer>` for SKILL.md
3. File list shows AI infrastructure files with distinct icon/badge
4. Regular source code files use standard syntax-highlighted view

### S. Workspace Save/Load Redesign

1. Define `WorkspaceState` interface:
   ```typescript
   interface WorkspaceState {
     version: number;
     projectId: string;
     activeTerminalId: string;
     terminals: Array<{
       id: string;
       agent: string;
       sessionId?: string;
       layout: any;
       contextConfig?: ContextConfig;
     }>;
     activeTab: string;
     skillId?: string;
     activeProblemId?: string;
   }
   ```
2. Save triggers: terminal close, project switch, manual save button, auto-save on timer
3. Load restores all terminals (spawn + initialize for each)
4. Workspace file saved to `{projectPath}/.deskflow/workspace.json`

### T. Terminal Split & Layout Fix

1. Fix `onDrop` handler in terminal tab drag-drop to actually mutate the layout tree
2. Add resize handles between split panes
3. Fix height calculation to prevent cut-off panes
4. Ensure all layout operations work: split vertically, split horizontally, merge, move to group

### U. Problem/Request UI Redesign

1. Redesign problem list with status badges, priority indicators, category tags
2. Fix status change → terminal message formatting
3. Add inline editing
4. Fix problem-request linking UI
5. Add drag-to-reorder

### V. Prompt Preview Overhaul

1. Show complete merged prompt in preview (system prompt + additions + context + init content)
2. Format sections clearly with collapsible blocks
3. Show token count per section
4. Show which agent will receive this prompt
5. Fix "random text" display bug
