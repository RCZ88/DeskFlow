# Page Context

**Purpose:** Structured page-by-page reference so AI agents understand the UI layer without re-discovering it every session.

**Last Updated:** 2026-06-14

---

## Page: Dashboard

### Identity
- **Route:** `/`
- **File:** `src/pages/DashboardPage.tsx`
- **Line count:** ~3068
- **Primary props:** appColors, categoryOverrides, timerBehavior, selectedPeriod, dateOffset, timeMode, tierAssignments, browserLogs, allLogs, filteredLogs, externalActivities, externalActivityTiers, liveActivityLogs, onDateOffsetChange, onActivityClick
- **Primary state:** overview, loading, heatmapMode, selectedHour, selectedDay

### Component Tree
```
PageShell
├── OrbitSystem (lazy loaded, React Three Fiber)
│   └── 3D solar system: apps as planets, orbits by usage
├── StatsRow
│   └── StatCard x4 (total time, most used app, productive %, streak)
├── WeeklyOverviewChart (bar chart, rounded corners)
├── ActivityHeatmap (7x24 grid, click hour/day)
│   └── DayDetailPopup (on day click)
├── RecentSessionsList
└── FocusSessions (stopwatch, add/edit/delete)
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `getDashboardAggregates` | read | Single-call aggregate for all dashboard data |
| `getProductivitySessions` | read | Focus sessions |
| `getActiveExternalSession` | read | Running external timer check |
| `getCurrentForeground` | read | Current active app |
| `getExternalSessions` | read | External activity data |
| `getDayDetail` | read | Drill-down for a specific day |
| `saveProductivitySession` | write | Save focus session |
| `startExternalSession` | write | Start external activity timer |
| `stopExternalSession` | write | Stop external activity timer |
| `setPageVisibility` | write | Signal page focus/blur |

### Data Flow
- **Reads:** Single `getDashboardAggregates` call replaced multiple individual calls (optimization). Returns overview + recent sessions + stat cards data.
- **Writes:** Focus sessions via `saveProductivitySession`. External timer via `startExternalSession`/`stopExternalSession`.
- **Shared state:** All props come from App.tsx global state. `selectedPeriod`/`dateOffset` are shared across all pages via top nav.

### Connections to Other Pages
- **Day click on heatmap →** DayDetailPopup (self-contained, not a separate route)
- **No direct page navigation links** — dashboard is a landing page, users navigate via sidebar
- **Shares** `selectedPeriod`, `dateOffset`, `timeMode` with every other page (top nav is global)

### Update Conventions
- Performance-critical page — avoid unnecessary re-renders. The `getDashboardAggregates` IPC call was a key optimization, don't fragment it back into separate calls.
- `OrbitSystem` is lazy loaded with `React.lazy` — keep it that way (heavy Three.js dep).
- Heatmap interaction pattern: click cell = select hour, click day label = show day detail.

### Known Pitfalls
- Heatmap day click navigates to a popup, not a separate route — don't add routing here.
- OrbitSystem re-renders aggressively — wrap callbacks in `useCallback`.
- Focus session timer uses `setInterval` — clean up on unmount in `useEffect` return.

---

## Page: Stats / Applications

### Identity
- **Route:** `/stats`
- **File:** `src/pages/StatsPage.tsx`
- **Line count:** ~1412
- **Primary props:** logs, allLogs, appStats, selectedPeriod, dateOffset, timeMode, tierAssignments, liveActivityLogs
- **Primary state:** viewMode, sortField, sortDirection, editingSession

### Component Tree
```
PageShell
├── TabBar (Overview / Live Detection)
├── AppStatsTable (sortable, filterable)
├── TimeDistributionChart (pie/bar/line)
├── CategoryBreakdown
├── SessionsList (with inline edit/delete)
│   └── SessionEditDialog (modal)
├── LiveDetectionPanel (terminal-style event log, 50-event ring buffer)
└── ExportButtons (CSV/JSON)
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `updateAppLog` | write | Edit session details |
| `deleteAppLog` | write | Delete a session entry |

### Data Flow
- **Reads:** Pre-filtered data from App.tsx props (`allLogs`, `appStats`)
- **Writes:** Session edits/deletes via IPC
- **Shared state:** `liveActivityLogs` prop — 50-event ring buffer, persisted across page navigation

