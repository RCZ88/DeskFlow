import React from 'react';

export function WhiteboardDemo() {
  return (
    <div className="rounded-lg bg-[#fafaf9] p-3 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
      <svg viewBox="0 0 200 100" className="w-full">
        <path d="M 30 50 C 50 20, 80 80, 100 50 S 150 20, 170 50" stroke="#1c1917" strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="20" y="70" width="40" height="25" rx="4" fill="none" stroke="#c2553a" strokeWidth="1.5" />
        <circle cx="150" cy="30" r="15" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
        <text x="100" y="95" textAnchor="middle" fill="#78716c" fontSize="10" fontFamily="system-ui">Sketch pad</text>
      </svg>
    </div>
  );
}
