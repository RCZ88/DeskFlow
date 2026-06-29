# Plan: AI Connectors + Voice Input + AiPage Redesign

## Context

The user wants DeskFlow's AI Assistant to become a "Jarvis-like" hub that connects to external data sources (email, calendar) and accepts voice input. The AI page also needs a design refresh from the provided `aipage_redesign_patch`. All connectors must be free (no paid APIs). The app already has a multi-provider AI abstraction (`callProvider`, `router.ts`, `PROVIDER_TEMPLATES`) and tracks usage data locally via SQLite.

## Scope

**In scope:**
1. Apply the `aipage_redesign_patch` design tokens/layout to `AiPage.tsx`
2. Build a Connectors infrastructure (DB schema, IPC, types)
3. Email connector (IMAP — free with any email provider)
4. Calendar connector (CalDAV — free with Google/Outlook/Nextcloud)
5. Voice input via Web Speech API (free, built into Chromium/Electron)
6. Wire connector data into AI context so the AI can reference emails/calendar
7. UI: Connectors panel on AI page showing connection status + recent items
8. UI: Voice input button in the AI Chat component

**Out of scope:**
- OAuth2 flows (use IMAP/CalDAV app passwords — simpler, no paid API quotas)
- Write-back to email/calendar (read-only for now)
- Paid services (Gmail API quota, Outlook REST API, etc.)

---

## Phase 1: Apply AiPage Redesign Patch

**What:** Replace the current `AiPage.tsx` with the patch's cleaner design tokens.

**Changes to `src/pages/AiPage.tsx`:**
- Add design token variables: `BTN`, `ACCENT_BAR`, `ACCENT_PILL`, `ACCENT_DOT`
- Add `pill()` and `sectionHead()` helper functions
- Replace `bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950` → `bg-zinc-950`
- Replace `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6` → `max-w-6xl px-6 py-8 space-y-10`
- Wrap sections in `<section data-section="ai.xxx">` with `sectionHead()` headers
- Change header buttons from `rounded-full` to `rounded-lg`
- Change chat container from `rounded-2xl` to `rounded-xl bg-zinc-900/40 ring-1 ring-zinc-800`

**Verify:** Build passes, AI page renders with cleaner layout.

---

## Phase 2: Connectors Infrastructure

### 2a. Database Schema

Add to `main.ts` DB init (new table `connectors`):

```sql
CREATE TABLE IF NOT EXISTS connectors (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,          -- 'email' | 'calendar'
  provider TEXT NOT NULL,      -- 'imap' | 'caldav' | 'gmail' | 'outlook'
  display_name TEXT NOT NULL,
  config TEXT NOT NULL,        -- JSON: { host, port, username, password, etc. }
  status TEXT DEFAULT 'disconnected', -- 'connected' | 'error' | 'disconnected'
  last_sync TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS connector_items (
  id TEXT PRIMARY KEY,
  connector_id TEXT NOT NULL,
  item_type TEXT NOT NULL,     -- 'email' | 'event' | 'reminder'
  subject TEXT,
  summary TEXT,
  date TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  metadata TEXT,               -- JSON blob for provider-specific fields
  FOREIGN KEY (connector_id) REFERENCES connectors(id)
);
```

### 2b. IPC Handlers (main.ts)

| Handler | Purpose |
|---------|---------|
| `connectors:list` | List all configured connectors |
| `connectors:add` | Add a new connector (validates config) |
| `connectors:remove` | Remove a connector by ID |
| `connectors:test` | Test connection (IMAP/CalDAV ping) |
| `connectors:sync` | Trigger sync for a connector |
| `connectors:items` | Get recent items from a connector |
| `connectors:status` | Get connection status |

### 2c. Preload Bridges (preload.ts)

```typescript
connectors: {
  list: () => ipcRenderer.invoke('connectors:list'),
  add: (config: any) => ipcRenderer.invoke('connectors:add', config),
  remove: (id: string) => ipcRenderer.invoke('connectors:remove', id),
  test: (id: string) => ipcRenderer.invoke('connectors:test', id),
  sync: (id: string) => ipcRenderer.invoke('connectors:sync', id),
  items: (id: string, opts?: any) => ipcRenderer.invoke('connectors:items', id, opts),
  status: (id: string) => ipcRenderer.invoke('connectors:status', id),
}
```

### 2d. TypeScript Types

New file `src/types/connectors.ts`:

