import { motion } from 'framer-motion';
import { Plus, FileUp, Sparkles } from 'lucide-react';
import type { LessonSummary } from '../../shared/learn/types';
import { BookCard } from './BookCard';
import { BlurFade } from '../ui/blur-fade';
import { ShinyButton } from '../ui/shiny-button';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

export interface LessonLibraryProps {
  lessons: LessonSummary[];
  loading?: boolean;
  onOpen: (id: string) => void;
  onCompose: () => void;
  onImport: () => void;
}

function LibrarySkeletons() {
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

export function LessonLibrary({ lessons, loading, onOpen, onCompose, onImport }: LessonLibraryProps) {
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
            <Button variant="secondary" onClick={onImport}>
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Button>
            <ShinyButton onClick={onCompose}>
              <Plus className="mr-2 h-4 w-4" />
              Compose lesson
            </ShinyButton>
          </div>
        </header>
      </BlurFade>

      {loading ? (
        <LibrarySkeletons />
      ) : (
        <div className="space-y-12">
          {orderedParts.map((part) => (
            <section key={part}>
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                  Part {String(part).padStart(2, '0')}
                </h2>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
                {shelves.get(part)!.map((lesson, i) => (
                  <BookCard key={lesson.id} lesson={lesson} index={i} onOpen={onOpen} />
                ))}
              </div>
              {/* wooden shelf rail */}
              <div className="lyceum-shelf-rail mt-3 h-2 w-full rounded-full" />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
