# Life Phases Overhaul — Engineering & Design Specification
### DeskFlow · The River of Years (`/life`)

**Status:** Design + engineering spec, ready for implementation
**Scope:** `PhaseFormDialog`, `PhaseCard`, `RiverMap`/Timeline, AI reflection pipeline, DB migration
**Constraints honored:** Tailwind v4 only, no new npm packages, dark mode only, IPC-only renderer↔main communication via `window.deskflowAPI`, `better-sqlite3` stays in main process, existing `LifePhase` fields untouched (additive only)

---

## 0. Design Thesis

Life Phases is the one screen in DeskFlow that isn't about optimizing anything. Every other page in the app is instrumentation — it tells you what you did. This page is supposed to tell you **who you were becoming while you did it**. The current form (5 fields) and card (h-36 header + description) treat a chapter of someone's life like a changelog entry. The overhaul treats it like what it actually is: a small monument.

Three design commitments follow from that:

1. **Input should feel like being interviewed by someone who cares, not filling out a form.** Every field that asks for a fact (dates, category) is quick. Every field that asks for meaning (story, feelings, lessons) gets a prompt, room to breathe, and no character-count pressure.
2. **The visualization should earn the word "top tier" through restraint, not density.** One animated header, one serif pull-quote, one mood gradient — not six competing effects. Soul comes from typography and motion timing, not from stacking widgets.
3. **Connections to the rest of the app are shown, not forced.** A new user with zero goals/memories/tracking history should see an *empty, inviting* connection strip, never a broken one. Every connection point degrades gracefully to "nothing tracked here yet — that's okay."

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
  role: string;               // free text: "mentor", "co-founder", "mom" — not an enum
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
  headerImageMemoryId?: string | null; // FK -> memories.id; auto-picked or user-chosen
  colorSource?: 'category' | 'custom' | null;
  reflectionSource?: 'manual' | 'ai' | 'ai-edited' | null;
  reflectionGeneratedAt?: string | null; // ISO timestamp
}
```

**Why `moodStart`/`moodEnd` instead of one mood value:** phases rarely feel the same on day one as they do at the end (a "challenge" phase often starts anxious and ends proud). Two points let the card draw a mood *arc*, which is more honest than a single snapshot and is cheap to visualize as a gradient direction.

---

## 2. Migration Spec

Runs in the main process, in the existing DB init/migration runner. Plain `ALTER TABLE`, no FK enforcement (SQLite + app-level integrity, consistent with how `photoMemoryId` already works elsewhere in the schema).

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

Row mapper (`lifePhaseRepo.ts`) needs `JSON.parse`/`JSON.stringify` added for `people` and `mood_tags`, mirroring how `milestones`/`connections` are already (de)serialized — no new pattern introduced.

---

## 3. PhaseFormDialog Spec

### 3.1 Structure: a stepper, not a form

Nine fields worth of meaning-capture in one scroll is what killed the old form's *feeling* even before it hit its field-count ceiling. Replace the single-scroll `Dialog` body with a **horizontal stepper** inside the existing `shadcn/dialog` shell (same modal chrome, new internal navigation). Steps are short on purpose — most take under 20 seconds.

```
[ Basics ] → [ Story ] → [ Moments ] → [ People ] → [ Feelings ] → [ Lessons & Impact ] → [ Color & Preview ] → [ Connections ] → [ Review ]
```

- Progress shown as dots, not a percentage bar (percentage implies a task; dots imply a walk).
- Back/Next always available. Every step is independently valid — user can jump via clicking a completed dot.
- "Save as draft, finish later" available from step 2 onward — this is not a task you should feel pressured to finish in one sitting.
- Autosave to local state on every step change (not to DB until final Save) so nothing is lost on accidental close; on close, prompt "Keep as draft?" if any meaningful field is filled.

### 3.2 State shape

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

A `useReducer` here (not scattered `useState`) matters because milestones/people are list-mutations and the AI step needs a clean async lifecycle — this keeps `PhaseFormDialog.tsx` legible instead of nine `useState` calls fighting each other.

### 3.3 Step-by-step field spec

**Step 1 — Basics**
| Field | Control | Notes |
|---|---|---|
| `title` | `Input`, large text (text-2xl, warmth-serif) | Placeholder: "What do you call this chapter?" |
| `category` | 8 `Badge`-style chips (not a `Select` dropdown) | Icon + label per category; selecting previews the category's default color immediately on step 7 |
| `startMonth`/`startYear`, `endMonth`/`endYear` | Two `Select` pairs, "Still going" toggle sets end to `null` | Validation: start ≤ end when both set |
| `magnitude` | `Slider` 1–10 | See 3.4 for dynamic label behavior |

**Step 2 — The Story**
- One large `Textarea` (`autoResize`, no max-length shown), warmth-serif at `text-lg`, generous `leading-relaxed`.
- Above it, three rotating guided prompts as ghost text / clickable chips that insert a soft lead-in on click (not autofill — just a starting sentence fragment the cursor lands after):
  - *"What defined this period?"*
  - *"What were you becoming?"*
  - *"If this chapter had a title in a memoir, what would the first line be?"*
- No AI generation here — this field should be in the user's own words. AI only assists *after* the story exists (Step 6, Step 9).

**Step 3 — Key Moments (`milestones`)**
- List editor, each row: date picker (compact), label `Input`, optional `note` (collapsible), optional photo attach (opens the existing Memories picker, sets `photoMemoryId`).
- Add via a single "+ Add a moment" ghost button, not a pre-rendered empty row — keeps the step visually calm when empty.
- Reorder by date automatically; no manual drag-sort needed since date is the natural order (reduces interaction surface).
- Empty state copy: *"Not every chapter has a clean list of dates. Skip this if it doesn't fit — you can always come back."*

**Step 4 — The People (`people`)**
- Chip-based add: `Input` for name + `Input` for role, "+ Add" appends a chip (avatar circle with initials, role beneath in `text-xs text-zinc-500`).
- No contact linking, no photo requirement — deliberately lightweight, per the mandate ("not a full contact system").
- Max visually before overflow: 8 chips inline, then "+N more" — prevents this step from feeling like a guest list.

**Step 5 — Feelings & Mood**
- `moodStart` and `moodEnd`: two small horizontal sliders, range −3..+3, labeled endpoints "Struggling" / "Thriving", rendered as a single combined component showing an arrow between the two positions (visually: "this is where I started → this is where I ended").
- `moodTags`: multi-select chip cloud of the 12 `PhaseMoodTag` values, toggle on tap, max 5 selectable (forces some editing rather than tagging everything).
- `feelingsNote`: short `Textarea`, prompt: *"How did this chapter actually feel, day to day?"*

**Step 6 — Lessons & Impact**
- `lessonsLearned`: `Textarea` with an AI-assist button **"Help me find the words"** — sends the Step 2 story + Step 5 feelings to `window.deskflowAPI.lifePhase.aiAssist({ kind: 'lessons', context })`, returns 2–3 candidate open-ended *questions* (not answers) like *"What would you tell your past self on day one?"* — user still writes the answer. AI assists framing, never ghostwrites the lesson itself.
- `impactNotes`: `Textarea`, prompt: *"How are you different now than before this chapter?"* — this field already existed in the type but was never exposed in the UI; now it's a first-class step.

**Step 7 — Color & Preview**
- Color source toggle: "Use category color" (default) vs "Custom" → reveals a compact swatch grid (curated palette that reads correctly on zinc-900/950, not a raw hex picker — protects the dark-mode contract).
- Live `PhaseCard` preview rendered at 60% scale to the right (or below, on narrow viewports) — updates in real time as color/title/category change. This is the single highest-leverage addition for making the form feel less like data entry: **you watch your monument take shape as you build it.**

**Step 8 — Connections**
- Mini horizontal timeline (a stripped-down version of the full `RiverMap`) showing all existing phases as small colored ticks.
- Click a tick to toggle a connection; connected ticks get a small connecting arc drawn between this (in-progress) phase's position and the target.
- Optional `note` per connection via an inline popover on the arc: *"How does this connect?"*
- Empty state (first-ever phase, nothing to connect to): step is skipped entirely from the stepper — don't show a step with nothing to do.

**Step 9 — Review & Reflect**
- Full-size `PhaseCard` preview (not scaled).
- **"Generate reflection"** button triggers the AI Reflection pipeline (§5). Streams into an editable `Textarea` below the preview — user can accept, edit, or discard. `reflectionSource` set to `'ai'` on accept, `'ai-edited'` if they touch it after, `'manual'` if they write their own instead and skip generation.
- Final "Save this chapter" commits via `window.deskflowAPI.lifePhase.save(draft)`.

### 3.4 Magnitude — making the slider expressive

Static 1–10 numbers say nothing. Map the value to a word band, shown large next to the slider, updating live:

| Range | Word |
|---|---|
| 1–2 | Quiet |
| 3–4 | Notable |
| 5–6 | Significant |
| 7–8 | Defining |
| 9–10 | Everything changed |

The word renders in `font-display`, and the slider track fill uses the phase's current color (category default or custom) so magnitude and identity are visually fused from the first interaction.

---

## 4. PhaseCard Spec

### 4.1 Header band

- Height increases from `h-36` to `h-64` (`h-48` on compact/grid views) — the old size couldn't carry a ghosted magnitude number *and* texture without feeling cramped.
- Base layer: solid category/custom color.
- Texture layer: slow-drifting radial gradient (CSS only, no canvas) driven by a framer-motion `animate` loop on `background-position`, 20–30s duration, `ease: 'linear'`, `repeat: Infinity` — reads as "alive," not "loading."
- If `headerImageMemoryId` is set: the memory photo renders behind the color at `mix-blend-mode: luminosity` and the color becomes a duotone overlay at ~70% opacity — keeps every card on-palette even with arbitrary photos.
- Magnitude: rendered top-right, `font-display text-8xl`, `text-white/10`, no background — a ghost, present but not competing with the title.
- Title sits bottom-left of the band, `warmth-serif text-3xl text-white`, with the date range in `font-mono text-sm text-white/70` directly beneath.

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

### 4.2 Body — order matters

1. **Memory pearls** (if any memories fall in the date range) — scattered gallery, *above* all text, per the mandate. 3–6 photos shown as rotated polaroid thumbnails (`rotate-[-4deg]`, `rotate-[3deg]`, alternating, varied `scale`), `+N` chip for overflow. Click → lightbox.
2. **Story** — `warmth-serif text-base leading-relaxed text-zinc-300`, clamped to ~5 lines with "Read more" expand (framer-motion `layout` height animation, not a hard cut).
3. **Key Moments** — vertical timeline: a `border-l border-zinc-700` with dots (`bg-[phase.color]`) per milestone, date in `font-mono text-xs`, label in `text-sm text-zinc-200`. Staggered reveal on scroll-into-view (`viewport={{ once: true }}`, `staggerChildren: 0.05`).
4. **People** — row of avatar chips: `h-8 w-8 rounded-full` initials on a `bg-zinc-800` circle, role as a tooltip on hover, name+role in a small popover on click (mobile-safe).
5. **Mood** — a thin horizontal gradient bar from the `moodStart` color-position to `moodEnd` (red-ish for struggling → warm gold for thriving, staying within the warmth palette, not literal traffic-light red/green), with `moodTags` as small pill badges beneath.
6. **Lessons** — pull-quote treatment: large `warmth-serif italic text-xl`, oversized decorative quotation glyph in `text-[phase.color]/20` behind it, left border accent in the phase color.
7. **Connections** — footer row of small chips ("→ First Job", "→ Moving to Jakarta"), click smooth-scrolls the timeline to that card and briefly highlights it (`ring-2 ring-[color] ` pulse, 800ms, then fade).
8. **Connection strip (data)** — collapsed by default, header reads "What I was doing then" with a chevron. Expands to §6.

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

## 5. Timeline View Spec

A horizontal, scrollable strip sitting above/alongside `RiverMap` (or replacing its flat mode — designer's call at build time; both can coexist since `RiverMap` is the poetic view and this is the utility view).

- Each phase renders as a block whose **width is proportional to its duration** (min-width floor so 1-month phases stay clickable) and whose color is `phase.color`.
- Blocks sit on a single `h-16` track, `gap-1`, `rounded-md`, with the title truncated inside if width allows, else shown on hover tooltip only.
- **Now marker**: a vertical line at today's position with a pulsing dot (`animate-ping` via a duplicated absolutely-positioned span, standard Tailwind pulse pattern — no custom keyframes needed).
- Click a block → smooth-scrolls the card list to that `PhaseCard` and expands it if collapsed.
- Zoom control: two-state toggle "All time" / "By year" — "By year" adds year gridlines and month ticks beneath the track for orientation.
- Horizontal scroll uses `scroll-snap-type: x proximity` on the container so blocks settle rather than leaving the view mid-block.
- Empty gaps (no phase logged) render as a thin dashed `border-zinc-800` segment, not a gap in the track — visually communicates "life continued here, just not logged yet" rather than looking broken.

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

## 6. AI Reflection Spec

### 6.1 What data it receives

The existing `lifePhase:aiReflect` handler is extended (not replaced) to accept the richer payload now available:

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
  // optional, only if the connection data strip has resolved by the time of generation
  periodContext?: PeriodContext; // see §7
}
```

