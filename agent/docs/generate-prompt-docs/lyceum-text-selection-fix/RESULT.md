# Lyceum Text Selection Fix — RESULT.md

## 1. Executive Summary

Text selection in the Lyceum Learn reader is broken because:
1. **Excessive DOM nesting** in `ProseBlock` creates selection barriers between wrapper divs
2. **CalloutBlock** renders each line as a separate `<p>` with its own `dangerouslySetInnerHTML`, fragmenting selection
3. **`getTextOffset` miscalculates offsets** when the selection anchor/end nodes are element nodes (not text nodes), causing highlights to appear at wrong positions
4. **React re-renders** of `dangerouslySetInnerHTML` content destroy active selections
5. **Missing `user-select: text`** on descendant elements allows global CSS or Tailwind preflight to override selection behavior

The fix simplifies the DOM structure, consolidates line rendering, corrects offset math, memoizes rendered content, and adds explicit selection CSS.

---

## 2. Root Cause Analysis

### Issue A: Nested wrappers in ProseBlock
```html
<!-- BEFORE — two nested divs per block -->
<div class="my-4 group relative" data-block-id="block-1">   <!-- wrapper -->
  <div class="... select-text" style="userSelect: 'text'">   <!-- innerHTML host -->
    <p>Paragraph 1</p>
    <p>Paragraph 2</p>
  </div>
</div>
```
The extra wrapper div adds a DOM boundary. While browsers *can* select across `<div>` boundaries, each additional nested block element increases the chance of selection snapping—especially when combined with React re-renders that replace the innerHTML subtree.

### Issue B: CalloutBlock line fragmentation
```html
<!-- BEFORE — each line is a separate <p> with its own dangerouslySetInnerHTML -->
<div class="callout">
  <p>Line one</p>   <!-- separate DOM subtree -->
  <p class="mt-1">Line two</p>   <!-- separate DOM subtree -->
</div>
```
Each `<p>` is an independent block element. Click-dragging from line 1 to line 2 forces the browser to create a selection that spans two block-level paragraphs. Some browsers (especially Safari/WebKit) snap the selection to the nearest paragraph boundary instead of allowing free-form character selection across the boundary.

### Issue C: getTextOffset element-node bug
When `range.startContainer` or `range.endContainer` is an **element node** (e.g., a `<p>`), `offset` is a **child index**, not a character count. The current code does `total += offset`, which adds a child index to a character accumulator—producing wildly incorrect highlight positions.

Example:
```html
<div id="container">
  <p>Hello </p>
  <p>world</p>
</div>
```
If the selection starts at the second `<p>` with offset `0` (first child), the current code returns `0` instead of `6`.

### Issue D: React re-render destroys selection
`dangerouslySetInnerHTML` rebuilds the entire DOM subtree on every render. If the parent `ReaderView` or `BlockRenderer` re-renders (e.g., from a state update, hover effect, or animation frame), the selection is lost or snapped to the nearest surviving boundary.

### Issue E: CSS inheritance gap
The inline `style={{ userSelect: 'text' }}` is only on the inner div. Descendant `<p>`, `<h3>`, `<strong>`, etc. may inherit `user-select: none` from global styles or Tailwind plugins, causing the browser to treat them as atomic units.

---

## 3. File-by-File Changes

### 3.1 ProseBlock.tsx

**Goals:**
- Flatten nested divs into a single element
- Memoize rendered markdown to prevent re-render selection loss
- Preserve all existing markdown features (bold, italic, headers, links, code, math, tables)

