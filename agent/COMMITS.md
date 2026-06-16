# Commit Changelog

## Latest Commit

### Commit Message
```
feat(ai): complete AI agent system with real LLM tool calling
```

### Detailed Changes

#### New AI Agent System (src/services/ai/)
- **types.ts** — Core types: ToolDefinition, ToolCall, AgentMessage, SecurityLevel (read/confirm/admin/blocked), AiAgentConfig, AuditEntry, AgentContext
- **securityGuard.ts** — 4-tier permission matrix (read/confirm/admin/blocked) with rate limiting (60/min, 500/session), audit logging, input validation (string length, number range, array length, object size)
- **toolRegistry.ts** — ~40 tools wrapping ALL IPC methods: goals (getGoals, getGoalsBatch, getLongtermGoals, saveGoal, deleteGoal, saveGoalReview, getGoalContext), projects (getProjects, getAllProjects, getProjectDetails, addProject, updateProject, deleteProject, restoreProject, openProject, calculateProjectHealth, getCommitStats), external activities (getExternalActivities, addExternalActivity, updateExternalActivity, deleteExternalActivity, startExternalSession, stopExternalSession, getExternalSessions, getExternalStats, addExternalTime, getActiveExternalSession), sleep (getSleepForDate, addManualSleep, updateManualSleep, getSleepTrends), preferences (getPreferences, setPreference, getExternalSettings, setExternalSettings), categories (getCategoryConfig, getTierAssignments, setAppCategory, setDomainCategory, setAppTier, setDomainTier, setTierAssignments), IDE/terminal (getIDEProjectsOverview, getTerminalSessions), problems (getProblems, updateProblemStatus, deleteProblem), recording (getRecordingModes, setRecordingMode), browser stats (getBrowserCategoryStats), AI context (getAiContext)
- **aiAgentService.ts** — Full agent loop: LLM → tool calls → execute via toolRegistry → results back to LLM → final response; confirmation flow for confirm/admin tools; conversation history with tool call/result tracking; localStorage persistence per day; debug logging
- **index.ts** — Barrel export

#### AI Chat UI Rewrite (src/components/AiChat/)
- **AiChat.tsx** — Complete rewrite: connects to aiAgentService, real LLM tool calling via providers, confirmation prompts for destructive actions, debug logging, greeting without quick-action suggestions, reset button
- **ChatHeader.tsx** — Added toolsUsed display and onReset callback
- **BlockRenderer.tsx** — Added empty-block fallback
- **ChatInput.tsx** — Uses existing sanitizeInput, MAX_INPUT_LENGTH from chatSafety
- **All block components** — GoalListBlock, GoalCreateBlock, GoalDeleteBlock, NewsItemBlock, DataSummaryBlock, ErrorBlock, NavigationBlock, TextBlock (unchanged, existing)

#### Integration
- **src/App.tsx** — Added getAiProviders to deskflowAPI type definition
- **src/preload.ts** — Already had getAiProviders (ipcRenderer.invoke('get-ai-providers'))

#### Architecture
- No main process IPC changes needed — renderer calls providers directly via fetch using API keys from getAiProviders()
- Uses existing multi-provider system (OpenRouter, CloudFlayer, Olamah, Invilier, Custom)
- Tools cover full CRUD on goals, projects, external activities, sleep, categories, preferences, problems, recording modes, browser stats, IDE/terminal sessions

#### Why
Replaces 100% rule-based AiChat (parseIntent + checkAction) with real LLM agent that can perform ANY action a human can via tools, with strong security (4-tier permissions, confirmations, rate limits, audit log) and efficiency (direct provider calls, smart context).

### Build
✅ npm run build passes (renderer + electron)

## Previous Commit

### Commit Message
```
fix: Compose panel sends full prompts via agentSend with pendingWrites flush
```

### Detailed Changes

#### main.ts
- **pendingWrites flush** — When agent transitions `launching` → `ready` in both `terminal:create` and `spawn-terminal` data handlers, queued prompts (`st.pendingWrites`) are now flushed to the PTY
- **agent:send DB recording** — Added `terminal_messages` DB insertion + `ai-task:updated` broadcast (≥20 char prompts) so compose prompts are tracked like `terminal:write-old-format` did

#### TerminalPage.tsx
- **handleInstructionPanelSend** — Changed from `terminalWrite` to `agentSend(resolvedTargetId, prompt, agentType)`, which correctly queues prompts during `launching` and sets phase to `busy` on send

