import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Clock, GitBranch } from 'lucide-react';

interface FeatureEntry {
  name: string;
  status: 'implemented' | 'partial' | 'broken' | 'planned';
  gaps: { text: string; severity: 'critical' | 'high' | 'medium' | 'low' }[];
  mermaid: string;
}

const STATUS_COLORS = {
  implemented: 'text-emerald-400 bg-emerald-900/20',
  partial: 'text-amber-400 bg-amber-900/20',
  broken: 'text-red-400 bg-red-900/20',
  planned: 'text-zinc-400 bg-zinc-800/30',
};

const SEVERITY_COLORS = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-amber-400',
  low: 'text-zinc-500',
};

export default function FeatureLogicPanel() {
  const [features, setFeatures] = useState<FeatureEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const dapi = (window as any).deskflowAPI;
      const result = await dapi?.readProjectFile?.('agent/features/REGISTRY.md');
      if (result?.success && result.data) {
        setFeatures(parseRegistry(result.data));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadFeatures(); }, [loadFeatures]);

  const parseRegistry = (md: string): FeatureEntry[] => {
    const features: FeatureEntry[] = [];
    const sections = md.split(/^## Feature: /m).slice(1);

    for (const section of sections) {
      const nameMatch = section.match(/^(.+?)$/m);
      const statusMatch = section.match(/### Status:\s*(\w+)/i);
      const gapsSection = section.match(/### Gaps Found\n([\s\S]*?)(?=### Status|$)/);
      const mermaidMatch = section.match(/```mermaid\n([\s\S]*?)```/);

      const gaps: FeatureEntry['gaps'] = [];
      if (gapsSection) {
        const gapLines = gapsSection[1].split('\n').filter(l => l.match(/^- \[[ x]\]/));
        for (const line of gapLines) {
          const done = line.includes('[x]');
          if (!done) {
            const text = line.replace(/^- \[[ x]\]\s*/, '');
            const severity = text.toLowerCase().includes('critical') ? 'critical' :
                           text.toLowerCase().includes('missing') ? 'high' : 'medium';
            gaps.push({ text, severity });
          }
        }
      }

      features.push({
        name: nameMatch?.[1]?.trim() || 'Unknown',
        status: (statusMatch?.[1]?.toLowerCase() as FeatureEntry['status']) || 'planned',
        gaps,
        mermaid: mermaidMatch?.[1]?.trim() || '',
      });
    }
    return features;
  };

  const totalGaps = features.reduce((sum, f) => sum + f.gaps.length, 0);
  const criticalGaps = features.reduce((sum, f) => sum + f.gaps.filter(g => g.severity === 'critical').length, 0);

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-[var(--page-accent)]" />
          <h3 className="text-[12px] font-semibold text-white">Feature Logic</h3>
        </div>
        <div className="flex items-center gap-2">
          {criticalGaps > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">{criticalGaps} critical</span>
          )}
          {totalGaps > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400">{totalGaps} gaps</span>
          )}
        </div>
      </div>

      {/* Feature list */}
      {loading ? (
        <div className="text-[11px] text-zinc-500">Loading...</div>
      ) : features.length === 0 ? (
        <div className="text-[11px] text-zinc-600 italic">No features documented yet.</div>
      ) : (
        <div className="space-y-1">
          {features.map((f) => (
            <div key={f.name} className="rounded-lg bg-zinc-800/30 border border-zinc-700/30 overflow-hidden">
              {/* Feature header */}
              <button
                onClick={() => setExpanded(expanded === f.name ? null : f.name)}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-zinc-800/50 transition-colors"
              >
                {expanded === f.name ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
                <span className="text-[11px] font-medium text-zinc-200 flex-1">{f.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${STATUS_COLORS[f.status]}`}>{f.status}</span>
                {f.gaps.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/20 text-amber-400">{f.gaps.length}</span>
                )}
              </button>

              {/* Expanded content */}
              {expanded === f.name && (
                <div className="px-2.5 pb-2.5 space-y-2 border-t border-zinc-700/20">
                  {/* Mermaid diagram */}
                  {f.mermaid && (
                    <div className="mt-2">
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Flow</div>
                      <pre className="text-[10px] text-zinc-400 bg-zinc-900/50 rounded p-2 overflow-x-auto font-mono whitespace-pre-wrap">{f.mermaid}</pre>
                    </div>
                  )}

                  {/* Gaps */}
                  {f.gaps.length > 0 && (
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Open Gaps</div>
                      {f.gaps.map((g, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] py-0.5">
                          <AlertTriangle size={10} className={`${SEVERITY_COLORS[g.severity]} mt-0.5 shrink-0`} />
                          <span className="text-zinc-400">{g.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {f.gaps.length === 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <CheckCircle size={10} />
                      <span>No open gaps</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
