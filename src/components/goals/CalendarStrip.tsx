import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date());
}

function getDaysAround(center: Date, range: number): { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] {
  const days: { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = -range; i <= range; i++) {
    const d = new Date(center);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    days.push({
      dateStr,
      dayName: names[d.getDay()],
      dayNum: d.getDate(),
      isToday: isToday(dateStr),
    });
  }
  return days;
}

interface CalendarStripProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  goalDates?: Set<string>;
}

const DAY_RANGE = 14;

export function CalendarStrip({ selectedDate, onDateChange, goalDates }: CalendarStripProps) {
  const centerDate = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);
  const days = useMemo(() => getDaysAround(centerDate, DAY_RANGE), [centerDate]);

  const shiftWeek = (delta: number) => {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + delta * 7);
    onDateChange(formatDate(d));
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => shiftWeek(-1)}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors shrink-0"
        aria-label="Previous week"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex-1 flex gap-1 overflow-x-auto">
        {days.map(({ dateStr, dayName, dayNum, isToday: today }) => {
          const selected = dateStr === selectedDate;
          const hasGoals = goalDates?.has(dateStr);
          return (
            <motion.button
              key={dateStr}
              onClick={() => onDateChange(dateStr)}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center gap-0.5 py-2 px-2.5 rounded-xl min-w-[48px] transition-all duration-200 relative ${
                selected
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                  : today
                    ? 'bg-zinc-800/40 text-zinc-300 border border-zinc-700/30'
                    : 'bg-zinc-900/40 text-zinc-500 border border-transparent hover:bg-zinc-800/30 hover:text-zinc-300'
              }`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider">{dayName}</span>
              <span className={`text-[15px] font-semibold tabular-nums ${selected ? 'text-white' : ''}`}>{dayNum}</span>
              {hasGoals && (
                <div className={`w-1 h-1 rounded-full mt-0.5 ${selected ? 'bg-violet-400' : 'bg-emerald-400/60'}`} />
              )}
              {today && !selected && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400" />
              )}
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={() => shiftWeek(1)}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors shrink-0"
        aria-label="Next week"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
