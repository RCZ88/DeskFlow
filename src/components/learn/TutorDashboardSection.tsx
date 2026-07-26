import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, MessageSquare, Lightbulb, StickyNote, TrendingUp, Loader2, Sparkles } from 'lucide-react';
import type { TutorDashboardData } from '../../shared/learn/types';

interface Props {
  getDashboard: () => Promise<TutorDashboardData>;
  onNavigateToNode?: (nodeId: string) => void;
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1c1917]/60 backdrop-blur-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="text-lg font-semibold text-zinc-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function TutorDashboardSection({ getDashboard, onNavigateToNode }: Props) {
  const [data, setData] = useState<TutorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getDashboard();
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  }, [getDashboard]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 text-clay-400 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const recentNotes = data.recent_notes ?? [];
  const topNodes = data.top_nodes ?? [];
  const openProposals = data.open_proposals ?? [];
  const totalAnswers = data.total_answers ?? 0;
  const totalQuestions = data.total_questions ?? 0;
  const avgConfidence = data.avg_confidence ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h3 className="font-serif text-sm font-semibold text-glow">Learning Dashboard</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Brain className="w-4 h-4 text-amber-400" />}
          label="Tutor Answers"
          value={totalAnswers}
          accent="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          icon={<MessageSquare className="w-4 h-4 text-clay-400" />}
          label="Questions Asked"
          value={totalQuestions}
          accent="bg-clay-500/10 text-clay-400"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-sage-400" />}
          label="Avg Confidence"
          value={`${Math.round(avgConfidence * 100)}%`}
          accent="bg-sage-400/10 text-sage-400"
        />
        <StatCard
          icon={<StickyNote className="w-4 h-4 text-amber-300" />}
          label="Notes Taken"
          value={recentNotes.length}
          accent="bg-amber-500/10 text-amber-300"
        />
      </div>

      {/* Active conversations & open proposals */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span>{data.active_conversations ?? 0} active conversations</span>
        <span>{openProposals.length} open proposals</span>
      </div>

      {/* Recent notes */}
      {recentNotes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Recent Notes</h4>
          <div className="space-y-1.5">
            {recentNotes.slice(0, 5).map((note) => (
              <div key={note.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#1c1917]/40 border border-white/5">
                <StickyNote className="w-3 h-3 text-sage-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{note.text}</p>
                  {note.node_title && (
                    <p className="text-[10px] text-zinc-600 mt-0.5">{note.node_title}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top nodes */}
      {topNodes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Most Asked About</h4>
          <div className="flex flex-wrap gap-2">
            {topNodes.map((node) => (
              <button
                key={node.node_id}
                onClick={() => onNavigateToNode?.(node.node_id)}
                className="px-2.5 py-1 rounded-full bg-[#1c1917]/60 border border-white/10 text-[11px] text-zinc-300 hover:bg-[#1c1917]/80 transition"
              >
                {node.title} ({node.count})
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
