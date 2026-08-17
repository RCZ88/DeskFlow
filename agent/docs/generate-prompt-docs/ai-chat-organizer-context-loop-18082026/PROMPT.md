# PROMPT.md — AI Chat Organizer & Context Loop
# Mandate: Lead Designer AND Engineer → RESULT.md

---

## 1. RAW USER REQUEST (verbatim, voice-transcribed)

"many AI tools, messy; can't modify AI tools internally; build the organization layer in the extension instead; auto-capture has limits; manual capture (paste link / save current chat); sessions taggable by roles/groups with notes/nicknames so chats are findable; see contents; context management + visualization; two-way transfer: app ↔ extension ↔ external AI (copy captured content back into the AI chat itself)"

---

## 2. CONTEXT

Read `CONTEXT_BUNDLE.md` in this same folder. It contains all verbatim source code from the DeskFlow codebase needed to implement this feature. You have NO repo access — all context is in that file.

---

## 3. MANDATE

You are the **Lead Designer AND Engineer** for this feature. Your output is `RESULT.md` containing:
- Every file path that needs creation or modification (exact relative paths from project root)
- Complete, production-ready code for each file (no stubs, no "// TODO")
- A test plan with specific steps to verify the feature works

---

## 4. ENGINEERING TASKS

### Engineering A — Extension Manual Capture

**Goal:** Add "Save this chat" and "Add link" buttons to the extension popup so users can manually capture AI conversations when auto-capture fails.

1. **popup.html + popup.js changes:**
   - Add a new section below the tracking toggle: "AI Context" with a "Save this chat" button and an "Add link" text input
   - "Save this chat" button: gets the current active tab's URL and title, sends `POST /ai-context` with `source: 'manual'`, `provider` derived from hostname, empty `messages` array (to be filled by content script DOM grab)
   - "Add link" input: user pastes a chat URL → send `POST /ai-context` with `source: 'manual'`, `url` from input, provider from hostname, empty messages
   - Show a brief status indicator (saved ✓ / error ✗) for 2 seconds after action
   - Style: use existing popup CSS variables (--emerald, --muted, --border, .pill, .row classes)

2. **ai-context-content.js changes:**
   - Add a new message listener for `DESKFLOW_GRAB_CHAT` from the content script world
   - When received: scrape visible messages from the page DOM (ChatGPT: `[data-message-author-role]`, Claude: `[data-is-streaming]`, Perplexity: `.prose`, You: message containers, Gemini: `[data-message-author-role]`)
   - Post `DESKFLOW_AI_CONTEXT` with `source: 'dom-grab'` and extracted messages

3. **background.js changes:**
   - Handle `DESKFLOW_GRAB_CHAT` message: inject the content script grab via `chrome.tabs.sendMessage`
   - No new server endpoints needed — reuse existing `/ai-context` POST handler

### Engineering B — Organization Schema + Backend

**Goal:** Add groups, tags, notes, nicknames, and pinning to captures.

1. **DB schema (main.ts — safe migration, ALTER TABLE):**
   - `ai_context_captures` gains: `nickname TEXT`, `note TEXT`, `tags TEXT` (JSON array), `group_id INTEGER`, `pinned INTEGER DEFAULT 0`, `is_manual INTEGER DEFAULT 0`
   - New table: `ai_context_groups` (`id INTEGER PRIMARY KEY AUTOINCREMENT`, `name TEXT NOT NULL`, `color TEXT DEFAULT '#71717a'`, `created_at INTEGER DEFAULT (unixepoch() * 1000)`)
   - Indexes: `idx_aic_group ON ai_context_captures(group_id)`, `idx_aic_pinned ON ai_context_captures(pinned DESC)`

