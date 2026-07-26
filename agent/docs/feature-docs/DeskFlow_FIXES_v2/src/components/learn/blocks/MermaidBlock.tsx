import React, { useEffect, useRef, useState } from 'react';
import type { MermaidBlock } from '../../../shared/learn/types';

interface Props {
  block: MermaidBlock;
  onAsk?: (blockId: string, question: string) => void;
}

export function MermaidBlock({ block, onAsk }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    import('mermaid').then(async (mermaid) => {
      mermaid.default.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
      });

      try {
        const { svg } = await mermaid.default.render(`mermaid-${block.id}`, block.src);
        if (mounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    });

    return () => { mounted = false; };
  }, [block.src, block.id]);

  return (
    <div className="my-6 py-4 px-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40 group relative" data-block-id={block.id}>
      {loading && (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-red-400 text-sm">
          <div>Mermaid render error</div>
          <pre className="mt-2 text-xs bg-zinc-900/50 p-2 rounded overflow-x-auto">{block.src}</pre>
        </div>
      )}
      <div ref={containerRef} className="overflow-x-auto" />
      {block.caption && (
        <div className="mt-2 text-sm text-zinc-500 italic text-center">{block.caption}</div>
      )}
      {onAsk && (
        <button
          onClick={() => onAsk(block.id, `Explain this diagram`)}
          className="absolute -right-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 text-xs"
          title="Ask about this"
        >
          💡
        </button>
      )}
    </div>
  );
}
