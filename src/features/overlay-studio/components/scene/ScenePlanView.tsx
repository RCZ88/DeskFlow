import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { FileJson, Play, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export function ScenePlanView() {
  const { state, dispatch, activeSession, async: asyncState } = useStudio()

  if (asyncState.scenePlan.state === 'loading') return (
    <div className="p-5 space-y-3"><div className="h-4 w-48 bg-zinc-800/50 rounded-lg animate-pulse" /><div className="grid gap-3 sm:grid-cols-2">{[1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-800/30 rounded-xl animate-pulse" />)}</div></div>
  )

  if (!activeSession) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No session selected</p>
    </div>
  )

  if (!activeSession.scenePlan) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No scene plan yet</p>
      <p className="text-[11px] text-zinc-500 mt-1 mb-4">Generate a scene DSL from the approved cut plan.</p>
      <button onClick={() => dispatch({ type: 'OPEN_BRIDGE', mode: 'scene-dsl' })} className="studio-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs"><Sparkles size={14} /> Open Manual Bridge</button>
    </div>
  )

  const scenes = activeSession.scenePlan.overlays || []
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-200">Scene Plan</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">{scenes.length} overlays</p>
        </div>
        <button onClick={() => dispatch({ type: 'SET_STAGE', stage: 'visualizer' })} className="studio-btn-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]"><Play size={12} /> Preview</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {scenes.map((scene: any, i: number) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }}
            className="rounded-xl bg-zinc-800/30 border border-zinc-700/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#22d3ee] font-semibold">{scene.type || 'card'}</span>
              <span className="text-[11px] text-zinc-600 font-mono">{Math.floor(scene.start_time / 60)}:{(scene.start_time % 60).toFixed(1).padStart(4, '0')} – {Math.floor(scene.end_time / 60)}:{(scene.end_time % 60).toFixed(1).padStart(4, '0')}</span>
            </div>
            <div className="text-[13px] text-zinc-300 font-medium mb-1">{scene.text?.slice(0, 50)}{scene.text?.length > 50 ? '...' : ''}</div>
            {scene.emphasis_words?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">{scene.emphasis_words.map((w: string, j: number) => <span key={j} className="text-[11px] px-1.5 py-0.5 rounded bg-[#22d3ee]/10 text-[#22d3ee]">{w}</span>)}</div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
