# IMPLEMENTATION_PLAN.md — Dashboard AI+Human System

## Phase 1: Core Components (Build First)

### 1.1 GoalsCard — Complete Rewrite
**Files:** `src/components/dashboard/GoalsCard.tsx`
**Changes:**
- Add AI suggestions section with `suggestGoals` IPC
- Show parent long-term goal for each daily goal (→ Serves: [title])
- Add progress ring (animated circular progress)
- Add edit/delete with GlareHover
- Add category balance indicator
- Add streak display per goal

### 1.2 DeadlinesCard — Complete Rewrite
**Files:** `src/components/dashboard/DeadlinesCard.tsx`
**Changes:**
- Show connected goal for each deadline
- Add urgency color coding
- Add edit/delete with GlareHover
- Add priority badges

### 1.3 ScheduleCard — Complete Rewrite
**Files:** `src/pages/dashboard/ScheduleCard.tsx`
**Changes:**
- Inline add/edit/delete
- Show connected goals
- Color-coded time blocks
- GlareHover on each entry

### 1.4 StatusBand — Enhance
**Files:** `src/pages/dashboard/StatusBand.tsx`
**Changes:**
- Mouse-following spotlight (MagicCard orb mode)
- Focus session CTA
- Browser/app icon distinction

## Phase 2: New Components

### 2.1 DailySurveyCard — NEW
**Files:** `src/components/dashboard/DailySurveyCard.tsx`
**Purpose:** End-of-day review where AI asks about goal completion
**Features:**
- Shows each goal with "Did you complete this?" toggle
- AI generates follow-up questions
- Saves responses to goal.reviewSummary

### 2.2 StreakCard — NEW
**Files:** `src/components/dashboard/StreakCard.tsx`
**Purpose:** Track consecutive days of goal completion
**Features:**
- Current streak number (animated)
- Best streak ever
- Calendar heatmap (last 30 days)
- Category breakdown

### 2.3 MomentumScore — NEW
**Files:** `src/components/dashboard/MomentumScore.tsx`
**Purpose:** Combined metric of streak × completion × focus
**Features:**
- Animated gauge (0-100)
- Breakdown: streak, completion rate, focus hours
- Trend indicator (up/down/stable)

### 2.4 GoalParentLink — NEW
**Files:** `src/components/dashboard/GoalParentLink.tsx`
**Purpose:** Shows which long-term goal a daily goal serves
**Features:**
- Displays "→ Serves: [Long-term goal title]"
- Clickable to navigate to long-term goal
- Color-coded by category

## Phase 3: Wiring

### 3.1 DashboardPage — Wire Everything
**Files:** `src/pages/DashboardPage.tsx`
**Changes:**
- Load long-term goals on mount
- Call `suggestGoals` on mount
- Wire all CRUD operations to real IPC
- Add DailySurveyCard at bottom
- Add StreakCard and MomentumScore
- Pass parent goal info to each card

### 3.2 Backend — Add Missing Endpoints
**Files:** `src/main.ts`
**Changes:**
- Verify `suggestGoals` works with long-term goals
- Add `getGoalStreaks` endpoint
- Add `getMomentumScore` endpoint

## Verification
1. Build passes (`npx vite build`)
2. Preload builds (`npx esbuild src/preload.ts ...`)
3. Main builds (`node scripts/rebuild-main.mjs`)
4. App launches without black screen
5. Dashboard shows AI-generated goals with parent links
6. All CRUD operations work
7. Mouse spotlight works on StatusBand
8. GlareHover works on all items
9. Streaks calculate correctly
10. Survey card appears at end of day
