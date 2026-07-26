-- Phase 0: Relax ai_chat_messages role CHECK constraint
-- SQLite doesn't support ALTER CHECK, so we recreate the table

CREATE TABLE IF NOT EXISTS ai_chat_messages_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_date TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  parsed_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ai_chat_messages_new (id, thread_date, role, content, parsed_json, created_at)
SELECT id, thread_date, role, content, parsed_json, created_at
FROM ai_chat_messages;

DROP TABLE ai_chat_messages;

ALTER TABLE ai_chat_messages_new RENAME TO ai_chat_messages;

CREATE INDEX IF NOT EXISTS idx_ai_chat_thread_date ON ai_chat_messages(thread_date);
