# RHEO Landing Page — Mascot Integration Task

Context for a coding agent picking this up cold. Read this fully before touching any files.

## Project context

RHEO is a local-first, privacy-first desktop app. The landing page's chosen creative direction is **"The Loom"**: RHEO's subsystems are threads on one loom, and its AI is the shuttle running through all of them. The whole design rests on **one rule that matters more than any individual visual**: reuse a single motif (thread / stitching / patches) everywhere, rather than introducing new unrelated visual languages per section. If you add anything that doesn't read as "made of thread," you're breaking the thing that makes this design work. When in doubt, ask before inventing a new visual system.

## Files that already exist

- **`rheo-loom-prototype-v2.html`** — the working scroll prototype. A pinned, GSAP `ScrollTrigger`-scrubbed sequence: Hero (weave draws in) → Threads (7 subsystems highlighted in turn) → Shuttle (AI captions on 3 of them) → Fabric (zoom-out payoff) → Closing CTA. Uses Lenis for smooth scroll, a custom `easeInOutCubic` ease registered via `gsap.registerEase`, and a two-layer SVG clip-path trick (`#clipOver` / `#clipUnder`) to fake the woven over/under look with one shared path.
- **`rheo-thread-patches.html`** — a reference sheet of 7 hand-coded SVG "patch" icons (one per core subsystem), styled as embroidered/stitched badges with a dashed border, sitting in `.patch` cards inside a `.grid`.
- **`rheo-mascot-image-prompts.md`** — the prompts used to generate 12 richer illustrated PNG mascots (superset of the 7 SVG patches) in an "embroidered patch" art style, via an external image generator. These are the images this task is about integrating.

## Asset manifest — expect these files

Illustrated PNGs, one per subsystem, embroidered-patch style, transparent or plain dark background. If the actual filenames on disk differ from this convention, use what's there and note the mismatch — don't rename blindly.

```
assets/mascots/mascot-time.png
assets/mascots/mascot-money.png
assets/mascots/mascot-learning.png
assets/mascots/mascot-chat.png
assets/mascots/mascot-terminal.png
assets/mascots/mascot-timeline.png
assets/mascots/mascot-goals.png
assets/mascots/mascot-life-phases.png
assets/mascots/mascot-agent-orchestration.png
assets/mascots/mascot-content-creation.png
assets/mascots/mascot-external.png
assets/mascots/mascot-context-brain.png
```

The first 6 (`time`, `money`, `learning`, `chat`, `terminal`, `timeline`) map to the **7 existing warp threads** in the hero prototype (note: `focus` and `time` are the same thread — the hero's `TIME` warp). The last 6 are subsystems that **don't have a home in the current prototype yet** — see Task 3.

**If an image file is missing, degrade gracefully** — fall back to the existing SVG icon (in `rheo-thread-patches.html`) or hide the mascot slot rather than breaking the layout or throwing a console error. This is a live iterative asset pipeline; missing files are expected mid-process, not a bug.

## Tasks

### Task 1 — Swap the patch sheet's icons
In `rheo-thread-patches.html`, replace each `.patch`'s inline SVG with `<img src="assets/mascots/mascot-<slug>.png" alt="<LABEL> mascot patch">`, sized to fill the same footprint the SVG currently does. Keep the `.patch` div's dashed border, background, and mono label exactly as they are — only the icon changes. Add 6 new `.patch` entries for the subsystems that aren't in this file yet (goals, life phases, agent orchestration, content creation, external, context brain).

### Task 2 — Add mascots to the live hero threads
In `rheo-loom-prototype-v2.html`, each of the 7 warp threads currently only has a `<text class="warp-label">` at its base (see the `warpEls` array and `warpLabelsG` group in the script). Add a small (~28–32px) `<img>` mascot above each thread's label, positioned the same way the caption boxes already are — reuse the exact pattern in `positionCaptions()` (`(w.x / W) * 100` as a percentage of `.pinned-stage`'s width), don't invent a new positioning method. Fade these in as part of the **same** staggered entrance tween that already animates `warpEls.map(w=>w.lineEl)` and `.labelEl` on load — add the mascot elements to that stagger, don't create a separate animation for them.

### Task 3 — Give the other 6 subsystems a section
Goals, Life Phases, Agent Orchestration, Content Creation, External, and Context Brain aren't threads in the hero — they need a home. Build this as the **module-store section** that was already planned for this page (features framed as "spare threads you can add," a bento grid with a border-beam hover effect), placed after the Fabric beat and before the Closing CTA. Use all 12 mascots here (repeating the 6 hero ones is fine — reinforcement, not redundancy), each as a small patch card: mascot image, label, one-line description. Match the exact dashed-border/glass-card visual style already established in `rheo-thread-patches.html`'s `.patch` class — don't design a new card style for this.

## Constraints (non-negotiable, carried over from earlier design decisions)

- Dark mode only. No new colors outside the existing tokens (`--bg #09090b`, `--amber #fbbf24`, `--terracotta #c2703d`, `--text #fafafa`, `--text-secondary #a1a1aa`).
- Every new animation needs the same treatment as existing ones: driven by GSAP `ScrollTrigger` or the page-load stagger tween, using the registered `easeInOutCubic`, not a default ease.
- Respect `prefers-reduced-motion` the same way the rest of the file already does (see the `reduceMotion` branch near the top of the script) — new elements need a static end-state in that branch too, not just the animated path.
- Provide real `alt` text per mascot (use the subsystem label) — these are meaningful content, not decoration, so they're not `alt=""`.
- Don't add a second card style, a second icon style, or a second color for "new feature" sections. If it doesn't look like it's made of the same thread as everything else, it's wrong even if it looks good on its own.

## Done means

- All 12 mascots have a visible home somewhere on the page.
- The hero's 7 threads and the module-store grid visually agree with each other (same patch style, same palette).
- Missing image files don't break the page.
- Reduced-motion users get the same information, just without the animation.
