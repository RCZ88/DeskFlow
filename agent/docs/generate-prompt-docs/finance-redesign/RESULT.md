# Finance Page — Complete Visual & Interaction Overhaul (Design Spec)

> **Concept codename: “VAULT / Aurora-Emerald.”** A dark, deep-space emerald vault: layered liquid glass over a living emerald mesh, one undeniable hero (net worth), money that *animates into place*, and charts that feel built into their cards rather than dropped on top.
>
> **Scope contract (read first):** Frontend only. No IPC / preload / main / DB / SQL changes. No routing changes. No prop renames or removals — only **additive local state** and **new presentational child components**. Tailwind **v4** only. Animation = Framer Motion. Charts = Recharts. Icons = Lucide. `--page-accent: #10b981` stays. All number rendering continues to flow through `NumberMaskContext` + `maskNumber()`. Everything below is achievable by editing the 12 listed files plus a handful of **new local-only** primitives.
>
> **Tuning targets honored:** DESIGN_VARIANCE = 7 (radical visual departure, same data contracts) · MOTION_INTENSITY = 5 (motion everywhere but never janky; all motion respects `prefers-reduced-motion`) · VISUAL_DENSITY = 6 (rich, but with real breathing room).

---

## 0. New local-only primitives to introduce (no backend, no prop-contract impact)

These are brand-new presentational files. They don’t touch any existing prop contract; existing components import and use them internally.

| New file | Role |
|---|---|
| `components/finance/_fx/GlassSurface.tsx` | The single glass primitive. Props: `tier?: 1\|2\|3`, `accent?: boolean`, `interactive?: boolean`, `className`. Renders layered glass (blur + gradient + top sheen + hairline border + optional emerald glow ring). |
| `components/finance/_fx/AnimatedAmount.tsx` | Mask-aware animated number. Wraps `useCountUp`; if `maskMode !== 'all'`-visible it shows `maskNumber(...)` instantly (never animates a masked value). Props mirror the value + `currency, maskMode, maskFixedValue`. |
| `components/finance/_fx/useCountUp.ts` | Hook: `useMotionValue` + `animate()` over `COUNTER` duration, `easeOutQuint`. Returns a rounded display string with `tabular-nums`. Short-circuits when `useReducedMotion()` is true. |
| `components/finance/_fx/financeMotion.ts` | Central Framer Motion variant + transition library (all curves/springs/variants defined in §1.5). Import everywhere for consistency. |
| `components/finance/_fx/ChartTheme.tsx` | Recharts theming: exports `<ChartDefs/>` (all `<linearGradient>`/filter defs), shared `<GlassTooltip/>`, axis/grid style constants, and the `CATEGORY_SPECTRUM` array. |
| `components/finance/_fx/categoryVisual.ts` | Pure helper: maps a `category` (`{icon,color}` already in data) + `wallet.type` / `txn.type` to a Lucide icon + accent. **Derives only from existing fields** — no new data. |
| `components/finance/_fx/AuroraBackground.tsx` | Fixed, `pointer-events-none` emerald mesh-gradient + grain layer that sits behind the page content inside `PageShell`. |
| `styles/finance-glass.css` | Tailwind v4 `@layer utilities` additions: `.glass`, `.glass-accent`, `.glass-inset`, `.sheen`, `.ring-glow`, `.text-money`, `.grain`. (v4 syntax: plain `@layer utilities { ... }` in a CSS file imported once.) |

> Folder `_fx` keeps these clearly “presentational FX, no logic.” Nothing here calls IPC.

---

## 1. Design System Spec

### 1.1 Color palette (every shade, hex / rgba)

**Base & atmosphere**
```
--bg-void:        #060607   /* deepest, page vignette edges */
--bg-page:        #09090b   /* zinc-950, base canvas (unchanged) */
--bg-raised:      #0c0d10   /* faint lift under glass */
--aurora-1:       rgba(16,185,129,0.18)  /* emerald mesh blob */
--aurora-2:       rgba(20,184,166,0.14)  /* teal mesh blob */
--aurora-3:       rgba(5,150,105,0.10)   /* deep emerald blob */
--grain-opacity:  0.025
```

**Glass surface tiers**
```
--glass-1-bg:   rgba(24,24,27,0.55)   /* zinc-900/55 — default card */
--glass-2-bg:   rgba(39,39,42,0.60)   /* zinc-800/60 — inner / raised rows */
--glass-3-bg:   rgba(9,9,11,0.40)     /* nav/header overlay glass */
--glass-border: rgba(255,255,255,0.06)
--glass-sheen:  rgba(255,255,255,0.10) /* top inner highlight */
--glass-shadow: 0 8px 32px -12px rgba(0,0,0,0.65)
```

