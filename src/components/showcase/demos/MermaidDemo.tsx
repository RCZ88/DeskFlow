import React from 'react';

export function MermaidDemo() {
  return (
    <div className="flex items-center justify-center py-4">
      <svg viewBox="0 0 400 120" className="w-full max-w-sm">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#78716c" />
          </marker>
        </defs>
        <rect x="10" y="40" width="70" height="40" rx="8" fill="#1c1917" stroke="#c2553a" strokeWidth="1.5" />
        <text x="45" y="65" textAnchor="middle" fill="#e7e5e4" fontSize="11" fontFamily="system-ui">Input</text>
        <line x1="80" y1="60" x2="110" y2="60" stroke="#78716c" strokeWidth="1" markerEnd="url(#arrow)" />
        <rect x="110" y="40" width="80" height="40" rx="8" fill="#1c1917" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="150" y="65" textAnchor="middle" fill="#e7e5e4" fontSize="11" fontFamily="system-ui">Encoder</text>
        <line x1="190" y1="60" x2="220" y2="60" stroke="#78716c" strokeWidth="1" markerEnd="url(#arrow)" />
        <rect x="220" y="40" width="80" height="40" rx="8" fill="#1c1917" stroke="#6fb38f" strokeWidth="1.5" />
        <text x="260" y="65" textAnchor="middle" fill="#e7e5e4" fontSize="11" fontFamily="system-ui">Decoder</text>
        <line x1="300" y1="60" x2="330" y2="60" stroke="#78716c" strokeWidth="1" markerEnd="url(#arrow)" />
        <rect x="330" y="40" width="60" height="40" rx="8" fill="#1c1917" stroke="#a78bfa" strokeWidth="1.5" />
        <text x="360" y="65" textAnchor="middle" fill="#e7e5e4" fontSize="11" fontFamily="system-ui">Output</text>
      </svg>
    </div>
  );
}
