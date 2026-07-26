# CONTEXT_BUNDLE.md — Continuation: planning.md Integration, Context Mgmt, Checklist Parsing & AiPage UI/UX Revamp

> **Self-contained reference.** All paths relative to project root `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker`

---

## 1. Current State of AiPage

**File:** `src/pages/AiPage.tsx` (577 lines)

The page is a cluttered hodgepodge with **old unused features** mixed with new stub cards:

### What's on the page (needs cleanup):
- Anomaly banner (line 267-282 — `AlertTriangle` banner, uses stale `checkAnomalies` IPC)
- Daily Brief card (line 308-334 — `BriefCard`, uses `getAiBrief` IPC)
- Weekly Review card (line 337-369 — `WeeklyReviewCard`, uses `getAiBrief` with `type:'weekly'`)
- Pattern Analyst card (line 372-397 — `PatternCard`, uses `analyzePatterns` IPC)
- Sleep Optimizer card (line 400-425 — `SleepCard`, uses `analyzeSleep` IPC)
- DailyPlanCard (line 428-432 — new, stub quality)
- GoalHistoryCard (line 433-437 — new, stub quality)
- Anomaly alerts card (line 440-489 — inline `AlertTriangle` card)
- Data chat (line 492-573 — full chat UI with message bubbles)

### What should remain per RESULT.md:
- DailyPlanCard (full-width, primary feature)
- TopicDigestCard (kept, rewired through provider chain)
- GoalHistoryCard (compact, right column)
- Provider status indicator

### Current AiPage state vars (all must be cleaned):
- `briefContent`, `parsedBriefContent`, `briefLoading`, `briefError`, `briefCollapsed`
- `weeklyContent`, `weeklyLoading`, `weeklyError`, `weeklyDismissed`
- `digestTopics`, `digestLoading`, `digestError`
- `parsedPatternContent`, `patternLoading`, `patternError`
- `parsedSleepContent`, `sleepLoading`, `sleepError`
- `chatMessages`, `chatInput`, `chatLoading`, `chatEndRef`
- `anomalies`, `anomaliesLoading`

### Current imports (many will be removed):
- `BriefCard`, `PatternCard`, `SleepCard`, `WeeklyReviewCard`, `TopicDigestCard`
- `DailyPlanCard`, `GoalHistoryCard`
- `fallbackParseDailyBrief`, `fallbackParsePatternAnalysis`, `fallbackParseSleepAnalysis`

---

## 2. DailyPlanCard (Current Stub)

**File:** `src/components/DailyPlanCard.tsx` (194 lines)

### Current behavior:
- Uses `(window as any).deskflowAPI.getGoals(today)` — reads from SQLite `goals` table
- Uses `(window as any).deskflowAPI.suggestGoals(today)` — calls AI provider chain
- Uses `(window as any).deskflowAPI.saveGoal(today, goal)` — persists to SQLite
- Simple card with gradient purple accent bar, goal list with circles/checkmarks, Suggest Goals button
- Minimal loading/empty/error states
- **No planning.md integration, no context carry-over, no progress bars, no feedback input**

### Key issues:
- Inline Goal interface duplicated from GoalStore.ts (type drift risk)
- Uses `(window as any)` instead of typed `window.deskflowAPI`
- No progress bar for time-based goals
- No morning/in-progress/review mode distinction
- Ugly inline `rgba(...)` styles instead of Tailwind tokens

---

## 3. GoalHistoryCard (Current Stub)

**File:** `src/components/GoalHistoryCard.tsx` (135 lines)

### Current behavior:
- Loads last 7 days from `getGoals(date)` one-by-one (N+1 query pattern)
- Shows flat list per day with status icons
- Inline Goal interface duplicated from GoalStore.ts
- Uses inline `rgba(...)` styles
- **No click-to-expand, no review summary, no completion percentage per day**

---

## 4. Provider Abstraction Layer (Built and Working)

### 4.1 Provider Types — `src/services/providers/types.ts` (52 lines)

```typescript
interface ProviderTemplate {
  id: string; label: string; defaultBaseUrl: string;
  auth: { type: 'bearer' | 'header' | 'query'; headerName?: string; queryParam?: string };
  staticHeaders?: Record<string, string>;
  buildBody?: (req: CanonicalRequest) => unknown;
  parseResponse?: (raw: any) => CanonicalResponse;
  suggestedModels?: string[]; docsUrl?: string;
}
interface CanonicalRequest {
  model: string; systemPrompt: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number; temperature?: number;
}
interface CanonicalResponse { content: string; usage?: { prompt_tokens: number; completion_tokens: number } }
interface ResolvedProvider { config: ProviderConfig; template: ProviderTemplate }
interface ProviderConfig {
  id: string; templateId: string; label: string; enabled: boolean;
  apiKey?: string; baseUrl?: string; models: string[]; priority: number;
  monthlyTokenBudget?: number; tokensUsedThisMonth?: number; budgetResetDate?: string;
}
interface AiProvidersState {
  providers: ProviderConfig[];
  routing: {
    default: { providerId: string; model: string };
    researchDigest?: { providerId: string; model: string } | null;
    goalAssistant?: { providerId: string; model: string } | null;
  };
}
```

