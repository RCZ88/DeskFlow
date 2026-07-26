# CONTEXT_BUNDLE.md — Lyceum AI System Fix

## 1. TutorPanel.tsx — `src/components/learn/TutorPanel.tsx` (lines 1-459, FULL FILE)

```tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Sparkles, AlertTriangle, RefreshCw, Maximize2, MessageSquare, StopCircle, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { TutorAnswer } from '../../shared/learn/types';

type TutorState = 'idle' | 'streaming' | 'grounded' | 'out-of-scope' | 'error';

interface Props {
  open: boolean;
  onToggle: (v: boolean) => void;
  nodeId: string;
  question: string;
  onQuestionChange: (v: string) => void;
  answer?: TutorAnswer | null;
  loading?: boolean;
  onAsk?: (nodeId: string, question: string) => void;
}

const SUGGESTIONS = [
  'Explain this concept in simpler terms',
  'Give me a concrete example',
  'How does this connect to what I already know?',
  'What are common misconceptions?',
];

const api = (window as any).deskflowAPI || (window as any).api;

function renderAnswerHtml(md: string): string {
  return md
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-zinc-800/60 rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono text-zinc-300"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-800/60 rounded px-1 py-0.5 text-sm font-mono text-cyan-300">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .split(/\n\n+/)
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');
}

export function TutorPanel({ open, onToggle, nodeId, question, onQuestionChange, answer: v1Answer, loading: v1Loading, onAsk }: Props) {
  const [v2Streaming, setV2Streaming] = useState(false);
  const [v2Answer, setV2Answer] = useState('');
  const [v2State, setV2State] = useState<TutorState>('idle');
  const [v2Error, setV2Error] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [lastQuestion, setLastQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const supportsV2 = !!(api?.learnTutorStream && api?.onTutorToken);  // LINE 55: THIS IS WHY V2 FAILS

  const actualState: TutorState = v2Streaming ? 'streaming' : v2State;

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (actualState === 'grounded' || actualState === 'out-of-scope' || actualState === 'error') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [actualState, v2Answer]);

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  const handleSubmitV2 = useCallback(async (q: string) => {
    cleanupRef.current?.();
    setV2Streaming(true);
    setV2State('streaming');
    setV2Answer('');
    setV2Error('');
    setLastQuestion(q);
    setShowSuggestions(false);

    const blockId = `tutor-inline-${Date.now()}`;

    const unsub = api.onTutorToken((data: { blockId: string; token: string; done: boolean }) => {
      if (data.blockId !== blockId) return;
      if (data.done) {
        setV2Streaming(false);
        setV2State(v2Answer.length > 0 ? 'grounded' : 'error');
        if (v2Answer.length === 0) setV2Error('Empty response');
        return;
      }
      setV2Answer(prev => prev + data.token);
    });
    cleanupRef.current = unsub;

    try {
      const result = await api.learnTutorStream({ nodeId, blockId, question: q });
      if (!result || !result.ok) {
        setV2Streaming(false);
        setV2State('error');
        setV2Error(result?.error || 'Failed to start stream');
      }
    } catch (err: any) {
      setV2Streaming(false);
      setV2State('error');
      setV2Error(err?.message || 'Stream error');
    }
  }, [nodeId]);

  const handleSubmit = useCallback(() => {
    const q = question.trim();
    if (!q) return;
    if (v2Streaming) return;
    onQuestionChange('');
    if (supportsV2) {
      handleSubmitV2(q);
    } else if (onAsk) {
      onAsk(nodeId, q);
      setShowSuggestions(false);
      setLastQuestion(q);
    }
  }, [question, v2Streaming, supportsV2, onAsk, nodeId, onQuestionChange, handleSubmitV2]);

  const cancelStream = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setV2Streaming(false);
    if (v2Answer.length > 0) {
      setV2State('grounded');
    } else {
      setV2State('idle');
    }
  }, [v2Answer]);

  if (!open) {
    return (
      <div className="shrink-0 w-12 border-l border-zinc-800 flex flex-col items-center justify-start pt-4 gap-2">
        <button
          onClick={() => onToggle(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition"
          title="Open Tutor"
          aria-label="Open tutor panel"
        >
          <Brain className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const displayAnswer = v2Answer || v1Answer?.answer_md || '';
  const displayState = supportsV2 ? actualState : (v1Loading ? 'streaming' : v1Answer ? (v1Answer.escalated ? 'out-of-scope' : 'grounded') : 'idle');
  const isStreaming = supportsV2 ? v2Streaming : !!v1Loading;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="shrink-0 border-l border-zinc-800 bg-zinc-900/30 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <span className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Brain className="w-4 h-4 text-amber-400" />
          Tutor
          {supportsV2 && <span className="px-1 py-0.5 rounded bg-amber-500/15 text-[9px] text-amber-400 font-medium uppercase">V2</span>}
        </span>
        <button
          onClick={() => { onToggle(false); setShowSuggestions(true); setV2State('idle'); setV2Answer(''); }}
          className="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition"
          aria-label="Close tutor panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto ws-scroll">
        <AnimatePresence mode="wait">
          {displayState === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-200 font-medium">Ask anything about this lesson</p>
                  <p className="text-xs text-zinc-500 mt-1">I'm grounded in the lesson content and can explain, simplify, or go deeper on any concept here.</p>
                </div>
              </div>
              {showSuggestions && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium px-1">Try asking</p>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => { onQuestionChange(s); inputRef.current?.focus(); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition">{s}</button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {displayState === 'streaming' && (
            <motion.div key="streaming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                  <span className="text-xs text-zinc-500">Generating...</span>
                </div>
                {supportsV2 && (
                  <button onClick={cancelStream} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-red-400 transition">
                    <StopCircle className="w-3 h-3" /> Stop
                  </button>
                )}
              </div>
              {displayAnswer && (
                <div className="text-sm text-zinc-200 leading-relaxed" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(renderAnswerHtml(displayAnswer))}} />
              )}
            </motion.div>
          )}

          {displayState === 'grounded' && v1Answer && !v1Answer.escalated && !supportsV2 && (
            <motion.div key="grounded" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
              <div className="text-sm text-zinc-200 leading-relaxed" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(renderAnswerHtml(v1Answer.answer_md))}} />
              {v1Answer.citations.length > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                  <div className="flex flex-wrap gap-1.5">
                    {v1Answer.citations.map((c: any) => (
                      <span key={c.id} className="px-2 py-0.5 rounded-full bg-zinc-800/60 text-[10px] text-zinc-400 border border-zinc-700/40">{c.title}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {displayState === 'grounded' && displayAnswer && !(displayState === 'grounded' && v1Answer && !v1Answer.escalated && !supportsV2) && (
            <motion.div key="grounded-v2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4">
              <div className="text-sm text-zinc-200 leading-relaxed" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(renderAnswerHtml(displayAnswer))}} />
            </motion.div>
          )}

          {displayState === 'out-of-scope' && v1Answer && (
            <motion.div key="out-of-scope" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <p className="text-sm font-medium text-amber-300">Outside scope</p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{v1Answer.answer_md}</p>
              </div>
            </motion.div>
          )}

          {displayState === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                <p className="text-sm font-medium text-red-300">Something went wrong</p>
                <p className="text-xs text-zinc-400 mt-1">{v2Error || v1Answer?.answer_md || 'Error'}</p>
                <button onClick={() => { if (lastQuestion) { if (supportsV2) handleSubmitV2(lastQuestion); else if (onAsk) onAsk(nodeId, lastQuestion); } }}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs font-medium transition border border-zinc-700/50">
                  <RefreshCw className="w-3 h-3" /> Try again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="text" value={question} onChange={(e) => onQuestionChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Ask about this node..."
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-sm focus:border-amber-500/50 focus:outline-none placeholder:text-zinc-600 transition"
            disabled={isStreaming} />
          <button onClick={handleSubmit} disabled={!question.trim() || isStreaming}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition border border-amber-500/30"
            aria-label="Ask tutor">
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## 2. TutorService V1 — `src/services/learn/services/tutor.service.ts` (lines 1-231, FULL FILE)

```ts
import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import { GroundingService } from './grounding.service';
import { ProgressService } from './progress.service';
import type { TutorAnswer, Result, MasteryLevel, EvidenceOutcome } from '../../shared/learn/types';

