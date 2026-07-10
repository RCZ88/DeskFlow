import React, { useRef, useState, useCallback } from 'react';
import { Plus, Minus, Maximize2, Scan } from 'lucide-react';

export function ZoomPan({ children, minH = 220 }: { children: React.ReactNode; minH?: number }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [full, setFull] = useState(false);
  const drag = useRef<{ startX: number; startY: number; tx: number; ty: number; dragging: boolean } | null>(null);
  const DRAG_THRESHOLD = 5;
  const clamp = (v: number) => Math.min(4, Math.max(0.25, v));

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => clamp(s * (e.deltaY < 0 ? 1.1 : 0.9)));
  }, []);

  const reset = () => { setScale(1); setTx(0); setTy(0); };

  return (
    <div className={full ? 'fixed inset-4 z-50 bg-zinc-900 rounded-xl border border-zinc-700 flex flex-col' : 'relative'}>
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button onClick={() => setScale((s) => clamp(s * 1.2))} className="p-1 rounded bg-zinc-800/80 text-zinc-300 hover:text-white transition" title="Zoom in">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setScale((s) => clamp(s / 1.2))} className="p-1 rounded bg-zinc-800/80 text-zinc-300 hover:text-white transition" title="Zoom out">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button onClick={reset} className="p-1 rounded bg-zinc-800/80 text-zinc-300 hover:text-white transition" title="Fit">
          <Scan className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setFull((f) => !f)} className="p-1 rounded bg-zinc-800/80 text-zinc-300 hover:text-white transition" title={full ? 'Exit fullscreen' : 'Fullscreen'}>
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div
        className="overflow-hidden cursor-grab active:cursor-grabbing flex-1"
        style={{ minHeight: full ? undefined : minH }}
        onWheel={onWheel}
        onMouseDown={(e) => { drag.current = { startX: e.clientX, startY: e.clientY, tx, ty, dragging: false }; }}
        onMouseMove={(e) => {
          if (drag.current) {
            const dx = e.clientX - drag.current.startX;
            const dy = e.clientY - drag.current.startY;
            if (!drag.current.dragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
              drag.current.dragging = true;
            }
            if (drag.current.dragging) {
              setTx(drag.current.tx + dx);
              setTy(drag.current.ty + dy);
            }
          }
        }}
        onMouseUp={() => { drag.current = null; }}
        onMouseLeave={() => { drag.current = null; }}
      >
        <div style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: 'center top', transition: drag.current ? 'none' : 'transform 0.08s' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
