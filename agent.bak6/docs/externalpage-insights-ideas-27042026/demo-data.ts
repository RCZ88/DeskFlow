/**
 * DeskFlow Demo Data
 * Mock data for External and Insights page demonstrations
 */

import { Activity, ActivitySession, DailyActivityData, Goal, ConsistencyData, HeatmapDay } from './types';

export const DEFAULT_ACTIVITIES: Activity[] = [
  { id: 'studying', name: 'Studying', color: 'emerald', type: 'stopwatch', chartPreference: 'line' },
  { id: 'exercise', name: 'Exercise', color: 'amber', type: 'stopwatch', chartPreference: 'bar' },
  { id: 'gym', name: 'Gym', color: 'orange', type: 'stopwatch', chartPreference: 'bar' },
  { id: 'commute', name: 'Commute', color: 'blue', type: 'stopwatch', chartPreference: 'none' },
  { id: 'reading', name: 'Reading', color: 'violet', type: 'stopwatch', chartPreference: 'calendar' },
  { id: 'sleep', name: 'Sleep', color: 'indigo', type: 'sleep', chartPreference: 'line' },
  { id: 'eating', name: 'Eating', color: 'rose', type: 'checkin', chartPreference: 'none' },
  { id: 'short-break', name: 'Short Break', color: 'cyan', type: 'checkin', chartPreference: 'none' },
];

// Generate last 30 days of data for each activity
export function generateDailyData(activityId: string): DailyActivityData[] {
  const data: DailyActivityData[] = [];
  const baseMinutes: Record<string, number> = {
    studying: 180,
    exercise: 45,
    gym: 60,
    commute: 40,
    reading: 60,
    sleep: 480,
    eating: 90,
    'short-break': 30,
  };
  const base = baseMinutes[activityId] || 60;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * base * 0.6;
    const duration = Math.max(0, Math.round((base + variation) * 60)); // in seconds
    data.push({
      date: date.toISOString().split('T')[0],
      duration,
    });
  }
  return data;
}

export const ACTIVITY_DAILY_DATA: Record<string, DailyActivityData[]> = {
  studying: generateDailyData('studying'),
  exercise: generateDailyData('exercise'),
  gym: generateDailyData('gym'),
  commute: generateDailyData('commute'),
  reading: generateDailyData('reading'),
  sleep: generateDailyData('sleep'),
  eating: generateDailyData('eating'),
  'short-break': generateDailyData('short-break'),
};

export function getActivityStats(activityId: string) {
  const data = ACTIVITY_DAILY_DATA[activityId];
  const today = data[data.length - 1]?.duration || 0;
  const week = data.slice(-7).reduce((sum, d) => sum + d.duration, 0);
  const month = data.reduce((sum, d) => sum + d.duration, 0);
  return { today, week, month };
}

// Goals data
export const GOALS: Goal[] = [
  {
    id: 'daily-productive',
    label: 'Daily Productive Time',
    target: 8,
    current: 6.5,
    unit: 'h',
    streak: 5,
    status: 'on-track',
  },
  {
    id: 'weekly-productive',
    label: 'Weekly Productive Time',
    target: 40,
    current: 32,
    unit: 'h',
    streak: 2,
    status: 'behind',
  },
  {
    id: 'daily-sleep',
    label: 'Daily Sleep',
    target: 8,
    current: 6.2,
    unit: 'h',
    streak: 0,
    status: 'critical',
  },
  {
    id: 'daily-exercise',
    label: 'Daily Exercise',
    target: 1,
    current: 0.75,
    unit: 'h',
    streak: 12,
    status: 'on-track',
  },
];

// Consistency data (last 7 days)
export const CONSISTENCY_DATA: ConsistencyData[] = [
  { day: 'Mon', score: 85 },
  { day: 'Tue', score: 92 },
  { day: 'Wed', score: 78 },
  { day: 'Thu', score: 88 },
  { day: 'Fri', score: 95 },
  { day: 'Sat', score: 70 },
  { day: 'Sun', score: 82 },
];

// Calendar heatmap data (last 90 days)
export function generateHeatmapData(): HeatmapDay[] {
  const data: HeatmapDay[] = [];
  for (let i = 89; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 5), // 0-4
    });
  }
  return data;
}

export const HEATMAP_DATA = generateHeatmapData();

// Typical day data (hourly breakdown)
export const TYPICAL_DAY_DATA = [
  { hour: 0, activity: 'Sleep', duration: 60 },
  { hour: 1, activity: 'Sleep', duration: 60 },
  { hour: 2, activity: 'Sleep', duration: 60 },
  { hour: 3, activity: 'Sleep', duration: 60 },
  { hour: 4, activity: 'Sleep', duration: 60 },
  { hour: 5, activity: 'Sleep', duration: 60 },
  { hour: 6, activity: 'Sleep', duration: 30 },
  { hour: 6, activity: 'Commute', duration: 30 },
  { hour: 7, activity: 'Commute', duration: 40 },
  { hour: 8, activity: 'Studying', duration: 60 },
  { hour: 9, activity: 'Studying', duration: 60 },
  { hour: 10, activity: 'Studying', duration: 60 },
  { hour: 11, activity: 'Short Break', duration: 15 },
  { hour: 11, activity: 'Studying', duration: 45 },
  { hour: 12, activity: 'Eating', duration: 45 },
  { hour: 12, activity: 'Short Break', duration: 15 },
  { hour: 13, activity: 'Studying', duration: 60 },
  { hour: 14, activity: 'Studying', duration: 60 },
  { hour: 15, activity: 'Studying', duration: 60 },
  { hour: 16, activity: 'Exercise', duration: 45 },
  { hour: 16, activity: 'Short Break', duration: 15 },
  { hour: 17, activity: 'Studying', duration: 60 },
  { hour: 18, activity: 'Commute', duration: 40 },
  { hour: 19, activity: 'Eating', duration: 45 },
  { hour: 20, activity: 'Reading', duration: 60 },
  { hour: 21, activity: 'Reading', duration: 60 },
  { hour: 22, activity: 'Short Break', duration: 30 },
  { hour: 23, activity: 'Sleep', duration: 60 },
];
