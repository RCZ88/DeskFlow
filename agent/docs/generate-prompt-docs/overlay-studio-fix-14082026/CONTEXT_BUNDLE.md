# CONTEXT BUNDLE — Overlay Studio Fix (14/08/2026)

## Project: DeskFlow (Electron + React + Vite)
## Feature: Overlay Studio (`src/features/overlay-studio/`)

---

## 1. Architecture Overview

The Overlay Studio is a 3-panel video overlay suggestion studio:
- **Left sidebar**: Pipeline steps (7 stages) + session library
- **Center workspace**: Stage-driven view switching (Dashboard, Transcript, Manual Bridge, Cut Plan, Scene Plan, Visualizer, Visual Evidence)
- **Right inspector**: Context-sensitive panel (collapsible)

State management: React Context + useReducer (StudioProvider wraps StudioPageInner).

---

## 2. Complete Source Code — State Layer

### src/features/overlay-studio/state/studioTypes.ts
```typescript
import type { Overlay, DirectorCut } from '../../types/overlayStudio'

export type StudioStage = 'dashboard' | 'source' | 'transcript' | 'visual-evidence' | 'bridge' | 'cut-plan' | 'scene-plan' | 'visualizer' | 'export'

export type SessionStatus = 'created' | 'transcribing' | 'transcript_ready' | 'cut_plan_pending' | 'cut_plan_ready' | 'cut_plan_approved' | 'scene_plan_pending' | 'scene_plan_ready' | 'export_ready' | 'error'

export interface StudioSession {
  id: string; name: string; sourceVideoPath: string; sourceVideoName: string
  durationSec?: number; transcriptPath?: string; cutPlanPath?: string; scenePlanPath?: string; exportPlanPath?: string
  transcript?: any; cutPlan?: any; scenePlan?: DirectorCut; status: SessionStatus; missingSource: boolean
  createdAt: string; updatedAt: string
}

export interface PlaybackState { currentTime: number; duration: number; isPlaying: boolean; playbackRate: number; muted: boolean }

export interface ManualBridgeState {
  mode: 'cut-plan' | 'scene-dsl'; step: 'prompt' | 'paste' | 'validate'
  prompt: string; rawResponse: string; parsedJson: unknown | null
  validationChecks: Array<{ rule: string; message: string; passed: boolean }>
  isParsing: boolean; lastError: string | null
}

export interface StudioSelection { type: 'session' | 'transcript-segment' | 'cut-segment' | 'overlay' | 'scene'; id: string }

export interface AsyncStatus { state: 'idle' | 'loading' | 'success' | 'error'; error?: string }

export interface StudioState {
  sessions: StudioSession[]; activeSessionId: string | null; activeStage: StudioStage
  selection: StudioSelection | null; playback: PlaybackState; bridge: ManualBridgeState
  async: { sessions: AsyncStatus; transcript: AsyncStatus; cutPlan: AsyncStatus; scenePlan: AsyncStatus; export: AsyncStatus }
  ui: { sidebarCollapsed: boolean; inspectorCollapsed: boolean; showSafeZones: boolean; timelineHeight: number }
}

export const INITIAL_PLAYBACK: PlaybackState = { currentTime: 0, duration: 0, isPlaying: false, playbackRate: 1, muted: true }
export const INITIAL_BRIDGE: ManualBridgeState = { mode: 'cut-plan', step: 'prompt', prompt: '', rawResponse: '', parsedJson: null, validationChecks: [], isParsing: false, lastError: null }
```

