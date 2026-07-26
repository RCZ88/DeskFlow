import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Network, Keyboard, BookOpen, Brain, RotateCcw } from 'lucide-react';
import { BlockRenderer } from './blocks/BlockRenderer';
import { FlashcardBlock } from './blocks/FlashcardBlock';
import { TutorPanel } from './TutorPanel';
import { MasteryRing } from './MasteryRing';
import { CurriculumGraph } from './CurriculumGraph';
import { TableOfContents, type TOCHeading } from './TableOfContents';
import { ChecklistProgress } from './ChecklistProgress';
import { AssessmentCard, AssessmentCardBlock, parseAssessmentBlock, type Question } from './AssessmentCard';
import { SelectionActions } from './SelectionActions';
import { useHighlights } from './useHighlights';
import type { LessonWithNodes, RenderableNode, TutorAnswer, MasteryLevel, NodeProgress, LdocBlock } from '../../shared/learn/types';

const api = (window as any).deskflowAPI;

export function ReaderView({ lesson, selectedNode, onSelectNode, currentNode, currentLevel, onAsk, onSelectionAsk, onQuizSubmit, tutorOpen, setTutorOpen, tutorQuestion, setTutorQuestion, tutorAnswer, tutorLoading, graphView, progress, mobileOutlineOpen, setMobileOutlineOpen, containerRef, highlights, completedItems, onToggleCheck, completedParts, onApproveProposal, onRejectProposal, onAddMessage, onResolveConversation, onAddNote, onDeleteNote, onTogglePin, tutorConfig }: {
  lesson: LessonWithNodes;
  selectedNode: string | null;
  onSelectNode: (id: string) => void;
  currentNode: RenderableNode | undefined;
  currentLevel: string | undefined;
  onAsk: (nodeId: string, question: string) => void;
  onSelectionAsk: (text: string, mode: 'explain' | 'ask' | 'simpler' | 'deeper') => void;
  onQuizSubmit: (nodeId: string, blockId: string, response: string) => void;
  tutorOpen: boolean;
  setTutorOpen: (v: boolean) => void;
  tutorQuestion: string;
  setTutorQuestion: (v: string) => void;
  tutorAnswer: TutorAnswer | null;
  tutorLoading: boolean;
  graphView: 'grid' | 'graph';
  progress: Record<string, NodeProgress>;
  mobileOutlineOpen: boolean;
  setMobileOutlineOpen: (v: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  highlights: ReturnType<typeof useHighlights>;
  completedItems: string[];
  onToggleCheck: (id: string) => void;
  completedParts: string[];
  onApproveProposal?: (blockId: string) => void;
  onRejectProposal?: (blockId: string, reason?: string) => void;
  onAddMessage?: (blockId: string, text: string) => void;
  onResolveConversation?: (blockId: string) => void;
  onAddNote?: (blockId: string, text: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onTogglePin?: (noteId: string) => void;
  tutorConfig?: { provider: string; model: string } | null;
}) {
  if (!selectedNode && lesson.nodes.length > 0) {
    onSelectNode(lesson.nodes[0].id);
    return null;
  }

  const { getPart } = (window as any).__LYCEUM_CURRICULUM__ || {};
  const part = lesson.lesson ? { slug: `part-${lesson.lesson.part}`, title: lesson.lesson.title, checklist: [], defaultMasteryTarget: 'L2' as MasteryLevel } : null;

  // Memoize TOC headings — only changes when nodes change
  const tocHeadings: TOCHeading[] = useMemo(() => lesson.nodes.map((n) => ({
    id: n.id,
    text: n.title,
    level: 1,
  })), [lesson.nodes]);

  // Memoize assessment questions — only changes when currentNode blocks change
  const assessmentQuestions: Question[] = useMemo(() => {
    return (currentNode?.blocks || [])
      .filter((b) => b.type === 'quiz')
      .map((b, i) => ({
        id: b.id,
        type: 'multiple-choice' as const,
        prompt: (b as any).q || `Question ${i + 1}`,
        options: (b as any).options || ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: '',
        explanation: '',
      }));
  }, [currentNode?.blocks]);

  // Memoize blocks array — CRITICAL for preventing re-renders
  const blocks: LdocBlock[] = useMemo(() => currentNode?.blocks ?? [], [currentNode]);

  // Content mode: original vs expanded (blocks tagged with is_expansion)
  const [contentMode, setContentMode] = useState<'original' | 'expanded'>('original');
  const filteredBlocks: LdocBlock[] = useMemo(() => {
    if (contentMode === 'expanded') return blocks;
    return blocks.filter((b: any) => !b.is_expansion);
  }, [blocks, contentMode]);

  // Reader tab: content | recall | tutor
  const [readerTab, setReaderTab] = useState<'content' | 'recall' | 'tutor'>('content');
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);

  // Load due cards when Recall tab is selected
  const loadDueCards = useCallback(async () => {
    if (!currentNode) return;
    setCardsLoading(true);
    try {
      const result = await api.learnGetDueCards({ limit: 10 });
      if (result.ok) {
        // Filter cards related to current node's lesson
        setDueCards(result.data || []);
      }
    } catch { /* ignore */ }
    setCardsLoading(false);
  }, [currentNode]);

  // Stable callbacks — empty deps = stable forever, never create new references
  const handleBlockAsk = useCallback((blockId: string, question: string) => {
    if (currentNode) onAsk(currentNode.id, question);
  }, [currentNode?.id, onAsk]);

  const handleQuizSubmit = useCallback((nid: string, bid: string, resp: string) => {
    onQuizSubmit(nid, bid, resp);
  }, [onQuizSubmit]);

  const handleCreateHighlight = useCallback((text: string, start: number, end: number, color: any) => {
    highlights.createHighlight(text, start, end, color);
  }, [highlights]);

  const handleCreateNote = useCallback((text: string, start: number, end: number) => {
    if (onAddNote && selectedNode) {
      onAddNote(`text-${start}-${end}`, text);
    }
  }, [onAddNote, selectedNode]);

  const handleDeleteHighlight = useCallback((id: string) => {
    highlights.deleteHighlight(id);
  }, [highlights]);

  const handleAskTutor = useCallback((text: string, mode: 'explain' | 'ask' | 'simpler' | 'deeper') => {
    onSelectionAsk(text, mode);
  }, [onSelectionAsk]);

  return (
    <>
      {/* Mobile outline dropdown */}
      <div className="lg:hidden border-b border-zinc-800">
        <button
          onClick={() => setMobileOutlineOpen(!mobileOutlineOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-300 bg-zinc-900/50"
        >
          <span className="truncate">{currentNode?.title || lesson.lesson.title}</span>
          <span className="text-zinc-500 text-xs">{mobileOutlineOpen ? '▲' : '▼'}</span>
        </button>
        <AnimatePresence>
          {mobileOutlineOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-zinc-800"
            >
              <div className="p-2 space-y-0.5 bg-zinc-900/30">
                {lesson.nodes.map((node) => {
                  const nodeProgress = node.progress;
                  const level = nodeProgress?.level || 'L0' as MasteryLevel;
                  const isActive = node.id === selectedNode;
                  return (
                    <button
                      key={node.id}
                      onClick={() => { onSelectNode(node.id); setMobileOutlineOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                        isActive ? 'bg-clay-500/15 text-clay-300' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                      }`}
                    >
                      <MasteryRing level={level} target={node.mastery_target} size={20} strokeWidth={2} />
                      <span className="truncate">{node.title}</span>
                      {node.prereq && node.prereq.length > 0 && !isActive && (
                        <span className="text-[10px] text-zinc-600 ml-auto">{node.prereq.length} prereq</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex h-full">
        {/* Left: Outline + TOC (desktop) */}
        <div className="hidden lg:flex flex-col w-56 shrink-0 border-r border-zinc-800 overflow-y-auto ws-scroll">
          {/* Node outline */}
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 truncate">{lesson.lesson.title}</h3>
            <div className="space-y-0.5">
              {lesson.nodes.map((node) => {
                const nodeProgress = node.progress;
                const level = nodeProgress?.level || 'L0' as MasteryLevel;
                const isActive = node.id === selectedNode;
                return (
                  <button
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                      isActive ? 'bg-clay-500/15 text-clay-300' :
                      'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <MasteryRing level={level} target={node.mastery_target} size={20} strokeWidth={2} animated={false} />
                    <span className="truncate">{node.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Curriculum TOC */}
          <div className="p-3">
            <TableOfContents
              part={part || { slug: '', title: lesson.lesson.title, checklist: [], defaultMasteryTarget: 'L2', emoji: '\uD83D\uDCD6', trailer: { what: '', why: '', where: '' }, intro: '', rarity: 1, phase: 1 }}
              headings={tocHeadings}
              completedItems={completedItems}
              onNavigate={(id) => onSelectNode(id)}
              activeId={selectedNode ?? undefined}
            />
          </div>
          {/* Checklist compact */}
          <div className="px-3 pb-3">
            <ChecklistProgress
              items={lesson.nodes.map((n) => n.title)}
              completedIds={completedItems}
              onToggle={onToggleCheck}
              partSlug={lesson.lesson.id ?? `lesson-${lesson.lesson.part}`}
              compact
            />
          </div>
        </div>

        {/* Center: Node content OR Graph view */}
        <div className="flex-1 min-w-0 flex flex-col">
          {graphView === 'graph' ? (
            <CurriculumGraph
              nodes={lesson.nodes}
              progress={progress}
              selectedNode={selectedNode}
              onSelectNode={onSelectNode}
            />
          ) : (
            <>
              {/* Tab bar: Content | Recall */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800/60 shrink-0">
                {([
                  { key: 'content' as const, icon: BookOpen, label: 'Content' },
                  { key: 'recall' as const, icon: RotateCcw, label: 'Recall' },
                ]).map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setReaderTab(key);
                      if (key === 'recall') loadDueCards();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      readerTab === key
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}

                {/* Content mode toggle — only show on Content tab */}
                {readerTab === 'content' && (
                  <>
                    <div className="w-px h-4 bg-zinc-700/60 mx-1" />
                    <div className="flex items-center bg-zinc-800/60 border border-zinc-700/50 rounded-md p-0.5">
                      <button
                        onClick={() => setContentMode('original')}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                          contentMode === 'original'
                            ? 'bg-zinc-700 text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Original
                      </button>
                      <button
                        onClick={() => setContentMode('expanded')}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                          contentMode === 'expanded'
                            ? 'bg-sage-400/15 text-sage-300'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Expanded
                      </button>
                    </div>
                  </>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Tutor toggle */}
                <button
                  onClick={() => setTutorOpen(!tutorOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    tutorOpen
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <Brain className="w-3 h-3" />
                  Tutor
                </button>
              </div>

              {/* Content area */}
              {readerTab === 'content' ? (
                <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 ws-scroll" ref={containerRef} style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                  {currentNode ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentNode.id}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="max-w-[72ch] mx-auto relative select-text"
                        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <MasteryRing level={currentLevel as MasteryLevel || 'L0'} target={currentNode.mastery_target} size={28} strokeWidth={2.5} />
                          <div>
                            <h2 className="text-xl font-semibold text-zinc-100">{currentNode.title}</h2>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                              <span>Target: {currentNode.mastery_target}</span>
                              {currentLevel && (
                                <>
                                  <span>·</span>
                                  <span>Your level: {currentLevel}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {filteredBlocks.map((block) => (
                          <div key={block.id} className={(block as any).is_expansion ? 'border-l-2 border-sage-400/40 pl-4' : ''}>
                            <BlockRenderer
                              block={block}
                              onAsk={handleBlockAsk}
                              onQuizSubmit={handleQuizSubmit}
                              currentLevel={currentLevel}
                              nodeId={currentNode.id}
                              onApproveProposal={onApproveProposal}
                              onRejectProposal={onRejectProposal}
                              onAddMessage={onAddMessage}
                              onResolveConversation={onResolveConversation}
                              onAddNote={onAddNote}
                              onDeleteNote={onDeleteNote}
                              onTogglePin={onTogglePin}
                            />
                          </div>
                        ))}
                        {/* Checklist */}
                        <div className="mt-8">
                          <ChecklistProgress
                            items={lesson.nodes.map((n) => n.title)}
                            completedIds={completedItems}
                            onToggle={onToggleCheck}
                            partSlug={lesson.lesson.id ?? `lesson-${lesson.lesson.part}`}
                          />
                        </div>
                        {/* Assessment */}
                        {assessmentQuestions.length > 0 && (
                          <div className="mt-6">
                            <AssessmentCard
                              title="Check Your Understanding"
                              questions={assessmentQuestions}
                            />
                          </div>
                        )}
                        {/* Tutor assessment block */}
                        {(() => {
                          if (!tutorAnswer) return null;
                          const parsed = parseAssessmentBlock(tutorAnswer.answer_md);
                          if (!parsed) return null;
                          return (
                            <div className="mt-6">
                              <AssessmentCardBlock
                                assessment={parsed}
                                target={currentNode?.mastery_target}
                                assessedAt={Date.now()}
                              />
                            </div>
                          );
                        })()}
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-center h-full text-zinc-600 text-sm"
                    >
                      Select a node from the outline
                    </motion.div>
                  )}
                </div>
              ) : readerTab === 'recall' ? (
                /* Recall Tab — Flashcard review */
                <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 ws-scroll">
                  <div className="max-w-[480px] mx-auto">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-zinc-100 mb-1">Active Recall</h3>
                      <p className="text-xs text-zinc-500">Review due flashcards to strengthen your memory.</p>
                    </div>
                    {cardsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
                      </div>
                    ) : dueCards.length > 0 ? (
                      <div className="space-y-4">
                        {dueCards.slice(0, 5).map((card: any, i: number) => (
                          <FlashcardBlock
                            key={card.id || i}
                            meta={{
                              deck_id: card.deck_id || '',
                              card_type: card.card_type || 'basic',
                              front: card.front || '',
                              back: card.back || '',
                              tags: card.tags ? JSON.parse(card.tags) : [],
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 rounded-2xl bg-sage-400/10 border border-sage-400/20 flex items-center justify-center mx-auto mb-3">
                          <RotateCcw className="w-6 h-6 text-sage-400" />
                        </div>
                        <p className="text-sm text-zinc-400">No cards due for review</p>
                        <p className="text-xs text-zinc-600 mt-1">Complete lessons to generate flashcards</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Selection toolbar — OUTSIDE the motion.div, rendered via portal to document.body */}
              {readerTab === 'content' && (
                <SelectionActions
                  containerRef={containerRef as React.RefObject<HTMLDivElement>}
                  onCreateHighlight={handleCreateHighlight}
                  onCreateNote={handleCreateNote}
                  onDeleteHighlight={handleDeleteHighlight}
                  onAskTutor={handleAskTutor}
                  selectedHighlightId={null}
                />
              )}
            </>
          )}
        </div>

        {/* Right: TutorPanel — only show when tutorOpen is true (toggled from tab bar) */}
        {tutorOpen && (
          <TutorPanel
            open={tutorOpen}
            onToggle={setTutorOpen}
            nodeId={selectedNode || ''}
            question={tutorQuestion}
            onQuestionChange={setTutorQuestion}
            answer={tutorAnswer}
            loading={tutorLoading}
            onAsk={onAsk}
            tutorConfig={tutorConfig}
          />
        )}
      </div>
    </>
  );
}
