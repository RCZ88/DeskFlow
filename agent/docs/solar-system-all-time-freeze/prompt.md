# Design Prompt: Solar System "All Time" Freeze + 5GB RAM Leak

## Raw Request

> "the solar system still freezes when switching to all."
> "i can see on the task manager that it is using 5gb of ram."

---

## Context

Read `agent/docs/solar-system-all-time-freeze/CONTEXT_BUNDLE.md` first. It contains the complete codebase context: all file paths, line numbers, data shapes, IPC endpoints, and architecture notes. This document is your source of truth for the code structure.

### Problem Summary

When switching the OrbitSystem period selector to "All Time":
1. **RAM spikes to 5GB+** within a few period switches (confirmed via Task Manager)
2. **UI freezes** for hundreds of ms to multiple seconds
3. Works fine for Today/Week/Month periods

### Root Cause Already Diagnosed

**Primary: THREE.CanvasTexture memory leak.** `TexturedPlanet` creates THREE.CanvasTexture objects at **1024×512 resolution (2MB each)** in `useMemo` and **never disposes them on unmount**. 80 planets × 3 textures = ~328MB leaked per period switch. After ~16 switches → 5GB+.

**Secondary: Synchronous canvas drawing blocks Render Thread.** Creating 240 canvas textures (80 planets × 3) at 1024×512 requires ~500ms of synchronous canvas API calls on the renderer's main thread.

**Tertiary: Main process synchronous SQL.** `get-dashboard-aggregates` IPC handler runs synchronous better-sqlite3 queries over the full `stats_daily` table with no caching for "all" time (date range 2000-01-01 to present).

---

## The Mandate

Design a comprehensive solution that eliminates the freeze AND the memory leak. You are the Lead Designer and Engineer — own the complete solution from data loading to 3D rendering.

### Task A: Fix the THREE.CanvasTexture Memory Leak

The primary cause of 5GB RAM. `TexturedPlanet` creates textures in `useMemo` with no disposal. You must ensure every THREE.CanvasTexture, BufferGeometry, and Material is properly disposed when:
- The component unmounts (period switch)
- The useMemo recomputes (deps change)

**Reference:** `useLODGeometry` at OrbitSystem.tsx:1755-1771 shows the CORRECT disposal pattern (disposer ref + cleanup effect).

### Task B: Eliminate the Render-Thread Freeze

Synchronous canvas drawing for 240 textures (80 planets × 3 textures at 1024×512) blocks React's commit phase. Options to consider:
- Reduce texture resolution (1024×512 → 512×256 or lower)
- Share textures across planets with same color/category
- Offload texture generation to a Worker
- Use lazy texture creation (only when planet is close to camera)
- Use offscreen canvas with transferToImageBitmap

### Task C: Reduce Main-Process Data Load for "All" Time

The `get-dashboard-aggregates` IPC handler loads ALL `stats_daily` rows for "all" time. Options:
- Add caching for "all" time results (TTL or dirty-flag based)
- Optimize SQL queries with better covering indexes
- Pre-aggregate "all" time data on a schedule
- Add LIMIT/OFFSET for progressive loading
- Move heatmap computation to renderer to reduce main-process blocking

### Task D: Audit the Full Component Lifecycle

Check every component in OrbitSystem.tsx for missing `dispose()` calls. Specifically:
- `Moon` component (line 1774)
- `PlanetRings` component
- `AtmosphericScattering` component
- `OrbitTrail` component
- Any other component that creates THREE.js objects (Geometry, Texture, Material, RenderTarget)

---

## Constraints

1. Build command: `node scripts/build.mjs` + `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
2. Do NOT remove existing UI elements, buttons, or features
3. Prefer renderer-side fixes over main-process changes when possible
4. All `localStorage` access must be wrapped in `try/catch`
5. The 80-planet cap (`MAX_RENDERED_PLANETS`) and 30s minimum threshold (`MIN_PLANET_TIME_SECONDS`) are already applied — do not reduce them further without justification
6. Do NOT change the orbit physics calculations, planet appearance, or category color mapping — these are user-facing design decisions

---

## Output Format

Provide the solution as a structured engineering brief with:

1. **Phase 1: Fix the Memory Leak** — Exact code changes for TexturedPlanet's `useEffect` cleanup, disposal patterns for texture/hologramGeo, and any shared texture caching strategy.
2. **Phase 2: Eliminate the Freeze** — Texture resolution reduction, lazy creation, offloading strategy, or other approach to keep React commit phase under 16ms.
3. **Phase 3: Optimize "All" Time Data Loading** — Caching strategy, SQL optimization, or progressive loading for the main-process IPC handler.
4. **Phase 4: Lifecycle Audit** — Check and fix all remaining THREE.js disposal gaps in OrbitSystem.tsx.
5. **Implementation Plan** — File-by-file list of exact edits with line numbers, in dependency order.

For each code change, specify:
- **File path** and **line number** (from the existing codebase)
- **What to remove** (exact old string)
- **What to insert** (exact new string)
- **Why** (one sentence)

---

## Edge Cases to Handle

- What if `data` props change while the component is mounted? (useMemo recomputes but old textures leak)
- What if the Canvas remounts (full scene teardown)?
- What if there are 0 planets (empty state animation)?
- What if texture creation fails (canvas context null)?
- What if the user rapidly clicks between periods (multiple concurrent IPC requests)?
- What about the glow texture canvas element — is it garbage collected properly?
