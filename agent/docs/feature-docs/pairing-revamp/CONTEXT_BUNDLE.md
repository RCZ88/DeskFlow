# CONTEXT_BUNDLE.md — DeskFlow Phone Pairing Architecture

> Self-contained context for the mobile-side architect to understand the full
> pairing system on the desktop and sync-server side, and to recommend the best
> approach for making pairing seamless for the average user.

---

## 1. Current Architecture Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│     DESKTOP APP      │         │      PHONE APP       │
│                      │         │                      │
│  ┌───────────────┐   │  1. POST /v1/auth/pair       │
│  │ PairPhoneModal │──┼──code───► (must reach sync    │
│  │ shows 8-char   │   │         server)              │
│  │ code (XXXX-    │   │         ┌────────────────┐   │
│  │ XXXX)          │   │         │ PairScreen.tsx  │   │
│  └───────┬───────┘   │         │ (code input)    │   │
│          │           │         └────────┬───────┘   │
│          │ 2. POST   │                  │ 3. receives│
│          │ /v1/pair- │                  │ relayUrl   │
│          │ ing/codes │                  │ + terminal │
│          ▼           │                  ▼ Id         │
│  ┌───────────────┐   │         ┌────────────────┐   │
│  │  SYNC SERVER   │◄──┼────────│ 4. WebSocket    │   │
│  │ 127.0.0.1:8787 │   │         │ connect to      │   │
│  │               │──┼─relayUrl─► relay host:port  │   │
│  └───────────────┘   │         └────────────────┘   │
│                          │                      │
│  ┌─────────────────┐     │                      │
│  │ RELAY WS SERVER  │◄────┼──────────────────────┘   │
│  │ 0.0.0.0:8788     │     │  5. Terminal streaming   │
│  │ (desktop-bound)   │     │                          │
│  └─────────────────┘     │                          │
└─────────────────────┘         └─────────────────────┘
```

## 2. Desktop-Side Components

### terminalRelay.ts (src/main/terminalRelay.ts)

The WebSocket relay server that streams terminal data to the phone.

**Key behaviors:**
- Binds to `0.0.0.0:8788` (accessible from LAN)
- Two auth paths: JWT ticket (QR) or 8-char pairing code
- `PairingCodeStore`: generates 8-char codes (charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — no I/O/0/1)
- Code expires in 5 minutes, one-time use
- Terminal data flows in real-time over WebSocket (`{ t: "out", d: "..." }` from desktop→phone, `{ t: "in", d: "..." }` from phone→desktop)
- Idle timeout: 5 min, hard max session: 60 min

**Code generation (lines 71-105):**
```
generateCode() → 8 random chars from safe charset
createPairingCode(terminalId) → generates code + signs JWT ticket, stores in Map
consumeCode(code) → one-time lookup+delete from Map
```

**WebSocket server (lines 133-238):**
- Accepts connections with `?code=XXXXXXX` or `?ticket=<jwt>&terminalId=<id>`
- Validates against PairingCodeStore or verifies JWT
- On valid connection: streams terminal output to phone, accepts terminal input from phone

### PairPhoneModal.tsx (src/components/PairPhoneModal.tsx)

**Key behaviors:**
- Opens automatically when user clicks "Pair Phone" button
- Calls `window.deskflowAPI.pairGenerateCode(terminalId)` → IPC `pair:generate-code`
- Displays code in `XXXX-XXXX` format (large monospace font)
- Shows QR code encoding the WebSocket URL (e.g. `ws://192.168.1.100:8788?code=XK4M9BQ2`)
- 5-minute countdown timer, auto-renews on expiry
- Copy button, "Phone Connected!" status when `relay:paired` event fires
- Terminal label helper text ("Open your phone → DeskFlow app → enter this code")

### main.ts IPC handler (lines 6095-6134)

```
pair:generate-code handler:
  1. pairingStore.createPairingCode(terminalId) → generates code + JWT
  2. Gets machine IP via getMachineIp() (prefers Tailscale, falls back to LAN)
  3. Fire-and-forget POST to sync server: { code, terminal_id, relay_host, relay_port, expires_at }
     with auth: Bearer <syncAccessToken>
  4. Returns { code, terminalId, expiresAt, wsUrl, port } to renderer
```

### getMachineIp() (main.ts, around line 6004)

```
getMachineIp():
  1. Check for Tailscale interface (100.x.x.x) — preferred
  2. Fallback to first non-loopback IPv4 (LAN IP like 192.168.x.x)
  3. Returns IP string used in QR code wsUrl
```

