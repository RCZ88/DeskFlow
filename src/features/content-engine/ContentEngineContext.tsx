import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ContentEngineCtx = {
  view: string
  setView: (v: string) => void
  openEpisodeId: number | null
  openIdeaId: number | null
  requestOpenEpisode: (id: number) => void
  requestOpenIdea: (id: number) => void
  clearOpenEpisode: () => void
  clearOpenIdea: () => void
  refreshTick: number
  bump: () => void
}

const Ctx = createContext<ContentEngineCtx | null>(null)

export function useContentEngine(): ContentEngineCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useContentEngine must be used within ContentEngineProvider')
  return c
}

export function ContentEngineProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState('brainstorm')
  const [openEpisodeId, setOpenEpisodeId] = useState<number | null>(null)
  const [openIdeaId, setOpenIdeaId] = useState<number | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const requestOpenEpisode = useCallback((id: number) => {
    setOpenEpisodeId(id)
    setView('episodes')
  }, [])
  const requestOpenIdea = useCallback((id: number) => {
    setOpenIdeaId(id)
    setView('ideas')
  }, [])
  const clearOpenEpisode = useCallback(() => setOpenEpisodeId(null), [])
  const clearOpenIdea = useCallback(() => setOpenIdeaId(null), [])
  const bump = useCallback(() => setRefreshTick((t) => t + 1), [])

  return (
    <Ctx.Provider
      value={{ view, setView, openEpisodeId, openIdeaId, requestOpenEpisode, requestOpenIdea, clearOpenEpisode, clearOpenIdea, refreshTick, bump }}
    >
      {children}
    </Ctx.Provider>
  )
}
