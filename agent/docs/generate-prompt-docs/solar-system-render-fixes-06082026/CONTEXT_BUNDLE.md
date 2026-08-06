# CONTEXT_BUNDLE.md — Solar System / Orbit System Render Fixes

> Target: DeskFlow (Electron + React 18 + TypeScript + Tailwind v4 + React Three Fiber)
> Bundle date: 2026-08-06 | Source of truth: `src/components/OrbitSystem.tsx` (4207 lines), `src/pages/DashboardPage.tsx` (2813 lines)
> Versions: `three` 0.183.2, `@react-three/fiber` 9.5.0, `@react-three/drei` 10.7.7, `@react-three/postprocessing` 3.0.4, `postprocessing` 6.39.0, `framer-motion` 12.35.0, `lucide-react`, `tailwindcss` 4.2.1

---

## 1. What this feature is

The **Orbit System** is a 3D visualization of the user's tracked app/website usage, opened from the Dashboard page ("View Solar System" → fullscreen modal). It has two modes:

- **Galaxy view** (default): two particle-dust galaxies — **Apps Galaxy** centered at `(0, 0, 0)` and **Websites Galaxy** centered at `(3250, 0, 0)`. Each category (IDE, Browser, AI Tools… for apps; Social Media, News… for websites) is a glowing sphere with a category label, scattered in the galaxy.
- **Solar system view**: entering a category shows one sun + one planet per app/domain orbiting it, with labels, orbit paths, moons, rings.

User complaints (verbatim in PROMPT.md) boil down to 5 bugs:

1. **Websites solar system renders blank** when entered via galaxy sphere → "Enter Solar System" or the category dropdown (camera flies to x=3250 but the scene renders at x=0).
2. **Category labels in galaxy view are huge/overlapping/detached** (drei `Html distanceFactor={30}` scales ~7.5× at galaxy camera distance).
3. **Text/categories look blurry**, especially after switching time periods (labels use `distanceFactor` + CSS `backdrop-filter: blur(8px)` + per-frame `setState`; selected category can also vanish from the new period's data → empty scene).
4. **Planets are very dark** (near-zero scene lighting, low emissive pulse, `ACES_FILMIC` tone mapping darkens further).
5. **No visible graphics-quality option** — a hidden `perfMode` ('high' | 'balanced' | 'performance') already gates bloom, DPI, and particle counts; needs to become a user-facing, persisted control.

---

## 2. Data flow (Dashboard → OrbitSystem)

`DashboardPage.tsx` (lines 2421–2443) maps backend stats into `ActivityLog[]` and passes them to `OrbitSystem` inside the solar modal (lines 2771–2809):

```tsx
// DashboardPage.tsx:2421-2443
// Transform dashboardData.appStats/websiteStats → ActivityLog[] for OrbitSystem
const orbitLogs = useMemo(() => {
  if (!dashboardData?.appStats) return [];
  return dashboardData.appStats.map((s: any, i: number) => ({
    id: i,
    timestamp: new Date(),
    app: s.app || s.app_name || '',
    category: s.category || 'Other',
    duration: Math.round(s.totalSeconds || 0),
  })).filter((l: any) => l.app);
}, [dashboardData?.appStats]);

const orbitWebsiteLogs = useMemo(() => {
  if (!dashboardData?.websiteStats) return [];
  return dashboardData.websiteStats.map((s: any, i: number) => ({
    id: i,
    timestamp: new Date(),
    app: s.domain || s.app_name || '',
    category: s.category || 'Other',
    duration: Math.round(s.totalSeconds || 0),
    domain: s.domain || s.app_name || '',
  })).filter((l: any) => l.app);
}, [dashboardData?.websiteStats]);
```

```tsx
// DashboardPage.tsx:2799-2806 (solar modal body)
<ErrorBoundary>
<Suspense fallback={<div className="h-[400px] flex items-center justify-center"><LoadingState variant="spinner" /></div>}>
  <div className={solarFullscreen ? 'w-full h-screen' : 'h-[500px] w-full'}>
    <OrbitSystem logs={orbitLogs} websiteLogs={orbitWebsiteLogs} appColors={appColors} categoryOverrides={categoryOverrides} selectedPeriod={selectedPeriod}
      onPeriodChange={(p) => { onSelectedPeriodChange?.(p as any); onDateOffsetChange?.(0); }} />
  </div>
</Suspense>
</ErrorBoundary>
```

Key fact: `selectedPeriod` is passed from the Dashboard (period buttons: today/week/month/all). When the user changes period, the parent refetches backend data, so `OrbitSystem` receives NEW `logs`/`websiteLogs` arrays. Inside OrbitSystem, `externalPeriod` is set → `filteredLogs = logs` (no client-side re-filter). The dashboard also has `solarMode` (apps|websites) for its small inline preview but the fullscreen modal always renders the full `OrbitSystem` with BOTH galaxies.

---

## 3. THE 5 BUGS — exact code + root causes

### BUG 1 — Websites solar system is BLANK (camera offset mismatch)

**Root cause:** Entering a websites solar system animates the camera to x=3250 (websites galaxy offset), but `SolarSystemScene` renders the sun/planets at the scene origin `(0,0,0)` with NO offset. Camera looks at empty space. Apps works only because its offset is 0.

`GalaxyView` (lines 2929–2932) — the offset lives ONLY here:

```tsx
// OrbitSystem.tsx:2929-2932
// Apps galaxy position: (0, 0, 0)
// Websites galaxy position: (3250, 0, 0) - 5x galaxy widths apart
const APPS_GALAXY_POS: [number, number, number] = [0, 0, 0];
const WEBSITES_GALAXY_POS: [number, number, number] = [3250, 0, 0];
```

`SolarSystemScene` (lines 2408–2441) — renders everything at origin:

```tsx
function SolarSystemScene({ planets, isPaused, speed, onPlanetClick, controlsRef, onPlanetPositionUpdate, category = 'Other', sunSize, portalKey, isAnimating, showBelt }: { planets: PlanetData[]; isPaused: boolean; speed: number; onPlanetClick: (data: PlanetData) => void; controlsRef: any; onPlanetPositionUpdate?: (name: string, position: THREE.Vector3) => void; category?: string; sunSize?: number; portalKey?: number; isAnimating?: boolean; showBelt?: boolean }) {
  const { camera } = useThree();
  const [showPortal, setShowPortal] = useState(portalKey ? true : false);

  useEffect(() => {
    if (portalKey) {
      setShowPortal(true);
    }
  }, [portalKey]);

  return (
    <>
      {showPortal && (
        <PortalRing
          key={portalKey}
          sunColor={SUN_CONFIGS[category]?.color || '#ffaa00'}
          onComplete={() => setShowPortal(false)}
        />
      )}
      <WarpLines active={!!isAnimating} />
      <Sun category={category} size={sunSize} />
      <ambientLight color="#ffffff" intensity={0.15} />
      <hemisphereLight color="#6688cc" groundColor="#222233" intensity={0.1} />
      <directionalLight position={[5, 10, 5]} intensity={0.15} color="#aabbff" />
      {planets.filter((p) => p && p.name && (p.category || p.color)).map((planetData) => (<OrbitPath key={`orbit-${planetData.name}`} planet={planetData} />))}
      {planets.filter((p) => { if (!p) return false; if (!p.name) return false; if (!p.category && !p.color) return false; return true; }).map((planetData) => (<TexturedPlanet key={planetData.name} data={planetData} isPaused={isPaused} speedMultiplier={speed} onClick={onPlanetClick} onPositionUpdate={onPlanetPositionUpdate} />))}
      {showBelt && <AsteroidBelt radius={45} count={400} isPaused={isPaused} camera={camera} />}
      {showBelt && <AsteroidBelt radius={75} count={300} isPaused={isPaused} camera={camera} />}
      <Starfield />
      <Stars radius={300} depth={80} count={400} factor={2} fade speed={0.05} saturation={0.5} />
      <OrbitControls ref={controlsRef} enablePan={true} enableZoom={true} minDistance={8} maxDistance={200} autoRotate={!isPaused} autoRotateSpeed={0.06} target={[0, 0, 0]} />
    </>
  );
}
```

Camera entry paths that animate to `targetX = 3250` for websites (each sets `viewMode='solarSystem'`):

`handleEnterSystem` (lines 3573–3588):
```tsx
const handleEnterSystem = () => {
  if (selectedSystem && controlsRef.current) {
    setCurrentCategory(selectedSystem.category);
    setStoredCategory(selectedSystem.category, galaxyType);
    setSelectedSystem(null);
    setLegendExpanded(true);
    // Animate into the solar system (zoom in close to sun)
    setViewMode('solarSystem');
    const targetX = galaxyType === 'websites' ? 3250 : 0;
    const duration = animationSpeed === 'instant' ? 100 : ANIMATION_DURATIONS[animationSpeed];
    const targetPos = new THREE.Vector3(targetX, 30, 60); // Close to sun
    const lookAtPos = new THREE.Vector3(targetX, 0, 0); // Look at sun
    animateCamera(targetPos, lookAtPos, duration, () => setPortalKey(k => k + 1));
  }
};
```

`handleCategorySelect` (lines 3619–3632): same pattern — `const targetX = galaxyType === 'websites' ? 3250 : 0;` then `animateCamera(new THREE.Vector3(targetX, 30, 60), new THREE.Vector3(targetX, 0, 0), duration, () => setPortalKey(k => k + 1))`.

`handleZoomOut` (3595–3609) and `resetCameraToGalaxy` (3753–3759) correctly go to `targetX` for the galaxy (which IS offset) — those work.

`focusOnPlanet` (3661–3697) does NOT add the offset (it uses `planetPositionsRef`, which holds scene-space positions around origin) — so legend-click navigation works even in websites mode. Inconsistent.

Canvas camera (line 4015): `camera={{ position: viewMode === 'galaxy' ? (galaxyType === 'websites' ? [3250, 100, 200] : [0, 100, 200]) : [0, 100, 180], fov: 45, near: 0.1, far: 10000 }}`.

**Acceptance:** entering ANY websites solar system (via galaxy sphere → Enter, via category dropdown, via planet click) must show the sun + planets, never blank space.

### BUG 2 — Category labels in galaxy view huge / overlapping / detached

`GalaxyView.renderSolarSystem` (lines 2993–3051) — the label:

```tsx
// OrbitSystem.tsx:3043-3048
{/* Always visible label */}
<Html center distanceFactor={30} position={[0, sphereSize * 3, 0]} style={{ pointerEvents: 'none' }}>
  <div className="px-3 py-1.5 rounded-lg bg-black/90 text-white font-bold text-sm whitespace-nowrap border-2 border-white/40" style={{ fontSize: '15px', textShadow: '0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' }}>
    {system.category}
  </div>
</Html>
```

drei `Html` `distanceFactor` scales the DOM element by `cameraDistance / distanceFactor`. Galaxy camera sits ~224 units from each galaxy center → scale ≈ 224/30 ≈ **7.5×**. The 15px text becomes ~112px, the black chip covers neighboring systems, and the chip is anchored at `sphereSize*3` ≈ 3.6 units above the sphere, which at 7.5× scale looks completely detached ("not positioned properly on top of the solar system"). The galaxy dust cloud particles (radius up to 280) also overlap the giant chips → "blurs out into the dish".

System positions are index-based (`getSystemPosition`, lines 2969–2991) — when the category list changes (period switch), positions shift, but sphere+label are in the same `<group key={category}>` so they stay together; the visual mess is caused by scale, not misalignment.

**Acceptance:** category chips stay constant readable screen size, visually attached to their sphere, no overlap between neighboring chips at any zoom.

### BUG 3 — Blurry labels (planet labels + period switching)

`TexturedPlanet` label (lines 1786–1816):

```tsx
{/* B14: Distance-scaled label — opacity/size scales with camera distance */}
<group ref={labelRef}>
  <Html center distanceFactor={15}>
    <div
      style={{
        pointerEvents: 'none',
        opacity: isHovered ? 1 : Math.min(1, Math.max(0.3, 1 - (cameraDist - 15) / 120)),
        transform: `scale(${isHovered ? 1 : Math.min(1.2, Math.max(0.6, 20 / cameraDist + 0.5))})`,
        transition: 'opacity 0.2s ease',
        transformOrigin: 'center center',
        background: 'rgba(8, 8, 24, 0.95)',
        backdropFilter: 'blur(8px)',
        border: `1.5px solid ${isHovered ? data.color : 'rgba(255,255,255,0.18)'}`,
        borderRadius: '10px',
        padding: '5px 14px',
        fontSize: '13px',
        fontWeight: 600,
        color: isHovered ? data.color : '#ececec',
        whiteSpace: 'nowrap',
        letterSpacing: '0.03em',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        boxShadow: isHovered ? `0 0 16px ${data.color}44` : '0 2px 8px rgba(0,0,0,0.4)',
        maxWidth: isHovered ? '200px' : `${Math.max(60, Math.min(200, 200 - (cameraDist - 15) * 2))}px`,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {data.name}{isHovered && <span style={{ marginLeft: '8px', opacity: 0.7, fontWeight: 400 }}>{formatDurationSeconds(data.time)}</span>}
    </div>
  </Html>
</group>
```

The `cameraDist` is React state updated EVERY FRAME via `setCameraDist(dist)` (lines 1656–1663) → re-renders the whole `TexturedPlanet` 60×/second, and the label's `transform: scale(...)` + `backdropFilter: blur(8px)` combo forces Chromium to rasterize the text at fractional scales → visibly blurry text. This gets worse when switching time periods (data re-computes → planets re-mount → labels re-animate from wrong scale).

Period switch also has a **stale-category bug**: `currentCategory` (persisted in localStorage per galaxy type, lines 3338–3346) may not exist in the new period's `solarSystems` → `planets` memo (lines 3474–3490) returns `[]` → solar system view shows ONLY the sun + starfield (looks broken/blurry-blown-out). There is NO fallback to another category or back to galaxy view.

```tsx
// OrbitSystem.tsx:3474-3490
const planets = useMemo(() => {
  const system = solarSystems.find(s => s.category === currentCategory);
  let filtered = system?.planets || [];
  // D3: Apply min time filter
  if (minTimeFilter > 0) {
    filtered = filtered.filter(p => p.time >= minTimeFilter);
  }
  // D4: Apply search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }
  return filtered;
}, [solarSystems, currentCategory, minTimeFilter, searchQuery]);
```

Period buttons (lines 3852–3870):
```tsx
{(['today', 'week', 'month', 'all'] as const).map((p) => (
  <button
    key={p}
    onClick={() => {
      setSelectedPeriod(p);
      onPeriodChange?.(p);
    }}
    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition ${
      activePeriod === p
        ? 'bg-indigo-500/30 text-indigo-300'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
    }`}
  >
    {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All'}
  </button>
))}
```

**Acceptance:** labels always crisp (no per-frame state, no fractional-scale rasterization); switching periods never leaves an empty solar system — auto-select an existing category or return to galaxy view.

### BUG 4 — Planets very dark ("shaders")

Planet material (lines 1734–1759) — emissive pulses between ~0.15 and ~0.35:

```tsx
{/* C1: LOD planet mesh - sphere detail depends on camera distance */}
<mesh
  ref={meshRef}
  onClick={() => onClick(data)}
  onPointerOver={(e) => {
    e.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = 'pointer';
  }}
  onPointerOut={() => {
    setIsHovered(false);
    document.body.style.cursor = 'auto';
  }}
