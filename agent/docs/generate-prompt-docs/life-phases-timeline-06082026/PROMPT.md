# PROMPT.md — Life Phases Timeline (Gold Page "Super System")

## Raw Request (Verbatim)

> "So basically a timeline of my life that is well designed, well scaled, chronological, and it shows each phase having a start month/year, a duration, and each phase has a certain size, relevance, meaning, and magnitude. nothing is permanent everything is a phase and everything is interconnected and impacts the future. it needs a very good ui where everything looks good, beautiful. you should use every single frontend skill and every mcp for the components. it should be a super system, not just boring text. integrate ai: reflection, ai integration, trend of the time period. summarization. maybe in the future integrate app history, feature evolution of the app, and how the usage time has changed over the years. So can you do that please"

## Target AI

You are the **design + implementation architect**. You decide EVERYTHING about how this
looks: the concept, the visual metaphor, the layout, the color scheme, the signature
design. You are NOT a code-filler — you are the designer. The technical constraints in
Section 5 exist to keep the result native to the app; the design freedom in Sections 2-4
is absolute.

## 0. MANDATORY — YOU MUST USE THE MCP COMPONENT SERVERS

This is a hard requirement, not a suggestion. The user explicitly demanded: "use every
single frontend skill and every mcp for the components."

- **Every component you put on screen must come from an MCP source where one exists.**
  Do NOT hand-roll a button, card, dialog, tooltip, animation, or icon that an MCP
  server already provides.
- **Call the servers as you design**, not after: browse them FIRST, pick the real
  components you will use, and only then write the design.
