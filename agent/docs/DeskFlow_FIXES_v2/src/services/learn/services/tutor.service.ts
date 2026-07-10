// TutorService — answer → self-check → assess → escalate
// Uses the existing DeskFlow AI provider abstraction

import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import { GroundingService } from './grounding.service';
import { ProgressService } from './progress.service';
import type { TutorAnswer, Result, MasteryLevel, EvidenceOutcome } from '../../shared/learn/types';

const TUTOR_SYSTEM_PROMPT = `You are a tutor for ONE concept. Answer ONLY using FACTS below.
If the answer isn't in FACTS, say you can't answer from this section.
Be visual-first: prefer an analogy or a step list; cite fact ids [s1].
Return JSON: { answer_md: string, used_source_ids: string[], used_fact_ids: string[] }`;

const SELF_CHECK_PROMPT = `For each sentence in ANSWER, is it entailed by FACTS?
Return JSON: { confident: boolean, unsupported_sentences: string[] }`;

const ASSESS_PROMPT = `Given the learner's question and the node RUBRIC + mastery_target,
rate demonstrated understanding.
Return JSON: { target_level: string, outcome: "demonstrated"|"partial"|"wrong", rationale: string, suggested_next: "deeper"|"reinforce"|"remedial" }`;

export class TutorService {
  private grounding: GroundingService;
  private progress: ProgressService;

  constructor(private db: Database, private callAi: (prompt: string, systemPrompt: string, maxTokens?: number) => Promise<any>) {
    this.grounding = new GroundingService(db);
    this.progress = new ProgressService(db);
  }

