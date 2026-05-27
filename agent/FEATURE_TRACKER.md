# 📋 Feature Tracker

**Purpose:** Complete inventory of every page and feature in DeskFlow app.

**Last Updated:** 2026-05-06
**Maintainer:** AI Development Team

---

## 📌 Page Index

| Route | Page Component | Description |
|-------|----------------|-------------|
| `/` | `DashboardPage` | Main dashboard with 3D orbit visualization |
| `/stats` | `StatsPage` | Statistics and analytics view |
| `/productivity` | `ProductivityPage` | Productivity tracking and insights |
| `/browser` | `BrowserActivityPage` | Browser usage tracking |
| `/ide` | `IDEProjectsPage` | IDE projects management + workspace |
| `/terminal` | `TerminalPage` | Terminal interface with workspace tools |
| `/external` | `ExternalPage` | External activity tracking (AI tools, etc.) |
| `/reports` | `InsightsPage` | Reports and insights |
| `/database` | `DatabasePage` | Database viewer and query interface |
| `/settings` | `SettingsPage` | App settings and configuration |
| `/ide-help` | `IDEHelpPage` | IDE setup help documentation |
| `/pricing` | (Placeholder) | Pricing plans (not yet implemented) |

---

## 🌌 1. Dashboard Page (`/`)

**Component:** `src/pages/DashboardPage.tsx` (~2400 lines)

### Core Features:

#### 1.1 3D Orbit System
- **Feature:** Interactive 3D solar system visualization
- **Technology:** React Three Fiber, Three.js
- **Details:**
  - Planets represent apps with size = usage time
  - Orbits based on usage (most used = furthest)
  - Procedural textures generated via Canvas API
  - Category-based color schemes and patterns
  - Click planets to see app details
  - Hover for tooltips with usage stats

#### 1.2 Category System
- **Productive:** IDE, AI Tools, Developer Tools, Education, Productivity, Tools
- **Neutral:** Browser, Communication, Design, News, Uncategorized, Other
- **Distracting:** Entertainment, Social Media, Shopping
- **Custom overrides:** User can reassign categories in Settings

#### 1.3 Heatmap
- **Feature:** Hourly activity heatmap (7 days × 24 hours)
- **Modes:**
  - `external` - External activity only (AI tools, websites)
  - `device` - Device activity only (local apps)
  - `combined` - Both with color blending
- **Interactions:**
  - **Hover:** Tooltip shows device + external time per hour
  - **Click hour:** Detail panel below heatmap (device time, external breakdown)
  - **Click day label:** Navigate to day detail page (`/day/:date`)
- **Color coding:**
  - External-only: Purple scheme
  - Device-only: Red-green productivity colors
  - Combined: Max duration with blended colors

#### 1.4 Weekly Overview
- **Feature:** Bar chart showing 7-day activity summary
- **Details:**
  - Rounded bar corners
  - Total hours displayed below chart
  - Device breakdown bar (colored segments per app)
  - Respects period selector

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

---

## 📊 2. Stats Page (`/stats`)

**Component:** `src/pages/StatsPage.tsx`

### Core Features:

#### 2.1 App Statistics Table
- **Feature:** Detailed table of all tracked apps
- **Columns:** App name, Category, Total time, Sessions, Avg duration
- **Sorting:** Click column headers to sort
- **Filtering:** Search by app name

#### 2.2 Time Distribution Charts
- **Pie Chart:** Category distribution (productive/neutral/distracting)
- **Bar Chart:** Top apps by usage time
- **Line Chart:** Usage over time

#### 2.3 Category Breakdown
- **Feature:** Per-category stats and charts
- **Details:** Time per category, apps in category, percentage of total

#### 2.4 Export Functionality
- **Export to CSV:** Download stats as spreadsheet
- **Export to JSON:** Download raw data

#### 2.5 Period Selector
- Same as Dashboard (Today/Week/Month/All)

#### 2.6 Time Mode Toggle
- Hours/Seconds display

---

## 🎯 3. Productivity Page (`/productivity`)

**Component:** `src/pages/ProductivityPage.tsx`

