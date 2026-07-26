import { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizablePanelProps {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  children: React.ReactNode;
  className?: string;
}

export function ResizablePanel({
  defaultWidth = 400,
  minWidth = 300,
  maxWidth = 800,
  storageKey = 'resume-preview-width',
  children,
  className = '',
}: ResizablePanelProps) {
  const [width, setWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const delta = startXRef.current - e.clientX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
    setWidth(newWidth);
  }, [isDragging, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      try {
        localStorage.setItem(storageKey, String(width));
      } catch { /* ignore */ }
    }
  }, [isDragging, width, storageKey]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
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
        style={{ width: `${width}px` }}
        className="shrink-0 overflow-y-auto scrollbar-thin"
      >
        {children}
      </div>

      {/* Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-1 shrink-0 cursor-col-resize flex items-center justify-center group transition-colors duration-150 ${
          isDragging
            ? 'bg-[var(--page-accent)]'
            : 'bg-zinc-700 hover:bg-zinc-500'
        }`}
      >
        <GripVertical
          className={`w-3 h-3 transition-colors duration-150 ${
            isDragging
              ? 'text-white'
              : 'text-zinc-500 group-hover:text-zinc-300'
          }`}
        />
      </div>
    </div>
  );
}
