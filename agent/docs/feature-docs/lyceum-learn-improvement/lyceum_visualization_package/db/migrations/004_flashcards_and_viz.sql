-- Migration 004: Flashcards, Active Recall, and Visualization State

CREATE TABLE IF NOT EXISTS learn_decks (
  id          TEXT PRIMARY KEY,
  lesson_id   TEXT REFERENCES learn_lessons(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  node_ids    TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learn_cards (
  id          TEXT PRIMARY KEY,
  deck_id     TEXT NOT NULL REFERENCES learn_decks(id) ON DELETE CASCADE,
  card_type   TEXT NOT NULL DEFAULT 'basic',
  front       TEXT NOT NULL,
  back        TEXT NOT NULL,
  front_media TEXT,
  back_media  TEXT,
  tags        TEXT NOT NULL DEFAULT '[]',
  due         TEXT,
  stability   REAL NOT NULL DEFAULT 0,
  difficulty  REAL NOT NULL DEFAULT 0,
  elapsed_days INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  reps        INTEGER NOT NULL DEFAULT 0,
  lapses      INTEGER NOT NULL DEFAULT 0,
  state       INTEGER NOT NULL DEFAULT 0,
  last_review TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learn_card_reviews (
  id          INTEGER PRIMARY KEY,
  card_id     TEXT NOT NULL REFERENCES learn_cards(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL,
  review_date TEXT NOT NULL,
  scheduled_days INTEGER,
  elapsed_days INTEGER,
  stability   REAL,
  difficulty  REAL,
  state       INTEGER
);

CREATE TABLE IF NOT EXISTS learn_viz_state (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL DEFAULT 'default',
  viz_type    TEXT NOT NULL,
  viz_id      TEXT NOT NULL,
  state_json  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learn_sessions (
  id             INTEGER PRIMARY KEY,
  date           TEXT NOT NULL,
  duration       INTEGER NOT NULL DEFAULT 0,
  nodes_seen     TEXT NOT NULL DEFAULT '[]',
  quizzes_taken  INTEGER NOT NULL DEFAULT 0,
  cards_reviewed INTEGER NOT NULL DEFAULT 0,
  mastery_gained TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_cards_due ON learn_cards(due);
CREATE INDEX IF NOT EXISTS idx_cards_deck ON learn_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_state ON learn_cards(state);
CREATE INDEX IF NOT EXISTS idx_reviews_card ON learn_card_reviews(card_id);
CREATE INDEX IF NOT EXISTS idx_reviews_date ON learn_card_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON learn_sessions(date);
CREATE INDEX IF NOT EXISTS idx_viz_state_user ON learn_viz_state(user_id, viz_type);
