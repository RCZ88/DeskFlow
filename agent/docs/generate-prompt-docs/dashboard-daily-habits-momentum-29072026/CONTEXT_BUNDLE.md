# CONTEXT_BUNDLE.md — Dashboard Daily Habits + Momentum System

## 1. Raw Request (Verbatim)

> "i thought we're talking about the momentum and stuff? THE MOMENTUM OF THE DASHBOARD. how can we make so that the momentum is connected to the daily goals so that its always the streaks and goals to always have the daily goals for every single day, the consistency program. connected to the schedules and ai assistant. idk how to engineer and like arrange these features and have a proper ui that combine the covenant page with the ai features of the schedules and stuff, and how it should be displayed on the dashboard."

## 2. Problem Statement

The dashboard currently has three disconnected systems:
1. **Goals** (SQLite DB via IPC) — daily goals with AI suggestions, CRUD, streak tracking
2. **Covenant/Commitments** (localStorage) — habit tracker with streaks, auto-detection, journal, milestones
3. **Schedule** (SQLite DB via IPC) — weekly time blocks with categories

The user wants a **unified momentum system** where:
- Daily goals are generated EVERY DAY (consistency program)
- Momentum score reflects goal completion + streak + schedule adherence
- The AI assistant generates context-aware daily goals from long-term goals + schedule
- A "covenant-like" commitment UI is brought INTO the dashboard (not hidden on a separate page)
- Everything fits on one screen without excessive scrolling

## 3. Current Architecture

### 3A. Goals System (SQLite DB)

**Types** (`src/components/dashboard/types.ts`):
```typescript
interface Goal {
  id: string; title: string; description?: string;
  category: GoalCategory; target: GoalTarget; period: GoalPeriod;
  status: GoalStatus; date: string; source: GoalSource;
  links: GoalLink[]; progressSeconds?: number; completedAt?: string;
  parentId?: string; streak?: number; createdAt: string;
}
type GoalCategory = 'work' | 'personal' | 'health' | 'learning' | 'finance' | 'relationships';
type GoalPeriod = 'daily' | 'weekly' | 'monthly';
type GoalStatus = 'active' | 'done' | 'archived';
type GoalSource = 'manual' | 'ai';
```

**Key IPC endpoints:**
- `get-goals(date)` → fetches goals for a specific date
- `save-goal(date, goal)` → INSERT OR REPLACE
- `suggest-goals(date, ctx)` → AI generates 3-5 goals linked to long-term goals via parentId
- `review-goals(date)` → AI reviews pending goals, suggests slip/dismiss/reprioritize
- `get-daily-goal-progress(date, goals)` → queries logs table for time-based goal progress
- `get-goal-timeline(date)` → combines schedule + goals + log data into unified timeline
- `get-consistency-score(period)` → computes consistency from external_sessions over 4 weeks

**AI Suggestion Prompt** (`suggest-goals` handler):
```
You are a daily goal planner. Based on the user's activity data, suggest 3-5 SMART goals
for today. Return ONLY a JSON array with keys: title, category, target, parentId.
CRITICAL: Every daily goal MUST link to a long-term goal via parentId.
```
Context injected: long-term goals, unfinished from yesterday, recently completed, planning content.

### 3B. Covenant System (localStorage)

**Types** (`src/features/covenant/types.ts`):
```typescript
interface Commitment {
  id: string; name: string; description?: string;
  icon: string; color: WarmColorKey; // 'clay' | 'sage' | 'amber' | 'sky'
  cadence: CommitmentCadence; // 'daily' | 'weekly'
  weeklyTargetDays: number[]; // 0-6
  detection: { enabled: boolean; mode: DetectionMode; keywords: string[]; minMinutes: number; };
  requireJournal?: boolean; autoConfirmWhenClean?: boolean;
  createdAt: number; archivedAt: number | null;
}
interface DayCompletion { commitmentId: string; date: string; completedAt: number; source: 'manual' | 'detected'; }
interface DayViolation { commitmentId: string; date: string; detectedAt: number; }
interface StreakStats { current: number; longest: number; totalCompletions: number; lastCompletedDate: string | null; justReset: boolean; }
```

**Key features:**
- Streak computation engine (`computeStreakStats`) with milestones: [3, 7, 14, 30, 60, 100, 180, 365]
- Auto-detection via foreground window matching (positive/avoidance modes)
- Journal entries with voice notes
- Grace-reset contemplative messaging
- Constellation hero visualization
- All stored in localStorage (NOT SQLite)

