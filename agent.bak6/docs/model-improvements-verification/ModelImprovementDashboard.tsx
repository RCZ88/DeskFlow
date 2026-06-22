/**
 * ModelImprovementDashboard.tsx
 *
 * Drop into: src/components/ModelImprovementDashboard.tsx
 *
 * Requires these IPC channels (add to src/main.ts + src/preload.ts):
 *   get-model-improvement-stats  →  { messageCounts, reinjectionCount, threshold, actionsAttempted, actionsFailed }
 *   set-reinject-threshold        →  { threshold: number }
 *   set-model-debug               →  { enabled: boolean }
 *   read-actions-error-log        →  { entries: string[], exists: boolean }
 *
 * Usage: import ModelImprovementDashboard from './ModelImprovementDashboard';
 *        <ModelImprovementDashboard projectPath="/path/to/project" />
 *
 * Design: Developer tool aesthetic per ui-ux-pro-max skill.
 *   Base: zinc-900/950  |  Surface: zinc-800  |  Border: zinc-700
 *   Accent: emerald-400 (single vibrant accent)
 *   Text: zinc-400 (secondary) / zinc-300 (primary) / zinc-500 (muted)
 *   Code/data: JetBrains Mono  |  UI: Inter
 *   Motion: fast (100-150ms), ease-out only
 *   Spacing: 4-8px grid, tight padding inside data, generous between sections
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  Layers,
  RefreshCw,
  Shield,
  Zap,
  BarChart2,
  Terminal,
  Copy,
  Play,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  FileText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelStats {
  messageCounts: Record<string, number>;
  reinjectionCount: number;
  threshold: number;
  actionsAttempted: number;
  actionsFailed: number;
}

interface ActionLogEntry {
  entries: string[];
  exists: boolean;
}

interface LayerDef {
  id: number;
  name: string;
  desc: string;
  tokens: number;
  maxTokens: number;
  forced: boolean;
  color: string;
}

interface TierProfile {
  label: string;
  budget: number;
  color: string;
  bgColor: string;
  borderColor: string;
  layers: LayerDef[];
}

type ModelTier = "top" | "mid" | "low";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_PROFILES: Record<ModelTier, TierProfile> = {
  top: {
    label: "Top", budget: 10000,
    color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30",
    layers: [
      { id: 0, name: "IDENTITY & CONSTRAINTS", desc: "RULES_COMPACT.md", tokens: 280, maxTokens: 300, forced: true, color: "#10b981" },
      { id: 1, name: "CURRENT STATE", desc: "state.md snapshot", tokens: 1800, maxTokens: 2000, forced: true, color: "#06b6d4" },
      { id: 2, name: "PATTERNS", desc: "patterns.md", tokens: 1200, maxTokens: 1500, forced: true, color: "#8b5cf6" },
      { id: 3, name: "ACTIVE PROBLEM", desc: "Problem + checklist", tokens: 900, maxTokens: 1200, forced: false, color: "#f59e0b" },
      { id: 4, name: "REFERENCE", desc: "Full wiki + all skills", tokens: 5820, maxTokens: 6000, forced: false, color: "#6366f1" },
    ],
  },
  mid: {
    label: "Mid", budget: 7000,
    color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30",
    layers: [
      { id: 0, name: "IDENTITY & CONSTRAINTS", desc: "RULES_COMPACT.md", tokens: 280, maxTokens: 300, forced: true, color: "#10b981" },
      { id: 1, name: "CURRENT STATE", desc: "state.md snapshot", tokens: 1800, maxTokens: 2000, forced: true, color: "#06b6d4" },
      { id: 2, name: "PATTERNS", desc: "patterns.md", tokens: 1200, maxTokens: 1500, forced: true, color: "#8b5cf6" },
      { id: 3, name: "ACTIVE PROBLEM", desc: "Problem + checklist", tokens: 900, maxTokens: 1200, forced: false, color: "#f59e0b" },
      { id: 4, name: "REFERENCE", desc: "Core wiki + top-5 skills", tokens: 2820, maxTokens: 3000, forced: false, color: "#6366f1" },
    ],
  },
  low: {
    label: "Low", budget: 4000,
    color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30",
    layers: [
      { id: 0, name: "IDENTITY & CONSTRAINTS", desc: "RULES_COMPACT.md", tokens: 280, maxTokens: 300, forced: true, color: "#10b981" },
      { id: 1, name: "CURRENT STATE", desc: "state.md snapshot", tokens: 1800, maxTokens: 2000, forced: true, color: "#06b6d4" },
      { id: 2, name: "PATTERNS", desc: "patterns.md (compressed)", tokens: 800, maxTokens: 1500, forced: true, color: "#8b5cf6" },
      { id: 3, name: "ACTIVE PROBLEM", desc: "Problem only", tokens: 600, maxTokens: 1200, forced: false, color: "#f59e0b" },
      { id: 4, name: "REFERENCE", desc: "Top-3 skills only", tokens: 520, maxTokens: 1000, forced: false, color: "#6366f1" },
    ],
  },
};

const SAMPLE_RULES = `# AGENT RULES (read first — always)
1. At session start: read state.md, context.md, active problem, active checklist.
2. At session end: write ## Session Metadata block. Write actions.json if changes.
3. actions.json format: { "actions": [ { "type": "...", "payload": {...} } ] }
4. Never guess file paths. Use list-agent-dir-files if unsure.
5. Current bound problem: {{PROBLEM_ID}} — {{PROBLEM_TITLE}}
6. If unsure about a term: check glossary.md before asking the user.
7. After code changes: run \`npm run build\` to verify.
8. NEVER use git checkout, git restore, git reset, git stash.
9. NEVER change \`@import "tailwindcss"\` in src/index.css.`;

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from = display;
    const to = value;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{display}</>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string | null;
  sub?: string;
  accent: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  suffix?: string;
}

function StatCard({ icon, label, value, sub, accent, loading, error, onRetry, suffix }: StatCardProps) {
  return (
    <div className="relative bg-zinc-800/60 rounded-xl border border-zinc-700/60 p-4 overflow-hidden transition-all duration-150 hover:border-zinc-600/80 hover:bg-zinc-800/80">
      <div className="absolute inset-0 opacity-5 rounded-xl" style={{ background: `radial-gradient(ellipse at top left, ${accent}, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div style={{ color: accent }}>{icon}</div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
          </div>
          {error && onRetry && (
            <button onClick={onRetry} className="text-zinc-500 hover:text-zinc-300 transition-colors duration-150">
              <RefreshCw size={12} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="h-8 w-16 bg-zinc-700/50 rounded animate-pulse" />
        ) : error ? (
          <div className="flex items-center gap-1.5 text-red-400/70">
            <XCircle size={14} />
            <span className="text-xs">Failed to load</span>
          </div>
        ) : value === null ? (
          <span className="text-2xl font-mono text-zinc-600">--</span>
        ) : (
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-mono font-semibold" style={{ color: accent }}>
              {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
            </span>
            {suffix && <span className="text-sm text-zinc-500 mb-0.5">{suffix}</span>}
          </div>
        )}

        {sub && !loading && !error && (
          <p className="text-xs text-zinc-500 mt-1">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-emerald-400">{icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {sub && <p className="text-xs text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Context Layer Map ────────────────────────────────────────────────────────

function ContextLayerMap({ tier }: { tier: ModelTier }) {
  const profile = TIER_PROFILES[tier];
  const totalUsed = profile.layers.reduce((s, l) => s + l.tokens, 0);
  const budgetPct = Math.round((totalUsed / profile.budget) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="text-zinc-400">Total budget</span>
        <span className={`font-mono ${budgetPct > 90 ? "text-red-400" : budgetPct > 70 ? "text-yellow-400" : "text-emerald-400"}`}>
          {totalUsed.toLocaleString()} / {profile.budget.toLocaleString()} tokens ({budgetPct}%)
        </span>
      </div>
      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(budgetPct, 100)}%`,
            background: budgetPct > 90 ? "#ef4444" : budgetPct > 70 ? "#f59e0b" : "#10b981",
          }}
        />
      </div>

      {profile.layers.map((layer) => {
        const widthPct = Math.round((layer.tokens / profile.budget) * 100);
        return (
          <div key={layer.id} className="group">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-zinc-600 w-4">L{layer.id}</span>
              <span className="text-xs font-semibold text-zinc-300">{layer.name}</span>
              {layer.forced && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold tracking-wide">
                  ALWAYS
                </span>
              )}
              <span className="ml-auto text-[10px] font-mono text-zinc-500">{layer.tokens.toLocaleString()} tok</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600 w-4" />
              <div className="flex-1 h-2 bg-zinc-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${widthPct}%`, backgroundColor: layer.color, opacity: layer.forced ? 1 : 0.7 }}
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 ml-6 mt-0.5">{layer.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Rules Preview ────────────────────────────────────────────────────────────

function RulesPreview({ problemId, problemTitle }: { problemId: string; problemTitle: string }) {
  const [copied, setCopied] = useState(false);
  const [injected, setInjected] = useState(false);

  const filled = SAMPLE_RULES
    .replace("{{PROBLEM_ID}}", problemId || "none")
    .replace("{{PROBLEM_TITLE}}", problemTitle || "No active problem");

  const handleCopy = () => {
    navigator.clipboard.writeText(filled);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInject = async () => {
    try {
      await (window as any).deskflowAPI?.executeTerminalPreset?.("builtin-remind");
      setInjected(true);
      setTimeout(() => setInjected(false), 2000);
    } catch {
      setInjected(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-zinc-700/60 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all duration-150"
        >
          {copied ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={handleInject}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all duration-150"
        >
          {injected ? <CheckCircle size={11} /> : <Play size={11} />}
          {injected ? "Injected" : "Inject Now"}
        </button>
      </div>

      <div className="bg-zinc-900/80 rounded-lg border border-zinc-700/50 p-3 font-mono text-[11px] leading-relaxed overflow-auto max-h-48">
        {filled.split("\n").map((line, i) => {
          if (line.startsWith("#")) {
            return <div key={i} className="text-emerald-400 font-bold mb-1">{line}</div>;
          }
          const numMatch = line.match(/^(\d+\. )(.*)/);
          if (numMatch) {
            const [, num, rest] = numMatch;
            const highlighted = rest.split(/(`[^`]+`)/).map((seg, j) =>
              seg.startsWith("`") ? (
                <span key={j} className="text-amber-400">{seg}</span>
              ) : (
                <span key={j}>{seg}</span>
              )
            );
            return (
              <div key={i} className="flex gap-1 text-zinc-300">
                <span className="text-cyan-500 shrink-0">{num}</span>
                <span>{highlighted}</span>
              </div>
            );
          }
          return <div key={i} className="text-zinc-500">{line || "\u00a0"}</div>;
        })}
      </div>
    </div>
  );
}

// ─── Actions Monitor ──────────────────────────────────────────────────────────

function ActionsMonitor({ log, onRefresh }: { log: ActionLogEntry | null; onRefresh: () => void }) {
  if (!log) {
    return (
      <div className="text-center py-6 text-zinc-600 text-xs">
        <FileText size={20} className="mx-auto mb-2 opacity-40" />
        Loading log...
      </div>
    );
  }

  if (!log.exists || log.entries.length === 0) {
    return (
      <div className="text-center py-6 text-zinc-600 text-xs">
        <CheckCircle size={20} className="mx-auto mb-2 text-emerald-600/40" />
        No parse errors recorded.
        <br />
        <span className="text-zinc-700">actions_error.log is empty or doesn't exist yet.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500">{log.entries.length} error entries</span>
        <button onClick={onRefresh} className="text-zinc-600 hover:text-zinc-400 transition-colors duration-150">
          <RefreshCw size={11} />
        </button>
      </div>
      <div className="bg-zinc-900/80 rounded-lg border border-red-900/30 p-3 font-mono text-[10px] leading-relaxed space-y-1.5 max-h-36 overflow-y-auto">
        {log.entries.map((entry, i) => (
          <div key={i} className={`${i === log.entries.length - 1 ? "text-red-400" : "text-zinc-600"}`}>
            {entry.length > 200 ? entry.slice(0, 200) + "\u2026" : entry}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-150 ${checked ? "bg-emerald-500" : "bg-zinc-600"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${checked ? "translate-x-4" : ""}`}
      />
    </button>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

interface Props {
  projectPath?: string;
}

export default function ModelImprovementDashboard({ projectPath }: Props) {
  const api = (window as any).deskflowAPI;

  const [stats, setStats] = useState<ModelStats | null>(null);
  const [log, setLog] = useState<ActionLogEntry | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const [threshold, setThreshold] = useState(10);
  const [defaultTier, setDefaultTier] = useState<ModelTier>(
    () => (localStorage.getItem("default-model-tier") as ModelTier) || "mid"
  );
  const [debugMode, setDebugMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  const [vizTier, setVizTier] = useState<ModelTier>("mid");

  type TabId = "overview" | "settings" | "rules" | "layers" | "actions";
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const result = await api?.getModelImprovementStats?.();
      if (result) {
        setStats(result);
        setThreshold(result.threshold ?? 10);
      }
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchLog = useCallback(async () => {
    try {
      const result = await api?.readActionsErrorLog?.();
      setLog(result ?? { entries: [], exists: false });
    } catch {
      setLog({ entries: [], exists: false });
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLog();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchLog]);

  const totalTerminals = stats ? Object.keys(stats.messageCounts).length : null;
  const totalMessages = stats ? Object.values(stats.messageCounts).reduce((s, v) => s + v, 0) : null;
  const parseRate = stats && stats.actionsAttempted > 0
    ? Math.round(((stats.actionsAttempted - stats.actionsFailed) / stats.actionsAttempted) * 100)
    : null;

  const handleThresholdChange = (v: number) => { setThreshold(v); setHasChanges(true); };
  const handleTierChange = (v: ModelTier) => { setDefaultTier(v); setHasChanges(true); };
  const handleDebugChange = (v: boolean) => { setDebugMode(v); setHasChanges(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.allSettled([
        api?.setReinjectThreshold?.({ threshold }),
        api?.setModelDebug?.({ enabled: debugMode }),
      ]);
      localStorage.setItem("default-model-tier", defaultTier);
      setHasChanges(false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BarChart2 size={12} /> },
    { id: "layers", label: "Context Map", icon: <Layers size={12} /> },
    { id: "rules", label: "Rules Card", icon: <Shield size={12} /> },
    { id: "actions", label: "Actions Log", icon: <Terminal size={12} /> },
    { id: "settings", label: "Settings", icon: <Settings size={12} /> },
  ];

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl overflow-hidden" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-700/50 bg-zinc-800/40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <Activity size={14} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 tracking-tight">Model Intelligence Dashboard</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">Live stats · Settings · Verification</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/70 bg-emerald-500/8 border border-emerald-500/20 rounded px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </div>
          </div>
        </div>

        {/* Tab bar (matches TerminalPage tab style) */}
        <div className="flex gap-0.5 mt-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md transition-all duration-150 ${
                activeTab === t.id
                  ? "bg-zinc-700 text-white border-t border-t-emerald-500"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <SectionHeader icon={<BarChart2 size={15} />} title="Live System Stats" sub="Refreshes every 5 seconds from main.ts" />

            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Zap size={13} />}
                label="Re-injections"
                value={stats?.reinjectionCount ?? null}
                sub={`Threshold: ${threshold} msgs`}
                accent="#10b981"
                loading={statsLoading}
                error={statsError}
                onRetry={fetchStats}
              />
              <StatCard
                icon={<Terminal size={13} />}
                label="Active Terminals"
                value={totalTerminals}
                sub={`${totalMessages ?? "--"} msgs total`}
                accent="#06b6d4"
                loading={statsLoading}
                error={statsError}
                onRetry={fetchStats}
              />
              <StatCard
                icon={<CheckCircle size={13} />}
                label="Parse Rate"
                value={parseRate}
                sub={`${stats?.actionsAttempted ?? "--"} actions, ${stats?.actionsFailed ?? "--"} failed`}
                accent={parseRate !== null ? (parseRate > 95 ? "#10b981" : parseRate > 80 ? "#f59e0b" : "#ef4444") : "#6b7280"}
                loading={statsLoading}
                error={statsError}
                onRetry={fetchStats}
                suffix="%"
              />
              <StatCard
                icon={<Activity size={13} />}
                label="Default Tier"
                value={defaultTier}
                sub="Applied to new sessions"
                accent={defaultTier === "top" ? "#10b981" : defaultTier === "low" ? "#f59e0b" : "#06b6d4"}
                loading={false}
              />
            </div>

            {/* Per-terminal message counts */}
            {stats && Object.keys(stats.messageCounts).length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider mb-2">Per-Terminal Message Counts</p>
                <div className="space-y-1.5">
                  {Object.entries(stats.messageCounts).map(([id, count]) => {
                    const pct = Math.min((count / (threshold * 3)) * 100, 100);
                    const nextReinjection = threshold - (count % threshold);
                    return (
                      <div key={id} className="bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700/40">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[160px]">{id}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-500">
                              <Clock size={9} className="inline mr-1" />
                              next inject in {nextReinjection} msg{nextReinjection !== 1 ? "s" : ""}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400">{count}</span>
                          </div>
                        </div>
                        <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-cyan-500/60 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {totalTerminals === 0 && !statsLoading && (
              <div className="text-center py-6 border border-dashed border-zinc-700/50 rounded-xl">
                <Terminal size={20} className="mx-auto mb-2 text-zinc-600" />
                <p className="text-xs text-zinc-600">No active terminals</p>
                <p className="text-[10px] text-zinc-700 mt-1">Open a terminal session to see live data</p>
              </div>
            )}
          </div>
        )}

        {/* ── CONTEXT LAYER MAP TAB ── */}
        {activeTab === "layers" && (
          <div className="space-y-4">
            <SectionHeader icon={<Layers size={15} />} title="Context Assembly Map" sub="Layer 0\u20132 are always injected (forceAdd). Layer 3\u20134 are trimmed by tier." />

            <div className="flex gap-2">
              {(["top", "mid", "low"] as ModelTier[]).map((t) => {
                const p = TIER_PROFILES[t];
                return (
                  <button
                    key={t}
                    onClick={() => setVizTier(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                      vizTier === t
                        ? `${p.bgColor} ${p.color} ${p.borderColor}`
                        : "bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:border-zinc-600/60"
                    }`}
                  >
                    {p.label} tier
                  </button>
                );
              })}
            </div>

            <ContextLayerMap tier={vizTier} />

            <div className="flex items-center gap-4 pt-2 border-t border-zinc-700/30">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <span className="w-2 h-2 rounded-sm bg-emerald-500/50" />
                Always injected (forceAdd)
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <span className="w-2 h-2 rounded-sm bg-indigo-500/50" />
                Budget-trimmed layers
              </div>
            </div>
          </div>
        )}

        {/* ── RULES CARD TAB ── */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <SectionHeader icon={<Shield size={15} />} title="RULES_COMPACT.md Preview" sub="Injected as Layer 0 in every session. Template vars filled at session creation." />
            <RulesPreview problemId="P-042" problemTitle="Terminal resize race condition" />

            <div className="bg-zinc-800/40 rounded-lg border border-zinc-700/40 p-3">
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Injection points</p>
              <div className="space-y-1.5">
                {[
                  ["buildInitContent()", "Inlined at top of every session init"],
                  ["maybeReinjectRules()", "Auto-injected every N messages"],
                  ["builtin-remind preset", "Manual injection on demand"],
                ].map(([point, desc]) => (
                  <div key={point} className="flex items-start gap-2 text-[10px]">
                    <span className="font-mono text-cyan-400 shrink-0">{point}</span>
                    <span className="text-zinc-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIONS LOG TAB ── */}
        {activeTab === "actions" && (
          <div className="space-y-4">
            <SectionHeader icon={<Terminal size={15} />} title="actions.json Monitor" sub="Live parse status and error log from executeActionsFromFile()" />

            {stats && stats.actionsAttempted > 0 && (
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-400">Parse success rate</span>
                  <span className={`text-sm font-mono font-bold ${parseRate! > 95 ? "text-emerald-400" : parseRate! > 80 ? "text-yellow-400" : "text-red-400"}`}>
                    {parseRate}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${parseRate}%`,
                      background: parseRate! > 95 ? "#10b981" : parseRate! > 80 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600 mt-1.5">
                  <span>{stats.actionsAttempted - stats.actionsFailed} succeeded</span>
                  <span>{stats.actionsFailed} failed</span>
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider mb-2">actions_error.log \u2014 Last 10 entries</p>
              <ActionsMonitor log={log} onRefresh={fetchLog} />
            </div>

            <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 p-3">
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Error feedback loop</p>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <span className="text-red-400">Parse fail</span>
                <span>\u2192</span>
                <span className="text-amber-400">Log to file</span>
                <span>\u2192</span>
                <span className="text-cyan-400">[SYSTEM] msg to terminal</span>
                <span>\u2192</span>
                <span className="text-emerald-400">Model self-corrects</span>
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <div className="space-y-5">
            <SectionHeader icon={<Settings size={15} />} title="System Configuration" sub="Changes persist to main.ts runtime variables and localStorage" />

            {/* Re-injection threshold */}
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-300">Re-injection Threshold</span>
                <span className="font-mono text-emerald-400 text-sm">{threshold}</span>
              </div>
              <p className="text-[10px] text-zinc-600 mb-3">RULES_COMPACT.md is injected after every N user messages. Lower = more frequent reminders.</p>
              <input
                type="range"
                min={3}
                max={30}
                value={threshold}
                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                <span>3 (aggressive)</span>
                <span>30 (conservative)</span>
              </div>
            </div>

            {/* Default model tier */}
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-300">Default Model Tier</span>
                <span className={`font-mono text-sm ${TIER_PROFILES[defaultTier].color}`}>{defaultTier}</span>
              </div>
              <p className="text-[10px] text-zinc-600 mb-3">Pre-selects the model tier in New Session Dialog. Saved to localStorage.</p>
              <div className="flex gap-2">
                {(["top", "mid", "low"] as ModelTier[]).map((t) => {
                  const p = TIER_PROFILES[t];
                  return (
                    <button
                      key={t}
                      onClick={() => handleTierChange(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                        defaultTier === t
                          ? `${p.bgColor} ${p.color} ${p.borderColor}`
                          : "bg-zinc-700/50 text-zinc-500 border-zinc-600/40 hover:border-zinc-500/60"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Debug mode */}
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-300">Debug Mode</span>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Enables verbose [SYSTEM] logging for all action events in terminal output.</p>
                </div>
                <Toggle checked={debugMode} onChange={handleDebugChange} />
              </div>
            </div>

            {/* Parameter reference */}
            <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 p-4">
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-3">Hardcoded Parameters (edit in source)</p>
              <div className="space-y-2">
                {[
                  ["State.md inline cap", "ContextService.ts ~165", "2000 chars"],
                  ["Patterns.md inline cap", "ContextService.ts ~175", "1500 chars"],
                  ["Remind preset truncation", "TerminalPage.tsx ~985", "1500 chars"],
                  ["Top tier budget", "ContextConfig.ts TIER_PROFILES", "10000 tok"],
                  ["Mid tier budget", "ContextConfig.ts TIER_PROFILES", "7000 tok"],
                  ["Low tier budget", "ContextConfig.ts TIER_PROFILES", "4000 tok"],
                ].map(([label, file, def]) => (
                  <div key={label} className="flex items-center gap-2 text-[10px]">
                    <span className="text-zinc-400 w-40 shrink-0">{label}</span>
                    <span className="font-mono text-zinc-600 flex-1">{file}</span>
                    <span className="font-mono text-cyan-400">{def}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save button */}
            {hasChanges && (
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all duration-150 disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : saveOk ? (
                    <CheckCircle size={12} />
                  ) : null}
                  {saving ? "Saving..." : saveOk ? "Saved!" : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