```typescript
export interface ConnectorConfig {
  id: string;
  type: 'email' | 'calendar';
  provider: 'imap' | 'caldav';
  displayName: string;
  config: ImapConfig | CalDavConfig;
  status: 'connected' | 'error' | 'disconnected';
  lastSync?: string;
}

export interface ImapConfig {
  host: string;
  port: number;
  username: string;
  password: string;  // app password
  tls: boolean;
  folder?: string;
}

export interface CalDavConfig {
  url: string;
  username: string;
  password: string;
  calendarName?: string;
}

export interface ConnectorItem {
  id: string;
  connectorId: string;
  itemType: 'email' | 'event' | 'reminder';
  subject?: string;
  summary?: string;
  date: string;
  read: boolean;
  metadata?: Record<string, any>;
}
```

---

## Phase 3: Email Connector (IMAP)

### npm packages to install:
- `node-imap` — IMAP client (free, works with Gmail, Outlook, any provider)
- `mailparser` — Parse email bodies/headers (free)

### Backend (`src/services/connectors/imapConnector.ts`):

```typescript
// Core functions:
// - testConnection(config: ImapConfig): Promise<boolean>
// - fetchRecentEmails(config: ImapConfig, folder: string, limit: number): Promise<ConnectorItem[]>
// - The connector syncs last 20 emails into connector_items table
```

**How it works:**
1. User enters IMAP host/port/username/app-password in the UI
2. `connectors:test` pings the IMAP server
3. On success, stores config encrypted in `connectors` table
4. `connectors:sync` opens IMAP, fetches last 20 emails from INBOX
5. Stores parsed emails in `connector_items` table
6. AI can query `connectors:items` to get recent emails as context

**Free:** IMAP is free with any email provider. Gmail requires "App Password" (free). Outlook requires "App Password" (free).

---

## Phase 4: Calendar Connector (CalDAV)

### npm packages to install:
- `tsdav` — CalDAV/CardDAV client (free, supports Google Calendar, Outlook, Nextcloud)

### Backend (`src/services/connectors/caldavConnector.ts`):

```typescript
// Core functions:
// - testConnection(config: CalDavConfig): Promise<boolean>
// - fetchUpcomingEvents(config: CalDavConfig, days: number): Promise<ConnectorItem[]>
// - The connector syncs next 7 days of events into connector_items table
```

**How it works:**
1. User enters CalDAV URL + credentials in the UI
2. For Google Calendar: `https://apidata.googleusercontent.com/caldav/v2/` + app password
3. For Outlook: `https://outlook.office365.com/dav/` + app password
4. `connectors:sync` fetches events for next 7 days
5. Stores events in `connector_items` table with `item_type: 'event'`
6. AI can query upcoming meetings/deadlines as context

**Free:** CalDAV is free with any provider that supports it.

---

## Phase 5: Voice Input (Web Speech API)

### No npm packages needed — Web Speech API is built into Chromium/Electron.

### Component: `src/components/VoiceInput.tsx`

```typescript
// Uses window.webkitSpeechRecognition (available in Electron's Chromium)
// Features:
// - Toggle button (mic icon) in the AI Chat input area
// - Real-time transcription as user speaks
// - Auto-stops after 5s of silence
// - Inserts transcribed text into the chat input
// - Visual feedback: pulsing mic icon while recording
// - Fallback: if Web Speech API unavailable, show "Voice not supported" tooltip
```

**Why Web Speech API:**
- Free, no API key, no network needed (runs locally in Chromium)
- Real-time streaming transcription
- Supports 60+ languages
- Accuracy: ~95% for clear speech
- Latency: < 200ms (instant)

**Alternative considered:** Whisper.cpp via `@xenova/transformers` — more accurate but requires 100MB+ model download and slower. Web Speech API is sufficient for chat input.

### Integration with AiChat:

Add a mic button next to the send button in `AiChat.tsx`. When clicked:
1. Starts `webkitSpeechRecognition`
2. Shows pulsing animation
3. On result, appends text to the chat input
4. On end, stops animation

---

## Phase 6: Wire Connectors to AI Context

### Modify `aiAgentService.ts`:

When the AI chat sends a message, inject connector data into the context bundle:

```typescript
// In the AI chat handler, before calling the provider:
const connectorContext = await buildConnectorContext();
// connectorContext includes:
// - Recent emails (subject, sender, date — no body for privacy)
// - Upcoming events (title, time, duration)
// - Connection status summary
```

### Modify `toolRegistry.ts`:

Add new tools the AI can call:

```typescript
r('getConnectorItems', 'Get recent items from a connected service', {
  type: p('string', 'Item type: email or event', { required: false }),
  limit: p('number', 'Max items to return', { required: false }),
}, 'read', 'connectors', async (params) => {
  return api.connectors.items(params.connectorId, params);
});
```

---

