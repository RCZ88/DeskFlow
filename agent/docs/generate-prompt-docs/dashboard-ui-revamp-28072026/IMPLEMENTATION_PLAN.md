# IMPLEMENTATION_PLAN.md — Dashboard UI Revamp

## Phase 1: Fix Existing Components (Quick Wins)

### 1.1 GoalsCard — Fix UX Issues
**Files:** `src/components/dashboard/GoalsCard.tsx`
**Changes:**
- Fix Select component usage (base-ui API, no SelectTrigger/SelectContent/SelectValue)
- Add loading state (skeleton)
- Add error state
- Add empty state with CTA
- Ensure GlareHover works on all items
- Ensure parent goal link displays correctly

### 1.2 DeadlinesCard — Fix UX Issues
**Files:** `src/components/dashboard/DeadlinesCard.tsx`
**Changes:**
- Fix Select component usage
- Add loading state
- Add error state
- Ensure GlareHover works on all items
- Ensure urgency colors display correctly

### 1.3 ScheduleCard — Fix UX Issues
**Files:** `src/pages/dashboard/ScheduleCard.tsx`
**Changes:**
- Fix Select component usage
- Add loading state
- Add error state
- Ensure GlareHover works on all items
- Ensure color-coded time blocks display correctly

## Phase 2: Add Missing Features

### 2.1 AI Suggestion Integration
**Files:** `src/pages/DashboardPage.tsx`
**Changes:**
- Call `suggestGoals` on mount with long-term goals context
- Pass suggestions to GoalsCard
- Handle accept/dismiss suggestions
- Wire to real IPC

### 2.2 Parent Goal Link
**Files:** `src/pages/DashboardPage.tsx`
**Changes:**
- Load long-term goals on mount
- Pass to GoalsCard
- Ensure parent link displays correctly

### 2.3 Daily Survey
**Files:** `src/components/dashboard/DailySurveyCard.tsx`
**Changes:**
- Create new component
- Add to DashboardPage
- Wire to real IPC

### 2.4 Streak Tracking
**Files:** `src/components/dashboard/StreakCard.tsx`
**Changes:**
- Create new component
- Add to DashboardPage
- Calculate streaks from goals

### 2.5 Momentum Score
**Files:** `src/components/dashboard/MomentumScore.tsx`
**Changes:**
- Create new component
- Add to DashboardPage
- Calculate momentum from streaks + completion + focus

## Phase 3: Visual Polish

### 3.1 Color Consistency
- Ensure all cards use consistent accent colors
- Fix any flashy/bright colors
- Ensure glass effect works correctly

### 3.2 Animation Polish
- Ensure all animations follow L2 (Responsive) level
- Add reduced-motion fallbacks
- Ensure hover effects work on all interactive elements

### 3.3 Empty/Loading/Error States
- Add loading skeletons to all cards
- Add empty states with CTAs
- Add error states with retry

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
