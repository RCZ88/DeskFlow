// ContentService — CRUD over lessons, nodes, blocks
// Read-only queries for rendering lessons

import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import type { LessonSummary, LessonWithNodes, RenderableNode, Result } from '../../shared/learn/types';

export class ContentService {
  constructor(private db: Database) {}

  listLessons(part?: number): Result<LessonSummary[]> {
    try {
      const rows = repo.listLessons(this.db, part);
      const summaries: LessonSummary[] = rows.map((r: any) => {
        const nodeCount = repo.getNodesByLesson(this.db, r.id).length;
        return {
          id: r.id,
          title: r.title,
          part: r.part,
          version: r.version,
          status: r.status,
          nodeCount,
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
      });
      return { ok: true, data: summaries };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  getLesson(lessonId: string): Result<LessonWithNodes> {
    try {
      const lesson = repo.getLesson(this.db, lessonId);
      if (!lesson) return { ok: false, error: `Lesson "${lessonId}" not found` };

      const nodes = repo.getNodesByLesson(this.db, lessonId);
      const renderableNodes: RenderableNode[] = nodes.map((n: any) => {
        const progress = repo.getProgress(this.db, n.id);
        return {
          id: n.id,
          title: n.title,
          mastery_target: n.mastery_target,
          prereq: this.getNodePrereqs(n.id),
          blocks: JSON.parse(n.blocks_json),
          grounding: JSON.parse(n.grounding_json),
          progress: progress ? this.parseProgress(progress) : undefined,
        };
      });

      return {
        ok: true,
        data: {
          lesson: {
            id: lesson.id,
            title: lesson.title,
            part: lesson.part,
            version: lesson.version,
            summary: lesson.summary,
            authored_by: lesson.authored_by,
          },
          nodes: renderableNodes,
        },
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  getNode(nodeId: string): Result<RenderableNode> {
    try {
      const node = repo.getNode(this.db, nodeId);
      if (!node) return { ok: false, error: `Node "${nodeId}" not found` };

      const progress = repo.getProgress(this.db, nodeId);
      return {
        ok: true,
        data: {
          id: node.id,
          title: node.title,
          mastery_target: node.mastery_target,
          prereq: this.getNodePrereqs(nodeId),
          blocks: JSON.parse(node.blocks_json),
          grounding: JSON.parse(node.grounding_json),
          progress: progress ? this.parseProgress(progress) : undefined,
        },
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  getGraph(part?: number): Result<{ nodes: any[]; edges: any[] }> {
    try {
      return { ok: true, data: repo.getGraph(this.db, part) };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  getDueReviews(): Result<any[]> {
    try {
      return { ok: true, data: repo.getDueReviews(this.db) };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  private getNodePrereqs(nodeId: string): string[] {
    const rows = this.db.prepare('SELECT prereq_id FROM learn_node_prereqs WHERE node_id = ?').all(nodeId);
    return rows.map((r: any) => r.prereq_id);
  }

  private parseProgress(row: any) {
    return {
      node_id: row.node_id,
      level: row.level,
      stability: row.stability,
      last_seen: row.last_seen,
      due_at: row.due_at,
      belief: JSON.parse(row.belief_json),
    };
  }
}
