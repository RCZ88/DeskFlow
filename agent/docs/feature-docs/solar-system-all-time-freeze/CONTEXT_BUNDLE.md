# CONTEXT_BUNDLE.md — Solar System "All Time" Freeze + 5GB RAM Leak

> Self-contained context for the target AI. All code paths, data shapes, and IPC endpoints necessary to design a fix are documented below.

---

## 1. Problem Summary

When switching the solar system period selector to "All Time":
- **RAM spikes to 5GB+** within a few period switches
- **UI freezes** for hundreds of ms to multiple seconds
- Works fine for Today / Week / Month periods (smaller datasets)

---

## 2. Root Cause Diagnosis

### Memory Leak (5GB RAM)
`TexturedPlanet` (OrbitSystem.tsx:1459) creates THREE.CanvasTexture objects at **1024×512 resolution** (2MB each) in `useMemo`. **None of these textures are ever disposed** on component unmount. With 80 planets × 3 textures each (color texture + normal map + glow texture) = **~328MB leaked per period switch**. After ~16 switches → 5GB+.

### Freeze (Blocked Render Thread)
Synchronous canvas drawing in `createProceduralTexture` (1024×512) and `createProceduralNormalMap` (1024×512) for all 80 planets blocks the React render thread for ~5-10ms per texture × 240 textures = 500ms+ of synchronous work.

### Secondary: Main-Process Blocking
`get-dashboard-aggregates` IPC handler runs synchronous better-sqlite3 queries over the full `stats_daily` table for "all" time (date range 2000-01-01 to present). The main process event loop is blocked during SQL execution.

---

## 3. Architecture: Data Flow

**Period switch → IPC → Backend → IPC response → Renderer data transform → OrbitSystem → Three.js scene**

```
User clicks "All" button
  → OrbitSystem.onPeriodChange('all')
  → App.tsx setSelectedPeriod('all')
  → DashboardPage.tsx:404 useEffect fires
  → window.deskflowAPI.getDashboardAggregates({period:'all', ...})
  → ipcRenderer.invoke('get-dashboard-aggregates')
  → [MAIN] ipcMain.handle('get-dashboard-aggregates')
  → [MAIN] 6 synchronous SQL queries on stats_daily + buildWeeklyHeatmap()
  → [MAIN] JSON response { weeklyHeatmap, hourlyHeatmap, websiteStats, appStats, overview, recentSessions }
  → [RENDERER] setDashboardData(data)
  → orbitLogs = useMemo: dashboardData.appStats.map(...) → ActivityLog[]
  → OrbitSystem receives new `logs` prop
  → filteredLogs = logs (skip filter when externalPeriod provided)
  → appSolarSystems = computeSolarSystems(filteredLogs, ...)
  → planets = computePlanets(appSolarSystems, ...) [capped at 80]
  → SolarSystemScene renders 80 TexturedPlanet components
  → Each TexturedPlanet creates THREE.CanvasTexture(1024×512) in useMemo
  → [5GB LEAK] Textures never disposed on unmount
```

---

## 4. Key Code Sections

### 4.1 TexturedPlanet — Memory Leak Source (OrbitSystem.tsx:1459-1751)

The texture creation in useMemo (lines 1492-1513) creates THREE.CanvasTexture objects that are never disposed:

```typescript
// OrbitSystem.tsx:1492-1513
const { texture, normalMap, glowTexture } = useMemo(() => {
    const seed = hashString(data.name);
    const tex = createProceduralTexture(data.color, data.category, seed);  // 1024×512 → 2MB
    const nrm = createProceduralNormalMap(data.color, data.category, seed); // 1024×512 → 2MB

    // Create glow texture (radial gradient sprite)
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    // ...radial gradient drawing...
    const glowTex = new THREE.CanvasTexture(glowCanvas); // 128×128 → 64KB

    return { texture: tex, normalMap: nrm, glowTexture: glowTex };
}, [data.name, data.color, data.category]);
```

Per-planet THREE.js objects NOT disposed on unmount:
- `texture`: THREE.CanvasTexture from 1024×512 canvas
- `normalMap`: THREE.CanvasTexture from 1024×512 canvas
- `glowTexture`: THREE.CanvasTexture from 128×128 canvas
- `hologramGeo` (line 1516-1518): `new THREE.IcosahedronGeometry(data.radius * 1.6, 1)`

### 4.2 createProceduralTexture (OrbitSystem.tsx:1116-1348)

```typescript
// OrbitSystem.tsx:1116-1119
function createProceduralTexture(color: string, category: string, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
```

### 4.3 createProceduralNormalMap (OrbitSystem.tsx:1349-1458)

