import React from 'react';

export function ProseDemo() {
  return (
    <div className="text-sm text-zinc-300 leading-relaxed space-y-2">
      <p>This is <strong className="text-zinc-100">rich prose</strong> with <em>italic text</em>, <code className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-cyan-300 text-xs">inline code</code>, and <a href="#" className="text-amber-400 underline">hyperlinks</a>.</p>
      <p>It supports multiple paragraphs, blockquotes, and inline math like <span className="text-amber-300">E = mc²</span>.</p>
      <blockquote className="border-l-2 border-clay-400/40 pl-3 italic text-zinc-400">
        "The best way to learn is to teach." — Frank Oppenheimer
      </blockquote>
    </div>
  );
}
