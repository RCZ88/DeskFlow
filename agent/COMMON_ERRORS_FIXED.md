<aside>
⚡

**How to use this.** When the app breaks, find the matching **Symptom** below, run the **Fast fix**, and only dig deeper if it doesn't work. Each entry is something we already solved once — don't re-diagnose from scratch. Add a new entry every time a fresh error costs more than 20 minutes.

</aside>

## The 60-second triage (do this first, every time)

1. **App won't open at all?** → it's a build/launch problem (Entry 1, 4, or 5). Look at the message text.
2. **App opens but everything is 0 / blank data?** → the main process or the DB failed. **The real error is in the terminal where you ran `npm start`, NOT the in-app DevTools.** Go read it (Entry 2).
3. **A `npm run build` / rebuild command failed?** → toolchain problem (Entry 3).

<aside>
🧭

**Golden rules learned the hard way**

- The SQLite DB lives in the **main process** — its errors print in the **terminal**, never in the app window.
- "Everything is 0" is almost always a **symptom** of the main process or DB not starting — not data loss. The data is still on disk.
- Never "fix" these by masking them (try/catch returning empty, optional chaining, setTimeout). Fix the cause.
- Our project path has a **space** (`App Tracker`) — this breaks native-module builds. See Entry 3.
</aside>

---

## Entry 1 — App won't launch: "Cannot find module dist-electron/main.cjs"

**Symptom**

`Unable to find Electron app at …` + `Cannot find module '…\dist-electron\main.cjs'. Please verify that the package.json has a valid "main" entry`. Often paired with the UI showing all zeros.

**Root cause**

`package.json` points `"main"` at `dist-electron/main.cjs`, but that file was never built. Either only the renderer was built (`vite build` / `dev`), or `electron-vite build` **silently failed on Windows** (exits code 0, writes nothing), or `dist-electron/` got deleted.

**Fast fix** (PowerShell — run one at a time)

```
Test-Path .\dist-electron\main.cjs      # False = confirmed
node scripts/build.mjs                   # the REAL build (NOT electron-vite)
Test-Path .\dist-electron\main.cjs      # must be True now
npm start
```

Watch the build reach **Step 4/4** and print `main: ~643 KB` + `Build complete`. If it stops earlier, that earlier error is the real blocker.

**Prevention**

- Never run `electron-vite build` on Windows — it's broken. Always `node scripts/build.mjs`.
- Add a `prestart` guard so launch refuses to run without the file:

```
"scripts": {
  "build": "node scripts/build.mjs",
  "prestart": "node scripts/verify-build.mjs",
  "start": "electron ."
}
```

`scripts/verify-build.mjs`:

```
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
if (!existsSync(resolve('dist-electron/main.cjs'))) {
  console.error('\n❌ dist-electron/main.cjs missing. Run "npm run build" first.\n');
  process.exit(1);
}
```

- Never `git clean -fdx` or hand-delete `dist-electron/` without rebuilding.

---

## Entry 2 — App launches but DB shows all zeros

**Symptom**

App window opens fine, but every number is 0 / lists empty. No obvious error in the app.

**Root cause (one of two)**

1. **better-sqlite3 native binary built for the wrong runtime** — compiled for system Node, not Electron's ABI. Silent connection failure.
2. **Wrong DB path in the built app** — code resolved the DB path from `__dirname`, which is now `dist-electron/`, so it opened a fresh empty database instead of the real one.

**Fast fix**

First, **read the `npm start` terminal** (the main-process console). Then:

- If you see `NODE_MODULE_VERSION` mismatch / `bindings` / `invalid ELF header` → it's cause 1, rebuild the native module → **see Entry 3**.
- If there's **no error** but data is 0 → it's cause 2. Log the path and fix it:

```
console.log('[DB] opening:', dbPath, 'userData:', app.getPath('userData'));
```

Use a stable path: `path.join(app.getPath('userData'), 'deskflow.db')`, and point it at / copy in the real populated DB file.

**Prevention**

Wrap DB init in try/catch with a **loud** `console.error` so it's never silent again:

```
try { db = new Database(dbPath); console.log('[DB] connected:', dbPath); }
catch (err) { console.error('[DB] FAILED TO OPEN:', err); }
```

---

## Entry 3 — `electron-rebuild` fails: MSB8040 Spectre libs / space-in-path

