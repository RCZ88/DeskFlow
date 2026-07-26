# Dashboard Revamp — Context Bundle

## Project Overview
DeskFlow is an Electron + React + Tailwind v4 desktop productivity tracker. The Dashboard page (`/`) is the first thing users see. It currently shows a timer, summary cards, focus tools, pinned activities, a productivity chart, and an app ecosystem visualization. The user wants a COMPLETE visual redesign.

## Design System

### Colors (CSS Variables)
```
--bg-primary:     #09090b
--bg-secondary:   #18181b
--bg-tertiary:    #27272a
--bg-elevated:    #2d2d31
--bg-glass:       rgba(24, 24, 27, 0.80)
--bg-glass-heavy: rgba(24, 24, 27, 0.92)

--text-primary:   #f4f4f5
--text-secondary: #a1a1aa
--text-muted:     #52525b
--text-disabled:  #3f3f46

--accent-primary:   #ec4899 (pink-500, dashboard accent)
--accent-hover:     #db2777
--accent-muted:     rgba(236, 72, 153, 0.15)
--accent-secondary: #22d3ee

--success:         #34d399
--warning:         #fbbf24
--error:           #f87171
--info:            #38bdf8

--border-subtle:   #27272a
--border-default:  #3f3f46
--border-active:   #52525b
--border-glass:    rgba(63, 63, 70, 0.50)

--page-accent: var(--accent-primary) for dashboard
```

### Typography
- Body: Geist/Inter 13px/400
- Code/Numbers: JetBrains Mono
- Headings: weight 600, not different font
- Scale: 11px badge, 12px meta, 13px body, 15px section title, 18px page title, 24-32px hero

### Spacing
- 8px grid. xs=4, sm=8, md=12, lg=16, xl=24, 2xl=32

### Animation Tokens
- fast: 150ms, normal: 250ms, slow: 400ms
- ease-out: cubic-bezier(0.16, 1, 0.3, 1)

### Glass Pattern
```css
.bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-5
```

### Border Radius: max rounded-xl (12px)

## Available MCP/UI Components (already installed)
- `BorderBeam` (src/components/ui/border-beam.tsx) — framer-motion animated border shimmer
- `AuroraText` (src/components/ui/aurora-text.tsx) — animated gradient text
- `AnimatedGradientText` (src/components/ui/animated-gradient-text.tsx) — shifting gradient
- `AnimatedShinyText` (src/components/ui/animated-shiny-text.tsx) — shimmer sweep
- `NumberTicker` (src/components/ui/number-ticker.tsx) — spring-animated counter
- `BlurFade` (src/components/ui/blur-fade.tsx) — blur entrance animation
- `DotPattern` (src/components/ui/dot-pattern.tsx) — SVG dot grid background
- `Particles` (src/components/ui/particles.tsx) — canvas particles (L3 only)
- `Skeleton` (src/components/ui/skeleton.tsx) — loading placeholder
- `GlassCard` (src/components/GlassCard.tsx) — glass card with accent rail variants
- `SectionHeader` (src/components/SectionHeader.tsx) — icon + title + action
- `EmptyState` (src/components/EmptyState.tsx) — centered empty state
- `LoadingState` (src/components/LoadingState.tsx) — loading spinner
- `ShinyButton` (src/components/ui/shiny-button.tsx) — button with shine effect
- `AnimatedCircularProgressBar` (src/components/ui/animated-circular-progress-bar.tsx) — circular gauge
- `Marquee` (src/components/ui/marquee.tsx) — scrolling text

## Current Dashboard Layout (source of truth)

