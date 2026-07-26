import { useState, useEffect, useCallback, useRef } from 'react'
import type { Goal } from '../services/GoalStore'

const POLL_INTERVAL_MS = 30000

interface GoalProgress {
  goalId: string
  progressSeconds: number
  targetSeconds: number
  percentComplete: number
  status: 'pending' | 'active' | 'completed' | 'overdue'
}

export function useGoalProgress(date: string, goals: Goal[]) {
  const [progressMap, setProgressMap] = useState<Record<string, GoalProgress>>({})
  const [loading, setLoading] = useState(true)
  const timeBasedGoals = goals.filter(g => g.target?.type === 'time' && g.target?.matchCategory)
  const abortRef = useRef<AbortController | null>(null)

  const computeProgress = useCallback(async () => {
    if (timeBasedGoals.length === 0) {
      setProgressMap({})
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const api = (window as any).deskflowAPI
      if (!api?.['get-logs-by-period']) return

      const logs = await api['get-logs-by-period']({ period: 'day', dateOffset: 0 })
      if (!Array.isArray(logs)) return

      const categorySeconds: Record<string, number> = {}
      for (const log of logs) {
        const cat = (log.category || 'uncategorized').toLowerCase()
        const sec = Math.floor((log.duration_ms || 0) / 1000)
        categorySeconds[cat] = (categorySeconds[cat] || 0) + sec
      }

      const map: Record<string, GoalProgress> = {}
      for (const goal of timeBasedGoals) {
        const matchCat = (goal.target?.matchCategory || '').toLowerCase()
        const progressSec = categorySeconds[matchCat] || 0
        const targetSec = goal.target?.targetSeconds || 3600
        const pct = Math.min(100, Math.round((progressSec / targetSec) * 100))

        map[goal.id] = {
          goalId: goal.id,
          progressSeconds: progressSec,
          targetSeconds: targetSec,
          percentComplete: pct,
          status: pct >= 100 ? 'completed' : progressSec > 0 ? 'active' : 'pending',
        }
      }

      setProgressMap(map)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [date, timeBasedGoals])

  useEffect(() => {
    computeProgress()
    const interval = setInterval(computeProgress, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [computeProgress])

  return { progressMap, loading, refetch: computeProgress }
}
