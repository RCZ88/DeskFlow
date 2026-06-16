# ðŸ“‹ Feature Tracker

**Purpose:** Complete inventory of every page and feature in DeskFlow app.

**Last Updated:** 2026-06-02

**Maintainer:** AI Development Team

---

## ðŸ“Œ Page Index

| Route | Page Component | Description |
|-------|----------------|-------------|
| `/` | `DashboardPage` | Main dashboard with 3D orbit, heatmap, weekly overview |
| `/stats` | `StatsPage` | App statistics, live tracking indicator, session edit/delete |
| `/productivity` | `ProductivityPage` | Productivity score, focus sessions, trends |
| `/browser` | `BrowserActivityPage` | Browser usage tracking with timeline nav |
| `/ide` | `IDEProjectsPage` | IDE projects, workspace, Initialize/Setup, analytics |
| `/terminal` | `TerminalPage` | 5235-line terminal workspace with 12-tab sidebar |
| `/external` | `ExternalPage` | External activity tracking, sleep, comparison card |
| `/reports` | `InsightsPage` | 3-tab insights (Day/Weekly/Activities), heatmap, stats |
| `/database` | `DatabasePage` | Database viewer + analytics dashboard |
| `/settings` | `SettingsPage` | 5-tab settings (Category/Colors/General/Tracking/Prompts) |
| `/ide-help` | `IDEHelpPage` | IDE setup help documentation |
| `/features` | `FeatureSpecViewer` | Hierarchical feature specs browser with sidebar + markdown copy |
| `/design-workspace` | `DesignWorkspacePage` | Design taste knobs + style references (embedded in Terminal) |

---

## ðŸŒŒ 1. Dashboard Page (`/`)

**Component:** `src/pages/DashboardPage.tsx` (~2400 lines)

### Core Features:

#### 1.1 3D Orbit System
- **Feature:** Interactive 3D solar system visualization
- **Technology:** React Three Fiber, Three.js
- **Details:**
  - Planets represent apps with size = usage time

  - Orbits based on usage (most used = furthest)

  - Logarithmic orbit spacing (inner planets close, outer planets spread)

  - Visual balance factor (0.65) for engaging angular speeds

  - Procedural textures generated via Canvas API

  - Category-based color schemes and patterns

  - Click planets to see app details with camera tracking

  - Hover for tooltips with usage stats

  - Period selector inside OrbitSystem UI (Today/Week/Month/All)

  - Category dropdown animates camera to solar system

  - Planet click locks camera to follow orbiting planet

  - Tracking cleared on zoom out, reset, galaxy switch

#### 1.2 Category System
- **Productive:** IDE, AI Tools, Developer Tools, Education, Productivity, Tools
- **Neutral:** Browser, Communication, Design, News, Uncategorized, Other
- **Distracting:** Entertainment, Social Media, Shopping
- **Custom overrides:** User can reassign categories in Settings
- **Custom categories:** Add/remove custom categories (persist in deskflow-categories.json)

#### 1.3 Heatmap
- **Feature:** Hourly activity heatmap (7 days Ã— 24 hours)
- **Modes:**
  - `external` - External activity only (AI tools, websites)

  - `device` - Device activity only (local apps)

  - `combined` - Both with color blending

- **Interactions:**
  - **Hover:** Tooltip shows device + external time per hour
  - **Click hour:** Detail panel below heatmap with per-app device breakdown, colored dots, durations
  - **Click day label:** DayDetailPopup modal with timeline items (app=blue, browser=green, external=purple)
  - Hour-splitting uses calendar hour boundaries (no cross-hour leakage)

  - 12-hour format labels (12a, 1a...12p, 1p)

- **Color coding:**
  - External-only: Purple scheme

  - Device-only: Red-green productivity colors

  - Combined: Max duration with blended colors

#### 1.4 Weekly Overview (Activity Charts)
- **Feature:** Bar chart showing period activity summary with stacked bars
- **Details:**
  - Rounded bar corners

  - Total hours displayed below chart

  - Device breakdown bar (colored segments per app)

  - External activity stacked on top (purple)

  - Period navigation (prev/next buttons + "Today" reset)

  - Respects period selector + dateOffset

  - Dynamic labels: hourly for today, daily for week, 30-day for month, monthly for all

  - Horizontal scroll for overflow

  - Dedicated "View Heatmap" button (no click-on-chart)

#### 1.5 Activity Stats
- **Total time today/week/all**
- **Most used app**
- **Productive time percentage**
- **Current streak**

#### 1.6 Recent Sessions
- **Feature:** List of recent app usage sessions
- **Details:**
  - Shows "App" or "Website" based on type

  - Duration, start time, category

  - Click to view session details

#### 1.7 Quick Stats Cards
- **Active time today**
- **Productive apps count**
- **Distracting apps count**
- **Neutral apps count**

#### 1.8 Period Selector
- **Options:** Today, This Week, This Month, All Time
- **Affects:** All dashboard charts and stats
- **Default:** Week (changed from Today on 2026-05-06)

#### 1.9 Time Mode Toggle
- **Options:** Hours, Seconds
- **Affects:** All time displays

#### 1.10 Activity Type Toggle
- **Options:** Apps, Websites, Combined
- **Affects:** Which activities show in orbit/heatmap

#### 1.11 Dashboard Optimization (v3.58)
- **Feature:** Major performance overhaul â€” replaced 6 redundant useMemos with single `getDashboardAggregates` IPC call
- **Chart bars:** Computed from backend `weeklyHeatmap`
- **Hourly heatmap:** From backend grid data
- **Solar data:** From backend `appStats`/`websiteStats`
- **Overview stats:** From backend `overview`
- Dashboard no longer receives raw `allLogs` prop

#### 1.12 Focus Sessions
- **Feature:** Track uninterrupted productive sessions with minimum duration filter
- **Min duration:** Default 60s (configurable slider)
- **Idle detection:** Uses `lastInteractionRef` + 5min clamp â€” idle periods don't inflate durations
- **Stopwatch pauses:** Skip accumulation during idle (>5min no interaction)
- **Old data cleared:** `clear-productivity-sessions` IPC on mount
- **Refresh:** 5s auto-refresh interval

#### 1.13 Stopwatch (Productive Timer)
- **Feature:** Always-visible timer tracking current productive streak
- **Accumulated delta pattern:** Timer accumulates across app switches (only resets on explicit pause/clear)
- **Live tracking:** Adds live `currentProductiveMs` on top of DB stats
- **Tier fallback:** Shows tier name + "Session" when app is null but tier is known

---

## ðŸ“Š 2. Stats Page (`/stats`)

**Component:** `src/pages/StatsPage.tsx`

### Core Features:

#### 2.1 App Statistics Table
- **Feature:** Detailed table of all tracked apps
- **Columns:** App name, Category, Total time, Sessions, Avg duration
- **Sorting:** Click column headers to sort
- **Filtering:** Search by app name
- **Performance:** Optimized via useMemo + single-pass date map (removed O(n) redundancies)

#### 2.2 Time Distribution Charts
- **Pie Chart:** Category distribution (productive/neutral/distracting)
- **Bar Chart:** Top apps by usage time
- **Line Chart:** Usage over time
- **Period-aware:** 24h bars for today, daily for week, 30-day for month, 90-day for all

#### 2.3 Category Breakdown
- **Feature:** Per-category stats and charts
- **Details:** Time per category, apps in category, percentage of total

#### 2.4 Full Sessions List with Edit/Delete
- **Feature:** Complete session list per app in detail modal
- **IPC:** `update-app-log`, `delete-app-log` handlers
- **Inline edit:** datetime-local inputs for start/end time
- **Delete:** With confirmation dialog
- **Matches External page sessions UX**

#### 2.5 Live Tracking Indicator
- **Feature:** Real-time tracking bar at top of page
- **Pulsing green dot** when app is actively tracked
- **Current app name + category badge**
- **Live elapsed timer**
- Disappears when no app active

- Listens to `onForegroundChange` event

#### 2.6 Live Detection Panel
- **Feature:** Real-time event log (terminal-style dark panel)
- **Shows:** timestamp, INFO badge, app name, category
- **50-event ring buffer**
- **Global persistence:** App.tsx `liveActivityLogs` prop (survives page navigation)
- Matches Browser Activity page Live Detection UX

#### 2.7 Export Functionality
- **Export to CSV:** Download stats as spreadsheet
- **Export to JSON:** Download raw data

#### 2.8 Period Selector
- Same as Dashboard (Today/Week/Month/All)

#### 2.9 Time Mode Toggle
- Hours/Seconds display

#### 2.10 Timeline Navigation
- **Forward/backward** arrow buttons in header
- **Dynamic period label** (e.g., "Wed, Jun 2", "Week of May 24")
- **filteredLogs** computed from `selectedPeriod` + `dateOffset`
- **All memos** use filtered data (sortedApps, totals, categoryBreakdown, dailyUsage, hourlyDistribution)

---

## ðŸ“ˆ 3. Productivity Page (`/productivity`)

**Component:** `src/pages/ProductivityPage.tsx`

### Core Features:

#### 3.1 Productivity Score
- **Feature:** Overall productivity percentage
- **Calculation:** (Productive time / Total time) Ã— 100
- **Visual:** Large score display with color coding

#### 3.2 Focus Time Tracking
- **Feature:** Tracks uninterrupted productive sessions
- **Details:** Start/end times, duration, apps used

#### 3.3 Productivity Trends
- **Line Chart:** Productivity score over time
- **Comparison:** vs previous periods

#### 3.4 App Productivity Classification
- **Productive Apps:** IDE, AI Tools, Education, etc.
- **Neutral Apps:** Browser, Communication, etc.
- **Distracting Apps:** Entertainment, Social Media, etc.

#### 3.5 Browser Productivity
- **Feature:** Track productive vs distracting websites
- **Domain Rules:** Custom rules in Settings
- **Domain Keyword Rules:** Auto-classify by keywords

#### 3.6 Period Selector
- Today/Week/Month/All

#### 3.7 Score & Trend Fixes
- **score-trend connection fix:** `trendAverageScore` useMemo computes from daily trend averages instead of raw data
- **browser category remapping fix:** `WEBSITE_CATEGORY_MAP` applied correctly â†’ Search Engine â†’ Productivity, Developer Tools â†’ Tools

#### 3.8 Focus Sessions
- **Feature:** Track uninterrupted productive sessions with idle detection
- **Idle detection:** Uses `lastInteractionRef` + 5min clamp â€” idle periods don't inflate durations
- **Stopwatch pauses:** Skip accumulation during idle (>5min no interaction)
- **Min duration:** Default 60s (configurable slider)

#### 3.9 Chart & Display Fixes
- **chart height fix:** Chart height changed from `h-40` to `h-72` (288px)
- **hour overflow fix:** Stacked hour totals capped at 3600s per hour to prevent overflow
- **unknown websites score fix:** `categorizeDomain` last resort changed from 'Uncategorized' (50%) to 'Entertainment' (0%)

#### 3.10 Timeline & Session Navigation
- **timeline navigation:** `dateOffset` with chevron forward/backward navigation
- **session detail view:** Per-session message viewer with expandable details

---

## ðŸŒ 4. Browser Activity Page (`/browser`)

**Component:** `src/pages/BrowserActivityPage.tsx`

### Core Features:

#### 4.1 Website Tracking
- **Feature:** List all visited websites with time spent
- **Details:** URL, domain, title, duration, visits count

#### 4.2 Domain Grouping
- **Feature:** Group by domain (e.g., all github.com pages)
- **Shows:** Total domain time, pages visited

#### 4.3 Category Assignment
- **Auto-categorization:** Based on domain rules
- **Manual override:** Reassign in Settings

#### 4.4 Top Sites Chart
- **Bar Chart:** Most visited sites
- **Pie Chart:** Category distribution

#### 4.5 Search & Filter
- **Search:** By URL or title
- **Filter:** By category, date range

#### 4.6 Period Selector
- Today/Week/Month/All

#### 4.7 Timeline Navigation
- **Feature:** Forward/backward arrow buttons, `dateOffset` state
- **Dynamic period label:** Updates based on selected range + offset

#### 4.8 Chart Period Awareness
- **Feature:** `hourlyDistribution` produces period-appropriate data
- **24h bars for today**, 7 daily bars for week, 30 for month, 90 for all

#### 4.9 Live Detection Panel
- **Feature:** Real-time event log (terminal-style dark panel)
- **Shows:** timestamp, INFO badge, app name, category
- **50-event ring buffer**
- **Global persistence:** Survives page navigation via `liveActivityLogs` prop
- Matches Stats page Live Detection UX

#### 4.10 Tab Bar
- **Feature:** 7 content tabs â€” Overview / IDEs / Tools / Projects / AI / Git / Trash
- Each tab shows filtered subset of browser activity

#### 4.11 Live-Log Race Condition Fix
- **Feature:** Browser focus check prevents stale live-logs from updating `currentWebsite` when non-browser app is focused
- Ensures accuracy of currently displayed website data

---

## ðŸ› ï¸ 5. IDE Projects Page (`/ide`)

**Component:** ``src/pages/IDEProjectsPage.tsx` (~3271 lines)`

### Core Features:

#### 5.1 IDE Detection
- **Auto-detect installed IDEs:**
  - VS Code / VSCode Insiders
  - Cursor
  - IntelliJ IDEA (Community + Ultimate)
  - PyCharm (Community + Professional)
  - WebStorm, PhpStorm, RubyMine, GoLand, CLion, Rider, DataGrip
  - Android Studio
  - Xcode (macOS)
  - Google Antigravity
