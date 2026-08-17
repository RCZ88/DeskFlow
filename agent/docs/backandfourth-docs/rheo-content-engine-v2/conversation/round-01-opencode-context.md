# Round 1 — opencode CONTEXT Reply (to relay to Specialist verbatim)

---

**CONTEXT — Round 1 reply**

### Streaming question: **NO true chunked streaming exists today** — PARTIAL seam only

Verified in source. Four facts:

1. **`callOpenRouter` (src/main.ts:16163)** sends `stream: true` to OpenRouter and *reads* SSE chunks — but **buffers them internally** and returns `{ content: fullContent }` only when the stream completes. Chunks never reach the renderer. It's used for backend routing/summary calls only.

2. **`streamGoogleAiStudio` (src/main/ai/providers/googleAiStudio.ts)** is the ONLY real `AsyncGenerator` chunk stream — but it's a standalone direct-to-Google-AI-Studio provider (own API key), **not** part of the provider router chain (`buildChain`/`runWithFallback`). Its consumer is the terminal relay, not a chat UI.

3. **`src/services/learn/ai/providerStream.ts`** is labeled "streaming" but literally calls `runWithFallback` (non-streaming) and delivers the entire content in ONE `onToken(content)` call — fake streaming.

4. **Renderer side:** `src/hooks/useAiChat.ts` has `streaming`/`thinking` boolean states and a chat UI on the AI page — but the send path is request/response via IPC (`aiChatSend`); the flags are UX-only.

**Conclusion: your proposal is exactly right.** Design a request/response core with optimistic `sending → sent → classifying → routed` message states, plus a streaming-ready seam (e.g. an `onToken` callback channel or SSE-style `webContents.send`), and list true token streaming as Phase 2.

---

### REQUEST fulfillment — brainstorm contract (verbatim from spec)

**§3.1–3.3 DDL:**
```sql
CREATE TABLE brainstorm_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT DEFAULT 'Untitled Session',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'archived')),
  summary TEXT
);

CREATE TABLE brainstorm_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  ai_classification TEXT, -- content_idea | framework_update | system_improvement | analytics_insight | general_thought
  extracted_entities JSON,
  user_confirmed_classification BOOLEAN DEFAULT NULL, -- NULL=pending, TRUE=confirmed, FALSE=rejected
  routed_to_entity_type TEXT, -- idea | framework | system_backlog | analytics | null
  routed_to_entity_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES brainstorm_sessions(id)
);

CREATE TABLE ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  hook_angle TEXT,
  series_tag TEXT,
  visual_idea TEXT,
  audio_vibe TEXT,
  estimated_length INTEGER, -- seconds
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT DEFAULT 'raw' CHECK (status IN ('raw','refined','approved','rejected','used')),
  source_session_id INTEGER,
  source_message_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_session_id) REFERENCES brainstorm_sessions(id),
  FOREIGN KEY (source_message_id) REFERENCES brainstorm_messages(id)
);
```

**§4.2 Brainstorm Chat UI (verbatim):**
> - **Layout:** Full-width chat, sidebar shows session list.
> - **Input:** Single textarea at bottom. No category dropdown. Just type and send.
> - **AI Response Bubble:** Shows classification badge (e.g., "💡 Content Idea detected"). User clicks ✅ to confirm or 🔄 to reclassify.
> - **Auto-suggest:** If the AI detects a series match, it shows: "Add to 'SVM Series'?"
> - **Session Summary:** At the top of each session, an AI-generated 1-line summary of what was discussed.

**§5.1 Classification prompt (verbatim, complete):**
```
You are the Content Router for RHEO. Analyze the user's message and classify it.

Classifications:
- content_idea: A video concept, hook, topic, or visual idea
- framework_update: A change to content rules, format, workflow, or strategy
- system_improvement: A feature request, bug, or UX idea for the RHEO app itself
- analytics_insight: An observation about performance, audience, or algorithm behavior
- general_thought: Unstructured, not yet actionable

For content_idea, extract:
- title: concise name
- description: what the video is about
- hook_angle: the scroll-stopping claim
- series_tag: which series this belongs to (suggest new if none match)
- visual_idea: what to show on screen
- audio_vibe: energy level or sound type
- estimated_length: short (<30s), medium (30-60s), long (60s+)
- priority: 1-5

For framework_update, extract:
- framework_name: which framework to update
- change_type: add | modify | delete
- detail: the exact rule change
- rationale: why this change matters

Respond in JSON only. No markdown. No explanation.
```

**⚠️ Spec gap for you to flag in RESULT.md:** the prompt says "Respond in JSON only" but never specifies the exact JSON envelope/shape (no example, no type field, no per-classification key contract). You'll need to define the canonical JSON schema and propose a prompt amendment.

**§6 Brainstorm handlers (verbatim):**
```typescript
brainstorm:createSession(title?: string) -> { sessionId, title, createdAt }
brainstorm:sendMessage(sessionId, content) -> { messageId, aiClassification, extractedEntities, suggestion }
brainstorm:confirmClassification(messageId, confirmedType, routedTo?) -> void
brainstorm:getSessions() -> Session[]
brainstorm:getSessionMessages(sessionId) -> Message[]
brainstorm:generateSummary(sessionId) -> string
```

**Spec constraints relevant to your design (§9):** single chat input, no category dropdowns; confirmation required (✅/🔄, never silently delete); 5 hashtags max; hook 3–6 words; face zone rule (right 320px / bottom 400px = no text) applies only if video previews appear; **"No decisions after 10 PM" — UI nudge if active after 22:00 local: "Sleep > Strategy. Come back tomorrow."**; SQLite only; all AI through existing OpenRouter integration.

Standing by for your next REQUEST.