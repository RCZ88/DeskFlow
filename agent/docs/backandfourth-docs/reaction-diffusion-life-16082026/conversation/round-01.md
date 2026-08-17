# Round 01 — Reaction-Diffusion Life Design

> **Status:** SPECIALIST ASKED 3 REQUESTS → OWNER PROVIDED 3 CONTEXT BLOCKS
> **Date:** 2026-08-16

## Specialist Asked For

1. `src/App.tsx` AppBackground — z-index, fixed/absolute positioning
2. `src/components/life-river/RingCanvas.tsx` (full SVG) + `CoreSample.tsx` stage wrapper
3. `glsl/simulationFrag.glsl` + `glsl/displayFrag.glsl` + uniform declarations (from the playground repo)

## We Provided (CONTEXT blocks below — relay verbatim to Specialist)

---

### CONTEXT: src/components/AppBackground.tsx (FULL FILE, 13 lines)

```tsx
import { Particles } from './ui/particles';
import { LightRays } from './ui/light-rays';

export function AppBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[0]">
      <Particles quantity={60} color="#10b981" opacity={0.6} />
      <Particles quantity={45} color="#3b82f6" opacity={0.5} />
      <Particles quantity={35} color="#ef4444" opacity={0.4} />
      <LightRays color="rgba(160, 210, 255, 0.35)" blur={48} count={5} speed={18} />
    </div>
  );
}
```

**Notes:**
- Rendered once in `App.tsx:2585` inside the app shell (before the router content).
- `fixed inset-0 z-[0]`, `pointer-events-none` — a pure ambient layer BELOW everything.
- Particles are emerald/blue/red dots drifting (DOM-based, not canvas); LightRays is a blurred gradient effect.
- Life page content sits at higher z (its own `relative` containers, sticky map `z-[5]`, toggle bar `z-40`). A full-page RD canvas at `fixed inset-0 z-0` (or `-z-10`) would sit in the same band as AppBackground — both would coexist, but the RD canvas would need to be opaque enough to occlude the particles or they'd show through it.

### CONTEXT: src/components/life-river/CoreSample.tsx (FULL FILE, 126 lines) — the stage wrapper

```tsx
"use client"

import * as React from 'react'
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import type { LifePhase } from '@/lib/riverMath'
import type { LongTermGoal } from '@/components/dashboard/types'
import { RingCanvas, type LensId } from './RingCanvas'
import { cn } from '@/lib/utils'
import { Images, Layers, Sparkles, Target } from 'lucide-react'

const LENSES: { id: LensId; label: string; icon: typeof Layers; blurb: string }[] = [
  { id: 'phases', label: 'Phases', icon: Layers, blurb: 'Each ring is a chapter — oldest at the center.' },
  { id: 'covenant', label: 'Covenant', icon: Sparkles, blurb: 'Grain is practice kept. Today\'s edge hardens with every completion.' },
  { id: 'gold', label: 'Gold', icon: Target, blurb: 'Branches reach toward long-term goals. Hover a bud for progress.' },
  { id: 'memories', label: 'Memories', icon: Images, blurb: 'Amber pockets hold what you kept of that time.' },
]

interface CoreSampleProps {
  phases: LifePhase[]
  covenant: { completions: { commitmentId: string; date: string }[]; commitments: { id: string }[] }
  memoriesByPhase: Record<string, number>
  ltgsByPhase: Record<string, LongTermGoal[]>
  selectedPhaseId: string | null
  onPhaseClick: (phaseId: string) => void
  onOpenMemories: (phaseId: string) => void
  lens: LensId
  onLensChange: (lens: LensId) => void
}

export function CoreSample({ phases, covenant, memoriesByPhase, ltgsByPhase, selectedPhaseId, onPhaseClick, onOpenMemories, lens, onLensChange }: CoreSampleProps) {
  const grainByPhase = useMemo(() => {
    const out: Record<string, number> = {}
    const now = new Date().getFullYear()
    for (const p of phases) {
      const start = `${p.startYear}-01-01`
      const endY = p.endYear && p.endYear > 0 ? p.endYear : now
      const end = `${endY}-12-31`
      const inRange = covenant.completions.filter(c => c.date >= start && c.date <= end)
      const days = new Set(inRange.map(c => c.date)).size
      const possible = covenant.commitments.length
      out[p.id] = possible === 0 || days === 0 ? 0 : Math.min(1, inRange.length / (possible * days))
    }
    return out
  }, [phases, covenant.completions, covenant.commitments])

  const todayCompletions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return covenant.completions.filter(c => c.date === today).length
  }, [covenant.completions])

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30" data-lifephase="core-sample">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(251,191,36,0.08), transparent 60%)' }} />

      <div className="flex flex-col items-center px-6 pb-6 pt-6">
        <div data-core-sample-stage className="relative h-72 w-72 sm:h-[420px] sm:w-[420px] lg:h-[460px] lg:w-[460px]">
          <RingCanvas
            phases={phases}
            lens={lens}
            grainByPhase={grainByPhase}
            todayCompletions={todayCompletions}
            memoriesByPhase={memoriesByPhase}
            ltgsByPhase={ltgsByPhase}
            selectedPhaseId={selectedPhaseId}
            onPhaseClick={onPhaseClick}
            onOpenMemory={onOpenMemories}
          />
        </div>

        {/* Lens switcher */}
        <div data-lens-switcher className="mt-4 flex flex-wrap items-center justify-center gap-1 rounded-lg bg-zinc-800/50 p-0.5">
          {LENSES.map(l => (
            <button key={l.id} onClick={() => onLensChange(l.id)} className={cn('relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] transition-colors min-h-[30px]', lens === l.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}>
              {lens === l.id && (
                <motion.div layoutId="core-sample-lens" className="absolute inset-0 rounded-md bg-zinc-700/80 border border-white/10" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              )}
              <l.icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10 font-medium">{l.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.p key={lens} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="mt-2.5 max-w-md text-center font-serif text-[12.5px] italic text-zinc-500">
            {LENSES.find(l => l.id === lens)?.blurb}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
```