- **You have these servers available:**
  - `shadcn` (shadcn/ui) — base chrome: card, dialog, tooltip, select, input, button,
    badge, skeleton, tabs, accordion, alert. Browse + copy real source.
  - `magicui` (Magic UI) — animated effects: animated-beam, border-beam, number-ticker,
    particles, aurora, marquee, shimmer-button.
  - `reactbits` (ReactBits) — framer-motion components: Aurora, Beams, Particles, Orb,
    Magnet, SpotlightCard, ScrollReveal, FadeContent, AnimatedContent, CountUp,
    GradientText, ShinyText, TiltedCard, GlassSurface, MagicBento, PixelCard, Stepper,
    CircularGallery, DotGrid, RippleGrid.
  - `lucide` (Lucide icons) — every icon, never guess names.
  - `google-design` (Google Design MCP) — **generate your color scheme with it**:
    call `generate_color_scheme` seeded with the warmth palette, and use
    `search_fonts` / `describe_font` only if you propose a headline font (default:
    keep the app's Space Grotesk).
  - `reactbits`/`magicui` have NO timeline primitive — the core scaled-timeline is the
    ONE thing you design custom. Everything else is sourced.
- **Document your sourcing**: in your result, list each UI element → MCP server →
  component name, so the implementing agent can fetch the exact source.

## 1. Problem Statement

The Gold page manages daily rituals (day rings, week board, deadlines, the Vault of
long-term goals, reminders, journal). It has NO life-scale narrative layer. You are
adding a **Life Phases Timeline**: a chronological, proportionally scaled visualization
of the chapters of the user's life.

Core requirements (non-negotiable):
1. **Scale is honest** — each phase's visual size encodes duration × magnitude
   (a 6-year chapter outweighs a 6-month one). Proportional geometry, NOT rank tiers.
2. **Nothing is permanent, everything is a phase** — temporariness is visible.
3. **Everything is interconnected and impacts the future** — phase → phase causality
   is visible.
4. **Design-first super system** — intricate, meaningful, beautiful. Not boring text.
5. **AI is integral** — reflection per phase, era/trend context of the time period,
   timeline summarization.
6. **Future layer** (design-aware, not built): app history (DeskFlow feature evolution)
   and usage-time changes plotted on the same axis.

## 2. THE CONCEPT — PICK ONE, OWN IT (deliverable #1)

You MUST propose and commit to ONE unique visual concept for the timeline. This is the
soul of the design. Do not hedge, do not ship "cards on a line". Choose a metaphor that
makes the requirements physical:

**Candidate concepts (choose one, or invent a better one — but COMMIT):**
- **The River of Years** — one continuous river flowing left→right (or top→bottom);
  each phase is a distinct stretch of water whose WIDTH = magnitude and LENGTH =
  duration; rapids/bends at phase transitions; tributaries = influences flowing INTO
  a phase; the current phase ends in open sea (unknown future).
- **The Mountain Range** — each phase is a peak/range; height = magnitude, width =
  duration; valleys between phases; a trail (path of life) connects peaks; the current
  peak is being climbed.
- **The Orrery / Solar System** — phases orbit a center (the self); orbit radius =
  time, planet size = magnitude, ring = duration; current phase is a bright sun-side
  planet.
- **The Folded Map / Accordion** — a long chronological map that folds; each fold is a
  phase; creases = transitions; the map is partially unfolded toward the future.
- **The Story Spine** — a spine of interconnected chapters, each with a "weight"
  (magnitude) and length (duration); chapters lean on each other; the future is
  unwritten space.

**Your concept must make visible, PHYSICALLY:**
- duration (length/area encoding) and magnitude (size/intensity encoding)
- that the phase is finite (edge, fade, seam)
- the interconnection (flow, thread, shadow, gravity from one phase to the next)
- the open, unwritten future (the current phase doesn't just stop — it faces forward)

Deliver: concept name, 3-5 sentence rationale (why THIS metaphor makes the data
physical), and a rough layout diagram (ASCII or description of the composition).

## 3. THE ACTUAL UI — ENUMERATE AND DESIGN EVERY SCREEN (deliverable #2)

Think concretely about the UI the user will interact with. Design and describe EACH of
these (this is "the actual UI to include", not a vague list):

1. **The Timeline itself** (the hero) — the concept visualization, full width of the
   Gold page. Zoom/scale controls (decades ↔ months), scroll behavior, how the current
   phase faces the future.
2. **Phase node/card** (inline, on the timeline) — what's visible at rest: title,
   years (start month/year → end), magnitude indicator. Hover state.
3. **Phase detail view** (click → open) — the expanded chapter: description, duration
   breakdown, milestones, color-coded category, AI reflection, era trends, impact
   notes, edit/delete. Choose the mechanism (modal / expandable panel / side drawer /
   master-detail) and justify it.
4. **AI Reflection panel** — guided reflection flow (AI asks → user answers → AI
   expands into narrative). Loading / error / regenerate states.
5. **Era Trends sidecard** — "what was happening in those years": world/culture/field
   context, AI-generated, per phase.
6. **Timeline Summary header** — AI "life story" one-paragraph overview + stats
   (total phases, years covered, current phase). Regenerate button.
7. **Add/Edit phase flow** — the form: title, category, start month/year, end
   month/year (or "ongoing"), magnitude slider, description. Where it lives
   (inline editor / dialog).
8. **Empty state** — no phases yet: beautiful first-run that invites the first phase.
9. **Loading states** — skeleton/placeholder for every async surface.
10. **Error states** — AI failure, save failure: what the user sees.

For each: what it looks like, what's on it, how it opens/transitions, and which MCP
components build it.

## 4. THE COLOR SCHEME & SIGNATURE (deliverable #3)

- **Color scheme**: propose the EXACT scheme. Seed: the warmth palette
  (amber/gold #fbbf24 primary, clay #e8866b, sage #6fb38f, sky #5ab0c9 on dark zinc).
  Run `generate_color_scheme` from the google-design MCP with these seeds and adapt.
  Define: background, phase-category mapping (which warmth tone = which category),
  magnitude intensity ramp (how a "big" phase reads warmer/brighter), current-phase
  color, interconnection color, AI/reflection accent. Give hex values.
- **Signature design**: what makes this UNMISTAKABLE — the detail a user would
  screenshot and share. It must reuse the app's warmth language (Space Grotesk
  display, Source Serif 4 italic warmth captions, glass cards) but be a NEW signature,
  not a clone of existing Gold sections. Name your signature element(s) explicitly
  (e.g. "the amber seam" — a glowing hairline where one phase ends and the next
  begins; "the magnitude halo" — a soft radial glow sized by magnitude; "the breath" —
  a spacing pulse at every transition).
- **Typography**: Space Grotesk (display) + Inter (body) + Source Serif 4 (warmth
  italic captions). JetBrains Mono for dates/numbers if it adds character. NO fourth
  family. Show the type scale you will use.

## 5. Technical Constraints (must not break the app)

- Lives on the Gold page: new component family in `src/features/warmth/gold/`,
  wired into `GoldPage.tsx` as a section, sibling of TheVault/DayJournal.
- Data model: phase = title, description, category, startMonth/startYear,
  endMonth/endYear (null = ongoing), duration (derived), magnitude (0-100 or
  categorical weight), color, reflection, eraTrends, impactNotes, milestones.
  Table + DDL + IPC (`lifePhase:get/save/delete/saveAll`,
  `lifePhase:aiReflect`, `lifePhase:aiEraTrends`, `lifePhase:aiSummarize`) +
  renderer types. Follow existing patterns: guarded ALTER, better-sqlite3,
  ipcMain.handle / ipcRenderer.invoke.
- AI runs in main process via IPC; renderer shows loading/error/regenerate states.
- Dark mode only, glass recipe `bg-zinc-900/50 backdrop-blur-xl border-zinc-800/50
  rounded-xl p-5`, motion = transform/opacity only, prefers-reduced-motion respected.
- Must NOT use border-beam as a large overlay (renders as a colored wash in this
  Electron build — small containers only).
- Future-proof: phase boundaries as dates (not pixels); magnitude decoupled from
  duration; timeline supports a second data layer on the same axis later.

## 6. Requirements Checklist (deliverable #4 — your result must tick these)

- [ ] Concept chosen and justified (one metaphor, no hedging)
- [ ] All 10 UI surfaces enumerated and designed (Section 3)
- [ ] Color scheme with hex values + category mapping + magnitude ramp
- [ ] Signature element(s) named explicitly
- [ ] MCP sourcing table (element → server → component)
- [ ] Phase data model: types + DDL + IPC + AI endpoints
- [ ] Proportional duration × magnitude geometry (never rank tiers)
- [ ] Current-phase distinction + open future
- [ ] Interconnection visuals (phase → phase)
- [ ] AI: reflection, era trends, summarization — with loading/error/regenerate
- [ ] Empty, loading, error states for every surface
- [ ] Gold page entry point matching sibling components
- [ ] Anti-slop checklist (below) passes

## 7. Anti-Slop Checklist

- [ ] NOT generic purple gradients — warmth palette only
- [ ] NOT box-shadow elevation — glass + border brightness
- [ ] NOT missing empty/loading/error states
- [ ] NOT tiny uppercase kickers above every heading
- [ ] NOT decoration at cost of usability — the timeline is scannable
- [ ] Max 3 font families (Space Grotesk / Inter / Source Serif 4 italic)
- [ ] Body ≥ 14px, line-height ≥ 1.4, contrast ≥ 4.5:1
- [ ] Touch targets ≥ 44px
- [ ] prefers-reduced-motion respected
- [ ] MCP components used where they exist; custom only for the core primitive
