import { FolderKanban, Globe, Code } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';

interface ProjectStatusCardProps {
  projectCount: number;
  recentProjectName?: string;
  recentProjectLanguage?: string;
  loading?: boolean;
  error?: string | null;
}

export function ProjectStatusCard({ projectCount, recentProjectName, recentProjectLanguage, loading, error }: ProjectStatusCardProps) {
  return (
    <GlassCard variant="compact" accent="pink">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/15 flex items-center justify-center">
          <FolderKanban className="w-3.5 h-3.5 text-pink-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Projects</h3>
          <p className="text-[10px] text-zinc-500">Active workspace</p>
        </div>
      </div>
      {loading ? (
        <LoadingState variant="skeleton" rows={2} />
      ) : error ? (
        <p className="text-xs text-zinc-500">Unable to load projects</p>
      ) : projectCount === 0 ? (
        <p className="text-xs text-zinc-500">Add a project in IDE Projects to see it here</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-pink-500/10 flex items-center justify-center">
                <Globe className="w-3 h-3 text-pink-400" />
              </div>
              <span className="text-xs text-zinc-400">Active</span>
            </div>
            <span className="text-sm font-semibold text-pink-400">{projectCount}</span>
          </div>
          {recentProjectName && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <Code className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-xs text-zinc-400">Recent</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-emerald-400 truncate max-w-[100px]">{recentProjectName}</span>
                {recentProjectLanguage && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800/60 text-zinc-400">{recentProjectLanguage}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