## 3. Sync Server Components

### sync-server/src/index.ts

- Fastify v5 on configurable port (default 8787)
- HOST defaults to "0.0.0.0" (binds all interfaces)
- Routes: `/v1/auth/*`, `/v1/sync/*`, `/v1/relay/*`, `/v1/pairing/*`, `/v1/learn/*`
- CORS enabled for all origins
- SQLite via libSQL

### POST /v1/auth/pair (sync-server/src/routes/auth.ts)

**Request body (code flow):**
```json
{ "code": "XK4M9BQ2", "deviceName": "My Phone", "platform": "android" }
```

**Logic:**
1. SHA-256 hashes the raw code
2. Looks up `pairing_codes WHERE code_hash = ? AND used = 0 AND expires_at > now`
3. If found: marks `used=1`, reads relay_host/relay_port/terminal_id from matched row
4. Creates anonymous user + device row
5. Returns:
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "userId": "...",
  "deviceId": "...",
  "relayUrl": "ws://192.168.1.100:8788",
  "terminalId": "term-001"
}
```

### POST /v1/pairing/codes (sync-server/src/routes/pairing.ts)

**Requires:** Bearer auth (desktop's sync access token)

**Request body:**
```json
{
  "code": "XK4M9BQ2",
  "terminal_id": "term-001",
  "relay_host": "192.168.1.100",
  "relay_port": 8788,
  "expires_at": 1783005678
}
```

**Logic:**
1. Validates code format (8 chars, A-Z0-9)
2. SHA-256 hashes the code server-side (raw code never stored)
3. Inserts into `pairing_codes` table
4. Audit log entry

### POST /v1/relay/ticket (sync-server/src/routes/relay.ts)

**Requires:** Bearer auth
**Returns:** `{ ticket: "<jwt>" }` — 60-second JWT for direct WebSocket auth

### pairing_codes table

```sql
CREATE TABLE pairing_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_hash TEXT NOT NULL UNIQUE,
  terminal_id TEXT NOT NULL,
  relay_host TEXT NOT NULL,
  relay_port INTEGER NOT NULL DEFAULT 8788,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  consumed_by_device_id TEXT,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

## 4. Current Flow (Step by Step)

1. **Setup:** User runs `start-dev.ps1` — generates JWT secrets, pairs desktop device (gets sync token), starts sync server + Electron app
2. **Desktop opens PairPhoneModal:** IPC generates 8-char code, GETs machine IP, POSTs code hash to sync server
3. **User configures phone:** The user must manually enter the sync server URL (desktop's LAN IP + port 8787) in the mobile app's config
4. **Phone enters code:** Types 8 characters into PairScreen
5. **Phone POSTs to sync server:** `POST /v1/auth/pair { code: "XK4M9BQ2", ... }`
6. **Sync server validates:** SHA-256 hash matches, code unused+unexpired, marks used
7. **Phone receives relayUrl:** `ws://192.168.1.100:8788` + terminalId
8. **Phone WebSocket connects:** Direct connection to desktop's relay server
9. **Terminal streams:** Bidirectional terminal I/O

## 5. Limitations in Current Design

| Problem | Impact |
|---|---|
| **Sync server not reachable from phone** — bound to 0.0.0.0 but user must know desktop's LAN IP to configure mobile BASE_URL | Average user cannot find their IP, won't configure it |
| **No auto-discovery** — phone doesn't know the desktop exists | User must manually type IP address and code |
| **LAN-only WebSocket relay** — direct connection to desktop's private IP | Doesn't work outside home WiFi |
| **No cloud fallback** — no relay server in the cloud | Zero remote access |
| **Code is 8 chars typed manually** — error-prone on mobile keyboard | Mistypes, frustration |
| **No in-app network config UI** — all config via env vars/code | Average user can't configure without help |
| **Single relay server per desktop** — can't scale to multiple phones or remote access | One terminal stream at a time |

## 6. Mobile App Capabilities (from existing code)

The mobile app (separate repo) already has:

- **PairScreen.tsx** — Text input for 8-char code, calls `POST /v1/auth/pair`
- **TerminalScreen.tsx** — xterm.js via WebView, connects via WebSocket to relay
- **api/client.ts** — HTTP client with `pair()`, `refresh()`, `getRelayTicket()` methods
- **Navigation/auth gate** — SecureStore for tokens, auto-redirect to PairScreen if no token

Unknown: does the mobile app support mDNS/Bonjour? Background WebSocket? Push notifications?
