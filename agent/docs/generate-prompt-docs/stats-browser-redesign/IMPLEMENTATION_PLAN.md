# StatsPage + BrowserActivityPage — IMPLEMENTATION PLAN

> **Strategy:** Additive visual overhaul only. Zero features removed, zero data processing changed, zero prop interfaces modified. All changes wrap/embellish existing elements with motion, glass depth, spacing, color hierarchy, and micro-interactions.

---

## Phase 1: StatsPage — Section-by-Section

---

### 1.1 Header (lines 731–754)

**Before:** Simple flex row, title "Applications" + subtitle on left, Time Lock toggle + viewLabel on right.
**After:** Title area gets a subtle indigo gradient accent stripe under the heading. Time Lock toggle becomes a glass pill with animated lock/unlock icon transition. Background gets a subtle Magic UI "beam" effect.

| Property | Value |
|----------|-------|
| Title accent | `h-0.5 w-16 bg-gradient-to-r from-indigo-500 to-transparent rounded-full` below `<p>` |
| Time Lock pill | `bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50`, active: `border-amber-500/30 bg-amber-500/10` |
| Entrance | `<motion.h1>` initial `{opacity:0, y:-10}`, animate `{opacity:1, y:0}`, transition `0.3s ease-out` |
| MCP sourcing | Magic UI `beam` effect for subtle background glow |
| Additive code | Wrap title + subtitle in `motion.div` stagger group. Add accent div. Style Time Lock with new classes. |

**Empty/Loading/Error:** Not applicable (header is always visible).

---

### 1.2 Live Tracking Indicator (lines 757–773)

**Before:** GlassCard, flex row, CSS `animate-pulse` green dot, app name, timer value, category.
**After:** Card gets animated gradient border (Magic UI). Timer uses react-bits `NumberTicker` for count-up effect. Pulse dot is framer-motion `animate` with spring easing. Add a tiny inline bar that pulses to show "active now" rhythm.

| Property | Value |
|----------|-------|
| Border glow | `bg-gradient-to-r from-emerald-500/20 via-transparent to-emerald-500/10` pseudo-element |
| Pulse dot | framer-motion: `animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}` duration 1.5s repeat Infinity |
| Timer | Use `motion.div` keyed on `liveElapsed` to crossfade each second's value, or React Bits `NumberTicker` |
| Entrance | `motion.div` from `{opacity:0, height:0}` to `{opacity:1, height:'auto'}` when liveCurrentApp appears |
| Empty state | Not rendered when `!liveCurrentApp` — no change |
| MCP sourcing | Magic UI `animated-gradient-border`, React Bits `NumberTicker` |
| Additive code | Replace `animate-pulse` with `motion.div`. Wrap timer in motion component. Add gradient border wrapper div. |

---

### 1.3 Live Detection Panel (lines 776–808)

**Before:** GlassCard, "Live Detection" header, terminal-style `bg-zinc-950` log area, hardcoded INFO level, app name + category.
**After:** Add log level filter tabs (ALL/INFO currently). Add search input. Animate new log entries via `AnimatePresence`. Add "clear" button. Better terminal aesthetic with line numbers and dim header.

| Property | Value |
|----------|-------|
| Level filter tabs | 3 pill buttons below header: ALL (default), INFO, WARN — only ALL and INFO are populated currently |
| Search | `<input>` with `search` icon, filters logs by app name text |
| Log animation | `<motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}}>` per log line |
| Clear button | "Clear" text button, calls `setLiveLogs([])` |
| Terminal area | Keep `bg-zinc-950 border border-zinc-800/50`, add `font-mono text-xs` |
| Empty state | "Waiting for app activity..." — add a subtle pulsing cursor icon |
| Event count | Already shown — add animation when count changes |
| MCP sourcing | shadcn `input` for search, Lucide `Search` icon |
| Additive code | Add `filterLevel` state + `searchQuery` state. Wrap log list in `AnimatePresence`. Add filter UI above terminal div. |

---

### 1.4 App Time Distribution Pie (lines 812–834)

