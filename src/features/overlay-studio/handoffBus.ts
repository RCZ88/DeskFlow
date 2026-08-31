// handoffBus — tiny cross-tree event emitter so the Content Engine (Assemble view)
// can push a handoff payload into Overlay Studio's StudioProvider even though the two
// live in separate React trees under the 3-mode toggle in OverlayStudioPage.
// AssembleView emits; OverlayStudioPage subscribes and dispatches LINK_EPISODE.

type HandoffPayload = {
  episodeId: number
  episodeTitle: string
  niche?: string | null
  themeId?: number | null
  cutList: any[]
  overlayPlan: any
  captionTrack?: any
  transcriptSegments?: any[]
  sourceVideoPath?: string
}

type Listener = (p: HandoffPayload) => void

const listeners = new Set<Listener>()

export const studioHandoff = {
  emit(payload: HandoffPayload) {
    for (const l of listeners) {
      try { l(payload) } catch (e) { console.error('[studioHandoff] listener failed', e) }
    }
  },
  subscribe(l: Listener): () => void {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}