Called from the renderer exclusively through the IPC bridge:

```ts
const reflection = await window.deskflowAPI.lifePhase.aiReflect(request);
```

### 6.2 Tone contract (system-level instruction to the model)

The reflection generator must be instructed, roughly:

> Write as a perceptive, warm friend who has read this person's own words about this chapter of their life — not a corporate summary bot, not a therapist, not a hype machine. Reference specific things they actually wrote (a milestone, a person, a lesson) rather than generic language. Keep it to one tight paragraph, 60–120 words. Never invent facts, numbers, or events not present in the input. If mood data suggests the chapter was hard, don't force positivity — acknowledge the difficulty honestly before naming what came out of it, if anything did.

This constraint — *never invent facts not present in the input* — is load-bearing. The reflection must be groundable entirely in what the user typed plus (optionally) real `periodContext` data; it should not fabricate specifics to sound more personal.

### 6.3 Output contract

```ts
interface AiReflectResponse {
  reflection: string;     // the paragraph
  confidence: 'grounded' | 'sparse'; // 'sparse' if story/milestones were too thin to reference specifics
}
```

If `confidence: 'sparse'`, the UI shows the reflection with a small inline note: *"You gave me a lot of dates but not much story — want to add a sentence or two so this feels more like you?"* rather than silently returning a generic paragraph.

