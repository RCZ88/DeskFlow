# CONTEXT_BUNDLE: AiPage Data Integration

> Context bundle for designing a unified AI page that connects to ALL available app data sources.
> Generated 2026-06-15 per the generate-prompt skill workflow.

---

## 1. Current AiPage State

### 1.1 Current API Calls (11 total, 4 data sources)

AiPage.tsx makes exactly these IPC calls:

| # | Method | Purpose | Calls per Load |
|---|--------|---------|----------------|
| 1 | `getGoals(date)` | Load today's goals | 1 today + 7 loop for context |
| 2 | `getTopicDigest()` | Load AI digest data | 1 |
| 3 | `readPlanningMd()` | Load planning markdown | 1 |
| 4 | `getGoalContext()` | Get goal context stats | 1 (on suggest) |
| 5 | `getLongtermGoals()` | Load long-term goals | 1 (on suggest) |
| 6 | `suggestGoals(date, ctx)` | Suggest AI goals | 1 (on suggest click) |
| 7 | `saveGoal(date, goal)` | Save/edit a goal | per action |
| 8 | `saveGoalReview(date, msg)` | Save evening review | per action |

**Data sources used:** Only `goals` table (7-day window), `ai_digests`, `planning.md`, `long-term goals`.

### 1.2 Current UI Structure (412 lines)

```
Header: "AI Assistant" title + mode pill (Morning/In-Progress/Review)
├── Section 01 FOCUS: "Today's Priorities"
│   ├── DailyPlanCard (goals list, suggestions, toggle/dismiss)
│   └── ContextSummaryCard (unfinished count, completed this week)
├── Section 02 PLAN: "Goals & Milestones"
│   ├── MyPlanCard (planning markdown editor)
│   └── LongTermPlanCard (long-term goals CRUD)
└── Section 03 REFLECT: "Insights & Patterns"
    ├── TopicDigestCard (AI digests/insights)
    └── GoalHistoryCard (past goals)
```

### 1.3 What the Page Cannot Answer Today

- "How productive was I this week?" — no access to app stats
- "What IDE projects are active?" — no access to projects/workspaces
- "Show my terminal agent usage" — no access to terminal analytics
- "What's my DORA metrics?" — no access to DORA data
- "How much AI did I use yesterday?" — no access to AI usage summary
- "What problems are open?" — no access to Tracker Mind problems
- "What settings do I have?" — no access to app/IDE settings
- "How's my sleep/external activity?" — no access to sleep/activity data
- "Show me code patterns" — no access to patterns/paths
- "Are there backup issues?" — no access to backup/settings

---

## 2. Full Data Ecosystem by Page

### 2.1 DashboardPage — IPC endpoints

| Method | Returns | Purpose |
|--------|---------|---------|
| `getDashboardAggregates({period,dateOffset})` | aggregated app usage stats | Dashboard overview KPIs |
| `getDashboardData({period,dateOffset})` | pre-computed dashboard data | Single-call dash |
| `getDailyStats(period)` | daily breakdown | Stats across days |
| `getLogsByPeriod({period,dateOffset})` | filtered logs | Activity log queries |
| `getStats()` | aggregated stats | General stats |
| `getProductivitySessions({period, dateOffset, minDuration})` | productivity sessions | Streak/productivity tracking |
| `detectUsageGaps({period,minGapMinutes})` | gap detection | Idle time analysis |
| `getDayDetail(date)` | full day breakdown | Day drill-down |
| `getHourDetail(date, hour)` | hourly activity | Hour drill-down |
| `getCurrentForeground()` | current active window | Live tracking status |
| `getExternalSessions(period)` | external activity sessions | External/hobby tracking |
| `getActiveExternalSession()` | currently running external session | Active timer |
| `saveProductivitySession(session)` | — | Save focus session |
| `startExternalSession(activityId)` | session ID | Start external timer |
| `stopExternalSession(sessionId)` | — | Stop external timer |

### 2.2 IDEProjectsPage — IPC endpoints