### src/features/overlay-studio/state/studioReducer.ts
```typescript
import type { StudioState, StudioStage, StudioSession, ManualBridgeState, AsyncStatus } from './studioTypes'
import type { DirectorCut } from '../../../types/overlayStudio'

export type StudioAction =
  | { type: 'LOAD_SESSIONS_START' } | { type: 'LOAD_SESSIONS_SUCCESS'; sessions: StudioSession[] } | { type: 'LOAD_SESSIONS_ERROR'; error: string }
  | { type: 'CREATE_SESSION'; session: StudioSession } | { type: 'SET_ACTIVE_SESSION'; sessionId: string } | { type: 'REMOVE_SESSION'; sessionId: string }
  | { type: 'SET_STAGE'; stage: StudioStage }
  | { type: 'SET_TRANSCRIPT'; sessionId: string; transcript: any } | { type: 'SET_CUT_PLAN'; sessionId: string; cutPlan: any } | { type: 'SET_SCENE_PLAN'; sessionId: string; scenePlan: DirectorCut }
  | { type: 'SELECT_SEGMENT'; segmentId: string } | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_SEGMENT_KEEP_CUT'; segmentId: string } | { type: 'APPROVE_CUT_PLAN' } | { type: 'REJECT_CUT_PLAN' }
  | { type: 'OPEN_BRIDGE'; mode: 'cut-plan' | 'scene-dsl' } | { type: 'SET_BRIDGE_STEP'; step: ManualBridgeState['step'] }
  | { type: 'SET_BRIDGE_PROMPT'; prompt: string } | { type: 'SET_BRIDGE_RESPONSE'; rawResponse: string }
  | { type: 'VALIDATE_BRIDGE_SUCCESS'; checks: Array<{ rule: string; message: string; passed: boolean }> }
  | { type: 'VALIDATE_BRIDGE_ERROR'; error: string }
  | { type: 'ACCEPT_BRIDGE_RESULT' } | { type: 'CLOSE_BRIDGE' }
  | { type: 'SET_PLAYHEAD'; time: number } | { type: 'PLAY' } | { type: 'PAUSE' } | { type: 'SET_DURATION'; duration: number }
  | { type: 'TOGGLE_SAFE_ZONES' } | { type: 'TOGGLE_SIDEBAR' } | { type: 'TOGGLE_INSPECTOR' }

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'LOAD_SESSIONS_START': return { ...state, async: { ...state.async, sessions: { state: 'loading' } } }
    case 'LOAD_SESSIONS_SUCCESS': return { ...state, sessions: action.sessions, async: { ...state.async, sessions: { state: 'success' } } }
    case 'LOAD_SESSIONS_ERROR': return { ...state, async: { ...state.async, sessions: { state: 'error', error: action.error } } }
    case 'CREATE_SESSION': return { ...state, sessions: [...state.sessions, action.session], activeSessionId: action.session.id, activeStage: 'source' }
    case 'SET_ACTIVE_SESSION': return { ...state, activeSessionId: action.sessionId }
    case 'REMOVE_SESSION': return { ...state, sessions: state.sessions.filter(s => s.id !== action.sessionId), activeSessionId: state.activeSessionId === action.sessionId ? null : state.activeSessionId }
    case 'SET_STAGE': return { ...state, activeStage: action.stage }
    case 'SET_TRANSCRIPT': return { ...state, sessions: state.sessions.map(s => s.id === action.sessionId ? { ...s, transcript: action.transcript, status: 'transcript_ready' as const } : s) }
    case 'SET_CUT_PLAN': return { ...state, sessions: state.sessions.map(s => s.id === action.sessionId ? { ...s, cutPlan: action.cutPlan, status: 'cut_plan_ready' as const } : s) }
    case 'SET_SCENE_PLAN': return { ...state, sessions: state.sessions.map(s => s.id === action.sessionId ? { ...s, scenePlan: action.scenePlan, status: 'scene_plan_ready' as const } : s) }
    case 'APPROVE_CUT_PLAN': return { ...state, sessions: state.sessions.map(s => s.id === state.activeSessionId ? { ...s, status: 'cut_plan_approved' as const } : s), activeStage: 'scene-plan' }
    case 'REJECT_CUT_PLAN': return { ...state, sessions: state.sessions.map(s => s.id === state.activeSessionId ? { ...s, cutPlan: undefined, status: 'transcript_ready' as const } : s) }
    case 'OPEN_BRIDGE': return { ...state, bridge: { ...state.bridge, mode: action.mode, step: 'prompt', parsedJson: null, validationChecks: [], lastError: null }, activeStage: 'bridge' }
    case 'SET_BRIDGE_STEP': return { ...state, bridge: { ...state.bridge, step: action.step } }
    case 'SET_BRIDGE_PROMPT': return { ...state, bridge: { ...state.bridge, prompt: action.prompt } }
    case 'SET_BRIDGE_RESPONSE': return { ...state, bridge: { ...state.bridge, rawResponse: action.rawResponse } }
    case 'VALIDATE_BRIDGE_SUCCESS': return { ...state, bridge: { ...state.bridge, validationChecks: action.checks, step: 'validate', lastError: null } }
    case 'VALIDATE_BRIDGE_ERROR': return { ...state, bridge: { ...state.bridge, lastError: action.error } }
    case 'ACCEPT_BRIDGE_RESULT': return { ...state, bridge: { ...state.bridge, step: 'prompt', rawResponse: '', parsedJson: null, validationChecks: [], lastError: null } }
    case 'CLOSE_BRIDGE': return { ...state, bridge: { ...state.bridge, step: 'prompt', rawResponse: '', parsedJson: null }, activeStage: state.sessions.find(s => s.id === state.activeSessionId)?.transcript ? 'transcript' : 'source' }
    case 'SET_PLAYHEAD': return { ...state, playback: { ...state.playback, currentTime: action.time } }
    case 'PLAY': return { ...state, playback: { ...state.playback, isPlaying: true } }
    case 'PAUSE': return { ...state, playback: { ...state.playback, isPlaying: false } }
    case 'SET_DURATION': return { ...state, playback: { ...state.playback, duration: action.duration } }
    case 'TOGGLE_SAFE_ZONES': return { ...state, ui: { ...state.ui, showSafeZones: !state.ui.showSafeZones } }
    case 'TOGGLE_SIDEBAR': return { ...state, ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed } }
    case 'TOGGLE_INSPECTOR': return { ...state, ui: { ...state.ui, inspectorCollapsed: !state.ui.inspectorCollapsed } }
    default: return state
  }
}
```

