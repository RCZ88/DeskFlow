import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Ban, RefreshCw, Maximize2 } from 'lucide-react';
import type { WidgetBlock } from '../../shared/learn/types';

interface Props {
  block: WidgetBlock;
}

const TEMPLATE_WIDGETS: Record<string, { label: string; generateHtml: (params: Record<string, unknown>) => string }> = {
  'graph-explorer': {
    label: 'Graph Explorer',
    generateHtml: (params) => `<!DOCTYPE html><html><body style="margin:0;background:#18181b;color:#e4e4e7;font-family:system-ui;padding:16px">
<h2 style="font-size:14px;margin:0 0 8px">Graph Explorer</h2>
<div id="viz" style="width:100%;height:200px;border:1px solid #3f3f46;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#52525b">
  Interactive graph: ${JSON.stringify(params)}
</div>
<p style="font-size:11px;color:#52525b;margin:8px 0 0">Drag nodes to explore</p>
</body></html>`,
  },
  'function-plotter': {
    label: 'Function Plotter',
    generateHtml: (params) => `<!DOCTYPE html><html><body style="margin:0;background:#18181b;color:#e4e4e7;font-family:system-ui;padding:16px">
<h2 style="font-size:14px;margin:0 0 8px">Function Plotter</h2>
<canvas id="plot" style="width:100%;height:200px;border:1px solid #3f3f46;border-radius:8px"></canvas>
<script>
  const canvas = document.getElementById('plot');const ctx=canvas.getContext('2d');
  canvas.width=canvas.clientWidth;canvas.height=canvas.clientHeight;
  const w=canvas.width,h=canvas.height;
  ctx.strokeStyle='#6366f1';ctx.lineWidth=2;ctx.beginPath();
  for(let x=0;x<=w;x++){const t=x/w*4-2;const y=h/2-h/4*Math.sin(t*Math.PI);ctx.lineTo(x,y)}
  ctx.stroke();
  ctx.fillStyle='#52525b';ctx.font='11px system-ui';ctx.fillText('y = sin(x)',8,16);
</script>
</body></html>`,
  },
  'vector-field': {
    label: 'Vector Field',
    generateHtml: (params) => `<!DOCTYPE html><html><body style="margin:0;background:#18181b;color:#e4e4e7;font-family:system-ui;padding:16px">
<h2 style="font-size:14px;margin:0 0 8px">Vector Field</h2>
<div style="width:100%;height:200px;border:1px solid #3f3f46;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#52525b">
  Vector field visualization (${(params as any).dimensions || '2D'})
</div>
</body></html>`,
  },
  'matrix-playground': {
    label: 'Matrix Playground',
    generateHtml: (params) => `<!DOCTYPE html><html><body style="margin:0;background:#18181b;color:#e4e4e7;font-family:system-ui;padding:16px">
<h2 style="font-size:14px;margin:0 0 8px">Matrix Playground</h2>
<div style="display:grid;grid-template-columns:repeat(${(params as any).cols || 3},40px);gap:4px;justify-content:center">
  ${Array.from({length: (params as any).rows || 3 * (params as any).cols || 3}, (_, i) => `<input value="${Math.round(Math.random()*10)}" style="width:40px;height:40px;text-align:center;background:#27272a;border:1px solid #3f3f46;border-radius:6px;color:#e4e4e7;font-size:12px"/>`).join('')}
</div>
</body></html>`,
  },
};

export function WidgetHost({ block }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isTemplate = block.kind === 'template' && block.template;

  const widgetDef = isTemplate ? TEMPLATE_WIDGETS[block.template!] : null;
  const hasCustomHtml = block.kind === 'html' && block.html;
  const denied = !widgetDef && !hasCustomHtml;

  const htmlContent = useCallback(() => {
    if (widgetDef) return widgetDef.generateHtml(block.params || {});
    if (hasCustomHtml) return block.html!;
    return '<html><body style="margin:0;background:#18181b;color:#52525b;display:flex;align-items:center;justify-content:center;font-size:12px;font-family:system-ui">Widget not available</body></html>';
  }, [widgetDef, hasCustomHtml, block]);

  useEffect(() => {
    setLoaded(false);
    setError(null);
    if (iframeRef.current && (widgetDef || hasCustomHtml)) {
      const blob = new Blob([htmlContent()], { type: 'text/html' });
      iframeRef.current.src = URL.createObjectURL(blob) + '#widget';
      setLoaded(true);
    }
  }, [block.id, block.template, block.html]);

  return (
    <div className="my-4">
      <div className={`rounded-xl border border-zinc-700/40 overflow-hidden transition-all ${expanded ? 'fixed inset-4 z-40 bg-zinc-900' : 'bg-zinc-800/20'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-800/30">
          <span className="text-xs font-medium text-zinc-400">
            {widgetDef?.label || 'Widget'}
          </span>
          <div className="flex items-center gap-1">
            {error && (
              <button
                onClick={() => { setError(null); setLoaded(false); }}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition"
                aria-label="Reload widget"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition"
              aria-label={expanded ? 'Minimize' : 'Maximize'}
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Content */}
        {denied ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Ban className="w-6 h-6 mb-2 opacity-50" />
            <p className="text-xs font-medium">Widget not available</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              {block.kind === 'template' ? `Unknown template: ${block.template}` : 'No HTML content provided'}
            </p>
          </div>
        ) : (
          <>
            {!loaded && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              sandbox="allow-scripts"
              title={`Widget: ${widgetDef?.label || block.template || 'custom'}`}
              className={`w-full ${expanded ? 'h-full' : 'h-64'} border-0 bg-zinc-950/50 ${loaded ? '' : 'hidden'}`}
              onError={() => setError('Failed to load widget')}
            />
            {error && (
              <div className="flex items-center justify-center py-8 text-zinc-500">
                <p className="text-xs">{error}</p>
              </div>
            )}
          </>
        )}

        {/* Caption */}
        {block.caption && (
          <div className="px-4 py-1.5 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600">{block.caption}</p>
          </div>
        )}
      </div>
    </div>
  );
}
