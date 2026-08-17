// Scoring Schemes — Creator Length Maturity Model (RESULT.md Appendix B).
// 3 dynamic schemes: signal_builder (tier A) / audience_builder (tier B) / media_operator (tier C).
// Weights are criteria-as-data — the same table is injected into prompts and used for scoring.
import { NON_NEGOTIABLE_IDS, RETENTION_RUBRIC } from './rubric';

export interface ScoringScheme {
  id: 'signal_builder' | 'audience_builder' | 'media_operator';
  name: string;
  tier: 'A' | 'B' | 'C';
  description: string;
  weights: Record<string, number>;
  duration: string;
}

export const SCORING_SCHEMES: ScoringScheme[] = [
  {
    id: 'signal_builder',
    name: 'Signal Builder',
    tier: 'A',
    description:
      'Early channel (sub 1K). Every hook criterion matters most — one viral signal beats polish. Short videos (30-60s), hooks dominate, production secondary.',
    weights: {
      visual_hook: 0.09,
      verbal_hook: 0.09,
      context_lock: 0.08,
      curiosity_gap: 0.12,
      pattern_interrupt: 0.10,
      value_loop: 0.12,
      three_cs: 0.08,
      facial_expression: 0.05,
      pacing_pauses: 0.06,
      acoustic_ducking: 0.02,
      seamless_loop: 0.03,
      hook_at_3_4s: 0.07,
      value_speed: 0.05,
      specific_pain: 0.04,
    },
    duration: '30-60',
  },
  {
    id: 'audience_builder',
    name: 'Audience Builder',
    tier: 'B',
    description:
      'Growing channel (1K-100K). Value delivery and retention curves dominate — the algorithm rewards watch time. 60-120s, curiosity loops + value loops.',
    weights: {
      visual_hook: 0.10,
      verbal_hook: 0.10,
      context_lock: 0.08,
      curiosity_gap: 0.15,
      pattern_interrupt: 0.12,
      value_loop: 0.16,
      three_cs: 0.10,
      facial_expression: 0.01,
      pacing_pauses: 0.06,
      acoustic_ducking: 0.01,
      seamless_loop: 0.01,
      hook_at_3_4s: 0.04,
      value_speed: 0.03,
      specific_pain: 0.03,
    },
    duration: '60-120',
  },
  {
    id: 'media_operator',
    name: 'Media Operator',
    tier: 'C',
    description:
      'Established channel (100K+). Production craft and editing precision matter — expression, pacing, ducking, loops. 90-180s, full production values.',
    weights: {
      visual_hook: 0.08,
      verbal_hook: 0.07,
      context_lock: 0.06,
      curiosity_gap: 0.10,
      pattern_interrupt: 0.10,
      value_loop: 0.10,
      three_cs: 0.06,
      facial_expression: 0.10,
      pacing_pauses: 0.10,
      acoustic_ducking: 0.10,
      seamless_loop: 0.10,
      hook_at_3_4s: 0.05,
      value_speed: 0.05,
      specific_pain: 0.03,
    },
    duration: '90-180',
  },
];

export function getScheme(id?: string | null): ScoringScheme {
  return SCORING_SCHEMES.find((s) => s.id === id) || SCORING_SCHEMES[1];
}

// Estimate creator maturity from published video volume/views (heuristic anchor —
// the user can override via episode.scheme_id).
export function estimateSchemeForEpisode(stats: {
  videoCount?: number;
  avgViews?: number;
}): ScoringScheme {
  const avg = stats.avgViews ?? 0;
  const count = stats.videoCount ?? 0;
  if (count >= 20 && avg >= 50000) return SCORING_SCHEMES[2]; // media_operator
  if (count >= 5 && avg >= 1000) return SCORING_SCHEMES[1]; // audience_builder
  return SCORING_SCHEMES[0]; // signal_builder
}

// Weighted score for one frame. Returns auto-reject when ANY non-negotiable
// criterion present in the frame's criteria scores below threshold.
export interface FrameScoreResult {
  score: number;
  weighted: number;
  nonNegotiableFails: string[];
  rejected: boolean;
}

export function computeFrameScore(frame: any, scheme: ScoringScheme): FrameScoreResult {
  const thr = RETENTION_RUBRIC.threshold;
  const ret = frame?.retention || {};
  const criteria: string[] = Array.isArray(ret.criteria) ? ret.criteria : [];
  const weights = scheme.weights;

  const used = criteria;
  let total = 0;
  let weightSum = 0;
  const nonNegotiableFails: string[] = [];
  for (const cid of used) {
    const w = weights[cid] ?? 0;
    if (w <= 0) continue;
    weightSum += w;
    // per-criterion score: keep the frame's own score unless we can derive per-criterion
    // scores — the score field is a single number, so weight it by relative weight share.
    total += w * (ret.score ?? 0);
  }
  const score = weightSum > 0 ? Math.min(1, Math.max(0, total / weightSum)) : ret.score ?? 0;

  // Non-negotiable check: if a NN criterion is claimed and its evidence fails,
  // the frame is auto-rejected. Without per-criterion scores, treat score < threshold
  // as the NN failure signal when a NN criterion is claimed.
  const claimedNN = criteria.filter((c) => NON_NEGOTIABLE_IDS.includes(c));
  if (claimedNN.length && score < thr) {
    nonNegotiableFails.push(...claimedNN);
  }

  return {
    score: Math.round(score * 100) / 100,
    weighted: Math.round(score * 100) / 100,
    nonNegotiableFails,
    rejected: nonNegotiableFails.length > 0 || score < thr,
  };
}

// Human-readable weight table for prompt injection.
export function schemeWeightsForPrompt(scheme: ScoringScheme): string {
  return Object.entries(scheme.weights)
    .filter(([, w]) => w > 0)
    .map(([cid, w]) => `  ${cid} = ${w.toFixed(2)}`)
    .join('\n');
}

export function schemeSummary(scheme: ScoringScheme): string {
  return `${scheme.name} (tier ${scheme.tier}) — ${scheme.description} Duration: ${scheme.duration}s.`;
}