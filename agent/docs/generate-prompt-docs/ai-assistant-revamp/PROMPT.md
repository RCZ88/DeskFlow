# PROMPT.md — AI Assistant Page Full Revamp

## Raw Request

> "THE CONNECTORTS ISNT SHOWING THE STUFF PORPERLY SINCE THE HEIGHT IS CAPPED. THE AI ASSISTANT PAGE IS JUST A MESS. I NEED THE LAYOUT TO BE FIXED PROPERLY. AND THE FACT THAT THE DIGEST HAS ITS OWN PAGE LEADS ME TO PREFER TO REMOVE THE CARD FROM THE MAIN PAGE OF THE AI ASSISTANT. also didnt we have like a suggestion on what to insert to the ai? like a card for that? and like how do we manage the history chats and everything? and like the memory for every chat and the rag system or something? we need to configure those out. the user chat bubble is also still not on the most side right side its like appending or like its still not updated to the chat space width. the memory context system and like the rag system to remember partially for every chat and being able to load the chats back. i need those features. and mainly the cards showing up NEATLY and PROPERLY. i need you to use all frontend skills and mcp and use the generate-prompt skill to let the other ai design. also i need you to add the google ai studio api key thing to the settings as an option"

---

## Context Bundle Reference

**Read `CONTEXT_BUNDLE.md` first.** It contains the complete source code for every file this redesign touches. Do NOT guess at code shapes — the bundle has verbatim source.

---

## Mandate

You are the **Lead Designer and Engineer** for the DeskFlow AI Assistant page (`/ai`). Design a comprehensive, production-ready solution that addresses ALL of the following issues. Do not offer options — design THE solution.

---

## Problem Statement

The AI Assistant page is broken in multiple ways:

1. **Layout collapse**: The sidebar (3 cards), chat panel, and bottom strip (Focus/Plan/Reflect) fight for a fixed 100vh viewport. The chat gets squeezed to 0px and disappears because `dk-main-row` has `flex:1; min-height:0` and the strip below eats all available space.

2. **Digest redundancy**: The Digest card appears in the sidebar AND has its own "Digest" tab. The user wants it REMOVED from the main deck view entirely — it has its own page.

3. **User bubble misalignment**: User chat bubbles use `align-self:flex-end` + `flex-direction:row-reverse` + `max-width:74%` but the 74% cap makes them narrower than expected inside the chat scroll area. They need to be properly right-aligned and fill appropriate width.

4. **No chat history**: The IPC endpoint `aiChatListThreads` exists in preload but is not wired to any UI. Users cannot browse, load, or delete previous conversations. The current system only loads today's thread.

5. **No memory/RAG**: Each chat starts fresh with a context bundle but has no per-chat memory system. No retrieval-augmented generation. No way for the AI to remember facts from past conversations.

6. **Weak conversation starters**: The empty state has 3 hardcoded suggestions. Needs context-aware, dynamic starters.

7. **No Google AI Studio provider**: The provider system supports generic providers via OpenRouter but Google AI Studio (Gemini) should be a first-class option with its own API key field and direct API endpoint.

8. **Connector card height capped**: The connectors panel in the sidebar gets cut off due to `max-height:36vh` on `.dk-sidebar`.

---

## Engineering Tasks

### Task A: Layout Redesign

Redesign the entire page layout so:
- The chat panel is ALWAYS visible and fills available space (never collapses to 0)
- The sidebar (Today at a glance + Connectors) is compact at the top
- The bottom strip (Focus/Plan/Reflect) either:
  - Scrolls independently below the chat
  - Is moved to a subtab
  - Is collapsible/accordion
- The page scrolls naturally when content exceeds viewport (no fixed 100vh trap)
- `max-height:36vh` on sidebar is removed or made smarter

