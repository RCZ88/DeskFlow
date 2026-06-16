---
name: app-detection
version: 1.0.0
scope: Resolve the *real* foreground application when the OS reports a generic
       wrapper, launcher, or null window. Designed for low-overhead pollers.
---

## When to use
- A poller (active-win, GetForegroundWindow) returns a launcher/wrapper name
  (Steam, Epic, javaw, Electron, python) instead of the real app.
- The poller returns null for fullscreen / anti-cheat / exclusive apps.

## The 5-layer resolver (cheap → expensive, stop at first hit)
1. TITLE — regex the window title (zero cost).      e.g. "X - Steam" → X
2. MAP — look up process name in a static KNOWN map (O(1), in memory).
3. INDEX — match against the startup-built installed-app index (O(1)).
4. SCAN — enumerate processes, gated by a 10s cache + launcher-only trigger.
5. KEEP — on null, reuse last-known resolved app + session keep-alive.

## Hard rules
- NEVER run layer 4 (process scan) on a normal poll. Only when foreground is a
  known launcher OR poll is null-while-gaming, AND the 10s cache is stale.
- Build the install index ONCE at startup (and on a manual "rescan"), never per poll.
- Cache every expensive answer with a TTL. Default TTL: 10_000 ms.
- All resolver state lives in plain objects/Maps in memory — no DB, no worker.
- Resolver must be pure-ish: given the same cached inputs, no I/O.

## Output contract
resolveForegroundApp(rawResult) -> { name: string, source: 'title'|'map'|'index'|'scan'|'keepalive'|'raw' }

## Test before shipping
- Launcher in foreground resolves to the game, not the launcher.
- Launcher itself (idle in library) does NOT resolve to a game.
- Null poll during a known game keeps the session alive.
- Process scan fires ≤ 1× / 10s while gaming (assert with a counter).