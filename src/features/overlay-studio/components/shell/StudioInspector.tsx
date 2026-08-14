import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function StudioInspector() {
  const { state, activeSession, dispatch } = useStudio()
  const { ui, bridge, playback, selection } = state

  return (
    <div className="flex flex-col h-full border-l border-[rgba(63,63,70,0.50)] bg-[rgba(24,24,27,0.85)] backdrop-blur-xl overflow-auto" style={{ width: ui.inspectorCollapsed ? 56 : 360, transition: 'width 200ms ease-out' }}>
      <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-800/50">
        {!ui.inspectorCollapsed && <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Inspector</span>}
        <button onClick={() => dispatch({ type: 'TOGGLE_INSPECTOR' })} className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          {ui.inspectorCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {!ui.inspectorCollapsed && (
        <div className="flex-1 p-3 space-y-4 overflow-auto">
          {/* Bridge state */}
          {state.activeStage === 'bridge' && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-zinc-300">Manual Bridge</h3>
              <div className="text-[10px] text-zinc-500">Mode: {bridge.mode === 'cut-plan' ? 'Cut Planner' : 'Scene DSL'}</div>
              <div className="text-[10px] text-zinc-500">Step: {bridge.step}</div>
              {bridge.lastError && <div className="text-[10px] text-red-400">{bridge.lastError}</div>}
            </div>
          )}

          {/* Selection details */}
          {selection && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-zinc-300">Selected</h3>
              <div className="text-[10px] text-zinc-500">{selection.type}: {selection.id}</div>
            </div>
          )}

          {/* Playback state */}
          {state.activeStage === 'visualizer' && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-zinc-300">Playback</h3>
              <div className="text-[10px] text-zinc-500">Time: {playback.currentTime.toFixed(1)}s / {playback.duration.toFixed(1)}s</div>
              <div className="text-[10px] text-zinc-500">Playing: {playback.isPlaying ? 'Yes' : 'No'}</div>
            </div>
          )}

          {/* Empty state */}
          {!selection && state.activeStage !== 'bridge' && state.activeStage !== 'visualizer' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-[10px] text-zinc-600">Select an item to inspect its details.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
