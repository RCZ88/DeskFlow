# PROMPT — Context Brain Neural Visualization Overhaul

## Role

You are the **Lead Designer and Engineer** for DeskFlow's Context Brain visualization. You own the entire solution from data processing to pixels.

## Context

Read `CONTEXT_BUNDLE.md` first. It contains every source file, IPC endpoint, type definition, and design token you need. The target codebase is an Electron + React + R3F (React Three Fiber) + Three.js application.

## Raw Request

> "THE KNOWLEGDE GRAPH LOOKS LIKE SHIT IDIOT. FUCKIMG IMPROVE IT IDIOT USING COOL STUFF 3D GRAPHICS PROCESSING AND LIKE SHADARDS AND EVREHTING AND LIKE A PROPER NEURAL LOOKING SYSTEMS PROPERLY IDIOT."
> "the part where it shows the brain and like the neural links and evreything? WHERE IS IT?? THE PROPER VISUALZIATION THE COOL ONES AND THE ACTUAL USEFULL ONES THE COOL ONES IS JUST TO VISUALZISE COLOL AND LIKE GROUP SUTFF BUT SHOULD BE ABLE TO BE SLEECTED AND VIEWED ADN RETRIEVED AND HTOSE STUFF PROEPRLY"
> "how is the personal context feature? how is it able to be displayed properly and how is it going to be making that it can categorized things and like we can select which context we want to select and and retrieve the text json or whatever format so that we can insert into a different ai"

## Problem Statement

