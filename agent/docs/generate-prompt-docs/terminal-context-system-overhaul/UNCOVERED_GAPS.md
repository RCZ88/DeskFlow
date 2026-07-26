# Uncovered Gaps — Terminal + Context System Overhaul

> **Purpose:** List of bugs, engineering tasks, and data flows from PROMPT.md that are NOT fully covered in RESULT.md.
> **Action needed:** Read `PROMPT.md` for original context, then extend `RESULT.md` to cover these gaps.

## Summary

- **Fully missing:** 16 items
- **Partially covered:** 8 items
- **Data flow diagrams missing:** 4 items
- **Constraint missed:** 1 item

---

## 1. Fully Missing Bugs

These bugs from PROMPT.md have NO corresponding fix in RESULT.md.

### Bug #3: `create-terminal` events (still untested)
**PROMPT.md:45** — 4 dispatch sites (lines 1070, 1240, 1574, 2457) dispatch a `create-terminal` custom event. Listener added at line 1130 calling `spawnTerminal()`. Header "Open Terminal" button and "+" tab button should spawn PTYs now. BUT the fix has never been tested end-to-end. Ensure:
1. All 4 dispatch sites fire correctly
2. The listener catches them all (no event propagation issues)
3. `spawnTerminal()` doesn't conflict with `initializeTerminal()` being called in parallel
4. The terminal actually appears and spawns a PTY for each path

**Add to RESULT.md:** Verification checklist for each of the 4 creation paths.

### Bug #6: QMD path fix (still untested)
**PROMPT.md:51** — `buildInitContent()` path was double-nested (`{project}/agent/templates/agent`). Fixed to pass `projectPath` directly. Fix has never been verified to actually find QMD files and load their content.

**Add to RESULT.md:** Test case: Setup a terminal with QMD toggle ON → verify QMD template content appears in init content. OR decide to remove QMD path entirely if `assembleContext()` handles it.

### Bug #7: Graphify path fix (still untested)
**PROMPT.md:53** — `buildInitContent()` read from `agent/GRAPH_REPORT.md` instead of `graphify-out/GRAPH_REPORT.md`. Fixed. But if `buildInitContent()` is killed in Fix 2, this path fix is moot. Need to verify `assembleContext()`'s `buildGraphifyContext()` reads from the correct location.

**Add to RESULT.md:** Verify `ContextService.ts` `buildGraphifyContext()` reads from `graphify-out/GRAPH_REPORT.md` not `agent/` or some other path.

### Bug #13: Obsidian vault integration unclear
**PROMPT.md:65** — `buildSkillIndex()` reads SKILL.md from `agent/skills/`. But canonical copies live in Obsidian vault at `CZVault/00_Projects/AppTracker/Graph/`. Questions to resolve:
1. Does vault sync happen? Is it cron, fs.watch, manual?
2. One-way (vault → project) or two-way?
3. Should `buildParaContext()` read from vault path or local?
4. Fallback strategy: vault unavailable → use local copies

**Add to RESULT.md:** Document the vault sync + add a "Vault Sync" subsection to a relevant phase. Or decide to skip vault entirely and only use local paths.

### Bug #16: `tracker-mind-generate` command
**PROMPT.md:81** — A `tracker-mind-generate` or `trackerMindGenerate` method exists somewhere. Need to:
1. Find the IPC handler (grep main.ts for "generate")
2. Verify it works
3. Decide if it should be part of the setup flow
4. Wire to a UI element if applicable

**Add to RESULT.md:** Find and document this handler, then wire or remove.

### Bug #18: FlowView problem creation UI
**PROMPT.md:93** — The flow-based problem creation interface (`src/components/FlowView.tsx`). Questions:
1. Does FlowView actually create problems via the ProblemsService?
2. Does it assign them to terminals?
3. Is it wired to the session management system?

**Add to RESULT.md:** Audit FlowView component. Either verify it works and add to Integration Test section, or add a fix to wire it.

### Bug #19: Skills integration in context pipeline
**PROMPT.md:98** — `buildSkillIndex()` reads skills. `getSkills` IPC handler exists. But:
1. Are skills actually included in the context sent to the agent during setup?
2. Can the user select specific skills to include (beyond the toggle)?
3. The InstructionPanel has a skill selector — does it work? (Blocked by Bug 1, but Bug 1 is now fixed)

**Add to RESULT.md:** After Fix 1 (onSend wired) and Fix 2 (assembleContext unified), verify that:
- Skills selected in InstructionPanel appear in the sent prompt
- The toggle card for Skills in NewSessionDialog actually controls skill inclusion
- `handleInstructionPanelSend` appends selected skill content to the prompt

