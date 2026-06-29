import React, { useEffect, useState } from 'react';
import type { MasteryLevel } from '../../shared/learn/types';

const LEVEL_COLORS: Record<MasteryLevel, string> = {
  L0: '#5B6472',
  L1: '#5B8DEF',
  L2: '#23B5B5',
  L3: '#3CCB7F',
  L4: '#A78BFA',
  L5: '#F5C04E',
};

const LEVEL_ORDER: MasteryLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

interface Props {
  level: MasteryLevel;
  target?: MasteryLevel;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
}

export function MasteryRing({ level, target, size = 32, strokeWidth = 3, animated = true }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const levelIndex = LEVEL_ORDER.indexOf(level);
  const targetIndex = target ? LEVEL_ORDER.indexOf(target) : 5;
  const fillPercent = targetIndex > 0 ? levelIndex / targetIndex : 0;
  const [offset, setOffset] = useState(animated ? circumference : circumference * (1 - fillPercent));

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setOffset(circumference * (1 - fillPercent));
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setOffset(circumference * (1 - fillPercent));
    }
  }, [fillPercent, circumference, animated]);

  const color = LEVEL_COLORS[level];
  const targetColor = target ? LEVEL_COLORS[target] : '#3f3f46';

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={levelIndex}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-label={`Mastery level ${level}${target ? `, target ${target}` : ''}`}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={targetColor + '20'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={animated ? 'transition-all duration-1000 ease-out' : ''}
        />
      </svg>
      <span className="absolute text-[10px] font-bold leading-none" style={{ color }}>
        {level.replace('L', '')}
      </span>
    </div>
  );
}
