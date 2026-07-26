# DeskFlow Dashboard — Ultra-Detailed Implementation Specification

> **Version:** 1.0 | **Author:** opencode | **Date:** 2026-07-26
> **Purpose:** Zero-ambiguity implementation guide for lower-tier models. Every className, color, and spacing value is specified.
> **Companion:** Read `DESIGN_SPEC.md` first for philosophy. This document is the literal execution manual.

---

## 0. MANDATORY RULES (No Exceptions)

These rules override any preference or style the implementer might think is "better":

1. **No `rounded-2xl` or `rounded-3xl` anywhere.** Maximum allowed radius is `rounded-xl` (12px). Cards use `rounded-[10px]`.
2. **No generic pink blob on every card.** Each card has a specific thermal gradient. See Section 3.
3. **No `box-shadow` for elevation.** Use borders and inner shadows only.
4. **No `font-thin` (100-300) on dark backgrounds.** Minimum weight is 400.
5. **No `transition: all`.** Always specify exact properties (e.g., `transition-colors duration-150`).
6. **No new font families.** Use only: Inter, DM Serif Display, JetBrains Mono.
7. **No emoji as UI icons.** Use `lucide-react` only.
8. **No custom inline SVG if a lucide icon exists.** Use lucide imports.
9. **No `text-zinc-300` as default body color.** Use `text-zinc-400` for body, `text-zinc-200` for emphasis, `text-zinc-100` for primary.
10. **No component gets more than 1 ambient motion effect.** Read MCP component rules in Section 5.
11. **All data numbers use `font-mono tabular-nums`.** No exceptions.
12. **Preserve existing functionality.** Do not remove props, handlers, modals, or data fetching logic.

---

## 1. GLOBAL FOUNDATION CHANGES

### 1.1 `index.html` — Add JetBrains Mono

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\index.html`

**Change:** Replace the existing `<link>` tag at line 8 with this exact tag:

```html
<!-- BEFORE -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">

<!-- AFTER -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Why:** JetBrains Mono is required for all data numbers. It is currently declared in CSS but never loaded.

### 1.2 `src/index.css` — Add Font Utilities

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\index.css`

**Change:** Add this exact block at the TOP of the `@layer utilities` section:

```css
@layer utilities {
  /* Font utilities - ADD THESE */
  .font-display {
    font-family: 'DM Serif Display', Georgia, serif;
    font-weight: 400;
  }
  
  .font-data {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-variant-numeric: tabular-nums;
  }
  
  /* Inner highlight utility for card depth */
  .card-inner-highlight {
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.03);
  }
  
  /* Thermal gradient background utility */
  .thermal-glow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    opacity: 0.04;
  }
  
  /* Top edge line utility */
  .top-edge-line {
    position: absolute;
    top: 0;
    left: 1rem;
    right: 1rem;
    height: 1px;
    pointer-events: none;
    background: linear-gradient(to right, transparent, var(--edge-color, rgba(255,255,255,0.1)), transparent);
  }
  
  /* Existing utilities below... */
