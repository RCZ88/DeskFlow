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
  
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => { 
    if (msg?.type === 'FOCUS_SHOW') showOverlay(); 
    if (msg?.type === 'FOCUS_HIDE') hideOverlay(); 
    
    // Handle DESKFLOW_GRAB_CHAT directly — scrape visible messages from DOM
    if (msg?.type === 'DESKFLOW_GRAB_CHAT') {
      try {
        const chatgptMsgs = document.querySelectorAll('[data-message-author-role]');
        const claudeMsgs = document.querySelectorAll('[data-is-streaming]');
        const ppMsgs = document.querySelectorAll('.prose');
        const allMsgs = chatgptMsgs.length ? chatgptMsgs : claudeMsgs.length ? claudeMsgs : ppMsgs;
        const messages = [];
        allMsgs.forEach(el => {
          const role = el.getAttribute('data-message-author-role') || (el.closest('[data-message-author-role]')?.getAttribute('data-message-author-role')) || 'assistant';
          const text = el.innerText?.trim();
          if (text && text.length > 10) messages.push({ role, content: text.slice(0, 8000) });
        });
        if (messages.length > 0) {
          // Send captured messages to background via relay
          chrome.runtime.sendMessage({ type: 'AI_CONTEXT_CAPTURED', captures: [{
            provider: detectProviderFromUrl(window.location.href),
            messages, url: window.location.href, title: document.title,
            source: 'dom-grab', timestamp: new Date().toISOString(),
            captureKey: `dom-grab:${window.location.href}:${messages.length}:${Date.now()}`
          }]});
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, error: 'No messages found on page' });
        }
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
      return true; // Keep sendResponse open
    }

    // Handle DESKFLOW_INSERT_CONTEXT — find chat input and inject text
    if (msg?.type === 'DESKFLOW_INSERT_CONTEXT') {
      try {
        const text = msg.text;
        const inputs = [
          document.querySelector('textarea[placeholder*="Message"]'),
          document.querySelector('textarea[aria-label*="Message"]'),
          document.querySelector('[contenteditable="true"][role="textbox"]'),
          document.querySelector('textarea'),
          document.querySelector('[contenteditable="true"]')
        ];
        let target = inputs.find(el => el && el.offsetParent !== null);
        if (target) {
          target.focus();
          if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
            target.value = text;
          } else {
            target.innerText = text;
          }
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, error: 'No chat input found' });
        }
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
      return true;
    }
  });

  function detectProviderFromUrl(url) {
    try {
      const h = new URL(url).hostname.replace(/^www\./, '');
      const map = { 'chatgpt.com': 'chatgpt', 'chat.openai.com': 'chatgpt', 'claude.ai': 'claude',
        'perplexity.ai': 'perplexity', 'you.com': 'you', 'gemini.google.com': 'gemini' };
      return map[h] || 'unknown';
    } catch { return 'unknown'; }
  }

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
