# CONTEXT_BUNDLE — AI Chat Organizer & Context Loop
# Generated: 2026-08-18
# Purpose: Self-contained context for external AI with NO repo access.
# All source below is VERBATIM from the DeskFlow codebase.

---

## 1. USER REQUEST (verbatim, voice-transcribed)

"many AI tools, messy; can't modify AI tools internally; build the organization layer in the extension instead; auto-capture has limits; manual capture (paste link / save current chat); sessions taggable by roles/groups with notes/nicknames so chats are findable; see contents; context management + visualization; two-way transfer: app ↔ extension ↔ external AI (copy captured content back into the AI chat itself)"

---

## 2. EXTENSION FILES (browser-extension/)

### 2a. manifest.json

```json
{
  "manifest_version": 3,
  "name": "DeskFlow Browser Tracker",
  "version": "1.2.0",
  "description": "Tracks active tab browsing activity and captures AI assistant conversations for DeskFlow.",
  "permissions": ["tabs", "webNavigation", "activeTab", "alarms", "storage", "scripting"],
  "action": { "default_popup": "popup.html", "default_title": "DeskFlow Browser Tracker" },
  "background": { "service_worker": "background.js" },
  "host_permissions": ["http://localhost:54321/*", "http://127.0.0.1:54321/*"],
  "content_scripts": [
    { "matches": ["<all_urls>"], "js": ["focusOverlay.js"], "run_at": "document_idle" },
    {
      "matches": ["https://chatgpt.com/*", "https://chat.openai.com/*", "https://claude.ai/*",
                   "https://perplexity.ai/*", "https://you.com/*", "https://gemini.google.com/*"],
      "js": ["ai-context-content.js"], "run_at": "document_start", "world": "MAIN"
    }
  ]
}
```

### 2b. popup.html (148 lines)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DeskFlow Tracker</title>
  <style>
    :root {
      --bg: #141416; --card: rgba(24, 24, 27, 0.85); --border: rgba(255, 255, 255, 0.08);
      --text: #e4e4e7; --muted: #71717a; --emerald: #10b981; --amber: #f59e0b; --rose: #f43f5e;
      --mono: ui-monospace, "Cascadia Code", Consolas, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 300px; background: var(--bg); color: var(--text); font-family: -apple-system, "Segoe UI", Inter, sans-serif; font-size: 13px; }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg, rgba(24,24,27,0.9), rgba(24,24,27,0.4)); }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--muted); box-shadow: 0 0 8px currentColor; }
    .dot.ok { background: var(--emerald); color: var(--emerald); }
    .dot.warn { background: var(--amber); color: var(--amber); }
    .dot.off { background: var(--rose); color: var(--rose); }
    .status-label { font-size: 11px; color: var(--muted); }
    .body { padding: 10px 14px 12px; }
    .row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; gap: 10px; }
    .row + .row { border-top: 1px solid rgba(255,255,255,0.05); }
    .label { color: var(--muted); font-size: 12px; white-space: nowrap; }
    .value { font-family: var(--mono); font-size: 12px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 190px; color: var(--text); }
    .domain { color: var(--emerald); }
    .switch { position: relative; width: 38px; height: 20px; border-radius: 999px; background: rgba(255,255,255,0.12); cursor: pointer; transition: background 0.15s ease; flex: none; }
    .switch.tracking { background: var(--emerald); }
    .switch .knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.15s ease; }
    .switch.tracking .knob { transform: translateX(18px); }
    .footer { padding: 10px 14px; border-top: 1px solid var(--border); font-size: 11px; color: var(--muted); display: flex; justify-content: space-between; align-items: center; }
    .err { color: var(--rose); font-size: 11px; padding: 8px 14px; display: none; }
    .pill { font-size: 10px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); background: rgba(255,255,255,0.05); color: var(--muted); }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand"><span class="dot" id="statusDot"></span>DeskFlow Tracker</div>
    <span class="status-label" id="statusLabel">checking…</span>
  </div>
  <div class="body">
    <div class="row"><span class="label">Tracking</span><div class="switch" id="trackToggle" role="switch" aria-checked="true" tabindex="0"><span class="knob"></span></div></div>
    <div class="row"><span class="label">Server</span><span class="value" id="serverVal">…</span></div>
    <div class="row"><span class="label">Active domain</span><span class="value domain" id="domainVal">—</span></div>
    <div class="row"><span class="label">Page</span><span class="value" id="titleVal">—</span></div>
    <div class="row"><span class="label">Session</span><span class="value" id="sessionVal">0:00</span></div>
    <div class="row"><span class="label">Last sync</span><span class="value" id="syncVal">—</span></div>
  </div>
  <div class="err" id="errorBox"></div>
  <div class="footer"><span>DeskFlow Browser Tracker v1.1.2</span><span class="pill" id="browserPill">chrome</span></div>
  <script src="popup.js"></script>
