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
  function extractMessagesFromChatGPT(data) {
    const msgs = [];
    const mapping = data?.mapping || {};
    for (const id in mapping) {
      const node = mapping[id];
      if (node?.message?.content?.parts) {
        const role = node.message.author?.role || 'assistant';
        const content = node.message.content.parts.join('\n').trim();
        if (content && content.length > 10) msgs.push({ role, content: content.slice(0, 8000) });
      }
    }
    return msgs;
  }

  function extractMessagesFromClaude(data) {
    const msgs = [];
    const chat = data?.chat || data?.conversation || {};
    const messages = chat.messages || [];
    messages.forEach(m => {
      const role = m.sender || m.role || 'assistant';
      const content = m.text || m.content || '';
      if (content && content.length > 10) msgs.push({ role, content: content.slice(0, 8000) });
    });
    return msgs;
  }

  function extractMessagesFromPerplexity(data) {
    const msgs = [];
    const entries = data?.query_str || data?.results || [];
    if (data.query_str) msgs.push({ role: 'user', content: data.query_str.slice(0, 8000) });
    if (data.answer) msgs.push({ role: 'assistant', content: data.answer.slice(0, 8000) });
    return msgs;
  }

  function extractMessagesFromYou(data) {
    const msgs = [];
    const lists = [data?.messages, data?.thread?.messages, data?.response?.messages].flat().filter(Boolean);
    lists.forEach(m => {
      const role = m.role || m.author || m.sender || 'assistant';
      const content = m.content || m.text || '';
      if (content && content.length > 10) msgs.push({ role, content: content.slice(0, 8000) });
    });
    return msgs;
  }

  function extractMessagesFromGemini(data) {
    const msgs = [];
    const walker = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach(walker); return; }
      if (obj.content && (obj.role || obj.author || obj.sender)) {
        const role = obj.role || obj.author || obj.sender;
        const content = typeof obj.content === 'string' ? obj.content : JSON.stringify(obj.content);
        if (content && content.length > 10) msgs.push({ role, content: content.slice(0, 8000) });
      }
      Object.values(obj).forEach(walker);
    };
    walker(data);
    return msgs;
  }

  function extractMessages(data) {
    const p = detectProvider();
    switch (p) {
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

  // --- Manual Grab & Insert Listeners ---
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data?.type === 'DESKFLOW_GRAB_CHAT') {
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
          bufferCapture(messages, { source: 'dom-grab' });
          window.postMessage({ type: 'DESKFLOW_GRAB_CHAT_RESPONSE', ok: true }, '*');
        } else {
          window.postMessage({ type: 'DESKFLOW_GRAB_CHAT_RESPONSE', ok: false }, '*');
        }
      } catch (e) {
        window.postMessage({ type: 'DESKFLOW_GRAB_CHAT_RESPONSE', ok: false }, '*');
      }
    }
    
    if (event.data?.type === 'DESKFLOW_INSERT_CONTEXT') {
      try {
        const text = event.data.text;
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
          window.postMessage({ type: 'DESKFLOW_INSERT_CONTEXT_RESPONSE', ok: true }, '*');
        } else {
          window.postMessage({ type: 'DESKFLOW_INSERT_CONTEXT_RESPONSE', ok: false }, '*');
        }
      } catch (e) {
        window.postMessage({ type: 'DESKFLOW_INSERT_CONTEXT_RESPONSE', ok: false }, '*');
      }
    }
  });

  console.log(`[DeskFlow] AI context capture active for ${detectProvider()}`);
})();
