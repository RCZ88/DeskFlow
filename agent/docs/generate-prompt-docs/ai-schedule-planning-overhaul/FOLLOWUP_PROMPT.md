# PROMPT: Follow-Up — Clarifications for Schedule & Planning System

## Raw Request

The RESULT.md has 13 gaps that need clarification before implementation. Asking the target AI to address each one.

## Gaps to Address

### Gap 1: Deadlines vs Reminders integration
The RESULT creates a new `deadlines` table but the existing `reminders` table already has `text`, `due_date`, `goal_id`, `done`. How should these relate? Should deadlines auto-create reminders? Should reminders be enhanced to support deadlines? Or are they completely separate systems?

### Gap 2: Notification scheduling is incomplete
`checkReminders()` only checks for deadlines within 1 hour. The requirements say "1 day, 3 hours, 1 hour" notifications. How should multi-tier notification scheduling work? Should there be a `reminder_intervals` column? Or should the function check multiple time windows?

### Gap 3: No UI to invoke deadline parser
`parseDeadlineInput()` exists but there's no input field shown in the Deadline Tracker card. How does the user type "Assignment due Friday 11:59pm"? Is there a quick input bar like the schedule card has? Or a modal?

### Gap 4: Schedule quick input — is that the only way?
The Weekly Schedule Card has a text input in the header. But the spec says "10 seconds to add a class." Should clicking an empty time slot also open an input? Or is the text input the sole entry method?

### Gap 5: Daily Planner is read-only
It shows goals and deadlines but has no way to CREATE goals or deadlines from within the card. Should it have inline add buttons? Or should it only display data from other cards?

### Gap 6: No template selection UI
`schedule_templates` table and `apply-schedule-template` IPC exist, but there's no UI for the user to browse/select templates. Where does this happen? A button on the schedule card? A separate modal?

### Gap 7: No course/subject management
Deadlines have a `course` field ("Math 101") but there's no way to define or manage courses. Should there be a courses table? Or is `course` just a free-text label?

### Gap 8: Parser → DB → card data flow is not wired
The parser functions exist, the IPC endpoints exist, the cards exist — but there's no code showing how they connect. Who calls `parseScheduleInput`? Who calls `add-schedule-entry` IPC? Where is the data fetching for the cards?

### Gap 9: What happens to existing reminders?
There's already a `reminders` table with data. Should existing reminders be migrated to the new `deadlines` table? Or kept as a separate system? If separate, how do they coexist visually?

### Gap 10: Recurring reminders not implemented
The requirements ask for recurring reminders (daily, weekly, custom). The RESULT doesn't address this. Should the `reminders` table get a `recurrence` column? Or should recurring reminders be a separate feature?

### Gap 11: `parseNaturalDate` is incomplete
The function says "This is a simplified version — expand with a real date parser." What should be used? `date-fns` is already in the project. Should it use `date-fns/parse`? Or a custom parser?

### Gap 12: No snooze functionality
Requirements ask for "snooze (remind again in 15min, 1hr, tomorrow)." Not implemented. Should snooze modify the `due_date`? Or add a `snoozed_until` column?

### Gap 13: How do schedule entries appear on the canvas?
The WeeklyScheduleCard renders entries as absolutely-positioned blocks. But the card data (`entries`) is passed as a prop. Who fetches the data and passes it? The card needs to be self-contained — it should fetch its own data via IPC on mount.

## Instructions

For each gap, provide:
1. The decision (what to do)
2. The exact code change needed (file, line, what to add/modify)
3. Any new IPC endpoints or DB columns required

Keep answers concise — code snippets, not essays.
