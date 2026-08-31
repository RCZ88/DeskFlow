import { useId } from 'react';

/**
 * Fullscreen film-grain overlay via SVG feTurbulence.
 * Renders once, never re-renders (pure static).
 * z-[200] above all content, pointer-events-none.
 * Reduced motion: identical static grain (grain is not motion).
 */
export function GrainOverlay() {
  const id = useId();
  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-none"
      aria-hidden="true"
    >
      <svg className="w-full h-full">
        <filter id={`grain-${id}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter={`url(#grain-${id})`}
          opacity="0.04"
        />
      </svg>
    </div>
  );
}
