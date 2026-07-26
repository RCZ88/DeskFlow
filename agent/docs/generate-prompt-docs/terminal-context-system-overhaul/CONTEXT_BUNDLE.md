# DeskFlow — Target AI Context Bundle

> **Purpose:** Portable architecture reference for any AI agent working on the Terminal + Context Management System overhaul.
> **Compiler:** This session (2026-05-21)
> **Contents:** API surfaces, data types, data flows, known bugs — NO source code.

---

## 1. Architecture Summary

**DeskFlow** = Electron app (app tracking) + AI agent workspace (Tracker Mind) + 3D viz + external activity tracker.

```
┌─────────────────────────────────────────────────┐
│  React UI (HashRouter, Vite, Tailwind v4)       │
│  window.deskflowAPI.* calls                     │
├─────────────────────────────────────────────────┤
│  preload.ts (contextBridge, type safe)          │
│  ipcRenderer.invoke / ipcRenderer.on            │
├─────────────────────────────────────────────────┤
│  main.ts (~10k lines, CJS, Electron main proc)  │
│  ipcMain.handle / webContents.send              │
│  → SQLite DB, JSON files, node-pty, file system │
│  → Services: Problems, Requests, Checklists,    │
│    Skills, Context, SessionContext              │
└─────────────────────────────────────────────────┘
```

### Key design decisions:
- **No Node access in renderer** — IPC bridge only via `preload.ts`
- **Services run in main process only** — renderer calls them via IPC
- **State management** — all `useState` in `App.tsx`, no Redux/Zustand. Props passed down to pages.
- **DB** — `better-sqlite3` (electron only), JSON file fallback (`useJson` flag disables real DB during dev)
- **All routes** in single `App.tsx` with `<Routes><AnimatePresence>` — 12 routes

### Tech stack:
Electron ~34.3, React ^19.2.0, TypeScript ~5.9.3, Vite ^7.3.1, Tailwind CSS 4.2.1 (v4 syntax ONLY), node-pty ^1.0.0, better-sqlite3 ^12.8.0, active-win ^8.2.1, date-fns ^4.1.0, Chart.js 4.5.1, Framer Motion ^12.35.0, Lucide React ^0.577.0, @xterm/xterm ^5.6.0, Three.js ^0.183.2 (R3F ^9.5.0)

---

## 2. File Structure (Key Files)

```
src/
├── main.ts              # All IPC handlers, terminal manager, DB, auto-tracker
├── preload.ts           # IPC bridge (deskflowAPI)
├── main.tsx             # React entry (HashRouter)
├── App.tsx              # Routes, state management, event listeners
├── index.css            # Tailwind v4: @import "tailwindcss"
├── lib/defaults.ts      # DEFAULT_SYSTEM_PROMPT constant
├── pages/
│   ├── TerminalPage.tsx      # ~5000 lines — terminals, sessions, context, compose
│   ├── ExternalPage.tsx      # ~2300 lines — external tracker, sleep, charts
│   ├── DashboardPage.tsx     # ~3377 lines — heatmap, weekly overview, planets
│   ├── SettingsPage.tsx      # ~2732 lines — categories, tiers, preferences
│   ├── ProductivityPage.tsx  # ~1532 lines — productivity scoring, trends
│   ├── StatsPage.tsx         # ~1126 lines — app/website stats
│   ├── BrowserActivityPage.tsx # ~1044 lines — browser domain stats
│   ├── InsightsPage.tsx      # ~1104 lines — sleep trends, consistency
│   └── DatabasePage.tsx      # ~520 lines — SQLite table browser
├── components/
│   ├── TerminalWindow.tsx   # Split-pane terminal renderer (xterm.js)
│   ├── NewSessionDialog.tsx  # Setup/Initialize dialog with 6 context toggle cards
│   ├── InstructionPanel.tsx  # Compose panel — problems, requests, skills, prompt
│   ├── PromptDesignDialog.tsx # System prompt editor/preview
│   ├── ProblemDetailModal.tsx # Problem CRUD with assign-to-terminal
│   ├── FlowView.tsx          # Flow-based problem creation
│   ├── OrbitSystem.tsx       # 3D solar system (lazy loaded)
│   └── [TerminalMiniMap, MapEditor, PromptHistoryTab, ChecklistPanel, DurationPicker, DayDetailPopup, DayGanttChart]
├── hooks/
│   ├── useStableMemo.ts      # Deep equality memoization
│   └── useTerminalLayout.ts  # Layout persistence (load/save via IPC)
└── services/                  # Node.js services (main process only)
    ├── ContextService.ts      # assembleContext() — 6-system context assembly
    ├── ContextConfig.ts       # ContextConfig interface + defaults
    ├── ProblemsService.ts     # Problem CRUD (JSON + PROBLEMS.md sync)
    ├── RequestsService.ts     # Request CRUD (JSON + REQUESTS.md sync)
    ├── ChecklistService.ts    # Checklist CRUD (JSON)
    ├── SkillsService.ts       # Skills CRUD (agent/skills/ dir)
    ├── ProblemsParser.ts      # PROBLEMS.md ↔ ParsedProblem[]
    ├── ProblemsSyncService.ts # Two-way sync: SQLite ↔ PROBLEMS.md
    └── SessionContextService.ts # Extract context from agent terminal output
```

---

## 3. Full Preload API (`window.deskflowAPI`)

### 3.1 Event Listeners (ipcRenderer.on, returns cleanup fn)

