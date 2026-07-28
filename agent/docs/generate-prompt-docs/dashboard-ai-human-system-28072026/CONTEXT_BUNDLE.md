# CONTEXT_BUNDLE.md — Dashboard AI+Human System

## Raw Request (Verbatim)
"the scheduling system AND THE OVERALL UI. THERE NO GOOD LOOKING AI ON THE DASHBOARD SCHEDULED DAILY CARDS THE ADDITION AND THE FEATURES ARE STILL SHIT. THE AGENT SYSTEM THAT ADDS THOSE AND HOW THE HUMAN CAN HAVE THE TOOLS AND UI TO HAVE THE SAME ABILITY WITH ALL OF THE FEATURES. LEADING TO WHICH LONG TERM GOAL IT IS. AND EVERYTHING RELATED TO THE BEST UI AND ALL OF THE FEATURES. some other features that might be useful that i dont know of YET"

## Core Vision
A dashboard where:
1. **AI automatically generates daily goals** from long-term goals + app usage patterns
2. **Every daily goal shows WHICH long-term goal it serves** (parent-child link)
3. **Human has the same tools** to add/edit/delete goals, deadlines, schedules
4. **Everything connects**: long-term goal → daily goal → deadline → schedule → focus session → app tracking → daily survey
5. **Best UI possible** using real MCP components

## Data Structures

### Goal (Daily) — src/components/ai/types.ts
```typescript
interface Goal {
  id: string
  title: string
  description?: string
  category: GoalCategory  // "work" | "personal" | "health" | "learning" | "finance" | "relationships"
  target: GoalTarget      // { type: "time" | "completion", targetSeconds?: number, matchCategory?: string }
  period: string          // "daily" | "weekly" | "monthly"
  status: "active" | "done" | "missed"
  date: string            // YYYY-MM-DD
  source: string          // "ai" | "manual"
  links: GoalLink[]
  progressSeconds?: number
  createdAt: string
  completedAt?: string
  parentId?: string       // LINKS TO LONG-TERM GOAL
}
```

### LongTermGoal — src/components/ai/types.ts
```typescript
interface LongTermGoal {
  id: string
  title: string
  description?: string
  category: GoalCategory
  status: "active" | "done" | "missed"
  target_seconds?: number
  priority: number
  createdAt?: string
  completedAt?: string
  links?: any[]
  parentId?: string
}
```

### GoalStore (localStorage) — src/services/GoalStore.ts
```typescript
const GoalStore = {
  loadAll(): Record<string, GoalDay>
  getDay(date: string): GoalDay
  saveDay(day: GoalDay)
  saveGoal(goal: Goal)
  accumulateProgress(goalId: string, seconds: number)
  getAccumulated(goalId: string): number
  setFocusLinkedGoal(goalId: string | null)
  getFocusLinkedGoal(): string | null
}
```

## IPC Endpoints

### Goals
- `getGoals(date)` → `{ goals: Goal[], reviewSummary?: string }`
- `saveGoal(date, goal)` → saves/updates goal
- `deleteGoal(goalId)` → deletes goal
- `getLongtermGoals()` → `{ success, goals: LongTermGoal[] }`
- `saveGoalsBatch(goals)` → saves multiple goals
- `suggestGoals(date, ctx)` → AI suggests daily goals
- `getGoalContext()` → `{ last7dByCategory, yesterday }`
- `getDailyGoalProgress(date, goals)` → progress data
- `getGoalTimeline(date)` → timeline data
- `reviewGoals(date)` → AI reviews incomplete goals

### suggestGoals System Prompt (src/main.ts:16821)
```
You are a daily goal planner. Based on the user's activity data, suggest 3-5 SMART goals for today.
Return ONLY a JSON array of objects with keys:
- title (string)
- category ("work"|"personal"|"health"|"learning")
- target ({type:"time", targetSeconds?: number} or {type:"completion", done: false})

The user's long-term goals are:
${ctx.longtermGoals.map(g => `- ${g.title} (${g.category})`).join('\n')}
Suggest daily goals that make progress toward these long-term goals.
```

**MISSING**: The system prompt does NOT ask the AI to include `parentId` or show which long-term goal each daily goal serves. This is the core gap.

