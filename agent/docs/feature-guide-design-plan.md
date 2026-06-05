# Feature Guide — Design Plan

## Layout Concept

Each guide entry is a card with sections:

```
┌────────────────────────────────────────────────┐
│ [gradient strip]                                │
│                                                 │
│ [icon] Feature Name  [status]                   │
│                                                 │
│ What it is (1-line)                             │
│                                                 │
│ ── What you'll find ──────────────────────────  │
│ • Key UI element / widget                       │
│ • Key UI element / widget                       │
│ • Key UI element / widget                       │
│                                                 │
│ ── What you can do ───────────────────────────  │
│ • Action you can take                           │
│ • Action you can take                           │
│                                                 │
│ [icon cluster]              [  Open Feature  ]  │
└────────────────────────────────────────────────┘
```

Two sections instead of generic bullets:
- **What you'll find** → the actual widgets/UI elements on that page (so user knows what to look for)
- **What you can do** → the actions/controls available (so user knows how to use it)

This separates *identification* from *operation* — makes it scannable and useful as a reference.

---

## Content for Each Feature

### Dashboard
- **Icon:** Home | **Route:** `/` | **Status:** Released | **Category:** Core
- **What it is:** Your command center — everything tracked at a glance
- **What you'll find:**
  - 3D orbit system — planets are your apps, size = usage time
  - Activity heatmap — 7x24 grid showing daily intensity
  - Weekly overview bar chart with device breakdown
  - Quick stats cards — active time, productive %, streak
  - Recent sessions feed
- **What you can do:**
  - Click a planet to see app details
  - Click heatmap cells to drill into hourly data
  - Hover for tooltips across all visualizations
  - Use the period selector to change time range
- **Visual icons:** Activity, Globe, Target

### Usage Statistics
- **Icon:** BarChart3 | **Route:** `/stats` | **Status:** Released | **Category:** Core
- **What it is:** Deep dive into how you spend your time
- **What you'll find:**
  - Sorted app list with usage times
  - Category breakdown with percentages
  - Pie, bar, and line charts for time distribution
  - Summary — total time, sessions, unique apps
- **What you can do:**
  - Switch between daily/weekly/monthly views
  - Toggle focus time vs total time mode
  - Sort apps by name or usage
  - Export data to CSV or JSON
- **Visual icons:** PieChart, BarChart3, FileText

### Productivity
- **Icon:** Target | **Route:** `/productivity` | **Status:** Released | **Category:** Core
- **What it is:** Score your focus and analyze productive vs distracting time
- **What you'll find:**
  - Large circular productivity score (0-100)
  - Time breakdown grid — productive/neutral/distracting hours
  - App vs website comparison
  - Trend charts (daily, hourly)
- **What you can do:**
  - See how your score changes over periods
  - Compare app time vs browsing time
  - Identify which categories help or hurt focus
- **Visual icons:** Target, PieChart, Activity

### Browser Activity
- **Icon:** Globe | **Route:** `/browser` | **Status:** Released | **Category:** Core
- **What it is:** Website-level tracking with domain analysis
- **What you'll find:**
  - Browser selection dropdown with extension status
  - Domain stats list with usage per site
  - Category distribution charts
  - Live mode toggle for real-time browsing log
  - Summary cards — total browsing time, top sites
- **What you can do:**
  - Select which browser to track
  - Override category for any domain
  - Enable live mode to watch browsing in real-time
  - Refresh data on demand
- **Visual icons:** Globe, PieChart, Search

### External Tracker
- **Icon:** Moon | **Route:** `/external` | **Status:** Released | **Category:** Core
- **What it is:** Track offline activities, sleep, and focus sessions
- **What you'll find:**
  - Active timer — stopwatch mode or sleep mode
  - Activity grid with daily/hourly bar chart
  - Sleep timeline — 24h bar view of sleep segments
  - Consistency score and streak tracking
- **What you can do:**
  - Start/stop/pause tracking for any activity
  - Log past sleep sessions with date picker
  - Manually add session durations
  - View sleep trends over time
- **Visual icons:** Timer, Clock4, Activity

### IDE Projects
- **Icon:** Code2 | **Route:** `/ide` | **Status:** Released | **Category:** Tracker Mind
- **What it is:** Track your development environment — IDEs, tools, projects, AI usage, git
- **What you'll find:**
  - 7 tabs: Overview, IDEs, Tools, Projects, AI, Git, Trash
  - Overview metric cards — IDEs detected, tools found, AI tokens, commits
  - AI usage bar chart — tokens per agent over 30 days
  - Project list with details
- **What you can do:**
  - Scan for IDEs and development tools
  - Sync AI usage data from agents
  - View AI token costs per agent
  - Track commits and lines changed
- **Visual icons:** Code2, Cpu, Git

