# PROMPT: Student Schedule, Planning & Reminder System — Engineer a Solution

## Raw Request

"theres the problem with the calendar thing and like i need a replacement, and the part where yknow i mentioned that the goals and like something that we want to remind ourselves. like those features related to daily plans and like staying on track and make sure to not miss any schedule. i need the features (idk what it should be) to help me with those. i need you to generate a prompt that gives the context of what we already have currently on the app, what works what doesnt, and ask for the ai to engineer something that can help me with those stuff. for example schedules from certain campus app that is impossible to connect to agentically or systematically from the autonomously. whats the solution to those? and stuff like that."

## Problem Statement

The user is a student who needs to stay on track with schedules, deadlines, and daily goals. The current app has a calendar connector system (CalDAV) that works for standard calendar providers but CANNOT connect to school/campus apps (LMS platforms like Canvas, Google Classroom, Blackboard, etc.) because those platforms don't expose CalDAV/IMAP endpoints. The user needs a system that works WITHOUT external API connections — something they can quickly input schedules into and get reminded about.

### What already exists:
- **Calendar connector (CalDAV)** — works for Gmail/Outlook/Nextcloud but fragile regex parsing, 7-day window, no recurring events
- **Reminders** — basic CRUD (create/list/toggle/delete) but no notifications, no due-date sorting, no recurring
- **Daily goals (FocusBoard)** — toggle done/active, AI suggestions, evening review. But `focusSeconds` always 0, no goal creation UI
- **Long-term goals (PlanBoard)** — full CRUD, brain-dump AI parse, planning notes
- **Reflect timeline** — past days with goal completion history
- **AI chat** — can create reminders via `reminder_create` parsed card type

### What's broken/missing:
- School/LMS apps can't connect via CalDAV/IMAP — no agentical solution exists
- No quick schedule input (must go through full connector setup wizard)
- No desktop notifications for reminders
- No recurring events or reminders
- No calendar grid view (events only shown in a drawer)
- No weekly/monthly aggregation
- focusSeconds always 0
- No goal creation UI in FocusBoard

## Context Bundle

Read `CONTEXT_BUNDLE.md` in this directory for the complete source code references, DB schema, IPC endpoints, and file locations. The target AI must read this first.

## Engineering Task

Design a **Student Schedule & Planning System** that solves the core problem: "How do I stay on track with schedules, deadlines, and daily goals when my school's apps can't be connected automatically?"

### The Core Challenge

School campuses use proprietary LMS platforms (Canvas, Google Classroom, Blackboard, Moodle, etc.) that:
- Don't expose CalDAV/IMAP endpoints
- Have APIs but require OAuth/SSO that's impractical for a desktop app
- Change frequently (semester to semester)
- Have varying levels of API access

**The solution cannot rely on connecting to these platforms.** It must work with manual input that's fast and frictionless.

### Requirements

#### R1: Quick Schedule Input
Design a system where the user can rapidly input their weekly schedule:
- "Monday 9am-10:30am: Math 101 in Room 204"
- "Wednesday 2pm-3:30pm: Lab Session"
- The system should parse natural language time expressions
- Store as recurring weekly events (not one-shot)
- Show in a weekly grid/calendar view

#### R2: Deadline Tracker
Design a deadline tracking system that:
- Accepts deadlines via natural language ("Assignment due Friday 11:59pm")
- Shows countdown timers (days/hours/minutes until deadline)
- Groups deadlines by course/subject
- Sends desktop notifications when deadlines are approaching (1 day, 3 hours, 1 hour)
- Integrates with the existing reminder system

#### R3: Daily Planning Dashboard
Design a daily planning view that:
- Shows today's schedule (classes, labs, study sessions)
- Shows upcoming deadlines (next 7 days)
- Shows daily goals (from existing FocusBoard)
- Shows a "Plan my day" AI feature that suggests time blocks
- Shows completion progress

#### R4: Smart Reminders
Enhance the existing reminder system:
- Add desktop notifications (Electron Notification API)
- Add recurring reminders (daily, weekly, custom)
- Add due-date sorting
- Add "snooze" functionality (remind again in 15min, 1hr, tomorrow)
- Add reminder categories (class, assignment, exam, personal)

#### R5: Schedule Templates
Design pre-built schedule templates for common student patterns:
- "Full-time student" (M-F, 9am-4pm classes)
- "Part-time student" (2-3 days, variable times)
- "Exam week" (study blocks + break schedule)
- User can customize and save their own templates

## Design Task

Design the complete UI/UX for this system within the existing Canvas card framework:
- Weekly schedule grid card (7 columns × 24 rows or custom time slots)
- Deadline tracker card with countdown timers
- Daily planning card combining schedule + goals + deadlines
- Enhanced reminder system with notifications
- Schedule input modal/dialog with natural language parsing

Use existing DeskFlow design tokens (glass cards, rounded-xl, dark theme, Geist/JetBrains Mono fonts). Follow the existing card patterns (FocusCard, PlanCard, etc.).

## UX Task

- Schedule input must be FAST — under 10 seconds to add a class
- Deadline entry must support natural language ("due next Tuesday 11:59pm")
- Daily planning should be glanceable — see today's schedule in 2 seconds
- Notifications must be non-intrusive but impossible to miss
- Weekly view must be the default — show the full week at a glance

## Constraints

- Must work WITHOUT external API connections (no CalDAV, no OAuth)
- Must use existing DB schema (reminders table, goals table) or extend it
- Must use existing IPC patterns (preload.ts bridges, main.ts handlers)
- Must use existing Canvas card system (addCard, CanvasCard.tsx renderer)
- Must work on Windows (Electron desktop app)
- Must use Electron's Notification API for desktop notifications
- Must persist data in SQLite (existing database at %APPDATA%/RHEO/deskflow-data.db)

## What the Target AI Should Deliver

1. **DB Schema** — new tables or modifications needed (schedule_entries, deadline_tracker, etc.)
2. **IPC Handlers** — new endpoints needed in main.ts
3. **Frontend Components** — new canvas cards and UI components
4. **Natural Language Parser** — for schedule and deadline input
5. **Notification System** — desktop notification implementation
6. **Weekly Grid Component** — the main schedule visualization
7. **Daily Planning Dashboard** — combined view of schedule + goals + deadlines
