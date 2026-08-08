# RESULT.md — Life Phases Overhaul

## Overview

This document converges `LIFE_PHASES_SPEC.md` and `THE_LIVING_ARCHIVE.md` into a single implementable specification. It covers the PhaseFormDialog (9-step input wizard), PhaseCard visualization, Ring & Grain hero, Timeline View, AI Reflection pipeline, and cross-feature connection points.

**Design thesis:** Life Phases is not a form. It is a personal monument. Every interaction should feel like being interviewed by someone who cares. Every visualization should earn the word "top tier" through restraint, not density.

---

## 1. Type Extensions

All additions are optional/nullable. Nothing existing is renamed, removed, or re-typed.

```ts
// types/lifePhase.ts

export type PhaseCategory =
  | 'growth' | 'career' | 'love' | 'challenge'
  | 'joy' | 'rest' | 'adventure' | 'creation';

export interface LifePhaseMilestone {
  id: string;
  date: string;              // ISO date, day precision
  label: string;
  note?: string | null;
  photoMemoryId?: string | null; // FK -> memories.id, optional
}

export interface LifePhasePerson {
  id: string;
  name: string;
  role: string;               // free text: "mentor", "co-founder", "mom"
  note?: string | null;
}

export type PhaseMoodTag =
  | 'hopeful' | 'exhausted' | 'proud' | 'lost' | 'grateful' | 'anxious'
  | 'free' | 'lonely' | 'inspired' | 'stuck' | 'peaceful' | 'restless';

export interface LifePhaseConnection {
  targetPhaseId: string;
  note?: string | null;       // e.g. "this is where the idea for that started"
}

export interface LifePhase {
  // ── existing, unchanged ──────────────────────────────
  id: string;
  title: string;
  description: string;
  category: PhaseCategory;
  startMonth: number;
  startYear: number;
  endMonth: number | null;
  endYear: number | null;
  magnitude: number;          // 1–10
  color: string;               // hex
  reflection: string | null;
  eraTrends: string | null;
  impactNotes: string | null;
  milestones: LifePhaseMilestone[];
  connections: LifePhaseConnection[];

  // ── new, additive, all nullable ──────────────────────
  people?: LifePhasePerson[] | null;
  moodStart?: number | null;         // -3 (struggling) … +3 (thriving)
  moodEnd?: number | null;
  moodTags?: PhaseMoodTag[] | null;
  feelingsNote?: string | null;
  lessonsLearned?: string | null;
  headerImageMemoryId?: string | null; // FK -> memories.id
  colorSource?: 'category' | 'custom' | null;
  reflectionSource?: 'manual' | 'ai' | 'ai-edited' | null;
  reflectionGeneratedAt?: string | null; // ISO timestamp
}
```

### Category Default Colors

| Category | Hex |
|----------|-----|
| growth | `#10b981` |
| career | `#3b82f6` |
| love | `#ec4899` |
| challenge | `#ef4444` |
| joy | `#f59e0b` |
| rest | `#8b5cf6` |
| adventure | `#06b6d4` |
| creation | `#f97316` |

---

## 2. Migration Spec

Runs in the main process, in the existing DB init/migration runner. Plain `ALTER TABLE`, no FK enforcement (SQLite + app-level integrity).

```sql
-- migrations/00XX_life_phases_overhaul.sql

ALTER TABLE life_phases ADD COLUMN people                  TEXT    DEFAULT NULL; -- JSON: LifePhasePerson[]
ALTER TABLE life_phases ADD COLUMN mood_start               INTEGER DEFAULT NULL; -- -3..3
ALTER TABLE life_phases ADD COLUMN mood_end                 INTEGER DEFAULT NULL; -- -3..3
ALTER TABLE life_phases ADD COLUMN mood_tags                TEXT    DEFAULT NULL; -- JSON: string[]
ALTER TABLE life_phases ADD COLUMN feelings_note             TEXT    DEFAULT NULL;
ALTER TABLE life_phases ADD COLUMN lessons_learned           TEXT    DEFAULT NULL;
ALTER TABLE life_phases ADD COLUMN header_image_memory_id    TEXT    DEFAULT NULL;
ALTER TABLE life_phases ADD COLUMN color_source              TEXT    DEFAULT 'category';
ALTER TABLE life_phases ADD COLUMN reflection_source         TEXT    DEFAULT NULL;
ALTER TABLE life_phases ADD COLUMN reflection_generated_at   TEXT    DEFAULT NULL;
```