### Core Features:

#### 3.1 Productivity Score
- **Feature:** Overall productivity percentage
- **Calculation:** (Productive time / Total time) × 100
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

---

## 🌐 4. Browser Activity Page (`/browser`)

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

---

## 💻 5. IDE Projects Page (`/ide`)

**Component:** `src/pages/IDEProjectsPage.tsx` (~3271 lines)

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
- **IPC:** `open-project` → launches IDE with project path

#### 5.5 Workspace Launch
- **Feature:** Open integrated terminal workspace for project
- **Navigates to:** `/terminal` with `projectId` + `projectPath` props
- ** Opens:** `TerminalPage` component with full workspace UI

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

---

## 🖥️ 6. Terminal Page / Workspace (`/terminal`)

**Component:** `src/pages/TerminalPage.tsx` (~3966 lines)
**Terminal Component:** `src/components/TerminalWindow.tsx` (607 lines)
**Hook:** `src/hooks/useTerminalLayout.ts`

### Core Features:

#### 6.1 Multi-Pane Terminal
- **Technology:** `@xterm/xterm` terminal emulator with node-pty backend
- **Multi-pane support:** Split panes horizontally/vertically via binary tree layout
- **Layout Groups:** Terminals organized into groups based on their split parent in the tree
- **Active terminal tracking:** Tracks which pane is active via `activeTerminalId` state
- **Terminal spawn:** `terminal:create` IPC with CWD = project path
- **Resize handling:** `terminal:resize` IPC for dimension changes
- **Agent integration:** Supports OpenCode, Claude Code, Codex, Aider, Cursor agents

#### 6.2 Sidebar Tabs (12 tabs + 1 divider):

**Tab Group 1 — Management (Tools):**

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
- **Detail view:** Click a session → full detail panel with:
  - Session metadata grid (status, category, date, terminal, cost, tokens, resume_id, description, product_area)
  - Focus Terminal / Open in Terminal buttons
  - Message viewer with Refresh capability
  - Messages displayed with role coloring (assistant=cyan, user=blue, system=zinc)
- **Message viewer:** Modal popup with search and role-colored messages
- **Actions:** Focus terminal, Open in terminal (resume), View messages, Delete

##### 6.2.3 Map Tab
- **Icon:** `Monitor` (green accent)
- **Feature:** Terminal layout visualization + group-managed terminal list
- **Components:** `TerminalMiniMap` — draggable pane layout visualization
- **Mini Map:** Shows all terminal panes as draggable rectangles, click to focus, drag to rearrange via PaneNode tree
- **Running Terminals (grouped):** Below the map, terminals organized by layout groups showing:
  - Group number, split direction (↕ Stack / ↔ Side-by-side), terminal count
  - Each terminal: name, agent, active indicator, linked session info (topic, category, status)
  - Focus button, New Session button for unassigned terminals
- **Sessions list:** Below terminals, shows all sessions with running/closed status

##### 6.2.4 Analytics Tab
- **Icon:** `PieChart` (green accent)
- **Feature:** AI usage analytics with period selection
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
- **Grouped display:** Problems grouped by status with color-coded headers
- **Inline edit:** Click to expand, edit fields, change status
- **Operations:** Create, update status, assign to terminal, delete
- **Auto-refresh:** Polls every 5 seconds

##### 6.2.6 Requests Tab
- **Icon:** `FileText` (blue accent)
- **Component:** `RequestsTab` (inline component)
- **Feature:** Track project requests and feature requests
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

**Tab Group 2 — Utilities:**

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
- **Search:** Filter skills by name/description/content
- **Category filter:** Filter pills by skill category
- **Skill cards:** Show name, category badge, description
- **Expandable:** Click to show full markdown content with path info
- **Use Skill modal:** View skill content, select target terminal, enter prompt, send to terminal
- **Edit Skill modal:** Edit name, category, description, content (markdown editor)
- **Create Skill modal:** New skill form with name, category, description, content
- **Delete:** Remove skill from filesystem
- **Auto-refresh:** Polls every 10 seconds
- **Notification toast:** Success/error feedback on operations

