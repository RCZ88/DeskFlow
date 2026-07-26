# CONTEXT_BUNDLE.md — AiPage Chatbot Revamp

> **Purpose:** Self-contained codebase reference for target AI to design the AiPage chatbot architecture and News & Goals page split decision.
> **Generated:** 2026-06-15
> **Source Codebase:** DeskFlow Electron App

---

## 1. Current AiPage Architecture

### Route & Navigation
- **Path:** `/ai`
- **Component:** `AiPage.tsx` at `src/pages/AiPage.tsx`
- **Sidebar label:** "AI Assistant" with `Bot` icon (`lucide-react`)
- **Sidebar position:** After "External" (`/external`), before "Insights" (`/reports`)

### Current State (AiPage.tsx — 472 lines)

The page currently has a card-based layout with 3 sections:

**Focus section:** DailyPlanCard, ContextSummaryCard, TodayOverviewCard, AiUsageCard, ProjectStatusCard
**Plan section:** MyPlanCard, LongTermPlanCard
**Reflect section:** TopicDigestCard, GoalHistoryCard

Each section has numbered headers (01/02/03) with zone-specific accent colors (pink/emerald/amber).

### Current Data Fetching
```typescript
// Goal fetching
const day: GoalDay = await window.deskflowAPI!.getGoals(today);

// Topic digest
const r = await window.deskflowAPI!.getTopicDigest();

// Context stats
const contextStats = await window.deskflowAPI!.getGoalContext();

// Planning markdown
const plan = await window.deskflowAPI!.readPlanningMd();

// Long-term goals
const longterm = await window.deskflowAPI!.getLongtermGoals();

// 3 insight cards (via useAiPageData hook with 60s cache)
const { data: aggData } = useAiPageData('dashboardAggregates', () =>
  window.deskflowAPI!.getDashboardAggregates({ period: 'today' })
);
const { data: aiData } = useAiPageData('aiUsage', () =>
  window.deskflowAPI!.getAIUsageSummary('day')
);
const { data: projects } = useAiPageData('projects', () =>
  window.deskflowAPI!.getProjects()
);
```

**Important:** The `useAiPageData` hook uses a module-level ref cache with 60s TTL. This can be reused or removed.

### Current Components Used
| Component | Type | Variant |
|-----------|------|---------|
| `DailyPlanCard` | Goal list + suggest | Internal mode-aware (pink/emerald/amber) |
| `ContextSummaryCard` | Weekly stats | GlassCard variant="compact" |
| `TodayOverviewCard` | Today's app KPIs | GlassCard (data insight card) |
| `AiUsageCard` | AI token/cost stats | GlassCard (data insight card) |
| `ProjectStatusCard` | Active projects | GlassCard (data insight card) |
| `MyPlanCard` | Markdown planner | GlassCard variant="notebook" |
| `LongTermPlanCard` | Long-term goals | GlassCard variant="subtle" |
| `TopicDigestCard` | AI topic summaries | GlassCard variant="bordered" |
| `GoalHistoryCard` | Goal completion history | GlassCard variant="interactive" |

---

## 2. All Available IPC Endpoints (Chatbot-Relevant)

### Goal CRUD (preload.ts:692-704)
```typescript
getGoals(date: string): Promise<GoalDay>
getLongtermGoals(): Promise<{ success: boolean; goals: Goal[] }>
saveGoal(date: string, goal: Goal): Promise<void>
deleteGoal(goalId: string): Promise<{ success: boolean }>
saveGoalReview(date: string, summary: string): Promise<{ success: boolean }>
getGoalContext(): Promise<{ success: boolean; last7dByCategory: any }>
parseGoalFeedback(params: { message: string; goals: Goal[] }): Promise<{ completed: string[]; added: string[] }>
suggestGoals(date: string, ctx: Record<string, any>): Promise<{ success: boolean; suggestions: Goal[] }>
reviewGoals(date: string): Promise<{ success: boolean; review: string }>
```

### AI Features (preload.ts)
```typescript
getTopicDigest(): Promise<{ success: boolean; topics: Array<{ topic: string; summary: string }> }>
getAIUsageSummary(period: 'day' | 'week' | 'month'): Promise<{ totalTokens: number; totalCost: number; byTool: Record<string, any> }>
getDashboardAggregates(params: { period: string }): Promise<any>
readPlanningMd(): Promise<{ content: string | null }>
writePlanningMd(content: string): Promise<{ success: boolean }>
```

### App Data & Navigation
```typescript
getProjects(): Promise<Project[]>
getAppStats(date: string): Promise<AppStat[]>
getDailyStats(startDate: string, endDate: string): Promise<DailyStat[]>
getLogsByPeriod(period: string): Promise<Log[]>
executeCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; error?: string }>
```

### Events
```typescript
// Main → Renderer push events
onAiBriefReady(callback: (data: any) => void): void
onContextChanged(callback: (data: any) => void): void
```

### React Router Navigation
Navigation is purely client-side. No IPC navigate method exists. Pages use `useNavigate()` from `react-router-dom`.

---

## 3. Existing Pages (Where "News" & Stats Live)

| Page | Path | Purpose |
|------|------|---------|
| `DashboardPage` | `/` | Activity heatmap, weekly overview, recent sessions |
| `StatsPage` | `/stats` | Per-app detailed stats |
| `ProductivityPage` | `/productivity` | Productivity scores, daily trend |
| `BrowserActivityPage` | `/browser` | Browser activity by domain |
| `ExternalPage` | `/external` | External activities, sleep tracking, manual timer |
| `IDEProjectsPage` | `/ide` | IDE projects, AI agent usage analytics |
| `InsightsPage` | `/reports` | Sleep trends, consistency, typical day, DORA metrics |
| `SettingsPage` | `/settings` | App config, categories, providers |
| `TerminalPage` | `/terminal` | AI terminal sessions, multi-pane split layout |

