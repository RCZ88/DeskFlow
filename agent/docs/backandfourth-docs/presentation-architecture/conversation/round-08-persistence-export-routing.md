# CONTEXT: Persistence + Export + Provider Routing — Complete Code

---

## PART A: Presentation Database / Persistence

### Schema (main.ts lines 1923-1929)

```sql
CREATE TABLE IF NOT EXISTS presentations (
  id TEXT PRIMARY KEY,
  episode_id INTEGER,
  topic TEXT,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'generating',
  slide_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS presentation_slides (
  id TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL,
  index_order INTEGER DEFAULT 0,
  frame_type TEXT DEFAULT 'value',
  html_content TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Guarded ALTER:
ALTER TABLE presentations ADD COLUMN archived_at TEXT;
```

### Live IPC handlers (main.ts lines 1936-1988)

```typescript
// presentation:list
ipcMain.handle('presentation:list', async (_, opts?: any) => {
  if (!db) return { ok: false, error: 'DB not ready' };
  ensurePresTables();
  const filter = opts?.archived;
  let list;
  if (filter === true || filter === 'true') {
    list = db.prepare('SELECT * FROM presentations WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all();
  } else if (filter === 'all') {
    list = db.prepare('SELECT * FROM presentations ORDER BY archived_at DESC NULLS LAST, created_at DESC').all();
  } else {
    list = db.prepare('SELECT * FROM presentations WHERE archived_at IS NULL ORDER BY created_at DESC').all();
  }
  return { ok: true, data: list };
});

// presentation:get
ipcMain.handle('presentation:get', async (_, { presentationId }: any) => {
  if (!db) return { ok: false, error: 'DB not ready' };
  ensurePresTables();
  const pres = db.prepare('SELECT * FROM presentations WHERE id=?').get(presentationId) as any;
  if (!pres) return { ok: false, error: 'Not found' };
  const slides = db.prepare('SELECT * FROM presentation_slides WHERE presentation_id=? ORDER BY index_order ASC').all(presentationId);
  return { ok: true, data: { ...pres, slides } };
});

// presentation:import
ipcMain.handle('presentation:import', async (_, { topic, slideCount, slides }: any) => {
  if (!db) return { ok: false, error: 'DB not ready' };
  ensurePresTables();
  const presId = presUid();
  db.prepare('INSERT INTO presentations (id, topic, title, status, slide_count) VALUES (?, ?, ?, ?, ?)')
    .run(presId, topic || null, topic || 'Imported', 'ready', slideCount || slides.length);
  for (let i = 0; i < slides.length; i++) {
    db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, html_content) VALUES (?, ?, ?, ?, ?)')
      .run(presUid(), presId, i, slides[i].frameType || 'value', slides[i].html);
  }
  return { ok: true, data: { id: presId, slideCount: slides.length } };
});

// presentation:delete
ipcMain.handle('presentation:delete', async (_, { presentationId }: any) => {
  if (!db) return { ok: false, error: 'DB not ready' };
  ensurePresTables();
  db.prepare('DELETE FROM presentation_slides WHERE presentation_id=?').run(presentationId);
  db.prepare('DELETE FROM presentations WHERE id=?').run(presentationId);
  return { ok: true };
});

// presentation:archive
ipcMain.handle('presentation:archive', async (_, { presentationId }: any) => {
  if (!db) return { ok: false, error: 'DB not ready' };
  ensurePresTables();
  db.prepare("UPDATE presentations SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id=?").run(presentationId);
  return { ok: true };
});

// presentation:unarchive
ipcMain.handle('presentation:unarchive', async (_, { presentationId }: any) => {
  if (!db) return { ok: false, error: 'DB not ready' };
  ensurePresTables();
  db.prepare('UPDATE presentations SET archived_at = NULL, updated_at = datetime(\'now\') WHERE id=?').run(presentationId);
  return { ok: true };
});

// presentation:update-slide
ipcMain.handle('presentation:update-slide', async (_, { slideId, htmlContent }: any) => {
  if (!db) return { ok: false, error: 'DB not ready' };
  ensurePresTables();
  db.prepare('UPDATE presentation_slides SET html_content=? WHERE id=?').run(htmlContent, slideId);
  return { ok: true };
});

// presentation:generate — STUB
ipcMain.handle('presentation:generate', async () => ({ ok: false, error: 'Use auto-generate' }));

// presentation:export-slide — STUB
ipcMain.handle('presentation:export-slide', async () => ({ ok: false, error: 'Not implemented' }));
```