### 6.4 Regeneration

"Try again" is available and simply re-calls with a `variation` seed/instruction ("give me a different angle on the same chapter") — cheap, since the payload is already assembled from the form draft.

---

## 7. Connection Points

New IPC handler, since none of the existing seven cover cross-feature aggregation:

```ts
// window.deskflowAPI.lifePhase.getPeriodContext(startDate: string, endDate: string): Promise<PeriodContext>

interface PeriodContext {
  goals: { completedCount: number; longTermGoalTitles: string[] };
  focusGroups: { name: string; totalMs: number }[];
  externalActivities: { label: string; totalMs: number }[];
  memories: { id: string; date: string; thumbnailUrl: string }[];
  appUsage?: { topApps: { name: string; totalMs: number }[] } | null;
}
```

Main-process implementation queries the existing `goals`, `focus_groups`/session tables, `external_activities`, `memories`, and `app_sessions` tables filtered by the phase's date range — no schema changes needed here, this handler is pure aggregation over data that already exists.

| Connection | Where it surfaces | Empty-state behavior |
|---|---|---|
| Gold (Goals) | "During this chapter" strip: completed count + up to 3 long-term goal titles as chips | "No goals tracked yet during this period" |
| Focus Groups | Small horizontal stacked bar, one segment per group, proportional to time | Strip section omitted entirely if zero data |
| External Activities | List of top 3 by time, icon + label + duration | Omitted if empty |
| Memories | Feeds directly into the Memory Pearls gallery (§4.2) and optionally `headerImageMemoryId` auto-suggestion | Pearls section omitted if empty |
| Tracking / App Usage | Top 3 apps by time, small bar chart | Omitted if empty; this is the most likely to be empty for anyone who logged an early-life phase before using DeskFlow, so it's designed to disappear cleanly |

