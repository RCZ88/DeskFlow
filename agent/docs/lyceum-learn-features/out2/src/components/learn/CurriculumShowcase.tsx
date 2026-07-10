// CurriculumShowcase — the "beautiful list of items, like books" landing surface.
// Renders the 13-part Mastery Curriculum (from services/learn/curriculum.ts),
// grouped by timeline phase, each part as an editorial card with emoji, rarity
// stars, trailer (What/Why/Where), and checklist progress. Each card offers
// "Generate lesson" (if none exists yet) or "Read" (if one does).
//
// This replaces the empty/confusing main page: it always has structure to show,
// even before a single lesson is generated.

import { useMemo } from 'react';
import { CURRICULUM, type CurriculumPart, rarityStars } from '../../services/learn/curriculum';
import { ChecklistProgress } from './ChecklistProgress';
import { cn } from '../../lib/utils';
import type { LessonSummary } from '../../shared/learn/types';

export interface CurriculumShowcaseProps {
  /** Existing lessons keyed by curriculum part. */
  lessonsByPart: Record<number, LessonSummary[]>;
  /** Completed checklist indices keyed by curriculum part. */
  checklistByPart?: Record<number, number[]>;
  onGenerate: (part: CurriculumPart) => void;
  onOpenLesson: (lessonId: string) => void;
  onToggleChecklist?: (part: number, index: number) => void;
}

const PHASES: { phase: 1 | 2 | 3; title: string; window: string }[] = [
  { phase: 1, title: 'Phase 1 — Foundations', window: '0–6 months' },
  { phase: 2, title: 'Phase 2 — Specialization', window: '6–18 months' },
  { phase: 3, title: 'Phase 3 — Frontier & Mastery', window: '18–36 months' },
];

export function CurriculumShowcase({
  lessonsByPart,
  checklistByPart = {},
  onGenerate,
  onOpenLesson,
  onToggleChecklist,
}: CurriculumShowcaseProps) {
  const grouped = useMemo(() => {
    return PHASES.map((p) => ({
      ...p,
      parts: CURRICULUM.filter((c) => c.phase === p.phase),
    }));
  }, []);

  return (
    <div className="lyceum-showcase">
      <header className="lyceum-showcase-hero">
        <h1 className="lyceum-showcase-title">The Mastery Curriculum</h1>
        <p className="lyceum-showcase-sub">
          Thirteen domains on the path to the top 1% of AI engineering. Pick one and the
          tutor will author a lesson taught to depth — then grade you on it.
        </p>
      </header>

      {grouped.map((group) => (
        <section key={group.phase} className="lyceum-showcase-phase">
          <div className="lyceum-showcase-phase-head">
            <h2 className="lyceum-showcase-phase-title">{group.title}</h2>
            <span className="lyceum-showcase-phase-window">{group.window}</span>
          </div>
          <div className="lyceum-shelf">
            {group.parts.map((part) => (
              <PartCard
                key={part.part}
                part={part}
                lessons={lessonsByPart[part.part] ?? []}
                done={checklistByPart[part.part] ?? []}
                onGenerate={onGenerate}
                onOpenLesson={onOpenLesson}
                onToggleChecklist={onToggleChecklist}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

interface PartCardProps {
  part: CurriculumPart;
  lessons: LessonSummary[];
  done: number[];
  onGenerate: (part: CurriculumPart) => void;
  onOpenLesson: (lessonId: string) => void;
  onToggleChecklist?: (part: number, index: number) => void;
}

function PartCard({ part, lessons, done, onGenerate, onOpenLesson, onToggleChecklist }: PartCardProps) {
  const hasLesson = lessons.length > 0;
  return (
    <article className={cn('lyceum-part-card', `rarity-${part.rarity}`)}>
      <div className="lyceum-part-spine" aria-hidden="true" />
      <div className="lyceum-part-body">
        <div className="lyceum-part-top">
          <span className="lyceum-part-emoji" aria-hidden="true">
            {part.emoji}
          </span>
          <span className="lyceum-part-num">Part {part.part}</span>
          <span
            className="lyceum-part-rarity"
            title={`Rarity ${part.rarity}/5`}
            aria-label={`Rarity ${part.rarity} of 5`}
          >
            {rarityStars(part.rarity)}
          </span>
        </div>

        <h3 className="lyceum-part-title">{part.title}</h3>
        <p className="lyceum-part-intro">{part.intro}</p>

        <dl className="lyceum-part-trailer">
          <div>
            <dt>What</dt>
            <dd>{part.trailer.what}</dd>
          </div>
          <div>
            <dt>Why</dt>
            <dd>{part.trailer.why}</dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>{part.trailer.where}</dd>
          </div>
        </dl>

        <ChecklistProgress
          items={part.checklist}
          done={done}
          onToggle={onToggleChecklist ? (i) => onToggleChecklist(part.part, i) : undefined}
          label="What you'll master"
        />

        <div className="lyceum-part-actions">
          {hasLesson ? (
            <>
              <button type="button" className="lyceum-btn-primary" onClick={() => onOpenLesson(lessons[0].id)}>
                Read lesson
              </button>
              <button type="button" className="lyceum-btn-ghost" onClick={() => onGenerate(part)}>
                Regenerate
              </button>
            </>
          ) : (
            <button type="button" className="lyceum-btn-primary" onClick={() => onGenerate(part)}>
              Generate lesson
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
