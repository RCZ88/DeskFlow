# CONTEXT BUNDLE — Brain Visualization Redesign

> **Task:** Redesign the brain visualization (NeuralFlow + CanvasGraph) for the Self page of the Life tab.
> **Date:** 2026-08-31
> **Target AI:** Lead Designer AND Engineer — design the visual spec AND the implementation architecture.

---

## 1. Raw Request (verbatim, from user)

"i would like you to generate prompt skill for the only exclusively for the brain visaulziation part. the neurlas thing. i would like those to be properly made. generate a prompt for those"

"like a prompt for an ai to fully think and ifnd a design"

"use ur skills properly man use hte skill router and ur skills from hermes to improve the shit out of this. sue the 21st dev mcp and oteh mcps proeprly"

---

## 2. Problem Statement

The brain visualization on the Life → Self page is "the most ugly fucking thing I have ever seen" (user's words from the originating session). The current state:

- **NeuralFlow.tsx** — a flow-field canvas of 120 particles drifting in violet. It's a generic "tech background" effect with no semantic connection to the brain data. It could be a loading animation for anything.
- **CanvasGraph.tsx** — a force-directed knowledge graph (d3-force-3d) rendering entities/facts as nodes/edges. Functional but visually raw: flat white dots, thin grey lines, no depth, no glow, no sense of "a living brain."
- The two are **visually disconnected**: NeuralFlow sits behind the content as an ambient backdrop; CanvasGraph is a separate card. They don't read as parts of one system.
- The graph has no empty/loading/error state design — just a spinner and a text string.
- No motion design intent: the "breathing" reheat every 8s is a simulation alpha tweak, not a designed animation.

The user wants the brain visualization to be **beautiful, intentional, and orchestrated** — it should feel like a living neural organism, not a generic graph widget.

---

## 3. Current Implementation (verbatim source)

### 3.1 NeuralFlow.tsx — `src/features/warmth/context-brain/NeuralFlow.tsx` (113 lines)

Full source loaded. Key facts:
- 120 particles, seeded RNG (seed=42), violet hue range (250-280)
- Flow field: `angle = sin(y*0.005 + t*0.0004)*0.8 + cos(x*0.004 - t*0.0003)*0.8 + sin((x+y)*0.002 + t*0.0002)*0.4`
- Damping 0.98, speed clamp 1.2, wrap-around edges
- Alpha: `(0.04 + 0.03*sin(t*0.0008 + x*0.008 + y*0.006)) * opacity`
- Stroke: `hsla(hue, 45%, 55%, alpha)`, lineWidth 0.6
- No connection to brain data — pure procedural noise

### 3.2 CanvasGraph.tsx — `src/features/warmth/context-brain/CanvasGraph.tsx` (353 lines)

Key interface:
```tsx
interface Props {
  nodes: GraphNode[]
  links: GraphLink[]
  width: number; height: number
  onNodeHover?: (node: GraphNode | null) => void
  onNodeClick?: (node: GraphNode) => void
  hoveredNode?: GraphNode | null
  selectedNode?: GraphNode | null
  selectionSet?: Set<string>
}
```

Rendering:
- Edges: dim grey `rgba(39,39,42,0.4)`, lineWidth 0.8; selected edges get gradient glow + shadowBlur 12
- Nodes: radial gradient (white → color → color+aa), radius `max(4, min(18, 4 + degree*1.8))`
- Labels: 500 11px Inter, centered, `isDimmed` nodes get `color+25` fill
- Stats overlay: 400 10px JetBrains Mono, top-left
- d3-force-3d simulation: forceLink(80, 0.4), forceManyBody(-120, 300), forceCenter(0.05), forceCollide(radius+6)
- Ambient reheat: `setInterval(() => { if (sim.alpha() < 0.02) sim.alpha(0.02).restart() }, 8000)`

### 3.3 Shared types — `src/features/warmth/context-graph/types.ts`

```tsx
export interface GraphNode {
  id: string; name: string; type: string
  state: 'active' | 'blocked' | 'neutral'
  degree: number
  facts: { predicate: string; value: string }[]
  source?: string
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
}
export interface GraphLink { source: string; target: string; predicate: string }
export const TYPE_COLORS = {
  goal: '#22c55e', project: '#3b82f6', deadline: '#ef4444',
  person: '#f59e0b', tool: '#8b5cf6', concept: '#06b6d4',
  life_phase: '#ec4899', default: '#71717a',
}
```

### 3.4 IPC endpoints (preload.ts:1626-1630)

```
brainStats: () => ipcRenderer.invoke('brain:stats'),
brainGetEntities: (opts?) => ipcRenderer.invoke('brain:get-entities', opts),
brainGetFacts: (opts?) => ipcRenderer.invoke('brain:get-facts', opts),
brainGetEpisodes: (opts?) => ipcRenderer.invoke('brain:get-episodes', opts),
learnGetNodes: () => ipcRenderer.invoke('learn:get-nodes'),
brainSearch: (query, modes) => ipcRenderer.invoke('brain:search', query, modes),
brainChat: (opts) => ipcRenderer.invoke('brain:chat', opts),
```

### 3.5 Design tokens

From `src/features/warmth/ContextGraphView.tsx`:
```ts
export const ACCENTS = {
  purple: '#8b5cf6', green: '#22c55e', amber: '#f59e0b',
  cyan: '#06b6d4', rose: '#f43f5e', slate: '#71717a',
  surface: 'rgba(24,24,27,0.65)', border: 'rgba(255,255,255,0.06)',
}
```

### 3.6 Motion mechanics reference

10 canonical mechanics at `agent/docs/motion_site_mechanics_10/`:

| Mechanic | Semantic | Relevance |
|----------|----------|-----------|
| **Adjacent** | Force-directed citation neighbourhood | DIRECT — knowledge graph = adjacency |
| **Headway** | Flow-field streamlines | DIRECT — NeuralFlow's streamlines |
| Morphogen | Reaction-diffusion | Already used app-wide (LivingSubstrate) |
| Nearside | Voronoi cells | Could map to entity territories |
| Quorum | Cellular automaton | Could map to active-node pulses |
| Overpass, Freeboard, Foreshock, Harmonic, Deident | various | lower relevance |

Design rule: Every mechanic MUST map to the page's information type. Never use one just because it looks cool.

---

## 4. What the Solution Must Include

### A. Design Task
1. **ONE visual concept** driving the entire brain visualization — what is the idea?
2. **NeuralFlow redesign** — must feel like neural activity (signals, synapses), not generic particles
3. **CanvasGraph redesign** — must feel like a living organism: depth, glow, breathing, signal propagation
4. **Integration** — NeuralFlow + CanvasGraph must read as ONE system
5. **Empty / loading / error / populated states** — all four, designed
6. **Motion design** — pick Liveliness Level (L1/L2/L3) with justification; map to motion taxonomy
7. **Reduced-motion fallback** — mandatory

### B. Engineering Task
1. **Data flow** — how brain data feeds both graph and ambient layer
2. **Rendering strategy** — canvas vs SVG vs hybrid, justify
3. **Performance** — current O(n²) edge loop + rAF; how to handle 300+ nodes in Electron
4. **Component API** — props interface for redesigned brain viz
5. **Dependencies** — prefer zero new deps

### C. MCP Component Inventory

From 21st.dev (verified): Graphs in React (60 libs), Data Visualization (246 components), 3D React (60 libs).
From vendored Magic UI: AnimatedBeam (connecting lines), Particles (floating noise), NumberTicker (data count-up).

Source routing: Standard UI → shadcn, Animated effects → Magic UI, Icons → Lucide, Specific → 21st.dev.

---

## 5. Constraints

- Zero new dependencies preferred (already have d3-force-3d, framer-motion, canvas)
- Dark mode only — zinc-950 base, glass cards
- Fonts: Inter (body), JetBrains Mono (data), Geist (display)
- Max rounded-xl (12px), max p-5 padding
- Must work in Electron — no `mask-composite: exclude` (BorderBeam ban)
- No `git checkout`/`restore`/`reset` — Zero-Destruction Rule
- IPC channels fixed — brain data from brainStats/brainGetEntities/brainGetFacts

---

## 6. Known Gaps

1. NeuralFlow has ZERO connection to brain data — pure noise
2. No signal propagation along edges — static lines only
3. No depth/layering — z-coordinate computed but never used visually
4. Stats overlay is plain monospace — no design
5. Sibling components (BrainGrowthChart, ContextRetrievalPanel) must not conflict

---

## 7. Output Format

The target AI must return:
1. **Design spec** — ONE visual concept, color palette, motion level, state designs
2. **Technical architecture** — rendering strategy, data flow, component API, performance plan
3. **Implementation plan** — ordered files to change, what changes in each
4. **MCP component table** — which real components to pull from where
