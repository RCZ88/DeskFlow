# RESULT.md — DeskFlow Dashboard Redesign

> Definitive implementation spec. One solution, no options. Grounded entirely in `CONTEXT_BUNDLE.md` (real `src/` code, tokens, IPC shapes, and schema).
> Scope discipline: **no full rewrite of `DashboardPage.tsx`**, **no new IPC channels or DB migrations**, **no new npm deps**. The only backend touch is a single additive extension to the existing `getHomeSummary` return (§13), and it is optional/feature-flagged.

---

## 0. Design Thesis

The dashboard must answer one question in a single glance: **“What should I know and do right now?”**

Today it fails because every section has equal visual weight, so nothing has priority. The redesign imposes a strict **three-band hierarchy** with deliberately *different* visual rhythm per band (per `design-taste` anti-repetition), and promotes Deep Focus from a lonely 1/3 sidebar widget to a first-class member of a unified **Productivity & Focus** zone.

Three bands, three jobs:

| Band | Question it answers | Visual rhythm |
|---|---|---|
| **1 — Hero** | “What’s happening *right now*?” | Large, calm, 3 balanced focal points |
| **2 — Summary Strip** | “What do I need to know across modules?” | Dense, scannable, 4 equal cards + sparklines |
| **3 — Productivity & Focus** | “What should I *do*, and how did I do?” | Asymmetric 2-col: action-heavy left, context-light right |

---

## 1. Design Language (tokens applied) + Skills/MCP Application Log

All values below are taken verbatim from `CONTEXT_BUNDLE.md §6–7`. No new tokens are introduced.

- **Surfaces:** `bg-zinc-950` base, glass = `bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50`.
- **Accent:** page accent `pink-500` (`--page-accent`), hover `pink-400`, active `pink-600`.
- **Semantic:** `cyan-400` info, `emerald-400` success, `amber-400` warning, `rose-400` fail.
- **Geometry:** `rounded-xl` (12px) max, `p-5` card padding, 8px spatial grid.
- **Type scale:** Page title 18/600 · Section h2 15/600 · Card title 13/600 · Body 13/400 · Body+ 14/400 · Meta 12/400 · Badge 11/500 · Display 24–32/700. Body = Geist, mono = JetBrains Mono.
- **Motion:** 150ms micro, 250ms normal, 400ms narrative; easing `cubic-bezier(0.16, 1, 0.3, 1)`; **all motion wrapped in `prefers-reduced-motion` guards**.

### Skill application log (per `CONTEXT_BUNDLE.md §8`, all mandatory)

| Skill | Where applied in this spec |
|---|---|
| `frontend-external-infra` | §15 MCP sourcing log + re-skin notes on every sourced component; Anti-Slop Checklist is the final gate (§15). |
| `humancentred-UIUX` | Every data component ships all 4 states (§11); progressive disclosure = heatmap/orbit demoted to drill-downs (§2 Band 3). |
| `frontend-design` | Tokens in §1; `rounded-xl`/`p-5` enforced; no pure black, no box-shadow elevation (glass layers only). |
| `impeccable` | 8px grid, 44px touch targets on all controls, plain-language UX writing (§10/§11), 27-antipattern check in §15. |
| `motion-alive` | Liveliness L2+ taxonomy mapped in §8 (micro 150 / attention 250 / narrative 400) + reduced-motion. |
| `ui-ux-pro-max` | Developer-tool density rules (Band 2/3) + financial-UI lock/mask rules (Finance card, §11). |
| `design-taste` | Anti-repetition: each band uses a *different* card pattern & rhythm (§0 table, §2). |

### MCP sourcing plan (per `CONTEXT_BUNDLE.md §8`, all queried — see §15 for the full re-skin log)

shadcn (card/tabs/progress/tooltip/separator) · Magic UI (Number Ticker, Border Beam, Blur Fade, Confetti, Shine Border) · @21st-dev/magic (focus timer card, sparkline, circular progress variations) · Lucide (all icons) · React Bits (animated text/number) · Iconify (fallback only) · Unsplash (not used — no photography needed in a data tool).

---

## 2. Layout Architecture — 3-Band Design

### Root grid

```tsx
// DashboardPage.tsx return (orchestrator only)
<div className="mx-auto w-full max-w-[1400px] px-6 pb-16 space-y-8">
  <DashboardHeader />        {/* "Lock-In" + date, unchanged */}
  <HeroBand ... />           {/* Band 1 */}
  <SummaryStrip ... />       {/* Band 2 */}
  <ProductivityFocusZone ... /> {/* Band 3 */}
  <ModalPortal ... />        {/* heatmap / orbit / day-detail, unchanged behavior */}
</div>
```

`space-y-8` (32px) enforces band separation; each band owns its internal grid so rhythms differ.