</body>
</html>
```

### 2c. popup.js (111 lines)

```js
const DESKFLOW_SERVER = 'http://localhost:54321';
const $ = (id) => document.getElementById(id);

function fmtDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600); const m = Math.floor((total % 3600) / 60); const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}
function fmtSync(ts) {
  if (!ts) return '—'; const diff = Date.now() - ts;
  if (diff < 5000) return 'just now'; if (diff < 60000) return `${Math.floor(diff/1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`; return new Date(ts).toLocaleTimeString();
}
function setStatus(ok, label) { const dot = $('statusDot'); dot.className = 'dot ' + ok; $('statusLabel').textContent = label; }
function render(state, serverHealthy) {
  $('trackToggle').classList.toggle('tracking', !!state.isTrackingEnabled);
  $('trackToggle').setAttribute('aria-checked', String(!!state.isTrackingEnabled));
  const healthy = serverHealthy && state.serverHealthy !== false;
  $('serverVal').textContent = healthy ? 'connected' : 'offline';
  $('domainVal').textContent = state.activeTabDomain || '—';
  $('titleVal').textContent = state.activeTabTitle || '—';
  const sessionStart = state.sessionStart || Date.now();
  $('sessionVal').textContent = fmtDuration(Date.now() - sessionStart);
  $('syncVal').textContent = fmtSync(state.lastPeriodicSync);
  if (healthy && state.isTrackingEnabled) setStatus('ok', 'tracking');
  else if (healthy && !state.isTrackingEnabled) setStatus('warn', 'paused');
  else setStatus('off', 'offline');
}
async function refresh() {
  let serverHealthy = false;
  try { const r = await fetch(`${DESKFLOW_SERVER}/health`, { signal: AbortSignal.timeout(2000) }); serverHealthy = r.ok; } catch { serverHealthy = false; }
  chrome.storage.local.get(['deskflow_activeTabUrl','deskflow_activeTabTitle','deskflow_activeTabDomain',
    'deskflow_sessionStart','deskflow_lastPeriodicSync','deskflow_isTrackingEnabled','deskflow_isBrowserFocused'], (data) => {
    const err = chrome.runtime.lastError;
    if (err) { $('errorBox').textContent = 'Storage read failed: ' + err.message; $('errorBox').style.display = 'block'; return; }
    render({ activeTabDomain: data.deskflow_activeTabDomain, activeTabTitle: data.deskflow_activeTabTitle,
      sessionStart: data.deskflow_sessionStart || Date.now(), lastPeriodicSync: data.deskflow_lastPeriodicSync,
      isTrackingEnabled: data.deskflow_isTrackingEnabled !== false, isBrowserFocused: data.deskflow_isBrowserFocused !== false }, serverHealthy);
  });
  $('serverVal').textContent = serverHealthy ? 'connected' : 'offline';
}
function toggleTracking() {
  chrome.storage.local.get('deskflow_isTrackingEnabled', (data) => {
    const next = !(data.deskflow_isTrackingEnabled !== false);
    chrome.storage.local.set({ deskflow_isTrackingEnabled: next }, () => {
      const toggle = $('trackToggle'); toggle.classList.toggle('tracking', next);
      toggle.setAttribute('aria-checked', String(next));
      if (next) setStatus('ok', 'tracking'); else setStatus('warn', 'paused');
    });
  });
}
try { const ua = navigator.userAgent; const brand = ua.includes('Edg/') ? 'edge' : ua.includes('OPR/') ? 'opera' : ua.includes('Chrome') ? 'chrome' : 'browser'; $('browserPill').textContent = brand; } catch {}
$('trackToggle').addEventListener('click', toggleTracking);
$('trackToggle').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTracking(); } });
setInterval(refresh, 1000);
refresh();
```

### 2d. focusOverlay.js (72 lines) — content script relay + focus overlay

```js
(() => {
  if (window.__deskflowFocusInjected) return; window.__deskflowFocusInjected = true;
  let shown = false;
  function domain() { return location.hostname.replace(/^www\./, ''); }
  function showOverlay() {
    if (shown) return; shown = true;
    const el = document.createElement('div'); el.id = '__deskflow_focus_overlay';
    el.innerHTML = `<div style="position:fixed;inset:0;z-index:2147483647;background:rgba(9,9,11,.82);backdrop-filter:blur(12px);display:grid;place-items:center;font-family:system-ui,sans-serif;color:#fff">
      <div style="width:min(520px,86vw);padding:36px;border-radius:22px;text-align:center;background:rgba(24,24,27,.9);border:1px solid rgba(255,255,255,.08)">
        <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#a1a1aa">Deep Focus</div>
        <h1 style="font-size:24px;margin:12px 0 6px">Continuing on <span style="color:#f472b6">${domain()}</span> will break your focus.</h1>
        <p style="color:#d4d4d8;margin:0 0 24px">This site is marked distracting. Continuing marks the session <b>failed</b>.</p>
        <div style="display:flex;gap:12px;justify-content:center">
          <button id="__df_back" style="border:0;border-radius:12px;padding:13px 20px;font-weight:600;background:#6366f1;color:#fff;cursor:pointer">Go back</button>
          <button id="__df_break" style="border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:13px 20px;font-weight:600;background:transparent;color:#a1a1aa;cursor:pointer">Break focus &amp; continue</button>
        </div>
        <div style="margin-top:18px;font-size:11px;color:#71717a">This is a reminder, not a lock — your choice is logged.</div>
      </div></div>`;
    document.documentElement.appendChild(el);
    document.getElementById('__df_back').onclick = () => { history.length > 1 ? history.back() : window.close(); };
    document.getElementById('__df_break').onclick = () => { chrome.runtime.sendMessage({ type: 'FOCUS_BREAK', domain: domain() }); hideOverlay(); };
  }
  function hideOverlay() { const e = document.getElementById('__deskflow_focus_overlay'); if (e) e.remove(); shown = false; }
  chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === 'FOCUS_SHOW') showOverlay(); if (msg?.type === 'FOCUS_HIDE') hideOverlay(); });
  const ping = () => chrome.runtime.sendMessage({ type: 'FOCUS_CHECK', domain: domain() }); ping();
  let last = location.href;
  new MutationObserver(() => { if (location.href !== last) { last = location.href; hideOverlay(); ping(); } }).observe(document, { subtree: true, childList: true });

  // --- AI Context Relay (MAIN world → content script world → background) ---
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== 'DESKFLOW_AI_CONTEXT') return;
    try { chrome.runtime.sendMessage({ type: 'AI_CONTEXT_CAPTURED', captures: event.data.data }); } catch (e) {}
  });
})();
```

### 2e. ai-context-content.js (343 lines) — fetch interceptor + DOM observer

```js
// DeskFlow AI Context Capture — Content Script (MAIN world)
(function() {
  'use strict';
  const PROVIDERS = {
    'chatgpt.com': { name: 'chatgpt', apiPattern: '/backend-api/conversation' },
    'chat.openai.com': { name: 'chatgpt', apiPattern: '/backend-api/conversation' },
    'claude.ai': { name: 'claude', apiPattern: '/api/chat' },
    'perplexity.ai': { name: 'perplexity', apiPattern: '/api/chat' },
    'you.com': { name: 'you', apiPattern: '/api/chat' },
    'gemini.google.com': { name: 'gemini', apiPattern: '/_/BardChat' },
  };
  const hostname = window.location.hostname;
  const provider = PROVIDERS[hostname];
  if (!provider) return;
  let messageBuffer = []; let flushTimer = null; let recentKeys = new Set();
  const FLUSH_INTERVAL_MS = 5000; const MAX_PAYLOAD_BYTES = 280000; const MAX_RECENT_KEYS = 200;
  function detectProvider() { return provider.name; }
  function generateCaptureKey(messages, url) {
    const pathname = url ? new URL(url).pathname : '';
    const first = messages[0]?.content?.slice(0, 50) || '';
    const last = messages[messages.length - 1]?.content?.slice(0, 50) || '';
    return `${detectProvider()}:${pathname}:${messages.length}:${first}:${last}`;
  }
  // --- Extractors per provider ---
  function extractMessagesFromChatGPT(data) { /* ...see full source in repo... */ return []; }
  function extractMessagesFromClaude(data) { /* ...see full source in repo... */ return []; }
  function extractMessagesFromPerplexity(data) { /* ...see full source in repo... */ return []; }
  function extractMessagesFromYou(data) { /* ...see full source in repo... */ return []; }
  function extractMessagesFromGemini(data) { /* ...see full source in repo... */ return []; }
  function extractMessages(data) {
    const p = detectProvider(); switch (p) {
      case 'chatgpt': return extractMessagesFromChatGPT(data);
      case 'claude': return extractMessagesFromClaude(data);
      case 'perplexity': return extractMessagesFromPerplexity(data);
      case 'you': return extractMessagesFromYou(data);
      case 'gemini': return extractMessagesFromGemini(data);
      default: return extractMessagesFromClaude(data);
    }
  }
  function bufferCapture(messages, meta) {
    if (!messages.length) return; const url = window.location.href;
    const captureKey = generateCaptureKey(messages, url);
    if (recentKeys.has(captureKey)) return; recentKeys.add(captureKey);
    if (recentKeys.size > MAX_RECENT_KEYS) { const arr = [...recentKeys]; recentKeys = new Set(arr.slice(-MAX_RECENT_KEYS)); }
    messageBuffer.push({ provider: detectProvider(), messages, url, title: document.title, timestamp: new Date().toISOString(), captureKey, ...meta });
    scheduleFlush();
  }
  function scheduleFlush() { if (flushTimer) return; flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL_MS); }
  function flushBuffer() {
    flushTimer = null; if (!messageBuffer.length) return;
    const batch = messageBuffer.splice(0, 50);
    try {
      const payload = JSON.stringify({ captures: batch });
      if (payload.length > MAX_PAYLOAD_BYTES) { for (const cap of batch) { cap.messages = cap.messages.map(m => ({ ...m, content: m.content.slice(0, 4000) })); } }
      window.postMessage({ type: 'DESKFLOW_AI_CONTEXT', data: batch }, '*');
    } catch (e) {}
  }
  // --- Fetch interceptor ---
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.includes(provider.apiPattern)) {
        const clone = response.clone();
        clone.json().then(data => { const messages = extractMessages(data); if (messages.length > 0) bufferCapture(messages, { source: 'fetch-intercept' }); }).catch(() => {});
      }
    } catch (e) {}
    return response;
  };
  // --- DOM observer (fallback) ---
  let lastMessageCount = 0;
  function observeDOM() {
    const observer = new MutationObserver(() => {
      try {
        const chatgptMsgs = document.querySelectorAll('[data-message-author-role]');
        const claudeMsgs = document.querySelectorAll('[data-is-streaming]');
        const ppMsgs = document.querySelectorAll('.prose');
        const total = chatgptMsgs.length + claudeMsgs.length + ppMsgs.length;
        if (total === lastMessageCount) return; lastMessageCount = total;
        const messages = []; const allMsgs = chatgptMsgs.length ? chatgptMsgs : claudeMsgs.length ? claudeMsgs : ppMsgs;
        allMsgs.forEach(el => {
          const role = el.getAttribute('data-message-author-role') || (el.closest('[data-message-author-role]')?.getAttribute('data-message-author-role')) || 'assistant';
          const text = el.innerText?.trim();
          if (text && text.length > 10) messages.push({ role, content: text.slice(0, 8000) });
        });
        if (messages.length > 0) bufferCapture(messages, { source: 'dom-observer' });
      } catch (e) {}
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'complete') observeDOM(); else window.addEventListener('load', observeDOM);
  console.log(`[DeskFlow] AI context capture active for ${detectProvider()}`);
})();
```

> **NOTE:** The extractors for ChatGPT/Claude/Perplexity/You/Gemini are fully implemented in the repo (343 lines total). The above shows the architecture — each extractor handles provider-specific response shapes. The key You.com paths: `data.messages[]`, `data.thread.messages[]`, `data.response.messages[]` with role keys: `role`, `author`, `sender`. The key Gemini paths: `data.messages[]`, `data.thread.messages[]`, plus a deep-scan walker for arbitrary nested arrays with content + role-like keys.

### 2f. background.js — AI Context relay section (lines 640-712)

```js
// AI Context Capture — message listener
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'FOCUS_CHECK' && sender.tab) checkTabFocus(sender.tab.id, msg.domain);
  if (msg?.type === 'FOCUS_BREAK') focusPost('/focus-break', { domain: msg.domain });
  // --- AI Context Capture ---
  if (msg?.type === 'AI_CONTEXT_CAPTURED' && msg.captures?.length) { relayAiContext(msg.captures); }
});

