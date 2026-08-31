# CONTEXT_BUNDLE.md — Content Engine ↔ Overlay Studio Integration

> Self-contained code reference for the design spec in PROMPT.md.
> Scope: connect the Content Engine's **Assemble** phase (the "second page" of an
> episode) to the Overlay Studio so an episode's cut list + overlay plan + transcript
> captions flow into Overlay Studio as a linked session — plus a caption-from-transcript
> feature that renders as a video overlay or is usable inside the app.

## 1. The "content creation page" and its subpages

**File: `src/features/content-engine/ContentEngineWorkspace.tsx`** (full file, 82 lines)

The Content Engine is a single workspace with a left nav (`VIEWS`) and a main area where
every view stays mounted (hidden via `display:none`) so in-progress work survives tab
switches.

```tsx
const VIEWS = [
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'episodes', label: 'Episodes', icon: Clapperboard },
  { id: 'series', label: 'Series', icon: BookOpen },
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'lessons', label: 'Lessons', icon: GraduationCap },
  { id: 'frameworks', label: 'Frameworks', icon: Layers },
  { id: 'process', label: 'Process', icon: Activity },
  { id: 'playbook', label: 'Playbook', icon: BookMarked },
]
function WorkspaceInner() {
  const { view, setView } = useContentEngine()
  return (
    <div className="flex h-full gap-3 p-3" data-page="content-engine">
      <nav className="flex w-44 shrink-0 flex-col gap-1 rounded-xl border border-white/[0.06] bg-[rgba(24,24,27,0.60)] p-2 backdrop-blur-xl">
        {/* ...VIEWS.map renders nav buttons, each calls setView(v.id)... */}
      </nav>
      {/* All views kept mounted, toggled via 'hidden' class */}
      <main className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-white/[0.06] bg-[rgba(24,24,27,0.60)] backdrop-blur-xl">
        <div className={cn('absolute inset-0 overflow-y-auto', view === 'brainstorm' ? 'block' : 'hidden')}><div className="space-y-6 p-6"><BrainstormView onNavigate={setView} /></div></div>
        <div className={cn('absolute inset-0 overflow-y-auto', view === 'episodes' ? 'block' : 'hidden')}><div className="space-y-6 p-6"><EpisodesView /></div></div>
        {/* ...ideas, series, themes, analytics, lessons, frameworks, process, playbook... */}
      </main>
      <ToastHost />
    </div>
  )
}
```

**Context provider: `src/features/content-engine/ContentEngineContext.tsx`** (49 lines)

```tsx
type ContentEngineCtx = {
  view: string
  setView: (v: string) => void
  openEpisodeId: number | null
  openIdeaId: number | null
  requestOpenEpisode: (id: number) => void   // sets openEpisodeId + setView('episodes')
  requestOpenIdea: (id: number) => void
  clearOpenEpisode: () => void
  clearOpenIdea: () => void
  refreshTick: number
  bump: () => void
}
```

## 2. The "second page" — an episode detail (where the overlay lives)

**File: `src/features/content-engine/components/EpisodesView.tsx`**

- `EpisodesView` lists episodes; clicking one calls `open(id)` → loads episode via
  `api()?.episodeGet(id)` and renders `EpisodeDetail`.
- `EpisodeDetail` (lines 186–817) has:
  - A **tab bar** (`TABS`, lines 29–36): `script | pipeline | seo | analytics | assets | metrics`
  - A **phase pipeline** driven by `PhaseStepper` (lines 486–493), with phase panels
    rendered conditionally (lines 496–516):
    - `currentPhase === 'idea'` → `<GreenLightPanel>`
    - `currentPhase === 'capture'` → `<CaptureView>`   (import video, transcribe, keep segments)
    - `currentPhase === 'assemble'` → `<AssembleView>`  ← **THE OVERLAY CONNECTION POINT**
    - `currentPhase === 'learn'` → `<LearnView>`

**Phase model — `src/features/content-engine/components/PhaseStepper.tsx` (lines 6–16):**

```tsx
const PHASES = [
  { id: 'idea', label: 'GREEN LIGHT', short: 'GL' },
  { id: 'script', label: 'BLUEPRINT', short: 'BP' },
  { id: 'capture', label: 'CAPTURE', short: 'CA' },
  { id: 'assemble', label: 'ASSEMBLE', short: 'AS' },
  { id: 'learn', label: 'LEARN', short: 'LR' },
] as const
// NOTE: there is NO 'studio' phase. AssembleView.onPhaseChange('studio') is a DEAD call.
```

