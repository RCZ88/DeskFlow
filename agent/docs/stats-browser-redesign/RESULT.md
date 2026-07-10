# StatsPage + BrowserActivityPage Redesign — RESULT

> Definitive, single-solution visual overhaul. Additive to the visual layer only.
> No data logic, IPC, props, or imports change. Every existing feature is preserved.
> Skill intent (frontend-design, humancentred-UIUX, impeccable, ui-ux-pro-max, design-taste,
> taste-skill, motion-alive, frontend-external-infra) is encoded directly into each spec.
> MCP components are named per section for the implementing agent to fetch + re-skin.

---

## Changelog — synced to updated CONTEXT_BUNDLE (v2)

Corrections/clarifications from the revised bundle, folded into the sections below:

- **Top Applications (Stats §5):** current rows use a *generic `Monitor` glyph on a category-colored background badge*, not per-app icons — per-brand Iconify icons are now framed as an explicit **optional** add-on, not the baseline.
- **Top Domains (Browser §5):** chart is a **vertical** bar (top 10, color-coded by category), not horizontal — removed `indexAxis:'y'`; bars carry per-category gradient fills.
- **Domain category editing (Browser §7):** `handleCategoryChange` / `startEditCategory` + the `setDomainCategory` IPC exist, but the inline dropdown UI is **not currently rendered** — rendering it is now framed as an *additive wire-up of existing logic*, not a restyle.
- **Browser Summary Cards (§2):** currently **not** framer-motion animated (unlike Stats) — entrance/count-up/hover are additive, reduced-motion-guarded upgrades.
- **Browser Live panel (§3):** `isLiveMode` state + imported `Play`/`Pause` icons exist but no toggle is rendered — added an *optional* play/pause control that surfaces the existing state.
- **Preserve on both pages:** `data-tutorial` anchors (`stats.period|charts|list`, `browser.selector|toggle|domains`), Stats focus-mode filter (`timeMode==='focus'` → productive tier only), `liveActivityLogs` **prop** sync (Stats live logs are prop-driven, not IPC), Browser page-visibility set/unset, and the existing full-page `LoadingState` + `AlertCircle` error/retry fallbacks.
- **Chart-instance cleanup:** Stats tracks chart refs for cleanup; Browser does **not** — preserve this difference.

---

## Overview

The two pages already carry the right *information density* (taste-skill VISUAL_DENSITY=7) — the problem is that everything sits on one flat glass plane with uniform weight, so the eye has no path. This redesign introduces a **3-tier glass depth system**, a **per-page accent identity** (Applications = indigo `#6366f1`, Browser = blue `#3b82f6`), **mono-vs-sans typographic discipline** for data, a **budgeted motion layer** (motion-alive Level 2 — Responsive: reactive + transitional + restrained ambient, no narrative loops), and **chart.js styling upgrades** (canvas gradient fills, a glass-backdrop plugin, a pie center-total plugin, restyled tooltips). Every section gets a real empty / loading / error state. Nothing is removed; all changes extend existing markup, `className`s, and the already-`useMemo`-wrapped chart `data`/`options` *styling* fields — never the computed numeric arrays, labels, IPC calls, or state.

### Global design tokens introduced (within the zinc + accent palette)

```
/* Glass depth tiers (depth via opacity + blur + border, never box-shadow) */
--glass-0  page bg            #0a0a0a                                  (zinc-950)
--glass-1  ambient panel      bg-zinc-900/20  backdrop-blur-md   border-zinc-800/40
--glass-2  standard card      bg-zinc-900/30  backdrop-blur-xl   border-zinc-800/50   (current default)
--glass-3  elevated / modal   bg-zinc-900/50  backdrop-blur-2xl  border-zinc-700/50

/* Per-page accent */
Applications  accent  #6366f1  (indigo-500)   accent-soft  rgba(99,102,241,0.14)   accent-line rgba(99,102,241,0.40)
Browser       accent  #3b82f6  (blue-500)     accent-soft  rgba(59,130,246,0.14)    accent-line rgba(59,130,246,0.40)

/* Shared state colors */
positive/live  #10b981 (emerald-500)   warn/error #f59e0b (amber-500)   destructive #ef4444 (red-500)
hairline       rgba(255,255,255,0.06)  (inner separators)
```

### Hover "border glow" without box-shadow (used everywhere)

box-shadow is banned, so glow = **border-color transition + an absolutely-positioned radial-gradient overlay whose opacity animates 0→1**:

```tsx
// inside any interactive GlassCard
<div className="group relative ...">
  {/* accent wash, opacity-only animation, pointer-events-none */}
  <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0
                  transition-opacity duration-200 group-hover:opacity-100
                  bg-[radial-gradient(120%_120%_at_50%_0%,var(--accent-soft),transparent_60%)]" />
  {/* border shifts toward accent on hover */}
  ...content (className adds: border-zinc-800/50 group-hover:border-[var(--accent-line)] transition-colors duration-200)
</div>
```

This satisfies constraints #7 (no box-shadow) and #10 (only `transform`/`opacity` animate). The optional Magic UI **BorderBeam** (conic-gradient swept by `transform`) is the richer alternative for the two detail modals only — used sparingly to avoid slop.

### Motion contract (motion-alive Level 2, applied globally)

```ts
const EASE = [0.16, 1, 0.3, 1];          // ease-out-expo (existing token)
const reduce = useReducedMotion();        // hard guard on every recipe

enter   = reduce ? { opacity: 1 } : { initial:{opacity:0,y:12}, animate:{opacity:1,y:0}, transition:{duration:0.4, ease:EASE} }
stagger = reduce ? 0 : 0.05               // per child
hover   = reduce ? {} : { scale: 1.02 }   // transform only, 150ms
press   = reduce ? {} : { scale: 0.98 }
```