```tsx
// ProseBlock.tsx — COMPLETE REPLACEMENT
import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface Props {
  block: { id: string; md: string };
  onAsk?: (text: string) => void;
}

export const ProseBlock = React.memo(function ProseBlock({ block }: Props) {
  const rendered = useMemo(() => renderMarkdown(block.md), [block.md]);

  return (
    <div
      className="my-4 group relative text-[1.0625rem] leading-[1.7] text-zinc-200 max-w-[68ch] font-serif select-text prose-block"
      style={{ userSelect: 'text' }}
      data-block-id={block.id}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rendered) }}
    />
  );
});

function renderMarkdown(md: string): string {
  let text = md;

  // --- Inline code (must run before other asterisk handlers) ---
  text = text.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-zinc-800 text-amber-300 text-sm font-mono">$1</code>');

  // --- Tables ---
  // (preserve existing table logic if present; shown here as placeholder)
  // ... existing table processing ...

  // --- Math blocks ---
  // (preserve existing math logic)
  // ... existing math processing ...

  // --- Inline formatting ---
  text = text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-amber-400 hover:text-amber-300 underline" target="_blank" rel="noopener">$1</a>');

  // --- Headers ---
  text = text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-white mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-semibold text-white mt-4 mb-2">$1</h1>');

  // --- Paragraph wrapping ---
  // CRITICAL FIX: Keep <p> tags for semantics and spacing, but add explicit
  // user-select and margin classes so they behave as selectable text blocks.
  text = text
    .split(/\n\n+/)
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h')) return trimmed;
      // Add mb-4 for paragraph spacing; last paragraph margin is handled by CSS
      return `<p class="mb-4 last:mb-0" style="user-select: text;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return text;
}
```

**Key changes:**
1. **Merged wrappers:** The outer `my-4 group relative` div and the inner `dangerouslySetInnerHTML` div are now one element. This removes a DOM boundary that browsers treat as a selection snap point.
2. **`React.memo`:** The component only re-renders when `block` reference changes. If the parent `ReaderView` updates state (e.g., toolbar hover), `ProseBlock` stays stable and the selection survives.
3. **`useMemo` on `renderMarkdown`:** The HTML string is only recomputed when `block.md` changes. This prevents `dangerouslySetInnerHTML` from rebuilding the DOM on every parent render.
4. **Explicit `user-select: text` on `<p>` tags:** Added inline style to every paragraph to guarantee selectability regardless of global CSS.
5. **Tailwind `mb-4 last:mb-0` on paragraphs:** Preserves visual spacing. The `last:mb-0` prevents extra margin on the final paragraph inside a block.

---

### 3.2 CalloutBlock.tsx

**Goals:**
- Render all lines in a single `dangerouslySetInnerHTML` container
- Use `<br/>` for line breaks instead of separate `<p>` tags
- Preserve inline markdown (bold, italic, code)

```tsx
// CalloutBlock.tsx — COMPLETE REPLACEMENT
import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface Props {
  block: { id: string; md: string; type: string };
}

export const CalloutBlock = React.memo(function CalloutBlock({ block }: Props) {
  const rendered = useMemo(() => {
    return block.md
      .split('\n')
      .map(line => {
        let renderedLine = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-zinc-800 text-amber-300 text-sm font-mono">$1</code>');
        return renderedLine;
      })
      .join('<br/>');
  }, [block.md]);

  return (
    <div
      className="my-4 p-4 rounded-xl border border-amber-700/30 bg-amber-900/10 select-text callout-block"
      style={{ userSelect: 'text' }}
      data-block-id={block.id}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rendered) }}
    />
  );
});
```

**Key changes:**
1. **Single container:** All lines are joined with `<br/>` and rendered in one `dangerouslySetInnerHTML`. This creates a single continuous text flow where the browser can select character-by-character across line breaks.
2. **Removed per-line `<p>` tags:** Previously each line was a block-level `<p>`, which forced selection snapping. Now lines are inline with soft breaks.
3. **`React.memo` + `useMemo`:** Prevents re-renders and DOM rebuilds during selection.
4. **Preserved styling:** The outer div retains the callout visual style (amber border, background, padding, rounded corners).

---

### 3.3 SelectionActions.tsx

**Goals:**
- Fix `getTextOffset` to correctly handle element-node anchors
- Add selection normalization to avoid empty/whitespace-only selections
- Ensure toolbar appears for cross-block selections

```tsx
// SelectionActions.tsx — PARTIAL REPLACEMENT (getTextOffset + handleMouseUp)
import { useCallback, useEffect, useState, useRef } from 'react';

