import React from 'react';
import type { ProseBlock } from '../../../shared/learn/types';

interface Props {
  block: ProseBlock;
  onAsk?: (blockId: string, question: string) => void;
}

export function ProseBlock({ block, onAsk }: Props) {
  // Simple markdown rendering — bold, italic, code, links, headers
  const rendered = renderMarkdown(block.md);

  return (
    <div className="my-4 group relative" data-block-id={block.id}>
      <div
        className="text-[1.0625rem] leading-[1.7] text-zinc-200 max-w-[68ch] font-serif"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
      {/* Select-to-ask affordance */}
      {onAsk && (
        <button
          onClick={() => {
            const sel = window.getSelection()?.toString().trim();
            if (sel) onAsk(block.id, sel);
          }}
          className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 text-xs"
          title="Ask about this"
        >
          💡
        </button>
      )}
    </div>
  );
}

function renderMarkdown(md: string): string {
  return md
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-zinc-800/50 rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono text-zinc-300"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-800/60 rounded px-1 py-0.5 text-sm font-mono text-cyan-300">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-white mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-semibold text-white mt-4 mb-2">$1</h1>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}
