# DeskFlow Dashboard — Premium Redesign Specification

> **Version**: 1.0  
> **Scope**: Complete visual & layout overhaul of `/` (DashboardPage)  
> **Accent**: Pink-500 (`#ec4899`) — single cohesive theme  
> **Animation Budget**: L2 (Responsive) — no particles, no meteors  
> **Framework**: Tailwind CSS v4 + framer-motion v12 + lucide-react

---

## 1. Layout Architecture

### Desktop Grid (≥1280px) — Source of Truth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Conditional] Subscription Renewal Alert Banner                             │
│ h-[52px]  full-width  amber accent  glass                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ STATUS BAND                          h-[72px]  full-width                   │
│ ┌──────────────┬────────────────────────┬─────────────────────────────────┐   │
│ │ MINI TIMER   │  PRODUCTIVITY SCORE    │  STREAK • BEST DAY • SLEEP      │   │
│ │ (compact)    │  (NumberTicker, 3xl)   │  (badge row, 11px)              │   │
│ └──────────────┴────────────────────────┴─────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│ SCHEDULE HERO                        h-[300px]  lg:col-span-full            │
│ — Current block: large, BorderBeam, progress bar, pink glow                 │
│ — Upcoming timeline: horizontal scroll cards                                │
│ — Peak hours badge: bottom-right corner                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ INSIGHT STRIP                        h-[140px]  full-width  horizontal      │
│ [InsightCard 280px] [InsightCard 280px] [InsightCard 280px]                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ TRIPLE COLUMN                        h-[260px]  3-col grid  gap-4           │
│ ┌─────────────────────┬─────────────────────┬─────────────────────┐         │
│ │  GOALS CARD         │  DEADLINES CARD     │  FOCUS CARD         │         │
│ │  (checkbox list)    │  (countdown badges) │  (ring + controls)  │         │
│ └─────────────────────┴─────────────────────┴─────────────────────┘         │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER BREAKDOWN STRIP                 h-[110px]  6-col grid  gap-3           │
│ ┌──────┬──────┬──────┬──────┬──────┬──────┐                                 │
│ │ Prod │ Neut │ Dist │ Total│Score │Trend │                                 │
│ └──────┴──────┴──────┴──────┴──────┴──────┘                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Conditional] FOLLOW THROUGH CARD    h-[180px]  full-width  finance glow    │
├─────────────────────────────────────────────────────────────────────────────┤
│ PINNED ACTIVITIES                    h-[120px]  full-width  horizontal      │
├─────────────────────────────────────────────────────────────────────────────┤
│ DUAL COLUMN                          h-[300px]  2-col grid  gap-4           │
│ ┌─────────────────────────────┬─────────────────────────────┐               │
│ │  PRODUCTIVITY BAR CHART     │  HEALTH STACK               │               │
│ │  (stacked bar, glass)       │  ┌─────────────────────┐    │               │
│ │                             │  │ WEEKLY SLEEP MINI   │    │               │
│ │                             │  └─────────────────────┘    │               │
│ │                             │  ┌─────────────────────┐    │               │
│ │                             │  │ MASTERY RING MINI   │    │               │
│ │                             │  └─────────────────────┘    │               │
│ └─────────────────────────────┴─────────────────────────────┘               │
├─────────────────────────────────────────────────────────────────────────────┤
│ APP ECOSYSTEM                        h-[200px]  full-width  compact orbit   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ACTIVITY FEED                        h-auto  full-width  scrollable         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| `< 640px` | Single column stack. Status Band → vertical. Tier Strip → 3×2 grid. Triple Column → stack. Charts → stack. |
| `640–1023px` | Status Band → 2-row. Schedule full width. Triple Column → 2+1 split. Tier Strip → 3 columns. Charts → stack. |
| `1024–1279px` | Full layout, reduced gaps (`gap-3`), smaller padding. |
| `≥ 1280px` | Full layout as specified. `max-w-[1400px] mx-auto`. Gap `gap-4` (16px). Padding `p-5` (20px). |

---

## 2. Global Design Tokens

### Glass Card Base — Applied to EVERY Card

```tsx
className="relative rounded-xl overflow-hidden
  bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-[rgba(63,63,70,0.50)]
  hover:border-[rgba(82,82,91,0.80)]
  transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]
  hover:-translate-y-0.5
  hover:shadow-[0_8px_32px_rgba(236,72,153,0.08)]"
```

### Top Edge Highlight — Applied to EVERY Card

```tsx
<div className="absolute top-0 left-4 right-4 h-px
  bg-gradient-to-r from-transparent via-[var(--card-accent)] to-transparent
  opacity-60 pointer-events-none" />
```
Where `--card-accent` is per-card:
- Dashboard generic → `#ec4899`
- Finance → `#34d399`
- Learn → `#22d3ee`
- Sleep → `#818cf8`
- Productivity → `#fbbf24`

### Section Header Pattern

```tsx
<div className="flex items-center gap-2.5 mb-4">
  <div className="w-7 h-7 rounded-lg bg-[var(--accent-muted)]
    flex items-center justify-center text-[var(--accent-primary)]">
    <Icon size={14} strokeWidth={2} />
  </div>
  <h3 className="text-[15px] font-semibold text-[#f4f4f5]">{title}</h3>
  {action && <div className="ml-auto">{action}</div>}
</div>
```

