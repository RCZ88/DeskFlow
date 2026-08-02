import type Database from 'better-sqlite3';

export function ensureCompositionsSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS composition_rules (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT,
      dsl_source    TEXT NOT NULL,
      version       INTEGER NOT NULL DEFAULT 1,
      enabled       INTEGER NOT NULL DEFAULT 1,
      priority      INTEGER NOT NULL DEFAULT 500,
      category      TEXT NOT NULL DEFAULT 'general',
      lifecycle     TEXT NOT NULL DEFAULT 'manual',
      schedule_cron TEXT,
      schedule_tz   TEXT,
      compiled_ast  TEXT,
      metadata      TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_cr_enabled ON composition_rules(enabled);
    CREATE INDEX IF NOT EXISTS idx_cr_category ON composition_rules(category);
    CREATE INDEX IF NOT EXISTS idx_cr_lifecycle ON composition_rules(lifecycle);

    CREATE TABLE IF NOT EXISTS composition_versions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id       TEXT NOT NULL REFERENCES composition_rules(id) ON DELETE CASCADE,
      version       INTEGER NOT NULL,
      dsl_source    TEXT NOT NULL,
      compiled_ast  TEXT,
      changelog     TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_cv_rule ON composition_versions(rule_id);

    CREATE TABLE IF NOT EXISTS composition_schedules (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id       TEXT NOT NULL REFERENCES composition_rules(id) ON DELETE CASCADE,
      cron          TEXT NOT NULL,
      timezone      TEXT NOT NULL DEFAULT 'UTC',
      next_run      TEXT,
      last_run      TEXT,
      enabled       INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_cs_next ON composition_schedules(next_run);
    CREATE INDEX IF NOT EXISTS idx_cs_rule ON composition_schedules(rule_id);

    CREATE TABLE IF NOT EXISTS composition_conditions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id       TEXT NOT NULL REFERENCES composition_rules(id) ON DELETE CASCADE,
      parent_id     INTEGER REFERENCES composition_conditions(id) ON DELETE CASCADE,
      operator      TEXT NOT NULL,
      field         TEXT,
      cond_type     TEXT,
      cond_value    TEXT,
      sort_order    INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_cc_rule ON composition_conditions(rule_id);

    CREATE TABLE IF NOT EXISTS composition_actions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id       TEXT NOT NULL REFERENCES composition_rules(id) ON DELETE CASCADE,
      action_name   TEXT NOT NULL,
      params_json   TEXT NOT NULL DEFAULT '{}',
      sort_order    INTEGER NOT NULL DEFAULT 0,
      error_handling TEXT NOT NULL DEFAULT 'abort',
      fallback_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ca_rule ON composition_actions(rule_id);

    CREATE TABLE IF NOT EXISTS composition_tag_links (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id       TEXT NOT NULL REFERENCES composition_rules(id) ON DELETE CASCADE,
      tag           TEXT NOT NULL,
      UNIQUE(rule_id, tag)
    );

    CREATE INDEX IF NOT EXISTS idx_ctl_tag ON composition_tag_links(tag);

    CREATE TABLE IF NOT EXISTS composition_execution_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id       TEXT NOT NULL,
      action_id     INTEGER,
      action_name   TEXT,
      status        TEXT NOT NULL DEFAULT 'pending',
      input_snapshot TEXT,
      result        TEXT,
      error         TEXT,
      duration_ms   INTEGER,
      started_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      completed_at  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cel_rule ON composition_execution_log(rule_id);
    CREATE INDEX IF NOT EXISTS idx_cel_status ON composition_execution_log(status);
    CREATE INDEX IF NOT EXISTS idx_cel_started ON composition_execution_log(started_at);

    CREATE TABLE IF NOT EXISTS composition_event_outbox (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      topic         TEXT NOT NULL,
      source        TEXT NOT NULL,
      payload_json  TEXT NOT NULL,
      dedupe_key    TEXT,
      ttl_ms        INTEGER,
      status        TEXT NOT NULL DEFAULT 'pending',
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_ceo_status ON composition_event_outbox(status);
    CREATE INDEX IF NOT EXISTS idx_ceo_topic ON composition_event_outbox(topic);

    CREATE TABLE IF NOT EXISTS composition_execution_status (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id       TEXT NOT NULL REFERENCES composition_rules(id) ON DELETE CASCADE,
      last_status   TEXT NOT NULL DEFAULT 'idle',
      last_error    TEXT,
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      last_run_at   TEXT,
      next_scheduled_at TEXT,
      UNIQUE(rule_id)
    );

    CREATE TABLE IF NOT EXISTS composition_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO composition_settings (key, value) VALUES ('enabled', 'true');
    INSERT OR IGNORE INTO composition_settings (key, value) VALUES ('max_rules', '200');
    INSERT OR IGNORE INTO composition_settings (key, value) VALUES ('default_timezone', 'UTC');
    INSERT OR IGNORE INTO composition_settings (key, value) VALUES ('event_ttl_ms', '300000');
  `);
}
