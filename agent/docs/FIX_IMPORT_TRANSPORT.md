# Fix Prompt — Lyceum Learn `.lmd` Import Transport Bug + Import UI Mislabel

Paste everything below to your coding agent. It is code-anchored to the real repo. Do the transport fix first (§2), then the UI relabel (§3), then verify (§4).

---

## 1. The bug (what's actually wrong)

**Symptom:** Pasting a lesson into the **Import** screen fails with:

> 1 error — `No number after minus sign in JSON at position 1 (line 1 column 2)`

**Root cause (confirmed):** The import screen calls `JSON.parse()` on the pasted text. But the lesson artifact the authoring model produces is **`.lmd` (Lesson Markdown)**, which by spec begins with a YAML-style frontmatter fence:

```
---
title: What AI Engineers Actually Do
id: what-ai-engineers-actually-do
part: 0
...
```

`JSON.parse("---\n...")` sees the leading `-` at index 1 and throws *"No number after minus sign in JSON at position 1."* This is a **system/transport bug**, not bad model output — the `.lmd` is valid. The other historical variants of this same bug (`Unexpected token '#'`, `` Unexpected token '`' ``, `Bad escaped character ... \frac`) are all the same root cause: **`.lmd` text being fed to a JSON parser.**

**The compiler already exists and is simply not wired in:**

- `src/services/learn/parseLessonMarkdown.ts:347` → `export function parseLessonMarkdown(source: string): LdocDocument` — this compiles `.lmd` → the `.ldoc` document object. It is **never called** in the import flow.

**Where the raw `JSON.parse` calls are (all in `src/components/learn/LearnPage.tsx`):**

| Line | Handler | Bad call |
|---|---|---|
| 136 | `handleImport` | `const json = JSON.parse(importText);` |
| 157 | `handleImportExample` | `const json = JSON.parse(content);` |
| 190 | `handlePickFile` | `const json = JSON.parse(result.content);` |
| 207 | `handleImportWithValidation` | `const json = JSON.parse(importText);` |

These then call `api.learnValidate({ json })` and `api.learnImportLdoc({ json })`, whose IPC handlers live in `src/services/learn/index.ts` (`learn:validate` → `validateFull(json)`, `learn:importLdoc` → `importer.importLdoc(json)`). Both expect the **already-parsed `LdocDocument` object.**

**Design mismatch to fix, not just the crash:** the app was built to import compiled `.ldoc` **JSON**, but the natural artifact users have (from the authoring prompt) is **`.lmd` Markdown**. The importer must accept **both**, detect which, and compile `.lmd` when needed.

---

## 2. Fix the transport (do this first)

### 2a. Add one normalizer that turns ANY pasted lesson into an `LdocDocument`

Centralize the fix in the **main process** so all paths share it. In `src/services/learn/index.ts`, add a helper and reuse the existing defensive JSON parse (`parseLessonJson`) that's already in that file:

```ts
import { parseLessonMarkdown } from './parseLessonMarkdown';
import type { LdocDocument } from '../../shared/learn/types';

/**
 * Accept either compiled .ldoc JSON or raw .lmd Markdown and return an LdocDocument.
 * Detection: JSON documents start with '{'. Everything else is treated as .lmd
 * (which by spec starts with a '---' frontmatter fence).
 */
function toLdocDocument(raw: string):
  | { ok: true; data: LdocDocument }
  | { ok: false; error: string } {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{')) {
    const parsed = parseLessonJson(raw);            // existing defensive JSON parser
    if (!parsed.ok) return parsed;
    return { ok: true, data: parsed.data as LdocDocument };
  }
  try {
    return { ok: true, data: parseLessonMarkdown(raw) };  // .lmd → .ldoc
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Could not compile .lmd lesson: ${msg}` };
  }
}
```

### 2b. Change the IPC handlers to accept raw source, not pre-parsed JSON

Still in `src/services/learn/index.ts`, change the two handlers so the renderer never has to parse anything. Accept a `source` string (keep backward-compat by also accepting `json`):

```ts
ipcMain.handle('learn:validate', (_e, payload: { source?: string; json?: unknown }) => {
  if (typeof payload.source === 'string') {
    const doc = toLdocDocument(payload.source);
    if (!doc.ok) return { ok: false, errors: [{ message: doc.error }], warnings: [] };
    return validateFull(doc.data);
  }
  return validateFull(payload.json);           // legacy callers
});

ipcMain.handle('learn:importLdoc', (_e, payload: { source?: string; json?: unknown }) => {
  if (typeof payload.source === 'string') {
    const doc = toLdocDocument(payload.source);
    if (!doc.ok) return { ok: false, error: doc.error };
    return importer.importLdoc(doc.data);
  }
  return importer.importLdoc(payload.json);    // legacy callers
});
```

> If `parseLessonMarkdown` is pure (no node/electron deps — it is), you MAY instead import it directly in the renderer and compile there. Prefer the IPC approach above so all parsing stays in one place and the renderer holds no format logic.

### 2c. Update the preload/IPC type signatures

Wherever `learnValidate` / `learnImportLdoc` are typed in the preload bridge / `api` wrapper (search `learnImportLdoc` and `learnValidate`), allow `{ source: string }` in addition to `{ json }`.

### 2d. Stop parsing in the renderer — send raw text

In `src/components/learn/LearnPage.tsx`, delete the four `JSON.parse(...)` calls (L136, L157, L190, L207) and pass the raw text through instead. Examples:

```ts
// handleImportWithValidation (was L207+)
setImportResult(null);
const valResult = await api.learnValidate({ source: importText });
setImportErrors(valResult.ok ? [] : valResult.errors);
setImportWarnings(valResult.warnings || []);
if (valResult.ok) {
  const r = await api.learnImportLdoc({ source: importText });
  setImportResult(r);
  if (r.ok && r.data.lessonId) loadLessons();
}