**Emerald accent hierarchy** (keep `--page-accent: #10b981`)
```
--accent-50:   #ecfdf5   /* hero text tint / glints */
--accent-200:  #a7f3d0
--accent-300:  #6ee7b7   /* line stroke, hover text */
--accent-400:  #34d399   /* primary accent text/icon */
--accent-500:  #10b981   /* === --page-accent (DO NOT RENAME) */
--accent-600:  #059669   /* gradient mid */
--accent-700:  #047857   /* gradient deep */
--accent-900:  #064e3b   /* accent fills behind text */
--accent-glow: rgba(16,185,129,0.35)
```

**Secondary / semantic**
```
--teal-400:    #2dd4bf   /* secondary accent, chart variety */
--pos:         #34d399   /* income / positive money */
--pos-soft:    rgba(52,211,153,0.12)
--neg:         #fb7185   /* expense / negative money (rose, not harsh red) */
--neg-soft:    rgba(251,113,133,0.12)
--warn:        #f59e0b   /* amber: low balance / attention */
--info:        #38bdf8
```

**Green-tinged neutrals (text)**
```
--text-hero:   #ecfdf5   /* hero net worth */
--text-1:      #f4f4f5   /* zinc-100 primary */
--text-2:      #a1a1aa   /* zinc-400 secondary */
--text-3:      #71717a   /* zinc-500 muted */
--text-emerald-muted: #6b8079  /* labels with subtle green cast */
```

**Gradients & overlays**
```
--grad-hero:    linear-gradient(135deg,#10b981 0%,#059669 48%,#047857 100%)
--grad-hero-veil: radial-gradient(120% 140% at 18% 0%,rgba(255,255,255,0.22),transparent 55%)
--grad-sheen:   linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0) 42%)
--grad-pos:     linear-gradient(180deg,#34d399,#059669)
--grad-neg:     linear-gradient(180deg,#fb7185,#e11d48)
--grad-area:    linear-gradient(180deg,rgba(16,185,129,0.40),rgba(16,185,129,0) 92%)
--grad-mesh:    radial blobs of --aurora-1/2/3 (see AuroraBackground)
```

**Glow / ring effects**
```
--ring-glow:   0 0 0 1px rgba(16,185,129,0.25), 0 10px 40px -10px var(--accent-glow)
--ring-focus:  0 0 0 2px rgba(9,9,11,1), 0 0 0 4px var(--accent-500)
--inner-top:   inset 0 1px 0 0 var(--glass-sheen)
```

### 1.2 Typography scale (Inter; `font-variant-numeric: tabular-nums` on ALL money)

| Token | Size / line-height | Weight | Tracking | Usage |
|---|---|---|---|---|
| `hero` | 48 / 52px | 700 | -0.02em | Net worth hero (header + NetWorthCard) |
| `hero-sm` | 34 / 38px | 700 | -0.02em | Hero when header is condensed on scroll |
| `stat` | 28 / 32px | 700 | -0.01em | Stat card primary values |
| `stat-sm` | 20 / 26px | 600 | -0.01em | Secondary stat values, wallet balances |
| `title` | 13 / 16px | 600 | 0.08em UPPER | Card/section eyebrow labels |
| `tab` | 14 / 20px | 600 | 0 | Tab labels |
| `body` | 14 / 20px | 400 | 0 | Default text, descriptions |
| `body-strong` | 14 / 20px | 600 | 0 | Txn description, account name |
| `meta` | 12 / 16px | 500 | 0.02em | Dates, secondary meta |
| `caption` | 11 / 14px | 600 | 0.06em UPPER | Badges, pill labels, axis ticks |

Money rules: `.text-money { font-variant-numeric: tabular-nums; font-feature-settings:'tnum' 1,'ss01' 1; }`. Income uses `--pos`, expense uses `--neg`, neutral totals use `--text-hero`. Sign always explicit on transactions (`+`/`−` using the real minus glyph `−`).

### 1.3 Spacing system (4px base)

```
space: 2,4,8,12,16,20,24,32,40,48,64
Page padding:           24px (px-6), 32px top to clear sticky header
Section vertical gap:   32px
Card inner padding:     20px (compact cards) / 24px (hero & chart cards)
Grid gap (cards):       16px
Row padding (lists):    14px 16px
Pill padding:           4px 10px
Icon chip:              40x40 (lists) / 44x44 (accounts, large hit target)
FAB:                    56x56, offset 24px from bottom-right of content area
```
Radii: `--r-card:20px (rounded-[20px])`, `--r-inner:14px`, `--r-input:12px`, `--r-pill:9999px`, `--r-chip:12px`.