| Method | IPC Event | Callback Data |
|--------|-----------|---------------|
| `onForegroundChange(cb)` | `foreground-changed` | `{ app, title, category, timestamp, isReal }` |
| `onTrackingHeartbeat(cb)` | `tracking-heartbeat` | `{ isTracking, currentApp, uptime, systemIdleSeconds? }` |
| `onBrowserTrackingEvent(cb)` | `browser-tracking-event` | `any` |
| `onSleepDetection(cb)` | `sleep-detection` | `{ gapStart, gapEnd, gapMinutes }` |
| `onAISyncProgress(cb)` | `ai-sync-progress` | `{ agent, name, status, count? }` |
| `onTerminalData(cb)` | `terminal:data` | `(terminalId, data)` — two separate args |
| `onTerminalExit(cb)` | `terminal-exit` | `(terminalId, exitCode, signal)` |
| `onTerminalReady(cb)` | `terminal:ready` | `(id)` |
| `onAgentReady(cb)` | `agent:ready` | `{ terminalId }` |
| `onAgentTimeout(cb)` | `agent:timeout` | `{ terminalId, agentType }` |
| `onAgentFileChanged(cb)` | `agent-file-changed` | `{ file, mtime }` |
| `onContextChanged(cb)` | `context-changed` | `{ type, action, entity? }` |
| `onSessionMetadataUpdated(cb)` | `session-metadata-updated` | `{ sessionId, metadata, autoTags }` |
| `onAiTaskUpdated(cb)` | `ai-task:updated` | `{ terminalId, status, messageId? }` |
| `onAiTaskFileChanged(cb)` | `ai-task:file-changed` | `{ tasks: any[] }` |

### 3.2 Invoke Methods (ipcRenderer.invoke)

**Core Tracking (~20):**
`getLogs()`, `getDashboardData({period, dateOffset?})`, `getPageStats({page, period, dateOffset?})`, `backfillAggregations()`, `getLogsByPeriod('today'|'week'|'month'|'all')`, `getStats()`, `getAppStats(period?)`, `getDailyStats(period)`, `toggleTracking()`, `clearData()`, `clearToday()`, `getDbPath()`, `getStorageStatus()`, `cleanCorruptedData()`, `deepCleanAndRebuild()`

**Preferences (~2):**
`getPreferences()`, `setPreference(key, value)`

**Browser Tracking (~8):**
`getBrowserLogs(period?, dateOffset?)`, `getBrowserDomainStats(period?, dateOffset?)`, `getBrowserCategoryStats(period?, dateOffset?)`, `setBrowserTracking(enabled)`, `getBrowserTrackingStatus()`, `setBrowserExcludedDomains(domains)`, `setBrowserWithExtension(browser)`, `getTrackedBrowsers()`

**Productivity (~4):**
`getDailyProductivity(date)`, `getProductivityRange(startDate, endDate)`, `saveProductivitySession(session)`, `getProductivitySessions(opts?)`

**Category Config (~12):**
`getCategoryConfig()`, `setAppCategory(name, cat)`, `setDomainCategory(domain, cat)`, `setAppTier(name, tier)`, `setDomainTier(domain, tier)`, `setTierAssignments({productive, neutral, distracting})`, `applyCategoryToHistorical(tierAssignments)`, `getTierAssignments()`, `getDefaultCategories()`, `addCategory(name)`, `removeCategory(name)`, keyword rule variants (~5 more)

**Data Mgmt (~7):**
`migrateToAggregates()`, `getDailyAggregates()`, `getBrowserSessions()`, `getSessions()`, `getTableSchema(tableName)`, `getDatabaseTables()`, `getTableData(tableName, limit?)`, `updateCategoriesFromOverrides(appOverrides, domainOverrides)`

**App Control (~4):**
`quitApp()`, `showWindow()`, `getAutoStartStatus()`, `setAutoStart(enabled)`

**AI Features (~3):**
`generateAIColors(apps)`, `generateAICategorization(items)`, `testOpenRouterKey()`

**File Ops (~2):**
`saveFile({content, filename, fileType})`, `pickFolder()`

**IDE Projects (~27):**
`detectIDEs()`, `getIDEs()`, `getExtensions(ideId?)`, `scanTools()`, `getTools(category?)`, `getToolCategories()`, `addProject({name, path, ...})`, `getProjects()`, `getAllProjects()`, `updateProject(id, updates)`, `deleteProject(id)`, `restoreProject(id)`, `getProjectTools(id)`, `removeProject(id)`, `openProject(id, ideId?)`, `detectProjectLanguage(path)`, `getAIUsageSummary(period?)`, `getCommitStats(projectId?, period?)`, `getIDEProjectsOverview()`, `syncAIUsage()`, `getAISyncStatus()`, `debugAIAgents()`, `syncCommits(projectId, repoPath?)`, `syncGitHubCommits(projectId, owner, repo, token?)`, `getDORAMetrics(projectId, period?)`, `getCommitHistory(projectId, limit?)`, `getContributorStats(projectId)`

**Terminal — Legacy (~5):**
`createTerminalWindow()`, `spawnTerminal(id, cwd?, agentType?)`, `writeTerminal(id, data)`, `resizeTerminal(id, cols, rows)`, `killTerminal(id)`

**Terminal — Consolidated (~5):**
`terminalWrite(id, data)`, `terminalWriteRaw(id, data)`, `terminalResize(id, cols, rows)`, `terminalDestroy(id)`, `retryAgentInit(id, agentType)`

