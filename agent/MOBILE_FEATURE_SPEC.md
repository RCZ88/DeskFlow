# DeskFlow Mobile — Feature Specification for Mobile App Development

> **Purpose:** This document is the complete feature specification for the mobile version of DeskFlow. It covers every feature that must be implemented, including data models, user interactions, and behavioral rules. The mobile AI agent should treat this as the source of truth.

---

## Table of Contents

1. [App Architecture & Navigation](#1-app-architecture--navigation)
2. [Dashboard](#2-dashboard)
3. [AI Assistant](#3-ai-assistant)
4. [Resume Builder](#4-resume-builder)
5. [Focus / Deep Focus Sessions](#5-focus--deep-focus-sessions)
6. [Activity Tracking](#6-activity-tracking)
7. [Finance Module](#7-finance-module)
8. [Life Page (Covenant + Memories)](#8-life-page-covenant--memories)
9. [External Activities (Sleep, Exercise, etc.)](#9-external-activities-sleep-exercise-etc)
10. [Insights & Analytics](#10-insights--analytics)
11. [Settings & Configuration](#11-settings--configuration)
12. [Shared Patterns & Design Tokens](#12-shared-patterns--design-tokens)

---

## 1. App Architecture & Navigation

### 1.1 Navigation Structure

The app uses a **bottom tab bar** (mobile-native pattern) with these top-level sections:

| Tab | Icon | Route | Description |
|-----|------|-------|-------------|
| Home | Home | `/` | Dashboard with timer, summary, schedule, activity feed |
| Track | Activity | `/activity` | App/website usage, productivity, focus sessions |
| AI | Brain | `/ai` | AI chat, goals, schedule, daily planner |
| Finance | Wallet | `/finance` | Wallets, transactions, subscriptions, crypto |
| More | Settings | `/more` | Settings, Resume, Life, Insights, Database, Guide |

The "More" tab opens a list/menu screen with access to secondary pages:
- Resume Builder (`/resume`)
- Life Page (`/life`) — Covenant habits + Memories
- Insights (`/insights`)
- Settings (`/settings`)
- Database Viewer (`/database`)
- Guide / Help (`/guide`)

### 1.2 Data Layer

- **Local SQLite database** via `react-native-sqlite-storage` (or equivalent)
- **JSON file storage** for resume data and settings
- **localStorage/AsyncStorage** for UI state (preview mode, zoom, etc.)
- All IPC endpoints from the desktop version become **local service calls** (same DB, same logic, no Electron IPC needed)

### 1.3 Authentication

- Finance module has its own **password lock screen** with optional biometric (fingerprint/face) unlock
- App-level lock (optional) — PIN or biometric

---

## 2. Dashboard

### 2.1 Overview

The Dashboard is the home screen. It shows a vertical scroll of widgets summarizing the user's day.

### 2.2 Widgets (Top to Bottom)

#### 2.2.1 StopwatchTimer (Hero Section)
- **What:** Large HH:MM:SS timer display showing productive time accumulated today
- **Color coding:**
  - Green = productive app/website active
  - Red = distracting app/website active
  - Blue = idle / no tracking
  - Purple = external activity (exercise, sleep, etc.)
- **Border animation** when active (animated gradient border)
- **Status label:** "Locked In" (productive), "Distracting", "Paused", "Idle"
- **Current app/website name** displayed below timer
- **Behavior:** Counts up when productive apps are in foreground. Pauses or resets based on user's `timerBehavior` settings when switching to neutral/distracting apps.

#### 2.2.2 StatusBand
- Current display time breakdown (productive/external/distracting)
- Current app name
- Total focused time

#### 2.2.3 PinnedActivities
- Horizontal scrollable row of external activity quick-start buttons
- Each activity: icon chip with name, tap to start/stop stopwatch
- Default activities: Study, Exercise, Gym, Reading, Sleep, Eating
- Long-press to see activity detail

#### 2.2.4 ScheduleCard
- Shows today's schedule blocks
- **Current block:** highlighted with accent border, pulse dot, "Now" badge
- **Upcoming blocks:** next 3-4 blocks with "in Xm" countdown
- Shows location if set
- Empty state: "Nothing scheduled for today"
- Tap to navigate to full schedule view

#### 2.2.5 InsightStrip
- Horizontal scrollable row of AI-generated insight cards
- Each card has a domain-specific accent color (focus = pink, finance = green, etc.)
- Shows 1-3 cards max
- Tap to expand or navigate to Insights page

#### 2.2.6 TierBreakdownStrip
- 4-column row: Productive hours | Neutral hours | Distracting hours | Total hours
- Animated number counters
- Color-coded: green (productive), gray (neutral), red (distracting)

#### 2.2.7 Productivity Chart
- Stacked bar chart showing Productive / Neutral / Distracting per day
- Period toggle: Day / Week / Month
- Uses `getDashboardAggregates` data

#### 2.2.8 SleepBarMini
- 7-day horizontal bar showing sleep duration per day
- Average sleep indicator
- Sleep debt calculation: `(8 - avgSleepHours) * days`

#### 2.2.9 Recent Sessions (Activity Feed)
- Last 10 app/website sessions with live timers
- Each item shows: app icon, name, category badge, tier badge (productive/neutral/distracting), elapsed time
- Active sessions have green pulsing dot and live HH:MM:SS timer
- Completed sessions show "Xm ago" (time since finished)
- Tap to see session detail

#### 2.2.10 Heatmap Modal
- 7-day x 24-hour grid
- Color intensity based on usage seconds
- Three modes: device (app tracking), external (manual activities), combined
- Tap a cell to see day detail popup

### 2.3 Dashboard Data

All data comes from a single aggregation function that returns:
```json
{
  "overview": {
    "totalSeconds": 0,
    "productiveSeconds": 0,
    "neutralSeconds": 0,
    "distractingSeconds": 0
  },
  "weeklyHeatmap": [...],
  "hourlyHeatmap": {...},
  "appStats": [...],
  "websiteStats": [...],
  "recentSessions": [...]
}
```

### 2.4 Timer Behavior Settings

```json
{
  "neutralAction": "pause" | "reset" | "ignore",
  "distractingAction": "pause" | "reset" | "ignore"
}
```
- **pause**: Timer stops counting but doesn't lose accumulated time
- **reset**: Timer resets to 0
- **ignore**: Timer continues regardless of app tier

---

## 3. AI Assistant

### 3.1 Overview

A full AI-powered personal assistant with chat, goal tracking, schedule management, daily planning, and an optional infinite canvas mode. Route: `/ai`

### 3.2 Two View Modes

#### Deck Mode (Default)
A vertically scrolling dashboard of expandable cards. Each card has:
- Accent color strip on the left edge
- Icon + title + summary text
- Expand/collapse toggle
- Action buttons within expanded view

Cards in the deck:
1. **Focus** (emerald accent) — daily goals, suggestions, metrics
2. **Plan** (violet accent) — long-term goals and planning notes
3. **Reflect** (amber accent) — historical goal completion timeline
4. **Connectors** (cyan accent) — email/calendar connector management
5. **Daily Planner** — daily goals, schedule, deadline integration
6. **Weekly Schedule** — 7-day calendar grid
7. **Deadlines** — upcoming deadline tracker
8. **Research Digest** (cyan accent) — AI-generated topic digest
9. **Chat Panel** — the AI chat interface

#### Canvas Mode (Optional, advanced)
- Free-form infinite canvas where cards are placed as draggable, resizable tiles
- Cards auto-dismiss after 30 seconds if not pinned
- Canvas state persisted to local storage

### 3.3 AI Chat Interface

#### Features
- **Streaming LLM responses** — real-time token delivery (show typing indicator on mobile)
- **Thread management** — save/load/delete/rename chat threads by date
- **Voice input** — device microphone with silence detection
- **Slash commands:** `/unread`, `/inbox`, `/calendar`, `/today`, `/sync`, `/email`, `/plan`, `/digest`, `/reflect`, `/focus`
- **Memory system** — memories extracted from conversations, injected into future system prompts
- **Structured output parsing** — AI responses can contain typed blocks that render as goal suggestions, plan updates, stats summaries, action lists, digest items, charts, forms
- **Chat history** — browse past threads, load, delete, rename
- **Suggestions** — time-of-day-aware prompts (morning plan, afternoon focus, evening review)

#### System Prompt (Context Bundle)
The AI receives a system prompt built from live user data:
- Today's goals and long-term goals
- 7-day goal trends
- App usage aggregates (dashboard stats)
- AI usage today
- Active projects
- Planning notes
- Active connectors (email previews, calendar events)
- Finance summary (wallets, subscriptions)
- Current focus state

**Token budget:** ~6000 chars max, truncated with warning

### 3.4 Goals System (Focus Board)

#### Daily Goals
- Per-date goal tracking with categories
- **Categories:** work, personal, health, learning, finance, relationships
- **Goal types:**
  - Time-based: track progress seconds toward a target duration
  - Completion-based: done/not done toggle
- **AI goal suggestions** — context-aware generation using schedule + deadlines
- **Goal acceptance** — accept/dismiss AI suggestions
- **Evening review** — text area for end-of-day review summary
- **Mode detection** — automatically determines mode (morning/in-progress/review) based on time of day and goal completion

#### Long-term Goals (Plan Board)
- Persistent goals across days (not date-bound)
- Full CRUD with modals
- **Priority levels:** P1-P5
- **Categories:** work, personal, health, learning, finance, relationships
- **AI brain-dump parsing** — paste freeform text, AI extracts structured goals
- **Planning notes** — markdown editor with auto-save

### 3.5 Weekly Schedule

- 7-day grid view of the current week
- Schedule blocks per day with category color coding
- **Block types:** class, lab, study, exam, work, personal, health, learning
- Add entry form: title, time range, category
- Delete entries per block
- Week navigation with offset

### 3.6 Deadline Tracker

- Upcoming deadlines sorted by priority then date
- **Priority levels:** high, medium, low
- Goal linking — shows which goals are linked to each deadline
- Create goal from deadline — one-click goal creation

### 3.7 Research Digest (Daily Digest)

- AI-generated topic digest from configured interest topics
- News-style cards: headline, summary, source, confidence score, tags, mentions, stats with trend indicators
- Generate/refresh button
- Separate AI provider slot for digest generation

### 3.8 Reflect Feed

- Vertical timeline of past days
- Completion ring per day (done/total goals)
- Filter tabs: All, Reviewed, Productive
- Load older days progressively

### 3.9 Connectors (Email/Calendar)

#### Email Connectors (IMAP)
- List, search, sync, mark read, reply, delete
- Status indicators: ready/error/idle, item count

#### Calendar Connectors (CalDAV)
- List, sync, create/update/delete events
- Auto-sync every 30 minutes

#### Connector Setup
- Add new email/calendar connectors via modal
- Provider configuration (server, port, auth)

### 3.10 Reminders

- Create reminders with due date and optional goal link
- Toggle done/undone
- Delete reminders
- Displayed in Goals & Reminders Drawer

### 3.11 Voice Input

- Device microphone via Web Speech API (or native equivalent)
- Silence detection with configurable timeout (default 5 seconds)
- Interim transcript display
- Auto-send on final transcript

### 3.12 Toast Notifications

- Transient notifications (success/error/info)
- Auto-dismiss after 4 seconds
- Stack multiple toasts

### 3.13 Data Types

```typescript
// Goal
{
  id: string;
  title: string;
  description?: string;
  category: "work" | "personal" | "health" | "learning" | "finance" | "relationships";
  target: { type: "time" | "completion"; seconds?: number };
  period: string; // date string for daily, "longterm" for persistent
  status: "active" | "done" | "missed";
  date: string;
  source: string;
  progressSeconds?: number;
  createdAt: string;
  completedAt?: string;
}

// LongTermGoal
{
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  status: "active" | "done" | "missed";
  target_seconds?: number;
  priority: number; // 1-5
}

// ChatMsg
{
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  parsed?: ParsedMessage;
}

// ScheduleEntry
{
  id: string;
  title: string;
  location?: string;
  day_of_week: number; // 0-6
  start_time: string; // "HH:MM"
  end_time: string;
  category: string;
  color: string;
  is_recurring: boolean;
}

// Deadline
{
  id: string;
  title: string;
  course?: string;
  due_date: string;
  priority: "high" | "medium" | "low";
}

// Reminder
{
  id: string;
  text: string;
  due_date: string;
  done: boolean;
  goal_id?: string;
}

// Connector
{
  id: string;
  type: "email" | "calendar";
  provider: "imap" | "caldav";
  displayName: string;
  config: object;
  status: "connected" | "error" | "disconnected";
  lastSync?: string;
}

// TopicDigestItem
{
  topic: string;
  headline?: string;
  summary: string;
  confidence?: number;
  source?: { name: string; url: string; authority: string };
  stats?: { label: string; value: string | number; change?: number; trend?: string };
  tags?: string[];
  mentions?: number;
}

// MemoryEntry
{
  id: string;
  content: string;
  category: string;
  tier: "hot" | "warm" | "cold";
  importance: number;
  accessCount: number;
  dedupKey: string;
  decayRate: number;
}
```

### 3.14 Database Tables

| Table | Purpose |
|-------|---------|
| `ai_chat_threads` | Chat thread metadata |
| `ai_chat_messages` | Chat messages per thread |
| `ai_chat_memories` | Extracted memories from conversations |
| `agent_memories` | Deep memory store with tiers |
| `ai_goals` | Daily goals with date, category, status |
| `ai_longterm_goals` | Persistent long-term goals |
| `ai_goal_reviews` | Evening review summaries |
| `ai_schedule` | Weekly schedule entries |
| `ai_deadlines` | Deadline tracking |
| `ai_reminders` | User reminders |
| `ai_digest_topics` | Interest topics for digest |
| `ai_digest_cache` | Cached digest results |
| `ai_connectors` | Email/calendar connector configs |
| `ai_connector_items` | Synced email/calendar items |

---

## 4. Resume Builder

### 4.1 Overview

An AI-coached, interview-style resume building experience with 7 progressive phases, import options, live preview, version control, and export. Route: `/resume`

### 4.2 Pages

| Route | Purpose |
|-------|---------|
| `/resume` | Hub — overview, quick actions, score, recent versions |
| `/resume/build` | Interactive 7-phase questionnaire with live preview |
| `/resume/import` | Import from chat transcripts, documents, certifications |
| `/resume/preview` | Full-screen resume preview with zoom |
| `/resume/export` | Version management, export settings, improvement reports |

### 4.3 Resume Hub

- **Hero section** with "Career Forge" headline and CTA buttons (Start/Continue Building, Import)
- **CareerTapestry** — 7-node horizontal progress visualization (each node = a phase, clickable)
- **Identity Card** — user's name, target role, career level
- **ScoreGauge** — animated circular progress (0-100)
- **Quick Actions** — Import, Build, Preview, Export cards
- **Stats** — Versions count, Imports count, Confirmed takeaways, Score
- **Recent Versions** grid (up to 6) — version name, target role, score

### 4.4 Builder (7-Phase Questionnaire)

**Layout:** Split panel (on tablet) or stacked (on phone):
- Top: Question card + answer input
- Bottom/Right: Live resume preview

#### The 7 Phases

| Phase | Name | Questions | Focus |
|-------|------|-----------|-------|
| 1 | Foundation | 4 | Role, domain, target, headline |
| 2 | Experience Archaeology | 7 | Most expensive problem, challenge, action, outcome, tech, collaboration, impact |
| 3 | Project Excavation | 6 | Problem solved, contribution, technical decisions, outcome, links |
| 4 | Skills Inventory | 6 | Languages, frameworks, infrastructure, databases, AI tools, proficiency |
| 5 | Impact Quantification | 4 | Metric defensibility, documentation, impressiveness, specificity |
| 6 | Objective Audit | 4 | Reality check, impressiveness, exaggeration, manager confirmation |
| 7 | Final Assembly | 6 | Summary draft, experience ordering, project curation, skills, education, ATS check |

#### Builder UX Flow
1. User sees question with phase name, question number, "Why It Matters" explanation
2. User types answer (text, textarea, tags, or metric input)
3. Optional: voice input via microphone button
4. Submit answer → AI feedback appears (quality rating: strong/good/needs_work/weak, comment, suggestion, bullet draft)
5. Bullet draft can be copied to clipboard
6. Auto-advance to next question
7. Live preview updates in real-time
8. Phases are sequential — must complete prior phases to unlock later ones
9. Can revisit previous answers via history panel

#### Input Types
- **text** — single-line, auto-resizing textarea
- **textarea** — multi-line, Ctrl+Enter to submit
- **tags** — chip/tag input, comma/Enter to add, Backspace to remove
- **metric** — text input with metric type badges (%, number, time, currency)

#### AI Feedback
- Quality scale: `strong` | `good` | `needs_work` | `weak`
- Comment explaining what's good/bad
- Suggestion for improvement
- Suggested bullet draft (XYZ format)
- Auto-dismisses after 8 seconds unless pinned

### 4.5 Import

#### Tab 1: Chat Compilations
- Paste ChatGPT/Claude/Cursor conversation transcripts
- Select source (chatgpt, claude, cursor, manual)
- Extract takeaways — up to 5 significant lines (>20 chars) become takeaway objects
- View past compilations with status (processing/completed/failed)

#### Tab 2: Documents
- Drag-and-drop or click-to-upload
- Accepts: .pdf, .doc, .docx, .txt, .md, .png, .jpg
- Shows upload status, file size, takeaway count

#### Tab 3: Certifications
- Add manually or scan via phone camera (QR code pairing)
- Certification fields: name, issuer, earned/expiry dates, credential ID, verification URL
- Status: pending → extracted → confirmed → added

#### Tab 4: Takeaways
- Filter: all, pending, confirmed, rejected
- Each takeaway card shows: type badge (Project/Skill/Problem Solved/Optimization/Architecture/Certification/Credential), confidence badge, source, title, context, tech stack, XYZ bullet draft
- Actions: Confirm, Reject, Use in Resume

### 4.6 Preview

- Full-screen resume rendering
- **Styled mode:** Professional single-column layout, ATS-safe (Arial 10.5pt, white background)
- **ATS Raw mode:** Plain text rendering (what an ATS parser sees)
- Zoom controls (25-100%), fit-to-width button
- Ctrl+scroll for zoom

### 4.7 Export

#### Versions Tab
- Saved versions list with name, target role, score, date
- Save current content as new version
- PDF export, Markdown export, JSON export

#### Reports Tab
- Score overview (overall, sections complete, ATS score)
- Keyword analysis (match rate, matched keywords, missing keywords)
- Improvement suggestions

### 4.8 Resume Content Structure

```typescript
{
  profile: {
    fullName: string;
    email: string;
    phone: string;
    linkedinUrl: string;
    githubUrl: string;
    portfolioUrl: string;
    location: string;
    targetRole: string;
    careerLevel: string;
    professionalSummary: string;
  };
  summary: string;
  experience: [{
    company: string;
    roleTitle: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    bullets: [{ text: string; metrics?: string; xyzCompliant?: boolean }];
    sortOrder: number;
  }];
  projects: [{
    projectName: string;
    description: string;
    techStack: string[];
    bullets: string[];
    link?: string;
    sortOrder: number;
  }];
  skills: [{
    category: "languages" | "frameworks" | "infrastructure" | "databases" | "ai_tools" | "practices";
    items: string[];
  }];
  education: [{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    graduationDate: string;
    gpa?: string;
    sortOrder: number;
  }];
}
```

### 4.9 Data Storage

- **JSON file** at app's document directory: `resume-data.json`
- Structure: `{ profile, takeaways, chatCompilations, certScans, documents, versions, reports, progress }`
- Frontend uses Zustand store with persist middleware for UI state (preview mode, zoom)

### 4.10 Scoring

- Score = `min(30 + overallPercent, 95)` where overallPercent is based on phase progress
- Previous score tracked for delta display
- Breakdown: `{ experience, metrics, technicalDepth }`

---

## 5. Focus / Deep Focus Sessions

### 5.1 Overview

A Pomodoro-like session manager that monitors foreground apps. When a distraction is detected, a full-screen overlay prompts the user to return to productive work.

### 5.2 Session Modes

| Mode | Duration | Behavior |
|------|----------|----------|
| **Timer** | User-selected (5/10/15/25/50/90 min) | Countdown; auto-completes at 0 |
| **Challenge** | Unlimited (counts up) | User must end manually |

### 5.3 Strictness Levels

| Level | Behavior |
|-------|----------|
| **Block distracting** | Only distracting-tier apps trigger overlay |
| **Only productive** | Only productive-tier apps allowed; neutral AND distracting trigger overlay |

### 5.4 Session Lifecycle

```
IDLE → START → ACTIVE → (END | COMPLETE | FAIL)
```

- **START:** Creates DB row, sets countdown timer, pushes state to UI
- **ACTIVE:** Monitors foreground app changes
- **COMPLETE:** Timer auto-fires (timer mode only)
- **END:** User clicks "End session" (outcome = aborted)
- **FAIL:** User clicks "Break focus" on overlay (outcome = failed, records what broke focus)

### 5.5 Distraction Overlay

When a disallowed app is detected:
1. Full-screen overlay appears with: "Opening **[app name]** will break your focus."
2. Two buttons: "Back to focus" (returns to productive app) / "Break focus & continue"
3. Escape key returns to focus

**Mobile adaptation:** Instead of a separate window, show a full-screen modal/overlay within the app. If the user switches to a disallowed app (detected via accessibility services or app usage stats), show a notification prompting them to return.

### 5.6 Confetti Celebration

When a session completes successfully, fire confetti animation from the session card's position. Track seen completions in localStorage to prevent repeats.

### 5.7 Focus Goals

- During active focus sessions, track time-based goals
- Match goals by `allowed_categories` from the session
- Tick accumulated seconds every second
- Persist progress when session ends

### 5.8 Focus Stats & Analytics

- **Today:** focus minutes, session count, completion rate
- **Streak:** consecutive days with at least one completed session
- **Best session:** longest completed session
- **Weekly trend:** 7-day bar chart of focus minutes
- **Best focus hour:** hour with most total focus time
- **Average session length**
- **Leaderboard:** top 5 sessions ranked by duration (today/week/all)
- **Distraction log:** grouped list of distractions during sessions

### 5.9 Data Types

```typescript
// FocusState
{
  active: boolean;
  endsAt: number | null;     // timestamp (null for stopwatch)
  remainingSec: number;      // 0 for stopwatch
  strictness: "distracting" | "non_allowed";
  paused: boolean;
}

// FocusHistoryRow
{
  id: number;
  started_at: string;
  ended_at: string | null;
  planned_sec: number;
  actual_sec: number | null;
  outcome: "active" | "completed" | "failed" | "aborted";
  strictness: "distracting" | "non_allowed";
  broke_on_type: string | null;  // "app" | "website"
  broke_on_name: string | null;
  return_count: number;
}
```

### 5.10 Database Tables

| Table | Columns |
|-------|---------|
| `deep_focus_sessions` | id, started_at, ended_at, planned_sec, actual_sec, outcome, strictness, broke_on_type, broke_on_name, return_count, allowed_json |
| `deep_focus_events` | id, session_id, ts, kind (distraction_shown/returned/completed/aborted/broke), target_type, target_name |

---

## 6. Activity Tracking

### 6.1 Overview

The core tracking engine monitors foreground apps and browser activity, logs usage time, and categorizes apps/websites into productivity tiers.

### 6.2 Foreground Detection

- Polls every ~2 seconds (on desktop; on mobile, use OS-level app usage stats)
- Detects: app name, window title, category, tier
- Fires events on change

### 6.3 Browser Extension Tracking

- When user is in the "tracking browser," the extension sends website data
- Detects: domain, title, URL, category
- Website categories map to app categories

### 6.4 Tier Assignment System

Categories map to productivity tiers (user-customizable):

| Tier | Default Categories |
|------|-------------------|
| **Productive** | IDE, AI Tools, Developer Tools, Education, Productivity, Tools |
| **Neutral** | Communication, Design, Search Engine, News, Uncategorized, Other, Browser |
| **Distracting** | Entertainment, Social Media, Shopping, Gaming |

### 6.5 Tracking Data Model

```typescript
// Log entry
{
  id: number;
  timestamp: string;
  app: string;
  category: string;
  duration_ms: number;
  title?: string;
  url?: string;
  domain?: string;
}

// Daily stats
{
  date: string;
  app: string;
  category: string;
  total_sec: number;
  sessions: number;
  focus_score: number;
  productivity_type: string;
}
```

### 6.6 Productivity Score

```
Score = (weightedSeconds / totalSeconds) * 100
```
Weights: Productive = 1.0, Neutral = 0.5, Distracting = 0.0

### 6.7 Database Tables

| Table | Purpose |
|-------|---------|
| `logs` | Raw tracking data (app, category, duration_ms, timestamp) |
| `daily_stats` | Per-app daily aggregation |
| `sessions` | Active session tracking |
| `daily_aggregates` | Pre-computed for heatmap/planets |
| `browser_sessions` | Browser-specific aggregation |
| `stats_hourly` | Hourly pre-aggregation |
| `stats_daily` | Daily pre-aggregation |
| `app_totals` | All-time app totals |

---

## 7. Finance Module

### 7.1 Overview

Full personal finance management system. Route: `/finance`. Password-protected with optional biometric unlock.

**IMPORTANT:** This is the most complex module. It has 10 tabs and 18+ database tables.

### 7.2 Security Layer

- **Password-based unlock** with max 3 attempts before lockout
- **Biometric unlock:** fingerprint/face ID
- **Auto-lock timer:** configurable timeout (default 5 minutes), resets on user activity
- **Visibility lock:** re-checks lock state when app comes to foreground
- **Remember device:** skip re-auth for N days
- **Password confirm:** required for destructive actions (delete wallet/account)

### 7.3 Tabs

| Tab | Purpose |
|-----|---------|
| Overview | Net worth, income/expense, insights, charts |
| Wallets | Accounts, wallets, balances, wallet detail |
| Transactions | Transaction list, create, edit, batch operations |
| People | Follow Through (on-behalf-of tracking) |
| Categories | Income/expense/transfer categories |
| Subscriptions | Recurring payments tracking |
| Fixed Expenses | Monthly bill tracking |
| Budget | Spending limits per category |
| Audit Log | Encrypted event trail |
| Charts | Advanced analytics and visualizations |

### 7.4 Overview Tab

#### Widgets
- **Net Worth Card** — aggregate across all non-custodial accounts
- **Net Worth Line Chart** — time series
- **Income vs Expense Card** — current period comparison
- **Spending Split Card** — Personal vs Follow Through
- **Follow Through Card** — on-behalf-of totals by person
- **Recent Transactions** — last 5 with filter toggle (Personal/Follow Through/All)
- **Finance Insights Card** — AI-generated insights
- **Liquidity Waterfall** — Income → Fixed Costs → Variable Costs → Savings → Net
- **Subscription Burden Radar** — radar chart of subscription impact
- **Cash Flow Runway** — projection of months until break-even
- **Wallet Health Scorecards** — per-wallet health with sparklines
- **Transfer Cost Matrix** — fee heatmap between wallets
- **Crypto Unified Portfolio** — doughnut chart of fiat + crypto allocation

#### Net Worth Calculation
- Sum of all wallet balances across non-custodial accounts
- Physical/cash wallets: denomination-based (bills × count + coins × count)
- Crypto wallets: fiat balance + market value of held assets

### 7.5 Wallets Tab

#### Account Hierarchy
```
Accounts (personal | joint | custodial | business)
  └── Wallets (bank | debit_card | credit_card | crypto | cash | physical | ewallet | other)
        ├── Transactions
        ├── Subscriptions
        ├── Fixed Expenses
        └── Crypto Assets (multiple per crypto wallet)
```

#### Account
- Types: personal, joint, custodial, business
- Custom icon and color
- CRUD (delete is password-protected)
- Archive/unarchive

#### Wallet
- Types: bank, debit_card, credit_card, crypto, cash, physical, ewallet, other
- Metadata (JSON) with type-specific fields:
  - Bank: bank_name, branch, account_number, swift, iban
  - Debit: card_network, issuer, daily_limit
  - Credit: card_network, issuer, credit_limit, billing_day, due_day, apr
  - Crypto: coin_id, symbol, blockchain, wallet_address, acquisition_price, asset portfolio (multiple holdings)
  - Cash/Physical: denomination tracking (bills/coins with value × count)
  - E-wallet: platform, phone_or_email, daily_limit
- Transfer fee config: fee_type (flat/percentage), fee_value
- Balance recalculation with preview modal
- Balance history chart

#### Crypto Asset Portfolio
- Multiple assets per crypto wallet
- Each asset: coin_id, symbol, amount, avg_buy_price, currentPrice
- Historical tracking

### 7.6 Transactions Tab

#### Transaction Types
- **income** — positive amount
- **expense** — negative amount (stored as negative)
- **transfer** — paired transactions linked by `transfer_id`

#### Transaction Fields
- account_id, wallet_id, category_id, type, amount, fee, merchant, description, note, date, time, is_recurring, tags, transfer_id, from_wallet_id, to_wallet_id, on_behalf_of, on_behalf_of_label, is_adjustment, metadata

#### Features
- **Batch recategorize** — select multiple transactions, change category
- **Selection aggregate** — sum of selected transactions displayed
- **Transaction detail modal** — full edit of all fields
- **CSV export**
- **Auto-recalculate balances** after create/update/delete

#### Per-Wallet-Type Transaction Modals
Each wallet type has a specialized transaction creation modal:
- Bank, Debit, Credit, Crypto, Physical (denomination-based), Cash (denomination-based), E-wallet

### 7.7 People Tab (Follow Through)

Tracks expenses made on behalf of someone else who will pay back.

#### Person
- Fields: name, email, phone, notes, balance (owed - paid), preferred wallet
- **Top-up:** add money to person's balance from a wallet (creates expense)
- **Deduct:** receive repayment (deduct from balance)
- **Record repayment:** mark specific transactions as repaid
- **Sync balances:** recalculate from transactions
- Amber `Handshake` icon in UI for Follow Through items

### 7.8 Categories Tab

- **Income categories:** Salary, Freelance, Gift, Interest, Refund
- **Expense categories:** Food & Groceries, Transport, Housing, Utilities, Entertainment, Shopping, Health, Education, Other
- **Transfer category:** Transfer
- Each category: name, type, icon (Lucide), color (hex), sort_order

### 7.9 Subscriptions Tab

#### Subscription
- Fields: wallet_id, name, description, price, currency, billing_cycle (weekly/monthly/quarterly/yearly/custom), start_date, next_renewal_date, cancel_url, status (active/cancelled/paused/expired), category_id, payment_status, autodebet, subscription_type

#### Features
- Monthly cost normalization (convert any cycle to monthly equivalent)
- Renewal urgency: color-coded countdown (overdue, 1-3d, 4-7d, 8-14d, 15-30d, 30d+)
- Auto-generate transactions for due renewals
- Skip renewal, move transaction to different wallet, retry payment
- Record payment manually with custom date/amount
- Payment history per subscription
- Cancel URL link
- Stats: monthly spend, yearly projection, upcoming renewals
- Search and filter by status, name, wallet
- Sort by renewal date, price, or name

### 7.10 Fixed Expenses Tab

Recurring monthly bills (rent, utilities, insurance) tracked month-by-month.

#### Fields
- wallet_id, name, description, amount, currency, category_id, billing_day, is_active, auto_create_transaction

#### Monthly Payment Status
- Per month: pending / paid / skipped
- Mark paid → creates expense transaction, deducts from wallet
- Skip month → marks as skipped
- Unmark paid → reverses payment

#### Features
- Month navigator (prev/next)
- Summary: total monthly, total paid, total remaining, percentage paid, overdue count
- Auto-detect recurring patterns from transactions

### 7.11 Budget Tab

- Set spending limits per category or total
- **Budget fields:** name, type (total/category), category_id, amount, currency, period (monthly/weekly/yearly), alert_threshold (default 80%)

#### Visual Indicators
- SVG progress ring for overall budget
- Per-budget progress bars:
  - Green: under 60%
  - Yellow: 60-80%
  - Orange: 80-100% (warning)
  - Red: over 100% (over budget)
- Days remaining in current month
- Warning banners for at-risk budgets

### 7.12 Crypto Features

#### Price Tracking
- CoinGecko API integration for live prices
- Search across crypto, stocks, ETFs, commodities
- Multi-provider price fetching
- Price history with charts

#### Crypto Transaction Modes
- Buy, Sell, Transfer (crypto→crypto, crypto→fiat, fiat→crypto), Pay, Receive
- Live price fetch for selected coin
- 24h price change indicator
- Quantity + price + fee inputs with real-time total

#### Crypto Portfolio
- Doughnut chart: fiat vs crypto allocation
- Per-coin breakdown: value, cost basis, PnL, PnL%
- Per-coin detail modal with quantity timeline and fiat value timeline

### 7.13 Charts & Analytics Tab

| Chart | Description |
|-------|-------------|
| Net Worth Line Chart | Time series with day/month/auto toggle |
| Income vs Expense Bar Chart | Monthly bars |
| Spending by Category | Doughnut/pie chart |
| Liquidity Waterfall | Income → Fixed → Variable → Savings → Net |
| Cash Flow Runway | Balance projection over months |
| Subscription Burden Radar | Multi-axis radar |
| Wallet Health Scorecards | Per-wallet metrics with sparklines |
| Transfer Cost Matrix | Fee heatmap between wallet pairs |

### 7.14 Audit Log

- Encrypted event trail for all finance operations
- Events: account/wallet/transaction/subscription/budget CRUD, balance adjustments, transfers
- AES-256-GCM encrypted detail data
- Paginated list with entity type filter
- Detail view with decrypted data

### 7.15 Currency Support

- 10 display currencies: USD, IDR, SGD, GBP, EUR, JPY, AUD, CNY, KRW, INR
- 17 supported currencies total (also CAD, CHF, MYR, PHP, THB, VND, BRL)
- Live exchange rates from exchangerate-api.com with 30-min cache
- All amounts convert via `convertAmount(value, from, to)`

### 7.16 Number Masking

- Global number masking for screen sharing privacy
- Configurable mask pattern
- Toggle on/off

### 7.17 Database Tables (18 total)

| Table | Purpose |
|-------|---------|
| `finance_accounts` | Account containers |
| `finance_wallets` | Financial instruments |
| `finance_categories` | Income/expense categories |
| `finance_transactions` | All transactions |
| `finance_settings` | Module settings |
| `finance_crypto_prices` | Cached current prices |
| `finance_crypto_history` | Historical price data |
| `crypto_asset_history` | Per-wallet asset holdings |
| `finance_subscriptions` | Recurring payments |
| `finance_fixed_expenses` | Monthly bill definitions |
| `finance_fixed_expense_payments` | Monthly payment status |
| `finance_budgets` | Spending limits |
| `finance_ft_persons` | Follow Through people |
| `finance_person_balances` | Per-person balances |
| `finance_transfer_routes` | Transfer fee routes |
| `finance_daily_summaries` | Daily aggregations |
| `finance_wallet_snapshots` | Wallet balance snapshots |
| `audit_log` | Encrypted event trail |

---

## 8. Life Page (Covenant + Memories)

### 8.1 Overview

Route: `/life`. Two sub-tabs: Covenant (habits) and Memories (photo vault).

### 8.2 Covenant Tab (Habit Tracking)

Personal commitment/habit tracking with visual streak system.

#### Features
- **ConstellationHero** — visual streak calendar (stars/constellation metaphor)
- **Streak tracking** — consecutive days with completions
- **Total practice days** counter
- **Commitment cards** — each commitment shows recent dates grid
- **New Commitment Modal** — create new habits
- **Grace Reset Moment** — forgiveness for missed days (doesn't break streak)
- **Milestone Celebration** — celebrate streak milestones
- **Reflection Prompt Card** — daily reflection question
- **Reflection Echo** — past reflections
- **Journal Drawer** — freeform journal entries

### 8.3 Memories Tab (Photo/Video Vault)

"People and moments outside the work"

#### Features
- **Memory Reel** — horizontal scrollable reel of recent/this-day memories
- **On This Day Card** — memories from this date in previous years
- **Memory Uploader** — drag-drop/paste photos and videos
- **Two views:** Collage grid or Timeline (grouped by month)
- **Memory Reveal** — full-screen viewing
- **Recap Player** — auto-playing slideshow
- **Person Chip** — tag people in memories
- **Memory Card** — individual memory with metadata

---

## 9. External Activities (Sleep, Exercise, etc.)

### 9.1 Overview

Manual/off-device activity tracking for things that happen away from the computer. Route: `/external`

### 9.2 Activity Types

| Type | Behavior |
|------|----------|
| **Stopwatch** | Start/stop timer (e.g., Study, Exercise) |
| **Sleep** | Bedtime/wake-up flow with latency tracking |
| **Checkin** | Instant log with default duration (e.g., Eating) |

### 9.3 Features

- **Activity Grid** — 4-column grid of activity cards with inline 7-day sparklines
- **Drag-to-Reorder** — reorder activities via drag-and-drop
- **Active Timer** — large HH:MM:SS with pause/resume/stop
- **Sleep Flow:**
  1. Start sleep session
  2. Morning prompt asks for wake-up details
  3. Confirm wake time
  4. Calculate sleep duration with pre-sleep latency and post-wake latency
- **Manual Session Entry** — add past sessions with date picker, start time, duration
- **Activity Detail View** — tap activity card to see:
  - Avg session, session count, active days
  - Daily/hourly bar chart
  - Hourly pattern chart (24-hour distribution)
  - Session list with edit/transfer/delete
- **Sleep Patterns Visualization** — stacked bar chart: pre-sleep delay (amber) → sleep window (indigo) → post-wake delay (rose)
- **Add Custom Activity** — name, type, color, icon, default duration

### 9.4 Default Activities

| Name | Type | Icon | Color |
|------|------|------|-------|
| Study | stopwatch | BookOpen | indigo |
| Exercise | stopwatch | Dumbbell | green |
| Gym | stopwatch | Flame | orange |
| Reading | stopwatch | Book | blue |
| Sleep | sleep | Moon | purple |
| Eating | checkin | UtensilsCrossed | amber |

### 9.5 Data Types

```typescript
// ExternalActivity
{
  id: number;
  name: string;
  type: "stopwatch" | "sleep" | "checkin";
  color: string;
  icon: string;
  default_duration: number;
  is_default: number;
  is_visible: number;
  sort_order: number;
}

// ExternalSession
{
  id: number;
  activity_id: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  notes?: string;
  device_off_to_sleep_seconds?: number;  // sleep pre-sleep latency
  wake_up_to_app_seconds?: number;       // sleep post-wake latency
}
```

### 9.6 Database Tables

| Table | Purpose |
|-------|---------|
| `external_activities` | Activity definitions |
| `external_sessions` | Session records |
| `external_settings` | Key-value settings |

---

## 10. Insights & Analytics

### 10.1 Overview

Route: `/insights`. Comprehensive analytics across all tracked data.

### 10.2 Summary Cards (Top Row)

| Card | Shows |
|------|-------|
| Total Time | Total external seconds tracked, activity count |
| Consistency | Score %, trend (improving/declining/stable) |
| Streak | Current weekly streak, this week's hours |
| Best Day | Best/worst day of week |
| Sleep Deficit | Average sleep hours vs 8h target |

### 10.3 Three Tabs

#### Day Tab (Typical Day)
- 7-day x 24-hour multi-activity heatmap
- Gradient-split cells showing percentage per activity
- Schedule consistency score per cell
- Rich tooltip with activity breakdown

#### Weekly Tab
- Hours per week (line chart with 30h target line)
- Day of week performance (bar chart)
- Most used apps/websites (top 5)
- Browser activity by category
- Sleep & recovery (bar chart)
- Time distribution (device vs external + circular productivity gauge)

#### Activity Tab
- Daily activity trend (bar chart)
- Activity by category (doughnut)
- External activity breakdown (horizontal bars)
- Full ranked app/website list
- Least used apps (bottom 5)

### 10.4 Period System

| Period | Meaning |
|--------|---------|
| `today` | Current day |
| `week` | Current calendar week |
| `7day` | Rolling 7-day window |
| `month` | Current calendar month |
| `30day` | Rolling 30-day window |
| `all` | All time |

Each period supports `dateOffset` for navigating to previous periods.

---

## 11. Settings & Configuration

### 11.1 Key Settings

| Setting | Description |
|---------|-------------|
| Timer Behavior | What happens to timer on neutral/distracting apps |
| Tier Assignments | Which categories are productive/neutral/distracting |
| Tracker App Mode | How to handle DeskFlow's own window (show-other/pause/track) |
| Tracking Browser | Which browser has the extension installed |
| Browser Tracking | Enable/disable website tracking |
| External Activity Tiers | Tier assignment for external activities |
| Domain Keyword Rules | Keyword-based domain categorization |
| AI Provider | Configure AI provider (API key, model) per feature |
| Display Currency | Default currency for finance display |
| Number Masking | Toggle for screen sharing privacy |

### 11.2 Category Management

- Add/remove custom categories
- Override app/category assignments
- Apply changes to historical data

---

## 12. Shared Patterns & Design Tokens

### 12.1 Glass Morphism Pattern

All dashboard cards use:
```
bg: rgba(24, 24, 27, 0.80)
backdrop-blur: xl
border: 1px solid rgba(63, 63, 70, 0.50)
border-radius: xl (12px)
```
With top-edge highlight lines and hover states.

### 12.2 Animation

- Framer Motion for page transitions, tab panels, card entrances, modal overlays
- NumberTicker for animated counters
- BorderBeam for active states
- AuroraText for hero headlines
- Sparkline for mini inline charts

### 12.3 Color System

| Token | Usage |
|-------|-------|
| `--bg-primary` | Main background |
| `--accent-primary` | Primary accent (indigo) |
| Productive | Green (#22c55e) |
| Neutral | Gray (#71717a) |
| Distracting | Red (#ef4444) |
| Focus | Pink (#f472b6) |
| Finance | Emerald (#10b981) |
| AI | Violet (#8b5cf6) |

### 12.4 Period Selector

Unified across all pages:
- today, week, 7day, month, 30day, all
- Each supports `dateOffset` for navigating to previous periods

### 12.5 Empty States

Every list/grid must have an empty state with:
- Illustration or icon
- Title ("No transactions yet")
- Description ("Create your first transaction to get started")
- CTA button ("Add Transaction")

### 12.6 Loading States

- Skeleton loaders for cards/grids
- Shimmer animation on placeholders
- Spinner for inline operations

### 12.7 Error States

- Retry button
- Friendly error message
- No crash — graceful degradation

---

## Appendix A: Complete IPC → Service Method Mapping

Every IPC endpoint from the desktop version becomes a direct service call in the mobile app. Here is the complete mapping:

### AI Service Methods
| Desktop IPC | Mobile Service Method |
|-------------|----------------------|
| `get-ai-providers` | `aiService.getProviders()` |
| `save-ai-providers` | `aiService.saveProviders(config)` |
| `ai-chat:load` | `aiService.loadThread(date)` |
| `ai-chat:save` | `aiService.saveThread(date, messages)` |
| `ai-chat:reset` | `aiService.resetThread(date)` |
| `ai-chat:list-threads` | `aiService.listThreads()` |
| `ai-chat:rename` | `aiService.renameThread(date, title)` |
| `ai-chat:get-memories` | `aiService.getMemories(date)` |
| `ai-chat:extract-memories` | `aiService.extractMemories(messages)` |
| `ai-chat:send` | `aiService.sendMessage(content)` |
| `get-goals` | `aiService.getGoals(date)` |
| `save-goal` | `aiService.saveGoal(goal)` |
| `delete-goal` | `aiService.deleteGoal(id)` |
| `suggest-goals` | `aiService.suggestGoals(context)` |
| `get-schedule` | `aiService.getSchedule()` |
| `add-schedule-entry` | `aiService.addScheduleEntry(entry)` |
| `get-deadlines` | `aiService.getDeadlines(days)` |
| `get-reminders` | `aiService.getReminders()` |
| `create-reminder` | `aiService.createReminder(reminder)` |
| `connectors:list` | `aiService.listConnectors()` |
| `connectors:sync` | `aiService.syncConnector(id)` |
| `get-topic-digest` | `aiService.getDigest(topics)` |

### Focus Service Methods
| Desktop IPC | Mobile Service Method |
|-------------|----------------------|
| `focus:start` | `focusService.start({ durationSec, strictness })` |
| `focus:end` | `focusService.end(outcome)` |
| `focus:get-state` | `focusService.getState()` |
| `focus:history` | `focusService.getHistory(limit)` |

### Finance Service Methods
| Desktop IPC | Mobile Service Method |
|-------------|----------------------|
| `finance:get-accounts` | `financeService.getAccounts()` |
| `finance:create-account` | `financeService.createAccount(data)` |
| `finance:get-wallets` | `financeService.getWallets(accountId?)` |
| `finance:create-wallet` | `financeService.createWallet(data)` |
| `finance:get-transactions` | `financeService.getTransactions(filters)` |
| `finance:create-transaction` | `financeService.createTransaction(data)` |
| `finance:get-summary` | `financeService.getSummary(period)` |
| `finance:fetch-crypto-prices` | `financeService.fetchCryptoPrices(ids)` |
| `subscriptions:list` | `financeService.listSubscriptions()` |
| `subscriptions:create` | `financeService.createSubscription(data)` |
| `budgets:list` | `financeService.listBudgets()` |
| `budgets:get-status` | `financeService.getBudgetStatus(month)` |
| `audit:list` | `financeService.listAuditLog(page, filter)` |

### Resume Service Methods
| Desktop IPC | Mobile Service Method |
|-------------|----------------------|
| `resume:getProfile` | `resumeService.getProfile()` |
| `resume:saveProfile` | `resumeService.saveProfile(profile)` |
| `resume:getTakeaways` | `resumeService.getTakeaways()` |
| `resume:submitAnswer` | `resumeService.submitAnswer(questionId, answer, phase)` |
| `resume:getVersions` | `resumeService.getVersions()` |
| `resume:saveVersion` | `resumeService.saveVersion(version)` |
| `resume:exportPdf` | `resumeService.exportPdf()` |

### Tracking Service Methods
| Desktop IPC | Mobile Service Method |
|-------------|----------------------|
| `get-dashboard-aggregates` | `trackingService.getDashboardAggregates()` |
| `get-logs-by-period` | `trackingService.getLogsByPeriod(period, offset)` |
| `get-external-activities` | `trackingService.getExternalActivities()` |
| `start-external-session` | `trackingService.startExternalSession(activityId)` |
| `stop-external-session` | `trackingService.stopExternalSession(sessionId, params)` |
| `get-external-stats` | `trackingService.getExternalStats(period)` |
| `get-sleep-trends` | `trackingService.getSleepTrends(period)` |
| `get-typical-day` | `trackingService.getTypicalDay(days, offset)` |
| `get-consistency-score` | `trackingService.getConsistencyScore(period)` |
| `get-insight-strip` | `trackingService.getInsightStrip(period)` |

---

## Appendix B: Mobile-Specific Adaptations

### B.1 Tracking on Mobile

Desktop uses `active-win` to detect foreground apps. On mobile:
- **Android:** Use `UsageStatsManager` API to read app usage stats
- **iOS:** Use `ScreenTime` API (limited) or device activity reports
- Browser tracking via in-app WebView with extension bridge

### B.2 Focus Overlay on Mobile

Desktop opens a separate BrowserWindow. On mobile:
- Show a full-screen in-app overlay when distraction detected
- Use OS-level app blocking (Android Digital Wellbeing, iOS Screen Time) if available
- Or: detect app switch via background service, show notification to return

### B.3 Notifications

- Focus session reminders
- Subscription renewal alerts
- Daily goal reminders
- Morning prompt for sleep tracking

### B.4 Widgets (iOS/Android)

- Today's focus time widget
- Quick start focus session widget
- Finance net worth widget
- Habit streak widget

### B.5 Offline Support

All data is local SQLite — fully offline by default. Crypto prices require internet.

### B.6 Sync (Future)

Desktop-to-mobile sync via the existing sync server (port 8787).

---

## Appendix C: Feature Priority Matrix

| Priority | Feature | Reason |
|----------|---------|--------|
| P0 | Dashboard + Timer | Core value proposition |
| P0 | Activity Tracking | Core feature |
| P0 | Focus Sessions | Core feature |
| P1 | Finance — Wallets + Transactions | High user value |
| P1 | External Activities (Sleep, Exercise) | High user value |
| P1 | AI Assistant — Chat + Goals | High user value |
| P2 | Finance — Subscriptions + Budgets | Important but secondary |
| P2 | Resume Builder | Useful but niche |
| P2 | Insights & Analytics | Nice to have |
| P3 | Life Page (Covenant + Memories) | Personal/lifestyle |
| P3 | Finance — Crypto | Advanced feature |
| P3 | Finance — Audit Log | Compliance feature |
| P3 | Connectors (Email/Calendar) | Advanced integration |

---

*Document generated: 2026-07-27*
*Source: DeskFlow Electron desktop app codebase analysis*
*Target: Mobile app development team (AI agent)*
