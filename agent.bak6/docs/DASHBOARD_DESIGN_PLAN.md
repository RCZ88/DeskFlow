# Dashboard Design Plan - Lock-In Productivity Tracker

## Current Issues ❌
1. External activities auto-start stopwatch on click (should be manual)
2. Dashboard focuses on external activities (Study, Exercise) not app tracking
3. Heatmap & Solar system isolated at bottom (not integrated)
4. Manual START/STOP buttons removed but UI doesn't feel intuitive
5. No quick access to switch between activities
6. Layout doesn't feel cohesive

## Design Goals ✅

### Core Philosophy: "Lock-In Timer"
- **Main focus**: Shows how long user has been **locked in to productive work**
- **Auto-counting**: Timer automatically counts based on current app/website tier
- **Smart reset**: Timer resets to 0 when user switches to distracting activity
- **No manual controls**: No play/pause - purely automatic based on app detection
- **Visual feedback**: Shows current app + category so user knows why timer is counting/paused

### Key Features

#### 1. **Giant Lock-In Timer** (Center)
```
┌─────────────────────────────────┐
│  🔒 LOCK-IN TIME                │
│                                 │
│       HH:MM:SS                  │
│  (super large, bold font)       │
│                                 │
│  Currently: [App Name]          │
│  [Category] • [Tier Badge]      │
│                                 │
│  ✅ Productive / ⏸️ Idle        │
└─────────────────────────────────┘
```

#### 2. **Quick Activity Launcher** (Below timer)
Small grid of external activities (Study, Exercise, Sleep, Eating, etc.)
- **NOT auto-starting**: Clicking just selects the activity
- **Manual START button**: Separate button user must click to start
- Shows activity name + color + icon
- Visual indication of which is selected

#### 3. **Integrated Stats Section** (Right side or below)
Instead of isolated bottom section:
- **Heatmap** (weekly hours): Shows productivity trend
- **Solar System** (app usage): Shows app breakdown
- Both integrated into main layout, not hidden at bottom

#### 4. **Session History** (Bottom, collapsible)
- Recent productive sessions with:
  - App/website name
  - Duration
  - Time slot
  - Tier (productive/neutral/distracting)

---

## Layout Options

### Option A: Two-Column (Recommended)
```
┌──────────────────────────────────────────────┐
│ Dashboard                                    │
├──────────────────────┬──────────────────────┤
│                      │                      │
│    LOCK-IN TIMER     │   WEEKLY HEATMAP     │
│    (large center)    │   (7-day bars)       │
│                      │                      │
│                      ├──────────────────────┤
│  Current: VS Code    │                      │
│  IDE • Productive    │   APP USAGE SOLAR    │
│                      │   (orbital view)     │
│                      │                      │
├──────────────────────┴──────────────────────┤
│ Quick Activities: [Study] [Exercise] [Gym]  │
│                  [Sleep]  [Eating]  [Break] │
├──────────────────────────────────────────────┤
│ Recent Sessions                              │
│ • VS Code → 2h 34m (IDE - Productive)      │
│ • Chrome → 45m (Browser - Neutral)         │
│ • Twitter → 15m (Social - Distracting) ⚠️  │
└──────────────────────────────────────────────┘
```

### Option B: Stacked (Mobile-friendly)
```
┌─────────────────────┐
│   LOCK-IN TIMER     │
│      HH:MM:SS       │
│                     │
│  Current: [App]     │
│  [Category/Tier]    │
├─────────────────────┤
│  WEEKLY HEATMAP     │
│  [7 bars]           │
├─────────────────────┤
│  APP USAGE SOLAR    │
│  [orbital]          │
├─────────────────────┤
│ Quick Activities    │
│ [Grid of buttons]   │
├─────────────────────┤
│ Recent Sessions     │
│ [List]              │
└─────────────────────┘
```

---

## Color & Visual Design

### Tiers (Consistent across app)
- **Productive** 🟢: `#22c55e` (emerald-400)
- **Neutral** 🔵: `#3b82f6` (blue-400)
- **Distracting** 🔴: `#ef4444` (red-400)

