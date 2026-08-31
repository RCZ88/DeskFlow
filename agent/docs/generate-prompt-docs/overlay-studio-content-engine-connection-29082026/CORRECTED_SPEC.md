# CORRECTED_SPEC.md — Overlay Studio ↔ Content Engine Connection + Caption Generation

**Scope:** Result.md mandate (2026-08-29) — corrected against actual code.
**Correction date:** 2026-08-29
**Ground rule:** Every claim below is grep-verified against `src/main.ts`, `src/preload.ts`, `src/features/overlay-studio/*`, `src/features/content-engine/*`. No invented channels, no invented middleware.

---

## 0. Design-compliance declaration (from the gen-prompt directives)

**SYSTEM PROMPT SOURCE:** `AGENTS.md` + `MEMORY.md` (per PROMPT.md §2 definition). There is no file literally named `SYSTEMPRMINT`; the project canonicalizes its system prompt from those two files. Compliance = follow AGENTS.md §5c (8 design skills + real MCP components) + §0c (RHEO handoff contract — no direct AI calls from app for overlay artifacts) + §5.5 (memory hybrid: lesson = about the user; decision = MicroManager-definite).

**MCP compliance:** shadcn-ui-mcp server pulled real component source for `card`, `button`, `dialog`, `tabs`, `textarea`, `checkbox` (files cached under `agent/`). lucide-react ^0.577.0 provides all requested icons by name. Anti-slop checklist applied.

---

## 1. Actual state of the overlay feature (verified on disk)

- `/studio` route → `FeatureStudioPage` (OverlayStudioPage.tsx) — registered at App.tsx:3077. ✅
- `StudioPageInner` with mode toggle (studio/engine/presentation) — present at OverlayStudioPage.tsx:80-116. ✅
- `handleImport` — native dialog import + auto-transcribe via `overlay-studio:transcribe` + JSON-transcript-read via `overlayStudioReadTranscript` (preload.ts:282). ✅
- `overlay-studio:transcribe` backend handler — main.ts:6065 (faster-whisper, async-ready). ✅
- `overlay-studio:readTranscript` backend handler — **MISSING in main.ts** (grep=0). The frontend calls `api.overlayStudioReadTranscript({ filePath })` but the main process never handles it → silent failure on JSON transcript import. This is the one fix that unblocks the existing import path.
- State: `StudioSession`, `StudioStage`, `SessionStatus`, `ManualBridgeState` — studioTypes.ts intact. ✅
- Components: StudioShell, VisualEvidenceView, vision module, overlayParser, overlayPrompts — present. ✅
- Content Engine workspace (`src/features/content-engine/ContentEngineWorkspace.tsx`) — exists (82 lines, 8-view workspace). The "content:*" handlers listed in CONTENT_ENGINE_AUDIT.md are NOT grep-reachable in `src/main.ts` on this branch (grep=0 for all of them). Conclusion: the Content Engine IPC backends exist in a different context/branch, not wired here. Handoff B (send-to-engine) is **out-of-scope until those handlers are written**; the connection spec must not assume they exist.

---

## 2. What the connection wiring must actually be (corrected from RESULT.md)

**The "reuse content:* IPC" story is false on this branch.** The RESULT.md assumed `content:takes:import`, `content:takes:save-segments`, `content:takes:evaluate`, `content:edit:overlay-plan`, `content:edit:cutlist`, `content:script:generate`, `content:validate-gates`, `content:inject-seo`, `content:lessons:extract` all exist in main.ts. None of them do (grep=0 for all).

**The `overlay-studio:readTranscript` channel the RESULT.md assumed is "reused" doesn't exist either** (grep=0 in main.ts).

**Correct architecture (verified, minimal):**
- **Boundary = direct file I/O.** The overlay studio writes transcript JSON + caption JSON + cut-plan JSON + scene-plan JSON to the project dir (or a shared data dir) as real files. The Content Engine reads them from disk when its handlers are eventually wired. No fake middleware, no fake IPC reuse.
- **The ONE real IPC gap that exists on this branch:** `overlay-studio:readTranscript` in main.ts must be added (reads the JSON file from disk and returns `{ ok:true, transcript }`). This is the fix that makes the existing `OverlayStudioPage.tsx:35` call work.
- **The ONE new IPC the RESULT.md proposed** (`overlay-studio:save-caption`) is still valid and is the only genuinely new channel — but it's for caption export to disk, not for middleware.

**Revised IPC roster (what's real vs. what's invented):**