## Phase 7: UI — Connectors Panel on AI Page

### New component: `src/components/ConnectorsPanel.tsx`

**Location:** On the AI page, between the Summary section and the Focus section (or as a new section).

**Design (using all skills):**

```
┌─────────────────────────────────────────────────────────┐
│ ══ Connected Services                                    │
│   Your data sources for AI context                       │
│                                                          │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │ 📧 Email     │  │ 📅 Calendar  │  │  + Connect   │   │
│ │ Gmail (IMAP) │  │ Google Cal   │  │              │   │
│ │ ● Connected  │  │ ● Connected  │  │              │   │
│ │ 12 unread    │  │ 3 today      │  │              │   │
│ │ Last: 2m ago │  │ Next: 3pm    │  │              │   │
│ └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│ Recent:                                                  │
│ 📧 "Q2 Report" from john@... — 10:30am                  │
│ 📅 "Team Standup" — 2:00pm-2:30pm                       │
│ 📧 "Re: Design review" from sarah@... — 9:15am          │
└─────────────────────────────────────────────────────────┘
```

**Behaviors:**
- Empty state: "Connect your first service" with a + button
- Connected state: Shows provider name, status dot (green/red), item count
- Clicking a connector opens a detail drawer showing recent items
- The + button opens a `ConnectorSetupModal` with provider selection + credential form

### New component: `src/components/ConnectorSetupModal.tsx`

**Design:**
- Step 1: Choose type (Email / Calendar)
- Step 2: Choose provider (IMAP / CalDAV / Google / Outlook)
- Step 3: Enter credentials (host, port, username, password)
- Step 4: Test connection (green checkmark or red error)
- Step 5: Save + initial sync

**Human-Centric UX (humancentred-UIUX skill):**
- Progress indicator showing which step
- Inline validation (host format, port range)
- "Test connection" button before saving
- Show exactly what data will be accessed (transparency)
- App password instructions for Gmail/Outlook

### New component: `src/components/VoiceInputButton.tsx`

**Design (impeccable + motion skills):**
- Mic icon (lucide `Mic` icon) in the chat input bar
- Idle: `text-zinc-500`, hover: `text-zinc-300`
- Recording: pulsing red dot + `text-pink-500` + ring animation
- Uses `framer-motion` for the pulse animation
- Tooltip: "Voice input (click to start)"

---

## Phase 8: AI Chat Enhancement

### Modify `src/components/AiChat.tsx`:

1. Add `VoiceInputButton` next to the send button
2. Add a small "context indicator" showing how many connector items are loaded
3. The AI's system prompt gets injected with:
   - "You have access to the user's recent emails and upcoming calendar events."
   - "When the user asks about their schedule, meetings, or emails, reference the connector data."

---

## Design Skills Application (ALL 6 skills loaded)

### Motion Level: L2 (Responsive) — alive but focused
DeskFlow is a developer productivity tool. L2 fits: micro-interactions on connectors, smooth transitions, ONE breathing ambient accent (status dots). No bouncing, no particles, no scroll choreography.

### Per-Component Skill Mapping

| Component | Primary Skills | Specific Application |
|-----------|---------------|---------------------|
| **ConnectorsPanel** | frontend-design + humancentred-UIUX | Glass cards (`bg-zinc-900/50 backdrop-blur-xl`), empty state ("Connect your first service"), loading skeletons, error with retry CTA |
| **ConnectorSetupModal** | humancentred-UIUX + ui-ux-pro-max | Step wizard with progress indicator, inline validation, "Test connection" before save, plain-language copy. Developer-tool aesthetic: dark chrome, monospace accents for host/port fields |
| **VoiceInputButton** | motion-alive + impeccable | Pulsing mic icon (C2 breathing dot recipe), hover lift (A1), press scale (A1). Duration: 150ms ease-out. Reduced-motion: instant opacity toggle |
| **Connector cards** | frontend-external-infra + impeccable | Pull card patterns from shadcn registry, re-skin to DeskFlow tokens. Status dots use C2 breathing. Color: pink for email, cyan for calendar (one accent per type) |
| **AiPage sections** | ui-ux-pro-max + frontend-design | Developer-tool aesthetic: 4-8px grid, tight data cells, generous section gaps. Section headers via `sectionHead()` helper |
| **AiChat context indicator** | humancentred-UIUX + motion-alive | Small badge showing connector data loaded. Enter/exit via AnimatePresence (B1 recipe). Subtle, non-intrusive |

### Skill-Specific Rules Applied

