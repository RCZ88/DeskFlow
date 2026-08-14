import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { PIPELINE_STEPS } from '../../constants/studioConstants'
import { Film, FileText, Eye, Scissors, Layers, Play, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ICONS: Record<string, React.FC<{ size?: number }>> = { Film, FileText, Eye, Scissors, Layers, Play, Download }

function getStepStatus(stepKey: string, activeStage: string, sessionStatus: string): 'complete' | 'active' | 'pending' | 'blocked' | 'error' {
  const stageOrder = ['source', 'transcript', 'cut-plan', 'scene-plan', 'visualizer', 'export']
  const activeIdx = stageOrder.indexOf(activeStage)
  const stepIdx = stageOrder.indexOf(stepKey)
  if (stepIdx < activeIdx) return 'complete'
  if (stepIdx === activeIdx) return 'active'
  if (sessionStatus.includes('error')) return 'error'
  return 'pending'
}

export function StudioSidebar() {
  const { state, dispatch, activeSession } = useStudio()
  const { activeStage, sessions, ui } = state

  return (
    <div className="flex flex-col h-full border-r border-[rgba(63,63,70,0.50)] bg-[rgba(24,24,27,0.85)] backdrop-blur-xl" style={{ width: ui.sidebarCollapsed ? 72 : 280, transition: 'width 200ms ease-out' }}>
      {/* Pipeline Status Rail */}
      <div className="px-3 py-4 space-y-1">
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2">Pipeline</div>
        {PIPELINE_STEPS.map(step => {
          const Icon = ICONS[step.icon] || Film
          const status = activeSession ? getStepStatus(step.key, activeStage, activeSession.status) : 'blocked'
          return (
            <button key={step.key} onClick={() => activeSession && dispatch({ type: 'SET_STAGE', stage: step.key as any })}
              disabled={!activeSession}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 active:scale-[0.98] ${
                status === 'active' ? 'bg-[#ec4899]/10 text-[#ec4899] border border-[#ec4899]/20' :
                status === 'complete' ? 'text-emerald-400 hover:bg-emerald-500/5' :
                status === 'error' ? 'text-red-400 hover:bg-red-500/5' :
                'text-zinc-500 hover:bg-zinc-800/50'
              } disabled:opacity-40 disabled:cursor-not-allowed`}>
              <Icon size={14} />
              {!ui.sidebarCollapsed && <span>{step.label}</span>}
              {!ui.sidebarCollapsed && status === 'complete' && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          )
        })}
      </div>

      {/* Session Library */}
      {!ui.sidebarCollapsed && (
        <div className="flex-1 overflow-auto px-3 py-2 border-t border-zinc-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Sessions</span>
            <button onClick={() => dispatch({ type: 'SET_STAGE', stage: 'source' })}
              className="studio-btn p-1 rounded-md hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-300" title="Import video">
              <Plus size={12} />
            </button>
          </div>
          <div className="space-y-1">
            {sessions.map(session => (
              <button key={session.id} onClick={() => dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: session.id })}
                className={`w-full text-left rounded-lg p-2.5 transition-all duration-150 min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 active:scale-[0.98] ${
                  state.activeSessionId === session.id ? 'bg-[#ec4899]/8 border border-[#ec4899]/20' : 'hover:bg-zinc-800/50 border border-transparent'
                }`}>
                <div className="text-[13px] font-medium text-zinc-200 truncate">{session.sourceVideoName}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{session.sourceVideoPath}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                    session.status.includes('ready') || session.status.includes('approved') ? 'bg-emerald-500/15 text-emerald-400' :
                    session.status.includes('error') ? 'bg-red-500/15 text-red-400' :
                    session.status === 'created' ? 'bg-zinc-700/30 text-zinc-500' :
                    'bg-[#ec4899]/10 text-[#ec4899]'
                  }`}>{session.status.replace(/_/g, ' ')}</span>
                  {session.missingSource && <span className="text-[11px] text-amber-400">⚠ Missing</span>}
                </div>
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="text-[10px] text-zinc-600 text-center py-4">No sessions yet</div>
            )}
          </div>
        </div>
      )}

      {/* Toggle */}
      <button onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className="p-2 border-t border-zinc-800/50 text-zinc-500 hover:text-zinc-300 transition-colors min-h-[44px]">
        {ui.sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  )
}
