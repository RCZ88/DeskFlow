-- Lyceum hierarchy expansion: Branch → Group → Topic → Subtopic → Lesson → Node
-- NOTE: named 008 (not 007 as in RESULT.md) because 007_stats_and_motivation.sql already exists.
-- Idempotency: runMigration() runs EVERY .sql file on every startup. The first ALTER below
-- fails with "duplicate column" once this migration has been applied, and runMigration()
-- skips the rest of the file on that error — so the table swap below executes exactly ONCE.

-- 1. Branches catalog (predefined disciplines)
CREATE TABLE IF NOT EXISTS learn_branches (
  id          TEXT PRIMARY KEY,
  emoji       TEXT NOT NULL DEFAULT '📚',
  title       TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT 'clay',
  ord         INTEGER NOT NULL DEFAULT 0
);

-- 2. Seed the default branch so existing lessons have a home
INSERT OR IGNORE INTO learn_branches (id, emoji, title, description, color, ord)
VALUES ('cs-ai', '🤖', 'Computer Science & AI', 'Engineering, ML, and systems', 'clay', 0);

-- 3. Idempotency gate — once branch_id exists this throws "duplicate column" and the
--    rest of this file is skipped by runMigration (same mechanism migration 006 relies on).
ALTER TABLE learn_lessons ADD COLUMN branch_id TEXT DEFAULT 'cs-ai';

ALTER TABLE learn_lessons ADD COLUMN subtopic TEXT DEFAULT '';

-- 4. Rebuild learn_lessons once: drop CHECK(part BETWEEN 0 AND 10) (blocks parts 11-12),
--    keep chapter + original_prompt (006), add branch_id FK + subtopic.
--    PRAGMA foreign_keys = OFF is REQUIRED: with FKs ON, DROP TABLE performs an implicit
--    DELETE that would CASCADE into learn_nodes/prereqs/sources/chunks/progress/evidence.
PRAGMA foreign_keys = OFF;

ALTER TABLE learn_lessons RENAME TO learn_lessons_008_old;

CREATE TABLE learn_lessons (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  part            INTEGER NOT NULL,
  version         TEXT NOT NULL,
  summary         TEXT,
  authored_by     TEXT,
  doc_json        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  branch_id       TEXT NOT NULL DEFAULT 'cs-ai' REFERENCES learn_branches(id),
  subtopic        TEXT DEFAULT '',
  chapter         TEXT DEFAULT '',
  original_prompt TEXT DEFAULT '',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

INSERT INTO learn_lessons (
  id, title, part, version, summary, authored_by,
  doc_json, status, branch_id, subtopic, chapter, original_prompt,
  created_at, updated_at
)
SELECT
  id, title, part, version, summary, authored_by,
  doc_json, status, 'cs-ai', '', IFNULL(chapter, ''), IFNULL(original_prompt, ''),
  created_at, updated_at
FROM learn_lessons_008_old;

DROP TABLE learn_lessons_008_old;

PRAGMA foreign_keys = ON;

-- 5. Indexes for the new query patterns
CREATE INDEX IF NOT EXISTS idx_lessons_branch ON learn_lessons(branch_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON learn_lessons(chapter);
CREATE INDEX IF NOT EXISTS idx_lessons_subtopic ON learn_lessons(subtopic);
CREATE INDEX IF NOT EXISTS idx_lessons_branch_part ON learn_lessons(branch_id, part);
