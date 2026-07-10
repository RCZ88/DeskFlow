// Typed query layer for the Lyceum Learn module
// All SQL goes through here — services call repo functions, never raw SQL

import type Database from 'better-sqlite3';

export function runMigration(db: Database) {
  const fs = require('fs');
  const path = require('path');
  const sqlPath = path.join(__dirname, 'migrations/001_learn.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  db.exec(sql);
}

// ── Lessons ──

export function upsertLesson(db: Database, lesson: {
  id: string; title: string; part: number; version: string;
  summary?: string; authored_by?: string; doc_json: string;
  status?: string; created_at: string; updated_at: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO learn_lessons (id, title, part, version, summary, authored_by, doc_json, status, created_at, updated_at)
    VALUES (@id, @title, @part, @version, @summary, @authored_by, @doc_json, @status, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title = @title, part = @part, version = @version, summary = @summary,
      authored_by = @authored_by, doc_json = @doc_json, status = @status, updated_at = @updated_at
  `);
  stmt.run({
    id: lesson.id, title: lesson.title, part: lesson.part, version: lesson.version,
    summary: lesson.summary || null, authored_by: lesson.authored_by || null,
    doc_json: lesson.doc_json, status: lesson.status || 'draft',
    created_at: lesson.created_at, updated_at: lesson.updated_at,
  });
}

export function listLessons(db: Database, part?: number) {
  if (part != null) {
    return db.prepare('SELECT id, title, part, version, status, created_at, updated_at FROM learn_lessons WHERE part = ? ORDER BY created_at DESC').all(part);
  }
  return db.prepare('SELECT id, title, part, version, status, created_at, updated_at FROM learn_lessons ORDER BY part ASC, created_at DESC').all();
}

export function getLesson(db: Database, lessonId: string) {
  return db.prepare('SELECT * FROM learn_lessons WHERE id = ?').get(lessonId);
}

// ── Nodes ──

export function insertNode(db: Database, node: {
  id: string; lesson_id: string; title: string; mastery_target: string;
  content_hash: string; ord: number; blocks_json: string; grounding_json: string;
}) {
  db.prepare(`
    INSERT INTO learn_nodes (id, lesson_id, title, mastery_target, content_hash, ord, blocks_json, grounding_json)
    VALUES (@id, @lesson_id, @title, @mastery_target, @content_hash, @ord, @blocks_json, @grounding_json)
  `).run(node);
}

export function getNodesByLesson(db: Database, lessonId: string) {
  return db.prepare('SELECT * FROM learn_nodes WHERE lesson_id = ? ORDER BY ord ASC').all(lessonId);
}

export function getNode(db: Database, nodeId: string) {
  return db.prepare('SELECT * FROM learn_nodes WHERE id = ?').get(nodeId);
}

// ── Prereqs ──

export function insertPrereq(db: Database, nodeId: string, prereqId: string) {
  db.prepare('INSERT OR IGNORE INTO learn_node_prereqs (node_id, prereq_id) VALUES (?, ?)').run(nodeId, prereqId);
}

export function deletePrereqsForNode(db: Database, nodeId: string) {
  db.prepare('DELETE FROM learn_node_prereqs WHERE node_id = ?').run(nodeId);
}

// ── Sources ──

export function insertSource(db: Database, source: {
  id: string; node_id: string; url: string; title?: string;
  kind?: string; license?: string; retrieved?: string;
}) {
  db.prepare(`
    INSERT OR REPLACE INTO learn_sources (id, node_id, url, title, kind, license, retrieved)
    VALUES (@id, @node_id, @url, @title, @kind, @license, @retrieved)
  `).run(source);
}

// ── Chunks ──

export function deleteChunksForNode(db: Database, nodeId: string) {
  db.prepare('DELETE FROM learn_chunks WHERE node_id = ?').run(nodeId);
}

export function insertChunk(db: Database, chunk: {
  node_id: string; block_id?: string; kind: string; text: string; source_id?: string;
}) {
  const cols = ['node_id', 'kind', 'text'];
  const vals = ['@node_id', '@kind', '@text'];
  const params: Record<string, any> = { node_id: chunk.node_id, kind: chunk.kind, text: chunk.text };
  if (chunk.block_id != null) { cols.push('block_id'); vals.push('@block_id'); params.block_id = chunk.block_id; }
  if (chunk.source_id != null) { cols.push('source_id'); vals.push('@source_id'); params.source_id = chunk.source_id; }
  db.prepare(`INSERT INTO learn_chunks (${cols.join(', ')}) VALUES (${vals.join(', ')})`).run(params);
}

// ── Progress ──

export function getProgress(db: Database, nodeId: string) {
  return db.prepare('SELECT * FROM learn_progress WHERE node_id = ?').get(nodeId);
}

export function getAllProgress(db: Database) {
  return db.prepare('SELECT * FROM learn_progress').all();
}

export function upsertProgress(db: Database, data: {
  node_id: string; level: string; belief_json: string;
  stability: number; last_seen?: string; due_at?: string;
}) {
  db.prepare(`
    INSERT INTO learn_progress (node_id, level, belief_json, stability, last_seen, due_at)
    VALUES (@node_id, @level, @belief_json, @stability, @last_seen, @due_at)
    ON CONFLICT(node_id) DO UPDATE SET
      level = @level, belief_json = @belief_json, stability = @stability,
      last_seen = @last_seen, due_at = @due_at
  `).run(data);
}

// ── Evidence ──

export function insertEvidence(db: Database, evidence: {
  node_id: string; ts: string; source: string; target_level: string;
  outcome: string; detail_json?: string;
}) {
  return db.prepare(`
    INSERT INTO learn_evidence (node_id, ts, source, target_level, outcome, detail_json)
    VALUES (@node_id, @ts, @source, @target_level, @outcome, @detail_json)
  `).run(evidence);
}

export function getEvidenceForNode(db: Database, nodeId: string) {
  return db.prepare('SELECT * FROM learn_evidence WHERE node_id = ? ORDER BY ts DESC').all(nodeId);
}

// ── Tutor Cache ──

export function getTutorCache(db: Database, key: string) {
  return db.prepare('SELECT * FROM learn_tutor_cache WHERE key = ?').get(key);
}

export function setTutorCache(db: Database, data: {
  key: string; node_id: string; answer_json: string; model: string; created_at: string;
}) {
  db.prepare(`
    INSERT OR REPLACE INTO learn_tutor_cache (key, node_id, answer_json, model, created_at)
    VALUES (@key, @node_id, @answer_json, @model, @created_at)
  `).run(data);
}

// ── Graph (prereq DAG) ──

export function getGraph(db: Database, part?: number) {
  let nodesQuery = 'SELECT n.id, n.title, n.mastery_target, l.part FROM learn_nodes n JOIN learn_lessons l ON n.lesson_id = l.id';
  if (part != null) {
    nodesQuery += ' WHERE l.part = ?';
  }
  const nodes = part != null
    ? db.prepare(nodesQuery).all(part)
    : db.prepare(nodesQuery).all();

  const edges = db.prepare(`
    SELECT np.node_id as "to", np.prereq_id as "from"
    FROM learn_node_prereqs np
    JOIN learn_nodes n ON np.node_id = n.id
    JOIN learn_lessons l ON n.lesson_id = l.id
    ${part != null ? 'WHERE l.part = ?' : ''}
  `).all(part != null ? part : undefined);

  return { nodes, edges };
}

// ── Due reviews ──

export function getDueReviews(db: Database) {
  const now = new Date().toISOString();
  return db.prepare(`
    SELECT np.node_id as id, nn.title, nn.lesson_id, np.due_at
    FROM learn_progress np
    JOIN learn_nodes nn ON np.node_id = nn.id
    WHERE np.due_at IS NOT NULL AND np.due_at <= ?
    ORDER BY np.due_at ASC
  `).all(now);
}
