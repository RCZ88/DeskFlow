# Context Bundle — Lyceum Visuals Quality (Round 3)

## Project: DeskFlow / Lyceum Learn Module
- Stack: Electron + React + TypeScript + Vite + better-sqlite3
- Renderer: Chromium (Electron's built-in)
- Lesson format: `.lmd` (Lesson Markdown) → parsed to blocks → rendered as React components

---

## FILE 1: System Prompt (master-prompt.md) — WHAT THE ARCHITECT IS REWRITING

```markdown
# Master Prompt — Lyceum Lesson Generation (v4.0)

You are a curriculum-authoring AI with deep subject-matter expertise.

Your output is **always raw .lmd** — never JSON, never wrapped in code fences. Start with `---` frontmatter.

## CRITICAL: Parser alignment rules (get these wrong and the lesson silently breaks)

1. **Nodes use `#` (H1), NOT `##` (H2).** The parser regex is `^#\s+(.+)$` — `##` will NOT be recognized as a node.
2. **`::: grounding` uses 3 colons**, same as every other directive block.
3. **`know:` lines must end with `[source_id]` — NO trailing period, comma, or any punctuation after the bracket.**
   - ❌ `know: The sky is blue [src_1].` ← BROKEN
   - ✅ `know: The sky is blue [src_1]` ← CORRECT
4. **Quiz `explain:` not `explanation:`** (parser accepts both, but `explain:` is canonical).
5. **MCQ: exactly ONE `- [x]`** — marking two silently drops the first.

## Visual types that count (exact parser list)

`mermaid`, `image`, `html`, `figure`, `math`, `annotated-math`, `code`, `annotated-code`, `chart`, `finchart`, `flow`, `layer`, `table`, `illustration`, `viz_heatmap`, `viz_graph`, `viz_timeline`, `viz_concept_map`, `flashcard`, `layer_reveal`, `whiteboard`.

Non-visual: `quiz`, `callout`, `prose`, bare GFM tables.

## Variety enforcement checklist

- [ ] At least 4 DIFFERENT block types
- [ ] No more than 3 consecutive mermaid diagrams
- [ ] At least 1 quiz per 3 nodes
- [ ] At least 1 callout per lesson
- [ ] At least 1 code block in technical lessons
- [ ] Every code block is complete and runnable
- [ ] Every node has `::: grounding`
- [ ] No `know:` lines end with a period

## Hard guardrails

- Never output JSON or wrap in code fences
- Never invent image URLs
- Every node needs `#` heading, `@mastery`, `::: grounding`, and at least one visual
- `know:` claims end EXACTLY in `[source_id]` — NO trailing punctuation
- `explain:` not `explanation:` (canonical)
- Never use `::: video` or `::: widget`
```

**Architect's critique:** Parser rules dominate. 40% of tokens on compliance. No examples of rich visuals. No interactivity guidance.

---

## FILE 2: WidgetHost.tsx — THE SANDBOXED HTML RENDERER (ALREADY BUILT)

```tsx
import React, { useRef, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  block: {
    id: string;
    kind?: string;
    html?: string;
    caption?: string;
  };
}

export function WidgetHost({ block }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(300);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setError(null);
  }, [block.html, block.id]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'widget:height' && typeof e.data.height === 'number') {
        setHeight(Math.min(Math.max(e.data.height, 100), 800));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!block.html) {
    return (
      <div className="my-6 py-8 px-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40 text-center">
        <p className="text-sm text-zinc-500">No widget content</p>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-xl bg-zinc-800/30 border border-zinc-700/40 overflow-hidden">
      {block.caption && (
        <div className="px-4 py-2 border-b border-zinc-700/40">
          <p className="text-sm text-zinc-500 italic text-center">{block.caption}</p>
        </div>
      )}
      {error ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Widget failed to load: {error}</span>
          <button
            onClick={() => { setError(null); setRetry((r) => r + 1); }}
            className="ml-2 text-xs font-medium text-clay-400 hover:text-clay-300 transition"
          >
            ↻ Retry
          </button>
        </div>
      ) : (
        <iframe
          key={`${block.id}-${retry}`}
          ref={iframeRef}
          srcDoc={block.html}
          className="w-full border-none"
          style={{ height: `${height}px`, background: '#1c1917' }}
          sandbox="allow-scripts"
          onError={() => setError('Failed to render')}
          title={block.caption || 'Widget'}
        />
      )}
    </div>
  );
}
```

**KEY:** `sandbox="allow-scripts"` + `srcDoc={block.html}` = JavaScript EXECUTES in the iframe. The Architect's "Layer 2 Fix #1" is already done.

---

## FILE 3: BlockRenderer.tsx — HOW BLOCKS ARE DISPATCHED

```tsx
// Key section — the switch statement dispatching block types:
switch (block.type) {
  case 'widget':
    return <WidgetHost block={block} />;  // ← ::html blocks go here
  case 'svg':
    return <SvgBlock {...sharedProps} block={block} />;
  case 'mermaid':
    return <MermaidBlock {...sharedProps} block={block} />;
  case 'chart':
    return <ChartBlock {...sharedProps} block={block} />;
  case 'flow':
    return <FlowBlock {...sharedProps} block={block} />;
  // ... 20+ block types total
}
```

`::: html` blocks → parsed as `type: 'widget', kind: 'html'` → rendered by `WidgetHost` (iframe).

---

## FILE 4: parseLessonMarkdown.ts — HOW :::html IS PARSED

```typescript
// Lines 333-343 — the directive parsing for figure/html:
} else if (kind === 'figure') {
  const svgContent = inner.map((l) => l.raw).join('\n').trim();
  if (svgContent.includes('<svg')) {
    blocks.push({ id: id(), type: 'svg', svg: svgContent, caption: args || undefined });
  } else {
    // Not SVG — route to widget as HTML fallback
    blocks.push({ id: id(), type: 'widget', kind: 'html', html: svgContent, caption: args || undefined });
  }
} else if (kind === 'html') {
  const htmlContent = inner.map((l) => l.raw).join('\n').trim();
  blocks.push({ id: id(), type: 'widget', kind: 'html', html: htmlContent, caption: args || undefined });
}
```

`::: html` → content extracted → stored as `{ type: 'widget', kind: 'html', html: <content> }`.

---

## FILE 5: IllustrationBlock.tsx — THE ILLUSTRATION WORKFLOW

```tsx
// Current no-image state (external workflow):
// 1. Concept callout ("This illustration explains: ...")
// 2. Upload zone (prominent amber button — "Upload your image")
// 3. Prompt box with Copy button
// 4. External tool hint ("Copy the prompt, paste into ChatGPT/Midjourney...")
// 5. Secondary "Or generate with AI" button

