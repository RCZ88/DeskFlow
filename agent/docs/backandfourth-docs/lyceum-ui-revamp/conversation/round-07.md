# Round 7 — Project Owner → Specialist (Context Response)

## RESPONSE TO SPECIALIST'S 3 REQUEST ITEMS

---

## REQUEST 1: ReaderView.tsx — tab/panel switching + block mapping

### Content mode state + filtered blocks (lines 80-88)
```tsx
// Content mode: original vs expanded (blocks tagged with is_expansion)
const [contentMode, setContentMode] = useState<'original' | 'expanded'>('original');
const filteredBlocks: LdocBlock[] = useMemo(() => {
  if (contentMode === 'expanded') return blocks;
  return blocks.filter((b: any) => !b.is_expansion);
}, [blocks, contentMode]);
```

### Reader tab state + due cards (lines 90-107)
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

### Tab bar JSX (lines 242-309)
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

### Content rendering area (lines 311-403)
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

---

## REQUEST 2: FlashcardBlock.tsx (FULL FILE — 193 lines)

```tsx
import React, { useState, useCallback, useEffect } from 'react';

type CardRating = 1 | 2 | 3 | 4;

interface Props {
  meta: {
    deck_id: string;
    card_type: string;
    front: string;
    back: string;
    front_media?: { image?: string };
    back_media?: { image?: string };
    tags?: string[];
    occlusions?: Array<{ x: number; y: number; width: number; height: number; label: string }>;
  };
  onRate?: (rating: CardRating) => void;
  onNext?: () => void;
}

const RATING_CONFIG: Record<CardRating, { label: string; interval: string; borderColor: string; textColor: string }> = {
  1: { label: 'Again', interval: '1m', borderColor: 'rgba(239,68,68,0.5)', textColor: '#ef4444' },
  2: { label: 'Hard', interval: '6d', borderColor: 'rgba(245,158,11,0.5)', textColor: '#f59e0b' },
  3: { label: 'Good', interval: '10d', borderColor: 'rgba(34,197,94,0.5)', textColor: '#22c55e' },
  4: { label: 'Easy', interval: '24d', borderColor: 'rgba(91,141,239,0.5)', textColor: '#5B8DEF' },
};

export function FlashcardBlock({ meta, onRate, onNext }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [occlusionRevealed, setOcclusionRevealed] = useState<Set<number>>(new Set());

  const handleFlip = useCallback(() => {
    setFlipped(!flipped);
    setRevealed(true);
  }, [flipped]);

  const handleRate = useCallback((rating: CardRating) => {
    onRate?.(rating);
    setFlipped(false);
    setRevealed(false);
    setOcclusionRevealed(new Set());
    setTimeout(() => onNext?.(), 300);
  }, [onRate, onNext]);

  const handleOcclusionClick = (index: number) => {
    setOcclusionRevealed(prev => new Set(prev).add(index));
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleFlip(); }
      if (revealed) {
        if (e.key === '1') handleRate(1);
        if (e.key === '2') handleRate(2);
        if (e.key === '3') handleRate(3);
        if (e.key === '4') handleRate(4);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleFlip, handleRate, revealed]);

  const isOcclusion = meta.card_type === 'image_occlusion' && meta.occlusions && meta.occlusions.length > 0;
  const isCloze = meta.card_type === 'cloze';

  const renderFront = () => {
    if (isOcclusion && meta.front_media?.image) {
      return (
        <div className="relative w-full h-full">
          <img src={meta.front_media.image} alt="Occlusion" className="w-full h-full object-contain rounded-lg" />
          {meta.occlusions?.map((occ, i) => (
            <div
              key={i}
              onClick={() => handleOcclusionClick(i)}
              className="absolute flex items-center justify-center text-white text-xs font-medium rounded cursor-pointer transition-all duration-300"
              style={{
                left: `${occ.x * 100}%`, top: `${occ.y * 100}%`,
                width: `${occ.width * 100}%`, height: `${occ.height * 100}%`,
                background: occlusionRevealed.has(i) ? 'transparent' : 'rgba(217,119,6,0.85)',
                backdropFilter: occlusionRevealed.has(i) ? 'none' : 'blur(2px)',
              }}
            >
              {!occlusionRevealed.has(i) && '?'}
            </div>
          ))}
        </div>
      );
    }

    if (isCloze) {
      const parts = meta.front.split(/(\{\{c\d+::[^}]+\}\})/g);
      return (
        <div className="text-base leading-relaxed text-zinc-100">
          {parts.map((part, i) => {
            const match = part.match(/\{\{c\d+::([^}]+)\}\}/);
            if (match) {
              return (
                <span key={i} className="px-1 rounded border-b-2 border-amber-500 bg-amber-500/15">
                  [ ... ]
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      );
    }

    return <div className="text-lg font-medium leading-relaxed text-zinc-100 text-center">{meta.front}</div>;
  };

  const renderBack = () => {
    if (isCloze) {
      const parts = meta.front.split(/(\{\{c\d+::[^}]+\}\})/g);
      return (
        <div className="text-base leading-relaxed text-zinc-100">
          {parts.map((part, i) => {
            const match = part.match(/\{\{c\d+::([^}]+)\}\}/);
            if (match) {
              return (
                <span key={i} className="px-1 rounded border-b-2 border-emerald-500 bg-emerald-500/15 font-medium">
                  {match[1]}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      );
    }

    return (
      <div className="text-base leading-relaxed text-zinc-100 text-center">
        <div className="mb-3">{meta.back}</div>
        {meta.back_media?.image && <img src={meta.back_media.image} alt="Answer" className="max-w-full rounded-lg mt-2" />}
      </div>
    );
  };

  return (
    <div className="p-5">
      <div className="perspective-[1000px] w-full max-w-[480px] mx-auto h-[280px]">
        <div
          className="w-full h-full relative cursor-pointer"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
          onClick={!revealed ? handleFlip : undefined}
        >
          <div className="absolute inset-0 backface-hidden rounded-xl border border-zinc-800 flex items-center justify-center p-6"
            style={{ background: 'rgba(217,119,6,0.06)', backfaceVisibility: 'hidden' }}>
            {renderFront()}
            {!revealed && <div className="absolute bottom-3 text-xs text-zinc-600">Click or Space to flip</div>}
          </div>
          <div className="absolute inset-0 backface-hidden rounded-xl border border-zinc-800 flex items-center justify-center p-6"
            style={{ background: 'rgba(34,197,94,0.06)', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            {renderBack()}
          </div>
        </div>
      </div>

      {revealed && (
        <div className="flex justify-center gap-2.5 mt-5 flex-wrap">
          {(Object.entries(RATING_CONFIG) as [string, typeof RATING_CONFIG[1]][]).map(([rating, config]) => (
            <button
              key={rating}
              onClick={(e) => { e.stopPropagation(); handleRate(Number(rating) as CardRating); }}
              className="px-4 py-2 rounded-lg border-[1.5px] bg-transparent text-xs font-medium cursor-pointer transition-all hover:bg-current/10 flex flex-col items-center min-w-[64px]"
              style={{ borderColor: config.borderColor, color: config.textColor }}
            >
              <span>{config.label}</span>
              <span className="text-[10px] opacity-60 mt-0.5">{config.interval}</span>
            </button>
          ))}
        </div>
      )}

      {meta.tags && meta.tags.length > 0 && (
        <div className="flex gap-1.5 justify-center mt-3.5 flex-wrap">
          {meta.tags.map(tag => (
            <span key={tag} className="text-[11px] px-2.5 py-0.5 rounded-full border border-zinc-800 text-zinc-500">
              {tag}
            </span>
          ))}
        </div>
      )}

      {revealed && <div className="text-center mt-2.5 text-[11px] text-zinc-600">Press 1-4 to rate</div>}
    </div>
  );
}
```

