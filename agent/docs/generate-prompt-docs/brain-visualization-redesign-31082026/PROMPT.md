# PROMPT — Brain Visualization Redesign

> **Send this prompt to the target AI.** The target AI is the **Lead Designer AND Engineer** — it must design the visual spec AND the implementation architecture.

---

## Raw Request

"i would like you to generate prompt skill for the only exclusively for the brain visaulziation part. the neurlas thing. i would like those to be properly made. generate a prompt for those"

"like a prompt for an ai to fully think and ifnd a design"

"use ur skills properly man use hte skill router and ur skills from hermes to improve the shit out of this. sue the 21st dev mcp and oteh mcps proeprly"

---

## Context

The brain visualization on the Life → Self page of the RHEO (DeskFlow) app is "the most ugly fucking thing I have ever seen." It consists of two components:

1. **NeuralFlow.tsx** — a flow-field canvas of 120 drifting violet particles. Pure procedural noise, zero connection to brain data. Reads as a generic "tech background."
2. **CanvasGraph.tsx** — a force-directed knowledge graph (d3-force-3d) rendering entities/facts as nodes/edges. Functional but visually raw: flat white dots, thin grey lines, no depth, no glow, no sense of "a living brain."

The two are visually disconnected — NeuralFlow is an ambient backdrop, CanvasGraph is a separate card. They don't read as one system.

The user wants the brain visualization to be **beautiful, intentional, and orchestrated** — it should feel like a living neural organism, not a generic graph widget.

---

## The Mandate

Design a comprehensive solution for the brain visualization redesign. Your solution must include:

### 1. Design Spec
- **The ONE visual concept** — what single idea drives the entire brain visualization? (Not "make it look nice.")
- **NeuralFlow redesign** — the ambient flow field must feel like neural activity (signals propagating, synapses firing), not generic particles.
- **CanvasGraph redesign** — the knowledge graph must feel like a living organism: depth, glow, breathing, signal propagation along edges.
- **Integration** — NeuralFlow and CanvasGraph must read as ONE system, not two separate widgets.
- **Empty / loading / error / populated states** — all four, designed.
- **Motion design** — pick a Liveliness Level (L1/L2/L3) with justification. Map each animation to the motion taxonomy (reactive/transitional/ambient).
- **Reduced-motion fallback** — mandatory.

### 2. Technical Architecture
- **Data flow** — how brain data (entities, facts, episodes) feeds both the graph and the ambient layer.
- **Rendering strategy** — canvas vs SVG vs hybrid. Justify.
- **Performance** — the current graph re-renders every frame via requestAnimationFrame with O(n²) edge loop. How to handle 300+ nodes smoothly in Electron.
- **Component API** — props interface for the redesigned brain visualization.
- **Dependencies** — prefer zero new deps. If a new dep is needed, justify.

### 3. Implementation Plan
- Ordered list of files to change, what changes in each.

### 4. MCP Component Table
- Which real components to pull from where (21st.dev, Magic UI, shadcn, Lucide).

---

## Constraints

- **Zero new dependencies preferred** — the project already has d3-force-3d, framer-motion, canvas API.
- **Dark mode only** — zinc-950 base, glass cards.
- **Fonts:** Inter (body), JetBrains Mono (data), Geist (display).
- **Max rounded-xl** (12px), max p-5 padding.
- **Must work in Electron** — no CSS features that fail in Chromium (e.g., `mask-composite: exclude` fails — see BorderBeam ban).
- **No `git checkout` / `git restore` / `git reset --hard`** — Zero-Destruction Rule.
- **IPC channels are fixed** — brain data comes from `brainStats`, `brainGetEntities`, `brainGetFacts`. No new IPC needed for the visualization itself.

---

## Reference

- Full current source code: `src/features/warmth/context-brain/NeuralFlow.tsx` (113 lines), `src/features/warmth/context-brain/CanvasGraph.tsx` (353 lines)
- Shared types: `src/features/warmth/context-graph/types.ts`
- Design tokens: `src/features/warmth/ContextGraphView.tsx` (ACCENTS constant)
- Motion mechanics: `agent/docs/motion_site_mechanics_10/` (Adjacent = force-directed graph, Headway = flow-field)
- IPC endpoints: `src/preload.ts:1626-1630`

---

## Output Format

Return your solution as a single markdown document with these sections:

1. **Design Concept** — the ONE idea
2. **Visual Spec** — colors, typography, motion level, states
3. **Technical Architecture** — rendering, data flow, performance, API
4. **Implementation Plan** — ordered file changes
5. **MCP Component Table** — source each component

Do NOT write any code. Do NOT modify any files. This is a design + architecture spec only.
