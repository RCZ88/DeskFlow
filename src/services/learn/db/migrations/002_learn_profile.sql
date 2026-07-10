-- Lyceum Learn module — learner profile migration
-- Moves durable learner state from localStorage to SQLite

CREATE TABLE IF NOT EXISTS learn_profile (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