### Typography
- **Timer**: 72px, bold, monospace (Impact font or similar)
- **Labels**: 14px, uppercase, tracking-wider
- **Activity names**: 16px, medium weight

### Cards/Glass Effect
- Dark background: `#0f0f0f` (zinc-950)
- Glass cards: `bg-zinc-900/50` with border
- Border color changes based on tier

### Animations
- Timer: smooth pulse when productive
- Activity buttons: hover/select state with tier color
- Session items: slide in from bottom

---

## Implementation Details

### Dashboard Component Structure
```
DashboardPage
├── Header (Title + Current Status)
├── LockInTimer
│   ├── Big Timer Display (HH:MM:SS)
│   ├── Current App Info (name + category + tier)
│   └── Tier Status Badge
├── QuickActivitiesLauncher
│   ├── Activity Buttons Grid
│   └── Manual START Button (for external activities)
├── StatsSection (Two-column)
│   ├── WeeklyHeatmap
│   │   └── Bar chart (7 days)
│   └── AppUsageSolar
│       └── Orbital visualization
└── RecentSessions
    └── List of last 10 sessions
```

### Data Flow
1. **onForegroundChange**: App/browser change detected
2. **getTierFromCategory()**: Determine if productive/neutral/distracting
3. **Auto-counting logic**: 
   - If tier === productive → increment timer
   - If tier !== productive → reset timer to 0
4. **Send to UI**: Timer display updates, current app shown

### External Activity Changes
**OLD BEHAVIOR:**
- Click activity → auto-start stopwatch

**NEW BEHAVIOR:**
- Click activity → select activity (highlight it)
- Click START button → start manual stopwatch for that activity
- Activity is logged when user clicks STOP

---

## Stitch MCP Usage

Generate Dashboard UI using Stitch with prompt:
```
Create a modern productivity dashboard UI with:
1. Large, bold HH:MM:SS timer in center ("Lock-In Time")
2. Shows current app/website being tracked (name + category + tier badge)
3. Tier indicator: Green (Productive), Blue (Neutral), Red (Distracting)
4. Weekly heatmap below timer (7 bars showing productivity trend)
5. App usage solar system (orbital view) next to heatmap
6. Quick activity launcher with 6 buttons (Study, Exercise, Gym, Sleep, Eating, Break)
7. Recent sessions list at bottom (app name, duration, time, tier)
8. Dark theme: #0f0f0f background, #1a1a1a cards
9. Bold aesthetic, intentional spacing, refined typography
10. Use Tailwind CSS, no shadcn/ui, minimal animations
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DashboardPage.tsx` | Complete redesign with Stitch UI |
| `src/pages/ExternalPage.tsx` | Remove auto-start, add manual START button |
| `src/pages/ProductivityPage.tsx` | Already has sessions, verify display |
| `src/main.ts` | Verify Electron filtering still works |

---

## Success Criteria ✅

- [ ] Dashboard shows giant lock-in timer
- [ ] Timer auto-counts when on productive apps
- [ ] Timer resets to 0 on distracting apps
- [ ] Current app/category visible under timer
- [ ] Heatmap + Solar integrated in main view (not bottom)
- [ ] Quick activities grid on dashboard
- [ ] External activities don't auto-start (manual START button)
- [ ] Recent sessions shown below (or collapsible)
- [ ] Dark theme matches app aesthetic
- [ ] Responsive (mobile + desktop)
- [ ] No Electron app tracking

---

## Next Steps

1. ✅ Create this design plan
2. ⬜ Use Stitch MCP to generate Dashboard UI mockup
3. ⬜ Implement redesigned DashboardPage.tsx
4. ⬜ Fix ExternalPage to remove auto-start
5. ⬜ Integrate heatmap + solar into main layout
6. ⬜ Test auto-counting logic
7. ⬜ Test external activity manual start
8. ⬜ Final styling pass

