# Graph Report - .  (2026-05-30)

## Corpus Check
- 103 files · ~3,686,261 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 708 nodes · 1054 edges · 34 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 52|Community 52]]

## God Nodes (most connected - your core abstractions)
1. `WorkspaceRegistryService` - 23 edges
2. `ProblemsService` - 19 edges
3. `RAGService` - 18 edges
4. `RequestsService` - 16 edges
5. `assembleContext()` - 15 edges
6. `readFile()` - 14 edges
7. `executeActionsFromFile()` - 13 edges
8. `ProjectContextService` - 13 edges
9. `ChecklistService` - 12 edges
10. `SkillsService` - 10 edges

## Surprising Connections (you probably didn't know these)
- `loadData()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `clearToday()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `cleanCorruptedData()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `buildHourlyHeatmap()` --calls--> `setHours()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\DurationPicker.tsx
- `computeBrowserDateRange()` --calls--> `setHours()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\DurationPicker.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (95): handleTimerSync(), loadOverrides(), addIde(), addLog(), backfillStatsTables(), buildHourlyHeatmap(), buildWeeklyHeatmap(), calculateCost() (+87 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (20): cleanCorruptedData(), clearToday(), confirmSleepDetection(), dismissSleepDetection(), formatTimeFromHours(), getTotalTime(), handleStorage(), handleStorageChange() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (7): loadSkills(), handleCreate(), handleDelete(), handleSubmit(), handleUpdate(), handleUse(), showNotify()

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (14): adjustColor(), animateCamera(), calculateAngularSpeed(), calculateOrbitalPeriod(), computePlanets(), focusOnPlanet(), getPlanetColorByOrbit(), handleCategorySelect() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (3): CompactionService, DefaultLLMProvider, ProjectContextService

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (2): ContextAssemblyService, RAGService

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (1): WorkspaceRegistryService

### Community 7 - "Community 7"
Cohesion: 0.38
Nodes (18): assembleContext(), buildAutomationsContext(), buildDeepMemoryContext(), buildDesignSkillsContext(), buildGraphifyContext(), buildLLMWikiContext(), buildParaContext(), buildQMDContext() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (12): ensure_para_structure(), parse_problems(), Check GRAPH_REPORT.md exists and has content. Regenerate if broken., Create PARA directory structure in vault if it doesn't exist., Parse PROBLEMS.md into individual problem dicts (simple parser)., Sync project files to PARA-organized Obsidian vault., Sync graphify-out/ to Obsidian vault., rebuild_code_fix() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (1): ProblemsService

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (4): async(), formatDuration(), formatHours(), localDateStr()

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (4): handleSaveNotes(), handleSubmit(), ProblemsSyncService, handleCreateProblem()

### Community 12 - "Community 12"
Cohesion: 0.3
Nodes (1): RequestsService

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (6): init(), beep(), main(), Play a simple system beep., Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT, speak()

### Community 14 - "Community 14"
Cohesion: 0.28
Nodes (14): checkBrowserFocus(), extractDomain(), healthCheck(), identifyBrowser(), loadState(), logPreviousSession(), onStartup(), periodicSync() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (1): ChecklistService

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (2): parseFrontmatterList(), SkillsService

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (2): handleEditBlur(), handleEditKeyDown()

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (3): async(), loadOverrides(), setEditingKeywordSets()

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (1): formatHours()

### Community 20 - "Community 20"
Cohesion: 0.27
Nodes (6): async(), handleConfigSave(), handleRefresh(), handleToggleContext(), loadContextData(), loadContexts()

### Community 23 - "Community 23"
Cohesion: 0.32
Nodes (5): main(), parseArgs(), readActions(), writeActions(), loadProgress()

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (2): getStatusBorder(), getStatusColor()

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (2): formatRelTime(), SystemToggleCard()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (2): replaceLeafInTree(), swapLeavesInTree()

### Community 30 - "Community 30"
Cohesion: 0.6
Nodes (3): handleAdd(), handleKeyDown(), isValidHex()

### Community 31 - "Community 31"
Cohesion: 0.6
Nodes (3): buildColorSchemeXml(), buildFullContext(), readFileContent()

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (2): getAesthetic(), TasteKnobs()

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (2): shallowEqual(), useStableMemo()

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (1): SessionContextService

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (2): print_summary(), Print a summary of all features and their status.

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (2): print_plan(), Print the complete restoration plan.

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (1): handler()

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline

## Knowledge Gaps
- **10 isolated node(s):** `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Print a summary of all features and their status.`, `Print the complete restoration plan.`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 5`** (27 nodes): `ContextAssemblyService`, `.assembleContext()`, `.constructor()`, `.estimateTokens()`, `.formatContextForPrompt()`, `.getAssemblyStats()`, `createContextAssemblyService()`, `getRAGService()`, `initializeRAGService()`, `RAGService`, `.close()`, `.computeVectorNorm()`, `.constructor()`, `.cosineSimilarity()`, `.createSession()`, `.estimateTokens()`, `.fullTextSearch()`, `.getMessage()`, `.getSessionStats()`, `.initialize()`, `.queryMessages()`, `.rowToMessage()`, `.saveMessage()`, `.semanticSearch()`, `.updateSessionStats()`, `ContextAssemblyService.ts`, `RAGService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (24 nodes): `WorkspaceRegistry.ts`, `WorkspaceRegistryService`, `.addPlugin()`, `.collectAllContext()`, `.defaultComposeContext()`, `.discoverFromIPC()`, `.filterWorkspaceSkills()`, `.getAllPlugins()`, `.getComposeContext()`, `.getPlugin()`, `.getPluginsByCategory()`, `.getSidebarEntries()`, `.hasPlugin()`, `.initialize()`, `.isInitialized()`, `.notify()`, `.refresh()`, `.register()`, `.registerComposeContext()`, `.size()`, `.skillToDescriptor()`, `.subscribe()`, `.unregister()`, `.unregisterComposeContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (20 nodes): `ProblemsService.js`, `ProblemsService`, `.constructor()`, `.createProblem()`, `.deleteProblem()`, `.ensureAgentDir()`, `.getDefaultBaseDir()`, `.getNextIssueNumber()`, `.getProblem()`, `.getProblems()`, `.getProjectId()`, `.getProjectPath()`, `.migrateFromMd()`, `.parseProblemsLegacy()`, `.setProjectId()`, `.updateProblem()`, `.updateStatus()`, `.writeJson()`, `.writeMarkdown()`, `ProblemsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (17 nodes): `RequestsService.js`, `RequestsService`, `.constructor()`, `.createRequest()`, `.deleteRequest()`, `.ensureAgentDir()`, `.getDefaultBaseDir()`, `.getRequest()`, `.getRequests()`, `.linkProblem()`, `.migrateFromMd()`, `.parseRequestsLegacy()`, `.unlinkProblem()`, `.updateStatus()`, `.writeJson()`, `.writeMarkdown()`, `RequestsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (13 nodes): `ChecklistService`, `.constructor()`, `.createItem()`, `.deleteChecklistForParent()`, `.deleteItem()`, `.ensureAgentDir()`, `.getChecklistForParent()`, `.getChecklists()`, `.getDefaultBaseDir()`, `.updateItem()`, `.writeJson()`, `ChecklistService.js`, `ChecklistService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (12 nodes): `SkillsService.js`, `parseFrontmatterList()`, `SkillsService`, `.constructor()`, `.ensureSkillsDir()`, `.generateDescription()`, `.getDefaultBaseDir()`, `.getSkillById()`, `.getSkillContext()`, `.getSkills()`, `.loadSkillFromFile()`, `SkillsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (12 nodes): `decHours()`, `decMinutes()`, `handleEditBlur()`, `handleEditChange()`, `handleEditKeyDown()`, `handleStartEdit()`, `incHours()`, `incMinutes()`, `setMinutes()`, `startHold()`, `stopHold()`, `DurationPicker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (11 nodes): `InsightsPage.tsx`, `cellBg()`, `CircularGauge()`, `fmt()`, `formatDuration()`, `formatHours()`, `GoalStreak()`, `resolveActivityColor()`, `statusColor()`, `statusLabel()`, `InsightsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (7 nodes): `fmtCost()`, `fmtNum()`, `fmtSec()`, `getStatusBorder()`, `getStatusColor()`, `StatCard()`, `AnalyticsDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (5 nodes): `NewSessionDialog.tsx`, `checkInit()`, `estimateTokens()`, `formatRelTime()`, `SystemToggleCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (5 nodes): `createSplitFromDrag()`, `flattenPanes()`, `replaceLeafInTree()`, `swapLeavesInTree()`, `MapEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (4 nodes): `TasteKnobs.tsx`, `getAesthetic()`, `SliderRow()`, `TasteKnobs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (4 nodes): `useStableMemo.ts`, `deepEqual()`, `shallowEqual()`, `useStableMemo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (4 nodes): `SessionContextService`, `.extractContext()`, `.generateBriefContext()`, `SessionContextService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (3 nodes): `feature_inventory.py`, `print_summary()`, `Print a summary of all features and their status.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (3 nodes): `restoration_plan.py`, `print_plan()`, `Print the complete restoration plan.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (3 nodes): `preload.js`, `handler()`, `preload.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `graphify-pipeline.py`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSystemInfo()` connect `Community 7` to `Community 16`, `Community 0`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `executeActionsFromFile()` connect `Community 0` to `Community 9`, `Community 11`, `Community 12`, `Community 15`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `setHours()` connect `Community 1` to `Community 0`, `Community 17`, `Community 10`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Print a summary of all features and their status.` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._