### 1.4 Glassmorphism technique (layered)

`.glass` (default Tier-1 card) composes, in order:
1. `backdrop-filter: blur(24px) saturate(140%)` (`backdrop-blur-2xl` + custom saturate utility).
2. Background `--glass-1-bg` plus `--grad-sheen` as a layered background image.
3. `border: 1px solid --glass-border`.
4. `box-shadow: --inner-top, --glass-shadow` (top inner highlight + soft drop).
5. `border-radius: --r-card`.

`.glass-accent` adds `--ring-glow` and a 1px emerald-tinted border (`rgba(16,185,129,0.30)`), used for the hero and the active/positive surfaces.

`.glass-inset` (Tier-2, inner rows/wallets): `--glass-2-bg`, no drop shadow, `box-shadow:--inner-top`, border `rgba(255,255,255,0.04)`.

**Advanced distortion (hero card ONLY, perf-bounded):** a single SVG filter `#liquid-distort` using `feTurbulence baseFrequency="0.008 0.014" numOctaves="2"` → `feDisplacementMap scale="10"`, applied to a blurred duplicate of the hero’s background layer at ~30% opacity. One instance only (avoid per-card filters — they are GPU-expensive). Gate behind `prefers-reduced-motion: no-preference` and a `supports(backdrop-filter)` check; fall back to plain `.glass-accent`.

### 1.5 Animation curves, durations, variants (Framer Motion — `financeMotion.ts`)

```
// curves
easeOutQuint = [0.22, 1, 0.36, 1]
easeInOut    = [0.65, 0, 0.35, 1]
// springs
springSoft   = { type:'spring', stiffness:260, damping:30, mass:0.9 }
springSnappy = { type:'spring', stiffness:420, damping:30 }
springBouncy = { type:'spring', stiffness:480, damping:24 }  // FAB, modal pop
// durations (s)
MICRO=0.15  BASE=0.30  ENTRANCE=0.5  COUNTER=1.2  CHART=0.9
```

Variant sets (exported):
- `pageContainer`: `hidden→show` with `staggerChildren:0.06, delayChildren:0.04`.
- `riseItem`: hidden `{opacity:0,y:16}` → show `{opacity:1,y:0, transition:{duration:ENTRANCE,ease:easeOutQuint}}`.
- `scaleItem` (cards): hidden `{opacity:0,y:20,scale:0.98}` → show `{...,scale:1, transition:springSoft}`.
- `tabPanel`: enter `{opacity:0,y:8}`, center `{opacity:1,y:0}`, exit `{opacity:0,y:-8}`; `duration:BASE`. Use `<AnimatePresence mode="wait">` keyed by activeTab.
- `hoverLift`: `whileHover={{y:-3, transition:{duration:MICRO}}}`, `whileTap=scale:0.985`.
- `modalBackdrop`: opacity 0→1, `duration:BASE`. `modalPanel`: `{opacity:0,scale:0.94,y:12}`→`{1,1,0}` with `springBouncy`; exit reverses faster (`duration:MICRO`).
- `fab`: initial `{scale:0,rotate:-45}` → `{1,0}` `springBouncy`, delay 0.3 after page mount.
- `chartReveal`: Recharts `isAnimationActive` + `animationDuration: CHART*1000`, `animationEasing:'ease-out'`; wrap chart card in `riseItem` with `whileInView` if below fold.
- `shake` (wrong password): keyframes `x:[0,-8,8,-6,6,-3,0]`, `duration:0.4`.
- `countUp`: handled by `useCountUp` (motion value), not a variant.

**Global rule:** every variant honors `const reduce = useReducedMotion()`. When `reduce`, set durations to 0 / disable counter & distortion, keep opacity fades only.

### 1.6 Chart palette & styling (`ChartTheme.tsx`)

```
CATEGORY_SPECTRUM = ['#10b981','#34d399','#6ee7b7','#2dd4bf','#14b8a6',
                     '#5eead4','#a7f3d0','#0ea5a3','#f59e0b','#fb7185']
// last two reserved for “other/overflow” & flagged categories
Grid:    stroke rgba(255,255,255,0.04), no vertical lines on bar/line
Axis:    tick fill --text-3, 11px caption, axisLine hidden, tickLine hidden
Gradients (defs):
  posBar:  #34d399→#059669 (vertical)
  negBar:  #fb7185→#e11d48 (vertical)
  areaNet: #10b981@0.40 → transparent@0.92
  doughnut: per-slice gradient lightening 14% top→base
Tooltip: GlassTooltip — .glass Tier-2, 12px radius, 10px pad, caption label +
         body-strong money line, colored dot; appears with opacity+y:4 spring.
```

