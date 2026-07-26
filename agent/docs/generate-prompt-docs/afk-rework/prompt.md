# AFK Feature — Complete Rework

## Raw Request (User's exact words, verbatim)

> WHATS WRONG WITH THE AFK FEATURE??? WHY DOES IT COUNTING AS THE EXTERNAL STUFF???? WHY DOES IT COUNT AS AN EXTERNAL ACTIVITY?? WHY IS IT NOT SET IT AS EMPTY, I HAVE FILL IN THE ACTIVITY, AND THEN THE AFK THING JUST REPLACES EVERYTHING. STUPID IDIOT WHAT KIND OF LOGIC IS THAT. I SAID THE AFK NEEDS TO BE FILLED, WHY DOES IT START A STOPWATCH????? IT SHOULD ASK ME WHAT I DID ON THE AFK IDIOT. THE AFK MUST MEAN THAT I HAVENT FILL IT IN YET. ALSO, WHEN IM ALREADY USING THE APPLICATION, WHY DOES IT TRACK IT WHEN IM ON AN EXTERNAL ACTIVITY OF THIS AFK THING?? IT SHOULD BE THAT IT SHOULD STILL TRACK SO THAT THERES NOTHING LOST. IT SHOULD PROMPT SOME ERROR AND SHOULD TELL THE USER 'YOU WERENT AFK', AND THEN THE USER CAN CONFIRM.

---

## Context

Read `CONTEXT_BUNDLE.md` first. It contains all relevant code, schemas, IPC endpoints, and data flow.

The AFK (Away From Keyboard) feature has fundamental design flaws:

1. **AFK is stored in `external_activities`** as a regular activity with `type='stopwatch'`. This is wrong — AFK is not an activity, it's a **placeholder for unknown time**. It should NOT appear in external activities UI, NOT have a stopwatch, NOT count as "external activity time."

2. **When idle is detected, real-app tracking stops.** The system calls `setTracking(false)` which pauses `pollForeground()` in main.ts. All real app usage during an AFK period is lost. The current foreground app session is discarded (auto-saved with "Auto-saved (idle)" title).

3. **AFK pre-creates a DB session.** `startAfkSession()` immediately INSERTs a row into `external_sessions` with `activity_id = AFK`. This happens BEFORE the user confirms anything. The user should only get a DB record when they actually fill in what happened.

4. **No "I wasn't AFK" path.** When the user returns and the AFK prompt shows "What were you doing?", there's no option to say "Nothing — I was using [app] the whole time." The only options are: fill in activities or dismiss.

5. **delete-external-activity blocks AFK removal.** The `WHERE is_default = 0` guard prevents deleting the seeded AFK activity from the UI, even though the ExternalPage already filters it out.

---

## The Mandate

Design a comprehensive solution that reworks the AFK system from scratch. The solution must be a single, well-reasoned implementation — do not offer multiple approaches to choose from.

### Core Requirements

**Requirement 1: AFK is NOT an external activity**
- Remove AFK from the `external_activities` table concept. AFK should be an in-memory state, not a persisted activity.
- The `external_activities` table should NOT have AFK as a default activity.
- The `external_sessions` table should NOT be used for AFK placeholder records.
- AFK must not appear on the External Page, in external stats, in activity pickers, or in any external-activity UI.
- The existing seed migration must be updated to NOT seed AFK. Existing databases must handle the old AFK rows gracefully.

**Requirement 2: Real-app tracking continues during AFK**
- When idle is detected, DO NOT stop the main process tracking (`setTracking(false)`).
- The in-memory elapsed timer on the renderer should continue counting.
- The current app session should NOT be auto-saved or discarded.
- Instead, mark the time range as "potentially idle" with a flag/tag that gets resolved when the user returns.
- If the user confirms they were AFK, the flagged time becomes a new external session entry.
- If the user denies being AFK, the flag is removed and the app tracking data is preserved intact.

**Requirement 3: AFK prompt offers "I wasn't AFK" option**
- When user returns from idle, show a prompt with three pathways:
  - **Fill in activities** (existing AfkPromptModal behavior — user assigns activities to segments of the idle period)
  - **"I wasn't AFK"** (NEW — discard the idle flag, keep the app tracking data as-is, no external session created)
  - **"Nothing special — just AFK"** (existing dismiss — closes the prompt, creates a single brief AFK entry or nothing)
- The "I wasn't AFK" option must be the PRIMARY action (visually prominent), not hidden in a dismiss button.

**Requirement 4: AFK duration prompt checks if user was actually idle**
- When idle is detected but the total idle duration is very short (e.g., < 60 seconds), DO NOT show the AFK prompt at all — it was probably a false trigger.
- When the idle duration is moderate (e.g., 1-5 minutes), show the prompt but pre-fill it with "I wasn't AFK" selected by default.
- When the idle duration is long (e.g., > 15 minutes), show the prompt normally with the activity picker ready.

