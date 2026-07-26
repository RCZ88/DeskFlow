# DeskFlow Dashboard — Premium Design Specification

> **Status:** Draft v1.0 | **Motion Level:** L2 Responsive | **Density:** Dense (7/10) | **Variance:** Balanced-Expressive (6/10)
> **Built by:** opencode (Hands & Eyes) | **Date:** 2026-07-26

---

## 1. DESIGN PHILOSOPHY: "Command Center"

The dashboard is not a report. It is a **live command center** — a place where the user glances and immediately knows their operational status. Think:
- **NASA mission control** (data density, precision, no fluff)
- **Apple Pro apps** (dark chrome, refined typography, restrained color)
- **Bloomberg Terminal** (information-forward, every pixel earns its keep)

**Three principles:**
1. **Information first, decoration never.** Every visual element must communicate something. If it doesn't, remove it.
2. **Thermal color metaphor.** Cool backgrounds (zinc/slate), warm data (amber/gold for energy, pink for brand, emerald for success), hot alerts (rose for urgency).
3. **Type is the interface.** In a dark dashboard, 60% of visual hierarchy comes from typography weight and temperature, not color blocks.

---

## 2. TYPOGRAPHY SYSTEM

### Font Stack (LOAD THESE)

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| **Primary UI** | Geist (loaded via `@fontsource-variable/geist`) | 400, 500, 600, 700 | All UI text, headings, body |
| **Display / Hero** | DM Serif Display (already loaded) | 400 | Timer digits, hero scores, large numbers |
| **Data / Code** | JetBrains Mono (load via `@fontsource-variable/jetbrains-mono`) | 400, 500 | Numbers, timestamps, code |
| **Fallback** | system-ui, -apple-system, sans-serif | — | If primary fails |

