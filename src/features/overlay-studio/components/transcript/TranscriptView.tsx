import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { AlertTriangle, FileJson, LoaderCircle, Upload } from 'lucide-react'
import { motion } from 'framer-motion'

export function TranscriptView() {
  const { activeSession, dispatch, state } = useStudio()
  const asyncState = state.async

  if (!activeSession) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No session selected</p>
      <p className="text-[11px] text-zinc-500 mt-1 mb-4">Select a video session from the sidebar.</p>
    </div>
  )

  // Transcribing in progress
  if (activeSession.status === 'transcribing' || asyncState.transcript.state === 'loading') return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <LoaderCircle size={28} className="mb-3 text-cyan-400 animate-spin" />
      <p className="text-[13px] font-medium text-zinc-200">Transcribing...</p>
      <p className="text-[11px] text-zinc-500 mt-1">Using faster-whisper (local). This may take a moment.</p>
      <div className="mt-4 w-48 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div className="h-full bg-cyan-500 rounded-full" animate={{ width: ['0%', '80%'] }} transition={{ duration: 30, ease: 'linear' }} />
      </div>
    </div>
  )

  if (!activeSession?.transcript) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No transcript yet</p>
      <p className="text-[11px] text-zinc-500 mt-1 mb-4">
        {activeSession.sourceVideoPath && !activeSession.sourceVideoPath.endsWith('.json')
          ? 'Transcription failed or unavailable. You can import a transcript JSON file instead.'
          : 'Import a video/audio file for auto-transcription, or load a transcript JSON.'
        }
      </p>
      <div className="flex gap-2">
        <button onClick={() => dispatch({ type: 'SET_STAGE', stage: 'source' })} className="studio-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs"><Upload size={14} /> Import File</button>
        <button onClick={() => {
          // Load sample transcript
          const sample = {
            video_id: 'sample_tutorial', duration: 320.5,
            segments: [
              { id: 0, start: 0.0, end: 5.2, text: 'Welcome to this tutorial. Today we are going to cover three important concepts.' },
              { id: 1, start: 5.5, end: 15.8, text: 'The first concept is the foundation. Without understanding this, everything else falls apart.' },
              { id: 2, start: 16.2, end: 28.0, text: 'Let me show you a comparison between the old approach and the new approach.' },
              { id: 3, start: 28.5, end: 42.0, text: 'Now let me explain how this works in practice. You can see the results here.' },
              { id: 4, start: 42.5, end: 58.0, text: 'The key metric to watch is the efficiency ratio. When this number goes up, performance improves.' },
              { id: 5, start: 58.5, end: 75.0, text: 'In summary, these three concepts form the basis of everything we will cover in this series.' },
            ]
          }
          dispatch({ type: 'SET_TRANSCRIPT', sessionId: activeSession.id, transcript: sample })
        }} className="studio-btn-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs">Load Sample</button>
      </div>
    </div>
  )

  const transcript = activeSession.transcript
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-200">Transcript</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">{transcript.segments?.length || 0} segments · {Math.floor((transcript.duration || 0) / 60)}:{((transcript.duration || 0) % 60).toFixed(0).padStart(2, '0')}</p>
        </div>
        <button onClick={() => dispatch({ type: 'OPEN_BRIDGE', mode: 'cut-plan' })} className="studio-btn-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]">
          Generate Cut Plan
        </button>
      </div>
      <div className="space-y-1">
        {transcript.segments?.map((seg: any, i: number) => (
          <motion.div key={seg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/40 border border-transparent transition-all duration-150">
            <span className="text-[11px] text-zinc-600 font-mono w-8 shrink-0 pt-0.5">#{seg.id}</span>
            <span className="text-[11px] text-[#22d3ee] font-mono w-20 shrink-0 pt-0.5">{Math.floor(seg.start / 60)}:{(seg.start % 60).toFixed(1).padStart(4, '0')}</span>
            <span className="text-[13px] text-zinc-300 leading-relaxed flex-1">{seg.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
