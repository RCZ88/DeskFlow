// DeskFlow AI Context Capture — Content Script
// Injected into AI service pages (ChatGPT, Claude, Perplexity)
// Intercepts fetch calls to capture conversation data
//
// Strategy: override window.fetch in the page context to intercept
// AI API calls. This is more robust than DOM scraping because API
// endpoints change less frequently than DOM structure.

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

  let messageBuffer = [];
  let flushTimer = null;
  let recentKeys = new Set();
  const FLUSH_INTERVAL_MS = 5000;
  const MAX_PAYLOAD_BYTES = 280000;
  const MAX_RECENT_KEYS = 200;

  function detectProvider() {
    return provider.name;
  }

  function generateCaptureKey(messages, url) {
    const pathname = url ? new URL(url).pathname : '';
    const first = messages[0]?.content?.slice(0, 50) || '';
    const last = messages[messages.length - 1]?.content?.slice(0, 50) || '';
    return `${detectProvider()}:${pathname}:${messages.length}:${first}:${last}`;
  }

  function extractMessagesFromChatGPT(data) {
    const messages = [];
    try {
      // ChatGPT response has mapping with messages
      if (data?.mapping?.messages) {
        for (const msg of data.mapping.messages) {
          if (msg?.message?.content?.parts) {
            messages.push({
              role: msg.message.author?.role === 'assistant' ? 'assistant' : 'user',
              content: msg.message.content.parts.join('\n'),
              model: msg.message.metadata?.model_slug || undefined,
            });
          }
        }
      }
      // Or direct messages array
      if (data?.messages) {
        for (const msg of data.messages) {
          if (msg?.content) {
            messages.push({
              role: msg.author?.role || msg.role || 'user',
              content: typeof msg.content === 'string' ? msg.content :
                       Array.isArray(msg.content) ? msg.content.map(p => p.text || '').join('\n') : '',
              model: msg.metadata?.model_slug || undefined,
            });
          }
        }
      }
    } catch (e) {}
    return messages.filter(m => m.content && m.content.length > 5);
  }

  function extractMessagesFromClaude(data) {
    const messages = [];
    try {
      // Claude API responses
      if (data?.messages) {
        for (const msg of data.messages) {
          if (msg?.content) {
            const content = Array.isArray(msg.content)
              ? msg.content.map(c => c.text || '').join('\n')
              : String(msg.content);
            messages.push({
              role: msg.role || 'user',
              content,
            });
          }
        }
      }
      // Claude streaming deltas sometimes contain the full conversation
      if (data?.delta?.text && !data?.type?.includes('message_start')) {
        // Partial — skip for now, we'll get the full version
      }
    } catch (e) {}
    return messages.filter(m => m.content && m.content.length > 5);
  }

  function extractMessagesFromPerplexity(data) {
    const messages = [];
    try {
      if (data?.messages) {
        for (const msg of data.messages) {
          if (msg?.content || msg?.text) {
            messages.push({
              role: msg.role || 'user',
              content: msg.content || msg.text,
            });
          }
        }
      }
      // Perplexity also has a `thread` object
      if (data?.thread?.messages) {
        for (const msg of data.thread.messages) {
          if (msg?.content) {
            messages.push({
              role: msg.role || 'user',
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            });
          }
        }
      }
    } catch (e) {}
    return messages.filter(m => m.content && m.content.length > 5);
  }

  function extractMessagesFromYou(data) {
    const messages = [];
    try {
      // You.com responses: try messages, thread.messages, response.messages in order
      const sources = [
        data?.messages,
        data?.thread?.messages,
        data?.response?.messages,
      ];
      for (const list of sources) {
        if (!Array.isArray(list)) continue;
        for (const msg of list) {
          if (!msg?.content) continue;
          const content = Array.isArray(msg.content)
            ? msg.content.map(c => c.text || '').join('\n')
            : String(msg.content);
          messages.push({
            role: msg.role || (typeof msg.author === 'string' ? msg.author : msg.author?.role) || msg.sender || 'user',
            content,
          });
        }
      }
    } catch (e) {}
    return messages.filter(m => m.content && m.content.length > 5);
  }

  function extractMessagesFromGemini(data) {
    // Gemini responses may be encoded/streamed — best-effort extraction only
    const messages = [];
    try {
      const roleKeys = ['author', 'role', 'sender'];
      const hasRoleLike = (obj) => roleKeys.some(k => obj && typeof obj[k] === 'string');

      // (1) data.messages[] and (2) data.thread.messages[]
      for (const list of [data?.messages, data?.thread?.messages]) {
        if (!Array.isArray(list)) continue;
        for (const msg of list) {
          if (!msg?.content) continue;
          const content = Array.isArray(msg.content)
            ? msg.content.map(c => c.text || '').join('\n')
            : String(msg.content);
          messages.push({
            role: msg.author || msg.role || msg.sender || 'user',
            content,
          });
        }
      }
      // (3) deep-scan: any array of objects with a content field and a role-like key
      if (!messages.length && data && typeof data === 'object') {
        const seen = new Set();
        const walk = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              if (item && typeof item === 'object' &&
                  (typeof item.content === 'string' ||
                   (Array.isArray(item.content) && item.content.length)) &&
                  hasRoleLike(item)) {
                const key = `${item.role || item.author || item.sender}:${String(item.content).slice(0, 80)}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  const content = Array.isArray(item.content)
                    ? item.content.map(c => c.text || '').join('\n')
                    : String(item.content);
                  messages.push({
                    role: item.author || item.role || item.sender || 'user',
                    content,
                  });
                }
              }
              walk(item);
            }
          } else {
            for (const k in obj) {
              walk(obj[k]);
            }
          }
        };
        walk(data);
      }
    } catch (e) {
      return [];
    }
    return messages.filter(m => m.content && m.content.length > 5);
  }

  function extractMessages(data) {
    const p = detectProvider();
    switch (p) {
      case 'chatgpt': return extractMessagesFromChatGPT(data);
      case 'claude': return extractMessagesFromClaude(data);
      case 'perplexity': return extractMessagesFromPerplexity(data);
      case 'you': return extractMessagesFromYou(data);
      case 'gemini': return extractMessagesFromGemini(data);
      default: return extractMessagesFromClaude(data); // generic fallback
    }
  }

  function bufferCapture(messages, meta) {
    if (!messages.length) return;
    const url = window.location.href;
    const captureKey = generateCaptureKey(messages, url);
    if (recentKeys.has(captureKey)) return;
    recentKeys.add(captureKey);
    if (recentKeys.size > MAX_RECENT_KEYS) {
      const arr = [...recentKeys];
      recentKeys = new Set(arr.slice(-MAX_RECENT_KEYS));
    }
    messageBuffer.push({
      provider: detectProvider(),
      messages,
      url,
      title: document.title,
      timestamp: new Date().toISOString(),
      captureKey,
      ...meta,
    });
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL_MS);
  }

  function flushBuffer() {
    flushTimer = null;
    if (!messageBuffer.length) return;
    const batch = messageBuffer.splice(0, 50);
    try {
      const payload = JSON.stringify({ captures: batch });
      if (payload.length > MAX_PAYLOAD_BYTES) {
        // Trim oversized payloads
        for (const cap of batch) {
          cap.messages = cap.messages.map(m => ({
            ...m,
            content: m.content.slice(0, 4000),
          }));
        }
      }
      window.postMessage({
        type: 'DESKFLOW_AI_CONTEXT',
        data: batch,
      }, '*');
    } catch (e) {}
  }

  // --- Fetch interceptor ---
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] :
                  args[0]?.url || '';
      if (url.includes(provider.apiPattern)) {
        const clone = response.clone();
        clone.json().then(data => {
          const messages = extractMessages(data);
          if (messages.length > 0) {
            bufferCapture(messages, { source: 'fetch-intercept' });
          }
        }).catch(() => {});
      }
    } catch (e) {}
    return response;
  };

  // --- DOM observer (fallback for non-API messages) ---
  let lastMessageCount = 0;
  function observeDOM() {
    const observer = new MutationObserver(() => {
      try {
        // ChatGPT: [data-message-author-role]
        const chatgptMsgs = document.querySelectorAll('[data-message-author-role]');
        // Claude: [data-is-streaming] parent or .font-claude-message
        const claudeMsgs = document.querySelectorAll('[data-is-streaming]');
        // Perplexity: .prose
        const ppMsgs = document.querySelectorAll('.prose');

        const total = chatgptMsgs.length + claudeMsgs.length + ppMsgs.length;
        if (total === lastMessageCount) return;
        lastMessageCount = total;

        const messages = [];
        const allMsgs = chatgptMsgs.length ? chatgptMsgs :
                        claudeMsgs.length ? claudeMsgs : ppMsgs;
        allMsgs.forEach(el => {
          const role = el.getAttribute('data-message-author-role') ||
                       (el.closest('[data-message-author-role]')?.getAttribute('data-message-author-role')) ||
                       'assistant';
          const text = el.innerText?.trim();
          if (text && text.length > 10) {
            messages.push({ role, content: text.slice(0, 8000) });
          }
        });
        if (messages.length > 0) {
          bufferCapture(messages, { source: 'dom-observer' });
        }
      } catch (e) {}
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Start DOM observer after page load
  if (document.readyState === 'complete') {
    observeDOM();
  } else {
    window.addEventListener('load', observeDOM);
  }

  console.log(`[DeskFlow] AI context capture active for ${detectProvider()}`);
})();