import React from 'react';

export function SvgDemo() {
  return (
    <div className="flex items-center justify-center py-2">
      <svg viewBox="0 0 200 100" className="w-full max-w-[200px]">
        <circle cx="100" cy="50" r="35" fill="none" stroke="#c2553a" strokeWidth="2" />
        <circle cx="60" cy="50" r="20" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
        <circle cx="140" cy="50" r="20" fill="none" stroke="#6fb38f" strokeWidth="1.5" />
        <text x="100" y="54" textAnchor="middle" fill="#e7e5e4" fontSize="10" fontFamily="system-ui">A ∪ B</text>
      </svg>
    </div>
  );
}
