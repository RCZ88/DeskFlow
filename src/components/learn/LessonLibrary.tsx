import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileUp, Sparkles, BookMarked, LayoutGrid, Rows3 } from 'lucide-react';
import type { LessonSummary, TutorDashboardData } from '../../shared/learn/types';
import { BookCard } from './BookCard';
import { BookSpine } from './BookSpine';
import { BlurFade } from '../ui/blur-fade';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { MasteryStrip } from './MasteryStrip';
import { TutorDashboardSection } from './TutorDashboardSection';
import type { MasteryStats } from './useMasteryStats';
import { CURRICULUM_BLUEPRINT } from '../../services/learn/curriculum';

export interface LessonLibraryProps {
  lessons: LessonSummary[];
  loading?: boolean;
  onOpen: (id: string) => void;
  onInfo?: (id: string) => void;
  onCompose: () => void;
  onImport: () => void;
  onWelcome?: () => void;
  stats?: MasteryStats;
  onOpenProfile?: () => void;
  getDashboard?: () => Promise<TutorDashboardData>;
  onNavigateToNode?: (nodeId: string) => void;
}

function LibrarySkeletons({ spine }: { spine?: boolean }) {
  if (spine) {
    return (
      <div className="flex gap-2 items-end overflow-x-auto pb-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="w-12 rounded-md" style={{ height: 220 }} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-[248px] w-full rounded-r-md rounded-l-sm" />
          <Skeleton className="mx-auto h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

type ViewMode = 'covers' | 'spines';

export function LessonLibrary({ lessons, loading, onOpen, onInfo, onCompose, onImport, onWelcome, stats, onOpenProfile, getDashboard, onNavigateToNode }: LessonLibraryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('covers');

  // Group lessons into shelves by part so the library reads like a curriculum.
  const shelves = new Map<number, LessonSummary[]>();
  for (const l of lessons) {
    const arr = shelves.get(l.part) ?? [];
    arr.push(l);
    shelves.set(l.part, arr);
  }
  const orderedParts = Array.from(shelves.keys()).sort((a, b) => a - b);

  return (
    <div className="lyceum-library mx-auto w-full max-w-6xl px-6 py-10" data-page="learn">
      <BlurFade inView>
        <header className="mb-9 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-clay-300">Lyceum</p>
            <h1 className="mt-1 font-serif text-4xl font-semibold text-glow">Your Library</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              {lessons.length} {lessons.length === 1 ? 'volume' : 'volumes'} on the shelf. Every lesson is
              grounded, versioned, and ready to study.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setViewMode('covers')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'covers'
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Cover grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('spines')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'spines'
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Spine view"
              >
                <Rows3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {onWelcome && (
              <button
                onClick={onWelcome}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 underline-offset-4 transition-colors hover:text-glow hover:underline"
              >
                &larr; Welcome
              </button>
            )}
            <Button variant="secondary" onClick={onImport}>
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Button>
            <button
              onClick={onCompose}
              className="inline-flex items-center gap-2 rounded-xl border border-clay-400/40 bg-clay-500/15 px-5 py-2.5 font-serif text-sm font-semibold text-glow transition-all hover:bg-clay-500/25 hover:shadow-[0_0_20px_rgba(194,85,58,0.25)]"
            >
              <Plus className="h-4 w-4" />
              Compose lesson
            </button>
          </div>
        </header>
      </BlurFade>

      {stats && <MasteryStrip stats={stats} onOpenNode={onOpen} onOpenProfile={onOpenProfile} />}

      {getDashboard && lessons.length > 0 && (
        <div className="mb-8">
          <TutorDashboardSection
            getDashboard={getDashboard}
            onNavigateToNode={onNavigateToNode}
          />
        </div>
      )}

      {loading ? (
        <LibrarySkeletons spine={viewMode === 'spines'} />
      ) : viewMode === 'spines' ? (
        // ── Spine View ──
        <div className="space-y-12">
          {orderedParts.map((part) => {
            const partLessons = shelves.get(part)!;
            const partInfo = CURRICULUM_BLUEPRINT.find(p => p.part === part);
            return (
              <section key={part}>
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                    {partInfo?.emoji || '📖'} Part {String(part).padStart(2, '0')} — {partInfo?.title || `Part ${part}`}
                  </h2>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <div className="flex gap-2 items-end overflow-x-auto pb-4 ws-scroll">
                  {partLessons.map((lesson, i) => (
                    <BookSpine
                      key={lesson.id}
                      lesson={lesson}
                      index={i}
                      onOpen={onOpen}
                      onInfo={onInfo}
                    />
                  ))}
                </div>

                {/* wooden shelf rail */}
                <div className="lyceum-shelf-rail mt-1 h-2 w-full rounded-full" />
              </section>
            );
          })}
        </div>
      ) : (
        // ── Cover Grid View ──
        <div className="space-y-12">
          {orderedParts.map((part) => {
            const partLessons = shelves.get(part)!;
            const chapters = new Map<string, LessonSummary[]>();
            for (const l of partLessons) {
              const ch = l.chapter || '';
              const arr = chapters.get(ch) || [];
              arr.push(l);
              chapters.set(ch, arr);
            }
            const orderedChapters = Array.from(chapters.keys()).sort((a, b) => {
              if (!a) return 1;
              if (!b) return -1;
              return a.localeCompare(b);
            });

            return (
              <section key={part}>
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                    Part {String(part).padStart(2, '0')}
                  </h2>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                {orderedChapters.map((chapter) => (
                  <div key={chapter || '__ungrouped__'} className="mb-6 last:mb-0">
                    {chapter && (
                      <div className="mb-3 flex items-center gap-2 ml-1">
                        <BookMarked className="h-3 w-3 text-zinc-500" />
                        <h3 className="text-xs font-medium text-zinc-500">{chapter}</h3>
                        <span className="h-px flex-1 bg-white/5" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
                      {chapters.get(chapter)!.map((lesson, i) => (
                        <BookCard key={lesson.id} lesson={lesson} index={i} onOpen={onOpen} onInfo={onInfo} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* wooden shelf rail */}
                <div className="lyceum-shelf-rail mt-3 h-2 w-full rounded-full" />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
