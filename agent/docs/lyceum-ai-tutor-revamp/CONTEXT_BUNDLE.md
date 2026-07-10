# DeskFlow Lyceum Learn — Complete Source Context Bundle

> **Purpose:** Single source-of-truth file for an AI agent tasked with implementing
> the Lyceum Learn AI tutor feature inside DeskFlow, an Electron + React + better-sqlite3
> desktop productivity tracker.
>
> Every description below is backed by actual source code extracted from the repo.
> The AI does NOT have access to the codebase — this file IS their access.

---

## 1. Architecture Overview

The Lyceum Learn system is a **self-contained sub-application** inside DeskFlow:

```
/learn route (LearnPage.tsx)
  └── 5 views: welcome → showcase → library → reader → import
      ├── ReaderView: block-rendered lesson content + graph/grid navigation
      ├── TutorPanel: side-chat AI tutor (opens from reader)
      └── SelectionActions: floating toolbar on text selection
```

**IPC call chain (all work):**

```
Renderer (LearnPage.tsx)
  → window.deskflowAPI.learnAskTutor(...)  [preload.ts bridge]
    → ipcMain 'learn:askTutor' handler  [src/services/learn/index.ts]
      → TutorService.ask()  [tutor.service.ts]
        → GroundingService.retrieve()  [grounding.service.ts]
        → callAi()  [wraps src/services/providers/router.ts buildChain+runWithFallback]
          → callProvider()  [callProvider.ts — HTTP POST to configured AI API]
```

---

## 2. Key File Inventory

| File | Purpose |
|------|---------|
| `src/shared/learn/types.ts` | All shared TS types (Result, TutorAnswer, Citation, Lesson, Node, etc.) |
| `src/components/learn/LearnPage.tsx` | Orchestrator — 5 views, state, routing |
| `src/components/learn/TutorPanel.tsx` | Side-chat tutor panel with typing effect |
| `src/components/learn/SelectionActions.tsx` | Floating selection toolbar (4 modes + highlight) |
| `src/components/learn/useHighlights.ts` | React hook wrapping highlightAnchor |
| `src/services/learn/highlightAnchor.ts` | localStorage CRUD for highlights |
| `src/services/learn/index.ts` | All IPC handler registration (~356 lines) |
| `src/services/learn/services/tutor.service.ts` | TutorService — ask, submitQuiz, caching |
| `src/services/learn/promptLibrary.ts` | MASTERY_LADDER, SEGMENTATION_INSTRUCTION, PromptRecipe[] |
| `src/services/learn/db/repo.ts` | DB access (prepared statements, migrations) |
| `src/services/learn/db/migrations/001_learn.sql` | 8 CREATE TABLE statements |
| `src/services/learn/db/migrations/002_learn_profile.sql` | Learner profile KV table |
| `src/services/providers/router.ts` | buildChain() + runWithFallback() |
| `src/services/providers/callProvider.ts` | HTTP POST to AI APIs |
| `src/services/providers/types.ts` | Provider types (CanonicalRequest, ResolvedProvider, etc.) |
| `src/preload.ts` (lines 908-933) | learn* IPC bridges |
| `src/main.ts` (lines 2880-2905) | Module registration + callAi wrapper |
| `src/components/GlassCard.tsx` | Reusable card (7 variants, 5 accent colors) |
| `src/components/SectionHeader.tsx` | Icon + title + action header |
| `src/index.css` | @theme block with all design tokens |
| `src/styles/lyceum-learn-features.css` | 691 lines of learn-specific CSS (TOC, showcase, checklist, assessment, selection toolbar) |

---

## 3. Shared Types (src/shared/learn/types.ts)

```typescript
// src/shared/learn/types.ts — ALL shared type definitions

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface Citation {
  id: string;
  url: string;
  title: string;
}

export interface TutorAnswer {
  answer_md: string;
  used_source_ids: string[];
  used_fact_ids: string[];
  citations: Citation[];
  scope: string;
  assessment: {
    target_level: MasteryLevel;
    outcome: EvidenceOutcome;
    rationale: string;
    suggested_next: 'deeper' | 'reinforce' | 'remedial';
  };
  escalated: boolean;
  confidence: number;
}

export type MasteryLevel = 'L0' | 'L1' | 'L2' | 'L3';
export type EvidenceOutcome = 'demonstrated' | 'partial' | 'wrong';

export type BlockType =
  | 'text' | 'code' | 'quiz' | 'diagram' | 'exercise'
  | 'example' | 'note' | 'warning' | 'tip' | 'definition';

export interface LessonBlock {
  id: string;
  type: BlockType;
  content?: string;
  /** MCQ / numeric / open */
  format?: string;
  options?: string[];
  answer_key?: number | string;
  level?: MasteryLevel;
  rubric?: Record<string, unknown>;
}

export interface LessonNode {
  id: string;
  title: string;
  blocks: LessonBlock[];
  mastery_target: MasteryLevel;
  prerequisites?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  version?: string;
  part: number;
  tags?: string[];
  nodes: LessonNode[];
  source_url?: string;
}

export type LessonSummary = Pick<Lesson, 'id' | 'title' | 'part' | 'tags'>;

export interface LessonWithNodes extends Lesson {
  // Same shape as Lesson, but guaranteed to have populated nodes
}

export interface NodeProgress {
  node_id: string;
  level: MasteryLevel;
  evidence_count: number;
  last_practiced: string;
  due_review: string | null;
  evidence: EvidenceRecord[];
}

export interface EvidenceRecord {
  id: number;
  node_id: string;
  source: string;
  target_level: MasteryLevel;
  outcome: EvidenceOutcome;
  detail: string;
  created_at: string;
}

export interface LearnerProfile {
  priorKnowledge: Record<string, 'none' | 'some' | 'comfortable'>;
  learningGoals: string[];
  preferredPace: 'relaxed' | 'moderate' | 'intensive';
  timeCommitment: number;
  educationLevel: 'highschool' | 'undergrad' | 'grad' | 'professional';
}

export const DEFAULT_PROFILE: LearnerProfile = {
  priorKnowledge: {},
  learningGoals: [],
  preferredPace: 'moderate',
  timeCommitment: 5,
  educationLevel: 'undergrad',
};

export interface LdocDocument {
  lesson: Lesson;
  metadata?: Record<string, unknown>;
}
```

---

## 4. TutorPanel (src/components/learn/TutorPanel.tsx)

```typescript
// src/components/learn/TutorPanel.tsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Bot, Sparkles, ChevronDown, ChevronUp, Quote, AlertTriangle } from 'lucide-react';
import type { TutorAnswer } from '../../shared/learn/types';

interface TutorPanelProps {
  open: boolean;
  onClose: () => void;
  question: string;
  onQuestionChange: (q: string) => void;
  onSubmit: () => void;
  answer: TutorAnswer | null;
  loading: boolean;
  onInsert: (md?: string) => void;
}

function renderAnswerHtml(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold text-zinc-200 mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold text-zinc-100 mt-4 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-zinc-100 mt-4 mb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-zinc-200">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-zinc-300 italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-zinc-800 text-clay-300 text-xs font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="text-sm text-zinc-300 ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-sm text-zinc-300 ml-4 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-sm text-zinc-300 leading-relaxed mb-2">')
    .replace(/\[(\d+)\]/g, '<sup class="text-clay-400 text-[10px] ml-0.5">[$1]</sup>');
  html = '<p class="text-sm text-zinc-300 leading-relaxed mb-2">' + html + '</p>';
  return html;
}

function useTypingEffect(text: string, speed: number = 18): string {
  const [displayed, setDisplayed] = useState('');
  const idxRef = useRef(0);
  useEffect(() => {
    idxRef.current = 0;
    setDisplayed('');
    if (!text) return;
    const interval = setInterval(() => {
      idxRef.current++;
      setDisplayed(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

export function TutorPanel({
  open, onClose, question, onQuestionChange, onSubmit,
  answer, loading, onInsert,
}: TutorPanelProps) {
  const [showCitations, setShowCitations] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [answer]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); }
    if (e.key === 'Escape') onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15 }}
          className="w-80 border-l border-zinc-800 bg-zinc-900/80 backdrop-blur-xl flex flex-col shrink-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-clay-400" />
              <span className="text-sm font-medium text-zinc-200">Tutor</span>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 ws-scroll">
            {!answer && !loading && (
              <div className="text-center py-12">
                <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-xs text-zinc-600">Select text or type a question</p>
              </div>
            )}
            {loading && (
              <div className="flex items-center gap-3 text-zinc-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin text-clay-400" />
                Thinking...
              </div>
            )}
            {answer && !loading && (
              <>
                {/* Answer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-clay-400 font-medium">
                    <Bot className="w-3.5 h-3.5" />
                    Answer
                    {answer.confidence < 0.5 && (
                      <span className="flex items-center gap-1 text-amber-400 ml-auto">
                        <AlertTriangle className="w-3 h-3" /> Low confidence
                      </span>
                    )}
                  </div>
                  <div
                    className="prose-custom leading-relaxed [&_p]:text-sm [&_p]:text-zinc-300"
                    dangerouslySetInnerHTML={{ __html: renderAnswerHtml(useTypingEffect(answer.answer_md)) }}
                  />
                </div>

                {/* Citations */}
                {answer.citations.length > 0 && (
                  <div className="border-t border-zinc-800 pt-3">
                    <button
                      onClick={() => setShowCitations(!showCitations)}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
                    >
                      <Quote className="w-3 h-3" />
                      {answer.citations.length} citation{answer.citations.length > 1 ? 's' : ''}
                      {showCitations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <AnimatePresence>
                      {showCitations && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <ul className="mt-2 space-y-1">
                            {answer.citations.map((c: { id: string; title: string }) => (
                              <li key={c.id} className="text-xs text-zinc-600">[{c.id}] {c.title}</li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Assessment */}
                {answer.assessment && (
                  <div className="border-t border-zinc-800 pt-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500">Level:</span>
                      <span className="font-mono text-zinc-300">{answer.assessment.target_level}</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-500">Next:</span>
                      <span className="text-clay-400 capitalize">{answer.assessment.suggested_next}</span>
                    </div>
                  </div>
                )}

                {/* Insert button */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => onInsert(answer.answer_md)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition"
                  >
                    Insert into note
                  </button>
                </div>
              </>
            )}
            {answer?.escalated && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-800/30 text-xs text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                This question is outside the current node's scope.
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => onQuestionChange(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about this concept..."
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-clay-400/50 transition"
              />
              <button
                onClick={onSubmit}
                disabled={loading || !question.trim()}
                className="p-2 rounded-lg bg-clay-500 hover:bg-clay-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## 5. SelectionActions (src/components/learn/SelectionActions.tsx)

```typescript
// src/components/learn/SelectionActions.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Lightbulb, MessageSquare, ChevronDown, ChevronUp, Brain, Highlighter, StickyNote, Trash2 } from 'lucide-react';
import type { Highlight } from '../../services/learn/highlightAnchor';

