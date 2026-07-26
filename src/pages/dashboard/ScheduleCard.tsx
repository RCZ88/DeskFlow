import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import { BorderBeam } from '../../components/ui/border-beam';
import { AnimatedGradientText } from '../../components/ui/animated-gradient-text';

interface ScheduleEntry {
  id: string;
  title: string;
  location?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  category?: string;
  color?: string;
}

interface ScheduleCardProps {
  className?: string;
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getMinutesUntil(timeStr: string): number {
  const now = new Date();
  const target = parseTime(timeStr);
  const current = now.getHours() * 60 + now.getMinutes();
  return target - current;
}

export function ScheduleCard({ className = '' }: ScheduleCardProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await (window as any).deskflowAPI?.getSchedule?.();
        if (result?.entries) setEntries(result.entries);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, []);

  const today = new Date().getDay();

  const todayEntries = useMemo(() =>
    entries
      .filter(e => e.day_of_week === today)
      .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time)),
    [entries, today]
  );

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const currentEntry = todayEntries.find(e => {
    const start = parseTime(e.start_time);
    const end = parseTime(e.end_time);
    return nowMinutes >= start && nowMinutes < end;
  });

  const upcomingEntries = todayEntries.filter(e => parseTime(e.start_time) > nowMinutes);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[today];

  if (loading) {
    return (
      <div className={`relative rounded-xl border border-zinc-800/50 bg-zinc-900/60 backdrop-blur-xl p-5 overflow-hidden ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-1/3" />
          <div className="h-3 bg-zinc-800/50 rounded w-1/2" />
          <div className="space-y-2 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-zinc-800/30 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-xl border border-zinc-800/50 bg-zinc-900/60 backdrop-blur-xl p-5 overflow-hidden ${className}`}
    >
      {/* Gradient glow */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ background: 'linear-gradient(135deg, #ec4899, transparent 60%)' }} />
      {/* Top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-pink-500/30 via-pink-500/10 to-transparent" />
      {currentEntry && <BorderBeam size={200} duration={12} colorFrom="#ec4899" colorTo="#f472b6" />}

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
            <Calendar className="w-4.5 h-4.5 text-pink-400" />
          </div>
          <div>
            <AnimatedGradientText className="text-[15px] font-semibold" gradientFrom="#ec4899" gradientTo="#f472b6">
              {dayName}&apos;s Schedule
            </AnimatedGradientText>
            <p className="text-[11px] text-zinc-500">
              {todayEntries.length === 0
                ? 'No classes today'
                : `${todayEntries.length} block${todayEntries.length > 1 ? 's' : ''} scheduled`}
            </p>
          </div>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {todayEntries.length === 0 ? (
        /* Empty state */
        <div className="relative flex flex-col items-center text-center py-6">
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-400">Nothing scheduled for today</p>
          <p className="text-[11px] text-zinc-600 mt-1">Add classes in Settings → Schedule</p>
        </div>
      ) : (
        <div className="relative space-y-2">
          {/* Current block */}
          <AnimatePresence>
            {currentEntry && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="relative p-3 rounded-lg border border-pink-500/30 bg-pink-500/[0.08] overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: currentEntry.color || '#ec4899' }} />
                <div className="flex items-center justify-between pl-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                      <span className="text-sm font-semibold text-zinc-100">{currentEntry.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {formatTime(currentEntry.start_time)} – {formatTime(currentEntry.end_time)}
                      </span>
                      {currentEntry.location && (
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{currentEntry.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-pink-400 font-medium uppercase tracking-wider">Now</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upcoming blocks */}
          {upcomingEntries.slice(0, 4).map((entry, i) => {
            const minsUntil = getMinutesUntil(entry.start_time);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 + 0.1 }}
                className="relative p-3 rounded-lg border border-zinc-800/50 bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors duration-150"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: entry.color || '#6b7280' }} />
                <div className="flex items-center justify-between pl-3">
                  <div>
                    <span className="text-sm font-medium text-zinc-200">{entry.title}</span>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                      </span>
                      {entry.location && (
                        <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{entry.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {minsUntil > 0 && minsUntil < 120 && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      in {minsUntil}m
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}

          {upcomingEntries.length > 4 && (
            <div className="text-center text-[11px] text-zinc-600 pt-1">
              +{upcomingEntries.length - 4} more
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
