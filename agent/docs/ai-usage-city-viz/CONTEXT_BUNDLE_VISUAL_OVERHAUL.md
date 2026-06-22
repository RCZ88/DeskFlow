# CONTEXT_BUNDLE — Cityscape Visual Overhaul

> Current implementation snapshot for Architect reference.
> Date: 2026-06-23

---

## 1. Files That Need Changes

### 1.1 `src/components/AICityscape.tsx` (490 lines) — Main R3F component

**Structure:**
- `<AIUsageCityscape>` — root component with view mode pills (By Agent / By Model / Time-lapse), time-lapse controls, detail panel, loading/empty states
- `<CityScene>` — contains all R3F objects:
  - 2 directional lights (blue #6f8cff at 0.55, pink #ff3d81 at 0.25)
  - hemisphereLight (blue #22305c at 0.4)
  - `fogExp2({ color: '#080a14', density: 0.02 })`
  - Ground: `<planeGeometry args={[200,200]}>` with `meshStandardMaterial({ color: '#04060c', metalness: 0.65, roughness: 0.9 })`
  - Environment with 3 Lightformers (cyan rect 2.2, pink rect 1.6, purple ring 1.2)
  - OrbitControls (damping, maxPolarAngle PI/2.15, minDist 8, maxDist 80)
  - EffectComposer: Bloom (luminanceThreshold 1, mipmapBlur, intensity 1.5, radius 0.86) + Vignette + ToneMapping
- `<InstanceBuildings>` — TWO instancedMesh layers:
  1. Building body: `boxGeometry(1,1,1)`, `meshStandardMaterial({ color: '#0a0e18', metalness: 0.85, roughness: 0.32, envMapIntensity: 0.9 })` — instances scaled by (footprint, height, footprint)
  2. Roof glow: `boxGeometry(1, 0.06, 1)`, `meshBasicMaterial({ color: '#00eaff', toneMapped: false, blending: AdditiveBlending })`
  - Colors set via `instanceColor` — scaled 1.2x on hover, 1.4x on select
  - Hover: Html label floating above building
  - Click: toggles DetailPanel slide-in
- `<DetailPanel>` — spring-animated slide-in (288px, right side). Shows label, color dot, metric rows (tokens, cost, messages, sessions), model chips, active pulse
- `<TimeControls>` — range slider + play/pause, 400ms auto-advance

**Key props:** `overview`, `metric`, `tokenDisplayMode`, `loading`, `className`

**Current visual appearance:** Dark scene. Buildings appear as black/very dark boxes with a cyan glow strip on top. No surface detail/texture. Ground is near-black with slight reflectivity.

### 1.2 `src/components/cityscape.utils.ts` (255 lines) — Pure helpers

Key functions already exported:
- `agentColor(id)` / `hashColor(name)` — deterministic HSL color map
- `neon(hex, gain)` — color.multiplyScalar for emissive glow
- `modelFamily(name)` — normalizes model names
- `scaleHeight(v, max)` — logarithmic: 0.4–14 units
- `scaleFootprint(v, max)` — sqrt: 0.8–2.4 units
- `getWindowTexture(litRatio, tint)` — **Canvas-generated** window pattern (64x128), cached in 5-density pool. Currently NOT used in the scene — needs to be applied via custom shader or geometry
- `disposeWindowPool()` — cleanup
- `layoutSpiral(buildings)` — golden-angle phyllotaxis
- `buildCityModel(overview, mode, metric, timeDate)` — transforms aiUsage.byTool into CityModel
- `extractDateRange(overview)` — collects all date strings
- `formatMetricValue(v, metric)` — K/M/$ formatting
- Types: `BuildingDef`, `PlacedBuilding`, `CityModel`

**Current `BuildingDef`/`PlacedBuilding` shape:**
```typescript
interface PlacedBuilding extends BuildingDef {
  id: string
  label: string
  height: number     // 0.4–14 (log scale)
  footprint: number  // 0.8–2.4 (sqrt scale)
  color: string      // hex
  metricValue: number
  cost: number
  agentId?: string
  active: boolean
  messageCount: number
  sessions: number
  models: string[]
  x: number          // spiral layout position
  z: number
}
```

### 1.3 `src/pages/IDEProjectsPage.tsx` (~5100 lines) — Integration

**Integration code (lines ~2488–2509):**
```typescript
const AIUsageCityscape = lazy(() => import('../components/AICityscape'))

// ... in the JSX:
{showCityView && (
  <Suspense fallback={spinner}>
    <div className="rounded-2xl overflow-hidden border border-zinc-800/50">
      <AIUsageCityscape
        agents={aiAgents}
        overview={overview}
        metric={aiChartMode}
        tokenDisplayMode={tokenDisplayMode}
        loading={loading}
      />
    </div>
  </Suspense>
)}
```

Toggle is in the trend header (City/Charts buttons). City is default view.

---

## 2. Available Libraries (package.json)

```
three: ^0.170.0
@react-three/fiber: ^8.17.0
@react-three/drei: ^9.114.0
@react-three/postprocessing: ^2.16.0
framer-motion: ^11.0.0
lucide-react: ^0.400.0
tailwindcss: ^3.4.0
```

---

## 3. Visual Constraints

- App is FULLSCREEN Electron (1920x1080 typical)
- Dark theme throughout (#0a0e18 bg, zinc-800/900 panels)
- Glass morphism patterns (`backdrop-blur-xl`, `bg-zinc-900/80`)
- Accent colors: violet (#8b5cf6), cyan (#00eaff), pink (#ff3d81), amber (#f59e0b)
- R3F Canvas wraps entire parent div (no external layout interference)
- All Three.js objects created in JSX — no manual dispose needed (R3F handles it)

---

## 4. Current Limitations (what's missing)

- **No building surface textures:** `meshStandardMaterial({ color: '#0a0e18' })` — all buildings are solid dark color
- **No road network:** ground plane is featureless `#04060c` with metalness
- **No neon signage / emissive details:** only roof glow strip uses AdditiveBlending
- **No particle effects:** no rain, smog, sparks, or atmosphere particles
- **`getWindowTexture` exists in utils but is NOT wired into the scene** — 5 canvas-generated window density presets ready to use
- **No building-edge emissive trim** — buildings lack the cyberpunk neon-edge look
- **Ground lacks grid, lane markings, or any detail** beyond plain color
- **Environment/Lightformer lighting is minimal** — 3 lights + 3 lightformers
- **No animated elements** except OrbitControls and time-lapse slider

---

## 5. Data Shape (what feeds the city)

The `overview` prop contains:
```typescript
overview.aiUsage.byTool: {
  [toolId: string]: {
    tokens: number, cost: number, sessions: number,
    messageCount: number, lastUsed: string | null,
    models: string[],
    daily: { [date: string]: { tokens, cost, sessions, messageCount } },
    modelBreakdown: Array<{ model, tokens, messageCount, sessions, cost }>
  }
}
```

Typical: 5–15 tool IDs, 7–90 days of daily data, 1–10 models per tool.