### Entrance Animation (Global Stagger)

All cards enter with a cascading delay based on row position:

```tsx
// Row delays:
// Status Band      → 0.00s
// Schedule Hero    → 0.08s
// Insight Strip    → 0.16s
// Triple Column    → 0.24s
// Tier Strip       → 0.32s
// FollowThrough    → 0.36s
// Pinned           → 0.40s
// Charts/Health    → 0.48s
// App Ecosystem    → 0.56s
// Activity Feed    → 0.64s

// Within each card, children stagger by 0.04s
```

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.4,
    ease: [0.16, 1, 0.3, 1],
    delay: rowDelay + childIndex * 0.04
  }}
>
```

---

## 3. Component Specifications

### 3.1 Subscription Renewal Alert (Conditional)

**Location**: Inline in `DashboardPage.tsx`, rendered conditionally at the very top.
**Condition**: `subscriptions.some(s => daysUntil(s.next_billing_date) <= 7)`

```tsx
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  className="relative rounded-xl overflow-hidden mb-4
    bg-[rgba(251,191,36,0.06)] backdrop-blur-xl
    border border-[rgba(251,191,36,0.20)]
    p-3 px-5 flex items-center gap-3">
  <div className="w-8 h-8 rounded-full bg-[rgba(251,191,36,0.12)]
    flex items-center justify-center text-amber-400 shrink-0">
    <Bell size={14} />
  </div>
  <span className="text-[13px] text-amber-200/90">
    <span className="font-semibold text-amber-100">{subscription.name}</span>
    {" "}renews in{" "}
    <span className="font-mono font-medium text-amber-300">{daysLeft} days</span>
    <span className="text-amber-400/50 ml-1.5">({formatCurrency(subscription.cost)})</span>
  </span>
</motion.div>
```

---

### 3.2 Status Band

**File**: `src/pages/dashboard/StatusBand.tsx` (NEW)
**Height**: `h-[72px]` desktop, auto mobile.
**Background**: Glass base + subtle pink radial glow.

```tsx
<div className="relative rounded-xl overflow-hidden mb-4
  bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-[rgba(63,63,70,0.50)]
  p-4 flex flex-col sm:flex-row items-center justify-between gap-3">

  {/* Subtle pink glow */}
  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-20
    bg-pink-500/[0.03] rounded-full blur-3xl pointer-events-none" />

  {/* Top edge highlight */}
  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />

  {/* LEFT: Mini Timer */}
  <div className="flex items-center gap-3">
    <div className={`w-2 h-2 rounded-full shrink-0 ${
      isCurrentlyProductive ? "bg-emerald-400" :
      isDistracting ? "bg-rose-400" :
      "bg-zinc-500"
    } ${isActive ? "animate-pulse" : ""}`} />
    <div className="flex items-baseline gap-2">
      <AuroraText className="text-xl font-mono font-semibold tracking-tight">
        {formatTime(displayTime)}
      </AuroraText>
      {currentApp && (
        <span className="text-[11px] text-zinc-500 hidden sm:inline">
          {currentApp}
        </span>
      )}
    </div>
  </div>

  {/* CENTER: Productivity Score */}
  <div className="flex flex-col items-center">
    <div className="flex items-baseline gap-1.5">
      <NumberTicker
        value={Math.round(productivityScore)}
        className="text-3xl font-mono font-bold text-[#f4f4f5]"
      />
      <span className="text-sm text-zinc-500">/100</span>
    </div>
    <span className="text-[11px] text-zinc-500 mt-0.5">
      {productivityScore >= 80 ? "On fire 🔥" :
       productivityScore >= 60 ? "Good pace" :
       productivityScore >= 40 ? "Keep going" : "Focus up"}
    </span>
  </div>

  {/* RIGHT: Summary Badges */}
  <div className="flex items-center gap-2">
    <StatusBadge icon={<Flame size={11} />} label={`${streak}d streak`} color="pink" />
    <StatusBadge icon={<Trophy size={11} />} label={bestDay} color="amber" />
    <StatusBadge
      icon={<Moon size={11} />}
      label={`${sleepDebt}h debt`}
      color={sleepDebt > 2 ? "rose" : "zinc"}
    />
  </div>
