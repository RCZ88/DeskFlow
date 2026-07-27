import { motion } from 'framer-motion';
import { Moon, BedDouble, Sunrise } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { BlurFade } from '../ui/blur-fade';

interface SleepDay {
  label: string;
  hours: number;
}

interface SleepBarMiniProps {
  sleepData?: SleepDay[];
  avgSleep?: number;
  sleepDebt?: number;
  avgBedtime?: string;
  avgWakeTime?: string;
}

export function SleepBarMini({ sleepData = [], avgSleep = 0, sleepDebt = 0, avgBedtime, avgWakeTime }: SleepBarMiniProps) {
  const isEmpty = sleepData.length === 0;

  return (
    <BlurFade delay={0.3} duration={0.4}>
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 mb-4">
        <div className="border-t border-indigo-400/30 -mx-5 -mt-5 mb-4" />
        
        <SectionHeader title="Sleep" icon={<Moon size={14} />} />

        {isEmpty ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-[13px] text-zinc-400">No sleep data yet</p>
            <p className="text-[11px] text-zinc-600 mt-1">Track your first sleep session to see trends</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1.5 h-20 mt-3">
              {sleepData.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.hours / 10) * 100}%` }}
                    transition={{ delay: 0.48 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className={`w-full rounded-t-sm min-h-[4px] ${
                      day.hours >= 7 ? 'bg-indigo-400' : 'bg-indigo-400/40'
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
                <span className="text-amber-400 font-medium">-{sleepDebt.toFixed(1)}h debt</span>
              )}
            </div>

            {(avgBedtime || avgWakeTime) && (
              <div className="mt-2 pt-2 border-t border-[#27272a] flex items-center gap-4 text-[11px]">
                {avgBedtime && (
                  <span className="flex items-center gap-1 text-zinc-500">
                    <BedDouble size={10} className="text-zinc-600" />
                    <span className="text-zinc-300 font-mono">{avgBedtime}</span>
                  </span>
                )}
                {avgWakeTime && (
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Sunrise size={10} className="text-zinc-600" />
                    <span className="text-zinc-300 font-mono">{avgWakeTime}</span>
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </BlurFade>
  );
}
