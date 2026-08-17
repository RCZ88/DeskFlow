# RESULT.md — Reaction-Diffusion "Living Substrate" Specification

## 1. Surface-by-Surface Placement Decision
After evaluating the visual hierarchy, performance constraints, and metaphorical resonance, here is the definitive surface map:

*   **HERO SURFACE: CoreSample "Living Substrate" Backdrop (IMPLEMENT)**
    *   **Location:** Inside the `data-core-sample-stage` div, strictly behind the `RingCanvas` SVG.
    *   **Metaphor:** The tree rings (phases, memories, goals) are growing out of a living, breathing cellular medium. It acts as the "petri dish" of the user's life.
    *   **Visual:** Slow-moving, deep amber organic coral patterns. Low opacity (max 40%) so it acts as a glowing substrate rather than an opaque background, preserving the legibility of the data-viz rings.
*   **AMBIENT SURFACE: Full-Page Background (SKIP)**
    *   **Decision:** Do *not* add a full-page WebGL RD simulation.
    *   **Reasoning:** A full-screen RD simulation is GPU-intensive and visually noisy. It would compete with the existing `AppBackground` DOM particles (which sit at `z-[0]`) and distract from the actual content. The existing `AppBackground` already provides sufficient ambient motion.
*   **REJECTED SURFACES: PhaseCards & RiverMap**
    *   **PhaseCards:** Applying organic textures to glass cards creates visual noise and incurs a massive performance penalty (multiple WebGL contexts).
    *   **RiverMap/Timeline:** These are structural data-viz elements. An organic background would muddy their readability.

## 2. Rendering Architecture
*   **Library:** `@react-three/fiber` (R3F). Already proven in `ContextGraphView.tsx`.
*   **Component:** `<LivingSubstrate />` (New).
*   **Mechanics (Ping-Pong Buffer):**
    *   Two `THREE.WebGLRenderTarget` instances (`FloatType`, `NearestFilter`), sized **256x256**.
    *   **Simulation Pass:** A custom `ShaderMaterial` (`simulationFrag.glsl`) runs the Gray-Scott equation. We will run **2 passes per frame** to ensure smooth growth without exploding the simulation.
    *   **Display Pass:** A second custom `ShaderMaterial` (`displayFrag.glsl`) reads the final B-chemical texture and maps it to our amber palette, rendering it to the screen via an orthographic quad.
*   **Resolution Strategy:** Simulating at 256x256 and upscaling via CSS to 460px provides a natural, organic softness (acting like a cheap blur) while keeping GPU cost negligible (~2MB VRAM).

## 3. Palette Mapping (App Tokens)
We will strip the complex `renderingStyle` branches from `displayFrag.glsl` and hardcode a premultiplied-alpha amber ramp. This ensures the simulation acts as a *glow* that blends cleanly with the `bg-zinc-900/30` card background.

*   `B = 0.0` → `#09090b` (bg-primary), Alpha `0.0`
*   `B = 0.5` → `#b45309` (amber-700), Alpha `0.15`
*   `B = 1.0` → `#fbbf24` (warning/amber), Alpha `0.40`

## 4. Performance Budget & Accessibility
*   **Internal Buffer:** Capped at 256x256 (or 384x384 on high-DPI screens via `dpr` scaling).
*   **Sim Passes:** 2 per display frame.
*   **Visibility API:** The simulation loop **must pause** when `document.hidden === true` to save battery/CPU when the tab is inactive.
*   **Reduced Motion:** If `prefers-reduced-motion` is true, the R3F canvas unmounts entirely, falling back to the existing static `radial-gradient` amber glow in `CoreSample.tsx`.
*   **Context Loss:** Wrapped in a standard React Error Boundary. If WebGL fails, it fails silently and reveals the existing CSS fallback.

## 5. Integration Points & File Plan

### File 1: `src/shaders/rd-simulation.glsl` (NEW)
*   **Action:** Create file.
*   **Content:** Simplified version of the provided `simulationFrag.glsl`. Strip out `mousePosition`, `brushRadius`, and `styleMap*` uniforms/logic. Keep the 5-point Laplacian (`setWeights(2)`) and the core `A/B` update math.

### File 2: `src/shaders/rd-display.glsl` (NEW)
*   **Action:** Create file.
*   **Content:** Simplified version of `displayFrag.glsl`. Remove all `renderingStyle` conditionals. Hardcode the amber-alpha `smoothstep` mapping defined in Section 3. Output premultiplied alpha (`vec4(color * alpha, alpha)`).

### File 3: `src/components/life-river/LivingSubstrate.tsx` (NEW)
*   **Action:** Create the R3F component.
*   **Architecture:**
    *   Mounts `<Canvas orthographic gl={{ alpha: true, antialias: false }}>`.
    *   Uses `useMemo` to initialize the two `WebGLRenderTarget` instances and the `SimulationMaterial` / `DisplayMaterial`.
    *   Uses `useFrame` to execute the ping-pong swap and render passes.
    *   Seeds the initial B-chemical texture with a few random circular gradients to kickstart the "coral" growth pattern.
    *   Hardcodes Gray-Scott "coral" preset uniforms: `f = 0.0545`, `k = 0.062`, `dA = 1.0`, `dB = 0.5`.

### File 4: `src/components/life-river/CoreSample.tsx` (MODIFY)
*   **Action:** Insert `<LivingSubstrate />` into the stage.
*   **Exact Hook (Lines ~84-88):**
    ```tsx
    <div data-core-sample-stage className="relative h-72 w-72 sm:h-[420px] sm:w-[420px] lg:h-[460px] lg:w-[460px]">
      {/* NEW: Living Substrate sits at z-0 */}
      <LivingSubstrate />

      {/* EXISTING: RingCanvas bumped to z-10 */}
      <div className="relative z-10 h-full w-full">
        <RingCanvas ... />
      </div>
    </div>
    ```

## 6. Empty / Loading / Error States
*   **Loading:** Instant. No external textures to fetch; the initial chemical state is generated procedurally in JS on mount.
*   **Error / Fallback:** The `CoreSample` already contains a beautiful `radial-gradient` amber glow (`opacity-40`, `absolute inset-0`). If `<LivingSubstrate />` throws a WebGL error or is disabled via `prefers-reduced-motion`, it simply renders `null`, and the existing CSS gradient remains perfectly visible as a graceful degradation.

---
### Backend Audit
*   **Missing IPC/Services:** None.
*   **DB Changes:** None.
*   **Dependencies:** All required (`three`, `@react-three/fiber`) are already installed.

***

**Status:** Ready for implementation. Please proceed with the build gates and runtime verification per the Post-Result Workflow.