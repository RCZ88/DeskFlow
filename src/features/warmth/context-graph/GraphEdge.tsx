import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import type { GraphNode, GraphLink } from './types'

interface GraphEdgeProps {
  link: GraphLink
  nodeMap: Map<string, GraphNode>
  isDimmed: boolean
  isHighlighted: boolean
}

export function GraphEdge({ link, nodeMap, isDimmed, isHighlighted }: GraphEdgeProps) {
  const from = nodeMap.get(typeof link.source === 'string' ? link.source : (link.source as any).id)
  const to = nodeMap.get(typeof link.target === 'string' ? link.target : (link.target as any).id)

  const points = useMemo(() => {
    if (!from || !to) return null
    return [
      new THREE.Vector3(from.x, from.y, from.z),
      new THREE.Vector3(to.x, to.y, to.z),
    ]
  }, [from?.x, from?.y, from?.z, to?.x, to?.y, to?.z])

  if (!points) return null

  const opacity = isDimmed ? 0.05 : isHighlighted ? 0.35 : 0.12
  const color = isHighlighted ? '#fafafa' : '#27272a'

  return (
    <Line
      points={points}
      color={color}
      lineWidth={isHighlighted ? 1.5 : 0.8}
      transparent
      opacity={opacity}
    />
  )
}
