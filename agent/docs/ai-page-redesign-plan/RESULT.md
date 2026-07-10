# RESULT — Focus / Plan / Reflect Full Redesign

> Definitive, production-ready redesign of the three lower AiPage sections. One solution, no options. Implementable from this file + `CONTEXT_BUNDLE.md` alone. Collapses the current **5 cramped cards** (DailyPlanCard, MyPlanCard, LongTermPlanCard, TopicDigestCard, GoalHistoryCard) into **3 coherent boards** (FocusBoard, PlanBoard, ReflectFeed) plus shared primitives.

---

## 0. Build Parameters (read first)

**Liveliness Level: L2 — Responsive** (same budget as the AiPage shell). Reactive + transitional motion everywhere; **zero** new ambient layers in these sections (the shell already spends its one ambient accent on the chat dot). No scroll-jacking, no parallax, no spring physics.

**Taste knobs (locked):** `DESIGN_VARIANCE 5` · `MOTION_INTENSITY 6` · `VISUAL_DENSITY 7`. Dark Glass dev-tool style.

**Hard invariants honored throughout:** DeskFlow tokens only · `GlassCard` (`bg-zinc-900/40 ring-1 ring-zinc-800/60 rounded-xl p-5`) · `rounded-xl` max · `p-5` max · **no box-shadow** (depth via ring brightness + glass) · **transform + opacity only** · easing `[0.16,1,0.3,1]` std / `[0.4,0,0.2,1]` in-out · durations 150/250/400ms · stagger 0.05 · `prefers-reduced-motion` respected · body Geist/Inter 13px, mono JetBrains, headings 600, never a 3rd font · dark mode only · all `localStorage` in try/catch · CRLF preserved · no new npm packages (React + framer-motion + lucide only; shadcn via CLI) · reuse existing IPC, no new endpoints · **no functionality removed**.

### 0.1 MCP re-skin verdicts (decided up front — apply everywhere)

The sourced components ship with patterns that violate DeskFlow. These are **binding corrections**, not suggestions:

| Component | Ships with | ❗ Violation | Binding re-skin |
|---|---|---|---|
| **AnimatedList** | `spring stiffness 350`, `delay=1000ms` timed reveal, `scale 0→1` | Spring banned; a 1s-per-item timed reveal is the "artificial lag / carpet-bomb" anti-pattern for a list the user must act on | Drop the internal timer entirely. Keep only `AnimatePresence` + `motion.div layout` for enter/exit. Replace spring with `transition={ { duration: MOTION.normal, ease: MOTION.ease } }`, `initial={ { opacity:0, y:6 } }`, `animate={ { opacity:1, y:0 } }`, `exit={ { opacity:0, y:-4 } }`. Parent controls order via container `staggerChildren: 0.05`. `gap-1.5`. |
| **NumberTicker** | `useSpring damping 60 stiffness 100` | "No spring physics" invariant | Re-implement count-up with `animate(0, value, { duration: 0.6, ease: MOTION.ease })` (framer `animate()` on a MotionValue) or accept the high-damping spring **only** because it produces no overshoot — spec below uses the duration variant to be safe. `tabular-nums text-zinc-100`, strip `text-black dark:text-white`. Reduced-motion → render final value instantly. |
| **BentoGrid** | `auto-rows-[22rem] grid-cols-3 gap-4`, `href`+`cta`, box-shadow, light mode | 22rem rows = landing-page hero density; CTA/href is a marketing pattern; box-shadow banned | Use as **layout only**. `auto-rows-[7rem] gap-3`, `bg-zinc-900/40 ring-1 ring-zinc-800/60 rounded-xl p-5`, no box-shadow, strip `href`/`cta`/`Icon` hover-slide. Compact metric tiles, not feature cards. |
| **AnimatedContent** | GSAP + ScrollTrigger | GSAP not in deps; no new packages | **Do not install GSAP.** Use framer `useInView(ref,{ once:true, margin:'-10%' })` + `motion.div` with `initial={ { opacity:0, y:12 } }` / `animate` on inView, `duration: MOTION.normal`. |
| **GlareHover** | cursor-follow glare overlay | Ambient-ish, cursor-follow is L3 | **Not used.** Over budget for L2 productivity. Hover = ring brighten + `y:-2` only. |
| **Progress / Collapsible / Dialog / AlertDialog** | radix + light defaults | radius/padding/colors | Keep radix behavior; re-skin: track `bg-zinc-800/60`, indicator = accent `bar`; `DialogContent bg-zinc-900 ring-1 ring-zinc-800/60 rounded-xl p-5`; overlay `bg-black/50 backdrop-blur-sm`. |