### src/features/overlay-studio/state/StudioProvider.tsx
```typescript
import React, { createContext, useContext, useReducer, useState, useCallback, type ReactNode } from 'react'
import { studioReducer, type StudioAction } from './studioReducer'
import type { StudioState, StudioSession } from './studioTypes'
import { INITIAL_PLAYBACK, INITIAL_BRIDGE } from './studioTypes'

interface StudioContextValue {
  state: StudioState; dispatch: React.Dispatch<StudioAction>
  activeSession: StudioSession | null
  handleImport: () => void
}

const StudioContext = createContext<StudioContextValue | null>(null)

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used within StudioProvider')
  return ctx
}

const INITIAL_STATE: StudioState = {
  sessions: [], activeSessionId: null, activeStage: 'dashboard',
  selection: null, playback: INITIAL_PLAYBACK, bridge: INITIAL_BRIDGE,
  async: { sessions: { state: 'idle' }, transcript: { state: 'idle' }, cutPlan: { state: 'idle' }, scenePlan: { state: 'idle' }, export: { state: 'idle' } },
  ui: { sidebarCollapsed: false, inspectorCollapsed: false, showSafeZones: false, timelineHeight: 180 },
}

export function StudioProvider({ children, handleImport }: { children: ReactNode; handleImport: () => void }) {
  const [state, dispatch] = useReducer(studioReducer, INITIAL_STATE)
  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || null
  return (
    <StudioContext.Provider value={{ state, dispatch, activeSession, handleImport }}>
      {children}
    </StudioContext.Provider>
  )
}
```

---

## 3. Complete Source Code — Shell Components

### src/features/overlay-studio/components/shell/StudioShell.tsx
```typescript
import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { StudioSidebar } from './StudioSidebar'
import { StudioWorkspace } from './StudioWorkspace'
import { StudioInspector } from './StudioInspector'

export function StudioShell() {
  const { state } = useStudio()
  const { sidebarCollapsed, inspectorCollapsed } = state.ui
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {!sidebarCollapsed && <StudioSidebar />}
      <StudioWorkspace />
      <StudioInspector />
    </div>
  )
}
```

### src/features/overlay-studio/components/shell/StudioWorkspace.tsx
```typescript
import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { DashboardView } from '../dashboard/DashboardView'
import { TranscriptView } from '../transcript/TranscriptView'
import { ManualBridgePanel } from '../bridge/ManualBridgePanel'
import { CutPlanView } from '../cutplan/CutPlanView'
import { ScenePlanView } from '../scene/ScenePlanView'
import { VisualizerView } from '../visualizer/VisualizerView'
import { VisualEvidenceView } from '../vision/VisualEvidenceView'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, FileJson } from 'lucide-react'

function StageView() {
  const { state } = useStudio()
  const views: Record<string, React.FC> = {
    dashboard: DashboardView, source: DashboardView, transcript: TranscriptView, bridge: ManualBridgePanel,
    'cut-plan': CutPlanView, 'scene-plan': ScenePlanView, visualizer: VisualizerView,
    'visual-evidence': VisualEvidenceView,
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
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(63,63,70,0.50)] bg-[rgba(24,24,27,0.60)] backdrop-blur-sm shrink-0 min-h-[44px]">
        <div className="flex items-center gap-3 min-w-0">
          {activeSession ? (
            <>
              <span className="text-xs font-medium text-zinc-200 truncate">{activeSession.sourceVideoName}</span>
              <span className="text-[9px] text-zinc-600 truncate max-w-[200px]">{activeSession.sourceVideoPath}</span>
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-zinc-700/30 text-zinc-400">{state.activeStage.replace(/-/g, ' ')}</span>
            </>
          ) : (
            <span className="text-xs text-zinc-500">Overlay Studio — No session active</span>
          )}
        </div>
      </div>
      <StageView />
    </div>
  )
}
```

