# CONTEXT_BUNDLE — AFK Rework

> Self-contained code context for the Architect AI. Target AI has NO access to the codebase.
> All relevant code, schemas, IPC endpoints, and data flow.

---

## 1. Problem Statement (User's Raw Request)

> "WHATS WRONG WITH THE AFK FEATURE??? WHY DOES IT COUNTING AS THE EXTERNAL STUFF???? WHY DOES IT COUNT AS AN EXTERNAL ACTIVITY?? WHY IS IT NOT SET IT AS EMPTY, I HAVE FILL IN THE ACTIVITY, AND THEN THE AFK THING JUST REPLACES EVERYTHING. STUPID IDIOT WHAT KIND OF LOGIC IS THAT. I SAID THE AFK NEEDS TO BE FILLED, WHY DOES IT START A STOPWATCH????? IT SHOULD ASK ME WHAT I DID ON THE AFK IDIOT. THE AFK MUST MEAN THAT I HAVENT FILL IT IN YET. ALSO, WHEN IM ALREADY USING THE APPLICATION, WHY DOES IT TRACK IT WHEN IM ON AN EXTERNAL ACTIVITY OF THIS AFK THING?? IT SHOULD BE THAT IT SHOULD STILL TRACK SO THAT THERES NOTHING LOST. IT SHOULD PROMPT SOME ERROR AND SHOULD TELL THE USER 'YOU WERENT AFK', AND THEN THE USER CAN CONFIRM."

---

## 2. Database Schemas