const TUTOR_SYSTEM_PROMPT = `You are a tutor for ONE concept. Answer ONLY using FACTS below.
If the answer isn't in FACTS, say you can't answer from this section.
Be visual-first: prefer an analogy or a step list; cite fact ids [s1].
Return JSON: { answer_md: string, used_source_ids: string[], used_fact_ids: string[], suggested_next?: "deeper"|"reinforce"|"remedial" }

When the learner seems ready for deeper material, suggest "deeper".
When they need reinforcement, suggest "reinforce".
When they need remedial content, suggest "remedial".
Use the "escalate" flag only when the question fundamentally cannot be answered by this lesson's content.`;

export function prependTutorPersona(personaMd: string): string {
  if (!personaMd) return TUTOR_SYSTEM_PROMPT;
  return `${personaMd}\n\n---\n\n## Core Tutor Instructions\n${TUTOR_SYSTEM_PROMPT}`;
}

const SELF_CHECK_PROMPT = `For each sentence in ANSWER, is it entailed by FACTS?
Return JSON: { confident: boolean, unsupported_sentences: string[] }`;

const ASSESS_PROMPT = `Given the learner's question and the node RUBRIC + mastery_target,
rate demonstrated understanding.
Return JSON: { target_level: string, outcome: "demonstrated"|"partial"|"wrong", rationale: string, suggested_next: "deeper"|"reinforce"|"remedial" }`;

export class TutorService {
  private grounding: GroundingService;
  private progress: ProgressService;
  private systemPrompt: string;

  constructor(
    private db: Database,
    private callAi: (prompt: string, systemPrompt: string, maxTokens?: number) => Promise<any>,
    personaMd?: string,
  ) {
    this.grounding = new GroundingService(db);
    this.progress = new ProgressService(db);
    this.systemPrompt = personaMd ? prependTutorPersona(personaMd) : TUTOR_SYSTEM_PROMPT;
  }