</div>
```

**StatusBadge sub-component**:
```tsx
const StatusBadge = ({ icon, label, color }) => {
  const colorMap = {
    pink:  "bg-pink-500/10 text-pink-400 border-pink-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose:  "bg-rose-500/10 text-rose-400 border-rose-500/20",
    zinc:  "bg-zinc-800/50 text-zinc-400 border-zinc-700/30",
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full
      text-[11px] font-medium border ${colorMap[color]}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
};
```

---

### 3.3 Schedule Hero

**File**: Modify `src/pages/dashboard/ScheduleCard.tsx`
**Layout**: Full-width, tall card. The MAIN HERO of the dashboard.
**Height**: `min-h-[280px]` on desktop.
**Accent**: Pink-500 (`#ec4899`).

#### Current Block (Large, Prominent)

```tsx
<div className="relative rounded-xl p-5 mb-4
  bg-gradient-to-br from-[rgba(236,72,153,0.10)] to-[rgba(236,72,153,0.02)]
  border border-[rgba(236,72,153,0.20)]
  overflow-hidden">

  {/* BorderBeam when active */}
  {isCurrent && (
    <BorderBeam size={80} duration={6} colorFrom="#ec4899" colorTo="#db2777" />
  )}

  <div className="relative z-10 flex items-start justify-between">
    <div className="min-w-0">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold
        text-pink-400 uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
        Happening Now
      </span>
      <h2 className="text-xl font-semibold text-white mt-1.5 truncate">
        {currentBlock.title}
      </h2>
      <div className="flex items-center gap-3 mt-2.5 text-[13px] text-zinc-400">
        <span className="flex items-center gap-1">
          <MapPin size={13} className="text-zinc-500" />
          {currentBlock.location}
        </span>
        <span className="text-zinc-700">|</span>
        <span className="flex items-center gap-1">
          <Clock size={13} className="text-zinc-500" />
          {currentBlock.start_time} – {currentBlock.end_time}
        </span>
        {currentBlock.category && (
          <>
            <span className="text-zinc-700">|</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full
              bg-pink-500/10 text-pink-400 border border-pink-500/20">
              {currentBlock.category}
            </span>
          </>
        )}
      </div>
    </div>

    <div className="text-right shrink-0 ml-4">
      <span className="text-[11px] text-zinc-500 block">Remaining</span>
      <div className="text-lg font-mono text-pink-300 mt-0.5">
        {formatDuration(remainingMinutes)}
      </div>
    </div>
  </div>

  {/* Progress bar */}
  <div className="relative z-10 mt-5">
    <div className="h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progressPercent}%` }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
    <div className="flex justify-between mt-1.5">
      <span className="text-[10px] text-zinc-600">{currentBlock.start_time}</span>
      <span className="text-[10px] text-zinc-600">{currentBlock.end_time}</span>
    </div>
  </div>
</div>
```

#### Upcoming Timeline (Horizontal Scroll)

```tsx
<div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
  {upcomingBlocks.map((block, i) => (
    <motion.div
      key={block.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex-shrink-0 w-[200px] rounded-lg p-3.5
        bg-zinc-900/40 border border-zinc-800/50
        hover:border-zinc-700/50 hover:bg-zinc-900/60
        transition-all duration-200 cursor-pointer group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider">
          {block.day_of_week}
        </span>
        <span className="text-[11px] font-mono text-pink-400/70">
          in {minutesUntil(block.start_time)}m
        </span>
      </div>
      <div className="text-[13px] font-medium text-zinc-300 group-hover:text-white
        transition-colors truncate">
        {block.title}
      </div>
      <div className="text-[11px] text-zinc-600 mt-1 flex items-center gap-1">
        <MapPin size={10} />
        {block.location}
      </div>
    </motion.div>
  ))}
</div>
```

#### Peak Hours Badge (Bottom-Right of Card)

```tsx
<div className="absolute bottom-4 right-4 flex items-center gap-1.5
  px-2.5 py-1 rounded-full bg-zinc-900/60 border border-zinc-800/50">
  <Zap size={11} className="text-amber-400" />
  <span className="text-[11px] text-zinc-400">
    Peak focus: {peakHours.start} – {peakHours.end}
  </span>
</div>
```

#### Empty State

```tsx
<EmptyState
  icon={<Calendar size={24} className="text-zinc-600" />}
  title="No schedule today"
  subtitle="Add blocks in Settings → Schedule"
/>
```

---

### 3.4 Insight Strip

**File**: `src/pages/dashboard/InsightStrip.tsx` (NEW)
**Layout**: Horizontal scrollable row, full width.
**Height**: `h-[140px]`.

```tsx
<div className="mb-4">
  <div className="flex items-center gap-2 mb-3">
    <Sparkles size={14} className="text-pink-400" />
    <span className="text-[13px] font-semibold text-zinc-300">AI Insights</span>
  </div>

  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
    {insights.map((insight, i) => {
      const accent = getDomainAccent(insight.domain);
      return (
        <motion.div
          key={insight.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.16 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex-shrink-0 w-[280px] rounded-xl p-4
            bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
            border border-zinc-800/50
            hover:border-zinc-700/50 hover:-translate-y-0.5
            transition-all duration-250 overflow-hidden">

          {/* Top edge highlight */}
          <div className="absolute top-0 left-4 right-4 h-px
            bg-gradient-to-r from-transparent via-[${accent}] to-transparent opacity-50" />

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
              style={{
                backgroundColor: `${accent}18`,
                color: accent
              }}>
              {getInsightIcon(insight.domain)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[13px] font-semibold text-zinc-200 truncate">
                {insight.copy.headline}
              </h4>
              <p className="text-[12px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                {insight.copy.subtext}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
              {insight.domain}
            </span>
            {insight.value !== undefined && (
              <span className="text-[13px] font-mono font-semibold"
                style={{ color: accent }}>
                {insight.value}{insight.unit || ""}
              </span>
            )}
          </div>
        </motion.div>
      );
    })}
  </div>
</div>
```

**Domain Accent Mapping**:
| Domain | Accent Color | Hex |
|--------|-------------|-----|
| focus | pink-400 | `#f472b6` |
| finance | emerald-400 | `#34d399` |
| learn | cyan-400 | `#22d3ee` |
| sleep | indigo-400 | `#818cf8` |
| productivity | amber-400 | `#fbbf24` |
| external | sky-400 | `#38bdf8` |

---

### 3.5 Goals Card

**File**: `src/components/dashboard/GoalsCard.tsx` (NEW)
**Data**: `get-goals` IPC → filter `!completed` → limit 5.

```tsx
<div className="relative rounded-xl overflow-hidden
  bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-[rgba(63,63,70,0.50)] p-5
  hover:border-[rgba(82,82,91,0.80)] transition-all duration-250">

  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-pink-500/40 to-transparent opacity-60" />

  <SectionHeader title="Today's Goals" icon={<Target size={14} />} />

  <div className="space-y-1.5 mt-2">
    {goals.map((goal, i) => (
      <motion.div
        key={goal.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.24 + i * 0.04 }}
        className="flex items-center gap-3 p-2.5 rounded-lg
          bg-zinc-900/30 border border-zinc-800/30
          hover:bg-zinc-900/50 hover:border-zinc-700/40
          transition-all duration-200 cursor-pointer group"
        onClick={() => toggleGoal(goal.id)}>

        <motion.div
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
            transition-colors duration-200 ${
              goal.completed
                ? "bg-pink-500 border-pink-500"
                : "border-zinc-600 group-hover:border-pink-400/50"
            }`}
          whileTap={{ scale: 0.9 }}>
          {goal.completed && <Check size={12} className="text-white" strokeWidth={3} />}
        </motion.div>

        <span className={`text-[13px] flex-1 truncate transition-colors ${
          goal.completed ? "text-zinc-500 line-through" : "text-zinc-300"
        }`}>
          {goal.title}
        </span>

        {goal.priority === "high" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded
            bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            HIGH
          </span>
        )}
      </motion.div>
    ))}
  </div>

  {goals.length === 0 && (
    <EmptyState
      icon={<Target size={20} className="text-zinc-600" />}
      title="All caught up"
      subtitle="No pending goals for today"
    />
  )}
