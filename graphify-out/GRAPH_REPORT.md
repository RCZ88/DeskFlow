# Graph Report - .  (2026-06-06)

## Corpus Check
- 136 files · ~3,926,033 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 913 nodes · 1372 edges · 36 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]

## God Nodes (most connected - your core abstractions)
1. `ProblemsService` - 23 edges
2. `WorkspaceRegistryService` - 23 edges
3. `RequestsService` - 20 edges
4. `RAGService` - 18 edges
5. `assembleContext()` - 15 edges
6. `readFile()` - 14 edges
7. `executeActionsFromFile()` - 13 edges
8. `ProjectContextService` - 13 edges
9. `parseAndExecuteActions()` - 12 edges
10. `setHours()` - 11 edges

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
Cohesion: 0.04
Nodes (112): acquireLock(), addGap(), addIde(), addLog(), backfillStatsTables(), broadcast(), build(), buildHourlyHeatmap() (+104 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (15): loadSkills(), async(), handleCreate(), handleDelete(), handleSubmit(), handleUpdate(), handleUse(), showNotify() (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (26): main(), parseArgs(), readActions(), writeActions(), cleanCorruptedData(), clearToday(), confirmSleepDetection(), dismissSleepDetection() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (5): CompactionService, DefaultLLMProvider, ContextAssemblyService, ProjectContextService, RAGService

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (13): sendFeedback(), handleSaveNotes(), handleSubmit(), executeActionsFromFile(), getProblemsService(), getProjectPath(), getRequestsService(), logActivity() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (14): formatTimeFromHours(), getTotalTime(), computeChartDateRange(), getPersistedActivityFeed(), getPersistedTimerState(), handleDayClick(), loadExternalData(), getDateRange() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (14): adjustColor(), animateCamera(), calculateAngularSpeed(), calculateOrbitalPeriod(), computePlanets(), focusOnPlanet(), getPlanetColorByOrbit(), handleCategorySelect() (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (12): handleAddProject(), handleConfirmDelete(), handlePermanentDelete(), handleRemoveProject(), handleRestoreProject(), handleScan(), handleSyncAI(), handleSyncGit() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (2): runInitAll(), ProblemsService

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (7): async(), formatDuration(), formatHours(), localDateStr(), pad(), toLocal(), toLocal()

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (1): WorkspaceRegistryService

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (9): handleSendChat(), loadJson(), AIService, callOpenRouter(), cleanAIJson(), fallbackParseDailyBrief(), fallbackParsePatternAnalysis(), fallbackParseSleepAnalysis() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (12): ensure_para_structure(), parse_problems(), Check GRAPH_REPORT.md exists and has content. Regenerate if broken., Create PARA directory structure in vault if it doesn't exist., Parse PROBLEMS.md into individual problem dicts (simple parser)., Sync project files to PARA-organized Obsidian vault., Sync graphify-out/ to Obsidian vault., rebuild_code_fix() (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.38
Nodes (18): assembleContext(), buildAutomationsContext(), buildDeepMemoryContext(), buildDesignSkillsContext(), buildGraphifyContext(), buildLLMWikiContext(), buildParaContext(), buildQMDContext() (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (7): coerceValue(), enhanceSkillWithDSL(), inferWidget(), parseFrontmatterSection(), parseSkillDSL(), parseFrontmatterList(), SkillsService

### Community 15 - "Community 15"
Cohesion: 0.27
Nodes (15): checkBrowserFocus(), extractDomain(), getBrowserProcessNames(), healthCheck(), identifyBrowser(), loadState(), logPreviousSession(), onStartup() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (6): init(), beep(), main(), Play a simple system beep., Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT, speak()

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (1): formatHours()

### Community 19 - "Community 19"
Cohesion: 0.27
Nodes (6): async(), handleConfigSave(), handleRefresh(), handleToggleContext(), loadContextData(), loadContexts()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (2): getStatusBorder(), getStatusColor()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (2): formatRelTime(), SystemToggleCard()

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (2): replaceLeafInTree(), swapLeavesInTree()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (2): addTag(), handleTagKeyDown()

### Community 30 - "Community 30"
Cohesion: 0.6
Nodes (3): handleAdd(), handleKeyDown(), isValidHex()

### Community 31 - "Community 31"
Cohesion: 0.6
Nodes (3): buildColorSchemeXml(), buildFullContext(), readFileContent()

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (2): AfkPromptModal(), formatElapsed()

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (2): getAesthetic(), TasteKnobs()

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (2): shallowEqual(), useStableMemo()

### Community 41 - "Community 41"
Cohesion: 0.5
Nodes (1): SessionContextService

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (2): print_summary(), Print a summary of all features and their status.

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (2): print_plan(), Print the complete restoration plan.

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (1): handler()

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (2): buildPrompt(), handleSend()

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (2): groupSteps(), InitializeProgressModal()

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (2): applyFilter(), sortAndGroupChecks()

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline

## Knowledge Gaps
- **10 isolated node(s):** `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Print a summary of all features and their status.`, `Print the complete restoration plan.`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 8`** (25 nodes): `ProblemsService.js`, `runInitAll()`, `ProblemsService`, `.addCheck()`, `.addCheckFeedback()`, `.completeCheck()`, `.constructor()`, `.createProblem()`, `.deleteProblem()`, `.ensureAgentDir()`, `.getDefaultBaseDir()`, `.getNextIssueNumber()`, `.getProblem()`, `.getProblems()`, `.getProjectId()`, `.getProjectPath()`, `.migrateFromMd()`, `.parseProblemsLegacy()`, `.setProjectId()`, `.updateCheck()`, `.updateProblem()`, `.updateStatus()`, `.writeJson()`, `.writeMarkdown()`, `ProblemsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (24 nodes): `WorkspaceRegistry.ts`, `WorkspaceRegistryService`, `.addPlugin()`, `.collectAllContext()`, `.defaultComposeContext()`, `.discoverFromIPC()`, `.filterWorkspaceSkills()`, `.getAllPlugins()`, `.getComposeContext()`, `.getPlugin()`, `.getPluginsByCategory()`, `.getSidebarEntries()`, `.hasPlugin()`, `.initialize()`, `.isInitialized()`, `.notify()`, `.refresh()`, `.register()`, `.registerComposeContext()`, `.size()`, `.skillToDescriptor()`, `.subscribe()`, `.unregister()`, `.unregisterComposeContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (11 nodes): `InsightsPage.tsx`, `cellBg()`, `CircularGauge()`, `fmt()`, `formatDuration()`, `formatHours()`, `GoalStreak()`, `resolveActivityColor()`, `statusColor()`, `statusLabel()`, `InsightsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (7 nodes): `fmtCost()`, `fmtNum()`, `fmtSec()`, `getStatusBorder()`, `getStatusColor()`, `StatCard()`, `AnalyticsDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (5 nodes): `NewSessionDialog.tsx`, `checkInit()`, `estimateTokens()`, `formatRelTime()`, `SystemToggleCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (5 nodes): `createSplitFromDrag()`, `flattenPanes()`, `replaceLeafInTree()`, `swapLeavesInTree()`, `MapEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (5 nodes): `addTag()`, `handleSave()`, `handleTagKeyDown()`, `removeTag()`, `SessionEditDialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (4 nodes): `AfkPromptModal()`, `formatElapsed()`, `formatTime()`, `AfkPromptModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (4 nodes): `TasteKnobs.tsx`, `getAesthetic()`, `SliderRow()`, `TasteKnobs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (4 nodes): `useStableMemo.ts`, `deepEqual()`, `shallowEqual()`, `useStableMemo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (4 nodes): `SessionContextService`, `.extractContext()`, `.generateBriefContext()`, `SessionContextService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (3 nodes): `feature_inventory.py`, `print_summary()`, `Print a summary of all features and their status.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (3 nodes): `restoration_plan.py`, `print_plan()`, `Print the complete restoration plan.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (3 nodes): `preload.js`, `handler()`, `preload.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `buildPrompt()`, `handleSend()`, `DSLGenerationModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (3 nodes): `groupSteps()`, `InitializeProgressModal()`, `InitializeProgressModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (3 nodes): `applyFilter()`, `sortAndGroupChecks()`, `checklistAlgorithm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `graphify-pipeline.py`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `executeActionsFromFile()` connect `Community 4` to `Community 0`, `Community 8`, `Community 2`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `setHours()` connect `Community 5` to `Community 0`, `Community 9`, `Community 2`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `getSystemInfo()` connect `Community 13` to `Community 2`, `Community 14`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Print a summary of all features and their status.` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._