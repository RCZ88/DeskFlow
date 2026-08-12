# Context Gaps — Life River Overhaul

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| VoiceInputWrapper.tsx full source | ❌ Missing | src/components/VoiceInputWrapper.tsx (500 lines) | Agent must fetch — shows how cloneElement wraps inputs |
| useVoiceInput.ts hook source | ❌ Missing | src/hooks/useVoiceInput.ts (553 lines) | Agent must fetch — alternative hook-based voice pattern |
| GoldPage.tsx full source | ❌ Missing | src/features/warmth/gold/GoldPage.tsx | Agent must fetch — shows LTG CRUD, memory upload, journal |
| CovenantPage.tsx full source | ❌ Missing | src/features/covenant/CovenantPage.tsx | Agent must fetch — shows commitment CRUD, completion tracking |
| useCovenant.ts hook | ❌ Missing | src/features/covenant/useCovenant.ts | Agent must fetch — commitment/completion data shape |
| useMemories.ts hook | ❌ Missing | src/features/memories/useMemories.ts | Agent must fetch — memory data shape, upload flow |
| goals table schema | ❌ Missing | src/main.ts ~line 2775 | Agent must fetch — LTG fields, period='longterm' filter |
| PhaseCard.tsx edit button flow | ⚠️ Partial | Embedded in CONTEXT_BUNDLE.md | PhaseCard has edit button → opens PhaseFormDialog |
| PhaseDrawer.tsx quick-edit | ⚠️ Partial | 409 lines, not embedded | Shows inline edit for milestones, connections, color |
| DB migration for draft status | ❌ Missing | Would need new column on life_phases | Agent must flag — needs `status TEXT DEFAULT 'complete'` |
| today's edge / covenant data flow | ⚠️ Partial | CoreSample computes grainByPhase | Shows how covenant maps to ring visualization |
