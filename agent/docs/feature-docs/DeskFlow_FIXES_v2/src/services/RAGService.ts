/**
 * RAG Service — AI Session Message Management
 * 
 * Handles storing, indexing, and retrieving messages from AI sessions.
 * Supports both full-text and semantic search.
 * 
 * Location: src/services/RAGService.ts
 */

// Conditionally import better-sqlite3 only in the main process.
import type DatabaseConstructor from 'better-sqlite3';
import type { Database as DatabaseInstance } from 'better-sqlite3';

let Database: DatabaseConstructor | null = null;
if (typeof window === 'undefined') {
  // Electron main process (Node environment)
  // Dynamically require the native module to avoid bundling it into the renderer.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const db = require('better-sqlite3');
  Database = db.default || db;
}

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

interface RAGMessageRow {
  id: string;
  session_id: string;
  timestamp: number;
  role: string;
  content: string;
  tokens: number;
  embedding?: Buffer | null;
  metadata?: string | null;
  created_at: number;
  content_length: number;
}

interface SessionStatsRow {
  message_count?: number;
  total_tokens?: number;
  first_message?: number;
  last_message?: number;
}


// ──────────────────────────────────────────────────────────────
// RAG Service Implementation
// ──────────────────────────────────────────────────────────────

export class RAGService {
  private db: DatabaseInstance | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  /**
   * Initialize RAG service for a project
   * @param projectPath - Project directory path
   */
  constructor(projectPath: string) {
    // Create .apptracker/context directory if needed
    const contextDir = path.join(projectPath, '.apptracker', 'context');
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    this.dbPath = path.join(contextDir, 'rag-index.sqlite');
  }