#### agent/state.md
- Updated to v4.23 with compose panel fix entries

#### Other files
- Bulk of pre-existing uncommitted changes from prior sessions (tracking system overhaul, dashboard features, IDE page, AI systems, terminal features, component library additions, skill definitions, session configs, vault graph updates)

### Previous Commit

### Commit Message
```
feat: Dashboard redesign - stats cards, pinned activities, activity feed
```

### Detailed Changes

#### DashboardPage.tsx
- Add stats cards row: Productive Time, Total Time, % Productive, Longest Focus, Resets Today, External Time
- Stats use selectedPeriod from navigation (today/week/month/all) - scope changes based on timeline
- Longest Focus calculates longest uninterrupted productive session per timeline scope
- Pinned Activities section with edit mode (add/remove activities, max 6)
- Pinned activities persist to localStorage ('dashboard-pinned-activities')
- Activity Feed at bottom showing recent activity changes only (not periodic)
- Activity Feed shows: time, app/website name, category, productive status icon
- Remove reset/pause notifications from timer (logs already show this)
- Add new icons: Edit3, Check, Plus, Minus, TrendingUp, Target, ZapCircle, RefreshCw, Clock3

#### App.tsx
- Pass selectedPeriod prop from App.tsx to DashboardPage

#### New Interfaces
- ActivityFeedItem: id, timestamp, type (app/browser), name, category, tier
- TimerBehavior: neutralAction, distractingAction

#### New State Variables
- pinnedActivitiesEditMode: boolean
- pinnedActivities: ExternalActivity[]
- activityFeed: ActivityFeedItem[]
- resetCount: number

#### LocalStorage
- 'dashboard-pinned-activities': JSON array of pinned activities

### Detailed Changes (ALL PHASES COMPLETE)

#### Phase 1-2: Core Infrastructure & Sleep Tracking (COMPLETE)

**Database Schema:**
- `external_activities` table - Stores activity definitions (name, type, color, icon, default_duration, is_default, is_visible, sort_order)
- `external_sessions` table - Stores completed sessions (activity_id, started_at, ended_at, duration_seconds, notes)
- 8 default activities seeded on first run

**IPC Handlers:**
- `get-external-activities` - Fetch all activities
- `add-external-activity` - Create new activity
- `update-external-activity` - Update activity
- `delete-external-activity` - Delete custom activity
- `start-external-session` - Start tracking session
- `stop-external-session` - Stop session with duration
- `get-external-sessions` - Fetch sessions by period
- `get-external-stats` - Get statistics by period
- `get-sleep-trends` - Get sleep pattern data
- `get-consistency-score` - Calculate consistency metrics

**External Page:**
- Activity grid with 8 default activities
- Stopwatch mode for timed activities
- Sleep mode with wake-up time picker (allows selecting past time)
- Check-in mode for quick activities
- Real-time timer display

#### Phase 3: Statistics & Charts (COMPLETE)

**Charts:**
- Activity breakdown horizontal bar chart (by activity)
- Weekly comparison line chart (multi-week)
- "Charts" toggle button to show/hide
- Chart.js integration

**Consistency Score:**
- 0-100 score based on variance from target
- Trend indicator (↑↓-)
- Color-coded display (green/amber/red)

#### Phase 4: Custom Activities (COMPLETE)

**Custom Activity Modal:**
- Name input field
- Type selector (Stopwatch/Sleep/Check-in)
- Icon picker (10 icons)
- Color picker (15 colors)
- Default duration dropdown (for check-in)
- Save to database

#### Phase 5: Polish (COMPLETE)

- Framer Motion animations (fade, scale transitions)
- Smooth button hover effects
- Modal animations

**Files:**
| File | Changes |
|------|--------|
| `src/main.ts` | +328 lines - DB tables + IPC handlers |
| `src/preload.ts` | +19 lines - External API bindings |
| `src/App.tsx` | +6 lines - ExternalPage import + route + sidebar |
| `src/pages/ExternalPage.tsx` | +492 lines - Full component |
| `agent/state.md` | Updated |

---

### Previous Commit

### Commit Message
```
feat: External Tracker - non-laptop activity tracking with sleep deficit and consistency metrics
```

### Detailed Changes

#### **New Features**

