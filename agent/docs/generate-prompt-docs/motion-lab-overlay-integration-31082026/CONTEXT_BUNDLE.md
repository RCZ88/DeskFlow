# CONTEXT BUNDLE — Motion Libraries → Overlay Studio Asset Integration

> Self-contained reference for the spec-authoring AI. The target AI does NOT have the
> codebase. Everything it needs to design the motion-asset integration is here.

## 0. The Question We Are Consulting On

The user wants to know: the repo already has a large inventory of animation/motion/3D/canvas
libraries (`motion-lab/MOTION_LIBRARIES.md`) PLUS a set of standalone "motion-lab" HTML
primitives that are recorded to `.webm` via a Playwright script (`scripts/record-lab.mjs`).
How should Overlay Studio (specifically its **Visualizer** stage and its **Export/render**
step) consume these to produce real *explanation / illustration* overlay assets — instead of
the current static `<div>` overlays?

The earlier session already wired the **data handoff** (Content Engine Assemble → Overlay
Studio via `handoffBus` → `LINK_EPISODE`). This consultation is about the **rendering/asset**
layer: how motion libraries + motion-lab primitives become burnable overlay video.

---

## 1. Motion Library Inventory (from `motion-lab/MOTION_LIBRARIES.md`)

### 1.1 DOM Animation (main app — ACTIVE)
| Package | Ver | Used | For |
|---|---|---|---|
| framer-motion | 12.42.2 | ~100+ | Primary. `AnimatePresence`, `useScroll`, `useTransform`, `useMotionTemplate`, `useMotionValue`, `useSpring`, `useReducedMotion`, `motion.div`. Page/card/hover/layout/staggered animations. Import `'framer-motion'`. |
| motion | 12.42.2 | ~32 | Rebrand of framer-motion, ESM entry `'motion/react'`. dashboard, magic-card, animated-grid-pattern, light-rays. |
| canvas-confetti | 1.9.4 | ~10 | Celebration particles (goal/focus/survey/life/gold). |

Key hooks: `useScroll()`/`useTransform()` (scroll-linked), `useMotionValue()`/`useSpring()` (spring physics), `useReducedMotion()` (a11y), `AnimatePresence` (exit/transitions).

### 1.2 3D / Graphics (three.js ecosystem — ACTIVE)
| Package | Ver | Used | For |
|---|---|---|---|
| three | 0.183.2 | 16 | Core 3D. |
| @react-three/fiber | 9.5.0 | 12 | `<Canvas>`, `useFrame`, `useThree`. |
| @react-three/drei | 10.7.7 | 8 | `OrbitControls`, `Stars`, `Html`, `Line`, `Billboard`, `Text`, `MeshReflectorMaterial`, `Environment`. |
| @react-three/postprocessing | 3.0.4 | 3 | `EffectComposer`, `Bloom`, `ToneMapping`, `Vignette`. |
| postprocessing | 6.39.0 | 1 | `ToneMappingMode`, `BlendFunction`. |

Used in: `OrbitSystem`, `CityScene`, `GraphScene`, `ContextGraph`, `LivingSubstrate` (Gray-Scott RD), `CodeArchitectureMap`, `HeroOverlays`.

### 1.3 Drawing / Canvas / Capture
| Package | Ver | Used | For |
|---|---|---|---|
| html-to-image | 1.11.13 | 3 | DOM→PNG (`SelectionOverlay`, `ShareCard`, `ReceiptGeneratorModal`). |

### 1.4 Video / Media
| Tool | Type | Used | For |
|---|---|---|---|
| Manim | External (Python) | 1 (`animation.service.ts`) | Math animation MP4 for Lyceum Learn. Probes `python -m manim`. |
| ffmpeg | External | 2 | Poster frames from Manim MP4; transcription checks. NOT bundled. |
| MediaRecorder | Web API | 2 | `voiceJournal.ts`, `lib/stt.ts`. `audio/webm;codecs=opus`. |
| HTML5 Canvas + video | Web API | 1 | `frameCaptureService.ts` (overlay-studio/vision) — hidden `<video>` + `<canvas>` frame capture, no ffmpeg. |
| hls.js | Transitive | 0 | HLS streaming. |

NOT installed: remotion, recordrtc, react-media-recorder, video.js, plyr, react-player, react-youtube, pixi.js, p5.js, konva, fabric.js.

### 1.5 Shaders / WebGL
- GLSL files: `src/shaders/rd-simulation.glsl` (Gray-Scott), `src/shaders/rd-display.glsl`.
- `LivingSubstrate.tsx`: THREE.ShaderMaterial ping-pong WebGLRenderTargets 256×256, 2 sim passes/frame.
- `TronGround`, `SkyDome`, `Ground` (cityscape): inline ShaderMaterial.
- `GraphNode`/`GraphEdge`: glow/pulse + animated edge-flow shaders.