---

## 1. Architecture

### 1.1 The core problem & the fix

The current 5 cards are **five competing headers, five progress idioms, five list styles** stacked with no shared spine — that's why it "doesn't make sense." The fix is **3 boards, each with one clear job and one shared visual grammar**, plus a **PageSection wrapper** that gives all three identical rhythm and the mobile accordion behavior.

```
Focus  → FocusBoard      "What am I doing today?"    (was DailyPlanCard)
Plan   → PlanBoard       "What am I working toward?" (was MyPlanCard + LongTermPlanCard)
Reflect→ ReflectFeed     "What happened & what did I learn?" (was TopicDigestCard + GoalHistoryCard)
```

### 1.2 New component tree

```
AiPage  (unchanged owner of state; passes same props / superset)
└─ <div className="space-y-8">
   ├─ PageSection id="focus"   accent="pink"    title="Focus"   desc="Today’s plan">
   │   └─ FocusBoard
   │       ├─ FocusMetricStrip        (BentoGrid re-skin: 3 compact tiles + progress ring)
   │       ├─ FocusChecklist          (the actionable list — pending, from-plan, suggestions)
   │       │    ├─ GoalCheckRow[]     (shared)
   │       │    └─ SuggestionRow[]    (Accept / Dismiss)
   │       ├─ CompletedCollapsible    (shadcn Collapsible)
   │       └─ ReviewPanel             (review mode: metrics + summary + FeedbackComposer)
   ├─ PageSection id="plan"    accent="emerald" title="Plan"   desc="Short & long term">
   │   └─ PlanBoard
   │       ├─ PlanTabs  (segmented: “This week” | “Long-term”)   ← mobile/lg
   │       ├─ WeekPane      (planning.md editor/preview + inline add)
   │       └─ LongTermPane
   │            ├─ LongTermGoalRow[]  (reorder, complete, delete)
   │            ├─ AddGoalInline / GoalDialog
   │            └─ BulkImportDialog   (brain-dump → parseGoalDump → review → import)
   └─ PageSection id="reflect" accent="amber"   title="Reflect" desc="Digests & history">
       └─ ReflectFeed
           ├─ FeedFilter  (segmented: All | Research | Goals)
           └─ <timeline>  FeedEntry[]  (dot+line rail)
                ├─ DigestEntry   (Collapsible → summary + sources)
                └─ HistoryEntry  (Collapsible → goal statuses + review)
```

### 1.3 File structure & migration mapping

| New file | Absorbs | Notes |
|---|---|---|
| `src/components/ai/PageSection.tsx` | (new) | wrapper: SectionHead + mobile accordion + inView entrance |
| `src/components/ai/focus/FocusBoard.tsx` | `DailyPlanCard.tsx` | keeps every DailyPlanCard prop |
| `src/components/ai/focus/FocusMetricStrip.tsx` | (extracted from DailyPlan header ring) | |
| `src/components/ai/plan/PlanBoard.tsx` | `MyPlanCard.tsx` + `LongTermPlanCard.tsx` | merges both, tabbed |
| `src/components/ai/plan/BulkImportDialog.tsx` | (extracted from LongTermPlanCard bulk mode) | |
| `src/components/ai/reflect/ReflectFeed.tsx` | `TopicDigestCard.tsx` + `GoalHistoryCard.tsx` | unified timeline |
| `src/components/ai/shared/GoalCheckRow.tsx` | (dedupes goal-row markup used in 3 places) | |
| `src/components/ai/ui/{animated-list,number-ticker,bento-grid}.tsx` | MCP installs (re-skinned) | via shadcn CLI |
| `src/components/ui/{progress,collapsible,dialog,alert-dialog}.tsx` | shadcn installs | |

**Backward compatibility:** keep the 5 old files as **thin re-export shims** for one release (`export { FocusBoard as DailyPlanCard }`) so `AiPage.tsx` imports don't break mid-migration; delete after AiPage is switched over (step 7).

### 1.4 Data flow (unchanged ownership)

