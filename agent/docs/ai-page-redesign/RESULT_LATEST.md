# RESULT — DeskFlow AI Assistant Page: Full UI/UX Revamp Spec

Definitive, production-ready design specification for a complete revamp of `/ai`. Implementable from this document + `CONTEXT_BUNDLE.md` alone. One solution, not options. Dark Glass / dev-tool. L2 motion. Variance 5 / Motion 6 / Density 7.

---

## 0. Revamp Thesis (what was wrong → what we do)

| Rejection | Root cause | Fix in this spec |
|---|---|---|
| "Bland, generic cards" | Every card was identical zinc glass, no identity | Per-section **accent identity** (Chat=pink, Focus=emerald, Plan=violet, Reflect=amber, Digest=cyan) expressed only via SectionHead bar + primary metric |
| "Poor alignment" | No shared internal grid | Global **alignment grid**: 32px icon tiles, 88px label column, mono baseline for all numbers |
| "Wireframe feel" | Empty states defined the look | **Populated-first** design at density 7; empty states derived, never dominant |
| "Daily Digest buried" | Sat under Reflect | Promoted to a **hero band** directly under the chat, largest section header |
| "No rhythm" | Sections blended | Consistent section cadence: accent bar → title/desc → content → divider; staggered mount |

---

## 1. Architecture

### 1.1 Final component tree
```
AiPage.tsx  (owns all state; sticky header; aurora bg; stagger mount)
├─ PageHeader           (h-14 sticky: Bot, title, day label, mode pill, Settings/Features)
├─ ChatHero             GlassCard accent=pink, h-[520px]
│   └─ AiChat
│       ├─ ChatHeader        (StatusDot breathing, provider badge, reset/configure)
│       ├─ MessageList
│       │   ├─ MessageBubble     (user=pink / assistant=zinc, avatar, ts, copy)
│       │   ├─ TypewriterText    (streaming caret — latest assistant msg only)
│       │   ├─ AgentProgressBar  (scaleX round/tool progress)
│       │   └─ ThinkingIndicator (3 dots staggered opacity)
│       ├─ ChatEmptyState    (greeting + suggestion chips)
│       └─ ChatInput         (auto-resize, CharCountRing, VoiceInputButton, SendButton)
├─ ContextRail          grid xl:grid-cols-3
│   ├─ SummaryGrid (col-span-2)  — 4× MetricCard
│   └─ ConnectorsPanel (col-span-1)
├─ DailyDigestBoard     HERO band, accent=cyan
├─ WorkBoards           grid xl:grid-cols-2
│   ├─ FocusBoard   accent=emerald
│   └─ PlanBoard    accent=violet
├─ ReflectFeed          accent=amber
├─ Diagnostics (toggle)
└─ Footer
```

### 1.2 File structure (keep paths stable; re-export shims where split)
```
src/pages/AiPage.tsx                         (layout only; state unchanged)
src/components/ai/
  tokens.ts            SURFACE/RING/TEXT/ACCENT/MOTION (unchanged)
  GlassCard.tsx        + `accent` prop drives left bar + focus ring hue
  SectionHead.tsx      accent bar + title + desc + right slot + collapse toggle
  StatusDot.tsx        + `breathe` prop
  IconButton.tsx       32×32, tooltip, focus ring
  StateShell.tsx       loading|empty|error|ready crossfade
  MetricCard.tsx       NEW shared shell for SummaryGrid + Focus metrics
  primitives/
    CountUp.tsx        NEW duration-based ticker (replaces spring NumberTicker)
    CheckDraw.tsx      NEW pathLength checkmark
    Collapsible.tsx    shadcn re-skin
    Dialog.tsx         shadcn re-skin
    Progress.tsx       shadcn re-skin (determinate + indeterminate)
  focus/FocusBoard.tsx
  plan/PlanBoard.tsx   + WeekPane, LongTermPane, BulkImportDialog
  reflect/ReflectFeed.tsx
  digest/DailyDigestBoard.tsx
src/components/AiChat/*   (AiChat, ChatInput, message parts — re-skinned in place)
src/components/SummaryGrid.tsx  (rebuilt on MetricCard)
src/components/ConnectorsPanel.tsx
```

