# PROMPT — Consult the Spec-Authoring AI: How Motion Libraries Should Feed Overlay Studio

> TARGET AI: the same architect-level AI that produced `agent/docs/cc_full_spec_fix.md`
> (the "DeskFlow Unified AI System / RHEO" master spec). This is a consultation to EXTEND
> that spec with a concrete motion-asset integration for Overlay Studio.
> CONTEXT OF TRUTH: `CONTEXT_BUNDLE.md` (same folder). The target AI has no codebase access — design only from the bundle.

---

## Raw Request (verbatim, from the user)

> refer to this and maybe there some that we can do abt it? [motion-lab/MOTION_LIBRARIES.md]
> generate a prompt to consult with the ai that gave you the first specification thing

(No rephrasing. The user wants a consultation prompt for the spec-authoring AI, grounded in the
motion-library inventory, about what can actually be done to wire those libraries into Overlay Studio.)

---

## Context

The project (RHEO / DeskFlow) already has:
1. A large, real inventory of animation/motion/3D/canvas libraries active in the main app
   (`framer-motion`, `motion`, `three` + `@react-three/fiber` + `drei` + `postprocessing`, custom GLSL,
   `canvas-confetti`, `html-to-image`) — see `CONTEXT_BUNDLE.md` §1.
2. A set of standalone "motion-lab" HTML primitives (`01-field` … `06-console`) that are recorded to
   `.webm` via a Playwright script (`scripts/record-lab.mjs`) — see `CONTEXT_BUNDLE.md` §2.
3. An Overlay Studio whose **Visualizer** stage currently renders overlays as plain `framer-motion`
   `<div>`s inside a 270×480 phone-frame, with NO real compositing surface and NO motion-asset layer
   — see `CONTEXT_BUNDLE.md` §3.3.
4. A **data handoff** already wired (Content Engine Assemble → Overlay Studio via `handoffBus`
   `LINK_EPISODE`) that lands `cutList`, `overlayPlan`, `captionTrack` on a `StudioSession`.

The gap: those motion libraries / motion-lab primitives are NOT connected to Overlay Studio. The user
wants to know what we can do about it — i.e. design how motion libraries and motion-lab primitives become
real, burnable *explanation / illustration* overlay assets in the Visualizer and Export stages.

---

## The Mandate

Act as Lead Designer + Engineer for the RHEO spec. Design a **complete, concrete** integration that lets
Overlay Studio consume the existing motion libraries AND the motion-lab primitives as parameterized,
renderable overlay assets. Do NOT present options A/B/C — deliver ONE well-reasoned design. The design
must cover all three layers below.

### Requirement Checklist

**A. Data Processing / Pipeline**
1. Define the `StudioSession` extension: a new optional `motionAssets: MotionAsset[]` field
   (bundle §3.1 has the current type — add to it). Specify `MotionAsset` shape:
   `{ id, kind: 'primitive' | 'scene' | 'particle', primitiveId?: string, source: 'motion-lab' | 'framer' | 'three' | 'glsl', assetPath?: string, // .webm or .png seq, timing: {start_s,end_s,loop?,fade_in_s?,fade_out_s?}, layout: {x,y,w,h} (0..1), params: Record<string,any> // color, text, seed, amplitude…, captionLineId?: string, createdAt }`.
2. Map `overlayPlan.overlays` (and `captionTrack.lines`) → motion-asset suggestions. When an overlay's
   `type`/`text`/position implies a motion treatment (e.g. a "stat callout" → `02-scrub` counter primitive;
   a "concept reveal" → `03-icon-draw`; ambient backing → `01-field` / `05-ridgelines`), specify the
   mapping rules. This is deterministic mapping logic, not an AI call.
3. Specify a **render service** (new): `studio:render:export` (or `studio:motion:render`). Input: a
   `MotionAsset` spec (primitiveId + params + timing). Output: a rendered asset file
   (`.webm` for video primitives, `.png` sequence or sprite for static). Reuse the EXISTING
   `scripts/record-lab.mjs` Playwright record-to-webm pattern (bundle §2) — parameterize it so it can
   run headless from main with injected `params` (color/text/seed) per asset, instead of the fixed demos.
   Also specify a framer-motion/`three` in-app render path (bundle §1.1/§1.2) for assets that should be
   composed live rather than pre-recorded.