Rules honored: only `transform`/`opacity` animate; no infinite ambient loops except the single existing live pulse and one low-opacity page dot-grid; `prefers-reduced-motion` collapses every recipe to opacity-only or instant.

---

## Phase 1: StatsPage Improvements

> Page accent = indigo `#6366f1`. Wrap `PageShell data-page="stats"` content in a relative container with **Magic UI DotPattern** (or **Particles**, ~8 particles) pinned behind everything at `opacity-[0.04]`, `text-zinc-700`, masked with a top radial fade. Ambient only — `pointer-events-none`, paused under reduced-motion. This is the one atmospheric layer; it gives the flat page subtle depth without competing with data.

### 1. Header Row (title + Time Lock toggle + period label)
- **Before → after:** Plain left-aligned `text-3xl` title with the Time Lock button floating awkwardly and a bare period label. After: a single **sticky glass header bar** (`--glass-1`, `sticky top-0 z-30`, `-mx-* px-*` bleed, bottom `border-zinc-800/50`) holding, left→right: an accent-tinted icon chip + title + live period label, then a right cluster with the period label and the Time Lock toggle styled as a proper pill.
- **Colors:** title `#fafafa`; icon chip `bg-[rgba(99,102,241,0.14)]` with icon `#6366f1`; period label `#71717a` mono. Time Lock pill OFF = `bg-zinc-900/40 border-zinc-800/50 text-zinc-400`; ON = `bg-[rgba(99,102,241,0.14)] border-[var(--accent-line)] text-indigo-300` with a filled `Lock` icon (lucide).
- **Spacing:** header `py-3`; gap between icon chip and title `gap-3`; right cluster `gap-3`; icon chip `h-9 w-9 rounded-xl grid place-items-center`. Title keeps `text-3xl font-semibold tracking-tight`.
- **Motion:** header content `enter` (y:12→0, 0.4s). Time Lock toggle: `whileTap scale 0.98`; on state change, animate the `Lock`/`Unlock` lucide icon swap with `AnimatePresence` (opacity + 90° `rotate` via transform, 150ms). The “All Time” period label cross-fades when lock engages.
- **Glass depth:** `--glass-1` + backdrop-blur so content scrolls under it cleanly. No hover glow on the bar itself.
- **MCP sources:** **Lucide** — `Lock`/`LockOpen`, `MonitorSmartphone` (title chip, more descriptive than generic Monitor). **shadcn Toggle** re-skinned for the Time Lock pill (44px min height). **shadcn Tooltip** on the toggle (“Lock view to All Time”).
- **Code changes (additive):** wrap existing header JSX in the sticky bar `div`; move existing Time Lock button inside the right cluster and extend its `className`; no handler/state changes. Touch target: ensure `min-h-[44px] px-4`.

### 2. Live Tracking Indicator (conditional)
- **Before → after:** A flat row with a green dot + app name. After: an elevated **“now playing” banner** (`--glass-2`, full-width) with a left emerald status rail, the pulsing dot, app name (sans, semibold), category badge, and a right-aligned **mono elapsed timer** that reads like a live readout.
- **Colors:** status rail `1px` left border `#10b981`; dot `#10b981` with the existing pulse; app name `#fafafa`; category badge uses the StatsPage `CATEGORY_COLORS` value at 14% bg / full-color text (e.g. IDE `#6366f1`); elapsed timer `#34d399` mono.
- **Spacing:** `p-5` (unchanged), `gap-3` between dot/name/badge; timer `ml-auto`. Add a `pl-4` to clear the status rail.
- **Motion:** banner `enter` via `AnimatePresence` (opacity + scale 0.98→1). Dot keeps existing pulse (the one sanctioned ambient loop). Elapsed timer digits use **tabular-nums** so they don’t jitter; optionally a 1px opacity tick each second (reduced-motion: static).
- **Glass depth:** `--glass-2`; subtle emerald wash overlay (`radial-gradient` emerald at 8%) to signal “live,” opacity-static.
- **Chart polish:** n/a.
- **MCP sources:** **Lucide** `Radio`/`Activity` for the live glyph; **React Bits** count-up is *not* used here (timer is real-time, not a one-shot).
- **Code changes:** wrap existing indicator content; add rail + wash divs; extend timer `className` to `font-mono tabular-nums`. No timer logic change.

### 3. Live Detection Panel (terminal-style log viewer)
- **Before → after:** A plain scrolling list of `timestamp · INFO · app`. After: a **real terminal surface** — darker inset (`bg-zinc-950/60`), a faux title bar (“live-detection — tail -f”, with a window-dot motif recolored to zinc), per-row **level coloring**, a **search input**, and a **level filter** dropdown. Rows are monospaced and grid-aligned into timestamp / level / name / detail columns.
- **Colors:** panel inset `#0a0a0a` at 60% over `--glass-2`; title bar `bg-zinc-900/40`; level badges — INFO `#3b82f6`, app `#6366f1`, browser `#10b981`, ide `#8b5cf6` (reuse type→color), each as 14% bg / full text; timestamps `#52525b` mono; app name `#e4e4e7`.
- **Spacing:** rows `py-1.5 px-3`, `gap-3` columns via `grid grid-cols-[auto_auto_1fr_auto]`; panel keeps `h-48` scroll; controls row `mb-3 gap-2`. Search/filter controls `h-9` (≥44px tap area with padding).
- **Motion:** new log rows enter top with opacity + `translateY(-6px)→0` (200ms) via a keyed `AnimatePresence` over the *rendered* slice (no data change — purely presentational mount animation). Auto-scroll-to-latest preserved. Reduced-motion: instant.
- **Glass depth:** inset is *deeper/darker* than surrounding cards to read as a recessed console.
- **MCP sources:** **shadcn Input** (search, with leading `Search` lucide icon) + **shadcn DropdownMenu** (level filter: All / app / browser / ide / info) + **shadcn Badge** for levels + **shadcn ScrollArea** for the body — all re-skinned to tokens. **Magic UI AnimatedList** is the optional drop-in for the row-enter behavior. **Lucide** `ScrollText`/`Terminal`, `Search`, `Filter`.
- **Code changes:** search + filter are **view-only**: add local `useState` for `query`/`levelFilter` and filter the *displayed* array in render (does not touch the source `liveActivityLogs` prop or any existing `useMemo` that computes data). Wrap in try/catch only if you persist the filter to `localStorage`.
- **State coverage:** empty = “Waiting for activity…” with a slow-blinking caret (opacity loop, reduced-motion static); no error state needed (local stream).

