// ImportService — parse → validate → hash → store → embed
// Idempotent: re-importing identical JSON is a no-op (hashes match)

import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import { validateFull, computeContentHash } from '../validator/validate';
import type { LdocDocument, ImportResult, ValidationReport, Result } from '../../shared/learn/types';

export class ImportService {
  constructor(private db: Database) {}

  importLdoc(json: unknown): Result<ImportResult> {
    try {
      // 1. Validate
      const validation = validateFull(json);
      if (!validation.ok) {
        return {
          ok: true,
          data: {
            lessonId: '',
            nodes: [],
            warnings: validation.warnings,
            validation,
          },
        };
      }

      const doc = json as LdocDocument;

      // 2. Compute content hashes for each node
      for (const node of doc.nodes) {
        node.content_hash = computeContentHash({
          blocks: node.blocks,
          grounding: node.grounding,
          mastery_target: node.mastery_target,
        });
      }

      // 3. Check for existing hashes (idempotent)
      const existingHashes = new Map<string, string>();
      for (const node of doc.nodes) {
        const existing = repo.getNode(this.db, node.id);
        if (existing) {
          existingHashes.set(node.id, (existing as any).content_hash);
        }
      }

      // 4. Transactional upsert
      const now = new Date().toISOString();
      this.db.transaction(() => {
        // Upsert lesson
        repo.upsertLesson(this.db, {
          id: doc.lesson.id,
          title: doc.lesson.title,
          part: doc.lesson.part,
          version: doc.lesson.version,
          summary: doc.lesson.summary,
          authored_by: doc.lesson.authored_by,
          doc_json: JSON.stringify(doc),
          status: 'valid',
          created_at: now,
          updated_at: now,
        });

        // Upsert nodes
        for (let i = 0; i < doc.nodes.length; i++) {
          const node = doc.nodes[i];
          const existingHash = existingHashes.get(node.id);

          // Skip if hash matches (idempotent)
          if (existingHash === node.content_hash) continue;

          repo.insertNode(this.db, {
            id: node.id,
            lesson_id: doc.lesson.id,
            title: node.title,
            mastery_target: node.mastery_target,
            content_hash: node.content_hash,
            ord: i,
            blocks_json: JSON.stringify(node.blocks),
            grounding_json: JSON.stringify(node.grounding),
          });

          // Prereqs
          repo.deletePrereqsForNode(this.db, node.id);
          if (node.prereq) {
            for (const pid of node.prereq) {
              repo.insertPrereq(this.db, node.id, pid);
            }
          }

          // Sources
          for (const src of node.grounding.sources) {
            repo.insertSource(this.db, {
              id: src.id,
              node_id: node.id,
              url: src.url,
              title: src.title,
              kind: src.kind,
              license: src.license,
              retrieved: src.retrieved,
            });
          }

          // Chunks
          repo.deleteChunksForNode(this.db, node.id);

          // Grounding fact chunks
          for (const fact of node.grounding.must_know) {
            repo.insertChunk(this.db, {
              node_id: node.id,
              block_id: null,
              kind: 'fact',
              text: fact.claim,
              source_id: fact.source_id,
            });
          }

          // Misconception chunks
          if (node.grounding.misconceptions) {
            for (const m of node.grounding.misconceptions) {
              repo.insertChunk(this.db, {
                node_id: node.id,
                block_id: null,
                kind: 'misconception',
                text: `WRONG: ${m.wrong} — CORRECT: ${m.correct}`,
              });
            }
          }

          // Prose block chunks
          for (const block of node.blocks) {
            if (block.type === 'prose') {
              repo.insertChunk(this.db, {
                node_id: node.id,
                block_id: block.id,
                kind: 'prose',
                text: block.md,
              });
            }
            if (block.type === 'quiz') {
              repo.insertChunk(this.db, {
                node_id: node.id,
                block_id: block.id,
                kind: 'quiz',
                text: block.q,
              });
            }
          }
        }
      })();

      const nodeSummaries = doc.nodes.map((n) => ({ id: n.id, title: n.title }));

      return {
        ok: true,
        data: {
          lessonId: doc.lesson.id,
          nodes: nodeSummaries,
          warnings: validation.warnings,
          validation,
        },
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}
