import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Play, Pause, Square, Moon, Sun, BookOpen, Dumbbell, Activity,
  Bus, Book, Utensils, Coffee, Plus, X, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Lightbulb, Zap, Heart, Brain,
  Code, Laptop, Wrench, Cog, Music, Gamepad2, Footprints, Droplets,
  Wind, Flame, Backpack, Dribbble, Palette, Edit3,
  PieChart as PieChartIcon, BarChart3
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

interface ExternalActivity {
  id: number;
  name: string;
  type: 'stopwatch' | 'sleep' | 'checkin';
  color: string;
  icon: string;
  default_duration: number;
  is_default: number;
  is_visible: number;
  sort_order: number;
}

interface ExternalSession {
  id: number;
  activity_id: number;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  activity_name: string;
  type: string;
  color: string;
}

interface ExternalStats {
  byActivity: Record<string, { total_seconds: number; session_count: number }>;
  total_seconds: number;
  sleep_deficit_seconds: number;
  average_sleep_hours: number;
}

interface ConsistencyData {
  score: number;
  weekly_comparison: Array<{ week: string; total_seconds: number }>;
}

interface SleepTrend {
  daily: Array<{ date: string; sleep_seconds: number; deficit_seconds: number }>;
  average_bedtime: string;
  average_wake_time: string;
  average_sleep_duration: number;
  average_latency: number;
  average_wake_latency: number;
}

interface ActivityStats {
  today_seconds: number;
  week_seconds: number;
  month_seconds: number;
  session_count: number;
}

const ICON_MAP: Record<string, any> = {
  Clock,
  Moon,
  Sun,
  BookOpen,
  Dumbbell,
  Activity,
  Bus,
  Book,
  Utensils,
  Coffee,
  Lightbulb,
  Zap,
  Heart,
  Brain,
  Code,
  Laptop,
  Wrench,
  Cog,
  Music,
  Gamepad2,
  Footprints,
  Droplets,
  Wind,
  Flame,
  Backpack,
  Dribbble,
  Palette,
};

const AVAILABLE_ICONS = [
  { name: 'Clock', icon: Clock },
  { name: 'Moon', icon: Moon },
  { name: 'Sun', icon: Sun },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Activity', icon: Activity },
  { name: 'Bus', icon: Bus },
  { name: 'Book', icon: Book },
  { name: 'Utensils', icon: Utensils },
  { name: 'Coffee', icon: Coffee },
  { name: 'Lightbulb', icon: Lightbulb },
  { name: 'Zap', icon: Zap },
  { name: 'Heart', icon: Heart },
  { name: 'Brain', icon: Brain },
  { name: 'Code', icon: Code },
  { name: 'Laptop', icon: Laptop },
  { name: 'Wrench', icon: Wrench },
  { name: 'Cog', icon: Cog },
  { name: 'Music', icon: Music },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'Footprints', icon: Footprints },
  { name: 'Droplets', icon: Droplets },
  { name: 'Wind', icon: Wind },
  { name: 'Flame', icon: Flame },
  { name: 'Backpack', icon: Backpack },
  { name: 'Dribbble', icon: Dribbble },
  { name: 'Palette', icon: Palette },
];

const ACTIVITY_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b',
];

