import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const DOMAIN_COLORS: Record<string, string> = {
  apps: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
  browser: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
  productivity: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
  sleep: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20',
  git: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
  ai: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
  external: 'from-pink-500/10 to-pink-600/5 border-pink-500/20',
  focus: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
};

const DOMAIN_ACCENTS: Record<string, string> = {
  apps: 'text-blue-400',
  browser: 'text-cyan-400',
  productivity: 'text-emerald-400',
  sleep: 'text-indigo-400',
  git: 'text-orange-400',
  ai: 'text-purple-400',
  external: 'text-pink-400',
  focus: 'text-amber-400',
};

export function FunFactHero() {
  const [fact, setFact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const api = window.deskflowAPI;

  useEffect(() => {
    if (!api?.getDailyFunFact) { setLoading(false); return; }
    api.getDailyFunFact().then((data: any) => {
      setFact(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-5 animate-pulse">
        <div className="h-4 w-32 bg-zinc-800 rounded mb-2" />
        <div className="h-8 w-48 bg-zinc-800 rounded mb-1" />
        <div className="h-3 w-64 bg-zinc-800 rounded" />
      </div>
    );
  }

  if (!fact?.copy?.headline) return null;

  const gradient = DOMAIN_COLORS[fact.domain] || DOMAIN_COLORS.apps;
  const accent = DOMAIN_ACCENTS[fact.domain] || 'text-zinc-400';
  const direction = fact.comparison?.direction;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-gradient-to-br ${gradient} p-5 relative overflow-hidden`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className={`w-3.5 h-3.5 ${accent}`} />
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
              Today's insight
            </span>
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 leading-tight">
            {fact.copy.headline}
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            {fact.copy.subtext}
          </p>
        </div>
        {direction && direction !== 'flat' && (
          <div className={`flex items-center gap-1 text-xs ${direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {direction === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{Math.abs(fact.comparison?.deltaPct || 0)}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
