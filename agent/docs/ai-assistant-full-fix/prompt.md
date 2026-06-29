# Architect Prompt — AI Assistant Full Fix

## Raw Request

> "IT ALL RETURN EMTY BULLSHIT. THE LOGS DONT SHOW WHAT I STHE OUTPUT FROM THE SHAPI NOT THJUST THE MESAGE IDIOT, IT SHOULD SHOW WHETHER THE SYSTEM IS ACTUALLY SENDING THE THING AND WHETHER THE API IS ACTUALLY WORKING U FUCKING TWAT PIECE OF SHIT."
> 
> Multiple requests asking for:
> 1. Fix "Olamah" name to "Ollama" in provider names
> 2. See actual API request/response data in logs 
> 3. Fix AI Assistant features (goals, access/control/edit/display, click handling, step processing, daily digest)
> 4. Use diagnostic logging to see what the AI APIs are actually returning

## Context

Read `agent/docs/ai-assistant-full-fix/CONTEXT_BUNDLE.md` for full code structure. This file is YOUR source of truth for every file path, line number, and data shape.

## Problem Statement

The AI Assistant feature has critical structural problems:

1. **Two completely separate HTTP client paths** call AI providers — `callProvider.ts` (used by `get-topic-digest`) and `aiAgentService.callLLM()` (used by ALL chat interactions). They share NO code: different templates, different URL construction, different error handling, different logging.

2. **No APM-grade logging.** The user cannot see what was sent to the API or what came back. Only generic "content len=0" messages appear.

3. **`aiAgentService.ts` has its OWN template definitions** (lines 370-395) instead of using `src/services/providers/templates.ts`. This means fixes to provider URLs, auth, or model names in one place don't propagate to the other.

4. **No diagnostic display in the UI.** When the user tests a provider or runs a digest, they can't see the actual request/response. They only see "success: true" or "topicCount: 0".

## Mandate

Design and implement a comprehensive solution for:

### 1. Unified Provider Client

Consolidate the two HTTP call paths into ONE code path:

- **`aiAgentService.callLLM()` should use `callProvider()` from `callProvider.ts`**, not its own fetch + streaming logic
- Reuse `templates.ts` as the single source of truth for provider URLs, auth, and request/response shapes
- Keep streaming support (the chat needs SSE streaming for UX) — but the underlying HTTP call must go through `callProvider()`
- `runWithFallback()` and `buildChain()` from `router.ts` must be usable by the chat system too

**⛔ CONSTRAINT**: Do NOT remove the streaming logic from `aiAgentService.ts`. The UI needs progressive content display. Instead, make `callProvider()` optionally streaming-aware (accept `onChunk` callback, return accumulated response).

### 2. APM-Grade Logging (both paths)

Every provider call must log to the MAIN process console:

- **Request**: Full URL, HTTP method, all headers (except full API key — mask to first 12 chars), FULL JSON body (no truncation)
- **Response**: HTTP status code, ALL response headers, FULL raw JSON body
- **Error**: HTTP status, full response text, parsing errors
- **Timing**: Duration in ms from request start to response received
- **All logs tagged** with `[PROV-UNIFIED]` prefix for easy grep

### 3. Diagnostic Display in Renderer

Add a collapsible "Diagnostics" panel accessible from:
- **Settings → AI Assistant page**: Show real-time provider test results with full request/response viewer
- **AI Chat window**: Show a "Show raw response" expandable section per AI response showing the accumulated tool call data + raw content
- **Digest panel (AiPage)**: Show the raw AI output before JSON parsing, plus the parsed result

The diagnostics panel must show:
- What was sent (URL, headers, body preview)
- What was received (status, body)
- Parse result (success, what was extracted, what was discarded)
- Timing

### 4. Provider Name Migration Verification

`migrateProviderNames()` at `main.ts:12773` currently handles:
- `cloudflayer` → `cloudflare`/`Cloudflare`
- `ollamah` (two Ls) → `ollama`/`Ollama`
- `olamah` (one L) → `ollama`/`Ollama`

