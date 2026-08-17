import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { RefreshCw, Network } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import type { GraphNode, GraphLink } from './context-graph/types'
import { TYPE_COLORS } from './context-graph/types'
import { EntityDetailPanel } from './context-graph/EntityDetailPanel'
import { GraphControls } from './context-graph/GraphControls'
import { NumberTicker } from '../../components/ui/number-ticker'

const GraphScene = lazy(() => import('./context-graph/GraphScene').then(m => ({ default: m.GraphScene })))

console.log('%c[ContextGraphView] v2.1 loaded', 'color: #8b5cf6; font-weight: bold')

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

      // Get all entities via broad search
      const result = await api.brainSearch('a', ['keyword'])

      const nodeMap = new Map<string, GraphNode>()
      const edgeList: GraphLink[] = []

      // Create nodes from entities
      if (result?.entities) {
        for (const entity of result.entities) {
          if (!nodeMap.has(entity.id)) {
            nodeMap.set(entity.id, {
              id: entity.id,
              name: entity.name,
              type: entity.type,
              state: 'neutral',
              degree: 0,
              facts: [],
              x: (Math.random() - 0.5) * 12,
              y: (Math.random() - 0.5) * 8,
              z: (Math.random() - 0.5) * 8,
              vx: 0, vy: 0, vz: 0,
            })
          }
        }
      }

      // Add facts as edges + node facts
      if (result?.facts) {
        for (const fact of result.facts) {
          const subjectId = fact.subjectId
          if (!nodeMap.has(subjectId)) {
            nodeMap.set(subjectId, {
              id: subjectId,
              name: subjectId.replace('ent_', '').replace(/_/g, ' '),
              type: 'concept',
              state: fact.validTo ? 'neutral' : 'active',
              degree: 0,
              facts: [],
              x: (Math.random() - 0.5) * 12,
              y: (Math.random() - 0.5) * 8,
              z: (Math.random() - 0.5) * 8,
              vx: 0, vy: 0, vz: 0,
            })
          }
          const node = nodeMap.get(subjectId)!
          node.facts.push({ predicate: fact.predicate, value: fact.objectLiteral || '' })
          if (!fact.validTo) node.state = 'active'

          if (fact.objectId && !nodeMap.has(fact.objectId)) {
            nodeMap.set(fact.objectId, {
              id: fact.objectId,
              name: fact.objectId.replace('ent_', '').replace(/_/g, ' '),
              type: 'concept',
              state: 'neutral',
              degree: 0,
              facts: [],
              x: (Math.random() - 0.5) * 12,
              y: (Math.random() - 0.5) * 8,
              z: (Math.random() - 0.5) * 8,
              vx: 0, vy: 0, vz: 0,
            })
          }
          if (fact.objectId) {
            edgeList.push({ source: subjectId, target: fact.objectId, predicate: fact.predicate })
          }
        }
      }

      // Fetch workspace learn nodes as separate concept nodes
      try {
        const learnNodes = await api.learnGetNodes?.()
        if (learnNodes && Array.isArray(learnNodes)) {
          for (const ln of learnNodes.slice(0, 30)) {
            const id = `learn_${ln.id || ln.slug}`
            if (!nodeMap.has(id)) {
              nodeMap.set(id, {
                id,
                name: ln.title || ln.name || ln.slug || 'Lesson',
                type: 'concept',
                state: 'neutral',
                degree: 0,
                facts: [{ predicate: 'is_lesson', value: ln.part || 'general' }],
                source: 'workspace',
                x: (Math.random() - 0.5) * 12,
                y: (Math.random() - 0.5) * 8 + 6,
                z: (Math.random() - 0.5) * 8,
                vx: 0, vy: 0, vz: 0,
              })
            }
          }
        }
      } catch { /* learn nodes not available */ }

      setNodes(Array.from(nodeMap.values()))
      setLinks(edgeList)
    } catch (e) {
      console.error('[ContextGraph] Load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGraphData() }, [loadGraphData])

  const entityTypes = useMemo(() => {
    const types = new Set(nodes.map(n => n.type))
    return Array.from(types).sort()
  }, [nodes])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const n of nodes) counts[n.type] = (counts[n.type] || 0) + 1
    return counts
  }, [nodes])

  const handleTypeToggle = useCallback((type: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ borderRadius: 16, background: '#18181b', border: '1px solid rgba(39,39,42,0.5)' }}>
        <div className="flex items-center gap-3 text-sm" style={{ color: '#71717a' }}>
          <RefreshCw size={16} className="animate-spin" />
          Loading context graph...
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 520, borderRadius: 16, overflow: 'hidden', background: '#18181b', border: '1px solid rgba(39,39,42,0.5)' }}>
      {/* 3D Canvas */}
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <RefreshCw size={20} className="animate-spin" style={{ color: '#3f3f46' }} />
        </div>
      }>
        <Canvas camera={{ position: [0, 0, 500], fov: 50 }} style={{ width: '100%', height: '100%' }}>
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

      {/* Controls overlay */}
      <GraphControls
        onSearchChange={setSearchQuery}
        onTypeToggle={handleTypeToggle}
        hiddenTypes={hiddenTypes}
        entityTypes={entityTypes}
      />

      {/* Legend */}
      {entityTypes.length > 0 && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          display: 'flex', flexDirection: 'column', gap: 4,
          padding: '8px 12px', borderRadius: 10,
          background: 'rgba(9, 9, 11, 0.80)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
          zIndex: 40,
        }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#52525b', marginBottom: 2 }}>
            Types
          </div>
          {entityTypes.map(type => {
            const color = TYPE_COLORS[type] || '#71717a'
            const hidden = hiddenTypes.has(type)
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: hidden ? 0.35 : 1 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}80`, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#a1a1aa', textTransform: 'capitalize' }}>{type}</span>
                <span style={{ fontSize: 9, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>{typeCounts[type] || 0}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail panel */}
      <EntityDetailPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />

      {/* Empty state hint */}
      {nodes.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 30, pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center', padding: '20px 28px', borderRadius: 16, background: 'rgba(9,9,11,0.70)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Network size={26} style={{ color: '#3f3f46', margin: '0 auto 8px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#a1a1aa' }}>No entities yet</div>
            <div style={{ fontSize: 11, color: '#52525b', marginTop: 4, maxWidth: 260 }}>
              Log goals, deadlines, life phases or chat with the AI — entities and facts appear here automatically.
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          display: 'flex', gap: 14, padding: '6px 12px', borderRadius: 10,
          background: 'rgba(9,9,11,0.80)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: 10, color: '#71717a', fontFamily: "'JetBrains Mono', monospace",
          zIndex: 40,
        }}>
          <span><NumberTicker value={nodes.length} /> nodes</span>
          <span><NumberTicker value={links.length} /> edges</span>
          <span><NumberTicker value={stats.episodes || 0} /> episodes</span>
          <span style={{ color: '#8b5cf6' }}><NumberTicker value={stats.currentFacts || 0} /> facts</span>
        </div>
      )}
    </div>
  )
}