# Lyceum .lmd Grammar Reference — Full Code-Grounded

> **Purpose:** Debug compile errors, update the authoring system prompt, and replace
> the outdated `author-guide.md` (JSON-only, wrong format) and `capabilities-manifest.md`
> (wrong quiz/flow/table/finchart/widget/video syntax).
>
> Every rule below quotes the **exact line numbers** from the compiler.
> Source: `src/services/learn/parseLessonMarkdown.ts` (479 lines)

---

## Architecture Pipeline

```
   .lmd text (string)
       │
       ▼
   lessonInput.ts:toLdoc()          ← Entry point (line 93-108)
       │
       ├─ stripOuterFence()         ← Removes ```md fences the model wrapped around output
       │
       ├─ looksLikeJson()?          ← If starts with '{' and has "doc","nodes" → JSON fallback
       │     └─ JSON.parse()        ← Error: "Output looked like JSON but failed to parse"
       │
       └─ forgivingPreparser()      ← Repairs 3 classes of model errors BEFORE main parse
       │     ├─ Closes unclosed $$ math fences
       │     ├─ Normalizes fence language aliases (py→python, js→javascript)
       │     └─ Closes unclosed ::: directive blocks (appends ::: at end-of-file)
       │
       └─ parseLessonMarkdown()     ← Main compiler (parseLessonMarkdown.ts)
             │
             ├─ toLines()           ← Split \n, trim per line, track 1-based line# (line 66-68)
             │
             ├─ parseFrontmatter()  ← "---" delimited YAML-ish block (line 82-109)
             │
             ├─ splitNodes()        ← Fence/directive-aware # Heading splitting (line 123-169)
             │     └─ Tracks: code fence depth, math $$ depth, ::: directive depth
             │     └─ Ignores "#" inside fences/math/directives (fixes "Python comments as headings" bug)
             │
             └─ parseBlocks()       ← Per-node block dispatcher (line 173-354)
                   ├─ Node attributes: @mastery, @prereq (regex line 190)
                   ├─ Fenced ``` blocks → code or mermaid (regex line 194)
                   ├─ $$ math blocks (line 209-216)
                   ├─ ![alt](url) image (regex line 219)
                   ├─ GFM | table | (regex lines 227-249)
                   └─ ::: <kind> directive blocks (regex line 252)
                        ├─ grounding → parseGrounding()
                        ├─ callout
                        ├─ quiz → parseQuiz()
                        ├─ layer → recursive parseBlocks()
                        ├─ chart / finchart → JSON.parse()
                        ├─ table → custom column/rows parser
                        ├─ flow → arrow syntax parser
                        ├─ figure → <svg> detection or widget fallback
                        ├─ html → widget kind='html'
                        └─ <unknown> → silently dumped to prose (UNKNOWN-DIRECTIVE BUG)
```

---

## Block-by-Block Grammar

### prose (bare text, NOT a `:::` block)

Accumulates between other block matches. Flushed into a `ProseBlock` when a
non-prose block is hit (line 180-184).

**Regex/Code (line 350-351):**
```ts
prose.push(ln.raw);  // Every non-matching line is appended to prose buffer
```

### code (fenced ` ``` ` block, NOT a `:::` block)

**Regex — opening fence (line 194):**
```ts
const fence = ln.text.match(/^(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)\s*$/);
//                              marker        language
```

- Content is captured verbatim (backticks safe by construction)
- Lines are consumed until a matching `marker` line is found (line 201)
- Language set to `'text'` if no language tag given
- Language aliases normalized BEFORE this runs: `py→python, js→javascript, ts→typescript, rb→ruby, sh→bash, shell→bash, yml→yaml` (lessonInput.ts lines 34-45)

**Output type (line 203):**
```ts
if (lang === 'mermaid') blocks.push({ id: id(), type: 'mermaid', src: code });
else blocks.push({ id: id(), type: 'code', lang: lang || 'text', src: code, runnable: false });
```

### mermaid (fenced ` ```mermaid ` block, NOT a `:::` block)