---

## 4. Design System Tokens

```css
/* Galaxy dark theme colors */
--color-zinc-950: #09090b;    /* Page background */
--color-zinc-900: #18181b;    /* Container bg */
--color-zinc-800: #27272a;    /* Border/card bg */
--color-zinc-700: #3f3f46;    /* Subtle border */
--color-zinc-400: #a1a1aa;    /* Muted text */
--color-zinc-500: #71717a;    /* Even more muted */

/* Accent colors (used per zone) */
--color-pink-400: #f472b6;    /* Focus section */
--color-emerald-400: #34d399; /* Plan section */
--color-amber-400: #fbbf24;   /* Reflect section */

/* GlassCard styling pattern */
bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-xl

/* Chat-style patterns (used in Terminal): */
bg-zinc-900/60 border border-zinc-800/40 rounded-lg  /* Message container */
bg-zinc-800/40 px-4 py-3 rounded-lg                    /* User message */
bg-zinc-900/60 px-4 py-3 rounded-lg                    /* AI message */
```

---

## 5. Existing Chat-like UI Patterns

### TerminalPage has a chat-like input (Quick Send):
```tsx
// Quick Send input bar at TerminalPage.tsx
<div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/80 border-t border-zinc-800/50">
  <input className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-4 py-2 text-sm text-white" />
  <button className="px-4 py-2 bg-pink-500/20 text-pink-300 rounded-lg text-sm font-medium">Send</button>
</div>
```

### InstructionPanel (used in Terminal):
```tsx
// Message thread pattern with role bubbles
<div className="flex flex-col gap-3">
  <div className="flex items-start gap-3">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 flex items-center justify-center">
      <User className="w-3.5 h-3.5 text-pink-400" />
    </div>
    <div className="flex-1 bg-zinc-900/50 border border-zinc-800/40 rounded-lg px-4 py-3">
      {user message content}
    </div>
  </div>
  <div className="flex items-start gap-3">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
      <Bot className="w-3.5 h-3.5 text-emerald-400" />
    </div>
    <div className="flex-1 bg-zinc-900/60 border border-zinc-800/40 rounded-lg px-4 py-3">
      {ai response content}
    </div>
  </div>
</div>
```

---

## 6. Safety & Restriction Patterns

No existing safety system. The app has:
- `electron:execute-command` IPC that runs shell commands (dangerous if exposed to AI)
- Goal CRUD via IPC (safe, bounded operations)
- `writePlanningMd` (writes to a specific file)
- React Router navigation (client-side only, safe)

No permission/action-approval system exists. Would need to be designed.

---

## 7. Key Design Tokens & CSS Patterns

```css
/* Font stack */
font-family: system-ui, -apple-system, sans-serif;

/* Page container */
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8

/* Glass effect */
bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-xl

/* Input styling */
bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-4 py-2 text-sm text-white
placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50

/* Button primary */
bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white rounded-lg px-4 py-2 text-sm font-medium
hover:from-pink-400 hover:to-fuchsia-400 transition-all duration-200

/* Button secondary */
bg-zinc-800/70 text-zinc-300 border border-zinc-700/40 rounded-lg px-4 py-2 text-sm
hover:bg-zinc-700/70 transition-all duration-200

/* Scrollbar */
::-webkit-scrollbar-thumb { background: rgba(113, 113, 122, 0.3); border-radius: 9999px; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
```

---

## 8. Goal Data Schema

```typescript
interface Goal {
  id: string;                    // UUID
  title: string;                 // Goal title
  description?: string;          // Optional description
  category: 'work' | 'personal' | 'health' | 'learning';
  target: {
    type: 'time' | 'completion';
    targetSeconds?: number;      // For time-based goals
    matchCategory?: string;      // App category to track against
    done?: boolean;
  };
  period: 'daily' | 'longterm';
  status: 'pending' | 'completed' | 'dismissed';
  date: string;                  // YYYY-MM-DD for daily, any for longterm
  source: 'ai' | 'manual';
  links: { label: string; url: string }[];
  progressSeconds?: number;
  createdAt: string;             // ISO timestamp
  completedAt?: string;          // ISO timestamp
}

interface GoalDay {
  date: string;
  goals: Goal[];
  reviewSummary?: string;
}
```

---

## 9. Current AiPage Mode System

```typescript
type Mode = 'morning' | 'in-progress' | 'review';
const modeConfig = {
  morning:      { label: 'Morning Planning', accent: 'amber',  desc: 'Set your intentions' },
  'in-progress':{ label: 'In Progress',       accent: 'emerald',desc: 'Working through goals' },
  review:       { label: 'Evening Review',    accent: 'pink',   desc: 'Reflect on your day' },
};
```

Mode is determined by time of day + goal completion state. Currently used for page header badge.

---

## 10. All Route Paths

```
/  → DashboardPage
/stats → StatsPage
/productivity → ProductivityPage
/browser → BrowserActivityPage
/ide → IDEProjectsPage
/external → ExternalPage
/ai → AiPage (THIS IS THE TARGET)
/reports → InsightsPage
/database → DatabasePage
/settings → SettingsPage
/tutorial → TutorialPage
/terminal → TerminalPage
```
