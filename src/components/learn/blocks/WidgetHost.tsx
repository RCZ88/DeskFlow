import React, { useRef, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  block: {
    id: string;
    kind?: string;
    html?: string;
    caption?: string;
  };
}

export function WidgetHost({ block }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(300);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    // Reset any stale error state when the widget content changes
    setError(null);
  }, [block.html, block.id]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'widget:height' && typeof e.data.height === 'number') {
        setHeight(Math.min(Math.max(e.data.height, 100), 800));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!block.html) {
    return (
      <div className="my-6 py-8 px-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40 text-center">
        <p className="text-sm text-zinc-500">No widget content</p>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-xl bg-zinc-800/30 border border-zinc-700/40 overflow-hidden">
      {block.caption && (
        <div className="px-4 py-2 border-b border-zinc-700/40">
          <p className="text-sm text-zinc-500 italic text-center">{block.caption}</p>
        </div>
      )}
      {error ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Widget failed to load: {error}</span>
          <button
            onClick={() => { setError(null); setRetry((r) => r + 1); }}
            className="ml-2 text-xs font-medium text-clay-400 hover:text-clay-300 transition"
          >
            ↻ Retry
          </button>
        </div>
      ) : (
        <iframe
          key={`${block.id}-${retry}`}
          ref={iframeRef}
          srcDoc={block.html}
          className="w-full border-none"
          style={{ height: `${height}px`, background: '#1c1917' }}
          sandbox="allow-scripts"
          onError={() => setError('Failed to render')}
          title={block.caption || 'Widget'}
        />
      )}
    </div>
  );
}