### 1.3 Data flow
`AiPage` owns all state and IPC (per CONTEXT_BUNDLE §5) and passes props down. No child owns fetch state beyond local UI (expanded/hover/edit-draft). `SummaryGrid` keeps `useAiPageData` caching + 60s refresh. `ConnectorsPanel` keeps its StateShell fetch. Redesigned children accept the **same props or a superset** — the state contract is unchanged.

---

## 2. Visual Design

### 2.1 Tokens (from tokens.ts — authoritative)
Surfaces `SURFACE`: base `bg-zinc-950`, card `bg-zinc-900/40`, cardHi `bg-zinc-900/60`, inset `bg-zinc-950/60`.
Rings `RING`: base `ring-1 ring-zinc-800/60`, hover `ring-zinc-700`, active `ring-zinc-600`, focus `focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none`.
Text `TEXT`: primary `text-zinc-100`, secondary `text-zinc-400`, muted `text-zinc-500`, disabled `text-zinc-600`.
Accents `ACCENT[key]` = { dot, bar, pill, hex } for pink / emerald / amber / violet / red. Cyan for digest uses `--accent-secondary #22d3ee` via a local `cyan` entry mirroring the ACCENT shape.

### 2.2 Depth & geometry (hard rules)
- No `box-shadow`. Elevation = ring brightness step (`ring-zinc-800/60` → `ring-zinc-700` on hover) + glass layer (`bg-zinc-900/40` → `/60`).
- Radius `rounded-xl` (12px) max; inner chips `rounded-lg`. Padding `p-5` max on cards; rows `px-3 py-2.5`; chips `px-2 py-1`.

### 2.3 Typography
- Body Geist/Inter **13px** (`text-[13px] leading-5`). Section title 600 15px. Card label 500 11px uppercase tracking-wide `text-zinc-500`. Numbers/code **JetBrains Mono** `tabular-nums`. No third font.

### 2.4 Alignment grid (fixes "alignment")
- Icon tile **32×32** `rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800/60`, icon 16px.
- Metric label column baseline; big number 24px mono; footer 11px muted.
- Row height 40px min; category dot 8px; check circle 18px; all left edges align to a 12px gutter.

### 2.5 Section accent identity
Chat pink `#f472b6` · Focus emerald `#10b981` · Plan violet `#a78bfa` · Reflect amber `#f59e0b` · Digest cyan `#22d3ee`. Accent appears ONLY on: SectionHead left bar, the section's primary metric/number, and its primary CTA/active state. Everything else stays zinc.

### 2.6 Animation summary table (all transform/opacity only)
| Interaction | Property | Duration | Easing |
|---|---|---|---|
| Section mount (staggered) | opacity 0→1, y 8→0 | 400ms | [0.16,1,0.3,1] |
| Child stagger step | — | delay 0.05×i | — |
| Card hover | ring color + y 0→-1 | 150ms | [0.16,1,0.3,1] |
| Goal check draw | pathLength 0→1 | 250ms | [0.16,1,0.3,1] |
| Metric count-up | textContent 0→N | 400ms | ease-out (JS) |
| Collapsible expand | height auto + opacity | 250ms | [0.4,0,0.2,1] |
| Dialog in | opacity + scale 0.98→1 | 150ms | [0.16,1,0.3,1] |
| Sync bar | translateX loop | 1200ms | linear (indeterminate) |
| Thinking dots | opacity 0.3→1 stagger | 400ms loop | [0.4,0,0.2,1] |
| Status dot breathe | opacity 0.5→1 | 2000ms loop | ease-inout |
| Send just-sent Check | scale 0→1 | 250ms | [0.16,1,0.3,1] |
| Typewriter caret | opacity blink | 800ms loop | steps |
| Tab/filter switch | underline x + content fade | 150ms | [0.16,1,0.3,1] |

All of the above collapse to opacity-only or none under `prefers-reduced-motion`. Loops (breathe, sync, caret, thinking) are disabled entirely when reduced-motion is set.

---

## 3. Component Specs

Every data component implements the 4-state contract via `StateShell`: **loading** (skeleton `animate-pulse bg-zinc-800/40`), **empty** (icon tile + message + CTA), **error** (red AlertCircle + message + Retry), **populated**.

### 3.1 Shared primitives

