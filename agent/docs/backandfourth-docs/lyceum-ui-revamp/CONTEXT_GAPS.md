# Context Gap Analysis — Lyceum UI Revamp

## What We Have

| Context | Status | Location |
|---------|--------|----------|
| Tailwind v4 tokens | ✅ Have | src/index.css (@theme block) |
| Lyceum feature CSS | ✅ Have | src/styles/lyceum-learn-features.css |
| Warmth tokens | ✅ Have | src/features/warmth/warmth-tokens.css |
| Warm wood CSS | ✅ Have | agent/docs/lyceum-learn-v2/lyceum-editorial.css |
| Book cloth colors | ✅ Have | BookCard.tsx CLOTHS array |
| Mastery level colors | ✅ Have | useMasteryStats.ts LEVEL_COLORS |
| Motion presets | ✅ Have | motion.ts (lift, springy, tap, fadeSlide) |
| LearnPage.tsx (view router) | ✅ Have | 763 lines |
| LessonLibrary.tsx | ✅ Have | 140 lines |
| BookCard.tsx | ✅ Have | 127 lines |
| ReaderView.tsx | ✅ Have | 331 lines |
| BlockRenderer.tsx (27 types) | ✅ Have | 131 lines |
| .lmd parser | ✅ Have | parseLessonMarkdown.ts (479 lines) |
| IPC endpoints (30+) | ✅ Have | services/learn/index.ts |
| Preload bridge | ✅ Have | src/preload.ts lines 1037-1090 |
| DB schema (5 migrations) | ✅ Have | db/migrations/ |
| FlashcardBlock component | ✅ Have | blocks/FlashcardBlock.tsx |
| HeatmapBlock component | ✅ Have | blocks/HeatmapBlock.tsx |
| ConceptMapBlock component | ✅ Have | blocks/ConceptMapBlock.tsx |
| LayerRevealBlock component | ✅ Have | blocks/LayerRevealBlock.tsx |
| FSRS flashcard service | ✅ Have | services/flashcard.service.ts |
| TutorPanel | ✅ Have | TutorPanel.tsx (459 lines) |
| SelectionActions | ✅ Have | SelectionActions.tsx (265 lines) |

## Backend Gap Flags

1. **Expansion blocks (`is_expansion`):** No DB column or schema for this yet. The `learn:createProposal` / `learn:decideProposal` IPC exists but stores proposals, not expansion tags on blocks. **Backend gap — needs new migration or metadata column.**

2. **Heatmap data source:** `learn:getStudyHeatmap` reads from `learn_sessions` table. This table exists but may be empty if no sessions have been tracked. **Backend gap — sessions need to be recorded.**

3. **Flashcard due cards:** `learn:getDueCards` reads from `learn_cards` table. This table exists but cards need to be generated first via `learn:generateCards`. **Backend gap — no auto-generation on lesson import.**