### CONTEXT: src/components/life-river/RingCanvas.tsx (FULL FILE, 286 lines)

```tsx
"use client"

import * as React from 'react'
import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { categoryOf, sortPhases, type LifePhase } from '@/lib/riverMath'
import type { LongTermGoal } from '@/components/dashboard/types'

export type LensId = 'phases' | 'covenant' | 'gold' | 'memories'

interface RingCanvasProps {
  phases: LifePhase[]
  lens: LensId
  grainByPhase: Record<string, number>
  todayCompletions: number
  memoriesByPhase: Record<string, number>
  ltgsByPhase: Record<string, LongTermGoal[]>
  selectedPhaseId: string | null
  onPhaseClick: (phaseId: string) => void
  onOpenMemory: (phaseId: string) => void
}

function seededRand(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 10000) / 10000
  }
}

const VIEW = 420
const C = VIEW / 2
const INNER_R = 54
const STEP = 26

interface RingGeom { phase: LifePhase; r: number; thickness: number; color: string }

function ringGeometry(phases: LifePhase[]): RingGeom[] {
  return sortPhases(phases).map((phase, i) => ({
    phase,
    r: INNER_R + STEP * i + (phase.magnitude ?? 50) / 100 * 10,
    thickness: 7 + (phase.magnitude ?? 50) / 100 * 14,
    color: phase.color || categoryOf(phase.category).color,
  }))
}

export function RingCanvas({ phases, lens, grainByPhase, todayCompletions, memoriesByPhase, ltgsByPhase, selectedPhaseId, onPhaseClick, onOpenMemory }: RingCanvasProps) {
  const reducedMotion = useReducedMotion()
  const rings = useMemo(() => ringGeometry(phases), [phases])
  if (rings.length === 0) return null

  const maxR = Math.max(...rings.map(g => g.r + g.thickness / 2)) + 6
  const scale = (VIEW / 2 - 8) / maxR
  const todayEdgeR = Math.min((maxR + 14) * scale, VIEW / 2 - 6)

  const branches = useMemo(() => {
    const out: { phaseId: string; x1: number; y1: number; x2: number; y2: number; progress: number; title: string }[] = []
    for (const g of rings) {
      const ltgs = ltgsByPhase[g.phase.id] || []
      if (ltgs.length === 0) continue
      const rand = seededRand(g.phase.id)
      const baseAngle = 0.6 + rand() * Math.PI * 0.8
      ltgs.slice(0, 2).forEach((ltg, i) => {
        const a = baseAngle + i * 0.42
        const r1 = (g.r + g.thickness / 2 + 4) * scale
        const r2 = Math.min(VIEW / 2 - 6, r1 + 26 + (ltg.progress ?? 0) * 34)
        out.push({
          phaseId: g.phase.id,
          x1: C + Math.cos(a) * r1, y1: C + Math.sin(a) * r1,
          x2: C + Math.cos(a) * r2, y2: C + Math.sin(a) * r2,
          progress: ltg.progress ?? 0,
          title: ltg.title,
        })
      })
    }
    return out
  }, [rings, ltgsByPhase])

  const flecks = useMemo(() => {
    const out: { id: string; x: number; y: number; r: number; amber: boolean; phaseId: string }[] = []
    for (const g of rings) {
      const rand = seededRand(`${g.phase.id}-grain`)
      const rate = grainByPhase[g.phase.id] ?? 0
      const count = Math.round(26 * rate)
      const mCount = Math.min(4, memoriesByPhase[g.phase.id] ?? 0)
      for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2
        const rr = g.r * scale + (rand() - 0.5) * g.thickness * scale * 0.8
        out.push({ id: `${g.phase.id}-f${i}`, x: C + Math.cos(a) * rr, y: C + Math.sin(a) * rr, r: 1.1 + rand() * 1.3, amber: false, phaseId: g.phase.id })
      }
      for (let i = 0; i < mCount; i++) {
        const a = rand() * Math.PI * 2
        out.push({ id: `${g.phase.id}-m${i}`, x: C + Math.cos(a) * (g.r * scale), y: C + Math.sin(a) * (g.r * scale), r: 3.4, amber: true, phaseId: g.phase.id })
      }
    }
    return out
  }, [rings, grainByPhase, memoriesByPhase, scale])

  const todayFlecks = useMemo(() => {
    const rand = seededRand('today-edge')
    return Array.from({ length: Math.min(14, todayCompletions) }).map((_, i) => {
      const a = rand() * Math.PI * 2
      return { id: `t${i}`, x: C + Math.cos(a) * todayEdgeR, y: C + Math.sin(a) * todayEdgeR, r: 1.4 + rand() * 1.1 }
    })
  }, [todayCompletions, todayEdgeR])

  const dimLayer = (active: boolean) => (active ? 1 : 0.16)

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="h-full w-full" role="img" aria-label="Life phases as tree rings — oldest at the center, most recent at the edge">
      <defs>
        <filter id="df-ring-grain" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={10} />
        </filter>
      </defs>

      {/* Branch layer (Gold) — behind rings */}
      <g opacity={dimLayer(lens === 'gold')} style={{ transition: 'opacity 0.5s ease' }}>
        {branches.map((b, i) => (
          <g key={`${b.phaseId}-${i}`}>
            <motion.line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="#fbbf24" strokeWidth={lens === 'gold' ? 2.6 : 1.4} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: lens === 'gold' ? 1 : 0.35 }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            <circle cx={b.x2} cy={b.y2} r={lens === 'gold' ? 4.5 : 3} fill="#fbbf24" style={{ transition: 'r 0.4s ease' }} />
            {lens === 'gold' && <title>{`${b.title} — ${Math.round(b.progress)}%`}</title>}
          </g>
        ))}
      </g>

      {/* Ring layer */}
      <g filter={lens === 'covenant' ? 'url(#df-ring-grain)' : undefined}>
        {rings.map((g, i) => {
          const active = lens === 'phases' || lens === 'covenant'
          const selected = selectedPhaseId === g.phase.id
          const opacity = selected ? 1 : dimLayer(active)
          return (
            <motion.g key={g.phase.id} data-lifephase="ring" data-phase-id={g.phase.id} onClick={() => onPhaseClick(g.phase.id)} className="cursor-pointer"
              style={selected ? { filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.35))' } : undefined}
              animate={{ opacity }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
              <circle cx={C} cy={C} r={g.r * scale} fill="none" stroke={g.color} strokeWidth={g.thickness * scale} opacity={0.88} strokeLinecap="round" strokeDasharray={undefined} />
              {i === rings.length - 1 && g.phase.endYear == null && (
                <circle cx={C} cy={C} r={g.r * scale} fill="none" stroke={g.color} strokeWidth={g.thickness * scale} strokeDasharray="3 7" opacity={0.35} />
              )}
              <title>{`${g.phase.title} (${g.phase.startYear}–${g.phase.endYear || 'now'})`}</title>
            </motion.g>
          )
        })}
      </g>

      {/* Grain flecks (Covenant) */}
      <g opacity={dimLayer(lens === 'covenant')} style={{ transition: 'opacity 0.5s ease' }}>
        {flecks.filter(f => !f.amber).map(f => (
          <circle key={f.id} cx={f.x} cy={f.y} r={f.r} fill="#a8a29e" opacity={lens === 'covenant' ? 0.85 : 0.4} />
        ))}
      </g>

      {/* Amber memory pockets (Memories) */}
      <g opacity={dimLayer(lens === 'memories')} style={{ transition: 'opacity 0.5s ease' }}>
        {flecks.filter(f => f.amber).map(f => (
          <circle key={f.id} cx={f.x} cy={f.y} r={lens === 'memories' ? f.r + 1.8 : f.r} fill="#fbbf24" className="cursor-pointer" onClick={() => onOpenMemory(f.phaseId)} style={{ transition: 'r 0.35s ease' }}>
            <title>Memories from this period</title>
          </circle>
        ))}
      </g>

      {/* Today's Edge — living, breathing outer edge */}
      <g opacity={dimLayer(true)}>
        <circle cx={C} cy={C} r={todayEdgeR} fill="none" stroke="#fbbf24" strokeWidth={2.2} strokeDasharray="1 10" strokeLinecap="round" opacity={0.5} className="df-edge-breath" style={reducedMotion ? { opacity: 0.45 } : undefined} />
        {todayFlecks.map(f => <circle key={f.id} cx={f.x} cy={f.y} r={f.r} fill="#fbbf24" opacity={0.7} />)}
      </g>

      {/* Center grain */}
      <circle cx={C} cy={C} r={3} fill="#52525b" opacity={0.8} />
    </svg>
  )
}
```

