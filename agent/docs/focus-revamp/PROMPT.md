# Design Prompt — Focus as Productivity Subpage

## Raw Request

"I HAVE TOLD YOU THAT IT SHOULD BE A SINGLE STANDALONE IDIOT. THE UI IS ALSO VERY UGLY. I NEED YOU TO USE Generate prompt to configure which page it should be on like a subpage of something for example or combining it with the productivity page."

---

## Problem Statement

The Deep Focus feature is currently implemented as a standalone page (`/focus`) with its own sidebar item. This is wrong — Focus should live INSIDE the Productivity tab of the Activity page, as a natural extension of productivity tracking. The current UI is also basic and unpolished (plain buttons, no visual hierarchy, no animations, no depth).

**Goal:** Redesign Focus as a beautiful, integrated section within the Productivity page — not a separate page. The UI must feel like a premium feature of a productivity tracker, not an afterthought.

---

## Context Bundle

Read `CONTEXT_BUNDLE.md` in the same directory. It contains:
- Full DB schema (`deep_focus_sessions`, `deep_focus_events`)
- IPC endpoints (`focus:start`, `focus:end`, `focus:get-state`, `focus:history`, `focus:onState`, `focus:onEnded`)
- The `useFocusSession` hook code
- ActivityPage tab system structure
- ProductivityPage structure (1621 lines, uses charts, GlassCard, SectionHeader, NumberTicker)
- Design tokens (glass layers, accents, radius, padding, fonts)
- Available Magic UI components (animated-circular-progress-bar, particles, number-ticker, etc.)
- Available Lucide icons
- Available DeskFlow custom components (GlassCard, SectionHeader, NumberTicker, DotPattern, Badge)

---

## Architecture Mandate

**Focus must become a section within ProductivityPage, not a standalone page.**

### What to remove:
- The standalone `/focus` route in App.tsx
- The `Focus` sidebar item in App.tsx
- The `FocusPage.tsx` file (contents will be absorbed into ProductivityPage)

### What to add to ProductivityPage:
A new "Deep Focus" section that sits below the existing productivity score/charts. This section contains:

1. **Session Control Panel** — a beautiful glass card with:
   - An animated circular progress ring (Magic UI `animated-circular-progress-bar`) showing remaining time as a percentage of planned duration
   - Large countdown timer in the center of the ring (use `NumberTicker` for smooth digit transitions)
   - Session status indicator (active/idle/completed)
   - Preset duration chips: 5m, 10m, 15m, 25m, 50m, 90m
   - Strict mode toggle with clear explanation
   - Start/End button with appropriate styling (green for start, red for end)

2. **Today's Focus Stats** — a compact stats row:
   - Total focus time today (use `NumberTicker` for animated counting)
   - Sessions completed today
   - Completion rate with color coding
   - Current streak (consecutive days with at least 1 focus session)

3. **Session History** — an elegant history view:
   - Each session as a card (not a table row) showing: duration, planned time, outcome badge, strictness indicator
   - Failed sessions show what broke the session
   - Completed sessions show a green checkmark with confetti effect (Magic UI `confetti`) on first view
   - Empty state: motivational message with a "Start your first session" CTA

