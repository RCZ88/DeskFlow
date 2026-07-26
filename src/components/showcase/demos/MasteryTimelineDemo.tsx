import React from 'react';

export function MasteryTimelineDemo() {
  const milestones = [
    { date: 'Jan', level: 'L1', color: '#5B8DEF' },
    { date: 'Mar', level: 'L2', color: '#23B5B5' },
    { date: 'Jun', level: 'L3', color: '#3CCB7F' },
  ];
  return (
    <div className="flex items-center justify-center py-2">
      <svg viewBox="0 0 240 60" className="w-full max-w-[260px]">
        <line x1="20" y1="30" x2="220" y2="30" stroke="#78716c" strokeWidth="1" strokeDasharray="4 2" />
        {milestones.map((m, i) => (
          <g key={i}>
            <circle cx={20 + i * 100} cy="30" r="8" fill="#1c1917" stroke={m.color} strokeWidth="2" />
            <text x={20 + i * 100} y="34" textAnchor="middle" fill={m.color} fontSize="8" fontFamily="system-ui" fontWeight="bold">{m.level}</text>
            <text x={20 + i * 100} y="52" textAnchor="middle" fill="#78716c" fontSize="9" fontFamily="system-ui">{m.date}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
