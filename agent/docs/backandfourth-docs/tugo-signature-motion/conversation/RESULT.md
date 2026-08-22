# RESULT.md — RHEO "The Current" Architecture

> Final converged specification from Specialist AI. This IS the implementation contract.

## 1. Core Architecture

Two-layer model:
- **LivingSubstrate** = "RHEO is alive" (ambient, WebGL, organic)
- **The Current** = "RHEO is moving" (semantic, Canvas 2D, directional)

## 2. State Model

```ts
interface CurrentState {
  phase: number;              // normalized 0..1, continuous across routes
  mode: CurrentMode;          // changes with route
  accent: string;             // current page accent
  entities: Entity[];         // current page topology
  transition: TransitionState;
}

interface TransitionState {
  active: boolean;
  startedAt: number;
  duration: number;           // 200ms
  previousMode: CurrentMode;
  previousEntities: Entity[];
}
```

## 3. Persistence Rules

- `phase` = `useRef(0)`, incremented by elapsed time: `(phase + delta / CURRENT_CYCLE_MS) % 1`
- Canvas element = one owner for app lifetime, outside `<Routes>`
- Route provides semantic data only, never owns the canvas
- `phase` NEVER resets across route changes

## 4. Component Hierarchy

```tsx
<App>
  <AppBackground />
  <RheoCurrent />
  <Routes>{/* page content */}</Routes>
</App>
```

## 5. Route → Mode Mapping

| Route | Mode | Topology |
|-------|------|----------|
| Dashboard | `stream` | horizontal stream + event deviations |
| Life | `network` | self + people/goals branches |
| Finance | `flow` | income/expense streams |
| Activity | `signal` | parallel temporal traces |
| Goals | `trajectory` | path + milestones |
| Projects | `workflow` | branching process |
| External | `inflow` | incoming streams |
| Learn | `knowledge` | branching knowledge structure |
| Reports | `signal` | temporal analytical traces |
| IDE | `mechanical` | rotating gear geometry |
| Database | `partition` | Voronoi regions |
| AI | `cellular` | evolving cellular grid |
| Settings | `redaction` | masking / reveal zones |

## 6. Entity Schema

```ts
interface Entity {
  id: string;
  type: "node" | "branch" | "stream" | "milestone" | "cell" | "signal" | "gear" | "mask";
  x: number;
  y: number;
  radius?: number;
  weight?: number;
  label?: string;
  importance?: number;
  progress?: number;
  metadata?: Record<string, unknown>;
}
```

## 7. Animation Loop

```ts
function frame(timestamp: number) {
  if (document.hidden) {
    previousTimestamp = timestamp;
    requestAnimationFrame(frame);
    return;
  }
  const delta = timestamp - previousTimestamp;
  updatePhase(delta);
  updateTransition(timestamp);
  render();
  previousTimestamp = timestamp;
  rafId = requestAnimationFrame(frame);
}
```

## 8. Reduced Motion

```ts
if (!reducedMotion) {
  updatePhase(delta);
  updateTransition(timestamp);
}
// topology still renders — user sees static structure
```

## 9. Canvas Requirements

- Canvas 2D (not WebGL, not CSS)
- DPR-aware: `canvas.width = width * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`
- `pointer-events: none`
- z-index: same layer as AppBackground (z-[0])

## 10. File Structure

```
src/components/rheo-current/
├── RheoCurrent.tsx
├── currentState.ts
├── currentClock.ts
├── currentTransition.ts
├── currentEntities.ts
├── currentRenderer.ts
└── renderers/
    ├── stream.ts
    ├── network.ts
    ├── flow.ts
    ├── signal.ts
    ├── trajectory.ts
    ├── workflow.ts
    ├── inflow.ts
    ├── knowledge.ts
    ├── mechanical.ts
    ├── partition.ts
    ├── cellular.ts
    └── redaction.ts
```