4. **Focus Insights** (bonus — if data exists):
   - Weekly focus trend mini-chart (line chart, same style as ProductivityPage's weekly trend)
   - Best focus time of day
   - Average session length

---

## Visual Design Spec

### Color System
- Primary accent: `pink-500` (#ec4899) for focus-related elements
- Success: `emerald-400` (#34d399) for completed sessions
- Warning: `amber-400` (#fbbf24) for strict mode
- Danger: `rose-400` (#fb7185) for end/abort actions
- Background: `zinc-900/60` with `backdrop-blur-xl` (GlassCard default)

### Typography
- Timer display: `text-5xl font-bold tabular-nums` (like a real timer)
- Section headings: `text-sm font-semibold text-zinc-300` (match ProductivityPage)
- Stats values: `text-2xl font-bold tabular-nums` (match ProductivityPage stat cards)
- Labels: `text-[10px] text-zinc-500 uppercase tracking-wider` (match ProductivityPage)

### Spacing
- Section padding: `p-5` (20px) inside GlassCard
- Card gap: `gap-5` between cards
- Internal element gap: `gap-4` within cards
- Preset button grid: `grid-cols-6` with `gap-2`

### Animations
- Session start: ring animates from 0% to 100% fill over session duration
- Countdown: smooth digit transitions using NumberTicker
- Preset selection: scale bounce on click (`whileTap={{ scale: 0.95 }}`)
- Session complete: confetti burst (Magic UI confetti component)
- Idle → Active: crossfade with y-offset transition (`AnimatePresence mode="wait"`)
- Stats update: number ticker animation when values change

### Layout
- The Focus section should be a full-width section below the existing ProductivityPage charts
- Use a 2-column grid on desktop: left column for session control (1/3 width), right column for stats + history (2/3 width)
- Stack vertically on narrow screens

---

## Anti-Slop Requirements

1. NO default purple/indigo gradients — use DeskFlow's pink accent for focus
2. NO generic table for history — use card-based layout
3. NO plain text timer — use animated circular progress + NumberTicker
4. NO missing states — must handle: empty (no sessions), loading, active session, session complete, error
5. All icons from lucide-react — no emoji, no inline SVG
6. Glass card layers — no opaque backgrounds
7. `rounded-xl` max radius, `p-5` padding
8. Geist/Inter body, JetBrains Mono for timer digits
9. Respect `prefers-reduced-motion` — wrap animations in media query check
10. Dark mode only — strip any light-mode variants

---

## MCP Component Usage

### Magic UI
| Component | Use for |
|-----------|---------|
| `animated-circular-progress-bar` | Timer ring showing session progress |
| `confetti` | Celebration effect on session completion |
| `particles` | Ambient background effect during active session (subtle, low opacity) |
| `number-ticker` | Smooth digit transitions in countdown and stats |

### Lucide Icons
| Icon | Use for |
|------|---------|
| `Focus` | Section header icon |
| `Target` | Preset buttons, goal indicator |
| `Play` | Start session button |
| `Square` | End session button |
| `Clock` | Timer, history entries |
| `CheckCircle2` | Completed outcome |
| `XCircle` | Failed outcome |
| `AlertTriangle` | Aborted outcome, strict mode warning |
| `TrendingUp` | Focus insights |
| `Flame` | Streak indicator |
| `Sparkles` | Session complete celebration |
| `ChevronDown` | Expandable sections |
| `Eye`, `EyeOff` | Strict mode toggle |

### DeskFlow Components
| Component | Use for |
|-----------|---------|
| `GlassCard` (accent="pink") | Session control card |
| `GlassCard` (variant="interactive") | History session cards |
| `SectionHeader` | "Deep Focus" section header |
| `NumberTicker` | Animated stat values |
| `DotPattern` | Subtle background pattern |
| `Badge` | Outcome badges (completed/failed/aborted) |

---

## Backend Verification

All backend infrastructure exists and is real (not stubs):
- ✅ IPC channels: `focus:start`, `focus:end`, `focus:get-state`, `focus:history` — all wired in preload.ts and main.ts
- ✅ DB schema: `deep_focus_sessions`, `deep_focus_events` tables with proper indexes
- ✅ Service: `focusManager.ts` handles session lifecycle, overlay window, browser tracking integration
- ✅ Events: `focus:state` and `focus:ended` IPC events for real-time updates
- ✅ Browser tracking server endpoints: `/focus-state`, `/focus-web-activity`, `/focus-break` on 127.0.0.1:54321

No backend gaps. This is a pure UI/UX redesign.

---

## Output Requirements

Provide a complete RESULT.md with:

1. **Component architecture** — exact file structure, imports, component hierarchy
2. **Full component code** — production-ready React + TypeScript code for:
   - `FocusSection.tsx` — the main focus section component
   - `FocusTimer.tsx` — the circular progress + countdown timer
   - `FocusStats.tsx` — today's stats row
   - `FocusHistory.tsx` — session history cards
   - `FocusInsights.tsx` — weekly trend and best time analysis
3. **Integration code** — exact changes needed in:
   - `ProductivityPage.tsx` — where to add the FocusSection, what props to pass
   - `App.tsx` — what to remove (route + sidebar item)
4. **CSS/Tailwind classes** — exact classes for every element, matching DeskFlow tokens
5. **Animation specs** — framer-motion variants, Magic UI component integration
6. **State management** — how useFocusSession integrates, what state flows where
7. **Empty/loading/error states** — exact UI for each state

Do NOT provide options. Provide THE solution.
