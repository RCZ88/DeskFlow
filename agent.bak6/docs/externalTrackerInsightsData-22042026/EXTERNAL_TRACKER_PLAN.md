# External Tracker Feature - Implementation Plan

## Overview

A non-interactive tracking section for monitoring time spent away from the laptop (studying with paper, sleeping, eating, exercise, etc.). Provides productivity insights, sleep tracking, and consistency metrics.

---

## 1. Core Concepts

### Activity Types (Timer Modes)

| Mode | Behavior | Examples |
|------|----------|-----------|
| **Stopwatch** | User taps Start → timer runs → User taps Stop | Studying (Paper), Exercise, Gym, Commute, Reading |
| **Sleep** | User taps "Going to sleep" → tracks sleep period → User taps "Wake up" with time picker | Sleep |
| **Check-in** | User taps → records timestamp with default duration | Eating, Short breaks |

### Default Activities (Pre-loaded)

```
┌──────────────────────────────���──────────────────────────────┐
│ STOPWATCH          │ SLEEP        │ CHECK-IN     │
├──────────────────┼─────────────┼─────────────┤
│ • Studying       │ • Sleep     │ • Eating    │
│ • Exercise       │             │ • Short     │
│ • Gym            │             │   Break     │
│ • Commute        │             │             │
│ • Reading        │             │             │
└──────────────────┴─────────────┴─────────────┘
```

---

## 2. User Interface Design

### 2.1 New Page: "External" (Sidebar)

**Layout: Full-page with large action buttons**

```
┌──────────────────────────────────────────────────────────────────┐
│  □ Tracking  │ External                                    🕐 │
├──────────────────────────────────────────────────────────────────┤
│  🏠          │                                             │
│  Dashboard  │    ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│             │    │         │  │         │  │         │    │
│  📊         │    │ 📚      │  │ 🏋️     │  │ 🍽️     │    │
│  Stats      │    │Studying │  │ Exercise│  │ Eating  │    │
│             │    │ 2h 30m │  │  45m   │  │  30m   │    │
│  🌐         │    └─────────┘  └─────────┘  └─────────┘    │
│  Browser    │                                             │
│             │    ┌─────────┐  ┌─────────┐               │
│  💻         │    │         │  │         │               │
│  IDE        │    │ 😴      │  │ 📖     │               │
│             │    │ Sleep   │  │Reading │               │
│  🌍         │    │ 7h 30m  │  │  1h    │               │
│  Galaxy    │    └─────────┘  └─────────┘               │
│             │                                             │
│  📦         │           [+ Add Custom Activity]           │
│  External   │                                             │
│             │                                             │
│  ⚙️         │  ─────────────────────────────────────     │
│  Settings   │  TODAY'S EXTERNAL TIME: 11h 45m            │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Active Activity View (After Click)

**Animation: Buttons slide out, selected activity becomes main stopwatch**

```
┌──────────────────────────────────────────────────────────────────┐
│ External          ← Back    🕐 Studying (Paper)    Stop  ■    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│                      ┌─────────────────┐                         │
│                      │                 │                         │
│                      │     02:34:17    │  <- Timer               │
│                      │                 │                         │
│                      │   Studying      │  <- Activity name      │
│                      │   (Paper)       │                         │
│                      │                 │                         │
│                      └─────────────────┘                         │
│                                                                   │
│                        ┌───────────────────┐                     │
│                        │  Today: 2h 34m    │                     │
│                        │  Week: 12h 45m    │                     │
│                        └───────────────────┘                     │
│                                                                   │
│   ───────────────────────────────────────────────────────────     │
│                                                                   │
│   TODAY'S EXTERNAL TIME: 11h 45m  (65% of tracked day)            │
│   SCORE: ████████████░░░░ 78%                                         │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 Sleep Activity View

