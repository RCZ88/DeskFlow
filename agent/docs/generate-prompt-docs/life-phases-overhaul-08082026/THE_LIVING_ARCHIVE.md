# The Living Archive
### A unified design for `/life` — Covenant, Gold, Memories, and Phases as one growing thing

**What this document is:** the artistic and conceptual design for the *combined* mode of `/life` — not four tabs that happen to share a URL, but one continuous object that Covenant, Gold, Memories, and Phases are all different ways of looking at. It sits alongside `LIFE_PHASES_SPEC.md` (which covers the PhaseFormDialog input wizard and individual PhaseCard mechanics) — that spec is still fully valid. This document is about what holds all four features together and why it should feel like one thing instead of four screens.

---

## 0. The Idea, in One Paragraph

Your life doesn't actually have separate systems for promises, goals, memories, and chapters. It has one continuous growth, and Covenant, Gold, Memories, and Phases are just four ways of reading the same growth. A tree doesn't have a "commitment page" and a "goals page" and a "memories page" — it has a trunk, and if you cut into it and look closely, you can read the grain (how disciplined the daily growing was), the branches (what it kept reaching for), and the amber it trapped along the way (what it chose to keep). One object. Four lenses. That's the whole design.

---

## 1. The Central Metaphor — Ring & Grain

Real dendrochronology already separates two different signals in a single tree ring, and both map onto something you're already tracking:

| Real tree ring | Maps to |
|---|---|
| **Ring width** — how much the tree grew that year | **Phase magnitude** — how significant that chapter was |
| **Ring density / grain** — tight, even grain in good years; coarse, gapped grain in hard ones | **Covenant** — how consistently you kept your daily promises during that stretch |
| **Ring color / species markers** | **Category** — Growth, Career, Love, Challenge, Joy, Rest, Adventure, Creation |
| **Buds and branches growing outward from that year's growth** | **Gold** — long-term goals as branches, daily goals as small leaf-marks along the ring |
| **Resin pockets and knots preserved inside the wood** | **Memories** — photos trapped at the exact date they happened |
| **The still-soft cambium layer at the very outer edge, not yet hardened into wood** | **Today** — the living edge where Covenant and Gold's daily activity actually happens, before it's "written" into the permanent record |

This isn't a decorative skin over four unrelated features. It's a real structural mapping — every one of the four existing systems already produces exactly the kind of data a tree ring would encode. Nothing needs to be invented; it needs to be read correctly.

---

## 2. The Hero — The Core Sample

At the top of `/life`, in place of (or above) the current flat `RiverMap`, sits a **circular cross-section** — the core sample of a life. Each ring is one phase, nested outward chronologically (oldest at the center, most recent at the outer edge — the way an actual tree grows).

- **Ring width** = magnitude. A "quiet" year is a hairline. A year where "everything changed" is a wide band you can't miss.
- **Ring color** = category, same warmth palette already defined.
- **Ring texture** = Covenant density for that period — tight, fine hatching for a disciplined stretch; sparse, uneven marks for a scattered one. A phase with no Covenant data at all (something logged long after the fact) simply renders as smooth, unmarked wood — *not* an error state. It reads as an old ring, worn smooth by time. That's more honest than a "no data" placeholder, and it costs nothing extra to implement — it's just the default texture.
- **Branches** — thin curved lines breaking outward from the ring at the moment a long-term goal was set, ending in a small bud (a miniature `AnimatedCircularProgressBar`, already in the component set). A completed goal's bud opens into a small flower shape; an abandoned one stays a closed bud, and that's fine — not every branch has to bloom, and pretending otherwise would be dishonest to what the data actually shows.
- **Amber pockets** — small warm-colored dots embedded directly in the ring at their real date, one per memory. Faint at rest; on hover, they warm up and show a thumbnail sliver.
- **The outer edge** — the current, unclosed ring. Rendered slightly translucent and softly breathing (a slow opacity pulse, same easing pattern already used for the "Now" star), because it isn't finished yet. This *is* where "today" lives.

**Interaction:** clicking a ring triggers a `layoutId`-shared framer-motion transition where that ring "unrolls" — the circle opens and straightens into the corresponding `PhaseCard` in the scrollable list below. This is the one motion beat worth spending real animation budget on: it's the visual equivalent of opening a chapter, and it's what turns "clicking a UI element" into something that feels like an actual gesture of revisiting a memory.