| Method | Returns | Purpose |
|--------|---------|---------|
| `getProjects()` | project list | All projects |
| `getAllProjects()` | all projects (incl. deleted) | Full project inventory |
| `getIDEProjectsOverview()` | aggregated overview | IDE Dashboard stats |
| `getAIUsageSummary(period)` | AI usage stats | Token/cost/session counts |
| `getProblem(projectId)` | problem tickets | Tracker Mind issues |
| `getRequest(projectId)` | user request tickets | Tracker Mind requests |
| `getTerminalSessions(projectId, limit)` | session history | Terminal session list |
| `getCommitStats(projectId, period)` | commit stats | Git commit metrics |
| `getDORAMetrics(projectId, period)` | DORA metrics | Deployment frequency, lead time, MTTR, change failure rate |
| `getCommitHistory(projectId, limit)` | commit list | Recent commits |
| `getContributorStats(projectId)` | contributor stats | Per-contributor breakdown |
| `getGitDiff(projectId, diffType)` | git diff | Working/cached changes |
| `syncCommits(projectId, repoPath)` | — | Manual commit sync |
| `syncGitHubCommits(projectId, owner, repo, token)` | — | GitHub commit sync |
| `syncAIUsage()` | sync result | AI usage data sync |
| `getAISyncStatus()` | sync status | Last sync info |
| `debugAIAgents()` | agent diagnostics | Debug agent detection |

### 2.3 TerminalPage — IPC endpoints

| Method | Returns | Purpose |
|--------|---------|---------|
| `getTerminalPresets(projectId)` | saved presets | Command presets |
| `getTerminalLayouts(projectId)` | saved layouts | Terminal layout configs |
| `getTerminalBindings()` | terminal-problem bindings | Active bindings |
| `getProblems(projectId)` | problem tickets | Full problem list |
| `getRequests(projectId)` | user requests | Request list |
| `getPromptHistory({projectId, limit})` | prompt history | Past AI prompts |
| `getDailyAggregates()` | daily aggregated data | Day-by-day stats |
| `getSessionMessages(sessionId, agentType)` | session messages | Message history |
| `summarizeSession(sessionId, projectPath)` | session summary | AI-driven summary |
| `getContextSystems(projectPath)` | context system status | Agent context sources |
| `getSessionSummaries({limit, offset})` | session summaries | Cross-session summaries |
| `getDeepMemory()` | deep memory entries | Long-term agent memory |
| `getRAGStats(projectPath)` | RAG system stats | Retrieval stats |
| `getPromptTemplates(projectId)` | saved templates | Prompt template library |
| `readProjectFile(relativePath)` | file content | Read workspace files |
| `listProjectFiles(subDir)` | file listing | Workspace file browser |
| `getWorkspaceTodos(projectId)` | todos | Project todo list |
| `getAutoAssignConfig()` | routing config | Auto-assign settings |
| `getRoutingCosts()` | cost breakdown | Per-provider costs |

### 2.4 SettingsPage — IPC endpoints

| Method | Returns | Purpose |
|--------|---------|---------|
| `getPreferences()` | user preferences | All app preferences |
| `getCategoryConfig()` | category config | App/domain categories |
| `getTierAssignments()` | tier config | Productive/neutral/distracting tiers |
| `getAiConfig()` | AI config | LLM settings |
| `getAiProviders()` | provider state | Multi-provider config |
| `getInterestTopics()` | interest topics | Digest interest topics |
| `getAIAgentCustomPaths()` | custom paths | Agent scan directories |
| `getBrowserTrackingStatus()` | status | Browser tracking on/off |
| `getRecordingModes()` | recording modes | Browser/app recording settings |
| `getTrackingSettings()` | tracking config | All tracking settings |
| `getAutoStartStatus()` | auto-start status | OS auto-start |
| `getExternalSettings(key)` | setting value | External tracker settings |
| `getCrossSessionSyncConfig()` | sync config | Cross-session sync settings |
| `getModelImprovementStats({terminalId})` | improvement stats | Model debug stats |
| `getBaseSystemPrompt(agent)` | system prompt | Per-agent base prompts |

### 2.5 ExternalPage — IPC endpoints

| Method | Returns | Purpose |
|--------|---------|---------|
| `getExternalActivities()` | activity list | Defined external activities |
| `getExternalStats(period)` | activity stats | Time breakdown by activity |
| `getExternalSessions(period)` | session history | External session records |
| `getActivityStats(activityId)` | per-activity stats | Single activity analytics |
| `getSleepTrends(period, dateOffset)` | sleep trend data | Sleep consistency |
| `getSleepForDate(dateStr)` | sleep record | Single day sleep |
| `getSleepDebug(period, dateOffset)` | debug sleep | Sleep detection debug |
| `getConsistencyScore(period)` | consistency metric | Routine consistency |
| `getComparisonStats(period)` | comparison stats | Period-over-period |
| `getMorningPrompt()` | morning prompt data | AI morning prompt |
| `checkSleepDetection()` | sleep status | Sleep detection running? |
| `getTypicalDay(days, dateOffset)` | typical day heatmap | Average day pattern |
| `getHourlyHeatmap(days)` | hourly heatmap | Heatmap data |
| `getBestDays()` | best days ranking | Top productivity days |
| `getTypicalActivityAtTime(timestamp)` | activity guess | What user typically does |

