import type Database from 'better-sqlite3';

export function ensureFocusSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS deep_focus_sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at    TEXT NOT NULL,
      ended_at      TEXT,
      planned_sec   INTEGER NOT NULL,
      actual_sec    INTEGER,
      outcome       TEXT NOT NULL DEFAULT 'active',
      strictness    TEXT NOT NULL DEFAULT 'distracting',
      broke_on_type TEXT,
      broke_on_name TEXT,
      return_count  INTEGER NOT NULL DEFAULT 0,
      allowed_json  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_dfs_started ON deep_focus_sessions(started_at);

    CREATE TABLE IF NOT EXISTS deep_focus_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  INTEGER NOT NULL REFERENCES deep_focus_sessions(id) ON DELETE CASCADE,
      ts          TEXT NOT NULL,
      kind        TEXT NOT NULL,
      target_type TEXT,
      target_name TEXT
    );
  `);
}