The current CSS layout chain is:
```
.dk-root (100vh, overflow:hidden) 
  → dk-wrap (flex:1, overflow-y:auto)
    → dk-topbar (flex:none)
    → dk-subnav (flex:none)
    → dk-main-row (flex:1, min-height:0) ← THIS COLLAPSES
      → dk-sidebar (flex:none, max-height:36vh)
      → dk-grid (flex:1, min-height:220px)
        → dk-col → ChatPanel
    → dk-strip (flex:none) ← THIS EATS SPACE
    → dk-foot (flex:none)
```

Design the new layout architecture. Specify exact CSS rules.

### Task B: Remove Digest from Main Deck

The Digest card (`digestSlot`) currently renders in the sidebar. Since the Digest has its own tab ("📰 Digest"), remove it from the main deck sidebar entirely. The sidebar should only contain:
- Today at a glance (metrics)
- Connectors + QuickCommands

Update `AiPageDeck.tsx` to remove the digest column from the sidebar grid (change from 3-column to 2-column).

### Task C: Chat History Management

Wire `aiChatListThreads` (already defined in preload.ts: `ipcRenderer.invoke('ai-chat:list-threads')`) to a UI that allows:
- Browsing previous chat threads (by date, with message count preview)
- Loading a selected thread (call `aiChatLoad(threadDate)`)
- Deleting old threads (call `aiChatReset(threadDate)`)
- Starting a new thread (reset current chat)
- Visual indicator of current thread vs history

Design the UI component (sidebar panel, dropdown, or slide-out drawer). Include exact component structure, state management, and interaction flow.

### Task D: Per-Chat Memory / RAG System

Design a memory system that:
1. **Extracts key facts** from each completed conversation (decisions made, preferences learned, goals discussed)
2. **Stores memories** in a structured format (JSON or SQLite) with:
   - Thread ID reference
   - Fact content
   - Category (goal, preference, decision, context)
   - Timestamp
   - Importance score
3. **Retrieves relevant memories** when starting a new conversation:
   - Embedding-based similarity search (if feasible) OR
   - Keyword/category-based retrieval
4. **Surfaces memories** in the UI:
   - "Things I remember" panel
   - Memory chips in the chat input area
   - Context indicators in the system prompt

Design the data schema, storage approach, retrieval logic, and UI integration. The backend already has SQLite via better-sqlite3.

### Task E: Context-Aware Conversation Starters

Replace the 3 hardcoded suggestions with dynamic starters that change based on:
- **Time of day**: morning → "Plan my day", evening → "Review today's progress"
- **Active goals**: surface suggestions related to current goals
- **Recent activity**: reference recently tracked apps/sites
- **Current context**: if user is in a specific project, suggest project-related starters

Design the suggestion generation logic and the updated `ChatEmptyState` component.

### Task F: User Bubble Alignment Fix

Fix the user chat bubble so it:
- Is properly right-aligned within the chat scroll area
- Uses appropriate width (not capped at 74%)
- Has proper spacing from the right edge
- Maintains visual balance with AI bubbles

Current CSS:
```css
.dk-msg{display:flex;gap:11px;max-width:92%}
.dk-msg.dk-user{align-self:flex-end;flex-direction:row-reverse;max-width:74%}
```

The `.dk-stream` container is `display:flex; flex-direction:column` with no explicit width. The `max-width` percentages are relative to the stream's width. Design the fix.

### Task G: Google AI Studio Provider

Add Google AI Studio (Gemini) as a first-class provider in Settings:
- Dedicated provider entry with:
  - Label: "Google AI Studio"
  - API key field (Google AI Studio API key)
  - Pre-configured models: gemini-2.0-flash, gemini-2.5-pro, gemini-2.5-flash
  - Base URL: `https://generativelanguage.googleapis.com/v1beta`
  - Template ID: `google-ai-studio`
- The existing provider system in Settings supports: `{ id, label, models, enabled, apiKey, baseUrl, templateId, extraConfig }`
- The `providerChatCall` IPC handler needs to support Google AI Studio's API format (REST API with `contents` array)

Design the provider template, the Settings UI addition, and the main.ts handler modification for Google AI Studio's API format.

---