Row mapper (`lifePhaseRepo.ts`) needs `JSON.parse`/`JSON.stringify` for `people` and `mood_tags`, mirroring existing `milestones`/`connections` pattern.

---

## 3. PhaseFormDialog Spec

### 3.1 Structure: Horizontal Stepper

Replace single-scroll Dialog with a horizontal stepper inside existing `shadcn/dialog` shell.

```
[ Basics ] → [ Story ] → [ Moments ] → [ People ] → [ Feelings ] → [ Lessons & Impact ] → [ Color & Preview ] → [ Connections ] → [ Review ]
```

- Progress shown as dots, not percentage bar.
- Back/Next always available. Click completed dot to jump.
- "Save as draft, finish later" from step 2 onward.
- Autosave to local state on every step change (not DB until Save).
- On close with meaningful fields filled: prompt "Keep as draft?"

### 3.2 State Shape

```ts
interface PhaseFormState {
  step: number;
  draft: Partial<LifePhase>;
  dirty: boolean;
  aiReflectionStatus: 'idle' | 'generating' | 'ready' | 'error';
  aiReflectionDraft: string | null;
}

type PhaseFormAction =
  | { type: 'SET_FIELD'; field: keyof LifePhase; value: unknown }
  | { type: 'ADD_MILESTONE'; milestone: LifePhaseMilestone }
  | { type: 'UPDATE_MILESTONE'; id: string; patch: Partial<LifePhaseMilestone> }
  | { type: 'REMOVE_MILESTONE'; id: string }
  | { type: 'ADD_PERSON'; person: LifePhasePerson }
  | { type: 'REMOVE_PERSON'; id: string }
  | { type: 'GOTO_STEP'; step: number }
  | { type: 'AI_REFLECT_START' }
  | { type: 'AI_REFLECT_SUCCESS'; text: string }
  | { type: 'AI_REFLECT_ERROR' }
  | { type: 'RESET' };
```

Use `useReducer`. No scattered `useState`.

### 3.3 Step-by-Step Field Spec

#### Step 1 — Basics
| Field | Control | Notes |
|-------|---------|-------|
| `title` | `Input`, `text-2xl warmth-serif` | Placeholder: "What do you call this chapter?" |
| `category` | 8 `Badge`-style chips | Icon + label; selecting previews default color on step 7 |
| `startMonth`/`startYear`, `endMonth`/`endYear` | Two `Select` pairs, "Still going" toggle | Validation: start ≤ end when both set |
| `magnitude` | `Slider` 1–10 | Dynamic word label (see 3.4) |

#### Step 2 — The Story
- One large `Textarea` (`autoResize`, no max-length shown), `warmth-serif text-lg leading-relaxed`.
- Three rotating guided prompt chips (clickable, insert soft lead-in):
  - *"What defined this period?"*
  - *"What were you becoming?"*
  - *"If this chapter had a title in a memoir, what would the first line be?"*
- No AI generation here. User's own words only.

#### Step 3 — Key Moments (`milestones`)
- List editor: date picker (compact), label `Input`, optional `note` (collapsible), optional photo attach (opens existing Memories picker, sets `photoMemoryId`).
- "+ Add a moment" ghost button. No pre-rendered empty row.
- Auto-reorder by date. No manual drag-sort.
- Empty state: *"Not every chapter has a clean list of dates. Skip this if it doesn't fit."*

#### Step 4 — The People (`people`)
- Chip-based add: `Input` name + `Input` role, "+ Add" appends chip.
- Avatar circle with initials, role beneath in `text-xs text-zinc-500`.
- Max 8 chips inline, then "+N more".
- No contact linking, no photo requirement.

#### Step 5 — Feelings & Mood
- `moodStart`/`moodEnd`: two horizontal sliders −3..+3, endpoints "Struggling" / "Thriving". Combined component showing arrow between positions.
- `moodTags`: multi-select chip cloud of 12 values, toggle on tap, max 5.
- `feelingsNote`: short `Textarea`, prompt: *"How did this chapter actually feel, day to day?"*

#### Step 6 — Lessons & Impact
- `lessonsLearned`: `Textarea` with AI-assist button **"Help me find the words"**.
  - Calls `window.deskflowAPI.lifePhase.aiAssist({ kind: 'lessons', context })`
  - Returns 2–3 candidate **questions** (not answers), e.g. *"What would you tell your past self on day one?"*
  - User writes the answer. AI frames, never ghostwrites.