interface SelectionActionsProps {
  onAsk: (text: string, mode: 'explain' | 'ask' | 'simpler' | 'deeper') => void;
  onCreateHighlight: (color: Highlight['color']) => void;
  onAddNote: (id: string, note: string) => void;
  onChangeColor: (id: string, color: Highlight['color']) => void;
  onDeleteHighlight: (id: string) => void;
  selectedText: string;
  activeHighlight: Highlight | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function SelectionActions({
  onAsk, onCreateHighlight, onAddNote, onChangeColor, onDeleteHighlight,
  selectedText, activeHighlight, containerRef,
}: SelectionActionsProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !selectedText) {
      setPosition({ top: -9999, left: -9999 });
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setPosition({
      top: rect.top - containerRect.top - 44,
      left: rect.left - containerRect.left + rect.width / 2,
    });
  }, [selectedText, containerRef]);

  const tutorActions = [
    { icon: Lightbulb, label: 'Explain', mode: 'explain' as const },
    { icon: MessageSquare, label: 'Ask', mode: 'ask' as const },
    { icon: ChevronDown, label: 'Simpler', mode: 'simpler' as const },
    { icon: ChevronUp, label: 'Deeper', mode: 'deeper' as const },
  ];

  const HIGHLIGHT_COLORS: { name: Highlight['color']; css: string }[] = [
    { name: 'yellow', css: '#fbbf24' },
    { name: 'green', css: '#22c55e' },
    { name: 'blue', css: '#3b82f6' },
    { name: 'pink', css: '#ec4899' },
    { name: 'orange', css: '#f97316' },
  ];

  if (!selectedText) return null;

  return (
    <div
      ref={toolbarRef}
      className="lyceum-selection-toolbar fixed z-50 pointer-events-auto"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Tutor actions */}
      {tutorActions.map(({ icon: Icon, label, mode }) => (
        <button
          key={mode}
          className="lyceum-selection-action"
          onClick={() => onAsk(selectedText, mode)}
          title={label}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}

      <div className="w-px h-5 bg-zinc-700 mx-1" />

      {/* Highlight button */}
      {activeHighlight ? (
        <>
          <button
            className="lyceum-selection-action"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Change color"
          >
            <Highlighter className="w-3.5 h-3.5" style={{ color: HIGHLIGHT_COLORS.find(c => c.name === activeHighlight.color)?.css }} />
          </button>
          <button
            className="lyceum-selection-action lyceum-selection-action-delete"
            onClick={() => onDeleteHighlight(activeHighlight.id)}
            title="Remove highlight"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            className="lyceum-selection-action"
            onClick={() => setShowNoteInput(!showNoteInput)}
            title={activeHighlight.note ? 'Edit note' : 'Add note'}
          >
            <StickyNote className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <button
          className="lyceum-selection-action"
          onClick={() => {
            onCreateHighlight('yellow');
            setShowColorPicker(false);
          }}
          title="Highlight"
        >
          <Highlighter className="w-3.5 h-3.5 text-amber-400" />
        </button>
      )}

      {/* Color picker */}
      {showColorPicker && (
        <div className="lyceum-selection-colors">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.name}
              className="lyceum-selection-color-btn"
              style={{ backgroundColor: c.css, borderColor: activeHighlight?.color === c.name ? '#fff' : 'transparent' }}
              onClick={() => { onChangeColor(activeHighlight!.id, c.name); setShowColorPicker(false); }}
            />
          ))}
        </div>
      )}

      {/* Note input */}
      {showNoteInput && activeHighlight && (
        <div className="absolute top-full mt-2 right-0 bg-zinc-800 border border-zinc-700 rounded-lg p-2 shadow-xl w-48 z-50">
          <input
            type="text"
            value={noteText || activeHighlight.note || ''}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className="w-full px-2 py-1 rounded bg-zinc-700 border border-zinc-600 text-xs text-zinc-200 placeholder-zinc-500 outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') { onAddNote(activeHighlight.id, noteText); setShowNoteInput(false); }
              if (e.key === 'Escape') setShowNoteInput(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 6. Highlight System

### 6a. Storage layer (src/services/learn/highlightAnchor.ts)

```typescript
// src/services/learn/highlightAnchor.ts

const STORAGE_PREFIX = 'lyceum.highlights.';

export interface Highlight {
  id: string;
  lessonId: string;
  partSlug: string;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'orange';
  note?: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getStorageKey(lessonId: string): string {
  return `${STORAGE_PREFIX}${lessonId}`;
}

export function getHighlightsForLesson(lessonId: string): Highlight[] {
  try {
    const raw = localStorage.getItem(getStorageKey(lessonId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHighlights(lessonId: string, highlights: Highlight[]): void {
  try {
    localStorage.setItem(getStorageKey(lessonId), JSON.stringify(highlights));
  } catch {
    // localStorage full or unavailable
  }
}

export function addHighlight(data: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt'>): Highlight {
  const highlight: Highlight = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const existing = getHighlightsForLesson(data.lessonId);
  existing.push(highlight);
  saveHighlights(data.lessonId, existing);
  return highlight;
}

export function updateHighlight(id: string, updates: Partial<Omit<Highlight, 'id' | 'createdAt' | 'lessonId'>>): Highlight | null {
  const allKeys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
  for (const key of allKeys) {
    const highlights = getHighlightsForLesson(key.replace(STORAGE_PREFIX, ''));
    const idx = highlights.findIndex(h => h.id === id);
    if (idx !== -1) {
      highlights[idx] = { ...highlights[idx], ...updates, updatedAt: new Date().toISOString() };
      saveHighlights(key.replace(STORAGE_PREFIX, ''), highlights);
      return highlights[idx];
    }
  }
  return null;
}

export function removeHighlight(id: string): void {
  const allKeys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
  for (const key of allKeys) {
    const highlights = getHighlightsForLesson(key.replace(STORAGE_PREFIX, ''));
    const idx = highlights.findIndex(h => h.id === id);
    if (idx !== -1) {
      highlights.splice(idx, 1);
      saveHighlights(key.replace(STORAGE_PREFIX, ''), highlights);
      return;
    }
  }
}
```

### 6b. React hook (src/components/learn/useHighlights.ts)

```typescript
// src/components/learn/useHighlights.ts

import { useState, useCallback, useEffect } from 'react';
import type { Highlight } from '../../services/learn/highlightAnchor';
import {
  getHighlightsForLesson,
  addHighlight,
  updateHighlight,
  removeHighlight,
} from '../../services/learn/highlightAnchor';

interface UseHighlightsOptions {
  lessonId: string;
  partSlug: string;
}

export function useHighlights({ lessonId, partSlug }: UseHighlightsOptions) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  const refresh = useCallback(() => {
    setHighlights(getHighlightsForLesson(lessonId));
  }, [lessonId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createHighlight = useCallback(
    (text: string, startOffset: number, endOffset: number, color: Highlight['color'] = 'yellow') => {
      const h = addHighlight({ lessonId, partSlug, text, color, startOffset, endOffset });
      setHighlights(prev => [...prev, h]);
      return h;
    },
    [lessonId, partSlug],
  );

  const editNote = useCallback((id: string, note: string) => {
    const updated = updateHighlight(id, { note });
    if (updated) setHighlights(prev => prev.map(h => h.id === id ? updated : h));
  }, []);

  const changeColor = useCallback((id: string, color: Highlight['color']) => {
    const updated = updateHighlight(id, { color });
    if (updated) setHighlights(prev => prev.map(h => h.id === id ? updated : h));
  }, []);

  const deleteHighlight = useCallback((id: string) => {
    removeHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
  }, []);

  return { highlights, isSelecting, setIsSelecting, createHighlight, editNote, changeColor, deleteHighlight };
}
```

---

## 7. IPC Channels (src/preload.ts lines 908-933)

```typescript
// src/preload.ts — all learn* IPC bridges

learnListLessons: (opts?: { part?: number }) =>
  ipcRenderer.invoke('learn:listLessons', opts || {}),

learnGetLesson: (params: { lessonId: string }) =>
  ipcRenderer.invoke('learn:getLesson', params),

learnGetNode: (params: { nodeId: string }) =>
  ipcRenderer.invoke('learn:getNode', params),

learnGetGraph: (opts?: { part?: number }) =>
  ipcRenderer.invoke('learn:getGraph', opts || {}),

learnImportLdoc: (payload: { source?: string; json?: unknown }) =>
  ipcRenderer.invoke('learn:importLdoc', payload),

learnValidate: (payload: { source?: string; json?: unknown }) =>
  ipcRenderer.invoke('learn:validate', payload),

learnPickFile: () =>
  ipcRenderer.invoke('learn:pick-file'),

learnGetWorkedExample: () =>
  ipcRenderer.invoke('learn:get-worked-example'),

learnGetSchema: () =>
  ipcRenderer.invoke('learn:get-schema'),

learnGetAuthorGuide: () =>
  ipcRenderer.invoke('learn:get-author-guide'),

learnAskTutor: (params: { nodeId: string; blockId?: string; question: string }) =>
  ipcRenderer.invoke('learn:askTutor', params),

learnSubmitQuiz: (params: { nodeId: string; blockId: string; response: string }) =>
  ipcRenderer.invoke('learn:submitQuiz', params),

learnGetProgress: (opts?: { nodeId?: string }) =>
  ipcRenderer.invoke('learn:getProgress', opts || {}),

learnGetDueReviews: () =>
  ipcRenderer.invoke('learn:getDueReviews'),

learnListRecipes: () =>
  ipcRenderer.invoke('learn:listRecipes'),

learnBuildPromptFromRecipe: (params: { recipeSlug: string; topic?: string; userInput?: string }) =>
  ipcRenderer.invoke('learn:buildPromptFromRecipe', params),

learnBuildPrompt: (params: {
  userInput?: string;
  topic?: string;
  description?: string;
  contextDoc?: string;
  numNodes?: number;
  masteryTargets?: string[];
}) =>
  ipcRenderer.invoke('learn:buildPrompt', params),

learnGenerateLdoc: (params: { prompt: string; systemPrompt: string }) =>
  ipcRenderer.invoke('learn:generateLdoc', params),

learnGetProfile: (params: { key: string }) =>
  ipcRenderer.invoke('learn:getProfile', params),

learnSetProfile: (params: { key: string; value: string }) =>
  ipcRenderer.invoke('learn:setProfile', params),

learnDeleteProfile: (params: { key: string }) =>
  ipcRenderer.invoke('learn:deleteProfile', params),

learnGetAllProfile: () =>
  ipcRenderer.invoke('learn:getAllProfile'),
```

---

## 8. IPC Handler Registration (src/services/learn/index.ts)

```typescript
// src/services/learn/index.ts — ALL IPC handlers (full file, 356 lines)

import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type Database from 'better-sqlite3';
import { runMigration } from './db/repo';
import { ContentService } from './services/content.service';
import { ImportService } from './services/import.service';
import { ProgressService } from './services/progress.service';
import { TutorService } from './services/tutor.service';
import { validateFull } from './validator/validate';
import { toLdoc } from './lessonInput';
import { LessonMarkdownError } from './parseLessonMarkdown';

function extractJsonObject(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s.trim();
}

function stripTrailingCommas(s: string): string {
  return s.replace(/,\s*([}\]])/g, '$1');
}

function parseLessonJson(raw: string):
  | { ok: true; data: unknown }
  | { ok: false; error: string } {
  const attempts = [raw, extractJsonObject(raw), stripTrailingCommas(raw), stripTrailingCommas(extractJsonObject(raw))];
  for (const candidate of attempts) {
    try { return { ok: true, data: JSON.parse(candidate) }; } catch { /* try next */ }
  }
  const cleaned = stripTrailingCommas(extractJsonObject(raw));
  try { return { ok: true, data: JSON.parse(cleaned) }; }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `AI output was not valid JSON even after sanitisation: ${msg}. Cleaned preview: ${cleaned.slice(0, 200)}` };
  }
}

function toLdocDocument(raw: string):
  | { ok: true; data: import('../../shared/learn/types').LdocDocument }
  | { ok: false; error: string } {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{')) {
    const parsed = parseLessonJson(raw);
    if (!parsed.ok) return parsed;
    return { ok: true, data: parsed.data as import('../../shared/learn/types').LdocDocument };
  }
  try {
    const { parseLessonMarkdown } = require('./parseLessonMarkdown');
    return { ok: true, data: parseLessonMarkdown(raw) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Could not compile .lmd lesson: ${msg}` };
  }
}