>
  <primitive object={lodGeo} attach="geometry" />
  <meshStandardMaterial
    map={texture}
    normalMap={normalMap}
    normalScale={new THREE.Vector2(0.6, 0.6)}
    roughness={0.4}
    metalness={0.15}
    emissive={new THREE.Color(data.color)}
    emissiveIntensity={0.25}
    emissiveMap={texture}
  />
</mesh>
```

Emissive pulse (lines 1649–1654):
```tsx
// C2: Activity pulse glow — emissive intensity pulses based on usage
const mat = meshRef.current.material as THREE.MeshStandardMaterial;
const pulseBase = 0.15 + (data.time / 3600) * 0.02;
const pulseT = Date.now() * 0.001;
const pulseVal = pulseBase + Math.sin(pulseT * 1.2 + angle) * 0.08;
mat.emissiveIntensity = pulseVal;
```

Canvas lighting (lines 4041–4045) — extremely dim:
```tsx
{/* Space Lighting */}
<ambientLight intensity={0.03} color="#1a1a2e" />
<hemisphereLight groundColor="#000000" skyColor="#0d1b2a" intensity={0.08} />
<pointLight position={[0, 0, 0]} intensity={3} color="#ffaa00" distance={200} decay={1.5} />
<directionalLight position={[50, 30, 50]} intensity={0.5} color="#fff5e6" />
```

The point light (`decay 1.5`, `distance 200`) delivers essentially nothing at outer orbits (radius up to 110 for apps, 220 for websites): 3 / 220^1.5 ≈ 0.09. The Sun's own `pointLight`s (lines 1126–1141, `intensity={8}`, `decay={2}`, `distance={500}`) also decay hard. Note there are TWO sets of lights: `SolarSystemScene` has its own dim trio (2429–2431) plus the global ones (4042–4045).

Tone mapping (lines 4047–4062) — ACES_FILMIC darkens midtones:
```tsx
{/* Post-Processing Effects - disabled in performance mode */}
<EffectComposer multisampling={0}>
  {perfMode !== 'performance' && (
    <Bloom
      intensity={1.2}
      luminanceThreshold={0.6}
      luminanceSmoothing={0.5}
      radius={0.5}
      mipmapBlur
    />
  )}
  <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
  {perfMode !== 'performance' && (
    <Vignette offset={0.25} darkness={0.5} blendFunction={BlendFunction.NORMAL} />
  )}