- `impactNotes`: `Textarea`, prompt: *"How are you different now than before this chapter?"*

#### Step 7 — Color & Preview
- Color source toggle: "Use category color" (default) vs "Custom" → curated swatch grid (dark-mode-safe, not raw hex picker).
- Live `PhaseCard` preview at 60% scale, updates in real time.

#### Step 8 — Connections
- Mini horizontal timeline showing existing phases as colored ticks.
- Click tick to toggle connection. Connected ticks get connecting arc.
- Optional `note` per connection via inline popover: *"How does this connect?"*
- Skip entirely if no existing phases (first-ever phase).

#### Step 9 — Review & Reflect
- Full-size `PhaseCard` preview.
- **"Generate reflection"** button → AI Reflection pipeline (§6).
- Streams into editable `Textarea`. Accept, edit, or discard.
- `reflectionSource`: `'ai'` on accept, `'ai-edited'` if touched, `'manual'` if skipped.
- Final "Save this chapter" commits via `window.deskflowAPI.lifePhase.save(draft)`.

### 3.4 Magnitude Slider — Dynamic Labels

| Range | Word |
|-------|------|
| 1–2 | Quiet |
| 3–4 | Notable |
| 5–6 | Significant |
| 7–8 | Defining |
| 9–10 | Everything changed |

Word renders in `font-display`. Slider track fill uses phase's current color.

---

## 4. PhaseCard Spec

### 4.1 Header Band

- Height: `h-64` (`h-48` on compact/grid views).
- Base: solid category/custom color.
- Texture: slow-drifting radial gradient (framer-motion `animate` on `background-position`, 20–30s, `ease: 'linear'`, `repeat: Infinity`).
- If `headerImageMemoryId`: memory photo at `mix-blend-mode: luminosity` behind color at ~60% opacity. Color becomes duotone overlay at ~70% opacity.
- Magnitude: top-right, `font-display text-8xl text-white/10`, ghost number.
- Title: bottom-left, `warmth-serif text-3xl text-white`.
- Date range: beneath title, `font-mono text-sm text-white/70`.

```tsx
<div className="relative h-64 overflow-hidden rounded-t-xl" style={{ backgroundColor: phase.color }}>
  {phase.headerImageMemoryId && (
    <img
      src={memoryUrl(phase.headerImageMemoryId)}
      className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-60"
      alt=""
    />
  )}
  <motion.div
    className="absolute inset-0 opacity-30"
    style={{ background: `radial-gradient(circle at 30% 30%, ${lighten(phase.color, 20)}, transparent 60%)` }}
    animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
    transition={{ duration: 26, repeat: Infinity, repeatType: 'mirror', ease: 'linear' }}
  />
  <span className="absolute right-5 top-3 font-display text-8xl text-white/10 select-none">
    {phase.magnitude}
  </span>
  <div className="absolute bottom-5 left-5">
    <h3 className="warmth-serif text-3xl text-white">{phase.title}</h3>
    <p className="mt-1 font-mono text-sm text-white/70">{formatRange(phase)}</p>
  </div>
</div>
```

### 4.2 Body — Order Matters

1. **Memory pearls** (if memories in date range) — scattered gallery above all text. 3–6 photos as rotated polaroid thumbnails (`rotate-[-4deg]`, `rotate-[3deg]`, alternating, varied `scale`). `+N` chip for overflow. Click → lightbox.
2. **Story** — `warmth-serif text-base leading-relaxed text-zinc-300`, clamped to ~5 lines with "Read more" expand (framer-motion `layout` height animation).
3. **Key Moments** — vertical timeline: `border-l border-zinc-700` with dots (`bg-[phase.color]`), date in `font-mono text-xs`, label in `text-sm text-zinc-200`. Staggered reveal on scroll (`viewport={{ once: true }}`, `staggerChildren: 0.05`).
4. **People** — row of avatar chips: `h-8 w-8 rounded-full` initials on `bg-zinc-800`, role tooltip on hover, name+role popover on click.
5. **Mood** — thin horizontal gradient bar from `moodStart` to `moodEnd` color-position (red-ish struggling → warm gold thriving, within warmth palette). `moodTags` as small pill badges beneath.
6. **Lessons** — pull-quote: `warmth-serif italic text-xl`, oversized decorative quotation glyph in `text-[phase.color]/20` behind it, left border accent in phase color.
7. **Connections** — footer row of small chips ("→ First Job"), click smooth-scrolls timeline to target card and briefly highlights it (`ring-2 ring-[color]` pulse, 800ms).
8. **Connection strip (data)** — collapsed by default, header "What I was doing then" with chevron. Expands to §7.