  async ask(params: { nodeId: string; blockId?: string; question: string; personaMd?: string }): Promise<Result<TutorAnswer>> {
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
          answer_md: `That question is outside the scope of this section. This node covers: **${packet.scope.includes}**.`,
          used_source_ids: [], used_fact_ids: [], citations: [],
          scope: packet.scope.includes,
          assessment: { target_level: 'L0', outcome: 'partial', rationale: 'Out of scope question', suggested_next: 'reinforce' },
          escalated: true, confidence: 0,
        };
        return { ok: true, data: answer };
      }

      const factsText = packet.must_know.map((f, i) => `[f${i + 1}] ${f.claim}`).join('\n');
      const misconceptionsText = packet.misconceptions.map((m) => `⚠️ Wrong: ${m.wrong} → Correct: ${m.correct}`).join('\n');
      const sourcesText = packet.sources.map((s) => `[s${s.id}] ${s.title}: ${s.url}`).join('\n');

      const userPrompt = `FACTS:\n${factsText}\n\nMISCONCEPTIONS:\n${misconceptionsText}\n\nSOURCES:\n${sourcesText}\n\nQUESTION: ${params.question}`;

      const systemPrompt = params.personaMd
        ? prependTutorPersona(params.personaMd)
        : this.systemPrompt;
      let answerResult;
      try {
        answerResult = await this.callAi(userPrompt, systemPrompt, 500);
      } catch {
        return { ok: false, error: 'AI provider unavailable. Please check your AI configuration.' };
      }

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

      if (citations.length === 0 && packet.sources.length > 0) {
        return {
          answer_md: "I don't have enough information from the available sources to answer this question accurately.",
          used_source_ids: [], used_fact_ids: [], citations: [],
          assessment: { target_level: 'L1' as MasteryLevel, outcome: 'partial' as EvidenceOutcome, rationale: 'No relevant sources found.', suggested_next: 'review' as const },
          escalated: false, confidence: 0,
        };
      }

      const assessment = {
        target_level: 'L1' as MasteryLevel,
        outcome: 'partial' as EvidenceOutcome,
        rationale: 'Question received, awaiting learner response for assessment.',
        suggested_next: 'deeper' as const,
      };

      const answer: TutorAnswer = {
        answer_md: answerMd, used_source_ids: usedSourceIds, used_fact_ids: usedFactIds,
        citations, scope: packet.scope.includes, assessment,
        escalated: false, confidence: retrieval_score,
      };

      const now = new Date().toISOString();
      repo.setTutorCache(this.db, {
        key: cacheKey, node_id: params.nodeId,
        answer_json: JSON.stringify(answer), model: 'small', created_at: now,
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
        explanation = correct ? 'Correct!' : `Not quite. The correct answer is: ${quizBlock.options[quizBlock.answer_key]}`;
      } else if (quizBlock.format === 'numeric') {
        const answerNum = parseFloat(params.response);
        correct = Math.abs(answerNum - (quizBlock.answer_key as number)) < 0.01;
        explanation = correct ? 'Correct!' : `Expected ~${quizBlock.answer_key}.`;
      } else {
        const rubricText = JSON.stringify(quizBlock.rubric, null, 2);
        const assessPrompt = `Student response: "${params.response}"\n\nRubric:\n${rubricText}\n\nGrade. Return JSON: { correct: boolean, explanation: string }`;
        try {
          const result = await this.callAi(assessPrompt, ASSESS_PROMPT, 200);
          const parsed = typeof result === 'string' ? JSON.parse(result) : result;
          correct = parsed.correct || false;
          explanation = parsed.explanation || 'Response recorded.';
        } catch { explanation = 'AI grading unavailable.'; }
      }

      const evidenceResult = this.progress.recordEvidence({
        node_id: params.nodeId, source: 'quiz', target_level: quizBlock.level,
        outcome: correct ? 'demonstrated' : 'wrong',
        detail: { block_id: params.blockId, response: params.response },
      });
      const evidenceId = evidenceResult.ok ? evidenceResult.data.evidenceId : 0;
      return { ok: true, data: { correct, explanation, evidenceId } };
    } catch (err: any) { return { ok: false, error: err.message }; }
  }

  private hashKey(nodeId: string, question: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(`${nodeId}:${question}`).digest('hex').slice(0, 32);
  }
}
```

---

## 3. TutorServiceV2 — `src/services/learn/services/tutorV2.service.ts` (lines 1-206, FULL FILE)

```ts
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

  async askStream(
    params: { nodeId: string; blockId: string; question: string; convId?: string },
    onToken: (chunk: string) => void,
  ): Promise<Result<{ answerMd: string; citations: { id: string; url: string; title: string }[] }>> {
    try {
      const { packet, retrieval_score } = this.grounding.retrieve(params.nodeId, params.question);
      const factsText = packet.must_know.map((f, i) => `[f${i + 1}] ${f.claim}`).join('\n');
      const sourcesText = packet.sources.map((s) => `[s${s.id}] ${s.title}: ${s.url}`).join('\n');
      const userPrompt = `FACTS:\n${factsText}\n\nSOURCES:\n${sourcesText}\n\nQUESTION: ${params.question}`;

      if (!this.streamAi) {
        const answerResult = await this.callAi(userPrompt, this.systemPrompt, 500);
        let answerMd = '';
        let usedSourceIds: string[] = [];
        try {
          const parsed = typeof answerResult === 'string' ? JSON.parse(answerResult) : answerResult;
          answerMd = parsed.answer_md || answerResult;
          usedSourceIds = parsed.used_source_ids || [];
        } catch { answerMd = typeof answerResult === 'string' ? answerResult : JSON.stringify(answerResult); }
        onToken(answerMd);
        const citations = packet.sources.filter((s) => usedSourceIds.includes(s.id)).map((s) => ({ id: s.id, url: s.url, title: s.title }));
        await this.recordMessage(params.nodeId, params.blockId, 'ai', answerMd, citations);
        return { ok: true, data: { answerMd, citations } };
      }

      let fullAnswer = '';
      const citations = await this.streamAi(userPrompt, this.systemPrompt, (chunk: string) => { fullAnswer += chunk; onToken(chunk); });
      await this.recordMessage(params.nodeId, params.blockId, 'ai', fullAnswer, []);
      return { ok: true, data: { answerMd: fullAnswer, citations: [] } };
    } catch (err: any) {
      onToken(`\n\n*Error: ${err.message}*`);
      return { ok: false, error: err.message };
    }
  }

  async ask(params: { nodeId: string; blockId?: string; question: string }): Promise<Result<TutorAnswer>> {
    try {
      const cacheKey = this.hashKey(params.nodeId, params.question);
      const cached = repo.getTutorCache(this.db, cacheKey);
      if (cached) { return { ok: true, data: JSON.parse((cached as any).answer_json) }; }

      const { packet, retrieval_score, out_of_scope } = this.grounding.retrieve(params.nodeId, params.question);
      if (out_of_scope || retrieval_score < 0.35) {
        return { ok: true, data: {
          answer_md: `That question is outside the scope of this section.`,
          used_source_ids: [], used_fact_ids: [], citations: [],
          scope: packet.scope.includes,
          assessment: { target_level: 'L0', outcome: 'partial' as EvidenceOutcome, rationale: 'Out of scope', suggested_next: 'reinforce' },
          escalated: true, confidence: 0,
        }};
      }

      const factsText = packet.must_know.map((f, i) => `[f${i + 1}] ${f.claim}`).join('\n');
      const sourcesText = packet.sources.map((s) => `[s${s.id}] ${s.title}: ${s.url}`).join('\n');
      const userPrompt = `FACTS:\n${factsText}\n\nSOURCES:\n${sourcesText}\n\nQUESTION: ${params.question}`;

      const answerResult = await this.callAi(userPrompt, this.systemPrompt, 500);
      let answerMd = '', usedSourceIds: string[] = [], usedFactIds: string[] = [];
      try {
        const parsed = typeof answerResult === 'string' ? JSON.parse(answerResult) : answerResult;
        answerMd = parsed.answer_md || answerResult;
        usedSourceIds = parsed.used_source_ids || [];
        usedFactIds = parsed.used_fact_ids || [];
      } catch { answerMd = typeof answerResult === 'string' ? answerResult : JSON.stringify(answerResult); }

      const citations = packet.sources.filter((s) => usedSourceIds.includes(s.id)).map((s) => ({ id: s.id, url: s.url, title: s.title }));
      const answer: TutorAnswer = {
        answer_md: answerMd, used_source_ids: usedSourceIds, used_fact_ids: usedFactIds,
        citations, scope: packet.scope.includes,
        assessment: { target_level: 'L1', outcome: 'partial' as EvidenceOutcome, rationale: 'Answered', suggested_next: 'deeper' },
        escalated: false, confidence: retrieval_score,
      };

      repo.setTutorCache(this.db, { key: cacheKey, node_id: params.nodeId, answer_json: JSON.stringify(answer), model: 'small', created_at: new Date().toISOString() });
      await this.recordMessage(params.nodeId, params.blockId, 'ai', answerMd, citations);
      return { ok: true, data: answer };
    } catch (err: any) { return { ok: false, error: err.message }; }
  }

  async createProposal(params: { nodeId: string; blockId: string; title: string; bodyMd: string; actions: string[] }): Promise<Result<ProposalBlock>> {
    try {
      const permission = this.permissionService.check('node_edit');
      if (permission === 'never') return { ok: false, error: 'Proposals are disabled by admin policy.' };
      const block: ProposalBlock = { id: params.blockId, type: 'proposal', title: params.title, body_md: params.bodyMd, status: 'pending', actions: params.actions };
      await this.recordMessage(params.nodeId, params.blockId, 'system', `Proposal: ${params.title}`, { proposal: true, status: 'pending' });
      return { ok: true, data: block };
    } catch (err: any) { return { ok: false, error: err.message }; }
  }

  async decideProposal(params: ApprovalResponse): Promise<Result<ProposalBlock>> {
    try {
      return { ok: true, data: { id: params.proposal_id, type: 'proposal', title: 'Proposal', body_md: '', status: params.approved ? 'approved' : 'rejected', reason: params.reason, actions: [] } };
    } catch (err: any) { return { ok: false, error: err.message }; }
  }

  private async recordMessage(nodeId: string, blockId: string | undefined, role: string, text: string, meta?: any) {
    try { repo.insertAction(this.db, { node_id: nodeId, block_id: blockId, role, ts: new Date().toISOString(), text, meta }); } catch { /* non-fatal */ }
  }

  private hashKey(nodeId: string, question: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(`${nodeId}:${question}`).digest('hex').slice(0, 32);
  }
}
```

---

## 4. GroundingService — `src/services/learn/services/grounding.service.ts` (lines 1-122, FULL FILE)

```ts
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
    if (!node) return this.emptyResult(nodeId);

    const n = node as any;
    const grounding: LdocGrounding = JSON.parse(n.grounding_json);
    const chunks = this.retrieveChunks(nodeId, question);
    const outOfScope = this.checkOutOfScope(question, grounding.scope);
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

  private retrieveChunks(nodeId: string, question: string) {
    const chunks = this.db.prepare('SELECT rowid, text, kind FROM learn_chunks WHERE node_id = ?').all(nodeId) as any[];
    const questionWords = new Set(question.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
    const scored = chunks.map((chunk) => {
      const chunkWords = chunk.text.toLowerCase().split(/\s+/);
      let matches = 0;
      for (const word of questionWords) { if (chunkWords.some((cw: string) => cw.includes(word))) matches++; }
      return { rowid: chunk.rowid, text: chunk.text, kind: chunk.kind, score: questionWords.size > 0 ? matches / questionWords.size : 0 };
    });
    return scored.filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
  }

  private checkOutOfScope(question: string, scope: { includes: string; excludes?: string[] }): boolean {
    const q = question.toLowerCase();
    if (scope.excludes) { for (const exclude of scope.excludes) { if (q.includes(exclude.toLowerCase())) return true; } }
    return false;
  }

  private computeRetrievalScore(question: string, chunks: { score: number }[]): number {
    if (chunks.length === 0) return 0;
    return Math.max(...chunks.map((c) => c.score));
  }

  private emptyResult(nodeId: string): RetrievalResult {
    return { packet: { must_know: [], misconceptions: [], canonical_answers: {}, scope: { includes: '' }, sources: [], top_chunks: [] }, retrieval_score: 0, out_of_scope: true };
  }
}
```

---

## 5. NoteService — `src/services/learn/services/note.service.ts` (lines 1-74, FULL FILE)

```ts
import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import type { NoteEntry, Result } from '../../../shared/learn/types';

