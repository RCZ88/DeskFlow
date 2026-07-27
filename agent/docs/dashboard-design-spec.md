# DeskFlow Dashboard — Design Specification v1.0

> **Scope:** Dashboard page (`src/pages/DashboardPage.tsx`) only  
> **Level:** L2 (Responsive) — alive but focused, productivity-tool motion budget  
> **Date:** 2026-07-27  
> **Status:** Specification — pending implementation

---

## 1. Design Philosophy

**Vibe:** "Command Center" — a dark, data-dense productivity cockpit that feels alive but never distracting. Think Linear's precision + Sentry's information density + a single warm accent.

**Core Principle:** Every element earns its pixels. No decorative gradients that don't communicate data. No rounded corners where sharp edges convey structure. No motion that doesn't respond to the user.

**Anti-AI-Slop Rules:**
- No repeating `bg-[rgba(24,24,27,0.80)] backdrop-blur-xl` on every single element
- No identical `rounded-xl border` on everything — varying depth requires varying edge treatments
- No purple/indigo gradients "because dark mode"
- No "glass card" pattern copy-pasted 12 times without hierarchy
- Every card must have a distinct visual weight and purpose

---

## 2. Color System

### Base Palette (DeskFlow Dark)
```
Canvas (deepest):    #09090b  (zinc-950) — page background
Surface 1:           #18181b  (zinc-900) — primary card background
Surface 2:           #27272a  (zinc-800) — elevated elements, headers
Surface 3:           #3f3f46  (zinc-700) — borders, dividers

Primary Accent:      #ec4899  (pink-500) — CTAs, active states, hero numbers
Accent Hover:        #f472b6  (pink-400)
Accent Glow:         rgba(236, 72, 153, 0.15) — subtle ambient

Semantic:
  Productive:        #34d399  (emerald-400) — green indicators, positive trend
  Neutral:           #fbbf24  (amber-400) — neutral/warning
  Distracting:       #f87171  (red-400) — negative, alert
  Info:              #22d3ee  (cyan-400) — links, secondary actions

Text:
  Primary:           #fafafa  (zinc-50) — headings, important values
  Secondary:         #a1a1aa  (zinc-400) — labels, metadata
  Tertiary:          #71717a  (zinc-500) — timestamps, hints
  Disabled:          #52525b  (zinc-600)
```

### Depth System (NOT just "glass everywhere")
| Layer | Background | Border | Use Case |
|-------|-----------|--------|----------|
| **Base** | `#09090b` solid | none | Page background |
| **Card — Primary** | `#18181b` solid | `1px solid #27272a` | Standard data cards |
| **Card — Elevated** | `#18181b` solid + `box-shadow: 0 0 0 1px #27272a, 0 4px 20px rgba(0,0,0,0.4)` | none | Featured/prominent cards |
| **Card — Spotlight** | `#18181b` + MagicCard gradient border | MagicCard radial | Hero stats, primary actions |
| **Card — Floating** | `#18181b` + `box-shadow: 0 8px 30px rgba(0,0,0,0.5)` | none | Modals, popovers |

**Rule:** Only 1-2 cards per viewport use the Spotlight treatment. Everything else uses Primary or Elevated.

---

## 3. Typography System

**Font Stack:**
- UI / Body: `Geist, Inter, system-ui, sans-serif`
- Numbers / Mono: `JetBrains Mono, ui-monospace, monospace`

**Scale (modular, 1.25 ratio):**
```
Hero / Timer:        32px / 700 / -0.02em tracking  (JetBrains Mono)
Display:             24px / 600 / -0.01em
Section Title:       15px / 600 / 0
Card Title:          13px / 600 / 0
Body:                13px / 400 / 0
Body Small:          12px / 400 / 0
Caption / Meta:      11px / 500 / 0.01em  (slightly wider for readability)
Badge:               11px / 500 / 0
```

**Line Heights:**
- Headings: 1.2
- Body: 1.5
- Mono / numbers: 1.3 (tighter for visual blocks)

**Anti-Pattern Guard:** No `font-thin` (100-300) on dark backgrounds. Minimum 400 weight.

---

## 4. Spacing System