```tsx
<motion.div variants={cardBody} initial="hidden" whileInView="show" viewport={{ once: true }} className="p-5 space-y-6">
  {memories.length > 0 && <MemoryPearls memories={memories} />}
  <StoryBlock text={phase.description} />
  {phase.milestones.length > 0 && <MomentsTimeline milestones={phase.milestones} color={phase.color} />}
  {phase.people?.length ? <PeopleChips people={phase.people} /> : null}
  {(phase.moodStart != null || phase.moodEnd != null) && (
    <MoodBar start={phase.moodStart} end={phase.moodEnd} tags={phase.moodTags} />
  )}
  {phase.lessonsLearned && <LessonQuote text={phase.lessonsLearned} color={phase.color} />}
  {phase.connections.length > 0 && <ConnectionChips connections={phase.connections} onJump={scrollToPhase} />}
  <ConnectionDataStrip phaseId={phase.id} range={{ start: phase.startYear, end: phase.endYear }} />
</motion.div>
```

Framer-motion variants:
```ts
const cardBody = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
```

---

## 5. Ring & Grain Hero (Core Sample)

### 5.1 The Central Metaphor

A circular cross-section at the top of `/life`. Each ring = one phase, nested outward chronologically (oldest center, most recent outer edge).

| Visual | Maps to |
|--------|---------|
| Ring width | Phase magnitude |
| Ring color | Category |
| Ring texture / grain | Covenant density for that period |
| Branches breaking outward | Long-term goals (Gold) |
| Amber pockets | Memories |
| Outer translucent edge | Today — living, unfinished |

### 5.2 Ring Geometry

- Slight hand-drawn irregularity on ring edges: SVG `feTurbulence`/`feDisplacementMap` (no new dependency).
- No perfect geometric circles — reads as chart. Imperfect reads as organic growth.
- Sparse data (no Covenant tracked) = smooth, unmarked wood. Not an error state.
- "Closing" a phase (setting end date) triggers a single slow hardening animation.

### 5.3 The Four Lenses

The ring stays on screen at all times. Switching lenses changes which layer is in focus; others dim to quiet background silhouettes.

- **Phases (default)** — full color, all layers visible equally.
- **Covenant** — grain brightens/scales up; outer edge shows today's commitments as marks that harden into grain on completion. Branches/amber recede.
- **Gold** — branches extend/thicken/glow; buds show progress values on hover. Daily goals appear as leaf-marks on today's edge. Grain/amber recede.
- **Memories** — amber pockets brighten/enlarge into thumbnails; click opens lightbox. Grain/branches recede.

Transition: shared crossfade/scale on existing ring geometry. Never a hard page swap.

### 5.4 Interaction — Ring Unroll

Clicking a ring triggers a `layoutId`-shared framer-motion transition where the ring "unrolls" — circle opens and straightens into the corresponding `PhaseCard` below. This is the highest-budget animation in the feature.

On `prefers-reduced-motion` or narrow viewports: collapse to the horizontal Timeline View (§6).

### 5.5 Today's Edge

Completing a Covenant commitment or daily Gold goal visibly adds a fleck of texture to the still-soft outer edge of the current ring. Over time, the edge densifies. At year-end, accumulated texture becomes the permanent grain of that ring.

The living edge is the only part that moves on its own — slow breathing opacity (4s cycle), nothing flashy. Everything else is still unless touched.

---

## 6. Timeline View Spec

Horizontal, scrollable strip — utility view alongside or fallback to Ring & Grain.

- Each phase = block whose **width ∝ duration** (min-width floor for short phases).
- Color = `phase.color`.
- Blocks on single `h-16` track, `gap-1`, `rounded-md`.
- Title truncated inside if width allows, else tooltip.
- **Now marker**: vertical line at today's position with pulsing dot (`animate-ping` duplicated span pattern).
- Click block → smooth-scrolls to `PhaseCard`, expands if collapsed.
- Zoom toggle: "All time" / "By year" — "By year" adds year gridlines and month ticks.
- Horizontal scroll: `scroll-snap-type: x proximity`.
- Empty gaps: thin dashed `border-zinc-800` segment — "life continued here, just not logged yet."

