# DeskFlow — Current State   (OVERWRITE every cycle; max 40 lines)
CYCLE: 163
ROLE: Startup freeze diagnosis & IPC storm profiling
FIX PACKET: none
LAST VERIFIED: main.cjs rebuilt — IPC timing instrumentation live
IN FLIGHT:
  - Added [PERF-IPC] timing to: get-logs, get-external-sessions, get-external-stats, detect-ides, get-dashboard-data
  - Startup now 1.4s total (was reported 40s)
  - get-logs returns 7670 rows in 19-31ms each (4 calls on mount)
  - get-external-sessions: 1ms, get-external-stats: 1ms
  - detect-ides uses execSync — still a risk on cold start
NEXT ACTION: Evaluate if freeze is fixed or investigate remaining detect-ides blocking