### Bug #23: Closing a session causes blinking
**PROMPT.md:329** — When user closes a terminal tab/session, the UI blinks/flickers. Likely a React re-render issue in `closeTerminal()` where state updates cause remaining tabs to re-render with a flash.

**Add to RESULT.md:** Fix the flicker:
1. Identify the state triggers in `closeTerminal()`
2. Batch state updates or use `useCallback` with stable deps
3. Add `React.memo` on terminal tab components to prevent cascade re-renders

### Bug #24: Agent selection dropdown empty
**PROMPT.md:331** — Settings page or terminal creation — the dropdown to select which AI agent (claude, opencode, codex, etc.) shows no options or defaults incorrectly. Need to:
1. Find the dropdown source (what feeds the options array)
2. Verify the agent list isn't hardcoded empty
3. Ensure the dropdown in the creation dialog and settings page both populate

**Add to RESULT.md:** Fix the agent list source. Options: hardcoded list, from presets, from `AGENT_LAUNCH_COMMANDS` map.

### Bug #25: Product area / category irrelevant in session metadata
**PROMPT.md:333** — `parseSessionMetadata()` extracts `product_area` and `category` from agent output and stores them in `terminal_sessions` DB. But these values don't map to meaningful UI filters or display. The values are stored but not actionable.

**Add to RESULT.md:** Either:
- Add UI filters for product_area/category in the session list, OR
- Stop storing them (remove from parser), OR
- Map them to visible tags/badges in the session cards

### Bug #27: Cannot specify existing session ID when creating new session
**PROMPT.md:339** — NewSessionDialog should allow the user to input an existing session ID to resume/attach to an existing session from the DB. Currently there's no field for this.

**Add to RESULT.md:** Add a "Session ID (optional)" text input field. If provided:
1. Validate it exists in the DB
2. Load that session's config
3. Don't create a new session — resume the existing one
4. Update `handleCreateSession` to handle both paths (new vs existing session)

### Bug #30: Session list doesn't show all past sessions
**PROMPT.md:354** — Some sessions are created but never appear in the session list. Audit:
1. `loadSessions()` function — what DB query does it run?
2. Are sessions with `status='active'` vs `status='completed'` filtered differently?
3. Is there a LIMIT or date cutoff hiding old sessions?
4. Are sessions without a `topic` field missing from the list?

**Add to RESULT.md:** Fix the DB query or client-side filter to return ALL sessions.

### Bug #32: Natural language task assignment
**PROMPT.md:364** — PROMPT.md Engineering Task Q: User types a description of what they want, the system uses AI to parse intent and route to the correct session/terminal. Design:
1. Quick-input bar parses the text
2. AI classifies: is this a bug fix? feature request? research?
3. Routes to existing session with matching focus, or creates new session
4. Updates the session context with the new task

**Add to RESULT.md:** This is a feature, not a bug fix. Either design the full implementation or explicitly defer it with a note.

### Bug #33: Always-updating context
**PROMPT.md:370** — The context sent to the agent should be dynamically updated during a session:
1. When problems/requests/checklists change mid-session → agent should be notified
2. When agent completes a task → context updated to reflect new state
3. The agent should know what changed since its last response

**Add to RESULT.md:** After Fix 5 (context-changed events), ensure the `[System: ...]` message written to the terminal contains meaningful delta context (what changed, not just that something changed).

### Bug #38: Agent selection defaults inconsistent
**PROMPT.md:398** — Header "Open Terminal" uses `localStorage.getItem('terminal-defaultAgent') || 'claude'`. Setup dialog uses `config.agentType`. These are different defaults. Need:
1. Single source of truth for default agent
2. `localStorage` should be the canonical source
3. All creation paths read from same source
4. Settings page changes to default agent update `localStorage`

**Add to RESULT.md:** Unify agent default. `getDefaultAgent()` function that reads from localStorage. All paths use it.

### Bug #49: Changing problem status causes error messages on terminal
**PROMPT.md:442** — When a problem status is updated, `[System: Problem updated: ...]` is written to the active terminal. But this line may have malformed formatting, causing error messages in the terminal output.

**Add to RESULT.md:** Fix the `context-changed` handler that writes to terminal:
1. Check the format string for any escaped characters or line breaks
2. Ensure `[System: ...]` is plain text, not markdown (agents may interpret markdown in terminal)
3. Wrap with clear delimiters: `[System: Problem #123 status changed to "resolved"]`
4. Test with both claude and opencode to ensure they parse it correctly

### Bug #50: Link between problems and requests is unclear
**PROMPT.md:444** — The `linkProblemToRequest` IPC handler exists but the UI for linking is confusing. User doesn't understand how problems and requests relate.

