import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { AlertTriangle, FileJson, Upload } from 'lucide-react'
import { motion } from 'framer-motion'

export function TranscriptView() {
  const { activeSession, dispatch, async: asyncState } = useStudio()

  if (!activeSession) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No session selected</p>
      <p className="text-[11px] text-zinc-500 mt-1 mb-4">Select a video session from the sidebar.</p>
    </div>
  )

  if (asyncState.transcript.state === 'loading') return (
    <div className="p-5 space-y-3">
      <div className="h-4 w-48 bg-zinc-800/50 rounded-lg animate-pulse" />
      {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-zinc-800/30 rounded-xl animate-pulse" />)}
    </div>
  )

  if (!activeSession?.transcript) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No transcript yet</p>
      <p className="text-[11px] text-zinc-500 mt-1 mb-4">Import a video and run transcription to generate segments.</p>
      <button onClick={() => dispatch({ type: 'SET_STAGE', stage: 'source' })} className="studio-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs"><Upload size={14} /> Go to Source</button>
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
