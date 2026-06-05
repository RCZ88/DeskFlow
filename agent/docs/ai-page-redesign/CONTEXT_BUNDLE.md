# CONTEXT_BUNDLE — AiPage Structured Prompts + Parsing + Layout

## Project Overview
Deskflow — a desktop productivity tracker (Electron + React + Vite + Tailwind v4). Dark galaxy theme (`zinc-900` base). Tracks foreground apps, browser websites, sleep, and external activities. Has an AI hub at `/ai` with 7 features that call OpenRouter via a local API key.

## File: `src/pages/AiPage.tsx` (528 lines)
Exports `<AiPage />` — the entire AI hub. Currently renders ALL 7 sections stacked vertically in a `space-y-8` flex column. No tabs, no nav. Each section wrapped in `<motion.div>` with staggered fade-in (delay 0, 0.05, 0.1, ...).

**All current state variables (independent per section):**
```typescript
briefContent, briefLoading, briefError, briefCollapsed        // Daily Brief
weeklyContent, weeklyLoading, weeklyError, weeklyDismissed    // Weekly Review
digestTopics, digestLoading, digestError                      // Research Digest
patternContent, patternLoading, patternError                  // Pattern Analyst (string | null)
sleepContent, sleepLoading, sleepError                        // Sleep Optimizer (string | null)
chatMessages: Message[], chatInput, chatLoading, chatEndRef   // Chat
anomalies, anomaliesLoading                                   // Anomaly Alerts
```

**All IPC calls used:**
```typescript
window.deskflowAPI.getAiBrief({ type: 'daily' | 'weekly' })
  → returns { success, content: { summary: string } | { wentWell, watchFor, focusSuggestion }, cached, error? }
window.deskflowAPI.regenerateAiBrief({ type: 'daily' | 'weekly' })
  → same return
window.deskflowAPI.getTopicDigest()
  → returns { success, topics: [{ topic, summary, sources? }], error? }
window.deskflowAPI.checkAnomalies()
  → returns { success, anomalies: [{ severity, detail }], error? }
window.deskflowAPI.analyzePatterns()
  → returns { success, content: string, error? }  ← CURRENTLY RAW TEXT
window.deskflowAPI.analyzeSleep()
  → returns { success, content: string, error? }  ← CURRENTLY RAW TEXT
window.deskflowAPI.dataChatQuery({ query, history })
  → returns { success, content: string, error? }
window.deskflowAPI.onAiBriefReady((data) => void)  // ← event listener for daily/weekly
```

**Current rendering pattern (problematic):**
- Pattern Analyst: `patternContent.split('\n')` → `ContentList` component (raw bullet text)
- Sleep: `sleepContent.split('\n')` → `ContentList` component (raw bullet text)
- Daily Brief: `content.summary` → `<p>` tag (raw text)
- Anomalies: `anomalies[].detail` → `<p>` tag (raw text)
- Chat: raw text in message bubbles

**Current inline sub-components** (all defined in AiPage.tsx):
```typescript
SectionHeader({ icon, accent, title, description, action? })
ActionButton({ accent, loading, loadingLabel, label, onClick })
EmptyState({ icon, title, description })
ErrorBlock({ message })
ContentList({ items: string[], color })  // ← split('\n') + map each line
```

## File: `src/services/AIService.ts` (429 lines)
All prompt templates + OpenRouter caller. 6 methods.

### DAILY_BRIEF_PROMPT (line 167)
CURRENT: Returns raw sentences. No JSON.
```typescript
"You are a sharp, honest productivity analyst. Write a tight 3-4 sentence briefing in second person. Output ONLY the text..."
```
Used by: `AIService.generateDailyBrief()` → returns `{ content: string, usage? }`

### WEEKLY_REVIEW_SYSTEM (line 188)
ALREADY returns JSON: `{ wentWell, watchFor, focusSuggestion }`
Parsed via `parseAIJson()` with fallback.

### TOPIC_DIGEST_SYSTEM (line 206)
ALREADY returns JSON: `[{ topic, summary, sources? }]`
Parsed via `parseAIJson()` with fallback.

### ANOMALY_SYSTEM (line 234)
ALREADY returns JSON: `{ hasAnomaly, anomalies: [{ severity, detail }] }`
Parsed via `parseAIJson()` with fallback.