Same regex as `code` above (line 194). If `lang === 'mermaid'`, stored as
`type: 'mermaid'` instead of `type: 'code'` (line 203).

### math ( `$$` fenced block, NOT a `:::` block)

**Regex (line 209):**
```ts
if (ln.text === '$$') {  // exact match, no whitespace
```
- Content captured verbatim between `$$` markers (lines 209-216)
- Forgiving pre-parser auto-closes unclosed `$$` fences (lessonInput.ts lines 56-60)

### image ( `![alt](url)` on its own line, NOT a `:::` block)

**Regex (line 219):**
```ts
const img = ln.text.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
//                            alt       url (no spaces)
```
- Must be the ENTIRE line (anchored `^...$`)
- URL cannot contain spaces `[^)\s]+`
- `source` and `license` fields default to `''` (line 222)

### table, GFM-style ( `|` pipe syntax, NOT a `:::` block)

**Two-phase detection (lines 227-249):**
```ts
const isTableRow = (s: string) => /^\s*\|(.+)\|\s*$/.test(s);
const isDivider = (s: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(s);
```
- Requires a divider row on line i+1 (line 229)
- Columns get auto-named `c0`, `c1`, `c2`... (line 241)
- Captures all consecutive rows after divider

### `::: grounding` — REQUIRED on every node

**Directive detection (line 284):**
```ts
if (kind === 'grounding') grounding = parseGrounding(inner);
```

**Inner parsing — parseGrounding() function (lines 405-432):**

| Key | Regex (line) | Required? | Format |
|-----|-------------|-----------|--------|
| `includes?` | `/^includes?\s*:\s*(.+)$/i` (413) | ✅ Yes | Single sentence |
| `excludes?` | `/^excludes?\s*:\s*(.+)$/i` (416) | No | Semicolon-separated `;` |
| `know` | `/^know\s*:\s*(.+?)\s*\[([^\]]+)\]\s*$/i` (417) | ✅ ≥1 | `claim text [source_id]` |
| `source` | `/^source\s*:\s*([^|]+)\|([^|]+)\|(.+)$/i` (419) | ✅ ≥1 | `id \| Title \| url` |
| `misconception` | `/^misconception\s*:\s*([^|]+)\|(.+)$/i` (421) | No | `wrong belief \| correction` |

**Compiler enforces at node level (lines 452-457):**
```ts
if (!grounding) throw ... // Missing ::: grounding block
if (grounding.must_know.length === 0) throw ... // needs ≥1 know: line
if (!grounding.scope.includes) throw ... // needs includes: line
if (grounding.sources.length === 0) throw ... // needs ≥1 source: line
```

**Validator also enforces (validate.ts lines 206-219):**
```ts
// checkScope: every node grounding.scope.includes must be non-empty
// checkFactGrounding: every must_know.source_id must resolve to a sources[].id
```

### `::: quiz <mcq|numeric|open> <L0-L5>`

**Directive detection (line 286):**
```ts
else if (kind === 'quiz') blocks.push(parseQuiz(inner, args, id(), ln.no));
```
- `args` = `"mcq L3"` or `"numeric L2"` or `"open L4"`
- Format defaults to `'mcq'` if first part is missing (line 360)
- Level defaults to `'L2'` if second part is missing (line 361)

**Full parseQuiz() function (lines 358-401):**

#### MCQ — regex at line 370:
```ts
const opt = ln.text.match(/^-\s*\[([ xX])\]\s*(.+)$/);
//           checkbox  ──┬──      ──┬─
//                  'x'/'X' marks answer  option text
```

- **Rules enforced at lines 388-392:**
  ```ts
  if (options.length < 2) throw ... // "needs at least two '- [ ]' options"
  if (answerIndex < 0) throw ...    // "Mark the correct mcq option with '- [x]'"
  block.answer_key = answerIndex;   // zero-based index of - [x] position
  ```
- **⚠️ BUG (line 372):** If multiple `- [x]` lines exist, the LAST one wins:
  ```ts
  if (opt[1].toLowerCase() === 'x') answerIndex = options.length;
  ```
  No validation warns about multiple `- [x]`. All but the last correct answer are **silently ignored**.

