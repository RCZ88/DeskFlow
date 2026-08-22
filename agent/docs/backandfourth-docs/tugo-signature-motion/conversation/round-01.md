# Round 01 — Specialist AI Response

## What Specialist Produced

The Specialist AI responded with a complete design concept called **"The Current"** — a persistent directional pulse moving through a continuous visual field.

### Key Design Decisions

1. **NOT a background effect** — persistent visual entity, independent of route
2. **Two-layer model:** LivingSubstrate = "RHEO is alive" (ambient), The Current = "RHEO is moving" (semantic)
3. **Topology changes per page** — physics stay recognizable, shape changes
4. **Pulse phase persists** across navigation — geometry changes, phase doesn't
5. **10 mechanics become semantic renderers** — `<RheoCurrent mode="network" />` not `<AdjacentBackground />`
6. **Visualization primitives:** Pulse, Stream, Node, Edge, Branch, Orbit, Field, Contour, Signal, Mask

### Page Topology Map

| Page | Topology |
|------|----------|
| Dashboard | Trajectory (horizontal line with event deviations) |
| Life | Network (branching relationships) |
| Finance | Flow (income/expense streams) |
| Activity | Signal (temporal history) |
| Goals | Trajectory toward destination |
| Projects | Branching processes |
| External | Incoming streams |
| Learn | Branching knowledge |
| Reports | Signal over time |
| IDE | Mechanical precision |
| Database | Spatial partition |
| Settings | Redaction/transformation |
| AI | Cellular evolution |
| Studio | Flow through pipeline |

### Specialist's Question

> "What is the minimal invariant state of The Current — the data structure that persists across route changes — and how do the 14 page semantics transform that state without breaking the visual continuity of the pulse?"

---

## My Response (Project Owner)

### The Minimal Invariant State

```ts
interface CurrentState {
  // PERSISTS across all route changes — never resets
  phase: number;          // 0.0–1.0, the pulse position along the stream
  timestamp: number;      // when phase was last updated (Date.now())
  
  // CHANGES on route transition — interpolated over 300ms
  mode: CurrentMode;      // topology type
  accent: string;         // --page-accent hex
  
  // PAGE-SPECIFIC — rebuilt when route changes
  entities: CurrentEntity[];  // nodes, branches, streams specific to current page
}

type CurrentMode = 
  | "continuous"   // Dashboard — horizontal trajectory
  | "network"      // Life — force graph branches
  | "flow"         // Finance, External — stream splitting
  | "signal"       // Activity, Reports — parallel traces
  | "trajectory"   // Goals — path toward endpoint
  | "branching"    // Learn, Projects — knowledge/process tree
  | "mechanical"   // IDE — gear rotation
  | "partition"    // Database — Voronoi cells
  | "cellular"     // AI — grid evolution
  | "redaction";   // Settings — masking zones

interface CurrentEntity {
  id: string;
  type: 'node' | 'branch' | 'stream' | 'pulse' | 'orbit' | 'field' | 'contour' | 'signal' | 'mask';
  x: number;
  y: number;
  metadata?: Record<string, any>;
}
```

### How Topology Transitions Work

When the user navigates (Dashboard → Life):

1. **Old mode** starts fading out (opacity 1→0 over 200ms)
2. **New mode** starts fading in (opacity 0→1 over 200ms)
3. **Phase continues** — never stops, never resets
4. **Crossfade** uses a shared canvas layer — old topology and new topology exist briefly simultaneously
5. **After crossfade completes** — old mode is removed from render tree

```ts
// Transition state
interface CurrentTransition {
  from: CurrentMode;
  to: CurrentMode;
  progress: number;  // 0→1 over 300ms
  active: boolean;
}
```

### How Each Page Builds Its Entities