### src/features/overlay-studio/components/shell/StudioSidebar.tsx
```typescript
import React from 'react'
import { useStudio } from '../../state/StudioProvider'
import { PIPELINE_STEPS } from '../../constants/studioConstants'
import { Film, FileText, Eye, Scissors, Layers, Play, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ICONS: Record<string, React.FC<{ size?: number }>> = { Film, FileText, Eye, Scissors, Layers, Play, Download }

function getStepStatus(stepKey: string, activeStage: string, sessionStatus: string): 'complete' | 'active' | 'pending' | 'blocked' | 'error' {
  const stageOrder = ['source', 'transcript', 'visual-evidence', 'cut-plan', 'scene-plan', 'visualizer', 'export']
  if (stepKey === activeStage) return 'active'
  if (activeStage === 'bridge') return 'pending'
  const activeIdx = stageOrder.indexOf(activeStage)
  const stepIdx = stageOrder.indexOf(stepKey)
  if (stepIdx < activeIdx) return 'complete'
  if (sessionStatus.includes('error')) return 'error'
  return 'pending'
}

export function StudioSidebar() {
  const { state, dispatch, activeSession } = useStudio()
  const { activeStage, sessions, ui } = state

  return (
    <div className="flex flex-col h-full border-r border-[rgba(63,63,70,0.50)] bg-[rgba(24,24,27,0.85)] backdrop-blur-xl" style={{ width: ui.sidebarCollapsed ? 72 : 280, transition: 'width 200ms ease-out' }}>
      <div className="px-3 py-4 space-y-1">
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2">Pipeline</div>
        {PIPELINE_STEPS.map(step => {
          const Icon = ICONS[step.icon] || Film
          const status = activeSession ? getStepStatus(step.key, activeStage, activeSession.status) : 'blocked'
          return (
            <button key={step.key} onClick={() => {
                if (!activeSession) { dispatch({ type: 'SET_STAGE', stage: 'dashboard' }); return }
                if (step.key === 'visual-evidence') { dispatch({ type: 'SET_STAGE', stage: 'visual-evidence' }); return }
                dispatch({ type: 'SET_STAGE', stage: step.key as any })
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 active:scale-[0.98] ${
                status === 'active' ? 'bg-[#ec4899]/10 text-[#ec4899] border border-[#ec4899]/20' :
                status === 'complete' ? 'text-emerald-400 hover:bg-emerald-500/5' :
                status === 'error' ? 'text-red-400 hover:bg-red-500/5' :
                'text-zinc-500 hover:bg-zinc-800/50'
              }`}>
              <Icon size={14} />
              {!ui.sidebarCollapsed && <span>{step.label}</span>}
              {!ui.sidebarCollapsed && status === 'complete' && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          )
        })}
      </div>

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

      <button onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className="p-2 border-t border-zinc-800/50 text-zinc-500 hover:text-zinc-300 transition-colors min-h-[44px]">
        {ui.sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  )
}
```

### src/features/overlay-studio/components/shell/StudioInspector.tsx
```typescript
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
          {state.activeStage === 'bridge' && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-zinc-300">Manual Bridge</h3>
              <div className="text-[10px] text-zinc-500">Mode: {bridge.mode === 'cut-plan' ? 'Cut Planner' : 'Scene DSL'}</div>
              <div className="text-[10px] text-zinc-500">Step: {bridge.step}</div>
              {bridge.lastError && <div className="text-[10px] text-red-400">{bridge.lastError}</div>}
            </div>
          )}
          {selection && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-zinc-300">Selected</h3>
              <div className="text-[10px] text-zinc-500">{selection.type}: {selection.id}</div>
            </div>
          )}
          {state.activeStage === 'visualizer' && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-zinc-300">Playback</h3>
              <div className="text-[10px] text-zinc-500">Time: {playback.currentTime.toFixed(1)}s / {playback.duration.toFixed(1)}s</div>
              <div className="text-[10px] text-zinc-500">Playing: {playback.isPlaying ? 'Yes' : 'No'}</div>
            </div>
          )}
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
```

---

## 4. Complete Source Code — Dashboard & Bridge

### src/features/overlay-studio/components/dashboard/DashboardView.tsx
```typescript
import React, { useCallback } from 'react'
import { useStudio } from '../../state/StudioProvider'
import { AlertTriangle, FileJson, Film, Layers, Play, Plus, Sparkles, Upload, Wand2 } from 'lucide-react'
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
  const asyncState = state.async

  if (asyncState.sessions.state === 'loading') return <LoadingSkeleton />
  if (asyncState.sessions.state === 'error') return <ErrorState message={asyncState.sessions.error || 'Failed to load sessions'} onRetry={() => dispatch({ type: 'LOAD_SESSIONS_START' })} />

  return (
    <div className="p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ec4899] mb-1"><Sparkles size={14} /> Overlay Studio</div>
        <h1 className="text-lg font-semibold text-zinc-100">Video Overlay Suggestion Studio</h1>
        <p className="text-[11px] text-zinc-500 mt-1">Analyze videos, generate cut plans, preview overlays, and export suggestion plans.</p>
      </div>

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
          <button onClick={() => {
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
            dispatch({ type: 'CREATE_SESSION', session: {
              id: crypto.randomUUID(), name: 'sample_tutorial.mp4', sourceVideoPath: 'sample_tutorial.mp4', sourceVideoName: 'sample_tutorial.mp4',
              durationSec: sample.duration, transcript: sample, status: 'transcript_ready', missingSource: false,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            }})
          }} className="studio-btn-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs">Load sample</button>
        </motion.div>
      )}

      <div>
        <h3 className="text-[13px] font-semibold text-zinc-300 mb-3">Pipeline Tools</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ToolCard icon={Film} title="Import Video" description="Add a local video file or transcript JSON." status={activeSession ? 'ready' : 'available'} onClick={handleImport} delay={0} />
          <ToolCard icon={FileJson} title="Transcript" description="View and edit transcript segments." status={activeSession?.transcript ? 'ready' : activeSession ? 'available' : 'needs-setup'} onClick={() => { if (activeSession?.transcript) dispatch({ type: 'SET_STAGE', stage: 'transcript' }); else if (activeSession) dispatch({ type: 'OPEN_BRIDGE', mode: 'cut-plan' }); else dispatch({ type: 'SET_STAGE', stage: 'source' }) }} delay={0.05} />
          <ToolCard icon={Wand2} title="Manual Bridge" description="Generate prompts and paste AI responses." status="ready" onClick={() => dispatch({ type: 'OPEN_BRIDGE', mode: 'cut-plan' })} delay={0.1} />
          <ToolCard icon={Layers} title="Cut Planner" description="AI selects which segments to keep." status={activeSession?.cutPlan ? 'ready' : activeSession?.transcript ? 'available' : 'needs-setup'} onClick={() => { if (activeSession?.cutPlan) dispatch({ type: 'SET_STAGE', stage: 'cut-plan' }); else if (activeSession?.transcript) dispatch({ type: 'OPEN_BRIDGE', mode: 'cut-plan' }); else dispatch({ type: 'SET_STAGE', stage: 'source' }) }} delay={0.15} />
          <ToolCard icon={Sparkles} title="Scene DSL" description="AI plans visual overlays for each moment." status={activeSession?.scenePlan ? 'ready' : activeSession?.cutPlan ? 'available' : 'needs-setup'} onClick={() => { if (activeSession?.scenePlan) dispatch({ type: 'SET_STAGE', stage: 'scene-plan' }); else if (activeSession?.cutPlan) dispatch({ type: 'OPEN_BRIDGE', mode: 'cut-plan' }); else dispatch({ type: 'SET_STAGE', stage: 'source' }) }} delay={0.2} />
          <ToolCard icon={Play} title="Scene Visualizer" description="Preview overlays on a 9:16 canvas." status={activeSession?.scenePlan ? 'ready' : 'needs-setup'} onClick={() => { if (activeSession?.scenePlan) dispatch({ type: 'SET_STAGE', stage: 'visualizer' }); else dispatch({ type: 'SET_STAGE', stage: 'source' }) }} delay={0.25} />
        </div>
      </div>
    </div>
  )
}
```

### src/features/overlay-studio/components/bridge/ManualBridgePanel.tsx (CURRENT — BROKEN)
```typescript
import React, { useMemo, useState, useCallback } from 'react'
import { useStudio } from '../../state/StudioProvider'
import { AlertTriangle, Check, Clipboard, ClipboardCheck, FileJson, Loader2, Wand2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PROMPT_CUT_PLANNER, PROMPT_SCENE_DSL } from '../../../../lib/overlayPrompts'
import { extractJson, validateCutPlan, validateSceneDSL, allPassed, passedCount } from '../../../../lib/overlayParser'

