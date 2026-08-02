import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (status === 'idle') {
      // Keep "saved" visible for 3s, then hide
      const timer = setTimeout(() => setShow(false), 3000)
      return () => clearTimeout(timer)
    }
    setShow(true)
  }, [status])

  if (!show && status === 'idle') return null

  const config = {
    saving: { icon: <Save size={12} className="dk-save-spin" />, label: 'Saving...', color: 'var(--dk-accent)' },
    saved: { icon: <span style={{ fontSize: 13 }}>✓</span>, label: 'Saved', color: 'var(--dk-success)' },
    error: { icon: <span style={{ fontSize: 13 }}>✕</span>, label: 'Save failed', color: 'var(--dk-danger)' },
    idle: { icon: null, label: '', color: 'transparent' },
  }
  const c = config[status]

  return (
    <div
      className="dk-save-indicator visible"
      style={{
        opacity: status === 'idle' ? 0 : 1,
        color: c.color,
        transition: 'opacity 0.3s ease',
      }}
    >
      {c.icon}
      <span>{c.label}</span>
    </div>
  )
}