### Connections to Other Pages
- Receives `liveActivityLogs` from App.tsx (same array passed to BrowserActivityPage — shared)
- No direct page links

### Update Conventions
- Live detection panel uses a ring buffer pattern (max 50 events) — don't increase without considering memory
- SessionEditDialog uses `getByText('Save')` for closing — be consistent with dialog patterns

### Known Pitfalls
- `deleteAppLog` removes from DB but doesn't automatically update parent state — caller must trigger refresh
- Sort state resets on prop change — use `useMemo` for filtered/sorted data

---

## Page: Productivity

### Identity
- **Route:** `/productivity`
- **File:** `src/pages/ProductivityPage.tsx`
- **Line count:** ~1573
- **Primary props:** logs, browserLogs, appStats, selectedPeriod, dateOffset, tierAssignments, domainKeywordRules, timeMode, externalActivities, externalActivityTiers
- **Primary state:** score, focusSessions, trends

### Component Tree
```
PageShell
├── ProductivityScore (color-coded: green/amber/red)
├── FocusTimeCard (with idle detection, 5min clamp)
├── ProductivityTrendChart (line chart over time)
├── AppClassificationGrid (productive/neutral/distracting)
├── BrowserProductivityRules (domain keyword matching)
├── FocusSessionsList
└── TimelineNavigation (date offset arrows)
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `getExternalSessions` | read | External activity for productivity context |

### Data Flow
- **Reads:** App.tsx props for app classification + `getExternalSessions` IPC for external data
- **Writes:** None directly — classification is derived from `tierAssignments`
- **Derived state:** Productivity score computed from tier-weighted time ratios

### Connections to Other Pages
- Shares `tierAssignments` mapping with all pages (category → productive/neutral/distracting)
- No direct page navigation links

### Known Pitfalls
- Idle detection clamps at 5min — sessions longer than 5min without activity are split
- Productivity score calculation must stay in sync with Settings page tier assignments

---

## Page: Browser Activity

### Identity
- **Route:** `/browser`
- **File:** `src/pages/BrowserActivityPage.tsx`
- **Line count:** ~1126
- **Primary props:** selectedPeriod, dateOffset, timeMode, tierAssignments, allLogs
- **Primary state:** activeTab, domainRules

### Component Tree
```
PageShell
├── TabBar (7 tabs: Overview/IDEs/Tools/Projects/AI/Git/Trash)
├── WebsiteTable (URL, domain, visits, duration)
├── DomainGroupList (grouped by domain)
├── TopSitesChart (bar chart)
├── CategoryDistributionChart (pie)
├── SearchFilter
├── LiveDetectionPanel (same 50-event ring buffer pattern)
└── RecordingModeToggle (on-view persistence)
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `getBrowserDomainStats` | read | Domain-level stats |
| `getBrowserCategoryStats` | read | Category distribution |
| `getBrowserLogs` | read | Raw browser logs |
| `setDomainCategory` | write | Override domain category |
| `setBrowserWithExtension` | write | Toggle browser extension |
| `getPreferences` | read | User preferences |
| `getTrackedBrowsers` | read | Browser list for tracking config |
| `setPageVisibility` | write | Signal page focus/blur |

### Data Flow
- **Reads:** IPC calls for browser-specific data + `allLogs` from props
- **Writes:** Domain category overrides, browser extension settings
- **Shared state:** `liveActivityLogs` ring buffer (same shared array as Stats page)

### Connections to Other Pages
- Shares `liveActivityLogs` with StatsPage (same prop from App.tsx)
- 7-tab bar shows overview of all IDE/Tools/Projects/AI/Git/Trash data but doesn't link to those pages directly

### Known Pitfalls
- Tab bar here is a local component, not the global sidebar — don't confuse with navigation tabs
- Browser extension flag affects data collection elsewhere — handle carefully

---

## Page: IDE Projects

### Identity
- **Route:** `/ide`
- **File:** `src/pages/IDEProjectsPage.tsx`
- **Line count:** ~4004
- **Primary props:** none (self-contained)
- **Primary state:** overview, projects, ides, expandedCategories, showInitModal, showSetupModal, activeTab, scanning, showDeleteConfirm

