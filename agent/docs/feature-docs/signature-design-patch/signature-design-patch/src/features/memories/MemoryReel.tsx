import { useEffect, useRef } from 'react';
import { Film, Play, PlayCircle } from 'lucide-react';
import type { LoadedMemory } from './useMemories';

// SIGNATURE HERO (signature-design skill): "Film-strip reel".
// Concept essence -> memories are a film of your life; browsing should feel
// like *watching*, not scanning a grid. Pure CSS scroll-snap strip with layered
// sprocket-hole gradients and an IntersectionObserver that enlarges the centered
// "now playing" frame -- no library, only transform/opacity animate on the hot
// path (references/motion-engineering.md). Keyboard-navigable so browsing is
// never trapped inside the reel.

interface MemoryReelProps {
  items: LoadedMemory[];
  onOpen: (m: LoadedMemory) => void;
  onPlayRecap: () => void;
}

export function MemoryReel({ items, onOpen, onPlayRecap }: MemoryReelProps) {
  const reelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reel = reelRef.current;
    if (!reel) return;
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) e.target.classList.toggle('reel-active', e.intersectionRatio > 0.7);
      },
      { root: reel, threshold: [0, 0.7, 1] },
    );
    const frames = reel.querySelectorAll('.reel-frame');
    frames.forEach(f => io.observe(f));
    return () => io.disconnect();
  }, [items]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const reel = reelRef.current;
    if (!reel) return;
    if (e.key === 'ArrowRight') { reel.scrollBy({ left: 200, behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { reel.scrollBy({ left: -200, behavior: 'smooth' }); e.preventDefault(); }
  };

  if (items.length === 0) return null;

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#6fb38f]/20">
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#6fb38f]">
          <Film className="w-3.5 h-3.5" /> Your life on film
        </div>
        <button
          onClick={onPlayRecap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6fb38f]/15 text-[#6fb38f] text-[11px] font-semibold hover:bg-[#6fb38f]/25 transition-colors"
        >
          <Play className="w-3 h-3" /> Play recap
        </button>
      </div>
      <div
        ref={reelRef}
        className="memory-reel"
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="listbox"
        aria-label="Memory film strip"
      >
        {items.map(m => (
          <button
            key={m.meta.id}
            className="reel-frame"
            onClick={() => onOpen(m)}
            role="option"
            aria-label={m.meta.caption || m.meta.date}
          >
            <img src={m.url} alt={m.meta.caption || ''} loading="lazy" draggable={false} />
            {m.meta.kind === 'video' && (
              <span className="reel-play"><PlayCircle className="w-7 h-7 text-white/90 drop-shadow" /></span>
            )}
            {m.meta.caption && <span className="reel-caption">{m.meta.caption}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
