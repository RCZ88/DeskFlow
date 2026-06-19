# AiChat Design Overhaul — Prompt

## Raw Request
Redesign the AiChat interface to match Claude-quality design with deliberate block-level styling and warm editorial aesthetic.

## Context Reference
See `CONTEXT_BUNDLE.md` in this directory — covers all 20+ components, design tokens, skill principles.

## Engineering Tasks

1. **BlockRenderer routing** — Ensure all 13 block types have corresponding renderers with proper loading/error states
2. **TypewriterText animation** — Wire streaming text effect to AI responses
3. **ThinkingIndicator** — Show during LLM inference, animate with subtle pulse
4. **ChatInput auto-resize** — Smooth height transitions, max-height cap
5. **MessageList auto-scroll** — Smart scroll: auto-follow new messages unless user scrolled up

## Design Tasks

- **User messages**: `bg-indigo-600/20` with left accent border, right-aligned
- **AI messages**: `bg-zinc-800/50` with left accent border, left-aligned
- **Block types**: Distinct visual treatments per block (code=mono+dark bg, table=grid lines, goal=card with icon)
- **Input area**: Glass-morphism top border, subtle glow on focus
- **Header**: Minimal — just model name + clear button, no chrome

## UX Tasks

- Empty state: "Ask me anything about your data" with example prompts
- Streaming: Typewriter effect with blinking cursor
- Error: Inline error block with retry button, never full-page error
- Navigation blocks: Rendered as clickable chips, not raw links

## Response Format

Target AI should produce a structured `RESULT.md` with:
1. Files to modify (path + line ranges)
2. CSS changes (specific classes)
3. New components needed
4. Migration order (dependencies first)