export class NoteService {
  constructor(private db: Database) {}

  addNote(params: { nodeId: string; text: string; tags?: string[]; blockRef?: string }): Result<NoteEntry> {
    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ts = new Date().toISOString();
      const note: NoteEntry = { id, ts, text: params.text, tags: params.tags, block_ref: params.blockRef };
      repo.insertNote(this.db, { id, node_id: params.nodeId, ts, text: params.text, tags: params.tags, block_ref: params.blockRef });
      return { ok: true, data: note };
    } catch (err: any) { return { ok: false, error: err.message }; }
  }

  getNotesForNode(nodeId: string): Result<NoteEntry[]> {
    try { return { ok: true, data: repo.getNotesForNode(this.db, nodeId).map((r: any) => this.parseNote(r)) }; }
    catch (err: any) { return { ok: false, error: err.message }; }
  }

  getAllNotes(limit = 20): Result<NoteEntry[]> {
    try { return { ok: true, data: repo.getAllNotes(this.db, limit).map((r: any) => this.parseNote(r)) }; }
    catch (err: any) { return { ok: false, error: err.message }; }
  }

  deleteNote(noteId: string): Result<{ ok: boolean }> {
    try { repo.deleteNote(this.db, noteId); return { ok: true, data: { ok: true } }; }
    catch (err: any) { return { ok: false, error: err.message }; }
  }

  togglePin(noteId: string, pinned: boolean): Result<{ ok: boolean }> {
    try { repo.toggleNotePin(this.db, noteId, pinned ? 1 : 0); return { ok: true, data: { ok: true } }; }
    catch (err: any) { return { ok: false, error: err.message }; }
  }

  private parseNote(row: any): NoteEntry {
    return { id: row.id, ts: row.ts, text: row.text, tags: row.tags_json ? JSON.parse(row.tags_json) : undefined, pinned: row.pinned === 1, block_ref: row.block_ref ?? undefined };
  }
}
```

---

## 6. SelectionActions.tsx — `src/components/learn/SelectionActions.tsx` (lines 1-282, FULL FILE)

```tsx
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Highlighter, StickyNote, Trash2, Palette, Lightbulb, MessageSquare, Search, ArrowRight } from 'lucide-react';
import type { Highlight } from '../../services/learn/highlightAnchor';

