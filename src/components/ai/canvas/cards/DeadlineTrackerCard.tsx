import { useState, useEffect, useCallback } from 'react'
import { DeadlineItem } from './DeadlineItem'
import type { Goal } from '../../../services/GoalStore'
import { CalendarClock } from 'lucide-react'

interface Deadline { id: string; title: string; course?: string; due_date: string; priority: string; status: string; description?: string; category?: string }

export function DeadlineTrackerCard({ days = 14 }: { days?: number }) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [linkedMap, setLinkedMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const api = (window as any).deskflowAPI; if (!api) { setLoading(false); return }
    Promise.all([
      api.getDeadlines?.({ days }).then((r: any) => r?.deadlines || (Array.isArray(r) ? r : [])).catch(() => []),
      api.getGoals?.(new Date().toISOString().slice(0, 10)).then((r: any) => r?.goals || (Array.isArray(r) ? r : [])).catch(() => []),
    ]).then(([dl, gl]) => {
      setDeadlines(dl); setGoals(gl)
      const map: Record<string, string> = {}
      for (const g of gl) { if (!g.links) continue; try { const links = Array.isArray(g.links) ? g.links : JSON.parse(g.links || '[]'); for (const l of links) { if (l.label) { const match = dl.find((d: Deadline) => d.title === l.label); if (match) map[match.id] = g.id } } } catch {} }
      setLinkedMap(map); setLoading(false)
    })
  }, [days])

  const createGoalFromDeadline = useCallback(async (deadlineTitle: string) => {
    const api = (window as any).deskflowAPI; if (!api?.saveGoal) return
    const dl = deadlines.find(d => d.title === deadlineTitle); if (!dl) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      await api.saveGoal(today, { title: `Prepare for: ${dl.title}`, description: `Deadline: ${dl.title}${dl.course ? ` (${dl.course})` : ''}`, category: dl.course ? 'work' : 'learning', target: { type: 'completion' }, status: 'pending', source: 'ai', links: [{ label: dl.title, url: '' }] })
      const updated = await api.getGoals?.(today); const updatedGoals = updated?.goals || (Array.isArray(updated) ? updated : []); setGoals(updatedGoals)
      const map: Record<string, string> = {}
      for (const g of updatedGoals) { if (!g.links) continue; try { const links = Array.isArray(g.links) ? g.links : JSON.parse(g.links || '[]'); for (const l of links) { if (l.label) { const match = deadlines.find(d => d.title === l.label); if (match) map[match.id] = g.id } } } catch {} }
      setLinkedMap(map)
    } catch { setError('Failed to create goal'); setTimeout(() => setError(null), 3000) }
  }, [deadlines])

  const sorted = [...deadlines].filter(d => d.status !== 'done').sort((a, b) => {
    const pa = { high: 0, medium: 1, low: 2 }[a.priority] ?? 99; const pb = { high: 0, medium: 1, low: 2 }[b.priority] ?? 99
    if (pa !== pb) return pa - pb; return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  if (loading) return (
    <div className="dk-card dk-deadline-tracker">
      <div className="dk-card-header"><div className="dk-skeleton dk-skeleton-title" style={{ width: 100 }} /></div>
      <div className="dk-card-body"><div className="dk-skeleton" style={{ width: '100%', height: 48, marginBottom: 8 }} /><div className="dk-skeleton" style={{ width: '100%', height: 48, marginBottom: 8 }} /><div className="dk-skeleton" style={{ width: '90%', height: 48 }} /></div>
    </div>
  )

  return (
    <div className="dk-card dk-deadline-tracker">
      <div className="dk-card-header">
        <div className="dk-card-header-left"><CalendarClock size={16} color="var(--dk-accent)" /><span className="dk-card-title">Deadlines</span></div>
        <span className="dk-card-badge">{sorted.length} upcoming</span>
      </div>
      <div className="dk-card-body">
        {sorted.length === 0 ? (
          <div className="dk-empty-state"><CalendarClock size={28} color="var(--dk-text-faint)" /><p>No upcoming deadlines.</p></div>
        ) : (
          <div className="dk-deadline-list">
            {sorted.map(dl => {
              const linkedGoalId = linkedMap[dl.id]
              const linkedGoal = linkedGoalId ? goals.find(g => g.id === linkedGoalId) : undefined
              return <DeadlineItem key={dl.id} id={dl.id} title={dl.title} course={dl.course} dueDate={dl.due_date} priority={dl.priority} status={dl.status} linkedGoalStatus={linkedGoal?.status} onCreateGoal={createGoalFromDeadline} />
            })}
          </div>
        )}
        {error && <span className="dk-error-text">{error}</span>}
      </div>
    </div>
  )
}