**Layer stack inside CoreSample stage (bottom → top):**
1. Card root `bg-zinc-900/30` + radial amber glow (`opacity-40`, `absolute inset-0`)
2. `data-core-sample-stage` div (`relative`, 460px max) → SVG fills `h-full w-full`
3. SVG internal order: **branches (bottom) → rings → grain flecks → amber pockets → today's edge (top)**
4. Lens switcher + blurb BELOW the stage, outside it

### CONTEXT: glsl/simulationFrag.glsl (FULL FILE, from jasonwebb/reaction-diffusion-playground)

```glsl
/**
- Red channel = concentration of chemical A (0.0 - 1.0)
- Green channel = concentration of chemical B (0.0 - 1.0)
*/

uniform sampler2D previousIterationTexture;

uniform float f;
uniform float k;
uniform float dA;
uniform float dB;
uniform float timestep;

uniform vec2 mousePosition;
uniform float brushRadius;

uniform sampler2D styleMapTexture;
uniform vec4 styleMapTransforms;
uniform vec4 styleMapParameters;
uniform vec2 styleMapResolution;

uniform vec2 bias;

uniform vec2 resolution;

varying vec2 v_uvs[9];

vec3 weights[3];

void setWeights(int type) {
  // Karl Sim's weights from http://www.karlsims.com/rd.html
  if(type == 0) {
    weights[0] = vec3(0.05,  0.2,  0.05);
    weights[1] = vec3(0.2,  -1.0,  0.2);
    weights[2] = vec3(0.05,  0.2,  0.05);

  // Standard (?) 9-point stencil from https://en.wikipedia.org/wiki/Discrete_Laplace_operator
  } else if(type == 1) {
    weights[0] = vec3(0.25,  0.5,  0.25);
    weights[1] = vec3(0.5,  -3.0,  0.5);
    weights[2] = vec3(0.25,  0.5,  0.25);

  // 5-point stencil from Xmoprhoa/pmneila source code
  } else if(type == 2) {
    weights[0] = vec3(0.0,  1.0,  0.0);
    weights[1] = vec3(1.0, -4.0,  1.0);
    weights[2] = vec3(0.0,  1.0,  0.0);
  }
}

vec2 getLaplacian(vec4 centerTexel) {
  // Begin by setting up the Laplacian stencil weights based on desired model
  setWeights(2);

  // Start with center value
  vec2 laplacian = centerTexel.xy * weights[1][1];  // center

  // Add in orthogonal values
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[1])).xy * (weights[0][1] + bias.y);  // top
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[2])).xy * (weights[1][2] + bias.x);  // right
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[3])).xy * (weights[2][1] - bias.y);  // bottom
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[4])).xy * (weights[1][0] - bias.x);  // left

  // Add in diagonal values
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[5])).xy * weights[0][2];  // top-right
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[6])).xy * weights[2][2];  // bottom-right
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[7])).xy * weights[2][0];  // bottom-left
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[8])).xy * weights[0][0];  // top-left

  return laplacian;
}

vec4 getStyleMapTexel(vec2 uv) {
  vec4 texel = vec4(-1.0, -1.0, -1.0, -1.0);

  float scale = styleMapTransforms[0];
  float angle = styleMapTransforms[1];
  float xOffset = - styleMapTransforms[2] / resolution.x;
  float yOffset = styleMapTransforms[3] / resolution.y;

  vec2 transformedUV = uv;

  // Calculate translation (X and Y)
  transformedUV.x += xOffset;
  transformedUV.y += yOffset;

  // Calculate scale
  transformedUV /= scale;

  // Calculate rotation
  float s = sin(angle);
  float c = cos(angle);
  mat2 rotationMatrix = mat2(c, s, -s, c);
  vec2 pivot = vec2(0.5, 0.5);
  transformedUV = rotationMatrix * (transformedUV - pivot) + pivot;

  texel = texture2D(styleMapTexture, transformedUV);

  return texel;
}

void main() {
  // Get A/B chemical data
  vec4 centerTexel = texture2D(previousIterationTexture, v_uvs[0]);
  float A = centerTexel[0];
  float B = centerTexel[1];

  // Copy the f/k/dA/dB parameters so they can be modified locally ("n" for "new")
  float nf = f;
  float nk = k;
  float ndA = dA;
  float ndB = dB;

  // If a style map image is set, smoothly interpolate between the main f/k/dA/dB and the f/k/dA/dB values set in the Style Map pane
  if(styleMapResolution != vec2(-1.0, -1.0)) {
    // Get the style map texel that corresponds with this location
    vec4 styleMapTexel = getStyleMapTexel(v_uvs[0]);

    float luminance = 0.3 * styleMapTexel.r + 0.59 * styleMapTexel.g + 0.11 * styleMapTexel.b;
    nf = mix(f, styleMapParameters[0], luminance);
    nk = mix(k, styleMapParameters[1], luminance);
    ndA = mix(dA, styleMapParameters[2], luminance);
    ndB = mix(dB, styleMapParameters[3], luminance);
  }

  // Draw more of the B chemical around the mouse on mouse down
  if(mousePosition.x > 0.0 && mousePosition.y > 0.0) {
    float distToMouse = distance(mousePosition * resolution, v_uvs[0] * resolution);

    if(distToMouse < brushRadius) {
      gl_FragColor = vec4(mix(0.0, 0.3, distToMouse/brushRadius), 0.5, 0.0, 1.0);
      return;
    }
  }

  // DEBUGGING: override f/k uniforms to generate parameter map
  // nf = 0.1 * v_uvs[0].y;
  // nk = 0.03 + 0.04 * v_uvs[0].x;

  // Pre-calculate complex and repeated terms
  vec2 laplacian = getLaplacian(centerTexel);
  float reactionTerm = A * B * B;

  gl_FragColor = vec4(
    A + ((ndA * laplacian[0] - reactionTerm + nf * (1.0 - A)) * timestep),
    B + ((ndB * laplacian[1] + reactionTerm - (nk + nf) * B) * timestep),
    centerTexel.b,
    1.0
  );
}
```

