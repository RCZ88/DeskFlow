# CONTEXT_BUNDLE.md — Build/Launch Pipeline

> Generated per generate-prompt skill workflow (Cycle 148)
> Raw source code of every affected file, with line numbers.

---

## 1. `start-dev.ps1` (full file, 152 lines)

```powershell
param(
  [switch]$NoDesktop,
  [switch]$NoSync,
  [switch]$Build
)

function Generate-Base64Url($bytes=32) {
  $r = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $b = [byte[]]::new($bytes)
  $r.GetBytes($b)
  return [Convert]::ToBase64String($b) -replace '\+','-' -replace '/','_' -replace '=',''
}

$env:JWT_SECRET = if ($env:JWT_SECRET) { $env:JWT_SECRET } else { Generate-Base64Url 32 }
$env:RELAY_TICKET_SECRET = if ($env:RELAY_TICKET_SECRET) { $env:RELAY_TICKET_SECRET } else { Generate-Base64Url 32 }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$syncPort = if ($env:SYNC_PORT) { $env:SYNC_PORT } else { "8787" }
$relayPort = if ($env:RELAY_PORT) { $env:RELAY_PORT } else { "8788" }

# Start Sync Server
if (-not $NoSync) {
  # ... [sync server startup, lines 29-69] ...
}

# Desktop Relay IP
# ... [relay IP detection, lines 71-83] ...

# Desktop App
if (-not $NoDesktop) {
  # Kill stale Electron instances
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force

  # Clear dev env vars — production mode, not vite dev server
  Remove-Item Env:VITE_DEV_SERVER_URL -ErrorAction SilentlyContinue

  $needBuild = $Build
  if (-not $needBuild) {
    $missing = @(
      'dist-electron\preload.cjs',
      'dist-electron\main.cjs',
      'dist\index.html',
      'dist\assets\index.js'
    ) | Where-Object { -not (Test-Path $_ -PathType Leaf) }
    if ($missing.Count -gt 0) {
      $needBuild = $true
    }
  }

  if ($needBuild) {
    # Build preload
    & npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs
    # Build main.cjs
    & node scripts/rebuild-main.mjs
    # Build renderer
    & npx vite build
  } else {
    Write-Host "[build] All dist files present -- skipping build (use -Build to force)" -ForegroundColor DarkGray
  }

  npx electron .
}
```

**Line 104-116:** The staleness check. It tests file EXISTENCE only (`Test-Path -PathType Leaf`). If `dist\assets\index.js` exists, it assumes the build is up-to-date. It does NOT check file timestamps against any source file. An edit to `src/pages/AiPage.tsx` will NOT trigger a rebuild if `dist\assets\index.js` already exists.

**Line 118-145:** The build section. Only runs if `$needBuild` is true (either `-Build` switch was passed, or a dist file is missing entirely).

**Line 147:** Launch. `npx electron .` loads from `dist/`.

---

