import { useState, useCallback, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { parseChecklist } from '../services/planningParser'
import type { Goal } from '../components/ai/types'

export function usePlanningNotes(today: string) {
  const { showToast } = useToast()
  const [planningNotes, setPlanningNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [planGoals, setPlanGoals] = useState<Goal[]>([])
  const [review, setReview] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const loadPlanGoals = useCallback(async () => {
    try {
      const r = await window.deskflowAPI!.readPlanningMd()
      if (r.content) {
        const items = parseChecklist(r.content).filter(i => !i.checked)
        setPlanGoals(items.map(i => ({
          id: crypto.randomUUID(),
          title: i.title,
          targetSeconds: i.targetSeconds,
          category: 'work' as const,
          status: 'active' as const,
          period: 'daily',
          date: today,
          source: 'planning',
          links: [],
          createdAt: new Date().toISOString(),
          target: { type: 'completion' as const },
        })))
        setPlanningNotes(r.content)
      }
    } catch (e) { console.error('[usePlanningNotes] load:', e) }
  }, [today])

  useEffect(() => { loadPlanGoals() }, [loadPlanGoals])

  const handleSaveNotes = useCallback(async (content: string) => {
    setSavingNotes(true)
    try {
      await window.deskflowAPI!.writePlanningMd({ content })
      setPlanningNotes(content)
      showToast('Notes saved', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to save notes', 'error')
    } finally {
      setSavingNotes(false)
    }
  }, [showToast])

  const handleSaveReview = useCallback(async (message: string) => {
    try {
      await window.deskflowAPI!.saveGoalReview(today, message)
      setReview(message)
      setReviewError(null)
      showToast('Review saved', 'success')
    } catch (err: any) {
      setReviewError(err.message)
      showToast(err.message || 'Failed to save review', 'error')
    }
  }, [today, showToast])

  const handleAnalyzeDump = useCallback(async (text: string): Promise<Partial<Goal>[]> => {
    try {
      const r = await window.deskflowAPI!.parseGoalDump(text)
      return r.goals || []
    } catch (err: any) {
      showToast(err.message || 'Failed to analyze', 'error')
      return []
    }
  }, [showToast])

  return {
    planningNotes, savingNotes, planGoals, review, reviewError,
    loadPlanGoals, handleSaveNotes, handleSaveReview, handleAnalyzeDump,
  }
}