### 4.2 Templates — `src/services/providers/templates.ts` (41 lines)

OpenRouter, CloudFlayer, Invilier, Olamah, Custom — all OpenAI-compatible.

### 4.3 Universal Caller — `src/services/providers/callProvider.ts` (45 lines)

`callProvider(provider, req)` — fetches with auth header, returns CanonicalResponse.

### 4.4 Router — `src/services/providers/router.ts` (80 lines)

- `buildChain(state, feature)` — builds ordered provider chain with fallbacks
- `callWithTokenTiers(provider, req)` — 200→100→50→40 token tier retry on 402
- `runWithFallback(chain, req)` — tries each provider until one succeeds

---

## 5. GoalStore — `src/services/GoalStore.ts` (66 lines)

```typescript
type GoalCategory = 'work' | 'personal' | 'health' | 'learning';
type GoalPeriod = 'daily' | 'weekly' | 'monthly';
type GoalStatus = 'suggested' | 'pending' | 'in-progress' | 'completed' | 'overdue' | 'slipped' | 'dismissed';

interface GoalTarget { type: 'time' | 'completion'; targetSeconds?: number; matchCategory?: string; matchApps?: string[]; done?: boolean }
interface GoalLink { label: string; url: string }
interface Goal {
  id: string; title: string; description?: string; category: GoalCategory;
  target: GoalTarget; period: GoalPeriod; status: GoalStatus; date: string;
  source: 'ai' | 'manual'; links: GoalLink[]; progressSeconds?: number;
  createdAt: string; completedAt?: string;
}
interface GoalDay { date: string; goals: Goal[]; reviewSummary?: string }
```

Stored in localStorage under `deskflow_goals`. Methods: `loadAll()`, `getDay(date)`, `saveDay(day)`, `history(limit=30)`.

---

## 6. SQLite Goals Tables (Built)

Created in DB init (`main.ts`):

```sql
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY, date TEXT, title TEXT, description TEXT, category TEXT,
  target_type TEXT, target_seconds REAL, match_category TEXT, status TEXT,
  period TEXT, source TEXT, links TEXT, progress_seconds REAL,
  completed_at TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS goal_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT UNIQUE, review_summary TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 7. IPC Endpoints (Built)

### Preload Bridges — `src/preload.ts:682-690`

```typescript
getAiProviders: () => ipcRenderer.invoke('get-ai-providers'),
saveAiProviders: (state: any) => ipcRenderer.invoke('save-ai-providers', state),
testAiProvider: (providerId: string) => ipcRenderer.invoke('test-ai-provider', providerId),
getGoals: (date: string) => ipcRenderer.invoke('get-goals', date),
saveGoal: (date: string, goal: any) => ipcRenderer.invoke('save-goal', date, goal),
saveGoalReview: (date: string, reviewSummary: string) => ipcRenderer.invoke('save-goal-review', date, reviewSummary),
suggestGoals: (date: string) => ipcRenderer.invoke('suggest-goals', date),
reviewGoals: (date: string) => ipcRenderer.invoke('review-goals', date),
```

### IPC Handlers — `src/main.ts:11084-11230`

| Channel | Lines | Purpose |
|---------|-------|---------|
| `get-ai-providers` | 11084-11104 | Returns AiProvidersState from userPreferences |
| `save-ai-providers` | 11106-11111 | Persists AiProvidersState |
| `test-ai-provider` | 11113-11131 | Sends ping to verify provider works |
| `get-goals` | 11133-11159 | Reads goals from SQLite by date |
| `save-goal` | 11161-11176 | INSERT OR REPLACE goal into SQLite |
| `save-goal-review` | 11178-11185 | Updates review summary |
| `suggest-goals` | 11187-11208 | Builds provider chain, calls AI for 3-5 SMART goals |
| `review-goals` | 11210-11220 | AI reviews incomplete goals, suggests slip/dismiss/reprioritize |

---

## 8. IPC Endpoints NEEDED (Not Yet Built)

These must be added for the continuation design (Part A + Part B):

| Channel | Purpose | Payload |
|---------|---------|---------|
| `read-planning-md` | Read planning.md from `{userData}/DeskFlow/planning.md` | Returns `{ content: string }` or `{ content: '' }` if missing |
| `write-planning-md` | Write planning.md content to disk | Takes `{ content: string }`, returns `{ success: boolean }` |
| `get-goal-context` | Assemble context for goal suggestions | Returns `{ unfinished: Goal[], recentlyCompleted: string[], stats: {...} }` |

Add to `src/preload.ts` and `src/main.ts`.

---

## 9. Components That Must Be DELETED

Per RESULT.md §3.7 removal checklist:

- `src/components/AiBriefCard.tsx`
- `src/components/WeeklyReviewCard.tsx`
- `src/components/PatternCard.tsx`
- `src/components/SleepCard.tsx`
- Remove Anomaly banner, data-chat block from AiPage.tsx
- Remove unused IPC listeners for `onAiBriefReady`

---

## 10. AIService Methods to Remove

- `generateDailyBrief`, `generateWeeklyReview`, `analyzePatterns`, `analyzeSleep`, `dataChatQuery`, `checkAnomalies`
- All their system prompt constants
- All fallback parsers: `fallbackParseDailyBrief`, `fallbackParsePatternAnalysis`, `fallbackParseSleepAnalysis`

Keep: `generateTopicDigest`, `TOPIC_DIGEST_SYSTEM`

---

## 11. Design Tokens (Frontend Design Skill)

From `agent/skills/frontend-design/SKILL.md`:

### Color System
```
Background:   zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
Primary:      pink-500 (accent), pink-400 (hover), pink-600 (active)
Secondary:    cyan-400 (info), emerald-400 (success), amber-400 (warning)
Text:         zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
Border:       zinc-800 (subtle), zinc-700 (active), zinc-600/50 (glass edge)
```

### Per-Page Accents
**Ai Page (AI Assistant): pink-500** (brand default, same as Dashboard/Productivity/Insights)

### Spacing (8px grid)
```
xs: 4px | sm: 8px | md: 12px | lg: 16px | xl: 24px | 2xl: 32px
```

### Animation Tokens
```
fast:    150ms (hover states, toggles)
normal:  250ms (modals, dropdowns)
slow:    400ms (page transitions)
ease-out: cubic-bezier(0.16, 1, 0.3, 1) (standard motion)
```

### Typography
- Font: Geist (UI), JetBrains Mono (code)
- Scale: 12/13-14/15-16/18-20px
- Weights: 400 body, 500 labels, 600 headings
- NEVER use font-thin on dark backgrounds

### Glass Card Template
```tsx
<GlassCard>  // bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-5
```

### Anti-Patterns (NEVER)
- No `box-shadow` for elevation in dark themes
- No pure black (`#000`) backgrounds
- No more than 2 font families per view
- No animating `width`/`height`/`top`/`left` (use transform + opacity)
- No default browser focus rings (use `ring-2 ring-pink-500/50`)
- No spring physics in developer tools
- No `rounded-2xl` or `rounded-3xl` (max `rounded-xl` = 12px)
- No `transition: all` (specify exact properties)

