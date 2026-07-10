import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import type { NoteEntry, Result } from '../../../shared/learn/types';

export class NoteService {
  constructor(private db: Database) {}

  addNote(params: { nodeId: string; text: string; tags?: string[]; blockRef?: string }): Result<NoteEntry> {
    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ts = new Date().toISOString();
      const note: NoteEntry = {
        id, ts, text: params.text,
        tags: params.tags, block_ref: params.blockRef,
      };
      repo.insertNote(this.db, {
        id, node_id: params.nodeId, ts, text: params.text,
        tags: params.tags, block_ref: params.blockRef,
      });
      return { ok: true, data: note };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  getNotesForNode(nodeId: string): Result<NoteEntry[]> {
    try {
      const rows = repo.getNotesForNode(this.db, nodeId);
      const entries = rows.map((r: any) => this.parseNote(r));
      return { ok: true, data: entries };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  getAllNotes(limit = 20): Result<NoteEntry[]> {
    try {
      const rows = repo.getAllNotes(this.db, limit);
      const entries = rows.map((r: any) => this.parseNote(r));
      return { ok: true, data: entries };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  deleteNote(noteId: string): Result<{ ok: boolean }> {
    try {
      repo.deleteNote(this.db, noteId);
      return { ok: true, data: { ok: true } };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  togglePin(noteId: string, pinned: boolean): Result<{ ok: boolean }> {
    try {
      repo.toggleNotePin(this.db, noteId, pinned ? 1 : 0);
      return { ok: true, data: { ok: true } };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  private parseNote(row: any): NoteEntry {
    return {
      id: row.id,
      ts: row.ts,
      text: row.text,
      tags: row.tags_json ? JSON.parse(row.tags_json) : undefined,
      pinned: row.pinned === 1,
      block_ref: row.block_ref ?? undefined,
    };
  }
}
