import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, HeartHandshake } from 'lucide-react';
import { PageShell } from '../../components/PageShell';
import { EmptyState } from '../../components/EmptyState';
import { useCovenant } from './useCovenant';
import { CommitmentCard, buildRecentDates } from './CommitmentCard';
import { NewCommitmentModal } from './NewCommitmentModal';
import { GraceResetMoment } from './GraceResetMoment';
import { MilestoneCelebration } from './MilestoneCelebration';
import { ReflectionPromptCard } from './ReflectionPromptCard';
import { JournalDrawer } from './JournalDrawer';
import { todayStr } from './storage';

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

interface CovenantPageProps {
  /** When true, renders without its own PageShell/header so it can live as a
   * tab inside a combined shell (see src/features/warmth/LifePage.tsx). The
   * parent is then responsible for the page container, padding, and title. */
  embedded?: boolean;
}

// Self-contained page. Can run standalone (own PageShell + header) or
// embedded as a tab inside LifePage -- everything else about it is identical
// either way.
export default function CovenantPage({ embedded = false }: CovenantPageProps = {}) {
  const {
    commitments, completions, statsById, events, dismissEvent,
    addCommitment, markComplete, unmarkComplete, totalPracticeDays,
  } = useCovenant();
  const [showNew, setShowNew] = useState(false);

  const graceEvents = events.filter(e => e.type === 'grace-reset');
  const milestoneEvent = events.find(e => e.type === 'milestone');
  const emptyAction = { label: 'New commitment', onClick: () => setShowNew(true) };

  const body = (
    <div className={embedded ? 'space-y-4' : 'max-w-3xl mx-auto space-y-4'}>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#e8866b]/15 flex items-center justify-center text-[#e8866b]">
              <HeartHandshake className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">Covenant</h1>
              <p className="text-[11px] text-[var(--text-muted)]">{totalPracticeDays} days of practice, all together</p>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#e8866b] text-white text-[12px] font-semibold hover:bg-[#d96846] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New commitment
          </button>
        </div>
      )}

      {embedded && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[var(--text-muted)]">{totalPracticeDays} days of practice, all together</p>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8866b] text-white text-[12px] font-semibold hover:bg-[#d96846] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New commitment
          </button>
        </div>
      )}

      <ReflectionPromptCard onReflect={() => {}} />

      <AnimatePresence>
        {graceEvents.map((e, idx) => {
          const c = commitments.find(cc => cc.id === e.commitmentId);
          if (!c) return null;
          return (
            <GraceResetMoment
              key={`${e.commitmentId}-${idx}`}
              commitmentId={e.commitmentId}
              commitmentName={c.name}
              onDone={() => dismissEvent(events.indexOf(e))}
            />
          );
        })}
      </AnimatePresence>

      {commitments.length === 0 ? (
        <EmptyState
          title="No commitments yet"
          description="Start with one small, meaningful practice. You can always add more."
          action={emptyAction}
        />
      ) : (
        <motion.div className="space-y-3" initial="hidden" animate="show" variants={listVariants}>
          {commitments.map(c => {
            const stats = statsById.get(c.id)!;
            const isDoneToday = completions.some(comp => comp.commitmentId === c.id && comp.date === todayStr());
            return (
              <motion.div key={c.id} variants={itemVariants}>
                <CommitmentCard
                  commitment={c}
                  stats={stats}
                  isDoneToday={isDoneToday}
                  onToggleToday={() => (isDoneToday ? unmarkComplete(c.id) : markComplete(c.id))}
                  recentDates={buildRecentDates(c, completions)}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <div className="pt-2">
        <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
          Today's general reflection
        </p>
        <div className="mt-1.5">
          <JournalDrawer commitmentId={null} date={todayStr()} />
        </div>
      </div>
    </div>
  );

  const modals = (
    <>
      {showNew && <NewCommitmentModal onClose={() => setShowNew(false)} onCreate={addCommitment} />}
      {milestoneEvent && (() => {
        const c = commitments.find(cc => cc.id === milestoneEvent.commitmentId);
        if (!c) return null;
        return (
          <MilestoneCelebration
            commitmentName={c.name}
            milestone={milestoneEvent.milestone!}
            onClose={() => dismissEvent(events.indexOf(milestoneEvent))}
          />
        );
      })()}
    </>
  );

  if (embedded) {
    return (
      <>
        {body}
        {modals}
      </>
    );
  }

  return (
    <PageShell page="covenant">
      {body}
      {modals}
    </PageShell>
  );
}
