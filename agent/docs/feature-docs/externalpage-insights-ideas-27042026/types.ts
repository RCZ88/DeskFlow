/**
 * DeskFlow Shared Types
 * Electron + React + TypeScript
 */

export type ActivityType = 'stopwatch' | 'sleep' | 'checkin';
export type ChartType = 'none' | 'bar' | 'line' | 'calendar';
export type GoalStatus = 'on-track' | 'behind' | 'critical';

export interface Activity {
  id: string;
  name: string;
  color: string; // tailwind color name, e.g., 'emerald', 'amber', 'violet'
  type: ActivityType;
  icon?: string;
  chartPreference: ChartType;
}

export interface ActivitySession {
  id: string;
  activityId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
}

export interface ActivityStats {
  today: number; // seconds
  week: number; // seconds
  month: number; // seconds
}

export interface DailyActivityData {
  date: string; // ISO date
  duration: number; // seconds
}

export interface Goal {
  id: string;
  label: string;
  target: number; // hours
  current: number; // hours
  unit: string;
  streak: number;
  status: GoalStatus;
}

export interface ConsistencyData {
  day: string;
  score: number; // 0-100
}

export interface TypicalDayData {
  hour: number;
  activity: string;
  duration: number;
}

export interface HeatmapDay {
  date: string;
  value: number; // 0-4 scale for intensity
}