**Grid:** 8px base unit
```
4px   — micro (icon padding, tight inline gaps)
8px   — sm (component internal gaps)
12px  — md (card internal padding start)
16px  — lg (section gaps, card padding)
20px  — xl (generous card padding — p-5)
24px  — 2xl (major section separations)
32px  — 3xl (page-level divisions)
```

**Card Padding:** `p-5` (20px) is the standard. Never `p-6` or `p-8`.

**Section Gap:** `gap-4` (16px) between cards in a row, `space-y-4` between rows.

---

## 5. Card Design Spec

### 5.1 Standard Card (Primary Depth)
```
background: #18181b;
border: 1px solid #27272a;
border-radius: 12px;  /* rounded-xl */
padding: 20px;        /* p-5 */

/* Hover */
border-color: #3f3f46;
transition: border-color 150ms ease;
```

### 5.2 Elevated Card (Featured Content)
```
background: #18181b;
border: none;
border-radius: 12px;
padding: 20px;
box-shadow: 0 0 0 1px #27272a, 0 4px 20px rgba(0,0,0,0.4);

/* Hover */
box-shadow: 0 0 0 1px #3f3f46, 0 4px 20px rgba(0,0,0,0.4);
border-color transition not needed (no border);
```

### 5.3 Spotlight Card (Hero / Primary Stats)
```
/* Uses MagicCard component */
- Radial gradient border that follows cursor
- Gradient colors: pink-500 -> purple-500 -> zinc-800
- Inner overlay: subtle radial glow at cursor position
- Content sits above at z-40

/* Use sparingly — max 2 per viewport */
```

### 5.4 Top-Edge Accent Line
Some cards get a 1px accent line at the top edge to indicate category:
```
Productive cards:   border-top: 1px solid rgba(52, 211, 153, 0.3);  /* emerald */
Neutral cards:      border-top: 1px solid rgba(251, 191, 36, 0.3);  /* amber */
Distracting cards:    border-top: 1px solid rgba(248, 113, 113, 0.3);  /* red */
Primary/Featured:     border-top: 1px solid rgba(236, 72, 153, 0.3);  /* pink */
```

---

## 6. Layout Grid

**Dashboard Structure (Row-based, single column on mobile, 12-col grid on desktop):**

```
Row 1 — STATUS BAND (full width)
  [Spotlight Card] — Timer + "Focused Today" + Date

Row 2 — PINNED ACTIVITIES (full width)
  [Horizontal scroll strip] — Compact activity pills with icon + name

Row 3 — THREE-COLUMN STATS (Goals | Deadlines | Quick Focus)
  [Standard Card] [Standard Card] [Standard Card]

Row 4 — TIER BREAKDOWN (full width)
  [Standard Card — 4 columns] — Productive / Neutral / Distracting / Total
  (No score, no trend — just raw time values)

Row 5 — INSIGHT STRIP (full width, horizontal)
  [Compact horizontal row] — 4-5 mini insight stats

Row 6 — PRODUCTIVITY CHART (full width)
  [Elevated Card] — Bar chart + "View Heatmap" + "View Solar System" buttons

Row 7 — SLEEP (full width)
  [Standard Card] — Sleep bars or empty state

Row 8 — RECENT SESSIONS (full width)
  [Standard Card] — Scrollable session list
```

**Responsive Breakpoints:**
- Mobile (< 640px): Single column, all cards full width
- Tablet (640-1024px): 2-column where applicable
- Desktop (> 1024px): Full layout as above

---

## 7. Component Specifications

### 7.1 StatusBand (Row 1)
**Depth:** Spotlight Card (MagicCard)
**Height:** ~64px compact bar
**Layout:** Flex row, space-between

**Left Section:**
- Pulsing status dot (motion: scale pulse, 2s cycle)
  - Productive: emerald-400
  - Distracting: rose-400
  - Idle: zinc-500 (no pulse)
- Timer display: JetBrains Mono, 24px/700
  - Productive: emerald-400
  - Distracting: rose-400
  - Idle: zinc-300
- Current app name: 11px, zinc-500, truncate max 120px

**Center Section:**
- Zap icon (amber-400, 12px)
- "Xh Ym focused today" — NumberTicker animated count-up for minutes
- Label: 13px zinc-400, Value: 13px zinc-200 font-mono semibold

**Right Section:**
- Calendar icon (zinc-600, 10px)
- Date: 11px zinc-500 font-mono

**Entrance:** BlurFade delay=0, duration=0.5s

