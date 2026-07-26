import { useEffect, useRef, useCallback } from "react"

const SYNC_INTERVAL_MS = 30 * 60 * 1000

interface AutoSyncOptions {
  connectors: Array<{ id: string; status: string }>
  enabled?: boolean
  onSync?: (id: string) => Promise<void>
  onSyncAll?: () => Promise<void>
}

export function useAutoSync(opts: AutoSyncOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const syncingRef = useRef(false)

  const doSync = useCallback(async () => {
    if (syncingRef.current) return
    const active = opts.connectors.filter(c => c.status === "connected" || c.status === "ready")
    if (active.length === 0) return

    syncingRef.current = true
    try {
      if (opts.onSyncAll) {
        await opts.onSyncAll()
      } else {
        for (const c of active) {
          try { await opts.onSync?.(c.id) } catch {}
        }
      }
    } finally {
      syncingRef.current = false
    }
  }, [opts.connectors, opts.onSync, opts.onSyncAll])

  useEffect(() => {
    if (!opts.enabled) return

    const mountTimeout = setTimeout(() => doSync(), 5000)
    intervalRef.current = setInterval(doSync, SYNC_INTERVAL_MS)

    return () => {
      clearTimeout(mountTimeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [opts.enabled, doSync])

  return { isSyncing: syncingRef.current }
}
