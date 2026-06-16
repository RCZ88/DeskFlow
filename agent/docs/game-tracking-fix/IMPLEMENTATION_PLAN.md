## Implementation Plan

### Deliverable 1: app-detection skill
- **Files:** `agent/skills/app-detection/SKILL.md` (new)
- **Changes:** Create reusable skill for launcher/wrapper process resolution
- **Codebase adaptation:** RESULT.md provides the full skill content directly

### Deliverable 2: gameDetection.ts module (All sections combined)
- **Files:** `src/gameDetection.ts` (new)
- **Changes:** Create complete module with:
  - `GAME_LAUNCHERS` constant (lines 75-83)
  - `isLauncherProcess()` function (lines 88-89)
  - `KNOWN_GAME_PROCESSES` constant (lines 93-103)
  - `gameNameFromTitle()` function (lines 106-114)
  - `installedGameIndex` Map (line 134)
  - `steamRoots()` function (lines 136-143)
  - `safeExists()` helper (line 146)
  - `libraryPaths()` function (lines 149-158)
  - `buildInstalledGameIndex()` function (lines 163-186)
  - `scanCache`, `scanInFlight`, `SCAN_TTL` state (lines 211-214)
  - `lookupExe()` function (lines 216-218)
  - `scanForGameProcess()` async function (lines 222-249)
  - `ResolveSource` type (line 264)
  - `lastResolvedGame` state (line 265)
  - `resolveForegroundApp()` async function (lines 267-303)

### Deliverable 3: Modify pollForeground() in main.ts
- **Files:** `src/main.ts` (lines 2977-3129)
- **Changes:** 
  - Add import for `resolveForegroundApp` at top of file
  - Replace direct `appName = result.owner?.name` with `resolveForegroundApp(result)`
  - Handle `resolved.source === 'keepalive'` case to not reset ongoing game session
  - Pass `isResolvedGame` flag to `categorizeApp()` calls

### Deliverable 4: Enhance categorizeApp()
- **Files:** `src/main.ts` (lines 2834-2850)
- **Changes:** Add optional `isResolvedGame` parameter to short-circuit to Gaming

### Deliverable 5: Call buildInstalledGameIndex on ready
- **Files:** `src/main.ts` (line 12124 area)
- **Changes:** Add `buildInstalledGameIndex()` call in `app.whenReady().then()`

### Verification
- Build: `npm run build`
- Manual checklist from RESULT.md:
  - Wuthering Waves tracked as Gaming (via title or Client.exe+index)
  - Idle Steam client NOT counted as a game
  - Epic/Battle.net titles resolve via same paths
  - Valorant/anti-cheat: null polls keep session alive
  - CPU < 1% during gaming
  - No false positives when not gaming