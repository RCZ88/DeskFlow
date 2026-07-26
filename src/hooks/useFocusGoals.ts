import { useState, useEffect, useRef, useCallback } from 'react'
import type { Goal } from '../services/GoalStore'

interface FocusState {
  isActive: boolean
  isBroken: boolean
  allowedCategories: string[]
  sessionId?: string
}

interface FocusGoalProgress {
  goalId: string
  accumulatedSeconds: number
  lastTickAt: number
}

const TICK_MS = 1000
const POLL_MS = 2000

export function useFocusGoals(goals: Goal[]) {
  const [focusState, setFocusState] = useState<FocusState | null>(null)
  const [activeGoalIds, setActiveGoalIds] = useState<string[]>([])
  const progressRef = useRef<Record<string, FocusGoalProgress>>({})
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const goalsRef = useRef(goals)
  goalsRef.current = goals

  const timeBasedGoals = goals.filter(g => g.target?.type === 'time' && g.target?.matchCategory)

  // Persist accumulated progress to DB
  const persistProgress = useCallback(async () => {
    const api = (window as any).deskflowAPI
    if (!api?.['save-goal']) return

    for (const [id, prog] of Object.entries(progressRef.current)) {
      if (prog.accumulatedSeconds < 1) continue

      const goal = goalsRef.current.find(g => g.id === id)
      if (!goal) continue

      const newProgress = (goal.progressSeconds || 0) + Math.floor(prog.accumulatedSeconds)
      const targetSec = goal.target?.targetSeconds || 3600

      try {
        await api['save-goal'](goal.date, {
          ...goal,
          progressSeconds: Math.min(newProgress, targetSec),
          status: newProgress >= targetSec ? 'completed' : goal.status,
        })
      } catch (e) {
        console.error('Failed to persist goal progress:', e)
      }
    }

    progressRef.current = {}
  }, [])

  // Poll focus state
  useEffect(() => {
    const api = (window as any).deskflowAPI
    if (!api?.focus?.getState) return

    let wasActive = false

    const checkState = async () => {
      try {
        const state = await api.focus.getState()
        if (!state) {
          if (wasActive && Object.keys(progressRef.current).length > 0) {
            await persistProgress()
          }
          wasActive = false
          setFocusState(null)
          return
        }

        const newState: FocusState = {
          isActive: state.outcome === 'active',
          isBroken: state.outcome === 'failed' || !!state.broke_on_type,
          allowedCategories: state.allowed_json
            ? (() => { try { return JSON.parse(state.allowed_json).categories || [] } catch { return [] } })()
            : [],
          sessionId: String(state.id),
        }

        if (wasActive && !newState.isActive) {
          await persistProgress()
        }
        wasActive = newState.isActive

        setFocusState(newState)
      } catch {
        // silently fail
      }
    }

    checkState()
    pollRef.current = setInterval(checkState, POLL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [persistProgress])

  // Determine which goals match current focus
  useEffect(() => {
    if (!focusState?.isActive || focusState.isBroken) {
      setActiveGoalIds([])
      return
    }

    const allowed = focusState.allowedCategories.map((c: string) => c.toLowerCase())
    const matched = timeBasedGoals
      .filter(g => allowed.includes((g.target?.matchCategory || '').toLowerCase()))
      .map(g => g.id)

    setActiveGoalIds(matched)

    for (const id of matched) {
      if (!progressRef.current[id]) {
        progressRef.current[id] = { goalId: id, accumulatedSeconds: 0, lastTickAt: Date.now() }
      }
    }
  }, [focusState, timeBasedGoals])

  // Tick every second when focus is active
  useEffect(() => {
    if (activeGoalIds.length === 0 || focusState?.isBroken) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      return
    }

    tickRef.current = setInterval(() => {
      const now = Date.now()
      for (const id of activeGoalIds) {
        const prog = progressRef.current[id]
        if (prog) { prog.accumulatedSeconds += TICK_MS / 1000; prog.lastTickAt = now }
      }
    }, TICK_MS)

    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null } }
  }, [activeGoalIds, focusState?.isBroken])

  // Persist on unmount
  useEffect(() => {
    return () => { if (Object.keys(progressRef.current).length > 0) persistProgress() }
  }, [persistProgress])

  const getAccumulatedSeconds = useCallback((goalId: string): number => {
    return Math.floor(progressRef.current[goalId]?.accumulatedSeconds || 0)
  }, [])

  return { focusState, activeGoalIds, getAccumulatedSeconds, persistProgress }
}