### 1.6 Landing sub-projects ONLY (NOT in main app — do not rely on)
- `rheo-landing-v2/` + `rheo-landing/`: **gsap** ^3.12.7 / ^3.15.0, **lenis**, **simplex-noise** ^4.0.3.
- `landing-mvp-draft/`: framer-motion, embla-carousel, tailwindcss-animate, recharts, sonner.
> ⚠️ gsap/lenis/simplex-noise live ONLY in landing sub-apps; the MAIN app cannot import them. Any
> timeline-based sequenced animation design must use framer-motion/`motion` (main app) instead.

### 1.7 Installed but UNUSED (dead weight — candidate removal, but flag per skill Rule 3)
lightweight-charts 5.2.0, @elucim/core 0.24.0, @elucim/dsl 0.24.0, prismjs 1.30.0, simple-icons 13.21.0, react-bits 1.0.5, r3f-perf 7.2.3.

### 1.8 Inventory's own guidance for "video explanation / illustration overlays"
- framer-motion — animated overlays, transition sequences, reveal animations
- canvas-confetti — particle burst effects for emphasis
- three.js/r3f — 3D animated scenes, procedural backgrounds, ambient motion
- Manim (external) — programmatic math video, step-by-step visual explanation
- html-to-image — frame capture for stills
- MediaRecorder — record any canvas/element to webm
- Custom GLSL — procedural animated backgrounds, reaction-diffusion overlays

---

## 2. The motion-lab Primitives (standalone HTML, recorded to .webm)

From `motion-lab/README.md` + `scripts/record-lab.mjs` + `motion-lab/*.html`:

- 6 self-contained HTML files, **zero build**, CDN `motion@11.18.2` + `simplex-noise@4.0.3`.
- Palette: bg `#050506`, white strokes, hairlines `rgba(255,255,255,.08)`. Fonts: Space Grotesk + JetBrains Mono.
- Files: `01-field.html` (glyph field, GRID=12, DRIFT=0.0016, VEL_CAP=8, REPULSE_R=90, MAX_GLYPHS=1500), `02-scrub.html` (scroll-scrub task counter, TOTAL_TASKS=247), `03-icon-draw.html` (SVG path draw, DURATION=900ms), `04-wake.html` (bezier wake, MOVE_S=3s), `05-ridgelines.html` (NUM_LINES=5, POINTS=120, AMPLITUDE_CHAOTIC=40, CALM_BREATHE_AMP=3), `06-console.html` (typewriter console, LOOP_MS=7000).
- `scripts/record-lab.mjs`: Playwright `chromium`, viewport `{width:1280,height:800}`, `deviceScaleFactor:1.5`, `recordVideo` dir `motion-lab/videos`, `MAX_S=8`. `FILES` maps each html→interaction (pointer/scroll/none). Measures frameTimes avg/p95.
- Output: 12 `.webm` already in `motion-lab/videos/` (each html recorded at multiple seeds/params).

**Gap to design:** there is NO code path from these `.webm` files into Overlay Studio. The
primitives are decorative demos. The consultation must define: (a) how a primitive is *parameterized*
per-episode (color, text, seed, timing), (b) how it is *rendered/recorded* into an overlay asset
(a new `studio:render:export` IPC using the same Playwright record pattern, or a headless
`motion`/`framer-motion` recorder), and (c) how the resulting asset is *mounted* in the Visualizer
and *burned* in Export.

---

## 3. Current Overlay Studio State (the target we are extending)

### 3.1 `StudioSession` type — `src/features/overlay-studio/state/studioTypes.ts`
```ts
export type StudioStage = 'dashboard' | 'source' | 'transcript' | 'visual-evidence' | 'bridge' | 'cut-plan' | 'scene-plan' | 'visualizer' | 'export'
export type SessionStatus = 'created' | 'transcribing' | 'transcript_ready' | 'cut_plan_pending' | 'cut_plan_ready' | 'cut_plan_approved' | 'scene_plan_pending' | 'scene_plan_ready' | 'export_ready' | 'error' | 'linked' | 'caption_ready' | 'bridge_waiting' | 'preview_ready'
export interface CaptionLine { id: string; start: number; end: number; text: string; highlight?: string[] }
export interface CaptionTrack { sessionId: string; source: 'transcript' | 'bridge_styled'; lines: CaptionLine[]; createdAt: string }
export interface StudioSession {
  id: string; name: string; sourceVideoPath: string; sourceVideoName: string
  durationSec?: number; transcriptPath?: string; cutPlanPath?: string; scenePlanPath?: string; exportPlanPath?: string
  transcript?: any; cutPlan?: any; scenePlan?: DirectorCut; status: SessionStatus; missingSource: boolean
  createdAt: string; updatedAt: string
  episodeId?: number
  captionTrack?: CaptionTrack
  digest?: VisualDigest; objects?: DetectedObject[]; faces?: FaceRegion[]; textRegions?: TextRegion[]; shots?: ShotBoundary[]
}
```
⚠️ There is NO field for `motionAssets`, `canvasLayers`, or `overlayPrimitives`. The session model
must be extended (new optional array) to carry generated motion assets.

