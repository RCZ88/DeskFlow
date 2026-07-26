// TutorServiceV2 — extends V1 with streaming, proposals, notes, and conversation blocks

import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import { GroundingService } from './grounding.service';
import { ProgressService } from './progress.service';
import { NoteService } from './note.service';
import { ConversationService } from './conversation.service';
import { PermissionService } from './permission.service';
import type {
  TutorAnswer, Result, MasteryLevel, EvidenceOutcome,
  ProposalBlock, TutorBlock, ConversationBlock, NotesBlock,
  ConversationAction, NoteEntry, ProposalCard, ApprovalResponse,
  TutorConfigV2,
} from '../../../shared/learn/types';

const V2_SYSTEM_PROMPT = `You are a tutor for ONE concept. Answer ONLY using FACTS below.
If the answer isn't in FACTS, say you can't answer from this section.
Be visual-first: prefer an analogy or a step list; cite fact ids [s1].
Return JSON: { answer_md: string, used_source_ids: string[], used_fact_ids: string[], suggested_next?: "deeper"|"reinforce"|"remedial" }`;

const V2_MODE_PROMPTS: Record<string, string> = {
  explain: `You are an expert teacher. Explain the following concept clearly and thoroughly.
Use analogies, step-by-step breakdowns, and concrete examples.
Assume the learner has basic knowledge but needs a clear explanation.
Ground your answer ONLY in the FACTS provided below. Cite fact ids [f1], [f2].
Return JSON: { answer_md: string, used_source_ids: string[], used_fact_ids: string[], suggested_next?: "deeper"|"reinforce"|"remedial" }`,

  simpler: `You are a patient tutor simplifying a concept.
Rewrite the following in the simplest possible terms.
Use everyday language, short sentences, and relatable analogies.
A 12-year-old should be able to understand your explanation.
Ground your answer ONLY in the FACTS provided below. Cite fact ids [f1], [f2].
Return JSON: { answer_md: string, used_source_ids: string[], used_fact_ids: string[], suggested_next?: "deeper"|"reinforce"|"remedial" }`,

  deeper: `You are an advanced instructor going deeper on a topic.
Provide nuanced analysis, edge cases, advanced patterns, and connections to other concepts.
Assume the learner already understands the basics and wants to go further.
Ground your answer ONLY in the FACTS provided below. Cite fact ids [f1], [f2].
Return JSON: { answer_md: string, used_source_ids: string[], used_fact_ids: string[], suggested_next?: "deeper"|"reinforce"|"remedial" }`,
};

export type TutorV2Mode = 'explain' | 'ask' | 'simpler' | 'deeper';

function resolveV2SystemPrompt(mode?: string, personaMd?: string): string {
  let base: string;
  if (mode && mode !== 'ask' && V2_MODE_PROMPTS[mode]) {
    base = V2_MODE_PROMPTS[mode];
  } else {
    base = V2_SYSTEM_PROMPT;
  }
  if (!personaMd) return base;
  return `${personaMd}\n\n---\n\n## Core Tutor Instructions\n${base}`;
}

export class TutorServiceV2 {
  private grounding: GroundingService;
  private progress: ProgressService;
  private noteService: NoteService;
  private conversationService: ConversationService;
  private permissionService: PermissionService;
  private systemPrompt: string;

  constructor(
    private db: Database,
    private callAi: (prompt: string, systemPrompt: string, maxTokens?: number) => Promise<any>,
    private streamAi?: (prompt: string, systemPrompt: string, onToken: (chunk: string) => void) => Promise<string>,
    personaMd?: string,
    private config?: Partial<TutorConfigV2>,
  ) {
    this.grounding = new GroundingService(db);
    this.progress = new ProgressService(db);
    this.noteService = new NoteService(db);
    this.conversationService = new ConversationService(db);
    this.permissionService = new PermissionService(db);
    this.systemPrompt = personaMd
      ? `${personaMd}\n\n---\n\n## Core Tutor Instructions\n${V2_SYSTEM_PROMPT}`
      : V2_SYSTEM_PROMPT;
  }

  /** Stream a tutor answer, writing incremental tokens to the callback. */
  async askStream(
    params: { nodeId: string; blockId: string; question: string; convId?: string; mode?: TutorV2Mode },
    onToken: (chunk: string) => void,
  ): Promise<Result<{ answerMd: string; citations: { id: string; url: string; title: string }[] }>> {
    try {
      const { packet, retrieval_score } = this.grounding.retrieve(params.nodeId, params.question);
      const factsText = packet.must_know.map((f, i) => `[f${i + 1}] ${f.claim}`).join('\n');
      const sourcesText = packet.sources.map((s) => `[s${s.id}] ${s.title}: ${s.url}`).join('\n');
      const userPrompt = `FACTS:\n${factsText}\n\nSOURCES:\n${sourcesText}\n\nQUESTION: ${params.question}`;

      const systemPrompt = resolveV2SystemPrompt(params.mode);

      if (!this.streamAi) {
        const answerResult = await this.callAi(userPrompt, this.systemPrompt, 500);
        let answerMd = '';
        let usedSourceIds: string[] = [];
        try {
          const parsed = typeof answerResult === 'string' ? JSON.parse(answerResult) : answerResult;
          answerMd = parsed.answer_md || answerResult;
          usedSourceIds = parsed.used_source_ids || [];
        } catch {
          answerMd = typeof answerResult === 'string' ? answerResult : JSON.stringify(answerResult);
        }
        onToken(answerMd);
        const citations = packet.sources
          .filter((s) => usedSourceIds.includes(s.id))
          .map((s) => ({ id: s.id, url: s.url, title: s.title }));
        await this.recordMessage(params.nodeId, params.blockId, 'ai', answerMd, citations);
        return { ok: true, data: { answerMd, citations } };
      }

      let fullAnswer = '';
      const citations = await this.streamAi(userPrompt, this.systemPrompt, (chunk: string) => {
        fullAnswer += chunk;
        onToken(chunk);
      });
      await this.recordMessage(params.nodeId, params.blockId, 'ai', fullAnswer, []);
      return { ok: true, data: { answerMd: fullAnswer, citations: [] } };
    } catch (err: any) {
      onToken(`\n\n*Error: ${err.message}*`);
      return { ok: false, error: err.message };
    }
  }