```tsx
<div className="relative h-16 flex gap-1 overflow-x-auto snap-x snap-proximity">
  {timelineBlocks.map((block) =>
    block.kind === 'phase' ? (
      <button
        key={block.phase.id}
        onClick={() => scrollToPhase(block.phase.id)}
        className="snap-start shrink-0 rounded-md flex items-end p-2 transition-transform hover:-translate-y-1"
        style={{ width: block.widthPx, backgroundColor: block.phase.color }}
      >
        <span className="truncate text-xs font-mono text-white/90">{block.phase.title}</span>
      </button>
    ) : (
      <div key={block.id} className="snap-start shrink-0 border-b-2 border-dashed border-zinc-800" style={{ width: block.widthPx }} />
    )
  )}
  <div className="absolute top-0 bottom-0" style={{ left: nowOffsetPx }}>
    <span className="relative flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
    </span>
  </div>
</div>
```

---

## 7. AI Reflection Spec

### 7.1 Payload

```ts
interface AiReflectRequest {
  phaseId: string;
  title: string;
  category: PhaseCategory;
  dateRange: { start: string; end: string | null };
  story: string;
  milestones: { date: string; label: string; note?: string }[];
  people: { name: string; role: string }[];
  moodStart: number | null;
  moodEnd: number | null;
  moodTags: PhaseMoodTag[];
  feelingsNote: string | null;
  lessonsLearned: string | null;
  impactNotes: string | null;
  periodContext?: PeriodContext; // see §8
}
```

Called via: `window.deskflowAPI.lifePhase.aiReflect(request)`

### 7.2 Tone Contract (System Prompt)

> Write as a perceptive, warm friend who has read this person's own words about this chapter — not a corporate summary bot, not a therapist, not a hype machine. Reference specific things they wrote (a milestone, a person, a lesson). One tight paragraph, 60–120 words. Never invent facts, numbers, or events not present in the input. If mood data suggests hardship, acknowledge it honestly before naming what came out of it.

### 7.3 Output Contract

```ts
interface AiReflectResponse {
  reflection: string;
  confidence: 'grounded' | 'sparse'; // 'sparse' if input too thin for specifics
}
```

If `confidence: 'sparse'`, UI shows inline note: *"You gave me a lot of dates but not much story — want to add a sentence or two so this feels more like you?"*

### 7.4 Regeneration

"Try again" re-calls with `variation` seed/instruction: *"give me a different angle on the same chapter."*

---

## 8. Connection Points (PeriodContext)

### 8.1 New IPC Handler

```ts
// window.deskflowAPI.lifePhase.getPeriodContext(startDate: string, endDate: string): Promise<PeriodContext>

interface PeriodContext {
  goals: { completedCount: number; longTermGoalTitles: string[] };
  focusGroups: { name: string; totalMs: number }[];
  externalActivities: { label: string; totalMs: number }[];
  memories: { id: string; date: string; thumbnailUrl: string }[];
  appUsage?: { topApps: { name: string; totalMs: number }[] } | null;
  covenantCompletionRate?: number | null; // for grain density calculation
}
```

Main-process implementation: aggregate over existing `goals`, `focus_groups`/session tables, `external_activities`, `memories`, `app_sessions`, and `covenant` tables filtered by date range. No schema changes.

### 8.2 Connection Strip (ConnectionDataStrip)

Lazy-loads on expand. Never blocks initial card render.

| Connection | Surfaces As | Empty State |
|------------|-------------|-------------|
| Goals | "During this chapter" strip: completed count + up to 3 LTG titles as chips | "No goals tracked yet during this period" |
| Focus Groups | Small horizontal stacked bar, proportional to time | Section omitted if zero |
| External Activities | Top 3 by time, icon + label + duration | Omitted if empty |
| Memories | Feeds Memory Pearls gallery + `headerImageMemoryId` suggestion | Pearls omitted if empty |
| App Usage | Top 3 apps by time, small bar chart | Omitted if empty (designed to disappear cleanly) |

---

## 9. Implementation Plan (Build Order)

Shippable after every step. Old phases (all-null new fields) render correctly at every stage.

