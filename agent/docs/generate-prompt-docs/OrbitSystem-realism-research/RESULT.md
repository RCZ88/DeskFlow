# OrbitSystem Realism — Design & Implementation Specification

**Date:** 2026-06-19  
**Author:** Lead Designer & Engineer  
**Target:** `src/components/OrbitSystem.tsx` (split into sub-components where needed)  
**Goal:** Dramatically improved realism, cinematic animations, data-driven visual depth

---

## A. Research Findings & Design Decisions

### A1. Orbit Spacing (Kepler's Laws vs. Logarithmic)

| Aspect | Detail |
|--------|--------|
| **Real solar system** | Inner planets: 0.39–1.52 AU (Mercury–Mars, ratio ~3.9×). Middle: 5.2 AU (Jupiter). Outer: 9.5–30 AU (Saturn–Neptune, ratio ~3.2×). Titius-Bode approximates but fails for Neptune. |
| **Current code** | `calculateOrbitRadiusLogarithmic` at lines 582–596. `minOrbitRadius: 14`, `maxOrbitRadius: 90`. Formula: `minR * (maxR / minR) ^ (t)`. With 10 planets: ~14 → 18 → 23 → 30 → 38 → 49 → 63 → 81 → 90. |
| **Decision** | **Keep logarithmic spacing** — it elegantly mimics the real inner/outer density split. Widen the range to `minOrbitRadius: 10, maxOrbitRadius: 110` for more dramatic depth. Add a `spacingExponent: 0.8` compression factor that clusters inner planets tighter and pushes outer planets further apart. |
| **New formula** | `orbitRadius = minR + (maxR - minR) * (t ** spacingExponent)` where `t = idx / (total - 1)`. With 10 planets: ~10 → 15 → 23 → 33 → 45 → 59 → 73 → 88 → 103 → 110. |
| **Visual impact** | Inner planets appear more tightly grouped (simulating solar system inner density). Outer planets have breathing room, creating a sense of vast scale. |

```typescript
const ORBIT_CONFIG = {
  minOrbitRadius: 10,
  maxOrbitRadius: 110,
  spacingExponent: 0.8, // NEW: <1 clusters inner, >1 spreads outer
  // ...
};

function calculateOrbitRadius(planetIndex: number, totalPlanets: number): number {
  const t = totalPlanets > 1 ? planetIndex / (totalPlanets - 1) : 0.5;
  const { minOrbitRadius, maxOrbitRadius, spacingExponent } = ORBIT_CONFIG;
  return minOrbitRadius + (maxOrbitRadius - minOrbitRadius) * Math.pow(t, spacingExponent);
}
```

**Tradeoff:** Wider range means planets at max r=110 may appear small. Mitigated by glow sprite always being visible.

---

### A2. Orbital Speeds (Kepler's Third Law)

| Aspect | Detail |
|--------|--------|
| **Real physics** | T² ∝ a³ → ω ∝ a^(-3/2). Mercury (ω=4.15°/day) orbits 7.5× faster than Neptune (0.55°/day). Inner planets visibly faster. |
| **Current code** | `calculateAngularSpeed` at lines 607–614. Uses `baseAngularSpeed / sqrt(adjustedRadius * radius)` with `visualBalanceFactor: 0.65`. Inner at r=14: ω≈0.37. Outer at r=90: ω≈0.16. Ratio only ~2.3× — far too compressed. |
| **Decision** | **Implement pure Keplerian scaling** `ω = baseAngularSpeed / (r^1.5)`. Then apply a **per-planet visual boost** clamped to a minimum speed so outer planets never stop moving. The boost has an exponential falloff based on orbit distance. |
| **New formula** | `ω = baseAngularSpeed / (r ^ 1.5)` with `minAngularSpeed: 0.08` clamp. Then `visualSpeedBoost = max(0, 0.25 * (1 - r / maxOrbitRadius))` added on top. Inner (r=10): ω≈0.63. Outer (r=110): ω≈0.08+0.04=0.12. Ratio ~5.3× — much closer to real. |
| **Visual impact** | Inner planets visibly race ahead in their orbits. Outer planets move in a slow, majestic crawl. Creates a palpable sense of scale. |

```typescript
const ORBIT_CONFIG = {
  baseAngularSpeed: 2.0,
  minAngularSpeed: 0.08, // NEW
  // visualBalanceFactor removed — replaced by Keplerian + boost
};

function calculateAngularSpeed(radius: number): number {
  const { baseAngularSpeed, minAngularSpeed, maxOrbitRadius } = ORBIT_CONFIG;
  // Pure Keplerian: ω ∝ r^(-3/2)
  const keplerSpeed = baseAngularSpeed / Math.pow(radius, 1.5);
  // Visual boost for outer planets so they don't freeze
  const visualBoost = Math.max(0, 0.25 * (1 - radius / maxOrbitRadius));
  return Math.max(keplerSpeed + visualBoost, minAngularSpeed);
}
```

**Tradeoff:** Outer planets still move slower than before. The `visualBoost` compensates just enough that 4× speed makes them feel alive. At 1× speed the user sees clear hierarchy: inner = fast, outer = slow.

---

### A3. Eccentricities

| Aspect | Detail |
|--------|--------|
| **Real solar system** | Mercury 0.205 → very elliptical. Venus 0.007 → nearly circular. Earth 0.017, Mars 0.093, Jupiter 0.049, Saturn 0.057, Uranus 0.046, Neptune 0.010. Range: 0.007–0.205. |
| **Current code** | `eccentricityRange: { min: 0.01, max: 0.08 }`. All planets nearly circular. No correlation with orbit position. |
| **Decision** | **Inner planets get higher eccentricity** (0.04–0.15), **outer planets get lower** (0.01–0.06). Map by orbit index: `ecc = 0.15 - 0.12 * (idx / total) + randomNoise(0.02)`. Mercury-like closest planets have visibly elliptical paths; Neptune-like outer planets are near-circular. |
| **Visual impact** | Inner orbit rings are subtly elliptical — the eye can just detect the "squash" for the closest planet. Outer rings appear perfectly circular. Adds realism without changing the silhouette for most orbits. |

```typescript
function computeEccentricity(planetIndex: number, totalPlanets: number): number {
  const t = planetIndex / Math.max(totalPlanets - 1, 1);
  // Inner planets: eccentric (0.15), outer planets: circular (0.03)
  return 0.15 - 0.12 * t + (Math.random() - 0.5) * 0.03;
}
```

---

### A4. Inclinations

