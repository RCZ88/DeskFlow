/**
 * SoundWaveVisualizer — Real-time audio frequency bars
 * 24 bars with smooth interpolation, clay color palette.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';

interface SoundWaveVisualizerProps {
  bars: number[];
  volume: number;
  active: boolean;
  barCount?: number;
}

const BAR_COUNT = 24;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 32;

export const SoundWaveVisualizer = memo(function SoundWaveVisualizer({
  bars,
  volume,
  active,
  barCount = BAR_COUNT,
}: SoundWaveVisualizerProps) {
  // Pad or slice bars to exact barCount
  const normalizedBars = Array.from({ length: barCount }, (_, i) => {
    const idx = Math.floor((i / barCount) * bars.length);
    return bars[idx] ?? 0;
  });

  return (
    <div className="flex items-end gap-[2px] h-8" aria-hidden="true">
      {normalizedBars.map((value, i) => {
        const height = Math.max(MIN_HEIGHT, Math.round(value * MAX_HEIGHT));
        const isCenter = i >= barCount * 0.4 && i <= barCount * 0.6;
        const opacity = 0.4 + value * 0.6;

        // Color: clay gradient based on frequency position + volume
        const hueShift = Math.round((i / barCount) * 20); // slight warm shift
        const color = isCenter
          ? `rgba(232, 134, 107, ${opacity})` // clay-400 center
          : `rgba(217, 104, 70, ${opacity * 0.8})`; // clay-500 edges

        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              backgroundColor: color,
              height: active ? height : MIN_HEIGHT,
              transition: 'height 75ms ease-out, background-color 150ms ease',
            }}
            initial={false}
            animate={{
              height: active ? height : MIN_HEIGHT + Math.sin(i * 0.8) * 2 + 2,
            }}
            transition={{ duration: 0.075 }}
          />
        );
      })}
    </div>
  );
});
