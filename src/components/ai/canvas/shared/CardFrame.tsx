// Shared glass frame for ALL canvas cards (RESULT.md R2/R4 spec).
// Handles glassmorphism tokens, the header row (type label + pin/dismiss)
// and the scrollable body. Drag/resize logic stays in CanvasCard — this
// component is purely presentational so every card renders identically.
import type { ReactNode } from 'react'
import { Pin, PinOff, X } from 'lucide-react'

interface CardFrameProps {
  type: string
  pinned?: boolean
  onPin?: () => void
  onDismiss?: () => void
  hideHeader?: boolean
  children: ReactNode
}

export function CardFrame({ type, pinned, onPin, onDismiss, hideHeader, children }: CardFrameProps) {
  if (hideHeader) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Floating actions when header is hidden */}
        {(onPin || onDismiss) && (
          <div className="dk-canvas-card-actions floating">
            {onPin && (
              <button
                className={`dk-canvas-pin-btn ${pinned ? 'pinned' : ''}`}
                onClick={(e) => { e.stopPropagation(); onPin() }}
                title={pinned ? 'Unpin card' : 'Pin card'}
              >
                {pinned ? <PinOff size={13} /> : <Pin size={13} />}
              </button>
            )}
            {onDismiss && (
              <button className="dk-canvas-dismiss" onClick={(e) => { e.stopPropagation(); onDismiss() }} title="Dismiss">
                <X size={13} />
              </button>
            )}
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
      </div>
    )
  }

  return (
    <>
      <div className="dk-canvas-card-header" style={{ cursor: 'grab' }}>
        <span className="dk-canvas-card-type">{type}</span>
        <div className="dk-canvas-card-actions">
          {onPin && (
            <button
              className={`dk-canvas-pin-btn ${pinned ? 'pinned' : ''}`}
              onClick={(e) => { e.stopPropagation(); onPin() }}
              title={pinned ? 'Unpin card' : 'Pin card'}
            >
              {pinned ? <PinOff size={13} /> : <Pin size={13} />}
            </button>
          )}
          {onDismiss && (
            <button className="dk-canvas-dismiss" onClick={(e) => { e.stopPropagation(); onDismiss() }} title="Dismiss">
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="dk-canvas-card-body">{children}</div>
    </>
  )
}