#### NUMERIC — regex at line 376:
```ts
const ans = ln.text.match(/^answer\s*:\s*(.+)$/i);
```

- **Rules enforced at lines 393-395:**
  ```ts
  if (numericAnswer == null || Number.isNaN(numericAnswer))
    throw ... // "needs 'answer: <number>'"
  block.answer_key = numericAnswer;  // stored as number
  ```
- ❌ **`**answer: 42**` (markdown bold) does NOT work** — regex requires `^answer\s*:\s*` at line start, no leading characters
- ❌ **`Answer: 42`** DOES work — regex has `/i` flag (case-insensitive)
- ❌ **`answer: four`** fails — `Number('four')` is `NaN`

#### OPEN — no answer matching:
```ts
block.rubric = Object.keys(rubric).length
  ? rubric
  : { criteria: 'A good answer addresses the question accurately and completely.' };
```
- **rubric regex at line 380:** `/^rubric\s*:\s*(.+)$/i`
- Optional — default rubric used if absent

#### Common to ALL quiz types:
- Question text captured from first non-matching line (lines 382-383)
- `explain:` regex at line 378: `/^explain\s*:\s*(.+)$/i`
- Validator also checks quiz keys (validate.ts lines 175-201):
  ```ts
  // closed quiz (mcq/numeric) must have answer_key
  // open quiz must have rubric
  ```

### `::: callout <tone>`

**Code (line 285):**
```ts
blocks.push({
  id: id(),
  type: 'callout',
  tone: args || 'info',
  md: inner.map((l) => l.raw).join('\n').trim()
});
```
- `tone` from args, defaults to `'info'`
- Content is the raw inner text, trimmed

### `::: layer <L0-L5> [deeper|remedial]`

**Code (lines 287-296):**
```ts
const [revealRaw, modeRaw] = args.split(/\s+/);
const sub = parseBlocks(inner, `${nodeId}-l${bn}`);
blocks.push({
  id: id(),
  type: 'layer',
  reveal_at: asMastery(revealRaw || 'L4', ln.no),
  mode: modeRaw === 'remedial' ? 'remedial' : 'deeper',
  blocks: sub.blocks,
});
```
- Inner content is recursively parsed via `parseBlocks()` — same pipeline as top-level node
- ⚠️ `mode` defaults to `'deeper'` if absent (line 294 ternary)
- ⚠️ `reveal_at` defaults to `'L4'` if absent

### `::: chart`

**Code (lines 297-301):**
```ts
let parsed: Record<string, unknown> | undefined;
try { parsed = JSON.parse(spec); } catch { /* keep raw */ }
blocks.push({ id: id(), type: 'chart', spec, parsed, caption: args || undefined });
```
- Inner content is JSON (Vega-Lite spec)
- `parsed` is best-effort; `spec` always preserved as raw string

### `::: table` (directive format — NOT GFM pipes)

**Code (lines 302-317):**
```ts
// Column format:  - [Title | field]  (regex line 311)
const cm = ln.trim().match(/^-\s*\[([^|]+)\|([^\]]+)\]\s*$/);
//                      ──┬──  ──┬──
//                    column name  field key

// Row format:  {"field": "value", ...}  (JSON per line, line 314)
try { rows.push(JSON.parse(ln.trim())); } catch { /* skip bad row */ }
```
- Switch from columns to rows at `rows:` header (regex `/^rows:/i` at line 308)
- `options:` header also recognized (line 309) but no handler — unused
- **⚠️ CSV `columns: Name, Role, Tenure` (capabilities-manifest.md format) does NOT work** — parser only reads `- [Title | field]`

### `::: flow [sankey|waterfall]`

**Code (lines 318-326):**
```ts
const variant = args.toLowerCase() === 'waterfall' ? 'waterfall' : 'sankey';
const em = ln.text.match(/^-\s*(.+?)\s*->\s*(.+?)\s*:\s*(\d+(?:\.\d+)?)\s*$/);
//               ──┬──       ──┬──       ──┬──       ─────┬────
//             from node     arrow     to node         numeric value
```
- Arrow syntax only: `- <from> -> <to> : <value>`
- ❌ **CSV comma-separated format** (capabilities-manifest.md lines 101-117) does NOT work

