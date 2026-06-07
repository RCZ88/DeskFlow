# IMPLEMENTATION PLAN — Multi-Provider AI & Daily Goal Tracking

## Mapping RESULT.md → actual codebase

---

## Phase 1: Provider Layer (new services)

### Step 1.1 — Create `src/services/providers/types.ts` (NEW)
**RESULT.md §1.1** — Core interfaces.

```typescript
export interface ProviderTemplate { id, label, defaultBaseUrl, auth, staticHeaders, buildBody?, parseResponse?, suggestedModels?, docsUrl? }
export interface CanonicalRequest { model, systemPrompt, messages, maxTokens?, temperature? }
export interface CanonicalResponse { content, usage? }
export interface ResolvedProvider { config: ProviderConfig; template: ProviderTemplate }
export interface ProviderConfig { id, templateId, label, enabled, apiKey?, baseUrl?, models, priority, monthlyTokenBudget?, tokensUsedThisMonth?, budgetResetDate? }
export interface AiProvidersState { providers: ProviderConfig[]; routing: { default, researchDigest?, goalAssistant? } }
```
**Files affected:** none existing. New only.

### Step 1.2 — Create `src/services/providers/templates.ts` (NEW)
**RESULT.md §1.1** — 5 built-in templates: openrouter, cloudflayer, invilier, olamah, custom.
- OpenRouter gets `staticHeaders: { 'HTTP-Referer', 'X-Title' }` — preserves existing headers.

### Step 1.3 — Create `src/services/providers/callProvider.ts` (NEW)
**RESULT.md §1.1** — Universal caller.
- Replaces existing `callOpenRouter()` at `AIService.ts:129-154`.
- Handles bearer/header/query auth, custom buildBody/parseResponse, error tagging with `.status`.

### Step 1.4 — Create `src/services/providers/router.ts` (NEW)
**RESULT.md §1.3 + §1.6** — `buildChain()`, `runWithFallback()`, `callWithTokenTiers()`.
- `callWithTokenTiers` preserves the token tier logic (200→100→50→40) from `main.ts:10473`.
- Budget guard checks `monthlyTokenBudget` before attempting.

### Step 1.5 — Create `src/services/GoalStore.ts` (NEW)
**RESULT.md §1.4** — `loadAll()`, `getDay(date)`, `saveDay(day)`, `history(limit)`.
- localStorage key: `deskflow_goals`.

---

## Phase 2: Goal Backend (main process)

### Step 2.1 — Add IPC handlers in `src/main.ts`

| Handler | Location (append near existing AI handlers ~line 10956) | Purpose |
|---|---|---|
| `get-ai-providers` | New | Read AiProvidersState from preferences |
| `save-ai-providers` | New | Write AiProvidersState to preferences |
| `test-provider` | New | Ping provider with 1-token request, return status |
| `compute-goal-progress` | New | SQL query against `logs` table (see §1.5) |
| `suggest-goals` | New | Assemble GoalContext → runWithFallback(goalAssistant) |
| `review-goals` | New | Assemble GoalContext → runWithFallback(goalAssistant) |

### Step 2.2 — Migration logic in `src/main.ts`
**RESULT.md §1.2** — `migrateAiConfig()` runs once on startup:
- Reads legacy `openrouterApiKey` + `aiConfig` preferences.
- Writes `AiProvidersState` with single OpenRouter entry.
- Deletes legacy keys.

### Step 2.3 — Update `AIService.ts` — remove unused methods
**RESULT.md §3.7** removal list:
- Remove methods: `generateDailyBrief` (449-474), `generateWeeklyReview` (476-501), `checkAnomalies` (587-618), `analyzePatterns` (525-542), `analyzeSleep` (544-561), `dataChatQuery` (563-585).
- Remove system prompts: `DAILY_BRIEF_PROMPT` (167-190), `WEEKLY_REVIEW_SYSTEM` (204-215), `ANOMALY_SYSTEM` (236-256), `PATTERN_ANALYSIS_SYSTEM` (258-287), `SLEEP_ANALYSIS_SYSTEM` (289-317).
- Remove exported types: `ParsedDailyBrief` (321-331), `ParsedPatternResponse` (333-343), `ParsedSleepResponse` (345-355).
- Remove fallback parsers: `fallbackParseDailyBrief` (359-378), `fallbackParsePatternAnalysis` (380-410), `fallbackParseSleepAnalysis` (412-446).
- **Keep:** `generateTopicDigest` (503-523), `TOPIC_DIGEST_SYSTEM` (222), `callOpenRouter` → REPLACE with new provider abstraction (can remove `callOpenRouter` function at 129-154).
- **Add new:** `suggestGoals()`, `reviewGoals()` methods that call `runWithFallback` with the goal system prompts.

---

## Phase 3: IPC Bridge Updates

### Step 3.1 — `src/preload.ts` changes
**RESULT.md §1.5 + §3.7**

