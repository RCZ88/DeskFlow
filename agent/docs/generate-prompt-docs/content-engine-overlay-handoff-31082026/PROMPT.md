# PROMPT.md — Content Engine ↔ Overlay Studio Handoff + Motion-Lab Asset & Caption Rendering

> Generated via the `generate-prompt` skill (architecture/engineering type).
> Sources of truth (read FIRST, in order):
>   1. `CONTEXT_BUNDLE.md`  — Content Engine ↔ Overlay Studio code/IPC/DB/data shapes
>   2. `MOTION_ASSET_CONTEXT.md` — motion-lab HTML primitives + Playwright recorder pipeline
>   3. `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\agent\docs\cc_full_spec_fix.md`
>      — MASTERSYSTEMIMPLEMENTATION.md (master spec: Overlay Studio pipeline, suggestion-based,
>        non-destructive, every feature visible, every button does something, Manual Bridge core)
> Target AI: act as Lead Designer + Engineer. Deliver ONE comprehensive solution. No option menus.

---

## Raw Request (verbatim — do not reinterpret)

> "i need you to go to the content creation page and refer to the subpages there mainly the
> connection between the overlay with like the second page on how those should be integrated
> properly"
>
> "i also want a feature where it's able to generate the caption stuff too based on the transcript
> that i'm able to add to my video either in a form of a video that i can put on my caption as
> like an overlay or something like that or internally on the application."
>
> "refer to this file [MASTERSYSTEMIMPLEMENTATION.md]. i just had those summarized from a session
> that summarized a copy of like an existing system. look at how the motion lab thing is able to
> generate those video and like everything else that might help generate those assets."
>
> "if you still need to ask questions, just generate the prompt immediately with the skill without asking"

(From the referenced prior session — the framing complaint:)
> "It's so unconnected to one another. The content engine with overlays who do very much disconnect
> it and there's no click connection … How are you going to collaborate with one another?"

---

## Context

DeskFlow (RHEO) is an Electron + React + Python, local-first, AI-assisted creative app. Two
feature trees should be one pipeline but are disconnected:

- **Content Engine** (`src/features/content-engine/`) — "content creation page." Subpages:
  Ideas / Episodes / Series / Themes / Analytics / Lessons / Frameworks / Process / Playbook.
  Drilling Episodes → an episode opens `EpisodeDetail` (phase pipeline GREEN LIGHT → BLUEPRINT →
  CAPTURE → ASSEMBLE → LEARN; tabs Script / Pipeline / SEO / Analytics / **Assets** / Metrics).
  The **ASSEMBLE** phase (`AssembleView.tsx`) shows the cut list + overlay plan and has a
  "Send to Overlay Studio" button that is currently a **stub** (toasts only, calls dead
  `onPhaseChange('studio')`, passes zero data).
- **Overlay Studio** (`src/features/overlay-studio/`) — separate mode in `OverlayStudioPage`
  (3-mode toggle: Overlay Studio / Content Engine / Presentations). Pipeline: Source → Transcript
  → Visual Evidence → Cut Plan → Scene Plan → Visualizer → Export. Stores lightweight sessions
  referencing local video paths; suggestion-based, never destructive (master spec §2.3).

The master spec (cc_full_spec_fix.md) mandates: every feature visible, every button does
something, Manual Bridge is the reliable core, suggestion-based language (Analyze / Suggest /
Review / Approve / Reject / Preview / Export — never "cut source video").

**Asset generation reference — `motion-lab/`** (MOTION_ASSET_CONTEXT.md): 6 self-contained HTML
motion primitives (flow field, scroll scrub, icon draw, bezier wake, ridgelines, console cycle)
recorded to 1280×800 `.webm` by `scripts/record-lab.mjs` (Playwright headless `recordVideo`).
This is the repo's existing, working pattern for turning animated HTML into video assets.

The user wants the joined pipeline to actually **generate video assets**: content/overlays +
transcript captions rendered as a `.webm` overlay video (to "put on my caption") and usable
inside the app, with motion-lab primitives available as animated background/accent layers.

---

## The Mandate

Design a comprehensive frontend + backend + Python/Playwright integration that connects:

1. **Content Engine ASSEMBLE → Overlay Studio as a real linked session** (cut list + overlay
   plan + transcript captions handed off with data, not a stub).
2. **Transcript → caption track** generated and surfaced in the episode (Script tab `caption`
   field) AND in the linked Overlay Studio session (`captionTrack`), renderable as a caption
   overlay on the 9:16 canvas / exported as `.srt`.