### `external_activities` table (main.ts:2292-2305)
```sql
CREATE TABLE IF NOT EXISTS external_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('stopwatch', 'sleep', 'checkin')),
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'Clock',
  default_duration INTEGER DEFAULT 30,
  is_default INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `external_sessions` table (main.ts:2308-2320)
```sql
CREATE TABLE IF NOT EXISTS external_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER DEFAULT 0,
  notes TEXT,
  device_off_to_sleep_seconds INTEGER DEFAULT 0,
  wake_up_to_app_seconds INTEGER DEFAULT 0,
  FOREIGN KEY (activity_id) REFERENCES external_activities(id)
);
```

### Seed data — AFK is seeded as a default activity (main.ts:2792-2812)
```typescript
const defaultActivities = [
  { name: 'AFK', type: 'stopwatch', color: '#6b7280', icon: 'Coffee', default_duration: 60, sort_order: 0 },
  // ... 8 more activities (Studying, Exercise, Gym, Commute, Reading, Sleep, Eating, Short Break)
];
// Inserted with is_default=1
```

---

## 3. Main Process Tracking State (main.ts:3148-3161)

```typescript
let currentApp = null;
let sessionStart = Date.now();
let trackingInterval = null;
let isTracking = true;
let lastPollTime = Date.now();
let consecutiveNullPolls = 0;
const IDLE_THRESHOLD_MS = 10 * 60 * 1000; // 10min — OS-level idle before pausing tracking
const SLEEP_GAP_MS = 30000;
```

### `set-tracking` IPC handler (main.ts:4166-4170)
```typescript
ipcMain.handle('set-tracking', (event, enabled) => {
    isTracking = !!enabled;
    return isTracking;
});
```
When `isTracking = false`, `pollForeground()` (main.ts:3340) skips all foreground checks — no app tracking occurs. This means ALL real app data is lost during AFK periods.

---

## 4. Current AFK Flow (Renderer — App.tsx)

### 4a. Idle Detection Loop (App.tsx:1882-1935)
```typescript
useEffect(() => {
    if (isTracking) {
      interval = setInterval(() => {
        if (now < idleCooldownRef.current) return;
        
        // Skip idle check for Entertainment/Gaming
        const PASSIVE_ACTIVE = new Set(['Entertainment', 'Gaming']);
        const isPassiveActive = currentCategoryRef.current && PASSIVE_ACTIVE.has(currentCategoryRef.current);
        const idleMs = idleThreshold * 60 * 1000;
        
        if (!isPassiveActive && systemIdleSecondsRef.current * 1000 > idleMs) {
          setIsIdle(true);
          idleStartRef.current = Date.now();
          
          // Auto-save current session with '(idle)' title
          if (elapsedTime > 60) {
            // ... creates a log entry with title 'Auto-saved (idle)'
          }
          
          // START AFK external session in DB (creates external_sessions row!)
          window.deskflowAPI.startAfkSession().catch(console.error);
          
          // PAUSE main process tracking (stops pollForeground!)
          window.deskflowAPI.setTracking(false).catch(console.error);
          
          setIsTracking(false);
          setElapsedTime(0);
        } else {
          setElapsedTime(prev => prev + 1);
        }
      }, 1000);
    }
}, [isTracking, elapsedTime, currentApp, sessionStart, idleThreshold]);
```

### 4b. User Return Handler (App.tsx:1798-1814)
```typescript
const handleActivity = () => {
    setLastActivity(Date.now());
    if (idleRef.current) {
        setIsIdle(false);
        setIsTracking(true);              // Resume renderer tracking
        setSessionStart(new Date());
        idleCooldownRef.current = Date.now() + 12000;
        window.deskflowAPI.setTracking(true);  // Resume main process tracking
        idleReturnFnRef.current();            // Show AFK prompt
    }
};
```

### 4c. AFK Prompt Queue Builder (App.tsx:1736-1791)
```typescript
idleReturnFnRef.current = async () => {
    if (sleepActiveRef.current || sleepDetectionPendingRef.current) {
      window.deskflowAPI.stopAfkSession(); // Kill AFK session silently
      return;
    }
    if (afkPromptShownRef.current) return;
    afkPromptShownRef.current = true;
    
    const idleStartMs = idleStartRef.current;
    const nowMs = Date.now();
    const elapsed = idleStartMs ? Math.floor((nowMs - idleStartMs) / 1000) : 0;
    const afkDuration = ...;
    
    // Get active session (for timestamp)
    const activeSession = await window.deskflowAPI.getActiveExternalSession();
    
    // Guess typical activity for this time of day
    const guess = await window.deskflowAPI.getTypicalActivityAtTime(ts);
    
    // Re-check for sleep race
    if (sleepActiveRef.current) { stopAfkSession(); return; }
    
    const entry = { id, suggested: guess, duration: afkDuration, startedAt, idleStartMs, returnMs: nowMs, sessionId };
    setAfkPromptQueue(prev => [...prev, entry]);
};
```

### 4d. AFK Confirm Handler (App.tsx:1471-1504)
```typescript
const handleAfkConfirm = useCallback(async (segments) => {
    // Path 1: batchSaveAfkSegments — transactional multi-insert
    // Path 2: debugSaveAfk — single segment fallback
    // Path 3: stopAfkSession(activityId) — legacy reclassify
    setAfkPromptQueue(prev => prev.slice(1));
    window.dispatchEvent(new CustomEvent('external-data-changed'));
}, []);
```

### 4e. AFK Dismiss Handler (App.tsx:1506-1515)
```typescript
const handleAfkDismiss = useCallback(() => {
    setAfkPromptQueue(prev => prev.slice(1));
    window.deskflowAPI.stopAfkSession().then(() => {
        window.dispatchEvent(new CustomEvent('external-data-changed'));
    });
}, []);
```

---

## 5. AFK IPC Handlers (Main Process — main.ts)

### `start-afk-session` (main.ts:14746-14778)
```typescript
ipcMain.handle('start-afk-session', async () => {
    const afkActivity = db.prepare("SELECT id FROM external_activities WHERE name = 'AFK' LIMIT 1").get();
    // Close any existing unstoppped AFK session
    // INSERT new AFK session into external_sessions
    return { success: true, sessionId, activityId: afkActivity.id };
});
```

### `stop-afk-session` (main.ts:14782-14839)
```typescript
ipcMain.handle('stop-afk-session', async (event, newActivityId) => {
    // Find running AFK session (fallback: ANY running session)
    // If newActivityId: reclassify session's activity_id
    // Set ended_at + duration_seconds
    return { success: true, duration };
});
```

### `batch-save-afk-segments` (main.ts:14882-14908)
```typescript
// Transactional multi-insert into external_sessions
// Used when user fills multiple activity segments in the AFK prompt modal
```

### `reclassify-afk-session` (main.ts:14842-14859)
```typescript
// Change a closed AFK session's activity_id to a different activity
```

### `debug-save-afk` (main.ts:14862-14879)
```typescript
// Direct insert bypassing session-finding complexity
```

---

## 6. AfkPromptModal Component (full file: 406 lines)

**File:** `src/components/AfkPromptModal.tsx`

Key behaviors:
- **Line 59**: Filters OUT AFK from visible activities: `visibleActivities = allActivities.filter(a => a.name !== 'AFK')`
- Shows a horizontal timeline bar with color-coded segments
- Allows adding multiple activity segments with draggable dividers
- **handleSave()**: Creates time-segmented entries and calls `onConfirm(result)`
- Dismiss button (line 400): `'Nothing special — just AFK'`

```typescript
// Props interface
interface Props {
    allActivities: ExternalActivity[];
    totalDurationSeconds: number;
    periodStart: string;
    periodEnd: string;
    idleStartMs: number | null;
    returnMs: number;
    queueRemaining: number;
    onConfirm: (segments: { activityId: string; startedAt: string; endedAt: string }[]) => void;
    onDismiss: () => void;
}
```

---

## 7. delete-external-activity Handler (main.ts:14731-14741)

```typescript
ipcMain.handle('delete-external-activity', (event, id) => {
    db.prepare('DELETE FROM external_sessions WHERE activity_id = ?').run(id);
    db.prepare('DELETE FROM external_activities WHERE id = ? AND is_default = 0').run(id);
    return true;
});
```
**BUG:** `AND is_default = 0` prevents deleting the seeded AFK activity. User cannot remove AFK from the UI.

---

## 8. Timer / Tracking State in Renderer (App.tsx relevant state)

```typescript
const [isIdle, setIsIdle] = useState(false);
const [idleThreshold, setIdleThreshold] = useState(5); // minutes
const [afkPromptQueue, setAfkPromptQueue] = useState<AfkPromptEntry[]>([]);
const idleCooldownRef = useRef(0);
const idleStartRef = useRef<number | null>(null);
const idleReturnFnRef = useRef<() => void>(() => {});
const afkPromptShownRef = useRef(false);
const systemIdleSecondsRef = useRef(0); // OS-level idle seconds from main heartbeat
```

---

## 9. Preload API Surface (preload.ts relevant methods)

```typescript
// AFK
startAfkSession: () => ipcRenderer.invoke('start-afk-session'),
stopAfkSession: (newActivityId?: string) => ipcRenderer.invoke('stop-afk-session', newActivityId),
reclassifyAfkSession: (sessionId: number, newActivityId: number) => ipcRenderer.invoke('reclassify-afk-session', sessionId, newActivityId),
debugSaveAfk: (data) => ipcRenderer.invoke('debug-save-afk', data),
batchSaveAfkSegments: (segments) => ipcRenderer.invoke('batch-save-afk-segments', { segments }),

