# RHEO Landing Page — Mascot Integration Task
## Full Context for Higher AI Models

**Project:** RHEO (local-first, privacy-first desktop app)
**Page:** Landing page — creative direction "The Loom"
**Location:** `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\rheo-landing\`

---

## 1. What This Page Is

RHEO's landing page creative direction is **"The Loom"**: RHEO's subsystems are threads on one loom, and its AI is the shuttle running through all of them. The whole design rests on **one rule**: reuse a single motif (thread / stitching / patches) everywhere. If you add anything that doesn't read as "made of thread," you're breaking the thing that makes this design work.

The page is a long scroll with a pinned hero section, multiple beats, and a closing CTA. Smooth scroll via Lenis. Custom ease `easeInOutCubic` registered via GSAP.

---

## 2. Current Page Structure (6 Beats)

### Beat 1 — Hero (pinned, ~420vh)
- Sticky full-screen stage with the SVG loom (`LoomSVG.tsx`)
- Headline: "One shuttle. Every thread."
- Subtext: "AI doesn't sit in a chat window. It runs through everything you track."
- 7 vertical warp lines (TIME, MONEY, FOCUS, LEARNING, CHAT, TERMINAL, TIMELINE) at x: 100, 300, 500, 700, 900, 1100, 1300
- Animated weft thread weaving through (sine wave, y≈380)
- Glow dots at weft/warp crossings
- 3 caption boxes that appear at scroll positions: MONEY (Finance), LEARNING (Learning), TERMINAL (Terminal) — with connector lines from weft crossings
- **Mascot images: 7 images positioned above each warp label** — TIME, MONEY, FOCUS, LEARNING, CHAT, TERMINAL, TIMELINE. FOCUS reuses TIME's mascot.

### Beat 2 — Threads (~200vh)
- 7 vertical lines matching the hero warps, with labels
- Each thread highlights in sequence as you scroll
- Description panels appear beside the active thread
- No mascot images currently

### Beat 3 — Fabric
- Zoom-out payoff from the whole woven fabric
- No mascots

### Beat 4 — ModuleStore
- "Spare threads you can add"
- 12 patch cards in a responsive grid (2/3/4 cols)
- Each card: mascot image (84×46px) + label + description
- Subsystems: time, money, learning, chat, terminal, timeline, goals, life-phases, agent-orchestration, content-creation, external, context-brain
- Note: "focus" entry was removed (no mascot-focus.png exists; FOCUS shares TIME's mascot)

### Beat 5 — Quiet
- Some section after the store

### Beat 6 — Closing
- Open source section + Footer

---

## 3. The 12 Mascot PNG Assets

All in `public/assets/mascots/`. All are **removebg (transparent background)**, 677×369px, aspect ratio 1.835. Named with slug convention:

| # | Filename | Subsystem | Size |
|---|----------|-----------|------|
| 1 | mascot-time.png | Time/Focus | 184.8KB |
| 2 | mascot-money.png | Money | 228.7KB |
| 3 | mascot-learning.png | Learning | 343.0KB |
| 4 | mascot-chat.png | Chat | 195.9KB |
| 5 | mascot-terminal.png | Terminal | 259.4KB |
| 6 | mascot-timeline.png | Timeline | 244.2KB |
| 7 | mascot-goals.png | Goals | 276.4KB |
| 8 | mascot-life-phases.png | Life Phases | 253.6KB |
| 9 | mascot-agent-orchestration.png | Agent Orchestration | 391.7KB |
| 10 | mascot-content-creation.png | Content Creation | 101.6KB |
| 11 | mascot-external.png | External | 219.3KB |
| 12 | mascot-context-brain.png | Context Brain | 280.1KB |

Mapping to prompts (from `rheo-mascot-image-prompts.md`): 1=Time/Focus, 2=Money, 3=Learning, 4=Chat, 5=Terminal, 6=Timeline, 7=Goals, 8=Life Phases, 9=Agent Orchestration, 10=Content Creation, 11=External, 12=Context Brain.

**Important:** `mascot-focus.png` does NOT exist. FOCUS warp reuses TIME's mascot.

---

## 4. Key Source Files

- `src/components/LoomSVG.tsx` — the SVG loom component (7 warps, weft, glow dots, clip paths)
- `src/sections/Hero.tsx` — pinned hero beat with LoomSVG + mascot images + 3 captions
- `src/sections/Threads.tsx` — threads beat (7 lines, sequential highlight, descriptions)
- `src/sections/Fabric.tsx` — fabric zoom-out beat
- `src/sections/ModuleStore.tsx` — 12 patch cards grid
- `src/sections/Quiet.tsx` — post-store section
- `src/sections/OpenSource.tsx` — open source section
- `src/sections/Footer.tsx` — footer
- `src/App.tsx` — page shell, renders all sections in order
- `src/index.css` — Tailwind + custom CSS (has `--color-*` tokens)

---

## 5. Design Tokens (from index.css @theme)

```
--color-bg: #09090b          (page background)
--color-surface: #18181b     (card backgrounds)
--color-raised: #27272a
--color-amber: #fbbf24       (primary accent)
--color-terracotta: #c2703d  (secondary accent)
--color-text: #fafafa        (primary text)
--color-text-secondary: #a1a1aa
--color-text-muted: #71717a
```

Dark mode only. No new colors.

---

## 6. Known Issues to Discuss

### A. Black text labels on warp lines
The `<text class="warp-label">` elements in `LoomSVG.tsx` render black on the `#09090b` background, making them invisible. Need to fix to use `text-text-secondary` or similar visible color.

