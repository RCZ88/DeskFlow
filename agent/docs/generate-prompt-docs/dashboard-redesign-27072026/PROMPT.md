# PROMPT.md — Dashboard Redesign

## Raw Request

> "Okay, so the current dashboard is based on the documents of planning we had on the, let's see, I think it was the, that's somewhere in the dashboard, redump, but like the new one, right? I think the ones on the, this will read on premium redesign if you can see that I'm the agents to stocks, but the problem, there's several problems with the stock, it's the dashboard thing is that, first of all, there's like this focus up score out of 100, which is like really ugly, and doesn't really make any sense considering that we already have the future of the productivity percentage, right? it's supposed to show, I mean, what is the point of this having this next focus up thing, and like, it just doesn't make any sense to me, right?
>
> And then also there's this streak and then Monday with the trophy and then the hours depth there, it's not working properly and then the Monday, I have no idea what this Monday is for, the Monday and then the trophies, it's supposed to just show what day it is today, but like why is there a trophy and then why is there a streak system where I don't even know what the streak is supposed to mean, right?
>
> Okay, and then next up for the timer, I think, overall, it's not really that freeing even, the pinned activity is way on the bottom, so I need to make sure the pinned activity, the reason why we even pinned those activity and we add those pinned features is to that make sure that accessing those external activities become easier, but we put it at the bottom and the users require to scroll, so that means it's very tedious to do so and it's reducing the point of like having it in the dashboard at the first place, right?
>
> And next up, I would say the schedule system, I haven't tried it yet because I don't have those stuff here, but like the AI inside is fun, but it still has the AI inside, it has like this 10 counting, which doesn't make any sense, doesn't show anything, what does it mean by 12 count and 10 count, why is there a count in the thing, right? We remove those 12 counts and stuff and make sure that the styling of the AI inside is the ones, similar to it was an inside space where the styling is like really cool and stuff like that, and the deep focus, you haven't really revamped anything on those, and the productivity, the chart, which first to show the details and this was to be a button that I can click to view the heat map, right? The button is missing, and then the chart and then the aesthetic of the chart and the apical system, so simple solar system, which is overlaps the viewing of the button, the view solar system button, so we need to make sure that the button that views the solar system is not being, what is it called, destructed and overlapped and covered by the solar system, small visual thing, right?
>
> And then if we go to the mastery, you can see that the sleep card, you can see that there's nothing loading, so that means that it's not working properly, it's not showing any sleep property and the average and stuff like that, and I think a good thing that we need to include in the external activity or maybe on the sleep is that we can show like the average sleep time and like the average amount of sleep, right? How many hours is the amount of sleep? Yeah, that's basically it for the sleep ones, and like the average amount of sleep in terms of hours and like the time of sleep, time of wake up every time, and then the gaps, that should be on the external, those details should be on the external page, but in the sleep, make sure that it shows something which is currently doesn't show anything, and also the design with this red thing is kind of like really not premium at all, but you're not using the stuff, the skills properly, right?
>
> And I need you to make sure to use the generate prompt to solve all these problems and make sure that dashboard is extra polished with every single front end skill, you need it with including those skills in the context bundle to make sure that the AI that's receiving that's able to do it properly and stuff like that. Yeah, I do think that is all, make sure that you the purpose of this prompt is to explore and to alter this dashboard design in terms of the contents as well as how it is arranged and how what are the things that are displayed because currently some of the things just doesn't make any sense, like for example the focus I think, and where's the time, where is the place where it shows how much time of already, I've already, you know, unused, I've already focused up there, it's supposed to be at the previously there was a showing that it's, it can show how much time I've already focused for that day and stuff like that, so I need you to make sure that those are implemented properly, and I mean like the stuff like the redesign and the displaying of the schedules I haven't tested schedules yet because AI system page is still not working properly, but I need you to make sure that there's a good solid design with calendar systems and the deadlines, not really deadlines, maybe a good way of thinking about it is just like things that I need to do, yeah I mean deadlines is fine, sleep, okay, the relevancy of the following through and the dashboard is kind of minimal, right? we don't want to show the follow through data on the dashboard really, and so those are things, like the main point is to re-evaluate using all the features to see which one is actually worth putting on the dashboard and which one is not appropriate to put on the dashboard, you need to be giving all the context of all the features that we have, and most of the features, most of the useful features that we have, like for example on the resume page, I mean like on the let's say AI system stuff, but like at the same time not making the page redundant, right? the main key point here is to not make the actual full page redundant, the dashboard supposed to just summarize and give the small little details while not making the page itself, the focus page itself redundant because yeah it's very important. So I would like you to again use the generic prompt skill including all the front end skills and the MCPs and everything like that to provide necessary context about what things change and where the skills use and displaying the skills properly so that it's able to use it properly and stuff like that."