### Band 1 — Hero (“Today, so far”)

**Decision (definitive):** asymmetric 3-column grid where the **stopwatch gets 5/12, FunFactHero 4/12, GoalRing 3/12**. This makes the timer the primary focal point *without* the old 2/3 dominance, keeps the fun-fact readable, and lets the ring sit at the **same vertical level** (fixes “why is total focus beneath it” — GoalRing is now a peer column, never stacked under the fun-fact).

```tsx
// HeroBand.tsx
<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
  <GlassCard variant="elevated" accent="pink" className="lg:col-span-5"><StopwatchTimer/></GlassCard>
  <GlassCard variant="default"  accent="none" className="lg:col-span-4"><FunFactHero/></GlassCard>
  <GlassCard variant="default"  accent="none" className="lg:col-span-3 grid place-items-center"><GoalRing/></GlassCard>
</div>
```

- `items-stretch` = all three cards equal height (kills the ragged-bottom look the user complained about).
- **Breakpoints:** `<1024px` → single column, order: Stopwatch → GoalRing → FunFactHero (ring promoted above the fun-fact on mobile because it’s the headline metric). `≥1024px` → 5/4/3.

**Stopwatch responsive font (fixes “width like that” / 120px overflow):** clamp the display so it never overflows the 5/12 column.

| Viewport | Timer font |
|---|---|
| `≥1536px` (2xl) | `text-7xl` (72px) |
| `1280–1535px` (xl) | `text-6xl` (60px) |
| `1024–1279px` (lg) | `text-5xl` (48px) |
| `<1024px` | `text-6xl` (60px, full-width column) |

Implemented with `clamp()` utility: `style= fontSize: 'clamp(2.75rem, 5vw, 4.5rem)' ` on the `font-mono` timer so it fluidly fits and never wraps.

### Band 2 — Cross-Module Summary Strip

```tsx
// SummaryStrip.tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <SummaryCard title="Activity" .../>
  <SummaryCard title="Finance" masked={financeLocked} .../>
  <SummaryCard title="Learn" .../>
  <SummaryCard title="External" .../>
</div>
```

- Unified strip feel: shared `gap-4`, identical card height (`min-h-[132px]`), one hairline `Separator` is *not* used between them — instead the equal grid + shared accent-less glass reads as one strip.
- **Responsive:** `≥1024px` 4-across · `640–1023px` 2×2 · `<640px` 2×2 (never a lonely vertical stack — keeps the “strip” gestalt).

### Band 3 — Productivity & Focus zone

**Decision (definitive):** a 2-column asymmetric zone. **Left 7/12 = the action + primary focus experience** (Deep Focus, prominent). **Right 5/12 = context** (rankings + recent + pinned). Heatmap and OrbitSystem are **demoted to drill-down cards** with “View” buttons that open the existing modals.

```tsx
// ProductivityFocusZone.tsx
<section className="space-y-4">
  <h2 className="text-[15px] font-semibold text-zinc-100">Productivity & Focus</h2>
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
    {/* LEFT — action */}
    <div className="lg:col-span-7 space-y-5">
      <DeepFocusPanel />          {/* prominent, full-width of the 7-col */}
      <div className="grid grid-cols-2 gap-4">
        <DrillDownCard kind="heatmap" onOpen={openHeatmap}/>
        <DrillDownCard kind="ecosystem" onOpen={openOrbit}/>
      </div>
    </div>
    {/* RIGHT — context */}
    <div className="lg:col-span-5 space-y-4">
      <FocusRankingsCard />       {/* 3 stats → 1 card + period toggle */}
      <PinnedActivities collapsible/>
      <RecentSessions condensed/>
    </div>
  </div>
</section>
```

- **Breakpoints:** `<1024px` → single column, order: DeepFocusPanel → FocusRankings → Recent → Pinned → drill-downs (action first).
- DeepFocusPanel spans the full 7-col left rail = it now has real visual weight (fixes “deep focus looks really bad / tacked on”).

---

## 3. Component Extraction Plan + Component Tree

**Principle:** `DashboardPage.tsx` stays but becomes a **layout orchestrator**. It keeps the props contract with `App.tsx` (`timerState`, `activityFeed`, `externalActivities`, etc.) and passes data down. No parent contract changes.

### New files

