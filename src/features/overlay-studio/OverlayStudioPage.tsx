import React, { useEffect, useCallback, useRef, useState } from 'react'
import { StudioProvider, useStudio } from './state/StudioProvider'
import { StudioShell } from './components/shell/StudioShell'
import { ContentEngineWorkspace } from '../content-engine/ContentEngineWorkspace'
import { PresentationWorkspace } from '@/features/presentation/PresentationWorkspace'
import { Sparkles, Presentation } from 'lucide-react'
import type { StudioSession, StudioAction } from './state/studioTypes'

function uid() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }

// File-level import handler — uses a ref for dispatch (set by StudioPageInner)
const dispatchRef = { current: null as React.Dispatch<StudioAction> | null }

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'video/*,audio/*,.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !dispatchRef.current) return
    const dispatch = dispatchRef.current

    if (file.name.endsWith('.json')) {
      // JSON transcript file — import directly
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result))
          const session: StudioSession = {
            id: uid(), name: file.name, sourceVideoPath: file.name, sourceVideoName: file.name,
            durationSec: data.duration, transcript: data, status: 'transcript_ready', missingSource: false,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          }
          dispatch({ type: 'CREATE_SESSION', session })
        } catch (err) { console.error('Failed to parse transcript:', err) }
      }
      reader.readAsText(file)
      return
    }

    // Video or audio file — create session, then auto-transcribe
    const filePath = (file as any).path || file.name
    const session: StudioSession = {
      id: uid(), name: file.name, sourceVideoPath: filePath, sourceVideoName: file.name,
      status: 'transcribing', missingSource: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    dispatch({ type: 'CREATE_SESSION', session })

    // Auto-transcribe via faster-whisper (local, no API key)
    const api = (window as any).deskflowAPI
    if (api?.overlayStudioTranscribe) {
      api.overlayStudioTranscribe({ filePath }).then((result: any) => {
        if (result?.ok && result.transcript) {
          dispatch({ type: 'SET_TRANSCRIPT', sessionId: session.id, transcript: result.transcript })
        } else {
          console.warn('[OverlayStudio] Auto-transcription failed:', result?.error)
          // Session stays with status 'created' — user can import JSON transcript or use sample
          dispatch({ type: 'SET_STAGE', stage: 'transcript' })
        }
      }).catch((err: any) => {
        console.warn('[OverlayStudio] Transcription error:', err)
        dispatch({ type: 'SET_STAGE', stage: 'transcript' })
      })
    } else {
      // IPC not available — show transcript view with manual options
      dispatch({ type: 'SET_STAGE', stage: 'transcript' })
    }
  }
  input.click()
}

function StudioPageInner() {
  const { dispatch } = useStudio()
  const [mode, setMode] = useState<'studio' | 'engine' | 'presentation'>('studio')

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
        <span className="text-xs font-semibold text-zinc-200">{mode === 'studio' ? 'Overlay Studio' : mode === 'engine' ? 'Content Engine' : 'Presentations'}</span>
        <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-0.5">
          <button onClick={() => setMode('studio')} className={mode === 'studio' ? 'h-6 rounded-full bg-[#ec4899]/15 px-2.5 text-[10px] font-semibold text-[#ec4899]' : 'h-6 rounded-full px-2.5 text-[10px] font-medium text-zinc-500 transition-colors hover:text-zinc-300'}>Overlay Studio</button>
          <button onClick={() => setMode('engine')} className={mode === 'engine' ? 'h-6 rounded-full bg-[#f5c518]/15 px-2.5 text-[10px] font-semibold text-[#f5c518]' : 'h-6 rounded-full px-2.5 text-[10px] font-medium text-zinc-500 transition-colors hover:text-zinc-300'}>Content Engine</button>
          <button onClick={() => setMode('presentation')} className={mode === 'presentation' ? 'h-6 rounded-full bg-[#10b981]/15 px-2.5 text-[10px] font-semibold text-[#10b981] flex items-center gap-1' : 'h-6 rounded-full px-2.5 text-[10px] font-medium text-zinc-500 transition-colors hover:text-zinc-300 flex items-center gap-1'}><Presentation size={10} /> Presentations</button>
        </div>
        <span className="text-[9px] text-zinc-500">— {mode === 'studio' ? 'Video Overlay Suggestion Studio' : mode === 'engine' ? 'Content Creation Pipeline' : 'Interactive HTML Slide Generator'}</span>
      </div>
      <div className="flex-1 min-h-0">
        {mode === 'engine' ? <ContentEngineWorkspace /> : mode === 'presentation' ? <PresentationWorkspace /> : <StudioShell />}
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
