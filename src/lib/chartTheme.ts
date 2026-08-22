import type { Chart } from 'chart.js';

export type ChartPalette = {
  tick: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipTitle: string;
  tooltipBody: string;
};

export const chartTheme: Record<'dark' | 'light', ChartPalette> = {
  dark: {
    tick: '#71717a',
    grid: 'rgba(255,255,255,0.04)',
    tooltipBg: 'rgba(24,24,27,0.92)',
    tooltipBorder: 'rgba(255,255,255,0.08)',
    tooltipTitle: '#a1a1aa',
    tooltipBody: '#fafafa',
  },
  light: {
    tick: '#52525b',
    grid: 'rgba(0,0,0,0.06)',
    tooltipBg: 'rgba(255,255,255,0.95)',
    tooltipBorder: 'rgba(0,0,0,0.08)',
    tooltipTitle: '#52525b',
    tooltipBody: '#18181b',
  },
};

export function applyChartTheme(chartClass: typeof Chart, isLight: boolean): void {
  const p = isLight ? chartTheme.light : chartTheme.dark;
  chartClass.defaults.color = p.tick;
  chartClass.defaults.borderColor = p.grid;
  chartClass.defaults.font.family = 'Inter, system-ui, sans-serif';
  const tooltip = (chartClass.defaults as any).plugins?.tooltip;
  if (tooltip) {
    tooltip.backgroundColor = p.tooltipBg;
    tooltip.borderColor = p.tooltipBorder;
    tooltip.titleColor = p.tooltipTitle;
    tooltip.bodyColor = p.tooltipBody;
  }
}