### Component Tree
```
PageShell
├── TabBar (IDEs / Tools / Projects / AI / Git / Trash)
├── IDESection
│   ├── IDECard x N (detected IDEs)
│   └── IDEDetailPanel (extensions, version)
├── ToolsSection
│   ├── ToolCategoryAccordion (expandable)
│   └── ResetToolsButton (with confirm dialog)
├── ProjectsSection
│   ├── ProjectGrid (cards with health scores)
│   ├── AddProjectButton → AddProjectModal
│   ├── EditProjectDialog
│   └── DeleteConfirmDialog
├── AIAnalyticsSection
│   ├── AIUsageSummary (tokens, cost, per-tool)
│   ├── AIAgentDetail
│   └── SyncButton
├── GitSection
│   ├── CommitHistory (with diff viewer)
│   ├── DORAMetrics
│   └── ContributorStats
├── TrashSection
│   └── DeletedProjectsList (with restore)
├── ButtonRow
│   ├── ScanEnvironment (detect IDEs + tools)
│   ├── Initialize → InitializeProgressModal
│   ├── Setup → WorkspaceSettingsDialog
│   └── New Agent → NewSessionDialog
└── WorkspaceArea (embedded Terminal)
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `getAllProjects` | read | All non-deleted projects |
| `addProject` | write | Add new project |
| `updateProject` | write | Edit project metadata |
| `deleteProject` | write | Soft-delete project |
| `restoreProject` | write | Restore from trash |
| `removeProject` | write | Permanent delete |
| `getProjectDetails` | read | Extended project info |
| `openProject` | write | Launch in IDE |
| `detectProjectLanguage` | read | Auto-detect language |
| `pickFolder` | read | Folder browser |
| `scanIdeDefaultProjects` | read | Discover IDE workspaces |
| `scanCustomDirectory` | read | Scan user-chosen dir |
| `detectIDEs` | read | Scan for installed IDEs |
| `scanTools` | read | Scan for dev tools |
| `resetTools` | write | Delete all tools + rescan |
| `getIDEProjectsOverview` | read | Combined overview data |
| `getAIUsageSummary` | read | AI token/cost stats |
| `getAISyncStatus` | read | AI sync state |
| `syncAIUsage` | write | Trigger AI data sync |
| `syncCommits` | write | Trigger git commit sync |
| `syncGitHubCommits` | write | GitHub commit sync |
| `getCommitHistory` | read | Git commit log |
| `getContributorStats` | read | Contributor analytics |
| `getDORAMetrics` | read | DORA metrics (deploy frequency, lead time, etc.) |
| `getProblems` | read | Issue tracker data |
| `getRequests` | read | Feature requests |
| `getTerminalSessions` | read | Terminal session history |
| `getPromptHistory` | read | Prompt history |
| `getGitDiff` | read | Diff for a commit |
| `terminalWrite` | write | Write to terminal |

### Data Flow
- **Reads:** Multiple IPC calls for different sections — each tab fetches independently
- **Writes:** Project CRUD, IDE/tool detection triggers, AI sync, git sync
- **Self-contained:** No props from App.tsx — fetches own data

### Connections to Other Pages
- **Close workspace →** collapses embedded Terminal, back to `/ide`
- **Workspace ready →** navigates to `/terminal`
- **Tutorial page** links here for IDE setup walkthrough
- **Shares** no global state from App.tsx

### Update Conventions
- Largest page in the app (~4004 lines) — be surgical, don't refactor unrelated sections
- InitializeProgressModal was recently fixed to reset state on re-open (don't regress)
- Each tab section is independent — modify one without touching others
- Delete flows use soft-delete (trash) + permanent delete (confirm dialog)
- `scanning` state bool disables both Scan and Initialize buttons during active scan

### Known Pitfalls
- InitializeProgressModal had re-init state leak bug — state must reset when modal closes
- `resetTools` requires `window.confirm` before calling — do not remove the confirmation
- Commit diff viewer uses `getGitDiff` — large diffs can be slow, consider truncation

---

## Page: Terminal / Workspace

### Identity
- **Route:** `/terminal`
- **File:** `src/pages/TerminalPage.tsx`
- **Line count:** ~6303
- **Primary props:** none (self-contained, receives projectId/path via workspace launch)
- **Primary state:** sessions, terminalInstances, activeTab, activeSessionId, layout (N-ary tree)

### Component Tree
```
PageShell
├── TerminalWindow (@xterm/xterm + node-pty)
│   └── TerminalLayout (N-ary tree split panes)
│       └── TerminalPane x N
├── Sidebar (12 tabs)
│   ├── Presets (saved commands)
│   ├── Sessions (AI chat history)
│   ├── Map (layout visualization, drag-and-drop)
│   ├── Analytics (AI usage)
│   ├── Problems (issue tracker)
│   ├── Requests (feature requests)
│   ├── Files (agent directory browser)
│   ├── Checklists
│   ├── Skills (DSL forms)
│   ├── Configs (model config, cross-session sync)
│   ├── History (prompt history)
│   └── Context Maintenance (memory management)
│   └── Prompts (system prompt editing)
├── InstructionPanel
├── NewSessionDialog
├── ImportSessionsDialog
├── GeneralistDialog
├── RoutingDisambiguationDialog
├── RoutingToast
├── SessionEditDialog
├── ContextSidebar
├── AnalyticsDashboard
└── DesignWorkspacePage (embedded)
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `terminal:create` | write | Create terminal pane |
| `terminal:write` | write | Write to terminal |
| `terminal:resize` | write | Resize terminal |
| `terminal:destroy` | write | Destroy terminal |
| `spawn-terminal` | write | Spawn PTY process |
| `retry-agent-init` | write | Retry agent init |
| `save-terminal-session` | write | Save session state |
| `get-terminal-session-resume-id` | read | Resume session |
| `workspace:save` | write | Save workspace layout |
| `workspace:load` | read | Load workspace layout |
| `read-agent-file` | read | Read agent directory files |
| `list-agent-files` | read | List agent files |
| `getSkills` | read | List skills |
| `createSkill` | write | Create new skill |
| `updateSkill` | write | Update skill |
| `getAIUsageSummary` | read | AI analytics |
| `getProblems` | read | Issue tracker |
| `getRequests` | read | Feature requests |
| `lock-file` | write | Cross-session file lock |
| `release-file-lock` | write | Release file lock |
| `get-file-locks` | read | List active locks |
| `compile-sync-summary` | read | Cross-session sync summary |
| `broadcast-context-delta` | write | Broadcast context changes |

