import { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { SectionHeader } from '../../components/SectionHeader';
import { AlertTriangle, Globe, AppWindow, Clock, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Distraction {
  name: string;
  type: 'app' | 'website';
  timestamp: number;
}

interface FocusDistractionLogProps {
  distractions: Distraction[];
  isActive: boolean;
}

interface DistractionGroup {
  name: string;
  type: 'app' | 'website';
  count: number;
  lastSeen: number;
}

export function FocusDistractionLog({ distractions, isActive }: FocusDistractionLogProps) {
  const [expanded, setExpanded] = useState(false);

  const groupedDistractions = useMemo(() => {
    const groups = new Map<string, DistractionGroup>();
    
    for (const d of distractions) {
      const key = `${d.type}:${d.name}`;
      const existing = groups.get(key);
      
      if (existing) {
        existing.count++;
        existing.lastSeen = Math.max(existing.lastSeen, d.timestamp);
      } else {
        groups.set(key, {
          name: d.name,
          type: d.type,
          count: 1,
          lastSeen: d.timestamp,
        });
      }
    }
    
    return Array.from(groups.values())
      .sort((a, b) => b.count - a.count);
  }, [distractions]);

  const totalDistractions = distractions.length;
  const uniqueDistractions = groupedDistractions.length;
  const websiteDistractions = groupedDistractions.filter(d => d.type === 'website').length;
  const appDistractions = groupedDistractions.filter(d => d.type === 'app').length;

  const fmtTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isActive && distractions.length === 0) {
    return (
      <GlassCard className="h-full bg-zinc-900/95 border-zinc-800/60">
        <SectionHeader
          title="Distractions"
          titleClassName="font-display"
          icon={<AlertTriangle className="w-4 h-4 text-zinc-500" />}
        />
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-xs text-zinc-500">No distractions yet</p>
          <p className="text-[10px] text-zinc-600 mt-1">
            {isActive ? 'Staying focused...' : 'Start a session to track'}
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="h-full bg-zinc-900/95 border-zinc-800/60">
      <SectionHeader
        title="Distractions"
        titleClassName="font-display"
        icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
        action={
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/40 text-zinc-500 hover:bg-zinc-700 transition-colors"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
        <div className="text-center p-2 rounded-lg bg-zinc-800/30">
          <div className="text-lg font-bold text-amber-400">{totalDistractions}</div>
          <div className="text-[10px] text-zinc-500">Total</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-zinc-800/30">
          <div className="text-lg font-bold text-rose-400">{appDistractions}</div>
          <div className="text-[10px] text-zinc-500">Apps</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-zinc-800/30">
          <div className="text-lg font-bold text-orange-400">{websiteDistractions}</div>
          <div className="text-[10px] text-zinc-500">Sites</div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {groupedDistractions.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-[11px] text-emerald-400 font-medium">Perfect focus!</p>
            <p className="text-[10px] text-zinc-600 mt-1">No distractions detected</p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5"
          >
            {(expanded ? groupedDistractions : groupedDistractions.slice(0, 3)).map((group, index) => (
              <div
                key={`${group.type}:${group.name}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center ${
                  group.type === 'app' ? 'bg-rose-500/15' : 'bg-orange-500/15'
                }`}>
                  {group.type === 'app' ? (
                    <AppWindow className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Globe className="w-3 h-3 text-orange-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-zinc-200 truncate">{group.name}</div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                    <span>{group.count}x</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {fmtTime(group.lastSeen)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {!expanded && groupedDistractions.length > 3 && (
              <button
                onClick={() => setExpanded(true)}
                className="w-full text-[10px] text-zinc-500 hover:text-zinc-400 py-2 transition-colors"
              >
                +{groupedDistractions.length - 3} more distractions
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}