</div>
```

---

### 3.6 Deadlines Card

**File**: `src/components/dashboard/DeadlinesCard.tsx` (NEW)
**Data**: `get-deadlines` IPC → sort by `due_date` → limit 4.

```tsx
<div className="relative rounded-xl overflow-hidden
  bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-[rgba(63,63,70,0.50)] p-5
  hover:border-[rgba(82,82,91,0.80)] transition-all duration-250">

  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-rose-500/40 to-transparent opacity-60" />

  <SectionHeader title="Deadlines" icon={<AlertCircle size={14} />} />

  <div className="space-y-2 mt-2">
    {deadlines.map((deadline, i) => {
      const daysLeft = getDaysUntil(deadline.due_date);
      const urgency = daysLeft <= 2 ? "urgent" : daysLeft <= 5 ? "soon" : "normal";
      const urgencyStyles = {
        urgent: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        soon:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
        normal: "bg-zinc-800/50 text-zinc-500 border-zinc-700/30",
      };

      return (
        <motion.div
          key={deadline.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.24 + i * 0.04 }}
          className="flex items-center justify-between p-2.5 rounded-lg
            bg-zinc-900/30 border border-zinc-800/30">
          <div className="min-w-0">
            <div className="text-[13px] text-zinc-300 truncate">{deadline.title}</div>
            {deadline.course && (
              <div className="text-[11px] text-zinc-600 mt-0.5">{deadline.course}</div>
            )}
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full
            text-[11px] font-medium border shrink-0 ml-2 ${urgencyStyles[urgency]}`}>
            <Clock size={11} />
            {daysLeft === 0 ? "Today" : daysLeft === 1 ? "1d" : `${daysLeft}d`}
          </div>
        </motion.div>
      );
    })}
  </div>

  {deadlines.length === 0 && (
    <EmptyState
      icon={<CheckCircle2 size={20} className="text-zinc-600" />}
      title="No upcoming deadlines"
      subtitle="You're in the clear"
    />
  )}
</div>
```

---

### 3.7 Focus Card (Compact)

**File**: Modify `src/components/focus/QuickFocusCard.tsx` + `src/components/insights/GoalRing.tsx`
**Note**: Remove ALL green borders/accent. Use pink-500 exclusively.

```tsx
<div className="relative rounded-xl overflow-hidden
  bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-[rgba(63,63,70,0.50)] p-5
  hover:border-[rgba(82,82,91,0.80)] transition-all duration-250">

  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-pink-500/40 to-transparent opacity-60" />

  <SectionHeader title="Deep Focus" icon={<Zap size={14} />} />

  <div className="flex items-center gap-5 mt-3">
    {/* Goal Ring — compact */}
    <div className="relative w-20 h-20 flex-shrink-0">
      <AnimatedCircularProgressBar
        value={focusProgress}
        max={100}
        gaugePrimaryColor="#ec4899"
        gaugeSecondaryColor="rgba(236,72,153,0.12)"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[13px] font-mono font-bold text-pink-400">
          {Math.round(focusProgress)}%
        </span>
      </div>
    </div>

    {/* Controls */}
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-2 mb-3">
        <NumberTicker value={focusMinutes} className="text-xl font-mono text-white" />
        <span className="text-[11px] text-zinc-500">min today</span>
      </div>

      <div className="flex gap-2">
        {["25 min", "50 min", "Custom"].map((preset) => (
          <button
            key={preset}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium
              bg-pink-500/10 text-pink-400 border border-pink-500/20
              hover:bg-pink-500/20 transition-colors duration-200">
            {preset}
          </button>
        ))}
      </div>
    </div>
  </div>
</div>
```

**CRITICAL**: The previous green border on the focus card is REMOVED. Only pink-500 accent is used.

---

### 3.8 Tier Breakdown Strip

**File**: `src/pages/dashboard/TierBreakdownStrip.tsx` (NEW)
**Layout**: 6-column grid desktop, 3×2 grid mobile.
**Height**: `h-[110px]`.

```tsx
<div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
  {[
    { label: "Productive", value: productiveHours, color: "#34d399",
      icon: <CheckCircle2 size={14} />, showBar: true },
    { label: "Neutral", value: neutralHours, color: "#fbbf24",
      icon: <MinusCircle size={14} />, showBar: true },
    { label: "Distracting", value: distractingHours, color: "#f87171",
      icon: <XCircle size={14} />, showBar: true },
    { label: "Total", value: totalHours, color: "#a1a1aa",
      icon: <Clock size={14} />, showBar: false },
    { label: "Score", value: Math.round(score), color: "#ec4899",
      icon: <TrendingUp size={14} />, isTicker: true },
    { label: "Trend", value: trendValue, color: trendPositive ? "#34d399" : "#f87171",
      icon: <Activity size={14} />, isTrend: true },
  ].map((stat, i) => (
    <motion.div
      key={stat.label}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-xl p-3
        bg-[rgba(24,24,27,0.60)] backdrop-blur-xl
        border border-zinc-800/40
        hover:border-[rgba(255,255,255,0.08)]
        hover:-translate-y-0.5 transition-all duration-250">

      {/* Top edge highlight */}
      <div className="absolute top-0 left-3 right-3 h-px
        bg-gradient-to-r from-transparent to-transparent opacity-40"
        style={{
          backgroundImage: `linear-gradient(to right, transparent, ${stat.color}, transparent)`
        }} />

      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: stat.color }}>{stat.icon}</span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
          {stat.label}
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        {stat.isTicker ? (
          <NumberTicker value={stat.value} className="text-xl font-mono font-bold text-white" />
        ) : stat.isTrend ? (
          <span className="text-xl font-mono font-bold" style={{ color: stat.color }}>
            {stat.value}
          </span>
        ) : (
          <span className="text-xl font-mono font-bold text-white">
            {stat.value}
          </span>
        )}
        {!stat.isTicker && !stat.isTrend && (
          <span className="text-[11px] text-zinc-600">h</span>
        )}
      </div>

      {/* Mini progress bar */}
      {stat.showBar && (
        <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: stat.color }}
            initial={{ width: 0 }}
            animate={{ width: `${(stat.value / Math.max(totalHours, 1)) * 100}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          />
        </div>
      )}
    </motion.div>
  ))}
