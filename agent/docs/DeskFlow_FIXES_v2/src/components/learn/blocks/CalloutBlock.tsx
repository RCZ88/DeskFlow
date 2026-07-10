import React from 'react';
import type { CalloutBlock } from '../../../shared/learn/types';

interface Props {
  block: CalloutBlock;
  onAsk?: (blockId: string, question: string) => void;
}

const TONE_STYLES: Record<string, string> = {
  default: 'border-zinc-600/40 bg-zinc-800/30',
  info: 'border-blue-500/30 bg-blue-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  danger: 'border-red-500/30 bg-red-500/5',
  success: 'border-emerald-500/30 bg-emerald-500/5',
  red_bg: 'border-red-500/30 bg-red-500/10',
};

export function CalloutBlock({ block }: Props) {
  const toneStyle = TONE_STYLES[block.tone || 'default'] || TONE_STYLES.default;

  return (
    <div className={`my-4 p-4 rounded-xl border-l-4 ${toneStyle}`} data-block-id={block.id}>
      <div className="flex items-start gap-3">
        {block.icon && <span className="text-lg shrink-0">{block.icon}</span>}
        <div className="text-sm text-zinc-300 leading-relaxed">
          {block.md.split('\n').map((line, i) => {
            // Simple inline markdown
            let rendered = line
              .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>')
              .replace(/`([^`]+)`/g, '<code class="bg-zinc-800/60 rounded px-1 text-sm font-mono text-cyan-300">$1</code>');
            return <p key={i} dangerouslySetInnerHTML={{ __html: rendered }} className={i > 0 ? 'mt-1' : ''} />;
          })}
        </div>
      </div>
    </div>
  );
}
