# Graph Report - .  (2026-06-07)

## Corpus Check
- 148 files · ~4,003,789 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 964 nodes · 1435 edges · 43 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 115 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 61|Community 61]]

## God Nodes (most connected - your core abstractions)
1. `ProblemsService` - 23 edges
2. `WorkspaceRegistryService` - 23 edges
3. `RequestsService` - 20 edges
4. `RAGService` - 18 edges
5. `assembleContext()` - 15 edges
6. `readFile()` - 14 edges
7. `getDay()` - 14 edges
8. `executeActionsFromFile()` - 13 edges
9. `ProjectContextService` - 13 edges
10. `parseAndExecuteActions()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `handleCreate()` --calls--> `loadSkills()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\agent\backups\TerminalPage_2026-06-05_010713.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\GeneralistDialog.tsx
- `handleUpdate()` --calls--> `loadSkills()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\agent\backups\TerminalPage_2026-06-05_010713.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\GeneralistDialog.tsx
- `handleDelete()` --calls--> `loadSkills()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\agent\backups\TerminalPage_2026-06-05_010713.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\GeneralistDialog.tsx
- `loadData()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts
- `clearToday()` --calls--> `getLogs()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\App.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\main.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (122): loadOverrides(), acquireLock(), addGap(), addIde(), addLog(), backfillStatsTables(), broadcast(), build() (+114 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (5): CompactionService, DefaultLLMProvider, ContextAssemblyService, ProjectContextService, RAGService

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (14): sendFeedback(), handleSaveNotes(), handleSubmit(), executeActionsFromFile(), getProblemsService(), getProjectPath(), getRequestsService(), logActivity() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (12): loadSkills(), async(), handleAddToProject(), handleCreate(), handleDelete(), handleSave(), handleSeedWorkspace(), handleSubmit() (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (20): formatTimeFromHours(), getTotalTime(), computeChartDateRange(), getPersistedActivityFeed(), getPersistedTimerState(), handleDayClick(), loadExternalData(), getDateRange() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (7): async(), handleCreate(), handleDelete(), handleSubmit(), handleUpdate(), handleUse(), showNotify()

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (14): adjustColor(), animateCamera(), calculateAngularSpeed(), calculateOrbitalPeriod(), computePlanets(), focusOnPlanet(), getPlanetColorByOrbit(), handleCategorySelect() (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (10): cleanCorruptedData(), clearToday(), confirmSleepDetection(), dismissSleepDetection(), handleStorage(), handleStorageChange(), handleTimerSync(), loadData() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (12): async(), handleAddProject(), handleConfirmDelete(), handlePermanentDelete(), handleRemoveProject(), handleRestoreProject(), handleSyncAI(), handleSyncGit() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (7): async(), formatDuration(), formatHours(), localDateStr(), pad(), toLocal(), toLocal()

### Community 10 - "Community 10"
Cohesion: 0.21
Nodes (1): ProblemsService

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (1): WorkspaceRegistryService

### Community 12 - "Community 12"
Cohesion: 0.38
Nodes (18): assembleContext(), buildAutomationsContext(), buildDeepMemoryContext(), buildDesignSkillsContext(), buildGraphifyContext(), buildLLMWikiContext(), buildParaContext(), buildQMDContext() (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (12): ensure_para_structure(), parse_problems(), Check GRAPH_REPORT.md exists and has content. Regenerate if broken., Create PARA directory structure in vault if it doesn't exist., Parse PROBLEMS.md into individual problem dicts (simple parser)., Sync project files to PARA-organized Obsidian vault., Sync graphify-out/ to Obsidian vault., rebuild_code_fix() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (7): coerceValue(), enhanceSkillWithDSL(), inferWidget(), parseFrontmatterSection(), parseSkillDSL(), parseFrontmatterList(), SkillsService

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (9): buildColorSchemeXml(), buildDesignLibraryAccessXml(), buildFullContext(), buildImportedComponentsXml(), closeBrowse(), handleAddComponent(), handleCopy(), handleSend() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.27
Nodes (15): checkBrowserFocus(), extractDomain(), getBrowserProcessNames(), healthCheck(), identifyBrowser(), loadState(), logPreviousSession(), onStartup() (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (6): init(), beep(), main(), Play a simple system beep., Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT, speak()

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (9): main(), parseArgs(), readActions(), writeActions(), AIService, callOpenRouter(), cleanAIJson(), parseAIJson() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (1): formatHours()

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (2): handleEditBlur(), handleEditKeyDown()

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (4): async(), loadOverrides(), setEditingKeywordSets(), setLocalAppColors()

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (6): async(), handleConfigSave(), handleRefresh(), handleToggleContext(), loadContextData(), loadContexts()

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (2): handleRefresh(), handleTestStart()

### Community 26 - "Community 26"
Cohesion: 0.36
Nodes (4): callProvider(), buildChain(), callWithTokenTiers(), runWithFallback()

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (2): getStatusBorder(), getStatusColor()

### Community 28 - "Community 28"
Cohesion: 0.38
Nodes (4): handleAdd(), handleImport(), handleKeyDown(), isValidHex()

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (2): formatRelTime(), SystemToggleCard()

### Community 32 - "Community 32"
Cohesion: 0.6
Nodes (3): handleSuggest(), loadGoals(), toggleGoal()

### Community 35 - "Community 35"
Cohesion: 0.5
Nodes (2): replaceLeafInTree(), swapLeavesInTree()

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (2): addTag(), handleTagKeyDown()

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (4): fingerprintRecord(), fingerprintRows(), hashNumber(), hashString()

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (2): AfkPromptModal(), formatElapsed()

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (2): getAesthetic(), TasteKnobs()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (2): shallowEqual(), useStableMemo()

### Community 48 - "Community 48"
Cohesion: 0.5
Nodes (1): SessionContextService

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (2): print_summary(), Print a summary of all features and their status.

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (2): print_plan(), Print the complete restoration plan.

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (1): handler()

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (2): buildPrompt(), handleSend()

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (2): groupSteps(), InitializeProgressModal()

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (2): applyFilter(), sortAndGroupChecks()

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (1): Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline

## Knowledge Gaps
- **10 isolated node(s):** `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Print a summary of all features and their status.`, `Print the complete restoration plan.`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (24 nodes): `ProblemsService.js`, `ProblemsService`, `.addCheck()`, `.addCheckFeedback()`, `.completeCheck()`, `.constructor()`, `.createProblem()`, `.deleteProblem()`, `.ensureAgentDir()`, `.getDefaultBaseDir()`, `.getNextIssueNumber()`, `.getProblem()`, `.getProblems()`, `.getProjectId()`, `.getProjectPath()`, `.migrateFromMd()`, `.parseProblemsLegacy()`, `.setProjectId()`, `.updateCheck()`, `.updateProblem()`, `.updateStatus()`, `.writeJson()`, `.writeMarkdown()`, `ProblemsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (24 nodes): `WorkspaceRegistry.ts`, `WorkspaceRegistryService`, `.addPlugin()`, `.collectAllContext()`, `.defaultComposeContext()`, `.discoverFromIPC()`, `.filterWorkspaceSkills()`, `.getAllPlugins()`, `.getComposeContext()`, `.getPlugin()`, `.getPluginsByCategory()`, `.getSidebarEntries()`, `.hasPlugin()`, `.initialize()`, `.isInitialized()`, `.notify()`, `.refresh()`, `.register()`, `.registerComposeContext()`, `.size()`, `.skillToDescriptor()`, `.subscribe()`, `.unregister()`, `.unregisterComposeContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (12 nodes): `InsightsPage.tsx`, `cellBg()`, `CircularGauge()`, `fetchTypicalDay()`, `fmt()`, `formatDuration()`, `formatHours()`, `GoalStreak()`, `resolveActivityColor()`, `statusColor()`, `statusLabel()`, `InsightsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (12 nodes): `decHours()`, `decMinutes()`, `handleEditBlur()`, `handleEditChange()`, `handleEditKeyDown()`, `handleStartEdit()`, `incHours()`, `incMinutes()`, `setMinutes()`, `startHold()`, `stopHold()`, `DurationPicker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (9 nodes): `defaultConfig()`, `handleClearCache()`, `handleRefresh()`, `handleSave()`, `handleStop()`, `handleTestStart()`, `loadCurrentStatus()`, `updateSource()`, `LibraryConfigModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (7 nodes): `fmtCost()`, `fmtNum()`, `fmtSec()`, `getStatusBorder()`, `getStatusColor()`, `StatCard()`, `AnalyticsDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (5 nodes): `NewSessionDialog.tsx`, `checkInit()`, `estimateTokens()`, `formatRelTime()`, `SystemToggleCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (5 nodes): `createSplitFromDrag()`, `flattenPanes()`, `replaceLeafInTree()`, `swapLeavesInTree()`, `MapEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (5 nodes): `addTag()`, `handleSave()`, `handleTagKeyDown()`, `removeTag()`, `SessionEditDialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (4 nodes): `AfkPromptModal()`, `formatElapsed()`, `formatTime()`, `AfkPromptModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (4 nodes): `TasteKnobs.tsx`, `getAesthetic()`, `SliderRow()`, `TasteKnobs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (4 nodes): `useStableMemo.ts`, `deepEqual()`, `shallowEqual()`, `useStableMemo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (4 nodes): `SessionContextService`, `.extractContext()`, `.generateBriefContext()`, `SessionContextService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (3 nodes): `feature_inventory.py`, `print_summary()`, `Print a summary of all features and their status.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (3 nodes): `restoration_plan.py`, `print_plan()`, `Print the complete restoration plan.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (3 nodes): `preload.js`, `handler()`, `preload.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (3 nodes): `buildPrompt()`, `handleSend()`, `DSLGenerationModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `groupSteps()`, `InitializeProgressModal()`, `InitializeProgressModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (3 nodes): `applyFilter()`, `sortAndGroupChecks()`, `checklistAlgorithm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (2 nodes): `graphify-pipeline.py`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `executeActionsFromFile()` connect `Community 2` to `Community 0`, `Community 10`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `getSystemInfo()` connect `Community 12` to `Community 0`, `Community 14`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `setHours()` connect `Community 4` to `Community 0`, `Community 9`, `Community 20`, `Community 7`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Print a summary of all features and their status.` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._