function loadLearnerProfile(db: Database): import('../../shared/learn/types').LearnerProfile | null {
  const KEY = 'lyceum.learnerProfile.v1';
  try {
    const { getProfileValue } = require('./db/repo');
    const raw = getProfileValue(db, KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const { DEFAULT_PROFILE } = require('../../shared/learn/types');
    return { ...DEFAULT_PROFILE, ...parsed, priorKnowledge: { ...(parsed.priorKnowledge ?? {}) } };
  } catch { return null; }
}

export function registerLearnHandlers(db: Database, callAi: (prompt: string, systemPrompt: string, maxTokens?: number) => Promise<any>) {
  runMigration(db);

  const content = new ContentService(db);
  const importer = new ImportService(db);
  const progress = new ProgressService(db);

  const readResource = (rel: string) => {
    const fp = resourcePath(rel);
    return existsSync(fp) ? readFileSync(fp, 'utf-8') : null;
  };
  const { loadPromptLibrary, composeTutorPersona } = require('./promptLibrary');
  const lib = loadPromptLibrary(readResource);
  const profile = loadLearnerProfile(db);
  const tutorPersona = composeTutorPersona(lib, profile ?? undefined);

  const tutor = new TutorService(db, callAi, tutorPersona);

  // ── Import & Validate ──
  ipcMain.handle('learn:importLdoc', (_event, payload: { source?: string; json?: unknown }) => {
    if (typeof payload.source === 'string') {
      const doc = toLdocDocument(payload.source);
      if (!doc.ok) return { ok: false, error: doc.error };
      return importer.importLdoc(doc.data);
    }
    if (payload.json && typeof payload.json === 'object') return importer.importLdoc(payload.json);
    return { ok: false, error: 'Invalid payload' };
  });

  ipcMain.handle('learn:validate', (_event, payload: { source?: string; json?: unknown }) => {
    if (typeof payload.source === 'string') {
      const doc = toLdocDocument(payload.source);
      if (!doc.ok) return { ok: false, errors: [{ rule: 'parse', message: doc.error }], warnings: [] };
      return validateFull(doc.data);
    }
    if (payload.json && typeof payload.json === 'object') return validateFull(payload.json);
    return { ok: false, errors: [{ rule: 'parse', message: 'Invalid payload' }], warnings: [] };
  });

  // ── File picker & bundled resources ──
  ipcMain.handle('learn:pick-file', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select a lesson file (.lmd or .ldoc)',
      filters: [{ name: 'Lyceum Lesson', extensions: ['lmd', 'ldoc', 'json', 'md'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const content = readFileSync(result.filePaths[0], 'utf-8');
    return { canceled: false, content, filePath: result.filePaths[0] };
  });

  function resourcePath(name: string) {
    const dev = resolve(app.getAppPath(), 'resources/learn', name);
    if (existsSync(dev)) return dev;
    return resolve(app.getAppPath(), 'dist-electron/resources/learn', name);
  }

  ipcMain.handle('learn:get-worked-example', () => {
    const fp = resourcePath('memory-hierarchy.ldoc');
    if (!existsSync(fp)) return { found: false, content: null };
    return { found: true, content: readFileSync(fp, 'utf-8') };
  });

  ipcMain.handle('learn:get-schema', () => {
    const fp = resourcePath('ldoc.schema.json');
    if (!existsSync(fp)) return { found: false, content: null };
    return { found: true, content: readFileSync(fp, 'utf-8') };
  });

  ipcMain.handle('learn:get-author-guide', () => {
    const fp = resourcePath('author-guide.md');
    if (!existsSync(fp)) return { found: false, content: null };
    return { found: true, content: readFileSync(fp, 'utf-8') };
  });

  // ── Content ──
  ipcMain.handle('learn:listLessons', (_event, { part }: { part?: number } = {}) => content.listLessons(part));
  ipcMain.handle('learn:getLesson', (_event, { lessonId }: { lessonId: string }) => content.getLesson(lessonId));
  ipcMain.handle('learn:getNode', (_event, { nodeId }: { nodeId: string }) => content.getNode(nodeId));
  ipcMain.handle('learn:getGraph', (_event, { part }: { part?: number } = {}) => content.getGraph(part));

  // ── Tutor ──
  ipcMain.handle('learn:askTutor', (_event, params: { nodeId: string; blockId?: string; question: string; personaMd?: string }) => tutor.ask(params));
  ipcMain.handle('learn:submitQuiz', (_event, params: { nodeId: string; blockId: string; response: string }) => tutor.submitQuiz(params));

  // ── Progress ──
  ipcMain.handle('learn:getProgress', (_event, { nodeId }: { nodeId?: string } = {}) => progress.getProgress(nodeId));
  ipcMain.handle('learn:getDueReviews', () => progress.getDueReviews());

  // ── Prompt Library ──
  ipcMain.handle('learn:listRecipes', () => { const { listRecipes } = require('./promptLibrary'); return listRecipes(); });
  ipcMain.handle('learn:buildPromptFromRecipe', (_event, params: { recipeSlug: string; topic?: string; userInput?: string }) => {
    const { buildPrompt } = require('./promptLibrary');
    const result = buildPrompt(params.recipeSlug, params.topic, params.userInput);
    if (!result) return { ok: false, error: `Recipe "${params.recipeSlug}" not found` };
    return { ok: true, ...result };
  });

  // ── Content Generation ──
  ipcMain.handle('learn:buildPrompt', async (_event, params: { userInput?: string; topic?: string; description?: string; contextDoc?: string; numNodes?: number; masteryTargets?: string[] }) => {
    const readResource = (rel: string) => { const fp = resourcePath(rel); return existsSync(fp) ? readFileSync(fp, 'utf-8') : null; };
    const { loadPromptLibrary, composeAuthorSystemPrompt, composeTopicUserPrompt } = require('./promptLibrary');
    const { CURRICULUM_BLUEPRINT } = require('./curriculum');
    const lib = loadPromptLibrary(readResource);
    const part = params.topic ? CURRICULUM_BLUEPRINT.find((p: any) => p.slug === params.topic || p.title === params.topic) : undefined;
    const profile = loadLearnerProfile(db);
    const systemPrompt = composeAuthorSystemPrompt(lib, { part: part?.part, profile: profile ?? undefined });
    let userPrompt: string;
    if (params.userInput !== undefined) {
      userPrompt = `The learner has described what they want to learn below...\n\n--- LEARNER'S REQUEST ---\n${params.userInput.trim()}\n`;
      if (params.contextDoc?.trim()) userPrompt += `\n--- REFERENCE MATERIAL ---\n"""\n${params.contextDoc.trim()}\n"""\n`;
      if (part) { const tp = composeTopicUserPrompt(part.part, profile ?? undefined); if (tp) userPrompt = `${tp}\n\n---\n\n${userPrompt}`; }
    } else {
      userPrompt = part ? composeTopicUserPrompt(part.part, profile ?? undefined) : `Author a lesson on: ${params.topic}\n`;
      if (params.description?.trim()) userPrompt += `\nAdditional context: ${params.description.trim()}\n`;
      if (params.contextDoc?.trim()) userPrompt += `\nReference material:\n"""\n${params.contextDoc.trim()}\n"""\n`;
      if (params.numNodes && params.numNodes > 0) userPrompt += `\nStructure: create exactly ${params.numNodes} concepts/nodes.`;
      if (params.masteryTargets?.length) userPrompt += `\nMastery targets: ${params.masteryTargets.join(', ')}.`;
    }
    return { ok: true, prompt: systemPrompt + '\n\n---\n\n' + userPrompt, systemPrompt, userPrompt };
  });

  ipcMain.handle('learn:generateLdoc', async (_event, { prompt, systemPrompt }: { prompt: string; systemPrompt: string }) => {
    try {
      const raw = await callAi(prompt, systemPrompt, 8000);
      if (!raw || typeof raw !== 'string') return { ok: false, error: 'AI returned an empty response.' };
      let parsed: unknown;
      try { parsed = toLdoc(raw).doc; }
      catch (e) { const msg = e instanceof LessonMarkdownError ? e.message : (e as Error).message; return { ok: false, error: `Could not compile lesson: ${msg}`, raw }; }
      const valResult = validateFull(parsed);
      if (!valResult.ok) return { ok: false, error: 'AI-generated lesson failed validation', validation: valResult, raw };
      return importer.importLdoc(parsed);
    } catch (e: any) { return { ok: false, error: e.message }; }
  });

  // ── Learner Profile ──
  const { getProfileValue, setProfileValue, deleteProfileValue, getAllProfileValues } = require('./db/repo');
  ipcMain.handle('learn:getProfile', (_event, { key }: { key: string }) => { try { return getProfileValue(db, key); } catch { return null; } });
  ipcMain.handle('learn:setProfile', (_event, { key, value }: { key: string; value: string }) => { try { setProfileValue(db, key, value); return { ok: true }; } catch (e: any) { return { ok: false, error: e.message }; } });
  ipcMain.handle('learn:deleteProfile', (_event, { key }: { key: string }) => { try { deleteProfileValue(db, key); return { ok: true }; } catch (e: any) { return { ok: false, error: e.message }; } });
  ipcMain.handle('learn:getAllProfile', () => { try { return getAllProfileValues(db); } catch { return {}; } });
}
```

---

## 9. DB Migration + Schema

### 9a. Migration runner (src/services/learn/db/repo.ts)

```typescript
// src/services/learn/db/repo.ts (key functions)

import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function runMigration(db: Database): void {
  const migrationsDir = join(__dirname, 'migrations');
  const applied = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'").get()
      ? db.prepare('SELECT name FROM _migrations').all().map((r: any) => r.name)
      : []
  );

  if (!applied.has('_migrations')) {
    db.exec('CREATE TABLE _migrations (name TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime(\'now\')))');
    applied.add('_migrations');
  }

  for (let i = 1; i <= 99; i++) {
    const name = `${String(i).padStart(3, '0')}_learn.sql`;
    if (applied.has(name)) continue;
    const fp = join(migrationsDir, name);
    if (!existsSync(fp)) break;
    const sql = readFileSync(fp, 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(name);
    console.log(`[learn] Applied migration: ${name}`);
  }
}

// Pre-prepared statements (lazy compile pattern):
export function getLesson(db: Database, id: string) {
  return db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
}

export function setTutorCache(db: Database, entry: { key: string; node_id: string; answer_json: string; model: string; created_at: string }) {
  db.prepare(`INSERT OR REPLACE INTO tutor_cache (key, node_id, answer_json, model, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    entry.key, entry.node_id, entry.answer_json, entry.model, entry.created_at
  );
}

export function getTutorCache(db: Database, key: string) {
  return db.prepare('SELECT * FROM tutor_cache WHERE key = ?').get(key);
}

export function getProfileValue(db: Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM profile_kv WHERE key = ?').get(key) as any;
  return row?.value ?? null;
}

export function setProfileValue(db: Database, key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO profile_kv (key, value) VALUES (?, ?)').run(key, value);
}

export function deleteProfileValue(db: Database, key: string): void {
  db.prepare('DELETE FROM profile_kv WHERE key = ?').run(key);
}

export function getAllProfileValues(db: Database): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM profile_kv').all() as any[];
  const result: Record<string, string> = {};
  for (const r of rows) result[r.key] = r.value;
  return result;
}
```

### 9b. Schema — 001_learn.sql

```sql
-- src/services/learn/db/migrations/001_learn.sql

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT DEFAULT '',
  author TEXT DEFAULT '',
  version TEXT DEFAULT '1.0.0',
  part INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  source_url TEXT DEFAULT '',
  metadata_json TEXT DEFAULT '{}',
  blocks_json TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lesson_nodes (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  mastery_target TEXT DEFAULT 'L2',
  prerequisites TEXT DEFAULT '[]',
  blocks_json TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lesson_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  label TEXT DEFAULT '',
  UNIQUE(lesson_id, source_id, target_id)
);

CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id TEXT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'quiz',
  target_level TEXT NOT NULL DEFAULT 'L2',
  outcome TEXT NOT NULL DEFAULT 'partial',
  detail TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tutor_cache (
  key TEXT PRIMARY KEY,
  node_id TEXT NOT NULL DEFAULT '',
  answer_json TEXT NOT NULL DEFAULT '{}',
  model TEXT NOT NULL DEFAULT 'small',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mastery_progress (
  node_id TEXT PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'L0',
  evidence_count INTEGER DEFAULT 0,
  last_practiced TEXT,
  due_review TEXT,
  FOREIGN KEY (node_id) REFERENCES lesson_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS curriculum_parts (
  part INTEGER PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  lesson_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lesson_nodes_lesson ON lesson_nodes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_edges_lesson ON lesson_edges(lesson_id);
CREATE INDEX IF NOT EXISTS idx_evidence_node ON evidence(node_id);
```

### 9c. Learner Profile — 002_learn_profile.sql

```sql
-- src/services/learn/db/migrations/002_learn_profile.sql

CREATE TABLE IF NOT EXISTS profile_kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
```

---

## 10. Main Process Integration (src/main.ts lines 2880-2905)

```typescript
// src/main.ts — learn module registration

// Register Lyceum Learn module IPC handlers
try {
  const { registerLearnHandlers } = require('./services/learn/index.js');
  const { buildChain, runWithFallback } = require("./services/providers/router.cjs");
  registerLearnHandlers(db, async (prompt: string, systemPrompt: string, maxTokens?: number) => {
    const p = userPreferences || {};
    const pState = migrateProviderNames(JSON.parse(p.aiProviders || 'null'));
    if (!pState || !pState.providers || pState.providers.filter((p: any) => p.enabled).length === 0) {
      throw new Error('No AI provider configured');
    }
    const chain = buildChain(pState, 'goalAssistant');
    if (chain.length === 0) throw new Error('No AI provider configured');
    const { result } = await runWithFallback(chain, {
      systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: maxTokens || 500,
    });
    return result.content;
  });
  console.log('[DeskFlow] ✅ Lyceum Learn module registered');
} catch (err: any) {
  console.warn('[DeskFlow] ⚠️ Lyceum Learn module failed to register:', err.message);
}
```

App.tsx routing:

```typescript
// src/App.tsx — route + sidebar entry

// Import:
import { LearnPage } from './components/learn/LearnPage';

// Sidebar item:
{ icon: GraduationCap, label: 'Learn', path: '/learn' },

// Route:
<Route path="/learn" element={<LearnPage />} />
```

---

## 11. TutorService (src/services/learn/services/tutor.service.ts)

```typescript
// src/services/learn/services/tutor.service.ts — FULL file, 208 lines

import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import { GroundingService } from './grounding.service';
import { ProgressService } from './progress.service';
import type { TutorAnswer, Result, MasteryLevel, EvidenceOutcome } from '../../shared/learn/types';

const TUTOR_SYSTEM_PROMPT = `You are a tutor for ONE concept. Answer ONLY using FACTS below.
If the answer isn't in FACTS, say you can't answer from this section.
Be visual-first: prefer an analogy or a step list; cite fact ids [s1].
Return JSON: { answer_md: string, used_source_ids: string[], used_fact_ids: string[] }`;

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
          used_source_ids: [], used_fact_ids: [], citations: [],
          scope: packet.scope.includes,
          assessment: { target_level: 'L0', outcome: 'partial', rationale: 'Out of scope question', suggested_next: 'reinforce' },
          escalated: true, confidence: 0,
        };
        return { ok: true, data: answer };
      }

      // 4. Build prompt from packet
      const factsText = packet.must_know.map((f, i) => `[f${i + 1}] ${f.claim}`).join('\n');
      const misconceptionsText = packet.misconceptions.map(m => `⚠️ Wrong: ${m.wrong} → Correct: ${m.correct}`).join('\n');
      const sourcesText = packet.sources.map(s => `[s${s.id}] ${s.title}: ${s.url}`).join('\n');
      const userPrompt = `FACTS:\n${factsText}\n\nMISCONCEPTIONS:\n${misconceptionsText}\n\nSOURCES:\n${sourcesText}\n\nQUESTION: ${params.question}`;

      // 5. Call small model for answer
      const systemPrompt = params.personaMd ? prependTutorPersona(params.personaMd) : this.systemPrompt;
      let answerResult;
      try { answerResult = await this.callAi(userPrompt, systemPrompt, 500); }
      catch { return { ok: false, error: 'AI provider unavailable. Please check your AI configuration.' }; }

      // Parse answer
      let answerMd = '', usedSourceIds: string[] = [], usedFactIds: string[] = [];
      try {
        const parsed = typeof answerResult === 'string' ? JSON.parse(answerResult) : answerResult;
        answerMd = parsed.answer_md || answerResult;
        usedSourceIds = parsed.used_source_ids || [];
        usedFactIds = parsed.used_fact_ids || [];
      } catch {
        answerMd = typeof answerResult === 'string' ? answerResult : JSON.stringify(answerResult);
      }

      // 6. Build citations
      const citations = packet.sources.filter(s => usedSourceIds.includes(s.id)).map(s => ({ id: s.id, url: s.url, title: s.title }));

      // 7. Assessment (lightweight)
      const assessment = {
        target_level: 'L1' as MasteryLevel,
        outcome: 'partial' as EvidenceOutcome,
        rationale: 'Question received, awaiting learner response for assessment.',
        suggested_next: 'deeper' as const,
      };

      // 8. Build answer object
      const answer: TutorAnswer = {
        answer_md, used_source_ids: usedSourceIds, used_fact_ids: usedFactIds, citations,
        scope: packet.scope.includes, assessment, escalated: false, confidence: retrieval_score,
      };

      // 9. Cache
      repo.setTutorCache(this.db, {
        key: cacheKey, node_id: params.nodeId,
        answer_json: JSON.stringify(answer), model: 'small',
        created_at: new Date().toISOString(),
      });

      return { ok: true, data: answer };
    } catch (err: any) { return { ok: false, error: err.message }; }
  }

  async submitQuiz(params: { nodeId: string; blockId: string; response: string }): Promise<Result<{ correct: boolean; explanation: string; evidenceId: number }>> {
    try {
      const node = repo.getNode(this.db, params.nodeId);
      if (!node) return { ok: false, error: 'Node not found' };
      const n = node as any;
      const blocks = JSON.parse(n.blocks_json);
      const quizBlock = blocks.find((b: any) => b.id === params.blockId && b.type === 'quiz');
      if (!quizBlock) return { ok: false, error: 'Quiz block not found' };

      let correct = false, explanation = '';
      if (quizBlock.format === 'mcq') {
        const answerIdx = parseInt(params.response, 10);
        correct = answerIdx === quizBlock.answer_key;
        explanation = correct ? 'Correct! Well done.' : `Not quite. The correct answer is: ${quizBlock.options[quizBlock.answer_key]}`;
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
        } catch { explanation = 'Response recorded. AI grading unavailable.'; }
      }

      const evidenceResult = this.progress.recordEvidence({
        node_id: params.nodeId, source: 'quiz',
        target_level: quizBlock.level, outcome: correct ? 'demonstrated' : 'wrong',
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

## 12. AI Call Chain

### 12a. buildChain + runWithFallback (src/services/providers/router.ts)

```typescript
// src/services/providers/router.ts — FULL file, 110 lines

import { CanonicalRequest, CanonicalResponse, ResolvedProvider, AiProvidersState, ProviderConfig } from './types';
import { PROVIDER_TEMPLATES } from './templates';
import { callProvider } from './callProvider';

export function buildChain(
  state: AiProvidersState,
  feature: 'researchDigest' | 'goalAssistant',
): Array<{ provider: ResolvedProvider; model: string }> {
  const enabled = state.providers.filter(p => p.enabled);
  const assigned = state.routing[feature] ?? state.routing.default;
  const resolve = (cfg: ProviderConfig): ResolvedProvider | null => {
    const template = PROVIDER_TEMPLATES[cfg.templateId];
    if (!template) return null;
    return { config: cfg, template };
  };
  const chain: Array<{ provider: ResolvedProvider; model: string }> = [];
  const primaryCfg = enabled.find(p => p.id === assigned.providerId);
  if (primaryCfg) {
    const p = resolve(primaryCfg);
    if (p) chain.push({ provider: p, model: assigned.model });
  }
  enabled.sort((a, b) => a.priority - b.priority)
    .filter(p => p.id !== assigned.providerId)
    .forEach(p => {
      const r = resolve(p);
      if (r) chain.push({ provider: r, model: p.models[0] ?? assigned.model });
    });
  return chain;
}

async function callWithTokenTiers(provider: ResolvedProvider, req: CanonicalRequest): Promise<CanonicalResponse> {
  const cfg = provider.config;
  if (cfg.monthlyTokenBudget && (cfg.tokensUsedThisMonth ?? 0) >= cfg.monthlyTokenBudget) {
    const e = new Error(`Budget exhausted for ${cfg.label}`);
    (e as any).status = 402;
    throw e;
  }
  const tiers = [req.maxTokens ?? 1500, 100, 50, 40];
  let lastErr: any;
  for (const maxTokens of tiers) {
    try {
      const res = await callProvider(provider, { ...req, maxTokens });
      const used = (res.usage?.prompt_tokens ?? 0) + (res.usage?.completion_tokens ?? 0);
      cfg.tokensUsedThisMonth = (cfg.tokensUsedThisMonth ?? 0) + used;
      return res;
    } catch (err: any) {
      lastErr = err;
      if (err.status !== 402) throw err;
    }
  }
  throw lastErr;
}

export async function runWithFallback(
  chain: ReturnType<typeof buildChain>,
  req: Omit<CanonicalRequest, 'model'>,
): Promise<{ result: CanonicalResponse; usedProviderId: string }> {
  let lastErr: any;
  const errors: string[] = [];
  for (const [i, link] of chain.entries()) {
    try {
      const result = await callWithTokenTiers(link.provider, { ...req, model: link.model });
      return { result, usedProviderId: link.provider.config.id };
    } catch (err: any) {
      lastErr = err;
      errors.push(`${link.provider.config.label || link.provider.config.id}: ${err.message}`);
    }
  }
  if (errors.length) throw new Error(`All ${errors.length} provider(s) failed — ${errors.join(' | ')}`);
  throw lastErr ?? new Error('No providers available');
}
```

### 12b. callProvider (src/services/providers/callProvider.ts)

```typescript
// src/services/providers/callProvider.ts — FULL 83 lines

export async function callProvider(
  provider: ResolvedProvider | ProviderConfig,
  req: CanonicalRequest,
): Promise<CanonicalResponse> {
  const isResolved = 'template' in provider;
  const config = isResolved ? provider.config : provider;
  const template = isResolved ? provider.template : PROVIDER_TEMPLATES[config.templateId];
  if (!template) throw new Error(`No template found for provider ${config.id}`);

  const baseUrl = config.baseUrl || template.defaultBaseUrl;
  if (!baseUrl) throw new Error(`Provider ${config.id} has no base URL configured`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(template.staticHeaders ?? {}),
  };
  let url = template.interpolateUrl ? template.interpolateUrl(baseUrl, config) : baseUrl;
  if (config.apiKey) {
    if (template.auth.type === 'bearer') headers['Authorization'] = `Bearer ${config.apiKey}`;
    else if (template.auth.type === 'header') headers[template.auth.headerName!] = config.apiKey;
    else if (template.auth.type === 'query') url += `?${template.auth.queryParam}=${encodeURIComponent(config.apiKey)}`;
  }

  const body = template.buildBody
    ? template.buildBody(req)
    : { model: req.model, messages: [{ role: 'system', content: req.systemPrompt }, ...req.messages], max_tokens: req.maxTokens ?? 500, temperature: req.temperature ?? 0.4 };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let response;
  try { response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal }); }
  finally { clearTimeout(timeout); }

  if (!response.ok) {
    const errText = await response.text();
    const e = new Error(`${template.label} error ${response.status}: ${errText.slice(0, 200)}`);
    (e as any).status = response.status;
    throw e;
  }
  const raw = await response.json();
  let result: CanonicalResponse;
  if (template.parseResponse) {
    result = template.parseResponse(raw);
  } else {
    const choice = raw.choices?.[0];
    const msg = choice?.message ?? {};
    const content = msg.content ?? msg.reasoning ?? '';
    if (!content && choice?.finish_reason === 'length') {
      const e = new Error(`${template.label}: response truncated (finish_reason=length) — raise maxTokens`);
      (e as any).status = 422;
      throw e;
    }
    result = { content, usage: raw.usage };
  }
  return result;
}
```

### 12c. Provider Types (src/services/providers/types.ts)

```typescript
// src/services/providers/types.ts — FULL 55 lines

export interface ProviderTemplate {
  id: string; label: string; defaultBaseUrl: string;
  auth: { type: 'bearer' | 'header' | 'query'; headerName?: string; queryParam?: string };
  staticHeaders?: Record<string, string>;
  buildBody?: (req: CanonicalRequest) => unknown;
  parseResponse?: (raw: any) => CanonicalResponse;
  suggestedModels?: string[]; docsUrl?: string;
  interpolateUrl?: (url: string, config: ProviderConfig) => string;
  supportsStream?: boolean;
}

export interface CanonicalRequest {
  model: string; systemPrompt: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number; temperature?: number;
}

export interface CanonicalResponse { content: string; usage?: { prompt_tokens: number; completion_tokens: number }; }
export interface ResolvedProvider { config: ProviderConfig; template: ProviderTemplate; }

export interface ProviderConfig {
  id: string; templateId: string; label: string; enabled: boolean;
  apiKey?: string; baseUrl?: string; models: string[]; priority: number;
  monthlyTokenBudget?: number; tokensUsedThisMonth?: number;
  budgetResetDate?: string; extraConfig?: Record<string, string>;
}

export interface AiProvidersState {
  providers: ProviderConfig[];
  routing: {
    default: { providerId: string; model: string };
    researchDigest?: { providerId: string; model: string } | null;
    goalAssistant?: { providerId: string; model: string } | null;
  };
}
```

---

## 13. Prompt Library (src/services/learn/promptLibrary.ts)

```typescript
// src/services/learn/promptLibrary.ts — key exports

export const MASTERY_LADDER = `## Mastery Ladder (L0–L3)
- **L0 — Core**: Block definitions that must load before deeper levels.
- **L1 — Recognition / Recall**: Recognise terms, match definitions.
- **L2 — Application / Debug**: Apply concept in novel context.
- **L3 — Cross-domain / Teach**: Connect to other domains, generate teaching analogies.`;

export const SEGMENTATION_INSTRUCTION = `## Concept Segmentation Rules
1. If a concept is L2+ it needs L0/L1 prerequisites defined first.
2. Keep each concept ≤ 3 related sub-ideas or a single mental model.
3. Name each node as a noun phrase.`;

export interface PromptRecipe {
  slug: string;
  name: string;
  description: string;
  systemPrompt: string;
  userTemplate: string;
}

export function loadPromptLibrary(readResource: (rel: string) => string | null): { masteryLadder: string; segmentationRules: string; recipes: PromptRecipe[] } {
  const recipes: PromptRecipe[] = [
    {
      slug: 'explain-like-im-5',
      name: 'Explain Like I\'m 5',
      description: 'Ultra-simple explanation with a vivid analogy.',
      systemPrompt: 'You are an expert at explaining complex ideas to a 5-year-old.',
      userTemplate: 'Explain {topic} to a 5-year-old. Use a simple analogy.',
    },
    {
      slug: 'debug-my-thinking',
      name: 'Debug My Thinking',
      description: 'Spot holes in the learner\'s reasoning.',
      systemPrompt: 'You are a patient Socratic tutor. Find gaps in understanding.',
      userTemplate: 'I think {topic} works like this: {user_input}. Am I right?',
    },
    {
      slug: 'socratic-dialogue',
      name: 'Socratic Dialogue',
      description: 'Guided questions to reach the answer yourself.',
      systemPrompt: 'You are Socrates. Never give the answer directly — ask guiding questions.',
      userTemplate: 'Guide me to understand {topic}. Start with a question.',
    },
    {
      slug: 'deeper-dive',
      name: 'Deeper Dive',
      description: 'Advanced deep-dive with cross-domain connections.',
      systemPrompt: 'You are a domain expert connecting ideas across fields.',
      userTemplate: 'Go deeper on {topic}. Connect it to {user_input}.',
    },
  ];

  return {
    masteryLadder: readResource('mastery-ladder.md') ?? MASTERY_LADDER,
    segmentationRules: readResource('lesson-segmentation.md') ?? SEGMENTATION_INSTRUCTION,
    recipes,
  };
}

export function composeTutorPersona(lib: any, profile?: any): string {
  // Combines mastery ladder + profile into a persona block
  let md = lib.masteryLadder ? `## Mastery Framework\n${lib.masteryLadder}\n\n` : '';
  if (profile?.priorKnowledge) {
    md += `## Learner Profile\nPrior knowledge:\n`;
    for (const [topic, level] of Object.entries(profile.priorKnowledge)) {
      md += `- ${topic}: ${level}\n`;
    }
  }
  return md;
}

export function composeAuthorSystemPrompt(lib: any, opts?: { part?: number; profile?: any }): string {
  // Composes the full system prompt for lesson generation
  const parts: string[] = ['You are creating a lesson for the Lyceum learning system.'];
  if (lib.masteryLadder) parts.push(`\n${lib.masteryLadder}`);
  if (lib.segmentationRules) parts.push(`\n${lib.segmentationRules}`);
  if (opts?.profile) parts.push(`\nAdapt to learner: ${JSON.stringify(opts.profile)}`);
  return parts.join('\n');
}

export function listRecipes(): PromptRecipe[] {
  return loadPromptLibrary(() => null).recipes;
}

export function buildPrompt(slug: string, topic?: string, userInput?: string): { systemPrompt: string; userPrompt: string } | null {
  const recipe = loadPromptLibrary(() => null).recipes.find(r => r.slug === slug);
  if (!recipe) return null;
  let userPrompt = recipe.userTemplate.replace(/\{topic\}/g, topic || 'this concept');
  if (userInput) userPrompt = userPrompt.replace(/\{user_input\}/g, userInput);
  return { systemPrompt: recipe.systemPrompt, userPrompt };
}
```

---

## 14. LearnPage (src/components/learn/LearnPage.tsx)

```typescript
// src/components/learn/LearnPage.tsx — FULL orchestrator, 583 lines

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronLeft, Import, BarChart3, Grid3X3, Network, FileUp, FileCode2, HelpCircle, Download, CheckCircle2, AlertCircle, Loader2, Keyboard, SlidersHorizontal } from 'lucide-react';
import { BlockRenderer } from './blocks/BlockRenderer';
import { OnboardingPanel } from './OnboardingPanel';
import { CreateLessonDialog } from './CreateLessonDialog';
import { ValidationReport } from './ValidationReport';
import { TutorPanel } from './TutorPanel';
import { MasteryRing } from './MasteryRing';
import { CurriculumGraph } from './CurriculumGraph';
import { WelcomeEmptyState } from './WelcomeEmptyState';
import { LessonLibrary } from './LessonLibrary';
import { CurriculumShowcase } from './CurriculumShowcase';
import { LearnerSetup } from './LearnerSetup';
import { LearnerProfilePanel } from './LearnerProfilePanel';
import { TableOfContents, type TOCHeading } from './TableOfContents';
import { ChecklistProgress } from './ChecklistProgress';
import { AssessmentCard, AssessmentCardBlock, parseAssessmentBlock, type Question } from './AssessmentCard';
import { useHighlights } from './useHighlights';
import { SelectionActions } from './SelectionActions';
import { ReaderView } from './ReaderView';
import { ImportView } from './ImportView';
import type { LessonSummary, LessonWithNodes, RenderableNode, TutorAnswer, Result, ValidationIssue, MasteryLevel, NodeProgress, LessonSeed } from '../../shared/learn/types';
import { DEFAULT_PROFILE } from '../../shared/learn/types';
import { CURRICULUM_BLUEPRINT, type CurriculumPart } from '../../services/learn/curriculum';
import { getSystemPromptForSlug } from '../../services/learn/topicPrompts';
import { useMasteryStats } from './useMasteryStats';
import { hasProfile, saveProfile, syncProfileFromDB } from '../../services/learn/learnerProfile';

export interface LessonSeed {
  part: number; title: string; scope: string[]; topicPrompt: string;
}

type View = 'welcome' | 'showcase' | 'library' | 'reader' | 'import';
const api = window.deskflowAPI;

export function LearnPage() {
  // ── State ──
  const [view, setView] = useState<View>('welcome');
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState<LessonWithNodes | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorAnswer, setTutorAnswer] = useState<TutorAnswer | null>(null);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [progress, setProgress] = useState<Record<string, NodeProgress>>({});
  const [graphView, setGraphView] = useState<'grid' | 'graph'>('grid');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [importMode, setImportMode] = useState<'pick' | 'paste' | null>(null);
  const [importErrors, setImportErrors] = useState<ValidationIssue[]>([]);
  const [importWarnings, setImportWarnings] = useState<ValidationIssue[]>([]);
  const [importingExample, setImportingExample] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPart, setSelectedPart] = useState<CurriculumPart | null>(null);
  const [lessonSeed, setLessonSeed] = useState<LessonSeed | null>(null);
  const [completedParts, setCompletedParts] = useState<string[]>([]);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const setupChecked = useRef(false);
  const stats = useMasteryStats(progress, lessons);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const highlights = useHighlights({ lessonId: selectedLesson ?? '', partSlug: selectedPart?.slug ?? '' });

  // ── Effects ──
  useEffect(() => { loadLessons(); }, []);

  // First-visit profile check
  useEffect(() => {
    if (setupChecked.current) return;
    setupChecked.current = true;
    (async () => {
      await syncProfileFromDB();
      if (!hasProfile()) { saveProfile({ ...DEFAULT_PROFILE }); setShowSetup(true); }
      else { console.log('[LearnPage] Profile found — skipping setup'); }
    })();
  }, []);

  // Keyboard shortcuts (j/k for navigation, a for tutor, ? for shortcuts, g for graph toggle, Esc to close tutor)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (view === 'reader' && lessonData) {
        const nodes = lessonData.nodes;
        const currentIdx = nodes.findIndex(n => n.id === selectedNode);
        if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); const next = nodes[Math.min(currentIdx + 1, nodes.length - 1)]; if (next) setSelectedNode(next.id); }
        if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); const prev = nodes[Math.max(currentIdx - 1, 0)]; if (prev) setSelectedNode(prev.id); }
        if (e.key === 'a' && selectedNode) { e.preventDefault(); setTutorOpen(true); }
        if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); }
        if (e.key === 'g') { setGraphView(v => v === 'grid' ? 'graph' : 'grid'); }
      }
      if (e.key === 'Escape' && tutorOpen) setTutorOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [view, lessonData, selectedNode, graphView, tutorOpen]);

  // ── Handlers ──
  const loadLessons = async () => {
    try { setLoading(true); const result = await api.learnListLessons(); if (result.ok) setLessons(result.data); else setError(result.error); }
    catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const loadLesson = async (lessonId: string) => {
    try { setLoading(true); const result = await api.learnGetLesson({ lessonId }); if (result.ok) { setLessonData(result.data); setSelectedLesson(lessonId); setView('reader'); const prog = await api.learnGetProgress(); if (prog.ok) setProgress(prog.data); } else setError(result.error); }
    catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleImport = async () => {
    try { setLoading(true); const result = await api.learnImportLdoc({ source: importText }); setImportResult(result); if (result.ok && result.data.lessonId) loadLessons(); }
    catch (err: any) { setImportResult({ ok: false, error: err.message }); } finally { setLoading(false); }
  };

  const handleImportExample = async () => {
    setImportingExample(true);
    try {
      const { found, content } = await api.learnGetWorkedExample();
      if (!found || !content) { setImportResult({ ok: false, error: 'Worked example not found.' }); return; }
      setImportText(content);
      const valResult = await api.learnValidate({ source: content });
      setImportErrors(valResult.ok ? [] : valResult.errors);
      setImportWarnings(valResult.warnings || []);
      if (valResult.ok) {
        const r = await api.learnImportLdoc({ source: content });
        setImportResult(r);
        if (r.ok && r.data.lessonId) loadLessons();
      } else { setView('import'); setImportMode('paste'); setImportResult({ ok: false, error: 'Worked example failed validation.' }); }
    } catch (err: any) { setImportResult({ ok: false, error: err.message }); setView('import'); setImportMode('paste'); }
    finally { setImportingExample(false); }
  };

  const handlePickFile = async () => {
    try { const result = await api.learnPickFile(); if (result.canceled) return; setImportText(result.content); setImportMode('paste'); setView('import'); const valResult = await api.learnValidate({ source: result.content }); setImportErrors(valResult.ok ? [] : valResult.errors); setImportWarnings(valResult.warnings || []); } catch { }
  };

  const handleAskTutor = useCallback(async (nodeId: string, question: string) => {
    setTutorOpen(true); setTutorQuestion(question); setTutorLoading(true);
    try { const result = await api.learnAskTutor({ nodeId, question }); if (result.ok) setTutorAnswer(result.data); }
    catch (err: any) { setTutorAnswer({ answer_md: `Error: ${err.message}`, used_source_ids: [], used_fact_ids: [], citations: [], scope: '', assessment: { target_level: 'L0', outcome: 'wrong', rationale: err.message, suggested_next: 'reinforce' }, escalated: false, confidence: 0 }); }
    finally { setTutorLoading(false); }
  }, []);

  const handleSelectionAsk = useCallback((text: string, mode: 'explain' | 'ask' | 'simpler' | 'deeper') => {
    if (!selectedNode) return;
    const prefix = mode === 'explain' ? 'Explain: ' : mode === 'simpler' ? 'Simplify: ' : mode === 'deeper' ? 'Go deeper on: ' : '';
    handleAskTutor(selectedNode, `${prefix}${text}`);
  }, [selectedNode, handleAskTutor]);

  const handleQuizSubmit = useCallback(async (nodeId: string, blockId: string, response: string) => {
    try { const result = await api.learnSubmitQuiz({ nodeId, blockId, response }); if (result.ok) { const prog = await api.learnGetProgress({ nodeId }); if (prog.ok) setProgress(prev => ({ ...prev, [nodeId]: prog.data })); } return result; }
    catch (err: any) { return { ok: false, error: err.message }; }
  }, []);

  // ── View Switching ──

  // Welcome (empty state)
  if (view === 'welcome') {
    return (
      <>
        <WelcomeEmptyState onCompose={() => setShowCreateDialog(true)} onTryExample={handleImportExample} onImport={() => setView('import')} onPaste={() => { setView('import'); setImportMode('paste'); }} onBrowse={() => setView('library')} />
        <OnboardingPanel open={showOnboarding} onClose={() => setShowOnboarding(false)} />
        <LearnerSetup open={showSetup} onClose={() => setShowSetup(false)} />
        <LearnerProfilePanel open={showProfilePanel} onClose={() => setShowProfilePanel(false)} onRerunSetup={() => { setShowProfilePanel(false); setShowSetup(true); }} />
        <CreateLessonDialog seed={lessonSeed} open={showCreateDialog} onClose={() => { setShowCreateDialog(false); setLessonSeed(null); }} onImported={() => { loadLessons(); setView('library'); }} />
      </>
    );
  }

  // Main chrome (showcase, library, reader, import)
  return (
    <div className="h-full flex flex-col" data-page="learn">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-clay-400" />
          <h1 className="text-lg font-semibold text-zinc-100">Learn</h1>
          {view !== 'library' && (
            <button onClick={() => { setView('library'); setSelectedLesson(null); setLessonData(null); setSelectedNode(null); setTutorOpen(false); setTutorAnswer(null); }}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition">
              <ChevronLeft className="w-3 h-3" /> Back to Library
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {['library', 'showcase'].includes(view) && (
            <>
              <button onClick={() => { setView('showcase'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition"><BookOpen className="w-3.5 h-3.5" /> Curriculum</button>
              <button onClick={() => setShowProfilePanel(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition"><SlidersHorizontal className="w-3.5 h-3.5" /> Profile</button>
            </>
          )}
          {view === 'reader' && lessonData && (
            <div className="flex items-center gap-1">
              <button onClick={() => setShowShortcuts(!showShortcuts)} className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition"><Keyboard className="w-4 h-4" /></button>
              <button onClick={() => setGraphView('grid')} className={`p-1.5 rounded transition ${graphView === 'grid' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}><Grid3X3 className="w-4 h-4" /></button>
              <button onClick={() => setGraphView('graph')} className={`p-1.5 rounded transition ${graphView === 'graph' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}><Network className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts modal */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5 w-80 max-w-[90vw] shadow-lg"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-zinc-100 mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-2 text-xs">
                {[['j / ↓', 'Next node'], ['k / ↑', 'Previous node'], ['a', 'Open tutor panel'], ['g', 'Toggle graph view'], ['?', 'Toggle shortcuts'], ['Esc', 'Close tutor panel']]
                  .map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between">
                      <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/50 text-zinc-300 font-mono text-[10px]">{key}</kbd>
                      <span className="text-zinc-500">{desc}</span>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area — switched via view state */}
      <div className="flex-1 min-h-0 overflow-auto">
        <AnimatePresence mode="wait">
          {view === 'showcase' && (
            <CurriculumShowcase key="showcase"
              lessonsByPart={(() => { const byPart: Record<number, { id: string; title: string }[]> = {}; lessons.forEach(l => { const p = l.part ?? 0; if (!byPart[p]) byPart[p] = []; byPart[p].push({ id: l.id, title: l.title }); }); return byPart; })()}
              checklistByPart={(() => { const byPart: Record<number, boolean[]> = {}; CURRICULUM_BLUEPRINT.forEach(p => { byPart[p.part] = p.checklist.map(c => completedItems.includes(c)); }); return byPart; })()}
              onGenerate={(part) => { setLessonSeed({ part: part.part, title: part.title, scope: part.checklist, topicPrompt: getSystemPromptForSlug(part.slug) }); setShowCreateDialog(true); }}
              onOpenLesson={(id) => loadLesson(id)}
              onToggleChecklist={(part, i) => { const item = CURRICULUM_BLUEPRINT[part]?.checklist[i]; if (item) setCompletedItems(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]); }}
            />
          )}
          {view === 'library' && (
            <LessonLibrary key="library" lessons={lessons} loading={loading} onOpen={loadLesson}
              onCompose={() => setShowCreateDialog(true)} onImport={() => setView('import')}
              onWelcome={() => setView('showcase')} stats={stats} onOpenProfile={() => setShowProfilePanel(true)} />
          )}
          {view === 'reader' && lessonData && (
            <ReaderView key="reader" lesson={lessonData} selectedNode={selectedNode} onSelectNode={setSelectedNode}
              currentNode={lessonData.nodes.find(n => n.id === selectedNode)}
              currentLevel={selectedNode ? progress[selectedNode]?.level : undefined}
              onAsk={handleAskTutor} onSelectionAsk={handleSelectionAsk} onQuizSubmit={handleQuizSubmit}
              tutorOpen={tutorOpen} setTutorOpen={setTutorOpen}
              tutorQuestion={tutorQuestion} setTutorQuestion={setTutorQuestion}
              tutorAnswer={tutorAnswer} tutorLoading={tutorLoading}
              graphView={graphView} progress={progress}
              mobileOutlineOpen={mobileOutlineOpen} setMobileOutlineOpen={setMobileOutlineOpen}
              containerRef={readerContainerRef} highlights={highlights}
              completedItems={completedItems} onToggleCheck={(id) => { setCompletedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }}
              completedParts={completedParts} />
          )}
          {view === 'import' && (
            <ImportView key="import" importText={importText} setImportText={setImportText}
              onImport={handleImportWithValidation} onPickFile={handlePickFile}
              onImportExample={handleImportExample} importingExample={importingExample}
              loading={loading} result={importResult} mode={importMode} setMode={setImportMode}
              errors={importErrors} warnings={importWarnings} onJumpToNode={() => {}} onShowOnboarding={() => setShowOnboarding(true)} />
          )}
        </AnimatePresence>
      </div>

      {/* Persistent modals */}
      <OnboardingPanel open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <LearnerSetup open={showSetup} onClose={() => setShowSetup(false)} />
      <LearnerProfilePanel open={showProfilePanel} onClose={() => setShowProfilePanel(false)} onRerunSetup={() => { setShowProfilePanel(false); setShowSetup(true); }} />
      <CreateLessonDialog seed={lessonSeed} open={showCreateDialog} onClose={() => { setShowCreateDialog(false); setLessonSeed(null); }} onImported={() => { loadLessons(); setView('library'); }} />
    </div>
  );
}
```

---

## 15. Design Tokens (src/index.css + lyceum-learn-features.css)

### 15a. Tailwind v4 @theme block (src/index.css)

```css
@import "tailwindcss";
@import "./styles/finance-glass.css";

@theme {
  --ws-surface: #09090b;
  --ws-surface-raised: #18181b;
  --ws-border: rgb(39 39 42 / 0.6);
  --ws-border-strong: rgb(63 63 70 / 0.6);
  --ws-accent: #06b6d4;
  --ws-radius-card: 0.5rem;
  --ws-dur: 150ms;
  --ws-ease: cubic-bezier(0.2, 0, 0, 1);

  --color-clay-300: #f0a892;
  --color-clay-400: #e8866b;
  --color-clay-500: #d96846;
  --color-clay-600: #c2553a;
  --color-sage-400: #6fb38f;
  --color-amber-400: #fbbf24;
  --color-sky-400: #5ab0c9;
  --color-glow: #f7f3ee;

  --font-serif: "Source Serif 4", Georgia, serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
}
```

**Key notes:**
- DeskFlow uses **Tailwind v4** (`@import "tailwindcss"`). There is no `tailwind.config.*` file.
- Custom colour tokens `clay-*`, `sage-400`, `amber-400`, `sky-400`, `glow` are defined in `@theme`.
- Core layout tokens use `--ws-*` prefix (ws = workspace): `--ws-surface`, `--ws-accent`, `--ws-border`, etc.
- Two custom font stacks: `--font-serif` (Source Serif 4) and `--font-mono` (JetBrains Mono).

### 15b. Lyceum Learn CSS (src/styles/lyceum-learn-features.css, 691 lines)

The learn feature CSS file contains these section groups:
- **.lyceum-toc-*** — Table of contents with checklist items (collapsible, section labels, divider)
- **.lyceum-showcase-*** — Curriculum showcase grid (phase tabs as pill buttons, cards with emoji/title/trailer/progress bar)
- **.lyceum-checklist-*** — Checklist with progress bar, toggle items, compact variant
- **.lyceum-assessment-*** — Quiz/assessment block (MCQ/numeric/open, correct/incorrect highlighting, score display, explanation panel)
- **.lyceum-selection-toolbar** — Floating selection toolbar with action buttons, color picker (circles), note input

**Design conventions used throughout:**
- Background: `var(--bg-secondary, #1c1917)` — dark warm base
- Borders: `var(--border, #292524)` — subtle warm border
- Primary accent: `var(--accent-primary, #d97706)` — amber/clay tone
- Text hierarchy: `var(--text-primary, #f5f5f4)` > `var(--text-secondary, #a8a29e)` > `var(--text-muted, #57534e)`
- Border radius: 6px (inputs), 8px (buttons), 10px (containers), 12px (cards), 9999px (pills)
- Transitions: `all 0.15s` standard

---

## 16. GlassCard + SectionHeader

### 16a. GlassCard (src/components/GlassCard.tsx)

```typescript
// src/components/GlassCard.tsx — reusable card with 7 variants, 5 accent colours

import React from 'react';

type CardVariant = 'default' | 'elevated' | 'bordered' | 'glass' | 'flat' | 'interactive' | 'outlined';
type AccentColor = 'clay' | 'sage' | 'amber' | 'sky' | 'accent';

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-zinc-900/80 border border-zinc-800',
  elevated: 'bg-zinc-900/90 border border-zinc-700/50 shadow-lg shadow-black/20',
  bordered: 'bg-zinc-900/60 border-2 border-zinc-700',
  glass: 'bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60',
  flat: 'bg-zinc-900/30 border border-transparent',
  interactive: 'bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 cursor-pointer transition-all duration-150',
  outlined: 'bg-transparent border border-dashed border-zinc-700',
};

const accentBorders: Record<AccentColor, string> = {
  clay: 'border-l-clay-500',
  sage: 'border-l-sage-400',
  amber: 'border-l-amber-400',
  sky: 'border-l-sky-400',
  accent: 'border-l-cyan-400',
};

interface GlassCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  accent?: AccentColor;
  className?: string;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg';
}

export function GlassCard({ children, variant = 'default', accent, className = '', onClick, padding = 'md' }: GlassCardProps) {
  const padStyles = { sm: 'p-3', md: 'p-5', lg: 'p-8' };
  const accentStyle = accent ? accentBorders[accent] : '';
  return (
    <div
      className={`rounded-xl ${variantStyles[variant]} ${accentStyle} ${padStyles[padding]} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
```

### 16b. SectionHeader (src/components/SectionHeader.tsx)

```typescript
// src/components/SectionHeader.tsx — icon + title + optional action

import React from 'react';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ icon, title, subtitle, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        <div className="text-clay-400">{icon}</div>
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
```

---

## 17. Dashboard Layout — No Learn References

```typescript
// src/pages/DashboardPage.tsx — confirmed: zero references to "learn" or "Learn"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ...
// No learn-related imports or code anywhere in the file
```

---

## 18. MCP Server Inventory (External Frontend Infrastructure)

Connected MCP servers available via opencode.json (for UI component sourcing):

| Server | Purpose |
|--------|---------|
| **shadcn** | Browse/search/read shadcn-compatible components |
| **magicui** | 150+ animated components (beams, particles, bento grids) |
| **lucide** | 1500+ SVG icon search |
| **@21st-dev/magic** | Prompt→polished React component generation |
| **motion-dev** | Motion.dev animation codegen |
| **unsplash** | Stock photography with attribution |
| **reactbits** | 135+ animated React components |
| **iconify** | 200,000+ icons across 200+ icon sets |

**DeskFlow re-skin rules when sourcing external components:**
- Replace colours with `--bg-primary`, `--accent-primary`, etc.
- Use `rounded-xl` maximum
- Use `p-5` padding for cards
- Use Geist/JetBrains Mono fonts

**Anti-slop checklist:** 10 checkpoints — type, colour, geometry, hero pattern, section labels, motion, imagery, empty states, icons, accessibility.

---

## 19. Pain Points & Known Gaps

| Gap | Location | Impact |
|-----|----------|--------|
| **TutorPanel is hardcoded as side panel** | `TutorPanel.tsx` — always 320px wide, left of the main content | No mobile support, no popover mode |
| **SelectionActions toolbar uses fixed positioning** | `SelectionActions.tsx` — calculates position via `getBoundingClientRect` | Breaks if container scrolls; no text selected state management |
| **Highlights are localStorage-only** | `highlightAnchor.ts` — no DB persistence | Lost on clear data; no cross-device sync |
| **AI call has no streaming** | `router.ts` + `callProvider.ts` — `fetch()` with `AbortController` only | Users see loading spinner, no progressive output |
| **Quiz grading for open questions is fragile** | `tutor.service.ts` — `submitQuiz()` calls AI to grade | Only MCQ/numeric are deterministic; open grading may fail silently |
| **TutorPersona is composed at startup** | `index.ts` line 119: `composeTutorPersona(lib, profile)` | Profile changes require app restart to take effect |
| **DashboardPage has zero learn integration** | `DashboardPage.tsx` | No "continue learning" widget or mastery summary on dashboard |
| **learnProfile uses both DB + localStorage** | `learnerProfile.ts` + `index.ts` | Profile sync is fragile; `syncProfileFromDB()` may not restore correctly |
| **No error boundary around LearnPage** | `LearnPage.tsx` — no `ErrorBoundary` wrapper | A render crash takes down the entire learn route |
| **Build was timing out on zip step** | `scripts/zip-src.mjs` | Large file set; need to skip node_modules |

---

## 20. Load Order & Re-skin Rules

### Skill Load Order (from Skill Router)
1. `frontend-external-infra` — MCP servers (shadcn, Magic UI, Lucide, 21st.dev)
2. `humancentred-UIUX` — 6 pillars, 4 states (empty/loading/error/populated), anti-patterns
3. `frontend-design` / `impeccable` — Taste and patterns (loaded within Router)

### Re-skin Checklist (after sourcing any external component)
- [ ] Replace source colours with `--ws-surface`, `--ws-accent`, `--color-clay-*`
- [ ] Max border radius `rounded-xl`
- [ ] Card padding `p-5` default
- [ ] Font: `font-serif` for headings, `font-mono` for code
- [ ] Transitions: `duration-150` / `ease-out`
- [ ] Dark background base: `bg-zinc-900` or `bg-[#09090b]`
- [ ] Text hierarchy: `text-zinc-100` > `text-zinc-300` > `text-zinc-500`
- [ ] Borders: `border-zinc-800`
- [ ] Interactive states: `hover:bg-zinc-800`, `hover:border-zinc-600`
- [ ] Accent colour: `text-clay-400` / `bg-clay-500` for primary actions

### Invariants (NEVER break)
- PTY event order: `mark-spawned → spawn → created → initialize`
- All `localStorage` access wrapped in `try/catch`
- Prefer renderer-side fixes; read full IPC handler before editing `main.ts`
- Database lives at `%APPDATA%/DeskFlow/deskflow-data.db`