function getIcon(iconName: string) {
  return ICON_MAP[iconName] || Clock;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calculateSleepDuration(start: Date, end: Date): number {
  let endMs = end.getTime();
  const startMs = start.getTime();
  if (endMs < startMs) {
    endMs += 24 * 60 * 60 * 1000;
  }
  return Math.min(endMs - startMs, 24 * 60 * 60 * 1000);
}

function formatBedtime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ExternalPage() {
  const [activities, setActivities] = useState<ExternalActivity[]>([]);
  const [stats, setStats] = useState<ExternalStats>({ byActivity: {}, total_seconds: 0, sleep_deficit_seconds: 0, average_sleep_hours: 0 });
  const [consistency, setConsistency] = useState<ConsistencyData>({ score: 0, weekly_comparison: [] });
  const [sleepTrends, setSleepTrends] = useState<SleepTrend>({ daily: [], average_bedtime: '', average_wake_time: '' });
  const [activeSession, setActiveSession] = useState<{ sessionId: string; activityId: string; activity: ExternalActivity; startTime: Date } | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ExternalActivity | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [wakeTime, setWakeTime] = useState({ hours: 7, minutes: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [newActivity, setNewActivity] = useState({ name: '', type: 'stopwatch' as const, color: '#6366f1', icon: 'Clock', default_duration: 30 });
  const [viewingActivity, setViewingActivity] = useState<ExternalActivity | null>(null);
  const [viewingActivityStats, setViewingActivityStats] = useState<any>(null);
  const [viewingActivitySessions, setViewingActivitySessions] = useState<any[]>([]);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoverySession, setRecoverySession] = useState<{ sessionId: string; activityId: string; activity: ExternalActivity; startTime: Date } | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [addActivityError, setAddActivityError] = useState<string | null>(null);
  const [addActivitySuccess, setAddActivitySuccess] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ExternalActivity | null>(null);
  const [editActivityError, setEditActivityError] = useState<string | null>(null);
  const [showPastSleepModal, setShowPastSleepModal] = useState(false);
  const [pastSleepTimes, setPastSleepTimes] = useState({ bedtime: '22:00', waketime: '07:00' });
  const [pastSleepLatency, setPastSleepLatency] = useState(0);
  const [pastWakeLatency, setPastWakeLatency] = useState(0);
  const [pastSleepError, setPastSleepError] = useState<string | null>(null);
  const [pastSleepSuccess, setPastSleepSuccess] = useState(false);
  const [showMorningPrompt, setShowMorningPrompt] = useState(false);
  const [morningPromptData, setMorningPromptData] = useState<{ lastCloseTime: number; lastCloseType: string } | null>(null);
  const [sleepLatencyMinutes, setSleepLatencyMinutes] = useState(15);
  const [wakeUpMinutes, setWakeUpMinutes] = useState(5);

  // Load activities and check for active session on mount
  useEffect(() => {
    console.log('[ExternalPage] Mounting, loading...');
    
    // Check for morning prompt
    if (window.deskflowAPI?.getMorningPrompt) {
      window.deskflowAPI.getMorningPrompt().then((data) => {
        if (data && data.show) {
          console.log('[ExternalPage] Morning prompt available:', data);
          setMorningPromptData(data);
          setShowMorningPrompt(true);
        }
      });
    }
    
    // First, load activities
    if (window.deskflowAPI?.getExternalActivities) {
      window.deskflowAPI.getExternalActivities().then((data) => {
        console.log('[ExternalPage] Loaded activities:', data.length);
        setActivities(data);
        
        // After activities load, check for active session
        if (window.deskflowAPI?.getActiveExternalSession) {
          window.deskflowAPI.getActiveExternalSession().then((session) => {
            console.log('[ExternalPage] Checked active session:', session);
            if (session) {
              const activity = data.find((a: any) => a.id === session.activity_id);
              if (activity) {
                handleRestoreSession(session, activity);
              } else {
                console.log('[ExternalPage] Activity not found for session:', session.activity_id);
              }
            }
          }).catch(err => console.error('[ExternalPage] Failed to get active session:', err));
        }
      }).catch(err => console.error('[ExternalPage] Failed to load activities:', err));
    }
  }, []);

  // Enter key to start selected activity, ESC to unselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedActivity && !activeSession) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[ExternalPage] Enter: Starting activity:', selectedActivity.name);
        startActivity(selectedActivity);
        setSelectedActivity(null);
      } else if (e.key === 'Escape' && selectedActivity && !activeSession) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[ExternalPage] ESC: Unselecting activity');
        setSelectedActivity(null);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedActivity, activeSession]);

  // Click outside to unselect
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (selectedActivity && !activeSession) {
      const target = e.target as HTMLElement;
      if (target.id === 'activity-selection-overlay') {
        console.log('[ExternalPage] Click on overlay: Unselecting activity');
        setSelectedActivity(null);
      }
    }
  };

  const handleRestoreSession = (session: any, activity: any) => {
    const startTime = new Date(session.started_at);
    const now = new Date();
    const durationHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const startHour = startTime.getHours();
    
    const isNightSleep = startHour >= 22 || startHour <= 4;
    const isLongSession = durationHours >= 3;
    
    if (isLongSession || isNightSleep) {
      setRecoverySession({
        sessionId: session.id.toString(),
        activityId: session.activity_id.toString(),
        activity: activity,
        startTime,
      });
      setShowRecoveryModal(true);
    } else {
      // For short sessions, just resume directly
      setActiveSession({
        sessionId: session.id.toString(),
        activityId: session.activity_id.toString(),
        activity: activity,
        startTime: startTime,
      });
    }
  };

  // Load stats
  useEffect(() => {
    if (window.deskflowAPI?.getExternalStats) {
      window.deskflowAPI.getExternalStats(selectedPeriod).then(setStats);
    }
    if (window.deskflowAPI?.getConsistencyScore) {
      window.deskflowAPI.getConsistencyScore(selectedPeriod === 'week' ? 'week' : 'month').then(setConsistency);
    }
    if (window.deskflowAPI?.getSleepTrends) {
      window.deskflowAPI.getSleepTrends(selectedPeriod === 'week' ? 'week' : 'month').then(setSleepTrends);
    }
  }, [selectedPeriod]);

  // Timer interval
  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - activeSession.startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Start activity
  const startActivity = useCallback(async (activity: ExternalActivity) => {
    if (window.deskflowAPI?.getActivityStats) {
      window.deskflowAPI.getActivityStats(activity.id.toString()).then(setActivityStats);
    }
    if (activity.type === 'sleep') {
      if (window.deskflowAPI?.startExternalSession) {
        const result = await window.deskflowAPI.startExternalSession(activity.id.toString());
        if (result.success) {
          setActiveSession({
            sessionId: result.sessionId,
            activityId: activity.id.toString(),
            activity,
            startTime: new Date(),
          });
        }
      }
    } else if (activity.type === 'stopwatch') {
      // Save to database first, then set active session
      if (window.deskflowAPI?.startExternalSession) {
        const result = await window.deskflowAPI.startExternalSession(activity.id.toString());
        if (result.success) {
          setActiveSession({
            sessionId: result.sessionId,
            activityId: activity.id.toString(),
            activity,
            startTime: new Date(),
          });
        }
      } else {
        // Fallback for web mode
        setActiveSession({
          sessionId: 'temp-' + Date.now(),
          activityId: activity.id.toString(),
          activity,
          startTime: new Date(),
        });
      }
    } else if (activity.type === 'checkin') {
      if (window.deskflowAPI?.startExternalSession && window.deskflowAPI?.stopExternalSession) {
        const startResult = await window.deskflowAPI.startExternalSession(activity.id.toString());
        if (startResult.success) {
          const durationMs = ((activity.default_duration || 30) * 60 * 1000);
          const endTime = new Date(Date.now() + durationMs);
          await window.deskflowAPI.stopExternalSession(startResult.sessionId, endTime.toISOString());
          refreshStats();
        }
      }
    }
  }, []);

  const refreshStats = useCallback(() => {
    if (window.deskflowAPI?.getExternalStats) {
      window.deskflowAPI.getExternalStats(selectedPeriod).then(setStats);
    }
    if (window.deskflowAPI?.getConsistencyScore) {
      window.deskflowAPI.getConsistencyScore(selectedPeriod === 'week' ? 'week' : 'month').then(setConsistency);
    }
    if (window.deskflowAPI?.getSleepTrends) {
      window.deskflowAPI.getSleepTrends(selectedPeriod === 'week' ? 'week' : 'month').then(setSleepTrends);
    }
  }, [selectedPeriod]);

  // Stop activity
  const stopActivity = useCallback(async () => {
    if (!activeSession) return;

    if (activeSession.activity.type === 'sleep') {
      setShowSleepModal(true);
    } else {
      // Save stopwatch session to database
      if (activeSession.activity.type === 'stopwatch') {
        if (activeSession.sessionId.startsWith('temp-')) {
          // Local-only session (web mode), just reset
          console.log('[ExternalPage] Stopping local session');
        } else if (window.deskflowAPI?.stopExternalSession) {
          // Real session in DB
          console.log('[ExternalPage] Stopping DB session:', activeSession.sessionId);
          await window.deskflowAPI.stopExternalSession(activeSession.sessionId);
        }
      }
      setActiveSession(null);
      setElapsedSeconds(0);
      refreshStats();
    }
  }, [activeSession, refreshStats]);

  // Confirm wake up
  const confirmWakeUp = useCallback(async () => {
    if (!activeSession || activeSession.activity.type !== 'sleep') return;

    const now = new Date();
    const wakeDate = new Date();
    wakeDate.setHours(wakeTime.hours, wakeTime.minutes, 0, 0);

    const startDate = activeSession.startTime;
    const startMs = startDate.getTime();
    const wakeMs = wakeDate.getTime();

    if (wakeMs < startMs) {
      wakeDate.setDate(wakeDate.getDate() + 1);
    }

    if (window.deskflowAPI?.stopExternalSession) {
      await window.deskflowAPI.stopExternalSession(activeSession.sessionId, wakeDate.toISOString());
    }

    setShowSleepModal(false);
    setActiveSession(null);
    setElapsedSeconds(0);
    refreshStats();
  }, [activeSession, wakeTime, refreshStats]);

  // Cancel sleep
  const cancelSleep = useCallback(async () => {
    if (!activeSession) return;
    setActiveSession(null);
    setElapsedSeconds(0);
    setShowSleepModal(false);
  }, [activeSession]);

  // Save custom activity
  const saveCustomActivity = useCallback(async () => {
    if (!newActivity.name.trim()) {
      setAddActivityError('Activity name cannot be empty');
      return;
    }

    try {
      setAddActivityError(null);
      setAddActivitySuccess(false);

      if (window.deskflowAPI?.addExternalActivity) {
        const result = await window.deskflowAPI.addExternalActivity({
          name: newActivity.name,
          type: newActivity.type,
          color: newActivity.color,
          icon: newActivity.icon,
          default_duration: newActivity.default_duration,
        });
        
        if (!result) {
          throw new Error('Failed to create activity');
        }

        // Reload activities
        if (window.deskflowAPI?.getExternalActivities) {
          const updated = await window.deskflowAPI.getExternalActivities();
          setActivities(updated);
        }

        setAddActivitySuccess(true);
        setShowAddModal(false);
        setNewActivity({ name: '', type: 'stopwatch', color: '#6366f1', icon: 'Clock', default_duration: 30 });
        
        // Clear success message after 3 seconds
        setTimeout(() => setAddActivitySuccess(false), 3000);
      } else {
        throw new Error('API not available');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setAddActivityError(errorMsg);
      console.error('[ExternalPage] Error adding activity:', err);
    }
  }, [newActivity]);

  // Activity breakdown chart data
  const breakdownData = useMemo(() => {
    const labels = Object.keys(stats.byActivity);
    const data = labels.map(name => (stats.byActivity[name]?.total_seconds || 0) / 3600);
    const colors = labels.map(name => {
      const activity = activities.find(a => a.name === name);
      return activity?.color || '#6366f1';
    });

    return { labels, data, colors };
  }, [stats, activities]);

  // Consistency chart data
  const consistencyChartData = useMemo(() => {
    return {
      labels: consistency.weekly_comparison.map(w => w.week.slice(5)),
      data: consistency.weekly_comparison.map(w => w.total_seconds / 3600),
    };
  }, [consistency]);



  // Load viewing activity data
  const handleLoadViewingActivity = useCallback(async (activity: ExternalActivity) => {
    setViewingActivity(activity);
    setViewingActivityStats(null);
    setViewingActivitySessions([]);
    if (window.deskflowAPI?.getExternalSessions) {
      const sessions = await window.deskflowAPI.getExternalSessions(selectedPeriod);
      setViewingActivitySessions(sessions.filter((s: any) => s.activity_id === activity.id));
    }
  }, [selectedPeriod]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-zinc-100">External Tracker</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-800 rounded-lg p-1">
            {(['today', 'week', 'month', 'all'] as const).map((p) => (
              <button key={p} onClick={() => setSelectedPeriod(p)} className={`px-3 py-1 rounded text-xs uppercase font-medium transition ${selectedPeriod === p ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:text-white'}`}>{p}</button>
            ))}
          </div>
          <button onClick={() => setShowPastSleepModal(true)} className="px-3 py-1.5 rounded-lg text-sm text-amber-400 hover:text-amber-300 transition">+ Sleep</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Active Timer View */}
        <AnimatePresence>
          {activeSession && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8"
            >
              <div
                className="rounded-2xl p-8 flex flex-col items-center justify-center"
                style={{ backgroundColor: activeSession.activity.color + '20', border: `2px solid ${activeSession.activity.color}` }}
              >
                <div className="text-center mb-6">
                  {activeSession.activity.type === 'sleep' ? (
                    <>
                      <div className="text-6xl mb-4">😴</div>
                      <div className="text-2xl font-bold text-zinc-100 mb-2">Sleeping</div>
                      <div className="text-xl text-zinc-300">Since {formatBedtime(activeSession.startTime)}</div>
                      
                      {/* Sleep Stats */}
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                          <div className="text-xs text-zinc-400">Bedtime</div>
                          <div className="text-lg font-bold text-amber-400">{formatBedtime(activeSession.startTime)}</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                          <div className="text-xs text-zinc-400">Elapsed</div>
                          <div className="text-lg font-bold text-zinc-100">{formatDuration(elapsedSeconds)}</div>
                        </div>
                      </div>
                      
                      {/* Sleep Goal */}
                      <div className="mt-3 text-sm text-zinc-400">
                        Target: 8h • {Math.round(elapsedSeconds / 3600 * 10) / 10}h logged
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-zinc-400 mb-1">Tracking</div>
                      <div className="text-5xl font-mono font-bold text-zinc-100">
                        {formatDuration(elapsedSeconds)}
                      </div>
                      <div className="text-lg text-zinc-300 mt-2">{activeSession.activity.name}</div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

        {/* Inline Activity Detail View */}
        {viewingActivity && !activeSession && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: viewingActivity.color }}>{(() => { const Icon = getIcon(viewingActivity.icon); return <Icon className="w-6 h-6 text-white" />; })()}</div>
                <div>
                  <div className="text-xl font-semibold">{viewingActivity.name}</div>
                  <div className="text-sm text-zinc-500">Activity details</div>
                </div>
              </div>
              <button onClick={() => setViewingActivity(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
                <div className="text-xs text-zinc-400">Avg Session</div>
                <div className="text-lg font-bold text-zinc-100">{viewingActivitySessions.length > 0 ? (() => { const total = viewingActivitySessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0); return formatHours(total / viewingActivitySessions.length); })() : '--'}</div>
              </div>
              <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
                <div className="text-xs text-zinc-400">Sessions</div>
                <div className="text-lg font-bold text-zinc-100">{viewingActivitySessions.length}</div>
              </div>
              <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
                <div className="text-xs text-zinc-400">Active Days</div>
                <div className="text-lg font-bold text-zinc-100">{new Set(viewingActivitySessions.map((s: any) => s.started_at?.split('T')[0])).size}</div>
              </div>
            </div>
            {viewingActivitySessions.length > 0 && (
              <div className="h-40 mb-4">
                <div className="text-sm font-medium text-zinc-400 mb-2">Daily Activity</div>
                <div className="flex items-end justify-between gap-1 h-28">
                  {(() => {
                    const days = selectedPeriod === 'today' ? 1 : selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 14 : 30;
                    const now = new Date();
                    const bars: { label: string; seconds: number }[] = [];
                    for (let i = days - 1; i >= 0; i--) {
                      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                      const dateStr = d.toISOString().split('T')[0];
                      const daySec = viewingActivitySessions.filter((s: any) => s.started_at?.split('T')[0] === dateStr).reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0);
                      bars.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), seconds: daySec });
                    }
                    const maxSec = Math.max(...bars.map(b => b.seconds), 1);
                    return bars.slice(-14).map((bar, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end" style={{ height: '90px' }}>
                          <div className="w-full rounded-t" style={{ height: `${bar.seconds > 0 ? Math.max(3, (bar.seconds / maxSec) * 90) : 0}px`, backgroundColor: viewingActivity.color }} />
                        </div>
                        <div className="text-[9px] text-zinc-500">{bar.label}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
            {viewingActivitySessions.length > 3 && (
              <div className="h-24 mb-4">
                <div className="text-sm font-medium text-zinc-400 mb-2">Hourly Pattern</div>
                <div className="flex items-end justify-between gap-1 h-16">
                  {(() => {
                    const hourCounts = new Array(24).fill(0);
                    viewingActivitySessions.forEach((s: any) => { const h = new Date(s.started_at).getHours(); hourCounts[h] += s.duration_seconds || 0; });
                    const maxHour = Math.max(...hourCounts, 1);
                    return hourCounts.map((sec, h) => (
                      <div key={h} className="flex-1 flex flex-col items-center">
                        <div className="w-full rounded-t" style={{ height: `${sec > 0 ? Math.max(2, (sec / maxHour) * 50) : 0}px`, backgroundColor: viewingActivity.color, opacity: h >= 6 && h < 22 ? 0.8 : 0.3 }} />
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
            {viewingActivitySessions.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {viewingActivitySessions.slice(0, 10).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between bg-zinc-800/30 rounded px-3 py-1.5 text-sm">
                    <span className="text-zinc-300">{new Date(s.started_at).toLocaleDateString()} {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-zinc-400">{formatHours(s.duration_seconds || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Activity Grid with inline mini charts */}
        {!activeSession && (
          <div className="relative mb-8">
            <div className="grid grid-cols-4 gap-4">
              {activities.map((activity) => {
                const Icon = getIcon(activity.icon);
                const actStats = stats.byActivity[activity.name];
                const totalSeconds = actStats?.total_seconds || 0;
                return (
                  <div key={activity.id} className="relative group" data-activity-card>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedActivity(activity)} className={`rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all hover:ring-2 w-full ${selectedActivity?.id === activity.id ? 'ring-2' : ''}`} style={{ backgroundColor: selectedActivity?.id === activity.id ? activity.color + '40' : activity.color + '20', borderColor: selectedActivity?.id === activity.id ? activity.color : activity.color + '40' }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: activity.color }}><Icon className="w-6 h-6 text-white" /></div>
                      <div className="text-center"><div className="font-medium text-zinc-100 text-sm">{activity.name}</div>{totalSeconds > 0 && <div className="text-xs text-zinc-400 mt-1">{formatHours(totalSeconds)}</div>}</div>
                      {totalSeconds > 0 && (
                        <div className="w-full h-8 mt-1 flex items-end gap-[2px] px-1">
                          {(() => {
                            const now = new Date();
                            const dayData: number[] = [];
                            for (let i = 6; i >= 0; i--) {
                              const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                              const dateStr = d.toISOString().split('T')[0];
                              const daySec = actStats?.daily?.[dateStr] || 0;
                              dayData.push(daySec);
                            }
                            const maxD = Math.max(...dayData, 1);
                            return dayData.map((sec, idx) => (
                              <div key={idx} className="flex-1 flex flex-col items-center">
                                <div style={{ height: `${Math.max(2, (sec / maxD) * 24)}px`, backgroundColor: idx === 6 ? '#FCD34D' : activity.color }} className="w-full rounded-t" />
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </motion.button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingActivity(activity); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-zinc-800/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-zinc-700"><Edit3 className="w-3 h-3 text-zinc-300" /></button>
                  </div>
                );
              })}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowAddModal(true)} className="rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border border-dashed border-zinc-700 hover:border-zinc-500 transition-colors h-[140px]">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-zinc-700"><Plus className="w-6 h-6 text-zinc-400" /></div>
                <div className="text-center"><div className="font-medium text-zinc-400">Add Custom</div></div>
              </motion.button>
            </div>
          </div>
        )}

        {/* Selection Overlay with View Data */}
        {selectedActivity && !activeSession && (
          <>
            <div id="activity-selection-overlay" className="fixed inset-0 z-40" onClick={handleOverlayClick} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -10 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-zinc-800 rounded-2xl p-6 shadow-2xl border border-zinc-700 min-w-72" style={{ borderColor: selectedActivity.color + '60' }}>
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: selectedActivity.color }}>{(() => { const Icon = getIcon(selectedActivity.icon); return <Icon className="w-8 h-8 text-white" />; })()}</div>
                <div className="text-lg font-semibold text-zinc-100">{selectedActivity.name}</div>
                <div className="text-sm text-zinc-400 mt-1">Ready to start</div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { handleLoadViewingActivity(selectedActivity); setSelectedActivity(null); }} className="w-full px-4 py-2.5 bg-zinc-600 hover:bg-zinc-500 rounded-xl transition-colors text-white font-medium flex items-center justify-center gap-2"><BarChart3 className="w-4 h-4" />View Data & Charts</button>
                <button onClick={() => { startActivity(selectedActivity); setSelectedActivity(null); }} className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors text-white font-medium flex items-center justify-center gap-2"><Play className="w-4 h-4" />Start</button>
                <button onClick={() => setSelectedActivity(null)} className="w-full px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-xl transition-colors text-zinc-300">Cancel</button>
              </div>
              <div className="text-xs text-zinc-500 mt-3 text-center">Press ESC to close</div>
            </motion.div>
          </>
        )}

{/* Charts Section - 3 Glass-Styled Charts */}
        {!activeSession && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Daily Usage Trend */}
            <div className="glass rounded-3xl p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Daily Usage Trend</h3>
              <div className="h-48">
                {breakdownData.labels.length > 0 ? (
                  <Bar data={{
                    labels: breakdownData.labels,
                    datasets: [{ label: 'Hours', data: breakdownData.data, backgroundColor: breakdownData.colors, borderRadius: 4 }]
                  }} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { color: '#3f3f46' }, ticks: { color: '#a1a1aa' } }, y: { grid: { color: '#3f3f46' }, ticks: { color: '#a1a1aa' } } }
                  }} />
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500">No data yet</div>
                )}
              </div>
            </div>

            {/* Activity Distribution (Conic Doughnut) */}
            <div className="glass rounded-3xl p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4 text-center">Activity Distribution</h3>
              <div className="flex items-center justify-center h-36">
                {breakdownData.labels.length > 0 ? (() => {
                  const total = breakdownData.data.reduce((a, b) => a + b, 0);
                  let conicStr = '';
                  let currentPct = 0;
                  breakdownData.labels.forEach((name, i) => {
                    const pct = total > 0 ? (breakdownData.data[i] / total) * 100 : 0;
                    const start = currentPct;
                    const end = currentPct + pct;
                    conicStr += `${breakdownData.colors[i]} ${start}% ${end}%`;
                    if (i < breakdownData.labels.length - 1) conicStr += ', ';
                    currentPct = end;
                  });
                  return (
                    <div className="relative w-32 h-32">
                      <div className="w-full h-full rounded-full" style={{ background: `conic-gradient(${conicStr})` }}>
                        <div className="absolute inset-3 rounded-full bg-zinc-900 flex items-center justify-center">
                          <span className="text-lg font-bold text-zinc-100">{Math.round(total)}h</span>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="text-zinc-500">No data yet</div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4 justify-center">
                {breakdownData.labels.slice(0, 6).map((name, i) => (
                  <div key={name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: breakdownData.colors[i] }} />
                    <span className="text-zinc-400 truncate max-w-24">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Trend */}
            <div className="glass rounded-3xl p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Weekly Trend</h3>
              <div className="h-48">
                {consistencyChartData.labels.length > 0 ? (
                  <Bar data={{
                    labels: consistencyChartData.labels,
                    datasets: [{ label: 'Hours', data: consistencyChartData.data, backgroundColor: '#8b5cf6', borderRadius: 4 }]
                  }} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { display: false }, ticks: { color: '#a1a1aa' } }, y: { grid: { color: '#3f3f46' }, ticks: { color: '#a1a1aa' } } }
                  }} />
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500">No data yet</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recovery Modal */}
      <AnimatePresence>
        {showRecoveryModal && recoverySession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <div className="text-center mb-6">
                {recoverySession.activity.type === 'sleep' ? (
                  <>
                    <div className="text-6xl mb-4">😴</div>
                    <h2 className="text-xl font-semibold text-zinc-100">You were sleeping!</h2>
                    <p className="text-zinc-400 mt-2">Sleeping since {formatBedtime(recoverySession.startTime)}</p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">⏱️</div>
                    <h2 className="text-xl font-semibold text-zinc-100">Active Session Found</h2>
                    <p className="text-zinc-400 mt-2">{recoverySession.activity.name} started at {formatBedtime(recoverySession.startTime)}</p>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (window.deskflowAPI?.stopExternalSession) {
                      await window.deskflowAPI.stopExternalSession(recoverySession.sessionId);
                      refreshStats();
                    }
                    setShowRecoveryModal(false);
                    setRecoverySession(null);
                  }}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={() => {
                    setActiveSession(recoverySession);
                    setShowRecoveryModal(false);
                  }}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors"
                >
                  Resume
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sleep Wake Up Modal */}
      <AnimatePresence>
        {showSleepModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowSleepModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <Moon className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-zinc-100">Wake Up</h2>
                <p className="text-zinc-400 mt-2">When did you wake up?</p>
              </div>

              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex flex-col items-center">
                  <label className="text-sm text-zinc-400 mb-2">Hour</label>
                  <select
                    value={wakeTime.hours}
                    onChange={(e) => setWakeTime({ ...wakeTime, hours: parseInt(e.target.value) })}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-2xl text-zinc-100"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-2xl text-zinc-400 pt-6">:</span>
                <div className="flex flex-col items-center">
                  <label className="text-sm text-zinc-400 mb-2">Minute</label>
                  <select
                    value={wakeTime.minutes}
                    onChange={(e) => setWakeTime({ ...wakeTime, minutes: parseInt(e.target.value) })}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-2xl text-zinc-100"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {m.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSleepModal(false)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmWakeUp}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors"
                >
                  Confirm Wake Up
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Custom Activity Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-zinc-100">Add Custom Activity</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Error Message */}
              {addActivityError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{addActivityError}</p>
                </div>
              )}

              {/* Success Message */}
              {addActivitySuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-sm text-emerald-400">Activity created successfully!</p>
                </div>
              )}

              {/* Activity Name */}
              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Name</label>
                <input
                  type="text"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                  placeholder="e.g., Yoga, Meditation"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                />
              </div>

              {/* Activity Type */}
              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Type</label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as any })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                >
                  <option value="stopwatch">Stopwatch (timed)</option>
                  <option value="sleep">Sleep</option>
                  <option value="checkin">Check-in (quick)</option>
                </select>
              </div>

              {/* Icon Selection */}
              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      onClick={() => setNewActivity({ ...newActivity, icon: name })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
                        newActivity.icon === name 
                          ? 'bg-emerald-500/20 ring-2 ring-emerald-500' 
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-zinc-300" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewActivity({ ...newActivity, color })}
                      className={`w-8 h-8 rounded-full transition ${
                        newActivity.color === color ? 'ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Default Duration (for check-in) */}
              {newActivity.type === 'checkin' && (
                <div className="mb-4">
                  <label className="block text-sm text-zinc-400 mb-2">Default Duration (minutes)</label>
                  <select
                    value={newActivity.default_duration}
                    onChange={(e) => setNewActivity({ ...newActivity, default_duration: parseInt(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCustomActivity}
                  disabled={!newActivity.name.trim()}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Activity
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Activity Modal */}
      <AnimatePresence>
        {editingActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setEditingActivity(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-zinc-100">Edit Activity</h2>
                <button
                  onClick={() => setEditingActivity(null)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {editActivityError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{editActivityError}</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Name</label>
                <input
                  type="text"
                  value={editingActivity.name}
                  onChange={(e) => setEditingActivity({ ...editingActivity, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Type</label>
                <select
                  value={editingActivity.type}
                  onChange={(e) => setEditingActivity({ ...editingActivity, type: e.target.value as any })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                >
                  <option value="stopwatch">Stopwatch (timed)</option>
                  <option value="sleep">Sleep</option>
                  <option value="checkin">Check-in (quick)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      onClick={() => setEditingActivity({ ...editingActivity, icon: name })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
                        editingActivity.icon === name 
                          ? 'bg-emerald-500/20 ring-2 ring-emerald-500' 
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-zinc-300" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditingActivity({ ...editingActivity, color })}
                      className={`w-8 h-8 rounded-full transition ${
                        editingActivity.color === color ? 'ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (window.deskflowAPI?.deleteExternalActivity) {
                      try {
                        await window.deskflowAPI.deleteExternalActivity(editingActivity.id);
                        const updated = await window.deskflowAPI.getExternalActivities();
                        setActivities(updated);
                        setEditingActivity(null);
                      } catch (err) {
                        setEditActivityError('Failed to delete activity');
                      }
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-red-600/50 hover:bg-red-600 text-white rounded-xl transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={async () => {
                    if (window.deskflowAPI?.updateExternalActivity) {
                      try {
                        await window.deskflowAPI.updateExternalActivity(editingActivity.id, {
                          name: editingActivity.name,
                          type: editingActivity.type,
                          color: editingActivity.color,
                          icon: editingActivity.icon
                        });
                        const updated = await window.deskflowAPI.getExternalActivities();
                        setActivities(updated);
                        setEditingActivity(null);
                      } catch (err) {
                        setEditActivityError('Failed to update activity');
                      }
                    }
                  }}
                  disabled={!editingActivity.name.trim()}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Morning Sleep Prompt Modal */}
      <AnimatePresence>
        {showMorningPrompt && morningPromptData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🌤️</div>
                <h2 className="text-xl font-semibold text-zinc-100">Good Morning!</h2>
                <p className="text-zinc-400 mt-2">It looks like you slept last night. Want to track your sleep?</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">
                  How long after closing the app did you fall asleep? (optional)
                </label>
                <select
                  value={sleepLatencyMinutes}
                  onChange={(e) => setSleepLatencyMinutes(parseInt(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                >
                  <option value={0}>Immediately (0 min)</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-2">
                  How long after waking up did you open this app?
                </label>
                <select
                  value={wakeUpMinutes}
                  onChange={(e) => setWakeUpMinutes(parseInt(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                >
                  <option value={0}>Immediately (0 min)</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (window.deskflowAPI?.dismissMorningPrompt) {
                      await window.deskflowAPI.dismissMorningPrompt();
                    }
                    setShowMorningPrompt(false);
                  }}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={async () => {
                    if (!morningPromptData) return;
                    
                    const lastClose = new Date(morningPromptData.lastCloseTime);
                    const hoursSinceClose = (Date.now() - morningPromptData.lastCloseTime) / (1000 * 60 * 60);
                    const suggestedBedtime = new Date(lastClose.getTime() - sleepLatencyMinutes * 60 * 1000);
                    const suggestedWakeTime = new Date(Date.now() - wakeUpMinutes * 60 * 1000);
                    
                    const bedtimeStr = `${suggestedBedtime.getHours().toString().padStart(2, '0')}:${suggestedBedtime.getMinutes().toString().padStart(2, '0')}`;
                    const waketimeStr = `${suggestedWakeTime.getHours().toString().padStart(2, '0')}:${suggestedWakeTime.getMinutes().toString().padStart(2, '0')}`;
                    
                    setPastSleepTimes({ bedtime: bedtimeStr, waketime: waketimeStr });
                    setPastSleepLatency(sleepLatencyMinutes);
                    setPastWakeLatency(wakeUpMinutes);
                    setShowMorningPrompt(false);
                    setShowPastSleepModal(true);
                    
                    if (window.deskflowAPI?.dismissMorningPrompt) {
                      await window.deskflowAPI.dismissMorningPrompt();
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors"
                >
                  Add Sleep
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Past Sleep Modal */}
      <AnimatePresence>
        {showPastSleepModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowPastSleepModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-zinc-100">Add Past Sleep</h2>
                <button
                  onClick={() => setShowPastSleepModal(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {pastSleepError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{pastSleepError}</p>
                </div>
              )}

              {pastSleepSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-sm text-emerald-400">Sleep added successfully!</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Bedtime (last night)</label>
                <input
                  type="time"
                  value={pastSleepTimes.bedtime}
                  onChange={(e) => setPastSleepTimes({ ...pastSleepTimes, bedtime: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Wake time (this morning)</label>
                <input
                  type="time"
                  value={pastSleepTimes.waketime}
                  onChange={(e) => setPastSleepTimes({ ...pastSleepTimes, waketime: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">
                  How long after device off did you fall asleep?
                </label>
                <select
                  value={pastSleepLatency}
                  onChange={(e) => setPastSleepLatency(parseInt(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                >
                  <option value={0}>Immediately (0 min)</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-2">
                  How long after waking up did you open this app?
                </label>
                <select
                  value={pastWakeLatency}
                  onChange={(e) => setPastWakeLatency(parseInt(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100"
                >
                  <option value={0}>Immediately (0 min)</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPastSleepModal(false)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      setPastSleepError(null);
                      setPastSleepSuccess(false);

                      const now = new Date();
                      const bedtimeDate = new Date(now);
                      bedtimeDate.setHours(
                        parseInt(pastSleepTimes.bedtime.split(':')[0]),
                        parseInt(pastSleepTimes.bedtime.split(':')[1]),
                        0, 0
                      );

                      const waketimeDate = new Date(now);
                      waketimeDate.setHours(
                        parseInt(pastSleepTimes.waketime.split(':')[0]),
                        parseInt(pastSleepTimes.waketime.split(':')[1]),
                        0, 0
                      );

                      // For sleep: if wake time is earlier in the day than bedtime, it's the next day
                      if (waketimeDate <= bedtimeDate) {
                        waketimeDate.setDate(waketimeDate.getDate() + 1);
                      }

                      if (window.deskflowAPI?.addManualSleep) {
                        const result = await window.deskflowAPI.addManualSleep({
                          started_at: bedtimeDate.toISOString(),
                          ended_at: waketimeDate.toISOString(),
                          device_off_to_sleep_seconds: pastSleepLatency * 60,
                          wake_up_to_app_seconds: pastWakeLatency * 60
                        });

                        if (result.success) {
                          setPastSleepSuccess(true);
                          setPastSleepTimes({ bedtime: '22:00', waketime: '07:00' });
                          refreshStats();
                          setTimeout(() => setShowPastSleepModal(false), 1500);
                        } else {
                          setPastSleepError(result.error || 'Failed to add sleep');
                        }
                      } else {
                        setPastSleepError('API not available');
                      }
                    } catch (err) {
                      setPastSleepError('Failed to add sleep');
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors"
                >
                  Add Sleep
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}