**Caption + Pinned Comment already exists on the Script tab** (EpisodesView lines 632–649):
the episode object may carry `caption` and `pinned_comment` fields, displayed read-only.
These are the natural home for the new transcript→caption feature.

## 3. The overlay connection point — `AssembleView.tsx` (THE STUB)

**File: `src/features/content-engine/components/AssembleView.tsx`** (full file, 217 lines)

This view loads the episode's cut list (`content:edit:cutlist`) and overlay plan
(`content:edit:overlay-plan`) and renders them. The handoff button is a **no-op stub**:

```tsx
const sendToOverlay = async () => {
  setSending(true)
  try {
    toast('Sending cut list to Overlay Studio…', 'info')
    onPhaseChange?.('studio')          // <-- 'studio' is NOT a real phase; does nothing useful
    toast('Handed off to Overlay Studio', 'success')
  } finally {
    setSending(false)
  }
}
```

The button (lines 200–212):
```tsx
<div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
  <div>
    <div className="text-xs font-medium text-zinc-300">Ready to add overlays visually?</div>
    <div className="mt-0.5 text-[11px] text-zinc-500">
      Send this plan to Overlay Studio for drag-and-drop positioning.
    </div>
  </div>
  <AmberButton onClick={sendToOverlay} disabled={sending}>
    {sending ? 'Sending…' : 'Send to Overlay Studio'}
    <ArrowRight size={13} />
  </AmberButton>
</div>
```

**The disconnect, stated precisely:**
- `sendToOverlay()` passes **no data** (no episodeId, no cutlist, no overlay plan) to
  Overlay Studio. It only toasts.
- `onPhaseChange('studio')` targets a non-existent phase — the EpisodeDetail phase state
  ignores it (only idea/script/capture/assemble/learn are valid).
- Overlay Studio is a *separate mode* in `OverlayStudioPage` with its own provider/state;
  there is no bridge that accepts a Content Engine episode.

### AssembleView data received from backend
```tsx
const [cutRes, overlayRes] = await Promise.all([
  api()?.editCutlist({ episodeId }),       // { ok, cutlist: CutEntry[], total_duration }
  api()?.editOverlayPlan({ episodeId }),   // { ok, plan: { overlays: OverlayEntry[], total_overlays, notes } }
])
type CutEntry = { index: number; start_s: number; end_s: number; duration_s: number; text: string; seg_type: string; source_seg_id?: string }
type OverlayEntry = { start_s: number; end_s: number; text: string; position: string; style?: string; font_size?: string }
```

## 4. Overlay Studio — the destination (separate mode, no inbound handoff)

**File: `src/features/overlay-studio/OverlayStudioPage.tsx`** (124 lines)

`FeatureStudioPage` wraps everything in `StudioProvider` and renders a 3-mode toggle.
There is **no shared state between modes** — switching mode just swaps the tree.

```tsx
function StudioPageInner() {
  const { dispatch } = useStudio()
  const [mode, setMode] = useState<'studio' | 'engine' | 'presentation'>('studio')
  // ... renders Overlay Studio / Content Engine / Presentations based on `mode`
  return (
    <div className="flex flex-col h-full" data-page="studio">
      {/* pink/pink/amber toggle: Overlay Studio | Content Engine | Presentations */}
      <div className="flex-1 min-h-0">
        {mode === 'engine' ? <ContentEngineWorkspace /> : mode === 'presentation' ? <PresentationWorkspace /> : <StudioShell />}
      </div>
    </div>
  )
}
```

**Session import (file-level `handleImport`, lines 18–78)** — this is how Overlay Studio
currently gets data in. It creates a `StudioSession` from a video/JSON file and
auto-transcribes via `api?.overlayStudioTranscribe`:

```tsx
const session: StudioSession = {
  id: uid(), name: fileName, sourceVideoPath: filePath, sourceVideoName: fileName,
  status: 'transcribing', missingSource: false,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}
dispatch({ type: 'CREATE_SESSION', session })
if (api?.overlayStudioTranscribe) {
  api.overlayStudioTranscribe({ filePath }).then((result) => {
    if (result?.ok && result.transcript) {
      dispatch({ type: 'SET_TRANSCRIPT', sessionId: session.id, transcript: result.transcript })
    } else { /* drop session */ }
  })
}
```

