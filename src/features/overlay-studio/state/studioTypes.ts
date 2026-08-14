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