**Remove these IPC methods** (lines 167-191):
```
generateAIColors        (line 167)
generateAICategorization (line 168)
testOpenRouterKey       (line 169)  — replaced by test-provider
summarizeWithLLM        (line 170)
getAiBrief              (line 175)
regenerateAiBrief       (line 176)
checkAnomalies          (line 178)
analyzePatterns         (line 179)
analyzeSleep            (line 180)
dataChatQuery           (line 181)
getAiConfig             (line 182)
saveAiConfig            (line 183)
```

**Add these IPC methods:**
```
getAiProviders: () => ipcRenderer.invoke('get-ai-providers')
saveAiProviders: (state) => ipcRenderer.invoke('save-ai-providers', state)
testProvider: (cfg) => ipcRenderer.invoke('test-provider', cfg)
computeGoalProgress: (params) => ipcRenderer.invoke('compute-goal-progress', params)
suggestGoals: (params) => ipcRenderer.invoke('suggest-goals', params)
reviewGoals: (params) => ipcRenderer.invoke('review-goals', params)
```

**Keep these:**
```
getTopicDigest          (line 177)  — rewired internally
addInterestTopic        (line 185)  — still needed for research digest
removeInterestTopic     (line 186)
```

### Step 3.2 — `src/main.ts` remove deprecated handlers
**RESULT.md §3.7** — Remove these IPC handlers:
| Handler | Line | |
|---------|------|---|
| `get-ai-brief` | 10397 | 🗑️ |
| `regenerate-ai-brief` | 10431 | 🗑️ |
| `check-anomalies` | 10507 | 🗑️ |
| `analyze-patterns` | 10565 | 🗑️ |
| `analyze-sleep` | 10605 | 🗑️ |
| `data-chat-query` | 10645 | 🗑️ |
| `get-ai-config` | 10717 | 🗑️ |
| `save-ai-config` | 10733 | 🗑️ |
| `test-openrouter-key` | 10108 | 🗑️ (replaced by test-provider) |
| `summarize-with-llm` | 10179 | 🗑️ |
| `generate-ai-colors` | 10041 | 🗑️ |
| `generate-ai-categorization` | 10956 | 🗑️ |

**Keep but rewire:**
| Handler | Line | Action |
|---------|------|--------|
| `get-topic-digest` | 10449 | Rewire to use runWithFallback(chain, 'researchDigest') instead of callOpenRouter |

---

## Phase 4: Settings UI — Provider Management

### Step 4.1 — `src/pages/SettingsPage.tsx`
**RESULT.md §2.5** — Replace lines 2835-3056 entirely.

**Remove:** Whole AI Assistant section block (API key input, model inputs, auto-generate toggle, usage stats).
**Add:** Provider management section:
- Provider list (drag-to-reorder via HTML5 API per §2.6)
- ProviderRow component (expandable with API key / URL / models / test / remove)
- Add Provider modal (grid of 4 provider cards: CloudFlayer, Invilier, Olamah, Custom)
- Feature routing dropdowns (Research Digest → provider▾ + model▾, Goal Assistant → provider▾ + model▾)
- Per-provider budget bars
- Keep: Interest Topics (still needed for research digest)

**State changes:**
- Remove: `openRouterApiKey`, `apiKeyTestStatus`, `apiKeyTestMessage`, `aiConfig`, `aiUsageStats`, `showApiKey`
- Add: `providers: ProviderConfig[]`, `routing: AiProvidersState['routing']`, `editingProvider: string | null`, `testResults: Record<string, 'testing'|'success'|'error'>`

---

## Phase 5: AiPage — Strip + Add Goal Features

### Step 5.1 — `src/pages/AiPage.tsx`
**RESULT.md §2.1** — Total rewrite of page body.

**Remove from imports (lines 1-15):**
- `BriefCard` (AiBriefCard)
- `WeeklyReviewCard`
- `PatternCard`
- `SleepCard`
- `ParsedDailyBrief`, `ParsedPatternResponse`, `ParsedSleepResponse` types
- `fallbackParseDailyBrief`, `fallbackParsePatternAnalysis`, `fallbackParseSleepAnalysis`

**Remove state variables (lines 77-108):**
- `brief*`, `weekly*`, `pattern*`, `sleep*`, `chat*`, `anomal*` variables
- **Keep:** `digest*` variables (research digest)

**Remove JSX sections (lines 264-558):**
- Anomaly banner (264-280)
- Daily Brief block (305-332)
- Weekly Review block (334-367)
- Pattern Analyst block (369-395)
- Sleep Optimizer block (397-423)
- Activity Alerts block (425-475)
- Chat block (477-558)

**Keep:** Research Digest block (285-303) — rewired through provider layer.
**Add new:**
- ProviderBanner — shown if zero enabled providers
- DailyPlanCard — morning/in-progress/review modes
- GoalHistoryCard — past days/weeks

### Step 5.2 — Delete unused component files
```
src/components/AiBriefCard.tsx          🗑️
src/components/WeeklyReviewCard.tsx     🗑️
src/components/PatternCard.tsx          🗑️
src/components/SleepCard.tsx            🗑️
```

