# AI Assistant Page — Full Interactive System (Phase 5)

The `/ai` page is now wired end-to-end to its real backend. Concept: **the Command Deck** —
the assistant is a universal command line, and every structured reply renders as an
interactive instrument card that shares the page's visual DNA (glass surfaces, accent bars,
transform/opacity-only motion, cubic-bezier(0.16,1,0.3,1), p-5 / rounded-xl, zinc-950, no shadow).

## NEW FILES

### Chat engine
- `src/hooks/useAiChat.ts` — the whole chat controller. Loads today's thread on mount
  (`aiChatLoad`), selects the enabled provider + routing default, prepends the live context
  bundle as a system message, calls `providerChatCall`, streams via `onProviderChunk`
  (delta accumulation + typewriter), parses `parsed_json` on completion, persists every turn
  (including `parsed_json`) via `aiChatSave`, with a 60s watchdog + stop/reset.
- `src/services/aiContextBundle.ts` — `PAGE_CATALOG` (every app page + the structured-output
  contract the model must follow) and `buildContextBundle()` which assembles a live snapshot
  from `getGoals`, `getLongtermGoals`, `getGoalContext`, `getDashboardAggregates`,
  `getAIUsageSummary`, `getProjects`, `readPlanningMd` (parallel, clipped, failure-safe).

### Structured-output rendering
- `src/components/ai/chat/parsed.ts` — the 10-type `ParsedMessage` union + `CardAction`
  union, `parseAssistantContent()` (extracts JSON payloads from replies), `serializeParsed()`,
  `accentForType()`, `formatStat()`.
- `src/components/ai/chat/ParsedMessageRouter.tsx` — switches on `parsed.type` → renderer;
  plain text falls back to the normal bubble.
- `src/components/ai/chat/renderers/` — one renderer per type:
  `CardShell`, `GoalSuggestionCard`, `PlanUpdateCard`, `StatsSummaryCard`, `ActionListCard`,
  `DigestTopicCard`, `ConnectorStatusCard`, `FormFillCard`, `ChartDataCard` (dependency-free
  SVG — bar/line/pie, no Chart.js), `ErrorCard`.

## MODIFIED FILES
- `src/components/ai/chat/MessageBubble.tsx` — detects `parsed` payloads and delegates to
  `ParsedMessageRouter` (full-width cards); keeps prose bubble + typewriter for plain text.
- `src/components/ai/chat/ChatPanel.tsx` — `ChatMessage` gains `parsed?`; new props
  `input`/`onInputChange`/`onStop`/`onReset`/`onCardAction`/`actionResults`/`connectorSyncing`;
  pinned-to-bottom auto-scroll; clear-thread button.
- `src/pages/AiPage.tsx`:
  - Replaced the dead `chatMessages`/`handleChatSend` stub with the `useAiChat` hook, wired
    into `<ChatPanel>` (real `input`, `onInputChange`, `onSend`, `onStop`, `onReset`, provider badge).
  - Added `onCardAction` dispatcher: `accept-goal`→`saveGoal`, `apply-plan`→`saveGoalsBatch`,
    `run-ipc`→dynamic IPC + inline result state, `submit-form`→re-sends into chat,
    `sync-connector`→connector sync, `open-url`, `send-text`, `retry`.
  - `handleAnalyzeDump` now calls `parseGoalDump` (was `return []`); `handleSaveGoals` now
    calls `saveGoalsBatch` + reloads (was `console.log`).
  - `DailyDigestBoard` now receives `onGenerate` (was missing / dead button).
  - `ReflectFeed` now loads a 7-day history via `getGoalsBatch` instead of a single day.

## DELETED
- `src/components/SummaryGrid.tsx` — dead duplicate (the live one is
  `src/components/ai/summary/SummaryGrid.tsx`). Verified nothing imported the dead copy.

## CONSTRAINTS HONORED
- No existing IPC handler was modified. Existing `parsed_json` column reused.
- CRLF preserved on `main.ts`; dark-only; p-5 / rounded-xl max; no box-shadow; no spring;
  transform+opacity only; no pure black.

## ⚠️ NEEDS YOUR CALL — `save-goal-review` bug (NOT changed)
You flagged `save-goal-review` (main.ts) as writing to the wrong table. I did **not** touch it
because Constraint #1 says do not modify existing IPC handlers. The handler at the
`ipcMain.handle('save-goal-review', ...)` line is the one to review. Tell me if you want me to
patch it and I will.

## VERIFY LOCALLY
This bundle is the `src/` tree only (no node_modules / tsconfig were uploaded), so run
`tsc --noEmit` / your build in your real repo to confirm against your dependency types.