### B. 4 of 7 Hero threads show icons
Only 4 of the 7 warp threads in the Hero have a visible mascot icon above them. User finds this mismatch between the 7 threads and the partial icon coverage breaks the visual coherence.

### C. Three sections showing the same feature list
The user feels the page shows the "list of RHEO's features" three times: Hero (7 threads with icons), Threads beat (7 lines), and ModuleStore (12 patch cards). This redundancy dilutes each section's purpose. Discussion needed on how to differentiate them.

### D. Thread count vs icon count mismatch
In Hero: 7 threads but only 4 icons. In Threads: 7 threads, no icons. In ModuleStore: 12 items. The numbers don't tell a coherent story across sections.

---

## 7. Files Referenced in the Handoff

The handoff doc (`agent/docs/landing-page-brief/rheo-coding-agent-handoff.md`) references these prototype files that explain the original design intent:
- `rheo-loom-prototype-v2.html` — the working scroll prototype with GSAP ScrollTrigger
- `rheo-thread-patches.html` — reference sheet of 7 SVG patch icons
- `rheo-mascot-image-prompts.md` — prompts for the 12 PNG mascots

These exist in `agent/docs/landing-page-brief/`.

---

## 8. What We Need from Higher AI Models

Discussion points:
1. **Fix the black warp-label text** — what's the right color/approach?
2. **Why only 4 of 7 Hero icons show** — is this a bug or intentional? How to fix?
3. **Page structure / information hierarchy** — are 3 feature-list sections redundant? How should each beat's purpose differ? Should Hero be more metaphorical (fewer literal subsystem references) and ModuleStore be the "full reference"?
4. **Icon-to-thread mapping consistency** — should Threads beat also show mascots? Should the numbers (7 threads, 12 modules) be reconcilable in the narrative?
5. **FOCUS = TIME mascot sharing** — is this the right call, or should FOCUS get its own treatment?
6. **Missing Shuttle beat** — the handoff mentions a "Shuttle" beat with AI captions between Threads and Fabric. It doesn't appear in the current code. Should it be added back?

---

## 9. Build Commands

```bash
# Typecheck
npx tsc -b

# Dev server
npx vite

# Production build
npx vite build --outDir dist-tmp
```

Build output goes to `dist-tmp/`. The dev server runs on localhost:5173.

---

*Generated from conversation context. Last updated: 2026-08-29.*
