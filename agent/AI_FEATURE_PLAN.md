# AI Assistant Feature Plan

## Feature 1: Persistent Chat Messages Across Page Switches

**Root cause**: `useAiChat` hook only calls `persist()` when a send completes (in `finish()`), not on every message change. If the user navigates away mid-conversation, un-persisted messages are lost.

**Fix**: Add a `useEffect` that persists messages whenever they change (debounced), matching what the standalone `AiChat` component does.

**Files to modify**:
- `src/hooks/useAiChat.ts` — Add debounced persist effect on `messages` change

---

## Feature 2: Slash Command Coloring

**Current state**: Slash commands exist in `useSlashCommands.ts` but are not visually distinguished in the chat input.

**Plan**: In `ChatInput.tsx`, detect when text starts with `/` and render the command portion in a different color (e.g., pink/cyan accent). Use a transparent overlay approach similar to how voice interim text is shown.

**Files to modify**:
- `src/components/AiChat/ChatInput.tsx` — Add slash command color highlighting

---

## Feature 3: AI Response Bubble Styling

**Current state**: `MessageBubble.tsx` has basic rounded styling but user wants a more unique/distinct look for AI responses.

**Plan**: Enhance the assistant bubble with:
- Subtle gradient background (zinc-900 → zinc-950)
- Left accent bar (2px pink/violet stripe)
- Better spacing and typography
- Keep user bubble as-is (pink-tinted)

**Files to modify**:
- `src/components/AiChat/MessageBubble.tsx` — Restyle assistant bubble

---

## Feature 4: Session Renaming + Date/Time Display

**Current state**: `ChatHistory.tsx` shows threads with date and message count, but no rename UI. `ThreadMeta` has a `title` field.

**Plan**:
- Add inline rename (click title → edit input) in `ChatHistory`
- Show creation date + time in thread list
- Add `renameThread` function to `chatPersistence.ts`
- Wire up IPC in `useAiChat` hook

**Files to modify**:
- `src/services/chatPersistence.ts` — Add `renameThread()`
- `src/components/ai/chat/ChatHistory.tsx` — Add inline rename UI + date/time
- `src/hooks/useAiChat.ts` — Add `renameThread` to interface

---

## Feature 5: Custom Slash Commands System

**Current state**: Hardcoded slash commands in `useSlashCommands.ts`.

**Plan**: Build a custom commands system:
- **Storage**: localStorage key `deskflow-custom-slash-commands` with JSON array of `{ id, name, description, prompt, category }`
- **UI**: Settings section or modal to manage custom commands
- **Execution**: Custom commands inject their prompt into the AI chat and send to the AI
- **Autocomplete**: Show command suggestions when user types `/`

**Custom command inputs (for effectiveness)**:
1. **Name** (required): The command word, e.g., `standup`
2. **Description** (optional): What the command does
3. **Prompt template** (required): The text sent to AI, with `{args}` placeholder for user input
4. **Category** (optional): For organizing commands (productivity, dev, personal)

**Example**: `/standup` → sends "Write a standup summary based on my recent activity: {args}" to AI

**Files to create/modify**:
- `src/hooks/useSlashCommands.ts` — Add custom command support
- `src/services/customSlashCommands.ts` — CRUD for custom commands (new file)
- `src/components/ai/chat/SlashCommandManager.tsx` — UI to manage commands (new file)
- `src/components/AiChat/ChatInput.tsx` — Add autocomplete dropdown for `/`
