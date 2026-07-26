import { useState, useCallback, useRef, useEffect } from 'react'
import type { DataState } from '../components/ai/types'

export function useDigest() {
  const [digestTopics, setDigestTopics] = useState<any[]>([])
  const [digestState, setDigestState] = useState<DataState>('loading')
  const [digestReason, setDigestReason] = useState<string | null>(null)
  const digestPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadDigest = useCallback(async (showLoader = true, force = false) => {
    if (showLoader) setDigestState('loading')
    try {
      const r = await window.deskflowAPI!.getTopicDigest(force ? { force: true } : undefined)
      if (r.success) {
        setDigestTopics(r.topics || [])
        setDigestReason(r.reason || null)
        setDigestState(r.topics?.length ? 'ready' : 'empty')
      } else {
        setDigestState('error')
        setDigestReason(null)
      }
    } catch (err: any) {
      console.error('[useDigest] loadDigest:', err)
      setDigestState('error')
    }
  }, [])

  const initDigest = useCallback(async () => {
    const generating = await window.deskflowAPI!.isDigestGenerating()
    if (generating) {
      setDigestState('loading')
      digestPollRef.current = setInterval(async () => {
        try {
          const r = await window.deskflowAPI!.getTopicDigest()
          if (r.success && r.topics?.length > 0) {
            setDigestTopics(r.topics)
            setDigestState('ready')
            if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null }
          }
        } catch (e) { console.error('[useDigest] poll:', e) }
      }, 3000)
    } else {
      await loadDigest()
    }
  }, [loadDigest])

  useEffect(() => {
    initDigest()
    const cleanup = window.deskflowAPI?.onDigestGenerationComplete?.((data: any) => {
      if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null }
      if (data.success && data.topics) { setDigestTopics(data.topics); setDigestState('ready') }
    })
    return () => {
      if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null }
      cleanup?.()
    }
  }, [initDigest])

  const digestDataState = (() => {
    if (digestState === 'loading') return 'loading'
    if (digestTopics.length === 0) return 'empty'
    return 'ready'
  })() as DataState

  return { digestTopics, digestState, digestReason, digestDataState, loadDigest }
}
