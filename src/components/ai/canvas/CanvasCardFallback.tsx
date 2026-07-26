interface CanvasCardFallbackProps {
  cardType: string
  error: string
  onRetry: () => void
  onDismiss: () => void
}

export function CanvasCardFallback({ cardType, error, onRetry, onDismiss }: CanvasCardFallbackProps) {
  return (
    <div className="dk-canvas-card dk-canvas-card-error">
      <div className="dk-canvas-error-icon">⚠</div>
      <div className="dk-canvas-error-type">{cardType}</div>
      <div className="dk-canvas-error-msg">{error}</div>
      <div className="dk-canvas-error-actions">
        <button onClick={onRetry} className="dk-canvas-btn-retry">Retry</button>
        <button onClick={onDismiss} className="dk-canvas-btn-dismiss">Dismiss</button>
      </div>
    </div>
  )
}