**Add to RESULT.md:** Either:
1. Remove the linking UI (simplify), OR
2. Redesign the link UI to be intuitive:
   - In ProblemDetailModal: "Related to Request" dropdown
   - In RequestDetailModal: "Related Problems" list
   - Visual indicator on linked cards (chain icon, color highlight)

### Bug #53: Problems/Requests popup UI bad design
**PROMPT.md:454** — The popup modals for problem/request detail views (ProblemDetailModal, RequestDetailModal) are poorly styled. Need consistent design with the rest of the app: zinc theme, proper shadows, animations, consistent with Fix 22 (problem list redesign).

**Add to RESULT.md:** After Fix 22 (problem list), apply the same visual treatment to the modals:
1. Zinc/dark theme background
2. cyan-400 accent for headers
3. Status badges matching Fix 22 colors
4. Framer Motion entry/exit animations
5. Consistent padding, font sizes, border radius

### Bug #54: Cannot drag items between groups in sidebar
**PROMPT.md:456** — The sidebar's group/tab list doesn't support dragging items from one group to another, even though the visual feedback suggests it should work.

**Add to RESULT.md:** Either:
1. Implement the drag-between-groups feature (if the infrastructure exists), OR
2. Remove the visual drag feedback from group headers (if drag is not intended between groups)
3. Be explicit about whether cross-group drag is supported

---

## 2. Partially Covered Items

These have some coverage in RESULT.md but need more detail.

### Bug #14: Init vs Setup split — mode distinction
**PROMPT.md:67** — RESULT.md Fix 6 covers `tracker-mind-setup` but does NOT design the two distinct dialog modes:
- `mode='initialize'`: One-click default setup — uses DEFAULT_CONTEXT_CONFIG, hides advanced toggles, calls `tracker-mind-setup init-all`, immediately creates session
- `mode='setup'`: Full configuration — shows all 6 toggle cards, file selectors, system prompt editor, context config

**Missing from RESULT.md:**
- Which button opens which mode? (Header "Setup" should be `'setup'`, add "Quick Init" for `'initialize'`)
- What's hidden vs shown in each mode?
- Does `'initialize'` still show the prompt preview?
- Should there be a third "Resume Quick" mode that skips the dialog entirely?

### Bug #17: Workspace save/load — needs more than "verify"
**PROMPT.md:87** — RESULT.md Fix 13 says "Verify workspace:save/load handlers exist." But the PROMPT asks for:
1. How does context from `assembleContext()` get saved into workspace state?
2. Does workspace restore terminal layouts AND active terminal AND context config?
3. Can session-scope projects be saved/restored?
4. Auto-save on terminal close / project switch?

**Add to RESULT.md:** Full Workspace Save/Load specification:
```typescript
interface WorkspaceState {
  version: number;
  projectId: string;
  activeTerminalId: string | null;
  terminals: Array<{
    id: string;
    agent: string;
    sessionId: string | null;
    sessionTopic?: string;
    resumeId?: string;
    layout?: PaneNode;
    contextConfig?: ContextConfig;
  }>;
  activeTab: string;
  skillId?: string;
  activeProblemId?: string;
  sidebarWidth: number;
  savedAt: string;
}
```
Save triggers: manual button, terminal close, project switch, 60s auto-save timer.
Load: Restore layout → spawn each terminal → resume each session → set active terminal.

