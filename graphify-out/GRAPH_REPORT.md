# Graph Report - .  (2026-06-16)

## Corpus Check
- 206 files · ~4,214,736 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1317 nodes · 1925 edges · 49 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 294 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 72|Community 72]]

## God Nodes (most connected - your core abstractions)
1. `run()` - 40 edges
2. `ProblemsService` - 23 edges
3. `WorkspaceRegistryService` - 23 edges
4. `AgentHostService` - 22 edges
5. `RequestsService` - 20 edges
6. `RAGService` - 18 edges
7. `setHours()` - 16 edges
8. `assembleContext()` - 15 edges
9. `readFile()` - 14 edges
10. `executeActionsFromFile()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `beep()` --calls--> `run()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\complete.py → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\test\gameDetection.bench.ts
- `speak()` --calls--> `init()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\complete.py → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\BrowserActivityPage.tsx
- `speak()` --calls--> `run()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\complete.py → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\test\gameDetection.bench.ts
- `refresh()` --calls--> `catch()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\agent\backups\TerminalPage_2026-06-05_010713.tsx → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\IDEProjectsPage.tsx
- `computeDateRange()` --calls--> `setHours()`  [INFERRED]
  C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\agent\docs\ui-redesign-analytics-ai-tools\main_backend.ts → C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\DurationPicker.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (104): run(), acquireLock(), acquireLock(), addLog(), backfillStatsTables(), broadcast(), build(), buildHourlyHeatmap() (+96 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (71): addLog(), broadcast(), build(), buildHourlyHeatmap(), calculateCost(), calculateProductivityScore(), callOpenRouter(), categorizeApp() (+63 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (19): loadSkills(), async(), handleCreate(), handleDelete(), handleSubmit(), handleUpdate(), handleUse(), showNotify() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (36): cleanCorruptedData(), clearToday(), confirmSleepDetection(), dismissSleepDetection(), formatTimeFromHours(), getTotalTime(), handleActivity(), handleFocus() (+28 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (38): main(), parseArgs(), readActions(), writeActions(), executeGoalAction(), findGoalByTitle(), formatGeneralResponse(), formatGoalCreated() (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (19): sendFeedback(), handleSaveNotes(), handleSubmit(), executeActionsFromFile(), getProblemsService(), getProjectPath(), getRequestsService(), logActivity() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (5): CompactionService, DefaultLLMProvider, ContextAssemblyService, ProjectContextService, RAGService

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (21): async(), formatCurrency(), formatTokens(), getAgentDisplayName(), getLabel(), getMetricValue(), handleAddProject(), handleClickOutside() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (14): adjustColor(), animateCamera(), calculateAngularSpeed(), calculateOrbitalPeriod(), computePlanets(), focusOnPlanet(), getPlanetColorByOrbit(), handleCategorySelect() (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (7): async(), formatDuration(), formatHours(), localDateStr(), pad(), toLocal(), toLocal()

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (3): runInitAll(), runInitAll(), ProblemsService

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (3): AgentHostService, handleTerminalCreated(), handleTerminalCreated()

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (1): WorkspaceRegistryService

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (4): SecurityGuard, p(), registerAll(), ToolRegistry

### Community 14 - "Community 14"
Cohesion: 0.38
Nodes (18): assembleContext(), buildAutomationsContext(), buildDeepMemoryContext(), buildDesignSkillsContext(), buildGraphifyContext(), buildLLMWikiContext(), buildParaContext(), buildQMDContext() (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (12): ensure_para_structure(), parse_problems(), Check GRAPH_REPORT.md exists and has content. Regenerate if broken., Create PARA directory structure in vault if it doesn't exist., Parse PROBLEMS.md into individual problem dicts (simple parser)., Sync project files to PARA-organized Obsidian vault., Sync graphify-out/ to Obsidian vault., rebuild_code_fix() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (7): coerceValue(), enhanceSkillWithDSL(), inferWidget(), parseFrontmatterSection(), parseSkillDSL(), parseFrontmatterList(), SkillsService

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (9): buildColorSchemeXml(), buildDesignLibraryAccessXml(), buildFullContext(), buildImportedComponentsXml(), closeBrowse(), handleAddComponent(), handleCopy(), handleSend() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (15): checkBrowserFocus(), extractDomain(), getBrowserProcessNames(), healthCheck(), identifyBrowser(), loadState(), logPreviousSession(), onStartup() (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (6): init(), beep(), main(), Play a simple system beep., Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT, speak()

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (3): fetchTypicalDay(), formatHours(), periodToDays()

### Community 21 - "Community 21"
Cohesion: 0.42
Nodes (10): buildInstalledGameIndex(), gameNameFromTitle(), isLauncherProcess(), libraryPaths(), lookupExe(), rescanGames(), resolveForegroundApp(), safeExists() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (2): handleEditBlur(), handleEditKeyDown()

### Community 23 - "Community 23"
Cohesion: 0.2
Nodes (4): async(), loadOverrides(), setEditingKeywordSets(), setLocalAppColors()

### Community 25 - "Community 25"
Cohesion: 0.27
Nodes (6): async(), handleConfigSave(), handleRefresh(), handleToggleContext(), loadContextData(), loadContexts()

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (2): handleRefresh(), handleTestStart()

### Community 28 - "Community 28"
Cohesion: 0.46
Nodes (6): fmtCost(), fmtNum(), fmtSec(), getStatusBorder(), getStatusColor(), StatCard()

### Community 29 - "Community 29"
Cohesion: 0.36
Nodes (4): callProvider(), buildChain(), callWithTokenTiers(), runWithFallback()

### Community 30 - "Community 30"
Cohesion: 0.43
Nodes (4): handleAdd(), handleDelete(), handleToggle(), loadGoals()

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (4): AiPage(), determineMode(), getDayLabel(), getToday()

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (2): useAiPageData(), useAppContext()

### Community 35 - "Community 35"
Cohesion: 0.53
Nodes (1): NotificationService

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (2): formatRelTime(), SystemToggleCard()

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (2): replaceLeafInTree(), swapLeavesInTree()

### Community 41 - "Community 41"
Cohesion: 0.5
Nodes (2): addTag(), handleTagKeyDown()

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (4): fingerprintRecord(), fingerprintRows(), hashNumber(), hashString()

### Community 43 - "Community 43"
Cohesion: 0.7
Nodes (4): extractCategory(), extractDate(), extractTitle(), parseIntent()

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (1): handler()

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (2): AfkPromptModal(), formatElapsed()

### Community 54 - "Community 54"
Cohesion: 0.83
Nodes (3): deriveStats(), fmtCost(), fmtNum()

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (2): getAesthetic(), TasteKnobs()

### Community 57 - "Community 57"
Cohesion: 0.67
Nodes (2): shallowEqual(), useStableMemo()

### Community 59 - "Community 59"
Cohesion: 0.5
Nodes (1): SessionContextService

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (2): print_summary(), Print a summary of all features and their status.

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (2): buildPrompt(), handleSend()

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (2): groupSteps(), InitializeProgressModal()

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (2): generateAllSpecsMarkdown(), generateMarkdown()

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (2): applyFilter(), sortAndGroupChecks()

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline

## Knowledge Gaps
- **10 isolated node(s):** `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Print a summary of all features and their status.`, `Print the complete restoration plan.`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (24 nodes): `WorkspaceRegistry.ts`, `WorkspaceRegistryService`, `.addPlugin()`, `.collectAllContext()`, `.defaultComposeContext()`, `.discoverFromIPC()`, `.filterWorkspaceSkills()`, `.getAllPlugins()`, `.getComposeContext()`, `.getPlugin()`, `.getPluginsByCategory()`, `.getSidebarEntries()`, `.hasPlugin()`, `.initialize()`, `.isInitialized()`, `.notify()`, `.refresh()`, `.register()`, `.registerComposeContext()`, `.size()`, `.skillToDescriptor()`, `.subscribe()`, `.unregister()`, `.unregisterComposeContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (12 nodes): `decHours()`, `decMinutes()`, `handleEditBlur()`, `handleEditChange()`, `handleEditKeyDown()`, `handleStartEdit()`, `incHours()`, `incMinutes()`, `setMinutes()`, `startHold()`, `stopHold()`, `DurationPicker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (9 nodes): `defaultConfig()`, `handleClearCache()`, `handleRefresh()`, `handleSave()`, `handleStop()`, `handleTestStart()`, `loadCurrentStatus()`, `updateSource()`, `LibraryConfigModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (6 nodes): `useAiPageData.ts`, `useAppContext.ts`, `cacheKey()`, `clearAiPageCache()`, `useAiPageData()`, `useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (6 nodes): `NotificationService`, `.initAudio()`, `.notifyAttention()`, `.notifyComplete()`, `.playBeep()`, `NotificationService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (5 nodes): `NewSessionDialog.tsx`, `checkInit()`, `estimateTokens()`, `formatRelTime()`, `SystemToggleCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (5 nodes): `createSplitFromDrag()`, `flattenPanes()`, `replaceLeafInTree()`, `swapLeavesInTree()`, `MapEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (5 nodes): `addTag()`, `handleSave()`, `handleTagKeyDown()`, `removeTag()`, `SessionEditDialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (4 nodes): `preload.ts`, `preload.js`, `handler()`, `preload.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (4 nodes): `AfkPromptModal()`, `formatElapsed()`, `formatTime()`, `AfkPromptModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (4 nodes): `TasteKnobs.tsx`, `getAesthetic()`, `SliderRow()`, `TasteKnobs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (4 nodes): `useStableMemo.ts`, `deepEqual()`, `shallowEqual()`, `useStableMemo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (4 nodes): `SessionContextService`, `.extractContext()`, `.generateBriefContext()`, `SessionContextService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (3 nodes): `feature_inventory.py`, `print_summary()`, `Print a summary of all features and their status.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (3 nodes): `buildPrompt()`, `handleSend()`, `DSLGenerationModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (3 nodes): `groupSteps()`, `InitializeProgressModal()`, `InitializeProgressModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (3 nodes): `generateAllSpecsMarkdown()`, `generateMarkdown()`, `feature-specs.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (3 nodes): `applyFilter()`, `sortAndGroupChecks()`, `checklistAlgorithm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (2 nodes): `graphify-pipeline.py`, `Graphify Pipeline for Windows Runs the full knowledge graph extraction pipeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `setHours()` connect `Community 3` to `Community 0`, `Community 1`, `Community 22`, `Community 9`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `catch()` connect `Community 3` to `Community 13`, `Community 7`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `run()` connect `Community 0` to `Community 1`, `Community 5`, `Community 6`, `Community 19`, `Community 21`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 39 inferred relationships involving `run()` (e.g. with `beep()` and `speak()`) actually correct?**
  _`run()` has 39 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Play a simple system beep.`, `Speak text using offline TTS (pyttsx3 if available).     Falls back to system TT`, `Print a summary of all features and their status.` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._