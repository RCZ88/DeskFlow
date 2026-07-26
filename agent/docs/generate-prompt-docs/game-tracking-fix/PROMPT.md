# PROMPT.md — Game Tracking Fix

## Task Type: Engineering (Bug Fix + Enhancement)

## User Request (Verbatim)
"WHY IS IT THAT IT DOESNT TRACK MY STEAM GAMES MY WUETHERING WAVE S GAME IDIOTTT. I Need you to generaste skill and geneasrtte a propmt so that it make sure that it tracks all my games as an application properly too while maintaining its efficiecny and doesnt make the laptop or device lagging .it shoiuld be as aeffcient as possible."

## Context
- **Application**: DeskFlow — Desktop activity tracker (Electron + React)
- **Current tracking**: Uses `active-win` npm package to poll foreground window
- **Problem**: Steam games (Wuthering Waves, etc.) not tracked as applications
- **Constraint**: Must maintain efficiency (<1% CPU, no lag)

## Technical Requirements

### Core Problem
`active-win` returns the Steam client process name ("Steam") instead of the actual game executable, OR returns null for fullscreen anti-cheat games.

### Required Solution
Implement a **multi-layer game detection strategy**:

1. **Process Tree Analysis** — When `active-win` returns "Steam" or similar launcher, enumerate child processes to find actual game
2. **Window Title Fallback** — Extract game name from window title when process name is generic
3. **Steam API Integration** — Query local Steam API for currently running game (most reliable)
4. **Known Game Process Database** — Maintain mapping of known game executables → display names
5. **Anti-Cheat Resilience** — For games returning null, use last-known game + session keep-alive logic

### Performance Requirements
- **Poll interval**: Keep at 1-2 seconds (current)
- **Process enumeration**: Only when launcher detected (Steam, Epic, Battle.net, etc.)
- **Caching**: Cache Steam API response for 10 seconds
- **CPU budget**: <0.5% additional overhead
- **Memory**: Minimal - only store mappings in memory

### Architecture
```
pollForeground()
  → active-win.getForeground()
  → if result.owner.name is launcher (Steam/Epic/Battle.net):
      → getGameFromLauncher(result.owner.name, result.title)
  → else if result is null AND lastApp was Gaming:
      → keep session alive (existing logic)
  → else:
      → normal categorization
```

## Specific Implementation Details

### 1. Launcher Detection
```javascript
const GAME_LAUNCHERS = {
  'steam': ['steam.exe', 'steamwebhelper.exe'],
  'epic': ['epicgameslauncher.exe', 'unrealcefsubprocess.exe'],
  'battle.net': ['battle.net.exe', 'agent.exe'],
  'ea': ['eaapp.exe', 'origin.exe'],
  'gog': ['goggalaxy.exe'],
  'ubisoft': ['ubisoftconnect.exe'],
  'riot': ['riotclient.exe', 'riotclientservices.exe']
};
```

### 2. Steam API Query (Preferred)
- Endpoint: `http://localhost:27032/api` or `steam://` protocol
- Or parse `steamapps/libraryfolders.vdf` + running processes
- Most reliable: Check child processes of Steam.exe for known game executables

### 3. Process Tree Enumeration (Windows)
```powershell
Get-WmiObject Win32_Process -Filter "ParentProcessId=STEAM_PID"
```
Or use `ps-tree` / `wmic` equivalent in Node.js

### 4. Game Process Database
Maintain `KNOWN_GAME_PROCESSES` map:
```javascript
{
  'Client.exe': 'Wuthering Waves',
  'Game.exe': 'Elden Ring',
  'wutheringwaves.exe': 'Wuthering Waves',
  'genshinimpact.exe': 'Genshin Impact',
  'starrail.exe': 'Honkai: Star Rail',
  // ... auto-expanded from Steam library
}
```

### 5. Window Title Extraction
When process is "Steam" but title contains game name:
```javascript
// "Wuthering Waves - Steam" → extract "Wuthering Waves"
const gameMatch = title.match(/^(.+?)\s*[-–—]\s*Steam$/i);
```

## Deliverables
1. **Modified `pollForeground()`** in `src/main.ts` with multi-layer detection
2. **New helper functions**: `getGameFromLauncher()`, `enumerateChildProcesses()`, `querySteamAPI()`
3. **Known game process database** (auto-populated from Steam library on startup)
4. **Updated `categorizeApp()`** to use enhanced detection
5. **Performance benchmarks** showing <0.5% CPU overhead

## Anti-Patterns to Avoid
- ❌ Polling WMI/ps-list every cycle (too slow)
- ❌ Adding background worker process
- ❌ Heavy filesystem reads on each poll
- ❌ Storing large databases in memory
- ❌ Changing poll interval

## Testing Checklist
- [ ] Wuthering Waves tracked as "Gaming" 
- [ ] Steam client itself not tracked as game
- [ ] Epic Games launcher games tracked
- [ ] Battle.net games tracked
- [ ] Anti-cheat games (Valorant, etc.) keep session alive
- [ ] CPU usage <1% during gaming
- [ ] No false positives when not gaming

## Acceptance Criteria
User opens Wuthering Waves → Dashboard shows "Wuthering Waves" under Gaming category with accurate time tracking → No performance impact on game FPS.