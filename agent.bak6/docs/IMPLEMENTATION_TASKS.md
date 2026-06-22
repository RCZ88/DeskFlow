# Implementation Task List

**Last Updated:** 2026-04-28

---

## Completed (This Session)

### Tracking Fix
- [x] **Issue #51 Fix**: Removed hardcoded 5-minute cap on app sessions
  - Now uses runtime-configurable `MAX_SESSION_MS` loaded from database
  - Added `loadTrackingSettings()` to load values on startup
  - Sleep detection still works (uses `SLEEP_GAP_MS` separately)
  - Added IPC handlers: `get-tracking-settings`, `set-tracking-setting`

### Dashboard
- [x] **Weekly Overview stacked bar chart** - Shows device vs external activity per day
  - Uses Chart.js Bar chart with `stacked: true`
  - Blue = Device time, Purple = External activity time
  - Refreshes every 30 seconds

---

## Verified Working (Build Passes)

### External Page
- [?] ActivityDetailPanel - Code exists, needs user testing
- [?] ChartCustomizer dropdown - Code exists, needs user testing
- [?] StatCard component - Code exists, needs user testing
- [?] View Stats Only button - Code exists, needs user testing

### Terminal Page
- [?] Preset search - Code exists, needs user testing
- [?] Preset grouping by category - Code exists, needs user testing

---

## Pending Tasks

### Settings Page
- [ ] Add UI for tracking settings (sleep gap, max session)
- [ ] Persist changes via `setTrackingSetting`

### External Page  
- [ ] User testing for charts and panel

---

## Code Line Counter (Session)

| Task | Files | Lines |
|------|-------|-------|
| Tracking fix | main.ts, preload.ts | ~80 |
| Dashboard chart | DashboardPage.tsx | ~100 |
| External page features | ExternalPage.tsx, main.ts, preload.ts | ~300 |
| Terminal features | TerminalPage.tsx | ~35 |

**Total this session:** ~515 lines