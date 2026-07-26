# DeskFlow Phone Pairing — Decision Record

## Mobile Agent's Recommendation (7/2/2026)

**Recommendation:** QR scan (MVP now) → Hybrid (future)

### Analysis

| Approach | Mobile feasibility | Verdict |
|---|---|---|
| QR scan | `expo-camera` + barcode scanner, low effort | ✅ **DO THIS NOW** |
| mDNS | `react-native-zeroconf` unmaintained, no stable Expo solution | ❌ Skip |
| BLE | `expo-ble-manager` works but overkill for one-time setup | ❌ Skip |
| NFC | Android only, iOS needs entitlement | ❌ Skip |
| Cloud relay | Already have WebSocket, needs public VPS infra | 🔜 Future |
| Push notifications | FCM/APNS setup, only for wake-up | 🔜 Future |

### New flow (QR)

The PairPhoneModal QR now encodes:
```
http://<desktop-ip>:8787?code=XK4M9BQ2
```

Phone scans → extracts BASE_URL + code in one shot → calls `POST /v1/auth/pair` → connects via WebSocket relay.

### Desktop changes done

- `src/main.ts` — IPC now returns `syncUrl` field with machine IP
- `src/components/PairPhoneModal.tsx` — QR encodes sync URL, not WebSocket URL

### Mobile needs

- Add `expo-camera` / barcode scanner to PairScreen
- Replace text-only input with camera view (keep manual input as fallback)
- Parse scanned URL for BASE_URL + code
- Everything else (TerminalScreen, client.ts, auth) stays unchanged
