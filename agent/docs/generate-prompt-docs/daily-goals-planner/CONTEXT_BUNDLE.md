# CONTEXT_BUNDLE.md — Daily Goals Planner

## Task
Build a Daily Goals Planner that integrates existing DeskFlow systems (focus tracking, schedule, deadlines, external activity, productivity) into a unified daily planning experience. The AI should be dynamic and handle edge cases. Security must be hardened.

---

## 1. Existing Infrastructure

### Goals DB Table (main.ts:2706-2723)
```sql
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'work',        -- 'work'|'personal'|'health'|'learning'
  target_type TEXT NOT NULL DEFAULT 'time',      -- 'time'|'completion'
  target_seconds INTEGER,
  match_category TEXT,
  status TEXT NOT NULL DEFAULT 'pending',        -- 'pending'|'active'|'completed'|'overdue'|'slipped'|'dismissed'|'suggested'
  period TEXT NOT NULL DEFAULT 'daily',          -- 'daily'|'weekly'|'monthly'|'longterm'
  source TEXT NOT NULL DEFAULT 'manual',         -- 'manual'|'ai'|'ai_assistant'
  links TEXT DEFAULT '[]',
  progress_seconds INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  priority INTEGER DEFAULT 0,
  parent_id TEXT
);
```

### Goal IPC Channels (existing)
```
get-goals(date) → Goal[]            save-goal(date, goal) → void
get-goal(id) → Goal                 delete-goal(id) → void
get-goals-batch(start, end) → Record<date, Goal[]>
save-goals-batch(goals) → void      get-longterm-goals() → Goal[]
suggest-goals(date, ctx) → Goal[]   review-goals(date) → string
get-goal-context() → { stats, topApps }
save-goal-review(date, summary) → void
get-goal-review(date) → GoalReview
link-goal-to-entity(goalId, link) → void
unlink-goal-from-entity(goalId, type, entityId) → void
```

### Focus System
```sql
CREATE TABLE IF NOT EXISTS deep_focus_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL, ended_at TEXT,
  planned_sec INTEGER NOT NULL, actual_sec INTEGER,
  outcome TEXT NOT NULL DEFAULT 'active',     -- 'active'|'completed'|'failed'|'aborted'
  strictness TEXT NOT NULL DEFAULT 'distracting',
  broke_on_type TEXT, broke_on_name TEXT,
  return_count INTEGER NOT NULL DEFAULT 0,
  allowed_json TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
```
Focus IPC: `focus:start`, `focus:end`, `focus:get-state`, `focus:history`

### Schedule Entries
```sql
CREATE TABLE IF NOT EXISTS schedule_entries (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, location TEXT,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL, end_time TEXT NOT NULL,
  category TEXT DEFAULT 'class', color TEXT DEFAULT '#22d3ee',
  is_recurring INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```
Schedule IPC: `get-schedule`, `add-schedule-entry`, `delete-schedule-entry`, `parse-schedule`

### Deadlines
```sql
CREATE TABLE IF NOT EXISTS deadlines (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, course TEXT,
  due_date TEXT NOT NULL, priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending', description TEXT,
  reminder_sent INTEGER DEFAULT 0, notified_at TEXT DEFAULT '{}',
  snoozed_until TEXT, recurrence TEXT, recurrence_end TEXT,
  category TEXT, created_at TEXT DEFAULT (datetime('now'))
);
```
Deadline IPC: `get-deadlines`, `add-deadline`, `update-deadline-status`, `snooze-deadline`, `parse-deadline`

### Productivity Score (main.ts:3909-3947)
```typescript
function calculateProductivityScore(dayLogs): {
  score: number; productive_sec: number; neutral_sec: number;
  distracting_sec: number; total_sec: number; breakdown: Record<string, number>;
}
// Formula: ((productiveSec + (neutralSec * 0.5)) / totalSec) * 100
```
IPC: `get-daily-productivity(date)`, `get-productivity-range(start, end)`

### Session Tracking (logs table)
```sql
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL, app TEXT NOT NULL,
  category TEXT NOT NULL, duration_ms INTEGER NOT NULL,
  title TEXT, project TEXT, keystrokes INTEGER DEFAULT 0,
  url TEXT, domain TEXT, is_browser_tracking INTEGER DEFAULT 0
);
```
IPC: `get-logs-by-period`, `get-stats`, `get-daily-stats`, `get-dashboard-data`

### Browser Tracking
IPC: `get-browser-sessions`, `get-browser-domain-stats`, `get-browser-category-stats`

### Tier Assignments (deskflow-categories.json)
```typescript
tierAssignments: {
  productive: ['IDE', 'AI Tools', 'Education', 'Productivity', 'Tools'],
  neutral: ['Browser', 'Communication', 'Design', 'News', 'Uncategorized', 'Other'],
  distracting: ['Entertainment', 'Social Media', 'Shopping', 'Gaming']
}
```

### GoalStore (renderer-side localStorage)
File: `src/services/GoalStore.ts` — localStorage key `'deskflow_goals'`, Record<string, GoalDay> keyed by date.

### DailyPlannerCard (canvas card)
File: `src/components/ai/canvas/cards/DailyPlannerCard.tsx` — combines schedule + deadlines + goals for today.

---

## 2. What Needs to Be Built

### Core Feature: Daily Goals Planner
A unified view where users set daily goals (e.g., "3 hours project work", "1 hour learning", "30 min piano") and the system:
1. **Tracks progress automatically** by matching goal categories/apps against real session data
2. **Integrates with focus sessions** — when a focus session is active, goal progress updates in real-time
3. **Handles interruptions** — if user switches to a distracting app, the goal pauses (not fails). If they return, it resumes.
4. **Auto-suggests goals** based on schedule (free time blocks), past productivity patterns, and approaching deadlines
5. **Shows a daily timeline** with schedule blocks + goal progress overlay
6. **End-of-day review** — AI-generated summary of what was accomplished vs planned

### Edge Cases the AI Must Handle
- User has no schedule entries → suggest goals based on past patterns
- User has no goals → auto-generate from schedule + deadlines
- Focus session interrupted → goal pauses, resumes on return
- Multiple goals overlap in time → priority-based allocation
- Goal target is 'time' type → track accumulated seconds from matching apps
- Goal target is 'completion' type → boolean done/not-done
- Weekend vs weekday → different goal sets
- Goal parent/child hierarchy → decompose "Study for exam" into sub-tasks
- Goal links to deadline → auto-create goal when deadline is approaching

### Security Hardening (from max-security skill)
- All SQL must use parameterized queries (no string concat)
- Goal titles/descriptions must be sanitized (no XSS via innerHTML)
- Goal data from AI suggestions must be schema-validated before INSERT
- Rate limiting on AI suggestion endpoints (max 10/hour)
- No secrets/keys in goal data
- Goal deletion must cascade properly (child goals, links)
- Session tokens for any auth (if applicable)

---

## 3. Files to Touch

| File | Change |
|------|--------|
| `src/pages/AiPage.tsx` | Add DailyPlannerCard to canvas seeding, integrate with goal progress |
| `src/components/ai/canvas/cards/DailyPlannerCard.tsx` | Enhance with real-time progress tracking, timeline view |
| `src/services/GoalStore.ts` | Add methods for real-time progress updates |
| `src/main.ts` | New IPC: `get-daily-goal-progress`, `get-goal-timeline` |
| `src/preload.ts` | New bridge methods for above |
| `src/components/ai/canvas/cards/WeeklyScheduleCard.tsx` | Show goal overlay on schedule |
| `src/components/ai/canvas/cards/DeadlineTrackerCard.tsx` | Link deadlines to goals |