| File | Responsibility | Key props / exports |
|---|---|---|
| `src/pages/dashboard/HeroBand.tsx` | Band 1 layout wrapper | `{ timerState, funFact, goal }` |
| `src/pages/dashboard/StopwatchTimer.tsx` | Extracted giant timer (status dot, HH:MM:SS, activity name, helper line) | `{ displayTime, status, activityName, deepFocusActive }` |
| `src/pages/dashboard/SummaryStrip.tsx` | Band 2 wrapper; maps summary → 4 cards | `{ summary, loading, error, onOpenPage }` |
| `src/components/insights/Sparkline.tsx` | Compact SVG trend line (new) | see §8 spec |
| `src/pages/dashboard/ProductivityFocusZone.tsx` | Band 3 wrapper | `{ focus, rankings, recent, pinned, onOpenHeatmap, onOpenOrbit }` |
| `src/components/focus/DeepFocusPanel.tsx` | Prominent Deep Focus experience (idle/active/completed) — replaces the lonely `FocusSessionCard` placement | `{ state, history, onStart, onEnd }` |
| `src/components/focus/FocusRankingsCard.tsx` | Best today/week/all-time collapsed into 1 card + period toggle | `{ rankings, period, onPeriodChange }` |
| `src/components/dashboard/DrillDownCard.tsx` | Demoted heatmap/orbit teaser + “View” CTA | `{ kind, preview?, onOpen }` |
| `src/hooks/useHomeSummary.ts` | Fetch + cache `dashboard:home-summary`, states, event-driven refresh | returns `{ data, loading, error, refresh }` |
| `src/hooks/useDeepFocus.ts` | Typed wrapper over `useFocusSession` for Band 3 | returns `{ state, history, start, end, isActive, remainingLabel }` |

### Stays in `DashboardPage.tsx`

- The `App.tsx` prop plumbing and the localStorage stopwatch persistence bridge.
- Modal open/close state + `ModalPortal` (heatmap/orbit/day-detail) — behavior unchanged, only *triggers* move to `DrillDownCard`.
- The single 1s stopwatch tick interval (§5).

### Component tree

```
DashboardPage (layout orchestrator)
├─ useHomeSummary()            ← dashboard:home-summary
├─ useDeepFocus()              ← wraps useFocusSession (focus:* IPC + events)
├─ DashboardHeader            (unchanged)
├─ HeroBand
│  ├─ StopwatchTimer          ← extracted from inline ~2280-2445
│  ├─ FunFactHero             (existing, unchanged)
│  └─ GoalRing                (existing, unchanged)
├─ SummaryStrip
│  ├─ SummaryCard (Activity)  + Sparkline
│  ├─ SummaryCard (Finance)   + Sparkline [masked if locked]
│  ├─ SummaryCard (Learn)     + Sparkline
│  └─ SummaryCard (External)  + Sparkline
├─ ProductivityFocusZone
│  ├─ DeepFocusPanel          ← replaces FocusSessionCard placement
│  ├─ FocusRankingsCard       ← collapses 3 stats → 1 card + toggle
│  ├─ PinnedActivities        (existing, made collapsible)
│  ├─ RecentSessions          (existing, condensed)
│  └─ DrillDownCard ×2        (heatmap, ecosystem)
└─ ModalPortal
   ├─ ExpandedHeatmap         (existing)
   ├─ ExpandedSolarSystem     (existing)
   └─ DayDetailPopup          (existing)
```

---

## 4. State Management Refactor

### `useHomeSummary.ts`

```ts
export interface HomeSummary {
  focusMinutes: number; walletCount: number; totalBalance: number;
  dueReviews: number; sleepSeconds: number; financeLocked: boolean;
  // optional additive extension (§13), guarded:
  trends?: { focus?: number[]; balance?: number[]; reviews?: number[]; sleep?: number[] };
}

export function useHomeSummary() {
  const [data, setData] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const api = (window as any).deskflowAPI;
    if (!api?.getHomeSummary) return;             // bridge-not-ready = no-op (see §6)
    try {
      const res = await api.getHomeSummary();
      setData(res); setError(null);
    } catch (e: any) { setError(e?.message ?? 'Failed to load summary'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();                                    // eager on mount
    const api = (window as any).deskflowAPI;
    // event-driven refresh — NO polling interval
    const off = api?.onTrackingUpdate?.(() => refresh());
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { off?.(); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);

  return { data, loading, error, refresh };
}
```

### `useDeepFocus.ts` (wrapper over existing `useFocusSession`)

```ts
export function useDeepFocus() {
  const s = useFocusSession();          // existing hook: focus:* IPC + focus:state/ended events
  const remainingLabel = useMemo(
    () => formatClock(s.state.remainingSec), [s.state.remainingSec]);
  return {
    state: s.state,                     // FocusPublicState { active, endsAt, remainingSec, strictness, paused }
    history: s.history,                  // ≤ 50 sessions
    start: s.start, end: s.end,
    isActive: s.state.active,
    remainingLabel,
  };
}
```

`DashboardPage` calls both hooks once and threads their outputs into the three band wrappers. No band fetches on its own.

---

## 5. Performance Fix — Kill the 7-Interval Polling Storm

**Target end-state: exactly one `setInterval`.**

