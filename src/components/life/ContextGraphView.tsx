import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Search, Maximize2, Minimize2 } from 'lucide-react'
import { ContextGraph } from './ContextGraph'

interface GraphNode {
  id: string
  name: string
  type: string
  x: number
  y: number
  z: number
  facts: { predicate: string; value: string }[]
}

interface GraphEdge {
  from: string
  to: string
  predicate: string
}

export function ContextGraphView() {
  const [loading, setLoading] = useState(true)
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const [stats, setStats] = useState<{ episodes: number; entities: number; facts: number; currentFacts: number } | null>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)

  const loadGraphData = useCallback(async () => {
    try {
      setLoading(true)
      const api = (window as any).deskflowAPI
      if (!api) return

      // Get all current facts to build the graph
      const brainStats = await api.brainStats()
      setStats(brainStats)

      // Build graph from search results (get everything)
      const result = await api.brainSearch('*', ['keyword'])
      
      // We need to get all entities and facts to build the graph
      // Use a broad search to get nodes
      const searchResult = await api.brainSearch('a', ['keyword'])
      
      // Build nodes from search results
      const nodeMap = new Map<string, GraphNode>()
      const edges: GraphEdge[] = []

      // Create nodes from entities found in search
      if (searchResult?.entities) {
        for (const entity of searchResult.entities) {
          if (!nodeMap.has(entity.id)) {
            nodeMap.set(entity.id, {
              id: entity.id,
              name: entity.name,
              type: entity.type,
              x: (Math.random() - 0.5) * 10,
              y: (Math.random() - 0.5) * 6,
              z: (Math.random() - 0.5) * 6,
              facts: [],
            })
          }
        }
      }

      // Add nodes from facts
      if (searchResult?.facts) {
        for (const fact of searchResult.facts) {
          if (!nodeMap.has(fact.subjectId)) {
            nodeMap.set(fact.subjectId, {
              id: fact.subjectId,
              name: fact.subjectId.replace('ent_', '').replace(/_/g, ' '),
              type: 'concept',
              x: (Math.random() - 0.5) * 10,
              y: (Math.random() - 0.5) * 6,
              z: (Math.random() - 0.5) * 6,
              facts: [],
            })
          }
          const node = nodeMap.get(fact.subjectId)!
          node.facts.push({ predicate: fact.predicate, value: fact.objectLiteral || '' })

          if (fact.objectId && !nodeMap.has(fact.objectId)) {
            nodeMap.set(fact.objectId, {
              id: fact.objectId,
              name: fact.objectId.replace('ent_', '').replace(/_/g, ' '),
              type: 'concept',
              x: (Math.random() - 0.5) * 10,
              y: (Math.random() - 0.5) * 6,
              z: (Math.random() - 0.5) * 6,
              facts: [],
            })
          }
          if (fact.objectId) {
            edges.push({ from: fact.subjectId, to: fact.objectId, predicate: fact.predicate })
          }
        }
      }

      setGraphData({ nodes: Array.from(nodeMap.values()), edges })
    } catch (e) {
      console.error('[ContextGraph] Load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGraphData() }, [loadGraphData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--dk-text-muted)' }}>
          <RefreshCw size={16} className="animate-spin" />
          Loading context graph...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--dk-text-primary)' }}>Context Brain Graph</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--dk-text-faint)' }}>
            {stats ? `${stats.entities} entities, ${stats.currentFacts} facts, ${stats.episodes} episodes` : 'No data yet'}
          </p>
        </div>
        <button
          onClick={loadGraphData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--dk-text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Episodes', value: stats.episodes, color: '#3b82f6' },
            { label: 'Entities', value: stats.entities, color: '#22c55e' },
            { label: 'Facts', value: stats.currentFacts, color: '#f59e0b' },
            { label: 'Total Facts', value: stats.facts, color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} className="rounded-lg p-2" style={{ background: 'rgba(24,24,27,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px]" style={{ color: 'var(--dk-text-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 3D Graph */}
      <div style={{ height: 500, position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <ContextGraph data={graphData} onNodeClick={setSelectedNode} />
      </div>

      {/* Empty state */}
      {graphData.nodes.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--dk-text-muted)' }}>No context data yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--dk-text-faint)' }}>
            Chat with the AI, complete goals, or update life phases to build your context graph
          </p>
        </div>
      )}
    </div>
  )
}
