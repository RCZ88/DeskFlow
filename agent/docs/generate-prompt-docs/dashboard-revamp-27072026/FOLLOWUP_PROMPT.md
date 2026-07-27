# PROMPT.md — Follow-up: Pixel-Level Specs Needed

---

## Raw Request

The plan looks good. But I need more detail on the visual specs before implementation. Specifically:

1. **Hero Timer** — What's the exact layout? Is it centered? Is it a full-width bar or a card? What's the glow spec (blur radius, opacity, color mapping)? What's the font stack for the timer digits?

2. **Card Design System** — You mentioned "Glass", "Inset", and "Outline" cards. What are the exact CSS specs for each? What's the difference between them? Which cards use which type?

3. **Deep Focus Card** — What's the new color scheme exactly? You said "dark matte + violet/aurora" — what hex values? What's the aurora effect spec?

4. **Bar Chart** — What's the new stacking spec? Rounded corners radius? Gradient stops? Legend position?

5. **Inline Creation UI** — What does the "+ Add" interaction look like? Is it an inline input that appears on click? A modal? What's the form layout?

6. **Tier Breakdown Position** — You said move to Row 3. What's the exact row order now? Can you give me the full new layout?

Give me the pixel-level CSS specs for each of these. I need exact values, not descriptions.

---

## Context: Current State of Each Component

### Current StatusBand (Hero Timer) — THIS IS WHAT NEEDS TO CHANGE:

```tsx
// src/pages/dashboard/StatusBand.tsx
// Current: compact bar, 24px font, loses color on neutral apps

<div className="relative p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
  {/* LEFT: Timer + Current App */}
  <div className="flex items-center gap-3">
    <motion.div className={`w-2 h-2 rounded-full shrink-0 ${
      isCurrentlyProductive ? 'bg-emerald-400' :
      isDistracting ? 'bg-rose-400' :
      'bg-zinc-500'  // <-- PROBLEM: gray when neutral, no blue
    }`} />
    <div className="flex items-baseline gap-2">
      <span className={`text-xl font-mono font-semibold tracking-tight ${  // <-- PROBLEM: 24px too small
        isDistracting ? 'text-rose-400' :
        isCurrentlyProductive ? 'text-emerald-400' :
        'text-zinc-300'  // <-- PROBLEM: gray when neutral
      }`}>
        {formatTime(displayTimeMs)}
      </span>
    </div>
  </div>
</div>
```

**What needs to change:**
- Timer font: 24px → 48px+
- Neutral state: `text-zinc-300` → `text-blue-400` (always show a color)
- Add ambient glow behind timer (radial gradient, category-colored)
- Make timer the HERO element, not buried in a compact bar

---

### Current Card Pattern — ALL IDENTICAL (this is the "flat" problem):

Every card uses:
```
bg-[#18181b] border border-[#27272a] rounded-xl p-5
```

**GoalsCard:**
```
bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
border border-[rgba(63,63,70,0.50)] p-5
hover:border-[rgba(82,82,91,0.80)]
```

**DeadlinesCard:** Same pattern
**SleepBarMini:** Same pattern
**TierBreakdownStrip:** Same pattern
**Productivity Chart:** Same pattern

**ALL cards look identical.** Need 3 distinct card types: Glass (hero), Inset (lists), Outline (actions).

---

### Current Deep Focus Card — PINK/MAGENTA THEME (needs redesign):

```tsx
// src/components/focus/QuickFocusCard.tsx
<GlassCard accent="pink" className="relative overflow-hidden h-full">
  {active && <Particles className="opacity-50" quantity={14} color="#ec4899" opacity={0.14} />}
  {active && <BorderBeam size={200} duration={8} colorFrom="#ec4899" colorTo="#f472b6" />}
  {/* ... */}
  <Focus className="w-4 h-4 text-pink-400" />
  <h3 className="text-sm font-semibold text-zinc-200">Deep Focus</h3>
```

**Current colors:** Pink (#ec4899), Rose (#f472b6)
**Needs:** Dark matte + violet/aurora. What hex values? What aurora spec?

---

### Current Bar Chart — BAD STACKING:

```tsx
// DashboardPage.tsx Row 7
<Bar data={{
  datasets: [
    { label: 'Productive', backgroundColor: '#34d399', borderRadius: 4 },
    { label: 'Other', backgroundColor: '#fbbf24', borderRadius: 4 },
    { label: 'External', backgroundColor: '#818cf8', borderRadius: 4 },
  ],
}} />
```

**Problems:** Flat colors, no gradients, stacking looks "childish"
**Needs:** Gradient fills, rounded segments, proper legend

---

### Current GoalsCard — NO ADD BUTTON, NO TOGGLE:

```tsx
// src/components/dashboard/GoalsCard.tsx
interface GoalsCardProps {
  goals?: Goal[];
  onToggle?: (id: string) => void;  // <-- EXISTS but NOT WIRED from DashboardPage
}

// DashboardPage.tsx line 2434:
<GoalsCard goals={goals} />  // <-- No onToggle prop passed!
```

**Needs:** "+" button to add goal inline. Wire onToggle. What does the inline form look like?

---

### Current TierBreakdownStrip — IN ROW 6 (too far down):

```
Row 1: StatusBand
Row 2: PinnedActivities
Row 3: ScheduleCard
Row 4: InsightStrip
Row 5: Goals + Deadlines + Focus
Row 6: TierBreakdownStrip  <-- MOVE TO ROW 3
Row 7: Productivity Chart
Row 8: SleepBarMini
Row 9: Activity Feed
```

**New order needed.** What's the full new layout?

---

### Current PinnedActivities — UI CLIPPING:

```tsx
// Edit mode buttons are clipped by parent container
<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
  {/* Buttons get cut off at top */}
</div>
```

**Needs:** Fix z-index, overflow, padding so edit/delete buttons are visible.

---

## What I Need From You

For each component above, give me:

1. **Exact CSS classes** (Tailwind) for the new design
2. **Exact hex values** for colors
3. **Exact pixel values** for sizes, padding, border-radius
4. **Exact layout** (flex/grid, alignment, gap)
5. **Exact motion specs** (duration, easing, delay)

Not descriptions — actual code I can copy-paste.

---

## Context Bundle

Same as before — `CONTEXT_BUNDLE.md` has all the current source code.
