export interface InsightAtom {
  id: string;
  kind: 'superlative' | 'record' | 'delta' | 'streak' | 'ratio' | 'anomaly' | 'milestone' | 'pattern';
  scope: { period: 'day' | 'week' | 'month' | 'year'; start: string; end: string };
  domain: 'apps' | 'browser' | 'productivity' | 'sleep' | 'git' | 'ai' | 'external' | 'focus';
  value: number | string;
  unit?: 'min' | 'hr' | 'count' | 'pct' | 'commits' | 'tokens' | 'usd' | 'days';
  comparison?: { baseline: number; deltaPct: number; direction: 'up' | 'down' | 'flat' };
  entities?: { label: string; value: number; color?: string }[];
  surprise: number;
  relevance: number;
  confidence: number;
  novelty: number;
  visual: 'bigNumber' | 'bar' | 'race' | 'sparkline' | 'radial24' | 'donut' | 'beeswarm' | 'calRing';
  copy?: { headline: string; subtext: string; source: 'template' | 'llm' };
  shareable: boolean;
}
