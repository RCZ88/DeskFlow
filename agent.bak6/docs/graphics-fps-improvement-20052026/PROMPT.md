# Graphics + FPS Chart Improvement Prompt

## Raw Request

> "I would also like an improvement on the graphics and the chart for the fps. so not only a fps counter, but also the line graph that shows the trend. i would like the ability to improve the graphics and make it look better."

---

## Problem Statement

The current FPS display is just a simple counter ("-- FPS") and frame time. User wants:
1. A line graph showing FPS trend over time (history, not just current value)
2. Improved graphics quality/visuals for the 3D space scene

---

## Engineering Task

Design the **Data Processing Pipeline** for FPS tracking:
- How to store FPS history (ring buffer? array?)
- How many data points to keep (60? 120? 300?)
- How often to sample (every frame? every 100ms? every second?)
- How to smooth the line graph data (moving average? exponential smoothing?)
- Performance impact considerations for tracking history in a 3D canvas

---

## Design Task

Provide **High-Fidelity Visual Specs** for:

### FPS Line Graph
- Chart type (line chart? area chart? sparkline?)
- Dimensions (width, height in pixels)
- Colors (line color, fill color, grid lines, axis labels)
- Labels and annotations
- Animation of data streaming in
- Y-axis range (0-60? 0-144? Dynamic?)

### Graphics Improvement
- Current: What does the 3D scene look like now?
- Proposed: What specific improvements (lighting? textures? effects? post-processing?)
- Be specific: exact THREE.js properties, values, techniques
- Before/after descriptions

---

## UX Task

Specify the **Interaction Flow**:
- Where is the FPS panel located?
- What happens when user expands/collapses it?
- How does the line graph behave (scrolling? static window?)
- Are there hover tooltips on graph data points?

---

## Constraints

- Must work within existing OrbitSystem.tsx (don't restructure entire app)
- Must use @react-three/drei and @react-three/fiber
- Performance monitoring must not impact FPS negatively
- Keep within the existing glass/rounded UI theme

---

## Output

Produce a detailed SPEC.md with:
1. Technical implementation details (data structures, functions to add)
2. Visual specifications (colors, sizes, layout)
3. Code snippets where helpful
4. Any library additions needed