# Round 03 — Life Interconnected River

> **Date:** 2026-08-07
> **Stage:** RESULT.md received → line-by-line diff audit of the shipped implementation performed; **3 mismatches found & fixed** (below), rebuilt OK (vite ✓, preload ✓, main ✓), Black Screen Checklist 1–5 PASS. Runtime verification still pending user relaunch (stale bundle in memory). Awaiting Specialist's answers to the 3 open questions below.
> **Convergence status:** ongoing — implementation shipped + diff-audited, feedback round open.

## Specialist Questions (verbatim)

*(none — Specialist said it is ready to produce RESULT.md once the two decisions are confirmed)*

## Owner Responses

*(see round-02.md: layout = (C) Map + Detail with full-width Today Tributary under the map; color = (A) title-bearing solid header strip ~28-36px from life_phases.color, computed contrast title text, dark glass body, no translucent overlays)*

## Decisions Reached

- Layout (C) + color band (A) confirmed — recorded in round-02.md.

## RESULT.md Implementation Report (Owner → Specialist)

All 6 steps of RESULT.md implemented with zero omission, plus documented additions:

1. **riverMath.ts** — `getContrastColor(hex)` (luminance > 0.6 → `#18181b`, else `#f4f4f5`) + `ZOOM_STOPS = [{Life,0},{Decade,2},{Year,4}]` (spec §2 Step 1 verbatim).
2. **RiverCanvas** — props renamed to spec API: `activePhaseId` (highlight: fillOpacity 0.5/stroke 0.95 on the active reach) + `onPhaseClick(phase)`. Kept existing `zoomLevel`/`onZoomLevelChange` optional controlled-zoom props to wire the Life/Decade/Year buttons (spec's "may need a minor update").
3. **RiverMap.tsx** — spec API `{ phases, zoomStop, onZoomChange, activePhaseId, onPhaseClick }`; sticky `top-0 z-30 -mx-5 px-5 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50`; header "Life River" `text-xs font-medium text-zinc-300`; zoom segmented control (`bg-zinc-800/50 p-0.5 rounded-lg`, active `bg-zinc-700/80 text-white`); RiverCanvas in `overflow-x-auto ws-scroll`. ADDITIONS: (a) **Add phase** button (spec's RiverMap has no create path; without it the phase-creation capability from the removed LifeRiver is lost) rendering `EmptyRiver({onAdd})` when empty; (b) canvas zoom +/- buttons sync back to the stop labels.
4. **TodayTributary.tsx** — spec props `{ covenant, memories, goals, longTermGoals }` (data owned by LifePage); `WarmCard ambient`; header "Today" + long-form date; 3-col md grid: Covenant = Flame icon + streak count + today's commitments toggle (markComplete/unmarkComplete, warm-color dots); Gold = Target icon + X/Y sealed + daily checklist (non-weekly, non-suggested, `saveGoal` optimistic toggle); Vault & Memories = top-4 LTGs by priority with `AnimatedCircularProgressBar` rings + On-This-Day memory thumbnails. ADDITION: **MemoryLightbox** (new shared component) opened on thumbnail click — spec left MemoryCard `onOpen` behavior undefined.
5. **PhaseCard.tsx** — solid header band `h-9 px-4 flex items-center justify-between rounded-t-xl` with `backgroundColor: phase.color || categoryOf(phase.category).color` and computed-contrast title (`text-sm font-semibold`) + dates (`text-xs` via `phaseSpanLabel`); body `WarmCard rounded-t-none border-t-0`: description `text-[13px] text-zinc-400`, memories mini-grid filtered by phase year-range, LTGs filtered by **deadline OR createdAt** year-range (title + ProgressRing), reflection in `warmth-serif italic`, actions Reflect (`ReflectionFlow`) + Edit (`PhaseFormDialog`). Band click sets `activePhaseId` (map highlight) — spec passes `onActiveChange` but never defines its use.
6. **LifePage.tsx** — 3-tab switch + TABS + URL-tab sync removed; loads `useCovenant()`, `useMemories()`, `useLifePhases()`, inline `getGoals(today)` + `getLongtermGoals()`; state `zoomStop` ('Life' default), `activePhaseId`, `goals`, `longTermGoals`; render = `RiverMap` (sticky) + feed (`flex-1 min-h-0 overflow-auto p-5 ws-scroll`, `max-w-5xl mx-auto space-y-6`) = `TodayTributary` + `phases.map(PhaseCard)` oldest→newest, each wrapper `id="phase-{id}"` + `scroll-mt-32` for map-click smooth-scroll. ADDITIONS: loading skeleton + error state (spec silent on both).
7. **GoldPage.tsx** — `<LifeRiver />` at L1300 + its import removed (Step 6).

**Build:** `npx vite build` ✓ (LifePage chunk 239 kB) · esbuild preload ✓ (97 kB) · `rebuild-main.mjs` ✓ (main.cjs 1.27 MB, no backend changes per spec audit). Checklist 1–5 PASS (root div, hashed module script, df-fallback intact). **Runtime: NOT LAUNCHED** — app must be fully restarted to drop the old bundle.

## RESULT.md Diff Audit (Owner → Specialist) — 3 fixes applied

RESULT.md (relayed 08-07) was diffed line-by-line against the shipped code. All classes/colors/thresholds/props match the spec verbatim (e.g. `getContrastColor` luminance>0.6, `h-9 px-4 ... rounded-t-xl` band, `WarmCard rounded-t-none border-t-0`, `flex flex-col h-full` host, `scroll-mt-32` wrappers, `onActiveChange={setActivePhaseId}`). **Three defects found and fixed:**

1. **`setGoals` ReferenceError in TodayTributary** — the props refactor left the daily-toggle handler calling a local `setGoals` that no longer exists (goals are props now). Clicking a Gold daily would throw at runtime. **Fix:** lifted `toggleGoal` into LifePage mirroring `GoldPage.tsx:995-1004` exactly (optimistic update → confetti(60) on done → `api.saveGoal(todayStr(), { ...goal, status, completedAt })` → revert on catch) and passed it down as `onToggleGoal(goal)`; TodayTributary is now fully presentational.
2. **RiverMap never called its `onPhaseClick` prop** — spec declares the prop and LifePage passes `scrollToPhase` (sets `activePhaseId` + scrolls), but the canvas handler only ran RiverMap's local `scrollToPhase`, so arc clicks scrolled without highlighting. **Fix:** canvas handler now runs local scroll **and** `onPhaseClick?.(p.id)` → the map highlight tracks the clicked phase.
3. *(structural, no code change)* — spec §2 Step 3 allows "use useCovenant/useMemories directly, or accept props from LifePage"; props approach retained (single data owner, matches the Step 5 compose snippet).

**Rebuild after fixes:** vite ✓ (`index.DcsMiFHo.js`, 13.4 MB) · preload ✓ (97,824 B) · rebuild-main ✓ (1,291,295 B) · Checklist 1–5 PASS. Runtime still NOT LAUNCHED.

## Open Questions (verbatim, for CZ to relay to Specialist)

1. **Goal/commitment/memory CREATION is now unreachable.** The 3-tab removal orphans `CovenantPage.tsx`, `MemoriesPage.tsx`, `GoldPage.tsx` (grep: no imports remain) — TodayTributary only *toggles* existing dailies and *displays* LTGs/memories. RESULT.md never defines where users create goals, add commitments, or upload memories. Where should creation live? (a) add "+" buttons per tributary column opening the existing modals, (b) keep the full Gold/Covenant/Memories pages as a secondary tab/route, (c) something else?
2. **Orphaned files:** with GoldPage cleanup, `river.tsx` (LifeRiver) + `phase-drawer.tsx` also have zero importers (they compile — `RiverCanvas` props renamed to match). Keep as dormant (for a future phase-detail drawer) or delete?
3. **MemoryCard `layoutId`:** PhaseCard + TodayTributary render MemoryCard thumbnails whose framer-motion `layoutId` (`memory-${id}`) was designed for a single mounted copy; duplicates can cause layout-animation jumps when toggling. Acceptable, or disable layout animation for grid copies?

## Specialist Answers Received → Implemented (Owner)

All three open questions answered by the Specialist (relayed 08-07); all three implemented and rebuilt:

**Q1 — Creation UX: answer (a) "+" buttons per tributary column.**
- `TodayTributary.tsx`: `Plus` button per column header (Covenant / Gold / Vault & Memories) + `Upload` for memories.
  - Covenant → `NewCommitmentModal` (calls `covenant.addCommitment`).
  - Gold → inline `CriteriaBuilder` reusing GoldPage's exported `defaultCriteria`/`criteriaToGoal` (identical daily-goal semantics); submits via new `onAddGoal(goal)` prop.
  - Vault & Memories → inline LTG form (title/category/priority/deadline/description) submitting via new `onAddLTG(form)` prop; hidden file input → `memories.upload(files)`.
- `GoldPage.tsx` now EXPORTS `CAT_META`, `catDot`, `defaultCriteria`, `criteriaToGoal`, `LTGForm`, `emptyLTGForm`, `PRIORITY_OPTIONS` (were module-private) so the Tributary reuses the exact same form semantics.
- `LifePage.tsx`: data load refactored into reusable `reloadGoals`/`reloadLtgs`; new `handleAddGoal` (optimistic append → `api.saveGoal(today)` → reload) and `handleAddLTG` (builds `period:'longterm'` goal, `api.saveGoalsBatch`, reload — mirrors GoldPage's `handleAddLongTerm` shape incl. `date:'2000-01-01'`, `id: ltg_<ts>_<rand>`). Passes both down; Tributary stays presentational.

**Q2 — Orphans: answer delete.** `river.tsx` (LifeRiver) + `phase-drawer.tsx` deleted (verified zero importers: their only imports were mutual; grep-confirmed gone). GoldPage/CovenantPage/MemoriesPage are now reachable again (GoldPage exports feed the Tributary; pages stay on the Warmth tab).

**Q3 — layoutId collisions: answer prefix.** `MemoryCard.tsx` gains optional `idPrefix?: string`; `layoutId` = `${idPrefix}-memory-${id}` (default bare `memory-${id}` preserved for single-grid consumers like MemoryReveal). `TodayTributary` passes `idPrefix="tributary"`, `PhaseCard` passes `idPrefix={`phase-${phase.id}`}` — the same memory rendering in both grids can no longer fight over one layoutId.

**Build & checklist:** vite ✓ (LifePage chunk 457 kB — includes GoldPage, CovenantPage, MemoriesPage, LifeRiver for Pages mode, index.Dlo00TOS.js 13.5 MB) · esbuild preload ✓ (95.9 kB) · rebuild-main ✓ (main.cjs 1,270 KB) · Black Screen Checklist 1–5 PASS (root div ✓, hashed module script `./assets/index.Dlo00TOS.js` ✓, df-fallback ✓, index.js > 10 KB ✓). Runtime: NOT LAUNCHED (app restart required to drop the stale bundle).

## Design Manifesto Redesign (Owner) — Cycle 6

User demanded: (1) old 3-tab mode (Covenant/Memories/Gold) brought back with a toggle; (2) new River mode redesigned to be beautiful, soulful, storytelling — not a plain data grid.

### Toggle
LifePage now has a **mode toggle** (Pages ↔ River) persisted to localStorage. Pages mode shows the original 3-tab interface (CovenantPage embedded, MemoriesPage embedded, GoldPage). River mode shows the new combined design.

### RiverMap (Apex Map)
- Sweeping SVG curve (`Q` quadratic beziers) with phase markers along the path
- "Now" is a pulsing amber star (`<animate>` tag, radius pulses 2.5→4→2.5)
- Phase markers glow/expand when active
- Scroll parallax: map fades to 0.85 opacity and scales to 0.97 via `framer-motion` `useScroll`/`useTransform`

### TodayTributary (The Confluence)
- Asymmetric organic layout: flex-col on mobile, flex-row on desktop
- Left (28%): Covenant = "Current Vows", streak number in massive `font-display text-4xl`, glowing ember dots, subtle pulse ring on add button
- Center (flex-1): Gold = "Today's Seal", large date (`font-display text-5xl`), daily goals as rows with confetti on completion
- Right (30%): Vault = "Horizon", LTGs with solid category color `border-l-4`, memory thumbnails
- Warmth shimmer overlay (radial gradients)

### PhaseCard (Solid Era Monoliths)
- **Massive h-36 solid color header** (not h-9) with `boxShadow` bleed
- Subtle atmospheric gradient overlay (light→transparent→dark)
- Phase title in `warmth-serif text-3xl`, dates in `font-mono`, magnitude in `font-display text-4xl` (ghost opacity)
- Body: reflection in `warmth-serif italic text-lg`, LTGs, **scattered memory pearls** (polaroid-style with rotation offsets, hover → scale 1.12 + rotate 0 + z-50)

### Vital Thread
- Continuous glowing line down the center of the feed (`linear-gradient` amber→sage→sky, blur-sm, pointer-events-none)

### Framer-Motion Animations
- Every PhaseCard: `motion.div` fade-up on viewport entry (`initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}`)
- TodayTributary: fade-up on viewport entry
- Mode toggle pills: `layoutId` crossfade
- Page tabs: `layoutId` crossfade with accent color

## Notes

- When RESULT.md arrives: implement all directives (AGENTS.md §6 zero-omission), build via `npx vite build` + esbuild preload + `node scripts/rebuild-main.mjs`, verify per Black Screen Checklist, report in CYCLE REPORT format.
- Host = LifePage.tsx (3-tab switch today); LifeRiver currently embedded at GoldPage.tsx L1300.