**GlassCard** `props { accent?: AccentKey; variant?: 'default'|'elevated'|'interactive'; children }`.
Classes: `rounded-xl p-5 bg-zinc-900/40 ring-1 ring-zinc-800/60`. `elevated` → `bg-zinc-900/60`. `interactive` adds hover `ring-zinc-700` + `whileHover={ { y: -1 } }`. Accent left bar: `absolute left-0 top-4 bottom-4 w-0.5 rounded-full` + `ACCENT[accent].bar`. Focus ring hue follows accent.

**SectionHead** `{ accent, icon, title, desc?, right?, collapsible?, collapsed?, onToggle? }`. Layout: accent bar + 32px icon tile + (title 600/15px + desc 13px muted) + right slot. On mobile, whole head is the accordion toggle (chevron rotates 180°, 150ms).

**StatusDot** `{ color, breathe? }` — 8px dot; breathe = infinite opacity 0.5→1 2s ease-inout (disabled on reduced-motion).

**IconButton** `{ icon, label, onClick, disabled?, active? }` — 32×32 `rounded-lg`, hover `bg-zinc-800/60`, active accent pill, focus ring, tooltip on hover/focus.

**MetricCard** (NEW shell) `{ accent, icon, label, value, format?, footer?, refreshing?, stale?, onRefresh? }` — icon tile top-left, label 11px uppercase, big number via `CountUp` 24px mono, footer row 11px. Stale = amber dot + "updated Xm ago"; hover reveals refresh IconButton.

**CountUp** (NEW; replaces spring NumberTicker) `{ value, decimals?, durationMs=400, format? }` — uses framer `useInView(once)` + `useMotionValue` + `animate(mv, value, { duration, ease:'easeOut' })`; writes `textContent` on change; no spring. Renders final value immediately under reduced-motion.

**CheckDraw** (NEW) — 18px SVG circle + `motion.path` `pathLength 0→1` 250ms on toggle; instant under reduced-motion.

### 3.2 PageHeader
Sticky `h-14`, `bg-zinc-950/80 backdrop-blur border-b border-zinc-800/60`, z-30. Left: Bot icon tile + "AI Assistant" 600 + day label mono muted. Right: mode pill (Morning/In-Progress/Review accent by mode), Settings + Features IconButtons. Never a hero eyebrow/CTA cliché.

### 3.3 AiChat (accent=pink)
Shell: GlassCard accent=pink, `h-[520px]`, flex-col. **ChatHeader**: breathing StatusDot (green ready / amber busy / red error) + provider badge pill + reset/configure IconButtons. **MessageList**: `flex-1 overflow-y-auto` scroll-area, `gap-3`. **MessageBubble**: user `bg-pink-500/10 ring-pink-500/20 text-zinc-100` right-aligned; assistant `bg-zinc-900/60 ring-zinc-800/60` left; 24px avatar; timestamp 11px muted on hover; copy IconButton on hover. **TypewriterText**: latest assistant msg only, blinking caret `w-[2px] bg-pink-400`. **AgentProgressBar**: thin track + `scaleX` fill mono label "round 2/3 · tool: search". **ThinkingIndicator**: 3 dots staggered opacity. States: loading=3 skeleton bubbles; empty=ChatEmptyState; error=inline ChatErrorRow + Retry; populated=list.

### 3.4 ChatInput
`bg-zinc-950/60 ring-1 ring-zinc-800/60 rounded-xl p-3`. Auto-resize textarea (max ~6 rows), Enter send / Shift+Enter newline. **CharCountRing** SVG appears ≥80% of limit (accent stroke = remaining). **VoiceInputButton** (Mic; recording = red breathe + waveform). **SendButton**: pink, disabled when empty; on send shows `CheckDraw` for 250ms then reverts.

### 3.5 SummaryGrid (4× MetricCard)
grid `grid-cols-2 xl:grid-cols-4 gap-3`. TodayOverview (pink): total seconds (h m mono), session count, top app. AiUsage (violet): token count, cost `$`, tool count, 6-bar mini sparkline (`scaleY` bars). ProjectStatus (emerald): project count, recent project, language badge pill. ContextSummary (amber): SVG **donut** completion ring (accent stroke `pathLength`), pending/done counts. 60s refresh, pause on `visibilitychange`, per-card stale + manual refresh. States per card: skeleton / empty ("No data yet") / error (Retry) / populated.

