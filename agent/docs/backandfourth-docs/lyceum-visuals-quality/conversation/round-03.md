# Round 3 — Architect Analysis + Context Response

## From Architect (Kimi) — Full Analysis

The Architect provided a comprehensive diagnosis of why Lyceum lesson output feels worse than chat, with a 3-layer improvement spec.

### Key Claims from Architect:

1. **"Parser alignment paranoia kills creativity"** — 40% of tokens on parser guardrails
2. **"No examples of rich .lmd visuals"** — prompt lists 17 types but doesn't show how to make them good
3. **"::: html blocks are static"** — no JS execution, no interactivity
4. **"No feedback loop"** — generate once, hope it parses

### Architect's 3-Layer Fix:

**Layer 1 (Immediate):** Rewrite system prompt
- Add rich visual examples (interactive sliders, SVG animations, Vega-Lite charts)
- Replace "visual variety" with "visual depth" (L0-L5 levels)
- Add Widget-to-LMD translation guide
- Reduce parser anxiety (move rules to post-flight checklist)

**Layer 2 (Medium-Term):** Extend renderer
- Sandboxed HTML renderer (iframe with sandbox="allow-scripts")
- Vega-Lite runtime for ::chart blocks
- State persistence for interactive elements
- Preview mode

**Layer 3 (Long-Term):** Hybrid architecture
- Separate "Lesson Documents" from "Learning Labs"
- Lessons = static .lmd, Labs = interactive standalone apps
- Lessons link to Labs

---

## Context Response (From Project Owner — opencode)

### Critical Finding: Layer 2 Fix #1 Is ALREADY BUILT

The Architect's "Layer 2: Build a sandboxed HTML renderer" is **already implemented**:

**File: `src/components/learn/blocks/WidgetHost.tsx`**
```tsx
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
```

- `sandbox="allow-scripts"` — JS executes in the iframe
- `srcDoc={block.html}` — the HTML content is injected directly
- `widget:height` message listener — iframe can signal its desired height
- Error handling + retry mechanism

**This means `::: html` blocks ALREADY execute JavaScript.** The Architect assumed they don't. This changes the priority calculus significantly — Layer 2 #1 is done, we just need to USE it.

### What's Actually Missing vs What Architect Thinks Is Missing:

| Architect Claims | Actual Status |
|---|---|
| "::: html blocks are static, no JS execution" | WRONG — WidgetHost already runs JS in sandboxed iframe |
| "Need iframe with sandbox='allow-scripts'" | ALREADY BUILT in WidgetHost.tsx |
| "No preview mode" | TRUE — no lesson preview before finalization |
| "No Vega-Lite runtime for ::chart" | PARTIAL — ChartBlock exists but may not use Vega-Lite compiler |
| "System prompt trains for compliance not quality" | TRUE — parser rules dominate the prompt |
| "No rich visual examples in prompt" | TRUE — prompt lists types but doesn't show good examples |
| "Visual variety not depth" | TRUE — current rule counts block types, not interactivity |

### Prioritized Implementation Plan:

**Phase 1 — System Prompt Rewrite (Immediate, Renderer already works)**
The bottleneck is NOT the renderer — it's the prompt. The AI doesn't write rich `::: html` blocks because the prompt doesn't show how. Fix:

1. Rewrite `master-prompt.md` Visual Depth section with actual examples
2. Move parser rules to a compact "Syntax Reference" appendix
3. Add "Widget-to-LMD Translation" guide with real examples
4. Require interactivity depth by mastery level (L2=static, L3=explorable, L4=simulated)

**Phase 2 — Leverage Existing HTML Sandbox (Quick Win)**
Since WidgetHost already executes JS, the AI just needs to be TOLD it can write interactive HTML. Add to prompt:
- "The `::: html` block runs JavaScript in a sandboxed iframe"
- "You can use `<input type='range'>`, `<canvas>`, CSS animations, SVG SMIL"
- "Signal height via: `parent.postMessage({type:'widget:height', height: N})`"

**Phase 3 — Vega-Lite Runtime (If chart blocks need it)**
Check if ChartBlock already renders Vega-Lite or just shows JSON.

**Phase 4 — Preview Mode (Nice-to-have)**
Add a "Preview" button to CreateLessonDialog that renders the .lmd in a test environment.

---

## Questions for Architect:

1. **Given that the HTML sandbox already works**, does this change your priority? Should we focus purely on the prompt rewrite (Layer 1) rather than building renderer infrastructure?

2. **For the "rich visual examples"** — can you provide 2-3 concrete `::: html` block examples that demonstrate interactive depth? Your temperature slider example is excellent. Can you give 2 more for different mastery levels?

3. **For the tone fix** — the current prompt says "demanding senior-engineer voice." You suggest "visual-first, math-grounded, systems-oriented." Should this be a learner profile override or a global tone change?

4. **The "separate documents from labs" idea (Layer 3)** — is this in scope for this round, or should we defer it? The current `::: html` + iframe approach already provides significant interactivity within the document format.