```

**Do NOT:** Remove any existing utilities. Only add the new ones.

### 1.3 Card Base Style Constants

Every card in the dashboard must use these EXACT base classes:

```tsx
className="relative overflow-hidden rounded-[10px]
  bg-[#131316]
  border border-[#27272a]
  card-inner-highlight
  transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
  hover:border-[#3f3f46]"
```

**Exceptions:**
- Hero cards (ScheduleHero, AppEcosystem): use `rounded-xl` instead of `rounded-[10px]`
- Compact stat cells (TierBreakdown): use `rounded-lg` instead of `rounded-[10px]`
- Insight cards: use `rounded-lg` instead of `rounded-[10px]`

**Inner highlight:** Every card gets `card-inner-highlight` class.

**Thermal glow:** Cards with gradient accents add the `thermal-glow` div.

**Top edge line:** Cards with accent colors add the `top-edge-line` div.

---

## 2. TYPOGRAPHY MAPPING (Memorize This)

Replace ALL text styling in dashboard components with these exact rules.

| Element | Size | Weight | Font | Color | Tracking |
|---------|------|--------|------|-------|----------|
| Page title | 18px | 600 | Inter | `text-zinc-100` | `tracking-tight` |
| Card title | 15px | 600 | Inter | `text-zinc-200` | `tracking-tight` |
| Section label | 11px | 600 | Inter | `text-zinc-500` | `uppercase tracking-wider` |
| Body text | 13px | 400 | Inter | `text-zinc-400` | normal |
| Emphasized body | 14px | 500 | Inter | `text-zinc-300` | normal |
| Data value (small) | 12px | 400 | `font-data` | `text-zinc-400` | `tabular-nums` |
| Data value (medium) | 14px | 500 | `font-data` | `text-zinc-300` | `tabular-nums` |
| Data value (large) | 18px | 700 | `font-data` | `text-zinc-100` | `tabular-nums tracking-tighter` |
| Hero display | 24px | 700 | `font-display` | `text-zinc-100` | `tracking-tighter` |
| Badge text | 11px | 600 | Inter | see Section 3 | `uppercase tracking-wider` |
| Meta text | 12px | 400 | Inter | `text-zinc-500` | normal |
| Faint text | 11px | 500 | Inter | `text-zinc-600` | normal |

**Hero numbers (timer, productivity score, big percentages):** Use `font-display text-2xl font-bold tracking-tighter`.
**All KPIs:** Use `font-data text-lg font-bold tracking-tighter`.
**Badges:** Always uppercase, 11px, semibold, tracking-wider.

---

## 3. THERMAL COLOR PALETTE (No Interpretation)

Use these exact hex values. Do not substitute Tailwind defaults (e.g., `pink-500` can be `#ec4899`, but use the hex below for consistency).

| Token | Hex | Tailwind equiv | Use |
|-------|-----|----------------|-----|
| `df-base` | `#0a0a0c` | `zinc-950` near | Page background |
| `df-surface` | `#131316` | custom | Card background |
| `df-elevated` | `#1a1a1e` | custom | Hover, dropdowns |
| `df-border` | `#27272a` | `zinc-800` | Card borders |
| `df-border-active` | `#3f3f46` | `zinc-700` | Hover borders |
| `df-text-primary` | `#fafafa` | `zinc-100` | Primary text |
| `df-text-secondary` | `#a1a1aa` | `zinc-400` | Secondary text |
| `df-text-muted` | `#71717a` | `zinc-500` | Muted text |
| `df-text-faint` | `#52525b` | `zinc-600` | Faint text |
| `df-pink` | `#f472b6` | `pink-400` | Brand, score, productivity |
| `df-cyan` | `#22d3ee` | `cyan-400` | Insights, learning, data |
| `df-amber` | `#fbbf24` | `amber-400` | Time, energy, streaks |
| `df-emerald` | `#34d399` | `emerald-400` | Goals, success, productive |
| `df-rose` | `#fb7185` | `rose-400` | Deadlines, urgent, distracting |
| `df-violet` | `#a78bfa` | `violet-400` | Focus, deep work |
| `df-indigo` | `#818cf8` | `indigo-400` | Sleep, night, rest |

### 3.1 Per-Component Accent Colors

| Component | Primary Accent | Gradient Background | Edge Line Color | Icon Box Color |
|-----------|----------------|---------------------|-----------------|----------------|
| StatusBand | Pink `#f472b6` | Pink radial 4% | Pink `#f472b6` | Pink `#f472b6` |
| ScheduleCard | Amber `#fbbf24` | Amber radial 4% | Amber `#fbbf24` | Amber `#fbbf24` |
| InsightStrip | Cyan `#22d3ee` | Cyan radial 3% | Cyan `#22d3ee` | Per insight domain |
| GoalsCard | Emerald `#34d399` | Emerald radial 4% | Emerald `#34d399` | Emerald `#34d399` |
| DeadlinesCard | Rose `#fb7185` | Rose radial 5% | Rose `#fb7185` | Rose `#fb7185` |
| FocusCard | Violet `#a78bfa` | Violet radial 4% | Violet `#a78bfa` | Violet `#a78bfa` |
| TierBreakdown | White/Mono | NONE | Per stat | Per stat |
| SleepBarMini | Indigo `#818cf8` | Indigo radial 4% | Indigo `#818cf8` | Indigo `#818cf8` |
| MasteryRingMini | Cyan `#22d3ee` | Cyan radial 4% | Cyan `#22d3ee` | Cyan `#22d3ee` |
| Productivity Chart | Emerald `#34d399` | Emerald radial 4% | Emerald `#34d399` | Emerald `#34d399` |
| AppEcosystem | Mixed | NONE | Sky `#38bdf8` | Sky `#38bdf8` |
| ActivityFeed | White | NONE | Zinc `#52525b` | Zinc `#52525b` |
| FollowThroughCard | Amber `#fbbf24` | Amber radial 4% | Amber `#fbbf24` | Amber `#fbbf24` |

### 3.2 Badge Color Rules

```tsx
// Productive / Success
"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"

// Warning / Energy / Streak
"bg-amber-500/10 text-amber-400 border border-amber-500/20"

// Urgent / Deadline
"bg-rose-500/10 text-rose-400 border border-rose-500/20"

// Info / Cyan
"bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"

// Neutral / Muted
"bg-zinc-800/50 text-zinc-400 border border-zinc-700/30"
```

---

## 4. FILE-BY-FILE IMPLEMENTATION

### 4.1 `src/pages/dashboard/StatusBand.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\dashboard\StatusBand.tsx`

**What to do:** Replace the entire file contents with the code below.

**Key changes:**
- Remove generic pink blob glow
- Use `font-display` for timer digits
- Use `font-data` for score
- Use `card-inner-highlight` for depth
- Add `rounded-[10px]`
- Use proper color temperature
- Add thermal glow with pink radial

```tsx
import { motion } from 'framer-motion';
import { AuroraText } from '../../components/ui/aurora-text';
import { NumberTicker } from '../../components/ui/number-ticker';
import { BorderBeam } from '../../components/ui/border-beam';
import { Flame, Trophy, Moon } from 'lucide-react';

function formatTime(ms: number): string {
  if (!ms || !isFinite(ms)) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface StatusBadgeProps {
  icon: React.ReactNode;
  label: string;
  color: 'pink' | 'amber' | 'rose' | 'zinc';
}

function StatusBadge({ icon, label, color }: StatusBadgeProps) {
  const colorMap = {
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    zinc: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/30',
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${colorMap[color]}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

interface StatusBandProps {
  displayTimeMs: number;
  isCurrentlyProductive: boolean;
  isDistracting: boolean;
  currentAppName: string;
  productivityScore: number;
  streak: number;
  bestDay: string;
  sleepDebt: number;
}

export function StatusBand({
  displayTimeMs,
  isCurrentlyProductive,
  isDistracting,
  currentAppName,
  productivityScore,
  streak,
  bestDay,
  sleepDebt,
}: StatusBandProps) {
  const isActive = isCurrentlyProductive || isDistracting;
  const scoreHigh = productivityScore >= 70;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[10px] mb-4
        bg-[#131316] border border-[#27272a] card-inner-highlight
        transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:border-[#3f3f46]"
    >
      {/* Pink thermal glow */}
      <div
        className="thermal-glow"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #f472b6, transparent 70%)' }}
      />

      {/* Top edge line */}
      <div className="top-edge-line" style={{ '--edge-color': 'rgba(244, 114, 182, 0.35)' } as React.CSSProperties} />

      {/* Border beam when productive */}
      {isCurrentlyProductive && (
        <BorderBeam
          size={120}
          duration={4}
          colorFrom="#34d399"
          colorTo="#f472b6"
          borderWidth={1.5}
        />
      )}

      <div className="relative p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* LEFT: Mini Timer */}
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            isCurrentlyProductive ? 'bg-emerald-400' :
            isDistracting ? 'bg-rose-400' :
            'bg-zinc-500'
          } ${isActive ? 'animate-pulse' : ''}`} />
          <div className="flex items-baseline gap-2">
            <AuroraText
              colors={
                isDistracting
                  ? ['#ef4444', '#f87171', '#dc2626', '#ef4444']
                  : isCurrentlyProductive
                    ? ['#34d399', '#10b981', '#059669', '#34d399']
                    : ['#3b82f6', '#60a5fa', '#2563eb', '#3b82f6']
              }
              speed={0.5}
            >
              <span className="font-display text-xl font-bold tracking-tighter">
                {formatTime(displayTimeMs)}
              </span>
            </AuroraText>
            {currentAppName && (
              <span className="text-[11px] text-zinc-500 hidden sm:inline truncate max-w-[120px]">
                {currentAppName}
              </span>
            )}
          </div>
        </div>

        {/* CENTER: Productivity Score */}
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1.5">
            <NumberTicker
              value={Math.round(productivityScore)}
              className={`font-data text-2xl font-bold tracking-tighter ${scoreHigh ? 'text-zinc-100' : 'text-zinc-300'}`}
            />
            <span className="text-[12px] text-zinc-500 font-data">/100</span>
          </div>
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">
            {productivityScore >= 80 ? 'On fire' :
             productivityScore >= 60 ? 'Good pace' :
             productivityScore >= 40 ? 'Keep going' : 'Focus up'}
          </span>
        </div>

        {/* RIGHT: Summary Badges */}
        <div className="flex items-center gap-2">
          <StatusBadge icon={<Flame size={11} />} label={`${streak}d streak`} color="amber" />
          <StatusBadge icon={<Trophy size={11} />} label={bestDay} color="amber" />
          <StatusBadge
            icon={<Moon size={11} />}
            label={`${sleepDebt}h debt`}
            color={sleepDebt > 2 ? 'rose' : 'zinc'}
          />
        </div>
      </div>
    </motion.div>
  );
}
```

**Validation:** After replacement, the file should be exactly 145 lines. StatusBand must use `font-display` for the timer, `font-data` for the score, and have no pink blob glow.

---

### 4.2 `src/pages/dashboard/ScheduleCard.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\dashboard\ScheduleCard.tsx`

**Key changes:**
- Amber thermal gradient (not pink)
- DotPattern background (3% opacity)
- BorderBeam on current block only
- `font-display` for title
- `rounded-xl` (hero card)

```tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import { BorderBeam } from '../../components/ui/border-beam';
import { AnimatedGradientText } from '../../components/ui/animated-gradient-text';
import { DotPattern } from '../../components/ui/dot-pattern';

