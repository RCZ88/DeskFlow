# External Page Charts - FINALIZED Design Specification

**Status:** User Approved - Ready to Implement
**Created:** 2026-04-30
**Version:** 1.77 (DeskFlow)

---

## Core Problem (User's Complaint)

"The displays are really bad. The data aren't showcased and processed properly"

**Root Cause:** Raw data from `external_sessions` table is aggregated into a single "blob" rather than being partitioned by activity and time.

---

## 🏗️ Data Processing Pipeline

### Stage 1: Filtering
- Fetch data specifically by `activity_id`
- Apply `selectedPeriod` from global navigation (today/week/month/all)

### Stage 2: Aggregation
For any given period P, calculate daily sum of durations:
```
D_day = sum(session_duration / 3600000)  // Result in hours
```

### Stage 3: Smoothing (for Line Chart)
Apply 3-day moving average to highlight trends over noise:
```
MovingAvg = (D_t + D_t-1 + D_t-2) / 3
```

---

## 📊 Chart Type Specifications

### 1. The Trend Analyzer (Line Chart - 30 Days)
| Aspect | Value |
|--------|-------|
| Purpose | Visualize consistency over last 30 days |
| Processing | Aggregate by date, fill empty days with 0 |
| Visuals | Smooth curve (0.3 tension), 30% opacity fill |
| Color | Activity's unique color |
| X-axis | Labels every 5 days |

### 2. The Distribution View (Bar Chart - 7 Days)
| Aspect | Value |
|--------|-------|
| Purpose | Identify which days of week are most active |
| Processing | Group by "Day of Week" (0-6), ignore dates |
| Visuals | 24px thick bars, 6px rounded top corners |
| Color | Activity's unique color |

### 3. The Habit Heatmap (Calendar - 5 Weeks)
| Aspect | Value |
|--------|-------|
| Purpose | High-level frequency tracking |
| Processing | Map duration to 5 intensity levels (0%, 25%, 50%, 75%, 100%) |
| Visuals | 12x12px cells, 2px gap |
| Color | Activity's primary color |

---

## 🎨 Display & Interaction (Option A Enhanced)

### Activity Detail Panel
- **Header:** Always-Visible Timer state + "Click to start" prompt if idle
- **Navigation:** Segmented control (Stats | Bar | Line | Calendar) with icons
- **Empty States:** Dashed border box with specific prompt per chart type

### Visual Polish Rules
- **Tooltips:** `#18181b` background, `#3f3f46` border
- **Y-axis:** Must include "h" suffix (2h, 4h, 6h)
- **Grid lines:** `#27272a` (subtle, not distracting)

### Aggregate View REMOVED
- Aggregate charts (Sleep Trends, Activity Breakdown) removed from individual activity views
- Aggregate data reserved for Insights Page / Weekly Overview only

---

## 📁 Implementation Files

### Primary: src/pages/ExternalPage.tsx

**Changes needed:**
1. Add data processing functions (filter, aggregate, smooth)
2. Enhance ActivityDetailPanel with proper tabs
3. Add empty state components
4. Remove aggregate charts from individual view

### API: src/main.ts (if needed)
- Verify `getActivitySessions(activityId)` returns proper data
- Ensure `selectedPeriod` filtering works

---

## ✅ Implementation Checklist

- [ ] Implement 3-stage data pipeline (filter → aggregate → smooth)
- [ ] Add 3-day moving average for line chart
- [ ] Ensure empty days show as 0 (not skipped)
- [ ] Group bar chart by day of week (not date)
- [ ] Map calendar to 5 intensity levels
- [ ] Add prominent tab switcher (Stats | Bar | Line | Calendar)
- [ ] Add empty state with specific prompts
- [ ] Remove aggregate charts from activity detail
- [ ] Apply dark tooltip styling (#18181b)
- [ ] Ensure Y-axis shows "h" suffix

---

## Approval Status

**User has approved this design.** Implementation can proceed.