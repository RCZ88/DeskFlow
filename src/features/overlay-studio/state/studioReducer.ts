import type { StudioState, StudioStage, StudioSession, ManualBridgeState } from './studioTypes'
import type { DirectorCut } from '../../../types/overlayStudio'
import type { VisualDigest, DetectedObject, FaceRegion, TextRegion, ShotBoundary } from '../vision/types/vision'

export type StudioAction =
  | { type: 'LOAD_SESSIONS_START' } | { type: 'LOAD_SESSIONS_SUCCESS'; sessions: StudioSession[] } | { type: 'LOAD_SESSIONS_ERROR'; error: string }
  | { type: 'CREATE_SESSION'; session: StudioSession } | { type: 'SET_ACTIVE_SESSION'; sessionId: string } | { type: 'REMOVE_SESSION'; sessionId: string }
  | { type: 'LINK_EPISODE'; payload: any } | { type: 'SET_CAPTION_TRACK'; sessionId: string; captionTrack: any }
  | { type: 'SET_STAGE'; stage: StudioStage }
  | { type: 'SET_TRANSCRIPT'; sessionId: string; transcript: any } | { type: 'SET_CUT_PLAN'; sessionId: string; cutPlan: any } | { type: 'SET_SCENE_PLAN'; sessionId: string; scenePlan: DirectorCut }
  | { type: 'SELECT_SEGMENT'; segmentId: string } | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_SEGMENT_KEEP_CUT'; segmentId: string } | { type: 'APPROVE_CUT_PLAN' } | { type: 'REJECT_CUT_PLAN' }
  | { type: 'OPEN_BRIDGE'; mode: 'cut-plan' | 'scene-dsl' | 'visual-digest' } | { type: 'SET_BRIDGE_STEP'; step: ManualBridgeState['step'] }
  | { type: 'SET_BRIDGE_PROMPT'; prompt: string } | { type: 'SET_BRIDGE_RESPONSE'; rawResponse: string }
  | { type: 'VALIDATE_BRIDGE_SUCCESS'; checks: Array<{ rule: string; message: string; passed: boolean }> }
  | { type: 'VALIDATE_BRIDGE_ERROR'; error: string }
  | { type: 'ACCEPT_BRIDGE_RESULT' } | { type: 'CLOSE_BRIDGE' }
  | { type: 'SET_PLAYHEAD'; time: number } | { type: 'PLAY' } | { type: 'PAUSE' } | { type: 'SET_DURATION'; duration: number }
  | { type: 'TOGGLE_SAFE_ZONES' } | { type: 'TOGGLE_SIDEBAR' } | { type: 'TOGGLE_INSPECTOR' }
  | { type: 'SET_DIGEST'; sessionId: string; digest: VisualDigest }
  | { type: 'ADD_OBJECT'; sessionId: string; obj: DetectedObject }
  | { type: 'REMOVE_OBJECT'; sessionId: string; objectId: string }
  | { type: 'ADD_FACE'; sessionId: string; face: FaceRegion }
  | { type: 'REMOVE_FACE'; sessionId: string; faceId: string }
  | { type: 'ADD_TEXT_REGION'; sessionId: string; region: TextRegion }
  | { type: 'REMOVE_TEXT_REGION'; sessionId: string; regionId: string }
  | { type: 'SET_SHOTS'; sessionId: string; shots: ShotBoundary[] }
  | { type: 'TOGGLE_PROTECTED_REGIONS' } | { type: 'TOGGLE_FACE_REGIONS' } | { type: 'TOGGLE_TEXT_REGIONS' } | { type: 'TOGGLE_OBJECT_REGIONS' }

