# PROMPT.md — Design the Overlay Studio ↔ Content Engine Connection + Caption Generation Feature

**Target AI:** Claude (or ChatGPT) — Lead Designer + Lead Engineer
**Date:** 2026-08-29
**Source repo:** C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker
**Context bundle:** Read `CONTEXT_BUNDLE.md` FIRST — it is the source of truth for code structure, IPC, state, and what's actually built vs. missing.

---

## Raw User Request (verbatim)

> make sure that ur following the SYSTEMPROMPT AND everything in the opencode.json sintructions
>
> MAKE THE CHEKCLSIT OF THE REQUESTS AND PROBLEMS TO DO
>
> WHERESH TEP ORPER UI FOR THOSE
>
> WHY IS THE CUT PLAN and SCENE PLAN ALL HAVE EPMTY AND reLIES ON THAT MANUAL BRIDGE OPEN MANUAL BRIDE BUTTON AND SOME TET ONLY??
>
> theres a rpoblem where importing a video for the transcript makes teh app not responding
>
> OverlayStudioPage.tsx:57 [OverlayStudio] Auto-transcription failed: File not found: VID_20260829_155452.mp4 the transcription feature of the video doesnt work. fix it
>
> Cannot access 'slides' before initialization
>
> ---
> Unable to extract content...
>
> [DeskFlow] Failed to load window state: SyntaxError: Unexpected token '', ""... is not valid JSON
>
> yes do everything u need that doesnt destroy the app like gitcheckout would. NEEVER USE GIT CHECKOUT
>
> The fact of the matter, the matter, is that it is so  Unconnected to one another. It's a disconnected right the content engine  With overlays who do very much disconnect it and there's no click connection  And there's no clear you are on those and how is it the procedure of it?  Is it that you're going to do the overlays who do you prefer before the content engine?  How are you going to collaborate with one another and where they're overly if you can  make sure that we've been discussing previously, which now it's not here anymore  Right where are those what is this visual evidence thing and I'll ask it there and and  Where's the part where it's able to generate the overlays right it's not necessarily print the presentation  It's not necessarily supposed to replace the visual overlay. I need those to be put back and what I need you to do is  Use the generic prompt skills to you know  Give the context on how the state of the application is because it's very very separate from everything everything is like  on the  Early studio is like separated from the content engine is very much messy  So those are the things that needs to be adjusted means we discuss and then we should use the generic prompt skill to do to fix it
>
> i also want a feature where it s able to generate hte caption tstuff too based onthe transcirpt that iim able to  add to my video either in a ofrm of a video that i can put on my capctu as like an overlay or something like that or internally onthe applcation. GENERATE PROMPT ALONGSIDE ALL OF THOSE OTHER REQUESTS

These are the user's actual words. Some are from earlier sessions (the crash logs, the "File not found" complaint, the "NEVER USE GIT CHECKOUT" constraint). Treat ALL of them as the scope of what the user wants fixed. Do not discard any.

---

## The disconnect — what's actually happening

**The app has 3 "Feature Studio" modes under ONE page shell** (`src/features/overlay-studio/OverlayStudioPage.tsx`) — but they are just tab-switched views with NO pipeline, NO data handoff, and NO clickable connection:

- **Overlay Studio** (`/studio`, mode=`'studio'`) — video overlay suggestion studio. Live in `StudioShell`, with transcript import → auto-transcribe (faster-whisper, async spawn, already fixed) → Visual Evidence → Cut Plan → Scene Plan → Preview → Export.
- **Content Engine** (mode=`'engine'`) — full content creation pipeline. 86 `content:*` IPC handlers, 5 UI phases, 8 tabs (Brainstorm / Ideas / Episodes / Themes / Analytics / Lessons / Frameworks / Process).
- **Presentations** (mode=`'presentation'`) — interactive HTML slide generator.

**The tab toggle (lines 104-108) is a view switch only:**
```tsx
<button onClick={() => setMode('studio')} ...>Overlay Studio</button>
<button onClick={() => setMode('engine')} ...>Content Engine</button>
<button onClick={() => setMode('presentation')} ...><Presentation size={10} /> Presentations</button>
```
Switching tabs just swaps the child component. There is:
- **no click-through** between the two (no "send this cut plan to the engine" or "open this episode in Overlay Studio")
- **no data handoff** (a transcript processed in studio mode doesn't flow to Content Engine's `content:takes:*` / `content:edit:overlay-plan`)
- **no visual feedback** showing which pipeline stage you're in, or how stages connect