### 3.6 ConnectorsPanel
GlassCard + StateShell. **ConnectorCard**: TypeIcon tile, name 600, StatusDot, actions sync/test/remove/expand (IconButtons). **Sync**: indeterminate Progress bar + "Syncing…" mono. **Expanded ConnectorItemList**: ItemFilterBar (segmented All/Email/Event + search input + unread toggle) → **ConnectorItemRow** (unread dot, type glyph, subject 600 truncate, summary muted 1-line, date mono right) → **LoadMoreButton** (offset pagination). Empty="No connectors yet" + Add CTA; error=Retry.

### 3.7 DailyDigestBoard (HERO, accent=cyan)
Top band under chat, widest header. Calendar icon tile + "Daily Digest" 600/15 + "AI-curated" cyan pill + provider badge; right: refresh + configure IconButtons. **TopicCard** (Collapsible): topic 600 + source count chip; expanded = summary 13px + source links (favicon + title, hover ring). States: skeleton rows; **empty-no-topics** (BookOpen + "Add interest topics" CTA → configure); **empty-ready** ("Generate today's digest" CTA); generating = shimmer + "Curating…"; error=Retry. IPC: getTopicDigest / isDigestGenerating / onDigestGenerationComplete / interest-topic add/remove.

### 3.8 FocusBoard (accent=emerald)
**Metric strip**: 3 MetricCards (Done today / In progress / Focus time) with CountUp. **Mode indicator**: pill + icon (Sunrise/Activity/Moon) colored by mode. **Sections**: "From your plan", "AI suggestions" (each SuggestionRow with Accept → saveGoal + CheckDraw / Dismiss), "Today's goals" (GoalRow: CheckDraw toggle, category dot, title, target-seconds mono chip). **ReviewPanel** (Review mode): completion stats (donut) + feedback textarea → saveGoalReview. States: skeleton cards+rows; empty="Plan your day" + Suggest-goals CTA (suggestGoals); error=Retry. IPC: getGoals, suggestGoals, saveGoal, deleteGoal, saveGoalReview, getGoalContext.

### 3.9 PlanBoard (accent=violet)
Two-pane at xl (`grid xl:grid-cols-[7fr_5fr] gap-4`), **tabbed** below xl (segmented "This Week" | "Long-term"). **WeekPane**: Planning.md viewer; Edit toggles inline textarea (JetBrains mono) + Save/Cancel → read/write-planning-md; empty="Draft your week". **LongTermPane**: LongTermGoalRow (title, category dot, priority chip, target chip; reorder handle, delete via AlertDialog); Add row (inline single field, Enter to add); "Bulk import" opens **BulkImportDialog**. **BulkImportDialog** (shadcn Dialog): two modes in one — (a) stacked single-line fields with + add-another, (b) free-text paste → "Analyze with AI" (parseGoalDump) → editable preview list → Save all (saveGoalsBatch). States/skeleton/empty/error each pane. IPC: readPlanningMd, writePlanningMd, getLongtermGoals, parseGoalDump, saveGoal, saveGoalsBatch, deleteGoal.

### 3.10 ReflectFeed (accent=amber)
**Filter tabs** segmented: All / Research / Goals (with counts). **Timeline**: left vertical gradient line (`bg-gradient-to-b from-zinc-700 to-transparent`) + node dots per entry. **FeedDigest** (Collapsible): topic + summary + sources, hover ring lift. **FeedHistory** (Collapsible day): date header + goal status icons (done/partial/missed) + expand for goal list. Per-filter empty states (BookOpen / Brain / Calendar). Loading skeleton timeline. IPC: getGoalsBatch (7d), getTopicDigest.

---

## 4. Key Implementation Patterns

**Section wrapper + mobile accordion**
```tsx
const prefersReduced = useReducedMotion()
function Section({ accent, icon, title, desc, right, children }) {
  const [open, setOpen] = useState(true)
  return (
    <motion.section
      initial={ { opacity: 0, y: 8 } }
      whileInView={ { opacity: 1, y: 0 } }
      viewport={ { once: true, margin: '-10%' } }
      transition={ { duration: prefersReduced ? 0 : 0.4, ease: MOTION.ease } }
    >
      <SectionHead accent={accent} icon={icon} title={title} desc={desc}
        right={right} collapsible collapsed={!open} onToggle={() => setOpen(v => !v)} />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={ { height: 0, opacity: 0 } }
            animate={ { height: 'auto', opacity: 1 } }
            exit={ { height: 0, opacity: 0 } }
            transition={ { duration: prefersReduced ? 0 : 0.25, ease: MOTION.easeInOut } }
          >{children}</motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
```

