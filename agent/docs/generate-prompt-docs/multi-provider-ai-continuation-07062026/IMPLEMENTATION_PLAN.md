# Implementation Plan — Multi-Provider AI Continuation

## Phase 4 — Backend Audit Table

| Feature | IPC Channel | Handler Exists? | Service Class | DB Schema | Status |
|---|---|---|---|---|---|
| planning.md read | `read-planning-md` | ❌ NEW | N/A (fs) | N/A (file) | **New** |
| planning.md write | `write-planning-md` | ❌ NEW | N/A (fs) | N/A (file) | **New** |
| Goal context (stats) | `get-goal-context` | ❌ NEW | N/A (inline) | ✅ `logs`, `stats_daily` | **New** |
| Goal feedback parse | `parse-goal-feedback` | ❌ NEW | Chain | N/A (AI call) | **New** |
| suggest-goals (extended) | `suggest-goals` | ✅ main.ts:11187 | ✅ chain/AIService | ✅ `goals` table | ✅ Extend |
| review-goals (extended) | `review-goals` | ✅ main.ts:11210 | ✅ chain | ✅ `goals`, `goal_reviews` | ✅ Extend |
| get-goals | `get-goals` | ✅ main.ts:11133 | ✅ chain | ✅ `goals` table | ✅ Already |
| save-goal | `save-goal` | ✅ main.ts:11161 | ✅ chain | ✅ `goals` table | ✅ Already |
| compute-goal-progress | `compute-goal-progress` | ✅ (existing) | ✅ chain | ✅ `logs` | ✅ Already |
| DailyPlanCard | n/a (IPC) | ✅ get-goals, save-goal, suggest-goals | ✅ GoalStore | ✅ SQLite | n/a |
| GoalHistoryCard | n/a (IPC) | ✅ get-goals | ✅ GoalStore | ✅ SQLite | n/a |
| Checklist ↔ Goal sync | n/a (renderer) | N/A | ✅ GoalStore | N/A | **UI-only** |
| Drag reorder | n/a (renderer) | N/A | N/A | N/A | **UI-only** |

**Key decision:** All new IPC handlers go in `main.ts` (no new `.ts` files in main process). No `build:electron` changes needed.

---

## Task 1: Cleanup (Foundation)

### Files to Delete
| File | Path |
|---|---|
| AiBriefCard.tsx | `src/components/AiBriefCard.tsx` |
| WeeklyReviewCard.tsx | `src/components/WeeklyReviewCard.tsx` |
| PatternCard.tsx | `src/components/PatternCard.tsx` |
| SleepCard.tsx | `src/components/SleepCard.tsx` |

### Files to Modify

#### 1. `src/services/AIService.ts`
- **Delete methods:** `generateDailyBrief`, `generateWeeklyReview`, `analyzePatterns`, `analyzeSleep`, `dataChatQuery`, `checkAnomalies`
- **Delete prompts:** `DAILY_BRIEF_PROMPT`, `WEEKLY_REVIEW_SYSTEM`, `ANOMALY_SYSTEM`, `PATTERN_ANALYSIS_SYSTEM`, `SLEEP_ANALYSIS_SYSTEM`
- **Delete supporting functions:** `callOpenRouter`, `cleanAIJson`, `parseAIJson`
- **Delete input interfaces:** `DailyBriefInput`, `WeeklyReviewInput`, `TopicDigestInput`, `AnomalyInput`
- **Delete fallback parsers:** `fallbackParseDailyBrief`, `fallbackParsePatternAnalysis`, `fallbackParseSleepAnalysis`
- **Delete response types:** `ParsedDailyBrief`, `ParsedPatternResponse`, `ParsedSleepResponse` (and their imports in AiPage)
- **KEEP:** `generateTopicDigest` method, `TOPIC_DIGEST_SYSTEM` prompt, `TopicDigestInput` interface — these are still used by `get-topic-digest` handler

