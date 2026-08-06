# CONTEXT_BUNDLE.md — Life Phases Timeline (Gold Page "Super System")

> FULLY SELF-CONTAINED. The receiving AI has NO repository access — everything needed
> is embedded here. Pair with PROMPT.md (the task) — this file is the reference.

## 1. Raw Request (Verbatim)

> "So basically a timeline of my life that is well designed, well scaled, chronological, and it shows each phase having a start month/year, a duration, and each phase has a certain size, relevance, meaning, and magnitude. nothing is permanent everything is a phase and everything is interconnected and impacts the future. it needs a very good ui where everything looks good, beautiful. you should use every single frontend skill and every mcp for the components. it should be a super system, not just boring text. integrate ai: reflection, ai integration, trend of the time period. summarization. maybe in the future integrate app history, feature evolution of the app, and how the usage time has changed over the years. So can you do that please"

## 2. The Ask in One Line

Add a **Life Phases Timeline** to the Gold page: a chronologically scaled, beautiful
visualization of the user's life chapters where duration × magnitude drive the
geometry, phases read as finite + interconnected + future-facing, and AI does
reflection / era-trends / summarization. Design is the product.

## 3. MANDATORY — MCP SERVERS YOU MUST USE

The user explicitly demanded: "use every single frontend skill and every mcp for the
components." Treat this as binding:

| MCP Server | What you pull from it | How |
|---|---|---|
| `shadcn` | card, dialog, tooltip, select, input, button, badge, skeleton, tabs, accordion, alert, separator | browse/search registry, copy real source, re-skin |
| `magicui` | animated-beam, border-beam (small only — see warning), number-ticker, particles, aurora, marquee, shimmer-button | search + getRegistryItem source |
| `reactbits` | Aurora, Beams, Particles, Orb, Magnet, SpotlightCard, ScrollReveal, FadeContent, AnimatedContent, CountUp, GradientText, ShinyText, TiltedCard, GlassSurface, MagicBento, PixelCard, Stepper, CircularGallery, DotGrid, RippleGrid | list components → get source |
| `lucide` | EVERY icon (never guess icon names — search first) | search_icons with semantic tags |
| `google-design` | **Color scheme generation** — call `generate_color_scheme` seeded with the warmth palette (below); optionally `search_fonts`/`describe_font` if proposing a headline font (default: keep Space Grotesk) | generate_color_scheme + describe_font |

Rules:
- **No component is hand-rolled if an MCP source exists.** Custom code is reserved for
  the ONE thing that doesn't exist anywhere: the proportional scaled-timeline core.
- **Browse first, design second.** Pull real sources, then design with them.
- Deliver a sourcing table: every UI element → server → component name.

## 4. The App, in One Paragraph (technical facts)

RHEO/DeskFlow: Electron + React + TypeScript + Vite + better-sqlite3. Backend is one
big `src/main.ts` using `ipcMain.handle('channel')` + better-sqlite3; `src/preload.ts`
exposes `window.deskflowAPI.<name>`; renderer calls
`await window.deskflowAPI.xxx(...)`. Dark mode only. The Gold page lives at
`src/features/warmth/gold/GoldPage.tsx` and is a tab (`?tab=gold`) inside
`src/features/warmth/LifePage.tsx` — NOT a standalone route.

## 5. Where the Timeline Fits (Gold page structure)

GoldPage.tsx today holds these local components (all in one file) — the timeline must
join as a sibling section with the SAME rhythm:
- `GoldHeader` — date, daily ring progress, tracked minutes, best streak
- `DayRing` — circular daily-goal ring
- `WeekBoard` — 7-day goal grid
- `DeadlineRadar` — deadline markers
- `TheVault` — long-term goals CRUD (add/edit/delete, ProgressRing, two-step delete
  confirm with 3s arm, deadline countdown)
- `BellBoard` — reminders CRUD
- `DayJournal` — daily reflection, placeholder caption in warmth-serif italic:
  "— was it purposeful?"

Suggested file: `src/features/warmth/gold/LifeTimeline.tsx` (+ sub-components),
imported into GoldPage.tsx as a new section.

## 6. Design Signature — the "warmth" language (REUSE, then add YOUR signature)

### Fonts (exact tokens — do not add a 4th family)
```css
--font-display: "Space Grotesk", Inter, sans-serif;  /* headings, big numbers */
--font-sans:    "Inter", system-ui, sans-serif;       /* body */
--font-serif:   "Source Serif 4", Georgia, serif;     /* warmth-serif italic captions */
--font-mono:    "JetBrains Mono", monospace;          /* dates/numbers if wanted */
```
- Emotive captions: `warmth-serif italic` — small poetic lines (Gold page uses
  "— was it purposeful?", "— Monday to Sunday").

### Colors — the warmth palette (the ONLY accents; your scheme is built FROM these)
```css
--color-clay-400: #e8866b;  --color-clay-500: #d96846;  --color-clay-600: #c2553a;
--color-sage-400: #6fb38f;
--color-amber-400: #fbbf24;                              /* PRIMARY gold accent */
--color-sky-400: #5ab0c9;
--color-glow: #f7f3ee;                                   /* warm off-white text glow */
```
Neutrals: `--ws-surface: #09090b`, `--ws-surface-raised: #18181b`,
`--ws-border: rgb(39 39 42 / 0.6)`. NEVER pure black; NEVER purple/blue generic
gradients.

**Your job on color**: propose the exact scheme seeded from this palette —
phase-category → warmth tone mapping, magnitude intensity ramp (bigger phase = warmer
or brighter), current-phase color, interconnection color, AI accent. Generate it via
the google-design MCP `generate_color_scheme`.