---

## Problem Statement

The Dashboard page (`src/pages/DashboardPage.tsx`, 2716 lines) has accumulated 10 rows of content with several critical UX and design problems:

1. **Redundant data** — ProductivityScore/100 appears in BOTH StatusBand (center) AND TierBreakdownStrip (Score column). Streak appears in BOTH StatusBand (Flame badge) AND TierBreakdownStrip (Trend column). This confuses users about which is authoritative.

2. **Unclear purpose** — The "Focus up" label when score < 40 means nothing. The Trophy badge showing "Mon" (bestDay) has no context. Users don't know what the streak measures.

3. **Missing "time focused today"** — The user wants to see accumulated focused time for the day. Currently only shows current session timer, not total.

4. **Pinned Activities buried** — At Row 7, users must scroll past 6 rows to reach quick-access activity buttons. Defeats the purpose of pinning.

5. **Sleep card broken** — `SleepBarMini` renders but shows nothing when `sleepData` is empty. No empty state. Red/rose colors feel cheap.

6. **Heatmap button missing** — No "View Heatmap" button near the productivity chart.

7. **Solar system overlaps button** — The inline 2D solar preview circles visually overlap the "View Solar System" button text.

8. **Follow Through irrelevant** — Full finance card on dashboard has minimal relevance.

9. **MasteryRingMini irrelevant** — Doesn't belong on dashboard.

10. **AI Insight "count" values** — Nonsensical "10 count" / "12 count" values in insight cards.

---

## Context Bundle Reference

**Read `agent/docs/generate-prompt-docs/CONTEXT_BUNDLE.md` first.** It contains:
- Full source of `StatusBand.tsx` (138 lines) — the component to revamp
- Full source of `TierBreakdownStrip.tsx` (99 lines) — columns to slim
- Full source of `SleepBarMini.tsx` (54 lines) — component to fix
- Full source of `PinnedActivities.tsx` (336 lines) — component to move up
- DashboardPage.tsx render section (lines 2390-2469) — the layout to reorder
- DashboardPage.tsx data fetching (lines 550-600) — streak/score computation
- Design tokens from `src/index.css`
- Glass card pattern
- Backend verification table

---

## Engineering Task

Design the data processing and state management for the following changes:

### A. StatusBand Revamp
- REMOVE: `productivityScore` prop, `streak` prop, `bestDay` prop, `sleepDebt` prop
- ADD: `totalFocusedMs` prop (accumulated productive time today, computed from `dashboardData.overview.productiveSeconds`)
- The timer already shows current session via `displayTimeMs`. The new prop shows daily total.
- Keep: `isCurrentlyProductive`, `isDistracting`, `currentAppName`, `displayTimeMs`

### B. TierBreakdownStrip Slim
- REMOVE: `score` and `trendValue`/`trendPositive` props
- Keep only: `productiveHours`, `neutralHours`, `distractingHours`, `totalHours`
- Change grid from `grid-cols-3 lg:grid-cols-6` to `grid-cols-2 lg:grid-cols-4`

### C. PinnedActivities Position
- Move from Row 7 to Row 2 (directly after StatusBand)
- Change from grid layout to horizontal scrollable strip for compactness
- Keep all existing functionality (start/stop, edit mode, add modal)

### D. SleepBarMini Fix
- Add empty state when `sleepData.length === 0`: moon icon + "No sleep data yet" + "Connect tracker or log manually"
- Change color palette from rose/red to indigo/violet for premium feel
- Add average bedtime and average wake-up time display when data exists
- The IPC call `getExternalSessions` may return sleep sessions — verify data shape

### E. Remove from Dashboard
- `FollowThroughCard` — remove from render (Row 6)
- `MasteryRingMini` — remove from render (Row 8 health stack)
- Solar system inline preview (Row 9) — remove entirely, keep only the modal accessible from Activity page

### F. Heatmap Button
- Add explicit "View Heatmap" button near the productivity chart (Row 7/8 area)
- Button triggers `setExpandedModal('heatmap')` (existing modal)

---

## Design Task

### High-Fidelity Visual Specs

