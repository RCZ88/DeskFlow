# Round 01 — CONTEXT: Long-term goals hook + types (verbatim)

> Embedded by Project Owner (opencode) on 2026-08-07 in response to Specialist REQUEST #2.
> IMPORTANT: `goalSchema.ts` does NOT exist anywhere in the repo. The long-term-goal data model lives in `src/components/ai/types.ts` (below). Also note: GoldPage does NOT use this hook — it loads long-term goals itself via `api.getLongtermGoals()` (see GoldPage.tsx `loadLongTerm`, L969-981).

```
// src/hooks/useLongTermGoals.ts (76 lines)
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
```

## LongTermGoal type (src/components/ai/types.ts, lines 50-62)

```
export interface LongTermGoal {
	id: string
	title: string
	description?: string
	category: GoalCategory
	status: "active" | "done" | "missed"
	target_seconds?: number
	priority: number
	createdAt?: string
	completedAt?: string
	links?: any[]
	parentId?: string
}
```

## GoalCategory (src/components/ai/types.ts, lines 6-13)

```
export type GoalCategory =
	| "work"
	| "personal"
	| "health"
	| "learning"
	| "finance"
	| "relationships"
```

## CATEGORY_ACCENT (src/components/ai/types.ts, lines 90-97)

```
export const CATEGORY_ACCENT: Record<GoalCategory, string> = {
	work: "pink",
	personal: "violet",
	health: "emerald",
	learning: "cyan",
	finance: "amber",
	relationships: "red",
}
```

## Note on `deadline` + `progress`

GoldPage's `handleLTGSave` (L1077-1095) sends `deadline` and `period: 'longterm'`, `date: '2000-01-01'` via `saveGoalsBatch`. The `goals` DB table has a `deadline TEXT` column and the backend computes `progress` from progress_seconds/target_seconds (capped 100) — get-longterm-goals maps both. So the TYPE at ai/types.ts lags the runtime payload: live long-term goals carry `deadline`, `progress`, `streak`, `source`, `period`, `date` even though the interface doesn't list them. GoldPage reads `ltg.deadline`, `ltg.progress ?? 0`, `ltg.category`, `ltg.priority` directly (L600-608).
