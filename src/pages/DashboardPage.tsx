import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar, Line } from 'react-chartjs-2';
import {
  BookOpen, Dumbbell, Activity, Moon,
  Utensils, Coffee, Bus, Book, Timer, Zap,
  Sun, Zap as ZapIcon, Focus, Clock, X,
  Edit3, Check, Plus, Minus, TrendingUp,
  Target, ZapCircle, RefreshCw, Clock3,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  BarChart3
} from 'lucide-react';
import { getDateRange } from '../lib/dateRange';
import type { Period } from '../lib/dateRange';

const OrbitSystem = lazy(() => import('../components/OrbitSystem').then(module => ({ default: module.default })));
const DayDetailPopup = lazy(() => import('../components/DayDetailPopup').then(module => ({ default: module.DayDetailPopup })));

interface HeatmapCell {
  hour: number;
  day: number;
  value: number;
  productivity: number;
  deviceSeconds?: number;
  externalSeconds?: number;
  deviceBreakdown?: Record<string, { seconds: number; category: string }>;
  externalBreakdown?: Record<string, { seconds: number; color: string; icon: string }>;
}

interface ExternalActivity {
  id: number;
  name: string;
  type: 'stopwatch' | 'sleep' | 'checkin';
  color: string;
  icon: string;
  is_productive: boolean;
}

interface HourlyHeatmapData {
  day: string;
  hours: number;
}

interface SolarSystemData {
  name: string;
  usage_ms: number;
  category: string;
}

interface TimelineItem {
  id: string;
  startHour: number;
  endHour: number;
  label: string;
  category: 'external' | 'app' | 'browser' | 'log';
  color: string;
  duration: number;
  details?: string;
}

interface ForegroundData {
  app?: string;
  title?: string;
  category?: string;
  tier?: 'productive' | 'neutral' | 'distracting';
}