##### 1. External Tracker Page
- **New "External" page** in sidebar for tracking non-laptop activities
- **Activity button grid** displaying all available activities
- **Stopwatch mode** for timed activities (Studying, Exercise, Gym, Commute, Reading)
- **Sleep mode** with bedtime tracking and wake-up time picker
- **Check-in mode** for quick activities (Eating, Short Break)

##### 2. Default External Activities
- **Pre-loaded activities:**
  - Studying (Paper) - Stopwatch mode
  - Exercise - Stopwatch mode
  - Gym - Stopwatch mode
  - Commute - Stopwatch mode
  - Reading - Stopwatch mode
  - Sleep - Sleep mode (bedtime/wake-up)
  - Eating - Check-in mode (30 min default)
  - Short Break - Check-in mode (15 min default)

##### 3. Sleep Tracking System
- **Sleep session tracking** with bedtime and wake-up timestamps
- **Wake-up time picker** allowing past time selection
- **Sleep deficit calculation** (8 hours - actual sleep)
- **Color-coded deficit display:**
  - Green (+): On target or surplus
  - Red (-): Sleep deficit
- **Average bedtime and wake time** statistics

##### 4. Statistics & Charts
- **Stats cards** showing today/week/month totals
- **Sleep deficit card** with color coding
- **Consistency chart** with multi-week line comparison
- **Activity breakdown** horizontal bar chart
- **Consistency score** (0-100 based on variance from target)

##### 5. Custom Activities
- **Add custom activity** modal form
- **Edit/delete custom activities** functionality
- **Configurable options:**
  - Name and color
  - Timer mode (stopwatch/sleep/check-in)
  - Default duration (for check-in)
  - Icon selection

#### **Backend Changes (Electron Main Process)**

##### New Database Tables
- **external_activities**: Stores activity definitions
  ```sql
  CREATE TABLE external_activities (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    default_duration INTEGER,
    is_default INTEGER DEFAULT 0,
    is_visible INTEGER DEFAULT 1,
    created_at TEXT
  );
  ```

- **external_sessions**: Stores completed sessions
  ```sql
  CREATE TABLE external_sessions (
    id INTEGER PRIMARY KEY,
    activity_id INTEGER,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER,
    notes TEXT,
    FOREIGN KEY (activity_id) REFERENCES external_activities(id)
  );
  ```

##### New IPC Handlers
- `get-external-activities` - Fetch all activities
- `add-external-activity` - Create new activity
- `update-external-activity` - Update activity
- `delete-external-activity` - Delete activity
- `start-external-session` - Start tracking session
- `stop-external-session` - Stop session with duration
- `get-external-sessions` - Fetch sessions by period
- `get-external-stats` - Get statistics by period
- `get-sleep-trends` - Get sleep pattern data
- `get-consistency-score` - Calculate consistency metrics

#### **Component Structure**

| Component | Purpose |
|-----------|--------|
| `ExternalPage.tsx` | Main external tracking page |
| `ExternalButton.tsx` | Activity button card |
| `ExternalActiveTimer.tsx` | Active stopwatch display |
| `SleepSessionModal.tsx` | Wake-up time picker |
| `AddActivityModal.tsx` | Custom activity form |
| `StatsCards.tsx` | Dashboard stats cards |
| `ConsistencyChart.tsx` | Multi-week line chart |
| `SleepTrendChart.tsx` | Sleep trend line chart |
| `ActivityBreakdown.tsx` | Horizontal bar chart |
| `useExternalTimer.ts` | Timer logic hook |

#### **Documentation**

| File | Purpose |
|------|--------|
| `docs/EXTERNAL_TRACKER_PLAN.md` | Full implementation plan |
| `agent/_COMMITS.md` | Updated with commit details |

#### **Implementation Phases**

1. **Phase 1: Core Infrastructure** (HIGH priority)
   - Database schema creation
   - Backend IPC implementation
   - Basic External page with activity grid

2. **Phase 2: Sleep Tracking** (HIGH priority)
   - Sleep mode implementation
   - Wake-up time picker
   - Sleep statistics

3. **Phase 3: Statistics & Charts** (MEDIUM priority)
   - Consistency chart
   - Activity breakdown chart

4. **Phase 4: Customization** (MEDIUM priority)
   - Add/edit/delete activities
   - Activity configuration

5. **Phase 5: Polish** (LOW priority)
   - Animations and transitions
   - Heatmap integration (deferred)
   - Floating widget (optional)

---