---

## REQUEST 3: promptLibrary.ts — AI prompt composition system

### loadPromptLibrary (lines 134-142)
```ts
export function loadPromptLibrary(readResource: (rel: string) => string | null): PromptLibrary {
  return {
    format: readResource('author-guide.md') ?? '',
    capabilities: '', // deprecated — author-guide.md is the authoritative format reference
    style: readResource('prompts/master-prompt.md') ?? '',
    persona: readResource('prompts/coach-persona.md') ?? '',
    guardrails: readResource('prompts/guardrails.md') ?? '',
  };
}
```

### composeAuthorSystemPrompt (lines 144-174) — MAIN prompt composition
```ts
export function composeAuthorSystemPrompt(
  lib: PromptLibrary,
  opts?: { part?: number; profile?: LearnerProfile },
): string {
  const parts: string[] = [];

  // 1. Format layer (always first — must win)
  parts.push(`## Format\n${lib.format}`);

  // 2. Style / master prompt
  parts.push(`## Teaching Style\n${lib.style}`);

  // 3. Persona — profile block REPLACES the static persona when present
  parts.push(`## Persona\n${opts?.profile ? composeLearnerProfileBlock(opts.profile) : lib.persona}`);

  // 4. Subject — per-topic brief when part is given
  if (opts?.part != null) {
    const curriculum = CURRICULUM_BLUEPRINT[opts.part];
    const slug = curriculum?.slug;
    const subject = slug ? getSystemPromptForSlug(slug) : '';
    if (subject) parts.push(`## Topic Brief\n${subject}`);
  }

  // 4b. Mastery Ladder — embedded so model can assess learner level (§3.1)
  parts.push(`## Learner Level Definitions\n${MASTERY_LADDER}`);

  // 5. Guardrails (always last — can't be overridden)
  parts.push(`## Guardrails\n${lib.guardrails}`);

  return parts.join('\n\n---\n\n');
}
```

### composeTopicUserPrompt (lines 176-195) — per-topic generation
```ts
export function composeTopicUserPrompt(part: number, profile?: LearnerProfile): string {
  const curriculum = CURRICULUM_BLUEPRINT[part];
  if (!curriculum) return '';

  const coachingNote = getCoachingNoteForSlug(curriculum.slug) ?? '';
  const target = profile?.priorKnowledge?.[part] ?? curriculum.defaultMasteryTarget;
  const parts = [
    `Topic: ${curriculum.title}`,
    curriculum.intro,
    `\nRequired coverage — the lesson MUST help the learner demonstrate each of these:`,
    ...curriculum.checklist.map((c, i) => `${i + 1}. ${c}`),
    coachingNote ? `\n## Coaching note\n${coachingNote}` : '',
    target !== curriculum.defaultMasteryTarget
      ? `\nCalibrate to the learner's current level for this part: ${target}. Author to move them ONE level beyond it.`
      : '',
    `\n${SEGMENTATION_INSTRUCTION}`,
    `\nOutput as .lmd (lyceum markdown) with "---" frontmatter. Include a "Check Your Understanding" section.`,
  ];
  return parts.filter(Boolean).join('\n');
}
```

### composeCombinedPrompt (lines 207+) — standalone prompt for external AI chats
```ts
export function composeCombinedPrompt(topic: string, profile: LearnerProfile): string {
  const preamble = `# Lyceum Personal Learning System — System Prompt (v3)

You are my personal curriculum author and tutor. You teach in a mastery-learning
style: concepts are broken into nodes, each targeting an explicit mastery level
(L0 Novice → L1 Aware → L2 Apprentice → L3 Practitioner → L4 Proficient → L5
Expert), each grounded (cite what's true, flag common misconceptions), and each
checked with a quiz before moving on.

## How to teach — pick the right visual, don't default to one
- Diagrams (flows, architectures, trees, state machines) → describe/draw them
  clearly (Mermaid-style or ASCII if I can't render images).
- Data/quantitative relationships → a described chart or table, not prose.
```
(truncated — full file is 348 lines)

### Prompt files referenced:
- `resources/learn/author-guide.md` — format reference (v3)
- `resources/learn/prompts/master-prompt.md` — teaching style
- `resources/learn/prompts/coach-persona.md` — persona
- `resources/learn/prompts/guardrails.md` — guardrails

### No dedicated FLASHCARD_GENERATION_PROMPT or CONCEPT_MAP_PROMPT exists.
The AI generates viz blocks (flashcards, concept maps, etc.) based on the format layer (`author-guide.md`) which documents the block types the AI should produce. The viz block types are: heatmap, knowledge_graph, flashcard, layer_reveal, concept_map, mastery_timeline, whiteboard.

---

## Status
Context provided, awaiting Specialist instructions.