2. **IPC handlers (main.ts):**
   - `ai-context:update` — update a capture's metadata (nickname, note, tags, group_id, pinned)
   - `ai-context:groups` — list all groups
   - `ai-context:group-create` — create a new group (name, color)
   - `ai-context:group-rename` — rename a group
   - `ai-context:group-delete` — delete a group (set captures' group_id to NULL)
   - `ai-context:capture-manual` — accepts a manual link entry (url, title, provider, source)

3. **Preload bridges (preload.ts):**
   - `aiContextUpdate(id, metadata)`, `aiContextGroups()`, `aiContextGroupCreate(name, color)`, `aiContextGroupRename(id, name)`, `aiContextGroupDelete(id)`, `aiContextCaptureManual(url, title, provider)`

4. **Type definitions (deskflow-api.d.ts):**
   - Add interfaces for group, updated capture, and new API methods

### Engineering C — Viewer v3 Organization UI

**Goal:** Transform the viewer from a flat list into an organized, searchable interface.

1. **Group filter chips** — above the provider chips, add group chips with the group's color. "All Groups" + one chip per group (with capture count).

2. **Tag filter** — add a tag filter dropdown/chips based on unique tags across captures.

3. **Search by nickname/note** — extend the existing search to also match nickname and note fields.

4. **Pinned section** — pinned captures float to the top of the list (separate section with a Pin icon header).

5. **Edit dialog** — clicking a capture's "Edit" button opens an inline form with:
   - Nickname text input
   - Note textarea
   - Tags input (comma-separated, creates pills)
   - Group dropdown (from ai-context:groups)
   - Pin toggle
   - Save/Cancel buttons

6. **Copy transcript button** — per-capture button that copies all messages as formatted text to clipboard.

7. **Open link button** — per-capture button that opens the capture's URL in a new tab.

8. **Manual badge** — captures with `source: 'manual'` show a small "manual" pill badge next to the provider.

9. **Per-group colors** — group chips use the group's color for their border/text.

10. **Empty states** — "No captures yet" (with extension icon), "No captures in this group", "No pinned captures".

### Engineering D — Two-Way Context Loop (App → Extension → External AI)

**Goal:** Allow users to send captured content back into an AI chat session.

1. **Viewer "Send to AI" button** — per-capture button with three options:
   - **Copy transcript:** formats all messages as markdown and copies to clipboard
   - **Open chat URL:** opens the capture's URL in a new browser tab
   - **Insert into chat:** sends a message to the content script to inject text into the active chat input

2. **Content script injection (ai-context-content.js):**
   - Listen for `DESKFLOW_INSERT_CONTEXT` message from background
   - Find the chat input element (textarea or contenteditable div)
   - Focus it, insert the text, dispatch `input` + `change` events (for React-controlled inputs)
   - Return success/failure to background

3. **Background relay:**
   - Receive `INSERT_INTO_CHAT` from renderer → forward to active tab's content script via `chrome.tabs.sendMessage`

---

## 5. DESIGN / UX TASKS

### Popup "AI Context" Section
- Compact section below tracking toggle
- "Save this chat" button: emerald accent, pill shape, uses existing .pill styling
- "Add link" input: text input with placeholder "Paste chat URL..."
- Status indicator: green checkmark or red X, fades after 2s
- Use existing CSS variables (--emerald, --muted, --border, --text, --mono)

### Viewer v3
- Glass card style: `bg-[rgba(24,24,27,0.60)] backdrop-blur-xl rounded-xl p-5`
- All 4 states: empty, loading (skeleton shimmer), error, populated
- Hover: subtle background change (`hover:bg-zinc-800/15`)
- Focus ring: `focus-visible:ring-2 focus-visible:ring-cyan-400/50`
- Transitions: `transition-colors` on all interactive elements
- Edit dialog: inline (no modal), expands below the capture row
- Group chips: colored border matching group color, pill shape
- Pinned section: separate section with Pin icon, yellow/amber accent
- "Send to AI" dropdown: simple dropdown with 3 options, positioned below button

---

## 6. MCP INVENTORY + SKILLS

### Component Libraries
- **shadcn:** badge, button, input, dialog, select, tooltip, skeleton, tabs, switch (already installed)
- **Lucide React icons:** BookmarkPlus, Link2, Tags, Folder, Pin, Copy, ExternalLink, MessageSquarePlus, Edit3, X, ChevronDown, ChevronRight, Search, Trash2, RefreshCw, Brain, Globe, Radio, Server, MonitorSmartphone
- **Magic UI:** (available for future animated effects — not needed for this feature)

### Design Skills
- Load `agent/skills/frontend-external-infra/SKILL.md` for component source routing
- Load `agent/skills/humancentred-UIUX/SKILL.md` for UX patterns (4 states, hover/focus, accessibility)

### Re-skin Rules
- Replace any external component colors with DeskFlow design tokens
- Use `rounded-xl` max for cards, `rounded-full` for pills
- Use `p-5` for glass cards, `p-2` for compact elements
- Use Geist/JetBrains Mono fonts (already in index.html)

---

## 7. CONSTRAINTS

- **MV3:** Chrome Manifest V3 — no `background.scripts`, use `service_worker`
- **No new dependencies:** no npm packages — only existing libs (React, lucide-react, tailwind)
- **MAIN-world capture pipeline intact:** `ai-context-content.js` runs in `world: "MAIN"` for fetch interception — do not change this
- **Dedup preserved:** `captureKey` dedup in both content script and background must remain functional
- **CRLF files:** Windows-style line endings
- **Existing IPC conventions:** use `{ ok: boolean, error?: string }` return shape; preload bridge pattern: `ipcRenderer.invoke('channel-name', args)`
- **Database migrations:** use `try { db.exec('ALTER TABLE ...') } catch {}` for safe migrations on existing databases
- **Verify end-to-end:** extension → background → server → DB → IPC → renderer

---

## 8. OUTPUT FORMAT

Your RESULT.md must contain:
1. **File inventory** — every file to create/modify with exact relative path
2. **Code** — complete, production-ready code for each file (no stubs)
3. **Migration SQL** — the exact ALTER TABLE / CREATE TABLE statements
4. **Test plan** — step-by-step verification (extension popup test, viewer test, two-way loop test)
5. **Known limitations** — anything deferred or partial
