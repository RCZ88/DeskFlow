# Collaboration Request: Lyceum Visuals Quality — Round 3 Context Response

## Your Role
You are the Specialist AI. I am the Project Owner AI. I know the codebase; you know how to design and architect solutions. We are continuing from Round 2 where you provided a comprehensive analysis of why Lyceum lesson output feels worse than chat.

## What Changed Since Your Analysis

**Critical finding: Your Layer 2 Fix #1 is already built.**

You wrote: *"A sandboxed HTML renderer for ::: html blocks. Use an iframe with sandbox='allow-scripts' to execute the JS safely."*

This already exists. Here is the actual renderer:

```tsx
// src/components/learn/blocks/WidgetHost.tsx
<iframe
  srcDoc={block.html}
  sandbox="allow-scripts"
  style={{ height: `${height}px` }}
/>
```

- `sandbox="allow-scripts"` — JS executes in the iframe
- `srcDoc={block.html}` — HTML content injected directly
- `widget:height` message listener — iframe signals its desired height

**This changes the priority.** The renderer can already handle interactive HTML. The bottleneck is purely the SYSTEM PROMPT not teaching the AI to write rich interactive blocks.

## The Real Bottleneck: master-prompt.md

The current system prompt (v4.0, 273 lines):

1. **Parser rules dominate** — 5 "CRITICAL" rules at the top, before any teaching guidance
2. **Lists 18 visual types but shows 0 interactive examples** — only mermaid, chart, code, quiz get examples
3. **No mention that ::: html executes JavaScript** — the AI doesn't know it can write interactive content
4. **"Never use ::: widget"** in hard guardrails — actively prevents the AI from using the one block type that supports JS
5. **Variety checklist counts block types** — "at least 4 DIFFERENT block types" not "at least 1 interactive block"

## What We Need From You

1. **Rewrite the Visual Depth section** of master-prompt.md with:
   - The temperature slider example (from your analysis) as a concrete ::: html example
   - 2 more examples at different mastery levels
   - Clear statement that ::: html executes JavaScript in a sandboxed iframe

2. **Reprioritize the prompt rules:**
   - Move parser rules to a compact "Syntax Quick Reference" appendix
   - Lead with teaching quality, not compliance
   - Replace "variety checklist" with "depth requirements"

3. **Answer these questions:**
   - Should tone be a learner profile override or global change?
   - Is Layer 3 (separate documents from labs) in scope this round?
   - Should "Never use ::: widget" be removed from guardrails?

## Context Files
- Full system prompt: resources/learn/prompts/master-prompt.md (273 lines, embedded in CONTEXT_BUNDLE.md)
- WidgetHost.tsx: src/components/learn/blocks/WidgetHost.tsx (74 lines, embedded in CONTEXT_BUNDLE.md)
- BlockRenderer.tsx: src/components/learn/blocks/BlockRenderer.tsx (190 lines, embedded in CONTEXT_BUNDLE.md)
- parseLessonMarkdown.ts: Lines 330-343 show how ::: html is parsed

## Conversation Protocol
1. You ask specific questions using `REQUEST:` format
2. I fetch and respond with `CONTEXT:` format (actual source code)
3. When converged, produce RESULT.md with the complete rewritten prompt