3. **Motion-lab primitives as overlay/visual asset layers** mountable on the Overlay Studio
   Visualizer behind the text overlays + captions.
4. **A real Export/Render** that reuses the `record-lab.mjs` Playwright pattern to compose the
   9:16 stage (motion layer + overlays + timed caption track) and record it to `.webm` — the
   actual overlay video the user can use. Triggered from the UI, not a stub.
5. **Episode Assets tab** (currently "Assets coming soon" empty state) becomes the library of
   generated motion assets + caption `.srt` + exported `.webm` per episode.

Do NOT rebuild the Overlay Studio player or the motion primitives. Reuse: the existing 3-mode
toggle, the existing `StudioSession` shape (extend via the already-present optional `episodeId`,
`captionTrack`, artifact path fields), and `scripts/record-lab.mjs`'s recording approach.

---

## Requirement Checklist

### A. Content Engine → Overlay Studio handoff (real, with data)
- **A1.** Replace `AssembleView.sendToOverlay()` stub with an async flow that fetches in parallel
  `content:edit:cutlist` (WITH the resolved evaluated/selected take's `takeId` — current call
  omits it, a latent bug), `content:edit:overlay-plan`, and the new `content:edit:caption`
  (see B1). Emit a handoff payload { episodeId, episodeTitle, niche, themeId, cutList,
  overlayPlan, captionTrack, transcriptSegments } into Overlay Studio.
- **A2.** Add reducer action `LINK_EPISODE` in `studioReducer.ts` that creates/updates a
  `StudioSession` with `episodeId`, `transcript`, `cutPlan`, `captionTrack`, `status:'linked'`
  (and `SET_CAPTION_TRACK` to set just the track). Reduce must persist to localStorage like
  normal imports.
- **A3.** Cross-tree bridge: the handoff originates in Content Engine but must dispatch into
  Overlay Studio's `StudioProvider`. Choose a robust mechanism (module-level emitter the
  `OverlayStudioPage` subscribes to, OR lift a `pendingHandoff` via context) and justify it. On
  receipt, switch `mode` to `'studio'` and dispatch `LINK_EPISODE`. Do NOT rely on the dead
  `onPhaseChange('studio')`.
- **A4.** Bidirectional visibility: Overlay Studio shows a "Linked to episode: <title>" chip
  (click → switch to `'engine'` mode + `requestOpenEpisode(episodeId)`); the episode detail shows
  its linked overlay session id. Add `content_episodes.overlay_session_id` + a
  `content:episode:link-overlay` handler (idempotent ALTER TABLE, bump `PRAGMA user_version`).