**Before:** GlassCard `md:w-2/5`, title + "Total Time" display, Pie chart or empty state.
**After:** Add glass div background behind chart canvas. Restyle the "Total Time" display as a floating badge. Gradient pie segments. Better empty state.

| Property | Value |
|----------|-------|
| Chart container | `<div className="bg-zinc-900/20 rounded-xl p-4">` wrapping the `<Pie>` |
| Total time badge | Floating over the chart: `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900/80 backdrop-blur px-3 py-1 rounded-xl text-xs` |
| Chart legend | Keep `position:'bottom'`, improve label style with `usePointStyle:true`, increase `padding:20` |
| Empty state | Better illustration: `Globe` icon as placeholder, "No data available yet — start using apps to see distribution" |
| Entrance | `<motion.div>` with staggered child animations |
| MCP sourcing | shadcn `badge` for the floating total time |
| Additive code | Add glass wrapper div around Pie. Add floating badge. Update empty text. Wrap in motion.div. |

**NOTE:** Pie chart does NOT use `useMemo` for its options in the current code — `pieChartOptions` IS memoized (line 692), but the `pieData` is also memoized (line 166). Both preserved.

---

### 1.5 Top Applications List (lines 836–867)

**Before:** GlassCard, 6 items, icon colored background + category color, name, category, time, percentage.
**After:** Add animated progress bars behind each row. Stagger entrance. Better icon containers (glass circles). Show a mini-percentage bar that animates to the correct width.

| Property | Value |
|----------|-------|
| Progress bar | `<motion.div initial={{width:0}} animate={{width:`${pct}%`}}>` thin bar at bottom of each row |
| Stagger | `motion.div` per row with `transition={{delay: index * 0.03}}` |
| Icon container | `w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-800/50` |
| Hover | Row gets `hover:bg-zinc-800/30` background tint |
| Empty state | Already exists: "No applications tracked yet" — add subtle icon |
| MCP sourcing | shadcn `progress` for bar, react-bits `fade-in-stagger` |
| Additive code | Add progress bar `motion.div` to each row. Wrap rows in stagger motion. Update empty state. |

---

### 1.6 Summary Cards (lines 870–888)

**Before:** 4-col grid, `motion.div` entrance animation, icon + value + label per card. "LIVE" badge.
**After:** Count-up animation on values. Gradient icons. Better hover depth. Animated "LIVE" badge with pulsing dot.

| Property | Value |
|----------|-------|
| Count-up | `useEffect` + `useState` to count from 0 to value on mount (or react-bits `NumberTicker`) |
| Icon container | `w-8 h-8 rounded-xl bg-zinc-900/50 flex items-center justify-center` with glass border |
| "LIVE" badge | `<span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE</span>` |
| Hover | Card gets `hover:border-zinc-600/50 hover:bg-zinc-900/40` transition |
| Empty state | Cards always show 0/empty values when no data — add "No data" overlay? No, the values being 0 is sufficient. |
| MCP sourcing | React Bits `NumberTicker`, shadcn `card` |
| Additive code | Replace plain `<div>` values with `MotionNumber` component. Update icon containers. Restyle LIVE badge. |

---

### 1.7 Hourly Chart (lines 890–948)

**Before:** GlassCard, title + subtitle, bar/line toggle, chart area h-56.
**After:** Glass background behind chart canvas. Gradient fills. Animated toggle button transitions. Chart.js animation config.

| Property | Value |
|----------|-------|
| Chart container | `<div className="bg-zinc-900/20 rounded-xl p-4">` wrapping `<Bar>`/`<Line>` |
| Gradient fill | Add `backgroundColor: { type: 'gradient' }` via chart.js `Filler` plugin, or use CSS gradient via canvas |
| Toggle buttons | Pill group: `bg-zinc-800/50 p-0.5 rounded-lg gap-0` — active button gets `bg-zinc-700/50` |
| Chart animation | Add to all chart options: `animation: { duration: 400, easing: 'easeInOutQuart' }` |
| Current-hour highlight | Already exists via color logic — preserved |
| Tooltip | Already styled — add `cornerRadius: 8` for consistency |
| Empty state | Chart renders with no data if dailyUsage is empty — show "No usage data for this period" overlay |
| MCP sourcing | Magic UI `gradient` for chart fill effect |
| Additive code | Add glass wrapper around chart. Add animation config to `dailyChartOptions`, `hourlyChartOptions`, `hourlyLineChartOptions`. Update toggle pill styling. |

