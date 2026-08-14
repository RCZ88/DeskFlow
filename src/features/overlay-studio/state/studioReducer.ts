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
