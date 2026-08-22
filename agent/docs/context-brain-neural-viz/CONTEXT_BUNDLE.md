# CONTEXT BUNDLE — Context Brain Neural Visualization Overhaul

## Raw Request

User's exact words:
> "THE KNOWLEGDE GRAPH LOOKS LIKE SHIT IDIOT. FUCKIMG IMPROVE IT IDIOT USING COOL STUFF 3D GRAPHICS PROCESSING AND LIKE SHADERS AND EVREHTING AND LIKE A PROPER NEURAL LOOKING SYSTEMS PROPERLY IDIOT."
> "the part where it shows the brain and like the neural links and evreything? WHERE IS IT?? THE PROPER VISUALZIATION THE COOL ONES AND THE ACTUAL USEFULL ONES THE COOL ONES IS JUST TO VISUALZISE COLOL AND LIKE GROUP SUTFF BUT SHOULD BE ABLE TO BE SLEECTED AND VIEWED ADN RETRIEVED AND HTOSE STUFF PROEPRLY"
> "how is the personal context feature? how is it able to be displayed properly and how is it going to be making that it can categorized things and like we can select which context we want to select and and retrieve the text json or whatever format so that we can insert into a different ai"

## What Exists Today

### Current Graph Architecture (8 files)

The current Context Brain visualization lives in `src/features/warmth/context-graph/` and renders on the Life page's `self` tab via `ContextGraphView.tsx` (v2.1, 280 lines). It uses React Three Fiber (R3F) for 3D rendering with d3-force-3d for layout.

**CRITICAL: The graph is decorative, not functional.** Here's what's wrong:

1. **Nodes are plain spheres** — `GraphNode.tsx` uses `meshStandardMaterial` with emissive glow. No shaders, no pulsing, no neural feel. Just colored balls.
2. **Edges are flat gray lines** — `GraphEdge.tsx` uses drei's `Line` component. No animated data flow, no energy pulses, no synapse feel.
3. **No selection → export pipeline** — You can click a node and see a detail panel, but there's NO way to select multiple nodes and export them for use in another AI.
4. **Two separate systems don't talk** — The graph (visual) and `ContextRetrievalPanel.tsx` (search + multi-select + copy) are completely disconnected. The retrieval panel has the export functionality but no visual graph. The graph has the visual but no export.
5. **Static after 200 ticks** — `useForceSimulation.ts` runs d3-force for 200 ticks then stops. No continuous breathing/pulsing animation.
6. **Barely any postprocessing** — Just one `Bloom` pass with luminanceThreshold 0.6. Nodes don't glow enough.

### File Inventory

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `src/features/warmth/ContextGraphView.tsx` | 280 | Main container, loads data, renders canvas | Working but basic |
| `src/features/warmth/context-graph/GraphScene.tsx` | 167 | R3F scene, lighting, orbit controls | Working but minimal |
| `src/features/warmth/context-graph/GraphNode.tsx` | 103 | Node mesh + label + hover tooltip | Decorative only |
| `src/features/warmth/context-graph/GraphEdge.tsx` | 59 | Edge lines between nodes | Decorative only |
| `src/features/warmth/context-graph/EntityDetailPanel.tsx` | 183 | Slide-in panel on node click | Works but boring |
| `src/features/warmth/context-graph/GraphControls.tsx` | 102 | Search bar + type filter chips | Works |
| `src/features/warmth/context-graph/types.ts` | 39 | TypeScript types + color constants | Complete |
| `src/features/warmth/context-graph/useForceSimulation.ts` | 74 | d3-force-3d layout hook | Works but stops |
| `src/features/warmth/context-brain/ContextRetrievalPanel.tsx` | 381 | Search + multi-select + copy as context | Has export, no graph |
| `src/features/warmth/context-brain/BrainManagementView.tsx` | 523 | Admin UI (episodes/entities/facts/jobs) | Complete |
| `src/components/life/ProfileTab.tsx` | 439 | User profile + radar + heatmap + export | Complete |
| `src/components/life/ContextExport.tsx` | 112 | Copy JSON + Download buttons | Complete |