```
┌──────────────────────────────────────────────────────────────────┐
│ External          ← Back    🕐 Sleep                   Wake □  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│                      ┌─────────────────┐                         │
│                      │  Sleep Session  │                         │
│                      │                 │                         │
│                      │   11:30 PM ──► │  <- Bedtime            │
│                      │                 │                         │
│                      │    7h 30m      │  <- Duration           │
│                      │                 │                         │
│                      │   ◄─── 7:00 AM│   <- Wake time picker  │
│                      └─────────────────┘                         │
│                                                                   │
│   ┌─────────────┬─────────────┬─────────────┐                        │
│   │   Today    │   Week    │   Month   │                        │
│   │  7h 30m   │  48h 15m  │ 180h 30m  │                        │
│   └─────────────┴─────────────┴─────────────┘                        │
│                                                                   │
│   SLEEP DEFICIT: -0h 30m  ⚠️                                        │
│   (Target: 8h/night, Last night: 7h 30m)                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Schema

### Table: `external_activities`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `name` | TEXT NOT NULL | Activity display name |
| `type` | TEXT NOT NULL | 'stopwatch' / 'sleep' / 'checkin' |
| `color` | TEXT | Hex color code |
| `icon` | TEXT | Lucide icon name |
| `default_duration` | INTEGER | Default minutes (for check-in) |
| `is_default` | INTEGER | 1 if built-in, 0 if custom |
| `is_visible` | INTEGER | 1 if shown, 0 if hidden |
| `created_at` | TEXT | ISO timestamp |

### Table: `external_sessions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `activity_id` | INTEGER FK | Reference to external_activities |
| `started_at` | TEXT NOT NULL | ISO timestamp |
| `ended_at` | TEXT | ISO timestamp (NULL if ongoing) |
| `duration_seconds` | INTEGER | Calculated duration |
| `notes` | TEXT | Optional user notes |

### Sleep-Specific Data

Sleep sessions stored in `external_sessions` with `activity_id` pointing to sleep activity. Additional fields for sleep:

| Field | Storage | Description |
|-------|---------|-------------|
| `bedtime` | `started_at` | When user tapped "Going to sleep" |
| `wake_time` | User picker value + date | When user tapped "Wake up" or selected |
| `duration_seconds` | Auto-calculated | wake_time - bedtime |
| `target_sleep` | User preference | Default 8 hours (28800s) |

---

## 4. Backend IPC Endpoints

```typescript
// External Activities
getExternalActivities(): Promise<ExternalActivity[]>
addExternalActivity(activity: Partial<ExternalActivity>): Promise<{ success: boolean; id: string }>
updateExternalActivity(id: string, updates: Partial<ExternalActivity>): Promise<boolean>
deleteExternalActivity(id: string): Promise<boolean>

// External Sessions
startExternalSession(activityId: string): Promise<{ success: boolean; sessionId: string }>
stopExternalSession(sessionId: string, endTime?: string): Promise<{ success: boolean; duration: number }>
getExternalSessions(period: 'today' | 'week' | 'month' | 'all'): Promise<ExternalSession[]>

// Statistics
getExternalStats(period: 'today' | 'week' | 'month' | 'all'): Promise<{
  byActivity: Record<string, { total_seconds: number; session_count: number }>;
  total_seconds: number;
  sleep_deficit_seconds: number;
  average_sleep_hours: number;
}>
getSleepTrends(period: 'week' | 'month'): Promise<{
  daily: Array<{ date: string; sleep_seconds: number; deficit_seconds: number; }>;
  average_bedtime: string;
  average_wake_time: string;
}>
getConsistencyScore(period: 'week' | 'month'): Promise<{
  score: number; // 0-100
  weekly_comparison: Array<{ week: string; total_seconds: number; }>;
}>
```

---

## 5. Statistics & Charts

### 5.1 Dashboard Cards (External Page)

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Today       │  This Week  │  This Month│  Sleep Def │
│  4h 30m     │  28h 45m   │  120h 30m  │  -2h 30m   │
│  external    │  external   │  external  │  DEFICIT   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

- **Sleep Deficit Card**: Color-coded
  - Green (+): Positive (overslept or on target)
  - Red (-): Negative (sleep deficit)
  - Gray (0): On target

### 5.2 Consistency Chart (Line Chart - Multi-Week Comparison)