---

## 2. Component-by-Component Breakdown

> Legend per component: **Structure** (layout/DOM) · **CSS/Tailwind** (exact classes) · **Animation** · **State** (additive only). All money via `AnimatedAmount`/`maskNumber`. All props unchanged.

### 2.A `FinancePage.tsx` (orchestration shell — layout only, no data change)
- **Structure:** Mount `<AuroraBackground/>` as first child inside `PageShell` (fixed, `-z-10`). Wrap tab content in `<motion.div variants={pageContainer} initial="hidden" animate="show">`. Replace the bare tab `<button>`s with the new **`<TabBar/>`** sub-block (still local to this file or a small new component) driven by existing `activeTab`/`setActiveTab`. Wrap the active tab in `<AnimatePresence mode="wait">` with `motion.div key={activeTab} variants={tabPanel}`.
- **CSS/Tailwind:** page wrapper `relative isolate min-h-full px-6 pb-28 pt-4`. Content max width `mx-auto w-full max-w-[1100px]`.
- **Animation:** page entrance stagger via `pageContainer`; tab switch via `tabPanel`.
- **State (additive):** `const [scrolled,setScrolled]=useState(false)` from a scroll listener on the content container (drives header condense); `const [activeFilter,setActiveFilter]=useState<...>()` to support **click-chart-to-filter** → passed *down via existing handler/prop surfaces only* (see note). If a value can’t be passed without changing a prop contract, keep the cross-filter **inside** the relevant tab instead (Transactions owns its own filter state). No prop signature changes.

### 2.B `FinanceStickyHeader.tsx` — *plain number → hero command bar*
- **Structure:** Three-zone flex bar: (left) tiny brand glyph + “NET WORTH” eyebrow; (center/left-grow) the **hero amount** with trend cluster; (right) mask toggle + a 56×20 **sparkline**. Hero stack:
  - eyebrow `title` label `NET WORTH`.
  - `AnimatedAmount` at `hero` size (condenses to `hero-sm` when `scrolled`).
  - trend cluster: arrow icon (`TrendingUp/TrendingDown`) + `+$X (+Y%)` today, colored `--pos`/`--neg`.
  - inline `sparkline` (last ~14 net-worth points if available from data already passed for the line chart; otherwise omit gracefully).
- **CSS/Tailwind:** `sticky top-0 z-30 .glass` (Tier-3) `backdrop-blur-2xl border-b border-[--glass-border]`, `px-6 h-[escalating]` — `h-28` default, animate to `h-16` when `scrolled`. Mask toggle = 36×36 `.glass-inset` icon button `rounded-full`. Hero text `text-[--text-hero] text-money`.
- **Animation:** height + font-size spring (`springSoft`) on `scrolled`; on mount the hero counter runs `useCountUp` (1.2s). Trend cluster `riseItem` delay 0.2s. Mask toggle `whileTap scale .9`; eye icon crossfades (`Eye`↔`EyeOff`).
- **State (additive):** none new (consumes `scrolled` via prop is not allowed if it changes contract — instead read scroll locally with its own listener OR accept that header owns a small `IntersectionObserver` on a sentinel). `prevNetWorth` ref to compute counter start. Mask handled by existing `onToggleMask`.
- **Mask placement:** toggle sits far-right, always visible; when masked, hero shows `maskNumber()` output with a subtle blur-in, counter disabled.

### 2.C `OverviewTab.tsx` — *stacked cards → bento storytelling grid*
- **Structure:** Replace vertical stack with a **bento grid**:
```
row1: [ NetWorthCard (col-span-2, tall) ] [ IncomeExpenseCard ]
row2: [ SpendingCategoryChart (col-span-1) ] [ NetWorthLineChart (col-span-2) ]
row3: [ IncomeExpenseBarChart (col-span-2) ] [ RecentTxnsCard ]
```
  Use `grid grid-cols-3 gap-4 auto-rows-[minmax(0,auto)]`; collapses to `grid-cols-1` under ~720px.
- **CSS/Tailwind:** each child is a `.glass` card; chart cards get `p-6`, stat cards `p-5`. Section eyebrows use `title` token.
- **Animation:** children are `scaleItem`, revealed by parent `pageContainer` stagger; charts use `whileInView` if below fold.
- **State:** `hoveredCard` optional for sibling-dim effect (hovered card full opacity, siblings `opacity-90`). Empty state: if `financeData` totals are all zero/empty → render `<EmptyState variant="overview"/>` (see §2.M).