---

## Source Code — ContextGraphView.tsx (v2.1)

```tsx
// src/features/warmth/ContextGraphView.tsx
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { RefreshCw, Network } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import type { GraphNode, GraphLink } from './context-graph/types'
import { TYPE_COLORS } from './context-graph/types'
import { EntityDetailPanel } from './context-graph/EntityDetailPanel'
import { GraphControls } from './context-graph/GraphControls'
import { NumberTicker } from '../../components/ui/number-ticker'

const GraphScene = lazy(() => import('./context-graph/GraphScene').then(m => ({ default: m.GraphScene })))

export function ContextGraphView() {
  const [loading, setLoading] = useState(true)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState<{ episodes: number; entities: number; facts: number; currentFacts: number } | null>(null)

  const loadGraphData = useCallback(async () => {
    try {
      setLoading(true)
      const api = (window as any).deskflowAPI
      if (!api) return
      const brainStats = await api.brainStats()
      setStats(brainStats)
      const entitiesResult = await api.brainGetEntities({ limit: 200 })
      const factsResult = await api.brainGetFacts({ currentOnly: true, limit: 500 })
      // ... builds nodeMap + edgeList from entities + facts ...
      setNodes(Array.from(nodeMap.values()))
      setLinks(edgeList)
    } catch (e) {
      console.error('[ContextGraph] Load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGraphData() }, [loadGraphData])

  // ... entityTypes, typeCounts, handleTypeToggle ...

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 520, borderRadius: 16, overflow: 'hidden', background: '#18181b', border: '1px solid rgba(39,39,42,0.5)' }}>
      <Suspense fallback={...}>
        <Canvas camera={{ position: [0, 0, 12], fov: 50 }} style={{ width: '100%', height: '100%' }}>
          <GraphScene
            nodes={nodes}
            links={links}
            selectedNodeId={selectedNode?.id || null}
            onNodeSelect={setSelectedNode}
            hoveredNodeId={hoveredNodeId}
            onNodeHover={setHoveredNodeId}
            hiddenTypes={hiddenTypes}
            searchQuery={searchQuery}
          />
        </Canvas>
      </Suspense>
      <GraphControls onSearchChange={setSearchQuery} onTypeToggle={handleTypeToggle} hiddenTypes={hiddenTypes} entityTypes={entityTypes} />
      {/* Legend */}
      {/* EntityDetailPanel */}
      {/* Empty state */}
      {/* Stats bar */}
    </div>
  )
}
```

## Source Code — GraphScene.tsx

```tsx
// src/features/warmth/context-graph/GraphScene.tsx
import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { GraphNodeMesh } from './GraphNode'
import { GraphEdge } from './GraphEdge'
import { useForceSimulation } from './useForceSimulation'

export function GraphScene({ nodes, links, selectedNodeId, onNodeSelect, hoveredNodeId, onNodeHover, hiddenTypes, searchQuery }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  // Compute degree, run force sim, build node map
  // ... (force sim runs 200 ticks then stops)

  // Camera pan to selected node
  useEffect(() => {
    if (selectedNodeId) {
      const node = nodeMap.get(selectedNodeId)
      if (node && controlsRef.current) {
        const target = new THREE.Vector3(node.x, node.y, node.z)
        controlsRef.current.target.copy(target)
        const offset = new THREE.Vector3(3, 2, 3)
        const newCamPos = target.clone().add(offset)
        camera.position.lerp(newCamPos, 0.5)
      }
    }
  }, [selectedNodeId, nodeMap, camera])

  return (
    <>
      <color attach="background" args={['#09090b']} />
      <fog attach="fog" args={['#09090b', 18, 45]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[15, 15, 15]} intensity={0.6} color="#fafafa" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#3b82f6" />
      <pointLight position={[5, -10, 5]} intensity={0.2} color="#22c55e" />

      {nodesWithDegree.map(node => (
        <GraphNodeMesh key={node.id} node={node} isSelected={node.id === selectedNodeId} isDimmed={isNodeDimmed(node)} onClick={() => onNodeSelect(node)} onHover={(h) => onNodeHover(h ? node.id : null)} />
      ))}
      {links.map((link, i) => (
        <GraphEdge key={...} link={link} nodeMap={nodeMap} isDimmed={isEdgeDimmed(link)} isHighlighted={isEdgeHighlighted(link)} />
      ))}

      <EffectComposer>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.4} intensity={0.8} mipmapBlur />
      </EffectComposer>

      <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} minDistance={3} maxDistance={25} makeDefault />
      <mesh visible={false} onClick={handlePointerMissed}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  )
}
```