### 4. App Time Distribution Pie
- **Before → after:** Bare canvas in a card. After: a **donut** (cutout `64%`) sitting on a glass-backdrop plot area with a **center total** (“Total” label + big mono duration) drawn by a custom plugin; slices separated by hairlines; legend moved to the right as a clean key.
- **Colors:** slice colors stay = StatsPage `CATEGORY_COLORS`; slice separators `borderColor #0a0a0a borderWidth 2`; center total value `#fafafa` mono, label `#71717a`; legend text `#a1a1aa`.
- **Spacing:** card `p-5`; canvas wrapper `h-64` (unchanged); legend `gap-2`, swatch `h-2.5 w-2.5 rounded-[3px]`.
- **Motion:** chart.js `animateScale:true, animateRotate:true, duration:700, easing:'easeOutQuart'`. On hover, `hoverOffset:6` (built-in). Card `enter`.
- **Glass depth:** custom **glassBackdrop plugin** paints a `rounded-xl` `rgba(255,255,255,0.02)` rect behind the chart area.
- **Chart polish:** convert Pie→donut via `cutout:'64%'` (options styling only); **centerText plugin** below; tooltip restyle (see Phase 3). Hover dims non-active slices to 55% opacity via `hoverBackgroundColor` (styling field).
  ```ts
  const centerText = {
    id: 'centerText',
    afterDraw(chart){ const {ctx, chartArea:{left,right,top,bottom}} = chart;
      const cx=(left+right)/2, cy=(top+bottom)/2;
      ctx.save(); ctx.textAlign='center';
      ctx.fillStyle='#71717a'; ctx.font='600 11px Inter';
      ctx.fillText('TOTAL', cx, cy-12);
      ctx.fillStyle='#fafafa'; ctx.font='700 22px "JetBrains Mono"';
      ctx.fillText(centerLabel /* already-formatted string */, cx, cy+12); ctx.restore(); }
  };
  ```
  `centerLabel` reuses the already-computed total via `formatDuration` — no new computation.
- **MCP sources:** none needed (custom plugins). **Lucide** `ChartPie` for the SectionHeader icon.
- **State coverage:** empty = centered `PieChart` lucide glyph (zinc-700) + “No usage recorded for this period”; loading = donut-shaped shimmer ring (opacity pulse); error = amber inline retry.

### 5. Top Applications List (top 6)
- **Before → after:** Plain rows. After: **rank-led rows** — a leading mono rank (`01`–`06`), the existing generic `Monitor` glyph on a category-colored badge, name + category badge, a thin **scaleX progress track** behind the row showing share, then right-aligned mono time + percentage. Reads as a leaderboard.
- **Colors:** rank `#52525b` mono; track fill = that app’s category color at 22%, with a 1px accent leading edge; time `#fafafa` mono; percent `#71717a` mono; row hover bg `rgba(255,255,255,0.02)`.
- **Spacing:** rows `py-2.5 px-3 gap-3 rounded-lg`; list `flex-1`; icon `h-7 w-7 rounded-md`.
- **Motion:** rows `enter` with `stagger 0.05`. Progress track fills via `transform: scaleX(0→share)` `transform-origin:left`, 600ms `EASE` (transform only — not width). Hover: row bg fade + 2px `translateX` of the name cluster.
- **Glass depth:** flat rows inside the `--glass-2` card; hover wash only.
- **MCP sources:** keep the current category-colored badge (generic `Monitor`). *Optional additive upgrade:* **Iconify** (`simple-icons`) to swap the generic glyph for a real per-brand icon keyed by app name, with a **Lucide** `AppWindow` fallback. **Lucide** `Trophy`/`ListOrdered` for the SectionHeader.
- **Code changes:** add rank index from existing sorted slice (already top-6, no recompute); add track `div` with `style={{transform:`scaleX(${share})`}}` using the already-computed percentage.
- **State coverage:** empty = “No applications tracked yet” with `AppWindow` glyph.

### 6. Summary Cards (4: Total Time, Total Sessions, Avg Session, Active Apps)
- **Before → after:** Four equal flat cards. After: four **stat tiles** with a top-left accent icon chip, an **animated count-up value** in large mono, a small label, and a hover border-glow. Visual hierarchy: value (1st) → icon (2nd) → label (3rd).
- **Colors:** value `#fafafa`; label uppercase `#71717a`; icon chips tinted per metric — Total Time `#6366f1`, Sessions `#3b82f6`, Avg Session `#8b5cf6`, Active Apps `#10b981` (each 14% bg / full icon).
- **Spacing:** grid `grid-cols-2 lg:grid-cols-4 gap-4`; card `p-5`; icon chip `h-9 w-9 rounded-xl mb-3`; value `mt-1`; label `mt-1`.
- **Motion:** cards `enter` staggered 0.05. Value uses **count-up** 800ms easeOut on mount + on period change (animates the *display* of the already-computed number). Hover: `scale 1.02` + border→`--accent-line` + radial wash opacity.
- **Glass depth:** `--glass-2`; hover lifts perception via the wash, not shadow.
- **Typography:** value `text-3xl font-bold font-mono tabular-nums tracking-tight`; label `text-[11px] uppercase tracking-[0.08em] text-zinc-500`.
- **MCP sources:** **React Bits CountUp** (or Magic UI **NumberTicker**) re-skinned to mono/tabular-nums and guarded by reduced-motion (renders final value instantly). **Magic UI BorderBeam** optional but **skip here** to reserve it for modals (anti-repetition). **Lucide** `Clock`, `Layers`/`Repeat`, `Timer`, `LayoutGrid`.
- **Code changes:** feed existing numeric values into CountUp’s `end` prop; wrap each card in the hover-glow group. No derivation changes.
- **State coverage:** loading = number replaced by a shimmer bar (opacity pulse); zero is a valid populated state (show `0`, not empty).