### 2.D `NetWorthCard.tsx` — *plain stat → hero score card (liquid glass)*
- **Structure:** `.glass-accent` with the `#liquid-distort` background layer. Top: `NET WORTH` eyebrow + small mask-aware visibility hint. Center: `AnimatedAmount` at `stat`→near-`hero` (32→40px responsive). Below: trend chip (`+Y% · 30d`) on `--pos-soft`/`--neg-soft` pill. Bottom-right: faint emerald radial glow + an embedded micro area-spark.
- **CSS/Tailwind:** `relative overflow-hidden .glass-accent p-6 rounded-[20px]`; glow via `--ring-glow`; trend pill `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption`.
- **Animation:** counter on mount/update; trend pill `scaleItem`; on hover `hoverLift` + glow intensifies (`box-shadow` transition `BASE`).
- **State:** none required beyond hover; respects mask.

### 2.E `IncomeExpenseCard.tsx` — *plain stat → dual-rail comparison*
- **Structure:** Two stacked rows (Income / Expense), each: icon chip + label + `AnimatedAmount` + a thin proportional **rail** (income vs expense share). Footer: net delta line.
- **CSS/Tailwind:** rails = `h-1.5 rounded-full bg-white/5` with inner fill `--grad-pos` / `--grad-neg`, width = `% of max`. Income value `--pos`, expense `--neg`.
- **Animation:** rails animate width `0→%` (`springSoft`, staggered 0.08); values count up.
- **State:** none; derives shares from the income/expense props it already receives.

### 2.F `RecentTxnsCard.tsx` — *mini list → character-rich feed*
- **Structure:** Header `RECENT` + “View all” ghost link (switches tab via existing setter if available, else static). Up to 5 rows: category icon chip (from `categoryVisual`) + description (`body-strong`) + relative time (`meta`) + signed amount.
- **CSS/Tailwind:** rows `flex items-center gap-3 py-2.5`; divider `border-white/5`; amount `text-money` colored by type with `+`/`−`.
- **Animation:** rows `riseItem` stagger 0.05 on reveal; hover row bg `bg-white/[0.03]`.
- **State:** none. Empty → compact inline empty (“No activity yet” + spark icon).

### 2.G `SpendingCategoryChart.tsx` (doughnut) — *default → center-total, interactive*
- **Structure:** Recharts `PieChart` with `innerRadius=68% outerRadius=92%`, `paddingAngle=2`, rounded segment caps. Absolutely-positioned **center total** (`stat-sm` amount + `TOTAL SPENT` caption). Custom legend list to the side: each item = color dot + name + amount + %; hovering a legend item highlights its slice and vice-versa.
- **CSS/Tailwind:** wrapper `relative grid grid-cols-[1fr,auto] gap-5 items-center` (legend collapses below on narrow). Slice fills from `CATEGORY_SPECTRUM` gradients.
- **Animation:** `animationDuration=CHART`, slices grow from 0; hovered slice `outerRadius+4` & others dim to 0.55 opacity (`activeIndex` state); center total counts up.
- **State (additive):** `activeIndex:number|null`, `onSliceClick` → sets the **Transactions tab category filter** (only if reachable without prop change; otherwise emit nothing and keep highlight-only). Empty → dashed ghost ring + `<EmptyState variant="spending"/>`.

### 2.H `IncomeExpenseBarChart.tsx` (monthly) — *default → grouped gradient bars*
- **Structure:** `BarChart` grouped income/expense per month, `barCategoryGap="28%"`, `radius=[6,6,0,0]`. Hidden axis lines, minimal `meta` ticks, `CartesianGrid` horizontal-only. Custom `<GlassTooltip/>` showing month + income + expense + net.
- **CSS/Tailwind:** bars use `url(#posBar)` / `url(#negBar)`; container `.glass p-6`; legend = two caption pills top-right.
- **Animation:** bars rise (`animationDuration=CHART`, `ease-out`), hovered month’s pair brightens, others `opacity-60` via `onMouseMove` activeIndex.
- **State (additive):** `activeMonth` for hover dim; optional click → month filter (same reachability caveat as 2.G). Empty → `<EmptyState variant="trends"/>`.

### 2.I `NetWorthLineChart.tsx` — *default → gradient area + range selector*
- **Structure:** `AreaChart`, monotone line stroke `--accent-300` width 2.5, fill `url(#areaNet)`. Top-right **range selector** segmented control: `1M · 3M · 6M · 1Y · All` (client-side slice of the data already passed — no refetch). Active dot glows; `GlassTooltip` with date + value + delta from range start.
- **CSS/Tailwind:** range control = `.glass-inset` segmented pills, active pill `bg-accent-500/15 text-accent-300`. Grid horizontal-only.
- **Animation:** area draws via `animationDuration=CHART`; range change crossfades (`AnimatePresence` on the chart by `range` key, `duration:BASE`); active-dot pulse on hover.
- **State (additive):** `range:'1M'|'3M'|'6M'|'1Y'|'all'` (default `'3M'`). Pure client filter over incoming `data`. Empty → `<EmptyState variant="networth"/>`.