| Step | Task | Files | Notes |
|------|------|-------|-------|
| 1 | Migration + repo deserialization | `migrations/`, `lifePhaseRepo.ts` | Isolated, testable |
| 2 | Type extensions | `types/lifePhase.ts` | Compile-time only |
| 3 | PhaseCard visual overhaul | `PhaseCard.tsx`, sub-components | Works on old data immediately |
| 4 | Timeline View | `TimelineView.tsx` | Independent, additive |
| 5 | PhaseFormDialog stepper | `PhaseFormDialog.tsx`, step components | Build steps 1–2 first (match old scope), then 3–8 |
| 6 | `getPeriodContext` handler + ConnectionDataStrip | `main.ts` (handler), `ConnectionDataStrip.tsx` | Touches multiple features' data |
| 7 | AI reflection payload extension | `main.ts` (handler), `PhaseFormDialog.tsx` (step 9) | Wire in once Story/Milestones/People/Feelings/Lessons exist |
| 8 | Ring & Grain hero | `CoreSample.tsx`, `RingCanvas.tsx` | SVG-based, framer-motion transitions |
| 9 | Four-lens system | Lens state + ring render layers | Crossfade/scale transitions |
| 10 | Today's Edge mechanic | Covenant/Gold completion hooks → grain texture update | Causal connection, not decorative |

---

## 10. Backend Audit — Missing / To Flag

| Item | Status | Action |
|------|--------|--------|
| `lifePhase.aiAssist` (lessons framing) | **NEW** | Add IPC handler. Payload: `{ kind: 'lessons', context: { story, feelings, milestones, people } }`. Returns 2–3 questions. |
| `lifePhase.getPeriodContext` | **NEW** | Add IPC handler. Date-range aggregation over goals, focus_groups, external_activities, memories, app_sessions, covenant. |
| `memoryUrl()` helper | **VERIFY** | Check if exists in memories feature. If not, implement: `memoryUrl(memoryId) =>` local file path or blob URL. |
| `lighten()` color utility | **VERIFY** | Check if exists. If not, implement simple hex-lighten: parse hex → HSL → adjust L → back to hex. |
| Covenant completion rate query | **VERIFY** | Check existing `useCovenant.ts` / covenant repo for date-range aggregation pattern. Reuse or specify SQL. |
| `headerImageMemoryId` auto-suggestion | **NEW** | In step 7 of form, suggest memory with date closest to phase start. Optional — user can override. |
| Ring unroll `layoutId` animation | **NEW** | Framer-motion shared layout transition from ring SVG to PhaseCard DOM element. Requires stable `layoutId` strings. |

---

## 11. Design References

| Reference | Why |
|-----------|-----|
| Feltron Annual Reports (feltron.com) | "My life as editorial document" tone |
| Dear Data — Giorgia Lupi & Stefanie Posavec | Data Humanism: hand-drawn, imperfect, intimate |
| Simulated dendrochronology of U.S. immigration (vimeo.com/276140430) | Exact precedent: time-series as tree growth rings |

---

*Converged from LIFE_PHASES_SPEC.md and THE_LIVING_ARCHIVE.md. Ready for implementation.*


---

## 12. What the Specialist Cannot Do — Agent Setup Required

The Specialist (this AI) designed the architecture, visual system, and interaction model without codebase access. The following items **require the Project Owner AI (OpenCode)** or **CZ (you)** to set up or verify. This section is a checklist for your agent.

### 12.1 MCP Tool Servers (External Design Tools)

These require OAuth setup in your local IDE environment. The Specialist cannot connect to them.

| Tool | Server URL | What to Use It For | Setup Steps |
|------|------------|---------------------|-------------|
| **Figma** | `https://mcp.figma.com/mcp` | Pull design tokens, screenshots, component specs if you sketch the Ring & Grain or PhaseCard in Figma first. | 1. Open Claude Code / OpenCode settings. 2. Add MCP server URL. 3. Authenticate via OAuth. 4. Use `get_design_context`, `get_screenshot`, `create_design_system_rules`. |
| **Magic Patterns** | `https://mcp.magicpatterns.com/mcp` | Iterate on generated UI directly and export working React/Tailwind code. | 1. Add MCP server. 2. OAuth. 3. Paste design prompts from this spec. 4. Export components. |
| **v0** | `https://v0.app/api/mcp` | Generate shadcn + Tailwind components matching DeskFlow's exact stack. | 1. Add MCP server. 2. OAuth. 3. Prompt with "dark mode, Tailwind v4, zinc-900/950, glass-morphism, warmth-serif font". 4. Export and adapt. |

**Recommendation:** If you want to prototype the Ring & Grain SVG or the PhaseCard layout visually before coding, set up **v0** first — it exports shadcn-compatible code that OpenCode can drop directly into the codebase.