#### 2. `src/pages/AiPage.tsx`
- **Remove imports:** AiBriefCard, WeeklyReviewCard, PatternCard, SleepCard, their types, fallback parsers, LoadingState (if unused after)
- **Remove state vars:** briefContent, parsedBriefContent, briefLoading, briefError, briefCollapsed, weeklyContent, weeklyLoading, weeklyError, weeklyDismissed, parsedPatternContent, patternLoading, patternError, parsedSleepContent, sleepLoading, sleepError, chatMessages, chatInput, chatLoading, chatEndRef, anomalies, anomaliesLoading
- **Remove unused icon imports:** Moon, MessageCircle, AlertTriangle, X, Send, BarChart3, Newspaper, TrendingUp, Sun (keep Sparkles, Settings, RefreshCw)
- **Remove effect hooks:** Brief/Weekly/Pattern/Sleep/Anomaly/Chat data fetching; keep digest fetching
- **Remove handlers:** handleSendChat, onRegenerate (brief/weekly), onAnalyze (patterns/sleep), onDismiss, onToggle
- **Remove onAiBriefReady listener**
- **Remove JSX sections:** Anomaly banner, BriefCard, WeeklyReviewCard, PatternCard, SleepCard, anomaly alerts card, Chat block
- **Remove local types:** Message interface, QuickPrompt constants, STORAGE_KEYS
- **Remove helper functions:** saveJson, loadJson, SectionHeader component
- **Add imports for new cards:** ContextSummaryCard, MyPlanCard (not yet, will add in Task 2)

#### 3. `src/main.ts`
- **Remove IPC handlers:** `get-ai-brief` (~line 10432), `regenerate-ai-brief` (~line 10466), `check-anomalies` (~line 10564), `analyze-patterns` (~line 10622), `analyze-sleep` (~line 10662), `data-chat-query` (~line 10702)
- **KEEP:** `get-topic-digest`, `get-interest-topics`, `add-interest-topic`, `remove-interest-topic`, `get-ai-config`, `save-ai-config`
- **KEEP:** All goal providers handlers (`get-ai-providers`, `save-ai-providers`, `test-ai-provider`, `get-goals`, `save-goal`, `save-goal-review`, `suggest-goals`, `review-goals`, `compute-goal-progress`)

#### 4. `src/preload.ts`
- **Remove bridges:** `getAiBrief`, `regenerateAiBrief`, `checkAnomalies`, `analyzePatterns`, `analyzeSleep`, `dataChatQuery`, `onAiBriefReady`
- **KEEP:** `getTopicDigest`, `getInterestTopics`, `addInterestTopic`, `removeInterestTopic`, `getAiConfig`, `saveAiConfig`, plus all goal/provider bridges

#### 5. `src/App.tsx`
- **Remove from `deskflowAPI` interface:** `getAiBrief`, `regenerateAiBrief`, `checkAnomalies`, `analyzePatterns`, `analyzeSleep`, `dataChatQuery`, `onAiBriefReady`
- **KEEP:** `getTopicDigest`, `getInterestTopics`, `addInterestTopic`, `removeInterestTopic`, `getAiConfig`, `saveAiConfig`

#### 6. `src/components/GlassCard.tsx`
- **Update interface:** Replace `accent?: boolean` + `accentColor?: string` with `accent?: 'pink' | 'amber' | 'none'`
- **Add** `h-0.5` top stripe element when accent !== 'none'
- **Change** `p-5` → `p-4`

### Verification (after cleanup)
- `npm run build` passes
- AiPage still renders (TopicDigestCard, DailyPlanCard, GoalHistoryCard still work)

---

## Task 2: Part D — Full AiPage Revamp

### Files to Create
| File | Based on |
|---|---|
| `src/components/MarkdownPreview.tsx` | RESULT.md §A.4 — regex markdown renderer |

### Files to Modify

