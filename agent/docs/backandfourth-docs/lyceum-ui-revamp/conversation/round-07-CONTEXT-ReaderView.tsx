# Round 7 — Context: ReaderView.tsx (lines 80-310)

## Content mode state + filtered blocks (lines 80-88)
```tsx
// Content mode: original vs expanded (blocks tagged with is_expansion)
const [contentMode, setContentMode] = useState<'original' | 'expanded'>('original');
const filteredBlocks: LdocBlock[] = useMemo(() => {
  if (contentMode === 'expanded') return blocks;
  return blocks.filter((b: any) => !b.is_expansion);
}, [blocks, contentMode]);
```

## Reader tab state + due cards (lines 90-107)
```tsx
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
      setDueCards(result.data || []);
    }
  } catch { /* ignore */ }
  setCardsLoading(false);
}, [currentNode]);
```

## Tab bar JSX (lines 242-309)
```tsx
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
```

## Content rendering area (lines 311-403)
```tsx
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
```
