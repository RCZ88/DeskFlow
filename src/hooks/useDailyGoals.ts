import { useState, useCallback, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import type { Goal, DataState } from '../components/ai/types'

export function useDailyGoals(today: string) {
  const { showToast } = useToast()
  const [goals, setGoals] = useState<Goal[]>([])
  const [review, setReview] = useState<string | null>(null)
  const [goalsState, setGoalsState] = useState<DataState>('loading')
  const [goalsError, setGoalsError] = useState<string | null>(null)
  const [toggleErrors, setToggleErrors] = useState<Record<number, string>>({})

  const loadGoals = useCallback(async () => {
    setGoalsState('loading')
    setGoalsError(null)
    try {
      const day = await window.deskflowAPI!.getGoals(today)
      setGoals(day.goals || [])
      setReview(day.reviewSummary || null)
      setGoalsState(day.goals?.length ? 'ready' : 'empty')
    } catch (err: any) {
      setGoalsError(err.message || 'Failed to load goals')
      setGoalsState('error')
    }
  }, [today])

  useEffect(() => { loadGoals() }, [loadGoals])

  const handleToggleGoal = useCallback(async (goal: Goal) => {
    try {
      const newStatus = goal.status === 'done' ? 'active' : 'done'
      await window.deskflowAPI!.saveGoal(today, {
        ...goal,
        status: newStatus,
        completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
      })
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus } : g))
    } catch (err: any) {
      setToggleErrors(prev => ({ ...prev, [goal.id]: err.message }))
      showToast(err.message || 'Failed to toggle goal', 'error')
    }
  }, [today, showToast])

  const handleAcceptSuggestion = useCallback(async (suggestion: Goal) => {
    try {
      const newGoal: Goal = {
        ...suggestion,
        id: crypto.randomUUID(),
        date: today,
        source: 'suggestion',
        status: 'active',
        createdAt: new Date().toISOString(),
      }
      await window.deskflowAPI!.saveGoal(today, newGoal)
      setGoals(prev => [...prev, newGoal])
      showToast('Goal added', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to add goal', 'error')
    }
  }, [today, showToast])

  const handleDismissSuggestion = useCallback((_id: string) => {
    // Suggestions are ephemeral, no persistence needed
  }, [])

  const goalsDataState = (() => {
    if (goalsState === 'loading') return 'loading'
    if (goalsError) return 'error'
    if (goals.length === 0) return 'empty'
    return 'ready'
  })() as DataState

  return {
    goals, review, goalsState, goalsError, goalsDataState, toggleErrors,
    loadGoals, handleToggleGoal, handleAcceptSuggestion, handleDismissSuggestion,
  }
}