`AiPage` remains the single state owner. Boards are controlled components receiving the **same prop shapes** (or a superset) as the cards they replace. Self-loading cards (`LongTermPlanCard`, `GoalHistoryCard`) keep their self-load IPC internally so `AiPage` state contract is untouched.

```
AiPage state ── props ─▶ FocusBoard  ──(onToggle/onSuggest/onAccept/onDismiss/onFeedback/onConfigure)─▶ IPC
             ── props ─▶ PlanBoard   ── self-loads long-term via getLongtermGoals(); week via readPlanningMd()
             ── props ─▶ ReflectFeed ── digests via props (topics); history self-loads getGoals(last7)
```

---

## 2. Visual Design (shared grammar)

### 2.1 Section rhythm

- Vertical rhythm between the three sections: `space-y-8` (32px). Inside a board: `space-y-4` (16px) between blocks, `gap-1.5` (6px) between list rows (dense).
- Every board is **one** `GlassCard` (`p-5`) — no nested cards-in-cards (the old cramped look). Sub-regions are separated by `border-t border-zinc-800/60` + `pt-4`, or by inset wells `bg-zinc-950/60 rounded-lg p-3`, never by another ringed card.
- **One header idiom** everywhere: `SectionHead` (accent bar 4×28px + title 13px/600 + desc 11px muted + right slot). No per-card bespoke headers.

### 2.2 Accent assignment

| Section | Accent | Used for |
|---|---|---|
| Focus | `pink` | progress ring, active check, section bar |
| Plan | `emerald` | long-term completion, add-goal CTA, section bar |
| Reflect | `amber` | timeline dots for digests, section bar |

Goal **category** colors (independent of section accent) map once, reused in all three boards:
```ts
const CATEGORY: Record<GoalCategory, {dot:string; label:string}> = {
  work:         { dot:'bg-violet-400',  label:'Work' },
  personal:     { dot:'bg-pink-400',    label:'Personal' },
  health:       { dot:'bg-emerald-400', label:'Health' },
  learning:     { dot:'bg-amber-400',   label:'Learning' },
  finance:      { dot:'bg-cyan-400',    label:'Finance' },
  relationships:{ dot:'bg-rose-400',    label:'Relationships' },
}
```
Category is always **dot + text** (never color alone — accessibility).

### 2.3 Typography

| Role | Spec |
|---|---|
| Board title | 13px / 600 / `text-zinc-100` |
| Board desc | 11px / 400 / `text-zinc-500` |
| Goal title | 13px / 500 / `text-zinc-100` (completed: `line-through text-zinc-500`) |
| Meta / time / category | 11px / 400 / `text-zinc-500`, numbers `tabular-nums` |
| Big metric | 20px / 600 / `tabular-nums text-zinc-100` (NumberTicker) |
| planning.md preview | JetBrains Mono 12.5px / 1.6 |

### 2.4 Motion tokens (all boards)