**Why these fonts:**
- **Geist** (Vercel's font): Designed for screens. Tighter than Inter, more character. The slightly squared forms feel technical and precise — perfect for a productivity tool.
- **DM Serif Display**: Only for the LARGEST numbers (timer, score). The contrast between sans-serif UI and serif display numbers creates a "premium editorial" feel — like a high-end watch face.
- **JetBrains Mono**: Tabular nums, clear distinction between 0/O, 1/l/I. Non-negotiable for data.

### Scale (Modular, 1.25 ratio)

| Token | Size | Weight | Line-Height | Color Temp | Usage |
|-------|------|--------|-------------|------------|-------|
| **Display XL** | 32px | 700 (Geist) | 1.1 | White | Timer, hero score |
| **Display** | 24px | 700 (DM Serif) | 1.2 | White | Section hero numbers |
| **H1** | 18px | 600 | 1.3 | zinc-100 | Page titles |
| **H2** | 15px | 600 | 1.4 | zinc-200 | Card headers |
| **H3** | 13px | 600 | 1.4 | zinc-300 | Sub-sections |
| **Body** | 13px | 400 | 1.5 | zinc-400 | Primary content |
| **Body+** | 14px | 500 | 1.5 | zinc-300 | Emphasized content |
| **Meta** | 12px | 400 | 1.4 | zinc-500 | Timestamps, labels |
| **Badge** | 11px | 600 | 1 | zinc-400 | Status badges |
| **Micro** | 10px | 500 | 1.2 | zinc-600 | Technical metadata |

**Rules:**
- NEVER use `font-thin` (100-300) on dark backgrounds. Minimum 400.
- Hero numbers use `tracking-tighter` (-0.05em) for density.
- Data numbers use `font-mono tabular-nums` — always.
- Headings use `tracking-tight` (-0.02em).

---

## 3. COLOR SYSTEM: Thermal Metaphor

### Base Palette (Dark Mode Only)

| Token | Hex | Usage |
|-------|-----|-------|
| **Base** | `#0a0a0c` | Page background — 3% lighter than pure black for depth |
| **Surface** | `#131316` | Card backgrounds |
| **Elevated** | `#1a1a1e` | Hover states, dropdowns |
| **Border** | `#27272a` | Subtle borders (12% opacity) |
| **Border Active** | `#3f3f46` | Hover/active borders |

### Thermal Accent Palette (NOT pink everywhere)

| Temperature | Color | Hex | Usage |
|-------------|-------|-----|-------|
| **Cold / Info** | Cyan | `#22d3ee` | Insights, analytics, data-focused |
| **Cool / Calm** | Slate | `#94a3b8` | Secondary text, neutral states |
| **Warm / Brand** | Pink | `#f472b6` | Brand accent, ONLY for primary actions and the productivity score |
| **Warm / Energy** | Amber | `#fbbf24` | Active sessions, streaks, warnings |
| **Hot / Urgent** | Rose | `#fb7185` | Deadlines, alerts, overdue items |
| **Hot / Success** | Emerald | `#34d399` | Completed goals, positive trends |

### Thermal Gradient System (per-card, NOT generic pink blob)

Instead of the same pink radial gradient on every card, each card type gets a **subtle, purpose-matched gradient** at very low opacity (3-6%):

| Card Type | Gradient | Rationale |
|-----------|----------|-----------|
| **StatusBand** | Pink radial (`#f472b6`, 5% opacity) | Brand hero — most prominent |
| **ScheduleHero** | Amber linear (`#fbbf24`, 4% opacity) | Time/scheduling energy |
| **InsightStrip** | Cyan sweep (`#22d3ee`, 3% opacity) | Intelligence/analytics feel |
| **GoalsCard** | Emerald radial (`#34d399`, 4% opacity) | Achievement, growth |
| **DeadlinesCard** | Rose radial (`#fb7185`, 5% opacity) | Urgency, heat |
| **FocusCard** | Violet radial (`#a78bfa`, 4% opacity) | Concentration, deep work |
| **TierBreakdown** | No gradient — clean lines | Data precision |
| **SleepBar** | Indigo radial (`#818cf8`, 4% opacity) | Night, rest |
| **MasteryRing** | Cyan radial (`#22d3ee`, 4% opacity) | Learning, knowledge |
| **ActivityFeed** | No gradient — list density | Information density |
| **AppEcosystem** | No gradient — orbit is the art | Let the 3D system breathe |

**Implementation:**
```tsx
// Each card gets a custom gradient div:
<div className="absolute inset-0 pointer-events-none rounded-xl opacity-[0.04]" 
  style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, var(--card-accent), transparent 70%)' }} />
```

---

## 4. SPATIAL SYSTEM

### Grid
- **Base unit:** 4px
- **All spacing:** Multiples of 4px
- **Section gap:** 16px (`gap-4`)
- **Card padding:** 20px (`p-5`) — NEVER p-6 or p-8

### Border Radius Variation (Anti-Blockiness)

| Element | Radius | Rationale |
|---------|--------|-----------|
| **Small badges/pills** | 6px (`rounded-md`) | Compact, precise |
| **Buttons** | 8px (`rounded-lg`) | Standard interactive |
| **Cards** | 10px (`rounded-[10px]`) | Slightly softer than 12px, more refined |
| **Hero cards** | 12px (`rounded-xl`) | Maximum allowed |
| **Modals** | 12px (`rounded-xl`) | — |
| **Avatars/dots** | 9999px (`rounded-full`) | — |

### Z-Index Scale (Strict)
| Layer | Value | Usage |
|-------|-------|-------|
| Base | 0 | Content |
| Elevated | 10 | Cards, sticky headers |
| Dropdown | 20 | Tooltips, menus |
| Modal | 30 | Dialogs |
| Toast | 40 | Notifications |
| Overlay | 50 | Backdrops |

---

## 5. COMPONENT INVENTORY & USAGE PLAN

### Available MCP Components (Already Installed)

| Component | File | Usage Plan | When NOT to Use |
|-----------|------|------------|-----------------|
| **AuroraText** | `ui/aurora-text.tsx` | Timer digits, hero productivity score ONLY | Never on body text, labels, or secondary data |
| **AnimatedGradientText** | `ui/animated-gradient-text.tsx` | Section titles ("Today's Schedule", "Goals") — ONE per view | Never on badges, meta text, or multiple competing elements |
| **AnimatedShinyText** | `ui/animated-shiny-text.tsx` | Idle state labels, "No data" states, loading placeholders | Never on primary active data |
| **NumberTicker** | `ui/number-ticker.tsx` | ALL KPI values on first load (focus minutes, streak count, tier stats) | Static values that don't change |
| **BlurFade** | `ui/blur-fade.tsx` | Card entrance animations on dashboard load | Already-loaded content |
| **BorderBeam** | `ui/border-beam.tsx` | Current block in ScheduleHero + StatusBand when productive | Never on every card |
| **AnimatedCircularProgress** | `ui/animated-circular-progress-bar.tsx` | MasteryRingMini, goal completion ring | Linear progress bars |
| **ShinyButton** | `ui/shiny-button.tsx` | Primary CTA buttons only ("Start Session", "Add Goal") | Secondary actions |
| **DotPattern** | `ui/dot-pattern.tsx` | Background texture for ScheduleHero card ONLY | Never overlaid on text |
| **Marquee** | `ui/marquee.tsx` | InsightStrip — horizontal scrolling insights | Never for critical single-read info |
| **Particles** | `ui/particles.tsx` | AppEcosystem background (subtle, low count) | Never near text |
| **Skeleton** | `ui/skeleton.tsx` | Loading states for all data-driven components | — |

### Component Assignment Map

| Dashboard Section | Primary Component | Secondary Components | Accent Color |
|-------------------|-------------------|----------------------|--------------|
| **StatusBand** | BorderBeam (productive state) | NumberTicker (score), AuroraText (timer) | Pink |
| **ScheduleHero** | DotPattern (bg) + BorderBeam (current block) | AnimatedGradientText (title) | Amber |
| **InsightStrip** | Marquee | BlurFade (entrance), AnimatedShinyText (idle) | Cyan |
| **GoalsCard** | NumberTicker (completed count) | BlurFade, AnimatedCircularProgress | Emerald |
| **DeadlinesCard** | BorderBeam (overdue items) | NumberTicker (days remaining) | Rose |
| **FocusCard** | NumberTicker (focus minutes) | AnimatedGradientText (title) | Violet |
| **TierBreakdown** | NumberTicker (all 6 stats) | — | White/Mono |
| **SleepBar** | — (custom chart) | NumberTicker (hours) | Indigo |
| **MasteryRing** | AnimatedCircularProgress | NumberTicker (percentage) | Cyan |
| **ActivityFeed** | Skeleton (loading) | — | Zinc |
| **AppEcosystem** | Particles (background) | — | Mixed |

---

## 6. MOTION PLAN: L2 — Responsive

### Level Declaration
**L2 (Responsive)** — Alive but focused. Micro-interactions + smooth transitions + one restrained ambient accent per screen. DeskFlow default.

### Motion Budget Per Screen
- **StatusBand:** 1 ambient (breathing status dot) + reactive (hover lift)
- **ScheduleHero:** 1 ambient (BorderBeam on current block) + transitional (block transitions)
- **InsightStrip:** 1 ambient (Marquee scroll) — auto-pauses on hover
- **All cards:** Reactive only (hover lift + border glow)
- **AppEcosystem:** L3 ambient allowed (particles + orbit) — this is the ONE L3 exception

### Timing Tokens
| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| **Micro** | 100ms | ease-out | Color changes, opacity toggles |
| **Fast** | 150ms | cubic-bezier(0.16, 1, 0.3, 1) | Hover states, button presses |
| **Normal** | 250ms | cubic-bezier(0.16, 1, 0.3, 1) | Modals, card transitions |
| **Slow** | 400ms | cubic-bezier(0.16, 1, 0.3, 1) | Page transitions |
| **Ambient** | 8000-30000ms | linear | Breathing dots, gradient drift |

### Specific Motion Recipes

**Card Hover (Reactive):**
```tsx
// Lift + border glow
hover:translate-y-[-2px] hover:border-[var(--card-accent)]/30 
transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
```

**Card Entrance (Transitional):**
```tsx
// BlurFade: stagger 50ms between cards
<BlurFade delay={index * 0.05} inView>
```

**Number Animation (Transitional):**
```tsx
// NumberTicker on first mount only
<NumberTicker value={value} />
```

**Status Dot (Ambient):**
```tsx
// Breathing animation — 2.4s cycle
animate-pulse -> custom: animation: breathe 2.4s ease-in-out infinite
```

**Current Block (Ambient):**
```tsx
// BorderBeam: 4s duration, rotates around current schedule block
<BorderBeam duration={4} size={40} />
```

---

## 7. PER-COMPONENT DESIGN SPECS

### 7.1 StatusBand (Top Bar)
**Purpose:** At-a-glance operational status. Like a jet cockpit HUD.

**Layout:** Horizontal flex, justify-between. Left: timer + app/website name. Center: productivity score. Right: streak + sleep + best day badges.

**Visual Treatment:**
- Background: `bg-[#131316]` (no gradient — the content is the focus)
- Border: `border border-[#27272a]` 
- Inner shadow: `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]` (top highlight)
- Padding: `px-5 py-3`
- Radius: `rounded-[10px]`

**Typography:**
- Timer: `text-2xl font-bold font-mono tabular-nums tracking-tighter` (DM Serif Display at 24px if hero mode)
- App name: `text-sm font-medium text-zinc-300`
- Score: `text-xl font-bold` (AuroraText if > 80, plain if lower)
- Badges: `text-[11px] font-semibold uppercase tracking-wider`

**Motion:**
- BorderBeam activates when productivity score > 70 (duration: 4s)
- Timer digits: NumberTicker on mount
- Badges: scale-[0.98] on hover

---

### 7.2 ScheduleHero (Main Element)
**Purpose:** Time awareness. The user's day at a glance.

**Layout:** Full-width card. Top: day/date header. Middle: horizontal timeline with blocks. Bottom: current/next block info.

**Visual Treatment:**
- Background: `bg-[#131316]` + DotPattern at 3% opacity
- Border: `border border-[#27272a]`
- Current block: `bg-[#fbbf24]/10 border-l-2 border-l-[#fbbf24]` (amber left border)
- Past blocks: `opacity-50` (ghosted)
- Future blocks: `opacity-80`
- Padding: `p-5`
- Radius: `rounded-xl` (12px — hero gets max)

**Typography:**
- Title: `text-[15px] font-semibold` (AnimatedGradientText: "Today's Schedule")
- Day/date: `text-sm font-medium text-zinc-400`
- Block times: `text-[11px] font-mono text-zinc-500`
- Block labels: `text-[13px] font-medium`

**Motion:**
- BorderBeam on current block (4s rotation)
- Blocks: stagger entrance 40ms each
- Hover on future block: `translate-x-1` (subtle slide)

---

### 7.3 InsightStrip (Horizontal Scroll)
**Purpose:** Intelligence feed. Bite-sized actionable insights.

**Layout:** Horizontal scrollable row. Each insight is a compact card (~200px wide).

**Visual Treatment:**
- Container: `bg-transparent` (no card — sits on page background)
- Cards: `bg-[#131316] border border-[#27272a] rounded-lg p-3`
- Active insight: `border-cyan-400/30`
- Padding: `p-3` (compact)
- Radius: `rounded-lg` (8px)

**Typography:**
- Insight text: `text-[12px] font-medium text-zinc-300` — this is DENSE content
- Category badge: `text-[10px] font-semibold uppercase`
- "AI Insights" label: `text-[11px] font-semibold text-cyan-400 uppercase tracking-wider`

**Motion:**
- Marquee if > 3 insights (auto-scroll, pause on hover)
- BlurFade stagger entrance
- Card hover: `translate-y-[-1px] border-cyan-400/20`

---

### 7.4 GoalsCard
**Purpose:** Achievement tracking. Visual progress toward objectives.

**Visual Treatment:**
- Background: `bg-[#131316]` + emerald radial gradient at 4% opacity
- Border: `border border-[#27272a]`
- Completed goals: `line-through text-zinc-600`
- Active goals: `text-zinc-200`
- Progress ring: AnimatedCircularProgressBar
- Padding: `p-5`
- Radius: `rounded-[10px]`

**Typography:**
- Title: `text-[15px] font-semibold` (AnimatedGradientText: "Goals")
- Goal text: `text-[13px] font-medium`
- Progress: `text-xl font-mono tabular-nums` (NumberTicker)
- "X of Y": `text-[12px] text-zinc-500`

**Motion:**
- Checkbox: scale-[0.9] on check + emerald flash
- Progress ring: AnimatedCircularProgressBar on mount
- Card entrance: BlurFade

---

### 7.5 DeadlinesCard
**Purpose:** Urgency awareness. What's coming due.

**Visual Treatment:**
- Background: `bg-[#131316]` + rose radial gradient at 5% opacity
- Border: `border border-[#27272a]`
- Overdue: `border-l-2 border-l-[#fb7185]` + rose text
- Due soon (< 3 days): `text-amber-400`
- Future: `text-zinc-400`
- Padding: `p-5`
- Radius: `rounded-[10px]`

**Typography:**
- Title: `text-[15px] font-semibold` (AnimatedGradientText: "Deadlines")
- Deadline name: `text-[13px] font-medium`
- Date: `text-[12px] font-mono tabular-nums`
- Days remaining: `text-xl font-bold` (NumberTicker for urgency)

**Motion:**
- BorderBeam on overdue items (fast: 2s)
- NumberTicker on days-remaining
- Urgent items: subtle pulse

---

### 7.6 FocusCard
**Purpose:** Deep work stats. How focused the user has been.

**Visual Treatment:**
- Background: `bg-[#131316]` + violet radial gradient at 4% opacity
- Border: `border border-[#27272a]`
- Stats: 2x2 grid of KPIs
- Padding: `p-5`
- Radius: `rounded-[10px]`

**Typography:**
- Title: `text-[15px] font-semibold` (AnimatedGradientText: "Focus")
- KPI labels: `text-[11px] font-medium text-zinc-500 uppercase tracking-wider`
- KPI values: `text-2xl font-mono tabular-nums font-bold`
- Sub-values: `text-[12px] text-zinc-400`

**Motion:**
- NumberTicker on all KPIs
- Card hover: border violet-400/20

---

### 7.7 TierBreakdownStrip
**Purpose:** Data density. The " Bloomberg terminal" feel.

**Visual Treatment:**
- Background: `bg-[#131316]` — NO gradient (data precision)
- Border: `border border-[#27272a]`
- Layout: 6-stat grid, no gaps between cells (dense)
- Dividers: `border-r border-[#27272a]` between cells
- Padding: `px-4 py-3` (compact)
- Radius: `rounded-lg` (8px — tight)

**Typography:**
- Labels: `text-[10px] font-semibold text-zinc-500 uppercase tracking-wider`
- Values: `text-lg font-mono tabular-nums font-bold`
- Trends: `text-[11px] font-medium` (green/red arrows)

**Colors per stat:**
- Productive: emerald-400
- Neutral: zinc-400
- Distracting: rose-400
- Total: white
- Score: pink-400 (if > 70) or zinc-400 (if low)
- Trend: emerald-400 (up) / rose-400 (down)

**Motion:**
- NumberTicker on all values
- No hover effects (this is read-only data)

---

### 7.8 SleepBarMini
**Purpose:** Health awareness. Weekly sleep pattern.

**Visual Treatment:**
- Background: `bg-[#131316]` + indigo radial gradient at 4% opacity
- Border: `border border-[#27272a]`
- Bars: indigo-500/60 fill, zinc-800/40 background
- Today indicator: `border-b-2 border-b-[#818cf8]`
- Padding: `p-5`
- Radius: `rounded-[10px]`

**Typography:**
- Title: `text-[15px] font-semibold` (AnimatedGradientText: "Sleep")
- Day labels: `text-[10px] font-medium text-zinc-500`
- Hours: `text-[11px] font-mono text-zinc-400`
- Average: `text-sm font-mono text-indigo-400`

**Motion:**
- Bars: height animation on mount (300ms, stagger 40ms per day)
- No continuous animation

---

### 7.9 MasteryRingMini
**Purpose:** Skill growth. Circular progress indicator.

**Visual Treatment:**
- Background: `bg-[#131316]` + cyan radial gradient at 4% opacity
- Border: `border border-[#27272a]`
- Ring: AnimatedCircularProgressBar with cyan stroke
- Center: percentage + label
- Padding: `p-5`
- Radius: `rounded-[10px]`

**Typography:**
- Title: `text-[15px] font-semibold` (AnimatedGradientText: "Mastery")
- Percentage: `text-3xl font-bold font-mono tabular-nums` (NumberTicker)
- Label: `text-[11px] font-medium text-zinc-500`

**Motion:**
- Ring: AnimatedCircularProgressBar (2s duration)
- Percentage: NumberTicker (synced with ring)

---

### 7.10 ActivityFeed
**Purpose:** Recent history. What's been happening.

**Visual Treatment:**
- Background: `bg-[#131316]` — NO gradient (list density)
- Border: `border border-[#27272a]`
- Items: `border-b border-[#27272a]` between rows
- Active session: left border `border-l-2 border-l-emerald-400` + pulsing dot
- Padding: `p-5`
- Radius: `rounded-[10px]`

**Typography:**
- Title: `text-[15px] font-semibold`
- App name: `text-[13px] font-medium`
- Duration: `text-[12px] font-mono tabular-nums text-zinc-500`
- "ago": `text-[11px] text-zinc-600`

**Motion:**
- Active session dot: `animate-pulse` (2.4s)
- New items: slide in from top (250ms)
- Hover: `bg-[#1a1a1e]`

---

### 7.11 AppEcosystem (OrbitSystem)
**Purpose:** Visual delight. The "wow" moment.

**Visual Treatment:**
- Full card: `bg-[#0a0a0c]` (darker than page to let orbit glow)
- Border: `border border-[#27272a]`
- Particles: Subtle floating dots at 5% opacity (background layer)
- Orbit: 3D solar system with app planets
- Padding: `p-5`
- Radius: `rounded-xl` (12px)

**Typography:**
- Title: `text-[15px] font-semibold` (plain — orbit IS the visual)
- Planet labels: `text-[10px] font-medium`

**Motion:**
- Particles: slow drift (20s cycle, linear)
- Orbit: continuous rotation (already implemented)
- Hover on planet: scale 1.1 + tooltip

---

## 8. ANTI-REPETITION RULES (Per Taste Skill)

### Card Variation Pattern
Cards must NOT all look identical. Alternate between:

1. **Gradient cards** (with thermal accent): StatusBand, ScheduleHero, Goals, Deadlines, Focus, Sleep, Mastery — each with DIFFERENT accent colors
2. **Clean cards** (no gradient): TierBreakdown, ActivityFeed — pure data density
3. **Dark cards** (darker background): AppEcosystem — lets the 3D content pop

### Header Variation Pattern
Alternate section header styles:

1. **AnimatedGradientText**: ScheduleHero, Goals, Deadlines, Focus, Sleep, Mastery
2. **Plain + icon**: ActivityFeed, TierBreakdown (data doesn't need decoration)
3. **No header**: StatusBand (content IS the header), InsightStrip (horizontal label)

### Radius Variation Pattern
- `rounded-lg` (8px): TierBreakdown, InsightStrip cards, badges
- `rounded-[10px]`: Most cards (StatusBand, Goals, Deadlines, Focus, Sleep, Mastery, ActivityFeed)
- `rounded-xl` (12px): Hero cards (ScheduleHero, AppEcosystem)

### Spacing Variation Pattern
- `p-3`: InsightStrip items (compact)
- `p-4`: TierBreakdown (dense)
- `p-5`: Most cards (standard)

---

## 9. ANTI-SLOP CHECKLIST (Before Implementation)

- [x] **Type**: Geist primary + DM Serif Display hero + JetBrains Mono data. No third font.
- [x] **Color**: Thermal metaphor — NOT pink on every card. Max 3 accent colors per view.
- [x] **Geometry**: Radius varies (8px, 10px, 12px). Padding varies (12px, 16px, 20px).
- [x] **Hero**: No tiny uppercase eyebrow + oversized headline cliché.
- [x] **Sections**: No repeated tracked-uppercase kicker above every card.
- [x] **Motion**: L2 Responsive. Reactive + ONE ambient per card max.
- [x] **Imagery**: No filler glow blobs. Gradients are 3-6% opacity, purpose-matched.
- [x] **Empty/loading/error**: Skeleton for all data components. Styled with zinc-800.
- [x] **Icons**: Lucide only. No emoji.
- [x] **Accessibility**: Focus rings use `--page-accent`. Reduced motion respected.

---

## 10. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Load fonts, update CSS)
1. Add Geist and JetBrains Mono font packages to index.html
2. Update index.css with font-face declarations
3. Create `.font-geist`, `.font-display`, `.font-data` utility classes

### Phase 2: Card Shells (Update all card backgrounds/borders)
1. Update all card components with new thermal gradients
2. Apply border radius variation
3. Add inner shadow (`shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]`)

### Phase 3: Typography (Update all text elements)
1. Apply font-family changes (Geist for UI, DM Serif for hero numbers, JetBrains Mono for data)
2. Apply typography scale (size, weight, line-height, tracking)
3. Apply color temperature (warm for primary, cool for secondary)

### Phase 4: Components (Deploy MCP components strategically)
1. StatusBand: BorderBeam + NumberTicker
2. ScheduleHero: DotPattern + BorderBeam + AnimatedGradientText
3. InsightStrip: Marquee + BlurFade
4. GoalsCard: AnimatedCircularProgress + NumberTicker
5. DeadlinesCard: BorderBeam + NumberTicker
6. FocusCard: NumberTicker + AnimatedGradientText
7. TierBreakdown: NumberTicker (all stats)
8. SleepBar: Height animation
9. MasteryRing: AnimatedCircularProgress + NumberTicker
10. ActivityFeed: Skeleton + pulse dot
11. AppEcosystem: Particles

### Phase 5: Motion (Add micro-interactions)
1. Card hover lifts (translate-y + border glow)
2. Entrance animations (BlurFade stagger)
3. NumberTicker on all KPIs
4. Breathing status dots
5. Reduced motion fallbacks

### Phase 6: Polish (Final review)
1. Run anti-slop checklist
2. Verify no pure black backgrounds
3. Verify no more than 3 accent colors per view
4. Verify no `transition: all`
5. Verify no `rounded-2xl` or `rounded-3xl`
6. Verify no `box-shadow` for elevation

---

## 11. FONT LOADING INSTRUCTIONS

Add to `index.html` (replace existing Google Fonts link):
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Add to `src/index.css`:
```css
@layer base {
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-feature-settings: "ss01", "ss02", "cv01";
  }
  
  .font-display {
    font-family: 'DM Serif Display', Georgia, serif;
    font-weight: 400;
  }
  
  .font-data {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-variant-numeric: tabular-nums;
  }
}
```

**Note:** Inter is kept as fallback and for compatibility. Geist is preferred but requires npm install. For immediate implementation, use Inter (already loaded) with tight tracking to approximate Geist's feel. Future: `npm install @fontsource-variable/geist`.

---

## 12. DESIGN TOKENS SUMMARY

```css
/* Base */
--df-base: #0a0a0c;
--df-surface: #131316;
--df-elevated: #1a1a1e;
--df-border: #27272a;
--df-border-active: #3f3f46;

/* Text */
--df-text-primary: #fafafa;
--df-text-secondary: #a1a1aa;
--df-text-muted: #71717a;
--df-text-faint: #52525b;

/* Thermal Accents */
--df-accent-pink: #f472b6;
--df-accent-cyan: #22d3ee;
--df-accent-amber: #fbbf24;
--df-accent-emerald: #34d399;
--df-accent-rose: #fb7185;
--df-accent-violet: #a78bfa;
--df-accent-indigo: #818cf8;

/* Radius */
--df-radius-sm: 6px;
--df-radius-md: 8px;
--df-radius-lg: 10px;
--df-radius-xl: 12px;

/* Motion */
--df-dur-fast: 150ms;
--df-dur-normal: 250ms;
--df-dur-slow: 400ms;
--df-ease: cubic-bezier(0.16, 1, 0.3, 1);

/* Spacing */
--df-space-xs: 4px;
--df-space-sm: 8px;
--df-space-md: 12px;
--df-space-lg: 16px;
--df-space-xl: 20px;
--df-space-2xl: 24px;
```

---

**End of Specification**

This document is the single source of truth. Every design decision must trace back to this spec. No improvisation. No "I think this looks better." The spec is the law.
