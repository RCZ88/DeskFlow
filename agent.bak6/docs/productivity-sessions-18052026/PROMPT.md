# 📝 Design Prompt: Productivity Sessions — Best Time, History & Ranking

## Raw Request
> "Why is it that in the dashboard it shows the current product of time? It should show that the longest product of the key time of that to this day... Why is it still counting the time and why is it that every time it's which app it resets my count to zero... Why is there a productivity timer? It should be that it's a longer productivity or like productivity to beat this day, like productivity to beat this week and also the productivity needs to have like a history or like a session, a list session sessions of productivity and we should be able to view which like the best productivity according to the timeline. So what is the longest focus time, longest streak of productivity? And we need to make sure that it's implemented and like we can show like a list of sessions, the latest few sessions and we can view the past sessions. It should be that there's sort of like a filter and the threshold of the minimum amount of time of locking in with it, show on the top ranking thing that should be up to certain thresholds so that it can actually be shown there. If not then all things all of the lock in, the productivity time will be inserted which is not yet. We should do that only if you have them are including those tables. So I need to use a generic prompt design, use the front end design skill to do this design and like how you design charts and what are the charts that you include and stuff like that."

## Problem Statement

The dashboard currently shows a "live" productivity timer that RESETS to zero every time the user switches away from a productive app (e.g., opens File Explorer). This is the core UX bug. The user wants:

1. **Best Time to Beat** — not a running timer, but a comparison against personal bests for today/this week/all time
2. **Productivity Sessions** — tracked automatically when user is in productive apps, with history and filtering
3. **Session Ranking** — list of past productive sessions with timestamps, duration, and context
4. **Threshold filter** — only show sessions above a minimum duration (e.g., >5 min), not every brief productive moment
5. **Personal Best tracking** — longest focus time, longest streak (consecutive productive time), best day/week

**The timer behavior must change:** When productive work is interrupted (neutral/distracting app), the timer should PAUSE not RESET. When productive work resumes, it should continue accumulating.

## Engineering Task
**Data Processing Pipeline:**

1. **Session Detection:** A productive session starts when the app/website tier = 'productive' and ends when tier changes away. Sessions are only recorded if they exceed a minimum threshold (e.g., 5 minutes — configurable).

2. **Session Storage:** Store productive sessions in a new DB table `productivity_sessions` with:
   - `id` (auto-increment), `started_at`, `ended_at`, `duration_seconds`
   - `app_name`, `category`, `tier` (always 'productive')
   - `is_streak` (boolean — did this extend a previous session without break?)
   - `day` (0-6), `week_number`, `month`

3. **Best Time Computation:**
   - **Today best:** Max `duration_seconds` from sessions where `date(started_at) = today`
   - **Week best:** Max single session + cumulative daily total for this week
   - **All-time best:** Max session duration ever recorded
   - **Streak record:** Longest consecutive productive time (where consecutive sessions have gap < threshold)

4. **Session List:** Query sessions ordered by `ended_at DESC`, with:
   - Filter by period (today/week/month/all)
   - Filter by minimum duration (slider: 1min to 60min)
   - Pagination (show last 20, load more)

5. **IPC Handler:** `get-productivity-sessions` with params: `period`, `minDuration`, `limit`, `offset`

## High-Fidelity Visual Specs

**Design Direction:** A "Focus Leaderboard" aesthetic — clean, competitive, with subtle gamification. Not generic dashboard, but a personal achievement tracker. Think: personal stats card for a sport, or a fitness app's weekly review.

**Key Changes to Dashboard:**
- **Remove the live timer** from the main stopwatch display (or move it to the side as secondary)
- **Primary display:** "Best Time Today: Xh Ym" with a comparison to personal best
- **Progress ring:** Shows today's total productive time vs goal (e.g., 8h goal)
- **"Best to Beat" badges:** "Day: X.Xh | Week: Y.Yh | PB: Z.Zh"

**Productivity Sessions Panel:**
- Expandable section below the main stats showing session history
- Each session: time range, duration, app/activity, streak indicator
- Visual hierarchy: best sessions highlighted with gold/silver/bronze accents
- Filter bar: period selector + minimum duration slider
- Empty state: "No productive sessions yet. Get to work!"

**Charts to include:**
1. **Daily accumulation bar chart** — shows daily total productive time across the period (today/week/month)
2. **Session duration distribution** — small histogram of session lengths
3. **Streak visualization** — shows longest productive streak as a highlighted bar

**Layout:**
- Top: Best time to beat (today/week/personal best) in bold cards
- Middle: Today's progress ring + total accumulated today
- Bottom: Sessions list with filters

**Color palette:** Emerald for productive (primary), amber for achievements/best times, zinc for neutral/background

## Interaction Flow
- When user starts productive work → session timer starts (accumulated, not reset)
- When user leaves productive app → session pauses (not reset)
- Session ends when user goes >threshold time (e.g., 10 min) without productive app
- Sessions auto-save to DB with start/end/app info
- "Productivity Sessions" section shows history with date filtering
- Minimum duration filter hides short/brief sessions from the list
- Tapping a session shows detail: apps used, time range, streak length

## Constraints
- Must persist sessions across restarts (DB storage)
- Threshold setting should be configurable (Settings page)
- Must integrate with existing `productiveTimeMs` tracking but with new session-based logic
- Build must pass
- Keep existing weekly productivity chart intact