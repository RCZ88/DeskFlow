# Motion & Visualization Library Inventory

> Auto-generated inventory of all animation, motion, video, and visualization
> libraries installed in this project — what they are, where they're used, and
> what they're good for.

---

## 1. Animation / Motion (DOM)

| Package | Version | Files Using It | Purpose |
|---------|---------|---------------|---------|
| **framer-motion** | 12.42.2 | ~100+ | Primary animation library. `AnimatePresence`, `useScroll`, `useTransform`, `useMotionTemplate`, `useMotionValue`, `useSpring`, `useReducedMotion`. Page transitions, card animations, hover effects, layout animations, staggered reveals. Imported via `'framer-motion'`. |
| **motion** | 12.42.2 | ~32 | Successor/rebrand of framer-motion. Same version installed side-by-side. Imported via `'motion/react'` (newer ESM entry point). Used in: dashboard components, UI primitives (magic-card, animated-grid-pattern, light-rays). |
| **canvas-confetti** | 1.9.4 | ~10 | Celebration particle effects. Used on: goal completion, focus session completion, daily survey, life page achievements, Gold page long-term goal hits. Files: `App.tsx`, `focusConfetti.ts`, `celebrate.ts`, `GoldPage.tsx`, `LifePage.tsx`, `GoalCard.tsx`, `GoalsCard.tsx`, `UnifiedGoalsCard.tsx`, `DailySurveyCard.tsx`, `ProfileTab.tsx`, `FocusPage.tsx`. |
| **@react-spring** | — | 0 (transitive) | Present in node_modules as transitive dep of `@use-gesture`. NOT directly imported by source. |

**Key hooks from framer-motion/motion:**
- `useScroll()` / `useTransform()` — scroll-linked animations
- `useMotionValue()` / `useSpring()` — reactive values with spring physics
- `useReducedMotion()` — accessibility check
- `AnimatePresence` — exit animations, page transitions
- `motion.div` — declarative animated elements

---

## 2. 3D / Graphics (Three.js Ecosystem)

| Package | Version | Files Using It | Purpose |
|---------|---------|---------------|---------|
| **three** | 0.183.2 | 16 | Core 3D library. `THREE.*` namespace. Scenes, cameras, materials, geometries, textures, lights. |
| **@react-three/fiber** | 9.5.0 | 12 | React renderer for Three.js. `<Canvas>`, `useFrame`, `useThree`. |
| **@react-three/drei** | 10.7.7 | 8 | Three.js helpers. `OrbitControls`, `Stars`, `Html`, `Line`, `PerformanceMonitor`, `Billboard`, `Text`, `MeshReflectorMaterial`, `Environment`, `ContactShadows`. |
| **@react-three/postprocessing** | 3.0.4 | 3 | Post-processing effects. `EffectComposer`, `Bloom`, `ToneMapping`, `Vignette`, `SMAA`. |
| **postprocessing** | 6.39.0 | 1 | Underlying postprocessing lib. `ToneMappingMode`, `BlendFunction`. |
| **r3f-perf** | 7.2.3 | 0 | R3F performance monitor. Installed but NOT imported in source. |

**Where 3D is used in src/:**
- `OrbitSystem.tsx` — orbit visualization (cityscape + lights + post-fx)
- `CityScene.tsx`, `CityCars.tsx`, `InstancedSkyline.tsx`, `TronGround.tsx`, `SkyDome.tsx`, `Ground.tsx` — procedural cityscape
- `GraphScene.tsx`, `GraphNode.tsx`, `GraphEdge.tsx` — 3D knowledge graph
- `ContextGraph.tsx` — brain/context visualization
- `LivingSubstrate.tsx` — Gray-Scott reaction-diffusion ambient background
- `CodeArchitectureMap.tsx` — 3D architecture visualization
- `HeroOverlays.tsx` — hero section overlays

---

## 3. Data Visualization

