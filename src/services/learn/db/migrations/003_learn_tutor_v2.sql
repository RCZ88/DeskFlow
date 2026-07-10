-- Lyceum Learn module — Tutor V2: notes, actions, conversations, permissions

CREATE TABLE IF NOT EXISTS learn_notes (
  id        TEXT PRIMARY KEY,
  node_id   TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  ts        TEXT NOT NULL,
  text      TEXT NOT NULL,
  tags_json TEXT,
  pinned    INTEGER NOT NULL DEFAULT 0,
  block_ref TEXT
);

CREATE TABLE IF NOT EXISTS learn_actions (
  id         INTEGER PRIMARY KEY,
  node_id    TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  block_id   TEXT,
  role       TEXT NOT NULL,
  ts         TEXT NOT NULL,
  text       TEXT NOT NULL,
  meta_json  TEXT
);

CREATE TABLE IF NOT EXISTS learn_conversations (
  id        TEXT PRIMARY KEY,
  node_id   TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  block_id  TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learn_permissions (
  key       TEXT PRIMARY KEY,
  resource  TEXT NOT NULL,
  grant     TEXT NOT NULL DEFAULT 'ask',
  rationale TEXT
);

CREATE INDEX IF NOT EXISTS idx_notes_node     ON learn_notes(node_id);
CREATE INDEX IF NOT EXISTS idx_actions_node   ON learn_actions(node_id);
CREATE INDEX IF NOT EXISTS idx_conversations_node ON learn_conversations(node_id);
