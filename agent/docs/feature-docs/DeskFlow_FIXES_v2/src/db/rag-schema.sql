/**
 * RAG Index Database Schema
 * 
 * SQLite schema for storing and indexing AI session messages.
 * Used for semantic search, full-text search, and context retrieval.
 * Location: src/db/rag-schema.sql
 */

-- ──────────────────────────────────────────────────────────────
-- Messages Table (Core)
-- ──────────────────────────────────────────────────────────────
-- Stores all messages from AI sessions with metadata and embedding
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,  -- Unix timestamp
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  
  -- Vector embedding for semantic search (stored as BLOB)
  -- Float32Array serialized, NULL if not yet embedded
  embedding BLOB,
  
  -- JSON metadata
  metadata TEXT,  -- JSON: {category, productArea, problemId, requestId, sessionStatus, agentName, tags}
  
  -- Audit
  created_at INTEGER NOT NULL,  -- Unix timestamp
  
  -- Indexing support
  content_length INTEGER NOT NULL,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Full-text search virtual table (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  id UNINDEXED,
  content,
  metadata,
  content=messages,
  content_rowid=rowid,
  tokenize = 'porter'
);

-- Trigger to keep FTS5 index in sync
CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, id, content, metadata)
  VALUES (new.rowid, new.id, new.content, new.metadata);
END;

CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, id, content, metadata)
  VALUES('delete', old.rowid, old.id, old.content, old.metadata);
END;

CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, id, content, metadata)
  VALUES('delete', old.rowid, old.id, old.content, old.metadata);
  INSERT INTO messages_fts(rowid, id, content, metadata)
  VALUES (new.rowid, new.id, new.content, new.metadata);
END;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ──────────────────────────────────────────────────────────────
-- Sessions Table
-- ──────────────────────────────────────────────────────────────
-- Tracks individual AI agent sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,  -- 'opencode', 'claude', 'codex', etc.
  started_at INTEGER NOT NULL,  -- Unix timestamp
  ended_at INTEGER,
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  metadata TEXT,  -- JSON: {topic, model, cost_usd, etc.}
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- ──────────────────────────────────────────────────────────────
-- Contexts Table
-- ──────────────────────────────────────────────────────────────
-- Tracks active project contexts (skills, graphify, wiki, etc.)
CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'design', 'architecture', 'wiki', 'skill', 'research', 'other'
  type TEXT NOT NULL,  -- 'llm-wiki', 'graphify', 'skill', 'qmd', 'other'
  source_file TEXT NOT NULL,  -- Path to source file
  tokens INTEGER NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  last_updated INTEGER NOT NULL,  -- Unix timestamp
  created_at INTEGER NOT NULL,
  
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_contexts_project_id ON contexts(project_id);
CREATE INDEX IF NOT EXISTS idx_contexts_type ON contexts(type);
CREATE INDEX IF NOT EXISTS idx_contexts_enabled ON contexts(enabled);

-- ──────────────────────────────────────────────────────────────
-- Compactions Table
-- ──────────────────────────────────────────────────────────────
-- Tracks message compactions (monthly summaries)
CREATE TABLE IF NOT EXISTS compactions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  compact_date INTEGER NOT NULL,  -- Unix timestamp
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  
  -- Input
  input_message_count INTEGER NOT NULL,
  input_tokens INTEGER NOT NULL,
  
  -- Output
  output_summary_tokens INTEGER NOT NULL,
  removed_message_ids TEXT NOT NULL,  -- JSON array of IDs
  compression_ratio REAL NOT NULL,
  
  -- Summary content
  summary_file TEXT NOT NULL,  -- Path to markdown summary
  key_decisions TEXT,  -- JSON array
  patterns TEXT,  -- JSON array
  anti_patterns TEXT,  -- JSON array
  
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compactions_project_id ON compactions(project_id);
CREATE INDEX IF NOT EXISTS idx_compactions_compact_date ON compactions(compact_date);
CREATE INDEX IF NOT EXISTS idx_compactions_period ON compactions(period_start, period_end);

-- ──────────────────────────────────────────────────────────────
-- Context Manifests Table
-- ──────────────────────────────────────────────────────────────
-- Stores ProjectContextManifest JSON documents for each project
CREATE TABLE IF NOT EXISTS context_manifests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  manifest_json TEXT NOT NULL,  -- Full ProjectContextManifest as JSON
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_context_manifests_project_id ON context_manifests(project_id);

-- ──────────────────────────────────────────────────────────────
-- Embedding Cache Table (Optional)
-- ──────────────────────────────────────────────────────────────
-- For semantic search, we may cache embeddings separately if needed
CREATE TABLE IF NOT EXISTS embeddings (
  message_id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL,  -- Float32Array
  model TEXT NOT NULL,  -- 'text-embedding-3-small', etc.
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_embeddings_message_id ON embeddings(message_id);

-- ──────────────────────────────────────────────────────────────
-- Session Context Tracking Table
-- ──────────────────────────────────────────────────────────────
-- Tracks which contexts are active in each session
CREATE TABLE IF NOT EXISTS session_contexts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  context_id TEXT NOT NULL,
  tokens_used INTEGER,
  added_at INTEGER NOT NULL,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE,
  UNIQUE(session_id, context_id)
);

CREATE INDEX IF NOT EXISTS idx_session_contexts_session_id ON session_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_session_contexts_context_id ON session_contexts(context_id);

-- ──────────────────────────────────────────────────────────────
-- Metadata View for easy query access
-- ──────────────────────────────────────────────────────────────
CREATE VIEW IF NOT EXISTS v_message_stats AS
SELECT 
  m.session_id,
  COUNT(*) as message_count,
  SUM(m.tokens) as total_tokens,
  MIN(m.timestamp) as first_message,
  MAX(m.timestamp) as last_message,
  COUNT(DISTINCT m.role) as unique_roles
FROM messages m
GROUP BY m.session_id;

-- ──────────────────────────────────────────────────────────────
-- Pragma settings for optimal performance
-- ──────────────────────────────────────────────────────────────
PRAGMA journal_mode = WAL;        -- Write-Ahead Logging for better concurrency
PRAGMA synchronous = NORMAL;      -- Balance between safety and speed
PRAGMA cache_size = 10000;        -- Increase cache for larger datasets
PRAGMA temp_store = MEMORY;       -- Keep temp tables in memory
PRAGMA foreign_keys = ON;         -- Enable foreign key constraints