| Aspect | Detail |
|--------|--------|
| **Real solar system** | Mercury 7.0°, Venus 3.4°, Earth 0°, Mars 1.8°, Jupiter 1.3°, Saturn 2.5°, Uranus 0.8°, Neptune 1.8°. No clear correlation with distance. |
| **Current code** | `inclinationRange: { min: 0, max: 5 }`. Random in range, no per-planet variation. |
| **Decision** | **Keep random 0–6°** but make it a deterministic hash of the planet name so inclination is stable across renders. Inclination creates visible "tilt" in orbit rings when viewed from above, adding 3D depth. |
| **Visual impact** | Orbit rings appear at slightly different tilts. From the default camera angle (slightly above the ecliptic), you see some orbits tilted "up" and others "down" — improves the sense of 3D space. |

```typescript
function computeInclination(planetName: string): number {
  const seed = hashString(planetName) % 1000;
  return (seed / 1000) * 6; // 0–6 degrees, stable per planet
}
```

---

### A5. Planet Sizes

| Aspect | Detail |
|--------|--------|
| **Real solar system** | Sun radius: 696,340 km. Jupiter: 69,911 km (1/10th Sun). Earth: 6,371 km (1/109th Sun). Ratio: Sun 109× Earth. |
| **Current code** | Sun: `sunRadius: 5` (but actual rendered via config: `sizeRange[0] * 0.9` = 3.6). Planet: `Math.max(0.5, sqrt(time/maxTime) * 1.5)` → max ~1.5. Sun:Planet ratio ~2.4:1 for largest planet. |
| **Decision** | **Sun stays at ~4 units** (visual dominance). **Planet radius formula** changes to `max(0.3, sqrt(time/maxTime) * 1.2)` so smallest planets are 0.3 and largest are ~1.2. Ratio: 4:1.3 ≈ 3:1 for largest, 13:1 for smallest. Not realistic but far better visual hierarchy. Add a **minimum visible size of 0.3** (no invisible pinpricks). |
| **Visual impact** | The sun dominates the system clearly. Large-usage planets (VS Code, Chrome) are obviously bigger than small-usage ones (obscure tools). The size differential is visible at a glance without consulting labels. |

```typescript
const SUN_RENDER_SIZE = 4;
// In computePlanets:
planetRadius = Math.max(0.3, Math.sqrt(appTime / maxTime) * 1.2);
```

---

### A6. Planet Colors

