import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
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

export const CalloutBlock = React.memo(function CalloutBlock({ block }: Props) {
  const toneStyle = TONE_STYLES[block.tone || 'default'] || TONE_STYLES.default;

  const rendered = useMemo(() => {
    const raw = block.md
      .split('\n')
      .map(line => {
        let renderedLine = line
          .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code class="bg-zinc-800/60 rounded px-1 text-sm font-mono text-cyan-300">$1</code>');
        return renderedLine;
      })
      .join('<br/>');
    return DOMPurify.sanitize(raw);
  }, [block.md]);

  return (
    <div
      className={`my-4 p-4 rounded-xl border-l-4 ${toneStyle} select-text callout-block`}
      style={{ lineHeight: '1.7' }}
      data-block-id={block.id}
    >
      <div className="flex items-start gap-3">
        {block.icon && <span className="text-lg shrink-0">{block.icon}</span>}
        <div
          className="text-sm text-zinc-300"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      </div>
    </div>
  );
}, (prev, next) => prev.block.id === next.block.id && prev.block.md === next.block.md);