  /**
   * Initialize database and create schema
   */
  public async initialize(): Promise<void> {
    // Prevent execution in renderer – must run in main process only
    if (typeof window !== 'undefined') {
      throw new Error('RAGService.initialize called in renderer – forbidden');
    }

    try {
      this.db = new Database(this.dbPath);

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Read and execute schema
      const schemaPath = path.join(__dirname, '..', 'db', 'rag-schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      // Execute schema (split by ; to handle multiple statements)
      const statements = schema.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          this.db.exec(statement);
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize RAG Service:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Message Storage & Retrieval
  // ──────────────────────────────────────────────────────────────

  /**
   * Store a new message in the RAG index
   */
  public async saveMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    metadata?: MessageMetadata,
    embedding?: Float32Array | null
  ): Promise<ServiceResponse<RAGMessage>> {
    if (!this.db || !this.initialized) {
      return {
        success: false,
        error: 'RAG Service not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const id = uuidv4();
      const now = Math.floor(Date.now() / 1000);
      const tokens = this.estimateTokens(content);

      const stmt = this.db.prepare(`
        INSERT INTO messages (
          id, session_id, timestamp, role, content, tokens,
          embedding, metadata, created_at, content_length
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        sessionId,
        now,
        role,
        content,
        tokens,
        embedding ? Buffer.from(embedding.buffer) : null,
        metadata ? JSON.stringify(metadata) : null,
        now,
        content.length
      );

      // Update session stats
      this.updateSessionStats(sessionId, tokens);

      const message: RAGMessage = {
        id,
        sessionId,
        timestamp: new Date(now * 1000),
        role,
        content,
        tokens,
        metadata,
        embedding: embedding || null,
        createdAt: new Date(now * 1000),
      };

      return { success: true, data: message, timestamp: new Date() };
    } catch (error) {
      console.error('Failed to save message:', error);
      return {
        success: false,
        error: `Failed to save message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Retrieve a message by ID
   */
  public async getMessage(messageId: string): Promise<ServiceResponse<RAGMessage | null>> {
    if (!this.db || !this.initialized) {
      return {
        success: false,
        error: 'RAG Service not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM messages WHERE id = ?
      `);

      const row = stmt.get(messageId) as RAGMessageRow;

      if (!row) {
        return { success: true, data: null, timestamp: new Date() };
      }

      const message = this.rowToMessage(row);
      return { success: true, data: message, timestamp: new Date() };
    } catch (error) {
      console.error('Failed to get message:', error);
      return {
        success: false,
        error: `Failed to get message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Query messages with filters and pagination
   */
  public async queryMessages(
    options: QueryOptions = {}
  ): Promise<ServiceResponse<PaginatedResults<RAGMessage>>> {
    if (!this.db || !this.initialized) {
      return {
        success: false,
        error: 'RAG Service not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      // Build query
      let query = 'SELECT * FROM messages WHERE 1=1';
      const params: unknown[] = [];

      if (options.sessionId) {
        query += ' AND session_id = ?';
        params.push(options.sessionId);
      }

      if (options.category) {
        query += ' AND json_extract(metadata, "$.category") = ?';
        params.push(options.category);
      }

      if (options.since) {
        query += ' AND timestamp >= ?';
        params.push(Math.floor(options.since.getTime() / 1000));
      }

      if (options.until) {
        query += ' AND timestamp <= ?';
        params.push(Math.floor(options.until.getTime() / 1000));
      }

      // Get total count
      const countStmt = this.db.prepare(
        query.replace('SELECT *', 'SELECT COUNT(*) as count')
      );
      const countRow = countStmt.get(...params) as { count: number };
      const total = countRow.count;

      // Get paginated results
      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as unknown[];

      const messages = rows.map(row => this.rowToMessage(row));

      return {
        success: true,
        data: {
          data: messages,
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to query messages:', error);
      return {
        success: false,
        error: `Failed to query messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Full-Text Search
  // ──────────────────────────────────────────────────────────────

  /**
   * Full-text search using FTS5
   */
  public async fullTextSearch(
    query: string,
    options: QueryOptions = {}
  ): Promise<ServiceResponse<RAGSearchResult[]>> {
    if (!this.db || !this.initialized) {
      return {
        success: false,
        error: 'RAG Service not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const limit = options.limit || 10;

      // FTS5 search query
      let ftsQuery = `
        SELECT m.*, mfts.rank
        FROM messages_fts mfts
        JOIN messages m ON m.id = mfts.id
        WHERE messages_fts MATCH ?
      `;

      const params: unknown[] = [query];

      // Optional session filter
      if (options.sessionId) {
        ftsQuery += ' AND m.session_id = ?';
        params.push(options.sessionId);
      }

      ftsQuery += ' ORDER BY mfts.rank ASC LIMIT ?';
      params.push(limit);

      const stmt = this.db.prepare(ftsQuery);
      const rows = stmt.all(...params) as unknown[];

      const results: RAGSearchResult[] = rows.map(row => ({
        message: this.rowToMessage(row),
        score: Math.abs(row.rank), // FTS5 rank is negative, so use absolute value
        type: 'fulltext',
      }));

      return { success: true, data: results, timestamp: new Date() };
    } catch (error) {
      console.error('Failed to perform full-text search:', error);
      return {
        success: false,
        error: `Full-text search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Semantic Search — proper cosine similarity
  // ──────────────────────────────────────────────────────────────

  /**
   * Perform semantic search using cosine similarity between the query
   * embedding and stored message embeddings.
   */
  public async semanticSearch(
    queryEmbedding: Float32Array,
    options: QueryOptions = {}
  ): Promise<ServiceResponse<RAGSearchResult[]>> {
    try {
      if (!this.db) {
        return {
          success: false,
          error: 'RAG database not initialized',
          timestamp: new Date()
        };
      }

      const limit = options.limit || 10;
      const minScore = options.minScore || 0.3;

      let sql = `SELECT * FROM messages WHERE embedding IS NOT NULL`;
      const params: unknown[] = [];

      if (options.sessionId) {
        sql += ` AND session_id = ?`;
        params.push(options.sessionId);
      }

      const rows = this.db.prepare(sql).all(...params) as unknown[];

      if (rows.length === 0) {
        return { success: true, data: [], timestamp: new Date() };
      }

      const queryNorm = this.computeVectorNorm(queryEmbedding);

      if (queryNorm === 0) {
        return { success: true, data: [], timestamp: new Date() };
      }

      const scored: Array<{ row: RAGMessageRow; score: number }> = [];
      let skippedCount = 0;

      for (const row of rows) {
        try {
          if (!row.embedding) continue;
          const storedEmbedding = new Float32Array(Buffer.from(row.embedding));

          if (storedEmbedding.length !== queryEmbedding.length) {
            skippedCount++;
            continue;
          }

          const similarity = this.cosineSimilarity(
            queryEmbedding, storedEmbedding, queryNorm
          );

          if (similarity >= minScore) {
            scored.push({ row, score: similarity });
          }
        } catch {
          skippedCount++;
          continue;
        }
      }

      if (skippedCount > 0) {
        console.warn(
          `[RAG] semanticSearch: skipped ${skippedCount} embeddings (dimension mismatch or malformed)`
        );
      }

      scored.sort((a, b) => b.score - a.score);
      const topResults = scored.slice(0, limit);

      const results: RAGSearchResult[] = topResults.map(({ row, score }) => ({
        message: this.rowToMessage(row),
        score,
        type: 'semantic' as const,
      }));

      return { success: true, data: results, timestamp: new Date() };

      } catch (err: unknown) {
      return {
        success: false,
        error: err?.message || 'Semantic search failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Compute cosine similarity between two vectors.
   * Returns a value between -1 and 1, where 1 = identical direction.
   */
  private cosineSimilarity(
    a: Float32Array, b: Float32Array, normA?: number
  ): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }

    const normAVal = normA ?? this.computeVectorNorm(a);
    const normB = this.computeVectorNorm(b);

    if (normAVal === 0 || normB === 0) return 0;

    return dotProduct / (normAVal * normB);
  }

  /**
   * Compute L2 (Euclidean) norm of a vector.
   */
  private computeVectorNorm(vec: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
      sum += vec[i] * vec[i];
    }
    return Math.sqrt(sum);
  }

  // ──────────────────────────────────────────────────────────────
  // Message Deletion & Cleanup
  // ──────────────────────────────────────────────────────────────

  /**
   * Delete messages (used during compaction)
   */
  public async deleteMessages(messageIds: string[]): Promise<ServiceResponse<number>> {
    if (!this.db || !this.initialized) {
      return {
        success: false,
        error: 'RAG Service not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const placeholders = messageIds.map(() => '?').join(',');
      const stmt = this.db.prepare(`
        DELETE FROM messages WHERE id IN (${placeholders})
      `);

      const result = stmt.run(...messageIds);
      const deleted = result.changes || 0;

      return { success: true, data: deleted, timestamp: new Date() };
    } catch (error) {
      console.error('Failed to delete messages:', error);
      return {
        success: false,
        error: `Failed to delete messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get messages older than a specific date (for compaction)
   */
  public async getOldMessages(
    beforeDate: Date,
    limit: number = 500
  ): Promise<ServiceResponse<RAGMessage[]>> {
    if (!this.db || !this.initialized) {
      return {
        success: false,
        error: 'RAG Service not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const beforeTimestamp = Math.floor(beforeDate.getTime() / 1000);

      const stmt = this.db.prepare(`
        SELECT * FROM messages
        WHERE timestamp < ?
        ORDER BY timestamp ASC
        LIMIT ?
      `);

      const rows = stmt.all(beforeTimestamp, limit) as unknown[];
      const messages = rows.map(row => this.rowToMessage(row));

      return { success: true, data: messages, timestamp: new Date() };
    } catch (error) {
      console.error('Failed to get old messages:', error);
      return {
        success: false,
        error: `Failed to get old messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Session Management
  // ──────────────────────────────────────────────────────────────

  /**
   * Create a new session
   */
  public async createSession(
    projectId: string,
    agentName: string,
    metadata?: unknown
  ): Promise<ServiceResponse<string>> {
    if (!this.db || !this.initialized) {
      return {
        success: false,
        error: 'RAG Service not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const sessionId = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      const stmt = this.db.prepare(`
        INSERT INTO sessions (
          id, project_id, agent_name, started_at, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(sessionId, projectId, agentName, now, now);

      return { success: true, data: sessionId, timestamp: new Date() };
    } catch (error) {
      console.error('Failed to create session:', error);
      return {
        success: false,
        error: `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get session statistics
   */
  public async getSessionStats(sessionId: string): Promise<
    ServiceResponse<{
      messageCount: number;
      totalTokens: number;
      firstMessage: Date | null;
      lastMessage: Date | null;
    } | null>
  > {
    if (!this.db || !this.initialized) {
      return {
        success: false,
        error: 'RAG Service not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM v_message_stats WHERE session_id = ?
      `);

      const row = stmt.get(sessionId) as SessionStatsRow;

      if (!row) {
        return { success: true, data: null, timestamp: new Date() };
      }

      return {
        success: true,
        data: {
          messageCount: row.message_count || 0,
          totalTokens: row.total_tokens || 0,
          firstMessage: row.first_message ? new Date(row.first_message * 1000) : null,
          lastMessage: row.last_message ? new Date(row.last_message * 1000) : null,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return {
        success: false,
        error: `Failed to get session stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Private Helper Methods
  // ──────────────────────────────────────────────────────────────

  /**
   * Convert database row to RAGMessage object
   */
  private rowToMessage(row: RAGMessageRow): RAGMessage {
    return {
      id: row.id,
      sessionId: row.session_id,
      timestamp: new Date(row.timestamp * 1000),
      role: row.role as MessageRole,
      content: row.content,
      tokens: row.tokens,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      embedding: row.embedding ? new Float32Array(Buffer.from(row.embedding)) : null,
      createdAt: new Date(row.created_at * 1000),
    };
  }

  /**
   * Rough token estimation (for display purposes)
   * Actual token counting should use proper tokenizer
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Update session statistics
   */
  private updateSessionStats(sessionId: string, tokensAdded: number): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      UPDATE sessions
      SET message_count = message_count + 1,
          total_tokens = total_tokens + ?
      WHERE id = ?
    `);

    stmt.run(tokensAdded, sessionId);
  }
}

// Export singleton instance (optional)
let ragServiceInstance: RAGService | null = null;

export function initializeRAGService(projectPath: string): RAGService {
  ragServiceInstance = new RAGService(projectPath);
  return ragServiceInstance;
}

export function getRAGService(): RAGService | null {
  return ragServiceInstance;
}