---

## 12. Window.deskflowAPI Type Declarations

Found in `src/App.tsx` — the `Window` interface extension. Current types for the multi-provider AI:

```typescript
interface Window {
  deskflowAPI: {
    // ... existing methods ...
    getAiProviders: () => Promise<any>;
    saveAiProviders: (state: any) => Promise<any>;
    testAiProvider: (providerId: string) => Promise<any>;
    getGoals: (date: string) => Promise<any>;
    saveGoal: (date: string, goal: any) => Promise<any>;
    saveGoalReview: (date: string, reviewSummary: string) => Promise<any>;
    suggestGoals: (date: string) => Promise<any>;
    reviewGoals: (date: string) => Promise<any>;
    // Need to add:
    // readPlanningMd: () => Promise<{ content: string }>;
    // writePlanningMd: (content: string) => Promise<{ success: boolean }>;
    // getGoalContext: () => Promise<{ unfinished: any[], recentlyCompleted: string[], stats?: any }>;
  };
}
```

---

## 13. Design Skills Reference

Three skill files define the visual/UX language for the revamp:

| Skill | File | Key Reference |
|-------|------|---------------|
| **frontend-design** | `agent/skills/frontend-design/SKILL.md` | Core principles, color tokens, spacing scale, animation tokens, per-page accents |
| **impeccable** | `agent/skills/impeccable/SKILL.md` | 7 domains, 23 commands, 27 anti-patterns, z-index discipline |
| **ui-ux-pro-max** | `agent/skills/ui-ux-pro-max/SKILL.md` | Industry design rules (developer tools section), style library, palette guide |

---

## 14. Framer Motion Imports

Project uses framer-motion (available as dep). Standard animation pattern:

```tsx
import { motion, AnimatePresence } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
>
```

---

## 15. GlassCard Component

**File:** `src/components/GlassCard.tsx`

```tsx
// Props: children, className?, accent?: boolean, accentColor?: string
// Base: bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-5
```

---

## 16. Existing TopicDigestCard

**File:** `src/components/TopicDigestCard.tsx`

Kept and rewired through provider chain. Props: `topics`, `loading`, `error`, `onRefresh`. Needs restyling to match new design.

---

## 17. Build Configuration

Main process files included in `build:electron` script in `package.json`:
- `src/services/providers/types.ts`
- `src/services/providers/templates.ts`
- `src/services/providers/callProvider.ts`
- `src/services/providers/router.ts`
- `src/services/GoalStore.ts`

**Any new .ts files added to main-process code must be added to `build:electron` command.**

---

## 18. User Data Directory

Preferences are stored at `{app.getPath('userData')}/preferences.json`. The planning.md file should live alongside it at `{userData}/DeskFlow/planning.md`. Access via `const userDataPath = require('electron').app.getPath('userData')` in `main.ts`.