## Source Code — GraphNode.tsx

```tsx
// src/features/warmth/context-graph/GraphNode.tsx
export function GraphNodeMesh({ node, isSelected, isDimmed, onClick, onHover }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const color = STATE_COLORS[node.state] || TYPE_COLORS[node.type] || TYPE_COLORS.default
  const baseSize = 0.25 + Math.min(node.degree * 0.05, 0.4)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(node.x, node.y, node.z)
      const targetScale = isDimmed ? 0.6 : hovered ? 1.25 : isSelected ? 1.15 : 1.0
      const s = meshRef.current.scale.x
      const newScale = s + (targetScale - s) * 0.12
      meshRef.current.scale.setScalar(newScale)
    }
  })

  const emissiveIntensity = node.state === 'active' ? 0.5 : node.state === 'blocked' ? 0.3 : 0.15
  const opacity = isDimmed ? 0.3 : 0.9

  return (
    <group>
      <mesh ref={meshRef} position={[node.x, node.y, node.z]}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(true) }}
        onPointerOut={() => { setHovered(false); onHover(false) }}
      >
        <sphereGeometry args={[baseSize, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} roughness={0.25} metalness={0.8} transparent opacity={opacity} />
      </mesh>

      {/* Label — always visible */}
      <Billboard position={[node.x, node.y + baseSize + 0.3, node.z]}>
        <Text fontSize={0.18} color={isDimmed ? '#3f3f46' : '#a1a1aa'} anchorX="center" anchorY="bottom" maxWidth={4}>
          {node.name.length > 24 ? node.name.slice(0, 24) + '...' : node.name}
        </Text>
        <Text fontSize={0.12} color="#3f3f46" anchorX="center" anchorY="top" position={[0, -0.04, 0]}>
          {node.type}
        </Text>
      </Billboard>

      {/* Hover tooltip */}
      {hovered && !isDimmed && (
        <Html position={[node.x, node.y + baseSize + 0.6, node.z]} center distanceFactor={8}>
          <div style={{ background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#a1a1aa', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            <div style={{ fontWeight: 600, color: '#fafafa', marginBottom: 2 }}>{node.name}</div>
            <div>{node.type} · {node.facts.length} facts</div>
          </div>
        </Html>
      )}
    </group>
  )
}
```

## Source Code — GraphEdge.tsx

```tsx
// src/features/warmth/context-graph/GraphEdge.tsx
export function GraphEdge({ link, nodeMap, isDimmed, isHighlighted }) {
  const lineRef = useRef<any>(null)

  useFrame(() => {
    const from = nodeMap.get(fromId)
    const to = nodeMap.get(toId)
    if (!from || !to || !lineRef.current) return
    const geo = lineRef.current.geometry
    if (geo) {
      const pos = geo.attributes.position
      if (pos) {
        pos.setXYZ(0, from.x, from.y, from.z)
        pos.setXYZ(1, to.x, to.y, to.z)
        pos.needsUpdate = true
      }
    }
  })

  const opacity = isDimmed ? 0.05 : isHighlighted ? 0.4 : 0.12
  const color = isHighlighted ? '#fafafa' : '#27272a'

  return (
    <Line ref={lineRef} points={[new THREE.Vector3(from.x, from.y, from.z), new THREE.Vector3(to.x, to.y, to.z)]} color={color} lineWidth={isHighlighted ? 1.5 : 0.8} transparent opacity={opacity} />
  )
}
```

