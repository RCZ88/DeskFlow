import { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface SplitPanelProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  storageKey?: string;
  className?: string;
}

export function ResizablePanel({
  left,
  right,
  defaultRatio = 55,
  minRatio = 30,
  maxRatio = 80,
  storageKey = 'resume-split-ratio',
  className = '',
}: SplitPanelProps) {
  const [ratio, setRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? parseFloat(saved) : defaultRatio;
      if (Number.isNaN(parsed)) return defaultRatio;
      return Math.max(minRatio, Math.min(maxRatio, parsed));
    } catch {
      return defaultRatio;
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startRatioRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startRatioRef.current = ratio;
  }, [ratio]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    if (containerWidth <= 0) return;
    const deltaPct = ((e.clientX - startXRef.current) / containerWidth) * 100;
    const newRatio = Math.max(minRatio, Math.min(maxRatio, startRatioRef.current + deltaPct));
    setRatio(newRatio);
  }, [isDragging, minRatio, maxRatio]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      localStorage.setItem(storageKey, String(ratio));
    } catch { /* ignore */ }
  }, [isDragging, ratio, storageKey]);

  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={`flex h-full ${className}`}>
      <div
        style={{ flexBasis: `${ratio}%` }}
        className="shrink-0 grow-0 min-w-0 h-full overflow-y-auto scrollbar-thin"
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(ratio)}
        aria-valuemin={minRatio}
        aria-valuemax={maxRatio}
        onMouseDown={handleMouseDown}
        onDoubleClick={() => setRatio(defaultRatio)}
        title="Drag to resize · Double-click to reset"
        className={`w-1.5 shrink-0 grow-0 cursor-col-resize flex items-center justify-center group relative transition-colors duration-150 ${
          isDragging
            ? 'bg-[var(--page-accent)]'
            : 'bg-zinc-700/50 hover:bg-zinc-500'
        }`}
      >
        <div className="absolute inset-y-0 -left-[3px] -right-[3px]" />
        <GripVertical
          className={`relative w-3 h-3 transition-colors duration-150 ${
            isDragging
              ? 'text-white'
              : 'text-zinc-500 group-hover:text-zinc-300'
          }`}
        />
      </div>

      <div
        style={{ flexBasis: `${100 - ratio}%` }}
        className="shrink-0 grow-0 min-w-0 h-full overflow-y-auto scrollbar-thin"
      >
        {right}
      </div>
    </div>
  );
}