</div>
```

---

### 3.9 Pinned Activities

**File**: Modify `src/pages/dashboard/PinnedActivities.tsx`

```tsx
<div className="relative rounded-xl overflow-hidden
  bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-[rgba(63,63,70,0.50)] p-5 mb-4
  hover:border-[rgba(82,82,91,0.80)] transition-all duration-250">

  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-pink-500/40 to-transparent opacity-60" />

  <SectionHeader title="Pinned" icon={<Pin size={14} />} />

  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
    {activities.map((activity) => (
      <motion.button
        key={activity.id}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-[13px] font-medium
          border transition-all duration-200 ${
            selected === activity.id
              ? "bg-pink-500/10 text-pink-400 border-pink-500/30 shadow-[0_0_16px_rgba(236,72,153,0.10)]"
              : "bg-zinc-900/40 text-zinc-400 border-zinc-800/50 hover:border-zinc-700/50 hover:text-zinc-300"
          }`}>
        {activity.name}
      </motion.button>
    ))}

    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
        bg-zinc-900/40 border border-zinc-800/50 text-zinc-500
        hover:border-zinc-700/50 hover:text-zinc-300 transition-all">
      <Plus size={16} />
    </motion.button>
  </div>
</div>
```

---

### 3.10 Productivity Bar Chart

**File**: Inline in `DashboardPage.tsx` (restyled wrapper)

```tsx
<motion.div
  className="relative rounded-xl overflow-hidden
    bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
    border border-[rgba(63,63,70,0.50)] p-5
    hover:border-[rgba(82,82,91,0.80)] transition-all duration-250"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.48, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

  {/* Emerald glow */}
  <div className="absolute -top-20 -right-20 w-40 h-40
    bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />

  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-60" />

  <SectionHeader title="Productivity" icon={<BarChart3 size={14} />} />

  <div className="h-52 mt-2">
    <Bar data={chartData} options={{
      ...chartOptions,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(24,24,27,0.95)",
          titleColor: "#f4f4f5",
          bodyColor: "#a1a1aa",
          borderColor: "rgba(63,63,70,0.50)",
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#52525b", font: { size: 11, family: "Geist" } }
        },
        y: {
          grid: { color: "rgba(63,63,70,0.20)" },
          ticks: { color: "#52525b", font: { size: 11, family: "Geist" } }
        }
      }
    }} />
  </div>
</motion.div>
```

**Chart dataset colors**:
- Productive: `#34d399` (emerald-400)
- Other: `#fbbf24` (amber-400)
- External: `#818cf8` (indigo-400)

---

### 3.11 Health Stack (Sleep + Mastery)

#### Sleep Bar Mini

**File**: `src/components/dashboard/SleepBarMini.tsx` (NEW)

```tsx
<div className="relative rounded-xl overflow-hidden
  bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-[rgba(63,63,70,0.50)] p-5
  hover:border-[rgba(82,82,91,0.80)] transition-all duration-250">

  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-60" />

  <SectionHeader title="Sleep" icon={<Moon size={14} />} />

  <div className="flex items-end gap-1.5 h-20 mt-3">
    {sleepData.map((day, i) => (
      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${(day.hours / 10) * 100}%` }}
          transition={{
            delay: 0.48 + i * 0.05,
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1]
          }}
          className={`w-full rounded-t-sm min-h-[4px] ${
            day.hours >= 7 ? "bg-indigo-400/70" : "bg-indigo-400/30"
          }`}
        />
        <span className="text-[10px] text-zinc-600 font-medium">{day.label}</span>
      </div>
    ))}
  </div>

  <div className="mt-3 flex items-center justify-between text-[11px]">
    <span className="text-zinc-500">
      Avg: <span className="text-zinc-300 font-mono">{avgSleep}h</span>
    </span>
    {sleepDebt > 0 && (
      <span className="text-rose-400 font-medium">-{sleepDebt}h debt</span>
    )}
  </div>