- **Detection methods:**
  - Command existence (`where code`, `where idea64`)
  - JetBrains Toolbox config (`.toolbox.xml`)
  - Directory scanning (`%LOCALAPPDATA%/JetBrains`)
  - Environment variables (`IDE_INSTALL_LOCATION`)

#### 5.2 Project Management
- **Add Project:** Manual add with name, path, default IDE
- **Detect Projects:** Scan directories for project files
- **Project Grid:** Visual grid of all projects with IDE icons
- **Project Details:** Click to view project info, extensions, stats

#### 5.3 Extension Tracking
- **Per-IDE extension list**
- **Version tracking**
- **Enabled/disabled status**

#### 5.4 Open Project in IDE
- **Feature:** Launch project directly in selected IDE
- **IPC:** `open-project` ? launches IDE with project path

#### 5.5 Workspace Launch
- **Feature:** Open integrated terminal workspace for project
- **Navigates to:** `/terminal` with `projectId` + `projectPath` props
- **Opens:** `TerminalPage` component with full workspace UI

#### 5.6 AI Usage Overview
- **Feature:** Aggregate AI tool usage stats
- **Shows:** Total tokens, total cost, by tool breakdown
- **IPC:** `getIDEProjectsOverview()`

#### 5.7 Project Analytics
- **Charts:** Commits, additions, deletions (if git repo)
- **Stats:** File count, language breakdown
- **Time tracking:** Total time spent on project

#### 5.8 IDE Tools Detection
- **Version Control:** Git, SVN, etc.
- **Runtimes:** Node.js, Python, Java, etc.
- **Package Managers:** npm, yarn, pip, etc.
- **Databases:** MySQL, PostgreSQL, MongoDB, etc.
- **Cloud Tools:** AWS, Azure, GCP CLIs

#### 5.9 Project Search & Filter
- **Search:** By name or path
- **Filter:** By IDE, category

#### 5.10 Project Categories
- **Web Development**
- **Mobile Development**
- **Data Science**
- **DevOps**
- **Other**

#### 5.11 Analytics Tab
- **Feature:** Workspace-wide AI usage, problems, and requests dashboard
- **Component:** `AnalyticsDashboard` with `variant="workspace"`
- **Shows:** Token usage, cost, problem counts, request stats

#### 5.12 Initialize Button
- **Feature:** Green `FolderTree` button in project header
- **Opens:** `InitializeProgressModal` with 16-step grouped progress display
- **Groups:** Organized by directory (agent/, agent/skills/, graphify-out/)
- **Per-group counters** with expandable file previews
- **Workspace Ready** summary card on completion
- **Error retry** support with restart capability

#### 5.13 Setup Button
- **Feature:** Amber `Settings2` button in project header
- **Opens:** `WorkspaceSettingsDialog` for workspace configuration
- **Settings:** System toggles, slider adjustments, save persistence

#### 5.14 New Agent Button
- **Feature:** Dispatches `open-new-agent` event
- **Opens:** `NewSessionDialog` pre-populated from workspace settings

#### 5.15 Workspace Minimize
- **Feature:** Hides terminal layout + sidebar while keeping PTY processes alive
- **UI:** Centered restore card to bring workspace back
- **Toggle:** Minimize/Restore cycle

#### 5.16 Close Workspace with Save Prompt
- **Feature:** Save & Close / Discard / Cancel dialog
- **Options:** Save workspace state before close, discard changes, or cancel

#### 5.17 Health Score Fix
- **Feature:** Path-based matching for AI usage queries
- **Fix:** Corrects health score calculation by matching project paths accurately

#### 5.18 Consolidated getProjectDetails
- **Feature:** Single IPC call instead of 4 parallel calls
- **Optimization:** Reduces network/process overhead for project detail loading

#### 5.19 Setup vs Initialize Separation
- **Feature:** Clear separation of concerns
- **Initialize:** Creates agent directory structure and scaffolding files
- **Setup:** Configures workspace settings (systems, toggles, sliders)

---

## ðŸ’» 6. Terminal Page / Workspace (`/terminal`)

**Component:** `src/pages/TerminalPage.tsx` (~5235 lines)
**Terminal Component:** `src/components/TerminalWindow.tsx` (607 lines)
**Hook:** `src/hooks/useTerminalLayout.ts`

### Core Features:

#### 6.1 Multi-Pane Terminal
- **Technology:** `@xterm/xterm` terminal emulator with node-pty backend
- **Multi-pane support:** Split panes horizontally/vertically via N-ary tree (PaneNode.children refactored from binary tuple to array)
- **3-terminal grouping fix:** Each new terminal gets its own group with equal screen space
- **Layout Groups:** Terminals organized into groups based on their split parent in the tree
- **Active terminal tracking:** Tracks which pane is active via `activeTerminalId` state
- **Terminal spawn:** `terminal:create` IPC with CWD = project path
- **Resize handling:** `terminal:resize` IPC for dimension changes
- **Agent integration:** Supports OpenCode, Claude Code, Codex, Aider, Cursor agents
- **Agent readiness state machine:** `spawning` ? `waiting` ? `ready`|`timeout` with cyan/amber status overlays
- **Agent signatures:** Pattern matching for opencode/claude/aider/codex/generic agent detection
- **Message queue:** Instructions sent before agent is ready are queued and flushed after system prompt
- **Input buffer:** Keystrokes before PTY is ready are buffered and flushed on `terminal:ready` event
- **Double-spawn fix:** Removed `spawnTerminal` from `onCreate` handler to prevent duplicate terminals
- **System prompt queuing:** Merged prompt + init content as queue items with `[SYSTEM CONTEXT]` markers
- **Terminal:write-raw:** Dedicated channel for system writes (no prompt history pollution)
- **Startup delay guard:** 3s startup delay before agent signature checking (prevents shell prompt false-positive)
- **Auto-recovery:** `retry-agent-init` handler for failed agent initialization

#### 6.2 Sidebar Tabs (12 tabs + 1 divider):

**Tab Group 1 ï¿½ Management (Tools):**

##### 6.2.1 Presets Tab
- **Icon:** `Zap` (green accent)
- **Feature:** Save/reuse common terminal commands
- **DB Table:** `terminal_presets`
- **Fields:** id, name, command, category
- **Execute:** Writes command to active terminal
- **Grouping:** By category (general, build, test, deploy, etc.)
- **Operations:** Add preset via inline form, execute with one click