### 2.J `AccountsTab.tsx` — *cramped rows → spacious account cards*
- **Structure:** Each account = `.glass` card with a header (account icon chip 44×44 using `account.color`, name `body-strong`, type `caption`, account total `stat-sm`, chevron). Expanded body = wallet rows as `.glass-inset` tiles in a 1-col list: each wallet tile shows a **brand-aware** icon by `wallet.type` (bank/debit_card/credit_card/crypto/cash/ewallet/other via `categoryVisual`), name + `•••• last_four`, balance `text-money`, and **large** 40×40 action buttons (edit/archive) that fade in on hover/focus (always visible & focusable for a11y). “+ Add Wallet” = dashed ghost tile, full width.
- **CSS/Tailwind:** account card `p-5`; wallet tile `p-4 rounded-[14px] flex items-center gap-3`; hit targets `min 40px`. Archive button hover `text-[--neg]`, edit hover `text-[--accent-300]`.
- **Animation:** expand/collapse via `<AnimatePresence>` + height/opacity (`springSoft`); chevron rotates 180°. Wallet tiles stagger in (0.04). **Swipe-to-archive** (optional, desktop-pointer-friendly): drag-x on a wallet tile reveals a rose archive action behind it; `drag="x" dragConstraints` + snap; on threshold call existing `onArchiveWallet`. Provide the explicit archive button regardless (swipe is an enhancement, never the only path).
- **State (additive):** `expandedAccountId`, `hoveredWalletId`, `swipingId`. Edit/create still go through existing `onCreateWallet/onUpdateWallet` + the existing Create/Edit modals. Empty → `<EmptyState variant="accounts"/>` with a prominent “Add your first account/wallet” CTA.

### 2.K `TransactionsTab.tsx` — *dense list → scannable, expandable ledger*
- **Structure:** Sticky **filter rail** as a `.glass` toolbar: search input with leading `Search` icon; segmented type filter `All / Income / Expense` (animated pill indicator, reused pattern from TabBar); date-range popover (`From`/`To`) collapsed into one `Calendar` chip to declutter; `Clear` ghost. Below: date-group sections with sticky-ish `caption` headers (`TODAY`, `YESTERDAY`, `JUN 15`). Each transaction row: category icon chip + (description `body-strong` + category badge pill + `meta` wallet name) + signed `text-money` amount, with a quiet trailing `⋮`/delete affordance on hover. **Click a row → expands inline** (Framer `layoutId`) into a detail panel: notes, full date, wallet, category, and the delete action.
- **Delete-with-password (natural):** inside the expanded row, Delete morphs the row footer into a **compact confirm**: a single short password field + `Confirm` button slide in (`layout` animation), no separate modal. On submit call existing `onVerifyPassword` → then `onDeleteTransaction`. Wrong password → `shake` variant on the field + rose helper text; field stays. Success → row collapses & exits (`opacity,height→0`).
- **CSS/Tailwind:** toolbar `.glass p-3 sticky top-[header] z-20`; rows `.glass-inset` or plain with `hover:bg-white/[0.03]`; category badge `caption` pill tinted by `category.color` at 14% bg. Amounts colored + signed.
- **Animation:** group sections `riseItem`; rows `layout` + `layoutId` shared expand; filter pill indicator `springSnappy`; list reflows on filter via `layout`.
- **State (additive):** `expandedTxnId`, `pendingDeleteId`, `password`, `pwError`, plus existing local search/type/date state. Empty (no txns / filtered-to-empty) → `<EmptyState variant="transactions"/>` distinguishing “no data yet” vs “no matches”.