### Commit Statistics
- **Files Created:** 9 new components
- **Files Modified:** 5 existing files
- **Database Tables:** 2 new tables
- **IPC Endpoints:** 10 new handlers

### Related Issues
- Implements non-laptop activity tracking feature
- Adds sleep deficit monitoring
- Provides consistency metrics for external activities

---

### Previous Commit

### Commit Message
```
feat: AI-powered categorization, terminal system, IDE enhancements, and UI improvements
```

### Detailed Changes

#### **New Features**

##### 1. AI-Powered Auto-Categorization System
- **Magic Category** button in Settings page (Apps & Websites tabs)
  - Bulk categorize all apps/websites using OpenRouter AI
  - Individual sparkle button per app/website for single-item categorization
  - Requires OpenRouter API Key configuration
  - Loading state shows "Generating..." during AI processing
  - Integrated with `window.deskflowAPI.generateAICategorization()`

- **Magic Color** button in Colors tab
  - Bulk generate AI-powered planet colors for all apps/websites
  - Individual sparkle button per item for single color generation
  - Integrated with `window.deskflowAPI.generateAIColors()`
  - Requires OpenRouter API Key configuration

- **OpenRouter API Key Configuration**
  - New settings field in Settings → General tab
  - Password input with placeholder `sk-or-v1-...`
  - Required for all AI features (Magic Color & Magic Category)

##### 2. Terminal System (Complete Implementation)
- **Terminal Window Management**
  - `createTerminalWindow()` - Create new terminal window
  - `spawnTerminal()` - Spawn terminal with optional working directory
  - `writeTerminal()` - Send input to terminal
  - `resizeTerminal()` - Handle terminal resize events
  - `killTerminal()` - Terminate terminal session

- **Terminal Presets**
  - `getTerminalPresets()` - Fetch presets (project-scoped or global)
  - `addTerminalPreset()` - Create new preset with command, working directory, category
  - `removeTerminalPreset()` - Delete preset
  - `executeTerminalPreset()` - Run preset in existing or new terminal

- **Terminal Layouts**
  - `saveTerminalLayout()` - Save multi-terminal layout configurations
  - `getTerminalLayouts()` - Fetch saved layouts
  - `deleteTerminalLayout()` - Remove layout
  - `setActiveTerminalLayout()` - Activate layout

- **Terminal Sessions (Resume Feature)**
  - `saveTerminalSession()` - Save session with resume ID, topic, token/cost tracking
  - `getTerminalSessions()` - Fetch session history (project-scoped, with limit)
  - `getTerminalSessionResumeId()` - Retrieve resume ID for session continuation

- **IPC Event Listeners**
  - `onTerminalData` - Listen for terminal output streaming
  - `onTerminalExit` - Handle terminal process exit with exit code and signal

##### 3. IDE Projects Page Enhancements
- **AI Agent Debug Panel**
  - Shows per-agent detection status, paths, and sample files
  - "Show Details" toggle button for visibility
  - Displays sync result with per-agent record counts
  - Enhanced "Not detected" message showing scanned path

- **Project Health Metrics**
  - `calculateProjectHealth()` - Compute project health score
  - Integrated with IDE projects dashboard

##### 4. UI/UX Improvements

**Settings Page:**
- **Apps/Websites Toggle** in Colors tab
  - Tab switcher to toggle between app colors and website colors
  - Separate search filters for each type
  - Responsive grid layout (2/3/4 columns based on screen size)

- **Show More/Less Buttons**
  - Expandable carousels in Apps and Websites sections
  - Shows 5 items initially, expands to 15 items
  - Chevron up/down icons with smooth transitions

- **Discord-Style Save Bar**
  - Fixed bottom bar appears when changes detected
  - Animated slide-in/out with spring physics
  - "Reset" button to discard all changes
  - "Save Changes" button with checkmark icon
  - Amber pulse indicator showing unsaved state

**Browser Activity Page:**
- **Pie Chart Text Color Fix**
  - Legend text color set to `#d4d4d8` (light gray)
  - Tooltip body and title colors set to `#d4d4d8`
  - Ensures visibility on dark background

**Productivity Page:**
- Updated to use new AI categorization system
- Integrated with Magic Category features

#### **Backend Changes (Electron Main Process)**