##### 6.2.2 Sessions Tab
- **Icon:** `Clock` (green accent)
- **Feature:** View AI agent chat history and session management
- **DB Table:** `terminal_sessions`
- **Fields:** id, agent, topic, resume_id, created_at, total_cost, total_tokens, status, category, product_area, description, auto_tags
- **Status tracking:** StatusDot indicator (active/idle/completed/error/cancelled)
- **Category filter:** Filter pills by SESSION_CATEGORIES
- **Session cards:** Show status dot, category badge, agent badge, topic, terminal status (Running/Closed), description, date, tags, cost
- **Session edit dialog:** Two-column form for editing session metadata
- **Import opencode sessions:** Dialog for importing external session data
- **Session loading:** Increased to 500 sessions per load
- **Detail view:** Click a session ? full detail panel with:
  - Session metadata grid (status, category, date, terminal, cost, tokens, resume_id, description, product_area)
  - Focus Terminal / Open in Terminal buttons
  - Message viewer with Refresh capability
  - Messages displayed with role coloring (assistant=cyan, user=blue, system=zinc)
- **Message viewer:** Modal popup with Expandable rows, search, and role-colored messages
- **Search & filter:** Filter sessions by text, status, category, agent
- **Actions:** Focus terminal, Open in terminal (resume), View messages, Delete

##### 6.2.3 Map Tab
- **Icon:** `Monitor` (green accent)
- **Feature:** Terminal layout visualization + group-managed terminal list
- **Components:** `TerminalMiniMap` ï¿½ draggable pane layout visualization
- **Mini Map:** Shows all terminal panes as draggable rectangles, click to focus, drag to rearrange via PaneNode tree
- **Drag-to-rearrange + drag-to-split:** Uses `@dnd-kit` for drag-and-drop pane manipulation
- **Quadrant detection:** Drop zones detect quadrant position for split direction
- **Running Terminals (grouped):** Below the map, terminals organized by layout groups showing:
  - Group number, split direction (? Stack / ? Side-by-side), terminal count
  - Each terminal: name, agent, active indicator, linked session info (topic, category, status)
  - Focus button, New Session button for unassigned terminals
- **Sessions list:** Below terminals, shows all sessions with running/closed status

##### 6.2.4 Analytics Tab
- **Icon:** `PieChart` (green accent)
- **Feature:** AI usage analytics with period selection
- **Variant:** `variant='project'` for project-specific sessions data
- **Period selector:** Day / Week / Month toggle bar
- **Overview cards:** Total tokens, Total cost ($), Session count
- **By Agent breakdown:** Visual bar chart with gradient bars showing token usage per agent
- **Top Sessions by Cost:** Sortable list of most expensive sessions (topic, agent, date, cost)
- **Data source:** `getAIUsageSummary(period)` IPC + sessions data

##### 6.2.5 Problems Tab
- **Icon:** `AlertCircle` (purple accent)
- **Component:** `ProblemsTab` (inline component)
- **Feature:** Track and manage project problems/issues
- **Status filter:** All / Active / By status (NEW, Not Started, In Progress, AI Attempted Fix, User Testing, Fixed, Irrelevant)
- **Group by status:** Problems displayed grouped by status with color-coded headers
- **Redesigned glass cards:** Priority glow dots using PRIORITY_INDICATORS colors
- **ProblemDetailModal:** Redesigned with improved layout and field organization
- **Inline edit:** Click to expand, edit fields, change status
- **Operations:** Create, update status, assign to terminal, delete
- **Link problem to request:** Associate problems with related requests
- **Auto-refresh:** Polls every 5 seconds

##### 6.2.6 Requests Tab
- **Icon:** `FileText` (blue accent)
- **Component:** `RequestsTab` (inline component)
- **Feature:** Track project requests and feature requests
- **Redesigned glass cards:** Same glass styling as Problems tab
- **Link/unlink problems:** Associate requests with related problems
- **RequestDetailModal:** Dedicated detail view for requests
- **Status filter:** All / Pending / In Progress / Completed / Cancelled
- **Inline edit:** Click to expand and edit
- **Operations:** Create, update status, delete
- **Auto-refresh:** Polls every 5 seconds

##### 6.2.7 Files Tab
- **Icon:** `Folder` (yellow accent)
- **Component:** `FilesTab` (inline component)
- **Feature:** Browse `agent/` directory markdown files
- **IPC:** `read-agent-file`, `list-agent-files`
- **Features:** Navigate subdirectories, view markdown content with syntax highlighting
- **Scope:** Uses `projectPath + '/agent'`
- **Read-only:** View files, no edit capability
- **Pulse notification:** Green ping dot when agent files change (via `onAgentFileChanged`)

**Tab Group 2 ï¿½ Utilities:**

##### 6.2.8 Checklists Tab
- **Icon:** `CheckCircle2` (emerald accent)
- **Feature:** Project-specific task tracking and progress
- **Status:** Placeholder (future implementation)
- **Planned:**
  - Create/edit checklists linked to problems/requests
  - Track completion percentage
  - Requires human verification

##### 6.2.9 Skills Tab
- **Icon:** `Sparkles` (indigo accent)
- **Component:** `SkillsTab` (inline component, ~400 lines)
- **Feature:** Manage AI agent skills and capabilities
- **IPC:** `getSkills(projectPath)`, `createSkill()`, `updateSkill()`
- **Skill source:** Parses from `agent/skills/` directory (subdirs with SKILL.md + standalone .md files) + legacy `agent/skills.md`
- **Each skill has:** id, name, description, category, content (markdown), filePath
- **Skill DSL integration:** Dynamic forms generated from YAML frontmatter metadata
- **10 widget types:** select, radio, switch, slider, text, textarea, code, file, checkbox, tags
- **GeneralistDialog:** Dialog with search + category filter for browsing all skills
- **Inline CRUD:** Create, read, update, delete skills with inline forms
- **Search:** Filter skills by name/description/content
- **Category filter:** Filter pills by skill category
- **Skill cards:** Show name, category badge, description
- **Expandable:** Click to show full markdown content with path info
- **Use Skill modal:** View skill content, select target terminal, enter prompt, send to terminal
- **Auto-refresh:** Polls every 10 seconds
- **Notification toast:** Success/error feedback on operations

##### 6.2.10 Configs Tab
- **Icon:** `Settings` (orange accent)
- **Feature:** Manage project-specific configurations
- **Model config controls:**
  - Threshold slider (3-30)
  - Tier selector
  - Debug toggle
- **Cross-session sync config:**
  - Master toggle (enable/disable cross-session sync)
  - TTL slider (30-600s)
  - Context broadcast toggle
  - Conflict mode dropdown
  - `/sync` toggle
- **Thought-process toggle:** Inject `## Thought Process` instruction after system prompt
- **Prompt textarea:** Moved to dedicated Prompts tab