---

### 1.8 Category Breakdown (lines 951–976)

**Before:** GlassCard, grid of category cards with color dot, name, time, percentage, progress bar.
**After:** Animated progress bar widths. Left color border accent. Stagger entrance. Better hover elevation.

| Property | Value |
|----------|-------|
| Card accent | Replace color dot with `border-l-4` accent on the card left side |
| Progress bar | `<motion.div initial={{width:0}} animate={{width:`${pct}%`}}>` with spring easing |
| Stagger | Grid wrapper `<motion.div>` with staggered children |
| Hover | `hover:bg-zinc-800/40 hover:border-zinc-700/50` |
| Empty state | If `categoryBreakdown` is empty: "No categories detected yet" with icon |
| MCP sourcing | React Bits `fade-stagger-grid` |
| Additive code | Replace `bg-zinc-900/50` + border classes. Add accent border style per category color. Wrap progress bar width in `motion.div`. Add stagger motion to grid. |

---

### 1.9 Application Statistics Grid (lines 979–1046)

**Before:** GlassCard, 2/3-col grid, motion.div cards with hover lift, stats per app.
**After:** Progress bar per card (usage relative to max). Better hover (lift + glow + scale). Stagger entrance. Count-up on stat values.

| Property | Value |
|----------|-------|
| Relative bar | Add mini progress bar at bottom of card: width = `(stat.total_ms / maxTotalMs) * 100` |
| Hover | Combine `whileHover={{ y: -4 }}` with box-shadow-like border: `hover:border-indigo-500/30` |
| Stagger | `<motion.div>` grid with staggered children (idx * 0.02) |
| Chevron | Already rotates on select — preserve |
| Selected state | `bg-zinc-800/80 border-indigo-500/50` — add subtle glow effect with `boxShadow: '0 0 20px rgba(99,102,241,0.1)'` |
| Empty state | Already has icon + text "No statistics available yet" — add Unsplash-sourced dark background texture |
| MCP sourcing | shadcn `card-hover-effect`, Unsplash for empty state background |
| Additive code | Add progress bar div to each card. Enhance hover/selected styles. Add stagger config to grid container. |

---

### 1.10 App Detail Modal (lines 1048–1428)

**Before:** Full-screen overlay, animated entrance/exit, GlassCard variant="elevated", scrollable, metrics + period selector + charts + info + productivity + sessions.
**After:** Sticky header glass effect. Count-up on metrics. Gradient chart fills. Better session edit UX (inline becomes popover). Section dividers.

| Property | Value |
|----------|-------|
| Sticky header | `<div className="sticky top-0 bg-zinc-900/80 backdrop-blur-xl z-10 pb-4">` wrapping the header row |
| Entrance | Spring easing: `type: "spring", stiffness: 300, damping: 30` |
| Metrics grid | Same count-up as summary cards. Add glass background. |
| Period selector | Keep existing, restyle pills with better active state (indigo-500/20 bg) |
| Daily chart | Add glass container, gradient fill matching category color |
| Hourly chart | Same treatment |
| First/Last seen | Change to side-by-side cards with glass styling and calendar icon |
| Productivity score | Add animated score bar with gradient glow, better text description |
| Sessions list | Replace datetime-local with popover calendar. Better row styling with time range visualization. Save/Cancel buttons in glass bar. |
| Empty sessions | "No sessions for this period" with icon |
| MCP sourcing | shadcn `dialog`, `popover`, `calendar`, React Bits `count-up`, 21st.dev `session-list` |
| Additive code | Add `position: sticky` to modal header. Wrap metric values in `MotionNumber`. Add glass containers behind charts. Add popover calendar components. Add section dividers. |

