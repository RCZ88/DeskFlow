import { useEffect, useState } from 'react';
import { Chart } from 'chart.js';
import { applyChartTheme } from './chartTheme';

export type ThemePref = 'light' | 'dark' | 'system';

const THEME_KEY = 'df-theme';
export const THEME_EVENT = 'df-theme-changed';

function safeLocalGet(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* ignore */ }
  return 'system';
}

function safeLocalSet(v: ThemePref): void {
  try {
    localStorage.setItem(THEME_KEY, v);
  } catch { /* ignore */ }
}

export function readThemePref(): ThemePref {
  return safeLocalGet();
}

export function writeThemePref(p: ThemePref): void {
  safeLocalSet(p);
}

export function resolveTheme(p: ThemePref): 'light' | 'dark' {
  if (p === 'light' || p === 'dark') return p;
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch { /* ignore */ }
  return 'dark';
}

export function isLightNow(): boolean {
  try {
    return document.documentElement.classList.contains('light');
  } catch { /* ignore */ }
  return false;
}

export function applyTheme(p: ThemePref): boolean {
  const resolved = resolveTheme(p);
  const light = resolved === 'light';
  try {
    document.documentElement.classList.toggle('light', light);
  } catch { /* ignore */ }
  try {
    applyChartTheme(Chart, light);
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { pref: p, resolved, light } }));
  } catch { /* ignore */ }
  return light;
}

let media: MediaQueryList | null = null;
let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

export function syncSystemTheme(p: ThemePref): void {
  try {
    if (media && mediaHandler) {
      media.removeEventListener('change', mediaHandler);
      mediaHandler = null;
    }
    if (p !== 'system') return;
    if (!media) media = window.matchMedia('(prefers-color-scheme: light)');
    mediaHandler = () => applyTheme('system');
    media.addEventListener('change', mediaHandler);
  } catch { /* ignore */ }
}

export function setTheme(p: ThemePref): void {
  writeThemePref(p);
  syncSystemTheme(p);
  applyTheme(p);
}

export function useIsLight(): boolean {
  const [light, setLight] = useState<boolean>(isLightNow());
  useEffect(() => {
    const h = () => setLight(isLightNow());
    window.addEventListener(THEME_EVENT, h);
    return () => window.removeEventListener(THEME_EVENT, h);
  }, []);
  return light;
}

const _initialPref = readThemePref();
applyTheme(_initialPref);
syncSystemTheme(_initialPref);