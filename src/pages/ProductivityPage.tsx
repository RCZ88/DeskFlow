import { useMemo, useEffect, useState } from 'react';
import { 
  Target, TrendingUp, TrendingDown, Clock, Award, Zap,
  Monitor, Globe, BarChart3, Info,
  PieChart as PieChartIcon, ArrowUp, ArrowDown, Minus,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { format, subDays, eachDayOfInterval, startOfDay, isToday } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

// Website category to app category mapping
const WEBSITE_CATEGORY_MAP: Record<string, string> = {
  'Developer Tools': 'Tools', // Map to Tools for productive tier
  'AI Tools': 'AI Tools',
  'Social Media': 'Social Media',
  'Entertainment': 'Entertainment',
  'News': 'News',
  'Shopping': 'Shopping',
  'Productivity': 'Productivity',
  'Design': 'Design',
  'Search Engine': 'Productivity', // Search engines can be productive
  'Communication': 'Communication',
  'Education': 'Education',
  'Uncategorized': 'Uncategorized',
  'Other': 'Other'
};

// Default tier assignments (must match actual app categories + website categories)
const DEFAULT_TIER_ASSIGNMENTS = {
  productive: ['IDE', 'AI Tools', 'Education', 'Productivity', 'Tools'],
  neutral: ['Browser', 'Communication', 'Design', 'News', 'Search Engine', 'Uncategorized', 'Other'],
  distracting: ['Entertainment', 'Social Media', 'Shopping']
};

// Tier weights for productivity calculation
const TIER_WEIGHTS = {
  productive: 1.0,
  neutral: 0.5,
  distracting: 0.0
};

interface AppStat {
  app: string;
  category: string;
  total_ms: number;
  sessions: number;
  avg_session_ms: number;
}

interface BrowserStat {
  domain: string;
  category: string;
  total_ms: number;
  sessions: number;
}

interface ProductivityPageProps {
  appStats?: AppStat[];
  browserStats?: BrowserStat[];
  logs?: unknown[];
  browserLogs?: unknown[];
  tierAssignments?: typeof DEFAULT_TIER_ASSIGNMENTS;
  selectedPeriod?: 'today' | 'week' | 'month' | 'all';
  domainKeywordRules?: Record<string, string[]>;
  timeMode?: 'focus' | 'total';
}

interface AppStat {
  app: string;
  category: string;
  total_ms: number;
  sessions: number;
  avg_session_ms: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatHours(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = (seconds / 3600).toFixed(1);
  return `${h}h`;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'IDE': '#6366f1',
    'AI Tools': '#8b5cf6',
    'Education': '#10b981',
    'Productivity': '#14b8a6',
    'Tools': '#f59e0b',
    'Browser': '#3b82f6',
    'Communication': '#14b8a6',
    'Design': '#ec4899',
    'News': '#f97316',
    'Search Engine': '#3b82f6',
    'Entertainment': '#ef4444',
    'Social Media': '#64748b',
    'Shopping': '#f97316',
    'Uncategorized': '#71717a',
    'Other': '#71717a',
    'Developer Tools': '#6366f1'
  };
  return colors[category] || '#71717a';
}

export default function ProductivityPage({ 
  appStats = [], 
  logs = [],
  browserLogs: browserLogsProp = [],
  tierAssignments = DEFAULT_TIER_ASSIGNMENTS,
  selectedPeriod = 'week',
  domainKeywordRules = {},
  timeMode = 'total'
}: ProductivityPageProps) {
  // Cleanup Chart.js instances on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Chart instances are automatically destroyed by react-chartjs-2 on unmount
      // but we clear any global references
      console.log('[ProductivityPage] Cleaning up on unmount');
    };
  }, []);
  
  // Persisted expand state for website domains
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('productivity-expanded-domains');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  
  // Tier filter state - to show apps/websites by productivity category
  const [tierFilter, setTierFilter] = useState<'all' | 'productive' | 'neutral' | 'distracting'>('all');

  const toggleDomain = (domain: string) => {
    setExpandedDomains(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domain)) {
        newSet.delete(domain);
      } else {
        newSet.add(domain);
      }
      localStorage.setItem('productivity-expanded-domains', JSON.stringify([...newSet]));
      return newSet;
    });
  };
  
  // Compute browserStats from browserLogs prop (passed from parent App.tsx)
  const browserStats = useMemo(() => {
    const grouped: Record<string, { domain: string; category: string; total_ms: number; sessions: number; avg_session_ms: number }> = {};
    for (const log of browserLogsProp) {
      const domain = (log as any).domain || 'Unknown';
      const category = (log as any).category || 'Uncategorized';
      const duration_ms = ((log as any).duration || 0) * 1000;
      
      if (!grouped[domain]) {
        grouped[domain] = { domain, category, total_ms: 0, sessions: 0, avg_session_ms: 0 };
      }
      grouped[domain].total_ms += duration_ms;
      grouped[domain].sessions += 1;
    }
    
    const stats = Object.values(grouped);
    for (const stat of stats) {
      stat.avg_session_ms = stat.sessions > 0 ? stat.total_ms / stat.sessions : 0;
    }
    return stats;
  }, [browserLogsProp]);

  // Compute all websites grouped by domain for the websites section
  const allWebsites = useMemo(() => {
    // Include ALL websites - no filtering
    const allLogs = browserLogsProp;

    // Group by domain
    const grouped: Record<string, any[]> = {};
    for (const log of allLogs) {
      const domain = (log as any).domain || 'Unknown';
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push(log);
    }

    // Create domain stats
    const domainStats = Object.entries(grouped).map(([domain, logs]) => {
      const totalSeconds = logs.reduce((sum, log) => sum + ((log as any).duration || 0), 0);
      
      // Calculate dominant category for the domain
      const categoryDurations: Record<string, number> = {};
      for (const log of logs) {
        const cat = WEBSITE_CATEGORY_MAP[(log as any).category] || (log as any).category || 'Other';
        categoryDurations[cat] = (categoryDurations[cat] || 0) + ((log as any).duration || 0);
      }
      
      // Find dominant category (highest duration)
      const dominantCategory = Object.entries(categoryDurations)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Other';
      
      // Sort logs by duration (highest first)
      const sortedLogs = [...logs].sort((a, b) => (b as any).duration - (a as any).duration);

      return {
        domain,
        totalSeconds,
        dominantCategory,
        logs: sortedLogs,
        hasKeywordRules: !!domainKeywordRules[domain]
      };
    });

    // Sort domains by total time (highest first)
    return domainStats.sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [browserLogsProp, tierAssignments, domainKeywordRules]);

  // Filtered websites based on tier filter
  const filteredWebsites = useMemo(() => {
    return allWebsites.filter(site => {
      const siteTier = tierAssignments.productive.includes(site.dominantCategory) ? 'productive' :
        tierAssignments.distracting.includes(site.dominantCategory) ? 'distracting' : 'neutral';
      return tierFilter === 'all' || siteTier === tierFilter;
    });
  }, [allWebsites, tierFilter, tierAssignments]);

  // Calculate combined productivity data
  const productivityData = useMemo(() => {
    // Normalize app durations (ms -> seconds)
    // Fix: appStats from parent can be object with appBreakdown array, not raw array
    const appArray = Array.isArray(appStats) ? appStats : (appStats?.appBreakdown || []);
    const appItems = appArray.map((a: any) => ({
      name: a.app || 'Unknown',
      category: a.category || 'Other',
      type: 'app' as const,
      duration_sec: (a.total_ms || 0) / 1000
    }));

    // Normalize browser durations (ms -> seconds) and map categories
    const browserItems = (browserStats || []).map((b: any) => ({
      name: b.domain || 'Unknown',
      category: WEBSITE_CATEGORY_MAP[b.category] || 'Other',
      originalCategory: b.category,
      type: 'website' as const,
      duration_sec: (b.total_ms || 0) / 1000
    }));

    // Combine all items - ALWAYS include both apps and websites
    const allItems = [...appItems, ...browserItems];

    // Calculate totals by tier
    const tierTotals = {
      productive: { seconds: 0, items: [] as typeof allItems },
      neutral: { seconds: 0, items: [] as typeof allItems },
      distracting: { seconds: 0, items: [] as typeof allItems }
    };

    for (const item of allItems) {
      let assignedTier: 'productive' | 'neutral' | 'distracting' | null = null;

      if (tierAssignments.productive.includes(item.category)) {
        assignedTier = 'productive';
      } else if (tierAssignments.neutral.includes(item.category)) {
        assignedTier = 'neutral';
      } else if (tierAssignments.distracting.includes(item.category)) {
        assignedTier = 'distracting';
      } else {
        // Default to neutral if category not found
        assignedTier = 'neutral';
      }

      tierTotals[assignedTier].seconds += item.duration_sec;
      tierTotals[assignedTier].items.push(item);
    }

    // Calculate weighted score
    const totalSeconds = tierTotals.productive.seconds + tierTotals.neutral.seconds + tierTotals.distracting.seconds;
    const weightedSeconds = 
      tierTotals.productive.seconds * TIER_WEIGHTS.productive +
      tierTotals.neutral.seconds * TIER_WEIGHTS.neutral +
      tierTotals.distracting.seconds * TIER_WEIGHTS.distracting;

    const productivityScore = totalSeconds > 0 ? (weightedSeconds / totalSeconds) * 100 : 0;

    // Calculate app vs website breakdown
    const appTotalSec = appItems.reduce((sum, a) => sum + a.duration_sec, 0);
    const websiteTotalSec = browserItems.reduce((sum, b) => sum + b.duration_sec, 0);

    // App vs Website productivity breakdown
    const appProductiveSec = appItems.filter(i => tierAssignments.productive.includes(i.category)).reduce((s, i) => s + i.duration_sec, 0);
    const appNeutralSec = appItems.filter(i => tierAssignments.neutral.includes(i.category)).reduce((s, i) => s + i.duration_sec, 0);
    const appDistractingSec = appItems.filter(i => tierAssignments.distracting.includes(i.category)).reduce((s, i) => s + i.duration_sec, 0);
    const webProductiveSec = browserItems.filter(i => tierAssignments.productive.includes(i.category)).reduce((s, i) => s + i.duration_sec, 0);
    const webNeutralSec = browserItems.filter(i => tierAssignments.neutral.includes(i.category)).reduce((s, i) => s + i.duration_sec, 0);
    const webDistractingSec = browserItems.filter(i => tierAssignments.distracting.includes(i.category)).reduce((s, i) => s + i.duration_sec, 0);

    const appScore = appTotalSec > 0 ? ((appProductiveSec * 1.0 + appNeutralSec * 0.5) / appTotalSec) * 100 : 0;
    const webScore = websiteTotalSec > 0 ? ((webProductiveSec * 1.0 + webNeutralSec * 0.5) / websiteTotalSec) * 100 : 0;

    // Top items by tier (sorted by duration)
    const topProductive = [...tierTotals.productive.items]
      .sort((a, b) => b.duration_sec - a.duration_sec)
      .slice(0, 10);

    const topNeutral = [...tierTotals.neutral.items]
      .sort((a, b) => b.duration_sec - a.duration_sec)
      .slice(0, 10);

    const topDistracting = [...tierTotals.distracting.items]
      .sort((a, b) => b.duration_sec - a.duration_sec)
      .slice(0, 10);

    // Calculate sum of displayed items (for accurate header display)
    const displayedAppItems = topProductive.filter(i => i.type === 'app');
    const displayedWebsiteItems = topProductive.filter(i => i.type === 'website');
    const displayedAppTotalSec = displayedAppItems.reduce((sum, a) => sum + a.duration_sec, 0);
    const displayedWebsiteTotalSec = displayedWebsiteItems.reduce((sum, b) => sum + b.duration_sec, 0);

    return {
      score: productivityScore,
      totalSeconds,
      weightedSeconds,
      appSeconds: appTotalSec,
      websiteSeconds: websiteTotalSec,
      displayedAppSeconds: displayedAppTotalSec,
      displayedWebsiteSeconds: displayedWebsiteTotalSec,
      appVsWeb: {
        app: { totalSec: appTotalSec, productiveSec: appProductiveSec, neutralSec: appNeutralSec, distractingSec: appDistractingSec, score: appScore, count: appItems.length },
        web: { totalSec: websiteTotalSec, productiveSec: webProductiveSec, neutralSec: webNeutralSec, distractingSec: webDistractingSec, score: webScore, count: browserItems.length }
      },
      tiers: {
        productive: { seconds: tierTotals.productive.seconds, count: tierTotals.productive.items.length },
        neutral: { seconds: tierTotals.neutral.seconds, count: tierTotals.neutral.items.length },
        distracting: { seconds: tierTotals.distracting.seconds, count: tierTotals.distracting.items.length }
      },
      topProductive,
      topNeutral,
      topDistracting,
      items: allItems
    };
  }, [appStats, browserStats, logs, browserLogsProp, tierAssignments]);

  // Calculate daily trend data
  const dailyTrend = useMemo(() => {
    const now = new Date();
    
    // For 'today', show hourly breakdown with 24 separate hour columns
    if (selectedPeriod === 'today') {
      const hourBuckets = Array.from({ length: 24 }, (_, hour) => {
        const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour);
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
        
        const hourLogs = [...(logs as any[]), ...(browserLogsProp as any[])].filter(log => {
          const logTime = new Date(log.timestamp || log.start_time);
          return logTime >= hourStart && logTime < hourEnd;
        });
        
        let productive = 0, neutral = 0, distracting = 0;
        
        for (const log of hourLogs) {
          const sessionStart = new Date(log.timestamp || log.start_time).getTime();
          const sessionEnd = sessionStart + ((log.duration_ms || (log.duration || 0) * 1000));
          
          let currentMs = sessionStart;
          while (currentMs < sessionEnd) {
            const currentHour = new Date(currentMs).getHours();
            const segmentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour).getTime();
            const segmentHourEnd = segmentHourStart + 3600000;
            const segmentStart = Math.max(currentMs, segmentHourStart);
            const segmentEnd = Math.min(sessionEnd, segmentHourEnd);
            const segmentSeconds = Math.max(0, (segmentEnd - segmentStart) / 1000);
            
            if (segmentSeconds > 0 && currentHour === hour) {
              const category = log.category || WEBSITE_CATEGORY_MAP[log.category] || 'Other';
              if (tierAssignments.productive.includes(category)) {
                productive += segmentSeconds;
              } else if (tierAssignments.distracting.includes(category)) {
                distracting += segmentSeconds;
              } else {
                neutral += segmentSeconds;
              }
            }
            currentMs = Math.min(currentMs + 3600000, sessionEnd);
          }
        }
        
        const total = productive + neutral + distracting;
        const weighted = productive + (neutral * 0.5);
        const score = total > 0 ? (weighted / total) * 100 : 0;
        
        return {
          date: format(hourStart, 'yyyy-MM-dd-HH'),
          label: format(hourStart, 'HH:mm'),
          hour: hour,
          score: Math.round(score),
          productive: Math.round(productive),
          neutral: Math.round(neutral),
          distracting: Math.round(distracting),
          total: Math.round(total),
          isToday: true,
          isCurrentHour: hour === now.getHours()
        };
      });
      
      return hourBuckets;
    }
    
    // For week/month/all, show daily breakdown
    const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90;
    const startDate = subDays(now, days - 1);
    const daysInRange = eachDayOfInterval({ start: startDate, end: now });

    return daysInRange.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      // Filter logs for this day
      const dayLogs = [...(logs as any[]), ...(browserLogsProp as any[])].filter(log => {
        const logTime = new Date(log.timestamp || log.start_time);
        return logTime >= dayStart && logTime < dayEnd;
      });

      // Calculate productivity for this day
      let productive = 0, neutral = 0, distracting = 0;
      
      for (const log of dayLogs) {
        // Handle both duration (seconds) and duration_ms (milliseconds)
        const duration_sec = log.duration_ms ? log.duration_ms / 1000 : (log.duration || 0);
        const category = log.category || WEBSITE_CATEGORY_MAP[log.category] || 'Other';
        
        if (tierAssignments.productive.includes(category)) {
          productive += duration_sec;
        } else if (tierAssignments.distracting.includes(category)) {
          distracting += duration_sec;
        } else {
          neutral += duration_sec;
        }
      }

      const total = productive + neutral + distracting;
      const weighted = productive + (neutral * 0.5);
      const score = total > 0 ? (weighted / total) * 100 : 0;

      return {
        date: format(day, 'yyyy-MM-dd'),
        label: format(day, selectedPeriod === 'week' ? 'EEE' : 'MMM d'),
        score: Math.round(score),
        productive: Math.round(productive),
        neutral: Math.round(neutral),
        distracting: Math.round(distracting),
        total: Math.round(total),
        isToday: isToday(day),
        isCurrentHour: false
      };
    });
  }, [logs, browserLogsProp, selectedPeriod, tierAssignments]);

  // Calculate comparison with previous period
  const comparison = useMemo(() => {
    if (dailyTrend.length < 2) return null;
    
    const currentScore = productivityData.score;
    const previousTrend = dailyTrend.slice(0, -1);
    const previousAvg = previousTrend.length > 0 
      ? previousTrend.reduce((sum, d) => sum + d.score, 0) / previousTrend.length 
      : currentScore;
    
    const diff = currentScore - previousAvg;
    const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
    
    return {
      current: currentScore,
      previous: previousAvg,
      diff: Math.abs(diff),
      direction
    };
  }, [dailyTrend, productivityData.score]);

  // Peak hours calculation (average across all days in period)
  const peakHours = useMemo(() => {
    if (dailyTrend.length === 0) return null;
    
    // Group by hour of day (0-23) and calculate averages
    const hourTotals: Record<number, { productive: number; neutral: number; distracting: number; count: number }> = {};
    
    // For 'today', use the hourly data directly
    if (selectedPeriod === 'today') {
      dailyTrend.forEach((d: any) => {
        if (d.hour !== undefined) {
          hourTotals[d.hour] = {
            productive: d.productive,
            neutral: d.neutral,
            distracting: d.distracting,
            count: 1
          };
        }
      });
    } else {
      // For week/month, get hourly distribution - need to calculate from original logs
      const now = new Date();
      const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Aggregate by hour
      const allLogs = [...(logs as any[]), ...(browserLogsProp as any[])];
      allLogs.forEach((log: any) => {
        const logTime = new Date(log.timestamp || log.start_time);
        if (logTime >= startDate && logTime <= now) {
          const hour = logTime.getHours();
          const duration = (log.duration || 0);
          const category = tierAssignments.productive.includes(log.category) ? 'productive' :
            tierAssignments.distracting.includes(log.category) ? 'distracting' : 'neutral';
          
          if (!hourTotals[hour]) {
            hourTotals[hour] = { productive: 0, neutral: 0, distracting: 0, count: 0 };
          }
          if (category === 'productive') hourTotals[hour].productive += duration;
          else if (category === 'distracting') hourTotals[hour].distracting += duration;
          else hourTotals[hour].neutral += duration;
        }
      });
    }
    
    // Calculate scores for each hour
    const hourScores = Object.entries(hourTotals).map(([hour, data]) => {
      const total = data.productive + data.neutral + data.distracting;
      const weighted = data.productive + (data.neutral * 0.5);
      const score = total > 0 ? (weighted / total) * 100 : 0;
      return {
        hour: parseInt(hour),
        score,
        productive: data.productive,
        neutral: data.neutral,
        distracting: data.distracting,
        total
      };
    }).sort((a, b) => b.score - a.score);
    
    if (hourScores.length === 0) return null;
    
    const mostProductive = hourScores[0];
    const leastProductive = hourScores[hourScores.length - 1];
    const avgScore = hourScores.reduce((sum, h) => sum + h.score, 0) / hourScores.length;
    
    // Format hour to 12h format
    const formatHour = (h: number) => {
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12}:00 ${suffix}`;
    };
    
    return {
      mostProductive: { hour: mostProductive.hour, label: formatHour(mostProductive.hour), score: Math.round(mostProductive.score), diff: Math.round(mostProductive.score - avgScore) },
      leastProductive: { hour: leastProductive.hour, label: formatHour(leastProductive.hour), score: Math.round(leastProductive.score), diff: Math.round(leastProductive.score - avgScore) },
      avgScore: Math.round(avgScore),
      hourlyData: hourScores.sort((a, b) => a.hour - b.hour)
    };
  }, [dailyTrend, selectedPeriod, logs, browserLogsProp, tierAssignments]);

  // Chart data for daily trend
  const trendChartData = {
    labels: dailyTrend.map(d => d.label),
    datasets: [{
      label: 'Productivity Score',
      data: dailyTrend.map(d => d.score),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: dailyTrend.map(d => d.isCurrentHour ? '#22c55e' : (d.isToday ? '#22c55e' : '#22c55e88')),
      pointBorderColor: dailyTrend.map(d => d.isCurrentHour ? '#fff' : (d.isToday ? '#fff' : 'transparent')),
      pointBorderWidth: dailyTrend.map(d => d.isCurrentHour ? 2 : (d.isToday ? 2 : 0)),
      pointRadius: dailyTrend.map(d => d.isCurrentHour ? 8 : (d.isToday ? 6 : 3)),
      pointHoverRadius: 8
    }]
  };

  // Distribution chart (pie)
  const distributionData = {
    labels: ['Productive', 'Neutral', 'Distracting'],
    datasets: [{
      data: [
        productivityData.tiers.productive.seconds,
        productivityData.tiers.neutral.seconds,
        productivityData.tiers.distracting.seconds
      ],
      backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(239, 68, 68, 0.8)'],
      borderColor: '#0a0a0a',
      borderWidth: 2
    }]
  };

  // Time breakdown bar chart - convert to hours
  const timeBreakdownData = {
    labels: dailyTrend.map(d => d.label),
    datasets: [
      {
        label: 'Productive',
        data: dailyTrend.map(d => d.productive / 3600), // convert seconds to hours
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 4
      },
      {
        label: 'Neutral',
        data: dailyTrend.map(d => d.neutral / 3600),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4
      },
      {
        label: 'Distracting',
        data: dailyTrend.map(d => d.distracting / 3600),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 4
      }
    ]
  };

  // Build sessions list from logs (app sessions) and browserLogs (website sessions)
  const sessions = useMemo(() => {
    const getTier = (category: string): 'productive' | 'neutral' | 'distracting' => {
      if (tierAssignments.productive.includes(category)) return 'productive';
      if (tierAssignments.distracting.includes(category)) return 'distracting';
      return 'neutral';
    };

    const appSessions = (logs as any[] || []).map(log => ({
      type: 'app',
      name: log.app || 'Unknown',
      category: log.category || 'Other',
      duration_ms: (log.duration || 0) * 1000,
      timestamp: new Date(log.timestamp || Date.now()),
      tier: getTier(log.category)
    }));

    const websiteSessions = (browserLogsProp as any[] || []).map(log => ({
      type: 'website',
      name: log.domain || 'Unknown',
      category: WEBSITE_CATEGORY_MAP[log.category] || 'Other',
      duration_ms: (log.duration || 0) * 1000,
      timestamp: new Date(log.start_time || Date.now()),
      tier: getTier(WEBSITE_CATEGORY_MAP[log.category] || log.category)
    }));

    return [...appSessions, ...websiteSessions]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  }, [logs, browserLogsProp, tierAssignments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Target className="w-8 h-8 text-emerald-400" />
            Productivity
          </h1>
          <p className="text-zinc-500 mt-1">Apps vs Websites — where your time goes</p>
        </div>
      </div>

      {/* Main Score Card */}
      <div className="glass rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-3xl font-bold text-white">{Math.round(productivityData.score)}</span>
            </div>
            <div>
              <div className="text-2xl font-semibold">Productivity Score</div>
              <div className="text-sm text-zinc-500">
                Based on {formatDuration(productivityData.totalSeconds)} of tracked activity
              </div>
            </div>
          </div>
          
          {comparison && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              comparison.direction === 'up' ? 'bg-emerald-500/20 text-emerald-400' :
              comparison.direction === 'down' ? 'bg-red-500/20 text-red-400' :
              'bg-zinc-800 text-zinc-400'
            }`}>
              {comparison.direction === 'up' && <ArrowUp className="w-5 h-5" />}
              {comparison.direction === 'down' && <ArrowDown className="w-5 h-5" />}
              {comparison.direction === 'neutral' && <Minus className="w-5 h-5" />}
              <span className="font-semibold">{comparison.diff.toFixed(1)}%</span>
              <span className="text-sm opacity-70">vs avg</span>
            </div>
          )}
        </div>

        {/* Time Breakdown - based on tierFilter */}
        {(() => {
          // Get the correct items based on tierFilter
          let filteredItems = productivityData.items;
          if (tierFilter !== 'all') {
            filteredItems = productivityData.items.filter(item => {
              const itemTier = tierAssignments.productive.includes(item.category) ? 'productive' :
                tierAssignments.distracting.includes(item.category) ? 'distracting' : 'neutral';
              return itemTier === tierFilter;
            });
          }
          
          // Calculate totals from filtered items
          const filteredProductiveSec = filteredItems.filter(i => tierAssignments.productive.includes(i.category)).reduce((s, i) => s + i.duration_sec, 0);
          const filteredNeutralSec = filteredItems.filter(i => tierAssignments.neutral.includes(i.category)).reduce((s, i) => s + i.duration_sec, 0);
          const filteredDistractingSec = filteredItems.filter(i => tierAssignments.distracting.includes(i.category)).reduce((s, i) => s + i.duration_sec, 0);
          const filteredTotalSec = filteredProductiveSec + filteredNeutralSec + filteredDistractingSec;
          const filteredAppCount = filteredItems.filter(i => i.type === 'app').length;
          const filteredWebCount = filteredItems.filter(i => i.type === 'website').length;
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 rounded-2xl p-4 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-sm text-zinc-400">Productive</span>
                </div>
                <div className="text-2xl font-semibold text-emerald-400">{formatHours(filteredProductiveSec)}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {filteredTotalSec > 0 
                    ? Math.round((filteredProductiveSec / filteredTotalSec) * 100)
                    : 0}% of time
                </div>
              </div>

              <div className="bg-zinc-900/50 rounded-2xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                  <span className="text-sm text-zinc-400">Neutral</span>
                </div>
                <div className="text-2xl font-semibold text-blue-400">{formatHours(filteredNeutralSec)}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {filteredTotalSec > 0 
                    ? Math.round((filteredNeutralSec / filteredTotalSec) * 100)
                    : 0}% of time
                </div>
              </div>

              <div className="bg-zinc-900/50 rounded-2xl p-4 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-sm text-zinc-400">Distracting</span>
                </div>
                <div className="text-2xl font-semibold text-red-400">{formatHours(filteredDistractingSec)}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {filteredTotalSec > 0 
                    ? Math.round((filteredDistractingSec / filteredTotalSec) * 100)
                    : 0}% of time
                </div>
              </div>

              <div className="bg-zinc-900/50 rounded-2xl p-4 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-400" />
                  <span className="text-sm text-zinc-400">Total Time</span>
                </div>
                <div className="text-2xl font-semibold text-purple-400">{formatDuration(filteredTotalSec)}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {filteredAppCount} apps + {filteredWebCount} sites
                </div>
              </div>
            </div>
          );
        })()}

        {/* Apps vs Websites Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="bg-zinc-900/50 rounded-2xl p-4 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-zinc-300">Applications</span>
              </div>
              <span className="text-lg font-bold text-indigo-400">{Math.round(productivityData.appVsWeb.app.score)}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400">Productive</span>
                <span className="text-zinc-400">{formatDuration(productivityData.appVsWeb.app.productiveSec)}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-emerald-400 h-2 rounded-full transition-all" style={{ width: `${productivityData.appVsWeb.app.totalSec > 0 ? (productivityData.appVsWeb.app.productiveSec / productivityData.appVsWeb.app.totalSec) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-400">Neutral</span>
                <span className="text-zinc-400">{formatDuration(productivityData.appVsWeb.app.neutralSec)}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: `${productivityData.appVsWeb.app.totalSec > 0 ? (productivityData.appVsWeb.app.neutralSec / productivityData.appVsWeb.app.totalSec) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-red-400">Distracting</span>
                <span className="text-zinc-400">{formatDuration(productivityData.appVsWeb.app.distractingSec)}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-red-400 h-2 rounded-full transition-all" style={{ width: `${productivityData.appVsWeb.app.totalSec > 0 ? (productivityData.appVsWeb.app.distractingSec / productivityData.appVsWeb.app.totalSec) * 100 : 0}%` }} />
              </div>
              <div className="pt-1 border-t border-zinc-800 flex justify-between text-xs">
                <span className="text-zinc-500">Total</span>
                <span className="text-zinc-300 font-medium">{formatDuration(productivityData.appVsWeb.app.totalSec)}</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-2xl p-4 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-zinc-300">Websites</span>
              </div>
              <span className="text-lg font-bold text-cyan-400">{Math.round(productivityData.appVsWeb.web.score)}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400">Productive</span>
                <span className="text-zinc-400">{formatDuration(productivityData.appVsWeb.web.productiveSec)}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-emerald-400 h-2 rounded-full transition-all" style={{ width: `${productivityData.appVsWeb.web.totalSec > 0 ? (productivityData.appVsWeb.web.productiveSec / productivityData.appVsWeb.web.totalSec) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-400">Neutral</span>
                <span className="text-zinc-400">{formatDuration(productivityData.appVsWeb.web.neutralSec)}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: `${productivityData.appVsWeb.web.totalSec > 0 ? (productivityData.appVsWeb.web.neutralSec / productivityData.appVsWeb.web.totalSec) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-red-400">Distracting</span>
                <span className="text-zinc-400">{formatDuration(productivityData.appVsWeb.web.distractingSec)}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-red-400 h-2 rounded-full transition-all" style={{ width: `${productivityData.appVsWeb.web.totalSec > 0 ? (productivityData.appVsWeb.web.distractingSec / productivityData.appVsWeb.web.totalSec) * 100 : 0}%` }} />
              </div>
              <div className="pt-1 border-t border-zinc-800 flex justify-between text-xs">
                <span className="text-zinc-500">Total</span>
                <span className="text-zinc-300 font-medium">{formatDuration(productivityData.appVsWeb.web.totalSec)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Trend */}
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Productivity Trend
            </h2>
          </div>
          <div className="h-64">
            <Line 
              data={trendChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#a1a1aa',
                    borderColor: '#3f3f46',
                    borderWidth: 1,
                    callbacks: {
                      label: (ctx) => ` Score: ${ctx.parsed.y}%`
                    }
                  }
                },
                scales: {
                  x: {
                    grid: { color: '#27272a' },
                    ticks: { color: '#71717a' }
                  },
                  y: {
                    min: 0,
                    max: 100,
                    grid: { color: '#27272a' },
                    ticks: { 
                      color: '#71717a',
                      callback: (v) => `${v}%`
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Time Distribution */}
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-emerald-400" />
              Time Distribution
            </h2>
          </div>
          <div className="h-80 flex items-center justify-center">
            <Pie 
              data={distributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#a1a1aa', padding: 20 }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    callbacks: {
                      label: (ctx) => {
                        const seconds = (ctx.raw as number) * 3600;
                        return ` ${formatDuration(seconds)}`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Horizontal Tier Filter - All buttons in one row */}
      <div className="glass rounded-3xl p-4">
        <div className="flex items-center gap-2">
          {/* Productive */}
          <button
            onClick={() => setTierFilter('productive')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tierFilter === 'productive'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Productive
          </button>
          
          {/* Neutral */}
          <button
            onClick={() => setTierFilter('neutral')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tierFilter === 'neutral'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            Neutral
          </button>
          
          {/* Distracting */}
          <button
            onClick={() => setTierFilter('distracting')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tierFilter === 'distracting'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-red-400" />
            Distracting
          </button>
          
          {/* Stats for current filter */}
          {(() => {
            let totalItems = productivityData.items;
            if (tierFilter !== 'all') {
              totalItems = productivityData.items.filter(item => {
                const itemTier = tierAssignments.productive.includes(item.category) ? 'productive' :
                  tierAssignments.distracting.includes(item.category) ? 'distracting' : 'neutral';
                return itemTier === tierFilter;
              });
            }
            const appCount = totalItems.filter(i => i.type === 'app').length;
            const webCount = totalItems.filter(i => i.type === 'website').length;
            return (
              <div className="ml-auto text-xs text-zinc-500">
                {tierFilter === 'all' 
                  ? `${appCount + webCount} items`
                  : `${totalItems.length} items in ${tierFilter}`
                }
              </div>
            );
          })()}
        </div>
      </div>

      {/* Apps vs Websites Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Apps Breakdown */}
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Monitor className="w-5 h-5 text-indigo-400" />
              Desktop Apps
            </h2>
            {(() => {
              let sourceArray = productivityData.topProductive;
              if (tierFilter === 'neutral') sourceArray = productivityData.topNeutral;
              else if (tierFilter === 'distracting') sourceArray = productivityData.topDistracting;
              else if (tierFilter === 'all') sourceArray = [...productivityData.topProductive, ...productivityData.topNeutral, ...productivityData.topDistracting];
              const apps = sourceArray.filter(i => i.type === 'app');
              const totalSec = apps.reduce((sum, i) => sum + i.duration_sec, 0);
              const filteredTotal = tierFilter === 'all' ? productivityData.totalSeconds : 
                (tierFilter === 'productive' ? productivityData.tiers.productive.seconds :
                 tierFilter === 'neutral' ? productivityData.tiers.neutral.seconds : 
                 productivityData.tiers.distracting.seconds);
              return (
                <div className="text-sm text-zinc-500">
                  {formatDuration(totalSec)} ({filteredTotal > 0 ? Math.round((totalSec / filteredTotal) * 100) : 0}% of {tierFilter === 'all' ? 'total' : tierFilter})
                </div>
              );
            })()}
          </div>
          
          <div className="space-y-3">
            {(() => {
              // Select correct array based on tierFilter
              let sourceArray = productivityData.topProductive;
              if (tierFilter === 'neutral') sourceArray = productivityData.topNeutral;
              else if (tierFilter === 'distracting') sourceArray = productivityData.topDistracting;
              else if (tierFilter === 'all') sourceArray = [...productivityData.topProductive, ...productivityData.topNeutral, ...productivityData.topDistracting];
              
              const apps = sourceArray.filter(i => i.type === 'app').slice(0, 5);
              
              return apps.length > 0 ? apps.map((item, idx) => {
                const itemTier = tierAssignments.productive.includes(item.category) ? 'productive' :
                  tierAssignments.distracting.includes(item.category) ? 'distracting' : 'neutral';
                const tierColor = itemTier === 'productive' ? '#22c55e' : itemTier === 'distracting' ? '#ef4444' : '#3b82f6';
                
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tierColor }} />
                      <span className="text-sm font-medium text-white">{item.name}</span>
                      <span className="text-xs text-zinc-500">({item.category})</span>
                    </div>
                    <div className="text-sm text-zinc-400">{formatDuration(item.duration_sec)}</div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-zinc-500">
                  <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No {tierFilter === 'all' ? '' : tierFilter} apps in this period</p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Websites Breakdown */}
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              {tierFilter === 'all' ? 'All Websites' : tierFilter === 'productive' ? 'Productive Websites' : tierFilter === 'neutral' ? 'Neutral Websites' : 'Distracting Websites'}
            </h2>
            <div className="text-sm text-zinc-500">
              {formatDuration(filteredWebsites.reduce((sum, d) => sum + d.totalSeconds, 0))} total
            </div>
          </div>
          
          <div className="space-y-2">
            {filteredWebsites.length > 0 ? (
              filteredWebsites.map((domainData) => {
                const isExpanded = expandedDomains.has(domainData.domain);
                const domainColor = getCategoryColor(domainData.dominantCategory);
                
                return (
                  <div key={domainData.domain} className="rounded-xl overflow-hidden">
                    {/* Domain Header Row */}
                    <button
                      onClick={() => toggleDomain(domainData.domain)}
                      className="w-full flex items-center justify-between p-3 bg-zinc-900/50 hover:bg-zinc-800/70 transition-all rounded-xl"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{domainData.domain}</div>
                          {domainData.hasKeywordRules && (
                            <span className="text-xs text-emerald-400">Smart website</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span 
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ backgroundColor: `${domainColor}20`, color: domainColor }}
                        >
                          {domainData.dominantCategory}
                        </span>
                        <span className="text-sm text-zinc-400">{formatDuration(domainData.totalSeconds)}</span>
                      </div>
                    </button>
                    
                    {/* Subpages (expanded) */}
                    {isExpanded && (
                      <div className="mt-1 ml-6 space-y-1 border-l-2 border-zinc-700/50 pl-4">
                        {domainData.logs.slice(0, 20).map((log: any, idx: number) => {
                          const logCategory = WEBSITE_CATEGORY_MAP[log.category] || log.category || 'Other';
                          const logColor = getCategoryColor(logCategory);
                          const logTitle = log.title || log.url || 'Unknown page';
                          // Truncate long titles
                          const displayTitle = logTitle.length > 60 ? logTitle.substring(0, 57) + '...' : logTitle;
                          
                          return (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-800/30 transition-all"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div 
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: logColor }}
                                />
                                <span className="text-xs text-zinc-300 truncate">{displayTitle}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span 
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: `${logColor}15`, color: logColor }}
                                >
                                  {logCategory}
                                </span>
                                <span className="text-xs text-zinc-500">{formatDuration(log.duration)}</span>
                              </div>
                            </div>
                          );
                        })}
                        {domainData.logs.length > 20 && (
                          <div className="text-xs text-zinc-500 text-center py-1">
                            +{domainData.logs.length - 20} more pages
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No productive website data</p>
                <p className="text-xs mt-1">Configure smart websites in Settings to track productivity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Stacked Bar Chart */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Daily Activity Breakdown
          </h2>
        </div>
        <div className="h-64">
          <Bar 
            data={timeBreakdownData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { color: '#a1a1aa', padding: 20 }
                },
                tooltip: {
                  backgroundColor: 'rgba(24, 24, 27, 0.95)',
                  callbacks: {
                    label: (ctx) => {
                      const label = ctx.dataset.label || '';
                      // Data is in hours, convert back to seconds for tooltip
                      return ` ${label}: ${formatDuration((ctx.raw as number) * 3600)}`;
                    }
                  }
                }
              },
              scales: {
                x: {
                  stacked: true,
                  grid: { display: false },
                  ticks: { color: '#71717a' }
                },
                y: {
                  stacked: true,
                  grid: { color: '#27272a' },
                  ticks: { 
                    color: '#71717a',
                    callback: (v: number) => formatHours(v * 3600) // convert back to seconds for formatting
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Top Distracting */}
      {productivityData.topDistracting.length > 0 && (
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              Areas to Improve
            </h2>
            <div className="text-sm text-zinc-500">
              Distracting activities that reduced your score
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productivityData.topDistracting.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    {item.type === 'app' ? (
                      <Monitor className="w-4 h-4 text-red-400" />
                    ) : (
                      <Globe className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-zinc-500">{item.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-red-400">{formatDuration(item.duration_sec)}</div>
                  <div className="text-xs text-zinc-500">
                    {productivityData.totalSeconds > 0 
                      ? Math.round((item.duration_sec / productivityData.totalSeconds) * 100)
                      : 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peak Productivity Hours */}
      {peakHours && (
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Peak Productivity Hours
            </h2>
            <span className="text-xs text-zinc-500">Average across period</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Most Productive Hour */}
            <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-zinc-400">Most Productive</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{peakHours.mostProductive.label}</div>
              <div className="text-sm text-zinc-400 mt-1">
                {peakHours.mostProductive.score}% score
                <span className="ml-2 text-emerald-400">
                  {peakHours.mostProductive.diff > 0 ? `+${peakHours.mostProductive.diff}%` : `${peakHours.mostProductive.diff}%`}
                </span>
              </div>
            </div>
            
            {/* Least Productive Hour */}
            <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-sm text-zinc-400">Least Productive</span>
              </div>
              <div className="text-2xl font-bold text-red-400">{peakHours.leastProductive.label}</div>
              <div className="text-sm text-zinc-400 mt-1">
                {peakHours.leastProductive.score}% score
                <span className="ml-2 text-red-400">
                  {peakHours.leastProductive.diff > 0 ? `+${peakHours.leastProductive.diff}%` : `${peakHours.leastProductive.diff}%`}
                </span>
              </div>
            </div>
          </div>
          
          {/* Hourly bar chart */}
          <div className="h-32">
            <Bar 
              data={{
                labels: peakHours.hourlyData.map(h => {
                  const suffix = h.hour >= 12 ? 'p' : 'a';
                  const hour12 = h.hour === 0 ? 12 : h.hour > 12 ? h.hour - 12 : h.hour;
                  return `${hour12}${suffix}`;
                }),
                datasets: [{
                  label: 'Productivity Score',
                  data: peakHours.hourlyData.map(h => h.score),
                  backgroundColor: peakHours.hourlyData.map(h => 
                    h.hour === peakHours.mostProductive.hour ? '#22c55e' :
                    h.hour === peakHours.leastProductive.hour ? '#ef4444' : 'rgba(34, 197, 94, 0.5)'
                  ),
                  borderRadius: 4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { display: true, grid: { display: false }, ticks: { color: '#71717a', font: { size: 10 } } },
                  y: { display: false, min: 0, max: 100 }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Insights Card */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-400" />
            Insights
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-zinc-900/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-zinc-400">Focus Time</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {formatDuration(productivityData.tiers.productive.seconds)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Time spent on productive activities
            </div>
          </div>

          <div className="p-4 bg-zinc-900/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-zinc-400">Weighted Score</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {Math.round(productivityData.score)}%
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Productive + 50% Neutral
            </div>
          </div>

          <div className="p-4 bg-zinc-900/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-zinc-400">App Time</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {formatDuration(productivityData.appVsWeb.app.totalSec)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {Math.round(productivityData.appVsWeb.app.score)}% productive
            </div>
          </div>

          <div className="p-4 bg-zinc-900/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-zinc-400">Website Time</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {formatDuration(productivityData.appVsWeb.web.totalSec)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {Math.round(productivityData.appVsWeb.web.score)}% productive
            </div>
          </div>

          <div className="p-4 bg-zinc-900/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-zinc-400">Total Tracked</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {formatDuration(productivityData.totalSeconds)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Apps + Websites
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Explanation */}
      <details className="glass rounded-3xl p-6">
        <summary className="cursor-pointer text-sm text-zinc-400 hover:text-white">
          How is productivity calculated?
        </summary>
        <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl text-sm text-zinc-300 space-y-2">
          <p><strong>Formula:</strong></p>
          <code className="block bg-zinc-800 p-2 rounded text-emerald-400">
            Score = (Productive + Neutral × 0.5) / Total × 100
          </code>
          <p className="mt-4"><strong>Tier Weights:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="text-emerald-400">Productive</span> = 100% credit (weight: 1.0)</li>
            <li><span className="text-blue-400">Neutral</span> = 50% credit (weight: 0.5)</li>
            <li><span className="text-red-400">Distracting</span> = 0% credit (weight: 0.0)</li>
          </ul>
          <p className="mt-4"><strong>Data Sources:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Desktop apps from activity tracking</li>
            <li>Websites from browser activity tracking</li>
            <li>Categories mapped using tier assignments from Settings</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
