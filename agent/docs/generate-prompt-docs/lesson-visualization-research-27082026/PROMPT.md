# PROMPT.md — Lesson Visualization Tool Research

> **Prompt Type:** Research
> **Target AI:** Claude / GPT-4 / Gemini (any capable research model)
> **Output Format:** Structured inventory with credits

---

## System Prompt

You are a research analyst specializing in educational technology and mathematical visualization tools. Your job is to conduct a comprehensive inventory of tools, libraries, and frameworks that can generate animated math/STEM visualizations for use as lesson assets in a desktop learning application.

You must be thorough, precise, and cite sources. Every tool you recommend must include: name, license, language, npm/pip package name, GitHub URL, capabilities, limitations, and whether it can render in a browser.

---

## User Prompt

### Context

I'm building a desktop learning application (Electron + React + TypeScript) that generates lesson nodes on user-chosen topics. I want to add **animated math/STEM visualizations** as lesson assets — interactive, browser-rendered animations that teach concepts visually (think 3Blue1Brown-style but running inside the app).

### Already In The Project (Do NOT re-list these)

The following tools are already installed and in use. Acknowledge them but do NOT present them as new discoveries:

- **D3.js** — data visualizations, charts
- **Three.js** (@react-three/fiber, @react-three/drei) — 3D scenes
- **Framer Motion** — UI animations
- **KaTeX** — LaTeX math rendering
- **Excalidraw** — virtual whiteboard (known, not heavily used)
- **tldraw** — infinite canvas SDK (known, not heavily used)
- **react-chartjs-2** — charting
- **lightweight-charts** — financial charts
- **mermaid** — diagram rendering
- **vega-lite** — statistical visualizations

### What I Need You To Find

Research and document **tools that are NOT already in the project**. Specifically:

1. **Math animation engines** — libraries that generate animated math visualizations programmatically (like 3Blue1Brown but code-driven)
2. **Interactive math visualization libraries** — React or browser-native tools for plotting functions, vectors, matrices, calculus concepts with animation
3. **AI-generated animation pipelines** — tools where LLMs can generate math animations from natural language (research papers, open-source projects)
4. **Browser-native alternatives to Manim** — tools that output interactive web content instead of video files
5. **3D math visualization** — tools for 3D surfaces, vector fields, parametric curves, geometric transformations
6. **Educational animation frameworks** — purpose-built for teaching STEM concepts visually

### For Each Tool, Document

| Field | Required |
|-------|----------|
| Name | ✅ |
| What it does (1-2 sentences) | ✅ |
| License | ✅ |
| Language / Framework | ✅ |
| Package name (npm/pip) | ✅ |
| GitHub URL | ✅ |
| Website / Docs | ✅ |
| Key capabilities (bullet list) | ✅ |
| Limitations for our use case | ✅ |
| Can it render in browser? | ✅ |
| Does it have math primitives? | ✅ |
| Is it AI/LLM-friendly (programmatic API)? | ✅ |
| Actively maintained? | ✅ |
| Credits (original author, source) | ✅ |

### Evaluation Criteria

A tool is relevant if it:
- Can render in a browser (Electron app — not server-rendered video only)
- Has math primitives (Axes, FunctionPlot, Vector, Matrix, LaTeX, etc.)
- Supports animation/timeline/step-through
- Can be driven by AI/LLM output (programmatic API, not just GUI)
- Is actively maintained
- Has MIT or compatible license

A tool is NOT relevant if it:
- Is a general animation library (GSAP, Anime.js) — not math-focused
- Is a general charting library (Chart.js, Plotly) — already covered
- Requires Python runtime in production — must work in browser/Electron
- Outputs only video files with no interactivity
- Is abandoned or unmaintained

### Research Strategy

1. Search GitHub for repos matching: "math animation", "math visualization", "manim alternative", "interactive math", "3blue1brown style", "educational animation", "STEM visualization"
2. Search npm for packages matching: "math animation", "function plot", "vector field", "math visualization"
3. Search arxiv for papers on: "LLM manim", "AI math animation", "automated STEM visualization"
4. Check awesome-lists: awesome-manim, awesome-math, awesome-education
5. Check the Manim ecosystem: plugins, extensions, alternative frontends
6. Look for React-specific math visualization libraries
7. Check if any tools offer JSON/YAML DSL for AI-generated scenes

### Output Format

Return your findings as a structured markdown document with this structure:

```markdown
# Math/STEM Visualization Tools — Research Inventory

## Executive Summary
[2-3 paragraph overview of the landscape]

## Tier 1: Best Fits (Browser-native, React-compatible, Math-focused)
[Tools that directly meet all criteria]

## Tier 2: Strong Candidates (Need adaptation)
[Tools that are close but need work]

## Tier 3: Reference/Inspiration (Not directly usable but informative)
[Tools worth studying for patterns]

## AI Animation Pipelines (Research Papers)
[Academic work on LLM + math animation]

## Comparison Table
[All tools side-by-side]

## Credits
[Full attribution for every tool]
```

### Important

- Do NOT list D3.js, Three.js, Framer Motion, KaTeX, Excalidraw, tldraw, Chart.js, or any tool already in the project as a "discovery"
- DO credit them in a "Previously Known" section
- Focus on what's NEW and ACTIONABLE
- Include the npm install command for each browser-native tool
- Include GitHub stars count if available
- Note if the tool has AI/LLM integration or code generation support