### StudioSession shape — `src/features/overlay-studio/state/studioTypes.ts` (lines 4–19)
```ts
export type StudioStage = 'dashboard' | 'source' | 'transcript' | 'visual-evidence' | 'bridge' | 'cut-plan' | 'scene-plan' | 'visualizer' | 'export'
export type SessionStatus = 'created' | 'transcribing' | 'transcript_ready' | 'cut_plan_pending' | 'cut_plan_ready' | 'cut_plan_approved' | 'scene_plan_pending' | 'scene_plan_ready' | 'export_ready' | 'error' | 'linked' | 'caption_ready' | 'bridge_waiting' | 'preview_ready'
export interface CaptionLine { id: string; start: number; end: number; text: string; highlight?: string[] }
export interface CaptionTrack { sessionId: string; source: 'transcript' | 'bridge_styled'; lines: CaptionLine[]; createdAt: string }
export interface StudioSession {
  id: string; name: string; sourceVideoPath: string; sourceVideoName: string
  durationSec?: number; transcriptPath?: string; cutPlanPath?: string; scenePlanPath?: string; exportPlanPath?: string
  transcript?: any; cutPlan?: any; scenePlan?: DirectorCut; status: SessionStatus; missingSource: boolean
  createdAt: string; updatedAt: string
  episodeId?: number                 // <-- ALREADY EXISTS but never set from Content Engine
  captionTrack?: CaptionTrack        // <-- caption lives here
  digest?: VisualDigest; objects?: DetectedObject[]; faces?: FaceRegion[]; textRegions?: TextRegion[]; shots?: ShotBoundary[]
}
```

**Reducer — `src/features/overlay-studio/state/studioReducer.ts`** (relevant actions):
- `CREATE_SESSION` → appends session, sets `activeSessionId`, `activeStage: 'source'`
- `SET_TRANSCRIPT` → sets `transcript`, `status: 'transcript_ready'`
- `SET_CUT_PLAN`, `SET_SCENE_PLAN`, `APPROVE_CUT_PLAN`, `SET_STAGE`
- **No `LINK_EPISODE` / `SET_CAPTION_TRACK` action exists** — must be added for the handoff.

**Provider — `src/features/overlay-studio/state/StudioProvider.tsx`** (35 lines):
`useStudio()` returns `{ state, dispatch, activeSession, handleImport }`.
Sessions persist to `localStorage` key `rheo-overlay-studio-sessions` (OverlayStudioPage line 91).

## 5. Caption-from-transcript — `src/lib/captionBuilder.ts` (EXISTS, UNWIRED)

**File: `src/lib/captionBuilder.ts`** (177 lines) — deterministic, no-AI caption builder.

```ts
export function buildCaptionFromTranscript(transcript: any, sessionId: string, seoPhrases?: string[]): CaptionTrack {
  // transcript.segments: [{ id, start, end, text }]
  // merges segments into caption lines ≤ 14 words each
  // highlight = intersection with seoPhrases, else longest content word
  // returns { sessionId, source: 'transcript', lines: CaptionLine[], createdAt }
}
export function captionLineValid(line: CaptionLine): boolean { ... }   // ≤14 words
export function captionTrackValid(track: CaptionTrack): string[] { ... }
export function repairCaptionLine(text: string): { ok: boolean; text: string } { ... }
```

