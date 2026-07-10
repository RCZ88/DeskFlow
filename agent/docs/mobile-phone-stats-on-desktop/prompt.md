# Prompt: Mobile Telemetry Collection (Expo React Native)

## What to build
Add telemetry collection to the Expo React Native mobile app — battery level, app foreground/background usage, device info — and push it to the sync server. The desktop is already wired to display this.

## Expo constraints (don't fight these)
- ❌ No third-party foreground app detection (needs `UsageStatsManager` on Android / `ManagedSettings` on iOS — both require ejecting)
- ❌ No screen on/off listener outside the app (needs native `BroadcastReceiver`)
- ❌ No reliable sub-15-minute background fetch (Expo minimum ~15min on Android)
- ✅ **Battery level** via `expo-battery` — works on both, no permissions needed
- ✅ **Own app foreground/background** via React Native `AppState` — tracks when DeskFlow itself goes to bg/fg
- ✅ **Device info** via `expo-device` — platform, version
- ✅ **Network status** via `@react-native-community/netinfo`
- ✅ **Push on AppState change** — flush telemetry when app goes background, and again on return to foreground

## What's already done (sync server side — NOT your job)
The sync server already has:
- `phone_telemetry` table: `id, user_id, device_id, recorded_at, deskflow_foreground_sec, deskflow_background_sec, battery_level, battery_state, platform, platform_version`
- `POST /v1/phone/telemetry/push` — accepts telemetry payload, stores it, updates device last_seen
- `GET /v1/phone/telemetry/live` — returns current battery, today's usage, online status for desktop dashboard
- `GET /v1/phone/telemetry/summary?from=&to=` — daily aggregates for desktop history charts

## What you need to build (mobile app only)

### 1. Battery listener
```typescript
import * as Battery from 'expo-battery'

// Subscribe to changes
const sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
  // Store: telemetry.latestBattery = batteryLevel * 100
})

// Also get battery state (charging/unplugged/full)
const batteryState = await Battery.getBatteryStateAsync()
// BatteryState.CHARGING → "charging", BatteryState.UNPLUGGED → "unplugged", BatteryState.FULL → "full"
```

### 2. AppState listener (foreground/background tracking)
```typescript
import { AppState } from 'react-native'

// Track these in memory:
// telemetry.sessionStart = ISO string (set on app launch)
// telemetry.foregroundAccum = 0 (accumulated seconds)
// telemetry.backgroundAccum = 0
// telemetry.lastTransition = Date.now()
// telemetry.currentState = AppState.currentState

useEffect(() => {
  const sub = AppState.addEventListener('change', (nextState) => {
    const now = Date.now()
    const elapsed = Math.floor((now - telemetry.lastTransition) / 1000)

    if (telemetry.currentState === 'active' && nextState.match(/inactive|background/)) {
      // Going to background — accumulate foreground time
      telemetry.foregroundAccum += elapsed
      // FLUSH TELEMETRY NOW
    } else if (telemetry.currentState.match(/inactive|background/) && nextState === 'active') {
      // Coming to foreground — accumulate background time
      telemetry.backgroundAccum += elapsed
      // FLUSH TELEMETRY NOW (catches anything missed while bg'd)
    }

    telemetry.lastTransition = now
    telemetry.currentState = nextState
  })
  return () => sub.remove()
}, [])
```

### 3. Push function (call on AppState → background + foreground)
```typescript
async function flushTelemetry() {
  const payload = {
    device_id: storedDeviceId,   // from pairing
    recorded_at: new Date().toISOString(),
    deskflow_usage: {
      session_started_at: telemetry.sessionStart,
      foreground_seconds: telemetry.foregroundAccum,
      background_seconds: telemetry.backgroundAccum,
    },
    battery: {
      level_percent: telemetry.latestBattery,
      state: telemetry.latestBatteryState,
    },
    device: {
      platform: Device.osName,
      platform_version: Device.osVersion,
    },
  }

  try {
    const res = await fetch(`${syncServerUrl}/v1/phone/telemetry/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      // Reset accumulated counters (keep session_started_at)
      telemetry.foregroundAccum = 0
      telemetry.backgroundAccum = 0
    }
  } catch (e) {
    console.warn('telemetry push failed, will retry on next flush', e)
    // Don't reset — data will be included in next flush
  }
}
```

### 4. On app launch
- Load `session_started_at` from AsyncStorage. If not set, set it now.
- Immediately flush any stale telemetry from a previous crash/force-close.

### 5. API Contract (what the server expects)
```
POST /v1/phone/telemetry/push
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "device_id": "uuid-from-pairing",
  "recorded_at": "2026-07-03T22:00:00Z",
  "deskflow_usage": {
    "session_started_at": "2026-07-03T10:00:00Z",
    "foreground_seconds": 342,
    "background_seconds": 120
  },
  "battery": {
    "level_percent": 85,
    "state": "unplugged"
  },
  "device": {
    "platform": "android",
    "platform_version": "14"
  }
}
```

`device_id` is the UUID the mobile app received during pairing (`deviceId` from `POST /v1/auth/pair`). The server validates it belongs to the authenticated user.

## What NOT to do
- Do NOT try to track third-party apps, screen unlocks, or screen on/off — Expo can't do this
- Do NOT poll the server — you push, you don't pull
- Do NOT add background fetch that runs every 5 minutes — push on AppState transitions is fine
- Do NOT modify any sync server code — that's already done

## What the desktop will display with this data
Once telemetry flows in, the desktop will show:
- **Live card**: Battery level + charging status, device name + platform icon, "last seen X ago", online/offline badge
- **Today's usage**: "DeskFlow was open for 2h 30m today"
- **History**: Charts of DeskFlow usage and battery over 7/30 days