### Bug #27 / O: Session ID — missing "specify existing ID"
**PROMPT.md:468** — RESULT.md Fix 10 only covers displaying unique session IDs. It does NOT cover:
- Allowing user to input an existing session ID during creation (Bug #27)
- Auditing `loadSessions()` DB query (Bug #30)
- Session list showing agent type, status, last activity (partial — Fix 10 only shows ID)

### Engineering Task H: Init vs Setup Split
Same as Bug #14 above.

### Engineering Task I: Obsidian Vault Sync
Same as Bug #13 above.

### Engineering Task J: Workspace Save/Load
Same as Bug #17 above.

### Engineering Task K: FlowView
Same as Bug #18 above.

### Engineering Task L: Skills Pipeline
Same as Bug #19 above.

### Engineering Task Q: Smart Task Routing
Same as Bug #32 above.

---

## 3. Missing Data Flow Diagrams

RESULT.md Section 8 shows 6 fixed data flows. These are missing:

### Flow: Session Resume
**PROMPT.md:270-277**
```
Session list → click "Resume"
  → IPC getTerminalSessionResumeId
  → handleResumeSession
  → setupTerminal(resolvedTerminalId, cwd)
  → initializeSession(terminalId, agent, resumeId, savedInitContent, savedSystemPrompt)
  → Agent launches with --resume flag
  → ⚠️ Does --resume actually restore agent state?
```
Add to RESULT.md Section 8: "SESSION RESUME (FIXED)" diagram showing the full flow with:
- How resumeId is generated and stored
- Which agents support --resume flag
- What happens if --resume flag is not supported (fallback strategy)
- How saved system prompt + init content are replayed

### Flow: tracker-mind-setup
**PROMPT.md:280-287**
```
FilesTab "handleSetup" / IPC invoke
  → tracker-mind-setup init-all
  → Creates: AGENTS.md, INITIALIZE.md, PROBLEMS.md
  → Step=agent: creates AGENTS.md
  → Step=init: creates INITIALIZE.md
  → Step=problems: creates PROBLEMS.md
```
Add to RESULT.md Section 8: "SETUP FILE GENERATION (FIXED)" showing:
- When it's called (before assembleContext in Fix 2)
- What files are created (idempotent — skip if exist)
- What happens if files already exist (no overwrite)
- Integration with NewSessionDialog

### Flow: Workspace Persistence
**PROMPT.md:290-296**
```
User configures → IPC saveWorkspace({ scope, layout, activeTerminalId, ... })
  → Saves to JSON file
  → On restart → IPC loadWorkspace({ scope, projectId })
  → Restores layout, tabs, active terminal
```
Add to RESULT.md Section 8: "WORKSPACE SAVE/LOAD (FIXED)" showing:
- File path: `{projectPath}/.deskflow/workspace.json`
- What's saved (terminals array, layout, active tab, sidebar width)
- Load flow: read file → restore layout → spawn terminals → resume sessions
- Auto-save triggers

### Flow: FlowView Problem Creation
**PROMPT.md:299-305**
```
FlowView → create problem node
  → IPC createProblem({ title, priority, category, ... })
  → ProblemsService.createProblem()
  → Writes to PROBLEMS.md + DB
  → New problem appears in list
```
Add to RESULT.md Section 8: "FLOWVIEW PROBLEM (FIXED)" showing:
- FlowView → ProblemsService wiring
- UI refresh after creation
- Optional: assign to terminal as part of creation

---

## 4. Missing Constraint

### `useJson` flag not addressed
**PROMPT.md:317** — "The `useJson` flag in main.ts disables real DB operations during dev — handle gracefully."

RESULT.md never mentions this flag. All IPC handlers and fixes must handle the case where:
- DB is null (useJson=true)
- Data comes from JSON fallback files
- Some operations may be no-ops in dev mode
- Errors must be caught and logged, not crash

**Add to RESULT.md:** In every IPC handler that touches the DB, add a `useJson` guard or note that it's handled in the existing code.

---

## 5. Priority For Adding These Gaps

```
HIGH (must-add for the RESULT to be complete):
  ├─ FlowView audit (Bug #18 / Task K)
  ├─ Skills pipeline verification (Bug #19 / Task L)
  ├─ Workspace Save/Load full spec (Bug #17 / Task J)
  ├─ Session Resume flow diagram
  ├─ Workspace Persistence flow diagram
  ├─ tracker-mind-setup flow diagram
  └─ useJson flag guard

MEDIUM (significant gaps in polish features):
  ├─ Agent selection dropdown fix (Bug #24)
  ├─ Agent selection defaults unification (Bug #38)
  ├─ Session list audit (Bug #30)
  ├─ Status change → terminal errors (Bug #49)
  ├─ Problem-request linking UI (Bug #50)
  ├─ Popup modal styling (Bug #53)
  ├─ Closing session blinking (Bug #23)
  └─ Init vs Setup mode distinction (Bug #14 / Task H)

LOW (nice-to-have or edge cases):
  ├─ create-terminal events verification (Bug #3)
  ├─ QMD path verification (Bug #6)
  ├─ Graphify path verification (Bug #7)
  ├─ Obsidian vault sync (Bug #13 / Task I)
  ├─ tracker-mind-generate (Bug #16)
  ├─ Product area / category UI filters (Bug #25)
  ├─ Existing session ID input (Bug #27)
  ├─ Natural language task routing (Bug #32 / Task Q)
  ├─ Always-updating context (Bug #33)
  ├─ Drag between sidebar groups (Bug #54)
  └─ Vault + path fix verification (Bugs 6, 7, 13)
```

---

## 6. How to Use This File

1. **Add missing sections to RESULT.md:** Take each missing item above, read the corresponding section in PROMPT.md, design the fix/specification, and insert it into the appropriate phase in RESULT.md.

2. **New Phase 7 if needed:** If the missing items are too numerous to fit into existing phases, add a Phase 7 covering vault sync, FlowView, skills pipeline, and natural language routing.

3. **Update RESULT.md Section 10 (File Change Summary):** Add any new files or additional changes needed for the newly covered items.

4. **After completion, delete this file** or mark it as `## Status: All Gaps Closed`
