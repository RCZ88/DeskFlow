# 📌 Project State

> **Purpose:** Current project state for AI context — tracks version, recent changes, known issues, and feature inventory.

## Metadata
- version: 3.65
- last_updated: 2026-05-27
- agent: opencode

## Active Work
- active_problem_id: null
- active_problem_title: null
- current_phase: "implementation"
- blocked: false
- blocked_reason: null

## Session Continuity
- last_session_summary: "v3.65 — Replaced WorkspaceSettingsDialog with ContextSidebar sidebar panel. Created tutorial page with overlay walkthrough. Modified TerminalPage, App.tsx, NewSessionDialog. 3 new files, 4 modified files. All changes verified with passing build."
- open_questions: []

## Progress
- problems_solved_this_sprint: []
- files_modified:
  - src/components/ContextSidebar.tsx (NEW)
  - src/pages/TutorialPage.tsx (NEW)
  - src/components/TutorialOverlay.tsx (NEW)
  - src/pages/IDEProjectsPage.tsx (modified)
  - src/pages/TerminalPage.tsx (modified)
  - src/App.tsx (modified)
  - src/components/NewSessionDialog.tsx (modified)
  - src/components/ContextSidebar.tsx (export WorkspaceConfig type)
  - agent/skills/generate-prompt/SKILL.md (Rule 4)
  - agent/state.md (updated)
  - agent/REQUESTS.md (added #048, #049)

---
> **Version:** 3.65
> **Last Updated:** 2026-05-27
> **2026-05-27 (v3.65) — CONTEXT SIDEBAR + TUTORIAL PAGE (Completed):
>   1. **Context tools inventory**: Completed comprehensive audit of all 12+ context management systems (LLM Wiki, Skills, Design Skills, Graphify, PARA, QMD, Automations, Deep Memory, Session Summaries, RAG, Project Context Manifest, Terminal Bindings).
>   2. **RESULT.md implementation plan**: Used generate-prompt skill to produce 1982-line RESULT.md covering ContextSidebar, TutorialPage, and NewSessionDialog simplification.
>   3. **ContextSidebar.tsx (new)**: 832-line sidebar panel replacing WorkspaceSettingsDialog. 6 sections (Systems, Design, Model, Paths, Terminal, Defaults). Auto-save with 600ms debounce. All 5 preference keys (workspace-context-config, model-improvisation-config, workspace-file-paths, terminal-communication-config, workspace-defaults).
>   4. **TutorialPage.tsx (new)** + **TutorialOverlay.tsx (new)**: Feature inventory page with 12 features, category filtering, progress persistence. Spotlight overlay with step navigation, "Try it" button, completion state.
>   5. **IDEProjectsPage.tsx (modified)**: Removed WorkspaceSettingsDialog import/state/JSX. Setup button dispatches `switch-sidebar-tab` event with `detail: 'context'`.
>   6. **TerminalPage.tsx (modified)**: Added 'context' tab to sidebar tabs. Added `switch-sidebar-tab` event listener. Removed WorkspaceSettingsDialog import/state/JSX. Renders ContextSidebar in tab content.
>   7. **App.tsx (modified)**: Added `/tutorial` route with TutorialPage. Added HelpCircle/Tutorial icon in sidebar navigation.
>   8. **NewSessionDialog.tsx (modified)**: Imports `WORKSPACE_CONFIG_PREF_KEY` from ContextSidebar instead of deleted WorkspaceSettingsDialog. Removed inline design taste knobs (variance/intensity/density sliders). Simplified design skills panel with note directing to Context Sidebar.
>   9. **Backup created**: WorkspaceSettingsDialog.tsx → `.bak.20260527-224500`
> **Build Status:** ✅ Build succeeds (verified 2026-05-27)

---

> **Version:** 3.63
> **Last Updated:** 2026-05-27
> **2026-05-27 (v3.63) — SETUP VS INITIALIZE REDESIGN (Completed):
>   1. **InitializeProgressModal.tsx (new)**: 16-step animated progress modal for infrastructure initialization. Runs real `trackerMindSetup('init-all')` IPC in parallel with per-step simulation (220ms + random jitter). Shows live checkmark/done/error per step with retry. Auto-starts on open.
>   2. **WorkspaceSettingsDialog.tsx (new)**: Persistent settings panel for workspace context configuration. 7 system toggles (LLM Wiki, Skills, Graphify, PARA, QMD, Automations, Design Skills) with per-system token budget sliders, taste knobs (Design Variance/Motion Intensity/Visual Density 1-10), behavior toggles (summarization, deep memory), context assembly map SVG. Saves to `workspace-context-config` preference key via `setPreference`.
>   3. **IDEProjectsPage.tsx buttons swapped**: Green FolderTree = "Initialize" (opens progress modal), Amber Settings2 = "Setup" (opens settings dialog), new "New Agent" (Bot, dispatches open-new-agent). Old one-click Setup (trigger-provision) replaced.
>   4. **TerminalPage.tsx modals wired**: Both InitializeProgressModal + WorkspaceSettingsDialog rendered alongside NewSessionDialog. `handleInitSetup` + `handleTriggerProvision` now open modal instead of direct IPC. Added `open-workspace-settings` event listener.
>   5. **NewSessionDialog.tsx loads workspace defaults**: On open, reads `workspace-context-config` from preferences and pre-populates all context toggles (ctxLLMWiki, ctxSkills, ctxGraphify, etc.) with saved settings as overridable defaults.
> **Build Status:** ✅ Build succeeds (verified 2026-05-27)
> **2026-05-27 (v3.62) — DATABASE PAGE ANALYTICS DASHBOARD (Workspace Analytics):
>   1. **DatabasePage.tsx rewritten**: Added Analytics view (default) with 5 stat cards, 8 charts (token/cost/session/category/problem/request distributions + response timing + daily trend), AI usage summary table, problems/requests progress bars. Uses chart.js + react-chartjs-2 (already in deps).
>   2. **View toggle**: Analytics/Tables tabs in header bar. Tables view preserved with sidebar layout (filterable table list → table content with schema + paginated data + CSV export).
>   3. **Period selector**: 7 Days / 30 Days / All Time filters all analytics data sources via existing IPC endpoints.
>   4. **Promise.allSettled**: Each data source fetches independently; one failure doesn't break the rest.
>   5. **Response timing**: Computed by pairing sequential user↔assistant messages per session from getPromptHistory, filtering unreasonable gaps.
> **Build Status:** ✅ Build succeeds (verified 2026-05-27)
> **2026-05-27 (v3.61) — PHASE 2: Design Workspace TAB in TerminalPage, FIXED IPC WIRING:
>   1. **Moved Design Workspace from standalone page → tab inside TerminalPage**: Removed sidebar entry + route from App.tsx, added 'design' to activeTab union, added pink Palette tab button in tab bar alongside Skills/Configs/History.
>   2. **DesignWorkspacePage accepts projectPath + activeTerminalId**: Refactored to take props from TerminalPage, uses IPC `readProjectFile` to read SKILL.md + DESIGN.md content, builds rich <design_taste>/<design_skills>/<design_references> context.
>   3. **Send wired to active terminal**: "Send Design Context to Terminal" now calls `terminalWrite(activeTerminalId, context)` + `saveTerminalBinding({terminalId, sessionContext, status})` — sends full design context to the active terminal's stdin and persists binding in DB.
>   4. **Fix: Edit2 ReferenceError** in ActiveContextsList.tsx — changed `Edit2` → `Pencil` (lucide-react 0.577 removed Edit2).
>   5. **Build**: ✅ Verified (vite + tsc both pass, 0 runtime errors in browser).
> **Build Status:** ✅ Build succeeds (verified 2026-05-27)
> **2026-05-27 (v3.59) — FIXED APP PAGE 7D/30D CHARTS, AFK PROMPT EXTERNAL REFRESH:
>   1. **StatsPage 7day/30day chart data** (StatsPage.tsx): Added missing `'7day'` and `'30day'` handlers in `dailyUsage` useMemo. These periods were falling through to the `'all'` grouping (by month), showing monthly aggregation instead of daily bars. Also fixed hardcoded subtitle text.
>   2. **AFK prompt → External page refresh** (App.tsx, ExternalPage.tsx): After user selects an activity in the AFK prompt, `handleAfkConfirm`/`handleAfkDismiss` now dispatch `'external-data-changed'` custom event. ExternalPage listens for this event and calls `refreshStats()` + reloads activities. Previously the data was saved to DB but ExternalPage never refreshed its UI.
> **Build Status:** ✅ Build succeeds (verified 2026-05-27, v3.59)
> **2026-05-27 (v3.58) — WIRED CONTEXT MAINTENANCE TAB, DESIGNING COMPOSE REDESIGN:**
>   1. **Context Maintenance Tab (TerminalPage.tsx)**: Replaced hardcoded placeholder with real `<ContextMaintenanceTab>` component. Connected data loading to 4 new IPC endpoints (`get-context-systems`, `get-session-summaries`, `get-deep-memory`, `get-rag-stats`). Uncommented and wired all 6 sub-components (MemoryStatusCard, ActiveContextsList, RecentChatHistory, CompactionsPanel, ContextSearchBar, SettingsPanel).
>   2. **SettingsPanel fix** (src/components/context-ui/SettingsPanel.tsx): Fixed `as const)` to `as const].map` syntax error.
>   3. **ActiveContextsList icon fix** (src/components/context-ui/ActiveContextsList.tsx): Fixed `Toggle2` → `ToggleLeft` (not in lucide-react).
>   4. **Preload bridges** (src/preload.ts): Added `getContextSystems`, `getSessionSummaries`, `getDeepMemory`, `getRAGStats`.
>   5. **IPC handlers** (src/main.ts): Added `get-context-systems`, `get-session-summaries`, `get-deep-memory`, `get-rag-stats`.
>   6. **IN PROGRESS: Terminal compose redesign** — Generating design prompt for unified skills/compose/checklist architecture. See `agent/docs/terminal-compose-redesign/`.
> **Build Status:** ✅ Build succeeds (verified 2026-05-27)
>   1. **SkillsTab component**: Full inline skills CRUD component (~400 lines) — list, create, edit, delete project skills with form fields
>   2. **Analytics tab improved**: Period selector (today/week/month/all), agent breakdown bars, top sessions list
>   3. **Session detail view**: Click-to-detail panel in Sessions tab showing session metadata, messages, and actions
>   4. **Terminals tab added**: Group-based layout display showing all terminal panes organized by group
>   5. **Context-maintenance tab button**: Visual divider separating context-maintenance tab from others in sidebar
>   6. **StatusDot size prop**: Extended StatusDot component to accept a `size` prop for flexible sizing
>   7. **FEATURE_TRACKER.md updated**: Full terminal page documentation added
> **Build Status:** ✅ Build succeeds (verified 2026-05-26, v3.56)
> **2026-05-25 (v3.55) — IMPLEMENTED TERMINAL CONTEXT SYSTEM GAPS:**
>   1. **Context-changed UI refresh (TerminalPage.tsx)**: `onContextChanged` listener now calls `loadAllProblems()`/`loadAllRequests()` after writing delta messages. Deps array updated to include callbacks.
>   2. **Context-changed dispatch (main.ts)**: `parseAndExecuteActions` now sends `context-changed` event to renderer after batch processing actions.
>   3. **InstructionPanel wired into sidebar**: Added Send button toggle in sidebar header, renders `<InstructionPanel>` as overlay in sidebar content area when toggled. `onSend` wired to existing `handleInstructionPanelSend`.
>   4. **Problem prompt delivery fixed**: `handleCreateTerminalForProblem` replaced `setTimeout(3000)` with proper `initializeTerminal()` call that waits for terminal ready before writing prompt.
>   5. **Actions file watcher**: `setupActionsFileWatcher` called after session creation (NewSessionDialog) and after problem-assigned terminal creation.
>   6. **Close terminal batching**: `closeTerminal` now uses `React.startTransition` to batch `setTerminalTabs`/`setActiveTerminalId`/`setTerminalLayout`. `saveLayout` moved outside transition.
>   7. **Session load limit**: Changed from 100 → 500.
>   8. **TerminalWindow height fix preserved**: `h-full` retained, no regression.
> **Build Status:** ✅ Build succeeds (verified 2026-05-25, v3.55)
> **2026-05-25 (v3.54) — INTEGRATED DESIGN SKILLS SYSTEM (COMPLETED):**
>   1. Copied 5 new skill files (impeccable, ui-ux-pro-max, taste-skill, design-taste, enhanced frontend-design) to agent/skills/
>   2. Copied 8 design references (Claude, Linear, Vercel, etc.) to agent/design-references/
>   3. Extended ContextConfig.ts with design_skills schema ([pre-existing])
>   4. Extended ContextService.ts with buildDesignSkillsContext() ([pre-existing])
>   5. Extended NewSessionDialog.tsx with Design Skills toggle in systems grid, 3 taste knobs (range sliders), pink accent theme, inline panel UI. Design Skills section includes: toggle card with Palette icon, expanded panel with Design Variance/Motion Intensity/Visual Density sliders (1-10), ~800 token allocation, references toggle. Design skills wired into handleCreate() and buildPreview() for session config.
> **2026-05-25 (v3.53) — ADDED PROVISION, NEW AGENT, MINIMIZE BUTTONS TO IDE WORKSPACE HEADER:**
>   1. **Buttons added to IDEProjectsPage workspace header**: Minimize (Minimize2, dispatches `toggle-minimize`), Provision (green FolderTree, dispatches `trigger-provision`), and New Agent (amber Bot, dispatches `open-new-agent`) now appear in the workspace header when a project is opened on `/ide` route. Previously only X close + project name were shown.
>   2. **Imports added**: `Minimize2`, `FolderTree`, `Bot` from lucide-react.
> **Build Status:** ✅ Build succeeds (verified 2026-05-25, v3.54)
> **2026-05-23 (v3.48) — WORKSPACE MINIMIZE + CLOSE WITH SAVE PROMPT:**
>   1. **Minimize/Restore toggle**: New `workspaceMinimized` state + button in header bar. Hides terminal layout + sidebar but keeps PTY processes alive. Shows centered restore card.
>   2. **Close workspace with save prompt**: New "Close" button in header → dialog with Save & Close / Discard / Cancel. Save & Close saves all active terminal sessions then kills PTYs. Discard kills PTYs without saving. Uses existing `saveTerminalSession` + `killTerminal` IPC endpoints.
>   3. **Fixed missing workspace functions**: Defined `loadSavedConfigs`, `handleSaveWorkspace`, `handleLoadWorkspace` that were referenced in JSX but never implemented. `handleSaveWorkspace` saves layout via `saveTerminalLayout`. `handleLoadWorkspace` restores layout from saved config.
>   4. **dictionary.md updated**: Added "Terminal Workspace" section with minimize/close/save terminology.
> **2026-05-23 (v3.49) — CLOSE TERMINAL BUTTON FIX + RESTORE MISSING CONTENT:**
>   1. **Close terminal button fix**: Changed `<button onClick>` to `<button onPointerDown>` with `e.preventDefault()`. The click event was being swallowed by xterm.js event delegation upstream; onPointerDown fires before React's synthetic event delegation on the document, capturing the click before xterm intercepts it.
>   2. **getLeafIds() guard**: Added `if (!node.children || node.children.length < 2) return [];` to prevent `TypeError: Cannot read properties of undefined` when PaneNode has no children.
>   3. **Restored missing content**: Re-inserted Quick Instruction Input Bar, Terminal Tab Bar, and TerminalLayout sections that were accidentally deleted by a previous bad edit match.
>   4. **Minimize/Restore + Close Workspace buttons**: Added Minimize2/Maximize2 toggle and X close button to the tab bar (right side, ml-auto).
>   5. **Workspace close dialog**: Save & Close / Discard & Close / Cancel dialog when clicking the workspace X button.
> **Build Status:** ✅ Build succeeds (verified 2026-05-23, v3.48)
> **2026-05-23 (v3.52) — REMAINING TERMINAL CONTEXT SYSTEM GAPS:**
>   1. **Step 27 — Rich file display (BasicMarkdownViewer)**: Replaced raw `<pre>` file preview with full markdown renderer. Handles headers, bold/italic, `code`, ```blocks, lists, blockquotes, links. (1 new file: `src/components/BasicMarkdownViewer.tsx`)
>   2. **Step 3/19 — onContextChanged subscription**: When AI writes to context (problems, requests, checklists), delta message appears in active terminal via `terminalWriteRaw`.
>   3. **Step 8 — System message format**: Context delta messages now use `terminalWriteRaw` with CR instead of `terminalWrite` with LF for better agent parsing.
>   4. **Step 18 — Prompt preview**: Already existed in InstructionPanel (collapsible preview with copy). Verified.
>   5. **Step 30 — Bidirectional Problem↔Request linking**: Added "Related Requests" section to ProblemDetailModal with link/unlink dropdown + chips. Mirrors existing RequestDetailModal "Linked Problems" logic.
>   6. **Step 11 — Centralize agent defaults**: Moved 9 inline `localStorage.getItem('terminal-defaultAgent')` calls to `getDefaultAgent()`/`setDefaultAgent()` in `src/lib/defaults.ts`.
>   7. **Step 14 — Session limit**: Increased frontend `loadSessions` from `limit=20` to `limit=100`.
>   8. **Step 21 — Target terminal indicator**: Already existed in InstructionPanel (persistent badge showing active terminal ID). Verified.
>   9. **Setup/Initialize separation**: (v3.50) Rename + Advanced Config toggle. All still intact.
> **2026-05-23 (v3.49) — FOCUS SESSIONS IDLE FIX + CHART HEIGHT/OVERFLOW + OLD DATA CLEARED:**
>   1. **Focus Sessions idle detection**: Session duration now uses `lastInteractionRef + 5min` clamp — idle periods (walking away with a productive app open) no longer inflate session durations. Added global `mousemove`/`keydown`/`click` listener to track last interaction.
>   2. **Stopwatch pauses during idle**: Stopwatch interval skips accumulation when no interaction for 5+ minutes — visible timer and saved sessions are now consistent.
>   3. **Old inflated data cleared + auto-refresh**: Added `clear-productivity-sessions` IPC handler + `clearProductivitySessions` preload bridge. Called once on Dashboard mount to wipe all stale wall-clock-based sessions. Fixed fetch effect that only ran on `[selectedPeriod, minDuration]` — now also runs every 5s (auto-refresh interval via `fetchKey`) and immediately after clear, so new sessions appear live.
>   4. **Productivity chart height**: Increased from `h-40` (160px) → `h-72` (288px) so bars fill the card container.
>   5. **Hour overflow fix**: Today view stacked totals (productive + other + external) capped at 3600s per hour — bars no longer overflow y-axis.
>   6. Removed unused `maxBarHeight` variable.
> **Build Status:** ✅ Build succeeds (verified 2026-05-23, v3.49 focus sessions + chart fixes)
> **2026-05-23 (v3.50) — UI REDESIGN + PROMPT RELOCATION + WORKSPACE CLOSE FIXES:**
>   1. **New Prompts sidebar tab**: Added `prompts` tab with `ScrollText` icon. Moved "Project Prompt" textarea from `configs` (Saved Workspaces) tab to dedicated `prompts` tab. Configs tab now only shows saved workspaces.
>   2. **Removed Exit Workspace button**: Leftover button in IDEProjectsPage removed. Close X now dispatches `open-close-workspace-dialog` event to show TerminalPage's save dialog.
>   3. **Close workspace dialog redesigned**: Glass-morphism background, warning icon, stacked Save & Close / Discard / Cancel layout with gradient buttons and shadows.
>   4. **Close terminal tab fixed**: `closeTerminal` now removes terminal from UI synchronously (functional updaters) before IPC cleanup (fire-and-forget). No more stale closure issues.
>   5. **ProblemsTab list items redesigned**: Glass cards with priority glow dots, rounded-xl, hover effects, pill-style priority badges.
>   6. **ProblemDetailModal redesigned**: Glass-morphism dialog with priority indicator, gradient status buttons, gradient action buttons with shadows.
>   7. **RequestDetailModal redesigned**: Same glass-morphism treatment with blue accents, inline checklist with progress bar.
>   8. **RequestsTab list items redesigned**: Matching glass card style with link icons and priority indicators.
>   9. **ChecklistsTab + ChecklistGroup redesigned**: Gradient progress bars, color-coded percentages, circular checkbox toggles with glow, collapsible groups with chevron.
>   10. **ModalChecklist redesigned**: Progress bar with gradient fill, circular status toggles, pill-style status badges, gradient Approve button.
>   11. **New `onCloseWorkspace` prop** on TerminalPage — called after Save & Close or Discard completes to close workspace overlay. Passed from IDEProjectsPage.
> **Build Status:** ✅ Build succeeds (verified 2026-05-23, v3.50 UI redesign + prompt relocation)
> **2026-05-22 (v3.47) — AFK TRACKING FIX + PROMPT REDESIGN:**
>   1. **Main process tracking paused on idle** — Added `set-tracking` IPC handler + `setTracking` preload bridge. Idle detection now calls `setTracking(false)` to pause `pollForeground()`, preventing the last app from accumulating time during AFK. Resume via `setTracking(true)` on idle return.
>   2. **Re-idle race condition fixed** — Added 12-second `idleCooldownRef` after returning from idle. Prevents the stale 5s heartbeat value from triggering a second idle detection before the OS idle timer resets. Was causing AFK session to be closed with duration=0 and a new session created, so the user's selected activity never had the correct duration.
>   3. **AFK prompt redesigned** — Polished glass/dark aesthetic with spring animation, amber clock icon, duration display, gradient suggestion card, hover effects.
> **2026-05-22 (v3.46) — DOUBLE-SPAWN FIX + ALL BUNDLE E ITEMS COMPLETE:**
> Redesigned AfkPromptModal with polished glass/dark aesthetic: gradient header accent, spring scale/fade animation (matching other modals), clock icon with amber icon badge, prominent duration display, suggested activity card with gradient + hover arrow, "Or choose an activity" section with hover states, subtle ring effects on color dots, and empty state message when no activities exist.
> **2026-05-22 (v3.46) — DOUBLE-SPAWN FIX + ALL BUNDLE E ITEMS COMPLETE:**
> **Note:** Fixed critical double-spawn bug (system prompt never written to terminal). Completed all remaining Bundle E items (Related Requests, PRIORITY_INDICATORS, React.memo on terminal tabs, unlink-problem-from-request IPC). All bundles A-E now fully implemented.
> **2026-05-22 (v3.44) — TERMINAL + CONTEXT SYSTEM OVERHAUL (Bundles B-E):**
>   1. **`dateOffset` moved to App.tsx** — Single `dateOffset` state in the top nav, shared across all pages. Resets when `selectedPeriod` or `dateRangeMode` changes.
>   2. **Chevrons moved to top nav** — Previous/Next period chevrons and period label now live in the header bar (between period selector and Month/30d toggle). Removed from all pages.
>   3. **All pages use shared `dateOffset` prop** — DashboardPage, StatsPage, ProductivityPage, BrowserActivityPage, ExternalPage all accept `dateOffset` + `onDateOffsetChange` instead of managing their own offset state.
>   4. **Duplicate chevron code removed** — StatsPage, ProductivityPage, BrowserActivityPage, ExternalPage, and DashboardPage no longer have their own chevron navigation buttons.
>   5. **StatsPage `filteredLogs`** — Inline calendar-month logic replaced with shared `getDateRange(selectedPeriod, dateOffset, dateRangeMode)`. Month chart data now iterates via `getDateRange()` boundaries instead of hardcoded `daysInMonth`. Respects trailing-30 mode.
>   6. **ProductivityPage — all data respects dateOffset** — `productivityData` (score + breakdown) now filters `logs`/`browserLogsProp` by `getDateRange()` instead of using parent's pre-aggregated `appStats`/`browserStats`. `allWebsites` and `sessions` also filter by date range. Everything updates uniformly when timeline changes.
>   7. **DashboardPage website/solar data** — `computedWebsiteData` and `computedSolarData` now use `getDateRange()` instead of inline calendar logic. Both respect `dateRangeMode`.
>   8. **ExternalPage `periodOffset` → `dateOffset`** — Renamed to align with shared prop. Uses shared `getDateRange()` for all date filtering and labels. Chevrons removed from activity detail view.
>   9. **BrowserActivityPage** — Already used `getDateRange()`; just removed local state and chevrons in favor of shared prop.
> **2026-05-22 (v3.46) — DOUBLE-SPAWN FIX + BUNDLE E COMPLETION:**
>   1. **Double-spawn fix (critical)**: Removed `spawnTerminal` from `onCreate` handler — let `handleTerminalReady` in TerminalWindow.tsx spawn the PTY when pane mounts. Was causing `terminal:ready` to fire before `initializeTerminal` registered its listener, resulting in 8s timeout → 7s fallback set `agentReadyRef=true` → `initializeSession` skipped system prompt entirely.
>   2. **System prompt queuing**: `initializeSession` now queues merged prompt + init content as queue items with `isSystemPrompt`/`isInitContent` flags instead of writing via `terminalWriteRaw`. `flushMessageQueue` writes with `[SYSTEM CONTEXT — ...] [END SYSTEM CONTEXT]` / `[PROJECT CONTEXT — ...] [END PROJECT CONTEXT]` markers and 300ms delays (Fix 8).
>   3. **Step 30 — Related Requests**: Added "Related Requests" section to ProblemDetailModal with link/unlink support. Filters `allRequests` by `linked_problems.includes(problem.id)`. Dropdown to link new requests, × button to unlink.
>   4. **Step 26/31 — PRIORITY_INDICATORS**: New constant with color-coded priority display (critical=red, high=orange, medium=yellow, low=green). Replaces plain-text priority in modal meta section.
>   5. **Step 28 — React.memo on terminal tabs**: Extracted `TerminalTabItem` component wrapped in `React.memo` to prevent unnecessary re-renders of tab bar.
>   6. **unlink-problem-from-request IPC**: New handler + `RequestsService.unlinkProblem()` + preload bridge. Removes problem ID from request's `linked_problems` array.
> **Build Status:** ✅ Build succeeds (verified 2026-05-22, v3.47 AFK tracking fix + prompt redesign)
>   1. **onSend wired** — InstructionPanel stub replaced with `handleInstructionPanelSend`
>   2. **buildInitContent killed** — Duplicate context assembly path removed. NewSessionDialog uses `assembleContext()` exclusively. TerminalPage no longer merges both paths.
>   3. **UI Refresh Events** — Fixed preload.ts cleanup (was using `() => {}` instead of stored handler refs). Added `onContextChanged` refresh effect for problems/requests.
>   4. **Terminal Manual Input** — Added missing `terminal:write` IPC handler in main.ts for preload's `terminalAPI.write` bridge
>   5. **Problem Prompt Delivery** — Replaced fragile 3000ms setTimeout with `queueOrSend` mechanism in `handleCreateTerminalForProblem`
>   6. **Skills Pipeline** — Verified end-to-end (generatePrompt → onSend → queueOrSend)
>   7. **FlowView Audit** — File doesn't exist (stub), no-op
>   8. **Status Change Format** — Terminal notification format fixed to `[SYSTEM: #id action "status"]` pattern with per-action formatting + `\r` line ending
>   9. **Bundle B: Session System** — tracker-mind-setup in onCreate, init/setup mode distinction, agent defaults unification (getDefaultAgent), SUPPORTED_AGENTS dropdown, resume session ID input, session list limit 500
>  10. **Bundle C: IPC & Verification** — electron:execute-command handler, sendInstructionsToTerminal extended with linkedProblemId/linkedRequestId, tracker-mind-generate TODO, vault sync doc comment
>  11. **Bundle D: Terminal UX** — Prompt review button/modal, InstructionPanel textarea enlarged, target terminal indicator with agent readiness status
>  12. **Bundle E: UI Polish** — CategoryBadge + status in problem cards, startTransition batching in closeTerminal, summarize-session IPC handler, NL routing TODO
> **Build Status:** ✅ Build succeeds (verified 2026-05-22, all 5 bundles A-F complete)
> 13. **Bundle F: Context Sharpening & Deferrals** — summarize-session IPC handler verified in main.ts + preload bridge; smart task routing TODO deferred. Key bugfix: `getDefaultAgent()` infinite recursion (TerminalPage.tsx:24 was calling itself instead of reading localStorage).
> **2026-05-21 #8 — TERMINAL + CONTEXT SYSTEM OVERHAUL PROMPT UPDATED:** Added 37 new issues (now 54 total). New additions: terminal can't accept manual input, wrong launch command, session blinking, agent selection empty, session ID hardcoded, can't specify existing session ID, initial message not sent properly, AI context sharpening, natural language task routing, rich file display (markdown→HTML), agent review ugly, prompt preview missing system prompt, save button not saving, workspace save/load redesign, terminal split/drag broken, problem UI redesign, prompt preview overhaul, and more. Full prompt at `agent/docs/terminal-context-system-overhaul/PROMPT.md` (530+ lines).
> **2026-05-21 Fix #7 — SLEEP LOGIC (COMPLETED):** Timeline model corrected: App Exit → [pre-sleep amber] → Fell Asleep → [sleep indigo] → Woke Up → [post-wake rose] → App Open. Backend: `bedtime_minutes` now stores raw app exit (no preSleep shift), `sleep_seconds` = `duration - preSleep` (actual sleep). Frontend: 3 visual segments per bar (amber/indigo/rose), tooltip renamed "Bedtime"→"App Exit" + added "Fell asleep"/"Woke up" lines, legend reordered. 
> **2026-05-21 Fix #8 — SLEEP POPUPS: DURATIONS → TIME SELECTORS + CHART 6PM EPOCH:** Add Past Sleep modal and Auto Detection popup: replaced latency/duration pickers with time selectors. Grid layout: Row 1 = Device Off | Fell asleep at, Row 2 = Wake up | Device On. Confirm handlers compute deltas from time differences. Chart Y-axis epoch shifted to 6PM — all normal sleep patterns render as one continuous bar. Build passes.
> **2026-05-21 Fix #7b — SLEEP POPUPS REDESIGNED:** All 3 sleep popups fixed to use consistent timeline:
>   - **Auto detection popup** (App.tsx): Removed 15-min buffer subtracting from gapStart. Device Off = gapStart (raw). Device On = gapEnd (raw). Labels renamed: "From"/"To"/"Bedtime"/"Wake time" → "Device Off"/"Device On". Summary shows "+Xm pre-sleep" line + "Actual Sleep" (indigo) + "Total inactive" (emerald).
>   - **Add Past Sleep modal** (ExternalPage.tsx): Replaced "Bedtime"/"Wake time" pickers with "Device Off"/"Wake up time"/"Device On" pickers. Replaced "Woke up before opening app" duration picker with "Device On" absolute time picker. Timeline summary shows: Device Off → Pre-sleep → Woke Up → Device On → Actual Sleep / Total (Off→On).
>   - **Morning Prompt**: Now pre-fills Device Off = lastCloseTime, Wake up = now - wakeUpMinutes, Device On = now.
> Build passes.
> **2026-05-21 Update (5.1):** CRITICAL CONTEXT SYSTEM & TERMINAL CRASHES FIXED. Deep audit found 10+ broken systems. Fixed ALL:
> - **Missing import**: `assembleContext()` called in TerminalPage.tsx but NOT imported → ReferenceError on "Setup Agent". Added `import { assembleContext } from '../services/ContextService'`.
> - **Dead event**: `create-terminal` events dispatched in 4 places but NO listener → Header "Open Terminal" button, "+" button, problem assignment created tabs but never spawned PTY. Added event handler that calls `spawnTerminal()`.
> - **Race condition**: `onCreate` callback dispatched dead event then called `initializeTerminal` on an unspawned terminal → silent failure. Now awaits `spawnTerminal()` before `initializeTerminal()`.
> - **Broken path**: QMD template check in `buildInitContent()` passed `projectPath + '/agent/templates'` to `listAgentDirFiles` which already appends `/agent` → resolved to `{projectPath}/agent/templates/agent`. Fixed.
> - Plus all 5 fixes from Update 5 (listDirectory IPC, checkInfra path, graphify path, retry-agent-init, terminal:destroy).
> **Build passes.**


> **2026-05-21 Update (2):** COMPLETED ALL 6 PHASES of Terminal System overhaul. Phase 1: Terminal height responsive (flex chain fix). Phase 2: Session resume with Resume ID (DB auto-generates `resume-*` IDs, uses `opencode --resume <id>` flag). Phase 3: Dynamic system prompt assembly (`buildSessionContext()` loads active problems/requests/checklists into prompt). Phase 4: Setup vs Initialize separation (`setupTerminal()` + `initializeSession()` from `initializeTerminal()`). Phase 5: Event-driven status updates (`context-changed` IPC event fires on problem/request/checklist CRUD, writes `[System: ...]` to active terminal). Phase 6: Metadata parsing + auto-tags (Session Metadata blocks parsed, DB auto-updated, `session-metadata-updated` event, auto-tags generated). Build passes.
> **2026-05-21 Update:** Terminal sizing CRITICAL FIX — TerminalPage root used `flex-1` but parent (App.tsx route wrapper) is NOT `display:flex`, so `flex-1` was inert = `height: auto`. Terminal pane `height: 100%` computed to `auto`. Fix: changed TerminalPage root from `flex-1` to `h-full` — parent IS a flex item with definite height, so `h-full` resolves correctly. Also fixed: missing `handleLayoutChange` definition (ReferenceError on split/merge), missing `min-h-0` on terminal container, removed fragile `!important` xterm CSS overrides. See `agent/skills/agent-reflect/logs/2026-05-21_idiot_trigger.md` for full analysis.
> **2026-05-20 Update:** ALL FIXES APPLIED. Header nesting fully fixed — project select now closes properly with `</div>` inside the conditional. Both Open Terminal and Setup buttons are at the same level in header bar. Setup button wired and fires correctly. Setup dialog system prompt preview redesigned: always visible, layer color indicators, 2000 char limit per layer. Build passes.
> **2026-05-20 Update (later):** Skills path clarification — `defaults.ts` now correctly references skills per project at `<projectPath>/agent/skills/` (not global). Also: Session list 1p1r → readable names, Edit Session popup fixed, ProblemDetailModal/RequestDetailModal styled (zinc theme, SVG X, shadow), ProblemDetailModal stopPropagation. Build passes. Graphify rebuilt (472 nodes, 707 edges, 48 communities).
> **2026-05-19 Update (afternoon):** Build fixes: InstructionPanel Escape key closes panel, default session name → 'Setup Agent', graphify rebuilt (472 nodes, 708 edges, 48 communities). Edit Session popup had broken div nesting causing 3 consecutive build failures — fixed by replacing entire edit form section.
> **2026-05-19 Update:** InstructionPanel improvements — Markdown preview (amber headers, green checkboxes, cyan code), Copy button with 1.5s feedback, persist on close/reopen (localStorage per sessionId), Cancel button, Clear button, Use Skill button wired, storageKey in useEffect deps.
> **2026-05-19 Update:** Implemented Context Management System end-to-end:
- `src/services/ContextConfig.ts` — ContextConfig interface + DEFAULT_CONTEXT_CONFIG
- `src/services/ContextService.ts` — Browser-safe async context assembly (uses deskflowAPI instead of Node.js fs/path)
- `agent/context/` — README.md + schema files (session-summaries.json, deep-memory.json)
- `src/components/NewSessionDialog.tsx` — 6-system toggle UI with SVG ContextMapVisualization
- `src/pages/TerminalPage.tsx` — Wires assembleContext into session creation
- Features: 6 toggle cards, SVG context map, token budget bar, behavior toggles, condenseStateMd, async browser-safe assembly
> **2026-05-18 Update:** Renamed "Initialize" → "Setup" throughout UI (TerminalPage button + NewSessionDialog). Created 4 PROBLEM entries (#124-127) for Context Management System. Generated research prompt at `agent/docs/research-impl/context-management-architecture-18052026/PROMPT.md` covering layered context, system integration, visualization. Inventory of all 6 knowledge systems (LLM Wiki, Obsidian Skills, Graphify, PARA, QMD, Automations) — 3 missing from Setup UI.
> **2026-05-22 — PRODUCTIVITY CHART HEIGHT + HOUR OVERFLOW FIX:** Chart height increased from `h-40` (160px) to `h-72` (288px) so bars fill the card container. Today view stacked totals (productive + other + external) now properly capped at 3600s per hour — if total exceeds 1h, values are proportionally scaled down so stacked bars never overflow y-axis. Removed unused `maxBarHeight` variable. Categorization verified: productive→green, neutral+distracting→"Other" amber, external→indigo.
> **Build Status:** ✅ Build succeeds (verified 2026-05-22, productivity chart fixes)
> **Session Date:** 2026-05-22
> **Token Estimate:** ~15000 tokens

---

## 🚨 2026-05-18 — THREE NEW TASKS (All COMPLETED)

### Task 1: Sleep Chart Per-Bar Latency Labels — COMPLETED
- **Problem:** "Time before device" and "Extra time after device" badges were GLOBAL averages above/below the entire chart.
- **Fix:** Sleep chart now has 3 datasets per bar: Pre-sleep (amber), Sleep window (indigo), Post-wake (rose). Removed global aggregate badges. Added legend. Tooltips show all three values.
- **Files:** `src/pages/ExternalPage.tsx` — Sleep detail section rewritten with 3-segment bar chart

### Task 2: Database Page Table Search — COMPLETED
- **Problem:** Too many tables with random names — hard to find the one you need.
- **Fix:** Added `tableNameFilter` state + search input above table list. Filters by table NAME (case-insensitive substring). Clear button. Separate from content search.
- **Files:** `src/pages/DatabasePage.tsx` — Added table name search with X icon to clear

### Task 3: External vs Internal Comparison Card — COMPLETED
- **Problem:** User wanted a clear comparison between external activity (sleep/stopwatch) and internal/device usage as a shareable visual.
- **Design:** Bold "Time Audit" card with amber (external) vs emerald (internal) hero numbers, progress bars, context callouts, Syne + Barlow Condensed fonts, decorative gradient orbs, grain texture, "via DeskFlow" watermark.
- **Data:** New `get-comparison-stats` IPC handler + `getComparisonStats` preload bridge. Queries `external_sessions.duration_seconds` + `logs.duration_ms` for the same period.
- **Files:** `src/main.ts` (new IPC handler), `src/preload.ts` (new bridge), `src/pages/ExternalPage.tsx` (Time Audit card)

### Task 4: Stopwatch Reset Fix — COMPLETED
- **Problem:** Productivity timer resets to zero every time user switches to a neutral/distracting app (e.g., File Explorer).
- **Root Cause:** Stopwatch effect re-ran on every `currentApp` change, resetting `currentProductiveMs` when `isProductive` was false.
- **Fix:** Replaced start-time-based pattern with **accumulated delta pattern** — timer keeps accumulating across app switches. Only pauses when nothing active. Uses `stopwatchAccumulatedRef` + `stopwatchLastTickRef` + `delta` approach. Timer only resets on explicit pause/clear, not on app switch.
- **Files:** `src/pages/DashboardPage.tsx` — Stopwatch useEffect rewritten

### Task 5: Productivity Sessions Design Prompt — GENERATED
- **Problem:** Dashboard shows live timer that resets. User wants: best time to beat, session history, ranking, threshold filter, personal best tracking.
- **Prompt saved:** `agent/docs/productivity-sessions-18052026/PROMPT.md`
- **Design targets:**
  - Remove live timer, replace with "Best Time Today / Week / PB" display
  - New `productivity_sessions` DB table for session storage
  - Session list with filters (period + min duration threshold)
  - Personal best tracking (longest session, longest streak, best day)
  - Progress ring showing today's total vs goal
  - Threshold setting in Settings page
  - Charts: daily accumulation bar, session duration distribution, streak visualization
- **Files:** Design prompt → implementation pending user RESULT.md

---

### 2026-05-18 — Compose → AI Agent Integration Research

**Problem:** Compose panel sends instructions to AI agents but instructions are not properly inserted into agent context. Also, compose panel pushes terminal down instead of squashing it.

**Status:** PROMPT GENERATED — User will do their own research. Prompt saved to `agent/docs/research-impl/compose-agent-integration-18052026/PROMPT.md`.

**Files Created:**
- `agent/docs/research-impl/compose-agent-integration-18052026/PROMPT.md` — Research prompt covering Claude Code, OpenCode, Gemini CLI, Codex, and other agents. Includes: input methods, session continuity, context injection, CLI flags, pros/cons.

**Skill Update:**
- `agent/skills/generate-prompt/SKILL.md` — Added rule: "Do NOT use your own interpretation or framing. Copy the user's exact words."

**Compose Squash Fix:**
- `src/pages/TerminalPage.tsx` — Changed terminal wrapper from `h-full` to `flex-1 min-h-0` so compose panel squashes terminal instead of pushing it down.

---

### 2026-05-18 — Context Management System — Setup Rename + Research Prompt

**Problem:** After a few chats, AI agent predicts user before they finish. Current "Initialize" dialog only covers QMD + Graphify. Missing: LLM Wiki, Obsidian Skills, PARA, Automations. Need layered context summarization that stores chat history efficiently.

**Status:** RESEARCH PROMPT GENERATED — User will do their own research. Prompt saved to `agent/docs/research-impl/context-management-architecture-18052026/PROMPT.md`.

**Knowledge Systems Inventory:**

| System | Location | Status in Setup UI | Implementation |
|--------|----------|-------------------|----------------|
| LLM Wiki | `agent/*.md` | ❌ Missing | Full — files exist |
| Obsidian Skills | `agent/skills/*/SKILL.md` | ❌ Missing | SkillsService reads them |
| Graphify | `graphify-out/` | ✅ Included | AST + LLM graph builder |
| PARA | `CZVault/` | ❌ Missing | graphify_maintain.py syncs |
| QMD | `agent/templates/*.qmd` | ✅ Included | Template system exists |
| Automations | `agent/automations/` | ❌ Missing | Not yet created |

**UI Changes:**
- `src/pages/TerminalPage.tsx` — Renamed "Initialize" button → "Setup"
- `src/components/NewSessionDialog.tsx` — Renamed "Initialize Agent Workspace" → "Setup Agent Workspace", "Agent Context & Init Files" → "Agent Context & Tools", "Initialize Agent" → "Setup Agent"

**PROBLEM Entries Created:**
- Issue #124: Context Management — AI Agent Gets Stale Context Across Chats
- Issue #125: Setup Dialog — Missing System Toggles
- Issue #126: Context History — Efficient Summarization
- Issue #127: In-App Context Visualization

**Research Focus:**
- Layered context: short-term (N messages) → medium-term (session summaries) → long-term (LLM Wiki files) → deep memory (cross-session patterns)
- System integration: how each system feeds into context, dependencies between systems
- Setup dialog redesign: all 6 system toggles with status indicators
- Context Map visualization: in-app graph showing system connections

---

### 2026-05-17 — Prompt History Fix — IN PROGRESS (using generate-prompt skill)

**Problem:** Prompt history shows fake "Processing" entries for every keystroke typed in terminal. `terminal:write-old-format` inserts EVERY terminal write into `terminal_messages` as `role='user', status='in_progress'`. Individual keystrokes (single chars, Enter keys) are treated as prompts. They never get completed because no AI responds to a single "a" keystroke. Previous attempts broke terminal behavior.

**Status:** IN PROGRESS — Using generate-prompt skill to design proper solution.

**What Changed:**
1. Added `terminal:write-raw` handler in main.ts — writes to PTY without creating a `terminal_messages` DB record
2. Added `terminalWriteRaw` bridge in preload.ts
3. Changed system-level terminal writes (launch commands, system prompts, init content) to use `terminalWriteRaw` instead of `terminalWrite` — these are not user prompts
4. Added auto-settle stale records in `get-prompt-history` and `get-prompt-status` IPC handlers: `UPDATE terminal_messages SET status = 'completed' WHERE status = 'in_progress' AND created_at < datetime('now', '-15 minutes')`
5. Sleep detail: replaced duration bar chart + ugly table with floating range bars (bedtime→wake crossing midnight axis), "time before/after device" badges above/below chart, uses app's glass theme

**Files Modified:**
- `src/main.ts` — Added `terminal:write-raw` handler; stale record cleanup in get-prompt-history and get-prompt-status
- `src/preload.ts` — Added `terminalWriteRaw` bridge
- `src/components/TerminalWindow.tsx` — Keystrokes reverted to `terminalWrite` (individual chars should not be recorded as prompts, but the terminal behavior must be identical)
- `src/pages/TerminalPage.tsx` — System init writes use `terminalWriteRaw`
- `src/pages/ExternalPage.tsx` — Sleep detail redesign (floating range chart)
- `agent/state.md` — This entry

**Why:** System init messages (launch commands, merged system prompts, init content) were being recorded as "prompts" with `status='in_progress'`. Since no AI responded to these, they stayed stuck as "Processing" forever and showed up as fake prompts from hours ago. Sleep sessions table was ugly and redundant.

**Result:** System-level terminal writes no longer create DB records. Only actual user-initiated prompts (instruction panel sends, queued messages) are recorded. Stale stuck records auto-resolve after 15 minutes. Sleep detail shows floating range chart with bedtime→wake visualization.

**Build:** ✅ Both renderer and electron compile cleanly.

---

### 2026-05-17 — Agent False-Positive Signature Fix (Startup Delay)

**What Changed:**
1. Added `handlerStartTime` timestamp + 3-second startup delay to `terminal:create` and `spawn-terminal` PTY data handlers — signature detection is skipped for the first 3 seconds
2. Fixed pre-existing `const _i` → `let _i` in `spawn-terminal` for loop (TS2588 error)

**Files Modified:**
- `src/main.ts` — `terminal:create` and `spawn-terminal` handlers (3s startup guard before agent signature checking), `spawn-terminal` for loop fix

**Why:** On Windows, the shell prompt (`PS C:\Users\user>`) ends with `>`, which matches the `opencode` signature `/>\s*$/`. This triggered `agent:ready` immediately — before the AI agent had even started. The "Waiting for agent..." overlay disappeared, but the agent's launch command hadn't been processed yet, so the terminal showed a bare shell prompt instead of the AI agent.

**Result:** "Waiting for agent..." overlay now stays visible for at least 3 seconds, preventing shell prompts from causing false-positive readiness. The AI agent has time to start and show its real prompt, which correctly triggers `agent:ready`.

**Build:** ✅ Renderer + Electron

---

### 2026-05-17 — Prompt History Limit + Delete

**What Changed:**
1. Added `promptHistoryLimit` preference (default 5) — stored in `deskflow-prefs.json`, adjustable per-user
2. PromptHistoryTab now shows only N recent prompts; older ones hidden behind "Show X older" toggle
3. Delete button (Trash2 icon) appears on hover per-entry, removes from DB permanently
4. Added `delete-terminal-message` IPC handler in main.ts (SQL del by id)
5. Added `deleteTerminalMessage` bridge in preload.ts
6. Added type declarations in App.tsx for `deleteTerminalMessage`, `getPromptHistory`, `getPromptStatus`, `aiTask*`
7. Added Prompt History section in Settings > General with preset limit buttons (3/5/10/20/50/100) + custom number input
8. Preference saves immediately via `setPreference` on change

**Files Modified:**
- `src/components/PromptHistoryTab.tsx` — Rewritten with limit/delete/show-older
- `src/pages/SettingsPage.tsx` — Added Prompt History section in General tab
- `src/main.ts` — Added `delete-terminal-message` IPC handler
- `src/preload.ts` — Added `deleteTerminalMessage` bridge
- `src/App.tsx` — Added type declarations

**Why:** User wanted the prompt history list to be manageable — only show recent chats, hide or delete older ones, with an adjustable setting.

**Result:** Prompt History tab now shows a configurable number of recent prompts with per-entry delete. Older prompts can be expanded via "Show X older" button. Settings > General has a Prompt History section with preset and custom limit options.

**Build:** ✅ Renderer build passes cleanly.

---

### 2026-05-17 — Sleep Detail Floating Range Chart (Part 2)

**What Changed:**
1. Removed the sleep sessions table entirely (ugly, redundant with InsightsPage)
2. Removed duration bar chart (replaced with floating range bars spanning bedtime→wake time)
3. New chart: each night is a floating bar from bedtime (below midnight) to wake time (above midnight) — bars cross the `12a` center line as a natural two-way visualization
4. Midnight axis (`y=0`) drawn as a thicker `#52525b` line for visual anchor
5. Y-axis labels show readable times (4p, 6p, 8p, 10p, 12a, 2a, 4a, 6a, 8a, 10a, 12p)
6. Tooltip shows Bedtime, Wake time, and Duration in proper `h:mm` format
7. Added "Time before device" badge above the chart (avg latency to fall asleep)
8. Added "Extra time after device" badge below the chart (avg wake latency)
9. Removed all custom purple/gradient styling — uses standard `glass` class now
10. Removed decorative orbs and amber accent styling
11. Stripped down to minimal header (Moon icon + "Sleep" + nights/duration subtitle)

**Files Modified:**
- `src/pages/ExternalPage.tsx` — Sleep detail section rewritten

**Why:** Sleep sessions table was ugly and redundant (InsightsPage already shows sleep duration). Purple background didn't fit the app's theme. User wanted a chart showing "when start sleeping until waking up" as a two-way visualization with latency metrics above/below.

**Result:** Clean `glass` card with a floating range chart — each bar shows the exact sleep window from bedtime to wake time crossing the midnight axis. Latency badges sit above/below the chart. Minimal, informative, fits app styling.

**Build:** ✅ Both renderer and electron compile cleanly.

---

### 2026-05-17 — Sleep Detail Night-Sky Redesign (ExternalPage)

**What Changed:**
1. Replaced generic `glass` sleep detail section with a custom night-sky/lunar aesthetic card (`#0f0d2e` → `#1a1440` gradient, amber/indigo accents)
2. Added decorative radial gradient orbs (amber + purple) for atmospheric depth
3. Replaced Moon icon with `Moon` lucide icon + glowing icon container
4. Redesigned stat cards: asymmetric hover glow, per-metric accent colors (purple/gold/blue/pink)
5. Changed sleep chart color palette: green→gold (`#22c55e` → `#f59e0b`), amber→deeper amber, red→rose (`#ef4444` → `#e11d48`)
6. Replaced `text-zinc-400` avg latency with `avgWake` stat (pink accent)
7. Chart tooltip now uses night-sky theme (`#0f0d2e` bg, amber border, gold title)
8. Replaced plain `Bar` chart with `motion.div` wrapper for fade-in animation
9. Replaced plain table rows with `motion.tr` for staggered entry animation
10. Table now shows weekday prefix + uses blue bedtime / pink waketime colors
11. Added `motion` imports (framer-motion) and `Moon` import (lucide-react)

**Files Modified:**
- `src/pages/ExternalPage.tsx` — Sleep detail section complete redesign

**Why:** User called sleep detail "ugly" — needed a distinctive visual identity. The night-sky lunar aesthetic differentiates sleep from all other data sections.

**Result:** Sleep detail now has a rich night-sky gradient background with warm moonlight accents, staggered entry animations, per-metric accent colors, styled charts with glow effects, and cleaner table with colored bedtime/wake cells.

**Build:** ✅ Both renderer and electron compile cleanly.

---

### 2026-05-17 — Phase 1: Agent Readiness Protocol (Terminal Overhaul)

**What Changed:**
1. Added `spawn-terminal` IPC handler in main.ts (was missing — handler didn't exist despite preload.ts calling it)
2. Added AGENT_SIGNATURES for opencode/claude/aider/codex/generic agent detection
3. Added `agent:ready`/`agent:timeout` IPC events and `retry-agent-init` handler
4. Added agent status state machine (spawning → waiting → ready | timeout) with cyan/amber overlays in TerminalPane
5. Added message queue for instruction panel messages sent before agent is ready
6. Fixed queue flush ordering: now flushes AFTER system prompt (not before)
7. Changed instruction panel sends from `\n` to `\r\n` to match what PTY expects
8. Fixed all 3 terminal creation flows (split, "+" button, handleTerminalReady) to pass agentType
9. Fixed `handleTerminalCreated` to extract agent from event detail
10. Fixed `onRetryInit` to use terminal's agent type instead of hardcoded 'opencode'
11. Fixed `create-terminal` dispatch at line 1367 to include agent in detail
12. Fixed `handleTabSelect`/`handleActiveTerminalChange` ReferenceErrors (undefined functions from prior refactoring)
13. Updated `queueOrSend` to flush stale queue when agent becomes ready (handles manual-launch edge case)

**Files Modified:**
- `src/main.ts` — Added `spawn-terminal` handler with agent readiness detection
- `src/preload.ts` — Added `onAgentReady`, `onAgentTimeout`, `retryAgentInit` bridges
- `src/pages/TerminalPage.tsx` — Agent status state, message queue, flush ordering, `\r\n` fix, undefined function fixes
- `src/components/TerminalWindow.tsx` — Agent status props/overlays, agentType in all creation paths
- `agent/state.md` — This entry
- `agent/data.md` — Added terminal IPC endpoints and events
- `graphify-out/` — Rebuilt and synced to vault

**Why:** Terminal initialization had a race condition — instruction panel messages were sent to the PTY before the AI agent was ready, or before the system prompt was written. The `spawn-terminal` handler didn't exist in main.ts despite being called from preload. Several functions from prior refactoring were left undefined.

**Result:** AI agent now receives system prompt first, then queued user messages. Manual xterm typing still works independently. All terminal creation flows pass agentType correctly. No more "just creating a new line" behavior.

**Build:** ✅ Both renderer and electron compile cleanly.

**Graphify:** Rebuilt (AST-only), validated, synced to Obsidian vault.

---

**Fix: Browser Extension Background Tab Phantom Tracking**
- ✅ **FIXED:** `logPreviousSession()` now guards against background tab events — skips sending data when browser isn't focused
- ✅ `logPreviousSession(force = false)` — `force=true` only used by `onFocusChanged` for legitimate final flush on focus loss
- ✅ Added `is_browser_focused` to `logPreviousSession()` payload for server-side defense-in-depth
- ✅ `periodicSync()` was already correctly guarded (no changes needed there)
- Files: `browser-extension/background.js`
- Build: ✅ No build needed (JS only, no TypeScript)

**Initialize System Implementation**
- ✅ **FIXED:** `initializeTerminal` no longer has 2-second arbitrary delay — waits for `terminal:ready` event first, then writes prompts
- ✅ **FIXED:** All tab creation now uses `insertIntoLayout()` instead of overwriting layout with a single leaf node (preserves existing terminal panes)
- ✅ **FIXED:** Header "Open Terminal" button now sets layout via `insertIntoLayout` (previously set no layout)
- ✅ **FIXED:** `create-terminal-for-problem` handler uses `insertIntoLayout` instead of overwrite
- ✅ **FIXED:** `NewSessionDialog` onCreate uses `insertIntoLayout` instead of overwrite
- ✅ **FIXED:** `handleResumeSession` now sets layout via `insertIntoLayout` (previously set no layout)
- ✅ **FIXED:** `handleSplit` in `TerminalWindow.tsx` removed 2-second setTimeout before dispatching `terminal-created`
- ✅ **ADDED:** "Initialize" button in terminal header bar — opens `NewSessionDialog` in initialize mode
- ✅ **ADDED:** `NewSessionDialog` now has `mode` prop ('create' | 'initialize') — in initialize mode reads `agents.md`, lists agent files, shows base system prompt
- ✅ **ADDED:** Agent file picker in `InstructionPanel` — lists `agent/` dir files via `listAgentDirFiles`, includes selected file content in composed prompt
- ✅ **FIXED:** Session resume now loads saved session config (`loadSessionConfig`) and passes init content/system prompt to `initializeTerminal`
- ✅ **FIXED:** TypeScript errors in `main.ts` `save-base-system-prompt` and `get-base-system-prompt` handlers (used `loadPreferences()` which returns void)
- Files: `src/pages/TerminalPage.tsx`, `src/components/TerminalWindow.tsx`, `src/components/NewSessionDialog.tsx`, `src/components/InstructionPanel.tsx`, `src/main.ts`
- Build: ✅ Passes
- ✅ **FIXED:** Added `initializingTerminals` ref to prevent duplicate `initializeTerminal` calls
- ✅ **FIXED:** Wrapped `initializeTerminal` in try-catch with console logging for visibility
- ✅ **FIXED:** New Session dialog now directly calls `await initializeTerminal()` after dispatching `create-terminal` + 2s wait (bypasses fragile event chain)
- ✅ **FIXED:** "Open Terminal" button now also calls `initializeTerminal()` directly
- ✅ **FIXED:** `handleTerminalCreated` now properly `await`s `initializeTerminal()` instead of fire-and-forget
- ✅ `initializeTerminal` is now idempotent — guarded by `initializingTerminals` ref
- Files: `src/pages/TerminalPage.tsx`
- Build: ✅ Passes

**Initialize.md Restructured as Checklist**
- ✅ **REWRITTEN:** `agent/Initialize.md` changed from static template to dynamic initialization checklist
- ✅ Each item now follows: check existence → check content → skip/update/create
- ✅ Mapping table expanded to include all agent directory files
- ✅ Added agent-reflect log: `2026-05-13_idiot_trigger.md` (wrong file confusion)
- ✅ Added file search pattern to `agent/debugging.md`
- Files: `agent/Initialize.md`, `agent/debugging.md`
- Build: ✅ Passes

## Recent Changes Summary

**System Prompt Overhaul + NewSessionDialog Cleanup**
- ✅ **ADDED:** `DEFAULT_SYSTEM_PROMPT` constant in `src/lib/defaults.ts` — hardcoded fixed default prompt always prepended
- ✅ **CHANGED:** Settings page system prompts now show the default prompt (collapsible preview) + "General Additions" textarea per agent (stored in prefs as before)
- ✅ **ADDED:** Project-specific prompt in workspace Configs tab — per-project additions stored in `prefs.projectPrompts[projectId]`
- ✅ **CHANGED:** `initializeTerminal` now merges 4 levels: default + general additions + project additions + optional session additions
- ✅ **ADDED:** Merged prompt preview in NewSessionDialog showing all 4 levels with collapsible sections
- ✅ **REMOVED:** Related Problems/Requests selector from NewSessionDialog (cleanup)
- ✅ **REMOVED:** `baseSystemPrompt` loading from NewSessionDialog (replaced by merge preview)
- ✅ Build: ✅ Passes
- Files: `src/lib/defaults.ts` (new), `src/pages/SettingsPage.tsx`, `src/pages/TerminalPage.tsx`, `src/components/NewSessionDialog.tsx`

**PromptHistoryTab — Sidebar Prompt History Viewer**
- ✅ **ADDED:** `get-prompt-history` IPC handler in `src/main.ts` — queries `terminal_messages` (role='user') with LEFT JOINs to `terminal_sessions` and `terminal_bindings` for full session/terminal/problem context
- ✅ **ADDED:** `getPromptHistory` method in `src/preload.ts` — exposes the IPC to renderer
- ✅ **ADDED:** `PromptHistoryTab` component (`src/components/PromptHistoryTab.tsx`) — sidebar tab showing all prompts sent to AI with:
  - Search/filter by text, session, problem, agent
  - Agent filter dropdown
  - Expandable cards showing full prompt + all metadata
  - Session topic, agent badge, timestamps, category tags
  - Linked problem/request IDs highlighted
  - Relative timestamps ("3m ago", "2d ago")
- ✅ **CHANGED:** TerminalPage sidebar — added `history` tab button (MessageSquare icon) with rendering block
- ✅ **CHANGED:** Updated `activeTab` union type to include `'history'`
- ✅ Build: ✅ Passes
- Files: `src/components/PromptHistoryTab.tsx` (new), `src/main.ts`, `src/preload.ts`, `src/pages/TerminalPage.tsx`

**PromptDesignDialog + generate-prompt skill wiring + write-project-file IPC**
- ✅ **ADDED:** `PromptDesignDialog` component (`src/components/PromptDesignDialog.tsx`) — modal dialog for the generate-prompt skill workflow
- ✅ **ADDED:** Dialog displays the design brief (`prompt.md`) in a read-only textarea with copy button
- ✅ **ADDED:** Dialog has a RESULT.md textarea for pasting AI output with Save button (writes to agent/docs/.../result.md)
- ✅ **ADDED:** `write-project-file` IPC handler in `src/main.ts` — writes arbitrary files relative to project root
- ✅ **ADDED:** `writeProjectFile` method in `src/preload.ts` — exposes the IPC to renderer
- ✅ **CHANGED:** SkillsTab `onUseSkill` routes `generate-prompt` skill to PromptDesignDialog instead of InstructionPanel
- ✅ **UPDATED:** `DEFAULT_SYSTEM_PROMPT` in `src/lib/defaults.ts` — replaced with comprehensive 280-line version from RESULT.md (covers: environment, sessions, problems/requests/checklists, skills, graphify, LLM wiki, data storage, activity logging, presets/workspaces, build rules, UI conventions, workflow)
- ✅ Build: ✅ Passes
- Files: `src/components/PromptDesignDialog.tsx` (new), `src/main.ts`, `src/preload.ts`, `src/pages/TerminalPage.tsx`, `src/lib/defaults.ts`

**InstructionPanel + TerminalMiniMap + ProblemsService description/root_cause fields**
- ✅ **ADDED:** `InstructionPanel` component (`src/components/InstructionPanel.tsx`) — full instruction composer with problem/request checkboxes, skill dropdown, prompt preview, and send
- ✅ **ADDED:** `TerminalMiniMap` component (`src/components/TerminalMiniMap.tsx`) — draggable mini-map for terminal layout in sidebar
- ✅ **ADDED:** `description` and `root_cause` fields to `Problem` interface in `ProblemsService.ts`
- ✅ **ADDED:** Request loading at TerminalPage level for InstructionPanel consumption
- ✅ **MODIFIED:** TerminalPage "Send" button split into "Compose" (full panel) and "Quick" (compact input)
- ✅ Build: ✅ Passes
- Files: `src/components/InstructionPanel.tsx`, `src/components/TerminalMiniMap.tsx`, `src/services/ProblemsService.ts`, `src/pages/TerminalPage.tsx`

**Data Layer Consolidation — Problems/Requests JSON-only (Prompt 4)**
- ✅ **FIXED:** `delete-problem` now deletes from `problems.json`/`PROBLEMS.md` via ProblemsService (was DB-only, problems reappeared on reload)
- ✅ **FIXED:** `link-problem-to-request` now uses RequestsService — updates `requests.json` (was DB-only, links lost on reload)
- ✅ **FIXED:** `assign-problem-to-terminal` now reads from ProblemsService JSON (was reading from DB, could miss problems)
- ✅ **REMOVED:** All secondary DB writes from problem/request IPC handlers (create/update/delete — JSON is sole source of truth)
- ✅ **FIXED:** `tracker-mind-setup init-json-export` no longer overwrites JSON from empty DB — uses ProblemsService/RequestsService which migrates from MD
- ✅ **FIXED:** `tracker-mind-setup init-problems-md` / `init-requests-md` use Services instead of DB for initial content
- ✅ **IMPLEMENTED:** `sync-problems-md` IPC handler — regenerates PROBLEMS.md from JSON via ProblemsService (was exposed in preload but had no handler)
- ✅ **CLEANED:** Preload signatures for `deleteProblem`, `deleteRequest`, `getRequests` updated to pass object params
- ✅ Build: ✅ Passes
- Files: `src/main.ts`, `src/preload.ts`

**Recursive Split Pane Rendering + Problems/Requests MD→JSON Migration Fix**
- ✅ **FIXED:** TerminalLayout now recursively interprets PaneNode tree — split nodes render as flex side-by-side/top-bottom with draggable SplitHandle (was z-index stacking, only active terminal visible)
- ✅ **FIXED:** `getProblems()` triggers MD→JSON migration when `problems.json` is empty array `[]` but `PROBLEMS.md` has content (was returning `[]` silently, never parsing markdown)
- ✅ **FIXED:** `getRequests()` same fix — empty JSON now checks MD for content before returning empty
- ✅ **FIXED:** Legacy markdown parsers now normalize `\r\n` → `\n` before regex matching (Windows CRLF was breaking regex, 0 matches)
- ✅ **FIXED:** TDZ error in `TerminalPage.tsx` — moved `loadSessions` above `handleInstructionPanelSend` (referenced in deps array before declaration)
- ✅ **FIXED:** Favicon in `index.html` — changed from Vite default (`vite.svg`) to app icon (`deskflow-icon.png`)
- ✅ **CLEANED:** Removed unused `terminalIds` prop from `TerminalLayoutProps` and `TerminalLayout` component
- ✅ Build: ✅ Passes
- Files: `src/components/TerminalWindow.tsx`, `src/services/ProblemsService.ts`, `src/services/RequestsService.ts`, `src/pages/TerminalPage.tsx`, `index.html`

**Save Button Dialog + Error Toast + Terminal Split + PROBLEMS.md/REQUESTS.md DB + Init**
- ✅ **FIXED:** Save button now opens a modal dialog asking for workspace name (replaces broken `window.prompt()`)
- ✅ **FIXED:** `terminalError` toast bar now renders above terminal layout (was invisible)
- ✅ **FIXED:** `closeTerminal` preserves split layout — uses `removePane` for ALL terminals (not just non-active ones)
- ✅ **FIXED:** MapEditor changes now persist to DB via `handleLayoutChange` (was using raw `setTerminalLayout`)
- ✅ **FIXED:** MapEditor drag-to-split now works — quadrant detection (top/bottom 25% = horizontal split, left/right 25% = vertical split, center = swap)
- ✅ **ADDED:** `workspace_problems` and `workspace_requests` DB tables with auto-increment IDs
- ✅ **ADDED:** DB-backed IPC handlers `get-problems`, `create-problem`, `update-problem-status`, `delete-problem`, `get-requests`, `create-request`, `update-request-status`, `delete-request`, `link-problem-to-request`
- ✅ **ADDED:** `tracker-mind-setup` now creates:
  - `AGENTS.md` — auto-generated with file list from agent/ directory (created/updated each init)
  - `INITIALIZE.md` — agent-specific init guide (opencode vs claude)
  - `problems.json`, `requests.json`, `terminal-sessions.json` — machine-parseable JSON exports
  - Updated `PROBLEMS.md`/`REQUESTS.md` with DB data
  - `state.md` with agent name
- ✅ **ADDED:** Agent name passed through init flow — uses `terminal-defaultAgent` from localStorage
- Files: `src/main.ts`, `src/preload.ts`, `src/pages/TerminalPage.tsx`, `src/components/TerminalWindow.tsx`, `src/components/MapEditor.tsx`
- Build: ✅ Passes

**Terminal Session Fixes (Resume, Save, Display, Column Mismatch)**
- ✅ **FIXED:** `save-terminal-session` no longer resets `created_at` — uses UPDATE for existing rows instead of INSERT OR REPLACE (main.ts)
- ✅ **FIXED:** `handleSaveCheckpoint` now updates the existing session (uses `session.id`) instead of creating a new `checkpoint-*` entry (TerminalPage.tsx)
- ✅ **FIXED:** Session display column mismatch: `started_at` → `created_at`, `total_cost_usd` → `total_cost` (DB returns snake_case)
- ✅ **FIXED:** `session.resume_id` and `session.id` now displayed in session list
- ✅ **FIXED:** `handleResumeSession` now passes `resumeId` to `initializeTerminal` so the resume command is sent as part of agent launch (`--resume` flag), not as a separate delayed write that arrives before the agent starts
- ✅ **FIXED:** "Open" button for closed sessions always creates a new terminal instead of reusing existing ones (eliminates phantom "S" badge on wrong tabs)
- Build: ✅ Passes

**ProblemsTab Markdown Round-Trip Fix + Setup Button Moved to Header**
- ✅ **FIXED:** `generateMarkdown()` now outputs `### Issue #XXX:` format (Pattern 4) instead of `## **Issue XX.Y:**` format — parse/generate cycle is now idempotent
  - Updated Pattern 4 regex to handle dotted IDs like `#96.1`
  - Updated initial PROBLEMS.md creation format to match
  - Build: ✅ Passes
- ✅ **MOVED:** Setup/Initialize button from FilesTab to TerminalPage header (next to Open Terminal / Send / Save)
  - Now always accessible regardless of which sidebar tab is active
  - Uses its own `initStatus` state + `handleInitSetup` callback at TerminalPage level
  - FilesTab keeps read-only status indicator; auto-refreshes after setup via 10s poll
  - Build: ✅ Passes

**Terminal Startup CRITICAL FIX: Terminal Data Not Displaying**
- ✅ **FIXED:** Terminal IPC callback signature mismatch in preload.ts
  - `onTerminalData` was wrapping callback args into object: `{ terminalId, data }`
  - But TerminalPane.tsx expected two separate args: `(terminalId, data)`
  - Result: Terminal data was never displayed (stuck on "Starting shell...")
  - Fix: Changed preload to pass two args instead of object (lines 183-192)
  - Build: ✅ Passes

**Terminal Workspace Phases 1-6 COMPLETE & VERIFIED**
- ✅ Phase 3: Fixed ProblemsTab parser for `### Issue #XXX:` format
- ✅ Phase 4: Fixed preset execution (now writes command to active terminal)
- ✅ Phase 5: Sessions working (create, resume, delete, agent selection)
- ✅ Phase 6: Built interactive map tab with drag-to-rearrange and drag-to-split
- ✅ **VERIFICATION COMPLETE (2026-05-12):** Build passes, all ~20 terminal features implemented

---

### 2026-05-16 — Activity Log + AI-Driven Actions + Skill Integration

**What Changed:**
1. ✅ **Removed Setup button** — Zap icon button removed (redundant with Initialize). Single init flow via Initialize button.
2. ✅ **Enter sends, Shift+Enter newline** — Composed `onKeyDown` restructured: Enter (no shift) checks mention dropdown first, then sends; Shift+Enter inserts newline. `e.preventDefault()` always called.
3. ✅ **Sidebar map split** — MiniMap (top) and Running Terminals+Sessions (bottom) separated by a draggable vertical split handle. Ratio persisted to `localStorage`.
4. ✅ **Session Open dropdown** — Sessions without active terminal now show an "Open" dropdown with "Open in new terminal" and "Open in existing terminal..." options. The latter opens a terminal picker dialog.
5. ✅ **Edit session dialog** — Modal dialog for editing session topic, agent, category, description, and product area. Uses `updateSessionCategory` + `saveTerminalSession` IPC.
6. ✅ **Save/Load workspace** — New "Configs" sidebar tab with Layers icon. "Save Current" captures layouts + terminal tabs + session bindings and stores as JSON in `terminal_layouts` DB table. "Load" restores everything (spawns terminals, restores layout, resumes sessions).
7. ✅ **Session resume with resume_id** — Sessions with `resume_id` show a green "Resume" button when their terminal is alive (directly resumes). When terminal is dead, dropdown shows "Resume in new terminal" / "Resume in existing terminal..." options.
8. ✅ **Agent switching** — Edit dialog now includes agent selector dropdown (populated from presets). Agents persist via `saveTerminalSession` IPC.
9. ✅ **Build** — Vite + tsc both pass cleanly.

**Files Modified:**
- `src/pages/TerminalPage.tsx` — All 9 items

**Build:** ✅ Passes

---

### 2026-05-17 — Timeline Navigation + Sleep Detail View

**What Changed:**
1. ✅ **ProductivityPage timeline navigation** — Added `dateOffset` state with ChevronLeft/ChevronRight buttons in the header. `dailyTrend` useMemo now uses offset to shift the date range. App.tsx now passes `allLogs` instead of filtered `logs` to ProductivityPage so client-side date range filtering works. When `selectedPeriod` changes, offset resets to 0.
2. ✅ **ExternalPage trend chart timeline navigation** — Added `dateOffset` state with chevron navigation in the Usage Trend chart header. Changed `allSessions` fetch from `selectedPeriod`-scoped to `'all'` period so client-side offset filtering supports going back in time. `trendChartData` uses `selectedPeriod` + `dateOffset` to filter bars.
3. ✅ **Sleep Detail table** — New glass-styled section below the charts showing daily sleep entries with date, duration (color-coded: red <7h, emerald >9h), and deficit column. Shows average sleep hours and total deficit in the header.

**Files Modified:**
- `src/App.tsx` (line ~2377) — ProductivityPage route now passes `allLogs` instead of `logs`
- `src/pages/ProductivityPage.tsx` — Added `dateOffset` state, `getViewLabel`, ChevronLeft/ChevronRight header nav, offset-aware `dailyTrend` filtering
- `src/pages/ExternalPage.tsx` — Added `dateOffset` state, `getViewLabel`, chevron nav in trend chart header; `allSessions` fetch changed to `'all'`; `trendChartData` uses offset; Sleep Detail table section added

**Why:** Users needed to navigate backward in time on Productivity and External pages to review historical data. Sleep data was being fetched but never displayed in a detail view.

**Result:** Users can now browse previous days/weeks/months on ProductivityPage and ExternalPage trend charts. Sleep data is visible in a detailed table with duration and deficit tracking.

**Build:** ✅ Passes

---

### 2026-05-12 — CRITICAL FIX: Terminal Data Not Displaying (Stuck on "Starting shell...")

**What Changed:**
1. ✅ **Fixed terminal IPC callback signature mismatch** in preload.ts
   - Issue: `onTerminalData` callback was wrapping args into object: `{ terminalId, data }`
   - But TerminalPane.tsx expected two separate args: `(terminalId, data)`
   - Result: PTY data was never written to terminal (stuck on "Starting shell...")
   - Fix: Changed `onTerminalData` and `onTerminalExit` to pass separate args instead of objects

**Files Modified:**
- `src/preload.ts` (lines 183-192) — Changed callback signatures to match TerminalWindow expectations

**Why:** When main.ts sent `terminal:data` IPC with `(terminalId, data)` args, the preload wrapper was converting them to an object for the callback. But TerminalPane's callback expected `(terminalId, data)` separately. Mismatch caused terminal to display only the "Starting shell..." message, never the actual PTY output.

**Result:** Terminal now displays PTY output correctly. Terminals should start properly and show shell prompt/output.

**Build:** ✅ Passes

---

### 2026-05-13 — BrowserActivityPage Chart Now Follows Period Selection

**What Changed:**
1. ✅ Fixed `hourlyDistribution` to produce period-appropriate data instead of always 24 hours
   - **today**: Shows 24 hourly bars (same as before)
   - **week**: Shows 7 daily bars aggregated by date (was always 24 hourly buckets)
   - **month**: Shows 30 daily bars aggregated by date (was always 24 hourly buckets)
   - **all**: Shows 90 daily bars aggregated by date (was always 24 hourly buckets)
   - Uses `Map<string, number>` to aggregate durations by day for week/month/all

2. ✅ Updated all chart data (bar + line) to use period-aware labels and data
   - Labels now show hour (`00:00`) for today, weekday short names for week, month+day for month/all
   - Current-hour highlight only applies to 'today' view

3. ✅ Updated chart options
   - `maxTicksLimit` adjusts per period (12 for today, 7 for week, 15 for month/all)
   - Smaller pointRadius for daily views (less visual clutter)

**Files Modified:**
- `src/pages/BrowserActivityPage.tsx` - Fixed hourlyDistribution, chart data, chart options
- `src/pages/ExternalPage.tsx` - Also fixed viewing activity chart period awareness

**Why:** The hourly distribution chart always created 24 hour buckets regardless of selected period, so switching to weekly/monthly still showed 24-hour format.

**Result:** BrowserActivityPage chart now shows proper time-based bars matching the selected period — 24 hourly bars for today, 7 daily bars for week, 30 daily bars for month, 90 daily bars for all time.

**Build:** ✅ OK

### 2026-05-13 — Timeline Navigation + Browser Stats Fixes

**What Changed:**
1. ✅ Fixed "browser" app entry showing in Applications stats (StatsPage)
   - Added validation in `addLog` to skip browser entries without valid domains
   - Enhanced SQL WHERE clause in `getStats` to exclude generic browser names
   - Added client-side filter in JSON fallback path

2. ✅ Added forward/backward timeline navigation to StatsPage (/stats)
   - Added `dateOffset` state with left/right arrow buttons in header
   - Added `getViewLabel()` for dynamic period display (e.g., "Wed, May 13", "Week of May 10")
   - Added `filteredLogs` computed from `logs` + `selectedPeriod` + `dateOffset`
   - Updated all stats computations (`sortedApps`, `totals`, `categoryBreakdown`, `dailyUsage`, `hourlyDistribution`, `selectedAppData`) to use `filteredLogs`
   - Navigation resets when `selectedPeriod` changes

3. ✅ Added forward/backward timeline navigation to BrowserActivityPage (/browser)
   - Added `dateOffset` state and arrow buttons in header
   - Modified 3 backend functions (`getBrowserLogs`, `getBrowserDomainStats`, `getBrowserCategoryStats`) to accept `dateOffset` parameter and compute start/end dates
   - Updated IPC handlers and preload signatures to pass `dateOffset`
   - `fetchData` now re-fetches when `dateOffset` changes

**Files Modified:**
- `src/main.ts` — `addLog` skip browser w/o domain; `getStats` SQL filter; browser functions accept `dateOffset`; IPC handlers pass `dateOffset`
- `src/preload.ts` — Browser IPC signatures include `dateOffset`
- `src/pages/StatsPage.tsx` — Navigation arrows, `dateOffset`, `filteredLogs`, all memos use filtered data
- `src/pages/BrowserActivityPage.tsx` — Navigation arrows, `dateOffset`, `fetchData` passes offset

**Result:** Users can navigate backward/forward through days/weeks/months on both Apps and Browser pages. "browser" no longer shows as an app in stats.

### 2026-05-12 — Phase 6: Built Interactive Map Tab Layout Editor with Drag-to-Split

**What Changed:**
1. ✅ Created new `MapEditor.tsx` component with `@dnd-kit` drag-and-drop integration
2. ✅ Map tab now supports drag-to-rearrange panes (swaps terminalIds in layout tree)
3. ✅ Map tab now supports drag-to-split (creates split nodes when dropping on target)
4. ✅ Visual feedback: highlighted drop targets, drag overlay, hover tooltips
5. ✅ Layout updates persist to database via `onLayoutChange` callback

**Files Modified:**
- `src/components/MapEditor.tsx` (NEW) — Interactive map component with DnD
- `src/pages/TerminalPage.tsx` — Integrated MapEditor into map tab (line 1185+)

**How It Works:**
- Map tab flattens PaneNode tree into draggable panes
- `@dnd-kit` handles drag start/over/end events
- On drop: `swapLeavesInTree()` swaps terminalIds OR `createSplitFromDrag()` creates splits
- New layout passed to parent via `onLayoutChange()` → saved to DB

**Result:** Map tab is now an interactive layout editor. Drag panes to rearrange or split them.

---

### 2026-05-12 — Phase 4: Fixed Preset Execution + Phases 3-5 Complete

**What Changed (Phase 4):**
1. ✅ Fixed `handleExecutePreset()` to capture returned `command` and write to terminal
2. ✅ Presets now actually execute (write command to active terminal via `terminalWrite`)
3. ✅ Verified send instructions and save checkpoint already working

**What Changed (Phase 3):**
1. ✅ Added Pattern 4 to `ProblemsService.parseProblems()` for `### Issue #XXX:` format
2. ✅ ProblemsTab now loads all issues correctly

**What Changed (Phase 5):**
1. ✅ Verified sessions fully working (all IPC/preload/UI wired end-to-end)
2. ✅ Minor non-blocking issues found (missing type declarations, redundant IPC call)

**Files Modified:**
- `src/services/ProblemsService.ts` — Added Pattern 4 parser (line 206-251)
- `src/pages/TerminalPage.tsx` — Fixed `handleExecutePreset()` to write command (line 545-552)

---

- [Problems](PROBLEMS.md) — Active issues
- [Requests](REQUESTS.md) — Feature requests
- [Debugging](debugging.md) — Error patterns
- [Data](data.md) — Schemas and IPC
- [Feature Tracker](FEATURE_TRACKER.md) — Complete page/feature inventory
- [README](../README.md) — Project documentation

---

### 2026-05-12 — Fixed ProblemsTab Parser for `### Issue #XXX:` Format

**What Changed:**
1. ✅ Added Pattern 4 to `ProblemsService.parseProblems()` to match `### Issue #094: Title` format
2. ✅ Now correctly extracts Status, Files, User said (notes), and Fix fields from SESSION sections

**Files Modified:**
- `src/services/ProblemsService.ts` — Added Pattern 4 parser regex

**Why:** Existing parsers only matched `## **Issue XX.Y:**` and `**Issue XX:**` formats, but actual PROBLEMS.md uses `### Issue #XXX: Title` under `## 🚨 SESSION` headings. ProblemsTab was returning empty because no parser matched the real file format.

**Result:** ProblemsTab now loads all issues from PROBLEMS.md correctly.

---

### 2026-05-12 — Terminal Workspace Bug Fixes (6 Critical Bugs Fixed)

**What Changed:**
1. ✅ **Bug 1 - Double Spawn Fixed** (`TerminalWindow.tsx`) — `create-terminal` event handler now adds terminalId to `spawnedTerminalsRef.current` BEFORE calling `await spawnTerminal()`. Prevents `handleTerminalReady` from spawning a duplicate PTY when TerminalPane mounts.
2. ✅ **Bug 2 - Single Layout Source of Truth** (`TerminalPage.tsx`, `TerminalWindow.tsx`) — Removed `useTerminalLayout` from TerminalPage. TerminalLayout is now a controlled component receiving `layout` and `activeTerminalId` as props. Layout persistence via direct `getTerminalLayouts`/`saveTerminalLayout` calls. PaneNode type simplified (removed legacy `id`/`size` fields, added `splitRatio`).
3. ✅ **Bug 3 - AI Agent Auto-Start** (`TerminalPage.tsx`) — Added `initializeTerminal(terminalId, agent, resumeId?)` function that: (1) sends system prompt from preferences, (2) sends INITIALIZE.md from project root, (3) launches AI agent (`claude\n` or `opencode\n`). Called from `handleTerminalCreated` event handler.
4. ✅ **Bug 4 - Open Terminal Button Fixed** (`TerminalPage.tsx`) — Replaced direct layout manipulation with `dispatchEvent(new CustomEvent('create-terminal', ...))`. Now properly triggers full initialization flow (spawn → terminal-created → system prompt → INITIALIZE.md → agent launch).
5. ✅ **Bug 5 - Layout Persistence Re-Spawn** (`TerminalPage.tsx`, `main.ts`) — Layout loads from DB on mount. `terminal:ready` IPC event added to both `terminal:create` and `spawn-terminal` handlers. Renderer listens for ready event to flush input buffer.
6. ✅ **Bug 6 - Keyboard Input Buffer** (`TerminalWindow.tsx`) — `TerminalPane` uses module-level `inputBuffers` Map and `terminalReadyStates` Map. Keystrokes before PTY ready are buffered and flushed when `terminal:ready` event fires. Also listens via `window.deskflowAPI.onTerminalReady`.
7. ✅ **TerminalManager sends terminal:ready** (`main.ts`) — Both `terminal:create` and `spawn-terminal` handlers now send `terminal:ready` IPC event after successful spawn.
8. ✅ **Consolidated preload API** (`preload.ts`) — Added `terminalWrite`, `terminalResize`, `terminalDestroy`, `onTerminalReady` alongside existing APIs.
9. ✅ **Split handle drag resize** — `SplitHandle` component now implements actual mouse drag to adjust `splitRatio` between adjacent panes.
10. ✅ **TerminalPane hover controls** — Split/Close buttons appear on hover, same as original but using the new simplified layout structure.

**Files Modified:**
- `src/components/TerminalWindow.tsx` — Complete rewrite: controlled component, input buffering, drag resize, hover controls, helper functions
- `src/pages/TerminalPage.tsx` — Removed `useTerminalLayout`, added layout state + persistence + `initializeTerminal`, fixed Open Terminal button, updated event handlers
- `src/main.ts` — Added `terminal:ready` to both spawn handlers, consolidated API handlers (`terminal:write-old-format`, `terminal:resize-old-format`, `terminal:destroy-old-format`)
- `src/preload.ts` — Added `terminalWrite`, `terminalResize`, `terminalDestroy`, `onTerminalReady` APIs

**Build:** ✅ (Vite + electron tsc clean)

**Remaining:** `useTerminalLayout.ts` hook is now unused but preserved for reference. Can be cleaned up in a future pass.

### 2026-05-12 — Tracking Reliability Phase 6: Fix Browser Log `id` Mismatch

**What Changed:**
1. ✅ **Fixed `id` mismatch in `handleBrowserData()`** — New browser entries created with `entry.id = Date.now()`, but SQLite INSERT omits `id` (uses AUTOINCREMENT). Subsequent UPDATEs used `WHERE id = Date.now()` which never matched the actual row. Fix: capture `result.lastInsertRowid` after INSERT and assign to `entry.id`.

**Files Modified:**
- `src/main.ts` — Line 6356: capture `result` from `stmt.run()`, assign `entry.id = result.lastInsertRowid`

**Why:** `id` mismatch caused browser log entries in SQLite to never have their `duration_ms` updated after the initial INSERT. Logs table showed ~5s per domain regardless of actual browsing time (~1.5h).

**Result:** Browser logs table now correctly accumulates duration across periodic syncs.

**Build:** ✅

### 2026-05-12 — Terminal Workspace Critical UX Fixes (FilesTab, + button, Save button)

**What Changed:**
1. ✅ **FilesTab projectPath prop added** — FilesTab now receives `projectPath` directly from TerminalPage's `propProjectPath`. When opened from IDE page workspace modal, the project path is already known and passed directly. FilesTab uses it before falling back to projects array lookup. No more "No project selected" dropdown when coming from IDE page.
2. ✅ **+ button always visible** — Removed `{Object.keys(terminalTabs).length > 0 && (` gate that was hiding the entire tab bar (including + button) when no terminals existed. User can now create the first terminal.
3. ✅ **Save button always visible in header** — Extracted `handleSaveCheckpoint` callback. Added 💾 Save button in terminal header next to Send, always visible when a terminal is active instead of hidden inside the instruction input bar.

**Files Modified:**
- `src/pages/TerminalPage.tsx` — FilesTab `projectPath` prop, tab bar always renders, `handleSaveCheckpoint` callback, Save button in header

**Build:** ✅

### 2026-05-12 — Final Terminal Feature Implementation (Phase 2-8 Complete)

**What Changed:**
1. ✅ **Terminal messages persistence** (main.ts) — PTY output and user input now save to `terminal_messages` DB table. Data handlers in both `terminal:create` and `spawn-terminal` persist output; `write-terminal` persists user input.
2. ✅ **System Prompt customization page** (SettingsPage.tsx) — New "System Prompts" tab in Settings with textareas for claude, opencode, custom agents. Saved via preferences API. Auto-sends on terminal creation.
3. ✅ **INITIALIZE.md auto-load** (TerminalPage.tsx) — On terminal creation, reads INITIALIZE.md from project root and sends to terminal via `readProjectFile` IPC.
4. ✅ **Session resume creates terminal if needed** (TerminalPage.tsx) — `handleResumeSession` now creates a new terminal before sending resume command if no active terminal exists.
5. ✅ **+ button uses default agent** (TerminalPage.tsx) — Reads `terminal-defaultAgent` from localStorage instead of hardcoded 'claude'.
6. ✅ **Open Terminal button uses default agent** (TerminalPage.tsx) — Same fix applied.
7. ✅ **New Session dialog persists default agent** (TerminalPage.tsx) — Selected agent saved to `terminal-defaultAgent` in localStorage.
8. ✅ **Sidebar width persists across restarts** (TerminalPage.tsx) — Loads from `terminal-sidebarWidth` localStorage on init, saves on every change.
9. ✅ **Problem-created terminals get system prompts** (TerminalPage.tsx) — `create-terminal-for-problem` handler now dispatches `terminal-created` so shared initialization runs.
10. ✅ **Missing IPC handlers added** (main.ts) — `read-project-file` and `list-project-files` handlers for reading project files (used by INITIALIZE.md loading).

**Files Modified:**
- `src/main.ts` — Terminal messages persistence, read-project-file + list-project-files IPC handlers
- `src/pages/SettingsPage.tsx` — New System Prompts tab with per-agent prompt editors
- `src/pages/TerminalPage.tsx` — Resume fix, default agent persistence, INITIALIZE.md loading, system prompt sending, sidebar width persistence, problem-created terminal init

**Result:**
- ✅ Build passes (Vite + electron tsc)
- ✅ All terminal features now fully implemented and integrated
- ✅ Terminal messages persisted to DB
- ✅ System prompts customizable and auto-sent
- ✅ Session resume works without active terminal
- ✅ Sidebar width survives restarts
- ✅ INITIALIZE.md loaded on terminal spawn

### 2026-05-12 — Terminal Runtime Bug Fixes (Critical Layout Bug)

**What Changed:**
1. ✅ **Fixed `useTerminalLayout` wrong argument order** (`TerminalWindow.tsx:193`) — Was passing a `PaneNode` object as `projectId` (string param). Object stringified to `"[object Object]"`, DB query returned nothing, layout stayed `null` forever. Terminal panes never rendered. Changed to `useTerminalLayout(null, initialLayout || null)`.
2. ✅ **Fixed null layout in `handleCreateTerminalEvent`** (`TerminalWindow.tsx:329-364`) — When `prev` layout was `null`, `setLayout(prev => prev ? insertIntoLayout(prev) : prev)` returned `null`. Added logic to create root leaf pane when no layout exists.
3. ✅ **Fixed stale closure in event handler effect** (`TerminalPage.tsx:530`) — Missing `terminalLayout`, `setTerminalLayout`, `spawnTerminal`, `loadSessions` from dependency array caused stale references when events fired.
4. ✅ **Added project picker to RequestsTab** — Was missing inline project dropdown when no project selected (like ProblemsTab and FilesTab have). Falls back to `userDataPath` silently without picker.
5. ✅ **Fixed `link-problem-to-request` project path** — IPC handler always used `userDataPath` instead of request's project path. Added `projectId` parameter through preload API.

**Files Modified:**
- `src/components/TerminalWindow.tsx` — Fixed `useTerminalLayout` args, null layout handling
- `src/pages/TerminalPage.tsx` — Added effect deps, RequestsTab project picker + projectId passthrough
- `src/main.ts` — `link-problem-to-request` uses `getProjectPath()`
- `src/preload.ts` — `linkProblemToRequest` accepts `projectId`

**Result:**
- ✅ Build passes (Vite + electron tsc)
- ✅ Terminal + button now actually creates visible terminal panes (layout no longer stuck at null)
- ✅ ProblemsTab, FilesTab, RequestsTab all have inline project pickers when no project selected
- ✅ `link-problem-to-request` writes to correct project's REQUESTS.md

### 2026-05-12 — Tracking Reliability Overhaul (Phases 1-5)

**Root Causes Identified:**
1. **MAX_SESSION_MS = 5 min hard cap** — Any single-app session >5 min was truncated. A 3-hour game → 5 min tracked. Remaining 2h55m silently discarded.
2. **Sleep gap reset (10s threshold) destroyed accumulated time** — Any polling gap >10s reset `sessionStart` to `now` WITHOUT logging the accumulated duration. Time up to the last poll was permanently lost.
3. **Consecutive null polls (3 = 6s) too aggressive** — `active-win` returns null for fullscreen games. After 3 null polls (6s), session abandoned + time lost.
4. **Renderer idle detection used DOM events only** — After 5 min of DeskFlow being backgrounded (no DOM events), renderer paused tracking + started AFK session — even though main process correctly tracked the user's activity.
5. **Browser extension phantom delta** — `lastPeriodicSync` not updated when browser unfocused, causing capped phantom time on refocus.

**What Changed:**
1. ✅ **MAX_SESSION_MS raised** — 5 min → 30 min (`src/main.ts:1974`)
2. ✅ **Periodic checkpointing added** — Every 5 min, long-running sessions are checkpointed (log + reset `sessionStart`) to prevent data loss (`src/main.ts:2210-2221`)
3. ✅ **Sleep gap reset preserves time** — Before clearing session on gap, logs accumulated duration up to last known good poll (`src/main.ts:2155-2171`)
4. ✅ **SLEEP_GAP_MS raised** — 10s → 30s (`src/main.ts:1976`)
5. ✅ **Null poll threshold raised** — 3 → 30, with data preservation before reset (`src/main.ts:2134-2151`)
6. ✅ **BROWSER_MAX_DELTA_MS added** — 10 min separate cap for browser data (`src/main.ts:1977`)
7. ✅ **Renderer idle uses OS-level idle** — `powerMonitor.getSystemIdleTime()` via heartbeat instead of DOM events. Correctly detects idle as "no keyboard/mouse input at OS level" (`src/App.tsx:1336`)
8. ✅ **Auto-resume from idle** — Heartbeat handler auto-resumes tracking when system idle drops below threshold (`src/App.tsx:528-546`)
9. ✅ **Browser extension phantom delta fixed** — `lastPeriodicSync` updated even when browser not focused (`browser-extension/background.js:320-327`)
10. ✅ **Heartbeat includes systemIdleSeconds** — Main process sends OS-level idle time every 5s (`src/main.ts:2354-2365`)

**Files Modified:**
- `src/main.ts` — 8 changes: constants, gap logic, checkpointing, heartbeat, browser caps
- `src/App.tsx` — 3 changes: systemIdleSecondsRef, heartbeat handler with auto-resume, OS-level idle detection
- `browser-extension/background.js` — 1 change: periodicSync updates lastPeriodicSync when unfocused

**Result:**
- ✅ Build passes (electron tsc + vite)
- ✅ Long app sessions (3h gaming) now tracked properly via checkpointing every 5 min
- ✅ No data loss on polling gaps (time preserved before reset)
- ✅ Idle detection = actual user inactivity (OS-level), not DeskFlow window focus
- ✅ Browser extension no longer accumulates phantom deltas on focus regain
- ✅ Tracking auto-recovers when user resumes activity

## 📦 Since Last Commit

### 2026-05-17 — Research: CLI Agent Backend Integration for State Visibility

**What Changed:**
1. ✅ **Created research prompt** at `agent/docs/agent-backend-integration/prompt.md` — comprehensive exploration of how DeskFlow can gain visibility into AI CLI agent internal state (current model, chat export, slash commands, agent status)
2. ✅ **Architecture analysis complete** — Current system launches agents via PTY (types `claude`/`opencode` into shell). Agent state is opaque: the system only knows `spawning | waiting | ready | timeout`. Model selection, chat history, and agent configuration happen inside the PTY and are invisible to DeskFlow.
3. ✅ **Three approaches identified for research:**
   - **Backend reads** — Read agent's own storage (opencode SQLite DB, claude JSONL files) for state
   - **PTY interception** — Parse data stream between agent and terminal for commands/responses
   - **IPC/plugin bridge** — Inject system prompt instructions asking agent to emit structured metadata

**Files Modified:**
- `agent/state.md` — This entry
- `agent/docs/agent-backend-integration/prompt.md` — Research prompt (NEW)
- `agent/docs/agent-backend-integration/RESULT.md` — Pending

**Result:** Research prompt created. Waiting for execution to produce findings.

**Build:** N/A (research only)

---

**Last Commit:** `e4f1490` — feat: Tracker Mind services, dashboard/insights/external redesign... (pending tracking fixes)

**Changes pending (24 files, +400/-90):**

| File | Change |
|------|--------|
| `agent/*.md` | LLM Wiki format for PROBLEMS, state, REQUESTS |
| `agent/agents.md` | Added Knowledge Systems reference section |
| `agent/skills/*/SKILL.md` (13 files) | Obsidian frontmatter added/converted |
| `agent/skills/maintain-context/graphify_maintain.py` | Added `sync_to_para()`, updated `full` command |
| `agent/templates/session.qmd` | NEW QMD session template |
| `agent/templates/problem.qmd` | NEW QMD problem template |
| `CZVault/` | PARA structure created (01_Areas, 02_Resources, 03_Archives, index files) |
| `src/pages/TerminalPage.tsx` | Event system, error toast, session dialog, auto-select project, agent lookup |
| `src/components/TerminalWindow.tsx` | Event listeners for `create-terminal`/`close-pane` |
| `src/main.ts` | `get-ai-usage-summary`: add 'day' period, parameterized query |
| `src/preload.ts` | Type signature: accept `'day'` period |
| `agent/PROBLEMS.md` | Issues #075-#082 statuses, new issues #087-#091 |
| `src/pages/SettingsPage.tsx` | Transient app filter toggle in Tracking tab + preference save/load |
| `src/main.ts` | `pollForeground` transient filter gated behind `userPreferences.filterTransientApps`, unconditional DeskFlow/Electron skip |
| `src/pages/TerminalPage.tsx` | FilesTab projectPath prop, + button always visible, handleSaveCheckpoint callback, Save button in header |

---

## Details

### 📝 Recent Changes

### 2026-05-13 — Path Resolution Fix + Setup Button Gating Fix

**What Changed:**
1. ✅ **Fixed `getProjectPath` falling back to `userDataPath`** — Changed default return from `userDataPath` to `undefined`. This lets `ProblemsService`/`RequestsService` use `process.cwd()` (workspace root) when no project is found in DB. Previously, the services silently read/wrote to Electron's app data directory instead of the project directory, causing PROBLEMS.md/REQUESTS.md to appear empty.
2. ✅ **Fixed `tracker-mind-setup` default path** — Changed from `userDataPath` to `process.cwd()` so Setup button creates files in the workspace root, not the Electron app data directory.
3. ✅ **Fixed Setup button gating** — Moved the Setup/Init button outside the `{projects.length > 0 && ...}` wrapper. The button is now always visible regardless of whether projects exist in the DB.
4. ✅ **Fixed `handleInitSetup` early return** — Removed the `!projId || !projPath` guard that prevented init without a selected project. Now works even when no project is selected.

**Files Modified:**
- `src/main.ts` — `getProjectPath()` returns `undefined` instead of `userDataPath`; `tracker-mind-setup` uses `process.cwd()` as default
- `src/pages/TerminalPage.tsx` — Setup button extracted from `projects.length > 0` gate; `handleInitSetup` no longer requires selected project

**Why:** When the DB had no projects (or the project wasn't found), getProjectPath silently fell back to `userDataPath`, causing ProblemsService to create/read PROBLEMS.md in the wrong directory. The user saw empty problems/requests lists even though the files existed in the workspace.

**Result:** PROBLEMS.md and REQUESTS.md now read from the correct workspace directory. Setup button is always visible.

**Build:** ✅ Passes

### 2026-05-13 — [COMPLETED] Session Categorization + @mention Routing System

**What Changed:**

Followed `agent/skills/generate-prompt/SKILL.md` step-by-step:
1. STEP 0: Updated state.md with the problem (marked IN PROGRESS)
2. Gathered context: state.md, context.md, UI patterns (TerminalWindow, TerminalPage, MapEditor)
3. Generated the prompt at `agent/docs/session-categorization/prompt.md`
4. Executed prompt → produced RESULT.md at `agent/docs/session-categorization/RESULT.md`
5. Implemented the full system following RESULT.md's architecture

**Phase 1 — Database Schema + Backend:**
- ✅ Added 6 new columns to `terminal_sessions`: `category`, `status`, `product_area`, `description`, `auto_tags`, `category_confirmed` (safe ALTER TABLE)
- ✅ Added `session_id` column to `workspace_problems`
- ✅ Created `session_parsed_items` table for decisions/actions/references
- ✅ Added `parseSessionMetadata()` — parses AI metadata blocks from terminal messages
- ✅ Added `parseMessageContent()` — extracts decisions, action items, status changes from AI output
- ✅ Updated `save-terminal-message` IPC to auto-parse metadata + content on message insert
- ✅ Updated `save-terminal-session` IPC to persist new category/status/area/tags fields
- ✅ Added 5 new IPC handlers: `update-session-category`, `get-parsed-session-items`, `analyze-session-category`, `resolve-at-mention`, `send-to-mention` (consolidated)
- ✅ Updated preload.ts with all new API bridges
- ✅ Updated App.tsx type declarations for `Window.deskflowAPI`

**Phase 2 — Frontend Components:**
- ✅ Created `CategoryBadge` component (bug-fix=red, feature=blue, refactor=purple, research=teal, review=amber, other=gray)
- ✅ Created `StatusDot` component (active=green+pulse, paused=yellow, completed=gray, archived=darker)
- ✅ Added category filter pills (pill-shaped buttons, active/inactive states, color-matched)
- ✅ Redesigned session list cards: badge + status dot + agent + topic + description + area + tags + cost
- ✅ Enhanced terminal tabs: status dot + category badge + session topic in tab bar
- ✅ Enhanced Terminals sidebar: category badges + status dots + product area in session info

**Phase 3 — @mention Routing:**
- ✅ `sendInstruction` now checks for @mention via `resolve-at-mention` IPC before falling back to active terminal
- ✅ @mention dropdown appears when user types `@` in Send bar
- ✅ Dropdown filters by typed query, supports arrow key navigation + Enter/Escape
- ✅ Sends to correct terminal, shows "Sent to Terminal X" toast

**Phase 4 — AI Metadata Contract:**
- ✅ AGENTS.md template in `tracker-mind-setup` now includes "Session Metadata Requirements" section
- ✅ Instructs AI to output: Title, Description, Status, Product Area, Category
- ✅ Metadata auto-parsed on each assistant message insert
- ✅ Auto-category analysis falls back to keyword scoring when no metadata provided

**Files Modified:**
- `src/main.ts` — Schema migrations, new IPC handlers, message parsing, AGENTS.md template
- `src/preload.ts` — New API bridges for categorization + @mention
- `src/App.tsx` — Type declarations for new deskflowAPI methods
- `src/pages/TerminalPage.tsx` — CategoryBadge, StatusDot, filter pills, @mention dropdown, enhanced session cards/tabs/sidebar, updated sendInstruction
- `agent/state.md` — This entry
- `agent/docs/session-categorization/prompt.md` — Generated prompt
- `agent/docs/session-categorization/RESULT.md` — Design specification

**Build:** ✅ Passes

**Result:** Sessions now have visual badges + status dots. Terminal tabs show category at a glance. @mention dropdown lets users route input to any terminal by name/number. AI agents are prompted to provide structured metadata, which is auto-parsed. Sessions can be filtered by category in the sidebar.

### 2026-05-12 — Solar System 3-in-1 Fix: Category Nav, Planet Tracking, Timeline Selector

**What Changed:**
1. ✅ **Category dropdown animates to solar system** — Selecting a category from the dropdown now switches `viewMode` to `'solarSystem'` and animates the camera to the sun position (`src/components/OrbitSystem.tsx:2960-2973`)
2. ✅ **Planet click locks camera via real-time tracking** — `handlePlanetClick` now reads actual planet position from `planetPositionsRef` and sets `trackedPlanetRef`. New `PlanetTracker` component uses `useFrame` to continuously lerp OrbitControls target to follow the orbiting planet (`src/components/OrbitSystem.tsx:1888-1908`, `src/components/OrbitSystem.tsx:2912-2925`)
3. ✅ **Timeline/period selector inside OrbitSystem UI** — Added pill buttons (Today/Week/Month/All) in the left control panel, always accessible in both fullscreen and popup modes (`src/components/OrbitSystem.tsx:3135-3155`)
4. ✅ **Data filtered by selected period** — Both app and website data is now filtered by the internal `selectedPeriod` state, fixing the "3 categories only" website issue (`src/components/OrbitSystem.tsx:2820-2835`)
5. ✅ **Tracking cleared on zoom out, reset, galaxy switch** — `trackedPlanetRef` is cleared in `handleZoomOut`, `handleRefreshTextures`, `handleCloseSystem`, `switchToGalaxy`, and the top-right Reset button

**Files Modified:**
- `agent/state.md` — Added version 3.0 entry, updated recent changes
- `agent/PROBLEMS.md` — Added issues #94, #95, #96
- `agent/AGENTS.md` — Updated testing checklist, active issues table

**Why:**
- Category dropdown was just selecting category without any visual feedback or navigation
- Planet click used orbit radius calculation instead of actual orbiting position — camera often missed the moving planet
- Website galaxy showed only 3 categories because `browserLogs` was period-filtered by the top nav, but no period controls existed inside the OrbitSystem
- Fullscreen and popup modes had no access to the top navigation bar's period selector

**Result:**
- ✅ Build passes (Vite + electron tsc)
- ✅ Category dropdown → animates to solar system view
- ✅ Planet click → locks camera and continuously follows orbiting planet
- ✅ Period selector always accessible inside solar system UI
- ✅ Both apps and websites respect the selected timeline

**What Changed:**
1. ✅ **Transient app filter** — Added `TRANSIENT_APPS` list in `main.ts` filtering out system windows (Windows Explorer, Task Switching, etc.) from `pollForeground`. These are silently ignored — `currentApp` stays unchanged, no `foreground-changed` event sent, stopwatch unaffected.
2. ✅ **Recent Sessions balanced feed** — Activity feed initialization in `DashboardPage.tsx` now takes up to 10 app logs + up to 5 browser logs (was: 20 of any type). Prevents periodic browser sync data from flooding the display with "Website" entries while still showing recent websites.

**Files Modified:**
- `src/main.ts` — Transient apps list + filter in `pollForeground`
- `src/pages/DashboardPage.tsx` — Balanced app/browser log initialization

**Why:**
- Windows Explorer briefly appears during Alt+Tab, which reset `currentApp` and disrupted the stopwatch
- Browser periodic sync (every ~30s) created more entries than app logs, causing "Recent Sessions" to show mostly "Website" type

**Result:**
- ✅ Build passes (Vite + electron tsc)
- ✅ Windows Explorer and similar transient apps are silently ignored
- ✅ Stopwatch no longer disrupted by Alt+Tab
- ✅ Recent Sessions shows a balanced mix of app and website entries

### 2026-05-12 — Transient App Filter Toggle (Settings UI + Preference Gate)

**What Changed:**
1. ✅ **Added toggle UI in Settings > Tracking tab** — New "Ignore Transient System Apps" toggle switch with explanatory text, using the same toggle style as other settings
2. ✅ **Wired toggle to user preferences** — `setPreference('filterTransientApps', bool)` saves the flag, `getPreferences().filterTransientApps` loads it on mount (default: enabled)
3. ✅ **Gated TRANSIENT_APPS filter in pollForeground** — Transient check now reads `userPreferences.filterTransientApps` (defaults to `true` if not set), so users can disable it if desired

**Files Modified:**
- `src/pages/SettingsPage.tsx` — Added `filterTransientApps` state, toggle UI in Tracking tab, preference load/save
- `src/main.ts` — Poll foreground transient filter gated on `userPreferences.filterTransientApps !== false`

**Why:**
- User wanted a visible toggle so they can control whether transient system apps (Explorer, task switcher) are filtered from tracking
- Previous implementation was silent (always-on filter), which could be surprising

**Result:**
- ✅ Build passes (Vite + electron tsc)
- ✅ Toggle appears in Settings > Tracking, defaults to on
- ✅ Preference persists across restarts via `deskflow-prefs.json`
- ✅ Users can disable filtering if they want to track system app transitions

### 2026-05-12 — Terminal Architecture Fixes + Analytics Tab Fixes

**What Changed:**
1. ✅ **Fixed core terminal architecture bug** — TerminalPage's `terminalLayout` state was NEVER passed as `initialLayout` prop to TerminalLayout. Replaced broken prop chain with custom event system (`create-terminal`, `terminal-created`, `close-pane`). TerminalLayout now manages its own internal layout state.
2. ✅ **Fixed double-spawn bug** — Both TerminalPage and TerminalLayout tried to spawn the same terminal ID. Removed redundant spawn from event handler — only TerminalLayout spawns PTYs now.
3. ✅ **Added visible error toast system** — Replaced silent `logOnce()` with `showError()` that auto-clears after 8s in UI. Terminal failures now visible.
4. ✅ **New Session dialog** — AI agent type selector (Claude/OpenCode dropdown + session name input) when creating sessions.
5. ✅ **Fixed close terminal** — Now calls `killTerminal()` + `terminalAPI.destroy()` + dispatches `close-pane` event.
6. ✅ **Removed 600px sidebar limit** — `Math.min(600, ...)` → `Math.max(200, ...)`.
7. ✅ **Terminal tabs dynamic agent type** — Lookup from sessions array instead of hardcoded 'Cloud'.
8. ✅ **Resume handler fix** — Changed hardcoded `'active'` to `activeTerminalId`.
9. ✅ **Terminal creation without project** — Defaults to `os.homedir()`.
10. ✅ **Analytics tab IPC fetch on correct tab** — Changed from `activeTab === 'map'` to `activeTab === 'analytics'`.
11. ✅ **Analytics 'day' period** — Added `'day'` support to `get-ai-usage-summary` handler (was only `'week'`/`'month'`).
12. ✅ **SQL injection fix** — Parameterized `get-ai-usage-summary` query.
13. ✅ **Auto-select project** — TerminalPage now selects first project when projects loaded and none selected.

**Files Modified:**
- `src/pages/TerminalPage.tsx` — Event system, error toast, session dialog, auto-select, agent lookup
- `src/components/TerminalWindow.tsx` — Event listeners for `create-terminal`/`close-pane`
- `src/main.ts` — `get-ai-usage-summary`: add 'day' period, parameterized query
- `src/preload.ts` — Type signature updated to accept `'day'`
- `agent/PROBLEMS.md` — Issues #075-#082 statuses updated, new issues #087-#091 documented
- `agent/state.md` — This entry

**Result:**
- ✅ Build passes (Vite renderer + electron tsc)
- ✅ Terminal + button now creates visible terminal panes in TerminalLayout
- ✅ Close button kills PTY AND removes pane
- ✅ New Session dialog works with event system
- ✅ Errors visible in UI instead of console-only
- ✅ Analytics tab shows correct data for 'day'/'week'/'month' periods
- ✅ Project auto-selected when none in localStorage

**Files Modified:**
- `src/components/DurationPicker.tsx` — Hold-to-increment with acceleration, click-to-edit manual input
- `src/pages/ExternalPage.tsx` — Added useEffect to auto-calculate wakeUpMinutes from wakeTime; replaced LatencyPicker with read-only display

**Build:** ✅

### 2026-05-10 — Tracker Mind Frontend UI Enhancements

**What Changed:**
1. ✅ **"Open in Terminal" button** — ProblemDetailModal now has an "Assign to Terminal" (no terminal) or "Open in Terminal" (has terminal) button. Creates terminal pane + sends prompt automatically.
2. ✅ **Problem binding dropdown** — Terminal header shows a Link button to bind any problem to the active terminal via `saveTerminalBinding`.
3. ✅ **Skill card grid** — NewProblemDialog replaced the skill `<select>` dropdown with a 2-column card grid showing skill name + description.
4. ✅ **Loading state + char counter** — Send instruction buttons show a spinner during sending. Input bar shows `{n}/500` char counter and disables at 500.
5. ✅ **Request detail + problem linking** — Created `RequestDetailModal` (was missing, caused runtime error) with status buttons, linked problems display, and a dropdown to link problems via new `link-problem-to-request` IPC. Created `NewRequestDialog` (was also missing) with title, description, priority fields.
6. ✅ **File watcher pulse notification** — FilesTab listens for `onAgentFileChanged` and shows a green pulsing notification bar. File tab button gets a `animate-ping` green dot when files change externally.
7. ✅ **Custom event handlers** — `TerminalPage` listens for `create-terminal-for-problem` and `focus-terminal` custom events dispatched from modals.

**Files Modified:**
- `src/pages/TerminalPage.tsx` — All 6 features implemented across components
- `src/main.ts` — Added `link-problem-to-request` IPC handler
- `src/preload.ts` — Added `linkProblemToRequest` API

**Result:** Tracker Mind Terminal page frontend now has full feature parity with the backend IPC handlers. No more undefined component errors.

**Build:** ✅

### 2026-05-10 — External Activity Type Fix + Session Editing

**What Changed:**
1. ✅ **Fixed external activity type not saving** — `update-external-activity` IPC handler was missing the `type` field. Frontend sent `type` but backend silently ignored it. Added `type` to both the IPC handler and preload.ts type definition.
2. ✅ **Session editing** — Replaced the simple read-only session list with an editable version. Each session shows start→end time, duration, and hover-revealed Pencil/Trash buttons. Pencil opens inline datetime-local inputs with Save/Cancel.
3. ✅ **Created `update-external-session` IPC handler** in main.ts (was missing but preload exposed it)
4. ✅ **Created `delete-external-session` IPC handler** in main.ts (was also missing)

**Files Modified:**
- `src/main.ts` — Added `type` to update handler, added update/delete session handlers
- `src/preload.ts` — Added `type` to updateExternalActivity type
- `src/pages/ExternalPage.tsx` — Replaced session list with editable version

### 2026-05-10 — Sleep Detection Redesign (Focus/Blur Tracking)

**What Changed:**
1. ✅ **Window focus/blur tracking** — `mainWindow.on('focus')` and `on('blur')` in main.ts. On focus, detects gaps > 45min during sleep hours (9PM-10AM). Sends IPC event + writes detection file.
2. ✅ **Sleep pattern recognition** — Stores last 14 sleep sessions in `deskflow-sleep-pattern.json`. Checks if gap time matches past sleep patterns.
3. ✅ **New IPC handlers** — `check-sleep-detection`, `confirm-sleep`, `dismiss-sleep-detection`
4. ✅ **New modal** — Shows gap duration, proposed bedtime/wake, editable time inputs, fall-asleep/wake-up latency selectors

**Files Modified:**
- `src/main.ts` — Focus/blur listeners, sleep pattern persistence, 3 new IPC handlers
- `src/preload.ts` — 3 new APIs + onSleepDetection listener
- `src/App.tsx` — New sleep detection modal replacing old morning prompt

### 2026-05-10 — Typical Day Heatmap Fix

**Root Cause:**
1. **Missing IPC handler** — `getDayDetail` was registered in preload.ts but no handler existed in main.ts, causing `Error: No handler registered for 'get-day-detail'`
2. **Missing state** — `setHeatmapDayDetail` was called but never declared as a state variable
3. **Dead code** — The `handleDayClick` function called a nonexistent handler and setter

**What Changed:**
1. ✅ **Added IPC handler** in `main.ts` — queries `logs` and `external_sessions` for the given date, returns `{ logs, externalSessions }`
2. ✅ **Added DayDetailPopup** — imported and rendered as a modal when a day header is clicked
3. ✅ **Data transformation** — IPC response is transformed into `TimelineItem[]` (app entries = blue, browser = green, external = purple)

**Files Modified:**
- `src/main.ts` — Added `get-day-detail` IPC handler
- `src/pages/DashboardPage.tsx` — Added TimelineItem interface, dayDetailDate/dayDetailItems state, fixed handleDayClick, renders DayDetailPopup

**Result:**
- ✅ Build passes
- ✅ Clicking day headers no longer throws an error
- ✅ Day detail popup shows all logs and external sessions for the clicked day in a timeline view

### 2026-05-10 — Heatmap: Fixed Detail Panel Wrong Day + Hour-Splitting Algorithm

**Root Cause:**
1. **Detail panel always showed Sunday's data** — `selectedHeatmapHour` stored only the hour number; `.find(c => c.hour === hour)` returned the first match (always day 0 = Sunday) regardless of which day the user clicked
2. **Hour-splitting used wrong boundaries** — Both device and external activity splitters used `currentDate.getTime()` (session start time) as the hour boundary instead of the actual calendar hour start (e.g., 14:00), causing data to be misattributed across hours

**What Changed:**
1. ✅ **Fixed detail panel day lookup** — Changed `selectedHeatmapHour: number` to `selectedCell: { day; hour }` so the panel shows data for the correct day
2. ✅ **Fixed hour-splitting in device activity** — `addSession()` now computes `hourStartMs` by zeroing minutes/seconds on the current date, then uses `hourStartMs`/`hourEndMs` for proper calendar-hour-based splitting
3. ✅ **Fixed hour-splitting in external activity** — Same fix applied to the external hourly data computation
4. ✅ **Added per-app device breakdown** — `HeatmapCell` now includes `deviceBreakdown` tracking which apps were used and for how long in each hour cell
5. ✅ **Changed default heatmap mode** from `'external'` to `'combined'`
6. ✅ **Detail panel shows app list** — Clicking a cell now shows the list of apps used during that hour with durations and colored dots

**Files Modified:**
- `src/pages/DashboardPage.tsx` — State type, click handler, detail panel lookup, hour boundary calculation (both splitters), cellMap type (added apps tracking), addSession signature (added app param), detail panel device section (added app list)

**Result:**
- ✅ Build passes
- ✅ Clicking any heatmap cell shows the correct day's data in the detail panel
- ✅ Activity data is properly attributed to the right calendar hours (no more cross-hour leakage)
- ✅ Detail panel now shows a list of apps used during the hour with durations
- ✅ Heatmap defaults to combined device+external mode

### 2026-05-11 — IDE Health: Fix "unknown" crash + vcs_branch + sessions query

**What Changed:**
1. ✅ **Added `created_at` migration** for `terminal_sessions` — existing DBs were missing this column, causing `getProjectDetails` to throw SQL error → returns `{ health: null }` → frontend shows "unknown"
2. ✅ **Fixed sessions/presets queries** — removed `OR project_id IS NULL` which was returning ALL unassigned sessions/presets for every project
3. ✅ **Fixed "Git Branch main" display** — `vcs_branch` column doesn't exist in `projects` table; changed to show `vcs_type` properly

**Files Modified:**
- `src/main.ts` — Added `ALTER TABLE terminal_sessions ADD COLUMN created_at` migration; fixed sessions/presets queries
- `src/pages/IDEProjectsPage.tsx` — Replaced `project.vcs_branch || 'main'` with `project.vcs_type || 'None detected'`

**Result:** Health shows "inactive" instead of "unknown"; sessions/presets show only this project's data; Version Control shows actual VCS type

**Build:** ✅

### 2026-05-11 — Terminal Workspace Revamp Complete (All P0-P5 Tasks)

**What Changed:**

**P0-1 Fixed:** Removed duplicate "New" button in sidebar that called undefined `setShowNewDialog`. The sub-components (ProblemsTab, RequestsTab) already have their own working "New" buttons.

**P0-2 Verified:** Selected project name already displays in TerminalPage header with green dot and path.

**P1 Chrome-style Terminal Tab Bar:**
- Tab bar already existed with active/inactive styling, close buttons, "+" button
- Added auto-sync: layout panes now auto-populate `terminalTabs` when new terminals are detected in the layout tree
- Stale tabs are cleaned up when panes are removed

**P2 Sidebar 'Terminals' Tab:**
- Added 8th sidebar tab (`'terminals'`) with terminal icon, between Files and the end
- Shows running terminals (green dot, name, agent, click to focus)
- Shows recent/closed sessions (topic, date, resume button on hover)

**P3 Workspace Persistence:**
- Created `workspace_state` table in SQLite (project_id, sidebar_width, active_tab, terminal_tabs)
- Added `workspace:save` IPC handler — saves sidebarWidth, activeTab, terminalTabs per project
- Added `workspace:load` IPC handler — restores workspace state on mount
- Frontend auto-saves workspace state on changes (debounced 2s)
- Frontend loads workspace state on mount in workspace mode

**P4 Terminal Chat Persistence:**
- Created `terminal_messages` table in SQLite (session_id, role, content, created_at)
- Added `save-terminal-message` IPC handler — stores chat messages
- Added `get-session-messages` IPC handler — retrieves all messages for a session
- Exposed `saveTerminalMessage` API in preload.ts

**P5 UX Polish:**
- Selected project now persists to localStorage (`terminal-project`) when changed
- Workspace state auto-restored when opening a project workspace

**Files Modified:**
- `src/main.ts` — Added `terminal_messages` + `workspace_state` tables; 4 new IPC handlers (workspace:save, workspace:load, save-terminal-message, get-session-messages)
- `src/preload.ts` — Added `saveTerminalMessage` API
- `src/pages/TerminalPage.tsx` — Removed duplicate "New" button; added `'terminals'` tab type + button + TerminalsTab component; added tab-layout sync; added workspace persistence effects; added selectedProject localStorage persistence; fixed loadWorkspace call

**Result:**
- ✅ Build passes (3060 modules, electron tsc)
- ✅ No more "setShowNewDialog is not defined" runtime error
- ✅ Terminal tabs auto-populate when terminals open
- ✅ Terminals sidebar tab shows running + recent terminals with focus/resume
- ✅ Workspace state saves/loads from DB (sidebar width, active tab, open terminals)
- ✅ Terminal messages stored and retrievable per session
- ✅ Project selection persists across page refreshes

### 2026-05-10 — AI Sync Efficiency + Last Sync Display on AI Tools Page

**What Changed:**
1. ✅ **File mtime tracking** — `syncAllAIAgents` now tracks per-path mtime + file count in preferences (`aiSyncState`). Unchanged paths are skipped entirely, avoiding re-parsing JSONL files that haven't been modified.
2. ✅ **Last sync tracking** — `lastRunAt` and `agentLastRun` timestamps stored in prefs after every sync.
3. ✅ **`get-ai-sync-status` IPC handler** — Returns `{ lastRunAt, agentLastRun, paths }` for the UI.
4. ✅ **Last sync display** — Sync AI button now shows "Last: Xm ago" next to it (hidden on small screens, updates after sync completes, shows "just now" / "Xm ago" / "Xh ago" / relative date).

**Files Modified:**
- `src/main.ts` — Added mtime checking in `syncAllAIAgents`, `loadAISyncState`/`saveAISyncState` helpers, `get-ai-sync-status` handler
- `src/preload.ts` — Exposed `getAISyncStatus`
- `src/App.tsx` — Type declaration for `getAISyncStatus`
- `src/pages/IDEProjectsPage.tsx` — Added `aiLastSyncAt` state, loads on mount + after sync, displays next to Sync AI button

**Result:**
- ✅ Build passes
- ✅ Repeated sync of unchanged agent data is near-instant (skips parsing)
- ✅ Last sync time visible next to Sync AI button
- ✅ Efficiency improvement scales with number of files (only changed files re-parsed)

### 2026-05-10 — IDE Project Page: Fixed Stats (Health Score, AI Usage) via Path-Based Matching

**Root Cause:**
- `ai_usage` table stores `project_path` from JSONL file data (cwd from AI sessions) but NOT `project_id`
- `calculate-project-health` queried `ai_usage` by `project_id` which was always NULL → returned 0 for everything
- Commits query used wrong column name `committed_at` instead of `date` → returned 0 commits
- Frontend made 4 separate IPC calls per project expand (tools, sessions, health, presets) — now consolidated into 1

**What Changed:**
1. ✅ **Path-based matching** — `calculate-project-health` now looks up the project's path and matches `ai_usage` by `project_path = ? OR project_path LIKE ?` (covers subdirectories)
2. ✅ **New consolidated handler** — `get-project-details` returns tools, sessions, health, presets, AND detailed `aiUsage` (totalTokens, totalCost, totalMessages, modelBreakdown) in a single IPC call
3. ✅ **Fixed commits column** — Changed `committed_at` → `date` to match the actual schema
4. ✅ **Sync-time project_id resolution** — After AI usage sync, runs a batch update to resolve `project_id` from `project_path` for future `project_id`-based queries
5. ✅ **Frontend consolidated** — `toggleProjectExpand` now uses single `getProjectDetails()` call instead of 4 parallel calls

**Files Modified:**
- `src/main.ts` — Fixed health handler (path matching + column name), added `get-project-details` handler, added post-sync project_id resolution
- `src/preload.ts` — Exposed `getProjectDetails`
- `src/App.tsx` — Added type declaration for `getProjectDetails`
- `src/pages/IDEProjectsPage.tsx` — Uses consolidated `getProjectDetails()` call

**Why This Works:**
- JSONL files record the working directory (cwd) as `project_path` — this matches the project's `path` in the DB
- Path-based matching is efficient (indexed `project_path` column) and correct (no re-parsing of JSONL files needed)
- Future syncs will also populate `project_id` directly, making both query paths work

**Result:**
- ✅ Build passes
- ✅ Health Score now reflects actual AI usage, terminal sessions, and commits
- ✅ AI Usage breakdown properly shown per project
- ✅ Terminal Sessions count shows real data
- ✅ Single IPC call reduces UI latency when expanding project cards

### 2026-05-10 — External Page: Uniform Buttons, Pause/Stop, Enhanced Stopwatch

**What Changed:**
1. ✅ **Uniform activity button height** — All activity cards fixed at `h-[140px]` with always-visible duration text and sparkline bars (even at 0)
2. ✅ **Pause/Stop controls** — Added pause/resume and stop buttons to stopwatch timer during active tracking. Pause uses `pausedAtRef` + `pausedDuration` accumulators for accurate elapsed time. Stop passes adjusted end time to DB accounting for paused duration.
3. ✅ **Enhanced stopwatch visuals** — Redesigned using frontend-design skill: pulsing status dot, 6xl monospace gradient timer text, ghost text depth, pill-shaped action buttons with colored borders/hover states

**Files Modified:**
- `src/pages/ExternalPage.tsx` — Added `useRef` import, pause state (3 lines), pause/resume callbacks, updated timer effect, enhanced stopwatch UI, uniform card height

**Result:**
- ✅ Build passes
- ✅ Activity buttons have uniform height regardless of data
- ✅ Pause and Stop buttons available during active tracking
- ✅ Timer stops counting on pause, resumes correctly
- ✅ Adjusted end time sent to DB on stop (excludes paused time)

### 2026-05-10 — Auto-Start Registry Fix (Development Mode)

**Root Cause:**
- Registry entry was: `"electron.exe" --minimized` (no app path)
- `setLoginItemSettings()` in dev mode was passing only `--minimized` without the app directory path
- When electron.exe runs without an app path, it shows the default Electron welcome screen

**What Changed:**
- Fixed `set-auto-start` IPC handler in `src/main.ts`
- In development mode (`!app.isPackaged`), now passes `app.getAppPath()` as the FIRST argument before `--minimized`
- New args format: `[projectDir, '--minimized']` instead of just `['--minimized']`

**Files Modified:**
- `src/main.ts` (line ~2220) - `set-auto-start` handler now includes app path in args for dev mode

**Result:**
- ✅ Build passes
- ✅ After toggling auto-start OFF then ON, registry will show:
  - `"electron.exe" "C:\Users\cleme\...\App Tracker" --minimized`
- ✅ Windows startup will now launch DeskFlow properly instead of Electron default screen

**User Action Required:**
1. Open DeskFlow
2. Go to Settings > General tab
3. Toggle "Launch on system startup" to OFF
4. Toggle it back to ON
5. This updates the Windows registry with the correct command

---

### 2026-05-10 — Enhanced Knowledge Infrastructure Setup

**What Changed:**
1. ✅ **Phase 1** — Assessed existing agent/, skills/, graphify-out/, CZVault/ infrastructure
2. ✅ **Phase 2 — LLM Wiki Format** — Updated PROBLEMS.md, state.md, REQUESTS.md with frontmatter, quick reference, token estimates
3. ✅ **Phase 3 — Obsidian Skills** — Added YAML frontmatter (id, name, category, tags) to all 13 skill SKILL.md files
4. ✅ **Phase 4 — PARA Method** — Created vault structure: 01_Areas/AI-Agents (Skills, Patterns), 02_Resources (Prompts, Templates), 03_Archives, with README index files
5. ✅ **Phase 5 — QMD Templates** — Created `agent/templates/session.qmd` and `agent/templates/problem.qmd`
6. ✅ **Phase 6 — AGENTS.md** — Added "Knowledge Systems" section with references to Graphify, PARA, LLM Wiki, QMD
7. ✅ **Phase 7 — graphify_maintain.py** — Added `sync_to_para()`, `ensure_para_structure()`, updated `full` command, added `para` command
8. ✅ **Phase 8** — All files verified, Python syntax OK, PARA directories confirmed

**Files Modified:**
- `agent/PROBLEMS.md` — LLM Wiki format
- `agent/state.md` — LLM Wiki format with Current State Summary, Quick Links
- `agent/REQUESTS.md` — LLM Wiki format with Quick Reference
- `agent/agents.md` — Added Knowledge Systems section
- `agent/skills/*/SKILL.md` (13 files) — Obsidian frontmatter
- `agent/skills/maintain-context/graphify_maintain.py` — PARA sync functions
- `agent/templates/session.qmd` — NEW
- `agent/templates/problem.qmd` — NEW
- `CZVault/README.md` — NEW
- `CZVault/00_Projects/README.md` — NEW
- `CZVault/01_Areas/README.md` — NEW
- `CZVault/02_Resources/README.md` — NEW
- `CZVault/03_Archives/README.md` — NEW

**Result:**
- ✅ All 8 phases complete
- ✅ 17 project files modified/created (+288/-63)
- ✅ 6 PARA directories created in CZVault
- ✅ 2 QMD templates created
- ✅ Python syntax valid
- ✅ All existing Tracker Mind functionality preserved

### 2026-05-09 — README Updated to v2.4

**What Changed:**
1. ✅ **Header/Tagline** - Added Tracker Mind, insights dashboard, knowledge graph to tagline
2. ✅ **Badges** - Updated SQLite badge to ^12.9.0
3. ✅ **Key Features** - Added 4 new rows (Insights Dashboard, Custom Categories, Tracker Mind, Graphify Knowledge Graph); updated Terminal & External rows
4. ✅ **Navigation** - Added Insights page, removed standalone Galaxy (merged into Dashboard), updated descriptions
5. ✅ **Project Structure** - Added `src/services/` directory with 6 files, added `InsightsPage.tsx`, added `graphify-out/`
6. ✅ **Tech Stack** - Updated better-sqlite3 version, added recharts & sql.js, removed electron-rebuild
7. ✅ **Advanced Features** - Added "Tracker Mind System" section, updated Terminal (resizable sidebar, send instructions) & External (glass-styled charts)
8. ✅ **Architecture Diagram** - Updated mermaid with services, sql.js fallback, InsightsPage
9. ✅ **Version History** - Added v1.60 through v2.4
10. ✅ **Development Highlights** - Added entries for v1.60 through v2.4
11. ✅ **Last Updated** - Changed to 2026-05-09

**Files Modified:**
- `README.md` — Full update to v2.4
- `agent/state.md` — This entry, reset "Since Last Commit" section

**Result:**
- ✅ README now reflects all features up to v2.4
- ✅ "Since Last Commit" section reset to empty after commit e4f1490
- ✅ Consistent styling maintained throughout

### 2026-05-09 — External Page Charts Refactor: 3 Glass-Styled Charts

**What Changed:**
1. ✅ **FIXED** JSX structural corruption in ExternalPage.tsx — missing closing `</div>` and `</motion.div>` tags in Active Timer View section
2. ✅ **REPLACED** old Charts Section (Sleep Trends Line chart + Activity Breakdown horizontal bar) with 3 new glass-styled charts in a 3-column grid:
   - **Daily Usage Trend** — Vertical bar chart showing hours per activity
   - **Activity Distribution** — Conic-gradient doughnut chart with center total hours label and color legend
   - **Weekly Trend** — Vertical bar chart showing week-over-week comparison
3. ✅ **REMOVED** dead `showCharts` toggle wrapper (Weekly Comparison section with undefined state)
4. ✅ **CLEANED** unused variables: `sleepTrendData1`, `sleepTrendOptions`, `breakdownChartData`, `breakdownChartOptions`, `weeklyChartData`, `weeklyChartOptions`
5. ✅ **REMOVED** unused `Line` import from react-chartjs-2

**Files Modified:**
- `src/pages/ExternalPage.tsx` — Fixed JSX structure, replaced charts section, cleaned unused code

**Why:**
- JSX was structurally broken (missing closing tags caused build failure)
- Old Sleep Trends + Activity Breakdown charts were duplicate/overlapping with Dashboard
- `showCharts` state was never declared (dead code from git restore)
- 3 new glass-styled charts match the design pattern used in viewingActivity section

**Result:**
- ✅ Build passes (3060 modules)
- ✅ 3 glass-styled charts visible below activity grid
- ✅ Charts auto-update when period selector changes (via `breakdownData`/`consistencyChartData` memo deps on `stats`/`consistency`)
- ✅ No Charts toggle button remains
- ✅ Period selector only in top nav

### 2026-05-09 — AGENTS.md Rule Added

**What Changed:**
- Added rule to "❌ Never" section: "**REMOVE OR DISABLE existing UI elements, buttons, or features unless EXPLICITLY told to do so by user**"

**Why:** Prevents accidental removal of features (like the ExternalPage duplicate buttons issue - I accidentally removed the Activity Grid and chart sections when removing a period selector)

**Result:**
- ✅ Build passes
- ✅ AGENTS.md updated with protection rule

### 2026-05-09 — ExternalPage.tsx JSX Structure Fixed

**What Changed:**
- Removed duplicate/broken code fragments that were causing build errors
- Code had multiple `</motion.div>`, `</AnimatePresence>` closing tags out of sequence

**Files Modified:**
- `src/pages/ExternalPage.tsx` - Fixed JSX structure

**Result:**
- ✅ Build passes

**What Changed:**
1. ✅ **NEW** `customCategories` field in `categoryConfig` — persistent storage in `deskflow-categories.json`
2. ✅ **NEW** IPC handlers: `add-category`, `remove-category` in main.ts
3. ✅ **NEW** `addCategory`, `removeCategory` APIs in preload.ts
4. ✅ **NEW** Custom Categories UI section in Settings > Category tab
   - Input + Add button to create new categories
   - Category pills with delete (X) buttons
   - New categories auto-assigned to Neutral tier
5. ✅ **UPDATED** All category selection panels use `allCategories` (defaults + custom)
   - App/domain pickers, keyword set selectors, unassigned list
6. ✅ **UPDATED** `loadCategoryConfig()` migration handles old configs
7. ✅ **FIXED** Tier assignments merge from backend on load (ensures custom cats appear)

**Files Modified:**
- `src/main.ts` — `categoryConfig`, IPC handlers, load migration
- `src/preload.ts` — `addCategory`, `removeCategory` APIs
- `src/pages/SettingsPage.tsx` — Custom categories state/UI, `allCategories` used everywhere

**Result:**
- ✅ Build passes
- ✅ Users can add/remove custom categories persistently
- ✅ Custom categories appear in all category selection panels
- ✅ Custom categories can be dragged between productivity tiers

### 2026-05-09 — Insights Page Complete Redesign

**What Changed:**
1. ✅ **Typical Day Chart** — Replaced the ugly 24-box grid with a color-coded heatmap grid (7 days × 24 hours) with color intensity based on activity seconds per hour
2. ✅ **Stat Cards** — Redesigned 5 stats row with trend indicators, gradient backgrounds, hover animations, and contextual sub-labels
3. ✅ **Tab Navigation** — Added Day / Weekly / Activity tabs to organize content
4. ✅ **Day of Week Bar Chart** — New bar chart showing productivity per day of week with color-coded bars
5. ✅ **Sleep & Recovery Chart** — Grouped bar chart showing sleep hours vs deficit over time
6. ✅ **Activity Breakdown** — Animated horizontal bar chart with progress bars, percentage labels, and session counts
7. ✅ **Tooltips & Interactivity** — Chart.js tooltips with dark theme styling, Typical Day heatmap hover with detail panel

**Files Modified:**
- `src/pages/InsightsPage.tsx` — Complete rewrite (240→300 lines)

**Result:**
- ✅ Build passes (3060 modules transformed)
- ✅ Heatmap shows activity intensity per hour with hover tooltips
- ✅ Stat cards have trend indicators and sub-labels
- ✅ Sleep, day-of-week, and activity breakdown charts
- ✅ Tab-based organization for different views
- ✅ All existing IPC endpoints used (no new queries)

**What Changed:**
1. ✅ **Terminal Binding UI:**
   - Header shows active terminal indicator with agent type (claude/opencode)
   - Shows bound problem ID if assigned (#73, #74, etc.)
   - Green status dot when terminal is active
   - Auto-loads terminal bindings every 5 seconds

2. ✅ **Send Instructions to Terminal:**
   - "Send" button appears when terminal is active
   - Click opens input bar below header
   - Type instruction and press Enter or click Send
   - Instruction sent to active terminal PTY
   - Button to close input bar

3. ✅ **Resizable Sidebar:**
   - Drag left edge to resize (200-600px range)
   - Visual resize handle on left side
   - Hover turns green, dragging shows solid green bar
   - Width persists during session

4. ✅ **Full Terminal Registration:**
   - When "Open Terminal" clicked, terminal auto-registers with project
   - Stores: terminalId, projectId, agentType (claude), status (active)
   - Shows in terminal header: "claude ●" or "opencode ●"
   - Problem ID badge when issue is bound

5. ✅ **Preload API Added:**
   - `registerTerminal()` - Register terminal with binding
   - `updateTerminalBinding()` - Update binding (status, problem, context)
   - `terminalWrite()` - Write text to terminal PTY
   - `getTerminalBindings()` - Get all terminal bindings

**Files Modified:**
- `src/pages/TerminalPage.tsx` - Terminal binding UI, resize handle, instruction input
- `src/preload.ts` - Added registerTerminal, updateTerminalBinding, terminalWrite APIs

**Result:**
- ✅ Build passes
- ✅ Terminal header shows: agent type, problem badge, status dot
- ✅ Send instructions directly from UI
- ✅ Sidebar draggable 200-600px
- ✅ Terminal auto-registers when opened

---

### 2026-05-09 — Project-Aware Tracker Mind (MAJOR FIX)

**What Changed:**
1. ✅ **ADDED** Orbit system research framework:
   - Created `agent/docs/orbit-system-research/` directory
   - Generated `PROMPT.md` with detailed research requirements
   - Generated `RESEARCH_RESULT.md` with comprehensive physics/visuals solution

2. ✅ **IMPLEMENTED** Logarithmic orbit spacing:
   - Replaced linear spacing with `calculateOrbitRadiusLogarithmic()` function
   - Formula: `orbitRadius = minR * (maxR / minR)^(n/totalPlanets)`
   - **Result:** Planets now properly spread from close (r=10) to far (r=80) orbits
   - Inner planets visually close to sun, outer planets clearly separated

3. ✅ **UPDATED** Angular speed calculations:
   - Added `visualBalanceFactor: 0.65` to ORBIT_CONFIG
   - New formula: `speed = baseSpeed / sqrt(adjustedRadius * r)` where `adjustedRadius = r * visualBalanceFactor`
   - **Result:** Outer planets move faster (4-5s orbit) while still following Kepler-like physics
   - All planets visibly move (system feels alive, not boring)

4. ✅ **UPDATED** ORBIT_CONFIG constants:
   - Added `visualBalanceFactor: 0.65` (0.6-0.7 range for tuning)
   - Added `sunRadius: 3`, `sunGlowSize: 3.5`
   - `minOrbitRadius: 10`, `maxOrbitRadius: 80` (unchanged, good range)

5. ✅ **REFACTORED** planet computation functions:
   - `computePlanets()` - Updated to use `calculateOrbitRadiusLogarithmic()` instead of old `mapTimeToRadius()`
   - `computePlanetsFromStats()` - Updated to use logarithmic spacing
   - `computeWebsitePlanets()` - Updated to use logarithmic spacing with website-specific radius (24-240)

6. ✅ **VERIFIED** Sun component already has:
   - Canvas-based procedural texture (no external assets)
   - Granulation pattern + solar flares + faculae
   - Glow texture + corona texture
   - Full PBR material with emissive properties

**Files Modified:**
- `src/components/OrbitSystem.tsx` (lines 491-560):
  - Updated ORBIT_CONFIG with new parameters
  - Added `calculateOrbitRadiusLogarithmic()` function
  - Updated `calculateAngularSpeed()` with visual balance factor
  - Updated planet computation in three functions
  - Removed old `mapTimeToRadius()` function

**Why:** 
- Previous system clustered all planets far from sun (no visual differentiation)
- Linear spacing didn't match Kepler physics or human visual perception
- Strict Kepler made outer planets too slow (boring to watch)

**Result:**
- ✅ Build passes (`✓ 3060 modules transformed`)
- ✅ Planets spread logarithmically across orbit radius range
- ✅ Inner planets complete orbit ~3 seconds, outer planets ~4-5 seconds
- ✅ Speed ratios observable but not overwhelming (80:1 inner:outer vs 180:1 strict Kepler)
- ✅ Physics follows Kepler-ish law while optimized for visual engagement

### 2026-05-09 — Project-Aware Tracker Mind (MAJOR FIX)

**What Changed:**
1. ✅ **FIXED** ProblemsService now uses PROJECT path instead of app data path:
   - `getProblemsService(projectId)` looks up project.path from database
   - PROBLEMS.md is now read from `{projectPath}/agent/PROBLEMS.md`
   - Each project has its own agent/ directory with problems

2. ✅ **UPDATED** IPC handlers accept projectId parameter:
   - `get-problems` now accepts `projectId` and returns `projectPath` for UI display
   - `create-problem` accepts `projectId` 
   - `update-problem-status` accepts `projectId`
   - `tracker-mind-setup` accepts `projectId`

3. ✅ **IMPROVED** ProblemsTab shows clear project info:
   - Project path displayed at top: "📁 /path/to/project"
   - File being parsed: "agent/PROBLEMS.md • 5 issues parsed"
   - Warning when no project selected: "Select a project to view problems"
   - Filter status passes projectId for updates

4. ✅ **IMPROVED** FilesTab with full project integration:
   - Shows project name and full path
   - Status indicator: "⚪ Not initialized" → "⏳ Checking..." → "✅ Ready"
   - Setup button creates full agent/ structure
   - File list with count: "5 files in agent/"
   - Click file shows content preview with size

5. ✅ **IMPROVED** Setup creates complete agent/ structure:
   - Creates `agent/` directory
   - Creates `agent/skills/` subdirectory
   - Creates `agent/PROBLEMS.md` (empty template)
   - Creates `agent/REQUESTS.md` (empty template)
   - Creates `agent/state.md` (empty template)
   - Creates `agent/skills/fix-problems.md` (default skill)

**Files Modified:**
- `src/services/ProblemsService.ts` - Added projectId support, getProjectPath()
- `src/main.ts` - getProjectPath() function, updated IPC handlers
- `src/preload.ts` - Updated API methods with projectId parameter
- `src/pages/TerminalPage.tsx` - ProblemsTab + FilesTab with full UI

**Result:**
- ✅ Build passes
- ✅ Problems read from SELECTED PROJECT's agent/ directory
- ✅ Files tab shows agent/ files from selected project
- ✅ Setup button initializes agent/ directory for project
- ✅ Clear status indicators: "⚪ Not initialized", "⏳ Checking...", "✅ Ready"
- ✅ Project path shown: "📁 C:\path\to\project"
- ✅ File info shown: "agent/PROBLEMS.md • 5 issues parsed"

---

### 2026-05-08 — Tracker Mind Full Implementation (Initial)

**What Changed:**
1. ✅ **REMOVED** separate AgentDashboardPage from sidebar nav
2. ✅ **ADDED** "Problems" tab to Terminal workspace sidebar
3. ✅ **KEPT** ProblemsService.ts for markdown-based problem management
4. ✅ **UPDATED** TerminalPage.tsx with ProblemsTab component
   - Problems tab with filter (all/active/new/in-progress/fixed)
   - New Problem button
   - Click to view detail modal
   - Status change buttons
   - Send instructions to terminal (if assigned)
   - Auto-refresh every 5 seconds

**Files Modified:**
- `src/App.tsx` - Removed AgentDashboardPage import and route
- `src/pages/TerminalPage.tsx` - Added ProblemsTab tab button and content

**Why:**
- User wanted problems in the terminal workspace, not a separate page
- Problems tab integrates with existing workflow

**Result:**
- Build passes
- Problems accessible via Terminal page sidebar
- Agent Dashboard page removed from navigation

---

### 2026-05-07 — Tracker Mind Markdown Service

**What Changed:**
1. ✅ **CREATED** `src/services/ProblemsService.ts`
   - Reads/writes PROBLEMS.md directly (no database sync)
   - Methods: getProblems, createProblem, updateStatus, updateProblem
   - Auto-increments issue numbers, generates proper markdown output

2. ✅ **UPDATED** `src/main.ts`
   - Integrated ProblemsService with require()
   - IPC handlers now use ProblemsService instead of DB
   - Added tracker-mind-setup handler for setup modal
   - Added startup sync: loads problems on app ready

3. ✅ **CREATED** `src/components/TrackerMindSetup.tsx`
   - Modal with progress steps for initializing agent files
   - Steps: init-agent-dir, init-problems-md, init-requests-md, init-state-md, init-skills

4. ✅ **UPDATED** `src/pages/AgentDashboardPage.tsx`
   - Added Setup button in header (next to New Problem)
   - Shows TrackerMindSetup modal when clicked
   - After setup completes, refreshes problems list

5. ✅ **UPDATED** `src/App.tsx`
   - Fixed AgentDashboardPage route (was placeholder "disabled")

**Files Created:**
- `src/services/ProblemsService.ts` - Markdown-based problems management
- `src/components/TrackerMindSetup.tsx` - Setup modal component

**Files Modified:**
- `src/main.ts` - Added ProblemsService, setup handler, startup sync
- `src/preload.ts` - Added trackerMindSetup API
- `src/pages/AgentDashboardPage.tsx` - Added setup button and modal
- `src/App.tsx` - Fixed AgentDashboardPage route

**Why:**
- Simplified problems system: markdown is source of truth, no DB sync needed
- Setup button initializes agent directory structure
- Problems persist across restarts via markdown file

**Result:**
- Build passes successfully
- Problems read/write directly to agent/PROBLEMS.md
- Setup modal can initialize agent/ directory with all files
- Startup loads problems from markdown file

---

### 2026-05-07 (Phase 3) — Navigation State Handling & End-to-End Flow

**What Changed:**
1. ✅ **UPDATED** `src/pages/TerminalPage.tsx`
   - Added `useLocation` and `useNavigate` from `react-router-dom`
   - Added effect to handle navigation state from AgentDashboardPage
   - Handles `createTerminal` state: creates new terminal, spawns it, sends prompt, updates binding
   - Handles `focusTerminal` state: focuses existing terminal, sends prompt if provided
   - Clears navigation state after handling to prevent re-triggering
   - Added `handleLayoutChange` callback to fix runtime error
2. ✅ **FIXED** `src/App.tsx`
   - Added import for `AgentDashboardPage`
   - Fixed route `/agent-dashboard` to render `<AgentDashboardPage />` instead of placeholder
   - Agent Dashboard now accessible via sidebar nav

**Files Modified:**
- `src/pages/TerminalPage.tsx` - Added navigation state handling (lines ~77-100)

**Why:**
- Phase 3 completes the end-to-end flow: AgentDashboardPage → assign problem → TerminalPage receives prompt
- Enables creating new terminals with pre-filled prompts from problem assignments
- Enables focusing existing terminals and sending instructions

**Result:**
- Build passes successfully
- Navigation state properly handled in TerminalPage
- End-to-end flow ready for testing: create problem → assign → terminal receives prompt

---

### 2026-05-07 (Phase 2) — Terminal Integration & Assignment Flow

**What Changed:**
1. ✅ **NEW** IPC handlers for terminal binding management
   - `register-terminal` - Register new terminals
   - `update-terminal-binding` - Update terminal status/assignment
   - `unregister-terminal` - Mark terminal as closed
2. ✅ **NEW** `src/services/SessionContextService.ts` - Extract context from terminal output
3. ✅ **UPDATED** `src/pages/AgentDashboardPage.tsx`
   - Added `useNavigate` import for terminal navigation
   - Added terminal quick view at bottom (shows active terminals)
   - Terminal click navigates to `/terminal` with `focusTerminal` state
   - "Open Terminal Page" button for quick navigation
4. ✅ **UPDATED** `src/preload.ts` - Added 3 new API methods
   - `registerTerminal`, `updateTerminalBinding`, `unregisterTerminal`

**Files Created:**
- `src/services/SessionContextService.ts` - Terminal output parsing

**Files Modified:**
- `src/main.ts` - Added 3 IPC handlers (lines ~6600-6670)
- `src/preload.ts` - Added 3 API methods (lines ~305-310)
- `src/pages/AgentDashboardPage.tsx` - Added terminal quick view + navigation

**Why:**
- Phase 2 connects dashboard to terminal system
- Enables end-to-end problem assignment flow
- Terminal quick view shows real-time status in dashboard

**Result:**
- Build passes successfully
- Terminal quick view renders in Agent Dashboard
- IPC handlers ready for terminal registration
- SessionContextService can parse terminal output (files modified, status, etc.)

---

### 2026-05-07 (Phase 1) — Tracker Mind Implementation

**What Changed:**
1. ✅ **NEW** Database tables for Tracker Mind (6 tables)
   - `workspace_problems` - Problem tracking with status workflow
   - `problem_history` - Audit trail for problem changes
   - `terminal_bindings` - Terminal-to-problem assignments
   - `pending_actions` - Agent action queue
   - `workspace_requests` - Feature request tracking
   - `skill_templates` - Reusable skill definitions
2. ✅ **NEW** `src/services/ProblemsParser.ts` - Parse/generate PROBLEMS.md format
3. ✅ **NEW** `src/services/ProblemsSyncService.ts` - Bidirectional markdown↔DB sync
4. ✅ **NEW** IPC handlers (7 endpoints)
   - `get-problems`, `create-problem`, `update-problem-status`
   - `assign-problem-to-terminal`, `get-terminal-bindings`
   - `get-skills`, `sync-problems-md`
5. ✅ **NEW** `src/pages/AgentDashboardPage.tsx` - Agent control dashboard UI
6. ✅ Updated `src/preload.ts` - Added Tracker Mind API methods
7. ✅ Updated `src/App.tsx` - Added route and sidebar nav

**Files Modified:**
- `src/main.ts` - Added 6 DB tables + 7 IPC handlers
- `src/preload.ts` - Added 7 API methods
- `src/App.tsx` - Added import, route `/agent-dashboard`, sidebar button

**Files Created:**
- `src/services/ProblemsParser.ts` - Markdown parser
- `src/services/ProblemsSyncService.ts` - Sync service
- `src/pages/AgentDashboardPage.tsx` - Dashboard UI

**Backups Created:**
- `src/main.ts.backup`
- `src/preload.ts.backup`
- `src/App.tsx.backup`

**Why:**
- Implement Tracker Mind - AI agent orchestration layer for managing multiple coding agents
- Provides UI to track problems, assign to terminals, and monitor progress
- Integrates with existing PROBLEMS.md workflow

**Result:**
- Build passes successfully
- Database tables created on next app start
- Agent Dashboard accessible at `/agent-dashboard`
- Sidebar shows "Agent Dashboard" button with Terminal icon
- IPC endpoints ready for problem management

---

### 2026-05-06 (Part 9) — Inline Activity Detail View + Top Nav Period

**What Changed:**
1. ✅ **REPLACED** Popup activity detail with **inline view** below activity grid
   - Removed `selectedActivity` popup overlay (no more stopwatch popup for details)
   - Added `viewingActivity` inline section with stats, charts, and session list
   - Inline view shows: Today/Week/Total stats, 7-day bar chart, recent sessions
2. ✅ **INTEGRATED** `selectedPeriod` (top nav) with activity detail view
   - `filteredSessions` useMemo filters sessions based on `selectedPeriod`
   - Charts update when you switch between Today/Week/Month/All in top nav
   - Session list respects the current period selection
3. ✅ **FIXED** Activity button showing "--" instead of time
   - Button now uses `stats.byActivity[activity.name]?.total_seconds`
   - Simplified logic (removed complex case-insensitive matching)
   - Time displays properly on activity buttons
4. ✅ **ADDED** `getActivityStats` to `preload.ts`
   - IPC handler existed in `main.ts` but was never exposed to frontend
   - Now frontend can call `window.deskflowAPI.getActivityStats(activityId)`
5. ✅ **SIMPLIFIED** `showActivityDetails` function
   - Now just sets `viewingActivity` and loads sessions
   - Stats are computed from `filteredSessions` useMemo (not separate API call)
   - Much simpler data flow

**Files Modified:**
- `src/preload.ts` line 254 - Added `getActivityStats` API
- `src/pages/ExternalPage.tsx` line 518-545 - Removed popup, added inline view with `filteredSessions` and `viewingActivityStats`
- `src/pages/ExternalPage.tsx` line 755-800 - Activity grid now shows time on buttons
- `src/pages/ExternalPage.tsx` line 870-950 - New inline activity detail section (replaced old charts section)
- `agent/state.md` - Updated to version 1.94

**Why:**
- User wanted activity detail view to be **inline** (not popup) with multiple charts
- Needed to respect `selectedPeriod` from top nav (like Dashboard charts)
- Activity buttons weren't showing time ("--" always)
- `getActivityStats` IPC was implemented but never exposed in preload

**Result:**
- Click any activity → Inline detail view appears below the grid
- Switch period in top nav → Charts and stats update automatically
- Activity buttons now show time (e.g., "1.5h")
- 7-Day bar chart shows last 7 days for selected activity
- Session list shows filtered sessions based on period
- Build passes successfully

---

### 2026-05-06 (Part 8) — External Activity Stats + Detail View Restored

**What Changed:**
1. ✅ **FIXED** External activity button showing "--" instead of time
   - Added case-insensitive matching for `stats.byActivity` keys
   - Tries direct match first, then `toLowerCase()` comparison
   - Added debug logging to console in development mode
2. ✅ **FIXED** Activity breakdown chart not showing
   - Root cause: `stats.byActivity` was empty due to case mismatch or timing
   - Added fallback matching logic to handle case differences
3. ✅ **RESTORED** Activity detail view (View Stats feature)
   - Added `getActivityStats` to `preload.ts` (was missing - IPC existed but not exposed!)
   - Updated `viewActivityDetails` function to call `getActivityStats` when viewing activity
   - The detail panel now shows Today/This Week/This Month stats for individual activities
4. ✅ **IMPROVED** Activity stats display
   - Button now shows time if available (with fallback matching)
   - Detail panel renders when `viewingActivity` is set
   - Activity detail sessions load when double-clicking or clicking Eye button

**Files Modified:**
- `src/preload.ts` line 254 - Added `getActivityStats: (activityId: string) => ipcRenderer.invoke('get-activity-stats', activityId)`
- `src/pages/ExternalPage.tsx` line 518-530 - Updated `viewActivityDetails` to call `getActivityStats`
- `src/pages/ExternalPage.tsx` line 766-780 - Added case-insensitive matching for `stats.byActivity`
- `src/main.ts` line 6334-6370 - Verified `get-activity-stats` IPC handler exists and works

**Why:**
- `getActivityStats` IPC was implemented in main.ts but never exposed in preload.ts (so frontend couldn't call it)
- Activity detail view was "lost" because the data couldn't be fetched
- Button showed "--" because `stats.byActivity[activity.name]` didn't match due to case sensitivity
- Activity breakdown chart was empty because `stats.byActivity` appeared empty

**Result:**
- External activity buttons now show time (with fallback matching)
- Activity detail view is fully restored (Today/Week/Month stats)
- Eye button and double-click work to view activity details
- Sessions list and charts display correctly in detail panel
- Activity breakdown chart shows data if available
- Build passes successfully

---

### 2026-05-06 (Part 7) — Chart Layout Fixes + Period Label Updates

**What Changed:**
1. ✅ **FIXED** Chart not showing on initial app load
   - The chartBarsResult was not initialized with data on first render
   - Changed useEffect to run on mount (added `[]` as dependency initially) and trigger on `selectedPeriod` change
   - Now chart shows immediately when app starts
2. ✅ **FIXED** App Ecosystem period buttons were controlling Weekly Productivity
   - Removed `setPeriodOffset` from App Ecosystem section entirely
   - App Ecosystem now uses top nav period selector only (not separate controls)
   - Only keeps solar mode toggle (Apps/Websites)
3. ✅ **FIXED** Period label not updating with periodOffset
   - Changed label logic to show `periodOffset` value when not at 0
   - Shows "Today/This Week/This Month" when at current period (offset=0)
   - Shows "Week-1/Month-2" etc. when navigating to previous periods
4. ✅ **FIXED** Monthly view breaking layout
   - Increased container height from `h-48` (192px) to `minHeight: 240px`
   - Added dynamic height: `320px` for month/all views, `240px` for today/week
   - Chart bars now scale to maxHeight (200px for month, 160px for others)
5. ✅ **FIXED** Button placement - View Heatmap/Solar now at bottom
   - Moved buttons from BEFORE chart to AFTER chart (below legend)
   - Proper visual flow: Header → Period Controls → Chart → Button
6. ✅ **IMPROVED** App Ecosystem container
   - Removed period navigation buttons (kept only solar mode toggle)
   - Added period label display to show current timeline state
   - Increased chart container height to match Weekly Productivity

**Files Modified:**
- `src/pages/DashboardPage.tsx` line 710-745 - Fixed useEffect to initialize on mount
- `src/pages/DashboardPage.tsx` line 2155-2203 - Moved View Heatmap button after chart, fixed height
- `src/pages/DashboardPage.tsx` line 2235-2280 - Removed period nav from App Ecosystem, added label
- `src/pages/DashboardPage.tsx` line 2281-2320 - Moved View Solar System button after chart
- `src/pages/DashboardPage.tsx` - Updated period label logic to show offset

**Why:**
- Initial load showed empty chart because useEffect didn't trigger on mount
- App Ecosystem buttons were using same `setPeriodOffset` as Weekly Productivity (bug)
- Period label always showed "This Week" regardless of actual timeline position
- Monthly view (30 bars) overflowed fixed 192px height container
- Buttons were positioned before chart, pushing content down awkwardly

**Result:**
- Charts display immediately on app start
- Each container has independent controls (or shared top nav)
- Period labels accurately reflect timeline position (including offsets)
- Monthly/All views fit properly without overflow
- Buttons are at bottom of containers (proper visual hierarchy)
- Build passes successfully

---

### 2026-05-06 (Part 6) — Weekly Productivity UI + View Buttons + useMemo→useState Fix

**What Changed:**
1. ✅ **FIXED** Dashboard crash: "Cannot access 'Jt'/'bs' before initialization" error
   - Replaced useMemo with problematic object dependencies with useState + useEffect
   - Root cause: React's TDZ (temporal dead zone) when comparing complex objects in dependency array
   - Moved chartBarsResult computation to useEffect with only primitive deps ([selectedPeriod, periodOffset])
   - See `agent/skills/agent-reflect/logs/2026-05-06_useMemo_object_deps_TDZ.md` for analysis
2. ✅ **REMOVED** onclick handlers from charts themselves
   - Weekly Productivity chart: No longer opens heatmap on click
   - App Ecosystem chart: No longer opens solar system on click
   - Charts now display-only, controlled only via dedicated buttons
3. ✅ **ADDED** Dedicated view buttons
   - Weekly Productivity container now has "View Heatmap" button (full width, bottom)
   - App Ecosystem container now has "View Solar System" button (full width, bottom)
   - Buttons use consistent styling: `bg-zinc-900 hover:bg-zinc-800 border border-zinc-700`
4. ✅ **IMPROVED** Period selector usability
   - Both charts respond to top nav period selector changes
   - Data updates correctly for today/week/month/all periods

**Files Modified:**
- `src/pages/DashboardPage.tsx` line 710-787 - Replaced useMemo with useState + useEffect
- `src/pages/DashboardPage.tsx` line 2103-2166 - Removed onClick from Weekly Productivity, added View Heatmap button
- `src/pages/DashboardPage.tsx` line 2227-2323 - Removed onClick from App Ecosystem, added View Solar System button
- `agent/skills/agent-reflect/logs/2026-05-06_useMemo_object_deps_TDZ.md` - NEW reflection document
- `agent/debugging.md` - Added new pattern for useMemo object dependency issue
- `agent/AGENTS.md` - Added rule to replace useMemo with useState+useEffect for complex objects

**Why:**
- Dashboard was crashing due to React's initialization ordering bug with complex object dependencies
- Charts were opening on click, conflicting with data display purpose
- Users couldn't easily distinguish between viewing chart data vs opening full visualization
- Period selector changes weren't visually triggering chart recomputation

**Result:**
- Dashboard loads successfully, no TDZ errors
- Charts display data cleanly without click interactions
- Clear UI pattern: dedicated buttons for modal views
- Period selector works correctly for all timeline views
- Build passes successfully

---

### 2026-05-06 (Part 5) — Weekly Productivity Chart + Period Navigation

**What Changed:**
1. ✅ **FIXED** Weekly Productivity chart now follows topnav `selectedPeriod`
   - Added `periodOffset` state to track navigation (prev/next periods)
   - Chart data now computed via `useMemo` based on `selectedPeriod` + `periodOffset`
   - Supports 'today' (hourly), 'week' (7-day), 'month' (30-day), 'all' (monthly)
2. ✅ **ADDED** Period navigation buttons to Weekly Productivity chart
   - Previous/Next period buttons (like heatmap)
   - "Today" button to reset to current period
   - Label shows current period (Today/This Week/This Month)
3. ✅ **FIXED** External activity now shows in stacked bar chart
   - Device usage = bottom bar (green)
   - External activity = top bar (purple)
   - Properly stacked with correct heights
4. ✅ **ADDED** Period navigation to App Ecosystem (Solar System) chart
   - Same Previous/Next/Today buttons
   - Both charts now respond to `selectedPeriod` changes

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Added `periodOffset`, `chartExternalData` state
- `src/pages/DashboardPage.tsx` - Added effect to load external data for chart
- `src/pages/DashboardPage.tsx` - Added `chartBars`/`maxBarSeconds` useMemo
- `src/pages/DashboardPage.tsx` - Rewrote Weekly Productivity chart JSX
- `src/pages/DashboardPage.tsx` - Added navigation to App Ecosystem section

**Why:**
- Weekly Productivity chart was stuck on weekly view regardless of topnav selection
- External activity wasn't visible in the chart (only device usage shown)
- No way to see previous periods' data in dashboard charts
- App Ecosystem chart didn't follow timeline selector

**Result:**
- All dashboard charts now follow topnav timeline selector
- Users can navigate to previous/next periods
- External activity properly stacked on top of device usage in bar chart
- Build passes successfully

---

### 2026-05-06 (Part 4) — SQLite JS Migration Skill + Debugging Pattern Update

**What Changed:**
1. ✅ **UPDATED** `agent/debugging.md` - Better-SQLite3 section now prioritizes sql.js solution
   - Added sql.js (pure JS/WebAssembly) as preferred fix when native rebuild fails
   - No native bindings, works across all Node/Electron versions
   - Step-by-step migration pattern documented
2. ✅ **NEW** `agent/skills/sqlite-js-migration/SKILL.md` created
   - Complete skill for using sql.js to read SQLite databases
   - ES module (.mjs) format for projects with "type": "module"
   - Example code for reading, querying, and exporting data
3. ✅ **UPDATED** `agent/state.md` - This entry (mandatory documentation)

**Files Modified:**
- `agent/debugging.md` - Better-SQLite3 NODE_MODULE_VERSION Mismatch section updated
- `agent/skills/sqlite-js-migration/SKILL.md` - New skill created

**Why:**
- Native better-sqlite3 rebuild fails without Visual Studio Build Tools
- sql.js is pure JavaScript/WebAssembly - no native dependencies
- Cross-version compatibility needed for Node/Electron
- Project uses "type": "module" - need .mjs files for ES modules

**Result:**
- Future agents have clear pattern for SQLite migration when native modules fail
- No more wasted time on native rebuild attempts
- Skill documented for reuse

---

### 2026-05-06 (Part 8) — Fix sessionStartTime ReferenceError

**What Changed:**
1. ✅ **FIXED** `sessionStartTime` ReferenceError in DashboardPage.tsx
   - Line 330: Changed `startTime: sessionStartTime` → `startTime: productiveStartRef.current`
   - `sessionStartTime` was never defined, caused runtime error
   - `productiveStartRef.current` is the correct ref for productive timer start
2. ✅ **FIXED** Dependency array at line 345
   - Changed `sessionStartTime` → `productiveStartRef.current`
3. ✅ **FIXED** TerminalPage.tsx restored from git
   - File was corrupted with syntax errors (interfaces in JSX, extra `)`)
   - Ran `git checkout HEAD -- src/pages/TerminalPage.tsx`

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Fixed `productiveStartRef.current` reference (line 330, 345)
- `src/pages/TerminalPage.tsx` - Restored from git (was corrupted)

**Why:**
- `sessionStartTime` was used but never defined as a variable
- `productiveStartRef` is the correct ref that tracks when productive timer started
- Caused runtime error: "sessionStartTime is not defined"
- TerminalPage.tsx had syntax errors from previous edits

**Result:**
- Timer state persistence now works without ReferenceError
- Productive timer start time properly saved to localStorage and parent
- TerminalPage.tsx restored to working state

---

### 2026-05-06 (Part 7) — Weekly Chart Overflow Fix + TerminalPage Restore

**What Changed:**
1. ✅ **FIXED** Weekly Productivity chart now has horizontal scroll
   - Added `overflow-x-auto` to chart container (line 2156)
   - Changed `flex-1` to `flex-shrink-0` on bars (prevents squashing)
   - Labels truncated to 3 chars max (`bar.label.substring(0, 3)`)
2. ✅ **FIXED** Restored TerminalPage.tsx from git
   - File was corrupted with syntax errors (interfaces in JSX, extra `)`)
   - Ran `git checkout HEAD -- src/pages/TerminalPage.tsx`
3. ✅ **FIXED** App names in solar circles show FULL name (no truncation)

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Chart overflow fix (line 2156), bar styling (line 2160)
- `src/pages/TerminalPage.tsx` - Restored from git (was corrupted)

**Why:**
- Weekly chart overflowed div width (too many bars for daily/monthly view)
- TerminalPage.tsx had syntax errors from previous edits (interfaces in JSX)
- App names were truncated with `...` - user wanted full names

**Result:**
- Weekly chart scrolls horizontally if too many bars
- TerminalPage.tsx restored to working state
- App names fully visible in solar circles

---

### 2026-05-06 (Part 6) — Solar System Week Sync + Full App Names

**What Changed:**
1. ✅ **FIXED** Solar system now syncs with heatmap week
   - `computedSolarData` now uses `weekOffset` (same as heatmap)
   - Filters logs by `weekOffset` (line 1485-1496)
   - Previously used `selectedPeriod` which didn't match heatmap
2. ✅ **FIXED** App names in circles now show FULL name (no truncation)
   - Removed `leading-tight` and `truncate` 
   - Uses `px-2 text-center` for clean display
   - `title` attribute still shows full name + duration on hover
3. ✅ **FIXED** Heatmap shows 12-hour format (12a, 1a... 12p, 1p)
   - Labels every hour (AM/PM format)
   - Narrower column: `w-10` instead of `w-14`

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Solar system week sync (line 1480-1512), full app names (line 2258-2275)

**Why:**
- Solar system showed "current week" data while heatmap showed "previous week" (mismatch)
- App names were truncated with `...` - user wanted full names visible
- 24-hour format didn't fit in narrow heatmap columns

**Result:**
- Solar system + heatmap now show same week when switching weeks
- App names fully visible in circles (no more `...`)
- Heatmap shows 12-hour AM/PM format

**Still TODO:**
- Monthly view heatmap still shows 24 hours (user asked for "every 3 days" but heatmap is hourly)
- To change monthly to show fewer hours, modify `hourlyHeatmapData` loop (line 1060: `for (let hour = 0; hour < 24; hour++)`)

---

### 2026-05-06 (Part 4) — Fix Orbit Circle Labels + App Name Display

**What Changed:**
1. ✅ **FIXED** OrbitSystem label now has `maxWidth: 200px` and `textOverflow: 'ellipsis'`
   - Prevents labels from overflowing or being too squashed
   - Line 1580: Added `maxWidth` and `overflow: 'hidden'` with ellipsis
2. ✅ **FIXED** Dashboard solar system circles now show full app names
   - Changed `truncate` to `px-1 leading-tight` for better text display
   - Increased minimum circle size from 40px to 70px (line 2280)
   - App names now show up to 10 chars before truncating (was 8)
3. ✅ **FIXED** Variable name bug: `appsToShow` → `solar` (line 2279)
4. ✅ **FIXED** Heatmap external data field names (Part 3)
   - `session.start_time` → `session.started_at`
   - `session.end_time` → `session.ended_at`

**Files Modified:**
- `src/components/OrbitSystem.tsx` - Added maxWidth, overflow handling to labels
- `src/pages/DashboardPage.tsx` - Fixed circle sizing, text display, variable name

**Why:**
- Orbit labels were squashed (40px wide) with truncated text
- Dashboard circles had `truncate` class hiding app names
- Variable `appsToShow` didn't exist (should be `solar`)
- External sessions data had wrong field names

**Result:**
- Orbit labels show app names with ellipsis if too long
- Dashboard circles are bigger (min 70px) with readable text
- External heatmap data should now load correctly

---

### 2026-05-06 (Part 3) — Heatmap External Mode Fix + Day Click Bug

**What Changed:**
1. ✅ **FIXED** Heatmap external mode now shows data - fixed field name mismatch
   - `session.start_time` → `session.started_at` (line 553)
   - `session.end_time` → `session.ended_at` (line 554)
   - IPC handler returns `started_at`/`ended_at`, not `start_time`/`end_time`
2. ✅ **FIXED** `setDayDetailPopupDate is not defined` error
   - Removed non-existent function call at line 1031
   - Day click now just sets `selectedHeatmapHour` and loads day detail
3. ✅ **FIXED** Default period changed from `'today'` to `'week'` in App.tsx
   - More data visible on first load (9 sessions vs 3)

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Fixed field names (started_at/ended_at), removed undefined setDayDetailPopupDate call
- `src/App.tsx` - Changed default period from 'today' to 'week'

**Why:**
- External sessions data had wrong field names (start_time vs started_at)
- DashboardPage expected `start_time` but IPC returned `started_at`
- `setDayDetailPopupDate` was called but never defined → runtime error
- Default period 'today' showed less data (3 sessions) vs 'week' (9 sessions)

**Result:**
- Heatmap external mode should now show external activity data
- Day click no longer throws ReferenceError
- Default view shows more data (week period)

---

### 2026-05-06 (Part 2) — Critical Fix: Database Page Shows Data Even When SQLite Fails

**The Real Problem:**
- User reported "database page is empty" and "data not loading"
- Root cause: **SQLite initialization failed**, app fell back to JSON storage
- BUT: Database page was showing empty tables instead of JSON data
- Result: User saw NO data anywhere, even though JSON file had 22KB of logs

**What Changed:**
1. ✅ **FIXED** `get-database-tables` IPC handler now returns virtual "logs" table when in JSON mode
   - Before: `if (useJson) return { tables: [], type: 'json' }`  (empty array!)
   - After: `if (useJson) return { tables: ['logs'], type: 'json' }` (shows JSON data)
2. ✅ **FIXED** `get-table-data` IPC handler now returns JSON logs when requested
   - Before: `if (useJson) return { error: 'JSON mode' }` (no data!)
   - After: Checks if table is "logs", returns jsonLogs array
3. ✅ **FIXED** `get-table-schema` IPC handler now returns proper schema for JSON logs table
   - Before: `if (useJson) return { error: 'JSON mode' }` (no schema!)
   - After: Returns hardcoded schema matching JSON log structure

**Files Modified:**
- `src/main.ts` - 3 IPC handlers updated
  - Line ~2589: `get-table-schema` - Returns schema for JSON logs
  - Line ~2624: `get-table-data` - Returns JSON logs data
  - Line ~2635: `get-database-tables` - Returns virtual "logs" table

**Why This Happened:**
- App has fallback from SQLite to JSON when database fails
- This is GOOD for data survival
- BUT the UI layer (DatabasePage.tsx) wasn't updated to support showing JSON data
- IPC handlers just returned empty/error when JSON was active
- Database page saw no tables, so it displayed nothing

**Result:**
- Database page now shows JSON logs even when SQLite failed
- User can see all tracking data immediately (22KB+ of logs)
- When SQLite recovers, app automatically switches back to SQLite
- Data is never lost, always visible

**How It Works:**
1. App starts, tries to initialize SQLite
2. If SQLite fails → `useJson = true`, loads `deskflow-data.json`
3. DatabasePage requests tables → gets virtual ["logs"] table
4. User clicks "logs" table → sees all JSON entries in Database page
5. All dashboard stats, recent sessions, etc. work normally

---

### 2026-05-06 — Database Connection Hardening: Critical Functions Fixed

**What Changed:**
1. ✅ **FIXED** `getLogs()` now uses `getDb()` helper instead of direct `db` access
   - Prevents crashes if database connection becomes null
   - Added null check with graceful error message
2. ✅ **FIXED** `getStats()` now uses `getDb()` helper
   - Same null safety as getLogs()
   - Prevents returning empty array when db is null
3. ✅ **FIXED** `loadTrackingSettings()` now uses `getDb()` helper
   - Gracefully handles database unavailability
   - Won't crash on app startup if db initialization fails
4. ✅ **FIXED** `addLog()` now uses `getDb()` helper
   - Core logging function now resilient to null db
   - Prevents silent failures during tracking
5. ✅ **FIXED** `updateAggregates()` now uses `getDb()` helper
   - Updates daily stats/aggregates safely
   - Won't crash if database connection is lost

**Files Modified:**
- `src/main.ts` - Updated 5 critical functions to use `getDb()` helper
  - Line ~1830: `addLog()` - Uses `getDb()` before all db operations
  - Line ~1876: `updateAggregates()` - Uses `getDb()` before all db operations
  - Line ~1929: `getLogs()` - Uses `getDb()` before all db operations
  - Line ~1957: `getStats()` - Uses `getDb()` before all db operations
  - Line ~2026: `loadTrackingSettings()` - Uses `getDb()` before all db operations

**Why:**
- Database was disconnecting from app because critical functions used global `db` variable without checking if it was null
- If `db` became null (due to initialization error or other issue), functions would crash silently
- No proper fallback mechanism existed

**Root Cause:**
- Global `db` variable initialized to `null` at line 1343
- Functions like `getLogs()`, `getStats()`, `addLog()` used `db` directly without null checks
- `getDb()` helper existed but wasn't used by all database operations
- If any function using `db` ran before initialization completed, it would crash

**Result:**
- Critical database functions are now resilient to null db connection
- Proper error logging when database is unavailable
- App can gracefully fall back to JSON storage or recover connection
- Build passes with no compilation errors

**Note:** This fix hardens 5 most-critical functions. There are ~200+ db usages in main.ts. Most are in IPC handlers which have try/catch. These 5 were fixed because they run frequently during normal tracking and are core to app functionality.

---

### 2026-05-05 (Part 5) — Self-heal SQLite + ExternalPage Fix

**What Changed:**
1. ✅ **FIXED** `better-sqlite3` reinstalled - correct Node.js binary
   - `npm install better-sqlite3@latest --force` fixed NODE_MODULE_VERSION mismatch
   - Database now has 11 external activities, 63 sessions
2. ✅ **FIXED** Added `getDb()` self-heal function in `main.ts`
   - Tries to reconnect to SQLite on each API call if `db` is null
   - Fixes running app that had `db=null` from earlier SQLite failure
3. ✅ **FIXED** All external handlers now use `getDb()` instead of `useJson` check
   - `get-external-activities`, `get-external-stats`, `get-external-sessions`, etc.
   - Handlers now self-heal instead of returning empty data
4. ✅ **FIXED** ExternalPage now uses top nav period
   - Removed duplicate period selector from ExternalPage header
   - Removed activity filter dropdown
   - Charts respect `selectedPeriod` prop from App.tsx
5. ✅ **FIXED** ExternalPage `getDb()` self-heal in compiled output
   - `dist-electron/main.cjs` now has `getDb()` function
   - Running app can now recover without restart (in theory)

**Files Modified:**
- `src/main.ts` - Added `getDb()` self-heal, changed all external handlers to use it
- `src/pages/ExternalPage.tsx` - Removed period selector, removed activity filter, uses top nav period
- `src/App.tsx` - ExternalPage route passes `selectedPeriod` prop

**Why:**
- `better-sqlite3` was compiled for different Node.js version → SQLite failed → `db=null` → all external API calls returned empty
- ExternalPage had duplicate period selector (was redundant with top nav)
- Activity filter dropdown was requested to be removed

**Result:**
- Database works: 11 activities, 63 sessions
- Self-heal code compiles correctly
- ExternalPage charts should now show data after restart
- No more duplicate period selectors

---

### 2026-05-06 — Startup Fix: refreshStats Error + Window Show

## 📝 Recent Changes

### 2026-05-06 — Startup Fix: refreshStats Error + Window Show

**What Changed:**
1. ✅ **FIXED** `refreshStats is not defined` error in ExternalPage.tsx
   - Added missing `refreshStats` function definition with `useCallback`
   - Loads external stats, consistency score, and sleep trends
   - Function called on stopActivity, confirmWakeUp, and addManualSleep
2. ✅ **FIXED** App startup now always shows window
   - Removed condition that skipped window creation when `--minimized` flag was set
   - Window now shows immediately on startup (then hides if minimized flag is set)
3. ✅ **FIXED** Better dev/prod detection in main.ts
   - Now checks `app.isPackaged` before loading dev server
   - Only loads VITE_DEV_SERVER_URL if app is NOT packaged AND URL starts with 'http'

**Files Modified:**
- `src/pages/ExternalPage.tsx` - Added `refreshStats` function definition (lines ~191-208)
- `src/main.ts` - Fixed startup window show logic (lines ~2357-2381, ~6630-6645)

**Why:** 

### 2026-05-13 — Weekly Trend Chart Now Responsive to Timeline Selector

**What Changed:**
1. ✅ Added `allSessions` state to fetch period-responsive session data
2. ✅ Replaced static `consistencyChartData` with dynamic `trendChartData` computed from sessions per period
   - `today` → 24 hourly bars with AM/PM labels
   - `week` → 7 daily bars with day names
   - `month` → daily bars for each day of the month
   - `all` → monthly bars with month/year labels
3. ✅ Chart title now changes dynamically: Hourly Trend / Weekly Trend / Monthly Trend / All Time Trend
4. ✅ Added session fetch to `refreshStats` callback so chart updates after data changes

**Files Modified:**
- `src/pages/ExternalPage.tsx` — Added `allSessions` state + fetch, replaced `consistencyChartData` with `trendChartData` useMemo, dynamic title, updated `refreshStats`

**Result:** The Usage Trend chart (third in the 3-chart grid) now shows period-appropriate data when the user clicks Today/Week/Month/All in the top navigation, matching behavior of other charts on the page.

**Build:** ✅ Passes

- `refreshStats` was called but never defined, causing ExternalPage to crash on load
- Startup condition was hiding window when `--minimized` flag was passed

**Result:** 
- App now starts and shows the UI properly
- No more `refreshStats is not defined` error
- Build passes, no compilation errors

---

### 2026-05-05 (Part 3) — Heatmap Fix: Data Loading + Alignment

**What Changed:**
1. ✅ **FIXED** Heatmap now shows data (was empty before)
   - Changed `hourlyHeatmapData` to use **last 7 days** (matching Weekly Overview)
   - Removed `weekOffset` dependency - heatmap always shows last 7 days
   - Uses `sevenDaysAgo` filter (same as Weekly Overview at line 744)
2. ✅ **FIXED** Day headers now properly aligned with heatmap grid columns
   - Restructured layout: day headers in own row, mode toggle below
   - Added `w-14 flex-shrink-0` spacer to match time column width
3. ✅ **FIXED** Activity heatmap (Weekly Overview preview) now shows data
   - Uses same `heatmapData` as expanded heatmap
   - `heatmapData` always uses `hourlyHeatmapData` (168 cells always returned)
4. ✅ **VERIFIED** Click panel shows on click and stays
   - `selectedHeatmapHour` state tracks clicked hour
   - Panel renders below heatmap, dismisses on re-click or close button
5. ✅ **VERIFIED** Default mode = external (not device)
   - `heatmapMode` default changed from `'combined'` to `'external'`
6. ✅ **VERIFIED** Combined mode colors external differently
   - External-only cells: purple color scheme
   - Device-only cells: red-green productivity colors
   - Both present: max duration with blended coloring

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Fixed data loading, alignment, verified click behavior
  - Line ~830-905: `hourlyHeatmapData` now uses last 7 days (not weekOffset)
  - Line ~908: `heatmapData` always uses `hourlyHeatmapData`
  - Line ~1018-1044: Restructured day headers + mode toggle layout
  - Line ~308: `heatmapMode` default now `'external'`

**Why:** 
- Heatmap wasn't showing because `hourlyHeatmapData` used `weekOffset` (specific week) but `allLogs` covers last 7 days (different date range)
- Fix: Align heatmap data source with Weekly Overview (both use last 7 days)

**Result:** 
- Heatmap now shows data (matching Weekly Overview)
- Day headers properly aligned with grid columns
- Activity heatmap preview shows data
- Build passes, no compilation errors

### Previous Changes (2026-05-05 Part 2) — Heatmap Fix: Alignment + Data Display

**What Changed:**
1. ✅ **FIXED** Day headers now properly aligned with heatmap grid columns
   - Restructured layout: day headers in own row, mode toggle below
   - Added `w-14 flex-shrink-0` spacer to match time column width
2. ✅ **FIXED** Heatmap now ALWAYS shows (even with no data)
   - Changed `heatmapData` to always use `hourlyHeatmapData` (no fallback to empty array)
   - 168 cells (7 days × 24 hours) always rendered, gray if no data
3. ✅ **FIXED** Debug logs added for troubleshooting
   - `[Heatmap] Rendering, allLogs: X, externalData size: Y`
   - `[Dashboard] allLogs length: X, hourlyHeatmapData length: Y`
4. ✅ **VERIFIED** Click panel shows on click and stays
   - `selectedHeatmapHour` state tracks clicked hour
   - Panel renders below heatmap, dismisses on re-click or close button
5. ✅ **VERIFIED** Default mode = external (not device)
   - `heatmapMode` default changed from `'combined'` to `'external'`
6. ✅ **VERIFIED** Combined mode colors external differently
   - External-only cells: purple color scheme
   - Device-only cells: red-green productivity colors
   - Both present: max duration with blended coloring

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Fixed alignment, data display, verified click behavior
  - Line ~308: `heatmapMode` default now `'external'`
  - Line ~908: `heatmapData` always uses `hourlyHeatmapData`
  - Line ~1018-1044: Restructured day headers + mode toggle layout
  - Line ~922: Added debug log for rendering
  - Line ~1234: Added debug log for data length

**Why:** User reported heatmap not showing anything. Root cause: `heatmapData` fell back to empty array `[]` when `allLogs` was empty. Fix: always render 168 cells.

**Result:** Heatmap now always visible (gray cells if no data), day headers aligned with columns.

### Previous Changes (2026-05-05 Part 1) — Heatmap Refactor

**What Changed:**
1. ✅ **REMOVED** Chart type toggle dropdown (Stats Only/Bar/Line/Calendar) - charts always visible now
2. ✅ **REMOVED** Tab switcher (Stats/Bar/Line/Calendar buttons) - simplified to single chart view
3. ✅ **NEW** Charts always show as bar chart, respecting period selector (Day/Week/Month/All)
4. ✅ **NEW** Quick activity filter dropdown in header - view specific activity without navigating
5. ✅ **FIXED** Activity breakdown chart now properly shows all activities
6. ✅ **FIXED** Sleep feature now works correctly with proper session tracking
7. ✅ **REMOVED** "Charts" toggle button - charts always visible
8. ✅ **UPDATED** ActivityDetailPanel simplified - removed chart preference management

**Files Modified:**
- `src/pages/ExternalPage.tsx` - Complete overhaul: removed ChartCustomizer, tabs, simplified chart logic
- `src/main.ts` - Verified getActivitySessions supports period parameter
- `agent/state.md` - Updated version to 1.83

**Why:** User requested simpler External page - charts should always be visible, no need for toggles. Activity breakdown wasn't working, sleep feature was broken.

**Result:** Cleaner External page with always-visible charts, quick activity filter, working sleep tracking.
4. ✅ **ENHANCED** Hover tooltip redesigned
   - Shows only: Time header + "📱 Device: Xm" + "🎮 External: Ym"
   - Positioned at `(hour * 26 + 50)px` from top
   - Hovered cell state tracks both device and external seconds
5. ✅ **NEW** Click detail panel (appears below heatmap on hour select)
   - Device total time (large card)
   - External total time + per-activity breakdown (sorted by duration)
   - Clean grid layout with activity icons and colors
   - Closes when clicking elsewhere or selecting new hour
6. ✅ **EXISTING** Day label navigation already functional
   - `handleHeatmapDayClick` navigates to daily detail page
   - `DayDetailPopup` component shows hourly breakdown, stats, timeline
7. ✅ **VERIFIED** Color blending logic for combined mode
   - Uses max(device, external) duration with averaged productivity
   - User can refine blend logic if needed

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Heatmap refactor (~2400 lines)
  - Line ~220: HeatmapCell interface extension
  - Line ~280-320: getHeatColor() function update for mode-based selection
  - Line ~330-360: getHeatColorIntensity() for combined mode blending
  - Line ~343-369: handleHeatmapDayClick for day navigation
  - Line ~401-450: External data loading useEffect
  - Line ~1001-1050: hourlyHeatmapData useMemo with device/external aggregation
  - Line ~1100-1200: Hover tooltip rendering (device + external breakdown)
  - Line ~1200-1300: Click detail panel rendering
  - Line ~2100-2200: Mode toggle button UI

**Data Flow:**
1. External sessions load via IPC → stored in `externalHourlyData` Map
2. Device logs + browser sessions already aggregated in existing logic
3. Heatmap color selected via `getHeatColor(mode, cell)` branching
4. Click → hover state updated → detail panel shows breakdown

**Result:**
- Heatmap now shows device and external activity with mode toggle
- Hover reveals breakdown; click shows full detail panel
- Day navigation to daily detail page already exists and works
- Build passes, no compilation errors

**Verified Working:**
- npm run build succeeds
- HeatmapCell interface properly extended
- Device/external aggregation in hourlyHeatmapData
- Mode toggle button renders
- Hover tooltip displays correct data
- Click detail panel shows breakdown
- Day navigation opens DayDetailPopup

### Previous Changes (2026-05-03 and earlier)

### 2026-05-03 (Part 3) — Complete Workspace Page Overhaul

**What Changed:**
13. ✅ **NEW** Sidebar tabs expanded from 4 to 7: Presets, Sessions, Todos, Files, Prompts, Map, Analytics
14. ✅ **NEW** TODO system: Add/toggle/delete todos with priority levels (low/medium/high). Per-project filtering.
15. ✅ **NEW** Agent file viewer: Browse `agent/` directory, view markdown files (state.md, PROBLEMS.md, etc.), navigate subdirectories
16. ✅ **NEW** Prompt engineering workspace: Save reusable prompts and formatting templates. Copy to clipboard or insert directly into active terminal.
17. ✅ **NEW** Chat context / session history: Click any session to view message history as chat bubbles. Supports OpenCode (SQLite), Claude Code (JSONL), Codex (JSONL).
18. ✅ **NEW** Start/Resume chat buttons: Launch AI agent (claude/opencode/codex) directly in terminal from Sessions tab
19. ✅ **FIXED** Presets now execute in active terminal (not hardcoded 'term-initial'). Active terminal tracking via `onActiveTerminalChange` callback.
20. ✅ **FIXED** Project path now passed via `projectPath` prop from IDEProjectsPage, ensuring terminal opens in correct directory

### 2026-05-03 (Part 4) — Critical Bug Fixes

**What Changed:**
21. ✅ **FIXED** `spawnedTerminals` was a **module-level global Set** that persisted across project switches. New terminals would never spawn after switching projects because the Set still contained old terminal IDs. **Fix:** Replaced with `useRef(new Set())` inside `TerminalLayout` + auto-clear when `defaultCwd` changes.
22. ✅ **FIXED** Agent files showed empty because path resolution was wrong: `__dirname/../..` went outside the project in the built app. **Fix:** Changed to `__dirname/..` which correctly resolves to `project-root/agent`.
23. ✅ **FIXED** Diagnostic timeout "No shell data after 5s" was a **symptom** of the spawn bug above. Now that spawn works, it only shows on genuine failures.
24. ✅ **FIXED** Closed panes now remove their terminal IDs from spawn tracking, allowing re-spawn if needed.
25. ✅ **FIXED** New split panes now auto-focus (active terminal switches to the new pane).

**Files Modified:**
- `src/components/TerminalWindow.tsx` - `spawnedTerminalsRef` inside component, clear on CWD change, cleanup on pane close
- `src/main.ts` - Agent file path fixed from `../..` to `..`

**Root Cause Summary:**
The global `spawnedTerminals` Set was the single cause of:
- "No shell data after 5s" when switching projects
- Inability to open multiple terminals reliably
- Presets appearing to not work (they wrote to a dead terminal)

### 2026-05-03 (Part 5) — AI Agent Selector & Button Fix

**What Changed:**
26. ✅ **FIXED** "New Terminal" button was hidden inside `{projects.length > 0}` conditional — it only appeared if projects loaded. **Fix:** Moved outside conditional so it's always visible.
27. ✅ **NEW** AI Agent selector dropdown in header: OpenCode, Claude Code, Codex, Aider, Cursor. Selection persists in localStorage.
28. ✅ **FIXED** "Start New Chat" buttons were hardcoded to `'claude'`. **Fix:** Now uses the selected agent from the dropdown.
29. ✅ **NEW** "Start Chat" button added directly to header for quick access.
30. ✅ **FIXED** Session list "Start" buttons now use the selected agent instead of the session's original agent.

**Files Modified:**
- `src/pages/TerminalPage.tsx` - Header rewritten with agent selector, New Terminal button always visible, Start Chat connected to selected agent

### 2026-05-03 (Part 6) — Multiple Fixes & Features (STILL BROKEN)

**What Changed:**
31. ✅ **FIXED** Files tab was hardcoded to DeskFlow's `agent/` directory. **Fix:** Now reads from the currently selected project's path.
32. ✅ **FIXED** Active terminal ID was hardcoded to `'term-initial'`. **Fix:** `TerminalLayout` now reports the actual first terminal ID from the layout tree on mount.
33. ✅ **FIXED** Runtime error: `Cannot read properties of null (reading 'type')` at line 307. **Fix:** `flattenPanes` now handles null input.
34. ✅ **FIXED** Default layout no longer creates `term-initial` automatically. **Fix:** `useTerminalLayout` returns `null` instead of default layout.
35. ✅ **NEW** Project switcher with ← → arrow buttons in header.
36. ✅ **NEW** Terminal tabs bar with close button (×) always visible.
37. ✅ **NEW** Close button calls `terminalAPI.destroy()` to kill terminal process.
38. ✅ **NEW** Minimize button in header to collapse sidebar.
39. ✅ **NEW** Workspace Save/Load feature (IPC handlers + UI). Save to project or global scope.

**Still Broken (User-Reported - NEEDS TESTING):**
- ❌ Two terminals show on startup (should be one) - Fixed default layout, needs test
- ❌ New terminal button might not spawn shell - needs test
- ❌ Start Chat might not write to correct terminal - needs test
- ❌ Terminal close button needs test

**Files Modified:**
- `src/pages/TerminalPage.tsx` - Project arrows, terminal tabs with close button, workspace UI, fixed flattenPanes null handling
- `src/components/TerminalWindow.tsx` - Close pane kills terminal process via IPC
- `src/hooks/useTerminalLayout.ts` - Returns null instead of default layout
- `src/main.ts` - Added `workspace:save` and `workspace:load` IPC handlers
- `src/preload.ts` - Added `saveWorkspace` and `loadWorkspace` APIs

### 2026-05-03 (Part 1 & 2) — Terminal Fixes
(See previous state.md entries for terminal buffering, localStorage bug, IPC leak fixes)

## 📚 Reference

### New IPC Endpoints (Workspace)
- `get-workspace-todos` / `add-workspace-todo` / `toggle-workspace-todo` / `delete-workspace-todo`
- `get-prompt-templates` / `save-prompt-template` / `delete-prompt-template`
- `read-agent-file` / `list-agent-files`
- `get-session-messages` - Read chat history from AI tool storage

### Database Tables
- `terminal_layouts` - Saved pane layouts
- `terminal_presets` - Command presets
- `terminal_sessions` - AI chat sessions
- `workspace_todos` - **NEW** Task items
- `prompt_templates` - **NEW** Reusable prompts

## 🎯 Next Steps / TODO
- [ ] User test terminal splitting (create/close panes in both leaf and split layouts)
- [ ] User test TODO CRUD operations
- [ ] User test agent file browsing
- [ ] User test prompt copy/insert
- [ ] User test session message viewing
- [ ] Future: Terminal split resize dragging
- [ ] Future: Real-time session message sync
- [ ] Future: File-based prompt storage in agent/docs/

## ⚠️ Known Issues & Limitations
- Terminal split resize is visual only (no actual pane size update yet)
- Session messages load once on click (not real-time)
- Prompt storage is SQLite only (not file-based yet)
- Agent file viewer is read-only (no edit capability)

## Bugs Fixed (2026-05-14, Prompt 6)

### 1. closeTerminal broken for split pane layouts
**File:** `src/pages/TerminalPage.tsx:731`
**Problem:** When closing a terminal pane in a split layout, the layout tree was never updated — `closeTerminal` only handled `terminalLayout.type === 'leaf'`. After closing, the stale layout still referenced the closed terminalId, causing dead panes to render.
**Fix:** Added `else if (terminalLayout.type === 'split')` branch that calls `removePane()` to surgically remove the closed terminal from the split tree and save the updated layout.
**Imported:** `removePane` from `TerminalWindow.tsx`.

### 2. get-skills IPC handler didn't read file content
**File:** `src/main.ts:8141`
**Problem:** The `get-skills` handler only listed skill filenames and generated a name/description — it never read the actual `.md` file content. The `content` field was always `undefined`.
**Fix:** Added `fs.readFileSync` to read each skill file and include its full content in the response.

### 3. InstructionPanel generatePrompt missing skill.content
**File:** `src/components/InstructionPanel.tsx:70`
**Problem:** Even if skill content were available, `generatePrompt()` only included `skill.name` and `skill.description` — never `skill.content`.
**Fix:** Appended `skill.content` to the skill section of the generated prompt when present.

### 4. initializeTerminal completely ignored session config
**File:** `src/pages/TerminalPage.tsx:216`
**Problem:** The NewSessionDialog collected init file selection, custom system prompt, and problem/request IDs, but `initializeTerminal` always read the default `INITIALIZE.md` from the project path and never used any of the user's selections from the dialog. Session config was saved to JSON but never read back.
**Fix:** Added `initContent` and `systemPrompt` parameters to `initializeTerminal`. If provided, they override the defaults. The `onCreate` handler now resolves init file content (`includeDefaultInit` + `initializeFile`), reads custom system prompt, appends problem/request context, and passes everything to `initializeTerminal`. Existing terminal path also sends context.

### 5. No IPC endpoint to read custom init file content
**File:** `src/main.ts:5469`, `src/preload.ts:249`
**Problem:** `list-init-files` only searched `projectPath/agent/` for files starting with `init`, missing the default `Initialize.md` and other markdown files. There was no way to read a specific init file's content from the renderer.
**Fix:** Added `read-init-file` IPC handler that searches both `userDataPath/agent/` and `projectPath/agent/`. Added `readInitFile` to preload.ts. Updated `list-init-files` to merge markdown files from both directories.

---

### 2026-05-07 (Part 10) — Stopwatch Fix + Build Script Fix

**What Changed:**
1. ✅ **FIXED** "Cannot access 'Ee' before initialization" runtime error at DashboardPage.tsx line 796
   - Root cause: `isCurrentlyProductive` and `isDistracting` defined at line 1536, but `displayTime` memo at line 791 referenced them
   - Fix: Moved definitions to line 188 (right after `lastTier` and `isPaused` are defined)
   - Removed duplicate definitions at original location (lines 1538-1539)
2. ✅ **FIXED** Build script failing to copy ProblemsService.js
   - Root cause: `dist-electron/services/` directory didn't exist
   - Fix: Added `if not exist dist-electron\services mkdir dist-electron\services` to build:electron script
3. ✅ **FIXED** Stopwatch not starting when switching from external to productive app
   - Root cause: `sessionStartTime` never updated when new productive app started
   - Fix: Added `productiveStartRef` (useRef) + `productiveIntervalRef` for timer management
   - Timer now starts when `isCurrentlyProductive` becomes true
   - `lastTier` now updates when app switches (line 474: `setLastTier(tier)`)
4. ✅ **FIXED** Stopwatch display logic - now adaptive
   - Prioritizes productive time if app is active (`isCurrentlyProductive` check first)
   - Shows external only if no productive app running
   - Falls back to distracting/idle state
5. ✅ **VERIFIED** Build succeeds with all fixes
6. ✅ **FIXED** TerminalPage.tsx corrupted - restored via `git checkout --`

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Moved `isCurrentlyProductive`/`isDistracting` to line 188, rewrote stopwatch logic with refs, added `setLastTier(tier)` on app switch
- `package.json` - Updated build:electron to create services directory before copy
- `src/pages/TerminalPage.tsx` - Restored from git (was corrupted)

**Why:**
- `const` variables in JavaScript aren't initialized until their declaration is reached in execution order
- `displayTime` memo was trying to access `isCurrentlyProductive` and `isDistracting` before they were declared
- `sessionStartTime` state wasn't being updated when apps switched - timer never started
- Build script assumed directory existed, but it wasn't created during TypeScript compilation

**Result:**
- Runtime error "Cannot access 'Ee' before initialization" should be fixed
- Stopwatch should now start when switching from external activity to productive app
- Adaptive display: shows productive time when app is active, external when no app
- Build completes successfully: renderer (vite) + electron (tsc) both pass

---

### 2026-05-07 (Part 11) — Stopwatch COMPLETELY Rewritten

**What Changed:**
1. ✅ **REWROTE** Stopwatch logic from scratch - single timer handles both cases
   - Single `stopwatchTimerRef` + `stopwatchStartRef` for both productive and external
   - Timer automatically starts when productive app detected OR external session active
   - Clears and restarts when switching between external ↔ productive
2. ✅ **FIXED** Timer never starting when switching from external to app
   - Old logic: Multiple refs, multiple intervals, complex state dependencies
   - New logic: Simple useEffect that restarts timer when deps change
   - Dependencies: `[currentApp, currentWebsite, isInBrowser, lastNonBrowserApp, isPaused, externalSessionRunning, externalSessionStart]`
3. ✅ **FIXED** `displayTime` memo now uses inline productive check
   - No longer depends on stale `isCurrentlyProductive` state
   - Computes `isProductive` inline from current props
4. ✅ **REMOVED** Unused refs: `productiveStartRef`, `isCurrentlyProductive`, `isDistracting`
5. ✅ **VERIFIED** Build succeeds

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Complete rewrite of stopwatch logic (~40 lines replaced with ~50 lines simpler code)

**Why This Works:**
- Timer restarts whenever app/website/external state changes
- `stopwatchStartRef` tracks actual start time (not state, so no async issues)
- `stopwatchTimerRef` manages interval cleanup properly
- External takes priority in display (user preference)

**Result:**
- Start external → timer shows purple external countdown
- Switch to productive app → timer switches to productive time
- Switch back to external → timer shows external again
- Build passes successfully

### 2026-05-07 (Part 13) — App Ecosystem Fixed

**What Changed:**
1. ✅ **FIXED** App Ecosystem not matching External Page data
   - Root cause: `solar` variable was checking `solarSystemData.length > 0` first
   - `solarSystemData` prop was never being set, so it always used fallback/default data
   - Now uses `computedSolarData` directly which filters by `selectedPeriod` + `periodOffset`
2. ✅ **FIXED** App Ecosystem now shows data for different timelines
   - `computedSolarData` already uses `selectedPeriod` + `periodOffset` (same as chart)
   - Now `solar` uses `computedSolarData` directly instead of checking `solarSystemData`
   - Website mode uses `computedWebsiteData` (also fixed to use selectedPeriod)
3. ✅ **VERIFIED** Build passes (renderer)

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Changed `solar` logic to use `computedSolarData` directly

**Why:**
- User said: "ITS SUPPOSED TO BE MATCHING THE EXTERNAL PAGE. ITS THE SAME TRACKER APP WHY IS THE DATA FUCKING DIFFERENT EVERYWHERE"
- `solarSystemData` prop was never populated, so App Ecosystem always showed default/placeholder data
- Now uses `computedSolarData` which actually filters by the selected period

**Result:**
- App Ecosystem now shows apps sorted by usage for the selected period (today/week/month/all)
- Data matches what the chart shows (same filtering logic)
- Build passes successfully

---

### 2026-05-07 (Part 12) — Chart Fix: periodOffset Direction

**What Changed:**
1. ✅ **FIXED** Chart doesn't work for week-2 and before
   - Root cause: `periodOffset` was ADDING time (going forward) instead of subtracting (going back)
   - Changed: `targetWeekStart = new Date(currentWeekStart.getTime() - (periodOffset * 7 * 24 * 60 * 60 * 1000))`
   - Was: `+ (periodOffset...)` which went FORWARD in time
2. ✅ **FIXED** Chart loads wrong thing initially
   - Added `allLogs` and `heatmapData` to chart computation deps
   - Chart now recomputes when logs or heatmap data changes
   - Uses `allLogs` to compute device seconds (not just `heatmapData`)
3. ✅ **FIXED** Month view uses `allLogs` with proper date filtering
   - Filters logs by `dayStart <= timestamp <= dayEnd`
   - Converts `duration_ms` or `duration * 1000` to seconds
4. ✅ **FIXED** Bar chart spacing for monthly view
   - Changed from flex-1 to fixed minWidth per bar
   - Month bars: 24px width, Week bars: 40px width, Today bars: 28px width
   - Added `overflow-x-auto` for scrolling on month view
   - Simplified labels (no truncation) - shows full "Mon", "Tue", etc.
   - Removed redundant time display below each bar
5. ✅ **FIXED** TDZ error "Cannot access 'Ue' before initialization"
   - Removed `heatmapData` from deps (declared at line 1223, used at line 855)
   - Changed "today" chart to compute directly from `allLogs`
6. ✅ **VERIFIED** Build succeeds

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Fixed `periodOffset` direction, bar chart styling for month view, removed TDZ issue

**Why:**
- User said: "THE ONES ON THE DASHBOARD THE CHART STILL DOESN'T WORK. IT STILL LOADS THE WRONG THING INITIALLY AND ALSO IT DOESN'T WORK FOR WEEK-2 and before"
- User said: "THE SPACING FOR THE FUCKING MONTHLY INSTEAD OF SHOWING THE PROPERLY OF 29 30 FOR EXAMPLE, IT SHOWS 2 39 0"
- `periodOffset` with positive values should go BACK in time (week-1 = last week, week-2 = two weeks ago)
- Chart bars were cramped with `flex-1` and truncation, now fixed with proper widths

**Result:**
- Week-1 shows last week's data
- Week-2 shows two weeks ago
- Month view bars properly spaced with full labels (1, 2, ... 29, 30)
- Chart recomputes when logs change
- Build passes successfully

---

### 2026-05-10 — Typical Day Full Redesign: 24x7 Heatmap + Multi-Activity Algorithm

**What Changed:**
1. ✅ **REPLACED** `get-typical-day` IPC handler (`src/main.ts:6556-6583`) with new algorithm:
   - **Merges both data sources**: external_sessions (JOIN external_activities for name) + device logs (`logs` table)
   - **Splits external sessions across hours** they span (like Dashboard heatmap)
   - **Builds a 7×24 grid** (7 days × 24 hours) instead of a single 24-item array
   - **Normalizes by week count** (`days / 7`) — per-day averages, not raw totals
   - **Multi-activity per cell** — all activities above 10% or 60s threshold are kept
   - **Returns** `{ grid, legend, stats, generatedAt, daysCovered }` with per-activity percentages and colors
   - **Activity color mapping** via `ACTIVITY_COLORS` constant (Sleep=purple, Study=blue, etc.)
   - **Error/empty returns** use `emptyTypicalDayGrid()` helper for consistent structure

2. ✅ **REPLACED** Typical Day UI section (`src/pages/InsightsPage.tsx:258-348`):
   - **24×7 heatmap grid** — 7 rows (Sun-Sat) × 24 columns (hours) with 14×14px cells
   - **Multi-activity cells** — single activity = emerald intensity gradient; multiple = stacked color gradient
   - **Small indicator dots** on multi-activity cells showing first 3 activity colors
   - **Hover tooltip** — per-activity breakdown with seconds, percentages, and data source badges (External/Device)
   - **Quick Stats panel** — 3 cards: total hours avg/day, most active day, peak hour
   - **Activity color legend** — top 8 activities by total time
   - **Intensity scale** — Less → More gradient strip
   - **Loading state** — animated pulse skeleton
   - **Page removed**: old legend (High/Med/Low/None), quick-jump buttons, old hover detail panel, single-row 24-cell layout

3. ✅ **REMOVED** Dead code from InsightsPage.tsx:
   - `TypicalSlot` interface → replaced by `ActivityBucket`, `HourCell`, `TypicalDayData`
   - `getHeatColor()` function (no longer needed)
   - `getActivityColor()` function (no longer needed)
   - `getActivityHex()` function (no longer needed)
   - `ACTIVITY_GRADIENTS` constant (no longer needed)
   - `dayLabels` constant (no longer needed)
   - `hoveredHour` state (replaced by inline tooltip state)
   - `typicalMaxSeconds` useMemo (no longer needed)
   - `selectedHourData` computed value (no longer needed)
   - `eachDayOfInterval` import (unused)
   - `useRef` import (unused)

**Files Modified:**
- `src/main.ts` — Replaced `get-typical-day` handler with new 7×24 multi-activity algorithm
- `src/pages/InsightsPage.tsx` — Replaced Typical Day section with heatmap grid + quick stats + tooltip + legend; removed dead code

**Why:**
- User reported: "typical hour in the insights page is not clear and not showing proper data"
- Used generate-prompt skill → PROMPT.md → RESULT.md design → gap analysis → adapted implementation
- RESULT.md specified SVG; adapted to div-based for codebase consistency
- RESULT.md specified `await db.all()` (async); adapted to `better-sqlite3` synchronous calls
- RESULT.md assumed `activity_logs` table; adapted to actual `logs` table columns

**Result:**
- ✅ Build passes (3060 modules, 7.72s renderer + electron tsc)
- ✅ 7×24 heatmap grid shows daily patterns (not just 24 horizontal cells)
- ✅ Both device + external activity data visible
- ✅ Per-day normalized (hours comparable across cells)
- ✅ Multi-activity cells show stacked colors
- ✅ Hover shows full per-activity breakdown
- ✅ Quick stats panel gives at-a-glance insights

---

### 2026-05-10 — generate-prompt Skill Updated with RESULT.md Rules

**What Changed:**
1. ✅ **UPDATED** `agent/skills/generate-prompt/SKILL.md` — Added "CRITICAL: RESULT.md Usage Rules" section with 3 new rules:
   - **Rule 1 — RESULT.md is RAW and UNTOUCHABLE**: Must be consumed exactly as-is, no edits or interpretation
   - **Rule 2 — Implement After Analysis (Not During)**: Read RESULT.md first, trace codebase, identify gaps, plan modifications, THEN implement
   - **Rule 3 — Removal MUST Be Confirmed**: Any removal of existing code/UI/features requires explicit user confirmation before proceeding
2. ✅ **UPDATED** Version from 1.0.0 → 1.1.0

**Files Modified:**
- `agent/skills/generate-prompt/SKILL.md` — Added new rules section, bumped version

**Why:**
- User requested strict rules around RESULT.md consumption: no editing/thinking about code fit before saving, AI must adapt solution to codebase after analysis, and removals require confirmation

**Result:**
- Skill now enforces raw output consumption, analysis-then-implement workflow, and mandatory user confirmation for removals

---

### 2026-05-10 — Created Typical Day Redesign PROMPT.md

**What Changed:**
1. ✅ **CREATED** `agent/docs/typical-hour-redesign/PROMPT.md` — New prompt for Typical Day algorithm redesign

**Files Modified:**
- `agent/docs/typical-hour-redesign/PROMPT.md` — New prompt document for algorithm redesign

**Why:**
- New prompt to guide AI in redesigning the Typical Day algorithm for better data representation

---

**Last Updated:** 2026-05-11 (Terminal Workspace Revamp Complete)

---
### 2026-05-06 (Part 9) — Fix computedWebsiteData + Chart Width Fix

**What Changed:**
1. ✅ **FIXED** `computedWebsiteData is not defined` error
   - Line 1560: Changed `computedWebsiteData` → `chartExternalData`
   - `computedWebsiteData` was never defined, caused runtime error
2. ✅ **FIXED** Weekly chart bars now fill container width
   - Changed `min-w-[16px] flex-shrink-0` → `minWidth: '0' maxWidth: '100%'`
   - Bars now uniform width, fill entire container
   - Removed `overflow-x-auto` (no longer needed with proper sizing)

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Fixed `chartExternalData` reference (line 1560), chart width (line 2156)

**Why:**
- `computedWebsiteData` was used but never defined as a variable
- `chartExternalData` is the correct Map for external data
- Chart bars were "squashed" because `min-w-[16px]` didn't stretch properly
- User reported "bars not uniform" and "doesn't fill container"

**Result:**
- No more `computedWebsiteData` ReferenceError
- Chart bars now uniform width, fill entire container
- Weekly/Monthly charts display properly


---
### 2026-05-06 (Part 9) — Fix computedWebsiteData + Chart Width Fix

**What Changed:**
1. ✅ **FIXED** `computedWebsiteData is not defined` error
   - Line 1560: Changed `computedWebsiteData` → `chartExternalData`
   - `computedWebsiteData` was never defined, caused runtime error
2. ✅ **FIXED** Weekly chart bars now fill container width
   - Changed `min-w-[16px] flex-shrink-0` → `minWidth: '0' maxWidth: '100%'`
   - Bars now uniform width, fill entire container
   - Removed `overflow-x-auto` (no longer needed with proper sizing)

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Fixed `chartExternalData` reference (line 1560), chart width (line 2156)

**Why:**
- `computedWebsiteData` was used but never defined as a variable
- `chartExternalData` is the correct Map for external data
- Chart bars were "squashed" because `min-w-[16px]` didn't stretch properly
- User reported "bars not uniform" and "doesn't fill container"

**Result:**
- No more `computedWebsiteData` ReferenceError
- Chart bars now uniform width, fill entire container
- Weekly/Monthly charts display properly

---
### 2026-05-13 — JSON storage for Problems & Requests

**What Changed:**
1. **REWRITTEN** ProblemsService — now uses `problems.json` as source of truth (not markdown parsing)
2. **REWRITTEN** RequestsService — now uses `requests.json` as source of truth (not markdown parsing)
3. Markdown files (PROBLEMS.md, REQUESTS.md) are now **generated from JSON** — always in sync
4. Legacy markdown parsing kept as `parseProblemsLegacy()` / `parseRequestsLegacy()` for one-time migration
5. Created design prompt at `agent/docs/json-storage-design/prompt.md`

**Files Modified:**
- `src/services/ProblemsService.ts` — JSON read/write, MD generation, auto-migration
- `src/services/RequestsService.ts` — JSON read/write, MD generation, auto-migration

**Why:**
- Markdown regex parsing was fragile and broken (trailing space, field name variants, multi-line issues)
- JSON is machine-parseable — no regex, no silent failures
- Description field on REQUESTS.md was never populated correctly
- Existing `problems.json` / `requests.json` exports from tracker-mind-setup were unused

**Result:**
- `getProblems()` reads JSON, falls back to markdown migration, then creates empty
- `getRequests()` reads JSON, falls back to markdown migration, then creates empty
- All mutations write JSON first, regenerate markdown second
- Build: ✅ passes

### 2026-05-14 — Dashboard Weekly Productivity Chart Revamp

**What Changed:**
1. **Added Y-axis** with hour markers (h) on left side — computes nice round max values (1h, 2h, 4h, 6h, etc.) for clear reference
2. **Added horizontal grid lines** at each Y-axis tick across the full chart area
3. **Removed empty/dark bars** — bars with zero activity now render as invisible (no dark zinc placeholder bars)
4. **Added hover tooltips** showing Device and External hour breakdown per bar
5. **Added gradient backgrounds** on bars (green gradient for device, purple gradient for external) instead of flat colors
6. **External-only bars** now have reduced opacity (0.7) and proper all-rounded corners to visually distinguish from combined activity
7. **Smooth transitions** — added `transition-all duration-300 ease-out` on bar segments

**Files Modified:**
- `src/pages/DashboardPage.tsx` — Y-axis ticks computation (`yAxisTicks` useMemo), `maxBarHeight` useMemo, full bar chart JSX rewrite

**Why:**
- No Y-axis made the chart illegible — users couldn't tell what bar heights represented
- External activity bars filled the "empty" gap, making the chart look flat and misleading
- No interactivity (tooltips, hover states) — chart felt stiff and uninformative

**Result:**
- Y-axis shows hour markers with grid lines for reference
- Empty hours are truly empty (no visual noise)
- Hovering any bar shows exact device/external breakdown
- Gradients and transitions make the chart feel dynamic and modern
- Works across all timelines: today (24h), week (7d), month (~30d), all (monthly)

**Build:** ✅ Passes

### 2026-05-14 — Recursive Split Panes + Problems/Requests Parsing Fix

**What Changed:**
1. **Rewrote TerminalLayout** — recursive `PaneRenderer` interprets PaneNode tree: split nodes render as flex containers with draggable `SplitHandle`, respecting `splitRatio` (was z-index stacking, only active terminal visible)
2. **Fixed MD→JSON migration** — `getProblems()`/`getRequests()` now trigger legacy markdown parsing when JSON is empty `[]` but MD has content (was returning `[]` silently)
3. **Fixed CRLF regex break** — legacy parsers normalize `\r\n` → `\n` before matching (Windows line endings caused 0 matches)
4. **Fixed TDZ** — moved `loadSessions` above `handleInstructionPanelSend` in TerminalPage.tsx
5. **Fixed favicon** — changed from `vite.svg` to `deskflow-icon.png` in index.html
6. **Cleaned** — removed unused `terminalIds` prop from TerminalLayout

**Files Modified:**
- `src/components/TerminalWindow.tsx` — recursive split pane rendering
- `src/services/ProblemsService.ts` — empty JSON → MD migration, CRLF normalization
- `src/services/RequestsService.ts` — empty JSON → MD migration, CRLF normalization
- `src/pages/TerminalPage.tsx` — TDZ fix, removed unused prop
- `index.html` — favicon update
- `agent/state.md` — version 3.4

**Why:**
- Terminal split panes were stacked with z-index, only one visible — the entire split tree structure was built but never interpreted visually
- `problems.json` and `requests.json` were `[]` (valid JSON) so migration from MD never triggered, despite 41 problems and 54 requests in markdown
- CRLF line endings from Windows broke all legacy regex parsers

**Result:**
- Split terminals now render side-by-side/top-bottom with draggable divider (flex layout from PaneNode tree)
- Problems/requests data from markdown files is now correctly migrated to JSON and accessible in the UI
- Build: ✅ passes

**Tracking Accuracy + Dashboard Feed Bug Fixes**
- ✅ **FIXED:** `handleBrowserData` now uses `data.domain` as `app` name (was hardcoded `'Browser'`) — `src/main.ts:6738`
- ✅ **FIXED:** Dashboard initial activity feed now balances 10 app entries + 5 browser entries (was 20 of any type, flood of "Website") — `src/pages/DashboardPage.tsx:314`
- ✅ **FIXED:** `appStats` and `allTimeAppStats` now exclude browser apps + rename browser-tracked entries to domain name — `src/App.tsx:866,910`
- ✅ **FIXED:** StatsPage `sortedApps` recomputation now filters browser apps the same way — `src/pages/StatsPage.tsx:164`
- ✅ **FIXED:** Pie chart tooltip now shows formatted duration + percentage — `src/pages/StatsPage.tsx:629`
- ✅ **FIXED:** `formatDuration` now rounds values under 60s to 2 decimals (was floating point drift like 9.547000000073s) — `src/pages/StatsPage.tsx:57`
- Files: `src/main.ts`, `src/App.tsx`, `src/pages/StatsPage.tsx`, `src/pages/DashboardPage.tsx`
- Build: ✅ Passes

**Research prompt created:** `agent/docs/tracking-accuracy-research-14052026/prompt.md`
- Covers tracking accuracy, RAM/CPU optimization, and complete data validation.

### 2026-05-15 — Initialize System Bug Fixes (JSON.stringify + file content not included)

**What Changed:**
1. **FIXED:** `SettingsPage.tsx:925` — `handleSaveSystemPrompt` was using `JSON.stringify(updated)` which stored `systemPrompts` as a string instead of an object. Subsequent loads via `{ ...prefs.systemPrompts }` would spread the string into indexed properties instead of `claude`/`opencode`/`custom` keys, silently dropping saved prompts. Changed to pass object directly.
2. **FIXED:** `NewSessionDialog.tsx:127-169` — `handleCreate` in initialize mode had two bugs:
   - `Initialize.md` content was never included in the init content sent to the AI agent (only `agents.md` + manually selected files were included). Now `Initialize.md` is read and prepended as the first item.
   - Selected agent files only emitted `<!-- File: ${file} -->` comment markers instead of reading and including the actual file content. Now reads each file via `readAgentFileContent` and wraps in code fence.
3. Made `handleCreate` async to support file reads.

**Files Modified:**
- `src/pages/SettingsPage.tsx` — Removed `JSON.stringify()` from system prompt save
- `src/components/NewSessionDialog.tsx` — Rewrote initialize mode content builder to include Initialize.md + actual file contents

**Why:** System prompts were not persisting correctly; Initialize.md was never sent to the agent; selected files only emitted comments not content.

**Result:** System prompts now save/load correctly; Initialize.md is sent to the agent; selected agent files include their actual content.

**Build:** ✅ Passes

---

### 2026-05-15 — Removed websites from app list, fixed backend BROWSER_APPS filters

**What Changed:**
1. **Frontend app stats (App.tsx, StatsPage.tsx):** Replaced the old domain rename (`is_browser_tracking && domain ? domain : app`) with a direct `is_browser_tracking` skip — website domains (e.g. "github.com") no longer appear as apps
2. **Backend BROWSER_APPS removed (main.ts):** Removed the BROWSER_APPS blocklist from `addLog` path, `getStats()`, `get-daily-stats`, `get-app-stats`, `get-daily-productivity`, and `get-productivity-range` — browser apps like Chrome, Comet, Edge, Firefox are now included in all queries; only `is_browser_tracking` entries (websites) are excluded from app-only queries
3. **Dead code removed (App.tsx):** Removed unused `BROWSER_APPS` and `isBrowserApp` function

**Files Modified:**
- `src/App.tsx` — `appStats` and `allTimeAppStats` now filter `is_browser_tracking` instead of domain rename; removed dead `BROWSER_APPS`/`isBrowserApp`
- `src/pages/StatsPage.tsx` — `sortedApps` same fix
- `src/main.ts` — `getStats()`, `get-daily-stats`, `get-app-stats`, `get-daily-productivity`, `get-productivity-range`: removed BROWSER_APPS `NOT IN` filters from SQL/JSON paths

**Why:** Websites (domain names from the browser extension) were polluting the app list due to the domain rename logic; real desktop browser apps (Chrome, Comet) were blocked by backend BROWSER_APPS filters

**Result:** App list shows real desktop apps only (Chrome, Comet, VS Code, etc.); websites stay in their own section; browser apps are now saved and returned by all backend queries

**Build:** ✅ Passes

### 2026-05-16 — Terminal Group Categorization + Drag-and-Drop Between Groups

**What Changed:**
1. ✅ **Added group-categorized layout in Running Terminals sidebar** — Terminals in the Sessions tab's “Running Terminals” section are now organized by their layout group (Group 1, Group 2, etc.) instead of a flat list.
2. ✅ **Added native HTML5 drag-and-drop** — Terminal items are draggable. Dragging a terminal item over a different group's section header highlights it as a drop target. Dropping moves the terminal from its current group to the target group.
3. ✅ **Added handleTerminalMoveToGroup callback** — Moves a terminal from its current group into a target group by removing it from the source layout group and inserting it (via insertIntoLayout) into the target group's layout tree.
4. ✅ **Added draggedTerminalId and hoveredGroupIdx state** — Tracks which terminal is being dragged and which group header is being hovered for visual feedback (purple-highlighted drop zone).

**Files Modified:**
- src/pages/TerminalPage.tsx — Added group-categorized rendering of running terminals with per-group sections, HTML5 drag-and-drop handlers (onDragStart, onDragOver, onDrop, onDragEnd), state for drag tracking, and the handleTerminalMoveToGroup callback.

**Why:** With multiple terminal groups (separate split panes), users needed a way to move terminals between groups directly from the sidebar without using the mini-map cross-group drag feature.

**Result:** The Running Terminals sidebar section now shows terminals organized by group with visual group headers. Users can drag any terminal item into a different group's section to move it there. Drop targets highlight purple on hover.

**Build:** ✅ Passes


### 2026-05-20 � Camera Planet Tracking Fix + Graphics/FPS Chart Improvements

**What Changed:**
1. Fixed camera not following planet � The PlanetTracker component was only updating the camera's target (where it looks) but NOT the camera's actual position. Fixed by calculating and maintaining an offset between camera and planet, so both the lookAt target AND camera position follow the planet as it orbits. Uses lerp for smooth tracking.
2. Graphics + FPS chart improvements � IN PROGRESS. User wants to improve visuals and add FPS line graph (not just counter) showing trend over time.

**Files Modified:**
- src/components/OrbitSystem.tsx � PlanetTracker function rewritten with proper position tracking

**Build:** Passes

**Build:** Passes

All three changes now COMPLETE: 1) Camera properly follows planet 2) FPS line graph added showing 60s trend 3) Graphics enhanced with better bloom, stars, and effects.

---

### 2026-05-25 — DESIGN SKILLS RESEARCH (IN PROGRESS)

**What Changed:**
1. ✅ **Analyzed 6 Claude Code design tools** for integration into the agent workspace setup flow
2. ✅ **Selected 4 tools to incorporate** into the design skills system, 1 as optional, 1 excluded
3. ✅ **Generated design prompt** at `agent/docs/frontend-design-skills-25052026/PROMPT.md`
4. 🔲 **Create SKILL.md files** for each selected tool in `agent/skills/`
5. 🔲 **Add "Design Skills" category** to NewSessionDialog toggle system
6. 🔲 **Wire design skills into assembleContext()** for system prompt inclusion

**Selection Analysis:**

| Tool | Verdict | Rationale |
|------|---------|-----------|
| **frontend-design** (Anthropic) | ✅ Include (already exists) | Foundation — already at `agent/skills/frontend-design/` |
| **impeccable** (pbakaus) | ✅ Include | 7 domain reference files, 23 commands, anti-patterns. Multi-agent. |
| **ui-ux-pro-max** (nextlevelbuilder) | ✅ Include | 161 industry rules, design system generator, 67 styles. |
| **taste-skill** (Leonxlnx) | ✅ Include | 3 tunable knobs (variance/motion/density), aesthetic variants. |
| **awesome-design-md** (voltagent) | ✅ Include references | 73+ DESIGN.md templates from production sites as reference library. |
| **skillui/npxskillui** (amaancoderx) | ❌ Skip | CLI tool (not a skill). Useful for one-time extraction, not agent context. |

**Architecture:**
- Each selected tool becomes a `SKILL.md` in `agent/skills/<name>/SKILL.md`
- **New:** `agent/skills/design-taste/SKILL.md` — aggregated master design skill with tunable knobs
- **New:** `agent/design-references/` — curated DESIGN.md files from awesome-design-md (Claude, Linear, Vercel, Stripe, etc.)
- **New:** NewSessionDialog gets "Design Skills" subcategory under Context Systems
- Taste skill knobs (DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY) become configurable sliders in setup

**Files Modified:**
- `agent/state.md` — This entry
- `agent/docs/frontend-design-skills-25052026/PROMPT.md` — NEW design prompt
- Pending: `agent/skills/impeccable/SKILL.md`
- Pending: `agent/skills/ui-ux-pro-max/SKILL.md`
- Pending: `agent/skills/taste-skill/SKILL.md`
- Pending: `agent/skills/design-taste/SKILL.md`
- Pending: `src/components/NewSessionDialog.tsx` — Design skills toggles
- Pending: `src/services/ContextService.ts` — Design skill index building

**Build:** N/A (research/design phase only)

---

### 2026-05-27 — Model Improvement Plan (model_improv.md) — Tiers 1-5 Implementation

**What Changed:**
1. **T5.4 — Fixed 4 undefined functions**: `handleSaveWorkspace`, `handleLoadWorkspace`, `handleTerminalMoveToGroup`, `loadSavedConfigs` all implemented with tree helper functions (findLeafInTree/removeLeafFromTree/addLeafToGroup)
2. **T1.1 — Layered system prompt**: `ContextService.assembleContext()` rewritten with LAYER 0-4 headers
3. **T1.2 — Unconditional state injection**: state.md + patterns.md always injected before token budget
4. **T1.3 — RULES_COMPACT.md**: Created 9-rule distilled card with `{{PROBLEM_ID}}`/`{{PROBLEM_TITLE}}` templates
5. **T3.2 — Feedback loop**: `executeActionsFromFile()` now logs parse errors, writes `[SYSTEM]` feedback to terminal
6. **T5.2 — Remind preset**: Built-in `[SYSTEM] Remind` preset re-injects RULES_COMPACT + state.md on demand
7. **T2.1 — Structured state.md**: Converted to metadata format (Metadata/Active Work/Session Continuity/Progress)
8. **T4.1 — Model tier profiles**: `ModelTier` type, `TIER_PROFILES`, dropdown in NewSessionDialog, tier-aware assembly
9. **T4.3 — Problem-aware injection**: Full problem record + checklist items injected in Layer 3
10. **T4.2 — Relevant-skills-only**: Low-tier models get keyword-matched skills only (top 5)
11. **T2.3 — Validation**: Session Metadata block validation with `[SYSTEM]` feedback on missing fields
12. **T3.1 — ACTIONS_SCHEMA.md**: JSON schema + 3 examples created
13. **T1.4-A — Auto re-injection**: Every N user messages (default 10), writes rules reminder before message
14. **T5.1 — Model tier badge**: Small colored badge (green/blue/yellow) in terminal tabs showing top/mid/low
15. **Close button fix**: Added close workspace dialog with Save & Close / Discard & Close / Cancel
16. **Terminal auto-open fix**: `if (propProjectId)` guard in layout-restoring useEffect
17. **TerminalMiniMap crash fix**: `layout`→`layouts` prop, `onToggleDirection` handler

**Result:** All 12 items from model_improv.md implemented (plus 3 bug fixes). Remaining: T2.2 (state snapshot in init — covered by T1.2), T5.3 (state diff — low ROI).

**Build:** ✅ (verified 2026-05-27)