### 3C. Schedule System (SQLite DB)

**Types:**
```typescript
interface ScheduleEntry {
  id: string; title: string; location?: string;
  day_of_week: number; // 0-6
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  category?: ScheduleCategory; // 'class' | 'lab' | 'study' | 'exam' | 'meeting' | 'other'
  color?: string; createdAt: string;
}
```

**Key IPC:**
- `get-schedule()` → all entries ordered by day_of_week, start_time
- `get-schedule-templates()` → built-in + custom templates
- `apply-schedule-template(templateId)` → bulk insert

### 3D. Dashboard Data Layer

**`useDashboardData` hook** — single source of truth:
- Fetches: goals, deadlines, schedule, longTermGoals
- Computes insights: streak (max goal.streak), momentum (weighted score), completionRate, categoryBalance, urgentDeadlines, focusTimeMinutes
- CRUD: addGoal, updateGoal, deleteGoal, toggleGoal, addDeadline, etc.
- AI: generateSuggestions, acceptSuggestion, dismissSuggestion

**Momentum formula** (current, in `calculateInsights`):
```typescript
const momentum = Math.min(100, Math.round(
  (recentCompletions * 10) + (streak * 5) + (completionRate * 0.3)
));
```
Where `recentCompletions` = goals completed in last 7 days.

### 3E. Consistency Score IPC

```typescript
// get-consistency-score handler (main.ts:19548)
// Computes consistency from external_sessions over 4 weeks
// Returns: { score (0-100), weekly_comparison[], this_week, last_week, trend, streak }
// Target: 30h/week. Streak = consecutive weeks at 80%+ of target.
```

## 4. Data Flow gaps

1. **Goals and Covenant are completely separate** — no shared data model, no cross-references
2. **Momentum is computed client-side only** from goal completions — doesn't factor in schedule adherence or covenant commitments
3. **Daily goals are NOT auto-generated** — user must click "Generate Goals" manually
4. **Schedule is read-only on dashboard** — no connection to goals (e.g., "study for 2h during study block" → auto-track progress)
5. **Consistency score** exists but is NOT displayed on the dashboard — it's only on InsightsPage

## 5. Design System

- **Background:** zinc-950 (#09090b)
- **Surface:** zinc-900 (#18181b)
- **Glass:** bg-zinc-900/50 backdrop-blur-xl or bg-[rgba(24,24,27,0.60)]
- **Card radius:** rounded-xl (12px)
- **Card padding:** p-5 (20px)
- **Fonts:** Geist (body, 13px), JetBrains Mono (numbers/code)
- **Accent colors:** violet-500 (goals), rose-500 (deadlines), pink-500 (schedule), amber-500 (insights/streaks)
- **Motion:** cubic-bezier(0.16, 1, 0.3, 1), 150-300ms transitions
- **Top-edge gradient highlights** on cards: `h-px bg-gradient-to-r from-{accent}-500/30 via-{accent}-500/10 to-transparent`
- **Components used:** GlareHover, SpotlightCard, AnimatedShinyText, NumberTicker, BorderBeam, BlurFade

## 6. Related IPC Endpoints (full list)

| Channel | Purpose |
|---------|---------|
| `get-goals` | Fetch goals for date |
| `get-goals-batch` | Batch fetch across date range |
| `save-goal` | Create/update goal |
| `delete-goal` | Delete goal |
| `get-longterm-goals` | Fetch long-term goals |
| `suggest-goals` | AI generate daily goals |
| `review-goals` | AI review pending goals |
| `parse-goal-feedback` | Parse natural language goal feedback |
| `get-daily-goal-progress` | Time-based goal progress from logs |
| `get-goal-timeline` | Unified schedule + goals + logs timeline |
| `get-goal-context` | Last 7 days stats for AI context |
| `get-schedule` | All schedule entries |
| `add-schedule-entry` | Create schedule entry |
| `update-schedule-entry` | Update schedule entry |
| `delete-schedule-entry` | Delete schedule entry |
| `get-schedule-templates` | Fetch templates |
| `apply-schedule-template` | Apply template |
| `get-consistency-score` | Weekly consistency from external sessions |
| `get-deadlines` | Fetch deadlines |
| `add-deadline` | Create deadline |
| `update-deadline` | Update deadline |
| `delete-deadline` | Delete deadline |
