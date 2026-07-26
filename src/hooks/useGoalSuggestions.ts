import { useState, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import type { Goal } from '../components/ai/types'

export function useGoalSuggestions(today: string) {
  const { showToast } = useToast()
  const [suggestions, setSuggestions] = useState<Goal[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [acceptErrors, setAcceptErrors] = useState<Record<string, string>>({})

  const handleSuggest = useCallback(async () => {
    setSuggesting(true)
    try {
      const context = await window.deskflowAPI!.getGoalContext()
      const result = await window.deskflowAPI!.suggestGoals(today, context)
      if (result?.goals) {
        setSuggestions(result.goals.map((g: any) => ({
          id: g.id || crypto.randomUUID(),
          title: g.title,
          category: g.category || 'personal',
          status: 'active' as const,
          period: 'daily',
          date: today,
          source: 'suggestion',
          links: [],
          createdAt: new Date().toISOString(),
          target: { type: 'completion' as const },
        })))
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate suggestions', 'error')
    } finally {
      setSuggesting(false)
    }
  }, [today, showToast])

  return { suggestions, suggesting, acceptErrors, handleSuggest, setAcceptErrors }
}