---

## Phase 2: BrowserActivityPage — Section-by-Section

---

### 2.1 Header + Tracking Browser Config (lines 690–755)

**Before:** Title with Globe icon, browser config GlassCard inline in header, period label, Refresh button.
**After:** Header gets staggered entrance. Browser config becomes a cleaner `<select>` with glass styling. Period label improved. Refresh button gets spinning animation while loading.

| Property | Value |
|----------|-------|
| Title | `<motion.h1>` with stagger entrance, Globe icon gets subtle animated glow |
| Browser select | Replace native `<select>` with shadcn `select` component, same options, re-skinned |
| Period label | Adds chevron navigation buttons? No — period is controlled by parent. Just style the label better. |
| Refresh button | Add `animate-spin` class to RefreshCw icon while fetching |
| Browser config GlassCard | Keep but reduce padding to `p-3`, remove border in favor of subtle background |
| Empty state | "No browsers found" option — add tooltip explaining to open settings |
| MCP sourcing | shadcn `select`, `tooltip`, Lucide `RotateCw` for refresh |
| Additive code | Wrap header in `motion.div` stagger. Replace select with shadcn component. Add spin animation to refresh. |

---

### 2.2 Summary Cards (lines 758–784)

**Before:** 3-col grid, GlassCards WITHOUT framer-motion, Clock/Globe/TrendingUp icons, text values.
**After:** ADD framer-motion entrance animation. Count-up on values. Gradient icons. Hover depth.

| Property | Value |
|----------|-------|
| Entrance | `<motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: idx * 0.08}}>` per card |
| Count-up | Same MotionNumber wrapper as StatsPage summary cards |
| Icon container | `w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center` |
| Hover | Card gets `whileHover={{ y: -2 }}` and border transition |
| Empty state | Cards show 0 / N/A when no data — sufficient as-is |
| MCP sourcing | React Bits `NumberTicker`, framer-motion (already used) |
| Additive code | Wrap each card in `motion.div` entrance. Add `MotionNumber` component. Add icon container divs. |

---

### 2.3 Live Detection Panel (lines 787–823)

**Before:** GlassCard, SectionHeader with Save button, terminal-style logs with level coloring.
**After:** Same polish as StatsPage panel: filter tabs, search, AnimatePresence, clear button. Wire the unused Play/Pause icons as a live-mode toggle.

| Property | Value |
|----------|-------|
| Level filter | ALL / INFO / WARN / ERROR tabs (all 4 levels already exist in data) |
| Search | Text input filtering logs by domain/title |
| Play/Pause toggle | Wire `isLiveMode` to a toggle button using the imported Play/Pause icons |
| Clear button | Same as StatsPage |
| Log animation | `<motion.div>` per log entry |
| Save button | Keep existing, restyle with glass effect |
| Empty state | "Live detection paused" — update to show a small illustration when paused, different text when no events |
| MCP sourcing | shadcn `input`, `tabs`, Lucide `Search`, `Play`, `Pause` |
| Additive code | Add filter/search state. Wire isLiveMode toggle with Play/Pause icons. Add AnimatePresence. Add clear button. |

---

### 2.4 Hourly Activity Chart (lines 826–845)

**Before:** GlassCard, SectionHeader with toggle, chart area h-56.
**After:** Same chart polish as StatsPage: glass container, gradient fills, animation config.

| Property | Value |
|----------|-------|
| Chart container | `<div className="bg-zinc-900/20 rounded-xl p-4">` around chart |
| Data memoization | **ISSUE:** `hourlyChartData` and `hourlyLineChartData` and `hourlyChartOptions` are module-level, NOT `useMemo`-wrapped (lines 503-558). This will cause re-renders. Wrap them. |
| Animation | Add `animation: { duration: 400, easing: 'easeInOutQuart' }` to options |
| Toggle pills | Same restyle as StatsPage toggle |
| Empty state | Chart shows empty data if no logs — overlay "No browsing data for this period" |
| MCP sourcing | (same as StatsPage) |
| Additive code | **CRITICAL:** Wrap `hourlyChartData`, `hourlyLineChartData`, `hourlyChartOptions` in `useMemo`. Add glass wrapper. Add animation config. |