#### 1. `src/components/DailyPlanCard.tsx` — Full rewrite (~200→~350 lines)
- Change to accept props: `goals`, `mode`, `suggestions`, `planGoals`, `review`, `onAccept`, `onEdit`, `onDismiss`, `onFeedback`, etc.
- OR keep self-contained but add mode state machine (morning/in-progress/review)
- **Visual:** GlassCard with pink accent stripe, mode pill (amber/emerald/pink), date badge
- **Morning mode:** Checklist "From your plan" section with drag-reorder + AI suggestions with Accept/Edit/Dismiss
- **In-progress:** Progress bars with `h-1.5 rounded-full bg-zinc-800 overflow-hidden` + `motion.div` width fill
- **Review mode:** Two-column accomplished/slipped grid + pattern callout
- **Feedback input:** Compact form at bottom with text input + send button
- **States:** Loading skeleton, empty state (no goals), error state
- **Goal interface:** Must match GoalStore.ts types (shared, not duplicated)
- Fix `(window as any).deskflowAPI` → `window.deskflowAPI!`
- **Remove** `categoryColors` inline rgba() styles — use Tailwind tokens
- **Remove** gradient top bar — use GlassCard accent stripe

#### 2. `src/components/GoalHistoryCard.tsx` — Full rewrite (~135→~200 lines)
- **Visual:** GlassCard with pink accent stripe, compact rows with date/completion count/progress bar
- **Click to expand:** `AnimatePresence` shows that day's goals + review summary
- **States:** Loading skeleton, empty state, error state
- Fix `(window as any).deskflowAPI` → `window.deskflowAPI!`
- **Remove** gradient top bar — use GlassCard accent stripe
- **Remove** inline rgba() styles

#### 3. `src/components/TopicDigestCard.tsx` — Restyle
- Add pink accent stripe
- Keep existing content but restyle header to match new design language

#### 4. `src/pages/AiPage.tsx` — Full rewrite (~577→~350 lines)
- **New layout** (per RESULT.md §D.2):
  ```
  PageHeader (Sparkles icon + "AI Assistant" + subtitle + ProviderStatusChip)
  ProviderBanner (conditional)
  Main grid (grid grid-cols-1 lg:grid-cols-3 gap-5)
    LEFT (lg:col-span-2): DailyPlanCard + TopicDigestCard
    RIGHT (lg:col-span-1): MyPlanCard + GoalHistoryCard + ContextSummaryCard
  ```
- **New internal components:** PageHeader, ProviderBanner, ProviderStatusChip
- **State for goals:** goals, mode, suggestions, planGoals, review, loading states
- **Data fetching:** `getGoals(today)`, auto-suggest logic (UX.2), `get-goal-context`
- **Mode selection logic** (UX.2): morning (no goals) / in-progress / review (after 20:00)
- **MyPlanCard placeholder:** Visual shell only in this task (functionality in Task 3)
- Use `window.deskflowAPI!.suggestGoals(today)` with proper typing

#### 5. `src/components/ContextSummaryCard.tsx` — New component
- GlassCard (no stripe)
- Shows: unfinished carry-over count, completed this week count, last usage info
- Refresh button with amber styling

### Verification (after Part D)
- `npm run build` passes
- AiPage loads with new layout, no visual regressions
- All cards show correct loading/empty/error states
- DailyPlanCard mode switching works
- GoalHistoryCard expand works

---

## Task 3: Part A — planning.md Integration

### Files to Modify

#### 1. `src/main.ts` — Add handlers
- Add `read-planning-md` handler: reads `{userData}/DeskFlow/planning.md`, returns `{ content: string }`, empty string if missing
- Add `write-planning-md` handler: writes content to file, creates directory if needed, returns `{ success: true }`
- Add `planningPath()` helper function
- Add imports: `fs`, `path` (check if already imported)

#### 2. `src/preload.ts` — Add bridges
- `readPlanningMd: () => Promise<{ content: string }>` → `ipcRenderer.invoke('read-planning-md')`
- `writePlanningMd: (content: string) => Promise<{ success: boolean }>` → `ipcRenderer.invoke('write-planning-md', content)`