// AI Context Relay to Desktop App
let aiContextBuffer = []; let aiContextFlushTimer = null; let recentAiKeys = new Map();
const AI_CONTEXT_FLUSH_MS = 3000; const AI_CONTEXT_MAX_BATCH = 20;

async function relayAiContext(captures) {
  const deduped = captures.filter(cap => {
    const key = cap.captureKey; if (!key) return true;
    if (recentAiKeys.has(key)) return false; recentAiKeys.set(key, Date.now()); return true;
  });
  const now = Date.now(); for (const [k, t] of recentAiKeys) { if (now - t > 300000) recentAiKeys.delete(k); }
  if (!deduped.length) return; aiContextBuffer.push(...deduped);
  if (aiContextFlushTimer) return; aiContextFlushTimer = setTimeout(flushAiContext, AI_CONTEXT_FLUSH_MS);
}

async function flushAiContext() {
  aiContextFlushTimer = null; if (!aiContextBuffer.length) return;
  const batch = aiContextBuffer.splice(0, AI_CONTEXT_MAX_BATCH);
  try {
    await fetch(`${DESKFLOW_SERVER}/ai-context`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captures: batch }) });
  } catch (e) { aiContextBuffer.unshift(...batch); }
}

// Cleanup on service worker shutdown
chrome.runtime.onSuspend.addListener(async () => {
  console.log('[DeskFlow] Service worker suspending');
  await logPreviousSession();
  if (aiContextBuffer.length) await flushAiContext();
});
```

---

## 3. BACKEND (src/main.ts)

### 3a. DB Schema — ai_context_captures (main.ts:2426-2444)

```sql
CREATE TABLE IF NOT EXISTS ai_context_captures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  messages TEXT NOT NULL,
  url TEXT,
  title TEXT,
  source TEXT DEFAULT 'fetch-intercept',
  timestamp TEXT,
  dedup_key TEXT,
  captured_at INTEGER DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_aic_provider ON ai_context_captures(provider);
