# PROMPT.md — Life Page: Visible Living Art + A Self Tab Designed with Care

> Send this PROMPT.md + the sibling CONTEXT_BUNDLE.md to the target AI. The bundle
> contains every file, shader, token, and constraint needed — the AI has NO repo access.

---

## Raw Request (user's words, verbatim)

> "WHERE'S THE ART WHERE'S THE BEAUTY"
>
> "HOW IS IT NOT INCLUDED IN THE RIVER SYSTEM"
>
> "WHERES THE reaction-diffusion-playground DESIGN ASPECT ON THE PAGE"
>
> "FIX THE FUCKING DESIGN ON THE SELF PAGE FIRST"
>
> "cards fonts and everything not displayed and not made with care and love"
>
> "not necessarily saying that you have to rely on that SPECIFIC repository for the
> reaction diffusion tho"
>
> "use the mcp and search those up, look up from variant.com and stuff, use ur tools
> research properly"

## Problem Statement

Two failures on the Life page:

1. **The art is invisible.** A Gray-Scott reaction-diffusion "living substrate"
   (WebGL, R3F, ping-pong render targets, coral preset f=0.0545/k=0.062) was built
   and shipped — but its display ramp was so faint (max alpha 0.40, dark amber) and
   so confined (a 288–460px square inside a card, behind the ring chart) that the
   user cannot see it at all. The user wants the living, growing, organic coral to
   be a REAL part of the page — specifically **included in the river system** as a
   full-bleed living background (the design aspect of a full-screen
   reaction-diffusion playground), not a decorative square. The reference repo is
   inspiration only — the existing implementation is ours and must be evolved, not
   replaced.

2. **The Self tab is a mess.** The merged "Self" tab (Identity & Profile +
   Knowledge Graph + Memory & Brain — user-mandated merge, never re-split) is three
   independently-built views stacked with plain uppercase text headers, three
   clashing accent colors (amber-ish, cyan, purple), mixed radii/padding, and no
   page-level identity. It looks assembled, not designed.

Your job: design the complete solution — engineering + visual + interaction — as a
single comprehensive spec in RESULT.md. Not options, not menus: ONE well-reasoned
design.

## The Mandate

Act as **Lead Designer and Engineer** for the DeskFlow Life page. Read
`CONTEXT_BUNDLE.md` first — it is the source of truth for code, shaders, tokens,
z-order, and constraints. Then deliver RESULT.md covering BOTH features below, with
data-processing logic, pixel-level visual specifications, and interaction design.

---

## Engineering Task A — Living Substrate in the River System

Design how the existing substrate becomes the **full-bleed living background of the
river view** (and decide whether it also appears behind the pages-mode Self tab).

Specify:

1. **Placement & z-order.** Exact position in the river container (see bundle §6.5
   z-map: vital thread z-0, left column z-[5], feed z-10). It should glow through
   and around the glass cards without harming readability. Decide the legibility
   layer: radial vignette, edge darkening, per-card opacity bumps — give concrete
   CSS/classes.
2. **Single-instance rule.** CoreSample currently hosts its own substrate square
   (bundle §6.4). The design must end with ONE canvas. Decide: remove CoreSample's
   instance (keep rings + radial glow) and let the rings float over the living
   background? Or a deliberate small "window" of the same sim inside the stage?
   Justify with the fit rubric (on-concept / complements / usability-safe /
   data-alive / feasible).
3. **Shader evolution.** The sim + display shaders are embedded (bundle §6.2/6.3).
   Options to specify precisely: per-location growth speed via a spatial modifier
   uniform (e.g. slow-growth "bedrock" vs active "current" zones aligned with the
   vital thread), a slow global flow/drift, and/or a gentler color ramp tuned for
   FULL-BLEED (alpha peaks ~0.6–0.75 so cards stay readable; keep premultiplied
   alpha + AdditiveBlending + toneMapped:false — GLSL1 style, NEVER GLSL3).
   Presets f/k/dA/dB may be tuned per-feature with justification.
4. **Performance.** 2 sim passes/frame at 256² (384² on DPR>1.5) is the budget.
   Keep `document.hidden` pause, `prefers-reduced-motion` unmount, error-boundary
   CSS-glow fallback (never a black screen). State any cap/guard you add.
5. **Pages mode.** Should the Self tab ALSO get the living background (the user
   asked for the art ON the page — likely yes, behind the Self content, calmer
   ramp) — decide and specify, or justify exclusion.

## Engineering Task B — Self Tab Architecture

Design the wrapper/layout architecture in LifePage.tsx that turns the raw stacked
sections (bundle §7.1) into a designed page:

1. **Page identity.** A Self-tab hero/header system: name/framing, unified stat
   strip (episodes / entities / current facts — data already available via
   `brainStats`), consistent `SectionHeader` usage (bundle §3) with violet
   `#8b5cf6` accent.
2. **Card system.** ONE card language for all three sections (glass,
   `rounded-xl`, p-5, top highlight) — reconcile MagicCard vs `rgba(24,24,27,0.4)`
   chips vs the graph canvas (round it + border it so it reads as a contained
   graph card). Harmonies to specify: accent reconciliation (ProfileTab amber-ish,
   Graph cyan `#06b6d4`, Brain purple `#a855f7` → single violet family with
   per-section functional tints), heading patterns, empty/loading/error states
   (unify Skeleton/BlurFade usage).
3. **Scope guard.** Do NOT rewrite the three views' logic. Specify the minimal
   edits inside ProfileTab / ContextGraphView / BrainManagementView (constants,
   wrapper classes, header swaps) vs what stays in LifePage.tsx.
4. **Hierarchy.** Which section leads (identity first?), how the graph nests,
   progressive disclosure for the heavy brain-management lists.