| Current interval | Fate | Replacement |
|---|---|---|
| 1s stopwatch tick | **KEEP (the one)** | drives count-up display only |
| 1s “elapsed” tick | **MERGE** | fold into the single 1s tick (compute both from one tick) |
| 5s data refetch | **REMOVE** | `useHomeSummary` refreshes on `onTrackingUpdate` event + visibility |
| periodic full refetch | **REMOVE** | on-demand `refresh()` + event-driven |
| Deep Focus countdown poll | **REMOVE** | derive from `focus:state` event’s `remainingSec`; tick locally off the *same* 1s interval when `isActive` |
| foreground poll | **REMOVE** | already event-driven via `onForegroundChange` |
| rankings/recent refresh | **REMOVE** | fetch on mount + on `focus:ended` event |

**The single interval:**

```ts
useEffect(() => {
  const id = setInterval(() => {
    setStopwatchDisplay(computeElapsed());        // count-up
    if (deepFocus.isActive) setFocusDisplay(computeRemaining()); // count-down, same tick
  }, 1000);
  return () => clearInterval(id);
}, [deepFocus.isActive]);
```

Everything else is push (IPC events) or pull-on-demand (mount / visibility / post-action). Net: 7 → 1.

---

## 6. Data Flow & Temperature Check (the 4 required answers)

**1. How does the stopwatch state persist across navigations?**
Unchanged mechanism, formalized: source of truth stays in `App.tsx` (`timerState` prop) mirrored to `localStorage`. `StopwatchTimer` is now **presentational** — it receives `displayTime`/`status`/`activityName` as props and never owns timer state, so navigating away/back re-hydrates from the parent prop instantly (no flced reset).

**2. How does Deep Focus sync whether started from the dashboard or the overlay?**
Single source of truth = the main-process `FocusManager`, broadcast via the `focus:state` event. Both `DeepFocusPanel` (dashboard) and the overlay call the same `focus:start`/`focus:end` IPC and both re-render from the same `focus:state` push through `useDeepFocus`. Starting from either surface updates the other with no dashboard-local state to desync.

**3. How does FunFactHero refresh daily without an interval?**
Fetch on mount + a **date-boundary check on `visibilitychange`**: cache the fact’s `localDate`; when the tab becomes visible, if `todayLocalDate !== cachedDate`, re-call `insights:daily-fun-fact`. No timer needed — the fact only changes at the day boundary, and the user returning to the window is the natural trigger. (Falls back to a re-fetch on any `onTrackingUpdate` too.)

**4. How does the summary strip stay fresh without polling?**
`useHomeSummary` refreshes on three triggers: (a) mount, (b) `onTrackingUpdate` main→renderer event, (c) `visibilitychange` when visible. No `setInterval`. Post-action refreshes (e.g., after `focus:ended`) also call `refresh()` so focus minutes update immediately.

---

## 7. Data-Processing Pipeline (per data point)

Format helpers are pure and shared in `src/lib/format.ts`.

| Display | Source | Transform | Caching | Edge cases |
|---|---|---|---|---|
| **Stopwatch HH:MM:SS** | `App.tsx timerState` + 1s tick | `formatDuration(ms)` → `HH:MM:SS` | live (1s tick) | 0 → `00:00:00` + “Idle” status; paused → freeze value, amber dot |
| **Status dot/label** | `getCurrentForeground` tier + timer paused | map tier→{Locked In/Distracting/Idle/Paused} | event (`onForegroundChange`) | null foreground → “Idle”, zinc dot |
| **FunFactHero** | `insights:daily-fun-fact` | domain→gradient+accent; headline+subtext | mount + day-boundary (§6.3) | null fact → render **nothing** (component already does) but band keeps its column via min-height |
| **GoalRing %** | `getHomeSummary.focusMinutes` | `pct = clamp(round(focus/goal*100),0,100)`; goal=120 | via `useHomeSummary` | focus 0 → ring at 0%, center “0%”; focus>goal → cap ring at 100%, show “✓ Goal met” |
| **Activity card value** | `getHomeSummary.focusMinutes` | `<60 → "{n}min"`, `≥60 → "{h}h {m}m"` | `useHomeSummary` | 0 → empty state (§11) |
| **Activity trend/spark** | `trends.focus[]` (§13) or 2-pt delta | last 7–14 pts; `dir = sign(last-first)` | `useHomeSummary` | <2 pts → hide sparkline, show “New” chip |
| **Finance value** | `getHomeSummary.totalBalance`, `walletCount` | `formatCurrency(totalBalance)` + `"{n} wallets"` sub | `useHomeSummary` | `financeLocked` → masked `••••` + lock icon, sparkline hidden; 0 wallets → empty state |
| **Finance trend/spark** | `trends.balance[]` (§13) | daily balance series | `useHomeSummary` | locked → no spark; missing series → arrow-only from delta |
| **Learn value** | `getHomeSummary.dueReviews` | `"{n} due"` | `useHomeSummary` | 0 → “All caught up” success empty state |
| **Learn trend/spark** | `trends.reviews[]` (§13) | due-count series | `useHomeSummary` | missing → arrow-only |
| **External value** | `getHomeSummary.sleepSeconds` | `formatDuration` → `"{h}h {m}m sleep"` | `useHomeSummary` | 0 → “No sleep logged” empty state |
| **External trend/spark** | `trends.sleep[]` (§13) | sleep-seconds series | `useHomeSummary` | missing → arrow-only |
| **Deep Focus countdown** | `focus:state.remainingSec` + 1s tick | `formatClock(sec)` → `MM:SS` | event + local tick | not active → show idle presets |
| **Focus rankings** | `getProductivitySessions` | max session length per {today/week/all-time} | mount + `focus:ended` | none → “No sessions yet” empty state |
| **Recent sessions** | `activityFeed` prop | last N, condensed rows | prop-driven | empty → “Nothing tracked yet” |

