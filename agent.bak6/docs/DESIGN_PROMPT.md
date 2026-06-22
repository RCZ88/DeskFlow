# 🎨 DeskFlow Page Redesign Prompt

**Purpose:** Guide a designer AI to redesign the External page and Insights page with proper context about what's already in the app.

---

## 📋 PROJECT OVERVIEW

**App Name:** DeskFlow
**Type:** Desktop application for tracking computer usage, productivity, and life activities
**Platform:** Electron + React + TypeScript
**UI Style:** Dark theme, zinc/emerald/amber color scheme

---

## 📍 CURRENT PAGE STRUCTURE

### Sidebar Navigation (in order):
1. **Dashboard** (`/`) - Main tracker with 3D solar system, heatmap, live timer
2. **Productivity** (`/productivity`) - Productivity breakdown by tiers
3. **Applications** (`/stats`) - App usage distribution
4. **Browser Activity** (`/browser`) - Website tracking  
5. **IDE Projects** (`/ide`) - Project + AI tool tracking
6. **External** (`/external`) - ⚠️ STOPWATCH + LIFE ACTIVITIES - THIS IS FOCUS
7. **Insights** (`/reports`) - ⚠️ ANALYTICS - THIS IS FOCUS
8. **Database** (`/database`) - Raw data viewer
9. **Settings** (`/settings`) - Configuration

---

## 📊 WHAT'S ON EACH PAGE (DETAILED)

### 1. Dashboard 
- 3D Solar System visualization (OrbitSystem - planets orbiting sun)
- Heatmap (7-day grid, GitHub-style)
- Live timer with formatting
- Activity feed (scrollable list)
- Stats: Total Time, Focus Score %, Sessions, Top App

### 2. Productivity
- Period selector (Today/Week/Month/All)
- Productivity score (0-100%)
- **Pie chart**: Apps by productivity tier (Productive/Neutral/Distracting)
- **Bar chart**: Daily breakdown per tier
- **Line chart**: Weekly comparison
- Apps list with category badges
- Websites section (grouped by domain)

### 3. Applications
- App distribution pie chart
- Hourly activity bar chart
- App list: name, color, category, hours, sessions, avg session

### 4. Browser Activity
- Domain tracking list
- Category dropdown per domain
- Hourly activity chart

### 5. IDE Projects
- Project cards (expandable)
- AI usage charts per agent
- Tools scanning results
- Git status per project

### 6. External (FOCUS PAGE)
**Current features:**
- Activity grid (8 default activities: Studying, Exercise, Gym, Commute, Reading, Sleep, Eating, Short Break)
- Activity types: stopwatch (timed), sleep (special), checkin (quick)
- Stats cards: Today, Consistency %, Sleep Deficit, Avg Sleep
- Charts toggle: Activity Breakdown + Weekly Comparison

**Activity grid behavior:**
- Click activity → starts timer → shows stopwatch view
- Stopwatch view shows: running timer, activity name, Stop button, per-activity stats (Today/Week/Month)

### 7. Insights (FOCUS PAGE)
**Current features:**
- Stats cards: Total Time, Consistency %, Streak, Best Day, Sleep Deficit
- Charts: Weekly Consistency, Sleep Trends, Activity Breakdown, Typical Day

---

## ⚠️ CRITICAL: WHAT'S DUPLICATED (DO NOT REPLICATE)

### Duplication Issue #1: Activity Breakdown
- **External**: Horizontal bar chart showing hours per activity
- **Insights**: IDENTICAL horizontal bar chart
- **Action**: REMOVE from Insights, KEEP on External

### Duplication Issue #2: Sleep Trends  
- **External**: Line chart with sleep hours
- **Insights**: IDENTICAL line chart
- **Action**: REMOVE from Insights, KEEP on External

### What NOT to put on Insights:
- Anything showing "hours per external activity" (already on External)
- Sleep hours/trends (already on External)
- External consistency (already on External)

---

## 🎯 REDESIGN TASK: EXTERNAL PAGE

### Current Problem:
When user clicks an activity on External page:
- ✅ Shows stopwatch timer
- ✅ Shows activity name
- ✅ Shows Stop button
- ❌ Does NOT show any detailed charts specific to that activity
- ❌ No way to see timer without selecting activity first

### What to ADD to External:

**1. Always-visible Timer Section (new)**
- Show a timer/stopwatch display even when NO activity is selected
- Allow user to select activity from this view
- "Select activity to track" prompt