// The IllustrationBlock handles:
// - Displaying the prompt for external AI generation
// - Copy-to-clipboard
// - Upload result back
// - In-app AI generation (if enabled)
// - Showing the generated/uploaded image
```

---

## ARCHITECT'S 3-LAYER FIX (from Round 3 analysis):

**Layer 1 (Immediate):** Rewrite master-prompt.md
- Add rich visual examples (interactive sliders, SVG animations, Vega-Lite)
- Replace "visual variety" with "visual depth" (L0-L5 levels)
- Move parser rules to post-flight checklist
- Add Widget-to-LMD translation guide

**Layer 2 (Medium-Term):** Extend renderer
- Sandboxed HTML renderer → **ALREADY BUILT** (WidgetHost.tsx)
- Vega-Lite runtime → **PARTIAL** (ChartBlock exists)
- State persistence → NOT BUILT
- Preview mode → NOT BUILT

**Layer 3 (Long-Term):** Hybrid architecture
- Separate Lesson Documents from Learning Labs
- Lessons = static .lmd, Labs = interactive standalone apps

---

## QUESTIONS FOR ARCHITECT:

1. Given the HTML sandbox already works, should we focus purely on the prompt rewrite (Layer 1) rather than renderer infrastructure?

2. Can you provide 2-3 concrete `::: html` block examples showing interactivity at different mastery levels? The temperature slider example is excellent — give 2 more.

3. For the tone fix — should "visual-first, math-grounded, systems-oriented" be a learner profile override or a global tone change?

4. Is "separate documents from labs" (Layer 3) in scope for this round, or deferred?
