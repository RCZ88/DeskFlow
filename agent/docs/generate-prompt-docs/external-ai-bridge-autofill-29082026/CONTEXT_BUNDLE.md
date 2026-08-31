# CONTEXT BUNDLE — External AI Bridge: Auto-Capture → Auto-Fill Round-Trip

> Target AI receives this file as its sole source of truth. Do NOT read the rest of the codebase; everything needed is here. Date folder: 29082026.

## Goal
Today, the External AI Bridge (src/components/ai-bridge/*) lets the user build a format-only prompt, send it to ChatGPT/Claude via the browser extension, and **manually** paste the JSON response back to fill a field. We want the **last step to be automatic**: when the AI responds on the chat site, the extension detects it and the matching field in the app auto-fills — no manual paste. This is the ONE piece the implementing agent has NOT verified works. Everything else (build prompt, send via extension, manual parse) already works and must NOT be redesigned.

## Architecture: the existing message protocol (MUST reuse, not replace)

### 1. App → Extension (command)
- App calls `window.deskflowAPI.extensionQueueCommand({ type, ... })`. This is wired in `src/preload.ts` → `ipcRenderer.invoke('extension:queue-command', cmd)`.
- `src/main.ts` handler pushes the command into `pendingExtensionCommands` (read by the extension's 2s poll at `/extension/poll`).
- Extension `background.js` polls `/extension/poll` every 2s. It currently forwards ONLY `CONTENT_ENGINE_INJECT` → `INJECT_PROMPT` to the active tab. **NEW (already coded by implementing agent):** it now also forwards `LEARN_INJECT`, `GOALS_INJECT`, `FINANCE_INJECT`, `RESUME_INJECT`, `GENERAL_INJECT` → `INJECT_PROMPT` (same path).
- `INJECT_PROMPT` handler is in `browser-extension/focusOverlay.js`. It finds the chat input (`textarea[placeholder*="Message"]` etc.), sets `.value` / `.innerText`, dispatches `input`+`change` events, then posts `PROMPT_INJECTED` back to the extension.

### 2. Extension → App (capture)
- `browser-extension/ai-context-content.js` watches the DOM (MutationObserver on `document.body`). On each assistant message it runs `detectContentEngineResponse(messages)`.
- Detection keys off `CE_SIGNATURES` (object mapping promptType → signature strings), e.g. `script: ['script_frames','retention_evidence','frame_number']`, `classify: ['destination','category','routing']`, etc.
- When a signature matches, it does `window.postMessage({ type:'DESKFLOW_CE_RESPONSE', promptType, data, url, timestamp }, '*')`.
- IMPORTANT: `CE_SIGNATURES` currently ONLY contains Content-Engine types (script, gates, synthesize, seo, analytics, lessons, reflection, frameworks, classify). **It does NOT contain learn/goals/finance/resume field signatures.** This is the primary gap for auto-fill outside content-engine.

### 3. App receives the capture
- The implementing agent's `FieldAIButton.tsx` currently listens for `window` message `DESKFLOW_CE_RESPONSE` with `event.data.promptType === promptType` and, on match, drops the data into the paste textarea (manual import still required). This listener exists but is keyed to the field's `promptType` which the field components do NOT currently set to a category value — they send `promptType: 'field-fill'`. So today the auto-detect path is effectively dead for fields.

## Current field component contract (src/components/ai-bridge/*)
- `FieldAIButton.tsx` props: `fieldName, label, value, onUpdate, allFields, category ('content-engine'|'learn'|'goals'|'finance'|'resume'|'general'), context?, styleId?, frameMode?`.
- `BridgeForm.tsx` props: `heading, category, fields: BridgeFieldDef[], values, onChange, onBulkUpdate?, context?`. For whole-form fill it sends `promptType: 'form-fill'`.
- `INJECTION_BY_CATEGORY` in `src/components/ai-bridge/prompt.ts` maps category → inject command type: content-engine→CONTENT_ENGINE_INJECT, learn→LEARN_INJECT, goals→GOALS_INJECT, finance→FINANCE_INJECT, resume→RESUME_INJECT, general→CONTENT_ENGINE_INJECT.
- `parseBridgeResponse(raw, fieldKeys)` in `src/components/ai-bridge/parse.ts` robustly extracts the first JSON object/array, maps onto requested keys, falls back to raw text for single-key prompts. This is the parser the auto-fill MUST reuse.

## The hard problems to solve in the design
1. **Signature mapping for non-CE categories.** Define `CE_SIGNATURES`-equivalent entries for learn/goals/finance/resume field prompts so the extensions's detector can recognize a field-fill response. But field-fill prompts request arbitrary keys (e.g. `description`, `note`, `topic`) — signatures must be derivable from the prompt's `fields` payload, not hard-coded per category. Propose a scheme (e.g. the app includes the expected field keys in the inject command; the extension tags the response with those keys; on capture it matches by key presence).
2. **Correlation.** When the user clicks "Send to AI" on field X, then the AI answers, the app must know which open field/component instance that response belongs to. Currently `promptType` is `'field-fill'`/`'form-fill'` for all — no per-field or per-form correlation id. Design a correlation token passed in the inject command, echoed by the extension in `DESKFLOW_CE_RESPONSE` (e.g. `correlationId`), so the exact `FieldAIButton`/`BridgeForm` instance can consume it instead of relying on a global `promptType` match.
3. **Auto-parse vs manual.** On a correlated `DESKFLOW_CE_RESPONSE`, call `parseBridgeResponse(data, [fieldName])` (or all form keys) and call `onUpdate`/`onBulkUpdate` directly, showing a non-destructive "Imported from <provider>" toast — do NOT overwrite if the user already typed something, unless it's empty or they confirm.
4. **Multi-response / streaming.** ChatGPT/Claude stream; the detector may fire on partial text. Design debounce (wait for stream end / stable DOM for N seconds) before treating a message as final.
5. **Provider reachability reality.** Manifest already grants `content_scripts.matches` for chatgpt.com, claude.ai, perplexity.ai, gemini, you.com, qwen, kimi, chatglm, huggingface, poe, character.ai, deepseek, plus `host_permissions` for the local DeskFlow server. So injection/capture on those sites IS permitted. Confirm the design relies only on those granted sites; do not assume access to sites not in the manifest.

## Constraints
- Reuse `parseBridgeResponse`, `INJECTION_BY_CATEGORY`, the existing `/extension/poll` + `INJECT_PROMPT` + `DESKFLOW_CE_RESPONSE` plumbing. Do NOT build a new transport.
- Keep content-engine behavior unchanged (it already works).
- The design must be NON-DESTRUCTIVE: never overwrite user-typed field content without consent.
- Output a concrete implementation plan: exact files to change (extension `background.js`, `ai-context-content.js`, `focusOverlay.js`; app `FieldAIButton.tsx`, `BridgeForm.tsx`, `prompt.ts`), the new message shapes, the new `CE_SIGNATURES`/correlation scheme, debounce constants, and how to verify in a real browser (the implementing agent cannot run a browser here, so give a manual test script).