**2. Activity-Specific Detail View (when activity running OR selected)**
Currently shows:
- Timer
- Activity name  
- Stats (Today/Week/Month time)

ADD:
- Activity-specific chart (customizable per activity)
- Historical data for THIS activity
- Trend line for this activity over time

**3. Per-Activity Chart Customization**
- Each activity can have its own display preference
- Options per activity:
  - Stats only (no chart)
  - Bar chart (hours per day)
  - Line chart (trend over time)
  - Calendar heatmap
- Store preference in database per activity

### Design Guidelines for External:
- Dark theme (zinc-900 bg, zinc-800 cards)
- Activity cards: rounded-xl, colored border by activity color
- Timer: large monospace font (5xl)
- Charts: use existing Chart.js patterns from other pages
- Keep activity colors consistent per activity

---

## 🎯 REDESIGN TASK: INSIGHTS PAGE

### Current State (will be EMPTY):
After removing Activity Breakdown + Sleep Trends (duplicated with External), Insights has:
- Stats cards (will keep)
- Weekly Consistency chart (will keep - unique)
- Typical Day chart (will keep - unique)
- NOTHING ELSE

### What Insights Should Show (NEW CONTENT):

**Constraint:** Must NOT duplicate anything already on:
- Dashboard (solar system, heatmap, timer)
- Productivity (pie charts, tier breakdown)
- Applications (app distribution)
- Browser Activity (domain tracking)
- External (activity breakdown, sleep, consistency) ← NEW!

### Recommended NEW Content for Insights:

**Option A: Goals & Targets** (Recommended - fitness app style)
- Daily target hours (e.g., 8h)
- Weekly target hours (e.g., 40h)
- Progress bars: Actual vs Target
- Goal streak (consecutive days meeting target)
- Visual gauge/meter

**Option B: Best Times Analysis**
- Most productive hour (0-23 heatmap)
- Most productive day of week (Mon-Sun)
- Peak focus time indicators

**Option C: Focus Flow**
- Average session duration
- Break frequency
- Deep work indicators

**Recommendation: Option A (Goals & Targets)**
- Similar to fitness app streak tracking
- Clear progress visualization
- Not duplicated anywhere else on app
- High user value

### Design Guidelines for Insights:
- Dark theme (zinc-900 bg)
- Progress bars with percentage fill
- Large number displays for goals
- Streak counter with flame emoji 🔥
- Green = on track, Amber = behind, Red = behind significantly

---

## 📋 DESIGN DELIVERABLES

### 1. External Page Redesign:
- [ ] Always-visible timer section (visible before selecting activity)
- [ ] Activity detail view with historical chart
- [ ] Per-activity chart customization UI

### 2. Insights Page Redesign:
- [ ] Remove duplicated charts (Activity Breakdown + Sleep Trends)
- [ ] Add Goals & Targets section (new)
- [ ] Progress bars for daily/weekly targets

---

## 🎨 DESIGN SYSTEM REFERENCE

### Colors:
- Primary: Emerald-500 (#10b981)
- Secondary: Amber-500 (#f59e0b)
- Accent: Violet-500 (#8b5cf6)
- Background: Zinc-900 (#18181b)
- Card: Zinc-800 (#27272a)
- Text: Zinc-100 (#f4f4f5)
- Muted: Zinc-400 (#a1a1aa)

### Chart Colors:
- Green: #22c55e (productive)
- Yellow: #eab308 (neutral)  
- Red: #ef4444 (distracting)
- Blue: #3b82f6 (sleep/tracking)

### Components:
- Cards: `bg-zinc-800/50 rounded-xl p-4`
- Buttons: `bg-emerald-500 hover:bg-emerald-600 rounded-lg`
- Stats: Large text (2xl), bold

---

## 📝 NOTES FOR DESIGNER

1. **DO NOT** create charts that already exist on other pages
2. **DUPLICATE CHECK** before adding any chart:
   - Is it on Dashboard? → Don't add
   - Is it on Productivity? → Don't add
   - Is it on External? → Don't add (unless moving FROM Insights)
3. **PRIORITIZE** content that adds NEW value
4. External page is for LIFE ACTIVITIES (not computer)
5. Insights page is for ANALYTICS about your data

---

**Prompt Created:** 2026-04-26
**Context:** Updated with full page structure from state.md