This is exactly the module the user wants ("generate caption stuff from the transcript,
as an overlay I can put on my caption"). It is currently **not imported by any view** —
it must be wired into (a) the Content Engine episode and (b) the Overlay Studio caption
track after a handoff.

## 6. Backend IPC wiring (REAL channels — verified)

**Preload bridge — `src/preload.ts` (lines 324–329):**
```ts
takeSegments: (payload: any) => ipcRenderer.invoke('content:takes:segments', payload),
takeSelect:   (payload: any) => ipcRenderer.invoke('content:takes:select', payload),
takeEvaluate: (payload: any) => ipcRenderer.invoke('content:takes:evaluate', payload),
editCutlist:  (payload: any) => ipcRenderer.invoke('content:edit:cutlist', payload),
editOverlayPlan: (payload: any) => ipcRenderer.invoke('content:edit:overlay-plan', payload),
```

**Handlers — `src/services/contentEngine/index.ts` (lines 1900–1933):**
```ts
ipcMain.handle('content:edit:cutlist', async (_, { episodeId, takeId }) => {
  const segs = db.prepare('SELECT * FROM take_segments WHERE take_id=? AND keep=1 ORDER BY seg_index ASC').all(takeId)
  if (!segs.length) return { ok: false, error: 'No kept segments — select segments in Capture phase first' }
  const cutlist = segs.map((s, i) => ({ index: i, start_s: s.start_s, end_s: s.end_s,
    duration_s: s.end_s - s.start_s, text: s.text, seg_type: s.seg_type, source_seg_id: s.id }))
  return { ok: true, cutlist, total_duration: cutlist.reduce((a, c) => a + c.duration_s, 0) }
})
ipcMain.handle('content:edit:overlay-plan', async (_, { episodeId }) => {
  const ep = db.prepare('SELECT * FROM content_episodes WHERE id=?').get(episodeId)
  const script = safeJson(ep.script, [])
  const take = db.prepare('SELECT * FROM content_takes WHERE episode_id=? AND status IN (?,?) ORDER BY take_number DESC LIMIT 1').get(episodeId, 'selected', 'evaluated')
  let transcript = ''
  if (take) { const segs = db.prepare('SELECT * FROM take_segments WHERE take_id=? AND keep=1 ORDER BY seg_index ASC').all(take.id); transcript = segs.map(s => s.text).join(' ') }
  const theme = ep.theme_id ? db.prepare('SELECT * FROM themes WHERE id=?').get(ep.theme_id) : null
  const res = await parseAiJson(/* AI prompt: build overlays from script+transcript+theme */, { required: ['overlays'] }, (p, s) => aiCall(p, s, 2000))
  if (!res.ok) return { ok: false, error: `Overlay plan failed: ${res.error}` }
  return { ok: true, plan: res.data }
})
```

**Overlay Studio channels** (referenced in `OverlayStudioPage.tsx` lines 31–77):
- `api.overlayStudioTranscribe({ filePath })` → `{ ok, transcript }`
- `api.overlayStudioReadTranscript({ filePath })` → `{ ok, transcript }`
- `api.dialogOpenFile()` → native file dialog returning real absolute path

**Assemble's `editCutlist` requires `takeId`**, but `AssembleView` calls it with only
`{ episodeId }`. This is a latent bug: the current call omits `takeId`, so the handler
will error ("No kept segments") unless a takeId is supplied. The handoff design must
resolve which take's kept segments form the cut list.

## 7. DB schema (relevant tables — inferred from handlers)
- `content_episodes`: `id, title, status, script (JSON), theme_id, niche, caption, pinned_comment, phase, gate_override`
- `content_takes`: `id, episode_id, take_number, status (imported|transcribing|transcribed|evaluated|failed), file_path, duration_seconds`
- `take_segments`: `id, take_id, seg_index, start_s, end_s, text, seg_type, keep (0/1)`

These are created in `src/services/contentEngine/index.ts` migrations (better-sqlite3,
`PRAGMA user_version`). New columns (e.g. `episode_overlay_session_id` on `content_episodes`)
should follow the same `db.prepare(...).run(...)` + user_version bump pattern.

## 8. Design tokens (DeskFlow / RHEO)
- Background glass: `bg-[rgba(24,24,27,0.60)]` + `backdrop-blur-xl`, border `border-white/[0.06]`
- Accent (Content Engine): `#f5c518` (amber) — used for active nav, primary buttons (`AmberButton`)
- Accent (Overlay Studio): `#ec4899` (pink)
- Accent (Presentation): `#10b981` (emerald)
- Cyan (data/transcript): `#00d4ff`
- Violet (bridge/transition): `#8b5cf6`
- Card component: `Card` from `src/features/content-engine/components/ui`
- Fonts: Geist (UI) + JetBrains Mono (mono/numbers)
- Motion: prefer backdrop-blur + subtle hover transitions; no slop.

## 9. Key gaps the spec must close
1. `AssembleView.sendToOverlay()` is a stub — must actually build a `StudioSession` from the
   episode's cut list + overlay plan + transcript captions and dispatch it into Overlay Studio.
2. Overlay Studio reducer/provider has **no inbound handoff action** (no `LINK_EPISODE`,
   no `SET_CAPTION_TRACK`) — must be added.
3. `StudioSession.episodeId` and `captionTrack` fields exist but are never populated from
   Content Engine.
4. `captionBuilder.buildCaptionFromTranscript` is unwired — must run after a take is
   transcribed (or after handoff) and feed both the episode's `caption` field and the
   session's `captionTrack`.
5. `editCutlist` is called without `takeId` in AssembleView — handoff must pick the evaluated/
   selected take and pass its id.
6. The 3-mode toggle in `OverlayStudioPage` has no "linked episode" indicator — the user
   should see, inside Overlay Studio, which Content Engine episode a session came from.
