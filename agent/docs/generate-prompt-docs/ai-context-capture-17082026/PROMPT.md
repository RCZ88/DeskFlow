# PROMPT — AI Context Capture System

## Raw Request

> "HOW IS THE EXTENSION SYSTEM FOR THE BROWSER EXTENSION THAT IS SUPPOSED TO GATHER THE CONTEXT OF THE EXTERNAL AI WITH THE SYSTEM PROMPTS AND EVERYTHING LIKE THAT?? HOW IS THE INSERTION SYSTEM TO OUR APP??"
>
> "OKAY I WANT YOU TO CREATE THOSE FEATURES THAT I MENTIONED"

## Problem Statement

The DeskFlow browser extension only tracks TIME on websites (domain, URL, duration). It captures ZERO AI conversation content — no system prompts, no chat messages, no token usage from web-based AI services (ChatGPT, Claude web, Perplexity, etc.). The Context Brain system has no access to what the user says to external AIs or what those AIs respond.

## Engineering Task

Design and implement a complete pipeline for capturing AI conversations from external web-based AI services and inserting them into the DeskFlow desktop app.

### Pipeline Requirements

1. **Browser Extension Content Scripts** — Inject into AI service pages (chatgpt.com, claude.ai, perplexity.ai, you.com, gemini.google.com) and capture conversation data.

2. **Data Capture Strategy** — Two-layer approach:
   - **Primary**: Intercept `window.fetch` calls in the page context (MAIN world) to capture API responses containing conversation data
   - **Fallback**: MutationObserver on DOM elements to catch messages that bypass the fetch interceptor

3. **Relay Architecture** — Content script (MAIN world) → content script world relay → background service worker → HTTP POST to desktop app

4. **Desktop App HTTP Endpoint** — `POST /ai-context` on the existing capture server (port 54321) to receive and store captured conversations

5. **Database Schema** — `ai_context_captures` table storing provider, messages (JSON), URL, title, source, timestamp

6. **IPC Layer** — `ai-context:list`, `ai-context:stats`, `ai-context:delete`, `ai-context:clear` handlers + preload bridges

7. **Context Brain Integration** — Episode writer that feeds captured conversations into the Context Brain pipeline (episodes + entity extraction + signal generation)

### Provider Support

| Provider | API Pattern | Message Format |
|----------|-------------|----------------|
| ChatGPT | `/backend-api/conversation` | `data.mapping.messages[].message.content.parts[]` |
| Claude | `/api/chat` | `data.messages[].content` (string or text blocks) |
| Perplexity | `/api/chat` | `data.messages[].content` or `data.thread.messages[].content` |
| You.com | `/api/chat` | Generic message array |
| Gemini | `/_/BardChat` | Provider-specific format |

### Constraints

- Must use MV3 extension architecture (service worker, not background page)
- `world: "MAIN"` required for fetch interception (page context access)
- Payload cap: 280KB per batch (server limit ~300KB)
- Individual message content cap: 4000 chars
- Buffer batching: 5s interval, max 20 captures per batch
- Extension must be reloaded by user after update (chrome://extensions)
- System prompts are NOT capturable (server-side only)
- DOM selectors will break on AI service UI updates (use fetch interceptor as primary)

## Design Task

### UI: AI Context Viewer

The captured AI conversations should be viewable in the DeskFlow app. Design:

1. **AI Context Panel** — Accessible from the AI Assistant page (AiPage) or a dedicated section. Shows:
   - List of captured conversations grouped by provider
   - Each conversation shows: provider badge, timestamp, message count, title/URL
   - Expandable to show full conversation (user + assistant messages)
   - Provider filter + search
   - Delete individual captures or clear all per provider

2. **Context Brain Integration Display** — Show how captured conversations feed into the Context Brain:
   - Episodes generated from captures
   - Entities extracted (provider concepts, topics discussed)
   - Signals derived (interest patterns, tool usage)

3. **Stats Dashboard** — Aggregate view:
   - Total captures by provider
   - Capture timeline (captures per day)
   - Most discussed topics (from entity extraction)

### Visual Specs

- Provider badges: ChatGPT = green, Claude = orange, Perplexity = blue, You.com = purple, Gemini = red
- Message bubbles: user = right-aligned zinc-700, assistant = left-aligned zinc-800
- Timestamp format: relative ("2h ago") with absolute tooltip
- Empty state: "No AI conversations captured yet — visit ChatGPT, Claude, or Perplexity with the DeskFlow extension active"

## Requirement Checklist

- [ ] Content script intercepts fetch on 6 AI domains
- [ ] DOM observer fallback for non-API messages
- [ ] MAIN world → content script world relay bridge
- [ ] Background script batches + relays to /ai-context
- [ ] HTTP endpoint stores in ai_context_captures table
- [ ] IPC handlers for list/stats/delete/clear
- [ ] Preload bridges + deskflow-api.d.ts types
- [ ] Episode writer feeds Context Brain
- [ ] Extension manifest updated with scripting permission + content scripts
- [ ] User can reload extension to activate capture
- [ ] Captures survive app restart (SQLite persistence)
- [ ] Oversized payloads are trimmed, not rejected
- [ ] Background script flushes on service worker suspend