function updateSession(state: StudioState, updates: Partial<StudioSession>): StudioState {
  return {
    ...state,
    sessions: state.sessions.map(s =>
      s.id === state.activeSessionId ? { ...s, ...updates } : s
    ),
  }
}

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'LOAD_SESSIONS_START': return { ...state, async: { ...state.async, sessions: { state: 'loading' } } }
    case 'LOAD_SESSIONS_SUCCESS': return { ...state, sessions: action.sessions, async: { ...state.async, sessions: { state: 'success' } } }
    case 'LOAD_SESSIONS_ERROR': return { ...state, async: { ...state.async, sessions: { state: 'error', error: action.error } } }
    case 'CREATE_SESSION': return { ...state, sessions: [...state.sessions, action.session], activeSessionId: action.session.id, activeStage: 'source' }
    case 'LINK_EPISODE': {
      const p = action.payload
      // Overlay sessions ALWAYS belong to an episode — episodeId is required
      if (!p?.episodeId) return state
      const existing = state.sessions.find((s) => s.episodeId === p.episodeId)
      if (existing) {
        return {
          ...state,
          sessions: state.sessions.map((s) => s.episodeId === p.episodeId
            ? { ...s, name: p.episodeTitle || s.name, transcript: p.transcriptSegments ? { segments: p.transcriptSegments } : s.transcript, cutPlan: p.cutList ? { cuts: p.cutList } : s.cutPlan, captionTrack: p.captionTrack || s.captionTrack, overlayPlan: p.overlayPlan || s.overlayPlan, sourceVideoPath: p.sourceVideoPath || s.sourceVideoPath, status: 'linked' as const, updatedAt: new Date().toISOString() }
            : s),
          activeSessionId: existing.id,
          activeStage: 'visualizer',
        }
      }
      const id = `ov-${p.episodeId}-${Date.now().toString(36)}`
      const session: StudioSession = {
        id, name: p.episodeTitle || `Episode ${p.episodeId}`,
        episodeId: p.episodeId,
        sourceVideoPath: p.sourceVideoPath || '', sourceVideoName: p.episodeTitle || `Episode ${p.episodeId}`,
        transcript: p.transcriptSegments ? { segments: p.transcriptSegments } : undefined,
        cutPlan: p.cutList ? { cuts: p.cutList } : undefined,
        captionTrack: p.captionTrack,
        overlayPlan: p.overlayPlan,
        status: 'linked', missingSource: !p.sourceVideoPath,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }
      return { ...state, sessions: [...state.sessions, session], activeSessionId: id, activeStage: 'visualizer' }
    }
    case 'SET_CAPTION_TRACK': return { ...state, sessions: state.sessions.map((s) => s.id === action.sessionId ? { ...s, captionTrack: action.captionTrack } : s) }
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
    // Visual analysis actions
    case 'SET_DIGEST': return updateSession(state, { digest: action.digest })
    case 'ADD_OBJECT': return updateSession(state, { objects: [...(state.sessions.find(s => s.id === state.activeSessionId)?.objects || []), action.obj] })
    case 'REMOVE_OBJECT': return updateSession(state, { objects: (state.sessions.find(s => s.id === state.activeSessionId)?.objects || []).filter(o => o.id !== action.objectId) })
    case 'ADD_FACE': return updateSession(state, { faces: [...(state.sessions.find(s => s.id === state.activeSessionId)?.faces || []), action.face] })
    case 'REMOVE_FACE': return updateSession(state, { faces: (state.sessions.find(s => s.id === state.activeSessionId)?.faces || []).filter(f => f.id !== action.faceId) })
    case 'ADD_TEXT_REGION': return updateSession(state, { textRegions: [...(state.sessions.find(s => s.id === state.activeSessionId)?.textRegions || []), action.region] })
    case 'REMOVE_TEXT_REGION': return updateSession(state, { textRegions: (state.sessions.find(s => s.id === state.activeSessionId)?.textRegions || []).filter(r => r.id !== action.regionId) })
    case 'SET_SHOTS': return updateSession(state, { shots: action.shots })
    case 'TOGGLE_PROTECTED_REGIONS': return { ...state, ui: { ...state.ui, showProtectedRegions: !state.ui.showProtectedRegions } }
    case 'TOGGLE_FACE_REGIONS': return { ...state, ui: { ...state.ui, showFaceRegions: !state.ui.showFaceRegions } }
    case 'TOGGLE_TEXT_REGIONS': return { ...state, ui: { ...state.ui, showTextRegions: !state.ui.showTextRegions } }
    case 'TOGGLE_OBJECT_REGIONS': return { ...state, ui: { ...state.ui, showObjectRegions: !state.ui.showObjectRegions } }
    default: return state
  }
}
