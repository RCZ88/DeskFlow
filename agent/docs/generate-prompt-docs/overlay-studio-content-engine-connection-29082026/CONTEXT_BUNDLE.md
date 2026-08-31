# CONTEXT_BUNDLE.md — Overlay Studio ↔ Content Engine Connection + Caption Generation

**Generated:** 2026-08-29 | **Repo:** C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker
**Purpose:** Self-contained code context for a target AI to design the connection between the two pipelines and the caption-from-transcript feature.

---

## 1. Current State — the disconnect (verified in source)

The app has **three** Feature Studio modes that ALREADY share one page, but are architecturally unconnected:

**`src/features/overlay-studio/OverlayStudioPage.tsx` (lines 80-116) — the current wiring:**
```tsx
function StudioPageInner() {
  const { dispatch } = useStudio()
  const [mode, setMode] = useState<'studio' | 'engine' | 'presentation'>('studio')

  return (
    <div className="flex flex-col h-full" data-page="studio">
      <div className="flex items-center gap-2 px-4 py-2 ...">
        {/* Tab toggle */}
        <button onClick={() => setMode('studio')} ...>Overlay Studio</button>
        <button onClick={() => setMode('engine')} ...>Content Engine</button>
        <button onClick={() => setMode('presentation')} ...><Presentation size={10} /> Presentations</button>
        <span className="text-[9px] text-zinc-500">
          — {mode === 'studio' ? 'Video Overlay Suggestion Studio'
             : mode === 'engine' ? 'Content Creation Pipeline'
             : 'Interactive HTML Slide Generator'}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        {mode === 'engine' ? <ContentEngineWorkspace />
         : mode === 'presentation' ? <PresentationWorkspace />
         : <StudioShell />}
      </div>
    </div>
  )
}

export function FeatureStudioPage() {
  return <StudioProvider handleImport={handleImport}><StudioPageInner /></StudioProvider>
}
```

**Reality:** switching tabs is just `setMode(...)` → swaps the child component. There is **no**:
- data handoff between a transcript in studio mode and the Content Engine
- clickable pipeline flow (no "send this cut plan to the engine," no "promote this frame to an overlay")
- caption generation wired anywhere
- visual feedback showing which stage you're on in a pipeline

---

## 2. Overlay Studio — real IPC + file flow

**IPC in `src/main.ts` (line 6064):**
```ts
electron_1.ipcMain.handle('overlay-studio:transcribe', async (_event, payload) => {
  // ... validates fs.existsSync(filePath), runs faster-whisper (async spawn, 120s timeout)
  // returns { ok: true, transcript: {...} } or { ok: false, error: '...' }
})
```

**Preload `src/preload.ts` (lines 279-282):**
```ts
// Overlay Studio: auto-transcribe video/audio via faster-whisper
overlayStudioTranscribe:   (payload: { filePath: string }) => ipcRenderer.invoke('overlay-studio:transcribe', payload),
overlayStudioReadTranscript: (payload: { filePath: string }) => ipcRenderer.invoke('overlay-studio:readTranscript', payload),
```

Also `dialogOpenFile` (native dialog → real absolute path), `takeTranscribe` → `content:takes:transcribe`.

**File-level import handler (OverlayStudioPage.tsx lines 18-78) — real path fix ALREADY APPLIED:**
```tsx
async function handleImport() {
  const api = (window as any).deskflowAPI
  // Uses NATIVE file dialog (dialogOpenFile) so we receive a REAL absolute path.
  // The secure renderer's <input type=file> File object has no `.path`, so
  // `file.path || file.name` previously sent a bare filename → "File not found".
  const dlg = await api?.dialogOpenFile?.()
  if (!dlg || dlg.canceled || !dlg.filePath) return
  const filePath: string = dlg.filePath
  const fileName = filePath.split(/[\\/]/).pop() || filePath

  if (fileName.toLowerCase().endsWith('.json')) {
    // JSON transcript — read via backend (real-path access)
    if (!api?.overlayStudioReadTranscript) { ... return }
    const res = await api.overlayStudioReadTranscript({ filePath })
    if (res?.ok && res.transcript) {
      // create StudioSession with transcript
    }
    return
  }

  // Video/audio — create session, then auto-transcribe
  const session: StudioSession = { ..., status: 'transcribing', ... }
  dispatch({ type: 'CREATE_SESSION', session })
  if (api?.overlayStudioTranscribe) {
    api.overlayStudioTranscribe({ filePath }).then((result: any) => {
      if (result?.ok && result.transcript) {
        dispatch({ type: 'SET_TRANSCRIPT', sessionId: session.id, transcript: result.transcript })
      } else {
        // drop session, let user re-import
        dispatch({ type: 'REMOVE_SESSION', sessionId: session.id })
      }
    })
  }
}
```

