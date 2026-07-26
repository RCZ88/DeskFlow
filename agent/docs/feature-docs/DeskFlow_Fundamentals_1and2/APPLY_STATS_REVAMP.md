# Feature #1 — Per-session RAM / CPU / lag stats (realtime)

**Scope:** Adds live per-session resource monitoring to the sessions list. No new dependencies. Windows + macOS/Linux supported.

## What it does
- A **3-second sampler** in the main process measures, for every live terminal's PTY **process tree** (the shell + the CLI agent + its children):
  - **Memory** (RSS working set, summed across the tree) -> shown in MB/GB
  - **CPU %** (summed across the tree)
  - **Event-loop lag** (ms) as an app-responsiveness / "is it lagging" signal
- Results are broadcast on `terminal:resource-stats` and rendered as a compact badge on each session card: a health dot (**Smooth / Busy / Laggy**), `% CPU`, and memory.
- Sampling is self-guarded (never overlaps, never throws), and the timer is `unref()`ed so it never keeps the app alive.

## How the stats are collected (no deps)
- **macOS/Linux:** single `ps -eo pid=,ppid=,rss=,pcpu=` call per tick; the tree is summed in-process.
- **Windows:** single PowerShell `Get-CimInstance Win32_Process` call per tick (ProcessId/ParentProcessId/WorkingSetSize + `(Get-Process).CPU`). CPU % is derived from the delta of cumulative CPU-seconds between ticks. (Uses CIM, not the deprecated `wmic`, so it works on Windows 11 24H2+.)

## Edits, precisely
### `src/main.ts`
1. In `terminalManager.spawn()`, the terminal record now stores the PID: `this.terminals.set(id, { id, pty: ip, cwd, pid: proc.pid });`
2. A resource-stats module is inserted after `broadcast()`: the event-loop-lag tracker, `__collectProcSnapshotUnix/Win`, `__sumProcessTree`, `__sampleTerminalStats` (broadcasts `terminal:resource-stats`), a 3s sampler, and an on-demand `ipcMain.handle('terminal:get-resource-stats', ...)`.

### `src/preload.ts`
- `getResourceStats()` and `onResourceStats(cb)` added to the exposed terminal API.

### `src/pages/TerminalPage.tsx`
- New module-scope `SessionResourceStats` badge component (health dot + CPU + memory, with a PID / lag tooltip).
- New `resourceStats` state + a `useEffect` that subscribes via `onResourceStats`.
- The badge is rendered on each session card (keyed by `session.terminal_id`).

## Testing by hand (CZ)
1. Build/run the app, open **Work -> Sessions**.
2. Start a couple of terminal sessions running real agents.
3. Within ~3s each running session card shows a health dot + `% CPU` + memory. Idle/closed sessions show nothing.
4. Hover the badge to see PID + event-loop lag. Under heavy load the dot goes amber (Busy) then red (Laggy).

## Notes
- CPU % is process-tree total and can exceed 100% on multi-core machines (expected).
- On the very first Windows tick, CPU shows 0% until a delta baseline exists (one tick later).