---

## 8. Visual Design Specs

### Hero band

- Stopwatch card: `variant="elevated"` + `accent="pink"` left rail → signals “primary/live.” Status dot 12px, pulses only when “Locked In” (respect reduced-motion → static). Timer `font-mono`, `clamp(2.75rem,5vw,4.5rem)`. Activity name `text-[14px] text-zinc-300 truncate`. Helper line `text-[12px] text-zinc-600`.
- FunFactHero: `variant="default"`, no accent (so it reads as calmer than the timer). Slightly smaller headline than today; keep domain gradient tint but at `/10` opacity max (anti-slop: no heavy glow).
- GoalRing: centered in its column via `grid place-items-center`. Ring 100×100 (existing), center `text-2xl/700`, label `text-[12px] text-zinc-400`, subtitle `“{focus}/{goal}min” text-[11px]`.

### Summary strip — Sparkline component (new)

```tsx
// Sparkline.tsx
interface SparklineProps {
  data: number[];              // 7–14 points, chronological
  width?: number;              // default 96
  height?: number;             // default 28
  color?: string;              // default 'currentColor' (inherits card accent)
  strokeWidth?: number;        // default 1.5
  fill?: boolean;              // default true → faint area under line
}
```

- **Render:** single `<svg width height viewBox="0 0 W H">` with one `<path>` (line) + optional `<path>` area at `fill-opacity: 0.12`. Normalize `data` to `[0..1]` over min/max, map to viewBox with 2px vertical padding. No axes, no labels (it’s a glanceable trend, not a chart).
- **Color:** inherits the card’s semantic accent (emerald=Activity, pink=Finance, cyan=Learn, amber=External) via `currentColor`.
- **Animation:** `motion.path` with `pathLength` 0→1 over 400ms `ease-out` on mount (Magic UI “Blur Fade” rhythm), disabled under reduced-motion (render final path immediately).
- **Data format:** plain `number[]`; degrades: `<2` points → component returns `null` and the card shows a “New” chip instead.

**SummaryCard additions:** extend props with `sparkData?: number[]`. Layout: row 1 = `icon + title` (`text-[13px]/600`), row 2 = `value` (`text-[20px]/700`, or masked), row 3 = `sparkline + trend chip`. Trend chip: `↑/↓/→` (lucide `TrendingUp`/`TrendingDown`/`Minus`) + `trend.label`, colored by direction (up=emerald, down=rose, flat=zinc). **Hover:** `scale 1.02, y -2, 150ms` (matches existing), plus border brightens `zinc-800/50 → zinc-700`.

### Deep Focus zone (Band 3)

**Integration point:** left rail (7/12), top of the Productivity & Focus zone — the first thing after the summary strip. **Visual weight:** between hero and a summary card — it’s a *panel*, full width of the 7-col, `variant="elevated" accent="pink"`.

**States:**
- **Idle:** headline “Start a deep focus session,” three preset chips **25 / 50 / 90 min** (lucide `Timer`), a **strict-mode** toggle (“Block distractions with an overlay”, lucide `ShieldAlert`), primary button `Start {n}-min focus`. Below: a slim 7-day “focus streak” row of dots (completed=emerald, failed=rose, none=zinc-800).
- **Active:** large `MM:SS` countdown (`font-mono text-5xl`), a thin **Border Beam** (Magic UI, re-skinned pink) around the panel to signal “live & protected,” strictness label (“Strict — distractions will prompt you”), and a single `End session` button (destructive-styled, requires 1 confirm tap per financial-UI/`ui-ux-pro-max` confirmation rule). Return-count shown as `“returned N×”` meta.
- **Completed:** brief celebration — **Confetti** (Magic UI) once, `prefers-reduced-motion` → static ✓ badge instead. Then collapses to a compact “Last session: 50min ✓” summary and refreshes history + rankings.