interface ScheduleEntry {
  id: string;
  title: string;
  location?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  category?: string;
  color?: string;
}

interface ScheduleCardProps {
  className?: string;
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getMinutesUntil(timeStr: string): number {
  const now = new Date();
  const target = parseTime(timeStr);
  const current = now.getHours() * 60 + now.getMinutes();
  return target - current;
}

export function ScheduleCard({ className = '' }: ScheduleCardProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await (window as any).deskflowAPI?.getSchedule?.();
        if (result?.entries) setEntries(result.entries);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, []);

  const today = new Date().getDay();
  const todayEntries = useMemo(() =>
    entries
      .filter(e => e.day_of_week === today)
      .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time)),
    [entries, today]
  );

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const currentEntry = todayEntries.find(e => {
    const start = parseTime(e.start_time);
    const end = parseTime(e.end_time);
    return nowMinutes >= start && nowMinutes < end;
  });
  const upcomingEntries = todayEntries.filter(e => parseTime(e.start_time) > nowMinutes);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[today];

  if (loading) {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-[#131316] border border-[#27272a] card-inner-highlight p-5 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#1a1a1e] rounded w-1/3" />
          <div className="h-3 bg-[#1a1a1e] rounded w-1/2" />
          <div className="space-y-2 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-[#1a1a1e] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-xl
        bg-[#131316] border border-[#27272a] card-inner-highlight p-5 ${className}`}
    >
      {/* DotPattern background */}
      <DotPattern className="absolute inset-0 text-white pointer-events-none" opacity={0.03} gap={22} />

      {/* Amber thermal glow */}
      <div
        className="thermal-glow"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #fbbf24, transparent 70%)' }}
      />

      {/* Top edge line */}
      <div className="top-edge-line" style={{ '--edge-color': 'rgba(251, 191, 36, 0.35)' } as React.CSSProperties} />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <div>
            <AnimatedGradientText className="text-[15px] font-semibold tracking-tight" gradientFrom="#fbbf24" gradientTo="#f59e0b">
              {dayName}&apos;s Schedule
            </AnimatedGradientText>
            <p className="text-[11px] text-zinc-500">
              {todayEntries.length === 0
                ? 'No classes today'
                : `${todayEntries.length} block${todayEntries.length > 1 ? 's' : ''} scheduled`}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-data text-zinc-500">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {todayEntries.length === 0 ? (
        <div className="relative flex flex-col items-center text-center py-6">
          <div className="w-12 h-12 rounded-full bg-[#1a1a1e] flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-[13px] text-zinc-400">Nothing scheduled for today</p>
          <p className="text-[11px] text-zinc-600 mt-1">Add classes in Settings &rarr; Schedule</p>
        </div>
      ) : (
        <div className="relative space-y-2">
          <AnimatePresence>
            {currentEntry && (
              <motion.div
                key={currentEntry.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="relative overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/[0.08]">
                {/* Border beam on current block */}
                <BorderBeam size={80} duration={4} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1.5} />

                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: currentEntry.color || '#fbbf24' }} />
                <div className="relative flex items-center justify-between p-3 pl-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[13px] font-semibold text-zinc-100">{currentEntry.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-zinc-400 font-data">
                        {formatTime(currentEntry.start_time)} &ndash; {formatTime(currentEntry.end_time)}
                      </span>
                      {currentEntry.location && (
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{currentEntry.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Now</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {upcomingEntries.slice(0, 4).map((entry, i) => {
            const minsUntil = getMinutesUntil(entry.start_time);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="relative p-3 rounded-lg border border-[#27272a] bg-[#1a1a1e]/50
                  hover:bg-[#1a1a1e] hover:border-[#3f3f46]
                  transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: entry.color || '#52525b' }} />
                <div className="flex items-center justify-between pl-3">
                  <div>
                    <span className="text-[13px] font-medium text-zinc-200">{entry.title}</span>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-zinc-500 font-data">
                        {formatTime(entry.start_time)} &ndash; {formatTime(entry.end_time)}
                      </span>
                      {entry.location && (
                        <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{entry.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {minsUntil > 0 && minsUntil < 120 && (
                    <span className="text-[11px] text-zinc-500 font-data">
                      in {minsUntil}m
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}

          {upcomingEntries.length > 4 && (
            <div className="text-center text-[11px] text-zinc-600 pt-1">
              +{upcomingEntries.length - 4} more
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
```

**Validation:** ScheduleCard must be amber, not pink. Must use DotPattern. Must use `font-display` for title. Must use `rounded-xl`.

---

### 4.3 `src/pages/dashboard/InsightStrip.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\dashboard\InsightStrip.tsx`

**Key changes:**
- Use Marquee component when > 3 insights
- Cyan accent strip, not pink
- Compact cards (`rounded-lg`, `p-3`)
- No generic top-edge lines per card
- Use `font-data` for insight values

```tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, TrendingUp, Moon, Brain, Zap, Globe } from 'lucide-react';
import { Marquee } from '../../components/ui/marquee';
import { NumberTicker } from '../../components/ui/number-ticker';

interface InsightAtom {
  id: string;
  kind: string;
  domain: string;
  value?: number;
  unit?: string;
  copy: { headline: string; subtext: string };
}

const DOMAIN_ACCENT: Record<string, string> = {
  focus: '#f472b6',
  finance: '#34d399',
  learn: '#22d3ee',
  sleep: '#818cf8',
  productivity: '#fbbf24',
  external: '#38bdf8',
  app: '#a78bfa',
};

const DOMAIN_ICON: Record<string, React.ReactNode> = {
  focus: <Target size={14} />,
  finance: <TrendingUp size={14} />,
  learn: <Brain size={14} />,
  sleep: <Moon size={14} />,
  productivity: <Zap size={14} />,
  external: <Globe size={14} />,
  app: <Zap size={14} />,
};

interface InsightStripProps {
  insights?: InsightAtom[];
}

function InsightCard({ insight, index }: { insight: InsightAtom; index: number }) {
  const accent = DOMAIN_ACCENT[insight.domain] || '#a1a1aa';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex-shrink-0 w-[260px] rounded-lg p-3 mx-1.5
        bg-[#131316] border border-[#27272a] card-inner-highlight
        hover:border-[#3f3f46] hover:-translate-y-0.5
        transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center"
          style={{ backgroundColor: `${accent}18`, color: accent }}>
          {DOMAIN_ICON[insight.domain] || <Sparkles size={14} />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[12px] font-semibold text-zinc-200 truncate">
            {insight.copy.headline}
          </h4>
          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
            {insight.copy.subtext}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
          {insight.domain}
        </span>
        {insight.value !== undefined && (
          <span className="text-[12px] font-data font-semibold" style={{ color: accent }}>
            {insight.unit === '%' || insight.unit === 'h' || insight.unit === 'm' ? (
              <NumberTicker value={insight.value} className="inline" />
            ) : (
              insight.value
            )}
            {insight.unit || ''}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function InsightStrip({ insights = [] }: InsightStripProps) {
  if (insights.length === 0) return null;
  const useMarquee = insights.length > 3;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-cyan-400" />
        <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">AI Insights</span>
      </div>

      {useMarquee ? (
        <Marquee pauseOnHover className="[--duration:30s]">
          {insights.map((insight, i) => (
            <InsightCard key={insight.id} insight={insight} index={i} />
          ))}
        </Marquee>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {insights.map((insight, i) => (
            <InsightCard key={insight.id} insight={insight} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Validation:** Must use Marquee when > 3 insights. Cyan label. Compact cards. `font-data` for values.

---

### 4.4 `src/components/dashboard/GoalsCard.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\dashboard\GoalsCard.tsx`

**Key changes:**
- Emerald theme
- Add AnimatedCircularProgressBar at top
- Use NumberTicker for completion count
- Proper badge color rules
- Better empty state

```tsx
import { motion } from 'framer-motion';
import { Target, Check } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { EmptyState } from '../EmptyState';
import { AnimatedCircularProgressBar } from '../ui/animated-circular-progress-bar';
import { NumberTicker } from '../ui/number-ticker';

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  priority?: string;
}

interface GoalsCardProps {
  goals?: Goal[];
  onToggle?: (id: string) => void;
}

export function GoalsCard({ goals = [], onToggle }: GoalsCardProps) {
  const completed = goals.filter(g => g.completed).length;
  const total = goals.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-[10px] h-full
      bg-[#131316] border border-[#27272a] card-inner-highlight p-5
      transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
      hover:border-[#3f3f46]">
      {/* Emerald thermal glow */}
      <div
        className="thermal-glow"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #34d399, transparent 70%)' }}
      />
      {/* Top edge line */}
      <div className="top-edge-line" style={{ '--edge-color': 'rgba(52, 211, 153, 0.35)' } as React.CSSProperties} />

      <SectionHeader title="Today's Goals" icon={<Target size={14} />} className="relative" />

      <div className="relative flex items-center gap-4 mt-1 mb-3">
        <AnimatedCircularProgressBar
          value={pct}
          className="w-14 h-14"
          primaryColor="#34d399"
        />
        <div>
          <div className="flex items-baseline gap-1">
            <NumberTicker value={completed} className="font-data text-xl font-bold text-zinc-100" />
            <span className="text-[12px] text-zinc-500 font-data">/ {total}</span>
          </div>
          <div className="text-[11px] text-zinc-500">{pct}% complete</div>
        </div>
      </div>

      <div className="space-y-1.5 relative">
        {goals.slice(0, 5).map((goal, i) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 p-2.5 rounded-lg
              bg-[#1a1a1e]/60 border border-[#27272a]
              hover:bg-[#1a1a1e] hover:border-[#3f3f46]
              transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group"
            onClick={() => onToggle?.(goal.id)}>

            <motion.div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
                transition-colors duration-150 ${
                  goal.completed
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-zinc-600 group-hover:border-emerald-400/50'
                }`}
              whileTap={{ scale: 0.9 }}>
              {goal.completed && <Check size={12} className="text-white" strokeWidth={3} />}
            </motion.div>

            <span className={`text-[13px] flex-1 truncate transition-colors ${
              goal.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'
            }`}>
              {goal.title}
            </span>

            {goal.priority === 'high' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md
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
          description="No pending goals for today"
        />
      )}
    </div>
  );
}
```

**Validation:** Must have emerald progress ring. Must use NumberTicker. Must use `rounded-[10px]`. Empty state must still work.

---

### 4.5 `src/components/dashboard/DeadlinesCard.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\dashboard\DeadlinesCard.tsx`

**Key changes:**
- Rose theme
- BorderBeam on urgent items (< 3 days)
- NumberTicker for days remaining
- Better urgency badge styling

```tsx
import { motion } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { EmptyState } from '../EmptyState';
import { BorderBeam } from '../ui/border-beam';
import { NumberTicker } from '../ui/number-ticker';

interface Deadline {
  id: string;
  title: string;
  due_date: string;
  status?: string;
  course?: string;
  priority?: string;
}

interface DeadlinesCardProps {
  deadlines?: Deadline[];
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const due = new Date(dateStr);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function DeadlinesCard({ deadlines = [] }: DeadlinesCardProps) {
  const sorted = [...deadlines]
    .filter(d => d.status !== 'completed')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 4);

  return (
    <div className="relative overflow-hidden rounded-[10px] h-full
      bg-[#131316] border border-[#27272a] card-inner-highlight p-5
      transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
      hover:border-[#3f3f46]">
      {/* Rose thermal glow */}
      <div
        className="thermal-glow"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #fb7185, transparent 70%)' }}
      />
      {/* Top edge line */}
      <div className="top-edge-line" style={{ '--edge-color': 'rgba(251, 113, 133, 0.35)' } as React.CSSProperties} />

      <SectionHeader title="Deadlines" icon={<AlertCircle size={14} />} className="relative" />

      <div className="space-y-2 relative mt-2">
        {sorted.map((deadline, i) => {
          const daysLeft = getDaysUntil(deadline.due_date);
          const urgency = daysLeft <= 2 ? 'urgent' : daysLeft <= 5 ? 'soon' : 'normal';
          const urgencyStyles = {
            urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            soon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            normal: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/30',
          };

          return (
            <motion.div
              key={deadline.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-lg p-2.5
                bg-[#1a1a1e]/60 border border-[#27272a]
                hover:bg-[#1a1a1e] hover:border-[#3f3f46]
                transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]">
              {urgency === 'urgent' && (
                <BorderBeam size={60} duration={3} colorFrom="#fb7185" colorTo="#f43f5e" borderWidth={1} />
              )}
              <div className="relative flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-zinc-200 truncate">{deadline.title}</div>
                  {deadline.course && (
                    <div className="text-[11px] text-zinc-600 mt-0.5">{deadline.course}</div>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md
                  text-[11px] font-semibold font-data border shrink-0 ml-2 ${urgencyStyles[urgency]}`}>
                  <Clock size={11} />
                  {daysLeft <= 0 ? 'Today' : (
                    <>
                      <NumberTicker value={Math.abs(daysLeft)} className="inline" />
                      d
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <EmptyState
          icon={<CheckCircle2 size={20} className="text-zinc-600" />}
          title="No upcoming deadlines"
          description="You're in the clear"
        />
      )}
    </div>
  );
}
```

**Validation:** Rose theme. BorderBeam on urgent. NumberTicker for days. `rounded-[10px]`.

---

### 4.6 `src/pages/dashboard/TierBreakdownStrip.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\dashboard\TierBreakdownStrip.tsx`

**Key changes:**
- NO gradient background (data precision)
- Use `rounded-lg` (8px) per stat
- Remove per-stat top edge lines (clean data)
- All values use NumberTicker
- Use `font-data` everywhere
- Compact padding

```tsx
import { motion } from 'framer-motion';
import { CheckCircle2, MinusCircle, XCircle, Clock, TrendingUp, Activity } from 'lucide-react';
import { NumberTicker } from '../../components/ui/number-ticker';

interface TierBreakdownStripProps {
  productiveHours: number;
  neutralHours: number;
  distractingHours: number;
  totalHours: number;
  score: number;
  trendValue: string;
  trendPositive: boolean;
}

interface TierStat {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  showBar?: boolean;
  suffix?: string;
  decimals?: number;
}

export function TierBreakdownStrip({
  productiveHours,
  neutralHours,
  distractingHours,
  totalHours,
  score,
  trendValue,
  trendPositive,
}: TierBreakdownStripProps) {
  const stats: TierStat[] = [
    { label: 'Productive', value: productiveHours, color: '#34d399', icon: <CheckCircle2 size={14} />, showBar: true, suffix: 'h', decimals: 1 },
    { label: 'Neutral', value: neutralHours, color: '#fbbf24', icon: <MinusCircle size={14} />, showBar: true, suffix: 'h', decimals: 1 },
    { label: 'Distracting', value: distractingHours, color: '#f87171', icon: <XCircle size={14} />, showBar: true, suffix: 'h', decimals: 1 },
    { label: 'Total', value: totalHours, color: '#a1a1aa', icon: <Clock size={14} />, showBar: false, suffix: 'h', decimals: 1 },
    { label: 'Score', value: Math.round(score), color: '#f472b6', icon: <TrendingUp size={14} />, showBar: false, suffix: '', decimals: 0 },
    { label: 'Trend', value: 0, color: trendPositive ? '#34d399' : '#f87171', icon: <Activity size={14} />, showBar: false, suffix: '', decimals: 0 },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 + i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-lg p-3
            bg-[#131316] border border-[#27272a] card-inner-highlight
            transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
            hover:border-[#3f3f46]">
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color: stat.color }}>{stat.icon}</span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              {stat.label}
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            {stat.label === 'Trend' ? (
              <span className="font-data text-lg font-bold tracking-tighter" style={{ color: stat.color }}>
                {trendValue}
              </span>
            ) : (
              <>
                <NumberTicker
                  value={stat.value}
                  className="font-data text-lg font-bold tracking-tighter text-zinc-100"
                />
                {stat.suffix && (
                  <span className="text-[11px] text-zinc-600 font-data">{stat.suffix}</span>
                )}
              </>
            )}
          </div>

          {stat.showBar && (
            <div className="mt-2 h-1 rounded-full bg-[#1a1a1e] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: stat.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(stat.value / Math.max(totalHours, 1)) * 100}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
```

**Validation:** NO gradient. `rounded-lg` per cell. `gap-2`. All NumberTicker. `font-data` for values.

---

### 4.7 `src/components/dashboard/SleepBarMini.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\dashboard\SleepBarMini.tsx`

**Key changes:**
- Indigo theme
- Better bar styling
- NumberTicker for average
- Add sleep debt badge

```tsx
import { motion } from 'framer-motion';
import { Moon } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { NumberTicker } from '../ui/number-ticker';

interface SleepDay {
  label: string;
  hours: number;
}

interface SleepBarMiniProps {
  sleepData?: SleepDay[];
  avgSleep?: number;
  sleepDebt?: number;
}

export function SleepBarMini({ sleepData = [], avgSleep = 0, sleepDebt = 0 }: SleepBarMiniProps) {
  const maxHours = Math.max(10, ...sleepData.map(d => d.hours));

  return (
    <div className="relative overflow-hidden rounded-[10px] h-full
      bg-[#131316] border border-[#27272a] card-inner-highlight p-5
      transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
      hover:border-[#3f3f46]">
      {/* Indigo thermal glow */}
      <div
        className="thermal-glow"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #818cf8, transparent 70%)' }}
      />
      {/* Top edge line */}
      <div className="top-edge-line" style={{ '--edge-color': 'rgba(129, 140, 248, 0.35)' } as React.CSSProperties} />

      <SectionHeader title="Sleep" icon={<Moon size={14} />} className="relative" />

      <div className="relative flex items-end gap-1.5 h-20 mt-3">
        {sleepData.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(day.hours / maxHours) * 100}%` }}
              transition={{ delay: 0.4 + i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full rounded-t-md min-h-[4px] ${
                day.hours >= 7 ? 'bg-indigo-400' : 'bg-indigo-400/40'
              }`}
            />
            <span className="text-[10px] text-zinc-500 font-medium">{day.label}</span>
          </div>
        ))}
        {sleepData.length === 0 && (
          <div className="w-full h-full flex items-center justify-center text-[12px] text-zinc-600">
            No sleep data
          </div>
        )}
      </div>

      <div className="relative mt-3 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">
          Avg: <span className="text-zinc-300 font-data">
            <NumberTicker value={avgSleep} className="inline" />
            h
          </span>
        </span>
        {sleepDebt > 0 && (
          <span className="text-rose-400 font-medium font-data">
            -<NumberTicker value={sleepDebt} className="inline" />h debt
          </span>
        )}
      </div>
    </div>
  );
}
```

**Validation:** Indigo theme. `rounded-[10px]`. NumberTicker for avg. Sleep debt badge.

---

### 4.8 `src/components/dashboard/MasteryRingMini.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\dashboard\MasteryRingMini.tsx`

**Key changes:**
- Cyan theme
- Use AnimatedCircularProgressBar instead of custom SVG
- NumberTicker for percentage
- `font-display` for large percentage

```tsx
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { AnimatedCircularProgressBar } from '../ui/animated-circular-progress-bar';
import { NumberTicker } from '../ui/number-ticker';

interface MasteryRingMiniProps {
  mastered?: number;
  total?: number;
}

export function MasteryRingMini({ mastered = 0, total = 1 }: MasteryRingMiniProps) {
  const pct = Math.round((mastered / Math.max(total, 1)) * 100);

  return (
    <div className="relative overflow-hidden rounded-[10px] h-full
      bg-[#131316] border border-[#27272a] card-inner-highlight p-5
      transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
      hover:border-[#3f3f46]">
      {/* Cyan thermal glow */}
      <div
        className="thermal-glow"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #22d3ee, transparent 70%)' }}
      />
      {/* Top edge line */}
      <div className="top-edge-line" style={{ '--edge-color': 'rgba(34, 211, 238, 0.35)' } as React.CSSProperties} />

      <SectionHeader title="Mastery" icon={<Brain size={14} />} className="relative" />

      <div className="relative flex items-center gap-4 mt-2">
        <div className="relative w-16 h-16 flex-shrink-0">
          <AnimatedCircularProgressBar
            value={pct}
            className="w-16 h-16"
            primaryColor="#22d3ee"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[13px] font-data font-bold text-cyan-400">
              <NumberTicker value={pct} className="inline" />%
            </span>
          </div>
        </div>

        <div>
          <div className="text-[13px] text-zinc-300">
            <span className="font-data font-bold text-cyan-400"><NumberTicker value={mastered} className="inline" /></span>
            <span className="text-zinc-600 font-data"> / {total}</span> nodes
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Proficiency level &ge; 4</div>
        </div>
      </div>
    </div>
  );
}
```

**Validation:** Cyan theme. Uses AnimatedCircularProgressBar. NumberTicker. `rounded-[10px]`.

---

### 4.9 `src/components/SectionHeader.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\SectionHeader.tsx`

**Key changes:**
- Smaller icon container (w-8 h-8)
- Icon size 14px
- Title uses `text-[15px] font-semibold tracking-tight text-zinc-200`
- Remove the CSS var dependency for default icon box; keep it as a fallback

```tsx
interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  accent?: string;
}

export function SectionHeader({ title, icon, action, className = '', accent }: SectionHeaderProps) {
  const accentColor = accent || 'var(--page-accent, #f472b6)';
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${accentColor}15`,
              border: `1px solid ${accentColor}25`,
              color: accentColor,
            }}>
            {icon}
          </div>
        )}
        <h2 className="text-[15px] font-semibold tracking-tight text-zinc-200">{title}</h2>
      </div>
      {action}
    </div>
  );
}
```

**Validation:** Must pass `accent` prop from parent. Default to pink. Icon container 8x8. Title 15px.

---

### 4.10 `src/components/insights/GoalRing.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\insights\GoalRing.tsx`

**Key changes:**
- Keep the FocusEmber background
- Use `font-display` for percentage
- Use `font-data` for stat values
- Cleaner text hierarchy
- Use `text-zinc-200` for label

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { FocusEmber } from './FocusEmber';
import { GlassCard } from '../GlassCard';
import { Target, Zap } from 'lucide-react';
import { AnimatedCircularProgressBar } from '../ui/animated-circular-progress-bar';
import { NumberTicker } from '../ui/number-ticker';

interface GoalRingProps {
  current: number;
  goal: number;
  unit?: string;
  label?: string;
  boost?: boolean;
}

export function GoalRing({ current, goal, unit = 'min', label = 'Today\'s Focus', boost = false }: GoalRingProps) {
  const reduce = useReducedMotion();
  const safeCurrent = typeof current === 'number' && !Number.isNaN(current) ? current : 0;
  const safeGoal = typeof goal === 'number' && !Number.isNaN(goal) && goal > 0 ? goal : 1;
  const pct = Math.min(safeCurrent / safeGoal, 1);
  const pctRounded = Math.round(pct * 100);
  const reached = pct >= 1;
  const wasReached = useRef(reached);
  const [flare, setFlare] = useState(false);

  useEffect(() => {
    if (reached && !wasReached.current) {
      wasReached.current = true;
      setFlare(true);
      const t = setTimeout(() => setFlare(false), 900);
      return () => clearTimeout(t);
    }
    if (!reached) wasReached.current = false;
  }, [reached]);

  const remaining = Math.max(0, safeGoal - safeCurrent);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <GlassCard className="h-full relative overflow-hidden rounded-[10px] p-5">
        {/* Pink thermal glow */}
        <div
          className="thermal-glow"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #f472b6, transparent 70%)' }}
        />
        {/* Top edge line */}
        <div className="top-edge-line" style={{ '--edge-color': 'rgba(244, 114, 182, 0.35)' } as React.CSSProperties} />

        <div className="relative flex flex-col items-center gap-4 py-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-pink-400" />
            </div>
            <span className="text-[15px] font-semibold text-zinc-200 tracking-tight">{label}</span>
          </div>

          {/* Progress ring */}
          <div className="relative" style={{ width: 160, height: 160 }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <FocusEmber intensity={pct} boost={boost} size={160} />
            </div>

            {flare && !reduce && (
              <motion.div
                initial={{ opacity: 0.6, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: '0 0 24px 6px rgba(236,72,153,0.4)' }}
              />
            )}

            <AnimatedCircularProgressBar
              value={pctRounded}
              className="w-[160px] h-[160px]"
              primaryColor="#ec4899"
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold text-pink-400 tracking-tighter">
                <NumberTicker value={pctRounded} className="inline" />%
              </span>
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">complete</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="font-data text-lg font-bold text-zinc-100 tracking-tighter">
                <NumberTicker value={Math.round(safeCurrent)} className="inline" />
              </div>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Done</div>
            </div>
            {pct < 1 && (
              <div className="text-center">
                <div className="font-data text-lg font-bold text-zinc-400 tracking-tighter">
                  <NumberTicker value={Math.round(remaining)} className="inline" />
                </div>
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Remaining</div>
              </div>
            )}
            <div className="text-center">
              <div className="font-data text-lg font-bold text-zinc-400 tracking-tighter">
                <NumberTicker value={Math.round(safeGoal)} className="inline" />
              </div>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Goal</div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-600 font-data">
            {unit} tracked
          </div>

          {boost && (
            <div className="flex items-center gap-1.5 text-[11px] text-pink-400/80">
              <Zap className="w-3 h-3" />
              <span>Deep Focus active</span>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
```

**Validation:** Uses AnimatedCircularProgressBar. `font-display` for percentage. `font-data` for stats. `rounded-[10px]` on GlassCard.

---

### 4.11 `src/components/finance/FollowThroughCard.tsx` — Full Replacement

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\finance\FollowThroughCard.tsx`

**Key changes:**
- Amber thermal gradient
- Top edge line
- Use `font-data` for all monetary values
- Use NumberTicker for totals
- Clean up mom badge (reversed color logic: up means more spent = bad for fronting, so red)
- `rounded-[10px]`

```tsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Handshake, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { NumberTicker } from "../ui/number-ticker";

export interface FollowThroughBreakdown {
  label: string;
  total: number;
  count: number;
}

export interface FollowThroughCardProps {
  currency: string;
  totalThisMonth: number;
  momChangePct: number | null;
  receivable: number;
  breakdown: FollowThroughBreakdown[];
  trend: number[];
  onViewDetails?: () => void;
  ftPersons?: { id: number; name: string; balance?: number; wallet_id?: number | null }[];
}

const fadeIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
};

export function FollowThroughCard({
  currency,
  totalThisMonth,
  momChangePct,
  receivable,
  breakdown,
  trend,
  onViewDetails,
  ftPersons = [],
}: FollowThroughCardProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  const max = Math.max(1, ...trend);
  const up = (momChangePct ?? 0) >= 0;
  const hasData = totalThisMonth > 0 || receivable > 0;

  // Format currency without symbol for ticker
  const currencyParts = useMemo(() => {
    const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
    const parts = formatter.formatToParts(0);
    const symbol = parts.find(p => p.type === 'currency')?.value || currency;
    return { symbol };
  }, [currency]);

  return (
    <motion.section
      {...fadeIn}
      className="relative overflow-hidden rounded-[10px]
        bg-[#131316] border border-[#27272a] card-inner-highlight p-5"
    >
      {/* Amber thermal glow */}
      <div
        className="thermal-glow"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #fbbf24, transparent 70%)' }}
      />
      {/* Top edge line */}
      <div className="top-edge-line" style={{ '--edge-color': 'rgba(251, 191, 36, 0.35)' } as React.CSSProperties} />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Handshake className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-zinc-200">Follow Through</h3>
            <p className="text-[11px] text-zinc-500">Money you fronted for others</p>
          </div>
        </div>
        {momChangePct !== null && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border ${
              up
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(momChangePct).toFixed(0)}%
          </motion.span>
        )}
      </div>

      {!hasData ? (
        <div className="relative flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-[#1a1a1e] flex items-center justify-center mb-3">
            <Handshake className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-[13px] text-zinc-400 max-w-[280px]">
            No money fronted for others yet. When you pay for someone who&apos;ll pay you back,
            mark it &ldquo;Follow Through&rdquo; and it appears here.
          </p>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 gap-4 mb-4"
          >
            <motion.div variants={staggerItem} className="p-3 rounded-lg bg-[#1a1a1e]/60 border border-[#27272a]">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">This Month</p>
              <p className="text-xl font-data font-bold tracking-tighter text-amber-300">
                {currencyParts.symbol}
                <NumberTicker value={totalThisMonth} className="inline" />
              </p>
            </motion.div>
            <motion.div variants={staggerItem} className="p-3 rounded-lg bg-[#1a1a1e]/60 border border-[#27272a]">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Handshake className="w-3 h-3" /> You&apos;ll be repaid
              </p>
              <p className="text-xl font-data font-bold tracking-tighter text-emerald-300">
                {currencyParts.symbol}
                <NumberTicker value={receivable} className="inline" />
              </p>
            </motion.div>
          </motion.div>

          {/* Mini trend bar */}
          {trend.length > 0 && (
            <div className="flex items-end gap-1 h-10 mb-4" aria-hidden>
              {trend.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, (v / max) * 40)}px` }}
                  transition={{ duration: 0.4, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 rounded-t bg-amber-400/40"
                />
              ))}
            </div>
          )}

          {/* Per-person breakdown */}
          {breakdown.length > 0 && (
            <div className="border-t border-[#27272a] pt-3">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Owed by</p>
              <div className="space-y-1.5">
                {breakdown.map((b) => {
                  const person = ftPersons.find(p => p.name === b.label);
                  const storedBalance = person?.balance ?? 0;
                  return (
                    <div key={b.label} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-[#1a1a1e] transition-colors duration-150">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-amber-400">{b.label[0]?.toUpperCase()}</span>
                        </div>
                        <span className="text-[13px] text-zinc-300 truncate">{b.label}</span>
                        <span className="text-[10px] text-zinc-600">({b.count})</span>
                        {storedBalance > 0 && (
                          <span className="inline-flex items-center rounded-md bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 text-[9px] font-medium text-violet-400">
                            bal: {fmt(storedBalance)}
                          </span>
                        )}
                      </div>
                      <span className="text-[13px] font-data font-medium text-zinc-200">{fmt(b.total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="relative mt-3 flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
        >
          View all details <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </motion.section>
  );
}
```

**Validation:** Amber theme. NumberTicker. `font-data`. `rounded-[10px]`. Mom badge reversed (up=red, down=green because more fronted = bad).

---

### 4.12 `src/pages/DashboardPage.tsx` — Inline Component Updates

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\pages\DashboardPage.tsx`

**What to do:** Do NOT replace the entire file. Only replace the inline-styled components in the render section.

#### 4.12.1 Productivity Chart Card

Find the Productivity chart block (around line 2472-2501). Replace the outer `motion.div` className and inner SectionHeader with this:

```tsx
<motion.div
  className="relative overflow-hidden rounded-[10px]
    bg-[#131316] border border-[#27272a] card-inner-highlight p-5
    transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
    hover:border-[#3f3f46]"
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.48, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
  {/* Emerald thermal glow */}
  <div
    className="thermal-glow"
    style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #34d399, transparent 70%)' }}
  />
  <div className="top-edge-line" style={{ '--edge-color': 'rgba(52, 211, 153, 0.35)' } as React.CSSProperties} />
  <SectionHeader title="Productivity" icon={<BarChart3 size={14} />} accent="#34d399" className="relative" />
  <div className="h-52 mt-2 relative">
    {/* existing chart code stays the same */}
  </div>
</motion.div>
```

**Do NOT change the chart code inside the div.** Only change the card wrapper.

#### 4.12.2 App Ecosystem Card

Find the App Ecosystem block (around line 2511-2553). Replace the outer card styling with this:

```tsx
<motion.div
  className="relative overflow-hidden rounded-xl
    bg-[#0a0a0c] border border-[#27272a] card-inner-highlight p-5 mb-4
    transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
    hover:border-[#3f3f46]"
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.56, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
  {/* No gradient — darker background lets orbit glow */}
  <div className="top-edge-line" style={{ '--edge-color': 'rgba(56, 189, 248, 0.35)' } as React.CSSProperties} />
  <SectionHeader title="App Ecosystem" icon={<Sun size={14} />} accent="#38bdf8" className="relative" />
  {/* existing orbit code stays the same */}
</motion.div>
```

**Do NOT change the orbit code.** Only change the card wrapper.

#### 4.12.3 Activity Feed Card

Find the Activity Feed block (around line 2556-2595). Replace with this:

```tsx
<motion.div
  className="relative overflow-hidden rounded-[10px]
    bg-[#131316] border border-[#27272a] card-inner-highlight p-5 mb-4
    transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
    hover:border-[#3f3f46]"
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.64, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
  <div className="top-edge-line" style={{ '--edge-color': 'rgba(82, 82, 91, 0.35)' } as React.CSSProperties} />
  <SectionHeader title="Recent Sessions" icon={<Clock size={14} />} accent="#52525b" className="relative" />
  <div className="space-y-0.5 mt-3 relative">
    {/* existing activity feed code stays the same */}
  </div>
</motion.div>
```

**Do NOT change the activity feed item code.** Only change the card wrapper.

#### 4.12.4 SectionHeader Prop Updates

Find all SectionHeader calls in DashboardPage.tsx and add `accent` prop and `className="relative"`:
- `<SectionHeader title="Productivity" icon={<BarChart3 size={14} />} accent="#34d399" className="relative" />`
- `<SectionHeader title="App Ecosystem" icon={<Sun size={14} />} accent="#38bdf8" className="relative" />`
- `<SectionHeader title="Recent Sessions" icon={<Clock size={14} />} accent="#52525b" className="relative" />`

---

### 4.13 `src/components/GlassCard.tsx` — Minor Update

**File:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\src\components\GlassCard.tsx`

**What to do:** Ensure the default variant has `rounded-xl` and the background matches `#131316`.

**Current:** `bg-zinc-900/60`
**Change to:** `bg-[#131316]` for the default variant.

```tsx
const variantStyles: Record<string, string> = {
  default:   'bg-[#131316] backdrop-blur-xl border border-[#27272a] card-inner-highlight',
  // ... keep others as-is
};
```

**Do NOT remove accent config.** Only change default background.

---

## 5. MCP COMPONENT USAGE RULES

These are the ONLY allowed uses of each MCP component. Do not invent new uses.

| Component | Allowed On | Forbidden On |
|-----------|-----------|--------------|
| **AuroraText** | Timer digits (StatusBand, StopwatchTimer), hero score | Labels, badges, body text, secondary data |
| **AnimatedGradientText** | Section titles (Schedule, Goals, Deadlines, Focus, Sleep, Mastery) | Badges, meta text, data values |
| **AnimatedShinyText** | Idle states, "No data" labels, loading placeholders | Active data, primary content |
| **NumberTicker** | All KPI values on first load | Static values, text that doesn't change |
| **BlurFade** | Card entrances (optional) | Already-visible content |
| **BorderBeam** | StatusBand (productive), ScheduleCard (current block), DeadlinesCard (urgent) | Every card, background effects |
| **AnimatedCircularProgressBar** | GoalsCard, MasteryRingMini, GoalRing | Linear progress bars, stat bars |
| **DotPattern** | ScheduleCard background ONLY | Any other card |
| **Marquee** | InsightStrip when > 3 insights | Static lists, data tables |
| **Particles** | AppEcosystem background (if needed) | Text cards, lists |
| **Skeleton** | Loading states for data cards | Static content, decorative |
| **ShinyButton** | Primary CTA buttons only | Secondary actions, links |

---

## 6. ANTI-SLOP VERIFICATION CHECKLIST

Before declaring done, check EVERY item:

- [ ] No `rounded-2xl` or `rounded-3xl` in any new/modified card
- [ ] No `bg-[rgba(24,24,27,0.80)]` or `bg-[rgba(24,24,27,0.60)]` — use `bg-[#131316]`
- [ ] No `border-[rgba(63,63,70,0.50)]` — use `border-[#27272a]`
- [ ] No pink gradient on non-pink cards
- [ ] All cards have `card-inner-highlight` class
- [ ] All cards have proper `top-edge-line` with correct accent color
- [ ] All data values use `font-data` class
- [ ] Hero timer uses `font-display` class
- [ ] All NumberTicker values display correctly
- [ ] No `box-shadow` for elevation (except `card-inner-highlight` inset)
- [ ] No `transition-all` without property specification
- [ ] No `font-thin` (100-300) anywhere
- [ ] No emoji as icons
- [ ] SectionHeader has `accent` prop and `className="relative"`
- [ ] All imports are correct (no missing components)
- [ ] Build succeeds with no errors
- [ ] App launches with visible content (no black screen)

---

## 7. BUILD & VERIFICATION STEPS

1. **Run build:** `node scripts/build.mjs` (NOT `rebuild-main.mjs`)
2. **Check preload:** `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
3. **Run app:** `npx electron .`
4. **Verify dashboard:** All cards visible, no console errors, no black screen
5. **Check console:** No errors about `font-display` or `font-data` classes
6. **Check Network tab:** JetBrains Mono font loaded from Google Fonts

---

## 8. COMMON ERRORS & FIXES

### Error: "NumberTicker is not a function" or import error
**Fix:** Ensure the import path matches exactly:
```tsx
import { NumberTicker } from '../ui/number-ticker';
```

### Error: "AnimatedCircularProgressBar expects different props"
**Fix:** Check the actual component file. Common props: `value`, `className`, `primaryColor`. If it doesn't accept `primaryColor`, use `className` and inspect CSS.

### Error: "TypeScript error: accent prop not in SectionHeader"
**Fix:** The SectionHeader replacement in Section 4.9 includes `accent` prop. If not replaced, TypeScript will complain.

### Error: "Cards still look same after changes"
**Fix:** Check if the old gradient divs are still present. Search for `bg-[rgba(24,24,27,0.80)]` and replace with `bg-[#131316]`.

### Error: "Build fails with Tailwind class not found"
**Fix:** Add the utility classes in `src/index.css` as shown in Section 1.2.

### Error: "Top edge line not visible"
**Fix:** Ensure `top-edge-line` CSS is added and the CSS custom property `--edge-color` is set via inline style.

### Error: "Marquee not scrolling"
**Fix:** Ensure there are > 3 insights and the component is wrapped correctly. Marquee needs children with fixed widths.

---

## 9. SUMMARY OF CHANGES

| File | Change Type | Lines |
|------|-------------|-------|
| `index.html` | Modify | 1 line |
| `src/index.css` | Add utilities | ~25 lines |
| `src/pages/dashboard/StatusBand.tsx` | Full replace | ~145 lines |
| `src/pages/dashboard/ScheduleCard.tsx` | Full replace | ~220 lines |
| `src/pages/dashboard/InsightStrip.tsx` | Full replace | ~130 lines |
| `src/components/dashboard/GoalsCard.tsx` | Full replace | ~115 lines |
| `src/components/dashboard/DeadlinesCard.tsx` | Full replace | ~125 lines |
| `src/pages/dashboard/TierBreakdownStrip.tsx` | Full replace | ~95 lines |
| `src/components/dashboard/SleepBarMini.tsx` | Full replace | ~85 lines |
| `src/components/dashboard/MasteryRingMini.tsx` | Full replace | ~75 lines |
| `src/components/SectionHeader.tsx` | Full replace | ~25 lines |
| `src/components/insights/GoalRing.tsx` | Full replace | ~155 lines |
| `src/components/finance/FollowThroughCard.tsx` | Full replace | ~195 lines |
| `src/components/GlassCard.tsx` | Modify default bg | 1 line |
| `src/pages/DashboardPage.tsx` | Modify inline wrappers | ~6 places |

---

**END OF SPECIFICATION**

**Implementer note:** This document is exhaustive. If a detail is not specified, do not change it. If a component is not listed, do not modify it. When in doubt, preserve the existing code and only change the styling.
