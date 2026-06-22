# 🎨 Code Patterns

**Purpose:** Common code patterns and conventions used in DeskFlow.

---

## ⚛️ React Patterns

### Component Template
```tsx
interface Props {
  data: DataType;
  onAction: () => void;
}

function MyComponent({ data, onAction }: Props) {
  const ref = useRef<THREE.Mesh>(null!);
  const [state, setState] = useState(false);

  const computed = useMemo(() => {
    return expensiveComputation(data);
  }, [data]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.5;
    }
  });

  return <mesh ref={ref} onClick={onAction}>{/* ... */}</mesh>;
}

export default MyComponent;
```

### State Management
```tsx
// Local state
const [isPaused, setIsPaused] = useState(false);

// Derived state
const planets = useMemo(() => computePlanets(logs), [logs]);

// Refs for Three.js
const meshRef = useRef<THREE.Mesh>(null!);
const controlsRef = useRef<any>(null);

// Event handlers
const handleClick = useCallback((data) => {
  setSelectedPlanet(data);
}, []);
```

---

## 🌌 Three.js / R3F Patterns

### Textured Planet
```tsx
function TexturedPlanet({ data }: { data: PlanetData }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Draw patterns...
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, [data.category, data.color]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[data.radius, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        normalMap={normalMap}
        normalScale={0.8}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
}
```

### Orbit Path
```tsx
function OrbitPath({ planet }: { planet: PlanetData }) {
  const points = useMemo(() => {
    const curvePoints: THREE.Vector3[] = [];
    const segments = 256;
    const { eccentricity, orbitRadius, inclination, longitudeOfPerihelion } = planet;
    const semiLatusRectum = orbitRadius * (1 - eccentricity * eccentricity);

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const distance = semiLatusRectum / (1 + eccentricity * Math.cos(angle + longitudeOfPerihelion));
      const x = Math.cos(angle + longitudeOfPerihelion) * distance;
      const z = Math.sin(angle + longitudeOfPerihelion) * distance * Math.cos(inclination);
      const y = Math.sin(angle + longitudeOfPerihelion) * distance * Math.sin(inclination) * 0.3;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
    return curvePoints;
  }, [planet]);

  return <Line points={points} color={planet.color} lineWidth={1.5} opacity={0.17} />;
}
```

---

## 🔌 Electron IPC Patterns

### Preload Script
```typescript
// preload.ts
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deskflowAPI', {
  getLogs: () => ipcRenderer.invoke('get-logs'),
  getStats: () => ipcRenderer.invoke('get-stats'),
  onForegroundChange: (cb: (data: any) => void) => {
    const listener = (_: any, data: any) => cb(data);
    ipcRenderer.on('foreground-changed', listener);
    return () => ipcRenderer.removeListener('foreground-changed', listener);
  }
});
```

### Main Process Handler
```typescript
// main.ts
ipcMain.handle('get-logs', async () => {
  try {
    return getLogs();
  } catch (err: any) {
    console.error('[DeskFlow] Error:', err.message);
    return [];
  }
});
```

### Renderer Usage
```typescript
// App.tsx
useEffect(() => {
  const loadLogs = async () => {
    if (window.deskflowAPI) {
      const logs = await window.deskflowAPI.getLogs();
      setLogs(logs);
    }
  };
  loadLogs();
}, []);
```

---

## 🗄️ Database Patterns

### SQLite with JSON Fallback
```typescript
// main.ts
let db: any = null;
let useJson = false;

function initializeStorage() {
  try {
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
    db.exec(`CREATE TABLE IF NOT EXISTS logs (...)`);
  } catch (err: any) {
    useJson = true;
    jsonLogs = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  }
}

function addLog(data: LogData) {
  if (useJson) {
    jsonLogs.unshift(data);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonLogs));
  } else {
    const stmt = db.prepare('INSERT INTO logs ...');
    stmt.run(data);
  }
}
```

---

## 🎨 Texture Generation Patterns

### Category-Based Textures
```typescript
function createTexture(color: string, category: string, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(seed);

  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, 1024, 512);

  if (category === 'IDE') {
    // Gas giant bands
    drawBands(ctx, color, rand);
  } else if (category === 'AI Tools') {
    // Spiral galaxy
    drawSpirals(ctx, color, rand);
  }
  // ... other categories

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
```

### Seeded Random
```typescript
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}
```

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-04 | Initial creation |

---

**Last Updated:** 2026-04-04
**Maintained By:** AI Development Team