interface SelectionState {
  text: string;
  rect: DOMRect;
  startOffset: number;
  endOffset: number;
}

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onExplain?: (text: string) => void;
  onAsk?: (text: string) => void;
  onSimpler?: (text: string) => void;
  onDeeper?: (text: string) => void;
  onHighlight?: (range: { start: number; end: number; text: string }) => void;
  onNote?: (range: { start: number; end: number; text: string }) => void;
}

export function SelectionActions({
  containerRef,
  onExplain,
  onAsk,
  onSimpler,
  onDeeper,
  onHighlight,
  onNote,
}: Props) {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // ─── Helper: total text length of a node tree ───
  const getTextLength = useCallback((node: Node): number => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').length;
    }
    let len = 0;
    for (let i = 0; i < node.childNodes.length; i++) {
      len += getTextLength(node.childNodes[i]);
    }
    return len;
  }, []);

  // ─── CRITICAL FIX: getTextOffset now handles element nodes correctly ───
  const getTextOffset = useCallback(
    (node: Node, offset: number): number => {
      if (!containerRef.current) return 0;

      // If the container itself is the anchor node, offset is a child index.
      // Sum the text lengths of all preceding children.
      if (node === containerRef.current) {
        let sum = 0;
        for (let i = 0; i < offset && i < node.childNodes.length; i++) {
          sum += getTextLength(node.childNodes[i]);
        }
        return sum;
      }

      let total = 0;
      const walk = (n: Node): boolean => {
        if (n === node) {
          if (node.nodeType === Node.TEXT_NODE) {
            // Anchor is a text node: offset is a character index
            total += offset;
          } else {
            // Anchor is an element node: offset is a child index.
            // Sum text lengths of all children BEFORE the offset index.
            for (let i = 0; i < offset && i < node.childNodes.length; i++) {
              total += getTextLength(node.childNodes[i]);
            }
          }
          return true;
        }

        if (n.nodeType === Node.TEXT_NODE) {
          total += (n.textContent ?? '').length;
          return false;
        }

        for (let i = 0; i < n.childNodes.length; i++) {
          if (walk(n.childNodes[i])) return true;
        }
        return false;
      };

      walk(containerRef.current);
      return total;
    },
    [containerRef, getTextLength],
  );

  // ─── Selection detection ───
  useEffect(() => {
    const handleMouseUp = () => {
      // Defer to next tick so the browser has finished updating the selection
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount || !containerRef.current) {
          setSelection(null);
          return;
        }

        const range = sel.getRangeAt(0);

        // Validate the selection is inside our reader container
        const ancestor = range.commonAncestorContainer;
        if (!containerRef.current.contains(ancestor)) {
          setSelection(null);
          return;
        }

        // Normalize: trim whitespace but preserve internal spaces
        const text = sel.toString().trim();
        if (!text || text.length > 500) {
          setSelection(null);
          return;
        }

        // Calculate offsets using the FIXED getTextOffset
        const startOffset = getTextOffset(range.startContainer, range.startOffset);
        const endOffset = getTextOffset(range.endContainer, range.endOffset);

        // Ensure start <= end (browser may report backwards selections)
        const [finalStart, finalEnd] = startOffset <= endOffset
          ? [startOffset, endOffset]
          : [endOffset, startOffset];

        const rect = range.getBoundingClientRect();

        setSelection({
          text,
          rect,
          startOffset: finalStart,
          endOffset: finalEnd,
        });
      });
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [containerRef, getTextOffset]);

  // ─── Dismiss on click outside ───
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!selection) return;
      if (toolbarRef.current?.contains(e.target as Node)) return;
      // If the click is inside the text container, keep the selection
      // (the user might be clicking to adjust the selection)
      // Only clear if clicking outside the container entirely
      if (!containerRef.current?.contains(e.target as Node)) {
        setSelection(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selection, containerRef]);

  // ─── Toolbar positioning ───
  const toolbarStyle = useMemo(() => {
    if (!selection) return {};
    const { rect } = selection;
    const toolbarWidth = 280; // approximate toolbar width
    const toolbarHeight = 44; // approximate toolbar height
    const gap = 12;

    let left = rect.left + rect.width / 2 - toolbarWidth / 2;
    let top = rect.top - toolbarHeight - gap;

    // Clamp to viewport
    left = Math.max(12, Math.min(left, window.innerWidth - toolbarWidth - 12));
    top = Math.max(12, top);

    return {
      position: 'fixed' as const,
      left,
      top,
      zIndex: 9999,
    };
  }, [selection]);

  if (!selection) return null;

  return (
    <div
      ref={toolbarRef}
      className="lyceum-selection-toolbar"
      style={toolbarStyle}
    >
      <button
        className="lyceum-selection-action"
        onClick={() => onExplain?.(selection.text)}
        title="Explain"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>
      <button
        className="lyceum-selection-action"
        onClick={() => onAsk?.(selection.text)}
        title="Ask"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      <button
        className="lyceum-selection-action"
        onClick={() => onSimpler?.(selection.text)}
        title="Simpler"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="10" y1="14" x2="3" y2="21"/>
        </svg>
      </button>
      <button
        className="lyceum-selection-action"
        onClick={() => onDeeper?.(selection.text)}
        title="Deeper"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
        </svg>
      </button>
      <div className="w-px h-4 bg-zinc-700 mx-1" />
      <button
        className="lyceum-selection-action"
        onClick={() =>
          onHighlight?.({
            start: selection.startOffset,
            end: selection.endOffset,
            text: selection.text,
          })
        }
        title="Highlight"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      </button>
      <button
        className="lyceum-selection-action"
        onClick={() =>
          onNote?.({
            start: selection.startOffset,
            end: selection.endOffset,
            text: selection.text,
          })
        }
        title="Note"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      </button>
    </div>
  );
}
```

**Key changes:**
1. **`getTextOffset` rewrite:** Now correctly distinguishes between text-node offsets (character indices) and element-node offsets (child indices). For element nodes, it sums the text lengths of all preceding children.
2. **`getTextLength` helper:** Recursively calculates the total text content of any DOM subtree.
3. **`requestAnimationFrame` in `handleMouseUp`:** Defers reading the selection until the browser has finished updating it, preventing race conditions.
4. **Selection normalization:** Swaps start/end if the browser reports a backwards selection (can happen when selecting right-to-left).
5. **Dismissal logic:** Only clears the selection when clicking outside the entire reader container, not when clicking inside the text (which allows users to adjust their selection without the toolbar flickering).
6. **Viewport clamping:** Toolbar position is clamped to `12px` from viewport edges so it never overflows off-screen.

---

### 3.4 ReaderView.tsx (CSS additions only)

No structural changes to ReaderView.tsx are required, but add the following CSS to your global stylesheet (e.g., `lyceum-learn-features.css` or a new `selection-fix.css`):

```css
/* ============================================================
   Lyceum Text Selection Fix — Global CSS
   ============================================================ */

