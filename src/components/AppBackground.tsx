import { Particles } from './ui/particles';
import { LightRays } from './ui/light-rays';
import { LivingSubstrate } from './life-river/LivingSubstrate';

const PAGE_ACCENTS: Record<string, string> = {
  '/': '#ec4899',
  '/activity': '#22d3ee',
  '/ide': '#8b5cf6',
  '/life': '#fbbf24',
  '/finance': '#10b981',
  '/external': '#fbbf24',
  '/terminal': '#a3e635',
  '/ai': '#8b5cf6',
  '/learn': '#6366f1',
  '/settings': '#22d3ee',
  '/database': '#a78bfa',
  '/reports': '#ec4899',
  '/resume': '#cbd5e1',
};

export function AppBackground({ pathname = '/' }: { pathname?: string }) {
  const accent = PAGE_ACCENTS[pathname] || '#fbbf24';
  const isHero = pathname === '/' || pathname === '/life';

  return (
    <div className="fixed inset-0 pointer-events-none z-[0] overflow-hidden">
      <LivingSubstrate
        accent={accent}
        speed={isHero ? 2 : 1}
        maxAlpha={isHero ? 0.6 : 0.4}
      />
      <Particles quantity={30} color="#10b981" opacity={0.3} />
      <Particles quantity={20} color="#3b82f6" opacity={0.25} />
      <LightRays color="rgba(160, 210, 255, 0.35)" blur={48} count={4} speed={12} />
    </div>
  );
}
