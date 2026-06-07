# CONTEXT_BUNDLE.md — Multi-Provider AI Connector & Daily Goal Tracking

> **Self-contained reference.** The target AI should read this file first. All file paths are relative to the project root.

---

## 1. Problem Statement

The app currently has a **hardcoded OpenRouter-only AI provider** (`callOpenRouter` in `AIService.ts`). There is no provider abstraction layer, no provider selector UI, and no way to configure multiple backends (e.g., CloudFlayer, Invilier, Olamah). Additionally, **there is no goal-tracking feature** — no daily plan creation, no AI-assisted goal suggestion or progress tracking.

---

## 2. Existing Architecture

### 2.1 AI Service Layer

**File:** `src/services/AIService.ts` (619 lines)

```
OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions'
```

The service exports a single class `AIService` with static methods:

| Method | Purpose | Default Model |
|--------|---------|---------------|
| `generateDailyBrief` | Yesterday summary | `google/gemini-2.0-flash-001` |
| `generateWeeklyReview` | Weekly summary | `google/gemini-2.0-flash-001` |
| `generateTopicDigest` | News/research digest | `google/gemini-2.0-flash-001` |
| `analyzePatterns` | 30-day pattern analysis | `google/gemini-2.0-flash-001` |
| `analyzeSleep` | Sleep/productivity correlation | `google/gemini-2.0-flash-001` |
| `dataChatQuery` | Conversational query | `google/gemini-2.0-flash-001` |
| `checkAnomalies` | Daily anomaly detection | `google/gemini-2.0-flash-001` |

**All methods** use a private `callOpenRouter()` function (line 129-154):
```typescript
async function callOpenRouter(params: AICallParams): Promise<AICallResult> {
  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://deskflow.app',
      'X-Title': 'DeskFlow',
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages,
      ],
      max_tokens: params.maxTokens || 500,
      temperature: params.temperature ?? 0.4,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || '', usage: data.usage };
}
```

**Key interface:**
```typescript
interface AICallParams {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  model: string;
  maxTokens?: number;
  temperature?: number;
  apiKey: string;
}

interface AICallResult {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}
```

**System prompts defined (same file):**
- `DAILY_BRIEF_PROMPT` — JSON schema for daily brief (line 167)
- `WEEKLY_REVIEW_SYSTEM` — JSON schema for weekly review (line 204)
- `TOPIC_DIGEST_SYSTEM` — JSON array for topic digest (line 222)
- `ANOMALY_SYSTEM` — JSON schema for anomaly detection (line 236)
- `PATTERN_ANALYSIS_SYSTEM` — JSON schema for pattern analysis (line 258)
- `SLEEP_ANALYSIS_SYSTEM` — JSON schema for sleep analysis (line 289)

### 2.2 IPC Endpoints (preload.ts)

**File:** `src/preload.ts` (667 lines)

AI-related IPC channels (line 167-191):
```typescript
// AI Features
generateAIColors: (apps: string[]) => ipcRenderer.invoke('generate-ai-colors', apps),
generateAICategorization: (items: Array<{name: string, category: string}>) => ipcRenderer.invoke('generate-ai-categorization', items),
testOpenRouterKey: () => ipcRenderer.invoke('test-openrouter-key'),
summarizeWithLLM: (prompt: string, options?: { maxTokens?: number; model?: string }) =>
  ipcRenderer.invoke('summarize-with-llm', prompt, options),

// AI Briefing & News Features
getAiBrief: (params: { type: 'daily' | 'weekly' }) => ipcRenderer.invoke('get-ai-brief', params),
regenerateAiBrief: (params: { type: 'daily' | 'weekly' }) => ipcRenderer.invoke('regenerate-ai-brief', params),
getTopicDigest: () => ipcRenderer.invoke('get-topic-digest'),
checkAnomalies: () => ipcRenderer.invoke('check-anomalies'),
analyzePatterns: () => ipcRenderer.invoke('analyze-patterns'),
analyzeSleep: () => ipcRenderer.invoke('analyze-sleep'),
dataChatQuery: (params: { query: string; history: Array<{ role: string; content: string }> }) => ipcRenderer.invoke('data-chat-query', params),
getAiConfig: () => ipcRenderer.invoke('get-ai-config'),
saveAiConfig: (config: { apiKey?: string; enabled?: boolean; briefModel?: string; weeklyModel?: string; digestModel?: string; anomalyModel?: string; autoGenerateBrief?: boolean }) => ipcRenderer.invoke('save-ai-config', config),
```

