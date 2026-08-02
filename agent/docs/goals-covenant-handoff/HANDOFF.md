# Goals + Covenant Page Combination — Context Handoff (2026-07-30)

## TL;DR / Mission

Combine the Goals system (dashboard GoalsCard + AI page goal creation) with the Covenant/Streak system ( LifePage `/life`) into a **dedicated Goals Page** with proper full-page UI. The goal: users can manually create, customize, and track goals with specific criteria (time on app, spending, completion) without relying on AI. The AI should help but never be the only way to create goals.

## Current Status

- **Dashboard GoalsCard**: basic add/edit (title, category, period, target type + hours). Missing: links, schedule linking, habit/cadence, priority
- **AI System Page**: creates goals but hardcodes `target: { type: 'completion' }` and `period: 'daily'` — drops time-based targets from AI suggestions
- **Covenant system** (`/life`): localStorage-based, separate from Goals. Has streaks, reflections, journal, auto-detection. Shares DB table columns but no code integration
- **No dedicated full-page view** for goals management
- **No per-day customization** (goals are just daily/weekly/monthly)
- **No custom criteria UI** (app tracking, spending thresholds, etc.)

## Key Decisions & Rationale

1. **Dedicated Goals Page** (not enhanced dashboard modals) — user chose this approach. A full page gives room for calendar view, criteria builder, and long-term goals without cluttering the dashboard.
2. **Combine with Covenant** — the Covenant already has streaks, reflections, journal, and auto-detection. Goals should integrate with these, not duplicate them.
3. **Manual UI is primary** — AI can suggest goals, but the user must be able to create/edit everything manually. The AI should fill in missing fields via chat but provide UI for input.
4. **Per-day customization** — goals should support day-specific targets (e.g., "30 min on Monday, 60 min on Wednesday").

## Constraints & Gotchas

- **Covenant is localStorage-based** — goals are SQLite. Need to decide: migrate Covenant to SQLite, or keep both systems parallel?
- **Goal type has unused fields** — `isHabit`, `cadence`, `weeklyTargetDays`, `detection`, `linkedScheduleId`, `journalText`, `slippedCount` exist in DB schema but nothing in the UI exposes them
- **AI always creates completion-type goals** — even when AI suggests time targets, AiPage hardcodes `target: { type: 'completion' }`. Need to fix this.
- **No test suite** — manual verification only
- **Build: `npx vite build` then `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`**

## Artifacts & References

| File | Purpose |
|------|---------|
| `src/components/dashboard/GoalsCard.tsx` | Dashboard goal card (666 lines) |
| `src/components/dashboard/DeadlinesCard.tsx` | Dashboard deadline card (541 lines) |
| `src/components/dashboard/types.ts` | Goal, Deadline, LongTermGoal type definitions |
| `src/features/covenant/CovenantPage.tsx` | Covenant page (streaks, reflections) |
| `src/features/covenant/types.ts` | Commitment, DayCompletion, StreakStats types |
| `src/features/covenant/useCovenant.ts` | Covenant state hook (localStorage) |
| `src/features/covenant/streak.ts` | Streak computation logic |
| `src/features/covenant/NewCommitmentModal.tsx` | Create/edit commitment form |
| `src/features/warmth/LifePage.tsx` | Tabbed wrapper (Covenant + Memories) |
| `src/pages/AiPage.tsx` | AI goal creation (lines 900-1130) |
| `src/main.ts` | IPC handlers, DB schema (lines 2722-2751 for schema, 15984-16179 for goals IPC) |
| `src/preload.ts` | IPC bridge (lines 881-923 for goals) |

## State of the Code / Data

### Goal Type (dashboard/types.ts)
```typescript
interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory; // 'work' | 'personal' | 'health' | 'learning' | 'finance' | 'relationships'
  target: GoalTarget; // { type: 'time' | 'completion', targetSeconds?, matchCategory?, done? }
  period: GoalPeriod; // 'daily' | 'weekly' | 'monthly'
  status: GoalStatus; // 'active' | 'done' | 'archived' | 'failed'
  date: string; // YYYY-MM-DD
  source: GoalSource; // 'manual' | 'ai'
  links: GoalLink[];
  progressSeconds?: number;
  completedAt?: string;
  parentId?: string; // links to LongTermGoal
  streak?: number;
  createdAt: string;
  // Unused in UI:
  isHabit?: boolean;
  cadence?: 'daily' | 'weekly';
  weeklyTargetDays?: number[];
  detection?: { enabled: boolean; mode: 'positive' | 'avoidance'; keywords: string[]; minMinutes: number };
  linkedScheduleId?: string;
  journalText?: string;
  slippedCount?: number;
}
```

