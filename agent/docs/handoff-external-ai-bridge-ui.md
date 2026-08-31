# Handoff: Finish the External AI Bridge frontend (skill-mandated UI controls)

You are continuing work on the **External AI Bridge** in the "App Tracker" / DeskFlow
Electron+React+TS app at `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker`.

The bridge lets users fill app form fields from their EXISTING external AI chat
(ChatGPT/Claude). The app generates a format-only JSON-schema prompt, the user pastes
it into their chat, the AI returns JSON, the app parses it into fields. Full spec:
`agent/skills/external-ai-bridge/SKILL.md` (read it first — it is the source of truth).

A unified framework already exists in `src/components/ai-bridge/`:
- `FieldAIButton.tsx` — per-field "AI" button (builds prompt, live preview, send, parse paste-back)
- `BridgeField.tsx` — uniform labeled input + FieldAIButton (Google-form primitive)
- `BridgeForm.tsx` — whole-form schema renderer + live prompt + bulk import
- `LivePromptPreview.tsx` — live prompt viewer, tags dynamic (field-driven) vs static regions
- `parse.ts` — `parseBridgeResponse(raw, fieldKeys)` (DO NOT reimplement parsing)
- `prompt.ts` — `buildFieldPrompt`, `buildFormPrompt`, `INJECTION_BY_CATEGORY`, `getStyleDirective`, `SECTION_COLORS`

Wired into: `SeriesView.tsx` (BridgeForm), `EpisodesView.tsx` (BridgeField),
`QuickAddModal.tsx` (FieldAIButton x2), Learn panels (FieldAIButton), `GoldPage.tsx`,
`ResumeImportPage.tsx`. Build is `node scripts/build.mjs`; typecheck `npx tsc --noEmit -p tsconfig.app.json`.

## What is ALREADY done (do not rebuild)
- Field/form prompts, live preview, paste-back parsing, category-aware injection.
- Style directive INJECTION into the prompt text (prompt.ts appends `Style: <directive>` when a `styleId` is passed). Backend IPC handlers + prompt-format/parsing rules are satisfied.

## Tasks (skill frontend checklist items still missing)

### TASK 1 — Wire a Style Template picker into the bridge
- `styleId` prop already exists on `FieldAIButton` and `BridgeForm` and is threaded into
  `buildFieldPrompt`/`buildFormPrompt` (prompt.ts injects the directive). BUT no caller
  passes `styleId` and there is NO UI to pick one.
- Style data lives in `src/features/content-engine/components/PromptSectionToggle.tsx`:
  `STYLE_TEMPLATES` (ids: punchy, storyteller, data-nerd, cinematic, deep-dive, casual).
  A ready picker exists: `src/features/content-engine/components/TemplateSelector.tsx`
  (props: `selected`, `onChange`, `frameMode`, `onFrameModeChange`).
- Add a compact style picker inside `BridgeForm` (and optionally `FieldAIButton`) that
  holds a local `styleId` state (default `''`) and passes it to the prompt builder.
  Reuse `TemplateSelector` (import from the content-engine path) or a scaled-down inline
  version styled with the app's tokens (amber `#f5c518`, zinc palette, `rounded-lg`,
  `text-[10px]`). Keep it visually consistent with the rest of the bridge.

### TASK 2 — Wire a Frame Mode toggle (strict / flexible)
- `frameMode` is already accepted by both prompt builders (defaults `'strict'`; strict =
  "Every field is mandatory", flexible = "creative variation allowed"). No UI toggle exists
  in the bridge. `SeriesView.tsx` has a local `FRAME_MODES` control (line ~24) that does NOT
  reach `BridgeForm`.
- Add a strict/flexible toggle inside `BridgeForm` (and `FieldAIButton`) bound to local state
  defaulting `'strict'`, passed to the builder. Optionally also accept an external `frameMode`
  prop so `SeriesView` can keep driving it from its existing control (if you do, make the
  external prop the initial state).

### TASK 3 — Add PromptSectionToggle (dynamic sections) to the content-engine bridge
- Skill checklist mandates section checkboxes: retention, visual, sound, hooks, seo, scoring,
  frameworks, lessons, reflection (see `PROMPT_SECTIONS` in `PromptSectionToggle.tsx`).
- The bridge builds prompts CLIENT-SIDE in `prompt.ts` (it does NOT call the backend
  `externalBuild*Prompt`). So add an OPTIONAL `sections?: string[]` param to `buildFieldPrompt`
  and `buildFormPrompt`; when provided, append/omit the corresponding instruction blocks per
  `PROMPT_SECTIONS` semantics (each section = a labeled block of rules). Default = all sections
  on (current behavior) for backward compatibility.
- Render the existing `PromptSectionToggle` component inside `BridgeForm`, but ONLY for the
  `content-engine` category (sections are content-engine specific). Bind its `enabledSections`
  to local state and pass into the builder. Do NOT remove the current client-side prompt
  assembly — extend it.

## Constraints
- Keep using `parse.ts` for all parsing — never inline JSON extraction.
- Match the existing design system: dark, `rounded-lg`, amber `#f5c518` accents, `text-[9px]–[12px]`,
  zinc palette, no heavy shadows.
- The live prompt preview must keep tagging dynamic (field-driven) vs static regions after
  your changes (the `sections` DynamicSectionDef array in BridgeForm.tsx may need new entries
  if you add section blocks).
- Do not change the extension files or the backend for these UI tasks unless you find the
  bridge MUST call the backend to honor sections — if so, note it but prefer the client-side
  approach to stay consistent with the existing framework.

## Verification
1. `npx tsc --noEmit -p tsconfig.app.json` clean (ignore `aiAgentService.test.ts` noise).
2. `node scripts/build.mjs` succeeds.
3. In the Content Creation "New Series" form: confirm a style picker + strict/flexible toggle
   + section checkboxes render, and that changing them visibly changes the live prompt text
   (style directive appears, sections appear/disappear, strict/flexible wording flips).
4. Confirm a field filled by the AI still parses correctly (paste-back path untouched).

## Out of scope (already wired, needs live-browser test, not code work)
The extension correlation auto-capture (background.js forwards `*_INJECT` with
`correlationId`/`expectedKeys`; focusOverlay stashes pending; ai-context-content matches keys
+ echoes; main.ts `/ai-context` → `bridge:response` IPC; preload `onBridgeResponse`;
FieldAIButton/BridgeForm listen). NOTE A RISK: focusOverlay.js runs in the ISOLATED world and
ai-context-content.js in the MAIN world, so `window.__deskflowPending` is NOT shared between
them — the `chrome.storage.session` fallback is the intended bridge. Verify the round-trip in
a real browser (load extension unpacked, run app, send a field to Claude, confirm auto-fill);
fix any world-sharing breakage.
