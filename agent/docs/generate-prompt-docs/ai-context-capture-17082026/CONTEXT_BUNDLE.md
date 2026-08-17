# CONTEXT BUNDLE — AI Context Capture System

## Overview

This bundle covers the full pipeline for capturing AI conversations from external web-based AI services (ChatGPT, Claude, Perplexity, You.com, Gemini) via the DeskFlow browser extension, relaying them to the Electron desktop app, storing in SQLite, and feeding into the Context Brain.

## Architecture

```
BROWSER EXTENSION (MV3)
  ai-context-content.js (MAIN world) — intercepts fetch calls on AI pages
  focusOverlay.js (content script world) — relays window.postMessage to background
  background.js — batches + POSTs to http://localhost:54321/ai-context
        │
        ▼
DESKTOP APP (Electron main.ts)
  POST /ai-context handler — parses captures, INSERT INTO ai_context_captures
  episodeWriters.writeAiContextEpisode() — feeds Context Brain
  IPC handlers: ai-context:list/stats/delete/clear
        │
        ▼
PRELOAD (preload.ts)
  aiContextList/Stats/Delete/Clear bridges
        │
        ▼
RENDERER
  window.deskflowAPI.aiContextList() etc.
```

## File: browser-extension/ai-context-content.js (237 lines)

Content script injected into AI service pages. Runs in MAIN world (page context) to intercept `window.fetch`.

Key design decisions:
- **Fetch interceptor** (primary): overrides `window.fetch` to capture API responses from AI services. More robust than DOM scraping because API endpoints change less frequently.
- **DOM observer** (fallback): MutationObserver on `[data-message-author-role]`, `[data-is-streaming]`, `.prose` elements. Catches messages that don't go through the intercepted fetch.
- **Provider detection**: maps `window.location.hostname` to provider name + API pattern.
- **Buffering**: batches captures for 5s before relaying via `window.postMessage({ type: 'DESKFLOW_AI_CONTEXT' })`.
- **Payload cap**: 280KB max per batch; individual messages capped at 4000 chars.

Provider API patterns:
- ChatGPT: `/backend-api/conversation`
- Claude: `/api/chat`
- Perplexity: `/api/chat`
- You.com: `/api/chat`
- Gemini: `/_/BardChat`

Message extraction per provider:
- ChatGPT: `data.mapping.messages[].message.content.parts[]` or `data.messages[].content`
- Claude: `data.messages[].content` (string or array of text blocks)
- Perplexity: `data.messages[].content` or `data.thread.messages[].content`

## File: browser-extension/manifest.json (v1.2.0)

```json
{
  "manifest_version": 3,
  "name": "DeskFlow Browser Tracker",
  "version": "1.2.0",
  "permissions": ["tabs", "webNavigation", "activeTab", "alarms", "storage", "scripting"],
  "content_scripts": [
    { "matches": ["<all_urls>"], "js": ["focusOverlay.js"], "run_at": "document_idle" },
    {
      "matches": ["https://chatgpt.com/*", "https://chat.openai.com/*", "https://claude.ai/*",
                   "https://perplexity.ai/*", "https://you.com/*", "https://gemini.google.com/*"],
      "js": ["ai-context-content.js"],
      "run_at": "document_start",
      "world": "MAIN"
    }
  ]
}
```

Key: `"world": "MAIN"` is required for fetch interception (script runs in page context, not content script sandbox).

## File: browser-extension/focusOverlay.js (relay bridge, lines 58-69)

Added at end of existing focusOverlay.js:
```js
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'DESKFLOW_AI_CONTEXT') return;
  try {
    chrome.runtime.sendMessage({ type: 'AI_CONTEXT_CAPTURED', captures: event.data.data });
  } catch (e) {}
});
```

Bridge: MAIN world content script → content script world → background service worker.

## File: browser-extension/background.js (AI context handler, lines 652-690)

