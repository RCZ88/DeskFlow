// DeskFlow Deep Focus - Content Script
// Injects a soft-block overlay when user visits a distracting site during a focus session.
// This is a reminder, not enforcement — user can always choose to break focus.

(() => {
  if (window.__deskflowFocusInjected) return;
  window.__deskflowFocusInjected = true;

  let shown = false;
  function domain() { return location.hostname.replace(/^www\./, ''); }

  function showOverlay() {
    if (shown) return; shown = true;
    const el = document.createElement('div');
    el.id = '__deskflow_focus_overlay';
    el.innerHTML = `
      <div style="position:fixed;inset:0;z-index:2147483647;background:rgba(9,9,11,.82);
        backdrop-filter:blur(12px);display:grid;place-items:center;font-family:system-ui,sans-serif;color:#fff">
        <div style="width:min(520px,86vw);padding:36px;border-radius:22px;text-align:center;
          background:rgba(24,24,27,.9);border:1px solid rgba(255,255,255,.08)">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#a1a1aa">Deep Focus</div>
          <h1 style="font-size:24px;margin:12px 0 6px">Continuing on <span style="color:#f472b6">${domain()}</span> will break your focus.</h1>
          <p style="color:#d4d4d8;margin:0 0 24px">This site is marked distracting. Continuing marks the session <b>failed</b>.</p>
          <div style="display:flex;gap:12px;justify-content:center">
            <button id="__df_back" style="border:0;border-radius:12px;padding:13px 20px;font-weight:600;background:#6366f1;color:#fff;cursor:pointer">Go back</button>
            <button id="__df_break" style="border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:13px 20px;font-weight:600;background:transparent;color:#a1a1aa;cursor:pointer">Break focus &amp; continue</button>
          </div>
          <div style="margin-top:18px;font-size:11px;color:#71717a">This is a reminder, not a lock — your choice is logged.</div>
        </div>
      </div>`;
    document.documentElement.appendChild(el);
    document.getElementById('__df_back').onclick = () => { history.length > 1 ? history.back() : window.close(); };
    document.getElementById('__df_break').onclick = () => {
      chrome.runtime.sendMessage({ type: 'FOCUS_BREAK', domain: domain() });
      hideOverlay();
    };
  }

  function hideOverlay() {
    const e = document.getElementById('__deskflow_focus_overlay');
    if (e) e.remove();
    shown = false;
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'FOCUS_SHOW') showOverlay();
    if (msg?.type === 'FOCUS_HIDE') hideOverlay();
  });

  // Ask background on load / SPA navigation
  const ping = () => chrome.runtime.sendMessage({ type: 'FOCUS_CHECK', domain: domain() });
  ping();

  let last = location.href;
  new MutationObserver(() => { if (location.href !== last) { last = location.href; hideOverlay(); ping(); } })
    .observe(document, { subtree: true, childList: true });

  // --- AI Context Relay (MAIN world → content script world → background) ---
  // The ai-context-content.js runs in page context (MAIN world) and uses
  // window.postMessage. We listen here (default content script world) and
  // relay to the background service worker via chrome.runtime.sendMessage.
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== 'DESKFLOW_AI_CONTEXT') return;
    try {
      chrome.runtime.sendMessage({
        type: 'AI_CONTEXT_CAPTURED',
        captures: event.data.data,
      });
    } catch (e) {}
  });
})();