const HIGHLIGHT_COLORS: { value: Highlight['color']; label: string; css: string }[] = [
  { value: 'yellow', label: 'Yellow', css: '#eab308' },
  { value: 'green', label: 'Green', css: '#22c55e' },
  { value: 'blue', label: 'Blue', css: '#3b82f6' },
  { value: 'pink', label: 'Pink', css: '#ec4899' },
  { value: 'orange', label: 'Orange', css: '#f97316' },
];

const TUTOR_MODES = [
  { key: 'explain' as const, label: 'Explain', icon: Lightbulb },
  { key: 'ask' as const, label: 'Ask…', icon: MessageSquare },
  { key: 'simpler' as const, label: 'Simpler', icon: Search },
  { key: 'deeper' as const, label: 'Deeper', icon: ArrowRight },
];

interface SelectionActionsProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onCreateHighlight: (text: string, startOffset: number, endOffset: number, color: Highlight['color']) => void;
  onCreateNote: (text: string, startOffset: number, endOffset: number) => void;
  onDeleteHighlight?: (id: string) => void;
  selectedHighlightId?: string | null;
  onAskTutor?: (text: string, mode: 'explain' | 'ask' | 'simpler' | 'deeper') => void;
  isSelecting?: boolean;
}

export function SelectionActions({ containerRef, onCreateHighlight, onCreateNote, onDeleteHighlight, selectedHighlightId, onAskTutor }: SelectionActionsProps) {
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect; startOffset: number; endOffset: number; } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  const getTextLength = useCallback((node: Node): number => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').length;
    let len = 0;
    for (let i = 0; i < node.childNodes.length; i++) len += getTextLength(node.childNodes[i]);
    return len;
  }, []);

  const getTextOffset = useCallback((node: Node, offset: number): number => {
    if (!containerRef.current) return 0;
    if (node === containerRef.current) { let sum = 0; for (let i = 0; i < offset && i < node.childNodes.length; i++) sum += getTextLength(node.childNodes[i]); return sum; }
    let total = 0;
    const walk = (n: Node): boolean => {
      if (n === node) { if (node.nodeType === Node.TEXT_NODE) total += offset; else { for (let i = 0; i < offset && i < node.childNodes.length; i++) total += getTextLength(node.childNodes[i]); } return true; }
      if (n.nodeType === Node.TEXT_NODE) { total += (n.textContent ?? '').length; return false; }
      for (let i = 0; i < n.childNodes.length; i++) { if (walk(n.childNodes[i])) return true; }
      return false;
    };
    walk(containerRef.current);
    return total;
  }, [containerRef, getTextLength]);

  useEffect(() => {
    const handleMouseDown = () => { isSelectingRef.current = true; };
    const handleMouseUp = () => {
      isSelectingRef.current = false;
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount || !containerRef.current) { setSelection(null); setShowColorPicker(false); return; }
        const range = sel.getRangeAt(0);
        const text = sel.toString().trim();
        if (!text || text.length > 500) { setSelection(null); return; }
        const ancestor = range.commonAncestorContainer;
        if (!containerRef.current.contains(ancestor)) { setSelection(null); return; }
        const rect = range.getBoundingClientRect();
        const startOffset = getTextOffset(range.startContainer, range.startOffset);
        const endOffset = getTextOffset(range.endContainer, range.endOffset);
        const [finalStart, finalEnd] = startOffset <= endOffset ? [startOffset, endOffset] : [endOffset, startOffset];
        setSelection({ text, rect, startOffset: finalStart, endOffset: finalEnd });
      });
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousedown', handleMouseDown); document.removeEventListener('mouseup', handleMouseUp); };
  }, [containerRef, getTextOffset]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!selection) return;
      if (toolbarRef.current?.contains(e.target as Node)) return;
      if (!containerRef.current?.contains(e.target as Node)) { setSelection(null); window.getSelection()?.removeAllRanges(); }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selection, containerRef]);

  const handleHighlight = useCallback((color: Highlight['color']) => {
    if (!selection) return;
    onCreateHighlight(selection.text, selection.startOffset, selection.endOffset, color);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setShowColorPicker(false);
  }, [selection, onCreateHighlight]);

  const handleNote = useCallback(() => {
    if (!selection) return;
    onCreateNote(selection.text, selection.startOffset, selection.endOffset);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, [selection, onCreateNote]);

  const handleDeleteHighlight = useCallback(() => {
    if (!selectedHighlightId || !onDeleteHighlight) return;
    onDeleteHighlight(selectedHighlightId);
  }, [selectedHighlightId, onDeleteHighlight]);

  const handleTutorMode = useCallback((mode: 'explain' | 'ask' | 'simpler' | 'deeper') => {
    if (!selection || !onAskTutor) return;
    onAskTutor(selection.text, mode);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, [selection, onAskTutor]);

  const toolbarStyle = useMemo(() => {
    if (!selection) return {};
    const { rect } = selection;
    const toolbarW = 220, toolbarH = 44, gap = 12;
    let left = rect.left + rect.width / 2 - toolbarW / 2;
    let top = rect.top - toolbarH - gap;
    left = Math.max(12, Math.min(left, window.innerWidth - toolbarW - 12));
    top = Math.max(12, top);
    return { position: 'fixed' as const, left, top, zIndex: 9999 };
  }, [selection, onAskTutor]);

  if (!selection && !selectedHighlightId) return null;

  const toolbar = selection ? (
    <div ref={toolbarRef} className="lyceum-selection-toolbar" style={toolbarStyle}>
      {showColorPicker ? (
        <div className="lyceum-selection-colors">
          {HIGHLIGHT_COLORS.map((c) => (<button key={c.value} className="lyceum-selection-color-btn" onClick={() => handleHighlight(c.value)} title={c.label} style={{ backgroundColor: c.css }} aria-label={`Highlight ${c.label}`} />))}
          <button className="lyceum-selection-color-btn lyceum-selection-color-back" onClick={() => setShowColorPicker(false)} title="Back"><Palette size={12} /></button>
        </div>
      ) : (
        <>
          {onAskTutor && TUTOR_MODES.map((mode) => (<button key={mode.key} className="lyceum-selection-action" onClick={() => handleTutorMode(mode.key)} title={mode.label}><mode.icon size={14} /></button>))}
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <button className="lyceum-selection-action" onClick={() => setShowColorPicker(true)} title="Highlight"><Highlighter size={14} /></button>
          <button className="lyceum-selection-action" onClick={handleNote} title="Add note"><StickyNote size={14} /></button>
        </>
      )}
    </div>
  ) : selectedHighlightId && onDeleteHighlight ? (
    <div className="lyceum-selection-toolbar lyceum-selection-toolbar-existing">
      <button className="lyceum-selection-action lyceum-selection-action-delete" onClick={handleDeleteHighlight} title="Remove highlight"><Trash2 size={14} /></button>
    </div>
  ) : null;

  return toolbar ? createPortal(toolbar, document.body) : null;
}
```

---

## 7. useHighlights.ts — `src/components/learn/useHighlights.ts` (lines 1-80, FULL FILE)

```ts
import { useState, useCallback, useEffect } from 'react';
import type { Highlight } from '../../services/learn/highlightAnchor';
import { getHighlightsForLesson, addHighlight, updateHighlight, removeHighlight } from '../../services/learn/highlightAnchor';

interface UseHighlightsOptions { lessonId: string; partSlug: string; }

export function useHighlights({ lessonId, partSlug }: UseHighlightsOptions) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  const refresh = useCallback(() => { setHighlights(getHighlightsForLesson(lessonId)); }, [lessonId]);
  useEffect(() => { refresh(); }, [refresh]);

  const createHighlight = useCallback((text: string, startOffset: number, endOffset: number, color: Highlight['color'] = 'yellow') => {
    const h = addHighlight({ lessonId, partSlug, text, color, startOffset, endOffset });
    setHighlights((prev) => [...prev, h]);
    return h;
  }, [lessonId, partSlug]);

  const editNote = useCallback((id: string, note: string) => {
    const updated = updateHighlight(id, { note });
    if (updated) setHighlights((prev) => prev.map((h) => (h.id === id ? updated : h)));
  }, []);

  const changeColor = useCallback((id: string, color: Highlight['color']) => {
    const updated = updateHighlight(id, { color });
    if (updated) setHighlights((prev) => prev.map((h) => (h.id === id ? updated : h)));
  }, []);

  const deleteHighlight = useCallback((id: string) => {
    removeHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return { highlights, isSelecting, setIsSelecting, createHighlight, editNote, changeColor, deleteHighlight };
}
```

---

## 8. highlightAnchor.ts — `src/services/learn/highlightAnchor.ts` (lines 1-102, FULL FILE)

```ts
export interface Highlight {
  id: string; lessonId: string; partSlug: string; text: string; note?: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'orange';
  createdAt: number; startOffset: number; endOffset: number;
}
export interface HighlightGroup { lessonId: string; partSlug: string; highlights: Highlight[]; }

const STORAGE_KEY = 'lyceum-highlights';
function loadAll(): Record<string, Highlight> { try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return {}; return JSON.parse(raw); } catch { return {}; } }
function saveAll(map: Record<string, Highlight>): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {} }

