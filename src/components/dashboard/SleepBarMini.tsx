import { motion } from 'framer-motion';
import { Moon } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';

interface SleepDay {
  label: string;
  hours: number;
}

interface SleepBarMiniProps {
  sleepData?: SleepDay[];
  avgSleep?: number;
  sleepDebt?: number;
}

export function SleepBarMini({ sleepData = [], avgSleep = 0, sleepDebt = 0 }: SleepBarMiniProps) {
  return (
    <div className="relative rounded-xl overflow-hidden
      bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
      border border-[rgba(63,63,70,0.50)] p-5
      hover:border-[rgba(82,82,91,0.80)] transition-all duration-250 h-full">

      <div className="absolute top-0 left-4 right-4 h-px
        bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-60 pointer-events-none" />

      <SectionHeader title="Sleep" icon={<Moon size={14} />} />

      <div className="flex items-end gap-1.5 h-20 mt-3">
        {sleepData.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(day.hours / 10) * 100}%` }}
              transition={{ delay: 0.48 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full rounded-t-sm min-h-[4px] ${
                day.hours >= 7 ? 'bg-indigo-400/70' : 'bg-indigo-400/30'
              }`}
            />
            <span className="text-[10px] text-zinc-600 font-medium">{day.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">
          Avg: <span className="text-zinc-300 font-mono">{avgSleep.toFixed(1)}h</span>
        </span>
        {sleepDebt > 0 && (
          <span className="text-rose-400 font-medium">-{sleepDebt.toFixed(1)}h debt</span>
        )}
      </div>
    </div>
  );
}
