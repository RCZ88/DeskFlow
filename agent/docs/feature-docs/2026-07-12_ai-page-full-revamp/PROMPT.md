# PROMPT.md — AI Assistant Page Full Revamp

## Raw Request

> "are you serious with the ui? it looks horrendous, and i feel like each of the cards needs its own full page viewing. and like i need you to make sure that the key features and the important features on the mail thing and like viewing them and like referring them on the chat ai chat and everything like that. using all design skills. everything and the layout its just so terrible. and like the user input should be different when like we do the "/" on the text input. it should show like the options, and i do feel like the quick commands card is sort of redundant. and the placement of it being quite far relatively to the ai assistant chatbox made it weird. it made it redundant and doesnt show its purpose. also, when i try to click on the link and entering the email i got this: The browser you're using doesn't support JavaScript. does it even save the connection properly? i have connected previously but now theres like nothing. have we make sure that the ui for the mails and the calendar is already available?? have we make sure that the connectors actually retrieve the proper data and everything to be able to displayed properly and accessed by the ai to be able to you know have the ai plan the stuff and like other things and we are able to insert stuff or reply using and set calendar events using the ai chats? and then like / commands maybe to make it more consistent? also didnt we have like a suggestion on what to insert to the ai? like a card for that? and like how do we manage the history chats and everything? and like the memory for every chat and the rag system or something? we need to configure those out. the user chat bubble is also still not on the most side right side. the memory context system and like the rag system to remember partially for every chat and being able to load the chats back. i need those features. and mainly the cards showing up NEATLY and PROPERLY. also i need you to add the google ai studio api key thing to the settings as an option"

---

## Context Bundle Reference

**Read `CONTEXT_BUNDLE.md` first.** It contains the actual source code for every file this redesign touches.

---

## Mandate

You are the **Lead Designer and Engineer** for the DeskFlow AI Assistant page. This is a COMPLETE revamp. Design ONE comprehensive solution covering ALL of the following. Do not offer options — design THE solution.

---

## ALL Features to Implement

### 1. Layout Overhaul
- REMOVE QuickCommands card (redundant with slash commands)
- Chat panel becomes the primary focus (full width, not cramped in 2-col grid)
- "Today at a glance" becomes a compact single-line status bar above chat
- Connectors accessible via sidebar toggle or modal, not crammed into hero
- Each email/calendar card needs proper full-page viewing (modal or slide-over)
- User bubbles properly right-aligned (not capped at 74%)

### 2. Slash Command Palette
- When user types "/" in ChatInput, show a dropdown palette below the input
- Commands: /unread, /inbox, /calendar, /today, /sync, /email, /plan, /digest, /reflect, /focus
- Each command shows: icon, name, short description
- Keyboard navigation: Arrow up/down, Enter to select, Escape to close
- Filter commands as user types after "/"
- Styled with DeskFlow glass-morphism

### 3. Connector System
- ConnectorsPanel must show actual items (emails with subject/from/date, events with title/time)
- Full-page modal view for emails: subject, from, date, full body, reply/forward/mark-read
- Full-page modal view for events: title, time, duration, description
- Auto-sync every 30 minutes
- Fix Google sign-in (open in system browser via shell.openExternal)

### 4. AI Integration
- Activate buildConnectorContext() dead code — AI must see connector data
- Include last 5 emails + next 3 events in system prompt
- AI can reply to emails (structured action with user confirmation)
- AI can create calendar events (structured action with user confirmation)
- AI can mark emails read/unread

### 5. Chat History
- Browse previous conversations (by date)
- Load old threads
- Delete old threads
- Start new thread

### 6. Memory / RAG System
- Extract key facts from conversations (goals, preferences, decisions)
- Store in SQLite with categories
- Retrieve relevant memories for new chats
- Show memory chips above input

### 7. Conversation Starters
- Time-of-day aware greetings
- Dynamic suggestions based on context
- Slash commands available as suggestion chips

### 8. Google AI Studio
- Dedicated provider in Settings with API key field
- Pre-configured models: gemini-2.0-flash, gemini-2.5-pro, gemini-2.5-flash
- Direct API endpoint (generativelanguage.googleapis.com)

### 9. Chat Input Redesign
- Remove terminal `>_` prefix
- Modern textarea with glass background
- Slash command palette integrates below when "/" typed
- Memory chips above input
- Connector status bar above memory chips

---

## Design Constraints

1. Must use existing design tokens (var(--pink), var(--cyan), etc.)
2. Must preserve all existing IPC contracts
3. Must handle all 4 states (empty/loading/error/populated)
4. Dark glass-morphism aesthetic only
5. Must be responsive

---

## Frontend Design Skills (ALL)

1. **Frontend Design** — DeskFlow component patterns, tokens
2. **Human-Centric UX** — empty/loading/error states
3. **Impeccable** — 7 design dimensions, 27 anti-patterns
4. **Motion — Bring the UI Alive** — Liveliness Levels
5. **UI UX Pro Max** — dev tools, AI/ML design rules
6. **Design Taste System** — anti-repetition
7. **frontend-external-infra** — source routing, anti-slop

---

## MCP Components

| Component | Source | Use for |
|-----------|--------|---------|
| command | shadcn | Slash command palette |
| dialog | shadcn | Email/calendar full view modal |
| scroll-area | shadcn | Email body scrolling |
| card | shadcn | Connector cards |
| badge | shadcn | Unread indicators |
| skeleton | shadcn | Loading states |
| animated-list | Magic UI | Command palette items |
| Mail, Send, Calendar, Clock | Lucide | Icons |
| Search, Command, X | Lucide | Command palette |

---

## Anti-Slop Checklist

1. ✅ Re-skinned to DeskFlow tokens
2. ✅ Max rounded-xl, p-5 padding
3. ✅ Dark mode only
4. ✅ Geist + JetBrains Mono fonts
5. ✅ Glass layer (backdrop-filter: blur)
6. ✅ Empty/loading/error/populated states
7. ✅ Hover/focus/disabled states
8. ✅ Smooth transitions

---

## Output Format

Provide RESULT.md with:
1. **Layout Architecture** — CSS rules for new layout
2. **Component Specs** — all new/modified components (props, state, JSX, all 4 states)
3. **Slash Command Palette** — full spec with keyboard navigation
4. **Email/Calendar Modal** — full spec with actions
5. **Connector Integration** — display, AI context, actions
6. **Memory/RAG System** — schema, extraction, retrieval
7. **Google AI Studio** — provider template
8. **File Change List** — every file to modify/create