```ts
const listContainer = { hidden:{}, show:{ transition:{ staggerChildren: MOTION.stagger } } }
const listItem = {
  hidden:{ opacity:0, y:6 },
  show:{ opacity:1, y:0, transition:{ duration: MOTION.normal, ease: MOTION.ease } },
}
// reduced-motion: const reduce = useReducedMotion(); if (reduce) collapse y→0, stagger→0.
```
Hover on interactive rows/tiles: `whileHover={ { y:-2 } }` + `hover:ring-zinc-700` (150ms). Check toggle: see §6.1. Collapsible expand: radix height + 250ms opacity crossfade (radix animates height via CSS var — acceptable exception to the transform-only rule since it's the documented radix pattern; keep it 250ms `easeInOut`).

---

## 3. Component Spec — FocusBoard

**Job:** answer “what am I doing today” as an actionable checklist, not a data dump. Absorbs all DailyPlanCard behavior across the three modes (`morning` / `in-progress` / `review`).

### 3.1 Props (superset of DailyPlanCard — no breakage)

```ts
interface FocusBoardProps {
  goals: Goal[]
  mode: Mode                                   // 'morning' | 'in-progress' | 'review'
  suggestions: { title:string; category:GoalCategory }[]
  planGoals: { title:string; targetSeconds?:number }[]   // “from your plan”
  review?: string
  loading: boolean; suggesting: boolean; saving: boolean
  error?: string
  onToggle: (goalId:string)=>void
  onSuggest: ()=>void
  onAccept: (s:{title:string;category:GoalCategory})=>void
  onDismiss: (s:{title:string;category:GoalCategory})=>void
  onFeedback: (text:string)=>void
  onConfigure: ()=>void
  onRetry?: ()=>void
}
```

### 3.2 Layout (populated)

```
GlassCard accent="pink" p-5
├─ SectionHead (inside PageSection actually; board header is the metric strip)
├─ FocusMetricStrip                    ← 3 compact tiles + progress ring, replaces old header ring
├─ (border-t) “Today”  + mode badge + Suggest button + Configure IconButton
├─ FocusChecklist
│    ├─ from-plan rows      (muted “From your plan” subhead)
│    ├─ AI suggestion rows  (sparkle, Accept/Dismiss)
│    └─ pending goal rows   (GoalCheckRow)
├─ CompletedCollapsible  (“N completed”, chevron)
└─ ReviewPanel           (only when mode==='review')
```

### 3.3 FocusMetricStrip (BentoGrid re-skin)

Compact metric row, `grid grid-cols-3 gap-3 auto-rows-[7rem]` (mobile: `grid-cols-1`). Three tiles + one progress ring inside the first tile:

| Tile | Value | Source |
|---|---|---|
| **Done today** | `NumberTicker` of `goals.filter(done).length` / total, + pink progress **ring** (shadcn Progress radial or SVG dasharray) | goals |
| **In progress** | count of `status==='in-progress'` | goals |
| **Focus time** | `formatDuration(Σ progressSeconds)` | goals |

Tile: `bg-zinc-900/40 ring-1 ring-zinc-800/60 rounded-xl p-5 flex flex-col justify-between`; label 11px muted top, metric 20px bottom. Hover `y:-2`. Progress ring animates `stroke-dashoffset` 400ms on mount / value change; reduced-motion instant.

### 3.4 FocusChecklist rows

- **GoalCheckRow** (shared, see §6.1): check circle + title + category dot/label + time-estimate pill + (hover) delete. `flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-800/40`.
- **from-plan rows:** same row shape, dimmed, prefixed with a small `ListTodo` glyph; clicking the circle promotes it to a real goal (existing behavior via `onAccept`-like path).
- **SuggestionRow:** `Sparkles` pink glyph + suggested title + category + two text-buttons **Accept** (emerald) / **Dismiss** (muted). Accept → row animates out (`exit opacity+y`) and reappears in pending list. `suggesting` state shows 2 shimmer rows.
- Rows are wrapped in the `listContainer`/`listItem` variants (re-skinned AnimatedList grammar; no timer, no spring).

### 3.5 ReviewPanel (mode==='review')

- Two-tile metric mini-grid (`grid-cols-2 gap-3`): **Goals completed** (NumberTicker) + **Carry over** (NumberTicker, amber if >0).
- Review summary banner: `bg-pink-500/10 ring-1 ring-pink-500/20 rounded-lg p-3 text-pink-200 text-xs`, shows `review` text.
- **FeedbackComposer** integrated inline (not tacked on): inset well `bg-zinc-950/60 rounded-lg p-3` with a small `MessageSquare` label “Add a reflection”, auto-grow textarea, Send `IconButton` (pink). On send → `onFeedback(text)`, optimistic append to summary, clear field, brief check confirm.

### 3.6 FocusBoard states (StateShell)

| State | Render |
|---|---|
| loading | metric strip = 3 skeleton tiles (`bg-zinc-800/40 animate-pulse`), checklist = 4 skeleton rows (circle + bar) |
| empty | `Brain` pink tile + “Plan your day” + body “Add a goal or let the assistant suggest a few.” + primary **Suggest goals** (calls `onSuggest`) |
| error | StateShell red: `AlertCircle` + `error` message (plain language) + **Retry** (`onRetry ?? reload`) |
| populated | as §3.2 |

---

## 4. Component Spec — PlanBoard

**Job:** unify short-term (planning.md) and long-term goals in one coherent board; make long-term entry (single + bulk) a polished flow. Absorbs MyPlanCard + LongTermPlanCard with **all** features preserved (edit/preview, add item, manual CRUD, reorder, complete, delete, bulk parse+import).

### 4.1 Layout — responsive dual-pane vs tabs

- **`xl` (≥1280px):** two panes side by side inside one GlassCard — **This week** (`col-span-5`) | divider | **Long-term** (`col-span-7`, richer). This replaces the old cramped `md:grid-cols-2` (which split two full cards) with one card, two panes, shared header.
- **`< xl`:** `PlanTabs` segmented control (`This week` | `Long-term`); one pane visible at a time; tab swap = 150ms crossfade (`AnimatePresence mode="wait"`, opacity only).

```
GlassCard accent="emerald" p-5
├─ header row: title slot + PlanTabs (<xl) / just labels (xl) + right actions
└─ xl:grid xl:grid-cols-12 xl:gap-5
     ├─ WeekPane      (xl:col-span-5)
     └─ LongTermPane  (xl:col-span-7, xl:border-l xl:border-zinc-800/60 xl:pl-5)
```

### 4.2 WeekPane (from MyPlanCard)

- **Preview mode (default):** planning.md rendered in a mono inset well `bg-zinc-950/60 rounded-lg p-3 font-mono text-[12.5px] leading-relaxed text-zinc-300`, with a small **Add item** inline affordance at the bottom (input + Save/Cancel, emerald Save). Edit toggle (`Pencil`) in the pane header.
- **Edit mode:** full-width auto-grow textarea (same mono), Save/Cancel; Save → `writePlanningMd(text)` → `onPlanningSaved()`; optimistic, error rolls back with inline red note.
- No more “debug textarea in a card” feel: framed as a document well with clear edit affordance and a header, matching the mono digest treatment used in Reflect.

### 4.3 LongTermPane (from LongTermPlanCard)

Header actions: **+ Add goal** (emerald button → inline form or `GoalDialog`), **Bulk import** (`Sparkles` → `BulkImportDialog`).

- **LongTermGoalRow:** category dot + title (13px/500) + optional description (11px muted, 1 line) + priority handle. Right (hover): reorder ▲/▼ (`IconButton`, updates `priority` via `saveGoal`), complete circle, delete (`Trash2`, red on hover → AlertDialog confirm).
- **Reorder:** keep the existing up/down buttons (no drag lib — no new package); each press swaps `priority` and persists. `motion.div layout` animates the position swap (FLIP, transform-only), 250ms.
- **Completed** section: shadcn Collapsible, `line-through text-zinc-500`, count in trigger.
- **AddGoalInline / GoalDialog:** single-goal entry = inline form (title input, description textarea, category `select`, emerald **Add goal**). For a richer/edit flow use shadcn `Dialog` with the same fields (re-skinned). Single entry stays inline (fast); editing opens the dialog.

### 4.4 BulkImportDialog (the “single OR multiple goals” ask)

A shadcn `Dialog` (`bg-zinc-900 ring-1 ring-zinc-800/60 rounded-xl p-5`, overlay `bg-black/50 backdrop-blur-sm`) with a **two-step** flow — this is the polished replacement for the raw textarea+analyze:

**Step 1 — Capture.** A large auto-grow textarea (“One goal per line, or write freely — AI will structure it”) **plus** a “+ Add line” affordance that appends discrete single-line inputs for people who prefer explicit fields (this satisfies “single or multiple text input fields” directly). Primary: **Analyze with AI** (`parseGoalDump(text)`), which shows a pulsing `Brain` + “Structuring your goals…” loading state.

**Step 2 — Review & import.** Parsed goals render as checkable `GoalCheckRow`s (title / editable category `select` / description), each toggle includes/excludes it. Footer: **Import N goals** (emerald, count via NumberTicker) → `saveGoalsBatch(selected)` → success toast (`+N goals added`) → dialog closes → list animates the new rows in (stagger). Errors: inline red banner + **Retry** (re-calls `parseGoalDump`), textarea content preserved.

### 4.5 PlanBoard states

| Pane | loading | empty | error |
|---|---|---|---|
| Week | 3 mono skeleton lines | `FileText` + “No weekly plan yet” + **Start planning** (enters edit) | red + Retry (`readPlanningMd`) |
| Long-term | 4 skeleton rows | `Flag` emerald + “No long-term goals” + **Add goal** / **Bulk import** | red + Retry (`getLongtermGoals`) |

---

## 5. Component Spec — ReflectFeed

**Job:** merge research digests + goal history into one **timeline / activity feed** so reflection feels like browsing, not reading debug output. Absorbs TopicDigestCard + GoalHistoryCard with all features (refresh, provider badge, digest expand + sources, date-grouped history with statuses + review summary).

### 5.1 Layout

```
GlassCard accent="amber" p-5
├─ header: title + FeedFilter (All | Research | Goals) + Refresh IconButton + ProviderBadge
└─ <ol> timeline  (relative; left rail: 1px zinc-800 line at x=11px)
     └─ FeedEntry[]   sorted desc by date, interleaving digests + history days
          ├─ rail node: 10px dot (amber=digest, category-colored=history day) on the line
          └─ Collapsible card: bg-zinc-950/40 ring-1 ring-zinc-800/60 rounded-lg p-3
```

Each entry is a **timeline node**: a dot on a continuous vertical rail + a collapsible body offset to the right (`pl-8`). Chronological, newest first. This is the unifying metaphor that fixes “disjointed.”

### 5.2 FeedFilter

Segmented control `All | Research | Goals` (re-skinned tabs). Switching filters the feed with a 150ms crossfade + `layout` reflow. Counts shown as tiny pills. Reduced-motion → instant.

### 5.3 DigestEntry (from TopicDigestCard)

- Collapsed: amber dot + `BookOpen` glyph + `topic` (13px/500) + source-count pill (`3 sources`) + chevron. Hover `ring-zinc-700` + `y:-1`.
- Expanded (shadcn Collapsible, 250ms): `summary` (13px/1.5 text-zinc-300, `max-w-[65ch]`) + source links list (`ExternalLink` icon, `text-pink-300 hover:underline`, opens external). Provider badge stays in the board header, not per row.

### 5.4 HistoryEntry (from GoalHistoryCard)

- Collapsed: date dot (colored by that day’s dominant category) + relative date (“Yesterday”, “Mon Jun 29”) + a mini status summary (`✓ 3 · ✕ 1 · ○ 2`, tabular-nums, icon+count never color-only) + chevron.
- Expanded: goal list with status icons — `CheckCircle2` emerald (completed), `X` zinc (dismissed), `Circle` zinc (pending), `Clock` amber (in-progress) — each with title + category. If `reviewSummary` exists: pink banner `bg-pink-500/10 ring-1 ring-pink-500/20 rounded-lg p-2.5 text-pink-200 text-xs` at the bottom.

### 5.5 ReflectFeed states

| State | Render |
|---|---|
| loading | 4 skeleton timeline nodes (dot + bar) |
| empty (all) | `Sparkles` amber + “Nothing to reflect on yet” + “Research digests and completed goals will appear here.” |
| empty (Research filter) | `BookOpen` + “No research topics” + **Refresh** (`onRefresh`) |
| empty (Goals filter) | `CalendarDays` + “No goal history” |
| error | red + message + **Retry** (per source: digest → `onRefresh`; history → reload `getGoals`) |
| digest generating | header shows small spinner + “Generating digest…” (from `isDigestGenerating()` / `onDigestGenerationComplete`) |

---

## 6. Key Implementation Patterns

### 6.1 Animated check toggle (shared GoalCheckRow — used in Focus, Bulk review, Long-term)

Not an instant swap. A circular check that draws in:

```tsx
function CheckCircle({ done, onToggle, accent='pink' }:{done:boolean;onToggle:()=>void;accent?:keyof typeof ACCENT}) {
  const reduce = useReducedMotion()
  return (
    <button onClick={onToggle} aria-pressed={done}
      className={cn('h-5 w-5 rounded-full ring-1 grid place-items-center transition-colors duration-150',
        done ? `${ACCENT[accent].bar} ring-transparent` : 'bg-transparent ring-zinc-600 hover:ring-zinc-400')}>
      <motion.svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3}>
        <motion.path d="M5 13l4 4L19 7"
          initial={ false }
          animate={ { pathLength: done ? 1 : 0, opacity: done ? 1 : 0 } }
          transition={ { duration: reduce ? 0 : MOTION.fast, ease: MOTION.ease } }
          className="text-zinc-950" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    </button>
  )
}
```
`pathLength` animates the checkmark drawing (transform-safe). Row itself does an optimistic `line-through` + reflow to the completed section via `layout`.

### 6.2 List entrance (re-skinned AnimatedList grammar)

```tsx
<motion.ul variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-1.5">
  <AnimatePresence initial={false}>
    {rows.map(r => (
      <motion.li key={r.id} variants={listItem} layout
        exit={ { opacity:0, y:-4, transition:{ duration: MOTION.fast } } }>
        <GoalCheckRow goal={r} />
      </motion.li>
    ))}
  </AnimatePresence>
</motion.ul>
```
No `delay` timer, no spring — corrects the shipped AnimatedList (see §0.1). Cap visible animated rows; if a list can exceed ~40 rows, render the overflow without per-item entrance.

### 6.3 NumberTicker (no-spring variant)

```tsx
function NumberTicker({ value, className }:{value:number;className?:string}) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { once:true })
  useEffect(() => {
    if (!ref.current) return
    if (reduce || !inView) { ref.current.textContent = String(value); return }
    const controls = animate(0, value, { duration: 0.6, ease: MOTION.ease,
      onUpdate: v => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() } })
    return () => controls.stop()
  }, [value, inView, reduce])
  return <span ref={ref} className={cn('inline-block tabular-nums text-zinc-100', className)}>0</span>
}
```

### 6.4 Section entrance + mobile accordion (PageSection)

```tsx
interface PageSectionProps { id:string; accent:keyof typeof ACCENT; title:string; desc:string;
  right?:React.ReactNode; defaultOpen?:boolean; children:React.ReactNode }
```
- Desktop: always open; on mount, `useInView(once)` fades the section in (`opacity 0→1`, `y 12→0`, 250ms) — the GSAP-free AnimatedContent replacement.
- Mobile (`< md`): `SectionHead` becomes a Collapsible trigger (chevron); Focus `defaultOpen`, Plan/Reflect collapsed. State persisted per section id in `localStorage` (try/catch), key `fpr:section:<id>:open`.

### 6.5 Collapsible (radix) re-skin

```tsx
<Collapsible>
  <CollapsibleTrigger className="group flex w-full items-center gap-2 ...">
    <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
    {/* label */}
  </CollapsibleTrigger>
  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-fpr-open data-[state=closed]:animate-fpr-close">
    {/* body */}
  </CollapsibleContent>
</Collapsible>
```
```css
@keyframes fpr-open  { from{ height:0; opacity:0 } to{ height:var(--radix-collapsible-content-height); opacity:1 } }
@keyframes fpr-close { from{ height:var(--radix-collapsible-content-height); opacity:1 } to{ height:0; opacity:0 } }
.animate-fpr-open  { animation: fpr-open  .25s cubic-bezier(0.4,0,0.2,1) }
.animate-fpr-close { animation: fpr-close .2s  cubic-bezier(0.4,0,0.2,1) }
```
(Height animation is the documented radix pattern — the one sanctioned exception to transform-only; kept short.)

---

## 7. Backend Integration

**No new IPC endpoints.** Every interaction maps to an existing channel:

| Interaction | Endpoint |
|---|---|
| Toggle / complete goal | `saveGoal(date, goal)` (status/target.done) |
| Delete goal | `deleteGoal(id)` |
| Accept suggestion → goal | `saveGoal(today, goal)` |
| Request suggestions | `suggestGoals(today, ctx)` (ctx via `getGoalContext()`) |
| Daily review feedback | `saveGoalReview(today, msg)` |
| Week plan read/write | `readPlanningMd()` / `writePlanningMd(text)` |
| Long-term load | `getLongtermGoals()` |
| Long-term add/edit/reorder | `saveGoal(...)` (priority field) |
| Bulk parse | `parseGoalDump(text)` |
| Bulk import | `saveGoalsBatch(batch)` |
| Digests | `getTopicDigest(opts?)`, `isDigestGenerating()`, `onDigestGenerationComplete(cb)` |
| History | `getGoals(date)` for last 7 days |

**Data shapes:** unchanged (`Goal`, `LongTermGoal`, `TopicDigestItem`, `GoalDay` per §9). The only new *client-side* structure is the merged feed model built in the renderer:
```ts
type FeedEntry =
  | { kind:'digest'; date:string; topic:TopicDigestItem }
  | { kind:'history'; date:string; day:GoalDay }
// built by mapping topics (dated by generation/day) + last-7 GoalDays, then sort desc by date.
```
No persistence of the feed — derived on render. `localStorage` used only for section open/closed state and PlanBoard active tab (both try/catch).

---

## 8. Migration Path

1. **Primitives + installs.** Confirm `tokens.ts`, `GlassCard`, `SectionHead`, `StateShell`, `IconButton`, `StatusDot` exist. `npx shadcn@latest add @shadcn/progress @shadcn/collapsible @shadcn/dialog @shadcn/alert-dialog`; add re-skinned `animated-list`, `number-ticker`, `bento-grid` under `src/components/ai/ui/`. *Verify:* kitchen-sink story renders with tokens.
2. **Shared row.** Build `GoalCheckRow` + `CheckCircle` (§6.1) + `CATEGORY` map. *Verify:* toggle animation + a11y (`aria-pressed`, keyboard).
3. **PageSection wrapper.** inView entrance + mobile Collapsible + persisted open state. *Verify:* responsive 390/768/1280; reduced-motion.
4. **ReflectFeed** (lowest risk, read-mostly). Merge digest+history into timeline; wire Collapsible; all 4 states + generating. Keep `GoalHistoryCard`/`TopicDigestCard` as shims. *Verify:* filter tabs, expand, sources open.
5. **PlanBoard.** Merge Week + Long-term; dual-pane xl / tabs below; inline add, reorder (FLIP), `GoalDialog`, `BulkImportDialog` two-step. Shims for `MyPlanCard`/`LongTermPlanCard`. *Verify:* full CRUD + bulk parse→import + planning.md edit round-trip.
6. **FocusBoard.** Metric strip (bento re-skin + ring), checklist, suggestions, completed collapsible, ReviewPanel + FeedbackComposer, all modes. Shim for `DailyPlanCard`. *Verify:* morning/in-progress/review; suggest→accept→toggle→review flow.
7. **Switch AiPage + remove shims.** Point `AiPage.tsx` imports at the 3 boards; delete the 5 shim files. Confirm state contract unchanged (same props passed). *Verify:* full page at 1280px+ and mobile; no console errors; CRLF preserved (`git diff --stat` shows no line-ending churn).
8. **Self-audit** (§9) on all three boards.

---

## 9. Pre-Return Self-Audit (must pass per board)

**Anti-slop / re-skin checklist (§6 of bundle):**
- [ ] Component type fits role (bento = compact metrics, not hero; dialog for bulk; timeline for reflect).
- [ ] No source colors leaking — DeskFlow tokens only; category = dot + text (never color-only).
- [ ] `rounded-xl` max, `p-5` max, no `rounded-2xl/3xl`, no `p-6/8`, no box-shadow.
- [ ] SectionHead is the only header idiom; no cards nested in cards.
- [ ] Lucide icons only; every icon-only control has tooltip + aria-label; keyboard-focusable; ≥ 44px hit area.
- [ ] Every board has loading / empty / error / populated; error is plain-language + Retry; no raw JSON/enums.

**Motion / constraints:**
- [ ] Built at L2; no new ambient layers; no GlareHover; no GSAP; no spring (AnimatedList + NumberTicker corrected per §0.1).
- [ ] transform + opacity only (checkmark = pathLength, ring = dashoffset, reorder = layout/FLIP); radix Collapsible height is the sole sanctioned exception, ≤250ms.
- [ ] Durations 150/250/400ms; easing `[0.16,1,0.3,1]` / `[0.4,0,0.2,1]`; stagger 0.05; long lists cap entrance.
- [ ] `prefers-reduced-motion` collapses transforms + count-ups + list stagger to instant.
- [ ] All `localStorage` in try/catch; CRLF preserved; no new npm packages; no new IPC; no feature removed (CRUD, suggestions, bulk import, digests, history, plan edit all present).

---

## Appendix — Design decision log

- **5 cards → 3 boards** with one shared header/row/motion grammar is the core fix for “doesn’t make sense” — each board answers one question, no competing chrome.
- **Focus = checklist + compact metric strip**, not a data dump — the metric strip (bento re-skin) gives glanceable status; the checklist is the action surface.
- **Plan = one card, dual-pane (xl) / tabs (below)** replaces the cramped side-by-side full cards; bulk import becomes a polished **two-step dialog** that literally offers single-line fields *and* free-text (the user’s “single or multiple inputs” ask).
- **Reflect = timeline feed** unifies digests + history under one chronological metaphor; Collapsible replaces the bespoke accordions.
- **Sourced components are corrected, not copied** — spring, timed reveals, GSAP, glare, box-shadow, and hero density are all re-skinned/removed to fit the L2 dev-tool budget and DeskFlow invariants.
- **Zero new IPC / props supersets / re-export shims** keep the migration safe and reversible.
