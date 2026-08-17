import { useEffect, useState } from 'react'

export interface PhasePeriodContext {
  range: { start: string; end: string; isOngoing: boolean }
  availability: {
    appUsage: boolean; browser: boolean; focus: boolean; finance: boolean
    sleep: boolean; ai: boolean; code: boolean; projects: boolean; subscriptions: boolean
  }
  summary: {
    productiveMs: number; distractingMs: number; neutralMs: number
    focusMs: number; focusSessionCount: number
    netFinance: number; incomeTotal: number; expenseTotal: number
    sleepAvgMinutes: number; aiCost: number
    codeLinesAdded: number; codeLinesRemoved: number
    memoryCount: number; covenantCompletionCount: number; goalCount: number
  }
  appUsage: { totalMs: number; productiveMs: number; distractingMs: number; neutralMs: number; topApps: { name: string; totalMs: number; category: string }[]; hourly: { hour: number; totalMs: number }[] } | null
  browser: { totalMs: number; topDomains: { domain: string; totalMs: number; category: string }[] } | null
  focus: { totalMs: number; sessionCount: number; averageSessionMs: number; strictness: { label: string; count: number; totalMs: number }[]; topApps: { name: string; count: number }[]; groups: { name: string; color: string; totalMs: number }[] } | null
  finance: { incomeTotal: number; expenseTotal: number; transferTotal: number; net: number; currency: string | null; topCategories: { categoryId: number | null; label: string; total: number; type: string }[]; walletDeltas: any[] } | null
  subscriptions: { activeDuringPhase: { id: string; name: string; amount: number; billingCycle: string; category: string; status: string }[]; estimatedMonthlyBurn: number } | null
  sleep: { sessionCount: number; totalMinutes: number; averageMinutes: number; averageBedtime: string | null; averageWakeTime: string | null; consistencyScore: number | null; nightly: { date: string; startedAt: string; endedAt: string; durationMinutes: number }[] } | null
  ai: { totalRequests: number; totalTokensIn: number; totalTokensOut: number; totalCost: number; topTools: { tool: string; count: number; cost: number }[]; topModels: { model: string; count: number; cost: number }[] } | null
  code: { totalEvents: number; linesAdded: number; linesRemoved: number; topFiles: { filePath: string; workspacePath: string; events: number; linesAdded: number; linesRemoved: number }[]; topWorkspaces: any[] } | null
  projects: { activeProjects: { id: string; name: string; path: string; detectedAt: string; lastSeenAt: string }[]; aiUsageByProject: any[] } | null
  goals: { completedCount: number; longTermGoalTitles: string[] }
}

function getPhaseRange(phase: { startYear: number; startMonth: number; endYear?: number | null; endMonth?: number | null }) {
  const start = new Date(Date.UTC(phase.startYear, phase.startMonth - 1, 1)).toISOString().slice(0, 10)
  const end = phase.endYear
    ? new Date(Date.UTC(phase.endYear, (phase.endMonth ?? 12) - 1, 28)).toISOString().slice(0, 10)
    : null
  return { start, end }
}

export function usePeriodContext(
  phaseId: string | null,
  phase: { startYear: number; startMonth: number; endYear?: number | null; endMonth?: number | null } | null,
  enabled: boolean
) {
  const [context, setContext] = useState<PhasePeriodContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !phaseId || !phase) {
      setContext(null)
      return
    }

    let active = true
    const { start, end } = getPhaseRange(phase)

    setLoading(true)
    setError(null)

    ;(window as any).deskflowAPI.lifePhaseGetPeriodContext({ startDate: start, endDate: end })
      .then((res: any) => {
        if (!active) return
        if (res?.ok && res.data) {
          setContext(res.data as PhasePeriodContext)
        } else {
          setError(res?.error || 'Failed to load context')
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load context')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [phaseId, phase?.startYear, phase?.startMonth, phase?.endYear, phase?.endMonth, enabled])

  return { context, loading, error }
}