```tsx
<PageShell page="dashboard" variant="dashboard" className="text-white bg-[#0a0a0a]">
  <DotPattern className="fixed inset-0 text-white pointer-events-none" opacity={0.04} gap={20} />

  <div className="relative z-10">
    <div className="mx-auto" style={{ maxWidth: '1600px' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between"><div /></div>
      </motion.div>
    </div>

    {/* HERO: FunFactHero + StopwatchTimer (full width) */}
    <div className="mb-4">
      <HeroBand ... />
    </div>

    <div className="mx-auto" style={{ maxWidth: '1600px' }}>
      {/* 4 summary cards */}
      <div className="mb-6"><SummaryStrip ... /></div>

      {/* Schedule + Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="lg:col-span-2"><ScheduleCard /></div>
        <div className="lg:col-span-1 flex flex-col gap-5">
          <QuickFocusCard ... />
          <GoalRing ... />
        </div>
      </div>

      {/* Pinned Activities */}
      <div className="mb-6"><PinnedActivities ... /></div>

      {/* Follow Through (conditional) */}
      {ftData && ftData.totalExpense > 0 && (
        <div className="mb-6"><FollowThroughCard ... /></div>
      )}

      {/* Two-Column: Productivity Chart + App Ecosystem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <motion.div className="rounded-xl p-5 border bg-zinc-900/60 border-zinc-800/50">
          <SectionHeader title="Productivity" icon={<BarChart3 />} />
          {/* Bar chart: Productive (emerald) + Other (amber) + External (indigo) */}
          <Bar data={...} options={...} />
        </motion.div>

        <motion.div className="rounded-xl p-5 border bg-zinc-900/60 border-zinc-800/50">
          {/* App Ecosystem: orbit visualization with planet circles */}
          <div className="relative h-64 flex items-center justify-center">
            {/* Sun center + orbit rings + planet circles */}
          </div>
          <button>View Solar System</button>
        </motion.div>
      </div>

      {/* Modals: Heatmap, Solar System (OrbitSystem 3D — DO NOT TOUCH), DayDetail */}

      {/* Activity Feed */}
      <GlassCard>
        <SectionHeader title="Recent Sessions" icon={<Clock />} />
        {/* Session list with stagger entrance */}
      </GlassCard>
    </div>
  </div>
</PageShell>
```

## Component Details

### StopwatchTimer (src/pages/dashboard/StopwatchTimer.tsx)
- Props: displayTime, isPaused, isCurrentlyProductive, isDistracting, externalSessionRunning, selectedExternalActivity, hasRealApp, currentApp, currentWebsite, isInBrowser, lastTier, borderColor
- Shows: breathing status dot, AuroraText giant timer digits, category badge, browser profile badge, activity name, helpful messages
- BorderBeam when active, radial gradient backdrop

### FunFactHero (src/components/insights/FunFactHero.tsx)
- Daily insight banner with domain-specific gradients
- AnimatedGradientText on headline

### SummaryStrip (src/pages/dashboard/SummaryStrip.tsx)
- 4 SummaryCards: Activity, Finance, Learn, External
- Staggered entrance animation

### SummaryCard (src/components/insights/SummaryCard.tsx)
- Props: title, value, subtitle, icon, accentHex, onClick
- Gradient glow background, top edge highlight, hover lift

### ScheduleCard (src/pages/dashboard/ScheduleCard.tsx)
- Fetches via window.deskflowAPI.getSchedule()
- Filters by today's day_of_week
- Shows current block (pink accent, BorderBeam) + upcoming blocks
- Empty state handled

### QuickFocusCard (src/components/focus/QuickFocusCard.tsx)
- GlassCard with pink accent, Particles when active
- AnimatedCircularProgressBar + NumberTicker
- Timer/Stopwatch mode toggle, preset buttons

### GoalRing (src/components/insights/GoalRing.tsx)
- GlassCard, SVG circle with gradient stroke
- FocusEmber particle effect, milestone flare
- Stats row: Done, Remaining, Goal

### PinnedActivities (src/pages/dashboard/PinnedActivities.tsx)
- Grid of activity buttons, selected state with BorderBeam
- Add activity modal

### FollowThroughCard (src/components/finance/FollowThroughCard.tsx)
- Finance card: KPI grid, mini trend bars, per-person breakdown
- Gradient glow background

### Productivity Chart (inline in DashboardPage.tsx)
- react-chartjs-2 Bar chart, stacked
- 3 datasets: Productive (emerald), Other (amber), External (indigo)
- Glass card wrapper with gradient glow

