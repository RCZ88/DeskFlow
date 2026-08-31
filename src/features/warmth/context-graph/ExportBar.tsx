import { useState, useMemo } from 'react'
import { Copy, Download, Check, X } from 'lucide-react'
import type { GraphNode, GraphLink } from './types'

interface ExportBarProps {
  selectedIds: string[]
  nodes: GraphNode[]
  links: GraphLink[]
  onClear: () => void
}

export function ExportBar({ selectedIds, nodes, links, onClear }: ExportBarProps) {
  const [copied, setCopied] = useState<'json' | 'md' | null>(null)

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>()
    for (const n of nodes) map.set(n.id, n)
    return map
  }, [nodes])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const selectedNodes = useMemo(
    () => selectedIds.map(id => nodeMap.get(id)).filter(Boolean) as GraphNode[],
    [selectedIds, nodeMap]
  )

  const selectedLinks = useMemo(
    () => links.filter(l => {
      const sId = typeof l.source === 'string' ? l.source : (l.source as any).id
      const tId = typeof l.target === 'string' ? l.target : (l.target as any).id
      return selectedSet.has(sId) && selectedSet.has(tId)
    }),
    [links, selectedSet]
  )

  const jsonPayload = useMemo(() => JSON.stringify({
    context: {
      entities: selectedNodes.map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        facts: n.facts.map(f => ({ predicate: f.predicate, value: f.value })),
      })),
      relations: selectedLinks.map(l => ({
        source: typeof l.source === 'string' ? l.source : (l.source as any).id,
        target: typeof l.target === 'string' ? l.target : (l.target as any).id,
        predicate: l.predicate,
      })),
      episodes: [],
    },
    metadata: {
      exported_at: new Date().toISOString(),
      app: 'DeskFlow',
      node_count: selectedNodes.length,
    },
  }, null, 2), [selectedNodes, selectedLinks])

  const mdPayload = useMemo(() => {
    const lines: string[] = [
      '# DeskFlow Context Export',
      `**Exported:** ${new Date().toLocaleDateString()} | **Nodes Selected:** ${selectedNodes.length}`,
      '',
      '## Entities & Facts',
    ]
    for (const n of selectedNodes) {
      lines.push(`- **${n.name}** (${n.type})`)
      for (const f of n.facts) {
        lines.push(`  - ${f.predicate}: ${f.value}`)
      }
    }
    if (selectedLinks.length > 0) {
      lines.push('', '## Relations')
      for (const l of selectedLinks) {
        const sId = typeof l.source === 'string' ? l.source : (l.source as any).id
        const tId = typeof l.target === 'string' ? l.target : (l.target as any).id
        const src = nodeMap.get(sId)?.name || sId
        const tgt = nodeMap.get(tId)?.name || tId
        lines.push(`- [${src}] ${l.predicate} [${tgt}]`)
      }
    }
    return lines.join('\n')
  }, [selectedNodes, selectedLinks, nodeMap])

  const copy = async (type: 'json' | 'md') => {
    const payload = type === 'json' ? jsonPayload : mdPayload
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(type)
      setTimeout(() => setCopied(null), 1500)
    } catch { /* clipboard unavailable */ }
  }

  if (selectedIds.length === 0) return null

  return (
    <div style={{
      position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px', borderRadius: 12,
      background: 'rgba(9,9,11,0.88)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(139,92,246,0.3)',
      zIndex: 50, boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.1)',
    }}>
      <span style={{ fontSize: 11, color: '#a1a1aa', fontFamily: "'JetBrains Mono', monospace" }}>
        {selectedIds.length} selected
      </span>

      <button
        onClick={() => copy('json')}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 6,
          background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
          color: '#c4b5fd', fontSize: 11, fontWeight: 500, cursor: 'pointer',
        }}
      >
        {copied === 'json' ? <Check size={12} /> : <Copy size={12} />}
        JSON
      </button>

      <button
        onClick={() => copy('md')}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 6,
          background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.25)',
          color: '#f9a8d4', fontSize: 11, fontWeight: 500, cursor: 'pointer',
        }}
      >
        {copied === 'md' ? <Check size={12} /> : <Download size={12} />}
        Markdown
      </button>

      <button
        onClick={onClear}
        style={{
          display: 'flex', alignItems: 'center',
          padding: 4, borderRadius: 6,
          background: 'transparent', border: 'none',
          color: '#52525b', cursor: 'pointer',
        }}
        title="Clear selection"
      >
        <X size={14} />
      </button>
    </div>
  )
}