| Channel | Source of truth | Status |
|---|---|---|
| `overlay-studio:transcribe` | main.ts:6065 — real | ✅ exists |
| `overlay-studio:readTranscript` | preload.ts:282 exposes it; **main.ts handler MISSING** | ❌ add handler (fixes JSON import) |
| `overlay-studio:save-caption` | proposed by RESULT.md | NEW (genuine gap — no file-write channel) |
| `dialogOpenFile` | preload (native dialog) | ✅ used in handleImport |
| `content:*` (all of them) | claimed "reused" in RESULT.md | ❌ NOT on this branch (grep=0) — Handoff B deferred |

**Storage for the link (localStorage, try/catch):**
- `deskflow.pipeline.link.session.<sessionId>` = `episodeId`
- `deskflow.pipeline.link.episode.<episodeId>` = `sessionId`
- `deskflow.caption.<sessionId>` = `CaptionTrack` JSON

**File-based handoff contract (replaces the fake middleware):**
1. Overlay Studio writes `<sessionId>-transcript.json`, `<sessionId>-caption.json`, `<sessionId>-cut-plan.json`, `<sessionId>-scene-plan.json` to a known dir (e.g. `userDataPath/overlay-studio/<sessionId>/`).
2. Content Engine (when wired) reads those files by path. Until the engine backends exist, the files are the deliverable — the UI shows "Export to Content Engine" as a file-export action (save dialog), not a fake IPC call.
3. This keeps §0c intact: no AI calls from the app; the handoff is files on disk.

---

## 3. Data flow (corrected)

```
CONTENT ENGINE (amber #f5c518) — NOT YET WIRED ON THIS BRANCH
  [ContentEngineWorkspace.tsx exists; content:* handlers do NOT exist in main.ts]
  → Handoff B deferred until content:* handlers are written

OVERLAY STUDIO (pink #ec4899) — WIRED
  dialogOpenFile (native) → real path
  overlay-studio:transcribe (faster-whisper) → transcript {segments:[{start,end,text,id}]}
  → add handler: overlay-studio:readTranscript (reads JSON file → {ok, transcript})
  → CaptionTrack (DETERMINISTIC fn buildCaptionFromTranscript, no AI)
  → VisualEvidenceView (existing)
  → Cut Plan / Scene Plan (ManualBridgeStageCard — copy→web AI→paste→validate via overlayParser)
  → Preview (caption modes) → Export files to disk
  → overlay-studio:save-caption (NEW IPC: save caption .json/.srt next to video)

FILE BOUNDARY (the real handoff):
  overlay-studio/<sessionId>/<sessionId>-transcript.json
  overlay-studio/<sessionId>/<sessionId>-caption.json
  overlay-studio/<sessionId>/<sessionId>-cut-plan.json
  overlay-studio/<sessionId>/<sessionId>-scene-plan.json
  → Content Engine reads these when its handlers are eventually wired.
```

