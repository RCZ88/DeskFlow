# CONTEXT GAPS — Life Interconnected River

> Gap analysis: what the Specialist has vs. what is missing. Updated after each round.
> **Rule:** every gap the Specialist needs is fetched via `REQUEST:` / `CONTEXT:` exchange.

## Context Gap Table

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| Project overview + design system | ✅ Have | CONTEXT_BUNDLE.md §0-1 | Embedded |
| LifePage host (3-tab structure) | ✅ Have | CONTEXT_BUNDLE.md §2 | Embedded verbatim |
| Covenant sub-feature (page, hook, storage, streak, colors) | ✅ Have | CONTEXT_BUNDLE_PART_2 | Embedded verbatim |
| Memories sub-feature (page, hook, IndexedDB store, cards/reel/reveal) | ✅ Have | CONTEXT_BUNDLE_PART_3 | Embedded verbatim |
| River of Years UI (LifeRiver, RiverCanvas, drawers, dialogs, flows) | ✅ Have | CONTEXT_BUNDLE_PART_4 | Embedded verbatim |
| riverMath.ts (types, PHASE_CATEGORIES, timeToX, reachHeight) | ✅ Have | CONTEXT_BUNDLE_PART_4 §4.1 | Embedded verbatim |
| useLifePhases hook (all IPC wrappers) | ✅ Have | CONTEXT_BUNDLE_PART_4 §4.2 | Embedded verbatim |
| life_phases + life_timeline_meta DB schema | ✅ Have | CONTEXT_BUNDLE_PART_5 §5.1 | Embedded verbatim |
| All 8 lifePhase IPC handlers | ✅ Have | CONTEXT_BUNDLE_PART_5 §5.3 | Embedded verbatim |
| Preload bridge (8 lifePhase methods) | ✅ Have | CONTEXT_BUNDLE_PART_5 §5.4 | Embedded verbatim |
| Routing (App.tsx /life) | ✅ Have | CONTEXT_BUNDLE_PART_5 §5.6 | Embedded |
| GoldPage.tsx FULL source (1303 lines) | ⚠️ Partial | Part 5 §5.5 = structure only | `REQUEST: src/features/warmth/gold/GoldPage.tsx` |
| Covenant leaf components (CommitmentCard, NewCommitmentModal, JournalDrawer, ReflectionPromptCard, ReflectionEcho, ConstellationHero, GraceResetMoment, MilestoneCelebration) | ❌ Missing (summarized) | src/features/covenant/ | REQUEST by path (Part B inventory) |
| Memories leaf components (MemoryUploader, RecapPlayer, PersonChip, videoThumbnail) | ❌ Missing (summarized) | src/features/memories/ | REQUEST by path (Part B inventory) |
| useLongTermGoals / goalSchema / goal IPC handlers | ❌ Missing | src/features/warmth/gold/ + main.ts | REQUEST by path |
| useCommitmentDetection (auto-detection from tracked apps) | ❌ Missing | src/features/covenant/ | REQUEST by path |
| prompts.ts (reflection prompt packs) | ❌ Missing | src/features/covenant/ | REQUEST by path |
| CSS utilities (warmth-aurora, warmth-serif, ws-scroll) | ⚠️ Partial (named) | src/index.css | REQUEST |
| Gold page goal CRUD IPC handlers (get-longterm-goals, save-goal, etc.) | ❌ Missing | src/main.ts | REQUEST (large — offer summary first) |
| App.tsx sidebar/full routing | ✅ Have (excerpt) | Part 5 §5.6 | Enough for this scope |

## Known Gaps by Design (NOT fetchable)

- Covenant/Memories have NO backend — localStorage/IndexedDB only. Any design that needs server-side storage must be flagged as a backend addition in the RESULT.md Backend Audit.
- `callLLM` internals (main.ts) — internal helper used by aiReflect/aiEraTrends/aiSummarize; exists and works; no need to inspect for UI work.
- The tracker/finance/terminal engines — out of scope, not fetched.

## Things the Specialist MUST NOT Assume

- Do NOT assume a toast/sonner library exists (it doesn't — LifeRiver uses hand-rolled fixed divs).
- Do NOT assume radix primitives are installed (base-ui is used instead).
- Do NOT use lucide icons `Loader2`/`Globe2` (don't exist — use `LoaderCircle`/`Globe`).
- Do NOT assume `groupByMonth`/other helpers exist outside what's embedded — ask.