### 12.2 Codebase Context the Specialist Needs But Cannot Access

The Specialist asked for these in `CONTEXT_GAPS.md`. OpenCode should fetch and verify:

| Item | File Path (likely) | Why It Matters |
|------|---------------------|----------------|
| `memoryUrl()` helper | `src/features/memories/useMemories.ts` or similar | PhaseCard header band needs to resolve `headerImageMemoryId` to a renderable URL. If this doesn't exist, implement it. |
| `lighten()` color utility | `src/lib/colors.ts` or `src/utils/color.ts` | Header band radial gradient needs to lighten the phase color by ~20%. If missing, implement a simple HSL-based hex lightener. |
| Covenant completion rate query | `src/features/covenant/useCovenant.ts` or DB repo | `getPeriodContext` needs covenant completion rate for grain density. Reuse existing date-range aggregation or write new SQL. |
| Design tokens (exact values) | `index.css`, `tailwind.config.ts` | The Specialist assumed `warmth-serif`, `zinc-900/950`, glass-morphism. Verify exact font names, color hexes, and Tailwind v4 syntax. |
| `WarmCard` component | `src/features/warmth/WarmCard.tsx` | PhaseCard may extend or reference this. Verify its props and styling. |
| `shadcn/dialog` usage | `src/components/ui/dialog.tsx` | PhaseFormDialog stepper lives inside this. Verify current Dialog API and if it supports custom footer/progress. |
| Framer Motion version | `package.json` | The spec uses `layoutId`, `animate`, `whileInView`, `staggerChildren`. Verify Framer Motion is installed and version supports these APIs. |
| Existing `lifePhase:*` IPC handlers | `src/main.ts` (main process) | Verify current 7 handlers (get/save/delete/saveAll/aiReflect/aiEraTrends/aiSummarize) and their exact signatures before extending. |
| Memories picker component | `src/features/memories/` | Step 3 (Moments) and Step 7 (Color & Preview) need to open an existing memory picker. Find and reuse it. |
| Goal hooks | `src/hooks/useFocusGoals.ts` | Connection strip needs goal data. Verify hook API. |
| Focus group data access | `src/features/focus/` | Connection strip needs focus group time aggregates. Verify tables and hooks. |
| App usage / tracking data | `src/pages/ProductivityPage.tsx`, `src/main.ts` | Connection strip optional app usage section. Verify if app session tracking exists and how to query it. |
| External activities data | `src/pages/ExternalPage.tsx` | Connection strip needs external activities by time. Verify schema and hooks. |
| AI model endpoint for reflections | `src/main.ts` (aiReflect handler) | The spec extends `aiReflect` with richer payload. Verify which LLM is used (OpenAI? Local? Claude?) and how to add system prompt constraints. |

### 12.3 Backend Implementation Checklist (OpenCode)

These are the concrete code changes the Specialist specified but cannot write against your actual DB schema:

- [ ] **Migration SQL** (§2): Run the 10 `ALTER TABLE` statements in your existing migration runner. Verify `life_phases` table name matches.
- [ ] **Repo deserialization** (`lifePhaseRepo.ts`): Add `JSON.parse`/`JSON.stringify` for `people` and `mood_tags` columns. Mirror existing `milestones`/`connections` pattern exactly.
- [ ] **New IPC handler: `lifePhase.aiAssist`**:
  - Channel: `lifePhase:aiAssist`
  - Payload: `{ kind: 'lessons', context: { story, feelingsNote, milestones, people } }`
  - Returns: `{ questions: string[] }` (2–3 open-ended questions)
  - Implementation: Call existing LLM with system prompt: *"Given this life phase context, generate 2–3 reflective questions that help the user articulate their lessons. Do not answer them."*
- [ ] **New IPC handler: `lifePhase.getPeriodContext`**:
  - Channel: `lifePhase:getPeriodContext`
  - Params: `startDate: string, endDate: string`
  - Returns: `PeriodContext` (§8.1)
  - SQL to write: Date-range filtered aggregates over `goals`, `focus_group_sessions`, `external_activities`, `memories`, `app_sessions`, and `covenant` tables.
  - Add `covenantCompletionRate` field: count of completed covenant entries / total entries in date range.
