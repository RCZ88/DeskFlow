# Human Testing Checklist

**Last Updated:** 2026-04-28

---

## All Phases Implemented (Run app to test):

| Phase | Feature | Status | File |
|-------|---------|--------|------|
| 1 | Tracking on startup | ⏳ Test | main.ts line 2147 |
| 2 | Morning sleep modal | ⏳ Test | App.tsx new modal |
| 3 | View Stats Only button | ⏳ Test | ExternalPage.tsx |
| 4 | Dashboard external timer (unchanged) | ✅ | Already correct |

---

## Test Instructions:

### Phase 1: Tracking on App Open
1. Have VS Code (or any app) open first
2. Start the DeskFlow app
3. Timer should show VS Code immediately (not previous app)
4. ✅ Pass = Shows current app | ❌ Fail = Shows wrong app

### Phase 2: Morning Sleep Prompt
1. Close app at night (after 10pm)
2. Reopen app next morning (5am-10am)
3. Should see "Good Morning!" sleep modal
4. ✅ Pass = Modal shows | ❌ Fail = No modal

### Phase 3: View Stats Only
1. Go to External page (/external)
2. Click an activity
3. See Cancel, Start, AND "View Stats Only" buttons
4. ✅ Pass = 3 buttons | ❌ Fail = 2 buttons

---

## Results

| Phase | ✅ Pass | ❌ Fail | Notes |
|-------|--------|--------|-------|
| 1 Tracking | | | |
| 2 Sleep | | |  
| 3 Stats | | | |
| 4 Dashboard | ✅ | | Already work |

---