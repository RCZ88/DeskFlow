// GroundingService — packet retrieval + vector search + scope gate
// Build-time: chunks are created during import
// Query-time: retrieve relevant facts for a tutor question

import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import type { LdocGrounding } from '../../shared/learn/types';

export interface RetrievalResult {
  packet: {
    must_know: { claim: string; source_id: string }[];
    misconceptions: { wrong: string; correct: string }[];
    canonical_answers: Record<string, string>;
    scope: { includes: string; excludes?: string[] };
    sources: { id: string; url: string; title: string }[];
    top_chunks: { rowid: number; text: string; kind: string; score: number }[];
  };
  retrieval_score: number;
  out_of_scope: boolean;
}

export class GroundingService {
  constructor(private db: Database) {}

  retrieve(nodeId: string, question: string): RetrievalResult {
    const node = repo.getNode(this.db, nodeId);
    if (!node) {
      return this.emptyResult(nodeId);
    }

    const n = node as any;
    const grounding: LdocGrounding = JSON.parse(n.grounding_json);

    // Simple keyword-based chunk retrieval (vector search would require sqlite-vec extension)
    const chunks = this.retrieveChunks(nodeId, question);

    // Scope gate
    const outOfScope = this.checkOutOfScope(question, grounding.scope);

    // Compute retrieval score (simple: fraction of question keywords found in chunks)
    const retrievalScore = this.computeRetrievalScore(question, chunks);

    return {
      packet: {
        must_know: grounding.must_know,
        misconceptions: grounding.misconceptions || [],
        canonical_answers: grounding.canonical_answers || {},
        scope: grounding.scope,
        sources: grounding.sources.map((s) => ({ id: s.id, url: s.url, title: s.title })),
        top_chunks: chunks,
      },
      retrieval_score: retrievalScore,
      out_of_scope: outOfScope,
    };
  }

  private retrieveChunks(nodeId: string, question: string): { rowid: number; text: string; kind: string; score: number }[] {
    const chunks = this.db.prepare('SELECT rowid, text, kind FROM learn_chunks WHERE node_id = ?').all(nodeId) as any[];

    // Simple keyword matching — extract words from question and score chunks
    const questionWords = new Set(
      question.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    );

    const scored = chunks.map((chunk) => {
      const chunkWords = chunk.text.toLowerCase().split(/\s+/);
      let matches = 0;
      for (const word of questionWords) {
        if (chunkWords.some((cw: string) => cw.includes(word))) {
          matches++;
        }
      }
      return {
        rowid: chunk.rowid,
        text: chunk.text,
        kind: chunk.kind,
        score: questionWords.size > 0 ? matches / questionWords.size : 0,
      };
    });

    // Return top 8 chunks sorted by score
    return scored
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  private checkOutOfScope(question: string, scope: { includes: string; excludes?: string[] }): boolean {
    const q = question.toLowerCase();

    // Check excludes
    if (scope.excludes) {
      for (const exclude of scope.excludes) {
        if (q.includes(exclude.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  private computeRetrievalScore(question: string, chunks: { score: number }[]): number {
    if (chunks.length === 0) return 0;
    return Math.max(...chunks.map((c) => c.score));
  }

  private emptyResult(nodeId: string): RetrievalResult {
    return {
      packet: {
        must_know: [],
        misconceptions: [],
        canonical_answers: {},
        scope: { includes: '' },
        sources: [],
        top_chunks: [],
      },
      retrieval_score: 0,
      out_of_scope: true,
    };
  }
}
