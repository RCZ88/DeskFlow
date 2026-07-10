import { X, ArrowRight } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';

interface RoutingToastProps {
  sessionName: string;
  onCancel: () => void;
  onConfirm: () => void;
  autoConfirmMs?: number;
}

export function RoutingToast({
  sessionName,
  onCancel,
  onConfirm,
  autoConfirmMs = 3000,
}: RoutingToastProps) {
  const [timeLeft, setTimeLeft] = useState(autoConfirmMs / 1000);
  const confirmedRef = useRef(false);

  const doConfirm = useCallback(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm();
  }, [onConfirm]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.2) {
          clearInterval(interval);
          doConfirm();
          return 0;
        }
        return +(prev - 0.1).toFixed(1);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [doConfirm]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-800/95 border border-cyan-500/20 rounded-lg backdrop-blur-sm">
        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="text-xs text-zinc-300">
          Routing to <span className="text-cyan-400 font-medium">{sessionName}</span>
        </span>
        <span className="text-[10px] text-zinc-600">{timeLeft.toFixed(1)}s</span>
        <button
          onClick={() => { confirmedRef.current = true; onCancel(); }}
          className="text-zinc-500 hover:text-zinc-300 transition-colors ml-1"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
