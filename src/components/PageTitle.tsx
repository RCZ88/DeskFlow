import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const routeAccents: Record<string, {
  bg: string;
  text: string;
  from: string;
  to: string;
  iconGlow: string;
}> = {
  '/':         { bg: 'bg-[rgba(236,72,153,0.18)]', text: 'text-pink-300', from: '#f472b6', to: '#a78bfa', iconGlow: '0 0 8px rgba(236,72,153,0.4)' },
  '/activity': { bg: 'bg-[rgba(52,211,153,0.18)]', text: 'text-emerald-300', from: '#34d399', to: '#22d3ee', iconGlow: '0 0 8px rgba(52,211,153,0.4)' },
  '/ai':       { bg: 'bg-[rgba(167,139,250,0.18)]', text: 'text-violet-300', from: '#a78bfa', to: '#e879f9', iconGlow: '0 0 8px rgba(167,139,250,0.4)' },
  '/learn':    { bg: 'bg-[rgba(251,191,36,0.18)]', text: 'text-amber-300', from: '#fbbf24', to: '#f97316', iconGlow: '0 0 8px rgba(251,191,36,0.4)' },
  '/resume':   { bg: 'bg-[rgba(129,140,248,0.18)]', text: 'text-indigo-300', from: '#818cf8', to: '#a78bfa', iconGlow: '0 0 8px rgba(129,140,248,0.4)' },
  '/ide':      { bg: 'bg-[rgba(103,232,249,0.18)]', text: 'text-cyan-300', from: '#67e8f9', to: '#818cf8', iconGlow: '0 0 8px rgba(103,232,249,0.4)' },
  '/external': { bg: 'bg-[rgba(251,146,60,0.18)]', text: 'text-orange-300', from: '#fb923c', to: '#f87171', iconGlow: '0 0 8px rgba(251,146,60,0.4)' },
  '/finance':  { bg: 'bg-[rgba(52,211,153,0.18)]', text: 'text-emerald-300', from: '#4ade80', to: '#2dd4bf', iconGlow: '0 0 8px rgba(52,211,153,0.4)' },
  '/reports':  { bg: 'bg-[rgba(244,114,182,0.18)]', text: 'text-pink-300', from: '#f472b6', to: '#fb923c', iconGlow: '0 0 8px rgba(244,114,182,0.4)' },
  '/database': { bg: 'bg-[rgba(56,189,248,0.18)]', text: 'text-sky-300', from: '#38bdf8', to: '#a78bfa', iconGlow: '0 0 8px rgba(56,189,248,0.4)' },
  '/life':     { bg: 'bg-[rgba(251,113,133,0.18)]', text: 'text-rose-300', from: '#fb7185', to: '#f472b6', iconGlow: '0 0 8px rgba(251,113,133,0.4)' },
  '/settings': { bg: 'bg-[rgba(45,212,191,0.18)]', text: 'text-teal-300', from: '#2dd4bf', to: '#38bdf8', iconGlow: '0 0 8px rgba(45,212,191,0.4)' },
  '/guide':    { bg: 'bg-[rgba(96,165,250,0.18)]', text: 'text-blue-300', from: '#60a5fa', to: '#c084fc', iconGlow: '0 0 8px rgba(96,165,250,0.4)' },
};

interface PageTitleProps {
  icon: LucideIcon;
  label: string;
  path: string;
}

export function PageTitle({ icon: Icon, label, path }: PageTitleProps) {
  const accent = routeAccents[path] || routeAccents['/'];

  return (
    <div
      className="relative flex items-center gap-3"
      style={{ transformOrigin: 'left' }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-white/15',
          accent.bg
        )}
        style={{ boxShadow: accent.iconGlow }}
      >
        <Icon className={cn('w-[15px] h-[15px]', accent.text)} />
      </motion.div>

      <div className="relative overflow-visible">
        <motion.span
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'inline-block text-[15px] font-mono font-medium tracking-tight',
            accent.text
          )}
        >
          {label}
        </motion.span>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{
            scaleX: { duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.2, delay: 0.3 },
          }}
          className="absolute -bottom-[5px] left-0 h-[3px] rounded-full w-full origin-left"
          style={{
            background: `linear-gradient(90deg, ${accent.from}, ${accent.to})`,
            boxShadow: `0 0 14px ${accent.from}80, 0 0 30px ${accent.from}40`,
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0.15, 1, 0.15, 1, 0.15, 1],
            }}
            transition={{
              duration: 2.4,
              delay: 0.8,
              ease: 'easeInOut',
              times: [0, 0.12, 0.25, 0.37, 0.5, 0.62, 0.75, 1],
            }}
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${accent.from}, ${accent.to})`,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
