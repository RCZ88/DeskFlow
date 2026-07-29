-- Migration 007: Stats & Motivation System
-- Goals, streaks, achievements, per-lesson stats, timer queue

-- Goals system
CREATE TABLE IF NOT EXISTS learn_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL CHECK(type IN ('daily','weekly','custom')),
  metric TEXT NOT NULL CHECK(metric IN ('study_minutes','cards_reviewed','nodes_completed','lessons_completed','quizzes_passed','mastery_points')),
  target INTEGER NOT NULL,
  current INTEGER NOT NULL DEFAULT 0,
  period_start TEXT NOT NULL,
  period_end TEXT,
  deadline TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learn_goals_period ON learn_goals(period_start, type);

-- Streak tracking
CREATE TABLE IF NOT EXISTS learn_streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date TEXT,
  streak_freezes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Achievements / badges
CREATE TABLE IF NOT EXISTS learn_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  badge_key TEXT NOT NULL,
  earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  viewed_at TEXT
);

-- Per-lesson analytics
CREATE TABLE IF NOT EXISTS learn_lesson_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL,
  total_study_seconds INTEGER NOT NULL DEFAULT 0,
  sessions_count INTEGER NOT NULL DEFAULT 0,
  quizzes_taken INTEGER NOT NULL DEFAULT 0,
  quizzes_correct INTEGER NOT NULL DEFAULT 0,
  cards_reviewed INTEGER NOT NULL DEFAULT 0,
  cards_created INTEGER NOT NULL DEFAULT 0,
  mastery_gained REAL NOT NULL DEFAULT 0,
  last_studied_at TEXT,
  first_studied_at TEXT,
  UNIQUE(lesson_id)
);

-- Timer event queue (offline resilience)
CREATE TABLE IF NOT EXISTS learn_timer_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL CHECK(event_type IN ('start','pause','resume','stop')),
  lesson_id INTEGER,
  timestamp TEXT NOT NULL,
  duration_delta INTEGER,
  synced INTEGER NOT NULL DEFAULT 0
);

-- Velocity snapshots
CREATE TABLE IF NOT EXISTS learn_velocity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  computed_at TEXT NOT NULL,
  cards_per_day REAL,
  nodes_per_week REAL,
  mastery_per_week REAL,
  avg_session_minutes REAL,
  study_days_per_week REAL
);
