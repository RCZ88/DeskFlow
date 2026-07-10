import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Network, Keyboard } from 'lucide-react';
import { BlockRenderer } from './blocks/BlockRenderer';
import { TutorPanel } from './TutorPanel';
import { MasteryRing } from './MasteryRing';
import { CurriculumGraph } from './CurriculumGraph';
import { TableOfContents, type TOCHeading } from './TableOfContents';
import { ChecklistProgress } from './ChecklistProgress';
import { AssessmentCard, AssessmentCardBlock, parseAssessmentBlock, type Question } from './AssessmentCard';
import { SelectionActions } from './SelectionActions';
import { useHighlights } from './useHighlights';
import type { LessonWithNodes, RenderableNode, TutorAnswer, MasteryLevel, NodeProgress } from '../../shared/learn/types';

export function ReaderView({ lesson, selectedNode, onSelectNode, currentNode, currentLevel, onAsk, onSelectionAsk, onQuizSubmit, tutorOpen, setTutorOpen, tutorQuestion, setTutorQuestion, tutorAnswer, tutorLoading, graphView, progress, mobileOutlineOpen, setMobileOutlineOpen, containerRef, highlights, completedItems, onToggleCheck, completedParts, onApproveProposal, onRejectProposal, onAddMessage, onResolveConversation, onAddNote, onDeleteNote, onTogglePin }: {
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
}) {
  if (!selectedNode && lesson.nodes.length > 0) {
    onSelectNode(lesson.nodes[0].id);
    return null;
  }

  const { getPart } = (window as any).__LYCEUM_CURRICULUM__ || {};
  const part = lesson.lesson ? { slug: `part-${lesson.lesson.part}`, title: lesson.lesson.title, checklist: [], defaultMasteryTarget: 'L2' as MasteryLevel } : null;

  // Build TOC headings from current node blocks
  const tocHeadings: TOCHeading[] = lesson.nodes.map((n) => ({
    id: n.id,
    text: n.title,
    level: 1,
  }));

  // Mock assessment questions from quiz blocks
  const assessmentQuestions: Question[] = (currentNode?.blocks || [])
    .filter((b) => b.type === 'quiz')
    .map((b, i) => ({
      id: b.id,
      type: 'multiple-choice' as const,
      prompt: (b as any).q || `Question ${i + 1}`,
      options: (b as any).options || ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: '',
      explanation: '',
    }));

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
            <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 ws-scroll" ref={containerRef}>
              {currentNode ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentNode.id}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="max-w-[72ch] mx-auto relative select-text"
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
                  {currentNode.blocks.map((block) => (
                    <BlockRenderer
                      key={block.id}
                      block={block}
                      onAsk={(blockId, question) => onAsk(currentNode.id, question)}
                      onQuizSubmit={(nid, bid, resp) => onQuizSubmit(nid, bid, resp)}
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
                  {/* Selection floating toolbar */}
                  <SelectionActions
                    containerRef={containerRef as React.RefObject<HTMLDivElement>}
                    onCreateHighlight={(text, start, end, color) =>
                      highlights.createHighlight(text, start, end, color)
                    }
                    onCreateNote={(text, start, end) => {
                      highlights.createHighlight(text, start, end, 'yellow');
                      highlights.editNote(
                        highlights.highlights[highlights.highlights.length - 1]?.id ?? '',
                        text.slice(0, 100),
                      );
                    }}
                    onDeleteHighlight={highlights.deleteHighlight}
                    onAskTutor={(text, mode) => onSelectionAsk(text, mode)}
                    selectedHighlightId={null}
                  />
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
          )}
        </div>

        {/* Right: TutorPanel */}
        <TutorPanel
          open={tutorOpen}
          onToggle={setTutorOpen}
          nodeId={selectedNode || ''}
          question={tutorQuestion}
          onQuestionChange={setTutorQuestion}
          answer={tutorAnswer}
          loading={tutorLoading}
          onAsk={onAsk}
        />
      </div>
    </>
  );
}