</EffectComposer>
```

`multisampling={0}` → no MSAA; `antialias: false` in gl props (line 4022). The sun uses `toneMapped={false}` (1063, 1075, 1087, 1099, 1111, 1121) so it stays bright — the contrast makes dark planets even more obvious. Procedural planet textures use a dark base `#1e1e40` (line 1213) and darken `adjustColor(color, -15)` (line 1217).

**Acceptance:** planets clearly visible and saturated at all orbits in both apps and websites solar systems, both galaxies — without blowing out the sun. If tone mapping is kept, planets must be `toneMapped={false}` or emissive must be raised substantially; light decay must not make outer orbits black.

### BUG 5 — Graphics quality option (surface existing perfMode)

State (line 3327): `const [perfMode, setPerfMode] = useState<'high' | 'balanced' | 'performance'>('balanced');`

Already consumed:
- `dpr={Math.min(window.devicePixelRatio, perfMode === 'performance' ? 1 : 1.5)}` (line 4028)
- Bloom/Vignette gated off in performance mode (4049, 4059)
- `GalaxyDustCloud perfMode={perfMode}` → 1000/2500/6000 particles (lines 160, 158–161)
- `WebsiteGalaxyDustCloud perfMode={perfMode}` → 800/2000/5000 particles (lines 286, 284–287)
- `PerformanceMonitor` auto-degrades high→balanced→performance (lines 4031–4035)