##### 6.2.11 History Tab
- **Icon:** `Clock` (rose accent)
- **Component:** `PromptHistoryTab`
- **Feature:** Prompt history with search, filter, and management
- **Search/filter:** Filter prompts by text, agent, date
- **Delete:** Remove individual prompt history entries
- **Limit:** Configurable history limit in Settings
- **Expandable cards:** Click to expand and view full prompt content
- **Agent filter:** Filter by specific AI agent

**Visual Divider (vertical line, zinc-700/50)**

##### 6.2.12 Context Maintenance Tab ?
- **Icon:** `Database` (violet accent)
- **Feature:** Persistent AI memory management across sessions
- **Component:** `src/components/ContextMaintenanceTab.tsx` (382 lines)
- **6 sub-components:**
  - `MemoryStatusCard` ï¿½ Token usage visualization
  - `ActiveContextsList` ï¿½ Skill, graphify, wiki, QMD contexts with toggles
  - `RecentChatHistory` ï¿½ Recent chat history with message management
  - `CompactionsPanel` ï¿½ Monthly summary management
  - `ContextSearchBar` ï¿½ Semantic + full-text search
  - `SettingsPanel` ï¿½ Auto-compaction, RAG mode, token budget
- **4 new IPC endpoints:** Dedicated handlers for context maintenance operations

##### 6.2.13 Prompts Tab
- **Icon:** `ScrollText` (accent)
- **Feature:** Dedicated prompts management
- **Project prompt textarea:** Moved from Configs tab to dedicated Prompts tab
- **Prompt editing:** Write and save project-specific system prompt additions

#### 6.3 Layout & Group System
- **N-ary tree layout:** `PaneNode.children` refactored from binary tuple to array for flexible splits
- **Group extraction:** `extractGroups()` helper collects terminals into top-level split groups with equal screen space
- **Layout persistence:** Save/load via `workspace:save` / `workspace:load` IPC
- **Layout auto-sync:** Panes auto-populate `terminalTabs` state on layout changes
- **MapEditor:** Drag-to-rearrange + drag-to-split with `@dnd-kit` library
- **Split handle drag resize:** Mouse-based divider dragging for pane resizing
- **TerminalPane hover controls:** Split/close buttons appear on hover
- **Workspace state:** Saved to `workspace_state` DB table (sidebarWidth, activeTab, terminalTabs)

#### 6.4 AI Agent Integration
- **Supported Agents:**
  - OpenCode (`opencode`)
  - Claude Code (`claude`)
  - Codex (`codex`)
  - Aider (`aider`)
  - Cursor (`cursor`)
- **Agent switching:** Agent can be changed via session edit dialog
- **Session Management:**
  - NewSessionDialog with `mode` prop (create | initialize)
  - Resume sessions via `resume_id`
  - Session categorization (category, product_area, description, auto_tags, category_confirmed)
- **Init content:** Auto-load INITIALIZE.md, custom init files, problem/request context
- **Thought Process toggle:** Injects `## Thought Process` instruction after system prompt
- **Skill DSL:** 10 widget types (select, radio, switch, slider, text, textarea, code, file, checkbox, tags) from YAML frontmatter

#### 6.5 Instruction Panel
- **Feature:** Full instruction composer with problem/request checkboxes, skill dropdown, prompt preview, and send
- **Markdown preview:** Amber headers, green checkboxes, cyan code blocks
- **Copy button:** Copies instruction text with 1.5s feedback animation
- **Persistence:** Saves to `localStorage` per sessionId, survives close/reopen
- **Cancel/Clear buttons:** Discard or clear instruction content
- **Use Skill button:** Routes skill selection through Skill DSL widget flow
- **storageKey:** Included in `useEffect` deps for reliable persistence
- **System prompt layers:** Collapsible include/exclude toggles for each layer
- **Target terminal indicator:** Shows agent readiness for target terminal
- **Escape key:** Closes the instruction panel

#### 6.6 Session Categorization
- **Feature:** Auto-categorize and manually categorize sessions
- **Categories:** feature, bug-fix, research, code-review, refactor, devops, docs, other
- **Fields:** category, product_area, description, status, auto_tags, category_confirmed
- **Category auto-analysis:** Keyword scoring fallback for automatic categorization
- **IPC:** `updateSessionCategory`, `getParsedSessionItems`, `analyzeSessionCategory`
- **Display:** CategoryBadge and StatusDot components throughout all terminal views
- **Statuses:** active, idle, completed, error, cancelled
- **@mention routing:** Dropdown appears when typing `@` in Send bar, filters by query, arrow key navigation
- **AI Metadata Contract:** AGENTS.md template with Session Metadata Requirements section
- **Session metadata auto-parsed:** Automatically parsed on each assistant message insert

#### 6.7 File Change Detection
- **Feature:** Visual pulse notification when agent files change
- **Mechanism:** `onAgentFileChanged` IPC event
- **Files affected:** AGENTS.md, PROBLEMS.md, etc. in `agent/` dir
- **Visual:** Green ping animation on Files tab icon

#### 6.8 Project Integration
- **Receives props:** `projectId`, `projectPath` from IDEProjectsPage
- **CWD:** Terminal working directory = `projectPath`
- **Scoped data:** Problems, requests, todos, presets can be project-specific
- **Project switching:** Dropdown in sidebar, persists in localStorage

#### 6.9 Workspace Save/Load
- **Save:** `workspace:save` IPC ? saves layout + activeTab + terminalTabs to `workspace_state` table
- **Load:** `workspace:load` IPC ? restores workspace state on mount
- **Auto-save:** Debounced 2s on layout/state changes
- **Minimize/Restore toggle:** Hides terminal layout + sidebar but keeps PTY processes alive

#### 6.10 Compose & Prompt Systems
- **Short compose:** Quick prompt input for active terminal
- **Long compose:** Full InstructionPanel with skills dropdown, problem/request linking
- **PromptDesignDialog:** For `generate-prompt` skill workflow (read-only prompt.md + RESULT.md textarea)
- **SkillsTab:** Use Skill button routes `generate-prompt` to PromptDesignDialog
- **System prompt layers:** Default + general additions + project additions + optional session additions
- **@mention routing:** Resolve @mentions to terminal names and session topics

#### 6.11 Terminal Management
- **New Terminal:** Spawn new terminal pane via IPC
- **Close Terminal:** Destroy terminal process via `terminal:destroy`, remove pane from layout
- **Split Pane:** Horizontal/vertical split of current pane
- **Resize:** Drag pane dividers to resize
- **Project Switcher:** ? ? arrows in header
- **Sidebar toggle:** Collapse/expand sidebar
- **Error toast bar:** Visible above terminal layout with 8s auto-clear
- **Input buffer:** Buffers keystrokes before PTY is ready, flushes on terminal:ready
- **Workspace close dialog:** Save & Close / Discard & Close / Cancel
- **Context-changed UI refresh:** Writes delta messages to active terminal on context changes

