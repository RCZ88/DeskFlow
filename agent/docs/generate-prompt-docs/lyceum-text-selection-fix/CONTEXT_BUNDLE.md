# CONTEXT_BUNDLE.md — Lyceum Text Selection Fix

> **Problem:** Text selection in the Lyceum Learn reader is broken. Users cannot select individual words or partial paragraphs — the browser selects entire blocks (paragraphs, headers) instead of allowing normal word-by-word or character-by-character selection. This breaks the AI-powered selection features (Explain, Ask, Simpler, Deeper) that rely on user-selected text.

---

## 1. Architecture Overview

```
ReaderView.tsx
  └─ containerRef (div ref for the scrollable content area)
  └─ motion.div (animated wrapper, className="select-text")
       └─ BlockRenderer.tsx (switches on block.type)
            └─ ProseBlock.tsx (dangerouslySetInnerHTML with DOMPurify)
            └─ CalloutBlock.tsx (dangerouslySetInnerHTML with DOMPurify)
            └─ CodeBlock.tsx (dangerouslySetInnerHTML for syntax highlighting)
            └─ ... other blocks
       └─ SelectionActions.tsx (floating toolbar on text selection)
            └─ useHighlights.ts (highlight CRUD via localStorage)
```

---

## 2. Root Cause Analysis

### How text is rendered (ProseBlock.tsx)

```tsx
// ProseBlock.tsx lines 11-37
export function ProseBlock({ block, onAsk }: Props) {
  const rendered = renderMarkdown(block.md);
  return (
    <div className="my-4 group relative" data-block-id={block.id}>
      <div
        className="text-[1.0625rem] leading-[1.7] text-zinc-200 max-w-[68ch] font-serif select-text"
        style={{ userSelect: 'text' }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rendered) }}
      />
    </div>
  );
}
```

### How markdown is converted to HTML (ProseBlock.tsx renderMarkdown)

```tsx
// ProseBlock.tsx lines 39-122 — the paragraph wrapping logic
function renderMarkdown(md: string): string {
  // ... inline code, tables, math processing ...
  
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-white mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-semibold text-white mt-4 mb-2">$1</h1>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-amber-400 hover:text-amber-300 underline" target="_blank" rel="noopener">$1</a>')
    // Paragraph wrapping — gives browser proper block-level boundaries for text selection
    .split(/\n\n+/)
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h')) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');
}
```

### How selection is detected (SelectionActions.tsx)

```tsx
// SelectionActions.tsx lines 71-96
useEffect(() => {
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !containerRef.current) {
      setSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text || text.length > 500 || !containerRef.current.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const startOffset = getTextOffset(range.startContainer, range.startOffset);
    const endOffset = getTextOffset(range.endContainer, range.endOffset);
    setSelection({ text, rect, startOffset, endOffset });
  };
  document.addEventListener('mouseup', handleMouseUp);
  return () => document.removeEventListener('mouseup', handleMouseUp);
}, [containerRef, getTextOffset]);
```

### How the container is set up (ReaderView.tsx)

```tsx
// ReaderView.tsx lines 179-188
<div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 ws-scroll" ref={containerRef}>
  {currentNode ? (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentNode.id}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="max-w-[72ch] mx-auto relative select-text"
      >
        {/* blocks rendered here */}
        <SelectionActions containerRef={containerRef} ... />
      </motion.div>
    </AnimatePresence>
  ) : null}
</div>
```

---

## 3. The Selection Problem — Detailed

### Issue 1: `dangerouslySetInnerHTML` creates selection boundaries

When `ProseBlock` renders via `dangerouslySetInnerHTML`, the browser sees this DOM:

```html
<div class="my-4 group relative" data-block-id="block-1">
  <div class="text-[1.0625rem] leading-[1.7] text-zinc-200 max-w-[68ch] font-serif select-text" style="user-select: text">
    <p>First paragraph text here that is quite long...</p>
    <h3>Some Header</h3>
    <p>Second paragraph text here...</p>
    <p>Third paragraph text here...</p>
  </div>
</div>
```

**Problem:** When you click in paragraph 1 and drag to paragraph 2, the browser's native selection extends across `<p>` boundaries. BUT the `dangerouslySetInnerHTML` rendering means:
- Each `<p>` is a separate block element
- The browser may snap selection to the nearest `<p>` boundary instead of allowing free-form selection
- This is especially bad with `<br/>` tags inside `<p>` — the browser treats them as line breaks within a block, not as separate selectable units