**Cut Plan / Scene Plan render EMPTY in the UI** because the overlay pipeline is **Manual Bridge by design** (per the RHEO design principle in `AGENTS.md` — AI writes a plan → passes it to an EXTERNAL web AI → human pastes the JSON back → app validates + repairs). The app does NOT call the AI directly. But the Manual Bridge is surfaced only as a single "Open Manual Bridge" button + text — there's no clear visual flow showing why the plan is empty, where it's waiting, or what the user should do to populate it.

**The transcription "File not found" was a real bug** — the renderer's File object doesn't expose `.path` in a secure build, so `file.path || file.name` sent a bare filename → backend couldn't find it. This is ALREADY FIXED in source: `OverlayStudioPage.tsx` now uses the NATIVE file dialog (`dialogOpenFile`) which returns a real absolute path, and `overlay-studio:readTranscript` + `overlay-studio:transcribe` IPCs accept `{ filePath }`. The "not responding" was ALSO a real bug — `spawnSync` blocked main process 120s — now replaced by async `spawn`. Both are source-fixed but the running app may still be on a stale bundle.

**There is NO caption generation feature anywhere.** The transcript exists (after import/transcribe), but there's no step that generates caption text from it, and no way to add that caption to the video as an overlay, as a captcha-like overlay, or as an internal app display.

**Content Engine's Episode detail (script tab) is missing Phase 2 elements** — `HookStackDisplay`, `CuriosityGapBridge`, `KeywordSEOPanel`, `CaptionDisplay` are all NOT IMPLEMENTED (3 of 26 components missing per `CONTENT_ENGINE_AUDIT.md`; 10 UI gaps in `CONTENT_ENGINE_CHECKLIST.md`).

The user wants the app to FEEL connected — one coherent pipeline, not two separate things next to each other.

---

## Problem Statement

The app has two video-content subsystems (Overlay Studio + Content Engine) sitting in the same page shell but completely unconnected — no clickable pipeline, no data handoff, no caption generation, and the Cut Plan / Scene Plan are empty because they rely on a Manual Bridge that's surfaced only as a button + text. The user doesn't understand the procedure: which comes first, how do they collaborate, where's the visual evidence, where's the caption generation, why are plans empty.

## Design Mandate

