import { maxOf, minOf } from '../../../utils/safeMath';
// Shared sparkline used by the sticky header and KPI cards.
// Single source of truth — do not redefine inline in tabs/components.
interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = '#6ee7b7',
  width = 96,
  height = 32,
  strokeWidth = 1.5,
  className = '',
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const max = maxOf(data, 1);
  const min = minOf(data, 0);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
