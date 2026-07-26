# Doc 2 — Security Audit

> **Scope.** Threat-model an Electron desktop app that ingests untrusted input (URLs, a browser extension, git repos, local files, AI output). Good news first: your baseline is solid. Then the real findings, prioritized.

## What you already got right

- **`contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`** on the main window (`main.ts:3745-3747`) and the terminal window (`main.ts:11659-11660`). This is the single most important Electron hardening and you have it.
- **`preload.ts` exposes a *curated* API** (named methods like `getLogs`, `updateAppLog`) via `contextBridge` — **not** a generic `ipcRenderer.invoke(channel, ...)` passthrough. That's the correct pattern; it means the renderer can't call arbitrary channels.
- **SQL is overwhelmingly parameterized** — 676 DB calls, and the only `${}` interpolations are column/placeholder lists, not user values (see S3 caveat).
- **No hardcoded API keys/secrets** in `main.ts`. Consistent with local-first.

## Findings

### S1 — `open-url` opens any scheme with no validation `[P0 · main.ts:7938]`

**Symptom.**
```ts
ipcMain.handle('open-url', (_, url: string) => {
    const { shell } = require('electron');
    shell.openExternal(url);   // url is fully attacker-influenced
});
```
Anything the renderer (or a link inside tracked/AI/extension content) passes goes straight to the OS handler. `shell.openExternal` will happily launch `file://`, `smb://`, custom protocol handlers, or `ms-*:` URIs — several of which are known RCE/credential-leak vectors on Windows. A malicious domain title, AI-generated link, or extension payload becomes "click -> OS executes."

**Fix.** Allowlist the scheme before opening:
```ts
ipcMain.handle('open-url', (_, url: string) => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:' && u.protocol !== 'mailto:') {
      return { success: false, message: 'Blocked scheme: ' + u.protocol };
    }
    shell.openExternal(u.toString());
    return { success: true };
  } catch {
    return { success: false, message: 'Invalid URL' };
  }
});
```

**Principle.** *Validate at the trust boundary, and allowlist rather than blocklist.* Any value that crosses from renderer/network/file into an OS-level sink (`openExternal`, `exec`, `fs`, `loadURL`) is untrusted. Enumerate what's *allowed*; deny everything else. Blocklists always miss a scheme.

### S2 — No Content-Security-Policy anywhere `[P0 · project-wide]`

**Symptom.** Grep found **zero** CSP (no meta tag, no `onHeadersReceived`). With no CSP, any injected markup (from tracked page titles, domain names, AI responses, or a compromised dependency) can run inline script or exfiltrate to arbitrary origins. `webSecurity:true` is not a CSP.

**Fix.** Set a response-header CSP in main for the app's own content:
```ts
session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
  cb({ responseHeaders: { ...details.responseHeaders,
    'Content-Security-Policy': [
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; connect-src 'self' http://localhost:*; object-src 'none'; base-uri 'none'"
    ]}});
});
```
Tighten `style-src` later by removing `'unsafe-inline'` once you audit inline styles. This pairs with removing the `data:` URL terminal window (Doc 1 D) so you don't need to loosen CSP for it.

**Principle.** *Defense in depth.* Even with contextIsolation, assume some HTML injection will eventually happen; CSP is the second wall that turns "XSS" into "blocked by policy." Security is layers, not a single switch.

### S3 — Shell command execution via string interpolation `[P1 · main.ts:11842, 11862, 12194, 6181, 6323]`

**Symptom.** Multiple `execSync` calls build a shell string with an interpolated variable:
```ts
execSync(`git show --numstat --format="" ${sha}`, { cwd: repoPath });   // 11862
execSync(`git diff ${flag}`, ...);                                       // 12194
execSync(`where ${cmd} 2>nul`, ...);                                     // 6181
```
Today `sha`/`flag`/`cmd` are mostly internally sourced, so exploitability is limited — **but** `repoPath` and project metadata come from folders the user adds, and git output/paths can contain shell metacharacters. `execSync` runs through a shell, so a crafted branch name, path, or ref (`; rm -rf ~`) is a command-injection primitive. This is a latent P1, not a theoretical P3, because the inputs are user/filesystem-controlled.

**Fix.** Use `execFile`/`spawn` with an **args array** (no shell parsing):
```ts
const out = execFileSync('git', ['show', '--numstat', '--format=', sha], { cwd: repoPath });
```
For the rare case you truly need a shell, validate the argument against a strict regex first (e.g. sha must match `/^[0-9a-f]{7,40}$/`).

**Principle.** *Pass arguments as data, never concatenate them into a command string.* The shell is a code interpreter; string-building hands it code. Argument arrays keep the boundary between "program" and "data" intact — the same reason you use SQL parameters instead of string SQL.

### S4 — Local HTTP server trust boundary is unverified `[P1 · main.ts:~14178]`

**Symptom.** `main.ts` runs an HTTP server that serves `/foreground-app` and accepts `browser-tracking-event` data from the browser extension. I couldn't confirm from the zip: (a) that it binds to `127.0.0.1` only (not `0.0.0.0`), (b) that it validates the `Origin`/sender, or (c) that payloads are schema-validated before hitting the DB. If it's reachable off-host or accepts unauthenticated writes, any local process (or LAN peer) can inject fake tracking data or read your foreground app.