#### 6.12 Cross-Session Sync
- **touched_files DB table:** Tracks file edits per terminal for conflict detection
- **File Lock Manager:** In-memory lock registry with 60s TTL sweep for automatic lock cleanup
- **Conflict detection:** `detectEditsInOutput()` scans agent output for file write patterns in both `terminal:create` and `spawn-terminal` handlers
- **Lock cleanup:** Automatic on terminal kill (process destroyed ? locks released)
- **7 IPC handlers:** `lock-file`, `release-file-lock`, `get-file-locks`, `get-locks-for-terminal`, `get-touched-files`, `compile-sync-summary`, `broadcast-context-delta`
- **UI integration:** Conflict toast notifications, `/sync` command interception, lock indicators in tab bar, periodic lock refresh
- **Context broadcast:** Enhanced `context-changed` batch event with `source`/`actionCount`/`failCount` metadata
- **Configs tab controls:** Master toggle, TTL slider (30-600s), context broadcast toggle, conflict mode dropdown, `/sync` toggle

---

## ðŸ”Œ 7. External Page (`/external`)

**Component:** `src/pages/ExternalPage.tsx`

### Core Features:

#### 7.1 External Activity Tracking
- **Feature:** Track AI tools, websites, and external activities
- **Data Source:** get-external-activities, `get-external-sessions` IPC
- **Shows:** Activity name, duration, category, sessions count
- **get-external-activities type fix:** type field properly persisted

#### 7.2 Time Audit Comparison Card
- **Feature:** Amber (external) vs emerald (internal) hero numbers with side-by-side comparison
- **Progress bars:** Visual comparison of external vs internal time
- **Gradient orbs:** Decorative gradient orbs on each side

#### 7.3 Consistency Score
- **Feature:** Measures consistency of external tool usage
- **Calculation:** Based on daily usage patterns
- **Display:** Score with emoji indicator

#### 7.4 Sleep Tracking
- **Feature:** Manual sleep session tracking with PastSleepModal
- **Add Sleep:** `add-manual-sleep` IPC
- **Wake Up:** `confirm-wake-up` IPC
- **PastSleepModal:** Date picker, edit mode, day arrows for navigation
- **Sleep Trends Chart:** Floating range bars crossing midnight axis
  - Pre-sleep segment (amber)

  - Sleep segment (indigo)

  - Post-wake segment (rose)

- **Sleep chart respects period:** Shows correct number of days (1/7/30/90)
- **Sleep chart click:** Each day bar is clickable ï¿½ opens date-prefilled modal
- **Sleep date advancement fix:** 10-hour heuristic for fell-asleep date
- **Sleep detection redesign:** Window focus/blur tracking, sleep pattern recognition (14 sessions), edit mode
- **Sleep stats removed:** Table removed in favor of floating range chart

#### 7.5 Activity Detail Panel
- **Feature:** Click activity to see detailed stats
- **Shows:** Total time, sessions, daily breakdown chart
- **Drill-down:** View individual sessions
- **Inline activity detail view:** Below grid, stats+charts+sessions, respects period

#### 7.6 Activity Charts
- **3 glass-styled charts:** Daily Usage Trend (vertical bar), Activity Distribution (doughnut), Weekly Trend (vertical bar)
- **Chart respects period selector**

#### 7.7 Period Selector
- **Feature:** Uses top nav period selector (removed duplicate from page)
- **Options:** Today, Week, Month, All
- **Affects:** All charts and stats

#### 7.8 Always-Visible Timer
- **Feature:** Persistent stopwatch at top of external page
- **When idle:** Shows "00:00:00" with "Click to start tracking"
- **Enhanced stopwatch:** Pulsing status dot, 6xl monospace gradient timer, pill-shaped action buttons
- **Pause/Stop controls:** Pause uses pausedAtRef + pausedDuration accumulators, stop passes adjusted end time

#### 7.9 Start/Stop Tracking
- **Start:** `start-external-activity` IPC
- **Stop:** `stop-external-activity` IPC
- **Add Manual Session button:** For past sessions without live timer
- **`remove-activity` handler:** Added for deleting activities
- **AFK session external save fix:** `stop-afk-session` falls back to ANY running session

#### 7.10 Activity Sessions Management
- **Activity sessions edit/delete:** Hover-revealed Pencil/Trash buttons on session items
- **Uniform activity button height:** h-[140px] with always-visible duration

---

## ðŸ“Š 8. Insights / Reports Page (`/reports`)

**Component:** `src/pages/InsightsPage.tsx`

### Core Features:

#### 8.1 Tab Navigation
- **Feature:** Three-tab interface for different insights views
- **Tabs:** Day / Weekly / Activities

#### 8.2 Typical Day Heatmap
- **Feature:** Color-coded 7ï¿½24 grid with intensity-based coloring
- **Shows:** Activity intensity across days of week and hours of day

#### 8.3 Stat Cards
- **Feature:** 5 stats row with trend indicators
- **Details:** Gradient backgrounds, hover animations, trend arrows

#### 8.4 Day of Week Bar Chart
- **Feature:** Productivity per day of week
- **Details:** Color-coded bars with productivity percentage

#### 8.5 Sleep & Recovery Chart
- **Feature:** Grouped bar chart comparing sleep hours vs deficit over time
- **Visual:** Side-by-side bars for each day

#### 8.6 Activity Breakdown
- **Feature:** Animated horizontal bar chart
- **Details:** Progress bars with % labels, session counts per activity

#### 8.7 Daily Activity Trend (Activities tab)
- **Feature:** Bar chart showing daily activity duration over time

#### 8.8 Activity by Category (Activities tab)
- **Feature:** Doughnut chart showing category distribution

#### 8.9 Chart.js Tooltips
- **Feature:** Dark theme styling for all chart tooltips

#### 8.10 Period Selector
- **Feature:** Respects selectedPeriod from top nav
- **Note:** Period selector removed from page (uses top nav only)

---

## ðŸ—„ï¸ 9. Database Page (`/database`)

**Component:** `src/pages/DatabasePage.tsx` (~2000 lines, rewritten)

### Core Features:

#### 9.1 Analytics Dashboard (Default View)
- **Feature:** Data analytics overview with stat cards and charts
- **5 stat cards:** Total tokens, total cost, session count, etc.
- **8 charts:**
  - Token distribution

  - Cost distribution

  - Session count by agent

  - Category distribution

  - Problem distribution

  - Request distribution

  - Response timing (paired sequential user?assistant messages per session)

  - Daily trend

- **AI usage summary:** Aggregate stats about AI agent usage
- **Problems/Requests progress bars:** Visual completion tracking
- **Promise.allSettled:** Each data source fetched independently (no cascade failures)

#### 9.2 View Toggle
- **Feature:** Switch between Analytics and Tables views
- **UI:** Analytics/Tables tabs in header