### Terminal & Agent Sessions
- **Icon:** Terminal | **Route:** `/ide` | **Status:** Released | **Category:** Tracker Mind
- **What it is:** Multi-pane AI-powered terminal with workspace tools
- **What you'll find:**
  - xterm.js terminal panes with split support
  - Session management — save, load, categorize
  - Project selector and status indicator
  - Instruction/compose panel for AI prompts
  - Context sidebar and problems workspace
  - 12 sidebar tabs: Presets, Sessions, Map, Analytics, etc.
- **What you can do:**
  - Split terminals for multitasking
  - Create AI agent sessions (5 agent types)
  - Bind problems to terminal sessions
  - Compose and send instructions to agents
  - Configure context systems per session
- **Visual icons:** Terminal, Users, Zap

### Context Management
- **Icon:** BookOpen | **Route:** `/ide` | **Status:** Released | **Category:** Tracker Mind
- **What it is:** 12 knowledge systems that feed context to AI agents
- **What you'll find:**
  - System toggle switches — Skills, Graphify, PARA, LLM Wiki, QMD, etc.
  - Token budget sliders per system
  - Model tier selector (top/mid/low)
  - Design skills configuration panel
- **What you can do:**
  - Toggle which systems contribute to agent context
  - Adjust token budgets per system
  - Configure design taste knobs and style references
  - All settings auto-save and sync to NewSessionDialog
- **Visual icons:** BookOpen, Layers, Sliders

### Problems & Requests
- **Icon:** AlertTriangle | **Route:** `/ide` | **Status:** Released | **Category:** Tracker Mind
- **What it is:** Bug tracker and feature request system — AI-managed
- **What you'll find:**
  - Problem list with status filters (All, Active, New, In Progress, Fixed)
  - Priority-coded border colors per issue
  - Checklist items and activity log
  - Problem detail modal with terminal integration
- **What you can do:**
  - Create new problems with priority levels
  - Assign problems to terminal sessions
  - Track status changes and checklist progress
  - Send instructions from problem to agent
- **Visual icons:** AlertTriangle, Check, FileText

### Design Skills System
- **Icon:** Palette | **Route:** `/ide` | **Status:** Beta | **Category:** Tracker Mind
- **What it is:** AI design intelligence with taste controls and style references
- **What you'll find:**
  - Taste knobs — sliders for controlling design output
  - Style references panel for branding consistency
  - 5 skill modules toggle
  - Google Stitch integration for screen generation
- **What you can do:**
  - Fine-tune AI design output with taste controls
  - Upload and manage style reference images
  - Toggle design skills for context assembly
  - Generate screens via Stitch integration
- **Visual icons:** Palette, Layout, Settings

### Skills Framework
- **Icon:** Sparkles | **Route:** `/ide` | **Status:** Released | **Category:** Tracker Mind
- **What it is:** Reusable SKILL.md files that define agent behaviors
- **What you'll find:**
  - Skills browser with toggle controls
  - Skill composition — stack multiple skills together
  - Per-skill configuration options
- **What you can do:**
  - Browse all available skills
  - Toggle skills on/off for context assembly
  - Create new skill definitions
  - Compose skill stacks for complex behaviors
- **Visual icons:** Sparkles, Layers, Grip

### Knowledge Graph
- **Icon:** Network | **Route:** `/ide` | **Status:** Beta | **Category:** Tracker Mind
- **What it is:** Auto-generated knowledge graphs from workspace code and conversations
- **What you'll find:**
  - AST analysis → code structure graph
  - Community detection → logical grouping of code
  - HTML graph viewer + JSON export
  - Audit reports for knowledge structure
- **What you can do:**
  - Rebuild graphs on demand
  - Export to HTML for visual browsing
  - Sync to Obsidian vault for persistent storage
  - View audit reports on graph health
- **Visual icons:** Network, Search, Layers

### Database Analytics
- **Icon:** Database | **Route:** `/database` | **Status:** Released | **Category:** Data
- **What it is:** Full analytics and data browser for all tracked data
- **What you'll find:**
  - Table browser with search/filter
  - Charts — tokens, costs, sessions, problems over time
  - Schema display with column names and types
  - Data table with pagination (50 rows per page)
  - CSV export button
- **What you can do:**
  - Browse any database table
  - View schemas and sample data
  - Export tables to CSV
  - Switch between analytics charts and raw table view
- **Visual icons:** Database, BarChart3, Search

### Settings
- **Icon:** Settings | **Route:** `/settings` | **Status:** Released | **Category:** Core
- **What it is:** Configure every aspect of the tracker
- **What you'll find:**
  - Category management — create, edit, color-code categories
  - Productivity tiers — drag-and-drop apps between productive/neutral/distracting
  - App carousel — browse all tracked apps, AI-categorize
  - Timer behavior config — what happens on neutral/distracting activity
  - Data management — sync mode, export, clear
  - Idle threshold and auto-start settings
- **What you can do:**
  - Create custom categories with custom colors
  - Drag apps between productivity tiers
  - Auto-categorize apps with AI
  - Configure timer pause/reset behavior
  - Export or clear tracked data
- **Visual icons:** Settings, Sliders, Cpu
