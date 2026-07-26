import { useState, useCallback, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import type { LongTermGoal } from '../components/ai/types'

export function useLongTermGoals() {
  const { showToast } = useToast()
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([])

  const loadLongTermGoals = useCallback(async () => {
    try {
      const r = await window.deskflowAPI!.getLongtermGoals()
      if (r.success && r.goals) {
        setLongTermGoals(r.goals.map((g: any) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          category: g.category,
          status: g.status === 'completed' ? 'done' : g.status,
          priority: g.priority ?? 3,
          createdAt: g.createdAt,
          completedAt: g.completedAt,
          links: g.links || [],
          target: g.target || { type: 'completion' },
        })))
      }
    } catch (e) { console.error('[useLongTermGoals] load:', e) }
  }, [])

  useEffect(() => { loadLongTermGoals() }, [loadLongTermGoals])

  const handleToggleLongTermGoal = useCallback(async (goal: LongTermGoal) => {
    try {
      const newStatus = goal.status === 'done' ? 'active' : 'done'
      await window.deskflowAPI!.saveGoalsBatch([{ ...goal, status: newStatus }])
      setLongTermGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus } : g))
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle goal', 'error')
    }
  }, [showToast])

  const handleDeleteLongTermGoal = useCallback(async (id: string) => {
    try {
      await window.deskflowAPI!.deleteGoal(id)
      setLongTermGoals(prev => prev.filter(g => g.id !== id))
      showToast('Goal deleted', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to delete goal', 'error')
    }
  }, [showToast])

  const handleUpdateLongTermGoal = useCallback(async (goal: LongTermGoal) => {
    try {
      await window.deskflowAPI!.saveGoalsBatch([goal])
      setLongTermGoals(prev => prev.map(g => g.id === goal.id ? goal : g))
      showToast('Goal updated', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to update goal', 'error')
    }
  }, [showToast])

  const handleSaveGoals = useCallback(async (goals: Partial<LongTermGoal>[]) => {
    try {
      await window.deskflowAPI!.saveGoalsBatch(goals)
      await loadLongTermGoals()
      showToast(`${goals.length} goals saved`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to save goals', 'error')
    }
  }, [loadLongTermGoals, showToast])

  return {
    longTermGoals, loadLongTermGoals,
    handleToggleLongTermGoal, handleDeleteLongTermGoal,
    handleUpdateLongTermGoal, handleSaveGoals,
  }
}