export function ManualBridgePanel() {
  const { state, dispatch, activeSession } = useStudio()
  const { bridge } = state
  const [copied, setCopied] = useState(false)

  // BUG: This was gated on activeSession existing. Without a session, the entire panel
  // returned early with "No session selected" — the prompt NEVER rendered.
  if (!activeSession) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No session selected</p>
      <p className="text-[11px] text-zinc-500 mt-1 mb-4">Select a video session to use the Manual Bridge.</p>
    </div>
  )

  // BUG: This returned empty string when no transcript existed. The prompt box was blank.
  const activePrompt = useMemo(() => {
    if (!activeSession?.transcript) return ''
    if (bridge.mode === 'cut-plan') return PROMPT_CUT_PLANNER + '\n\n================ INPUT DATA ================\nvideo_id: ' + activeSession.sourceVideoName + '\ntranscript:\n' + JSON.stringify(activeSession.transcript, null, 2)
    return PROMPT_SCENE_DSL + '\n\n================ INPUT DATA ================\nvideo_id: ' + activeSession?.sourceVideoName + '\nkept_transcript:\n' + JSON.stringify(activeSession?.transcript, null, 2)
  }, [activeSession, bridge.mode])

  // ... rest of component
}
```

---

## 5. Prompts & Parser

### src/lib/overlayPrompts.ts
Contains `PROMPT_CUT_PLANNER` and `PROMPT_SCENE_DSL` — full system prompts for the Manual Bridge. These are complete and correct. They instruct the AI to return JSON in a ```json code fence.

