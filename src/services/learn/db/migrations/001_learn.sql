-- Lyceum Learn module — initial schema migration
-- Run once at startup if tables don't exist

CREATE TABLE IF NOT EXISTS learn_lessons (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  part         INTEGER NOT NULL CHECK(part BETWEEN 0 AND 10),
  version      TEXT NOT NULL,
  summary      TEXT,
  authored_by  TEXT,
  doc_json     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learn_nodes (
  id             TEXT PRIMARY KEY,
  lesson_id      TEXT NOT NULL REFERENCES learn_lessons(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  mastery_target TEXT NOT NULL,
  content_hash   TEXT NOT NULL,
  ord            INTEGER NOT NULL,
  blocks_json    TEXT NOT NULL,
  grounding_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learn_node_prereqs (
  node_id    TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  prereq_id  TEXT NOT NULL,
  PRIMARY KEY (node_id, prereq_id)
);

CREATE TABLE IF NOT EXISTS learn_sources (
  id        TEXT NOT NULL,
  node_id   TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  url       TEXT NOT NULL,
  title     TEXT,
  kind      TEXT,
  license   TEXT,
  retrieved TEXT,
  PRIMARY KEY (node_id, id)
);

CREATE TABLE IF NOT EXISTS learn_chunks (
  rowid     INTEGER PRIMARY KEY,
  node_id   TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  block_id  TEXT,
  kind      TEXT NOT NULL,
  text      TEXT NOT NULL,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS learn_progress (
  node_id     TEXT PRIMARY KEY REFERENCES learn_nodes(id) ON DELETE CASCADE,
  level       TEXT NOT NULL DEFAULT 'L0',
  belief_json TEXT NOT NULL,
  stability   REAL NOT NULL DEFAULT 0,
  last_seen   TEXT,
  due_at      TEXT
);

CREATE TABLE IF NOT EXISTS learn_evidence (
  id           INTEGER PRIMARY KEY,
  node_id      TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  ts           TEXT NOT NULL,
  source       TEXT NOT NULL,
  target_level TEXT NOT NULL,
  outcome      TEXT NOT NULL,
  detail_json  TEXT
);

CREATE TABLE IF NOT EXISTS learn_tutor_cache (
  key           TEXT PRIMARY KEY,
  node_id       TEXT NOT NULL,
  answer_json   TEXT NOT NULL,
  model         TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learn_media_cache (
  url          TEXT PRIMARY KEY,
  status       INTEGER,
  content_type TEXT,
  checked_at   TEXT,
  local_path   TEXT
);

CREATE INDEX IF NOT EXISTS idx_nodes_lesson ON learn_nodes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_chunks_node  ON learn_chunks(node_id);
CREATE INDEX IF NOT EXISTS idx_progress_due ON learn_progress(due_at);
CREATE INDEX IF NOT EXISTS idx_evidence_node ON learn_evidence(node_id);