**Terminal — New node-pty API (~5):**
`terminalAPI.create(id, cwd, cols, rows)`, `terminalAPI.write(id, data)`, `terminalAPI.resize(id, cols, rows)`, `terminalAPI.destroy(id)`, `terminalAPI.onData(cb)`/`.removeDataListener()`

**Terminal Presets (~4):**
`getTerminalPresets(projectId?)`, `addTerminalPreset({projectId?, name, command, workingDirectory?, category?})`, `removeTerminalPreset(id)`, `executeTerminalPreset(presetId, terminalId?)`

**Terminal Layouts (~4):**
`saveTerminalLayout({id?, name, layoutData, isActive?, projectId?})`, `getTerminalLayouts(projectId?)`, `deleteTerminalLayout(id)`, `setActiveTerminalLayout(id)`

**Terminal Sessions (~15):**
`saveTerminalSession({id?, projectId?, agent, resumeId?, topic?, ...})`, `getTerminalSessions(projectId?, limit?)`, `deleteTerminalSession(id)`, `getTerminalSessionResumeId(id)`, `getSessionMessages(sessionId, agentType?)`, `saveTerminalMessage({sessionId, role, content})`, `getPromptHistory({projectId?, limit?})`, `deleteTerminalMessage(id)`, `updateSessionCategory({sessionId, topic?, category?, ...})`, `getParsedSessionItems(sessionId)`, `analyzeSessionCategory(sessionId)`, `saveSessionConfig(sessionId, config, projectPath?)`, `loadSessionConfig(sessionId, projectPath?)`, `listInitFiles(projectPath?)`, `readInitFile(filename, projectPath?)`, `resolveAtMention({input, terminalTabs})`

**Tracker Mind — Problems (~7):**
`getProblems(projectId?, projectPath?)`, `createProblem(data)`, `updateProblemStatus(data)`, `deleteProblem(id, projectId?)`, `assignProblemToTerminal(data)`, `getTerminalBindings()`, `syncProblemsMd()`

**Tracker Mind — Requests (~5):**
`getRequests(projectId?)`, `createRequest(data)`, `updateRequestStatus(data)`, `deleteRequest(id, projectId?)`, `linkProblemToRequest(data)`

**Tracker Mind — Checklists (~4):**
`getChecklists(projectId?, projectPath?)`, `createChecklistItem(data)`, `updateChecklistItem(data)`, `deleteChecklistItem(data)`

**Tracker Mind — Skills (~3):**
`getSkills(projectPath?)`, `createSkill(data)`, `updateSkill(data)`

**Tracker Mind — Terminal Bindings (~6):**
`registerTerminal(data)`, `updateTerminalBinding(data)`, `saveTerminalBinding(data)`, `getTerminalBinding(terminalId)`, `sendInstructionsToTerminal(data)`, assignProblemToTerminal

**Tracker Mind — Agent Files + State (~17):**
`watchAgentFiles()`, `readAgentFiles(projectPath)`, `readAgentFile(filePath, projectPath)`, `readAgentFileContent(filename, projectPath?)`, `listAgentDirFiles(projectPath?)`, `readProgressJson(projectPath?)`, `writeProgressJson(projectPath?, data?)`, `saveBaseSystemPrompt(agent, prompt)`, `getBaseSystemPrompt(agent)`, `getPromptStatus(terminalId?)`, `aiTaskWatch(projectPath)`, `aiTaskStopWatch(projectPath)`, `aiTaskAdd(task)`, `writeAgentActions(data)`, `setupActionsFileWatcher(data)`, `executeActionsFromFile(data)`, `getAiContext(opts?)`, `logActivity(data)`, `getActivityLog(opts?)`, `trackerMindSetup(step, projectId?, agentName?)`, `updateStateFromAgent(data)`

**External Tracker (~30):**
`getExternalActivities()` / `addExternalActivity()` / `updateExternalActivity()` / `deleteExternalActivity()`, `startExternalSession(activityId)` / `stopExternalSession(...)` / `updateExternalSession()` / `deleteExternalSession()` / `getExternalSessions(period)` / `getActivityStats()` / `getActiveExternalSession()`, `startAfkSession()` / `stopAfkSession()`, `getMorningPrompt()` / `dismissMorningPrompt()`, `addManualSleep(sleepData)` / `checkSleepDetection()` / `confirmSleep(sleepData)` / `dismissSleepDetection()`, `addExternalTime(activityId, durationMinutes)`, `getExternalStats(period)` / `getComparisonStats(period)` / `getSleepTrends(period)` / `getConsistencyScore(period)` / `getTypicalDay(days?)` / `getHourlyHeatmap(days?)` / `getBestDays()` / `getDayDetail(date)` / `getHourDetail(date, hour)`, `updateActivityChartPreference(id, chartType)`, `getExternalSettings(key)` / `setExternalSettings(key, value)`, `getTrackingSettings()` / `setTrackingSetting(key, value)`

**Workspace (~6):**
`saveWorkspace(data)` / `loadWorkspace(data)`, `getWorkspaceTodos(projectId?)` / `addWorkspaceTodo(data)` / `toggleWorkspaceTodo(id)` / `deleteWorkspaceTodo(id)`

**Prompt Templates (~3):**
`getPromptTemplates(projectId?)` / `savePromptTemplate({...})` / `deletePromptTemplate(id)`

**Project File System (~4):**
`readProjectFile(relativePath, projectPath?)` / `writeProjectFile(relativePath, content, projectPath?)` / `listProjectFiles(subDir?, projectPath?)` / `listDirectory(projectPath, relativePath)`