#### 9.3 Table Search
- **Feature:** Filter tables by name
- **UI:** `tableNameFilter` search input, case-insensitive substring match

#### 9.4 Tables View
- **Feature:** Browse SQLite database tables
- **Shows:** filterable table list ? table content with schema + paginated data + CSV export

#### 9.5 JSON Mode Support
- **Feature:** Shows JSON data when SQLite fails
- **Virtual table:** "logs" table from deskflow-data.json
- **Auto-fallback:** Switches to JSON when SQLite unavailable
- **Self-heal:** Attempts to reconnect to SQLite on each API call

#### 9.6 Schema Viewer
- **Feature:** View table schema (columns, types, constraints)
- **Shows:** Column name, type, nullable, default

#### 9.7 Database Stats
- **Feature:** Database file size, table count, row counts
- **Shows:** Storage usage, fragmentation

---

## âš™ï¸ 10. Settings Page (`/settings`)

**Component:** `src/pages/SettingsPage.tsx`
**Reference:** `agent/docs/SETTINGS_PAGE_FEATURES.md` (full details)

### Core Features:

#### 10.1 Category Management
- **Feature:** Reassign app categories
- **UI:** Carousel with search, visual indicators
- **Operations:** Drag-drop, bulk assign, reset to defaults
- **Persistence:** Saved to database, applied across app
- **Custom Categories UI:** Input + Add button, category pills with delete, auto-assigned to Neutral tier
- **ALL category selection panels** use allCategories (defaults + custom)

#### 10.2 Color Customization
- **Feature:** Customize app colors
- **Color picker:** Per-app color selection
- **Reset:** Revert to default colors

#### 10.3 Tracking Settings
- **Timer Behavior:** Start/stop/pause behavior
- **Tracker App Mode:** (setting details in Settings page)
- **Auto-start:** Start tracking on app launch
- **App Switch Debounce:** Configurable delay (Off/1s/2s/3s/5s) before confirming app switches
- **Sleep Gap Detection:** Time before app is considered "sleep" (presets: 5s/10s/15s/30s)
- **Max Session Duration:** Maximum app session length (presets: 1m/3m/5m/10m)
- **Transient app filter toggle:** Filter out short-lived background apps
- **Model config section removed** (belongs in terminal settings)

#### 10.4 Browser Rules
- **Domain Rules:** Auto-categorize websites
- **Keyword Rules:** Classify by URL keywords
- **Add/Edit/Delete rules**

#### 10.5 General Settings
- **Launch on startup**
- **Minimize to tray**
- **Theme selection** (light/dark/system)
- **Language selection**
- **Prompt History section:** Preset limit buttons (3/5/10/20/50/100) + custom input for history display count

#### 10.6 System Prompts Tab (Tab 5)
- **Feature:** Per-agent prompt editors
- **Agents:** claude, opencode, custom
- **4-level system prompt merge:** default + general additions + project additions + optional session additions
- **DEFAULT_SYSTEM_PROMPT in `defaults.ts`:** Comprehensive ~280-line version

#### 10.7 Data Management
- **Export data:** JSON, CSV formats
- **Import data:** Restore from backup
- **Reset data:** Clear all tracking data
- **Database location:** View/change DB path

#### 10.8 Save/Reset
- **Save Changes:** Persist all settings to database
- **Reset to Defaults:** Revert all settings
- **Unsaved Changes Warning:** Modal prompts if navigating away

---

## â“ 11. IDE Help Page (`/ide-help`)

**Component:** `src/pages/IDEHelpPage.tsx`

### Core Features:

#### 11.1 Setup Instructions
- **Feature:** Step-by-step guide to configure IDE detection
- **Covers:** VS Code, JetBrains IDEs, Cursor, etc.

#### 11.2 Troubleshooting
- **Feature:** Common issues and solutions
- **Covers:** IDE not detected, wrong path, etc.

#### 11.3 FAQ
- **Feature:** Frequently asked questions
- **Topics:** Project detection, workspace usage, etc.

---

## ðŸ”§ App-Wide Features

### A.1 Period Selector (Top Nav)
- **Options:** Today, This Week, This Month, All Time
- **Affects:** All pages that show time-based data
- **State:** Managed in `App.tsx`, passed via props

### A.2 Time Mode Toggle (Top Nav)
- **Options:** Hours, Seconds
- **Affects:** All time displays across app
- **State:** Managed in `App.tsx`, passed via props

### A.3 Activity Type Toggle (Top Nav)
- **Options:** Apps, Websites, Combined
- **Affects:** Dashboard orbit, heatmap, etc.
- **State:** Managed in `App.tsx`, passed via props

### A.4 Navigation
- **Sidebar:** Glass-morphism sidebar with page links
- **Active indicator:** Highlights current page
- **Icons:** Lucide React icons

### A.5 Notifications
- **Toast notifications:** Success/error messages
- **Sound:** Optional notification sound
- **complete.py:** External notification script (beep + speech)

### A.6 Cross-Session Context Sync
- **Feature:** File lock manager, conflict detection, context broadcast, /sync command
- **Components:** 7 IPC handlers, file lock manager, context broadcast system
- **Conflict resolution:** 12-step resolution protocol, auto-merge on compatible changes

### A.7 Skill DSL
- **Feature:** Dynamic UI generation from SKILL.md frontmatter
- **Widget types:** 10 widget types (text, select, slider, toggle, button, etc.)
- **Validation:** Schema validation for skill frontmatter
- **Groups:** Hierarchical widget grouping with layout directives

### A.8 Context Management System
- **Feature:** 6 knowledge system toggles (Graphify, LLM Wiki, Obsidian, PARA, QMD, Skills)
- **SVG context map:** Visual representation of active knowledge sources
- **Token budget:** Configurable token allocation per system

### A.9 Session Categorization
- **CategoryBadge:** Visual badge component with color-coded categories
- **StatusDot:** Status indicator (active/idle/completed/error/cancelled)
- **@mention routing:** Resolve @mentions to terminal names and session topics
- **AI metadata contract:** Structured session metadata (title, description, category, product_area)

### A.10 Terminal Agent Readiness
- **Feature:** State machine for agent lifecycle management
- **Agent signatures:** Unique agent identification protocol
- **Message queuing:** Ordered message delivery with backlog recovery

---

## Feature Status Summary

| Page | Status | Completion |
|------|--------|------------|
| Dashboard | âœ… Complete | 98% |
| Stats | âœ… Complete | 95% |
| Productivity | âœ… Complete | 95% |
| Browser Activity | âœ… Complete | 95% |
| IDE Projects | âœ… Complete | 98% |
| Terminal/Workspace | âœ… Complete | 98% |
| External | âœ… Complete | 98% |
| Insights/Reports | âœ… Complete | 90% |
| Database | âœ… Complete | 95% |
| Settings | âœ… Complete | 98% |
| IDE Help | âœ… Complete | 100% |