</div>
```

#### Mastery Ring Mini

**File**: `src/components/dashboard/MasteryRingMini.tsx` (NEW)

```tsx
<div className="relative rounded-xl overflow-hidden
  bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-[rgba(63,63,70,0.50)] p-5
  hover:border-[rgba(82,82,91,0.80)] transition-all duration-250">

  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-60" />

  <SectionHeader title="Mastery" icon={<Brain size={14} />} />

  <div className="flex items-center gap-4 mt-2">
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="#27272a" strokeWidth="4" />
        <motion.circle
          cx="32" cy="32" r="28" fill="none"
          stroke="url(#masteryGradient)" strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 28}
          initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
          animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - mastered / Math.max(total, 1)) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
        />
        <defs>
          <linearGradient id="masteryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[13px] font-mono font-bold text-cyan-400">
          {Math.round((mastered / Math.max(total, 1)) * 100)}%
        </span>
      </div>
    </div>

    <div>
      <div className="text-[13px] text-zinc-300">
        <span className="font-mono font-bold text-cyan-400">{mastered}</span>
        <span className="text-zinc-600"> / {total}</span> nodes
      </div>
      <div className="text-[11px] text-zinc-500 mt-0.5">Proficiency level ≥ 4</div>
    </div>
  </div>
</div>
```

---

### 3.12 App Ecosystem (Compact)

**File**: Inline in `DashboardPage.tsx` (restyled wrapper)

```tsx
<motion.div
  className="relative rounded-xl overflow-hidden
    bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
    border border-[rgba(63,63,70,0.50)] p-5 mb-4
    hover:border-[rgba(82,82,91,0.80)] transition-all duration-250"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.56, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-sky-500/40 to-transparent opacity-60" />

  <SectionHeader title="App Ecosystem" icon={<Orbit size={14} />} />

  <div className="relative h-44 flex items-center justify-center">
    {/* Existing orbit visualization — DO NOT MODIFY internals */}
    {/* ... existing orbit code ... */}
  </div>

  <button
    onClick={openSolarSystemModal}
    className="mt-2 w-full py-2 rounded-lg text-[12px] font-medium
      bg-zinc-900/40 text-zinc-400 border border-zinc-800/50
      hover:bg-zinc-800/50 hover:text-zinc-300 hover:border-zinc-700/50
      transition-all duration-200">
    View Solar System
  </button>
</motion.div>
```

---

### 3.13 Activity Feed

**File**: Inline in `DashboardPage.tsx` (restyled)

```tsx
<motion.div
  className="relative rounded-xl overflow-hidden
    bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
    border border-[rgba(63,63,70,0.50)] p-5
    hover:border-[rgba(82,82,91,0.80)] transition-all duration-250"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.64, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-zinc-500/40 to-transparent opacity-60" />

  <SectionHeader title="Recent Sessions" icon={<Clock size={14} />} />

  <div className="space-y-0.5 mt-3">
    {sessions.map((session, i) => (
      <motion.div
        key={session.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 * i, duration: 0.3 }}
        className="flex items-center justify-between p-3 rounded-lg
          bg-zinc-900/20 border border-transparent
          hover:bg-zinc-900/40 hover:border-zinc-800/30
          transition-all duration-200 group cursor-pointer">

        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            session.tier === "productive" ? "bg-emerald-400" :
            session.tier === "distracting" ? "bg-rose-400" :
            "bg-amber-400"
          }`} />
          <div className="min-w-0">
            <div className="text-[13px] text-zinc-300 group-hover:text-white
              transition-colors truncate">
              {session.activityName}
            </div>
            <div className="text-[11px] text-zinc-600 truncate">
              {session.appName} • {formatTime(session.startTime)}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 ml-3">
          <div className="text-[13px] font-mono text-zinc-400">
            {formatDuration(session.durationSeconds)}
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            session.tier === "productive" ? "bg-emerald-500/10 text-emerald-400" :
            session.tier === "distracting" ? "bg-rose-500/10 text-rose-400" :
            "bg-amber-500/10 text-amber-400"
          }`}>
            {session.tier}
          </span>
        </div>
      </motion.div>
    ))}
  </div>

  {sessions.length === 0 && (
    <EmptyState
      icon={<Clock size={20} className="text-zinc-600" />}
      title="No sessions yet"
      subtitle="Start an activity to see it here"
    />
  )}
