import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, ChevronRight, Clock, FileText, GitBranch } from 'lucide-react'
import type { GraphNode } from './types'

interface EntityDetailPanelProps {
  node: GraphNode | null
  onClose: () => void
}

export function EntityDetailPanel({ node, onClose }: EntityDetailPanelProps) {
  const [history, setHistory] = useState<any[]>([])
  const [episodes, setEpisodes] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showEpisodes, setShowEpisodes] = useState(false)

  useEffect(() => {
    if (!node) return
    const api = (window as any).deskflowAPI
    if (!api) return

    // Fetch entity history
    api.brainGetEntityHistory(node.name).then((h: any) => {
      setHistory(Array.isArray(h) ? h : [])
    }).catch(() => setHistory([]))

    // Fetch recent episodes mentioning this entity
    api.brainSearch(node.name, ['keyword']).then((r: any) => {
      setEpisodes(r?.episodes || [])
    }).catch(() => setEpisodes([]))
  }, [node])

  if (!node) return null

  return (
    <AnimatePresence>
      <motion.div
        key="detail-panel"
        initial={{ x: 380, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 380, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 380,
          height: '100%',
          background: 'rgba(9, 9, 11, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: '#fafafa', margin: 0 }}>
              {node.name}
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginTop: 6, padding: '2px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 11, color: '#71717a', fontFamily: "'JetBrains Mono', monospace",
          }}>
            {node.type}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Current Facts */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Current Facts
            </div>
            {node.facts.length === 0 ? (
              <div style={{ fontSize: 12, color: '#3f3f46', fontStyle: 'italic' }}>No facts recorded</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {node.facts.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 10px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <span style={{ fontSize: 12, color: '#a1a1aa' }}>{f.predicate}</span>
                    <span style={{ fontSize: 12, color: '#fafafa', fontFamily: "'JetBrains Mono', monospace" }}>{f.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}
              >
                {showHistory ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <GitBranch size={12} />
                History ({history.length})
              </button>
              {showHistory && (
                <div style={{ marginTop: 6, borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: 12 }}>
                  {history.map((f, i) => (
                    <div key={i} style={{ marginBottom: 8, position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: -17, top: 4, width: 8, height: 8,
                        borderRadius: '50%', border: '2px solid rgba(255,255,255,0.06)',
                        background: f.validTo ? '#3f3f46' : '#22c55e',
                      }} />
                      <div style={{ fontSize: 10, color: '#3f3f46', fontFamily: "'JetBrains Mono', monospace" }}>
                        {f.validFrom?.slice(0, 10)} {f.validTo ? `→ ${f.validTo.slice(0, 10)}` : '(current)'}
                      </div>
                      <div style={{ fontSize: 12, color: '#a1a1aa' }}>
                        {f.predicate}: {f.objectLiteral || f.objectId}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Source Episodes */}
          {episodes.length > 0 && (
            <div>
              <button
                onClick={() => setShowEpisodes(!showEpisodes)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}
              >
                {showEpisodes ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <FileText size={12} />
                Source Episodes ({episodes.length})
              </button>
              {showEpisodes && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {episodes.map((ep, i) => (
                    <div key={i} style={{
                      padding: '8px 10px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>{ep.source}</span>
                        <span style={{ fontSize: 10, color: '#3f3f46', fontFamily: "'JetBrains Mono', monospace" }}>{ep.when?.slice(0, 10)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>{ep.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
