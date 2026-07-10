import { useState } from 'react';
import { BookOpen, ChevronRight, Sparkles, ArrowRight, CheckCircle2, Plus } from 'lucide-react';
import {
  CURRICULUM_BLUEPRINT,
  type CurriculumPart,
  rarityStars,
} from '../../services/learn/curriculum';
import { MasteryRing } from './MasteryRing';
import type { MasteryLevel } from '../../shared/learn/types';

interface CurriculumShowcaseProps {
  lessonsByPart: Record<number, { id: string; title: string; masteryLevel?: string }[]>;
  checklistByPart: Record<number, boolean[]>;
  onGenerate: (part: CurriculumPart) => void;
  onOpenLesson: (lessonId: string) => void;
  onToggleChecklist: (part: number, index: number) => void;
}

const PHASE_LABELS: Record<number, string> = {
  1: 'Core Engineering',
  2: 'AI/ML Depth',
  3: 'Mastery & Meta',
};

const PHASE_COLORS: Record<number, string> = {
  1: 'var(--accent-primary)',
  2: 'var(--accent-secondary)',
  3: 'var(--accent-tertiary, #d97706)',
};

function PartCard({
  part,
  lessons,
  checklist,
  checklistProgress,
  onGenerate,
  onOpenLesson,
  onToggleChecklist,
}: {
  part: CurriculumPart;
  lessons: { id: string; title: string; masteryLevel?: string }[];
  checklist: boolean[];
  checklistProgress: number;
  onGenerate: () => void;
  onOpenLesson: (lessonId: string) => void;
  onToggleChecklist: (index: number) => void;
}) {
  const hasLesson = lessons.length > 0;

  return (
    <div className="lyceum-showcase-card">
      <div className="lyceum-showcase-card-header">
        <span className="lyceum-showcase-emoji">{part.emoji}</span>
        <div className="lyceum-showcase-card-meta">
          <span className="lyceum-showcase-rarity">{rarityStars(part.rarity)}</span>
        </div>
      </div>
      <h3 className="lyceum-showcase-card-title">{part.title}</h3>
      <p className="lyceum-showcase-card-trailer">{part.trailer.what}</p>
      <p className="lyceum-showcase-card-why">{part.trailer.why}</p>

      {/* Checklist progress ring */}
      <div className="flex items-center gap-2 mt-3">
        <MasteryRing
          level={`L${Math.min(5, Math.floor((checklistProgress / 100) * 5))}` as MasteryLevel}
          target="L2"
          size={24}
          strokeWidth={2.5}
          animated={false}
        />
        <span className="text-xs text-zinc-500">
          {checklist.filter(Boolean).length}/{checklist.length} competencies
        </span>
      </div>

      {/* Checklist items */}
      <div className="space-y-1 mt-2">
        {checklist.slice(0, 4).map((done, i) => (
          <button
            key={i}
            onClick={() => onToggleChecklist(i)}
            className="flex items-center gap-1.5 text-xs text-left w-full hover:bg-zinc-800/30 rounded px-1 py-0.5 transition"
          >
            {done ? (
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
            ) : (
              <span className="w-3 h-3 rounded-sm border border-zinc-600 shrink-0" />
            )}
            <span className={`truncate ${done ? 'text-zinc-400 line-through' : 'text-zinc-500'}`}>
              {part.checklist[i]}
            </span>
          </button>
        ))}
      </div>

      <div className="lyceum-showcase-card-footer">
        {hasLesson ? (
          <button
            onClick={() => onOpenLesson(lessons[0].id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-clay-500/20 hover:bg-clay-500/30 text-clay-300 text-xs font-medium transition border border-clay-500/30"
          >
            <BookOpen size={12} />
            Read lesson
          </button>
        ) : (
          <button
            onClick={onGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition border border-emerald-500/30"
          >
            <Plus size={12} />
            Generate lesson
          </button>
        )}
        <span className="text-[10px] text-zinc-600">Target: {part.defaultMasteryTarget}</span>
      </div>
    </div>
  );
}

export function CurriculumShowcase({
  lessonsByPart = {},
  checklistByPart = {},
  onGenerate,
  onOpenLesson,
  onToggleChecklist,
}: CurriculumShowcaseProps) {
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);

  const phases = [1, 2, 3] as const;
  const filtered = phaseFilter
    ? CURRICULUM_BLUEPRINT.filter((p) => p.phase === phaseFilter)
    : CURRICULUM_BLUEPRINT;

  const phaseStats = phases.map((ph) => {
    const parts = CURRICULUM_BLUEPRINT.filter((p) => p.phase === ph);
    const lessonsExist = parts.filter((p) => (lessonsByPart[p.part]?.length ?? 0) > 0).length;
    return { phase: ph, total: parts.length, lessonsExist };
  });

  return (
    <div className="lyceum-showcase">
      {/* Phase filter tabs */}
      <div className="lyceum-showcase-phases">
        <button
          className={`lyceum-showcase-phase-tab${phaseFilter === null ? ' active' : ''}`}
          onClick={() => setPhaseFilter(null)}
        >
          <Sparkles size={14} />
          All
        </button>
        {phases.map((ph) => {
          const stats = phaseStats.find((s) => s.phase === ph);
          return (
            <button
              key={ph}
              className={`lyceum-showcase-phase-tab${phaseFilter === ph ? ' active' : ''}`}
              onClick={() => setPhaseFilter(ph)}
              style={{ '--phase-accent': PHASE_COLORS[ph] } as React.CSSProperties}
            >
              <BookOpen size={14} />
              {PHASE_LABELS[ph]}
              {stats && stats.total > 0 && (
                <span className="lyceum-showcase-phase-count">
                  {stats.lessonsExist}/{stats.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Curriculum grid */}
      <div className="lyceum-showcase-grid">
        {filtered.map((part) => {
          const checklist = checklistByPart[part.part] ?? part.checklist.map(() => false);
          const lessons = lessonsByPart[part.part] ?? [];
          const checklistProgress = checklist.length > 0
            ? (checklist.filter(Boolean).length / checklist.length) * 100
            : 0;

          return (
            <PartCard
              key={part.slug}
              part={part}
              lessons={lessons}
              checklist={checklist}
              checklistProgress={checklistProgress}
              onGenerate={() => onGenerate(part)}
              onOpenLesson={onOpenLesson}
              onToggleChecklist={(i) => onToggleChecklist(part.part, i)}
            />
          );
        })}
      </div>

      {/* Bottom stats */}
      <div className="lyceum-showcase-footer">
        <span className="lyceum-showcase-count">
          {CURRICULUM_BLUEPRINT.length} parts &middot; {CURRICULUM_BLUEPRINT.reduce((s, p) => s + p.checklist.length, 0)} competencies
        </span>
      </div>
    </div>
  );
}
