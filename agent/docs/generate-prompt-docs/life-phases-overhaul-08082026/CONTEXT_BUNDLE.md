# CONTEXT BUNDLE — Life Phases Overhaul (Comprehensive)

## What is DeskFlow?

DeskFlow is a **daily life productivity tracker** — an Electron desktop app that tracks everything about how you spend your time on your device and beyond. It watches which apps you use, which websites you visit, tracks your sleep, your goals, your finances, your AI usage, and now — your **life phases**. The philosophy is: your life is data, and when you see that data clearly, you can reflect on it, learn from it, and grow.

The app runs in dark mode only. The design language is glass-morphism (zinc-900/950 backgrounds, backdrop-blur, glass cards called `WarmCard`). Typography uses Inter for body, JetBrains Mono for numbers, and special fonts for emotional sections (warmth-serif, font-display).

---

## Complete Feature Inventory

### 1. Dashboard (`/`)
The home page. Shows:
- **3D Orbit System** — an interactive solar system where planets represent apps you use. Planet size = usage time. You can click planets, hover for stats, zoom in/out.
- **Heatmap** — a 7×24 grid showing hourly activity (apps, websites, or combined). Click any hour to see what you were doing. Click day labels for a full timeline.
- **Weekly Overview** — stacked bar chart showing daily activity totals with device/external breakdown.
- **Stopwatch** — a live productive timer that counts up when you're using productive apps.
- **Recent Sessions** — list of recent app/website sessions with live timers.
- **Quick Stats** — active time, productive apps count, distracting apps count.
- **Period Selector** — Today/Week/Month/All Time.

### 2. Stats (`/stats`)
Detailed app usage analytics:
- **App Table** — every app you've used, sorted by time, with sessions count and avg duration.
- **Charts** — pie chart (category distribution), bar chart (top apps), line chart (usage over time).
- **Full Sessions List** — edit/delete individual sessions with inline datetime editors.
- **Live Detection Panel** — real-time event log showing apps as they're detected.

### 3. Productivity (`/productivity`)
- **Productivity Score** — percentage of productive time vs total time.
- **Focus Sessions** — uninterrupted productive sessions with duration, apps used.
- **Trends** — productivity score over time with comparison to previous periods.

### 4. Browser Activity (`/browser`)
- **Website Tracking** — all visited websites with time, domain grouping, category assignment.
- **Domain Grouping** — group by domain (all github.com pages together).
- **Top Sites Chart** — most visited sites.
- **Tab Bar** — 7 content tabs (Overview/IDEs/Tools/Projects/AI/Git/Trash).
- **Live Detection Panel** — real-time website detection log.

### 5. IDE Projects (`/ide`)
- **IDE Detection** — auto-detects VS Code, Cursor, JetBrains IDEs, Android Studio, Xcode.
- **Project Grid** — visual grid of all projects with IDE icons.
- **Extension Tracking** — per-IDE extension list with versions.
- **AI Usage Overview** — total tokens, cost, by tool breakdown.
- **AI Tools subpage** — 3D cityscape visualization of AI agent usage (React Three Fiber), model/tool usage timelines with dominance phases.
- **Analytics Dashboard** — workspace-wide token usage, problems, requests.

### 6. Terminal Workspace (`/terminal`)
A full multi-pane terminal with AI agent integration:
- **Multi-Pane Terminal** — split panes horizontally/vertically, each running an AI agent (OpenCode, Claude, Codex, Aider).
- **5-Group Sidebar** — Setup (presets, configs), Work (sessions, map, files), Insights (analytics, issues), Studio (skills, design), Context (context systems, maintenance).
- **AI Agent Integration** — spawn agents, resume sessions, auto-categorize, @mention routing.
- **Workspace Save/Load** — save terminal layout snapshots.
- **Cross-Session Sync** — file locks, conflict detection, context broadcast.

### 7. External Activities (`/external`)
Track activities beyond your device:
- **External Activity Tracking** — AI tools, websites, and other external activities.
- **Time Audit** — amber (external) vs emerald (internal) comparison.
- **Sleep Tracking** — manual sleep sessions, sleep trends chart (floating range bars crossing midnight), sleep detection via window focus patterns.
- **Activity Charts** — daily usage trend, activity distribution, weekly trend.
- **Gaps Detection** — find untracked time gaps in your day.
- **Always-Visible Timer** — persistent stopwatch for manual tracking.

### 8. Insights/Reports (`/reports`)
- **3-Tab Interface** — Day / Weekly / Activities.
- **Typical Day Heatmap** — 7×24 grid showing your typical patterns.
- **Stat Cards** — 5 stats with trend indicators.
- **Sleep & Recovery Chart** — sleep hours vs deficit over time.
- **Activity Breakdown** — animated horizontal bar chart with percentages.

### 9. Finance (inside Settings or as tab)
- **Transactions** — income, expenses, follow-through (on behalf of someone).
- **Budgets** — category budgets with progress bars.
- **Subscriptions** — recurring payments with renewal countdown.
- **Monthly Recap** — AI-generated narrative summary of your month with stats.
- **Categories** — finance categories with custom colors.

