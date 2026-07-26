# Stitch Prompt: Dashboard Redesign

Use with `generate_screen` tool.

---

## Product Intent

Design a productivity Dashboard for a personal computer usage tracker desktop application. The Dashboard is the main overview page showing productivity metrics, external activity tracking, and app usage visualization.

---

## The Vibe

- Dark mode (background #0f0f0f or #1a1a1a)
- Modern card-based layout with subtle gradients
- Productivity-focused, clean but data-rich
- Tailwind CSS, Inter font
- Rounded corners (8px)
- Subtle borders (#2a2a2a)

---

## Structural Layout

**Top Section** (40% height):
- Productivity stopwatch - large, prominent display
- Shows HH:MM:SS format
- Activity name below timer
- Start/Stop/Reset buttons

**Middle Section** (30% height):
- Quick external activity launcher
- Grid of 6-8 activity buttons (2-3 columns)
- Icons + labels for each activity

**Bottom Section** (30% height):
- Two columns side by side:
  - Left: Weekly hours heatmap (7 days)
  - Right: Solar system visualization

---

## Component Specificity

### 1. Productivity Stopwatch
- Large digital clock display (48px font)
- Format: HH:MM:SS
- Current activity name displayed below
- Three buttons: START (green), STOP (red), RESET (gray)
- Only tracks "productive" activities: Learning, Exercise, Reading, Deep Work
- Accumulates time when productive activity is running
- Resets to 0 when non-productive activity starts (distraction)

### 2. Activity Launcher Grid
- 2x3 or 3x3 grid of buttons
- Each button: Icon (emoji or SVG) + Activity name
- Activities: Study, Exercise, Gym, Running, Reading, Sleep, Eating, Break
- Color-coded by type:
  - Productive (green accent): Study, Exercise, Gym, Running, Reading
  - Rest (blue accent): Sleep, Eating, Break
- Tappable buttons with hover/active states

### 3. Weekly Heatmap
- 7 columns (Mon-Sun)
- Color intensity based on hours:
  - 0h: #1a1a1a (darkest)
  - 1-2h: #2a4a2a
  - 2-4h: #3a6a3a
  - 4-6h: #4a8a4a
  - 6h+: #5aaa5a (brightest green)
- Shows total hours per day below each column
- Current day highlighted with border

### 4. Solar System Visualization
- Central sun (static/docked apps)
- Orbiting planets represent tracked apps
- Planet size = usage time
- Planet color = app category
- Orbit lines visible
- App labels on hover

---

## Design Requirements

1. All text must be legible on dark background
2. Provide adequate contrast ratios (4.5:1 minimum)
3. Interactive elements must have visible hover/active states
4. Responsive collapse to single column on narrow viewports
5. Include realistic placeholder data for visualizations
6. Export as complete HTML/CSS

---

## Sample Response Structure

```json
{
  "title": "App Tracker Dashboard",
  "screens": [{
    "prompt": "Productivity dashboard with stopwatch, activity launcher, heatmap, solar system",
    "htmlCode": { ... },
    "screenshot": { ... }
  }]
}
```