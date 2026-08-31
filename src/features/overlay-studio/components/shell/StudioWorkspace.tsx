import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { DashboardView } from '../dashboard/DashboardView'
import { TranscriptView } from '../transcript/TranscriptView'
import { ManualBridgePanel } from '../bridge/ManualBridgePanel'
import { CutPlanView } from '../cutplan/CutPlanView'
import { ScenePlanView } from '../scene/ScenePlanView'
import { VisualizerView } from '../visualizer/VisualizerView'
import { VisualEvidenceView } from '../vision/VisualEvidenceView'
import { ExportView } from '../export/ExportView'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, FileJson } from 'lucide-react'

function StageView() {
  const { state } = useStudio()
  const views: Record<string, React.FC> = {
    dashboard: DashboardView, source: DashboardView, transcript: TranscriptView, bridge: ManualBridgePanel,
    'cut-plan': CutPlanView, 'scene-plan': ScenePlanView, visualizer: VisualizerView,
    'visual-evidence': VisualEvidenceView, export: ExportView,
  }
  const View = views[state.activeStage] || DashboardView
  return (
    <AnimatePresence mode="wait">
      <motion.div key={state.activeStage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="flex-1 min-h-0 overflow-auto">
        <View />
      </motion.div>
    </AnimatePresence>
  )
}

export function StudioWorkspace() {
  const { state, activeSession } = useStudio()
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(63,63,70,0.50)] bg-[rgba(24,24,27,0.60)] backdrop-blur-sm shrink-0 min-h-[44px]">
        <div className="flex items-center gap-3 min-w-0">
          {activeSession ? (
            <>
              <span className="text-xs font-medium text-zinc-200 truncate">{activeSession.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f5c518]/10 text-[#f5c518] font-mono">EP #{activeSession.episodeId}</span>
              <span className="text-[9px] text-zinc-600 truncate max-w-[200px]">{activeSession.sourceVideoPath}</span>
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-zinc-700/30 text-zinc-400">{state.activeStage.replace(/-/g, ' ')}</span>
            </>
          ) : (
            <span className="text-xs text-zinc-500">Overlay Studio — No session active (episodes only)</span>
          )}
        </div>
      </div>

      {/* Stage View */}
      <StageView />
    </div>
  )
}
