import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, ChevronDown, RefreshCw, ExternalLink } from 'lucide-react';
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
  onRefresh: () => void;
}

export function TopicDigestCard({ topics, loading, error, onRefresh }: TopicDigestCardProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  return (
    <GlassCard accent="pink" className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-500/15">
            <Newspaper className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Research Digest</h3>
            <p className="text-[10px] text-zinc-500">AI-curated topic summaries — refreshed daily</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/20 transition-colors duration-150 disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {!loading && 'Refresh'}
        </button>
      </div>

      {loading && (
        <div className="py-4">
          <LoadingState variant="spinner" />
          <p className="text-xs text-zinc-500 text-center mt-2">Researching topics...</p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && topics.length === 0 && (
        <EmptyState
          icon={<Newspaper className="w-6 h-6 opacity-30" />}
          title="No research topics"
          description="Add topics in Settings → AI Assistant to get daily digests."
        />
      )}

      {!loading && topics.length > 0 && (
        <div className="space-y-2">
          {topics.map((item, i) => (
            <div key={i} className="rounded-lg overflow-hidden bg-zinc-800/10">
              <button
                onClick={() => setExpandedTopic(expandedTopic === item.topic ? null : item.topic)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-800/30 transition-colors"
              >
                <span className="text-xs font-medium text-cyan-400">{item.topic}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${expandedTopic === item.topic ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {expandedTopic === item.topic && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-zinc-400 px-3 pb-2 leading-relaxed">{item.summary}</p>
                    {item.sources && item.sources.length > 0 && (
                      <div className="px-3 pb-3 space-y-1">
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
