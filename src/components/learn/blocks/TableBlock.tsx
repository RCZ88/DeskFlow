import React, { useEffect, useRef, useState } from 'react';
import type { TableBlock as TableBlockType } from '../../../shared/learn/types';

interface Props {
  block: TableBlockType;
  onAsk?: (blockId: string, question: string) => void;
}

export function TableBlock({ block, onAsk }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    import('tabulator-tables').then((Tabulator) => {
      if (!mounted || !containerRef.current) return;
      containerRef.current.innerHTML = '';
      const Tab = Tabulator.Tabulator || Tabulator.default || (Tabulator as any);
      new Tab(containerRef.current, {
        data: block.rows,
        columns: block.columns.map((c) => ({
          title: c.title,
          field: c.field,
        })),
        layout: 'fitColumns',
        theme: 'dark',
        ...block.options,
      });
      setLoading(false);
    }).catch((err: any) => {
      if (mounted) {
        setError(`Table error: ${err.message}`);
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [block.id, block.rows, block.columns, block.options]);

  return (
    <div className="my-6 py-4 px-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40 group relative" data-block-id={block.id}>
      {loading && (
        <div className="h-32 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-clay-400 rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}
      <div ref={containerRef} className={loading ? 'hidden' : ''} />
      {block.caption && (
        <div className="mt-2 text-sm text-zinc-500 italic text-center">{block.caption}</div>
      )}
      {onAsk && (
        <button
          onClick={() => onAsk(block.id, `Look up data in this table`)}
          className="absolute -right-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 text-xs"
          title="Ask about this"
        >
          💡
        </button>
      )}
    </div>
  );
}