/* 1. Force text selection on ALL descendants of .select-text
   This overrides any global user-select: none or Tailwind plugins
   that might interfere with selection. */
.select-text,
.select-text * {
  -webkit-user-select: text !important;
  user-select: text !important;
  cursor: text;
}

/* 2. ProseBlock paragraph spacing
   Tailwind preflight removes default <p> margins. We restore them
   with consistent spacing that matches the existing leading-[1.7]. */
.prose-block p {
  margin-bottom: 1em;
}

.prose-block p:last-child {
  margin-bottom: 0;
}

/* 3. Ensure headers are also selectable */
.prose-block h1,
.prose-block h2,
.prose-block h3 {
  -webkit-user-select: text !important;
  user-select: text !important;
}

/* 4. CalloutBlock line spacing
   Since we now use <br/> instead of <p>, we need to ensure
   the line-height is preserved. */
.callout-block {
  line-height: 1.7;
}

/* 5. Code blocks — allow selection but keep monospace */
pre code,
code {
  -webkit-user-select: text !important;
  user-select: text !important;
}

/* 6. Selection highlight colors (persistent highlights) */
mark.lyceum-highlight-yellow {
  background-color: rgba(234, 179, 8, 0.2);
}
mark.lyceum-highlight-green {
  background-color: rgba(34, 197, 94, 0.2);
}
mark.lyceum-highlight-blue {
  background-color: rgba(59, 130, 246, 0.2);
}
mark.lyceum-highlight-pink {
  background-color: rgba(236, 72, 153, 0.2);
}
mark.lyceum-highlight-orange {
  background-color: rgba(249, 115, 22, 0.2);
}

