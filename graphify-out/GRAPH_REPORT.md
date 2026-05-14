# Graph Report - .  (2026-05-15)

## Corpus Check
- 53 files · ~3,335,207 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 384 nodes · 552 edges · 19 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `ProblemsService` - 19 edges
2. `RequestsService` - 15 edges
3. `SkillsService` - 10 edges
4. `setHours()` - 10 edges
5. `onStartup()` - 8 edges
6. `ProblemsParser` - 8 edges
7. `updateActiveTab()` - 7 edges
8. `animateCamera()` - 7 edges
9. `saveState()` - 6 edges
10. `syncAllAIAgents()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `getViewLabel()` --calls--> `setHours()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\BrowserActivityPage.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\DurationPicker.tsx
- `async()` --calls--> `setHours()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\ExternalPage.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\DurationPicker.tsx
- `loadData()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `clearToday()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `cleanCorruptedData()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (55): handleStorageChange(), handleTimerSync(), loadOverrides(), addIde(), addLog(), calculateCost(), calculateProductivityScore(), categorizeApp() (+47 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (14): adjustColor(), animateCamera(), calculateAngularSpeed(), calculateOrbitalPeriod(), computePlanets(), focusOnPlanet(), getPlanetColorByOrbit(), handleCategorySelect() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (8): cleanCorruptedData(), clearToday(), confirmSleepDetection(), dismissSleepDetection(), handleStorage(), loadData(), reloadOverrides(), getLogs()

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (10): computePeriodRange(), getPersistedActivityFeed(), getPersistedTimerState(), handleDayClick(), loadExternalData(), handleEditBlur(), handleEditKeyDown(), setHours() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (3): ProblemsSyncService, handleCreateProblem(), handleSubmit()

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (12): ensure_para_structure(), parse_problems(), Check GRAPH_REPORT.md exists and has content. Regenerate if broken., Create PARA directory structure in vault if it doesn't exist., Parse PROBLEMS.md into individual problem dicts (simple parser)., Sync project files to PARA-organized Obsidian vault., Sync graphify-out/ to Obsidian vault., rebuild_code_fix() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (1): ProblemsService

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (7): getViewLabel(), init(), beep(), main(), Play a simple system beep., Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT, speak()

### Community 8 - "Community 8"
Cohesion: 0.28
Nodes (14): checkBrowserFocus(), extractDomain(), healthCheck(), identifyBrowser(), loadState(), logPreviousSession(), onStartup(), periodicSync() (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.31
Nodes (1): RequestsService

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (3): async(), formatDuration(), formatHours()

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (5): getBrowserDomainStats(), async(), fetchDomainStats(), loadOverrides(), setEditingKeywordSets()

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (1): SkillsService

### Community 13 - "Community 13"
Cohesion: 0.2
Nodes (1): formatHours()

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (2): replaceLeafInTree(), swapLeavesInTree()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (2): formatCellValue(), formatDuration()

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (1): SessionContextService

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (1): handler()

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (1): Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline

## Knowledge Gaps
- **8 isolated node(s):** `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline`, `Check GRAPH_REPORT.md exists and has content. Regenerate if broken.`, `Create PARA directory structure in vault if it doesn't exist.` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 6`** (20 nodes): `ProblemsService.js`, `ProblemsService`, `.constructor()`, `.createProblem()`, `.deleteProblem()`, `.ensureAgentDir()`, `.getDefaultBaseDir()`, `.getNextIssueNumber()`, `.getProblem()`, `.getProblems()`, `.getProjectId()`, `.getProjectPath()`, `.migrateFromMd()`, `.parseProblemsLegacy()`, `.setProjectId()`, `.updateProblem()`, `.updateStatus()`, `.writeJson()`, `.writeMarkdown()`, `ProblemsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (16 nodes): `RequestsService.js`, `RequestsService`, `.constructor()`, `.createRequest()`, `.deleteRequest()`, `.ensureAgentDir()`, `.getDefaultBaseDir()`, `.getRequest()`, `.getRequests()`, `.linkProblem()`, `.migrateFromMd()`, `.parseRequestsLegacy()`, `.updateStatus()`, `.writeJson()`, `.writeMarkdown()`, `RequestsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (11 nodes): `SkillsService.js`, `SkillsService`, `.constructor()`, `.ensureSkillsDir()`, `.generateDescription()`, `.getDefaultBaseDir()`, `.getSkillById()`, `.getSkillContext()`, `.getSkills()`, `.loadSkillFromFile()`, `SkillsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (10 nodes): `InsightsPage.tsx`, `cellBg()`, `CircularGauge()`, `fmt()`, `formatHours()`, `GoalStreak()`, `resolveActivityColor()`, `statusColor()`, `statusLabel()`, `InsightsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (5 nodes): `createSplitFromDrag()`, `flattenPanes()`, `replaceLeafInTree()`, `swapLeavesInTree()`, `MapEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (5 nodes): `DatabasePage()`, `formatCellValue()`, `formatDuration()`, `setTableData()`, `DatabasePage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (4 nodes): `SessionContextService`, `.extractContext()`, `.generateBriefContext()`, `SessionContextService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (3 nodes): `preload.js`, `handler()`, `preload.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `graphify-pipeline.py`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `setHours()` connect `Community 3` to `Community 10`, `Community 2`, `Community 11`, `Community 7`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Why does `computePlanets()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `ProblemsParser` connect `Community 5` to `Community 0`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `setHours()` (e.g. with `getBrowserLogs()` and `getBrowserDomainStats()`) actually correct?**
  _`setHours()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._