// handleImport (was L136+)
const result = await api.learnImportLdoc({ source: importText });

// handlePickFile (was L190+) — validate the raw file text
const valResult = await api.learnValidate({ source: result.content });

// handleImportExample (was L157+) — the bundled example may be .ldoc JSON OR .lmd;
// toLdocDocument handles both, so just pass content through:
setImportText(content);
const valResult = await api.learnValidate({ source: content });
```

Remove the now-unneeded `try/catch (err) { setImportResult({ ok:false, error: err.message }) }` blocks that only existed to catch `JSON.parse` throws (keep a catch for genuine IPC failures).

---

## 3. Fix the UI so it stops lying about "JSON"

The screen accepts `.lmd` now, so relabel it. All strings below are in `src/components/learn/LearnPage.tsx` unless noted.

| Location | Current | Change to |
|---|---|---|
| L937 header | `Import .ldoc` | `Import lesson` |
| L953 subtitle | `Memory Hierarchy — demonstrates all 10 block types` | keep, but make sure the example matches what users author (see note) |
| L984 tab label | `Paste JSON` | `Paste lesson` |
| L975 tab | `Pick file` | keep |
| ~L997 pick-file body | `Click to select a .ldoc file` / `.ldoc or .json extension` | `Click to select a lesson file` / `.lmd, .ldoc, or .json` |
| ~L1013 textarea `placeholder` | `'{"doc": "ldoc/1.0", "lesson": {...}, "nodes": [...]}'` | `'Paste your .lmd lesson (starts with ---) or compiled .ldoc JSON'` |
| `OnboardingPanel.tsx:24` | `...or paste raw JSON. The validator checks...` | `...or paste a .lmd lesson (or compiled .ldoc JSON). The validator checks...` |

**File picker filter** — in `src/services/learn/index.ts` `learn:pick-file`, widen the dialog so `.lmd` files are selectable:

```ts
filters: [{ name: 'Lyceum Lesson', extensions: ['lmd', 'ldoc', 'json', 'md'] }],
title: 'Select a lesson file (.lmd or .ldoc)',
```

**Optional polish:** show a tiny detected-format chip next to the textarea (`.lmd` vs `.ldoc`) using the same `trimStart().startsWith('{')` heuristic, so the user gets feedback that the app understood their paste.

> Note on the worked example: if the bundled example is compiled `.ldoc` JSON, it still imports fine via `toLdocDocument`. Consider shipping the example as `.lmd` too, so "Start with the worked example" demonstrates the same format users actually author.

---

## 4. Acceptance criteria (verify before done)

1. **The reported failure passes:** paste a `.lmd` file beginning with `---\ntitle: ...` into **Paste lesson**, click **Validate & Import** → it compiles, validates, and imports. **No "minus sign" error.**
2. **JSON still works:** paste a compiled `.ldoc` object (`{"doc":"ldoc/1.0", ...}`) → imports unchanged.
3. **File pick works for `.lmd`:** selecting a `.lmd` file from disk imports it.
4. **No `JSON.parse` on user lesson text remains** in `LearnPage.tsx`:
   ```
   grep -n "JSON.parse" src/components/learn/LearnPage.tsx    # should show none on importText/content
   ```
5. **No UI string says "JSON"** as the only accepted format (tab, placeholder, pick-file body, onboarding).
6. **Regression test** — add `src/services/learn/__import_transport.test.ts` (or a runnable script) asserting:
   ```ts
   // .lmd path
   const lmd = `---\ntitle: T\nid: t\npart: 0\nversion: 1.0.0\nsummary: s\n---\n\n# Node\n@mastery L2\n\nProse.\n`;
   const doc = toLdocDocument(lmd);
   assert(doc.ok && doc.data.doc === 'ldoc/1.0' && doc.data.lesson.id === 't');
   // .ldoc JSON path
   const j = toLdocDocument(JSON.stringify(doc.data));
   assert(j.ok && j.data.lesson.id === 't');
   ```

## 5. Guardrails while editing

- Don't rewrite `parseLessonMarkdown.ts` — only call it. It already handles fenced code, `$$` math, and `:::` blocks.
- Preserve the existing defensive `parseLessonJson` / `extractJsonObject` / `stripTrailingCommas` helpers; reuse them for the JSON branch.
- The JSX in `ImportView` uses motion props that may appear as `...` placeholders in your source view — leave those exactly as-is; only change the text labels named in §3.
- Keep everything else (validator, import.service, renderer) untouched.