const ACTIVITY_ICONS: Record<string, any> = {
  BookOpen, Dumbbell, Activity, Moon, Utensils, Coffee, Bus, Book, Sun, Timer
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Tier assignments for categorizing productivity
const DEFAULT_TIER_ASSIGNMENTS = {
  productive: ['IDE', 'AI Tools', 'Developer Tools', 'Education', 'Productivity', 'Tools'],
  neutral: ['Communication', 'Design', 'Search Engine', 'News', 'Uncategorized', 'Other', 'Browser'],
  distracting: ['Entertainment', 'Social Media', 'Shopping']
};

// Website category to app category mapping — must match ProductivityPage
const WEBSITE_CATEGORY_MAP: Record<string, string> = {
  'Developer Tools': 'Tools',
  'AI Tools': 'AI Tools',
  'Social Media': 'Social Media',
  'Entertainment': 'Entertainment',
  'News': 'News',
  'Shopping': 'Shopping',
  'Productivity': 'Productivity',
  'Design': 'Design',
  'Search Engine': 'Productivity',
  'Communication': 'Communication',
  'Education': 'Education',
  'Uncategorized': 'Uncategorized',
  'Other': 'Other'
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface ActivityLog {
  id: number;
  timestamp: Date;
  app: string;
  category: string;
  duration: number;
  title?: string;
  project?: string;
  is_browser_tracking?: boolean;
}

interface TimerBehavior {
  neutralAction: 'pause' | 'reset' | 'ignore';
  distractingAction: 'pause' | 'reset' | 'ignore';
}

interface ActivityFeedItem {
  id: string;
  timestamp: Date;
  startTime: number; // When this session started tracking
  type: 'app' | 'browser';
  name: string;
  category: string;
  tier: 'productive' | 'neutral' | 'distracting';
  isActive?: boolean; // Currently active session
  duration?: number; // Time spent in SECONDS (for completed sessions)
}

interface DashboardPageProps {
  logs?: ActivityLog[];
  allLogs?: ActivityLog[];
  browserLogs?: ActivityLog[];
  appColors?: Record<string, string>;
  categoryOverrides?: Record<string, string>;
  timerBehavior?: TimerBehavior;
  selectedPeriod?: Period;
  dateOffset?: number;
  onDateOffsetChange?: (offset: number) => void;
  trackingBrowser?: string;
  trackerAppMode?: 'show-other' | 'pause' | 'track';
  tierAssignments?: {
    productive: string[];
    neutral: string[];
    distracting: string[];
  };
  // Timer state from parent (persisted at App level)
  timerState?: {
    productiveMs: number;
    startTime: number;
    paused: boolean;
    lastTier: string | null;
    externalRunning: boolean;
    externalStart: number | null;
    externalElapsed: number;
};
  onTimerStateChange?: (state: any) => void;
  // Activity feed from parent (use different name to avoid conflict)
  activityFeed?: any[];
  onActivityFeedChange?: (items: any[]) => void;
}

export default function DashboardPage({
  externalActivities = [],
  hourlyHeatmap = [],
  solarSystemData = [],
  productiveTimeMs = 0,
  logs = [],
  allLogs = [],
  browserLogs = [],
  appColors = {},
  categoryOverrides = {},
  timerBehavior = { neutralAction: 'ignore', distractingAction: 'ignore' },
  selectedPeriod = 'week',
  dateOffset = 0,
  onDateOffsetChange,
  trackingBrowser = '',
  trackerAppMode = 'track',
  tierAssignments = { productive: ['IDE', 'AI Tools', 'Education', 'Productivity', 'Tools'], neutral: ['Browser', 'Communication', 'Design', 'News', 'Uncategorized', 'Other'], distracting: ['Entertainment', 'Social Media', 'Shopping'] },
  timerState = null,
  onTimerStateChange,
  activityFeed: feedFromParent = [],
  onActivityFeedChange
}: DashboardPageProps) {
  const getPersistedTimerState = () => {
    // Try parent state first - only if it has meaningful data
    if (timerState && typeof timerState === 'object' && (timerState as any).externalRunning === true) {
      return timerState;
    }
    // Fallback to localStorage - check for meaningful data
    if (typeof window === 'undefined') return { productiveMs: 0, startTime: 0, paused: false, lastTier: null, externalRunning: false, externalStart: null, externalElapsed: 0, selectedExternalActivity: null };
    try {
      const saved = localStorage.getItem('deskflow-timer-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only use localStorage if there's meaningful data
        if (parsed.externalRunning || parsed.externalElapsed > 0 || parsed.selectedExternalActivity) {
          return parsed;
        }
      }
    } catch (e) {}
    return { productiveMs: 0, startTime: 0, paused: false, lastTier: null, externalRunning: false, externalStart: null, externalElapsed: 0, selectedExternalActivity: null };
  };
  const persistedTimer = getPersistedTimerState();

  const [selectedExternalActivity, setSelectedExternalActivity] = useState<ExternalActivity | null>(() => {
    // Restore from persisted state if external session was running
    const saved = persistedTimer.selectedExternalActivity as { id: number; name: string } | null;
    if (persistedTimer.externalRunning && saved) {
      return { id: saved.id, name: saved.name, category: 'External' };
    }
    return null;
  });

  const [currentProductiveMs, setCurrentProductiveMs] = useState(persistedTimer.productiveMs);
  const [isPaused, setIsPaused] = useState(persistedTimer.paused);
  const [lastTier, setLastTier] = useState<'productive' | 'neutral' | 'distracting' | null>(persistedTimer.lastTier);
  const isCurrentlyProductive = (() => {
    if (!lastTier || isPaused) return false;
    if (lastTier === 'productive') return true;
    if (lastTier === 'neutral') return timerBehavior.neutralAction === 'ignore';
    if (lastTier === 'distracting') return timerBehavior.distractingAction === 'ignore';
    return false;
  })();
  const isDistracting = lastTier === 'distracting' && !isPaused;

  // Stopwatch refs - declared early to avoid TDZ issues
  const stopwatchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopwatchAccumulatedRef = useRef(0); // tracks accumulated productive ms
  const stopwatchLastTickRef = useRef(0); // tracks last tick time
  const stopwatchActiveRef = useRef(false); // is timer actively running
  const stopwatchPausedRef = useRef(false); // is timer paused

  // Track productivity sessions for saving to database
  const productivitySessionStartRef = useRef<number | null>(null);
  const productivitySessionAppRef = useRef<string | null>(null);

  // Track last user interaction (mouse/keyboard) for idle detection
  const lastInteractionRef = useRef<number>(Date.now());

  // Global interaction listener — detects user activity for idle-aware session tracking
  useEffect(() => {
    const update = () => { lastInteractionRef.current = Date.now(); };
    window.addEventListener('mousemove', update, { passive: true });
    window.addEventListener('keydown', update, { passive: true });
    window.addEventListener('click', update, { passive: true });
    return () => {
      window.removeEventListener('mousemove', update);
      window.removeEventListener('keydown', update);
      window.removeEventListener('click', update);
    };
  }, []);

  // Persist external stopwatch too
  // FIX: If session is running but start time is missing, recalculate from database
  const [externalSessionRunning, setExternalSessionRunning] = useState(persistedTimer.externalRunning);
  const [externalSessionStart, setExternalSessionStart] = useState<Date | null>(null); // Will be set in useEffect
  const [externalElapsedMs, setExternalElapsedMs] = useState(0); // Will be calculated in useEffect
  
  // Restore external session on mount - fetch from database if running
  useEffect(() => {
    if (!externalSessionRunning) return;
    
    // Try to get active session from database
    if (window.deskflowAPI?.getActiveExternalSession) {
      window.deskflowAPI.getActiveExternalSession().then((session: any) => {
        if (session?.started_at) {
          const startTime = new Date(session.started_at);
          setExternalSessionStart(startTime);
          const elapsed = Date.now() - startTime.getTime();
          setExternalElapsedMs(elapsed);
          console.log('[Dashboard] Restored external session from DB:', session.name, 'elapsed:', Math.floor(elapsed/1000), 's');
        } else {
          // Fallback to persisted values
          const fallbackStart = persistedTimer.externalStart ? new Date(persistedTimer.externalStart) : null;
          if (fallbackStart) {
            setExternalSessionStart(fallbackStart);
            setExternalElapsedMs(Date.now() - fallbackStart.getTime());
          }
        }
      }).catch(err => {
        console.error('[Dashboard] Failed to restore external session:', err);
        // Fallback to persisted values
        const fallbackStart = persistedTimer.externalStart ? new Date(persistedTimer.externalStart) : null;
        if (fallbackStart) {
          setExternalSessionStart(fallbackStart);
          setExternalElapsedMs(Date.now() - fallbackStart.getTime());
        }
      });
    } else {
      // No IPC available - use persisted values
      const fallbackStart = persistedTimer.externalStart ? new Date(persistedTimer.externalStart) : null;
      if (fallbackStart) {
        setExternalSessionStart(fallbackStart);
        setExternalElapsedMs(Date.now() - fallbackStart.getTime());
      }
    }
  }, [externalSessionRunning]);
  const [externalTrackingMode, setExternalTrackingMode] = useState<'immediate' | 'interaction'>('immediate');
const [pinnedActivitiesEditMode, setPinnedActivitiesEditMode] = useState(false);
  const [pinnedActivities, setPinnedActivities] = useState<ExternalActivity[]>([]);
  const [pinnedActivitiesExpanded, setPinnedActivitiesExpanded] = useState(true);
  const [addPinnedPicker, setAddPinnedPicker] = useState<ExternalActivity[]>([]);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [selectedAddActivities, setSelectedAddActivities] = useState<Set<number>>(new Set());
  const [pausedByTrackerApp, setPausedByTrackerApp] = useState(false);
  // Load persisted activity feed from localStorage
  const getPersistedActivityFeed = (): ActivityFeedItem[] => {
    // Try parent activityFeed first
    if (feedFromParent && feedFromParent.length > 0) {
      return feedFromParent.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
        isActive: false // FIX: Clear active state on restore
      }));
    }
    // Fallback to localStorage
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('deskflow-activity-feed');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
          isActive: false // FIX: Clear active state on restore - prevents stale elapsed times
        }));
      }
    } catch (e) {}
    return [];
  };
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>(getPersistedActivityFeed());
  const activityFeedRef = useRef<ActivityFeedItem[]>(getPersistedActivityFeed());
  
  // Reset pausedByTrackerApp when mode changes from 'pause' to something else
  useEffect(() => {
    if (trackerAppMode !== 'pause' && pausedByTrackerApp) {
      setPausedByTrackerApp(false);
    }
  }, [trackerAppMode, pausedByTrackerApp]);
  
  // Initialize activity feed from allLogs if localStorage is empty
  useEffect(() => {
    if (activityFeed.length === 0 && allLogs && allLogs.length > 0) {
      // Balanced feed: up to 10 app entries + up to 5 browser entries
      const appEntries: any[] = [];
      const browserEntries: any[] = [];
      for (const log of allLogs) {
        const isBrowserType = log.is_browser_tracking === true || log.is_browser_tracking === 1;
        if (isBrowserType && browserEntries.length < 5) {
          browserEntries.push(log);
        } else if (!isBrowserType && appEntries.length < 10) {
          appEntries.push(log);
        }
        if (appEntries.length >= 10 && browserEntries.length >= 5) break;
      }
      const balancedLogs = [...appEntries, ...browserEntries].reverse();
      
      const feedItems: ActivityFeedItem[] = balancedLogs.map((log: any, idx) => {
        const timestamp = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
        const tsMs = timestamp.getTime();
        // FIX: Only check is_browser_tracking flag, NOT domain (domain can be null)
        const isBrowserType = log.is_browser_tracking === true || log.is_browser_tracking === 1;
        
        // Handle both duration (seconds) and duration_ms (milliseconds)
        let durationSec = 0;
        if (log.duration_ms) {
          durationSec = Math.floor(log.duration_ms / 1000);
        } else if (log.duration) {
          durationSec = log.duration; // already in seconds
        }
        
        return {
          id: `init-${idx}-${Date.now()}`,
          timestamp,
          startTime: tsMs,
          type: isBrowserType ? 'browser' as const : 'app' as const,
          name: log.app || log.title || log.domain || 'Unknown',
          category: log.category || 'Unknown',
          tier: getTierFromCategory(log.category),
          isActive: false, // FIX: Don't mark any as active - let pollForeground determine active app
          duration: durationSec // Use duration from log if available
        };
      });
      
      if (feedItems.length > 0) {
        activityFeedRef.current = feedItems;
        setActivityFeed(feedItems);
      }
    }
  }, [allLogs, activityFeed.length]);
  
  // Persist activity feed to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('deskflow-activity-feed', JSON.stringify(activityFeed));
  }, [activityFeed]);
  
  // Sync weekOffset for heatmap when selectedPeriod changes
  useEffect(() => {
    setWeekOffset(0);
  }, [selectedPeriod]);
  
  // Persist timer state to parent and localStorage
  useEffect(() => {
    const newState = {
      productiveMs: currentProductiveMs,
      startTime: stopwatchLastTickRef.current || Date.now(),
      paused: isPaused,
      lastTier: lastTier,
      externalRunning: externalSessionRunning,
      externalStart: externalSessionStart?.getTime() || null,
      externalElapsed: externalElapsedMs,
      selectedExternalActivity: selectedExternalActivity ? { id: selectedExternalActivity.id, name: selectedExternalActivity.name } : null
    };
    // Update parent state
    if (onTimerStateChange) {
      onTimerStateChange(newState);
    }
    // Also persist to localStorage as backup
    if (typeof window === 'undefined') return;
    localStorage.setItem('deskflow-timer-state', JSON.stringify(newState));
  }, [currentProductiveMs, isPaused, lastTier, externalSessionRunning, externalSessionStart, externalElapsedMs, selectedExternalActivity, onTimerStateChange]);

  // Sync timer state from parent prop (e.g., when ExternalPage starts/stops a stopwatch)
  const prevTimerStateRef = useRef(timerState);
  useEffect(() => {
    if (!timerState) return;
    if (timerState === prevTimerStateRef.current) return;
    prevTimerStateRef.current = timerState;

    const extRunning = !!(timerState as any).externalRunning;
    const extActivity = (timerState as any).selectedExternalActivity;
    const extStart = (timerState as any).externalStart;

    if (extRunning !== externalSessionRunning) {
      setExternalSessionRunning(extRunning);
      if (extRunning && extActivity) {
        setSelectedExternalActivity({ id: extActivity.id, name: extActivity.name, category: 'External' });
        if (extStart) {
          setExternalSessionStart(new Date(extStart));
          setExternalElapsedMs(Date.now() - new Date(extStart).getTime());
        }
      } else if (!extRunning) {
        setSelectedExternalActivity(null);
        setExternalSessionStart(null);
        setExternalElapsedMs(0);
      }
    }
  }, [timerState, externalSessionRunning]);

  const [resetCount, setResetCount] = useState(0);
  const [currentApp, setCurrentApp] = useState<ForegroundData | null>(null);
  const [isInBrowser, setIsInBrowser] = useState(false); // Track if currently in tracking browser
  const [lastNonBrowserApp, setLastNonBrowserApp] = useState<ForegroundData | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number; value: number; productivity: number; deviceSeconds?: number; externalSeconds?: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ day: number; hour: number } | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<'device' | 'external' | 'combined'>('combined');
  const [externalHourlyData, setExternalHourlyData] = useState<Map<string, { externalSeconds: number; breakdown: Record<string, { seconds: number; color: string; icon: string }> }>>(new Map());
  const [weekOffset, setWeekOffset] = useState(0);
  const [externalSessions, setExternalSessions] = useState<any[]>([]);
  const [expandedModal, setExpandedModal] = useState<'heatmap' | 'solar' | null>(null);
  const [solarFullscreen, setSolarFullscreen] = useState(false);
  const [currentWebsite, setCurrentWebsite] = useState<{ title?: string; url?: string; category?: string } | null>(null);
  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null);
  const [dayDetailItems, setDayDetailItems] = useState<TimelineItem[]>([]);

  const DEFAULT_ACTIVITIES: ExternalActivity[] = [
    { id: 1, name: 'Study', type: 'stopwatch', color: '#10b981', icon: 'BookOpen', is_productive: true },
    { id: 2, name: 'Exercise', type: 'stopwatch', color: '#10b981', icon: 'Dumbbell', is_productive: true },
    { id: 3, name: 'Gym', type: 'stopwatch', color: '#10b981', icon: 'Activity', is_productive: true },
    { id: 4, name: 'Reading', type: 'stopwatch', color: '#10b981', icon: 'Book', is_productive: true },
    { id: 5, name: 'Sleep', type: 'sleep', color: '#6366f1', icon: 'Moon', is_productive: false },
    { id: 6, name: 'Eating', type: 'checkin', color: '#6366f1', icon: 'Utensils', is_productive: false },
  ];

  const activities = useMemo(() => externalActivities.length > 0 ? externalActivities : DEFAULT_ACTIVITIES, [externalActivities]);

  // Initialize pinned activities from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('dashboard-pinned-activities');
        if (saved) {
          const parsed: ExternalActivity[] = JSON.parse(saved);
          if (parsed.some(a => a.name === 'Family Time')) {
            localStorage.removeItem('dashboard-pinned-activities');
            setPinnedActivities(DEFAULT_ACTIVITIES.slice(0, 5));
          } else {
            setPinnedActivities(parsed);
          }
        } else {
          setPinnedActivities(DEFAULT_ACTIVITIES.slice(0, 5));
        }
      } catch { /* ignore */ }
    }
  }, []);

  // Save pinned activities to localStorage when changed
  useEffect(() => {
    if (pinnedActivities.length > 0) {
      localStorage.setItem('dashboard-pinned-activities', JSON.stringify(pinnedActivities));
    }
  }, [pinnedActivities]);

  // Count resets today
  useEffect(() => {
    const count = activityFeed.filter(item => 
      item.tier === 'distracting' && 
      new Date(item.timestamp).toDateString() === new Date().toDateString()
    ).length;
    setResetCount(count);
  }, [activityFeed]);

  // Determine tier from category
  const getTierFromCategory = (category?: string): 'productive' | 'neutral' | 'distracting' => {
    if (!category) return 'neutral';
    const tiers = tierAssignments || DEFAULT_TIER_ASSIGNMENTS;
    if (tiers.productive.includes(category)) return 'productive';
    if (tiers.distracting.includes(category)) return 'distracting';
    return 'neutral';
  };

  const getProductiveTier = (category?: string) => {
    if (!category) return false;
    const tiers = tierAssignments || DEFAULT_TIER_ASSIGNMENTS;
    return tiers.productive.includes(category);
  };

  // Listen for foreground window changes
  useEffect(() => {
    if (!window.deskflowAPI?.onForegroundChange) {
      console.log('[Dashboard] No onForegroundChange API');
      return;
    }

    console.log('[Dashboard] Listening for foreground changes, trackingBrowser:', trackingBrowser);
    
window.deskflowAPI.onForegroundChange((data: ForegroundData) => {
      console.log('[Dashboard] Foreground change:', data.app, 'category:', data.category);
      
      // Check if this is the tracking browser (use includes for .exe suffix)
      const isTrackingBrowser = trackingBrowser && data.app && 
        data.app.toLowerCase().includes(trackingBrowser.toLowerCase());
      
      console.log('[Dashboard] isTrackingBrowser:', isTrackingBrowser, 'trackingBrowser:', trackingBrowser);
      
      // Check if this is Tracker app (DeskFlow/Electron)
      const isTrackerApp = data.app && (
        data.app.toLowerCase().includes('deskflow') ||
        data.app.toLowerCase().includes('electron')
      );
      
      // If tracking browser - set isInBrowser, DON'T track app
      if (isTrackingBrowser) {
        console.log('[Dashboard] In tracking browser - waiting for website events');
        setIsInBrowser(true);
        return;
      }
      
      // NOT in tracking browser
      console.log('[Dashboard] Not in tracking browser - tracking app:', data.app);
      setIsInBrowser(false);
      setCurrentWebsite(null); // Clear website immediately
      
      // Handle DeskFlow app based on trackerAppMode
      if (isTrackerApp) {
        if (trackerAppMode === 'show-other') {
          if (lastNonBrowserApp) setCurrentApp(lastNonBrowserApp);
          return;
        } else if (trackerAppMode === 'pause') {
          setCurrentApp(lastNonBrowserApp || null);
          setIsPaused(true);
          setPausedByTrackerApp(true);
          return;
        }
        // 'track' mode falls through
      }
      
      // Track regular apps - update currentApp
      setLastNonBrowserApp(data);
      setCurrentApp(data);
      
      // Track in activity feed
      const lastItem = activityFeedRef.current[activityFeedRef.current.length - 1];
      const newAppName = data.app || data.title || 'Unknown';
      
      if (lastItem && lastItem.type === 'app' && lastItem.name === newAppName) {
        return;
      }

      const tier = getTierFromCategory(data.category);
      // Update lastTier so isCurrentlyProductive works
      setLastTier(tier);
      const now = Date.now();
      
      // Check if stopwatch should pause/reset for this tier (keep feed in sync)
      const feedShouldPause = (() => {
        if (tier === 'productive') return false;
        if (tier === 'neutral') return timerBehavior.neutralAction === 'pause' || timerBehavior.neutralAction === 'reset';
        if (tier === 'distracting') return timerBehavior.distractingAction === 'pause' || timerBehavior.distractingAction === 'reset';
        return true;
      })();
      
      const newItem: ActivityFeedItem = {
        id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(now),
        startTime: now,
        type: 'app',
        name: newAppName,
        category: data.category || 'Unknown',
        tier,
        isActive: !feedShouldPause
      };
      activityFeedRef.current = activityFeedRef.current.map((item) => {
        if (item.isActive) {
          const durationMs = now - item.startTime;
          return { ...item, isActive: false, duration: Math.floor(durationMs / 1000) };
        }
        return item;
      });
      activityFeedRef.current = [...activityFeedRef.current.slice(-9), newItem];
      setActivityFeed([...activityFeedRef.current]);
    });
  }, [trackingBrowser, trackerAppMode, lastNonBrowserApp]);

  // Listen for browser tracking events (website changes)
  useEffect(() => {
    if (!window.deskflowAPI?.onBrowserTrackingEvent) {
      console.log('[Dashboard] No onBrowserTrackingEvent API');
      return;
    }

    console.log('[Dashboard] Listening for browser events, isInBrowser:', isInBrowser, 'trackingBrowser:', trackingBrowser);
    
window.deskflowAPI.onBrowserTrackingEvent((data: any) => {
      console.log('[Dashboard] Browser event:', data.type, 'domain:', data.domain, 'isInBrowser:', isInBrowser);
      
      if (data.type === 'browser-data' || data.type === 'live-log') {
        // Only track if we're in the tracking browser
        if (!isInBrowser || !trackingBrowser) {
          console.log('[Dashboard] Skipping - not in browser');
          return;
        }
        
        // Extra guard: skip if extension reports browser not focused
        // (handles race condition between 2s foreground poll and extension data)
        if (data.type === 'browser-data' && data.is_browser_focused === false) {
          console.log('[Dashboard] Skipping - browser not focused per extension');
          return;
        }
        
        console.log('[Dashboard] Processing website:', data.domain);
        
        const websiteTier = getTierFromCategory(data.category || 'Uncategorized');
        
        setCurrentWebsite({
          title: data.title,
          url: data.url,
          category: data.category
        });

        const lastItem = activityFeedRef.current[activityFeedRef.current.length - 1];
        const newDomain = data.domain || data.title || 'Unknown';
        
        if (lastItem && lastItem.type === 'browser' && lastItem.name === newDomain) {
          return;
        }

        const now = Date.now();
        // Check if stopwatch would pause for this website tier
        const browserFeedShouldPause = (() => {
          if (websiteTier === 'productive') return false;
          if (websiteTier === 'neutral') return timerBehavior.neutralAction === 'pause' || timerBehavior.neutralAction === 'reset';
          if (websiteTier === 'distracting') return timerBehavior.distractingAction === 'pause' || timerBehavior.distractingAction === 'reset';
          return true;
        })();
        const newItem: ActivityFeedItem = {
          id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(now),
          startTime: now,
          type: 'browser',
          name: newDomain,
          category: data.category || 'Uncategorized',
          tier: websiteTier,
          isActive: !browserFeedShouldPause
        };
        activityFeedRef.current = activityFeedRef.current.map((item) => {
          if (item.isActive) {
            const durationMs = now - item.startTime;
            return { ...item, isActive: false, duration: Math.floor(durationMs / 1000) };
          }
          return item;
        });
        activityFeedRef.current = [...activityFeedRef.current.slice(-9), newItem];
        setActivityFeed([...activityFeedRef.current]);
      }
    });
  }, [isInBrowser, trackingBrowser]);

  // SIMPLE stopwatch - respects timerBehavior settings for neutral/distracting apps
  // Uses accumulated pattern: keeps running across app switches, only pauses/resets based on settings
  useEffect(() => {
    // Clear existing timer
    if (stopwatchTimerRef.current) {
      clearInterval(stopwatchTimerRef.current);
      stopwatchTimerRef.current = null;
    }

    const isExternal = externalSessionRunning && externalSessionStart;

    // Determine current tier
    const currentCategory = isInBrowser
      ? (currentWebsite?.category || lastNonBrowserApp?.category)
      : currentApp?.category;
    const tier = getTierFromCategory(currentCategory || '');

    // Determine what action to take based on tier and settings
    const shouldAccumulate = (() => {
      if (isPaused) return false;
      if (tier === 'productive') return true;
      if (tier === 'neutral') {
        return timerBehavior.neutralAction === 'ignore';
      }
      if (tier === 'distracting') {
        return timerBehavior.distractingAction === 'ignore';
      }
      return false;
    })();

    const shouldPause = (() => {
      if (isPaused) return true;
      if (tier === 'productive') return false;
      if (tier === 'neutral') {
        return timerBehavior.neutralAction === 'pause';
      }
      if (tier === 'distracting') {
        return timerBehavior.distractingAction === 'pause';
      }
      return true; // default: pause for unknown tiers
    })();

    const shouldReset = (() => {
      if (tier === 'productive') return false;
      if (tier === 'neutral') {
        return timerBehavior.neutralAction === 'reset';
      }
      if (tier === 'distracting') {
        return timerBehavior.distractingAction === 'reset';
      }
      return false;
    })();

    // Handle reset action
    if (shouldReset) {
      console.log(`[Dashboard] Stopwatch: ${tier} app detected — RESET`);
      stopwatchAccumulatedRef.current = 0;
      stopwatchActiveRef.current = false;
      stopwatchPausedRef.current = true;
      setCurrentProductiveMs(0);
      return;
    }

    // Handle pause action or nothing active
    if (shouldPause && !isExternal) {
      console.log(`[Dashboard] Stopwatch: ${tier} app detected — PAUSE`);
      stopwatchActiveRef.current = false;
      stopwatchPausedRef.current = true;
      return;
    }

    // Resume or start timer
    const now = Date.now();
    if (!stopwatchActiveRef.current) {
      // Was paused/inactive — start fresh from now
      stopwatchLastTickRef.current = now;
      stopwatchActiveRef.current = true;
      stopwatchPausedRef.current = false;
    }

    if (shouldAccumulate || isExternal) {
      console.log(`[Dashboard] Stopwatch: ${tier} app — timer RUNNING`);
    }

    stopwatchTimerRef.current = setInterval(() => {
      const tickNow = Date.now();
      // Don't accumulate during idle periods (no interaction for 5+ minutes)
      if (tickNow - lastInteractionRef.current > 300000) {
        stopwatchLastTickRef.current = tickNow;
        return;
      }
      const delta = tickNow - stopwatchLastTickRef.current;
      stopwatchLastTickRef.current = tickNow;
      
      if (isExternal) {
        setExternalElapsedMs(prev => prev + delta);
      } else if (shouldAccumulate) {
        stopwatchAccumulatedRef.current += delta;
        setCurrentProductiveMs(stopwatchAccumulatedRef.current);
      }
    }, 1000);

    return () => {
      if (stopwatchTimerRef.current) {
        clearInterval(stopwatchTimerRef.current);
        stopwatchTimerRef.current = null;
      }
    };
  }, [currentApp, currentWebsite, isInBrowser, lastNonBrowserApp, isPaused, externalSessionRunning, externalSessionStart, timerBehavior, tierAssignments]);

  // Track and save productivity sessions — respects timerBehavior settings
  useEffect(() => {
    const currentCategory = isInBrowser
      ? (currentWebsite?.category || lastNonBrowserApp?.category)
      : currentApp?.category;
    const tier = getTierFromCategory(currentCategory || '');
    const appName = currentApp?.app || currentWebsite?.title || 'Unknown';

    // Determine if we should count this as a productive session
    const shouldCountSession = (() => {
      if (isPaused) return false;
      if (tier === 'productive') return true;
      if (tier === 'neutral') {
        return timerBehavior.neutralAction === 'ignore';
      }
      if (tier === 'distracting') {
        return timerBehavior.distractingAction === 'ignore';
      }
      return false;
    })();

    if (shouldCountSession) {
      // Starting/continuing a productive session
      if (!productivitySessionStartRef.current) {
        productivitySessionStartRef.current = Date.now();
        productivitySessionAppRef.current = appName;
        console.log('[Dashboard] Productivity session started:', appName, `(${tier})`);
      }
    } else {
      // Ending productive session - save to database
      if (productivitySessionStartRef.current && productivitySessionAppRef.current) {
        // Clamp end time to last known interaction + 5min to exclude idle periods
        const effectiveEnd = Math.min(Date.now(), lastInteractionRef.current + 300000);
        const durationMs = Math.max(0, effectiveEnd - productivitySessionStartRef.current);
        const durationSec = Math.floor(durationMs / 1000);
        
        if (durationSec >= 60) { // Only save sessions longer than 1 minute
          const session = {
            started_at: new Date(productivitySessionStartRef.current).toISOString(),
            ended_at: new Date().toISOString(),
            duration_seconds: durationSec,
            app_name: productivitySessionAppRef.current,
            category: currentCategory || 'Unknown'
          };
          
          if (window.deskflowAPI?.saveProductivitySession) {
            window.deskflowAPI.saveProductivitySession(session).then(() => {
              console.log('[Dashboard] Productivity session saved:', productivitySessionAppRef.current, durationSec, 'seconds');
            }).catch(err => {
              console.error('[Dashboard] Failed to save productivity session:', err);
            });
          }
        }
        
        // Reset session tracking
        productivitySessionStartRef.current = null;
        productivitySessionAppRef.current = null;
      }
    }
  }, [currentApp, currentWebsite, isInBrowser, lastNonBrowserApp, isPaused, timerBehavior, tierAssignments]);

  // Periodic session flush — saves every 60s so sessions appear during long productive streaks
  useEffect(() => {
    const interval = setInterval(() => {
      if (!productivitySessionStartRef.current || !productivitySessionAppRef.current) return;
      const effectiveEnd = Math.min(Date.now(), lastInteractionRef.current + 300000);
      const durationMs = Math.max(0, effectiveEnd - productivitySessionStartRef.current);
      const durationSec = Math.floor(durationMs / 1000);
      if (durationSec < 60) return;
      const session = {
        started_at: new Date(productivitySessionStartRef.current).toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: durationSec,
        app_name: productivitySessionAppRef.current,
        category: ''
      };
      if (window.deskflowAPI?.saveProductivitySession) {
        window.deskflowAPI.saveProductivitySession(session).then(() => {
          console.log('[Dashboard] Periodic session flush:', durationSec, 'seconds');
        }).catch(() => {});
      }
      productivitySessionStartRef.current = Date.now();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // External activity manual stopwatch
  useEffect(() => {
    const loadExternalData = async () => {
      if (!window.deskflowAPI?.getExternalSessions) {
        console.log('[Dashboard] getExternalSessions API not available');
        return;
      }
      
      try {
        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);
        const targetWeekStart = new Date(currentWeekStart.getTime() + (weekOffset * 7 * 24 * 60 * 60 * 1000));
        const targetWeekEnd = new Date(targetWeekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        const sessions = await window.deskflowAPI.getExternalSessions('all');
        console.log('[Dashboard] Loaded external sessions:', sessions?.length || 0);
        
        const newExternalHourlyData = new Map<string, { externalSeconds: number; breakdown: Record<string, { seconds: number; color: string; icon: string }> }>();
        
        (sessions || []).forEach((session: any) => {
          const startMs = new Date(session.started_at).getTime();
          const endMs = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
          const durationSec = (endMs - startMs) / 1000;
          
          if (startMs >= targetWeekEnd || endMs < targetWeekStart) return;
          
          let currentMs = startMs;
          while (currentMs < endMs) {
            const currentDate = new Date(currentMs);
            const currentDay = currentDate.getDay();
            const currentHour = currentDate.getHours();
            const calendarHourStart = new Date(currentDate);
            calendarHourStart.setMinutes(0, 0, 0);
            const hourStartMs = calendarHourStart.getTime();
            const hourEndMs = hourStartMs + 3600000;
            
            if (currentDate >= targetWeekStart && currentDate < targetWeekEnd) {
              const segmentStart = Math.max(currentMs, hourStartMs);
              const segmentEnd = Math.min(endMs, hourEndMs);
              const segmentSeconds = Math.max(0, (segmentEnd - segmentStart) / 1000);
              
              if (segmentSeconds > 0) {
                const key = `${currentDay}-${currentHour}`;
                const existing = newExternalHourlyData.get(key) || { externalSeconds: 0, breakdown: {} };
                existing.externalSeconds = Math.min(existing.externalSeconds + segmentSeconds, 3600);
                
                const activityName = session.activity_name || 'Unknown';
                if (!existing.breakdown[activityName]) {
                  existing.breakdown[activityName] = { seconds: 0, color: session.color || '#8b5cf6', icon: session.icon || '🎮' };
                }
                existing.breakdown[activityName].seconds += segmentSeconds;
                
                newExternalHourlyData.set(key, existing);
              }
            }
            currentMs = hourEndMs;
          }
        });
        
        setExternalHourlyData(newExternalHourlyData);
      } catch (err) {
        console.error('[Dashboard] Error loading external sessions:', err);
      }
    };
    
    loadExternalData();
  }, [weekOffset]);

  // Load all external sessions once (used by chart aggregation below)
  useEffect(() => {
    if (!window.deskflowAPI?.getExternalSessions) return;
    window.deskflowAPI.getExternalSessions('all').then(setExternalSessions).catch(err => console.error('[Dashboard] Error loading external sessions:', err));
  }, []);

  const computeChartDateRange = (period: string, offset: number): { start: Date; end: Date; label: string } =>
    getDateRange(period, offset);

  // ── Helper: get unique bucket key for a timestamp + period ──
  const getChartDateKey = (() => {
    return (timestamp: Date, period: string): string => {
      switch (period) {
        case 'today': return `${timestamp.getHours()}`;
        case 'week':
        case 'month': return `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
        case 'all': return `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
        default: return `${timestamp.getHours()}`;
      }
    };
  })();

  // ── Layer 1: Aggregate external sessions with hourly segmentation (like heatmap) ──
  const chartExternalData = useMemo(() => {
    const data = new Map<string, number>();
    if (!externalSessions || externalSessions.length === 0) return data;

    const range = computeChartDateRange(selectedPeriod, dateOffset);

    for (const session of externalSessions) {
      const sStart = new Date(session.started_at).getTime();
      const sEnd = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
      if (sStart >= range.end || sEnd < range.start) continue;

      let cur = Math.max(sStart, range.start.getTime());
      const ceiling = Math.min(sEnd, range.end.getTime());
      let iterations = 0;
      while (cur < ceiling && iterations < 10000) {
        iterations++;
        const hourFloor = Math.floor(cur / 3600000) * 3600000;
        const hourEndMs = hourFloor + 3600000;
        const segEnd = Math.min(ceiling, hourEndMs);
        const segSec = (segEnd - cur) / 1000;
        if (segSec > 0) {
          const d = new Date(cur);
          const hourKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getHours()}`;
          const existing = data.get(hourKey) || 0;
          data.set(hourKey, Math.min(existing + segSec, 3600));
        }
        cur = segEnd;
      }
    }

    const finalData = new Map<string, number>();
    for (const [hourKey, sec] of data) {
      const parts = hourKey.split('-');
      const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
      const hour = parseInt(parts[3]);
      let key: string;
      if (selectedPeriod === 'today') key = `${hour}`;
      else if (selectedPeriod === 'week' || selectedPeriod === 'month') key = dateStr;
      else key = `${parts[0]}-${parts[1]}`;
      finalData.set(key, (finalData.get(key) || 0) + sec);
    }

    return finalData;
  }, [externalSessions, selectedPeriod, dateOffset]);

  // ── Layer 1: Aggregate internal logs with hourly segmentation (like heatmap) ──
  const chartInternalData = useMemo(() => {
    const productive = new Map<string, number>();
    const nonProductive = new Map<string, number>();
    if (!allLogs || allLogs.length === 0) return { productive, nonProductive };

    const range = computeChartDateRange(selectedPeriod, dateOffset);

    const addLog = (startMs: number, durationSec: number, category: string) => {
      const endMs = startMs + durationSec * 1000;
      let cur = Math.max(startMs, range.start.getTime());
      const ceiling = Math.min(endMs, range.end.getTime());
      let iterations = 0;
      while (cur < ceiling && iterations < 100000) {
        iterations++;
        const hourFloor = Math.floor(cur / 3600000) * 3600000;
        const hourEndMs = hourFloor + 3600000;
        const segEnd = Math.min(ceiling, hourEndMs);
        const segSec = (segEnd - cur) / 1000;
        if (segSec > 0) {
          const d = new Date(cur);
          const hourKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getHours()}`;
          const target = getProductiveTier(category) ? productive : nonProductive;
          const existing = target.get(hourKey) || 0;
          target.set(hourKey, Math.min(existing + segSec, 3600));
        }
        cur = segEnd;
      }
    };

    for (const log of allLogs) {
      const logDate = new Date(log.timestamp);
      if (logDate >= range.end) continue;
      const durationSec = (log.duration_ms || ((log.duration || 0) * 1000)) / 1000;
      addLog(logDate.getTime(), durationSec, log.category || '');
    }

    const prodFinal = new Map<string, number>();
    const nonProdFinal = new Map<string, number>();

    for (const [hourKey, sec] of productive) {
      const parts = hourKey.split('-');
      const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
      const hour = parseInt(parts[3]);
      let key: string;
      if (selectedPeriod === 'today') key = `${hour}`;
      else if (selectedPeriod === 'week' || selectedPeriod === 'month') key = dateStr;
      else key = `${parts[0]}-${parts[1]}`;
      prodFinal.set(key, (prodFinal.get(key) || 0) + sec);
    }

    for (const [hourKey, sec] of nonProductive) {
      const parts = hourKey.split('-');
      const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
      const hour = parseInt(parts[3]);
      let key: string;
      if (selectedPeriod === 'today') key = `${hour}`;
      else if (selectedPeriod === 'week' || selectedPeriod === 'month') key = dateStr;
      else key = `${parts[0]}-${parts[1]}`;
      nonProdFinal.set(key, (nonProdFinal.get(key) || 0) + sec);
    }

    return { productive: prodFinal, nonProductive: nonProdFinal };
  }, [allLogs, selectedPeriod, dateOffset, tierAssignments]);

  // ── Layer 2: Generate buckets + merge internal + external ──
  const chartBarsResult = useMemo(() => {
    const range = computeChartDateRange(selectedPeriod, dateOffset);
    const bars: { label: string; productiveSeconds: number; nonProductiveSeconds: number; externalSeconds: number; isToday?: boolean }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    switch (selectedPeriod) {
      case 'today': {
        for (let h = 0; h < 24; h++) {
          const key = `${h}`;
          let prodSec = Math.min(chartInternalData.productive.get(key) || 0, 3600);
          let nonProdSec = Math.min(chartInternalData.nonProductive.get(key) || 0, 3600);
          let extSec = Math.min(chartExternalData.get(key) || 0, 3600);
          const totalSec = prodSec + nonProdSec + extSec;
          if (totalSec > 3600) {
            const scale = 3600 / totalSec;
            prodSec = Math.round(prodSec * scale);
            nonProdSec = Math.round(nonProdSec * scale);
            extSec = Math.round(extSec * scale);
          }
          bars.push({
            label: h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`,
            productiveSeconds: prodSec,
            nonProductiveSeconds: nonProdSec,
            externalSeconds: extSec,
            isToday: now >= range.start && now < range.end && now.getHours() === h,
          });
        }
        break;
      }
      case 'week': {
        for (let i = 0; i < 7; i++) {
          const dayDate = new Date(range.start);
          dayDate.setDate(dayDate.getDate() + i);
          const key = getChartDateKey(dayDate, 'week');
          const prodSec = chartInternalData.productive.get(key) || 0;
          const nonProdSec = chartInternalData.nonProductive.get(key) || 0;
          const extSec = chartExternalData.get(key) || 0;
          bars.push({
            label: dayNames[dayDate.getDay()],
            productiveSeconds: prodSec,
            nonProductiveSeconds: nonProdSec,
            externalSeconds: extSec,
            isToday: dayDate.getFullYear() === now.getFullYear() && dayDate.getMonth() === now.getMonth() && dayDate.getDate() === now.getDate(),
          });
        }
        break;
      }
      case 'month': {
        const current = new Date(range.start);
        while (current < range.end) {
          const key = getChartDateKey(current, 'month');
          const prodSec = chartInternalData.productive.get(key) || 0;
          const nonProdSec = chartInternalData.nonProductive.get(key) || 0;
          const extSec = chartExternalData.get(key) || 0;
          bars.push({
            label: `${current.getDate()}`,
            productiveSeconds: prodSec,
            nonProductiveSeconds: nonProdSec,
            externalSeconds: extSec,
            isToday: current.getFullYear() === now.getFullYear() && current.getMonth() === now.getMonth() && current.getDate() === now.getDate(),
          });
          current.setDate(current.getDate() + 1);
        }
        break;
      }
      case 'all': {
        const current = new Date(range.start);
        let lastKey = '';
        while (current < range.end) {
          const key = getChartDateKey(current, 'all');
          if (key !== lastKey) {
            const prodSec = chartInternalData.productive.get(key) || 0;
            const nonProdSec = chartInternalData.nonProductive.get(key) || 0;
            const extSec = chartExternalData.get(key) || 0;
            bars.push({
              label: current.toLocaleDateString([], { month: 'short', year: '2-digit' }),
              productiveSeconds: prodSec,
              nonProductiveSeconds: nonProdSec,
              externalSeconds: extSec,
              isToday: current.getFullYear() === now.getFullYear() && current.getMonth() === now.getMonth(),
            });
            lastKey = key;
          }
          current.setMonth(current.getMonth() + 1);
        }
        break;
      }
    }

    const max = Math.max(1, ...bars.map(b => b.productiveSeconds + b.nonProductiveSeconds + b.externalSeconds));
    return { chartBars: bars, maxBarSeconds: max };
  }, [chartInternalData, chartExternalData, selectedPeriod, dateOffset]);

  // Y-axis tick computation for productivity chart
  const yAxisTicks = useMemo(() => {
    const maxHours = chartBarsResult.maxBarSeconds / 3600;
    const tickCount = 4;
    const ticks: number[] = [];

    let niceMax: number;
    if (selectedPeriod === 'all') {
      // Monthly totals can exceed 24h — auto-scale
      if (maxHours <= 24) {
        niceMax = Math.ceil(maxHours / 4) * 4 || 4;
      } else if (maxHours <= 100) {
        niceMax = Math.ceil(maxHours / 20) * 20 || 20;
      } else {
        niceMax = Math.ceil(maxHours / 50) * 50 || 50;
      }
    } else if (selectedPeriod === 'today') {
      niceMax = 1; // Max 1h per hour slot
    } else {
      const niceSteps = [1, 2, 4, 6, 8, 10, 12, 16, 20, 24];
      const rawMax = niceSteps.find(s => s >= maxHours) || Math.ceil(maxHours / 4) * 4;
      niceMax = Math.min(rawMax, 24);
    }

    const step = niceMax / tickCount;
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(Math.round(step * i * 10) / 10);
    }
    return { ticks, niceMax, step };
  }, [chartBarsResult.maxBarSeconds, selectedPeriod]);

  // External activity stopwatch - adaptive: shows external activity if running
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Adaptive display: show what's actually running
  const displayTime = useMemo(() => {
    const isProductive = (() => {
      const currentCategory = isInBrowser
        ? (currentWebsite?.category || lastNonBrowserApp?.category)
        : currentApp?.category;
      const tier = getTierFromCategory(currentCategory || '');
      return tier === 'productive' && !isPaused;
    })();

    // External takes priority (user wants to see it when running)
    if (externalSessionRunning && externalElapsedMs > 0) {
      return { ms: externalElapsedMs, label: `External: ${selectedExternalActivity?.name || 'Running'}` };
    }

    // Productive app running
    if (isProductive) {
      return { ms: currentProductiveMs, label: 'Productive' };
    }

    // Nothing productive
    return { ms: currentProductiveMs, label: isPaused ? 'Paused' : 'Idle' };
  }, [externalSessionRunning, externalElapsedMs, currentProductiveMs, selectedExternalActivity, currentApp, currentWebsite, isInBrowser, lastNonBrowserApp, isPaused]);

  // Stopwatch interval - only runs when external session is active
  useEffect(() => {
    // Clear any existing interval
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current);
      stopwatchIntervalRef.current = null;
    }

    if (!externalSessionRunning || !externalSessionStart) {
      return;
    }

    console.log('[Dashboard] Stopwatch started, startTime:', externalSessionStart.getTime());
    
    // Calculate and set initial elapsed immediately
    const now = Date.now();
    const initialElapsed = now - externalSessionStart.getTime();
    setExternalElapsedMs(initialElapsed);
    
    // Start interval
    stopwatchIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - externalSessionStart.getTime();
      setExternalElapsedMs(elapsed);
    }, 1000);

    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
        stopwatchIntervalRef.current = null;
      }
    };
  }, [externalSessionRunning, externalSessionStart]);

  const handleSelectExternalActivity = useCallback((activity: ExternalActivity) => {
    setSelectedExternalActivity(activity);
  }, []);

  // Interaction detection for external activity
  useEffect(() => {
    if (!externalSessionRunning || externalTrackingMode !== 'interaction') return;
    
    let lastInteraction = Date.now();
    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - lastInteraction;
      // If idle for more than 2 minutes, pause the timer
      if (idleTime > 120000) {
        setExternalSessionRunning(false);
      }
    }, 5000);
    
    const handleInteraction = () => {
      lastInteraction = Date.now();
      // Resume if was paused due to idle
      if (!externalSessionRunning && selectedExternalActivity) {
        setExternalSessionRunning(true);
      }
    };
    
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);
    
    return () => {
      clearInterval(checkIdle);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [externalSessionRunning, externalTrackingMode, selectedExternalActivity]);

  const handleStartExternalSession = useCallback(async () => {
    if (!selectedExternalActivity) return;
    
    // Save to database via IPC
    if (window.deskflowAPI?.startExternalSession) {
      try {
        const sessionId = await window.deskflowAPI.startExternalSession(selectedExternalActivity.id);
        console.log('[Dashboard] Started external session:', selectedExternalActivity.name, 'ID:', sessionId);
      } catch (err) {
        console.error('[Dashboard] Failed to start external session:', err);
      }
    }
    
    const now = new Date();
    setExternalSessionStart(now);
    setExternalSessionRunning(true);
    setExternalElapsedMs(0);
    console.log('[Dashboard] Stopwatch started manually, startTime:', now.getTime());
  }, [selectedExternalActivity]);

  const handleStopExternalSession = useCallback(async () => {
    // Save to database via IPC
    if (window.deskflowAPI?.stopExternalSession && selectedExternalActivity) {
      try {
        // Get the active session first to get its ID
        const activeSession = await window.deskflowAPI.getActiveExternalSession();
        if (activeSession?.id) {
          await window.deskflowAPI.stopExternalSession(activeSession.id, new Date().toISOString());
          console.log('[Dashboard] Stopped external session:', selectedExternalActivity.name);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to stop external session:', err);
      }
    }
    
    setExternalSessionRunning(false);
    setExternalSessionStart(null);
    setExternalElapsedMs(0);
  }, [selectedExternalActivity]);

  // Keyboard shortcuts - ALWAYS ACTIVE
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to SELECT external activity (same as clicking on it)
      if (e.key === 'Enter') {
        console.log('[Dashboard] Enter key pressed!');
        
        // Prevent default and stop propagation
        e.preventDefault();
        e.stopPropagation();
        
        // Find first available activity and select it
        if (activities.length > 0 && !selectedExternalActivity) {
          const firstActivity = activities[0];
          setSelectedExternalActivity(firstActivity);
          console.log('[Dashboard] Enter: Selected activity:', firstActivity.name);
        }
      }
      
      // Escape to deselect
      if (e.key === 'Escape') {
        if (selectedExternalActivity) {
          setSelectedExternalActivity(null);
          setExternalSessionRunning(false);
          console.log('[Dashboard] Escape: Deselected activity');
        }
      }
    };
    
    // Add to document with capture to ensure we get it
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activities, selectedExternalActivity]);

  // Compute real heatmap data from allLogs (last 7 days)
  const computedHeatmap = useMemo(() => {
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Initialize last 7 days ending with today
    const todayDayName = dayNames[today.getDay()];
    const days: Record<string, { hours: number; productiveHours: number }> = {};
    
    // First, set today
    days[todayDayName] = { hours: 0, productiveHours: 0 };
    
    // Then go back 6 more days
    for (let i = 1; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = dayNames[date.getDay()];
      if (!days[dayName]) {
        days[dayName] = { hours: 0, productiveHours: 0 };
      }
    }
    
    // Sum time for each day, ONLY last 7 days
    const filteredLogs = allLogs.filter((log: any) => {
      if (!log.timestamp) return false;
      const logDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
      return logDate >= sevenDaysAgo;
    });
    
    filteredLogs.forEach((log: any) => {
      const logDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
      const dayName = dayNames[logDate.getDay()];
      // Handle both duration (seconds) and duration_ms (milliseconds)
      const durationSec = log.duration_ms ? log.duration_ms / 1000 : (log.duration || 0);
      const hours = durationSec / 3600;
      
      if (!days[dayName]) {
        days[dayName] = { hours: 0, productiveHours: 0 };
      }
      days[dayName].hours += hours;
      
      // Check if productive category
      const isProductive = tierAssignments?.productive?.includes(log.category);
      if (isProductive) {
        days[dayName].productiveHours += hours;
      }
    });
    
    // Return in order starting from Sun
    const orderedDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return orderedDays.map(day => {
      const dayData = days[day] || { hours: 0, productiveHours: 0 };
      return { 
        day, 
        hours: dayData.hours,
        productivity: dayData.hours > 0 ? (dayData.productiveHours / dayData.hours) : 0
      };
    });
  }, [allLogs, tierAssignments]);

  // Function to get color based on productivity and hours
  const getHeatmapColor = (hours: number, productivity: number) => {
    // No data
    if (hours === 0) return { bg: '#374151', glow: 'none' };
    
    // Productivity: 0 = red, 0.5 = yellow, 1 = green
    // Hours: more hours = brighter
    const prod = Math.max(0, Math.min(1, productivity));
    
    // Interpolate between red (#ef4444) -> yellow (#eab308) -> green (#22c55e)
    let r, g, b;
    if (prod < 0.5) {
      // Red to Yellow: mix red and yellow
      const t = prod * 2; // 0-0.5 -> 0-1
      r = Math.round(239 * (1 - t) + 234 * t);
      g = Math.round(68 * (1 - t) + 216 * t);
      b = Math.round(68 * (1 - t) + 8 * t);
    } else {
      // Yellow to Green: mix yellow and green
      const t = (prod - 0.5) * 2; // 0.5-1 -> 0-1
      r = Math.round(234 * (1 - t) + 34 * t);
      g = Math.round(216 * (1 - t) + 197 * t);
      b = Math.round(8 * (1 - t) + 94 * t);
    }
    
    // Adjust brightness based on hours (more hours = more saturated)
    const hourFactor = Math.min(1, hours / 8);
    const saturation = 0.3 + (hourFactor * 0.7);
    
    // Apply glow effect
    const glow = hours > 0 ? `0 0 ${Math.round(8 + hourFactor * 12)}px rgba(${r}, ${g}, ${b}, 0.4)` : 'none';
    
    return { bg: `rgb(${r}, ${g}, ${b})`, glow };
  };

  const defaultHeatmap = useMemo(() => [
    { day: 'Mon', hours: 2.5, productivity: 0.8 },
    { day: 'Tue', hours: 4.2, productivity: 0.9 },
    { day: 'Wed', hours: 3.8, productivity: 0.85 },
    { day: 'Thu', hours: 5.1, productivity: 0.7 },
    { day: 'Fri', hours: 2.0, productivity: 0.6 },
    { day: 'Sat', hours: 1.5, productivity: 0.5 },
    { day: 'Sun', hours: 3.2, productivity: 0.75 },
  ], []);

  // Compute hourly heatmap from allLogs (24h × 7 days grid) - based on weekOffset
  const hourlyHeatmapData = useMemo(() => {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Sunday
    currentWeekStart.setHours(0, 0, 0, 0);
    // Apply weekOffset: 0 = current week, -1 = previous week, etc.
    const targetWeekStart = new Date(currentWeekStart.getTime() + (weekOffset * 7 * 24 * 60 * 60 * 1000));
    const targetWeekEnd = new Date(targetWeekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    interface CellData {
      totalSeconds: number;
      productiveSeconds: number;
      apps: Record<string, { seconds: number; category: string }>;
    }
    const cellMap = new Map<string, CellData>();
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date(targetWeekStart);
      date.setDate(date.getDate() + dayOffset);
      const day = date.getDay();
      for (let hour = 0; hour < 24; hour++) {
        cellMap.set(`${day}-${hour}`, { totalSeconds: 0, productiveSeconds: 0, apps: {} });
      }
    }
    
    const addSession = (startMs: number, durationSec: number, app: string, category: string) => {
      const endMs = startMs + durationSec * 1000;
      let currentMs = startMs;
      while (currentMs < endMs) {
        const currentDate = new Date(currentMs);
        const currentDay = currentDate.getDay();
        const currentHour = currentDate.getHours();
        const calendarHourStart = new Date(currentDate);
        calendarHourStart.setMinutes(0, 0, 0);
        const hourStartMs = calendarHourStart.getTime();
        const hourEndMs = hourStartMs + 3600000;
        
        // Only process if this hour is within our target week
        if (currentDate >= targetWeekStart && currentDate < targetWeekEnd) {
          const segmentStart = Math.max(currentMs, hourStartMs);
          const segmentEnd = Math.min(endMs, hourEndMs);
          const segmentSeconds = Math.max(0, (segmentEnd - segmentStart) / 1000);
          
          if (segmentSeconds > 0) {
            const key = `${currentDay}-${currentHour}`;
            const current = cellMap.get(key) || { totalSeconds: 0, productiveSeconds: 0, apps: {} };
            const isProductive = tierAssignments?.productive?.includes(category);
            const existingApp = current.apps[app] || { seconds: 0, category };
            cellMap.set(key, {
              totalSeconds: Math.min(current.totalSeconds + segmentSeconds, 3600),
              productiveSeconds: isProductive ? Math.min(current.productiveSeconds + segmentSeconds, 3600) : current.productiveSeconds,
              apps: {
                ...current.apps,
                [app]: {
                  seconds: Math.min(existingApp.seconds + segmentSeconds, 3600),
                  category
                }
              }
            });
          }
        }
        currentMs = hourEndMs;
      }
    };
    
    for (const log of allLogs) {
      const sessionStartMs = new Date(log.timestamp).getTime();
      const durationSec = log.duration_ms ? log.duration_ms / 1000 : (log.duration || 0);
      addSession(sessionStartMs, durationSec, log.app, log.category);
    }
    
    const result: HeatmapCell[] = [];
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date(targetWeekStart);
      date.setDate(date.getDate() + dayOffset);
      const day = date.getDay();
      for (let hour = 0; hour < 24; hour++) {
        const cell = cellMap.get(`${day}-${hour}`) || { totalSeconds: 0, productiveSeconds: 0, apps: {} };
        const productivity = cell.totalSeconds > 0 ? cell.productiveSeconds / cell.totalSeconds : 0;
        
        // Get external data for this cell
        const extData = externalHourlyData.get(`${day}-${hour}`);
        const deviceSeconds = cell.totalSeconds;
        const externalSeconds = extData?.externalSeconds || 0;
        
        result.push({ 
          day, 
          hour, 
          value: cell.totalSeconds, 
          productivity,
          deviceSeconds,
          externalSeconds,
          deviceBreakdown: cell.apps,
          externalBreakdown: extData?.breakdown || {}
        });
      }
    }
    return result;
  }, [allLogs, weekOffset, tierAssignments, externalHourlyData]);

  // Use locally computed hourly heatmap data
  const heatmapData = hourlyHeatmapData;
  
  // Debug: check if data is loading
  const nonZeroCells = heatmapData.filter(c => (c.value || 0) > 0 || (c.externalSeconds || 0) > 0);
  console.log('[DEBUG] heatmapData length:', heatmapData.length, 'non-zero:', nonZeroCells.length, 'allLogs:', allLogs?.length);

  const heatmapWeekLabel = useMemo(() => {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);
    const targetWeekStart = new Date(currentWeekStart.getTime() + (weekOffset * 7 * 24 * 60 * 60 * 1000));
    const targetWeekEnd = new Date(targetWeekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${formatDate(targetWeekStart)} - ${formatDate(targetWeekEnd)}`;
  }, [weekOffset]);

    const renderHeatmap = () => {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    const getHeatColor = (cell: HeatmapCell | undefined) => {
      if (!cell) return 'rgba(55, 65, 81, 1)';
      
      let valueToUse = 0;
      let productivityToUse = 0;
      let isExternalOnly = false;
      let hasBoth = false;
      
      if (heatmapMode === 'device') {
        valueToUse = cell.deviceSeconds || cell.value || 0;
        productivityToUse = cell.productivity || 0;
      } else if (heatmapMode === 'external') {
        valueToUse = cell.externalSeconds || 0;
        productivityToUse = valueToUse > 0 ? 1 : 0;
        isExternalOnly = valueToUse > 0;
      } else {
        // Combined mode
        const hasExternal = (cell.externalSeconds || 0) > 0;
        const hasDevice = (cell.deviceSeconds || cell.value || 0) > 0;
        
        if (hasExternal && !hasDevice) {
          valueToUse = cell.externalSeconds || 0;
          productivityToUse = 1;
          isExternalOnly = true;
        } else if (!hasExternal && hasDevice) {
          valueToUse = cell.deviceSeconds || cell.value || 0;
          productivityToUse = cell.productivity || 0;
        } else {
          hasBoth = true;
          valueToUse = Math.max(cell.deviceSeconds || 0, cell.externalSeconds || 0);
          const deviceProd = cell.productivity || 0;
          const externalProd = (cell.externalSeconds || 0) > 0 ? 1 : 0;
          productivityToUse = (deviceProd + externalProd) / 2;
        }
      }
      
      if (valueToUse === 0) return 'rgba(55, 65, 81, 1)';
      
      // Intensity based on usage: max 1 hour = full opacity, more = saturated
      const maxSeconds = heatmapMode === 'external' ? 3600 : 7200; // External max 1h, device max 2h
      const intensity = Math.min(1, valueToUse / maxSeconds);
      const opacity = 0.2 + intensity * 0.8; // Range: 0.2 - 1.0
      
      // External color scheme (distinct purple)
      if (isExternalOnly || (heatmapMode === 'combined' && (cell.externalSeconds || 0) > (cell.deviceSeconds || 0))) {
        // Purple gradient: light purple = low usage, deep purple = high usage
        const r = Math.round(147 + (99 - 147) * intensity);
        const g = Math.round(51 + (102 - 51) * intensity);
        const b = Math.round(234 + (236 - 234) * intensity);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      
      // Device color scheme (red -> yellow -> green based on productivity)
      // Also used for "both" in combined mode
      const prod = Math.max(0, Math.min(1, productivityToUse));
      let r, g, b;
      
      if (hasBoth) {
        // "Both" mode: mix green (device) + purple (external) tints
        const deviceColor = prod < 0.5 
          ? { r: 239 - (239-234) * prod*2, g: 68 + (216-68) * prod*2, b: 68 + (8-68) * prod*2 }
          : { r: 234 + (34-234) * (prod-0.5)*2, g: 216 + (197-216) * (prod-0.5)*2, b: 8 + (94-8) * (prod-0.5)*2 };
        
        // Blend with purple (external) - 30% purple tint
        const purpleTint = 0.3;
        r = Math.round(deviceColor.r * (1 - purpleTint) + 99 * purpleTint);
        g = Math.round(deviceColor.g * (1 - purpleTint) + 102 * purpleTint);
        b = Math.round(deviceColor.b * (1 - purpleTint) + 236 * purpleTint);
      } else {
        // Pure device mode: red -> green gradient
        if (prod < 0.5) {
          r = Math.round(239 * (1 - prod*2) + 234 * prod*2);
          g = Math.round(68 * (1 - prod*2) + 216 * prod*2);
          b = Math.round(68 * (1 - prod*2) + 8 * prod*2);
        } else {
          r = Math.round(234 * (1 - (prod-0.5)*2) + 34 * (prod-0.5)*2);
          g = Math.round(216 * (1 - (prod-0.5)*2) + 197 * (prod-0.5)*2);
          b = Math.round(8 * (1 - (prod-0.5)*2) + 94 * (prod-0.5)*2);
        }
      }
      
      return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${opacity})`;
    };
    
    const handleDayClick = (dayIdx: number) => {
      console.log('[Dashboard] Day clicked:', dayIdx, 'weekOffset:', weekOffset);
      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);
      const targetWeekStart = new Date(currentWeekStart.getTime() + (weekOffset * 7 * 24 * 60 * 60 * 1000));
      const targetDate = new Date(targetWeekStart);
      targetDate.setDate(targetDate.getDate() + dayIdx);
      const dateStr = targetDate.toISOString().split('T')[0];
      console.log('[Dashboard] Day click date:', dateStr);
      setSelectedCell(null);
      
      if (window.deskflowAPI?.getDayDetail) {
        window.deskflowAPI.getDayDetail(dateStr).then(detail => {
          if (!detail) return;
          const items: TimelineItem[] = [];
          
          // Transform logs into timeline items
          (detail.logs || []).forEach((log: any) => {
            const logDate = new Date(log.timestamp);
            const startHour = logDate.getHours() + logDate.getMinutes() / 60;
            const durationSec = (log.duration_ms || 0) / 1000;
            const endHour = startHour + durationSec / 3600;
            const isBrowser = log.is_browser_tracking;
            const label = isBrowser ? (log.domain || log.app) : log.app;
            items.push({
              id: `log-${log.id}`,
              startHour,
              endHour: Math.min(endHour, 24),
              label,
              category: isBrowser ? 'browser' : 'app',
              color: isBrowser ? '#10b981' : '#3b82f6',
              duration: Math.round(durationSec),
              details: log.title
            });
          });
          
          // Transform external sessions into timeline items
          (detail.externalSessions || []).forEach((session: any) => {
            const startDate = new Date(session.started_at);
            const endDate = session.ended_at ? new Date(session.ended_at) : new Date();
            const startHour = startDate.getHours() + startDate.getMinutes() / 60;
            const durationSec = (endDate.getTime() - startDate.getTime()) / 1000;
            const endHour = startHour + durationSec / 3600;
            items.push({
              id: `ext-${session.id}`,
              startHour,
              endHour: Math.min(endHour, 24),
              label: session.activity_name || 'External',
              category: 'external',
              color: session.color || '#8b5cf6',
              duration: Math.round(durationSec)
            });
          });
          
          items.sort((a, b) => a.startHour - b.startHour);
          setDayDetailDate(dateStr);
          setDayDetailItems(items);
        });
      }
    };
    
    return (
      <div className="relative w-full">
        <div className="overflow-x-auto">
          <div className="w-full bg-zinc-950 rounded-2xl border border-zinc-800 p-6">
            {/* Day Headers - aligned with grid */}
            <div className="flex items-center mb-3">
              <div className="w-14 flex-shrink-0"></div>
              <div className="flex-1 flex">
                {DAYS.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`flex-1 text-center text-sm font-semibold mx-px cursor-pointer hover:text-white transition ${dayIdx === currentDay ? 'text-emerald-400' : 'text-zinc-400'}`}
                    onClick={() => handleDayClick(dayIdx)}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Mode Toggle - below day headers */}
            <div className="flex justify-end mb-3">
              <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                {(['device', 'external', 'combined'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setHeatmapMode(mode)}
                    className={`px-3 py-1.5 text-xs rounded-md transition capitalize ${heatmapMode === mode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
                  >
                    {mode === 'device' ? '📱 Device' : mode === 'external' ? '🎮 External' : '🔄 Combined'}
                  </button>
                ))}
              </div>
            </div>
             
              {Array.from({ length: 24 }, (_, hourIdx) => {
                const hourStr = hourIdx.toString().padStart(2, '0');
                return (
                  <div key={hourIdx} className="flex items-center py-[1px]">
                    <div className={`w-10 flex-shrink-0 pr-1 text-[10px] font-mono text-right text-zinc-500`}>
                      {hourStr}
                    </div>
                    {DAYS.map((_, dayIdx) => {
                      const actualHour = hourIdx;
                      const cell = heatmapData.find(c => c.day === dayIdx && c.hour === actualHour);
                      if (!cell) return <div key={dayIdx} className="flex-1 h-6 mx-px" />;
                      
                      const bgColor = getHeatColor(cell);
                      const isToday = dayIdx === currentDay;
                      const isCurrentHour = actualHour === currentHour;
                      
                      const rgbaMatch = bgColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                      const glowRgb = rgbaMatch ? `${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}` : '34, 197, 94';
                      
                      return (
                        <motion.div
                          key={dayIdx}
                          className="flex-1 h-6 mx-px rounded-md cursor-pointer relative min-w-[28px]"
                          style={{
                            backgroundColor: bgColor,
                            boxShadow: (cell.deviceSeconds || cell.externalSeconds || 0) > 70 ? `0 0 12px rgba(${glowRgb}, 0.5)` : 'inset 0 0 2px rgba(255,255,255,0.08)'
                          }}
                          onClick={() => {
                            const sameCell = selectedCell?.day === dayIdx && selectedCell?.hour === actualHour;
                            setSelectedCell(sameCell ? null : { day: dayIdx, hour: actualHour });
                            setHoveredCell({ 
                              day: dayIdx, 
                              hour: actualHour, 
                              value: cell.value, 
                              productivity: cell.productivity,
                              deviceSeconds: cell.deviceSeconds,
                              externalSeconds: cell.externalSeconds
                            });
                          }}
                          onMouseEnter={() => setHoveredCell({ 
                            day: dayIdx, 
                            hour: actualHour, 
                            value: cell.value, 
                            productivity: cell.productivity,
                            deviceSeconds: cell.deviceSeconds,
                            externalSeconds: cell.externalSeconds
                          })}
                          onMouseLeave={() => setHoveredCell(null)}
                          whileHover={{ scale: 1.08, zIndex: 20 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          {isCurrentHour && isToday && (
                            <div className="absolute inset-0 rounded-md ring-2 ring-emerald-400 ring-offset-1 ring-offset-zinc-950" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
          </div>
        </div>
        
        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredCell && !selectedCell && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute glass px-4 py-2.5 rounded-xl border border-zinc-700 shadow-xl z-50 pointer-events-none"
              style={{
                minWidth: '220px',
                left: '50%',
                transform: 'translateX(-50%)',
                top: `${(hoveredCell.hour * 26) + 50}px`
              }}
            >
              <div className="font-semibold text-white text-xs mb-2">
                {DAYS[hoveredCell.day]} • {hoveredCell.hour.toString().padStart(2, '0')}:00 – {(hoveredCell.hour + 1).toString().padStart(2, '0')}:00
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-zinc-400 text-xs">📱 Device:</span>
                  <span className="font-mono text-sm text-emerald-400 tabular-nums">
                    {formatDuration((hoveredCell.deviceSeconds || 0) * 1000)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-zinc-400 text-xs">🎮 External:</span>
                  <span className="font-mono text-sm text-purple-400 tabular-nums">
                    {formatDuration((hoveredCell.externalSeconds || 0) * 1000)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Click Detail Panel */}
        <AnimatePresence>
          {selectedCell !== null && (() => {
            const clickedCell = hourlyHeatmapData.find(c => c.day === selectedCell.day && c.hour === selectedCell.hour);
            if (!clickedCell) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 20, height: 0 }}
                className="mt-6 p-4 rounded-xl border border-zinc-700 bg-zinc-900/30 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white">
                    {DAYS[clickedCell.day]} • {selectedCell.hour.toString().padStart(2, '0')}:00 – {(selectedCell.hour + 1).toString().padStart(2, '0')}:00
                  </div>
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Device Column */}
                  <div className="space-y-3">
                    <div className="font-semibold text-emerald-400 text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      Device Activity
                    </div>
                    {clickedCell.deviceSeconds === 0 ? (
                      <div className="text-xs text-zinc-500 italic">No device activity this hour</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-zinc-400">Total Time:</span>
                          <span className="font-mono text-emerald-400">{formatDuration((clickedCell.deviceSeconds || 0) * 1000)}</span>
                        </div>
                        {(() => {
                          const breakdown = clickedCell.deviceBreakdown || {};
                          const apps = Object.entries(breakdown).sort((a, b) => b[1].seconds - a[1].seconds);
                          return apps.length > 0 ? (
                            <div className="space-y-1 border-t border-zinc-700 pt-2 mt-2">
                              {apps.map(([app, data]) => (
                                <div key={app} className="flex items-baseline justify-between text-xs">
                                  <span className="text-zinc-400 truncate flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: appColors[app] || '#6b7280' }} />
                                    {app}:
                                  </span>
                                  <span className="font-mono text-emerald-400 ml-2 flex-shrink-0">{formatDuration(data.seconds * 1000)}</span>
                                </div>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                  
                  {/* External Column */}
                  <div className="space-y-3">
                    <div className="font-semibold text-purple-400 text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-400" />
                      External Activity
                    </div>
                    {clickedCell.externalSeconds === 0 ? (
                      <div className="text-xs text-zinc-500 italic">No external activity this hour</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-zinc-400">Total Time:</span>
                          <span className="font-mono text-purple-400">{formatDuration((clickedCell.externalSeconds || 0) * 1000)}</span>
                        </div>
                        {(() => {
                          const breakdown = clickedCell.externalBreakdown || {};
                          const activities = Object.entries(breakdown).sort((a, b) => b[1].seconds - a[1].seconds);
                          
                          return activities.length > 0 ? (
                            <div className="space-y-1 border-t border-zinc-700 pt-2 mt-2">
                              {activities.map(([activity, data]: [string, any]) => (
                                <div key={activity} className="flex items-baseline justify-between text-xs">
                                  <span className="text-zinc-400 truncate flex items-center gap-1">
                                    {data.icon || '🎮'} {activity}:
                                  </span>
                                  <span className="font-mono text-purple-300 ml-2 flex-shrink-0">{formatDuration(data.seconds * 1000)}</span>
                                </div>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    );
  };

// Compute website data from allLogs (filtered by selectedPeriod + dateOffset)
  const computedWebsiteData = useMemo(() => {
    const websiteUsage: Record<string, number> = {};

    const range = selectedPeriod === 'all'
      ? { start: new Date(0), end: new Date() }
      : getDateRange(selectedPeriod, dateOffset);

    const filteredLogs = allLogs.filter(log => {
      const logTime = log.timestamp.getTime();
      return logTime >= range.start.getTime() && logTime < range.end.getTime();
    });

    filteredLogs.forEach((log: any) => {
      if (!log.is_browser_tracking) return;
      const domain = log.domain || log.url || log.app || 'Unknown';
      const durationMs = log.duration_ms || ((log.duration || 0) * 1000);
      if (!websiteUsage[domain]) {
        websiteUsage[domain] = 0;
      }
      websiteUsage[domain] += durationMs;
    });

    return Object.entries(websiteUsage)
      .map(([name, usage_ms]) => ({ name, usage_ms, category: 'Website' }))
      .sort((a, b) => b.usage_ms - a.usage_ms);
  }, [allLogs, selectedPeriod, dateOffset]);

  // Compute real solar system data from allLogs (filtered by selectedPeriod + dateOffset)
  const computedSolarData = useMemo(() => {
    const appUsage: Record<string, number> = {};
    const selectedBrowser = trackingBrowser?.toLowerCase() || '';

    const range = selectedPeriod === 'all'
      ? { start: new Date(0), end: new Date() }
      : getDateRange(selectedPeriod, dateOffset);

    const filteredLogs = allLogs.filter(log => {
      const logTime = log.timestamp.getTime();
      return logTime >= range.start.getTime() && logTime < range.end.getTime();
    });

    filteredLogs.forEach((log: any) => {
      if (!log.app) return;
      if (log.is_browser_tracking) return;
      const appLower = (log.app || '').toLowerCase();
      if (selectedBrowser && appLower.includes(selectedBrowser)) return;
      const durationMs = log.duration_ms || ((log.duration || 0) * 1000);
      if (!appUsage[log.app]) {
        appUsage[log.app] = 0;
      }
      appUsage[log.app] += durationMs;
    });

    return Object.entries(appUsage)
      .map(([name, usage_ms]) => ({ name, usage_ms, category: 'App' }))
      .sort((a, b) => b.usage_ms - a.usage_ms);
  }, [allLogs, selectedPeriod, dateOffset, trackingBrowser]);

  // Toggle for App/Website view in solar system
  const [solarMode, setSolarMode] = useState<'apps' | 'websites'>('apps');
  
  const solarData = solarMode === 'websites' ? computedWebsiteData : computedSolarData;

  const defaultSolarData: SolarSystemData[] = [
    { name: 'VS Code', usage_ms: 7200000, category: 'Tools' },
    { name: 'Chrome', usage_ms: 3600000, category: 'Browser' },
    { name: 'Antigravity', usage_ms: 1800000, category: 'IDE' },
  ];

  // Use computed data based on selectedPeriod + dateOffset (same as chart)
  const solar = solarMode === 'websites'
    ? (allLogs.length > 0 ? computedWebsiteData : defaultSolarData)
    : (allLogs.length > 0 ? computedSolarData : defaultSolarData);
  const maxUsage = Math.max(...solar.map(d => d.usage_ms), 1);

  // Border colors for different states
  const borderColor = externalSessionRunning 
    ? 'rgba(139, 92, 246, 0.3)'  // Purple for external
    : isDistracting 
      ? 'rgba(239, 68, 68, 0.3)'  // Red for distracting
      : isCurrentlyProductive 
        ? 'rgba(16, 185, 129, 0.3)'  // Green for productive
        : 'rgba(107, 114, 128, 0.3)';  // Gray for idle

  // Compute stats based on selected period
  const stats = useMemo(() => {
    const now = new Date();
    const tiers = tierAssignments || DEFAULT_TIER_ASSIGNMENTS;
    let filteredLogs = allLogs;

    if (selectedPeriod === 'today') {
      filteredLogs = allLogs.filter(log =>
        log.timestamp.getDate() === now.getDate() &&
        log.timestamp.getMonth() === now.getMonth() &&
        log.timestamp.getFullYear() === now.getFullYear()
      );
    } else if (selectedPeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredLogs = allLogs.filter(log => log.timestamp >= weekAgo);
    } else if (selectedPeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredLogs = allLogs.filter(log => log.timestamp >= monthAgo);
    }

    // Resolve category for tier lookup — apply website mapping to browser logs
    const getTierCategory = (log: ActivityLog): string => {
      const cat = log.category || 'Other';
      if (log.is_browser_tracking) {
        return WEBSITE_CATEGORY_MAP[cat] || cat;
      }
      return cat;
    };

    // Total time
    const totalTimeMs = filteredLogs.reduce((acc, log) => {
      const durationMs = log.duration_ms || ((log.duration || 0) * 1000);
      return acc + durationMs;
    }, 0);

    // Productive time
    const productiveTimeMs = filteredLogs
      .filter(log => tiers.productive.includes(getTierCategory(log)))
      .reduce((acc, log) => {
        const durationMs = log.duration_ms || ((log.duration || 0) * 1000);
        return acc + durationMs;
      }, 0);

    // Percentage
    const productivePercent = totalTimeMs > 0 ? Math.round((productiveTimeMs / totalTimeMs) * 100) : 0;

    // Longest focus session
    let longestFocusMs = 0;
    let currentFocusMs = 0;
    let inProductive = false;
    const sortedLogs = [...filteredLogs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    for (const log of sortedLogs) {
      const durationMs = log.duration_ms || ((log.duration || 0) * 1000);
      if (tiers.productive.includes(getTierCategory(log))) {
        currentFocusMs += durationMs;
        inProductive = true;
      } else {
        if (currentFocusMs > longestFocusMs) longestFocusMs = currentFocusMs;
        currentFocusMs = 0;
        inProductive = false;
      }
    }
    if (currentFocusMs > longestFocusMs) longestFocusMs = currentFocusMs;

    // Format helpers
    const formatHours = (ms: number) => {
      const hours = ms / (1000 * 60 * 60);
      return hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(ms / (1000 * 60))}m`;
    };

    return {
      totalTime: formatHours(totalTimeMs),
      totalTimeMs,
      productiveTime: formatHours(productiveTimeMs),
      productiveTimeMs,
      productivePercent,
      longestFocus: formatHours(longestFocusMs)
    };
  }, [allLogs, selectedPeriod, tierAssignments]);

  // Need state for live tick
  const [tick, setTick] = useState(0);
  
  // Live timer tick
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Calculate active session elapsed time with live updates
  const getElapsedDuration = (item: ActivityFeedItem): string => {
    if (!item.isActive || !item.startTime) return '';
    const elapsedMs = Date.now() - item.startTime;
    // SAFETY: Cap at 24 hours to prevent showing insane durations from bad startTime
    const cappedMs = Math.min(elapsedMs, 86400000); // 24 hours max
    const elapsedSec = Math.floor(cappedMs / 1000);
    const elapsedMin = Math.floor(elapsedSec / 60);
    const elapsedHr = Math.floor(elapsedMin / 60);
    
    if (elapsedHr > 0) return `${elapsedHr}:${(elapsedMin % 60).toString().padStart(2, '0')}:${(elapsedSec % 60).toString().padStart(2, '0')}`;
    return `${elapsedMin}:${(elapsedSec % 60).toString().padStart(2, '0')}`;
  };

  // Static elapsed times (for completed sessions - DURATION spent, not time ago)
  // Only re-calculate when activityFeed CHANGES, NOT on every tick
  const activityFeedWithElapsed = useMemo(() => {
    return activityFeed.slice(0, 10).map((item, index) => {
      // For completed sessions, use the DURATION from the log (seconds)
      // For active sessions (no duration yet), calculate elapsed time
      let durationSec: number;
      
      if (item.isActive) {
        // Active session - calculate time elapsed since start
        durationSec = Math.floor((Date.now() - item.startTime) / 1000);
      } else if (item.duration && item.duration > 0) {
        // Completed session with stored duration
        durationSec = item.duration;
      } else {
        // Fallback: calculate time from timestamp to next item (if exists)
        const nextItem = activityFeed[index + 1];
        if (nextItem) {
          const currentTime = new Date(item.timestamp).getTime();
          const nextTime = new Date(nextItem.timestamp).getTime();
          durationSec = Math.floor((nextTime - currentTime) / 1000);
        } else {
          durationSec = 0;
        }
      }
      
      const elapsedMin = Math.floor(durationSec / 60);
      const elapsedHr = Math.floor(elapsedMin / 60);
      
      let durationStr = '';
      if (elapsedHr > 0) durationStr = `${elapsedHr}h ${elapsedMin % 60}m`;
      else if (elapsedMin > 0) durationStr = `${elapsedMin}m`;
      else if (durationSec > 0) durationStr = `${durationSec}s`;
      else durationStr = '';
      
      const result = { ...item };
      result.elapsedStr = durationStr;
      result.isTop = index === 0;
      return result;
    });
  }, [activityFeed]);

  return (
    <div className="min-h-screen bg-black text-white" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Background grid effect */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Focus className="w-8 h-8 text-emerald-400" />
                <h1 className="text-4xl font-bold tracking-tight">Lock-In</h1>
              </div>
              <div className="text-sm text-zinc-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </motion.div>

          {/* Main Timer Section - HERO */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-12"
          >
            <div 
              className="rounded-2xl p-8 sm:p-12 border backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(10, 10, 10, 0.8)',
                borderColor,
                boxShadow: isCurrentlyProductive || externalSessionRunning ? `0 0 20px ${externalSessionRunning ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.1)'}` : 'none'
              }}
            >
              <div className="text-center space-y-6">
                {/* Status indicator - Adaptive: shows external if running */}
<motion.div
                  animate={{ opacity: (isCurrentlyProductive || externalSessionRunning || isDistracting) ? [1, 0.7, 1] : 1 }}
                  transition={{ duration: 2, repeat: (isCurrentlyProductive || externalSessionRunning || isDistracting) ? Infinity : 0 }}
                  className="flex items-center justify-center gap-3"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ 
                      backgroundColor: displayTime.label.includes('External')
                        ? '#8b5cf6'  // Purple for external
                        : isDistracting 
                          ? '#ef4444'  // Red for distracting
                          : isCurrentlyProductive 
                            ? '#10b981'  // Green for productive
                            : '#3b82f6'  // Blue for neutral/idle
                    }}
                  />
                 <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    {isPaused 
                      ? '⏸ Paused' 
                      : displayTime.label.includes('External')
                        ? displayTime.label
                          : isDistracting 
                          ? '⛔ Distracting'
                          : isCurrentlyProductive 
                            ? '🔒 Locked In' 
                            : '⏸ Idle'}
                  </span>
                </motion.div>

                {/* Giant Timer - Adaptive: shows external if running, otherwise productive */}
                <motion.div
                  key={externalSessionRunning ? 'external' : 'productive'}
                  initial={{ scale: 0.95, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-mono font-bold"
                  style={{
                    fontSize: displayTime.label.includes('External') ? '80px' : '120px',
                    lineHeight: '1',
                    color: displayTime.label.includes('External') 
                      ? '#8b5cf6'  // Purple for external
                      : isDistracting 
                        ? '#ef4444'  // Red for distracting
                        : isCurrentlyProductive 
                          ? '#10b981'  // Green for productive
                          : '#3b82f6',  // Blue for neutral/idle
                    textShadow: !isPaused && (isCurrentlyProductive || externalSessionRunning || isDistracting) 
                      ? (displayTime.label.includes('External') 
                        ? '0 0 30px rgba(139, 92, 246, 0.3)' 
                        : isDistracting 
                          ? '0 0 30px rgba(239, 68, 68, 0.3)' 
                          : isCurrentlyProductive
                            ? '0 0 30px rgba(16, 185, 129, 0.3)'
                            : '0 0 30px rgba(59, 130, 246, 0.3)') 
                      : 'none',
                    letterSpacing: '-0.02em'
                  }}
                >
                  {formatDuration(displayTime.ms)}
                </motion.div>
                
                {/* Show external activity name when running */}
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
                          backgroundColor: 'rgba(139, 92, 246, 0.2)',  // Purple
                          color: '#a78bfa'
                        }}
                      >
                        {selectedExternalActivity.name}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Current activity - show external OR regular, not both when external is running */}
                {!externalSessionRunning && (currentApp || currentWebsite || isInBrowser) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-3"
                  >
                    <div className="text-zinc-400 text-sm uppercase tracking-wider">Currently tracking</div>
                    <div className="flex items-center justify-center gap-2">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-mono font-semibold"
                        style={{
                          backgroundColor: isDistracting 
                            ? 'rgba(239, 68, 68, 0.2)'  // Red for distracting
                            : isCurrentlyProductive 
                              ? 'rgba(16, 185, 129, 0.2)'  // Green for productive
                              : 'rgba(107, 114, 128, 0.2)',  // Gray for idle
                          color: isDistracting 
                            ? '#f87171'  // Red
                            : isCurrentlyProductive 
                              ? '#34d399'  // Green
                              : '#d1d5db'  // Gray
                        }}
                      >
                        {currentWebsite ? currentWebsite.category : (currentApp?.category || (isInBrowser ? 'Browser' : 'Unknown'))}
                      </span>
                    </div>
                    <div className="text-lg font-medium text-white">
                      {currentApp ? (currentApp.app || currentApp.title) : (currentWebsite?.title || (isInBrowser ? 'Browsing...' : 'Unknown'))}
                    </div>
                  </motion.div>
                )}

                {/* Helpful message - Adaptive */}
                <div className="text-xs text-zinc-600 pt-4 border-t border-zinc-800">
                  {externalSessionRunning 
                    ? `External activity: ${selectedExternalActivity?.name}. Timer running.`
                    : (isCurrentlyProductive 
                      ? 'Productive work detected. Timer running.'
                      : 'No productive activity detected. Open an IDE, editor, or learning tool to start.')}
                </div>
                   </div>

{/* View Heatmap Button - REMOVED, now in Weekly Productivity section */}
                 </div>
          </motion.div>

          {/* Stats Cards Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12"
          >
            {/* Productive Time */}
            <div className="rounded-xl p-4 border backdrop-blur-sm" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Productive</div>
              <div className="text-2xl font-bold text-emerald-400">{stats.productiveTime}</div>
            </div>

            {/* Total Time */}
            <div className="rounded-xl p-4 border backdrop-blur-sm" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', borderColor: 'rgba(107, 114, 128, 0.2)' }}>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Total</div>
              <div className="text-2xl font-bold text-white">{stats.totalTime}</div>
            </div>

            {/* % Productive */}
            <div className="rounded-xl p-4 border backdrop-blur-sm" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', borderColor: 'rgba(107, 114, 128, 0.2)' }}>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">% Productive</div>
              <div className="text-2xl font-bold text-white">{stats.productivePercent}%</div>
            </div>

            {/* Longest Focus */}
            <div className="rounded-xl p-4 border backdrop-blur-sm" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', borderColor: 'rgba(107, 114, 128, 0.2)' }}>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Longest Focus</div>
              <div className="text-2xl font-bold text-white">{stats.longestFocus}</div>
            </div>

            {/* Reset Count */}
            <div className="rounded-xl p-4 border backdrop-blur-sm" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Resets Today</div>
              <div className="text-2xl font-bold text-red-400">{resetCount}</div>
            </div>

              {/* Adaptive Time Card - shows External if running, otherwise Productive */}
              <div className="rounded-xl p-4 border backdrop-blur-sm" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', borderColor: displayTime.label.includes('External') ? 'rgba(139, 92, 246, 0.3)' : 'rgba(107, 114, 128, 0.2)' }}>
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{displayTime.label.includes('External') ? 'External' : 'Productive'}</div>
                <div className="text-2xl font-bold" style={{ color: displayTime.label.includes('External') ? '#a78bfa' : '#10b981' }}>
                  {formatDuration(displayTime.ms)}
                </div>
              </div>
          </motion.div>

          {/* Pinned Activities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-8 border backdrop-blur-sm mb-12"
            style={{
              backgroundColor: 'rgba(10, 10, 10, 0.8)',
              borderColor: 'rgba(107, 114, 128, 0.2)'
            }}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPinnedActivitiesExpanded(!pinnedActivitiesExpanded)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${pinnedActivitiesExpanded ? 'rotate-90' : ''}`} />
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Pinned Activities</h2>
                    <p className="text-xs text-zinc-600 mt-1">Quick manual tracking</p>
                  </div>
                </button>
                <button
                  onClick={() => setPinnedActivitiesEditMode(!pinnedActivitiesEditMode)}
                  className="p-2 rounded-lg border transition-all"
                  style={{
                    backgroundColor: pinnedActivitiesEditMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.1)',
                    borderColor: pinnedActivitiesEditMode ? 'rgba(16, 185, 129, 0.5)' : 'rgba(107, 114, 128, 0.2)'
                  }}
                >
                  {pinnedActivitiesEditMode ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Edit3 className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>

              {pinnedActivitiesExpanded && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {pinnedActivities.map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.icon] || Timer;
                  const isSelected = selectedExternalActivity?.id === activity.id;
                  
                  return (
                    <motion.div key={activity.id} className="relative">
                      <motion.button
                        onClick={() => {
                          if (pinnedActivitiesEditMode) {
                            setPinnedActivities(prev => prev.filter(a => a.id !== activity.id));
                          } else {
                            handleSelectExternalActivity(activity);
                          }
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full p-4 rounded-lg border transition-all text-center"
                        style={{
                          backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.1)',
                          borderColor: isSelected ? 'rgba(16, 185, 129, 0.5)' : 'rgba(107, 114, 128, 0.2)'
                        }}
                      >
                        <Icon 
                          className="w-6 h-6 mx-auto mb-2" 
                          style={{ color: activity.is_productive ? '#10b981' : '#6366f1' }}
                        />
                        <div className="text-xs font-semibold text-white">{activity.name}</div>
                      </motion.button>
                      {pinnedActivitiesEditMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinnedActivities(prev => prev.filter(a => a.id !== activity.id));
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
                
                {/* Add activity button in edit mode */}
                {pinnedActivitiesEditMode && pinnedActivities.length < 6 && (
                  <motion.button
                    onClick={() => {
                      const available = activities.filter(a => !pinnedActivities.find(p => p.id === a.id));
                      if (available.length === 0) return;
                      if (available.length === 1) {
                        setPinnedActivities(prev => [...prev, available[0]]);
                      } else {
                        setAddPinnedPicker(available);
                        setSelectedAddActivities(new Set());
                        setShowAddActivityModal(true);
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full p-4 rounded-lg border border-dashed transition-all text-center"
                    style={{
                      backgroundColor: 'rgba(107, 114, 128, 0.05)',
                      borderColor: 'rgba(107, 114, 128, 0.3)'
                    }}
                  >
                    <Plus className="w-6 h-6 mx-auto mb-2 text-zinc-500" />
                    <div className="text-xs font-semibold text-zinc-500">Add</div>
                  </motion.button>
                )}
                
                {/* External Activity Controls */}
                {selectedExternalActivity && !pinnedActivitiesEditMode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border max-w-md mx-auto"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-white">{selectedExternalActivity.name}</div>
                      {externalSessionRunning && (
                        <div className="text-2xl font-mono font-bold text-emerald-400 mt-2">
                          {formatDuration(externalElapsedMs)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleStartExternalSession}
                        disabled={externalSessionRunning}
                        className="flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: externalSessionRunning ? 'rgba(107, 114, 128, 0.2)' : 'rgba(16, 185, 129, 0.3)',
                          color: externalSessionRunning ? '#6b7280' : '#10b981',
                          border: `1px solid ${externalSessionRunning ? 'rgba(107, 114, 128, 0.2)' : 'rgba(16, 185, 129, 0.5)'}`
                        }}
                      >
                        {externalSessionRunning ? 'Running...' : 'Start'}
                      </button>
                      <button
                        onClick={handleStopExternalSession}
                        disabled={!externalSessionRunning}
                        className="flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: externalSessionRunning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(107, 114, 128, 0.2)',
                          color: externalSessionRunning ? '#ef4444' : '#6b7280',
                          border: `1px solid ${externalSessionRunning ? 'rgba(239, 68, 68, 0.5)' : 'rgba(107, 114, 128, 0.2)'}`
                        }}
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                </motion.div>
)}
              </div>
            )}
            </div>
          </motion.div>

            {/* Add Activity Modal */}
           <AnimatePresence>
             {showAddActivityModal && (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                 onClick={() => { setShowAddActivityModal(false); setAddPinnedPicker([]); setSelectedAddActivities(new Set()); }}
               >
                 <motion.div
                   initial={{ scale: 0.92, opacity: 0, y: 10 }}
                   animate={{ scale: 1, opacity: 1, y: 0 }}
                   exit={{ scale: 0.92, opacity: 0, y: 10 }}
                   className="rounded-2xl border overflow-hidden w-full max-w-sm"
                   style={{
                     backgroundColor: 'rgba(18, 18, 18, 0.98)',
                     borderColor: 'rgba(107, 114, 128, 0.15)',
                     boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
                   }}
                   onClick={(e) => e.stopPropagation()}
                 >
                   <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{ borderColor: 'rgba(107, 114, 128, 0.1)' }}>
                     <div>
                       <h3 className="text-base font-semibold text-zinc-100">Pin Activities</h3>
                       <p className="text-xs text-zinc-500 mt-0.5">Select activities to add to dashboard</p>
                     </div>
                     <button
                       onClick={() => { setShowAddActivityModal(false); setAddPinnedPicker([]); setSelectedAddActivities(new Set()); }}
                       className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                     >
                       <X className="w-4 h-4 text-zinc-500" />
                     </button>
                   </div>

                   <div className="px-2 py-2 max-h-72 overflow-y-auto">
                     {addPinnedPicker.map(activity => {
                       const isSelected = selectedAddActivities.has(activity.id);
                       return (
                         <button
                           key={activity.id}
                           onClick={() => {
                             const next = new Set(selectedAddActivities);
                             if (isSelected) {
                               next.delete(activity.id);
                             } else {
                               next.add(activity.id);
                             }
                             setSelectedAddActivities(next);
                           }}
                           className={`w-full px-3 py-3 text-left text-sm rounded-xl flex items-center gap-3 transition-all ${
                             isSelected
                               ? 'bg-emerald-500/10'
                               : 'hover:bg-zinc-800/50'
                           }`}
                         >
                           <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                             isSelected
                               ? 'border-emerald-500 bg-emerald-500'
                               : 'border-zinc-600 bg-transparent'
                           }`}>
                             {isSelected && (
                               <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                               </svg>
                             )}
                           </div>
                           <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: activity.color }} />
                           <span className={`font-medium ${isSelected ? 'text-emerald-300' : 'text-zinc-300'}`}>
                             {activity.name}
                           </span>
                         </button>
                       );
                     })}
                   </div>

                   <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'rgba(107, 114, 128, 0.1)' }}>
                     <button
                       onClick={() => { setShowAddActivityModal(false); setAddPinnedPicker([]); setSelectedAddActivities(new Set()); }}
                       className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-all"
                     >
                       Cancel
                     </button>
                     <button
                       onClick={() => {
                         const selected = addPinnedPicker.filter(a => selectedAddActivities.has(a.id));
                         setPinnedActivities(prev => [...prev, ...selected]);
                         setShowAddActivityModal(false);
                         setAddPinnedPicker([]);
                         setSelectedAddActivities(new Set());
                       }}
                       disabled={selectedAddActivities.size === 0}
                       className="px-5 py-2 text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                       style={{
                         backgroundColor: selectedAddActivities.size > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.1)',
                         color: selectedAddActivities.size > 0 ? '#34d399' : '#6b7280',
                         border: `1px solid ${selectedAddActivities.size > 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(107, 114, 128, 0.2)'}`
                       }}
                     >
                       {selectedAddActivities.size > 0
                         ? `Add (${selectedAddActivities.size})`
                         : 'Select activities'}
                     </button>
                   </div>
                 </motion.div>
               </motion.div>
             )}
</AnimatePresence>

            {/* ══════════════════════════════════════════════════════════════
                 PRODUCTIVITY SESSIONS - Best Time, History, Ranking
                 ══════════════════════════════════════════════════════════════ */}
              {(() => {
                const [sessionsData, setSessionsData] = useState<{ sessions: any[]; stats: { todayBest: number; weekBest: number; allTimeBest: number; todayTotal: number; weekTotal: number; longestStreak: number } }>({ sessions: [], stats: { todayBest: 0, weekBest: 0, allTimeBest: 0, todayTotal: 0, weekTotal: 0, longestStreak: 0 } });
                const [minDuration, setMinDuration] = useState(300);
                const [sessionsExpanded, setSessionsExpanded] = useState(false);
                const [fetchKey, setFetchKey] = useState(0);

                const fetchSessions = useCallback(() => {
                  if (!window.deskflowAPI?.getProductivitySessions) return;
                  window.deskflowAPI.getProductivitySessions({ period: selectedPeriod, minDuration }).then((data: any) => {
                    setSessionsData(data || { sessions: [], stats: { todayBest: 0, weekBest: 0, allTimeBest: 0, todayTotal: 0, weekTotal: 0, longestStreak: 0 } });
                  }).catch(() => {});
                }, [selectedPeriod, minDuration]);

                // Clear old inflated session data once, then refresh
                useEffect(() => {
                  if (window.deskflowAPI?.clearProductivitySessions) {
                    window.deskflowAPI.clearProductivitySessions().then(() => {
                      setFetchKey(k => k + 1);
                    }).catch(() => {});
                  }
                }, []);

                // Re-fetch when deps or fetchKey change
                useEffect(() => {
                  fetchSessions();
                }, [fetchSessions, fetchKey]);

                // Auto-refresh every 5s so new sessions appear without manual reload
                useEffect(() => {
                  const interval = setInterval(() => setFetchKey(k => k + 1), 5000);
                  return () => clearInterval(interval);
                }, []);

              const fmtSec = (sec: number) => {
                const h = Math.floor(sec / 3600);
                const m = Math.floor((sec % 3600) / 60);
                const s = sec % 60;
                if (h > 0) return `${h}h ${m}m`;
                if (m > 0) return `${m}m ${s}s`;
                return `${s}s`;
              };

              const { stats } = sessionsData;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.23 }}
                  className="rounded-2xl p-8 border backdrop-blur-sm mb-8"
                  style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                >
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#10b981' }}>Focus Sessions</h2>
                        <p className="text-xs text-zinc-500 mt-1">Your best productivity times</p>
                      </div>
                      <button
                        onClick={() => setSessionsExpanded(!sessionsExpanded)}
                        className="text-xs px-3 py-1 rounded-lg border transition-colors"
                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}
                      >
                        {sessionsExpanded ? 'Hide' : 'Show'} History
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Best Today</div>
                        <div className="text-2xl font-bold" style={{ color: '#10b981' }}>{fmtSec(stats.todayBest)}</div>
                        <div className="text-[10px] text-zinc-600 mt-1">of {fmtSec(stats.todayTotal)} total</div>
                      </div>
                      <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: 'rgba(234, 179, 8, 0.05)', borderColor: 'rgba(234, 179, 8, 0.2)' }}>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Best This Week</div>
                        <div className="text-2xl font-bold" style={{ color: '#eab308' }}>{fmtSec(stats.weekBest)}</div>
                        <div className="text-[10px] text-zinc-600 mt-1">of {fmtSec(stats.weekTotal)} total</div>
                      </div>
                      <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: 'rgba(168, 85, 247, 0.05)', borderColor: 'rgba(168, 85, 247, 0.2)' }}>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">All-Time PB</div>
                        <div className="text-2xl font-bold" style={{ color: '#a855f7' }}>{fmtSec(stats.allTimeBest)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Min:</span>
                        <input
                          type="range"
                          min={60}
                          max={3600}
                          step={60}
                          value={minDuration}
                          onChange={e => setMinDuration(parseInt(e.target.value))}
                          className="w-24 h-1 rounded-lg appearance-none cursor-pointer"
                          style={{ accentColor: '#10b981' }}
                        />
                        <span className="text-xs" style={{ color: '#10b981' }}>{fmtSec(minDuration)}</span>
                      </div>
                    </div>

                    {sessionsExpanded && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {sessionsData.sessions.length === 0 ? (
                          <div className="text-center py-6 text-zinc-500 text-sm">
                            No sessions found. Start working in a productive app to build your focus history.
                          </div>
                        ) : (
                          sessionsData.sessions.map((sess: any, idx: number) => {
                            const rank = idx + 1;
                            const isGold = rank === 1;
                            const isSilver = rank === 2;
                            const isBronze = rank === 3;
                            const started = new Date(sess.started_at);
                            const timeStr = started.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                            const dateStr = started.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                            return (
                              <div
                                key={sess.id || idx}
                                className="flex items-center gap-3 p-3 rounded-lg border transition-colors"
                                style={{
                                  backgroundColor: isGold ? 'rgba(234, 179, 8, 0.08)' : isSilver ? 'rgba(148, 163, 184, 0.08)' : isBronze ? 'rgba(180, 83, 9, 0.08)' : 'rgba(107, 114, 128, 0.05)',
                                  borderColor: isGold ? 'rgba(234, 179, 8, 0.3)' : isSilver ? 'rgba(148, 163, 184, 0.3)' : isBronze ? 'rgba(180, 83, 9, 0.3)' : 'rgba(107, 114, 128, 0.15)'
                                }}
                              >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isGold ? 'text-amber-400' : isSilver ? 'text-zinc-400' : isBronze ? 'text-orange-400' : 'text-zinc-600'
                                }`} style={{
                                  backgroundColor: isGold ? 'rgba(234, 179, 8, 0.15)' : isSilver ? 'rgba(148, 163, 184, 0.15)' : isBronze ? 'rgba(180, 83, 9, 0.15)' : 'rgba(107, 114, 128, 0.1)'
                                }}>
                                  {rank}
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-white">{fmtSec(sess.duration_seconds)}</div>
                                  <div className="text-xs text-zinc-500">{dateStr} · {timeStr}{sess.app_name ? ` · ${sess.app_name}` : ''}</div>
                                </div>
                                {rank <= 3 && (
                                  <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    isGold ? 'text-amber-400' : isSilver ? 'text-zinc-300' : 'text-orange-400'
                                  }`} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                    Top {rank}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })()}

            {/* Two-Column Stats Section */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Weekly Heatmap */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl p-8 border backdrop-blur-sm transition-colors"
                style={{
                  backgroundColor: 'rgba(10, 10, 10, 0.8)',
                  borderColor: 'rgba(107, 114, 128, 0.2)'
                }}
               >
                   <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <BarChart3 className="w-4 h-4 text-zinc-500" />
                         <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Productivity</h2>
                       </div>
                       <div className="flex items-center gap-3">
                         <button
                           onClick={() => setExpandedModal('heatmap')}
                           className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-600"
                         >
                           View Heatmap
                         </button>
                       </div>
                     </div>
                     
                      {/* Date range label */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">
                          {computeChartDateRange(selectedPeriod, dateOffset).label}
                        </span>
                      </div>

                     {/* Total hours */}
                     <div className="text-lg font-bold text-emerald-400">
                       {chartBarsResult.chartBars.length > 0 ? (() => {
                         const total = chartBarsResult.chartBars.reduce((sum, bar) => sum + bar.productiveSeconds + bar.nonProductiveSeconds + bar.externalSeconds, 0);
                         return total > 0 ? `${(total / 3600).toFixed(1)}h` : '--';
                       })() : '--'}
                     </div>

                     {/* CHART */}
                     {chartBarsResult.chartBars.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                         <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
                         <span className="text-[11px]">No tracking data for this period</span>
                         <span className="text-[9px] mt-1">Start using apps to see productivity data</span>
                       </div>
                     ) : (
                        <div className="h-72">
                          <Bar
                            data={{
                              labels: chartBarsResult.chartBars.map(b => b.label),
                              datasets: [
                                {
                                  label: 'Productive',
                                  data: chartBarsResult.chartBars.map(b => Math.round((b.productiveSeconds / 3600) * 100) / 100),
                                  backgroundColor: chartBarsResult.chartBars.map(b => b.isToday ? '#10b981' : 'rgba(16, 185, 129, 0.7)'),
                                  borderRadius: 4,
                                  borderSkipped: false,
                                },
                                {
                                  label: 'Other',
                                  data: chartBarsResult.chartBars.map(b => Math.round((b.nonProductiveSeconds / 3600) * 100) / 100),
                                  backgroundColor: chartBarsResult.chartBars.map(b => b.isToday ? '#f59e0b' : 'rgba(245, 158, 11, 0.7)'),
                                  borderRadius: 4,
                                  borderSkipped: false,
                                },
                                {
                                  label: 'External',
                                  data: chartBarsResult.chartBars.map(b => Math.round((b.externalSeconds / 3600) * 100) / 100),
                                  backgroundColor: chartBarsResult.chartBars.map(b => b.isToday ? '#6366f1' : 'rgba(99, 102, 241, 0.7)'),
                                  borderRadius: 4,
                                  borderSkipped: false,
                                },
                              ],
                            }}
                           options={{
                             responsive: true,
                             maintainAspectRatio: false,
                             plugins: {
                               legend: { display: true, position: 'bottom' as const, labels: { color: '#71717a', usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 9 } } },
                               tooltip: {
                                 backgroundColor: 'rgba(39, 39, 42, 0.95)',
                                 borderColor: 'rgba(63, 63, 70, 0.5)',
                                 borderWidth: 1,
                                 titleColor: '#e4e4e7',
                                 bodyColor: '#a1a1aa',
                                 padding: 12,
                                 cornerRadius: 8,
                                 titleFont: { size: 10, weight: '600' },
                                 bodyFont: { size: 9 },
                                 displayColors: true,
                                 boxPadding: 4,
                                  callbacks: {
                                    title: (items: any[]) => items[0]?.label || '',
                                    label: (ctx: any) => {
                                      const hours = ctx.raw as number;
                                      if (hours === 0) return null;
                                      const h = Math.floor(hours);
                                      const m = Math.round((hours - h) * 60);
                                      const label = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
                                      return ` ${ctx.dataset.label}: ${label}`;
                                    },
                                  },
                               },
                             },
                             scales: {
                               x: {
                                 stacked: true,
                                 grid: { display: false },
                                 ticks: {
                                   color: '#71717a',
                                   font: { size: 9 },
                                   maxRotation: 0,
                                   autoSkip: true,
                                   maxTicksLimit: selectedPeriod === 'today' ? 12 : selectedPeriod === 'month' ? 10 : undefined,
                                 },
                               },
                               y: {
                                 stacked: true,
                                 grid: { color: '#27272a' },
                                 ticks: {
                                   color: '#71717a',
                                   font: { size: 9 },
                                   callback: (v: number) => {
                                     if (selectedPeriod === 'today') {
                                       const mins = Math.round(v * 60);
                                       return mins % 60 === 0 ? `${mins / 60}h` : `${mins}m`;
                                     }
                                     if (selectedPeriod === 'all' && v >= 24) return `${(v / 24).toFixed(0)}d`;
                                     return `${v}h`;
                                   },
                                 },
                                 suggestedMax: yAxisTicks.niceMax,
                               },
                             },
                           }}
                         />
                       </div>
                     )}
                   </div>
                </motion.div>

                {/* App Usage Solar System */}
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3 }}
                 className="rounded-2xl p-8 border backdrop-blur-sm transition-colors"
                 style={{
                   backgroundColor: 'rgba(10, 10, 10, 0.8)',
                   borderColor: 'rgba(107, 114, 128, 0.2)'
                 }}
               >
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">App Ecosystem</h2>
                       <p className="text-xs text-zinc-600 mt-1">Your top tools in orbit</p>
                     </div>
                     <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                       {/* Solar mode toggle */}
                       <button
                         onClick={(e) => { e.stopPropagation(); setSolarMode('apps'); }}
                         className={`px-2 py-1 text-xs rounded transition-colors ${solarMode === 'apps' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                       >
                         Apps
                       </button>
                       <button
                         onClick={(e) => { e.stopPropagation(); setSolarMode('websites'); }}
                         className={`px-2 py-1 text-xs rounded transition-colors ${solarMode === 'websites' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                       >
                         Websites
                       </button>
                       <div className="ml-2">
                         <span className="text-xs text-zinc-500">
                           {dateOffset === 0 && selectedPeriod === 'today' ? 'Today' : 
                            dateOffset === 0 && selectedPeriod === 'week' ? 'This Week' : 
                            dateOffset === 0 && selectedPeriod === 'month' ? 'This Month' :
                            dateOffset === 0 && selectedPeriod === 'all' ? 'All Time' :
                            `${selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'Week' : selectedPeriod === 'month' ? 'Month' : 'Period'} -${dateOffset}`}
                         </span>
                       </div>
                     </div>
                   </div>
<div className="relative h-64 flex items-center justify-center">
                      <div className="absolute w-12 h-12 rounded-full border border-zinc-700 flex items-center justify-center">
                        <Sun className="w-6 h-6 text-zinc-600" />
                      </div>
                      
                      {solar.slice(0, 5).map((app, i) => {
                       const size = Math.max(70, 24 + (app.usage_ms / maxUsage) * 48);
                       const angle = (i * 360) / Math.min(solar.length, 5);
                       const radius = 70 + (i % 2) * 35;
                       const rad = (angle * Math.PI) / 180;
                       const x = Math.cos(rad) * radius;
                       const y = Math.sin(rad) * radius;
                       
                       return (
                         <motion.div
                           key={app.name}
                           initial={{ scale: 0, x: 0, y: 0 }}
                           animate={{ scale: 1, x, y }}
                           transition={{ delay: 0.3 + i * 0.1 }}
                           className="absolute"
                           style={{ 
                             width: Math.max(size, 60),
                             height: Math.max(size, 60),
                           }}
                           title={`${app.name}: ${Math.round((app.usage_ms / 1000 / 3600) * 10) / 10}h`}
                         >
                           {/* Circle with text inside - NO truncation */}
                           <div 
                             className="w-full h-full rounded-full border border-zinc-700 hover:border-zinc-500 transition-colors flex flex-col items-center justify-center"
                             style={{ 
                               backgroundColor: 'rgba(24, 24, 27, 0.9)',
                               cursor: 'pointer'
                             }}
                           >
                             {/* App name - FULL name, no truncate */}
                             <div className="text-xs font-semibold text-zinc-300 px-2 text-center">
                               {app.name}
                             </div>
                             {/* Duration */}
                             <div className="text-[10px] text-zinc-500 mt-0.5">
                               {Math.round((app.usage_ms / 1000 / 3600) * 10) / 10}h
                             </div>
                           </div>
                         </motion.div>
                       );
                     })}
                  </div>

                  {/* View Solar System Button */}
                  <button
                    onClick={() => setExpandedModal('solar')}
                    className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-sm text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-600"
                  >
                    View Solar System
                  </button>
                 </div>
               </motion.div>
          </div>

{/* Expanded Heatmap Modal */}
           <AnimatePresence>
             {expandedModal === 'heatmap' && (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                 onClick={() => setExpandedModal(null)}
               >
<motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="rounded-2xl p-8 border max-w-4xl w-full max-h-[90vh] overflow-auto"
                    style={{
                      backgroundColor: 'rgba(10, 10, 10, 0.95)',
                      borderColor: 'rgba(107, 114, 128, 0.2)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-semibold uppercase tracking-wider text-zinc-200">Activity Heatmap</h2>
                        <p className="text-xs text-zinc-600 mt-1">{heatmapWeekLabel}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setWeekOffset(w => w - 1)}
                          className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                          title="Previous week"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setWeekOffset(0)}
                          className="px-2 py-1 text-xs text-zinc-400 hover:text-white transition"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
                          disabled={weekOffset >= 0}
                          className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Next week"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedModal(null)}
                          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors ml-2"
                        >
                          <X className="w-5 h-5 text-zinc-400" />
                        </button>
                      </div>
                    </div>
                    
                    {renderHeatmap()}
                  </motion.div>
               </motion.div>
             )}
            </AnimatePresence>

{/* Day Detail Popup */}
            <Suspense fallback={null}>
              {dayDetailDate && (
                <DayDetailPopup
                  date={dayDetailDate}
                  items={dayDetailItems}
                  onClose={() => { setDayDetailDate(null); setDayDetailItems([]); }}
                />
              )}
            </Suspense>

{/* Expanded Solar System Modal */}
            <AnimatePresence>
              {expandedModal === 'solar' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => setExpandedModal(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className={solarFullscreen ? "fixed inset-0 z-50 bg-black flex flex-col" : "rounded-2xl p-8 border max-w-4xl w-full max-h-[90vh] overflow-hidden"}
                    style={{
                      backgroundColor: 'rgba(10, 10, 10, 0.95)',
                      borderColor: solarFullscreen ? 'transparent' : 'rgba(107, 114, 128, 0.2)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header with timeline selector */}
                    <div className={`flex items-center justify-between px-4 pt-4 ${solarFullscreen ? '' : 'mb-4'}`}>
                      <div>
                        <h2 className="text-lg font-semibold uppercase tracking-wider text-zinc-200">App Ecosystem</h2>
                        <p className="text-xs text-zinc-600 mt-1">Your top tools in orbit</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSolarFullscreen(!solarFullscreen)}
                          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                          title={solarFullscreen ? "Exit fullscreen" : "Fullscreen"}
                        >
                          {solarFullscreen ? <Minimize2 className="w-5 h-5 text-zinc-400" /> : <Maximize2 className="w-5 h-5 text-zinc-400" />}
                        </button>
                        <button
                          onClick={() => { setExpandedModal(null); setSolarFullscreen(false); }}
                          className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
                          title="Close"
                        >
                          <X className="w-5 h-5 text-zinc-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* OrbitSystem container */}
                    <Suspense fallback={<div className="h-[400px] flex items-center justify-center"><div className="text-zinc-400">Loading 3D visualization...</div></div>}>
                      <div className={solarFullscreen ? 'w-full h-screen' : 'h-[500px] w-full'}>
                        <OrbitSystem 
                          logs={allLogs} 
                          websiteLogs={browserLogs}
                          appColors={appColors}
                          categoryOverrides={categoryOverrides}
                        />
                      </div>
                    </Suspense>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-3xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Recent Sessions</h2>
            </div>
            
<div className="space-y-2">
              {activityFeedWithElapsed.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No sessions tracked yet. Start using your apps and websites to build a history.
                </div>
              ) : (
                [...activityFeedWithElapsed].reverse().map((item) => {
                  const tierColor = item.tier === 'productive' ? 'text-emerald-400' : 
                                   item.tier === 'distracting' ? 'text-red-400' : 'text-blue-400';
                  const bgColor = item.tier === 'productive' ? 'bg-emerald-500/10' : 
                                   item.tier === 'distracting' ? 'bg-red-500/10' : 'bg-blue-500/10';
                  const isActive = item.isActive;
                  const durationStr = isActive ? getElapsedDuration(item) : item.elapsedStr;
                  // For past items: show TIME SPENT, not "ago"
                  const statusLabel = isActive ? 'Active' : (item.elapsedStr ? item.elapsedStr : '');
                  
                  return (
                    <div key={item.id} className={`p-3 rounded-lg ${bgColor} border ${
                      item.tier === 'productive' ? 'border-emerald-500/20' : 
                      item.tier === 'distracting' ? 'border-red-500/20' : 'border-blue-500/20'
                    } flex items-center justify-between`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                          <span className="text-sm font-medium text-white">{item.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{item.category}</span>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${tierColor}`}>
                            {item.tier.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {item.timestamp.toLocaleTimeString()} • {item.type === 'app' ? 'App' : 'Website'}{statusLabel ? ` • ${statusLabel}` : ''}
                          {isActive && durationStr && <span className="ml-2 font-mono text-emerald-400">{durationStr}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