### Data Flow
- **Reads:** Agent files, skills, sessions, locks, problems, requests
- **Writes:** Terminal sessions, file locks, skills, workspace config
- **Self-contained:** No App.tsx props

### Connections to Other Pages
- **Back button →** `/ide` (returns to IDE Projects page)
- **DesignWorkspacePage** embedded as a sidebar tab
- **Launch from IDE page** with projectId context

### Update Conventions
- Largest file in the project — extreme caution required. Only modify the specific section needed.
- Cross-session sync has a file lock manager — don't bypass it.
- Terminal uses node-pty — changes to terminal creation must handle cleanup on unmount.

### Known Pitfalls
- N-ary tree layout can get complex — use the `TerminalMiniMap` for debugging
- `RoutingDisambiguationDialog` needs proper session context before opening
- File locks from crashed sessions can orphan — cleaner runs on session startup

---

## Page: External Activity

### Identity
- **Route:** `/external` (and `/old-dashboard` legacy alias)
- **File:** `src/pages/ExternalPage.tsx`
- **Line count:** ~2763
- **Primary props:** selectedPeriod, dateOffset
- **Primary state:** activities, activeTimer, sleepData, consistencyScore

### Component Tree
```
PageShell
├── TimeAuditCard (comparison: amber external vs emerald internal)
├── ConsistencyScore
├── SleepTracking
│   ├── SleepTrendsChart (floating range, period-aware)
│   ├── PastSleepModal
│   └── ManualSleepAddForm
├── ActivityDetailPanel (drill-down on click)
├── ChartRow (3 glass-styled charts)
│   ├── DailyUsageTrend
│   ├── ActivityDistribution (doughnut)
│   └── WeeklyTrend
├── AlwaysVisibleTimer (stopwatch, 00:00:00 when idle)
├── ActivitySessionsList (edit/delete)
└── ReorderableActivityList (drag-reorder)
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `getExternalActivities` | read | Activity definitions |
| `getExternalStats` | read | Activity statistics |
| `getExternalSessions` | read | Session data |
| `getActiveExternalSession` | read | Running session check |
| `getConsistencyScore` | read | Consistency metric |
| `getSleepTrends` | read | Sleep data for charts |
| `getSleepForDate` | read | Single day sleep data |
| `addManualSleep` | write | Add sleep entry |
| `updateManualSleep` | write | Edit sleep entry |
| `startExternalSession` | write | Start timer |
| `stopExternalSession` | write | Stop timer |
| `startExternalActivity` | write | Start activity |
| `stopExternalActivity` | write | Stop activity |
| `addExternalActivity` | write | Create activity type |
| `updateExternalActivity` | write | Edit activity type |
| `deleteExternalActivity` | write | Delete activity type |
| `updateExternalSession` | write | Edit session |
| `deleteExternalSession` | write | Delete session |
| `addExternalTime` | write | Add time manually |
| `reorderExternalActivities` | write | Save new order |
| `getActivityStats` | read | Per-activity stats |
| `getMorningPrompt` | read | Daily morning prompt |
| `dismissMorningPrompt` | write | Dismiss prompt |
| `getSleepDebug` | read | Debug sleep data |
| `remove-activity` | write | Remove activity |

### Data Flow
- **Reads:** Activity definitions, sessions, stats, sleep data from IPC
- **Writes:** Sessions (CRUD), sleep (CRUD), activity timer, reorder
- **Props:** Only `selectedPeriod` and `dateOffset` from App.tsx

### Connections to Other Pages
- `/old-dashboard` is a legacy alias that renders the same component
- Timer state is fetched via `getActiveExternalSession` — not shared via props
- No direct navigation links to other pages

### Update Conventions
- Timer must show "00:00:00" with "Click to start tracking" when idle — don't change this
- Sleep chart was fixed to respect period selector (1/7/30/90 days) — don't regress
- Drag-reorder uses a custom order, not alphabetical — preserve user ordering

### Known Pitfalls
- Double-fetch on initial render was a recurring bug — watch for it
- Session timer can desync from backend if page isn't focused — check `getActiveExternalSession` on focus

---

## Page: AI Assistant

### Identity
- **Route:** `/ai`
- **File:** `src/pages/AiPage.tsx`
- **Line count:** ~339
- **Primary props:** none (self-contained)
- **Primary state:** goals, briefs, topicDigest

### Component Tree
```
PageShell
├── AIBriefCard (daily/weekly)
├── TopicDigestCard
├── DailyPlanCard (mode: morning/in-progress/review)
├── GoalHistoryCard
├── ContextSummaryCard
├── MyPlanCard
└── LongTermPlanCard
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `getGoals` | read | Goal list |
| `saveGoal` | write | Create/update goal |
| `suggestGoals` | read | AI-suggested goals |
| `saveGoalReview` | write | Save review |
| `getTopicDigest` | read | Topic summaries |
| `readPlanningMd` | read | Planning doc |
| `getGoalContext` | read | Goal context data |
| `getLongtermGoals` | read | Long-term goals |