#### StatusBand (New)
```
┌──────────────────────────────────────────────────────────────────────┐
│ [dot] HH:MM:SS  AppName          3h 42m focused today    Mon Jul 27 │
│  ●                (truncated)      (small, muted)         (mono, 11px)│
└──────────────────────────────────────────────────────────────────────┘
```
- LEFT: Status dot (green/red/gray) + AuroraText timer (current session, 2xl mono) + current app name (11px, muted, truncated)
- CENTER: "Xh Ym focused today" (13px, zinc-400, mono for the numbers)
- RIGHT: Current date (11px, zinc-500, mono)
- REMOVE: All badges (streak, trophy, sleep debt), NumberTicker/100, "Focus up" label
- Glass card pattern with pink-500 accent edge highlight (keep existing)

#### PinnedActivities (New Position, Horizontal Strip)
```
┌──────────────────────────────────────────────────────────────────────┐
│ [📖 Study] [🏋️ Gym] [🏃 Exercise] [📖 Reading] [😴 Sleep] [🍽️ Eating] │
└──────────────────────────────────────────────────────────────────────┘
```
- Horizontal scrollable row (overflow-x-auto, flex, gap-3)
- Each button: icon + name, compact pill shape
- Selected: green BorderBorderBeam + pulse + elapsed timer
- Edit mode: same as current (X to remove, + to add)
- No card wrapper needed — just the strip with mb-4