### 7. Hourly Distribution / Daily Usage Trend Chart (bar/line toggle)
- **Before → after:** Flat bars/line. After: **gradient-filled** bars (or area under line), rounded bar caps, a glass plot backdrop, current-hour highlight refined, and a polished **segmented Bar/Line toggle**.
- **Colors:** bars = vertical canvas gradient `#6366f1` 90% → `#6366f1` 10%; current hour bar = emerald gradient `#10b981`→transparent; line stroke `#6366f1` `borderWidth:2` with area fill gradient (`Filler`); grid lines `rgba(255,255,255,0.04)`; tick labels `#71717a` mono.
- **Spacing:** card `p-5`; canvas `h-56` (unchanged); toggle top-right in SectionHeader `action`.
- **Motion:** chart.js `duration:600, easing:'easeOutQuart'`; on period/mode switch, AnimatePresence cross-fade the canvas (opacity, 200ms) so transitions feel smooth. Toggle uses a framer **`layoutId` sliding pill** (animates via transform).
- **Glass depth:** glassBackdrop plugin behind plot area.
- **Chart polish:** bars `borderRadius:6, borderSkipped:false, categoryPercentage:0.7, barPercentage:0.8`; gradient via scriptable `backgroundColor:(ctx)=>makeGradient(ctx, accent)` (styling field inside the existing `useMemo`); line `tension:0.4, pointRadius:0, pointHoverRadius:4`.
- **MCP sources:** **shadcn ToggleGroup** (Bar/Line) or **Tabs**, re-skinned; **Lucide** `BarChart3`/`LineChart`, `Clock`.
- **Code changes:** extend dataset *styling* keys only; data arrays/labels and the `useMemo` stay intact. Add the canvas-gradient helper (pure styling).
- **State coverage:** empty = baseline axis + “No activity in this period” centered; loading = bar-skeleton (5–7 shimmer bars, opacity pulse); error = amber retry.

### 8. Category Breakdown (progress bars per category)
- **Before → after:** Flat labeled bars. After: a tidy grid of **category meters** — colored dot + name + mono value on one line, a `scaleX` track below, percentage at the end. Consistent baseline alignment.
- **Colors:** track bg `rgba(255,255,255,0.05)`; fill = category color (StatsPage map); value `#e4e4e7` mono; percent `#71717a`.
- **Spacing:** grid `grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4`; each meter `gap-2`; track `h-1.5 rounded-full`.
- **Motion:** meters `enter` staggered; fills `scaleX` 600ms `EASE` transform-origin-left.
- **Glass depth:** flat inside `--glass-2`.
- **MCP sources:** none required; **Lucide** `Tags`/`FolderTree` for header.
- **Code changes:** swap any width-based fill for `transform:scaleX()` using existing percentages.
- **State coverage:** empty = “No categories to show”; loading = 4 shimmer meters.

### 9. Application Statistics Grid (clickable per-app cards)
- **Before → after:** Uniform clickable cards. After: **richer app cards** — icon + name + category badge header, a mono primary metric (total time), secondary row (sessions · avg), and a hover affordance (border-glow + a `ChevronRight` that slides in) signaling “open detail.”
- **Colors:** name `#fafafa`; badge = category color 14%/full; primary metric `#e4e4e7` mono; secondary `#71717a`; hover border→`--accent-line`.
- **Spacing:** grid `grid-cols-2 xl:grid-cols-3 gap-4`; card `p-5`; header `gap-3 mb-3`; secondary row `mt-2`.
- **Motion:** cards `enter` staggered (cap visible stagger so long lists don’t feel slow — stagger first ~12, rest instant). Hover `scale 1.02` + wash + chevron `translateX(-4→0)` opacity. Press `scale 0.98`. Full keyboard focus ring via border, not outline-shadow.
- **Glass depth:** `--glass-2`, hover wash.
- **MCP sources:** keep the existing category-badged app glyph; *optional* **Iconify** per-brand icons (see §5). **Lucide** `ChevronRight`, `AppWindow`. **shadcn Card** as the re-skinned base if rebuilding the shell.
- **Code changes:** keep existing `onClick`→open modal; add chevron + wash; ensure `role="button" tabIndex=0` and `min-h-[44px]`.
- **State coverage:** empty = “No applications match this period” with reset hint; loading = 6 card skeletons (shimmer).

