# PROMPT.md — Fix the Entire Lyceum AI Tutor System

## Raw Request

> "all the ai features such as the chats and stuff doesn't work. the ai response is not shown we dont have access to what provider and model it use. i would like you to look at the ai assistant backup before it got revamped structure and logic where it has all the features of like showing the updating, showing the thinking properly. showing the messages properly. and also, the highlight button doesn't work, it doesn't highlight anything. making a comment note on something also doesn't work. the system PROMPT FOR EXPLAIN AND OTHER STUFF DOESN'T EXIST. HOW THE FUCK DO YOU EXPECT THE AI TO KNOW WHAT CONTEXT AND EVERYTHING. the ENTIRE SYSTEM of the ai system and everything on the lyceum is NOT IMPLEMENTED PROPERLY. the system prompt SHOULD NOT SHOW UP TO THE USER. the CHAT shouldn't also appear. since its a learning thing, it shouldn't be in a form of a chat. UNLESS ITS A QUESTION that the user wants to ask, the rest of the things like explain and stuff should be put outside of the chat."

## Context

Read `CONTEXT_BUNDLE.md` in this directory. It contains the COMPLETE source code (every line, every file) for the broken system. The target AI must read this first.

## Problem Statement

The Lyceum Learn page's AI tutor system is completely non-functional. Every AI-powered feature is broken due to missing preload bridges, generic system prompts, and incorrect UI patterns.

## Root Causes Identified

### Cause 1: 14 preload bridges missing
`src/preload.ts` lines 1060-1109 does NOT define `learnTutorStream`, `onTutorToken`, `learnAddNote`, `learnDeleteNote`, `learnToggleNotePin`, `learnGetNotes`, `learnGetAllNotes`, `learnGetTutorDashboard`, `learnDecideProposal`, `learnAddMessage`, `learnGetConversation`, `learnResolveConversation`, `learnCreateProposal`, `learnStartConversation`. The backend IPC handlers ALL exist in `src/services/learn/index.ts` lines 233-312. The preload bridge was simply never wired.

### Cause 2: TutorPanel V2 detection fails
`TutorPanel.tsx:55`: `const supportsV2 = !!(api?.learnTutorStream && api?.onTutorToken);` — both are undefined → `supportsV2 = false` → V2 streaming dead. Falls to V1 which also fails because the V1 answer rendering path (line 258) requires `displayState === 'grounded' && v1Answer && !v1Answer.escalated && !supportsV2` — but when V1 loading completes, the state logic at line 151 (`displayState = v1Loading ? 'streaming' : v1Answer ? ...`) may not transition correctly.

### Cause 3: System prompt is mode-agnostic
`TutorService.TUTOR_SYSTEM_PROMPT` (line 10) and `TutorServiceV2.V2_SYSTEM_PROMPT` (line 17) are identical generic prompts. `handleSelectionAsk` in `LearnPage.tsx:311-315` just prepends "Explain: " / "Simplify: " / "Go deeper on: " to the question text. The AI receives the same system prompt regardless of mode — it has NO idea whether to explain simply, go deeper, or just answer.

### Cause 4: Chat UI for all actions
TutorPanel is a 320px side panel with input box + send button (chat UI). When user clicks "Explain" on highlighted text, it opens this chat panel. But for learning actions (Explain/Simpler/Deeper), the answer should appear INLINE in the reader, not in a chat side panel. Only "Ask" (free-form question) should use chat.

## The Mandate

Design a complete fix for the Lyceum AI tutor system. This is NOT a redesign — the backend services exist and work. The fix is: (1) wire the preload bridges, (2) add mode-specific system prompts, (3) fix the UI to not use chat for non-question actions, (4) ensure highlights and notes work.

## Engineering Tasks

### Task A: Wire ALL 14 missing preload bridges

In `src/preload.ts`, insert these AFTER line 1083 (after `learnBuildPromptFromRecipe`):

