# Graph Report - .  (2026-05-26)

## Corpus Check
- 83 files · ~3,532,491 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 591 nodes · 893 edges · 28 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 42|Community 42]]

## God Nodes (most connected - your core abstractions)
1. `ProblemsService` - 19 edges
2. `RequestsService` - 16 edges
3. `RAGService` - 16 edges
4. `executeActionsFromFile()` - 13 edges
5. `ProjectContextService` - 13 edges
6. `ChecklistService` - 12 edges
7. `readFile()` - 11 edges
8. `assembleContext()` - 11 edges
9. `SkillsService` - 10 edges
10. `setHours()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `buildPreview()` --calls--> `assembleContext()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\NewSessionDialog.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\services\ContextService.ts
- `loadData()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `clearToday()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `cleanCorruptedData()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `computeBrowserDateRange()` --calls--> `setHours()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\DurationPicker.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (76): handleStorageChange(), handleTimerSync(), loadOverrides(), addIde(), addLog(), calculateCost(), calculateProductivityScore(), categorizeApp() (+68 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (20): cleanCorruptedData(), clearToday(), confirmSleepDetection(), dismissSleepDetection(), formatTimeFromHours(), getTotalTime(), handleStorage(), loadData() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (14): adjustColor(), animateCamera(), calculateAngularSpeed(), calculateOrbitalPeriod(), computePlanets(), focusOnPlanet(), getPlanetColorByOrbit(), handleCategorySelect() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (3): CompactionService, DefaultLLMProvider, ProjectContextService

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (14): ensure_para_structure(), parse_problems(), Check GRAPH_REPORT.md exists and has content. Regenerate if broken., Create PARA directory structure in vault if it doesn't exist., Parse PROBLEMS.md into individual problem dicts (simple parser)., Sync project files to PARA-organized Obsidian vault., Sync graphify-out/ to Obsidian vault., rebuild_code_fix() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (6): handleCreate(), handleDelete(), handleSubmit(), handleUpdate(), handleUse(), showNotify()

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (2): ContextAssemblyService, RAGService

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (5): buildPreview(), checkInfra(), formatRelTime(), SystemToggleCard(), SkillsService

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (1): ProblemsService

### Community 9 - "Community 9"
Cohesion: 0.42
Nodes (16): assembleContext(), buildAutomationsContext(), buildDeepMemoryContext(), buildDesignSkillsContext(), buildGraphifyContext(), buildLLMWikiContext(), buildParaContext(), buildQMDContext() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (2): formatDuration(), formatHours()

### Community 11 - "Community 11"
Cohesion: 0.3
Nodes (1): RequestsService

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (6): init(), beep(), main(), Play a simple system beep., Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT, speak()

### Community 13 - "Community 13"
Cohesion: 0.28
Nodes (14): checkBrowserFocus(), extractDomain(), healthCheck(), identifyBrowser(), loadState(), logPreviousSession(), onStartup(), periodicSync() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (1): ChecklistService

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (2): handleEditBlur(), handleEditKeyDown()

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (3): async(), loadOverrides(), setEditingKeywordSets()

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (1): formatHours()

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (6): async(), handleConfigSave(), handleRefresh(), handleToggleContext(), loadContextData(), loadContexts()

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (2): replaceLeafInTree(), swapLeavesInTree()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (2): formatCellValue(), formatDuration()

### Community 25 - "Community 25"
Cohesion: 0.7
Nodes (4): main(), parseArgs(), readActions(), writeActions()

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (2): shallowEqual(), useStableMemo()

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (1): SessionContextService

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (2): print_summary(), Print a summary of all features and their status.

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (2): print_plan(), Print the complete restoration plan.

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (1): handler()

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline

## Knowledge Gaps
- **10 isolated node(s):** `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Print a summary of all features and their status.`, `Print the complete restoration plan.`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 6`** (25 nodes): `ContextAssemblyService`, `.assembleContext()`, `.constructor()`, `.estimateTokens()`, `.formatContextForPrompt()`, `.getAssemblyStats()`, `createContextAssemblyService()`, `getRAGService()`, `initializeRAGService()`, `RAGService`, `.close()`, `.constructor()`, `.createSession()`, `.estimateTokens()`, `.fullTextSearch()`, `.getMessage()`, `.getSessionStats()`, `.initialize()`, `.queryMessages()`, `.rowToMessage()`, `.saveMessage()`, `.semanticSearch()`, `.updateSessionStats()`, `ContextAssemblyService.ts`, `RAGService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (20 nodes): `ProblemsService.js`, `ProblemsService`, `.constructor()`, `.createProblem()`, `.deleteProblem()`, `.ensureAgentDir()`, `.getDefaultBaseDir()`, `.getNextIssueNumber()`, `.getProblem()`, `.getProblems()`, `.getProjectId()`, `.getProjectPath()`, `.migrateFromMd()`, `.parseProblemsLegacy()`, `.setProjectId()`, `.updateProblem()`, `.updateStatus()`, `.writeJson()`, `.writeMarkdown()`, `ProblemsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (17 nodes): `ExternalPage.tsx`, `calculateSleepDuration()`, `formatBedtime()`, `formatDuration()`, `formatHours()`, `formatTime()`, `getHex()`, `getIcon()`, `getNiceMax()`, `getTailwind()`, `handleKeyDown()`, `handleOverlayClick()`, `handleRestoreSession()`, `handleSleepConfirmed()`, `mapTime()`, `toLocal()`, `ExternalPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (17 nodes): `RequestsService.js`, `RequestsService`, `.constructor()`, `.createRequest()`, `.deleteRequest()`, `.ensureAgentDir()`, `.getDefaultBaseDir()`, `.getRequest()`, `.getRequests()`, `.linkProblem()`, `.migrateFromMd()`, `.parseRequestsLegacy()`, `.unlinkProblem()`, `.updateStatus()`, `.writeJson()`, `.writeMarkdown()`, `RequestsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (13 nodes): `ChecklistService`, `.constructor()`, `.createItem()`, `.deleteChecklistForParent()`, `.deleteItem()`, `.ensureAgentDir()`, `.getChecklistForParent()`, `.getChecklists()`, `.getDefaultBaseDir()`, `.updateItem()`, `.writeJson()`, `ChecklistService.js`, `ChecklistService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (12 nodes): `decHours()`, `decMinutes()`, `handleEditBlur()`, `handleEditChange()`, `handleEditKeyDown()`, `handleStartEdit()`, `incHours()`, `incMinutes()`, `setMinutes()`, `startHold()`, `stopHold()`, `DurationPicker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (11 nodes): `InsightsPage.tsx`, `cellBg()`, `CircularGauge()`, `fmt()`, `formatDuration()`, `formatHours()`, `GoalStreak()`, `resolveActivityColor()`, `statusColor()`, `statusLabel()`, `InsightsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (5 nodes): `createSplitFromDrag()`, `flattenPanes()`, `replaceLeafInTree()`, `swapLeavesInTree()`, `MapEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (5 nodes): `DatabasePage()`, `formatCellValue()`, `formatDuration()`, `setTableData()`, `DatabasePage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (4 nodes): `useStableMemo.ts`, `deepEqual()`, `shallowEqual()`, `useStableMemo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (4 nodes): `SessionContextService`, `.extractContext()`, `.generateBriefContext()`, `SessionContextService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `feature_inventory.py`, `print_summary()`, `Print a summary of all features and their status.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `restoration_plan.py`, `print_plan()`, `Print the complete restoration plan.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (3 nodes): `preload.js`, `handler()`, `preload.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `graphify-pipeline.py`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `setHours()` connect `Community 1` to `Community 0`, `Community 15`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `computePlanets()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `executeActionsFromFile()` connect `Community 0` to `Community 8`, `Community 11`, `Community 4`, `Community 14`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `executeActionsFromFile()` (e.g. with `.parse()` and `.createProblem()`) actually correct?**
  _`executeActionsFromFile()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Print a summary of all features and their status.` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._