##### 6.2.10 Configs Tab
- **Icon:** `Settings` (orange accent)
- **Feature:** Manage project-specific configurations
- **Status:** Placeholder (future implementation)
- **Planned:**
  - View active configs per project
  - Edit config values inline
  - Save/load config presets

##### 6.2.11 History Tab
- **Icon:** `Clock` (rose accent)
- **Feature:** Activity history and audit log
- **Status:** Placeholder (future implementation)
- **Planned:**
  - Session activity history
  - Command execution log
  - Changes timeline per session

**Visual Divider (vertical line, zinc-700/50)**

##### 6.2.12 Context Maintenance Tab ⭐
- **Icon:** `Database` (violet accent)
- **Feature:** Persistent AI memory management across sessions (wiring in progress)
- **Component:** `src/components/ContextMaintenanceTab.tsx` (382 lines, available for rendering)
- **Status:** Placeholder until service wiring complete
- **Planned:**
  - Memory status card (token usage visualization)
  - Active contexts list (skill, graphify, wiki, QMD contexts with toggles)
  - Recent chat history with message management
  - Compactions panel (monthly summary management)
  - Context search (semantic + full-text)
  - Settings panel (auto-compaction, RAG mode, token budget)

#### 6.3 Layout & Group System
- **Binary tree layout:** `PaneNode` type supports `leaf` (terminal) and `split` (horizontal/vertical division) nodes
- **Group extraction:** `extractGroups()` helper collects terminals into top-level split groups
- **Layout persistence:** Save/load via `saveTerminalLayout`/`getTerminalLayouts` IPC
- **Drag-drop:** Pane rearrangement via `TerminalLayout` component

#### 6.4 AI Agent Integration
- **Supported Agents:**
  - OpenCode (`opencode`)
  - Claude Code (`claude`)
  - Codex (`codex`)
  - Aider (`aider`)
  - Cursor (`cursor`)
- **Agent Selector:** Dropdown in session creation, persists in localStorage
- **Session Management:**
  - New Session dialog with configurable agent, terminal mode (create/select), init content
  - Resume sessions via `resume_id` 
  - Session categorization (category, product_area, description, auto_tags)
  - Category analysis via `analyzeSessionCategory` IPC
- **Init content:** Auto-load INITIALIZE.md, custom init files, problem/request context

#### 6.5 Instruction Panel
- **Feature:** Send instructions to a terminal
- **Access:** Via instruction input field in the tab bar area
- **Send:** Writes instruction text to active terminal via IPC
- **Binding:** Can bind instructions to specific problems/requests

#### 6.6 Session Categorization
- **Feature:** Auto-categorize and manually categorize sessions
- **Categories:** feature, bug-fix, research, code-review, refactor, devops, docs, other
- **Fields:** category, product_area, description, status, auto_tags, category_confirmed
- **IPC:** `updateSessionCategory`, `getParsedSessionItems`, `analyzeSessionCategory`
- **Display:** CategoryBadge and StatusDot components throughout all terminal views
- **Statuses:** active, idle, completed, error, cancelled

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
- **Save:** `workspace:save` IPC → saves layout + active terminal ID + todos + presets
- **Load:** `workspace:load` IPC → restores layout for session/project/global scope
- **Scope:** Per-session, per-project, or global (no project_id = global)

#### 6.10 Compose & Prompt Systems
- **Short compose:** Quick prompt input for active terminal
- **Long compose:** Full prompt editor with skills dropdown
- **Skills dropdown:** Attach skill context to composed prompts
- **Progress tracking:** AI task progress via `aiTask:watch` and `onAiTaskUpdated`
- **Prompt templates:** Save/load reusable prompt templates
- **@mention routing:** Resolve @mentions to terminal names and session topics

#### 6.11 Terminal Management
- **New Terminal:** Spawn new terminal pane via IPC
- **Close Terminal:** Destroy terminal process via `terminal:destroy`
- **Split Pane:** Horizontal/vertical split of current pane
- **Resize:** Drag pane dividers to resize
- **Project Switcher:** ← → arrows in header
- **Sidebar toggle:** Collapse/expand sidebar
- **Confirm dialogs:** Modal dialogs for destructive actions (delete session, etc.)
- **Error display:** Toast notifications for terminal errors/warnings/info

