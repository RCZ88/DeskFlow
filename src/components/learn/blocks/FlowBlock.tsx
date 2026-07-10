import React, { useEffect, useRef, useState } from 'react';
import type { FlowBlock as FlowBlockType } from '../../../shared/learn/types';
import { ZoomPan } from './ZoomPan';

interface Props {
  block: FlowBlockType;
  onAsk?: (blockId: string, question: string) => void;
}

function edgesToMermaid(block: FlowBlockType): string {
  if (block.edges && block.edges.length > 0) {
    if (block.variant === 'sankey') {
      const lines = block.edges.map((e) => `${JSON.stringify(e.from)} -->|${e.value}| ${JSON.stringify(e.to)}`);
      return `sankey-beta\n${lines.join('\n')}`;
    }
    const lines = block.edges.map((e) => `${JSON.stringify(e.from)}[${e.from}] --> ${JSON.stringify(e.to)}[${e.to}]`);
    return `flowchart LR\n${lines.join('\n')}`;
  }
  return block.spec;
}

export function FlowBlock({ block, onAsk }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const mermaidSrc = edgesToMermaid(block);

    import('mermaid').then(async (mermaid) => {
      mermaid.default.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: false, htmlLabels: true },
        sequence: { useMaxWidth: false },
      });

      try {
        const { svg } = await mermaid.default.render(`flow-${block.id}`, mermaidSrc);
        if (mounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.removeAttribute('height');
            svgEl.removeAttribute('width');
            svgEl.style.removeProperty('max-width');
            svgEl.style.width = '100%';
            svgEl.style.height = 'auto';
            svgEl.style.maxWidth = 'none';
            svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(`Flow render error: ${err.message}`);
          setLoading(false);
        }
      }
    });

    return () => { mounted = false; };
  }, [block.id, block.spec, block.edges, block.variant]);

  return (
    <div className="my-6 py-4 px-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40 group relative" data-block-id={block.id}>
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
      {!error && (
        <ZoomPan minH={220}>
          <div ref={containerRef} className={loading ? 'hidden' : ''} />
        </ZoomPan>
      )}
      {block.caption && (
        <div className="mt-2 text-sm text-zinc-500 italic text-center">{block.caption}</div>
      )}
      {onAsk && (
        <button
          onClick={() => onAsk(block.id, `Explain this ${block.variant} diagram`)}
          className="absolute -right-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 text-xs"
          title="Ask about this"
        >
          💡
        </button>
      )}
    </div>
  );
}
