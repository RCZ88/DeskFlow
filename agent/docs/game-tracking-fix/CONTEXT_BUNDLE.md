# CONTEXT_BUNDLE.md — Game Tracking Fix

## Problem Statement
Steam games (e.g., Wuthering Waves) are not being tracked as applications. The user wants all games tracked properly while maintaining maximum efficiency (no lag).

## Current Implementation Analysis

### 1. Active Window Polling (`pollForeground` in main.ts:2977)
- Uses `active-win` npm package to get foreground window
- Polls every ~1-2 seconds (based on interval)
- Gets `result.owner.name` (process name) and `result.title` (window title)
- Known issue: Fullscreen games with anti-cheat may return null

### 2. Game Detection Logic
**DEFAULT_APP_CATEGORIES** (main.ts:216-226) includes:
```javascript
'steam': 'Gaming', 'epic': 'Gaming', 'battle.net': 'Gaming',
'blizzard': 'Gaming', 'riot': 'Gaming', 'ubisoft': 'Gaming',
'wuthering': 'Gaming', 'honkai': 'Gaming', 'star rail': 'Gaming',
'genshin': 'Gaming', 'elden ring': 'Gaming', 'cyberpunk': 'Gaming',
'baldur': 'Gaming', 'call of duty': 'Gaming', 'gta': 'Gaming',
'v rising': 'Gaming', 'game': 'Gaming', 'unity': 'Gaming',
'unreal': 'Gaming', 'godot': 'Gaming'
```

**categorizeApp function** (main.ts:2834-2850):
- Checks exact match in `categoryConfig.appCategoryMap`
- Checks lowercase in `categoryConfig.detectedApps`
- Iterates `DEFAULT_APP_CATEGORIES` keywords for substring match
- Returns 'Uncategorized' if no match

### 3. Null Poll Handling for Games (main.ts:2990-2997)
```javascript
if (!result) {
    consecutiveNullPolls++;
    if (consecutiveNullPolls >= 30) {
        if (currentApp && categorizeApp(currentApp) === 'Gaming') {
            sessionStart = now;  // Keep session alive for games
            return;
        }
    }
}
```

### 4. Known Issues with Games
1. **Process name mismatch**: Steam games often run as `Client.exe`, `Game.exe`, `Wuthering Waves.exe`, not "Wuthering Waves"
2. **Steam wrapper**: active-win may return "Steam" instead of the actual game
3. **Anti-cheat**: Fullscreen games with kernel-level anti-cheat (EasyAntiCheat, BattlEye, Vanguard) block window enumeration
4. **Window title vs process**: Window title may show "Wuthering Waves" but process is different
5. **No window handle**: Some games don't create traditional windows active-win can detect

### 5. Performance Constraints
- Current poll interval: ~1-2 seconds
- active-win calls native code (fast but not free)
- Must maintain <1% CPU usage
- Cannot add heavy polling or background processes

## Current Data Flow
```
pollForeground() → active-win → result.owner.name + result.title
  → categorizeApp(processName) → category
  → addLog() → SQLite (logs table)
  → foreground-changed event → renderer
```

## Files to Modify
1. `src/main.ts` - Core tracking logic
2. `src/preload.ts` - IPC bridge if new APIs needed
3. `src/App.tsx` - Renderer state if new events

## Research Needed
1. What process names do popular games actually use?
2. Does active-win work with fullscreen exclusive games?
3. Are there Windows APIs (WMI, GetForegroundWindow) that work better?
4. Can we use Steam API to get currently running game?

## Success Criteria
- Wuthering Waves tracked as "Gaming" category
- All Steam/Epic/Battle.net games tracked
- <1% CPU overhead
- No false positives (tracking when not playing)
- Works with anti-cheat games