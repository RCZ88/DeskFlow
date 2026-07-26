# AiChat Design Overhaul — Context Bundle

## Target
Redesign AiChat UI from basic markdown rendering to Claude-quality structured chat with deliberate block-level styling.

## Components to Redesign

### Core Chat Components
- `src/components/AiChat/AiChat.tsx` — Main container, input+message list, pipeline state
- `src/components/AiChat/ChatHeader.tsx` — Title, clear button, model selector
- `src/components/AiChat/ChatInput.tsx` — Textarea + send button, auto-resize
- `src/components/AiChat/MessageBubble.tsx` — Single message wrapper (user vs AI styling)
- `src/components/AiChat/MessageList.tsx` — Scrollable message container, auto-scroll
- `src/components/AiChat/BlockRenderer.tsx` — Routes parsed blocks to renderers

### Block Components
- `src/components/AiChat/blocks/TextBlock.tsx` — Markdown-rendered text
- `src/components/AiChat/blocks/ErrorBlock.tsx` — Error display
- `src/components/AiChat/blocks/NavigationBlock.tsx` — Navigation suggestions
- `src/components/AiChat/blocks/GoalCreateBlock.tsx` — Goal creation UI
- `src/components/AiChat/blocks/GoalDeleteBlock.tsx` — Goal deletion confirm
- `src/components/AiChat/blocks/GoalListBlock.tsx` — Goal listing
- `src/components/AiChat/blocks/NewsItemBlock.tsx` — News items
- `src/components/AiChat/blocks/DataSummaryBlock.tsx` — Data summaries
- `src/components/AiChat/blocks/Inline.tsx` — Inline content
- `src/components/AiChat/blocks/GroupShell.tsx` — Grouped content wrapper
- `src/components/AiChat/blocks/SourcesBlock.tsx` — Source citations
- `src/components/AiChat/blocks/TableBlock.tsx` — Data tables
- `src/components/AiChat/blocks/ConfirmBlock.tsx` — Confirmation dialogs

### New/Unused Components
- `src/components/AiChat/ThinkingIndicator.tsx` — Thinking animation
- `src/components/AiChat/TypewriterText.tsx` — Typewriter effect

### Services
- `src/services/parseBlocks.ts` — Block parsing logic
- `src/services/ai/aiAgentService.ts` — AI agent service

## Design Tokens

- Chat bg: `bg-zinc-900/95`
- User bubble: `bg-indigo-600/20` with `border-indigo-500/30`
- AI bubble: `bg-zinc-800/50` with `border-zinc-700/30`
- Accent: `indigo-400`
- Text: `zinc-100` primary, `zinc-400` secondary
- Font: system UI, mono for code
- Radius: `rounded-lg` for bubbles, `rounded-md` for blocks
- Spacing: 4px grid

## Design Skill Principles

- **impeccable**: 7 design domains, 23 commands, 27 anti-patterns
- **design-taste**: variance/motion/density knobs
- **taste-skill**: tunable knobs, aesthetic matrix
- **ui-ux-pro-max**: industry-specific design rules
- **frontend-design**: core UI/UX principles, DeskFlow conventions

## Constraints

- Everything in `src/components/AiChat/` — no new top-level directories
- ParseBlocks service determines block type → BlockRenderer routes to correct component
- Blocks render inside MessageBubble, which wraps in role-aware styling
- Loading/streaming states handled by AiChat container
