# Context Gaps — Life Phases Overhaul

## Gap Analysis

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| LifePhase type definition | ✅ Have | src/lib/riverMath.ts | Already in INITIAL_PROMPT |
| PhaseFormDialog source | ✅ Have | src/components/life-river/phase-form-dialog.tsx | Can paste on request |
| PhaseCard source | ✅ Have | src/components/life-river/PhaseCard.tsx | Can paste on request |
| LifePage source | ✅ Have | src/features/warmth/LifePage.tsx | Can paste on request |
| RiverMap source | ✅ Have | src/components/life-river/RiverMap.tsx | Can paste on request |
| TodayTributary source | ✅ Have | src/components/life-river/TodayTributary.tsx | Can paste on request |
| WarmCard component | ✅ Have | src/features/warmth/WarmCard.tsx | Can paste on request |
| lifePhase IPC handlers | ⚠️ Partial | src/main.ts | Need to fetch specific handlers |
| Memories hook | ✅ Have | src/features/memories/useMemories.ts | Can paste on request |
| Goals hook | ✅ Have | src/hooks/useFocusGoals.ts | Can paste on request |
| Covenant hook | ✅ Have | src/features/covenant/useCovenant.ts | Can paste on request |
| Design tokens | ✅ Have | index.css, tailwind.config | Can paste on request |
| External activities IPC | ⚠️ Partial | src/main.ts | Need to fetch specific handlers |
| Focus groups data | ⚠️ Partial | src/features/focus/ | Can fetch on request |
| Finance data | ⚠️ Partial | src/components/finance/ | Can fetch on request |
| Sleep data | ⚠️ Partial | src/pages/ExternalPage.tsx | Can fetch on request |
| Productivity data | ⚠️ Partial | src/pages/ProductivityPage.tsx | Can fetch on request |
| AI usage data | ⚠️ Partial | src/pages/IDEProjectsPage.tsx | Can fetch on request |

## What the Specialist Already Knows (from INITIAL_PROMPT)

- App overview (DeskFlow, Electron + React + SQLite)
- LifePhase type fields
- 8 categories
- Current feature state (PhaseFormDialog is basic, PhaseCard has h-36 header)
- All connected features (goals, memories, activities, etc.)
- Design system (dark mode, glass-morphism, warmth-serif)

## What the Specialist Needs to Ask For

1. **PhaseFormDialog source** — to understand current field layout
2. **PhaseCard source** — to understand current visualization
3. **LifePage source** — to understand how components connect
4. **WarmCard source** — to understand the glass card pattern
5. **Backend IPC handlers** — to know what data is available
6. **Memory hook** — to know how memories are fetched
7. **Goal hook** — to know how goals are fetched
