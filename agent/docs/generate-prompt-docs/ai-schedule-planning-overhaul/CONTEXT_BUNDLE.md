# CONTEXT_BUNDLE.md — Schedule, Planning & Reminder System Overhaul

## Problem

The user is a student who needs to stay on track with schedules, deadlines, and daily goals. The current system has:

1. **Calendar connector (CalDAV)** — works but fragile (regex parsing, 7-day window, no recurring events, many school apps can't connect via CalDAV/IMAP)
2. **Reminders** — basic CRUD exists but no notifications, no due-date sorting, no recurring, no integration with calendar
3. **Daily goals (FocusBoard)** — loads goals, toggles done, AI suggestions, evening review. But `focusSeconds` is always 0, no goal creation UI
4. **Long-term goals (PlanBoard)** — full CRUD, brain-dump AI parse, planning notes. But no drag-to-reorder, brain-dump requires AI provider
5. **Reflect timeline** — shows past days with goal completion. No calendar/app usage correlation

**The core gap:** School schedules, campus apps, LMS platforms (Canvas, Google Classroom, etc.) can't be connected agentically. The user needs a system that works WITHOUT external API connections — something they can quickly input schedules into and get reminded about.

## What Exists (DB Schema)

### reminders table (main.ts:2728-2738):
```sql
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  due_date TEXT,
  goal_id TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)
```

### goals table (used by FocusBoard):
- id, title, description, category, status (active/done/missed), date, target_seconds, source, created_at, completed_at

### longterm_goals table (used by PlanBoard):
- id, title, description, category, status, priority, period, date, target_seconds, created_at, completed_at

### planning.md (used by PlanBoard):
- Markdown checklist parsed by planningParser.ts
- Format: `- [ ] Task title (2h)` or `- [x] Done task`

### connectors + connector_items tables:
- connectors: id, type (email/calendar), provider (imap/caldav), config, status
- connector_items: connector_id, item_type (email/event/reminder), subject, summary, date, metadata

## What Works

- CalDAV sync: add, test, sync, query calendar events (7-day window)
- Reminders: create, list, toggle done, delete
- Daily goals: load, toggle done/active, AI suggestions, evening review
- Long-term goals: full CRUD, brain-dump AI parse
- Planning notes: auto-save markdown
- AI chat integration: reminder_create, goal_event_link parsed card types
- Connector setup wizard: polished multi-step with provider presets

## What's Broken/Missing

- CalDAV regex parsing is fragile (no folded lines, no RRULE)
- No recurring events or reminders
- No desktop notifications for reminders
- No due-date sorting on reminders
- No calendar grid/view (events only in drawer)
- School/LMS apps can't connect via CalDAV/IMAP
- No quick schedule input (must go through connector setup)
- focusSeconds always 0
- No goal creation UI in FocusBoard (only via AI or planning.md)
- No weekly/monthly aggregation view

## Key Files

- `src/pages/AiPage.tsx` — main AI page, orchestrates all boards
- `src/components/ai/focus/FocusBoard.tsx` (321 lines) — today's goals
- `src/components/ai/plan/PlanBoard.tsx` (781 lines) — long-term goals + notes
- `src/components/ai/reflect/ReflectFeed.tsx` (156 lines) — past days timeline
- `src/components/ai/connectors/ConnectorsPanel.tsx` (494 lines) — connector management
- `src/components/ai/reminders/GoalsRemindersDrawer.tsx` (364 lines) — events/goals/reminders drawer
- `src/services/planningParser.ts` — markdown checklist parser
- `src/main.ts` (lines 15623-16105) — reminder + connector IPC handlers
- `src/main.ts` (lines 2728-2787) — DB schema for reminders, goals, connectors

## IPC Endpoints

### Reminders:
- `get-reminders` → SELECT all, ordered by created_at ASC
- `create-reminder` → INSERT with id, text, due_date, goal_id
- `toggle-reminder` → UPDATE done flag
- `delete-reminder` → DELETE by id

### Goals:
- `getGoals(date)` → SELECT goals for a specific date
- `createGoal`, `updateGoal`, `deleteGoal` → CRUD
- `getLongtermGoals()` → SELECT all long-term goals
- `saveGoalReview(date, msg)` → Save evening review

### Calendar:
- `connectors:list`, `connectors:add`, `connectors:sync`, `connectors:items`
- `connectors:create-event`, `connectors:update-event`, `connectors:delete-event`

### Planning:
- `readPlanningMd()` → Read planning.md content
- `writePlanningMd(content)` → Write planning.md content
- `parseGoalDump(text)` → AI-parse brain dump into structured goals