**Requirement 5: delete-external-activity must allow removing AFK**
- Remove the `AND is_default = 0` guard from the delete handler, OR add a separate dedicated handler for deleting default activities.
- Since AFK won't be in `external_activities` anymore, this is primarily a cleanup fix for existing installations.

---

## Data Processing Pipeline Design

Design the complete data flow:

1. **Idle Detection → AFK Flagging:**
   - Renderer detects idle via `systemIdleSecondsRef` (from main process heartbeat)
   - Instead of starting an AFK session in DB, set an in-memory `pendingIdleRange: { idleStart: timestamp, idleEnd: null }`
   - Do NOT stop main process tracking — `pollForeground()` continues logging real app sessions
   - Do NOT auto-save the current app session

2. **User Return → AFK Prompt:**
   - `handleActivity()` fires on user input (mouse/keyboard/touch)
   - Check `pendingIdleRange` — if it exists, calculate duration and decide prompt visibility:
     - `< 60s`: automatic discard, no prompt
     - `1-15min`: show prompt with "I wasn't AFK" pre-selected
     - `> 15min`: show prompt with activity picker open
   - If user picks "I wasn't AFK": clear `pendingIdleRange`, no DB changes
   - If user picks activities: create `external_sessions` entries for the idle period AND truncate the overlapping app tracking? (decide what's correct)

3. **App Tracking Overlap Resolution:**
   - When AFK is confirmed with activities, the main process will have logged real app sessions during the idle period (because polling continued)
   - The solution must decide: keep the app sessions AND add external sessions? Or remove the app sessions and replace with external sessions?
   - Recommended approach: keep BOTH. App sessions show what app was in the foreground. External sessions show what the user was actually doing. The External Page stats would show the external activity, and the Dashboard would still show the foreground app. They serve different purposes.

4. **Existing Data Migration:**
   - Existing `external_sessions` with `activity_id = AFK` should be handled:
     - If they have `ended_at` and `duration_seconds` populated → keep them (they're historical AFK entries)
     - If they have `ended_at IS NULL` → they're stale, delete or auto-close them
   - Existing `external_activities` row for AFK → should be marked `is_visible = 0` or deleted

---

## What to Design

### 1. Backend / IPC Changes
- Remove or deprecate `start-afk-session` IPC handler
- Remove or deprecate `stop-afk-session` IPC handler
- Remove or deprecate `reclassify-afk-session` IPC handler  
- Remove or deprecate `debug-save-afk` IPC handler
- Deprecate `batch-save-afk-segments` (replace with a cleaner `create-external-sessions-batch` that doesn't mention AFK)
- Remove AFK from seed data in `external_activities`
- Remove `is_default = 0` guard from `delete-external-activity`
- Add migration logic for existing databases to handle the old AFK rows

### 2. Renderer / UI Changes
- Remove the AFK auto-save logic in the idle detection loop (the "Auto-saved (idle)" path)
- Remove `startAfkSession()` and `stopAfkSession()` calls from the idle detection loop
- Add `pendingIdleRange` state variable (in-memory, no DB)
- Redesign the AFK prompt to include the "I wasn't AFK" option
- Add duration-based prompt visibility rules
- Keep `AfkPromptModal` but retool it to work without pre-existing DB sessions
- Update `ExternalPage` to not need the `a.name !== 'AFK'` filter (AFK won't be in activities)

### 3. UX / Interaction Design
- The idle detection timer should show a subtle indicator that idle was detected (e.g., a yellow pulsing dot on the timer) so the user knows something is pending
- The AFK prompt should feel like a helpful "did I miss something?" nudge, not a mandatory form
- "I wasn't AFK" should be the easy path — one click, no typing, no segments
- Activity assignment should still support the timeline segment UI for power users

---

## Constraints

- Preload API changes must maintain backward compatibility or be clearly versioned
- The system must handle rapid idle/detection/re-awake cycles (e.g., user steps away for 30 seconds)
- All localStorage access must be wrapped in try/catch
- The External Page and Dashboard must continue to work correctly during the transition
- Files are CRLF — preserve line endings; don't mass-reformat
- Generated `.md` views come from DB/JSON — don't hand-edit generated views, edit their source

---

## Output Format

Provide the complete solution as:
1. **Architecture Summary** — what changes and why
2. **Implementation Plan** — ordered steps with file paths, line numbers, and exact changes
3. **IPC Contract** — new/changed/removed IPC channels and their payload shapes
4. **Component Changes** — exact UI changes for each component
5. **Data Migration** — SQL scripts for existing databases
6. **Verification Steps** — how to test each change in the running app
