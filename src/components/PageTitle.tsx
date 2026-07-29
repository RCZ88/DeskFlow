import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { BlurFade } from './ui/blur-fade';
import { AnimatedGradientText } from './ui/animated-gradient-text';
import { cn } from '@/lib/utils';

const routeAccents: Record<string, {
  bg: string;
  text: string;
  glow: string;
  from: string;
  to: string;
  iconGlow: string;
}> = {
  '/':         { bg: 'bg-[rgba(236,72,153,0.18)]', text: 'text-pink-300', glow: 'shadow-pink-500/25', from: '#f472b6', to: '#a78bfa', iconGlow: '0 0 8px rgba(236,72,153,0.4)' },
  '/activity': { bg: 'bg-[rgba(52,211,153,0.18)]', text: 'text-emerald-300', glow: 'shadow-emerald-500/25', from: '#34d399', to: '#22d3ee', iconGlow: '0 0 8px rgba(52,211,153,0.4)' },
  '/ai':       { bg: 'bg-[rgba(167,139,250,0.18)]', text: 'text-violet-300', glow: 'shadow-violet-500/25', from: '#a78bfa', to: '#e879f9', iconGlow: '0 0 8px rgba(167,139,250,0.4)' },
  '/learn':    { bg: 'bg-[rgba(251,191,36,0.18)]', text: 'text-amber-300', glow: 'shadow-amber-500/25', from: '#fbbf24', to: '#f97316', iconGlow: '0 0 8px rgba(251,191,36,0.4)' },
  '/resume':   { bg: 'bg-[rgba(129,140,248,0.18)]', text: 'text-indigo-300', glow: 'shadow-indigo-500/25', from: '#818cf8', to: '#a78bfa', iconGlow: '0 0 8px rgba(129,140,248,0.4)' },
  '/ide':      { bg: 'bg-[rgba(103,232,249,0.18)]', text: 'text-cyan-300', glow: 'shadow-cyan-500/25', from: '#67e8f9', to: '#818cf8', iconGlow: '0 0 8px rgba(103,232,249,0.4)' },
  '/external': { bg: 'bg-[rgba(251,146,60,0.18)]', text: 'text-orange-300', glow: 'shadow-orange-500/25', from: '#fb923c', to: '#f87171', iconGlow: '0 0 8px rgba(251,146,60,0.4)' },
  '/finance':  { bg: 'bg-[rgba(52,211,153,0.18)]', text: 'text-emerald-300', glow: 'shadow-emerald-500/25', from: '#4ade80', to: '#2dd4bf', iconGlow: '0 0 8px rgba(52,211,153,0.4)' },
  '/reports':  { bg: 'bg-[rgba(244,114,182,0.18)]', text: 'text-pink-300', glow: 'shadow-pink-500/25', from: '#f472b6', to: '#fb923c', iconGlow: '0 0 8px rgba(244,114,182,0.4)' },
  '/database': { bg: 'bg-[rgba(56,189,248,0.18)]', text: 'text-sky-300', glow: 'shadow-sky-500/25', from: '#38bdf8', to: '#a78bfa', iconGlow: '0 0 8px rgba(56,189,248,0.4)' },
  '/life':     { bg: 'bg-[rgba(251,113,133,0.18)]', text: 'text-rose-300', glow: 'shadow-rose-500/25', from: '#fb7185', to: '#f472b6', iconGlow: '0 0 8px rgba(251,113,133,0.4)' },
  '/settings': { bg: 'bg-[rgba(45,212,191,0.18)]', text: 'text-teal-300', glow: 'shadow-teal-500/25', from: '#2dd4bf', to: '#38bdf8', iconGlow: '0 0 8px rgba(45,212,191,0.4)' },
  '/guide':    { bg: 'bg-[rgba(96,165,250,0.18)]', text: 'text-blue-300', glow: 'shadow-blue-500/25', from: '#60a5fa', to: '#c084fc', iconGlow: '0 0 8px rgba(96,165,250,0.4)' },
};

interface PageTitleProps {
  icon: LucideIcon;
  label: string;
  path: string;
}

export function PageTitle({ icon: Icon, label, path }: PageTitleProps) {
  const accent = routeAccents[path] || routeAccents['/'];

  return (
    <BlurFade key={path} direction="down" duration={0.35} delay={0.05}>
      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-white/15',
            accent.bg
          )}
          style={{ boxShadow: accent.iconGlow }}
        >
          <Icon className={cn('w-[15px] h-[15px]', accent.text)} />
        </div>

        <div className="relative">
          <AnimatedGradientText
            speed={1.5}
            colorFrom={accent.from}
            colorTo={accent.to}
            className="text-lg font-semibold tracking-tight font-serif"
          >
            {label}
          </AnimatedGradientText>

          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '100%', opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn('h-[2px] rounded-full mt-0.5', accent.bg.replace('18', '40'))}
          />
        </div>
      </div>
    </BlurFade>
  );
}