---

### 7.2 PinnedActivities (Row 2)
**Depth:** No card wrapper — inline horizontal strip
**Layout:** Flex row, gap-2, overflow-x-auto, with fade edges

**Activity Pill:**
```
height: 36px;
padding: 0 14px;
border-radius: 18px;  /* pill shape */
background: #18181b;
border: 1px solid #27272a;
font: 12px/500;
color: #a1a1aa;
display: flex; align-items: center; gap: 6px;

/* Hover */
border-color: #3f3f46;
background: #27272a;
transform: translateY(-1px);
box-shadow: 0 2px 8px rgba(0,0,0,0.3);
transition: all 150ms ease;

/* Active (currently tracking) */
border-color: rgba(236, 72, 153, 0.4);
background: rgba(236, 72, 153, 0.08);
color: #ec4899;
```

**Icon:** 14px, matching pill color
**Entrance:** Staggered BlurFade, 40ms delay between pills

---

### 7.3 TierBreakdownStrip (Row 4)
**Depth:** Standard Card with top-edge accent
**Layout:** 4-column grid (grid-cols-2 on mobile, grid-cols-4 on desktop)
**Gap:** 0 (internal borders divide columns)

**Column Structure:**
```
Each column:
  - Top border accent (1px) per category
  - Padding: 16px 20px
  - Label: 11px/500 uppercase tracking-wider, zinc-500
  - Value: JetBrains Mono, 24px/700
    - Productive: emerald-400
    - Neutral: amber-400
    - Distracting: red-400
    - Total: pink-400
  - Unit: 12px zinc-500, "h" or "m"

Dividers between columns: 1px solid #27272a vertical
```

**Columns:**
1. **Productive** — emerald top accent, NumberTicker for hours
2. **Neutral** — amber top accent, NumberTicker for hours
3. **Distracting** — red top accent, NumberTicker for hours
4. **Total** — pink top accent, NumberTicker for total hours

**No Score. No Trend. No progress bars.** Just clean numbers.

---

### 7.4 Productivity Chart (Row 6)
**Depth:** Elevated Card
**Layout:** Full width, vertical stack

**Chart Area:**
- Height: 250px
- Dark theme chart (already implemented)
- Rounded bars, no sharp corners

**Action Buttons (below chart, centered):**
```
Two buttons side by side, gap-3:

"View Heatmap" button:
  - Style: ghost/outline
  - Border: 1px solid #3f3f46
  - Hover: border pink-500/50, text pink-400
  - Icon: Grid icon

"View Solar System" button:
  - Style: ghost/outline
  - Border: 1px solid #3f3f46
  - Hover: border purple-500/50, text purple-400
  - Icon: Orbit icon
```

---

### 7.5 SleepBarMini (Row 7)
**Depth:** Standard Card with conditional empty state

**Populated State:**
- Mini bar chart showing last 7 days of sleep
- Bars: indigo-500 with indigo-400 top edge
- Height per bar: max 40px
- Average bedtime + wake time as caption below

**Empty State:**
- Centered flex column
- Moon icon (zinc-600, 24px)
- "No sleep data yet" — 13px zinc-400
- "Track your first sleep session to see trends" — 12px zinc-500
- No sad colors — use indigo hint, not gray/dead

---

### 7.6 Recent Sessions (Row 8)
**Depth:** Standard Card
**Layout:** Scrollable list, max height ~300px

**Session Row:**
```
height: 48px;
padding: 0 16px;
display: flex; align-items: center; gap: 12px;
border-bottom: 1px solid #27272a;

App icon / favicon: 24px rounded
App name: 13px/500 zinc-200
Category badge: 11px pill
Duration: 12px font-mono zinc-400
Time ago: 11px zinc-500
```

**Hover:** background rgba(255,255,255,0.03), transition 150ms

---

## 8. Motion & Animation Spec

**Level:** L2 (Responsive)

### Entrance Animations
- All rows use `BlurFade` with staggered delays
- Row 1: delay=0
- Row 2: delay=0.05s
- Row 3: delay=0.1s
- Row 4: delay=0.15s
- Row 5+: delay += 0.05s per row
- Duration: 0.4s, ease: `[0.16, 1, 0.3, 1]`

### Number Animations
- `NumberTicker` for all stat values
- Duration: 1200ms, spring damping: 60
- Only animates once on mount (useInView)

