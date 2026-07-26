# Phone Pairing — Desktop side is stuck, need your input

## What desktop has now

- PairPhoneModal generates an 8-char code + QR
- QR encodes: `http://<desktop-lan-ip>:8787?code=XK4M9BQ2`
- Sidebar now has a "Pair Phone" button that opens the modal
- IPC handler auto-generates a terminalId (UUID) if none provided

## The problem

The pairing flow is designed two ways:

**A) Direct WebSocket** (relay server port 8788, always running)
```
ws://<ip>:8788?code=XK4M9BQ2
```
Phone connects directly to WebSocket. The relay validates the code locally and streams the terminal. This works WITHOUT a sync server.

**B) Sync server** (sync server port 8787, only if `SYNC_URL` is configured)
```
http://<ip>:8787?code=XK4M9BQ2
```
Phone calls `POST /v1/auth/pair`, sync server validates against its `pairing_codes` DB table, returns credentials + relay URL.

The QR currently encodes the **sync server URL** (flow B), but most users don't run the sync server, so the phone hits a dead end.

## Questions for you

1. Did your mobile app implement the QR scan yet? If so, what happens when you scan? What error do you see?

2. Which flow does your mobile app actually use — does the PairScreen call `POST /v1/auth/pair` on the sync server, or does it connect directly to the WebSocket at `ws://<ip>:8788?code=XXXX`?

3. Which QR URL should I encode for MVP — the WebSocket URL (direct, no sync server needed) or the sync URL (needs extra infra)?
