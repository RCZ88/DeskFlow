# IMPLEMENTATION PLAN — Goals Customization Overhaul

## Overview
6 phases, 6 new IPC handlers, 5 new DB columns, 7 new UI components, 1 new type file.

---

## Phase 1: Type System + DB Migration (Foundation)

### 1.1 Create `src/types/goals.ts`
- Copy canonical types from RESULT.md §8.3
- Export: GoalCategory, GoalPeriod, GoalStatus, GoalSource, TargetType, TrackingMode, CompletionLogic, CadenceConfig, CrossFeatureLink, GoalTarget, GoalLink, Goal, LongTermGoal, mapLegacyStatus

### 1.2 Update import sites
- `src/components/dashboard/types.ts` → re-export from `src/types/goals.ts`
- `src/components/ai/types.ts` → re-export from `src/types/goals.ts`
- `src/services/GoalStore.ts` → use canonical types (map legacy statuses)
- Grep all files importing Goal/LongTermGoal/GoalCategory from old paths, update to `src/types/goals.ts`

### 1.3 DB migration in `main.ts`
- Add guarded ALTER TABLE statements after existing ALTERs (~line 2949):
```sql
ALTER TABLE goals ADD COLUMN completion_config TEXT DEFAULT '{"lateAllowed":false,"gracePeriodMinutes":0,"partialCredit":false,"streakOnMiss":"reset"}';
ALTER TABLE goals ADD COLUMN tracking_mode TEXT DEFAULT 'manual';
ALTER TABLE goals ADD COLUMN cadence_config TEXT DEFAULT '{"type":"fixed","fixedDays":[],"rollingTarget":1,"flexibleWindowDays":7}';
ALTER TABLE goals ADD COLUMN cross_feature_link TEXT;
ALTER TABLE goals ADD COLUMN external_activity_id INTEGER;
```

### 1.4 Modify `save-goal` handler (main.ts:18496)
- Add 5 new columns to INSERT OR REPLACE statement
- Parse JSON fields (completion_config, cadence_config, cross_feature_link) before INSERT

### 1.5 Modify `get-goals-batch` handler (main.ts:18463)
- Add new columns to SELECT
- Parse JSON fields in response mapping

**Files touched:** `src/types/goals.ts` (new), `src/components/dashboard/types.ts`, `src/components/ai/types.ts`, `src/services/GoalStore.ts`, `src/main.ts`
**Verification:** `npx vite build --outDir dist-tmp` passes, `tsc` passes, existing goal CRUD still works

---

## Phase 2: Enhanced CriteriaBuilder + External Activity Picker

### 2.0 Life/Gold Page integration and anti-slop redesign
- Revamp the goals surface inside `src/features/warmth/gold/GoldPage.tsx` as part of the same feature, not as an isolated generic form.
- Preserve the approved dark RHEO visual language and existing Life page composition.
- Use the loaded anti-slop and design skills: no generic dashboard template, no decorative gradients replacing information, and no duplicated hero treatment.
- Keep The Vault, WeekBoard, goal list, and CriteriaBuilder connected to the same canonical goal state.
- Add explicit empty/loading/error/populated states and accessible hover/focus/disabled behavior.

### 2.1 Extend CriteriaForm interface
- Add: cadenceType, fixedDays, rollingTarget, flexibleWindowDays, completionLogic, trackingMode, externalActivityId, crossFeatureLink