```typescript
  // ========== Tutor V2 Streaming ==========
  learnTutorStream: (params: { nodeId: string; blockId: string; question: string; convId?: string }) =>
    ipcRenderer.invoke('learn:tutorStream', params),
  onTutorToken: (callback: (data: { blockId: string; token: string; done: boolean }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('learn:tutorToken', handler);
    return () => ipcRenderer.removeListener('learn:tutorToken', handler);
  },

  // ========== Notes ==========
  learnAddNote: (params: { nodeId: string; text: string; tags?: string[]; blockRef?: string }) =>
    ipcRenderer.invoke('learn:addNote', params),
  learnGetNotes: (params: { nodeId: string }) => ipcRenderer.invoke('learn:getNotes', params),
  learnGetAllNotes: (params?: { limit?: number }) => ipcRenderer.invoke('learn:getAllNotes', params || {}),
  learnDeleteNote: (params: { noteId: string }) => ipcRenderer.invoke('learn:deleteNote', params),
  learnToggleNotePin: (params: { noteId: string; pinned: boolean }) => ipcRenderer.invoke('learn:toggleNotePin', params),

  // ========== Tutor V2 Extras ==========
  learnCreateProposal: (params: { nodeId: string; blockId: string; title: string; bodyMd: string; actions: string[] }) =>
    ipcRenderer.invoke('learn:createProposal', params),
  learnDecideProposal: (params: { proposal_id: string; approved: boolean; reason?: string }) =>
    ipcRenderer.invoke('learn:decideProposal', params),

  // ========== Conversations ==========
  learnStartConversation: (params: { id: string; nodeId: string; blockId: string }) =>
    ipcRenderer.invoke('learn:startConversation', params),
  learnAddMessage: (params: { nodeId: string; blockId?: string; role: string; text: string }) =>
    ipcRenderer.invoke('learn:addMessage', params),
  learnGetConversation: (params: { blockId: string }) => ipcRenderer.invoke('learn:getConversation', params),
  learnResolveConversation: (params: { convId: string }) => ipcRenderer.invoke('learn:resolveConversation', params),

  // ========== Dashboard ==========
  learnGetTutorDashboard: () => ipcRenderer.invoke('learn:getTutorDashboard'),
```

### Task B: Add mode-specific system prompts

The `ask()` method in both `TutorService` and `TutorServiceV2` must accept a `mode` parameter (`'explain' | 'ask' | 'simpler' | 'deeper'`). When mode is provided, use a mode-specific system prompt INSTEAD of the generic one:

- **Explain**: "You are an expert teacher. Explain the following concept clearly and thoroughly. Use analogies, step-by-step breakdowns, and concrete examples. Assume the learner has basic knowledge but needs a clear explanation. Return JSON: { answer_md, used_source_ids, used_fact_ids, suggested_next }"
- **Simpler**: "You are a patient tutor simplifying a concept. Rewrite the following in the simplest possible terms. Use everyday language, short sentences, and relatable analogies. A 12-year-old should understand it. Return JSON: { answer_md, used_source_ids, used_fact_ids, suggested_next }"
- **Deeper**: "You are an advanced instructor going deeper on a topic. Provide nuanced analysis, edge cases, advanced patterns, and connections to other concepts. Assume the learner already understands the basics. Return JSON: { answer_md, used_source_ids, used_fact_ids, suggested_next }"
- **Ask**: Use the existing generic prompt (no change).

The `handleSelectionAsk` in `LearnPage.tsx:311` must pass `mode` to the backend. Modify `learn:askTutor` IPC handler to accept and forward `mode`. Modify `TutorService.ask()` and `TutorServiceV2.ask()` to accept `mode` and select the appropriate system prompt.

### Task C: Fix TutorPanel — inline answers for Explain/Simpler/Deeper

Design the UI fix so that:
1. When user clicks "Explain" / "Simpler" / "Deeper" on highlighted text → the answer appears as an INLINE ANSWER CARD in the reader content area (below the current node content), NOT in the TutorPanel side panel
2. When user clicks "Ask" → the TutorPanel chat opens (existing behavior)
3. The TutorPanel must show provider/model info at the top (e.g., "Powered by Claude 3.5 Sonnet")
4. System prompt must NEVER be visible to the user

### Task D: Fix highlight button wiring

Verify `SelectionActions.tsx` `onCreateHighlight` callback connects to `useHighlights.ts` `createHighlight` through `ReaderView.tsx`. The highlight system uses localStorage via `highlightAnchor.ts` — no backend changes needed.

### Task E: Fix note creation

Once preload bridges are wired (Task A), notes should work. Verify the full chain: `api.learnAddNote()` → IPC `learn:addNote` → `noteService.addNote()` → DB → UI update.

### Task F: Show provider/model info

Add a small info line at the top of TutorPanel showing which AI provider and model is being used. Add IPC endpoint `learn:getTutorConfig` returning `{ provider: string, model: string }`.

## Constraints

1. ALL backend IPC handlers already exist. Do NOT create new handlers — only wire preload bridges.
2. Highlights use localStorage. Do NOT move to database.
3. Notes use SQLite via `note.service.ts`. DB schema already has `learn_notes` table.
4. Do NOT change TutorService/TutorServiceV2 class signatures — only modify system prompts and add mode parameter.
5. TutorPanel must remain side panel for chat (Ask mode) but Explain/Simpler/Deeper answers render inline.
6. System prompt must NEVER be rendered in the UI.

## Requirement Checklist

- [ ] All 14 missing preload bridges wired
- [ ] Mode-specific system prompts for Explain/Simpler/Deeper/Ask
- [ ] TutorPanel shows provider/model info
- [ ] System prompt never visible to user
- [ ] Explain/Simpler/Deeper answers render inline (not in chat)
- [ ] Ask mode uses chat panel
- [ ] Highlight button creates highlights via localStorage
- [ ] Note creation works end-to-end
- [ ] Note deletion works
- [ ] Note pinning works
- [ ] Build succeeds
