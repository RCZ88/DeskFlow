interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === 'idle') return null

  const icons = { saving: '◌', saved: '✓', error: '✕' }
  const labels = { saving: 'Saving...', saved: 'Saved', error: 'Save failed' }

  return (
    <div className={`dk-save-indicator visible ${status}`}>
      <span>{icons[status]}</span>
      <span>{labels[status]}</span>
    </div>
  )
}