```js
// In chrome.runtime.onMessage.addListener:
if (msg?.type === 'AI_CONTEXT_CAPTURED' && msg.captures?.length) {
  relayAiContext(msg.captures);
}

// Buffer + batch POST to desktop app
async function relayAiContext(captures) {
  aiContextBuffer.push(...captures);
  if (aiContextFlushTimer) return;
  aiContextFlushTimer = setTimeout(flushAiContext, 3000);
}

async function flushAiContext() {
  const batch = aiContextBuffer.splice(0, 20);
  await fetch(`${DESKFLOW_SERVER}/ai-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ captures: batch }),
  });
}
```

Also flushes on `chrome.runtime.onSuspend`.

## File: src/main.ts — Database Table (lines ~2425-2437)

```sql
CREATE TABLE IF NOT EXISTS ai_context_captures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  messages TEXT NOT NULL,        -- JSON array of {role, content}
  url TEXT,
  title TEXT,
  source TEXT DEFAULT 'fetch-intercept',
  timestamp TEXT,
  captured_at INTEGER DEFAULT (unixepoch() * 1000)
)
-- Indexes: idx_aic_provider, idx_aic_captured
```

## File: src/main.ts — HTTP Endpoint (POST /ai-context, lines ~19927-19975)

Handler in `startBrowserTrackingServer()`:
- Parses `{ captures: [{ provider, messages, url, title, source, timestamp }] }`
- Validates payload size (< 300KB per capture)
- INSERT INTO ai_context_captures
- Calls `episodeWriters.writeAiContextEpisode()` for Context Brain
- Sends `ai-context-captured` event to renderer
- Returns `{ status: 'ok', accepted: N }`

## File: src/main.ts — IPC Handlers (lines ~7613-7665)

```
ai-context:list    → SELECT * FROM ai_context_captures ORDER BY captured_at DESC
ai-context:stats   → SELECT COUNT(*) + GROUP BY provider
ai-context:delete  → DELETE FROM ai_context_captures WHERE id = ?
ai-context:clear   → DELETE FROM ai_context_captures (optionally filtered by provider)
```

## File: src/preload.ts — Bridges (lines ~131-136)

```ts
aiContextList: (opts?) => ipcRenderer.invoke('ai-context:list', opts || {}),
aiContextStats: () => ipcRenderer.invoke('ai-context:stats'),
aiContextDelete: (id) => ipcRenderer.invoke('ai-context:delete', id),
aiContextClear: (provider?) => ipcRenderer.invoke('ai-context:clear', provider),
onAiContextCaptured: (cb) => { ipcRenderer.on('ai-context-captured', (_e, data) => cb(data)); },
```

## File: src/types/deskflow-api.d.ts — Type Declarations (lines ~220-225)

```ts
aiContextList: (opts?) => Promise<{ captures: Array<{ id, provider, messages, url, title, source, timestamp, captured_at }>; total: number }>;
aiContextStats: () => Promise<{ total, byProvider, newestMs }>;
aiContextDelete: (id) => Promise<{ ok, error? }>;
aiContextClear: (provider?) => Promise<{ ok, error? }>;
onAiContextCaptured: (cb) => void;
```

## File: src/main/ai/episodeWriters.ts — AI Context Episode Writer (lines 124-145)

```ts
export function writeAiContextEpisode(capture: { provider, messages, url?, title? }) {
  const summary = capture.messages.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')
  const content = `External AI conversation on ${capture.provider}...:\n${summary.slice(0, 1500)}`
  const epId = brain.logEpisode('external_ai', content, capture.url || capture.provider, {
    provider: capture.provider, messageCount: capture.messages.length, url: capture.url, title: capture.title,
  })
  if (epId && content.length >= 40) brain.createExtractionJob(epId)
  // Entity extraction: upsert concept node for the provider
}
```

## Context Brain Integration

The episode writer feeds into the existing Context Brain pipeline:
1. `brain.logEpisode('external_ai', content, sourceRef, metadata)` — stores episode
2. `brain.createExtractionJob(epId)` — queues LLM entity/fact extraction
3. `brain.upsertEntity('concept', providerName, [provider])` — creates provider entity
4. `brain.addFact(entityId, 'discussed_in', 'external AI conversation', epId)` — links entity to episode

The scheduler (contextScheduler.ts) processes extraction jobs every 60s, and the nightly rebuild projects signals into the user profile.

## What's NOT Captured (Known Limitations)

1. **System prompts** — not visible in API responses; the AI service's system prompt is server-side only
2. **Pre-conversation context** — only captures messages AFTER the extension is installed
3. **Streaming deltas** — partial streaming responses are skipped; only final API responses are captured
4. **Multi-tab dedup** — same conversation on multiple tabs may produce duplicate captures (mitigated by content dedup in background.js)
5. **API endpoint changes** — if an AI service changes their API URL, the fetch interceptor stops working until the pattern is updated