### Step 5.3 — Rewire `get-topic-digest` handler
**RESULT.md §3.6** — At `main.ts:10449`:
- Change from `callOpenRouter(...)` to `runWithFallback(buildChain(state, 'researchDigest'), {...})`.
- `TOPIC_DIGEST_SYSTEM` prompt stays unchanged.
- Interest Topics setting stays unchanged.

---

## Phase 4: Backend Verification Audit

| Feature | IPC Channel | Handler Exists? | Service Class | DB Schema | Status |
|---------|-------------|-----------------|---------------|-----------|--------|
| **Provider list** | `get-ai-providers` | ❌ New | ❌ New (providers/) | ✅ preferences | 🆕 Add |
| **Provider save** | `save-ai-providers` | ❌ New | ❌ New (providers/) | ✅ preferences | 🆕 Add |
| **Test provider** | `test-provider` | ❌ New | ✅ callProvider | N/A | 🆕 Add |
| **Goal progress** | `compute-goal-progress` | ❌ New | N/A (inline SQL) | ✅ logs table | 🆕 Add |
| **Suggest goals** | `suggest-goals` | ❌ New | ✅ AIService + provider chain | N/A | 🆕 Add |
| **Review goals** | `review-goals` | ❌ New | ✅ AIService + provider chain | N/A | 🆕 Add |
| **Goals persistence** | n/a (localStorage) | N/A | ✅ GoalStore.ts | N/A | ✅ UI-only v1 |
| **Research digest** | `get-topic-digest` | ✅ 10449 (rewire) | ✅ AIService.generateTopicDigest | N/A | ✅ Real |
| | | | | | |
| **REMOVE:** daily brief | `get-ai-brief` | ✅ 10397 🗑️ | ✅ AIService 🗑️ | N/A | 🗑️ |
| **REMOVE:** weekly review | `regenerate-ai-brief` | ✅ 10431 🗑️ | ✅ AIService 🗑️ | N/A | 🗑️ |
| **REMOVE:** anomalies | `check-anomalies` | ✅ 10507 🗑️ | ✅ AIService 🗑️ | N/A | 🗑️ |
| **REMOVE:** patterns | `analyze-patterns` | ✅ 10565 🗑️ | ✅ AIService 🗑️ | N/A | 🗑️ |
| **REMOVE:** sleep | `analyze-sleep` | ✅ 10605 🗑️ | ✅ AIService 🗑️ | N/A | 🗑️ |
| **REMOVE:** data chat | `data-chat-query` | ✅ 10645 🗑️ | ✅ AIService 🗑️ | N/A | 🗑️ |
| **REMOVE:** AI config | `get/save-ai-config` | ✅ 10717/733 🗑️ | N/A | ✅ preferences | 🗑️ |
| **REMOVE:** test key | `test-openrouter-key` | ✅ 10108 🗑️ | N/A | N/A | 🗑️ |
| **REMOVE:** summarize | `summarize-with-llm` | ✅ 10179 🗑️ | ✅ AIService 🗑️ | N/A | 🗑️ |
| **REMOVE:** AI colors | `generate-ai-colors` | ✅ 10041 🗑️ | N/A | N/A | 🗑️ |
| **REMOVE:** AI categorization | `generate-ai-categorization` | ✅ 10956 🗑️ | N/A | N/A | 🗑️ |

### Backend Gaps: NONE
All new features have a real backend path:
- Provider config → preferences table ✅
- Goal progress → logs table SQL queries ✅
- AI suggestions/reviews → real AI API via provider chain ✅
- Research digest → existing handler rewired ✅

---

## Ripple Effects Check

| Change | Ripples To | Mitigation |
|--------|-----------|------------|
| Remove `get-ai-brief` IPC | Any other page calling it (Dashboard?) | Grep `getAiBrief` across codebase — only AiPage uses it. |
| Remove `dataChatQuery` IPC | Any page with chat UI | Only AiPage chat section. |
| Remove `generate-ai-colors` IPC | App.tsx or DashboardPage? | Grep `generateAIColors` — likely not used anymore. |
| Remove `test-openrouter-key` IPC | SettingsPage | Replaced by `test-provider`. |
| Remove `PatternCard` component | Any imports | Only AiPage imports it. |
| Remove `ParsedDailyBrief` type | Any imports | Only AiPage + BriefCard import it. |
| Change AiConfig storage shape | Settings → preferences | Migration handles old shape. |
| Relocate tokenTiers | main.ts → providers/router.ts | Move logic, keep constant values. |

## Implementation Order

1. Create new service files (providers/ + GoalStore)
2. Add new IPC handlers in main.ts
3. Update preload.ts bridges
4. Rewire get-topic-digest to use provider layer
5. Replace Settings AI Assistant section
6. Strip AiPage + add DailyPlanCard + GoalHistoryCard
7. Delete unused component files
8. Remove deprecated IPC handlers from main.ts
9. Remove deprecated AIService methods
10. Build & verify
