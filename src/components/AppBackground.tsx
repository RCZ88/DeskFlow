import { Particles } from './ui/particles';
import { LightRays } from './ui/light-rays';

export function AppBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[0]">
      <Particles quantity={60} color="#10b981" opacity={0.6} />
      <Particles quantity={45} color="#3b82f6" opacity={0.5} />
      <Particles quantity={35} color="#ef4444" opacity={0.4} />
      <LightRays color="rgba(160, 210, 255, 0.35)" blur={48} count={5} speed={18} />
    </div>
  );
}
