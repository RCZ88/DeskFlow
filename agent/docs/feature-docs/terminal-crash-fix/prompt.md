# BATTLE PLAN: Terminal Workspace Full Audit & Fix

## MISSION
Audit and fix EVERY feature of the Terminal Workspace (`/terminal`): 5 sidebar groups, 12 sub-tabs, PTY lifecycle, agent integration, instruction panel, session system, cross-session sync, layout system. The double-spawn PTY crash fix is already applied — verify it, then audit/fix every remaining feature.

## SOURCE OF TRUTH
- `agent/FEATURE_TRACKER.md` lines 461-724 — Canonical feature spec for terminal workspace
- `agent/docs/terminal-crash-fix/CONTEXT_BUNDLE.md` — Engineering context with IPC tables, code map, fix details
- `agent/TERMINAL_SIDEBAR_REFERENCE.md` — Sidebar sub-tab behavior specs
- `agent/PROBLEMS.md` issues #75-114 — All terminal workspace bugs and resolutions
- `src/pages/TerminalPage.tsx` (~4900 lines) — Main workspace component
- `src/components/TerminalWindow.tsx` (607 lines) — PTY lifecycle component
- `src/hooks/useTerminalLayout.ts` — Layout tree management

## PHASE MAP
```
Phase 0 ← Phase 1 ← Phase 2 ← Phase 3 ← Phase 4
                 ↘         ↘         ↘
                  Phase 5 ← Phase 6 ← Phase 7

Phase 0: PTY Crash Fix Verification (ALREADY APPLIED — verify only)
Phase 1: Sidebar Group 1 — Setup (Presets + Configs)
Phase 2: Sidebar Group 2 — Work (Sessions + Map + Files)
Phase 3: Sidebar Group 3 — Insights (Analytics + Issues)
Phase 4: Sidebar Group 4 — Studio (Skills + Design)
Phase 5: Sidebar Group 5 — Context (Context + Maintenance + Page Context)
Phase 6: Cross-Cutting Features (Instruction Panel, Session Categorization, Cross-Session Sync, Layout)
Phase 7: Fix Open Bugs #102, #103, #104 + Edge Cases
```

## PHASE 0: PTY CRASH FIX VERIFICATION

**Goal:** Confirm the double-spawn race fix works. Do NOT re-fix — just verify.

### V0.1 — Check handleCreateTerminal (TerminalPage.tsx ~L1708)
**Expected code pattern:**
```typescript
// CORRECT: mark-spawned BEFORE await spawnTerminal
window.dispatchEvent(new CustomEvent('terminal:mark-spawned', { detail: { terminalId: d.terminalId } }));
await spawnTerminal(d.terminalId, d.cwd || propProjectPath, d.agent);
window.dispatchEvent(new CustomEvent('terminal-created', { detail: { terminalId: d.terminalId, agent: d.agent } }));
// CORRECT: initializeTerminal called after spawn
if (d.agent && d.agent.length > 0) {
  await initializeTerminal(d.terminalId, d.agent, undefined, undefined, undefined, d.cwd || propProjectPath);
}
```
**Verify:** `initializeTerminal` is in useEffect deps array: `[spawnTerminal, initializeTerminal, propProjectPath]`.

