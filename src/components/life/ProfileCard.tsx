import type { ReactNode } from 'react'
import { DotPattern } from '../ui/dot-pattern'

interface ProfileCardProps {
  title?: ReactNode
  icon?: ReactNode
  accent?: string
  dot?: boolean
  children: ReactNode
  action?: ReactNode
}

export const PROFILE_CARD_STYLE: React.CSSProperties = {
  position: 'relative',
  background: 'rgba(9, 9, 11, 0.80)',
  backdropFilter: 'blur(16px)',
  border: '1px solid color-mix(in srgb, var(--dk-accent, #a855f7) 12%, transparent)',
  borderRadius: 16,
  overflow: 'hidden',
}

export function ProfileCard({ title, icon, accent = '#a855f7', dot = false, children, action }: ProfileCardProps) {
  return (
    <div style={PROFILE_CARD_STYLE}>
      {dot && (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }}>
          <DotPattern className="w-full h-full" />
        </div>
      )}
      <div style={{ position: 'relative', padding: 16 }}>
        {(title || action) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, minHeight: 20 }}>
            {icon && <span style={{ color: accent, display: 'inline-flex', flexShrink: 0 }}>{icon}</span>}
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', color: '#a1a1aa' }}>{title}</span>
            {action}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}