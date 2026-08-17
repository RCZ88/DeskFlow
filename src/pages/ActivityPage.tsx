import { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Globe, Target, Activity, Focus as FocusIcon, Clock } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { ManualAssignModal } from '../components/external/ManualAssignModal';
import type { Period } from '../lib/dateRange';

const StatsPage = lazy(() => import('./StatsPage'));
const BrowserActivityPage = lazy(() => import('./BrowserActivityPage'));
const ProductivityPage = lazy(() => import('./ProductivityPage'));
const FocusTab = lazy(() => import('../features/focus/FocusSection').then(m => ({ default: m.FocusSection })));

interface ActivityPageProps {
  appStats: any[];
  logs: unknown[];
  allLogs?: unknown[];
  browserLogs?: unknown[];
  dailyStats?: unknown[];
  selectedPeriod?: Period;
  dateOffset?: number;
  onDateOffsetChange?: (offset: number) => void;
  timeMode?: 'focus' | 'total';
  tierAssignments?: { productive: string[]; neutral: string[]; distracting: string[] };
  liveActivityLogs?: Array<{ id: string; timestamp: number; type: 'app' | 'browser' | 'ide'; name: string; category?: string; title?: string; url?: string }>;
  domainKeywordRules?: any[];
  externalActivities?: any[];
  externalActivityTiers?: any[];
}

const TABS = [
  { key: 'apps', label: 'Applications', icon: Monitor, accent: '#6366f1' },
  { key: 'websites', label: 'Websites', icon: Globe, accent: '#3b82f6' },
  { key: 'productivity', label: 'Productivity', icon: Target, accent: '#10b981' },
  { key: 'focus', label: 'Focus', icon: FocusIcon, accent: '#ec4899' },
] as const;

type TabKey = typeof TABS[number]['key'];

const crossfadeInitial = { opacity: 0, y: 8 };
const crossfadeAnimate = { opacity: 1, y: 0 };
const crossfadeExit = { opacity: 0, y: -8 };
const crossfadeTransition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const };
const pillTransition = { type: 'spring' as const, stiffness: 400, damping: 32 };

export default function ActivityPage(props: ActivityPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'websites' || tab === 'productivity' || tab === 'focus') return tab;
    } catch {}
    return 'apps';
  });

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }, [activeTab]);

  const [showManualAssign, setShowManualAssign] = useState(false);
  const [manualAssignGap, setManualAssignGap] = useState<{ start: Date; end: Date } | null>(null);
  const [manualAssignDate, setManualAssignDate] = useState<Date | null>(null);
  const [manualVersion, setManualVersion] = useState(0);

  const activeConfig = TABS.find(t => t.key === activeTab) || TABS[0];
  const activeIconWrapStyle = { background: `${activeConfig.accent}22` };
  const activeIconStyle = { color: activeConfig.accent };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation Bar */}
      <div className="sticky top-0 z-30 -mx-5 px-5 bg-zinc-900/20 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center gap-1 py-2">
          <div className="h-9 w-9 rounded-xl grid place-items-center mr-2" style={activeIconWrapStyle}>
            <Activity className="w-5 h-5" style={activeIconStyle} />
          </div>
          
          <div className="flex gap-1 bg-zinc-800/50 p-0.5 rounded-lg" data-tutorial="activity.tabs">
            {TABS.map(tab => {
              const pillStyle = { background: `${tab.accent}22`, border: `1px solid ${tab.accent}40` };
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-3 py-1.5 text-xs rounded-md transition-colors min-h-[36px] flex items-center gap-1.5 ${
                    activeTab === tab.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="activity-tab-pill"
                      className="absolute inset-0 rounded-md"
                      style={pillStyle}
                      transition={pillTransition}
                    />
                  )}
                  <tab.icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10 font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          <button
            onClick={() => {
              setManualAssignGap(null);
              setManualAssignDate(null);
              setShowManualAssign(true);
            }}
            title="Assign manual time into empty spans (random or custom)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-violet-400 hover:text-violet-300 transition"
          >
            <Clock className="h-3.5 w-3.5" />
            Manual time
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-auto relative">
        <div className="relative z-10">
          <Suspense fallback={<LoadingState variant="spinner" className="py-24" />}>
            <AnimatePresence mode="wait">
              {activeTab === 'apps' && (
                <motion.div
                  key="apps"
                  initial={crossfadeInitial}
                  animate={crossfadeAnimate}
                  exit={crossfadeExit}
                  transition={crossfadeTransition}
                  className="p-5"
                >
                  <StatsPage
                    embedded
                    appStats={props.appStats}
                    logs={props.logs}
                    allLogs={props.allLogs}
                    selectedPeriod={props.selectedPeriod}
                    dateOffset={props.dateOffset}
                    onDateOffsetChange={props.onDateOffsetChange}
                    timeMode={props.timeMode}
                    tierAssignments={props.tierAssignments}
                    liveActivityLogs={props.liveActivityLogs}
                  />
                </motion.div>
              )}
              {activeTab === 'websites' && (
                <motion.div
                  key="websites"
                  initial={crossfadeInitial}
                  animate={crossfadeAnimate}
                  exit={crossfadeExit}
                  transition={crossfadeTransition}
                  className="p-5"
                >
                  <BrowserActivityPage
                    embedded
                    selectedPeriod={props.selectedPeriod}
                    dateOffset={props.dateOffset}
                    onDateOffsetChange={props.onDateOffsetChange}
                    timeMode={props.timeMode}
                    tierAssignments={props.tierAssignments}
                    allLogs={props.allLogs}
                  />
                </motion.div>
              )}
              {activeTab === 'productivity' && (
                <motion.div
                  key="productivity"
                  initial={crossfadeInitial}
                  animate={crossfadeAnimate}
                  exit={crossfadeExit}
                  transition={crossfadeTransition}
                  className="p-5"
                >
                  <ProductivityPage
                    embedded
                    logs={props.allLogs}
                    browserLogs={props.browserLogs}
                    appStats={props.appStats}
                    selectedPeriod={props.selectedPeriod}
                    dateOffset={props.dateOffset}
                    onDateOffsetChange={props.onDateOffsetChange}
                    tierAssignments={props.tierAssignments}
                    domainKeywordRules={props.domainKeywordRules}
                    timeMode={props.timeMode}
                    externalActivities={props.externalActivities}
                    externalActivityTiers={props.externalActivityTiers}
                  />
                </motion.div>
              )}
              {activeTab === 'focus' && (
                <motion.div
                  key="focus"
                  initial={crossfadeInitial}
                  animate={crossfadeAnimate}
                  exit={crossfadeExit}
                  transition={crossfadeTransition}
                  className="p-5"
                >
                  <FocusTab />
                </motion.div>
              )}
            </AnimatePresence>
          </Suspense>
        </div>
      </div>

      {/* Manual Time Assignment */}
      <ManualAssignModal
        open={showManualAssign}
        initialDate={manualAssignDate ?? undefined}
        initialGap={manualAssignGap}
        onClose={() => {
          setShowManualAssign(false);
          setManualAssignGap(null);
        }}
        onChanged={() => setManualVersion((v) => v + 1)}
      />
    </div>
  );
}
