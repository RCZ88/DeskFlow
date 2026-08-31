# Lesson Asset Visualization & Animation Tools — Research Inventory

> **Date:** 2026-08-27
> **Purpose:** NEW tools (not already in project) for animated math/STEM lesson assets
> **Status:** Research complete — selection prompt ready
> **Prompt packages:** `agent/docs/generate-prompt-docs/lesson-visualization-research-27082026/`

---

## NEW Discoveries (Not Already In Project)

### Tier 1: Best Fits (Browser-native, React-compatible, Math-focused)

| # | Tool | Package | What It Does | Browser | Math | AI | License |
|---|------|---------|-------------|:-------:|:----:|:--:|:-------:|
| 1 | **Elucim** | `@elucim/core` + `@elucim/dsl` | React-native animated math visualizations with AI-friendly JSON/YAML DSL | ✅ | ✅ Full | ✅ DSL | MIT |
| 2 | **Mafs** | `mafs` | Lightweight React math components — function plots, vector fields, interactive points | ✅ | ✅ Full | ❌ | MIT |
| 3 | **Vivid** | `vivid-animations` | TypeScript math animation — Manim-inspired but web-first | ✅ | ✅ Full | ✅ | Check |

### Tier 2: Strong Candidates (Need adaptation)

| # | Tool | Package | What It Does | Browser | Math | AI | License |
|---|------|---------|-------------|:-------:|:----:|:--:|:-------:|
| 4 | **Manim** | `manim` (pip) | Gold standard math animation engine (3Blue1Brown) — Python, outputs video | ❌ Video | ✅ Full | ✅ | MIT |
| 5 | **3brown1blue** | `3brown1blue` (pip) | AI skill for generating Manim videos — encodes 3B1B visual patterns | ❌ Video | ✅ Full | ✅ IS AI | Check |
| 6 | **Motion Canvas** | `@motion-canvas/core` | TypeScript procedural animation with generator-based flow | ❌ Video | ❌ | ❌ | MIT |

### Tier 3: Reference/Niche

| # | Tool | Package | What It Does | Browser | Math | AI | License |
|---|------|---------|-------------|:-------:|:----:|:--:|:-------:|
| 7 | **canvas-math-kit** | `@sirhc77/canvas-math-kit` | Lightweight React vector/linear algebra visualizer | ✅ | ⚠️ Vectors only | ❌ | MIT |
| 8 | **ExcaliMath** | `@excalimath/core` | Excalidraw math plugin — KaTeX + Plotly graphs + 80 STEM shapes | ✅ | ✅ | ❌ | MIT |
| 9 | **open-calc** | (reference app) | Full STEM platform showing D3+Three.js+KaTeX+Pyodide architecture | ✅ | ✅ | ❌ | MIT |

---

## AI Animation Research Papers

| Paper | Year | Key Finding |
|-------|------|-------------|
| **LLM2Manim** (arxiv:2604.05266) | 2026-04 | LLM + Manim pipeline: 83% vs 78% post-test (p<.001), engagement d=0.94 |
| **3brown1blue** (github:AmitSubhash) | 2026-03 | Claude Code skill: 16 design principles, 12 crash patterns, 22 visual recipes from 422 frames |
| **ManimTrainer** (arxiv:2604.18364) | 2026-04 | SFT+GRPO training: 94% render success, 85.7% visual similarity (Qwen 3 Coder 30B) |

---

## Selection Prompt

See `PROMPT-SELECT.md` for the prompt that selects 3-5 tools from this list.

---

## Credits

- **Elucim:** Seth Juarez — github.com/sethjuarez/elucim — MIT
- **Mafs:** Steven Petryk — github.com/stevenpetryk/mafs — MIT
- **Vivid:** markm39 — github.com/markm39/vivid — Check repo
- **Manim:** Grant Sanderson (3Blue1Brown) + Manim Community — MIT
- **3brown1blue:** Amit Subhash — github.com/AmitSubhash/3brown1blue
- **Motion Canvas:** Jan Blahový + Canvas Commons fork — MIT
- **canvas-math-kit:** Chris Carrington — MIT
- **ExcaliMath:** DynoW — github.com/DynoW/excalimath — MIT
- **open-calc:** Hoshiharetsu / John-Swindell — MIT