### V0.2 — Check handleReSpawn (TerminalPage.tsx ~L1731)
**Expected code pattern:**
```typescript
const handleReSpawn = async (terminalId: string) => {
  window.dispatchEvent(new CustomEvent('terminal:mark-spawned', { detail: { terminalId } }));
  await spawnTerminal(terminalId, activeProjectPath);
};
```
**Verify:** Same mark-spawned-before-spawn order. No missing initializeTerminal (re-spawn doesn't need it — re-uses existing terminal).

### V0.3 — Check spawnedTerminalsRef guard (TerminalWindow.tsx ~L446)
```typescript
const handleTerminalReady = useCallback((terminalId: string) => {
  if (spawnedTerminalsRef.current.has(terminalId)) return;  // ← THIS LINE MUST EXIST
  spawnedTerminalsRef.current.add(terminalId);
  // ... rest
}, [/* verify deps are correct */]);
```
**Verify:** Guard prevents second spawn. Deps array includes all used external references.

### V0.4 — Check exit handler (TerminalWindow.tsx ~L201)
```typescript
ptyProcess.onExit(({ exitCode, signal }) => {
  const isCrash = exitCode !== 0 && !isManualKill.current;  // ← correct distinction
  if (isCrash) { /* show "Process crashed" overlay */ }
  else { /* clean shutdown */ }
});
```

### V0.5 — Check main.ts spawn-terminal handler (~L8639)
```typescript
if (terminalManager.has(id)) {
  terminalManager.kill(id);  // kills existing before re-spawn
}
```

### V0.6 — Manual test matrix
- Click + → terminal appears, agent launches, no crash overlay → **PASS**
- Click re-spawn after crash → new PTY spawns, old killed cleanly → **PASS**
- Create 3 terminals → all show, none crash → **PASS**

---

## PHASE 1: SIDEBAR GROUP 1 — SETUP (Presets + Configs)

**Files:** `src/pages/TerminalPage.tsx` (inline components)

### T1.1 — Presets Tab
**Features to verify:**
- Preset list renders from `terminal_presets` DB table
- Category filtering works (general, build, test, deploy, etc.)
- Add preset: inline form creates new record
- Execute preset: writes command to active terminal via `write-terminal` IPC
- Delete preset: removes from DB + list refresh

**Code locations (search TerminalPage.tsx):**
- `addPreset()` function — creates IPC call, refreshes list
- `executePreset(preset)` — calls `write-terminal` with preset.command
- `presetList` state — loaded from `getTerminalPresets()` IPC
- `presetCategory` filter state — category filter pills

**Fix if broken:**
- No `getTerminalPresets` IPC handler in main.ts → add it
- `addPreset` doesn't refresh → add `loadPresets()` after success

### T1.2 — Configs Tab
**Features to verify:**
- Threshold slider (3-30) saves/loads from localStorage
- Tier selector persists
- Debug toggle works
- Cross-session sync config: master toggle, TTL slider (30-600), context broadcast toggle, conflict mode dropdown, `/sync` toggle
- Thought-process toggle

**Code locations:**
- State stored in localStorage key pattern: `terminalPage_configs_*`
- `useEffect` to load on mount, save on change
- Config values read by: instruction panel (threshold, tier), cross-session sync (syncEnabled, syncTTL), send flow (thoughtProcess)

**Fix if broken:**
- Config doesn't save → check localStorage key or debounce save
- Config doesn't apply → check downstream code reads from state, not hardcoded defaults

---

## PHASE 2: SIDEBAR GROUP 2 — WORK (Sessions + Map + Files)

**Files:** `src/pages/TerminalPage.tsx`

### T2.1 — Sessions Tab
**Features to verify (FEATURE_TRACKER.md lines 516-531):**
1. Subpage grouping: Top Pinned, Recent, This Month, Older — collapsible sections
2. Filter pills: SESSION_CATEGORIES (feature, bug-fix, research, etc.)
3. StatusDot: active(cyan)/idle(amber)/completed(green)/error(red)/cancelled(gray)
4. Session cards: StatusDot + CategoryBadge + agent badge + topic + terminal status (Running/Closed) + description + date + tags + cost
5. Edit dialog: two-column form (agent, topic, category, product_area, description, status, auto_tags)
6. Import opencode sessions dialog
7. Detail view: metadata grid + Focus/Open + Message viewer with role coloring
8. Search & filter: text, status, category, agent

**Code locations:**
- `sessions` state — loaded from `getTerminalSessions()` IPC
- `subpageGroups` — compute from sessions by date (pinned → recent → this month → older)
- `SESSION_CATEGORIES` constant — used for filter pills
- Session edit dialog — form with two-column layout
- Session detail — expandable panel with messages

**Fix if broken:**
- Sessions not loading → check `get-terminal-sessions` IPC handler in main.ts
- Sessions not saving → check `save-terminal-session` handler
- Category filter doesn't work → check `filteredSessions` useMemo
- Detail view shows no messages → check `getParsedSessionItems` IPC + MessageViewer component

### T2.2 — Map Tab
**Features to verify:**
- TerminalMiniMap renders all terminal panes as draggable rectangles
- Click to focus (sets activeTerminalId)
- Drag to rearrange (updates layout tree)
- Quadrant detection for split direction
- Running Terminals list below map with Focus/New Session buttons

**Code locations:**
- `<TerminalMiniMap>` component — likely imported
- `@dnd-kit` DndContext + draggable/ droppable
- `handleMapDragEnd` — updates layout state
- Group listing below map

### T2.3 — Files Tab
**Features to verify:**
- Browse `agent/` directory markdown files
- Read-only view with syntax highlighting
- Pulse notification (green ping dot) when files change
- Navigate subdirectories

**Code locations:**
- `FilesTab` component — receives `projectPath` prop
- `read-agent-file` / `list-agent-files` IPC calls
- `onAgentFileChanged` event listener for pulse notification

**Fix #102:** FilesTab shows project selector when project already known from IDE page.
**Root cause:** `projectPath` prop not passed from IDE page context. FilesTab receives only `projectId`, looks up in `projects` array. If `projects` hasn't loaded, path is empty → selector appears.
**Fix:** Pass `projectPath` directly from `propProjectPath` prop (IDE page passes this when opening workspace). FilesTab uses it before falling back to projects array lookup.

---

## PHASE 3: SIDEBAR GROUP 3 — INSIGHTS (Analytics + Issues)

**Files:** `src/pages/TerminalPage.tsx` (inline + imported components)

### T3.1 — Analytics Tab
**Features to verify:**
- Period pill toggle: 7 Days / 30 Days / All Time
- Overview cards: Total tokens, Total cost ($), Session count — real data
- By Agent breakdown: bar chart showing tokens per agent
- Top Sessions by Cost: sortable list

**Code locations:**
- `getAIUsageSummary(period)` IPC call
- `AnalyticsDashboard` component with `variant="full"`
- Period toggle state → re-fetch on change

**Fix if broken:**
- Zero data → check `getAIUsageSummary` IPC handler in main.ts
- Wrong data → check SQL queries in handler
- Chart not rendering → check chart.js config

### T3.2 — Issues Tab
**Features to verify:**
- Problem tracking: status filter (NEW/Not Started/In Progress/AI Attempted Fix/User Testing/Fixed/Irrelevant)
- Group by status with color-coded headers
- Priority glow dots (red=high, amber=medium, green=low)
- Request tracking: status filter (All/Pending/In Progress/Completed/Cancelled)
- ProblemDetailModal: StatusDot + priority badges + details/comments/linked requests tabs + inline edit
- RequestDetailModal: edit status/category, link/unlink problems
- Auto-refresh: 5s polling

**Code locations:**
- `IssuesWorkspace` imported component
- `getProblems()` / `getRequests()` IPC calls
- `pollIntervalRef` for auto-refresh

**Fix if broken:**
- Problems not loading → check `getProblems` IPC handler (scoped to projectId)
- Requests not loading → check `getRequests` handler
- Link/unlink broken → check `link-problem-to-request` IPC with projectId support
- Auto-refresh causes re-render loop → check cleanup in useEffect return

---

## PHASE 4: SIDEBAR GROUP 4 — STUDIO (Skills + Design)

**Files:** `src/pages/TerminalPage.tsx`

### T4.1 — Skills Tab
**Features to verify (FEATURE_TRACKER.md lines 578-589):**
- Skills loaded from `agent/skills/` directory (SKILL.md + standalone .md files) + legacy `agent/skills.md`
- 10 DSL widget types: select, radio, switch, slider, text, textarea, code, file, checkbox, tags
- GeneralistDialog: search + category filter
- Inline CRUD: create, read, update, delete skills
- Use Skill modal: skill content + target terminal selector + prompt input + send to terminal
- Auto-refresh: 10s polling

**Code locations:**
- `SkillsTab` component (~400 lines)
- `getSkills(projectPath)` IPC — parses SKILL.md frontmatter
- `createSkill()` / `updateSkill()` IPC
- Skill DSL form generator — maps frontmatter to widget components

**Fix if broken:**
- Skills not loading → check `getSkills` handler parses SKILL.md frontmatter correctly
- DSL widgets don't render → check frontmatter schema → widget mapping
- Use Skill modal doesn't send → check target terminal selector + sendToTerminal flow

### T4.2 — Design Tab
**Features to verify:**
- Taste config knobs (variance, motion, density)
- Style reference viewer

**Code locations:**
- `agent/skills/design-taste/SKILL.md` — design taste config reference
- Inline component — likely reads from localStorage or IPC

---

## PHASE 5: SIDEBAR GROUP 5 — CONTEXT (Context + Maintenance + Page Context)

**Files:** `src/pages/TerminalPage.tsx`

### T5.1 — Context Tab
**Features to verify (FEATURE_TRACKER.md lines 601-607):**
- Toggle context sources: LLM Wiki, Obsidian Skills, Graphify, PARA, QMD, Automations, Design Skills
- Context Map: SVG visual map showing active systems
- Token budget display
- Context Assembly: build + preview assembled context before session start

### T5.2 — Maintenance Tab
**Features to verify (FEATURE_TRACKER.md lines 609-615):**
- 6 sub-components: MemoryStatusCard, ActiveContextsList, RecentChatHistory, CompactionsPanel, ContextSearchBar, SettingsPanel
- 4 dedicated IPC endpoints for context maintenance operations

### T5.3 — Page Context Tab
**Features to verify:**
- Page identity display
- Component tree visualization
- IPC endpoints list (auto-generated)
- Data flow diagram
- Connections to other pages

---

## PHASE 6: CROSS-CUTTING WORKSPACE FEATURES

**Files:** `src/pages/TerminalPage.tsx`, `src/components/TerminalWindow.tsx`

### T6.1 — Instruction Panel (Full Composer)
**Features to verify (FEATURE_TRACKER.md lines 653-663):**
1. Problems section: checkboxes fetched via getProblems IPC
2. Requests section: checkboxes for linked requests
3. Skill dropdown: loaded via getSkills IPC
4. Prompt preview: markdown rendering (amber headers, green checkboxes, cyan code blocks)
5. Copy button: 1.5s feedback animation
6. Persistence: saves to localStorage per sessionId (key: `terminalPage_instructionPanelContent_{sessionId}`)
7. Cancel/Clear buttons
8. Use Skill button: routes through DSL widget flow
9. System prompt layers: collapsible include/exclude toggles (default/general/project/session)
10. Target terminal indicator: shows agent readiness state
11. Escape key: closes panel
12. Send flow: queueOrSend() → writes to terminal

**Code locations:**
- `instructionPanelContent` state — loaded from localStorage
- `handleInstructionPanelSend(config, content)` — orchestrates send
- `queueOrSend(targetTerminal, content)` — writes to PTY or queues
- `onSent(instructionText)` callback — clears form
- `storageKey` in useEffect deps — critical for persistence reliability

**Fix if broken:**
- Content not saving → check localStorage key pattern, save on every change (debounced)
- Content not loading → check useEffect with storageKey in deps
- Send not working → check queueOrSend writes correct content to correct terminal
- Markdown preview broken → check markdown renderer component

### T6.2 — Session Categorization
**Features to verify (FEATURE_TRACKER.md lines 665-675):**
- Categories: feature, bug-fix, research, code-review, refactor, devops, docs, other
- Auto-categorization: keyword scoring fallback
- Manual override via edit dialog
- IPC: `updateSessionCategory`, `getParsedSessionItems`, `analyzeSessionCategory`
- CategoryBadge and StatusDot display throughout all terminal views
- @mention routing: dropdown on `@` in send bar, filters by query, arrow key nav
- Session metadata auto-parsed from assistant messages (AGENTS.md template format)

**Fix if broken:**
- @mention dropdown not appearing → check onChange handler in send bar input
- Category not saving → check `updateSessionCategory` IPC handler
- Auto-categorization wrong → check keyword scoring algorithm in `analyzeSessionCategory`

### T6.3 — Cross-Session Sync
**Features to verify (FEATURE_TRACKER.md lines 715-723):**
- touched_files DB table: tracks file edits per terminal
- File Lock Manager: in-memory lock registry with 60s TTL sweep
- Conflict detection: `detectEditsInOutput()` scans for `edit file:` / `write file:` / `create file:` patterns
- Lock cleanup: auto-release on terminal kill
- 7 IPC handlers all work (lock, release, get-locks, get-touched, compile-sync, broadcast, locks-for-terminal)
- UI: conflict toast, `/sync` command interception, lock indicators in tab bar
- Configs tab controls affect behavior

**Fix if broken:**
- Locks not releasing → check cleanup on terminal:exit event
- Conflict not detected → check detectEditsInOutput regex patterns match real agent output
- `/sync` not intercepted → check command interceptor in send flow

### T6.4 — Layout & Group System
**Features to verify (FEATURE_TRACKER.md lines 624-635):**
- N-ary tree layout: PaneNode.children is array (not binary tuple)
- Group extraction: `extractGroups()` creates top-level split groups with equal space
- Layout persistence: workspace:save/load IPC
- Auto-save: debounced 2s on layout/state changes
- Auto-session creation toggle in Configs tab
- Layout auto-sync: panes populate terminalTabs state on layout changes
- MapEditor: @dnd-kit drag-to-rearrange + drag-to-split
- Split handle drag resize
- TerminalPane hover controls (split/close buttons)
- Workspace state: saved to workspace_state DB table (sidebarWidth, activeGroup, terminalTabs)

**Fix if broken:**
- Layout not restoring → check workspace:load handler + useEffect on mount
- Splits not working → check insertIntoLayout() function + handleSplitPane()
- Auto-save creating too many writes → check debounce (2s is correct)

---

## PHASE 7: FIX OPEN BUGS #102, #103, #104 + EDGE CASES

### T7.1 — Bug #102: FilesTab Shows Project Selector When Project Known
**Location:** `src/pages/TerminalPage.tsx` — FilesTab component
**Current state:** AI Attempted Fix — may still be broken
**Root cause:** FilesTab receives only `projectId`, looks up in `projects` array. When opened from IDE page, `propProjectPath` is available but not passed. If `projects` array hasn't loaded → path empty → selector appears.
**Fix code pattern:**
```typescript
// In TerminalPage.tsx, where FilesTab is rendered:
<FilesTab
  projectPath={propProjectPath || projectPath}  // ← propProjectPath first
  projectId={selectedProjectId}
  // ... other props
/>
// In FilesTab component:
const FilesTab = ({ projectPath: propProjectPath, projectId }: { projectPath?: string; projectId: string }) => {
  const effectivePath = propProjectPath || projects.find(p => p.id === projectId)?.path;
  // ← use effectivePath, don't show selector if propProjectPath is set
};
```

### T7.2 — Bug #103: + Button Hidden When No Terminals Exist
**Location:** `src/pages/TerminalPage.tsx` — terminal tab bar
**Current state:** AI Attempted Fix — may still be broken
**Root cause:** Tab bar wrapped in `{Object.keys(terminalTabs).length > 0 && (` — when empty, entire bar including + button is hidden.
**Fix code pattern:**
```typescript
// BEFORE (broken):
{Object.keys(terminalTabs).length > 0 && (
  <div className="tab-bar">
    {Object.entries(terminalTabs).map(([id, tab]) => <TerminalTab key={id} ... />)}
    <button onClick={handleAddTerminal}>+</button>
  </div>
)}

// AFTER (fixed):
<div className="tab-bar">
  {Object.entries(terminalTabs).map(([id, tab]) => <TerminalTab key={id} ... />)}
  <button onClick={handleAddTerminal}>+</button>  {/* always visible */}
</div>
```

### T7.3 — Bug #104: Save Button Hidden in Instruction Bar
**Location:** `src/pages/TerminalPage.tsx` — terminal header
**Current state:** AI Attempted Fix — may still be broken
**Root cause:** Save checkpoint button only rendered inside instruction input bar (appears after clicking "Send"), not in the default terminal header UI.
**Fix code pattern:**
```typescript
// Terminal header — always visible when terminal is active:
<div className="terminal-header">
  {/* ... existing buttons ... */}
  {activeTerminalId && (
    <button onClick={handleSaveCheckpoint}>
      <Save /> Save
    </button>
  )}
  {/* ... send button, etc. ... */}
</div>
```

### T7.4 — Edge Case Audit
Check all error/empty/loading states in the workspace:
- What happens when `get-terminal-sessions` returns empty array? → Show "No sessions yet" with action button
- What happens when `getSkills` IPC fails? → Show error toast + retry button
- What happens when PTY spawn fails (node-pty not installed)? → Show "Terminal unavailable" with install instructions
- What happens when workspace:load returns null? → Show default empty workspace
- What happens when localStorage is corrupted? → Fall back to defaults, don't crash

---

## VERIFICATION GATES

**Per phase:**
1. `npm run build` passes
2. Console has zero errors
3. Feature renders its expected UI (not blank, not spinner loop)
4. IPC calls return expected data (check in devtools)
5. Interactions produce expected side effects

**Final (after all phases):**
1. `npm run build` passes
2. Click + terminal → PTY spawns, agent launches, no crash
3. Every sidebar group loads its sub-tabs correctly
4. Sessions tab shows real sessions with categories
5. Instruction panel sends content to terminal
6. Presets execute in terminal
7. Configs save/load persist
8. Skills tab loads from agent/skills/ directory
9. Context tab shows all 6 system toggles
10. Cross-session sync lock/unlock works

## RISK REGISTER

| Risk | Phase | Mitigation |
|------|-------|------------|
| Window event dispatch order broken | 0 | NEVER change order: mark-spawned → spawn → created → initialize |
| main.ts changes break other features | 0,6 | Prefer renderer-side fixes. Read full IPC handler before editing |
| localStorage corruption | 1,6 | Add try/catch parse with fallback to defaults |
| @dnd-kit version mismatch | 2 | Check package.json before adding new dnd features |
| node-pty rebuild required | 0 | Run `npm rebuild node-pty` if spawn fails |
| R3F state management in 3D view not applicable | - | No R3F in terminal workspace — safe |