| Aspect | Detail |
|--------|--------|
| **Real solar system** | Mercury: gray-tan. Venus: pale yellow. Earth: blue-green. Mars: red-orange. Jupiter: orange-brown bands. Saturn: pale gold. Uranus: cyan. Neptune: deep blue. Each has a distinct, recognizable hue. |
| **Current code** | `getPlanetColorByOrbit` at lines 629–651. Radial gradient from warm (yellow #FCD34D) to cool (purple #8B5CF6) based on orbit distance. All planets in a system share the same gradient — no per-planet identity. |
| **Decision** | **Replace radial gradient with category-informed distinct colors.** Each app category maps to a base hue family. Individual planets within that category get a variation on the hue (shift ±15°, sat ±10%). This gives each planet a unique, recognizable color while keeping category coherence. |

**Color families by category (hue rotation from SUN_CONFIGS):**

| Category | Base Color | Hex | Hue | Planet Variation |
|----------|-----------|-----|-----|-----------------|
| IDE | Warm gold | #F59E0B | 38° | ±10° hue, ±10% sat |
| AI Tools | Soft purple | #A855F7 | 270° | ±12° hue |
| Browser | Azure | #3B82F6 | 217° | ±8° hue |
| Entertainment | Coral pink | #F43F5E | 347° | ±15° hue |
| Communication | Teal | #14B8A6 | 173° | ±10° hue |
| Design | Rose | #E11D48 | 348° | ±12° hue |
| Productivity | Soft yellow | #EAB308 | 50° | ±8° hue, warmer |
| Tools | Amber | #F97316 | 25° | ±10° hue |
| Other | Neutral gray | #A1A1AA | 240° | ±5° hue, desaturated |

```typescript
const PLANET_COLOR_FAMILIES: Record<string, { h: number; s: number; l: number }> = {
  'IDE': { h: 38, s: 85, l: 55 },
  'AI Tools': { h: 270, s: 75, l: 60 },
  'Browser': { h: 217, s: 80, l: 58 },
  'Entertainment': { h: 347, s: 85, l: 55 },
  'Communication': { h: 173, s: 75, l: 55 },
  'Design': { h: 348, s: 80, l: 50 },
  'Productivity': { h: 50, s: 80, l: 55 },
  'Tools': { h: 25, s: 85, l: 53 },
  'Other': { h: 240, s: 10, l: 55 },
};

function getPlanetColor(category: string, planetName: string): string {
  const family = PLANET_COLOR_FAMILIES[category] || PLANET_COLOR_FAMILIES['Other'];
  const seed = hashString(planetName) % 1000;
  const hueShift = ((seed / 1000) - 0.5) * 24; // ±12°
  const satShift = ((seed / 1000) - 0.5) * 16; // ±8%
  const h = ((family.h + hueShift) % 360 + 360) % 360;
  const s = Math.max(0, Math.min(100, family.s + satShift));
  return `hsl(${h}, ${s}%, ${family.l}%)`;
}
```

**Visual impact:** Each planet now has a distinct color identity. You can distinguish planets by color alone. Category coherence means you can tell "that's an IDE planet" from the warm gold undertone. This is a dramatic improvement over the current gradient where all planets in a system blend together.

---

### A7. Orbital Period Calculation

**Current:** `calculateOrbitalPeriod` at lines 621–624 already uses `T = (2π/k)·r^(3/2)` — correct Keplerian. No change needed.

---

## B. Visual Enhancements & Animations — Complete Design Spec

### B1. Zoom-In to Solar System

| Spec | Value |
|------|-------|
| **Creative decision** | When clicking a category sun in galaxy view, animate the camera in a 3-phase flight: **Approach** (fast, straight line), **Deceleration** (curved, slow down), **Arrival** (gentle settle). During Approach, stars streak past. During Deceleration, the target system's sun glow intensifies. At Arrival, a portal ring ripple fires. |
| **Duration** | 1800ms total (faster than current ~3000ms default) |
| **Easing** | Phase 1 (0–40%): `easeInCubic` for fast start. Phase 2 (40–80%): `easeOutCubic` for deceleration. Phase 3 (80–100%): `easeOutElastic` with slight overshoot + settle. |
| **Camera path** | 3D cubic bezier: `startPos → midpoint (40% of way, offset 20 units up) → offsetPoint (80% of way, 5 units right) → targetPos` |

**Phase breakdown:**

| % | What user sees | Technical state |
|---|---------------|-----------------|
| **0%** | Full galaxy view. Target system highlighted with pulsing ring. | `cameraPos = (gx, gy, 120)`. All systems visible. |
| **25%** | Camera accelerating toward target. Ambient star particles begin streaking (opacity 0 → 0.6). Non-target systems fade to 60% opacity. | Star streak particle system activates. Each star particle becomes a short line. `opacity = easeInCubic(t) * 0.6`. |
| **50%** | Target system fills ~40% of viewport. Star streaks at peak intensity (opacity 0.8). Surrounding systems at 30% opacity. Sun glow visible. | Camera at bezier midpoint. Streak length: 15–25 units. `streakOpacity = 0.8`. |
| **75%** | Target fills ~70%. Star streaks fading (opacity 0.3 → 0). Non-target systems at 10% opacity. Camera decelerating. Sun corona begins to pulse brighter. | `streakOpacity = 0.8 * (1 - easeOutCubic((t - 0.5) * 2))`. Sun emissiveIntensity increasing from 1.0 to 1.4. |
| **100%** | Camera at solar system view position. Star streaks gone. Non-target systems invisible (opacity 0). Portal ring fires. Full system visible. | `cameraPos = (targetX, 30, 60)` (same as `handleCategorySelect` line 3072). Portal ring expand animation runs (800ms). |

**Star streak implementation:**

```typescript
// New component: StarStreakField — visible only during transition
function StarStreakField({ intensity }: { intensity: number }) {
  const pointsRef = useRef<THREE.Points>(null!);
  // 200 random positions, each with a velocity vector pointing toward the target
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(600); // 200 * 3
    const vel = new Float32Array(600);
    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 30 + Math.random() * 60;
      pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.cos(phi) * 0.3;
      pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
      // Velocity: toward camera look direction (negative z in local space)
      vel[i*3] = -pos[i*3] * 0.05;
      vel[i*3+1] = -pos[i*3+1] * 0.05;
      vel[i*3+2] = -pos[i*3+2] * 0.05;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame(() => {
    // Streak effect: each frame, draw lines from position toward velocity direction
    // (Implemented as a custom PointsMaterial with a line texture)
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.5}
        transparent
        opacity={intensity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
```

**Files touched:** Modify `animateCamera` at line 3149 to support phased animation with callbacks. Add `StarStreakField` as a new in-file component. ~120 new lines.

**Complexity:** Complex

---

### B2. Zoom-Out to Galaxy

| Spec | Value |
|------|-------|
| **Duration** | 1400ms |
| **Easing** | `easeInOutQuad` (slow start, fast middle, slow end) |
| **Camera path** | Reverse of zoom-in: start at system position, pull straight back along z-axis, then curve up to galaxy position. |

**Phase breakdown:**

| % | What user sees |
|---|---------------|
| **0%** | Solar system view. User clicks "Galaxy" button. |
| **25%** | Camera pulling back. System shrinks. Portal ring plays in reverse (ring shrinks to point). Sun glow dims. |
| **50%** | Camera at mid-distance. Star streaks reappear briefly (opacity 0.4). Non-target systems begin fading in (opacity 0→40%). |
| **75%** | Camera approaching galaxy position. Star streaks fading. All systems visible at 80% opacity. |
| **100%** | Galaxy view restored. Full system grid visible. |

**Warp distortion:** Apply a brief spherical distortion (0–25% of animation) using a custom post-processing effect: pinching the center of the view (like a reverse fisheye) to simulate "gravity well exit." Duration: 300ms at start of zoom-out.

```typescript
// Uses drei's EffectComposer or a simple custom shader pass
// Pinch effect: sample coordinates closer to center = visually "pulling away"
// Shader snippet:
// vec2 uv = vUv - 0.5;
// float pinch = 1.0 - distortion * (1.0 - length(uv));
// vec2 distortedUv = uv * pinch + 0.5;
```

**Files touched:** Same `animateCamera` with a `direction: 'in' | 'out'` parameter. Distortion via a new `WarpEffect` component using drei's `EffectComposer` + custom shader. ~80 lines.

**Complexity:** Complex

---

### B3. Travel Mode Between Systems

| Spec | Value |
|------|-------|
| **Creative decision** | A "Travel" button appears in solar system view. Clicking it opens a travel HUD with: directional arrow compass (3D arrow pointing to destination system), speed gauge, and "Engage" button. When engaged, the camera flies to the destination with a full warp-speed effect. |
| **UI indicator** | 3D arrow rendered in Three.js (not HTML overlay) that always points toward the target system. Arrow color: cyan `#22D3EE` with a pulsing glow. Arrow follows camera FOV — rotates to point toward target. |
| **Duration** | 2200ms |
| **Easing** | Custom warp curve: `easeInExpo` for first 10% (huge acceleration), linear for 60–90% (sustained high speed), `easeOutCubic` for final 20% (deceleration). |

**Phase breakdown:**

| % | What user sees |
|---|---------------|
| **0%** | User selects destination from a dropdown. Arrow appears pointing toward destination. Camera still in current system. |
| **10%** | User clicks "Engage". Brief flash. Camera accelerates rapidly. Stars begin streaking. Current system planets scale down by 50%. |
| **25%** | Full warp effect: tunnel of streaking stars converging on center. Camera shake begins (amplitude 0.15 units, frequency 30Hz, random x/y offset). Speed lines on screen edges. |
| **50%** | Sustained warp. Star streaks at maximum (opacity 1.0, length 80–150 units). Camera shake continues. A subtle blue/cyan glow at screen edges (vignette-like). Halfway marker appears as a distance counter. |
| **75%** | Approaching destination. Star streaks fading (opacity 0.6). Destination sun visible as growing point of light. Camera shake reducing. |
| **90%** | Deceleration phase. Star streaks gone. Destination system visible and growing. Speed lines fade. |
| **100%** | Arrival at destination system. Portal ring fires. Camera arrives at standard solar system position. |

**Speed line implementation:**

```typescript
// Speed lines: short white/cyan line segments on screen edges
// 100 segments, positioned at z=0 in screen space, radiating outward
function SpeedLines({ intensity }: { intensity: number }) {
  const positions = useMemo(() => {
    const pos: number[] = [];
    for (let i = 0; i < 100; i++) {
      // Edge-weighted random position (bias toward screen edges)
      const edgeBias = Math.random() > 0.5;
      const x = edgeBias ? (Math.random() > 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5) : Math.random() * 2 - 1;
      const y = edgeBias ? Math.random() * 2 - 1 : (Math.random() > 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
      const len = 0.05 + Math.random() * 0.15;
      const angle = Math.atan2(y, x);
      pos.push(x, y, 0, x + Math.cos(angle) * len, y + Math.sin(angle) * len, 0);
    }
    return new Float32Array(pos);
  }, []);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#22D3EE" transparent opacity={intensity * 0.4} />
    </lineSegments>
  );
}
```

**Camera shake:**

```typescript
// In the travel mode useFrame:
const shakeAmplitude = 0.15 * (1 - t); // decays over travel duration
camera.position.x += (Math.random() - 0.5) * shakeAmplitude;
camera.position.y += (Math.random() - 0.5) * shakeAmplitude;
```

**UI:** A travel mode button in the control panel (line ~3216 area) that toggles travel UI. Destination selector as a dropdown.

**Files touched:** Add `TravelMode` component, `SpeedLines` component, modify `SolarSystemView` to inject travel data. ~200 new lines.

**Complexity:** Complex

---

### B4. Spaceship / Probe Representation

| Spec | Value |
|------|-------|
| **Creative decision** | In travel mode, the camera becomes a "probe" — a small dart-shaped mesh visible in reflections (or just the camera shake implies it). Engine trails: a particle stream behind the camera during travel. |
| **Mesh design** | A small tetrahedron (`TetrahedronGeometry(0.3)`) with emissive cyan material at the camera position, but only visible in reflection/self-view mode. Since the camera IS the probe, the user primarily sees its effects (shake, trails, glow), not the mesh itself. |
| **Engine trails** | 50 particles trailing behind the camera position. Each particle: size 0.05–0.15, color cyan `#22D3EE` fading to transparent. Lifetime: 500ms. Emitted at 30/sec during travel. |
| **Camera shake** | See B3 above. Intensity: amplitude 0.15 at peak, frequency randomized 20–40 Hz. |

**Files touched:** Add engine trail particle system within TravelMode. ~60 lines.

**Complexity:** Moderate

---

### B5. System Entry Portal

| Spec | Value |
|------|-------|
| **Creative decision** | When arriving at a system (via zoom-in or travel), a portal ring expands from the system center outward as if the camera "breaks through" a gravity well boundary. |
| **Geometry** | `RingGeometry(innerRadius=2, outerRadius=8)` with custom emissive material. 64 segments. |
| **Animation** | Duration: 800ms. Ring starts at scale 0.1, grows to scale 8.0. Opacity starts at 0.7, decays to 0. Ring color matches destination sun's color. A brief white point light flash at center (intensity 0→5→0 over 400ms). |
| **Particle burst** | 30 small particles (size 0.1–0.3) ejected radially from ring center. Speed: 5–15 units/sec. Color: white → sun color → transparent. Lifetime: 600ms. |
| **Easing** | Ring scale: `easeOutBack` (overshoots 1.1x then settles). Opacity: `easeOutQuad`. |

```typescript
function PortalRing({ sunColor, onComplete }: { sunColor: string; onComplete: () => void }) {
  const ringRef = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const particlesRef = useRef<THREE.Points>(null!);
  const startTime = useRef(Date.now());

  useFrame(() => {
    const t = Math.min((Date.now() - startTime.current) / 800, 1);
    if (ringRef.current) {
      const scale = easeOutBack(t) * 8;
      ringRef.current.scale.setScalar(scale);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 * (1 - easeOutQuad(t));
    }
    if (lightRef.current) {
      const intensity = t < 0.5 ? t * 10 : (1 - t) * 10;
      lightRef.current.intensity = Math.max(0, intensity);
    }
    if (t >= 1 && onComplete) onComplete();
  });

  return (
    <group>
      <mesh ref={ringRef}>
        <ringGeometry args={[2, 8, 64]} />
        <meshBasicMaterial color={sunColor} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <pointLight ref={lightRef} color="#ffffff" intensity={0} distance={20} />
    </group>
  );
}
```

**Files touched:** New `PortalRing` component. Hook into `SolarSystemView` arrival logic. ~70 lines.

**Complexity:** Moderate

---

### B6. Category Switching Animation

| Spec | Value |
|------|-------|
| **Creative decision** | When switching categories (from dropdown), old planets dont vanish instantly — they "de-orbit": their orbit radius shrinks to 0 over 600ms while opacity fades out. New planets "spawn in" from the sun: they start at radius 0 (sun center) and grow to their target orbit over 700ms with a 200ms delay after old planets disappear. |
| **Duration** | Total: 1000ms (600ms old fade + 200ms pause + 700ms new spawn, overlapped by 500ms) |
| **Easing** | De-orbit: `easeInCubic`. Spawn: `easeOutCubic`. |

**Phase breakdown:**

| % | What user sees |
|---|---------------|
| **0%** | User selects new category. All planets at normal positions and sizes. |
| **25%** | Old planets moving toward sun, shrinking. Opacity decreasing. Farthest planets start moving first (staggered by index). |
| **50%** | Old planets nearly at sun center, nearly invisible (~10% opacity). New planets begin emerging from sun as small points. |
| **75%** | New planets ~60% to target radius, growing. Full opacity. Old planets gone. |
| **100%** | New planets at full orbit, full size. System stabilized. |

**Implementation approach:** Use `React.Fragment` with a `transitionKey` state that increments on category change. Add CSS `transition` equivalent via useFrame interpolation:

```typescript
// Each planet has a local animation state:
const [spawnProgress, setSpawnProgress] = useState(0);
const [isSpawning, setIsSpawning] = useState(true);

useEffect(() => {
  if (isNewPlanet) {
    const start = Date.now();
    const animate = () => {
      const t = Math.min((Date.now() - start) / 700, 1);
      setSpawnProgress(easeOutCubic(t));
      if (t < 1) requestAnimationFrame(animate);
      else setIsSpawning(false);
    };
    animate();
  }
}, []);

// Planet position scales with spawnProgress:
// orbitRadius *= spawnProgress
// scale = spawnProgress
```

**Files touched:** Modify `SolarSystemView` to detect category changes and manage spawn state. Add `spawnProgress` to planet rendering. ~50 lines.

**Complexity:** Moderate

---

### B7. Period Change Animation

| Spec | Value |
|------|-------|
| **Creative decision** | When switching Today/Week/Month/All, existing planets smoothly resize to their new data values. New planets (present in new period, absent in old) appear as if "born" from the sun — scaling up from zero. Planets that disappear (no data in new period) shrink into the sun. |
| **Duration** | 800ms |
| **Easing** | Resize: `easeOutQuad`. Spawn: `easeOutBack`. Die: `easeInCubic`. |

**Implementation:** Each planet tracks its previous target radius. On period change, interpolate from old to new radius over 800ms. New planets (no previous data) interpolate from 0. Disappeared planets interpolate to 0.

```typescript
// Each planet stores: prevRadius, targetRadius, animationStartTime
// In useFrame:
const animT = Math.min((Date.now() - animationStartTime) / 800, 1);
const currentRadius = prevRadius + (targetRadius - prevRadius) * easeOutQuad(animT);
meshRef.current.scale.setScalar(currentRadius / baseRadius);
```

**Files touched:** Modify `TexturedPlanet` to accept animated radius. ~40 lines.

**Complexity:** Moderate

---

### B8. Atmospheres (Atmospheric Glow)

| Spec | Value |
|------|-------|
| **Creative decision** | Every planet gets a subtle atmospheric glow ring — a second, slightly larger sphere rendered with back-face culling and additive blending. This creates the illusion of a thin atmosphere catching sunlight. |
| **Geometry** | `sphereGeometry(args=[radius * 1.08, 32, 32])` — 8% larger than planet. |
| **Material** | `meshBasicMaterial` with `transparent: true`, `opacity: 0.08`, `side: THREE.BackSide`, `color: planetColor` desaturated by 50%. |
| **Visual effect** | A faint crescent of light on the planet's edge (opposite the sun). Like Earth's atmosphere seen from space — a thin blue/purple rim. |
| **Per-category variation** | IDE: warm gold atmosphere. Browser: blue atmosphere. Entertainment: pink atmosphere. |
| **Visibility** | Only noticeable on close zoom (when planet occupies >2° of FOV). Adds photorealism without cluttering at distance. |

```typescript
// Inside TexturedPlanet, alongside the main mesh:
<mesh>
  <sphereGeometry args={[data.radius * 1.08, 32, 32]} />
  <meshBasicMaterial
    color={adjustColor(data.color, 30)} // desaturate
    transparent
    opacity={0.08}
    side={THREE.BackSide}
    depthWrite={false}
  />
</mesh>
```

**Files touched:** Add to `TexturedPlanet` component at ~line 1695 area. ~10 lines.

**Complexity:** Trivial

---

### B9. Starfield Background

| Spec | Value |
|------|-------|
| **Creative decision** | Two-layer starfield: **Foreground** (3000 stars, r=150–300, size 0.5–2.0) and **Background** (5000 stars, r=300–800, size 0.3–1.0). Background stars have a subtle parallax (move slower than foreground). Star colors: 70% white, 15% blue-white, 10% yellow-white, 5% red-orange. |
| **Distribution** | Spherical Fibonacci distribution (even coverage) with a "galactic plane" bias: 60% of stars clustered near the ecliptic plane (±15°), 40% scattered across sphere. |
| **Texture** | Canvas-generated star texture: a 32×32 radial gradient with soft falloff (gaussian-like). Each star point samples a random size from this texture. |
| **Parallax** | Background stars: move at 0.1× camera velocity. Foreground stars: move at 0.5× camera velocity. Creates genuine depth. |
| **Twinkle** | 20% of foreground stars twinkle: opacity oscillates 0.5↔1.0 at random frequencies (0.3–1.5 Hz). Implemented in a custom shader or via useFrame per-star animation (CPU). |

```typescript
function Starfield() {
  const count = 8000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rng = createSeededRandom(137);
    for (let i = 0; i < count; i++) {
      // Fibonacci sphere
      const idx = i;
      const phi = Math.acos(1 - 2 * (idx + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * idx;
      // Bias toward ecliptic
      const eclipticBias = rng() < 0.6 ? phi * 0.3 : phi;
      const r = i < 3000 ? 150 + rng() * 150 : 300 + rng() * 500;
      positions[i*3] = r * Math.sin(eclipticBias) * Math.cos(theta);
      positions[i*3+1] = r * Math.cos(eclipticBias) * 0.5;
      positions[i*3+2] = r * Math.sin(eclipticBias) * Math.sin(theta);
      
      // Color
      const colorRng = rng();
      if (colorRng < 0.70) { // white
        colors[i*3] = 1; colors[i*3+1] = 1; colors[i*3+2] = 1;
      } else if (colorRng < 0.85) { // blue-white
        colors[i*3] = 0.8; colors[i*3+1] = 0.9; colors[i*3+2] = 1;
      } else if (colorRng < 0.95) { // yellow-white
        colors[i*3] = 1; colors[i*3+1] = 0.95; colors[i*3+2] = 0.7;
      } else { // red-orange
        colors[i*3] = 1; colors[i*3+1] = 0.6; colors[i*3+2] = 0.3;
      }
      sizes[i] = 0.3 + rng() * 1.7;
    }
    return { positions, colors, sizes };
  }, []);

  // Use a custom PointsMaterial or Points with sprite texture
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
```

**Files touched:** New `Starfield` component. Mount at root of `SolarSystemView`. ~70 lines.

**Complexity:** Moderate

---

### B10. Camera Controls (OrbitControls)

| Spec | Value |
|------|-------|
| **Current** | `OrbitControls` already used with `controlsRef` at line ~2880. No explicit limits set. |
| **Decision** | Add explicit `minDistance` and `maxDistance` based on view mode. Auto-rotation when idle (5s no interaction). |

```typescript
<OrbitControls
  ref={controlsRef}
  enableDamping
  dampingFactor={0.1}
  minDistance={viewMode === 'solarSystem' ? 8 : 50}
  maxDistance={viewMode === 'solarSystem' ? 200 : 400}
  maxPolarAngle={Math.PI * 0.85}
  autoRotate={isIdle}
  autoRotateSpeed={0.3}
/>
```

**Idle detection:** Track `pointerdown`, `pointerup`, `wheel` events. After 5000ms of no interaction, set `isIdle = true`. Auto-rotation resets on any interaction.

**Files touched:** Modify OrbitControls props in `SolarSystemView` or wherever mounted. ~20 lines.

**Complexity:** Trivial

---

### B11. Planet Textures (Procedural Enhancement)

| Spec | Value |
|------|-------|
| **Current** | `createProceduralTexture` at line 1181. Category-specific patterns (bands for IDE, nodes for AI Tools, craters for Browser, etc.). Already quite good. |
| **Decision** | **Enhance** with three additions: (1) Atmospheric haze gradient at terminator (day/night boundary), (2) Specular highlight mask for ocean-like reflections on "wet" categories, (3) Rotation animation speed varies by planet (stored in `rotationSpeed` property). |

**Terminator haze:** A subtle dark gradient at the planet's edge simulating atmospheric scattering. Implemented via a separate canvas overlay blended onto the texture.

**Specular mask:** For "wet" categories (Communication, Design), add random blue-ish patches at mid-latitudes that get a higher specular/reflective value.

**Files touched:** Modify `createProceduralTexture`. ~30 lines.

**Complexity:** Moderate

---

### B12. Sun Lighting

| Spec | Value |
|------|-------|
| **Current** | Two `pointLight`s at lines 1115–1130: one at intensity 8.0, distance 500; secondary at intensity 3.0, distance 300. Both tinted by sunConfig.color. No shadows. |
| **Decision** | Keep both point lights. **Reduce primary** to intensity 5.0 (prevents washout at close range). **Increase secondary** to intensity 4.0 with a wider hue to simulate ambient scattering. Add an **ambientLight** at intensity 0.15 (warm tinted) so planet dark sides are never pure black. |

```typescript
{/* Sun primary light */}
<pointLight position={[0, 0, 0]} color={sunConfig.color} intensity={5.0} distance={500} decay={2} />
{/* Sun ambient/scattered light */}
<pointLight position={[0, 0, 0]} color={sunConfig.color} intensity={4.0} distance={300} decay={2} />
{/* Starfield ambient fill */}
<ambientLight intensity={0.15} color="#444466" />
```

**Visual impact:** Planets have a visible dark side with just enough fill light to see their shape. No pure-black silhouettes. The sun's light is strong enough to cast visible highlights on planets.

**Files touched:** Modify `Sun` component. ~5 lines.

**Complexity:** Trivial

---

### B13. Particle Systems (Asteroids & Dust)

| Spec | Value |
|------|-------|
| **Creative decision** | An asteroid belt ring between the "inner" and "outer" planets (at ~60% of max orbit radius). 300 small particles (size 0.08–0.2) in a torus shape. Slow rotation (0.02 rad/s). Creates a visible "ring of debris" like the real asteroid belt. |
| **Geometry** | Torus distribution: main radius = 65 (between middle and outer planets), tube radius = 8. Random scatter within this volume. |
| **Material** | `PointsMaterial`, color `#888877`, transparent, small size, no lighting. |
| **Dust** | 100 even smaller particles (size 0.03–0.06) scattered throughout the whole system. Creates subtle "space dust" visible when camera moves. |

**Files touched:** New `AsteroidBelt` component. ~50 lines.

**Complexity:** Moderate

---

### B14. Labels

| Spec | Value |
|------|-------|
| **Current** | `Html` wrapper at line 1711 with `distanceFactor={15}`. Always visible at opacity 0.85 (non-hovered) or 1.0 (hovered). Background: `rgba(8, 8, 24, 0.95)` with backdrop blur. |
| **Decision** | **Add distance-based scaling:** Labels scale down as camera zooms out, scaling up as camera zooms in. Formula: `scale = clamp(cameraDistance / 60, 0.5, 1.5)`. At galaxy view distance (z=200), labels are 50% of normal size. At close zoom (z=15), labels are 150%. |
| **Content** | Show app name + time in a single line: "VS Code · 2h 34m". Time uses `formatDurationSeconds` (already at line 2045, format is good). |

```typescript
// In the label group:
const cameraDistance = useThree(s => s.camera.position.distanceTo(meshRef.current.position));
const labelScale = Math.max(0.5, Math.min(1.5, cameraDistance / 60));
// Apply via scale prop on Html element or on parent group
```

**Files touched:** Modify label rendering in `TexturedPlanet`. ~10 lines.

**Complexity:** Trivial

---

## C. Data-Driven Features — Complete Design Spec

### C1. Planet Rings for High-Usage Apps

| Spec | Value |
|------|-------|
| **Threshold** | Apps in the top 25% of usage (within their category) get a planetary ring. |
| **Geometry** | `RingGeometry(innerRadius = planetRadius * 2.2, outerRadius = planetRadius * 3.5)`. 64 segments. |
| **Tilt** | Random ring tilt: 15–35° from planet equator. Achieved by rotating the ring group. |
| **Material** | `meshBasicMaterial` with `transparent: true`, `opacity: 0.35`, `side: THREE.DoubleSide`, `color: planetColor desaturated 40%`. |
| **Rotation** | Ring rotates slowly around its own axis: 0.1–0.3 rad/s (random per ring). |
| **Visual impact** | Top apps get a Saturn-like ring. Makes them visually distinct — you immediately recognize "power users" apps. The ring catches light and creates a subtle glint as it rotates. |

```typescript
// In computePlanets, when building planet data:
const ringThreshold = sortedTimes[Math.floor(sortedTimes.length * 0.25)]; // top 25%
if (appTime >= ringThreshold) {
  planet.rings = [{
    innerRadius: planet.radius * 2.2,
    outerRadius: planet.radius * 3.5,
    color: getRingColor(planet.color),
    opacity: 0.35,
    tilt: 15 + Math.random() * 20,
  }];
}
```

**Files touched:** Modify `computePlanets` at ~line 750 to compute ring eligibility. Modify `PlanetRings` to apply tilt rotation animation. ~30 lines.

**Complexity:** Moderate

---

### C2. Activity Glow — Pulsing on Recently Active Planets

| Spec | Value |
|------|-------|
| **Threshold** | Planets with activity timestamp within the last 5 minutes get an active glow. |
| **Visual** | A pulsing, brighter glow sprite layer above the existing glow. Pulse period: 2 seconds. Opacity oscillates: 0.2 ↔ 0.6. Color: white to planet color gradient. |
| **Implementation** | A second `sprite` with a radial gradient texture. In `useFrame`, compute `pulseOpacity = 0.2 + 0.4 * (0.5 + 0.5 * sin(t * π / 1.0))`. The sprite scale pulses simultaneously: `pulseScale = 1 + 0.15 * sin(t * π / 1.0)`. |
| **Data source** | Planet data includes a `lastActiveTimestamp` field (passed from logs). Compute `isRecentlyActive` based on current time. |

```typescript
// In TexturedPlanet useFrame:
if (data.lastActiveTimestamp && Date.now() - data.lastActiveTimestamp < 5 * 60 * 1000) {
  const pulseT = Date.now() * 0.001;
  const pulseOpacity = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(pulseT * Math.PI));
  const pulseScale = 1 + 0.15 * Math.sin(pulseT * Math.PI);
  activityGlowRef.current.material.opacity = pulseOpacity;
  activityGlowRef.current.scale.setScalar(glowSize * pulseScale);
}
```

**Files touched:** Add `lastActiveTimestamp` to `PlanetData` type. Add activity glow sprite in `TexturedPlanet`. ~30 lines.

**Complexity:** Moderate

---

### C3. Time Display Format

| Spec | Value |
|------|-------|
| **Current** | `formatDurationSeconds` at line 2045. Format: `"2h 34m"`, `"34m"`, `"52s"`. Already correct. |
| **Decision** | **Keep as-is.** The format is clear, concise, and follows the project's existing convention. |

**Files touched:** None.

**Complexity:** Trivial

---

### C4. Moons for Lower-Usage Sub-Apps

| Spec | Value |
|------|-------|
| **Threshold** | Apps that have multiple sub-processes or sub-activities (e.g., "VS Code" → "VS Code extensions") can have moons. For simplicity, each app generates 0–3 moons based on a hash of the app name. |
| **Moon data** | Moon orbit radius: `planetRadius * (2.5 + random * 1.5)`. Moon radius: `0.12 + random * 0.18`. Moon speed: `1.5 + random * 1.0`. |
| **Visual** | Small spheres with `meshStandardMaterial`, color = planet color darkened 30%. Orbit the parent planet in their own `useFrame`. Already implemented at lines 1742–1779 — just need to generate moon data. |

**Files touched:** Modify `computePlanets` to generate moons. ~25 lines.

**Complexity:** Moderate

---

## D. Interactive UX

### D1. Hover Behavior

| Spec | Value |
|------|-------|
| **Delay** | 200ms before showing tooltip (prevents flicker during camera movement). |
| **Tooltip content** | Planet name (bold) + `·` + formatted time (medium weight). Example: `**VS Code** · 2h 34m` |
| **Tooltip position** | Rendered via `Html` in the label group (already done at line 1711). Existing hover state (`isHovered`) toggles label opacity and border color. |
| **Current behavior** | Already implemented: planet name label fades to full opacity on hover, border switches to planet color, box shadow glow appears. Line ~1686–1694 handles pointer events. |
| **Enhancement** | Add time to the label on hover: `VS Code · 2h 34m` (from `formatDurationSeconds`). Include a brief animation: new content slides in from right. |

```typescript
// Modified label content in TexturedPlanet:
<Html center distanceFactor={15}>
  <div style={{ /* ...existing styles... */ }}>
    {data.name}
    {isHovered && (
      <span className="text-zinc-400 ml-1.5 font-normal">
        · {formatDurationSeconds(data.time)}
      </span>
    )}
  </div>
</Html>
```

**Files touched:** Modify label in `TexturedPlanet`. ~5 lines.

**Complexity:** Trivial

---

### D2. Click vs. Select

| Spec | Value |
|------|-------|
| **Current** | Clicking a planet opens the detail panel (line ~1685 `onClick`). No differentiation between brief and sustained click. |
| **Decision** | **Brief click (< 300ms)**: Select planet — show selection highlight ring. **Sustained click (≥ 300ms)**: Open detail panel. |
| **Selection highlight** | A thin ring (`RingGeometry`) around the planet at `planetRadius * 2.0` with the planet's color. Opacity 0.6. Fades out when deselecting (0.6→0 over 300ms). |
| **Implementation** | Use `onPointerDown` and `onPointerUp` to measure click duration. If < 300ms and pointer didn't move > 5px → toggle selection. If ≥ 300ms → open panel. |

```typescript
// In TexturedPlanet:
const pointerDownTime = useRef(0);
const pointerDownPos = useRef({ x: 0, y: 0 });

onPointerDown={(e) => {
  pointerDownTime.current = Date.now();
  pointerDownPos.current = { x: e.clientX, y: e.clientY };
}}
onPointerUp={(e) => {
  const dt = Date.now() - pointerDownTime.current;
  const dx = Math.abs(e.clientX - pointerDownPos.current.x);
  const dy = Math.abs(e.clientY - pointerDownPos.current.y);
  if (dx < 5 && dy < 5) {
    if (dt < 300) onSelect(data); // select
    else onClick(data); // detail panel
  }
}}
```

**Files touched:** Modify `TexturedPlanet` pointer handlers. Add selection ring component. ~40 lines.

**Complexity:** Moderate

---

### D3. Filtering by Min Usage Threshold

| Spec | Value |
|------|-------|
| **UI** | A small range slider (`input type="range"`) in the control panel area (below perf button, around line ~3257). Label: "Min Usage". Values: 0–100% (of max usage in current system). |
| **Behavior** | Planets below the threshold become semi-transparent (opacity 0.12). Their labels still show but at 30% opacity. Orbit rings also dim. This lets users focus on significant apps. |
| **Interaction** | Slider updates in real-time via `onChange`. Debounced at 50ms for performance during 3D rendering. |

```typescript
const [minUsageFilter, setMinUsageFilter] = useState(0);
// Passed to SolarSystemView → each planet checks:
const isFiltered = (data.time / maxTime) < minUsageFilter;
// If filtered: opacity 0.12, label opacity 0.3, no glow effect
```

**Files touched:** Add slider to control panel UI. Add filter logic to planet rendering. ~30 lines.

**Complexity:** Moderate

---

### D4. Search/Zoom to Planet

| Spec | Value |
|------|-------|
| **UI** | A search input at the top of the control panel area. Placeholder: "🔍 Search planet...". Press `Ctrl+F` or `/` to focus. |
| **Behavior** | As user types, planets whose name contains the search string get highlighted (pulsing glow ring, 1.2× scale pulse). Non-matching planets dim to 30% opacity. Press `Enter` to zoom to first matching planet (calls `focusOnPlanet`). Press `Escape` to clear. |
| **Zoom animation** | Reuses existing `focusOnPlanet` at line 3106. |
| **Empty state** | If no match, show "No planets match" text below input. |

**Files touched:** Add search input to control panel. Add highlight/dim state to `SolarSystemView`. ~50 lines.

**Complexity:** Moderate

---

## E. Implementation Roadmap

### Phase 1: Must-Do (Core Realism & Polish)

| # | Item | Files Touched | Lines Changed | Risk | Effort |
|---|------|--------------|--------------|------|--------|
| 1 | **Keplerian orbital speeds** | `OrbitSystem.tsx` (ORBIT_CONFIG, calculateAngularSpeed) | 10 | Low | 15 min |
| 2 | **Improved eccentricities & inclinations** | `OrbitSystem.tsx` (computeEccentricity, computeInclination) | 15 | Low | 10 min |
| 3 | **Wider orbit spacing** | `OrbitSystem.tsx` (ORBIT_CONFIG, calculateOrbitRadius) | 10 | Low | 10 min |
| 4 | **New planet color system** | `OrbitSystem.tsx` (getPlanetColor, PLANET_COLOR_FAMILIES) | 40 | Low | 30 min |
| 5 | **Improved planet sizing** | `OrbitSystem.tsx` (computePlanets radius formula) | 3 | Low | 5 min |
| 6 | **Starfield background (2-layer)** | New `Starfield` component in `OrbitSystem.tsx` | 70 | Low | 45 min |
| 7 | **Planet atmospheres** | `TexturedPlanet` mesh addition | 10 | Low | 10 min |
| 8 | **Zoom-in/out camera animation** | `animateCamera`, `SolarSystemView` transition logic | 80 | Medium | 60 min |
| 9 | **Portal ring effect on arrival** | New `PortalRing` component | 70 | Low | 30 min |
| 10 | **Hover tooltip with time** | `TexturedPlanet` label | 5 | Low | 5 min |
| 11 | **Distance-scaled labels** | `TexturedPlanet` label | 10 | Low | 10 min |
| 12 | **Sun lighting adjustments** | `Sun` component | 5 | Low | 5 min |
| 13 | **Ring for top 25% apps** | `computePlanets`, `PlanetRings` | 30 | Low | 20 min |
| 14 | **Activity pulse glow** | `TexturedPlanet` sprite | 30 | Low | 20 min |
| 15 | **Time display format** | Already done (`formatDurationSeconds`) | 0 | None | 0 min |

**Total Phase 1:** ~388 lines, all low risk except camera animation (medium).

### Phase 2: Should-Do (Animations & UX)

| # | Item | Files Touched | Lines Changed | Risk | Effort |
|---|------|--------------|--------------|------|--------|
| 16 | **Category switch animation** | `SolarSystemView` spawn/de-orbit logic | 50 | Medium | 30 min |
| 17 | **Period change animation** | `TexturedPlanet` animated radius | 40 | Low | 20 min |
| 18 | **Click vs select distinction** | `TexturedPlanet` pointer handlers | 40 | Low | 20 min |
| 19 | **Filter slider** | Control panel UI + planet dim | 30 | Low | 15 min |
| 20 | **Search input** | Control panel + highlight | 50 | Low | 30 min |
| 21 | **Moons for sub-apps** | `computePlanets` moon generation | 25 | Low | 15 min |
| 22 | **Asteroid belt** | New `AsteroidBelt` component | 50 | Low | 20 min |

**Total Phase 2:** ~285 lines, medium risk for category animation (may need state management refactoring).

### Phase 3: Nice-to-Have (WOW Factor)

| # | Item | Files Touched | Lines Changed | Risk | Effort |
|---|------|--------------|--------------|------|--------|
| 23 | **Travel mode with warp effect** | `TravelMode`, `SpeedLines`, camera shake | 200 | High | 120 min |
| 24 | **Spaceship probe + engine trails** | Particle system | 60 | Medium | 30 min |
| 25 | **Texture enhancement (terminator, specular)** | `createProceduralTexture` | 30 | Low | 20 min |
| 26 | **OrbitControls auto-rotation** | Controls props | 20 | Low | 10 min |
| 27 | **Warp distortion effect on exit** | Post-processing shader | 50 | Medium | 40 min |

**Total Phase 3:** ~360 lines, high risk for travel mode (complex state, performance).

---

## F. Performance Budget

### Phase 1 Items — FPS Impact Analysis

| Item | Draw Calls Added | GPU/CPU | FPS Impact (est) | Mitigation |
|------|-----------------|---------|-----------------|------------|
| **Keplerian speeds** | 0 | CPU | 0% | Math only, no rendering |
| **Eccentricity/inclination** | 0 | CPU | 0% | Math only |
| **Orbit spacing** | 0 | CPU | 0% | Config change |
| **Color system** | 0 | CPU | 0% | Math only |
| **Planet sizing** | 0 | CPU | 0% | Math only |
| **Starfield** | 1 draw call (8000 points) | GPU | -3% | Single draw call, instanced |
| **Atmospheres** | 0 (same mesh, additional material) | GPU | -1% | 1 extra render pass per planet |
| **Zoom camera** | 0 | CPU | 0% | JS animation only |
| **Portal ring** | 1 mesh + 1 point light | GPU | -1% (temporary) | Only active for 800ms |
| **Hover tooltip** | 0 | CPU | 0% | React re-render only |
| **Distance labels** | 0 | CPU | 0% | Math per frame |
| **Sun lighting** | 0 | GPU | 0% | Config change |
| **Rings** | up to 10 meshes | GPU | -2% | Double-sided, low segment count |
| **Activity glow** | up to 10 sprites | GPU | -2% | Additive blending, small textures |

**Total Phase 1 FPS impact estimate:** ~8% reduction from baseline (~60 FPS → ~55 FPS on mid-range). Within 30+ FPS budget comfortably.

**Phase 2/3 items:** Travel mode may add ~5% FPS impact during active travel (particles + camera shake). Auto-rotation adds ~0% (built-in OrbitControls).

### Key Performance Strategies:

1. **Pre-compute all procedural textures** in `useMemo` with stable seeds (already done). No regeneration per frame.
2. **Single draw call for starfield** (8000 points in one `THREE.Points`).
3. **Portal ring is ephemeral** — self-destructs after 800ms.
4. **Camera shake is CPU-only** — no GPU impact.
5. **Moons, if implemented, use `useFrame` with simple math** — cheaper than additional draw calls for separate groups.
6. **Filter slider debounced at 50ms** — prevents rapid opacity changes from causing layout recalculations.

---

## Summary of Key Design Decisions

| Category | Decision |
|----------|----------|
| **Orbit spacing** | Logarithmic with `spacingExponent: 0.8`, wider range (10–110) |
| **Orbital speeds** | Pure Keplerian ω ∝ r^(-1.5) + visual boost for outer planets |
| **Eccentricity** | Inner: 0.04–0.15, Outer: 0.01–0.06 |
| **Inclination** | 0–6°, deterministic from planet name hash |
| **Planet sizes** | `max(0.3, sqrt(time/maxTime) * 1.2)`, sun at 4 units |
| **Planet colors** | Category-based HSL families with per-planet variation |
| **Starfield** | 2-layer: 3000 foreground + 5000 background, parallax, 8000 total points |
| **Atmospheres** | Back-face sphere, 8% larger, opacity 0.08 |
| **Zoom-in animation** | 3-phase bezier, 1800ms, star streaks, portal ring on arrival |
| **Zoom-out animation** | 1400ms, reverse star streaks, warp distortion (300ms) |
| **Portal ring** | RingGeometry, 800ms expand + fade, white flash + particle burst |
| **Category switch** | De-orbit (600ms) → pause (200ms) → spawn (700ms) |
| **Period change** | Interpolated resize, dead planets shrink to 0, new ones grow from sun |
| **Rings** | Top 25% apps get Saturn-style ring, 15–35° tilt, 0.35 opacity |
| **Activity glow** | Pulsing sprite on planets active within 5 min, 2s period |
| **Hover** | 200ms delay, shows name + formatted time |
| **Click vs select** | < 300ms → select ring, ≥ 300ms → detail panel |

### Ready to Implement in Phase 1:

**All 15 items** designated as Phase 1 are immediately implementable. They require no new dependencies, no architectural changes, and follow existing code patterns. Estimated total effort: ~4 hours for a developer familiar with the codebase. The largest single item is the starfield (70 lines, 45 min) and the zoom camera animation (80 lines, 60 min).

Phase 1 items are ordered by dependency: config changes first (1–5), then visual elements (6–14), with utilities (15) already done.