---

### 2.5 Time by Category Pie (lines 848–855)

**Before:** GlassCard, custom legend via `generateLabels`, duration display.
**After:** Glass container. Better custom legend with colored dots and duration. Hover animation on segments.

| Property | Value |
|----------|-------|
| Chart container | Glass div wrapper |
| Legend | Already custom via `generateLabels` — improve: add margin between items, better font sizing, show percentage in addition to duration |
| Empty state | Only rendered when `categoryStats.length > 0` (line 848) — this IS the empty state guard |
| Entrance | Fade-in animation |
| MCP sourcing | (same as StatsPage pie) |
| Additive code | Add glass wrapper. Improve `generateLabels` format string. Add entrance motion. |

---

### 2.6 Top Domains Bar (lines 857–864)

**Before:** GlassCard, horizontal bar chart (actually vertical — fix description), top 10 domains.
**After:** Change to TRUE horizontal bar (`indexAxis: 'y'`) for better domain name readability. Color bars by category. Glass wrapper.

| Property | Value |
|----------|-------|
| **CORRECTION** | Current chart is VERTICAL bars. Change to horizontal with `indexAxis: 'y'` |
| Bar colors | Already category-sourced. Add gradient effect via chart.js. |
| Label truncation | Domain names in horizontal layout read better. Add `maxTicksLimit: 10` and truncation. |
| Chart container | Glass wrapper |
| Empty state | Only rendered when `categoryStats.length > 0` — same outer guard |
| MCP sourcing | (same chart.js) |
| Additive code | Add `indexAxis: 'y'` to `domainBarOptions`. Wrap in glass div. Update `maxTicksLimit`. |

---

### 2.7 Recent Activity Accordion (lines 867–940)

**Before:** GlassCard, top 6 aggregated domains, conditional expand (raw if/else), flat session list.
**After:** AnimatePresence for accordion transitions. Better domain row styling. Session rows with favicon/domain icon. "View all" link.

| Property | Value |
|----------|-------|
| Accordion animation | Wrap expanded content in `<AnimatePresence>` + `<motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}}>` |
| Domain row | Add colored left border accent matching category color. Hover background. |
| Session rows | Show favicon or Globe icon per session. Better truncation for long URLs. |
| "View all" | Link at bottom of expanded section if > 5 sessions |
| Empty state | Already exists: "No recent browsing activity" — add icon |
| Entrance | Stagger entrance for all 6 domain rows |
| MCP sourcing | Magic UI `accordion`, shadcn `collapsible` |
| Additive code | Wrap expandable content in framer-motion animation. Add category accent border. Add "view all" logic. Add stagger entrance. |

---

### 2.8 Domain Breakdown Grid (lines 942–991)

**Before:** GlassCard, 2/3-col grid, cards with category badge + total time + sessions.
**After:** Same card polish as app stats grid. WIRE inline category editing. Progress bar.

| Property | Value |
|----------|-------|
| Progress bar | Relative usage bar at bottom of each card |
| Hover | `whileHover={{ y: -3 }}` + border transition |
| Stagger | Grid stagger entrance |
| **Category editing** | Clicking the category badge opens an inline dropdown (`select` or shadcn `select`) populated with CATEGORIES list, calls `handleCategoryChange` on select |
| Empty state | Already exists with icon + text — improve illustration with Unsplash image? |
| Selected state for modal | Currently opens modal. Keep, but add a visual "selected" state. |
| MCP sourcing | shadcn `select` for category editing, shadcn `badge` for category display |
| Additive code | Add progress bar div. Add stagger. **NEW:** Wire `onClick` on category badge to show inline dropdown instead of `editingDomain` state being unused. |

---

### 2.9 Domain Detail Modal (lines 993–1123)

