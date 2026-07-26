# CONTEXT_BUNDLE.md — Phone Stats on Desktop (Revised v2)

## Goal
Show phone stats (battery, DeskFlow usage, device info, online status) on the desktop Electron app. This is NOT full app tracking — Expo React Native cannot detect third-party apps. The phone tracks only its own usage of the DeskFlow app.

## Current Architecture

### Sync Server (port 8787, Fastify v5)
- **10 DB tables**: users, devices, refresh_tokens, sync_cursors, terminal_sessions, terminal_messages, workspace_problems, workspace_requests, pairing_codes, learn_lessons, learn_progress, audit_log
- **Auth**: JWT via `jose` (HS256), `requireAuth` preHandler on all routes except `/health` and `/v1/auth/*`. Access token TTL 1h, refresh token TTL 30d.
- **Synced tables** (bidirectional push/pull): `terminal_sessions`, `terminal_messages`, `workspace_problems`, `workspace_requests` — strict allowlist in `VALID_TABLES` in `sync.ts`.
- **No phone tracking infrastructure** — zero tables, zero endpoints for any kind of phone stats or device telemetry.
- **Devices table**: `id, user_id, name, platform, paired_at, last_seen` — created at pair time, never updated with stats.
- **All auth'd routes** get `(req as any).user = { sub: userId, did?: deviceId }`.
- **DB**: libSQL (SQLite-compatible) via `@libsql/client`.

### Desktop App (Electron + React)
- **IPC handlers** in `main.ts` `initDesktopBridge()` for all sync server calls.
- **Preload bindings** in `preload.ts` via `contextBridge.exposeInMainWorld('deskflowAPI', ...)`.
- **Sync token**: `getSyncTokenForRelay()` returns JWT from localStorage key `syncToken`.
- **Pairing flow**: QR code encodes `http://<ip>:8787?code=XK4M9BQ2` → phone scans → `POST /v1/auth/pair { code, deviceName, platform }` → returns `{ accessToken, refreshToken, userId, deviceId }`.
- **No UI for phone stats** — nothing exists yet on the desktop to display phone data.

### Mobile App (Expo React Native, external)
- **Connects via**: HTTP to sync server (port 8787) for auth/data, WebSocket to terminal relay (port 8788) for terminal I/O.
- **Current capabilities**: Terminal relay client, sync pull of 4 terminal/workspace tables.
- **Expo constraints** (confirmed by mobile Architect):
  - CANNOT detect third-party foreground apps (needs `UsageStatsManager` on Android, `ManagedSettings` on iOS — both require ejecting)
  - CANNOT listen for screen on/off outside the app (needs native `BroadcastReceiver`)
  - CANNOT do reliable sub-15-minute background fetch
  - CAN do: battery level (`expo-battery`), own app foreground/background (`AppState`), device info (`expo-device`), network status (`@react-native-community/netinfo`)

## Data Model (Revised)

### What Mobile Can Push
```json
{
  "device_id": "uuid",
  "recorded_at": "2026-07-03T22:00:00Z",
  "deskflow_usage": {
    "session_started_at": "2026-07-03T10:00:00Z",
    "foreground_seconds": 342,
    "background_seconds": 120
  },
  "battery": {
    "level_percent": 85,
    "state": "unplugged"   // "unplugged" | "charging" | "full"
  },
  "device": {
    "platform": "android",
    "platform_version": "14"
  }
}
```

### Sync Server — One Table
Instead of 3 tables, use a single `phone_telemetry` table:
```sql
CREATE TABLE IF NOT EXISTS phone_telemetry (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  deskflow_foreground_sec INTEGER DEFAULT 0,
  deskflow_background_sec INTEGER DEFAULT 0,
  battery_level REAL,
  battery_state TEXT,
  platform TEXT,
  platform_version TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### API Endpoints

**POST /v1/phone/telemetry/push** — Receive a batch of telemetry from mobile. Auth required.
- Body: same as the JSON above (or array of them for batching)
- Also updates `devices.last_seen` for the device
- Returns `{ received: true }`

**GET /v1/phone/telemetry/summary?from=ISO&to=ISO** — Aggregated for desktop display. Auth required.
- Returns daily aggregates calculated server-side from `phone_telemetry` rows
```json
{
  "daily": [
    {
      "date": "2026-07-03",
      "deskflow_foreground_sec": 3600,
      "deskflow_background_sec": 7200,
      "avg_battery": 72,
      "latest_battery": 85
    }
  ]
}
```

**GET /v1/phone/telemetry/live** — Current state for the live dashboard card. Auth required.
```json
{
  "device_name": "Pixel 7",
  "device_platform": "android",
  "current_battery": 85,
  "battery_state": "unplugged",
  "today_deskflow_foreground_sec": 3600,
  "today_deskflow_background_sec": 7200,
  "last_seen": "2026-07-03T22:00:00Z",
  "is_online": true
}
```

## Desktop Display Plan
With this limited but feasible data, the desktop can show:
1. **Live card**: Battery level with icon (charging/unplugged), "last seen X ago", device name + platform icon
2. **Daily summary bar**: DeskFlow usage today (foreground vs background hours)
3. **History chart**: DeskFlow usage over the last 7/30 days
4. **Battery history**: Battery level over time
5. **Status indicator**: Online/offline badge

## Key Decisions
- Sync server uses hard delete, not soft delete.
- All new endpoints require `{ preHandler: requireAuth }`.
- Mobile pushes telemetry flush on AppState → background, and on AppState → foreground (catches missed flushes).
- Desktop queries aggregated data; no server-side aggregation cron needed, just SQL aggregate queries.
- JWT secret is shared between sync server and desktop via env var `JWT_SECRET`.
- Use zod for request validation on all new endpoints (existing pattern).