The current Context Brain visualization is a decorative 3D sphere field. It has:
- Plain colored spheres (no shaders, no pulsing, no neural feel)
- Flat gray lines (no animated data flow, no synapse feel)
- No multi-select + export (can't pick context items and export for other AIs)
- Two disconnected systems (graph visual vs retrieval panel with export)
- Static after 200 force ticks (no continuous breathing)
- Minimal postprocessing (just one Bloom pass)

## Mandate

**Design a complete neural network visualization system** that:
1. **Looks like neurons** — pulsing nodes, animated synapses, energy flowing along edges
2. **Is properly interactive** — click nodes to view details, multi-select nodes for export
3. **Exports context** — select specific entities/facts/episodes and export as JSON or Markdown for pasting into ChatGPT/Claude/etc.
4. **Categorizes visually** — entity types shown as distinct visual clusters with different behaviors
5. **Searches and filters** — already works in GraphControls, needs to connect to the detail panel

---

## Engineering Task: Data Processing Pipeline

### Node Visual Properties (computed from data)

Each node needs these visual properties computed from its data:

1. **Size**: Base 0.25 + degree-based growth (0.05 per connection, max 0.65). Already exists.
2. **Color**: From `TYPE_COLORS` map. Already exists.
3. **Pulse speed**: `0.5 + (node.facts.length * 0.1)` — nodes with more facts pulse faster (more "active" knowledge).
4. **Emissive intensity**: `0.3 + (node.state === 'active' ? 0.4 : 0)` — active nodes glow brighter.
5. **Glow radius**: `baseSize * (1.5 + pulsePhase)` — glow expands/contracts with pulse.

### Edge Visual Properties

1. **Color**: Highlighted = white, normal = gradient from source to target type color, dimmed = near-invisible.
2. **Width**: 0.8 base, 1.5 when highlighted.
3. **Data flow**: Animated particles traveling along the edge from source to target. Particle count = min(5, edge weight). Speed = 0.3 units/frame.
4. **Opacity**: 0.12 base, 0.4 highlighted, 0.05 dimmed.

### Postprocessing Stack

Replace the single Bloom pass with:

1. **Bloom** — luminanceThreshold: 0.4 (lower = more glow), intensity: 1.2, mipmapBlur: true
2. **Vignette** — offset: 0.3, darkness: 0.7 (subtle darkening at edges)
3. **Chromatic Aberration** — optional, very subtle (offset: 0.001) for depth feel

### Continuous Animation

The force simulation should NOT stop after 200 ticks. Instead:
- Run 200 ticks for initial layout (already works)
- Then switch to a gentle "breathing" animation: `node.y += Math.sin(time * 0.5 + node.x) * 0.001`
- Selected node should have a subtle orbital camera drift

---

## Design Task: Visual Specification

### Node Appearance (Neural Style)

Replace the plain `sphereGeometry` with a multi-layer approach:

**Layer 1 — Core Sphere**: The existing sphereGeometry but with:
- `meshStandardMaterial` with `emissive` = type color, `emissiveIntensity` = pulsing (sine wave 0.3→0.7)
- `roughness: 0.15`, `metalness: 0.9` (more reflective, less matte)

**Layer 2 — Glow Shell**: A slightly larger sphere (1.3x radius) with:
- `meshBasicMaterial` with `color` = type color, `transparent: true`, `opacity: 0.15`
- This creates a soft glow halo around each node

**Layer 3 — Pulse Ring**: A torus ring around the node that:
- Scales up and down with a sine wave (0.9x → 1.2x → 0.9x)
- Only visible when node is selected or hovered
- Color = type color, transparent, opacity 0.3

### Edge Appearance (Synapse Style)

Replace the flat `Line` with a custom shader material:

**Option A — Animated Dashed Line** (simpler):
- Use `LineDashedMaterial` with `dashSize: 0.3`, `gapSize: 0.15`, `dashOffset` animated over time
- Creates flowing energy effect along the edge

**Option B — Particle Flow** (more impressive):
- Custom `ShaderMaterial` with vertex/fragment shaders
- 5-10 small spheres (radius 0.03) traveling along the edge path
- Each particle has a random offset so they don't clump
- Particle color = source type color fading to target type color

### Background

- Keep `#09090b` base
- Add a subtle grid overlay (optional): very faint lines at 2-unit intervals, opacity 0.03
- Add ambient floating particles (already available via `Particles` component from ui/)

### Camera Behavior

- On node select: smooth lerp to node + offset (already works, keep it)
- On deselection: lerp back to default position [0, 0, 12]
- Add subtle auto-rotation when nothing is selected (0.001 rad/frame)
- When node is selected, slow auto-rotation continues but camera tracks the node

---

## UX Task: Interaction Flow

### Selection Flow

1. **Single click node** → Select it, open EntityDetailPanel, dim unconnected nodes (already works)
2. **Shift+click node** → Add to multi-selection (NEW), show selection count badge
3. **Click empty space** → Deselect all
4. **Selected nodes** → EntityDetailPanel shows combined facts/history/episodes for ALL selected nodes

### Export Flow (NEW — the critical missing piece)

When nodes are selected, show an **Export Bar** at the bottom of the graph:

```
┌─────────────────────────────────────────────────────┐
│ 3 selected  │  [Copy JSON]  [Copy Markdown]  [×]   │
└─────────────────────────────────────────────────────┘
```

**Copy JSON** produces:
```json
{
  "context": {
    "entities": [
      { "name": "React", "type": "tool", "facts": ["is_primary_ui_framework", "version_18"] }
    ],
    "facts": [
      { "subject": "React", "predicate": "is_primary_ui_framework", "value": "true", "confidence": 0.95 }
    ],
    "episodes": [
      { "source": "ai_chat", "content": "...", "date": "2026-08-23" }
    ]
  },
  "exported_at": "2026-08-23T00:00:00Z",
  "app": "DeskFlow"
}
```

**Copy Markdown** produces:
```markdown
# DeskFlow Context Export
Exported: 2026-08-23

## Entities
- **React** (tool) — is_primary_ui_framework, version_18

## Facts
- React is_primary_ui_framework (95% confidence)
- React version_18 (90% confidence)

## Episodes
- [ai_chat] "I discussed React 18 migration..." (2026-08-23)
```

Both formats are designed to be pasteable into ChatGPT/Claude/any AI as context.

### Search Integration

The existing GraphControls search bar should:
1. Still dim non-matching nodes (already works)
2. Also highlight matching nodes with a brief flash animation
3. Show result count next to the search bar

### Type Filter Enhancement

The existing type filter chips should:
1. Still toggle visibility (already works)
2. Also show a mini count badge on each chip
3. When a type is hidden, its nodes should fade out (already works) AND its edges should also fade

---

## Interaction Checklist

| Action | Current | Required |
|--------|---------|----------|
| Click node | Opens detail panel | ✅ Keep |
| Shift+click node | Not supported | ADD: multi-select |
| Click empty space | Deselects | ✅ Keep |
| Hover node | Shows tooltip + scales | ✅ Keep, add glow pulse |
| Search entities | Dims non-matching | ✅ Keep, add flash highlight |
| Type filter chips | Toggles visibility | ✅ Keep, add count badges |
| Detail panel: facts | Shows predicate/value | ✅ Keep |
| Detail panel: history | Shows bitemporal timeline | ✅ Keep |
| Detail panel: episodes | Shows source episodes | ✅ Keep |
| **Multi-select + export** | **MISSING** | **ADD: shift+click, export bar** |
| **JSON export** | **MISSING** | **ADD: structured context** |
| **Markdown export** | **MISSING** | **ADD: human-readable context** |
| Continuous animation | Stops after 200 ticks | CHANGE: breathing anim |

---

## Constraints

1. **Must use existing IPC endpoints** — brainSearch, brainGetEntities, brainGetFacts, brainGetEntityHistory, brainGetEntityRelated. Do NOT create new IPC channels.
2. **Must work with existing R3F + drei + postprocessing stack** — already installed, use them.
3. **Must preserve existing EntityDetailPanel** — enhance it for multi-select, don't replace it.
4. **Must preserve existing GraphControls** — enhance it, don't replace it.
5. **Must keep the same file structure** — `context-graph/` subdirectory with separate component files.
6. **Must not break the Life page self tab** — this component is mounted inside it.
7. **Must not add new npm dependencies** — use what's already installed (three, R3F, drei, postprocessing, d3-force-3d).
8. **Performance target**: 60fps with 200 nodes + 500 edges on mid-range hardware.

---

## Deliverables

Produce a `RESULT.md` with:

1. **Complete component architecture** — what files to create/modify, what each does
2. **GLSL shader code** — for node pulsing, edge flowing, glow effects (inline in component files, not separate .glsl files)
3. **Component code** — full implementation of every modified/new component
4. **Integration plan** — how to wire multi-select + export into ContextGraphView
5. **Visual specification** — exact colors, sizes, timing curves, animation durations
6. **Export format spec** — exact JSON and Markdown schemas

## Verification

After implementation, the following must be true:
- Nodes pulse with a visible sine-wave emissive glow
- Edges have animated flowing particles or dashed animation
- Clicking a node opens the detail panel (existing behavior preserved)
- Shift+clicking adds to selection (new)
- Export bar appears when nodes are selected (new)
- "Copy JSON" puts valid JSON on clipboard (new)
- "Copy Markdown" puts readable Markdown on clipboard (new)
- 60fps with 200 nodes
- No console errors
- Bloom glow is visible and enhances the neural aesthetic