### `::: finchart`

**Code (lines 327-331):**
```ts
let parsed = ...;
try { parsed = JSON.parse(spec); } catch { /* keep raw */ }
blocks.push({ id: id(), type: 'finchart', spec, parsed, caption: args || undefined });
```
- Inner content is JSON only
- ❌ **YAML `type: area` format** (capabilities-manifest.md lines 128-135) does NOT parse as JSON — silently left as raw string

### `::: figure`

**Code (lines 332-339):**
```ts
if (svgContent.includes('<svg')) {
  blocks.push({ id: id(), type: 'svg', svg: svgContent });
} else {
  blocks.push({ id: id(), type: 'widget', kind: 'html', html: svgContent });
}
```
- Branch: if content contains `<svg` → `type: 'svg'`, else → `type: 'widget'`
- **NOT documented** in either `author-guide.md` or `capabilities-manifest.md`

### `::: html`

**Code (lines 340-342):**
```ts
blocks.push({ id: id(), type: 'widget', kind: 'html', html: htmlContent });
```
- Always stored as `type: 'widget', kind: 'html'`
- **NOT documented** in either resource file

### `::: video` — ⚠️ NOT IMPLEMENTED

**No handler in the parser (lines 284-346).** Falls through to the `else` at line 343:
```ts
// unknown directive -> keep as prose so nothing is silently lost
prose.push(inner.map((l) => l.raw).join('\n'));
```
- Content is silently dumped into the prose buffer
- ✅ The `VideoBlock` type EXISTS (`types.ts` line 93-100):
  ```ts
  interface VideoBlock { type: 'video'; provider: 'youtube' | 'vimeo' | 'file'; ref: string; ... }
  ```
- ❌ But the parser has no code path that produces it
- ❌ The JSON schema likely has the video block type too — but .lmd can't reach it

### `::: widget` — ⚠️ NOT IMPLEMENTED

Same as video — no handler. Falls through to unknown-directive → prose.
- `WidgetBlock` type EXISTS (`types.ts` line 102-111)
- Parser has no code path producing it

### Unknown directives

**Code (lines 343-346):**
```ts
// unknown directive -> keep as prose so nothing is silently lost
prose.push(inner.map((l) => l.raw).join('\n'));
```
- Content is preserved as prose text, NOT lost entirely
- The directive markers `::: unknown ...` ARE consumed — only inner content survives
- **This means** `::: video` and `::: widget` content ends up as untyped prose without error

---

## Node-Level Compilation Rules

Enforced in the node mapping loop (lines 442-466):

| Rule | Line | Error Message |
|------|------|---------------|
| Every node needs `::: grounding` | 452 | `Node "X" is missing its "::: grounding" block` |
| Grounding needs ≥1 `know:` line | 455 | `grounding needs at least one "know: ... [src]" fact` |
| Grounding needs `includes:` line | 456 | `grounding needs an "includes:" scope line` |
| Grounding needs ≥1 `source:` line | 457 | `grounding needs at least one "source: id \| Title \| url" line` |
| L2+ nodes need a visual block | 463 | `Node "X" targets L3 and needs at least one visual block` |
| `@mastery` must be L0-L5 | 53 | `"X" is not a mastery level (use L0-L5)` |

**Visual types set (line 39):**
```ts
const VISUAL_TYPES = new Set(['mermaid', 'image', 'widget', 'math', 'chart', 'finchart', 'flow', 'layer', 'svg']);
```
NOTE: `layer` is listed as visual — so a node with only a `::: layer L2` block (which recursively contains visuals) satisfies the rule.

---

## Cross-Block Consistency Analysis

### Convention families in the parser:

| Convention | Used by | Line |
|-----------|---------|------|
| `key: value` plain lines | grounding (includes/excludes/know/source/misconception), quiz (answer/explain/rubric) | 376-381, 413-422 |
| `- [x]` checkbox options | quiz mcq only | 370 |
| `- A -> B : N` arrow syntax | flow only | 323 |
| `- [Title \| field]` list format | table directive only | 311 |
| JSON inner content | chart, finchart | 300, 329 |
| Recursive block parsing | layer | 289 |
| `<svg>` detection | figure | 334 |

### Consistency findings:

1. **grounding and quiz SHARE the `key: value` convention** for metadata fields
   (`includes:`, `source:`, `answer:`, `explain:`, `rubric:`). This IS consistent.

2. **grounding and quiz DIFFER on data structure formats:**
   - Grounding uses `|` pipe delimiter for structured values: `know: claim [src_id]`, `source: id | Title | url`, `misconception: wrong | correct`
   - Quiz mcq uses `- [ ]` checkbox convention instead — this is a deliberate design choice (checkbox syntax is universally recognized for MCQ) but is the #1 source of authoring errors

3. **table directive uses `- [Title | field]`** — similar to grounding's `source: id | Title | url` pipe convention, but the parser for `grounding` is `\|` splitting and for `table` is a column-specific regex. Superficially consistent but different implementation.

4. **flow is the ONLY block using arrow syntax.** `capabilities-manifest.md` describes CSV comma format — completely incompatible.

5. **chart/finchart use JSON.** finchart's `capabilities-manifest.md` shows YAML format — COMPLETELY incompatible.

---

## Bugs & Issues Flagged

### 🔴 BUG-1: Multiple `- [x]` in MCQ silently collapsed (line 372)
```ts
if (opt[1].toLowerCase() === 'x') answerIndex = options.length;
```
Each `- [x]` resets `answerIndex`. Only the LAST `- [x]` is stored. The test file
`__lmd_verify.ts` generates two `- [x]` lines without realizing only one survives.
**Fix:** Either validate that only one `- [x]` exists (preferred), or change `answer_key`
to an array to support multi-answer MCQ.

### 🔴 BUG-2: `::: video` and `::: widget` silently drop structured content into prose (lines 343-346)
Both `VideoBlock` and `WidgetBlock` types exist in the schema, and both are mentioned
in `capabilities-manifest.md`, but the parser has no handler for them. Content
survives as untyped prose text. **Fix:** Add handlers in the `kind ===` dispatch chain.

### 🟡 BUG-3: `options:` header recognized but ignored in `::: table` (line 309)
```ts
if (/^options:/i.test(ln.trim())) { parsing = 'options'; continue; }
```
Sets parsing mode to `'options'` but no code handles `parsing === 'options'`.
Parsing effectively stops here — all subsequent lines are silently skipped.
**Fix:** Either implement options parsing or remove the recognition.

### 🟡 BUG-4: `mode` defaults silently in `::: layer` (line 294)
```ts
mode: modeRaw === 'remedial' ? 'remedial' : 'deeper',
```
If args say `::: layer L3` (no mode), `modeRaw` is `undefined`, which is `!== 'remedial'`,
so it silently defaults to `'deeper'`. This is likely intentional but undocumented.

### 🟡 BUG-5: `structure.blocks` not used in layer output (line 290)
```ts
const sub = parseBlocks(inner, `${nodeId}-l${bn}`);
blocks.push({ ... blocks: sub.blocks });
```
The `sub.grounding` from recursive parsing is discarded. If someone nests a `::: grounding`
inside a `::: layer`, the grounding metadata is silently dropped.

### 🟡 BUG-6: No warning for duplicate `@mastery` or `@prereq` attributes
```ts
(body as any).__attrs[at[1]] = at[2].trim();
```
If a node has two `@mastery` lines, the later one silently overwrites the first.
**Fix:** Check and warn.

### 🟡 BUG-7: `@prereq` does not validate node existence at parse time
```ts
const prereq = attrs.prereq ? attrs.prereq.split(/\s+/).map(slug).filter(Boolean) : undefined;
```
Prereq resolution is deferred to `validateFull()` (validate.ts lines 53-71). This means
a typo in `@prereq some-node-idd` is only caught after a full compiler pass + validation pass.