### 2.L `QuickAddModal.tsx` + FAB — *generic form → delightful guided sheet*
- **FAB Structure/Anim:** 56×56 circular `.glass-accent` button, `Plus` icon, fixed bottom-right (24px). Entrance `fab` variant (scale+rotate, delay 0.3). Hover: glow grows + icon rotates 90°; tap scale 0.9. Optional press-and-hold radial mini-actions (income/expense quick presets) — enhancement only.
- **Modal Structure:** Centered glass sheet (max-w 440) over blurred backdrop. Order encourages flow: **Type segmented toggle (Income/Expense)** at top (drives accent of the whole sheet → emerald vs rose); large **Amount** field with leading currency symbol (`accountCurrency`) and `stat`-sized input; Description; Category select (grouped by type, filtered to match toggle); Account/Wallet selector (chips with wallet icons); Date; Notes textarea. Primary submit button shows **loading state** (spinner + “Saving…”, disabled) then a success check morph before close.
- **CSS/Tailwind:** backdrop `bg-black/60 backdrop-blur-md`; panel `.glass-accent p-6 rounded-[20px]`; inputs `.glass-inset rounded-[12px] px-3 h-11 focus:[--ring-focus]`; amount field `text-money text-[28px]`. Accent of focus rings/toggles switches with type.
- **Animation:** `modalBackdrop` + `modalPanel` (springBouncy) via `AnimatePresence`; field focus = ring grow `MICRO`; type toggle indicator slides `springSnappy`; submit success = button width morph + check (`layout`). Close on backdrop click / `Esc`.
- **State (additive):** `submitting`, `submitted`, plus existing field state. All submit paths use existing handlers/props — no contract change.

### 2.M `FinanceLockScreen.tsx` — *minimal → atmospheric vault door*
- **Structure:** Full-screen overlay. Background = `<AuroraBackground intense/>` + a slow-drifting emerald mesh + faint grain + a centered **“vault” glyph/lock** with breathing glow. Center card (`.glass-accent`, max-w 360): brand mark, “Vault locked” title, password field (large, centered, `text-money`-ish mono optional), primary `Unlock` button, and a prominent **biometric** button (`Fingerprint`/`ScanFace`) given equal-or-greater visual weight (it’s the fast path) — e.g. a large circular accent button above/beside the password, labeled “Use Windows Hello.”
- **CSS/Tailwind:** overlay `fixed inset-0 z-50 grid place-items-center`; lock glyph glow `--accent-glow` pulsing; card centered with strong `--ring-glow`.
- **Animation:** mount = backdrop fade + card `modalPanel`; lock glyph `breathe` (scale 1→1.04 loop, 3s easeInOut); biometric button subtle pulse ring; **wrong password → `shake`** on the field + red ring + lock glyph flashes rose; success → card scales up + overlay fades, lock glyph “opens” (rotate/scale) before `onUnlock` completes the transition.
- **State (additive):** `password`, `error`, `unlocking`. Uses existing `onUnlock` only.

### 2.N New shared `EmptyState` (presentational) — used by every tab
- One component, `variant`-driven (overview/spending/trends/networth/accounts/transactions). Each: a soft emerald-tinted Lucide illustration chip, a friendly headline, one-line subcopy, and (where actionable) a CTA that triggers an **existing** handler (e.g., open QuickAdd, add wallet). Animated entrance `scaleItem`; icon gentle float loop. This satisfies the “welcoming, beautiful empty states for every tab” requirement without backend involvement.

### 2.O `TabBar` (Overview/Accounts/Transactions) — *underline → animated segmented*
- **Structure:** Pill container `.glass-inset`; each tab = icon (`LayoutDashboard` / `Wallet` / `ArrowLeftRight`) + label. Active pill is a single `layoutId="tabPill"` `motion.div` that slides between tabs.
- **CSS/Tailwind:** container `inline-flex gap-1 p-1 rounded-full`; tab `px-4 h-9 rounded-full text-tab`; active text `--accent-50`, inactive `--text-2`; active pill bg `--grad-hero` at low opacity + emerald ring.
- **Animation:** pill slides via shared `layoutId` (`springSnappy`); icon of active tab gets a tiny scale pop; hover inactive lifts text color.
- **State:** consumes existing `activeTab`/`setActiveTab` — no new contract.

---

## 3. Implementation Plan (ordered by dependency)