---

## Recent Feature Additions

### 2026-06-02:
- Skill DSL: dynamic UI from SKILL.md frontmatter (10 widgets, validation, groups, file picker)
- AFK session duration fix (re-idle race â€” computes real elapsed from started_at)
- Terminal analytics wiring (variant='full', data fetching for problems/requests/promptHistory/dailyStats)
- TerminalMiniMap height clamp fix (h-36 â†’ h-full)
- Empty terminal tab agent name fix
- Dashboard TDZ crash fix
- 3 productivity data bugs (browser re-fetch, score-trend connection, unknown websites)
- Prompt entry/sending/session UID fix (RESULT.md alignment)
- Cross-session sync config IPC (5 state vars, Configs tab card)

### 2026-06-01:
- InitializeProgressModal redesign: grouped directory views, expandable previews, retry
- Cross-session conflict detection + context sync (12 steps, file locks, 7 IPC handlers)
- Thought-process toggle in workspace Configs tab
- Session init order fix (agent first, 500ms pause, then system prompt)
- AnalyticsDashboard variant prop (project/workspace/full) across 3 pages
- Import opencode sessions dialog (shift-click range)
- Problems/Requests date parsing fix ("16d ago" for all items)
- 3-terminal grouping fix (PaneNode.children binary tuple â†’ array)
- Prompt entry fix: system prompt layers, real session UID via opencode session list
- Dashboard stats 0m fix (live currentProductiveMs on top of DB)
- Focus Sessions 0s fix (minDuration slider default 300â†’60)
- StatsPage optimization (3 redundant O(n) computations removed)
- Activity feed stopwatch fix (always-isActive for new feed items)
- Productivity chart category mapping fix (WEBSITE_CATEGORY_MAP priority)

### 2026-05-29/30:
- Dashboard optimization: getDashboardAggregates IPC (6â†’1 useMemo)
- Full sessions list with edit/delete on StatsPage
- Live tracking indicator on StatsPage
- Live Detection panel on StatsPage (50-event ring buffer, global persistence)
- TutorialPage redesign (15 page-accurate feature entries)
- Database page analytics dashboard (5 stat cards, 8 charts)
- Design Workspace tab in TerminalPage (pink Palette tab)
- GeneralistDialog: filterable grid dialog with search + category filter
- SKILL.md inputs/outputs/components frontmatter (6 files updated)

### 2026-05-25/27:
- Context Maintenance tab wired: 6 sub-components, 4 IPC endpoints
- Design skills integration: 5 skills, 8 references, 3 taste knobs
- Setup vs Initialize redesign: InitializeProgressModal, WorkspaceSettingsDialog
- IDE workspace buttons: Minimize (Minimize2), Provision (FolderTree), New Agent (Bot)
- Sleep detection redesign: window focus/blur tracking, pattern recognition (14 sessions)
- PastSleepModal: date picker, edit mode, day arrows, clickable chart bars
- Sleep chart: per-bar latency labels (3-segment bars: amber/indigo/rose)
- External vs Internal comparison card: Time Audit with gradient orbs
- Add Manual Session button for past durations
- Custom categories: add/remove persistent UI
- Prompt history: limit + delete (Settings > General)
- Agent readiness protocol: state machine (spawningâ†’waitingâ†’ready|timeout), 5 agent signatures
- Terminal:write-raw: system writes no longer pollute prompt history
- Sleep detail: floating range chart (bedtimeâ†’wake crossing midnight axis)

### 2026-05-18/22:
- Context Management System: 6 knowledge system toggles, SVG context map, token budget bar
- Session categorization: category/status/area/tags fields, auto-parse from AI metadata
- @mention routing: dropdown on @ in Send bar, arrow key nav, Enter to send
- CategoryBadge + StatusDot components
- System prompt overhaul: 4-level merge (default + general + project + session)
- PromptHistoryTab: search/filter, delete, limit (3-100), agent filter
- PromptDesignDialog: generate-prompt skill workflow (read-only input + RESULT.md output)
- InstructionPanel + TerminalMiniMap
- Problems/Requests JSON-only data layer (MD is sole source of truth)
- Recursive split pane rendering (PaneNode tree properly interprets children)
- Save button dialog: modal for workspace name
- Terminal context system: 10+ fixes (missing imports, dead events, race conditions)
- Productive timer redesign: accumulated delta pattern (no reset on app switch)
- Activity log + AI-driven actions: 9 features (Enter sends, map split, session dropdown, etc.)

### 2026-05-12/17:
- Agent readiness protocol: Phase 1 complete (spawn-terminal handler, agent signatures, retry)
- Timeline navigation: dateOffset for Productivity, External, Stats, Browser pages
- Sleep detail table + floating range chart
- Productivity chart height/overflow fix (h-40â†’h-72, hourly cap 3600s)
- Solar system 3-in-1 fix: category navâ†’camera, planet tracking, timeline selector in UI
- Terminal workspace Phases 1-6 complete (split pane, presets, sessions, map, persistence)
- Data layer consolidation: Problems/Requests JSON-only (no DB sync)
- Recursive split pane rendering
- Knowledge infrastructure: PARA (6 dirs), QMD (2 templates), LLM Wiki (3 files), Obsidian frontmatter (13 files)
- README update to v2.4
- External page: 3 glass-styled charts refactor
- Auto-start registry fix: dev mode app path
- Browser extension: background tab phantom tracking fix
- Initialize system: 9 fixes (idempotent init, insertIntoLayout, NewSessionDialog mode)
- Initialize.md restructured as checklist
- Session categorization + @mention routing (Phase 1-4 complete)
- Transient app filter toggle (Settings > Tracking)
- Solar system 3-in-1: category dropdown, planet click tracking, timeline selector

### 2026-05-06/10:
- Periodic checkpointing: every 5min, long-running sessions checkpointed
- Sleep gap raised: 10sâ†’30s, null poll threshold 3â†’30
- OS-level idle detection via powerMonitor.getSystemIdleTime()
- External page: uniform buttons, pause/stop controls, enhanced stopwatch
- External activity type fix + session editing
- AI sync efficiency: file mtime tracking, last sync display
- IDE health: fixed "unknown" crash, vcs_branch, sessions query
- Terminal workspace revamp: P0-P5 all complete
- Heatmap fix: hour-splitting algorithm, detail panel day lookup
- DayDetailPopup: click day header for timeline view
- Tracker Mind: full implementation (Problems tab, setup modal, markdown service)
- Database connection hardening: 5 critical functions use getDb()
- JSON fallback: virtual "logs" table when SQLite fails
- Default period: changed from 'today' to 'week'
- Solar system week sync with heatmap
- 12-hour format heatmap labels
- TDZ fix: useMemoâ†’useState+useEffect for complex objects

