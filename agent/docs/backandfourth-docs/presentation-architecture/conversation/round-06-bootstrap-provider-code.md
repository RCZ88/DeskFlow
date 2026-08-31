# CONTEXT: Application Bootstrap + Provider Wiring — Complete Trace

---

## 1. All references found

### `registerPresentationHandlers`
- **Defined:** `src/services/presentation/index.ts:84` — exported function
- **Imported/called:** NOWHERE. Zero imports in the entire codebase. Dead code.

### `presentation:generate` IPC
- **Registered (stub):** `src/main.ts:1948` — `ipcMain.handle('presentation:generate', async () => ({ ok: false, error: 'Use auto-generate' }))`
- **Registered (real but dead):** `src/services/presentation/index.ts:92` — full implementation with AI call, but never loaded

### `buildChain(`
- **Defined:** `src/services/providers/router.ts:32`
- **Feature union type:** `'researchDigest' | 'goalAssistant' | 'resumeBuilder' | 'category' | 'colors' | 'lifeAssistant' | 'monthlyRecap' | 'contentEngine' | 'vision'`
- **`'presentation'` is NOT in the union.** TypeScript would reject `buildChain(pState, 'presentation')`.

### `runWithFallback(`
- **Defined:** `src/services/providers/router.ts:115`
- **Called from:** main.ts at lines 4157, 4180, 5500, 15218, 19324, 20661, 22513, 22551, 22580, 22611, 25493, 25552, 31070, 35861, 35941 — ALL for other features (goalAssistant, contentEngine, researchDigest, etc.)
- **Called from presentation:** NEVER. Zero calls from any presentation code.

### `PROMPT_GENERATE_SLIDE`
- **Defined:** `src/services/presentation/prompts.ts:42` — exported const
- **Imported:** `src/features/presentation/PresentationWorkspace.tsx:5` (frontend only)
- **Imported in index.ts:** `src/services/presentation/index.ts:132` via `require('./prompts')` — dead code

### `PROMPT_GENERATE_JSON`
- **Defined:** `src/services/presentation/prompts.ts:340` — exported const
- **Imported:** `src/features/presentation/PresentationWorkspace.tsx:5` (frontend only)
- **Never referenced in any backend code.**

---

## 2. Application bootstrap section of main.ts

The presentation IPC block is at main.ts lines 1908-1975. Here is the complete relevant bootstrap:

```typescript
// ── AI Provider State (initialized earlier in main.ts) ──
// pState is the AiProvidersState object containing provider configs
// buildChain and runWithFallback are imported from ./services/providers/router

// ── Presentation IPC — registered at module top level ──
// Lines 1908-1975
{
  const crypto = require('crypto');
  const presUid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  
  function ensurePresTables() { /* creates tables + guarded ALTER for archived_at */ }
  
  // presentation:list — supports archived filter
  ipcMain.handle('presentation:list', async (_, opts?: any) => { ... });
  
  // presentation:get — returns presentation + slides
  ipcMain.handle('presentation:get', async (_, { presentationId }: any) => { ... });
  
  // presentation:import — stores raw slides
  ipcMain.handle('presentation:import', async (_, { topic, slideCount, slides }: any) => { ... });
  
  // presentation:delete — hard delete
  ipcMain.handle('presentation:delete', async (_, { presentationId }: any) => { ... });
  
  // presentation:archive — sets archived_at
  ipcMain.handle('presentation:archive', async (_, { presentationId }: any) => { ... });
  
  // presentation:unarchive — clears archived_at
  ipcMain.handle('presentation:unarchive', async (_, { presentationId }: any) => { ... });
  
  // presentation:update-slide — updates html_content
  ipcMain.handle('presentation:update-slide', async (_, { slideId, htmlContent }: any) => { ... });
  
  // presentation:generate — STUB
  electron_1.ipcMain.handle('presentation:generate', async () => ({ ok: false, error: 'Use auto-generate' }));
  
  // presentation:export-slide — STUB
  electron_1.ipcMain.handle('presentation:export-slide', async () => ({ ok: false, error: 'Not implemented' }));
}
```

**What's missing from the bootstrap:**
- No `registerPresentationHandlers(db, aiCall)` call
- No `buildChain(pState, 'presentation')` anywhere
- No `runWithFallback` for presentation
- No provider state passed to presentation module

---

## 3. Provider router source

```typescript
// src/services/providers/router.ts — COMPLETE relevant sections

export function buildChain(
  state: AiProvidersState,
  feature: 'researchDigest' | 'goalAssistant' | 'resumeBuilder' | 'category' | 'colors' | 'lifeAssistant' | 'monthlyRecap' | 'contentEngine' | 'vision',
): Array<{ provider: ResolvedProvider; model: string }> {
  // 'presentation' is NOT in the feature union
  // TypeScript would reject buildChain(pState, 'presentation')
  const enabled = state.providers.filter(p => p.enabled);
  const assigned = state.routing[feature] ?? state.routing.default;
  // ... builds chain from assigned primary + fallbacks
  return chain;
}

export async function runWithFallback(
  chain: ReturnType<typeof buildChain>,
  req: Omit<CanonicalRequest, 'model'>,
  externalSignal?: AbortSignal,
): Promise<{ result: CanonicalResponse; usedProviderId: string }> {
  // Tries each provider in chain, returns first success, throws if all fail
  for (const [i, link] of chain.entries()) {
    try {
      const result = await callWithTokenTiers(link.provider, { ...req, model: link.model }, externalSignal);
      return { result, usedProviderId: link.provider.config.id };
    } catch (err) {
      lastErr = err;
      // ... logs error, continues to next provider
    }
  }
  throw lastErr ?? new Error('No providers available');
}
```