- [ ] **Extend `lifePhase.aiReflect` handler**:
  - Accept new `AiReflectRequest` payload (§7.1) with all new fields.
  - Update system prompt to include tone contract (§7.2) and groundedness constraint (never invent facts).
  - Return `confidence: 'grounded' | 'sparse'` based on story/milestone density.
- [ ] **`memoryUrl()` helper** (if missing):
  - Input: `memoryId: string`
  - Output: URL string (blob URL for local files, or resolved path)
  - Used by: PhaseCard header band, Memory Pearls gallery.
- [ ] **`lighten()` helper** (if missing):
  - Input: `hex: string, percent: number`
  - Output: lightened hex string
  - Simplest implementation: parse hex → RGB → HSL → increase L by percent → back to hex.

### 12.4 Design Token Verification (CZ or OpenCode)

The Specialist assumed the following design system. Verify before implementing:

| Token | Assumed Value | Verify In |
|-------|---------------|-----------|
| Dark mode bg | `zinc-900` / `zinc-950` | `index.css` or Tailwind config |
| Glass card | `backdrop-blur`, `bg-zinc-900/50`, `border-white/10` | `WarmCard.tsx` |
| Serif font | `warmth-serif` or similar | `tailwind.config.ts` fontFamily |
| Display font | `font-display` | `tailwind.config.ts` fontFamily |
| Mono font | `font-mono` | `tailwind.config.ts` fontFamily |
| Accent colors | See §1 Category Default Colors | Verify against existing app usage |
| Framer Motion | Installed and working | `package.json` |
| shadcn/ui | Dialog, Input, Textarea, Select, Slider, Badge | `src/components/ui/` |

### 12.5 Asset & Content Gaps

| Gap | Resolution |
|-----|------------|
| Category icons | The spec mentions "icon + label" for category chips (Step 1). Verify if icon set (Lucide? Heroicons?) is already used in the app. Pick 8 consistent icons. |
| `headerImageMemoryId` auto-suggestion | In Step 7, suggest the memory with date closest to phase start date. Requires `getPeriodContext` or a direct memory query. Optional — user can always pick manually. |
| Empty state illustrations | The spec uses text-only empty states. If you want visual empty states (e.g., a small SVG for "no memories yet"), design or source them separately. |
| Ring SVG `feTurbulence` filter | The organic ring edges use SVG filters. Test performance on your target hardware — if slow, fall back to simple `stroke-dasharray` texture or pre-warped paths. |

### 12.6 Testing Strategy (OpenCode)

Before marking each build step complete:

| Step | Test |
|------|------|
| 1 (Migration) | Run migration. Verify old rows have NULL new columns. Insert test row with all new fields. Read back and assert JSON parse works. |
| 2 (Types) | `tsc --noEmit` passes with new interfaces. |
| 3 (PhaseCard) | Render a phase with all-null new fields — should look correct (no broken sections). Render a phase with all fields populated — should show all 8 body sections. |
| 4 (Timeline) | Empty state: shows dashed gaps. Populated: blocks proportional to duration. Now marker visible. Click scrolls to card. |
| 5 (Form) | Complete all 9 steps. Save. Verify DB row has all fields. Test "Save as draft" local state. Test jump between completed dots. |
| 6 (Connections) | Expand connection strip on a phase with tracked data — verify all 5 connection types render. Test empty state for each. |
| 7 (AI Reflection) | Generate reflection on a phase with rich story → should be grounded, reference specifics. Generate on sparse phase → should return `confidence: 'sparse'` with inline note. |
| 8–10 (Ring & Grain) | Test lens switching. Test ring click → card unroll. Test `prefers-reduced-motion` fallback to Timeline. Test narrow viewport fallback. |

---

## 13. Handoff Summary

**What the Specialist delivered:**
- Complete design specification (this document)
- Interactive Ring & Grain prototype (widget)
- Exact type extensions, migration SQL, IPC signatures
- 10-step build order, each shippable independently
- Empty-state and error-state handling for every feature

**What OpenCode needs to do:**
- Fetch codebase context (§12.2)
- Implement backend handlers (§12.3)
- Verify design tokens (§12.4)
- Set up MCP servers if prototyping visually (§12.1)
- Run tests per §12.6

**What CZ needs to do:**
- Relay any additional context OpenCode discovers that contradicts this spec
- Decide if MCP servers are worth setting up (recommended: v0 for component prototyping)
- Test the emotional feel of the form — the spec is designed for intimacy, but only you can say if it feels right

---

*End of RESULT.md. Ready for implementation.*