### src/lib/overlayParser.ts
Contains `extractJson()`, `validateCutPlan()`, `validateSceneDSL()`, `allPassed()`, `passedCount()`, `generateRepairPrompt()`. These handle JSON extraction from pasted AI responses and schema validation.

---

## 6. Constants

### src/features/overlay-studio/constants/studioConstants.ts
```typescript
export const PIPELINE_STEPS = [
  { key: 'source', label: 'Source', icon: 'Film' },
  { key: 'transcript', label: 'Transcript', icon: 'FileText' },
  { key: 'visual-evidence', label: 'Visual Evidence', icon: 'Eye' },
  { key: 'cut-plan', label: 'Cut Plan', icon: 'Scissors' },
  { key: 'scene-plan', label: 'Scene Plan', icon: 'Layers' },
  { key: 'visualizer', label: 'Preview', icon: 'Play' },
  { key: 'export', label: 'Export', icon: 'Download' },
] as const
```

---

## 7. What's Broken (User's Exact Complaint)

The user reports:
1. **"NONE OF THE FEATURES BUTTON WORK"** — Dashboard tool cards don't navigate to views
2. **"THE DISPLAY SIDEBAR ON THE RIGHT SIDE CAN BE CLOSED BUT CAN'T BE REOPENED"** — Inspector panel collapse/expand is broken
3. **"THE MANUAL BRIDGE CUT PLAN. THERE'S NO PROMPT WHATSOEVER"** — Manual Bridge shows empty prompt
4. **"NOTHING FUCKING WORKS"** — The entire pipeline is non-functional: no data generation, no navigation, no prompts

### Root Causes Identified:
1. **Manual Bridge early return** — `if (!activeSession) return (...)` prevents rendering without a session
2. **Manual Bridge empty prompt** — `if (!activeSession?.transcript) return ''` returns empty string
3. **ToolCard conditional dispatch** — `activeSession?.cutPlan && dispatch(...)` does nothing when condition is false
4. **Inspector unmounting** — `{!inspectorCollapsed && <StudioInspector />}` unmounts the component when collapsed
5. **Sidebar disabled steps** — `disabled={!activeSession}` makes pipeline steps unclickable
6. **Missing imports** — `AlertTriangle` in DashboardView, `FileJson` in ManualBridgePanel