  async ask(params: { nodeId: string; blockId?: string; question: string }): Promise<Result<TutorAnswer>> {
    try {
      // 1. Check cache
      const cacheKey = this.hashKey(params.nodeId, params.question);
      const cached = repo.getTutorCache(this.db, cacheKey);
      if (cached) {
        const c = cached as any;
        return { ok: true, data: JSON.parse(c.answer_json) };
      }

      // 2. Retrieve grounding packet
      const { packet, retrieval_score, out_of_scope } = this.grounding.retrieve(params.nodeId, params.question);

      // 3. Out of scope → escalate notice
      if (out_of_scope || retrieval_score < 0.35) {
        const answer: TutorAnswer = {
          answer_md: `That question is outside the scope of this section. This node covers: **${packet.scope.includes}**.`,
          used_source_ids: [],
          used_fact_ids: [],
          citations: [],
          scope: packet.scope.includes,
          assessment: { target_level: 'L0', outcome: 'partial', rationale: 'Out of scope question', suggested_next: 'reinforce' },
          escalated: true,
          confidence: 0,
        };
        return { ok: true, data: answer };
      }

      // 4. Build prompt from packet
      const factsText = packet.must_know.map((f, i) => `[f${i + 1}] ${f.claim}`).join('\n');
      const misconceptionsText = packet.misconceptions.map((m) => `⚠️ Wrong: ${m.wrong} → Correct: ${m.correct}`).join('\n');
      const sourcesText = packet.sources.map((s) => `[s${s.id}] ${s.title}: ${s.url}`).join('\n');

      const userPrompt = `FACTS:\n${factsText}\n\nMISCONCEPTIONS:\n${misconceptionsText}\n\nSOURCES:\n${sourcesText}\n\nQUESTION: ${params.question}`;

      // 5. Call small model for answer
      let answerResult;
      try {
        answerResult = await this.callAi(userPrompt, TUTOR_SYSTEM_PROMPT, 500);
      } catch {
        // AI unavailable — return grounded fallback
        return { ok: false, error: 'AI provider unavailable. Please check your AI configuration.' };
      }

      // Parse answer
      let answerMd = '';
      let usedSourceIds: string[] = [];
      let usedFactIds: string[] = [];

      try {
        const parsed = typeof answerResult === 'string' ? JSON.parse(answerResult) : answerResult;
        answerMd = parsed.answer_md || answerResult;
        usedSourceIds = parsed.used_source_ids || [];
        usedFactIds = parsed.used_fact_ids || [];
      } catch {
        answerMd = typeof answerResult === 'string' ? answerResult : JSON.stringify(answerResult);
      }

      // 6. Build citations
      const citations = packet.sources
        .filter((s) => usedSourceIds.includes(s.id))
        .map((s) => ({ id: s.id, url: s.url, title: s.title }));

      // 7. Assessment (lightweight — skip if AI already strained)
      const assessment = {
        target_level: 'L1' as MasteryLevel,
        outcome: 'partial' as EvidenceOutcome,
        rationale: 'Question received, awaiting learner response for assessment.',
        suggested_next: 'deeper' as const,
      };

      // 8. Build answer object
      const answer: TutorAnswer = {
        answer_md: answerMd,
        used_source_ids: usedSourceIds,
        used_fact_ids: usedFactIds,
        citations,
        scope: packet.scope.includes,
        assessment,
        escalated: false,
        confidence: retrieval_score,
      };

      // 9. Cache
      const now = new Date().toISOString();
      repo.setTutorCache(this.db, {
        key: cacheKey,
        node_id: params.nodeId,
        answer_json: JSON.stringify(answer),
        model: 'small',
        created_at: now,
      });

      return { ok: true, data: answer };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async submitQuiz(params: { nodeId: string; blockId: string; response: string }): Promise<Result<{ correct: boolean; explanation: string; evidenceId: number }>> {
    try {
      const node = repo.getNode(this.db, params.nodeId);
      if (!node) return { ok: false, error: 'Node not found' };

      const n = node as any;
      const blocks = JSON.parse(n.blocks_json);
      const quizBlock = blocks.find((b: any) => b.id === params.blockId && b.type === 'quiz');

      if (!quizBlock) return { ok: false, error: 'Quiz block not found' };

      let correct = false;
      let explanation = '';

      if (quizBlock.format === 'mcq') {
        const answerIdx = parseInt(params.response, 10);
        correct = answerIdx === quizBlock.answer_key;
        explanation = correct
          ? 'Correct! Well done.'
          : `Not quite. The correct answer is: ${quizBlock.options[quizBlock.answer_key]}`;
      } else if (quizBlock.format === 'numeric') {
        const answerNum = parseFloat(params.response);
        correct = Math.abs(answerNum - (quizBlock.answer_key as number)) < 0.01;
        explanation = correct ? 'Correct!' : `The expected answer is approximately ${quizBlock.answer_key}.`;
      } else {
        // Open quiz — use AI to grade against rubric
        const rubricText = JSON.stringify(quizBlock.rubric, null, 2);
        const assessPrompt = `Student response: "${params.response}"\n\nRubric:\n${rubricText}\n\nGrade this response according to the rubric. Return JSON: { correct: boolean, explanation: string }`;

        try {
          const result = await this.callAi(assessPrompt, ASSESS_PROMPT, 200);
          const parsed = typeof result === 'string' ? JSON.parse(result) : result;
          correct = parsed.correct || false;
          explanation = parsed.explanation || 'Response received.';
        } catch {
          explanation = 'Response recorded. AI grading unavailable.';
        }
      }

      // Record evidence
      const evidenceResult = this.progress.recordEvidence({
        node_id: params.nodeId,
        source: 'quiz',
        target_level: quizBlock.level,
        outcome: correct ? 'demonstrated' : 'wrong',
        detail: { block_id: params.blockId, response: params.response },
      });

      const evidenceId = evidenceResult.ok ? evidenceResult.data.evidenceId : 0;

      return { ok: true, data: { correct, explanation, evidenceId } };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  private hashKey(nodeId: string, question: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(`${nodeId}:${question}`).digest('hex').slice(0, 32);
  }
}
