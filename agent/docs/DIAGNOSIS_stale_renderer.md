# Diagnosis — the import fix is on disk but NOT running (stale renderer bundle)

For the Architect. The transport fix in `FIX_IMPORT_TRANSPORT.md` is correct. The reason the **exact same** error persists is a build/serve problem, and it's the **renderer**, not the main process. Here's the proof, then the fix.

---

## 1. Proof it's a stale renderer (not a logic bug, not the main process)

The error text is *verbatim*: `No number after minus sign in JSON at position 1 (line 1 column 2)`. That is the raw V8 `JSON.parse` message. Trace where it can come from:

- **Renderer** (`LearnPage.tsx`): the old handlers do `const json = JSON.parse(importText)` inside `try/catch`, and the catch does `setImportResult({ ok:false, error: err.message })`. → produces this string **verbatim**. ✅ match.
- **New main path** (`toLdocDocument`): on a bad `.lmd` it returns `"Could not compile .lmd lesson: …"`. → different text. ❌ not this.
- **Validator (AJV)**: `validate.ts` only `JSON.parse`s the *schema file* (line 24). AJV never `JSON.parse`s the document you pass it — feeding it a `.lmd` string yields schema errors like `root must be object`, never “minus sign”. ❌ not this. **(Rules out hypothesis #3.)**
- **`import.service.ts`**: `importLdoc(json)` receives an already-parsed object; it contains **no `JSON.parse` of raw text**. ❌ not this. **(Rules out hypothesis #2 — there is no other parse in the chain; the renderer had exactly 4 `JSON.parse`, all in the handlers already fixed.)**

**Only the OLD renderer produces this exact message.** Therefore the running renderer bundle is stale — your edited `LearnPage.tsx` is not the code executing. (Note: hypothesis #1 was half-right — it IS a reload problem — but the stale layer is the **renderer**, not the main-process IPC.)

### 30-second confirmation (do this first)
Look at the running app's Import screen **without changing anything**:
- Does the header still say **“Import .ldoc”** and the tab still say **“Paste JSON”**?

Those two labels are pure renderer edits in the same file you changed. **If they still show the old text, the renderer is 100% stale** and no amount of main-process rebuilding will help. That's your single source of truth here.

---

## 2. Why the renderer is stale (this app is Electron + Vite)

`main.ts` chooses the renderer source at runtime:
```ts
if (process.env.VITE_DEV_SERVER_URL) {
  mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);   // DEV: Vite HMR
} else {
  mainWindow.loadURL('http://localhost:' + port + '/index.html');  // PROD: prebuilt bundle served from disk
}
```
So there are two modes, and the failure differs:

- **If launched WITHOUT `VITE_DEV_SERVER_URL`** (production/preview): the window loads a **prebuilt** renderer bundle. `preload` + `main` rebuilds do nothing for the renderer — you must **rebuild the renderer bundle**. This matches “rebuilt preload + restarted, still broken.” Most likely your case.
- **If launched WITH the Vite dev server**: HMR should have hot-swapped `LearnPage.tsx` automatically. If it didn't, the dev server is either not actually running, is serving a different working copy, or the edit landed in one of the **stale duplicate files** in the tree (there are many: `LearnPage`/`App.tsx.backup`, `.bak`, `.broken`, `.corrupted`, `.test`). Confirm you edited `src/components/learn/LearnPage.tsx` and not a copy, and that only one `LearnPage.tsx` is imported.

---

## 3. The fix — clean full rebuild of BOTH layers, then verify

```bash
# 0. Kill every running instance so no stale process serves the old bundle
pkill -f electron 2>/dev/null; pkill -f vite 2>/dev/null

# 1. Clear caches that can pin an old renderer/main bundle
rm -rf node_modules/.vite dist out .vite build   # whatever your outDir is

# 2. Full build of renderer + main + preload (NOT preload alone).
#    Use your repo's real script — check package.json "scripts". Typically one of:
node scripts/build.mjs        # the build script referenced in your notes
# or:  npm run build

# 3. Relaunch fresh
npm run start   # or: npm run dev  (see §4 to pick the RIGHT one)
```

### Decide which launch mode you want
- **For active development, run the DEV server** so renderer edits hot-reload from now on. Make sure the launch actually sets `VITE_DEV_SERVER_URL` (check the `dev`/`start` script). Then edits to `LearnPage.tsx` apply without a rebuild.
- **If you must run the packaged build**, remember: every renderer change requires re-running the full build (step 2) before restart. The preload-only rebuild you did is why nothing changed.

---

## 4. Make staleness impossible to misdiagnose again (add a build stamp)

Add a visible marker so you can instantly tell which bundle is live:

```tsx
// top of ImportView return(...) in LearnPage.tsx
<span className="text-[10px] text-zinc-600">build {new Date().toISOString().slice(11,19)} · lmd-import v2</span>
```
And one line in the main handler so the terminal proves the new code loaded:
```ts
// in registerLearnHandlers, before ipcMain.handle('learn:importLdoc', ...)
console.log('[learn] IPC handlers registered — lmd-import v2 (accepts { source })');
```
Rebuild. If you **don't** see `lmd-import v2` on screen and `lmd-import v2` in the terminal, you're still running old code — fix the build/launch before touching logic.

---

## 5. After the rebuild — the acceptance test
1. Paste the `.lmd` starting with `---\ntitle: What AI Engineers Actually Do` → **Validate & Import** → imports, no “minus sign” error.
2. The tab reads **“Paste lesson”** and header **“Import lesson”** (confirms new renderer live).
3. Paste a compiled `.ldoc` JSON (`{"doc":"ldoc/1.0", ...}`) → still imports (dual-path intact).
4. Terminal shows the `lmd-import v2` log when the Learn module initializes.

## 6. If labels DID update but the error still shows (unlikely)
Then — and only then — the renderer is fresh and the throw is server-side. In that case add a temporary log at the very top of the `learn:validate` and `learn:importLdoc` handlers dumping `typeof payload.source` and `payload.source?.slice(0,10)`. If `source` is `undefined`, the preload didn't rebuild (it's dropping the new arg); if `source` is the `---…` string but you still get the raw V8 message, then an old compiled `index.js` for the main process is being loaded — clear the main-process outDir and rebuild. But per §1, expect §3 to resolve it.