## Source Code — EntityDetailPanel.tsx

```tsx
// src/features/warmth/context-graph/EntityDetailPanel.tsx
export function EntityDetailPanel({ node, onClose }) {
  const [history, setHistory] = useState<any[]>([])
  const [episodes, setEpisodes] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showEpisodes, setShowEpisodes] = useState(false)

  useEffect(() => {
    if (!node) return
    const api = (window as any).deskflowAPI
    api.brainGetEntityHistory(node.name).then((h) => setHistory(Array.isArray(h) ? h : []))
    api.brainSearch(node.name, ['keyword']).then((r) => setEpisodes(r?.episodes || []))
  }, [node])

  // Renders: header (name + type badge), Current Facts list, History (collapsible), Source Episodes (collapsible)
  // 380px slide-in panel, glass backdrop, motion animation
}
```

## Source Code — useForceSimulation.ts

```tsx
// src/features/warmth/context-graph/useForceSimulation.ts
export function useForceSimulation({ nodes, links, enabled = true }) {
  const simRef = useRef<any>(null)
  const nodesRef = useRef<GraphNode[]>([])
  nodesRef.current = nodes

  useEffect(() => {
    if (!enabled || nodes.length === 0) return
    const sim = forceSimulation(nodes, 2)
      .force('charge', forceManyBody().strength(-180).distanceMax(18).theta(0.9))
      .force('link', forceLink(links as any).id((d: any) => d.id).distance(3.5).strength(0.4))
      .force('center', forceCenter(0, 0, 0).strength(0.03))
      .force('collide', forceCollide().radius(1.2).strength(0.8).iterations(2))
      .alphaDecay(0.015)
      .velocityDecay(0.35)

    let frameId: number
    let tickCount = 0
    const maxTicks = 200

    const tick = () => {
      if (tickCount >= maxTicks) { sim.stop(); return }
      sim.tick()
      tickCount++
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    simRef.current = sim
    return () => { cancelAnimationFrame(frameId); sim.stop(); simRef.current = null }
  }, [nodes, links, enabled])

  return { nodesRef }
}
```

## Source Code — types.ts

```tsx
// src/features/warmth/context-graph/types.ts
export interface GraphNode {
  id: string; name: string; type: string; state: 'active' | 'blocked' | 'neutral'
  degree: number; facts: { predicate: string; value: string }[]; source?: string
  x: number; y: number; z: number; vx: number; vy: number; vz: number
}

export interface GraphLink { source: string; target: string; predicate: string }

export const TYPE_COLORS: Record<string, string> = {
  goal: '#22c55e', project: '#3b82f6', deadline: '#ef4444', person: '#f59e0b',
  tool: '#8b5cf6', concept: '#06b6d4', life_phase: '#ec4899', default: '#71717a',
}

export const STATE_COLORS: Record<string, string> = {
  active: '#22c55e', blocked: '#ef4444', neutral: '#fafafa',
}
```

## Source Code — ContextRetrievalPanel.tsx (the EXPORT system the graph lacks)

```tsx
// src/features/warmth/context-brain/ContextRetrievalPanel.tsx
// This component has multi-select + copy-as-context but NO visual graph
export function ContextRetrievalPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RetrievalResult[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<'search' | 'chat'>('search')

  // Search calls brainSearch(query, ['keyword', 'graph'])
  // Returns entities + facts + episodes combined

  const handleCopySelected = useCallback(async () => {
    const selectedItems = results.filter(r => selected.has(r.id))
    const block = selectedItems.map(r => {
      if (r.type === 'entity') return `[Entity] ${r.name}`
      if (r.type === 'fact') return `[Fact] ${r.name}`
      if (r.type === 'episode') return `[Episode ${r.id}] ${r.content || r.name}`
      return `[${r.type}] ${r.name || r.id}`
    }).join('\n')
    await navigator.clipboard.writeText(block)
  }, [results, selected])

  // Has: search, type filter chips, multi-select checkboxes, "Copy as Context" button
  // Has: Chat mode with brainChat IPC
  // Missing: visual graph, JSON export, Markdown export
}
```