Design a **comprehensive, high-fidelity solution** that makes the Overlay Studio ↔ Content Engine connection feel like ONE coherent pipeline — with clickable navigation between them, visual stage feedback, a caption generation feature from transcript, and a clear procedure for how the two subsystems collaborate. The solution must be grounded in the EXISTING code and IPC contracts (do NOT invent new backend; extend what's there). Design both the data flow AND the visual spec.

The target AI must design:

1. **The connection layer** — how a transcript/overlay plan/cut plan flows between the two IPC namespaces (`overlay-studio:*` ↔ `content:*`), what new IPC channels are needed (if any), how the data moves. Be specific about which existing handlers are reused vs. extended.
2. **Click-through navigation** — clickable stages that let the user move between Overlay Studio and Content Engine in a meaningful pipeline order. Address: do overlays come before content engine, or interleave? How does the user "send" something from one to the other? What's the UI for that?
3. **Visual stage feedback** — a clear pipeline visualization showing where the user is in the flow, what stage they're on, what comes next, what's waiting (e.g., why Cut Plan / Scene Plan are empty, where the Manual Bridge step is, how to progress past it)
4. **Caption generation from transcript** — a feature that generates caption text from the transcript (overlay-ready text), and lets the user apply it as: (a) a video overlay on the preview, (b) a captcha-like overlay, or (c) an internal app display. Include: what triggers caption generation, what the output looks like, how it's stored, how it connects to the existing transcript + overlay data model
5. **Caption display UI** — where the caption shows in the UI, how it's edited/reviewed/applied, what states it has (empty/loading/generated/overlay-preview/internal-display)
6. **Cut Plan / Scene Plan empty-state clarity** — redesign the Manual Bridge surface so it's clear WHY the plan is empty, WHERE it's waiting, and WHAT the user does to populate it (whether by automating the AI step or by giving the Manual Bridge a clear visual flow). Per the RHEO design principle, the app does NOT call the AI directly — the user operates the external AI. The design must respect this: do NOT build an auto-generate path that calls an AI directly. Instead, surface the Manual Bridge clearly OR propose a safe, compliant automation path that stays within the handoff contract.
7. **Procedure clarity** — the UI should make the "procedure" obvious: the user should understand at a glance what the pipeline is, which order the stages run in, what each stage does, and how the two subsystems collaborate. This is a UX writing + visual-info-architecture task.

## Mandatory Constraints

- **Respect AGENTS.md §0c (RHEO design principle):** The Overlay Studio is a handoff pipeline. Do NOT build an auto-generate AI path that calls an AI directly from the app. Manual Bridge mode: copy prompt → paste into web AI → paste back → app validates + repairs. If you propose automating any step, show exactly how it stays within the handoff contract.
- **Zero new backend where existing IPC suffices** — `overlay-studio:transcribe`, `overlay-studio:readTranscript`, `dialogOpenFile`, `content:takes:transcribe`, `content:takes:save-segments`, `content:edit:overlay-plan`, `content:edit:cutlist` all already exist. Reuse them. Only add new IPC if there's a genuine gap.
- **No git checkout / restore / reset / stash / clean** — zero-destruction. Physical backups only.
- **Design tokens** — use the binding tokens from `CONTEXT_BUNDLE.md` §5 (background #0a0a0f, Content Engine accent #f5c518 amber, Overlay Studio accent #ec4899 pink, Presentations accent #10b981 emerald, Geist + JetBrains Mono, lucide-react only, rounded-xl max, p-5). Overlay prompt word limits: hook=8, body=12, caption=14, bullet=10, keyword=6.
- **Addresses ALL the user's raw requests** — not just the connection. Include: caption generation, click connection, procedure clarity, why cut/scene plans are empty, visual evidence UI, where overlays are generated, and a checklist of remaining requests/problems.

## Deliverable Format

Return a `RESULT.md` with:
1. **Data flow** — how transcript → caption → overlay-plan → cut plan flows between the two subsystems. IPC channels, state transfers, storage.
2. **Click-through navigation design** — the pipeline stages, the order, the clickable UI, what each transition does.
3. **Visual stage feedback** — pipeline visualization, stage indicators, empty-state clarity for Cut Plan / Scene Plan.
4. **Caption generation + display** — trigger, output, storage, 3 display modes (overlay-on-video / captcha-like / internal-app), UI mockups described in words + component structure.
5. **Manual Bridge clarity** — how the empty plan + Manual Bridge step is surfaced so the user understands the procedure.
6. **Procedure clarity** — the full "how it works" walkthrough the user can read in the UI.
7. **Implementation checklist** — a prioritized list of what to build first, what IPC to add (if any), what existing code to extend, what's NOT changing.
8. **Outstanding requests/problems checklist** — a concrete checklist of remaining items, in priority order, that the user can track.

Include actual component names, prop shapes, IPC channel names, state transitions, and storage keys. Be specific. The user needs to be able to read this and know exactly what to build.

---

## Anti-Slop Checklist (from generate-prompt skill)

Before returning the RESULT.md, confirm:
- [ ] Re-skinned to DeskFlow tokens (colors → #0a0a0f bg, #f5c518 engine accent, #ec4899 overlay accent, #10b981 presentation accent)
- [ ] Max rounded-xl, p-5 padding
- [ ] Dark mode only
- [ ] Geist + JetBrains Mono fonts
- [ ] Glass layer (bg-zinc-900/80 backdrop-blur-xl) for cards
- [ ] Every design choice has a REASON tied to the feature's purpose (not "looks nice")
- [ ] The design fits into the existing page shell (`FeatureStudioPage` / `StudioPageInner` / `StudioProvider`)
- [ ] The Manual Bridge handoff contract is respected (no direct AI calls from app)
- [ ] All 4 states covered where relevant (empty/loading/error/populated)