UI entry is the "Perf" button (lines 3872–3881) which only opens an FPS panel — there is NO quality selector UI, no persistence of perfMode.

**Acceptance:** a user-facing Graphics Quality control (e.g. Low / Medium / High, or the existing perfMode names) persisted in localStorage (try/catch per project convention), wired to dpr cap, MSAA (`multisampling`/`antialias`), bloom, particle counts, vignette. Must include empty-state-friendly labels and follow DeskFlow design (glass cards, `rounded-xl` max, zinc tokens).

---

## 4. Data pipeline functions (for completeness — category grouping)

- `computeSolarSystems(logs, appColors, categoryOverrides)` — lines 2629–2686. Groups planets by category; category list from `getCategoryListFromSettings()` (localStorage `deskflow-tier-assignments`, lines 2447–2462); returns `{ category, planets, totalTime, sunSize }[]`, filters empty systems, sorts by settings order then time desc.
- `computeWebsiteSolarSystems(websiteLogs, ...)` — lines 2821–2863. Same but `WEBSITE_CATEGORY_LIST` (line 2706) + `WEBSITE_SUN_CONFIGS` (2689–2701).
- `computePlanets(logs, appColors, categoryOverrides)` — lines 702–861. Filters `is_browser_tracking` logs out; groups by app; sort ascending by time (least used closest to sun); cap `MAX_RENDERED_PLANETS = 80`, `MIN_PLANET_TIME_SECONDS = 30`; Kepler orbit physics (orbitRadius 10–110 power-law, eccentricity 0.03–0.15, inclination 0–6°, moons from projects, rings for top 25%).
- `computePlanetsFromStats(appStats, ...)` — lines 2502–2625. Same from stats array (used by the inline dashboard preview).
- `computeWebsitePlanets(websiteLogs, ...)` — lines 2709–2818. Groups by domain; orbit radius 24–220; slower speeds ×0.1.
- `filterLogsByPeriod(logs, period)` — lines 2468–2486 (client-side fallback when `externalPeriod` is NOT provided).
- `PlanetData` interface — lines 429–445 (name, category, color, time, sessions, radius, orbitRadius, speed, orbitalPeriod?, rotationSpeed?, eccentricity?, inclination?, longitudeOfPerihelion?, moons[], rings[]).
- `OrbitSystemProps` — lines 463–472 (`logs`, `websiteLogs`, `appColors`, `categoryOverrides`, `websiteColors`, `websiteCategoryOverrides`, `selectedPeriod`, `onPeriodChange`).