### analyzePatterns prompt (line 331, inline in method body)
CURRENT: Returns raw bullet text. No JSON.
```
"Output raw text only. 3-5 bullet points. Each bullet: name the pattern, cite specific data..."
```
Used by: `AIService.analyzePatterns()` → returns `{ content: string, usage? }`

### analyzeSleep prompt (line 353, inline in method body)
CURRENT: Returns raw bullet text. No JSON.
```
"Output raw text only. 2-4 bullet points. Each bullet: cite the data..."
```
Used by: `AIService.analyzeSleep()` → returns `{ content: string, usage? }`

### dataChatQuery prompt (line 375)
Returns raw conversational text. Keep as-is (chat needs natural language).

### JSON parsing infrastructure (already exists):
```typescript
cleanAIJson(raw: string): string
  - Strips ```json code fences
  - Fixes single quotes → double quotes
  - Unquotes bare keys: {key:} → {"key":}
  - Removes trailing commas before } or ]
  - Auto-closes unclosed brackets (handles truncated JSON)
  - Replaces "..." with ""

parseAIJson<T = any>(raw: string): T
  - Calls cleanAIJson() then JSON.parse()
```

## File: `src/main.ts` — IPC Handlers (relevant sections)

### generateDailyBriefAndCache (line 9304)
```typescript
async function generateDailyBriefAndCache(_event, key, apiKey): Promise<any> {
  // queries daily_stats, computes totalHours/topApps/productivePct/etc.
  const result = await AIService.generateDailyBrief(apiKey, { totalHours, topApps, ... });
  const content = { summary: result.content, type: 'daily', modelUsed: briefModel };
  // INSERT OR REPLACE INTO ai_briefs (type, date, content, ...)
  return { success: true, content, cached: false };
}
```

### analyze-patterns handler (line 9559)
```typescript
// queries 30 days of daily_stats, builds daySummaries
const result = await AIService.analyzePatterns(apiKey, { dailySummary }, model);
return { success: true, content: result.content };  // ← returns raw string
```
**NOT cached.** Always re-calls OpenRouter. No persistence.

### analyze-sleep handler (line 9599)
```typescript
// queries external_sessions WHERE type='sleep', builds sleepSummary + prodSummary
const result = await AIService.analyzeSleep(apiKey, { sleepSummary, productivitySummary }, model);
return { success: true, content: result.content };  // ← returns raw string
```
**NOT cached.** Always re-calls OpenRouter. No persistence.

## File: `src/preload.ts` — Bridges (lines 171-188)
```typescript
getAiBrief: (params) => ipcRenderer.invoke('get-ai-brief', params),
regenerateAiBrief: (params) => ipcRenderer.invoke('regenerate-ai-brief', params),
getTopicDigest: () => ipcRenderer.invoke('get-topic-digest'),
checkAnomalies: () => ipcRenderer.invoke('check-anomalies'),
analyzePatterns: () => ipcRenderer.invoke('analyze-patterns'),
analyzeSleep: () => ipcRenderer.invoke('analyze-sleep'),
dataChatQuery: (params) => ipcRenderer.invoke('data-chat-query', params),
onAiBriefReady: (callback) => { ipcRenderer.on('ai-brief-ready', ...); return () => removeListener; },
```

## Existing Persistence (DB — `ai_briefs` table)
```sql
CREATE TABLE ai_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,        -- 'daily' | 'weekly' | 'topic'
  date TEXT NOT NULL,        -- YYYY-MM-DD
  content TEXT,              -- JSON-stringified response
  model_used TEXT,
  tokens_used INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(type, date)
);
```
- Daily Brief: cached in DB by date `type='daily', date=today`
- Weekly Review: cached in DB by week key `type='weekly', date='2026-W23'`
- Topic Digest: cached in DB by date `type='topic', date=today`
- **Patterns, Sleep, Anomalies, Chat: NOT cached anywhere**

## Components Available for Reuse

### GlassCard (`src/components/GlassCard.tsx`)
```typescript
interface GlassCardProps {
  variant?: 'default' | 'elevated' | 'interactive';
  accent?: boolean;          // adds left border
  accentColor?: string;      // hex for left border
  className?: string;
  children: React.ReactNode;
}
// Renders: rounded-xl p-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60
```

### AiBriefCard (`src/components/AiBriefCard.tsx`)
```typescript
interface AiBriefCardProps {
  content: { summary: string; type?: string; modelUsed?: string } | null;
  loading: boolean;
  error?: string;
  onRegenerate: () => void;
  onDismiss: () => void;
  collapsed: boolean;
  onToggle: () => void;
}
// GlassCard with gradient top bar, Sun icon, regenerate/dismiss buttons
```

### WeeklyReviewCard (`src/components/WeeklyReviewCard.tsx`)
```typescript
interface WeeklyReviewContent {
  wentWell: string; watchFor: string; focusSuggestion: string;
  weekStart?: string; weekEnd?: string;
}
// 3-column grid: wentWell (green) | watchFor (amber) | focusSuggestion (purple)
```

### TopicDigestCard (`src/components/TopicDigestCard.tsx`)
```typescript
interface TopicDigestItem {
  topic: string; summary: string; sources?: Array<{ title: string; url: string }>;
}
// Accordion list of topics, expandable with source links
```

### LoadingState (`src/components/LoadingState.tsx`)
```typescript
interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';
  rows?: number;
}
```

## Design Tokens — Galaxy Dark Theme
```
Background:     zinc-950 (base), zinc-900 (elevated), zinc-900/80 (glass)
Text:           zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
Border:         zinc-800/60 (glass), zinc-700 (active)
Card padding:   p-5 (20px) — NEVER p-6 or p-8
Border radius:  rounded-xl (12px) max — NEVER rounded-2xl or rounded-3xl