**Order answer (the user's question):** Content Engine FIRST (plan/script) → film outside → Overlay Studio AFTER (transcript→captions→cut→scene→export) → results back to Engine as files on disk. On this branch, the "back to Engine" step is a file-export action until content:* handlers exist.

---

## 4. Corrected caption generation

**Trigger (unchanged):** automatic, deterministic, NO AI when `session.transcript` arrives. `buildCaptionFromTranscript(transcript, seoPhrases?)` in `src/lib/captionBuilder.ts`:
- Merge segments into lines ≤ **14 words** (caption word limit from MEMORY.md:192).
- Timing = first/last merged segment `[start, end]`.
- `highlight` = intersection with SEO phrases if linked, else longest content word.

**Transcript shape (verified from main.ts:6086-6091 transcribe output):**
```ts
transcript = {
  video_id: string;
  duration: number;
  segments: Array<{ id: number; start: number; end: number; text: string }>;
}
```

**Caption types (renderer-only):**
```ts
interface CaptionLine { id: string; start: number; end: number; text: string; highlight?: string[]; }
interface CaptionTrack { sessionId: string; source: 'transcript' | 'bridge_styled'; lines: CaptionLine[]; createdAt: string; }
```

**Optional enhancement (§0c-compliant):** `PROMPT_CAPTION_STYLE` in `overlayPrompts.ts` (JSON-only like the existing 3). ManualBridgeStageCard variant: copy prompt → web AI → paste `{lines:[{id, highlight[]}]}` → validate (ids exist, highlights substrings, text/word-count immutable) → repair → merge. No AI call from the app.

**Components:**
- `CaptionStudioPanel.tsx` — editor list (inline edit re-validates ≤14 words), source chip, Save .srt/.json → new IPC.
- `CaptionPreviewCanvas.tsx` — reuses 9:16 canvas; 3-mode toggle: overlay-on-video / captcha-like / internal-app. States: empty/loading/error/populated.

**Export via new IPC:**
```
overlay-studio:save-caption { sessionId, caption: CaptionTrack, format: 'json' | 'srt' }
→ main: dialog.showSaveDialog → fs.writeFile next to video
→ { ok: true, path } | { ok: false, error }
```
Preload: `overlayStudioSaveCaption`. d.ts: matching declaration.

---

## 5. Corrected UI components (grounded in real MCP source)

All UI uses real shadcn component source pulled from the MCP server (files cached under `agent/`). Anti-slop re-skin to DeskFlow tokens applied.

### tokens (verified in project source)
```
Background: #0a0a0f
Surface/Card: bg-[rgba(24,24,27,0.60)] + backdrop-blur-xl   (overlay-studio/studio.css + OverlayStudioPage.tsx)
Border: border-white/[0.06]
Radius: rounded-xl max
Padding: p-5
Accent Engine: #f5c518 (amber)
Accent Studio: #ec4899 (pink)
Accent Presentations: #10b981 (emerald)
Text primary: zinc-100; body: zinc-300; caption: zinc-500 (10px uppercase tracking-wide)
Score bar: rose <0.6 | amber ≤0.8 | emerald >0.8
Focus ring: focus:border-[#f5c518]/50
Fonts: Geist + JetBrains Mono
Icons: lucide-react ^0.577.0 (all by name)
```

### components used (real MCP source, cached)
- **Card** (shadcn card) — solid variant, `data-slot="card"`, `rounded-xl border bg-card py-6 shadow-sm`. Re-skin: `bg-[rgba(24,24,27,0.60)] border-white/[0.06] backdrop-blur-xl`.
- **Button** (shadcn button) — solid/ghost/link variants. Use `AmberButton` (bg-[#f5c518] text-[#0a0a0f]) for engine actions; `GhostButton` (pink) for studio back-actions.
- **Dialog** (shadcn dialog) — for ManualBridgeStageCard paste-back + caption save dialog.
- **Tabs** (shadcn tabs) — for CaptionPreviewCanvas mode toggle + caption editor sections.
- **Textarea** (shadcn textarea) — for ManualBridgeStageCard paste area.
- **Checkbox** (shadcn checkbox) — for PipelineRail stage selection.

### new components (design intent, not yet implemented)
- `PipelineRail.tsx` — horizontal stage strip ABOVE the mode toggle in `StudioPageInner` (OverlayStudioPage.tsx:100). Persists across mode switches. Props: `{ episodeId?, sessionId?, onJump(stage) }`. 12 stages (Plan→Script→Film→Import→Transcript→Captions→Visual Evidence→Cut Plan→Scene Plan→Preview/Export→Evaluate→Learn). Stage chip colors: done emerald-400 / current = mode accent pulse / waiting-bridge violet-400 / locked zinc-600 + Lock icon.
- `ManualBridgeStageCard.tsx` — replaces bare "Open Manual Bridge" for cut/scene. WHY-empty text (RHEO handoff contract, not broken), 3-step flow (Copy prompt → web AI hint → TextArea + Validate & Import via overlayParser validate+repair). States: empty (violet dashed) / loading (spinner) / error (rose + repair hint) / populated (green check + plan summary). Uses `validateCutPlan`/`validateSceneDSL`/`generateRepairPrompt` from `overlayParser.ts` (all real, verified on disk).
- `CaptionStudioPanel.tsx` — editor list + source chip + Save buttons → new IPC.
- `CaptionPreviewCanvas.tsx` — 9:16 canvas + 3-mode tabs (overlay / captcha / internal). 4 states.
- `ProcedureGuide.tsx` — collapsible card at top of PipelineRail, `<BookOpen> How the two studios work together`, 6 plain steps.

### icon inventory (lucide-react ^0.577.0, all by name)
```
Clapperboard  Send  Lock  Check  CheckCircle2  Video  Image
BookOpen  BookMarked  Eye  ChevronRight  ChevronLeft  Link
Clipboard  X  Loader  AlertCircle  ArrowRight  ArrowLeft  Play
StickyNote  PenSquare  PenLine  Scissors  Layers  Sparkles  Presentation
```
Top picks for this feature: Clapperboard (studio), Send (handoff B), Lock (locked stage), Check/CheckCircle2 (done stage), ChevronRight/Left (rail nav), Link (handoff A/B), Clipboard (copy prompt), Video/Image (media), BookOpen/BookMarked (procedure guide), Eye (preview), Sparkles (studio identity — already used in OverlayStudioPage.tsx:102).

---

## 6. Manual Bridge clarity (verified pipeline)

The Manual Bridge flow already exists at the module level:
- `overlayParser.ts` (157 lines): `extractJson` → `validateCutPlan(data, transcript)` / `validateSceneDSL(data, transcript?)` → `generateRepairPrompt(failedOutput, errors)` → `allPassed`/`passedCount`.
- `StudioPageInner` handles import → transcribe → session creation with real path.
- The RESULT.md's "bare Open Manual Bridge button" complaint is legitimate — the current `StudioShell` is where the bridge lives, and it's not surfaced as a clear stage card.

**Fix:** `ManualBridgeStageCard` renders the bridge as a first-class stage with the WHY-empty explanation + 3-step flow + visible validate/repair results. Uses the real `overlayParser` functions (no new validation logic needed).

---

## 7. Implementation checklist (corrected priority)

| # | Task | Files | New IPC? | Notes |
|---|------|-------|----------|-------|
| 1 | Add `overlay-studio:readTranscript` handler to main.ts | main.ts | no (adds missing handler) | REAL FIX — unblocks JSON transcript import. Reads file from disk (real path), returns `{ok, transcript}`. Reuses `dialogOpenFile` path pattern. |
| 2 | Types + links + `PipelineRail` + mode-jump wiring | studioTypes.ts (extend), OverlayStudioPage.tsx, NEW PipelineRail.tsx | no | localStorage link map. PipelineRail above the mode toggle. |
| 3 | `captionBuilder.ts` + `CaptionStudioPanel` + `CaptionPreviewCanvas` | NEW ×3, StudioShell.tsx | no | buildCaptionFromTranscript (deterministic, ≤14 words). |
| 4 | `overlay-studio:save-caption` + preload + d.ts | main.ts, preload.ts, deskflow-api.d.ts | **YES (only one new)** | real file-write to disk via save dialog. |
| 5 | `ManualBridgeStageCard` replacing bare bridge | NEW + Cut/Scene panes | no | uses real overlayParser validate+repair. |
| 6 | Handoff A/B buttons + file-based boundary | EpisodesView.tsx, StudioShell.tsx | no | Handoff B deferred (content:* handlers not on this branch). |
| 7 | `ProcedureGuide` + 4-state pass on all new components | NEW ProcedureGuide.tsx | no | 6 plain steps. |

**NOT changing:** `overlay-studio:transcribe` (already in main.ts), faster-whisper async spawn, StudioShell 4-pane layout, VisualEvidenceView, overlayParser/vision modules, Presentations mode, provider chain. **No git checkout/restore/reset/stash/clean — physical backups only.**

---

## 8. Outstanding requests/problems checklist (priority — corrected)

1. **Add `overlay-studio:readTranscript` handler to main.ts** — the single missing backend that breaks JSON transcript import. (Direct fix, not a design question.)
2. **Rebuild the running bundle** — "File not found" + "not responding" fixes exist in source; rebuild main + renderer.
3. **Presentations TDZ crash** — "Cannot access 'slides' before initialization" (declaration order).
4. **Window-state guard** — "[DeskFlow] Failed to load window state … not valid JSON".
5. **"Unable to extract content…"** — presentations extractor error path.
6. **PipelineRail + caption generation + ManualBridgeStageCard + ProcedureGuide** — the RESULT.md design pieces (NEW components, §4-§6 above).
7. **ScriptProofCard accept/reject/regenerate + rejected visual** (CONTENT_ENGINE_AUDIT #4, CRITICAL — but content-engine exists on this branch; verify EpisodesView accessibility).
8. **Episode script tab Phase-2 composition** — HookStackDisplay / CuriosityGapBridge / KeywordSEOPanel / CaptionDisplay.
9. **Brainstorm summary + confirm/reclassify + routing.**
10. **`retention_hook_writer` + `retention_evidence_scorer` prompts** (CHECKLIST §E).
11. **Handoff B (send-to-engine)** — DEFERRED until `content:*` handlers are wired in main.ts (none exist on this branch; grep=0).

---

**Anti-slop confirmation:** tokens from real project source (#0a0a0f, #f5c518/#ec4899/#10b981, rgba(24,24,27,0.60) glass, rounded-xl max, p-5, Geist + JetBrains Mono, lucide-react by name) ✔ dark-only ✔ fits `FeatureStudioPage/StudioPageInner/StudioProvider` ✔ §0c handoff respected (deterministic captions + file-based boundary; no direct AI calls) ✔ 4 states on every new component ✔ MCP-sourced real component source (card/button/dialog/tabs/textarea/checkbox) ✔ every choice tied to a purpose ✔ caption=14 enforced ✔.

**What was wrong in the original RESULT.md and is now corrected:**
- The "reuse content:* IPC" middleware story → replaced with direct file I/O boundary (those channels grep=0 on this branch).
- The `overlay-studio:readTranscript` "reused" channel → flagged as MISSING; added as item #1 (the real fix).
- Handoff B presented as already-wired → corrected to DEFERRED until content:* handlers exist.
- UI components presented as a design wishlist without source grounding → now tied to real MCP-sourced shadcn source + real lucide icons + real css tokens.