### 2.3 Main Process IPC Handlers

**File:** `src/main.ts`

The AI IPC handlers in `main.ts` are responsible for:
1. Reading API key from preferences
2. Calling the appropriate `AIService` static method
3. Caching results (e.g., daily brief is cached in localStorage)
4. Broadcasting results via `ai-brief-ready` event

The handlers follow a consistent pattern:
```typescript
ipcMain.handle('get-ai-brief', async (event, params) => {
  const apiKey = await getPreference('openrouterApiKey');
  // ...
  const result = await AIService.generateDailyBrief(apiKey, data, model);
  // cache and return
});
```

### 2.4 AI Configuration (Settings Page)

**File:** `src/pages/SettingsPage.tsx` — Lines 2838-3054

Current config UI:
- **API Key input** (line 2843) — password field for OpenRouter API key
- **Test Connection** button (line 2870) — calls `window.deskflowAPI.testOpenRouterKey()`
- **Brief Generation Model** (line 2918) — free text input, default `google/gemini-2.0-flash-001`
- **Weekly & Digest Model** (line 2935) — free text input, default `deepseek/deepseek-chat-v3-0324`
- **Auto-generate daily brief toggle** (line 2952)
- **Interest Topics** (line 2971) — add/remove topics for research digest
- **Usage Stats** (line 3041) — total API calls + estimated cost

**State shape** (line 854-869):
```typescript
const [aiConfig, setAiConfig] = useState({
  briefModel: 'google/gemini-2.0-flash-001',
  weeklyModel: 'google/gemini-2.0-flash-001',
  digestModel: 'google/gemini-2.0-flash-001',
  anomalyModel: 'google/gemini-2.0-flash-001',
  autoGenerateBrief: true,
});
```

**Persistence:** API key stored via `window.deskflowAPI.setPreference('openrouterApiKey', key)`. Full config via `window.deskflowAPI.saveAiConfig(config)`. Loaded on mount from `window.deskflowAPI.getAiConfig()` and `window.deskflowAPI.getPreferences()`.

### 2.5 AiPage UI (main AI page)

**File:** `src/pages/AiPage.tsx` (563 lines)

Layout: Single scrollable page with `space-y-5` vertical stack and a `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5` inner grid.

Sections in order:
1. **Anomaly Banner** — inline, red/amber alert bar, dismissable
2. **Research Digest** — `<TopicDigestCard>` full-width (`col-span-3`)
3. **Daily Brief** — `<BriefCard>` full-width, collapsible, regeneratable
4. **Weekly Review** — `<WeeklyReviewCard>` full-width, Monday-only or placeholder
5. **Pattern Analyst** — `<PatternCard>` 1-column
6. **Sleep Optimizer** — `<SleepCard>` 1-column
7. **Activity Alerts** — inline `<GlassCard>` 1-column, lists anomalies
8. **Ask Your Stats Chat** — inline chat with quick prompts + send input

**No provider selector exists on AiPage.** No goal-related UI exists anywhere.

---

## 3. Design System

**File:** `src/components/GlassCard.tsx` — The primary card wrapper used throughout:
```typescript
export function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}
```

**Color scheme:** Dark theme. Base: `#0a0a0a` (zinc-900). Cards: `bg-zinc-900/60` with `backdrop-blur-xl` and `border-zinc-800/50`. Accent: amber (`amber-400`, `amber-600`). Text: `text-zinc-400` (muted), `text-white` (primary). Buttons: `bg-amber-400 text-[#0a0a0a]` (primary), `bg-zinc-800 hover:bg-zinc-700` (secondary).

**Typography:** All text uses `text-sm` or `text-xs` for body content. Headers within cards use `text-base font-semibold text-white` or similar inline styles.