### B. Caption-from-transcript
- **B1.** New IPC `content:edit:caption` (mirror `content:edit:overlay-plan` in
  `src/services/contentEngine/index.ts` lines 1914–1933): takes `{ episodeId }`, reads the
  evaluated/selected take's kept segments, calls `buildCaptionFromTranscript(transcript,
  sessionId, seoPhrases)` from `src/lib/captionBuilder.ts`, returns `{ ok, captionTrack }`.
  Persist to `content_episodes.caption_track` (JSON). `seoPhrases` from episode SEO if present.
- **B2.** Episode Script tab: render a **Caption track** card where `caption`/`pinned_comment`
  already display (EpisodesView lines 632–649) — list `CaptionLine[]` (start–end, text,
  highlighted phrase), inline-editable, `repairCaptionLine` enforcing 14-word limit, with
  "Export .srt" / "Copy as overlay text" actions.
- **B3.** Overlay Studio caption overlay: render `captionTrack.lines` as a bottom-center caption
  on the 9:16 preview, timed to start/end, toggleable via a "Captions" inspector switch, respecting
  the bottom 400px safe zone.

### C. Motion-lab asset integration
- **C1.** Register the 6 motion-lab primitives as a browsable **Motion Asset library** in the
  Overlay Studio inspector (and surfaced in the episode Assets tab). Each entry: preview thumbnail
  (use the existing `motion-lab/videos/*.webm`), name, and the tunable params from
  MOTION_ASSET_CONTEXT.md README (so a user can pick a variant).
- **C2.** Allow mounting a chosen primitive as a **canvas layer** on the Visualizer (behind text
  overlays + captions). The primitive HTML is loaded into a sandboxed `<iframe>`/layer at 9:16;
  its CDN deps (`motion@11.18.2`, `simplex-noise@4.0.3`) must be available offline or bundled.
  Specify how (vendor the deps, or ship motion-lab as app assets).
- **C3.** Expose the recorder as a main-process helper generalized from `scripts/record-lab.mjs`:
  a new IPC `studio:render:export` that (a) composes a headless 9:16 page = motion layer + overlay
  plan positions + timed caption track, (b) drives any interactions, (c) `recordVideo` to `.webm`,
  (d) returns the path. Must be real, not a stub. Address Playwright availability
  (`@playwright/test` / `playwright` in package.json?) and headless chromium install.
- **C4.** Episode Assets tab: list generated motion `.webm`s, caption `.srt`, and exported overlay
  `.webm`, each with open/export/copy actions. Replace the empty-state stub (EpisodesView 800–806).

### D. Master-spec compliance (non-negotiable)
- **D1.** Every button does something; no silent no-ops (§2.5). The handoff, Export, and Asset
  actions must all have real handlers + clear empty/loading/error states.
- **D2.** Suggestion-based language only (§2.3): "Preview / Export / Render suggestion", never
  "burn into source." Rendered `.webm` is a NEW file, source video untouched.
- **D3.** Manual Bridge remains the reliable core (§2.6): if the Python/Playwright render is
  unavailable, the UI must explain why and offer the closest action (e.g. copy the 9:16 HTML
  stage to clipboard / open in browser for manual录制).
- **D4.** Every pipeline stage has a visible entry point, status, next step, and empty/loading/
  error state (§2.4).

### E. Constraints
- Reuse existing tokens: amber `#f5c518` (Content Engine), pink `#ec4899` (Overlay Studio), cyan
  `#00d4ff`, violet `#8b5cf6`; glass `bg-[rgba(24,24,27,0.60)] backdrop-blur-xl`; Geist + JetBrains
  Mono; `AmberButton/Card/GhostButton/Chip/toast` from `src/features/content-engine/components/ui`.
- All new IPC handlers return `{ ok, ... } | { ok:false, error }`.
- Do NOT remove existing UI without explicit confirmation (skill Rule 3). The "Send to Overlay
  Studio" button stays; it gains real behavior.

---

## Backend logic MUST be verified (skill Rule 5)
- `content:edit:cutlist` EXISTS (needs `takeId` passed). `content:edit:overlay-plan` EXISTS.
- `content:edit:caption`, `content:episode:link-overlay`, `studio:render:export` → DO NOT EXIST;
  specify full implementation (preload bridge + `ipcMain.handle` + DB migration + Python/Playwright
  helper). Mark with "⚠️ BACKEND NOT YET PRESENT — implement as specified."
- `scripts/record-lab.mjs` + `motion-lab/videos/*.webm` EXIST (proven asset pipeline).
- Verify Playwright is installed (`package.json` / `node_modules/playwright`); if absent, the spec
  must state the install step or fall back to the Manual Bridge path (D3).

---

## Output format
Return Markdown design spec (`RESULT.md` in this folder) containing:
1. **Data-flow diagram**: Content Engine ASSEMBLE → handoff payload → Overlay Studio LINK_EPISODE;
   caption sub-flow (transcribe take → buildCaptionFromTranscript → episode.caption + session.
   captionTrack); motion sub-flow (primitive → Visualizer layer → studio:render:export → .webm).
2. **Backend section**: exact new IPC handlers (preload bridge + `ipcMain.handle` + DB migration
   with idempotent ALTER + `PRAGMA user_version` bump) + the generalized Playwright render helper
   (lifted from `record-lab.mjs`), with offline-dep handling for motion-lab CDN deps.
3. **State section**: `LINK_EPISODE` / `SET_CAPTION_TRACK` reducer actions + the chosen cross-tree
   bridge mechanism with reasoning.
4. **UI section**: JSX-level specs for A1–A4, B2–B3, C1–C4, D1–D4 with exact tokens/classes +
   loading/empty/error states.
5. **Edge cases**: no kept segments, take not transcribed, handoff while a studio session is open,
   re-handoff idempotency (`overlay_session_id`), Playwright missing (D3 fallback), CDN offline.
6. **Coverage checklist** mapping A1–A4, B1–B3, C1–C4, D1–D4, E to where each is addressed.

When done, save as `RESULT.md`. The receiving engineer consumes it raw (skill Rule 2) and adapts
to the real codebase, running `npm run build` after each change. Do NOT edit RESULT.md.