// Tracking
setTracking: (enabled: boolean) => ipcRenderer.invoke('set-tracking', enabled),
toggleTracking: () => ipcRenderer.invoke('toggle-tracking'),

// External
getExternalActivities: () => ipcRenderer.invoke('get-external-activities'),
startExternalSession: (activityId) => ipcRenderer.invoke('start-external-session', activityId),
stopExternalSession: () => ipcRenderer.invoke('stop-external-session'),
getActiveExternalSession: () => ipcRenderer.invoke('get-active-external-session'),
getTypicalActivityAtTime: (timestamp) => ipcRenderer.invoke('get-typical-activity-at-time', timestamp),

// Events
onTrackingHeartbeat: (callback) => ipcRenderer.on('tracking-heartbeat', (_, data) => callback(data)),
onSleepDetection: (callback) => ipcRenderer.on('sleep-detection', (_, data) => callback(data)),
```

---

## 10. App Categories & Tier System (App.tsx:374-395)

```typescript
const APP_CATEGORIES = {
  'VS Code': { cat: 'IDE', color: '#4f46e5' },
  'Claude': { cat: 'AI Tools', color: '#8b5cf6' },
  'Chrome': { cat: 'Browser', color: '#3b82f6' },
  // ... etc
};
```

---

## 11. ExternalPage.tsx — AFK Filtering

**File:** `src/pages/ExternalPage.tsx` line 558:
```typescript
.filter((a: any) => a.name !== 'AFK')
```
The ExternalPage explicitly filters out AFK from the visible activities list — but AFK sessions still appear in stats and session lists because they're in `external_sessions`.

---

## 12. Summary of Architecture Issues

| Issue | Location | Description |
|-------|----------|-------------|
| **A1** | `external_activities` seed | AFK is stored as a regular activity with type='stopwatch' |
| **A2** | Idle detection loop (App.tsx:1900-1925) | `setTracking(false)` stops real app tracking during AFK — data is lost |
| **A3** | Idle detection loop (App.tsx:1918) | `startAfkSession()` pre-creates a DB session before user confirms |
| **A4** | `delete-external-activity` (main.ts:14735) | `AND is_default = 0` prevents removing AFK from UI |
| **A5** | `handleActivity` (App.tsx:1798) | Resumes tracking with new session — loses "what was I doing before" context |
| **A6** | No "you weren't AFK" path | No way for user to reject the AFK label and say "I was working on [app]" |