##### New IPC Handlers
- `generate-ai-colors` - AI-powered color generation for apps/websites
- `generate-ai-categorization` - AI-powered category assignment
- `create-terminal-window` - Terminal window creation
- `spawn-terminal` - Terminal process spawning
- `write-terminal` - Terminal input handling
- `resize-terminal` - Terminal resize handling
- `kill-terminal` - Terminal process termination
- `get-terminal-presets` - Fetch terminal presets
- `add-terminal-preset` - Create terminal preset
- `remove-terminal-preset` - Delete terminal preset
- `execute-terminal-preset` - Execute preset command
- `save-terminal-layout` - Save terminal layout
- `get-terminal-layouts` - Fetch terminal layouts
- `delete-terminal-layout` - Delete terminal layout
- `set-active-terminal-layout` - Activate layout
- `save-terminal-session` - Save terminal session
- `get-terminal-sessions` - Fetch terminal sessions
- `get-terminal-session-resume-id` - Get resume ID
- `calculate-project-health` - Calculate project health metrics

##### New IPC Event Listeners
- `browser-tracking-event` - Live browser tracking events
- `terminal-data` - Terminal output streaming
- `terminal-exit` - Terminal process exit events

#### **Schema & Data Structure Changes**

**Terminal Preset Schema:**
```typescript
{
  id: string;
  projectId?: string;
  name: string;
  command: string;
  workingDirectory?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Terminal Layout Schema:**
```typescript
{
  id: string;
  projectId?: string;
  name: string;
  layoutData: string; // JSON string of terminal positions/sizes
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Terminal Session Schema:**
```typescript
{
  id: string;
  projectId?: string;
  agent: string;
  resumeId?: string;
  topic?: string;
  workingDirectory?: string;
  totalTokens?: number;
  totalCost?: number;
  createdAt: string;
  completedAt?: string;
}
```

#### **Files Modified**

| File | Changes | Description |
|------|---------|-------------|
| `src/App.tsx` | +194 lines | Added AI categorization UI, save bar, tier assignments |
| `src/preload.ts` | +45 lines | Exposed terminal, AI, and project health APIs |
| `src/main.ts` | +520 lines | Implemented terminal system, AI handlers, project health |
| `src/components/OrbitSystem.tsx` | +673 lines | Galaxy camera fixes, visualization debugging |
| `src/pages/SettingsPage.tsx` | +836 lines | AI features, save bar, expandable grids, toggle tabs |
| `src/pages/BrowserActivityPage.tsx` | +212 lines | Pie chart text color fix, responsive layouts |
| `src/pages/IDEProjectsPage.tsx` | +1715 lines | AI agent debug panel, project health integration |
| `src/pages/ProductivityPage.tsx` | +209 lines | AI categorization integration |
| `src/pages/DatabasePage.tsx` | +20 lines | Minor fixes |
| `browser-extension/background.js` | +6 lines | Browser tracking event emission |
| `package.json` | +12 lines | New dependencies for terminal and AI features |
| `package-lock.json` | +87 lines | Dependency lock updates |

#### **Documentation Updates**

| File | Changes |
|------|---------|
| `AGENTS.md` | Updated with graphify skill instructions, critical rules, file maintenance guidelines |
| `agent/state.md` | Version tracking, IPC endpoints, recent changes log |
| `agent/PROBLEMS.md` | Issue tracker with 305 lines of known issues and patterns |
| `agent/debugging.md` | New error patterns and solutions |
| `agent/agents.md` | Agent configuration updates |
| `graphify-out/GRAPH_REPORT.md` | Updated architecture graph with new nodes |
| `graphify-out/graph.json` | Knowledge graph with 1312 lines of node relationships |
| `graphify-out/analysis.json` | Community structure analysis |

#### **Deleted Files**
- `agent/skills/agent-reflect/README.md` (51 lines)
- `agent/skills/agent-reflect/research-prompt.md` (102 lines)
- `agent/skills/agent-reflect/result.md` (731 lines)

#### **Dependencies**
- Added terminal-related packages
- Added AI integration packages (OpenRouter SDK)
- Updated chart.js and react-chartjs-2 for visualization fixes

---

### Commit Statistics
- **Files Changed:** 25
- **Insertions:** +5,332 lines
- **Deletions:** -2,586 lines
- **Net Change:** +2,746 lines

### Related Issues
- Fixes pie chart text visibility on dark theme
- Implements terminal system with presets, layouts, and session resume
- Adds AI-powered auto-categorization for apps and websites
- Enhances IDE projects page with agent debugging and health metrics

---

*Generated: 2026-04-21*
