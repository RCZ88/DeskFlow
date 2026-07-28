# PROMPT.md — Dashboard AI+Human System

## Raw Request
"the scheduling system AND THE OVERALL UI. THERE NO GOOD LOOKING AI ON THE DASHBOARD SCHEDULED DAILY CARDS THE ADDITION AND THE FEATURES ARE STILL SHIT. THE AGENT SYSTEM THAT ADDS THOSE AND HOW THE HUMAN CAN HAVE THE TOOLS AND UI TO HAVE THE SAME ABILITY WITH ALL OF THE FEATURES. LEADING TO WHICH LONG TERM GOAL IT IS. AND EVERYTHING RELATED TO THE BEST UI AND ALL OF THE FEATURES. some other features that might be useful that i dont know of YET"

## Context Bundle Reference
Read `CONTEXT_BUNDLE.md` for all code, types, IPC endpoints, MCP components, and design tokens.

## The Mandate

Design a comprehensive dashboard system where the AI is the planner and the human is the executor with full control.

### A. AI Is The Planner
The AI automatically generates daily goals by:
1. Reading all long-term goals (via `getLongtermGoals`)
2. Analyzing recent app usage patterns (via `getDashboardAggregates`)
3. Checking what was completed/missed yesterday (via `getGoals`)
4. Generating 3-5 daily goals that serve specific long-term goals
5. **Each daily goal MUST show: "→ Serves: [Long-term goal title]"** (this is the core requirement)
6. AI also suggests deadlines and schedule entries based on goals

### B. Human Has Full Control
The human can:
1. Add/edit/delete goals manually (same as AI)
2. Accept/reject AI suggestions
3. Override AI-generated deadlines
4. Modify the schedule
5. See WHY the AI suggested each item (reason string)
6. Start focus sessions linked to goals

### C. Everything Connects
```
Long-term Goal (strategic)
  └→ Daily Goal (tactical) [shows parent]
       └→ Deadline (when)
       └→ Schedule (when in day)
       └→ Focus Session (doing it)
       └→ App Tracking (evidence)
       └→ Daily Survey (did you do it?)
```

### D. Smart Features (things user doesn't know about yet)
1. **Goal Streaks**: Track consecutive days of completing goals per category
2. **Smart Reschedule**: If goal missed, AI suggests rescheduling to tomorrow
3. **Category Balance**: Visual warning if 80%+ goals are same category
4. **Time Estimation**: AI estimates minutes needed per goal based on history
5. **App Connection**: Auto-detect which apps relate to which goals (e.g. "IDE" → "work" goals)
6. **Weekly Review Card**: AI generates summary every Sunday
7. **Momentum Score**: Combined metric (streak × completion_rate × focus_hours)
8. **Goal Dependency**: Some goals block others (e.g. "Read chapter" before "Write summary")
9. **Energy Mapping**: High-energy goals in morning, low-energy in afternoon (based on usage patterns)
10. **Achievement Celebrations**: Confetti + animation when streak hits 7, 30, 100 days

## Design Requirements

### Use These MCP Components (REAL, installed in src/components/ui/)
| Component | Source | Use For |
|-----------|--------|---------|
| MagicCard (orb mode) | Magic UI | StatusBand mouse spotlight |
| GlareHover | Magic UI | Every goal/deadline/schedule item |
| BorderBeam | Magic UI | Active states, current items |
| NumberTicker | Magic UI | Progress counters, streaks |
| AnimatedCircularProgressBar | Magic UI | Goal progress rings |
| AnimatedShinyText | Magic UI | Timer display, headers |
| AnimatedGradientText | Magic UI | Section headers |
| Confetti | Magic UI | Goal completion, streak milestones |
| Particles | Magic UI | Background ambiance |
| DotPattern | Magic UI | Page background |
| Button/Input/Badge/Select | shadcn | Forms, labels, controls |
| Popover/Calendar | shadcn | Date pickers |
| Progress | shadcn | Progress bars |
| Skeleton | shadcn | Loading states |
| All Lucide icons | Lucide | Icons throughout |

### Visual Rules (from Frontend Design Skill)
- Dark mode only (zinc-950 background)
- Glass cards: `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60`
- Max rounded-xl (12px), p-5 padding
- Geist + JetBrains Mono fonts
- Each card type has unique accent color
- Real micro-interactions on every action
- Empty/loading/error states for every card
- Never use emoji as UI icons
- 8px grid spacing
- Animation: fast 150ms, normal 250ms, slow 400ms
- Easing: cubic-bezier(0.16, 1, 0.3, 1)

### Motion Rules (from Motion Skill - Level 2: Responsive)
- Hover lift + press on interactive elements
- List stagger on goal/deadline items (staggerChildren: 0.05)
- AnimatePresence enter/exit for modals and lists
- Breathing status dot on active items
- Number count-up on streak/score displays
- ONE ambient accent (gradient drift behind hero)
- Reduced-motion fallback for all animations

### UX Rules (from Human-Centric Skill)
- Every data-driven component must have Empty/Loading/Error/Populated states
- Primary action obvious in <1s
- Progressive disclosure (hide advanced options)
- All interactive elements have hover/focus/active/disabled states
- State changes animate 150-300ms
- Destructive actions require confirmation
- Copy is plain-language (no system tokens)
- Touch targets ≥ 44px

## Requirement Checklist

### Data Processing
- [ ] AI reads long-term goals and generates daily breakdown
- [ ] Each daily goal links to parent long-term goal (parentId)
- [ ] Progress tracking via app usage (matchCategory)
- [ ] Streak calculation across days
- [ ] Momentum score formula
- [ ] Category balance analysis
- [ ] Time estimation based on history

### Visual Specs
- [ ] StatusBand: Mouse spotlight orb, focus CTA, browser/app icon
- [ ] GoalsCard: AI suggestions section, goal items with parent link, edit/delete, progress ring
- [ ] DeadlinesCard: Urgency colors, priority badges, connected goal display
- [ ] ScheduleCard: Time blocks, color-coded, connected goals
- [ ] DailySurveyCard: End-of-day review with AI questions
- [ ] StreakCard: Current streak, best day, calendar heatmap
- [ ] MomentumScore: Animated gauge with breakdown

### UX Flow
- [ ] Dashboard loads → AI generates suggestions → Human reviews
- [ ] Human adds goal → Form with category, period, target, parent link
- [ ] Human clicks goal → Shows connected long-term goal, deadline, schedule
- [ ] Focus session starts → Goal linked, progress tracked
- [ ] Day ends → Survey card appears, AI asks about completion
- [ ] Streak hits milestone → Celebration animation

### Edge Cases
- [ ] No long-term goals set → AI suggests creating first one
- [ ] No app usage data → AI uses category defaults
- [ ] All goals completed → Show celebration state
- [ ] No goals for today → Show "AI is thinking..." or manual add prompt
- [ ] Goal missed 3 days → AI suggests downgrading or rescheduling
