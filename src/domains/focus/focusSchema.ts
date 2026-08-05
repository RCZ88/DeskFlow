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

    CREATE TABLE IF NOT EXISTS focus_groups (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      description     TEXT,
      allowed_apps    TEXT NOT NULL DEFAULT '[]',
      allowed_domains TEXT NOT NULL DEFAULT '[]',
      allowed_categories TEXT NOT NULL DEFAULT '[]',
      strictness      TEXT NOT NULL DEFAULT 'distracting',
      default_duration INTEGER,
      created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_fg_name ON focus_groups(name);

    CREATE TABLE IF NOT EXISTS focus_group_usage (
      group_id   INTEGER NOT NULL REFERENCES focus_groups(id) ON DELETE CASCADE,
      session_id INTEGER NOT NULL REFERENCES deep_focus_sessions(id) ON DELETE CASCADE,
      goal_ids   TEXT,
      used_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (group_id, session_id)
    );
  `);

  // Migration for existing DBs: add goal_ids column if missing
  const usageCols = db.prepare('PRAGMA table_info(focus_group_usage)').all() as any[];
  if (usageCols.length > 0 && !usageCols.some(c => c.name === 'goal_ids')) {
    try {
      db.exec('ALTER TABLE focus_group_usage ADD COLUMN goal_ids TEXT');
    } catch {
      /* column already added */
    }
  }
}