---

## IPC Endpoints (all verified in preload.ts + main.ts)

| IPC Channel | Preload Bridge | Purpose |
|-------------|---------------|---------|
| `brain:search` | `brainSearch(query, strategies?)` | Keyword + graph search across entities/facts/episodes |
| `brain:get-entity` | `brainGetEntity(name)` | Get single entity by name |
| `brain:get-entity-history` | `brainGetEntityHistory(name)` | Bitemporal fact history for entity |
| `brain:stats` | `brainStats()` | { episodes, entities, facts, currentFacts } |
| `brain:get-episodes` | `brainGetEpisodes(opts?)` | Paginated episode list with source/search filters |
| `brain:get-facts` | `brainGetFacts(opts?)` | Paginated fact list with currentOnly/subject filters |
| `brain:get-entity-related` | `brainGetEntityRelated(entityId)` | Episodes mentioning an entity |
| `brain:chat` | `brainChat({ query, history })` | AI-powered brain Q&A with tool calling |

### brainSearch response shape:
```ts
{
  entities: Array<{ id: string; name: string; type: string; ... }>
  facts: Array<{ id: string; subjectId: string; predicate: string; objectLiteral?: string; objectId?: string; confidence: number }>
  episodes: Array<{ id: string; source: string; content: string; when: string }>
}
```

### brainGetEntities response shape:
```ts
{ items: Array<{ id: string; name: string; type: string; factCount: number; aliases?: string[] }>, total: number }
```

### brainGetFacts response shape:
```ts
{ items: Array<{ id: string; subjectId: string; predicate: string; objectLiteral?: string; objectId?: string; confidence: number; validFrom: string; validTo?: string; sourceEpisodeId: string }>, total: number }
```

---

## Design Tokens

```css
/* From src/index.css — page accent for life/self tab */
--page-accent: #f59e0b;  /* amber for Life page */

/* Background */
bg: #09090b (scene), #18181b (container)
card: rgba(24,24,27,0.5) or rgba(9,9,11,0.80)
border: rgba(255,255,255,0.06)

/* Text */
primary: #fafafa
secondary: #d4d4d8
muted: #a1a1aa
faint: #52525b
dim: #3f3f46

/* Accent colors (entity types) */
goal: #22c55e
project: #3b82f6
deadline: #ef4444
person: #f59e0b
tool: #8b5cf6
concept: #06b6d4
life_phase: #ec4899

/* Fonts */
heading: 'Space Grotesk', sans-serif
body: 'Inter', sans-serif
mono: 'JetBrains Mono', monospace
```

---

## Available UI Components (already installed in src/components/ui/)

- accordion, alert, badge, button, card, collapsible, dialog, input, select, separator, skeleton, switch, tabs, toggle, tooltip
- number-ticker, particles, dot-pattern, blur-fade, magic-card, border-beam, shiny-button, animated-gradient-text

## Available 3D Libraries (already installed)

- `@react-three/fiber` — R3F core
- `@react-three/drei` — OrbitControls, Billboard, Text, Html, Line
- `@react-three/postprocessing` — EffectComposer, Bloom
- `three` — Core Three.js
- `d3-force-3d` — Force simulation

## What MUST NOT Change

1. The IPC endpoints — they work, don't modify them
2. The data loading logic in ContextGraphView (entities + facts + learn nodes)
3. The EntityDetailPanel's data fetching (brainGetEntityHistory + brainSearch)
4. The ContextRetrievalPanel's search/copy logic (it works, just needs to be integrated)
5. The types.ts type definitions (can extend, not replace)
6. The Life page's self tab layout (this component is mounted inside it)