### 10. Settings (`/settings`)
- **Category Management** — reassign app categories (productive/neutral/distracting).
- **Color Customization** — per-app color selection.
- **Tracking Settings** — timer behavior, auto-start, app switch debounce, sleep gap detection.
- **Browser Rules** — domain rules, keyword rules for auto-categorization.
- **General** — launch on startup, minimize to tray, theme.
- **System Prompts** — per-agent prompt editors.

---

## The "Warmth" System (Personal Features)

These are the **personal, emotional features** that live under the warmth umbrella:

### Covenant (`/life?tab=covenant`)
- **Commitments** — daily promises you make to yourself (e.g., "meditate", "exercise").
- **Streaks** — consecutive days with completions.
- **Warm colors** — clay, sage, amber, sky.
- **Storage** — local, per-day completion tracking.

### Gold (`/life?tab=gold`)
- **Daily Goals** — today's tasks with categories, priorities, deadlines.
- **Long-Term Goals** — bigger goals with progress rings (AnimatedCircularProgressBar).
- **Habits** — recurring weekly goals.
- **Calendar Strip** — navigate between days.
- **AI Reflection** — daily review summary generated by AI.
- **Week Review** — weekly reflection with trend data.

### Memories (`/life?tab=memories`)
- **Photo/Video Upload** — store memories with dates.
- **On This Day** — memories from this date in previous years.
- **Lightbox** — full-screen memory viewer.
- **Memory Cards** — thumbnail grid with layout animation.

### Life Phases (`/life` — the River of Years)
**THIS IS WHAT WE'RE OVERHAULING.**

The Life Phases feature is a **personal timeline** — a way to map the chapters of your life. Each phase represents a period (university, first job, relationship, move, etc.) with:
- A visual representation on a river/canvas
- Color-coded categories
- Magnitude (how significant this phase was)
- AI-generated reflections
- Connections to other phases

---

## Life Phases — Current State

### What Exists
- **LifePhase type**: id, title, description, category, startMonth, startYear, endMonth, endYear, magnitude, color, reflection, eraTrends, impactNotes, milestones[], connections[]
- **8 Categories**: Growth, Career, Love, Challenge, Joy, Rest, Adventure, Creation
- **Backend**: 7 IPC handlers (get/save/delete/saveAll/aiReflect/aiEraTrends/aiSummarize), DB table `life_phases`
- **PhaseFormDialog**: Very basic — title, description, category, magnitude slider, start/end dates. That's it.
- **PhaseCard**: h-36 solid color header, body with description, LTGs, scattered memory pearls, reflection, Reflect/Edit buttons.
- **RiverMap**: SVG curve with phase markers, "Now" pulsing star, scroll parallax.
- **TodayTributary**: Asymmetric layout — Covenant (Current Vows), Gold (Today's Seal), Vault (Horizon).
- **Vital Thread**: Gradient line connecting everything.

### What's Missing (the overhaul target)
1. **Input is too basic** — no milestones, no people, no feelings, no lessons, no color picker, no AI-assisted prompts
2. **Visualization needs soul** — the current cards are functional but not emotional
3. **No connection to tracking data** — phases should pull from goals, focus sessions, app usage, memories
4. **No AI integration for creation** — AI should help you reflect, not just generate text after the fact

---

## How Phases Connect to Other Features

The Life Phases feature sits at the intersection of ALL the app's data:

| Connection | Data Available | How It Helps |
|------------|---------------|--------------|
| **Gold (Goals)** | Daily goals, long-term goals, habits, completions | Show which goals were active during this phase. What were you working toward? |
| **Covenant (Commitments)** | Daily commitments, streaks | What promises did you keep during this phase? |
| **Memories** | Photos, videos, dates | Visual memories from this period. The scattered polaroids in PhaseCards. |
| **External Activities** | AI tools usage, websites, tracked activities | What tools were you using? What were you building? |
| **Focus Groups** | Time spent per focus group | How did you allocate your time during this phase? |
| **App Usage** | App sessions, productive/distracting time | What apps defined this era? What were your habits? |
| **Finance** | Income, expenses, subscriptions | Financial context of this period. |
| **Sleep** | Sleep patterns, trends | How were you sleeping during this phase? |
| **Productivity** | Productivity score, focus sessions | Were you in a productive period or a rest period? |
| **AI Usage** | Tokens, cost, models used | What AI tools were you using? How has your AI usage evolved? |

Not all of these need to be implemented now, but the design should **show where they connect** so the architecture supports it.

---

## Design System

### Tokens
- **Fonts**: warmth-serif (emotional text), font-mono (dates/numbers), font-display (large numbers), Inter (body)
- **Colors**: phase categories provide base colors, user can override. Dark zinc palette.
- **Glass**: `WarmCard` with ambient warmth-shimmer overlay
- **Motion**: framer-motion (viewport entry, scroll parallax, hover interactions)

### MCP Components Available
- **shadcn**: dialog, input, textarea, select, slider, button, badge, card, collapsible
- **Magic UI**: animated-beam, border-beam, number-ticker, particles, shimmer-button
- **Lucide**: 1500+ icons
- **React Bits**: 135+ animated components

### Anti-Slop Rules
- Re-skin to DeskFlow tokens (zinc-900/950, warmth colors)
- Max rounded-xl, p-5 padding
- Dark mode only
- Geist + JetBrains Mono fonts
- Glass layer (bg-zinc-900/80 backdrop-blur-xl)