</motion.div>
```

---

## 4. Data Flow

| Component | Data Source | IPC / Hook | Transform |
|-----------|-------------|------------|-----------|
| **Subscription Banner** | `finance_subscriptions` table | IPC (existing) | Filter `next_billing_date <= now + 7 days` |
| **Status Band — Timer** | Existing props | Parent props | `formatTime(displayTime)` |
| **Status Band — Score** | `getDashboardAggregates` | IPC | `overview.productiveSeconds / overview.totalSeconds * 100` |
| **Status Band — Streak** | `stats_daily` table | Computed | Consecutive days with `productiveSeconds > 1800` |
| **Status Band — Best Day** | `stats_daily` table | Computed | Day of week with highest avg `productiveSeconds` |
| **Status Band — Sleep** | `external_sessions` | IPC | `activity='Sleep'` → `target(8h) - actual` for last 7 days |
| **Schedule Hero** | `getSchedule` | IPC | Filter `day_of_week === today`, sort `start_time` ASC |
| **Schedule Hero — Peak** | `getDashboardAggregates` | IPC | `hourlyHeatmap` → hour with highest productive density |
| **Insight Strip** | `insights:strip` | IPC | Sort by `relevance` DESC, take top 3 |
| **Goals Card** | `get-goals` | IPC | Filter `!completed`, limit 5 |
| **Deadlines Card** | `get-deadlines` | IPC | Sort `due_date` ASC, limit 4 |
| **Focus Card** | `useDeepFocus` + `useHomeSummary` | Hooks | `focusMinutes` from summary, progress from focus state |
| **Tier Strip** | `getDashboardAggregates` | IPC | `overview.{productive,neutral,distracting}Seconds / 3600` |
| **Tier Strip — Trend** | `stats_daily` | Computed | `(todayScore - avgLast7Days) / avgLast7Days * 100` |
| **Pinned Activities** | Existing | Props | — |
| **Productivity Chart** | `getDashboardAggregates` | IPC | Aggregate by day, stack 3 tiers |
| **Sleep Bar** | `external_sessions` | IPC | `WHERE activity='Sleep'` group by day, avg duration/3600 |
| **Mastery Ring** | `learn_progress` table | IPC | `COUNT(*) WHERE level >= 4` / `COUNT(*)` |
| **App Ecosystem** | `getDashboardAggregates` | IPC | `appStats` + `websiteStats` |
| **Activity Feed** | `getDashboardAggregates` | IPC | `recentSessions`, format duration |
| **FollowThrough** | Existing | Props | Conditional render |

---

## 5. Animation Specification

### Global Entrance Stagger

```tsx
const ROW_DELAYS = {
  statusBand:     0.00,
  scheduleHero:   0.08,
  insightStrip:   0.16,
  tripleColumn:   0.24,
  tierStrip:      0.32,
  followThrough:  0.36,
  pinned:         0.40,
  chartsHealth:   0.48,
  appEcosystem:   0.56,
  activityFeed:   0.64,
};
```

### Card Entrance

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.4,
    ease: [0.16, 1, 0.3, 1],
    delay: ROW_DELAYS[rowKey] + childIndex * 0.04
  }}
/>
```

### Hover States

```tsx
whileHover={{ y: -2 }}
transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
```

Plus CSS:
```css
hover:shadow-[0_8px_32px_rgba(236,72,153,0.08)]
hover:border-[rgba(82,82,91,0.80)]
```

### Number Ticker

```tsx
<NumberTicker
  value={value}
  transition={{ duration: 0.5, ease: "easeOut" }}
/>
```

### Progress Bars

```tsx
initial={{ width: 0 }}
animate={{ width: `${percent}%` }}
transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
```

### Schedule Timeline Items

```tsx
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}
transition={{ delay: 0.3 + index * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
```

### Insight Cards

```tsx
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ delay: 0.16 + index * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
```

### Goal Check Animation

```tsx
// Checkbox:
motion.div whileTap={{ scale: 0.9 }}

// Text strikethrough:
// Use CSS transition on color + text-decoration
```

### BorderBeam (Active Elements Only)

```tsx
<BorderBeam
  size={80}
  duration={6}
  colorFrom="#ec4899"
  colorTo="#db2777"
/>
```
Applied to:
- Schedule current block (when active)
- Selected pinned activity

---

## 6. File Changes

### MODIFY