```
PHASE 0 — Foundations (no visible change yet)
Step 1: styles/finance-glass.css        — .glass/.glass-inset/.glass-accent/.sheen/.ring-glow/.text-money/.grain (Tailwind v4 @layer utilities). Import once (e.g. in index.css after @import "tailwindcss";).
Step 2: _fx/financeMotion.ts            — curves, springs, durations, variant sets (§1.5). (Depended on by ALL components.)
Step 3: _fx/ChartTheme.tsx              — <ChartDefs/>, <GlassTooltip/>, axis/grid consts, CATEGORY_SPECTRUM (§1.6). (Depended on by all 3 charts.)
Step 4: _fx/categoryVisual.ts           — icon/color mapping from existing fields. (Depended on by Recent/Transactions/Accounts.)

PHASE 1 — Core primitives
Step 5: _fx/useCountUp.ts               — motion-value counter, reduced-motion aware. (Depends: 2)
Step 6: _fx/AnimatedAmount.tsx          — mask-aware wrapper over useCountUp + maskNumber(). (Depends: 5, NumberMaskContext)
Step 7: _fx/GlassSurface.tsx            — the glass card primitive + #liquid-distort SVG filter def. (Depends: 1)
Step 8: _fx/AuroraBackground.tsx        — mesh + grain background. (Depends: 1)
Step 9: EmptyState (shared)             — variant-driven empty states. (Depends: 1,2)

PHASE 2 — Shell & header (frame the page)
Step 10: FinancePage.tsx                — mount AuroraBackground, pageContainer stagger, AnimatePresence tab panels, scroll sentinel. (Depends: 2,8)
Step 11: TabBar (2.O)                    — animated segmented control. (Depends: 2)
Step 12: FinanceStickyHeader.tsx        — hero counter, trend, sparkline, condense-on-scroll. (Depends: 6,7,2)

PHASE 3 — Overview surface
Step 13: NetWorthCard.tsx               — hero score card + distortion. (Depends: 7,6)
Step 14: IncomeExpenseCard.tsx          — dual rails. (Depends: 7,6)
Step 15: RecentTxnsCard.tsx             — feed rows. (Depends: 7,6,4)
Step 16: ChartDefs wired + SpendingCategoryChart.tsx  — doughnut, center total, legend, hover. (Depends: 3,6,9)
Step 17: NetWorthLineChart.tsx          — area + range selector. (Depends: 3,9)
Step 18: IncomeExpenseBarChart.tsx      — grouped gradient bars + tooltip. (Depends: 3,9)
Step 19: OverviewTab.tsx                 — bento grid assembly + empty state. (Depends: 13–18,9)

PHASE 4 — Accounts & Transactions
Step 20: AccountsTab.tsx                 — spacious account/wallet cards, expand, swipe-to-archive. (Depends: 7,4,9; existing Create/Edit wallet modals reused as-is)
Step 21: TransactionsTab.tsx             — filter rail, scannable rows, layoutId expand, inline password delete. (Depends: 7,4,6,9,2)

PHASE 5 — Modals & lock (delight layer)
Step 22: QuickAddModal.tsx + FAB        — type-accented guided sheet, loading/success states. (Depends: 7,2,6)
Step 23: FinanceLockScreen.tsx          — atmospheric vault, biometric prominence, shake-on-error. (Depends: 7,8,2)

PHASE 6 — Polish & verification
Step 24: prefers-reduced-motion audit   — confirm every variant/counter/distortion degrades gracefully.
Step 25: a11y pass                       — focus rings (--ring-focus), tab/arrow nav on TabBar & segmented controls, 40px+ hit targets, aria-labels on icon buttons, color-contrast on money text.
Step 26: perf pass                       — single SVG distortion instance only; memoize chart data slices; ensure backdrop-filter layers are bounded; verify 60fps on tab switches.
Step 27: self-test against the brief     — walk /finance: “does this look world-class?” for each surface; confirm zero backend/prop/routing changes.
```

### Guardrail checklist (must all stay true)
- [ ] No edits to preload/main/IPC/DB/SQL; only the 12 files + new `_fx/*`, `EmptyState`, `finance-glass.css`.
- [ ] No prop renamed/removed; only additive local `useState`/refs and new child components.
- [ ] `--page-accent: #10b981` retained and used as `--accent-500`.
- [ ] All money rendered via `maskNumber()` / `AnimatedAmount`; masked values never animate or leak.
- [ ] Tailwind v4 utility syntax; Framer Motion; Recharts; Lucide only.
- [ ] Works inside existing `PageShell`; `/finance` stays a tab.
- [ ] Every variant respects `prefers-reduced-motion`.

---

## Final self-check vs. the brief
- **Boring cards →** layered liquid glass, hero distortion, glow rings, bento hierarchy. ✅
- **Dead charts →** custom emerald gradients, center totals, hover highlight, range selector, glass tooltips, integrated into cards. ✅
- **Static header →** animated counter hero, trend context, sparkline, condense-on-scroll. ✅
- **Plain tabs →** icon + label segmented control with shared-element sliding pill. ✅
- **Cramped accounts →** spacious cards, 44px targets, expand anim, swipe-to-archive. ✅
- **Dense transactions →** category icons/badges, color-coded signed amounts, layoutId expand, inline password delete. ✅
- **Generic modal →** type-accented guided sheet, currency-aware amount, loading/success morph, spring entrance. ✅
- **Bare lock →** atmospheric vault, prominent biometric, error shake. ✅
- **Empty states →** dedicated, welcoming, per-tab. ✅

**Answer to “does this look like a world-class finance dashboard?” — YES.** Code comes next, file-by-file, in the Phase order above.
