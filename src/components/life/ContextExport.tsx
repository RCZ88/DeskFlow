import { useState, useCallback } from 'react'
import { Download, Copy, Check, FileJson } from 'lucide-react'

interface ContextExportProps {
  profile: any
}

export function ContextExport({ profile }: ContextExportProps) {
  const [copied, setCopied] = useState(false)

  const exportData = useCallback(() => {
    if (!profile) return null
    return {
      _meta: {
        exportedAt: new Date().toISOString(),
        source: 'DeskFlow Context System',
        version: profile.contextVersion || 1,
      },
      personality: {
        traits: Object.values(profile.traits || {}).map((t: any) => ({
          trait: t.content,
          confidence: t.confidence,
          evidenceCount: t.occurrences,
        })),
        communicationStyle: Object.values(profile.communicationStyle || {}).map((c: any) => ({
          style: c.content,
          confidence: c.confidence,
        })),
      },
      interests: Object.values(profile.interests || {}).map((i: any) => ({
        topic: i.content,
        engagementScore: i.confidence,
        timesMentioned: i.occurrences,
      })),
      habits: Object.values(profile.habits || {}).map((h: any) => ({
        habit: h.content,
        confidence: h.confidence,
        observedCount: h.occurrences,
      })),
      growthTimeline: (profile.growthMarkers || []).map((m: any) => ({
        date: m.date,
        milestone: m.label,
        source: m.source,
        type: m.type,
      })),
      goals: profile.goalsPattern || {},
      activity: profile.activityPattern || {},
    }
  }, [profile])

  const handleCopy = useCallback(async () => {
    const data = exportData()
    if (!data) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [exportData])

  const handleDownload = useCallback(() => {
    const data = exportData()
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deskflow-context-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [exportData])

  if (!profile) return null

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(24, 24, 27, 0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2">
        <FileJson size={14} style={{ color: 'var(--dk-accent)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--dk-text-secondary)' }}>Export Context</span>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--dk-text-faint)' }}>
        Export your context profile as JSON to give to any AI system. It contains your personality traits, interests, habits, communication style, and growth timeline.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
          style={{
            background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(168, 85, 247, 0.1)',
            color: copied ? '#22c55e' : 'var(--dk-accent)',
            border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(168, 85, 247, 0.2)'}`,
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--dk-text-secondary)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Download size={11} />
          Download
        </button>
      </div>
    </div>
  )
}
