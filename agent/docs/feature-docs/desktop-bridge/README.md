# Desktop bridge

Two modules you add to the Electron **main** process.

## `syncAgent.ts`
Keeps the local `better-sqlite3` DB in sync with the cloud sync server.
- Run `push()` + `pull()` on a 15–30s interval and after local writes.
- Encrypts sensitive free-text (terminal message content) **before** upload, so the
  server only ever stores ciphertext.
- Construct it with your existing db handle and a token getter:

```ts
import { SyncAgent } from "./syncAgent"
const agent = new SyncAgent(db, process.env.SYNC_URL!, getAccessToken, encField, decField)
setInterval(() => agent.push().then(() => agent.pull()).catch(console.error), 20000)
```

## `terminalRelay.ts`
Exposes the live Terminal Workspace to a paired phone over an authenticated WebSocket.
- Requires you to adapt your existing `terminalManager` to expose an `onData(id, cb)`
  subscription and a `has(id)` check (you already have `write`/`resize`).
- **Binds to 127.0.0.1 only.** Reach it from the phone via a private tunnel:
  - Easiest + safest: **Tailscale** (your phone + laptop on the same tailnet; the
    relay is reachable at the laptop's tailnet IP, never the public internet).
  - Alternatives: WireGuard, or Cloudflare Tunnel with Access in front.
- The phone must present a short-lived **relay ticket** (an HS256 JWT signed with
  `RELAY_TICKET_SECRET`, shared with the sync server). Issue it from a tiny
  authenticated `/v1/relay/ticket` endpoint (add to the sync server) that signs
  `{ sub: userId }` with a 60s TTL.

```ts
import { startTerminalRelay } from "./terminalRelay"
startTerminalRelay(terminalManager, 8788)
```

### Why a relay and not "port the terminal"
`node-pty` spawns real OS processes; that cannot run on Android. The phone is a thin
client that streams the desktop's real PTY. This is also exactly how you get the
opencode resume work to show up on mobile — you are viewing the same session.
