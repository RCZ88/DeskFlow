# DeskFlow Cycle Archive

- Cycle 52: AI Assistant diagnostic fixes (Cloudflare parseResponse + digest reason UI)
- Cycle 68: Fixed 3 IDE Projects page bugs — delete (overview query missing WHERE deleted_at IS NULL), selection highlight (persistent indigo state on quick-add buttons), multi-select (toggle Set<string> + batch add all selected)
- Cycle 69: Fixed AI Sync — fire-and-forget IIFE → await real results, progress throttling (100ms), auto-detect DB wipe and invalidate mtime cache
- Cycle 74: AICityscape v2 Phase A — buildScene.ts + InstancedBuildings.tsx created; CityScene rewired to use InstancedBuildings, removed GLBBuildings/InstanceBuildings/RoadGrid/TrafficCars; always uses RoadNetwork/TrafficCarsV2 (grid fallback dead)
- Cycle 78: AICityscape v2 GodMode — dropped cityGen.ts v3 + buildScene.ts v2; wired ViaductPillars/ViaductRamps/SidewalkFurniture/ParkedCars; HDR sky fixed; green buildings tinted; viaduct decks as BoxGeometry; TrafficLights/Parks updated for new types
- Cycle 73: Built 6 Learn UI components (CitationChip, MasteryRing, TutorPanel, SelectionFloatingPill, CurriculumGraph, WidgetHost), updated BlockRenderer/LearnPage, full build OK, /learn route verified in running app
- Cycle 69 (2026-06-29): Implemented + verified Backup & Restore service — backup:create/list/restore/exportJSON/exportCSV IPC handlers, preload bridge, startup backup, before-quit handler. Fixed db.backup() → WAL+fs.copyFileSync() for Windows.
- Cycle 53b: Prompt composition — scope block + assembleContext IPC (F-M8 + F-M7)
- Cycle 54: Finance multi-select QoL — CONTEXT_BUNDLE.md + prompt.md created for Architect
- Cycle 59: Fixed checkbox visibility (absolute positioning, group class on date header) + implemented drag-to-select
- Cycle 55: Lyceum "Learn" module Phase 1 complete (schema→validator→DB→services→IPC→UI→App routing)
- Cycle 56: Added `finance:batch-update-category` IPC handler in main.ts for batch recategorize
- Cycle 57: Fixed Lyceum Learn module bootstrap (3 bugs: wrong import paths, duplicate IPC handler, missing ajv-formats dep, missing migration SQL file in build)
- Cycle 58: OPTIMIZE.md T12–T14 — TerminalWindow/TerminalPage leak cleanup, idle passive-active category guard, game tracking keepalive debug logs + dead KNOWN_GAME_APPS removal
- Cycle 60: Critique M0+M1 — workspace sidebar image analysis tool (vision sidecar + IPC + UI + workspace group)
- Cycle 61: Generated Architect prompt for AI Assistant full fix — dual provider path consolidation, APM-grade logging, diagnostic UI, error propagation, all AI features end-to-end
- Cycle 62: Implemented RESULT-learn-onboarding-import.md — resources/, build.mjs, 4 IPC handlers, 4 preload bindings, OnboardingPanel, ValidationReport, LearnPage rewrite
- Cycle 63: Smart Gap Fill — GapPredictorPanel replacing GapPanel, predict-gap-fill/confirm-gap-fill/predict-day-gaps IPC handlers + preload bindings; Typical Day chart tooltip right-side position fix, hour labels in AM/PM format
CYCLE 66 (2026-06-29): Verified F1-F10 in running app — all PASS. Fixed missing providerLog.cjs shim in build.mjs.
- Cycle 71 (2026-06-29): Direct bugfix — removed GapFillDrawer from InsightsPage (popping up on cell clicks), fixed tooltip positioning to use mouse cursor coords.
CYCLE 71 (continued): Applied ai_digest_fix_patch changes � maxTokens 400?2000, stronger anti-preamble prompt. callProvider.ts/router.ts identical. Build OK.
- Cycle 72 (2026-06-29): IDE Projects page scroll + project-list refresh fixes (removed LIMIT 10, fixed loadOverview setTimeout all-period, added overflow-y-auto, debug logging)