**Symptom**

```
Attempting to build a module with a space in the path
error MSB8040: Spectre-mitigated libraries are required for this project …
  [ … \node_modules\node-pty\build\conpty.vcxproj ]
✖ Rebuild Failed — node-gyp failed to rebuild 'node-pty'
```

**Root cause**

`electron-rebuild` builds **all** native modules (active-win, better-sqlite3, node-pty, sqlite3) and **aborts on the first failure**. The failure here is **node-pty**, not better-sqlite3 — node-pty's C++ build needs the Visual Studio **Spectre-mitigated VC++ libraries**, which aren't installed. The **space in the project path** (`App Tracker`) is a second landmine that breaks node-gyp.

**Fast fix (gets the DB working now)**

Rebuild **only** better-sqlite3 and skip node-pty entirely — the DB doesn't need node-pty (that only powers the in-app terminal):

```
npx electron-rebuild -f --only better-sqlite3
```

Then `npm start`. The DB should connect. (The terminal feature stays broken until node-pty is rebuilt — fix that later via the two options below.)

**Full fix (to rebuild node-pty too)**

- **Best / permanent:** move the project to a path with **no spaces**, e.g. `C:\dev\AppTracker`, then `npm install` and rebuild. This kills the space warnings forever and prevents a whole class of native-build failures.
- **Or install the Spectre libs:** Visual Studio Installer → *Individual Components* → check **"MSVC … C++ Spectre-mitigated libs"** matching your toolset → re-run the rebuild.
- Note: VS "18" Build Tools is bleeding-edge; if it keeps fighting you, the known-good combo is **VS 2022 (v17) Build Tools** with *Desktop development with C++* + Spectre libs.

**Prevention**

- Keep the project on a space-free path.
- Use `--only better-sqlite3` for DB-only rebuilds so an unrelated module (node-pty) can't block you.

---

## Entry 4 — White screen / crash on launch: "Cannot access 'z' before initialization"

**Symptom**

`ReferenceError: Cannot access 'z' before initialization` immediately on launch, stack points into minified `dist/assets/index.js` and React internals. Works in `npm run dev`, crashes in the built app.

**Root cause**