**CountUp (no spring)**
```tsx
function CountUp({ value, durationMs = 400, format = (n:number)=>String(Math.round(n)) }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const prefersReduced = useReducedMotion()
  useEffect(() => {
    if (!ref.current) return
    if (prefersReduced || !inView) { ref.current.textContent = format(value); return }
    const mv = motionValue(0)
    const stop = mv.on('change', v => { if (ref.current) ref.current.textContent = format(v) })
    const controls = animate(mv, value, { duration: durationMs / 1000, ease: 'easeOut' })
    return () => { stop(); controls.stop() }
  }, [value, inView, prefersReduced])
  return <span ref={ref} className="tabular-nums font-[JetBrains_Mono]">0</span>
}
```

**CheckDraw goal toggle**
```tsx
<svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
  <circle cx="12" cy="12" r="9" className="fill-none stroke-zinc-600" strokeWidth={1.5} />
  {done && (
    <motion.path d="M8 12.5l2.5 2.5L16 9" className="fill-none stroke-emerald-400" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
      initial={ { pathLength: 0 } } animate={ { pathLength: 1 } }
      transition={ { duration: prefersReduced ? 0 : 0.25, ease: MOTION.ease } } />
  )}
</svg>
```

**Indeterminate sync bar** — track `bg-zinc-800/60 h-1 rounded-full overflow-hidden`; inner `w-1/3 bg-cyan-500/70` animated `x: ['-100%','300%']` 1200ms linear loop (disabled reduced-motion → static 30% pulse via opacity).

**localStorage guard** — always:
```ts
function safeGet(k: string) { try { return localStorage.getItem(k) } catch { return null } }
function safeSet(k: string, v: string) { try { localStorage.setItem(k, v) } catch {} }
```

**Brace note for implementers:** the framer props above are shown with a space between the outer and inner braces only to survive this document's placeholder compression. In real source, write them as normal JSX object literals — outer brace, inner brace, no space between them.

---

## 5. Backend Integration

Use only endpoints in CONTEXT_BUNDLE §14 — **no new IPC needed**. Mapping:
- Chat: `provider-chat-call` (stream via `provider-chunk`), `get-ai-providers`, `get-ai-config`/`save-ai-config`.
- Focus: `get-goals`, `suggest-goals`, `save-goal`, `delete-goal`, `save-goal-review`, `get-goal-context`.
- Plan: `read-planning-md`, `write-planning-md`, `get-longterm-goals`, `parseGoalDump`, `save-goal`, `save-goals-batch`, `delete-goal`.
- Digest: `get-topic-digest`, `is-digest-generating`, `onDigestGenerationComplete`, `get-interest-topics`, `add-interest-topic`, `remove-interest-topic`.
- Reflect: `get-goals-batch` (7d), `get-topic-digest`.
- Summary: `get-dashboard-aggregates`, `get-ai-usage-summary`, `get-projects`, `get-goals-batch`.
- Connectors: `connectors.list/add/remove/test/sync/items`.

No payload-shape changes. If `save-goals-batch` proves absent at implementation time, fall back to sequential `save-goal` calls — do not invent a new endpoint.

---

## 6. Migration Path (from current rejected build → this spec)

1. Restore baseline from `agent/backups/20260701-214701-ai-redesign-pre/` for any component that regressed; branch off that.
2. Land primitives first: extend `GlassCard`/`SectionHead`/`StatusDot`, add `MetricCard`, `CountUp`, `CheckDraw`, and re-skinned shadcn `Collapsible`/`Dialog`/`Progress` under `ai/primitives/`.
3. Apply the alignment grid + accent identity tokens globally (no visual regressions expected since tokens are additive).
4. Rebuild `SummaryGrid` on `MetricCard`; verify 60s refresh + stale + per-card refresh.
5. Promote `DailyDigestBoard` to the hero slot in `AiPage.tsx` (move above WorkBoards); wire all 3 states.
6. Rebuild `FocusBoard`, then `PlanBoard` (two-pane + BulkImportDialog), then `ReflectFeed` (timeline).
7. Re-skin `AiChat` + `ChatInput` in place (bubbles, TypewriterText, ThinkingIndicator, AgentProgressBar, CharCountRing, VoiceInputButton, SendButton CheckDraw).
8. Re-skin `ConnectorsPanel` (cards, sync bar, item list, filter bar, LoadMore).
9. Keep every export name/path stable; add re-export shims for any split file so external imports don't break.
10. Verify (§8) at 390 / 768 / 1024 / 1440; run `node scripts/build.mjs`.