```ts
function buildDashboardEntities(data: DashboardData): CurrentEntity[] {
  // Horizontal stream from left to right
  // Deviation points where events occurred
  // Pulse marker at "NOW" position
  return [
    { id: 'main-stream', type: 'stream', x: 0, y: 0.5 },
    { id: 'pulse-now', type: 'pulse', x: data.nowPosition, y: 0.5 },
    ...data.events.map(e => ({
      id: e.id, type: 'node' as const, 
      x: e.timePosition, y: 0.5 + e.deviation
    }))
  ];
}

function buildLifeEntities(data: LifeData): CurrentEntity[] {
  // Central node (self)
  // Branches to people, goals, memories
  // Branch thickness = relationship strength
  return [
    { id: 'self', type: 'node', x: 0.5, y: 0.5 },
    ...data.people.map(p => ({
      id: p.id, type: 'branch' as const,
      x: p.x, y: p.y, metadata: { strength: p.strength }
    }))
  ];
}

function buildFinanceEntities(data: FinanceData): CurrentEntity[] {
  // Main stream splits into income/expense
  // Income streams flow in from top
  // Expense streams flow out to bottom
  return [
    { id: 'main-flow', type: 'stream', x: 0.5, y: 0.5 },
    ...data.incomeStreams.map(s => ({
      id: s.id, type: 'stream' as const,
      x: s.x, y: 0, metadata: { amount: s.amount }
    })),
    ...data.expenseStreams.map(s => ({
      id: s.id, type: 'stream' as const,
      x: s.x, y: 1, metadata: { amount: s.amount }
    }))
  ];
}
```

### Architecture: Where RheoCurrent Mounts

```tsx
// In App.tsx — OUTSIDE <Routes>, same level as AppBackground
function App() {
  return (
    <div className="dk-root">
      <AppBackground pathname={pathname} />
      <RheoCurrent 
        pathname={pathname}
        accent={PAGE_ACCENTS[pathname]}
        data={currentData}  // page-specific data from hooks
      />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        {/* ... */}
      </Routes>
    </div>
  );
}
```

### Rendering Strategy

**Use Canvas 2D** (not WebGL, not CSS):

- Canvas 2D is lightweight, no Three.js dependency
- Handles lines, curves, points, gradients easily
- Can share the same z-[0] layer as AppBackground
- Performance: 60fps with < 1000 points is trivial
- Reduced motion: freeze the canvas, still shows the topology

```tsx
function RheoCurrent({ pathname, accent, data }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CurrentState>(initialState);
  const prevModeRef = useRef<CurrentMode>(initialMode);
  
  useEffect(() => {
    // Route changed — start topology transition
    prevModeRef.current = stateRef.current.mode;
    stateRef.current.mode = getModeFromPath(pathname);
    stateRef.current.entities = buildEntities(pathname, data);
    stateRef.current.accent = accent;
  }, [pathname]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animId: number;
    const loop = () => {
      // Update phase (never stops)
      stateRef.current.phase = (stateRef.current.phase + 0.001) % 1;
      
      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderCurrent(ctx, stateRef.current, canvas.width, canvas.height);
      
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    
    // Pause on hidden
    const onVisChange = () => {
      if (document.hidden) cancelAnimationFrame(animId);
      else animId = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVisChange);
    
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 z-[0] pointer-events-none"
      style={{ opacity: 0.12 }}
    />
  );
}
```

### Key Invariants

1. **Phase never resets** — `stateRef.current.phase` increments continuously across route changes
2. **One canvas, not 14** — single `<canvas>` element, render function switches based on mode
3. **Topology crossfades** — old mode fades out while new fades in, 200ms overlap
4. **Reduced motion = static** — freeze phase, still render the topology at current position
5. **Performance budget:** < 5% GPU = < 1000 points, Canvas 2D only, no WebGL

---

## Specialist's Follow-up Question

> "How does the phase persist when the canvas element is unmounted and remounted?"

### Answer

The canvas does NOT unmount. It lives at the same level as AppBackground — outside `<Routes>`. React Router changes the page content below it, but the `<RheoCurrent />` component stays mounted for the entire app lifetime.

```tsx
// App.tsx — RheoCurrent is a sibling to Routes, never unmounts
<AppBackground pathname={pathname} />
<RheoCurrent pathname={pathname} accent={accent} data={data} />
<Routes>{/* page content changes here */}</Routes>
```

The phase lives in `useRef` (not useState), so it survives re-renders. The canvas element is never removed from the DOM.

If for some reason the component DID remount (e.g., error boundary), the phase would restart from 0 — but this is acceptable since it's an edge case.

---

## Convergence Status

**Ongoing.** Specialist may have follow-up questions about:
- How entities are fetched per page
- How the workspace terminal integrates
- Exact rendering algorithm for each mode
- Touch/interaction support
