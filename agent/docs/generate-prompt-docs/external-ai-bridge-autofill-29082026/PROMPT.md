# PROMPT — External AI Bridge: Auto-Capture → Auto-Fill Round-Trip

## Raw Request (verbatim)
> you mean you haven't built the connections with the extension thing? as it is really quite difficult and requires research on how the extension is able to access those websites and whether it is even possible? for the stuff you doubt ur able to do, just use @generateprompt skill

The implementing agent built the app-side External AI Bridge framework and the extension command path, but did NOT verify the browser-extension can actually reach ChatGPT/Claude and auto-fill fields, and did not wire auto-capture for non-content-engine categories. Design a complete, verifiable implementation plan for the **auto-capture → auto-fill round-trip** so that when the user's external AI answers, the matching field in the deskflow app fills automatically (no manual paste).

## Context
See `CONTEXT_BUNDLE.md` (same folder) for the exact existing protocol: `extensionQueueCommand` → `/extension/poll` → `INJECT_PROMPT` (extension `focusOverlay.js`) for sending; `ai-context-content.js` MutationObserver + `CE_SIGNATURES` → `DESKFLOW_CE_RESPONSE` postMessage for capture. Content-engine already works end-to-end; learn/goals/finance/resume do not (no signatures, no correlation id). The app side `FieldAIButton`/`BridgeForm` already build prompts, parse responses via `parseBridgeResponse`, and have a dead `DESKFLOW_CE_RESPONSE` listener keyed to a `promptType` that fields don't set.

## The Mandate
Design a comprehensive, NON-DESTRUCTIVE solution that makes the bridge auto-fill fields from captured external-AI responses across ALL categories, reusing the existing transport (do not invent a new one). The solution must:
1. Add a **correlation token** to the inject command so a field/form instance can claim its own response (today `promptType` is generic `'field-fill'`/`'form-fill'`).
2. Give the extension a way to recognize field-fill responses for **any** category — derive expected keys from the command payload rather than hard-coding per-category signatures.
3. Echo the correlation token + provider + raw data in `DESKFLOW_CE_RESPONSE`.
4. On correlated capture, auto-call `parseBridgeResponse` and update only the matching field(s); never overwrite user-typed content without explicit consent.
5. Debounce streaming so partial/streaming messages aren't treated as final.
6. Stay within the manifest's already-granted site access (chatgpt.com, claude.ai, perplexity.ai, gemini, you.com, qwen, kimi, chatglm, huggingface, poe, character.ai, deepseek) — do not assume other sites.

## Requirement Checklist
- [ ] Exact new message shapes: inject command (app→ext) with `correlationId` + `expectedKeys`; `DESKFLOW_CE_RESPONSE` (ext→app) with `correlationId`, `provider`, `data`, `url`.
- [ ] Extension changes: `background.js` (pass `correlationId`/`expectedKeys` through `INJECT_PROMPT`), `focusOverlay.js` (include in `INJECT_PROMPT` payload), `ai-context-content.js` (key-based detection using `expectedKeys` instead of/in addition to `CE_SIGNATURES`; correlation echo; stream debounce).
- [ ] App changes: `FieldAIButton.tsx` (generate + send `correlationId`, listen for it, auto-parse+update), `BridgeForm.tsx` (same for whole-form), `prompt.ts` (`INJECTION_BY_CATEGORY` already maps category→inject type; confirm correlation plumbing).
- [ ] Non-destructive update policy (overwrite only empty/unchanged fields; ask before overwriting user input).
- [ ] Manual browser test script (the implementing agent cannot launch a browser here, so specify exactly how a human verifies: load extension, open ChatGPT, click "Send to AI" on a field, confirm injection, confirm auto-fill on reply).
- [ ] Edge cases: no extension present (graceful fallback to manual paste — already exists), response with no matching key, multiple fields requested at once, streaming partial, provider not in manifest.

## Constraints
- Reuse `parseBridgeResponse`, `INJECTION_BY_CATEGORY`, the existing `/extension/poll` + `INJECT_PROMPT` + `DESKFLOW_CE_RESPONSE` plumbing. Do NOT build a new transport.
- Keep content-engine auto/capture behavior unchanged.
- Produce an implementation plan with file paths, diff-shaped changes, and a verification script — not prose about "maybe use X." The receiving agent will implement it verbatim.