**History display:** below the panel body, up to 5 recent sessions as condensed rows: outcome icon (`CheckCircle2` emerald / `XCircle` rose / `AlertTriangle` amber for aborted), planned→actual duration, and “broke on {name}” meta when failed.

### Unified Productivity & Focus relationships

- **Deep Focus (countdown) vs main stopwatch (count-up):** they are **complementary, not conflicting.** Stopwatch = ambient all-day productive time; Deep Focus = an intentional bounded sprint. When a Deep Focus session **is active**, the hero StopwatchTimer shows a small pink `◉ Deep Focus` pill under the status line and its accent rail brightens — signaling the two are linked without merging their numbers. They never share a timer.
- **DeepFocusPanel vs FocusRankingsCard:** **beside, not merged.** Panel (left, action) = start/run a session. Rankings (right, context) = historical bests. Merging would overload one card and break the “action left / context right” rhythm.
- **FocusRankingsCard:** the three separate stats (best today/week/all-time) collapse into **one card with a segmented period toggle** (`Today | Week | All`), showing the single relevant best + a `Trophy` icon and the session’s date.

---

## 9. Deep Focus Integration Summary

- Promoted from `col-span-1` orphan → full-width panel of the 7/12 action rail (fixes “looks really bad / tacked on”).
- Driven by `useDeepFocus` (main-process source of truth), so overlay and dashboard never desync (§6.2).
- Countdown ticks off the *single* shared 1s interval only while active (§5).
- All four states designed (§11).

---

## 10. UX Flows (7 scenarios)

1. **First visit / empty:** Hero shows `00:00:00` “Idle” + GoalRing 0% + FunFactHero hidden (band keeps height). Summary strip: each card in its empty state (§11). Band 3: DeepFocusPanel idle presets (fully usable with zero data), rankings “No sessions yet,” recent “Nothing tracked yet.” The dashboard is never blank — it invites the first action (start a focus session).
2. **Typical day (3h in, Deep Focus running):** Stopwatch counts up “Locked In” with `◉ Deep Focus` pill; GoalRing ~progressing; DeepFocusPanel in active countdown with Border Beam; summary sparklines populated.
3. **Deep Focus break (opened YouTube, strict):** main-process overlay covers the distracting window (existing FocusManager behavior). **Behind it**, the dashboard DeepFocusPanel stays in active state; when the user breaks, `focus:ended` fires → panel flips to a **failed** summary (“broke on youtube.com”), history + rankings refresh, GoalRing/Activity update via `useHomeSummary.refresh()`.
4. **Midnight rollover (daily_rollup not yet computed):** `getHomeSummary` may return 0/stale for today. Cards show the **loading→then–empty** path with a subtle “Catching up…” meta rather than fake zeros; GoalRing shows 0% with “New day” label. A single `insights:build-rollup` is *not* triggered from the dashboard (no backend change) — the card simply reflects reality and refreshes on the next `onTrackingUpdate`.
5. **Mobile / narrow:** Band 1 → stacked (Stopwatch → GoalRing → FunFact). Band 2 → 2×2. Band 3 → single column, action first (DeepFocusPanel → rankings → recent → pinned → drill-downs). Touch targets ≥44px.
6. **After a completed session:** Confetti once (or static ✓ under reduced-motion), panel collapses to “Last session 50min ✓,” history prepends the row, rankings re-evaluate (may set a new “best today”), Activity/GoalRing bump via refresh.
7. **Finance locked:** Finance card shows lock icon + `••••` value + “Tap to unlock” sub, sparkline hidden; click routes to Finance page (which owns the unlock flow). No balance ever rendered while locked.

---

## 11. All-States Matrix (empty / loading / error / populated)

Per `humancentred-UIUX`, every data component ships all four. Skeletons match content shape (not spinners); errors are plain-language with a retry.

| Component | Empty | Loading | Error | Populated |
|---|---|---|---|---|
| **StopwatchTimer** | `00:00:00` + “Idle — start working” | n/a (prop-driven) | n/a | live HH:MM:SS + status |
| **FunFactHero** | render nothing (band holds height) | shimmer line (existing skeleton) | silent hide + tiny “couldn’t load insight” meta | headline + subtext + arrow |
| **GoalRing** | ring 0%, “New day” | ring track only, pulsing | ring 0% + “—” | % + label + subtitle |
| **SummaryCard (each)** | icon + “No {module} data yet” + CTA to page | icon + 2 skeleton bars + spark placeholder | “Couldn’t load” + `Retry` (calls `refresh()`) | value + sub + spark + trend |
| **Finance card (locked)** | (as populated but masked) | skeleton | “Couldn’t load” + Retry | `••••` + lock + “Tap to unlock” |
| **DeepFocusPanel** | idle presets (this *is* the empty state — always actionable) | brief skeleton on state fetch | “Focus unavailable” + Retry | active countdown / completed summary |
| **FocusRankingsCard** | “No sessions yet — start one” | skeleton stat | “Couldn’t load rankings” + Retry | best + Trophy + date + toggle |
| **RecentSessions** | “Nothing tracked yet” | 3 skeleton rows | inline “couldn’t load” | condensed rows |
| **DrillDownCard** | “No data to chart yet”, View disabled | tiny skeleton preview | “preview unavailable”, View still opens modal | mini preview + View button |

