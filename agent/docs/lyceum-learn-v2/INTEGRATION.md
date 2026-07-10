# Integration notes

Three wiring changes. All paths are relative to `src/`.

---

## 1. `services/learn/index.ts` — compile Markdown instead of parsing JSON

This is the actual fix for the `Unexpected token '`'` / `Expected ',' or '}'`
errors. The handler currently hand-parses the model's JSON. Replace that body
with the `toLdoc()` pipeline, which accepts Lesson Markdown (preferred) or JSON.

**Add an import at the top of the file:**

```ts
import { toLdoc } from './lessonInput';
import { LessonMarkdownError } from './parseLessonMarkdown';
```

**Replace the body of the `learn:generateLdoc` handler** (the block that builds
`jsonStr`, calls `parseLessonJson`, then `validateFull`) with:

```ts
ipcMain.handle('learn:generateLdoc', async (_event, { prompt, systemPrompt }: {
  prompt: string;
  systemPrompt: string;
}) => {
  try {
    const raw = await callAi(prompt, systemPrompt, 8000);
    if (!raw || typeof raw !== 'string') {
      return { ok: false, error: 'AI returned an empty response. Check your AI provider settings.' };
    }

    // Compile Lesson Markdown (preferred) or fall back to raw .ldoc JSON.
    let parsed: unknown;
    try {
      parsed = toLdoc(raw).doc;
    } catch (e) {
      const msg = e instanceof LessonMarkdownError ? e.message : (e as Error).message;
      return { ok: false, error: `Could not compile the lesson: ${msg}`, raw };
    }

    const valResult = validateFull(parsed);
    if (!valResult.ok) {
      return { ok: false, error: 'AI-generated lesson failed validation', validation: valResult, raw };
    }

    return importer.importLdoc(parsed);
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
});
```

The old `extractJsonObject` / `stripTrailingCommas` / `parseLessonJson` helpers
can stay (they're now used only by the JSON fallback inside `toLdoc`) or be
removed — they are no longer on the critical path.

Also update `learn:importLdoc` if you want the same Markdown tolerance for the
"Paste a draft" box — run the pasted string through `toLdoc()` before importing.

---

## 2. `resources/learn/author-guide.md` — swap the system prompt

`learn:buildPrompt` already loads `resources/learn/author-guide.md`. Replace that
file with the new one in this bundle. It instructs the model to emit Lesson
Markdown (`.lmd`) and never JSON — which is what makes the whole pipeline robust.

---

## 3. `components/learn/LearnPage.tsx` — use the editorial UI

Add the imports:

```ts
import { WelcomeEmptyState } from './WelcomeEmptyState';
import { LessonLibrary } from './LessonLibrary';
```

Replace the empty-state JSX (the `lessons.length === 0 && view === 'library'`
branch, ~lines 278–368) with:

```tsx
<WelcomeEmptyState
  onCompose={() => setShowCreateDialog(true)}
  onTryExample={handleTryExample}
  onImport={() => setView('import')}
  onPaste={() => setView('import')}
/>
```

Replace the populated library grid (the `view === 'library'` branch) with:

```tsx
<LessonLibrary
  lessons={lessons}
  loading={loading}
  onOpen={openLesson}
  onCompose={() => setShowCreateDialog(true)}
  onImport={() => setView('import')}
/>
```

`BookCard` is pulled in by `LessonLibrary`; no other changes are required. The
components only use tokens already defined in your `@theme` block plus the
classes added in step 4.

---

## 4. `index.css` — add the editorial textures

Append the contents of `src/styles/lyceum-editorial.css` to your existing
`src/index.css` (after the `@theme` block). These classes (`lyceum-book-cloth`,
`lyceum-book-pages`, `lyceum-shelf-rail`, `lyceum-welcome-glow`, …) are what give
the covers their cloth grain and shelf shadows.