#### TierBreakdownStrip (Slimmed)
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ✓ Productive │ │ — Neutral    │ │ ✗ Distracting│ │ ⊙ Total     │
│    3.2h      │ │    1.5h      │ │    0.8h      │ │    5.5h      │
│ [====    ]   │ | [==      ]   │ | [=       ]   │ |              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```
- 4 columns only (down from 6)
- Each with progress bar showing proportion of total
- Same glass card pattern, same animation delays

#### SleepBarMini (Fixed)
```
┌──────────────────────────────────────┐
│ 🌙 Sleep                             │
│                                      │
│  ▐▌  ▐▌  ▐▌  ▐▌  ▐▌  ▐▌  ▐▌       │
│  ▐▌  ▐▌  ▐▌  ▐▌  ▐▌  ▐▌  ▐▌       │
│  ▐▌  ▐▌  ▐▌  ▐▌  ▐▌  ▐▌  ▐▌       │
│  M   T   W   T   F   S   S          │
│                                      │
│ Avg: 7.2h   Bedtime: 11:30 PM       │
│              Wake: 6:45 AM           │
│ -2.1h debt (if any)                  │
└──────────────────────────────────────┘
```
- Empty state: Moon icon (24px) + "No sleep data yet" (13px zinc-400) + "Connect tracker or log manually" (11px zinc-600)
- Colors: indigo-400/70 for bars >= 7h, indigo-400/30 for < 7h (keep existing)
- Add: Average bedtime + wake-up time row below the bar chart
- Premium feel: use indigo/violet accent (existing), NOT rose/red

#### Productivity Chart + Heatmap Button
```
┌──────────────────────────────────────┐
│ 📊 Productivity                      │
│  [Stacked Bar Chart]                 │
│                                      │
│ [View Heatmap]  [View Solar System]  │  ← Two buttons side by side
└──────────────────────────────────────┘
```
- Two buttons in a flex row below the chart
- "View Heatmap" triggers `setExpandedModal('heatmap')`
- "View Solar System" triggers `setExpandedModal('solar')`
- Buttons: `py-2 rounded-lg text-[12px] font-medium bg-zinc-900/40 text-zinc-400 border border-zinc-800/50 hover:bg-zinc-800/50`

---

## UX Task

### Interaction Flow
1. **Page load** → StatusBand animates in (opacity + y), shows timer counting up, "Xh Ym focused today" updates in real-time
2. **Pinned Activities** → immediately visible below StatusBand, horizontal scroll on mobile
3. **ScheduleCard** → shows current block with pink BorderBeam, upcoming blocks listed
4. **Goals/Deadlines/Focus** → 3-column grid, each with empty/loading/error states
5. **InsightStrip** → horizontal scroll of domain-colored cards
6. **TierBreakdown** → 4 stat cards with progress bars
7. **Productivity Chart** → stacked bar chart with "View Heatmap" and "View Solar System" buttons
8. **Recent Sessions** → activity feed list at bottom

### State Coverage (MANDATORY for every component)
- **Empty:** "No data yet" with icon + description
- **Loading:** Skeleton placeholder (animate-pulse)
- **Error:** "Something went wrong" with retry
- **Populated:** Normal display

### Feedback & Micro-interactions
- Cards lift on hover (`hover:-translate-y-0.5`)
- Active tracking dot pulses (`animate-pulse`)
- Selected pinned activity gets BorderBeam animation
- Timer uses AuroraText for color-shifting effect
- All transitions use `duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]`

---

## MCP Component Inventory

### shadcn/ui (61 components available)
| Component | Source | Use for |
|-----------|--------|---------|
| `card` | shadcn | Base card pattern (but we use custom glass pattern) |
| `badge` | shadcn | Status badges, tier labels |
| `skeleton` | shadcn | Loading states for all cards |
| `progress` | shadcn | Progress bars in TierBreakdown |
| `button` | shadcn | Action buttons (View Heatmap, Start Focus) |
| `scroll-area` | shadcn | Horizontal scroll for PinnedActivities |
| `tooltip` | shadcn | Hover tooltips on stat cards |
| `separator` | shadcn | Visual dividers between sections |

### Magic UI (77 components available)
| Component | Source | Use for |
|-----------|--------|---------|
| `aurora-text` | Magic UI | Timer text color-shifting effect (already used) |
| `number-ticker` | Magic UI | Animated number display (already used, removing from StatusBand) |
| `border-beam` | Magic UI | Active tracking indicator on PinnedActivities |
| `animated-gradient-text` | Magic UI | ScheduleCard header text |
| `particles` | Magic UI | QuickFocusCard background effect |
| `dot-pattern` | Magic UI | Background decoration |
| `bento-grid` | Magic UI | Alternative layout for stat cards |
| `blur-fade` | Magic UI | Page transition animation |
| `animated-list` | Magic UI | Recent Sessions list animation |
| `confetti` | Magic UI | Goal completion celebration |
| `glare-hover` | Magic UI | Card hover effect alternative |

### Lucide Icons (relevant to dashboard)
| Icon | Use for |
|------|---------|
| `Moon` | Sleep card |
| `Flame` | Streak (REMOVING from dashboard) |
| `Trophy` | Best day (REMOVING from dashboard) |
| `Clock` | Recent Sessions, timer |
| `Target` | Goals card, QuickFocus |
| `BarChart3` | Productivity chart |
| `Calendar` | Schedule card |
| `Sparkles` | AI Insights |
| `Sun` | App Ecosystem (REMOVING from dashboard) |
| `Zap` | Focus, productivity |
| `Play` | Start activity |
| `Edit3` | Edit pinned activities |
| `Plus` / `Minus` | Add/remove pinned activities |
| `CheckCircle2` | Productive hours |
| `MinusCircle` | Neutral hours |
| `XCircle` | Distracting hours |
| `TrendingUp` | Score (REMOVING) |
| `Activity` | Trend (REMOVING) |

---

## Frontend Design Skills (Load Order)

1. **Frontend Design** — DeskFlow-specific component patterns, tokens, spacing, typography, glass cards
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback
3. **Impeccable** — 7 design dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns
4. **Motion — Bring the UI Alive** — Liveliness Levels (L1 Composed / L2 Responsive / L3 Expressive), motion taxonomy, recipes
5. **UI UX Pro Max** — industry-specific design rules (dev tools, AI/ML, financial), style library
6. **Design Taste System** — master aggregator, design variance knobs, anti-repetition rules
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist

---

## Anti-Slop Checklist

After implementing any component, verify:
- [ ] NOT purple/indigo gradient-on-everything — use pink-500 primary, varied accents per card
- [ ] NOT same radius everywhere — use rounded-xl (12px) consistently
- [ ] NOT generic Inter-only — Geist body + JetBrains Mono code
- [ ] NOT flat cards — use glass pattern with top-edge highlights
- [ ] NOT missing empty/loading/error states — every data card needs all 3
- [ ] NOT emoji as UI icons — all from lucide-react
- [ ] NOT box-shadow in dark theme — use border + backdrop-blur
- [ ] NOT pure black (#000) backgrounds — use zinc-950 (#09090b)
- [ ] NOT >2 font families — Geist + JetBrains Mono only
- [ ] NOT animate layout properties (width/height) — animate only transform + opacity
- [ ] NOT using `rounded-2xl` or `rounded-3xl` — max `rounded-xl`
- [ ] NOT using `p-6` or `p-8` on cards — use `p-5`

---

## MCP Components (Source in CONTEXT_BUNDLE.md)

The target AI has NO access to MCP servers. All component source code is embedded in CONTEXT_BUNDLE.md under "MCP Component Source Code". Import already-installed components from:
```tsx
import { BorderBeam } from '../../components/ui/border-beam';
import { AuroraText } from '../../components/ui/aurora-text';
import { NumberTicker } from '../../components/ui/number-ticker';
import { AnimatedGradientText } from '../../components/ui/animated-gradient-text';
import { Particles } from '../../components/ui/particles';
import { DotPattern } from '../../components/ui/dot-pattern';
```

---

## Constraints

1. **Files to modify:** `StatusBand.tsx`, `TierBreakdownStrip.tsx`, `SleepBarMini.tsx`, `PinnedActivities.tsx`, `DashboardPage.tsx`
2. **Do NOT touch:** `index.html` fallback div, `vite.config.ts` emptyOutDir, preload.ts
3. **All animations respect `prefers-reduced-motion: reduce`**
4. **Build must succeed:** `npx vite build` → exit 0
5. **Preload must build:** `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
6. **App must launch:** `npx electron .` → visible content, no black screen
7. **Preserve CRLF line endings**
8. **Do NOT remove existing functionality** — only reposition, restyle, or remove redundant UI elements
9. **Follow Glass Card Pattern** from CONTEXT_BUNDLE.md for all new/modified cards