### App Ecosystem (inline in DashboardPage.tsx)
- CSS orbit visualization: Sun center + planet circles
- Apps/Websites toggle, period label
- "View Solar System" button opens OrbitSystem 3D modal

### Activity Feed (inline in DashboardPage.tsx)
- GlassCard with SectionHeader
- Staggered session rows, hover lift, tier badges

## Data Sources

### useHomeSummary hook
Returns: { focusMinutes, walletCount, totalBalance, dueReviews, sleepSeconds, financeLocked, trends: { focus[], balance[], reviews[], sleep[] } }

### useDeepFocus hook
Returns: { state: { active, endsAt, remainingSec, strictness, paused }, history[], start(), end() }

### getDashboardAggregates IPC
Returns: { weeklyHeatmap, hourlyHeatmap, websiteStats, appStats, overview: { totalSeconds, productiveSeconds, neutralSeconds, distractingSeconds }, recentSessions }

### getSchedule IPC
Returns: { success, entries: [{ id, title, location, day_of_week, start_time, end_time, category, color }] }

### getHomeSummary IPC
Returns: { success, data: { focusMinutes, walletCount, totalBalance, dueReviews, sleepSeconds, financeLocked, trends } }

### detectUsageGaps IPC
Returns: Array<{ start, end, durationSeconds }>

### insights:daily-fun-fact IPC
Returns: InsightAtom | null (has copy.headline, copy.subtext, visual, etc.)

### insights:strip IPC
Returns: InsightAtom[] (3-4 scored insights for the period). Each has: id, kind, scope, domain, value, unit, copy: { headline, subtext }, visual, surprise, relevance

### get-goals IPC
Returns: Array<{ id, title, completed, due_date?, priority? }>

### get-deadlines IPC
Returns: Array<{ id, title, due_date, status, course?, priority? }>

### Productivity Score (computed client-side)
From `src/pages/ProductivityPage.tsx`: weighted score = (productive_seconds / total_seconds) * 100, with comparison to 7-day average. Uses `getDashboardAggregates` data.

### Tier Breakdown (computed client-side)
From `src/pages/ProductivityPage.tsx`: productive/neutral/distracting hours from `getDashboardAggregates().overview`

### Sleep Data
From `getDashboardAggregates` or `external_sessions` table: sleep hours per night for the last 7 days

### Mastery Data
From `learn_progress` table: count of nodes where level >= 4 (proficient) vs total nodes

### Subscription Renewals
From `finance_subscriptions` table: upcoming renewals within 7 days with name, cost, next_billing_date

## Data Sources for New Dashboard Components

| Component | IPC/Data Source | Handler Location |
|-----------|----------------|------------------|
| Productivity Score | `getDashboardAggregates` → `overview.productiveSeconds / overview.totalSeconds * 100` | main.ts:5764 |
| Tier Breakdown | `getDashboardAggregates` → `overview.{productive,neutral,distracting}Seconds` | main.ts:5764 |
| Insight Strip | `insights:strip` IPC | main.ts (insights engine) |
| Streak/Best Day | Computed from `stats_daily` table | main.ts |
| Today's Goals | `get-goals` IPC | main.ts |
| Deadlines | `get-deadlines` IPC | main.ts |
| Weekly Sleep | `external_sessions` WHERE activity='Sleep' | main.ts |
| Mastery Ring | `learn_progress` table | main.ts |
| Subscriptions | `finance_subscriptions` table | main.ts |

## Hard Constraints
- Tailwind CSS v4 (NOT v3) — use @theme / @theme inline syntax
- framer-motion v12 for animations
- lucide-react for icons
- DO NOT touch OrbitSystem (3D solar system) — it works, leave it alone
- DO NOT touch the modals (Heatmap modal, Solar System modal, DayDetail popup) — they work
- DO NOT remove any existing features or functionality
- All fonts: Geist body, JetBrains Mono code/numbers
- Dark mode only
- Must handle empty states for all data-driven components
- Must handle loading states
- Single cohesive accent: pink-500 for dashboard