**Fix.**
- Bind explicitly to `127.0.0.1`.
- Require a per-launch shared token (generated at startup, handed to the extension) on write endpoints.
- Validate every payload with a schema (you already have a `schemas/` dir — use `zod`) before insert.

**Principle.** *Every input channel is a trust boundary, including "local" ones.* "It's just localhost" is how local-privilege-escalation and CSRF-to-localhost bugs happen. Authenticate the sender and validate the shape.

### S5 — AI / extension text flows into the DB and UI unescaped `[P2]`

**Symptom.** Tracked page titles, domains, and AI-generated strings are stored and later rendered. Combined with no CSP (S2), any of these is a stored-XSS vector if rendered as HTML anywhere (e.g. `dangerouslySetInnerHTML`, a markdown renderer without sanitization).

**Fix.** Grep for `dangerouslySetInnerHTML` and any markdown/HTML renderer; ensure a sanitizer (`DOMPurify`) sits in front. Treat all stored strings as untrusted on render.

**Principle.** *Data is not trusted just because it's already in your database.* Persistence doesn't sanitize; encode/sanitize at the point of rendering, per output context.

### S6 — `require()` inside handlers + no ASAR/fuses confirmation `[P3 / needs files]`

**Symptom.** Handlers call `require('electron')` lazily; fine functionally, but I couldn't verify build hardening (ASAR packaging, Electron fuses like `RunAsNode` disabled, `nodeCliInspect` off) because `package.json`/builder config weren't in the zip.

**Fix.** Enable `@electron/fuses` (disable `RunAsNode`, `EnableNodeCliInspectArguments`), ship with ASAR, and pin/patch the Electron version. Send me the build config and I'll complete this.

**Principle.** *Ship-time hardening matters as much as runtime code.* An app is only as safe as how it's packaged and launched.

## Ranked security backlog

1. `[P0]` S1 — allowlist schemes in `open-url` (10-line fix, real RCE surface).
2. `[P0]` S2 — add CSP header.
3. `[P1]` S3 — convert interpolated `execSync` -> `execFile(args[])`.
4. `[P1]` S4 — lock down the local HTTP server (bind localhost, token, schema-validate).
5. `[P2]` S5 — sanitize untrusted strings on render.
6. `[P3]` S6 — build fuses/ASAR (send me build config).

---

## v2 UPDATE (2026-07-02)

**Status of v1 findings: none fixed.** Re-verified against the updated source:

| v1 finding | v1 location | v2 status |
| --- | --- | --- |
| `open-url` -> `shell.openExternal` with no scheme validation | `main.ts:7938` | **STILL OPEN** — now `main.ts:8189`, unchanged (no allowlist; `file:`/`javascript:` still pass) |
| No Content-Security-Policy anywhere | repo-wide | **STILL OPEN** — grep for `content-security-policy`/`onHeadersReceived` returns nothing |
| `execSync(`...${var}...`)` string interpolation | `main.ts:11842,11862,12194` | **STILL OPEN** — now at `main.ts:6431,6436,6573,12109,12129` (`where/which ${cmd}`, `git show ... ${sha}`) |
| Renderer polling storm (perf-adjacent) | `App.tsx:1186` | **STILL OPEN** — now `App.tsx:1188` (1s), `DashboardPage.tsx:299` (5s) |

The P0/P1 fixes and their principles from the sections above still apply verbatim. **`open-url` and CSP remain the two things I'd fix before anything else.**

### New attack surface: Finance (full detail in Doc 6)

You added a Finance module that stores real financial PII. The **good** news: the password lock uses `scrypt` + per-install salt (`main.ts:20593`), and AES-256-GCM helpers exist. The **serious** gap:

- **S-NEW-1 `[P0]` — Finance data is unencrypted at rest.** The lock screen (`financeLocked`) gates the *UI only*. Balances, `last_four`, and wallet `metadata` (account numbers, IBAN, SWIFT, crypto `wallet_address`) are written to SQLite in **plaintext**. Anyone with file access reads them with `sqlite3`, no password. The existing AES helper is wired to the **audit log**, not finance. Fix: encrypt sensitive fields keyed off the password/OS keychain (Doc 6 F1).
- **S-NEW-2 `[P1]` — Path-derived fallback key.** `getAuditKey()` falls back to `sha256(userDataPath)` (`main.ts:20487`). The install path isn't secret, so that's obfuscation, not encryption. Don't inherit this for finance; use Electron `safeStorage` and fail closed (Doc 6 F2).
- **S-NEW-3 `[P2]` — Finance sync endpoints.** `main.ts:5942-6108` calls `/v1/auth/pair`, `/v1/auth/refresh`, `/v1/pairing/codes` on a sync server. Tag where financial data goes over the wire so I can review transport (TLS pinning?), auth token storage, and what's actually synced.

### New attack surface: Learn

Lower risk (educational content, not PII). Main note: the AI tutor must be grounding-locked so it can't answer without cited sources — that's a *trust*/correctness property, covered in Doc 7 L3. No new P0/P1 here.