**Pipeline (from FEATURE_TRACKER.md + MEMORY.md):**
```
video → ffmpeg → faster-whisper (async spawn in main.ts) → transcript.json
  → Ollama (num_ctx=16384) → cut_plan.json → human approve
  → ffmpeg lossless cut → kept segments → Ollama → scene_dsl.json
  → renderer dispatch → cards/diagrams/timeline.json + manifest.md
```

**Manual Bridge mode:** copy prompt → paste into any web AI → paste response back → app validates + repairs. **NOT automated.**

**State types (`src/features/overlay-studio/state/studioTypes.ts` — StudioSession):**
```
StudioSession: {
  id, name, sourceVideoPath, sourceVideoName,
  durationSec?, transcript?, status, missingSource,
  createdAt, updatedAt
}
status ∈ { 'transcribing', 'transcript_ready', ... }
```

**Existing UI pieces:**
- `StudioShell` — the main overlay-studio workspace shell (4-pane layout: transcript input, 9:16 canvas preview with safe zones, timeline with colored blocks, property inspector)
- `VisualEvidenceView.tsx` — vision tools grid (frame capture, shot detection, asset enrichment, object locator, text regions, style reference + visual digest card + frame filmstrip placeholder). Pipeline updated: Source → Transcript → **Visual Evidence** → Cut Plan → Scene Plan → Preview → Export.
- `overlayPrompts.ts` — 3 prompts
- `overlayParser.ts` — parse pipeline
- `vision/` module — contracts (11 Pydantic models), sampling (3-tier frame extraction), fingerprints, shot_detect, digest, bridge (Manual Visual Bridge), collision (ProtectedRegion + overlay collision)

**NOT built (per FEATURE_TRACKER.md entry 2026-08-12 — Clement Overlay Studio):**
> 4-tab page rewrite, transcript upload UI, cut plan timeline, scene DSL preview, Manual Bridge wizard, Python backend, renderer registry

---

## 3. Content Engine — what exists

**Location:** `src/features/content-engine/` with `ContentEngineWorkspace.tsx` (the tabbed workspace).

**IPC (86 handlers, per CONTENT_ENGINE_AUDIT.md §A):**
- `content:ideas:*`, `content:episodes:*`, `content:script:*`, `content:validate-script-evidence`, `content:validate-gates`, `content:gate-override`, `content:inject-seo`
- `content:brainstorm:*`, `content:brainstorms:*`
- `content:series:*`, `content:themes:*`
- `content:analytics:*` (get, upsert-video, delete-video, insight, parse-raw, correlate)
- `content:lessons:*` (list, save, delete, extract, confirm)
- `content:frameworks:*` (list, save, rollback)
- `content:reflection:*` (save, get, analyze)
- `content:characteristics:*` (get, save)
- `content:scoring:*` (schemes, current, calibrate)
- `content:process:*` (timeline, log, summary, gallery)
- `content:takes:*` (list, save, delete, import, **transcribe**, save-segments, segments, select, evaluate)
- `content:edit:*` (**cutlist**, **overlay-plan**)