---

## 🎮 7. External Page (`/external`)

**Component:** `src/pages/ExternalPage.tsx`

### Core Features:

#### 7.1 External Activity Tracking
- **Feature:** Track AI tools, websites, and external activities
- **Data Source:** `get-external-activities`, `get-external-sessions` IPC
- **Shows:** Activity name, duration, category, sessions count

#### 7.2 Activity Stats
- **Total external time**
- **Most used external tool**
- **Top activities chart**

#### 7.3 Consistency Score
- **Feature:** Measures consistency of external tool usage
- **Calculation:** Based on daily usage patterns
- **Display:** Score with emoji indicator

#### 7.4 Sleep Tracking
- **Feature:** Manual sleep session tracking
- **Add Sleep:** `add-manual-sleep` IPC
- **Wake Up:** `confirm-wake-up` IPC
- **Sleep Trends Chart:** Line chart showing sleep duration over time
- **Respects period:** Shows 1/7/30/90 days based on period selector

#### 7.5 Activity Detail Panel
- **Feature:** Click activity to see detailed stats
- **Shows:** Total time, sessions, daily breakdown chart
- **Drill-down:** View individual sessions

#### 7.6 Activity Charts
- **Bar Chart:** Daily activity duration
- **Line Chart:** Activity over time
- **Pie Chart:** Time distribution by activity

#### 7.7 Period Selector
- **Feature:** Uses top nav period selector (passed via props)
- **Options:** Today, Week, Month, All
- **Affects:** All charts and stats
- **Note:** Removed duplicate period selector from page (2026-05-05)

#### 7.8 Activity Filter
- **Feature:** Quick filter dropdown to view specific activity
- **Note:** Removed activity filter dropdown (2026-05-05) per user request

#### 7.9 Start/Stop Tracking
- **Start:** `start-external-activity` IPC
- **Stop:** `stop-external-activity` IPC
- **Manual entry:** Add manual session

---

## 📈 8. Insights / Reports Page (`/reports`)

**Component:** `src/pages/InsightsPage.tsx`

### Core Features:

#### 8.1 Insights Dashboard
- **Feature:** AI-generated insights from usage data
- **Shows:** Patterns, anomalies, recommendations

#### 8.2 Trends Analysis
- **Feature:** Long-term trends in app usage
- **Charts:** Line charts, moving averages

#### 8.3 Productivity Insights
- **Feature:** Identify productivity patterns
- **Shows:** Peak hours, most productive days

#### 8.4 Comparison Reports
- **Feature:** Compare periods (this week vs last week)
- **Charts:** Side-by-side bar charts

#### 8.5 Export Reports
- **Feature:** Export insights as PDF or markdown
- **Scheduled reports:** (planned)

---

## 🗄️ 9. Database Page (`/database`)

**Component:** `src/pages/DatabasePage.tsx`

### Core Features:

#### 9.1 Database Viewer
- **Feature:** Browse SQLite database tables
- **Shows:** Table list, row count, schema

#### 9.2 Table Data Browser
- **Feature:** View table contents with pagination
- **Shows:** All columns and rows
- **Sorting:** Click column headers
- **Search:** Filter rows

#### 9.3 Schema Viewer
- **Feature:** View table schema (columns, types, constraints)
- **Shows:** Column name, type, nullable, default

#### 9.4 JSON Mode Support
- **Feature:** Shows JSON data when SQLite fails
- **Virtual table:** "logs" table from `deskflow-data.json`
- **Auto-fallback:** Switches to JSON when SQLite unavailable
- **Self-heal:** Attempts to reconnect to SQLite on each API call

#### 9.5 Query Interface (planned)
- **Feature:** Run custom SQL queries
- **Safety:** Read-only queries only

#### 9.6 Database Stats
- **Feature:** Database file size, table count, row counts
- **Shows:** Storage usage, fragmentation