**Animation:** Cards use `motion.div` from framer-motion with `initial={{ opacity: 0, y: 20 }}` and staggered delays.

---

## 4. Data Flow

```
User clicks refresh  →  AiPage calls window.deskflowAPI.getAiBrief()
                       →  IPC handler in main.ts reads API key + model from preferences
                       →  Calls AIService.generateDailyBrief(apiKey, data, model)
                       →  AIService calls callOpenRouter() → OpenRouter API
                       →  Result returned back through IPC
                       →  AiPage renders result in BriefCard
```

Cache flow:
```
main.ts caches brief results in localStorage('ai_brief_cache_*')
On page load, if cache exists and is fresh (<24h), return cached result
Otherwise call API
```

---

## 5. Current Token Budget Handling (for AI cost awareness)

**File:** `src/main.ts` — Token tiers for retry logic:
```typescript
const tokenTiers = [200, 100, 50, 40]; // maxTokens to try on 402 error
```
When OpenRouter returns 402 (insufficient credits), the code retries with a lower token tier instead of switching models.

---

## 6. Relevant DB Tables

The app uses SQLite via `better-sqlite3`. Key tables for goal tracking:

- **`logs`** — `id`, `app_name`, `title`, `timestamp`, `duration_ms`, `category`
- **`stats_daily`** — `date`, `total_seconds`, `productive_seconds`, `distracting_seconds`, `neutral_seconds`, `app_breakdown_json`
- **`stats_hourly`** — `date`, `hour`, `app_name`, `duration_seconds`
- **`browser_logs`** — `id`, `domain`, `title`, `timestamp`, `duration_ms`, `category`
- **`preferences`** — key-value store for app settings
- **`sessions`** — `id`, `app_name`, `started_at`, `ended_at`, `duration_ms`

No goals table exists yet.

---

## 7. Types and Interfaces

**File:** `src/services/AIService.ts` (lines 319-355)

```typescript
export interface ParsedDailyBrief {
  signal: string;
  observation: string;
  suggestion: string;
  trend: 'improving' | 'stable' | 'declining';
  metrics: Array<{ key: string; value: string; trend: 'up' | 'down' | 'flat' }>;
}

export interface ParsedPatternResponse {
  score: number;
  assessment: string;
  patterns: Array<{
    name: string;
    description: string;
    impact: 'positive' | 'neutral' | 'negative';
    frequency: string;
    recommendation?: string;
  }>;
}

export interface ParsedSleepResponse {
  score: number;
  correlation: string;
  optimalBedtime?: string;
  insomnia: string;
  suggestions: Array<{ icon: string; title: string; detail: string }>;
}
```

**File:** `src/main.ts` — AI config stored in preferences as:
```typescript
interface AiConfig {
  apiKey?: string;
  enabled?: boolean;
  briefModel?: string;
  weeklyModel?: string;
  digestModel?: string;
  anomalyModel?: string;
  autoGenerateBrief?: boolean;
}
```

---

## 8. Existing Component File Locations

| Component | Path |
|-----------|------|
| AiBriefCard | `src/components/AiBriefCard.tsx` |
| PatternCard | `src/components/PatternCard.tsx` |
| SleepCard | `src/components/SleepCard.tsx` |
| WeeklyReviewCard | `src/components/WeeklyReviewCard.tsx` |
| TopicDigestCard | `src/components/TopicDigestCard.tsx` |
| GlassCard | `src/components/GlassCard.tsx` |
| LoadingState | `src/components/LoadingState.tsx` |

---

## 9. Directory Structure (relevant)

```
src/
  services/
    AIService.ts          ← Provider-agnostic layer needed here
  pages/
    AiPage.tsx            ← Main AI features page
    SettingsPage.tsx      ← AI config UI (provider settings)
  components/
    GlassCard.tsx         ← Base card component
    *.tsx                 ← Feature-specific cards
  preload.ts              ← IPC bridge
  main.ts                 ← IPC handlers + token tiers
agent/
  docs/
    multi-provider-ai-design-07062026/
      CONTEXT_BUNDLE.md   ← This file
      prompt.md           ← Generated prompt (next)
```