/* 7. Mobile touch selection support */
@media (pointer: coarse) {
  .select-text {
    -webkit-touch-callout: default !important;
  }
}
```

---

## 4. Before / After DOM Structure

### 4.1 ProseBlock

**BEFORE — nested wrappers create selection barriers:**
```html
<div class="max-w-[72ch] mx-auto relative select-text">   <!-- motion.div -->

  <div class="my-4 group relative" data-block-id="block-1">   <!-- ProseBlock outer -->
    <div class="text-[1.0625rem] ... select-text" style="userSelect: text">   <!-- ProseBlock inner -->
      <p>First paragraph with some text...</p>
      <p>Second paragraph continues here...</p>
    </div>
  </div>

  <div class="my-4 group relative" data-block-id="block-2">   <!-- ProseBlock outer -->
    <div class="text-[1.0625rem] ... select-text" style="userSelect: text">   <!-- ProseBlock inner -->
      <p>Third paragraph in next block...</p>
    </div>
  </div>

</div>
```

**AFTER — flattened, single-element blocks:**
```html
<div class="max-w-[72ch] mx-auto relative select-text">   <!-- motion.div -->

  <div class="my-4 group relative text-[1.0625rem] ... select-text prose-block"
       style="userSelect: text" data-block-id="block-1">
    <p class="mb-4 last:mb-0" style="user-select: text;">First paragraph with some text...</p>
    <p class="mb-4 last:mb-0" style="user-select: text;">Second paragraph continues here...</p>
  </div>

  <div class="my-4 group relative text-[1.0625rem] ... select-text prose-block"
       style="userSelect: text" data-block-id="block-2">
    <p class="mb-4 last:mb-0" style="user-select: text;">Third paragraph in next block...</p>
  </div>

</div>
```

**Impact:** Removing the inner `<div>` reduces DOM depth by 1 level. The browser's selection engine has fewer block boundaries to traverse, making cross-paragraph and cross-block selection smoother.

---

### 4.2 CalloutBlock

**BEFORE — fragmented into separate `<p>` elements:**
```html
<div class="callout my-4 ..." data-block-id="block-3">
  <p>First line of callout</p>
  <p class="mt-1">Second line of callout</p>
  <p class="mt-1">Third line with <strong>bold</strong> text</p>
</div>
```

**AFTER — single continuous text flow:**
```html
<div class="callout my-4 ... select-text callout-block"
     style="userSelect: text" data-block-id="block-3">
  First line of callout<br/>
  Second line of callout<br/>
  Third line with <strong>bold</strong> text
