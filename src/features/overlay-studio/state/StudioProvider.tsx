import React, { createContext, useContext, useReducer, useState, useCallback, type ReactNode } from 'react'
import { studioReducer, type StudioAction } from './studioReducer'
import type { StudioState, StudioSession } from './studioTypes'
import { INITIAL_PLAYBACK, INITIAL_BRIDGE } from './studioTypes'

interface StudioContextValue {
  state: StudioState; dispatch: React.Dispatch<StudioAction>
  activeSession: StudioSession | null
  handleImport: () => void
}

const StudioContext = createContext<StudioContextValue | null>(null)

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used within StudioProvider')
  return ctx
}

const INITIAL_STATE: StudioState = {
  sessions: [], activeSessionId: null, activeStage: 'dashboard',
  selection: null, playback: INITIAL_PLAYBACK, bridge: INITIAL_BRIDGE,
  async: { sessions: { state: 'idle' }, transcript: { state: 'idle' }, cutPlan: { state: 'idle' }, scenePlan: { state: 'idle' }, export: { state: 'idle' } },
  ui: { sidebarCollapsed: false, inspectorCollapsed: false, showSafeZones: false, timelineHeight: 180 },
}

export function StudioProvider({ children, handleImport }: { children: ReactNode; handleImport: () => void }) {
  const [state, dispatch] = useReducer(studioReducer, INITIAL_STATE)
  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || null
  return (
    <StudioContext.Provider value={{ state, dispatch, activeSession, handleImport }}>
      {children}
    </StudioContext.Provider>
  )
}