### Dead code in index.ts (lines 128-182)

```typescript
// This code exists but is NEVER called (registerPresentationHandlers is never imported)
_db.prepare('INSERT INTO presentations (id, episode_id, topic, title, status, slide_count) VALUES (?, ?, ?, ?, ?, ?)')
  .run(presId, episodeId || null, topic || null, title, 'generating', frames.length);

// Per-slide insertion with retry logic:
_db.prepare('INSERT INTO presentation_slides (id, presentation_id, index_order, frame_type, html_content) VALUES (?, ?, ?, ?, ?)')
  .run(slideId, presId, frame.index ?? i, frame.frame_type, html);

// Final status update:
_db.prepare("UPDATE presentations SET status = 'ready', slide_count = ?, updated_at = ? WHERE id = ?")
  .run(slides.length, now(), presId);
```

### Persistence model answers:

| Question | Answer |
|----------|--------|
| One DB row = one slide or one presentation? | `presentations` = one row per presentation. `presentation_slides` = one row per slide. FK relationship. |
| `html_content` interpreted by backend? | **NO.** Stored as opaque TEXT. Backend never parses it. Only the renderer (frontend) interprets it. |
| Metadata indicating HTML vs JSON? | **NONE.** No `format` column, no `content_type` column. The renderer guesses by attempting `JSON.parse`. |
| Slide order authoritative in `index_order`? | **YES.** `ORDER BY index_order ASC` is used in `presentation:get`. Import sets `index_order = i` (0-based). |
| Versioning? | **NONE.** No version column. No migration tracking. |
| Mixed HTML/JSON slides? | **POSSIBLE but accidental.** Nothing prevents it. Each slide's `html_content` is independent. |
| Atomicity/transaction? | **NO.** No `BEGIN`/`COMMIT`/`ROLLBACK` in `presentation:import`. Each INSERT is independent. |
| What if slide 4 of 6 fails? | In import: the loop continues, partial slides are saved. In generation (dead code): error slide is saved with error message HTML. |
| Partially generated presentations? | **YES.** Import saves all slides atomically per-row. Generation (dead code) saves each slide as it succeeds. |
| What does `status` mean? | Set to `'generating'` on insert, `'ready'` on completion. Never read by any code — purely informational. |

---

## PART B: Export

### `src/services/presentation/export.ts` (93 lines — COMPLETE)

```typescript
import { BrowserWindow, nativeImage } from 'electron';
import path from 'path';

let exportWindow: BrowserWindow | null = null;

function getExportWindow(): BrowserWindow {
  if (exportWindow && !exportWindow.isDestroyed()) return exportWindow;

  exportWindow = new BrowserWindow({
    width: 1080,
    height: 960,
    show: false,
    transparent: true,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  return exportWindow;
}

export async function exportSlideToPng(htmlContent: string): Promise<{ ok: boolean; data?: Buffer; error?: string }> {
  try {
    const win = getExportWindow();
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    await win.loadURL(dataUrl);
    await new Promise(resolve => setTimeout(resolve, 800));
    const size = win.getSize();
    const image: nativeImage = await win.webContents.capturePage({
      x: 0, y: 0, width: size[0], height: size[1],
    });
    const buffer = image.toPNG();
    return { ok: true, data: buffer };
  } catch (err: any) {
    console.error('[Presentation] Export failed:', err.message);
    return { ok: false, error: err.message || 'Export failed' };
  }
}

export async function exportSlideToTransparentPng(htmlContent: string): Promise<{ ok: boolean; data?: Buffer; error?: string }> {
  try {
    const win = getExportWindow();
    const transparentHtml = htmlContent.replace(
      /<body([^>]*)>/i,
      '<body$1 style="background: transparent !important;">'
    ).replace(
      /<style[^>]*>/i,
      '<style>$&:root, body, html { background: transparent !important; }'
    );
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(transparentHtml)}`;
    await win.loadURL(dataUrl);
    await new Promise(resolve => setTimeout(resolve, 800));
    const size = win.getSize();
    const image: nativeImage = await win.webContents.capturePage({
      x: 0, y: 0, width: size[0], height: size[1],
    });
    const buffer = image.toPNG();
    return { ok: true, data: buffer };
  } catch (err: any) {
    console.error('[Presentation] Transparent export failed:', err.message);
    return { ok: false, error: err.message || 'Transparent export failed' };
  }
}