### Hover Micro-interactions
- **Cards:** `translateY(-2px)` + border color shift, 150ms
- **Pills:** `translateY(-1px)` + shadow, 150ms
- **Status dot:** scale pulse 2s infinite (when active)

### Ambient (ONE only)
- Subtle radial glow behind the StatusBand timer (pink-500 at 3% opacity, blur 80px)
- Breathing animation on active status dot

### Forbidden (L2 Budget)
- No particle effects
- No scroll-triggered animations beyond BlurFade
- No spring physics on layout changes
- No parallax

---

## 9. Empty & Loading States

### Empty States (per component)
| Component | Empty UI |
|-----------|----------|
| StatusBand | Always has data (timer always runs) |
| PinnedActivities | "No pinned activities" + pin icon + "Pin apps from the app list" |
| TierBreakdown | "No activity tracked today" + "Start working to see your breakdown" |
| Chart | Skeleton bars (animate-pulse) |
| Sleep | Moon icon + "No sleep data yet" + friendly caption |
| Sessions | "No recent sessions" + "Activity will appear here" |

### Loading States
- Skeleton: `animate-pulse bg-zinc-800 rounded-xl`
- Shape matches expected content (bar = bar skeleton, text = line skeleton)
- No spinners for initial load

---

## 10. Component Inventory (Real MCP Components)

| Component | Source | Usage |
|-----------|--------|-------|
| `MagicCard` | Magic UI (installed) | Spotlight effect on StatusBand |
| `NumberTicker` | Magic UI (installed) | Animated stat count-up |
| `BlurFade` | Magic UI (installed) | Section entrance animations |
| `AuroraText` | Magic UI (already in project) | Timer display (keep) |
| `Card` | shadcn/ui | Standard card wrapper |
| `Button` | shadcn/ui | Actions, CTAs |
| `Badge` | shadcn/ui | Category labels |
| `Skeleton` | shadcn/ui | Loading states |
| `Progress` | shadcn/ui | Sleep bars |

---

## 11. Anti-Slop Checklist

- [x] **Type:** Geist + JetBrains Mono only. No third font.
- [x] **Color:** Max 4 accents (pink, emerald, amber, red). No purple/indigo gradients everywhere.
- [x] **Geometry:** `rounded-xl` (12px) max. `p-5` (20px) standard.
- [x] **Hero:** No generic uppercase eyebrow + giant headline + CTA cliché.
- [x] **Sections:** No repeated tracked-uppercase kicker labels.
- [x] **Motion:** Real micro-interactions (hover lift, number count-up). Respects reduced motion.
- [x] **Imagery:** Icons from lucide-react only. No emoji. No filler glow/blobs.
- [x] **Empty states:** Every data component has a designed empty state.
- [x] **Icons:** All lucide-react. No inline SVG duplicates.
- [x] **Accessibility:** Focus-visible rings. Touch targets ≥ 44px.

---

## 12. Implementation Order

1. **Install dependencies** — `motion` (already installed)
2. **Create MagicCard component** ✅ (done)
3. **Create NumberTicker component** ✅ (done)
4. **Create BlurFade component** ✅ (done)
5. **Rewrite StatusBand** — Spotlight card + NumberTicker + BlurFade
6. **Rewrite PinnedActivities** — Pill strip with staggered entrance
7. **Rewrite TierBreakdownStrip** — 4-column with top-edge accents
8. **Rewrite SleepBarMini** — Proper empty state + indigo bars
9. **Update DashboardPage** — New layout grid, reordered rows
10. **Build + verify** — No black screen, all components visible

---

## 13. File Changes

| File | Action |
|------|--------|
| `src/components/ui/magic-card.tsx` | Create ✅ |
| `src/components/ui/number-ticker.tsx` | Create ✅ |
| `src/components/ui/blur-fade.tsx` | Create ✅ |
| `src/pages/dashboard/StatusBand.tsx` | Rewrite |
| `src/pages/dashboard/PinnedActivities.tsx` | Rewrite |
| `src/pages/dashboard/TierBreakdownStrip.tsx` | Rewrite |
| `src/components/dashboard/SleepBarMini.tsx` | Rewrite |
| `src/pages/DashboardPage.tsx` | Reorder layout |

---

*End of Design Specification*
