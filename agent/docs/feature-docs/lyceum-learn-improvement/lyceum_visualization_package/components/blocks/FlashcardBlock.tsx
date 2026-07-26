import React, { useState, useCallback, useEffect } from 'react';

type CardRating = 1 | 2 | 3 | 4;

interface Props {
  meta: {
    deck_id: string;
    card_type: string;
    front: string;
    back: string;
    front_media?: { image?: string };
    back_media?: { image?: string };
    tags?: string[];
    occlusions?: Array<{ x: number; y: number; width: number; height: number; label: string }>;
  };
  onRate?: (rating: CardRating) => void;
  onNext?: () => void;
}

const RATING_CONFIG: Record<CardRating, { label: string; interval: string; borderColor: string; textColor: string }> = {
  1: { label: 'Again', interval: '1m', borderColor: 'rgba(239,68,68,0.5)', textColor: '#ef4444' },
  2: { label: 'Hard', interval: '6d', borderColor: 'rgba(245,158,11,0.5)', textColor: '#f59e0b' },
  3: { label: 'Good', interval: '10d', borderColor: 'rgba(34,197,94,0.5)', textColor: '#22c55e' },
  4: { label: 'Easy', interval: '24d', borderColor: 'rgba(91,141,239,0.5)', textColor: '#5B8DEF' },
};

export function FlashcardBlock({ meta, onRate, onNext }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [occlusionRevealed, setOcclusionRevealed] = useState<Set<number>>(new Set());

  const handleFlip = useCallback(() => {
    setFlipped(!flipped);
    setRevealed(true);
  }, [flipped]);

  const handleRate = useCallback((rating: CardRating) => {
    onRate?.(rating);
    setFlipped(false);
    setRevealed(false);
    setOcclusionRevealed(new Set());
    setTimeout(() => onNext?.(), 300);
  }, [onRate, onNext]);

  const handleOcclusionClick = (index: number) => {
    setOcclusionRevealed(prev => new Set(prev).add(index));
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleFlip(); }
      if (revealed) {
        if (e.key === '1') handleRate(1);
        if (e.key === '2') handleRate(2);
        if (e.key === '3') handleRate(3);
        if (e.key === '4') handleRate(4);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleFlip, handleRate, revealed]);

  const isOcclusion = meta.card_type === 'image_occlusion' && meta.occlusions && meta.occlusions.length > 0;
  const isCloze = meta.card_type === 'cloze';

  const renderFront = () => {
    if (isOcclusion && meta.front_media?.image) {
      return (
        <div className="relative w-full h-full">
          <img src={meta.front_media.image} alt="Occlusion" className="w-full h-full object-contain rounded-lg" />
          {meta.occlusions?.map((occ, i) => (
            <div
              key={i}
              onClick={() => handleOcclusionClick(i)}
              className="absolute flex items-center justify-center text-white text-xs font-medium rounded cursor-pointer transition-all duration-300"
              style={{
                left: `${occ.x * 100}%`, top: `${occ.y * 100}%`,
                width: `${occ.width * 100}%`, height: `${occ.height * 100}%`,
                background: occlusionRevealed.has(i) ? 'transparent' : 'rgba(217,119,6,0.85)',
                backdropFilter: occlusionRevealed.has(i) ? 'none' : 'blur(2px)',
              }}
            >
              {!occlusionRevealed.has(i) && '?'}
            </div>
          ))}
        </div>
      );
    }

    if (isCloze) {
      const parts = meta.front.split(/(\{\{c\d+::[^}]+\}\})/g);
      return (
        <div className="text-base leading-relaxed text-zinc-100">
          {parts.map((part, i) => {
            const match = part.match(/\{\{c\d+::([^}]+)\}\}/);
            if (match) {
              return (
                <span key={i} className="px-1 rounded border-b-2 border-amber-500 bg-amber-500/15">
                  [ ... ]
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      );
    }

    return <div className="text-lg font-medium leading-relaxed text-zinc-100 text-center">{meta.front}</div>;
  };

  const renderBack = () => {
    if (isCloze) {
      const parts = meta.front.split(/(\{\{c\d+::[^}]+\}\})/g);
      return (
        <div className="text-base leading-relaxed text-zinc-100">
          {parts.map((part, i) => {
            const match = part.match(/\{\{c\d+::([^}]+)\}\}/);
            if (match) {
              return (
                <span key={i} className="px-1 rounded border-b-2 border-emerald-500 bg-emerald-500/15 font-medium">
                  {match[1]}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      );
    }

    return (
      <div className="text-base leading-relaxed text-zinc-100 text-center">
        <div className="mb-3">{meta.back}</div>
        {meta.back_media?.image && <img src={meta.back_media.image} alt="Answer" className="max-w-full rounded-lg mt-2" />}
      </div>
    );
  };

  return (
    <div className="p-5">
      <div className="perspective-[1000px] w-full max-w-[480px] mx-auto h-[280px]">
        <div
          className="w-full h-full relative cursor-pointer"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
          onClick={!revealed ? handleFlip : undefined}
        >
          <div className="absolute inset-0 backface-hidden rounded-xl border border-zinc-800 flex items-center justify-center p-6"
            style={{ background: 'rgba(217,119,6,0.06)', backfaceVisibility: 'hidden' }}>
            {renderFront()}
            {!revealed && <div className="absolute bottom-3 text-xs text-zinc-600">Click or Space to flip</div>}
          </div>
          <div className="absolute inset-0 backface-hidden rounded-xl border border-zinc-800 flex items-center justify-center p-6"
            style={{ background: 'rgba(34,197,94,0.06)', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            {renderBack()}
          </div>
        </div>
      </div>

      {revealed && (
        <div className="flex justify-center gap-2.5 mt-5 flex-wrap">
          {(Object.entries(RATING_CONFIG) as [string, typeof RATING_CONFIG[1]][]).map(([rating, config]) => (
            <button
              key={rating}
              onClick={(e) => { e.stopPropagation(); handleRate(Number(rating) as CardRating); }}
              className="px-4 py-2 rounded-lg border-[1.5px] bg-transparent text-xs font-medium cursor-pointer transition-all hover:bg-current/10 flex flex-col items-center min-w-[64px]"
              style={{ borderColor: config.borderColor, color: config.textColor }}
            >
              <span>{config.label}</span>
              <span className="text-[10px] opacity-60 mt-0.5">{config.interval}</span>
            </button>
          ))}
        </div>
      )}

      {meta.tags && meta.tags.length > 0 && (
        <div className="flex gap-1.5 justify-center mt-3.5 flex-wrap">
          {meta.tags.map(tag => (
            <span key={tag} className="text-[11px] px-2.5 py-0.5 rounded-full border border-zinc-800 text-zinc-500">
              {tag}
            </span>
          ))}
        </div>
      )}

      {revealed && <div className="text-center mt-2.5 text-[11px] text-zinc-600">Press 1-4 to rate</div>}
    </div>
  );
}
