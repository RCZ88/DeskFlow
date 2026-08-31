# Context Handoff — Content Engine ↔ Extension Integration

**Date:** 2026-08-26
**Scope:** Extension integration for seamless External AI Bridge flow

---

## TL;DR / Mission

Connect the Content Engine's External AI Bridge (copy/paste prompts to ChatGPT/Claude) with the browser extension's auto-injection and auto-capture capabilities, reducing the 5-step manual flow to 2 clicks.

**Current flow (5 manual steps):**
1. Click "Send to External AI" → prompt copied to clipboard
2. Manually switch to ChatGPT tab
3. Manually paste prompt into chat input
4. Manually press Enter
5. Manually copy AI response → paste back into app

**Target flow (2 clicks):**
1. Click "Send to AI" → prompt auto-injects into ChatGPT input
2. AI responds → extension auto-captures → app auto-imports

---

## Current Status

- Extension architecture fully mapped (HTTP on port 54321, 3 content scripts, service worker)
- External AI Bridge has 18 IPC endpoints (9 build + 9 import) already working
- Extension already has INSERT_INTO_CHAT command type and AI context capture
- Integration plan designed in 5 phases
- No code written yet — planning phase only

---

## Key Decisions

1. **Reuse existing command queue** — no new HTTP endpoints, just new command types via `extension:queue-command` IPC and `GET /extension/poll`
2. **Extension polls every 2s** — fast enough for prompt injection (background.js:721-736)
3. **Response detection via fetch interception** — ai-context-content.js already intercepts AI API responses on ChatGPT/Claude
4. **Fallback to clipboard** — if extension not installed, current clipboard+window.open flow still works
5. **No auto-submit** — inject prompt only, user reviews and presses Enter (safety)

---

## Constraints & Gotchas

- Extension content scripts run in MAIN world (ai-context-content.js) and ISOLATED world (focusOverlay.js) — different access rules
- `pendingExtensionCommands` queue (main.ts:4902) is cleared after each GET /extension/poll — must handle within 2s
- AI responses must be detected by JSON signature (e.g. `"script_frames":` for script prompts, `"category":` for classify)
- The extension's `DESKFLOW_INSERT_CONTEXT` already handles textarea injection via focusOverlay.js — just need new command type
- The `DESKFLOW_GRAB_CHAT` message flow already captures AI conversations — just need to tag Content Engine responses

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  DESKTOP APP (Content Engine)                                │
│                                                              │
│  User clicks "Send to AI"                                    │
│    → api().externalBuild*Prompt() returns formatted prompt   │
│    → extensionQueueCommand({                                 │
│        type: 'CONTENT_ENGINE_INJECT',                        │
│        promptType: 'classify' | 'script' | 'gates' | ...,   │
│        promptText: "...",                                    │
│        episodeId: 123,                                       │
│        importChannel: 'content:external:import-classify'     │
│      })                                                      │
│    → Polls for response via onAiContextCaptured listener     │
│    → Auto-imports when structured JSON detected              │
└─────────────────────────────────────────────────────────────┘
           │                                          ▲
           │ GET /extension/poll                     │ POST /ai-context
           │ (every 2s)                              │ (auto-capture)
           ▼                                          │
┌─────────────────────────────────────────────────────────────┐
│  BROWSER EXTENSION                                          │
│                                                              │
│  background.js receives CONTENT_ENGINE_INJECT:               │
│    → Finds active AI chat tab (ChatGPT/Claude/Gemini)       │
│    → Sends { type: 'INJECT_PROMPT', text } to content script│
│    → focusOverlay.js injects into textarea                   │
│    → User presses Enter                                      │
│                                                              │
│  ai-context-content.js monitors for AI response:            │
│    → Fetch interception catches API response                 │
│    → Detects structured JSON (Content Engine signature)      │
│    → Posts { source: 'content-engine-response', ... }        │
│    → background.js → POST /ai-context                        │
│                                                              │
│  Desktop app receives capture → auto-imports                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Artifacts & References