### 2.2 Build `ExternalActivityPicker.tsx`
- Calls `api.activityGoalGetAll()`
- Grid of activity cards (icon, name, color, today's time, toggle)
- Empty state: "No external activities yet"
- Location: `src/components/goals/ExternalActivityPicker.tsx`

### 2.3 Build `CrossFeatureLinkPicker.tsx`
- Feature dropdown (Learn, Finance, External, IDE, Focus)
- Entity list per feature (lazy-loaded on feature select)
- Selected entity chip with × to remove
- Location: `src/components/goals/CrossFeatureLinkPicker.tsx`

### 2.4 Build `CompletionLogicConfig.tsx`
- Switch: "Allow late completion" → reveals grace period input
- Radio: Streak on Miss (Reset / Continue / Pause)
- Location: `src/components/goals/CompletionLogicConfig.tsx`

### 2.5 Enhance CriteriaBuilder.tsx
- Add Steps 3-6 (conditional rendering based on targetType)
- Wire ExternalActivityPicker, CrossFeatureLinkPicker, CompletionLogicConfig
- Add tracking mode radio (system/manual/hybrid)

**Files touched:** `src/components/goals/CriteriaBuilder.tsx`, `src/components/goals/ExternalActivityPicker.tsx` (new), `src/components/goals/CrossFeatureLinkPicker.tsx` (new), `src/components/goals/CompletionLogicConfig.tsx` (new)
**Verification:** Build passes, CriteriaBuilder renders all 6 steps, external activities load

---

## Phase 3: Completion Logic + Missed Goal Recovery

### 3.1 Build `GoalCompletionEngine.ts` (renderer utility)
- `evaluateGoal(goal, now)`: checks completion based on completionLogic
- Handles: late completion (within grace period), partial credit, streak impact
- Uses LOCAL time for all comparisons

### 3.2 Build `MissedGoalRecoveryBanner.tsx`
- Filters goals where status !== 'done' AND date < today
- Shows inline banner with missed count
- Expandable: per-goal actions (Mark Late, Reschedule, Dismiss)
- Location: `src/components/goals/MissedGoalRecoveryBanner.tsx`

### 3.3 Update GoalCard.tsx
- Show tracking mode badge (system/manual/hybrid)
- Show completion logic summary (e.g., "Late OK, 1-day grace")
- Show missed status with recovery actions

**Files touched:** `src/components/goals/GoalCompletionEngine.ts` (new), `src/components/goals/MissedGoalRecoveryBanner.tsx` (new), `src/components/goals/GoalCard.tsx`
**Verification:** Build passes, missed goals display banner, completion logic evaluates correctly

---

## Phase 4: Cross-Feature Integration

### 4.1 New IPC: `goal:get-cross-feature-progress` (main.ts)
- Reads cross_feature_link from goals table
- Routes to appropriate feature table:
  - Learn: query learn_nodes/learn_progress for completion %
  - Finance: query finance_goals for current/target amount
  - External: query external_sessions for activity duration
  - IDE: query projects/code_activity for project activity
  - Focus: query deep_focus_sessions/focus_group_usage for focus time
- Returns { progress, target, percentComplete, details }

### 4.2 Add preload bridge
- `getCrossFeatureProgress: (goalId: string) => ipcRenderer.invoke('goal:get-cross-feature-progress', goalId)`

### 4.3 Add deskflow-api.d.ts type

### 4.4 Update GoalCard progress bar
- Show cross-feature source badge (e.g., "Learn: TypeScript Basics 60%")

**Files touched:** `src/main.ts`, `src/preload.ts`, `src/types/deskflow-api.d.ts`, `src/components/goals/GoalCard.tsx`
**Verification:** Build passes, cross-feature progress returns real data

---

## Phase 5: Habit Tracker

### 5.1 New IPC: `goal:get-habits` (main.ts)
- Filters goals where is_habit = 1
- Returns with weekProgress array (date + completed boolean per day)

### 5.2 New IPC: `goal:toggle-habit-day` (main.ts)
- Upserts manual completion record
- Recalculates streak based on cadenceConfig
- Returns newStreak

### 5.3 Add preload bridges + types

### 5.4 Build `HabitTracker.tsx`
- Weekly grid (7 columns Mon-Sun)
- Rows = habits with name, category badge, streak flame
- Cells = clickable circles (empty/filled)
- Streak milestone confetti
- Location: `src/components/goals/HabitTracker.tsx`

### 5.5 Add "Habits" tab to GoalsPage

**Files touched:** `src/main.ts`, `src/preload.ts`, `src/types/deskflow-api.d.ts`, `src/components/goals/HabitTracker.tsx` (new), `src/pages/GoalsPage.tsx`
**Verification:** Build passes, habits render in grid, toggle works, streak updates

---

## Phase 6: AI Dynamic Monitor + Language Parser

### 6.1 New IPC: `goal:ai-monitor` (main.ts)
- Gathers active goals + 7-day progress data
- AI system prompt (from RESULT.md §8.4)
- Returns proposals array
- Rate limit: 6-hour cooldown via timestamp in DB

### 6.2 New IPC: `goal:ai-apply-proposal` (main.ts)
- Merges newConfig into goal, calls save-goal
- Writes context brain episode (action: 'ai_adjusted')

### 6.3 New IPC: `goal:ai-parse-language` (main.ts)
- AI system prompt for NLP parsing (from RESULT.md §8.4)
- Returns parsedGoal Partial<Goal>
- Uses existing responseParser for JSON extraction

### 6.4 Add preload bridges + types

### 6.5 Build `GoalAICoach.tsx`
- "AI Health Check" button in GoalsPage
- Loading: skeleton cards
- Empty: "All goals look healthy!"
- Populated: proposal cards with Apply/Dismiss
- Location: `src/components/goals/GoalAICoach.tsx`

### 6.6 Build NLP creation modal
- "Create with AI" button in CriteriaBuilder
- Text input for natural language
- Preview of parsed goal before save

**Files touched:** `src/main.ts`, `src/preload.ts`, `src/types/deskflow-api.d.ts`, `src/components/goals/GoalAICoach.tsx` (new), `src/pages/GoalsPage.tsx`
**Verification:** Build passes, AI monitor returns proposals, NLP parser works, rate limiting enforced

---

## Summary: All New/Modified Files

### New files (8):
1. `src/types/goals.ts`
2. `src/components/goals/ExternalActivityPicker.tsx`
3. `src/components/goals/CrossFeatureLinkPicker.tsx`
4. `src/components/goals/CompletionLogicConfig.tsx`
5. `src/components/goals/MissedGoalRecoveryBanner.tsx`
6. `src/components/goals/GoalCompletionEngine.ts`
7. `src/components/goals/HabitTracker.tsx`
8. `src/components/goals/GoalAICoach.tsx`

### Modified files (6):
1. `src/main.ts` — 5 new ALTER TABLE, 6 new IPC handlers, 2 modified IPC handlers
2. `src/preload.ts` — 8 new bridges
3. `src/types/deskflow-api.d.ts` — 8 new type declarations
4. `src/components/dashboard/types.ts` — re-export from goals.ts
5. `src/components/ai/types.ts` — re-export from goals.ts
6. `src/components/goals/CriteriaBuilder.tsx` — 6-step redesign
7. `src/components/goals/GoalCard.tsx` — tracking mode, completion logic, missed badges
8. `src/pages/GoalsPage.tsx` — HabitTracker tab, GoalAICoach, MissedGoalRecoveryBanner
