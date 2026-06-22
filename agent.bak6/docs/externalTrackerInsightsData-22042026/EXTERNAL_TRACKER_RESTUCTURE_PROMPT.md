# External Tracker & Insights Restructuring Planning Prompt

Use this prompt with another AI (like Claude, GPT-4, etc.) to plan the best solution for restructuring the External Tracker page and Insights page.

---

## Current State

### File: ExternalPage.tsx (~750 lines)
- Activity buttons grid (stopwatch, sleep, check-in types)
- Basic stats cards (Today, Consistency, Sleep Deficit, Avg Sleep)
- Charts toggle button - reveals Activity Breakdown + Weekly Comparison charts
- Sleep mode currently shows a RUNNING TIMER (problem)
- Start/stop functionality for all activities

### Route: /reports (Insights)
- Currently just a placeholder: "Not Yet Added Feature"

### Route: /external (External Page)
- Full implementation with activity tracking

---

## Issues to Solve

### Issue 1: Sleep Mode is Wrong
- **Current**: Sleep shows a running timer like stopwatch activities
- **Desired**: Sleep should NOT have a running timer. It should simply display:
  - "Sleeping since [bedtime]" (static, no counter)
  - User taps "Wake Up" button → time picker modal
  - User selects wake time → calculate duration

### Issue 2: Sleep After Midnight Not Working
- If user sleeps at 11 PM (day 1) and wakes at 7 AM (day 2), calculation must be 8 hours
- Current logic likely produces negative time (7 - 23 = -16 hours)
- Need proper date crossing logic

### Issue 3: Auto-Continue Sessions Missing
- If user starts "Sleep", closes app, then opens app next day
- App should detect incomplete session and prompt "You were sleeping! Wake up?"

### Issue 4: Statistics Scattered
- Current External page has some stats, hidden behind "Charts" button
- No per-activity detailed stats
- Sleep has no dedicated stats view

### Issue 5: Not Clear How to See Statistics
- User wants "each individual external pages (for example sleep) should have their own showing of the statistics"
- When viewing Sleep activity, should see sleep-specific stats
- When viewing an activity button, should see that activity's stats

---

## Requirements

### External Page Should Show:
1. Activity buttons grid
2. Today's total external time (always visible)
3. Quick stats cards:
   - Today: total hours
   - Sleep Deficit: color-coded (+/- from 8h target)
4. Active timer view when activity is running

### Per-Activity Stats (inside the active view):
- **Sleep view**: Sleep deficit, average sleep, bedtime patterns
- **Stopwatch activities (e.g., Studying)**: Today's time, weekly total, personal best
- **Check-in activities (e.g., Eating)**: Today's count, weekly average

### Insights Page (/reports) Should Show:
- Weekly Consistency Chart (multi-week line comparison with target)
- Sleep Trends Chart (last 7 days line chart)
- Activity Breakdown (horizontal bar chart)
- This replaces the hidden "Charts" button on External page

---

## Ask the AI to Plan:

1. **Data Structure**:
   - How to store external activities and sessions
   - How to calculate sleep after midnight correctly
   - How to handle auto-continue on app restart

2. **UI Architecture**:
   - How should External page be organized?
   - How to show per-activity stats?
   - What goes on External vs Insights?

3. **Sleep Behavior**:
   - What's the exact user flow for sleep?
   - How to handle edge cases (sleep after midnight, naps, app restart)?

4. **Statistics Display**:
   - Which stats on External page?
   - Which charts on Insights page?
   - How to make stats accessible from activity buttons?

5. **Implementation Steps**:
   - Order of changes
   - What to modify in which files
   - Testing scenarios

---

## Additional Context from Planning Document (docs/EXTERNAL_TRACKER_PLAN.md)

### Timer Modes:
| Mode | Behavior |
|------|----------|
| **Stopwatch** | User taps Start → timer runs → User taps Stop |
| **Sleep** | User taps "Going to sleep" → static display → User taps "Wake up" with time picker |
| **Check-in** | User taps → records timestamp with default duration |

### Default Activities:
- Stopwatch: Studying (Paper), Exercise, Gym, Commute, Reading
- Sleep: Sleep
- Check-in: Eating, Short Break

### Sleep Deficit:
- Target: 8 hours/night
- Color-coded display:
  - Green (+): Positive (overslept or on target)
  - Red (-): Negative (sleep deficit)

### Consistency Score:
- Based on variance from weekly target (30 hours suggested)
- Multi-week comparison chart

---

## Output Requested

Create a comprehensive plan that includes:
1. **Problem Analysis**: What's wrong and why
2. **Solution Design**: How to fix each issue
3. **Architecture**: Which components where
4. **Implementation Plan**: Step-by-step with file changes
5. **Edge Cases**: How to handle sleep after midnight, app restart, etc.
6. **UI Mockup Ideas**: How to layout External vs Insights pages