---

## ⚙️ 10. Settings Page (`/settings`)

**Component:** `src/pages/SettingsPage.tsx`
**Reference:** `agent/docs/SETTINGS_PAGE_FEATURES.md` (full details)

### Core Features:

#### 10.1 Category Management
- **Feature:** Reassign app categories
- **UI:** Carousel with search, visual indicators
- **Operations:** Drag-drop, bulk assign, reset to defaults
- **Persistence:** Saved to database, applied across app

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

#### 10.4 Browser Rules
- **Domain Rules:** Auto-categorize websites
- **Keyword Rules:** Classify by URL keywords
- **Add/Edit/Delete rules**

#### 10.5 General Settings
- **Launch on startup**
- **Minimize to tray**
- **Theme selection** (light/dark/system)
- **Language selection**

#### 10.6 Data Management
- **Export data:** JSON, CSV formats
- **Import data:** Restore from backup
- **Reset data:** Clear all tracking data
- **Database location:** View/change DB path

#### 10.7 Save/Reset
- **Save Changes:** Persist all settings to database
- **Reset to Defaults:** Revert all settings
- **Unsaved Changes Warning:** Modal prompts if navigating away

---

## ❓ 11. IDE Help Page (`/ide-help`)

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

## 💰 12. Pricing Page (`/pricing`)

**Status:** Not Yet Implemented (placeholder)

### Planned Features:

#### 12.1 Pricing Tiers
- **Free tier:** Basic tracking
- **Pro tier:** Advanced analytics, AI insights
- **Team tier:** Multi-user, sharing

#### 12.2 Feature Comparison
- **Table:** Compare features across tiers

#### 12.3 Upgrade Flow
- **Payment integration:** Stripe, PayPal, etc.
- **Billing portal**

---

## 🔧 App-Wide Features

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

### A.6 Build & Dev Tools
- **Hot reload:** Vite dev server with HMR
- **Electron rebuild:** `npm run rebuild` for native modules
- **TypeScript checking:** `npm run typecheck`

---

## 📊 Feature Status Summary

| Page | Status | Completion |
|------|--------|------------|
| Dashboard | ✅ Complete | 95% |
| Stats | ✅ Complete | 90% |
| Productivity | ✅ Complete | 85% |
| Browser Activity | ✅ Complete | 90% |
| IDE Projects | ✅ Complete | 95% |
| Terminal/Workspace | ✅ Complete | 90% |
| External | ✅ Complete | 95% |
| Insights/Reports | ⚠️ Partial | 60% |
| Database | ✅ Complete | 85% |
| Settings | ✅ Complete | 95% |
| IDE Help | ✅ Complete | 100% |
| Pricing | ❌ Placeholder | 5% |

---

## 🔄 Recent Feature Additions

### 2026-05-26:
- SkillsTab component: full CRUD for project skills (parse, create, edit, delete, use via terminal)
- Analytics tab: period selector (day/week/month), agent breakdown bars, top sessions by cost
- Sessions tab: click-to-detail panel with full session metadata and inline message viewer
- Map tab: merged group-based terminal display into the MiniMap layout (removed separate Terminals tab)
- Context-maintenance tab button added with visual divider grouping
- Tab bar: 12 tabs organized into 2 groups with divider line; StatusDot updated with size prop
- Note: checklists/configs/history tabs remain as placeholders for future implementation

### 2026-05-06:
- Heatmap external mode fix (field name mismatch)
- Day click bug fix (removed undefined function call)
- Default period changed from 'today' to 'week'
- Database page JSON mode support
- Startup fix (refreshStats error, window show)

### 2026-05-05:
- Workspace TODO system
- Agent file viewer
- Prompt engineering workspace
- Chat session history viewer
- AI agent selector dropdown
- Workspace save/load feature
- Heatmap refactor (removed toggles, always-visible charts)
- Self-heal SQLite connection

### 2026-05-03:
- Terminal multi-pane support
- Presets system
- Sessions chat history
- Project-scoped todos and prompts

---

**End of FEATURE_TRACKER.md**