## Design Constraints

1. **Must work with existing IPC infrastructure** — all backend endpoints listed in CONTEXT_BUNDLE.md already exist
2. **Must preserve the dark glass-morphism aesthetic** — `var(--canvas)`, `var(--surface)`, backdrop-blur, gradient accents
3. **Must maintain the structured output contract** — the JSON message types (goal_suggestion, plan_update, stats_summary, etc.) must continue to work
4. **Must be compatible with the existing `useAiChat` hook** — extend it, don't replace it
5. **All new components must use the existing design tokens** — `var(--pink)`, `var(--emerald)`, `var(--violet)`, `var(--cyan)`, `var(--mono)`, `var(--sans)`
6. **Must handle all 4 states**: empty, loading, error, populated — for every new component
7. **Must preserve the existing accent-stripe card pattern** — `::before { width:3px; left:0 }` with category colors

---

## Frontend Design Skills Inventory

The target AI must apply ALL of these design skillsets:

1. **Frontend Design** — DeskFlow-specific component patterns, tokens, spacing, typography, glass cards
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback
3. **Impeccable** — 7 design dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns
4. **Motion — Bring the UI Alive** — Liveliness Levels (L1 Composed / L2 Responsive / L3 Expressive), motion taxonomy, recipes
5. **UI UX Pro Max** — industry-specific design rules (dev tools, AI/ML), style library
6. **Design Taste System** — master aggregator, design variance knobs, anti-repetition rules
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist

---

## MCP Component Inventory

| Component | Source | Use for |
|-----------|--------|---------|
| scroll-area | shadcn | Chat message scroll container |
| sidebar | shadcn | Chat history sidebar/panel |
| tabs | shadcn | Deck/Digest tab navigation |
| message | shadcn | Chat message container |
| bubble | shadcn | Chat message bubbles |
| input | shadcn | Chat input field base |
| dialog | shadcn | Thread management modals |
| skeleton | shadcn | Loading states |
| tooltip | shadcn | Icon button tooltips |
| dropdown-menu | shadcn | Thread actions menu |
| typing-animation | Magic UI | Streaming text effect |
| Animated Beam | Magic UI | Connection lines between memory nodes |
| Number Ticker | Magic UI | Metric counter animations |
| Particles | Magic UI | Background ambient effect |
| Bot, Send, Sparkles, History, Brain, MessageSquare, Trash2, Plus | Lucide | Icons |
| 135+ animated components | React Bits | Additional UI enhancements |
| 200k+ icons | Iconify | Fallback icon library |

---

## Anti-Slop Checklist

After designing any component, verify:
1. ✅ Re-skinned to DeskFlow tokens (var(--pink), var(--surface), etc.)
2. ✅ Max rounded-xl, p-5 padding
3. ✅ Dark mode only (no light mode variants)
4. ✅ Geist + JetBrains Mono fonts
5. ✅ Glass layer (var(--surface) + backdrop-blur)
6. ✅ No default purple gradients
7. ✅ No generic hero patterns
8. ✅ Proper empty/loading/error/populated states for EVERY component
9. ✅ Hover/focus/disabled states on all interactive elements
10. ✅ Smooth transitions on state changes

---

## Output Format

Provide a comprehensive design specification as a single RESULT.md with:

1. **Layout Architecture** — exact CSS rules for the new page layout
2. **Component Specifications** — for each new/modified component:
   - Props interface (TypeScript)
   - State management
   - Render structure (JSX)
   - All 4 states (empty/loading/error/populated)
   - Interaction handlers
3. **Data Schema** — for the memory/RAG system (SQLite tables, JSON shapes)
4. **IPC Additions** — any new IPC channels needed (if any)
5. **Provider Integration** — Google AI Studio handler code
6. **Animation Specs** — motion curves, durations, triggers
7. **File Change List** — every file that needs modification with specific line ranges

Be exhaustive. Include actual code, not pseudocode. The implementing agent needs to copy-paste your specifications into the codebase.
