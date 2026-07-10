# DeskFlow Phone Pairing — MVP (QR scan)

Desktop side is ready. Mobile needs QR scanner integration.

## What changed (desktop)

QR code now encodes the sync URL + pairing code instead of the WebSocket URL. The QR encodes:

```
http://<desktop-lan-ip>:8787?code=XK4M9BQ2
```

Phone scans this → extracts `BASE_URL` and `code` in one action. No typing, no IP discovery.

**Desktop files changed:**
- `src/main.ts` (line ~6128) — `pair:generate-code` now returns `syncUrl: "http://<ip>:8787?code=XK4M9BQ2"` alongside the existing `wsUrl`
- `src/components/PairPhoneModal.tsx` — QR generates from `result.syncUrl` instead of `result.wsUrl`

## What mobile needs to do

### 1. Add QR scan to PairScreen

Replace the text input with a camera view:
- Install `expo-camera` (or use `expo-barcode-scanner`)
- Replace the manual code input with a live scanner
- Parse the scanned URL: extract `BASE_URL` from origin, extract `code` from `?code=` param
- Call `POST /v1/auth/pair` with the code (same as before)

### QR URL format

```
http://192.168.1.100:8787?code=XK4M9BQ2
     ↑ BASE_URL                       ↑ code
```

### 2. Keep text input as fallback

Some users may not have a camera or the QR may not scan. Keep the manual code input as an expandable fallback (below the camera view, with "or enter code manually" separator).

### Flow

1. Phone opens PairScreen → camera activates (with permission prompt)
2. Phone scans QR on desktop's PairPhoneModal
3. Extracts BASE_URL → stores it as the server URL for future API calls
4. Extracts code → calls `POST /v1/auth/pair` with `{ code, deviceName, platform }`
5. Sync server validates SHA-256 hash, returns `{ accessToken, relayUrl: "ws://<ip>:8788", terminalId }`
6. Mobile connects to `relayUrl` via WebSocket
7. Terminal streaming begins

### What stays the same

- `src/screens/TerminalScreen.tsx` — no changes needed
- `src/api/client.ts` — `pair()`, `refresh()`, `getRelayTicket()` unchanged
- Auth gate + token storage unchanged
