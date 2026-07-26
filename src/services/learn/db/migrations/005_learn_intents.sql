-- Migration 005: Learning Intents (saved ideas for future lessons)

CREATE TABLE IF NOT EXISTS learn_intents (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  context     TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'idea',
  status      TEXT NOT NULL DEFAULT 'saved',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intents_status ON learn_intents(status);
CREATE INDEX IF NOT EXISTS idx_intents_created ON learn_intents(created_at);
