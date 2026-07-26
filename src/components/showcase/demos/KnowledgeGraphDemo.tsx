import React from 'react';

export function KnowledgeGraphDemo() {
  return (
    <div className="flex items-center justify-center py-2">
      <svg viewBox="0 0 200 150" className="w-full max-w-[220px]">
        <line x1="100" y1="75" x2="40" y2="30" stroke="#78716c" strokeWidth="1" />
        <line x1="100" y1="75" x2="160" y2="30" stroke="#78716c" strokeWidth="1" />
        <line x1="100" y1="75" x2="40" y2="120" stroke="#78716c" strokeWidth="1" />
        <line x1="100" y1="75" x2="160" y2="120" stroke="#78716c" strokeWidth="1" />
        <circle cx="100" cy="75" r="16" fill="#1c1917" stroke="#c2553a" strokeWidth="2" />
        <text x="100" y="79" textAnchor="middle" fill="#e7e5e4" fontSize="8" fontFamily="system-ui">Transformer</text>
        <circle cx="40" cy="30" r="12" fill="#1c1917" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="40" y="34" textAnchor="middle" fill="#e7e5e4" fontSize="7" fontFamily="system-ui">Attn</text>
        <circle cx="160" cy="30" r="12" fill="#1c1917" stroke="#6fb38f" strokeWidth="1.5" />
        <text x="160" y="34" textAnchor="middle" fill="#e7e5e4" fontSize="7" fontFamily="system-ui">FFN</text>
        <circle cx="40" cy="120" r="12" fill="#1c1917" stroke="#a78bfa" strokeWidth="1.5" />
        <text x="40" y="124" textAnchor="middle" fill="#e7e5e4" fontSize="7" fontFamily="system-ui">Norm</text>
        <circle cx="160" cy="120" r="12" fill="#1c1917" stroke="#23b5b5" strokeWidth="1.5" />
        <text x="160" y="124" textAnchor="middle" fill="#e7e5e4" fontSize="7" fontFamily="system-ui">Emb</text>
      </svg>
    </div>
  );
}
