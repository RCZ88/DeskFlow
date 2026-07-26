# Lyceum Text Selection Fix — Design Prompt

## Raw Request

> "I want to fix the selection feature. The problem is that it requires a functional selection feature. Currently we don't have the function working properly because I'm not currently able to select any text on the thing properly. If I were to select something, it would select it from the start — whichever is the start of the same type. For example, if I were to select any part of the paragraph, it would automatically select the entire paragraph from the start until the part where I highlight it. So what I want you to do is to generate a prompt with the context of how the current texts are being generated, how those texts are displayed, so that the fundamental basic feature that any application has — you should be able to select a word, you should be able to select any text on any page — works properly. This basic feature of selecting doesn't work because we have this custom way of displaying the text that makes selecting it not possible."

## Problem Statement

Text selection in the Lyceum Learn reader is broken at a fundamental level. Users cannot select individual words, partial sentences, or cross-paragraph text. Instead, the browser snaps selection to entire block elements (`<p>`, `<h3>`, etc.). This breaks the AI-powered selection features (Explain, Ask, Simpler, Deeper) that depend on user-selected text, and violates the basic expectation that any text displayed in an application should be selectable character-by-character.

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` first. It contains:
- Complete source code of all affected components (ProseBlock, CalloutBlock, SelectionActions, SelectionFloatingPill, ReaderView, useHighlights)
- The `renderMarkdown` function that converts `.lmd` to HTML
- DOM structure analysis showing why selection breaks
- Existing CSS design tokens for the selection toolbar

## Engineering Task

Design a comprehensive fix for text selection in the Lyceum Learn reader. The solution must:

### 1. Fix ProseBlock paragraph wrapping
The `renderMarkdown` function in `ProseBlock.tsx` wraps each paragraph in `<p>` tags via `dangerouslySetInnerHTML`. This creates block-level boundaries that prevent cross-paragraph selection. Design a solution that:
- Keeps the visual paragraph spacing (margins between paragraphs)
- Allows free-form text selection across paragraph boundaries
- Works within the `dangerouslySetInnerHTML` constraint (cannot switch to React children)
- Preserves the existing markdown rendering (bold, italic, headers, links, code, math, tables)

### 2. Fix CalloutBlock line-by-line rendering
`CalloutBlock.tsx` renders each line as a separate `<p>` with `dangerouslySetInnerHTML`. This breaks selection across lines within a callout. Design a fix that:
- Renders all lines in a single container
- Uses `<br/>` for line breaks instead of separate `<p>` tags
- Preserves inline markdown formatting (bold, italic, code)

### 3. Verify SelectionActions offset calculation
The `getTextOffset` function in `SelectionActions.tsx` walks the DOM tree to calculate text offsets for highlights. With the fixed DOM structure, verify that:
- Offset calculation remains accurate
- Highlights appear at the correct positions
- Cross-block selections produce correct start/end offsets

### 4. Test cross-block selection
After the fix, verify that users can:
- Select a single word by double-clicking
- Select a partial sentence by click-dragging
- Select across paragraph boundaries within the same ProseBlock
- Select across different ProseBlock instances
- Select across ProseBlock → CalloutBlock boundaries
- Select across ProseBlock → CodeBlock boundaries (code blocks may naturally be separate)

## UX Task

Design the interaction flow for text selection:

1. **Single word selection:** Double-click on any word → word is highlighted, floating toolbar appears above with Explain/Ask/Simpler/Deeper + Highlight + Note buttons
2. **Partial sentence selection:** Click and drag across text → selected range is highlighted, toolbar appears
3. **Cross-paragraph selection:** Click in paragraph 1, drag into paragraph 2 → entire selected range is highlighted as one continuous selection
4. **Cross-block selection:** Click in ProseBlock 1, drag into ProseBlock 2 → selection spans both blocks
5. **Selection dismissal:** Click anywhere else → selection is cleared, toolbar disappears
6. **Toolbar positioning:** Toolbar appears centered above the selection, clamped to viewport edges

## Design Task

The visual specs for the selection system:

### Selection highlight
- Browser default text selection color (blue) for the active selection
- After toolbar action, persistent highlights use colors: yellow (#eab308), green (#22c55e), blue (#3b82f6), pink (#ec4899), orange (#f97316)
- Highlighted text gets a subtle background color at 20% opacity

### Selection toolbar
- Position: fixed, centered above selection, z-index: 9999
- Background: #1c1917 with backdrop-blur
- Border: 1px solid #292524
- Shadow: 0 4px 12px rgba(0,0,0,0.35)
- Border radius: 8px
- Buttons: 28x28px, rounded-lg, zinc-400 default, zinc-200 on hover
- Active state: background #292524

## Constraints

- Must work with `dangerouslySetInnerHTML` rendering (cannot switch to React children for ProseBlock)
- Must preserve all existing features: highlights, notes, tutor Ask, assessment quizzes
- Must not introduce new npm dependencies
- Must work on both desktop (mouse selection) and mobile (touch selection)
- Must handle the existing block types: prose, callout, code, math, mermaid, image, video, quiz, chart, table, flow, finchart, svg, layer
- Must preserve the existing motion animations (Framer Motion page transitions)
- Must keep the warm wood aesthetic (dark backgrounds, clay/amber accents, serif typography)

## Deliverable

Provide a single, comprehensive RESULT.md with:
1. Exact code changes for each affected file (ProseBlock.tsx, CalloutBlock.tsx, SelectionActions.tsx, and any others)
2. Before/after DOM structure diagrams
3. CSS changes if needed
4. Test plan for verifying the fix
5. Any edge cases or risks identified