```typescript
// OrbitSystem.tsx:1349-1352
function createProceduralNormalMap(color: string, category: string, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
```

### 4.4 GLCleanup — Only Disposes Scene Objects, NOT External Textures (OrbitSystem.tsx:10-58)

```typescript
// OrbitSystem.tsx:10-40
function GLCleanup() {
  const { gl, scene } = useThree();
  useEffect(() => {
    return () => {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) { object.geometry.dispose(); }
          if (object.material) {
            // disposes material.map, material.normalMap, material.emissiveMap, material.alphaMap, and material itself
          }
        }
      });
      gl.dispose();
    };
  }, []);
  return null;
}
```

This cleanup only runs when the **entire Canvas** unmounts. Textures created externally (via `new THREE.CanvasTexture()`) and passed as `map` prop to R3F `<meshStandardMaterial>` are not tracked by R3F's lifecycle — they persist even after TexturedPlanet unmounts.

### 4.5 useLODGeometry — Proper Disposal Pattern (OrbitSystem.tsx:1755-1771)

```typescript
// OrbitSystem.tsx:1755-1771 — EXAMPLE OF CORRECT DISPOSAL
function useLODGeometry(radius: number) {
  const [detail, setDetail] = useState(32);
  const ref = useRef<{ lastDetail: number; disposer: (() => void) | null }>({ lastDetail: 0, disposer: null });

  const geometry = useMemo(() => {
    ref.current.disposer?.();     // ← Disposes OLD geometry before creating new one
    const geo = new THREE.SphereGeometry(radius, detail, detail);
    ref.current.lastDetail = detail;
    const dispose = () => geo.dispose();
    ref.current.disposer = dispose;
    return geo;
  }, [radius, detail]);

  useEffect(() => () => ref.current.disposer?.(), []); // ← Disposes on unmount

  return { geometry, setDetail, detail };
}
```

### 4.6 computePlanets — Planet Generation (OrbitSystem.tsx:626-745)

Key details:
- `MAX_RENDERED_PLANETS = 80` (cap at top)
- `MIN_PLANET_TIME_SECONDS = 30` (minimum threshold)
- Sorts apps by usage ascending, slices last 80
- Returns `PlanetData[]` with fields: `name`, `category`, `color`, `time`, `radius`, `orbitRadius`, `speed`, `eccentricity`, `inclination`, `moons[]`, `rings[]`

### 4.7 SolarSystemScene Render (OrbitSystem.tsx:2341-2373)

```typescript
<meshStandardMaterial
  map={texture}               // ← Externally created texture, NOT managed by R3F
  normalMap={normalMap}       // ← Externally created texture, NOT managed by R3F
  emissiveMap={texture}       // ← Same external texture
/>
```

### 4.8 IPC Handler: get-dashboard-aggregates (main.ts:4773-4929)

Full handler with 6 SQL queries. For "all" period:
- `computePeriodRange('all')` → `{ start: '2000-01-01', end: tomorrow }`
- Query 1: ALL `stats_daily` rows → synchronous SQL
- Query 3/4: GROUP BY aggregations on full table
- Line 4829-4834: Iterates ALL weeklyRows again (double pass)
- Fallback (line 4856): If stats_daily empty, queries raw `logs` table

```typescript
// main.ts:4774
ipcMain.handle('get-dashboard-aggregates', async (_, request) => {
    const periodRange = computePeriodRange(period, dateOffset);
    // 'all' → start='2000-01-01', end=tomorrow
    
    // Query 1: ALL stats_daily rows
    const weeklyRows = db.prepare(`
        SELECT date, app_name, total_seconds FROM stats_daily
        WHERE date >= ? AND date <= ? ORDER BY date
    `).all(periodRange.start, periodRange.end);
    
    // For "all" with 3 years × 200 apps = ~219K rows
    // This entire array sits in main process memory during handler execution
    
    const weeklyHeatmap = buildWeeklyHeatmap(weeklyRows, tierMap);
    // buildWeeklyHeatmap iterates ALL rows, creates Map, then result array
    
    // ... more queries ...
    
    // Line 4829: Second pass over ALL weeklyRows for tier breakdown
    for (const row of weeklyRows) { /* ... */ }
});
```

### 4.9 DashboardPage: orbitLogs Transform (DashboardPage.tsx:2108-2130)

```typescript
// DashboardPage.tsx:2108-2118
const orbitLogs = useMemo(() => {
    if (!dashboardData?.appStats) return [];
    return dashboardData.appStats.map((s, i) => ({
      id: i,
      timestamp: new Date(),
      app: s.app || s.app_name || '',
      category: s.category || 'Other',
      duration: Math.round(s.totalSeconds || 0),
    })).filter((l: any) => l.app);
}, [dashboardData?.appStats]);
```

