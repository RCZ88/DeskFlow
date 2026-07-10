import { useCallback } from 'react'
import { useAiPageData, clearAiPageCache } from './useAiPageData'
import type { Goal } from '../services/GoalStore'

type DashboardAggregates = any
type AIUsageSummary = any
type SleepRecord = any
type ExternalSession = any
type Project = any

export type AppContext = {
  goals: Goal[]
  aggregates: DashboardAggregates | null
  aiUsage: AIUsageSummary | null
  projects: Project[]
  sleep: SleepRecord | null
  external: ExternalSession[]
  loading: boolean
  refresh: () => void
}

export function useAppContext(today: string): AppContext {
  const { data: goalsData, loading: goalsLoading, refresh: refreshGoals } = useAiPageData<{ goals: Goal[] }>('goals', () =>
    window.deskflowAPI!.getGoals(today)
  )
  const goals = goalsData?.goals ?? []
  const { data: aggregates, loading: aggLoading, refresh: refreshAgg } = useAiPageData<DashboardAggregates>('dashboardAggregates', () =>
    window.deskflowAPI!.getDashboardAggregates({ period: 'today' })
  )
  const { data: aiUsage, loading: aiLoading, refresh: refreshAi } = useAiPageData<AIUsageSummary>('aiUsage', () =>
    window.deskflowAPI!.getAIUsageSummary('day')
  )
  const { data: projects, loading: projLoading, refresh: refreshProj } = useAiPageData<Project[]>('projects', () =>
    window.deskflowAPI!.getProjects()
  )
  const { data: sleep, loading: sleepLoading, refresh: refreshSleep } = useAiPageData<SleepRecord>('sleep', () =>
    window.deskflowAPI!.getSleepForDate(today)
  )
  const { data: external, loading: extLoading, refresh: refreshExt } = useAiPageData<ExternalSession[]>('external', () =>
    window.deskflowAPI!.getExternalSessions({ date: today })
  )

  const refresh = useCallback(() => {
    clearAiPageCache()
    refreshGoals()
    refreshAgg()
    refreshAi()
    refreshProj()
    refreshSleep()
    refreshExt()
  }, [refreshGoals, refreshAgg, refreshAi, refreshProj, refreshSleep, refreshExt])

  return {
    goals: goals ?? [],
    aggregates: aggregates ?? null,
    aiUsage: aiUsage ?? null,
    projects: projects ?? [],
    sleep: sleep ?? null,
    external: external ?? [],
    loading: goalsLoading || aggLoading || aiLoading || projLoading || sleepLoading || extLoading,
    refresh,
  }
}