**Project Health (~2):**
`calculateProjectHealth(projectId)` / `getProjectDetails(projectId)`

---

## 4. Database Schema (SQLite — `deskflow-data.db`)

### Core activity tables:
- **`logs`**: `id INTEGER PK, timestamp TEXT, app TEXT, category TEXT, duration_ms INTEGER, title TEXT, project TEXT, keystrokes, clicks, window_switches, url, domain, tab_id, is_browser_tracking`
- **`sessions`**: `id, app, category, start_time, end_time, duration_sec, domain, url, title, is_active`
- **`daily_stats`**: `id, date, app, category, total_sec, sessions, avg_session_sec, keystrokes, clicks, focus_score, productivity_type, total_time_sec, focus_time_sec` — UNIQUE(date, app)

### Pre-aggregated stats (auto-triggers on logs INSERT):
- **`stats_hourly`**: UNIQUE(date, hour, app_name)
- **`stats_daily`**: UNIQUE(date, app_name)
- **`app_totals`**: PK(app_name)
- **`daily_aggregates`**: UNIQUE(date, app)
- **`browser_sessions`**: UNIQUE(date, domain)

### Terminal system:
- **`terminal_sessions`**: `id TEXT PK, preset_id, project_id, agent, resume_id, topic, working_directory, terminal_id, total_tokens, total_cost, category, status, product_area, description, auto_tags, category_confirmed, created_at, updated_at`
- **`terminal_messages`**: `id INTEGER PK AUTOINCREMENT, session_id TEXT NOT NULL, role ('user'|'assistant'|'system'), content TEXT, status, created_at`
- **`terminal_layouts`**: `id TEXT PK, name, project_id, layout_data TEXT, is_active, created_at, updated_at`
- **`terminal_presets`**: `id TEXT PK, name, command, project_id, working_directory, category, created_at, updated_at`
- **`terminal_bindings`**: `id INTEGER PK AUTOINCREMENT, terminal_id TEXT NOT NULL UNIQUE, project_id, agent_type, session_id, active_problem_id, active_request_id, session_context, status, created_at, last_activity_at`
- **`session_parsed_items`**: `id INTEGER PK AUTOINCREMENT, session_id TEXT NOT NULL, item_type ('decision'|'action_item'|'status_change'|'reference'), content, source_message_id, created_at`
- **`workspace_state`**: `id INTEGER PK AUTOINCREMENT, project_id NOT NULL UNIQUE, sidebar_width, active_tab, terminal_tabs, updated_at`

### IDE/Dev Tools:
- **`ides`**: id, name, version, install_path, last_opened
- **`extensions`**: id, ide_id FK, publisher, name, version, enabled
- **`tools`**: id, name, category, version, install_path, detection_method
- **`projects`**: id, name, path UNIQUE, repository_url, vcs_type, primary_language, default_ide, added_at, last_activity_at, deleted_at
- **`project_tools`**: project_id FK, tool_id FK, PK(project_id, tool_id)

### AI & Git:
- **`ai_usage`**: id, project_id FK, tool, date, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, cost_usd, model, message_count, project_path, created_at
- **`commits`**: id, project_id FK, sha, author, date, message, additions, deletions, files_changed
- **`ai_attribution`**: commit_id PK FK, tool, lines_ai_added, lines_ai_deleted, lines_human_added
- **`dora_metrics`**: id, project_id FK, period, start_date, end_date, deployment_frequency, lead_time_hours, change_failure_rate, mean_time_to_recovery_hours, level

### Tracker Mind:
- **`workspace_problems`**: `id INTEGER PK AUTOINCREMENT, title, status, priority, category, user_notes, fix_description, root_cause, files DEFAULT '[]', project_id, session_id, created_at, updated_at`
- **`workspace_requests`**: `id INTEGER PK AUTOINCREMENT, title, description, status, priority, category, linked_problems DEFAULT '[]', project_id, created_at, updated_at`
- **`activity_log`**: `id INTEGER PK AUTOINCREMENT, entity_type, entity_id, entity_title, action, actor, summary, details, created_at`

### External activities:
- **`external_activities`**: id, name, type ('stopwatch'|'sleep'|'checkin'), color, icon, default_duration, is_default, is_visible, sort_order
- **`external_sessions`**: id, activity_id FK, started_at, ended_at, duration_seconds, notes, device_off_to_sleep_seconds, wake_up_to_app_seconds
- **`external_settings`**: key PK, value TEXT
- **`productivity_sessions`**: id, started_at, ended_at, duration_seconds, app_name, category, is_streak, day, week_number, month, created_at

### JSON-file-only data (no DB table):
- `agent/problems.json` → `ProblemsService`
- `agent/requests.json` → `RequestsService`
- `agent/checklists.json` → `ChecklistService`
- `agent/skills/*.md` → `SkillsService`
- `deskflow-prefs.json` → preferences

---

## 5. Service APIs

### ProblemsService (ProblemsService.ts)
- `getProblems(): Problem[]`
- `getProblem(id): Problem | null`
- `createProblem(data: CreateProblemData): string`
- `updateStatus(id, status): void`
- `updateProblem(id, updates): void`
- `deleteProblem(id): void`
- `parseProblemsLegacy(content: string): ParsedProblem[]`

**Types:**
- `Problem`: `{ id, title, status, priority, category, terminal_id, skill_used, user_notes, session_id, session_name, description?, fix_description?, root_cause?, files: string[], created_at, updated_at }`
- `CreateProblemData`: `{ title, priority?, category?, description?, root_cause?, projectId?, sessionId?, sessionName? }`
- `ParsedProblem`: `{ id, title, status, priority, files, description, user_notes, fix_description, root_cause, category, session_date }`