### 10. App Detail Modal
- **Before → after:** Long scrolling overlay. After: a **structured, sectioned modal** on `--glass-3` with a sticky header (icon + name + category + close), a **Key Metrics row** (4 mono stat tiles), the **period selector** restyled (see Phase 3), **Daily** + **Hourly** charts with the same gradient/plugin polish, First/Last Seen as a compact dual-card, a refined **Productivity Estimate** gradient bar, and the **Sessions list** with cleaner inline edit/delete. A subtle **BorderBeam** traces the modal edge in the page accent.
- **Colors:** scrim `bg-black/70 backdrop-blur-sm`; panel `--glass-3`; header `border-zinc-800/60`; metric tiles like §6; productivity bar gradient = category color→lighter tint; destructive delete confirm `#ef4444`.
- **Spacing:** panel `max-w-3xl rounded-xl`; sticky header `p-5 border-b`; body sections `space-y-6 p-5`; metric grid `grid-cols-2 sm:grid-cols-4 gap-4`; sessions rows `py-2.5 gap-3`.
- **Motion:** open = scrim opacity 0→1 (200ms) + panel `opacity 0→1, scale 0.97→1, y 8→0` (250ms `EASE`); close reverses at 150ms. Metric tiles count-up on open, stagger 0.05. Section content `enter`. Reduced-motion: opacity only. **Focus trap + ESC + scrim-click close preserved.**
- **Glass depth:** highest tier; scrim blur separates it from the page.
- **Chart polish:** Daily + Hourly reuse the gradient bars, current-hour emerald highlight, glassBackdrop + restyled tooltip.
- **MCP sources:** **21st.dev Magic** to generate the polished modal shell, then re-skin to tokens; **shadcn Dialog** as the accessible base (focus trap/ARIA); **Magic UI BorderBeam** on the panel edge (the one place it earns its keep); **Lucide** `X`, `Calendar`, `Clock`, `Flame` (peak hour), `Hourglass` (longest), `Gauge` (productivity), `Pencil`, `Trash2`, `Check`.
- **Code changes:** purely structural re-wrap of existing modal content; all IPC (`updateAppLog`/`deleteAppLog`), datetime-local inputs, confirmation flow, and period state untouched. Ensure edit/delete controls are `≥44px`.
- **State coverage:** sessions empty = “No sessions in this period”; chart empty/loading/error as §7; delete-pending = inline confirm (Cancel / Delete) instead of a removed feature.

---

## Phase 2: BrowserActivityPage Improvements

> Page accent = blue `#3b82f6`. Same ambient **DotPattern/Particles** layer behind `PageShell data-page="browser"` at `opacity-[0.04]`, tinted toward blue. Reuse every shared pattern from Phase 1 with the blue accent so the two pages read as siblings, not clones.

### 1. Header Row (title + period label + Tracking Browser selector + Refresh)
- **Before → after:** Crowded controls. After: same **sticky glass header** as Stats: left icon chip (`Globe2`) + “Browser Activity” + period label; right cluster = **Tracking Browser select** (styled dropdown with ★ for the extension browser) + **Refresh** icon button.
- **Colors:** icon chip `bg-[rgba(59,130,246,0.14)]` icon `#3b82f6`; select `bg-zinc-900/40 border-zinc-800/50`; ★ `#f59e0b`; Refresh idle `#a1a1aa`, hover `#3b82f6`.
- **Spacing:** header `py-3`, right cluster `gap-2`; select `h-9 min-w-[180px]`; Refresh `h-9 w-9 grid place-items-center` (44px tap with padding).
- **Motion:** header `enter`. Refresh icon `rotate 360°` (transform) once per click/auto-refresh tick; reduced-motion: no spin. Select open = dropdown `enter`.
- **Glass depth:** `--glass-1` sticky bar.
- **MCP sources:** **shadcn Select** (browser picker) + **shadcn Button** (icon, Refresh) + **shadcn Tooltip**; **Lucide** `Globe2`, `RefreshCw`, `Star`, `ChevronDown`.
- **Code changes:** wrap existing controls; keep `getTrackedBrowsers`/`setBrowserWithExtension`/`getPreferences` calls and the 10s auto-refresh as-is.

### 2. Summary Cards (3: Total Browsing Time, Unique Domains, Browsing Sessions)
- **Before → after:** Identical to Stats §6 stat tiles but `grid-cols-1 sm:grid-cols-3`, blue accent. *Note:* these cards are **not** framer-motion animated today (unlike Stats) — the entrance/count-up/hover below are additive, reduced-motion-guarded upgrades.
- **Colors:** icon chips Total Time `#3b82f6`, Unique Domains `#06b6d4`, Sessions `#8b5cf6`; values `#fafafa`.
- **Spacing:** `grid-cols-1 sm:grid-cols-3 gap-4`; card `p-5`.
- **Motion:** count-up + staggered `enter` + hover glow.
- **MCP sources:** **React Bits CountUp**; **Lucide** `Clock`, `Globe`, `MousePointerClick`.
- **State coverage:** loading shimmer; zero is populated.

### 3. Live Detection Panel (terminal-style, with Save button)
- **Before → after:** Same terminal upgrade as Stats §3, plus the existing **Save** action restyled as a header button and a domain-aware row layout (timestamp / level / domain / title).
- **Colors:** identical token set; domain text `#e4e4e7`; level badges reuse type colors; Save button `bg-zinc-900/40 hover:border-[var(--accent-line)]` with `Download`/`Save` lucide icon, success flash emerald.
- **Spacing:** controls row `gap-2`; Save `h-9` (≥44px tap).
- **Motion:** new rows enter (opacity + translateY); Save click → brief emerald check swap (AnimatePresence, opacity/rotate).
- **MCP sources:** **shadcn Input/DropdownMenu/Badge/ScrollArea**, **Magic UI AnimatedList**, **Lucide** `Terminal`, `Search`, `Filter`, `Save`, `Check`.
- **Code changes:** search/level filter are view-only local state over the displayed slice; the live `onBrowserTrackingEvent` stream and save-to-file (`handleSaveLogs`) feature untouched. *Optional additive:* render a **play/pause** control in the title bar that wires the already-present `isLiveMode` state and the already-imported `Play`/`Pause` lucide icons (currently unused) — no new state/logic, just surfaces what exists.
- **State coverage:** empty = “Listening for browser activity…” blinking caret.