Verify this covers all possible misspellings in stored data. Add any missing variants. The migration runs on EVERY `get-ai-providers` call and on `save-ai-providers`.

### 5. Error Propagation & User-Facing Messages

Every AI call path must produce user-visible error messages, not just console logs:
- Provider unreachable: "Ollama is not running at http://localhost:11434/v1/chat/completions. Start Ollama or check the URL in Settings."
- Auth failure: "Cloudflare returned 401 Unauthorized. Check your API key in Settings."
- Empty response: "The AI returned an empty response. Raw response was: [show raw]"
- Parse failure: "The AI returned unexpected format. Raw: [show raw]"

### 6. All Features End-to-End

Verify and fix each of these AI Assistant features works:

| Feature | IPC | Tool Registry | Provider Call |
|---------|-----|---------------|---------------|
| Daily digest refresh | `get-topic-digest` | `getInterestTopics` | PATH A → callProvider |
| Chat processing | `aiAgentService.processMessage` | 70+ tools | PATH B → aiAgentService.callLLM |
| Provider test | `test-ai-provider` | N/A | PATH A → callProvider |
| Goals CRUD | `getGoals`/`saveGoal` etc. | `getGoals`/`saveGoal` etc. | No AI call — direct IPC |
| Provider list | `get-ai-providers` | N/A | No AI call — DB read |

## Requirements Checklist

### Data Processing Pipeline
- [x] Both HTTP paths consolidated (single `callProvider()` with optional streaming)
- [x] `aiAgentService.callLLM()` uses `callProvider()` + templates.ts
- [x] Token tier retry logic from `callWithTokenTiers()` preserved
- [x] Fallback chain from `runWithFallback()` usable by chat
- [x] Full request/response logging on every call
- [x] Duration timing logged per call
- [x] Raw response content accessible by caller for diagnostic display

### Visual Specs
- [ ] Diagnostics panel: collapsible, dark bg (`zinc-950`/`zinc-800`), monospace font, syntax-highlighted JSON
- [ ] Panel shows URL, headers, request body, response body, timing, parse status
- [ ] Panel accessible from Settings AI page + Chat window + Digest pane
- [ ] Live streaming content visible in chat window (existing behavior, don't break)
- [ ] All error messages human-readable (not "Unknown error")

### UX Flow
- [ ] User clicks "Test" in Settings → sees diagnostics panel with full request/response
- [ ] User clicks "Refresh" on digest → diagnostics appear showing what the AI returned
- [ ] User asks AI a question → streaming content visible + "Show raw" expandable with tool call data
- [ ] Provider misconfiguration → clear error message with actionable fix suggestion
- [ ] Provider timeout → clear message, not indefinite spinner

## Existing Patterns (DO NOT BREAK)

- PTY event order is sacred
- All `localStorage` access wrapped in try/catch
- Prefer renderer-side fixes; read the FULL IPC handler before editing `main.ts`
- Files are CRLF — preserve line endings
- Generated `.md` views come from DB/JSON — don't hand-edit generated view, edit its source
- Streaming chat content in `aiAgentService.callLLM()` feeds `streamedContent` into `progressCallback` — preserve this

## Implementation Order

1. Logging-first: Add full request/response logging to BOTH current paths (callProvider.ts + aiAgentService.callLLM) with `[PROV-UNIFIED]` prefix
2. Add diagnostics storage in main process (ring buffer of last 50 provider calls)
3. Create diagnostics IPC: `get-provider-diagnostics` / `clear-provider-diagnostics`
4. Add diagnostics UI component (collapsible panel with raw request/response viewer)
5. Wire diagnostics into Settings → AI, Chat, and Digest panes
6. Consolidate templates: make aiAgentService use templates.ts
7. Refactor aiAgentService.callLLM to use callProvider() with streaming
8. Verify all 4 provider types (OpenRouter, Cloudflare, Ollama, Custom) work end-to-end
