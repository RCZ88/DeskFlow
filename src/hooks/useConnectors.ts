import { useState, useCallback, useEffect } from 'react'
import type { DataState } from '../components/ai/types'

export function useConnectors() {
  const [connectorsState, setConnectorsState] = useState<DataState>('loading')
  const [connectors, setConnectors] = useState<Array<{ id: string; name: string; status: string; detail?: string; itemCount?: number; type?: string }>>([])
  const [connectorSyncing, setConnectorSyncing] = useState<Record<string, true>>({})
  const [connectorStatus, setConnectorStatus] = useState({
    unreadCount: 0,
    todayEventCount: 0,
    lastSyncTime: undefined as string | undefined,
    syncing: false,
  })

  const loadConnectors = useCallback(async () => {
    setConnectorsState('loading')
    try {
      const r = await window.deskflowAPI!.connectors?.list?.()
      if (r?.success && Array.isArray(r.connectors)) {
        const enriched = await Promise.all(r.connectors.map(async (c: any) => {
          let itemCount: number | undefined
          try {
            const items = await window.deskflowAPI!.connectors?.items?.(c.id, { limit: 100 })
            itemCount = items?.items?.length
          } catch {}
          return {
            id: c.id,
            name: c.display_name || c.name || c.provider,
            status: (c.status === 'connected' ? 'ready' : c.status === 'error' ? 'error' : c.last_sync ? 'ready' : 'idle') as 'ready' | 'error' | 'idle',
            detail: c.type === 'email' ? 'IMAP · ' + (c.config?.host || '') : 'CalDAV',
            itemCount,
            type: c.type,
          }
        }))
        setConnectors(enriched)
        setConnectorsState(enriched.length === 0 ? 'empty' : 'ready')
      } else {
        setConnectors([])
        setConnectorsState('empty')
      }
    } catch (e) {
      console.error('[useConnectors] loadConnectors:', e)
      setConnectorsState('error')
    }
  }, [])

  useEffect(() => { loadConnectors() }, [loadConnectors])

  const updateConnectorStatus = useCallback(async () => {
    let unread = 0
    let todayEvents = 0
    let lastSync: string | undefined

    for (const c of connectors) {
      if (c.type === 'email' && (c.status === 'ready' || c.status === 'idle')) {
        try {
          const r = await window.deskflowAPI!.connectors?.items?.(c.id, { unreadOnly: true, limit: 50 })
          if (r?.success) unread += r.items?.length || 0
        } catch {}
      }
      if (c.type === 'calendar' && (c.status === 'ready' || c.status === 'idle')) {
        try {
          const r = await window.deskflowAPI!.connectors?.items?.(c.id, { limit: 20, type: 'event' })
          if (r?.success) {
            const now = new Date()
            const today = (r.items || []).filter((item: any) => {
              const d = new Date(item.date)
              return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            })
            todayEvents += today.length
          }
        } catch {}
      }
    }

    try {
      const r = await window.deskflowAPI!.connectors?.list?.()
      if (r?.success && r.connectors) {
        for (const c of r.connectors) {
          if (c.lastSync && (!lastSync || new Date(c.lastSync) > new Date(lastSync))) {
            lastSync = c.lastSync
          }
        }
      }
    } catch {}

    setConnectorStatus(prev => ({
      ...prev,
      unreadCount: unread,
      todayEventCount: todayEvents,
      lastSyncTime: lastSync ? new Date(lastSync).toLocaleString() : undefined,
    }))
  }, [connectors])

  return {
    connectors, connectorsState, connectorSyncing, setConnectorSyncing,
    connectorStatus, loadConnectors, updateConnectorStatus,
  }
}