**Before:** Full-screen overlay, metrics + period selector + daily chart. NO session list (unlike app modal).
**After:** Same modal structure as app modal. Add session list. Sticky header. Count-up metrics. Gradient chart.

| Property | Value |
|----------|-------|
| Sticky header | Same as app modal |
| Metrics | Count-up animation |
| Chart | Glass wrapper, gradient fill |
| **Session list** | **NEW:** Add sessions list below chart (similar to app modal's session list). Filter `allLogs` for this domain. Show timestamp + title + duration + edit/delete. |
| Period selector | Same as app modal — preserved |
| Empty chart | "No data for this period" overlay |
| MCP sourcing | Same as app modal |
| Additive code | Add sticky header. Add MotionNumber. Add glass wrapper. **NEW:** Add session list section with inline edit pattern. |

---

## Phase 3: Shared Improvements

---

### 3.1 Chart.js Animation Config (apply to ALL chart options on BOTH pages)

Add to every `options` object:

```js
animation: {
  duration: 400,
  easing: 'easeInOutQuart',
},
transitions: {
  active: {
    animation: {
      duration: 200,
    }
  }
},
```

This affects: `dailyChartOptions`, `hourlyChartOptions`, `hourlyLineChartOptions`, `pieChartOptions` on StatsPage, and `hourlyChartOptions`, `domainBarOptions`, `categoryPieOptions` on BrowserActivityPage, plus all inline options in both detail modals.

---

### 3.2 Glass Chart Backgrounds

All charts on both pages get a glass container div:

```tsx
<div className="bg-zinc-900/20 rounded-xl p-4 border border-zinc-800/30">
  <Pie data={pieData} options={pieChartOptions} />
</div>
```

Affected locations: StatsPage lines 827, 933, and both detail modals lines 1160, 1210. BrowserActivityPage lines 843, 853, 860, and detail modal line 1078.

---

### 3.3 MotionNumber Component (new reusable component)

Create `src/components/MotionNumber.tsx`:

```tsx
// Animated number that counts from 0 to target on mount and when target changes
interface MotionNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (v: number) => string;
}
```

Used in: Summary cards (both pages), metrics grid (both modals).

---

### 3.4 Empty State Enhancement Pattern

Every data section's empty state must follow this pattern:
- Lucide icon (default size w-10 h-10)
- Title text (text-zinc-400 font-medium)
- Body text (text-zinc-500 text-sm)
- Optional: action button

Affected sections:
- Live Detection (both): update plain text
- Pie chart (StatsPage): update plain text
- Top Apps (StatsPage): already has icon
- App grid (StatsPage): already has icon
- Session list (both modals): update plain text
- Recent Activity (Browser): update plain text
- Domain grid (Browser): already has icon

---

### 3.5 Micro-interaction Reference

| Element | Hover | Active | Transition |
|---------|-------|--------|------------|
| GlassCard (interactive) | `y: -2`, `border-zinc-600/50` | `scale: 0.98` | 150ms ease-out |
| Button (pill) | `bg-zinc-700/50` | `scale: 0.96` | 100ms ease-out |
| Period pill (selected) | — | — | bg + border transition 150ms |
| Chevron button | `bg-zinc-700/50`, `text-zinc-200` | `scale: 0.95` | 100ms |
| Chart hover | crosshair cursor | — | tooltip 150ms |
| Modal overlay | — | — | backdrop blur fade 200ms |
| Accordion row | `bg-zinc-800/40` | — | height animation 200ms spring |

---

### 3.6 Modal Improvements (both pages, identical treatment)

| Improvement | Implementation |
|-------------|----------------|
| Sticky header | `<div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50 pb-4 mb-4">` wrapping header row |
| Entrance easing | `type: "spring", stiffness: 300, damping: 30` |
| Section dividers | `<div className="h-px bg-gradient-to-r from-zinc-800/0 via-zinc-800/50 to-zinc-800/0 my-6">` |
| Metrics count-up | Use `<MotionNumber>` for numeric values |
| Chart containers | Glass wrapper with category color accent border |
| Scroll behavior | `overscroll-contain` on modal body, smooth scroll on overflow |

---

## Phase 4: MCP Sourcing Summary

| MCP Server | Components/Effects to Source |
|------------|------------------------------|
| **shadcn** | `select` (browser selector + category editor), `badge` (category pills), `input` (search fields), `popover` + `calendar` (session edit), `progress` (usage bars), `card` (base pattern), `tabs` (filter tabs), `collapsible` (accordion), `dialog` (modal base), `tooltip` (info tooltips) |
| **Magic UI** | `beam` (header background effect), `animated-gradient-border` (live tracking card), `gradient` (chart fill), `accordion` (recent activity) |
| **Lucide** | `Search` (filter inputs), `RotateCw` (refresh), `Calendar` (date fields), `Filter` (filter icon), `List` (session list icon), `FileDown` (save logs) |
| **21st.dev Magic** | Custom modal layout (detail modals), session list card component |
| **React Bits** | `NumberTicker` (summary metrics), `FadeInStagger` (grid entrances), `FadeStaggerGrid` (category grid), `AnimatedTooltip` (hover info), `Particles` (background effect) |
| **Iconify** | Search for superior replacements if needed — but prefer lucide-react for build reliability |
| **Unsplash** | Dark atmospheric placeholder images for empty states (search: "dark workspace", "abstract dark texture") |

---

## Phase 5: Build Order (Execution Sequence)

1. Create `MotionNumber` component
2. StatsPage: Header polish + Time Lock glass pill
3. StatsPage: Live Tracking card gradient border + motion pulse
4. StatsPage: Live Detection panel filters + animation
5. StatsPage: Pie chart glass wrapper + floating badge + empty state
6. StatsPage: Top Apps progress bars + stagger
7. StatsPage: Summary cards count-up + icons
8. StatsPage: Hourly chart glass wrapper + animation config
9. StatsPage: Category breakdown animated bars + border accent
10. StatsPage: App grid progress bars + stagger + enhanced hover
11. StatsPage: App Detail Modal sticky header + count-up + session list popover
12. BrowserActivityPage: Header stagger + shadcn select + refresh animation
13. BrowserActivityPage: Summary cards framer-motion entrance + count-up
14. BrowserActivityPage: Live Detection filters + Play/Pause wire + animation
15. BrowserActivityPage: Hourly chart data `useMemo`-wrap + glass + animation
16. BrowserActivityPage: Pie chart legend improvement
17. BrowserActivityPage: Top Domains bar `indexAxis: 'y'` + glass
18. BrowserActivityPage: Recent Activity accordion animation + styling
19. BrowserActivityPage: Domain grid stagger + category editing wire + progress bar
20. BrowserActivityPage: Domain Detail Modal sticky header + session list
21. Verify: build, lint, typecheck
22. Verify: window.deskflowAPI probes for all IPC endpoints
23. Verify: visual check in running Electron app

---

## Anti-Slop Checklist (from frontend-external-infra)

| # | Check | How to Pass |
|---|-------|-------------|
| 1 | No default Tailwind fonts visible | Ensure every `<body>` element uses Geist/Inter, monospace is JetBrains Mono |
| 2 | No generic purple gradients | All new gradients use DeskFlow accent colors (indigo, emerald, amber, etc.) |
| 3 | No same-radius-everything | `rounded-xl` max — use `rounded-lg` for small items, `rounded-full` for pills |
| 4 | No hero clichés | No full-page hero sections — all improvements are within existing layout |
| 5 | No missing section labels | Every GlassCard has a clear title/header |
| 6 | No motion without purpose | Every animation serves hierarchy or feedback — no decorative-only motion |
| 7 | No AI-generated generic imagery | Unsplash images only for empty states, never for backgrounds |
| 8 | No empty states without guidance | Every empty state has icon + message + optional action |
| 9 | No generic icons | Use specific Lucide icons (e.g., `Monitor` not `Box`, `Globe` not `Circle`) |
| 10 | No inaccessible contrast | All text meets WCAG AA 4.5:1 minimum |