### Surface recipe (glass)
```
bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-5
```
Max radius `rounded-xl`. Elevation via border brightness + glass, NOT box-shadow.
Subtle aurora/ambient backgrounds allowed at low opacity.

### Motion
Transform + opacity only. 150–300ms UI feedback; 300–500ms panels. Respect
`prefers-reduced-motion`. No scroll-jacking/parallax.

## 7. Design Freedom — you choose the concept (REQUIRED)

You are REQUIRED to commit to ONE unique concept that makes the data physical.
Candidates (invent better if you can — but COMMIT):
- **River of Years** — continuous river; width = magnitude, length = duration;
  tributaries = influences; current phase ends in open sea.
- **Mountain Range** — height = magnitude, width = duration; a trail connects peaks.
- **Orrery / Solar System** — orbit radius = time, planet size = magnitude.
- **Folded Map / Accordion** — each fold = phase; creases = transitions.
- **Story Spine** — weighted chapters leaning on each other; unwritten future.

The concept MUST make visible: duration, magnitude, finiteness (seams), causality
(interconnection), and the open future (current phase faces forward). Also name your
**signature element** — the detail that makes it unmistakable (e.g. "the amber seam",
"the magnitude halo", "the breath between chapters"). Deliver a layout diagram.

## 8. Data Layer Conventions (for your IPC + DDL design)

- Guards everywhere: `CREATE TABLE IF NOT EXISTS`; column adds via guarded ALTER
  (check PRAGMA table_info or try/catch) — old DBs migrate in place.
- AI calls run in MAIN via IPC handlers; never expose an LLM key to the renderer.
- Channels: `lifePhase:get` / `lifePhase:save` / `lifePhase:delete` /
  `lifePhase:saveAll` / `lifePhase:aiReflect` / `lifePhase:aiEraTrends` /
  `lifePhase:aiSummarize` (adjust freely, keep the pattern).
- Phase model: title, description, category, startMonth/startYear, endMonth/endYear
  (null = ongoing), duration (derived in months, never stored), magnitude (0-100 or
  weighted category), color, reflection (AI-assisted), eraTrends, impactNotes,
  milestones[], connectedTo[].
- Future layer (design-aware, NOT built): app history (when DeskFlow features
  shipped) + usage time per year, plotted on the same time axis. Keep phase
  boundaries as DATES (not pixel positions) and magnitude decoupled from duration so
  the second layer drops in without a rebuild.

## 9. MCP Component Inventory (full list you can pull)

**ReactBits (framer-motion, Tailwind):** Aurora, Beams, Particles, Orb, Magnet,
MagnetLines, SpotlightCard, ScrollReveal, FadeContent, AnimatedContent, CountUp,
BlurText, GradientText, ShinyText, DotGrid, RippleGrid, MetaBalls, Noise, SplitText,
PixelTransition, InfiniteScroll, Stepper, MagicBento, CardSwap, BounceCards,
CircularGallery, RollingGallery, TiltedCard, GlassSurface, Stack, ChromaGrid,
PixelCard, Carousel, Dock, ElasticSlider.

**Magic UI:** animated-beam, border-beam, number-ticker, particles, shimmer-button,
magic-card, marquee (NOT on interactive content), aurora, background-beams,
dot-pattern, animated-gradient-text.

**shadcn (installed):** accordion, alert, badge, button, card, collapsible, dialog,
input, select, separator, skeleton, switch, tabs, toggle, tooltip.

**Lucide:** 1500+ icons — Timeline, Route, Waves, Mountain, Sunrise, Sunset, Compass,
Scroll, Sparkles, ArrowRight, ArrowDown, CircleDashed, Map, MapPin, Hourglass,
TrendingUp, History, BookOpen, Brain, Wand2, Quote, Layers, GitBranch, Zap, Flame,
Star, Feather, PenLine, RefreshCw, ZoomIn, ZoomOut, Maximize2.

**WARNING:** `border-beam` renders as a translucent COLORED WASH over card interiors
in this Electron build (mask-composite: exclude unsupported) — small containers only,
never large overlays. `marquee` breaks click targets — display-only elements only.
Magic UI / ReactBits have NO timeline primitive — the proportional scaled-timeline
core is the ONE custom-built thing.

## 10. Anti-Slop Checklist (must pass in your result)

- [ ] NOT generic purple gradients — warmth palette only
- [ ] NOT box-shadow elevation — glass + border
- [ ] NOT missing empty/loading/error states (every data + AI surface)
- [ ] NOT tiny uppercase kickers above every heading
- [ ] NOT decoration at cost of usability — timeline is scannable
- [ ] Max 3 font families (Space Grotesk / Inter / Source Serif 4 italic)
- [ ] Body ≥ 14px, line-height ≥ 1.4, contrast ≥ 4.5:1
- [ ] Touch targets ≥ 44px
- [ ] prefers-reduced-motion respected
- [ ] Proportional scale is REAL duration × magnitude — never rank tiers

## 11. Verification Notes (for the implementing agent)

- Build: `npx vite build` → `node scripts/rebuild-main.mjs` → rebuild preload
  (`npx esbuild src/preload.ts --bundle --platform=node --format=cjs
  --external:electron --outfile=dist-electron/preload.cjs`).
- vite build does NOT typecheck (esbuild strips types) — grep-verify destructured
  hook returns and API names against source.
- DB lives at `%APPDATA%/DeskFlow/deskflow-data.db` — guard every ALTER.
- Runtime verification: app must be relaunched with `--remote-debugging-port`
  (Probe MCP attach); otherwise mark NOT LAUNCHED.
