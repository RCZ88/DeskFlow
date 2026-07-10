import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import type { ConversationAction, Result } from '../../../shared/learn/types';

export class ConversationService {
  constructor(private db: Database) {}

  startConversation(params: { id: string; nodeId: string; blockId: string }): Result<{ ok: boolean }> {
    try {
      const now = new Date().toISOString();
      repo.insertConversation(this.db, {
        id: params.id, node_id: params.nodeId, block_id: params.blockId,
        status: 'active', created_at: now, updated_at: now,
      });
      return { ok: true, data: { ok: true } };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  addMessage(params: {
    nodeId: string; blockId?: string; role: string; text: string;
    meta?: Record<string, unknown>;
  }): Result<ConversationAction> {
    try {
      const ts = new Date().toISOString();
      repo.insertAction(this.db, {
        node_id: params.nodeId, block_id: params.blockId,
        role: params.role, ts, text: params.text, meta: params.meta,
      });
      const message: ConversationAction = {
        role: params.role as 'user' | 'ai' | 'system',
        ts, text: params.text, block_id: params.blockId, meta: params.meta,
      };
      return { ok: true, data: message };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  getConversationHistory(blockId: string): Result<ConversationAction[]> {
    try {
      const rows = repo.getActionsForBlock(this.db, blockId);
      const messages = rows.map((r: any) => ({
        role: r.role as 'user' | 'ai' | 'system',
        ts: r.ts,
        text: r.text,
        block_id: r.block_id ?? undefined,
        meta: r.meta_json ? JSON.parse(r.meta_json) : undefined,
      }));
      return { ok: true, data: messages };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  resolveConversation(convId: string): Result<{ ok: boolean }> {
    try {
      repo.updateConversationStatus(this.db, convId, 'resolved');
      return { ok: true, data: { ok: true } };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}