**Key facts for the design:**
- Data is in `R=A`, `G=B` channels of a data texture. Laplacian = 5-point stencil (`setWeights(2)`) with bias offsets.
- Mouse brush writes `(mix(0,0.3,dist/radius), 0.5, 0, 1)` into B — i.e., raises B around cursor.
- Style-map branch is optional (uniform `styleMapResolution == vec2(-1,-1)` disables it) — can be STRIPPED for our ambient use.
- Timestep scales the update; the standard equation: `A += (dA*∇A - AB² + f(1-A)) * dt`; `B += (dB*∇B + AB² - (k+f)B) * dt`.

### CONTEXT: glsl/displayFrag.glsl (FULL FILE, from jasonwebb/reaction-diffusion-playground)

```glsl
varying vec2 v_uv;
uniform sampler2D textureToDisplay;
uniform sampler2D previousIterationTexture;
uniform float time;

uniform int renderingStyle;

uniform vec4 colorStop1;
uniform vec4 colorStop2;
uniform vec4 colorStop3;
uniform vec4 colorStop4;
uniform vec4 colorStop5;

uniform vec2 hslFrom;
uniform vec2 hslTo;
uniform float hslSaturation;
uniform float hslLuminosity;

// http://theorangeduck.com/page/avoiding-shader-conditionals
float when_eq(float x, float y)  { return 1.0 - abs(sign(x - y)); }
float when_neq(float x, float y) { return abs(sign(x - y)); }
float when_gt(float x, float y)  { return max(sign(x - y), 0.0); }
float when_lt(float x, float y)  { return max(sign(y - x), 0.0); }
float when_le(float x, float y)  { return 1.0 - max(sign(x - y), 0.0); }
float when_ge(float x, float y)  { return 1.0 - max(sign(y - x), 0.0); }

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

// Function from Iñigo Quiles — https://www.shadertoy.com/view/MsS3Wc
vec3 hsb2rgb(in vec3 c){
  vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
  rgb = rgb*rgb*(3.0-2.0*rgb);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

vec4 rainbow(vec2 uv) {
  float PI = 3.1415926535897932384626433832795;
  float center = 0.1;
  float width = 1.0;
  float frequency = 1.5;
  float r1 = sin(frequency*uv.x + 0.0) * width + center;
  float g1 = sin(frequency*uv.x + 2.0*PI/3.0) * width + center;
  float b1 = sin(frequency*uv.x + 4.0*PI/3.0) * width + center;
  float r2 = sin(frequency*uv.y + 0.0) * width + center;
  float g2 = sin(frequency*uv.y + 2.0*PI/3.0) * width + center;
  float b2 = sin(frequency*uv.y + 4.0*PI/3.0) * width + center;
  return vec4(vec3(r1, g1, b1) * vec3(r2, g2, b2), 1.0);
}

void main() {
  vec4 previousPixel = texture2D(previousIterationTexture, v_uv);
  vec4 pixel = texture2D(textureToDisplay, v_uv);
  float A = pixel[0];
  float B = pixel[1];
  vec4 outputColor;

  // HSL mapping
  if(renderingStyle == 0) {
    outputColor = vec4(hsb2rgb(vec3(
      map(B-A, hslFrom[0], hslFrom[1], hslTo[0], hslTo[1]),
      hslSaturation,
      hslLuminosity
    )), 1.);

  // Gradient color stops by @pmneila — https://github.com/pmneila/jsexp
  } else if(renderingStyle == 1) {
    vec3 color;

    if(B <= colorStop1.a) {
      color = colorStop1.rgb;
    } else if(B <= colorStop2.a) {
      color = mix(colorStop1.rgb, colorStop2.rgb, (B - colorStop1.a) / (colorStop2.a - colorStop1.a));
    } else if(B <= colorStop3.a) {
      color = mix(colorStop2.rgb, colorStop3.rgb, (B - colorStop2.a) / (colorStop3.a - colorStop2.a));
    } else if(B <= colorStop4.a) {
      color = mix(colorStop3.rgb, colorStop4.rgb, (B - colorStop3.a) / (colorStop4.a - colorStop3.a));
    } else if(B <= colorStop5.a) {
      color = mix(colorStop4.rgb, colorStop5.rgb, (B - colorStop4.a) / (colorStop5.a - colorStop4.a));
    } else if(B > colorStop5.a) {
      color = colorStop5.rgb;
    }

    outputColor = vec4(color.rgb, 1.0);

  // Purple and yellow by Amit Patel (Red Blob Games) — https://www.redblobgames.com/x/1905-reaction-diffusion/
  } else if(renderingStyle == 2) {
    outputColor = vec4(
      1000.0 * abs(pixel.x - previousPixel.x) + 1.0 * pixel.x - 0.5 * previousPixel.y,
      0.9 * pixel.x - 2.0 * pixel.y,
      10000.0 * abs(pixel.y - previousPixel.y),
      1.0
    );

  // Red Blob variant #1 — turquoise background, yellow-orange fire-like leading edges
  } else if(renderingStyle == 3) {
    outputColor = vec4(
      10000.0 * abs(pixel.y - previousPixel.y),
      1000.0 * abs(pixel.x - previousPixel.x) + 1.0 * pixel.x - 0.5 * previousPixel.y,
      0.9 * pixel.x - 2.0 * pixel.y,
      1.0
    );

  // Red Blob variant #2 — radioactive green on hot pink background
  } else if(renderingStyle == 4) {
    outputColor = vec4(
      1000.0 * abs(pixel.x - previousPixel.x) + 1.0 * pixel.x - 50000.0 * previousPixel.y,
      10000.0 * abs(pixel.y - previousPixel.y),
      0.6 * pixel.x - .1 * pixel.y,
      1.0
    );

  // Rainbow effect by Jonathon Cole — https://github.com/colejd/Reaction-Diffusion-ThreeJS
  } else if(renderingStyle == 5) {
    float c = A - B;
    outputColor = vec4(c, c, c, 1.0);
    vec4 rainbow = rainbow(v_uv.xy + time*.5);
    float gBranch = when_gt(B, 0.01);
    outputColor = mix(outputColor, outputColor - rainbow, gBranch);

  // Black and white (soft)
  } else if(renderingStyle == 6) {
    float grayValue = pixel.r - pixel.g;  // black for B, white for A
    outputColor = vec4(grayValue, grayValue, grayValue, 1.0);

  // Black and white (sharp)
  } else if(renderingStyle == 7) {
    float grayValue = pixel.r - pixel.g;
    if(grayValue > .3) {
      outputColor = vec4(1.0, 1.0, 1.0, 1.0);
    } else {
      outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    }

  // No processing — red for chemical A, green for chemical B
  } else if(renderingStyle == 8) {
    outputColor = pixel;
  }

  gl_FragColor = outputColor;
}
```