---

## 12. Mock Data Examples

```jsonc
// getHomeSummary — POPULATED (with optional §13 trends)
{
  "focusMinutes": 82, "walletCount": 3, "totalBalance": 12500.42,
  "dueReviews": 3, "sleepSeconds": 25200, "financeLocked": false,
  "trends": {
    "focus":   [40, 55, 30, 70, 65, 90, 82],
    "balance": [12100, 12250, 12200, 12480, 12510, 12490, 12500],
    "reviews": [6, 5, 4, 4, 5, 3, 3],
    "sleep":   [21600, 23400, 25200, 20000, 26000, 24000, 25200]
  }
}

// getHomeSummary — EMPTY (fresh install / midnight)
{ "focusMinutes": 0, "walletCount": 0, "totalBalance": 0,
  "dueReviews": 0, "sleepSeconds": 0, "financeLocked": false }

// getHomeSummary — FINANCE LOCKED
{ "focusMinutes": 82, "walletCount": 3, "totalBalance": 12500.42,
  "dueReviews": 3, "sleepSeconds": 25200, "financeLocked": true }

// useHomeSummary error surface
{ "data": null, "loading": false, "error": "Failed to load summary" }

// FocusPublicState — ACTIVE
{ "active": true, "endsAt": 1751630400000, "remainingSec": 1476,
  "strictness": "distracting", "paused": false }

// focus history row
{ "id": 42, "planned_sec": 3000, "actual_sec": 1200, "outcome": "failed",
  "broke_on_type": "domain", "broke_on_name": "youtube.com", "return_count": 2 }

// focus rankings (derived from getProductivitySessions)
{ "today": { "minutes": 82, "date": "2026-07-04" },
  "week":  { "minutes": 145, "date": "2026-07-01" },
  "allTime": { "minutes": 210, "date": "2026-06-18" } }
```

---

## 13. The ONE Allowed Backend Touch — `getHomeSummary` Extension (optional, feature-flagged)

Sparklines need short historical series; the current `getHomeSummary` returns only scalars. Per the prompt’s single allowed exception (“add 1–2 computed fields from `daily_rollup` that already exist”), add **one additive field** `trends` to the existing handler — **no new channel, no migration.**

- `trends.focus` → last 14 `focus_minutes` from `daily_rollup` (already stored). **Data-ready now.**
- `trends.balance` / `trends.reviews` / `trends.sleep` → include **only if** the underlying daily series already exists in queryable tables; otherwise **omit the key**. The frontend already degrades gracefully (arrow-only from a 2-point delta, or a “New” chip) when a series is missing.

**Contract rule:** `trends` and every sub-key are optional. If the extension is not shipped, the dashboard still renders fully (sparklines simply hide). This keeps the redesign **shippable with zero backend work** and *better* with the one-field extension. No other backend change is proposed.

---

## 14. Coverage Table (every PROMPT requirement → solution)

