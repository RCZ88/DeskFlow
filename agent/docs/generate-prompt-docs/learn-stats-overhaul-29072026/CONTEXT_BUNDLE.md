# Context Bundle — Lyceum Learn Stats Overhaul

## Current State (What Exists)

### Backend Data Available
- `learn_sessions` table: date, duration, nodes_seen (JSON), quizzes_taken, cards_reviewed, mastery_gained
- `learn_progress` table: node_id, level, stability, last_seen, due_at, belief
- `learn_evidence` table: quiz/assessment results with outcome scores
- `learn_card_reviews` table: flashcard review history
- `learn_actions` table: user questions + AI answers (tutor interactions)
- `learn_notes` table: user annotations
- `learn_conversations` table: multi-turn dialogues

### Frontend Components
- `ProgressDashboard` — heatmap + 4 stat cards + active learning + most studied
- `MasteryStrip` — mastery ring + level distribution + due reviews
- `TutorDashboardSection` — tutor stats + notes + conversations
- `HeatmapBlock` — GitHub-style 90-day heatmap
- `MasteryRing` — SVG progress ring per level
- `StudyView` — flashcard review with NO timer

### IPC Endpoints
- `learnGetTutorDashboard` — returns aggregate stats
- `learnGetStudyHeatmap` — returns heatmap cells
- `learnGetProgress` — returns all node progress
- `learnGetDeckStats` — per-deck card stats

### Design System
- Colors: clay (#c2553a), sage (#6fb38f), amber (#fbbf24), sky (#5ab0c9)
- Fonts: Source Serif 4 (headings), Inter (body), JetBrains Mono (mono)
- Animations: framer-motion with springy/lift/tap presets
- CSS vars: --bg-primary (#141211), --bg-secondary (#1c1917), --accent-primary (#d97706)

## What's MISSING (Gaps to Fill)

### Critical Gaps
1. **No study timer** — StudyView has no time tracking. Focus timer exists in main app but not learn-specific
2. **Streak hardcoded to 0** — DashboardService line 32: `streak_days = 0`
3. **No daily study time tracking** — `learn_sessions.duration` exists but no real-time timer writes to it
4. **No goal-setting in Learn** — Goal system exists in AiPage but not connected to learn
5. **No weekly/monthly analytics** — Only flat 90-day heatmap, no time-bucketed aggregations
6. **No learning velocity** — No cards/day, mastery points/week calculations
7. **avg_confidence hardcoded to 0.72** — Not computed from real belief data
8. **No per-lesson analytics** — No breakdown per lesson/chapter
9. **No study session history** — Can't see past study sessions with details

### Feature Opportunities
1. **Study Timer** — Start/stop timer when studying a lesson, auto-log to learn_sessions
2. **Daily Goals** — "Study 30 minutes today" / "Review 20 cards" / "Complete 2 nodes"
3. **Weekly Streaks** — Visual streak counter with fire animation
4. **Per-Lesson Stats** — Time spent, quizzes completed, mastery gained per lesson
5. **Learning Velocity** — Cards/day, nodes/week, mastery points trend
6. **Achievement Badges** — Milestones like "First Lesson Complete", "100 Cards Reviewed"
7. **Study Session History** — Log of past sessions with duration, what was studied
8. **Focus Mode** — Pomodoro-style timer integrated with study view
9. **Leaderboard/Comparison** — Compare progress over time (self-comparison)
10. **Smart Recommendations** — "You haven't reviewed X in 5 days" / "Y is due for review"

## Tech Stack
- React 18 + TypeScript
- Framer Motion 12
- Tailwind CSS
- better-sqlite3 (backend)
- IPC via electron