### RequestsService (RequestsService.ts)
- `getRequests(): Request[]`
- `getRequest(id): Request | null`
- `createRequest(data: CreateRequestData): string`
- `updateStatus(id, status): void`
- `linkProblem(requestId, problemId): void`
- `deleteRequest(id): void`
- `parseRequestsLegacy(content): ParsedRequest[]`

**Types:**
- `Request`: `{ id, title, description, status, priority, category, linked_problems: string[], session_id?, session_name?, created_at, updated_at }`
- `CreateRequestData`: `{ title, description?, priority?, category?, sessionId?, sessionName? }`

### ChecklistService (ChecklistService.ts)
- `getChecklists(): ChecklistItem[]`
- `getChecklistForParent(parentType, parentId): ChecklistItem[]`
- `createItem(data: CreateChecklistItemData): string`
- `updateItem(id, updates): void`
- `deleteItem(id): void`
- `deleteChecklistForParent(parentType, parentId): void`

**Types:**
- `ChecklistItem`: `{ id, parentType: 'problem'|'request', parentId, step, description, status: 'pending'|'in_progress'|'completed', requiresHuman, humanApproved, notes, created_at, updated_at }`

### SkillsService (SkillsService.ts)
- `getSkills(): Skill[]`
- `getSkillById(id): Skill | null`
- `getSkillContext(skillId): string`

**Type:** `Skill`: `{ id, name, description, category, content, filePath }` — loaded from `agent/skills/*/SKILL.md` (markdown with YAML frontmatter)

### ContextService (ContextService.ts — browser-safe)
- `assembleContext(projectPath, config: ContextConfig, sessionId?): Promise<string>` — assembles context from up to 6 knowledge systems
- `getSystemInfo(projectPath, config): Promise<SystemInfo[]>` — returns metadata about each system (name, item count, token estimate)

Internal builders called by `assembleContext`:
- `buildLLMWikiContext()` — reads `agent/*.md` files (state, context, patterns, etc.)
- `buildSkillIndex()` — reads `agent/skills/*/SKILL.md` frontmatter
- `buildGraphifyContext()` — reads `graphify-out/GRAPH_REPORT.md`
- `buildParaContext()` — lists `CZVault/00_Projects/`, `01_Areas/`, `02_Resources/`, `03_Archives/`
- `buildQMDContext()` — reads `agent/templates/*.qmd`
- `buildAutomationsContext()` — reads `agent/automations/`
- `buildDeepMemoryContext()` — reads `agent/context/deep-memory.json`

### ContextConfig (ContextConfig.ts)
```typescript
interface ContextConfig {
  total_token_budget: number;       // default: 12000
  systems: {
    llm_wiki:     { enabled, files: string[], max_tokens }
    obsidian_skills: { enabled, skills: string[], max_tokens }
    graphify:     { enabled, include_graph, include_summary, max_tokens }
    para:         { enabled, areas: string[], max_tokens }
    qmd:          { enabled, templates: string[], max_tokens }
    automations:  { enabled, max_tokens }
  };
  summarization: { enabled, message_threshold, max_recent_messages, summary_style: 'brief'|'detailed' }
  deep_memory:   { enabled, pattern_detection, max_patterns, retention_days }
}
```

### SessionContextService (SessionContextService.ts)
- `extractContext(output: string): ExtractedContext` — parses agent terminal output for status, file modifications, problem/request references
- `generateBriefContext(context): string`

**Type:** `ExtractedContext`: `{ status: 'working'|'waiting_input'|'idle'|'error', currentTask?, problemReferenced?, requestReferenced?, filesModified: string[], lastAction? }`

### ProblemsSyncService (ProblemsSyncService.ts)
- `syncFromMarkdown(): Promise<{added, updated, unchanged}>` — MD → SQLite
- `syncToMarkdown(): Promise<void>` — SQLite → MD
- `updateProblem(problemId, updates)`, `createProblem(data): Promise<string>`

### ProblemsParser (ProblemsParser.ts)
- `parse(content: string): ParsedProblem[]` — regex parser for PROBLEMS.md (supports 4 patterns)
- `generate(problems, headerInfo?): string` — generates PROBLEMS.md content

---

## 6. Frontend Routes (HashRouter, App.tsx)

| Path | Component | Key Props |
|------|-----------|-----------|
| `/` | DashboardPage | logs, allLogs, browserLogs, appColors, timerBehavior, selectedPeriod, timerState, externalActivities, externalWeeklyStats, activityFeed |
| `/stats` | StatsPage | logs, appStats, selectedPeriod, timeMode, tierAssignments |
| `/productivity` | ProductivityPage | logs, browserLogs, appStats, selectedPeriod, tierAssignments, domainKeywordRules, timeMode |
| `/browser` | BrowserActivityPage | selectedPeriod, timeMode, tierAssignments |
| `/ide` | IDEProjectsPage | none |
| `/ide-help` | IDEHelpPage | none |
| `/external` | ExternalPage | selectedPeriod |
| `/terminal` | TerminalPage | none |
| `/reports` | InsightsPage | logs, browserLogs, appStats, selectedPeriod, tierAssignments |
| `/database` | DatabasePage | none |
| `/settings` | SettingsPage | logs, appStats, websiteStats, timerBehavior, trackerAppMode, callbacks |

---