| Package | Version | Files Using It | Purpose |
|---------|---------|---------------|---------|
| **chart.js** | 4.5.1 | ~20 | Core charting. Bar, Line, Pie, Doughnut, Radar. Across: Dashboard, Stats, Productivity, Browser, Insights, External, IDE/Projects, all finance charts. Theme in `lib/theme.ts`, `lib/chartTheme.ts`, `lib/chart-plugins.ts`. |
| **react-chartjs-2** | 5.3.1 | ~20 | React wrapper for Chart.js. `<Bar>`, `<Line>`, `<Pie>`, `<Doughnut>`, `<Radar>`. Same files as chart.js. |
| **recharts** | 3.10.1 | 3 | Alternative charting. `FileTypeChart.tsx` (BarChart), `CodeStatsTab.tsx` (PieChart), `MasteryTimelineBlock.tsx` (AreaChart with Brush). |
| **d3-force-3d** | 3.0.6 | 2 | 3D force-directed graph layout. `forceSimulation`, `forceManyBody`, `forceLink`, `forceCenter`, `forceCollide`. Used in: `context-graph/useForceSimulation.ts`, `context-brain/CanvasGraph.tsx`. |
| **cytoscape** | 3.34.0 | 1 | Graph/network visualization. `learn/blocks/KnowledgeGraphBlock.tsx`. Plugins: cytoscape-dagre, cytoscape-cose-bilkent, cytoscape-fcose. |
| **cytoscape-dagre** | 4.0.0 | 1 | Dagre layout for Cytoscape graphs. `KnowledgeGraphBlock.tsx`. |
| **mermaid** | 11.16.0 | 2 (lazy) | Diagram/flowchart rendering. `FlowBlock.tsx`, `MermaidBlock.tsx`. Singleton init with 15s render timeout. |
| **vega-embed** | 7.1.0 | 1 (lazy) | Vega visualization embed. `learn/blocks/ChartBlock.tsx` for Vega-Lite specs from lessons. |
| **tabulator-tables** | 6.5.2 | 1 (lazy) | Interactive data tables. `learn/blocks/TableBlock.tsx`. CSS-only themes. |
| **katex** | 0.17.0 | 1 | Math typesetting. `learn/blocks/ProseBlock.tsx` for LaTeX math in lessons. |
| **lightweight-charts** | 5.2.0 | 0 | TradingView financial charts. Installed but NOT imported in source. |
| **@elucim/core** | 0.24.0 | 0 | Interactive math primitives (Axes, FunctionPlot, Vector, Matrix, Graph, LaTeX). Installed but NOT imported. |
| **@elucim/dsl** | 0.24.0 | 0 | DSL for Elucim. Installed but NOT imported. |

**Chart type quick reference:**
- Bar/Line/Pie/Doughnut/Radar → chart.js + react-chartjs-2
- Area + Brush → recharts
- Network/graph → cytoscape
- Flowchart → mermaid
- Vega-Lite specs → vega-embed
- Tables → tabulator-tables
- Math → katex

---

## 4. Drawing / Canvas / Image Capture

| Package | Version | Files Using It | Purpose |
|---------|---------|---------------|---------|
| **html-to-image** | 1.11.13 | 3 | DOM → PNG screenshots. `SelectionOverlay.tsx` (selection-engine screenshot), `ShareCard.tsx` (insights sharing), `ReceiptGeneratorModal.tsx` (finance receipt export). |

**Not installed:** fabric.js, konva, p5.js, pixi.js, roughjs, excalidraw, tldraw, react-sketch-canvas.

---

## 5. Video / Media

| Tool | Type | Files Using It | Purpose |
|------|------|---------------|---------|
| **Manim** | External (Python) | 1 (`animation.service.ts`) | Mathematical animation engine. Probes `python -m manim`. Renders MP4 video assets for Lyceum Learn lessons. Generates poster frames via ffmpeg. |
| **ffmpeg** | External (system binary) | 2 (`animation.service.ts`, `FeatureStudioPage.tsx`) | Extracting poster frames from Manim-rendered MP4s. Video transcription feature checks. Not bundled. |
| **MediaRecorder** | Web API | 2 | `covenant/voiceJournal.ts` for voice recording. `lib/stt.ts` for speech-to-text audio capture. Format: `audio/webm;codecs=opus`. |
| **HTML5 Canvas + video** | Web API | 1 | `frameCaptureService.ts` in overlay-studio/vision. Captures video frames using hidden `<video>` + `<canvas>`. No ffmpeg needed. |
| **hls.js** | Transitive | 0 | HLS video streaming support. Transitive dep, no direct import. |

**Not installed:** remotion, recordrtc, react-media-recorder, video.js, plyr, react-player, react-youtube.

---

## 6. Scroll

| Package | Version | Files Using It | Purpose |
|---------|---------|---------------|---------|
| **lenis** | 1.2.3 / 1.3.26 | 0 (landing only) | Smooth scroll library. In `rheo-landing-v2/` and `rheo-landing/` sub-projects only. NOT in main app. |

**Not in main app:** locomotive-scroll, smooth-scroll, @studio-freight/lenis.

---

## 7. UI / Transition / Interaction

| Package | Version | Files Using It | Purpose |
|---------|---------|---------------|---------|
| **@dnd-kit/core** | 6.3.1 | 5 | Drag-and-drop. `DragEndEvent`, `useDroppable`. App.tsx (sidebar reorder), SettingsPage, MapEditor, TerminalMiniMap, GapFillModal. |
| **@dnd-kit/sortable** | 10.0.0 | 1 | Sortable containers for dnd-kit. App.tsx sidebar. |
| **@dnd-kit/utilities** | 3.2.2 | 3 | CSS transform helpers for drag positioning. App.tsx, SettingsPage, GapFillModal. |

---

## 8. Shaders / WebGL

### GLSL Files

