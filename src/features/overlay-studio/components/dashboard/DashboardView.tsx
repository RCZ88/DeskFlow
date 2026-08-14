import React, { useCallback } from 'react'
import { useStudio } from '../../state/StudioProvider'
import { FileJson, Film, Layers, Play, Plus, Sparkles, Upload, Wand2 } from 'lucide-react'
import { motion } from 'framer-motion'

function ToolCard({ icon: Icon, title, description, status, onClick, delay = 0 }: {
  icon: React.FC<{ size?: number }>; title: string; description: string; status: string; onClick: () => void; delay?: number
}) {
  return (
    <motion.button whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="w-full text-left rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4 hover:border-[#ec4899]/30 hover:bg-zinc-800/50 transition-all duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#ec4899]/10 flex items-center justify-center shrink-0"><Icon size={16} className="text-[#ec4899]" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-zinc-200">{title}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{description}</div>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${status === 'ready' ? 'bg-emerald-500/15 text-emerald-400' : status === 'needs-setup' ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-700/30 text-zinc-500'}`}>{status === 'ready' ? 'Ready' : status === 'needs-setup' ? 'Setup' : 'Available'}</span>
      </div>
    </motion.button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-5 space-y-5">
      <div className="space-y-2"><div className="h-5 w-48 bg-zinc-800/50 rounded-lg animate-pulse" /><div className="h-3 w-80 bg-zinc-800/30 rounded-lg animate-pulse" /></div>
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 p-4"><div className="h-4 w-40 bg-zinc-800/50 rounded animate-pulse mb-2" /><div className="h-3 w-60 bg-zinc-800/30 rounded animate-pulse" /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-800/30 rounded-xl animate-pulse" />)}</div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-3"><AlertTriangle size={20} className="text-red-400" /></div>
      <p className="text-sm font-medium text-zinc-300">{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-3 studio-btn-primary px-4 py-2 rounded-lg text-xs">Retry</button>}
    </div>
  )
}

export function DashboardView() {
  const { state, dispatch, activeSession, handleImport } = useStudio()
  const { async: asyncState } = state

  if (asyncState.sessions.state === 'loading') return <LoadingSkeleton />
  if (asyncState.sessions.state === 'error') return <ErrorState message={asyncState.sessions.error || 'Failed to load sessions'} onRetry={() => dispatch({ type: 'LOAD_SESSIONS_START' })} />

  return (
    <div className="p-5 space-y-5">
      {/* Header — Frontend Design: SectionHeader pattern */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ec4899] mb-1"><Sparkles size={14} /> Overlay Studio</div>
        <h1 className="text-lg font-semibold text-zinc-100">Video Overlay Suggestion Studio</h1>
        <p className="text-[11px] text-zinc-500 mt-1">Analyze videos, generate cut plans, preview overlays, and export suggestion plans.</p>
      </div>

      {/* Active Session Summary */}
      {activeSession ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-zinc-700/30 bg-zinc-900/70 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-zinc-200">{activeSession.sourceVideoName}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[400px]">{activeSession.sourceVideoPath}</div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${activeSession.transcript ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700/30 text-zinc-500'}`}>{activeSession.transcript ? 'Transcript ready' : 'No transcript'}</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${activeSession.cutPlan ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700/30 text-zinc-500'}`}>{activeSession.cutPlan ? 'Cut plan ready' : 'No cut plan'}</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${activeSession.scenePlan ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700/30 text-zinc-500'}`}>{activeSession.scenePlan ? 'Scene plan ready' : 'No scene plan'}</span>
              </div>
            </div>
            <button onClick={() => dispatch({ type: 'SET_STAGE', stage: activeSession.transcript ? 'transcript' : 'source' })} className="studio-btn-primary rounded-lg px-4 py-2 text-xs">Continue</button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/30 p-8 text-center">
          <Film size={28} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-[13px] font-medium text-zinc-400">No active video session</p>
          <p className="text-[11px] text-zinc-500 mt-1 mb-4">Import a video to begin analyzing and generating overlays.</p>
          <button onClick={handleImport} className="studio-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs"><Plus size={14} /> Import Video</button>
        </motion.div>
      )}

      {/* Tool Grid — Frontend Design: stagger animation */}
      <div>
        <h3 className="text-[13px] font-semibold text-zinc-300 mb-3">Pipeline Tools</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ToolCard icon={Film} title="Import Video" description="Add a local video file or transcript JSON." status={activeSession ? 'ready' : 'available'} onClick={handleImport} delay={0} />
          <ToolCard icon={FileJson} title="Transcript" description="View and edit transcript segments." status={activeSession?.transcript ? 'ready' : 'needs-setup'} onClick={() => activeSession?.transcript && dispatch({ type: 'SET_STAGE', stage: 'transcript' })} delay={0.05} />
          <ToolCard icon={Wand2} title="Manual Bridge" description="Generate prompts and paste AI responses." status="ready" onClick={() => dispatch({ type: 'OPEN_BRIDGE', mode: 'cut-plan' })} delay={0.1} />
          <ToolCard icon={Layers} title="Cut Planner" description="AI selects which segments to keep." status={activeSession?.cutPlan ? 'ready' : activeSession?.transcript ? 'available' : 'needs-setup'} onClick={() => activeSession?.cutPlan && dispatch({ type: 'SET_STAGE', stage: 'cut-plan' })} delay={0.15} />
          <ToolCard icon={Sparkles} title="Scene DSL" description="AI plans visual overlays for each moment." status={activeSession?.scenePlan ? 'ready' : activeSession?.cutPlan ? 'available' : 'needs-setup'} onClick={() => activeSession?.scenePlan && dispatch({ type: 'SET_STAGE', stage: 'scene-plan' })} delay={0.2} />
          <ToolCard icon={Play} title="Scene Visualizer" description="Preview overlays on a 9:16 canvas." status={activeSession?.scenePlan ? 'ready' : 'needs-setup'} onClick={() => activeSession?.scenePlan && dispatch({ type: 'SET_STAGE', stage: 'visualizer' })} delay={0.25} />
        </div>
      </div>
    </div>
  )
}