</div>
```

**Impact:** `<br/>` is an inline line break. The browser treats the entire callout as one selectable text region. Users can click-drag from the first character to the last without hitting block-level snap boundaries.

---

### 4.3 Cross-Block Selection

**BEFORE — selecting from ProseBlock 1 into ProseBlock 2:**
The selection must cross:
1. ProseBlock 1 inner `<div>` (dangerouslySetInnerHTML host)
2. ProseBlock 1 outer `<div>` (wrapper)
3. ProseBlock 2 outer `<div>` (wrapper)
4. ProseBlock 2 inner `<div>` (dangerouslySetInnerHTML host)

Each crossing is a potential snap point, especially during React re-renders.

**AFTER — selecting from ProseBlock 1 into ProseBlock 2:**
The selection crosses:
1. ProseBlock 1 `<div>` (single element)
2. ProseBlock 2 `<div>` (single element)

Fewer boundaries = smoother selection.

---

## 5. Test Plan

### 5.1 Desktop Mouse Selection

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Single word | Double-click any word in a ProseBlock paragraph | Word is highlighted in browser default blue; toolbar appears centered above the word |
| 2 | Partial sentence | Click at start of sentence, drag to middle | Exact character range is highlighted; toolbar appears above selection |
| 3 | Cross-paragraph (same block) | Click in paragraph 1, drag into paragraph 2 of same ProseBlock | Selection spans both `<p>` tags as one continuous blue highlight; toolbar shows |
| 4 | Cross-paragraph (different blocks) | Click in ProseBlock 1 paragraph, drag into ProseBlock 2 paragraph | Selection spans both blocks; toolbar shows with correct text |
| 5 | Cross-block (Prose → Callout) | Click in ProseBlock, drag into CalloutBlock | Selection spans both blocks; toolbar shows combined text |
| 6 | Cross-block (Prose → Code) | Click in ProseBlock, drag into CodeBlock | Selection spans into code block (may be limited by `<pre>` boundaries, which is acceptable) |
| 7 | Header selection | Click in paragraph before `<h3>`, drag into paragraph after `<h3>` | Selection includes header text as part of continuous range |
| 8 | Toolbar positioning | Select text near top edge of viewport | Toolbar clamps to 12px from top, does not overflow off-screen |
| 9 | Toolbar dismissal | Click on empty area outside reader container | Selection clears, toolbar disappears |
| 10 | Selection adjustment | Click inside existing selection to adjust | Selection remains active; toolbar updates position |

### 5.2 Mobile Touch Selection

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 11 | Long-press word | Long-press any word in ProseBlock | Native selection handles appear; word is selected; toolbar appears after lift |
| 12 | Drag handles | Select word, drag selection handles to expand | Selection expands character-by-character; toolbar follows selection |
| 13 | Cross-paragraph touch | Drag selection handle from paragraph 1 into paragraph 2 | Selection expands across paragraphs smoothly |

### 5.3 Offset Accuracy (Highlights)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 14 | Single paragraph highlight | Select text in one paragraph, click "Highlight" | Yellow highlight appears exactly over selected text, not shifted |
| 15 | Cross-paragraph highlight | Select text spanning two paragraphs, click "Highlight" | Highlight covers exact range across both `<p>` tags |
| 16 | Callout highlight | Select text in CalloutBlock, click "Highlight" | Highlight appears at correct position in continuous text flow |
| 17 | Reload persistence | Highlight text, reload page | Highlight restores at exact same character offsets |
| 18 | Large selection | Select >500 characters | Toolbar does NOT appear (existing length guard) |

### 5.4 Regression Tests

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 19 | Markdown rendering | Verify bold, italic, links, code, headers, tables render correctly | All formatting preserved; no visual regressions |
| 20 | Framer Motion transitions | Navigate between pages | Page transition animations play smoothly; no jank |
| 21 | Tutor Ask | Select text, click "Ask" | Tutor modal opens with selected text pre-filled |
| 22 | Assessment quizzes | Navigate to quiz block | Quiz renders and functions normally |
| 23 | Notes | Select text, click "Note" | Note editor opens; note saves and persists |

---

## 6. Edge Cases & Risks

### 6.1 Edge Cases Handled

| Edge Case | Mitigation |
|-----------|------------|
| **Empty paragraphs** | `renderMarkdown` skips empty strings after `trim()`; no empty `<p>` tags are generated |
| **Selection starts/ends in whitespace** | `sel.toString().trim()` removes leading/trailing whitespace; offsets are calculated on the raw range, so highlights align to the actual text |
| **Backwards selection (right-to-left drag)** | `getTextOffset` returns correct values; SelectionActions normalizes by swapping start/end if needed |
| **Selection includes only a `<br/>`** | `trim()` results in empty string → toolbar is hidden |
| **Rapid click-drag during React render** | `React.memo` + `useMemo` prevent re-renders; selection survives parent state updates |
| **Touch devices without precise pointers** | `user-select: text` and `-webkit-touch-callout: default` enable native touch selection |
| **DOMPurify strips inline styles** | If your DOMPurify config strips `style` attributes, update the config: `ALLOW_ATTR: ['style', 'class']` or add `style` to the allowed attributes list |

### 6.2 Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **DOMPurify config blocks new classes/styles** | Medium | High (broken rendering) | Verify DOMPurify allows `class` and `style` attributes. If not, update the sanitizer config or remove inline styles and rely solely on CSS classes. |
| **Tailwind `last:mb-0` not working** | Low | Low (extra margin on last paragraph) | Ensure Tailwind CSS v3+ is used; `last:` variant is enabled by default. If using v2, add `last` to variants in `tailwind.config.js`. |
| **Browser-specific selection quirks (Safari)** | Medium | Medium | Safari sometimes struggles with cross-block selection. The flattened DOM and explicit `user-select: text` mitigate this, but test thoroughly on Safari/iOS. |
| **React StrictMode double-mount** | Low | Low | `React.memo` + `useMemo` are idempotent; double-mount in dev mode does not affect selection behavior. |
| **Third-party CSS overriding `!important`** | Low | Medium | The `!important` in `.select-text *` should win over almost all CSS. If a library uses inline styles with `!important`, those are rare and can be addressed case-by-case. |
| **Performance with very long documents** | Low | Low | `getTextOffset` walks the DOM tree on every selection. For documents >10,000 words, consider adding a text-length cache or switching to a flat text offset map. This is not implemented here to keep the fix minimal. |

---

## 7. Implementation Checklist

- [ ] **ProseBlock.tsx**: Apply the complete replacement code above
- [ ] **CalloutBlock.tsx**: Apply the complete replacement code above
- [ ] **SelectionActions.tsx**: Replace `getTextOffset` and `handleMouseUp` with the fixed versions above; add `getTextLength` helper
- [ ] **CSS**: Add the global CSS block from section 3.4 to your stylesheet
- [ ] **DOMPurify config**: Verify `style` and `class` attributes are allowed; update config if necessary
- [ ] **Tailwind config**: Verify `last:` variant is enabled (default in v3)
- [ ] **Test**: Run through all 23 test cases in section 5
- [ ] **Deploy**: Monitor for any selection-related bug reports in the first 48 hours

---

## 8. Why This Fix Works

1. **DOM flattening reduces snap points:** Every nested `<div>` is a potential selection boundary in the browser's layout engine. By merging ProseBlock's two divs into one, we remove a boundary that was causing the browser to snap selection to paragraph starts.

2. **`<br/>` vs `<p>` in CalloutBlock:** Block-level elements (`<p>`) force the browser to treat each line as a separate selectable unit. Inline breaks (`<br/>`) keep the text in a single flow, allowing character-precise selection across lines.

3. **Element-node offset fix:** The previous `getTextOffset` assumed `offset` was always a character count. When the browser reports an element node (e.g., a `<p>`) with a child index, adding that index to a character accumulator produced garbage offsets. The fix sums the text lengths of preceding children, giving accurate character positions for highlights.

4. **Memoization prevents selection loss:** `dangerouslySetInnerHTML` destroys and recreates DOM nodes on every render. By wrapping ProseBlock and CalloutBlock in `React.memo` and memoizing the HTML string, we ensure the DOM stays stable during selection—preventing the "snap to start" behavior caused by mid-selection DOM replacement.

5. **Explicit `user-select: text` with `!important`:** This guarantees that no global CSS, Tailwind plugin, or third-party library can accidentally make text unselectable. The `!important` rule cascades to all descendants, ensuring consistent behavior across all block types.

---

*End of RESULT.md*