The strip (`ConnectionDataStrip`, referenced in §4.2) lazy-loads on expand — it should never block the initial card render, since it's supplementary color, not the point of the card.

---

## 8. Build Order

Recommended implementation sequence, given the Ground Truth Protocol constraints (hash match, test pass, dependency map before accepting changes) — smallest safe increments first:

1. Migration (§2) + repo (de)serialization for new columns — isolated, testable independent of UI.
2. Type extensions (§1) — compile-time only, no runtime change yet.
3. `PhaseCard` visual overhaul (§4) using existing data only (works immediately on old phases, new fields render conditionally and simply don't show).
4. Timeline view (§5) — independent component, additive.
5. `PhaseFormDialog` stepper (§3) — largest single change; build steps 1–2 (Basics, Story) first since those match the old form's scope, then layer in 3–8 incrementally.
6. `lifePhase:getPeriodContext` handler + `ConnectionDataStrip` (§7) — last, since it's the only piece touching multiple other feature's data and benefits from everything else already being stable.
7. AI reflection payload extension (§6) — wire in once Story/Milestones/People/Feelings/Lessons steps exist to actually populate the richer payload.

This order means the app is shippable and correct after every single step — nothing in steps 1–4 requires steps 5–7 to exist, and old phases (with all-null new fields) render correctly at every stage.
