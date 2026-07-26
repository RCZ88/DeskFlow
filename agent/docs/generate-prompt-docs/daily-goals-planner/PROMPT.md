# Daily Goals Planner — Unified Planning System

## Raw Request

> "how about the feature where we can like collaborate with the focus feature where theres like a set up like daily goals of like stuff we need to reach. for example, we can plan so that every day we should do 3 hours of project, 1 hour of learning, and 30 minutes of piano practice for example. meaning that its integrating a bunch of feature such as the external activity feature, and like, integrating the focus feature where switching to the apps that is not related caused it to fail or break or stop to later on needing to be continued and stuff. so like basically the ai needs to be able to be dynamic and handle a lot of cases. but if its outside of the existing tools that we have on the app, it should NOT accept the request. the security policy and everything needs to be also upgraded."

## Context

Read CONTEXT_BUNDLE.md first — it contains all existing IPC endpoints, DB schemas, service classes, and data structures. The target AI must use ONLY existing infrastructure. No new DB tables, no new IPC channels that don't exist, no new services. Build exclusively on what's already there.

## Security Requirements (from max-security skill)

Before designing any feature, apply this checklist:

### SQL Injection Prevention
- All SQL uses parameterized queries (`?` placeholders) — no string concatenation
- Goal titles/descriptions from user input must NOT be interpolated into SQL

### XSS Prevention
- Goal titles rendered in UI must use React's default escaping (no `dangerouslySetInnerHTML`)
- AI-generated goal suggestions must be schema-validated before rendering
- Sanitize any external content (AI responses, schedule imports) before display

### Input Validation
- Goal `target_seconds` must be positive integer, max 86400 (24 hours)
- Goal `category` must be one of: 'work', 'personal', 'health', 'learning'
- Goal `status` must be one of: 'pending', 'active', 'completed', 'overdue', 'slipped', 'dismissed', 'suggested'
- Goal `date` must be valid ISO date string
- Rate limit AI suggestion endpoints: max 10 requests per hour per user

### Data Exposure
- Goal data never includes secrets, keys, or PII beyond title/description
- Error messages don't leak DB schema or query details

### Configuration
- No hardcoded API keys in goal-related code
- AI provider calls use environment variables only

## Engineering Requirements

### Feature 1: Real-Time Goal Progress Tracking
**Goal:** When a goal has `target_type: 'time'` and `match_category`, automatically track progress from session data.

**Implementation:**
1. Create a new IPC channel `get-daily-goal-progress` that:
   - Takes `{ date: string, goals: Goal[] }`
   - For each time-based goal, queries `logs` table for sessions matching `goal.match_category` on that date
   - Returns `{ goalId: string, progressSeconds: number, targetSeconds: number, percentComplete: number }[]`
2. The DailyPlannerCard polls this every 30 seconds when visible
3. Progress bar shows green when >= 100%, yellow when >= 50%, red when < 25%

**Existing IPC to use:**
- `get-logs-by-period` — get sessions for a date range
- `get-daily-productivity` — get productivity breakdown
- `get-goals` — get goals for a date

### Feature 2: Focus-Goal Integration
**Goal:** When a focus session is active, goal progress updates in real-time. When focus breaks, goal pauses.

**Implementation:**
1. Listen to `focus:state` event (main→renderer push)
2. When focus is active and user is in a productive app matching a goal's `match_category`, increment that goal's `progress_seconds` in localStorage
3. When focus breaks (overlay shown), stop incrementing
4. When focus resumes (user returns), resume incrementing
5. On focus session end, persist accumulated progress to DB via `save-goal`

**Edge cases:**
- Multiple goals match the same app category → split time proportionally or assign to highest-priority goal
- Focus session ends without completion → save partial progress, mark goal as 'active' (not 'completed')
- User has no active goals → focus session works normally, no goal tracking

### Feature 3: Smart Goal Suggestions
**Goal:** AI suggests daily goals based on schedule, past productivity, and approaching deadlines.

