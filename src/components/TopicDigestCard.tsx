import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, ChevronDown, RefreshCw, ExternalLink, Brain, Sparkles, BookOpen, Cpu } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';

interface TopicSourceLink {
  title: string;
  url: string;
}

interface TopicDigestItem {
  topic: string;
  summary: string;
  sources?: TopicSourceLink[];
}

interface TopicDigestCardProps {
  topics: TopicDigestItem[];
  loading: boolean;
  error?: string;
  reason?: string;
  onRefresh: () => void;
  onConfigure?: () => void;
  providerBadge?: { label: string; color: string } | null;
}

const topicGradients = [
  'from-cyan-500/[0.06] to-blue-500/[0.02]',
  'from-violet-500/[0.06] to-fuchsia-500/[0.02]',
  'from-emerald-500/[0.06] to-teal-500/[0.02]',
  'from-amber-500/[0.06] to-orange-500/[0.02]',
  'from-rose-500/[0.06] to-pink-500/[0.02]',
  'from-indigo-500/[0.06] to-purple-500/[0.02]',
];

export function TopicDigestCard({ topics, loading, error, reason, onRefresh, onConfigure, providerBadge }: TopicDigestCardProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  return (
    <GlassCard variant="bordered" accent="amber" className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shadow-lg shadow-cyan-500/5">
            <Brain className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Research Digest</h3>
              {providerBadge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${providerBadge.color}`}>
                  {providerBadge.label}
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500">AI-curated topic summaries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onConfigure && (
            <button
              onClick={onConfigure}
              className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-500 border border-zinc-700/30 hover:text-zinc-300 hover:border-zinc-600/50 transition-all duration-150"
              title="Configure provider"
            >
              <Cpu className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all duration-200 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-4">
          <LoadingState variant="skeleton" rows={3} />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/8 border border-red-500/15 mb-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && topics.length === 0 && (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-zinc-600" />}
          title="No research topics"
          description={reason || "Add topics in Settings → AI Assistant to get daily digests."}
        />
      )}

      {!loading && topics.length > 0 && (
        <div className="space-y-2">
          {topics.map((item, i) => {
            const isOpen = expandedTopic === item.topic;
            const grad = topicGradients[i % topicGradients.length];
            return (
              <motion.div
                key={item.topic}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl overflow-hidden bg-gradient-to-r ${grad} border border-zinc-700/40 hover:border-zinc-600/50 transition-all duration-200`}
              >
                <button
                  onClick={() => setExpandedTopic(isOpen ? null : item.topic)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-zinc-800/60 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                    </div>
                    <span className="text-xs font-medium text-zinc-200">{item.topic}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-500 transition-all duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3">
                        <p className="text-xs text-zinc-400 leading-relaxed">{item.summary}</p>
                        {item.sources && item.sources.length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-zinc-700/40 space-y-1">
                            {item.sources.map((src, si) => (
                              <a
                                key={si}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[11px] text-cyan-500 hover:text-cyan-400 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{src.title}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