---

## 7. MCP Component Mapping (source → re-skin)

| DeskFlow component | MCP source | Pulled | Re-skin applied |
|---|---|---|---|
| MetricCard number | magicui number-ticker | count-up logic | replaced `useSpring` with `animate(…duration, easeOut)`; `text-zinc-100` mono; no spring |
| Focus/Reflect entrance | motion-dev | in-view stagger | `MOTION.stagger` 0.05, transform/opacity only |
| Metric strip layout | magicui bento-grid | grid structure | compact rows (no `auto-rows-[22rem]`), no CTA, no box-shadow, DeskFlow ring/bg |
| Digest/History/Topic expand | shadcn collapsible | trigger+content | `rounded-xl`, DeskFlow ring, 250ms easeInOut |
| BulkImport / delete confirm | shadcn dialog + alert-dialog | modal shell | `bg-zinc-900 ring-zinc-800/60 rounded-xl p-5`; overlay `bg-black/50 backdrop-blur-sm` |
| Progress / sync bar / donut | shadcn progress | track+indicator | accent indicator, `bg-zinc-800/60` track; indeterminate variant added |
| Filter/mode segmented | shadcn tabs | segmented control | zinc inset, accent underline, 150ms |
| Item list reveal | magicui animated-list | stagger reveal | removed 1000ms timer + spring → immediate `MOTION.stagger` |
| Card hover polish | reactbits (GlareHover) | hover concept | dropped effect; use ring-brightness + y:-1 (glare = over-budget/box-shadow risk) |
| All icons | lucide | glyphs | Bot, Calendar, Brain, BookOpen, Flag, CheckCircle, Mic, Send, RefreshCw, AlertCircle, Sunrise, Activity, Moon, Plus, GripVertical, Trash2, Search |
| Tooltips/avatars/scroll-area/separator | shadcn | primitives | DeskFlow tokens, dark-only |

Unused by design (documented for completeness): border-beam, particles, meteors, confetti, unsplash imagery, iconify — all exceed the L2 ambient budget / product-fit; excluded intentionally.

---

## 8. Self-Audit Checklist

**Anti-slop**
- [x] Type: Geist body 13px, JetBrains mono numbers; no third font.
- [x] Color: DeskFlow tokens only; single accent per section; no purple-on-everything.
- [x] Geometry: `rounded-xl` + `p-5` max everywhere; source radii/padding stripped.
- [x] Hero: no eyebrow-pill + giant-headline + lone-CTA cliché.
- [x] Sections: no repeated tracked-uppercase kicker over every heading (labels used sparingly on metrics only).
- [x] Motion: micro-interactions on toggle/send/refresh; transform+opacity only; reduced-motion honored.
- [x] Imagery: none (no filler glow/blobs).
- [x] States: loading/empty/error/populated on every data component via StateShell.
- [x] Icons: all lucide; no emoji.
- [x] A11y: `--page-accent` focus rings; keyboard for all actions; 32px min targets.

**Constraints**
- [x] Tailwind v4; no box-shadow; transform/opacity only; 150/250/400ms; easing [0.16,1,0.3,1] / [0.4,0,0.2,1]; no spring.
- [x] localStorage in try/catch; CRLF preserved; renderer-first; React+framer+lucide+shadcn only; dark-only.
- [x] Existing IPC only; AiPage state contract preserved (props same-or-superset); all functionality retained.
- [x] No secrets logged.

**Verification to run at implementation**
- [ ] `node scripts/build.mjs` clean.
- [ ] `/#/ai` no console errors (renderer + main).
- [ ] Daily Digest prominent; every section has distinct identity + alignment.
- [ ] Responsive at 390 / 768 / 1024 / 1440.
- [ ] reduced-motion: no loops, opacity-only.
- [ ] 4 states render for every data component.
