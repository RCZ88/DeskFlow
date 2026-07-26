import { useState, useEffect } from 'react';

interface DesignSuiteStatusProps {
  className?: string;
}

export function DesignSuiteStatus({ className = '' }: DesignSuiteStatusProps) {
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastTime, setLastTime] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('deskflow-design-last-command');
      if (stored) {
        const parsed = JSON.parse(stored);
        setLastCommand(parsed.command);
        setLastTime(parsed.time);
      }
    } catch {}
  }, []);

  const formatTimeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  return (
    <div className={`flex items-center gap-3 px-3 py-1.5 text-[10px] font-mono ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-zinc-500">Design Suite</span>
        <span className="text-emerald-400">Online</span>
      </div>
      {lastCommand && lastTime && (
        <>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-500">
            Last: <span className="text-zinc-400">{lastCommand}</span> ({formatTimeAgo(lastTime)})
          </span>
        </>
      )}
      <span className="text-zinc-700">|</span>
      <span className="text-zinc-600">
        <kbd className="px-1 py-0.5 rounded bg-zinc-800/60 text-zinc-500 text-[9px]">⌘K</kbd> Commands
      </span>
    </div>
  );
}

export function logDesignCommand(command: string) {
  try {
    localStorage.setItem('deskflow-design-last-command', JSON.stringify({
      command,
      time: new Date().toISOString(),
    }));
  } catch {}
}