#### 3. `src/App.tsx` — Extend interface
- Add `readPlanningMd`, `writePlanningMd`, `getGoalContext` to `Window.deskflowAPI`

#### 4. `src/components/MarkdownPreview.tsx` — Write implementation (if not done in Task 2)
- Regex renderer for: `##`/`#` headings (purple-400), `**bold**`, `-` bullets, `- [ ]`/`- [x]` checkboxes
- Checked items: emerald-400 checkmark, line-through text

#### 5. `src/pages/AiPage.tsx` — Wire MyPlanCard
- Pass `readPlanningMd`/`writePlanningMd` to MyPlanCard
- Add `onPlanningSaved` handler → invalidates suggestion cache

#### 6. `src/components/MyPlanCard.tsx` — New component (functionality)
- GlassCard with amber stripe
- State: content, draft, editing, saveState, timer ref
- On mount: read planning.md, seed with default template if empty
- Toggle Edit/Preview button
- Textarea in edit mode (monospace, bg-zinc-950/50, focus ring)
- MarkdownPreview in preview mode
- Auto-save debounce 1s
- Save indicator: "Saved" / "Unsaved changes" / "Saving…"
- Save flash: emerald-400 for 600ms
- `onPlanningSaved` callback prop

#### 7. `src/main.ts` — Extend suggest-goals handler (~line 11187)
- Change signature to `(_event, date: string, ctx?: GoalPromptContext)`
- Inject `ctx.planningContent` as `## User's Plan` section in system prompt
- Inject `ctx.unfinished` and `ctx.recentlyCompleted` into user block
- Return `{ goals, usedProviderId, usage }` format

#### 8. `src/main.ts` — Extend review-goals handler (~line 11210)
- Same pattern: accept optional context, inject planning content

### Verification (after Part A)
- `npm run build` passes
- planning.md can be read, edited, auto-saves
- Markdown preview renders correctly
- Editing planning.md triggers suggestion re-fetch

---

## Task 4: Part B — Context Management

### Files to Modify

#### 1. `src/services/GoalStore.ts` — Extend
- Add `GoalDayContext` interface: `{ lastUnfinishedCarriedOver: string[], completedToday: number }`
- Add `context?: GoalDayContext` to `GoalDay` interface
- Add `unfinishedFromYesterday(today: string): Goal[]` method
- Add `recentlyCompletedTitles(today: string, n?: number): string[]` method
- Add `saveGoal(goal: Goal)` method (convenience wrapper)

#### 2. `src/main.ts` — Add `get-goal-context` handler
- Takes `(date: string)` — DB-backed stats only
- Returns `{ last7dByCategory, yesterday }` from `logs` and `stats_daily` tables
- **Note:** Unfinished/recentlyCompleted are assembled renderer-side from GoalStore

#### 3. `src/main.ts` — Wire context into suggest-goals
- Already started in Task 3. Complete by ensuring `ctx` with `unfinished`, `recentlyCompleted`, `stats` is properly handled

#### 4. `src/preload.ts` — Add bridge
- `getGoalContext: () => Promise<any>` → `ipcRenderer.invoke('get-goal-context')`

#### 5. `src/pages/AiPage.tsx` — Add context assembly
- `assembleGoalContext(today, planningContent)` function
- Calls GoalStore.unfinishedFromYesterday + recentlyCompletedTitles + window.deskflowAPI.getGoalContext()
- Passes result to suggest-goals

#### 6. `src/pages/AiPage.tsx` — Add cache logic
- `shouldAutoSuggest(date, goalsToday)` — checks localStorage flag
- `markSuggested(date)` — sets flag
- `invalidateSuggestCache(date)` — clears flag (called from onPlanningSaved)
- `persistDayContext(today, carriedTitles)`

#### 7. `src/components/ContextSummaryCard.tsx` — Wire data
- Display unfinished count, completed this week count
- Token usage line (from last suggest call)

### Verification (after Part B)
- `npm run build` passes
- Suggestions reference yesterday's unfinished goals
- Recently completed goals are never re-suggested
- Editing the plan re-fetches suggestions