| File | Purpose |
|------|---------|
| `src/shaders/rd-simulation.glsl` | Gray-Scott reaction-diffusion simulation fragment shader. Coral pattern growth. |
| `src/shaders/rd-display.glsl` | RD display/render shader. Maps sim values to color + alpha output. |
| `src/shaders/glsl.d.ts` | TypeScript declaration for `*.glsl?raw` imports. |

### Components with Custom Shaders

| Component | Shader Type | Purpose |
|-----------|------------|---------|
| `life-river/LivingSubstrate.tsx` | THREE.ShaderMaterial (sim + display) | Gray-Scott RD ambient background. Ping-pong WebGLRenderTargets (256×256, 384 high-DPI), 2 sim passes/frame, FloatType/NearestFilter. |
| `cityscape/v3/TronGround.tsx` | THREE.ShaderMaterial (inline) | Procedural Tron-style ground grid. |
| `cityscape/v3/SkyDome.tsx` | THREE.ShaderMaterial (inline) | Procedural sky dome. |
| `cityscape/v3/Ground.tsx` | THREE.ShaderMaterial (inline) | Ground reflection (drei MeshReflectorMaterial). |
| `warmth/context-graph/GraphNode.tsx` | shaderMaterial (inline JSX) | Node glow/pulse shader for 3D knowledge graph. |
| `warmth/context-graph/GraphEdge.tsx` | THREE.ShaderMaterial + shaderMaterial | Animated edge flow shader for graph connections. |

---

## 9. Landing Sub-Projects (separate apps)

### rheo-landing-v2/
| Package | Version | Purpose |
|---------|---------|---------|
| **gsap** | ^3.12.7 | GreenSock Animation Platform. Timeline-based animation. |
| **lenis** | ^1.2.3 | Smooth scroll. |

### rheo-landing/
| Package | Version | Purpose |
|---------|---------|---------|
| **gsap** | ^3.15.0 | GreenSock Animation Platform (newer). |
| **lenis** | ^1.3.26 | Smooth scroll. |
| **simplex-noise** | ^4.0.3 | Noise generation (procedural backgrounds). |

### landing-mvp-draft/
| Package | Version | Purpose |
|---------|---------|---------|
| **framer-motion** | ^12.23.2 | Animation library. |
| **embla-carousel-react** | ^8.6.0 | Carousel/slider. |
| **tailwindcss-animate** | ^1.0.7 | Tailwind animation utilities. |
| **recharts** | ^2.15.4 | Charts (older v2). |
| **sonner** | ^2.0.6 | Toast notifications with animation. |

---

## 10. Installed But Unused (dead weight)

| Package | Version | Notes |
|---------|---------|-------|
| **lightweight-charts** | 5.2.0 | TradingView financial charts. Zero imports in source. |
| **@elucim/core** | 0.24.0 | Interactive math primitives. Zero imports. |
| **@elucim/dsl** | 0.24.0 | DSL for Elucim. Zero imports. |
| **prismjs** | 1.30.0 | Syntax highlighting. Zero imports. |
| **simple-icons** | 13.21.0 | Brand icons. Zero imports. |
| **react-bits** | 1.0.5 | Cross-platform React interfaces. Zero imports. |
| **r3f-perf** | 7.2.3 | R3F performance monitor. Zero imports. |

---

## Summary

| Category | Active Packages | Best For |
|----------|----------------|----------|
| **DOM Animation** | framer-motion, motion, canvas-confetti | Page transitions, scroll-linked effects, hover states, celebrations |
| **3D Graphics** | three, @react-three/fiber, drei, postprocessing | 3D scenes, ambient backgrounds, graph visualization |
| **Data Viz** | chart.js, recharts, d3-force-3d, cytoscape, mermaid, vega-embed, katex | Charts, graphs, diagrams, math |
| **Drawing/Capture** | html-to-image | Screenshots, sharing cards |
| **Video/Media** | Manim (external), ffmpeg (external), MediaRecorder (Web API) | Math animation videos, voice recording, frame capture |
| **Scroll** | lenis (landing only) | Smooth scroll (not in main app) |
| **Shaders/WebGL** | Custom GLSL + THREE.ShaderMaterial | Reaction-diffusion, procedural textures, glow effects |
| **Drag & Drop** | @dnd-kit/* | Sidebar reorder, drag interactions |

### For video explanation / illustration overlays specifically:

- **framer-motion** — animated overlays, transition sequences, reveal animations
- **canvas-confetti** — particle burst effects for emphasis
- **three.js/r3f** — 3D animated scenes, procedural backgrounds, ambient motion
- **gsap** (landing projects) — timeline-based sequenced animations, scroll-triggered reveals
- **Manim** (external) — programmatic math video generation, step-by-step visual explanations
- **html-to-image** — frame capture for stills
- **MediaRecorder** — record any canvas/element to webm
- **Custom GLSL** — procedural animated backgrounds, reaction-diffusion overlays