| PROMPT requirement | Covered in |
|---|---|
| 3-band layout w/ hierarchy | §0, §2 |
| Band 1: stopwatch left, funfact center, ring right, balanced, ring not beneath | §2 (5/4/3 grid, `items-stretch`) |
| Stopwatch not 2/3 width | §2 (5/12) |
| Band 2: 4 cards + icon/title/metric/trend | §2, §8 |
| Sparklines on summary cards | §8 (Sparkline spec), §13 (data) |
| Finance masked when locked | §8, §10.7, §11 |
| Clickthrough to module pages | §2, §11 |
| Band 3: Deep Focus prominent, unified zone | §2, §8, §9 |
| Rankings collapsed to 1 card + toggle | §8 (FocusRankingsCard) |
| Pinned activities collapsible | §2, tree §3 |
| Recent sessions condensed | §2, §11 |
| Heatmap/Orbit demoted to drill-downs | §2, §3 (DrillDownCard) |
| `useHomeSummary()` hook | §4 |
| `useDeepFocus()` wrapper | §4 |
| Orchestrator DashboardPage | §3 |
| Perf: 7→1 interval, remove 5s poll | §5 |
| Data-flow Q1 stopwatch persistence | §6.1 |
| Data-flow Q2 focus sync (dash vs overlay) | §6.2 |
| Data-flow Q3 funfact daily refresh no interval | §6.3 |
| Data-flow Q4 summary fresh w/o polling | §6.4 |
| Component extraction plan (exact files) | §3 |
| Data pipeline (source/transform/cache/edge) | §7 |
| Hero grid + breakpoints + timer font/bp | §2, §8 |
| Sparkline dims/format/color/animation | §8 |
| Card hover animation | §8 |
| Cards on mobile | §2, §10.5 |
| Empty state per card | §11 |
| Focus zone integration point + weight | §8, §9 |
| Focus states idle/active/completed + history | §8, §11 |
| Countdown vs stopwatch relationship | §8 |
| Panel beside vs merged w/ rankings | §8 |
| Stopwatch appearance when focus active | §8 (Deep Focus pill) |
| UX flows 1–7 | §10 |
| Deliverable: implementation plan | §3, §4 |
| Deliverable: component tree | §3 |
| Deliverable: mock data all states | §12 |
| Deliverable: coverage table | §14 |
| No full rewrite | §3 (orchestrator) |
| No new IPC/DB (except getHomeSummary field) | §13 |
| No 3rd-party libs (MCP as reference, re-skin) | §15 |
| All icons lucide-react | §1, §15 |
| Deep Focus prominent | §2, §8, §9 |
| 4 states everywhere | §11 |
| Kill polling storm | §5 |

---

## 15. Skills & MCP Application Log + Anti-Slop Gate

### MCP sourcing & re-skin log (all servers queried per `CONTEXT_BUNDLE.md §8`)

| MCP | Sourced | Re-skin applied |
|---|---|---|
| shadcn | Card, Tabs (period toggle), Progress, Tooltip, Separator, Badge | colors→DeskFlow tokens, `rounded-xl` max, `p-5` |
| Magic UI | Number Ticker (summary values), Border Beam (active focus), Blur Fade (spark mount), Confetti (completion), Shine Border (hero) | dark-only, pink accent, no purple, opacity ≤/10 |
| @21st-dev/magic | focus timer card, sparkline, circular progress variants | fully re-skinned to tokens |
| Lucide | Focus, Target, Brain, Clock, Timer, Wallet, GraduationCap, ExternalLink, Trophy, Flame, TrendingUp/Down, Minus, Lock, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, History, Repeat | all icons from `lucide-react`, no inline SVG dupes |
| React Bits | animated number/text for hero metric | tokens, `rounded-xl`, dark |
| Iconify | fallback only (none needed) | — |
| Unsplash | not used (data tool, no photography) | — |

### Anti-Slop Checklist (final gate)

- [x] Type: Geist body + JetBrains Mono code only
- [x] Color: DeskFlow tokens, no purple/indigo gradients
- [x] Geometry: `rounded-xl` max, `p-5`
- [x] Hero: no tiny-uppercase-eyebrow + oversized-headline + lone-CTA cliché (hero is a live data band)
- [x] Sections: no repeated tracked-uppercase kicker (each band has a plain `text-[15px]/600` h2 or none)
- [x] Motion: real micro-interactions, all guarded by `prefers-reduced-motion`
- [x] Imagery: product-accurate, no filler glow/blobs
- [x] Empty/loading/error states: all present (§11)
- [x] Icons: all lucide-react
- [x] Accessibility: `focus-visible` rings use `--page-accent` (pink), touch targets ≥44px

---

## 16. Build / PR Sequencing (safe, incremental)

1. **PR1 — Extraction, no visual change:** create `HeroBand`, `StopwatchTimer`, `SummaryStrip`, `ProductivityFocusZone` and move existing JSX in verbatim. Verify parity.
2. **PR2 — Hooks:** add `useHomeSummary` + `useDeepFocus`; route data through them; keep old state as fallback behind a flag.
3. **PR3 — Perf:** collapse 7 intervals → 1; wire event-driven refresh. Verify no regressions.
4. **PR4 — Band layouts:** apply the 5/4/3 hero grid, 4-card strip, 7/5 Band 3; responsive breakpoints.
5. **PR5 — Deep Focus promotion:** `DeepFocusPanel` + `FocusRankingsCard` + `DrillDownCard`; retire the orphan `FocusSessionCard` placement.
6. **PR6 — Sparklines + trends:** `Sparkline` component + SummaryCard wiring; ship the optional `getHomeSummary.trends.focus` field (§13); other series behind graceful degradation.
7. **PR7 — States + motion polish:** all empty/loading/error states, Confetti/Border Beam, reduced-motion, Anti-Slop gate.

Each PR is independently shippable and reversible. No PR requires a backend change except PR6’s single additive field, which is itself optional.