### Data Flow
- **Reads:** Goals, digests, planning docs from IPC
- **Writes:** Goals, reviews
- **Self-contained:** No App.tsx props

### Connections to Other Pages
- Smallest page in the app — standalone feature, no cross-page links

---

## Page: Insights / Reports

### Identity
- **Route:** `/reports`
- **File:** `src/pages/InsightsPage.tsx`
- **Line count:** ~1244
- **Primary props:** logs, browserLogs, appStats, selectedPeriod, dateOffset, tierAssignments
- **Primary state:** insightTab (Day/Weekly/Activities)

### Component Tree
```
PageShell
├── TabBar (Day / Weekly / Activities)
├── TypicalDayHeatmap (7x24, intensity-colored)
├── StatsRow (5 stat cards with trend indicators)
├── DayOfWeekChart (bar)
├── SleepRecoveryChart (grouped bar)
├── ActivityBreakdownChart (horizontal bar)
├── DailyTrendChart
├── CategoryDoughnutChart
└── ChartJS dark tooltips
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `getExternalStats` | read | External stats |
| `getConsistencyScore` | read | Consistency metric |
| `getSleepTrends` | read | Sleep trends |
| `getBestDays` | read | Best day identification |
| `getDailyStats` | read | Per-day stats |
| `getTypicalDay` | read | Typical day pattern |

### Data Flow
- **Reads:** IPC for report-specific aggregations + `appStats`/`logs` from props
- **Writes:** None — read-only analytics page

### Connections to Other Pages
- Uses same `selectedPeriod`/`dateOffset` from top nav
- Shares sleep/external data sources with External page

---

## Page: Database

### Identity
- **Route:** `/database`
- **File:** `src/pages/DatabasePage.tsx`
- **Line count:** ~194
- **Primary props:** none (self-contained)
- **Primary state:** viewMode (Analytics/Tables), selectedTable, tableData

### Component Tree
```
PageShell
├── ViewToggle (Analytics / Tables)
├── AnalyticsDashboard
│   ├── StatCard x5
│   └── Chart x8 (tokens, cost, sessions, categories, problems, requests, timing, trends)
├── TablesView
│   ├── TableSearch
│   ├── SchemaViewer
│   ├── PaginatedTable
│   └── CSVExport
└── DatabaseFileStats
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| (uses `(window as any).deskflowAPI`) | read/write | Generic table queries |