export function destroyExportWindow() {
  if (exportWindow && !exportWindow.isDestroyed()) {
    exportWindow.destroy();
    exportWindow = null;
  }
}
```

### Export callers

The export is called from `index.ts:239-268` (DEAD CODE — never loaded):

```typescript
ipcMain.handle('presentation:export-slide', async (_, { slideId, transparent }: any) => {
  const slide = _db.prepare('SELECT * FROM presentation_slides WHERE id=?').get(slideId) as any;
  if (!slide) return { ok: false, error: 'Slide not found' };
  const { exportSlideToPng, exportSlideToTransparentPng } = require('./export');
  const result = transparent
    ? await exportSlideToTransparentPng(slide.html_content)
    : await exportSlideToPng(slide.html_content);
  // ... save dialog, write file
});
```

The LIVE stub in main.ts:
```typescript
ipcMain.handle('presentation:export-slide', async () => ({ ok: false, error: 'Not implemented' }));
```

### Export model answers:

| Question | Answer |
|----------|--------|
| Supports raw HTML? | **YES.** Loads `html_content` as `data:text/html` URL in offscreen BrowserWindow. |
| Supports JSON/React slides? | **NO.** Export reads `html_content` which is either raw HTML or a JSON string. JSON string would render as plain text in the BrowserWindow. |
| Mechanism? | Offscreen BrowserWindow (1080×960), `loadURL(dataUrl)`, `capturePage()` → `nativeImage.toPNG()`. |
| Viewport dimensions? | **Fixed 1080×960.** No aspect ratio handling. |
| 9:8 vs 9:16? | **NOT HANDLED.** Always exports at 1080×960 (9:8). |
| Font waiting? | **NO.** Only `setTimeout(800)` — no `document.fonts.ready`. |
| Animation handling? | **NO.** Captures after 800ms delay. Animations may be mid-flight or not started. |
| SVG/CSS correct? | **DEPENDS.** HTML with inline SVG/CSS should render. External fonts may not load in 800ms. |
| Transparent export? | **YES but hacky.** Regex-replaces `<body>` and `<style>` to inject `background: transparent`. |
| Interactive visuals? | **NOT HANDLED.** Step-through state is not set. Charts may not have rendered their data. |
| Operates on stored artifact? | **YES.** Reads `html_content` from DB, not from the rendered React component. |

---

## PART C: Provider Routing Configuration

### How routing is persisted

```typescript
// main.ts:19945-19950
electron_1.ipcMain.handle('save-ai-providers', async (_event, state: any) => {
  userPreferences = userPreferences || {};
  userPreferences.aiProviders = JSON.stringify(state);
  savePreferences();
  return { success: true };
});
```

Provider state is stored as a JSON string in `userPreferences.aiProviders`. The `state` object has the shape:

```typescript
{
  providers: ProviderConfig[],
  routing: {
    default: { providerId: string; model: string },
    researchDigest?: { providerId: string; model: string } | null,
    goalAssistant?: { providerId: string; model: string } | null,
    // ... other features
  }
}
```

### How routing is loaded

```typescript
// Every feature that needs AI does:
const p = userPreferences || {};
const pState = migrateProviderNames(JSON.parse(p.aiProviders || 'null'));
const chain = buildChain(pState, 'featureName');
const { result } = await runWithFallback(chain, { systemPrompt, messages, maxTokens });
```

### How routing is edited in the UI

`AiPage.tsx` has a `handleRoutingSave` function:

```typescript
const routing = { ...(state?.routing || {}) };
routing[feature] = entry;
await window.deskflowAPI!.saveAiProviders({ providers, routing });
setAiRouting(routing);
```

The `AiProviderSelectModal` component lets users pick a provider+model for each feature.

### How a feature is added to routing

1. Add the feature key to the `routing` object in `AiProvidersState` (types.ts)
2. Add the feature key to the `buildChain()` feature union (router.ts)
3. Add UI for configuring it in AiPage.tsx or SettingsPage.tsx
4. The `save-ai-providers` handler persists the entire state JSON

### Can `presentation` be added without DB migration?

**YES.** Routing is stored as a JSON blob (`userPreferences.aiProviders`). Adding a new key to the routing object requires no schema change — it's just a new property in the JSON. Old clients ignore unknown keys.

### What happens when a routing entry is missing?

```typescript
const assigned = state.routing[feature] ?? state.routing.default;
```

Falls back to `state.routing.default`. If that's also missing, the chain is empty and `runWithFallback` throws "No providers available".

### Is `default` always available?

In the initialization code (main.ts:19934-19938):
```typescript
routing: {
  default: { providerId: 'auto', model: '' },
  researchDigest: null,
  goalAssistant: null,
}
```

`default` is always initialized. Other features start as `null` (meaning they fall back to default).

### Is provider/model selection validated?

**NO.** The routing entry is passed directly to `buildChain`. If `providerId` doesn't match any enabled provider, the primary is skipped and fallbacks are used. If no providers match, the chain is empty and an error is thrown. No explicit validation.

---

## PART D: The aiCall wiring pattern (how other features do it)

From main.ts lines 4148-4163 (Lyceum Learn as example):

```typescript
const { registerLearnHandlers } = require('./services/learn/index.js');
const { buildChain, runWithFallback } = require('./services/providers/router');

