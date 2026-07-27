import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Cpu, HardDrive, Gauge, Server, Terminal, MonitorDot } from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkspaceCard, WorkspaceSection } from './_ds/containers';
import { listContainer, riseItem, DUR, EASE_OUT } from './_ds/motion';
import { Skeleton } from './_ds/primitives';

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

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>; label: string;
  value: string; sub?: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };
  const cls = colorMap[color] || colorMap.cyan;

  return (
    <motion.div variants={riseItem}>
      <WorkspaceCard variant="inset" className="h-full">
        <div className="flex items-center gap-2 mb-2">
          <div className={`grid w-6 h-6 place-items-center rounded-md ${cls}`}>
            <Icon className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-lg font-semibold text-zinc-100 tabular-nums">{value}</p>
        {sub && <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{sub}</p>}
      </WorkspaceCard>
    </motion.div>
  );
}

function TerminalRow({ id, stats }: { id: string; stats: TerminalResourceStats }) {
  const formatMem = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
  const laggy = (stats.eventLoopLagMs || 0) > 100;

  return (
    <motion.div variants={riseItem} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-950/50 hover:bg-zinc-900/50 transition-colors duration-150">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${stats.alive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
        <span className="text-[11px] font-medium text-zinc-300 truncate max-w-[140px]">{id}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[10px] text-cyan-300 tabular-nums font-mono">{stats.cpuPct?.toFixed(1)}%</span>
        <span className="text-[10px] text-emerald-300 tabular-nums font-mono">{formatMem(stats.memMB || 0)}</span>
        <span className={`text-[10px] tabular-nums font-mono ${laggy ? 'text-rose-300' : 'text-zinc-500'}`}>
          {stats.eventLoopLagMs || 0}ms
        </span>
      </div>
    </motion.div>
  );
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
  const aliveCount = terminalEntries.filter(([, s]) => s.alive).length;

  return (
    <div className="flex flex-col gap-4 p-3 min-h-0 overflow-y-auto ws-scroll">
      <WorkspaceSection title="System Performance" icon={Activity} accent="purple">
        {systemStats ? (
          <motion.div
            className="grid grid-cols-2 gap-2"
            variants={listContainer} initial="hidden" animate="show"
          >
            <StatCard icon={Cpu} label="CPU" value={`${systemStats.cpuCount} cores`} sub={systemStats.cpuModel} color="cyan" />
            <StatCard icon={HardDrive} label="Memory" value={formatMem(systemStats.usedMemMB)} sub={`${Math.round(systemStats.memPct * 100)}% of ${formatMem(systemStats.totalMemMB)}`} color="emerald" />
            <StatCard icon={MonitorDot} label="GPU" value={systemStats.gpuName || 'Unknown'} sub={systemStats.gpuMemMB ? `${systemStats.gpuMemMB} MB VRAM` : 'Detection unavailable'} color="blue" />
            <StatCard icon={Gauge} label="App Load" value={`${totalCpu.toFixed(1)}%`} sub={`${aliveCount}/${terminalEntries.length} terminals · ${formatMem(totalMem)}`} color="rose" />
            <div className="col-span-2">
              <StatCard icon={Server} label="Platform" value={systemStats.platform} sub={`${systemStats.arch} · Up ${formatUptime(systemStats.uptime)}`} color="amber" />
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}
      </WorkspaceSection>

      <WorkspaceSection title="Per-Terminal Resources" icon={Terminal} accent="purple">
        {terminalEntries.length === 0 ? (
          <p className="text-[11px] text-zinc-500 py-6 text-center">No terminal resource data available</p>
        ) : (
          <motion.div
            className="flex flex-col gap-1"
            variants={listContainer} initial="hidden" animate="show"
          >
            {terminalEntries.map(([id, stats]) => (
              <TerminalRow key={id} id={id} stats={stats} />
            ))}
          </motion.div>
        )}
      </WorkspaceSection>
    </div>
  );
}
