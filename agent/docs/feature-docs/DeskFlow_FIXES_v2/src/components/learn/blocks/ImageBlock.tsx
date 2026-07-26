import React from 'react';
import type { ImageBlock } from '../../../shared/learn/types';

interface Props {
  block: ImageBlock;
  onAsk?: (blockId: string, question: string) => void;
}

export function ImageBlock({ block, onAsk }: Props) {
  const [error, setError] = React.useState(false);

  return (
    <figure className="my-6 group relative" data-block-id={block.id}>
      <div className="rounded-xl overflow-hidden border border-zinc-700/40 bg-zinc-800/30">
        {error && block.fallback_url ? (
          <img
            src={block.fallback_url}
            alt={block.alt}
            className="w-full max-h-[400px] object-contain"
            onError={() => setError(true)}
          />
        ) : error ? (
          <div className="h-40 flex items-center justify-center text-zinc-500 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">🖼️</div>
              <div>Image failed to load</div>
              <div className="text-xs mt-1 text-zinc-600">{block.alt}</div>
            </div>
          </div>
        ) : (
          <img
            src={block.url}
            alt={block.alt}
            className="w-full max-h-[400px] object-contain"
            onError={() => setError(true)}
          />
        )}
      </div>
      {block.caption && (
        <figcaption className="mt-2 text-sm text-zinc-500 italic text-center">{block.caption}</figcaption>
      )}
      <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-zinc-600">
        <span>Source: {block.source}</span>
        <span>·</span>
        <span>{block.license}</span>
      </div>
      {onAsk && (
        <button
          onClick={() => onAsk(block.id, `Describe this image`)}
          className="absolute -right-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 text-xs"
          title="Ask about this"
        >
          💡
        </button>
      )}
    </figure>
  );
}
