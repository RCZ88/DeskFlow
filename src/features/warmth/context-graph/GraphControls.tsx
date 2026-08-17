import { useState, useCallback } from 'react'
import { Search, Filter } from 'lucide-react'
import { TYPE_COLORS } from './types'

interface GraphControlsProps {
  onSearchChange: (query: string) => void
  onTypeToggle: (type: string) => void
  hiddenTypes: Set<string>
  entityTypes: string[]
}

export function GraphControls({ onSearchChange, onTypeToggle, hiddenTypes, entityTypes }: GraphControlsProps) {
  const [search, setSearch] = useState('')

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)
    onSearchChange(value)
  }, [onSearchChange])

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 50,
    }}>
      {/* Search bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'rgba(9, 9, 11, 0.80)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 10,
        width: 240,
      }}>
        <Search size={13} style={{ color: '#52525b', flexShrink: 0 }} />
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search entities"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fafafa',
            fontSize: 12,
            fontFamily: "'Inter', sans-serif",
          }}
        />
      </div>

      {/* Type filter chips */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        padding: '6px 10px',
        background: 'rgba(9, 9, 11, 0.80)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 10,
        maxWidth: 280,
      }}>
        <Filter size={11} style={{ color: '#52525b', marginRight: 4, alignSelf: 'center' }} />
        {entityTypes.map(type => {
          const isHidden = hiddenTypes.has(type)
          const color = TYPE_COLORS[type] || '#71717a'
          return (
            <button
              key={type}
              onClick={() => onTypeToggle(type)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 500,
                background: isHidden ? 'transparent' : `${color}15`,
                color: isHidden ? '#3f3f46' : color,
                border: `1px solid ${isHidden ? 'rgba(255,255,255,0.04)' : `${color}30`}`,
                cursor: 'pointer',
                opacity: isHidden ? 0.4 : 1,
                transition: 'all 0.15s ease',
                textTransform: 'capitalize',
              }}
            >
              {type}
            </button>
          )
        })}
      </div>
    </div>
  )
}
