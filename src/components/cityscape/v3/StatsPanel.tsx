import type { CSSProperties } from 'react'
import type { Tower } from './metropolis'

function fmt(n?: number) {
  if (n == null) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

export function StatsPanel({ tower, onClose }: { tower: Tower | null; onClose: () => void }) {
  if (!tower || !tower.isHero) return null

  const panel: CSSProperties = {
    position: 'absolute', top: 16, right: 16, width: 260, padding: 16,
    background: 'rgba(8,12,22,0.82)', backdropFilter: 'blur(8px)',
    border: `1px solid ${tower.neon}`, borderRadius: 12,
    boxShadow: `0 0 24px ${tower.neon}66`, color: '#e6f3ff',
    fontFamily: 'ui-sans-serif, system-ui', zIndex: 20,
  }
  const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  const title: CSSProperties = { fontWeight: 700, fontSize: 16, color: tower.neon }
  const closeBtn: CSSProperties = { background: 'none', border: 'none', color: '#8aa', fontSize: 20, cursor: 'pointer', lineHeight: 1 }
  const divider: CSSProperties = { height: 1, background: `${tower.neon}44`, margin: '10px 0' }
  const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 }
  const key: CSSProperties = { color: '#7f96b3' }
  const val: CSSProperties = { color: '#e6f3ff', fontWeight: 600 }

  const rows: Array<[string, string]> = [
    ['Tokens', fmt(tower.tokens)],
    ['Sessions', fmt(tower.sessions)],
    ['Cost', tower.cost != null ? '$' + tower.cost.toFixed(2) : '—'],
    ['Status', tower.active ? 'Active' : 'Idle'],
  ]

  return (
    <div style={panel}>
      <div style={head}>
        <span style={title}>{tower.label ?? tower.agentId}</span>
        <button onClick={onClose} style={closeBtn}>×</button>
      </div>
      <div style={divider} />
      {rows.map(([k, v]) => (
        <div key={k} style={row}>
          <span style={key}>{k}</span>
          <span style={val}>{v}</span>
        </div>
      ))}
    </div>
  )
}