## UX Task

For every interactive element specify hover/focus/active states, transition
durations (150–300ms, transform/opacity only), and reduced-motion behavior. Cover
all 4 states (empty/loading/error/populated) for: stats strip, graph, lists,
extraction jobs. Keep test attributes `data-lifephase`, `data-core-sample-stage`,
`data-lens-switcher`, and the `data-self-*` equivalents you introduce.

## Design Skills You Must Apply (loaded by the implementer — follow the principles)

1. **frontend-design** — DeskFlow component patterns, tokens, glass cards; glass as
   structure; 150–300ms micro-interactions on transform/opacity only; no
   box-shadow elevation in dark themes; never pure black; max 2 font families.
2. **humancentred-UIUX** — all 4 states (empty/loading/error/populated), hierarchy,
   progressive disclosure, feedback.
3. **impeccable** — typography, color, spatial, motion, interaction, responsive,
   UX writing; its 27 anti-patterns.
4. **motion-alive** — Liveliness Levels; pick L1–L3 and justify.
5. **ui-ux-pro-max** — dev-tool/AI-style rules where relevant.
6. **signature-design** — ONE concept-true centerpiece per screen ("more than one
   hero = no hero"). For the river: the living coral IS the hero, everything else
   stays quiet. For the Self tab: one focal point (the identity/stat strip?), calm
   at rest, big motion only on meaningful events. Include the fit-rubric scores for
   your hero choices.
7. **frontend-external-infra** — pull from MCP inventory below, re-skin to tokens,
   anti-slop checklist.

## MCP Component Inventory (available to the implementer — use REAL names)

| Component | Source | Use for |
|-----------|--------|---------|
| card, tabs, separator, skeleton, switch, badge, button, input, select, tooltip, accordion, collapsible | shadcn (installed) | standard blocks |
| `bento-grid`, `bento-demo`, `bento-demo-vertical` | Magic UI | Self-tab section layouts |
| `animated-grid-pattern`, `interactive-grid-pattern`, `grid-pattern`, `flickering-grid` | Magic UI | background texture (sparingly, under glass) |
| particles, dot-pattern, blur-fade, number-ticker, glare-hover, magic-card, animated-gradient-text, confetti | Magic UI (vendored) | micro-motion layer |
| User, Brain, Network, Database, Sparkles, Fingerprint, MemoryStick, Waypoints, BookOpen, Quote, Tag, Hash, Link2, Activity, TrendingUp, Target, MessageSquare, ShieldCheck, RefreshCw, Download, Copy, Check, FileJson, ChevronDown, ChevronRight, Clock, CheckCircle2, Plus, Trash2, Server, Zap, Search, Filter | lucide-react | icons (never emoji) |
| 135+ animated components | reactbits | optional extras |

## Anti-Slop Checklist (RESULT.md must pass all)

- [ ] Type: Geist body + JetBrains Mono only — no third font
- [ ] Color: DeskFlow tokens; no purple-gradient-everything; violet is the Self-tab
      family with per-section functional tints, not three clashing accents
- [ ] Geometry: `rounded-xl` max, `p-5` — including the graph canvas container
- [ ] No uppercase-eyebrow-pill hero cliché; no repeated tracked-uppercase kicker
      above every heading
- [ ] Motion: real micro-interactions, 150–300ms, transform/opacity only,
      respects `prefers-reduced-motion`
- [ ] Imagery: no filler glow/blobs; the coral IS the imagery
- [ ] Empty/loading/error states styled consistently across all three sections
- [ ] Icons all from lucide-react; focus-visible rings use `--page-accent`
- [ ] BorderBeam avoided on content cards (renders as a wash in this build)

## Constraints (HARD)

1. No new npm dependencies without checking package.json first (three ^0.183.2,
   R3F ^9.5.0, drei ^10.7.7 already present).
2. Shaders stay GLSL1 (`texture2D`/`varying`/`gl_FragColor`) — NEVER GLSL3.
3. Display shader keeps premultiplied alpha + `AdditiveBlending` +
   `toneMapped:false`.
4. `prefers-reduced-motion` unmounts the canvas; `document.hidden` pauses the sim;
   WebGL failure falls back to CSS glow — never a black screen.
5. Renderer-side fixes only; no new IPC; no DB changes. Everything is UI-only
   (backend audit: ✅ all four features covered, no gaps).
6. Files are CRLF; don't reformat untouched code; preserve
   `data-lifephase`/`data-core-sample-stage`/`data-lens-switcher` attributes.
7. Never re-split the Self tab; never delete covenant/memories/gold/notes tabs.
8. The running app is stale until relaunch — state in your plan that verification
   requires a full RHEO.exe close + relaunch.

## Output Format (RESULT.md)

Structure RESULT.md exactly like this:

1. **Concept Essence** — the metaphor + chosen hero for each of the two surfaces,
   with the signature-design fit rubric scores.
2. **Feature A — Living River** — engineering spec (placement, z-order, shader
   changes with actual GLSL diffs, perf guards) + visual spec (ramp values, vignette
   CSS, glass opacity changes) + integration steps with exact files/lines.
3. **Feature B — Self Tab** — layout architecture (component tree), the card
   system, accent reconciliation table (each view: which constant changes to what),
   header system, hero + stat strip spec, all 4 states per component.
4. **Implementation Plan** — ordered steps, each with files touched (paths from the
   bundle), what changes, and how to verify (build + tsc + relaunch).
5. **Risks & Ripple Effects** — e.g. substrate z-index vs vital thread, graph
   canvas performance inside a card, staggered AnimatePresence behavior.

Write the complete, decisive spec. No "Option A/B/C". If something genuinely can't
be done as specified, say so and give the single best alternative.