| Artifact | Path | Description |
|----------|------|-------------|
| Extension manifest | `browser-extension/manifest.json` | MV3 manifest v1.3.0 |
| Extension background | `browser-extension/background.js` | Service worker: tab tracking, polling, command relay |
| MAIN world content script | `browser-extension/ai-context-content.js` | Fetch interception, DOM grab, context insertion |
| ISOLATED world content script | `browser-extension/focusOverlay.js` | GRAB/INSERT handling, Deep Focus overlay |
| Extension overlay | `browser-extension/overlay.js` | FAB button + side panel on AI chat sites |
| Bridge skill | `agent/skills/external-ai-bridge/SKILL.md` | External AI Bridge pattern documentation |
| External AI Bridge IPC | `src/services/contentEngine/index.ts:694-1130` | 18 build/import IPC handlers |
| Extension polling | `src/main.ts:20652` | GET /extension/poll endpoint |
| Command queue | `src/main.ts:4902` | pendingExtensionCommands array |
| AI context capture | `src/main.ts:20585` | POST /ai-context endpoint |
| PromptBuilder component | `src/features/content-engine/components/PromptBuilder.tsx` | Reusable prompt preview/edit/paste/import card |
| DynamicPipeline component | `src/features/content-engine/components/DynamicPipeline.tsx` | Multi-step pipeline (internal AI only) |

---

## Prompt Type Registry (for response detection)

| Prompt Type | Build IPC | Import IPC | JSON Signature |
|-------------|-----------|------------|----------------|
| classify | externalBuildClassifyPrompt | externalImportClassify | `"category": "content_idea"` |
| synthesize | externalBuildSynthesizePrompt | externalImportSynthesize | `"ideas": [` |
| script | externalBuildScriptPrompt | externalImportScript | `"script_frames": [` |
| gates | externalBuildGatesPrompt | externalImportGates | `"scroll_stop": {` |
| seo | externalBuildSeoPrompt | externalImportSeo | `"phrases": [` |
| analytics | externalBuildAnalyticsPrompt | externalImportAnalytics | `"insights": [` |
| lessons | externalBuildLessonsPrompt | externalImportLessons | `"lessons": [` |
| reflection | externalBuildReflectionPrompt | externalImportReflection | `"characteristics": [` |
| frameworks | externalBuildFrameworksPrompt | externalImportFrameworks | `"rule": {` |

---

## Open Tasks (ordered)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1 | Add CONTENT_ENGINE_INJECT command handler to background.js | `browser-extension/background.js` | Small |
| 2 | Add INJECT_PROMPT message handler to focusOverlay.js | `browser-extension/focusOverlay.js` | Small |
| 3 | Replace clipboard+window.open in PromptBuilder.tsx with extensionQueueCommand | `src/features/content-engine/components/PromptBuilder.tsx` | Medium |
| 4 | Replace clipboard+window.open in BrainstormView.tsx | `src/features/content-engine/components/BrainstormView.tsx` | Small |
| 5 | Replace clipboard+window.open in IdeasView.tsx | `src/features/content-engine/components/IdeasView.tsx` | Small |
| 6 | Replace clipboard+window.open in EpisodesView.tsx | `src/features/content-engine/components/EpisodesView.tsx` | Small |
| 7 | Add Content Engine response detection to ai-context-content.js | `browser-extension/ai-context-content.js` | Medium |
| 8 | Add auto-import listener in Content Engine views | All Content Engine views | Medium |
| 9 | Build ExternalAIBridge.tsx unified component | New file | Large |
| 10 | Create prompt type registry mapping | New file | Small |

---

## How to Resume

1. Read `agent/skills/external-ai-bridge/SKILL.md` for the bridge pattern
2. Read `browser-extension/background.js` lines 721-736 for polling logic
3. Read `browser-extension/focusOverlay.js` for DESKFLOW_INSERT_CONTEXT handler
4. Read `src/features/content-engine/components/PromptBuilder.tsx` for current send flow
5. Read the integration plan phases (Phase 1-5) in the conversation history
