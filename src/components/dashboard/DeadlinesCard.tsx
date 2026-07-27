import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle2, Plus, X } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';

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
  onAdd?: (title: string, date: string) => void;
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const due = new Date(dateStr);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function DeadlinesCard({ deadlines = [], onAdd }: DeadlinesCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);

  const sorted = [...deadlines]
    .filter(d => d.status !== 'completed')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 4);

  const handleAdd = () => {
    if (newTitle.trim() && newDate) {
      onAdd?.(newTitle.trim(), newDate.toISOString());
      setNewTitle('');
      setNewDate(undefined);
      setIsAdding(false);
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden
      bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/40 p-5
      hover:border-zinc-700/50 transition-all duration-200 h-full flex flex-col">

      <div className="flex items-center justify-between mb-2">
        <SectionHeader title="Deadlines" icon={<AlertCircle size={14} />} />
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-6 h-6 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      <div className="flex-1 space-y-2 mt-1">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-2 mb-2 overflow-hidden"
            >
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Deadline title..."
                className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-rose-500/50"
              />
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-8 px-3 text-xs flex-1 justify-start rounded-md bg-zinc-900/80 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-left">
                      {newDate ? format(newDate, 'PPP') : "Pick due date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                    <Calendar
                      mode="single"
                      selected={newDate}
                      onSelect={setNewDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <button onClick={handleAdd} className="h-8 px-3 text-xs rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors">Add</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {sorted.map((deadline, i) => {
          const daysLeft = getDaysUntil(deadline.due_date);
          const urgency = daysLeft <= 2 ? 'urgent' : daysLeft <= 5 ? 'soon' : 'normal';
          const urgencyStyles = {
            urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            soon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            normal: 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30',
          };
          return (
            <motion.div key={deadline.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/30 border border-zinc-800/30">
              <div className="min-w-0">
                <div className="text-[13px] text-zinc-300 truncate">{deadline.title}</div>
                {deadline.course && <div className="text-[11px] text-zinc-600 mt-0.5">{deadline.course}</div>}
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border shrink-0 ml-2 ${urgencyStyles[urgency]}`}>
                <Clock size={11} />
                {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? '1d' : `${daysLeft}d`}
              </div>
            </motion.div>
          );
        })}
      </div>

      {sorted.length === 0 && !isAdding && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <CheckCircle2 size={20} className="text-zinc-700 mb-2" />
          <span className="text-[13px] font-medium text-zinc-500">No upcoming deadlines</span>
        </div>
      )}
    </div>
  );
}
