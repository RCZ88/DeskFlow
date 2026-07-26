# Prompt: AI Usage City Visualization

> **Type:** Design  
> **Target:** Claude (or equivalent AI coding agent)  
> **Detail level:** 8/10  
> **Creativity:** 25/100  
> **Format:** markdown  

---

## Context

You are building a **city/skyscraper 3D visualization** for AI coding agent tool usage data inside an Electron + React + TypeScript desktop app (DeskFlow). The metaphor: a modern city where each building represents an AI tool/agent, building height encodes tokens consumed, building size/width encodes cost, and building colors distinguish different AI agents or tool categories. Switching between "cities" (view modes) shows different statistical slices — by agent, by project, by model, by time period, by session category.

The target page is the **IDE Projects page → AI Tools subtab** (`src/pages/IDEProjectsPage.tsx`, route `/ide`, tab key `ai`). This page already renders standard 2D charts (Chart.js bar charts, doughnuts, sparklines) for AI usage data. The city visualization should **replace or augment** the existing chart section with an interactive 3D canvas.

The full context bundle of all available data sources, table schemas, IPC endpoints, and existing UI is at `agent/docs/ai-usage-city-viz/CONTEXT_BUNDLE.md`.

### Original Request (verbatim)

> "Create a prompt for another AI to generate creative visualization ideas for AI coding agent tool usage data (tokens, problems, requests, decisions, messages). The metaphor is a modern city/skyscraper visualization: building height = tokens, building size = cost, colors = agents/tools, switching between 'cities' shows different statistics. The prompt should give the target AI full context of available data and ask it to: (a) filter what data is usable, (b) propose visualization ideas, (c) suggest implementation approaches."

---

## Requirements

### Data Processing Pipeline

1. **Data ingestion:** Consume `get-ide-projects-overview` response. Extract the `aiUsage.byTool` map. Each key (tool name) becomes a "building" in the city. Extract per-tool: `tokens` (height), `cost` (width/scale), `messageCount`, `sessions`, `models`, `daily` time series, `modelBreakdown`, `projects`.

2. **City view modes (switching between "cities"):**
   - **By Agent:** One building per AI tool/agent. Height = total tokens, width = total cost, color = agent color. Sub-buildings or stacks for model breakdown.
   - **By Project:** One district per project, buildings within = tools used in that project. Height = project-level tokens.
   - **By Model:** Buildings grouped by ML model family (claude-sonnet-4, gpt-4o, etc.). Height = model tokens.
   - **By Time Period:** A time-lapse city where buildings grow/change as you scrub through days/weeks. Each frame = one day's snapshot.
   - **By Session Category:** Buildings colored by session category (bug-fix, feature, research, etc.) with height = total tokens in that category.
   - **By Day-of-Week:** Seven-borough city where each borough = one day of week, buildings show tool usage for that weekday.

3. **Aggregation rules:**
   - Null/zero values produce flat terrain (no building), not errors.
   - Building dimensions must be scalable across 3+ orders of magnitude (tokens range 0–100M). Use logarithmic or sqrt scaling for heights/widths, with tooltip showing raw values.
   - Cache the processed city data so view-mode switches are instant after first compute.

### Design Specifications (High-Fidelity Visual)

1. **City layout:**
   - Grid-based or organic city-block layout. Buildings should not overlap, should have consistent spacing, and should form a recognizable skyline.
   - Taller buildings should be clustered toward the center (downtown), shorter ones toward the edges (suburbs), mimicking real city density patterns.
   - Ground plane with subtle grid or road texture. Roads between building blocks optionally showing flow/connections.

2. **Building geometry:**
   - Each building = cuboid (BoxGeometry) with optional stepped tiers for model breakdown inside a tool.
   - Height mapped to token count (scaled). Width/depth mapped to cost (scaled). Color mapped to agent/tool identity.
   - Roof accents or glowing tops for "active" tools (used within last 24h).
   - Windows/panel textures on building faces optionally showing relative message count.

3. **Lighting and atmosphere:**
   - Time-of-day lighting: dusk/twilight palette (warm oranges + deep blues) by default, matching the app's dark theme.
   - Building emissive glow proportional to token activity.
   - Ground reflection (subtle) for polished look.
   - Optional: particle system for "data traffic" between buildings.

4. **Interactions:**
   - Orbit controls: drag to rotate, scroll to zoom, right-drag to pan.
   - Click a building → tooltip/info panel with: tool name, total tokens (raw + scaled), total cost, models used, last used date, session count.
   - Hover: highlight building, show name label floating above.
   - View-mode switcher: row of pill buttons at top of visualization area (By Agent, By Project, By Model, By Time, By Category, By Weekday).

5. **UI chrome:**
   - The visualization lives in a `.glass` card (the app's glass-morphism container style: `bg-zinc-900/75 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-4`).
   - Top bar inside the card: title "AI City", view-mode pills, reset-camera button.
   - Bottom bar: legend showing which color maps to which agent/tool, with colored dots.
   - Smooth transitions when switching modes (camera flies to new vantage, buildings animate grow/shrink).

### User Experience / Interaction Flow

1. User navigates to IDE page → AI Tools tab → sees the city visualization as the primary chart.
2. Default view: By Agent, showing all detected AI tools as buildings in the city.
3. User can rotate/zoom/pan freely to explore.
4. User clicks a pill button to switch to By Project view: camera smoothly animates to a 45-degree overhead angle, buildings smoothly morph/regroup into project-based districts.
5. User clicks a building → a detail panel slides in from the right (or a modal opens) showing that tool's detailed stats.
6. User scrubs a time slider → buildings animate their height and color in sync with daily data (time-lapse mode).
7. All interactions feel fluid (60fps). Loading states show a skeleton city outline with pulsing wireframe buildings.

### Constraints

1. **Performance:** This runs in Electron + React. Three.js scene must not drop below 30fps. For >50 buildings, use instanced mesh rendering.
2. **Library choices:** Use `@react-three/fiber` (R3F) + `@react-three/drei` for the 3D scene. These are already in the project. Do NOT add heavy new dependencies.
3. **State management:** Use React state + refs (no Zustand/Redux for city state). City data should be a computed derived value from the IPC response.
4. **No component structure prescription:** Do NOT dictate specific React component names or file organization. Propose the approach and let the implementer decide the exact architecture.
5. **Responsive:** The visualization area should fill its container at any viewport size, with min-height 400px.
6. **No multiple options:** Propose ONE concrete design and implementation approach, not a menu of choices.
7. **Accessibility:** City visualization should have a `role="img"` with `aria-label` describing what it shows. Interactive buildings should have keyboard focus support.
8. **Error handling:** If no AI usage data exists, show a flat plane with "No data yet — sync AI agents to build your city" message.
9. **Separation:** Visualization component should be a separate file in `src/pages/` or `src/components/` — not inlined into IDEProjectsPage.tsx.

### Output Format

Respond with a structured plan containing exactly these sections:

1. **Data Assessment** — Which data fields from the context bundle you recommend using and why (be specific about table columns and IPC response paths).
2. **Visualization Design** — The single visualization approach you propose, describing: layout algorithm, building encoding scheme, color mapping, lighting model, interaction model, and view-mode semantics.
3. **Implementation Approach** — Step-by-step technical plan covering: component structure, data processing pipeline (ingestion → transform → city layout → render), Three.js scene setup, interaction wiring, performance strategy, and integration with the existing IDEProjectsPage.
4. **Edge Cases & States** — Loading, empty, error, single-building, transition, and time-lapse states with specific behavior for each.
5. **Implementation Effort Estimate** — Rough estimate of lines of code and complexity, broken into phases (can be done incrementally).