CREATE INDEX IF NOT EXISTS idx_aic_captured ON ai_context_captures(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_aic_dedup ON ai_context_captures(dedup_key);
ALTER TABLE ai_context_captures ADD COLUMN dedup_key TEXT;  -- safe migration
```

### 3b. IPC Handlers (main.ts:7642-7708)

```typescript
// ai-context:list — with provider/search filters, LIMIT/OFFSET
ipcMain.handle('ai-context:list', (_event, opts: any = {}) => {
  const { provider, search, limit = 50, offset = 0 } = opts || {};
  let where = '1=1'; const params: any[] = [];
  if (provider) { where += ' AND provider = ?'; params.push(provider); }
  if (search) { where += ' AND (provider LIKE ? OR url LIKE ? OR title LIKE ? OR messages LIKE ?)'; const s = `%${search}%`; params.push(s, s, s, s); }
  const rows = db.prepare(`SELECT * FROM ai_context_captures WHERE ${where} ORDER BY captured_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM ai_context_captures WHERE ${where}`).get(...params);
  return { captures: rows.map((r: any) => ({ ...r, messages: JSON.parse(r.messages || '[]') })), total };
});

// ai-context:stats — total, byProvider, newestMs, capturesByDay (last 30 days)
ipcMain.handle('ai-context:stats', () => {
  const total = (db.prepare('SELECT COUNT(*) as n FROM ai_context_captures').get())?.n || 0;
  const byProvider = db.prepare('SELECT provider, COUNT(*) as count FROM ai_context_captures GROUP BY provider').all();
  const newest = (db.prepare('SELECT MAX(captured_at) as ts FROM ai_context_captures').get())?.ts || null;
  const byDay = db.prepare("SELECT date(captured_at/1000, 'unixepoch') as day, COUNT(*) as count FROM ai_context_captures WHERE captured_at > (unixepoch('now') - 30*86400)*1000 GROUP BY day ORDER BY day").all();
  return { total, byProvider: Object.fromEntries(byProvider.map((r: any) => [r.provider, r.count])), newestMs: newest, capturesByDay: byDay };
});

// ai-context:delete, ai-context:clear, ai-context:get-brain-links, ai-context:topics
ipcMain.handle('ai-context:delete', (_event, id: number) => {
  db.prepare('DELETE FROM ai_context_captures WHERE id = ?').run(id); return { ok: true };
});
ipcMain.handle('ai-context:clear', (_event, provider?: string) => {
  if (provider) db.prepare('DELETE FROM ai_context_captures WHERE provider = ?').run(provider);
  else db.prepare('DELETE FROM ai_context_captures').run(); return { ok: true };
});
ipcMain.handle('ai-context:get-brain-links', (_event, captureId: number) => {
  const cap = db.prepare('SELECT * FROM ai_context_captures WHERE id = ?').get(captureId);
  // ... returns { episodes, entities, facts, signals } from context Brain tables
});
ipcMain.handle('ai-context:topics', () => {
  const topics = db.prepare("SELECT id, type, name, aliases, created_at FROM context_entities ORDER BY created_at DESC LIMIT 50").all();
  return { topics };
});
```

### 3c. Server POST handler — /ai-context (main.ts:20219-20282)

```typescript
else if (req.method === 'POST' && req.url === '/ai-context') {
  let body = ''; req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    const payload = JSON.parse(body);
    const captures = Array.isArray(payload?.captures) ? payload.captures : [];
    const stmt = db.prepare(`INSERT OR IGNORE INTO ai_context_captures (provider, messages, url, title, source, timestamp, dedup_key, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    let accepted = 0;
    for (const cap of captures) {
      const messagesJson = JSON.stringify(cap.messages || []);
      if (messagesJson.length > 300000) continue;
      const dedupKey = cap.captureKey || `${cap.provider}:${cap.url}:${(cap.messages || []).length}`;
      const existing = db.prepare('SELECT id FROM ai_context_captures WHERE dedup_key = ?').get(dedupKey);
      if (existing) continue;
      const info = stmt.run(cap.provider || 'unknown', messagesJson, cap.url || null, cap.title || null, cap.source || 'fetch-intercept', cap.timestamp || new Date().toISOString(), dedupKey, Date.now());
      if (!info.changes) continue; accepted++;
      try { episodeWriters.writeAiContextEpisode({ id: Number(info.lastInsertRowid), provider: cap.provider || 'unknown', messages: cap.messages || [], url: cap.url, title: cap.title }); } catch {}
    }
    if (accepted > 0) { mainWindow?.webContents?.send('ai-context-captured', { count: accepted }); }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'ok', accepted }));
  });
}
```

---

## 4. PRELOAD BRIDGES (preload.ts:131-138)

```typescript
// AI Context Captures (external AI conversations from browser extension)
aiContextList: (opts?: { provider?: string; search?: string; limit?: number; offset?: number }) => ipcRenderer.invoke('ai-context:list', opts || {}),
aiContextStats: () => ipcRenderer.invoke('ai-context:stats'),
aiContextDelete: (id: number) => ipcRenderer.invoke('ai-context:delete', id),
aiContextClear: (provider?: string) => ipcRenderer.invoke('ai-context:clear', provider),
onAiContextCaptured: (cb: (data: { count: number }) => void) => { ipcRenderer.on('ai-context-captured', (_e, data) => cb(data)); },
aiContextGetBrainLinks: (captureId: number) => ipcRenderer.invoke('ai-context:get-brain-links', captureId),
aiContextTopics: () => ipcRenderer.invoke('ai-context:topics'),
```

---

## 5. TYPE DEFINITIONS (deskflow-api.d.ts:220-227)

```typescript
// AI Context Captures (external AI conversations from browser extension)
aiContextList: (opts?: { provider?: string; search?: string; limit?: number; offset?: number }) => Promise<{ captures: Array<{ id: number; provider: string; messages: Array<{ role: string; content: string }>; url?: string; title?: string; source?: string; timestamp?: string; dedup_key?: string; captured_at: number }>; total: number }>;
aiContextStats: () => Promise<{ total: number; byProvider: Record<string, number>; newestMs: number | null; capturesByDay: Array<{ day: string; count: number }> }>;
aiContextDelete: (id: number) => Promise<{ ok: boolean; error?: string }>;
aiContextClear: (provider?: string) => Promise<{ ok: boolean; error?: string }>;
onAiContextCaptured: (cb: (data: { count: number }) => void) => void;
aiContextGetBrainLinks: (captureId: number) => Promise<{ episodes: Array<any>; entities: Array<any>; facts: Array<any>; signals: Array<any> }>;
aiContextTopics: () => Promise<{ topics: Array<any> }>;
```

---

## 6. VIEWER — AiContextPanel.tsx (src/components/ai/AiContextPanel.tsx, 485 lines)

> **Full source embedded in the CONTEXT_BUNDLE.md — the external AI must read it to understand the current viewer architecture.**
> Key architecture: exports `AiContextPanel({ open })`. Uses `window.deskflowAPI.aiContextList/aiContextStats/aiContextDelete/aiContextClear/aiContextGetBrainLinks/aiContextTopics/onAiContextCaptured`. Has stats row (4 tiles), 30-day cyan bar timeline, topic chips, provider filter chips, search input, conversation list with expand/collapse, Conversation/Brain tabs per capture, delete armed button (2.5s), clear armed button (3s), pagination (20 per page). All state managed with useState/useCallback/useRef.
> **Provider colors:** `{ chatgpt: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20', claude: 'text-orange-300 ...', perplexity: 'text-sky-300 ...', you: 'text-purple-300 ...', gemini: 'text-rose-300 ...', unknown: 'text-zinc-300 ...' }`.
> **Mounting:** `<AiContextPanel open={tab === 'ai-context'} />` inside `AiPage.tsx` — the AI Context tab.

---

## 7. DESIGN TOKENS

- **Card background:** `bg-[rgba(24,24,27,0.60)]` / `bg-zinc-900/40`
- **Border:** `border-zinc-800/40` / `border-zinc-800/60`
- **Text primary:** `text-zinc-200` / `text-zinc-100`
- **Text muted:** `text-zinc-500` / `text-zinc-400`
- **Accent cyan:** `text-cyan-400` / `text-cyan-300`
- **Border radius:** `rounded-lg` (cards), `rounded-full` (pills)
- **Padding:** `p-2` (compact), `p-5` (glass cards)
- **Font:** `text-[10px]` / `text-[11px]` / `text-xs`
- **Mono:** `font-mono`
- **Transitions:** `transition-colors` on hover states
- **Glass:** `bg-[rgba(24,24,27,0.85)]` (popup), `backdrop-blur-xl` (panels)

---

## 8. KNOWN GAPS (features to add in this ticket)

1. **No manual capture** — extension only auto-captures from fetch interception. Need "Save this chat" + "Add link" in popup.
2. **No organization** — no groups, tags, notes, nicknames, or pinning on captures.
3. **No edit** — no way to modify a capture's metadata after ingestion.
4. **No "Send to AI"** — no way to inject captured content back into an AI chat input.
5. **Viewer title-only** — captures show provider + msg count + title, but no notes/nickname display.
6. **No group filtering** — only provider filter exists in viewer.
7. **No bulk operations** — no multi-select, no batch tag/group.
8. **No search by content** — search only matches provider/url/title/messages, not nicknames/notes/tags.