  /** Non-streaming ask (V1 compatible). */
  async ask(params: { nodeId: string; blockId?: string; question: string; mode?: TutorV2Mode }): Promise<Result<TutorAnswer>> {
    try {
      const cacheKey = this.hashKey(params.nodeId, params.question);
      const cached = repo.getTutorCache(this.db, cacheKey);
      if (cached) {
        const c = cached as any;
        return { ok: true, data: JSON.parse(c.answer_json) };
      }

      const { packet, retrieval_score, out_of_scope } = this.grounding.retrieve(params.nodeId, params.question);
      if (out_of_scope || retrieval_score < 0.35) {
        const answer: TutorAnswer = {
          answer_md: `That question is outside the scope of this section.`,
          used_source_ids: [], used_fact_ids: [], citations: [],
          scope: packet.scope.includes,
          assessment: { target_level: 'L0', outcome: 'partial' as EvidenceOutcome, rationale: 'Out of scope', suggested_next: 'reinforce' },
          escalated: true, confidence: 0,
        };
        return { ok: true, data: answer };
      }

      const factsText = packet.must_know.map((f, i) => `[f${i + 1}] ${f.claim}`).join('\n');
      const sourcesText = packet.sources.map((s) => `[s${s.id}] ${s.title}: ${s.url}`).join('\n');
      const userPrompt = `FACTS:\n${factsText}\n\nSOURCES:\n${sourcesText}\n\nQUESTION: ${params.question}`;

      const systemPrompt = resolveV2SystemPrompt(params.mode);

      const answerResult = await this.callAi(userPrompt, systemPrompt, 500);
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

      const citations = packet.sources
        .filter((s) => usedSourceIds.includes(s.id))
        .map((s) => ({ id: s.id, url: s.url, title: s.title }));

      const answer: TutorAnswer = {
        answer_md: answerMd, used_source_ids: usedSourceIds, used_fact_ids: usedFactIds,
        citations, scope: packet.scope.includes,
        assessment: { target_level: 'L1', outcome: 'partial' as EvidenceOutcome, rationale: 'Answered', suggested_next: 'deeper' },
        escalated: false, confidence: retrieval_score,
      };

      repo.setTutorCache(this.db, {
        key: cacheKey, node_id: params.nodeId,
        answer_json: JSON.stringify(answer), model: 'small', created_at: new Date().toISOString(),
      });

      await this.recordMessage(params.nodeId, params.blockId, 'ai', answerMd, citations);
      return { ok: true, data: answer };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /** Create a proposal block for the user to approve/reject. */
  async createProposal(params: {
    nodeId: string; blockId: string; title: string; bodyMd: string; actions: string[];
  }): Promise<Result<ProposalBlock>> {
    try {
      const permission = this.permissionService.check('node_edit');
      if (permission === 'never') {
        return { ok: false, error: 'Proposals are disabled by admin policy.' };
      }
      const block: ProposalBlock = {
        id: params.blockId, type: 'proposal',
        title: params.title, body_md: params.bodyMd,
        status: 'pending', actions: params.actions,
      };
      await this.recordMessage(params.nodeId, params.blockId, 'system',
        `Proposal: ${params.title}`, { proposal: true, status: 'pending' });
      return { ok: true, data: block };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /** Handle user approval/rejection of a proposal. */
  async decideProposal(params: ApprovalResponse): Promise<Result<ProposalBlock>> {
    try {
      const block: ProposalBlock = {
        id: params.proposal_id, type: 'proposal',
        title: 'Proposal', body_md: '',
        status: params.approved ? 'approved' : 'rejected',
        reason: params.reason, actions: [],
      };
      return { ok: true, data: block };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /** Record a message (user or AI) in the action log. */
  private async recordMessage(
    nodeId: string, blockId: string | undefined, role: string, text: string, meta?: any,
  ) {
    try {
      repo.insertAction(this.db, {
        node_id: nodeId, block_id: blockId, role, ts: new Date().toISOString(), text, meta,
      });
    } catch {
      /* non-fatal */
    }
  }

  private hashKey(nodeId: string, question: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(`${nodeId}:${question}`).digest('hex').slice(0, 32);
  }
}