## 7. Terminal System Architecture

### PTY Lifecycle:
```
Setup button → NewSessionDialog → onCreate
  → buildInitContent() reads: AGENTS.md, INITIALIZE.md, graphify-out/GRAPH_REPORT.md, QMD templates, skills
  → assembleContext() reads: PARA, LLM Wiki, skills, QMD based on toggle cards (6 systems)
  → Merge both → initContent string
  → spawnTerminal() → node-pty creates child process
  → initializeTerminal() → writes agent launch command
  → Waits for agent:ready (detected by signature regex matching terminal output)
  → Writes merged prompt + initContent
  → initializeSession() → sets up actions file watcher
```

### Agent Signatures (main.ts):
- `opencode` → `/>\s*$/` (guarded by 3s startup delay)
- `claude` → `/>\s*$/`
- `aider` → `/\(.*\)>\s*$/`
- `codex` → `/>\s*$/`
- Generic → looks for `>` or `$` prompt at end of line

### Terminal Manager (main.ts):
- `Map<string, TerminalInfo>` where `TerminalInfo = { pty, buffer, agentType, sessionId?, ... }`
- Handlers: `terminal:create`, `terminal:write`, `terminal:resize`, `terminal:destroy`
- Writes to PTY via `pty.write(data)`, reads via `pty.on('data', cb)`

