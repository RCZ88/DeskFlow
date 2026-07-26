import { useState, useCallback, useEffect } from 'react'

export function useReminders(connectors: Array<{ id: string; name: string; type?: string }>) {
  const [reminders, setReminders] = useState<any[]>([])
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [remindersLoading, setRemindersLoading] = useState(false)
  const [remindersError, setRemindersError] = useState<string | null>(null)

  const loadReminders = useCallback(async () => {
    try {
      const result = await window.deskflowAPI!.getReminders()
      if (result?.success) setReminders(result.reminders || [])
    } catch (e: any) {
      setRemindersError(e.message)
    }
  }, [])

  const loadCalendarEvents = useCallback(async () => {
    if (!connectors.length) return
    setRemindersLoading(true)
    try {
      const allEvents: any[] = []
      for (const connector of connectors) {
        if (connector.type === 'calendar') {
          const result = await (window.deskflowAPI! as any).connectors?.items?.(connector.id, { type: 'event', limit: 20 })
          if (result?.items) {
            allEvents.push(...result.items.map((item: any) => ({
              id: item.id,
              title: item.subject || 'Untitled Event',
              date: item.date,
              connectorName: connector.name,
              connectorId: connector.id,
            })))
          }
        }
      }
      setCalendarEvents(allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    } catch (e: any) {
      setRemindersError(e.message)
    } finally {
      setRemindersLoading(false)
    }
  }, [connectors])

  useEffect(() => { loadReminders() }, [loadReminders])
  useEffect(() => { loadCalendarEvents() }, [loadCalendarEvents])

  const handleCreateReminder = useCallback(async (data: { text: string; due_date?: string; goal_id?: string }) => {
    try {
      const r = await window.deskflowAPI!.createReminder(data)
      if (r?.success) {
        setReminders(prev => [...prev, r.reminder])
      }
    } catch (e: any) {
      setRemindersError(e.message)
    }
  }, [])

  const handleToggleReminder = useCallback(async (id: string, done: boolean) => {
    try {
      await window.deskflowAPI!.toggleReminder(id, done)
      setReminders(prev => prev.map(r => r.id === id ? { ...r, done } : r))
    } catch (e: any) {
      setRemindersError(e.message)
    }
  }, [])

  const handleDeleteReminder = useCallback(async (id: string) => {
    try {
      await window.deskflowAPI!.deleteReminder(id)
      setReminders(prev => prev.filter(r => r.id !== id))
    } catch (e: any) {
      setRemindersError(e.message)
    }
  }, [])

  return {
    reminders, calendarEvents, remindersLoading, remindersError,
    loadReminders, handleCreateReminder, handleToggleReminder, handleDeleteReminder,
  }
}