4. Specify the **IPC chain** end-to-end (preload bridge → ipcMain handler → service method → file write),
   matching the existing convention shown in the bundle's Rule 5. New channel names only; do not invent a
   second transport.

**B. High-Fidelity Visual Spec (Visualizer stage)**
5. Redesign `VisualizerView` (bundle §3.3) so overlays mount as a **compositing surface**: a real
   `<canvas>` (or layered `<video>` source + `<canvas>` overlay) at the session's aspect ratio, NOT the
   hardcoded 270×480 phone-frame with static divs. The motion-asset layer plays its `.webm`/canvas
   animation at `layout.x/y/w/h` and `timing.start_s..end_s` with `fade_in`/`fade_out`.
6. Respect `x/y/w/h` from `scenePlan.overlays` (the current code IGNORES them — bundle §3.3 hardcodes
   `top:'20%'`). Provide exact positioning math (0..1 normalized → canvas px).
7. Keep the existing safe-zones / protected-region (faces/text/objects) collision warnings — they must
   still work with the new asset layer.
8. Define the motion language using the inventory: `framer-motion`/`motion` for overlay enter/exit
   (spring physics `useSpring`), `canvas-confetti` for emphasis bursts, `three`/r3f or custom GLSL for
   ambient procedural backdrops. Map each to a concrete use. Dark-only tokens (bundle §5).

**C. UX Flow**
9. Define the Studio UI to (a) auto-suggest motion assets from `overlayPlan`, (b) let the user pick a
   primitive per overlay and tweak `params` (color/text/seed/intensity) in the Inspector, (c) trigger
   render (progress state), (d) preview in the Visualizer, (e) include in Export (burn into final video).
10. Define empty / loading / error states for the motion-asset panel (no primitive selected, render
    failed, asset missing).

**D. Backend verification (MANDATORY per skill Rule 5)**
11. For every feature above, state explicitly: does the backend/IPC exist (✅), is it a STUB (⚠️), or must
    it be built (⚠️ NEW). The bundle §4 already flags the gaps — confirm and extend. Do NOT design a
    frontend for a backend that does not exist; where it is missing, include the backend implementation
    spec (IPC channel + service method + DB/FS schema).
12. Specify the `StudioSession.motionAssets` DB persistence (the sessions table is `overlaystudiosessions`
    per the master spec; provide the column/migration needed to store the JSON assets array).

### Constraints
- Main app CANNOT import `gsap`/`lenis`/`simplex-noise` (those live only in landing sub-projects — bundle §1.6). Use `framer-motion`/`motion`, `three`, or custom GLSL for any sequenced/timeline animation.
- Stay local-first; no network calls for rendering. Playwright is already a dep — headless render is allowed.
- Preserve the existing `handoffBus`/`LINK_EPISODE` data flow (bundle §3.2) — the motion asset is an
  ADDITIONAL layer derived from the already-handed-off `overlayPlan` + `captionTrack`.
- Dark-only, DeskFlow tokens (bundle §5).
- If the design proposes REMOVING any existing UI/feature, mark it explicitly with "REMOVE: <x>" so the
  implementer halts for confirmation (skill Rule 3).

---

## Output Format

Return a single `RESULT.md`-style design spec with these sections:
1. `## MotionAsset data model` (full TypeScript interface + DB column).
2. `## overlayPlan → MotionAsset mapping rules` (deterministic table).
3. `## Render service + IPC` (new `studio:motion:render` chain, Playwright reuse, in-app framer/three path).
4. `## Visualizer compositor redesign` (canvas surface, positioning math, collision-warning compatibility).
5. `## Motion language map` (which library per treatment, with curves/params).
6. `## UX flow` (suggest → tweak → render → preview → export, + empty/error states).
7. `## Backend completeness table` (✅ / ⚠️ STUB / ⚠️ NEW for every feature).
8. `## Gaps / open questions` for the implementer.

Be exhaustive and concrete (file paths, field names, IPC channel names, exact positioning math). This
is a spec, not a menu.