---

## Task 5: Part C — Checklist Parsing & Feedback Loop

### Files to Create
| File | Based on |
|---|---|
| `src/services/planningParser.ts` | RESULT.md §C.1 — `parseChecklist`, `ParsedChecklistItem` |

### Files to Modify

#### 1. `src/services/planningParser.ts` — Create
- `ParsedChecklistItem` interface: `{ raw, title, checked, targetSeconds?, lineIndex }`
- `parseChecklist(md: string): ParsedChecklistItem[]`
- Time regex `\((\d+(?:\.\d+)?)\s*(h|hr|hrs|m|min)\)`

#### 2. `src/main.ts` — Add `parse-goal-feedback` handler
- Takes `{ message: string, goals: string[] }`
- Calls provider chain with `GOAL_FEEDBACK_SYSTEM` prompt (maxTokens: 150)
- Returns `{ completed: string[], added: Goal[], note: string }`
- OR handle feedback as renderer-only by calling suggest-goals with a special meta-prompt

#### 3. `src/preload.ts` — Add bridge
- `parseGoalFeedback: (data: { message: string; goals: string[] }) => Promise<{ completed: string[]; added: any[]; note: string }>`

#### 4. `src/App.tsx` — Extend interface
- Add `parseGoalFeedback`

#### 5. `src/components/DailyPlanCard.tsx` — Add checklist section + feedback
- Parse planning.md on mount/save → show "From your plan" section
- Drag reorder (native HTML5 API)
- Accept button moves checklist items to active goals
- Feedback input at bottom → calls parseGoalFeedback → applies results

#### 6. `src/services/planningParser.ts` — Add sync helpers
- `syncCheckboxToGoals(items, today)` — checked items create completed goals
- `syncGoalToCheckbox(goal, md)` — completed goal flips `- [ ]` to `- [x]` in markdown

#### 7. `src/pages/AiPage.tsx` — Wire checklist parsing
- On planning.md save, re-parse checklists → update planGoals
- On goal completion, sync back to planning.md

### Verification (after Part C)
- `npm run build` passes
- Checklist items from planning.md appear as proposals
- `(2h)` parser sets targetSeconds correctly
- Drag reorder works
- Feedback "finished the report" marks goals done
- Checkbox sync works both ways

---

## `GoalPromptContext` Interface (shared between main.ts and renderer)

```ts
interface GoalPromptContext {
  planningContent?: string;
  unfinished?: Array<{ title: string; category: string; progress?: number }>;
  recentlyCompleted?: string[];
  stats?: Record<string, any>;
}
```

**Location:** Duplicate the interface in both `main.ts` (near the suggest-goals handler) and `src/pages/AiPage.tsx` (or a shared types file). For simplicity, duplicate in both files since it's small.

---

## Ripple Effects

| Change | Risk | Mitigation |
|---|---|---|
| Deleting AIService methods called from main.ts | High | Verify `suggest-goals` handler uses chain first, falls back to `generateDailyBrief` — update fallback to return empty |
| Changing suggest-goals response shape | Medium | Update all callers (DailyPlanCard, AiPage) to handle new shape |
| Changing GlassCard accent API | Medium | Search for all `<GlassCard` usages, update accent prop |
| Removing IPC channels used elsewhere | Low | Only `onAiBriefReady` is used in other contexts — verify |
| WIDTH animation anti-pattern exception | Low | Only in progress bars, isolated in overflow-hidden |
| `any` casts in DailyPlanCard/GoalHistoryCard | Low | Replace with typed `window.deskflowAPI!` |

---

## Build Configuration

**No changes to `build:electron` needed.** All new code is either:
- Renderer-side (handled by Vite): `MarkdownPreview.tsx`, `ContextSummaryCard.tsx`, `MyPlanCard.tsx`, `planningParser.ts`
- In existing main-process files: `main.ts`, `preload.ts`, `GoalStore.ts`
