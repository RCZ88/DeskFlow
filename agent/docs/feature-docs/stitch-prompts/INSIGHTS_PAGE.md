# Stitch Prompt: Insights/Analytics Page

Use with `generate_screen` tool.

---

## Product Intent

Design an analytics and insights page for a personal computer usage tracker. This page shows historical data, trends, and deep dives into productivity patterns.

---

## The Vibe

- Dark mode (#0f0f0f or #1a1a1a)
- Data-rich, chart-focused
- Clear contrast for readability
- Tailwind CSS, Inter font
- Chart cards with distinct backgrounds

---

## Structural Layout

**Header**:
- Page title "Insights" or "Analytics"
- Date range selector (This Week / This Month / All Time)

**Content** (scrollable):
- Stacked chart cards
- Each chart is full-width or contained
- Clear labels and legends

---

## Component Specificity

### 1. Weekly Consistency Chart
- Bar chart showing hours per day
- 7 bars (Mon-Sun)
- Horizontal target line at 30 hours/week
- Color: Bars green if met target, red if not
- Y-axis: Hours (0-10h)
- Labels: Day name + hours

### 2. Sleep Trends Chart
- Line or area chart
- X-axis: Days (last 7-30 days)
- Y-axis: Hours (0-12h)
- Shows target line (8h)
- Sleep deficit shaded

### 3. Activity Breakdown
- Horizontal stacked bar
- Each activity a different color
- Legend with activity names
- Total hours labels

### 4. Hourly Heatmap
- 24 columns (hours) x 7 rows (days)
- Or 7 columns x 24 rows (day x hour)
- Color intensity = activity level
- Dark = no activity, Bright = high activity

### 5. Day-of-Week Analysis
- Bar chart comparing days
- Mon, Tue, Wed, Thu, Fri, Sat, Sun
- Shows which day is most productive

### 6. Typical Day Mapping
- Timeline visualization
- Shows "typical" day structure
- When study, eat, sleep typically happens

---

## Design Requirements

1. Charts should use realistic placeholder data
2. Clear axis labels and legends
3. Good color contrast
4. Scrollable if content exceeds viewport
5. Export as complete HTML/CSS

---

## Chart Color Palette

- Primary (productive): #22c55e (green-500)
- Rest (sleep): #3b82f6 (blue-500)
- Warning/Deficit: #ef4444 (red-500)
- Neutral: #6b7280 (gray-500)
- Background: #1a1a1a
- Card: #262626