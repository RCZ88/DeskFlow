# RUN.md — Finance Page Build & Run Instructions

## ⚠️ CRITICAL: Which Build Are You Running?

| Method | What it runs | Age of code |
|--------|-------------|-------------|
| Double-click `DeskFlow.exe` in `release/win-unpacked/` | Packaged ASAR | **May 12, 2026** (41 days old) |
| `npm start` | `dist-electron/main.cjs` + `dist/` HTTP server | **Today's build** (fresh) |
| `npm run dev` | Vite dev server (src/) | Live source (hot reload) |

**If you see NO changes, you are almost certainly running the packaged exe.**
**ALWAYS use `npm start` to test your own code changes.**

## How `npm start` Loads the UI

`npm start` runs `electron .` which loads `dist-electron/main.cjs` (built from `src/main.ts`).
`createWindow()` in main.cjs:
1. Creates an HTTP server on a random port
2. Serves files from the `dist/` folder (Vite renderer bundle)
3. Calls `mainWindow.loadURL('http://localhost:<port>/index.html')`

There is **no file:// scheme, no app:// scheme** — it is always HTTP.

## Build + Relaunch Sequence

```powershell
# 1. Kill any running DeskFlow/Electron instances
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "DeskFlow" -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Rebuild (renderer + preload + services + main → dist/ + dist-electron/)
npm run build

# 3. Start fresh (uses today's dist/ and dist-electron/)
npm start
```

## Current BUILD MARKER: v4

After launching, navigate to the Finance page. You should see:
- **In the UI:** "Finance BUILD MARKER v3" in the page header (small green monospace badge)
- **In Main console (DevTools):** `BUILD MARKER v3`
- **In Renderer console (DevTools):** `BUILD MARKER v3`

## Output Locations

| What | Source | Output |
|------|--------|--------|
| Renderer | `src/pages/*.tsx`, `src/components/**/*.tsx` | `dist/assets/index.js` |
| Main process | `src/main.ts` | `dist-electron/main.cjs` |
| Preload | `src/preload.ts` | `dist-electron/preload.cjs` |
| Services | `src/services/*.ts` | `dist-electron/services/*.js` |
| Packaged app | (never use for dev) | `release/win-unpacked/DeskFlow.exe` |

## Repackaging (only if you need a distributable .exe)

```powershell
npm run build:electron   # builds dist/ + dist-electron/
# then electron-builder packages from dist/ + dist-electron/
```

This is NOT needed for normal development. Use `npm start`.