---

## 5. Design tokens / conventions to honor

- Dark glass UI: `bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50`, `glass` utility class exists app-wide.
- Max radius `rounded-xl` (12px); `rounded-lg` (8px) for small chips. `p-5` card padding.
- Fonts: Geist (UI) / JetBrains Mono (mono). Dark mode only.
- All `localStorage` access MUST be wrapped in try/catch (project hard invariant).
- Files are CRLF; preserve line endings; do not mass-reformat.
- Build/verify: `npx vite build` (renderer), preload via esbuild, `node scripts/rebuild-main.mjs` (main). No unit test runner configured — verification is build + manual/Probe MCP runtime checks.
- The app runs in Electron (Chromium). `mask-composite` CSS and some WebGL2 features may behave differently than Chrome web — keep to standard three.js features.
- Existing problem history: `agent/PROBLEMS.md` — Issue #094 (category dropdown nav), #095 (planet click tracking), #096 (website solar system data + timeline selector) were fixed before; this round is about rendering/camera/labeling/lighting.

## 6. Key file map

| File | Lines | Role |
|---|---|---|
| `src/components/OrbitSystem.tsx` | 2408–2441 | SolarSystemScene (NO offset → Bug 1) |
| `src/components/OrbitSystem.tsx` | 2903–3076 | GalaxyView (offsets + labels → Bug 1, 2) |
| `src/components/OrbitSystem.tsx` | 1535–1819 | TexturedPlanet (material → Bug 4, label → Bug 3) |
| `src/components/OrbitSystem.tsx` | 3318–4207 | Main component (camera anims, period state, Canvas, EffectComposer, Perf UI) |
| `src/components/OrbitSystem.tsx` | 900–1144 | Sun (bright, toneMapped false — contrast reference) |
| `src/components/OrbitSystem.tsx` | 157–387 | GalaxyDustCloud / WebsiteGalaxyDustCloud (perfMode particles) |
| `src/pages/DashboardPage.tsx` | 2421–2443, 2771–2809 | Data mapping + solar modal |
| `package.json` | — | three 0.183.2, r3f 9.5.0, drei 10.7.7, postprocessing 6.39.0 |
