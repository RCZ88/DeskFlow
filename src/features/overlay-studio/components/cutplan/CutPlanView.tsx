import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { Check, FileJson } from 'lucide-react'
import { BlurFade } from '../ui'

export function CutPlanView() {
  const { state, dispatch, activeSession } = useStudio()
  const asyncState = state.async

  if (asyncState.cutPlan.state === 'loading') return (
    <div className="p-5 space-y-3"><div className="h-4 w-48 bg-zinc-800/50 rounded-lg animate-pulse" />{[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-800/30 rounded-xl animate-pulse" />)}</div>
  )

  if (!activeSession) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No session selected</p>
    </div>
  )

  if (!activeSession.cutPlan) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No cut plan yet</p>
      <p className="text-[11px] text-zinc-500 mt-1 mb-4">Generate a cut plan from the transcript.</p>
      <button onClick={() => dispatch({ type: 'OPEN_BRIDGE', mode: 'cut-plan' })} className="studio-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs">Open Manual Bridge</button>
    </div>
  )

  const cutPlan = activeSession.cutPlan
  const kept = cutPlan.kept || []
  const cut = cutPlan.cut || []
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-200">Cut Plan</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">{kept.length} kept, {cut.length} cut</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => dispatch({ type: 'APPROVE_CUT_PLAN' })} className="studio-btn-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] bg-emerald-500 hover:bg-emerald-400"><Check size={12} /> Approve Plan</button>
          <button onClick={() => dispatch({ type: 'SET_STAGE', stage: 'transcript' })} className="studio-btn-ghost text-[11px]">Back</button>
        </div>
      </div>
      <div className="space-y-1">
        {activeSession.transcript?.segments?.map((seg: any, i: number) => {
          const k = kept.find((s: any) => s.segment_id === seg.id)
          return (
            <BlurFade key={seg.id} delay={Math.min(i * 0.01, 0.2)}>
              <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${k ? 'bg-emerald-500/[0.06] border border-emerald-500/20' : 'bg-zinc-800/20 border border-transparent opacity-50'}`}>
                <span className="text-[11px] text-zinc-600 font-mono w-8 shrink-0 pt-0.5">#{seg.id}</span>
                <span className="text-[11px] text-[#22d3ee] font-mono w-20 shrink-0 pt-0.5">{Math.floor(seg.start / 60)}:{(seg.start % 60).toFixed(1).padStart(4, '0')}</span>
                <span className="text-[13px] text-zinc-300 leading-relaxed flex-1">{seg.text}</span>
                {k && <span className="text-[11px] text-emerald-400 font-semibold shrink-0 pt-0.5">{k.role || k.intent || 'kept'}</span>}
              </div>
            </BlurFade>
          )
        })}
      </div>
    </div>
  )
}