---

## Output Format

Provide the complete replacement source for each file:
1. `src/pages/dashboard/StatusBand.tsx` — full replacement
2. `src/pages/dashboard/TierBreakdownStrip.tsx` — full replacement
3. `src/components/dashboard/SleepBarMini.tsx` — full replacement
4. `src/pages/dashboard/PinnedActivities.tsx` — full replacement (horizontal strip)
5. `src/pages/DashboardPage.tsx` — only the render section (lines 2390-2595) showing new row order

Each file must be self-contained and immediately usable. Do not provide partial diffs or "change line X" instructions — provide the full replacement file.

---

## Implementation Steps (Follow In Order)

### Step 1: Read CONTEXT_BUNDLE.md
Read `agent/docs/generate-prompt-docs/dashboard-redesign-27072026/CONTEXT_BUNDLE.md` first. It contains every source file you need to modify.

### Step 2: Rewrite StatusBand.tsx
- REMOVE: `productivityScore`, `streak`, `bestDay`, `sleepDebt` props and their render sections (lines 109-133)
- REMOVE: `NumberTicker` import, `Flame`, `Trophy`, `Moon` imports
- ADD: `totalFocusedMs` prop
- ADD: Center section showing "Xh Ym focused today" (format the ms into hours + minutes)
- ADD: Right section showing current date
- KEEP: Left section (timer + current app name), glass card pattern, AuroraText

### Step 3: Rewrite TierBreakdownStrip.tsx
- REMOVE: `score`, `trendValue`, `trendPositive` props
- REMOVE: Score and Trend from the `stats` array
- CHANGE: grid from `grid-cols-3 lg:grid-cols-6` to `grid-cols-2 lg:grid-cols-4`
- KEEP: Productive, Neutral, Distracting, Total columns with progress bars

### Step 4: Rewrite SleepBarMini.tsx
- ADD: Empty state when `sleepData.length === 0` — Moon icon (24px) + "No sleep data yet" + "Connect tracker or log manually"
- ADD: Average bedtime and wake-up time display below the bar chart
- KEEP: Indigo color palette, bar chart animation, existing glass pattern

### Step 5: Rewrite PinnedActivities.tsx
- CHANGE: From grid layout (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5`) to horizontal scrollable strip (`flex overflow-x-auto gap-3`)
- CHANGE: Remove card wrapper, make it a compact strip
- KEEP: All functionality (start/stop, edit mode, add modal, BorderBeam on selected)

### Step 6: Reorder DashboardPage.tsx Rows
- Row 1: StatusBand (new props: `totalFocusedMs`)
- Row 2: PinnedActivities (MOVED UP from Row 7)
- Row 3: ScheduleCard
- Row 4: GoalsCard + DeadlinesCard + QuickFocusCard
- Row 5: InsightStrip
- Row 6: TierBreakdownStrip (slimmed, 4 columns)
- Row 7: Productivity Chart + "View Heatmap" button + "View Solar System" button
- Row 8: SleepBarMini (fixed)
- Row 9: Recent Sessions
- REMOVE: FollowThroughCard, MasteryRingMini, Solar system inline preview

### Step 7: Verify
- Run `npx vite build` — must exit 0
- Run `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
- Launch with `npx electron .` — must show visible content, no black screen