**Key facts for the design:**
- `renderingStyle 1` (gradient color stops on B) is the ideal base for re-mapping to app tokens — swap the 5 `colorStop*` uniforms for amber/green/sky stops.
- `renderingStyle 6/7` give soft/sharp monochrome `A-B` — good for a subtle low-opacity ambient texture.
- `renderingStyle 2-4` are edge-detection styles (motion-based) — the "living" fire-like edges; style 3 (turquoise bg, yellow-orange leading edges) is the closest existing match to amber-on-dark.
- All the `when_*` / `map` / `hsb2rgb` / `rainbow` helpers can be pruned for a minimal shader.

## Decisions Made

- **SPECIALIST CONVERGED → RESULT.md delivered (2026-08-16):**
  - HERO SURFACE = CoreSample "Living Substrate" backdrop (z-0 behind RingCanvas z-10). FULL-PAGE background SKIPPED. PhaseCards/RiverMap REJECTED.
  - Architecture: R3F `<Canvas orthographic>`; two 256x256 (384 high-DPI) FloatType WebGLRenderTargets, NearestFilter; 2 sim passes/frame; coral preset f=0.0545/k=0.062/dA=1.0/dB=0.5.
  - Palette: B=0→#09090b α0, B=0.5→#b45309 α0.15, B=1→#fbbf24 α0.40, premultiplied alpha.
  - Pause on document.hidden; unmount on prefers-reduced-motion; ErrorBoundary → silent null → CSS glow fallback.
- **IMPLEMENTED by Owner (this cycle):** src/shaders/rd-simulation.glsl, src/shaders/rd-display.glsl, src/components/life-river/LivingSubstrate.tsx, CoreSample.tsx z-stack hook. Build gates all pass. Runtime verification NOT LAUNCHED (app not running, no debug port).

## Convergence status: CONVERGED — RESULT.md implemented, awaiting runtime verification by CZ