import { Particles } from './ui/particles';
import { LightRays } from './ui/light-rays';

export function AppBackground({ pathname = '/' }: { pathname?: string }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[0] overflow-hidden">
      <Particles quantity={25} color="#3b82f6" opacity={0.15} />
      <Particles quantity={15} color="#8b5cf6" opacity={0.1} />
      <LightRays color="rgba(160, 210, 255, 0.2)" blur={60} count={3} speed={10} />
    </div>
  );
}
