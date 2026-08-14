import React, { useEffect, useCallback, useRef, useState } from 'react'
import { StudioProvider, useStudio } from './state/StudioProvider'
import { StudioShell } from './components/shell/StudioShell'
import { Sparkles } from 'lucide-react'
import type { StudioSession, StudioAction } from './state/studioTypes'

function uid() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }

// File-level import handler — uses a ref for dispatch (set by StudioPageInner)
const dispatchRef = { current: null as React.Dispatch<StudioAction> | null }

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'video/*,.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !dispatchRef.current) return
    if (file.name.endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result))
          const session: StudioSession = {
            id: uid(), name: file.name, sourceVideoPath: file.name, sourceVideoName: file.name,
            durationSec: data.duration, transcript: data, status: 'transcript_ready', missingSource: false,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          }
          dispatchRef.current({ type: 'CREATE_SESSION', session })
        } catch (err) { console.error('Failed to parse transcript:', err) }
      }
      reader.readAsText(file)
    } else {
      const session: StudioSession = {
        id: uid(), name: file.name, sourceVideoPath: (file as any).path || file.name, sourceVideoName: file.name,
        status: 'created', missingSource: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }
      dispatchRef.current({ type: 'CREATE_SESSION', session })
    }
  }
  input.click()
}

function StudioPageInner() {
  const { dispatch } = useStudio()

  // Set the dispatch ref for the file-level handleImport
  useEffect(() => { dispatchRef.current = dispatch }, [dispatch])

  // Load sessions from localStorage on mount
  useEffect(() => {
    dispatch({ type: 'LOAD_SESSIONS_START' })
    try {
      const raw = localStorage.getItem('rheo-overlay-studio-sessions')
      const sessions = raw ? JSON.parse(raw) : []
      dispatch({ type: 'LOAD_SESSIONS_SUCCESS', sessions })
    } catch {
      dispatch({ type: 'LOAD_SESSIONS_ERROR', error: 'Failed to load sessions' })
    }
  }, [dispatch])

  return (
    <div className="flex flex-col h-full" data-page="studio">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(63,63,70,0.50)] bg-[rgba(24,24,27,0.60)] backdrop-blur-sm shrink-0 min-h-[44px]">
        <div className="w-6 h-6 rounded-md bg-[#ec4899]/15 flex items-center justify-center"><Sparkles size={12} className="text-[#ec4899]" /></div>
        <span className="text-xs font-semibold text-zinc-200">Overlay Studio</span>
        <span className="text-[9px] text-zinc-500">— Video Overlay Suggestion Studio</span>
      </div>
      <div className="flex-1 min-h-0">
        <StudioShell />
      </div>
    </div>
  )
}

export function FeatureStudioPage() {
  return (
    <StudioProvider handleImport={handleImport}>
      <StudioPageInner />
    </StudioProvider>
  )
}
