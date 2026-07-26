import React from 'react';

export function FlowDemo() {
  return (
    <div className="flex items-center justify-center py-2">
      <svg viewBox="0 0 300 80" className="w-full max-w-xs">
        <defs>
          <linearGradient id="flow1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c2553a" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="flow2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6fb38f" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path d="M 20 20 C 80 20, 80 50, 150 50" stroke="url(#flow1)" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M 20 60 C 80 60, 80 50, 150 50" stroke="url(#flow1)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M 150 50 C 220 50, 220 30, 280 30" stroke="url(#flow2)" strokeWidth="16" fill="none" strokeLinecap="round" />
        <text x="10" y="15" fill="#a8a29e" fontSize="9" fontFamily="system-ui">Input</text>
        <text x="135" y="75" fill="#a8a29e" fontSize="9" fontFamily="system-ui">Merge</text>
        <text x="260" y="25" fill="#a8a29e" fontSize="9" fontFamily="system-ui">Output</text>
      </svg>
    </div>
  );
}