```
CONSISTENCY: External Time by Week
│
│              ┌──────────┐              ┌──────────┐
│    Week 1    │    ●●    │              │    ●●    │    Week 4
│    25h       │   /    \  │   Week 2    │   /    \  │    32h
│              │  /      \ │   28h       │  /      \ │
│              │ ●        │  30h        │ ●        │
│              └──────────┘              └──────────┘
│              Week 3
│   Week -1    │    ●●    │   This week │    ●●    │
│    22h       │   /    \  │   28h 45m    │   /    \  │   Target
│    ────      │  /      \ │             │ ●─────── │   30h
│    (prev)    │ ●        │             │          │
│              └──────────┘              └──────────┘
│   ───────────────────────────────────────────────────────
│   Score: 78% ████████████░░ (↑12% from last week)
```

**Metrics**:
- X-axis: Weeks (current + 3 previous + target line)
- Y-axis: Total external hours
- Line colors: Each week has distinct color
- Target line: Dashed horizontal line (user's target)
- Score calculation: Based on variance from target

### 5.3 Sleep Trends Chart (Line Chart)

```
SLEEP PATTERN: Last 7 Days
│
│ 8h ─┬────────────────────────────────────
│     │           ●───●
│ 7h  │     ●───●       ●───●
│     │   ●●             ●
│ 6h  │  ●
│     │
│     └┬────┬────┬────┬────┬────┬────┬────
│      │Mon │Tue │Wed │Thu │Fri │Sat │Sun
│      └──┴────┴────┴────┴────┴────┴────
│     Avg: 7h 15m  │ Deficit: -45m
│     Bedtime: 11:30 PM (avg)  │ Wake: 6:45 AM (avg)
```

### 5.4 Activity Breakdown (Horizontal Bar Chart)

```
TODAY'S EXTERNAL TIME BREAKDOWN
│
│ Studying (Paper)  ██████████████████████████  2h 30m  (53%)
│ Exercise          ██████████                   45m   (16%)
│ Eating           ███████                      30m   (10%)
│ Sleep            ███████████████              1h    (21%)
│ Other            ████                        15m    (3%)
│                  0%    25%    50%    75%   100%
```

---

## 6. Implementation Phases

### Phase 1: Core Infrastructure (Priority: HIGH)

1. **Database schema**
   - Create `external_activities` table
   - Create `external_sessions` table
   - Add default activities on first run

2. **Backend IPC**
   - Implement all get/create/update/delete endpoints
   - Add sleep deficit calculation logic

3. **Basic External Page**
   - Display activity buttons grid
   - Start/stop stopwatch functionality
   - Basic timer display

### Phase 2: Sleep Tracking (Priority: HIGH)

1. **Sleep mode implementation**
   - "Going to sleep" starts sleep session
   - "Wake up" with time picker modal
   - Auto-calculate duration

2. **Sleep statistics**
   - Sleep deficit calculation
   - Average bedtime/wake time
   - Sleep trend chart

### Phase 3: Statistics & Charts (Priority: MEDIUM)

1. **Consistency chart**
   - Multi-week line comparison
   - Score calculation
   - Target line

2. **Activity breakdown**
   - Bar chart by activity
   - Period comparison

### Phase 4: Customization (Priority: MEDIUM)

1. **Add custom activity**
   - Modal form with fields
   - Validation

2. **Edit/delete activities**
   - Same modal, pre-filled

### Phase 5: Polish (Priority: LOW)

1. **Animations**
   - Button slide-out transitions
   - Timer counting animation

2. **Heatmap integration** (Deferred - complexity)
   - Add external time to heatmap cells

3. **Floating widget** (Optional)
   - Mini external activity launcher
   - Active timer display

---

## 7. Key Implementation Details

### 7.1 Timer States

```typescript
interface ExternalTimerState {
  isActive: boolean;
  activityId: string | null;
  startTime: Date | null;
  elapsedSeconds: number;
}
```

### 7.2 Sleep Session Handling

```typescript
// When user taps "Wake up"
const handleWakeUp = () => {
  // Show time picker modal
  // User selects time (defaults to "now")
  // Calculate duration = wake_time - bedtime
  // Save session
};
```

### 7.3 Sleep Deficit Calculation

```typescript
const calculateSleepDeficit = (
  sleepSessions: Session[],
  targetHoursPerNight: number = 8
): number => {
  const targetSeconds = targetHoursPerNight * 3600;
  const totalSleepSeconds = sleepSessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const numberOfNights = sleepSessions.length;
  const deficit = (targetSeconds * numberOfNights) - totalSleepSeconds;
  return deficit; // Negative = deficit, Positive = surplus
};
```

### 7.4 Consistency Score Formula

```typescript
const calculateConsistencyScore = (
  weeklyTotals: number[], // Last 4 weeks
  targetHoursPerWeek: number = 30
): number => {
  const targetTotal = targetHoursPerWeek * 3600;
  const currentWeek = weeklyTotals[weeklyTotals.length - 1];
  const variance = Math.abs(currentWeek - targetTotal) / targetTotal;
  const consistency = Math.max(0, 100 - (variance * 100));
  return Math.round(consistency);
};
```

---

## 8. Component Structure

```
src/
├── pages/
│   └── ExternalPage.tsx          # Main external tracking page
├── components/
│   ├── ExternalButton.tsx        # Activity button card
│   ├── ExternalActiveTimer.tsx  # Active stopwatch display
│   ├── SleepSessionModal.tsx     # Wake up time picker
│   ├── AddActivityModal.tsx     # Custom activity form
│   ├── StatsCards.tsx            # Dashboard stats cards
│   ├── ConsistencyChart.tsx      # Multi-week line chart
│   ├── SleepTrendChart.tsx       # Sleep trend line chart
│   └── ActivityBreakdown.tsx     # Horizontal bar chart
├── hooks/
│   └── useExternalTimer.ts        # Timer logic hook
├── lib/
│   ├── external-db.ts            # Database operations
│   ├── external-stats.ts        # Statistics calculations
│   └── external-defaults.ts     # Default activities data
└── types/
    └── external.ts             # TypeScript interfaces
```

---

## 9. Default Activities (Seed Data)

```typescript
const DEFAULT_EXTERNAL_ACTIVITIES = [
  // Stopwatch types
  { name: 'Studying (Paper)', type: 'stopwatch', color: '#8b5cf6', icon: 'BookOpen', is_default: 1 },
  { name: 'Exercise', type: 'stopwatch', color: '#10b981', icon: 'Dumbbell', is_default: 1 },
  { name: 'Gym', type: 'stopwatch', color: '#f59e0b', icon: 'Activity', is_default: 1 },
  { name: 'Commute', type: 'stopwatch', color: '#6366f1', icon: 'Bus', is_default: 1 },
  { name: 'Reading', type: 'stopwatch', color: '#ec4899', icon: 'Book', is_default: 1 },

  // Sleep type
  { name: 'Sleep', type: 'sleep', color: '#3b82f6', icon: 'Moon', is_default: 1 },

  // Check-in types
  { name: 'Eating', type: 'checkin', color: '#ef4444', icon: 'Utensils', default_duration: 30, is_default: 1 },
  { name: 'Short Break', type: 'checkin', color: '#14b8a6', icon: 'Coffee', default_duration: 15, is_default: 1 },
];
```

---

## 10. Acceptance Criteria

- [ ] User can view External page from sidebar
- [ ] Default activities displayed as large buttons
- [ ] Tapping stopwatch activity starts timer, shows active view
- [ ] Tapping stop ends session and saves to database
- [ ] Tapping "Sleep" shows sleep-specific UI
- [ ] Wake up time picker allows selecting past time
- [ ] Sleep deficit displayed with color coding
- [ ] Statistics cards show today/week/month totals
- [ ] Consistency chart shows multi-week comparison
- [ ] User can add custom activity
- [ ] User can edit/delete custom activities
- [ ] Data persists across app restarts

---

## 11. Testing Scenarios

1. **Basic Flow**: Start studying → wait 2 min → stop → verify saved
2. **Sleep Flow**: Tap Sleep → wait 1 min → wake up → select time → verify duration
3. **Custom Activity**: Add "Yoga" → start → stop → verify appears in stats
4. **Statistics**: Complete multiple sessions → verify totals correct
5. **Data Persistence**: Add session → restart app → verify data loads
6. **Time Picker**: Select 6 AM wake time → verify duration calculation correct

---

## 12. Future Considerations (Out of Scope)

- **Heatmap integration**: External time as additional heatmap layer
- **Galaxy visualization**: Custom category for external activities
- **Floating widget**: Compact external launcher overlay
- **Notifications**: Reminders for sleep, breaks
- **Export**: Export external data to CSV

---

*Plan created: 2026-04-21*
*Last updated: 2026-04-21*