export function getHighlightsForLesson(lessonId: string): Highlight[] { return Object.values(loadAll()).filter((h) => h.lessonId === lessonId); }
export function getHighlightsForPart(partSlug: string): Highlight[] { return Object.values(loadAll()).filter((h) => h.partSlug === partSlug); }
export function addHighlight(h: Omit<Highlight, 'id' | 'createdAt'>): Highlight {
  const map = loadAll(); const id = `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const highlight: Highlight = { ...h, id, createdAt: Date.now() }; map[id] = highlight; saveAll(map); return highlight;
}
export function updateHighlight(id: string, patch: Partial<Pick<Highlight, 'note' | 'color'>>): Highlight | null {
  const map = loadAll(); const existing = map[id]; if (!existing) return null;
  const updated = { ...existing, ...patch }; map[id] = updated; saveAll(map); return updated;
}
export function removeHighlight(id: string): boolean { const map = loadAll(); if (!map[id]) return false; delete map[id]; saveAll(map); return true; }
export function clearHighlightsForLesson(lessonId: string): void { const map = loadAll(); Object.keys(map).filter((k) => map[k].lessonId === lessonId).forEach((k) => delete map[k]); saveAll(map); }
export function exportHighlights(): Highlight[] { return Object.values(loadAll()).sort((a, b) => b.createdAt - a.createdAt); }
export function importHighlights(highlights: Highlight[]): number { const map = loadAll(); let count = 0; for (const h of highlights) { if (!map[h.id]) { map[h.id] = h; count++; } } saveAll(map); return count; }
```

---

## 9. IPC Handlers — `src/services/learn/index.ts` (lines 230-314)

```ts
  ipcMain.handle('learn:askTutor', (_event, params: { nodeId: string; blockId?: string; question: string; personaMd?: string }) => {
    return tutor.ask(params);
  });

  ipcMain.handle('learn:submitQuiz', (_event, params: { nodeId: string; blockId: string; response: string }) => {
    return tutor.submitQuiz(params);
  });

  ipcMain.handle('learn:tutorStream', async (event, params: {
    nodeId: string; blockId: string; question: string; convId?: string;
  }) => {
    if (!streamAi) {
      const result = await tutorV2.ask(params);
      if (result.ok) {
        event.sender.send('learn:tutorToken', { blockId: params.blockId, token: result.data.answer_md, done: true });
      } else {
        event.sender.send('learn:tutorToken', { blockId: params.blockId, token: `Error: ${result.error}`, done: true });
      }
      return result;
    }
    const result = await tutorV2.askStream(params, (token: string) => {
      event.sender.send('learn:tutorToken', { blockId: params.blockId, token, done: false });
    });
    event.sender.send('learn:tutorToken', { blockId: params.blockId, token: '', done: true });
    return result;
  });

  ipcMain.handle('learn:tutorAskV2', (_event, params: { nodeId: string; blockId?: string; question: string }) => {
    return tutorV2.ask(params);
  });

  ipcMain.handle('learn:createProposal', (_event, params: { nodeId: string; blockId: string; title: string; bodyMd: string; actions: string[] }) => {
    return tutorV2.createProposal(params);
  });

  ipcMain.handle('learn:decideProposal', (_event, params: { proposal_id: string; approved: boolean; reason?: string }) => {
    return tutorV2.decideProposal(params);
  });

  ipcMain.handle('learn:startConversation', (_event, params: { id: string; nodeId: string; blockId: string }) => {
    return conversationService.startConversation(params);
  });

  ipcMain.handle('learn:addMessage', (_event, params: { nodeId: string; blockId?: string; role: string; text: string }) => {
    return conversationService.addMessage(params);
  });

  ipcMain.handle('learn:getConversation', (_event, { blockId }: { blockId: string }) => {
    return conversationService.getConversationHistory(blockId);
  });

  ipcMain.handle('learn:resolveConversation', (_event, { convId }: { convId: string }) => {
    return conversationService.resolveConversation(convId);
  });

  ipcMain.handle('learn:addNote', (_event, params: { nodeId: string; text: string; tags?: string[]; blockRef?: string }) => {
    return noteService.addNote(params);
  });

  ipcMain.handle('learn:getNotes', (_event, { nodeId }: { nodeId: string }) => {
    return noteService.getNotesForNode(nodeId);
  });

  ipcMain.handle('learn:getAllNotes', (_event, { limit }: { limit?: number } = {}) => {
    return noteService.getAllNotes(limit);
  });

  ipcMain.handle('learn:deleteNote', (_event, { noteId }: { noteId: string }) => {
    return noteService.deleteNote(noteId);
  });

  ipcMain.handle('learn:toggleNotePin', (_event, { noteId, pinned }: { noteId: string; pinned: boolean }) => {
    return noteService.togglePin(noteId, pinned);
  });
```

---

## 10. Preload Bridge — `src/preload.ts` (lines 1060-1109, CURRENT — MISSING ENDPOINTS)

```ts
  // ========== Lyceum Learn Module ==========
  learnImportLdoc: (payload: { source?: string; json?: unknown }) => ipcRenderer.invoke('learn:importLdoc', payload),
  learnValidate: (payload: { source?: string; json?: unknown }) => ipcRenderer.invoke('learn:validate', payload),
  learnListLessons: (params?: { part?: number }) => ipcRenderer.invoke('learn:listLessons', params || {}),
  learnListChapters: (params?: { part?: number }) => ipcRenderer.invoke('learn:listChapters', params || {}),
  learnGetLesson: ({ lessonId }: { lessonId: string }) => ipcRenderer.invoke('learn:getLesson', { lessonId }),
  learnGetNode: ({ nodeId }: { nodeId: string }) => ipcRenderer.invoke('learn:getNode', { nodeId }),
  learnGetGraph: (params?: { part?: number }) => ipcRenderer.invoke('learn:getGraph', params || {}),
  learnAskTutor: (params: { nodeId: string; blockId?: string; question: string }) => ipcRenderer.invoke('learn:askTutor', params),
  learnSubmitQuiz: (params: { nodeId: string; blockId: string; response: string }) => ipcRenderer.invoke('learn:submitQuiz', params),
  learnGetProgress: (params?: { nodeId?: string }) => ipcRenderer.invoke('learn:getProgress', params || {}),
  learnGetDueReviews: () => ipcRenderer.invoke('learn:getDueReviews'),
  learnPickFile: () => ipcRenderer.invoke('learn:pick-file'),
  learnGetWorkedExample: () => ipcRenderer.invoke('learn:get-worked-example'),
  learnGetSchema: () => ipcRenderer.invoke('learn:get-schema'),
  learnGetAuthorGuide: () => ipcRenderer.invoke('learn:get-author-guide'),
  learnBuildPrompt: (params) => ipcRenderer.invoke('learn:buildPrompt', params),
  learnGenerateLdoc: (params) => ipcRenderer.invoke('learn:generateLdoc', params),
  learnListRecipes: () => ipcRenderer.invoke('learn:listRecipes'),
  learnBuildPromptFromRecipe: (params) => ipcRenderer.invoke('learn:buildPromptFromRecipe', params),
  // ... profile, flashcard, intents, lesson management sections ...
  learnGetLessonSystemPrompt: () => ipcRenderer.invoke('learn:getLessonSystemPrompt'),
  learnSaveIntent: (args) => ipcRenderer.invoke('learn:saveIntent', args),
  learnListIntents: () => ipcRenderer.invoke('learn:listIntents'),
  learnDeleteIntent: (args) => ipcRenderer.invoke('learn:deleteIntent', args),
  learnUpdateIntent: (args) => ipcRenderer.invoke('learn:updateIntent', args),
  learnGetLessonSource: (args) => ipcRenderer.invoke('learn:getLessonSource', args),
  learnUpdateLessonMeta: (args) => ipcRenderer.invoke('learn:updateLessonMeta', args),
  learnDeleteLesson: (args) => ipcRenderer.invoke('learn:deleteLesson', args),

  // ❌ MISSING: learnTutorStream
  // ❌ MISSING: onTutorToken
  // ❌ MISSING: learnAddNote
  // ❌ MISSING: learnGetNotes
  // ❌ MISSING: learnGetAllNotes
  // ❌ MISSING: learnDeleteNote
  // ❌ MISSING: learnToggleNotePin
  // ❌ MISSING: learnCreateProposal
  // ❌ MISSING: learnDecideProposal
  // ❌ MISSING: learnStartConversation
  // ❌ MISSING: learnAddMessage
  // ❌ MISSING: learnGetConversation
  // ❌ MISSING: learnResolveConversation
  // ❌ MISSING: learnGetTutorDashboard
```

---

## 11. LearnPage Callbacks — `src/components/learn/LearnPage.tsx` (lines 286-380)

```tsx
  const handleAskTutor = useCallback(async (nodeId: string, question: string) => {
    setTutorOpen(true);
    setTutorQuestion(question);
    setTutorLoading(true);
    try {
      const result = await api.learnAskTutor({ nodeId, question });
      if (result.ok) { setTutorAnswer(result.data); }
    } catch (err: any) {
      setTutorAnswer({
        answer_md: `Error: ${err.message}`, used_source_ids: [], used_fact_ids: [], citations: [], scope: '',
        assessment: { target_level: 'L0' as MasteryLevel, outcome: 'wrong', rationale: err.message, suggested_next: 'reinforce' },
        escalated: false, confidence: 0,
      });
    } finally { setTutorLoading(false); }
  }, []);

  const handleSelectionAsk = useCallback((text: string, mode: 'explain' | 'ask' | 'simpler' | 'deeper') => {
    if (!selectedNode) return;
    const prefix = mode === 'explain' ? 'Explain: ' : mode === 'simpler' ? 'Simplify: ' : mode === 'deeper' ? 'Go deeper on: ' : '';
    handleAskTutor(selectedNode, `${prefix}${text}`);
  }, [selectedNode, handleAskTutor]);

  const handleApproveProposal = useCallback(async (blockId: string) => {
    try { await api.learnDecideProposal({ proposal_id: blockId, approved: true }); } catch {}
  }, []);

  const handleRejectProposal = useCallback(async (blockId: string, reason?: string) => {
    try { await api.learnDecideProposal({ proposal_id: blockId, approved: false, reason }); } catch {}
  }, []);

  const handleAddMessage = useCallback(async (blockId: string, text: string) => {
    if (!selectedNode) return;
    try { await api.learnAddMessage({ nodeId: selectedNode, blockId, role: 'user', text }); } catch {}
  }, [selectedNode]);

  const handleResolveConversation = useCallback(async (blockId: string) => {
    try {
      const conv = await api.learnGetConversation({ blockId });
      if (conv && conv.id) { await api.learnResolveConversation({ convId: conv.id }); }
    } catch {}
  }, []);

  const handleAddNote = useCallback(async (blockId: string, text: string) => {
    if (!selectedNode) return;
    try { await api.learnAddNote({ nodeId: selectedNode, text, blockRef: blockId }); } catch {}
  }, [selectedNode]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try { await api.learnDeleteNote({ noteId }); } catch {}
  }, []);

  const handleTogglePin = useCallback(async (noteId: string) => {
    try {
      const note = lessonData?.nodes.flatMap(n => n.blocks.filter((b: any) => b.type === 'notes').flatMap((b: any) => b.notes)).find((n: any) => n?.id === noteId);
      await api.learnToggleNotePin({ noteId, pinned: !note?.pinned });
    } catch {}
  }, [lessonData]);
```

---

## 12. IPC Channel → Handler Mapping (MISSING FROM PRELOAD)

| Frontend Call | IPC Channel | Handler in index.ts | Preload Bridge |
|---|---|---|---|
| `api.learnTutorStream(...)` | `learn:tutorStream` | line 243 ✅ | ❌ MISSING |
| `api.onTutorToken(...)` | `learn:tutorToken` (event) | line 256, 249, 251, 258 ✅ | ❌ MISSING |
| `api.learnAddNote(...)` | `learn:addNote` | line 294 ✅ | ❌ MISSING |
| `api.learnGetNotes(...)` | `learn:getNotes` | line 298 ✅ | ❌ MISSING |
| `api.learnGetAllNotes(...)` | `learn:getAllNotes` | line 302 ✅ | ❌ MISSING |
| `api.learnDeleteNote(...)` | `learn:deleteNote` | line 306 ✅ | ❌ MISSING |
| `api.learnToggleNotePin(...)` | `learn:toggleNotePin` | line 310 ✅ | ❌ MISSING |
| `api.learnDecideProposal(...)` | `learn:decideProposal` | line 270 ✅ | ❌ MISSING |
| `api.learnCreateProposal(...)` | `learn:createProposal` | line 266 ✅ | ❌ MISSING |
| `api.learnAddMessage(...)` | `learn:addMessage` | line 280 ✅ | ❌ MISSING |
| `api.learnGetConversation(...)` | `learn:getConversation` | line 284 ✅ | ❌ MISSING |
| `api.learnResolveConversation(...)` | `learn:resolveConversation` | line 288 ✅ | ❌ MISSING |
| `api.learnStartConversation(...)` | `learn:startConversation` | line 276 ✅ | ❌ MISSING |
| `api.learnGetTutorDashboard(...)` | `learn:getTutorDashboard` | line 326 ✅ | ❌ MISSING |

## 13. TutorAnswer Type — `src/shared/learn/types.ts`

```ts
export interface TutorAnswer {
  answer_md: string;
  used_source_ids: string[];
  used_fact_ids: string[];
  citations: { id: string; url: string; title: string }[];
  scope: string;
  assessment: { target_level: MasteryLevel; outcome: EvidenceOutcome; rationale: string; suggested_next: string };
  escalated: boolean;
  confidence: number;
}
```