On narrow viewports or `prefers-reduced-motion`, the circular hero collapses to the existing horizontal `RiverMap`/Timeline from the previous spec — nothing about this requires the circular form to work; it's the emotional entry point, not the only way to read the data.

---

## 3. The Four Lenses — What Tabs Actually Do Now

The mistake in "combined but really just four tabs" is that switching tabs replaces the whole view — you leave Phases to go look at Covenant, then leave Covenant to go look at Memories. Nothing carries over, so it never reads as one thing.

Instead: **the ring stays on screen at all times.** Switching between Phases / Covenant / Gold / Memories changes which *layer* of the same ring is in focus — everything else dims to a quiet background silhouette instead of disappearing.

- **Phases lens (default)** — full color, all four layers visible at equal weight. This is the "look at everything" view described in §2.
- **Covenant lens** — the grain brightens and scales up slightly; the outer soft edge becomes interactive, showing today's commitments as small marks you can tap to complete, which visibly harden into grain texture in real time. Branches and amber recede to faint outlines.
- **Gold lens** — branches extend, thicken, and glow; buds become legible with real progress values on hover. Daily goals appear as small leaf-marks along today's edge, same "complete it and watch it get recorded" mechanic as Covenant. Grain and amber recede.
- **Memories lens** — amber pockets brighten and enlarge into visible thumbnails, becoming the dominant visual; clicking one still opens the existing lightbox. Grain and branches recede to soft texture only.

The transition between lenses is a single shared crossfade/scale on the existing ring geometry — never a hard page swap. The point being made visually, every single time you switch: *this was never four different things.*

---

## 4. Today's Edge — Where the Daily Mechanic Actually Lives

This is the piece that makes the "connection" the mandate asked for feel *causal* instead of decorative. Completing a Covenant commitment or a daily Gold goal doesn't just check a box in a list somewhere — it visibly adds a fleck of texture to the still-soft outer edge of the current ring. Over a good week, you can watch the edge get denser. Over a scattered week, you can see it stay thin. At the end of the year, whatever texture accumulated on that edge *is* the permanent grain of that ring, going forward.

That's the whole answer to "how do these connect": not a sidebar showing related data, but the daily systems literally being the thing that writes the permanent one, in a way you can watch happen.

---

## 5. Emotional Details Worth Protecting

A few decisions that matter more than they look like they should, because they're where "beautiful" actually comes from:

- **Nothing is a perfect geometric shape.** Ring edges get the same slight hand-drawn irregularity already planned for `PhaseCard` (SVG `feTurbulence`/`feDisplacementMap`, no new dependency). A perfectly circular ring reads as a chart. A slightly imperfect one reads as a cross-section of something that actually grew.
- **Sparse data is never an error state.** Old phases with nothing tracked underneath them (before DeskFlow existed, or a life period logged after the fact) render as smooth, quiet rings — not broken widgets, not "0 commitments" counters. Emptiness here should read as *time passing before the record started*, not as a bug.
- **Closing a phase is a small ceremony, not a form submission.** When a phase's end date is set (or "Still going" is turned off), the ring finishes hardening with a single slow animation — no toast, no "Saved!" — closer to watching something set than confirming an action.
- **The living edge is the only part of the whole visualization that moves on its own**, and it's the smallest, quietest motion in the design (a slow breathing opacity, nothing flashy). Everything else is still unless you touch it. That contrast is what makes "today" feel alive without the whole page feeling busy.

---

## 6. How This Sits on Top of the Existing Spec

Nothing here invalidates `LIFE_PHASES_SPEC.md`:

- The **PhaseFormDialog** (9-step input wizard) is unchanged — this document is about visualization and cross-feature meaning, not input mechanics.
- The **PhaseCard header band** redesign already planned (ghosted magnitude number, organic texture) now has a clearer reason to exist: it's a single ring pulled out and shown at full size, echoing the hero. Same visual grammar, just zoomed in.
- The **Timeline View** from the earlier spec becomes the reduced-motion / narrow-viewport / "just let me scan quickly" fallback to the circular hero, not a competing design.
- The new IPC surface needed is small and mostly reuses what was already planned: `lifePhase:getPeriodContext` (already spec'd) covers Gold and Memories; it just needs a `covenantCompletionRate` field added for the grain-density calculation, which is the same kind of date-range aggregation as everything else in that handler.

The "River of Years" name can stay exactly as it is — a river carries sediment and leaves rings of its own in what it deposits over time; the ring cross-section isn't a rebrand, it's what you'd see if you took a core sample of the river's banks.

---

## 7. Handoff Kit — For Whichever Model Picks This Up Next

The work left after this document is **implementation, not ideation**. The next model's job is to turn the mappings in §1–5 into real DeskFlow components alongside your coding agent — it should not be re-deriving the metaphor or proposing a different one. Everything it needs to do that is below.

### 7.1 Design references (why this direction, grounded in real precedent)

| Reference | URL | Use it for |
|---|---|---|
| Feltron Annual Reports | http://feltron.com/FAR14.html | The "my life as an editorial document" feeling — tone reference for how personal data can read as beautiful rather than clinical |
| Dear Data (Giorgia Lupi & Stefanie Posavec) | http://giorgialupi.com/publications | The source of the term **Data Humanism** — hand-drawn, imperfect, intimate. This is *why* every surface in §5 avoids perfect geometry |
| Simulated dendrochronology of U.S. immigration | https://vimeo.com/276140430 | A working precedent of the exact mechanic in §1–2: time-series data literally rendered as tree growth rings |

Secondary/supporting technique references (glass-panel rendering details, not the core metaphor):

| Reference | URL | Use it for |
|---|---|---|
| Glassmorphism dark-mode practices | https://uxpilot.ai/blogs/glassmorphism-ui | Lighting/contrast rules for any glass panels (e.g. dialog chrome) still used around the ring |
| Timeline/history UI patterns | https://mobbin.com/explore/mobile/screens/timeline-history | Reference shots if the reduced-motion linear fallback (§2) needs its own polish pass |
| Dark admin dashboard roundup (Tailwind v4 + shadcn + Framer Motion stack) | https://colorlib.com/wp/dark-admin-dashboard-templates/ | Confirms the existing tech stack can support this without new dependencies |

### 7.2 MCP tool servers (protocol-standard — usable by any MCP-aware agent, not just Claude)

These are real, connectable MCP servers. Any MCP-capable coding agent or model (Claude Code, OpenCode, etc.) can add them by server URL — they aren't Claude-exclusive:

| Tool | Server URL | Use it for |
|---|---|---|
| Figma | `https://mcp.figma.com/mcp` | If any of this gets sketched in Figma first, pull real design context, screenshots, and design-system tokens (`get_design_context`, `get_screenshot`, `create_design_system_rules`) |
| Magic Patterns | `https://mcp.magicpatterns.com/mcp` | Iterate on generated UI directly and export working code |
| v0 | `https://v0.app/api/mcp` | Generate/prototype shadcn + Tailwind components matching DeskFlow's exact stack |

Each requires its own OAuth connection wherever it's configured — set up per-tool, not shared automatically between agents.

**Not portable to other models:** the "Modern Web Guidance" plugin and the built-in `frontend-design` skill referenced earlier in this conversation are specific to this Claude environment's catalog — GLM/Kimi/Qwen won't have them automatically. If the next model needs equivalent constraints (Tailwind v4 syntax, current animation APIs), give it the Technical Translation sections in this document and in `LIFE_PHASES_SPEC.md` directly — those already encode the relevant constraints inline, so nothing is lost by the guidance not transferring.

### 7.3 What to hand over

Both documents together are the complete spec:
- **`LIFE_PHASES_SPEC.md`** — PhaseFormDialog (9-step input wizard), individual PhaseCard mechanics, migration SQL, type extensions, build order.
- **`THE_LIVING_ARCHIVE.md`** (this document) — the Ring & Grain metaphor, the four-lens system, and how Covenant/Gold/Memories/Phases connect into one object.

Hand over both files as-is. The next model's task is narrower than this one was: implement against the mappings already defined, resolve real component/IPC details with the coding agent, and flag back only if something in the metaphor genuinely can't be built within the stated constraints (no new dependencies, Tailwind v4, IPC-only renderer access) — not because a different metaphor might be nicer.