### 🔴 BUG-8: `author-guide.md` describes JSON-only output — the pipeline is now .lmd-first
`author-guide.md` line 1: "Output ONE valid JSON object and NOTHING ELSE — no explanation,
no markdown fences, no comments." But the actual entry point (`toLdoc()` in lessonInput.ts)
prefers .lmd Markdown. If the model follows the author-guide and outputs JSON, it hits
JSON.parse() which is the error-prone path the compiler was designed to avoid.

### 🔴 BUG-9: `capabilities-manifest.md` describes WRONG syntax for 5 block types
| Block | capabilities-manifest says | Parser actually reads |
|-------|--------------------------|----------------------|
| quiz mcq | `options:\n  - 3\n  - 4\nanswer_key: 1` (lines 172-181) | `- [ ]`, `- [x]` checkboxes |
| quiz numeric | (not shown) | `answer: <number>` |
| flow | CSV comma values (lines 101-117) | `- from -> to : value` arrow syntax |
| table | `columns: Name, Role` CSV (lines 82-96) | `- [Title \| field]` then JSON rows |
| finchart | YAML `type: area` (lines 128-135) | JSON only |
| layer | `reveal_at: L3\nmode: deeper\nblocks: [...]` YAML (lines 225-231) | `::: layer L3 deeper` inline args only |

---

## Quick Reference Card (for pasting into system prompt)

```
--- FRONTMATTER ---
title: Required    id: optional    part: 0-10    version: 1.0.0

--- NODE ATTRIBUTES ---
@mastery L0-L5     (required)
@prereq node-id    (optional, space-separated)

--- INLINE BLOCKS (not :::) ---
prose:     bare text
code:      ```language ... ```
mermaid:   ```mermaid ... ```
math:      $$ ... $$
image:     ![alt](url)
table:     | h1 | h2 |  +  | --- | --- |  +  rows

--- ::: DIRECTIVE BLOCKS ---
::: grounding
  includes: <scope>
  excludes: <item>;<item>
  know: <claim> [source_id]
  source: <id> | <Title> | <url>
  misconception: <wrong> | <correct>
:::

::: quiz mcq L3
Question text
- [ ] wrong option
- [x] correct option  (exactly one [x])
- [ ] wrong option
explain: Why the answer is correct
:::

::: quiz numeric L2
Question text
answer: <number>      ← plain "answer:" at line start, no markdown
explain: ...
:::

::: quiz open L4
Question text
rubric: What a good answer covers
:::

::: callout <info|warning|tip|caution>
Content text
:::

::: layer <L0-L5> [deeper|remedial]
...any nested blocks...
:::

::: chart
{ JSON Vega-Lite spec }
:::

::: table
- [Column Title | field_name]
rows:
{"field_name": "value"}
:::

::: flow [sankey|waterfall]
- From -> To : <number>
caption: ...
:::

::: finchart
{ JSON spec }
:::

::: figure
<svg>...</svg>   or   any HTML content
:::

::: html
HTML content
:::
```

---

## TypeScript Types (src/shared/learn/types.ts)

```ts
type BlockType = 'prose' | 'math' | 'mermaid' | 'code' | 'image' | 'video'
               | 'widget' | 'quiz' | 'callout' | 'layer' | 'chart'
               | 'table' | 'flow' | 'finchart' | 'svg';

type QuizFormat = 'mcq' | 'numeric' | 'open';

interface QuizBlock {
  type: 'quiz';
  format: QuizFormat;
  q: string;
  options?: string[];        // mcq only
  answer_key?: unknown;      // mcq: number (index), numeric: number, open: absent
  rubric?: Record<string, string>;  // open only
  level: MasteryLevel;
}

interface LayerBlock {
  type: 'layer';
  reveal_at: MasteryLevel;
  mode: 'deeper' | 'remedial';
  blocks: LdocBlock[];       // recursively parsed
}

interface FlowBlock {
  type: 'flow';
  variant: 'sankey' | 'waterfall';
  spec: string;
  edges?: { from: string; to: string; value: number }[];
}
```
