import React, { useState } from 'react';
import type { LayerBlock, LdocBlock } from '../../../shared/learn/types';
import { BlockRenderer } from './BlockRenderer';

interface Props {
  block: LayerBlock;
  currentLevel?: string;
  onAsk?: (blockId: string, question: string) => void;
  onQuizSubmit?: (nodeId: string, blockId: string, response: string) => void;
  nodeId?: string;
}

const LEVEL_ORDER = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

export function LayerBlock({ block, currentLevel, onAsk, onQuizSubmit, nodeId }: Props) {
  const [revealed, setRevealed] = useState(false);

  // Auto-reveal if current level meets the reveal threshold
  const shouldAutoReveal = currentLevel
    ? LEVEL_ORDER.indexOf(currentLevel) >= LEVEL_ORDER.indexOf(block.reveal_at)
    : false;

  React.useEffect(() => {
    if (shouldAutoReveal && !revealed) {
      setRevealed(true);
    }
  }, [shouldAutoReveal, revealed]);

  const label = block.mode === 'deeper' ? 'Go deeper' : 'Need a refresher?';
  const icon = block.mode === 'deeper' ? '↗' : '↙';

  return (
    <div className="my-4" data-block-id={block.id}>
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-zinc-700/40 bg-zinc-800/20 hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 transition text-sm"
        >
          <span className="text-lg">{icon}</span>
          <span>{label} ({block.reveal_at}+)</span>
          {shouldAutoReveal && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
              Auto-unlocked
            </span>
          )}
        </button>
      ) : (
        <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/20 p-4">
          <div className="flex items-center gap-2 mb-3 text-xs text-zinc-500">
            <span>{icon}</span>
            <span>{label} · {block.reveal_at}</span>
            <button onClick={() => setRevealed(false)} className="ml-auto text-zinc-600 hover:text-zinc-400">
              Collapse
            </button>
          </div>
          <div className="space-y-2">
            {block.blocks.map((subBlock) => (
              <BlockRenderer
                key={subBlock.id}
                block={subBlock}
                onAsk={onAsk}
                onQuizSubmit={onQuizSubmit}
                currentLevel={currentLevel}
                nodeId={nodeId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