### Deadlines
- `getDeadlines({ days?, course? })` → `{ deadlines }`
- `addDeadline(dl)` → `{ success, id }`
- `updateDeadline(id, patch)` → `{ success }`
- `updateDeadlineStatus(id, status)` → `{ success }`
- `deleteDeadline(id)` → `{ success }`

### Schedule
- `getSchedule()` → `{ entries }`
- `addScheduleEntry(entry)` → `{ success, id }`
- `updateScheduleEntry(id, patch)` → `{ success }`
- `deleteScheduleEntry(id)` → `{ success }`

## Available MCP Components

### Magic UI (src/components/ui/)
| Component | Source | Use For |
|-----------|--------|---------|
| magic-card.tsx | Magic UI | StatusBand mouse spotlight (orb mode) |
| glare-hover.tsx | Magic UI | Every goal/deadline/schedule item hover |
| border-beam.tsx | Magic UI | Active states, current items |
| number-ticker.tsx | Magic UI | Progress counters, streaks |
| animated-circular-progress-bar.tsx | Magic UI | Goal progress rings |
| animated-shiny-text.tsx | Magic UI | Timer display, headers |
| animated-gradient-text.tsx | Magic UI | Section headers |
| blur-fade.tsx | Magic UI | Page entrance animation |
| particles.tsx | Magic UI | Background ambiance |
| confetti.tsx | Magic UI | Goal completion, streak milestones |
| dot-pattern.tsx | Magic UI | Page background |
| shimmer-button.tsx | Magic UI | Button with shimmer perimeter |

### shadcn (src/components/ui/)
| Component | Source | Use For |
|-----------|--------|---------|
| button.tsx | shadcn | All buttons |
| input.tsx | shadcn | Form inputs |
| badge.tsx | shadcn | Category/priority labels |
| select.tsx | shadcn | Dropdowns (base-ui) |
| popover.tsx | shadcn | Date pickers |
| calendar.tsx | shadcn | Date selection |
| dialog.tsx | shadcn | Modals |
| tabs.tsx | shadcn | Tab navigation |
| switch.tsx | shadcn | Toggles |
| skeleton.tsx | shadcn | Loading states |
| progress.tsx | shadcn | Progress bars |
| scroll-area.tsx | shadcn | Scrollable areas |

### Lucide Icons
Target, Check, Plus, X, Edit3, Trash2, Calendar, Clock, MapPin, Globe, Monitor, Zap, Sparkles, Brain, RefreshCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Flag, Play, Pause, Link as LinkIcon, Flame, TrendingUp, TrendingDown, Gauge, ClipboardCheck, MessageSquare, Send, ArrowRight

## Design Tokens (src/index.css)
- Background: `#09090b` (zinc-950)
- Surface: `#18181b` (zinc-900)
- Border: `rgb(39 39 42 / 0.6)` (zinc-800/60)
- Accent: `#06b6d4` (cyan)
- Fonts: Inter (body), JetBrains Mono (mono), Source Serif 4 (serif)
- Glass: `bg-zinc-900/80 backdrop-blur-xl`
- Rounded: max `rounded-xl` (12px)
- Padding: `p-5` (20px)
- Animation: fast 150ms, normal 250ms, slow 400ms
- Easing: cubic-bezier(0.16, 1, 0.3, 1)

## What Needs to Be Fixed

### 1. suggestGoals System Prompt (src/main.ts:16826)
**Current**: Asks AI to suggest goals but doesn't ask for parentId
**Fix**: Update prompt to ask AI to include `parentId` field linking to long-term goal

### 2. GoalsCard (src/components/dashboard/GoalsCard.tsx)
**Current**: Shows goals but doesn't show parent long-term goal
**Fix**: Add "→ Serves: [Long-term goal title]" display for each goal

### 3. DashboardPage (src/pages/DashboardPage.tsx)
**Current**: Loads goals but doesn't pass long-term goals context
**Fix**: Load long-term goals on mount, pass to suggestGoals, display connection

### 4. Missing Components
**Current**: No StreakCard, MomentumScore, DailySurveyCard
**Fix**: Create these components (already started)

### 5. Goal-parent Connection
**Current**: Goal type has optional `parentId` but it's not used
**Fix**: AI generates goals with parentId, frontend displays connection
