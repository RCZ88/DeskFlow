import { motion } from 'framer-motion';
import { Pause, Ban, Target } from 'lucide-react';
import { BorderBeam } from '../../components/ui/border-beam';
import { AuroraText } from '../../components/ui/aurora-text';

function formatDuration(ms: number): string {
  if (!ms || !isFinite(ms)) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface ForegroundData {
  app?: string;
  title?: string;
  category?: string;
  tier?: 'productive' | 'neutral' | 'distracting';
  isReal?: boolean;
}

interface DisplayTime {
  ms: number;
  label: string;
}

interface StopwatchTimerProps {
  displayTime: DisplayTime;
  isPaused: boolean;
  isCurrentlyProductive: boolean;
  isDistracting: boolean;
  externalSessionRunning: boolean;
  selectedExternalActivity: { id: number; name: string } | null;
  hasRealApp: boolean;
  currentApp: ForegroundData | null;
  currentWebsite: { title?: string; url?: string; category?: string; domain?: string; browserName?: string; profileName?: string; profileId?: string } | null;
  isInBrowser: boolean;
  lastTier: string | null;
  borderColor: string;
}

export function StopwatchTimer({
  displayTime,
  isPaused,
  isCurrentlyProductive,
  isDistracting,
  externalSessionRunning,
  selectedExternalActivity,
  hasRealApp,
  currentApp,
  currentWebsite,
  isInBrowser,
  lastTier,
  borderColor,
}: StopwatchTimerProps) {
  const isActive = isCurrentlyProductive || externalSessionRunning || isDistracting;
  const timerColor = displayTime.label.includes('External')
    ? '#8b5cf6'
    : isDistracting
      ? '#ef4444'
      : isCurrentlyProductive
        ? '#10b981'
        : '#3b82f6';

  return (
    <div className="flex-1 min-w-0">
      <div className="relative rounded-xl h-full">
        {isActive && (
          <BorderBeam
            size={80}
            duration={8}
            colorFrom={displayTime.label.includes('External') ? '#8b5cf6' : isDistracting ? '#ef4444' : '#10b981'}
            colorTo={displayTime.label.includes('External') ? '#a78bfa' : isDistracting ? '#f87171' : '#34d399'}
            borderWidth={1.5}
          />
        )}

        <div
          className="rounded-xl p-5 sm:p-12 border backdrop-blur-sm bg-zinc-950/80 h-full relative overflow-hidden"
          style={{
            borderColor,
            boxShadow: isActive
              ? `0 0 30px ${externalSessionRunning ? 'rgba(139, 92, 246, 0.12)' : isDistracting ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'}`
              : 'none',
          }}
        >
          {isActive && (
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 50% 40%, ${timerColor}, transparent 70%)`,
              }}
            />
          )}

          <div className="text-center space-y-6 relative">
            <div className="flex items-center justify-center gap-3">
              <motion.div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: timerColor }}
                animate={isActive ? { opacity: [1, 0.5, 1], scale: [1, 1.1, 1] } : { opacity: 1 }}
                transition={{ duration: 2.4, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
              />
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                {isPaused
                  ? <><Pause className="w-3 h-3" /> Paused</>
                  : displayTime.label.includes('External')
                    ? displayTime.label
                    : isDistracting
                      ? <><Ban className="w-3 h-3" /> Distracting</>
                      : isCurrentlyProductive
                        ? <><Target className="w-3 h-3" /> Locked In</>
                        : <><Pause className="w-3 h-3" /> Idle</>}
              </span>
            </div>

            <motion.div
              key={externalSessionRunning ? 'external' : 'productive'}
              initial={{ scale: 0.95, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-mono font-bold text-5xl lg:text-7xl xl:text-8xl truncate"
              style={{ lineHeight: '1', letterSpacing: '-0.02em' }}
            >
              <AuroraText
                colors={
                  displayTime.label.includes('External')
                    ? ['#8b5cf6', '#a78bfa', '#7c3aed', '#8b5cf6']
                    : isDistracting
                      ? ['#ef4444', '#f87171', '#dc2626', '#ef4444']
                      : isCurrentlyProductive
                        ? ['#10b981', '#34d399', '#059669', '#10b981']
                        : ['#3b82f6', '#60a5fa', '#2563eb', '#3b82f6']
                }
                speed={0.5}
              >
                {formatDuration(displayTime.ms)}
              </AuroraText>
            </motion.div>

            {externalSessionRunning && selectedExternalActivity && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
              >
                <div className="text-zinc-400 text-sm uppercase tracking-wider">External Activity</div>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-mono font-semibold"
                    style={{
                      backgroundColor: 'rgba(139, 92, 246, 0.2)',
                      color: '#a78bfa',
                    }}
                  >
                    {selectedExternalActivity.name}
                  </span>
                </div>
              </motion.div>
            )}

            {!externalSessionRunning && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
              >
                <div className="text-zinc-400 text-sm uppercase tracking-wider">
                  {hasRealApp ? 'Currently tracking' : 'Waiting for app'}
                </div>
                <div className="flex items-center justify-center gap-2">
                  {hasRealApp ? (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-mono font-semibold"
                      style={{
                        backgroundColor: isDistracting
                          ? 'rgba(239, 68, 68, 0.2)'
                          : isCurrentlyProductive
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(107, 114, 128, 0.2)',
                        color: isDistracting
                          ? '#f87171'
                          : isCurrentlyProductive
                            ? '#34d399'
                            : '#d1d5db',
                      }}
                    >
                      {currentWebsite
                        ? currentWebsite.category
                        : (currentApp?.category || (isInBrowser ? 'Browser' : (lastTier ? lastTier.charAt(0).toUpperCase() + lastTier.slice(1) : 'Unknown')))}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-zinc-800 text-zinc-500">
                      No App
                    </span>
                  )}
                </div>
                {isInBrowser && currentWebsite?.browserName && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          currentWebsite.browserName === 'chrome' ? '#3b82f6' :
                          currentWebsite.browserName === 'firefox' ? '#ff6611' :
                          currentWebsite.browserName === 'edge' ? '#0078d4' :
                          currentWebsite.browserName === 'brave' ? '#fb542b' :
                          currentWebsite.browserName === 'opera' ? '#ff1b2d' :
                          currentWebsite.browserName === 'comet' ? '#8b5cf6' : '#6b7280'
                      }}
                    />
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                      {currentWebsite.browserName}
                      {currentWebsite.profileName && (
                        <span className="text-zinc-600 normal-case tracking-normal"> · {currentWebsite.profileName}</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="text-lg font-medium text-white">
                  {isInBrowser && currentWebsite
                    ? (currentWebsite.title || currentWebsite.domain || 'Browsing...')
                    : currentApp
                      ? (currentApp.app || currentApp.title)
                      : (isInBrowser ? 'Browsing...' : (lastTier && displayTime.ms > 0 ? (lastTier === 'productive' ? 'Productive Session' : lastTier === 'distracting' ? 'Distracting Session' : 'Active Session') : 'Switch to another app to start tracking'))}
                </div>
              </motion.div>
            )}

            <div className="text-xs text-zinc-600 pt-4 border-t border-zinc-800">
              {externalSessionRunning
                ? `External activity: ${selectedExternalActivity?.name}. Timer running.`
                : (!hasRealApp
                  ? 'No app detected. Switch to a window to start tracking.'
                  : (isCurrentlyProductive
                    ? 'Productive work detected. Timer running.'
                    : 'No productive activity detected. Open an IDE, editor, or learning tool to start.'))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