### 4. Hourly / Daily Activity Chart (bar/line toggle)
- **Before → after:** Same gradient + glassBackdrop + plugin polish as Stats §7, blue accent; same sliding Bar/Line toggle.
- **Colors:** bars gradient `#3b82f6` 90%→10%; current-hour emerald; grid `rgba(255,255,255,0.04)`.
- **Spacing:** `h-56` canvas; `p-5` card.
- **Motion:** 600ms easeOutQuart; canvas cross-fade on period/mode switch; `layoutId` toggle pill.
- **Chart polish:** rounded bars, area-fill gradient on line, restyled tooltip.
- **MCP sources:** **shadcn ToggleGroup**; **Lucide** `BarChart3`/`LineChart`.
- **State coverage:** empty/loading/error as Stats §7.

### 5. Charts Row (Time by Category Pie + Top Domains Bar)
- **Before → after:** Two flat charts. After: **donut** (center total) + **vertical Top-10 bar** (color-coded per category) with gradient fills and a custom duration legend.
- **Colors:** donut slices = BrowserActivityPage `CATEGORY_COLORS`; separators `#0a0a0a`; **vertical bars keep their per-category colors** (from the Browser `CATEGORY_COLORS` map), each as a top→bottom gradient (category color 90%→10%), rounded caps; legend duration text `#a1a1aa` mono.
- **Spacing:** row `grid-cols-1 lg:grid-cols-2 gap-4`; each `p-5`, canvas `h-64`; legend `gap-2`.
- **Motion:** donut `animateRotate/animateScale` 700ms; horizontal bars grow via chart.js animation; cards `enter`. Hover dims non-active slices.
- **Glass depth:** glassBackdrop plugin on both.
- **Chart polish:** donut `cutout:'64%'` + centerText plugin (reusing computed category total); **vertical** bars `borderRadius:6, borderSkipped:false` (no `indexAxis` change — keep the default x-axis); per-bar gradient via scriptable `backgroundColor` keyed to each category color; tooltip restyle; custom legend keeps the existing `generateLabels` duration labels.
- **MCP sources:** **Lucide** `ChartPie`, `BarChart3`, `Globe`.
- **State coverage:** each chart gets empty (glyph + message), loading (shimmer), error (amber retry).

### 6. Recent Activity (accordion list, top 6 domains)
- **Before → after:** Flat expandable rows. After: polished **accordion** — header row (favicon/domain icon + domain + category badge + mono total + chevron), expandable body with session timestamps in a clean mono table.
- **Colors:** header hover `rgba(255,255,255,0.02)`; chevron `#71717a`→accent on open; session times `#52525b` mono; category badge per Browser map.
- **Spacing:** header `py-3 px-3 gap-3`; body `pl-10 pr-3 pb-3 space-y-1.5`.
- **Motion:** **constraint #10 compliance** — do *not* animate height. Container expands instantly (height auto) while body **children fade + `translateY(-4→0)` with 0.04s stagger**, chevron `rotate 0→90°` (transform). Reduced-motion: instant, no rotate.
- **Glass depth:** flat inside `--glass-2`; open row gets a faint accent left-rail.
- **MCP sources:** **shadcn Accordion** (Radix, accessible) re-skinned — drive reveal with the children opacity/transform recipe above rather than its height transition to honor the constraint; **React Bits** smooth accordion as alternative; **Iconify** favicons; **Lucide** `ChevronDown`, `History`.
- **Code changes:** keep existing expand state + session data; restyle markup; ensure header is `≥44px` and keyboard-toggle works.
- **State coverage:** empty = “No recent browsing activity” with `History` glyph.

### 7. Domain Breakdown Grid (clickable per-domain cards)
- **Before → after:** Same app-card upgrade as Stats §9 — favicon + domain + category badge, mono total, sessions secondary, hover glow + chevron. **Note:** the category-edit handlers (`handleCategoryChange`, `startEditCategory`) + `setDomainCategory` IPC exist, but the **inline dropdown UI is not currently rendered** — so adding a compact inline category **Select** here is an *additive wire-up of existing logic*, not a restyle of existing UI.
- **Colors:** blue accent hover border; badge per Browser map; category dropdown `bg-zinc-900/60 border-zinc-800/50`.
- **Spacing:** `grid-cols-2 xl:grid-cols-3 gap-4`; card `p-5`.
- **Motion:** staggered `enter` (cap to first ~12), hover `scale 1.02` + wash + chevron slide. Inline category dropdown opens with `enter`.
- **Glass depth:** `--glass-2` + wash.
- **MCP sources:** **shadcn Select/DropdownMenu** for inline category edit; **Iconify** favicons + **Lucide** `Globe`, `ChevronRight`, `Tag`.
- **Code changes:** keep `onClick`→Domain modal; when adding the inline category **Select**, wire it to the existing `handleCategoryChange`/`startEditCategory` handlers and the `setDomainCategory` IPC, and `stopPropagation` on the control so editing doesn’t open the modal. `≥44px` targets. No new derivation beyond a local open/edit flag.
- **State coverage:** empty = “No domains tracked for this period”; loading = 6 skeletons.