registerLearnHandlers(db, async (prompt: string, systemPrompt: string, maxTokens?: number) => {
  const p = userPreferences || {};
  const pState = migrateProviderNames(JSON.parse(p.aiProviders || 'null'));
  if (!pState || !pState.providers || pState.providers.filter((p: any) => p.enabled).length === 0) {
    throw new Error('No AI provider configured');
  }
  const chain = buildChain(pState, 'goalAssistant');  // uses 'goalAssistant' feature
  if (chain.length === 0) throw new Error('No AI provider configured');
  const { result } = await runWithFallback(chain, {
    systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: maxTokens || 500,
  });
  return result.content;
});
```

**This is the exact pattern presentation generation needs to follow.** Replace `'goalAssistant'` with `'presentation'` (after extending the feature union), and the wiring is identical.

---

## PERSISTENCE MODEL:
One `presentations` row per deck, one `presentation_slides` row per slide, `html_content` is an opaque TEXT field storing either raw HTML or JSON string with no format indicator, no transactions, no versioning, and `status` is write-only informational.

## EXPORT MODEL:
Offscreen BrowserWindow at fixed 1080×960, loads `html_content` as data URL, captures after 800ms delay, no font waiting, no animation handling, no aspect ratio support, no JSON rendering — export is HTML-only and currently dead code behind a stub.

## ROUTING MODEL:
Provider routing is a JSON blob in `userPreferences.aiProviders`, loaded per-feature by `buildChain(pState, featureName)`, with fallback to `routing.default`. Adding `presentation` requires extending the TypeScript feature union in `router.ts` and adding a `presentation` key to the routing type in `types.ts`. No DB migration needed. The wiring pattern is identical to how Lyceum Learn and Content Engine are wired.

## MIGRATION RISK:
1. **No `format` column on `presentation_slides`** — adding JSON slides without a format indicator means the renderer must guess (JSON.parse try/catch). A `format` column ('html'|'json') would eliminate the guesswork.
2. **No transaction on multi-slide import** — partial imports can leave orphaned slides if the process crashes mid-loop.
3. **Export is HTML-only** — JSON slides cannot be exported to PNG without first rendering them through the React component, which requires a different export mechanism (e.g., capturing the iframe/rendered component instead of loading raw text).
4. **Token tier fallback (4000→100→50→40) is inappropriate for structured JSON** — truncation at 100 tokens guarantees invalid JSON. Presentation generation needs a minimum token floor or a different retry strategy.
5. **`currentFeature` global mutable state in router.ts** — concurrent AI calls could misattribute debug events. Not a blocker but a correctness issue.
6. **`status` column is never read** — it's set to 'generating'/'ready' but no code checks it. Can be repurposed or removed.
