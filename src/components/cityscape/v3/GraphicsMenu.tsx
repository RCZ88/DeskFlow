import type { CSSProperties } from 'react'
import { QUALITY_ORDER, PRESETS, type QualityTier } from './graphicsPresets'

const wrap: CSSProperties = {
  position: 'absolute', top: 16, left: 16, zIndex: 20,
  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
  background: 'rgba(8,12,22,0.72)', backdropFilter: 'blur(8px)',
  border: '1px solid #1b3a8f', borderRadius: 10, color: '#cfe8ff',
  fontFamily: 'ui-sans-serif, system-ui', fontSize: 12, userSelect: 'none',
}
const labelStyle: CSSProperties = { opacity: 0.7, marginRight: 2, letterSpacing: 0.4 }
const rowStyle: CSSProperties = { display: 'flex', gap: 4 }

function btnStyle(active: boolean): CSSProperties {
  return {
    padding: '4px 9px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
    border: `1px solid ${active ? '#00e5ff' : '#2a3556'}`,
    background: active ? 'rgba(0,229,255,0.16)' : 'transparent',
    color: active ? '#00e5ff' : '#8aa0c0',
    boxShadow: active ? '0 0 12px rgba(0,229,255,0.35)' : 'none',
    transition: 'all 0.15s ease',
  }
}

export function GraphicsMenu({ value, onChange }: { value: QualityTier; onChange: (t: QualityTier) => void }) {
  return (
    <div style={wrap}>
      <span style={labelStyle}>GRAPHICS</span>
      <div style={rowStyle}>
        {QUALITY_ORDER.map((tier) => (
          <button key={tier} style={btnStyle(tier === value)} onClick={() => onChange(tier)}>
            {PRESETS[tier].label}
          </button>
        ))}
      </div>
    </div>
  )
}
