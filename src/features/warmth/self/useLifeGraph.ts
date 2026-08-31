import { useState, useEffect, useCallback } from 'react'

const api = () => (window as any).deskflowAPI

export interface LifeGraphNode {
  id: string
  type: 'schedule' | 'goal' | 'deadline' | 'note' | 'entity' | 'ltg'
  title: string
  metadata: Record<string, any>
}

export interface LifeGraphEdge {
  source: string
  target: string
  type: 'explicit' | 'implicit' | 'semantic'
  weight: number
}

export interface ProfileSignal {
  trait: string
  value: number
  evidence: string[]
}

export interface TodayContext {
  activeScheduleId: string | null
  todaysGoalIds: string[]
  approachingDeadlineIds: string[]
  relevantNoteIds: string[]
  activeEntityIds: string[]
}

export interface LifeGraphState {
  graph: { nodes: LifeGraphNode[]; edges: LifeGraphEdge[] } | null
  today: TodayContext | null
  profileSignals: ProfileSignal[]
  loading: boolean
  error: string | null
}

export function useLifeGraph() {
  const [state, setState] = useState<LifeGraphState>({ graph: null, today: null, profileSignals: [], loading: true, error: null })

  const load = useCallback(async () => {
    try {
      setState(s => ({ ...s, loading: true, error: null }))
      const [graphRes, todayRes] = await Promise.all([
        api()?.getUnifiedGraph?.(),
        api()?.getTodayContext?.(),
      ])
      setState({
        graph: graphRes?.nodes ? { nodes: graphRes.nodes, edges: graphRes.edges || [] } : null,
        today: todayRes?.activeScheduleId !== undefined ? todayRes : null,
        profileSignals: graphRes?.profileSignals || [],
        loading: false,
        error: graphRes?.error || todayRes?.error || null,
      })
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e?.message || 'Failed to load life graph' }))
    }
  }, [])

  useEffect(() => { load() }, [load])

  const getNodeById = useCallback((id: string) => {
    return state.graph?.nodes.find(n => n.id === id) || null
  }, [state.graph])

  const getConnections = useCallback((nodeId: string) => {
    if (!state.graph) return []
    const connectedIds = new Set<string>()
    for (const edge of state.graph.edges) {
      if (edge.source === nodeId) connectedIds.add(edge.target)
      if (edge.target === nodeId) connectedIds.add(edge.source)
    }
    return [...connectedIds]
      .map(id => state.graph!.nodes.find(n => n.id === id))
      .filter(Boolean) as LifeGraphNode[]
  }, [state.graph])

  const getEdges = useCallback((nodeId: string) => {
    if (!state.graph) return []
    return state.graph.edges.filter(e => e.source === nodeId || e.target === nodeId)
  }, [state.graph])

  return { ...state, load, getNodeById, getConnections, getEdges }
}
