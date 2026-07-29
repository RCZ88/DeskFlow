# Lyceum Learn Stats & Motivation Overhaul — Design Prompt

## Raw Request
"Create a stats feature for learning with stopwatch infrastructure, study goals, time tracking per book/chapter, AI question stats, per-book analytics, and motivation features. Use all frontend skills (humancentred-UIUX, impeccable, magicui, 21st.dev, frontend-external-infra) to design the best possible UI."

## Context
Read `CONTEXT_BUNDLE.md` for the complete current state, gaps, and available data.

## The Mandate
Design a **comprehensive stats and motivation system** for Lyceum Learn that transforms passive learning data into active motivation. The system must:

1. **Track study time** with a real-time stopwatch integrated into the study flow
2. **Set and track daily/weekly goals** (time, cards, nodes, quizzes)
3. **Show per-lesson analytics** (time spent, mastery gained, questions asked)
4. **Calculate learning velocity** (cards/day, nodes/week, mastery trend)
5. **Visualize progress** with streaks, achievements, and trend charts
6. **Motivate through design** — warm, encouraging, not clinical

## Design Requirements

### A. Study Timer (Core Infrastructure)
- **Stopwatch** that starts when user opens a lesson to study
- **Auto-pauses** when user switches away from the app
- **Logs to learn_sessions** table with duration, nodes seen, quizzes taken
- **Visual indicator** — small pill in header showing elapsed time
- **Pomodoro mode** — optional 25/5 minute cycles with break reminders

### B. Goal System
- **Daily goals**: Study X minutes, Review Y cards, Complete Z nodes
- **Weekly goals**: Maintain streak, Master N nodes, Complete 1 lesson
- **Custom goals**: User-defined targets with deadlines
- **Progress rings** showing % completion toward each goal
- **Smart suggestions**: "Based on your pace, you could master 3 nodes this week"

### C. Analytics Dashboard (New View)
A dedicated analytics page with:
1. **Overview cards**: Total study time, Cards reviewed, Nodes mastered, Current streak
2. **Study heatmap** (existing, enhanced with tooltips)
3. **Time distribution chart**: Bar chart showing study time by day of week
4. **Mastery progression**: Line chart showing level distribution over time
5. **Per-lesson breakdown**: Table/cards showing stats per lesson
6. **Learning velocity**: Cards/day trend, mastery points/week
7. **AI interaction stats**: Questions asked, Tutor answers, Confidence trend

### D. Motivation Features
1. **Streak counter** with fire animation and "Don't break the chain" messaging
2. **Achievement badges**: milestones with icons and descriptions
3. **Weekly digest**: "This week you mastered 5 nodes and reviewed 50 cards"
4. **Comparison graphs**: This week vs last week, This month vs last month
5. **Encouraging messages**: Context-aware nudges based on activity

### E. Per-Lesson Analytics
When viewing a lesson, show:
- Time spent studying this lesson
- Quizzes completed (correct/total)
- Mastery level achieved
- Cards created/reviewed
- Last studied timestamp
- "Continue where you left off" prompt

## UI/UX Guidelines

### Design System
- Use warm wood palette (clay, sage, amber)
- Serif headings, mono labels, sans-serif body
- Glass card aesthetic with backdrop blur
- Spring animations for interactions
- Progressive disclosure for complex data

### Charts & Visualizations
- Use recharts or visx for charts (already installed)
- Heatmap for study activity (existing component)
- Progress rings for goals (existing MasteryRing)
- Bar charts for time distribution
- Line charts for trends
- Sparklines for quick trends

### Motivation Psychology
- Show progress, not just raw numbers
- Celebrate small wins (first card reviewed, streak day 3)
- Use loss aversion (streak protection messaging)
- Social proof (even if self-comparison: "You're 20% ahead of last week")
- Variable reward schedules (unexpected achievements)

## Deliverables
Provide:
1. **Component architecture** — file structure, component hierarchy
2. **Data model** — new DB tables/fields needed
3. **IPC endpoints** — new handlers needed
4. **UI specifications** — exact layouts, charts, interactions for each section
5. **Implementation plan** — ordered phases for building this

## Constraints
- Must work with existing better-sqlite3 backend
- Must use existing design tokens and animation libraries
- Must be responsive (mobile + desktop)
- Must not break existing Learn functionality
- Must handle offline gracefully (queue timer events)