### 2.6 Additional Data Sources

**DesignWorkspacePage / MCP:**
- `mcpListTools(serverId)`, `mcpCallTool(serverId, toolName, args)` — MCP tool access
- `getDesignLibraryConfig()` — Design system config
- `aceternityFetchRegistry()`, `fetchReferoCatalog()` — UI component libraries

**DatabasePage:**
- `getDatabaseTables()`, `getTableSchema(tableName)`, `getTableData(tableName, limit)` — Direct DB access

**Skills:**
- `getSkills(projectPath)`, `getAppSkills()`, `getWorkspaceSkills(projectPath)` — Skill inventory
- `getSavedSkills()` — User-saved skills

**Agent Context:**
- `readAgentFiles(projectPath)` — Agent context files
- `getAiContext({projectId, since, limit})` — AI context summaries
- `getActivityLog({entityType, entityId, limit})` — Activity audit log

---

## 3. IPC Grouping by Functional Area

### Goals & Planning (what AiPage uses)
`getGoals`, `getLongtermGoals`, `getGoalContext`, `suggestGoals`, `saveGoal`, `deleteGoal`, `saveGoalReview`, `readPlanningMd`, `writePlanningMd`, `getTopicDigest`

### App Usage & Activity
`getLogs`, `getLogsByPeriod`, `getStats`, `getDailyStats`, `getDashboardAggregates`, `getDashboardData`, `getAppStats`, `getPageStats`, `getProductivitySessions`, `detectUsageGaps`

### IDE / Projects
`getProjects`, `getAllProjects`, `getIDEProjectsOverview`, `getProjectDetails`, `openProject`, `getProjectTools`, `getCommitStats`, `getCommitHistory`, `getDORAMetrics`, `getContributorStats`, `getGitDiff`

### AI Agent Analytics
`getAIUsageSummary`, `getAISyncStatus`, `debugAIAgents`, `syncAIUsage`, `getModelImprovementStats`, `getPromptStatus`, `getRoutingCosts`

### Terminal Sessions
`getTerminalSessions`, `getTerminalPresets`, `getTerminalLayouts`, `getSessionMessages`, `summarizeSession`, `getPromptHistory`, `getDailyAggregates`

### Tracker Mind (Problems/Requests)
`getProblems`, `getRequests`, `getTerminalBindings`, `getWorkspaceTodos`, `getPromptTemplates`, `getActivityLog`, `getAiContext`

### External Activities & Sleep
`getExternalActivities`, `getExternalSessions`, `getExternalStats`, `getActivityStats`, `getSleepTrends`, `getSleepForDate`, `getConsistencyScore`, `getComparisonStats`, `getTypicalDay`, `getHourlyHeatmap`, `getBestDays`

### Skills
`getSkills`, `getAppSkills`, `getWorkspaceSkills`, `getSavedSkills`

### Settings & Configuration
`getPreferences`, `getAiConfig`, `getAiProviders`, `getCategoryConfig`, `getTierAssignments`, `getBrowserTrackingStatus`, `getTrackingSettings`, `getRecordingModes`, `getAIAgentCustomPaths`, `getCrossSessionSyncConfig`, `getAutoAssignConfig`

### Patterns & Insights
`getDayDetail`, `getHourDetail`, `getTypicalActivityAtTime`, `getBestDays`, `getHourlyHeatmap`, `getTypicalDay`

---

## 4. Key Data Shape Definitions

### Goal (AiPage.tsx:21-35)
```typescript
interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory; // 'work' | 'personal' | 'health' | 'learning'
  target: { type: 'time' | 'completion'; targetSeconds?: number; matchCategory?: string; done?: boolean };
  period: string;
  status: string; // 'pending' | 'completed' | 'dismissed'
  date: string; // ISO date YYYY-MM-DD
  source: string;
  links: { label: string; url: string }[];
  progressSeconds?: number;
  createdAt: string;
  completedAt?: string;
}
```