### Split Pane Layout (PaneNode, TerminalWindow.tsx):
```typescript
type PaneNode =
  | { type: 'leaf'; terminalId: string; sessionId?: string; ... }
  | { type: 'split'; direction: 'vertical' | 'horizontal'; children: PaneNode[]; sizes: number[] }
```
- Layout mutations: `insertIntoLayout`, `splitPane`, `removePane`, `toggleSplitDirection`, `getLeafIds`, `findGroupIndex`, `removeFromLayouts`, `replaceLeafTerminalId`, `findLeafById`, `swapLeavesInTree`
- Drag-and-drop via `@dnd-kit` (visual feedback works, actual mutation may be broken — Issue #45)

### AI Output Processing:
```
Agent writes to terminal → onData
  → detectAgentPrompt() checks for prompt character
  → parseTerminalOutput() extracts ## Session Metadata and ## Actions blocks
  → parseSessionMetadata() → updates terminal_sessions DB row
  → parseAndExecuteActions() → creates/updates problems, requests, checklists
  → ⚠️ MISSING: Sends refresh events to renderer UI
```

### Actions File Bridge:
```
AI writes agent/actions.json → fs.watch triggers
  → executeActionsFromFile() reads JSON, performs CRUD
  → Clears actions.json to { actions: [] }
  → ⚠️ MISSING: Sends UI refresh events
```

### Instruction Send Flow:
```
InstructionPanel → user composes, selects problems/requests/skill
  → onSend(config) → ⚠️ STUB: just closes panel (TerminalPage.tsx:1384)
  → SHOULD: handleInstructionPanelSend (line 385):
    1. Resolve target terminal (activeTerminalId → sendTargetSession → fallback)
    2. queueOrSend(config.prompt)
    3. Save session bindings
    4. Update terminal binding
```

---

## 8. Known Bugs (54 Total — Full List)

### Critical (🔴 — Blocks usability):

1. **InstructionPanel onSend is a STUB** — Panel closes, nothing happens. `handleInstructionPanelSend` defined but never wired.
2. **Context toggle cards are decorative** — 6 toggle cards in NewSessionDialog feed `assembleContext()` but a SEPARATE code path (`buildInitContent()`) has independent flags. User toggles Graphify OFF → might get graphify content anyway.
3. **Terminal cannot accept manual input** — xterm `onKey` may not route keystrokes to PTY via `terminalManager.write()`.
4. **Wrong terminal launch command** — `initializeSession()` writes `${agent}\n` but format may be wrong for the specific agent.
5. **Past sessions show same random ID** — `generateTerminalId()` uses `Date.now() + Math.random()` — should be unique, but display may read from wrong source.
6. **New session does not send initial message properly** — system prompt + init content may be malformed or concatenated into one blob.
7. **File list view shows raw markdown** — AGENTS.md, PROBLEMS.md, GRAPH_REPORT.md, SKILL.md displayed as raw text. Should be rendered as rich HTML with cards, badges, navigation.
8. **Agent review (prompt preview) ugly — random text** — Prompt preview shows garbled text instead of the actual assembled prompt.
9. **Prompt preview does not include system prompt** — Only shows init content, omits DEFAULT_SYSTEM_PROMPT.
10. **Save button does not save** — `saveWorkspace` IPC may have no handler or data not persisted.
11. **Cannot split terminals into different groups** — Drag-and-drop shows visual highlights but the actual move mutation does not execute.
12. **Drag splitting cut in half — height too big** — Split panes render at half-height, need `min-h-0` + `flex-1` propagation fixes.
13. **Problem list design is bad** — Plain list without proper visual hierarchy. Needs status badges, priority indicators, category tags.
14. **Problem status change causes error messages on terminal** — `[System: Problem updated: ...]` written to terminal may have malformed format.

### High (🟡 — Major gaps):

15. **No `electron:execute-command` IPC handler** — Can't trigger graphify rebuilds from renderer.
16. **`assembleContext` not imported** — Wait, this was fixed. But the toggle/flag deduplication is not.
17. **QMD path was double-nested** — Fixed but untested.
18. **Graphify path wrong** — Fixed but untested.
19. **Problem → terminal assignment: prompt not sent** — `assignProblemToTerminal` saves prompt to session but never writes it to the terminal.
20. **Metadata parsing doesn't update UI** — `parseTerminalOutput` updates DB but no events sent to renderer to refresh problems/requests/checklists.
21. **Actions file watcher not initialized for all paths** — Only called in `initializeSession()`, not in header "Open Terminal" button flow.
22. **Auto-assign logic — which session gets the prompt?** — `@term` routing in quick-input bar may not parse correctly.
23. **Init vs Setup split never completed** — No distinction between "create from defaults" vs "configure everything".
24. **`tracker-mind-setup` not wired to Setup dialog** — Dialog only READS files, doesn't create AGENTS.md/INITIALIZE.md/PROBLEMS.md.
25. **Session list doesn't show all past sessions** — Some sessions don't appear. DB query may need audit.
26. **AI should get smarter over time — context sharpening** — No persistent session memory mechanism.
27. **Natural language task assignment** — Quick-input bar doesn't parse intent and route to correct session.
28. **Always-updating context** — Mid-session context changes (problem/request updates) may not reach the agent properly.
29. **Agent selection defaults inconsistent** — `localStorage` default vs config.agentType mismatch.
30. **Instruction column / compose area too small** — Cramped textarea and quick-input bar.
31. **What exactly does save persist?** — Workspace save scope is undefined.
32. **Load should restore terminals** — Layout restored visually but PTYs don't spawn.
33. **Project prompt not at top of merged prompt list** — Prompt merge order may be wrong.
34. **Merge prompt results should be visible** — Final merged prompt should show in preview.
35. **No resize handles between split panes** — Can't adjust pane sizes.
36. **Closing a session causes blinking** — React re-render issue.
37. **Agent selection dropdown empty** — Settings dropdown shows no options.
38. **Product area / category irrelevant in session metadata** — Stored but not actionable in UI.
39. **Can't specify existing session ID when creating a session** — No field for this.

### Medium (🟠 — Polish/improvements):

40. **Obsidian vault integration unclear** — Vault → project sync mechanism undocumented.
41. **Workspace save/load — session context persistence** — Need audit of `workspace:save`/`workspace:load` handlers.
42. **FlowView problem creation UI** — May not be wired to ProblemsService.
43. **Skills integration in context pipeline** — `buildSkillIndex()` reads skills but may not include them in agent context.
44. **`getAiContext` / activity log — agent awareness** — Need to verify handler exists and returns meaningful data.
45. **Link between problems and requests is unclear** — UI for linking is confusing.
46. **Quick prompt terminal selector dropdown unclear** — `@term` routing not obvious.
47. **"Send instruction to which terminal?"** — No clear visual indicator of active terminal target.
48. **Problems/Requests popup UI bad design** — Inconsistent styling with rest of app.
49. **Cannot drag items between groups in sidebar** — Visual feedback suggests it should work but doesn't.
50. **First message should be distinct from system prompt** — No clear separation between "system config" and "first task."

---

## 9. 6 Context Systems

| # | System | Source | Status |
|---|--------|--------|--------|
| 1 | **LLM Wiki** | `agent/*.md` (state.md, context.md, patterns.md, etc.) | `buildLLMWikiContext()` reads them in ContextService.ts. Token budgeted. |
| 2 | **Obsidian Skills** | `agent/skills/*/SKILL.md` (loaded from vault or local) | `buildSkillIndex()` reads SKILL.md frontmatter. Vault sync path unclear. |
| 3 | **Graphify** | `graphify-out/GRAPH_REPORT.md` + `graph.json` | Path fixed. Python script works. NO IPC bridge to trigger rebuild. |
| 4 | **PARA** | `CZVault/00_Projects/`, `01_Areas/`, `02_Resources/`, `03_Archives/` | Lists directories via `listDirectory`. Vault path may be hardcoded. |
| 5 | **QMD Templates** | `agent/templates/*.qmd` | Path fixed (was double-nested). Templates listed but content loading status unknown. |
| 6 | **Automations** | `agent/automations/` | `buildAutomationsContext()` exists. Directory may not exist yet. |

---

## 10. Category Configuration

**16 Default Categories:** IDE, AI Tools, Browser, Entertainment, Communication, Design, Productivity, Tools, Education, Developer Tools, Search Engine, News, Shopping, Social Media, Uncategorized, Other

**3 Default Tiers:**
- **productive**: IDE, AI Tools, Developer Tools, Education, Productivity, Tools
- **neutral**: Communication, Design, Search Engine, News, Uncategorized, Other
- **distracting**: Entertainment, Social Media, Shopping

**35+ App defaults** (e.g., code→IDE, chrome→Browser, claude→AI Tools, terminal→Productivity, figma→Design)
**30+ Domain defaults** (e.g., github.com→Developer Tools, youtube.com→Entertainment, chatgpt.com→AI Tools)

---

## 11. AI Agent Plugins (7)

Used for syncing AI usage data from external tools into DeskFlow's DB:

| Plugin | Source | Data Location |
|--------|--------|---------------|
| claude-code | Anthropic | `~/.claude/projects/*.jsonl` |
| opencode | opencode | `~/.local/share/opencode/opencode.db` (SQLite) |
| gemini | Google | `~/.gemini/history/` (.jsonl/.json) |
| codex | Codex CLI | `~/.codex/sessions/` (.jsonl/.json) |
| qwen | Qwen CLI | `~/.qwen/projects/<name>/chats/*.jsonl` |
| aider | Aider | `~/.oobo/aider-analytics.jsonl` |
| cursor | Cursor AI | `AppData/Cursor/User/globalStorage/state.vscdb` (SQLite) |

---

## 12. JSON File Paths (in userData / `%APPDATA%/deskflow/`)

| File | Purpose |
|------|---------|
| `deskflow-data.db` | SQLite database (primary) |
| `deskflow-data.json` | JSON fallback logs |
| `deskflow-prefs.json` | User preferences |
| `deskflow-categories.json` | Category configuration |
| `deskflow-sleep-state.json` | Sleep detection state |
| `deskflow-sleep-pattern.json` | Sleep patterns |
| `deskflow-last-focus.json` | Last focus time |
| `deskflow-sleep-detection.json` | Sleep detection data |
| `show-morning-prompt.json` | Morning prompt flag |

---

## 13. Agent Workspace Files (`agent/`)

| File | Purpose |
|------|---------|
| `state.md` | Current project state, version, recent changes |
| `context.md` | Architecture overview |
| `AGENTS.md` | Agent workspace instructions |
| `INITIALIZE.md` | Setup/initialization guide for new agents |
| `PROBLEMS.md` | Issue tracker (human-readable) |
| `REQUESTS.md` | Feature requests |
| `constraints.md` | Hard rules (no git commands, Tailwind v4, etc.) |
| `patterns.md` | Reusable code patterns |
| `data.md` | DB schemas, IPC endpoint reference |
| `glossary.md` | Term definitions |
| `FEATURE_TRACKER.md` | Complete feature inventory |
| `WORKSPACE_CONTEXT.md` | Workspace/IDE project context |
| `debugging.md` | Error patterns and solutions |
| `skills/*/SKILL.md` | Skill definitions with YAML frontmatter |
| `templates/*.qmd` | QMD templates |
| `context/` | Session summaries, deep memory storage |
| `problems.json` | Machine-parseable problem data |
| `requests.json` | Machine-parseable request data |
| `checklists.json` | Machine-parseable checklist data |

---

## 14. Key Data Flows (with broken links)

### Session Creation Flow:
```
Setup btn → NewSessionDialog → onCreate
  → buildInitContent() reads: AGENTS.md, INITIALIZE.md, GRAPH_REPORT.md, QMD, skills
  → assembleContext() reads: PARA, LLM Wiki, GRAPH_REPORT, skills, QMD (toggle-based)
  → Merge → spawnTerminal() → initializeTerminal() → initializeSession()
  ✓ Missing: tracker-mind-setup init-all not called first (files may not exist)
  ✓ Bug: Two independent code paths produce duplicate/conflicting context
```

### Problem Assignment Flow:
```
ProblemDetailModal → IPC assignProblemToTerminal
  → Returns { terminalId, prompt }
  → Dispatches create-terminal-for-problem event
  → handleCreateTerminalForProblem: creates tab, spawns terminal, saves session
  ✗ BUG: Problem prompt is saved to session but NEVER written to the terminal agent
```

### Instruction Send Flow:
```
InstructionPanel → user selects problems/requests/skill → clicks Send
  ✗ BUG: onSend is a STUB (line 1384 in TerminalPage.tsx) — just closes panel
  ✗ handleInstructionPanelSend (line 385) is defined but NEVER WIRED
```

### AI Output → DB Flow:
```
Agent terminal output → onData → detectAgentPrompt()
  → parseTerminalOutput() → parseSessionMetadata() + parseAndExecuteActions()
  → Updates DB (sessions, problems, requests, checklists)
  ✗ BUG: No UI refresh events dispatched after DB updates
  ✗ BUG: Actions file watcher not set up for all creation paths
```

### Workspace Save:
```
Save button → IPC saveWorkspace({ scope, layout, terminalStates, ... })
  ✗ BUG: May not persist anything (handler might be missing)
  ✗ BUG: Load doesn't restore terminals (only layout)
```

---

## 15. Critical Constraints

1. **NEVER use git commands** — `git checkout`, `git restore`, `git reset --hard`, `git stash` destroy user work.
2. **Tailwind v4 ONLY** — `@import "tailwindcss"`. NEVER change to `@tailwind base; @tailwind components; @tailwind utilities;` (v3 syntax).
3. **No Node access in renderer** — Only IPC via `window.deskflowAPI`. No `require()`, no `fs/path`, no direct DB.
4. **No new files unless necessary** — Fix existing files first. Avoid creating new components/files.
5. **Backward compatibility** — Don't break existing sessions/data.
6. **Platform: Windows** — Electron + React + Tailwind v4. SQLite via better-sqlite3.
7. **Services run in main process** — Renderer communicates ONLY via IPC bridge.
8. **`useJson` flag** — Disables real DB during dev. Handle gracefully.

---

## 16. DEFAULT_SYSTEM_PROMPT (`src/lib/defaults.ts`)

The `DEFAULT_SYSTEM_PROMPT` constant (~280 lines, hardcoded) covers: environment, sessions, problems/requests/checklists, skills, graphify, LLM wiki, data storage, activity logging, presets/workspaces, build rules, UI conventions, workflow.

Prompt hierarchy (merged in `initializeTerminal`):
1. `DEFAULT_SYSTEM_PROMPT` (hardcoded — always prepended)
2. **General additions** per agent (stored in prefs)
3. **Project-specific additions** (stored in `prefs.projectPrompts[projectId]`)
4. **Optional session additions** (from custom system prompt in dialog)
5. **Init content** (AGENTS.md + INITIALIZE.md + graphify + QMD + skills + context)
