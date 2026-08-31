# CONTEXT_BUNDLE.md — Self Page Orchestration

> This file contains the actual source code for all systems that need to interconnect.
> The target AI must use ONLY this context to design the solution.

---

## 1. DB SCHEMAS

### schedule_entries (src/main.ts:3157)
```sql
CREATE TABLE IF NOT EXISTS schedule_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,    -- "HH:MM" format
  end_time TEXT NOT NULL,      -- "HH:MM" format
  category TEXT DEFAULT 'class',
  color TEXT DEFAULT '#22d3ee',
  is_recurring INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### deadlines (src/main.ts:3171)
```sql
CREATE TABLE IF NOT EXISTS deadlines (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  course TEXT,
  due_date TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',   -- 'low'|'medium'|'high'|'urgent'
  status TEXT DEFAULT 'pending',    -- 'pending'|'done'|'snoozed'|'overdue'
  description TEXT,
  reminder_sent INTEGER DEFAULT 0,
  notified_at TEXT DEFAULT '{}',
  snoozed_until TEXT,
  recurrence TEXT,
  recurrence_end TEXT,
  category TEXT,
  remind_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### goals (src/main.ts — from ALTER TABLE migrations)
```sql
-- goals table columns (reconstructed from migrations + INSERT statements):
-- id TEXT PRIMARY KEY
-- date TEXT                    -- YYYY-MM-DD (daily goal)
-- title TEXT NOT NULL
-- description TEXT
-- category TEXT                -- 'work'|'personal'|'health'|'learning'|'finance'|'relationships'
-- target_type TEXT             -- 'time'|'completion'|'count'
-- target_seconds INTEGER       -- for time-based goals
-- match_category TEXT          -- links to focus group or app category
-- status TEXT                  -- 'pending'|'active'|'completed'|'done'
-- period TEXT                  -- 'daily'|'weekly'|'monthly'
-- source TEXT                  -- 'manual'|'ai_suggested'|'schedule_derived'
-- links TEXT                   -- JSON array of {type, id} cross-links
-- progress_seconds INTEGER     -- accumulated progress
-- completed_at TEXT
-- priority INTEGER
-- parent_id TEXT               -- FK to long_term_goals.id
-- parent_ids TEXT              -- JSON array for multi-parent
-- deadline TEXT                -- YYYY-MM-DD
-- completion_config TEXT       -- JSON
-- tracking_mode TEXT
-- cadence_config TEXT          -- JSON
-- cross_feature_link TEXT      -- links to schedule_entries.id or deadlines.id
-- external_activity_id TEXT    -- links to external_sessions
```

### long_term_goals
```sql
-- Same structure as goals but with:
-- is_habit INTEGER             -- recurring goal flag
-- progress REAL                -- 0-1 computed from progress_seconds/target_seconds
```

### notes (from IPC handler src/main.ts:19467)
```sql
-- id TEXT PRIMARY KEY
-- title TEXT
-- content TEXT
-- tags TEXT                    -- JSON array
-- group_name TEXT
-- deadline TEXT
-- deadline_time TEXT
-- reminder TEXT                -- 'none'|'at_time'|'15min'|'1hour'|'1day'
-- is_draft INTEGER DEFAULT 0
-- status TEXT
-- links TEXT                   -- JSON array of {type, id} cross-links
```

### Context Brain tables (src/main.ts ~2980-3090)
```sql
CREATE TABLE IF NOT EXISTS context_episodes (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,        -- 'goals', 'finance', 'deadlines', 'life_phase', etc.
  source_ref TEXT,
  content TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS context_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- 'goal'|'project'|'deadline'|'person'|'tool'|'concept'|'life_phase'|etc.
  name TEXT NOT NULL,
  aliases TEXT,                 -- JSON array
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS context_facts (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,     -- FK to context_entities.id
  predicate TEXT NOT NULL,      -- 'is_type'|'has_deadline'|'linked_to'|etc.
  object_literal TEXT,
  object_id TEXT,               -- FK to context_entities.id (for entity-to-entity facts)
  valid_from TEXT NOT NULL,
  valid_to TEXT,                -- NULL = current fact
  source_episode_id TEXT,       -- FK to context_episodes.id
  confidence REAL DEFAULT 1.0
);
```

---

## 2. IPC ENDPOINTS (all in src/main.ts + src/preload.ts)

### Schedule
| Channel | Handler (main.ts) | Returns |
|---------|-------------------|---------|
| `get-schedule` | ~19577 | `{ entries: ScheduleEntry[] }` |
| `add-schedule-entry` | ~19584 | `{ success, entry }` |
| `update-schedule-entry` | ~19600 | `{ success }` |
| `delete-schedule-entry` | ~19593 | `{ success }` |
| `get-schedule-templates` | ~19676 | `{ templates }` |
| `apply-schedule-template` | ~19683 | `{ success, count }` |
| `save-schedule-template` | ~19699 | `{ success, id }` |
| `parse-schedule` | ~19562 | parsed schedule object |
| `get-goal-timeline` | ~19316 | `{ schedule, goals, categorySeconds }` — COMBINED view |

### Deadlines
| Channel | Handler (main.ts) | Returns |
|---------|-------------------|---------|
| `get-deadlines` | ~19612 | `{ success, deadlines[] }` |
| `add-deadline` | ~19624 | `{ success, id }` |
| `update-deadline-status` | ~19633 | `{ success }` |
| `delete-deadline` | ~19648 | `{ success }` |
| `update-deadline` | ~19655 | `{ success }` |
| `snooze-deadline` | ~19667 | `{ success }` |

### Goals
| Channel | Handler (main.ts) | Returns |
|---------|-------------------|---------|
| `get-goals` | ~18520 | `{ goals: Goal[] }` |
| `save-goal` | ~18525 | `{ success }` |
| `save-goals-batch` | ~18530 | `{ success }` |
| `get-longterm-goals` | ~18540 | `{ goals: LongTermGoal[] }` |
| `save-ltg-form` | ~18550 | `{ success, id }` |

### Notes
| Channel | Handler (main.ts) | Returns |
|---------|-------------------|---------|
| `notes:list` | ~19467 | `{ notes[] }` |
| `notes:create` | ~19505 | `{ success, id }` |
| `notes:update` | ~19519 | `{ success }` |
| `notes:delete` | ~19550 | `{ success }` |

### Context Brain
| Channel | Handler (main.ts) | Returns |
|---------|-------------------|---------|
| `brain:search` | ~13860 | `{ facts[], episodes[], entities[], strategy }` |
| `brain:stats` | ~13882 | `{ episodes, entities, facts, currentFacts }` |
| `brain:get-entities` | ~13895 | `{ items: EntityRow[], total }` |
| `brain:get-facts` | ~13899 | `{ items: Fact[], total }` |
| `brain:get-episodes` | ~13891 | `{ items: Episode[], total }` |

### User Profile
| Channel | Handler | Returns |
|---------|---------|---------|
| `context-get-profile` | ~13830 | traits, interests, habits, communicationStyle, growthMarkers |
| `context-get-debug` | ~13840 | profileVersion, signalCount, sources |

---

## 3. EXISTING COMPONENTS

### ScheduleCard (src/pages/dashboard/ScheduleCard.tsx)
```tsx
interface ScheduleCardProps {
  entries: ScheduleEntry[];
  loading?: boolean;
  error?: string | null;
  onAdd: (entry: Omit<ScheduleEntry, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, patch: Partial<ScheduleEntry>) => void;
  onDelete: (id: string) => void;
}
// Features: day picker (0-6), current entry highlight, add/edit/delete, time grid
// Uses: parseTime(), COLORS[], ScheduleCategory type
```

### GoalCard (src/components/goals/GoalCard.tsx)
```tsx
// Renders individual goal with:
// - Checkbox toggle (done/active/pending)
// - Progress bar (for time-based goals)
// - Category badge (color-coded)
// - Linked schedule block indicator
// - Deadline countdown
// - Long-term goal parent link
```

### DeadlineRadar (src/features/warmth/gold/GoldPage.tsx:338)
```tsx
// Mini month calendar + countdown list
// Shows deadlines by due date with priority colors
// Click to expand details
```

### ContextGraphView (src/features/warmth/ContextGraphView.tsx)
```tsx
// 3D knowledge graph (R3F Canvas)
// Nodes = entities from context_entities
// Edges = facts from context_facts (subject → object links)
// Data loaded via brainGetEntities({limit:200}) + brainGetFacts({currentOnly:true, limit:500})
// Also loads learnGetNodes as concept nodes
```

### ProfileTab (src/components/life/ProfileTab.tsx)
```tsx
// Identity & Profile section
// Shows: traits, interests, habits, communication style, growth markers, memories
// Data from: contextGetProfile(), contextGetDebug()
// Uses: RadarChart, InterestCloud, ActivityHeatmap, ProfileCard, EvidenceDrawer
```

### BrainManagementView (src/features/warmth/context-brain/BrainManagementView.tsx)
```tsx
// Full management UI for Context Brain
// Tabs: Episodes, Entities, Facts, Extraction Jobs
// Uses: NumberTicker, Particles, DotPattern, BlurFade, Skeleton, Tabs
// Stats bar with episode/entity/fact counts
```

### ReflectFeed (src/components/ai/reflect/ReflectFeed.tsx)
```tsx
// Vertical timeline of daily goal completions
// Uses design system: GlassCard, SectionHead, Segmented, Progress, StateShell
// Filter tabs: All, Reviewed, Productive
// Each day node shows completion ring + review summary
```

### Design System (src/components/ai/)
```tsx
// GlassCard — ring-based depth card (accent, variant, bar)
// SectionHead — section header with accent bar + icon + title
// StateShell — 4-state (loading/empty/error/ready) with crossfade
// tokens.ts — SURFACE, RING, TEXT, ACCENT (7 colors), MOTION
// lib/motion.ts — useMotionProps() for stagger animations
// primitives/ — Segmented, Progress, Skeleton, CountUp, Collapsible, Dialog
```

---

## 4. CROSS-FEATURE LINKS (the key connections)

### Goals → Schedule
- `goals.cross_feature_link` references `schedule_entries.id`
- `get-goal-timeline` IPC joins both: returns schedule blocks + goals for a date
- AI goal generation (main.ts:20252) injects today's schedule blocks into the prompt

### Goals → Long-term Goals
- `goals.parent_id` → `long_term_goals.id`
- Daily goals serve long-term goals (hierarchy)

### Goals → Deadlines
- `goals.deadline` field (date string)
- Goal categories map to deadline categories

### Goals → Context Brain
- `episodeWriters.writeGoalEpisode()` creates episodes when goals are created/toggled
- `brain.upsertEntity('goal', goal.title)` creates entities
- Context Brain extracts facts like "Goal X has deadline Y" from episodes

### Deadlines → Context Brain
- `episodeWriters.writeDeadlineEpisode()` creates episodes
- `brain.upsertEntity('deadline', deadline.title)` creates entities

### Schedule → Context Brain
- No direct episode writer exists yet (gap)

### Notes → Everything
- `notes.links` JSON array can reference goals, deadlines, schedule blocks
- Notes have their own `deadline` and `reminder` fields

### Context Brain → Suggestions
- `brain:search` can find related entities/facts for any topic
- Profile data drives AI goal generation suggestions

---

## 5. THE GAP: NO ORCHESTRATION LAYER

Currently each system operates independently:
- Schedule shows blocks, but doesn't know which goals are linked
- Goals show progress, but don't visualize their position in the knowledge graph
- Deadlines show countdown, but don't show related schedule blocks or goals
- Notes are free-form, but don't auto-link to related entities
- Context Brain has all the data, but the graph doesn't highlight schedule/goal/deadline entities differently
- ProfileTab shows identity, but doesn't connect to today's activity

**There is no single view that shows how everything connects.**
