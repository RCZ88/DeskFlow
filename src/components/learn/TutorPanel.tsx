import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, ChevronDown, ChevronUp, Sparkles, AlertTriangle, RefreshCw, Maximize2, MessageSquare } from 'lucide-react';
import { CitationChip } from './CitationChip';
import type { TutorAnswer } from '../../shared/learn/types';

type TutorState = 'idle' | 'streaming' | 'grounded' | 'out-of-scope' | 'error';

interface Props {
  open: boolean;
  onToggle: (v: boolean) => void;
  nodeId: string;
  question: string;
  onQuestionChange: (v: string) => void;
  answer: TutorAnswer | null;
  loading: boolean;
  onAsk: (nodeId: string, question: string) => void;
}

const SUGGESTIONS = [
  'Explain this concept in simpler terms',
  'Give me a concrete example',
  'How does this connect to what I already know?',
  'What are common misconceptions?',
];

const TYPING_SPEED_MS = 15;

function useTypingEffect(text: string, active: boolean): string {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active || !text) {
      setDisplayed(text || '');
      return;
    }
    indexRef.current = 0;
    setDisplayed('');

    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
      }
    }, TYPING_SPEED_MS);

    return () => clearInterval(interval);
  }, [text, active]);

  return displayed;
}

function renderAnswerHtml(md: string): string {
  return md
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-zinc-800/60 rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono text-zinc-300"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-800/60 rounded px-1 py-0.5 text-sm font-mono text-cyan-300">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

export function TutorPanel({ open, onToggle, nodeId, question, onQuestionChange, answer, loading, onAsk }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streaming = loading && question;
  const state: TutorState = streaming ? 'streaming' : answer ? (answer.escalated ? 'out-of-scope' : answer.answer_md.startsWith('Error') ? 'error' : 'grounded') : 'idle';

  const displayText = useTypingEffect(answer?.answer_md || '', state === 'streaming');

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (state === 'grounded' || state === 'out-of-scope' || state === 'error') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state, displayText]);

  const handleSubmit = useCallback(() => {
    if (!question.trim() || loading) return;
    onAsk(nodeId, question.trim());
    onQuestionChange('');
    setShowSuggestions(false);
  }, [question, loading, nodeId, onAsk, onQuestionChange]);

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
          <Brain className="w-4 h-4 text-indigo-400" />
          Tutor
        </span>
        <button
          onClick={() => { onToggle(false); setShowSuggestions(true); }}
          className="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition"
          aria-label="Close tutor panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto ws-scroll">
        <AnimatePresence mode="wait">
          {/* Idle state */}
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-200 font-medium">Ask anything about this lesson</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    I'm grounded in the lesson content and can explain, simplify, or go deeper on any concept here.
                  </p>
                </div>
              </div>
              {showSuggestions && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium px-1">Try asking</p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { onQuestionChange(s); inputRef.current?.focus(); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Streaming state */}
          {state === 'streaming' && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-3"
            >
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 shrink-0 mt-0.5">
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-indigo-400 rounded-full animate-spin" />
                </div>
                <div className="text-sm text-zinc-200 leading-relaxed" dangerouslySetInnerHTML={{
                  __html: renderAnswerHtml(displayText)
                }} />
              </div>
              {displayText.length < (answer?.answer_md?.length || 0) && (
                <div className="flex gap-1 justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </motion.div>
          )}

          {/* Grounded answer */}
          {state === 'grounded' && answer && !answer.escalated && (
            <motion.div
              key="grounded"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-3"
            >
              <div className="text-sm text-zinc-200 leading-relaxed" dangerouslySetInnerHTML={{
                __html: renderAnswerHtml(answer.answer_md)
              }} />

              {/* Citations */}
              {answer.citations.length > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                  <div className="flex flex-wrap gap-1.5">
                    {answer.citations.map((c) => (
                      <CitationChip key={c.id} id={c.id} url={c.url} title={c.title} />
                    ))}
                  </div>
                </div>
              )}

              {/* Scope tag */}
              {answer.scope && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Scope</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800/60 text-[10px] text-zinc-400 border border-zinc-700/40">
                    {answer.scope}
                  </span>
                </div>
              )}

              {/* Confidence indicator */}
              <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500/60 transition-all duration-500"
                    style={{ width: `${Math.round(answer.confidence * 100)}%` }}
                  />
                </div>
                <span>{Math.round(answer.confidence * 100)}% confidence</span>
              </div>

              {/* Assessment feedback */}
              {answer.assessment && (
                <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-400">Assessment:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      answer.assessment.outcome === 'demonstrated' ? 'text-emerald-400 bg-emerald-500/10' :
                      answer.assessment.outcome === 'partial' ? 'text-amber-400 bg-amber-500/10' :
                      'text-zinc-500 bg-zinc-700/30'
                    }`}>
                      {answer.assessment.outcome}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{answer.assessment.rationale}</p>
                  {answer.assessment.suggested_next && (
                    <p className="text-[11px] text-indigo-400 mt-1">Next: {answer.assessment.suggested_next}</p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Out-of-scope */}
          {state === 'out-of-scope' && answer && (
            <motion.div
              key="out-of-scope"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-300">Outside scope</p>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{answer.answer_md}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {answer.citations.map((c) => (
                        <CitationChip key={c.id} id={c.id} url={c.url} title={c.title} />
                      ))}
                    </div>
                    <button
                      onClick={() => console.log('Expand scope requested')}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-medium transition border border-indigo-500/30"
                    >
                      <Maximize2 className="w-3 h-3" />
                      Use wider model
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-300">Something went wrong</p>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{answer?.answer_md || 'The tutor encountered an error processing your question.'}</p>
                    <button
                      onClick={() => onAsk(nodeId, question)}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs font-medium transition border border-zinc-700/50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Previous messages history toggle */}
        {!loading && answer && state === 'grounded' && (
          <div className="border-t border-zinc-800">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-4 py-2 text-[10px] text-zinc-600 hover:text-zinc-400 transition"
            >
              {expanded ? 'Hide' : 'Show'} conversation context
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded && question && (
              <div className="px-4 pb-3">
                <div className="p-2 rounded-lg bg-zinc-800/30">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Your question</p>
                  <p className="text-xs text-zinc-400">{question}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask about this node..."
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-sm focus:border-indigo-500/50 focus:outline-none placeholder:text-zinc-600 transition"
            disabled={loading}
          />
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed transition border border-indigo-500/30"
            aria-label="Ask tutor"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-zinc-600">Press Enter to ask</span>
          {answer && !loading && (
            <button
              onClick={() => { onAsk(nodeId, question || 'Re-explain the current node'); }}
              className="text-[10px] text-indigo-500 hover:text-indigo-400 transition"
            >
              Re-ask
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