### 4.10 Period Change Effect (DashboardPage.tsx:404-421)

```typescript
// DashboardPage.tsx:404-421
useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await window.deskflowAPI.getDashboardAggregates({
        period: selectedPeriod, dateOffset, weekOffset,
      });
      if (cancelled) return;
      setDashboardData(data);
    })();
    return () => { cancelled = true; };
}, [selectedPeriod, dateOffset, weekOffset]);
```

---

## 5. Data Shapes

### IPC Request (get-dashboard-aggregates)
```typescript
{ period: 'today' | 'week' | 'month' | 'all'; dateOffset?: number; weekOffset?: number }
```

### IPC Response
```typescript
{
  weeklyHeatmap: Array<{ date: string; dayLabel: string; totalDuration: number; productiveHours: number; neutralHours: number; distractingHours: number }>;
  hourlyHeatmap: Record<string, Record<number, { appSeconds: number; domainSeconds: number; productive: number; neutral: number; distracting: number; apps: Record<string, { seconds: number; tier: string }> }>>;
  websiteStats: Array<{ domain: string; category: string; totalSeconds: number; sessions: number }>;
  appStats: Array<{ app: string; category: string; totalSeconds: number; sessions: number; tier: string }>;
  overview: { totalSeconds: number; productiveSeconds: number; neutralSeconds: number; distractingSeconds: number };
  recentSessions: Array<{ id: number; timestamp: string; app: string; title: string | null; durationSeconds: number; category: string; isBrowser: boolean; domain: string | null; url: string | null; elapsed: string }>;
}
```

### ActivityLog (input to OrbitSystem)
```typescript
interface ActivityLog {
  id: number;
  timestamp: Date;
  app: string;
  category: string;
  duration: number; // seconds
  domain?: string;
  is_browser_tracking?: boolean;
  project?: string;
}
```

### PlanetData (computed from ActivityLog)
```typescript
interface PlanetData {
  name: string;
  category: string;
  color: string;
  time: number; // seconds
  sessions: number;
  radius: number;
  orbitRadius: number;
  speed: number;
  orbitalPeriod: number;
  eccentricity: number;
  inclination: number;
  longitudeOfPerihelion: number;
  moons: Array<{ name: string; radius: number; orbitRadius: number; speed: number; color: string }>;
  rings: Array<{ innerRadius: number; outerRadius: number; opacity: number; color: string; tilt: number }>;
  rotationSpeed?: number;
}
```

---

## 6. Affected Files

| File | Lines | Role |
|------|-------|------|
| `src/components/OrbitSystem.tsx` | 1116-1348 | `createProceduralTexture` — creates 1024×512 canvas textures |
| `src/components/OrbitSystem.tsx` | 1349-1458 | `createProceduralNormalMap` — creates 1024×512 canvas textures |
| `src/components/OrbitSystem.tsx` | 1459-1751 | `TexturedPlanet` — creates textures in useMemo, never disposes |
| `src/components/OrbitSystem.tsx` | 10-58 | `GLCleanup` — only runs on full Canvas unmount |
| `src/components/OrbitSystem.tsx` | 1755-1771 | `useLODGeometry` — CORRECT disposal pattern (reference) |
| `src/components/OrbitSystem.tsx` | 626-745 | `computePlanets` — capped at 80 planets |
| `src/components/OrbitSystem.tsx` | 2341-2373 | `SolarSystemScene` — renders TexturedPlanet with external textures |
| `src/components/OrbitSystem.tsx` | 3245-4108 | Main OrbitSystem component — data flow |
| `src/pages/DashboardPage.tsx` | 404-421 | Period change effect → triggers IPC fetch |
| `src/pages/DashboardPage.tsx` | 2108-2130 | `orbitLogs` transform → appStats → ActivityLog[] |
| `src/main.ts` | 4773-4929 | `get-dashboard-aggregates` IPC handler — synchronous SQL |
| `src/main.ts` | 4569-4600 | `computePeriodRange` — 'all' → 2000-01-01 |
| `src/preload.ts` | 44-46 | `getDashboardAggregates` → `ipcRenderer.invoke` |

---

## 7. Build Commands

```bash
# Full build
node scripts/build.mjs

# Rebuild preload separately
npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs
```

---

## 8. Constraints

- Prefer renderer-side fixes (AGENTS.md invariant)
- All localStorage access must be wrapped in try/catch
- Do NOT remove existing features or UI elements without confirmation
- The 80-planet cap and 30s minimum threshold are already applied
