import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Cpu, HardDrive, Gauge, Server, Terminal, MonitorDot } from 'lucide-react';

interface SystemStats {
  totalMemMB: number;
  freeMemMB: number;
  usedMemMB: number;
  memPct: number;
  cpuCount: number;
  cpuModel: string;
  uptime: number;
  platform: string;
  arch: string;
  gpuName?: string;
  gpuMemMB?: number;
}

interface TerminalResourceStats {
  pid: number | null;
  alive: boolean;
  memMB: number;
  cpuPct: number;
  eventLoopLagMs: number;
  ts: number;
}

export default function PerformanceMetricsPanel({ projectId, projectPath }: { projectId?: string; projectPath?: string }) {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [terminalStats, setTerminalStats] = useState<Record<string, TerminalResourceStats>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchSystemStats = useCallback(async () => {
    if (!window.deskflowAPI?.getSystemStats) return;
    const result = await (window.deskflowAPI as any).getSystemStats();
    if (result?.success && result.data) {
      setSystemStats(result.data);
    }
  }, []);

  useEffect(() => {
    fetchSystemStats();
    intervalRef.current = setInterval(fetchSystemStats, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchSystemStats]);

  useEffect(() => {
    if (!window.deskflowAPI?.onResourceStats) return;
    const unsub = window.deskflowAPI.onResourceStats((stats: any) => {
      setTerminalStats(stats || {});
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatMem = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  const terminalEntries = Object.entries(terminalStats);
  const totalCpu = terminalEntries.reduce((sum, [, s]) => sum + (s.cpuPct || 0), 0);
  const totalMem = terminalEntries.reduce((sum, [, s]) => sum + (s.memMB || 0), 0);
  const avgLag = terminalEntries.length > 0
    ? terminalEntries.reduce((sum, [, s]) => sum + (s.eventLoopLagMs || 0), 0) / terminalEntries.length
    : 0;
  const aliveCount = terminalEntries.filter(([, s]) => s.alive).length;

  return (
    <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-semibold text-zinc-100">System Performance</h2>
      </div>

      {systemStats && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">CPU</span>
            </div>
            <p className="text-lg font-semibold text-zinc-100">{systemStats.cpuCount} cores</p>
            <p className="text-[10px] text-zinc-500 truncate">{systemStats.cpuModel}</p>
          </div>

          <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <HardDrive className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Memory</span>
            </div>
            <p className="text-lg font-semibold text-zinc-100">{formatMem(systemStats.usedMemMB)}</p>
            <p className="text-[10px] text-zinc-500">{Math.round(systemStats.memPct * 100)}% of {formatMem(systemStats.totalMemMB)}</p>
          </div>

          <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <MonitorDot className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">GPU</span>
            </div>
            <p className="text-lg font-semibold text-zinc-100 truncate">{systemStats.gpuName || 'Unknown'}</p>
            <p className="text-[10px] text-zinc-500">{systemStats.gpuMemMB ? `${systemStats.gpuMemMB} MB VRAM` : 'Detection unavailable'}</p>
          </div>

          <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Gauge className="w-3 h-3 text-rose-400" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">App Load</span>
            </div>
            <p className="text-lg font-semibold text-zinc-100">{totalCpu.toFixed(1)}%</p>
            <p className="text-[10px] text-zinc-500">{aliveCount}/{terminalEntries.length} terminals · {formatMem(totalMem)}</p>
          </div>

          <div className="col-span-2 rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Server className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Platform</span>
            </div>
            <p className="text-lg font-semibold text-zinc-100">{systemStats.platform}</p>
            <p className="text-[10px] text-zinc-500">{systemStats.arch} · Up {formatUptime(systemStats.uptime)}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Terminal className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Per-Terminal Resources</span>
        </div>
        {terminalEntries.length === 0 && (
          <p className="text-xs text-zinc-500 py-4 text-center">No terminal resource data available</p>
        )}
        <div className="flex flex-col gap-1.5">
          {terminalEntries.map(([id, stats]) => (
            <div key={id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-950/50">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${stats.alive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                <span className="text-[11px] font-medium text-zinc-300 truncate max-w-[140px]">{id}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] text-cyan-300 tabular-nums">{stats.cpuPct?.toFixed(1)}% CPU</span>
                <span className="text-[10px] text-emerald-300 tabular-nums">{formatMem(stats.memMB || 0)}</span>
                <span className={`text-[10px] tabular-nums ${(stats.eventLoopLagMs || 0) > 100 ? 'text-rose-300' : 'text-zinc-500'}`}>{stats.eventLoopLagMs || 0}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