### Issue 2: Multiple ProseBlock instances create selection barriers

Each `ProseBlock` is a separate React component. The content area looks like:

```html
<div class="max-w-[72ch] mx-auto relative select-text">  <!-- motion.div wrapper -->
  <div class="my-4 group relative" data-block-id="block-1">  <!-- ProseBlock 1 -->
    <div class="select-text" style="user-select: text">
      <p>...</p><p>...</p>
    </div>
  </div>
  <div class="my-4 group relative" data-block-id="block-2">  <!-- ProseBlock 2 -->
    <div class="select-text" style="user-select: text">
      <p>...</p>
    </div>
  </div>
  <div class="my-4 rounded-xl border ..." data-block-id="block-3">  <!-- CodeBlock -->
    <pre><code>...</code></pre>
  </div>
</div>
```

**Problem:** Selecting from ProseBlock 1 to ProseBlock 2 crosses component boundaries. The nested `<div>` wrappers create visual but not logical selection barriers. However, the real issue is that the `<p>` tags within each block create micro-boundaries.

### Issue 3: CalloutBlock renders line-by-line with separate `<p>` tags

```tsx
// CalloutBlock.tsx lines 27-34
{block.md.split('\n').map((line, i) => {
  let rendered = line
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  return <p key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rendered) }} className={i > 0 ? 'mt-1' : ''} />;
})}
```

**Problem:** Each line becomes a separate `<p>` element, each with its own `dangerouslySetInnerHTML`. Selection across lines is broken because they're separate DOM elements.

### Issue 4: SelectionActions getTextOffset traverses the DOM

```tsx
// SelectionActions.tsx lines 47-69
const getTextOffset = useCallback(
  (node: Node, offset: number): number => {
    if (node === containerRef.current) return offset;
    let total = 0;
    const walk = (n: Node): boolean => {
      if (n === node) { total += offset; return true; }
      if (n.nodeType === Node.TEXT_NODE) { total += (n.textContent ?? '').length; }
      else {
        for (let i = 0; i < n.childNodes.length; i++) {
          if (walk(n.childNodes[i])) return true;
        }
      }
      return false;
    };
    if (containerRef.current) walk(containerRef.current);
    return total;
  },
  [containerRef],
);
```

**Problem:** This calculates text offsets by walking the DOM tree. If the DOM structure is deeply nested (div > div > p > text), the offset calculation may be wrong, causing highlights to appear in the wrong positions.

---

## 4. What Needs to Change

### ProseBlock.tsx
- The `renderMarkdown` function wraps each paragraph in `<p>` tags — this creates block-level boundaries that interfere with selection
- `dangerouslySetInnerHTML` with `DOMPurify.sanitize()` is the rendering method — selection must work within this constraint
- The `select-text` class and `userSelect: 'text'` style are already applied — the issue is structural, not CSS

### CalloutBlock.tsx
- Renders each line as a separate `<p>` with `dangerouslySetInnerHTML` — breaks selection across lines
- Needs to render as a single container with inline line breaks

### SelectionActions.tsx
- `getTextOffset` walks the DOM tree — may produce incorrect offsets with deeply nested HTML
- `handleMouseUp` listener on `document` — should work but depends on correct offset calculation

### ReaderView.tsx
- The `containerRef` is the scrollable div — SelectionActions uses it as the selection boundary
- The `motion.div` wrapper has `select-text` class — good
- `SelectionActions` is rendered inside the `motion.div` — its toolbar uses `position: fixed` so it escapes the container

---

## 5. Existing Design Tokens

```css
/* From lyceum-learn-features.css */
.lyceum-selection-toolbar {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 6px; border-radius: 8px;
  background: var(--bg-secondary, #1c1917);
  border: 1px solid var(--border, #292524);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}
.lyceum-selection-action {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border: none; border-radius: 6px;
  background: none; color: var(--text-secondary, #a8a29e);
  cursor: pointer; transition: all 0.1s;
}
.lyceum-selection-action:hover {
  background: var(--bg-tertiary, #292524);
  color: var(--text-primary, #f5f5f4);
}
```

---

## 6. Constraints

- Must work with `dangerouslySetInnerHTML` rendering (cannot switch to React children)
- Must preserve existing highlight/note/tutor features
- Must not break the existing toolbar positioning
- Must work across all block types (prose, callout, code, math, mermaid, etc.)
- Must handle cross-block selection (selecting from one ProseBlock to another)
- Must work on both desktop and mobile
- Must not introduce new dependencies