**Implementation:**
1. Use existing `suggest-goals` IPC (already calls AI provider)
2. Enhance `get-goal-context` to include:
   - Today's schedule entries (free time blocks)
   - Upcoming deadlines (next 7 days)
   - Past 7-day productivity patterns per category
   - Current focus session status
3. The AI prompt should:
   - Fill free time blocks with appropriate goals
   - Prioritize deadlines approaching within 3 days
   - Balance categories based on past patterns
   - Respect user's stated preferences (if any)

**Edge cases:**
- No schedule → suggest based on past patterns only
- No past data → suggest generic balanced goals
- All time blocked → suggest smaller micro-goals
- AI provider unavailable → fall back to template-based suggestions

### Feature 4: Daily Timeline View
**Goal:** Visual timeline showing schedule blocks + goal progress overlay.

**Implementation:**
1. In DailyPlannerCard, render a 24-hour timeline (6am-12am)
2. Schedule entries shown as colored blocks (existing colors from DB)
3. Goal progress shown as a thin progress bar below each schedule block
4. Current time indicator (vertical line)
5. Gaps between schedule blocks show "available for goals" in faint text

**Data sources:**
- `get-schedule` for schedule entries
- `get-daily-goal-progress` for goal progress
- `onForegroundChange` for current time indicator

### Feature 5: End-of-Day Review
**Goal:** AI-generated summary of goals accomplished vs planned.

**Implementation:**
1. Use existing `review-goals` IPC (already calls AI provider)
2. Enhance the review prompt to include:
   - Which goals were completed, partially completed, or missed
   - Total productive time vs planned time
   - Which apps/categories dominated the day
   - Suggestions for tomorrow
3. Store review in `goal_reviews` table (already exists)
4. Show review in DailyPlannerCard as a collapsible section

### Feature 6: Goal-Deadline Linking
**Goal:** Auto-create goals when deadlines approach.

**Implementation:**
1. When a deadline is within 3 days, auto-suggest a goal:
   - Title: "Prepare for: {deadline.title}"
   - Category: 'learning' or 'work'
   - Target: 'completion'
   - Links: `[{ label: deadline.title, url: null }]`
2. Use existing `save-goal` IPC
3. User can dismiss auto-suggested goals (status → 'dismissed')

**Edge cases:**
- Goal already exists for this deadline → don't duplicate
- Deadline is past → skip
- User has 5+ pending goals → don't auto-suggest more

## Design Specifications

### DailyPlannerCard Enhancement
```
Layout: Vertical stack
- Header: "Daily Planner" + date selector + settings gear
- Timeline: 24-hour grid (6am-12am), 40px per hour
  - Schedule blocks: colored rectangles with title
  - Goal progress: thin bar below schedule block
  - Current time: vertical cyan line
- Goal List: Below timeline
  - Each goal: checkbox + title + progress bar + time elapsed
  - Categories: color-coded dots (work=blue, personal=green, health=red, learning=purple)
- AI Suggestions: "Suggest Goals" button → calls suggest-goals
- Review: Collapsible section at bottom
```

### Colors
```
Goal categories:
  work: #22d3ee (cyan)
  personal: #4ade80 (green)
  health: #f87171 (red)
  learning: #a78bfa (purple)

Progress bar:
  >= 100%: #4ade80 (green)
  >= 50%: #fbbf24 (yellow)
  >= 25%: #fb923c (orange)
  < 25%: #f87171 (red)

Timeline:
  available: rgba(63, 63, 70, 0.15)
  schedule: var(--dk-accent) at 0.3 opacity
  current-time: var(--dk-accent) solid 2px
```

### Animation
- Progress bar fills with 400ms ease-out transition
- Goal completion: brief green flash + checkmark animation
- AI suggestion loading: skeleton shimmer

## Constraints
- Use ONLY existing IPC channels and DB tables
- No new npm dependencies
- All SQL parameterized
- All user input sanitized
- Dark mode only, use --dk-* tokens
- Must work offline (graceful degradation when AI unavailable)