### Data Flow
- **Reads:** Table listing, schema, data queries via generic API
- **Self-contained:** No App.tsx props

### Known Pitfalls
- Uses `(window as any).deskflowAPI` instead of typed `deskflowAPI!` — inconsistent with rest of app
- JSON fallback mode when SQLite unavailable — handle both paths

---

## Page: Settings

### Identity
- **Route:** `/settings`
- **File:** `src/pages/SettingsPage.tsx`
- **Line count:** ~3497
- **Primary props:** logs, appStats, websiteStats, onRegisterSave, onReloadData, onCategoryOverridesChange, timerBehavior, trackerAppMode, externalActivities, externalActivityTiers
- **Primary state:** activeTab, categories, colorOverrides, domainRules

### Component Tree
```
PageShell
├── TabBar (Categories / Colors / Tracking / Browser Rules / General / Prompts)
├── CategoryTab
│   ├── DraggableCategoryList (@dnd-kit)
│   ├── AddCustomCategory
│   └── ResetDefaultsButton
├── ColorsTab
│   ├── AppColorPicker x N
│   └── ResetColorsButton
├── TrackingTab
│   ├── TimerBehaviorSelect
│   ├── TrackerAppModeToggle
│   ├── AutoStartToggle
│   ├── AppSwitchDebounceSlider
│   ├── SleepGapSetting
│   ├── MaxSessionDuration
│   └── TransientFilterToggle
├── BrowserRulesTab
│   ├── DomainRulesList
│   └── KeywordRulesList
├── GeneralTab
│   ├── LaunchOnStartupToggle
│   ├── MinimizeToTrayToggle
│   ├── ThemeSelect
│   ├── LanguageSelect
│   └── PromptHistoryLimit
├── PromptsTab
│   └── PerAgentPromptEditor (4-level system prompt merge)
├── DataSection (export/import/reset)
└── UnsavedChangesGuard (navigation warning)
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `getPreferences` | read | All user preferences |
| `setPreferences` | write | Save preferences |
| `getCategoryOverrides` | read | Custom category mappings |
| `setCategoryOverrides` | write | Save category overrides |
| `getDomainKeywordRules` | read | Browser rules |
| `setDomainKeywordRules` | write | Save browser rules |
| `getAllLogs` | read | Full log export |
| `getAppStats` | read | App stats export |
| `getWebsiteStats` | read | Website stats export |

### Data Flow
- **Reads:** Preferences, category overrides, domain rules from IPC
- **Writes:** All settings changes persist via IPC
- **Callbacks:** `onRegisterSave`, `onReloadData`, `onCategoryOverridesChange` signal App.tsx to refresh

### Connections to Other Pages
- `onCategoryOverridesChange` triggers re-fetch in App.tsx, which cascades to Dashboard heatmap colors and Productivity tier classifications
- `timerBehavior` and `trackerAppMode` affect tracking behavior across all pages
- `externalActivities`/`externalActivityTiers` shared with ExternalPage

### Update Conventions
- Unsaved changes guard uses `beforeunload` + React Router blocker — don't remove
- `@dnd-kit` for drag-drop — preserve DndContext/SortableContext wrapping
- Settings page features have been lost before due to git reverts — never use git revert/reset
- Tailwind v4 only — never add postcss/autoprefixer or change `@import "tailwindcss"`
- Each tab is independent — modify one without affecting others

### Known Pitfalls
- Color picker changes don't auto-save — user must click Save
- Drag-drop reordering uses index-based keys — can cause render glitches on reorder
- Data export creates large JSON — consider chunking for large datasets

---

## Page: Tutorial

### Identity
- **Route:** `/tutorial`
- **File:** `src/pages/TutorialPage.tsx`
- **Line count:** ~559
- **Primary props:** none (self-contained)
- **Primary state:** currentStep, overlayVisible

### Component Tree
```
PageShell
├── FeatureCardGrid (15 feature cards)
│   └── FeatureCard (click → navigate to route)
└── TutorialOverlay (step-by-step guidance)
    └── useTutorial hook (progress tracking)