---

## 4. Exact data flow trace

### What happens when user clicks "Auto Generate":

```
Frontend: handleAuto()
  → mkPrompt()
    → buildSlidePlan({ source, topic, mode, slideCount, ... })
    → compilePrompt(plan, PROMPT_GENERATE_SLIDE or PROMPT_GENERATE_JSON, tokens, aspectRatio)
    → returns fully-assembled prompt string
  → api()?.generate({ prompt, slideCount, topic, mode, theme })
  → preload: ipcRenderer.invoke('presentation:generate', opts)
  → main.ts:1948 stub handler
  → returns { ok: false, error: 'Use auto-generate' }
  → Frontend: toast(result?.error || 'Generation failed', 'error')
  → DONE. Nothing else happens.
```

### What would need to happen (doesn't exist):

```
Frontend: handleAuto()
  → mkPrompt()
  → api()?.generate({ prompt, outputFormat, ... })
  → preload: ipcRenderer.invoke('presentation:generate', opts)
  → main.ts handler (needs rewrite):
    → buildChain(pState, 'presentation')  // 'presentation' not in feature union
    → runWithFallback(chain, { systemPrompt, messages: [{ role: 'user', content: prompt }] })
    → AI returns raw text
    → If outputFormat === 'json': parse JSON, validate, store JSON
    → If outputFormat === 'html': extractHtml, validateHtml, store HTML
    → Return { ok: true, data: { id, title, slideCount } }
```

---

## 5. Does the backend know HTML vs JSON?

**NO.** The backend stub handler doesn't receive or check `outputFormat`. The frontend sends `outputFormat` in the `mkPrompt()` function (selects which prompt to use), but the backend `api()?.generate()` call doesn't pass `outputFormat` to the IPC handler. The stub ignores everything.

---

## 6. Specific questions answered

| Question | Answer |
|----------|--------|
| Does backend know HTML vs JSON? | **NO** — stub ignores all params |
| Does backend invoke `PROMPT_GENERATE_JSON`? | **NO** — only frontend imports it |
| Does any live code call `buildJsonSlidePrompt()`? | **NO** — only defined in prompts.ts, never called |
| Does any live code call `parseSlides()`? | **NO** — only called in frontend `handlePasteImport` (and that was removed in latest version) |
| Does any live code call `validateSpec()` or `validateSlide()`? | **NO** — exported but never called from any live path |
| Does backend persist JSON differently from HTML? | **NO** — backend is a stub, persistence never reached |

---

## 7. Duplicate/competing implementations

| Implementation | Location | Status |
|----------------|----------|--------|
| `registerPresentationHandlers()` with full AI generation | `src/services/presentation/index.ts:84-191` | **DEAD CODE** — exported, never imported |
| Presentation IPC stub handlers | `src/main.ts:1908-1975` | **LIVE** — actual registered handlers, but generate is a stub |
| Frontend `mkPrompt()` with format selection | `PresentationWorkspace.tsx:378-390` | **LIVE** — selects PROMPT_GENERATE_SLIDE or PROMPT_GENERATE_JSON |
| Frontend `handleAuto()` calling `api()?.generate()` | `PresentationWorkspace.tsx:414-439` | **LIVE** — calls the stub, gets error |

**Authoritative implementation based on imports/call sites:**
- `src/main.ts:1908-1975` is the ONLY live backend code
- `src/services/presentation/index.ts` is DEAD CODE
- `src/services/presentation/prompts.ts` is imported ONLY by the frontend

---

## 8. The feature union gap

`buildChain()` in `router.ts:32-34` has:
```typescript
feature: 'researchDigest' | 'goalAssistant' | 'resumeBuilder' | 'category' | 'colors' | 'lifeAssistant' | 'monthlyRecap' | 'contentEngine' | 'vision'
```

`'presentation'` is NOT in this list. Even if the stub were replaced with a real handler, `buildChain(pState, 'presentation')` would be a TypeScript error. The feature union must be extended to include `'presentation'`.

---

## LIVE PRESENTATION GENERATION ARCHITECTURE:

**Frontend:**
→ `handleAuto()` calls `mkPrompt()` which selects `PROMPT_GENERATE_SLIDE` or `PROMPT_GENERATE_JSON` based on `outputFormat` state, then calls `compilePrompt(plan, sysPrompt, tokens, aspectRatio)` to produce the final prompt string. Then calls `api()?.generate({ prompt, slideCount, topic, mode, theme })`.

**IPC:**
→ `ipcRenderer.invoke('presentation:generate', opts)` → main.ts handler at line 1948

**Generation service:**
→ STUB: `async () => ({ ok: false, error: 'Use auto-generate' })`. Returns immediately. No AI call.

**Provider router:**
→ MISSING — `buildChain` does not accept `'presentation'` as a feature. `runWithFallback` is never called for presentation.

**AI:**
→ DEAD CODE — `src/services/presentation/index.ts` has `_aiCall(prompt, systemPrompt, 4000)` at line 142, but this file is never imported.

**Response parser:**
→ DEAD CODE — `extractHtml()` in index.ts line 49 strips markdown fences and extracts HTML. Never reached.

**Validator:**
→ DEAD CODE — `validateHtml()` in index.ts line 63 checks DOCTYPE/html/body/style. `validateSpec()` and `validateSlide()` in slideValidator.ts are exported but never called.

**Persistence:**
→ WORKS for import only. `presentation:import` handler stores `slides[i].html` into `presentation_slides.html_content`. Generation persistence is DEAD CODE.