### 3.2 Handoff bus (already implemented this session) — `src/features/overlay-studio/handoffBus.ts`
```ts
type HandoffPayload = {
  episodeId: number; episodeTitle: string; niche?: string | null; themeId?: number | null
  cutList: any[]; overlayPlan: any; captionTrack?: any; transcriptSegments?: any[]; sourceVideoPath?: string
}
export const studioHandoff = {
  emit(payload: HandoffPayload) { for (const l of listeners) { try { l(payload) } catch (e) { console.error('[studioHandoff] listener failed', e) } } },
  subscribe(l: Listener): () => void { listeners.add(l); return () => listeners.delete(l) },
}
```
This is the data bridge. The consultation must assume `cutList`/`overlayPlan`/`captionTrack` are
available on the session; the motion asset is an ADDITIONAL layer derived from `overlayPlan`.

### 3.3 Visualizer (current render — NO motion lib, static divs) — `src/features/overlay-studio/components/visualizer/VisualizerView.tsx` (key parts)
```tsx
const activeOverlays = useMemo(() =>
  (activeSession?.scenePlan?.overlays || []).filter((o: any) =>
    playback.currentTime >= o.start_time && playback.currentTime <= o.end_time),
  [activeSession?.scenePlan?.overlays, playback.currentTime])

// Canvas Preview
<div className="relative rounded-xl overflow-hidden border border-zinc-700/50 bg-[#0D1117]" style={{ width: 270, height: 480 }}>
  {/* Safe zones / protected regions ... */}
  {activeOverlays.map((o: any, i: number) => {
    const color = OVERLAY_TYPE_CONFIG[o.type as keyof typeof OVERLAY_TYPE_CONFIG]?.color || '#e2e8f0'
    return (
      <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
        className="absolute px-3 py-2 rounded-lg max-w-[85%] pointer-events-none"
        style={{ top: '20%', left: '8%', right: '8%', background: 'rgba(13,17,23,0.85)', border: `1px solid ${color}40` }}>
        <div className="text-[11px] font-medium mb-0.5" style={{ color }}>{o.type || 'card'}</div>
        <div className="text-white text-[13px] leading-snug font-medium">{o.text}</div>
      </motion.div>
    )
  })}
</div>
```
Observations for the spec AI:
- Overlays are positioned by fixed `%` (top:20%, left/right:8%). The `scenePlan.overlays` carry
  `x/y/w/h` (0..1) and `start_time/end_time` — but the current map IGNORES `x/y/w/h` and hardcodes
  `top:'20%'`. A motion-asset layer should respect `x/y/w/h` and add animated enter/exit.
- The canvas is a 270×480 phone-frame `div`, NOT a real `<video>`/`<canvas>` element. There is no
  actual source-video playback element here (the `playback` state is driven elsewhere). For a real
  burn, the Visualizer needs a compositing surface (a `<canvas>` or layered `<video>` + overlay `<canvas>`)
  that `MediaRecorder`/`html-to-image`/ffmpeg can capture.

### 3.4 IPC / backend reality check (per skill Rule 5)
- `src/preload.ts` contentEngine bridge has: `editCutlist`, `editOverlayPlan`, `episodeSave`,
  `episodeLinkOverlay`, `editCaption`. NO `studio:render:export` or motion-asset IPC exists.
- `src/services/contentEngine/index.ts` handlers exist for the above. No motion-asset renderer service.
- `frameCaptureService.ts` (overlay-studio/vision) already does hidden-`<video>`+`<canvas>` frame
  capture — a reusable pattern for a compositor.
- Playwright is installed (`playwright:true` in package.json) — `scripts/record-lab.mjs` proves the
  record-to-webm pattern works. A `studio:render:export` IPC can reuse it headlessly.

---

## 4. Backend completeness flags (what the spec must specify, because it does NOT exist yet)
1. ⚠️ A motion-asset render service (parameterize primitive → render → `.webm`/`.png` sequence) does not exist.
2. ⚠️ No `StudioSession.motionAssets` field — schema migration needed.
3. ⚠️ No `studio:render:export` IPC — must be designed (handler + preload bridge + service method).
4. ✅ Playwright + MediaRecorder + `frameCaptureService` patterns already exist and can be reused.
5. ✅ framer-motion / `motion` / three / r3f / custom GLSL all available in main app.

---

## 5. Design tokens (for any new UI the spec proposes)
Dark-only. Glass: `bg-zinc-900/80 backdrop-blur-xl`, max `rounded-xl`, `p-5`. Accent cyan `#22d3ee`,
amber `#f59e0b`, rose `#f43f5e`, emerald `#10b981`. Fonts: Geist + JetBrains Mono (per AGENTS.md).
Studio buttons: `.studio-btn`, `.studio-btn-primary`, `.studio-btn-ghost`.
