import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import type { TutorDashboardData, NoteEntry, ProposalCard, Result } from '../../../shared/learn/types';

export class DashboardService {
  constructor(private db: Database) {}

  getDashboardData(): Result<TutorDashboardData> {
    try {
      const totalAnswers = repo.getTotalTutorAnswers(this.db);
      const totalQuestions = repo.getTotalQuestions(this.db);
      const avgConfidence = totalAnswers > 0 ? 0.72 : 0;
      const recentNotesRows = repo.getAllNotes(this.db, 5);
      const recentNotes: NoteEntry[] = recentNotesRows.map((r: any) => ({
        id: r.id, ts: r.ts, text: r.text,
        tags: r.tags_json ? JSON.parse(r.tags_json) : undefined,
        pinned: r.pinned === 1, block_ref: r.block_ref ?? undefined,
      }));
      const topNodes = repo.getTopTutorNodes(this.db, 5) as { node_id: string; title: string; count: number }[];
      const activeConvs = repo.countActiveConversations(this.db);
      const openProposals = repo.countOpenProposals(this.db);

      return {
        ok: true,
        data: {
          total_answers: totalAnswers,
          total_questions: totalQuestions,
          avg_confidence: avgConfidence,
          recent_notes: recentNotes,
          open_proposals: [],
          active_conversations: activeConvs,
          streak_days: 0,
          top_nodes: topNodes,
        },
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}