**Existing UI (per CONTENT_ENGINE_AUDIT.md §B — 22/26 exist, 3 MISSING):**
- ContentEngineWorkspace ✅ (renders, 8 tabs)
- BrainstormView ✅ ⚠️ (no session summary, no confirm/reclassify, no routing)
- IdeasView ✅ (Kanban by status)
- EpisodesView ✅ (Script/SEO/Analytics/Assets/Metrics sub-tabs)
- ScriptProofCard ✅ ❌ (no accept/reject/regenerate; no rejected visual)
- RetentionPanel ✅ ❌ (no 4-state)
- SvgRetentionChart ✅ ❌
- ThemesView ✅
- AnalyticsView ✅ (videos + retention)
- LessonsView ✅ ⚠️ (no extract button wired)
- FrameworksView ✅
- PhaseStepper ✅
- GreenLightPanel ✅ ⚠️ (shows gates but doesn't call validate-gates)
- CaptureView ⚠️, AssembleView ⚠️, LearnView ⚠️ (4-state partial)
- SegmentTimeline ✅
- FramePreviewCard ✅
- PipelineView ✅
- PlaybookView ✅
- TemplateSelector ✅ (N/A for 4-state)
- SeriesView ✅
- **MISSING:** HookStackDisplay, CuriosityGapBridge, KeywordSEOPanel, CaptionDisplay

**Feature gaps (CONTENT_ENGINE_AUDIT.md §C — 13 items, key ones):**
- #4 ScriptProofCard has no accept/reject/regenerate (CRITICAL)
- #5 Brainstorm has no session summary
- #6 Brainstorm has no confirm/reclassify
- #7 Brainstorm doesn't route on confirm
- #8 Episode detail doesn't compose Phase 2 elements (HookStack, bridges, keyword panel NOT in script tab)
- **#9 No caption + pinned comment display** (MEDIUM — §2.3F)
- #10 Frame rejected visual missing
- #11 No curiosity gap bridges between frames
- #12 EpisodeScoreSummary may lack per-criterion bars
- #13 Most sub-components lack empty/loading/error states

**Implementation requests (CONTENT_ENGINE_REQUESTS.md):**
- Request #8: **Caption + Pinned Comment Display** — show generated caption (5-line structure) and pinned comment with keyword trigger in script tab. Spec §2.3F. **NOT IMPLEMENTED.**
- Request #7: Brainstorm end-to-end (summary + confirm/reclassify + routing) — PARTIAL

**Prompt registry (CONTENT_ENGINE_CHECKLIST.md §E):**
- `classification`, `synthesis`, `script_frames`, `gate_validator`, `seo_injector`, `theme_generator`, `analytics_insight`, `session_summary`
- **NEW (user):** `retention_hook_writer` (writes hooks using R1-R4 + evidence lines), `retention_evidence_scorer` (scores every script bullet against retention criteria with evidence) — both NOT IMPLEMENTED

**Retention psychology system (CONTENT_ENGINE_CHECKLIST.md §D — user-mandated, NEW):**
- R1 Pattern Interrupt — NOT in system
- R2 Curiosity Gap — NOT in system
- R3 Hook at 3rd-4th second — NOT in system
- R4 Attention Anchor — NOT in system
- R5 Niche/context adaptation — NOT in system
- R6 Evidence criteria on script bullets — NOT in system
- R7 Broader retention research — PROMPT SENT (not returned yet)

**Retention prompt structures user wants generated:** caption stuff based on transcript — the caption should be overlay-ready (can put on video as overlay, or captcha-like, or internally in app).

---

## 4. What's actually connected vs. what isn't

**Already connected (structural):**
- `FeatureStudioPage` (OverlayStudioPage.tsx) imports `ContentEngineWorkspace` and switches to it via tab toggle. So they render in the same page shell.
- `content:takes:transcribe` exists in main.ts (Content Engine's own take-transcription IPC)
- `content:edit:overlay-plan` + `content:edit:cutlist` exist (Content Engine can edit overlay plans / cut lists)

**NOT connected (architectural gaps):**
1. No click-through between the two — the tab toggle is blind (no "open this episode's script in Overlay Studio" or "import this overlay plan as a Content Engine asset")
2. No data handoff — a transcript processed in studio mode doesn't flow to Content Engine's `content:takes:*` or `content:edit:overlay-plan`
3. Cut Plan / Scene Plan are empty in the UI because the overlay pipeline relies on Manual Bridge (copy→paste→web AI→paste back→validate) — NOT automated AI calls from the app
4. No caption generation anywhere — transcript exists but no "generate caption from transcript" step, and no "apply caption as overlay / captcha / internal display"
5. The visual evidence piece exists (`VisualEvidenceView.tsx`) but there's no UI showing WHY we're on a given stage or how stages connect
6. Content Engine's Episode detail (script tab) doesn't compose Phase 2 elements — HookStack, bridges, keyword panel, caption are all missing

---

## 5. Design tokens (binding — from CONTENT_ENGINE_REQUESTS.md §Design Tokens)

```
Background: #0a0a0f
Surface/Card: bg-[rgba(24,24,27,0.60)] + backdrop-blur-xl
Border: border-white/[0.06]
Radius: rounded-xl max
Padding: p-5
Accent (Content Engine): #f5c518 (amber)
Accent (Overlay Studio): #ec4899 (pink)  — from OverlayStudioPage.tsx line 105
Text primary: zinc-100
Text body: zinc-300
Text caption: zinc-500 (10px uppercase tracking-wide)
Score bar: rose <0.6 | amber ≤0.8 | emerald >0.8
Status colors:
  - emerald-400: published/active/used/pass
  - amber #f5c518: scripted/approved/warning
  - violet-400: gated
  - cyan #00d4ff: refined/filming/applied
  - zinc: draft/raw/dismissed
Focus ring: focus:border-[#f5c518]/50
Fonts: Geist + JetBrains Mono
Icons: lucide-react ONLY

Overlay prompt word limits (from MEMORY.md line 192):
hook=8, body=12, caption=14, bullet=10, keyword=6
Animation: in={fade,slide_up,pop}, out={fade,slide_down}
Never overlap overlays. Hook cards only in first 5 seconds.
```

---

## 6. Relevant file paths for implementation

```
src/features/overlay-studio/OverlayStudioPage.tsx    — FeatureStudioPage, StudioPageInner, tab toggle, handleImport
src/features/overlay-studio/state/studioTypes.ts     — StudioSession type, StudioAction
src/features/overlay-studio/state/StudioProvider.ts  — StudioProvider (context + reducer)
src/features/overlay-studio/components/shell/StudioShell.tsx — main overlay workspace shell
src/features/overlay-studio/components/VisualEvidenceView.tsx — visual evidence UI
src/features/content-engine/ContentEngineWorkspace.tsx — Content Engine tabbed workspace
src/features/content-engine/components/ — 35+ components (EpisodesView, ScriptProofCard, etc.)
src/main.ts — IPC handlers: overlay-studio:transcribe (L6064), content:takes:transcribe, content:edit:overlay-plan, content:edit:cutlist
src/preload.ts — preload bridges: overlayStudioTranscribe, overlayStudioReadTranscript, dialogOpenFile, takeTranscribe
src/lib/overlayParser.ts   — parse pipeline
src/lib/overlayPrompts.ts  — 3 prompts
src/types/overlayStudio.ts — overlay types
src/types/vision.ts        — vision types
agent/CONTENT_ENGINE_AUDIT.md      — full audit: 86 IPC, 22/26 components, 13 gaps, 4 broken connections
agent/CONTENT_ENGINE_REQUESTS.md   — 10 implementation requests (Request #8 = caption display)
agent/CONTENT_ENGINE_CHECKLIST.md  — v3.0 master checklist: pipeline fixes, new features, UI overhaul screens, retention system
agent/FEATURE_TRACKER.md          — 2026-08-12 Clement Overlay Studio entry (pipeline + NOT BUILT list)
agent/MEMORY.md                   — MEMORY.md line 191-195 (Feature Studio = Overlay Studio, overlay schema, word limits)
```

---

## 7. What the target AI should design (the mandate)

The app has 3 studio modes under one shell — Overlay Studio, Content Engine, Presentations — but they're **tab-switched views with no pipeline, no data handoff, and no click-through**. Cut Plan / Scene Plan render empty because the overlay pipeline is Manual Bridge (copy→web AI→paste→validate), not automated. There's **no caption generation from transcript** anywhere. The user wants:

1. A **click-through pipeline** between Overlay Studio ↔ Content Engine (clickable stages, visual feedback showing where you are, how to move between them, which order makes sense — overlays before content engine, or interleave?)
2. **Caption generation from transcript** — generate caption text from the transcript, as an overlay-ready asset (put on video as overlay / captcha-like / or internal app display)
3. **Procedural clarity** — clear UI showing the pipeline stages and what each stage does, so the user understands the "procedure" of how the app collaborates the two subsystems
4. Fix **why Cut Plan / Scene Plan are empty** — either automate the AI step (so they're not Manual-Bridge-only) or surface the Manual Bridge flow clearly

The target AI must design the **full solution**: data flow (how transcript → caption → overlay-plan flows between the two IPC namespaces), UI (clickable pipeline stages, procedure clarity, caption display), and whether to automate the AI Director step or gracefully surface the Manual Bridge.
