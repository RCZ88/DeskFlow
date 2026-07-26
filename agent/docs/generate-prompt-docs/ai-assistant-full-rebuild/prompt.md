# PROMPT.md — AI Assistant Full Rebuild: Thinking, Parsing, Interactive Responses, Permissions

---

## RAW REQUEST (verbatim)

> i want so tha tteh feature like going to my preivous prompt by using the up arrow key, and going to the next prompt after that (f we're not on the latest prompt) using the down arrow key
>
> THE AI OUTPU T IS NOT PARSED PROPERLy. THERES NOT EVEN A TEXT BOX FOR IT. OT IS USING THINKING. BUT U DONT PARSE THE THINKING SECTION PROPERLY. IT DOESNT HAV TEH UI FOR TEH THINKING SECITON. THE TEXT WENT ERVYwHERE ebcause theres no contianer whtasoever.
>
> NAD THE CHAT SHOULD BE A SCROLLABLE THING. i dont think u have the capabilities of designing the stuff. I NEED YOU TO USEGENERATE PROMPT FOR THIS. mention every singl e feautre includding the handling of the thinking. the parsing of the ui intenratice response, and the accessing of the items and data, the editing and stuff, how thsoe have like a differnet style and can be shown differently as like a process, and like everything has its the style properly. EXPLAIN THE PROPER FULL CONTEXT on the ai assistant. and YOU SHOULD ASK FOR THE DESIGN OF THE FRONEND AND BACKEND OF EVERYTHING
>
> using all frontend dskills and mcp that YOU HSOULD INCLULDe
>
> AND THE CHAT SHOULD BE A SCROLLABLE THING. I NEED TO BE ABLE TO SCROLL THROUGH THE MESSAGES. THE THINKING MUST BE WRAPPED, AND IT MUST BE DEFAULT IN CLOSED, and WE CNA EXPAND IT LATER
>
> i want the thinking part to be parsed properly. the <thought> tags should be detected and rendered as a collapsible section. the text output should be rendered as markdown with proper formatting. the interactive response cards should have proper styling and the action buttons should have confirmation dialogs. the chat should be a scrollable container with auto-scroll behavior. the session history should be saved properly.

---

## CONTEXT BUNDLE REFERENCE

Read `agent/docs/ai-assistant-full-rebuild/CONTEXT_BUNDLE.md` FIRST. It contains:
- Complete component hierarchy (20+ components)
- ALL IPC endpoints with handler locations
- Full TypeScript types (ParsedMessage, CardAction, ChatMsg, etc.)
- Design tokens (SURFACE, TEXT, ACCENT, MOTION)
- CSS classes for chat, messages, bubbles
- Database schema (ai_chat_threads, ai_chat_messages, ai_chat_memories)
- Provider call chain (useAiChat → IPC → callProvider → streaming)
- What's currently broken (8 issues)

---

## PROBLEM STATEMENT

The AI Assistant chat system has multiple critical issues:

1. **`<thought>` tags not parsed** — AI outputs `<thought>reasoning here</thought>` but it renders as raw text. Must be detected, extracted, and rendered as a collapsible section that is **collapsed by default**.

2. **No markdown rendering during streaming** — TypewriterText shows raw text. Need markdown parsing even during streaming.

3. **Chat not scrollable** — dk-root overflow blocked scrolling. The chat container must be scrollable with auto-scroll to bottom on new messages, but pause when user scrolls up.

4. **Session history not saving** — The list-threads IPC returns `{ success: true, threads: [...] }` but the consumer expected a raw array. Fixed but needs verification.

5. **No proper container for AI output** — Text "goes everywhere" because there's no structured container. Messages need proper wrapping in dk-bubble with max-width constraints.

6. **Interactive response cards need better styling** — ActionListCard, GoalSuggestionCard, FormFillCard all need consistent visual treatment with the new design system.

7. **Permission system incomplete** — Need auto-approve toggle, confirmation dialogs for destructive actions, and visual distinction between safe vs dangerous actions.

---

## THE MANDATE — Complete AI Assistant System

Design and implement a **fully functional AI Assistant** with these subsystems:

### A. Thinking Section (`<thought>` tags)

The AI model outputs `<thought>reasoning content here</thought>` tags in its responses. These MUST be:

1. **Detected** — Parse the raw AI output for `<thought>...</thought>` tags
2. **Extracted** — Remove the thought content from the visible response text
3. **Rendered as collapsible section** — Show as a styled collapsible block that is **CLOSED by default**
4. **Expandable** — User clicks to expand/collapse the thinking section
5. **Visual treatment** — Different from regular text: muted color, monospace font, subtle border, expand icon

**Implementation:**
- In `MessageBubble.tsx`, before rendering markdown, extract `<thought>...</thought>` blocks
- Store extracted thoughts in a separate state
- Render as a collapsible `<details>` element or custom expandable component
- Default state: collapsed
- Visual: `text-[11px] text-zinc-500 font-mono` with a `ChevronRight` icon that rotates on expand

**Parsing logic:**
```ts
function extractThoughts(content: string): { thoughts: string[]; cleanContent: string } {
  const thoughtRegex = /<thought>([\s\S]*?)<\/thought>/g
  const thoughts: string[] = []
  let cleanContent = content
  let match
  while ((match = thoughtRegex.exec(content)) !== null) {
    thoughts.push(match[1].trim())
    cleanContent = cleanContent.replace(match[0], '')
  }
  return { thoughts: cleanContent.trim(), cleanContent: cleanContent.trim() }
}
```

### B. Markdown Rendering (ALL responses)

ALL assistant text (both streaming and final) MUST render as markdown:

- **Headers**: `# h1`, `## h2`, `### h3` with proper typography
- **Bold**: `**text**` → bold with zinc-200 color
- **Italic**: `*text*` → italic with zinc-400 color
- **Code**: `` `code` `` → inline code with pink-300 on zinc-800 background
- **Fenced code**: ````code```` → code block with language label
- **Lists**: `- item` and `1. item` with proper indentation
- **Blockquotes**: `> text` with pink left border
- **Links**: `[text](url)` → pink underlined link
- **Tables**: `| col |` → grid layout with borders

**During streaming**: TypewriterText should also parse markdown as it reveals text. This means the TypewriterText component needs to accept markdown and render it incrementally.

**After streaming completes**: Full markdown rendering via the `renderMarkdown` function.

### C. Chat Container (scrollable)

The chat MUST be a proper scrollable container:

1. **Fixed height container** — `dk-stream` with `flex: 1; overflow-y: auto`
2. **Auto-scroll to bottom** — On new messages, scroll to bottom automatically
3. **Pause on user scroll** — If user scrolls up (>48px from bottom), stop auto-scrolling
4. **Resume on new message** — When user scrolls back to bottom, resume auto-scroll
5. **Smooth scroll** — `scroll-behavior: smooth` for natural feel
6. **Custom scrollbar** — Thin, zinc-colored scrollbar (already in deck.css)

### D. Interactive Response Cards

Each response type renders as a distinct visual card with consistent styling:

| Response Type | Visual Treatment | Actions |
|---|---|---|
| `goal_suggestion` | Emerald accent, goal cards with category badges | Accept/Dismiss buttons |
| `plan_update` | Violet accent, animated diff list (green=added, amber=modified) | Apply button |
| `stats_summary` | Cyan accent, metric grid with count-up animation | None (read-only) |
| `action_list` | Pink accent, checklist with action buttons | Run button + confirmation dialog |
| `digest_item` | Cyan accent, collapsible topic with source links | None (read-only) |
| `connector_status` | Cyan accent, status grid with dots | Sync button |
| `form_fill` | Violet accent, inline form fields | Submit button |
| `chart_data` | Amber accent, rendered chart | None (read-only) |
| `error` | Red accent, error card with recovery text | Retry/Dismiss buttons |

### E. Permission & Safety System

**Action Classification:**
- **Read-only** (safe): stats_summary, digest_item, connector_status → auto-approve
- **Suggestive** (low risk): goal_suggestion, plan_update → require single confirmation
- **Mutating** (medium risk): action_list run-ipc, form_fill submit → require confirmation dialog
- **Destructive** (high risk): delete, remove → require double confirmation

**Confirmation Dialog:**
- Modal overlay with action description
- "Are you sure?" text
- Cancel / Confirm buttons
- Confirmation checkbox for destructive actions

**Auto-Approve Toggle:**
- Shield icon in chat header
- "Auto" mode: all actions execute without confirmation
- "Manual" mode: actions require confirmation (default)
- Visual: amber background when auto-approve is on

### F. Session History & Persistence

**Thread Management:**
- Threads saved to SQLite via `ai-chat:save`
- Thread list loaded via `ai-chat:list-threads`
- Thread metadata: date, title, message count, preview, last message time
- New thread button in topbar
- Thread history drawer accessible from chat

**Persistence Flow:**
1. User sends message → messages array updated
2. After each message pair (user + assistant), call `persist(messages)`
3. `persist` → `ai-chat:save` IPC → SQLite upsert
4. On page load, `loadThread(today)` loads today's messages
5. `refreshThreads()` loads thread list for history drawer

### G. Context Bundle (AI System Prompt)

Before each chat, build a context bundle with:
- **Goals**: today's goals from `getGoals`
- **Stats**: dashboard aggregates from `getDashboardAggregates`
- **Projects**: active projects from `getProjects`
- **AI Usage**: tokens/cost from `getAIUsageSummary`
- **Planning notes**: from `readPlanningMd`
- **Memories**: from `ai-chat:get-memories`

This bundle is prepended as a system message to every chat conversation.

---

## DESIGN SPECIFICATIONS

### Chat Message Styling

**User messages:**
- Right-aligned, flex-direction: row-reverse
- Background: `var(--raised)` (rgba(39,39,42,.7))
- Border: `1px solid var(--line-2)` (rgba(255,255,255,.12))
- Border-radius: `16px 16px 4px 16px` (rounded top, flat bottom-right)
- Text color: `#f4f4f5`
- Max-width: 85%
- Avatar: "CZ" in raised background

**Assistant messages:**
- Left-aligned
- No background on bubble (transparent)
- Text color: `rgba(250,250,250,.88)`
- Max-width: 85%
- Avatar: Sparkles icon in pink gradient

**Thinking section (collapsible):**
- Background: `bg-zinc-900/40` with `ring-1 ring-zinc-800/60`
- Border-radius: `rounded-lg`
- Text: `text-[11px] text-zinc-500 font-mono`
- Expand icon: ChevronRight → ChevronDown on expand
- Default state: collapsed
- Padding: `px-3 py-2`

**Code blocks:**
- Background: `bg-zinc-950/80`
- Border: `border border-zinc-800/60`
- Language label: `text-[10px] text-zinc-500 font-mono`
- Code text: `text-[13px] text-zinc-300 font-mono`

### Card Shell Styling

All response cards use `CardShell`:
- Border-radius: `rounded-xl`
- Border: `ring-1 ring-zinc-800/60`
- Background: `bg-zinc-900/40`
- Left accent bar: 3px colored bar matching card type
- Header: icon + title + badge
- Body: content area with proper spacing
- Actions: right-aligned buttons

### Action Buttons

**Primary action:**
- Background: `bg-pink-500/10`
- Text: `text-pink-300`
- Border: `ring-1 ring-pink-500/20`
- Hover: `bg-pink-500/20`

**Ghost action:**
- Background: transparent
- Text: `text-zinc-400`
- Hover: `bg-zinc-800/60 text-zinc-300`

**Confirmation dialog:**
- Overlay: `bg-black/60 backdrop-blur-sm`
- Dialog: `bg-zinc-900 ring-1 ring-zinc-800 rounded-xl`
- Cancel button: ghost style
- Confirm button: primary style
- Destructive confirm: red accent

### Auto-Approve Toggle

- Position: chat header, before Online/Offline chip
- Default: OFF (Manual mode)
- ON state: amber background, Shield icon, "Auto" label
- OFF state: subtle background, ShieldOff icon, "Manual" label
- Tooltip explains the mode

---

## MCP COMPONENTS TO USE

### shadcn
| Component | Use For |
|-----------|---------|
| card | Standard UI cards |
| dialog | Confirmation modals |
| button | Action buttons (6 variants, 8 sizes) |
| tabs | Thread history tabs |
| tooltip | Button tooltips |
| skeleton | Loading states |
| scroll-area | Chat scroll container |
| textarea | Chat input |
| input | Form fields |
| switch | Auto-approve toggle |
| badge | Status badges |
| separator | Dividers |
| collapsible | Thinking section expand/collapse |
| progress | Agent progress bar |
| checkbox | Confirmation checkboxes |
| dropdown-menu | Thread actions |
| hover-card | Card previews |
| command | Slash command palette |

### Magic UI
| Component | Use For |
|-----------|---------|
| Animated Beam | Connector status connections |
| Border Beam | Card hover effects |
| Number Ticker | Stats count-up animation |
| Blur Fade | Message entrance animation |
| Word Rotate | Mode indicator text |
| Particles | Background ambient effect |
| Confetti | Goal completion celebration |

### Lucide Icons
| Icon | Use For |
|------|---------|
| Bot | AI assistant |
| Send | Send message |
| Square | Stop streaming |
| Mic | Voice input |
| Sparkles | AI indicator |
| Target | Goals |
| Brain | Thinking/thoughts |
| History | Thread history |
| Shield/ShieldOff | Auto-approve toggle |
| ChevronRight/ChevronDown | Expand/collapse |
| Check | Success |
| X | Error/close |
| AlertCircle | Errors |
| Loader2 | Loading spinner |
| RefreshCw | Sync/refresh |
| Trash2 | Delete |
| Plus | New thread |
| Settings | Configure |

### React Bits
135+ animated components available for text animations, particle effects, background effects, hover interactions.

### Iconify
200,000+ icons as fallback when Lucide lacks what you need.

---

## ANTI-SLOP CHECKLIST

After any MCP-sourced component:
1. Re-skin to DeskFlow tokens (zinc-950 base, pink accent for AI/chat)
2. Max rounded-xl (12px), p-5 padding
3. Dark mode only — strip any light variants
4. Geist + JetBrains Mono fonts
5. Glass layer: `bg-zinc-900/80 backdrop-blur-xl`
6. No box-shadow — use border brightness + glass layers
7. Animate transform + opacity only — never width/height
8. Every component has empty/loading/error/populated states
9. All icons from lucide-react — no emoji as UI icons
10. Focus-visible rings use pink-500 pattern

---

## CONSTRAINTS

1. **No new IPC handlers** — Use existing endpoints from CONTEXT_BUNDLE.md
2. **No backend changes** — All changes are frontend (React + IPC calls)
3. **Tailwind CSS v4 only** — `@import "tailwindcss"` syntax
4. **Dark theme only** — zinc/pink/emerald/amber palette
5. **No external chat packages** — Build from scratch using existing patterns
6. **Files are CRLF** — preserve line endings
7. **All card padding = p-5**, max border-radius = rounded-xl
8. **No box-shadow** — use border brightness + glass layers
9. **No spring physics** — use cubic-bezier(0.16, 1, 0.3, 1)
10. **No pure black** — use zinc-950
11. **Animate only transform + opacity** — never width/height/top/left
12. **Every localStorage access in try/catch**
13. **Reduced-motion support** — all animations respect prefers-reduced-motion

---

## VERIFICATION — Full End-to-End Tests

After implementation, these MUST ALL work:

### Thinking Section:
1. AI response with `<thought>reasoning</thought>` renders thinking as collapsed section
2. Click expand shows the thinking content
3. Click collapse hides it
4. Default state is collapsed
5. Visual: muted monospace text with expand icon

### Markdown Rendering:
6. `**bold**` renders as bold text
7. `## heading` renders as heading
8. `` `code` `` renders as inline code
9. ``` ```code``` ``` renders as code block
10. `- list` renders as bullet list
11. `> quote` renders as blockquote
12. `[link](url)` renders as clickable link
13. Markdown renders during streaming (TypewriterText)

### Chat Scrolling:
14. Chat area is scrollable
15. Auto-scrolls to bottom on new messages
16. Pauses auto-scroll when user scrolls up
17. Resumes when user scrolls back to bottom
18. Smooth scroll behavior

### Interactive Cards:
19. GoalSuggestionCard shows Accept/Dismiss buttons
20. ActionListCard shows Run button with confirmation
21. FormFillCard shows form fields with Submit
22. ConnectorStatusCard shows Sync button
23. ErrorCard shows Retry button
24. All cards have consistent CardShell styling

### Permission System:
25. Auto-approve toggle visible in chat header
26. Toggle switches between Auto/Manual modes
27. Manual mode shows confirmation dialog before actions
28. Auto mode executes actions immediately
29. Destructive actions always require confirmation

### Session History:
30. Messages persist across page reload
31. Thread list shows in history drawer
32. New thread button creates fresh conversation
33. Thread switching loads correct messages
34. Thread metadata (preview, count) updates correctly

### Design:
35. All buttons have hover/focus/active/disabled states
36. All data components have empty/loading/error/populated states
37. Messages animate in with stagger
38. Code blocks have proper syntax highlighting background
39. No box-shadow, no spring physics, no rounded-2xl/3xl
40. All cards use DeskFlow glass tokens

---

## IMPLEMENTATION FILES

### Files to Modify:
- `src/components/ai/chat/MessageBubble.tsx` — Add thought extraction + markdown rendering
- `src/components/ai/chat/TypewriterText.tsx` — Add markdown-aware streaming
- `src/components/ai/chat/ChatPanel.tsx` — Add auto-approve toggle, fix scroll behavior
- `src/components/ai/chat/ChatInput.tsx` — Verify history navigation works
- `src/components/ai/chat/ParsedMessageRouter.tsx` — Pass autoApprove to all cards
- `src/components/ai/chat/renderers/ActionListCard.tsx` — Add confirmation dialog
- `src/components/ai/chat/renderers/FormFillCard.tsx` — Improve form styling
- `src/components/ai/chat/renderers/ConnectorStatusCard.tsx` — Improve status display
- `src/components/ai/chat/renderers/ErrorCard.tsx` — Improve error styling
- `src/components/ai/chat/renderers/CardShell.tsx` — Standardize card shell
- `src/components/ai/deck/AiPageDeck.tsx` — Pass autoApprove, fix scroll
- `src/components/ai/deck/deck.css` — Fix scroll, add thought section styles
- `src/pages/AiPage.tsx` — Add autoApprove state, pass to deck
- `src/hooks/useAiChat.ts` — Verify persist/loadThread work correctly

### Files to Create:
- `src/components/ai/chat/ThoughtSection.tsx` — Collapsible thought component
- `src/components/ai/chat/MarkdownRenderer.tsx` — Extracted markdown renderer

### NO new files needed for:
- Backend (all IPC handlers exist)
- Database (schema exists)
- Provider system (works)
- Context bundle (works)