**impeccable:**
- Typography: Geist body (13px), JetBrains Mono for code/host fields. Weight hierarchy: 400 body, 500 labels, 600 headings
- Color: pink-500 for email, cyan-400 for calendar. Max 3 accents per view
- Spatial: 8px grid. High density for data cells, medium for cards, low for section gaps
- Motion: 150ms hover/press, 250ms modals, 400ms page transitions. No `transition: all`
- Interaction: Every element has hover/focus/active/disabled. Focus ring: `ring-2 ring-pink-500/50`

**humancentred-UIUX:**
- Complete state coverage: Empty + Loading + Error + Populated for every connector card
- Progressive disclosure: Setup wizard hides advanced IMAP/CalDAV options behind "Advanced" toggle
- Clear CTAs: "Connect email" not "Add". "Test connection" not "Validate"
- Feedback: Button → loading spinner → success checkmark → connector card appears
- Forgiveness: "Remove connector" requires confirmation. Credentials hidden by default

**ui-ux-pro-max:**
- Developer-tool aesthetic: dark chrome, monospace for technical fields (host, port)
- Color: deep zinc base, ONE vibrant accent per connector type
- Typography: Geist for UI, JetBrains Mono for config values
- Spacing: 4-8px inside data cells, 16-24px between cards
- Anti-patterns: No rounded corners > 12px. No decorative gradients on functional elements

**frontend-design:**
- Glass cards: `bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50`
- Color tokens: `--page-accent` per section, zinc-950 base
- Borders: `ring-1 ring-zinc-800` for cards, `ring-2 ring-pink-500/50` for focus
- Anti-patterns: No `box-shadow` on dark themes. No pure black. No `rounded-2xl`

**motion-alive:**
- L2 budget: list stagger for connector cards (B2), hover lift on cards (A1), breathing status dots (C2), AnimatePresence for setup modal (B1)
- Timing: 150ms hover, 250ms modal, stagger 50ms between cards
- Springs: gentle (stiffness 300, damping 30) for card interactions only
- Reduced-motion: `useReducedMotion()` collapses all to instant opacity
- ONE ambient accent: breathing status dots on connected connectors. No competing ambient layers

**frontend-external-infra:**
- Pull card component from shadcn MCP → re-skin to DeskFlow tokens
- Pull animated status dot from Magic UI → adapt to C2 breathing recipe
- Use Lucide icons: `Mail` for email, `Calendar` for calendar, `Mic` for voice, `Plus` for add, `Check` for connected, `AlertCircle` for error
- Re-skin rules: replace source colors with DeskFlow tokens, max `rounded-xl`, `p-5` padding, dark mode only

---

## Implementation Order

1. **Phase 1** — Apply redesign patch (1 file, low risk)
2. **Phase 2** — Connectors infrastructure (DB + IPC + types)
3. **Phase 3** — Email connector backend
4. **Phase 4** — Calendar connector backend
5. **Phase 5** — Voice input component
6. **Phase 6** — Wire to AI context
7. **Phase 7** — UI panels (ConnectorsPanel, ConnectorSetupModal, VoiceInputButton)
8. **Phase 8** — AI Chat integration + polish

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/AiPage.tsx` | Edit (apply redesign patch + add ConnectorsPanel section) |
| `src/types/connectors.ts` | Create (TypeScript interfaces) |
| `src/services/connectors/imapConnector.ts` | Create (IMAP client) |
| `src/services/connectors/caldavConnector.ts` | Create (CalDAV client) |
| `src/components/ConnectorsPanel.tsx` | Create (connector cards + recent items) |
| `src/components/ConnectorSetupModal.tsx` | Create (setup wizard) |
| `src/components/VoiceInputButton.tsx` | Create (mic button with animation) |
| `src/components/AiChat.tsx` | Edit (add voice button + context indicator) |
| `src/main.ts` | Edit (add connectors table + IPC handlers) |
| `src/preload.ts` | Edit (add connectors bridges) |
| `src/App.tsx` | Edit (add connectors to deskflowAPI type) |
| `src/services/ai/aiAgentService.ts` | Edit (inject connector context) |
| `src/services/ai/toolRegistry.ts` | Edit (add connector tools) |
| `package.json` | Edit (add node-imap, mailparser, tsdav) |

---

## Verification

1. **Build:** `node scripts/build.mjs` + preload rebuild — must pass
2. **AiPage:** Renders with new design tokens, sections have correct headers
3. **Connectors:** Can add IMAP connector, test connection, see emails in list
4. **Calendar:** Can add CalDAV connector, see upcoming events
5. **Voice:** Mic button appears, clicking starts recording, text appears in input
6. **AI Context:** Chat message includes connector data in context bundle
7. **Probe test:** Open app, navigate to AI page, verify connectors panel renders
