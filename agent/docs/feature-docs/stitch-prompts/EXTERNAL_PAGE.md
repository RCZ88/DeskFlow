# Stitch Prompt: External Activity Page

Use with `generate_screen` tool.

---

## Product Intent

Design an external activity tracking page for a personal computer usage tracker desktop application. This is where users track time spent on activities outside the computer (Study, Exercise, Sleep, Eating, etc.).

---

## The Vibe

- Dark mode (background #0f0f0f or #1a1a1a)
- Clean, minimal, action-oriented
- Clear visual hierarchy
- Tailwind CSS, Inter font
- Rounded corners (8px)

---

## Structural Layout

**Top Banner** (fixed height ~80px):
- Today's total external time (large display)
- Target vs actual comparison
- Deficit/surplus indicator

**Middle Section** (flexible):
- Activity grid (3x3)
- Large tappable buttons
- Active state shows running timer

**Bottom Section** (scrollable):
- Recent sessions list
- Session cards with activity, duration, time

---

## Component Specificity

### 1. Header Banner
- Large text: "Today: Xh Xm"
- Subtitle: "Target: 8h"
- Status pill: "+1h" (green) or "-2h" (red)

### 2. Activity Grid
- 9 buttons in 3x3 grid
- Each button:
  - Icon (emoji)
  - Activity name
  - Background color based on type
- Active state:
  - Different background
  - Timer display on button
  - Pulsing indicator

### 3. Activity Types
- **Productive** (green themes):
  - 📚 Study / Learning
  - 💪 Exercise / Gym
  - 🏃 Running
  - 📖 Reading
- **Rest** (blue themes):
  - 😴 Sleep
  - 🍔 Eating
  - ☕ Break
- **Commute** (orange theme):
  - 🚗 Commute

### 4. Mode Indicators
- **Stopwatch**: For timed activities (Study, Exercise, Reading)
- **Check-in**: For quick activities (Eating, Break)
- **Sleep**: Special mode with wake-up time picker

### 5. Recent Sessions List
- Scrollable list
- Each item shows:
  - Activity icon + name
  - Duration (formatted)
  - Start time
- Swipe to delete (optional)

---

## Design Requirements

1. Grid buttons should be at least 80x80px for touch accessibility
2. Active activity should be visually distinct
3. Timer display should update in real-time (simulated)
4. Dark theme with good contrast
5. Export as complete HTML/CSS

---

## Notes

- This page should be immediately usable - no deep navigation needed
- Primary action is starting/stopping activities
- Stats should be visible at a glance