```

### IPC Endpoints Called
- None directly

### Data Flow
- Reads feature list from local data
- Uses `useNavigate` from react-router for navigation

### Connections to Other Pages
- Clicking a feature card navigates to that page's route
- Every page route has a corresponding tutorial entry

---

## Page: IDE Help

### Identity
- **Route:** `/ide-help`
- **File:** `src/pages/IDEHelpPage.tsx`
- **Line count:** ~318
- **Primary props:** none (self-contained)

### Component Tree
```
PageShell
├── VS CodeSetupGuide
├── JetBrainsSetupGuide
├── CursorSetupGuide
├── TroubleshootingFAQ
└── CommonIssuesList
```

### IPC Endpoints Called
- None directly

### Data Flow
- Static documentation page — no IPC, no data fetching

---

## Page: Design Workspace

### Identity
- **Route:** `/design-workspace` (also embedded in Terminal sidebar tab)
- **File:** `src/pages/DesignWorkspacePage.tsx`
- **Line count:** ~495
- **Primary props:** none (self-contained when routed, embedded in Terminal)

### Component Tree
```
PageShell
├── TasteKnobs (variance/motion/density sliders)
├── StyleReferences (8 styles: Claude, Linear, Vercel, etc.)
├── StyleDescription (free text)
├── DesignLibrarySources
│   ├── 21st.dev browser
│   ├── Aceternity browser
│   └── Refero browser
├── ComponentBrowserModal
├── LibraryConfigModal
├── ColorPicker
├── DesignComposeOutlet
└── CopyToClipboardButton
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `readProjectFile` | read | Read project files |
| `mcp-server-status` | read | MCP server health |
| `fetch-refero-catalog` | read | Refero catalog |
| `fetch-refero-system` | read | Refero system details |
| `search-refero-systems` | read | Refero search |
| `get-design-library-config` | read | Library config |
| `set-design-library-config` | write | Save library config |
| `get-design-cached-data` | read | Cached design data |
| `test-design-library-connection` | read | Test connection |

### Connections to Other Pages
- Embedded as a sidebar tab in TerminalPage
- Also has its own route `/design-workspace`
- Design context is copied to clipboard for use in AI prompts

---

## Shared State Map

```
App.tsx (global state)
├── selectedPeriod ─────────────────────────────► Dashboard, Stats, Productivity, Browser,
│                                                   External, Insights
├── dateOffset ─────────────────────────────────► Dashboard, Stats, Productivity, Browser,
│                                                   External, Insights
├── timeMode (focus/total) ─────────────────────► Dashboard, Stats, Productivity, Browser,
│                                                   Insights
├── tierAssignments ────────────────────────────► Dashboard, Productivity, Browser, Stats,
│                                                   Insights
├── allLogs / filteredLogs / appStats ──────────► Dashboard, Stats, Productivity, Browser,
│                                                   Insights, Settings
├── browserLogs ────────────────────────────────► Dashboard, Productivity, Insights
├── externalActivities / externalActivityTiers ──► Dashboard, Productivity, Settings
├── timerBehavior / trackerAppMode ─────────────► Settings, Dashboard
├── liveActivityLogs (ring buffer) ─────────────► Stats, Browser
├── categoryOverrides ──────────────────────────► Dashboard (heatmap colors)
└── onCategoryOverridesChange ──────────────────► Settings → triggers re-fetch in App.tsx
```

## Cross-Page Interaction Patterns

1. **Settings → Everywhere cascade:** Changing categories/tiers in Settings triggers `onCategoryOverridesChange` → App.tsx re-fetches → all pages re-render with new classifications
2. **IDE page → Terminal:** Workspace launch navigates to `/terminal` with project context
3. **Browser + Stats share live event log:** Both pages receive the same `liveActivityLogs` array prop
4. **Top nav is global:** Period, date offset, and time mode are controlled at App.tsx level and passed as props to every page
5. **Self-contained pages:** IDE, Terminal, AI, Database, Tutorial, IDE Help fetch their own data and don't depend on App.tsx props (except the shared top-nav period)
