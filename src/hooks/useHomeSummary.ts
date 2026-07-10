import { useState, useEffect, useCallback } from 'react'

export interface HomeSummary {
  focusMinutes: number
  walletCount: number
  totalBalance: number
  dueReviews: number
  sleepSeconds: number
  financeLocked: boolean
  trends?: {
    focus?: number[]
    balance?: number[]
    reviews?: number[]
    sleep?: number[]
  }
}

export function useHomeSummary() {
  const [data, setData] = useState<HomeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const api = (window as any).deskflowAPI
    if (!api?.getHomeSummary) { setLoading(false); return }
    try {
      const res = await api.getHomeSummary()
      if (res?.success) {
        setData(res.data)
        setError(null)
      } else {
        setError(res?.error ?? 'Failed to load summary')
        setData(null)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const api = (window as any).deskflowAPI
    const off = api?.onForegroundChange?.(() => refresh())
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      off?.()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  return { data, loading, error, refresh }
}
