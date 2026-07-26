import React, { useEffect, useRef, useState } from 'react';
import type { ChartBlock as ChartBlockType } from '../../../shared/learn/types';

interface Props {
  block: ChartBlockType;
  onAsk?: (blockId: string, question: string) => void;
}

export function ChartBlock({ block, onAsk }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    let spec: Record<string, unknown>;
    try {
      spec = block.parsed ?? JSON.parse(block.spec);
    } catch (e: any) {
      if (mounted) {
        setError(`Invalid chart spec: ${e.message}`);
        setLoading(false);
      }
      return;
    }

    import('vega-embed').then((vegaEmbed) => {
      if (!mounted) return;
      vegaEmbed.default(containerRef.current!, spec, {
        actions: false,
        renderer: 'svg',
        theme: 'dark',
        width: 'container',
      }).then(() => {
        if (mounted) {
          const svgEl = containerRef.current?.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.width = '100%';
            svgEl.style.height = 'auto';
          }
          setLoading(false);
        }
      }).catch((err: any) => {
        if (mounted) {
          setError(`Chart render error: ${err.message}`);
          setLoading(false);
        }
      });
    });

    return () => { mounted = false; };
  }, [block.id, block.spec, block.parsed]);

  return (
    <div className="my-6 py-4 px-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40 group relative min-h-[220px]" data-block-id={block.id}>
      {loading && (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-clay-400 rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-red-400 text-sm">
          <div>{error}</div>
          <pre className="mt-2 text-xs bg-zinc-900/50 p-2 rounded overflow-x-auto">{block.spec}</pre>
        </div>
      )}
      <div ref={containerRef} className={loading ? 'hidden' : ''} />
      {block.caption && (
        <div className="mt-2 text-sm text-zinc-500 italic text-center">{block.caption}</div>
      )}
      {onAsk && (
        <button
          onClick={() => onAsk(block.id, `Explain this chart`)}
          className="absolute -right-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 text-xs"
          title="Ask about this"
        >
          💡
        </button>
      )}
    </div>
  );
}