### 8. Domain Detail Modal
- **Before → after:** Same modal system as Stats §10 (blue accent): sticky header (favicon + domain + category + close), 4 Key Metric tiles (Total Time / Sessions / Avg Session / First Seen), restyled period selector, gradient **Daily Usage** chart with glassBackdrop + restyled tooltip. BorderBeam edge in blue.
- **Colors:** `--glass-3`; metric chips blue/cyan/violet/emerald; scrim `bg-black/70 backdrop-blur-sm`.
- **Spacing:** `max-w-3xl`, header `p-5 border-b`, body `space-y-6 p-5`, metric grid `grid-cols-2 sm:grid-cols-4 gap-4`.
- **Motion:** identical open/close recipe to Stats §10; metrics count-up; focus trap + ESC + scrim-click preserved.
- **Chart polish:** gradient bars + glassBackdrop + tooltip restyle.
- **MCP sources:** **21st.dev Magic** modal shell + **shadcn Dialog** base + **Magic UI BorderBeam** + **Lucide** `X`, `Calendar`, `Clock`, `MousePointerClick`, `Timer`.
- **State coverage:** chart empty/loading/error; metrics show `0`/“—” gracefully.

---

## Phase 3: Shared Improvements

### Typography Refinements
- **Mono-vs-sans discipline (impeccable type ref):** *every* numeric — durations, counts, percentages, timestamps, axis ticks, legend durations — renders in **JetBrains Mono `tabular-nums`**; *every* label/title/prose renders in **Inter/Geist**. No exceptions.
- **Scale (unchanged tokens, applied consistently):** page title `text-3xl font-semibold tracking-tight`; card title `text-xl font-semibold`; stat value `text-3xl font-bold font-mono tabular-nums tracking-tight`; **metric label** standardized to `text-[11px] uppercase tracking-[0.08em] text-zinc-500 font-medium`; timestamps `font-mono text-xs text-zinc-600`.
- **Alignment:** all label→value pairs share a baseline grid; values right-align in lists/tables so digits line up (tabular-nums makes this exact).
- **Color roles:** headings `#fafafa`, body `#a1a1aa`, muted/labels `#71717a`, faint/timestamps `#52525b`.

### Chart Polish (applies to all chart.js instances)
- **Canvas gradient helper** (styling field, inside existing `useMemo`):
  ```ts
  const makeGradient = (ctx, hex) => { const c = ctx.chart.ctx;
    const g = c.createLinearGradient(0, ctx.chart.chartArea?.top ?? 0, 0, ctx.chart.chartArea?.bottom ?? 200);
    g.addColorStop(0, hex + 'E6'); g.addColorStop(1, hex + '1A'); return g; };
  ```
- **glassBackdrop plugin** — paints `rounded-xl rgba(255,255,255,0.02)` behind `chartArea` for every chart (beforeDraw).
- **centerText plugin** — total in donut centers (Stats pie + Browser category pie).
- **Tooltip restyle (shared options):**
  ```ts
  tooltip: { backgroundColor:'rgba(24,24,27,0.92)', borderColor:'rgba(255,255,255,0.08)', borderWidth:1,
    titleColor:'#a1a1aa', bodyColor:'#fafafa', padding:12, cornerRadius:8, displayColors:true, boxPadding:4,
    titleFont:{family:'Inter',size:11,weight:'600'}, bodyFont:{family:'JetBrains Mono',size:13},
    callbacks:{ /* keep existing formatDuration() labels */ } }
  ```