### AI Usage Summary (from getAIUsageSummary)
```typescript
// Period: 'day' | 'week' | 'month'
{
  totalTokens: number;
  totalCost: number;
  activeSessions: number;
  byTool: Record<string, { tokens: number; cost: number; sessions: number; messages: number }>;
  byAgent: Record<string, { sessions: number; tokens: number }>;
}
```

### DORA Metrics (from getDORAMetrics)
```typescript
// Period: 'week' | 'month'
{
  deploymentFrequency: number; // deployments per period
  leadTimeForChange: number; // hours
  meanTimeToRestore: number; // hours
  changeFailureRate: number; // 0-1
  totalCommits: number;
  periodDays: number;
}
```

### Terminal Session (from getTerminalSessions)
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
  category?: string;
  status?: string;
  productArea?: string;
  description?: string;
  autoTags?: string[];
  categoryConfirmed?: boolean;
}
```

### Project (from getProjects)
```typescript
{
  id: string;
  name: string;
  path: string;
  repositoryUrl?: string;
  vcsType?: string;
  primaryLanguage?: string;
  defaultIde?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

### External Activity
```typescript
{
  id: number;
  name: string;
  type: string;
  color?: string;
  icon?: string;
  default_duration?: number;
  is_visible?: boolean;
  is_default?: boolean;
  sort_order?: number;
}
```

### Problem (from getProblems)
```typescript
{
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  status: string;
  user_notes?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 5. Architecture Notes

### Router Structure (Router.tsx / App.tsx)
- AiPage is at `/ai` route
- Protected by `deskflowAvailable` guard — `window.deskflowAPI` always exists when AiPage is mounted
- AiPage uses `window.deskflowAPI!` non-null assertion (safe)

### Data Fetching Pattern
- **Each page independently fetches its own data** via `useEffect` + IPC calls
- **No shared data layer** — pages don't share fetched state (exception: `analyticsCacheRef` 60s TTL in IDEProjectsPage for AI/analytics tab switching)
- **No global state management** — no Redux, Zustand, or context store for app data
- **Data flows:** IPC → main process handler → SQLite/service → JSON response → renderer state → component props

### Preload Bridge Pattern
- `contextBridge.exposeInMainWorld('deskflowAPI', { ... })` in `src/preload.ts`
- All methods are `ipcRenderer.invoke(...)` (async) or `ipcRenderer.on(...)` (listeners)
- ~200+ methods total
- Each method name maps 1:1 to an IPC channel name (snake_case or kebab-case)

### Design System
- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`)
- **Icons:** `lucide-react` (Target, Sparkles, Brain, etc.)
- **Color scheme:** Galaxy dark theme (zinc-950 bg, zinc-900/800 surfaces, zinc-400/300 text)
- **Cards:** GlassCard component with variants: `compact`, `subtle`, `notebook`, `bordered`
- **Accent colors:** amber (morning), emerald (active/in-progress), pink (review), violet, zinc
- **Animations:** framer-motion (used elsewhere, removed from AiPage for stability)

### Graphify Knowledge Graph
- 1208 nodes, 1855 edges, 132 communities
- Used for architecture context, NOT for runtime data access
- Runs as Python script: `agent/skills/maintain-context/graphify_maintain.py`

---

## 6. Performance Considerations

- **Data volume varies wildly:** goals (~10-50 rows), terminal sessions (~500 max), app logs (thousands per day), DORA (1-4 metrics)
- **Loading ALL on mount would be expensive** — recommended: lazy-load, cached contexts, query-on-demand
- **Some endpoints are expensive:** `getDashboardAggregates` does complex SQL aggregations, `getSessionMessages` returns full message history
- **Some endpoints require period params:** must specify 'today' | 'week' | 'month' | 'all' + optional dateOffset
- **Caching pattern exists:** `analyticsCacheRef` in IDEProjectsPage — 60s TTL, checks `Date.now() - cacheTimestamp < CACHE_TTL`

---

## 7. IPC Listener Events Available

| Event | Payload | Purpose |
|-------|---------|---------|
| `foreground-changed` | `{ app, title, ... }` | Live tracking updates |
| `tracking-heartbeat` | `{ timestamp }` | Tracking alive signal |
| `external-data-changed` | — | Broadcast data refresh |
| `browser-tracking-event` | browser URL data | Live browser activity |
| `sleep-detection` | sleep event data | Sleep state changes |
| `ai-sync-progress` | sync status | AI sync progress updates |
| `context-changed` | `{ type, action, entity }` | Context change events |
| `session-metadata-updated` | session metadata | Session tag/status changes |
