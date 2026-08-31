# PROMPT.md — Lesson Visualization Tool Selection

> **Prompt Type:** Planning / Architecture
> **Target AI:** Claude / GPT-4
> **Output Format:** Decision matrix + recommended stack

---

## System Prompt

You are a technical architect evaluating visualization tools for integration into an Electron + React desktop learning application. You must make concrete, opinionated recommendations — not list options. Your job is to SELECT 3-5 tools that form a coherent, non-overlapping visualization stack for math/STEM lesson assets.

---

## User Prompt

### Context

We're building animated math/STEM visualizations as lesson assets in a desktop learning app (Electron + React + TypeScript). We researched 9 candidate tools and need to select 3-5 that form a coherent stack.

### Constraints
- **Max 5 tools** — more leads to inconsistencies and maintenance burden
- **Exception:** If tools cover genuinely different domains (e.g., one for 2D math, one for 3D, one for video generation), more is acceptable
- Must work in Electron (browser-native preferred)
- Must integrate with React 18+
- Must have math primitives (not just general animation)
- Must be MIT or compatible license
- Must be actively maintained
- Preference for tools that AI can drive programmatically (JSON/DSL/API)

### The 9 Candidates

#### 1. Elucim (`@elucim/core` + `@elucim/dsl`)
- **Type:** React-native math visualization + animation
- **Output:** Live browser SVG/Canvas + video export
- **Math:** Axes, FunctionPlot, Vector, VectorField, Matrix, Graph, LaTeX, BarChart
- **AI:** JSON/YAML DSL, agent helpers (`createCalculusDerivativeScenePreset`, `evaluateSceneForAgent`, `lintMotion`)
- **Animation:** Timelines, state machines, keyframes
- **License:** MIT
- **GitHub:** github.com/sethjuarez/elucim
- **npm:** 66 weekly downloads (new but complete — 9 phases, 429 tests)

#### 2. Mafs (`mafs`)
- **Type:** React math components (SVG)
- **Output:** Live SVG in browser
- **Math:** Cartesian/polar coordinates, function plotting (OfX, OfY, Parametric, Inequality), vector fields, movable points, polygons
- **AI:** No DSL — React component API only
- **Animation:** Interactive (drag, pan, zoom) but no timeline system
- **License:** MIT
- **GitHub:** github.com/stevenpetryk/mafs
- **npm:** Popular, well-documented

#### 3. Manim (Python, `manim`)
- **Type:** Python animation engine
- **Output:** Rendered video (MP4)
- **Math:** Everything — coordinate systems, transforms, LaTeX, 3D scenes, graphs, tables
- **AI:** Proven — LLM2Manim paper (83% post-test, d=0.94 engagement), 3brown1blue skill, ManimTrainer
- **Animation:** Full timeline, scene composition, camera controls
- **License:** MIT
- **GitHub:** 39.7k stars
- **Limitation:** Python-only, video output, no browser interactivity

#### 4. 3brown1blue (pip package)
- **Type:** Claude Code skill for Manim code generation
- **Output:** Manim Python code → rendered video
- **What it does:** Encodes 16 visual design principles, 12 crash-prevention patterns, 22 visual recipes from 422 3Blue1Brown frames
- **AI:** IS an AI tool — `pip install 3brown1blue`, works with Claude Code, Cursor, Windsurf
- **License:** Check repo
- **GitHub:** github.com/AmitSubhash/3brown1blue

#### 5. Motion Canvas (`@motion-canvas/core`)
- **Type:** TypeScript procedural animation
- **Output:** Rendered video + live preview editor
- **Math:** None built-in (need extension like motion-canvas-graphing)
- **AI:** No DSL — generator-based code
- **Animation:** Excellent — generator flow, signals, effects, flexbox layout
- **License:** MIT (Canvas Commons fork)
- **Limitation:** No math primitives, video output only

#### 6. canvas-math-kit (`@sirhc77/canvas-math-kit`)
- **Type:** React canvas vector visualizer
- **Output:** Live canvas in browser
- **Math:** Vectors, parallelograms, grid snapping — linear algebra only
- **AI:** No DSL — React component API
- **Animation:** Drag interactions, no timeline
- **License:** MIT
- **Limitation:** Very narrow — vectors only, no functions, no LaTeX

#### 7. Vivid (`vivid-animations`)
- **Type:** TypeScript math animation
- **Output:** Live Canvas in browser + video export
- **Math:** Functions, equations, matrices, 3D
- **AI:** "AI-friendly declarative API" (check actual API)
- **Animation:** Full animation system (create, transform, fade, morph)
- **License:** Check repo
- **GitHub:** github.com/markm39/vivid

#### 8. ExcaliMath (`@excalimath/core`)
- **Type:** Math plugin for Excalidraw
- **Output:** Whiteboard canvas
- **Math:** KaTeX equations, Plotly.js graphs, 80+ STEM shapes
- **AI:** No programmatic API — GUI only
- **License:** MIT
- **Limitation:** Whiteboard tool, not an animation engine

#### 9. open-calc (reference architecture)
- **Type:** Full STEM learning platform (not a library)
- **Output:** Browser app
- **Math:** D3 + Three.js + KaTeX + Pyodide
- **AI:** VizFrame registry pattern, `mathBridge` field
- **Architecture:** Shows how to combine D3, Three.js, KaTeX into a lesson system
- **Limitation:** Not a library — reference implementation to study

---

### Decision Framework

For each tool, evaluate:

| Question | Why It Matters |
|----------|---------------|
| Does it fill a UNIQUE role that no other candidate fills? | Overlap = waste |
| Can it render in Electron without Python? | Production constraint |
| Can AI generate content for it programmatically? | Lesson generation pipeline |
| Does it have math primitives we need? | Core requirement |
| Is it mature enough (tests, docs, community)? | Reliability |
| Does it overlap with existing tools (D3, Three.js, KaTeX)? | Don't re-buy what we have |

### Specific Questions To Answer

1. **Elucim vs Mafs:** Both do browser-native math viz. Which is better for our use case? Or do we need both (Elucim for animation, Mafs for simple interactive plots)?

2. **Manim + 3brown1blue:** These output video, not interactive content. Is there value in pre-generating video assets via AI? Or is browser-native always better?

3. **What role does Three.js play?** We already have it. Do we need another 3D tool, or does Three.js cover that domain?

4. **What about simple inline math viz?** For a lesson node that just shows "plot sin(x)" — do we need Elucim's full animation system, or is Mafs enough?

5. **Coverage gaps:** What STEM domains are NOT covered by any of these tools? (e.g., circuit diagrams, chemical structures, music theory, flowcharts)

---

### Output Format

Return your recommendation as:

```markdown
# Recommended Tool Stack

## The Pick: [N] tools
1. **[Tool]** — [one-line role]
2. **[Tool]** — [one-line role]
3. **[Tool]** — [one-line role]
[...]

## Why These [N] And Not Others
[For each rejected tool, one sentence on why]

## Domain Coverage Matrix
| Domain | Tool | Coverage |
|--------|------|----------|
| 2D function plotting | ... | ... |
| 3D surfaces | ... | ... |
| Linear algebra | ... | ... |
| Calculus animations | ... | ... |
| [etc.] | | |

## Integration Plan
[How these tools fit together in the app]

## Credits
[Full attribution]
```