- **Strokes/curves:** bars `borderRadius:6, borderSkipped:false`; line `borderWidth:2, tension:0.4, pointRadius:0, pointHoverRadius:4, fill:true` (Filler gradient); animation `duration:600, easing:'easeOutQuart'` (pie 700, animateScale+Rotate). Grid `color:'rgba(255,255,255,0.04)'`, border hidden, ticks `#71717a` mono.
- **Rule:** all of the above touch only `data.datasets[].<styling>` and `options.*`; numeric `data`/`labels` and the `useMemo` wrappers are unchanged (constraints #2, #13).

### Modal Enhancements (both modals)
- Sticky header + scrollable body so the title/close stay visible; `space-y-6` section rhythm; metrics as a 4-up mono tile row up top for instant scan; charts mid; lists/sessions last.
- Accessibility: shadcn Dialog base gives focus trap, ESC, `aria-modal`, scrim-click close — keep existing handlers wired. All edit/delete/period controls `≥44px`.
- One restrained BorderBeam per modal edge = the single “wow” accent (anti-repetition: not used on cards).

### Empty / Loading / Error States (every data section)
- **Loading:** shape-matched **skeletons** — stat tiles → shimmer bar; lists → row skeletons; charts → bar/donut-shaped skeletons. Shimmer = `opacity` pulse 1.5s (no layout animation); reduced-motion = static 40% block.
- **Empty:** centered **Lucide glyph** (`#3f3f46`, ~28px) + one-line message (sans) + optional one-line hint; behind it, an **Unsplash** dark atmospheric texture at `opacity-[0.03]`, grayscale, masked — strictly decorative, `pointer-events-none`. UX-writing per impeccable: specific, calm (“No usage recorded for this period” not “No data”).
- **Error:** Browser already ships a **full-page error state** (`AlertCircle` + red message + Retry) and a full-page **`LoadingState`** spinner — keep both as the page-level fallback. The additions here are **per-section** inline states layered *inside* that: an inline amber callout (`bg-[rgba(245,158,11,0.10)] border-[rgba(245,158,11,0.30)] text-amber-300`) with `AlertCircle` + message + Retry (re-invokes the existing fetch). Stats relies on props, so its per-section “error” degrades to the empty fallback.
- **Consistency:** a shared `<SectionState kind="loading|empty|error" />` presentational helper keeps all sections identical — additive component, no prop/IPC change.

### Micro-interactions (motion-alive recipe map)
- **Card hover:** `scale 1.02` + border→accent-line + radial wash opacity 0→1, 150–200ms. **Press:** `scale 0.98`.
- **Buttons/toggles:** hover bg/border shift; `whileTap scale 0.98`; icon swaps via AnimatePresence (opacity + rotate).
- **Chart hover:** built-in active states + restyled tooltip; non-active slices dim (styling).
- **Accordion:** chevron `rotate 90°`; body children fade+translateY stagger (no height animation).
- **Modal open/close:** scrim opacity + panel opacity/scale/y as specified.
- **Period change:** sliding `layoutId` pill + canvas cross-fade.
- **Count-ups:** stat values on mount + period change (reduced-motion → instant final value).
- **Live rows:** enter from top, opacity + translateY.
- **Global guard:** `useReducedMotion()` collapses everything to opacity-only/instant; only sanctioned loops are the live pulse + the faint page dot-grid.

### Period Navigation (shared component)
- Chevron-prev / pill-row / chevron-next. Pills `h-9 px-3 rounded-lg`, inactive `text-zinc-400 hover:bg-white/5`, active `bg-[var(--accent-soft)] text-accent border border-[var(--accent-line)]`; a single framer `layoutId="periodPill"` highlight slides between them (transform). Chevrons `h-9 w-9` (44px tap). Scroll position preservation logic stays exactly as-is (constraint #14).

---

## Anti-Slop Checklist (frontend-external-infra)

| # | Item | Status | Note |
|---|------|--------|------|
| 1 | No generic/unre-skinned MCP components | ✅ | Every sourced component re-skinned to zinc+accent tokens, `rounded-xl` max, `p-5`, mono data. |
| 2 | No raw default shadows | ✅ | Zero `box-shadow`; depth via opacity/blur/border + radial wash. |
| 3 | No over-rounded corners | ✅ | `rounded-xl` (12px) cap enforced everywhere. |
| 4 | No rainbow/arbitrary colors | ✅ | Strictly DeskFlow zinc + per-page accent + existing CATEGORY_COLORS. |
| 5 | No layout-thrash animation | ✅ | Only `transform`/`opacity` animate; bars use `scaleX`; accordion uses child fades. |
| 6 | No motion without reduced-motion guard | ✅ | `useReducedMotion()` on every recipe; ambient loops paused. |
| 7 | No font soup | ✅ | Inter/Geist for UI, JetBrains Mono `tabular-nums` for all data. |
| 8 | No icon guessing | ✅ | Icons sourced via Lucide/Iconify per section, semantically chosen. |
| 9 | No missing states | ✅ | Empty/loading/error defined for every data section via shared `SectionState`. |
| 10 | No effect repetition / slop | ✅ | BorderBeam reserved for modals only; ambient texture/dot-grid ≤ 4% opacity; stagger capped on long lists. |

---

## Verification Checklist

- [x] Every section from both pages’ Layout Structure is covered (Stats ×10, Browser ×8 + shared).
- [x] No existing feature listed as removed — live indicator, live panel, all charts, modals, sessions edit/delete, category edit, browser selector, refresh, time lock, scroll preservation all retained.
- [x] All colors are from / derived from DeskFlow’s palette (zinc + accent + CATEGORY_COLORS).
- [x] All motion uses framer-motion recipes consistent with motion-alive (transform/opacity, EASE token, stagger 0.05).
- [x] Empty/loading/error states defined for every data section.
- [x] ≥3 MCP tools meaningfully used (shadcn, Magic UI, React Bits, Lucide, Iconify, 21st.dev, Unsplash all assigned).
- [x] Anti-slop checklist passes all 10 items.
- [x] Re-skin rules applied to every MCP-sourced component.
- [x] Touch targets ≥ 44px on all interactive elements.
- [x] `prefers-reduced-motion` respected globally.
- [x] Synced to CONTEXT_BUNDLE v2: `data-tutorial` anchors, focus-mode filter, `liveActivityLogs` prop sync, page-visibility, and per-page chart-ref difference preserved; Top Domains corrected to vertical; Browser category dropdown treated as an additive wire-up.

---

## Implementation Notes for the Hands & Eyes Agent

1. **Scope of edits:** wrap/extend existing JSX and `className`s; add presentational helpers (`SectionState`, hover-glow group, gradient helper, chart plugins). Do **not** edit `useMemo`/`useEffect` bodies, IPC calls, prop types, or `package.json`.
2. **Chart styling lives inside the existing `useMemo`** — add styling keys to the already-returned `data`/`options` objects; never recompute numeric arrays/labels.
3. **Register chart.js plugins** (`glassBackdrop`, `centerText`) once per module alongside existing `ChartJS.register(...)`.
4. **localStorage** (filter persistence, last period) → always `try/catch`.
5. **CRLF:** edit in place; do not run a formatter that rewrites line endings.
6. **MCP fetch order per section:** pull the named component → strip its styles → reapply tokens (`bg-zinc-900/30 backdrop-blur-xl border-zinc-800/50`, `rounded-xl`, `p-5`, mono data) → wire to existing data/handlers → add reduced-motion guard.
7. **Run the anti-slop checklist** above as the final gate before committing.
8. **Preserve `data-tutorial` anchors** exactly when wrapping/re-nesting — Stats: `stats.period` (header controls), `stats.charts` (hourly chart), `stats.list` (app grid); Browser: `browser.selector`, `browser.toggle`, `browser.domains`. The tutorial system queries these selectors.
9. **Preserve Stats focus-mode filtering** (`timeMode === 'focus'` shows only productive-tier apps) and the `liveActivityLogs` **prop** sync (Stats live logs arrive via prop from `App.tsx`, not a direct IPC subscription).
10. **Preserve Browser page-visibility** calls (`setPageVisibility('browser', true/false)`) and the existing full-page `LoadingState` + `AlertCircle` error/retry fallbacks.
11. **Chart-instance cleanup differs by page:** Stats tracks chart refs via `useRef<Record<string, ChartJS|null>>` for cleanup; Browser does **not**. Do not add or remove this — preserve the difference.
