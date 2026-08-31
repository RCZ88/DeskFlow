# CONTEXT_BUNDLE.md — Lesson Visualization Tool Research

## Raw Request (verbatim)

> "WHY IS HTE ONLY THING SAVED ONTHE DRAFT IS HTE LESSON TOPIC ITSELF?? WHY IS NT HE KNOWLEDGE PRIO TO THOSE AND LIKE ALL TEH SLEECTION SAVED ASWELL??"
>
> [After clarification]: "the prompt is supposed to be the ones that found those stuff, ur task is to create the prompt, and credit the existing stuff"

The user wants a research prompt that discovers NEW math/STEM visualization and animation tools for generating lesson assets in the Lyceum Learn OS. The existing tools must be credited so the external AI focuses on finding what's NOT already known.

---

## What This Project Is

**DeskFlow (RHEO)** — an Electron + React + better-sqlite3 desktop productivity tracker with a built-in learning system called **Lyceum Learn**. The Learn system generates lesson nodes from user topics, with markdown content, quizzes, and tutor panels.

**Goal:** Add animated math/STEM visualizations as lesson assets — interactive, browser-rendered animations that teach concepts visually (think 3Blue1Brown-style but inside the app).

---

## Tools Already In The Project (CREDIT THESE, DON'T RE-FIND)

The following are already installed/used. The external AI must NOT list these as "new discoveries" — they should be acknowledged as existing infrastructure:

| Tool | Where Used | What It Does |
|------|-----------|--------------|
| **D3.js** | Data visualizations, charts | Low-level data-driven DOM manipulation |
| **Three.js** (@react-three/fiber, @react-three/drei) | 3D scenes, LivingSubstrate, architecture map | WebGL 3D graphics |
| **Framer Motion** | UI animations, transitions | React animation library |
| **Excalidraw** | (known, not heavily used) | Virtual whiteboard |
| **tldraw** | (known, not heavily used) | Infinite canvas SDK |
| **Lucide React** | Icons throughout | Icon library |
| **KaTeX** | Math rendering in lessons | LaTeX math typesetting |
| **react-chartjs-2** | Dashboard charts | Chart.js React wrapper |
| **lightweight-charts** | Financial charts | TradingView charting |
| **mermaid** | Diagram rendering | Diagram-from-text |
| **vega-lite** | Statistical visualizations | Grammar of graphics |

---

## What The External AI Must Find (NEW STUFF)

Tools that are NOT already in the project. Specifically:

1. **Math animation engines** — libraries that generate animated math visualizations (like 3Blue1Brown videos but programmatic)
2. **Interactive math visualization libraries** — React/browser-native tools for plotting functions, showing vectors, matrices, graphs, calculus concepts
3. **AI-generated animation pipelines** — tools where LLMs can generate math animations from natural language descriptions
4. **Educational animation frameworks** — purpose-built for teaching STEM concepts visually
5. **Browser-native alternatives to Manim** — tools that output interactive web content instead of video files
6. **LaTeX + animation combos** — tools that animate mathematical notation
7. **3D math visualization** — tools for showing 3D surfaces, vector fields, parametric curves
8. **Data-driven animation** — tools that animate data transformations, algorithm step-throughs

### What Makes A Tool Relevant
- Can render in a browser (Electron app — not server-rendered video only)
- Has math primitives (Axes, FunctionPlot, Vector, Matrix, LaTeX)
- Supports animation/timeline/step-through
- Can be driven by AI/LLM output (programmatic API, not just GUI)
- Is actively maintained (not abandoned)
- Has MIT or compatible license

### What Does NOT Count
- General animation libraries (GSAP, Anime.js, Popmotion) — these are UI animation, not math visualization
- General charting libraries (Chart.js, Plotly, Highcharts) — already covered by existing tools
- General 3D engines (Babylon.js, PlayCanvas) — too general, not math-focused
- Video editing tools (FFmpeg, Remotion) — output video, not interactive browser content
- Tools that require Python/server runtime — must work in browser/Electron

---

## Technical Context

- **Runtime:** Electron (Chromium) — browser-native tools work directly
- **Framework:** React 18+ with TypeScript
- **Build:** Vite
- **Math rendering:** KaTeX already installed
- **3D:** Three.js via @react-three/fiber already installed
- **Package manager:** npm
- **No Python runtime in production** — Python tools (like Manim) would need to generate assets server-side or via AI, not run in the renderer

---

## Existing Lesson System Architecture

Lessons are stored as LDOC (Lesson Document) nodes in SQLite. Each node has:
- `content_md` — markdown content
- `visuals` — JSON array of visual asset references (currently unused)
- `block_type` — content block type

The visualization tool would be integrated as a new block type or visual asset type that renders inside lesson nodes.
