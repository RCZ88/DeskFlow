# Graph Report - .  (2026-05-09)

## Corpus Check
- 48 files · ~3,163,796 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 320 nodes · 442 edges · 18 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App State Management|App State Management]]
- [[_COMMUNITY_OrbitSystem Visualization|OrbitSystem Visualization]]
- [[_COMMUNITY_Electron Main Process|Electron Main Process]]
- [[_COMMUNITY_Browser Extension Background|Browser Extension Background]]
- [[_COMMUNITY_Notification System|Notification System]]
- [[_COMMUNITY_Category Management|Category Management]]
- [[_COMMUNITY_Browser Activity Page|Browser Activity Page]]
- [[_COMMUNITY_Settings Page|Settings Page]]
- [[_COMMUNITY_Data Logging and Aggregation|Data Logging and Aggregation]]
- [[_COMMUNITY_Database Page|Database Page]]
- [[_COMMUNITY_AI Pricing Integration|AI Pricing Integration]]
- [[_COMMUNITY_Graphify Pipeline|Graphify Pipeline]]
- [[_COMMUNITY_Browser Tracking Server|Browser Tracking Server]]
- [[_COMMUNITY_Productivity Scoring|Productivity Scoring]]
- [[_COMMUNITY_Build Configuration|Build Configuration]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `ProblemsService` - 17 edges
2. `RequestsService` - 13 edges
3. `SkillsService` - 10 edges
4. `onStartup()` - 8 edges
5. `ProblemsParser` - 8 edges
6. `updateActiveTab()` - 7 edges
7. `saveState()` - 6 edges
8. `animateCamera()` - 6 edges
9. `ProblemsSyncService` - 6 edges
10. `logPreviousSession()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `loadData()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `clearToday()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `cleanCorruptedData()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `speak()` --calls--> `init()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\complete.py → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\BrowserActivityPage.tsx
- `fetchDomainStats()` --calls--> `getBrowserDomainStats()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\SettingsPage.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts

## Communities

### Community 0 - "App State Management"
Cohesion: 0.09
Nodes (47): handleStorageChange(), handleTimerSync(), loadOverrides(), addIde(), addLog(), calculateCost(), calculateProductivityScore(), categorizeApp() (+39 more)

### Community 1 - "OrbitSystem Visualization"
Cohesion: 0.08
Nodes (15): adjustColor(), animateCamera(), calculateAngularSpeed(), calculateOrbitalPeriod(), computePlanets(), focusOnPlanet(), getPlanetColorByOrbit(), getSystemPosition() (+7 more)

### Community 2 - "Electron Main Process"
Cohesion: 0.08
Nodes (8): async(), cleanCorruptedData(), clearToday(), dismissSleepPrompt(), handleStorage(), loadData(), reloadOverrides(), getLogs()

### Community 3 - "Browser Extension Background"
Cohesion: 0.2
Nodes (1): ProblemsService

### Community 4 - "Notification System"
Cohesion: 0.28
Nodes (14): checkBrowserFocus(), extractDomain(), healthCheck(), identifyBrowser(), loadState(), logPreviousSession(), onStartup(), periodicSync() (+6 more)

### Community 5 - "Category Management"
Cohesion: 0.16
Nodes (6): init(), beep(), main(), Play a simple system beep., Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT, speak()

### Community 6 - "Browser Activity Page"
Cohesion: 0.2
Nodes (6): Check GRAPH_REPORT.md exists and has content. Regenerate if broken., Sync graphify-out/ to Obsidian vault., rebuild_code_fix(), sync_to_vault(), validate_report(), ProblemsParser

### Community 7 - "Settings Page"
Cohesion: 0.29
Nodes (1): RequestsService

### Community 8 - "Data Logging and Aggregation"
Cohesion: 0.17
Nodes (2): formatDuration(), formatHours()

### Community 9 - "Database Page"
Cohesion: 0.17
Nodes (5): getBrowserDomainStats(), async(), fetchDomainStats(), loadOverrides(), setEditingKeywordSets()

### Community 10 - "AI Pricing Integration"
Cohesion: 0.18
Nodes (2): ProblemsSyncService, handleSubmit()

### Community 11 - "Graphify Pipeline"
Cohesion: 0.17
Nodes (2): getPersistedActivityFeed(), getPersistedTimerState()

### Community 12 - "Browser Tracking Server"
Cohesion: 0.29
Nodes (1): SkillsService

### Community 13 - "Productivity Scoring"
Cohesion: 0.2
Nodes (1): formatHours()

### Community 16 - "Build Configuration"
Cohesion: 0.5
Nodes (2): formatCellValue(), formatDuration()

### Community 20 - "Community 20"
Cohesion: 0.5
Nodes (1): SessionContextService

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (1): handler()

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (1): Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline

## Knowledge Gaps
- **5 isolated node(s):** `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline`, `Check GRAPH_REPORT.md exists and has content. Regenerate if broken.`, `Sync graphify-out/ to Obsidian vault.`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Browser Extension Background`** (18 nodes): `ProblemsService.js`, `ProblemsService`, `.constructor()`, `.createProblem()`, `.deleteProblem()`, `.ensureAgentDir()`, `.generateMarkdown()`, `.getDefaultBaseDir()`, `.getNextIssueNumber()`, `.getProblem()`, `.getProblems()`, `.getProjectId()`, `.getProjectPath()`, `.parseProblems()`, `.setProjectId()`, `.updateProblem()`, `.updateStatus()`, `ProblemsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Page`** (14 nodes): `RequestsService.js`, `RequestsService`, `.constructor()`, `.createRequest()`, `.deleteRequest()`, `.ensureAgentDir()`, `.generateMarkdown()`, `.getDefaultBaseDir()`, `.getRequest()`, `.getRequests()`, `.linkProblem()`, `.parseRequests()`, `.updateStatus()`, `RequestsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Data Logging and Aggregation`** (13 nodes): `ExternalPage.tsx`, `async()`, `calculateSleepDuration()`, `formatBedtime()`, `formatDuration()`, `formatHours()`, `getHex()`, `getIcon()`, `getTailwind()`, `handleKeyDown()`, `handleOverlayClick()`, `handleRestoreSession()`, `ExternalPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Pricing Integration`** (13 nodes): `ProblemsSyncService`, `.constructor()`, `.createProblem()`, `.syncFromMarkdown()`, `.syncToMarkdown()`, `.updateProblem()`, `TerminalPage.tsx`, `ProblemsSyncService.ts`, `formatDate()`, `generateTerminalId()`, `handleStatusChange()`, `handleSubmit()`, `logOnce()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Graphify Pipeline`** (12 nodes): `computePeriodRange()`, `formatDuration()`, `getHeatColor()`, `getHeatmapColor()`, `getPersistedActivityFeed()`, `getPersistedTimerState()`, `getTierFromCategory()`, `handleDayClick()`, `handleInteraction()`, `handleKeyDown()`, `loadExternalData()`, `DashboardPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Browser Tracking Server`** (11 nodes): `SkillsService.js`, `SkillsService`, `.constructor()`, `.ensureSkillsDir()`, `.generateDescription()`, `.getDefaultBaseDir()`, `.getSkillById()`, `.getSkillContext()`, `.getSkills()`, `.loadSkillFromFile()`, `SkillsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Productivity Scoring`** (10 nodes): `InsightsPage.tsx`, `CircularGauge()`, `formatHours()`, `getActivityColor()`, `getActivityHex()`, `getHeatColor()`, `GoalStreak()`, `statusColor()`, `statusLabel()`, `InsightsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Build Configuration`** (5 nodes): `DatabasePage()`, `formatCellValue()`, `formatDuration()`, `setTableData()`, `DatabasePage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (4 nodes): `SessionContextService`, `.extractContext()`, `.generateBriefContext()`, `SessionContextService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `preload.js`, `handler()`, `preload.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `graphify-pipeline.py`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `computePlanets()` connect `OrbitSystem Visualization` to `App State Management`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `ProblemsParser` connect `Browser Activity Page` to `App State Management`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App State Management` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `OrbitSystem Visualization` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Electron Main Process` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._