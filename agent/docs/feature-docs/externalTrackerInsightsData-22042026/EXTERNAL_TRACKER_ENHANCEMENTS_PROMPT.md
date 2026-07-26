# External Tracker - Enhanced Insights Planning Prompt

Use this prompt with another AI to plan the enhanced External Tracker features.

---

## Current Problems

### Problem 1: Session Recovery Wrong
- **Issue**: When user closes app for 5 minutes, it shows "You were sleeping!" recovery prompt
- **Fix needed**: Only show recovery if session was > 3-4 hours, OR if it's clearly nighttime sleep (e.g., 11pm-7am)
- **Also**: Auto-stop session on app quit (already added to before-quit)

### Problem 2: Consistency Shows 0
- **Issue**: Charts show 0 hours, but target is 30 hours - no data appearing
- **Expected**: Should show actual tracked external time per week
- **Fix needed**: Debug why data isn't showing in consistency API

### Problem 3: No Real Insights
- **Current**: Just 3 basic charts (consistency, sleep trends, breakdown)
- **Wanted**:
  - Sleep pattern detection (show common sleep window, e.g., 1am-7am with no activity)
  - Day format mapping (typical day: when do you study? when eat? when exercise?)
  - Activity timing patterns (e.g., "You usually study at night")
  - Weekly heatmap of external activities
  - Best/worst days for external activities

---

## Specific Requests

### 1. Recovery Threshold Logic
```
On app open:
- Check if there's an active external session
- If session exists, check:
  - If duration > 4 hours → Show "You were sleeping?" prompt
  - If session started between 10pm-4am → Show "Night sleep detected, wake up?"  
  - If duration < 3 hours → Auto-discard (user probably just closed app briefly)
```

### 2. Sleep Pattern Detection
```
Analysis:
- Find common gaps in activity data (e.g., always 1am-7am = no activity)
- Show "Your typical sleep window: 12:00 AM - 7:00 AM"
- Calculate if they're a "night owl" or "early bird" based on activity patterns
- Show sleep deficit trend over time
```

### 3. Day Format / Typical Day Mapping
```
Analysis:
- Group all activities by hour of day
- Show "Your typical day":
  - 8am-12pm: [activity]
  - 12pm-2pm: [activity]  
  - 2pm-6pm: [activity]
  - 6pm-10pm: [activity]
  - 10pm-8am: [sleep]
- Create hourly breakdown chart
```

### 4. Enhanced Consistency Score
```
Current: Just variance from 30h target
Needed:
- Weekly comparison bar chart each week
- Show "last week vs this week" trend (↑ or ↓)
- Calculate streak (consecutive weeks meeting target)
- Personal best week
```

### 5. More Charts for Insights Page
```
1. Hourly Activity Heatmap (24 hours x 7 days)
2. Activity Timing Pie Chart (morning/afternoon/evening/night)
3. Weekly Stacked Bar (each activity stacked)
4. Sleep Pattern Calendar (when sleep happens)
5. "Best Day" Analysis (which day of week is most productive)
```

---

## Ask the AI to Plan:

1. **Fix the consistency API** - Why is it showing 0? Fix the data query
2. **Recovery threshold** - How to implement the 3-4 hour / nighttime check
3. **Sleep pattern analysis** - Algorithm to detect common sleep windows from activity gaps
4. **Day format mapping** - How to aggregate and display typical day
5. **New IPC endpoints** - What queries needed for new insights
6. **UI Layout** - How to organize all these new charts on Insights page

---

## Output Requested

Create a plan that includes:
1. **Code fixes** - For consistency showing 0
2. **New IPC queries** - For sleep patterns, day format, hourly breakdown
3. **UI organization** - How to layout new insights
4. **Implementation steps** - In order of priority