### Commitment Type (covenant/types.ts)
```typescript
interface Commitment {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: WarmColorKey; // 'clay' | 'sage' | 'amber' | 'sky'
  cadence: CommitmentCadence; // 'daily' | 'weekly'
  weeklyTargetDays: number[];
  targetDays?: number;
  detection: { enabled: boolean; mode: DetectionMode; keywords: string[]; minMinutes: number };
  requireJournal?: boolean;
  autoConfirmWhenClean?: boolean;
  createdAt: number;
  archivedAt: number | null;
}
```

### IPC Endpoints (Goals)
- `getGoals(date)` → `{ date, reviewSummary, goals: Goal[] }`
- `saveGoal(date, goal)` → `{ success }`
- `deleteGoal(goalId)` → `{ success }`
- `getLongtermGoals()` → `{ success, goals: LongTermGoal[] }`
- `suggestGoals(date, ctx)` → `{ success, suggestions }` (calls LLM)

### IPC Endpoints (Deadlines)
- `getDeadlines(opts?)` → deadlines array
- `addDeadline(dl)` → `{ success }`
- `updateDeadline(id, patch)` → `{ success }`
- `deleteDeadline(id)` → `{ success }`

### DB Schema (goals table)
```sql
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'work',
  target_type TEXT NOT NULL DEFAULT 'time',
  target_seconds INTEGER,
  match_category TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  period TEXT NOT NULL DEFAULT 'daily',
  source TEXT NOT NULL DEFAULT 'manual',
  links TEXT DEFAULT '[]',
  progress_seconds INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  -- ALTER TABLE additions:
  priority INTEGER DEFAULT 0,
  parent_id TEXT,
  is_habit INTEGER DEFAULT 0,
  cadence TEXT,
  weekly_target_days TEXT,
  detection TEXT,
  linked_schedule_id TEXT,
  journal_text TEXT,
  slipped_count INTEGER DEFAULT 0
);
```

## Open Tasks / Next Actions

1. **Design the Goals Page layout** — calendar strip, goal list, criteria builder, long-term goals section
2. **Integrate Covenant streaks into Goals** — when a goal has `cadence` and `weeklyTargetDays`, show streak flame and progress
3. **Fix AI goal creation** — AiPage should preserve time-based targets from AI suggestions, not hardcode completion type
4. **Build the criteria builder UI** — visual form for setting up time-based, completion-based, app-tracking, and custom criteria
5. **Add per-day customization** — allow different targets for different days of the week
6. **Wire up existing IPC endpoints** — goals CRUD already exists, just needs proper UI
7. **Decide on Covenant migration** — keep localStorage or migrate to SQLite?

## Glossary / Key Entities

- **Goal** — a daily/weekly/monthly target with criteria (time, completion, app tracking)
- **Commitment** — a Covenant streak item with auto-detection and journal
- **LongTermGoal** — a goal with `period: 'longterm'`, parent of daily goals
- **Deadline** — a time-bound task with priority and due date
- **Covenant** — the streak/consistency system at `/life`
- **Detection** — auto-completion via foreground app tracking (positive = accumulate time, avoidance = flag violations)
- **Milestone** — streak thresholds: 3, 7, 14, 30, 60, 100, 180, 365 days

## How to Resume

1. Read this handoff document
2. Read `src/components/dashboard/types.ts` for Goal/Deadline types
3. Read `src/features/covenant/types.ts` for Commitment types
4. Read `src/features/covenant/CovenantPage.tsx` for current Covenant UI
5. Read `src/components/dashboard/GoalsCard.tsx` for current Goals UI
6. Read `src/pages/AiPage.tsx` lines 900-1130 for AI goal creation
7. Decide: separate GoalsPage route or enhance LifePage tabs?