## 2. `vite.config.ts` (full file, 40 lines)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(async () => {
  const plugins = [react(), tailwindcss()];
  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    optimizeDeps: { exclude: ['better-sqlite3'] },
    base: './',
    build: {
      emptyOutDir: true,
      minify: false,
      sourcemap: true,
      rollupOptions: {
        external: ['better-sqlite3'],
        output: {
          entryFileNames: 'assets/[name].js',      // ← NO content hash
          chunkFileNames: 'assets/[name].js',       // ← NO content hash
          assetFileNames: 'assets/[name].[ext]',    // ← NO content hash
        },
        onwarn(warning, warn) {
          if (warning.code === 'CIRCULAR_DEPENDENCY') {
            console.error('\n=== CIRCULAR DEPENDENCY ===');
            console.error('importer:', warning.importer);
            console.error('ids:', warning.ids);
          }
          warn(warning);
        }
      }
    },
  };
})
```

**Line 23-24:** `entryFileNames: 'assets/[name].js'` — NO content hash. The built file is always `dist/assets/index.js`. Electron caches this by URL, so even after a rebuild, the old cached version may be served. The HTTP server (`startProdServer` in main.ts) serves files from disk, so a fresh `npx electron .` should pick up the new file — but if the same Electron process is re-used or the HTTP server keeps running, the old file is served.

---

## 3. `scripts/build.mjs` (full file, 183 lines)

Key sections:

**Step 1 (line 43):** `npx vite build` — builds renderer to `dist/`.

**Step 2 (line 47-49):** Preload via Vite SSR → renamed to `preload.cjs`.

**Step 3 (line 53-63):** Pre-compiles all `src/services/*.ts` to individual `.js` files via esbuild.

**Step 4 (line 113-153):** Vite library mode build of `main.ts` into `dist-electron/main.cjs`.

---

## 4. `main.ts` loading logic (lines 3771-3832)

```typescript
// Production HTTP server factory
function startProdServer(callback: (port: number) => void) {
    const dist = path_1.default.join(__dirname, '../dist');
    const mimeTypes: Record<string, string> = {
        '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
        '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
        '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json',
    };
    const server = http_1.default.createServer((req, res) => {
        let rel = (req.url || '').split('?')[0].split('#')[0];
        if (rel === '/') rel = '/index.html';
        const filePath = path_1.default.join(dist, rel);
        const ext = path_1.default.extname(filePath);
        fs_1.default.readFile(filePath, (err, data) => {
            if (err) {
                // SPA fallback: serve index.html for unknown paths
                fs_1.default.readFile(path_1.default.join(dist, 'index.html'), (err2, data2) => {
                    if (err2) { res.writeHead(500); res.end('Internal Server Error'); return; }
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data2);
                });
                return;
            }
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
            res.end(data);
        });
    });
    server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = addr && typeof addr === 'object' ? addr.port : 38123;
        console.log('[DeskFlow] Serving on http://localhost:' + port);
        callback(port);
    });
}

if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
}
else {
    startProdServer((port) => {
        mainWindow.loadURL('http://localhost:' + port + '/index.html');
    });
}

// Retry loading on failure
let loadAttempts = 0;
let prodServerStarted = false;
mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    loadAttempts++;
    console.error(`[DeskFlow] Failed to load (attempt ${loadAttempts}):`, errorCode, errorDescription);
    if (loadAttempts === 1 && !prodServerStarted) {
        console.log('[DeskFlow] Fallback: starting production HTTP server');
        prodServerStarted = true;
        startProdServer((port) => {
            mainWindow.loadURL('http://localhost:' + port + '/index.html');
        });
    } else if (loadAttempts >= 3) {
        console.error('[DeskFlow] Giving up after 3 load attempts');
    }
});
```

**Line 3806-3813:** The initial load path. If `VITE_DEV_SERVER_URL` is set (e.g., from a stale `.env` or environment variable), it loads from `http://localhost:5173` (Vite dev server). If Vite is not running, this will fail with `ERR_CONNECTION_REFUSED`, triggering `did-fail-load`.

**Line 3815-3829:** The `did-fail-load` handler starts a production HTTP server on first failure and loads from it. But note: `loadAttempts` and `prodServerStarted` are initialized AFTER the initial `loadURL` call at line 3807/3811 — not before. If the initial load fails synchronously, the handler may catch it. But there's a race: the initial load might succeed with a STALE cached response from a previous HTTP server that's still running on the same port.

---

## 5. `index.html` (full file, 56 lines)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/deskflow-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DeskFlow AI - Elite Productivity Tracker</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
    <!-- FALLBACK STYLES -->
    <style>
      html { background: #121212; }
      body { margin: 0; background: #121212; min-height: 100vh; }
      #root { min-height: 100vh; background: #121212; }
      #df-fallback { display: none; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <!-- FALLBACK OVERLAY -->
    <div id="df-fallback" style="display:none;...">⚠ DeskFlow failed to load...</div>
    <script>
      window.__DESKFLOW_LOADED = false;
      window.onerror = function(msg, src, line, col, err) { ... };
      window.addEventListener('unhandledrejection', function(e) { ... });
      setTimeout(function() {
        if (!window.__DESKFLOW_LOADED) { ... show fallback ... }
      }, 5000);
    </script>
    <script type="module" src="/src/main.tsx" onerror="..."></script>
  </body>
</html>
```

**Line 54:** `<script type="module" src="/src/main.tsx">` — In dev, Vite serves this. In production (via `startProdServer` or `loadFile`), this is a local path. When served via HTTP, Vite transforms this to point to `assets/index.js`. When served via `file://` protocol, Chromium blocks `crossorigin` module scripts — hence the `did-fail-load` → HTTP server fallback.

---

## 6. `dist/index.html` (after build)

After `npx vite build`, the built `dist/index.html` has:
- `<div id="root"></div>` (React mount point)
- `<script type="module" crossorigin src="./assets/index.js"></script>` (pointing to the built bundle)
- The fallback overlay + inline safety-net `<script>` are preserved (from `index.html` source via Vite's `transformIndexHtml`)

The built `dist/assets/index.js` is a single bundled file. Its content changes when source files change, but its NAME stays `index.js`.

---

## 7. Known Issues / Past Failure Modes

From `AGENTS.md` §8 (Black Screen Prevention Checklist):

1. **Stale `dist/` files**: Build doesn't clean `dist/` before writing. `emptyOutDir: true` in vite.config.ts fixes this BUT `start-dev.ps1` may skip the build entirely.

2. **No content hashes**: `[name].js` output. Electron caches `index.js` and never invalidates. A stale cached bundle with wrong imports = black screen.

3. **`VITE_DEV_SERVER_URL` pollutes production mode**: `.env` or env vars have `VITE_DEV_SERVER_URL=http://localhost:5173` left from dev setup. Electron loads from that URL → `ERR_CONNECTION_REFUSED`. The `did-fail-load` fallback uses `startProdServer` which serves via HTTP (fixes the `file://` cross-origin issue).

4. **`did-fail-load` handler race**: The handler is attached AFTER `mainWindow.loadURL()`. If the load succeeds (even with stale content), no fallback fires.

5. **EPIPE uncaught exception**: `console.log` in HTTP server handler writes to stdout. When stdout pipe breaks (terminal closes), EPIPE kills the main process. Fix: `process.stdout.on('error', () => {})`.

6. **start-dev.ps1 checks existence only**: Line 105-116 only checks if dist files exist, not if they're newer than source files. Editing source = no rebuild.
