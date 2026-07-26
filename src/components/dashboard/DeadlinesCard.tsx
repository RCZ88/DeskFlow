import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { EmptyState } from '../EmptyState';

interface Deadline {
  id: string;
  title: string;
  due_date: string;
  status?: string;
  course?: string;
  priority?: string;
}

interface DeadlinesCardProps {
  deadlines?: Deadline[];
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const due = new Date(dateStr);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function DeadlinesCard({ deadlines = [] }: DeadlinesCardProps) {
  const sorted = [...deadlines]
    .filter(d => d.status !== 'completed')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 4);

  return (
    <div className="relative rounded-xl overflow-hidden
      bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
      border border-[rgba(63,63,70,0.50)] p-5
      hover:border-[rgba(82,82,91,0.80)] transition-all duration-250 h-full">

      <div className="absolute top-0 left-4 right-4 h-px
        bg-gradient-to-r from-transparent via-rose-500/40 to-transparent opacity-60 pointer-events-none" />

      <SectionHeader title="Deadlines" icon={<AlertCircle size={14} />} />

      <div className="space-y-2 mt-2">
        {sorted.map((deadline, i) => {
          const daysLeft = getDaysUntil(deadline.due_date);
          const urgency = daysLeft <= 2 ? 'urgent' : daysLeft <= 5 ? 'soon' : 'normal';
          const urgencyStyles: Record<string, string> = {
            urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            soon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            normal: 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30',
          };

          return (
            <motion.div
              key={deadline.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.24 + i * 0.04 }}
              className="flex items-center justify-between p-2.5 rounded-lg
                bg-zinc-900/30 border border-zinc-800/30">
              <div className="min-w-0">
                <div className="text-[13px] text-zinc-300 truncate">{deadline.title}</div>
                {deadline.course && (
                  <div className="text-[11px] text-zinc-600 mt-0.5">{deadline.course}</div>
                )}
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full
                text-[11px] font-medium border shrink-0 ml-2 ${urgencyStyles[urgency]}`}>
                <Clock size={11} />
                {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? '1d' : `${daysLeft}d`}
              </div>
            </motion.div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <EmptyState
          icon={<CheckCircle2 size={20} className="text-zinc-600" />}
          title="No upcoming deadlines"
          description="You're in the clear"
        />
      )}
    </div>
  );
}
