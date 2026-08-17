# Collaboration Request: Reaction-Diffusion "Life Growing" Design for the Life Page

## Your Role

You are the Specialist AI. I am the Project Owner AI. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this idea into an implementable specification.

## The Idea (Verbatim from User)

> https://github.com/jasonwebb/reaction-diffusion-playground — i would like you to do a back and forth skill with this on how u can implement this beautiful life growing thing reaction diffusion design into the life page to make it beautiful, which part of the design (maybe just the background and stuff), should we put these on.

## What the User Wants

1. Bring the **Gray-Scott reaction-diffusion** aesthetic (organic, emergent, "growing" patterns — like the jasonwebb playground) into the **Life page** (`/life`).
2. The Life page should feel **beautiful and alive** — a "life growing thing".
3. KEY DESIGN QUESTION for you to decide: **WHICH surfaces of the Life page should carry the reaction-diffusion treatment** — user hints "maybe just the background and stuff" — and **how** (which layers, at what opacity, which palette, how it interacts with existing content/cards).

## Current Architecture (Context Bundle Attached)

- **Stack:** Electron + React 18 + TypeScript + Tailwind CSS + Framer Motion + better-sqlite3 + **three.js ^0.183.2 + @react-three/fiber ^9.5.0 + @react-three/drei ^10.7.7** (already installed!).
- **Page:** `src/features/warmth/LifePage.tsx` (972 lines) — the ONLY page in the app that already renders React-Three-Fiber (ContextGraphView).
- **Two view modes:**
  - `pages` — full-page tabs (Covenant, Memories, Gold, Notes, Profile, Graph, Brain) each embedded in a `max-w-* mx-auto` scroll column.
  - `river` — the signature two-pane layout: **sticky 440px map column** (CoreSample ring + TimelineView + RiverMap) + **scrollable features column** (TodayTributary, lens indicator, quick-add toolbar, PhaseCards).
- **River mode has a "Vital Thread"** — an absolutely-positioned center line with a gradient (amber → green → sky) already acting as a subtle ambient element.

## Key Components (source embedded in CONTEXT_BUNDLE.md)

| Component | File | Purpose |
|-----------|------|---------|
| LifePage.tsx | `src/features/warmth/LifePage.tsx` | Mode toggle + pages tabs + river two-pane layout |
| CoreSample.tsx | `src/components/life-river/CoreSample.tsx` | RingCanvas wrapper + lens switcher; stage is `h-72 sm:h-[420px] lg:h-[460px]` circular area |
| RingCanvas.tsx | `src/components/life-river/RingCanvas.tsx` | SVG tree-ring visualization, 4 lens layers |
| RiverMap.tsx | `src/components/life-river/RiverMap.tsx` | SVG river path with phase markers |
| TodayTributary.tsx | `src/components/life-river/TodayTributary.tsx` | WarmCard: covenant + goals + memories for today |
| PhaseCard.tsx | `src/components/life-river/PhaseCard.tsx` | Full phase card (expanded w/ 9 system panels) |
| ContextGraphView.tsx | `src/features/warmth/ContextGraphView.tsx` | **Existing R3F canvas usage — the precedent** |

## The Reference Project (jasonwebb/reaction-diffusion-playground)

- Gray-Scott model: two chemicals A & B on a 2D grid; parameters `f` (feed), `k` (kill), `dA`, `dB` (diffusion rates).
- Implementation: **three.js DataTextures** sized to the canvas, custom GLSL fragment shaders (`simulationFrag.glsl` runs the RD equation per pixel; `displayFrag.glsl` maps concentration → color), **ping-pong render targets** (multiple simulation passes per frame), orthographic camera + plane mesh.
- Emergent patterns: stripes, spots, coral-like growth, "cells" that grow and split.
- Interactions: click-drag raises B concentration; wheel changes brush size; presets for interesting (f,k) regions; pause/play.

## Context Gaps (What I Don't Have Yet)

- We do not have the exact GLSL source of `simulationFrag.glsl` / `displayFrag.glsl` embedded here. If you need the actual shader code or the exact uniforms used, ASK and I will fetch it from the repo.
- We do not have full source of every Life page sub-component (GoldPage, CovenantPage, MemoriesPage, NotesTab). If you need any, ask for the EXACT file path.
- We do not know if the app's dark background layer is a fixed element in App.tsx or page-level. If placement depends on it, ask and I will fetch App.tsx.

## Conversation Protocol

**How we communicate:**

1. **You ask specific questions.** Format: `REQUEST: [specific file, schema, or clarification]`
2. **I fetch and respond.** Format: `CONTEXT: [file path]` + actual source code
3. **You refine your understanding.** Ask follow-ups or propose a design.
4. **When ready, you produce RESULT.md** — the full implementable spec.

**Rules:**
- Do NOT assume context you don't have. Ask for it.
- Do NOT design for features whose backend doesn't exist. Flag them.
- Do NOT produce a monolithic answer. Iterate with me.
- When you need to see code, ask for the EXACT file path.
- The first response should be QUESTIONS, not answers — identify 3-5 context gaps you need resolved before you can commit to a surface/placement decision.

## Scope

- **IN:** Which Life page surfaces get reaction-diffusion (background layer, CoreSample stage backdrop, card textures, hero moments); the rendering approach (pure three.js vs R3F vs WebGL2 canvas 2D fragment shader); palette mapping to the app's dark/amber design tokens; performance strategy (paused when tab hidden, low-res internal buffer, reduced-motion respect); how it composes with the existing "Vital Thread" line and glass cards.
- **OUT:** No backend changes. No new DB tables. No changes to other pages (unless a shared background component is the cleanest approach — then flag it).

## Expected Output

After our conversation converges, produce:

1. **RESULT.md** — The complete design specification: surface-by-surface placement, shader/component architecture, palette, performance budget, integration points (exact components + insertion lines if possible), empty/loading/error states, and a file-by-file implementation plan.
2. **Backend Audit** — any missing IPC/services flagged (expected: none).

## First Question

Open question to you, Specialist: **"Where should the life-growing reaction-diffusion live on the Life page, and at what level of prominence?"** Consider: full-page ambient background behind both modes, only behind the River two-pane, a living backdrop inside the CoreSample ring stage, subtle texture inside glass cards, or a hero element. Ask me for whatever code you need to decide — then propose your surface map.