A **Temporal Dead Zone** error = a **circular import**. Module A imports B; B uses something from A before A finished initializing. The production bundle reorders modules, which exposes the cycle (dev doesn't).

**Fast fix**

1. Temporarily build readable to find the real culprit — in `vite.config.ts`: `build.minify = false`, `build.sourcemap = true`, and add an `onwarn` that logs `CIRCULAR_DEPENDENCY`. Rebuild → the stack now names the real file/variable and the log lists every cycle.
2. `npx madge --circular --extensions ts,tsx src/` lists the loops directly.
3. Break the cycle: move the shared thing (constant / context / class) into a new **leaf** module both files import, or defer the top-level usage into a function. Kill barrel `index.ts` re-exports involved in the loop.
4. Restore minify/sourcemap, rebuild.

**Prevention**

Avoid barrel files (`export * from`) for components; import by direct path. Don't reference a top-level `const`/`class` from a module that imports back into yours.

---

## Entry 5 — "TypeError: Illegal constructor" on launch

**Symptom**

`TypeError: Illegal constructor`, often near icon/UI code, app crashes on render.

**Root cause**

A lucide-react icon import resolved to a **browser DOM global** instead of the icon — e.g. `import { Lock } from 'lucide-react'` but `Lock` collided with `window.Lock` (Web Locks API). TypeScript doesn't catch it because the DOM global exists ambiently.

**Fast fix**

Alias the import: `import { Lock as LockIcon } from 'lucide-react'` and render `<LockIcon />`.

**Prevention**

Alias any icon whose name collides with a DOM/Web global: `Lock`, `Notification`, `Image`, `Range`, `History`, `Worker`, `Event`, `Selection`, `Text`, etc. Also explicitly `ChartJS.register(...)` before rendering charts.

---

## Entry 6 — App opens but ALL data is 0 (every backend API is undefined)

**Symptom**

App launches fine. The **DevTools** console (in-app, Ctrl+Shift+I) shows `TypeError: Cannot read properties of undefined (reading 'getDashboardAggregates')` plus several `No <X> API` / `<X> API not available` lines. The **terminal** shows the DB initialized fine with real data (e.g. `SQLite database initialized … 27799 logs`).

**Root cause**

The **preload script didn't load**, so `window.deskflowAPI` was never created → every renderer→main call is `undefined` → no data anywhere. **This is NOT a database problem.** In our case the build emitted `dist-electron/preload.mjs`, but `main.ts` loads `path.join(__dirname,'preload.cjs')` — that file didn't exist, so Electron loaded no preload. It was an extension/format mismatch: the build produced ESM `.mjs` when Electron requires CommonJS `.cjs`.

**Confirm it's this bug**

- `Get-ChildItem dist-electron` shows a `preload.*` file whose **name/extension doesn't match** the path in `main.ts`'s `webPreferences.preload`.
- The DB logs in the terminal are healthy (data exists), but the renderer's API object is undefined.

**Fast fix** (re-emit preload as CommonJS at the exact path main expects — no full rebuild)

```
npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs
npm start
```

Do NOT just rename `preload.mjs` → `.cjs`; ESM content won't run under the CommonJS loader. Re-emit it as `cjs`.

**Prevention**

- Make `scripts/build.mjs` emit the preload as `dist-electron/preload.cjs` with esbuild `format: 'cjs'`. Electron preload must be CommonJS.
- Keep the `console.log('[DeskFlow] Preload path:', preloadPath)` line and add a check that the file exists — warn loudly at launch if it doesn't.
- Reminder: "every number is 0 + DevTools says an API is undefined" = **preload/bridge problem**, not the DB. Check the preload before touching better-sqlite3.

---

## Entry 7 — Sidebar accent strip not full height / content won't scroll

**Symptom**

The green (or other color) vertical accent strip on the left side of sidebar group panels only spans the content height, not the full panel height. When content is short, the strip is short. Additionally, sub-tabs like Sessions and Map may show duplicate accent strips. Using `h-full` to fix this breaks scrolling — the panel locks to the viewport and long content can't be scrolled.

**Root cause**

The `GroupPanel` component used `position: absolute; top: 0; bottom: 0` for the accent strip inside a `min-h-full` container. Inside a scroll container (`overflow-y: auto`), `min-height: 100%` can compute to `auto` (content-based), so the container only grows to the content height. The absolute strip follows suit.

Additionally, the Sessions and Map sub-tabs had **duplicate** accent strips — one from `<GroupPanel>` and one inline `<span>` — causing visual overlap.

Using `h-full` (fixed 100% height) instead of `min-h-full` breaks scrolling because the panel is locked to exactly the parent's height; content taller than the panel overflows invisibly and the parent scrollbar never activates.

**Fast fix**

Replace `position: absolute` with `display: flex` on GroupPanel so the accent strip stretches as a flex child:

```tsx
function GroupPanel({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      <span className={`w-0.5 shrink-0 ${ACCENT_STRIP[accent]} opacity-60`} />
      <div className="flex-1 px-3 py-3 space-y-3 min-w-0">
        {children}
      </div>
    </div>
  );
}
```

Key points:
- `display: flex` with `min-h-full` keeps the container at minimum full parent height but allows growth when content overflows
- Flex items stretch to the container's full cross-axis height by default (`align-items: stretch`)
- `w-0.5 shrink-0` on the strip gives it fixed width while it stretches to full height
- `flex-1` on the content div fills remaining width
- `min-w-0` prevents flex overflow

Remove any **duplicate** inline accent strips in sub-tab renders — they're now handled by GroupPanel.

**Prevention**

- Never use `position: absolute` for layout elements that need dynamic height inside scroll containers — use flexbox stretching instead.
- Never use `h-full` inside a scroll container that needs to scroll — use `min-h-full`.
- Only one `<GroupPanel>` accent strip per panel; remove inline duplicates.

**The pattern:** Layout bugs inside scroll containers are almost always about percentage height computation vs. flex stretch. When you need a child to always fill the container AND the container to grow with content, use `display: flex` + `min-h-full` on the parent, and let flex `align-items: stretch` handle the child sizing. Never force `position: absolute` with `top/bottom` for vertical stretching in dynamic-height containers.

<aside>
📌

**The pattern across all of these:** the visible error is rarely the real one. Build output gets reordered/minified, the DB error hides in the terminal, and "0 everywhere" means "a process didn't start," not "data is gone." Read the *first* failure in the *right* console before changing code.

</aside>