| File | Change |
|------|--------|
| `src/pages/dashboard/DashboardPage.tsx` | **Complete layout rewrite**. Remove `HeroBand` (timer + fun fact) from hero position. Add `StatusBand` at top. Restructure grid per Section 1. Keep modals untouched. Keep `FollowThroughCard` conditional. Remove `SummaryStrip` from layout (data redistributed). |
| `src/pages/dashboard/ScheduleCard.tsx` | Enhance current block: add BorderBeam, progress bar, larger typography, category badge. Add horizontal upcoming timeline. Add Peak Hours badge. Increase visual weight. |
| `src/components/focus/QuickFocusCard.tsx` | **Remove all green accent**. Use pink-500 exclusively. Reduce to compact variant. Remove Particles (L3 not allowed). |
| `src/components/insights/GoalRing.tsx` | Accept `compact` prop for smaller rendering inside Focus Card. Keep existing full-size mode for other pages. |
| `src/pages/dashboard/PinnedActivities.tsx` | Add glass treatment. Pink accent for selected state with shadow glow. Horizontal scroll layout. |
| `src/pages/dashboard/SummaryStrip.tsx` | **Remove from DashboardPage layout only**. Component still exists for other pages. Data moved to StatusBand + TierStrip. |

### CREATE NEW

| File | Purpose |
|------|---------|
| `src/pages/dashboard/StatusBand.tsx` | Mini timer + Productivity Score + Summary badges (streak, best day, sleep debt) |
| `src/pages/dashboard/InsightStrip.tsx` | Horizontal scrollable AI insight cards |
| `src/components/dashboard/GoalsCard.tsx` | Checkbox goal list with completion animation |
| `src/components/dashboard/DeadlinesCard.tsx` | Deadline countdown list with urgency badges |
| `src/pages/dashboard/TierBreakdownStrip.tsx` | 6-column productivity stat grid with mini progress bars |
| `src/components/dashboard/SleepBarMini.tsx` | Weekly sleep bar chart with deficit indicator |
| `src/components/dashboard/MasteryRingMini.tsx` | Compact SVG mastery progress ring with gradient stroke |

### KEEP UNCHANGED (Hard Constraints)

| File | Reason |
|------|--------|
| `src/components/ui/OrbitSystem.tsx` | 3D solar system — DO NOT TOUCH |
| `src/components/ui/BorderBeam.tsx` | Already installed MCP component |
| `src/components/ui/AuroraText.tsx` | Already installed MCP component |
| `src/components/ui/NumberTicker.tsx` | Already installed MCP component |
| `src/components/ui/AnimatedCircularProgressBar.tsx` | Already installed MCP component |
| `src/components/ui/BlurFade.tsx` | Already installed MCP component |
| `src/components/ui/Skeleton.tsx` | Already installed MCP component |
| `src/components/GlassCard.tsx` | Already installed MCP component |
| `src/components/SectionHeader.tsx` | Already installed MCP component |
| `src/components/EmptyState.tsx` | Already installed MCP component |
| Heatmap Modal | Works, leave alone |
| Solar System Modal | Works, leave alone |
| DayDetail Popup | Works, leave alone |

---

## 7. Empty & Loading States

Every data-driven component MUST implement all three states:

### Loading State

```tsx
<div className="relative rounded-xl overflow-hidden
  bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-[rgba(63,63,70,0.50)] p-5">
  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-pink-500/30 to-transparent opacity-40" />
  <SectionHeader title="..." icon={<Icon size={14} />} />
  <div className="space-y-2 mt-3">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-3/4" />
  </div>
</div>
```

### Empty State

Use existing `EmptyState` component:
```tsx
<EmptyState
  icon={<Icon size={24} className="text-zinc-600" />}
  title="No data yet"
  subtitle="Start tracking to see insights here"
/>
```

### Error State

```tsx
<div className="rounded-xl p-5 bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-rose-500/20">
  <div className="flex items-center gap-2 text-rose-400 text-[13px]">
    <AlertTriangle size={14} />
    Failed to load data
  </div>
</div>
```

---

## 8. Color Reference

| Element | Hex | Tailwind |
|---------|-----|----------|
| Dashboard accent | `#ec4899` | `text-pink-500` |
| Dashboard accent hover | `#db2777` | `text-pink-600` |
| Dashboard accent muted | `rgba(236,72,153,0.15)` | `bg-pink-500/15` |
| Success | `#34d399` | `text-emerald-400` |
| Warning | `#fbbf24` | `text-amber-400` |
| Error | `#f87171` | `text-rose-400` |
| Info | `#38bdf8` | `text-sky-400` |
| Text primary | `#f4f4f5` | `text-zinc-100` |
| Text secondary | `#a1a1aa` | `text-zinc-400` |
| Text muted | `#52525b` | `text-zinc-500` |
| Border subtle | `#27272a` | `border-zinc-800` |
| Border default | `#3f3f46` | `border-zinc-700` |
| Glass bg | `rgba(24,24,27,0.80)` | `bg-zinc-900/80` |
| Glass bg heavy | `rgba(24,24,27,0.92)` | `bg-zinc-900/92` |

---

## 9. Typography Scale

| Level | Size | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| Hero number | `text-3xl`–`text-5xl` | 700 | White / Gradient | Productivity score, timer |
| KPI value | `text-xl` | 700 | White | Tier stats, focus minutes |
| Section title | `text-[15px]` | 600 | `#f4f4f5` | Card headers |
| Body | `text-[13px]` | 400 | `#a1a1aa` | Descriptions, labels |
| Meta | `text-[11px]` | 500 | `#52525b` | Badges, timestamps |
| Badge | `text-[10px]` | 600 | Varies | Priority, urgency |

---

*End of Specification*