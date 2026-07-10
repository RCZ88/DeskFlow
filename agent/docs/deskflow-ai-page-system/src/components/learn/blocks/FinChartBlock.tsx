import React, { useEffect, useRef, useState } from 'react';
import type { FinChartBlock as FinChartBlockType } from '../../../shared/learn/types';

interface Props {
  block: FinChartBlockType;
  onAsk?: (blockId: string, question: string) => void;
}

export function FinChartBlock({ block, onAsk }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    let data: Record<string, unknown>[];
    try {
      const parsed = block.parsed ?? JSON.parse(block.spec);
      data = (parsed.data ?? parsed) as Record<string, unknown>[];
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data series found');
      }
    } catch (e: any) {
      if (mounted) {
        setError(`Invalid chart data: ${e.message}`);
        setLoading(false);
      }
      return;
    }

    import('lightweight-charts').then((lwc) => {
      if (!mounted || !containerRef.current) return;

      const chart = lwc.createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { color: 'transparent' },
          textColor: '#a1a1aa',
        },
        grid: {
          vertLines: { color: '#27272a' },
          horzLines: { color: '#27272a' },
        },
        crosshair: {
          mode: lwc.CrosshairMode.Normal,
        },
        timeScale: {
          borderColor: '#3f3f46',
        },
      });

      const hasOhlc = data[0] && 'open' in data[0] && 'high' in data[0] && 'low' in data[0] && 'close' in data[0];
      if (hasOhlc) {
        chart.addCandlestickSeries({
          data: data as any,
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
      } else {
        chart.addAreaSeries({
          data: data as any,
          lineColor: '#d96846',
          topColor: 'rgba(217, 104, 70, 0.3)',
          bottomColor: 'rgba(217, 104, 70, 0.01)',
        });
      }

      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);

      setLoading(false);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }).catch((err: any) => {
      if (mounted) {
        setError(`Chart error: ${err.message}`);
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [block.id, block.spec, block.parsed]);

  return (
    <div className="my-6 py-4 px-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40 group relative" data-block-id={block.id}>
      {loading && (
        <div className="h-48 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-clay-400 rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-red-400 text-sm">
          <div>{error}</div>
          <pre className="mt-2 text-xs bg-zinc-900/50 p-2 rounded overflow-x-auto">{block.spec}</pre>
        </div>
      )}
      <div ref={containerRef} className={loading ? 'hidden' : 'w-full'} />
      {block.caption && (
        <div className="mt-2 text-sm text-zinc-500 italic text-center">{block.caption}</div>
      )}
      {onAsk && (
        <button
          onClick={() => onAsk(block.id, `Analyze this financial chart`)}
          className="absolute -right-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 text-xs"
          title="Ask about this"
        >
          💡
        </button>
      )}
    </div>
  );
}