Accent colors per section (current inline):
- Patterns:     #10b981 (emerald-400)
- Sleep:        #818cf8 (indigo-400)
- Chat:         #f59e0b (amber-400)
- Anomalies:    #ef4444 (red-400)
- Daily Brief:  pink→purple→cyan gradient bar
- Weekly:       green→amber→purple gradient bar
- Research:     cyan-400 icon/title

Animation tokens:
- fast:   150ms (hover, toggles)
- normal: 250ms (content transitions)
- slow:   400ms (page transitions)
- Easing: cubic-bezier(0.16, 1, 0.3, 1)
- NEVER animate width/height/top/left — transform + opacity only
- NEVER use spring physics
- NEVER use box-shadow — use border brightness + glass layers
- NEVER use pure black (#000) — always zinc-950 or similar

Typography:
- Page title:  text-xl font-bold (20px)
- Card title:  text-sm font-semibold (14px)
- Body:        text-sm (14px)
- Meta:        text-xs (12px)
- Badge:       text-[10px] or text-xs uppercase tracking-wider
```

## 21st.dev Available Components
The following 21st.dev components have been found via search:

### Stats Cards
Metric card with icon, value, trend indicator (ArrowUp/ArrowDown):
```tsx
<div className="grid grid-cols-2 gap-6 w-full">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
      <CreditCard className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">$45,231.89</div>
      <div className="flex items-center pt-1 text-xs text-green-600">
        <ArrowUpRight className="mr-1 h-3 w-3" />
        <span>+20.1% from last month</span>
      </div>
    </CardContent>
  </Card>
</div>
```

### Dashboard Overview
Animated metric card with framer-motion hover lift, trend icon (up/down/neutral), configurable icon, value, trendChange:
```tsx
<DashboardMetricCard
  title="Total Users"
  value="2,350"
  icon={Users}
  trendChange="+180"
  trendType="up"
/>
// Framer-motion whileHover={{ y: -4, boxShadow: "..." }}
```

## Constraints
- Tailwind v4 only — no v3 `@tailwind` directives
- No new npm dependencies — only React, framer-motion, lucide-react
- No git commands
- Card padding `p-5`, border radius `rounded-xl` max
- No box-shadow, no animated layout (transform + opacity only)
- Must build with `npm run build` — zero errors
- Types `analyzePatterns`, `analyzeSleep`, `dataChatQuery` are MISSING from the window type declarations in App.tsx (they work at runtime via IPC). The target AI should add them to the type declarations.
